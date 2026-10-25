# Audio evidence for better cuts and transitions

October 25, 2026. The host authorized free local models, code and online data to improve mixing. Continue the existing REAPER production route and delegated editing decisions. Actual audition files are available; host track votes still decide what enters production. Models do not confer approval.

| Evidence | Mixing decision it supports | Current route |
|---|---|---|
| Beats and downbeats | Align rhythms and bar starts; expose a wrong bar anchor before splicing | **Beat This final0** predictions compared with the existing onset grid |
| Phrase/section changes and repetition | Preserve a build/drop, remove a repeated plateau, choose a musically useful exit | Existing eight-bar texture/chroma/energy features; phrase phase remains provisional |
| Vocal activity | Avoid two lead vocals together and flag cuts through a vocal passage | **Demucs htdemucs** vocal separation, then short-window activity measurements |
| Local key/harmony | Choose compatible passages and avoid sustained melodic clashes | **Essentia KeyExtractor**, globally and per eight-bar window |
| Loudness, bass and density | Match the shortened bodies and hand over the low end cleanly | Existing FFmpeg LUFS/true-peak and RMS/lowband analysis; retained-section gain refinement remains |
| Timestamped words/lyrics | Resolve an ambiguous vocal cut, retain a complete line or deliberate refrain | Optional transcription/alignment; not installed or tested in this pass |

**Prioritize musical timing and vocal activity over collecting full lyric sheets.** Untimed lyrics cannot identify a safe cut in an exact radio edit. A repeated phrase can be the hook, so similarity is a flag for editorial judgment rather than an instruction to delete it. Catalog energy, valence and danceability help selection; they cannot locate a drop or a word boundary in the source audio.

## Implemented evidence pass

[audio_intelligence.py](audio_intelligence.py) reads the existing analysis and exact decoded WAVs, checks their hashes/durations, and writes an independent report under ignored `.local/actual-batch-01/intelligence/`. It compares model beats/downbeats with the existing grid, estimates global/local tonal profiles, optionally separates vocals, and annotates the current cut points and joins. It never rewrites the original grid, cut decisions, project, render, Spotify playlist or review database.

Model weights, dependencies and source/baseline data bind each cache entry. Vocal stems are separately reusable when rhythm/tonal analysis changes, provided source, model/package evidence and the stored stem hash match. Inputs that changed since analysis fail instead of inheriting old estimates. Models and music stay local; no audio is uploaded to an analysis service. Code/weights came from published packages and the model projects' official distribution hosts. TLS certificate verification stays enabled.

Beat This events have 20 ms quantization. Tempo is estimated across eight predicted beats, avoiding the single-interval median's bias (a 123 BPM fixture otherwise reads 125). Tempo/phase disagreement, missing/half-time beats and unstable model bar phase stay visible. The current engineering thresholds are **not calibrated model confidence or verified downbeat accuracy**. Recognizing a bar start also does not establish the start of an eight-bar musical phrase.

Demucs vocal-stem energy is an **activity candidate**, not word recognition. Synths and drums can leak; a quiet stem cannot prove a cut is safe. The join report compares candidate activity at the same overlap time, maps both source rates and evaluates the central 60% of a blend. It leaves missing vocal evidence unknown. Key strength is a tonal-profile score, not a correctness probability; compare the retained windows instead of blindly sorting by one global key or transposing every recording.

## Tested results · October 25

[Sanitized measurements](audio-intelligence-results-2026-10-25.json) record the source/model hashes and exact package versions. **12/12** audition sources now have beat/downbeat and global/local tonal estimates; **two** full files have vocal analysis. All **12 interior cuts and 11 joins** are annotated. Ten tracks raise a timing or bar-phase review flag; that is disagreement between estimates, not proof that ten recordings or the existing mix are wrong.

Three useful findings:

- Mau P's predicted bar start differs from the current anchor by about one beat in many sections, with some model phase instability. The existing interior cut has candidate vocal activity on both sides, so a bar-aligned splice alone cannot establish a complete vocal phrase.
- Dimension's model events mix approximately half-time and full-time intervals: about **57%** are near twice the baseline beat spacing and **41%** near the baseline spacing. A single reported model BPM would be misleading; retain the 87/174 interpretation check rather than fitting the whole song to its model median.
- “Drugs From Amsterdam” → “Deep End” is the one join with both vocal analyses. Candidate vocal activity overlaps for **43.5% of the central blend**. Inspect a quieter vocal window or a different handover; this is not an audible-clash verdict, because separation can leak and the original blend includes gain/EQ changes.

The unchanged full-cache repeat passed with roughly 0.0–0.1 seconds per source after model initialization. **47 tests passed**, including tempo quantization, metrical disagreement and simultaneous-versus-alternating vocal overlap cases. Ruff lint/format checks pass. The original audition master and MP3 hashes still match the committed October 19 results. No improved render, word transcription, human-verified downbeat or hardware playback is claimed. **$0 spent**, no audio uploaded and no new music acquired.

## Run locally

Use a separate optional environment, preserving the earlier analysis/render environment:

```sh
UV_CACHE_DIR=/private/tmp/hollow-uv-cache uv venv --python 3.12 music/bedroom/premix/.local/ml-venv
UV_CACHE_DIR=/private/tmp/hollow-uv-cache uv pip install --python music/bedroom/premix/.local/ml-venv/bin/python -r music/bedroom/premix/requirements-intelligence.txt
NUMBA_CACHE_DIR=/private/tmp/hollow-numba-cache MPLCONFIGDIR=/private/tmp/hollow-mpl music/bedroom/premix/.local/ml-venv/bin/python music/bedroom/premix/audio_intelligence.py --vocals hollow-01-002 --vocals hollow-01-007
NUMBA_CACHE_DIR=/private/tmp/hollow-numba-cache MPLCONFIGDIR=/private/tmp/hollow-mpl music/bedroom/premix/.local/ml-venv/bin/python -m unittest discover -s music/bedroom/premix -v
```

`--only ID` narrows the sources; `--vocals ID` enables the more expensive separation for that selected source. The default reads the twelve-source audition analysis. Partial runs replace the aggregate report with the selected scope; each source cache remains. The script downloads missing official weights into ignored `.local/ml-models/`. Reports/stems are private runtime outputs, not production masters or new host Keeps. Downloads are reproducible by version and recorded hashes, but upstream model replacement needs review.

## Production use and next refinements

Use the report to revise phrase anchors and propose safer vocal/tonal partners before changing a timeline. Preserve the host-liked render as a reference. Correct the evidence disagreements, replace now-Cut recordings and let stronger approved tracks develop in coherent chapters. Then measure loudness on the actual retained bodies/overlaps and render a short comparison before the long master. The agent handles these decisions; no per-edit host approval queue.

**All-In-One** is a useful next candidate for learned section boundaries/labels; it has not been installed or validated here. Its pop-style verse/chorus labels would remain hypotheses on techno and DnB. Optional local Whisper/faster-whisper transcription could help when a vocal boundary is ambiguous, preferably on isolated vocals; no full lyric collection or claimed accurate singing transcription is part of this pass. Models complement source/arrangement checks and listening; their output alone does not establish musical quality or nine-hour readiness.

Primary references: [Beat This implementation and MIT code/weights](https://github.com/CPJKU/beat_this) · [Demucs source separation](https://github.com/adefossez/demucs) · [Essentia KeyExtractor](https://essentia.upf.edu/reference/std_KeyExtractor.html) · [All-In-One structure model](https://github.com/mir-aidj/all-in-one) · [Whisper](https://github.com/openai/whisper) · [faster-whisper](https://github.com/SYSTRAN/faster-whisper).
