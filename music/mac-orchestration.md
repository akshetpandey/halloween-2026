# Mac orchestration • music, Jellyfin, volume
Status: Architecture and acceptance criteria ready. No software installed, settings changed or control code run.
Owner: host + planning. First proof by Sep 20; full rehearsal by Oct 18.

## Confirmed audio topology • September 3 update
- **Bedroom:** Mac / rekordbox Automix → USB DDJ-FLX4 → both powered speakers, left/right. Techno/EDM arc.
- **Living room:** Spotify → two Google Homes on Wi-Fi. Separate house/chill playlist; no DJ mixing required.
- **TV:** Mac-hosted Jellyfin → TV client, visual programme muted. HDMI video from Mac remains a fallback.
- **Soundbar:** owned Hisense 5.1.2. The host confirms it has already worked with this Mac when selected as the output in macOS Sound settings. Reuse that working connection; exact model is not a blocker. Party role is unresolved now the Google Homes cover living-room music. Proposed use: TV audio when wanted, otherwise muted during silent visuals.

This supersedes the earlier plan to use the soundbar as the primary living-room music output. No macOS Multi-Output Device or rekordbox PC MASTER OUT is needed for these independent music zones. Keep PC MASTER OUT off in the proposed party configuration so bedroom music is not mirrored to the TV/bar. No settings have been changed.

## Google Home setup and control
Use a speaker group named **October Grove** for synchronized playback on compatible Google speakers. If both are the same supported model, a stereo pair is also possible; confirm the actual models before choosing. A group favors broad room coverage; a stereo pair favors a defined listening position. [Google speaker groups](https://support.google.com/googlehome/answer/7174267?hl=en) · [Stereo pairing](https://support.google.com/googlehome/answer/7559493?hl=en-SG)

Create the group in Google Home on a phone/tablet. Link the intended Spotify account there and test selecting the group as the playback destination. This group is one living-room programme, distinct from rekordbox’s local files. [Spotify on Google devices](https://support.spotify.com/us/article/spotify-on-google-devices/)

**Mac system volume is not a master for this party.** Google Home playback has its own controls. Google currently documents that device touch controls and ordinary voice-volume commands adjust the individual speaker; phone hardware volume buttons do not adjust the speaker group. Verify both speakers using the Google Home media-session controls. Do not infer a working group fade from a moving laptop slider. [Google controls](https://support.google.com/googlehome/answer/7174267?hl=en)

Use local acquired files for bedroom rehearsal. Do not rely on starting two unrelated Spotify streams with the same account. Device automation for the Google group is not yet implemented or proven; first establish a reliable manual route, then investigate a supported control interface.

## Soundbar connection — confirmed by host
The existing Mac-to-soundbar setup already plays audio when the Hisense is selected in macOS Sound settings. Keep that working cable/connection. No model photo, adapter purchase or new basic compatibility test is needed to proceed. The host previously proposed HDMI, but the exact physical wiring has not been documented.

Selecting the bar establishes the Mac’s default audio output. The planned bedroom route addresses the DDJ separately through rekordbox, while Spotify plays independently on the Google Homes. Verify this combined configuration during rehearsal; the host’s successful soundbar playback does not yet confirm simultaneous routing or automatic volume control.

For the planned muted films, leave their audio muted and let the Google Homes provide the living-room music. The bar could handle TV audio when wanted or a local chill backup; its party role remains open. If it is used, prevent Mac notifications from reaching it. Only revisit model/port details if the wiring needs to change or a problem appears.

## Volume and automation boundaries
The DDJ/amp route and Google Home route each need their own tested lowering/stop control. If the bar is used, include it as a third control path. A macOS volume command may not attenuate a directly addressed DJ device or HDMI output.

First prove bedroom gain control with a quiet local file through the FLX4. Check the real speakers, after app restart and output reconnect. Rekordbox Automix is documented, but a dependable external schedule/control API for the host’s installation has not been established. Do not invent one. Avoid screen-coordinate automation as the primary all-night controller.

VirtualDJ remains an option only if scheduling needs justify the cost and a tested migration. [Scripting reference](https://virtualdj.com/manuals/virtualdj/appendix/vdjscriptverbs.html)

**Manual “quiet now” fallback:** helper lowers/stops bedroom at the DDJ, stops the October Grove media session and confirms both Google speakers are quiet, then mutes the bar if active. Future software must report success separately for each route. A partial success must not display “all quiet.”

## First connection test
- [x] Basic Mac-to-soundbar playback confirmed by host: select the bar in macOS Sound settings.
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
**Phase A:** inventory versions, outputs, TV client and permissions; 10-track Automix test plus two video files.  
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

