import unittest
from youtube import select_candidate

class YouTubeMatchingTests(unittest.TestCase):
    def setUp(self):
        self.track={'title':'Song - Edit','artist':'Artist','artists':['Artist'],'duration_ms':240000,'spotify_uri':'spotify:track:'+'A'*22}
        self.video={'id':'abcdefghijk','title':'Song (Edit)','channel':'Artist - Topic','duration':241,'channel_is_verified':False}
    def test_exact_edit_artist_and_duration(self):
        found=select_candidate(self.track,[self.video]);self.assertEqual(found['video_id'],'abcdefghijk')
        self.assertIn('Candidate',found['match_basis'])
    def test_wrong_mix_duration_or_cover_rejected(self):
        for change in [{'title':'Song'},{'duration':480},{'title':'Song - Edit live cover'},{'channel':'Impersonator'}]:
            self.assertIsNone(select_candidate(self.track,[{**self.video,**change}]))
    def test_official_audio_preferred_and_alternates_preserved(self):
        other={**self.video,'id':'bbbbbbbbbbb','title':'Artist - Song Edit (Official Video)','channel':'Artist'}
        found=select_candidate(self.track,[other,self.video])
        self.assertEqual(found['video_id'],'abcdefghijk');self.assertEqual(found['alternatives'][0]['video_id'],'bbbbbbbbbbb')
    def test_missing_runtime_does_not_guess(self):
        self.track['duration_ms']=0;self.assertIsNone(select_candidate(self.track,[self.video]))
    def test_instrumental_or_acoustic_alternate_cannot_replace_vocal_recording(self):
        for version in ['Instrumental','Acoustic','Acapella','Demo']:
            self.assertIsNone(select_candidate(self.track,[{**self.video,'title':'Song Edit '+version}]))
        self.track['title']='Song Edit Instrumental'
        self.assertIsNotNone(select_candidate(self.track,[{**self.video,'title':'Song Edit Instrumental'}]))
