"""Musical timing, loop safety and source-mapped attenuation regression cases."""

import copy
import itertools
import math
import unittest
from pathlib import Path
from unittest.mock import patch

from arrangement import boundary_cost, infer_phrases, loop_tail, phrase_position
from mix_automation import automate,duck_regions, mapped_vocals, three_band_eq, volume_points
from native_build import build_only, verify_readback
from plan_mix import candidates, choose_grid, compile_timeline, transition
from test_plan_mix import fixture


def bars_fixture(count=80):
    return [
        {
            "index": i,
            "start": 0.2 + i * 2,
            "end": 2.2 + i * 2,
            "rms_dbfs": -12,
            "spectrum": [1, 0, 0],
            "density": 0.1,
            "pulse": [1, 0, 0, 0],
            "harmonic_fraction": 0.1,
        }
        for i in range(count)
    ]


class ArrangementTests(unittest.TestCase):
    def test_phrase_phase_follows_measured_changes_not_first_downbeat(self):
        bars = bars_fixture()
        for b in bars:
            b["rms_dbfs"] = -8 if ((b["index"] - 3) // 16) % 2 else -16
        phrase = infer_phrases(bars)
        self.assertTrue(phrase["supported"])
        self.assertEqual(phrase["phase_bars"], 3)
        t, e = fixture()
        t["arrangement"] = {"phrases": phrase}
        g = choose_grid(t, e)
        self.assertEqual(phrase_position(t, g, 6.2)["phase_bars"], 0)
        self.assertLess(boundary_cost(t, g, 6.2), boundary_cost(t, g, 0.2))

    def test_uniform_texture_and_unstable_bars_do_not_invent_phrases(self):
        self.assertFalse(infer_phrases(bars_fixture())["supported"])
        bars = bars_fixture()
        for b in bars:
            b["rms_dbfs"] += (b["index"] // 8) % 2 * 8
        self.assertFalse(infer_phrases(bars, stable=False)["supported"])

    def test_candidate_entry_exit_prefer_inferred_phrase_phase(self):
        t, e = fixture()
        t["arrangement"]["phrases"]["phase_bars"] = 3
        c = candidates(t, e)[0]
        self.assertEqual(c["entry_phrase"]["phase_bars"], 0)
        self.assertEqual(c["exit_phrase"]["phase_bars"], 0)

    def test_long_blend_aligns_phrases_and_missing_phase_prevents_it(self):
        a, ea = fixture("a")
        b, eb = fixture("b")
        ca, cb = candidates(a, ea)[0], candidates(b, eb)[0]
        join = transition(ca, cb, {"a": a, "b": b}, {"a": ea, "b": eb})
        self.assertEqual(join["bars"], 8)
        b.pop("arrangement")
        join = transition(ca, cb, {"a": a, "b": b}, {"a": ea, "b": eb})
        self.assertLessEqual(join["bars"], 4)

    def test_loop_requires_quiet_percussive_stable_tail_and_known_vocals(self):
        t, e = fixture()
        t["arrangement"]["bars"] = bars_fixture()
        c = candidates(t, e)[0]
        self.assertIsNotNone(loop_tail(t, e, c))
        for change in ("unknown", "voice", "tonal", "build", "rhythm"):
            a, ev = copy.deepcopy(t), copy.deepcopy(e)
            if change == "unknown":
                ev.pop("vocals")
            elif change == "voice":
                ev["vocals"]["candidate_vocal_regions"] = [[c["end"] - 1, c["end"]]]
            else:
                tail = next(
                    b
                    for b in a["arrangement"]["bars"]
                    if abs(b["end"] - c["end"]) < 1e-5
                )
                if change == "tonal":
                    tail["harmonic_fraction"] = 0.8
                elif change == "build":
                    tail["rms_dbfs"] += 4
                else:
                    tail["pulse"] = [0, 1, 0, 0]
            with self.subTest(change=change):
                self.assertIsNone(loop_tail(a, ev, c))

    def test_bridge_selected_to_avoid_vocals_and_native_loop_seams_keep_grid(self):
        a, ea = fixture("a")
        b, eb = fixture("b")
        a["arrangement"]["bars"] = bars_fixture()
        ca, cb = candidates(a, ea)[0], candidates(b, eb)[0]
        ea["vocals"]["candidate_vocal_regions"] = [[ca["end"] - 16, ca["end"] - 4.1]]
        eb["vocals"]["candidate_vocal_regions"] = [[cb["start"], cb["start"] + 32]]
        join = transition(ca, cb, {"a": a, "b": b}, {"a": ea, "b": eb})
        self.assertEqual(join["kind"], "loop_bridge")
        for t in (a, b):
            t.update(path="fixture.wav", sha256=t["id"])
        native, details, _, tempos, _ = compile_timeline(
            [ca, cb], [join], [a, b], {"a": -3, "b": -2}, {"a": ea, "b": eb}
        )
        loops = [c for c in native[0]["clips"] if c.get("loop_iteration")]
        self.assertEqual(len(loops), 2)
        cycle = 4.0
        self.assertAlmostEqual(loops[1]["position"] - loops[0]["position"], cycle)
        for c in loops:
            self.assertAlmostEqual(c["length"], cycle + 0.005)
            self.assertAlmostEqual(c["stretch_markers"][1]["position"], 0.005)
            self.assertAlmostEqual(c["stretch_markers"][0]["source"], c["source_start"])
        bridge = details[0]["loop_bridge"]
        self.assertAlmostEqual(bridge["end_seconds"] - bridge["start_seconds"], 8)
        self.assertAlmostEqual(details[1]["start_seconds"], bridge["start_seconds"])
        self.assertTrue(all(p["bpm"] == 120 for p in tempos))


class AutomationTests(unittest.TestCase):
    def test_dj_blend_keeps_faders_up_at_a_constant_power_bass_exchange(self):
        join={'kind':'harmonic_blend','overlap_seconds':20,'harmonic_cost':0,'vocal_overlap':0,'mix_style':'dj_blend'}
        definitions=[{'clips':[]},{'clips':[]}]
        details=[{'id':'a','start_seconds':0,'end_seconds':100},{'id':'b','start_seconds':80,'end_seconds':180}]
        automate(definitions,details,[join],{})
        for d in definitions:
            at=lambda t:next(p['amplitude'] for p in d['volume'] if abs(p['time']-t)<1e-6)
            self.assertEqual(at(90),1)
        curves=[]
        for d in definitions:
            curves.append({round(p['time'],8):p['db'] for p in d['eq_bands'][0]['points'] if 89.96-1e-6<=p['time']<=90.04+1e-6})
        self.assertEqual(set(curves[0]),set(curves[1]))
        for t in curves[0]:
            power=sum(10**(curve[t]/10) for curve in curves)
            self.assertAlmostEqual(power,1,delta=.0041)

    def test_vocal_mapping_respects_cuts_warp_and_loop_repeats(self):
        definition = {
            "clips": [
                {
                    "source_start": 10,
                    "position": 100,
                    "length": 4,
                    "rate": 1,
                    "stretch_markers": [
                        {"position": 0, "source": 10},
                        {"position": 4, "source": 18},
                    ],
                },
                {"source_start": 10, "position": 104, "length": 4, "rate": 2},
            ]
        }
        regions = mapped_vocals(
            definition, {"candidate_vocal_regions": [[0, 5], [12, 14], [19, 25]]}
        )
        self.assertEqual(regions, [[101, 102], [105, 106]])
        self.assertIsNone(mapped_vocals(definition, None))

    def test_duck_only_simultaneous_voices_with_consistent_incoming_priority(self):
        self.assertEqual(duck_regions([[2, 4]], [[4, 6]], 0, 8), [])
        self.assertEqual(duck_regions([[2, 5]], [[3, 6]], 0, 8), [[3, 5]])
        self.assertEqual(duck_regions(None, [[3, 6]], 0, 8), [])

    def test_duck_depth_smooth_release_and_no_gain_boost(self):
        points = volume_points(0, 20, 1, 2, [[5, 6], [5.5, 6.5]])
        at = lambda t: next(p["amplitude"] for p in points if abs(p["time"] - t) < 1e-6)
        self.assertAlmostEqual(at(5), 10 ** (-4.5 / 20))
        self.assertEqual(at(6.83), 1)
        self.assertEqual(at(20), 0)
        self.assertTrue(all(0 <= p["amplitude"] <= 1 for p in points))
        self.assertTrue(
            all(a["time"] < b["time"] for a, b in itertools.pairwise(points))
        )

    def test_three_band_eq_never_boosts_and_returns_flat_outside_overlap(self):
        j = {
            "kind": "short_bass_swap",
            "overlap_seconds": 8,
            "harmonic_cost": 1,
            "vocal_overlap": 0.3,
        }
        bands = three_band_eq(30, 130, j, j)
        self.assertEqual([b["band_type"] for b in bands], [1, 2, 4])
        self.assertEqual([b["frequency_hz"] for b in bands], [180, 1200, 6000])
        for band in bands:
            self.assertTrue(all(p["db"] <= 0 for p in band["points"]))
            if band["name"] != "low":
                self.assertEqual(
                    next(p["db"] for p in band["points"] if p["time"] == 36), 0
                )
            self.assertTrue(
                all(
                    a["time"] < b["time"] for a, b in itertools.pairwise(band["points"])
                )
            )
        reset = three_band_eq(0, 40, None, {"kind": "reset"})
        self.assertTrue(all(p["db"] == 0 for b in reset for p in b["points"]))

    def test_native_verifier_rejects_gain_override_wrong_file_and_nonfinite_values(
        self,
    ):
        clip = {
            "source_start": 2,
            "position": 0,
            "length": 8,
            "rate": 1,
            "fade_in": 0.1,
            "fade_out": 0.1,
        }
        plan = {
            "run_id": "fixture",
            "manifest_sha256": "bound",
            "tracks": [
                {
                    "path": "source.wav",
                    "gain_db": -6,
                    "clips": [clip],
                    "volume": [{"time": 0, "amplitude": 0.5}],
                }
            ],
        }
        actual = {
            "run_id": "fixture",
            "manifest_sha256": "bound",
            "tracks": [
                {
                    "clips": [{**clip, "path": "source.wav", "preserve_pitch": 1}],
                    "volume": {
                        "active": True,
                        "automation_mode": 1,
                        "points": [{"time": 0, "amplitude": 0.5 * 10 ** (-6 / 20)}],
                    },
                }
            ],
        }
        self.assertTrue(verify_readback(plan, actual)["passed"])
        for mode in ("gain", "file", "nan", "phase", "inactive", "override"):
            bad = copy.deepcopy(actual)
            t = bad["tracks"][0]
            if mode == "gain":
                t["volume"]["points"][0]["amplitude"] = 0.5
            elif mode == "file":
                t["clips"][0]["path"] = "wrong.wav"
            elif mode == "nan":
                t["clips"][0]["position"] = math.nan
            elif mode == "inactive":
                t["volume"]["active"] = False
            elif mode == "override":
                bad["global_automation_override"] = 0
            else:
                t["clips"][0]["source_start"] += 0.5
            with self.subTest(mode=mode), self.assertRaises(ValueError):
                verify_readback(plan, bad)

    def test_native_driver_checks_current_approval_before_launch(self):
        def rejected():
            raise ValueError("Later Cut invalidates the plan")

        with patch("native_build.subprocess.Popen") as launch:
            with self.assertRaisesRegex(ValueError, "Later Cut"):
                build_only(
                    {}, Path("."), Path("reaper"), Path("profile"), validator=rejected
                )
            launch.assert_not_called()


if __name__ == "__main__":
    unittest.main()
