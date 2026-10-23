# Host fox spirit prototype handoff

- Session title: Host scanner → scripted 3D spirit, with local capture preview.
- Updated: October 23, 2026, America/New_York.
- Checkout: shared `main` at `/Users/akshet/workspace/halloween-2026`, base `692caed`. No worktree, branch, subagent, purchase or new account.
- Scope: client host Lens/references, lazy Three.js renderer, public licensed sample GLB, motion/capture validation, local preview harness, tests and camera/phone documentation. No Worker/API/schema changes.
- Status: local implementation/tests complete; deployment verification recorded below after publishing. Matching physical-prop model and phone art/performance acceptance remain open.

## Confirmed user direction

The host authorized a proper animated 3D fox in the host test page, emerging from the recognized prop and moving into a large, standard screen-facing performance. This is a hide-and-seek game, not continuous AR. Later steering requires shape/texture to match the real prop, confirms **LEGO 31394 Red Panda**, offers Polycam capture, and asks for carefully storyboarded animation such as a circle/tail chase before sitting and looking at the player. Existing requests to ignore Reduce Motion in Lens animation and fully stop camera tracks remain in force.

## Completed work

- [Canonical prototype/storyboard/capture instructions](guardian-spirit-prototype.md), linked from README, camera plan and phone walkthrough.
- Host **Preview fox spirit** without a camera, plus automatic launch after fox recognition or **Test this reference**. Saved ORB geometry supplies its entrance under an 850ms budget, with a centered fallback. Host fox skips segmentation; guest/other-guardian outlines remain.
- Approximately 6.6s entrance → tail notice → authored Run cycle around a circle → provisional procedural hind-leg fold → front-facing greeting. Replay, pause, tap reaction, narrative, credits, device stats, retry and portrait/landscape layouts.
- Licensed rigged fox with pinned provenance. **Explicitly a stand-in, not the physical LEGO model.** No matching 31394 digital brick model was obtained; no capture has been supplied for cleanup/rigging.
- **Try a GLB capture** validates and previews a self-contained local mesh, remembers its front direction for this visit and can replace the host fox’s model. No upload/persistence or automatic animal rigging. Bytes, geometry and decoded-texture dimensions are bounded; external resources and unbundled compression decoders are rejected.
- Per-stage graphics cleanup, cached tiny sample template, 30fps target, bounded pixel ratio, background pause. Three.js/GLB are dynamically loaded for this host path.

## Verification actually performed

- TypeScript and production build passed. `npm test`: **131 tests / 18 files passed**, including macOS Vision QR checks. New checks cover convergent framing, storyboard final orientation, cover-fit mapping, actual GLB validation and bounded/external resource rejection.
- Wrangler 4.130.0 login/account and dry-run verified using the existing production bindings/Access issuer. Missing unrelated OAuth scopes were not requested.
- Integrated host UI through a loopback-only signed JWT fixture and isolated existing fox DB/KV: saved fox recognized in about **0.02s**, **329 matching features** anchored its entrance, diagnostics reported segmentation skipped. This is a desktop saved-reference test, not held-out accuracy or phone timing.
- Actual WebGL stage opened, closed/reopened with a fresh canvas, paused/resumed and responded to a tap. One desktop observation: **26 FPS, five draw calls, 1,922 triangles, 0.18s renderer readiness**. This is not an iPhone benchmark.
- Portrait/small-phone visual review caught/corrected inherited site-footer padding/border and off-center face framing. Final checks and hosted release evidence follow below.

## Release completion

Deployment/final checks pending at the initial checkpoint. No migration or remote game-data change is required. Private fixture images/keys/screenshots stay in ignored `private/`; only the licensed public sample asset is committed.

## Next actions and limits

1. Host phone test: fun/timing, clipping, frame rate, replay/repeated reveals, pause and camera indicator.
2. Obtain matching 31394 digital brick geometry or textured Polycam GLB. Clean/simplify, preserve appearance, rig head/tail/legs and author a convincing sit. Replace the stand-in before visual-fidelity acceptance.
3. Review this storyboard, then create distinct storyboards for later guardians. Do not automatically copy the chase to all fifteen.
4. Continue held-out recognition/negative tests separately. Three views of one guardian demonstrate the flow, not recognition accuracy.

No sibling budget/decor change. No guest LiDAR/WebXR/cloud inference requirement. Git references and remaining dirty state are reported with the final release.
