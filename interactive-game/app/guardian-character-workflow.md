# From reference photos to a guardian character

Updated October 24, 2026. **The fox proves the authoring approach; the staged review workflow below is the reusable process proposed for the remaining guardians.** This is deliberate character modeling and animation from visual references, not an automatic photo-to-3D conversion. The host approved the clean modeled fox over the scan-derived version and asked for more playful movement, a pounce, a proper sit and a curious look toward the camera.

Use this alongside the [spirit prototype](guardian-spirit-prototype.md), [camera prototype](guardian-camera-prototype.md) and [physical roster](../physical/entity-plan.md). Narrative identity comes from the [approved character voices](../design/narrative-arc.md). Physical names and puzzle assignments still follow their current authoritative documents.

## What actually worked for the fox

The host supplied three recognition reference photos and a Polycam capture of LEGO Red Panda 31394, used in the game as **The Fox of Small Print**. We first removed the scanned table/background, repacked retained texture regions and added a provisional rigid rig. That experiment produced rough surfaces, loose pieces and a visibly broken moving tail. It failed the host's visual review and is not the shipped character. More scan cleanup was not the right investment for this experience.

We then authored a new character in [build-red-panda.mjs](scripts/guardian-models/build-red-panda.mjs), using the prop only as a proportion and color reference:

- Rounded boxes, spheres, smooth ear extrusions and small curves create a clean toy-like body, a broad expressive face and closed moving parts. Large eyes, white face markings and small highlights read at phone size.
- Vertex colors carry the orange, cinnamon, brown and ivory palette. A satin material and glossier eyes/nose provide shape without photographic texture noise or image decode allocations.
- Head, ears, eyes, leg, knee and ankle groups provide purposeful pivots. The tail is one continuous closed surface with five bones and smoothly blended weights; painted stripes do not split the mesh.
- Three.js animation tracks author the local performance. `GLTFExporter` produces a self-contained animated GLB and a checksum/metrics file. The generator, GLB, [source note](src/client/assets/red-panda/SOURCE.md), [provenance](src/client/assets/red-panda/provenance.json) and meaningful asset tests are versioned together.
- [Runtime staging](src/client/fox-spirit-runtime.ts) supplies the screen entrance, route, scale, facing and effects. [Story timing](src/client/spirit-motion.ts) and [clip selection](src/client/panda-model.ts) join the GLB's local joint motion to that performance. The GLB alone does not contain the complete app reveal.
- We inspected the real component in the [phone preview harness](scripts/fox-spirit-preview/index.html), recorded its animation and revised defects. Structural tests caught tail topology/weight problems that a single attractive still could miss. Host feedback remains the final art-direction check.

This work used the existing Three.js dependency and authored code, with no external asset-generation service. A scan is optional: good photographs are enough to guide this kind of stylized model. Unseen surfaces need a sensible interpretation or another reference photo; we cannot promise exact reconstruction from one image. [Implementation and release evidence](handoff-2026-10-24-red-panda-character.md).

## 1. Take a small, useful reference set

For each guardian, supply **six to eight clear photographs** of the complete prop. A phone camera is enough; LiDAR is not required.

1. Take front, rear, left, right and two three-quarter views, keeping the whole silhouette in frame. Add a slightly elevated view if the top or tail shape matters.
2. Take one close face/detail photo if its markings, eyes, horns, wings, knots or surface pattern are distinctive. Include a ruler or approximate height in a separate reference if proportions are unclear.
3. Use soft neutral light and a plain contrasting background. Avoid portrait-mode blur, clipped ears/tails, strong colored party lighting and wide-angle distortion. Keep the camera near the object's mid-height and step back rather than using an extreme wide lens.
4. Note the front of the prop and which pieces really move. Send a short turntable video or a scan only if the silhouette is difficult to understand from photographs.

Keep these **authoring references** separate from **recognition enrollment**. The modeler needs neutral views and readable details; the recognizer also needs realistic room backgrounds, distances, angles and party lighting. Reserve some photographs for held-out recognition tests rather than enrolling every image. A character looking accurate does not establish that its physical prop can be recognized reliably.

Raw photos/scans stay in ignored `private/<guardian>-<date>/` or the existing protected host reference store. Do not put people, room photographs, guest identities or raw scans into public assets or Git. Recognition references remain private; the approved authored character will be downloadable public artwork, so do not bake private background pixels into it. Use no external upload/modeling service unless that action is authorized.

## 2. Write the identity and performance brief before modeling

Create a short task-local brief with a contact sheet and these fields. Mark uncertain details instead of inventing them silently.

| Field                 | What to decide                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| Physical identity     | Guardian ID, actual prop/product if known, approximate dimensions, which view is front                       |
| Recognition anchors   | Three to five unmistakable silhouette/marking features that must survive stylization                         |
| Palette               | Five to eight named colors, sampled from neutral references and judged in the actual renderer                |
| Character proportions | Head/body balance, ear/horn shape, leg length, tail/wing curvature; what can be exaggerated for charm        |
| Personality           | One sentence from its narrative role; one endearing flaw or surprise                                         |
| Motion capabilities   | Rigid joints versus deforming surfaces; what must bend continuously; no detached islands                     |
| Performance           | Found → anticipation → species-specific action → settle → direct acknowledgment                              |
| Finish                | Standard screen size, front-facing resting pose, readable expression, optional response to a tap             |
| Must avoid            | Inaccurate colors, generic mascot replacement, scanning artifacts, uncanny movement, copied fox choreography |

For the fox, the identity anchors are its broad red-panda face, white cheeks/ears, orange-brown body and raised striped tail. Its solemn legal voice contrasts with getting distracted by its own tail. Preserve the prop's identity while allowing a larger face and softer forms.

## 3. Storyboard the complete reveal

Write a timed beat list and sketch the most important poses **before** adding many keyframes. Build the silhouette and emotional sequence first: what the guardian notices, what it tries, what surprises it and how it acknowledges the player. Give each species its own action. A bird can fuss with feathers or hop; a hare can hesitate and spring; a twig guardian can uncurl and bow. These are options, not approved storyboards for those guardians.

The current fox storyboard is: notice the tail → playful pursuit with changing pace and body lean → anticipate and pounce → land with a small recovery → deliberately sit → hold eye contact and tilt its head curiously. Test the anticipation, airborne and contact poses separately. Tail follow-through, ear lag and a blink should support the action, not move at the same phase as every other part. A sit must read as weight settling onto the haunches, with front paws supported and no visible hovering or foot penetration.

The scanner controls only the **first** position/size keyframe. Freeze the photograph and stop camera tracks on recognition. Move the character onto its standardized screen stage, face it toward the viewer and let it perform. Avoid continuous AR tracking, live segmentation or new ML inference merely to play an authored animation. A missing entrance geometry match falls back to a centered entrance. Pausing, replaying and greeting must remain available; the host explicitly asked these reveals to ignore Reduce Motion.

## 4. Author the model and rig in reversible stages

1. **Blockout:** use a small set of closed primitives. Render front, side, rear and three-quarter views in a neutral pose. Adjust proportions until the untextured silhouette identifies the prop. Do not spend time on decorative detail yet.
2. **Appearance:** add the smallest palette and markings that preserve identity at phone size. Prefer vertex colors for flat toy/woodland figures. Add image textures only where they provide a clear visual benefit and have clean, public-safe provenance. Keep material count low; merge geometry sharing a material on the same moving part.
3. **Rig:** place pivots at believable joints and overlap closed rigid parts where appropriate. Use a continuous skinned mesh with normalized weights for bending tails/necks/branches. Do not separate painted bands into independent tail sections. Keep the front axis and ground plane explicit; the current fox uses +Z as front and +Y as up.
4. **Pose tests:** inspect the most extreme bend, crouch, turn and contact positions before building the full performance. Check closed surfaces, deformation seams, detached pieces, self-intersections and feet on the ground.
5. **Animation:** separate local joint clips from stage/root choreography. Use anticipation, uneven timing, arcs, body weight and follow-through; do not substitute a constant-speed orbit and synchronized sine waves for acting. Blend transitions and match loop endpoints. Derive contact timing and stage motion together so the paws do not visibly skate. In side view, verify +Z-forward airborne paws return toward the nose and planted paws push toward the tail. Keep ground-space stance targets independent of torso bounce, solve fore/hind bend directions anatomically and retain each leg’s branch across clip transitions. Inspect at quarter speed as well as full speed; test contact positions in the exported GLB.
6. **Export:** generate a self-contained GLB, `SOURCE.md` and `provenance.json` alongside the editable builder. Record dimensions, bytes, triangles, primitives, image pixels, bones, clip names/durations and SHA-256. Keep the generator deterministic enough that an unchanged rebuild produces the same artifact/checksum.

The existing fox runtime recognizes a named `PandaHead` and its authored clip contract; it is not a universal auto-rigger. A new guardian needs its own clip mapping/storyboard and bounded runtime integration. Reuse infrastructure and effects, not species-specific proportions or the fox's entire performance.

## 5. Use independent review gates

**Reusable process requested by the host; motion and technical reviews were exercised in the October 24 polish pass:** assign bounded review subtasks, let reviewers inspect the same references and actual renders, and have the lead author make the edits. In the shared checkout, reviewers should be read-only unless given explicit non-overlapping file ownership. Do not let several agents concurrently rewrite the builder, runtime or GLB. Subagent comments are review evidence, not automatic approval or proof of phone performance.

| Gate                      | Reviewer sees                                                              | Pass condition / next action                                                                                                                 |
| ------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity and silhouette   | Reference contact sheet, brief, neutral front/side/rear renders            | Recognizable defining shapes and proportions; fix blockout before surface detail                                                             |
| Palette and art direction | References beside final-lit stills at actual phone scale                   | Correct color relationships, readable face, intentional clean forms, no scan-like roughness; preserve charm                                  |
| Rig and animation         | Slow-motion contact sheet plus full-speed recording of the whole reveal    | Connected tail/limbs, convincing weight/contact, anticipation and follow-through, readable action and held finish; fix stiff or broken beats |
| Mobile composition        | Actual portrait/small-phone/landscape harness recording                    | Character and effects fit, face remains large, controls/copy are usable, unusual entrance bounds converge to the same finish                 |
| Technical and privacy     | GLB, builder, provenance, tests, performance diagnostics and changed files | Bounded resources, valid skinning/clips, no private capture data, replay/close lifecycle intact, no regression to recognition/game rules     |
| Host acceptance           | Best full-speed phone preview and a concise list of changes                | Host judges identity/charm on the actual phone; record remaining issues honestly                                                             |

Run identity/art reviews before polishing the rig; run motion review only on a moving render. Give reviewers explicit failure questions. Resolve high-impact findings, render again and request a focused re-review of the changed areas. Do not call a self-reviewed still a completed animation review.

### Reusable author task

> Build an original stylized guardian from the private reference set at [path]. Read the current game/app instructions and this workflow. First write its identity/palette brief and species-specific storyboard. Preserve [identity anchors]; exaggerate only for charm and phone readability. Use clean authored geometry, a bounded rig and a self-contained GLB; no raw scan/photo pixels or external upload. Show blockout views before detail, then record the complete reveal in the real phone harness. Keep reference recognition, game rules and other guardians intact. Provide generator, provenance, meaningful checks, known limits and task-local handoff. Route appearance, motion and technical reviews through separate read-only subagents and address their findings.

### Reusable reviewer tasks

- **Identity/art:** “Compare [reference contact sheet] with [neutral/final-lit renders]. List the three most consequential silhouette, palette or charm defects. Cite the view/feature and a concrete correction. Distinguish required physical identity from optional style preferences. Do not edit files.”
- **Motion:** “Watch [full-speed recording] and [pose contact sheet] against [storyboard]. Find stiffness, unclear acting, contact/weight errors, tail seams, foot sliding and transition pops. Name the timestamp and a practical fix. Judge the final camera-facing expression. Do not edit files.”
- **Technical:** “Review [builder/GLB/runtime/tests]. Check import limits, topology/skinning, clip compatibility, disposal/repeated openings, privacy and regressions. Separate static evidence from actual phone measurements; report concrete failures and missing evidence. Do not edit files.”

## 6. Keep a small, measurable mobile asset

These are guardrails, not a reason to add detail until every budget is used. Start at the fox's scale or smaller and measure on the host's phone.

| Item                                 | Existing reference / constraint                                                                                                                                                                                                                                               |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accepted fox baseline, October 24    | 965,376-byte GLB; 26,252 triangles; 20 primitives; five tail bones; zero image textures. Later animation revisions may change bytes/clip counts: use current provenance as the exact source.                                                                                  |
| Preferred first asset target         | Roughly 1MB, 20–40k triangles or fewer, around 20 draw primitives or fewer, zero textures when vertex colors suffice. These are authoring targets, not validated device limits.                                                                                               |
| Existing GLB import rejection limits | 12MiB; 100,000 triangles; 128 primitives; 1,024 nodes; eight PNG/JPEG images; 2,048px per image; eight megapixels total. Self-contained, uncompressed GLB; no external URIs, Draco, Meshopt or Basis/KTX2 decoders. Passing the importer alone is not performance acceptance. |
| Existing host renderer               | Lazy Three.js runtime about 160kB gzip; pixel ratio capped at 1.5; target at most 30fps; simple lights/effects, no shadow maps, postprocessing or WebXR.                                                                                                                      |
| Camera / recognition separation      | Current camera request is 12fps ideal / 15fps max, serial recognition up to 4Hz. Recognition and capture stop before the authored performance. Review current camera docs before changing those values.                                                                       |
| Performance acceptance               | Record actual first-open/warm ready time, frame rate, repeated open/close and background/resume behavior on iPhone and Android. Laptop observations are not mobile benchmarks.                                                                                                |

Keep a shared in-memory model template only where existing lifecycle code expects it; dispose per-opening animation/skeleton/material/effect resources. Verify pause-resize redraws the same instant, replay resets the complete story and returning to the Lens does not keep a hidden camera stream alive.

## 7. Rebuild, verify, package and hand off

For the current fox, from this app folder:

```sh
node scripts/guardian-models/build-red-panda.mjs
npx vitest run tests/panda-model.test.ts tests/spirit-motion.test.ts tests/guardian-ik.test.ts tests/spirit-entrance.test.ts
npm run build
npm run dev
```

Open `/scripts/fox-spirit-preview/` on the local Vite server. Inspect center/corner entrances, portrait, 375×667 small-phone and landscape views. Record the **real component**, not an alternate model viewer alone, through emergence, action, landing, sit and greeting. Test pause/resume, pause then resize, replay, tap greeting, close/reopen and error recovery. The harness is local developer tooling and is not included in the deployed app.

The current asset tests load the actual GLB with `GLTFLoader`/`SkeletonUtils`, check its import limits and provenance, continuous tail topology and outward-facing surface, normalized bone weights, finite deformed positions, painted-seam continuity, clips, real blinks and loop closure. Retain those invariants when polishing motion; add focused checks for new risks rather than snapshotting every keyframe. Run the complete regression suite and required deployment checks before a release. Follow the existing Cloudflare workflow; asset authoring does not require a schema migration or changes to Access/game rules.

Package each approved guardian with:

- Private input location and sanitized identity/storyboard brief; no private photos in Git.
- Editable generator/source, public GLB, source/licensing note and checksum/metrics provenance.
- Neutral identity contact sheet, full reveal recording and short review findings/fixes. Keep large working recordings private; commit only intentionally public sanitized review artifacts if useful.
- Meaningful structural/motion checks, actual mobile observations and explicit untested cases.
- A task-local handoff using the [repository template](../../coordination/handoff-template.md): status, decisions, owned files, branch/base and commit references, checks, deployment evidence, remaining acceptance and next guardian.

Host approval of the fox establishes the visual direction. It does not approve every future guardian or eliminate the need for distinct storyboards and phone review. The process is successful when the prop is recognizable, the character has a clear little personality and the full reveal feels charming in motion while remaining small and dependable on a phone.
