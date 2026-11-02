# Post-party audio cleanup · November 2, 2026

**Complete: keep the final party MP3; retire the other generated/downloaded party audio.** This is the host's latest November 2 instruction and supersedes the earlier remove-everything choice.

The retained [The-Hollow-party.mp3](bedroom/premix/.local/final-hollow-2026-10-29/revision-11/final-render/delivery/The-Hollow-party.mp3) is **1,093,206,827 bytes = 1.09 GB / 1.02 GiB**, with **7:35:30** of music. It stays at the original path so the playback-only REAPER project and single-file playlist can still reference it. Its SHA-256 still matches the original final-delivery verification: `05362655fac7f7d07a4c703ad9ff977a209e72d10b6d78589c14663e68ecbbdc`.

Moved **1,893 files / 21,078,840,389 bytes = 21.08 GB / 19.63 GiB** out of the workspace: downloaded source audio, decoded copies, stems/loops, obsolete audition/proof renders, full FLAC/MP3 archives, reserve/preview/hourly exports, calibration WAVs, cached catalog-preview audio and waveform peaks. The small tracked synthetic MP3 preview was retired too; its source generator and measured proof records remain.

## Recovery and retained records

Everything removed is recoverable in the Mac's Trash folder named **`Halloween-2026-music-cleanup-2026-11-02`**. Its `music/` tree mirrors original repository-relative paths; `RESTORE-MANIFEST.json` records every original path and size, and `RESTORE.txt` explains recovery. Restore selected files to their original paths without overwriting newer data. Trash was **not emptied**, so these bytes have not yet been reclaimed as free disk space. No unrelated Trash contents were touched.

Full private audit and the applied one-off cleanup script remain under `music/output-playback/.local/post-party-cleanup-2026-11-02/`. [Sanitized receipt](post-party-cleanup-2026-11-02.json) contains counts and the retained MP3 identity, not private account data or a full source inventory.

Code, generation scripts, analysis/model environments, model weights, project/plan JSON, source/version evidence, REAPER arrangements/profiles, metadata, votes, credentials and hosting configuration remain. Environment/vendor audio fixtures were preserved as software assets. Personal Downloads, including the original phone capture, were outside the generated-music cleanup. Spotify playlists and the hosted service were not edited or restarted. The remaining music-folder storage includes those tools and records, not just the retained MP3.

The final party MP3 is replayable; the original editable master and old auditions now have missing source media. Restoring sources from Trash or reacquiring them is necessary before rerendering. The raw calibration WAV must be regenerated before another room test. Historical production/audio-proof results remain evidence of what ran, not a claim that retired audio is currently present.

## Verification and handoff

- Checkout: shared `/Users/akshet/workspace/halloween-2026`, `main`, base `b4a42d3`; no worktree or task branch.
- Before movement: no matching REAPER, downloader, renderer or stem-preparation process was found. Every candidate was a regular file in the three ignored music runtime roots, plus the explicitly retired tracked synthetic preview; the final MP3 was excluded by exact path.
- Each move preserved inode, size and modification time. All 1,893 original paths are absent and the matching Trash copies exist at the expected byte sizes; recovery manifest verified.
- Retained final MP3 hash checked before and after movement against the original production receipt. FFprobe still reports 27,330.109521 seconds and 1,093,206,827 bytes.
- **202 voting-database/authentication files** were content-hashed before and after; every digest matched. No raw credential contents were logged or committed.
- Documentation links and `git diff --check` checked. Music generation/render tests were not rerun because cleanup intentionally retires their audio; no new audio was generated.
- Remaining: optional user-managed disposal of this named Trash recovery folder to reclaim disk space. No further approval or source acquisition is needed for replaying the retained MP3.
- Local commit hash is reported in the chat. No push requested. Unrelated `decor/shopping-ready.md` edits remain untouched.
