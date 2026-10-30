import importlib.util
import unittest

from production_cues import select_body


@unittest.skipUnless(importlib.util.find_spec('numpy'),'audio environment')
class ProductionCueTests(unittest.TestCase):
    def test_entry_breakdown_is_not_selected_as_rhythmic_body(self):
        import numpy as np
        times=.1+np.arange(600)*.4
        initial=times<25.7;breakdown=(times>=25.7)&(times<51.3);ending=times>=204.9
        drums=np.where(breakdown,-50.,-12.);bass=np.where(breakdown,-60.,-18.)
        lead=np.where(initial|ending,-60.,-18.)
        r=select_body({'times':times,'drums_db':drums,'bass_db':bass,'lead_db':lead},.1,150,240.1)
        self.assertAlmostEqual(r['start'],51.3,places=6)
        self.assertGreaterEqual(r['body_end'],204.9-1e-6)
        self.assertLess(r['end'],240.1)
        self.assertAlmostEqual((r['body_end']-r['start'])/(32*60/150),round((r['body_end']-r['start'])/(32*60/150)))

    def test_percussive_track_needs_no_invented_lead_or_bass_stem(self):
        import numpy as np
        times=.1+np.arange(500)*.4
        r=select_body({'times':times,'drums_db':np.full(500,-12.),'bass_db':np.full(500,-75.),'lead_db':np.full(500,-60.)},.1,150,200.1)
        self.assertAlmostEqual(r['start'],.1)
        self.assertFalse(r['melodic_activity_present'])
        self.assertFalse(r['human_verified'])

    def test_silent_source_cannot_produce_a_body(self):
        import numpy as np
        with self.assertRaises(ValueError):
            select_body({'times':.1+np.arange(500)*.4,'drums_db':np.full(500,-100.),'bass_db':np.full(500,-100.),'lead_db':np.full(500,-100.)},.1,150,200.1)

    def test_staccato_lead_is_not_misclassified_as_missing(self):
        import numpy as np
        times=.1+np.arange(500)*.4
        lead=np.where(np.arange(500)%2==0,-12.,-80.)
        lead[times>180]=-80
        r=select_body({'times':times,'drums_db':np.full(500,-12.),'bass_db':np.full(500,-18.),'lead_db':lead},.1,150,200.1)
        self.assertLess(r['start'],3)
        self.assertGreater(r['body_end'],165)
