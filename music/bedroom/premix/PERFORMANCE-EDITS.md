# Featured DJ edits · October 30

The host approved the smooth 1:43 transition, then asked for occasional more playful, skilled DJ moments using loops, beats and effects. The resulting **90-second performance edit is now host approved**: on October 30 the host said “Sounds good” and requested applying the approach variably and occasionally while completing the full Hollow mix. The accepted examples remain unchanged. [Results](performance-results-2026-10-30.json) · [Full-set status](FINAL-SET.md).

## The edit

Shared tempo stays 149 BPM with pitch preservation. The outgoing original stereo carries its final sixteen bars. Its musical lead clears before the incoming hook is teased over separated percussion; two complete melodies/vocals never compete. The incoming original stereo resumes at its actual bass return, after omitting the entry breakdown.

| Sample time | Action |
|---|---|
| 0:25.77 | Outgoing lead clears; its drums continue |
| 0:26.98 | Incoming isolated hook pickup, landing on the next bar |
| 0:32.21 | Four-bar percussion roll begins; loop halves from one beat to ½, ¼ and ⅛ beat |
| 0:33.83 | Hook ends, followed by three quiet one-beat-spaced filtered echoes |
| 0:38.26 | One-beat low-end pause while the high-passed roll continues |
| 0:38.66 | Incoming original drop; quiet percussion echo and low-cut drum tail |
| 0:45.10 | Incoming solo |

The roll uses sixty native REAPER slices from an incoming drum beat. Only that layer gets a 400→2,200 Hz high-pass sweep, with an 8 kHz low pass. Echoes are wet-only, tempo-locked and short; the hook echo clears before the incoming full musical lead. Effects are derived from the approved recordings, not generic added samples.

Crossfader teaches progressively shortening loops to build tension before releasing the next track, along with isolated-vocal cues, fader cuts and short effect tails. This is our own percussion-based arrangement of those ideas, not a reproduction of its example. [Creative transition instruction](https://blog.wearecrossfader.co.uk/blog/12-high-energy-dj-transitions/).

## Use across the full set

Keep the accepted clean single-lead blend as the default. Proposed editorial spacing is roughly **one featured moment every 15–25 minutes**, adjusted for the music, rather than adding a roll to each join. Vary the devices: a hook tease into a drop swap, a short filtered percussion roll, a brief echo-out into a new groove, or an authored loop-based reset-tempo change. A source needs a suitable isolated hook/percussion cue and a worthwhile incoming drop. Do not force a feature onto a poor pair.

Let original drops play afterwards. Avoid repeated build/drop tricks on adjacent tracks, effects across an entire track, sustained stacked bass, and lyrical fragments selected without checking context. No tone-play, key shift or vocal mashup is claimed here. Larger tempo-change bridges remain separate unfinished work in the full-set handoff. This showcase is implemented; full-programme placement is not yet compiled or rendered. Inserted effect/loop seconds cannot pad the nine-distinct-hours requirement.

## What passed

- REAPER native readback: two raw tracks / 61 cue items, then eight final component tracks. Pitch-preserved original bodies change rate by less than 0.7%.
- Actual native dry-roll repetitions match the first realized loop in each stage within **one 48 kHz sample (0.0208 ms)**; minimum waveform correlation 0.9875. This establishes repeat consistency, not an independent downbeat or musical-quality certification.
- Corrected source separation and effect prints retain floating-point peaks. Native intermediate render has 12 dB headroom before restoring gain in floating point. Native raw/final WAVs have no full-scale sample hits. Initial PCM intermediate experiments are superseded and must not be distributed.
- Delivered MP3: **90.201 seconds, stereo 48 kHz / 320 kbps, −16.7 LUFS / −2.1 dBTP**, no unexplained silence. Every used original/stem/print hash and current shared Keep is rechecked around native rendering.
- Five new tests cover exact roll duration, invalid stage rejection, detection of an actually shifted repeat, bass removal without changing frame count, and wet-only beat-spaced echo decay. Complete premix suite: **139 tests passed**.

Measurements cannot establish whether an edit feels exciting. The host has now approved both short examples; that does not establish listening approval of the uncompleted full set. No hardware routing, physical playback, purchases or account changes were made.

## Runtime and reproduction

Audio and private evidence are ignored under `premix/.local/final-hollow-2026-10-29/revision-09/`. Listen to `performance-03/Hollow-featured-transition.mp3`; its editable project is `performance-03/native/featured-transition.rpp`. The first two experiments are superseded. The separate `float-stems/` cache preserves the accepted sample's older cue files.

From this folder, using the installed production environment and isolated no-device REAPER profile:

```sh
PYTORCH_ENABLE_MPS_FALLBACK=1 OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 \
  .local/production-venv/bin/python prepare_research_cues.py \
  --state .local/final-hollow-2026-10-29 \
  --output .local/final-hollow-2026-10-29/revision-09/float-stems --float-stems

.local/production-venv/bin/python performance_showcase.py \
  --state .local/final-hollow-2026-10-29 \
  --stems .local/final-hollow-2026-10-29/revision-09/float-stems \
  --output .local/final-hollow-2026-10-29/revision-09/performance-new
```

Local Metal/native access is required; no physical device output is used. Choose a fresh audition output folder. DSP helpers are reusable in `dj_performance_fx.py`; final-set integration must retain the source/approval/timing gates.

**Full-production follow-up discovered here:** old research and current whole-library drum parts were printed PCM24 without normalization, so some separated peaks clip before mixing. The showcase repairs this in a separate floating-point cache. Audit/regenerate affected whole-set drum parts with preserved headroom before final native rendering; do not accept the old clipped files merely because their hashes match. The running source cue pass is left unchanged to preserve its valid timing/profile work.
