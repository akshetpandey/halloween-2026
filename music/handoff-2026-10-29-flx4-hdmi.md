# FLX4 / AX5125H routing troubleshooting · October 29

- Session: live hardware-routing help; updated October 29, 2026, America/New_York.
- Scope: [Mac orchestration](mac-orchestration.md#october-29--ax5125h-hdmi-troubleshooting) is the current hardware record; playback-plan pointer reconciled.
- Checkout: shared `main`, base `09bb218`; no branch/worktree created.
- Status: ready to continue; physical follow-up result pending. **Soundbar output not restored.**
- Host-confirmed setup: laptop → USB FLX4 → two-channel speaker system; Mac HDMI → Hisense AX5125H HDMI IN; no downstream TV/monitor. The bar is on HDMI IN. All ordinary app audio and a direct Audio MIDI Setup Left-speaker test remain silent.
- UI checks: macOS default output ITE-FHD/HDMI, unmuted; initial HDMI 8-channel/24-bit/48 kHz with 5.1.2 layout. Diagnostic change to stereo 16-bit/48 kHz applied and Left=1/Right=2 verified; no audible success. Original format/layout are documented for rollback. Rekordbox PERFORMANCE, no decks loaded, PC MASTER OUT off; no rekordbox/library/aggregate changes.
- Limits: the terminal's hardware inventory returned no audio items, so actual routing evidence comes from native UI and host hearing reports. No successful speaker playback, combined mirroring, latency, long-file import or all-night test is claimed.
- Next actions: obtain result of the pending Mac → bar → powered-on TV/monitor test; this follows the manufacturer topology but is not proof a TV is mandatory. Then isolate mute/power/cable/source as necessary; AUX is an untested fallback. After basic audio works, verify PC MASTER OUT combined routing, cue isolation and actual latency.
- External changes: one reversible HDMI PCM format change only. No purchases, installs, audio downloads/renders, votes, playlists, hosting or security changes.
- Dependencies: host must perform physical cable/remote actions and report sound; no remote control of the bar/TV is available. The existing distinct-room music brief remains unchanged by a mirror rehearsal.
- Checks: native UI readback; host-reported negative tests; official AX5125H HDMI wiring and Apple HDMI-output guidance reviewed. Documentation link/diff checks to run before commit; no code changed.
- Git: unrelated `decor/shopping-ready.md` was already modified and is preserved. This checkpoint records the current fault and next test; final commit hash belongs in the chat reply.
