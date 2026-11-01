# Single moon and pumpkin guardian reconciliation

- Session: October 31 moon/listener merge and pumpkin character update.
- Updated: October 31, 2026, America/New_York (UTC date November 1).
- Checkout: shared `/Users/akshet/workspace/halloween-2026`, `main`; base `9e32ac8`.
- Status: complete and deployed; new pumpkin outlines saved and verified. Independent party-light phone acceptance remains pending.

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

Initially DEC-04 had zero saved photos. **Four pumpkin photos arrived while publishing**, showing the orange pumpkin bowl with its attached black spider, surrounded by chocolates. All are correctly assigned to DEC-04. Reviewed them and generated four foreground profiles around the stable pumpkin/spider, excluding loose sweets and nearby plants/table/lamp. Saved these with conditional inserts that preserve existing host edits and the six-profile limit. Verified all four in D1 and as four **Edit guardian outline** controls in the signed-in host page. One `vision_focus_review` audit row records the authorized update.

No old listener photos needed moving or deleting. Original photos, global feature vectors, movement profiles, guardian codes and guest progress were not changed. Only the four new foreground profile rows and the audit row were added. Photos, vectors, polygons and SQL stay in ignored private storage outside Git.

The follow-up comparison covers **37 photos / nine guardians / 36 foreground profiles**. Each positive query was excluded from both reference galleries. The pumpkin's four original views changed from four correct manual suggestions without these outlines to four correct automatic matches with them. Synthetic quarter-brightness: one correct auto, one correct manual, two unknown. Blue tint: three correct auto, one correct manual. These are native CPU/WASM checks on the enrollment photos, not independent phone captures.

Thirteen background crops include four from the new photos. Eleven were rejected; two candy-only crops incorrectly matched/suggested the **fox**, one automatically and one manually. Repeating without the pumpkin outlines produced the same two fox errors, so these are an existing limitation rather than a new pumpkin-outline regression. No pumpkin false positives appeared in these crops. Do not describe the negative check as a clean pass. [Sanitized measurements](scripts/vision-lab/pumpkin-results-2026-10-31.json).

At the final D1 count, another four photos were uploaded under **DEC-05 The Unfinished Guest**: total **41 photos / ten guardians / 36 outlines**. That incoming batch is not included in this comparison or visually reviewed by this moon/pumpkin update; continue the previously authorized upload review separately.

## Verification

- `node scripts/sync-content.mjs` and formatting: generated content updated; nine Chronicle chapters unchanged.
- Compared catalog with `HEAD`: all fifteen IDs, names, art keys, families, rooms and virtues unchanged. Only DEC-04 greeting/lore changed in the generated catalog.
- `npm run build`: passed, including TypeScript checking and the existing pinned model preparation. No model/dependency changes.
- `npm test`: **26 files / 175 tests passed**, including puzzles, scoring/access, camera/recognition and QR tests.
- `npx wrangler deploy --dry-run`: passed; existing routes, bindings and event clock retained.
- `git diff --check` and 174 local documentation links: passed before checkpoint.
- Live host UI: one-moon/listener guidance visible under DEC-01; pumpkin illustration/guidance and four saved outlines visible under DEC-04. Screenshot in ignored `private/live-guardians-2026-10-31/pumpkin-deployed.png`.
- Live custom-domain HTML returned 200 with `no-store`; generated entry had one-year immutable caching and matched the tested local build byte-for-byte. Public camera availability remains true and debug availability false.

## External changes / remaining work

Published Worker/static bundle to `hollow-court.com` and the existing Workers preview, version **`8122cda1-a9df-4612-b440-aab0afd0413d`**. Entry **`index-BQ8AS5OS.js`**, SHA-256 `7d5b77ba0236c49f191e6f2f152b731f1a20569fe94114da0be770c26990e06b`. Saved four private recognition profiles plus one audit row as described above. No purchases, messages, new models/dependencies or external services.

The host can test **The Last Seed** at [Guardian reference photos](https://hollow-court.com/host?tab=guardians). Try fresh front/side views with chocolates moved or removed and in actual dim light. The current reference comparison does not prove live iPhone/Android accuracy. The candy-only fox confusion remains a hard-negative case for recognition follow-up. The previously requested ongoing guardian-upload review continues in the [live guardian handoff](handoff-2026-10-31-live-guardians.md), starting with the new DEC-05 batch. No game mechanics were changed.

## Git and sibling work

Implementation/checkpoint on `main`: **`bb99326`**. This follow-up records deployment and the pumpkin references that arrived while publishing. Unrelated pre-existing dirty file: `decor/shopping-ready.md`; left unstaged and unchanged by this task. No shared budget changes or new rule decisions.
