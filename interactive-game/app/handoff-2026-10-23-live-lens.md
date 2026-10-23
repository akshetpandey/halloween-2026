# Live Looking Lens revision — October 23, 2026

- Session: guardian camera prototype, continued after the host reported unacceptable laptop latency.
- Checkout: shared `/Users/akshet/workspace/halloween-2026`, `main`; prior prototype commit `7ae4426`. No branches/worktrees or delegated sessions.
- Status: implementation and local checks complete; hosted release evidence below. Actual-prop/phone acceptance remains pending.
- Confirmed user direction: recognition should run in seconds on a live camera feed using frame extraction. Preserve local processing, host reference uploads, segmentation and animated awakening. Ordinary guest phones must work without LiDAR.
- Current implementation/testing authority: [Looking Lens guide](guardian-camera-prototype.md). Earlier DINO build is recorded separately in the [v1 handoff](handoff-2026-10-23-guardian-camera-prototype.md).

## Delivered

- Full-precision MobileNetV3 small penultimate features replace DINOv3 in the recognition path. The pruned graph is 6,082,421 bytes; source revision, original/derived SHA-256 and preprocessing are pinned. Original classifier is removed, not mistaken for an image embedding. The q8 candidate was slower and performed poorly on transformed fixtures; it was rejected before publishing this revision.
- Recognition warms on opening the Lens and keeps its CPU session across retakes. One transferred frame is processed at a time, at most four per second. Separate video timestamps, at least three consecutive matches and at least 500 ms of stability are required. Unknown/changed identities reset the streak. No video-frame queue or repeated model compilation.
- Stable recognition captures a frame and reveals the guardian immediately. A separate Worker performs optional SlimSAM segmentation with WebGPU preference/fresh WASM fallback. The guest can enter the trial while the outline is still running. Native camera/photo selection remain fallbacks. Streams stop on closing/backgrounding; stale asynchronous results are discarded.
- Host diagnostics separate preparation, frame timing, stable-match latency and outline timing. A host-only local video input tests the actual frame loop without needing a webcam. Clips are never uploaded.
- Existing original reference photos are preserved. The host can refresh their features with one button per guardian/background group. Old-model features are excluded from matching until refreshed. Additive migration 0007 keeps legacy 384-value rows and supports current 1024-value features. Access/JWT and private original-photo protection are unchanged.
- Owned changes: app client/shared/worker, migration 0007, model preparation/smoke scripts, package/lockfile, temporal/API tests, app guide/README/build brief, family instructions/README/tracker and a current-status note atop historical research. No game scoring, event clocks, voting or physical routes changed.

## Verification actually performed

- `npm test`: **89 tests passed**, including temporal stability, matching, fallback, 9,000 generated puzzle cases, QR and DST checks. The existing native Apple Vision QR check ran with normal macOS cache access.
- `npm run test:integration`: **6 tests passed**, including anonymous/guest host API denial, private original bytes/cache policy, legacy-feature exclusion, bad model/dimension rejection, authorized refresh preserving the original photo and ID, guardian pause and no Favor for recognition. Local synthetic fixtures only.
- `npm run build`: TypeScript/Vite passed. `wrangler deploy --dry-run` passed; same Worker and bindings. `npm audit --omit=dev`: zero vulnerabilities. `git diff --check`: clean.
- Actual full-precision ONNX CPU execution: finite 1024-value output; **9.5 ms median / 11.1 ms p95 over 20 warmed inferences** on this Mac. SlimSAM finite masks/scores; about 6.36 seconds encode/decode. These are execution checks, not phone or real-object accuracy results.
- Browser host refresh: retained owl/raven/background originals were successfully reprocessed through the UI. Their features were computed locally by the real new model. No synthetic data was uploaded to Cloudflare.
- Browser live pipeline: rotated/resized held-out owl clip, enrolled front-view illustration, raven competing class and ordinary-background negatives. **0.52–0.78 seconds to stable match (3–4 sampled frames)**, **11–19 ms last-frame processing**; owl similarity .925 vs raven .644, gap .281. Cached/local model preparation .22 seconds. CPU outline about 5.8–6.1 seconds afterward. Cold internet download time is separate and unmeasured.
- The matching host UI visibly showed its awake guardian and enabled continuation while the outline was still pending. The guest photo fallback also visibly showed **Hear its trial** during outline preparation, and that button opened the owl's Three Witnesses puzzle. Recognition itself awarded no points.
- Ordinary-background video remained rejected over 67 sampled frames; best guardian .195, background decision. This is a synthetic plumbing check, not a false-positive benchmark.
- Mobile layout: viewport/document width both **393px**, no horizontal overflow. Local screenshot `private/guardian-live-lens.png` captures the current live match/awakening/timings. Reference images, videos and screenshot are ignored and contain no actual guests.
- Actual rear-camera permission/hardware capture, iPhone Safari/Android performance, real objects, party lighting, long-session memory/battery and mask quality still need physical tests. This build does not yet perform live mask tracking or rigged 3D animation.

## Cloudflare release

- Remote pre-upgrade check: **zero enrolled references**. No actual host photos have been changed by this session.
- Migration **0007_fast_vision.sql applied remotely**, all six SQL statements succeeded. Existing enrollment storage was preserved; local preservation/refresh was tested above.
- Worker publication and post-release checks: pending final entry.
- No new resource, paid API, Access scope/policy, host identity or retention deadline. Existing authentication from the preceding authorized CLI login is reused.

## Next acceptance steps

1. Host enrolls actual objects, at least two distinct guardians and ordinary room examples. Refresh any old saved views if prompted. Use the dashboard's live Lens test on iPhone Safari and an ordinary Android.
2. Measure cold readiness, warm matching, confusion/rejection, dim-light behavior, permissions, orientation/backgrounding and several minutes of continuous scanning. Adjust reference coverage before thresholds.
3. Decide whether camera discovery can become public. Until that explicit decision, guest discovery remains Workers-preview-only and existing NFC routes remain usable.

No purchases, messages, new chats, LiDAR capture or guest-photo uploads. Temporary loopback proxy/JWT fixtures were used only locally and stopped after browser verification. Commit hashes are reported in the session response rather than repeatedly amending this file for its own hash.
