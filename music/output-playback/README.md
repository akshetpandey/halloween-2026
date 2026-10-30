# Stereo party playback · October 30

**Prepared and tested offline; physical outputs still need the arriving cable.** Use one finished stereo file in REAPER, feeding separate Audioengine USB and Hisense optical stereo buses through a macOS Aggregate Device. Each bus has bundled ReaEQ and Time Adjustment Delay; the real REAPER MASTER volume/mute controls both. The bar handles its own internal surround distribution. No rekordbox, FLX4, live encoder, custom audio engine or new software purchase is required for this route.

Deadline decision: **defer encoded 5.1 for this party**. Its [software proof](../optical-5-1-pipeline-2026-10-29.md) does not solve the additional bitstream/PCM synchronization work. Host says the cable arrives October 31 and guests start around **8–9 p.m. EDT**. Prefer dependable simultaneous stereo over extending that research.

## What is ready

- A private playback-only project already references `The-Hollow-party.mp3`, duration **7:35:30.1095**, at 1.0x. It does not load the reserve automatically or alter the completed musical mix.
- Three simple tracks: finished music, Audioengine stereo, Hisense stereo. The source fans out once to each bus; bus channels reach MASTER 1/2 and 3/4 separately.
- Flat EQ, zero alignment delay and unity bus gain by default. MASTER starts **muted at −12 dB**, and hardware outputs are disconnected until mapped.
- A separate ignored REAPER profile starts with no hardware I/O; ordinary REAPER preferences and the existing premix/render profile are untouched.
- [Offline native proof](proof-results-2026-10-30.json): correct L/R separation across four rendered channels, **120 ms** intentional delay on the Audioengine pair only, independent **−3 dB** bus gain and verified **−12 dB** common MASTER gain. These are test settings, not room calibration values.

Open the prepared player by double-clicking **[Open Party Player.command](Open%20Party%20Player.command)** in Finder. It opens REAPER in the separate playback profile and never presses Play. Or run from repository root:

```sh
python3 music/output-playback/prepare.py --open
```

The first open can spend a few minutes building the long file's waveform cache. That completed during preparation; the player is open with its three tracks, original speed and muted MASTER at −12 dB.

The current machine-specific project/profile pointers are in ignored `.local/latest.json`. Runtime media, REAPER projects/preferences and logs stay ignored. To regenerate a fresh player and rerun the short offline proof, use `python3 music/output-playback/prepare.py --verify`; it uses a new output folder and does not overwrite a calibrated player. Regeneration is unnecessary tomorrow unless the prepared project is missing.

## When the cable arrives

Working estimates, not guarantees: **20–45 minutes** for stereo output and basic timing/levels if both devices enumerate normally; another **15–30 minutes** for optional broad EQ/listening checks. Adapter faults or driver problems can exceed that window. Encoded 5.1 would take several hours of implementation/testing with uncertain debugging and is excluded from the party scope.

1. Connect Mac USB → Audioengine data-capable Micro-B input, and Mac USB → optical output adapter → Hisense OPTICAL. Start both volumes low. Disconnect/mute duplicate Audioengine analog/Bluetooth sources. Fix the bar's sound mode and speaker bass-switch position before tuning.
2. In Audio MIDI Setup, confirm each device plays independently as **48 kHz stereo PCM**. Create an **Aggregate Device** using only these two interfaces. Select one clock source; use drift correction on the other interface. Do not choose encoded Dolby output. [Apple aggregate settings](https://support.apple.com/en-asia/guide/audio-midi-setup/set-aggregate-device-settings-ams094c7edb4/mac).
3. Open the prepared player. In REAPER Preferences → Audio → Device, select that Aggregate Device and enable all four output channels. The actual order may differ from 1/2 Audioengine, 3/4 Hisense.
4. Load [arm_outputs.lua](arm_outputs.lua) through Actions → Show action list → New action → Load ReaScript, then run it. It lists the real device channel names and asks which first channel belongs to each stereo pair. It rejects missing/overlapping pairs and leaves MASTER muted at −12 dB. Save after mapping.
5. Lower physical volumes, unmute MASTER and play a familiar passage. Mute one bus at a time to verify physical identity and L/R, then listen with both. Confirm MASTER mute/volume affects both. Raise level gradually; do not compensate for a muted/misrouted output by raising everything.
6. If there is an echo/flam, use the iPhone recording method for a rough relative offset and add **positive** delay to the earlier bus. In that bus's FX, change only **Time Adjustment Delay → Delay Amount (ms)**; keep Wet 0 dB, Dry minimum and additional samples 0. Leave negative delay unused. Recheck by listening and keep delay/EQ changes modest.
7. EQ is optional: first check the reduced-bass switch result and placement. Use ReaEQ on the affected bus only; no default bass cut has been imposed. Save, stop/restart playback, check pause/resume, and let both run while preparing the room. Avoid unplugging devices afterward.

**Keep controls simple:** MASTER volume/mute affects both systems; each bus fader/mute controls its own system. Space plays/stops; Enter pauses/resumes with the default REAPER keymap. Keep playback rate 1.0 and repeat off. Start the finished file manually; this player does not install an event scheduler or change the programme's length.

## Fast fallback and time limit

If custom routing is not working after about **15 minutes of troubleshooting**, use Audio MIDI Setup's **Multi-Output Device** and one normal player to duplicate stereo, then balance levels at the speakers. It loses independent software EQ/delay and can still expose soundbar processing lag. If combined playback sounds worse, mute the bar and use the existing FLX4 → Audioengine analog route, which the host has already used. Do not let an extra speaker system jeopardize the functioning main pair. If delivery leaves less than an hour before guests, prioritize basic output and listening over EQ work.

No physical USB/optical device test, measured room delay, long-run drift/reconnect test or acoustic EQ result is claimed. [Current routing context](../mac-orchestration.md#fine-output-tuning--proposed-refinement) · [Handoff](handoff-2026-10-30.md).
