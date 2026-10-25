# Music curation progress · October 25

Latest snapshot follows the completed living Batch 07 and bedroom Batch 02, plus import of the next 50 per room. Counts come from the authoritative hosted database and fresh SQLite backups; all old votes/notes were preserved. **Each room still needs nine hours after actual edits, transitions and unavailable recordings.** New review candidates do not count as approved music.

| Room | Keeps | Approved raw time | Reviewed | Cuts | Older pending | New pending | Working Keep target | More Keeps needed |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Living · October Grove | 72 | 4:16:02 | 352 | 280 | 39 | 50 | About 170 | About 98 |
| Bedroom · The Hollow | 45 | 3:44:10 | 100 | 55 | 0 | 50 | About 220 | About 175 |

At import, the library contains **591 records: living 441 / bedroom 150**. The living Needs review queue has 89 choices, including 39 older Batch 05 entries; bedroom has 50. Neither queue includes Cuts. Saved global Likes remain distinct from party Keeps.

## Current batches

| Room | Review | Spotify audition | New tracks | Raw time | ReccoBeats | YouTube candidates |
|---|---|---|---:|---:|---:|---:|
| Living | [Batch 08 · Closer to the groove](https://music.hollow-court.com/?room=living-room&batch=08) | [Spotify](https://open.spotify.com/playlist/5RuTtiUr0Gh8MDyaOEqYCh) | 50 | 2:37:36 | 39/50 | 43/50 |
| Bedroom | [Batch 03 · Bounce under pressure](https://music.hollow-court.com/?room=bedroom&batch=hollow-03) | [Spotify](https://open.spotify.com/playlist/7vyjIIQ91hAiJGmfBBfhNF) | 50 | 2:59:19 | 34/50 | 49/50 |

[Living selection guide](living-room/october-grove-batch-08.md) · [Bedroom selection guide](bedroom/the-hollow-batch-03.md) · [Publication/import handoff](handoff-2026-10-25-liked-batches.md).

Private saved-library sourcing supplied 91 of the 100 candidates; nine new bedroom discoveries add acid/producer variety. The complete 2,699-track source export, saved timestamps and per-track source-membership map remain ignored. All 100 are exact Spotify US-playable recordings. Deduplication covers all 491 prior review records, each other and the old 140-track bedroom pool by URI/ISRC and same-artist/base-title checks. No credited artist appears more than twice within either batch; each batch has 50 distinct album IDs.

Both Spotify orders and signed-in hosted pages passed verification. Spotify still reports the auditions as public despite private creation/update requests; Access protects the review pages and votes. No main playlist or Spotify Likes were changed. Catalog descriptors are not actual-file analysis; video candidates are not guaranteed identical versions or embeddable. Missing metrics stay unknown, without extra manual rating work.

## What the completed votes support

Living Batch 07 returned **17 Keep / 33 Cut**, compared with 7/50 kept in Batch 06. Breathe, My Love, Hurting, On My Mind, Forget It, Do It To It, 360, 2 Die 4, Eat Your Man and Fasta support a stronger vocal/bass-hook focus. The new batch uses varied house/club and selected dance-pop candidates from the private source pool. Neither a familiar producer nor a global Like is automatic room approval. The earlier 39 pending choices remain available separately.

Bedroom Batch 02 returned **20 Keep / 30 Cut**: Acid 6/12, Tech house 4/9, Techno 4/11, Trance 3/10 and DnB 3/8 kept. Batch 03 gives acid a modest emphasis: 14 Acid / 12 Techno / 9 Trance / 8 Tech house / 7 DnB. It retains dark, bouncy pressure while varying producers and exact recordings. Both rooms' interpretations are hypotheses: no written reasons accompanied the latest votes.

## Live music and runtime targets

The living main remains the API-verified **48 tracks / 2:57:46**, in its October 11 order; **24 newer Keeps are not yet synced**. The new 50-track auditions are separate. The bedroom approved-file exporter now lists 45 Keeps, but **zero verified production-file bindings**. Catalog tracks, live playlists, acquired exact files and finished mixes are different inventories.

Living Keeps average roughly **3:33 raw**. At this observed length, 165 tracks with hypothetical 15-second joins yield about 9:06; 170 yield about 9:22. Shorter future approvals may need more tracks, so use **about 170** as a working target and measure the real programme. This updates the earlier 160–170 planning range toward its safer end; it is not a Google Home crossfade test.

For bedroom, roughly **2½–3 minutes net** per recording requires 216–180 tracks for nine hours. About 220 Keeps remains a practical working target. The quick demo's 1:38.5 net average should not dictate the long set. Loop-bridge extensions cannot pad the new planner's nine-hour gate. The explicit-offset event window remains 7.5 elapsed hours because of the rollback; nine prepared hours provide reserve without extending the 4 a.m. closing.

## Mix system status

The host liked the original 19:42 real-audio audition. Continue REAPER/Python and preserve host Cuts. [Audio intelligence](bedroom/premix/AUDIO-INTELLIGENCE.md), the [planner](bedroom/premix/MIX-PLANNER.md) and [phrase/loop/EQ/ducking extension](bedroom/premix/TRANSITION-AUTOMATION.md) are now implemented and tested. The latest extension passed 80 tests and native build/readback on procedural sources and six approved engineering sources, with no new audio rendering. This curation turn changed neither that code nor the original sample.

Next acquire/bind approved production versions, complete vocal evidence and unresolved phrase/grid checks, then perform a later sound/peak comparison when rendering resumes. Build coherent chapters, prove nine actual hours and rehearse FLX4/two speakers, separate Google Homes, backups and muted Jellyfin. No physical playback rehearsal, new source audio acquisition, purchase or audio upload happened in this curation turn.
