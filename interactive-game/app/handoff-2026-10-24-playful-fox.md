# Playful fox, recognition speed and character workflow

- Session: desktop `01a08367-2c08-7451-8ede-52803d3c1c40`, October 24, 2026, America/New_York.
- Checkout: shared `main`, base `c591fd7`; no task branch/worktree.
- Status: implemented and independently reviewed; final checks/deployment evidence below.
- Confirmed host direction: clean authored fox is “exactly what we need”; make tail pursuit less stiff, add a little pounce, proper sit and curious head tilt. Investigate faster detection and document a repeatable reference-photo authoring process with subagent reviews.

## Changes

- Seven authored clips now play emergence → tail notice/play bow → accelerating gallop/circle → compress/lift/land → grounded sit → held camera-facing head tilt → blink/paw hello. The chase keeps one scale; scale return is eased into the pounce. Removed perpetual whole-body float and the extra runtime sit drop/pitch.
- Two-link planar leg solving transforms ground-space ankle targets through torso motion. Rump lowers 34mm, torso pitches 0.52 radians, forepaws bear weight, ankles cancel body/leg pitch. The tail remains one watertight five-bone mesh and settles beside the face. Geometry stays at 26,252 triangles / 20 primitives / zero image textures; seven clips increase the GLB to 1,088,928 bytes. Exact checksum is in [provenance](src/client/assets/red-panda/provenance.json).
- Host fox geometry prefetches during Lens preparation. Optional entrance matching has a combined 200ms cap, reduced from 850ms, with centred fallback; stale attempts do not spawn matching work or update state. Identity weights, enrolled vectors/thresholds, three-frame ≥500ms confirmation, serial sampling and camera shutdown remain unchanged.
- Previous four-clip local panda imports retain a seated greeting when the new Curious clip is absent. Generic/unrigged GLB preview remains supported.
- [Reference-photo-to-character workflow](guardian-character-workflow.md) documents the actual fox process, six-to-eight authoring photos, identity/palette brief, species-specific storyboard, model/rig/export, appearance/motion/technical review gates, mobile checks and reusable prompts. This is deliberate authored modeling from references, not automatic photogrammetry/auto-rigging.
- [Recognition review](guardian-recognition-review-2026-10-24.md) records a fresh same-MobileNet benchmark: warmed CPU median 56.8ms / sample p95 69.7ms versus WebGPU 78.0ms / 247.1ms on desktop Chrome. GPU also initialized slower and needed a larger runtime. CPU remains default. LiteRT.js is the next unbenchmarked same-encoder runtime experiment; no new model earned promotion.

## Independent reviews and verification

- Motion reviewer proposed anticipation, varied chase timing, weight/contact, pounce and a held final reaction. Sampled rendered frames/contact sheet plus source review found the revised prototype readable, with no blocker. Optional concern: rapid size return can read partly as a zoom; chase presentation was enlarged slightly to reduce that change. This was not temporal playback or real-phone motion acceptance.
- Technical reviewer caught old four-clip Curious falling back to standing Survey and stale post-reset matching. Both fixed and regression-covered. They numerically checked hind-paw ground contact across the sit/idle clips and found no contact error. Camera loop/lifecycle is unchanged.
- Private reproducible recognition benchmark and reports: `private/recognition-review-2026-10-24/`; own benchmark server/tab closed. No dependency/model upload or external modeling service.
- Actual component recording/contact sheet: `private/fox-playful-2026-10-24/`. Final source/render checks, build/test counts and release below.

## Remaining acceptance and next actions

- Reload [host Guardian reference photos](https://hollow-court.com/host?tab=guardians), use **Preview fox spirit**, then **Test this reference** or live Lens. Check pounce, planted landing/sit, held tilt and repeated open/close on the real iPhone.
- Phone FPS, thermal/peak memory, held-out recognition of all fifteen props and false-wake rejection still require actual devices and a broader fixture set. Laptop inference timings are not phone measurements or full encounter time.
- Use the documented workflow for each next guardian. Keep raw photos/scans private; give each guardian its own authored action rather than copying this chase.
- No game/scoring/access/schema changes, purchase or push. All edits are task-owned; source checkpoint and deployment details will be recorded after final verification.
