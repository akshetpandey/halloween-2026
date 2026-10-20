"""Focused measurement tests; run in the optional analysis environment."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


AVAILABLE = all(importlib.util.find_spec(name) for name in ('numpy', 'scipy', 'librosa', 'soundfile'))


@unittest.skipUnless(AVAILABLE, 'optional analysis environment is not installed')
class AnalysisTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location('analyze_audio', Path(__file__).with_name('analyze_audio.py'))
        cls.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.module)

    def test_grid_refines_prior_and_labels_downbeat_provisional(self):
        import numpy as np
        sr, hop, duration, actual = 22050, 256, 120, 128.0
        times = np.arange(int(duration * sr / hop)) * hop / sr
        phase = .173
        onset = np.zeros_like(times)
        for beat in np.arange(phase, duration, 60 / actual):
            # A missing eight-second passage must not shift the grid afterward.
            if not 48 < beat < 56:
                onset += np.exp(-.5 * ((times - beat) / .012) ** 2)
        result = self.module.fit_grid(onset, 128.2, duration)
        self.assertAlmostEqual(result['bpm'], actual, delta=.15)
        self.assertGreater(abs(result['bpm'] - 128.2), .1)
        self.assertLess(result['grid']['beat_residual_p95_ms'], 30)
        self.assertFalse(result['grid']['downbeat_verified'])
        self.assertFalse(result['grid']['phrase_verified'])

    def test_dnb_prior_does_not_collapse_to_half_time(self):
        import numpy as np
        sr, hop, duration, actual = 22050, 256, 75, 174.0
        times = np.arange(int(duration * sr / hop)) * hop / sr
        onset = np.zeros_like(times)
        for index, beat in enumerate(np.arange(.08, duration, 60 / actual)):
            onset += (1 if index % 2 else .6) * np.exp(-.5 * ((times - beat) / .012) ** 2)
        result = self.module.fit_grid(onset, 174, duration)
        self.assertAlmostEqual(result['bpm'], actual, delta=.2)

    def test_pulse_harmonics_beat_nearby_stronger_vocal_fundamental(self):
        import numpy as np
        sr, hop, duration, actual = 22050, 256, 150, 126.0
        times = np.arange(int(duration * sr / hop)) * hop / sr
        onset = 1 + .5 * np.sin(2 * np.pi * 125.4 / 60 * times)
        for beat in np.arange(.12, duration, 60 / actual):
            onset += np.exp(-.5 * ((times - beat) / .012) ** 2)
        result = self.module.fit_grid(onset, 126, duration)
        self.assertAlmostEqual(result['bpm'], actual, delta=.15)
        self.assertTrue(result['grid']['usable_constant_grid'])

    def test_drifting_halves_are_not_blessed_as_constant_grid(self):
        import numpy as np
        sr, hop, duration = 22050, 256, 150
        times = np.arange(int(duration * sr / hop)) * hop / sr
        onset = np.zeros_like(times)
        for start, end, bpm in [(0, 75, 126), (75, 150, 127.5)]:
            for beat in np.arange(start + .12, end, 60 / bpm):
                onset += np.exp(-.5 * ((times - beat) / .012) ** 2)
        result = self.module.fit_grid(onset, 126.5, duration)
        self.assertFalse(result['grid']['usable_constant_grid'])
        self.assertTrue(result['grid']['rejection_reasons'])

    def test_phrase_features_distinguish_repeated_audio_and_quiet_section(self):
        import numpy as np
        import librosa
        sr, bpm = 22050, 128
        width = 8 * 4 * 60 / bpm
        t = np.arange(round(width * sr)) / sr
        phrase = (.2 * np.sin(2 * np.pi * 55 * t) + .07 * np.sin(2 * np.pi * 440 * t)).astype('float32')
        y = np.concatenate((phrase, phrase, phrase * .01))
        power = np.abs(librosa.stft(y, n_fft=2048, hop_length=256)) ** 2
        onset = np.ones(power.shape[1], dtype='float32')
        measured = self.module.phrase_metrics(y, power, onset, bpm, 0, sr)
        self.assertTrue(measured[1]['repeat_candidate'])
        self.assertGreater(measured[1]['texture_similarity_previous'], .985)
        self.assertFalse(measured[2]['repeat_candidate'])
        self.assertAlmostEqual(measured[0]['rms_dbfs'] - measured[2]['rms_dbfs'], 40, delta=.2)
        self.assertLess(measured[0]['lowband_dbfs'], 0)
        self.assertEqual(len(measured[0]['chroma']), 12)
        # Phrase boundaries originate in numpy arrays; persisted values must be
        # native JSON types, including the final partial-phrase boolean.
        self.assertTrue(json.dumps(measured, allow_nan=False))

    def test_catalog_prior_stays_explicit_and_missing_prior_refused(self):
        measured = self.module.catalog_prior({'id': 'hollow-01-008'})
        self.assertEqual(measured['value'], 174)
        self.assertIn('engineering prior', measured['kind'])
        with self.assertRaises(ValueError):
            self.module.catalog_prior({'id': 'unknown'})

    def test_invalid_report_does_not_truncate_previous_complete_report(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'analysis.json'
            self.module.write_json(path, {'complete': True})
            with self.assertRaises(ValueError):
                self.module.write_json(path, {'invalid': float('nan')})
            self.assertEqual(json.loads(path.read_text()), {'complete': True})
            self.assertEqual(list(Path(directory).iterdir()), [path])


if __name__ == '__main__':
    unittest.main()
