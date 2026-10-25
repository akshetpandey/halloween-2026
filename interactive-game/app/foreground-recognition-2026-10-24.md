# Foreground-first guardian recognition pilot

October 24, 2026. **Implemented and locally verified; phone/party-light validation remains open.** This extends [the runtime review](guardian-recognition-review-2026-10-24.md) in response to the host's preference for recall over precision: a missed guardian is worse than an occasional mistaken suggestion, but empty rooms must not wake guardians continuously.

## Decision and behavior

Keep the small MobileNetV3 CPU/WASM encoder and the original reference matcher. Add a spatial feature path that uses a rough host-drawn outline on each useful reference view. It compares local features belonging to the guardian against features outside that outline, then looks for the same features anywhere in the centre of a new frame. The new camera photo does **not** need a mask, detector, segmentation pass or room map. This is foreground weighting, not perfect background or illumination invariance: CNN receptive fields still include context, and color/material appearance still matters.

The original photos and global vectors remain intact. For an outlined guardian, strong spatial matches can start the existing three-frame confirmation; a weaker but distinct match offers **Wake [guardian]** for explicit confirmation. Ambiguous or unsupported matches keep looking. The original scene matcher remains available for guardians without outlines and if the regional model fails; the host Lens has a comparison checkbox. The pilot remains in the Access-protected host page and existing Workers rehearsal, with the sealed custom-domain guest gate unchanged. No puzzle/Favor is awarded by recognition.

The fox/tree authored 3D performances are unchanged. Recognition outlines are separate from saved movement/entrance geometry and do not deform the character. Other existing reveals retain their segmentation path after identification.

## What was measured

Private input: two tree-lamp views and three fox views. There are still no separately enrolled empty-room negatives. Original photos, IDs, vectors, polygons, SQL and screenshots stay under ignored `private/foreground-recognition-2026-10-24/`. [Sanitized pilot measurements](scripts/vision-lab/foreground-results-2026-10-24.json) contain no photos, reference IDs or descriptors.

### Crop/mask screening

Native single-thread ORT CPU with Sharp preprocessing, on this Apple Silicon Mac. These are exploratory comparisons, not phone timings or an accuracy estimate.

| Input treatment | Cross-view tree similarity with original MobileNet |
| --- | ---: |
| Existing centre crop reproduced offline | 0.736 |
| Tighter hand-defined crop | 0.766 |
| Tighter crop, grayscale | 0.787 |
| Hand-outlined foreground on neutral background | 0.873 |
| Hand outline, grayscale | 0.880 |

Grayscale hurt some fox matches, so it is not a default. A separate DINO global-feature screen increased the masked tree similarity to about 0.936, but took roughly 264 ms native inference and uses the existing 21.95 MB experimental quantized graph. That does not establish a better mobile experience.

Actual browser MagicTouch 512/WebGL masks selected substantial walls in these lamp views. Their cross-view similarity fell to **0.696** with a centre point and **0.663** with three assisted prompts. This is why automatic MagicTouch masking was rejected as a preprocessing requirement for live recognition. Clean manual reference masks helped; unreliable query masks did not.

### Spatial MobileNet pilot

The same pinned backbone exposes its **7 × 7 × 576** map before global pooling. The derived graph is **3,718,329 bytes**, SHA-256 `77e5b1653beb883822338bd6d4100d3b2655f4861e45c056babc8275f89e29b7`. It shares the existing single-thread ORT CPU runtime; no npm dependency or larger runtime is added. The original 6,082,421-byte global model/version is unchanged. Both graphs can coexist; file size is **not** peak runtime memory.

Reference patches inside/outside the outline become foreground/background prototypes, normalized and quantized to int8, with up to sixteen representative vectors per group. Up to six outlined views per guardian are saved. A new frame is contain-fitted to 224px on neutral gray, preserving the entire lamp instead of cropping away its shade/roots. Synthetic padding is excluded, with attention restricted away from the two extreme grid columns.

For each query patch: `score = foreground cosine + 1.5 × (foreground cosine − background cosine)`. Average the five best supported patches per guardian and compare distinct identities. These are heuristic scores, **not probabilities**, and can exceed one. Pilot acceptance requires score ≥0.78, foreground cosine ≥0.64, foreground/background contrast ≥0.025 and distinct-guardian gap ≥0.10. Manual suggestions require respectively ≥0.68, ≥0.58, ≥0.005 and ≥0.05. Original global thresholds remain 0.80 / 0.04. Existing enrolled room negatives continue to inform the global path; spatial rejection currently uses the outlined references' own backgrounds.

The production quantized matcher was tested with each query's source view excluded from both galleries: five photos × original, quarter-brightness, blue tint and synthetic background replacement = **20 cases**. **19 accepted the correct identity automatically; one offered the correct fox for manual confirmation; none chose the wrong identity.** Four background-only crops produced neither automatic matches nor suggestions (highest spatial score **0.518**). Native inference averaged about **10.5 ms** across the 24 samples, excluding decode/resize/matching.

The actual browser worker and production Lens component also recognized the held-out lamp and fox, then opened their existing 3D reveals. Both shape-plus-scene worker reports were about **30 ms on this Mac**. Those initial worker reports included preprocessing/inference but excluded gallery matching, initial download, photo preparation and 3D setup. The final implementation also performs gallery matching inside that worker and includes its time in diagnostics. A synthetic capacity probe with ninety outlined references spread across fifteen identities took about 121ms warm matching on this Mac; this is a compute-size check, not fifteen-object accuracy. Keeping that work off the UI thread preserves responsive camera controls; full-gallery phone latency still needs measurement. Original-camera capture remains 12 fps ideal / 15 max, serial recognition up to 4 Hz, three matching frames spanning at least 500 ms. There is no per-frame segmentation. Model preparation is retained between Lens visits; the regional graph warms on Lens entry after the original encoder.

**Limits:** only two identities/five existing enrollment views, with threshold selection and evaluation on this same tiny fixture set. The transformed photos are not independent new captures; digital darkening/tints do not reproduce phone exposure, noise, LED spectra, blur or people. Four crops cannot establish a false-positive rate. This is a reversible pilot with a better local result, not a 95% party-accuracy claim. No new iPhone/Android latency, peak-memory, battery or fifteen-class benchmark was completed.

## Why not switch to a bigger model now?

Reference-region matching is the useful idea: [DINO's official demonstrations](https://ai.meta.com/blog/dino-self-supervised-learning-demo/) and [FoundPose](https://github.com/facebookresearch/foundpose) illustrate local-feature/object matching; neither was integrated as a phone dependency here. [DINOv3](https://github.com/facebookresearch/dinov3) and [MobileCLIP2](https://github.com/apple-aiml-research/ml-mobileclip) remain accuracy candidates if the physical test exposes failures. Their native/model-card results do not establish mobile-browser latency or memory.

[YOLOE visual prompting](https://docs.ultralytics.com/models/yoloe/) is relevant to a fixed roster. The prior local export already took about 2.2–2.3 seconds and missed one fox view, while static export bakes prompt classes. That is a poor trade for the host's editable reference gallery at this point. SAM/EdgeSAM segment pixels; they do not independently identify these fifteen specific props. Bigger segmentation is unnecessary before an authored 3D reveal. See [the October 23 model comparison](guardian-model-review-2026-10-23.md).

## Host setup and real test

1. Open [host guardian references](https://hollow-court.com/host?tab=guardians), choose a guardian and tap **Outline for recognition** / **Edit guardian outline** below a reference. Tap around the whole object, leaving wall/table outside; give thin branches room. Undo/start again are available. Save, reopen and check it. Do this for useful distinct angles, up to six. A rectangular rough outline can work; the lamp benefits from following the thin trunk instead of including a large wall rectangle.
2. The two current tree and three fox photos have starter outlines prepared from their private originals. Review them; original images and baseline vectors were not replaced. A new angle can still need another reference, but changing room or bulb color should first be tested against these outlines, rather than automatically adding a full new gallery.
3. Keep a genuinely new photo/clip out of enrollment. Move the lamp to a different wall, then test warm/blue/purple/dim conditions at guest distance, with people passing behind it. Include shade, trunk and roots, but avoid making it tiny. Test other decorations and a similar-looking lamp too.
4. In **Test the Looking Lens**, compare **Use guardian outlines** on/off with the same held-out input. Correct strong matches still show three confirming leaves. A weaker **Could it be…?** does not auto-wake: tap **Wake [guardian]** only if correct. That confirmation freezes the photo and stops camera tracks before the reveal.
5. Record correct auto / correct tap / wrong auto / wrong suggestion / miss, time to first candidate and stable reveal, and any reload. Test iPhone Chrome/Safari plus ordinary Android Chrome. Add a useful missing angle or an actual dim-light photo only when the result shows why it is needed. Do not globally lower thresholds from positive-only tests.

Poor light eventually removes usable detail. A small neutral light on the prop is more useful than relying on saturated colored wash alone; avoid bright shade glare and leave the camera time to expose. The host's October 24 message accepts NFC/QR as contingency. **NFC is the stronger dark-room fallback because it needs no visible contrast. QR needs enough light/focus and readable contrast; a phone torch may help.** No physical QR/NFC rollout or dark-room scan test was performed here. Previous guidance against guardian QR codes is superseded only by this contingency preference, not by a decision to print/deploy new codes.

## Storage and reproduction

Migration `0009_recognition_focus.sql` adds a child table of reference IDs, versioned descriptors, polygon and update time. Originals remain host-only KV. Host-only GET/POST/DELETE focus endpoints require existing Access/CSRF/rate controls. Rehearsal manifests receive only guardian/reference IDs and compact descriptors; polygons and photo storage keys are omitted. Paused guardians/stale reference models are excluded for guests. Deleting an original reference cascades to its outline.

`npm run build` recreates the pinned regional graph via `scripts/prepare-fast-vision.mjs`. For private offline setup, `node scripts/prepare-recognition-focus.mjs private/input.json private/output.json` accepts rows `{file, referenceId, guardianId, polygon:[[pixelX,pixelY],...]}` and writes profiles locally. It never uploads anything. Keep both files ignored. The host editor computes equivalent descriptors in the browser; browser and Sharp resampling can produce slightly different vectors.

API integration checks cover auth, malformed descriptors, save/read, descriptor-only manifests, the six-view concurrent cap, paused filtering and cascade cleanup. Worker tests cover bounded map output, tensor disposal and original-matcher fallback after regional failure. Shared matcher tests cover ambiguity, unsupported backgrounds, manual suggestions and padding. Browser checks cover the actual worker/Lens and saved editor. Deployment/commit evidence belongs in [the handoff](handoff-2026-10-24-foreground-recognition.md).
