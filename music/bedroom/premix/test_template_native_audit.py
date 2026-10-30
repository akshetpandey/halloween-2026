import importlib.util
import unittest


@unittest.skipUnless(importlib.util.find_spec('numpy') and importlib.util.find_spec('scipy'),'audio environment')
class TemplateTests(unittest.TestCase):
    def test_same_recording_reference_handles_two_kick_timbres_but_rejects_real_offset(self):
        import numpy as np
        from template_native_audit import check
        sr=8000;bpm=150;split=16;times=np.arange(32*sr)/sr
        def pulses(frequency,shift=0):
            y=np.zeros_like(times)
            for at in np.arange(0,32,.4):
                x=times-at-(shift if at>=split else 0);keep=(x>=0)&(x<.16)
                y[keep]+=(np.sin(2*np.pi*frequency*x[keep])+.5*np.sin(2*np.pi*500*x[keep]))*np.exp(-x[keep]/.025)
            return y
        a=pulses(65);b=pulses(100)
        music=.12*np.sin(2*np.pi*260*times)
        a[times<split]+=music[times<split];b[times>=split]+=music[times>=split]
        good=check(np.column_stack([a,b]),sr,bpm,split)
        self.assertEqual(good['status'],'checked')
        late=pulses(100,.035);late[times>=split]+=music[times>=split]
        self.assertEqual(check(np.column_stack([a,late]),sr,bpm,split)['status'],'failed')
