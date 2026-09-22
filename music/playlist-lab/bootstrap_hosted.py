#!/usr/bin/env python3
"""Copy the current private library into the hosted state once, preserving votes."""

from pathlib import Path
import os
import sqlite3

ROOT = Path(__file__).resolve().parent
source = ROOT / '.local/library.sqlite3'
target_dir = ROOT / '.local/hosted'
target = target_dir / 'library.sqlite3'

if not source.is_file():
    raise SystemExit('Local library is missing; nothing to migrate')
target_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
if target.exists():
    raise SystemExit('Hosted library already exists; refusing to overwrite later reviews')
try:
    with sqlite3.connect(f'file:{source}?mode=ro', uri=True) as existing:
        with sqlite3.connect(target) as hosted:
            existing.backup(hosted)
    os.chmod(target, 0o600)
except BaseException:
    target.unlink(missing_ok=True)
    raise
print('Copied the current library and host votes to the private hosted state.')
