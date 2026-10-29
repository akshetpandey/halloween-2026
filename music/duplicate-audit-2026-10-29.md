# Approved-track duplicate audit · October 29

Audited the canonical shared approved library at **2026-10-29T17:45:43-04:00**, with fresh Spotify catalog metadata for every approved recording and a final live approved-ID-set recheck. New unrated batch candidates are excluded.

**Result: no duplicate recordings found among 325 Keeps — 127 Grove / 198 Hollow.** All 325 US catalog responses resolved, were playable and had ISRCs; identity/title/artist/duration metadata matched the stored records.

| Check | Result |
|---|---:|
| Repeated canonical Spotify URI, within or across rooms | 0 |
| Repeated ISRC, normalized for case/punctuation | 0 |
| Same credited artist + base title after edit/remix/release-label normalization | 0 |
| Approved versus rejected exact-URI/ISRC conflict | 0 |
| Same base title under different artists | 4 pairs |

A fuzzy title screen with shared credited artists produced one low-confidence false positive: 999999999’s collaborations **I Got Acid** (Marie Vaunt) and **TRIP ON ACID** (LYNSY). Their titles, recording identifiers and collaborators differ; they were not treated as duplicates.

## Repeated titles

These are distinct **catalog recordings**, with different URIs and ISRCs and no shared credited artist. A repeated generic title alone does not justify merging approved choices. This audit does not establish whether different recordings share any vocal samples or underlying composition.

| Title | Approved recordings | Rooms |
|---|---|---|
| Hypnotized | [Purple Disco Machine, Sophie and the Giants — Hypnotized](https://open.spotify.com/track/0OeFuOAu0P1ONYz5EDdqb2) / [Amelie Lens — Hypnotized](https://open.spotify.com/track/0PFNP0qTnqgOOr3X4pQwBu) | Grove / Hollow |
| Breathe | [The Prodigy — Breathe - Edit](https://open.spotify.com/track/0tOSjuYowBba9F34ecAcBY) / [Jax Jones, Ina Wroldsen — Breathe](https://open.spotify.com/track/0KsB4TwgATg88aXCMBoO3Y) | Grove / Grove |
| Don't Stop | [KI/KI — Don't Stop - drums & acid mix (edit)](https://open.spotify.com/track/6hvA3fjfQdWaZlc74FrahJ) / [DJ HEARTSTRING, southstar — Don't Stop](https://open.spotify.com/track/3tYYypENWxaS1DKUtcH8S8) | Hollow / Hollow |
| Play With Me | [Nicolas Julian — Play With Me](https://open.spotify.com/track/6pNLxfWv2hXrAUyjQFB4tZ) / [hanoram — Play With Me](https://open.spotify.com/track/6l1xPATiiOeH94rLV0N4Z1) | Hollow / Grove |

## Scope and preservation

This was a read-only audit. No votes, notes, track metadata, Spotify playlists, Likes or playback settings were changed. Reviews continued while the check ran: new vote events appeared, but a final readback confirmed the same 325 approved IDs. Older events and all track metadata/settings/scores/snapshots were preserved. Do not restore the older snapshot over ongoing reviews.

The metadata checks cover all approved records and common alternate-release/edit/remix labels. They do not replace full listening or acoustic fingerprinting and cannot rule out differently named reworks, shared samples or medleys. No duplicate-based reduction is needed in the current 127 / 198 approval counts.

[Sanitized results](duplicate-audit-2026-10-29.json) · [Current curation status](curation-status-2026-10-29.md) · [Handoff](handoff-2026-10-29-duplicate-audit.md).
