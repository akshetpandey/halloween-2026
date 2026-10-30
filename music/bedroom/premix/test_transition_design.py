import copy
import importlib.util
import unittest

from transition_design import SCHEMA,check_rendered_drums,validate_design,validate_programme_design,bass_handover_levels


def valid_join():
    return {'kind':'bass_swap','bars':24,'arrangement_design':{
        'schema':SCHEMA,'source_sha256':['a'*64,'b'*64],
        'phrase_cues':[{'deck':d,'source_seconds':t,'event':'phrase change',
                        'evidence':'source arrangement change'} for d,t in [('outgoing',320),('incoming',0)]],
        'lead_schedule':[{'start_beat':0,'end_beat':64,'primary':'outgoing','supporting_audio':'incoming drum/bass intro'},
                         {'start_beat':64,'end_beat':96,'primary':'incoming','supporting_audio':'outgoing percussive tail'}],
        'bass_swap_beat':64,'incoming_bass_present_at_swap':True,'unintended_breakdown':False,
        'realized_timing':{'status':'checked','peak_p95_error_ms':2}}}


class DesignTests(unittest.TestCase):
    def test_matching_bpm_key_and_length_cannot_replace_arrangement(self):
        for j in [{'kind':'reset','bars':0},{'kind':'harmonic_blend','bars':16,'harmonic_cost':0}]:
            with self.assertRaises(ValueError):validate_design(j)

    def test_missing_foreground_and_empty_bass_handover_fail(self):
        validate_design(valid_join())
        for key,value in [('lead_schedule',[]),('incoming_bass_present_at_swap',False),
                          ('unintended_breakdown',True),('review_state','rejected'),
                          ('realized_timing',{'status':'failed'})]:
            j=valid_join();j['arrangement_design'][key]=value
            with self.assertRaises(ValueError):validate_design(j)

    def test_source_sequence_mismatch_cannot_reuse_design(self):
        report={'tracks':[{'source_sha256':'a'*64},{'source_sha256':'b'*64}],'transitions':[valid_join()]}
        validate_programme_design(report)
        report['tracks'].reverse()
        with self.assertRaises(ValueError):validate_programme_design(report)

    @unittest.skipUnless(importlib.util.find_spec('numpy') and importlib.util.find_spec('scipy'),'audio environment')
    def test_same_tempo_shifted_attacks_fail_actual_audio_check(self):
        import numpy as np
        sr=12000;bpm=150;p=60/bpm;t=np.arange(sr*24)/sr
        def deck(shift):
            y=np.zeros_like(t)
            for at in np.arange(.002+shift,24,p):
                x=t-at;mask=(x>=0)&(x<.04)
                y[mask]=np.sin(2*np.pi*500*x[mask])*np.exp(-x[mask]/.008)
            return y
        good=check_rendered_drums(np.column_stack([deck(0),deck(.003)]),sr,bpm,2,22)
        bad=check_rendered_drums(np.column_stack([deck(0),deck(.07)]),sr,bpm,2,22)
        self.assertEqual(good['status'],'checked')
        self.assertEqual(bad['status'],'failed')

    @unittest.skipUnless(importlib.util.find_spec('numpy') and importlib.util.find_spec('scipy'),'audio environment')
    def test_bass_continuity_measurement_exposes_a_level_drop(self):
        import numpy as np
        sr=4000;t=np.arange(sr*12)/sr;y=np.sin(2*np.pi*80*t)
        stable=bass_handover_levels(y,sr,6,3)
        y[t>=6]*=.25
        dropped=bass_handover_levels(y,sr,6,3)
        self.assertAlmostEqual(stable['change_db'],0,delta=.01)
        self.assertAlmostEqual(dropped['change_db'],-12.04,delta=.1)
