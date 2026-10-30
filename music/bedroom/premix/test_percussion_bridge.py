import unittest
from percussion_bridge import clock,loops


class BridgeTests(unittest.TestCase):
    def test_tempo_ramp_has_real_quarter_beats_and_stable_ends(self):
        result=clock(160,135)
        self.assertEqual(result['bars'],16)
        self.assertEqual(len(result['beat_times']),65)
        self.assertTrue(all(abs(b-a-60/160)<1e-9 for a,b in zip(result['beat_times'][:8],result['beat_times'][1:9])))
        self.assertTrue(all(abs(b-a-60/135)<1e-9 for a,b in zip(result['beat_times'][-9:-1],result['beat_times'][-8:])))
        clips=loops({'offset':.02},135,result['beat_times'],16,10)
        self.assertEqual(len(clips),4)
        for a,b in zip(clips,clips[1:]):self.assertAlmostEqual(a['position']+a['length'],b['position'])
        self.assertAlmostEqual(clips[-1]['position']+clips[-1]['length'],10+result['duration_seconds'])

    def test_wide_unprepared_jump_is_rejected(self):
        with self.assertRaises(ValueError):clock(175,125)
