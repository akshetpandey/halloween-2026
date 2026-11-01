# Single moon and pumpkin guardian reconciliation

- Session: October 31 moon/listener merge and pumpkin character update.
- Updated: October 31, 2026, America/New_York (UTC date November 1).
- Checkout: shared `/Users/akshet/workspace/halloween-2026`, `main`; base `9e32ac8`.
- Status: implementation and checks complete; deployment and live page verification pending at this checkpoint.

## Confirmed scope

The host reconfirmed that there is one moon: **DEC-01 The Moon That Stayed** also carries the former Listener Below's confidant role. **DEC-04** is now **The Last Seed**, a pumpkin surrounded by chocolates. Preserve all fifteen slots and existing game mechanics. No puzzle, route, Favor, invitation, scoring or timing changes are authorized by this character revision.

The October 29 character/catalog revision already contained the merge and pumpkin identity, and was included in intervening app deployments. This pass finishes the chocolate-specific story/art and removes stale local-only status and guest moon-touchpoint instructions.

## Completed files

- [Canonical narrative](../design/narrative-arc.md): single moon/listener identity; pumpkin among chocolates in October Grove, greeting and earned lore. Sweets are freely offered and never required by a puzzle.
- [Generated catalog](src/shared/catalog.ts): synchronized from the narrative. DEC-01 remains `vision`; DEC-04 remains `reflection` with art key `seed`. No schema or route migrations.
- [Bestiary art](src/client/Art.tsx): existing pumpkin illustration gains wrapped chocolates and a descriptive accessible label.
- [Host references](src/client/HostReferences.tsx): moon and pumpkin enrollment guidance; outline stable objects without bucket/notes/ivy or loose chocolates.
- [Guest collection](src/client/main.tsx): Looking Lens discovery replaces the stale instruction to find a moon touchpoint for every guardian.
- App README/build brief, design brief, physical roster/coverage/index, family README and task tracker link the current mapping and reference status. Earlier sourcing quotes and historical NFC documents remain historical; no procurement changes.

## Live reference audit

Read-only production D1 audit and signed-in host reference page: **33 reference photos across eight guardians; 32 saved foreground outlines**. **DEC-01 has three moon photos and two outlines**. Visually reviewed all three private originals: they show the same spherical moon in the Moon Well. The farthest view remains too small for a useful foreground outline, as recorded in the [earlier review](handoff-2026-10-31-live-guardians.md).

**DEC-04 has zero saved photos** at this snapshot. No old listener photos need moving or deleting. No production rows, original photos, feature vectors, outlines, movement profiles, guardian codes or guest progress were modified. Original/private reference data stays in ignored runtime/private storage, outside Git.

## Verification

- `node scripts/sync-content.mjs` and formatting: generated content updated; nine Chronicle chapters unchanged.
- Compared catalog with `HEAD`: all fifteen IDs, names, art keys, families, rooms and virtues unchanged. Only DEC-04 greeting/lore changed in the generated catalog.
- `npm run build`: passed, including TypeScript checking and the existing pinned model preparation. No model/dependency changes.
- `npm test`: **26 files / 175 tests passed**, including puzzles, scoring/access, camera/recognition and QR tests.
- `npx wrangler deploy --dry-run`: passed; existing routes, bindings and event clock retained.
- `git diff --check`: passed before checkpoint.

## External changes / remaining work

No purchases, messages, database writes or new external services. Publish the validated Worker/static bundle, verify the live host upload page and new asset bytes, then record its deployment ID here.

The host should choose **The Last Seed** at [Guardian reference photos](https://hollow-court.com/host?tab=guardians) when uploading pumpkin views. Review new uploads and save object-only outlines once present. Include independent dim-light phone tests; the current moon/reference review does not prove live iPhone/Android accuracy. The previously requested ongoing guardian-upload review continues in the [live guardian handoff](handoff-2026-10-31-live-guardians.md).

## Git and sibling work

Commit this scoped implementation/checkpoint on `main`, followed by deployment evidence. Unrelated pre-existing dirty file: `decor/shopping-ready.md`; leave unstaged and unchanged by this task. No shared budget changes or new rule decisions.
