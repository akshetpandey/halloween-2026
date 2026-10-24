# Guardian spirit prototype

Updated October 24, 2026. **Implemented for the Access-protected host Lens only.** The host wants a hide-and-seek discovery game followed by a cute character performance. Camera angle, physical scale and continuous AR tracking must not control the final performance.

The enrolled “fox” prop is [LEGO Cute Animals: Red Panda 31394](https://www.lego.com/en-us/product/cute-animals-red-panda-31394), confirmed by the host. The current built-in character is a clean, authored woodland red panda with the prop’s orange/brown/ivory palette, broad head, white markings and striped upright tail. **The host rejected the extracted scan as the visible character on October 24:** the earlier modeled fox was cuter, while the scan had rough surfaces, loose pieces and a broken tail. Use captures for proportion/color reference; prioritize a charming deliberately modeled character. This is a stylized interpretation, not an exact digital brick reconstruction. Phone/art acceptance is still pending.

## Try it on a phone

1. Open [Guardian reference photos](https://hollow-court.com/host?tab=guardians), sign in and reload to fetch the current build.
2. **Preview fox spirit** plays the performance without a camera or ML initialization.
3. To test the whole pipeline, select **The Fox of Small Print**, then **Test this reference** under an existing photo. This checks the reveal, not held-out recognition accuracy.
4. Alternatively choose **Test the Looking Lens**, wait for **Lens ready · fox asset ready**, then **Open the live lens** or **Choose a photo**. Live capture still requests 12fps ideal / 15fps maximum and samples serially at up to 4Hz. A stable recognition captures a still and stops all camera tracks.
5. The captured photo dims behind a 3D spirit. **Replay**, **Pause**, tap-to-greet, close, and **Find another guardian** are available. Final orientation and size are independent of the scan. Motion deliberately ignores Reduce Motion; manual pause remains available.
6. Repeat with a different photo angle, a smaller/farther view and a corner-positioned object. A saved geometric match supplies only the entrance keyframe; the character must settle into the same on-screen pose. At most 850ms is spent fetching/matching saved geometry. No reliable/fast match means a centered entrance, not a failed reveal.

**Host fox recognition skips segmentation entirely.** Other guardians, the existing reference movement editor and guest rehearsal continue using MagicTouch/2D motion. Recognition, enrollment, puzzle routes, scoring, public gates and Access protection are unchanged. There is no 3D guest release in this prototype.

## Storyboard: a dignified creature caught being silly

The host explicitly asked for stronger, carefully storyboarded reveals, suggesting a circle/tail chase before sitting and facing the player. This is the first timing pass, requiring phone/art-direction review.

| Time        | Beat        | Action and purpose                                                                                                                                                                                                                                                     |
| ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–2.4s      | Found       | Warm rings and rising motes gather around the detected starting position. The character materializes, grows and arcs into its stage position. The photographed prop dissolves into the woodland background.                                                            |
| 2.4–3.1s    | Distraction | It notices its own tail and turns its head: a tiny failure of the guardian’s solemn composure.                                                                                                                                                                         |
| 3.1–5.8s    | Chase       | An authored running cycle accompanies one quick circle. The character turns with its route; its side silhouette shrinks enough to fit on a phone. This turn is scripted, never derived from the scan angle.                                                            |
| 5.8–6.6s    | Composure   | It turns back to the viewer and plays the authored Settle clip: body lowers, hind legs fold, and ankle joints keep the paws flat.                                                                                                                                      |
| 6.6s onward | Witness     | A small paw hello, blinks, ear flicks and quiet head/tail movement in a direct front-facing pose. The Fox of Small Print’s authored greeting remains: “The terms are before you. I do recommend reading them.” A tap triggers a small hop/nod and “Well, hello there.” |

Replay resets the complete sequence. Pause freezes the mixer, entrance and particles. Backgrounding stops rendering; resuming does not fast-forward through the story. The settled pose is standardized for portrait; landscape reserves a separate character column beside the narrative controls. Recognition alone awards no Favor.

For each later guardian, write a distinct discovery, comic/character beat, action, settle and greeting before authoring its animation. Do not automatically apply this chase to all fifteen guardians. Other guardian-specific models/clips and sound remain future work.

## Building the matching model

The shipped character is authored in [build-red-panda.mjs](scripts/guardian-models/build-red-panda.mjs), using the existing Three.js dependency. Its editable source builds closed rounded toy forms and vertex-colored markings, deliberately larger glossy eyes and muzzle, separate head/ear/eye/leg/ankle pivots, and **one continuous skinned tail with five bones**. Painted stripes share matching skin weights at their seams. Survey, Run, Settle and Greet are explicit clips; idle/run loops close without a pose jump. No scan triangles or original photo pixels are shipped. [Source and provenance](src/client/assets/red-panda/SOURCE.md).

The original `/Users/akshet/Downloads/Red Panda .glb` is unchanged. Its table/chairs were successfully extracted in a private experiment, but the resulting scan rig failed the host’s visual review. Raw capture, clipped textures, rejected GLB and inspection renders stay under ignored `private/panda-scan-2026-10-24/`. The reproducible extraction script is retained as an explicitly rejected research path in [guardian-models](scripts/guardian-models/README.md). Further scans can guide proportions and palette; they are not required to build or animate this character.

The host page’s **Try a GLB capture** remains a local preview for this visit. Existing clips play if present; no rig is automatically generated. **Turn capture to face you** sets the local preview front. **Clear local capture** restores the authored panda. **Download red panda model** exports the same bundled GLB for offline inspection. No account upload or new external modeling service is involved.

Preview limits: self-contained uncompressed glTF 2.0 GLB, at most 12MiB, 100,000 triangles, 128 primitives, 1,024 nodes, eight PNG/JPEG textures, 2,048px per texture and eight megapixels total. These are protective acceptance limits; prefer 20–40k triangles and one 1–2k texture. A larger original can be provided privately for offline optimization. Draco, Meshopt and Basis/KTX2 compression are currently rejected because their extra decoders are not bundled.

## Runtime and provenance

Three.js **0.186.1**, lazy-loaded for the host spirit path. Its runtime is about **160kB gzip**; the current character is **965,376 bytes, 26,252 triangles, 20 primitives and zero image textures**. Vertex colors remove texture decode/mipmap allocations. The renderer uses bounded 1.5 pixel ratio, an orthographic stage, one main clip with a brief transition overlap, simple lights, two ring meshes, one small glow plane and 128 points. It targets at most 30fps with no postprocessing, shadow maps or WebXR session. This is not a measured iPhone performance claim.

[Provenance](src/client/assets/red-panda/provenance.json) records the generated output checksum and geometry. [The previous licensed fox](src/client/assets/fox-spirit/SOURCE.md) is preserved for historical provenance and is no longer bundled into the app. The original scan is never uploaded with the site. Pause/replay/greet and local capture import remain available; resizing while paused redraws the frozen scene without advancing its clock.

Close/reset disposes the per-opening mixer, skeleton buffers, cloned materials, portal/particle geometry, observers and WebGL context. One shared character template remains in memory for replays. Imported capture geometry/textures are released on stage close. The canvas remounts after an error or close; React stats updates do not recreate the graphics context.

`scripts/fox-spirit-preview/index.html` is a local developer harness for the actual component: run `npm run dev`, open `/scripts/fox-spirit-preview/`, and compare corner entrances, portrait, small-phone and landscape layouts. The harness is not included in the deployed application. [Release evidence and remaining acceptance](handoff-2026-10-23-fox-spirit.md).
