# The Looking Lens — guardian camera prototype

Updated October 23, 2026. The host authorized live camera discovery as a possible NFC replacement. The current revision uses a small, warmed recognizer and continuous frame extraction. Existing puzzles, Favor validation, NFC routes and the public time gate remain in place. [Live revision handoff](handoff-2026-10-23-live-lens.md) · [Earlier captured-photo build](handoff-2026-10-23-guardian-camera-prototype.md). Actual-prop/phone acceptance is still open.

## Start testing

Use the [phone walkthrough](guardian-phone-test.md) for a first test with a few references, held-out photos, live scanning and the complete onboarding flow.

1. Open the [host dashboard](https://hollow-court.com/host?tab=guardians), sign in with the existing host account, and select **Guardian reference photos**.
2. Choose the character for a physical guardian. Upload front, left and right photographs to begin. Centre the entire object inside the middle square, with some space around it. Add varied distances and actual party lighting; aim for 10–20 useful views, maximum 40 per guardian. Use ordinary phone photos, not the website illustrations.
3. Add **Room backgrounds · not a guardian** examples: empty shelf, nearby decoration, ordinary objects. Enroll at least two distinct guardians before judging rejection.
4. If photos were saved with the first prototype, choose **Refresh saved views** for each guardian and background group. This recomputes features locally from the retained private originals. No re-upload is needed. Old feature vectors are excluded from matching until refreshed.
5. Choose **Test the Looking Lens** and wait for **Lens ready · awakening ready**, then choose **Open the live lens**. Allow camera access and centre one object in the square. It samples up to four frames per second, requires three consecutive matches spanning at least half a second, then captures a frame and wakes the guardian automatically. No shutter tap is needed. **Choose a photo** also accepts an unused photo of the object for a quick test.
6. The greeting and trial button appear immediately after recognition. The outline runs separately; its cutout lifts and glows when ready. Guests can enter the puzzle while it is still outlining. Tap the creature to refine the outline, or skip it. Only solving the puzzle earns Favor.

Host diagnostics show recognition preparation, awakening preparation, per-photo outline inference, per-frame processing, number of sampled frames and time to a stable match. **OUTLINE PROCESSING** compares WebGPU preference with CPU fallback against explicit CPU. Changing the outline backend replaces its shared session so two large models do not remain alive at once. Recognition always uses the warmed small CPU model, avoiding GPU shader compilation before scanning. **Test a video** runs a local clip through the same video element/frame loop without a webcam; it never uploads the clip. Photo selection and the native phone camera remain fallback options.

Guest rehearsal: [Workers preview](https://hollow-court-preview.computer-toolbox.workers.dev) → **Field notes → Looking Lens · camera prototype**. Registered rehearsal guests also have a Lens button on the Court homepage. Guest `/scan` and vision APIs remain unavailable on the public domain during this pilot. Access-protected host enrollment/testing works before the event opens.

## Phone and real-prop acceptance

Normal RGB photos are sufficient to test. iPhone 16 Pro LiDAR is optional future asset work, not a guest requirement. This implementation consumes no depth or mesh data. A textured [Apple Object Capture](https://developer.apple.com/documentation/realitykit/capturing-photographs-for-realitykit-object-capture) asset could later supply 3D animation or extra reference angles.

Reserve separate held-out views and clips for each real object: front/sides, close/far, bright/dim/party lights, clutter and partial occlusion. Test other guardians and ordinary objects too. Record correct matches, wrong matches, rejections, cold preparation, warm match time and mask quality. Repeat in iPhone Safari and Chrome on an ordinary Android. A Mac viewport/video fixture does not establish phone accuracy or performance.

Defaults are **0.80 cosine similarity** and **0.04 lead** over another guardian/background. These are starting settings, not probabilities or measured accuracy. Improve reference coverage before lowering them. The host can adjust both in Calibration and pause individual guardians. Uncertain frames reset the match streak; the scanner keeps looking instead of guessing.

The effect is a captured-frame 2D awakening after live recognition. It is not a continuously tracked mask or an articulated 3D creature. Segmentation can still take several seconds on CPU; it does not gate the trial. First use must download and initialize the runtime/models; weak network conditions can still delay readiness. Recognition preloads and runs its warm-up during name/selfie onboarding and recovery entry, followed by segmentation, without blocking either flow. Returning rehearsal guests warm on session restoration too. SlimSAM runs a synthetic zero-input encoder/decoder pass to prepare its kernels, disposes those temporary tensors, and retains both sessions. It does not segment the guest's selfie. The page keeps separate shared recognition and segmentation workers across the Court, puzzles and Lens visits; opening the camera reuses them. Leaving the Lens clears per-photo embeddings while keeping the models warm. If preparation is still running, the Lens joins that same operation. Failed or reclaimed workers are retried, and a full page reload needs initialization again (cached files can still be reused). The sealed public entrance and host guest book do not initiate this preload. **Lens ready · awakening ready** confirms both models are prepared. See the [segmentation-prewarm handoff](handoff-2026-10-23-segmentation-prewarm.md) and [earlier arrival-prewarm handoff](handoff-2026-10-23-arrival-prewarm.md).

## Implementation and privacy

- **MobileNetV3 small, full precision**, pinned to [onnx-community revision b1a19675](https://huggingface.co/onnx-community/mobilenetv3_small_100.lamb_in1k/tree/b1a19675d33130739e56503b5bfd6534a0f9e01d). The ImageNet classifier is pruned, exporting normalized 1024-value penultimate features. Centre crop covers 224/256 of the short edge; input is 224px RGB with ImageNet normalization. The smaller q8 candidate was rejected after poor transformed-image matches; full precision was faster and more consistent in the Mac fixture checks.
- Best-reference cosine matching aggregates by distinct guardian; another view of the same guardian cannot become its own runner-up. Background examples participate in rejection. Model/version guards prevent mixing incompatible features.
- Camera frames are sampled serially, with one transferable ImageBitmap in flight and no frame queue. The Worker resizes directly to 224px. Duplicate video times are skipped; unknown identities or long pauses reset stability. Stopping/backgrounding closes streams and cancels stale results.
- **SlimSAM q8** encodes the captured frame, then decodes centre/tap prompts into candidate masks. The warmed encoder and decoder are reused across photos; only the current photo's embeddings are retained for refinements. Almost-empty/full-frame masks are rejected. It runs in a separate Worker and cannot delay recognition or the trial button.
- **ONNX Runtime Web 1.30.0**, one WASM thread, no cross-origin isolation requirement. Outline processing probes WebGPU and falls back to CPU, including a fresh CPU Worker after failed runtime initialization. [ORT WebGPU documentation](https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html).
- The recognition graph is **6,082,421 bytes**; its shared CPU runtime is about **14.2 MB raw** before HTTP compression. Awakening preparation adds about **13.8 MB** of model weights and optionally a separate GPU runtime during eligible onboarding/recovery (or host scanner entry). Browser caching avoids repeat downloads when retained; the public locked homepage loads none of these assets. Older DINO files remain available for cache compatibility but the current recognizer does not request them.
- Host photos are re-encoded as JPEG, maximum 1024px edge, then saved to private `PHOTOS` KV without expiry. Features/settings are in D1. Migration `0006_guardian_vision.sql` creates enrollment storage; `0007_fast_vision.sql` preserves all existing rows/originals while allowing both legacy 384-value and current 1024-value vectors. The Worker accepts only the current model for enrollment/refresh.
- Reference originals require Cloudflare Access plus Worker JWT verification. Registered rehearsal guests receive only IDs, features and settings. Reference notes, original photos and NFC route codes are excluded. Guest frames/photos/masks/videos remain in browser memory; no recognition cloud API is called.
- Recognition is not proof of physical presence; a shared NFC URL could also be opened remotely. The existing server validates puzzle solutions and enforces unique Favor awards. Host reference removal is separate from the removed guest account/portrait deletion flow.

## Reproducible assets and checks

`npm run build` downloads pinned sources with SHA-256 validation, deterministically prunes the MobileNet classifier using the official ONNX schema, checks the derived checksum, writes licenses/manifests, type-checks and builds Vite. `scripts/prepare-fast-vision.mjs` records the new source and output hashes. Weights stay in ignored `public/models/`; private photos, fixture keys and runtime data stay out of Git. MobileNet/SlimSAM are Apache-2.0; ORT is MIT. Retained historical DINO assets include Meta's separate license.

The GPU runtime exceeds the [25 MiB static-file limit](https://developers.cloudflare.com/workers/platform/limits/), so the Worker streams its two static pieces with backpressure/cancellation. Successful versioned model/runtime URLs are immutable for a year. The Worker supplies a binary content type when Static Assets omits ONNX MIME metadata, so model downloads can actually stay in browser cache. HTML fallbacks/errors never receive model caching. HTTPS, HSTS, CSP, private API caching and existing host protections remain.

```sh
npm run db:local
npm run build
npm test
# Local Worker + signed host JWT fixture configured as described in README:
npm run test:integration
node scripts/check-vision-models.mjs /absolute/path/to/test-image.jpg
npx wrangler deploy --dry-run
# Apply migration 0007 before publishing the current Worker:
npx wrangler d1 migrations apply DB --remote
npx wrangler deploy
```

Restart local Wrangler after each production frontend rebuild if its static watcher is disabled. Tests cover matching/rejection, temporal stability, GPU recovery, private originals, current/legacy vector validation, refreshing saved photos, disabled guardians, cache policy and no Favor for recognition. Actual-model smoke checks validate tensor outputs and report Mac CPU timings; they do not establish real guardian accuracy.
