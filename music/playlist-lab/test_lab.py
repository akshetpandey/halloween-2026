import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import lab

A='spotify:track:'+'A'*22
B='spotify:track:'+'B'*22
C='spotify:track:'+'C'*22

def snap(uris, version='v1'):
    return {'playlist_id':'P'*22,'snapshot_id':version,'name':'Test','tracks':[{'spotify_uri':u,'artist':'Test','title':u,'duration_ms':600000} for u in uris]}

class FakeAPI:
    def __init__(self, uris): self.data=snap(uris); self.writes=[]
    def pull(self,pid): return copy.deepcopy(self.data)
    def request(self,method,path,body=None):
        if method=='GET': return copy.deepcopy(self.data)
        self.writes.append((method,body))
        uris=[t['spotify_uri'] for t in self.data['tracks']]
        if method=='DELETE': uris=[u for u in uris if u not in [x['uri'] for x in body['items']]]
        if method=='POST': uris+=body['uris']
        if method=='PUT': uris.insert(body['insert_before'],uris.pop(body['range_start']))
        self.data=snap(uris,'v'+str(len(self.writes)+1))
        return {'snapshot_id':self.data['snapshot_id']}

class LabTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.store=lab.Store(self.tmp.name);self.addCleanup(self.store.db.close)
    def test_votes_persist_and_history_survives_reset(self):
        with self.store.db: ident=self.store.put({'title':'one','artist':'test'})
        self.store.vote(ident,'down','boring');self.store.vote(ident,'unrated','retry')
        self.assertEqual(self.store.rows()[0]['vote'],'unrated')
        self.assertEqual(self.store.db.execute("SELECT count(*) FROM events WHERE kind='vote'").fetchone()[0],2)
    def test_removal_never_infers_dislike_and_reorder_is_not_removal(self):
        self.store.record_snapshot(snap([A,B]))
        changes=self.store.record_snapshot(snap([B,A],'v2'))
        self.assertTrue(changes['reordered']);self.assertEqual(changes['removed'],[])
        changes=self.store.record_snapshot(snap([B],'v3'))
        self.assertEqual(changes['removed'],[A])
        self.assertTrue(all(t['vote']=='unrated' for t in self.store.rows()))
    def test_seed_does_not_overwrite_later_work(self):
        p=Path(self.tmp.name)/'seed.json';p.write_text(json.dumps({'tracks':[{'id':'x','title':'old'}]}))
        self.store.seed(p)
        with self.store.db:self.store.put({'id':'x','title':'new'})
        self.store.vote('x','up');self.store.seed(p)
        self.assertEqual(self.store.rows()[0]['title'],'new');self.assertEqual(self.store.rows()[0]['vote'],'up')
    def test_stale_plan_does_not_write(self):
        api=FakeAPI([A,B]);plan=lab.plan_changes(api.pull('P'*22),[B,C]);api.data['snapshot_id']='changed'
        with self.assertRaisesRegex(ValueError,'changed'):lab.apply_plan(api,self.store,plan)
        self.assertEqual(api.writes,[])
    def test_apply_add_remove_reorder_and_backup(self):
        api=FakeAPI([A,B]);plan=lab.plan_changes(api.pull('P'*22),[C,B])
        result=lab.apply_plan(api,self.store,plan)
        self.assertTrue(result['verified']);self.assertEqual([t['spotify_uri'] for t in api.data['tracks']],[C,B])
        self.assertEqual(len(list((Path(self.tmp.name)/'backups').glob('*.json'))),1)
    def test_noop_writes_nothing(self):
        api=FakeAPI([A,B]);lab.apply_plan(api,self.store,lab.plan_changes(api.pull('P'*22),[A,B]))
        self.assertEqual(api.writes,[])
    def test_duplicate_or_empty_sequence_rejected(self):
        for desired in ([],[A,A]):
            with self.assertRaises(ValueError):lab.plan_changes(snap([A]),desired)
    def test_partial_failure_is_recorded_and_not_retried(self):
        api=FakeAPI([A,B]);original=api.request
        def request(method,path,body=None):
            if method=='POST':raise ValueError('network failure')
            return original(method,path,body)
        api.request=request
        with self.assertRaisesRegex(ValueError,'network'):lab.apply_plan(api,self.store,lab.plan_changes(snap([A,B]),[B,C]))
        self.assertEqual(len(api.writes),1)
        self.assertEqual([t['spotify_uri'] for t in api.data['tracks']],[B])
        self.assertEqual(self.store.db.execute("SELECT count(*) FROM events WHERE kind='write_attempt'").fetchone()[0],2)
    def test_apply_recomputes_tampered_action_lists(self):
        api=FakeAPI([A,B]);plan=lab.plan_changes(api.pull('P'*22),[B]);plan['remove']=[]
        lab.apply_plan(api,self.store,plan)
        self.assertEqual([t['spotify_uri'] for t in api.data['tracks']],[B])
    def test_feature_unknown_stays_unknown(self):
        with self.store.db:ident=self.store.put({'title':'one'})
        self.store.annotate(ident,'bounce',4,'host listening')
        self.assertNotIn('tempo',self.store.track(ident)['features'])
        with self.assertRaises(ValueError):self.store.annotate(ident,'energy',4,'Spotify')
    def test_batches_over_one_hundred(self):
        uris=['spotify:track:'+str(i).zfill(22) for i in range(205)]
        api=FakeAPI([A]);lab.apply_plan(api,self.store,lab.plan_changes(api.pull('P'*22),uris))
        sizes=[len(b['uris']) for m,b in api.writes if m=='POST']
        self.assertEqual(sizes,[100,100,5])
    def test_new_api_item_key_and_complete_pages(self):
        item={'uri':A,'external_urls':{'spotify':'https://open.spotify.com/track/'+'A'*22},'artists':[{'id':'id','name':'Artist'}], 'name':'Song','album':{'name':'Album','id':'album'},'duration_ms':100,'explicit':False,'type':'track'}
        api=object.__new__(lab.API)
        api.request=lambda method,path: {'items':[{'item':item}],'total':1} if '/items?' in path else {'snapshot_id':'v1','name':'Test'}
        self.assertEqual(api.pull('P'*22)['tracks'][0]['spotify_uri'],A)
        api.request=lambda method,path: {'items':[{'item':None}],'total':1} if '/items?' in path else {'snapshot_id':'v1','name':'Test'}
        with self.assertRaisesRegex(ValueError,'discarded'):api.pull('P'*22)

    def test_clear_score(self):
        with self.store.db: ident=self.store.put({'title':'one'})
        self.store.annotate(ident,'bounce',4,'host listening')
        self.store.annotate(ident,'bounce',None,'host listening')
        self.assertNotIn('bounce',self.store.track(ident)['features'])
    def test_csv_import_is_atomic_and_preserves_provenance(self):
        with self.store.db: ident=self.store.put({'title':'one'})
        p=Path(self.tmp.name)/'features.csv'
        p.write_text('id,field,value,source\n'+ident+',tempo,122,rekordbox\nmissing,key,8A,rekordbox\n')
        with self.assertRaises(ValueError): self.store.import_features(p)
        self.assertNotIn('features',self.store.track(ident))
        p.write_text('id,field,value,source\n'+ident+',tempo,122,rekordbox\n')
        self.assertEqual(self.store.import_features(p),1)
        self.assertEqual(self.store.track(ident)['features']['tempo']['source'],'rekordbox')
    def test_live_identity_match_preserves_archived_vote(self):
        with self.store.db:ident=self.store.put({'title':A,'artist':'Test'})
        self.store.vote(ident,'up')
        self.store.record_snapshot(snap([A]))
        self.assertEqual(len(self.store.rows()),1)
        self.assertEqual(self.store.rows()[0]['vote'],'up')
        self.assertEqual(self.store.rows()[0]['spotify_uri'],A)
    def test_audit_never_claims_runtime_with_unknown_lengths(self):
        self.assertIsNone(lab.audit([{'title':'unknown'}])['planning_seconds_after_12s_joins'])
    def test_downvote_stops_apply(self):
        api=FakeAPI([A,B]);self.store.record_snapshot(api.pull('P'*22));self.store.vote(A,'down')
        with self.assertRaisesRegex(ValueError,'downvoted'):lab.apply_plan(api,self.store,lab.plan_changes(api.pull('P'*22),[A]))
        self.assertEqual(api.writes,[])
    def test_nine_hour_gate(self):
        api=FakeAPI([A,B]);plan=lab.plan_changes(api.pull('P'*22),[A]);plan['playlist_id']=lab.PLAYLIST
        with self.assertRaisesRegex(ValueError,'nine hours'):lab.apply_plan(api,self.store,plan)
        self.assertEqual(api.writes,[])
    def test_read_changes_during_pagination_are_rejected(self):
        api=object.__new__(lab.API);calls=[]
        def request(method,path):
            calls.append(path)
            if '/items?' in path:return {'items':[],'total':0}
            return {'name':'Test','snapshot_id':'first' if len(calls)==1 else 'last'}
        api.request=request
        with self.assertRaisesRegex(ValueError,'changed'):api.pull('P'*22)

    @patch('lab.time.sleep')
    def test_artist_genres_cached_and_separate_from_track_styles(self,sleep):
        aid='A'*22
        with self.store.db:
            self.store.put({'id':'one','title':'Song','artist_ids':[aid],'style':['disco']})
            self.store.put({'id':'two','title':'Other','artist_ids':[aid]})
        class ArtistAPI:
            calls=0
            def request(self,method,path):
                self.calls+=1
                return {'name':'Artist','genres':['house']}
        api=ArtistAPI();lab.fetch_genres(api,self.store);lab.fetch_genres(api,self.store)
        self.assertEqual(api.calls,1)
        self.assertEqual(self.store.track('one')['style'],['disco'])
        self.assertEqual(self.store.track('two')['artist_genres'][aid]['genres'],['house'])

    def test_binding_merges_exact_duplicate_without_losing_vote(self):
        self.store.record_snapshot(snap([A]))
        self.store.vote(A,'up','great')
        with self.store.db: ident=self.store.put({'title':'Archived title','artist':'Test'})
        self.store.bind(ident,{'spotify_uri':A,'title':'Exact title','artist':'Test'})
        self.assertEqual(len(self.store.rows()),1)
        self.assertEqual(self.store.rows()[0]['vote'],'up')
        self.assertEqual(self.store.rows()[0]['id'],ident)

if __name__=='__main__':unittest.main()
