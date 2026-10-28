# Music curation progress · October 28

Verified snapshot: **October 28, 2026, 5:17 p.m. EDT (America/New_York)**. Votes can advance. This replaces the earlier 3:16 p.m. counts on this page; implementation/migration evidence below remains historical. [Previous day](curation-status-2026-10-27.md).

| Room | Shared Keeps | Raw approved duration | Shared Cuts | Maybe | New unrated | Working Keep target | More Keeps needed |
|---|---:|---:|---:|---:|---:|---:|---:|
| October Grove | 121 | 6:40:59 | 672 | 0 | 40 | About 180 | About 59 |
| The Hollow | 183 | 11:08:48 | 267 | 0 | 50 | About 220 | About 37 |

Library: **1,333 records, Grove 833 / Hollow 500**. Every earlier choice is rated. Grove 15 finished **17 Keep / 33 Cut** and Hollow 09 **22 Keep / 28 Cut**. The decrease from the earlier 132 Grove Keeps reflects completed shared decisions/host overrides; prior personal history remains stored.

Current auditions: **[Grove 16 · Spark and sway](https://music.hollow-court.com/?room=living-room&batch=16), 40 candidates**, and **[Hollow 10 · After-dark momentum](https://music.hollow-court.com/?room=bedroom&batch=hollow-10), 50 candidates**. All 90 come from a fresh full Liked Songs snapshot. Grove is deliberately smaller instead of padding to 50 with weaker fits from the increasingly pop/negative remaining pool. No external-discovery substitutions. The previous band's 4/5 result and playful vocals' 6/12 lead Grove selection; hard techno/rave lead Hollow. [Grove guide](living-room/october-grove-batch-16.md) · [Hollow guide](bedroom/the-hollow-batch-10.md).

The exact 90 new records passed US playability, original saved-identity checks including market relinks, prior 1,243-record/old 140-track pool exclusions, cross-room checks and two-appearance credited artist/album caps. Lyric interpretations and mixed/unknown contexts are explicit; catalog metrics do not certify positivity or final musical suitability. ReccoBeats coverage: **37/40 Grove, 34/50 Hollow**; YouTube candidates: **36/40 and 45/50**. Unknown values stay unknown. No full audio audition or new rendered mix.

Both atomic imports preserved old track bytes and all feedback, host/reviewer histories, scores, settings, snapshots and earlier events inside their transactions. Online backups precede each append. **No lab/tunnel restart or security/configuration change.** Signed-in Chrome verified current batches, counts, audition links and sourced metric cards. Fresh filter assertions show Needs review contains exactly the new 40/50; old Cuts stay excluded. **Seven importer tests and 16 Node tests passed.** No production test votes, notes or playback. [Sanitized verification](batch-publication-verification-2026-10-28-batches-16-10.json) · [Handoff](handoff-2026-10-28-room-batches-16-10.md).

Current [disagreements](https://music.hollow-court.com/?room=living-room&filter=disagreements): **97 Grove / zero Hollow**. Individual choices remain visible beside controls; notes/scores stay personal. The current view uses all batches in the selected room.

## Shared approval policy · confirmed October 28

The host asked to make votes shared, merge existing friend choices where the host has not voted, and keep the host's choice on disagreement.

- Host **Keep, Cut or Maybe** takes priority regardless of which vote was saved last.
- Host unrated falls back to the latest active reviewer vote. Timestamp then write order breaks ties if more reviewers join; this is not a majority vote.
- Everyone sees the same shared decision, approved count and Needs review queue. Buttons show **Your vote**; the adjacent summary shows **Shared** and host/reviewer provenance.
- **Reset mine** clears only the caller's vote. Other votes can leave the shared track rated; host Reset releases the override.
- Notes and optional listening scores remain personal. Saving a note neither casts a vote nor makes an older reviewer the latest voter. The existing host-only report retains guest notes/history.

The production migration adopted **47 previously host-unrated choices: 23 Keep / 24 Cut**, all in the Grove. It preserved the host's choice in **99 disagreements**; another **103 guest choices already agreed** with the host. All **249 individual guest votes** remain stored. The complete original **1,157 host feedback rows** were retained separately, including their reasons/timestamps. No original host/reviewer history was erased.

`feedback` is now the **canonical shared result**. `Store.rows()`, approval audits, private exports, playlist guards and the existing read-only premix preparation query consume it. `host_feedback` preserves the host's own choices; `reviewer_feedback` preserves individual reviewer choices. **Future batches must use current shared feedback**, rather than host-only history or an old private export. The previous personal-only counts and preparation snapshots are historical evidence.

Current Liked Songs remain the sourcing gate, followed by room brief, shared votes, recording exclusions and artist/album caps. A global Like is not a party Keep. Four exact Grove anchors, positive-mood/no-acid-techno/chart-pop constraints and the distinct darker Hollow brief remain unchanged. Guest decisions do not confer artist-wide approval.

## Earlier October 28 deployment verification · historical snapshot

The updated Docker lab image is deployed. Only lab was recreated; the Tunnel's container identity/start time, pinned cloudflared 2026.10.4, Compose configuration, Access policies, DNS, routes and permissions stayed unchanged. A fresh stopped SQLite backup preceded the atomic/idempotent startup migration. **Reload pre-update pages once** for the new controls/save protocol; the restart rotates the CSRF token. Old save clients fail with a reload instruction rather than accidentally adopting a shared vote. Use **Refresh votes** to load others' latest choices; there is no continuous polling.

Readback verified all old track records, guest feedback, reviewer scores, snapshots and prior events unchanged; original host rows preserved in `host_feedback`, every rated host decision unchanged in canonical `feedback`, one new migration event and integrity OK. A real-data-clone migration and failure/rollback/idempotence tests passed. All **59 Python tests passed inside Docker**, including signed JWT checks and fake-identity hosted HTTP integration; **nine Node tests** passed for shared filters, authoritative save responses, note-only saves and failure preservation. Full inline script syntax passed.

Signed-in host Chrome showed **132 Grove Keeps / three remaining**, Grove 15's 23/24/3 result, a reviewer-sourced Keep with the host personally unrated, empty personal note, correct Reset mine state, Refresh votes, and **168 Hollow Keeps / 36 remaining**. No production test votes, notes or playback. The private snapshot also verified equal resolved votes for host and existing-reviewer Store views; a separate live friend login was not tested. No published host ports; no-JWT origin **401**, wrong Host **403**. Focused verification, not a new penetration or denied-identity test.

[Implementation/runbook](playlist-lab/README.md#shared-votes-and-host-priority) · [Sanitized evidence](playlist-lab/shared-votes-verification-2026-10-28.json) · [Deployment and rollback handoff](playlist-lab/handoff-2026-10-28-shared-votes.md).

## Earlier October 28 disagreement-feature verification · historical snapshot

[Disagreements](https://music.hollow-court.com/?room=living-room&filter=disagreements) is live: **99 Grove / zero Hollow** at feature verification, before the completed-review snapshot above. It spans all batches in the selected room; different active Keep/Cut/Maybe votes qualify, while Unrated does not. Both signed-in reviewers see each voter’s identity and choice next to the controls; other people’s notes/scores remain private. The shareable filter survives reload and room changes. Changing your vote to agree removes a resolved difference; host priority remains in effect. This display/filter release changed no votes, metadata, settings or history, and did not sync Spotify or create a batch. [Deployment evidence/handoff](playlist-lab/handoff-2026-10-28-disagreements.md).

## Programme inventories and nine-hour planning

Fresh Spotify readback confirmed the main Grove playlist's unchanged **50 tracks / 3:05:16 raw** and both previous auditions' exact orders. Voting does not synchronize Spotify: **5 main-playlist tracks are now Cuts**, **45 remain Keeps**, and **76 current Keeps are outside it**. The original approved-only snapshot is historical as an approval label; its recording order remains accurate. This turn created auditions only. A future requested approved-only sync must remove current Cuts and add current Keeps. [Main order snapshot](living-room/october-grove-approved-2026-10-26.json).

Grove's current approved average is about **3:19 raw**. At hypothetical 15-second joins, its 121 Keeps leave **6:10:59**; 175 similar-length tracks would yield **8:56:26**, and 180 **9:11:45**. Keep the working target **about 180, 59 more**. This is planning arithmetic, not a Google Home crossfade test.

Hollow's **11:08:48 raw** leaves **8:52:18 before internal cuts** at hypothetical 45-second joins. Its working target remains **about 220, 37 more**, with final chapter lengths deciding readiness. The earlier preparation export remains **161 Keeps / 10:04:05 raw**, zero verified production-file bindings, and was not regenerated. Its legacy `host_vote` field reads canonical `feedback`; refreshed preparation must use current shared approvals.

Both programmes need **at least nine hours after actual cuts, overlaps and rate changes**. Existing [REAPER preparation](bedroom/premix/README.md), [audio intelligence](bedroom/premix/AUDIO-INTELLIGENCE.md), [planner](bedroom/premix/MIX-PLANNER.md) and [phrase/loop/EQ/ducking system](bedroom/premix/TRANSITION-AUTOMATION.md) remain unchanged. Next review the current candidates, separately sync approved playlists when requested, bind permitted exact production files, and prove finished duration/player/device behavior. The November 1 rollback remains part of the event schedule.

No global Like/unlike changes, audio acquisition/upload, new render, purchases or physical playback test. Spotify reports the two auditions public; Cloudflare Access protects the review service and individual votes, not playlist visibility. No published host ports; origin without JWT **401**, wrong Host **403**. These are focused continuity checks, not a new penetration test.
