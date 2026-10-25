"""Planning decisions, acquisition/vote guards and no-render integration checks."""

import importlib.util
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from analyze_audio import analyze_track, digest
from plan_mix import (
    build_plan,
    candidates,
    choose_grid,
    compile_timeline,
    cut_repeats,
    gain_for,
    harmonic_cost,
    local_key,
    retained_loudness,
    sequence,
    transition,
    validate_current,
)

AVAILABLE = all(importlib.util.find_spec(name) for name in ("numpy", "soundfile"))


def fixture(ident="a", bpm=120, duration=160):
    period = 60 / bpm
    width = 32 * period
    phrases = []
    for index in range(int(duration / width)):
        phrases.append(
            {
                "index": index,
                "start_seconds": 0.2 + index * width,
                "end_seconds": min(duration, 0.2 + (index + 1) * width),
                "rms_dbfs": -10 if index == 2 else -12,
                "onset_strength": 1.0,
                "repeat_candidate": index in (4, 5),
                "partial": False,
            }
        )
    track = {
        "id": ident,
        "bpm": bpm,
        "grid_anchor_seconds": 0.2,
        "duration_seconds": duration,
        "artist": ident,
        "title": "Procedural fixture " + ident,
        "lane": "Tech house",
        "grid": {"usable_constant_grid": True},
        "phrases": phrases,
    }
    beats = [0.2 + i * period for i in range(int((duration - 0.2) / period))]
    evidence = {
        "id": ident,
        "source_sha256": "fixture",
        "rhythm": {"beats_seconds": beats, "downbeats_seconds": beats[::4]},
        "tonal": {
            "eight_bar_windows": [
                {
                    "start_seconds": 0.0,
                    "end_seconds": duration,
                    "key": "C",
                    "scale": "minor",
                    "profile_strength": 0.8,
                }
            ]
        },
        "vocals": {"candidate_vocal_regions": []},
    }
    return track, evidence


@unittest.skipUnless(AVAILABLE, "optional analysis environment required")
class PlannerTests(unittest.TestCase):
    def test_coherent_model_corrects_phase_without_quantized_tempo_override(self):
        t, e = fixture()
        t["grid_anchor_seconds"] = 0.7
        g = choose_grid(t, e)
        self.assertAlmostEqual(g["anchor_seconds"], 0.2)
        self.assertEqual(g["bpm"], 120)
        self.assertTrue(g["splice_supported"])

    def test_half_time_events_keep_dnb_source_tempo(self):
        t, e = fixture(bpm=174)
        e["rhythm"]["beats_seconds"] = e["rhythm"]["beats_seconds"][::2]
        g = choose_grid(t, e)
        self.assertEqual(g["bpm"], 174)
        self.assertTrue(g["splice_supported"])

    def test_unstable_bars_and_missing_vocals_do_not_authorize_splices(self):
        t, e = fixture()
        d = e["rhythm"]["downbeats_seconds"]
        e["rhythm"]["downbeats_seconds"] = [
            v + (0 if i % 2 else 0.5) for i, v in enumerate(d)
        ]
        g = choose_grid(t, e)
        self.assertFalse(g["splice_supported"])
        self.assertEqual(cut_repeats(t, e, g, 0.2, 158.2)[1], [])
        t, e = fixture()
        e.pop("vocals")
        g = choose_grid(t, e)
        self.assertEqual(cut_repeats(t, e, g, 0.2, 158.2)[1], [])

    def test_repeat_removal_coalesces_adjacent_ranges_and_preserves_peak(self):
        t, e = fixture()
        g = choose_grid(t, e)
        ranges, removed = cut_repeats(t, e, g, 0.2, 158.2)
        self.assertEqual(len(removed), 2)
        self.assertEqual(len(ranges), 2)
        self.assertTrue(all(a < b for a, b in ranges))
        self.assertTrue(any(a <= 40 <= b for a, b in ranges))

    def test_vocal_hooks_and_build_to_drop_are_protected(self):
        t, e = fixture()
        e["vocals"]["candidate_vocal_regions"] = [[60, 100]]
        self.assertFalse(cut_repeats(t, e, choose_grid(t, e), 0.2, 158.2)[1])
        t, e = fixture()
        t["phrases"][5]["rms_dbfs"] = -5
        removed = cut_repeats(t, e, choose_grid(t, e), 0.2, 158.2)[1]
        self.assertFalse(removed)

    def test_late_peak_can_be_reached_without_exceeding_body_duration(self):
        t, e = fixture(duration=420)
        t["phrases"][-2]["rms_dbfs"] = -3
        options = candidates(t, e)
        self.assertTrue(options)
        self.assertTrue(
            all(c["body_seconds"] <= 210 and c["start"] > 45 for c in options)
        )

    def test_local_key_ignores_unrelated_or_weak_windows(self):
        _, e = fixture()
        self.assertIsNone(local_key(e, 170, 180))
        self.assertEqual(local_key(e, 20, 40), [0, "minor"])
        e["tonal"]["eight_bar_windows"][0]["profile_strength"] = 0.2
        self.assertIsNone(local_key(e, 20, 40))
        self.assertLess(harmonic_cost([0, "major"], [9, "minor"]), 0.2)
        self.assertEqual(harmonic_cost([0, "minor"], [6, "major"]), 1)

    def test_vocal_window_change_reduces_transition_cost(self):
        a, ea = fixture("a")
        b, eb = fixture("b")
        ea["vocals"]["candidate_vocal_regions"] = [[80, 100]]
        eb["vocals"]["candidate_vocal_regions"] = [[0, 20]]
        ca = {
            "id": "a",
            "start": 0.2,
            "end": 100.2,
            "ranges": [[0.2, 100.2]],
            "grid": choose_grid(a, ea),
        }
        cb = {
            "id": "b",
            "start": 0.2,
            "end": 136.2,
            "ranges": [[0.2, 136.2]],
            "grid": choose_grid(b, eb),
        }
        bad = transition(ca, cb, {"a": a, "b": b}, {"a": ea, "b": eb})
        ca["end"] = 130.2
        ca["ranges"] = [[0.2, 130.2]]
        good = transition(ca, cb, {"a": a, "b": b}, {"a": ea, "b": eb})
        self.assertGreater(bad["vocal_overlap"], 0.8)
        self.assertEqual(good["vocal_overlap"], 0)
        self.assertLess(good["cost"], bad["cost"])

    def test_unknown_vocals_prevent_long_blend_and_dnb_uses_reset(self):
        a, ea = fixture("a")
        b, eb = fixture("b")
        eb.pop("vocals")
        ca = candidates(a, ea)[0]
        cb = candidates(b, eb)[0]
        j = transition(ca, cb, {"a": a, "b": b}, {"a": ea, "b": eb})
        self.assertLessEqual(j["bars"], 4)
        self.assertIsNone(j["vocal_overlap"])
        b["lane"] = "Drum & bass"
        b["bpm"] = 174
        self.assertEqual(
            transition(ca, cb, {"a": a, "b": b}, {"a": ea, "b": eb})["kind"], "reset"
        )

    def test_retained_gain_is_peak_limited_and_invalid_values_rejected(self):
        self.assertEqual(gain_for({"integrated_lufs": -20, "true_peak_dbfs": -1}), -2)
        self.assertEqual(gain_for({"integrated_lufs": -20, "true_peak_dbfs": -12}), 3)
        for value in [float("nan"), float("inf"), 40]:
            with self.assertRaises(ValueError):
                gain_for({"integrated_lufs": -10, "true_peak_dbfs": value})

    def test_compiled_overlap_tempos_and_source_offsets_match(self):
        a, ea = fixture("a", bpm=125)
        b, eb = fixture("b", bpm=126)
        for t in [a, b]:
            t.update(path="fixture.wav", sha256=t["id"])
        ordered, joins = sequence([a, b], {"a": ea, "b": eb})
        native, details, _, _, end = compile_timeline(
            ordered, joins, [a, b], {"a": -3, "b": -3}
        )
        self.assertAlmostEqual(details[0]["outgoing_bpm"], details[1]["incoming_bpm"])
        self.assertAlmostEqual(
            details[0]["end_seconds"] - details[1]["start_seconds"],
            joins[0]["overlap_seconds"],
        )
        self.assertAlmostEqual(end, details[-1]["end_seconds"])
        for t, d in zip(native, details):
            self.assertGreaterEqual(d["rate_range"][0], 0.97)
            self.assertLessEqual(d["rate_range"][1], 1.03)
            for clip in t["clips"]:
                self.assertEqual(
                    clip["stretch_markers"][0]["source"], clip["source_start"]
                )
                self.assertLessEqual(
                    max(clip["fade_in"], clip["fade_out"]), clip["length"]
                )


@unittest.skipUnless(AVAILABLE, "optional analysis environment required")
class PlannerIntegrationTests(unittest.TestCase):
    def setUp(self):
        import numpy as np
        import soundfile as sf

        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.db = self.root / "library.sqlite3"
        db = sqlite3.connect(self.db)
        db.executescript(
            "CREATE TABLE tracks(id TEXT,data TEXT);CREATE TABLE feedback(id TEXT,vote TEXT,updated TEXT);"
        )
        tracks = []
        evidence = []
        bindings = {}
        for ident, freq in [("a", 220), ("b", 330)]:
            t, e = fixture(ident)
            path = self.root / (ident + ".wav")
            sr = 8000
            x = np.arange(160 * sr) / sr
            y = 0.1 * np.sin(2 * np.pi * freq * x)
            sf.write(path, np.column_stack([y, y]), sr, subtype="PCM_16")
            sha = digest(path)
            t.update(
                path=str(path), sha256=sha, source_path=str(path), source_sha256=sha
            )
            e["source_sha256"] = sha
            tracks.append(t)
            evidence.append(e)
            uri = "spotify:track:" + ident * 22
            metadata = {
                "id": ident,
                "room": "bedroom",
                "spotify_uri": uri,
                "isrc": ident * 12,
                "artist": ident,
                "title": t["title"],
                "duration_ms": 160000,
                "lane": "Tech house",
            }
            db.execute("INSERT INTO tracks VALUES(?,?)", (ident, json.dumps(metadata)))
            db.execute("INSERT INTO feedback VALUES(?,?,?)", (ident, "up", "fixture"))
            bindings[uri] = {
                "path": str(path),
                "sha256": sha,
                "source": "Original procedural fixture",
                "version_verified": True,
            }
        db.commit()
        db.close()
        self.analysis = self.root / "analysis.json"
        self.model = self.root / "model.json"
        self.file_map = self.root / "files.json"
        self.analysis.write_text(json.dumps({"tracks": tracks}))
        self.model.write_text(json.dumps({"tracks": evidence}))
        self.file_map.write_text(json.dumps(bindings))

    def build(self, production=True):
        return build_plan(
            self.db,
            self.analysis,
            self.model,
            self.root / "plan",
            self.file_map if production else None,
            not production,
        )

    def test_verified_production_dry_run_and_validation_never_launch_reaper(self):
        with patch(
            "reaper_proof.run_reaper", side_effect=AssertionError("No rendering")
        ) as launch:
            report = self.build()
            verified = validate_current(report, self.db)
        launch.assert_not_called()
        self.assertTrue(verified["current_inputs_valid"])
        self.assertFalse(report["rendered"])
        self.assertFalse(report["party_ready"])
        self.assertEqual(len(report["tracks"]), 2)
        self.assertFalse(list((self.root / "plan").rglob("*.rpp")))
        self.assertFalse(list((self.root / "plan").rglob("*.mp3")))
        self.assertTrue(Path(report["native_plan"]).exists())

    def test_unverified_production_and_audition_render_validation_fail(self):
        report = build_plan(self.db, self.analysis, self.model, self.root / "blocked")
        self.assertFalse(report["tracks"])
        self.assertEqual(len(report["blocked"]), 2)
        with self.assertRaises(ValueError):
            validate_current(self.build(False), self.db)

    def test_missing_vocals_remain_unknown_without_breaking_native_serialization(self):
        model = json.loads(self.model.read_text())
        for t in model["tracks"]:
            t.pop("vocals")
        self.model.write_text(json.dumps(model))
        report = self.build()
        self.assertTrue(Path(report["native_plan"]).exists())
        self.assertIsNone(report["tracks"][0]["boundary_vocal_candidates"]["entry"])
        self.assertTrue(validate_current(report, self.db)["current_inputs_valid"])

    def test_cut_after_plan_invalidates_current_approval(self):
        report = self.build()
        db = sqlite3.connect(self.db)
        db.execute("UPDATE feedback SET vote='down' WHERE id='a'")
        db.commit()
        db.close()
        with self.assertRaises(ValueError):
            validate_current(report, self.db)

    def test_stale_file_evidence_and_native_edits_fail(self):
        report = self.build()
        p = Path(report["native_plan"])
        native = json.loads(p.read_text())
        native["master_db"] = 0
        p.write_text(json.dumps(native))
        with self.assertRaises(ValueError):
            validate_current(report, self.db)
        model = json.loads(self.model.read_text())
        model["tracks"][0]["source_sha256"] = "wrong"
        self.model.write_text(json.dumps(model))
        with self.assertRaises(ValueError):
            self.build()

    def test_source_replacement_is_rejected_before_planning(self):
        (self.root / "a.wav").write_bytes(b"changed source")
        with self.assertRaises(ValueError):
            self.build()

    def test_source_duration_metadata_cannot_extend_beyond_the_file(self):
        analysis = json.loads(self.analysis.read_text())
        analysis["tracks"][0]["duration_seconds"] = 240
        self.analysis.write_text(json.dumps(analysis))
        with self.assertRaises(ValueError):
            self.build(False)

    def test_new_cut_during_measurements_blocks_native_output(self):
        original = retained_loudness

        def changed(*args):
            result = original(*args)
            db = sqlite3.connect(self.db)
            db.execute("UPDATE feedback SET vote='down' WHERE id='a'")
            db.commit()
            db.close()
            return result

        with (
            patch("plan_mix.retained_loudness", side_effect=changed),
            self.assertRaises(ValueError),
        ):
            self.build()
        self.assertFalse((self.root / "plan/native").exists())

    def test_measurement_uses_only_retained_audio(self):
        import numpy as np
        import soundfile as sf

        path = self.root / "levels.wav"
        sr = 8000
        x = np.arange(8 * sr) / sr
        tone = np.sin(2 * np.pi * 440 * x)
        y = np.concatenate([tone * 0.01, tone * 0.1])
        sf.write(path, np.column_stack([y, y]), sr)
        track = {"path": str(path), "sha256": digest(path)}
        quiet = retained_loudness(track, [[0, 8]], self.root / "cache")
        loud = retained_loudness(track, [[8, 16]], self.root / "cache")
        self.assertAlmostEqual(
            loud["integrated_lufs"] - quiet["integrated_lufs"], 20, delta=0.3
        )

    def test_generic_analysis_decodes_without_overwriting_acquisition(self):
        t = json.loads(self.analysis.read_text())["tracks"][0]
        source = Path(t["path"])
        before = digest(source)
        metadata = {
            "id": "production-a",
            "artist": "a",
            "title": "Fixture",
            "duration_ms": 160000,
            "catalog_analysis": {
                "features": {"tempo": {"value": 120, "source": "known procedural grid"}}
            },
        }
        with patch(
            "analyze_audio.analyze_signal",
            return_value={"bpm": 120, "grid": {}, "phrases": []},
        ):
            measured = analyze_track(
                metadata, self.root / "generic", False, source=source
            )
        self.assertEqual(digest(source), before)
        self.assertFalse(measured["audition_only"])
        self.assertNotEqual(Path(measured["path"]), source)
        self.assertEqual(measured["source_sha256"], before)


if __name__ == "__main__":
    unittest.main()
