# Historical preview-model experiment — not the selection workflow

These scripts preserve the [earlier October 30 numerical detour](../grove-selection-reassessment-2026-10-30.md). The host explicitly corrected it: no predictive model was requested. Its failed numeric publication gate is **not a current curation rule**. Do not use these scores to select or block a batch. [Grove 21 · Four songs with character](../october-grove-batch-21.md) was subsequently published through normal editorial research. The folder name predates that actual batch; the old 14-recording research slate is not its tracklist.

Inputs are the private read-only canonical snapshot in `music/playlist-lab/.local/grove21-2026-10-30/`. Never copy source Likes, credentials, individual histories or audio into this directory or Git. All provider caches, audio, detailed results and snapshots stay in that ignored state. No script writes hosted state or Spotify.

`validate_catalog.py` uses NumPy/scikit-learn. `preview_probe.py` uses Python's standard library and Deezer metadata plus its public 30-second preview URLs. `validate_previews.py` additionally needs librosa, SciPy and `ffmpeg` on PATH. The session used the existing local scientific Python environment without changing Hollow code or dependencies.

From repository root, with the private snapshot already present and an appropriate Python environment:

```sh
python music/living-room/grove21/validate_catalog.py --state music/playlist-lab/.local/grove21-2026-10-30
python music/living-room/grove21/preview_probe.py --state music/playlist-lab/.local/grove21-2026-10-30
python music/living-room/grove21/validate_previews.py --state music/playlist-lab/.local/grove21-2026-10-30
```

The network probe caches responses/previews; a changed catalog can change matching on a fresh fetch. Normalized title/version, primary artist and duration within three seconds are bounded metadata checks, not master fingerprints. Excerpts may cover different sections. The model uses signal summaries, not listening judgments, lyrics, editorial explanations or artist identity. Full arrangements and hook/vocal appeal remain outside these measurements.

The temporal split, deterministic Cut sample, fixed models and failed gate are documented in the assessment. Do not tune against the already inspected holdout and present it as a fresh validation. [Aggregate verification](verification.json) contains counts and outcomes only; detailed labels remain private.
