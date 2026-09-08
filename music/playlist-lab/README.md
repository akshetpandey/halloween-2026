# Playlist Lab

A local Python tool for October Grove selection, persistent track votes, metadata and exact Spotify playlist updates. Python 3.10+; no dependencies. The browser is only the listening/review interface. Playlist management uses Spotify’s Web API directly.

**Status September 8:** local tool and seeded review library implemented; automated tests pass. Spotify authorization and live API testing are still pending the host’s Client ID and consent. No live playlist edits have been made. The installed Spotify plugin exposes search, currently-playing and natural-language playlist generation, but no exact playlist editing or full export tool.

## Listen and vote now

Run from the repository root:

```sh
python3 music/playlist-lab/lab.py import music/living-room/review-library.json
python3 music/playlist-lab/lab.py serve
```

Open [the listening room](http://127.0.0.1:8765) in Chrome. The in-app browser timed out in this session; Chrome loaded it successfully. Start with **First audition**: 12 existing anchors plus 24 new candidates. Open a track in Spotify, listen, and choose **Keep / Cut / Maybe**. Until exact Spotify versions are linked, the button opens a Spotify search and says so. Listen at conversation volume, including a later section of the track; a good opening can conceal five minutes of an unchanged loop. Playback stays in Spotify; no audio is downloaded by this tool.

Use the note field for why, plus optional 1–5 scores: bounce, melody, sexy, repetition, theme fit and vocal density. Repetition 5 means “drags”; the other scales run low to high. Reset makes a vote unrated; selecting Unrated clears a listening score. Changes save in SQLite, survive browser closure, and have an event history. Votes apply to this party, not global judgments about the artist. Reopen the server after a Mac restart. This is local to the Mac; phone/multi-user access is not implemented.

## Connect Spotify once

1. In the [Spotify developer dashboard](https://developer.spotify.com/dashboard), add the exact redirect URI `http://127.0.0.1:8766/callback` to your app. Spotify requires an explicit loopback IP, not `localhost`.
2. Use its **Client ID**, not its Client Secret. This tool uses PKCE and needs no secret.
3. Run the command below and approve the requested playlist read/write access in Spotify. New development apps require the app owner to have Premium and users to be allowed in the dashboard.

```sh
python3 music/playlist-lab/lab.py auth --client-id YOUR_PUBLIC_CLIENT_ID
python3 music/playlist-lab/lab.py pull
```

The default target is October Grove `6FEcecNrYObHqVunRf9Vzf`. Other playlists can be selected explicitly with `--playlist`. The API reader requires an owned or collaborative playlist. Auth opens the system browser and waits five minutes. Tokens are restricted to a local file, excluded from Git; auth callback query strings are not logged. Revoke the app in Spotify to disconnect it and remove its local token file.

A pull verifies that the snapshot stayed stable across every page, then records the exact order and metadata. Unavailable/null/local/non-track items stop the import rather than silently becoming apparent removals. Unique archived title/artist matches, plus album and rounded duration when available, attach the observed live version to that local record. This is logged; ambiguous records remain separate for manual reconciliation. No guessed search-result match is automatically added to Spotify.

## Exact version selection and updates

```sh
python3 music/playlist-lab/lab.py search 'track:"Your Skin" artist:"Elkka"'
python3 music/playlist-lab/lab.py bind LOCAL_RECORD_ID spotify:track:EXACT_TRACK_ID
python3 music/playlist-lab/lab.py create 'October Grove — V3 Audition'
python3 music/playlist-lab/lab.py create 'October Grove — V3 Audition' --apply
```

Use returned Spotify URIs and review artist, title, album, duration and mix before binding. `bind` is an explicit choice, not fuzzy matching. Keep remixes separate; ISRC is a duplicate-review signal, not permission to merge different edits. Search uses the current development-mode limit of 10.

Create `desired.json` as a JSON array of exact Spotify track URIs in desired order. For the short audition, use the newly created audition playlist ID; do not replace the full party collection with the short sample.

```sh
python3 music/playlist-lab/lab.py plan desired.json music/playlist-lab/.local/plan.json --playlist PLAYLIST_ID
python3 music/playlist-lab/lab.py apply music/playlist-lab/.local/plan.json
python3 music/playlist-lab/lab.py apply music/playlist-lab/.local/plan.json --apply
```

`plan` reads live state and writes a reviewable diff. `apply` without the flag previews only. Execution checks the original snapshot/order, saves a backup, batches adds/removes in groups of at most 100, and reorders through the API. It verifies the final order with a fresh full read. Downvoted tracks cannot be applied until their vote or the plan changes. The original party playlist also has a nine-hour gate after a hypothetical 12-second allowance per join and excludes obvious intro/outro/interlude/prelude titles. This gate is a planning floor; it does not establish actual Google Home crossfade behavior or rule out untitled ambient passages.

No blind write retries. A timeout may mean a write succeeded: pull, inspect the backup/event history, and generate a new plan. The API does not offer an atomic multi-request transaction; avoid editing Spotify while a sync runs. Snapshot prechecks catch observed conflicts but cannot eliminate the small race before each request. No automated rollback overwrites someone else’s newer edits. Normal repeat runs against the same desired list are no-ops; a saved old plan is rejected after the playlist changes.

## Feedback and removals

Explicit votes are authoritative. A pull compares complete ordered snapshots and logs added/removed URI occurrences. Reordering is not removal. Removals do **not** become dislikes: they may be alternate-version replacement, availability changes, accidental deletion or another editor. Review an observed removal and give it a vote/reason. Managed edits are logged separately from externally observed differences. History lives in the local event table and exports; there is no background polling or automatic Spotify mutation from votes.

```sh
python3 music/playlist-lab/lab.py export music/playlist-lab/.local/review-export.json
python3 music/playlist-lab/lab.py audit --audition
python3 music/playlist-lab/lab.py audit --approved
```

The audit reports artist/album concentration, duplicate IDs/ISRCs, exact-version gaps, known/unknown durations and metadata coverage. Imported coarse catalog genres and editorial style lanes are distinct from track-level measured features. All seed votes are unrated.

## Metadata: what is and is not available

Verified against Spotify documentation September 8, 2026:

| Data | Route / limitation |
|---|---|
| IDs, exact mix/album, duration, explicit, release date, ISRC | Direct track/playlist metadata. Availability and fields must be checked for the authorized account. |
| Artist genres | Spotify artist endpoint if supplied; artist-level tags are not a precise track genre. Not automatically fetched by this first version. |
| BPM/key; energy, danceability, valence, acousticness, speechiness, instrumentalness, liveness, loudness | Spotify restricted Audio Features/Analysis for new use cases in November 2024. The optional `features --limit 1` command probes actual access and stops on denial. Do not expect it to work for a new app. |
| Popularity | Removed from tracks/artists/albums for development-mode access in February 2026; absent remains unknown, never zero. |
| Alternate BPM/key | Import analyzed metadata from legally acquired local files (e.g. rekordbox) or verified catalog sources for the exact mix. No Spotify stream ripping, no passing Spotify audio to an analysis model. |
| Bounce/melody/sexy/repetition/theme/vocal density | Host listening scores; keep them separate from Spotify’s numeric features. |

BPM describes beat rate, not how exciting a record feels. Key helps harmonic sequencing but is not a suitability score. Danceability does not measure development, energy does not equal bounce, valence does not equal sexiness, and popularity is not party quality. Preserve unknown values and source/date rather than inventing a complete table.

Batch metadata import is CSV with `id,field,value,source`; `id` is the local record ID shown under Metadata & sources. It validates every row before committing. Example rows below illustrate the schema only, not actual track measurements:

```csv
id,field,value,source
LOCAL_RECORD_ID,tempo,122,rekordbox analyzed exact purchased file 2026-09-08
LOCAL_RECORD_ID,key,8A,rekordbox analyzed exact purchased file 2026-09-08
LOCAL_RECORD_ID,genre,vocal house,host listening 2026-09-08
```

```sh
python3 music/playlist-lab/lab.py import-features metadata.csv
python3 music/playlist-lab/lab.py features --limit 1
python3 -m unittest discover -s music/playlist-lab -v
```

Credentials, runtime snapshots and voting history live in `.local/`, ignored by Git. Back up that directory privately or use the export command; committing the program does not back up later votes. `--state PATH` before the subcommand selects a different state directory, useful for disposable testing.

[PKCE](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow) · [Redirect URIs](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri) · [Development mode](https://developer.spotify.com/documentation/web-api/concepts/quota-modes) · [Audio feature restrictions](https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api) · [February 2026 API changes](https://developer.spotify.com/documentation/web-api/references/changes/february-2026) · [March ISRC-field reversal](https://developer.spotify.com/documentation/web-api/references/changes/march-2026) · [July quota changes](https://developer.spotify.com/documentation/web-api/references/changes/july-2026) · [Read items](https://developer.spotify.com/documentation/web-api/reference/get-playlists-items) · [Add](https://developer.spotify.com/documentation/web-api/reference/add-items-to-playlist) · [Remove](https://developer.spotify.com/documentation/web-api/reference/remove-items-playlist) · [Reorder](https://developer.spotify.com/documentation/web-api/reference/reorder-or-replace-playlists-items).
