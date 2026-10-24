# Playful fox, recognition speed and character workflow

- Session: desktop `01a08367-2c08-7451-8ede-52803d3c1c40`, October 24, 2026, America/New_York.
- Checkout: shared `main`, base `c591fd7`; no task branch/worktree.
- Status: implemented, independently reviewed, deployed and verified. Final real-phone art/performance acceptance remains open.
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
- No game/scoring/access/schema changes, purchase or push. All edits are task-owned; source checkpoint and deployment details are recorded below.

## Final checks and release

- Source checkpoint **`facef42`** on shared `main`; final release evidence committed separately. No unrelated dirty files.
- **143/143 tests across 21 files passed**, including real-GLB topology/skin/loop checks, ground-contact checks, planar IK singularities, old four-clip compatibility, optional-anchor fetch/match deadlines, and existing camera/identity/game tests. Native QR regression ran with normal macOS Vision access. `npm run build` (including TypeScript), Wrangler dry run, Markdown relative-link check and `git diff --check` passed. The usual lazy Three.js chunk advisory remains (~160kB gzip).
- Final recorded actual component: `private/fox-playful-2026-10-24/release/fox-playful.gif`; contact sheet and screenshot frames beside it. Inspected portrait390×844, small375×667, landscape844×390, replay, pause/resume, paused resize and tap-to-greet. These are desktop browser layouts, not physical-phone measurements. The developer harness now fits the entire phone frame to available window height without changing its internal viewport.
- Published existing `hollow-court-preview` Worker on the existing account and bindings, version **`2fd0772e-8e05-4633-a4a0-c1032d2ebaa4`**. Both `hollow-court.com` and the Workers preview hostname serve it. No migration/resource/access-policy change.
- Live `/assets/RedPanda-ONREQxr6.glb` is **1,088,928 bytes**, SHA-256 **`3662611873fa430b08c540f351789a8de7bc245f1f2cc500f447768220244b37`**, matching the committed model. Runtime `/assets/fox-spirit-runtime-BQXW0lC8.js`, reveal `/assets/FoxSpiritReveal-BhKNjzrm.js` and entry `/assets/index-BgjkW_RG.js` verified.
- Hashed assets return immutable one-year caching/HSTS; HTML is `no-store`; HTTP upgrades with308. Public state remains sealed with preview disabled, debug guardian endpoint404, and unauthenticated host/admin requests redirect to existing Cloudflare Access.
- Main affected files: builder/asset/provenance/source note, `spirit-motion.ts`, `panda-model.ts`, `fox-spirit-runtime.ts`, `guardian-ik.ts`, `GuardianLens.tsx`, `spirit-entrance.ts`, focused asset/motion/IK/entrance tests, preview harness, workflow/research/prototype docs and app README. Recognition model/runtime files and server game code are unchanged.
- Temporary root Vite process/browser inspection tab are closed after verification. Private references, benchmark outputs and working recordings remain outside Git.
