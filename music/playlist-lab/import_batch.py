#!/usr/bin/env python3
"""Append one review batch atomically, with an online backup and no server restart."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import sqlite3
import sys


PRESERVED_TABLES = ('feedback', 'host_feedback', 'reviewer_feedback', 'reviewer_scores', 'settings', 'snapshots', 'events')


def append_batch(database, payload, backup, *, room, batch_id, expected_count=50,
                 expected_existing=None):
    """Only insert new track IDs and one audit event; never merge or replace rows.

    The backup is a consistent online snapshot before the write transaction. Votes
    may advance between that snapshot and BEGIN IMMEDIATE, and after commit. The
    preservation audit runs inside the transaction, while other writers wait.
    """
    database, backup = Path(database).resolve(), Path(backup).resolve()
    tracks = payload.get('tracks')
    if room not in {'living-room', 'bedroom'} or not batch_id:
        raise ValueError('Explicit room and batch ID required')
    if not isinstance(tracks, list) or not tracks or len(tracks) != expected_count:
        raise ValueError('Unexpected batch track count')
    encoded = {}
    ranks = set()
    for track in tracks:
        ident = track.get('id')
        if (not isinstance(ident, str) or not re.fullmatch(r'spotify:track:[A-Za-z0-9]{22}', ident)
                or ident != track.get('spotify_uri') or ident in encoded):
            raise ValueError('Expected distinct canonical Spotify track IDs')
        if track.get('room') != room or track.get('batch_id') != batch_id:
            raise ValueError('Track outside the requested room or batch')
        if {'vote', 'reason'} & track.keys():
            raise ValueError('Candidate payload must not contain feedback')
        rank = track.get('batch_rank')
        if type(rank) is not int or rank in ranks:
            raise ValueError('Expected distinct integer batch ranks')
        ranks.add(rank)
        encoded[ident] = json.dumps(track, allow_nan=False)
    if ranks != set(range(1, expected_count + 1)):
        raise ValueError('Expected contiguous batch ranks')
    if not database.is_file():
        raise ValueError('Existing library database required')

    backup.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    fd = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    os.close(fd)
    db = sqlite3.connect(database.as_uri() + '?mode=rw', uri=True, timeout=10)
    try:
        destination = sqlite3.connect(backup)
        try:
            db.backup(destination, pages=128, sleep=.02)
            if destination.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                raise ValueError('Backup integrity check failed')
        finally:
            destination.close()
        db.execute('BEGIN IMMEDIATE')
        before = dict(db.execute('SELECT id,data FROM tracks'))
        if expected_existing is not None and len(before) != expected_existing:
            raise ValueError('Library track count advanced; inspect before importing')
        if set(before) & encoded.keys():
            raise ValueError('Batch IDs already exist; inspect before retrying')
        if any(t.get('room', 'living-room') == room and t.get('batch_id') == batch_id
               for t in (json.loads(value) for value in before.values())):
            raise ValueError('Room batch already exists; use a new batch ID')
        # Fixed table names, never supplied by a seed or command-line argument.
        preserved = {name: list(db.execute('SELECT * FROM ' + name + ' ORDER BY rowid'))
                     for name in PRESERVED_TABLES}
        for name in ('feedback', 'host_feedback', 'reviewer_feedback', 'reviewer_scores'):
            if encoded.keys() & {row[0] for row in db.execute('SELECT id FROM ' + name)}:
                raise ValueError('Candidate already has feedback; inspect orphaned records')
        db.executemany('INSERT INTO tracks(id,data) VALUES(?,?)', encoded.items())
        at = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        db.execute('INSERT INTO events(at,kind,data) VALUES(?,?,?)',
                   (at, 'batch_import', json.dumps({'room': room, 'batch_id': batch_id,
                                                   'count': len(encoded), 'mode': 'atomic_append'})))
        after = dict(db.execute('SELECT id,data FROM tracks'))
        if (len(after) != len(before) + len(encoded)
                or any(after.get(k) != v for k, v in before.items())
                or any(after.get(k) != v for k, v in encoded.items())):
            raise ValueError('Track preservation/readback failed')
        for name, old in preserved.items():
            current = list(db.execute('SELECT * FROM ' + name + ' ORDER BY rowid'))
            if current[:len(old)] != old or (name != 'events' and len(current) != len(old)):
                raise ValueError('Previous feedback/history preservation failed')
        if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise ValueError('Imported library integrity check failed')
        db.commit()
        return {'verified_at': at, 'mode': 'atomic_append', 'old_track_records_unchanged': len(before),
                'new_track_records_exact': len(encoded), 'new_unrated': len(encoded),
                'old_tables_preserved': {name: True for name in PRESERVED_TABLES},
                'old_events_preserved_as_prefix': True, 'sqlite_integrity': 'ok',
                'online_backup_created': True, 'server_restart_required': False,
                'preservation_scope': 'Inside import transaction; legitimate later votes may advance.'}
    except BaseException:
        db.rollback()
        raise
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', type=Path, required=True)
    parser.add_argument('--backup', type=Path, required=True)
    parser.add_argument('--room', choices=['living-room', 'bedroom'], required=True)
    parser.add_argument('--batch', required=True)
    parser.add_argument('--expected-count', type=int, default=50)
    parser.add_argument('--expected-existing', type=int)
    parser.add_argument('seed', help='Seed JSON file, or - for stdin')
    args = parser.parse_args()
    payload = json.load(sys.stdin) if args.seed == '-' else json.loads(Path(args.seed).read_text())
    result = append_batch(args.database, payload, args.backup, room=args.room, batch_id=args.batch,
                          expected_count=args.expected_count, expected_existing=args.expected_existing)
    print(json.dumps(result))


if __name__ == '__main__':
    main()
