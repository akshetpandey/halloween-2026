# Guardian recognition through the phone camera

Research checked **October 23, 2026**. Requested by the host as a possible replacement for NFC, with segmentation, scan effects and animated guardians. **Feasible architecture; recognition accuracy and phone performance have not been tested.** This document proposes a pilot. It does not mark a camera feature deployed or change the currently implemented NFC encounters.

[Game home](../README.md) · [Physical roster](../physical/entity-plan.md) · [Application](../app/README.md) · [Handoff](handoff-2026-10-23-guardian-camera-research.md)

## Recommendation

Build toward **photograph a guardian → recognize it from enrolled reference photos → briefly awaken it in the captured image → open its existing puzzle**. Start with a small on-device image matcher and an optional object cutout. A Worker can handle a bounded cloud recognition fallback, game identity and puzzle access. Keep continuous camera tracking as an enhancement after the captured-photo flow works.

This fits fifteen known guardians better than asking a general image classifier what is in the room. Use **one shared vision encoder and a reference gallery**, not fifteen separate large AI models. Compare the new photo's image features with stored examples of each actual prop. A tiny classifier trained on those features is another option if nearest-neighbor matching is insufficient. Neither approach has established accuracy for our objects yet.

If “models” means GLB/3D assets of the guardians, those are useful for animation. They are different from the recognition model. Rendered views can augment reference data, but actual photographs remain necessary to cover material, lighting and background differences. The existing SVG guardian illustrations are presentation assets, not a tested recognition dataset.

## What each capability does

| Capability | Result | Assessment for this event |
|---|---|---|
| Image recognition | Chooses one of fifteen guardian IDs, or returns unknown | Practical to prototype locally; dim-light accuracy is the main uncertainty |
| Segmentation | Separates the chosen object from its background | Browser-ready models exist; well suited to a captured frame |
| Animated reveal | Glow, shadow motion, breathing cutout, then animated character art | Achievable without generating video for each guest |
| Live tracking | Keeps an effect aligned as the camera or object moves | Higher risk: needs location, temporal tracking and recovery from occlusion |
| Full 3D animation | Turns a rigid ornament into a moving creature with viewpoint changes | Needs an authored/rigged asset and a tracking solution; a mask alone does not provide either |

Segmentation does not automatically identify which custom twig spirit is present. An object mask also does not locate its eyes, joints or hidden surfaces. Recognize identity separately; use authored visual anchors for blinks or articulated motion.

## Recognition candidates

### On-device matching: preferred first experiment

**MediaPipe Image Embedder / MobileNetV3** provides image features and cosine-similarity comparison, including a region-of-interest option. Its small model is the lightweight baseline; compare the large variant if needed. Google supports web use and recommends moving synchronous inference off the UI thread. [Image Embedder overview](https://developers.google.com/edge/mediapipe/solutions/vision/image_embedder), [web guide](https://developers.google.com/edge/mediapipe/solutions/vision/image_embedder/web_js).

**DINOv3 ViT-S/16 through Transformers.js** is the stronger feature-extractor candidate to compare against that baseline. A compatible ONNX export is available. Its real advantage for our particular props must be measured. Prefer a quantized encoder and store reference features generated with exactly the same model revision and preprocessing. [Meta DINOv3](https://github.com/facebookresearch/dinov3), [browser-compatible model](https://huggingface.co/onnx-community/dinov3-vits16-pretrain-lvd1689m-ONNX).

**CLIP** also supports image-to-image matching, but the inspected vision-only quantized file is substantially larger. Its broad semantic labels are not sufficient to distinguish five handmade twig/straw figures. It is an alternative benchmark, not the default download. Transformers.js documents both image embeddings and self-hosting models/WASM. [Transformers.js](https://github.com/huggingface/transformers.js), [CLIP files](https://huggingface.co/Xenova/clip-vit-base-patch32/tree/main/onnx).

Proposed matcher:

1. Ask for one guardian centered in the frame; crop to that region initially.
2. Compute a normalized image feature vector and compare it with multiple reference views per guardian.
3. Accept only when the best score clears a calibrated threshold **and** is sufficiently ahead of the second-best guardian. Similarity is not a probability; do not label an arbitrary score “95% certain.”
4. On ambiguity, ask for a closer/brighter photo or a tap on the object. Never force every room photo into one of fifteen labels.
5. Optionally use a mask to reduce background interference and retry with matching preprocessing on the reference gallery.

For this small gallery, simple vector comparisons suffice. There is no need for Vectorize or a separate search database. If the selected encoder outputs 384 float32 features, 300 reference vectors occupy about 0.46 MB before serialization; this is arithmetic, not a measured app bundle.

### Cloudflare recognition fallback

**Workers AI Moondream 3.1** is a concrete available option: image questions, captions, object pointing and bounding boxes. It could classify a captured object against an allowlisted roster with distinctive visual descriptions, or provide the point/box for local segmentation. Its documented interface is not a custom reference-gallery upload/training service; enrolling our photos does not automatically teach it our guardian identities. Test its decisions against the local matcher. [Cloudflare release and capabilities](https://developers.cloudflare.com/changelog/post/2026-07-08-moondream3.1-workers-ai/), [model schema and pricing](https://developers.cloudflare.com/workers-ai/models/moondream3.1-9B-A2B/).

The ordinary Worker handles requests and rules; Workers AI supplies managed GPU inference. Do not plan to load full SAM or a large vision transformer into the normal Worker isolate. Its current documented memory limit is 128 MB, and the Free plan CPU allowance is 10 ms/request. Tiny vector comparison or classifier-head evaluation is a different workload. Private custom-model hosting requires a separate Cloudflare capability review, not an assumed arbitrary-weights upload. [Worker limits](https://developers.cloudflare.com/workers/platform/limits/), [Workers AI overview](https://developers.cloudflare.com/workers-ai/).

Use a cropped/compressed still image for a cloud attempt, with a bounded retry/timeout and an explicit unknown result. Avoid uploading a live frame stream. Keep credentials server-side. A generic “owl” answer must not automatically accept an owl costume, artwork on a screen or another unrelated ornament.

## Segmentation and the awakening

**SlimSAM** is the first cutout candidate. Its maintained browser-compatible model card demonstrates point prompts and mask output. The quantized encoder plus decoder total about **13.8 MB** in the inspected repository; runtime, processor files and working memory are additional. A center-point prompt works only if the guardian occupies the center; allow a tap when the initial mask selects its base or background. [SlimSAM model and example](https://huggingface.co/Xenova/slimsam-77-uniform), [files](https://huggingface.co/Xenova/slimsam-77-uniform/tree/main/onnx).

**MediaPipe Interactive Segmenter / MagicTouch** is the alternative. It uses points/strokes to select a foreground object and provides a mask suitable for visual effects. The currently recommended model is roughly 30.5 MB. Google documents synchronous calls, so use a browser worker or otherwise isolate the operation. Test mask quality on thin antlers, twigs and translucent veils; those are difficult boundaries. [Interactive Segmenter overview](https://developers.google.com/edge/mediapipe/solutions/vision/interactive_segmenter), [web guide](https://developers.google.com/edge/mediapipe/solutions/vision/interactive_segmenter/web_js).

For a captured photo, use the mask to draw a soft outline, dim the room around the guardian, release gold pollen from its silhouette, and move its shadow or cutout slightly. Then transition into a short, authored character animation. A bad or slow mask should fall back to the guardian's illustrated reveal and still let the guest reach the puzzle.

Examples using existing voices:

- **The Very Certain Owl:** its outline gathers moonlight; the scene settles into animated owl art with one blink and a head tilt. “An opinion is a start. I prefer something I can defend.”
- **The Black Correspondent:** its shadow turns first; a feather crosses the screen before the greeting appears.
- **The Gilded Root:** light travels up the branches; a line of gold script forms, then becomes the trial heading.
- **The Ember Guest:** embers pulse through the isolated figure and drift into its illustrated portrait.

On an arbitrary guest photograph, use silhouette effects. Put precise eye and limb motion in the authored portrait, where positions are known. Pre-rendered transparent clips, layered SVG animation or a small rigged GLB are all presentation options; choose per character. Video generation can be done once during asset preparation if desired, rather than waiting for generation on every scan. Sound starts only after a guest action and should be optional in the party environment. Honor reduced-motion preferences.

### Continuous “alive in the camera” effects

There is current evidence for browser video segmentation: Google's **October 19, 2026 LiteRT Tensor API announcement** links an on-device WebGPU SAM 2 segmentation/tracking demo. Its reported speed is not a measured result on our guests' phones. This is a useful stretch experiment; the newly released pipeline should not gate entry to a puzzle. [Google announcement and demo](https://developers.googleblog.com/native-model-authoring-for-edge-with-litert-tensor-api/).

Full SAM 3/3.1 offers text/visual-prompt segmentation and tracking, but Meta's reference setup requires Python/PyTorch and a CUDA-compatible GPU. It is not a drop-in phone-web or ordinary-Worker dependency. A browser-optimized export would need separate verification. [SAM 3 reference implementation](https://github.com/facebookresearch/sam3).

For flat guardian artwork, **MindAR** is a different, simpler route: compile the image into a target, detect it through the camera, and anchor an animated object to it. This suits a decorative illustrated plaque or a flat figure, with no NFC/QR electronics. Its documented image-target feature does not establish arbitrary 3D-object tracking from one reference photo; changing viewpoints on a raven figurine is a separate problem. [MindAR quick start](https://hiukim.github.io/mind-ar-js-doc/quick-start/overview/), [project](https://github.com/hiukim/mind-ar-js).

## Guest flow

The website must already be open: camera recognition cannot launch an unknown website by itself. Onboarding can explain **“Open the Looking Lens when you find a creature.”** The existing Partiful/invitation links provide entry to the site.

1. Tap **Awaken a guardian** on the Court page.
2. Explain camera use briefly, then request the rear camera. Use a normal HTTPS camera view and a large shutter; allow a native take-photo fallback where the live camera is unavailable.
3. Show a soft framing guide and subtle ambient particles immediately. Do not draw a supposedly recognized outline before a real mask/target is available.
4. Capture a still. Run recognition; display an honest scanning state. If needed: “Move a little closer; the wood cannot quite see.”
5. On a match, play a skippable short awakening and the guardian's existing greeting.
6. Open the same assigned puzzle. A valid solution still earns the one Favor; a photo or model label does not award a point.
7. Stop the camera when leaving the lens. An earned guardian can acknowledge the guest without another award.

Camera permission over HTTPS is broadly available; individual camera constraints and in-app browser behavior still vary. Avoid depending on a particular torch or continuous-focus API. Offer **Open in Safari/Chrome** guidance when an embedded browser cannot supply the camera. [Camera API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

## Phone and download feasibility

WebGPU now ships in Safari 26 on iOS as well as macOS. Older phones/browser versions still matter; use capability detection **and an actual model-load/inference attempt**, with a CPU/WASM or cloud path. ONNX Runtime's published compatibility table still disagrees with newer Safari platform documentation; pin and test the runtime/model combination rather than treating either table as proof that every operation works. [WebKit Safari 26](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/), [ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript/web.html).

File metadata checked directly by HTTP HEAD or the Hugging Face file-list API on October 23. These are **download sizes, not RAM use, latency or recognition measurements**. Decimal MB; runtime/config files excluded.

| Candidate | Selected files | Bytes | Download MB |
|---|---|---:|---:|
| MobileNetV3 small embedder | float32 TFLite | 4,117,670 | 4.12 |
| MobileNetV3 large embedder | float32 TFLite | 10,889,458 | 10.89 |
| DINOv3 small | quantized ONNX graph + external weights | 21,945,937 | 21.95 |
| DINOv3 small alternative | q4 graph + external weights; operator support must be tested | 14,836,561 | 14.84 |
| SlimSAM | quantized vision encoder + prompt/mask decoder | 13,785,975 | 13.79 |
| MagicTouch | int8 task bundle | 30,525,312 | 30.53 |
| CLIP ViT-B/32 | quantized vision model only | 89,117,001 | 89.12 |

Metadata sources: [Google model links](https://developers.google.com/edge/mediapipe/solutions/vision/image_embedder#models), [MagicTouch model link](https://developers.google.com/edge/mediapipe/solutions/vision/interactive_segmenter#models), [DINOv3 files](https://huggingface.co/onnx-community/dinov3-vits16-pretrain-lvd1689m-ONNX/tree/main/onnx), [SlimSAM files](https://huggingface.co/Xenova/slimsam-77-uniform/tree/main/onnx), [CLIP files](https://huggingface.co/Xenova/clip-vit-base-patch32/tree/main/onnx).

Observed model revisions: DINOv3 ONNX `48988dfe73065df8d6f5ccc0edc7c8bcf307de41`; SlimSAM `5850ab45f587c112167512ffef949107115e26a0`. Verify model licenses/notices when packaging: the inspected DINOv3 export uses the DINOv3 license; SlimSAM is Apache-2.0. Vendor models or binaries were not downloaded or added to Git in this research.

Only ship the selected combination, not every candidate. MobileNet small + SlimSAM is about 17.9 MB of weights; quantized DINOv3 + SlimSAM is about 35.7 MB. Lazy-load segmentation, show preparation progress and cache versioned models after first use. At 60 guests, the latter is about 2.1 GB of first-download weight traffic across all phones, before runtime files; a server-first photo path may be preferable if venue connectivity makes large initial downloads slow. Test cold loading as well as warm inference.

## Fit with our existing Cloudflare app

The app already has HTTPS, first-party camera permission policy, session identity, guardian IDs, puzzle assignments and scoring. It currently uses React/Vite + a Worker, D1 and private KV portraits. It has no recognition runtime, enrollment gallery or Workers AI binding in the inspected code.

Proposed additions:

- A first-party `/scan` lens and a browser worker for recognition/masks; load only the selected models.
- A private host enrollment flow or local preprocessing tool for reference photos, guardian labels, masks and model-versioned features. Keep private references out of Git.
- A Worker endpoint to resolve recognized guardian IDs to the existing encounter, plus an optional bounded Workers AI call. Retain server enforcement of player, event time, puzzle validation and one-time awards.
- For a local matcher, a client-supplied ID or vector is not evidence of physical presence. This is a party discovery aid; it does not prevent photographed-screen/replay or developer-tool shortcuts. Existing shareable NFC URLs also do not prove presence. If stronger evidence is wanted, it is a separate product requirement.
- Scope permission/CSP updates to self-hosted WASM and browser workers. Current CSP permits only same-origin scripts/connections and lacks explicit WASM compilation permission; plan `'wasm-unsafe-eval'` where required and the necessary worker policy. Use single-thread WASM unless cross-origin isolation is deliberately configured and tested. Do not broadly enable JavaScript unsafe-eval or third-party model CDNs.
- Extend the existing immutable asset/cache rules to versioned `.wasm`, `.onnx`, `.onnx_data`, `.tflite`/`.task` as appropriate. The current filename allowlist does not cover them.

Worker Static Assets currently allow at most **25 MiB per file**. The selected quantized DINOv3 and SlimSAM component files fit individually; the inspected MagicTouch bundle does not. MagicTouch would need suitable object storage/delivery or another explicitly engineered packaging approach. R2 was not activated in the September implementation; its current account state was not checked. [Static asset limits](https://developers.cloudflare.com/workers/platform/limits/).

A transient recognition frame does not need to join the permanent selfie collection. Prefer local-only frames by default; for a cloud attempt, send the crop, explain the upload, process it without application-level image retention, and do not put frame contents in logs. Any dataset collection for improving recognition should be explicit. This is separate from the existing retained guest costume portraits.

## Reference capture and physical risks

Enrollment proposal: **10–20 varied real photos per guardian** to start, covering front/side angles, near/far framing, normal and actual party lighting. Short videos can supply spaced reference views. Capture a separate test set on another pass/phone; do not evaluate using neighboring frames from the enrollment video. Add negative examples: the same shelf without its guardian, ordinary room objects, unrelated animal decorations and screens displaying guardian artwork.

The latest roster and October 21 placement proposal suggest the following risks. These are engineering judgments, not model test results.

| Guardian group | Expected challenge | Preparation |
|---|---|---|
| Owl, fox, stag, hare | Broadly different silhouettes, but figures may be small | Fill the capture guide; enroll the exact figure and scenic base |
| Raven / skull-and-branch shrine | Dark shapes, possible overlap between bird and shrine content | Use distinctive composition and train/test both together |
| Five stick/straw guardians | Similar material; colored bindings can disappear in dim purple light | Make shape/proportion distinct, add contrasting texture, include all near-neighbor confusions in the pilot |
| Glowing moon and golden tree | Clipped highlights, similar luminous decorations, reflective surfaces | Expose for the object, include its distinctive mount/context, provide gentle neutral fill if needed |
| Giant DJ guardian | Large object, crowds, partial views, changing colored light | Recognize a stable guest-facing head/torso region from safe viewpoints |
| Moon Well witness | Ambiguous installation rather than one compact object | Define and enroll the distinct threshold witness **outside** the bathroom; do not ask guests to photograph the occupied bathroom |

## Cost and scale

Thirty to sixty guests finding all fifteen guardians means **450–900 successful recognitions**, before retries. This is a small reference-gallery problem. Local matching/masks incur model delivery and normal site costs, with no per-inference AI service charge.

Moondream's checked model page lists **$0.30 per million input tokens / $1.00 per million output tokens**. An illustrative 900 calls at 2,000 billable input tokens and 50 output tokens each is about **$0.59**; three attempts each is about **$1.76**, before allowances and ordinary platform charges. Actual image token accounting and measured call usage must replace those assumptions. This is not a spending commitment or a guarantee of free-plan capacity. Workers AI has a daily free allowance and stops further free-plan operations when the allowance is exhausted; verify capacity and a hard call limit before making cloud recognition essential. [Model pricing](https://developers.cloudflare.com/workers-ai/models/moondream3.1-9B-A2B/), [Workers AI billing](https://developers.cloudflare.com/workers-ai/platform/pricing/).

## Pilot and decision gate before October 31

With eight days until the party, prioritize a captured-photo reveal. Prototype on **one bought animal, two similar handmade figures**, then add a luminous decor guardian before choosing the engine. This covers both easy and difficult cases rather than demonstrating only the owl.

1. Enroll actual objects and a held-out/negative photo set in their final lighting. Compare MobileNetV3 vs quantized DINOv3; test Moondream on the same difficult frames. Record unknowns and wrong IDs separately.
2. Run on two different iPhones including an older supported device, and one midrange Android. Include Safari, Chrome and an invitation opened in an embedded browser. Test cold model download, reload/cache behavior, permission denial and network loss.
3. Test SlimSAM cutouts on a frozen frame, with MagicTouch as the alternative. Keep mask quality optional for opening the puzzle.
4. Proposed acceptance targets: at least 95% correct identification on held-out valid captures, no wrong guardian accepted in the pilot's negative/confusion set, warm capture-to-match p95 under three seconds, and a recoverable cold-start experience. These are targets, not achieved measurements; publish sample counts and per-guardian results rather than claiming general accuracy from a small test.
5. Expand to all fifteen and test the most confusable pair at every placement. Only retire the NFC path after the camera pilot passes; keep any fallback discreet and avoid reintroducing physical QR codes.

The deliverable for the first build should be the camera/shutter, genuine enrolled recognition, graceful retry, skippable awakening and the unchanged puzzle flow. Live tracked silhouettes, fully articulated 3D and generated dialogue are later enhancements. The immediate dependency is reference images of actual finished guardians; the repository currently supplies illustrative art and a proposed prop roster, not a validated capture set.
