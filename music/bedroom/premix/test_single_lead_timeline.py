import unittest

from single_lead_timeline import compile_timeline


class SingleLeadTests(unittest.TestCase):
    def test_full_stereo_leads_meet_exactly_and_loops_add_no_runtime(self):
        tracks=[];cues={};ordered=[]
        for ident,bpm,role in [('a',150,'party'),('b',148,'party'),('c',132,'reserve')]:
            tracks.append({'id':ident,'artist':ident,'title':ident,'path':ident+'.wav','sha256':ident*64,'lane':'Techno'})
            start=.1;body_end=start+256*60/bpm;end=body_end+32*60/bpm
            cues[ident]={'grid':{'bpm':bpm},'body':{'start':start,'body_end':body_end,'end':end,'phrase':{'phase_bars':0}},
                'parts':[{'role':name,'path':ident+name+'.flac','sha256':name+ident,'offset':.02} for name in ['intro','outro']]}
            ordered.append({'id':ident,'programme_role':role,'programme_chapter':role})
        result=compile_timeline(ordered,tracks,cues,{t['id']:0 for t in tracks})
        a,b,c=result['details']
        self.assertAlmostEqual(a['main_end_seconds'],b['main_start_seconds'],places=9)
        self.assertAlmostEqual(b['end_seconds'],c['start_seconds'],places=9)
        self.assertAlmostEqual(result['fresh_seconds'],result['end'],places=9)
        self.assertEqual(result['joins'][0]['arrangement_design']['bass_swap_beat'],32)
        self.assertEqual(result['joins'][1]['kind'],'programme_boundary')
        self.assertEqual(result['joins'][0]['arrangement_design']['realized_timing']['status'],'pending')
        self.assertTrue(all(.97<=r<=1.03 for t in result['details'] for r in t['rate_range']))
        original=[d for d,binding in zip(result['definitions'],result['native_source_bindings']) if binding['kind']=='original']
        self.assertEqual(len(original),3)
        # Incoming musical content is not repeated to manufacture an intro.
        for d in original:self.assertEqual(len(d['clips']),1)
        prefix=next(d for d in result['definitions'] if d['name'].endswith('drum intro'))
        self.assertEqual(len(prefix['clips']),2)
        self.assertTrue(all(p['db']==-24 for p in prefix['eq_bands'][0]['points']))
