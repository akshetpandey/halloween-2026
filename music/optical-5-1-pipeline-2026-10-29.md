# Optical 5.1 playback investigation · October 29

Status: **offline software proof passed; optical hardware and simultaneous speaker synchronization untested**. This is an optional experiment alongside the [stereo USB/optical playback baseline](mac-orchestration.md#fine-output-tuning--proposed-refinement), not a replacement selected by the host. No hardware purchase, app installation, device-setting change or audible playback was performed.

## Proposed signal path

```text
Finished stereo music
  ├─ Audioengine stereo EQ/trim → compensating delay → USB PCM → Audioengines
  └─ intentional stereo-to-5.1 matrix/upmix
       → EQ/trim/delay for FL, FR, C, surround L/R and LFE
       → Dolby Digital / AC-3 encoding, 48 kHz
       → IEC 61937 S/PDIF packaging
       → compatible bitstream player + USB/optical output
       → AX5125H Dolby Digital decoder / internal processing
```

This can supply six encoded soundbar input channels, in addition to the two Audioengine channels. It does **not** supply separate soundbar height channels or bypass the bar's bass management/internal DSP. An LFE channel is not automatically the entire bass output; avoid casually duplicating full-range bass into LFE without checking the bar's bass management. Stereo-to-5.1 routing creates a distribution from the original stereo recording, not original discrete surround content. [AX5125H input formats and controls](https://files.hisense-usa.com/download/f2564889dd9b4c8b).

The installed tools can implement the encoding stage without additional software cost: FFmpeg supports AC-3 and IEC 61937 packaging; mpv has the `lavcac3enc` runtime encoder and CoreAudio compressed-audio output. Start a hardware compatibility trial at 448 kb/s. mpv's default can be 640 kb/s, which its documentation notes some receivers cannot handle. Bitrate compatibility with the exact adapter/bar route remains untested. [mpv runtime encoding documentation](https://mpv.io/manual/master/).

All per-channel EQ, gain and sample-rate conversion must occur **before** AC-3 encoding. The resulting encoded carrier must reach the optical output intact: ordinary mixing, level changes or asynchronous resampling of that carrier can corrupt it. Playback volume can be changed before encoding or at the bar. Native compressed-format support depends on the output/driver. mpv documents a CoreAudio PCM-carrier workaround for drivers that do not report AC-3 support, but this is not a verified fallback for the host's adapter and was not enabled. [mpv CoreAudio output documentation](https://mpv.io/manual/master/).

## Delay and synchronization assessment

The measured AC-3 packet duration in the offline proof is **32 ms at 48 kHz**. That is a codec block interval, **not** a measured end-to-end latency. Capture/virtual-device buffers, encoding queues, player buffers, decoder buffering and the bar's processing can add delay. No total delay estimate or audible offset has been measured on this hardware.

For prerecorded music, a stable offset is manageable in principle: measure the difference and add delay to the earlier Audioengine path (or whichever path actually arrives earlier). A hypothetical 100 ms or 200 ms offset is compensable; those numbers are examples, not predictions. This becomes less attractive for responsive live deck monitoring, but direct finished-file playback does not require that use case.

The main engineering constraint is **two outputs with different formats and clocks**. The stereo baseline's simple Aggregate Device/REAPER routing does not automatically become a PCM-plus-encoded-output player. An encoder/bitstream output backend and common transport/clock strategy are still needed. Do not assume that starting a REAPER session and an independent mpv instance together will remain synchronized. Keep encoded optical packets intact; any adaptive rate correction must be designed on a PCM side of the pipeline. Pause, seek, output reconnect, decoder lock/startup and extended drift all need real tests.

Because the programme is prerecorded, an alternative is to create the final six-channel layout and encode it **offline** after calibration. That removes live encoder work/buffering from event playback, but the optical decoder delay and dual-output synchronization still exist. Per-channel EQ changes then require a fresh encode. Pre-encoding is preferable to a live virtual-capture chain if a dependable synchronized output implementation can be proved.

## Offline proof actually run

On the host's Mac, using installed FFmpeg 9.0.1 and mpv 0.41.0:

1. Generated six seconds of synthetic 48 kHz, six-channel PCM, with one channel active in each one-second slot; the LFE test used an 80 Hz tone.
2. Encoded it as 448 kb/s AC-3. FFprobe reported 48 kHz, six channels, `5.1(side)`, and packet duration `0.032000` seconds.
3. Packaged the AC-3 into S/PDIF with FFmpeg, then demuxed it back. The recovered AC-3 bytes matched the original exactly.
4. Decoded to PCM and checked channel energy in each slot. Dominant-channel order was `[0, 1, 2, 3, 4, 5]`, with no channel-order failure.
5. Ran mpv's `lavcac3enc=bitrate=448` against the synthetic PCM with **null audio output**. It reported `48000Hz stereo 2ch spdif-ac3` and reached end of file. This is the encoded carrier format, not a stereo downmix.

Encoding six seconds took about **0.165 seconds wall time** in this short test. This indicates adequate encoding throughput for the synthetic workload, not low audible latency or an all-night load test. No physical output was opened. Temporary generated media was removed automatically; no party media or downloads were used.

Representative offline commands, given an already prepared six-channel file:

```sh
ffmpeg -i soundbar-5.1.wav -ar 48000 -c:a ac3 -b:a 448k soundbar.ac3
ffmpeg -i soundbar.ac3 -c:a copy -f spdif soundbar.spdif
```

These commands create files only. An S/PDIF file still needs a compatible bitstream-aware output path; playing its raw carrier as ordinary audible PCM is not a decoder test.

## Hardware experiment and fallback

First prove a known AC-3 channel-identification file through the actual adapter, with the bar recognizing Dolby Digital and each decoded channel landing where expected in a fixed sound mode. Then prove simultaneous USB PCM playback with measured offset and long-run clock stability. Compare with the stereo baseline for sound quality and coverage before spending effort on a complex live encoder graph. Maintain stereo PCM as the simpler fallback.

No calibrated measurement microphone is available: the host has an iPhone. Use a fixed-position, continuous phone recording of known timed test signals for relative arrival-time comparisons, plus a measurement-mode app with automatic gain control disabled for rough relative levels. Frequency-response conclusions remain approximate; use conservative broad EQ adjustments and listening checks across the room. No phone recording, live calibration, upmix choice or output backend has yet been implemented.
