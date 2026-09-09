# Woodland QR artwork

`woodland-portal.webp` is an original generated illustration for the September 9, 2026 artistic QR revision. Generated with the built-in `image_gen` tool, then resized/encoded with Sharp to 1000×1000 WebP. It is consumed by `WoodlandQR.tsx`; QR data, structural markers and code rendering are deterministic application code. The user-supplied image was visual direction, not copied artwork. No guest data is included.

Exact generation prompt:

> Use case: illustration-story. Create a square full-bleed woodland illustration for Hollow Court, an elegant eerie Samhain gathering. It will be the imagery woven THROUGH a functional artistic QR code, not merely a border. Original painterly engraving / fine illustrated fairy-tale book plate, highly detailed but strong readable shapes. Deep moss-green oak trees, ivory moonlit mist, twisted roots, fern leaves and small warm amber fireflies. Central narrow pale winding path leads to an ancient hollow oak doorway lit softly gold; leafy canopy overhead, pale full moon near upper middle. No people, no text, no lettering, no logos, no actual QR code. Mostly forest green, muted olive and parchment cream, subdued ochre. Balanced square composition, three little dark square hollow wooden shrine windows integrated among foliage at roughly 23%/23%, 77%/23%,23%/77% of canvas, framed in pale wood, echoing square QR corner landmarks without being a literal barcode. The central doorway must remain recognizable as the heart of the image. Rich fine forest texture across entire canvas, quiet mystical welcome rather than horror. This is a production website art asset, flat illustration without poster margins or mockup framing.

## Integrated Partiful QR

`partiful-qr-art.webp` is the original built-in generated artwork selected by the host after comparing it with the Hugging Face replacement. It is encoded as lossless WebP at its original 1254×1254 size, without resizing, an overlay or raster repairs. Its exact payload is `HTTPS://HOLLOW-COURT.COM/R`. [Exact built-in edit prompt and provenance](partiful-qr-art.settings.json).

The source PNG is `exec-24e4ebaa-bcdc-40a1-876c-772106e233c9.png` from the built-in image tool. The app selects this asset only for its exact payload; personalized Summons continue to use `woodland-portal.webp` in their dynamic QR renderer. [Selection and scan evidence](../../../handoff-2026-09-09-original-qr.md).
