from array import array
import json
import math
from pathlib import Path
import tempfile
import unittest
import wave

from reaper_proof import build_lock, check_saved_project, clip, exact_repeats, lua, run_reaper
from verify_reaper_proof import _correlation, _tone_frequency


class ReaperProofTests(unittest.TestCase):
    def test_exact_phrase_detection_uses_samples(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'fixture.wav'
            phrase = bytes([0, 0, 1, 0]) * 16
            other = bytes([1, 0, 2, 0]) * 16
            with wave.open(str(path), 'wb') as output:
                output.setnchannels(2)
                output.setsampwidth(2)
                output.setframerate(8)
                output.writeframes(phrase + phrase + other)
            self.assertEqual(exact_repeats(path, 120, phrase_bars=1),
                             [{'first_start': 0, 'start': 2, 'end': 4}])

    def test_tempo_rate_and_output_duration(self):
        result = clip(0, 6, 30, 128/132)
        self.assertAlmostEqual(result['length'], 6.1875)
        self.assertEqual(result['position'], 30)

    def test_invalid_ranges_rates_fades_are_rejected(self):
        for args in [(1, 0, 0), (0, 1, -1), (0, 1, 0, 2),
                     (0, 1, 0, math.nan), (0, 1, 0, 1, -1), (0, 1, 0, 1, 2)]:
            with self.subTest(args=args), self.assertRaises(ValueError):
                clip(*args)

    def test_lua_string_cannot_close_its_literal(self):
        value = '\nquotes " and ]], ]=] and unicode →'
        encoded = lua(value)
        self.assertIn('[==[x', encoded)
        self.assertTrue(encoded.endswith(']==],2)'))

    def test_nonfinite_plan_data_is_rejected(self):
        for value in [math.nan, math.inf, -math.inf, None]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                lua(value)

    def test_source_change_blocks_reaper_launch(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            binary = root / 'reaper'
            binary.write_text('not an executable; must not be launched')
            profile = root / 'reaper.ini'
            profile.write_text('coreaudioindevnew=<none>\ncoreaudiooutdevnew=<none>\n')
            source = root / 'source.wav'
            source.write_bytes(b'changed')
            plan = {'tracks': [{'path': str(source), 'sha256': 'wrong'}]}
            (root / 'reaper-proof-plan.json').write_text(json.dumps(plan))
            with self.assertRaisesRegex(ValueError, 'Source hash changed'):
                run_reaper(root, binary, profile)

    def test_hardware_audio_profile_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            binary = root / 'reaper'
            binary.touch()
            profile = root / 'reaper.ini'
            profile.write_text('coreaudiooutdevnew=Speakers\n')
            with self.assertRaisesRegex(ValueError, 'no hardware audio device'):
                run_reaper(root, binary, profile)

    def test_stale_or_missing_saved_project_cannot_render(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'proof.rpp'
            plan = {'project': str(path), 'manifest_sha256': 'current-fingerprint'}
            with self.assertRaises(RuntimeError):
                check_saved_project(plan)
            path.write_text('old-fingerprint')
            with self.assertRaises(RuntimeError):
                check_saved_project(plan)
            path.write_text('MANIFEST_SHA256 current-fingerprint')
            check_saved_project(plan)

    def test_concurrent_cli_builds_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with build_lock(root):
                with self.assertRaisesRegex(RuntimeError, 'Another proof build'):
                    with build_lock(root):
                        self.fail('Second builder entered the same output directory')
            with build_lock(root):
                pass

    def test_pitch_detector_distinguishes_unpreserved_tempo_change(self):
        for frequency in (440, 440*128/132):
            signal = array('h')
            for frame in range(48000):
                value = round(10000*math.sin(2*math.pi*frequency*frame/48000))
                signal.extend([value, value])
            self.assertAlmostEqual(_tone_frequency(signal), frequency, places=3)

    def test_correlation_is_level_independent_but_rejects_different_content(self):
        original = [2, 5, 1, -3, -2, 9]
        self.assertAlmostEqual(_correlation(original, [x*2 for x in original]), 1)
        self.assertLess(_correlation(original, list(reversed(original))), .9)


if __name__ == '__main__':
    unittest.main()
