# Adaptive Auto DJ — controllable engines and proof boundary

Researched October 19, 2026. **Research and proposed architecture; no engine installed, launched, connected, controlled or audibly tested.** This extends [the Auto DJ comparison](../auto-dj-research-2026-10-19.md) for a different question: can a programme choose the next track and shorten an uninteresting track while a real DJ engine performs playback through the Mac and DDJ-FLX4?

## Recommendation

**Prototype VirtualDJ Pro with its official Network Control plugin and a separate local Python supervisor.** It has a documented command/query transport and a documented exact-path deck-load operation. Start with observation, then a prepared queue plus constrained early-transition requests. Treat adaptive arbitrary next-track insertion as a separate proof gate: the documented queue commands depend on browser selections, and an atomic insert-by-path operation has not been established.

VirtualDJ is the strongest documented adaptive-control candidate among these products, not a tested party setup. The existing rekordbox route remains the low-migration baseline for an ordered programme until an adaptive prototype and the real audio chain pass rehearsal. A Native SDK bridge is a fallback if the official HTTP plugin cannot meet the Mac requirements; building an additional bridge should not be the first step.

| Engine / interface | Where custom logic runs | Feasibility for this project |
|---|---|---|
| VirtualDJ Network Control + VDJScript | Python outside the app; plugin receives commands inside VirtualDJ | Best initial candidate; actual Mac/ARM extension availability and queue semantics must be demonstrated |
| VirtualDJ Plugin SDK 8 | Compiled C++ plugin inside VirtualDJ; optional custom transport to Python | Rich low-level bridge option; greater build, lifecycle and compatibility work |
| Mixxx 2.5 controller scripting | Embedded JavaScript mapping inside Mixxx | Good numeric state/control; exact-path loading and a general external queue API are missing from the public interface inspected |
| djay Pro | App Automix and MIDI mappings | Strong built-in Automix, but no suitable documented public application API established |
| rekordbox | App Automix and MIDI mappings | Existing hardware route; no suitable documented public application command/telemetry API established |

## VirtualDJ: a real HTTP interface, with limits

The official **Network Control** plugin requires VirtualDJ 2023 or later and a Pro license. It exposes `/query` and `/execute` over GET or POST; a POST body can be `text/plain` VDJScript. Authentication can use an `Authorization: Bearer …` header. Responses are plain text, not a JSON object model; execution returns `true`/`false`. Install/enable instructions place it in Extensions and the Master Auto-Start effects. The documentation establishes an HTTP command/query bridge, **not** a built-in public WebSocket API or an ordinary track/queue REST resource model. [Official Network Control documentation](https://virtualdj.com/wiki/NetworkControlPlugin)

The following are documented VDJScript operations. Prefix deck-specific queries with `deck 1` or `deck 2`; validate their actual returned units/types on the chosen build. [Official verb reference](https://virtualdj.com/manuals/virtualdj/appendix/vdjscriptverbs.html)

| Need | Actual verbs / example |
|---|---|
| Identity and play state | `get_filepath`, `get_title`, `loaded`, `play`, `deck_has_error` |
| Position and grid | `get_time elapsed`, `get_time remain`, `get_time total`, `get_beatpos`, `get_beat_num`, `get_bar` |
| BPM/key/gain | `get_bpm absolute`, `get_key harmonic`, `gain`, `gain_label` |
| Load exact local file | `deck 2 load '/absolute/path/track.wav'` |
| Early native Automix transition | `automix_skip` while Automix is active |
| Two-deck transition outside Automix | `mix_now 4000ms`, or `mix_now_nosync 4000ms` |
| Inspect next queue entries | `get_automix_song 'title'`, optional further index |
| Queue edits | `automix_add_next`, `playlist_add`, `playlist_load`, `browser_move`, `browser_remove` |

`automix_add_next` inserts browser-selected tracks after the current item, or moves a selected Automix item there. The reference does **not** document passing an absolute path to it. `playlist_load` likewise uses the selected browser folder/playlist. Do not describe these as a proven `set_next(path)` API. Exact deck loading and queue insertion are different operations. [Queue semantics in the same reference](https://virtualdj.com/manuals/virtualdj/appendix/vdjscriptverbs.html)

The FLX4 has an official VirtualDJ mapping and class-compliant Mac audio setup. Network Control's Pro requirement decides the relevant license even if an entry-level controller qualifies for another tier. Current Pro pricing is **$19/month before taxes**, checked October 19; no license was purchased. The generic HTTP wiki does not certify the extension on this Mac's ARM build. Check that it exists, enables, authenticates and survives restart on the exact selected build before choosing it. [FLX4 setup](https://virtualdj.com/manuals/hardware/pioneer/ddjflx4/setup.html) · [Current pricing](https://virtualdj.com/buy/)

SDK 8 exposes `IVdjPlugin8::SendCommand(const char*)`, `GetInfo(const char*, double*)`, and `GetStringInfo(const char*, char*, int)`. The header includes Mac/Windows platform definitions. These are **in-process C++ callbacks**, not Python functions and not network endpoints. A custom C++ plugin could bridge a local process, but its macOS architecture, loader, callbacks, concurrency and shutdown would all need implementation/testing. Do not block an audio callback with HTTP, model inference or disk access. [Official SDK header](https://virtualdj.com/wiki/Plugins_SDKv8.html)

## Mixxx: useful embedded controls, incomplete external queue interface

Mixxx's controller scripts use embedded JavaScript, not Node.js or Python. The official 2.5 declarations provide `engine.getValue`, `setValue`, `makeConnection`, `beginTimer` and `stopTimer`; `setValue` takes a **number**. Do not assume browser `fetch`, Node filesystem/socket modules or `engine.loadTrack(path)` exists. The API header and C++ script interface inspected expose no general exact-path track loader or queue CRUD transport. This is a bounded public-interface finding, not a claim that a Mixxx C++ fork could never implement one. [Engine declarations](https://github.com/mixxxdj/mixxx/blob/cc3b5cbbef1f50a2329ba6d08b3a15474d54a58e/res/controllers/engine-api.d.ts) · [Exposed C++ interface](https://github.com/mixxxdj/mixxx/blob/cc3b5cbbef1f50a2329ba6d08b3a15474d54a58e/src/controllers/scripting/legacy/controllerscriptinterfacelegacy.h)

| Need | Documented Mixxx control |
|---|---|
| Deck state/time | `[Channel1]`: `play`, `track_loaded`, `playposition`, `duration` |
| Beat/BPM/key | `beat_distance`, `file_bpm`, `bpm`, `key` |
| Gain | `pregain`; this is a control value, not room loudness |
| Load | `LoadSelectedTrack` loads the highlighted library item; it is not a path setter |
| Auto DJ transition | `[AutoDJ],fade_now` triggers the next transition |
| Next-item rejection | `[AutoDJ],skip_next` removes the **upcoming queued track**, not the playing one |
| Other Auto DJ controls | `enabled`, `shuffle_playlist`, `add_random_track` |

`playposition` is a fractional file position and `duration` is seconds; their product is source-file position, not necessarily elapsed wall time under tempo changes. Beat position depends on the analyzed grid. Library-navigation controls can depend on focus. [Official control reference](https://manual.mixxx.org/2.5/en/chapters/appendix/mixxx_controls.html)

Source inspection confirms these Auto DJ controls are connected internally and that `AutoDJProcessor` loads the next queue track through its native model/player machinery. That native loading code is not thereby a public Python IPC API. Do not modify the live library SQLite database to manipulate an active queue. A small custom MIDI mapping can expose numeric choices/telemetry to an external process, but exact identity and arbitrary path/queue operations would still require a separately proven adapter or native changes. [Official Auto DJ source](https://github.com/mixxxdj/mixxx/blob/cc3b5cbbef1f50a2329ba6d08b3a15474d54a58e/src/library/autodj/autodjprocessor.cpp)

Command-line music paths load decks **at startup**; `--start-autodj` enables Auto DJ at startup. These are not a documented persistent remote-control protocol. [Command-line manual](https://manual.mixxx.org/2.5/en/chapters/appendix/commandline_dev_tools.html)

Mixxx is free/open source and has an official macOS FLX4 mapping: master channels 1–2 and headphones 3–4. The physical master level operates in hardware; Smart Fader/Smart CFX are not implemented in the mapping. This preserves an especially useful physical lowering control, subject to testing the real wiring. [Download](https://mixxx.org/download/) · [FLX4 mapping](https://manual.mixxx.org/2.5/en/hardware/controllers/pioneer_ddj_flx4.html)

## djay and rekordbox: do not confuse MIDI mapping with a full API

djay's current Mac manual documents an Automix queue, manual start/end points, Skip and **Mix Now**, which finds an early suitable blend point. It also documents MIDI customization. Those establish app/controller operations; they do not establish a Python method for exact-path loading, queue insertion or a coherent playback-state snapshot. [Mac Automix manual](https://help.algoriddim.com/user-manual/djay-pro-mac/mixing-basics/using-automix) · [Mac MIDI mapping](https://help.algoriddim.com/user-manual/djay-pro-mac/midi)

An Algoriddim support reply in April 2024 explicitly says there is no API/SDK. That dated statement is corroborating history, rather than a guarantee about all future releases; the current public manuals reviewed did not establish a replacement. Do not promise AppleScript, OSC or REST control without another verified interface. [Vendor support response](https://community.algoriddim.com/t/developer-api-or-sdk/25958)

rekordbox documents starting an early Automix crossfade by loading or starting the standby deck, depending on settings. It also warns that Active Loops are not canceled. This supports manual/MIDI rehearsal, not a documented external path-and-queue API. [Official operation FAQ](https://rekordbox.com/en/support/faq/operation-hint/)

A read-only check of the installed rekordbox 7.2.14.0323 bundle found no `.sdef`, `.scriptSuite` or `.scriptTerminology` files and no `NSAppleScriptEnabled`/`OSAScriptingDefinition` declaration. That supports **no installed scripting dictionary found**, not an exhaustive proof of every private interface. No app was launched. Database/XML import tools should not be treated as live deck-control APIs.

## Proposed architecture and authority rules

These are implementation recommendations, not vendor guarantees:

1. **Approved-file manifest.** Map each approved Spotify recording/version to an acquired local file, file hash, analyzed BPM/key, grid confidence, gain adjustment, chapter, allowed entry/exit cues and minimum play time. Unknown or missing files cannot enter the playable pool. Spotify identity and ReccoBeats metrics alone are insufficient for file-specific mixing.
2. **Read-only supervisor first.** A local Python process polls the HTTP bridge at a modest proposed 2–4 Hz, logs both decks and reconciles the loaded filepath. HTTP timing is not sample/beat accurate. Prefer engine-owned transitions or cues prepared ahead of a phrase boundary; do not ride the crossfader using network polling.
3. **Constrained native Automix mode.** Keep a prepared, validated queue and allow one early-transition request only after minimum play time, ready-next confirmation and a suitable allowed exit. Re-read state after every action. A timeout means unknown outcome; do not blindly repeat a skip. In this mode the engine owns deck loading and crossfading. Loss of the supervisor should leave native playback running.
4. **Prove next-track selection independently.** Demonstrate inserting/moving an exact manifest item into the next queue position without disturbing the audible deck or racing a pending Automix transition. Read back the actual next identity. Browser-selection-dependent methods require exclusive command ownership and state checks; an approximate title match is insufficient. If this proof fails, keep a prepared queue plus early-exit control rather than claiming fully adaptive selection.
5. **Alternative full supervisor mode.** If needed, turn native Automix off and let one supervisor own exact-path loading of the silent deck, cue preparation, readiness checks and native `mix_now`/no-sync transitions. Never run both loaders concurrently. This is more work: a Python crash may exhaust the loaded decks, so seamless fallback is **not established** merely because native Automix exists. A rehearsed handover or in-engine fallback policy is required before unattended use.
6. **Feedback changes music choice, not emergency gain.** Keep/skip/vibe feedback can adjust the future chapter/pool. Never let an automatic gain policy undo a person's lowering, pause or stop. A manual action revokes the supervisor's write authority until explicit re-arming. Keep the controller's normal play/pause, faders and hardware master available; don't remap the emergency path into the supervisor.
7. **Local transport boundary.** Use a configured bearer secret through headers, verify listener binding, and restrict the bridge to the Mac/loopback rather than adding it to the public music hostname. The network-control endpoint can execute powerful app commands. If reviewer input influences selection, pass allowlisted track/intent IDs to the supervisor, never raw VDJScript or arbitrary file paths. These are design requirements, not claims about the current plugin defaults.

Adaptation should select among approved tracks and reviewed transitions. Tempo/key similarity is a ranking hint; it does not establish phrase alignment, compatible bass/vocals or crowd response. Keep DnB in coherent chapters and use rehearsed boundaries. A changing crowd metric is optional; host feedback plus an energy schedule is enough to prototype the control loop.

## Minimum proof before making it the party engine

| Stage | Evidence required |
|---|---|
| Transport | Exact VirtualDJ build/architecture; extension present/enabled; authentication and error responses; local binding; settings survive app restart |
| Observation | Both decks identified by exact filepath; time/beat/BPM/key/gain outputs checked against the UI and a known file; missing analysis and load errors handled |
| Exact load | Silent deck accepts the selected file and reports it back; audible deck unchanged; missing/wrong-version files rejected |
| Early exit | One request produces one audible transition; measure timing and verify phrase/bass/vocal behavior, including no-sync DnB boundaries |
| Queue mutation | Exact next item read back; deliberate concurrent manual selection or transition causes safe refusal/reconciliation, not a second load |
| Recovery | Supervisor crash, stale poll, HTTP timeout, queue exhaustion and manual takeover tested; automatic writes remain disarmed after manual stop/lowering |
| Physical chain | FLX4 master/headphones isolation and immediate physical lowering/stop tested; supervisor cannot restore raised output |
| Soak | Final approved nine-hour usable programme, controller, real speakers and simultaneous living-room/TV operation pass the existing rehearsal plan |

All stages remain **untested**. No app installation, purchase, library modification, audio acquisition/download or playback occurred in this pass.

## Research handoff

- Owned file: this document; parent session owns canonical plans and the combined commit on shared `main`.
- Public Mixxx source inspected at 2.5 branch commit `cc3b5cbbef1f50a2329ba6d08b3a15474d54a58e`: controller declarations/interface and Auto DJ processor. Read-only copies were placed in temporary storage outside the repository; no application source was added here.
- Verification: primary vendor documentation and source; read-only installed rekordbox bundle inspection. This establishes documented interfaces and specific missing public methods, not measured runtime reliability.
- Next work: the Mac HTTP/plugin smoke test and exact-next-queue proof determine whether the proposed adaptive architecture is practical. If either fails, retain the prepared programme and revisit a native bridge only with enough rehearsal time.
