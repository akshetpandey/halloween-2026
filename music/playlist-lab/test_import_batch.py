import json
from pathlib import Path
import sqlite3
import tempfile
import threading
import time
import unittest

from import_batch import append_batch
from lab import Store


def candidate(letter, rank, room='living-room', batch='15'):
    uri = 'spotify:track:' + letter * 22
    return {'id': uri, 'spotify_uri': uri, 'room': room, 'batch_id': batch,
            'batch_rank': rank, 'title': letter, 'artist': 'Test'}


class AtomicBatchImportTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.store = Store(self.root)
        self.addCleanup(self.store.db.close)
        with self.store.db:
            self.store.put({'id': 'old-grove', 'title': 'old', 'room': 'living-room'})
            self.store.put({'id': 'old-hollow', 'title': 'old', 'room': 'bedroom'})
        self.store.vote('old-grove', 'down', 'old note')
        self.store.vote('old-hollow', 'maybe', 'still listening')
        self.store.vote_as('reviewer@example.test', 'old-hollow', 'up', 'guest note')
        self.store.annotate_as('reviewer@example.test', 'old-hollow', 'bounce', 4)
        self.payload = {'tracks': [candidate('A', 1), candidate('B', 2)]}

    def run_import(self, **kwargs):
        return append_batch(self.root / 'library.sqlite3', self.payload,
                            self.root / 'before.sqlite3', room='living-room', batch_id='15',
                            expected_count=2, expected_existing=2, **kwargs)

    def test_preserves_feedback_and_open_reader_sees_new_unrated_rows(self):
        before = {name: list(self.store.db.execute('SELECT * FROM ' + name))
                  for name in ['tracks', 'feedback', 'reviewer_feedback', 'reviewer_scores']}
        result = self.run_import()
        self.assertEqual(result['new_unrated'], 2)
        for name in ['feedback', 'reviewer_feedback', 'reviewer_scores']:
            self.assertEqual([tuple(r) for r in self.store.db.execute('SELECT * FROM ' + name)],
                             [tuple(r) for r in before[name]])
        rows = {t['id']: t for t in self.store.rows()}
        self.assertEqual(len(rows), 4)
        self.assertEqual(rows['old-hollow']['reason'], 'still listening')
        self.assertEqual(rows[candidate('A', 1)['id']]['vote'], 'unrated')
        self.store.vote('old-hollow', 'up', 'finished after import')
        self.assertEqual(self.store.rows()[1]['reason'], 'finished after import')
        backup = sqlite3.connect(self.root / 'before.sqlite3')
        self.addCleanup(backup.close)
        self.assertEqual(backup.execute('SELECT count(*) FROM tracks').fetchone()[0], 2)
        self.assertEqual((self.root / 'before.sqlite3').stat().st_mode & 0o777, 0o600)

    def test_rejects_existing_id_without_changing_any_rows(self):
        with self.store.db:
            self.store.put(candidate('B', 2))
        with self.assertRaisesRegex(ValueError, 'count advanced'):
            self.run_import()
        with self.assertRaisesRegex(ValueError, 'IDs already exist'):
            append_batch(self.root / 'library.sqlite3', self.payload,
                         self.root / 'second-before.sqlite3', room='living-room', batch_id='15',
                         expected_count=2, expected_existing=3)
        self.assertEqual(len(self.store.rows()), 3)
        self.assertFalse(any(t['id'] == candidate('A', 1)['id'] for t in self.store.rows()))

    def test_wrong_room_or_feedback_in_payload_cannot_be_imported(self):
        for change in [{'room': 'bedroom'}, {'vote': 'up'}, {'batch_rank': 1}]:
            with self.subTest(change=change):
                original = dict(self.payload['tracks'][1])
                self.payload['tracks'][1].update(change)
                with self.assertRaises(ValueError):
                    self.run_import()
                self.payload['tracks'][1] = original
        self.assertEqual(len(self.store.rows()), 2)

    def test_rejects_reused_room_batch_id(self):
        with self.store.db:
            self.store.put(candidate('C', 1))
        with self.assertRaisesRegex(ValueError, 'batch already exists'):
            append_batch(self.root / 'library.sqlite3', self.payload,
                         self.root / 'before.sqlite3', room='living-room', batch_id='15',
                         expected_count=2, expected_existing=3)
        self.assertEqual(len(self.store.rows()), 3)

    def test_rejects_candidate_with_orphaned_feedback(self):
        with self.store.db:
            self.store.db.execute('INSERT INTO feedback VALUES(?,?,?,?)',
                                  (candidate('A', 1)['id'], 'down', 'orphaned old choice', 'test'))
        with self.assertRaisesRegex(ValueError, 'already has feedback'):
            self.run_import()
        self.assertEqual(len(self.store.rows()), 2)

    def test_mid_write_failure_rolls_back_the_entire_batch(self):
        with self.store.db:
            self.store.db.execute("CREATE TRIGGER reject_second BEFORE INSERT ON tracks "
                                  "WHEN NEW.id = '" + candidate('B', 2)['id'] + "' "
                                  "BEGIN SELECT RAISE(ABORT, 'test failure'); END")
        before_events = list(self.store.db.execute('SELECT * FROM events'))
        with self.assertRaises(sqlite3.IntegrityError):
            self.run_import()
        self.assertEqual(len(self.store.rows()), 2)
        self.assertEqual(list(self.store.db.execute('SELECT * FROM events')), before_events)

    def test_concurrent_hollow_votes_are_serialized_and_not_lost(self):
        errors, started = [], threading.Event()

        def vote():
            connection = sqlite3.connect(self.root / 'library.sqlite3', timeout=10)
            try:
                for i in range(30):
                    with connection:
                        connection.execute('UPDATE feedback SET reason=? WHERE id=?',
                                           (str(i), 'old-hollow'))
                    started.set()
                    time.sleep(.002)
            except BaseException as error:
                errors.append(error)
            finally:
                connection.close()

        thread = threading.Thread(target=vote)
        thread.start()
        self.assertTrue(started.wait(2))
        result = self.run_import()
        thread.join(5)
        self.assertFalse(thread.is_alive())
        self.assertEqual(errors, [])
        self.assertEqual(self.store.rows()[1]['reason'], '29')
        self.assertEqual(result['old_track_records_unchanged'], 2)
        self.assertEqual(len(self.store.rows()), 4)


if __name__ == '__main__':
    unittest.main()
