"""Production regressions: canonical IDs, edit identity and model input decoding."""
import importlib.util
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

from acquire_set import version_match
from analyze_audio import decode_source
from prepare import file_key
from compact_audio import compact_source,pcm_identity,open_analysis_audio,content_duration


class SourceTests(unittest.TestCase):
    def track(self):
        return {"title": "Test - Extended Mix", "artist": "Artist", "artists": ["Artist"], "duration_ms": 180000}

    def source(self):
        return {"title": "Test (Extended Mix)", "track": "Test (Extended Mix)", "artist": "Artist", "channel": "Artist - Topic", "duration": 180,
                "description": "Provided to YouTube by Distributor"}

    def test_different_edit_or_show_is_rejected_despite_matching_duration(self):
        source = self.source()
        self.assertTrue(version_match(self.track(), source)[0])
        for title in ["Test", "Test (Live)", "Test (ASOT 1247)", "Test (Other Remix)"]:
            self.assertFalse(version_match(self.track(), {**source, "track": title})[0])

    def test_unrelated_artist_and_third_party_lyric_upload_are_rejected(self):
        source = self.source()
        self.assertFalse(version_match(self.track(), {**source, "artist": "Someone Else", "channel": "Someone Else"})[0])
        self.assertFalse(version_match(self.track(), {**source, "description": "", "channel": "Random Lyrics", "artist": None, "track": None})[0])

    def test_non_latin_titles_do_not_collapse_to_the_same_identity(self):
        track = {**self.track(), "title": "БИЗИ"}
        self.assertTrue(version_match(track, {**self.source(), "track": "БИЗИ"})[0])
        self.assertFalse(version_match(track, {**self.source(), "track": "ДРУГОЙ"})[0])

    def test_feature_credit_does_not_hide_a_different_remix_name(self):
        track = {**self.track(), "title": "Test (feat. Guest) - One Remix"}
        self.assertTrue(version_match(track, {**self.source(), "track": "Test (One Remix)"})[0])
        self.assertFalse(version_match(track, {**self.source(), "track": "Test (feat. Guest) - Other Remix"})[0])

    def test_spotify_ids_are_preserved_but_paths_are_portable(self):
        self.assertEqual(file_key("spotify:track:6HzL348HHRk2dWHNzx42aj"), "spotify-6HzL348HHRk2dWHNzx42aj")
        self.assertEqual(file_key("hollow-01-001"), "hollow-01-001")
        for ident in ["../music", "/tmp/source", "a\nb", "spotify:track:../x", ""]:
            with self.assertRaises(ValueError):
                file_key(ident)

    @unittest.skipUnless(shutil.which("ffmpeg"), "ffmpeg required")
    def test_compressed_audio_decodes_once_and_source_change_invalidates_it(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.webm"
            def generate(frequency):
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"sine=frequency={frequency}:duration=1", "-c:a", "libopus", str(source)], check=True)
            generate(440)
            path = decode_source(source, root, "spotify:track:6HzL348HHRk2dWHNzx42aj")
            original = path.read_bytes()
            modified = path.stat().st_mtime_ns
            self.assertEqual(decode_source(source, root, "spotify:track:6HzL348HHRk2dWHNzx42aj").stat().st_mtime_ns, modified)
            generate(880)
            self.assertNotEqual(decode_source(source, root, "spotify:track:6HzL348HHRk2dWHNzx42aj").read_bytes(), original)

    @unittest.skipUnless(shutil.which('ffmpeg') and importlib.util.find_spec('soundfile'),'audio environment required')
    def test_compact_render_source_keeps_all_original_pcm_frames(self):
        from analyze_audio import digest
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);source=root/'source.webm'
            subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','sine=frequency=440:duration=2','-c:a','libopus',str(source)],check=True)
            wav=decode_source(source,root,'fixture')
            track={'id':'fixture','path':str(wav),'sha256':digest(wav),'source_path':str(source)}
            compact,evidence,temporary=compact_source(track,{'source_sha256':track['sha256']})
            self.assertEqual(pcm_identity(compact['path'],compact['analysis_pcm_frames'])[0],compact['analysis_pcm_sha256'])
            self.assertEqual(evidence['analysis_pcm_file_sha256'],digest(wav))
            self.assertEqual(evidence['source_sha256'],digest(Path(compact['path'])))
            self.assertEqual(temporary,wav)
            with open_analysis_audio(compact['path']) as audio:self.assertEqual(audio.channels,2)
            self.assertEqual(content_duration(compact),compact['analysis_pcm_frames']/48000)
            with self.assertRaises(ValueError):content_duration({**compact,'analysis_pcm_frames':compact['analysis_pcm_frames']+1})


if __name__ == "__main__":
    unittest.main()
