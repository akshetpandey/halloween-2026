# Gilded Root — recognition coverage check

October 24, 2026. Two real tree-lamp reference images and three fox references are currently enrolled; no background negatives. This checks the current implementation, not a replacement model. [Sanitized numerical results](scripts/guardian-models/evidence/gilded-root-recognition-2026-10-24.json); private photos, feature vectors, keys and working scripts remain under ignored `private/gilded-root-2026-10-24/recognition-check/`.

## What moving the lamp changes

The matcher has no room/world coordinates, so moving the lamp does not invalidate a position map. It compares global image features, however, so a different wall, colored illumination, people and framing can change the result. Camera angle only supplies an optional entrance keyframe; after recognition the authored character always faces the screen at a standard large size, without segmentation. The model's honey-gold/linen palette does not change to the bulb color.

The two 768×1024 references are warm-lit, in the same room. The current 672×672 centre crop removes most of the shade and root feet, leaving a narrow trunk and substantial background. Their stored browser feature cosine is **.7516**, below the existing **.80** acceptance threshold. This is direct evidence that two views are insufficient coverage, not evidence the lamp is impossible to recognize.

## Measured offline diagnostic

Installed ONNX Runtime Web 1.30.0 CPU, pinned MobileNetV3-small f32 graph (SHA recorded in results), 1,024-D normalized features. The script imports the actual `normalizeVector` and `matchGuardian`; threshold .80, margin .04. Centre crop, 224px RGB/NCHW and ImageNet normalization match the browser worker. **Sharp/Lanczos3 resampling differs from browser Canvas high-quality smoothing**, so scores are not claimed pixel-identical. Recomputed original-to-saved scores are .9299/.9402.

| Synthetic condition       | Scores with the source reference retained |
| ------------------------- | ----------------------------------------- |
| Half encoded-RGB exposure | .9137–.9157                               |
| Quarter exposure          | .8297–.8410                               |
| Desaturation              | .8299–.8662                               |
| Purple tint               | .8390–.8426                               |
| Blue tint                 | .8242–.8258                               |
| Small central obstruction | .8045–.8557                               |

27 of 28 source-included original/perturbed cases match the tree. Artificial zoom-out/padding of one view rejects at .7942. **This is not an accuracy percentage:** the originating photograph remains enrolled. With that reference removed, both unmodified photos reject at .7158/.7094; all source-excluded perturbations also reject. Fox/tree separation in this tiny gallery is strong, but no ordinary-room false-positive rate can be calculated without negatives and held-out scenes.

Synthetic tints/darkening do not reproduce LED spectra, autoexposure, white balance, low-light noise, blur, a new wall or a moving person. [ImageNet-C/P](https://arxiv.org/abs/1903.12261) motivates separating corruption sensitivity from generalization; [CNN texture-bias research](https://arxiv.org/abs/1811.12231) is further reason not to assume background/shape invariance. [Google's embedding overview](https://developers.google.com/edge/mediapipe/solutions/vision/image_embedder) explains the image-vector/similarity approach; this app retains its own pinned ONNX encoder.

## Useful next capture set

Keep the model and threshold. Aim for **12–20 actual photographs** across a few angles and normal guest distances:

1. Warm, neutral, purple and blue lighting, including the actual intended party brightness. Do not rely only on a brightly glowing shade; capture the distinctive branch fork/trunk clearly in the middle square. Include closer fork views and wider lamp views.
2. The intended/new location and at least one genuinely different background. Keep a few new views out of enrollment for validation.
3. Add empty room/wall, nearby decorations and another ordinary lamp as **Room backgrounds · not a guardian** examples.
4. Test fresh photos and live clips with someone behind it, then a small obstruction. If a person covers most of the distinctive trunk/fork, wait for a clearer view. In real darkness, add enough ambient light for the camera rather than expecting the recognizer to recover missing detail.

Re-test after moving the lamp or changing the final lighting. Record correct matches, wrong matches, rejection and time-to-confirm on the actual iPhone/Android. Add reference coverage before considering a global threshold reduction; three stable frames suppress transient guesses but cannot make an unfamiliar view familiar. No references/calibration/production data were changed by this check.
