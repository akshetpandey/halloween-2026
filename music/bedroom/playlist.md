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

## Auto DJ direction

The host is willing to change software and use local audio files, and wants code to select next tracks and request earlier exits based on the floor. The [current adaptive Auto DJ plan](adaptive-auto-dj-plan-2026-10-19.md) supersedes the earlier installed-rekordbox-first recommendation for that goal. **Pilot VirtualDJ Pro with a local Python supervisor**, conditional on the actual Mac HTTP extension, deterministic selection and recovery tests. Compare **djay Pro** for simple automatic transition quality; use prepared mixes/chapters as a fallback.

The proposed director combines an approved, file-analyzed pool and tested transitions with helper/optional guest feedback; optional local occupancy/motion sensing remains undecided. Activity is not a validated measure of enjoyment. Native Automix and a custom deck loader must have a single authority, and phrase timing/next-track insertion need proof rather than an assumed API. No software, audio, sensors or playback controls were changed in this research pass.

The [earlier source/routing comparison](auto-dj-research-2026-10-19.md) retains installed-version and streaming constraints. The [new engine/interface comparison](research/auto-dj-products-2026-10-19.md), [control API evidence](research/adaptive-dj-control-interfaces-2026-10-19.md), [crowd-response policy](research/crowd-responsive-dj-2026-10-19.md) and [local-file analysis workflow](research/local-track-analysis-2026-10-19.md) support the current plan. [Adaptive research handoff](handoff-2026-10-19-adaptive-auto-dj.md).

## Next checks

- [ ] Host reviews the new batch; narrow the successful lanes before sourcing more.
- [ ] Prove the VirtualDJ Mac control path and compare djay with a small exact-file crate; choose the engine from that evidence.
- [ ] Choose the permitted audio source for approved recordings and obtain exact versions.
- [ ] Analyze actual files, correct grids, inspect active loops, set mix points and gain, and prepare coherent chapters.
- [ ] Run the short transition/output/recovery test on FLX4 and both powered speakers.
- [ ] Finalize a queue with at least nine hours after cuts/transitions and rehearse it alongside Google Home playback and muted Jellyfin.

The [local V2 tracklist](the-hollow-v2-tracklist.md), [taste check](the-hollow-v2-taste-check.md) and [V2 JSON](the-hollow-v2.json) remain unreviewed archives, not the current live order.
