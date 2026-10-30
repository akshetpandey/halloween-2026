import importlib.util
import unittest

from actual_audition import source_time
from audit_single_lead import crop_clip,expected_attacks


class AuditTests(unittest.TestCase):
    def test_crop_preserves_the_actual_source_warp(self):
        clip={'position':10,'length':20,'source_start':50,'rate':1,'stretch_markers':[{'position':0,'source':50},{'position':10,'source':59},{'position':20,'source':70}]}
        cropped=crop_clip(clip,15,25,100)
        self.assertEqual(cropped['position'],100)
        for at in [0,2,5,8,10]:
            self.assertAlmostEqual(source_time(cropped,100+at),source_time(clip,15+at))
        self.assertIsNone(crop_clip(clip,30,40,0))

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
