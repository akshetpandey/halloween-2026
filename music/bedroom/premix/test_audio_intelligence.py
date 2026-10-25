"""Check that model disagreements and missing vocal evidence stay visible."""

import importlib.util
import unittest

from audio_intelligence import (
    active_regions,
    annotate_edits,
    beat_evidence,
    join_evidence,
    valid_times,
    vocal_evidence,
)

AVAILABLE = importlib.util.find_spec("numpy") is not None


@unittest.skipUnless(AVAILABLE, "numpy analysis environment required")
class IntelligenceTests(unittest.TestCase):
    def track(self):
        return {
            "id": "fixture",
            "duration_seconds": 64.0,
            "bpm": 120.0,
            "grid_anchor_seconds": 0.0,
        }

    def test_one_beat_downbeat_disagreement_is_exposed(self):
        import numpy as np

        evidence = beat_evidence(
            np.arange(0, 64, 0.5), np.arange(0.5, 64, 2), self.track()
        )
        self.assertAlmostEqual(evidence["baseline_beat_agreement_70ms"], 1)
        self.assertEqual(evidence["dominant_downbeat_class"], 1)
        self.assertTrue(any("1 beat(s)" in flag for flag in evidence["review_flags"]))
        self.assertFalse(evidence["human_verified"])

    def test_half_time_predictions_are_not_silently_promoted(self):
        import numpy as np

        evidence = beat_evidence(np.arange(0, 64, 1), np.arange(0, 64, 4), self.track())
        self.assertAlmostEqual(evidence["median_eight_beat_bpm"], 60)
        self.assertAlmostEqual(evidence["interval_fraction_near_half_time"], 1)
        self.assertTrue(any("half/double" in flag for flag in evidence["review_flags"]))

    def test_quantized_events_do_not_bias_123_bpm_to_125(self):
        import numpy as np

        track = self.track()
        track["bpm"] = 123.0
        beats = np.round(np.arange(0, 64, 60 / 123) / 0.02) * 0.02
        evidence = beat_evidence(beats, beats[::4], track)
        self.assertAlmostEqual(evidence["median_eight_beat_bpm"], 123.0, delta=0.3)

    def test_changing_bar_phase_is_a_review_flag(self):
        import numpy as np

        downs = list(np.arange(0, 32, 2)) + list(np.arange(32.5, 64, 2))
        evidence = beat_evidence(np.arange(0, 64, 0.5), downs, self.track())
        self.assertTrue(
            any("phase changes" in flag for flag in evidence["review_flags"])
        )

    def test_invalid_or_unrelated_times_are_rejected(self):
        import numpy as np

        for times in ([0, 0], [2, 1], [-1, 2], [0, float("nan")], [0, 65]):
            with self.assertRaises(ValueError):
                valid_times(times, 64)
        with self.assertRaises(ValueError):
            beat_evidence(np.arange(0, 64, 0.5), np.arange(0.2, 64, 2), self.track())

    def test_vocal_candidate_timing_and_silence(self):
        import numpy as np

        sr = 100
        mixture = np.full((400, 2), 0.1, dtype="float32")
        vocals = np.zeros_like(mixture)
        vocals[100:200] = 0.05
        result = vocal_evidence(mixture, vocals, sr)
        self.assertEqual(result["candidate_vocal_regions"], [[1.0, 2.0]])
        self.assertAlmostEqual(result["candidate_vocal_fraction"], 0.25)
        quiet = vocal_evidence(np.zeros_like(mixture), np.zeros_like(mixture), sr)
        self.assertEqual(quiet["candidate_vocal_regions"], [])
        with self.assertRaises(ValueError):
            vocal_evidence(mixture, vocals[:-1], sr)

    def test_small_separation_leak_is_not_called_a_vocal(self):
        import numpy as np

        mixture = np.full((400, 2), 0.2, dtype="float32")
        result = vocal_evidence(mixture, mixture * 0.02, 100)
        self.assertEqual(result["candidate_vocal_regions"], [])

    def test_short_blips_filtered_but_small_gaps_bridged(self):
        frames = [
            {
                "start_seconds": i * 0.25,
                "end_seconds": (i + 1) * 0.25,
                "candidate_vocal": v,
            }
            for i, v in enumerate([True, False, False, True, True, False, True, True])
        ]
        self.assertEqual(active_regions(frames), [[0.75, 2.0]])

    def test_cut_review_keeps_unknown_vocals_unknown(self):
        evidence = {"rhythm": {"downbeats_seconds": [0.0, 2.0, 4.0, 6.0, 8.0, 10.0]}}
        edit = {"retained_source_ranges": [[0.0, 4.0], [8.0, 12.0]]}
        reviewed = annotate_edits(self.track(), evidence, edit)
        self.assertIsNone(reviewed["entry"]["candidate_vocal_fraction_near_boundary"])
        self.assertEqual(
            reviewed["interior_cuts"][0]["outgoing"]["source_seconds"], 4.0
        )
        self.assertEqual(
            reviewed["interior_cuts"][0]["incoming"]["source_seconds"], 8.0
        )
        self.assertEqual(
            reviewed["interior_cuts"][0]["incoming"]["distance_to_model_downbeat_ms"],
            0.0,
        )

    def test_join_uses_simultaneous_source_times_and_does_not_invent_missing_data(self):
        previous = {
            "id": "a",
            "retained_source_ranges": [[0, 20]],
            "outgoing_bpm": 120,
            "measured_bpm": 120,
        }
        incoming = {
            "id": "b",
            "retained_source_ranges": [[5, 25]],
            "incoming_bpm": 120,
            "measured_bpm": 120,
            "overlap_seconds": 10,
        }
        missing = join_evidence(previous, incoming, {})
        self.assertIsNone(missing["simultaneous_vocal_candidate_fraction"])
        # Each track has vocals in half the overlap, but they alternate.
        evidence = {
            "a": {"vocals": {"candidate_vocal_regions": [[10, 15]]}},
            "b": {"vocals": {"candidate_vocal_regions": [[10, 15]]}},
        }
        alternated = join_evidence(previous, incoming, evidence)
        self.assertEqual(alternated["simultaneous_vocal_candidate_fraction"], 0)
        self.assertFalse(alternated["review_flags"])
        evidence["b"]["vocals"]["candidate_vocal_regions"] = [[5, 15]]
        together = join_evidence(previous, incoming, evidence)
        self.assertGreater(together["simultaneous_vocal_candidate_fraction"], 0.4)
        self.assertTrue(together["review_flags"])
        incoming["reset_before"] = True
        self.assertIsNone(
            join_evidence(previous, incoming, evidence)[
                "simultaneous_vocal_candidate_fraction"
            ]
        )


if __name__ == "__main__":
    unittest.main()
