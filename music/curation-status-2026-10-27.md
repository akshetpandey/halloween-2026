# Music curation progress · October 27

**Historical snapshot, superseded by the [October 28 shared-vote status](curation-status-2026-10-28.md).**

Latest verified snapshot: **October 27, 2026, 9:58 p.m. EDT (America/New_York)**; votes may advance. The host finished Grove 14 and is **still working on Hollow 09**. This continuation adds a Grove batch only; the [earlier two-room round](handoff-2026-10-27-room-batches-14-09.md) remains historical evidence.

| Room | Approved Keeps | Raw approved duration | Rated | Cuts | Maybe | Unrated | Working Keep target | More Keeps needed |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| October Grove · living | 109 | 6:07:52 | 743 | 634 | 0 | 50 new | About 175 | About 66 |
| The Hollow · bedroom, review in progress | 165 | 10:16:31 | 406 | 241 | 0 | 44 remaining | About 220 | About 55 |

Hosted library: **1,243 records: Grove 793 / Hollow 450**. All 743 earlier Grove choices are rated; Grove Needs review contains exactly its new 50, with zero Cuts. Hollow's 44 pending records remain in its existing Batch 09. Its partial result is **4 Keep / 2 Cut / 44 unrated**, not a completed-batch conclusion. No new Hollow batch or vote reset. A global Spotify Like is separate from a party Keep.

| Room | Current review | Spotify audition | Batch size | Raw duration | ReccoBeats | YouTube candidates | Nonempty artist genres |
|---|---|---|---:|---:|---:|---:|---:|
| Grove | [Batch 15 · Vocal sparks](https://music.hollow-court.com/?room=living-room&batch=15) | [Spotify](https://open.spotify.com/playlist/3OBKlvcJIBzPFEbb0l8LCv) | 50 | 2:28:20 | 38/50 | 40/50 | 17/50 |
| Hollow, unchanged | [Batch 09 · Saved for the rave](https://music.hollow-court.com/?room=bedroom&batch=hollow-09) | [Spotify](https://open.spotify.com/playlist/1EyAwESDQVVc9gq85MYqVS) | 50 | 2:36:32 | 29/50 | 43/50 | 50/50 |

[Grove guide/data](living-room/october-grove-batch-15.md) · [Hollow guide/data](bedroom/the-hollow-batch-09.md) · [Current handoff](living-room/handoff-2026-10-27-batch-15.md) · [Sanitized verification](living-room/batch-publication-verification-2026-10-27-batch-15.json).

## Source policy and Grove feedback

**Host correction October 27: “please go back to songs in my already liked list, these are losing touch.”** The new Grove 15 is entirely from a fresh 54-page Liked Songs read: 2,699 source entries, collapsing nine market-relinked duplicate URIs to **2,690 canonical recordings**. First-page identities and reported total were rechecked stable. Original `linked_from` identities were retained in that same pass; all 50 selected saved identities and exact US metadata/playability were checked before publication. Selected market relinks: **5**. No global Like/unlike action; source exports, per-track membership/save timestamps and OAuth data remain private/ignored. Hollow 09's saved-source gate remains the earlier round's verified evidence.

Future batches start with current Liked Songs, then apply room fit, party votes, duplicate exclusions and artist/album caps. Report a source shortfall rather than silently switching to similar-artist discovery. A source Like never overrides the room brief or grants party approval.

**Grove 14: 11 Keep / 39 Cut.** Keeps: Serotonin Moonbeams, places to be, DNCR, W.I.T.C.H., Skip A Few Steps, Radio Baby, ALL NIGHT, Hooked, Friday Night Big Screen, These Words and Heartbeat. Vocal personality retained **4/15**, melodic house/garage **5/15**, melodic/indie contrasts **2/9**, rhythmic club hooks **0/6**, percussive/melodic contrasts **0/5**. Favor clear vocal hooks and melodic bounce; reduce minimal/percussion-only tests. No written reasons or artist-wide approval inferred.

Grove 15 allocation: **12 vocal house/garage / 12 playful vocal personalities / 13 melodic dance hooks / 8 percussive vocal bounce / 5 band contrasts**. Retain the exact Now U Do / Makeba / Joy / Kisses anchors, individual Float On/Bruises approvals, happy/hopeful/loving/upbeat/sexy brief and no acid/techno. The small band group is a limited comparison, not a broad retro/indie sweep. Several obvious radio-pop candidates were removed from the draft; remaining familiar crossovers have explicit chart-pop audition risks, not artist-wide exemptions.

All 50 exact Spotify IDs/order were read back. Exclusions cover all **1,193 existing records**, including pending Hollow choices, and the old 140-track bedroom pool by URI/ISRC/same-artist base-title checks. Maximum two appearances per credited artist and per album; 50 choices cover **64 credited artists / 49 album IDs**. No standalone intro/interlude/outro/live/promo recordings. These checks cannot prove composition-wide uniqueness or hear internal dead space.

New Grove metadata: **38/50 ReccoBeats, 40/50 video candidates, 17/50 nonempty artist genres**, with all artist lookups completed using dated API evidence. Missing fields stay unknown. Lyric notes contain **28 positive/celebratory source interpretations, four explicitly mixed and 18 unknown exact-edit contexts**. Mixed notes flag heartbreak/fear in Let Me Love You, dangerous attraction in Mess Around, long-distance uncertainty in Stateside and restraint/threat ambiguity in I Like You Best. Sourcing excluded several negative-relationship alternatives; those editorial exclusions are not host downvotes. Community texts are not exact-file transcription or complete listening proof. Adult themes and references to earlier difficulty require context; catalog valence is not lyric sentiment. No manual six-metric entry is needed.

YouTube title/channel/duration/edit matches are candidates, not acoustic identity, guaranteed full playback or embedding proof; Spotify fallback remains. Both current auditions report public despite private requests. Cloudflare Access protects the review service and votes; full source exports, complete lyric texts and feedback backups remain private.

## Import and service verification

The new **atomic append utility** was copied into the running lab container. An online backup preceded a short SQLite transaction; all 1,193 old serialized tracks and all existing votes, notes, reviewer scores and snapshots were checked unchanged inside that transaction. Old events remain an unchanged prefix, with one new batch-import event. All 50 new records matched the seed and were unrated. Integrity passed. Legitimate votes may advance before or after the transaction; preservation does not freeze a reviewer’s later work.

**Neither lab nor Tunnel restarted:** container IDs and start times unchanged. This avoids rotating the server's CSRF token while the host reviews Hollow. No navigation/reload of the Hollow tab, test votes, playback, application/authentication/Access/Compose/permission changes or Hollow production export. [Live-import procedure and limits](playlist-lab/HOSTING.md#append-a-new-batch-without-interrupting-review).

Seven importer tests and five batch/filter tests passed, plus fresh 1,243-row room/latest-batch/order/Needs-review checks. Signed-in Chrome verified Grove 15 counts, filter, detail/controls and exact audition link, with 50 unrated and zero Cuts in Needs review. Both current Spotify orders were rechecked; main and Hollow 09 orders unchanged. Both services have no published host ports; no-JWT origin **401**, wrong Host **403**. This is focused verification, not a new penetration test, rejected-identity test or provider playback test.

## Live programmes and nine-hour targets

Living main remains **50 current Keeps / 3:05:16 raw**, original 48 followed by Float On and Bruises; **59 newer Keeps remain unsynced**. No main sync was requested. API order/approval membership were checked by canonical Spotify URI because older records use legacy IDs. [Main snapshot and additions](living-room/handoff-2026-10-26-bruises.md).

Hollow's current approved library snapshot is **165 Keeps / 10:16:31 raw** while voting continues. The prior read-only production preparation export remains **161 Keeps / 10:04:05 raw**, with **zero verified production-file bindings**; this Grove-only turn did not regenerate it. Approvals, Spotify collections, acquired exact files and finished mixes are separate inventories.

Grove's working target remains **about 175 Keeps, 66 more**. At the current approved average of about **3:22 raw**, 170 with hypothetical 15-second joins yields **8:51:29**, and 175 yields **9:07:06**. Shorter approvals, longer overlaps or unavailable files can raise the requirement. These are planning assumptions, not a Google Home crossfade test.

Hollow's target remains **about 220 Keeps, 55 more at this partial-review snapshot**, assuming roughly 2½–3 minutes net per track. Raw 10:16 does not prove nine hours after production cuts: 45 seconds per join leaves **8:13:31 before internal cuts**. The short demo's 1:38.5 average is not the production target. Loop bridges cannot pad the duration gate.

Both programmes need **at least nine hours after actual cuts, transitions and rate changes**. The proposed `2026-10-31T21:30:00-04:00` through `2026-11-01T04:00:00-05:00` event lasts 7.5 elapsed hours after the rollback; reserve does not move closing.

## Mix system

The host-liked 19:42 audition, [audio intelligence](bedroom/premix/AUDIO-INTELLIGENCE.md), [planner](bedroom/premix/MIX-PLANNER.md) and [phrase/loop/EQ/ducking extension](bedroom/premix/TRANSITION-AUTOMATION.md) are unchanged. This turn acquired/uploaded no audio, rendered no mix, made no purchase and tested no physical output. Next acquire/bind permitted exact approved production files, finish vocal/phrase/grid evidence, build coherent chapters, audition every splice/transition and complete nine-hour/player/device checks.
