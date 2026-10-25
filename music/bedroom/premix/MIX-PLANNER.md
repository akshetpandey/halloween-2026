# Evidence-informed planning without rendering

October 25, 2026. The host asked to apply the analysis improvements and build/test the system for the final version, without rendering yet. [plan_mix.py](plan_mix.py) now chooses source bodies, repetition cuts, order, transitions, gain and chapter boundaries, then emits a native REAPER JSON/Lua build plan. **It has no render command and does not launch REAPER.** The existing audition/project/audio remains the reference.

## What now changes the plan

- **Timing:** keep the independently measured source tempo, including 174 BPM when model events include half-time beats. Adopt a learned beat phase only when events cluster coherently; use a dominant bar class when supported. Phase uncertainty disables interior splices and selects a short reset. These are inferred grids, not verified musical phrasing.
- **Structure and pacing:** search for bodies around the main energy landmark, including late payoffs in long tracks. Default bodies are 90–210 seconds, targeting about 165 where source length allows. Preserve the strongest energy landmark; remove at most two repeated eight-bar sections only when they are flat, away from a build/drop change, have vocal evidence and quiet cut boundaries, and leave enough music. Adjacent removals coalesce. Missing vocal data does not authorize an interior cut or count as silence.
- **Vocal/tonal handovers:** score candidate body boundaries and paired overlap windows. Avoid active vocal endpoints where alternatives exist; prefer lower simultaneous vocal activity. Use local tonal windows rather than a single global key. Compatible, sufficiently evidenced passages can receive eight-bar blends; uncertain harmony or vocals favors shorter bass swaps/handover. A DnB boundary or excessive tempo gap uses a reset. No key transposition is applied.
- **Loudness:** measure the retained source ranges using FFmpeg `atrim`/`concat` and EBU R128/true peak to a null sink. Match those bodies toward −14 LUFS before working master headroom, with at most +3 dB boost and a −3 dBTP source peak cap. Excessive attenuation/nonfinite/near-silent inputs fail. The native plan retains −6 dB working master headroom. Final loudness and stretch/EQ/overlap peaks still require a later render measurement.
- **Sequence:** group tech house, acid, techno, trance and DnB into coherent lanes, then use a bounded deterministic search over tempo, local harmony, vocal activity and artist spacing. Index chapters at lane changes or roughly 90 minutes. This is a practical planning heuristic, not a globally optimal or fully auditioned nine-hour set.

The compiler uses the already tested native warp/fade/EQ contract. It holds one identical tempo through matched overlaps, ramps only outside them, and rejects rates outside **0.97–1.03**. Source offsets, cuts, gains, bass handovers, tempo markers and chapter timing remain explicit and editable in generated artifacts. The new plans have not been built/read back inside REAPER during this pass.

## Authority and reproducibility

Both test and production modes read **current host bedroom Keeps** through the read-only approved-pool logic. Cuts override duplicate Keeps. Production additionally requires the exact acquisition/version file map, hash and catalog-duration checks. Original and decoded analysis files must be tied to that verified acquisition; source/model IDs, hashes and decoded duration are rechecked. The generic analyzer can now decode an acquired file to a separate working WAV without replacing the acquisition.

Approvals and file bindings are re-read after measurements, before plan emission. `validate_current` also checks current votes/acquisitions, frozen analysis/model/map fingerprints and the native manifest before a future build/render stage. A later Cut, replaced source, edited model report or altered native plan requires rebuilding. Future render integration must call this validator immediately before launching the renderer. The low-level historical audition renderer is not the production approval gate.

An empty or partial crate records blocked approvals. Even a plan longer than nine hours keeps `party_ready: false`: planned duration, actual rendered time, musical checks and hardware rehearsal are different gates. Engineering audition copies cannot pass production validation. No votes, Spotify collections, Access settings or original music files are changed.

## Commands

Use the existing optional ML environment from [audio intelligence](AUDIO-INTELLIGENCE.md). Test on the existing audition cache, automatically selecting only current Keeps:

```sh
NUMBA_CACHE_DIR=/private/tmp/hollow-numba-cache MPLCONFIGDIR=/private/tmp/hollow-mpl music/bedroom/premix/.local/ml-venv/bin/python music/bedroom/premix/plan_mix.py --audition-sources --output music/bedroom/premix/.local/planner-proof
```

For production, populate a private acquisition map in the [approved-crate format](README.md), then analyze verified files, run the local models (including vocals for each available source) and plan in one command:

```sh
NUMBA_CACHE_DIR=/private/tmp/hollow-numba-cache MPLCONFIGDIR=/private/tmp/hollow-mpl music/bedroom/premix/.local/ml-venv/bin/python music/bedroom/premix/plan_mix.py --file-map music/bedroom/premix/.local/production-files.json --refresh-analysis --output music/bedroom/premix/.local/production-planning
```

To reuse that production analysis, pass its `evidence/analysis.json` and `evidence/intelligence/report.json` with `--analysis` and `--intelligence`, the same `--file-map` and output directory. Changed sources/models invalidate cached evidence; retained-range measurements cache by source hash and exact ranges. `--database` selects an explicit authoritative snapshot for isolated tests. Exit 2 means no eligible tracks were planned; inspect `mix-plan.json` for blocked entries.

Validate a saved production plan against current state, still without rendering:

```sh
music/bedroom/premix/.local/ml-venv/bin/python music/bedroom/premix/plan_mix.py --validate music/bedroom/premix/.local/production-planning/mix-plan.json
NUMBA_CACHE_DIR=/private/tmp/hollow-numba-cache MPLCONFIGDIR=/private/tmp/hollow-mpl music/bedroom/premix/.local/ml-venv/bin/python -m unittest discover -s music/bedroom/premix -v
```

Outputs: private `mix-plan.json`, retained-range loudness cache, and `native/planned-chapter-plan.json` plus a run-specific Lua build script. The native helper creates an empty render directory, but no `.rpp`, mix WAV, MP3 or other audio export is produced. Keep all runtime artifacts under ignored `.local/`.

## Verification and remaining work

The [sanitized planner results](mix-planner-results-2026-10-25.json) record the current test plan and gates. A real dry run selects six Keeps from the twelve-source audition cache, planning **14:28.49**; 19 other approved tracks lack this test's source/evidence. The modeled Mau P → John Summit central vocal overlap falls from **43.5% to 0%** through different retained windows, with the same four-bar shared-tempo blend. That measures candidate activity, not audible improvement or complete lyric phrases. Unknown voices and residual boundary activity remain visible in the report.

**68 tests passed** without skips. Synthetic/integration checks exercise corrected phase, DnB half-time, uncertain bars, repeated sections, vocal hooks/builds, late payoffs, local keys, safe gains, exact overlap geometry, missing vocals, changed files/durations/model bindings/native plans, a Cut during planning, and a Cut after planning. Verified procedural files exercise the production route; missing acquisition bindings correctly block the real library. Cached real planning repeats the same decisions/gains/timing in about **1.94 seconds**; a 60-track synthetic descriptor check takes **0.33 seconds**, which is not an audio-model or musical-quality benchmark. Original audition master/MP3 hashes remain unchanged. **No new mix was rendered; no source audio was uploaded or acquired; $0 spent.**

Next obtain/bind verified production sources, rerun planning on the expanding approved pool, inspect unresolved timing/phrase/vocal cases, then test native build/readback and eventual sound. Learned semantic section labels and lyric transcription remain optional additions. Final nine-hour assembly, actual loudness/peak checks, FLX4/speakers and combined playback rehearsal remain.

References: [FFmpeg audio filters](https://ffmpeg.org/ffmpeg-filters.html) · [REAPER native API](https://www.reaper.fm/sdk/reascript/reascripthelp.html) · [Earlier native mechanical proof](REAPER-PROOF.md).
