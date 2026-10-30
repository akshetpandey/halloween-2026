# The Hollow · final set

**Rendered October 30, 2026. Offline delivery complete.** The full prepared programme is **9:10:32**, using **201 distinct approved recordings**. Conservative original-audio coverage is **9:04:22**, excluding fades and all derived loops/effects. [Verification](final-2026-10-30/verification.json) · [Source/edit decisions](final-2026-10-30/track-decisions.json) · [Final handoff](../handoff-2026-10-30-final-delivery.md).

## Play this

| File | Duration | Use |
|---|---:|---|
| [The-Hollow-party.mp3](.local/final-hollow-2026-10-29/revision-11/final-render/delivery/The-Hollow-party.mp3) | **7:35:30** | Normal party playback; 167 tracks, hard finale, intentional ending |
| [The-Hollow-reserve.mp3](.local/final-hollow-2026-10-29/revision-11/final-render/delivery/The-Hollow-reserve.mp3) | **1:35:02** | Optional separate programme; 34 additional tracks |
| [The-Hollow-preview.mp3](.local/final-hollow-2026-10-29/revision-11/final-render/delivery/The-Hollow-preview.mp3) | **5:00** | Excerpt from the finished set around an isolated hook feature |
| [The-Hollow-continuous.flac](.local/final-hollow-2026-10-29/revision-11/final-render/delivery/The-Hollow-continuous.flac) | **9:10:32** | Full lossless rendered archive, including reserve |
| [The-Hollow-continuous.mp3](.local/final-hollow-2026-10-29/revision-11/final-render/delivery/The-Hollow-continuous.mp3) | **9:10:32** | Full 320 kbps backup, including reserve |

[Playback guide](.local/final-hollow-2026-10-29/revision-11/final-render/delivery/PLAYBACK.md) · [Default single-file M3U8](.local/final-hollow-2026-10-29/revision-11/final-render/delivery/The-Hollow-play.m3u8) · [Timestamped tracklist](final-2026-10-30/tracklist.md) · [Editable REAPER master](.local/final-hollow-2026-10-29/revision-11/phase-revised/phase-revised.rpp).

Play the party file once at **original speed (1.0x)** through the audio-output router. **Rekordbox and the FLX4 are optional.** The [audio-output plan](../../mac-orchestration.md#fine-output-tuning--proposed-refinement) owns the actual device routing: a playback-only REAPER project can feed separate USB-speaker and stereo-optical buses; the [encoded optical 5.1 investigation](../../optical-5-1-pipeline-2026-10-29.md) requires an additional AC-3/passthrough backend and coordinated PCM/bitstream transport. Hardware mapping, synchronization and calibration remain untested.

Keep shuffle, repeat, Auto DJ/Automix, automatic normalization and extra DJ transition effects off. Output-specific EQ, gain and alignment delay belong downstream and should be calibrated separately from the baked mix EQ. The default M3U8 contains only the party file; reserve does not follow automatically. For lossless DSP/upmix work, use the full FLAC and constrain party playback to **0–27330.109531 seconds**; reserve starts there. No musical re-render is needed. If rekordbox is used as an optional player, use one deck at 0% pitch with beat/key Sync off. Ten numbered MP3s remain hourly recovery backups.

For a **November 1, 4:00 a.m. EST** finish, start manually on **October 31 at 9:24:30 p.m. EDT** (`2026-10-31T21:24:30-04:00` → `2026-11-01T04:00:00-05:00`, America/New_York; start rounded to the nearest second). This includes the rollback. No scheduler or physical speaker routing was installed by this task.

## Programme and transitions

The [compiled event arc](SET-THESIS.md#compiled-event-arc--october-30) keeps sustained hard rave runs, six roughly 11–20-minute resets, a grouped fast rave/DnB feature and a strong final 31 minutes. The reserve is prepared separately from that closing.

Most joins use phrase-timed own-drum support and a single musical lead. The full programme has **21 occasional creative features**: six tightening rolls/filter drops, five echo releases, seven call-and-response fills and three isolated hook teases. Eighteen are in the party programme; three are in reserve. Fifteen explicit percussion-only tempo ramps handle larger changes. Original musical bodies retain pitch with rates within ±3 percent. Local key disagreements are handled through lead ownership rather than forced transposition or overlapping melodies.

Empty entries and source intros/outros were trimmed. The No Limit entry advances eight complete bars to its sustained drop. Small source/loop cue adjustments were re-rendered and checked. Interior repetition-splice count is zero; this build preserves coherent retained track bodies and does not claim speculative interior cuts.

## Checks actually passed

- **150 Python tests**; canonical shared Keep/source/hash validation; 201 unique recording IDs and distinct analyzed source PCM.
- **199 native musical joins** passed realized-audio timing checks: common-phase jitter p95 ≤25 ms, interdeck and original-handover phase differences ≤15 ms. Ambiguous full-mix attacks were checked using independent per-deck drum separation or own-recording templates. No synthetic click diagnostic substitutes for those actual recordings.
- Complete REAPER 7.82 master build/readback: **638 tracks, 1,088 items, 1,806 EQ bands and 1,875 volume points**. Pitch preservation, explicit percussion stretch mode, automation, repeat-off and clear global override were checked. The master references retained permanent local sources; disposable chapter staging files were released.
- Ten 24-bit/48 kHz stereo native chapters passed duration, headroom and silence checks. All nine seams pass; eight are PCM-exact and the maximum remaining rounding difference is **3.5763 × 10⁻⁷**, about **−129 dBFS**. Every compressed native archive was checked for PCM identity before assembly.
- Continuous assembly has **1,585,560,154 frames**, with no unexplained silence. The 2.13-second quiet at the party ending is tied to its actual eight-second source-volume fade and declared boundary; interior-gap rules remain strict.
- Full FLAC, full MP3 and party MP3 measure **−18.5 LUFS / −2.1 dBTP**. MP3s are 320 kbps stereo at 48 kHz. One constant +1.5 dB delivery gain preserves the programmed relative levels. The five-minute preview measures −18.5 LUFS / −5.4 dBTP. See the verification JSON for complete measurements and file hashes.

These are offline engineering checks. The host approved the clean 1:43 technique and the creative 90-second example; the entire nine-hour programme has not had a human listening pass. Physical playback remains the separate audio-output task. Actual rekordbox settings were not changed.

## Sources and saved state

The canonical library has 222 shared Keeps. 216 public artist/label/distributor recordings were acquired and analyzed; this build uses 201. Six were unmatched, eight retained unstable full-file clocks, six lacked resolved final drum cues and one lacked a supported rhythmic entry. Exclusion from the mix does not change any vote or Spotify playlist.

Sources are compressed public-stream copies with metadata/version corroboration and bound hashes, **not purchased masters or an acoustic identity/license certification**. Spotify offline caches, cookies and DRM extraction were not used. Source URLs, analyzed tempos/keys, retained ranges and transition evidence are in the public decisions file. Audio, models, source bindings and private runtime data remain ignored under `.local/`; no music is committed to the public repository.

The frozen plan is `.local/final-hollow-2026-10-29/revision-11/full-plan-01/mix-plan.json`; render, assembly and delivery receipts are under `revision-11/final-render/`. Do not mutate that plan to mark it rendered: the separate delivery receipt supplies the final hash-bound outcome. Native scratch archives were released after verified streaming. An interrupted encoding retry uses `render_set.py --deliver` with the same plan/output; a full new render uses a fresh output folder.

The rejected version 5 is historical and must not be used as the party master. [Research and corrected rules](TRANSITION-RESEARCH.md) · [Approved creative technique](PERFORMANCE-EDITS.md).
