# Grove selection diagnostic — no batch published

These scripts support the [October 30 reassessment](../grove-selection-reassessment-2026-10-30.md). `grove21` is a research folder, **not a published batch ID**. The fixed selector failed validation. The private 14-recording slate is not import-ready and must not be published on the strength of these scores.

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
