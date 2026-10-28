# Music curation progress · October 28

Verified snapshot: **October 28, 2026, 3:16 p.m. EDT (America/New_York)**. Live votes may advance. Supersedes the [October 27 snapshot](curation-status-2026-10-27.md).

| Room | Shared Keeps | Raw approved duration | Shared Cuts | Maybe | Unrated | Working Keep target | More Keeps needed |
|---|---:|---:|---:|---:|---:|---:|---:|
| October Grove | 132 | 7:17:04 | 658 | 0 | 3 | About 180 | About 48 |
| The Hollow | 168 | 10:23:51 | 246 | 0 | 36 | About 220 | About 52 |

Library: **1,243 records, Grove 793 / Hollow 450**. Current auditions remain [Grove 15](https://music.hollow-court.com/?room=living-room&batch=15) and [Hollow 09](https://music.hollow-court.com/?room=bedroom&batch=hollow-09); no new batch this turn. Grove 15 now has **23 shared Keeps / 24 shared Cuts / three unrated**. Hollow 09's partial result is **7 Keep / 7 Cut / 36 unrated**; voting continues. Needs review uses the shared outcome and excludes shared Keeps/Cuts.

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

## Deployment and verification

The updated Docker lab image is deployed. Only lab was recreated; the Tunnel's container identity/start time, pinned cloudflared 2026.10.4, Compose configuration, Access policies, DNS, routes and permissions stayed unchanged. A fresh stopped SQLite backup preceded the atomic/idempotent startup migration. **Reload pre-update pages once** for the new controls/save protocol; the restart rotates the CSRF token. Old save clients fail with a reload instruction rather than accidentally adopting a shared vote. Use **Refresh votes** to load others' latest choices; there is no continuous polling.

Readback verified all old track records, guest feedback, reviewer scores, snapshots and prior events unchanged; original host rows preserved in `host_feedback`, every rated host decision unchanged in canonical `feedback`, one new migration event and integrity OK. A real-data-clone migration and failure/rollback/idempotence tests passed. All **59 Python tests passed inside Docker**, including signed JWT checks and fake-identity hosted HTTP integration; **nine Node tests** passed for shared filters, authoritative save responses, note-only saves and failure preservation. Full inline script syntax passed.

Signed-in host Chrome showed **132 Grove Keeps / three remaining**, Grove 15's 23/24/3 result, a reviewer-sourced Keep with the host personally unrated, empty personal note, correct Reset mine state, Refresh votes, and **168 Hollow Keeps / 36 remaining**. No production test votes, notes or playback. The private snapshot also verified equal resolved votes for host and existing-reviewer Store views; a separate live friend login was not tested. No published host ports; no-JWT origin **401**, wrong Host **403**. Focused verification, not a new penetration or denied-identity test.

[Implementation/runbook](playlist-lab/README.md#shared-votes-and-host-priority) · [Sanitized evidence](playlist-lab/shared-votes-verification-2026-10-28.json) · [Deployment and rollback handoff](playlist-lab/handoff-2026-10-28-shared-votes.md).

## Programme inventories and nine-hour planning

No Spotify API calls, playlist synchronization, new candidates, audio acquisition/upload, render, purchase or physical playback test this turn. The last main-playlist readback on October 27 was **50 Keeps / 3:05:16 raw**, original 48 plus Float On/Bruises. Shared voting does not automatically append new approvals. **82 current shared Keeps lie outside that last verified 50-track snapshot**; this is not a fresh Spotify readback. [Main snapshot](living-room/october-grove-approved-2026-10-26.json).

Grove's shorter new approvals lower the average to about **3:19 raw**. At hypothetical 15-second joins, 175 similar-length tracks give **8:55:56**; 180 give **9:11:15**. The working target therefore moves from about 175 to **about 180 Keeps, 48 more** for a modest planning buffer. Actual joins, availability and lengths can change this requirement; no Google Home crossfade test is claimed.

Hollow's working target remains **about 220 Keeps, 52 more**, assuming roughly 2½–3 minutes net per recording. Its 10:23:51 raw leaves **8:18:36 before internal cuts** at hypothetical 45-second joins. The earlier preparation export remains **161 Keeps / 10:04:05 raw**, zero verified production-file bindings; it was not regenerated. Its legacy `host_vote` field reads canonical `feedback` and will include shared approvals on the next export. Approvals, exact acquired files and finished mixes remain separate inventories.

Both programmes still require **at least nine hours after real cuts, overlaps and rate changes**. Existing [REAPER preparation](bedroom/premix/README.md), [audio intelligence](bedroom/premix/AUDIO-INTELLIGENCE.md), [planner](bedroom/premix/MIX-PLANNER.md) and [phrase/loop/EQ/ducking system](bedroom/premix/TRANSITION-AUTOMATION.md) are unchanged. Next finish current shared reviews, source from the current saved pool with shared feedback, separately synchronize approved playlists when requested, bind permitted production files and prove final duration/player/device behavior. The November 1 rollback remains part of the event schedule.
