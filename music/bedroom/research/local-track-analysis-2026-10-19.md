# Local audio for adaptive DJ analysis

Researched October 19, 2026. This is a source/analysis proposal for the adaptive bedroom system, not a download or completed audio audit. No audio was downloaded, purchased, decoded or analyzed in this pass. A bounded search under `music/`, including ignored files, found no MP3/WAV/FLAC/AIFF/M4A audio. Other personal folders were not inventoried. `ffmpeg` and `ffprobe` are installed under `/opt/homebrew/bin/`.

## Why actual files change what we can do

Spotify/ReccoBeats catalog fields describe a recording overall. An early exit needs to know what is happening **at that point**: first downbeat, current phrase, breakdown versus drop, vocals, clean drum region and suitable next transition. Local files also let us analyze the exact edit and rehearse without another service's buffering or availability. This is the architectural reason to prefer local audio for the adaptive prototype.

| Analysis | Use in the DJ policy | Limit |
|---|---|---|
| Duration, codec/tags, checksum and version identity | Bind a local file to the approved recording and its saved cue map | Filename/title alone is not version proof; radio edits and extended mixes differ |
| Beat grid, downbeats and tempo over time | Schedule transitions on musical boundaries and detect 87/174 BPM ambiguity | Verify grids by listening, particularly breakbeat/DnB and sparse intros |
| Key/scale and confidence | Rank harmonically plausible candidates | Treat as a hint; modulations, percussion and low-confidence estimates need overrides |
| Integrated/short-term loudness, peaks, silence | Calibrate gain and avoid dead space or clipping | Does not measure room loudness or audience excitement |
| Section boundaries, vocal/drum activity and an energy curve | Find likely mix-in/out regions, avoid cutting just before a payoff, shorten repetitive tails | Section labels/models are fallible and genre-dependent |
| Timbre/rhythm embeddings and host tags | Select a compatible but varied next record | Similarity is not evidence that the room likes it |

Do not call a custom loudness/onset score “Spotify energy” or manufacture equivalent danceability/valence/acousticness/speechiness numbers. Keep provider descriptors, measured file features, editorial labels and human feedback as separate fields with source/version/confidence.

## Practical analyzers

- **DJ application analysis first:** import a small exact-version test crate into the candidate DJ engine. It owns its beat grid, cue interpretation, gain and playback behavior. Export/read supported metadata only; do not rewrite undocumented DJ database formats as an integration shortcut.
- **Essentia MusicExtractor:** its documented output includes beat positions/BPM, multiple key/scale estimates, EBU R128 loudness, silence, onset and spectral descriptors. Its electronic-music key profile is useful to test for this collection. Save the algorithm version and raw confidence, then compare with the DJ application's grid. [MusicExtractor tutorial](https://essentia.upf.edu/tutorial_extractors_musicextractor.html) · [Descriptor reference](https://essentia.upf.edu/streaming_extractor_music.html)
- **All-In-One:** the upstream project jointly estimates tempo, beats/downbeats and labeled structural sections. Use these as candidate transition boundaries, not guaranteed techno drops. The upstream benchmark uses a different machine; it is not a speed guarantee for this Mac. [Upstream code/API](https://github.com/mir-aidj/all-in-one) · [Research paper](https://arxiv.org/abs/2307.16425)
- **Apple Silicon option:** an independent MLX port exists for All-In-One. It is a community port, not evidence that the upstream model or our pipeline has been tested here. Compare results/runtime on the same crate before choosing it. [Port and platform notes](https://github.com/ssmall256/all-in-one-mlx)

Essentia publishes macOS installation/download paths, but the Python/ARM/model dependency combination still needs an isolated environment test. Do not modify the party's Python or DJ setup just to satisfy an old installation snippet. [Installation documentation](https://essentia.upf.edu/installing.html) · [Current downloads](https://essentia.upf.edu/download.html)

## Getting files without confusing streaming and ownership

The host is open to downloading playlist tracks for local analysis. That makes a file workflow possible; it does not identify which downloads are already owned or available. Use existing owned files, purchased store downloads or explicitly downloadable artist/label files. Spotify remains the recording/approval manifest. Spotify DJ integration is online-only; its app downloads are not an exported local-file crate for arbitrary analysis. [Spotify DJ support](https://support.spotify.com/us/article/dj-integration/)

Bandcamp provides purchased tracks in formats including FLAC, WAV, AIFF and MP3 320. Its purchase/collection download path can recover already-owned files. Other stores such as Beatport are candidates when the exact release is available; do not assume every Spotify recording is sold there or that an alternate extended mix has already been approved. [Bandcamp download formats](https://get.bandcamp.help/en/articles/15263234-in-which-formats-can-i-download-my-purchases) · [Re-download purchases](https://get.bandcamp.help/en/articles/15263192-can-i-re-download-my-purchases)

No need to buy the whole candidate pool to choose software. Start with 10–12 approved exact files covering 4/4, DnB, vocal overlap, a breakdown and a difficult master/gain contrast. The bedroom candidates are still unapproved. Keep a manifest of recording URI/ISRC, artist/title/mix, source, acquisition status, local path, checksum, duration comparison and approval; mark missing/mismatched versions explicitly. Costs and any final purchase remain to be reviewed from an actual list.

Keep source audio and machine outputs outside Git, for example inside the already ignored `music/playlist-lab/.local/audio/` and `.local/audio-analysis/` runtime directories. Do not mount them into the public review service just to run the DJ; the playback supervisor should remain local. Cue maps must be tied to file hashes, so a replacement file cannot silently reuse shifted timestamps.

## Prototype acceptance

1. Bind each test file to an approved exact recording; resolve alternate versions explicitly.
2. Analyze it offline, store source/version/confidence and inspect cue candidates.
3. Audition every proposed early exit and difficult pair in the chosen DJ application.
4. Benchmark CPU/memory while Jellyfin is active. Precompute heavy analysis/stems before the party; avoid putting an LLM or stem-separation batch job on the audio timing path.
5. Only add files to the adaptive eligible pool once the engine can load them deterministically, timing/gain are checked and a fallback exists. A JSON descriptor or Spotify Keep alone does not satisfy these gates.

Remaining: choose/test the DJ engine interface, identify the initial owned-file crate, obtain missing exact files and run these tests. No file acquisition or analysis result is claimed by this research note.
