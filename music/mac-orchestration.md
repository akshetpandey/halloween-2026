# Mac orchestration • music, Jellyfin, volume
Status: **October 31: the [stereo AUX/optical player works on both physical systems](output-playback/README.md#current-connected-setup--october-31), confirmed by the host, and [measured room timing is now applied](output-playback/ROOM-CALIBRATION-2026-10-31.md).** Audioengine direct USB is not detected, so the working route uses the Mac headphone jack. The four-channel Halloween Stereo aggregate feeds REAPER's independent EQ/delay buses. The corrected party project is saved stopped/muted; EQ and trims remain flat. Post-correction listening and extended playback remain. Encoded 5.1 is deferred. The separate premix preparation profile remains unchanged, with no hardware I/O.
Owner: host + planning. The earlier Sep 20 first-proof and Oct 18 rehearsal targets passed without a recorded device test. Complete real-file preparation and the nine-hour combined rehearsal before treating the setup as ready.

## Audio topology · hardware confirmed, premixed playback chosen
- **Bedroom current wired route:** REAPER → Halloween Stereo Aggregate Device → Mac headphone/AUX to Audioengine + USB/optical to Hisense. Both played separately and together in the October 31 test; measured timing is applied, with listening and extended playback remaining. Earlier Mac → USB DDJ-FLX4 → Audioengine analog remains the fallback.
- **Living room:** Spotify → two Google Homes on Wi-Fi. Separate house/chill playlist; no DJ mixing required.
- **TV:** Mac-hosted Jellyfin → TV client, visual programme muted. HDMI video from Mac remains a fallback.
- **Soundbar:** Hisense **AX5125H**, exact model confirmed October 29; optical stereo now mirrors the bedroom set through the dedicated REAPER bus. Direct-HDMI tests were silent and are no longer the selected route. Its internal surround/sub/height distribution stays under the bar's controls.

This supersedes the earlier plan to use the soundbar as the primary living-room music output. No macOS Multi-Output Device or rekordbox PC MASTER OUT is needed for the independent room programmes. The host separately requested combined Audioengine/soundbar output on October 29; this routing work does not replace the two distinct musical briefs. PC MASTER OUT was most recently observed on, with decks unloaded; successful mirroring is not yet verified. It is unnecessary for the proposed direct REAPER playback route.

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

### Proposed USB-speaker / optical mirror · October 29

**Historical connection proposal.** The October 31 [connected setup](output-playback/README.md#current-connected-setup--october-31) supersedes its pending-delivery and no-output-test status: optical plus AUX now works; Audioengine USB does not enumerate.

The host reports a cable delivery expected **October 31**, after considering USB-C-to-TOSLINK plus AUX backup; exact adapter/SKU and receipt are unverified. The two-channel speakers have a **Micro-B USB input**, allowing a possible FLX4 bypass. No successful direct USB/optical mirror is confirmed. Audioengine HD3 was previously observed as a paired Bluetooth device; the physical speaker model should be confirmed before treating that identification as certain. Audioengine documents the original HD3 Micro-USB audio input, plug-and-play Mac support and 16-bit / up-to-48-kHz operation. [HD3 USB specifications](https://audioengineeu.com/support/hd3-usb-specifications/) · [USB format guidance](https://audioengineeu.com/support/when-using-the-usb-input-of-the-hd3-what-sample-rate-and-bit-depth-should-i-set-my-system-to/).

Proposed wiring for **the same finished stereo mix**:

- Mac USB → data-capable Micro-B cable → speakers' USB audio input.
- Mac USB-C → macOS-compatible USB-audio-to-TOSLINK **output/transmitter** → full-size TOSLINK cable → AX5125H OPTICAL. An integrated USB-to-optical cable may already provide the optical lead; verify the actual listing. Stereo PCM48 support is the relevant requirement. A stereo 3.5 mm TRS male-to-male AUX cable is a proposed fallback, not evidence that AUX quality is resolved.

For simple duplication only, a macOS **Multi-Output Device** can mirror audio to both wired outputs at 48 kHz, with drift correction on the independent secondary clock where available. The current per-output EQ/delay requirement instead calls for the **Aggregate Device + REAPER** route below. [Apple multi-output instructions](https://support.apple.com/en-ca/guide/audio-midi-setup/ams7c093f372/mac).

This makes the DDJ optional for finished-premix playback. It does not import editable REAPER automation into rekordbox, create two different musical programmes, or guarantee matching acoustic timing. Clock drift correction does not compensate for soundbar DSP delay; bar-alone quality and combined listening tests remain necessary. With USB speakers bypassing FLX4, its MASTER knob no longer controls those speakers. Test player pause/volume and each system's own volume before replacing the existing manual quiet fallback. Hardware configuration, optical quality and full-duration operation are not yet tested.

### Fine output tuning · proposed refinement

**October 31 hardware progress:** the [current player record](output-playback/README.md#current-connected-setup--october-31) owns the verified AUX/optical mapping and saved state; the [room-calibration result](output-playback/ROOM-CALIBRATION-2026-10-31.md) owns the applied timing, native readback and deliberate flat-EQ decision. Three brief music tests passed by host confirmation. The host's recording after final placement has been analyzed and the correction saved to the party player. Post-correction listening remains. Earlier offline preparation and proposed USB topology below are historical evidence.

**October 30 deadline decision:** cable arrives sometime October 31; host now expects guests around **8–9 p.m. EDT**. Encoded 5.1 is substantial additional work and is deferred. The [prepared stereo player and arrival-day instructions](output-playback/README.md) are the current deliverable; [native routing proof](output-playback/proof-results-2026-10-30.json) passed without hardware. Budget 20–45 minutes for ordinary device setup/basic alignment, optional EQ another 15–30; these are estimates contingent on working devices. Timebox troubleshooting, use simple Multi-Output duplication if necessary, and retain the established FLX4/Audioengine route if combined sound is poor.

**Confirmed two-stereo-system scope:** the host accepts approximate calibration using an iPhone in the expected room positions. The [phone calibration kit](output-playback/CALIBRATION.md) provides the isolated 69-second sequence, reference/clock-corrected recording analysis, cautious relative EQ candidates and bounded preset application to the separate party player. Fifteen synthetic/container tests now pass; the earlier native render/simulated-phone proof also passed. The first real recording and native correction are complete. The linked kit owns the current procedure and measurement limits.

The host asked whether delay/EQ can be adjusted across the two-channel system and the bar's 5.1.2 speakers. **Separate input feeds and physical soundbar drivers are different controls.** In the proposed stereo-PCM optical route, the Mac can address two USB speaker channels plus two optical channels: four output signals, not ten individually exposed speaker channels. The bar can distribute/upmix stereo internally according to its processing mode, but this does not expose independent centre/sub/surround/height EQ or delay to the Mac. Hisense also supports encoded Dolby Digital/DTS 5.1 over optical; this does not turn the proposed stereo USB adapter into eight discrete PCM outputs. HDMI IN/eARC accept multichannel PCM/Atmos formats, but channel mapping and physical height-speaker control would need separate verification. [AX5125H input formats and controls](https://files.hisense-usa.com/download/f2564889dd9b4c8b).

For independent speaker-system processing, use **macOS Aggregate Device + REAPER playback routing**. An Aggregate Device exposes the two interfaces' channels separately. The prepared project sends the finished party file to two stereo buses with native ReaEQ and bundled Time Adjustment Delay, then four separate master channels; the real MASTER gain/mute controls both pairs. The offline proof verified routing, an intentional 120 ms one-pair delay and independent/common gains. The actual player starts with flat EQ, zero delay, muted −12 dB master and disconnected outputs. A mapping action is supplied for the real channel order once devices are present; it remains physically untested. Keep room correction in this separate playback project, outside the completed musical master and existing premix preparation profile. [Apple aggregate-device/channel mapping](https://support.apple.com/en-au/HT202000) · [REAPER routing/FX manual](https://dlx.reaper.fm/userguide/html/).

**Latest host direction:** direct playback may omit rekordbox entirely. The likely wiring is one USB connection to the Audioengines and another USB-to-optical output connection to the Hisense. Use REAPER as both the finished-file player and output processor; deck controls add no required function to this route. One stereo source fans out to Audioengine L/R and soundbar-input L/R, with a common stop/master control and independent output trims, EQ and delay. Nominal outputs 1–2 / 3–4 are labels until actual Aggregate Device channel order is verified. Set both interfaces to 48 kHz, select one clock source and enable drift correction on the other interface.

| Addressable feed with the proposed hardware | Software controls | Physical control boundary |
|---|---|---|
| Audioengine left | Individual level, parametric EQ, delay, source L/R mapping | Left physical speaker |
| Audioengine right | Individual level, parametric EQ, delay, source L/R mapping | Right physical speaker |
| Hisense stereo input | Stereo level/EQ/delay; separate input-L/R processing is possible, but begin linked | Hisense handles internal centre, surround, height and sub distribution; input L/R is not an isolated pair of its physical drivers |

The host's ideal **2 + 5 + 2 + sub = 10 separately tunable channels** cannot be exposed through ordinary stereo USB/optical PCM. Encoded Dolby Digital/DTS can carry 5.1 over optical, but requires a compatible encoder/output pipeline and does not supply separate height channels; it is not the selected baseline. HDMI accepting 7.1 PCM or Atmos also does not prove arbitrary independent access to this bar's height drivers. Full ten-channel control needs a separately verified decoder/renderer and individually addressable playback hardware, rather than an Aggregate Device checkbox. Start with stereo into each system and audition the bar's internal surround mode for room coverage; do not promise every internal speaker will receive a particular signal from a stereo input.

The host asked whether [an AC-3 optical 5.1 pipeline](optical-5-1-pipeline-2026-10-29.md) adds excessive delay. The offline six-channel encode/package/decode and mpv runtime-encoder/null-output proof passed. Stable delay is compensable for prerecorded playback in principle; actual optical passthrough, bar latency and simultaneous PCM/bitstream clock handling remain untested. This requires an alternate output backend, beyond the simple stereo REAPER/Aggregate Device plan. The linked investigation owns the pipeline, measured software results and next hardware test.

**Room position/calibration plan:** record actual speaker positions and the main dance/listening area, check channel identity with quiet one-at-a-time signals, then measure/listen to each system alone and together. Match useful coverage levels, delay whichever feed arrives earlier at that reference area, and only then tune broad response problems. Distance is only part of arrival time: include USB buffers and the bar's internal processing. Soundbar surround/EQ mode and the Audioengine bass-switch position must be fixed and recorded before calibration; changing them calls for a recheck. The host has **an iPhone, no calibrated measurement mic**. Start with fixed-position recordings for relative timing and measurement-mode/automatic-gain-off comparisons for rough levels; treat frequency response as approximate, make conservative broad EQ changes and verify by listening around the room. REW is an optional measurement tool if a suitable capture/reference path is later available, not a requirement to buy a mic. No live measurement or phone app setup is claimed. [REW measurement and timing guidance](https://www.roomeqwizard.com/help/help_en-GB/html/makingmeasurements.html) · [iPhone measurement-mode processing controls](https://faberacoustical.com/help_x/signalscope_x/help_x_11/options/iodeviceops.html).

Software cannot align arrival time perfectly at every point in the room or move a physical speaker. Prefer sensible placement, useful coverage and moderate fill levels over trying to create an Atmos layout from two unrelated systems. Verify left/right routing, common mute/stop, reconnect behaviour and drift over extended playback before relying on the setup. No hardware configuration or live audio changes were made during offline preparation.

If the bar is slower, delay the faster USB-speaker route; the actual offset has not been measured. Clock drift correction controls rate drift rather than correcting the bar's fixed DSP latency. Alignment is relative to a chosen listening area, with distance/room effects changing elsewhere. Hisense documents shared bass/treble, EQ presets, surround-level trim and an input-specific digital AV-sync delay of 0–200 ms in 10 ms steps; this is not documented per-driver calibration. The bar's AV-sync control adds delay, so increasing it cannot catch an already-late bar up to the speakers.

**Purchase implication:** optical remains a supported choice for stereo mirroring with per-system tuning. If independent control of all physical 5.1.2 channels is required, do not select the adapter on the assumption that it supplies that capability; a separately verified multichannel/renderer/hardware workflow is needed. No purchase or change to the separate room briefs is authorized by this capability discussion.

### AUX tradeoffs · alternative to test before more adapters

The host confirms both speaker systems also have AUX input. AUX is still a stereo feed into each system; it does not expose the bar's internal 5.1.2 speakers. A properly set analog connection can be suitable for music, with gain/noise/grounding and cable-length tradeoffs. It does not eliminate the bar's internal processing delay or resolve the pending thin-sound diagnosis by itself.

- **One output split to both AUX inputs:** inexpensive duplication, one source clock, but a passive splitter cannot provide independently processed output feeds. Per-system software EQ/delay must happen before independently addressable outputs. Speaker volume controls remain separate. Bar processing/acoustic delay can still differ even when the same electrical signal reaches both inputs.
- **Four-output USB interface into the two systems:** two stereo output pairs can receive separate REAPER buses, with independent gain/EQ/delay and one interface clock. A dedicated four-line-output interface is one option, but none is currently selected or purchase-authorized.
- **Reuse the owned FLX4 first, proposed/untested:** earlier Audio MIDI Setup showed FLX4 **2 inputs / 4 outputs**, and the manufacturer documents stereo MASTER RCA and stereo PHONES. Test a REAPER bus to MASTER → existing stereo-speaker analog input, and a second bus to PHONES → soundbar AUX using a stereo 3.5 mm TRS male-to-male lead. Verify exact CoreAudio channel mapping and physical knob behaviour before relying on it. PHONES is amplified headphone output: begin with low level and match the bar's input without clipping. This repurposes private headphone cueing as the second speaker feed; ordinary rekordbox cue behaviour is not the desired routing. No independent-routing, gain or audible-quality proof has been performed. [FLX4 output specifications](https://www.pioneerdj.com/en/product/dj-controllers/ddj-flx4/) · [HD3 analog input guide](https://audioengine.com/wp-content/uploads/2018/10/HD3_quickstart_guide_V02.pdf).

For the requested independent tuning, keep two independently addressable stereo feeds. The FLX4 analog test may avoid buying an optical adapter and avoids combining two interface clocks; USB speakers plus optical remains a supported alternative for bypassing the controller. Neither choice promises access to individual bar drivers or time alignment without calibration. Do not send the same source simultaneously into multiple active HD3 inputs: Audioengine documents that connected sources can sum. [HD3 input behaviour](https://audioengineeu.com/support/is-it-possible-to-have-simultaneous-connections-to-the-hd3/). No new wiring, app configuration, audio render or purchase was performed in this comparison.

### Audioengine bass clarity · October 29

The host reports muddy bass from the Audioengine stereo pair and confirms the current connection is **FLX4 RCA/analog output**. A fresh native rekordbox inspection showed both decks unloaded, both decks' HIGH/MID/LOW EQ at zero, and **PC MASTER OUT on**. This supersedes the earlier PC MASTER OUT-off observation; no EQ, output or playback settings were changed. The host subsequently confirmed and toggled the physical reduced-bass switch; the audible result is still pending. The physical speaker model remains inferred as HD3 from the earlier Bluetooth identity.

**Proposed listening trial, not a measured correction:** mute the soundbar, use one speaker input only, and compare at a moderate matching volume. Check for wall/corner or resonant furniture placement before adding processing. In a separate Audioengine output bus, begin with one broad bell at **200 Hz, −3 dB, Q about 0.8** (approximately 1.7 octaves bandwidth in ReaEQ), all other bands flat. Compare bypass/on at similar loudness; move the centre within roughly 150–300 Hz or reduce the cut if it loses warmth. Leave deeper bass unboosted. A muddy/boxy low-mid sound is a listening hypothesis, not proof that 200 Hz is the actual room problem. Distortion appearing only at high volume calls for lowering level, rather than trying to EQ the speakers into greater bass output. [ReaEQ controls](https://www.reaper.fm/guides/ReaEffectsGuide.pdf).

If these are the original HD3s, their rear bass-reduction switch is a coarse hardware alternative. Audioengine lists normal response from 65 Hz and reduced response from 100 Hz; it is intended to help integration with an external subwoofer and can remove too much weight when used alone. It is not equivalent to the proposed low-mid bell cut. Verify the rear model/labels before using it. [Original Micro-USB HD3 specifications and bass reduction](https://audioengineeu.com/support-hd3-wireless-speakers/).

Rekordbox deck EQ offers an immediate coarse listening test by gently reducing LOW, but it processes the mixed source, including its mirrored PC MASTER signal. It cannot serve as independent Audioengine correction while preserving a differently tuned soundbar feed. The separately routed REAPER player is now prepared and verified offline; physical mapping, listening and calibration remain pending. No audible improvement or calibrated preset is claimed.

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

