import json
from pathlib import Path
import sqlite3
import tempfile
import unittest

from lab import Store


class SharedVoteTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.store = Store(self.root)
        self.addCleanup(self.store.db.close)
        with self.store.db:
            for ident in ('a', 'b', 'c'):
                self.store.put({'id': ident, 'title': ident, 'artist': 'Test', 'room': 'living-room',
                                'duration_ms': 180000})

    def row(self, ident='a', who='host'):
        return next(t for t in self.store.rows_for(who, 'host') if t['id'] == ident)

    def test_guest_fills_shared_approvals_exports_and_audit_without_becoming_host(self):
        self.store.vote_as('friend', 'a', 'up', 'great hook')
        self.assertEqual(self.row()['vote'], 'up')
        self.assertEqual(self.row()['personal_vote'], 'unrated')
        self.assertEqual(self.row()['vote_origin'], 'reviewer')
        self.assertEqual(self.row(who='another')['vote'], 'up')
        self.assertEqual(self.row(who='another')['reason'], '')
        self.assertEqual(self.store.rows()[0]['reason'], 'great hook')
        self.assertIsNone(self.store.db.execute('SELECT * FROM host_feedback WHERE id=?', ('a',)).fetchone())
        # The canonical table also feeds existing read-only preparation/export code.
        self.assertEqual(self.store.db.execute('SELECT vote FROM feedback WHERE id=?', ('a',)).fetchone()[0], 'up')
        self.assertEqual(len([t for t in self.store.rows() if t['vote'] == 'up']), 1)

    def test_any_host_choice_wins_regardless_of_write_order(self):
        for host, guest in [('up', 'down'), ('down', 'up'), ('maybe', 'up')]:
            with self.subTest(host=host):
                self.store.vote('a', host, 'host note')
                self.store.vote_as('friend', 'a', guest, 'friend note')
                self.assertEqual(self.row()['vote'], host)
                self.assertEqual(self.row(who='friend')['vote'], host)
                self.assertEqual(self.row(who='friend')['personal_vote'], guest)
                self.assertEqual(self.row(who='friend')['reason'], 'friend note')
                self.assertEqual(self.row()['reason'], 'host note')
                self.assertEqual(self.row()['vote_origin'], 'host')
        self.store.vote('a', 'unrated')
        self.store.vote_as('friend', 'a', 'up')
        self.store.vote('a', 'down')
        self.assertEqual(self.row()['vote'], 'down')

    def test_reset_removes_only_callers_vote_and_falls_back(self):
        self.store.vote_as('friend', 'a', 'up')
        self.store.vote('a', 'down')
        self.store.vote('a', 'unrated')
        self.assertEqual(self.row()['vote'], 'up')
        self.assertEqual(self.row()['personal_vote'], 'unrated')
        self.store.vote_as('friend', 'a', 'unrated')
        self.assertEqual(self.row()['vote'], 'unrated')
        self.store.vote('a', 'up')
        self.store.vote_as('friend', 'a', 'down')
        self.store.vote_as('friend', 'a', 'unrated')
        self.assertEqual(self.row()['vote'], 'up')

    def test_latest_active_reviewer_wins_ties_and_reset_restores_other(self):
        self.store.vote_as('first', 'a', 'up')
        self.store.vote_as('second', 'a', 'down')
        self.assertEqual(self.row()['vote'], 'down')
        # Editing an older reviewer's note must not become a new deciding vote.
        self.store.note('a', 'new note', 'first')
        self.assertEqual(self.row()['vote'], 'down')
        self.store.vote_as('second', 'a', 'unrated')
        self.assertEqual(self.row()['vote'], 'up')

    def test_notes_preserve_personal_votes_and_do_not_adopt_shared_choice(self):
        self.store.vote_as('friend', 'a', 'up', 'private friend note')
        self.store.note('a', 'host observation')
        self.assertEqual(self.row()['vote'], 'up')
        self.assertEqual(self.row()['personal_vote'], 'unrated')
        self.assertEqual(self.row()['reason'], 'host observation')
        self.assertEqual(self.row(who='friend')['reason'], 'private friend note')
        self.assertEqual(self.row(who='another')['reason'], '')
        self.store.note('a', 'third note', 'another')
        self.assertEqual(self.row(who='another')['personal_vote'], 'unrated')
        self.assertEqual(self.row()['vote'], 'up')
        self.assertNotIn('reviewer', self.row(who='another'))

    def test_one_vote_updates_own_record_and_projection_atomically(self):
        self.store.vote_as('friend', 'a', 'up')
        with self.store.db:
            self.store.db.execute("CREATE TRIGGER reject_shared BEFORE INSERT ON feedback "
                                  "BEGIN SELECT RAISE(ABORT, 'failure'); END")
        before = [tuple(r) for r in self.store.db.execute('SELECT * FROM reviewer_feedback')]
        with self.assertRaises(sqlite3.IntegrityError):
            self.store.vote_as('friend', 'a', 'down')
        self.assertEqual([tuple(r) for r in self.store.db.execute('SELECT * FROM reviewer_feedback')], before)
        self.assertEqual(self.row()['vote'], 'up')

    def test_binding_does_not_drop_reviewer_history(self):
        with self.store.db:
            self.store.put({'id': 'canonical', 'title': 'Canonical', 'spotify_uri': 'spotify:track:'+'A'*22})
        self.store.vote_as('friend', 'canonical', 'up')
        with self.assertRaisesRegex(ValueError, 'reviewer history'):
            self.store.bind('a', {'spotify_uri': 'spotify:track:'+'A'*22})
        self.assertEqual(self.row('canonical')['vote'], 'up')


class LegacyVoteMigrationTests(unittest.TestCase):
    def make_legacy(self, root):
        db = sqlite3.connect(root / 'library.sqlite3')
        # Minimal legacy data; Store creates the other existing tables normally.
        db.executescript('CREATE TABLE tracks(id TEXT PRIMARY KEY,data TEXT NOT NULL);'
                         'CREATE TABLE feedback(id TEXT PRIMARY KEY,vote TEXT,reason TEXT,updated TEXT);'
                         'CREATE TABLE reviewer_feedback(reviewer TEXT,id TEXT,vote TEXT,reason TEXT,updated TEXT,PRIMARY KEY(reviewer,id));')
        with db:
            for ident in ('keep', 'cut', 'maybe', 'reset', 'new', 'pending'):
                db.execute('INSERT INTO tracks VALUES(?,?)', (ident, json.dumps({'id': ident, 'title': ident})))
            db.executemany('INSERT INTO feedback VALUES(?,?,?,?)', [
                ('keep', 'up', 'host keep', 'old'), ('cut', 'down', 'host cut', 'old'),
                ('maybe', 'maybe', 'host unsure', 'old'), ('reset', 'unrated', 'host note', 'old')])
            db.executemany('INSERT INTO reviewer_feedback VALUES(?,?,?,?,?)', [
                ('friend', 'keep', 'down', 'friend cut', 'new'), ('friend', 'cut', 'up', '', 'new'),
                ('friend', 'maybe', 'up', '', 'new'), ('friend', 'reset', 'down', '', 'new'),
                ('friend', 'new', 'up', 'friend keep', 'new')])
        old_host = list(db.execute('SELECT * FROM feedback ORDER BY id'))
        old_guest = list(db.execute('SELECT * FROM reviewer_feedback ORDER BY id'))
        db.close()
        return old_host, old_guest

    def test_backfills_only_unrated_preserves_originals_and_is_idempotent(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            host, guest = self.make_legacy(root)
            store = Store(root)
            self.assertEqual([tuple(r) for r in store.db.execute('SELECT * FROM host_feedback ORDER BY id')], host)
            self.assertEqual([tuple(r) for r in store.db.execute('SELECT * FROM reviewer_feedback ORDER BY id')], guest)
            self.assertEqual({t['id']: t['vote'] for t in store.rows()},
                             {'keep': 'up', 'cut': 'down', 'maybe': 'maybe', 'reset': 'down', 'new': 'up', 'pending': 'unrated'})
            report = json.loads(store.db.execute("SELECT data FROM events WHERE kind='shared_votes_enabled'").fetchone()[0])
            self.assertEqual(report['adopted_votes'], {'up': 1, 'down': 1})
            self.assertEqual(report['host_disagreements_preserved'], 3)
            store.db.close()
            again = Store(root)
            self.assertEqual(again.db.execute("SELECT count(*) FROM events WHERE kind='shared_votes_enabled'").fetchone()[0], 1)
            self.assertIsNone(again.db.execute("SELECT * FROM host_feedback WHERE id='new'").fetchone())
            again.db.close()

    def test_failed_projection_rolls_back_all_original_votes_and_can_retry(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            host, guest = self.make_legacy(root)
            db = sqlite3.connect(root / 'library.sqlite3')
            db.execute("CREATE TRIGGER reject_migration BEFORE INSERT ON feedback BEGIN SELECT RAISE(ABORT, 'failure'); END")
            db.close()
            with self.assertRaises(sqlite3.IntegrityError):
                Store(root)
            db = sqlite3.connect(root / 'library.sqlite3')
            self.assertEqual(list(db.execute('SELECT * FROM feedback ORDER BY id')), host)
            self.assertEqual(db.execute('SELECT count(*) FROM host_feedback').fetchone()[0], 0)
            self.assertEqual(db.execute('SELECT count(*) FROM settings').fetchone()[0], 0)
            db.execute('DROP TRIGGER reject_migration');db.close()
            store = Store(root)
            self.assertEqual(next(t for t in store.rows() if t['id'] == 'new')['vote'], 'up')
            store.db.close()


if __name__ == '__main__':
    unittest.main()
