/** Original gold branch-lamp spirit. No photo pixels, scan geometry or external assets. */
import * as T from "three";
import {
  mergeGeometries,
  mergeVertices,
} from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
};
const out = fileURLToPath(
  new URL("../../src/client/assets/gilded-root/", import.meta.url),
);
const scene = new T.Scene();
scene.name = "HollowCourtGildedRoot";
const gold = new T.MeshStandardMaterial({
  name: "Antique honey gold",
  vertexColors: true,
  metalness: 0.65,
  roughness: 0.35,
});
const fabric = new T.MeshStandardMaterial({
  name: "Parchment linen",
  vertexColors: true,
  roughness: 0.94,
  metalness: 0,
});
const gloss = new T.MeshStandardMaterial({
  name: "Warm eye knots",
  vertexColors: true,
  roughness: 0.18,
});
const glow = new T.MeshStandardMaterial({
  name: "Living ledger leaf",
  vertexColors: true,
  roughness: 0.46,
  emissive: 0xffc55c,
  emissiveIntensity: 0.7,
});
const bins = new Map();
function group(name, parent, p = [0, 0, 0]) {
  const g = new T.Group();
  g.name = name;
  g.position.fromArray(p);
  parent.add(g);
  return g;
}
function add(
  parent,
  geo,
  p = [0, 0, 0],
  scale = [1, 1, 1],
  color = "#c99a43",
  mat = gold,
  rot = [0, 0, 0],
) {
  geo.deleteAttribute("uv");
  geo.applyMatrix4(
    new T.Matrix4().compose(
      new T.Vector3(...p),
      new T.Quaternion().setFromEuler(new T.Euler(...rot)),
      new T.Vector3(...scale),
    ),
  );
  if (!geo.attributes.color) {
    const c = new T.Color(color),
      arr = new Float32Array(geo.attributes.position.count * 3);
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] = c.r;
      arr[i + 1] = c.g;
      arr[i + 2] = c.b;
    }
    geo.setAttribute("color", new T.BufferAttribute(arr, 3));
  }
  if (!bins.has(parent)) bins.set(parent, new Map());
  const b = bins.get(parent);
  if (!b.has(mat)) b.set(mat, []);
  b.get(mat).push(geo.index ? geo.toNonIndexed() : geo);
}
const ball = (g, p, s, c, mat = gold) =>
  add(g, new T.SphereGeometry(1, 16, 10), p, s, c, mat);
function tube(g, pts, r, c = "#c99a43", mat = gold) {
  add(
    g,
    new T.TubeGeometry(
      new T.CatmullRomCurve3(pts.map((p) => new T.Vector3(...p))),
      18,
      r,
      8,
      false,
    ),
    undefined,
    undefined,
    c,
    mat,
  );
  for (const p of [pts[0], pts.at(-1)]) ball(g, p, [r, r, r], c, mat);
}
// Five cast roots remain on the ground; only their tips make a tiny pleased tap.
const roots = [];
for (let i = 0; i < 5; i++) {
  const a = (i * Math.PI * 2) / 5 + 0.22;
  const r = group("RootToe" + i, scene, [0, 0.035, 0]);
  roots.push(r);
  const len = [0.23, 0.2, 0.25, 0.21, 0.22][i];
  tube(
    r,
    [
      [0, 0.045, 0],
      [Math.cos(a) * 0.06, 0.005, Math.sin(a) * 0.06],
      [Math.cos(a) * len * 0.7, -0.018, Math.sin(a) * len * 0.7],
      [Math.cos(a) * len, -0.026, Math.sin(a) * len],
    ],
    0.016,
    "#bb8e37",
  );
}
ball(scene, [0, 0.073, 0], [0.05, 0.07, 0.048], "#d2a54c");
// Continuous trunk skin; asymmetric knots/arms attach to spine bones, not floating islands.
const spine = [];
for (let i = 0; i < 4; i++) {
  const b = new T.Bone();
  b.name = "RootSpine" + i;
  b.position.y = i === 0 ? 0.08 : [0, 0.4, 0.42, 0.34][i];
  if (i) spine[i - 1].add(b);
  spine.push(b);
}
const trunkPts = [
  [0, 0.08, 0],
  [-0.012, 0.4, 0.005],
  [0.006, 0.78, 0],
  [-0.006, 1.03, 0],
  [0, 1.24, 0],
  [0.005, 1.37, 0],
];
const path = new T.CatmullRomCurve3(trunkPts.map((p) => new T.Vector3(...p)));
const tg = new T.TubeGeometry(path, 56, 0.024, 12, false);
const pos = tg.attributes.position,
  colors = [],
  joints = [],
  weights = [];
for (let i = 0; i < pos.count; i++) {
  const y = pos.getY(i),
    knot = 1 + 2.2 * Math.exp(-(((y - 1.235) / 0.09) ** 2)),
    x = pos.getX(i);
  pos.setX(i, x * knot);
  pos.setZ(i, pos.getZ(i) * (0.5 + 0.6 * knot));
  const ridge = 0.92 + 0.08 * Math.sin(i * 1.89) + 0.045 * Math.cos(y * 43),
    c = new T.Color("#c89d46").multiplyScalar(ridge);
  colors.push(c.r, c.g, c.b);
  const heights = [0.08, 0.48, 0.9, 1.24];
  let index = 0;
  while (index < 2 && y > heights[index + 1]) index++;
  const w = T.MathUtils.clamp(
    (y - heights[index]) / (heights[index + 1] - heights[index]),
    0,
    1,
  );
  joints.push(index, index + 1, 0, 0);
  weights.push(1 - w, w, 0, 0);
}
tg.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
tg.setAttribute("skinIndex", new T.Uint16BufferAttribute(joints, 4));
tg.setAttribute("skinWeight", new T.Float32BufferAttribute(weights, 4));
tg.deleteAttribute("uv");
const trunk = new T.SkinnedMesh(tg, gold);
trunk.name = "GildedTrunk";
trunk.add(spine[0]);
trunk.bind(new T.Skeleton(spine));
scene.add(trunk);
// Bark ridges and knots are deliberate clean forms, not photographic surface noise.
const left = group("LedgerBranch", spine[2], [-0.004, 0.1, 0]);
tube(
  left,
  [
    [0, 0, 0],
    [-0.055, 0.012, 0.005],
    [-0.18, 0.065, 0.014],
  ],
  0.014,
  "#d5ad59",
);
const right = group("ReachingBranch", spine[2], [0.002, -0.08, 0]);
tube(
  right,
  [
    [0, 0, 0],
    [0.055, 0.01, 0.005],
    [0.11, 0.063, 0.022],
  ],
  0.013,
  "#cba04c",
);
const low = group("LowerTwig", spine[1], [0, 0.18, -0.008]);
tube(
  low,
  [
    [0, 0, 0],
    [-0.07, 0.012, 0],
    [-0.14, 0.065, 0.005],
  ],
  0.012,
  "#c79943",
);
const crown = group("RootCrown", spine[3]);
tube(
  crown,
  [
    [0, 0, 0],
    [-0.045, 0.085, 0],
    [-0.13, 0.19, 0.005],
  ],
  0.018,
  "#d1a34c",
);
tube(
  crown,
  [
    [-0.044, 0.08, 0],
    [-0.038, 0.17, 0],
    [-0.036, 0.205, 0],
  ],
  0.012,
  "#e2b965",
);
tube(
  crown,
  [
    [0, 0.018, 0],
    [0.1, 0.11, 0],
    [0.245, 0.205, 0.01],
  ],
  0.018,
  "#d4a651",
);
// Small carved face immediately beneath the shade. The lamp keeps its long slim silhouette.
const face = group("RootFace", spine[3], [0, -0.015, 0.045]);
// The face lives directly on the continuous, tapering upper trunk knot.
const eyes = [];
for (const s of [-1, 1]) {
  const eye = group(s < 0 ? "RootEyeL" : "RootEyeR", face, [
    s * 0.035,
    0.014,
    0.026,
  ]);
  eyes.push(eye);
  ball(eye, [0, 0, 0], [0.023, 0.031, 0.013], "#2b2517", gloss);
  ball(eye, [-0.006, 0.011, 0.012], [0.007, 0.008, 0.004], "#fff5d8", gloss);
  ball(eye, [0.006, -0.01, 0.012], [0.003, 0.003, 0.002], "#e5bb62", gloss);
  tube(
    face,
    [
      [s * 0.014, 0.052, 0.02],
      [s * 0.033, 0.061, 0.025],
      [s * 0.057, 0.048, 0.016],
    ],
    0.006,
    "#e5c67f",
  );
}
ball(face, [0, -0.014, 0.013], [0.009, 0.01, 0.009], "#b17c30");
tube(
  face,
  [
    [-0.019, -0.036, 0.01],
    [0, -0.044, 0.012],
    [0.019, -0.036, 0.01],
  ],
  0.0035,
  "#755323",
);
// Real tapered linen shade silhouette, capped geometry with subtle woven vertex colors.
const shade = group("RootShade", spine[3], [0, 0.145, 0]);
const sg = new T.CylinderGeometry(0.235, 0.37, 0.3, 64, 6),
  sc = [];
for (let i = 0; i < sg.attributes.position.count; i++) {
  const y = sg.attributes.position.getY(i),
    x = sg.attributes.position.getX(i),
    z = sg.attributes.position.getZ(i);
  const thread =
    1 + 0.035 * Math.sin(Math.atan2(z, x) * 96) + 0.018 * Math.sin(y * 460);
  const c = new T.Color("#efe0bc").multiplyScalar(thread);
  sc.push(c.r, c.g, c.b);
}
sg.setAttribute("color", new T.Float32BufferAttribute(sc, 3));
add(shade, sg, [0, 0.15, 0], undefined, undefined, fabric);
for (const [rad, y] of [
  [0.371, 0],
  [0.236, 0.3],
])
  add(
    shade,
    new T.TorusGeometry(rad, 0.0045, 6, 64),
    [0, y, 0],
    undefined,
    "#c6a167",
    gold,
    [Math.PI / 2, 0, 0],
  );
add(
  shade,
  new T.CylinderGeometry(0.345, 0.345, 0.003, 48),
  [0, -0.002, 0],
  undefined,
  "#ffdf96",
  glow,
);
// Magical ledger leaf. The high-contrast ivory edge keeps it visible against gold.
const leaf = group("LedgerLeaf", scene, [0, 1.13, 0.13]);
const shape = new T.Shape();
shape.moveTo(0, -0.065);
shape.bezierCurveTo(-0.09, -0.015, -0.055, 0.055, 0, 0.085);
shape.bezierCurveTo(0.07, 0.035, 0.085, -0.025, 0, -0.065);
const lg = new T.ExtrudeGeometry(shape, {
  depth: 0.008,
  bevelEnabled: true,
  bevelSegments: 2,
  steps: 1,
  bevelSize: 0.004,
  bevelThickness: 0.003,
  curveSegments: 12,
});
add(leaf, lg, undefined, undefined, "#ffe9a1", glow);
tube(
  leaf,
  [
    [0, -0.058, 0.015],
    [0, 0, 0.015],
    [0, 0.066, 0.015],
  ],
  0.003,
  "#8b662c",
);
for (const s of [-1, 1])
  for (const y of [-0.025, 0.005, 0.03])
    tube(
      leaf,
      [
        [0, y, 0.015],
        [s * 0.025, y + 0.017, 0.015],
      ],
      0.0017,
      "#a07d36",
    );
// Merge closed decoration per moving part/material; no extra draw for each bark mark.
for (const [parent, byMat] of bins)
  for (const [mat, geos] of byMat) {
    const geo = mergeVertices(mergeGeometries(geos), 1e-6);
    geo.computeVertexNormals();
    const mesh = new T.Mesh(geo, mat);
    mesh.name = parent.name + "Surface";
    parent.add(mesh);
  }
const animated = [
  ...spine,
  shade,
  face,
  left,
  right,
  low,
  leaf,
  ...roots,
  ...eyes,
];
const rests = new Map(
  animated.map((n) => [
    n.name,
    { p: n.position.clone(), q: n.quaternion.clone(), s: n.scale.clone() },
  ]),
);
const smooth = (n) => {
  const t = T.MathUtils.clamp(n, 0, 1);
  return t * t * (3 - 2 * t);
};
const bump = (t, a, b, c) =>
  t < b ? smooth((t - a) / (b - a)) : 1 - smooth((t - b) / (c - b));
function reset() {
  for (const n of animated) {
    const r = rests.get(n.name);
    n.position.copy(r.p);
    n.quaternion.copy(r.q);
    n.scale.copy(r.s);
  }
}
function blink(t, ats) {
  let v = 1;
  for (const at of ats)
    if (Math.abs(t - at) < 0.11)
      v = Math.min(v, 0.08 + 0.92 * smooth(Math.abs(t - at) / 0.11));
  eyes.forEach((e) => (e.scale.y = v));
}
function heldLeaf() {
  left.updateWorldMatrix(true, false);
  leaf.rotation.set(0.1, -0.16, 0.25);
  const stem = new T.Vector3(0, -0.065, 0.004).applyQuaternion(leaf.quaternion);
  leaf.position
    .copy(left.localToWorld(new T.Vector3(-0.18, 0.065, 0.014)))
    .sub(stem);
}
function idle(t) {
  spine[1].rotation.z = Math.sin(t * ((Math.PI * 2) / 3.2)) * 0.008;
  spine[2].rotation.z = -Math.sin(t * ((Math.PI * 2) / 3.2)) * 0.01;
  shade.rotation.z = Math.sin(t * ((Math.PI * 2) / 3.2) - 0.25) * 0.016;
  heldLeaf();
}
function clip(name, duration, pose) {
  const times = [],
    channels = new Map(animated.map((n) => [n.name, { p: [], q: [], s: [] }]));
  const frames = Math.ceil(duration * 30);
  for (let i = 0; i <= frames; i++) {
    reset();
    const t = (i / frames) * duration;
    pose(t, duration);
    times.push(t);
    for (const n of animated) {
      const c = channels.get(n.name);
      c.p.push(...n.position);
      c.q.push(...n.quaternion);
      c.s.push(...n.scale);
    }
  }
  const tracks = [];
  for (const n of animated) {
    const c = channels.get(n.name);
    tracks.push(
      new T.VectorKeyframeTrack(n.name + ".position", times, c.p),
      new T.QuaternionKeyframeTrack(n.name + ".quaternion", times, c.q),
      new T.VectorKeyframeTrack(n.name + ".scale", times, c.s),
    );
  }
  reset();
  return new T.AnimationClip(name, duration, tracks).optimize();
}
const clips = [
  clip("Idle", 3.2, (t) => {
    idle(t);
    blink(t, [1.0, 2.65]);
  }),
  clip("Wake", 0.8, (t) => {
    idle(0);
    const perk = bump(t, 0, 0.2, 0.7);
    shade.rotation.z = -0.075 * perk;
    shade.rotation.x = 0.035 * perk;
    face.rotation.z = 0.04 * perk;
    blink(t, [0.08]);
  }),
  clip("ChaseLeaf", 1.7, (t) => {
    const reach = bump(t, 0.36, 0.82, 1.23),
      miss = bump(t, 0.9, 1.25, 1.7);
    spine[1].rotation.z = -0.035 * reach;
    spine[2].rotation.z = 0.065 * reach - 0.035 * miss;
    right.rotation.z = -0.6 * reach;
    left.rotation.z = 0.16 * miss;
    shade.rotation.z = -0.045 * reach + 0.08 * miss;
    face.rotation.z = -0.12 * reach + 0.1 * miss;
    face.rotation.y = 0.12 * Math.sin(t * 3);
    const u = smooth(t / 1.7);
    leaf.position.set(
      -0.145 + 0.36 * Math.sin(u * Math.PI * 1.2),
      1.075 + 0.14 * Math.sin(u * Math.PI * 2),
      0.13,
    );
    leaf.rotation.set(
      0.2 * Math.sin(t * 5),
      0.45 * Math.sin(t * 4),
      -0.3 + t * 4,
    );
    blink(t, [1.38]);
  }),
  clip("Catch", 1.3, (t) => {
    const c = smooth(t / 0.6),
      rebound = bump(t, 0.25, 0.55, 0.85);
    left.rotation.z = 0.16 - 0.42 * c - 0.08 * rebound;
    right.rotation.z = -0.08 * (1 - c);
    spine[2].rotation.z = 0.035 * rebound;
    shade.rotation.z = -0.035 * rebound;
    face.rotation.z = -0.04 * c;
    const start = new T.Vector3(
      -0.145 + 0.36 * Math.sin(Math.PI * 1.2),
      1.075,
      0.13,
    );
    heldLeaf();
    const target = leaf.position.clone();
    leaf.position.copy(start.lerp(target, c));
    leaf.position.y += 0.045 * Math.sin(c * Math.PI);
    leaf.rotation.set(0.1 * c, -0.16 * c, 6.5 * (1 - c) + 0.25 * c);
    blink(t, [1.02]);
  }),
  clip("Bow", 1.3, (t) => {
    idle(0);
    const b = bump(t, 0.12, 0.62, 1.3);
    spine[1].rotation.x = 0.055 * b;
    spine[2].rotation.x = 0.065 * b;
    shade.rotation.x = 0.07 * bump(t, 0.23, 0.76, 1.3);
    left.rotation.z = -0.26;
    face.rotation.x = -0.05 * b;
    heldLeaf();
    blink(t, [0.7]);
  }),
  clip("Greet", 3.2, (t) => {
    idle(t);
    left.rotation.z = -0.26 + 0.015 * Math.sin(t * ((Math.PI * 2) / 3.2));
    face.rotation.z = -0.04;
    heldLeaf();
    blink(t, [1.0, 2.65]);
  }),
];
// Restore the actual initial pose used by runtime bounds and entrance framing.
const mixer = new T.AnimationMixer(scene);
mixer.clipAction(clips[0]).play();
mixer.update(0);
scene.updateMatrixWorld(true);
const bytes = Buffer.from(
  await new GLTFExporter().parseAsync(scene, {
    binary: true,
    animations: clips,
    onlyVisible: true,
  }),
);
await mkdir(out, { recursive: true });
await writeFile(out + "GildedRoot.glb", bytes);
let triangles = 0,
  primitives = 0;
scene.traverse((o) => {
  if (o.isMesh) {
    triangles +=
      (o.geometry.index
        ? o.geometry.index.count
        : o.geometry.attributes.position.count) / 3;
    primitives++;
  }
});
const provenance = {
  kind: "authored-procedural-character",
  created: "2026-10-24",
  generator: "scripts/guardian-models/build-gilded-root.mjs",
  reference:
    "Host gold branch floor lamp; silhouette and material reference only",
  sourceScanGeometry: false,
  sourcePhotoTextures: false,
  bytes: bytes.length,
  sha256: createHash("sha256").update(bytes).digest("hex"),
  triangles,
  primitives,
  images: 0,
  texturePixels: 0,
  spineBones: 4,
  clips: clips.map((c) => ({ name: c.name, duration: c.duration })),
  dimensions: new T.Box3()
    .setFromObject(scene)
    .getSize(new T.Vector3())
    .toArray(),
};
await writeFile(
  out + "provenance.json",
  JSON.stringify(provenance, null, 2) + "\n",
);
console.log(provenance);
