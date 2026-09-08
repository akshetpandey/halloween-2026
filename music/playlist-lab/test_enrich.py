import io
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch
from enrich import Recco, choose_match, enrich_track, spotify_id, search_candidates
from lab import Store

URL='https://open.spotify.com/track/'+'A'*22
RID='12345678-1234-1234-1234-123456789abc'

def candidate(**kw):
    return dict({'id':RID,'href':URL,'trackTitle':'Song','artists':[{'name':'Artist'}],
                 'durationMs':240000,'isrc':'TEST0001'},**kw)

class EnrichmentTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.store=Store(self.tmp.name);self.addCleanup(self.store.db.close)
        with self.store.db:self.ident=self.store.put({'artist':'Artist','title':'Song','duration_ms':240000})

    def test_exact_id_takes_priority_over_title(self):
        c=candidate(trackTitle='Different catalog spelling')
        m,b=choose_match({'spotify_uri':'spotify:track:'+'A'*22},[c])
        self.assertEqual(m,c);self.assertEqual(b,'exact Spotify ID')
        self.assertIsNone(choose_match({'spotify_uri':'spotify:track:'+'B'*22},[c])[0])

    def test_unbound_needs_duration_and_same_recording(self):
        t={'artist':'Artist','title':'Song'}
        self.assertIsNone(choose_match(t,[candidate()])[0])
        t['duration_ms']=240000
        self.assertIsNotNone(choose_match(t,[candidate()])[0])
        self.assertIsNone(choose_match(t,[candidate(durationMs=300000)])[0])
        self.assertIsNone(choose_match(t,[candidate(),candidate(isrc='OTHER')])[0])
        self.assertIsNone(choose_match(t,[candidate(trackTitle='Song - Remix')])[0])

    def test_alternate_release_requires_matching_isrc(self):
        t={'artist':'Artist','title':'Song','duration_ms':240000,'spotify_uri':'spotify:track:'+'B'*22,'isrc':'TEST0001'}
        self.assertIsNone(choose_match(t,[candidate()])[0])
        m,b=choose_match(t,[candidate()],allow_recording=True)
        self.assertIsNotNone(m);self.assertIn('same ISRC',b)
        self.assertIsNone(choose_match(t,[candidate(isrc='WRONG')],allow_recording=True)[0])

    def test_duplicate_release_does_not_claim_spotify_binding(self):
        t={'artist':'Artist','title':'Song','duration_ms':240000}
        m,b=choose_match(t,[candidate(),candidate(href=URL.replace('A'*22,'B'*22))])
        self.assertIsNotNone(m);self.assertIn('unverified',b)

    def test_enrichment_preserves_feedback_and_host_scores(self):
        self.store.vote(self.ident,'up','great')
        self.store.annotate(self.ident,'sexy',4,'host listening')
        class Service:
            def get(self,path):
                return {'id':RID,'href':URL,'energy':.8,'tempo':123.4,'key':-1} if path.endswith('audio-features') else {'content':[candidate()]}
        result=enrich_track(self.store,Service(),self.store.track(self.ident))
        row=self.store.rows()[0]
        self.assertEqual(result['status'],'enriched')
        self.assertEqual(row['vote'],'up');self.assertEqual(row['features']['sexy']['value'],4)
        self.assertNotIn('spotify_uri',row)
        self.assertEqual(row['catalog_analysis']['features']['energy']['value'],.8)
        self.assertNotIn('key',row['catalog_analysis']['features'])

    def test_identity_mismatch_does_not_attach_values(self):
        class Service:
            def get(self,path):return {'id':RID,'href':'wrong','energy':.8} if path.endswith('audio-features') else {'content':[candidate()]}
        with self.assertRaisesRegex(ValueError,'identity mismatch'):
            enrich_track(self.store,Service(),self.store.track(self.ident))
        self.assertNotIn('catalog_analysis',self.store.track(self.ident))

    @patch('enrich.time.sleep')
    @patch('enrich.urllib.request.urlopen')
    def test_rate_limit_retry_and_cache(self,open_url,sleep):
        error=urllib.error.HTTPError(URL,429,'limited',{'Retry-After':'2'},io.BytesIO())
        self.addCleanup(error.close)
        open_url.side_effect=[error,io.BytesIO(b'{"content":[]}')]
        service=Recco(Path(self.tmp.name))
        self.assertEqual(service.get('/track?ids=test'),{'content':[]})
        self.assertEqual(service.get('/track?ids=test'),{'content':[]})
        self.assertEqual(open_url.call_count,2)
        sleep.assert_any_call(2.)

    @patch('enrich.time.sleep')
    @patch('enrich.urllib.request.urlopen')
    def test_long_rate_limit_stops_instead_of_hammering(self,open_url,sleep):
        error=urllib.error.HTTPError(URL,429,'limited',{'Retry-After':'3600'},io.BytesIO())
        self.addCleanup(error.close);open_url.side_effect=error
        with self.assertRaisesRegex(ValueError,'HTTP 429'):Recco(self.tmp.name).get('/track')
        self.assertEqual(open_url.call_count,1)

    def test_search_reads_later_pages_and_rejects_wrong_page(self):
        class Service:
            def get(self,path):
                return {'page':1,'content':[candidate()]} if 'page=1' in path else {'page':0,'totalPages':2,'content':[]}
        self.assertEqual(len(search_candidates(Service(),'Song')),1)
        class Broken:
            def get(self,path):return {'page':0,'totalPages':2,'content':[]}
        with self.assertRaisesRegex(ValueError,'Unexpected'):search_candidates(Broken(),'Song')

    def test_catalog_link_validation(self):
        self.assertEqual(spotify_id(URL),'A'*22)
        self.assertIsNone(spotify_id(URL.replace('open.spotify.com','evil.example')))

if __name__=='__main__':unittest.main()
