# The Hollow · bedroom rave programme

Updated October 19, 2026. **The old 140-track album pool has been replaced in Spotify with [Batch 01 · Rave spectrum](https://open.spotify.com/playlist/6Vrg6foyDHd14liJImsTSB): 50 candidates for review.** The API readback verified every URI in the intended order. This is an audition, not an approved party sequence. The old pool is backed up privately, and the [V1](research/bedroom-plan-v1-before-feedback.md) and [V2 preparation](research/bedroom-plan-v2-before-2026-10-19.md) remain historical evidence.

[Review guide and exact tracks](the-hollow-batch-01.md) · [Portable batch data](the-hollow-batch-01.json) · [Auto DJ research and tests](auto-dj-research-2026-10-19.md) · [Combined handoff](../handoff-2026-10-19-batches-and-auto-dj.md)

## Current host brief

**Techno, tech house, DnB, acid and trance: high energy, bouncy, dark underground rave vibes**, drawing on established producers and DJs. The October 19 correction replaces the old narrow techno-only direction and album-block approach. The living room has its own selection brief and approved playlist.

Select individual tracks with strong groove, development and variety. Standalone intros, interludes and outros do not belong in the set. Club mixes can have useful drum passages for transitions, but long empty lead-ins, repetitive motifs and energy-killing breakdowns still need cuts or rejection. Keep artist/album concentration low and count collaborations and aliases.

Batch 01 tests ten tracks per lane, with 50 distinct leads, 68 credited artists and a maximum of two appearances for any credited artist. It shares no recording URI/ISRC with the old bedroom pool, the prior living-room library or new living-room Batch 06. Four compositions from the unreviewed V2 serve as explicit calibration anchors. The old V1 collection was rejected as a whole; this does not invent individual downvotes for every old recording.

## Listen, vote, then sequence

The first review batch alternates genres so the host can compare them. **Do not feed this interleaved audition order to Auto DJ.** Use Keep / Cut / Maybe in Playlist Lab. A bedroom selector separates these decisions from October Grove; later batches remain separate and earlier decisions persist. A Keep is approval of that recording, not proof of a DJ-ready local file or a tested transition.

After feedback, source the next batch in the successful lanes and reduce bright/commercial, harsh or repetitive probes according to actual votes. Build the party queue from approved selections in coherent chapters; keep DnB in deliberate blocks with rehearsed entries and exits. ReccoBeats catalog BPM/key support sorting, while actual-file analysis, grid checking and listening determine DJ readiness.

## Runtime and readiness

The 50 candidates total **4:04:25 raw**. Hypothetical 45-second joins leave about **3:27:40**; 60-second joins leave **3:15:25**. Those are arithmetic scenarios, not measured mixing. Neither this batch nor the unreviewed 124-track V2 constitutes an approved nine-hour programme.

The final prepared collection must supply **at least nine hours after real cuts, transitions and playback-rate changes**. Maintain reserve without moving the 4 a.m. closing. The proposed 9:30 p.m. EDT October 31 to 4 a.m. EST November 1 event is 7.5 elapsed hours because the clock rolls back; use the explicit-offset timeline in [Mac orchestration](../mac-orchestration.md).

## Premixed set direction

The host chose a **premixed bedroom set** after clarifying there will be no human feedback during the event and only a possible phone camera. The [premixed set plan](premixed-set-plan-2026-10-19.md) is current; the [adaptive Auto DJ proposal](adaptive-auto-dj-plan-2026-10-19.md) is deferred. Use **REAPER + Python** for repeatable scripted preparation, with open-source analysis/delivery tools. Start with REAPER's full 60-day evaluation before spending. The agent owns sequencing, cuts, transitions and gains; no per-edit host decision queue. No purchase, installation or actual mix has been performed.

The [preparation tool](premix/README.md) exports host bedroom Keeps to JSON/CSV and a verified-file M3U8, read-only. The current database has 50 unrated bedroom candidates and no bedroom Keeps. File analysis, the Lua project builder, musical sequencing and rendering remain next stages. Shorten repetitive sections on verified phrase boundaries and keep the best hooks/builds/drops. The agent handles checking/revising cuts and joins, without treating unrated tracks as approved. DJ.Studio at the host's quoted $20/month remains a fallback if the REAPER proof fails.

The [earlier source/routing comparison](auto-dj-research-2026-10-19.md), [engine/interface comparison](research/auto-dj-products-2026-10-19.md), [control API evidence](research/adaptive-dj-control-interfaces-2026-10-19.md) and [crowd-response research](research/crowd-responsive-dj-2026-10-19.md) remain historical research. The [local-file analysis workflow](research/local-track-analysis-2026-10-19.md) still informs preparation. [Current handoff](handoff-2026-10-19-premixed-set.md).

## Next checks

- [ ] Host reviews the new batch; narrow the successful lanes before sourcing more.
- [ ] Prove the REAPER evaluation's script/save/render path with synthetic audio, then build a 10–12-approved-file chapter with two repetition cuts and a DnB boundary; agent handles small decisions.
- [ ] Choose the permitted audio source for approved recordings and obtain exact versions.
- [ ] Analyze actual files, correct grids, inspect active loops, set mix points and gain, and prepare coherent chapters.
- [ ] Run the short transition/output/recovery test on FLX4 and both powered speakers.
- [ ] Render chapters and a continuous master with at least nine hours after cuts/transitions, index event closing/reserve, and rehearse alongside Google Home playback and muted Jellyfin.

The [local V2 tracklist](the-hollow-v2-tracklist.md), [taste check](the-hollow-v2-taste-check.md) and [V2 JSON](the-hollow-v2.json) remain unreviewed archives, not the current live order.
