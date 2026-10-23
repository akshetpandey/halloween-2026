# Host Lens initialization crash

- Session title: iPhone Chrome host-test crash fix.
- Updated date: October 23, 2026, America/New_York.
- Checkout, branch and base: shared `/Users/akshet/workspace/halloween-2026`, `main`, base `641655f`.
- Scope: segmentation/runtime/prewarm lifecycle, host test, regression checks and camera docs.
- Status: implementation, regression and browser checks passed; publishing next. Physical iPhone Chrome retest remains open.
- Confirmed user evidence: host test reliably crashes iPhone Chrome just after initialization, before starting a camera/photo (October 23).
- Proposals awaiting decisions: none needed for the fix.

## Findings and implementation

- Controlled local CPU run of the previous recognizer + retained SlimSAM encoder/decoder warm-up/photo smoke reached **1,968 MiB peak RSS / 1,949 MiB current RSS** after execution. Mac did not reproduce the actual iPhone process termination, but the size/timing strongly implicates segmentation memory pressure. These are whole-process native smoke measurements, not an iPhone memory limit or new-model measurement. User photos/camera were not needed to trigger that large allocation.
- Replaced SAM with the 512px **MagicTouch v1 CNN**, pinned 6,227,884-byte model with SHA-256 `e24338a717c1b7ad8d159666677ef400babb7f33b8ad60c4d96db4ecf694cd25`. [Google model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MagicTouch.pdf) licenses it under Apache-2.0 and describes mobile/browser object segmentation. [MediaPipe guide](https://developers.google.com/edge/mediapipe/solutions/vision/interactive_segmenter) distinguishes the legacy small model/API from the newer 768px stateful model. We deliberately use `InteractiveSegmenterLegacy` with its compatible small model.
- Added exact dependency `@mediapipe/tasks-vision@1.1.1`, CPU delegate in [a separate Worker](src/client/segmentation.worker.ts). Model and ES-module runtime are self-hosted/versioned/checksummed via [prepare script](scripts/prepare-segmentation.mjs). All fit the Static Assets file limit. TFLite responses get binary MIME/immutable caching, with HTML/error guards intact. No external recognition/image API.
- [Recognition Worker](src/client/vision.worker.ts) can now only prepare/embed MobileNet; SAM/GPU code is removed. Saved reference features and `VISION_MODEL` are unchanged, so no re-enrollment/migration. Host sequentially warms recognition then the smaller outline, matching onboarding. The old GPU selector is removed. Reference thumbnails load lazily to reduce simultaneous decode memory.
- Warmed models still survive navigation. New-photo source pixels are capped at 512px before outline inference; results are copied inside the callback and transient masks released. Only the current small working image remains for tap refinement; reset/exit clears it. Camera release rules are unchanged.
- [Interrupted-outline guard](src/client/outline-safety.ts) sets a tab-scoped pending marker around preparation/inference. Normal success/caught failure clears it. After a crash/reload during work, automatic outline attempts are blocked on the next load; recognition/trial remain available, with **Retry awakening outline** for explicit retry. Storage restrictions do not break the page. This avoids repeatedly doing interrupted work on automatic reload; it does not claim to catch a browser process kill inside JavaScript.
- Canonical [prototype guide](guardian-camera-prototype.md) and [phone walkthrough](guardian-phone-test.md) supersede earlier SAM/WebGPU details. CLI model smoke now tests recognition by default; `--legacy-sam` explicitly enables the old comparison.

## Checks and release evidence

- Full `npm test`: **114 passed across 14 files**, including native QR checks, existing game behavior, CPU worker routing, bounded 4032px source handling, model reuse/tensor lifetime, failure retry, crash-marker recovery and model MIME/cache guards.
- `npm run build`: passed; client `index-fXSpQV_o.js`, recognizer `vision.worker-CKQRZfqP.js`, outline `segmentation.worker-LmolQjFk.js`.
- Chrome Play actual-model browser check: replacement warm-up **2.53s**, held-out synthetic owl recognition **0.10s**, outline **0.96s**, usable mask. No personal images/webcam used. This is Mac browser evidence, not a phone benchmark or proof of physical iPhone stability.
- Final Chrome browser build: preparation **2.33s**, video fixture stable owl match **0.60s / 3 frames**, outline **0.86s**, refinement **0.87s**. Closing/reopening host Lens reused both ready models. A held-out photo also produced a mask in **0.89s**. Screenshot ignored at `private/lightweight-outline-verified.png`.
- Actual UI reload during an outline left recognition ready and displayed the interrupted-outline message plus explicit retry, without restarting that outline automatically. Explicit retry started the new preparation. This exercises the guard without killing a browser process.
- Current CLI recognition smoke: finite 1024-value features, warmed median **9.0ms**, p95 **9.5ms**. Default smoke no longer initializes SAM.
- `git diff --check`, local Markdown links, and Wrangler dry-run passed (173.92 KiB / 57.37 KiB gzip). Deployed version/exact hosted checks follow below.
- External changes: no new Cloudflare resources, schemas, user data, auth permissions or paid services. Public time gate and preview-only camera rollout remain unchanged.
- Remaining: host closes the old/crashed tab, reopens the host dashboard on iPhone Chrome and tests preparation, a held-out photo and repeated scans. Phone memory pressure, real-prop mask quality and dim-light recognition acceptance remain open. New model's peak browser memory is not yet measured; no exact reduction percentage is claimed.
- Dependencies on sibling tasks: none.
- Unpersisted details: all durable findings are here; no secret/private guest data was saved to Git.
- Commits/unrelated dirty files: implementation checkpoint pending. No unrelated dirty files observed.
