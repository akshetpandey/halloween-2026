"""Independent event-grid acceptance needs stability and explicit meter choice."""
import importlib.util
import unittest

from refine_set import model_grid


@unittest.skipUnless(importlib.util.find_spec('numpy'),'analysis environment required')
class TimingReviewTests(unittest.TestCase):
    def fixture(self,bpm=160):
        import numpy as np
        beats=np.round(np.arange(.13,180,60/bpm)/.02)*.02
        return {'bpm':159.97,'duration_seconds':180},{'rhythm':{'beats_seconds':beats.tolist(),'downbeats_seconds':beats[::4].tolist()}}

    def test_quantized_coherent_events_can_refine_an_onset_fit(self):
        t,e=self.fixture();r=model_grid(t,e)
        self.assertIsNotNone(r)
        self.assertAlmostEqual(r['bpm'],160,delta=.01)
        self.assertTrue(r['grid']['model_only_refinement'])
        self.assertFalse(r['grid']['downbeat_verified'])

    def test_changing_bar_phase_cannot_pass_the_review(self):
        t,e=self.fixture();d=e['rhythm']['downbeats_seconds'];e['rhythm']['downbeats_seconds']=[x+(.375 if i%2 else 0) for i,x in enumerate(d)]
        self.assertIsNone(model_grid(t,e))

    def test_tempo_drift_is_rejected(self):
        t,e=self.fixture();e['rhythm']['beats_seconds']=[x+(max(0,x-90)*.01) for x in e['rhythm']['beats_seconds']]
        self.assertIsNone(model_grid(t,e))

    def test_half_time_interpretation_requires_an_explicit_prior(self):
        t,e=self.fixture(75);t['bpm']=75
        self.assertAlmostEqual(model_grid(t,e)['bpm'],75,delta=.01)
        self.assertAlmostEqual(model_grid(t,e,150)['bpm'],150,delta=.02)


if __name__=='__main__':unittest.main()
