import unittest
from performance_features import select


class FeatureSelectionTests(unittest.TestCase):
    def test_features_are_varied_spaced_and_clear_of_reset_bridges(self):
        tracks=[];details=[];evidence={};joins=[]
        for i in range(80):
            ident=str(i);tracks.append({'id':ident,'sha256':f'{i:064x}'})
            details.append({'id':ident,'programme_role':'party','main_start_seconds':i*180,
                            'main_end_seconds':(i+1)*180,'ranges':[[40,220]],'source_bpm':150})
            evidence[ident]={'vocals':{'candidate_vocal_regions':[[40,50]]}}
            if i<79:joins.append({'kind':'single_lead_bass_swap','incoming_bpm':150,
                                  'arrangement_design':{'handover_seconds':(i+1)*180}})
        joins[29]['kind']='percussion_tempo_bridge'
        result=select({'details':details,'joins':joins},tracks,evidence)
        self.assertTrue({'roll_filter_drop','echo_release','call_response_fill','hook_tease_drop'}.issubset({f['kind'] for f in result}))
        self.assertLess(len(result),len(joins)*.2)
        for a,b in zip(result,result[1:]):self.assertGreaterEqual(b['at_seconds']-a['at_seconds'],18*60)
        self.assertTrue(all(abs(f['at_seconds']-5400)>=240 for f in result))
