# Phrase alignment and DJ transition automation

**October 29 correction:** this page records engineering capabilities, not accepted production mixing. Both subsequent excerpts failed host review. The [researched transition standard](TRANSITION-RESEARCH.md) supersedes generic midpoint bass swaps, inferred phrases without local support, and automatic reset fallbacks.

October 25, 2026. The host authorized these four improvements, delegated the decisions and deferred rendering. They extend the [planner](MIX-PLANNER.md) using existing local tools. No purchase, new music acquisition, audio upload or vote change is involved.

## Implemented decisions

- **Phrase alignment:** [arrangement.py](arrangement.py) measures energy, spectral balance and transient density on each actual source bar, independently of the old eight-bar feature bins. Local arrangement changes guide entries/exits. An eight-bar phase requires at least three recurring changes; uniform material cannot invent it. Blends penalize mismatched phase; eight-bar overlaps also require positive phrase, harmony and vocal evidence. Repetition splices follow supported phrase phase and protect internal arrangement changes. These are hypotheses, not human-verified phrases or semantic build/drop labels.
- **Loop bridges:** a two-bar outgoing tail may repeat twice for a four-bar transition bed. It needs similar rhythm/spectrum/level, low harmonic content, known quiet vocals, supported bars and no internal arrangement change. Unknown vocals, a build or a tonal lead reject it. A bridge must score better than ordinary handovers. Explicit repeated items use 5 ms preceding handles/fades while preserving cycle/beat timing. Loops are optional, and extra bridge seconds are conservatively deducted from the nine-hour planning gate.
- **Three-band EQ:** ReaEQ provides a 180 Hz low shelf, broad 1.2 kHz mid band and 6 kHz high shelf. Bass exchanges around the blend midpoint with up to −24 dB attenuation; highs hand over gently at −3 dB. Mid attenuation responds to tonal/vocal clashes, up to −6 dB on the outgoing track. Bands return to flat for solo playback. This is not a brickwall isolator or a sweep-filter effect.
- **Vocal ducking:** [mix_automation.py](mix_automation.py) maps vocal candidates through exact cuts, stretch markers and loop repetitions. When both voices overlap, the incoming lead has consistent priority and the outgoing **stereo track** ducks up to 4.5 dB: 60 ms anticipation/attack, 80 ms hold, 250 ms release. Detections do not stack gain reductions. Missing vocal evidence stays unknown. This is offline activity-driven automation, not isolated vocal-stem mixing or lyric recognition.

Track envelopes combine linear fades and ducking across multiple source items, including measured track gain. Item fades handle splice/loop seams. Beat matching, pitch preservation, restrained tempo rates and intentional DnB resets remain. No key transposition is added.

## Build and test without rendering

[native_build.py](native_build.py) builds and reads back a saved `.rpp` in a separate REAPER instance using a copy of the initialized **no-hardware** task profile. It never starts playback or calls the renderer. Production approvals/files are validated before and after the build. `--engineering` allows the existing Keep-filtered audition route, not production approval. Source hashes and the manifest are checked; only the launched child is terminated.

```sh
music/bedroom/premix/.local/ml-venv/bin/python music/bedroom/premix/native_build.py --procedural-proof
music/bedroom/premix/.local/ml-venv/bin/python music/bedroom/premix/native_build.py --mix-plan music/bedroom/premix/.local/transition-upgrades/mix-plan.json --engineering --output music/bedroom/premix/.local/native-keep-plan
```

Generate the latter input with `plan_mix.py --audition-sources --output music/bedroom/premix/.local/transition-upgrades`, using the cache environment variables in [MIX-PLANNER.md](MIX-PLANNER.md). Requests are single-use: regenerate after a completed/cancelled build. Projects, caches, preferences and audio remain ignored.

Readback checks source paths, offsets, lengths, fades, pitch preservation, stretch markers, enabled EQ types/frequencies/Q and actual plugin dB readouts. Volume points must retain the measured gain; lanes must be active in Read mode without a global automation override. **Native testing caught inactive built-in volume lanes despite saved points.** The builder explicitly enables them using REAPER's native action; an inactive lane now fails verification.

## Evidence and limits

[Sanitized results](transition-automation-results-2026-10-25.json) record the checks. The procedural proof exercises a loop bridge and a separate overlapping-vocal handover using original generated sources and declared test activity. It proves timeline/automation mechanics, not learned singing detection or musical quality.

The real six-Keep engineering plan is **14:50.60**, with measured local boundaries and one supported global eight-bar phase. It selects **no loop bridge and no vocal duck** with available evidence: a quieter window avoids the known vocal overlap, and most sources still lack vocal analysis. Do not imply these effects were forced onto every track or auditioned for sound quality.

The host-liked master/MP3 remain unchanged; no new mix WAV/MP3 is produced. Complete vocal evidence, unresolved phrase/grid cases, listening, later rendered peaks/loudness, production acquisitions, nine-hour assembly and physical playback rehearsal remain. The agent owns the editing decisions; no per-join host queue.

References: [REAPER API](https://www.reaper.fm/sdk/reascript/reascripthelp.html) · [ReaEQ](https://www.reaper.fm/reaplugs/) · [librosa HPSS](https://librosa.org/doc/0.11.0/generated/librosa.decompose.hpss.html).
