import unittest
from programme_order import order,shared_tempo


class ProgrammeTests(unittest.TestCase):
    def test_transition_tempo_respects_pitch_preserving_rate_bounds(self):
        for a,b in [(148,150),(165,175),(155,160)]:
            shared=shared_tempo(a,b)
            self.assertIsNotNone(shared)
            self.assertTrue(all(.97<=shared/v<=1.03 for v in [a,b]))
        self.assertIsNone(shared_tempo(136,150))
        self.assertIsNone(shared_tempo(128,174))

    def test_hard_runs_resets_and_separate_reserve_have_no_repeated_recordings(self):
        tracks=[];cues={}
        for bpm,lane in [(135,'Tech house'),(145,'Techno'),(150,'Trance'),(155,'Hard techno')]:
            for i in range(12):
                ident=f'{bpm}-{i}'
                tracks.append({'id':ident,'artist':ident,'artist_ids':[ident],'bpm':bpm,'lane':lane})
                cues[ident]={'grid':{'bpm':bpm},'body':{'start':0,'body_end':150}}
        waves=[('01 Hard',10,9,153),('02 Reset',5,6.6,135),('03 Finale',10,9.5,155)]
        result,info=order(tracks,cues,{},waves)
        self.assertEqual(len({t['id'] for t in result}),len(result))
        party=[t for t in result if t['programme_role']=='party'];reserve=[t for t in result if t['programme_role']=='reserve']
        self.assertTrue(reserve)
        self.assertEqual(party[-1]['programme_chapter'],'03 Finale')
        self.assertGreaterEqual(party[-1]['pressure_proxy'],8)
        self.assertTrue(set(t['id'] for t in party).isdisjoint(t['id'] for t in reserve))
        self.assertTrue(300<=sum(t['programme_chapter']=='02 Reset' for t in party)*150<=1200)

    def test_dnb_exit_bridge_survives_earlier_peaks(self):
        tracks=[];cues={}
        for bpm,count,lane in [(135,8,'Tech house'),(145,8,'Techno'),(150,8,'Trance'),(155,8,'Hard techno'),(160,8,'Hard techno'),(165,4,'Hard techno'),(175,4,'Drum & bass')]:
            for i in range(count):
                ident=f'{bpm}-{i}';tracks.append({'id':ident,'artist':ident,'artist_ids':[ident],'bpm':bpm,'lane':lane})
                cues[ident]={'grid':{'bpm':bpm},'body':{'start':0,'body_end':150}}
        waves=[('01 Hard',10,9,159),('02 Reset',5,7,135),('03 Midnight DnB',25,9.7,173),('04 Reset',5,7,135),('05 Finale',10,9.5,160)]
        result,info=order(tracks,cues,{},waves)
        party=[r for r in result if r['programme_role']=='party']
        self.assertTrue(300<=sum(r['programme_chapter']=='04 Reset' for r in party)*150<=1200)
        self.assertTrue(any(r['id'].startswith('175-') for r in party))
        lookup={t['id']:t for t in tracks}
        for a,b in zip(party,party[1:]):
            if b['entry_transition']=='percussion_tempo_bridge':self.assertLessEqual(max(lookup[a['id']]['bpm'],lookup[b['id']]['bpm'])/min(lookup[a['id']]['bpm'],lookup[b['id']]['bpm']),1.25)
            else:self.assertIsNotNone(shared_tempo(lookup[a['id']]['bpm'],lookup[b['id']]['bpm']))
