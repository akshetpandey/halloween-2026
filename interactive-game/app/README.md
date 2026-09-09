# Hollow Court application

[Game home](../README.md) · [Build brief](build-brief.md) · [Story](../design/narrative-arc.md) · [Puzzle design](../design/puzzles.md) · [Tracker](../task-tracker.md)

Status: First working rehearsal build, September 9, 2026. Cloudflare Worker + static React/Vite app, D1 game data, private Workers KV portraits. Deployed and verified on Cloudflare. [Open the rehearsal](https://hollow-court-preview.computer-toolbox.workers.dev) · [Deployment evidence and remaining gates](handoff-2026-09-09-first-build.md).

[September 9 puzzle revision](../design/puzzle-revision-2026-09-09.md): compact mobile encounters, corrected heading spacing and eleven revised trials. Preview assignments upgrade to version 2 on opening each guardian; Favors and routes stay intact.

Use **Field notes → Open Court** to enter now, or jump directly to any guardian. The normal entrance stays sealed until Halloween.

## Try it locally

```sh
npm ci
npm run types
npm run db:local
npm run seed:local
npm run build
npm run dev:worker
```

Open `http://127.0.0.1:8787`. The first view is the locked entrance, using the host's actual Partiful link. **Field notes → Open Court** starts an isolated rehearsal player. The same menu jumps to all fifteen guardians, name/selfie onboarding, recovery, first/second Summons and the complete Chronicle. Milestone shortcuts add rehearsal Favors only. Reload after a production frontend rebuild. For frontend iteration, `npm run dev` serves Vite with an API proxy to the local Worker.

## Implemented in this pass

- Locked entrance with working Partiful link and a leaf-framed SVG QR; mobile Court homepage, room introductions, illustrated Bestiary and nine progressively unlocked Chronicle chapters.
- Fifteen guardian pages and all fifteen puzzle families. Twelve random hexadecimal characters identify each `/g/<code>` route. Codes are created once in D1 by `seed`, survive repeated seeds, and are not committed or bundled in the collection. Only the preview debug endpoint lists them. No guardian QR fallback.
- Deterministic, persisted player/event/guardian puzzle instances; server validation, unlimited retry/reset, memory/shuffle replay, touch-friendly/tap interactions, and once-only Favor awards enforced by SQL uniqueness.
- Name + square costume portrait + explicit display agreement; browser-side resizing to 720px, image re-encoding, MIME signature checks and bounded upload size. A returning HttpOnly session cookie restores progress; a private recovery key restores the same player and rotates credentials while invalidating old sessions.
- Deferrable Summons at four and ten Favors. QR and copyable link preserve invitation attribution through onboarding. A D1 batch allows one qualifying new registration to redeem each token; existing accounts do not create another referral credit.
- Pairwise costume ballots excluding self and repeat submission, with least-exposed entrants preferred. Live Standing displays Favor + completed Summons and visibly ties equal scores. Final costume ranking, tie resolution and coronation admin controls remain a later stage.
- Rehearsal debug tools (`PREVIEW=true`), security headers, same-origin mutation checks, rate limiting, private portrait access, persistent portrait storage.

## Storage and environment

`wrangler.jsonc` holds non-secret bindings, Partiful URL, opening/closing instants, preview flag. Generate binding/runtime types after editing it. D1 contains sessions (hashed tokens), players, assignments, awards, invitations and ballots. Portrait bytes are in the `PHOTOS` KV namespace under new random keys, without automatic expiry. The host requested removal of account/portrait deletion and seven-day data expiry on September 9; the UI and deletion API are removed. Accounts, game progress and portraits remain stored. A daily cleanup job removes only expired login sessions and rate counters; it does not remove player data. Login sessions still last fourteen days and recovery restores the same retained account. See the [retention update](handoff-2026-09-09-retention.md).

The initial R2 bucket request was rejected because the account has not activated R2 (Cloudflare code 10042). No R2 bucket was created. KV makes this first deployment functional without that prerequisite; no R2 activation is needed to review the app. KV can take time to expose a newly written image across locations; new unique keys avoid overwriting cached portraits. The current host decision is to retain account data and portraits without an automatic deadline.

All preview sessions use the `preview` realm; normal entry uses `live` and respects the dates. A production deployment should have its own D1/KV resources, `PREVIEW=false`, reviewed settings and a permanent domain. Do not encode or lock physical NFC tags with rehearsal URLs. Seeded route codes are lookup identifiers, not proof of physical discovery.

## Checks

```sh
npm test                   # puzzle invariants, 9,000 generated instances, DST, styled QR decoding
npm run test:integration   # requires local Worker on 8787; uses synthetic accounts/portraits only
npm run build
npx wrangler deploy --dry-run
npm audit
node scripts/smoke.mjs     # explicitly mutates the hosted rehearsal using disposable synthetic players
```

The integration suite creates and removes only its own local players through a CLI-only fixture helper. The hosted smoke script also requires Wrangler access for its synthetic-data cleanup; no account-deletion endpoint exists. It covers all fifteen routes/solves, duplicate submissions, stable assignments, locked entry, protected photo reads, upload validation, referral contention, recovery rotation and ballot ownership. QR tests decode the actual styled SVG at 244px and 488px for Partiful and Summons. Browser checks are performed through Codex computer use; real iPhone/Android NFC, camera behavior, QR scanning and solve-time playtests remain necessary.

The `sharp` override selects patched 0.35.4 for Wrangler's local Miniflare dependency. No image processing library is bundled into the Worker; the browser prepares portrait images. Build dependencies are pinned by the lockfile.

## Narrative and trial pairings

`node scripts/sync-content.mjs` copies the current narrative's guardian greetings/lore and Chronicle text into the app. Story text remains authored in the design document; the code files are a build copy. Keep the generator and output synchronized when prose changes.

The first implementation uses **rehearsal pairings**, not a final physical assignment: moon/Brief Vision, tree/Missing Sigil, DJ guardian/Lanterns, Well/False Reflection, shrine/Broken Seal, raven/Hidden Token, owl/Three Witnesses, fox/Rule of Three, stag/Path Through Thorns, hare/Turning Wheel, ochre twig/Procession, ember/Offering, knots/Untangle, little host/Constellation, open door/Unbroken Sigil. Unbroken Sigil remains provisional pending real-phone comfort testing. There are no hints or speed bonuses.

## Deploy the rehearsal

```sh
npm run deploy
node scripts/retain-portraits.mjs --remote # one-time TTL removal for older stored portraits
npm run db:remote
npm run seed:remote
```

For the September 9 retention upgrade, deploy before applying migration 0002 so the old Worker never queries a removed column. The portrait upgrade preserves bytes and metadata, removes existing KV expirations and verifies the resulting storage state. These commands mutate only the configured Cloudflare resources. Runtime tag seed SQL, local database files, cookies, selfies and recovery values belong in ignored `private/` or `.wrangler/`, never Git. The seed does not replace existing route codes. The generator validates individual assignments and has at least 100 sampled distinct views per family; it does not yet reserve structurally distinct instances across all players. Before the event, review cross-player collision handling, final rules and eligibility, strengthen the recovery/helper/admin workflow, simulate sparse costume voting, select the permanent domain, and run the physical phone pilot.
