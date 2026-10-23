# Guardian spirit prototype

Updated October 23, 2026. **Implemented for the Access-protected host Lens only.** The host wants a hide-and-seek discovery game followed by a cute character performance. Camera angle, physical scale and continuous AR tracking must not control the final performance.

The enrolled “fox” prop is [LEGO Cute Animals: Red Panda 31394](https://www.lego.com/en-us/product/cute-animals-red-panda-31394), confirmed by the host. Its final digital character must preserve the brick-built silhouette, orange/brown/white colors, face and striped upright tail. **The bundled rigged fox is an explicitly labeled choreography stand-in, not a reconstruction of this prop.** A matching production model remains outstanding; do not describe this stage as visual-fidelity acceptance.

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

| Time | Beat | Action and purpose |
|---|---|---|
| 0–2.4s | Found | Warm rings and rising motes gather around the detected starting position. The character materializes, grows and arcs into its stage position. The photographed prop dissolves into the woodland background. |
| 2.4–3.1s | Distraction | It notices its own tail and turns its head: a tiny failure of the guardian’s solemn composure. |
| 3.1–5.8s | Chase | An authored running cycle accompanies one quick circle. The character turns with its route; its side silhouette shrinks enough to fit on a phone. This turn is scripted, never derived from the scan angle. |
| 5.8–6.6s | Composure | It turns back to the viewer, folds its hind legs into a provisional seated/crouched pose and settles. This is a procedural adaptation of the sample rig, not a bespoke LEGO sitting clip. |
| 6.6s onward | Witness | Quiet head/tail movement and a direct front-facing pose. The Fox of Small Print’s authored greeting remains: “The terms are before you. I do recommend reading them.” A tap triggers a small hop/nod and “Well, hello there.” |

Replay resets the complete sequence. Pause freezes the mixer, entrance and particles. Backgrounding stops rendering; resuming does not fast-forward through the story. The settled pose is standardized for portrait; landscape reserves a separate character column beside the narrative controls. Recognition alone awards no Favor.

For each later guardian, write a distinct discovery, comic/character beat, action, settle and greeting before authoring its animation. Do not automatically apply this chase to all fifteen guardians. New character-specific clips, sound and a perfect red-panda sit are future asset work, not implemented claims.

## Building the matching model

One photo can guide a modeled approximation or an image-to-3D generation service, but hidden geometry and reliable joints are not recoverable from that view alone. A matching digital brick model would be ideal: preserve the rigid bricks and articulate the actual head, legs and segmented tail. No licensed downloadable digital model of **31394** was obtained in this session; the unrelated 31154 fox must not be substituted.

The host has Polycam. Use **Object Mode → Photogrammetry**, then export a mesh **GLB with embedded textures**. Keep the object still, walk around it at several heights and include the face, ears, tail and gaps between the legs in soft, even light. Glossy plastic can leave reconstruction artifacts; assess the result before committing to rigging. A Gaussian splat is not the articulated mesh this renderer needs. LiDAR is not required. [Polycam capture guide](https://learn.poly.cam/hc/en-us/articles/27425185907348-How-to-Use-Object-Mode).

The intended asset workflow is capture → remove background/support geometry → clean/simplify the mesh → preserve/bake the color texture → split or weight head, legs and tail → rig at those joints → author the storyboard clips → export GLB. Polycam exports geometry and textures; it does **not** supply this animal rig or character performance. [Polycam’s GLB/Blender workflow](https://learn.poly.cam/hc/en-us/articles/42497420365716-How-to-Optimize-Your-Captures-in-Blender).

The host page’s **Try a GLB capture** is a local shape/texture preview, not an account upload or automatic rigging service. The chosen file stays in this browser visit; it can also replace the host fox’s reveal after scanning. **Turn capture to face you** sets a front direction for this visit. Existing clips play if included; an unrigged mesh only emerges and receives whole-object motion. Reloading clears the selection. **Clear local capture** returns to the sample. No private capture is committed or sent to a new external service.

Preview limits: self-contained uncompressed glTF 2.0 GLB, at most 12MiB, 100,000 triangles, 128 primitives, 1,024 nodes, eight PNG/JPEG textures, 2,048px per texture and eight megapixels total. These are protective acceptance limits; prefer 20–40k triangles and one 1–2k texture. A larger original can be provided privately for offline optimization. Draco, Meshopt and Basis/KTX2 compression are currently rejected because their extra decoders are not bundled.

## Runtime and provenance

Three.js **0.186.1**, lazy-loaded only for the host spirit path. Its production runtime is approximately 160kB gzip; the self-contained GLB is **162,852 bytes**. The renderer uses bounded 1.5 pixel ratio, an orthographic stage, one active authored clip, simple lights, two ring meshes, one small glow plane and 128 points. It targets at most 30fps with no postprocessing, shadow maps or WebXR session. The asset can preload after recognition initialization; each opening compiles its own small graphics scene.

The [asset source and license](src/client/assets/fox-spirit/SOURCE.md) credit PixelMannen (model, CC0), tomkranis (rig/animation, CC BY 4.0), and Asobo Studio/scurest (glTF conversion, CC BY 4.0). [Pinned revision, bytes and SHA-256](src/client/assets/fox-spirit/provenance.json). Credits also appear inside the reveal. Source clips are Survey, Walk and Run; this prototype uses Survey/Run with custom timing and procedural rig adjustments. It does not claim a blink clip.

Close/reset disposes the per-opening mixer, skeleton buffers, cloned materials, portal/particle geometry, observers and WebGL context. One tiny shared sample template remains in memory for replays. Imported capture geometry/textures are released on stage close. The canvas remounts after an error or close; React stats updates do not recreate the graphics context.

`scripts/fox-spirit-preview/index.html` is a local developer harness for the actual component: run `npm run dev`, open `/scripts/fox-spirit-preview/`, and compare corner entrances, portrait, small-phone and landscape layouts. The harness is not included in the deployed application. [Release evidence and remaining acceptance](handoff-2026-10-23-fox-spirit.md).
