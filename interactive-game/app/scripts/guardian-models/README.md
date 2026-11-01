# Guardian character tools

The full roster now includes [thirteen further authored spirits](../../handoff-2026-10-31-all-guardian-spirits.md), built with the same existing Three.js dependency:

```sh
node scripts/guardian-models/build-visitor-spirits.mjs
node scripts/guardian-models/build-house-spirits.mjs
node scripts/guardian-models/build-twig-spirits.mjs
```

Each outputs public-safe GLBs, SOURCE.md and deterministic checksum/metrics provenance under the matching `src/client/assets/<art>/` directory. No build reads private photographs or downloads an external model. All new assets have Idle/Awaken/Play/Settle/Greet clips, +Y up and +Z front. [Visitor identities/review](../../visitor-spirits-2026-10-31.md), [house presences](../../house-spirits-2026-10-31.md), [twig guardians](../../twig-spirits-2026-10-31.md). The local `/scripts/guardian-spirit-preview/` gallery reviews exported poses; `/scripts/fox-spirit-preview/` runs the actual full-screen component at phone sizes and can record its canvas-only performance locally. These tools are excluded from deployment.

The shipped fox character is a **clean authored woodland red panda**. Build it with `node scripts/guardian-models/build-red-panda.mjs`, using the project's existing Three.js dependency. No model downloads, Blender, external service or original capture is required. The GLB and its checksum/metrics are written to `src/client/assets/red-panda/`. It uses the shared planar leg solver in `src/shared/guardian-ik.ts` (the authoring command uses the workspace’s Node 26 runtime). Its five-bone tail is one continuous skinned mesh; the remaining closed shapes move as rigid toy parts.

`prepare_red_panda.py` preserves the earlier **rejected scan extraction experiment**. It uses NumPy/Pillow, an exact source checksum and host-specific measured table/crop coordinates. It removes table geometry, repacks only the retained object's texture islands and builds a provisional rigid rig. Its output is **not** the shipped character: surface noise, tail cuts and rigid part artifacts failed the host's visual review. Keep source scans, intermediate atlases and experimental output under ignored `private/`; never copy these into the public asset folder. The original Downloads file was not modified.

The second character is [The Gilded Root](../../gilded-root-character.md), a gold branch floor lamp. Rebuild with `node scripts/guardian-models/build-gilded-root.mjs`; output and provenance are in `src/client/assets/gilded-root/`. A continuous four-bone trunk, rigid twig pivots, tipping linen shade, blink knots and a ledger leaf supply six distinct clips. Root feet stay planted; the caught leaf stem is aligned in 3D to its twig tip. No reference photograph or scan is required at build time. [Recognition diagnostic results](../../gilded-root-recognition-check.md) distinguish reference coverage from the authored reveal.
