# Integrated QR artwork experiments

**Later correction and continuation:** the host reported the posted built-in image scans, and Apple Vision confirmed its exact payload. The jsQR failures below are decoder-specific, not proof of an unscannable image. Signed-in generation and the selected homepage asset are documented in [the continuation](handoff-2026-09-09-integrated-qr.md). This file preserves the earlier experiment results.

- Session: Hollow Court QR art revision; September 9, 2026.
- Checkout: shared `main`, base `5ec1366`; app QR artwork and verification only.
- Status: ready to continue after generator authentication. No website changes or deployment.
- Confirmed direction: the host wants the scene itself to carry the QR pattern, as in Canva and QR Diffusion examples. The existing tinted-cell overlay does not meet that visual request.
- Owned files: this handoff, `scripts/check-qr-art.mjs`, README status link. Rejected experimental images remain in ignored `private/qr-review/`; no guest data was submitted or committed.

## What was tried

1. Built-in image generation, edit mode, supplied a deterministic H-level QR for `HTTPS://HOLLOW-COURT.COM/R`. The result rendered oak branches as modules, but failed decoding at 244, 280, 320, 488 and 1024px. Not selected for production. Original output: `/Users/akshet/.codex/generated_images/01a08367-2c08-7451-8ede-52803d3c1c40/exec-24e4ebaa-bcdc-40a1-876c-772106e233c9.png`.
2. [Hugging Face's QR ControlNet Space](https://huggingface.co/spaces/huggingface-projects/QR-code-AI-art-generator), public UI, public redirect URL only. DionTimmer QR ControlNet + SD 1.5. Conditioning 1.4, strength 0.9 failed all five initial sizes. Conditioning 1.8, strength 0.85 produced a geometric woodland QR that passes 12/15 robustness checks, but fails at 768px and still falls short visually. Saved as `private/qr-review/controlnet-2.png`. Both used seed 20261031, guidance 7.5, DPM++ Karras SDE and default negative prompt.
3. [Oysiyl's artistic QR Space](https://huggingface.co/spaces/Oysiyl/AI-QR-code-generator), public UI. This produced the closest visual match: woodland buildings, roots and lanterns integrated with the code. Saved as `private/qr-review/artistic-1.webp`. It passes only 1/15 checks (244px with 0.8px blur), so it is not a deployable QR. A follow-up with stronger conditioning was rejected by the service: anonymous ZeroGPU runs limit exceeded; authentication needed for more quota.
4. [QR Diffusion](https://qrdiffusion.com/generate) opened successfully in the browser, but did not advance past entering the URL (Next disabled). No account created, login performed, or purchase made.

No raster overlay repair was used to make the generated candidates scan. The app still serves the existing working overlay; this request remains unfinished.

## Reproduction

Use `node scripts/check-qr-art.mjs <image> HTTPS://HOLLOW-COURT.COM/R` to decode the actual image at 244, 280, 320, 488 and 768px, with no blur and 0.4/0.8px blur. It exits nonzero if any case fails or the payload differs. It does not reconstruct the QR or change the source file. The plain source QR passed 15/15, ControlNet attempt 2 passed 12/15, and the artistic attempt passed 1/15. These are software checks, not phone-camera tests.

Oysiyl settings for the completed artistic candidate:

```json
{
  "pipeline": "artistic",
  "text_input": "HTTPS://HOLLOW-COURT.COM/R",
  "input_type": "Plain Text",
  "use_temporary_short_link": false,
  "image_size": 640,
  "border_size": 6,
  "error_correction": "Quartile (25%)",
  "module_size": 14,
  "module_drawer": "Square",
  "seed": 718313,
  "use_custom_seed": true,
  "enable_upscale": false,
  "enable_animation": false,
  "enable_freeu": true,
  "freeu_b1": 1.4,
  "freeu_b2": 1.3,
  "freeu_s1": 0,
  "freeu_s2": 1.3,
  "enable_sag": true,
  "sag_scale": 0.5,
  "sag_blur_sigma": 0.5,
  "controlnet_strength_first": 0.35,
  "controlnet_strength_final": 0.6,
  "enable_color_quantization": false
}
```

Usage analytics and the service's expiring URL shortener were both disabled. Plain Text mode preserves the exact HTTPS payload. No third-party redirect or runtime service dependency was added.

Artistic prompt:

> An ancient enchanted woodland village built into hollow oak trees, twisted dark branches and roots, bright ivory moonlight through leaves and windows, moss covered timber shrines and ferns, a winding path into a glowing doorway, subtle amber lanterns, eerie Samhain fairy tale painting, deep forest green and warm parchment, richly detailed, atmospheric

Default artistic negative prompt:

> ugly, tiling, poorly drawn hands, poorly drawn feet, poorly drawn face, out of frame, extra limbs, body out of frame, blurry, bad anatomy, blurred, watermark, grainy, signature, cut off, draft, closed eyes, text, logo

Older ControlNet prompt:

> An enchanted oak forest, ancient hollow tree doorway, intertwined dark mossy branches and roots, pale moonlit mist and winding ivory paths, three square woodland shrines, ferns and subtle amber lanterns, elegant eerie Samhain fairy tale book illustration, deep forest green and parchment cream, strong light and shadow, highly detailed

Built-in edit prompt:

> Use case: style-transfer. Edit the supplied exact QR code into genuinely integrated woodland QR art, with the picture itself carrying the code as in QR-conditioned diffusion. This is a production scannable invitation for Hollow Court. Keep the EXACT 29 by 29 module layout of the input, the three 7x7 finder patterns and the four-module blank cream outer margin. Every dark module's CENTER must stay dark and every cream module's CENTER must stay light. Keep all proportions and positions perfectly registered to the input. Reinterpret the dark connected regions as twisted oak branches, intricate dark green ferns, roots and moss-covered timber; reinterpret the light connected regions as warm ivory moonlit mist and paths threading an enchanted woodland. Make the three square finders into hollow oak shrines with pale wooden frames while retaining their precise concentric dark-light-dark shapes. Across the middle, suggest an ancient forest entrance, with glimmers of amber light, without displacing the code. Fine hand-painted fairy-tale engraving, deep moss green, parchment ivory, restrained amber. The image must be a single richly detailed organic woodland illustration whose light/dark structure is the exact supplied code. No small square dot overlay, no grid drawn over another image, no text, no extra barcode, no watermark. Preserve code structure more strongly than illustrative freedom, keep high local luminance contrast.

## Next actions and limitations

1. User was asked to sign in to Hugging Face or choose their QR Diffusion account. No credentials requested in chat. Continue after the response; do not create accounts, buy credits or bypass quota limits.
2. Tune the artistic model's conditioning upward. Its UI says lower strength preserves more structure, but its current `app.py` passes these values directly as `ControlNetApplyAdvanced` strength; stronger QR conditioning is the appropriate experiment. Pending values 1.0/1.0 were not run because of the quota rejection. The source's warmup itself uses 1.5/0.9. Do not claim those settings have been validated.
3. Select only artwork that meets both the visual request and exact-payload decoding checks; run real iPhone/Android camera checks before treating it as party-ready.
4. Serve the approved fixed Partiful bitmap as a Cloudflare static asset keyed to its exact encoded payload. Keep the small tappable invitation link.
5. Each personalized Summons needs its own generated-and-validated code artwork. Do not reuse the Partiful bitmap for another payload or silently replace unique invitation attribution. A production generation/cache strategy remains to be implemented; serving approved assets can stay on Cloudflare.

Dependencies: no sibling task changes. No production assets, routes, account storage, time gates, NFC codes or databases changed. Commit hash is reported in the final response; no unrelated dirty files were present at the checkpoint.
