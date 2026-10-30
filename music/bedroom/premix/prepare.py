#!/usr/bin/env python3
"""Read host bedroom Keeps and prepare an exact-file crate; never change votes."""
import argparse
import csv
from contextlib import closing
from datetime import datetime, timezone
import hashlib
import json
import math
import re
from pathlib import Path
import sqlite3
import subprocess


DEFAULT_DB = Path(__file__).resolve().parents[2] / 'playlist-lab/.local/hosted/library.sqlite3'


def file_key(ident):
    """Preserve canonical IDs while deriving a safe, portable file basename."""
    if re.fullmatch(r'spotify:track:[A-Za-z0-9]{22}', ident):
        return 'spotify-' + ident.rsplit(':', 1)[1]
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,95}', ident):
        raise ValueError('Unsafe source ID')
    return ident


def digest(path):
    with path.open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


def host_rows(database):
    # mode=ro also prevents silently creating an empty database at the wrong path.
    with closing(sqlite3.connect(database.resolve().as_uri() + '?mode=ro', uri=True)) as db:
        rows = db.execute('SELECT t.id,t.data,f.vote,f.updated FROM tracks t '
                          'LEFT JOIN feedback f ON f.id=t.id ORDER BY t.rowid').fetchall()
    return [dict(json.loads(data), id=ident, host_vote=vote or 'unrated',
                 host_voted_at=updated) for ident, data, vote, updated in rows]


def identities(track):
    keys = set()
    if track.get('spotify_uri'):
        keys.add('spotify_uri:' + track['spotify_uri'].strip())
    if track.get('isrc'):
        keys.add('isrc:' + track['isrc'].strip().upper())
    return keys


def approved_pool(rows):
    bedroom = [t for t in rows if t.get('room', 'living-room') == 'bedroom']
    rejected = set().union(*(identities(t) for t in bedroom if t['host_vote'] == 'down'))
    selected, excluded, seen = [], [], set()
    for track in bedroom:
        if track['host_vote'] != 'up':
            continue
        keys = identities(track)
        reason = ('missing Spotify URI' if not track.get('spotify_uri') else
                  'host Cut on the same recording' if keys & rejected else
                  'duplicate recording' if keys & seen else None)
        if reason:
            excluded.append({'id': track['id'], 'reason': reason})
        else:
            selected.append(track)
            seen.update(keys)
    return selected, excluded


def probe_duration(path):
    result = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a:0',
                             '-show_entries', 'stream=codec_type,duration:format=duration',
                             '-of', 'json', str(path)], check=True, capture_output=True, text=True)
    data = json.loads(result.stdout)
    streams = data.get('streams', [])
    if not streams or streams[0].get('codec_type') != 'audio':
        raise ValueError('file has no audio stream')
    duration = streams[0].get('duration')
    if duration in (None, 'N/A'):
        duration = data['format']['duration']
    value = float(duration)
    if not math.isfinite(value) or value <= 0:
        raise ValueError('invalid file duration')
    return value


def check_file(track, binding, base):
    if not binding:
        return {'status': 'missing binding'}
    try:
        if not isinstance(binding, dict):
            raise ValueError('file binding must be an object')
        if binding.get('version_verified') is not True or not binding.get('source'):
            raise ValueError('exact version and acquisition source must be confirmed')
        raw = binding.get('path', '')
        if not raw or any(c in raw for c in '\r\n\0'):
            raise ValueError('invalid file path')
        path = Path(raw).expanduser()
        path = (base / path).resolve() if not path.is_absolute() else path.resolve()
        actual_hash = digest(path)
        if actual_hash != binding.get('sha256'):
            raise ValueError('SHA-256 missing or changed; recheck the exact version')
        seconds = probe_duration(path)
        catalog_seconds = float(track.get('duration_ms', 0)) / 1000
        if not math.isfinite(catalog_seconds) or catalog_seconds <= 0:
            raise ValueError('missing catalog duration; verify version before import')
        if abs(seconds - catalog_seconds) > 5:
            raise ValueError('duration differs by more than 5s; radio/extended edit needs review')
        return {'status': 'ready for import', 'path': str(path), 'sha256': actual_hash,
                'duration_seconds': seconds, 'source': binding['source'],
                'version_verified': True}
    except (OSError, ValueError, KeyError, TypeError, subprocess.CalledProcessError) as error:
        return {'status': 'blocked', 'reason': str(error)}


def prepare(database, output, file_map=None):
    names = ('approved.json', 'file-map.template.json', 'approved.csv', 'approved-ready.m3u8')
    if file_map and file_map.resolve() in {(output / name).resolve() for name in names}:
        raise ValueError('Keep the input file map separate from generated output files')
    rows = host_rows(database)
    tracks, excluded = approved_pool(rows)
    bindings = json.loads(file_map.read_text()) if file_map else {}
    if not isinstance(bindings, dict):
        raise ValueError('file map must be an object keyed by Spotify URI')
    base = file_map.resolve().parent if file_map else Path.cwd()
    entries = []
    for track in tracks:
        fields = ('id', 'spotify_uri', 'isrc', 'artist', 'title', 'album', 'duration_ms',
                  'lane', 'style', 'host_voted_at', 'catalog_analysis')
        entry = {key: track.get(key) for key in fields}
        entry['file'] = check_file(track, bindings.get(track['spotify_uri']), base)
        entries.append(entry)
    ready = [t for t in entries if t['file']['status'] == 'ready for import']
    manifest = {
        'schema_version': 1, 'generated_at': datetime.now(timezone.utc).isoformat(),
        'room': 'bedroom', 'approval_authority': 'Playlist Lab canonical shared feedback, vote=up; host priority',
        'bedroom_review_count': sum(t.get('room') == 'bedroom' for t in rows),
        'approved_recording_count': len(entries), 'importable_file_count': len(ready),
        'all_files_ready': bool(entries) and len(entries) == len(ready),
        'catalog_raw_seconds': sum((t.get('duration_ms') or 0) / 1000 for t in entries),
        'importable_raw_seconds': sum(t['file']['duration_seconds'] for t in ready),
        'rendered_seconds': None, 'party_ready': False,
        'order_warning': 'Database order is a preparation crate, not a finished mix sequence.',
        'excluded': excluded, 'tracks': entries,
    }
    output.mkdir(parents=True, exist_ok=True)
    (output / 'approved.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    template = {t['spotify_uri']: {'path': '', 'sha256': '', 'source': '',
                                'version_verified': False} for t in entries}
    (output / 'file-map.template.json').write_text(json.dumps(template, indent=2) + '\n')
    with (output / 'approved.csv').open('w', newline='') as handle:
        fields = ['spotify_uri', 'artist', 'title', 'lane', 'duration_ms', 'file_status']
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for track in entries:
            writer.writerow({**{key: track.get(key) for key in fields[:-1]},
                             'file_status': track['file']['status']})
    lines = ['#EXTM3U', '# Preparation crate; not the final DJ order.']
    lines.extend(t['file']['path'] for t in ready)
    (output / 'approved-ready.m3u8').write_text('\n'.join(lines) + '\n')
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', type=Path, default=DEFAULT_DB)
    parser.add_argument('--output', type=Path, default=Path(__file__).parent / '.local/prepared')
    parser.add_argument('--file-map', type=Path)
    parser.add_argument('--require-files', action='store_true', help='Fail unless nonempty and all files verified')
    args = parser.parse_args()
    try:
        report = prepare(args.database, args.output, args.file_map)
    except (OSError, ValueError, sqlite3.Error) as error:
        parser.exit(2, f'Preparation failed: {error}\n')
    print(json.dumps({key: report[key] for key in (
        'approved_recording_count', 'importable_file_count', 'catalog_raw_seconds',
        'all_files_ready', 'party_ready')}, indent=2))
    if args.require_files and not report['all_files_ready']:
        parser.exit(2, 'No complete verified file crate; see approved.json.\n')


if __name__ == '__main__':
    main()
