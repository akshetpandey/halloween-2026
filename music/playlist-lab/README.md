# Playlist Lab

A local Python tool for October Grove selection, persistent track votes, metadata and exact Spotify playlist updates. Python 3.10+; no dependencies. The browser contains persistent Spotify/YouTube players and the listening/review interface. Playlist management uses Spotify’s Web API directly.

**Status September 8:** Spotify connected through PKCE; direct reading and playlist creation/addition verified. The original October Grove remains 117 tracks / 10:02:04 raw. A separate [V3 audition](https://open.spotify.com/playlist/09SoTtXJNOpH3cyksPlxUH) is live with 36 exact versions / 2:49:31 raw, verified in order through the API. All 141 library records now have Spotify IDs, duration and popularity. Artist genres have been fetched for 73 credited artists. Audio Features returned HTTP 403 for this app; automatic ReccoBeats catalog enrichment supplies available descriptors. See [coverage and track data](../living-room/catalog-analysis-2026-09-08.md). Browser embed playback has been tested; no full-track musical assessment or speaker test is claimed.

**Latest calibration:** Batch 02 is complete (12 keeps / 13 cuts), with 16 keeps across the previous 166 tracks. [Batch 03](../living-room/october-grove-batch-03.md) adds 25 new recordings, 25 distinct lead artists (18 new), and 1:32:13 raw. Its private Spotify order is verified. The library now contains 191 tracks; prior feedback is retained. See the batch notes for current audio/YouTube coverage.

## Listen and vote now

Run from the repository root:

```sh
python3 music/playlist-lab/lab.py import music/living-room/review-library.json
python3 music/playlist-lab/lab.py import music/living-room/october-grove-batch-02.json
python3 music/playlist-lab/lab.py import music/living-room/october-grove-batch-03.json
python3 music/playlist-lab/lab.py serve
```

Open [the listening room](http://127.0.0.1:8765) in Chrome. The newest batch opens by default: **Batch 03 · Hooks after dark (25)**. Earlier auditions and all previous votes remain available in the filter. Press **Play / pause** to listen inside the page. **Keep / Cut / Maybe** saves the choice and starts the next track when **Vote & play next** is checked. **Next** skips without voting; **Previous** goes back. **Continue when a track ends** advances through the current filtered list, then stops at the end. Saving a note, resetting a vote or changing an optional score does not request the next track. The player survives card re-renders, so note saves do not reload the video. The September 8 Spotify transition fix tracks each iframe navigation separately and waits for its ready event before playing. Refresh an already-open listening page once to load that fix.

**YouTube** is the default; **Spotify** is selectable in the player. YouTube candidates have matching title/mix words, artist/channel evidence and duration within five seconds, but are not guaranteed identical versions. The selected video/channel is shown. If a candidate refuses embedding, the player tries available alternatives and then Spotify. Spotify embeds returned 29–30-second previews in the tested Chrome session. Some YouTube videos played at full catalog duration, while others returned embed error 150. Neither provider guarantees full playback for every track; sign-in, browser autoplay and regional/embed availability affect it. If autoplay is blocked, press Play inside the provider frame. The whole-audition Spotify link remains available for uninterrupted playback in Spotify.

[YouTube candidates](../living-room/youtube-candidates-2026-09-08.json) cover 128/141 library tracks, including 34/36 audition tracks. Rose rouge and Inspector Norse have no sufficiently close candidate from the bounded searches and use Spotify. The candidate count is **not** an embeddability success count. The 13 unresolved library tracks remain unresolved rather than using another edit.

`yt-dlp` is used only for metadata searches, with no audio/video downloads and no browser-cookie extraction. Refresh candidates with:

```sh
python3 music/playlist-lab/youtube.py --batch 03 # current batch
python3 music/playlist-lab/youtube.py       # original audition only
python3 music/playlist-lab/youtube.py --all # all linked library tracks
```

The script caches searches privately for 14 days, uses at most three concurrent searches, stores candidate source/version evidence, and keeps host votes unchanged. Provider SDKs load once; no Spotify Client ID, secret or access token is exposed to the review page. Refresh the page after enrichment to load new candidates. Library import and metadata operations still use Python/API commands.

Listen at conversation volume, including a later section; the built-in video timeline makes that possible without opening another tab. A good opening can conceal minutes of an unchanged loop.

Your normal workflow is just Keep / Cut / Maybe; no six-field form is required. Notes are optional. A collapsed section offers optional 1–5 scores: bounce, melody, sexy, repetition, theme fit and vocal density. Repetition 5 means “drags”; the other scales run low to high. Reset makes a vote unrated; selecting Unrated clears a listening score. Changes save in SQLite, survive browser closure, and have an event history. Votes apply to this party, not global judgments about the artist. Reopen the server after a Mac restart. This is local to the Mac; phone/multi-user access is not implemented.

## Connect Spotify once

1. In the [Spotify developer dashboard](https://developer.spotify.com/dashboard), add the exact redirect URI `http://127.0.0.1:8766/callback` to your app. Spotify requires an explicit loopback IP, not `localhost`.
2. Use its **Client ID**, not its Client Secret. This tool uses PKCE and needs no secret.
3. Run the command below and approve the requested playlist read/write access in Spotify. New development apps require the app owner to have Premium and users to be allowed in the dashboard.

```sh
python3 music/playlist-lab/lab.py auth --client-id YOUR_PUBLIC_CLIENT_ID
python3 music/playlist-lab/lab.py pull
```

The default target is October Grove `6FEcecNrYObHqVunRf9Vzf`. Other playlists can be selected explicitly with `--playlist`. The API reader requires an owned or collaborative playlist. Auth opens the system browser and waits five minutes. If automatic browser launching fails, add `--no-browser` and open the URL saved in ignored `.local/auth-request.json` during that wait. The host has already connected this Mac; no repeat Client ID entry or authorization is needed while refresh credentials remain valid. Tokens are restricted to a local file, excluded from Git; auth callback query strings are not logged. Revoke the app in Spotify to disconnect it and remove its local token file.

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

Batch seeds use stable `batch_id`, `batch_name`, `batch_rank` and `batch_playlist_url` fields. Use a new increasing batch ID for each 25-track audition; imports add new tracks without overwriting existing feedback. The newest ID sorts first, and the selected batch controls both track order and the whole-audition Spotify link.

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
| Artist genres | `genres` automatically fetches unique credited artists, caches for 30 days, and preserves artist-level provenance. These are not precise track genres. |
| BPM/key; energy, danceability, valence, acousticness, speechiness, instrumentalness, liveness, loudness | Spotify restricted Audio Features/Analysis for new use cases in November 2024. The optional `features --limit 1` command probes actual access and stops on denial. Do not expect it to work for a new app. |
| Popularity | Current documentation removes this for affected development-mode apps, but the actual authorized app returned track popularity for all 141 records. The UI displays it with Spotify metadata provenance. Absent remains unknown, never zero. |
| Alternate BPM/key | Import analyzed metadata from legally acquired local files (e.g. rekordbox) or verified catalog sources for the exact mix. No Spotify stream ripping, no passing Spotify audio to an analysis model. |
| Bounce/melody/sexy/repetition/theme/vocal density | Optional listening judgments. Do not equate these with catalog descriptors or fabricate ratings from BPM. Host only needs to vote; fuller listening judgments can be discussed for particular tracks. |

BPM describes beat rate, not how exciting a record feels. Key helps harmonic sequencing but is not a suitability score. Danceability does not measure development, energy does not equal bounce, valence does not equal sexiness, and popularity is not party quality. Preserve unknown values and source/date rather than inventing a complete table.

### Automatic catalog enrichment

```sh
python3 music/playlist-lab/lab.py pull
python3 music/playlist-lab/lab.py genres
python3 music/playlist-lab/enrich.py
# Or just the first audition:
python3 music/playlist-lab/enrich.py --audition
python3 music/playlist-lab/enrich.py --batch 03
```

ReccoBeats provides up to 11 descriptors: tempo, key, mode, energy, danceability, valence, acousticness, speechiness, instrumentalness, liveness and loudness. The first six custom listening scores stay separate. Retrieval sends only public recording identifiers or song titles, never Spotify credentials, account details, votes or audio. No audio is downloaded or uploaded.

Exact Spotify IDs are preferred. If a release is absent, an alternate catalog release needs the same ISRC, exact normalized title and artist set, and duration within 2.5 seconds. The UI labels that match and links the source recording. Unbound seeds require matching title/artists/duration and a unique recording; this does not bind a Spotify version. Ambiguous, absent and unknown values remain missing. Search inspects up to eight provider pages (200 results at the observed default), so a missing match is not proof the whole provider catalog lacks it.

Provider descriptors are not independently verified audio measurements. They cannot establish how repetitive or sexy a track feels. Percentages display 0–1 feature values, not certainty. Cached responses last 24 hours; the client spaces requests and honors short rate-limit delays with bounded retries. A stopped run keeps prior results; re-run to resume from cache. The ignored `.local/enrichment-report.json` records results. The audit includes separate catalog-feature coverage. Refresh the review page after importing.

[ReccoBeats API](https://reccobeats.com/docs/documentation/introduction) · [Track lookup](https://reccobeats.com/docs/apis/get-tracks) · [Audio features](https://reccobeats.com/docs/apis/get-track-audio-features) · [Rate limiting](https://reccobeats.com/docs/documentation/rate-limiting).

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
node --test music/playlist-lab/test_player.cjs music/playlist-lab/test_batches.cjs
```

Credentials, runtime snapshots and voting history live in `.local/`, ignored by Git. Back up that directory privately or use the export command; committing the program does not back up later votes. `--state PATH` before the subcommand selects a different state directory, useful for disposable testing.

[PKCE](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow) · [Redirect URIs](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri) · [Development mode](https://developer.spotify.com/documentation/web-api/concepts/quota-modes) · [Audio feature restrictions](https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api) · [February 2026 API changes](https://developer.spotify.com/documentation/web-api/references/changes/february-2026) · [March ISRC-field reversal](https://developer.spotify.com/documentation/web-api/references/changes/march-2026) · [July quota changes](https://developer.spotify.com/documentation/web-api/references/changes/july-2026) · [Read items](https://developer.spotify.com/documentation/web-api/reference/get-playlists-items) · [Add](https://developer.spotify.com/documentation/web-api/reference/add-items-to-playlist) · [Remove](https://developer.spotify.com/documentation/web-api/reference/remove-items-playlist) · [Reorder](https://developer.spotify.com/documentation/web-api/reference/reorder-or-replace-playlists-items).

[Spotify embed API](https://developer.spotify.com/documentation/embeds/references/iframe-api) · [Spotify preview limitations](https://developer.spotify.com/documentation/embeds/tutorials/troubleshooting) · [YouTube iframe API](https://developers.google.com/youtube/iframe_api_reference) · [yt-dlp](https://github.com/yt-dlp/yt-dlp).
