/** Authored toy character. No scan triangles, photo pixels or external assets. */
import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  mergeGeometries,
  mergeVertices,
} from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { solvePlanarLeg } from "../../src/shared/guardian-ik.ts";

// GLTFExporter uses the browser FileReader interface even for buffer-only scenes.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
};
const out = fileURLToPath(
  new URL("../../src/client/assets/red-panda/", import.meta.url),
);
const scene = new T.Scene();
scene.name = "HollowCourtRedPanda";
const root = new T.Group();
root.name = "PandaBody";
root.position.y = 0.112;
scene.add(root);
const palette = {
  orange: "#df480b",
  red: "#bd3511",
  light: "#f16e18",
  cream: "#fff3db",
  white: "#fffaf0",
  paw: "#a65a22",
  brown: "#743b20",
  black: "#191712",
  blush: "#cf6026",
};
const toy = new T.MeshStandardMaterial({
  name: "Satin toy",
  vertexColors: true,
  roughness: 0.48,
  metalness: 0,
});
const gloss = new T.MeshStandardMaterial({
  name: "Eyes and nose",
  vertexColors: true,
  roughness: 0.2,
  metalness: 0,
});
const bins = new Map();
function group(name, parent, position = [0, 0, 0]) {
  const g = new T.Group();
  g.name = name;
  g.position.fromArray(position);
  parent.add(g);
  return g;
}
function add(
  parent,
  geometry,
  position,
  scale,
  color,
  rotation = [0, 0, 0],
  material = toy,
) {
  geometry.deleteAttribute("uv");
  const matrix = new T.Matrix4().compose(
    new T.Vector3(...position),
    new T.Quaternion().setFromEuler(new T.Euler(...rotation)),
    new T.Vector3(...scale),
  );
  geometry.applyMatrix4(matrix);
  const c = new T.Color(palette[color] ?? color),
    colors = new Float32Array(geometry.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) {
    colors[i] = c.r;
    colors[i + 1] = c.g;
    colors[i + 2] = c.b;
  }
  geometry.setAttribute("color", new T.BufferAttribute(colors, 3));
  // Merge like materials on each moving part, so decorative details cost no extra draws.
  let byMaterial = bins.get(parent);
  if (!byMaterial) bins.set(parent, (byMaterial = new Map()));
  if (!byMaterial.has(material)) byMaterial.set(material, []);
  byMaterial
    .get(material)
    .push(geometry.index ? geometry.toNonIndexed() : geometry);
}
const ball = (g, p, s, c, r, m) =>
  add(g, new T.SphereGeometry(1, 20, 14), p, s, c, r, m);
const box = (g, p, s, c, radius = 0.2, r = [0, 0, 0]) =>
  add(g, new RoundedBoxGeometry(1, 1, 1, 2, radius), p, s, c, r);
const curveLine = (g, points, radius, color) =>
  add(
    g,
    new T.TubeGeometry(
      new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
      12,
      radius,
      6,
      false,
    ),
    [0, 0, 0],
    [1, 1, 1],
    color,
  );

// A rounded, slightly brick-like torso and a deliberately larger storybook head.
box(root, [0, 0.016, -0.02], [0.106, 0.092, 0.169], "orange", 0.28);
ball(root, [0, -0.005, -0.022], [0.049, 0.038, 0.079], "red");
box(root, [0, 0.006, 0.066], [0.064, 0.06, 0.016], "cream", 0.3);
// Three tiny studs acknowledge the photographed toy without using the scan's surface noise.
for (const z of [-0.065, -0.032, 0.001]) {
  add(
    root,
    new T.CylinderGeometry(0.009, 0.009, 0.005, 16),
    [0, 0.064, z],
    [1, 1, 1],
    "orange",
  );
}
const head = group("PandaHead", root, [0, 0.036, 0.103]);
box(head, [0, 0, 0], [0.132, 0.108, 0.094], "orange", 0.31);
ball(head, [0, -0.008, 0.013], [0.066, 0.047, 0.042], "light");
// White cheek crescents and eyebrows read clearly at phone size.
for (const side of [-1, 1]) {
  ball(head, [side * 0.042, -0.018, 0.046], [0.027, 0.031, 0.01], "white", [
    0,
    0,
    side * -0.25,
  ]);
  ball(head, [side * 0.034, 0.029, 0.046], [0.021, 0.008, 0.01], "white", [
    0,
    0,
    side * -0.28,
  ]);
  const eye = group(side < 0 ? "PandaEyeL" : "PandaEyeR", head, [
    side * 0.032,
    0.005,
    0.052,
  ]);
  ball(eye, [0, 0, 0], [0.013, 0.016, 0.009], "black", undefined, gloss);
  ball(
    eye,
    [-0.004, 0.006, 0.0073],
    [0.0048, 0.005, 0.0025],
    "white",
    undefined,
    gloss,
  );
  ball(
    eye,
    [0.004, -0.006, 0.008],
    [0.0021, 0.0021, 0.0013],
    "cream",
    undefined,
    gloss,
  );
  ball(head, [side * 0.054, -0.017, 0.05], [0.009, 0.006, 0.003], "blush");
  // Soft pointed ears: smooth closed extrusions, white rim and cinnamon centre.
  const ear = group(side < 0 ? "PandaEarL" : "PandaEarR", head, [
    side * 0.047,
    0.047,
    -0.006,
  ]);
  const shape = new T.Shape();
  shape.moveTo(-0.021, 0);
  shape.bezierCurveTo(-0.026, 0.015, -0.016, 0.039, -0.009, 0.043);
  shape.bezierCurveTo(0.001, 0.047, 0.026, 0.016, 0.021, 0);
  shape.quadraticCurveTo(0, -0.01, -0.021, 0);
  add(
    ear,
    new T.ExtrudeGeometry(shape, {
      depth: 0.016,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.003,
      bevelSegments: 3,
      steps: 1,
      curveSegments: 10,
    }),
    [0, 0, -0.008],
    [1, 1, 1],
    "white",
    [0, 0, -side * 0.28],
  );
  add(
    ear,
    new T.ExtrudeGeometry(shape, {
      depth: 0.003,
      bevelEnabled: true,
      bevelThickness: 0.002,
      bevelSize: 0.002,
      bevelSegments: 2,
      steps: 1,
      curveSegments: 8,
    }),
    [0, 0.003, 0.012],
    [0.57, 0.68, 1],
    "brown",
    [0, 0, -side * 0.28],
  );
}
// The muzzle is forward of the mask, with a tiny permanent smile.
ball(head, [-0.014, -0.027, 0.055], [0.024, 0.017, 0.015], "cream");
ball(head, [0.014, -0.027, 0.055], [0.024, 0.017, 0.015], "cream");
ball(head, [0, -0.018, 0.07], [0.012, 0.008, 0.007], "black", undefined, gloss);
curveLine(
  head,
  [
    [0, -0.024, 0.069],
    [0, -0.031, 0.07],
    [-0.007, -0.034, 0.069],
    [-0.012, -0.031, 0.067],
  ],
  0.0012,
  "brown",
);
curveLine(
  head,
  [
    [0, -0.031, 0.07],
    [0.007, -0.034, 0.069],
    [0.012, -0.031, 0.067],
  ],
  0.0012,
  "brown",
);

const legs = [];
for (const rear of [false, true])
  for (const side of [-1, 1]) {
    const name = `Panda${rear ? "Hind" : "Fore"}${side < 0 ? "L" : "R"}`;
    const leg = group(name, root, [
      side * (rear ? 0.034 : 0.049),
      -0.017,
      rear ? -0.077 : 0.046,
    ]);
    ball(leg, [0, -0.012, 0], [0.02, 0.028, 0.024], "orange");
    box(leg, [0, -0.027, 0], [0.031, 0.047, 0.036], "paw", 0.25);
    const knee = group(`${name}Knee`, leg, [0, -0.043, 0]);
    box(knee, [0, -0.02, 0.001], [0.027, 0.044, 0.032], "paw", 0.3);
    const foot = group(`${name}Foot`, knee, [0, -0.041, 0]);
    box(foot, [0, -0.002, 0.012], [0.04, 0.023, 0.053], "paw", 0.3);
    for (const x of [-0.012, 0, 0.012])
      ball(foot, [x, -0.005, 0.036], [0.0045, 0.004, 0.005], "paw");
    legs.push({ leg, knee, foot, rear, side });
  }

// One watertight tube; bone weights are continuous across every painted stripe.
const tailCurve = new T.CatmullRomCurve3(
  [
    [0, 0.018, -0.099],
    [0.003, 0.058, -0.119],
    [0.004, 0.115, -0.129],
    [-0.004, 0.171, -0.107],
    [-0.027, 0.208, -0.076],
    [-0.046, 0.216, -0.044],
  ].map((p) => new T.Vector3(...p)),
);
const length = 80,
  radial = 16,
  frames = tailCurve.computeFrenetFrames(length, false);
const tailPos = [],
  tailNormal = [],
  tailColor = [],
  tailJoints = [],
  tailWeights = [];
const bones = [];
for (let b = 0; b < 5; b++) {
  const bone = new T.Bone();
  bone.name = [
    "PandaTailBase",
    "PandaTailLower",
    "PandaTailMiddle",
    "PandaTailUpper",
    "PandaTailTip",
  ][b];
  const point = tailCurve.getPointAt(b / 4);
  bone.position.copy(
    b === 0 ? point : point.clone().sub(tailCurve.getPointAt((b - 1) / 4)),
  );
  if (b) bones[b - 1].add(bone);
  else root.add(bone);
  bones.push(bone);
}
const radiusAt = (t) =>
  0.023 *
  (1 + 0.13 * Math.sin(t * Math.PI)) *
  (t > 0.88 ? Math.sqrt(Math.max(0.0001, 1 - ((t - 0.88) / 0.12) ** 2)) : 1);
function vertex(i, j, color) {
  const t = i / length,
    a = ((j % radial) / radial) * Math.PI * 2,
    center = tailCurve.getPointAt(t);
  const n = frames.normals[i]
    .clone()
    .multiplyScalar(Math.cos(a))
    .addScaledVector(frames.binormals[i], Math.sin(a));
  const p = center.addScaledVector(n, radiusAt(t));
  const slope =
    (radiusAt(Math.min(1, t + 0.0001)) - radiusAt(Math.max(0, t - 0.0001))) /
    0.0002 /
    tailCurve.getLength();
  n.addScaledVector(frames.tangents[i], -slope).normalize();
  tailPos.push(...p.toArray());
  tailNormal.push(...n.toArray());
  tailColor.push(...color.toArray());
  const f = t * 4,
    low = Math.min(3, Math.floor(f));
  tailJoints.push(low, low + 1, 0, 0);
  tailWeights.push(1 - (f - low), f - low, 0, 0);
}
for (let i = 0; i < length; i++)
  for (let j = 0; j < radial; j++) {
    // Alternating warm red and ivory; no texture/image allocation on mobile.
    const c = new T.Color(
      Math.floor(i / 16) % 2 === 0 ? palette.white : palette.orange,
    );
    for (const [ii, jj] of [
      [i, j],
      [i + 1, j + 1],
      [i + 1, j],
      [i, j],
      [i, j + 1],
      [i + 1, j + 1],
    ])
      vertex(ii, jj, c);
  }
// Close the ends with fan triangles. The root cap is inside the rump.
for (const end of [0, length])
  for (let j = 0; j < radial; j++) {
    const c = new T.Color(end === 0 ? palette.red : palette.white);
    const start = tailPos.length;
    for (const jj of end === 0 ? [0, j + 1, j] : [0, j, j + 1])
      vertex(end, jj, c);
    const center = tailCurve.getPointAt(end / length);
    tailPos.splice(start, 3, ...center.toArray());
    const n = frames.tangents[end].clone().multiplyScalar(end === 0 ? -1 : 1);
    for (let v = 0; v < 3; v++)
      tailNormal.splice(start + v * 3, 3, ...n.toArray());
  }
const tailGeo = new T.BufferGeometry();
for (const [name, data, size, Type] of [
  ["position", tailPos, 3, Float32Array],
  ["normal", tailNormal, 3, Float32Array],
  ["color", tailColor, 3, Float32Array],
  ["skinIndex", tailJoints, 4, Uint16Array],
  ["skinWeight", tailWeights, 4, Float32Array],
])
  tailGeo.setAttribute(name, new T.BufferAttribute(new Type(data), size));
const tail = new T.SkinnedMesh(mergeVertices(tailGeo, 1e-6), toy);
tail.name = "PandaTail";
root.add(tail);
scene.updateMatrixWorld(true);
tail.bind(new T.Skeleton(bones));
for (const [parent, materials] of bins)
  for (const [material, geos] of materials) {
    const merged = mergeVertices(mergeGeometries(geos, false), 1e-6);
    const mesh = new T.Mesh(merged, material);
    mesh.name = `${parent.name}Surface${material === gloss ? "Gloss" : ""}`;
    parent.add(mesh);
  }

const tracksFor = (name, duration, pose) => {
  const tracks = [],
    times = [];
  for (let i = 0; i <= Math.ceil(duration * 30); i++)
    times.push((i / Math.ceil(duration * 30)) * duration);
  const animated = [
    root,
    head,
    ...legs.flatMap((l) => [l.leg, l.knee, l.foot]),
    ...bones,
    ...["PandaEyeL", "PandaEyeR", "PandaEarL", "PandaEarR"].map((n) =>
      scene.getObjectByName(n),
    ),
  ];
  const rests = new Map(
    animated.map((n) => [
      n.name,
      {
        position: n.position.clone(),
        rotation: n.rotation.clone(),
        scale: n.scale.clone(),
      },
    ]),
  );
  const channels = new Map(
    animated.map((n) => [n.name, { position: [], quaternion: [], scale: [] }]),
  );
  for (const t of times) {
    for (const n of animated) {
      const r = rests.get(n.name);
      n.position.copy(r.position);
      n.rotation.copy(r.rotation);
      n.scale.copy(r.scale);
    }
    pose(t, duration);
    for (const n of animated) {
      const c = channels.get(n.name);
      c.position.push(...n.position.toArray());
      c.quaternion.push(...n.quaternion.toArray());
      c.scale.push(...n.scale.toArray());
    }
  }
  for (const n of animated) {
    const c = channels.get(n.name);
    tracks.push(
      new T.VectorKeyframeTrack(`${n.name}.position`, times, c.position),
      new T.QuaternionKeyframeTrack(
        `${n.name}.quaternion`,
        times,
        c.quaternion,
      ),
      new T.VectorKeyframeTrack(`${n.name}.scale`, times, c.scale),
    );
    const r = rests.get(n.name);
    n.position.copy(r.position);
    n.rotation.copy(r.rotation);
    n.scale.copy(r.scale);
  }
  return new T.AnimationClip(name, duration, tracks).optimize();
};
const smooth = (t) => {
  t = T.MathUtils.clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
};
function blink(t, at) {
  let openness = 1;
  for (const b of at) {
    const d = Math.abs(t - b);
    if (d < 0.1) openness = Math.min(openness, 0.08 + 0.92 * smooth(d / 0.1));
  }
  for (const n of ["PandaEyeL", "PandaEyeR"])
    scene.getObjectByName(n).scale.y = openness;
}
function tailWag(t, amount = 0.1) {
  bones.forEach((b, i) => {
    b.rotation.z = Math.sin((t * Math.PI * 2) / 3.2 - i * 0.48) * amount;
    b.rotation.x = Math.sin((t * Math.PI * 2) / 3.2 - i * 0.35) * amount * 0.35;
  });
}
// Targets are authored in model/ground space, then solved after body movement.
// This makes the front paws bear weight instead of folding the legs in mid-air.
const soleHeight = 0.0135;
function feet(targets = () => ({})) {
  root.updateMatrix();
  const inverse = root.matrix.clone().invert();
  for (const l of legs) {
    const target = targets(l);
    const restZ = l.rear ? -0.077 : 0.046;
    const local = new T.Vector3(
      l.leg.position.x,
      soleHeight + (target.y ?? 0),
      restZ + (target.z ?? 0),
    )
      .applyMatrix4(inverse)
      .sub(l.leg.position);
    const angles = solvePlanarLeg(local.y, local.z, 0.043, 0.041);
    l.leg.rotation.x = angles.hip;
    l.knee.rotation.x = angles.knee;
    l.foot.rotation.x = -root.rotation.x - angles.hip - angles.knee;
  }
}
function perchTail(amount) {
  bones[0].rotation.x += 0.52 * amount;
  bones[0].rotation.z += 0.5 * amount;
}
function seated(amount) {
  root.position.y -= 0.034 * amount;
  root.position.z -= 0.006 * amount;
  root.rotation.x = -0.52 * amount;
  head.rotation.x = 0.52 * amount;
  feet((l) => ({ z: l.rear ? 0.031 * amount : 0 }));
}
const bump = (t, start, peak, end) =>
  t < peak
    ? smooth((t - start) / (peak - start))
    : 1 - smooth((t - peak) / (end - peak));
const clips = [
  tracksFor("Survey", 3.2, (t) => {
    feet();
    head.rotation.z = Math.sin((t * Math.PI * 2) / 3.2) * 0.055;
    head.rotation.y = Math.sin((t * Math.PI * 2) / 3.2) * 0.07;
    tailWag(t, 0.065);
    blink(t, [0.85, 2.65]);
    scene.getObjectByName("PandaEarR").rotation.z =
      Math.sin((t * Math.PI * 4) / 3.2) * 0.05;
  }),
  tracksFor("Anticipate", 0.8, (t) => {
    const look = bump(t, 0, 0.26, 0.65),
      bow = bump(t, 0.4, 0.62, 0.8);
    root.position.y -= 0.01 * bow;
    root.rotation.x = 0.1 * bow;
    head.rotation.y = 0.65 * look;
    head.rotation.z = -0.12 * look;
    head.rotation.x = -0.1 * bow;
    feet();
    bones.forEach((b, i) => {
      b.rotation.z = Math.sin(t * 7 - i * 0.55) * 0.13 * look;
      b.rotation.x = 0.12 * look * (i / 4);
    });
    scene.getObjectByName("PandaEarL").rotation.z = -0.15 * look;
    scene.getObjectByName("PandaEarR").rotation.z = 0.1 * look;
  }),
  tracksFor("Run", 0.64, (t, d) => {
    const phase = (t / d) * Math.PI * 2;
    // A light gallop: forelegs land before hind legs, with a little suspension.
    const lift = 0.007 * (1 - Math.cos(phase));
    root.position.y += lift;
    root.rotation.x = Math.sin(phase) * 0.07;
    head.rotation.x = -root.rotation.x * 0.65;
    head.rotation.y = -0.15;
    feet((l) => {
      const p = phase + (l.rear ? 2.0 : 0) + (l.side < 0 ? 0.28 : 0);
      return {
        y: lift + 0.02 * Math.pow(Math.max(0, Math.sin(p)), 1.5),
        z: 0.022 * Math.cos(p),
      };
    });
    bones.forEach((b, i) => {
      b.rotation.z = Math.sin(phase - i * 0.65) * 0.15;
      b.rotation.x = Math.sin(phase - i * 0.65) * 0.065;
    });
    scene.getObjectByName("PandaEarL").rotation.x = Math.sin(phase - 0.6) * 0.1;
    scene.getObjectByName("PandaEarR").rotation.x = Math.sin(phase - 0.8) * 0.1;
  }),
  tracksFor("Pounce", 0.85, (t) => {
    const crouch = bump(t, 0, 0.13, 0.26),
      flight = bump(t, 0.18, 0.37, 0.6),
      land = bump(t, 0.53, 0.65, 0.85);
    root.position.y += -0.012 * crouch + 0.052 * flight - 0.014 * land;
    root.rotation.x = 0.1 * crouch - 0.1 * flight + 0.12 * land;
    head.rotation.x = -root.rotation.x * 0.7;
    feet((l) => ({
      y: 0.052 * flight + (l.rear ? 0.018 : 0.008) * flight,
      z: (l.rear ? -0.015 : 0.025) * flight,
    }));
    bones.forEach((b, i) => {
      const lag = bump(t - i * 0.025, 0.36, 0.57, 0.88);
      b.rotation.x = -0.1 * flight + 0.14 * lag;
      b.rotation.z = Math.sin((t - i * 0.025) * 8) * 0.06 * (flight + land);
    });
    blink(t, [0.68]);
  }),
  tracksFor("Settle", 1, (t, d) => {
    seated(smooth(t / d));
    const damp = Math.exp(-t * 5);
    bones.forEach((b, i) => {
      b.rotation.x = Math.sin(t * 8 - i * 0.3) * 0.055 * damp;
      b.rotation.z = Math.sin(t * 7 - i * 0.4) * 0.055 * damp;
    });
    perchTail(smooth(t / d));
    blink(t, [0.75]);
  }),
  tracksFor("Curious", 1.1, (t) => {
    seated(1);
    const tilt = smooth((t - 0.12) / 0.43);
    head.rotation.z = -0.24 * tilt;
    head.rotation.y = 0.065 * tilt;
    head.rotation.x += -0.035 * tilt;
    scene.getObjectByName("PandaEarL").rotation.z = -0.1 * tilt;
    scene.getObjectByName("PandaEarR").rotation.z = 0.055 * tilt;
    bones.forEach((b, i) => {
      b.rotation.z = Math.sin(t * 2 - i * 0.35) * 0.025;
    });
    perchTail(1);
  }),
  tracksFor("Greet", 3.2, (t, d) => {
    seated(1);
    const phase = (t / d) * Math.PI * 2;
    // Keep the curious pose instead of perpetually rocking the whole character.
    head.rotation.z = -0.24 + Math.sin(phase) * 0.018;
    head.rotation.y = 0.065;
    head.rotation.x -= 0.035;
    scene.getObjectByName("PandaEarL").rotation.z = -0.1;
    scene.getObjectByName("PandaEarR").rotation.z = 0.055;
    tailWag(t, 0.025);
    perchTail(1);
    blink(t, [1.4, 2.75]);
    const wave = bump(t, 0.35, 0.8, 1.35) * 0.8;
    if (wave)
      feet((l) =>
        !l.rear && l.side < 0
          ? { y: 0.02 * wave, z: 0.012 * wave }
          : { z: l.rear ? 0.031 : 0 },
      );
  }),
];
scene.updateMatrixWorld(true);
const glb = await new GLTFExporter().parseAsync(scene, {
  binary: true,
  animations: clips,
  onlyVisible: true,
});
const bytes = Buffer.from(glb);
const bounds = new T.Box3().setFromObject(scene),
  dimensions = bounds.getSize(new T.Vector3());
let triangles = 0,
  primitives = 0;
scene.traverse((o) => {
  if (o.isMesh) {
    triangles +=
      (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
    primitives++;
  }
});
const provenance = {
  kind: "authored-procedural-character",
  created: "2026-10-24",
  generator: "scripts/guardian-models/build-red-panda.mjs",
  reference:
    "Host LEGO 31394 prop; photographed proportions and orange/brown/white palette only",
  sourceScanGeometry: false,
  sourcePhotoTextures: false,
  bytes: bytes.length,
  sha256: createHash("sha256").update(bytes).digest("hex"),
  triangles,
  primitives,
  images: 0,
  texturePixels: 0,
  tailBones: 5,
  clips: clips.map((c) => ({ name: c.name, duration: c.duration })),
  dimensions: dimensions.toArray(),
};
await mkdir(out, { recursive: true });
await writeFile(`${out}/RedPanda.glb`, bytes);
await writeFile(
  `${out}/provenance.json`,
  JSON.stringify(provenance, null, 2) + "\n",
);
console.log(JSON.stringify(provenance, null, 2));
