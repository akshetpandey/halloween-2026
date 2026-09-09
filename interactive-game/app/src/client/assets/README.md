# Woodland QR artwork

`woodland-portal.webp` is an original generated illustration for the September 9, 2026 artistic QR revision. Generated with the built-in `image_gen` tool, then resized/encoded with Sharp to 1000×1000 WebP. It is consumed by `WoodlandQR.tsx`; QR data, structural markers and code rendering are deterministic application code. The user-supplied image was visual direction, not copied artwork. No guest data is included.

Exact generation prompt:

> Use case: illustration-story. Create a square full-bleed woodland illustration for Hollow Court, an elegant eerie Samhain gathering. It will be the imagery woven THROUGH a functional artistic QR code, not merely a border. Original painterly engraving / fine illustrated fairy-tale book plate, highly detailed but strong readable shapes. Deep moss-green oak trees, ivory moonlit mist, twisted roots, fern leaves and small warm amber fireflies. Central narrow pale winding path leads to an ancient hollow oak doorway lit softly gold; leafy canopy overhead, pale full moon near upper middle. No people, no text, no lettering, no logos, no actual QR code. Mostly forest green, muted olive and parchment cream, subdued ochre. Balanced square composition, three little dark square hollow wooden shrine windows integrated among foliage at roughly 23%/23%, 77%/23%,23%/77% of canvas, framed in pale wood, echoing square QR corner landmarks without being a literal barcode. The central doorway must remain recognizable as the heart of the image. Rich fine forest texture across entire canvas, quiet mystical welcome rather than horror. This is a production website art asset, flat illustration without poster margins or mockup framing.

## Integrated Partiful QR

`partiful-qr-art.webp` is the selected 1280×1280 artifact generated September 9 through the signed-in [Oysiyl artistic QR Space](https://huggingface.co/spaces/Oysiyl/AI-QR-code-generator). It is copied unchanged from the generated WebP; no overlaid modules or raster repairs were added. Its exact payload is `HTTPS://HOLLOW-COURT.COM/R`. [Exact prompt and generation settings](partiful-qr-art.settings.json). This selected asset used the hosted QR-conditioned pipeline, not the built-in image tool or fallback CLI. The earlier built-in experiment and its prompt are recorded in [the experiment handoff](../../../handoff-2026-09-09-qr-diffusion.md).

The app selects this image only for that payload; personalized Summons continue to use `woodland-portal.webp` inside their dynamic QR renderer. See [native verification](../../../handoff-2026-09-09-integrated-qr.md).
