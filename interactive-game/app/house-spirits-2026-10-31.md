# Four house spirits — October 31

Status: four exported characters ready for runtime integration and independent review; deployment and host phone acceptance are separate gates. Shared checkout `main`; starting commit `1ba43c2`. This subtask owns the four asset directories, deterministic builder, its asset tests and this note. The release coordinator owns runtime integration and Git checkpoints.

The private original references were inspected directly. No photograph pixels, room scenery, personal information, scan surfaces or external services enter these public assets.

| Guardian / output                     | Defining identity and palette                                                                                                                                                                       | Individual performance                                                                                                                                  |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-01 / `moon/MoonThatStayed.glb`    | Exactly one complete cratered ivory sphere on a honey wooden three-leg stand. Warm charcoal eyes, muted silver craters. This is the Moon Well listener.                                             | Wakes with a slow blink; listens to one side, then the other, cups its small hands, understands and gives a gentle forward acknowledgment.              |
| DEC-03 / `guardian/KeeperOfPulse.glb` | The actual reference is an expressive pale faun/ram mask with curled side horns, green eyes and moss, above a black jacket with red and ivory stripes. The miniature DJ desk supports the identity. | Notices a beat, tests a platter with one hand, makes a syncopated two-hand phrase, nods and offers a restrained front-facing salute.                    |
| DEC-04 / `seed/LastSeed.glb`          | Ribbed orange open-mouth candy pumpkin, short green stem/leaf, attached black eight-legged spider with white eyes. Foil-wrapped chocolate motifs are authored without brands.                       | Spider peeks over the brow; the pumpkin rolls a chocolate forward, spider briefly applauds with its front legs, and both settle into an inviting smile. |
| DEC-05 / `skull/UnfinishedGuest.glb`  | Pale, hornless, long-muzzle wolf skull, dark nasal cavity and sockets, rounded teeth, moss support. Distinct from the horned jacket-wearing Keeper.                                                 | Notices a little autumn leaf, chatters its hinged jaw in surprise, gently noses the leaf, then looks toward the viewer with an inquisitive tilt.        |

Each asset uses +Y up, +Z front and a grounded neutral pose. Shared clip contract: `Idle` 2.4s loop; `Awaken` 0.9s once; `Play` 3s once; `Settle` 1s once; `Greet` 2.4s loop. Every segment begins/ends in the same neutral pose; the authored performances therefore join without a pose snap, while runtime supplies the common emergence and stage presentation.

Target per asset: fewer than 18,000 triangles, 45 primitives and 1MB; self-contained GLB, no image textures. The builder writes SHA-256, exact geometry/resource metrics and source notes. Private references remain under ignored `private/live-guardians-2026-10-31/`.

| Export | Bytes | Triangles | Primitives |
| --- | ---: | ---: | ---: |
| MoonThatStayed | 229,876 | 7,560 | 7 |
| KeeperOfPulse | 309,476 | 10,436 | 18 |
| LastSeed | 432,148 | 14,825 | 31 |
| UnfinishedGuest | 184,344 | 5,588 | 6 |

Self review loaded the actual exported GLBs in Chrome, inspecting front and three-quarter silhouettes, multiple Play poses and live sequence playback. This caught weak moon crater readability, faceted pumpkin normals, an oversized mouth cut, flat Keeper pupils, an elbow seam and elevated spider feet; the final exports correct those issues. Moon crater lips conform to the sphere. The pumpkin has a smooth ribbed surface and rounded mouth rim. Keeper hands rest at platter level with overlapped elbows. These observations are desktop author review, not host acceptance.

Independent visitor-agent review compared exported front/three-quarter Idle and Play midpoint/end poses and the actual production phone component for the pumpkin and Keeper. It found all four identities readable, no detached parts or sampled clip-end pop, and intact phone composition/copy/controls. Its suggested Keeper forehead-spiral correction was applied: the green spiral now follows the actual curved forehead surface rather than being partly embedded, with a slightly thicker, deeper green line. This remains sampled desktop motion review; physical phone frame rate and host art acceptance are open.

Checks actually run: `npx vitest run tests/house-spirit-models.test.ts` — 13 passed; `npx tsc --noEmit` — passed; `git diff --check` — passed. The tests load all four exported GLBs, match checksums/metrics, reject photo textures/external buffers, sample animation bounds, keep stationary supports fixed, verify neutral joins/closed loops, and require the moon, decks, offered chocolate, spider forelegs, skull jaw and autumn leaf to perform distinct movements. An unchanged rebuild of all four assets was byte-identical. Each output directory contains its exact SHA-256 in `provenance.json` and a source note.

Handoff: release coordinator integrates the four stable paths above, obtains independent appearance/motion review, runs the actual production component at phone sizes and performs the authorized push/deploy. Independent iPhone/Android art, frame rate and recognition acceptance remain untested by this modeling task. No purchases, messages to guests or deployment were performed here. The reference originals and temporary review harness stay ignored under `private/`; none is a public asset.

Git checkpoints are serialized by the release coordinator; this subtask does not stage or commit concurrently. The coordinator records resulting commit and deployment references in the release handoff. The unrelated dirty `decor/shopping-ready.md` was present at start and was not touched.
