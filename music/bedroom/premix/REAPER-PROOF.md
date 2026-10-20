# REAPER automated premix proof

Tested October 19, 2026, America/New_York; final machine report timestamp is October 20 UTC. **Passed on installed REAPER 7.82/macOS-arm64.** [45-second sample](samples/reaper-proof-45s.mp3) · [Measured results](proof-results-2026-10-19.json) · [Production plan](../premixed-set-plan-2026-10-19.md).

## What actually ran

Installed `/Applications/REAPER.app` from the [official universal installer](https://www.reaper.fm/download.php). Verified Cockos's Developer ID signature and the stapled Apple notarization ticket before installation. Evaluation only, $0 spent; no license, subscription or plugin purchased. The installer was unmounted after installation.

REAPER uses an isolated task profile at `.local/reaper-resource/reaper.ini`, explicitly configured with **no hardware input/output device**. No audio was played through the Mac speakers, FLX4 or room speakers. First-run device selection and evaluation reminder were completed; subsequent scripted builds/renders ran without per-edit UI interaction. The ordinary default profile and physical party output still need their own configuration/test.

The Python driver generates original test audio and plans, native Lua constructs editable REAPER projects, and **REAPER's own `-renderproject` command renders the WAVs**. FFmpeg measures and encodes the preview; it does not perform the demonstrated mix. The native CLI's help and [official ReaScript API](https://www.reaper.fm/sdk/reascript/reascripthelp.html) supply the integration contract.

## Test construction

| Operation | Input and result |
|---|---|
| Repetition cut | A: 128 BPM, 32 bars / 60 seconds. Python detects an exact duplicate eight-bar PCM phrase at source 15–30 seconds; keeps 0–15 and 30–60, producing 45 seconds |
| Tempo/pitch | B: 132 BPM, 24 bars / 43.636354 seconds. REAPER uses rate 128/132 with élastique 3.3.3 Pro and pitch preservation, yielding approximately 45 seconds |
| Transition | B begins at master 30 seconds; A exits at 45. Scripted 15-second/eight-bar overlap, opposing fades and low-shelf bass handover at 37.5 seconds |
| Interior splice | A jumps source 15→30 at master 15 seconds, with 3 ms edge fades; original files remain intact |
| Delivery | 75-second stereo PCM24/48 kHz WAV, plus an independent tone render and 45-second MP3 preview |

The preview covers master 7.5–52.5 seconds. Within it, the cut is at **0:07.5**, blend begins **0:22.5**, bass handover is **0:30**, and B plays alone after **0:37.5**. The preview has short delivery fades at its own edges. All sounds are original procedural oscillators/noise; no third-party recordings or samples were downloaded.

## Measured evidence

- Native readback confirms source offsets, positions, lengths, rates, pitch-preservation flags, actual EQ parameter readouts and installed pitch algorithm. The saved project must contain the current manifest fingerprint before the driver can render it.
- Output is exactly **3,600,000 frames / 75 seconds**, stereo PCM24 at 48 kHz. True peak **−7.0 dBFS**, integrated **−22.2 LUFS**; no unexpected silence of 100 ms or more at the documented −70 dB threshold. This is a conservative engineering demo, not final loudness mastering.
- Pre-cut and post-cut waveform correlations with the intended source exceed **0.99999999**. The post-cut correlation with the uncut/wrong source is about **0.791**, establishing that the source jump happened in the rendered audio.
- A separate six-second **440 Hz** tone renders at **6.1875 seconds** under the same rate change and measures **439.999987 Hz**, rather than the approximately 426.667 Hz expected without pitch preservation.
- Two complete one-command runs passed after the initial build; final rerun also exercised output archiving, current-manifest checks and automatic preview generation. **21 Python tests pass**, including existing approval isolation and new range, source-change, stale-project, lock, escaping and signal-check tests.

The independent kick-tempo diagnostic is **uncertain** (approximately 127.66 BPM with low autocorrelation confidence). Do not present this as a measured downbeat/phrase-alignment or subjective listening-quality result. The known fixed source grids, applied rates and project placement establish the scripted mechanics; real-track analysis and musical quality still need validation. No audible audition, approved-track chapter, nine-hour render/soak or physical output test is claimed.

## Reproduce locally

From repository root, with the installed app and initialized offline task profile:

```sh
python3 music/bedroom/premix/reaper_proof.py --render
```

The command generates plans, sends immutable run-specific scripts to the matching REAPER profile, waits for current-run native readback, checks the saved project fingerprint, renders both projects, verifies the audio and exports `.local/reaper-proof/renders/reaper-proof-45s.mp3`. An advisory lock rejects concurrent CLI builds. Previous WAV renders are archived under `.local/reaper-proof/renders/previous/`. Timed-out/failed dispatches are revoked so a queued script cannot silently overwrite a retry; owned clients are reaped/terminated as appropriate.

Use `--output PATH`, `--reaper PATH` or `--profile PATH` for another setup. A fresh checkout does not include the installed app or task preferences; initialize its separate profile with Audio Device `<none>` before using this offline-only runner. Keep runtime projects, full WAVs, preferences and evaluation state ignored. The source scripts and short original preview are committed.

```sh
python3 -m unittest discover -s music/bedroom/premix -v
python3 music/bedroom/premix/verify_reaper_proof.py
```

The builder is a **synthetic engineering prototype**. Exact PCM repetition detection on a supplied grid is not a general music-structure detector. The next stage must connect the approved-file manifest to real analysis and agent-chosen edits, preserving host Cut/Keep authority and exact-version identity. The agent remains responsible for the production micro-decisions.
