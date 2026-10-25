# Applying analysis to unrendered mix plans

- Session/date: shared music continuation, October 25, 2026, America/New_York.
- User decision: apply the analysis improvements and build/test a system for the final version; **do not render yet**. Detailed production choices remain delegated. Current host track approvals and the nine-hour finished requirement remain authoritative.
- Checkout/base: `/Users/akshet/workspace/halloween-2026`, shared `main`, base `c62cafc`. Implementation checkpoint **`9c82db1`**; final documentation/result commit is reported in chat. No push.
- Scope/owned files: `premix/plan_mix.py`, `premix/test_plan_mix.py`, the generic-source extension in `premix/analyze_audio.py`, planner guide/sanitized result, and current bedroom/premix documentation links. No other task, Spotify or hosting changes.
- Status: **planning system implemented and tested**, with an actual six-Keep unrendered plan and a verified-procedural-file production test. Source acquisition, new native build/readback, actual sound, nine-hour delivery and hardware tests remain.

## Completed work

[MIX-PLANNER](premix/MIX-PLANNER.md) owns the current workflow/policies/commands. The planner combines current host bedroom Keeps, verified source acquisition maps, actual-file onset/structure measurements and the independent beat/key/vocal report. It chooses inferred grid phase, retained bodies and eligible repetition cuts, genre chapters, vocal/tonal handovers, bounded tempo warps, bass exchanges and retained-section gains. Low-support bars use resets; unknown voices do not justify interior splices or long vocal blends. Quiet boundary scores reduce word-cut risk without claiming lyric recognition. All detailed choices remain explicit and editable in private JSON/Lua artifacts.

The production route can decode verified acquisitions without replacing originals, run the existing local models including vocals, and generate native build plans. It rechecks approvals/bindings after measurement and exposes `validate_current`/`--validate` for current votes, source/model/map hashes and native-manifest integrity. Future production render integration must call this validator immediately before launching; no renderer is added here. The old audition renderer is not a production approval gate.

The real engineering dry run selected **six current Keeps**, excluding the six now-Cut demo recordings. The plan totals **868.4859778475695 seconds (14:28.49)**, with 19 other approved recordings missing this test's source/evidence. Mau P → John Summit retains a four-bar shared-tempo bass handover but chooses different body windows, reducing modeled central candidate vocal overlap from **0.4347826 to 0**. This is a risk metric, not an audible-clash verdict. Explicit boundary activity/unknowns and inferred grid support remain in the report.

The real production gate returns **zero planned tracks / 25 blocked approvals**, exit 2, because verified acquisition bindings remain missing. Both the direct production check and the `--refresh-analysis` empty-map pipeline were exercised. Procedural files with confirmed maps separately pass the production contract in integration tests. Neither path confers source rights or new Keeps.

## Verification actually performed

- **68 tests pass, no skips** in the optional ML environment. Added tests cover grid correction/half-time, uncertain bars, repeat coalescing, vocal hooks/builds, late peaks, local-key evidence, gain caps, matched overlap/stretch geometry, actual retained-section LUFS, source duration/replacement, missing vocal serialization, a new Cut during planning, later Cut invalidation, altered model/native bindings and production versus audition gates. Earlier approval isolation and native mechanics tests remain covered.
- Ruff lint/format passes for the new planner/tests; `git diff --check` and current Markdown links checked before commit. The small analyzer extension keeps existing file style; its old and generic-source paths pass regression tests.
- A cached real repeat made identical track/range/transition/gain/chapter decisions in **1.94 s**; current-input validation passed in engineering scope and correctly rejected production scope. A 60-track synthetic descriptor test planned 60 unique tracks / 59 joins in **0.33 s**, not an ML or listening-quality benchmark.
- Private planner output contains JSON/Lua and measurements, **no WAV, MP3 or `.rpp`**. REAPER was not launched. The original delivery master and MP3 still match the committed October 19 hashes. No new mix, live playback or physical routing is claimed.
- Public [sanitized results](premix/mix-planner-results-2026-10-25.json) contain metadata/measurements only; runtime sources, paths, Lua plans, model data and logs stay ignored under `premix/.local/`. No credentials, databases, models or audio are staged. No purchases/fees, $0 spent; no source audio uploaded or newly acquired.

Runtime evidence: `.local/planner-proof/mix-plan.json`, `.local/planner-proof/native/`, `.local/planner-proof/loudness-cache/`, `.local/planner-production-gate/`, `.local/planner-empty-pipeline/`, `.local/planner-tests.log` and progress logs. A failed intermediate missing-value serialization was fixed; the final real rerun and missing-vocals regression pass. Treat the current fingerprinted plan as authoritative, not intermediate scripts.

## Remaining work and dependencies

1. Continue collecting approved tracks; obtain and bind exact production acquisitions. Do not label public-stream audition copies as production masters or mark `version_verified` merely to bypass a gate.
2. Run the planning pipeline on the production pool. Refine unsupported beat/phrase and residual vocal-boundary cases; learned section recognition or timestamped lyrics can be added for concrete ambiguities. The agent owns these choices without per-edit host questions.
3. At the host's later rendering stage, run current-input validation, test the new native build/readback, inspect actual transitions and measure final peaks/loudness/duration. Nine planned hours alone do not establish readiness.
4. Finish the nine-hour programme, source/backup checks and the combined FLX4/two-speaker, separate Google Homes and muted Jellyfin rehearsal. Closing/DST/operations decisions remain unchanged.

No sibling task assumptions, Access policies or playlists changed. Final commit/check results are in chat; no unrelated dirty files are expected. No unpersisted production decisions or new access dependencies remain beyond the acquisition/hardware work above.
