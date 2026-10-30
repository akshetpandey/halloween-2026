import importlib.util
import unittest

from drum_cues import attack_phase


@unittest.skipUnless(importlib.util.find_spec('numpy') and importlib.util.find_spec('scipy'),'audio environment required')
class DrumCueTests(unittest.TestCase):
    def test_midband_attacks_ignore_offbeat_sub_bass(self):
        import numpy as np
        sr=12000;bpm=140;period=60/bpm;t=np.arange(24*sr)/sr;y=np.zeros_like(t)
        for at in np.arange(.11,24,period):
            x=t-at;mask=(x>=0)&(x<.08)
            y[mask]+=.3*np.sin(2*np.pi*500*x[mask])*np.exp(-x[mask]/.01)
            x=t-at-period/2;mask=(x>=0)&(x<.2)
            y[mask]+=.9*np.sin(2*np.pi*70*x[mask])*(1-np.exp(-x[mask]/.02))*np.exp(-x[mask]/.08)
        result=attack_phase(y,sr,bpm)
        self.assertTrue(result['usable'])
        self.assertAlmostEqual(result['phase_seconds'],.11,delta=.015)
        self.assertFalse(result['downbeat_verified'])

    def test_silence_and_short_audio_cannot_authorize_a_grid(self):
        import numpy as np
        for audio in [np.zeros(12000),np.zeros(20*12000)]:
            with self.assertRaises(ValueError):attack_phase(audio,12000,140)

    def test_two_cue_windows_fit_a_constant_grid_and_reject_drift(self):
        import numpy as np
        from prepare_drum_grids import fit_cues
        p=60/150
        def cue(numbers,shift=0):
            return {'events_seconds':(.07+np.asarray(numbers)*p+shift).tolist(),
                    'event_weights':[1.]*len(numbers),'phase_seconds':.07}
        cues=[cue(range(100)),cue(range(600,700))]
        grid=fit_cues({'bpm':150},cues)
        self.assertAlmostEqual(grid['bpm'],150,places=6)
        self.assertAlmostEqual(grid['phase_seconds'],.07,places=6)
        drifting=cue(range(600,700))
        drifting['events_seconds']=(np.asarray(drifting['events_seconds'])+np.linspace(-.09,.09,100)).tolist()
        with self.assertRaises(ValueError):fit_cues({'bpm':150},[cues[0],drifting])
        with self.assertRaises(ValueError):fit_cues({'bpm':150},[cue(range(3))])
