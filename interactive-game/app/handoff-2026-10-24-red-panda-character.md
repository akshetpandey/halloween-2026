# Red panda character · October 24, 2026

- Session: Hollow Court fox asset revision, desktop thread `01a08367-2c08-7451-8ede-52803d3c1c40`.
- Checkout: shared `/Users/akshet/workspace/halloween-2026`, `main`, base `ece0921`; no worktree or branch.
- Status: clean authored character implemented and locally verified; deployment evidence follows below.
- Confirmed direction: host supplied a Polycam capture of LEGO 31394, then rejected the scan-derived appearance, loose geometry and broken tail. The earlier modeled fox was cuter. Use captured proportions and colors as reference while prioritizing a deliberately modeled character. The host explicitly permits prop-specific geometry, rigs, recognition and choreography.

## Completed

- Preserved the original `/Users/akshet/Downloads/Red Panda .glb` unchanged (SHA-256 `8c149e52a6fb268559056b8bf3fac3a5bbe8d00e00c0cb8534a40dd76b9ad282`). Its approximately 4.1 MB mesh included the table/chairs and three 4K texture atlases.
- Isolated the panda, removed the table plane/bridges, repacked retained-object texture islands and experimented with a rigid rig. **This output failed visual review and is not shipped.** Private source/intermediates/rejected asset remain under ignored `private/panda-scan-2026-10-24/`. [Extraction tool and limitation](scripts/guardian-models/README.md).
- Built a new [authored character](src/client/assets/red-panda/SOURCE.md) with clean rounded toy geometry, warm orange/cinnamon/ivory palette, large expressive face, eye blinks, ear flicks, closed moving parts, articulated ankles, and one watertight five-bone tail with continuous weights through the painted stripes. No raw capture geometry, table pixels or photo textures are bundled.
- Survey → Run → Settle → Greet clips preserve the emergence/tail-chase/front-facing greeting storyboard. Chase turns follow the route continuously; actions briefly crossfade. Idle/run loops return to the same pose. Pause, replay, greet, imported GLB preview and error recovery remain available. Resizing while paused redraws the same animation instant.
- Added a host download link for the authored GLB. Clear local capture returns to the woodland panda. Updated credits to distinguish the new original character from a scan or an official LEGO reconstruction.
- Camera capture, reference enrollment/recognition, all other guardians, NFC/puzzle routes, scoring, time gate and Access policy are unchanged.

## Verification

- New contract checks load the real GLB with GLTFLoader and SkeletonUtils clone, validate mobile import limits/checksum, no images/textures, one watertight tail component, normalized five-bone weights, finite deformed positions, matching painted-seam deformation, named clips, real blinks and seamless loops.
- Motion regression checks include equivalent yaw at entry/exit of the chase.
- Full suite: 135/135 passed before the final ankle/yaw refinement; final verification recorded below. The first sandboxed suite failed only because Apple Vision could not load its native ANE inference plan; the same suite passed with normal macOS access. QR code/decoder sources were not changed.
- Typecheck/build and Wrangler dry run passed during implementation; final checks below.
- Real renderer inspected in the 390×844 phone harness, including recorded chase frames. Desktop diagnostics showed approximately 26 FPS, 20 draw calls (before separate ankle groups), 27,598 rendered triangles including effects and 0.05s ready time on the warm laptop. These are laptop observations, not phone benchmarks.
- Original scan is unchanged; no new modeling service, dependency, purchase, API or database migration.

## Remaining acceptance

1. Reload the live host page on iPhone, clear a locally selected capture if present, and use **Preview fox spirit**. Then **Test this reference** with a fox photo.
2. Review charm, palette, chase timing, paws and settled pose on the real phone. The character is intentionally stylized; it is not an exact digital brick model. Animation polish remains subject to host review.
3. Check repeated open/close, background/resume and camera-to-reveal memory/performance. No phone FPS or scan-fidelity acceptance is claimed here.
4. Storyboard and author distinct characters for the remaining guardians; do not stamp the fox chase onto all fifteen.

Commit and deployment evidence will be added after publishing. All changed files belong to this task; no unrelated dirty files were present at the start.
