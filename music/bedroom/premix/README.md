# Approved bedroom crate preparation

[Current premix plan](../premixed-set-plan-2026-10-19.md)

**REAPER setup and synthetic cut/transition/render proof passed:** [sample, results and one-command reproduction](REAPER-PROOF.md). The preparation bridge below still governs actual bedroom approvals; synthetic fixtures are not approved party tracks.

**Real-track audition:** [12-track sample, source provenance, cut sheet and reproduction](AUDITION-01.md). The host explicitly authorized an audition from the unrated bedroom batch; this separate path preserves votes and does not mark its sources approved. Public-stream test copies and all actual music renders remain ignored. Production still uses the host-Keep-only bridge below.

**Optional audio intelligence:** [beat/downbeat, key and vocal evidence](AUDIO-INTELLIGENCE.md) now has a separate local model environment and report generator. It annotates existing edit points without changing the liked audition, votes or production approvals.

This standard-library Python tool reads the hosted Playlist Lab database **read-only** and exports host bedroom Keeps as JSON/CSV and a local-file M3U8. It does not select from unrated candidates, change votes, access Spotify or render audio. Guest votes do not confer host approval. A Cut for the same bedroom URI/ISRC blocks a duplicate Keep; repeated recordings are deduplicated.

From repository root:

```sh
python3 music/bedroom/premix/prepare.py
```

The default source is `music/playlist-lab/.local/hosted/library.sqlite3`. Use `--database PATH` for another authoritative snapshot. Generated files live under this folder's ignored `.local/prepared/`; original/derived audio and private paths must stay ignored too.

Copy `file-map.template.json` to `.local/file-map.json`. Bind each approved Spotify URI to its acquired source file, SHA-256, acquisition `source` and `version_verified: true` after confirming the exact recording. Paths can be absolute or relative to the map. Acquisition code can generate bindings in bulk; there is no manual BPM/energy labeling requirement. Then run:

```sh
python3 music/bedroom/premix/prepare.py \
  --file-map music/bedroom/premix/.local/file-map.json --require-files
```

Only confirmed files with matching hashes and ffprobe duration within five seconds of the catalog enter `approved-ready.m3u8`. Duration is an additional mismatch check, not identity proof. A mismatch needs version review, not an enlarged tolerance to accept an extended edit. The hash binds the version that was confirmed; it cannot itself recognize a recording.

The next production stage will connect `approved.json` and verified production files to the native REAPER builder. Actual-file analysis and delegated edit selection now exist in the separate audition; automatic production approval integration remains. The M3U8 is also usable for audition or the DJ.Studio fallback (Library → Home → Import M3U(8)). The output is a **preparation crate in database order**, not a final mix order. A partially available crate exports only verified files, while `approved.json` reports missing/blocked ones. `--require-files` exits 2 unless the approved pool is nonempty and every source file is verified. All outputs refresh each successful run, so later Cuts disappear. Copy templates before use; generated files are replaceable.

The preparation report deliberately leaves `party_ready: false` and `rendered_seconds: null`: import readiness cannot establish grids, edits, transitions or nine-hour runtime. `prepare.py` does not render; the separate proof and audition demonstrate rendering. Production approval integration, musical refinement, final master assembly and nine-hour/output tests remain.

Verification:

```sh
python3 -m unittest discover -s music/bedroom/premix -v
```

Tests cover host/room isolation, duplicate/Cut precedence, read-only behavior, empty pools, file changes, version/duration checks and removal from a previously exported crate. Synthetic audio tests use installed ffprobe; they do not establish musical quality.
