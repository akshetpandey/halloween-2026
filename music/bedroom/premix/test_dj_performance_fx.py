import importlib.util
import unittest

from dj_performance_fx import check_repeat_clock,tightening_roll,spectral_sweep,echo_tail


class PerformanceTests(unittest.TestCase):
    def test_roll_tightens_on_beats_without_adding_or_dropping_time(self):
        events=tightening_roll(149)
        self.assertEqual(len(events),60)
        for left,right in zip(events,events[1:]):self.assertAlmostEqual(left['time']+left['seconds'],right['time'])
        self.assertAlmostEqual(events[-1]['time']+events[-1]['seconds'],16*60/149)
        self.assertEqual([events[i]['beats'] for i in [0,4,12,28]],[1,.5,.25,.125])

    def test_invalid_stage_cannot_create_an_empty_or_unbounded_roll(self):
        for kwargs in [{'stage_beats':0},{'fractions':(0,)},{'fractions':(float('nan'),)},{'fractions':(.3,)}]:
            with self.assertRaises(ValueError):tightening_roll(149,**kwargs)

    @unittest.skipUnless(importlib.util.find_spec('numpy') and importlib.util.find_spec('scipy'),'audio environment')
    def test_realized_repeat_check_catches_a_late_loop_even_with_correct_total_duration(self):
        import numpy as np
        sr=24000;bpm=150;events=tightening_roll(bpm);x=np.zeros(round(16*60/bpm*sr))
        rng=np.random.default_rng(3);templates={f:rng.normal(size=round(f*60/bpm*sr)) for f in [1,.5,.25,.125]}
        for e in events:
            start=round(e['time']*sr);part=templates[e['beats']]
            x[start:start+len(part)]=part
        self.assertEqual(check_repeat_clock(x,sr,bpm)['status'],'checked')
        e=events[3];a=round(e['time']*sr);n=len(templates[1]);delay=round(.006*sr)
        x[a:a+n]=np.concatenate([np.zeros(delay),templates[1][:-delay]])
        self.assertEqual(check_repeat_clock(x,sr,bpm)['status'],'failed')

    @unittest.skipUnless(importlib.util.find_spec('numpy') and importlib.util.find_spec('scipy'),'audio environment')
    def test_filter_preserves_frames_and_removes_bass_from_effect_layer(self):
        import numpy as np
        sr=24000;t=np.arange(3*sr)/sr
        y=np.sin(2*np.pi*80*t)+.3*np.sin(2*np.pi*4000*t)
        out=spectral_sweep(y,sr,400,2200,9000)
        self.assertEqual(len(out),len(y));self.assertTrue(np.all(np.isfinite(out)))
        middle=out[sr:2*sr];f=np.fft.rfftfreq(len(middle),1/sr);s=np.abs(np.fft.rfft(middle))
        self.assertLess(s[np.argmin(abs(f-80))]/s[np.argmin(abs(f-4000))],.02)

    @unittest.skipUnless(importlib.util.find_spec('numpy'),'audio environment')
    def test_echo_is_wet_only_beat_spaced_and_decays(self):
        import numpy as np
        sr=1000;bpm=150;x=np.ones(100);y=echo_tail(x,sr,bpm,3,.5)
        self.assertTrue(np.all(y[:400]==0))
        for i in [1,2,3]:self.assertAlmostEqual(float(y[i*400+50]),.5**i)
        self.assertEqual(len(y),1300)
