import math
import json
from array import array
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from actual_audition import (build, measure, source_rest, source_time, tempo_at,
                             unexpected_silences, warped_clip)
from reaper_proof import save_plan, checksum


class AuditionTests(unittest.TestCase):
    def test_overlap_tempos_match_and_ramp_stays_in_solo(self):
        # Previous track exits and following track enters at the same 129 BPM.
        a, _, _ = warped_clip(12, 256, 128, 0, 256, 127, 129)
        b, _, _ = warped_clip(35, 256, 130, 0, 256, 129, 131)
        tail = a['length']-a['stretch_markers'][-9]['position']
        head = b['stretch_markers'][8]['position']
        self.assertAlmostEqual(tail, head, places=10)
        for beat in [0, 16, 32]:
            self.assertEqual(tempo_at(beat, 256, 129, 131, 32), 129)
        self.assertEqual(tempo_at(224, 256, 129, 131, 32), 131)

    def test_nonzero_source_offset_and_interior_cut_have_continuous_warp(self):
        first, _, _ = warped_clip(20, 96, 128, 0, 256, 127, 130)
        second, _, _ = warped_clip(110, 160, 128, 96, 256, 127, 130)
        self.assertEqual(first['stretch_markers'][0]['source'], 20)
        self.assertAlmostEqual(first['stretch_markers'][-1]['source'], 65)
        self.assertEqual(second['stretch_markers'][0]['source'], 110)
        self.assertEqual(first['rate'], 1)
        self.assertEqual(second['stretch_markers'][0]['position'], 0)
        self.assertGreater(first['length']+second['length'], 115)

    def test_large_stretch_and_malformed_ranges_fail(self):
        for args in [(0, 128, 130, 0, 256, 174, 174),
                     (0, 127, 130, 0, 256, 130, 130),
                     (-1, 128, 130, 0, 256, 130, 130),
                     (0, 128, math.nan, 0, 256, 130, 130),
                     (0, 64, 130, 0, 64, 130, 130)]:
            with self.subTest(args=args), self.assertRaises(ValueError):
                warped_clip(*args)

    def test_actual_manifest_does_not_inherit_synthetic_label_or_tempo(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root/'source.wav'
            source.write_bytes(b'fixture')
            track = {'path': str(source), 'sha256': checksum(source)}
            plan = save_plan(root, 'audition', [track], 60, [],
                purpose='Private audition', bpm=136, master_db=-5,
                tempo_map=[{'time': 30, 'bpm': 138}])
            self.assertEqual(plan['purpose'], 'Private audition')
            self.assertEqual(plan['bpm'], 136)
            self.assertEqual(plan['master_db'], -5)
            self.assertEqual(plan['tempo_map'][0]['bpm'], 138)

    def test_ffmpeg_progress_after_json_does_not_break_measurement(self):
        probe = {'format': {'duration': '10'}, 'streams': [
            {'codec_name': 'pcm_s24le', 'sample_rate': '48000', 'channels': 2}]}
        output = 'loudnorm output:\n{"input_i":"-15.4","input_tp":"-3.1","input_lra":"4"}\nprogress: finished'
        with patch('actual_audition.subprocess.check_output', return_value=json.dumps(probe)), \
             patch('actual_audition.subprocess.run', return_value=SimpleNamespace(stderr=output)):
            self.assertEqual(measure(Path('fixture.wav'))['true_peak_dbfs'], -3.1)

    def test_silent_master_cannot_hide_as_edge_silence(self):
        self.assertEqual(unexpected_silences([[0, 10]], 10), [[0, 10]])
        self.assertEqual(unexpected_silences([[0, .3], [9.7, 10]], 10), [])
        self.assertEqual(unexpected_silences([[3, 3.3]], 10), [[3, 3.3]])

    def test_source_time_interpolation_matches_native_pulse_calibration(self):
        item = {'position': 10, 'stretch_markers': [
            {'position': 0, 'source': 2}, {'position': 3, 'source': 4},
            {'position': 4, 'source': 6}]}
        self.assertEqual(source_time(item, 10.75), 2.5)
        self.assertEqual(source_time(item, 13.25), 4.5)

    def test_only_existing_short_source_rests_can_pass_gap_check(self):
        item = {'position': 0, 'length': 10, 'stretch_markers': [
            {'position': 0, 'source': 20}, {'position': 10, 'source': 30}]}
        plan = {'tracks': [{'clips': [item], 'path': 'fixture.wav', 'sha256': 'fixture',
                            'name': 'fixture'}]}
        with patch('actual_audition.subprocess.check_output',
                   return_value=array('f', [.001]*100).tobytes()):
            self.assertIsNotNone(source_rest(plan, [4, 4.5]))
            self.assertIsNone(source_rest(plan, [4, 5]))
            self.assertIsNone(source_rest(plan, [0, .3]))
            self.assertIsNone(source_rest({'tracks': []}, [4, 4.5]))
        with patch('actual_audition.subprocess.check_output',
                   return_value=array('f', [.5]*100).tobytes()):
            self.assertIsNone(source_rest(plan, [4, 4.5]))

    def test_dnb_reset_gets_tempo_marker_at_audio_entry(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root/'source.wav'
            source.write_bytes(b'fixture')
            tracks, decisions = [], []
            for index, bpm in enumerate([138, 174]):
                ident = str(index)
                tracks.append({'id': ident, 'path': str(source), 'sha256': checksum(source),
                    'bpm': bpm, 'grid_anchor_seconds': 0, 'duration_seconds': 100,
                    'grid': {'heuristic_confidence': 1, 'usable_constant_grid': True},
                    'loudness': {'integrated_lufs': -8}, 'artist': ident, 'title': 'fixture'})
                decisions.append({'id': ident, 'source_sha256': checksum(source),
                    'grid_bpm': bpm, 'grid_anchor_seconds': 0, 'retain_phrases': [[0, 4]],
                    'reset_before': index == 1, 'reason': 'test'})
            analysis, edits = root/'analysis.json', root/'edits.json'
            analysis.write_text(json.dumps({'tracks': tracks}))
            edits.write_text(json.dumps({'tracks': decisions}))
            report = build(root, analysis, edits)
            plan = json.loads((root/'hollow-audition-01-plan.json').read_text())
            entry = report['tracks'][1]['start_seconds']
            point = next(p for p in plan['tempo_map'] if abs(p['time']-entry) < .000001)
            self.assertEqual(point['bpm'], 174)


if __name__ == '__main__':
    unittest.main()
