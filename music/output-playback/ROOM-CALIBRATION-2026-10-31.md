# Room timing correction · October 31, 2026

**Analyzed and applied to the live REAPER party player, then saved stopped/muted.** The host confirmed final speaker placement before recording the raw test. The measured Hisense arrival is **79.14 ms later** than the Audioengines at the selected phone position. The player now delays the Audioengine stereo bus by **79 ms**. The raw calibration tab remains flat and zero-delay.

| Output | Aggregate channels | Added delay | Bus gain | EQ |
|---|---|---:|---:|---|
| Mac headphone/AUX → Audioengine | 1–2 | 79 ms | 0 dB | Flat |
| USB SPDIF Audio → Hisense OPTICAL | 3–4 | 0 ms | 0 dB | Flat |

The four-output **Halloween Stereo** aggregate stays at 48 kHz, with headphone output as clock and optical drift correction enabled. MASTER is saved muted at −12 dB; rate remains 1.0. Open the party tab, unmute MASTER and play to hear the corrected output. Physical volume and soundbar processing should stay at their measurement settings.

## Evidence and EQ decision

The AirDropped QTA contains an ordinary 48 kHz stereo AAC rendition alongside four-channel Apple spatial audio. Analysis used the existing stereo rendition, not a downmix of the spatial stream. Its full 186.28-second timeline was retained. The stronger phone microphone channel was used, and all 13 expected coded timing events were found. The reference fit residual was **0.02 ms**; repeated arrivals varied by at most **1.26 ms** within a channel. No recording clipping was detected. The fitted recording/playback clock difference was 10.78 ppm; this is not a separate measurement of either output interface's clock.

**No EQ cut met the conservative system-specific criteria.** Both systems showed a similar broad low-mid rise in the phone recording. An uncalibrated phone cannot separate shared microphone coloration from a room effect well enough to flatten that rise automatically. Fixed recording gain is unconfirmed, so automatic level matching was also withheld. EQ and output trims are deliberately flat. This does not establish that the room is flat or that further listening-based EQ would be unnecessary.

Native REAPER parameter readback confirmed 79/0 ms and unity buses. The saved RPP contains both hardware mappings and the corrected delay values; the GUI showed the saved party tab stopped with MASTER MUTED. No new music render was made. A post-correction phone recording or listening verdict has not yet been collected; one delay setting is specific to the chosen reference area, not every room position.

## Software and recovery

The analyzer now accepts recordings up to five minutes and explicitly selects a mono/stereo audio stream when spatial companion streams exist. Its earliest-arrival confidence floor now matches the minimum accepted marker confidence, avoiding weak early sidelobes while preserving the tested earlier direct arrival under a stronger reflection. **All 15 regression tests passed**, including a long multi-stream phone export and a weak precursor case. Native FX application was checked separately on the actual player.

[Sanitized numerical results](room-calibration-results-2026-10-31.json) contain no original recording name, source path, audio or location metadata. The recording remains in Downloads; analysis/preset/native receipt and the latest-analysis pointer remain ignored under `.local/`. Use the current preset only on the dedicated party tab via [apply_calibration.lua](apply_calibration.lua), never on the raw calibration project. Applying it again sets the same absolute 79/0 ms correction; do not add another 79 ms on top.

Next: listen to familiar music with both systems, walk to another part of the room, and check pause/resume and extended playback. Any tonal adjustment should be a small listening-based trial. Recheck timing after changing wiring, soundbar mode, AV-sync or speaker positions. [Procedure](CALIBRATION.md) · [Hardware and handoff](handoff-2026-10-31-connected-outputs.md).
