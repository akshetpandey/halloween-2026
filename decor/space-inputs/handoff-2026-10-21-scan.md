# Apartment scan and bedroom space handoff

- **Session / ID:** House decor planning, continued scan review; `01a15f33-c6e7-7fa1-8507-7679689b9af1`.
- **Updated:** October 21, 2026, America/New_York.
- **Checkout / branch / base:** `/Users/akshet/workspace/halloween-2026`, shared `main`; scan work began after `be5d8c4`, with sibling costume commits through `d8f2dc3` already present at continuation. Preserve them. No worktree or branch created.
- **Status:** Scan conversion and current footprint study complete; physical fit, bed support, mounting and purchases remain future work.
- **Owned files:** New base-plan PNG/SVG, derived JSON, inline bedroom study, [scan review](scan-review-2026-10-21.md), this handoff; narrow status changes to space-inputs/decor/bedroom READMEs, current room plan and shopping fabric hold. No game/music/costume implementation edited.

## Confirmed inputs and current result

Host supplied `10_21_2026.glb` in Downloads and a top-down screenshot; original copies are local/ignored in `raw/`. Other 1 is the main entrance with coat closet right; Other 2 is a small closet; living/dining/kitchen form one Grove. Central narrow recess remains unidentified, not assumed to be the entrance.

Bedroom proposal: bed upright against closet wall, guardian in front, automated desk ahead of guardian. **No human DJ**; guardian is pretend DJ. **Both speakers on the desk**. Host supplies **49 × 29.5-in desk** and **15-in stored bed depth**, explicitly assuming legs can be removed or flipped/concealed by guardian. Model those inputs without another approval request. Bed support is unresolved and must not be represented as an installed/tested system.

Room is approximately **9′2″ × 13′8″ maximum inside walls**, stepped corner included, **120.6 sq ft** before furniture. Current study: **~98 sq ft unoccupied including circulation**, **~54 sq ft front dance area** after a reserved 0.85 m entry/side route. Bed + 0.30 m guardian support allowance + desk occupy ~4′8″ of depth; nearly 9 ft lies ahead before corner/route deductions. Bed stays within its scan-derived 86.2-in long edge. Nightstand and low cabinet relocation inside the apartment are assumptions; tabletop fit needs checking.

The flat-bed comparison with the same automated-booth arrangement gives **~68 sq ft unoccupied / ~27 sq ft front area**. This is not an optimized flat-bed alternative or guest capacity. Earlier 79/33 and 93/51 numbers in chat are superseded. The inline source is [bedroom-space-study.html](bedroom-space-study.html); saved-state schema version 3 ignores obsolete layouts with a human DJ/floor speakers/placeholder dimensions.

Bedroom window spans now ~79.9 and 104.6 in, opening heights ~83 in. H22–25 remain held: old two 72-in runs / 84-in curtain choice are not fitted quantities. At illustrative 1.25 fullness plus 4 in each side, six 52-in panels could be distributed across the two windows (three pairs total), but drop/opacity/mounts and a new delivered quote remain unverified. No budget amount changed; $973.12 is still a hypothetical package scale, not a new confirmed fit.

## Canonical outputs

- [Review and remaining checks](scan-review-2026-10-21.md).
- [Corrected base-plan PNG](apartment-base-plan-2026-10-21.png) and [SVG](apartment-base-plan-2026-10-21.svg), 133 px/m, real scan adjacency/current furniture; supersedes the old independent rectangles for geometry.
- [Derived measurements and latest host inputs](scan-measurements-2026-10-21.json). Source SHA-256 retained there and in the review. Original geometry is not committed.
- [Current decor plan](../final-room-plan.md) and [shopping holds](../shopping-ready.md) point to the received scan and latest user corrections.

## Verification

Performed while preparing this handoff; final file/link/whitespace checks repeated before commit:

- GLB header/declared length, identity transforms, vertex/index decoding, top floor triangles and boundary area checked; source data parsed successfully. Bedrooms' wall-centerline floor area separated from estimated inner-wall usable area.
- Base-plan PNG decoded and visually inspected after label spacing correction; SVG parsed. Drawing retains the broad vestibule opening and does not introduce the false central-hall entrance.
- Inline preview inspected on desktop and a **320 px iframe** with no horizontal overflow. Browser viewport override did not change IAB size; a separate narrow preview wrapper was used, then override reset.
- Bed modes, live desk-depth input and numeric block movement checked in the browser; out-of-bounds/overlap/route warnings observed. Latest dimensions show **98 / 54**, flat comparison **68 / 27**. Pointer drag was not separately exercised.
- Basket product arithmetic is unchanged; existing 26-row quantity/totals checker rerun. Local Markdown links, GLB-copy hashes/ignore rules, new JSON/SVG/PNG and JavaScript syntax checked before staging. No physical runtime/load/securement/installation test implied.

## Next actions / dependencies

1. One tape-measured inside bedroom wall to cross-check scale; ordinary photos of bed construction/support, closet fronts/door swing, windows, outlets/heaters and cabinet relocation destinations. No rescan or paid export needed.
2. Verify tabletop layout with 49 × 29.5-in desk, both small speakers, playback equipment and cooling; side maintenance access retained. Music task owns playback/audio testing. No audio automation was built or changed here.
3. Resolve upright support or use/rework flat fallback; guardian retains its independent support. Host's 15-in depth is the current calculation input, not an inferred structural approval.
4. Tape window/drop/backdrop and tub/rail/shelf sizes, test mounts, reprice fitted fabric within $1,000 using basket cuts. Do not order the old example lengths/counts.

## External changes / Git

No purchases, paid accounts, home-model uploads, cart edits, external/session messages, automation setup or deployments. A local browser preview at `http://127.0.0.1:8766/` remains available for layout exploration (temporary Python server session `58535`; narrow preview at `/narrow.html`). The inline study runs without that server. Browser experiments are not adopted as new default layouts without an explicit decision. Raw GLB/screenshot stay ignored. No memory hits were relevant.

Focused scan checkpoint follows this handoff; report its actual hash in the final chat instead of amending this file to insert itself. Git staging/commit require sandbox escalation for the read-only `.git` area; do not bypass a real rejection. At preparation, dirty files were all this task's 11 named paths; check shared-main status immediately before staging and after committing.
