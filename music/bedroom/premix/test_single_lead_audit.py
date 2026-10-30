import importlib.util
import unittest

from actual_audition import source_time
from audit_single_lead import check_window,crop_clip,expected_attacks,mapped_attacks


class AuditTests(unittest.TestCase):
    @unittest.skipUnless(importlib.util.find_spec('numpy') and importlib.util.find_spec('scipy'),'audio environment')
    def test_shared_attack_delay_is_not_a_mismatch_but_separate_deck_delay_is(self):
        import numpy as np
        sr=12000;t=np.arange(32*sr)/sr
        def deck(delay):
            y=np.zeros_like(t)
            for at in np.arange(delay,32,.4):
                x=t-at;mask=(x>=0)&(x<.06);y[mask]+=.4*np.sin(2*np.pi*500*x[mask])*np.exp(-x[mask]/.01)
            return y
        same=deck(.028)
        self.assertEqual(check_window(np.column_stack([same,same]),sr,150,16,31.9)['status'],'checked')
        self.assertEqual(check_window(np.column_stack([deck(0),same]),sr,150,16,31.9)['status'],'failed')
        both_jump=deck(0);late=deck(.028);both_jump[t>=16]=late[t>=16]
        self.assertEqual(check_window(np.column_stack([both_jump,both_jump]),sr,150,16,31.9)['status'],'failed')

    @unittest.skipUnless(importlib.util.find_spec('numpy') and importlib.util.find_spec('scipy'),'audio environment')
    def test_variable_tempo_diagnostic_uses_realized_nonuniform_beats(self):
        import numpy as np
        from percussion_bridge import clock
        grid=np.array(clock(160,135)['beat_times']);sr=12000;t=np.arange(round(grid[-1]*sr))/sr
        def audio(shift):
            y=np.zeros_like(t)
            for at in grid[:-1]+shift:
                x=t-at;mask=(x>=0)&(x<.06);y[mask]+=.4*np.sin(2*np.pi*500*x[mask])*np.exp(-x[mask]/.01)
            return y
        self.assertEqual(mapped_attacks(audio(.002),sr,grid,1,grid[-1]-1)['status'],'checked')
        with self.assertRaises(ValueError):mapped_attacks(audio(.08),sr,grid,1,grid[-1]-1)

    def test_crop_preserves_the_actual_source_warp(self):
        clip={'position':10,'length':20,'source_start':50,'rate':1,'stretch_markers':[{'position':0,'source':50},{'position':10,'source':59},{'position':20,'source':70}]}
        cropped=crop_clip(clip,15,25,100)
        self.assertEqual(cropped['position'],100)
        for at in [0,2,5,8,10]:
            self.assertAlmostEqual(source_time(cropped,100+at),source_time(clip,15+at))
        self.assertIsNone(crop_clip(clip,30,40,0))
        plain={'position':10,'length':20,'source_start':50,'rate':1.02}
        cropped=crop_clip(plain,15,25,100)
        self.assertAlmostEqual(cropped['source_start'],55.1)
        self.assertAlmostEqual(cropped['stretch_markers'][-1]['source'],65.3)

    @unittest.skipUnless(importlib.util.find_spec('numpy') and importlib.util.find_spec('scipy'),'audio environment')
    def test_actual_grid_coverage_distinguishes_kicks_from_offbeat_sub(self):
        import numpy as np
        sr=12000;bpm=150;period=60/bpm;t=np.arange(16*sr)/sr
        def signal(shift):
            y=np.zeros_like(t)
            for at in np.arange(shift,16,period):
                x=t-at;mask=(x>=0)&(x<.06);y[mask]+=.3*np.sin(2*np.pi*500*x[mask])*np.exp(-x[mask]/.01)
                x=t-at-period/2;mask=(x>=0)&(x<.15);y[mask]+=.8*np.sin(2*np.pi*70*x[mask])*(1-np.exp(-x[mask]/.02))*np.exp(-x[mask]/.05)
            return y
        self.assertEqual(expected_attacks(signal(.002),sr,bpm,1,15)['status'],'checked')
        with self.assertRaises(ValueError):expected_attacks(signal(.1),sr,bpm,1,15)
