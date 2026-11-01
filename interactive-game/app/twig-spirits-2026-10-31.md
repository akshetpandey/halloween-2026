# Five handmade guardians — identity and performance

Updated October 31, 2026. Original procedural artwork guided by the current private reference set, not the older proposed silhouettes. The private complete-batch contact sheet and all eighteen MAKE photographs were inspected. No room/photo pixels are exported.

| Guardian                      | Physical identity anchors                                                                                          | Character and authored action                                                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MAKE-01 / fork / First Knock  | Irregular four-arm dark-wood lattice; long diagonal upper arms; low crossbar; moss head at the central/top binding | A tentative first approach. Lean back to gather courage, tap a branch three times with uneven timing, offer a small polite bow, then hold a welcoming camera-facing look. |
| MAKE-02 / ember / Ember Guest | Broad triangular frame; horizontal projecting shoulder branch; moss top; hanging loose twine tassels at both ends  | A dramatic but warm guest. Gather the tassels inward, spread and flourish them with delayed strand follow-through, acknowledge the viewer with a pleased head tilt.       |
| MAKE-03 / knots / Knotkeeper  | Tall triangle; projecting bottom/crossed sticks; center upright/string; conspicuous pale top and bottom bindings   | An exact and patient friend. Notice a loose central cord, patiently draw its bow into place, inspect the join, then settle with a proud tiny nod.                         |
| MAKE-04 / host / Little Host  | Upright densely wrapped twine doll; rounded bound head; green moss collar and thin crossbar arms; trailing straw   | An attentive host. Look both ways for an unattended guest, bring both twig arms forward in an offering, then open one arm toward the viewer.                              |
| MAKE-05 / door / Open Door    | Open asymmetric pentagon; protruding corner twig ends; two crossing diagonals; sparse moss near the top            | A quiet welcome. Let the diagonal gate swing outward, pause to leave a useful opening, then gently return it and hold a small inviting bow.                               |

Palette: walnut and dark umber branches, warmer exposed cut ends, flax/oatmeal twine, muted moss and olive, dark knot eyes with tiny parchment catchlights. Geometry stays closed and deliberately modeled, with coarse longitudinal wood grain, volumetric bindings and continuous strand curves. Faces are small additions on an existing moss/cord knot; the underlying craft silhouette remains dominant. Unseen backs are a restrained stylized interpretation. Exact physical dimensions are unmeasured; assets use normalized stage units with +Y up and +Z front.

All five use the same timing contract: `Idle` 2.4 seconds loop; `Awaken` 0.9 seconds once; `Play` 3 seconds once; `Settle` 1 second once; `Greet` 2.4 seconds loop. Runtime emergence uses Idle until 2.4s, then Awaken/Play/Settle through 7.3s, then Greet. Every non-loop endpoint joins the next clip; idle/greeting endpoints close. Local arm, head, gate, cord and tassel movement supplies each performance independently of runtime staging.

## Handoff

- Scope: `scripts/guardian-models/build-twig-spirits.mjs`, the five `src/client/assets/{fork,ember,knots,host,door}/` packages, focused asset tests, this brief.
- Checkout: shared `/Users/akshet/workspace/halloween-2026`, branch `main`; starting base `1ba43c2`. `decor/shopping-ready.md` was already modified and is unrelated.
- Implementation status: five self-contained GLBs, original editable builder, five source notes and five SHA-256/resource manifests complete. Parent integration and release are separate.
- Checks: `npx vitest run tests/twig-models.test.ts` passed 10 tests. Actual exports verify importer/resource limits, checksums, zero photo textures/external resources, clip durations/joins, loop closure, real blinks, finite sampled posed bounds and their distinct craft joints. Position-welded surfaces have zero boundary edges. Host offering arms and First Knock's tap are checked to move toward +Z. A formatted rebuild preserved all checksums; source-note links resolve and `git diff --check` passes.
- Visual self-review: private five-up WebGL viewer inspected front/action and three-quarter poses plus the running clip sequence. Corrected a pale/hollow doll by darkening flax/moss and filling its wound head/body core; corrected backward Host offerings/Fork taps. Clean modeled moss retains a stylized clumped interpretation; exact fraying and flexible wood are intentionally simplified. No independent motion/phone acceptance is claimed from these self-reviewed renders.
- Parent session owns registry/runtime wiring, integrated phone harness, serialized Git checkpoints, push and deployment. No external service, purchase, message to guests, or deployment is part of this asset authoring subtask.
- Remaining acceptance: moving renderer review, integrated portrait/landscape preview, physical iPhone/Android performance and host art acceptance must be distinguished from structural checks.

## Exported resource counts

| Asset           |   Bytes | Triangles | Primitives |
| --------------- | ------: | --------: | ---------: |
| ForkSpirit.glb  | 310,244 |     9,638 |         10 |
| EmberSpirit.glb | 494,032 |    10,444 |         22 |
| KnotsSpirit.glb | 365,788 |    10,470 |         12 |
| HostSpirit.glb  | 497,788 |    14,566 |         18 |
| DoorSpirit.glb  | 405,080 |    11,890 |         13 |

Every asset contains zero images, four small vertex-color materials or fewer, and five clips. Private review tooling is at `private/twig-spirit-review.html` and is deliberately excluded from Git. Independent sibling review and integrated preview results are to be recorded by the parent release session. Git commits are serialized by the parent session; this author performs no staging while siblings are editing.

Independent review: parent front gallery review found the walnut too dark against the production forest stage. Warmed branch side/grain colors by approximately 15–20%, keeping cut ends, twine and moss unchanged. House guardian author independently checked front/three-quarter Play poses and real small-phone Knotkeeper/Open Door framing, with no high-impact identity or joint defects. Independent reviewer also replayed Knotkeeper and Open Door in the production portrait/small-phone harness: fully framed, copy/controls readable, rods/twine connected, held front-facing finish, and no high-impact defect found in the sampled action stages. The gate visibly opens and the knot/bow remains connected. These are desktop visual/sampled-motion checks, not measured phone FPS or host acceptance.
