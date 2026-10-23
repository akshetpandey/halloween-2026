# The Looking Lens — guardian camera prototype

Implemented October 23, 2026. Host-authorized rehearsal of photo discovery as a possible NFC replacement. Existing guardian routes, puzzles, Favor validation and the public time gate remain in place. Deployment evidence is in the [handoff](handoff-2026-10-23-guardian-camera-prototype.md); real-prop/phone acceptance is still open.

## Start testing

1. Open the [host dashboard](https://hollow-court.com/host?tab=guardians), sign in as the existing host, and select **Guardian reference photos**.
2. Choose the character corresponding to a physical guardian. Upload three ordinary photos to begin: front, left and right. Keep the actual object large in the frame with a little surrounding space. Add dim-light views and different distances next; aim for 10–20 useful views per object before the party. Up to 40 views per guardian are supported. Batch upload and the phone camera are available.
3. Add a few **Room backgrounds · not a guardian** images: empty shelf, nearby decorations, ordinary objects. Also enroll a second distinct guardian. Testing a single positive class alone does not establish reliable rejection.
4. Choose **Test the Looking Lens**. Take or select a **different** photograph. Automatic processing prefers WebGPU; the host can select **CPU / WASM** to compare. Diagnostics report the recognition/outline backend, elapsed time, top matches and the gap. The similarity score is not a probability.
5. A match traces the captured image, lifts a glowing cutout out of its dimmed background, adds drifting particles and introduces the guardian with its existing greeting and animated illustration. Tap the creature to refine the mask, or retrace from the centre. A slow/failed outline can be skipped. The guest's **Hear its trial** opens the existing assigned puzzle; only solving earns Favor.

Guest rehearsal: [Workers preview](https://hollow-court-preview.computer-toolbox.workers.dev) → **Field notes → Looking Lens · camera prototype**. Registered rehearsal players also have a Looking Lens button on the Court homepage. Guest `/scan` and its APIs are unavailable on the public domain while this is a prototype. Host enrollment and the host test remain available through Access before the event opens.

Changing reference photos does not retrain a large neural network. Each photo is converted locally into a small image-feature vector, then stored as another example for comparison. Pausing a guardian excludes its examples from guest matching and encounter resolution; it does not change its puzzle, Favors, or maximum game score.

## Test capture sheet

Use normal RGB photos from any phone first. The iPhone 16 Pro's LiDAR is optional: a textured Object Capture scan could later provide a 3D asset or rendered reference angles, but this prototype accepts photographs and does not consume depth/meshes. Native LiDAR acquisition is not a guest requirement. See [Apple's capture guidance](https://developer.apple.com/documentation/realitykit/capturing-photographs-for-realitykit-object-capture).

For each physical object, reserve separate test images: front/sides, close/far, bright/dim/party light, cluttered background, partial occlusion. Test the other guardians and ordinary room objects too. Record correct match, wrong match, rejection, recognition/outline timings and whether the outline selected the whole creature. Repeat in Safari on the host's iPhone and Chrome on a non-Pro Android. Phone viewport checks on a Mac do not replace these tests.

Defaults are a **0.80 similarity threshold** and **0.04 gap** ahead of another guardian/background. They are starting settings, not a measured accuracy claim. Raise the threshold/gap to reject uncertain images; fix weak reference coverage before lowering them. The host can adjust both in Calibration. A matched background or close tie asks the guest to try again instead of guessing.

This is a captured-photo, 2D awakening with local segmentation, rather than continuous live tracking or a generated 3D performance. It provides a testable baseline for those later effects.

## Implementation and storage

- DINOv3 ViT-S/16 q8 produces normalized 384-value CLS embeddings; nearest-reference cosine matching aggregates the best view per guardian. A second view of the same guardian cannot act as its own runner-up. Background negatives participate in rejection.
- SlimSAM q8 encodes the captured photograph and decodes a positive centre/tap prompt into candidate masks. The image embedding is reused for tap refinements. Heuristics reject almost-empty/full-frame masks; the host can inspect area and model score.
- ONNX Runtime Web **1.30.0** runs in a dedicated module Worker. Probe WebGPU, prefer the GPU execution provider with supported CPU operations, fall back to WASM on creation/run failure, and restart a fresh CPU-only worker if GPU/runtime initialization fails. No user-agent allowlist or LiDAR requirement. Inference uses one WASM thread without requiring cross-origin isolation. See [ORT WebGPU](https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html).
- Photos are re-encoded as JPEG with a maximum 1024px edge before processing/upload. Host originals go to private `PHOTOS` KV keys, without expiry; descriptors/labels/settings are in additive D1 migration `0006_guardian_vision.sql`. Host-only reference removal is separate from the removed guest account/portrait deletion flow.
- Reference originals require the existing Cloudflare Access identity plus Worker JWT verification. Registered rehearsal guests receive only IDs, vectors and settings, with no original photos, notes or route codes. Their captured test photos/masks remain in browser memory and are released on closing; they are never uploaded. No recognition cloud API is called.
- Encounter resolution returns an enrolled, enabled guardian's existing route. A client match is not proof of physical presence: the guest can photograph a picture or alter client requests, as a shared NFC URL could also be opened remotely. Scoring still requires server-side puzzle validation and preserves unique awards.
- Model/runtime downloads are same-origin and lazy. The public locked homepage does not download them. Roughly 50 MB CPU / 63 MB GPU model+runtime bytes before HTTP compression are needed for first recognition+outline; browser cache can avoid later downloads but may be evicted. Preparation and shader compilation can dominate cold timing. Try the first scan on Wi-Fi.

## Reproducible assets and deployment

`npm run build` prepares pinned, SHA-256-checked DINO/SlimSAM weights, license/NOTICE files and the exact npm-pinned ONNX runtime, then type-checks and builds Vite. Weights stay in ignored `public/models/`; credentials, reference photos and test data stay out of Git. Source revisions/checksums are in `scripts/prepare-vision.mjs` and the served `manifest.json`. DINOv3 uses its own Meta license; SlimSAM is Apache-2.0; ONNX Runtime is MIT. Keep the delivered license files and review terms before other uses.

Cloudflare's [Static Assets limit](https://developers.cloudflare.com/workers/platform/limits/) is 25 MiB per stored file. The GPU runtime is split into two smaller static files and streamed as one same-origin WASM response by the Worker, with backpressure and cancellation. Successful versioned model/runtime URLs are immutable for a year; HTML fallbacks/errors are never cached as models. CSP allows first-party WASM compilation, module workers, and blob photos/media. Existing HTTPS, HSTS, private API caching and other security headers remain.

```sh
npm run models:prepare
npm run build
npm test
npm run db:local
# With local Worker running and the existing signed host JWT fixture configuration:
npm run test:integration
# Optional actual CPU model execution, using an explicitly chosen local test photo:
node scripts/check-vision-models.mjs /absolute/path/to/test-image.jpg
npx wrangler deploy --dry-run
# Apply this additive migration before deploying the new host APIs:
npx wrangler d1 migrations apply DB --remote
npx wrangler deploy
```

If Wrangler warns that its local asset watcher is disabled, restart `wrangler dev` after rebuilding; otherwise new hash URLs may resolve to SPA HTML. The smoke script checks finite embedding/mask output and tensor shapes; it does not establish semantic accuracy. Unit/integration tests cover unknown/tied/background rejection, GPU-to-CPU recovery, streamed runtime handling, host authentication/private originals, malformed enrollment, disabled guardians and zero points for recognition.
