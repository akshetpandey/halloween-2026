# Restore the host-selected original QR

- Updated: September 9, 2026. Shared `main`, base `c165f96`.
- User decision: the initial built-in generated image looks better than the deployed Hugging Face version. Restore that original; the host previously reported it scans on their phone.
- Scope: Partiful QR asset/provenance, intrinsic image dimensions, native scan expectations and current documentation. Personalized Summons, routes, storage, gates and navigation remain unchanged.
- Result: original oak-branch illustration with amber lanterns encoded as lossless WebP at its original 1254×1254 dimensions. Raw decoded pixels match the source PNG exactly. No generation, re-illustration, resize or overlay was applied.
- Asset: [partiful-qr-art.webp](src/client/assets/partiful-qr-art.webp). [Original built-in edit prompt](src/client/assets/partiful-qr-art.settings.json). Earlier Hugging Face selection is superseded.
- Verification: build passed; all 30 QR tests passed. Apple Vision decoded 14/15 combinations: all 280px mobile and 320px desktop cases, plus other sizes, except 244px with 0.8px blur. The regression test explicitly records that failure rather than claiming 15/15. Pixel equality check passed. `git diff --check` passed.
- Tradeoff: lossless asset is 2.45 MB, preserving the exact host-selected image. The small tappable invitation link remains available. Android/party-light camera testing remains open.
- Deployment: `npx wrangler deploy` succeeded, version `ee368ec9-32f4-4962-bea3-cc64e223fc02`. Live browser verified the original oak-and-lantern image loaded at 1254px intrinsic resolution; sealed entrance and small invitation link preserved.
- Sibling dependencies: none. No account operations, purchases, new generation services or database changes. No unrelated dirty files at checkpoint. Commit hash reported in final response.
