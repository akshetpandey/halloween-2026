# Hollow Court application

[Game home](../README.md) · [Build brief](build-brief.md) · [Story](../design/narrative-arc.md) · [Puzzle design](../design/puzzles.md) · [Tracker](../task-tracker.md)

Status: First working rehearsal build, September 9, 2026. Cloudflare Worker + static React/Vite app, D1 game data, private Workers KV portraits. Local build and integration checks pass; deployment evidence and remaining gates are recorded in the task handoff when the deployment is verified.

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
- Rehearsal debug tools (`PREVIEW=true`), security headers, same-origin mutation checks, rate limiting, private portrait access, self-service deletion and expiring portrait storage.

## Storage and environment

`wrangler.jsonc` holds non-secret bindings, Partiful URL, opening/closing instants, preview flag and retention setting. Generate binding/runtime types after editing it. D1 contains sessions (hashed tokens), players, assignments, awards, invitations and ballots. Portrait bytes are in the `PHOTOS` KV namespace, under new random keys, with a seven-day expiration for this rehearsal. The D1 expiry check gates every image request independently of storage caching. A daily cleanup job clears expired portrait references, sessions and rate counters.

The initial R2 bucket request was rejected because the account has not activated R2 (Cloudflare code 10042). No R2 bucket was created. KV makes this first deployment functional without that prerequisite; no R2 activation is needed to review the app. KV can take time to expose a newly written image across locations; new unique keys avoid overwriting cached portraits. Production photo retention still requires a host decision.

All preview sessions use the `preview` realm; normal entry uses `live` and respects the dates. A production deployment should have its own D1/KV resources, `PREVIEW=false`, reviewed settings and a permanent domain. Do not encode or lock physical NFC tags with rehearsal URLs. Seeded route codes are lookup identifiers, not proof of physical discovery.

## Checks

```sh
npm test                   # puzzle invariants, 9,000 generated instances, DST, styled QR decoding
npm run test:integration   # requires local Worker on 8787; uses synthetic accounts/portraits only
npm run build
npx wrangler deploy --dry-run
npm audit
```

The integration suite creates and removes only its own local players. It covers all fifteen routes/solves, duplicate submissions, stable assignments, locked entry, protected photo reads, upload validation, referral contention, recovery rotation and ballot ownership. QR tests decode the actual styled SVG at 244px and 488px for Partiful and Summons. Browser checks are performed through Codex computer use; real iPhone/Android NFC, camera behavior, QR scanning and solve-time playtests remain necessary.

The `sharp` override selects patched 0.35.4 for Wrangler's local Miniflare dependency. No image processing library is bundled into the Worker; the browser prepares portrait images. Build dependencies are pinned by the lockfile.

## Narrative and trial pairings

`node scripts/sync-content.mjs` copies the current narrative's guardian greetings/lore and Chronicle text into the app. Story text remains authored in the design document; the code files are a build copy. Keep the generator and output synchronized when prose changes.

The first implementation uses **rehearsal pairings**, not a final physical assignment: moon/Brief Vision, tree/Missing Sigil, DJ guardian/Lanterns, Well/False Reflection, shrine/Broken Seal, raven/Hidden Token, owl/Three Witnesses, fox/Rule of Three, stag/Path Through Thorns, hare/Turning Wheel, ochre twig/Procession, ember/Offering, knots/Untangle, little host/Constellation, open door/Unbroken Sigil. Unbroken Sigil remains provisional pending real-phone comfort testing. There are no hints or speed bonuses.

## Deploy the rehearsal

```sh
npm run db:remote
npm run seed:remote
npm run deploy
```

These commands mutate only the configured Cloudflare resources. Runtime tag seed SQL, local database files, cookies, selfies and recovery values belong in ignored `private/` or `.wrangler/`, never Git. The seed does not replace existing route codes. Before the event, review final rules and eligibility, strengthen the recovery/helper/admin workflow, simulate sparse costume voting, select the permanent domain, and run the physical phone pilot.
