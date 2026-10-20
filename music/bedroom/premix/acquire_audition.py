#!/usr/bin/env python3
"""Explicitly download the pinned private audition sources using installed yt-dlp.

Does not use Spotify offline files, cookies, credentials, DRM bypass or votes.
Public availability is not proof of a download/reuse license; see source manifest.
"""
import argparse
import json
from pathlib import Path
import subprocess

from reaper_proof import checksum


BASE = Path(__file__).resolve().parent


def acquire(root, manifest_path):
    root = root.resolve()
    (root/'sources').mkdir(parents=True, exist_ok=True)
    manifest = json.loads(manifest_path.read_text())
    batch = json.loads((BASE.parent/'the-hollow-batch-01.json').read_text())
    catalog = {track['id']: track for track in batch['tracks']}
    selected = []
    for source in manifest['tracks']:
        track = dict(catalog[source['id']])
        if track['spotify_uri'] != source['spotify_uri'] or track['isrc'] != source['isrc']:
            raise ValueError('Pinned source no longer matches the batch recording')
        track['audition_only'] = True
        selected.append(track)
        compressed = root/'sources'/(source['id']+'.webm')
        if not compressed.exists():
            subprocess.run(['yt-dlp', '--no-playlist', '--no-cache-dir', '--no-warnings',
                '--no-progress', '--write-info-json', '-f', 'bestaudio[ext=webm]',
                '-o', str(root/'sources'/(source['id']+'.%(ext)s')), source['source_url']],
                check=True)
        if checksum(compressed) != source['stream_sha256']:
            raise ValueError('Source encoding/hash changed; recheck recording and regenerate edits: '
                             +source['id'])
    (root/'selection.json').write_text(json.dumps(selected, indent=2)+'\n')
    return len(selected)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=BASE/'.local/actual-batch-01')
    parser.add_argument('--manifest', type=Path, default=BASE/'audition-01-sources.json')
    parser.add_argument('--acquire', action='store_true', required=True,
                        help='Explicitly authorize this network download invocation')
    args = parser.parse_args()
    print('Hash-verified private sources:', acquire(args.output, args.manifest))
