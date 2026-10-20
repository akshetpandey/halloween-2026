# The Hollow · real-track audition 01

October 19, 2026. **Private 12-track engineering audition, not a party-approved set.** The host explicitly requested selections from the bedroom batch and delegated cuts/transitions. This allows this audition to use unrated candidates; no Keep/Cut votes, Spotify playlist or hosted review data were changed. The normal [approved-crate exporter](README.md) remains host-Keep-only.

The editable REAPER timeline is **19:42.06**. Its 12 recordings total **50:53.89** before selection; **21:21.69** remains before overlaps/rate changes. Twelve interior jumps plus lead-in/tail trims remove long weak sections and repeated passages. Feature similarity suggests repetition; it does not establish that an arrangement is boring or a hook is expendable.

## Listen locally

Files live under the ignored `music/bedroom/premix/.local/actual-batch-01/renders/` directory:

- `hollow-audition-01.mp3`: complete 256 kbps audition.
- `hollow-audition-01-preview.mp3`: one continuous four-minute excerpt, beginning inside Your Mind and covering its cuts, Acid Incident and the next acid transition. It is not a montage.
- `hollow-audition-01-dnb-entry.mp3`: one minute around the deliberate trance-to-DnB reset.
- `hollow-audition-01-master.wav`: constant-gain delivery master, stereo PCM24 / 48 kHz.
- `hollow-audition-01.wav`: native REAPER render with extra working headroom.

The `.rpp`, exact-source analysis, readback, error logs and generated Lua are in the parent runtime directory. Actual recordings and derived mixes are **not committed or published**. A fresh clone needs source acquisition; the public repository contains code, pinned metadata/checksums, edit decisions and sanitized results.

## Selection and edits

Times below mark the start of each incoming overlap, rather than the moment that track becomes dominant.

| Order | Incoming time | Recording | Actual-file BPM estimate |
|---|---|---|---|
| 1 | 00:00.00 | Dom Dolla — Take It | 122.999 |
| 2 | 01:41.09 | Mau P — Drugs From Amsterdam | 124.998 |
| 3 | 03:21.17 | John Summit — Deep End | 126.001 |
| 4 | 05:00.43 | Adam Beyer, Bart Skils — Your Mind - Radio Edit | 125.999 |
| 5 | 06:46.74 | Reinier Zonneveld — Acid Incident | 128.000 |
| 6 | 08:31.34 | 999999999 — X0004000X | 133.000 |
| 7 | 09:58.65 | Charlotte de Witte — Sgadi Li Mi | 134.999 |
| 8 | 11:31.30 | Eli Brown — Be The One | 136.001 |
| 9 | 13:03.25 | Armin van Buuren — Communication | 135.995 |
| 10 | 14:34.71 | Push — Universal Nation | 138.014 |
| 11 | 16:12.41 | Sub Focus — Solar System | 174.000 |
| 12 | 17:51.72 | Dimension — DJ Turn It Up | 173.998 |

The [source manifest](audition-01-sources.json) preserves Spotify URI/ISRC, public video URL, title/channel/duration and stream hash. Titles/durations are consistent with the batch entries; neither acoustic fingerprinting nor human confirmation of exact recording identity is claimed. Public streaming copies were acquired with the host-requested yt-dlp fallback. **$0 spent; these are compressed audition copies, not purchased lossless masters or evidence of a download/reuse license.** No Spotify offline files, account cookies or access-control bypass were used. The rejected-timing PvD test source remains ignored and is not in this final twelve.

The [edit decisions](audition-01-decisions.json) bind retained eight-bar indices to each decoded file hash, BPM and provisional anchor. Your Mind and Acid Incident contain two interior jumps each; the other shortened edits are fully enumerated. Charlotte de Witte replaces For An Angel for a darker middle and a steadier measured grid.

## Mixing method and limits

During an overlap, both tracks use the identical tempo. Bar-by-bar stretch markers raise the pace only outside those blends; all applied rates stay approximately **0.9812–1.0195**. Four-bar blends keep vocal/melodic overlaps brief; eight-bar blends give the acid/techno and DnB sections room. ReaEQ exchanges the low end near the middle of each blend. Original sources stay unchanged. Pitch is preserved by native élastique 3.3.3 Pro. No automatic key transposition or stems are used.

Universal Nation → Solar System is a short designed reset, with no forced 138→174 beatmatch; Solar System → Dimension is a matched DnB blend. A first clipped render was rejected. The replacement renders with six decibels more master headroom before constant delivery gain; no added compressor or limiter is used for delivery. Silence checks distinguish inserted gaps from existing subsecond rests by mapping the final timing back to the original source PCM. Only quiet source-confirmed rests below 0.8 seconds can qualify; missing clips, loud sources, splice gaps or longer silences fail.

The [analysis code](analyze_audio.py) uses librosa/NumPy/SciPy onset and spectrum features to refine catalog tempo priors. Missing-beat counts and nearby vocal periodicity both produced bad initial grids; the final multi-harmonic fit rejects excessive residual/drift instead. All twelve selected sources pass those mechanical constant-grid checks. Downbeat and eight-bar phase remain **provisional**, and feature-based cut choices are **not an audible listening claim**. This is a sample for judging musical results, not a verified nine-hour programme or a speaker rehearsal. See [librosa onset/beat tracking](https://librosa.org/doc/0.11.0/generated/librosa.beat.beat_track.html) and [ReaScript API](https://www.reaper.fm/sdk/reascript/reascripthelp.html).

Decoded source WAVs are float32 so the streaming decoder's overs survive until gain reduction. Analysis caches are keyed to compressed/decoded hashes, analysis version and prior. Edits fail closed if source or grid changes. The builder reads no review database; votes are not a production side effect.

## Reproduce

Run from repository root. The installed REAPER application and initialized no-hardware task profile are required for native rendering, as in the [synthetic setup proof](REAPER-PROOF.md).

```sh
UV_CACHE_DIR=/private/tmp/hollow-uv-cache uv venv --python 3.12 music/bedroom/premix/.local/analysis-venv
UV_CACHE_DIR=/private/tmp/hollow-uv-cache uv pip install --python music/bedroom/premix/.local/analysis-venv/bin/python -r music/bedroom/premix/requirements-analysis.txt
python3 music/bedroom/premix/acquire_audition.py --acquire
NUMBA_CACHE_DIR=/private/tmp/hollow-numba-cache MPLCONFIGDIR=/private/tmp/hollow-mpl music/bedroom/premix/.local/analysis-venv/bin/python music/bedroom/premix/analyze_audio.py
python3 music/bedroom/premix/actual_audition.py --render
```

Acquisition checks the pinned compressed-file hashes and stops if an encoding changes; recheck identity and regenerate the bound analysis/decisions instead of silently accepting another version. Rendering archives an old native WAV, uses a build lock and current-manifest readback, and preserves the isolated offline profile. `--deliver-only` reruns output checks and exports after an existing render. No sources or projects are distributed in Git.

```sh
NUMBA_CACHE_DIR=/private/tmp/hollow-numba-cache MPLCONFIGDIR=/private/tmp/hollow-mpl music/bedroom/premix/.local/analysis-venv/bin/python -m unittest discover -s music/bedroom/premix -v
```

[Sanitized measurements and cut sheet](audition-01-results-2026-10-19.json) · [Current production plan](../premixed-set-plan-2026-10-19.md)

## Verification result

The final native render and delivery export pass format, duration, source-hash, gain, retained-range, native stretch-marker/pitch and EQ-readout checks. The **19:42.063** PCM24 stereo/48 kHz delivery WAV measures **−17.17 LUFS / −2.00 dBTP**. It uses **+3.38 dB constant gain** from the safely rendered native master; no limiting. The decoded final MP3 measures **−17.1 LUFS / −2.0 dBTP**, with the same reported duration. The preview is exactly 240 seconds and the DnB clip 60 seconds.

Two existing source-confirmed rests remain: approximately **0.246 seconds at 02:10** in Mau P and **0.628 seconds at 10:50** in Charlotte de Witte. There are no unexplained silences at the −50 dBFS / 0.2-second detection threshold. This is not a claim of zero intentional musical silence. Thirty-seven tests pass with no skips in the analysis environment; the full native synthetic proof passes again. Copyrighted source/derived files are confirmed ignored, and no audio is staged in Git. Musical listening/downbeat verification and hardware playback remain unclaimed.
