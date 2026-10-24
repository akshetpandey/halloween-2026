# Woodland red panda

Original procedural character authored for Hollow Court, October 24, 2026.

The host’s LEGO Cute Animals Red Panda **31394** supplies visual reference for the warm orange/brown palette, white face/ears, broad head, toy-like body and upright red/ivory striped tail. This is a stylized interpretation, not an exact digital brick reconstruction or official LEGO asset.

`RedPanda.glb` contains only newly authored geometry, vertex colors, a five-bone continuous skinned tail and four authored animation clips. There are **no scan triangles, photo textures, background/table imagery, external resources or image textures**. The private Polycam capture remains outside Git and is not shipped. No asset generation service received the capture.

Rebuild with the project's installed Three.js:

```sh
node scripts/guardian-models/build-red-panda.mjs
```

The [generator](../../../../scripts/guardian-models/build-red-panda.mjs) is the editable source. [Provenance](provenance.json) records the output checksum, geometry, dimensions and clips. Survey adds head tilts, blinks and ear/tail movement; Run articulates all four legs; Settle folds the hind legs; Greet holds the seated pose with a small paw hello. Runtime staging supplies the emergence, chase route and viewer-facing finish.

The earlier licensed fox remains in [fox-spirit](../fox-spirit/SOURCE.md) for historical provenance; it is no longer the built-in character. The rejected scan-rig experiment is documented in the task handoff and remains private.
