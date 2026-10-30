"""Known acoustic delays, phone start/clock errors and room coloration, not live tests."""
import json
from pathlib import Path
import tempfile
import unittest
import subprocess
import wave
import numpy as np
import calibrate as c


def phone_recording(delays=(.012, .014, .127, .129), scale=1.00016, offset=2.37,
                    missing=None, strong_echo=False):
    source = c.stimulus()
    audio = np.zeros(len(source)+c.FS)
    for channel, delay in enumerate(delays):
        if channel == missing:
            continue
        impulse = np.zeros(round(.08*c.FS))
        impulse[0] = .7 if channel < 2 else 1
        impulse[round(.018*c.FS)] = 1.3 if strong_echo else .22
        impulse[round(.046*c.FS)] = .11
        heard = c.convolution(source[:, channel], impulse)
        start = round(delay*c.FS)
        audio[start:start+len(heard)] += heard
    # A shared uncalibrated phone microphone coloration.
    audio = c.convolution(audio, np.array([1, -.7]))
    audio = np.interp(np.arange(round(len(audio)*scale))/scale, np.arange(len(audio)), audio)
    audio = np.r_[np.zeros(round(offset*c.FS)), audio]
    audio += np.random.default_rng(98).normal(scale=.00002, size=len(audio))
    return audio


class PhoneCalibrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.recording = phone_recording()
        cls.result = c.analyze(cls.recording)

    def test_known_115ms_offset_with_start_and_clock_error(self):
        self.assertAlmostEqual(self.result['hisense_later_than_audioengine_ms'], 115, delta=2)
        self.assertEqual(self.result['add_delay_ms'], {'audioengine': 115, 'hisense': 0})
        self.assertAlmostEqual(self.result['recording_clock_ppm'], 160, delta=10)

    def test_unknown_recording_gain_withholds_level_and_eq(self):
        self.assertEqual(self.result['bus_gain_db'], {'audioengine': 0, 'hisense': 0})
        self.assertFalse(self.result['eq_automatic_allowed'])

    def test_confirmed_fixed_gain_attenuates_louder_system(self):
        result = c.analyze(self.recording, fixed_gain=True)
        self.assertEqual(result['bus_gain_db']['audioengine'], 0)
        self.assertTrue(-4.5 < result['bus_gain_db']['hisense'] < -1.5)
        self.assertTrue(result['eq_automatic_allowed'])

    def test_changed_timeline_is_rejected(self):
        shortened = np.r_[self.recording[:35*c.FS], self.recording[35*c.FS+800:]]
        with self.assertRaisesRegex(ValueError, 'Timing references'):
            c.analyze(shortened)

    def test_real_aac_container_decode(self):
        with tempfile.TemporaryDirectory() as directory:
            wav, aac = Path(directory)/'phone.wav', Path(directory)/'phone.m4a'
            with wave.open(str(wav),'wb') as output:
                output.setnchannels(1); output.setsampwidth(2); output.setframerate(c.FS)
                output.writeframes(np.round(self.recording*32767).astype('<i2').tobytes())
            subprocess.run(['ffmpeg','-v','error','-i',str(wav),'-ar','48000',
                '-c:a','aac','-b:a','128k',str(aac)],check=True)
            decoded, selected = c.decode(aac)
            self.assertEqual(selected,0)
            result = c.analyze(decoded)
            self.assertAlmostEqual(result['hisense_later_than_audioengine_ms'],115,delta=2)

    def test_reverse_offset_delays_hisense(self):
        result = c.analyze(phone_recording(delays=(.120, .122, .020, .022), scale=.9999))
        self.assertEqual(result['add_delay_ms'], {'audioengine': 0, 'hisense': 100})

    def test_reflection_stronger_than_direct_arrival(self):
        result = c.analyze(phone_recording(strong_echo=True))
        self.assertAlmostEqual(result['hisense_later_than_audioengine_ms'], 115, delta=2)

    def test_missing_output_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'hisense_right'):
            c.analyze(phone_recording(missing=3))

    def test_truncated_recording_is_rejected(self):
        with self.assertRaises(ValueError):
            c.analyze(self.recording[:60*c.FS])

    def test_clipping_disables_automatic_eq(self):
        overloaded = self.recording.copy()
        overloaded[31*c.FS:32*c.FS] = 1
        result = c.analyze(overloaded, fixed_gain=True)
        self.assertFalse(result['eq_automatic_allowed'])

    def test_broad_relative_excess_produces_cut_only_candidate(self):
        frequencies = 125*2**(np.arange(31)/6)
        response = 8*np.exp(-.5*(np.log2(frequencies/250)/.3)**2)
        filters = c.eq_candidates(frequencies, response, np.zeros_like(response))
        self.assertEqual(len(filters), 1)
        self.assertAlmostEqual(filters[0]['frequency_hz'], 250, delta=35)
        self.assertEqual(filters[0]['gain_db'], -3)
        self.assertFalse(c.eq_candidates(frequencies, np.zeros_like(response), response))

    def test_stimulus_48k_matches_analysis_template(self):
        for channel in range(4):
            self.assertGreater(np.corrcoef(c.marker(channel, 48000)[::3], c.marker(channel))[0,1], .99999)

    def test_output_preset_defaults_to_timing_only(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'result'
            c.write_results(path, self.result)
            text = (path/'preset.tsv').read_text()
            self.assertIn('audioengine.delay_ms\t115', text)
            self.assertIn('audioengine.eq_count\t0', text)
            self.assertTrue(json.loads((path/'analysis.json').read_text())['delay_ready'])


if __name__ == '__main__':
    unittest.main()
