# TV approval and runtime handoff

- Session title and ID: Batch 02 verdicts and content-duration accounting; session ID unavailable.
- Updated date: September 8, 2026.
- Scope / owned files: [TV plan](tv-visuals.md), [Batch 02 notes](tv-shorts-batch-02.md), [Batch 02 metadata](tv-shorts-batch-02-metadata.json), this handoff, TV entry in [decisions](../operations/decisions.md), VID-01 in [tracker](../operations/task-tracker.md).
- Checkout, branch and base commit: `/Users/akshet/workspace/halloween-2026`, shared `main`, base `7f5dcab`; clean at start.
- Status: requested verdict recording and runtime accounting complete; programme expansion still needed.
- Confirmed user decisions: nine Batch 02 films in, My Moon out because it does not fit (no more specific reason supplied). Canonical individual verdicts live in the TV plan. Host ideally wants 2–3 hours of content, likely removing end credits with an estimated 30% runtime reduction.
- Proposals / interpretations: target refers to unique content after cuts and before repeating. Original Forest remains a supplied reference; show its optional contribution separately. Aim for another approximately 110 approved raw minutes for a 2.5-hour midpoint under the 70%-retention scenario.
- Completed work: 15 approved films total 6,346 seconds (105:46); 70% is 4,442.2 seconds (about 74:02). Batch 02 contributes 42:01 after excluding My Moon. Optional original Forest adds 3:26 raw, giving 109:12 / about 76:26. Gaps and additional raw requirements for 2, 2.5 and 3 hours recorded in the current plan. Removed stale proposed statuses from source metadata, with current verdicts linked instead.
- Checks actually run and results: Python sums against both source-evidence files passed; 15 unique approvals, five rejections, raw/estimated-edited totals and target gaps, JSON and local Markdown links passed. `git diff --check` passed. No new source runtime fetches or playback tests were needed for this arithmetic turn.
- Purchases / external changes / deployments: none. No films downloaded or edited; no actual credit markers measured; no new research batch created.
- Remaining work: source more films matching accepted taste; host review; confirm exact Moonseeker upload runtime; acquire permitted files; identify credit boundaries and calculate actual retained lengths; assemble and test TV repeat with room audio.
- Dependencies / limitations: Moonseeker still uses festival runtime (3:39); 30% is a host-provided planning estimate, not measured end-credit duration. No inference that screening approval means acquisition or TV validation. Distinguish approved The Forest (Alyssa F Torres) from original Forest (only twin).
- Commit on main and dirty files: focused checkpoint after verification, hash in final response per template; no unrelated dirty paths at start. Preserve any concurrent edits and stage only the six owned paths.
