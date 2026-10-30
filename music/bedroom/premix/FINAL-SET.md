# The Hollow · final set production

Started October 29, 2026, America/New_York. **In progress, not yet a finished or playback-ready mix.** The host authorized acquisition, analysis, sequencing, loops, cuts, transitions and rendering from the approved bedroom library, building on the existing REAPER work. Production decisions remain delegated.

## Authority and sources

Use current canonical shared bedroom Keeps, host priority, through the read-only preparation bridge. The starting inventory is **222 tracks / 13:08:45 raw**; the main Spotify playlist was already synced. No new selections or vote changes are part of this production pass.

`acquire_set.py` retrieves public, unprotected artist/label/distributor YouTube audio, checking artist/title/version qualifiers and catalog duration before creating a hash-bound file map. Originals, provider metadata and all derived music stay under ignored `.local/final-hollow-2026-10-29/`. Spotify audio, offline caches, browser cookies, DRM bypass and purchases are not used. These are compressed public-stream sources, **not purchased masters or evidence of a download/reuse license**. Metadata agreement is documented version evidence, not acoustic or human listening confirmation; unresolved versions remain blocked.

## Production changes

- Canonical Spotify-URI track IDs now have portable, validated file keys, without changing review IDs.
- A shared float32 PCM decode lets the model and source analyzer read the same audio and prevents compressed-container loader failures. Source changes invalidate the decode cache.
- `produce_set.py` adds a model-derived tempo prior for sources without catalog BPM, then refines timing against independent onset measurements. Beat This, Essentia and Demucs remain local; source/model/package hashes bind evidence. Full vocal activity analysis is requested. Unused vocal WAVs are removed after their activity report is cached to conserve disk.
- Metal GPU access is available outside the sandbox and blocked inside it. The older PyTorch 2.5.1 failed on an MPS convolution limit; a separate production environment uses PyTorch/torchaudio 2.6.0, preserving the old environment. The production worker now successfully runs Beat This and Demucs on Metal, with CPU fallback for unsupported operations. No music is uploaded. [PyTorch issue and fix](https://github.com/pytorch/pytorch/issues/152278).
- The planner has optional full-programme pacing, bounded to 64 candidate bodies per track, preserving longer approved tracks where useful. Existing short-demo behavior remains the default. Actual finished duration must still meet nine hours without loop padding.
- Existing phrase alignment, loop bridges, three-band EQ and vocal ducking remain the transition engine. Native automation must be in Read mode, with no global override. Final delivery will use a fixed sequence with shuffle/loop/live Auto DJ disabled.

## Expected delivery

An editable REAPER project and bound edit manifest; continuous lossless master; sequential chapter files; MP3 fallback; timestamped tracklist and M3U8; short representative preview; measured duration, peaks/loudness, silence and transition checks. Chapter rendering avoids the ordinary WAV 4 GB boundary. Physical output testing belongs to the separate routing task and cannot be inferred from an offline render.

## Current commands

```sh
python3 music/bedroom/premix/acquire_set.py --output music/bedroom/premix/.local/final-hollow-2026-10-29 --acquire
NUMBA_CACHE_DIR=/private/tmp/hollow-numba-cache MPLCONFIGDIR=/private/tmp/hollow-mpl PYTORCH_ENABLE_MPS_FALLBACK=1 music/bedroom/premix/.local/production-venv/bin/python -u music/bedroom/premix/produce_set.py --output music/bedroom/premix/.local/final-hollow-2026-10-29 --watch
```

The second command needs local Metal device access for acceleration. Acquisition and analysis are resumable; `--watch` processes newly acquired sources while the bounded download queue runs. Rendering integration and delivery checks are the next production stage, not a claim these files already exist.

Checkpoint verification: **88 Python tests passed**, plus native REAPER 7.82 build/readback of three original procedural tracks, five items, nine active EQ bands and 780 active volume-envelope points. Repeat is disabled and the global automation override is clear. No mix has been rendered at this checkpoint.

Spotify offline-download check: the [Spotify cache is encrypted and app-only](https://community.spotify.com/forum/en/discussion/5536551/where-can-i-find-my-downloads-and-i-wont-to-copy-them-to-my-thumb-drive); [ordinary MP3 export is unsupported](https://community.spotify.com/forum/en/discussion/6666446/can-i-download-songs-directly-to-my-computer-and-save-them-as-mp3-files). The production source path remains separate audio files.
