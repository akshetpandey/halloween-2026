# October Grove · catalog analysis

Retrieved 2026-09-08T22:23:31Z. [Raw sourced data](catalog-analysis-2026-09-08.json) · [Listen and vote](../playlist-lab/README.md).

Automatic audio descriptors cover **126/141 tracks**, including **34/36 audition tracks**. 112 match exact Spotify IDs; 14 use a different catalog release with matching ISRC, title, artist set and duration within 2.5 seconds. All 141 have Spotify popularity and duration. Genres were fetched for 73 credited artists; empty artist genres remain empty.

Spotify Audio Features returned HTTP 403 for this app. [ReccoBeats](https://reccobeats.com/docs/apis/get-track-audio-features) supplies the audio descriptors; they are provider values, not independently measured audio or host opinions. The app did supply popularity despite the restrictions documented for affected development-mode apps.

## What this suggests

| Group | Audio coverage | Median BPM | Median energy | Median danceability |
|---|---:|---:|---:|---:|
| Original pool | 104/117 | 120.0 | 0.601 | 0.675 |
| 24 new candidates | 22/24 | 123.5 | 0.779 | 0.706 |

The new candidate group trends toward more energy, danceability and tempo among the covered recordings. This is descriptive, not a test that every candidate fits. Missing catalog coverage is uneven. BPM can have half/double-time ambiguity; a 120 BPM loop can still be boring. Nothing here establishes sexiness, melodic quality, thematic fit or repetition. Keep/Cut/Maybe feedback remains the preference signal.

## Audition descriptors

Feature values below are on a 0–1 scale. Popularity is Spotify’s 0–100 value. Key uses catalog pitch class and mode. An asterisk means an alternate matched catalog release; see raw data for its exact link.

| # | Track | BPM | Key | Energy | Dance | Valence | Acoustic | Speech | Popularity |
|---:|---|---:|---|---:|---:|---:|---:|---:|---:|
| 1 | [Maribou State, Khruangbin — Feel Good](https://open.spotify.com/track/3PURbsY67tLMyausOABtit) | 102.0 | E minor | 0.76 | 0.57 | 0.40 | 0.33 | 0.04 | 58 |
| 2 | [Jessie Ware — What’s Your Pleasure?](https://open.spotify.com/track/2ZcwbSYqc8RfPGMMXTIdb0) | 115.0 | B minor | 0.80 | 0.67 | 0.60 | 0.02 | 0.04 | 57 |
| 3 | [Róisín Murphy — Murphy's Law (Edit)](https://open.spotify.com/track/5pVk9zx3qrtmx3ya8hyanZ) | 113.0 | C♯ minor | 0.51 | 0.87 | 0.73 | 0.07 | 0.06 | 45 |
| 4 | [Bonobo, Innov Gnawa — Bambro Koyo Ganda](https://open.spotify.com/track/5EGJ7e7frJjYja6H4afzoT) | 115.5 | C♯ major | 0.57 | 0.72 | 0.18 | 0.21 | 0.06 | 55 |
| 5 | [Moloko, Boris Dlugosch, Michael Lange — Sing It Back - Boris Musical Mix - Edit](https://open.spotify.com/track/4O0LwyuV3U18Hg5AxILDlI) | 123.0 | E♭ minor | 0.78 | 0.76 | 0.97 | 0.01 | 0.03 | 73 |
| 6 | [Peggy Gou — It Makes You Forget (Itgehane) - Edit](https://open.spotify.com/track/1GZJu6ciZ55S8Kp1s8Z5ex) | 125.0 | C major | 0.89 | 0.79 | 0.77 | 0.02 | 0.04 | 63 |
| 7 | [DJ Seinfeld — Walking With Ur Smile](https://open.spotify.com/track/469tf6NgOf4nscrty0G9Us) | 132.0 | G major | 0.78 | 0.73 | 0.71 | 0.05 | 0.05 | 38 |
| 8 | [Elkka — Your Skin](https://open.spotify.com/track/0F6YpgpHXMuO2FODRexwLw) | 132.0 | D major | 0.78 | 0.60 | 0.07 | 0.00 | 0.03 | 23 |
| 9 | [Sofia Kourtesis — La Perla - Edit](https://open.spotify.com/track/6CldyxMa4XuHWAhAlaPWmt) | 124.1 | G major | 0.74 | 0.59 | 0.67 | 0.18 | 0.04 | 47 |
| 10 | [Folamour — Devoted To U](https://open.spotify.com/track/3Pc13UydooMYqbXiTmpGSk) | 120.6 | G minor | 0.71 | 0.62 | 0.28 | 0.08 | 0.10 | 52 |
| 11 | [TSHA, MAFRO — Giving Up](https://open.spotify.com/track/07mOlP1DQv1ZsQTyCMNzaW) | 133.9 | B minor | 0.95 | 0.38 | 0.29 | 0.03 | 0.05 | 32 |
| 12 | [Jayda G — Both Of Us - Edit](https://open.spotify.com/track/75rGONmoi48LLYBFaGiYsv) | 124.0 | B major | 0.71 | 0.73 | 0.51 | 0.01 | 0.08 | 64 |
| 13 | [DJ Koze — Pick Up](https://open.spotify.com/track/7dFvYtokT2xQH1HvaQgbgY) | 124.9 | F major | 0.60 | 0.71 | 0.51 | 0.00 | 0.06 | 58 |
| 14 | [DJ Seinfeld, Confidence Man — Now U Do](https://open.spotify.com/track/6HzL348HHRk2dWHNzx42aj) | 137.0 | B♭ major | 0.88 | 0.76 | 0.77 | 0.20 | 0.03 | 57 |
| 15 | [Disclosure, Eko Roosevelt — Tondo](https://open.spotify.com/track/0csz09qS2n8Jo7LogHKu7j) | 132.0 | C minor | 0.92 | 0.68 | 0.84 | 0.01 | 0.05 | 65 |
| 16 | [St Germain — Rose rouge](https://open.spotify.com/track/1divptdjcWXvF1aflfTQnw) | 118.0 | A♭ minor | 0.81 | 0.62 | 0.56 | 0.07 | 0.04 | 62 |
| 17 | [L'Impératrice — Agitations tropicales](https://open.spotify.com/track/2La21GqU4fKTQLcfLxTeoz) | 116.0 | C♯ minor | 0.40 | 0.76 | 0.62 | 0.56 | 0.07 | 70 |
| 18 | [Jungle — Keep Moving](https://open.spotify.com/track/4rf0IVQDFjr27T4sgah5Pf) | 111.5 | B♭ minor | 0.60 | 0.72 | 0.56 | 0.18 | 0.03 | 70 |
| 19 | [Maribou State — Turnmills](https://open.spotify.com/track/5m4o1robU6yTvFDXXSrH0F) | 115.0 | F minor | 0.66 | 0.63 | 0.62 | 0.40 | 0.04 | 47 |
| 20 | [Franc Moody — Dopamine](https://open.spotify.com/track/38MS1Ch2ckFL4O29UVg7Nh) | 125.0 | B♭ minor | 0.56 | 0.82 | 0.56 | 0.10 | 0.04 | 61 |
| 21 | [Crazy P — Heartbreaker](https://open.spotify.com/track/53fcY2nNSX8x6yhhHQPfWE) | — | — | — | — | — | — | — | 3 |
| 22 | [Bonobo — Cirrus](https://open.spotify.com/track/2lJ4d8MCT6ZlDRHKJ1br14) | 119.0 | D minor | 0.84 | 0.64 | 0.36 | 0.40 | 0.04 | 64 |
| 23 | [Krystal Klear — Neutron Dance - Edit](https://open.spotify.com/track/0h9xxCoXw2LkdJG9pR79RN) | 125.0 | G major | 0.84 | 0.68 | 0.83 | 0.01 | 0.04 | 37 |
| 24 | [Todd Terje — Inspector Norse](https://open.spotify.com/track/1NHd4UVxT5d5EGYzlDq17T) | 120.0 | G minor | 0.78 | 0.91 | 0.89 | 0.07 | 0.04 | 56 |
| 25 | [Session Victim — Make People Dance](https://open.spotify.com/track/14Q9dJyIHbD0mOXQmAuF5M) * | 117.0 | E minor | 0.69 | 0.77 | 0.36 | 0.06 | 0.08 | 29 |
| 26 | [Purple Disco Machine, Sophie and the Giants — Hypnotized](https://open.spotify.com/track/0OeFuOAu0P1ONYz5EDdqb2) * | 108.1 | B minor | 0.81 | 0.69 | 0.71 | 0.10 | 0.10 | 50 |
| 27 | [SG Lewis — Chemicals](https://open.spotify.com/track/2ORvnjpTAXtyTKnaGAgFIv) | 113.9 | B minor | 0.85 | 0.62 | 0.75 | 0.12 | 0.38 | 60 |
| 28 | [Maribou State, Holly Walker — Nervous Tics](https://open.spotify.com/track/2oJ8Il24SIiDCJv39RYzPp) | 126.0 | C minor | 0.62 | 0.81 | 0.74 | 0.75 | 0.05 | 68 |
| 29 | [Flight Facilities, Giselle — Crave You](https://open.spotify.com/track/06Gw4zi1Gqg11XgRchemgJ) | 120.0 | C♯ minor | 0.48 | 0.92 | 0.32 | 0.10 | 0.08 | 75 |
| 30 | [Caribou — Never Come Back](https://open.spotify.com/track/09Duj3JrvK9jhMNpSqZ8f4) | — | — | — | — | — | — | — | 47 |
| 31 | [Folamour — Ivoire](https://open.spotify.com/track/1JwlD0gOkCcEBpZhUyrRbA) | 122.0 | G minor | 0.92 | 0.84 | 0.92 | 0.01 | 0.06 | 42 |
| 32 | [salute — Joy](https://open.spotify.com/track/17E3lZxFJnO49Gb0tdgVn0) | 132.0 | E major | 0.97 | 0.66 | 0.68 | 0.02 | 0.08 | 48 |
| 33 | [Barry Can't Swim — Sunsleeper](https://open.spotify.com/track/7yWd93ZTbCuhaH2QCsTHKc) | 124.0 | D minor | 0.91 | 0.64 | 0.57 | 0.01 | 0.04 | 47 |
| 34 | [Laurence Guy — Saw You for the First Time](https://open.spotify.com/track/3zId5kEMBeuJ9OlBSDb2Zu) * | 121.0 | G minor | 0.53 | 0.81 | 0.71 | 0.00 | 0.04 | 55 |
| 35 | [Rampa, chuala, Keinemusik — Les Gout](https://open.spotify.com/track/0ko0sZ5hNieT3LRq2lOGl3) | 120.0 | F minor | 0.68 | 0.85 | 0.54 | 0.09 | 0.04 | 67 |
| 36 | [WhoMadeWho, Rampa — Everyday - Edit](https://open.spotify.com/track/27NuLW6DhJkpfR8dhBmNwS) | 120.0 | G major | 0.58 | 0.67 | 0.09 | 0.29 | 0.04 | 20 |

## Remaining catalog gaps

These are lookup gaps, not low scores or automatic cuts. Search examined up to eight pages; no approximate version was substituted.

- Session Victim — Never Forget
- Chaos In The CBD — Down By The Cove
- Chaos In The CBD, Alex Cosmo Blake — Mountain Mover
- Chaos In The CBD, Novelist, Stephanie Cooke — Maintaining My Peace
- Chaos In The CBD, Saucy Lady — Tears
- Chaos In The CBD — Brain Gymnasium
- Chaos In The CBD, Finn Rees — Ōtaki
- Chaos In The CBD, Nathan Haines — Love Language
- Chaos In The CBD, Isaac Aesili — A Deeper Life
- Chaos In The CBD, Lee Pearson Jr. Collective — More Time
- Chaos In The CBD, Nathan Haines — Tongariro Crossing
- Chaos In The CBD — Barefoot On The Tarmac
- Chaos In The CBD, Cenk Esen — The Eternal Checkout
- Crazy P — Heartbreaker
- Caribou — Never Come Back

## Current playlist state

- Original October Grove: 117 tracks / 10:02:04 raw, read September 8; not edited.
- Separate V3 audition: 36 unique Spotify URIs / 2:49:31 raw, all exact versions resolved; created and populated with one API add request, then full order verified.
- No excluded intro/outro/interlude/prelude titles in the audition. No live playback or full-track listening claimed.
- All 141 host votes remain unrated. The six optional custom listening fields stay blank.
- Full varied nine-hour programme after actual cuts/transitions remains to build following audition feedback.
