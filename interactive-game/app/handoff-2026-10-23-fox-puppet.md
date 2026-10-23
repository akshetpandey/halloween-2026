# Fox head and tail awakening

- Session title: Make the photographed fox move beyond a floating cutout.
- Updated date: October 23, 2026, America/New_York.
- Scope: client fox rig, renderer, Lens controls, geometry tests and camera documentation.
- Checkout, branch and base: shared `/Users/akshet/workspace/halloween-2026`, `main`, base `610e7a1`.
- Status: implemented, committed, deployed and verified on both hosted domains. Physical iPhone animation testing remains open.
- Confirmed user request: add a little life, such as blinking or head/tail motion, and identify the current segmentation model. Implemented head/tail movement; no blinking or generated video is claimed.
- Proposals awaiting decision: none required for this prototype.

## Implementation

- [FoxAwakening](src/client/FoxAwakening.tsx) renders the existing masked photograph on a 40×40 grid with separate weighted rotations around the neck and tail base. The body stays in place rather than floating as a whole. Small WebGL 1 shader, one draw call, 24fps cap, bounded 512px texture; no new runtime dependency or model download. The existing CPU inference pipeline is unchanged.
- [Fox rig](src/client/fox-rig.ts) estimates initial points from the silhouette for the pilot's upright-tail fox. This is a heuristic, not automatic head/tail detection. Host **Adjust fox movement** exposes four points and a captured-photo tap editor, then **Watch movement** resumes the preview. Adjustments are in-memory/per-capture, not stored or mapped across live views. Guests receive the default estimate and pause/resume control.
- Reduced motion renders the neutral pose. Hidden documents stop the frame loop; Lens exit releases WebGL resources/context and the image. Context unavailable/lost or shader/image failure keeps the static glowing cutout. Fox fallback no longer floats as a whole. The implementation does not add recording or keep camera hardware alive.
- Segmentation remains Google **MagicTouch float32 v1, 512px**, 6,227,884 bytes, through **MediaPipe Tasks Vision 1.1.1 / InteractiveSegmenterLegacy**, CPU/WASM in a dedicated Worker. Recognition remains MobileNetV3 small. [Pinned source/build](scripts/prepare-segmentation.mjs) · [Google model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MagicTouch.pdf). The mask separates an object from background; it provides no eye/anatomy landmarks.

## Actual checks

- All **119 tests across 15 files passed**. Five new geometry checks cover empty/degenerate fallback, edge-touching/tiny images, pinned joints, coincident adjustment points and portrait/landscape metric consistency. The initial tiny-image test exposed an out-of-bounds neck estimate; clamped it before the successful full run.
- The first sandboxed suite failed Apple's native QR inference check because Vision could not load its ANE model. Re-running the full suite with normal system-model access passed all 119, including that unchanged QR check. No QR source or test was changed.
- TypeScript and production build passed. Wrangler dry-run passed with the existing Worker/bindings (173.92 KiB Worker / 57.37 KiB gzip). No server/schema/API/auth changes.
- Actual Chrome Play browser with isolated local copies of the host's three fox references: first photo recognized correctly (0.09s), outline 1.14s; final-build side photo recognized correctly (similarity 0.934, 0.08s), outline 0.89s. Side-view outline includes the tail; first photo still misses the upper tip. Both were saved references, not held-out accuracy evidence.
- Verified active textured canvas at **384×512**, static cutout hidden while the puppet renders, separate head/tail poses, working **Let it rest / Wake it again**, and actual tap adjustment changing the Head marker. Chrome error/warning capture was empty during the first render check. Forty-five consecutive native browser screenshots record about 3.5 seconds of the actual side-view animation; an animated GIF was assembled preserving capture intervals. Private evidence remains ignored under `private/fox-pilot-2026-10-23/`, including `fox-puppet-motion.gif` and `fox-puppet-preview.png`.
- Leaving through **Back to reference photos** removed the puppet canvas (zero remaining); reopening the Lens showed **Lens ready · awakening ready** without repeating model initialization.
- Browser context-loss/reduced-motion fallback paths are implemented but not yet induced on a physical phone. No frame-rate or memory benchmark on iPhone is claimed. Photo pose quality remains approximate and cannot recover missing mask regions.

## Handoff

- Next: refresh the host page on iPhone, choose **Test the Looking Lens**, wait for both ready messages and choose the side-view fox photo. Watch head/tail movement, pause/resume, and adjust points if needed. Follow the [phone guide](guardian-phone-test.md) for a fresh photo and live-object test afterward.
- Remaining: iPhone performance/stability, held-out recognition, varied/front/right-facing poses, live scans, and whether a future saved per-reference rig/landmark model is worth adding. No promise of correct semantic placement on arbitrary animals or views.
- Published existing `hollow-court-preview`, version **`aef41780-fea6-4cea-9682-530bf6caf8e5`**, to Workers preview and `hollow-court.com`. Uploaded three changed static assets: HTML, `index-BM9X3xXn.js` and `index-DS5KTLBf.css`. Both hosts serve exact local client/CSS bytes, with immutable asset caching and `no-store` HTML. Existing recognizer/outline Workers and model files are unchanged.
- Remote gate checks: both anonymous states remain sealed; public preview is disabled and vision references return 404, while Workers preview enables rehearsal and unauthenticated vision references return 401. No new Cloudflare resources or permissions, reference uploads/calibration changes or paid services.
- Sibling dependencies: none. All durable decisions/findings are in these camera documents; private reference photos/features remain out of Git.
- Commits/unrelated files: **`3d6958d`** implements the tested animation and docs; deployment-evidence documentation follows. No unrelated dirty paths observed. Local proxy/test Worker stopped and owned browser tab closed after verification.
