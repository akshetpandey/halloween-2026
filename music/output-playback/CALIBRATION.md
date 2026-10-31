# iPhone calibration · two stereo speaker systems

**October 31: the raw room test has played after the host confirmed final speaker placement and started recording.** The original iPhone file is awaited; no room analysis or correction is complete. The kit was built and tested offline October 30. Keep the Audioengines and Hisense as two stereo systems; encoded 5.1 is deferred. The [party player](README.md) already provides their separate EQ, level and positive-delay controls. The host's iPhone is sufficient for relative timing and useful broad comparisons; no measurement-mic purchase is required.

## What the host does

1. Put both systems in their final positions. Select the bar's intended sound mode and the Audioengine bass-switch position. Verify that the two REAPER buses really reach their named systems. Stop other music/TV sound and leave those settings unchanged.
2. Put the iPhone on a stable support around head height near the main dance/listening area, with microphones unobstructed. Keep its position and orientation fixed throughout the test. Do not hold or move it while recording.
3. Record **one continuous file**. Start recording a few seconds before pressing Play in REAPER and stop a few seconds after the **69-second** test ends. Leave the room quiet. The test has short coded sounds, isolated noise sections and silence; it is expected to sound unlike music. Start at a low comfortable physical volume and raise only enough for a clear recording.
4. Export/share the **original audio file** to the Mac or this chat. Do not trim, normalize, enhance, remove silence or send it through a messaging app that modifies it. Normal mono/stereo WAV, M4A/AAC or an ordinary mono/stereo video audio track can be decoded. Spatial audio is not supported.
5. After I analyze it and apply the preset, listen to familiar music with both systems, then each alone. Walk to a second part of the room. An optional second recording can check whether the first position was misleading; it is not a requirement for elaborate room correction.

Voice Memos is enough for timing: choose ordinary mono/stereo and disable Enhance Recording, Studio Voice, Skip Silence and other processing. Export the original rather than a processed playback capture. Apple documents that enhancement reduces noise/echo and that silence skipping changes playback, both undesirable here. A WAV recorder such as [RØDE Reporter](https://rode.com/en-us/apps/reporter-app) is an optional alternative with built-in-mic support. A measurement-mode app with automatic gain control disabled improves level/EQ evidence, but is not required to measure delay. Do not assume a WAV extension alone proves fixed gain. [Apple playback options](https://support.apple.com/en-kg/guide/iphone/iphebbd067ce/ios) · [Measurement-mode processing controls](https://faberacoustical.com/help_x/signalscope_x/help_x_11/options/iodeviceops.html).

The host only needs to position the speakers/phone, record and listen. The agent handles test playback, file analysis, interpretation and small EQ/delay choices.

## What is built

**Driver:** a separate raw calibration REAPER project, using the same four master channels as the party player. Its four-channel source addresses Audioengine L/R and Hisense input L/R independently. It starts muted with no hardware outputs. No voice announcements or internet service are needed.

**Sequence:** different 160 ms band-limited coded markers identify each output. Audioengine-left references occur early and late, with repeated events in between; other outputs repeat three times. Six-second identical pink-noise sections play through each input channel separately. Both paths have a quiet initial warm-up. Total duration is 69 seconds.

**Analysis:** matched filtering finds each known marker in the recording. An affine timing fit removes the unknown recording-start offset and estimates recording/playback clock-rate mismatch. Repeated markers reveal unstable delays or missing outputs. The mean L/R arrival for each system is approximated with its two channel medians; the earlier system receives a positive common delay, rounded to 1 ms. This measures sound reaching the selected phone location, including electronic processing and travel distance. If L/R timing differs substantially within a system, the report flags the common delay as a room-coverage compromise.

**EQ/levels:** compare smoothed response bands from identical noise played through each system. Normalizing the comparison reduces shared phone coloration, but does not calibrate the microphone or prove either speaker is flat. Candidates require both relative low-mid excess and a local peak, are limited to **125–630 Hz**, and suggest at most **one broad −3 dB cut per system**. No bass boost or deep-null correction is generated. The agent reviews the evidence and auditions small cuts; shared boom on both systems can be handled by listening rather than pretending the phone identified an absolute target curve.

**Preset:** bounded numeric TSV applied only to the dedicated party player, with MASTER left muted. Delay is limited to 0–500 ms. Confirmed fixed-gain recordings may suggest attenuating the louder system by at most 6 dB; gain never increases. Unknown gain or detected clipping withholds automatic level/EQ changes. The default preset contains timing only. Optional EQ inclusion requires `--fixed-gain --include-eq` after the recording mode is actually confirmed and the candidates reviewed. Each application overwrites the previous bus correction; do not interpret a measurement of an already corrected test as a new absolute preset. The raw test project stays flat/zero-delay.

## Agent commands and REAPER actions

The ready private calibration project is pointed to by ignored `.local/latest-calibration.json`; `.local/calibration-project.txt` supplies its path to the loader. Prepare a fresh raw project only if necessary:

```sh
python3 music/output-playback/prepare.py --calibration
```

In the already mapped party player, run **[load_calibration.lua](load_calibration.lua)** from REAPER's Actions list. It opens the test in a new tab in the same audio-device setup, copies existing output mappings without duplicating them, and keeps MASTER muted. If outputs were not mapped yet, use [arm_outputs.lua](arm_outputs.lua). Start the phone recording, unmute the test MASTER and press Play. Playback is never started automatically. Stop before switching tabs.

```sh
python3 music/output-playback/calibrate.py analyze /absolute/path/phone-recording.m4a \
  --output music/output-playback/.local/phone-analysis-01
```

This produces `analysis.json`, `ANALYSIS.md` and `preset.tsv` in the ignored result directory. The entry point automatically uses the already bundled NumPy runtime if system Python lacks NumPy; FFmpeg decodes the recording. No package download is needed. A fresh result directory is required for each analysis.

Return to the **party** tab and run **[apply_calibration.lua](apply_calibration.lua)**, selecting the generated TSV. It validates the complete file and dedicated project/FX identities before changing settings, rejects the calibration tab, and leaves MASTER muted. Save, lower physical levels, unmute and audition. Keep the prepared calibration project raw for any repeat measurement. Delay/gain/EQ belong in the player, never in the finished mix file.

## Verification and limits

```sh
python3 music/output-playback/calibrate.py selftest
python3 music/output-playback/calibrate.py verify-native
```

Thirteen tests cover known 115 ms and reversed offsets, recording start/clock errors, stronger echoes, missing outputs, truncation, changed timelines/silence removal, clipping policy, fixed/unknown recording gain, bounded EQ candidates, matching 48/16 kHz templates, timing-only preset output and actual AAC/M4A encoding/decoding. The [native round-trip proof](calibration-proof-results-2026-10-30.json) rendered all four test channels in REAPER, simulated a phone/room path and recovered an expected **68 ms** difference as **68.008 ms**. Native preset readback confirmed the intended delay, −2 dB bus trim and a 250 Hz/−3 dB EQ cut on a separate synthetic player. Those are test values, not room settings. That offline proof opened no physical audio output. The October 31 physical playback is a separate step; no real phone recording has been analyzed yet.

Failure is explicit: weak/missing markers, inconsistent timing, short recordings or excessive inferred offsets produce no valid delay preset. A recording over three minutes is rejected to avoid analyzing the wrong long media file. One delay cannot align every position or every internally processed soundbar driver. Final listening and a brief simultaneous-playback check remain necessary; an exact flat response, absolute SPL, subwoofer phase calibration or all-night stability is not claimed. The [deadline/fallback plan](README.md#fast-fallback-and-time-limit) still applies.
