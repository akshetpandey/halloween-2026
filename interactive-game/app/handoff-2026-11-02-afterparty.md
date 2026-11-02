# Afterparty archive and planning closeout

November 2, 2026. Host requested closure of outstanding planning threads in docs and a public landing page with final results, thanks, every guardian and puzzles playable without login or new points. Shared main; actual event data stays in Cloudflare, not Git.

## Implemented

- Dedicated archive landing page, final results, all fifteen guardian/lore pages, lazy-loaded existing 3D spirit animations and all fifteen puzzle families. Existing visual identity retained; responsive gallery and standings.
- Public `/api/mode`, `/api/archive/results` and GET/POST `/api/archive/puzzle/:guardianId`. `ARCHIVE_MODE=true` enables archive UI for all guest/legacy links; `/host` retains protected administration.
- Replay assignment uses an ephemeral variation seed and the original generator/validator. The server returns only the view and correct/incorrect feedback; it reads no player session, persists no progress and issues no cookies. Retry/new variation/refresh never modify Favors, assignments or votes.
- Legacy guest mutation endpoints return 410 before session lookup, rate counters or writes in archive mode. Host-only routes stay authenticated. No migration, score reset or data deletion.
- Results read only the live realm, preserve equal ranks, and include a published costume award only if one exists. No private photos, IDs, recovery codes, invitation URLs or vote totals are exposed. Results come from storage, not hardcoded guest identities.
- [Project closeout](../../operations/closeout-2026-11-02.md) retires all remaining event preparation/questions, with banners on family indexes/master trackers and current instructions. Unverified outcomes are not marked done. No Codex chats were archived or messaged.

## Verification

Production baseline read-only review: 14 registered game guests, 52 earned Favors, all 15 guardians solved, two entries tied at the recorded top score. No costume award was initially published. The host then confirmed the actual costume winner (+3, total 19). Recorded that single live award and its host audit entry through authenticated Wrangler; no Favor/referral/ballot was changed. The public results now put the confirmed winner first at 19. No guest name or runtime identity is stored in these docs.

Type generation and production build passed. Full suite: 243/244 passed in sandbox; the native Apple Vision QR helper could not run there. Its entire 30-test file passed on rerun with macOS compiler/cache access, accounting for all 244 tests passing across the runs. A subsequent regression test for animation replay wording and the archive tests passed together (24 tests); 245 tests are now defined. New archive tests cover all 15 anonymous solves, incorrect/repeated submissions, disabled legacy scoring, no storage access/cookies, tied ranks, escaped names, public gallery links and safe live-only result fields. Local browser verified landing/gallery, incorrect answer, retry and successful completion without signup, plus a working 3D guardian animation. Fixed the animation’s inherited Favor text so replay explicitly offers no points or saved progress. An isolated ignored `private/archive-qa` local database was initialized for QA, separate from normal local state and all remote data.

## Publication

Target existing Worker `hollow-court-preview`, custom domain https://hollow-court.com and existing workers.dev hostname. Existing remote plain-text config/bindings were read and match the checked-in config before adding only ARCHIVE_MODE. Same D1/KV resources and event dates; no binding migration or auth/audience change. Published Worker version `1ea5a732-20ea-4abd-8fdd-9aeed4129831` on November 2. Code commits: `07f0e63`, `705ada6`. Build and deployment dry run passed. Live checks below cover the confirmed award and score, public replay and protected private routes.

The unrelated existing decor/shopping-ready.md edit is preserved and excluded. Commit hashes are reported in the final response. Runtime credentials and guest details remain uncommitted. The existing data/portrait retention policy is unchanged; any data removal, financial reconciliation or new costume award requires a separate host decision.

## Final live verification

Verified custom-domain archive mode, the 19-point costume-award winner, all fifteen anonymous puzzle views, a correct solution among the candidate choices, rejection of incorrect answers, no session cookies, and 410 responses from legacy guest scoring/registration/voting mutations. Cloudflare Access protects the host API (unauthenticated redirect); guest portraits still require a registered account. Re-read results after replay and confirmed they were identical. The replay tests do not create players or write Favors, assignments or ballots. Historical accounts/portraits remain stored and private.

The global closeout banners retire unanswered planning/checklist entries rather than falsifying their completion. The final response reports this documentation commit. The unrelated decor shopping edit remains outside these commits.
