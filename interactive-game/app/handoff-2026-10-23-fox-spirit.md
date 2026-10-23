# Host fox spirit prototype handoff

- Session title: Host scanner → scripted 3D spirit, with local capture preview.
- Updated: October 23, 2026, America/New_York.
- Checkout: shared `main` at `/Users/akshet/workspace/halloween-2026`, base `692caed`. No worktree, branch, subagent, purchase or new account.
- Scope: client host Lens/references, lazy Three.js renderer, public licensed sample GLB, motion/capture validation, local preview harness, tests and camera/phone documentation. The only Worker change adds hashed GLB files to its existing immutable asset policy. No API/schema changes.
- Status: prototype deployed and verified. Matching physical-prop model and actual-phone art/performance acceptance remain open.

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

- TypeScript and final production build passed. Final `npm test`: **132 tests / 18 files passed**, including macOS Vision QR checks. New checks cover convergent framing, storyboard final orientation, cover-fit mapping, actual GLB validation, bounded/external resource rejection and hashed/unhashed/HTML-fallback GLB caching. The focused final run also passed 26 tests across three files.
- Wrangler 4.130.0 login/account and dry-run verified using the existing production bindings/Access issuer. Missing unrelated OAuth scopes were not requested.
- Integrated host UI through a loopback-only signed JWT fixture and isolated existing fox DB/KV: saved fox recognized in about **0.02s**, **329 matching features** anchored its entrance, diagnostics reported segmentation skipped. This is a desktop saved-reference test, not held-out accuracy or phone timing.
- Actual WebGL stage opened, closed/reopened with a fresh canvas, paused/resumed and responded to a tap. One desktop observation: **26 FPS, five draw calls, 1,922 triangles, 0.18s renderer readiness**. This is not an iPhone benchmark.
- Portrait/small-phone visual review caught/corrected inherited site-footer padding/border and off-center face framing. Final review covered 375×667 portrait and 844×390 landscape, corner-origin fixtures and the custom-asset loader. A validated ArrayBuffer fixture parsed/rendered with its embedded texture and front-direction control. The imported file bytes are reused directly, avoiding an extra fetch/read of the selected file.
- A short recording of the actual phone-size renderer is saved in ignored `private/fox-spirit-proof/fox-storyboard-sample-small.gif`; contact sheet, final still, frame timing and release checks are alongside it. These show the sample choreography, not the physical LEGO model. No actual Polycam export or iPhone performance test was supplied/completed in this session.

## Release completion

- Initial prototype deployment: version `248fb4ff-1fff-42c4-9207-d98fb2803596`, source `fb26cb4`.
- Final deployment: version **`171dc6f2-e254-41ba-bd5a-8a5ee0830996`**, source **`4a5d6ce`**, to existing `hollow-court-preview` and `hollow-court.com`. Worker startup reported 4ms. No migration, enrollment change, purchase or remote game-data mutation.
- Final assets: `index-DOMkE_co.js`, `fox-spirit-runtime-Dj0S550N.js`, `FoxSpiritReveal-DKeNOK0a.js`, `FoxSpiritReveal-Dtpg1PdQ.css`, `Fox-CslrZzG2.glb`. All fetched through the public domain with 200, matching local bytes and `public, max-age=31536000, immutable`. GLB MIME is `model/gltf-binary`; its checksum matches the committed provenance.
- Public HTML remains `no-store`; `/api/state` reports `sealed` and `previewAvailable:false`; public debug guardians return 404. Unauthenticated host UI/API redirect to existing Cloudflare Access. HTTP upgrades with 308; Worker HTTPS responses retain HSTS. Access-generated login redirects are managed outside the Worker.
- Current docs' local links and `git diff --check` passed. Private fixture images/keys/screenshots stay ignored; only the licensed public sample model is committed. No push was performed.

## Next actions and limits

1. Host phone test: fun/timing, clipping, frame rate, replay/repeated reveals, pause and camera indicator.
2. Obtain matching 31394 digital brick geometry or textured Polycam GLB. Clean/simplify, preserve appearance, rig head/tail/legs and author a convincing sit. Replace the stand-in before visual-fidelity acceptance.
3. Review this storyboard, then create distinct storyboards for later guardians. Do not automatically copy the chase to all fifteen.
4. Continue held-out recognition/negative tests separately. Three views of one guardian demonstrate the flow, not recognition accuracy.

No sibling budget/decor change. No guest LiDAR/WebXR/cloud inference requirement. Implementation commits are `fb26cb4` and `4a5d6ce`; the release evidence is committed separately. No unrelated dirty files were present. Agent-owned loopback servers and browser tabs are closed at handoff.
