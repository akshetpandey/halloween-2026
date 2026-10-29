# Mac orchestration • music, Jellyfin, volume
Status: October 29 direct HDMI is unresolved; the host now reports Bluetooth/AUX playback with poor sound; see [current hardware checks](#october-29--ax5125h-hdmi-troubleshooting). REAPER 7.82, approved-crate code and [synthetic native cut/transition/render proof](bedroom/premix/REAPER-PROOF.md) passed. The isolated REAPER task profile has no hardware input/output device; successful combined speaker playback remains unverified.
Owner: host + planning. The earlier Sep 20 first-proof and Oct 18 rehearsal targets passed without a recorded device test. Complete real-file preparation and the nine-hour combined rehearsal before treating the setup as ready.

## Audio topology · hardware confirmed, premixed playback chosen
- **Bedroom:** Mac / finished local premix in a tested player → USB DDJ-FLX4 → both powered speakers, left/right. REAPER + Python is selected for preparation; REAPER is not required for event playback. Current brief spans techno, tech house, DnB, acid and trance; actual player/output routing still needs rehearsal.
- **Living room:** Spotify → two Google Homes on Wi-Fi. Separate house/chill playlist; no DJ mixing required.
- **TV:** Mac-hosted Jellyfin → TV client, visual programme muted. HDMI video from Mac remains a fallback.
- **Soundbar:** Hisense **AX5125H**, exact model confirmed October 29. Earlier host-reported Mac playback is historical; current direct-HDMI tests are silent. Its party role remains unresolved now the Google Homes cover living-room music. Proposed use: TV audio when wanted, otherwise muted during silent visuals.

This supersedes the earlier plan to use the soundbar as the primary living-room music output. No macOS Multi-Output Device or rekordbox PC MASTER OUT is needed for the independent room programmes. The host separately requested a simultaneous FLX4/soundbar mirror test on October 29; that test does not replace the two distinct musical briefs. PC MASTER OUT was observed off; successful mirroring is not yet verified.

## Google Home setup and control
Use a speaker group named **October Grove** for synchronized playback on compatible Google speakers. If both are the same supported model, a stereo pair is also possible; confirm the actual models before choosing. A group favors broad room coverage; a stereo pair favors a defined listening position. [Google speaker groups](https://support.google.com/googlehome/answer/7174267?hl=en) · [Stereo pairing](https://support.google.com/googlehome/answer/7559493?hl=en-SG)

Create the group in Google Home on a phone/tablet. Link the intended Spotify account there and test selecting the group as the playback destination. This group is one living-room programme, distinct from rekordbox’s local files. [Spotify on Google devices](https://support.spotify.com/us/article/spotify-on-google-devices/)

**Mac system volume is not a master for this party.** Google Home playback has its own controls. Google currently documents that device touch controls and ordinary voice-volume commands adjust the individual speaker; phone hardware volume buttons do not adjust the speaker group. Verify both speakers using the Google Home media-session controls. Do not infer a working group fade from a moving laptop slider. [Google controls](https://support.google.com/googlehome/answer/7174267?hl=en)

Use the local rendered set for bedroom rehearsal. Do not rely on starting two unrelated Spotify streams with the same account. Device automation for the Google group is not yet implemented or proven; first establish a reliable manual route, then investigate a supported control interface.

## Soundbar connection — earlier report, current fault
The host previously reported Mac-to-soundbar playback working when selected in macOS Sound settings. That does not establish the current cable/topology works: October 29 direct-HDMI tests below are silent. The exact model and direct wiring are now documented.

Selecting the bar establishes the Mac’s default audio output. The bedroom player must be tested with the DDJ output while Spotify plays independently on the Google Homes. Verify this combined configuration during rehearsal; the host’s successful soundbar playback does not yet confirm simultaneous routing or automatic volume control.

For the planned muted films, leave their audio muted and let the Google Homes provide the living-room music. The bar could handle TV audio when wanted or a local chill backup; its party role remains open. If it is used, prevent Mac notifications from reaching it. Only revisit model/port details if the wiring needs to change or a problem appears.

## October 29 · AX5125H HDMI troubleshooting

Confirmed by the host: Mac HDMI output goes directly to the soundbar's **HDMI IN**; its HDMI OUT is not connected to a TV/monitor. All ordinary app audio is silent on that route. The host selected **HDMI IN** on the bar and confirmed the direct Left-speaker test in Audio MIDI Setup is also silent.

Observed in the native macOS UI: **ITE-FHD (HDMI)** is the selected default output, unmuted; HDMI volume is device-controlled. Its initial format was **8-channel, 24-bit integer, 48 kHz**, with a **5.1.2** speaker layout. Changed only that HDMI device to **2-channel, 16-bit integer, 48 kHz** and verified Left=1 / Right=2. The host still heard no sound. This is a diagnostic baseline, **not a confirmed fix**, and does not prove the original format was unsupported. To undo the format trial, select the original 8-channel/24-bit/48 kHz format and reconfigure the former speaker layout.

Rekordbox was in PERFORMANCE mode, both decks unloaded, and **PC MASTER OUT off**. That can explain missing mirrored rekordbox output, but not the failed direct-device speaker test. No rekordbox audio settings, aggregate devices or application libraries were changed.

The host has no second HDMI cable, so the manufacturer's standard passthrough topology — **Mac → bar HDMI IN → bar HDMI OUT (eARC/ARC) → powered-on TV/monitor** — could not be tested. The host reports this bar worked directly with a TV in eARC mode; that verifies a different input path, not the present Mac-to-HDMI-IN connection. [AX5125H manual, section 5.3](https://files.hisense-usa.com/download/f2564889dd9b4c8b). A downstream-screen test remains useful if a cable becomes available, but the diagram does not prove a TV is universally required for audio-only use.

The host disconnected/reconnected HDMI and removed bar power for 30 seconds; the direct speaker test remained silent. Native UI readback after reconnect showed ITE-FHD selected as the output and stereo 16-bit/48 kHz retained. At that point no AUX cable was available; the later host report below supersedes this availability snapshot.

The same HDMI cable was then tested through the host's existing **USB-C-to-HDMI dongle**, still into bar HDMI IN. ITE-FHD was detected/selected; its observed format was 5-channel/16-bit/48 kHz, reset to the same stereo 16-bit/48 kHz baseline with Left=1/Right=2. **The host also reported this direct speaker test silent.** The dongle did not restore sound. Another interface does not independently test the shared cable or bar input.

**Current conclusion / next route:** stop speculative Mac-format changes. Hisense's manual documents HDMI IN with the complete **source → bar → TV** passthrough topology. It does not document this laptop-only HDMI use, but no explicit universal prohibition was found; the exact failed component remains unproven. The host's online reading suggested a TV requirement, consistent with the documented topology and observed failures, rather than an independently verified manufacturer statement. The [official quick-start guide](https://files.hisense-usa.com/download/f2564889ddedd432) explicitly shows **PC/mobile device → AUX** for direct audio.

### Later October 29 · Bluetooth/AUX play, quality unresolved

The host now reports that **Bluetooth works but sounds bad, with the same problem on AUX**. The description is **thin, muffled or weak bass**. The host has **not tested the bar with the FLX4 speakers muted**, so the connection has not been isolated as the cause. This supersedes the earlier AUX-unavailable/untested snapshot. These are host reports; the agent has not heard or measured the playback, and the Mac's current output selection has not been re-read after these user changes.

Pending first test: turn FLX4 MASTER LEVEL to zero, leave the bar volume unchanged, and listen to a familiar track through the bar alone. If it sounds full alone, investigate timing/acoustic interference between the two systems before buying a new adapter; a digital cable does not ensure alignment through the bar's DSP. If it remains thin alone, check that the wireless subwoofer is powered/paired (steady indicator), then compare MUSIC EQ and surround off as a reference. Subwoofer status and current EQ/surround settings remain unknown. [AX5125H controls/pairing guide](https://files.hisense-usa.com/download/f2564889ddedd432).

Remaining digital connection proposals, **not purchased or tested**:

- **Direct stereo:** Mac USB-C → macOS-compatible USB-to-S/PDIF optical **output/transmitter** adapter → TOSLINK cable → bar OPTICAL. Use two-channel PCM at 48 kHz / 16 or 24 bit within the selected adapter's supported formats. Hisense's input-format table confirms optical LPCM 2ch; it does not carry uncompressed multichannel PCM/TrueHD Atmos. The planned music mix is stereo. [AX5125H format table](https://files.hisense-usa.com/download/f2564889dd9b4c8b) · [Example stereo Mac-compatible transmitter specifications](https://www.cubilux.com/products/usb-spdif-adapter). The example manufacturer's direct store showed sold out at lookup; this is capability evidence, not an available purchase recommendation or delivery promise.
- **TV bridge:** Mac HDMI → TV HDMI input → TV ARC/eARC → bar's HDMI OUT (eARC/ARC). Needs two HDMI cables and suitable TV passthrough settings. The bar's TV/eARC playback was host-reported working, but this complete Mac/TV path has not been tested. The source → bar → TV topology above is another documented option with two cables.
- **Finished-file fallback:** the bar's USB port plays files from storage, rather than functioning as a Mac USB audio input. It could play a tested premix from a FAT32 USB stick, but independent playback would not synchronize it with FLX4 playback. Hisense documents a 32 GB storage limit and codec-specific limits; final-file compatibility would need testing.

Optical avoids Bluetooth encoding and the analog headphone/AUX conversion path; it does not promise a cure for weak bass, an unpaired subwoofer, unsuitable processing or acoustic cancellation. Preserve the distinct room briefs while evaluating mirror playback. Once basic sound quality is established, verify rekordbox PC MASTER OUT with **DDJ-FLX4 MASTER + the selected Mac output**, retain FLX4 PHONES for cueing, and check both physical outputs and latency at low level. [Mac output setup](https://support.apple.com/guide/audio-midi-setup/set-up-audio-devices-ams59f301fda/mac) · [Current handoff](handoff-2026-10-29-flx4-hdmi.md).

## Volume and automation boundaries
The DDJ/amp route and Google Home route each need their own tested lowering/stop control. If the bar is used, include it as a third control path. A macOS volume command may not attenuate a directly addressed DJ device or HDMI output.

First prove bedroom gain control with a quiet local file through the FLX4 in the chosen player. Check the real speakers, after app restart and output reconnect. The finished file contains the transitions; live deck control is unnecessary. Any schedule/stop integration still needs a verified player interface and real output test. Avoid screen-coordinate automation as the primary all-night controller.

The host chose a [premixed set](bedroom/premixed-set-plan-2026-10-19.md) after clarifying there will be no human feedback during the event. Adaptive selection is deferred; no camera or live director is a dependency. REAPER's isolated preparation/render path is now proved on synthetic files, with no license purchased or physical playback test. Keep preparation/runtime media local and leave the protected public Playlist Lab route for curation.

**Manual “quiet now” fallback:** helper lowers/stops bedroom at the DDJ, stops the October Grove media session and confirms both Google speakers are quiet, then mutes the bar if active. Future software must report success separately for each route. A partial success must not display “all quiet.”

## First connection test
- [ ] Restore and verify current Mac-to-soundbar playback; the earlier success report is superseded by the October 29 failed direct-HDMI test above.
- [ ] Record both Google models, powered speaker models, TV model/Jellyfin client and app versions. Record bar ports only if changing the working connection or troubleshooting.
- [ ] Create Google group/pair on the phone; test Spotify account and both devices.
- [ ] Verify bedroom alone, living room alone, then both at low volume.
- [ ] Test at the doorway; place speakers inward so the two rhythms do not dominate the same listening spot.
- [ ] Verify silent TV loop while both room programmes continue.
- [ ] Verify pause/lower/stop for each route and the combined manual fallback.
- [ ] Run 30 minutes, then a full overnight-length rehearsal after programming is settled.
- [ ] Test Wi-Fi interruption and recovery; have a permitted local chill backup and a tested wired route ready if needed.

## Schedule specification
Proposed public start: 21:30 EDT October 31. End: 04:00 EST November 1.
Store explicit ISO timestamps with offsets, convert to UTC, and give every cue a unique ID.

| Cue | Local timestamp | UTC | Proposed action |
|---|---|---|---|
| doors | 2026-10-31T21:30:00-04:00 | Nov 1 01:30Z | Warm-up / visuals |
| build | 2026-10-31T22:30:00-04:00 | Nov 1 02:30Z | Build block |
| lift | 2026-10-31T23:30:00-04:00 | Nov 1 03:30Z | Driving block |
| peak | 2026-11-01T00:30:00-04:00 | Nov 1 04:30Z | Peak selection, no automatic volume rise |
| release | 2026-11-01T01:15:00-04:00 | Nov 1 05:15Z | Release; relative gain ceiling −3 dB |
| after_clock_change | 2026-11-01T01:00:00-05:00 | Nov 1 06:00Z | Deeper block; ceiling −6 dB |
| late | 2026-11-01T02:00:00-05:00 | Nov 1 07:00Z | Softer block; ceiling −9 dB |
| close_soft | 2026-11-01T03:00:00-05:00 | Nov 1 08:00Z | Final block; ceiling −12 dB |
| stop | 2026-11-01T04:00:00-05:00 | Nov 1 09:00Z | Fade then stop |

Relative dB figures are starting design values below a manually verified maximum, not room SPL or a legal/safe exposure guarantee. Tune in the room. Cues must never undo a manual reduction: after the peak, the permitted ceiling only decreases. Fade gradually rather than jumping.

## Controller behaviour to build
- Dry-run mode is the default until tested.
- Preview next cue, current block and commanded ceiling in one simple display.
- “Quiet now,” “Pause automation” and “Stop music” are separate visible controls.
- Persist executed cue IDs so a restart cannot repeat the peak.
- At launch/restart compute the current phase; do not replay all missed cues.
- A manual lowering of volume wins over later scheduled values.
- No automatic output-device switching or restoring louder levels after a disconnect.
- If control cannot be verified, alert the host/helper and hold the last safe state; attempt a tested mute/stop path if playback state is uncertain.
- Keep credentials in local protected configuration, not in the notes or guest files.
- Keep the controller local; no need to expose Jellyfin or music controls to the internet.
- Record simple timestamps and outcomes for debugging, not guest personal data.

## Jellyfin integration
Use a dedicated playlist and target the identified TV session only. Jellyfin publishes a session API, but remote commands depend on client capability and authorized session control. [SDK](https://typescript-sdk.jellyfin.org/classes/generated-client.SessionApi.html) · [User controls](https://jellyfin.org/docs/general/server/users/adding-managing-users/)

Read supported commands and actual session identity before sending play/repeat/mute commands. Do not assume every TV client accepts repeat. A server cannot always force a sleeping television to wake and play.

Avoid live transcoding if direct play works; the same Mac is running audio. [Jellyfin documentation](https://jellyfin.org/docs/general/post-install/transcoding/)

## Build phases
**Phase A:** inventory versions, outputs, TV client and permissions; 10–12-track premix proof, short render/player test and two video files.

**Phase B:** implement a tiny schedule simulator with fake clock and no device actions.  
**Phase C:** implement verified, separate bedroom and Google Home control adapters, plus Jellyfin-session control; retain manual Google controls if reliable automation is not available.  
**Phase D:** test missed cues, restart, manual lowering, disconnected controller, TV failure and daylight-saving rollback.  
**Phase E:** at least nine elapsed hours of continuous playback in each room after real transitions/cuts; keep additional reserve where practical. This supersedes the earlier 7.5-hour-plus-reserve music target and does not change the event end time.

## Completion gates
- [ ] Bedroom and Google Home group play different music simultaneously.
- [ ] TV stays muted and loops without intervention.
- [ ] Gain changes audibly affect the bedroom speakers; Google Home lowering/stop is separately verified.
- [ ] Lowering manually is never reversed automatically.
- [ ] Repeated 1 a.m. hour executes no duplicate cues.
- [ ] Output disconnect cannot produce an unexpected loud fallback.
- [ ] Mac stays awake and cool; notifications do not interrupt the party.
- [ ] One helper can operate the manual fallback in under a minute.
- [ ] No last-minute software updates after the final rehearsal.

