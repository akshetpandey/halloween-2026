import importlib.util
import unittest

from actual_audition import source_time
from repair_transition_geometry import loop_clips


class LoopSlipTests(unittest.TestCase):
    def test_cyclic_slip_preserves_duration_cursor_and_source_bounds(self):
        part={'offset':.02};source_bpm=150;target_bpm=155
        rate=target_bpm/source_bpm;cycle=16*60/source_bpm
        for advance in [-.035,-.009,0,.009,.035]:
            clips=loop_clips(part,source_bpm,target_bpm,[10],advance)
            # Five millisecond pre-handles crossfade, without extending the end.
            self.assertAlmostEqual(max(c['position']+c['length'] for c in clips),10+cycle/rate)
            for c in clips:
                self.assertGreaterEqual(c['source_start'],0)
                self.assertLessEqual(c['stretch_markers'][-1]['source'],cycle+.04)
            for seconds in [.1,1,3,5]:
                at=10+seconds;c=next(c for c in clips if c['position']<=at<c['position']+c['length'])
                expected=.02+(seconds*rate+advance)%cycle
                self.assertAlmostEqual(source_time(c,at),expected,places=6)

    @unittest.skipUnless(importlib.util.find_spec('numpy') and importlib.util.find_spec('scipy'),'audio environment')
    def test_large_slip_wraps_instead_of_reading_past_four_bar_source(self):
        for advance in [-.04,.04]:
            clips=loop_clips({'offset':.02},160,155,[10,10+16*60/155],advance)
            self.assertEqual(len(clips),4)
            self.assertAlmostEqual(max(c['position']+c['length'] for c in clips),10+32*60/155)
