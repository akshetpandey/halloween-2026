# Local audio intelligence for mix preparation

- Session: shared music curation / premix continuation; October 25, 2026, America/New_York.
- Scope: optional local beat/downbeat, tonal and vocal evidence; independent review of existing cut/transition choices. Owned files are the new intelligence script, tests, pinned requirements, guide/results, and links/current status in the bedroom README, premix README and production plan.
- Checkout/base: `/Users/akshet/workspace/halloween-2026`, shared `main`, base `554eec2`. Final commit is reported in chat; no push.
- Status: evidence pipeline implemented and tested; improved production timeline/render, approved source integration, nine hours and hardware tests remain.
- User decision: free local ML models, code, online data and tools are authorized to improve results. Continue REAPER and delegated production decisions. No purchase, paid cloud compute, live crowd sensing or review-vote change was requested.

## Work and evidence

[Audio intelligence guide](premix/AUDIO-INTELLIGENCE.md) owns the method, reproduction commands and current result interpretation. The new script reads the existing twelve-source audition analysis and exact decoded files, checks hashes/durations, and writes to ignored `.local/actual-batch-01/intelligence/`. Beat This final0 predicts beats/downbeats; Essentia estimates global/local key; Demucs htdemucs separates vocals for Mau P and John Summit. The stem-energy heuristic marks candidate vocal regions; it does not transcribe words or prove absence of singing.

The report annotates original cuts with distance to predicted downbeats and nearby vocal activity. Join evidence maps both constant-overlap source rates and checks simultaneous candidate vocals in the central blend. Missing vocal evidence stays unknown. Model/baseline disagreement is retained as a review flag; nothing automatically overwrites the original grid, decisions or liked render. Lyrics/transcription and All-In-One section recognition remain optional, uninstalled candidates.

An initial pilot exposed 20 ms event quantization bias: a single-interval median could turn 123 BPM into 125. The final version estimates across eight predicted beats and has a regression fixture for this. DnB half-time predictions and changing bar phase are explicit review flags. None of these predictions is calibrated confidence or a human-verified downbeat/phrase.

Dependencies are pinned in [requirements-intelligence.txt](premix/requirements-intelligence.txt), installed separately in ignored `.local/ml-venv`; the original analysis environment remains intact. Official model weights are cached under ignored `.local/ml-models/` with recorded SHA-256s. TLS verification remains enabled using the environment's CA bundle. Models/music are processed locally; no source audio was uploaded, and no new music was downloaded.

## Checks and limits

- Full optional-environment regression suite: **47 tests passed**. New tests cover bar-phase disagreement, half-time ambiguity, quantized-event tempo bias, malformed timing, vocal leakage/silence/short regions, missing evidence and simultaneous-versus-alternating vocal joins. Existing source hashes, native warp/cuts, approval isolation and rendering guards remain covered.
- All twelve existing audition files analyzed for beat/downbeat and global/local key; two full-file vocal analyses completed. [Sanitized results](premix/audio-intelligence-results-2026-10-25.json) preserve model/package/source evidence and counts without audio, lyrics or private paths. Raw reports/stems/progress logs stay in `.local/`.
- Original delivery master and MP3 hashes still equal the committed October 19 measurements (`2c23b30408b4…` / `c2eae683d50b…`). This task did not render a replacement or modify source recordings, host approvals, Spotify, hosting or Access policies.
- Ruff lint/format, local Markdown links, ignored-media checks and `git diff --check` checked before commit. No new native REAPER/hardware run is claimed; the change only generates advisory analysis.
- No purchases or fees; $0 spent. Public-stream audition-copy/production acquisition limitations remain in [AUDITION-01](premix/AUDITION-01.md). Private model outputs do not establish source rights, identity or production approval.

## Continue

1. Use the flagged local sections to refine anchors and vocal/tonal partner choices. Do not blindly substitute all model predictions or force key transposition. Keep the host-liked reference; six demo recordings are now Cuts and require approved replacements for production.
2. Bind verified production sources for the approved bedroom pool, then apply the same evidence to retained sections. Add learned section recognition or timestamped transcription only when it resolves a concrete edit ambiguity; avoid treating semantic labels/recognized words as ground truth.
3. Refine retained-section loudness and chapter pacing; render a representative improved chapter. The agent continues owning cuts/transitions without per-edit host questions.
4. Finish at least nine hours after actual edits and rehearse the real FLX4/two-speaker route, separate Google Homes, muted Jellyfin and backup/closing controls. These tests depend on the shared playback plan; no sibling decisions changed.

All owned changes are committed on `main`; resulting hash/checks are in the final response. Runtime caches, models, stems and test logs remain private/ignored. No unrelated dirty files or unpersisted musical decisions are expected at handoff.
