import hashlib
from contextlib import closing
import json
from pathlib import Path
import shutil
import sqlite3
import subprocess
import tempfile
import unittest
import wave

from prepare import approved_pool, prepare


class PreparationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.db = self.root / 'library.sqlite3'
        with closing(sqlite3.connect(self.db)) as db, db:
            db.executescript('CREATE TABLE tracks(id TEXT PRIMARY KEY, data TEXT);'
                             'CREATE TABLE feedback(id TEXT PRIMARY KEY, vote TEXT, updated TEXT);'
                             'CREATE TABLE reviewer_feedback(reviewer TEXT,id TEXT,vote TEXT);')

    def add(self, ident, vote=None, room='bedroom', uri=None, isrc=None):
        track = {'id': ident, 'spotify_uri': uri or 'spotify:track:' + ident,
                 'title': ident, 'artist': 'Test', 'duration_ms': 3000}
        if room:
            track['room'] = room
        if isrc:
            track['isrc'] = isrc
        with closing(sqlite3.connect(self.db)) as db, db:
            db.execute('INSERT INTO tracks VALUES(?,?)', (ident, json.dumps(track)))
            if vote:
                db.execute('INSERT INTO feedback VALUES(?,?,?)', (ident, vote, '2026-10-19T00:00:00Z'))
        return track

    def run_prepare(self, mapping=None):
        return prepare(self.db, self.root / 'output', mapping)

    def test_only_host_bedroom_keeps_and_database_unchanged(self):
        self.add('keep', 'up')
        for ident, vote in [('cut', 'down'), ('maybe', 'maybe'), ('pending', None)]:
            self.add(ident, vote)
        self.add('living', 'up', 'living-room')
        self.add('legacy', 'up', None)
        with closing(sqlite3.connect(self.db)) as db, db:
            db.execute('INSERT INTO reviewer_feedback VALUES(?,?,?)', ('guest', 'pending', 'up'))
        before = self.db.read_bytes()
        report = self.run_prepare()
        self.assertEqual([t['id'] for t in report['tracks']], ['keep'])
        self.assertFalse(report['all_files_ready'])
        self.assertFalse(report['party_ready'])
        self.assertEqual(before, self.db.read_bytes())

    def test_cut_recording_blocks_duplicate_keep(self):
        self.add('up', 'up', isrc='AbC')
        self.add('cut', 'down', isrc='abc')
        report = self.run_prepare()
        self.assertEqual(report['tracks'], [])
        self.assertIn('host Cut', report['excluded'][0]['reason'])

    def test_dedupe_recording_without_case_folding_spotify_id(self):
        tracks = [dict(id=str(i), room='bedroom', host_vote='up', spotify_uri=uri)
                  for i, uri in enumerate(['spotify:track:aA', 'spotify:track:aA', 'spotify:track:Aa'])]
        kept, excluded = approved_pool(tracks)
        self.assertEqual([t['id'] for t in kept], ['0', '2'])
        self.assertEqual(len(excluded), 1)

    def test_empty_pool_cannot_be_ready(self):
        self.assertFalse(self.run_prepare()['all_files_ready'])

    def binding(self):
        self.add('audio', 'up')
        audio = self.root / 'test recording.wav'
        with wave.open(str(audio), 'wb') as wav:
            wav.setnchannels(2)
            wav.setsampwidth(2)
            wav.setframerate(8000)
            wav.writeframes(bytes(3 * 8000 * 4))
        binding = {'path': audio.name, 'sha256': hashlib.sha256(audio.read_bytes()).hexdigest(),
                   'version_verified': True, 'source': 'synthetic test fixture'}
        path = self.root / 'bindings.json'
        path.write_text(json.dumps({'spotify:track:audio': binding}))
        return path, audio, binding

    @unittest.skipUnless(shutil.which('ffprobe'), 'ffprobe required for actual file check')
    def test_real_probe_binding_and_later_cut_removes_from_crate(self):
        mapping, audio, _ = self.binding()
        report = self.run_prepare(mapping)
        self.assertTrue(report['all_files_ready'])
        self.assertFalse(report['party_ready'])
        self.assertEqual(report['importable_raw_seconds'], 3)
        playlist = self.root / 'output/approved-ready.m3u8'
        self.assertIn(str(audio), playlist.read_text())
        with closing(sqlite3.connect(self.db)) as db, db:
            db.execute("UPDATE feedback SET vote='down'")
        self.run_prepare(mapping)
        self.assertNotIn(str(audio), playlist.read_text())

    def test_changed_file_is_blocked(self):
        mapping, audio, _ = self.binding()
        audio.write_bytes(b'changed')
        report = self.run_prepare(mapping)
        self.assertEqual(report['importable_file_count'], 0)
        self.assertIn('SHA-256', report['tracks'][0]['file']['reason'])

    def test_unverified_version_is_blocked(self):
        mapping, _, binding = self.binding()
        binding['version_verified'] = False
        mapping.write_text(json.dumps({'spotify:track:audio': binding}))
        report = self.run_prepare(mapping)
        self.assertEqual(report['importable_file_count'], 0)

    @unittest.skipUnless(shutil.which('ffprobe'), 'ffprobe required for actual file check')
    def test_wrong_duration_is_blocked(self):
        mapping, _, _ = self.binding()
        with closing(sqlite3.connect(self.db)) as db, db:
            track = json.loads(db.execute('SELECT data FROM tracks').fetchone()[0])
            track['duration_ms'] = 30000
            db.execute('UPDATE tracks SET data=?', (json.dumps(track),))
        report = self.run_prepare(mapping)
        self.assertEqual(report['importable_file_count'], 0)
        self.assertIn('duration differs', report['tracks'][0]['file']['reason'])

    @unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'ffmpeg/ffprobe required')
    def test_video_without_audio_cannot_enter_crate(self):
        self.add('video', 'up')
        video = self.root / 'video-only.mp4'
        subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i',
                        'color=c=black:s=16x16:r=1:d=3', '-an', '-c:v', 'mpeg4', str(video)],
                       check=True, capture_output=True)
        mapping = self.root / 'bindings.json'
        mapping.write_text(json.dumps({'spotify:track:video': {
            'path': str(video), 'sha256': hashlib.sha256(video.read_bytes()).hexdigest(),
            'version_verified': True, 'source': 'synthetic test fixture'}}))
        report = self.run_prepare(mapping)
        self.assertFalse(report['all_files_ready'])
        self.assertIn('no audio stream', report['tracks'][0]['file']['reason'])

    def test_file_map_input_not_overwritten(self):
        output = self.root / 'output'
        output.mkdir()
        mapping = output / 'file-map.template.json'
        mapping.write_text('{}')
        with self.assertRaises(ValueError):
            self.run_prepare(mapping)
        self.assertEqual(mapping.read_text(), '{}')


if __name__ == '__main__':
    unittest.main()
