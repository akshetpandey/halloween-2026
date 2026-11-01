/** Five original twig/twine guardians, modeled from silhouette observations only.
 * No capture pixels, scans, model downloads, nondeterminism or external services. */
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
const OUT = fileURLToPath(new URL("../../src/client/assets/", import.meta.url));
const TAU = Math.PI * 2;
const smooth = (x) => {
  const u = T.MathUtils.clamp(x, 0, 1);
  return u * u * (3 - 2 * u);
};
const bump = (t, a, b, c) =>
  t < b ? smooth((t - a) / (b - a)) : 1 - smooth((t - b) / (c - b));
const v = (p) => new T.Vector3(...p);
const palette = {
  bark: "#594031",
  grain: "#9b7357",
  cut: "#be9867",
  fiber: "#9d7b51",
  pale: "#c3a47c",
  moss: "#364722",
  olive: "#526637",
  eye: "#251c14",
  light: "#fff2c8",
};

function makeAsset(art, id, file, title) {
  const scene = new T.Scene();
  scene.name = `HollowCourt${file}`;
  const actor = new T.Group();
  actor.name = "CraftRoot";
  scene.add(actor);
  const wood = new T.MeshStandardMaterial({
    name: "Walnut twig grain",
    vertexColors: true,
    roughness: 0.91,
  });
  const fiber = new T.MeshStandardMaterial({
    name: "Natural flax twine",
    vertexColors: true,
    roughness: 1,
  });
  const mossMat = new T.MeshStandardMaterial({
    name: "Soft olive moss",
    vertexColors: true,
    roughness: 1,
  });
  const gloss = new T.MeshStandardMaterial({
    name: "Carved knot eyes",
    vertexColors: true,
    roughness: 0.32,
  });
  const bins = new Map(),
    animated = [actor],
    eyes = [];
  let unique = 0;
  function group(name, parent = actor, p = [0, 0, 0], animate = true) {
    const g = new T.Group();
    g.name = name;
    g.position.fromArray(p);
    parent.add(g);
    if (animate) animated.push(g);
    return g;
  }
  function add(
    parent,
    geo,
    color,
    mat = wood,
    p = [0, 0, 0],
    scale = [1, 1, 1],
    rotation = null,
  ) {
    geo.deleteAttribute("uv");
    if (rotation instanceof T.Quaternion) geo.applyQuaternion(rotation);
    else if (rotation)
      geo.rotateX(rotation[0]).rotateY(rotation[1]).rotateZ(rotation[2]);
    geo.scale(...scale);
    geo.translate(...p);
    if (!geo.attributes.color) {
      const c = new T.Color(color),
        a = new Float32Array(geo.attributes.position.count * 3);
      for (let i = 0; i < a.length; i += 3) a.set([c.r, c.g, c.b], i);
      geo.setAttribute("color", new T.BufferAttribute(a, 3));
    }
    if (!bins.has(parent)) bins.set(parent, new Map());
    const b = bins.get(parent);
    if (!b.has(mat)) b.set(mat, []);
    b.get(mat).push(geo.index ? geo.toNonIndexed() : geo);
  }
  function ball(g, p, s, c = palette.fiber, m = fiber, segments = 10) {
    add(g, new T.SphereGeometry(1, segments, 6), c, m, p, s);
  }
  function branch(g, a, b, r = 0.024, seed = 0) {
    const av = v(a),
      bv = v(b),
      d = bv.clone().sub(av),
      len = d.length(),
      q = new T.Quaternion().setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        d.normalize(),
      );
    const geo = new T.CylinderGeometry(r * 0.87, r * 1.06, len, 10, 8, false),
      pos = geo.attributes.position,
      colors = [];
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i),
        angle = Math.atan2(pos.getZ(i), pos.getX(i));
      const ridge =
        1 +
        0.055 * Math.sin(angle * 5 + seed) +
        0.025 * Math.cos(y * 23 + seed);
      pos.setX(
        i,
        pos.getX(i) * ridge +
          0.004 * Math.sin((y / len + 0.5) * Math.PI) * Math.sin(seed + 1),
      );
      pos.setZ(i, pos.getZ(i) * ridge + 0.003 * Math.sin(y * 9 + seed));
      const isCap = Math.abs(geo.attributes.normal.getY(i)) > 0.95;
      const c = new T.Color(isCap ? palette.cut : palette.bark).multiplyScalar(
        isCap
          ? 1
          : 0.82 +
              0.16 * Math.sin(angle * 7 + seed) +
              0.11 * Math.cos(y * 46 + seed),
      );
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    add(
      g,
      geo,
      palette.bark,
      wood,
      av.add(bv).multiplyScalar(0.5).toArray(),
      [1, 1, 1],
      q,
    );
    // Two shallow, closed bark ridges give longitudinal texture at phone size.
    for (let k = 0; k < 2; k++) {
      const offset = new T.Vector3(
        Math.cos(seed + k * 2.5) * r * 0.91,
        0,
        Math.sin(seed + k * 2.5) * r * 0.91,
      ).applyQuaternion(q);
      const start = v(a)
          .lerp(v(b), 0.15 + k * 0.19)
          .add(offset),
        end = v(a)
          .lerp(v(b), 0.59 + k * 0.16)
          .add(offset);
      cord(
        g,
        [
          start.toArray(),
          start
            .clone()
            .lerp(end, 0.45)
            .add(new T.Vector3(0.002, 0, 0.002))
            .toArray(),
          end.toArray(),
        ],
        0.0024,
        k ? palette.bark : palette.grain,
        wood,
        6,
        4,
      );
    }
  }
  function cord(
    g,
    pts,
    r = 0.005,
    color = palette.fiber,
    mat = fiber,
    segments = 14,
    radial = 5,
    closed = false,
  ) {
    const curve = new T.CatmullRomCurve3(pts.map(v), closed, "centripetal");
    const geo = new T.TubeGeometry(curve, segments, r, radial, closed);
    if (!closed) {
      // Cap the actual sampled end rings, so low-sided strands have no open seams.
      const positions = Array.from(geo.attributes.position.array),
        normals = Array.from(geo.attributes.normal.array),
        indices = Array.from(geo.index.array);
      for (const u of [0, 1]) {
        const center = positions.length / 3,
          p = curve.getPointAt(u),
          normal = curve.getTangentAt(u).multiplyScalar(u ? 1 : -1);
        positions.push(...p);
        normals.push(...normal);
        const start = u ? segments * (radial + 1) : 0;
        for (let j = 0; j < radial; j++)
          indices.push(
            center,
            start + (u ? j + 1 : j),
            start + (u ? j : j + 1),
          );
      }
      geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
      geo.setAttribute("normal", new T.Float32BufferAttribute(normals, 3));
      geo.setIndex(indices);
    }
    add(g, geo, color, mat);
  }
  function binding(
    g,
    p,
    r = 0.038,
    turns = 5,
    axis = [0, 1, 0],
    color = palette.fiber,
  ) {
    const q = new T.Quaternion().setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      v(axis).normalize(),
    );
    for (let i = 0; i < turns; i++) {
      const pts = [];
      for (let j = 0; j < 20; j++) {
        const a = (TAU * j) / 20;
        const local = new T.Vector3(
          Math.cos(a) * r * (1 + 0.06 * Math.sin(a * 3 + i)),
          (i - (turns - 1) / 2) * 0.011 + 0.006 * Math.sin(a * 2 + i),
          Math.sin(a) * r,
        )
          .applyQuaternion(q)
          .add(v(p));
        pts.push(local.toArray());
      }
      cord(
        g,
        pts,
        0.0055,
        i % 3 === 0 ? palette.pale : color,
        fiber,
        20,
        5,
        true,
      );
    }
    // Diagonal crossing thread visibly binds rather than becoming painted rings.
    const a = v(p).add(new T.Vector3(-r, -0.025, r * 0.5)),
      b = v(p).add(new T.Vector3(r, 0.024, r * 0.5));
    cord(
      g,
      [
        a.toArray(),
        v(p)
          .add(new T.Vector3(0, 0, r * 1.15))
          .toArray(),
        b.toArray(),
      ],
      0.006,
      color,
      fiber,
      10,
      5,
    );
  }
  function moss(g, p, s = 1, seed = 0) {
    for (let i = 0; i < 14; i++) {
      const a = i * 2.399 + seed,
        rr = 0.025 + ((i * 7) % 11) / 170,
        geo = new T.IcosahedronGeometry(1, 1),
        pos = geo.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        const x = pos.getX(j),
          y = pos.getY(j),
          z = pos.getZ(j),
          f = 1 + 0.12 * Math.sin(x * 9 + y * 6 + z * 7 + i);
        pos.setXYZ(j, x * f, y * f, z * f);
      }
      add(
        g,
        geo,
        i % 4 ? palette.moss : palette.olive,
        mossMat,
        [
          p[0] + Math.cos(a) * rr * s,
          p[1] + Math.sin(a * 1.7) * 0.07 * s,
          p[2] + Math.sin(a) * 0.03 * s,
        ],
        [0.04 * s, 0.044 * s, 0.028 * s],
      );
    }
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * 0.035 * s;
      cord(
        g,
        [
          [p[0] + x, p[1], p[2]],
          [p[0] + x * 1.7, p[1] - 0.09 * s, p[2] + 0.02],
          [p[0] + x * 1.5, p[1] - 0.16 * s, p[2] + 0.01],
        ],
        0.003,
        palette.moss,
        mossMat,
        7,
        4,
      );
    }
  }
  function face(parent, p = [0, 0, 0.05], s = 1) {
    const f = group("KnotFace", parent, p);
    for (const sign of [-1, 1]) {
      const e = group(sign < 0 ? "EyeL" : "EyeR", f, [
        sign * 0.029 * s,
        0.012 * s,
        0,
      ]);
      eyes.push(e);
      ball(e, [0, 0, 0], [0.013 * s, 0.018 * s, 0.008 * s], palette.eye, gloss);
      ball(
        e,
        [-0.003 * s, 0.006 * s, 0.007 * s],
        [0.004 * s, 0.004 * s, 0.002 * s],
        palette.light,
        gloss,
      );
    }
    cord(
      f,
      [
        [-0.018 * s, -0.022 * s, 0.002],
        [0, -0.027 * s, 0.006],
        [0.018 * s, -0.022 * s, 0.002],
      ],
      0.003 * s,
      palette.eye,
      gloss,
      9,
      5,
    );
    return f;
  }
  function twigArm(name, p, end, parent = actor) {
    const arm = group(name, parent, p);
    branch(arm, [0, 0, 0], end, 0.023, unique++);
    binding(arm, [0, 0, 0.008], 0.031, 3);
    return arm;
  }
  function leaf(g, p, s = 0.06, angle = 0) {
    const sh = new T.Shape();
    sh.moveTo(0, -s);
    sh.quadraticCurveTo(-s * 0.8, 0, 0, s);
    sh.quadraticCurveTo(s * 0.8, 0, 0, -s);
    const geo = new T.ExtrudeGeometry(sh, {
      depth: 0.006,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: 0.003,
      bevelThickness: 0.003,
      curveSegments: 5,
    });
    add(g, geo, palette.moss, mossMat, p, [1, 1, 1], [0, 0, angle]);
    cord(
      g,
      [
        [p[0], p[1] - s * 0.8, p[2] + 0.01],
        [p[0], p[1], p[2] + 0.014],
        [p[0], p[1] + s * 0.8, p[2] + 0.01],
      ],
      0.002,
      palette.olive,
      mossMat,
      6,
      4,
    );
  }
  function tassel(parent, name, p, side = 1, count = 6, length = 0.32) {
    const base = group(name, parent, p);
    binding(base, [0, 0, 0], 0.027, 4);
    const strands = [];
    for (let i = 0; i < count; i++) {
      const strand = group(`${name}Strand${i}`, base, [
        (i - (count - 1) / 2) * 0.009,
        0,
        0.004 * (i % 2),
      ]);
      const end = [
        side * (0.025 + i * 0.015),
        -length * (0.83 + (i % 3) * 0.085),
        0.018 * Math.sin(i),
      ];
      cord(
        strand,
        [
          [0, 0, 0],
          [end[0] * 0.3, -length * 0.28, 0.01],
          [end[0] * 0.85, -length * 0.67, 0.018],
          end,
        ],
        0.006,
        i % 3 ? palette.fiber : palette.pale,
        fiber,
        14,
        5,
      );
      strands.push(strand);
    }
    return { base, strands };
  }
  const parts = {};
  if (art === "fork") {
    branch(actor, [-0.53, 0.41, 0.01], [0.43, 0.34, 0.01], 0.023, 1);
    branch(actor, [0, 0.08, -0.012], [0.09, 0.92, -0.012], 0.023, 2);
    branch(actor, [-0.57, 0.32, 0], [0.08, 0.94, 0], 0.025, 3);
    branch(actor, [0.08, 0.94, 0.012], [0.45, 0.2, 0.012], 0.025, 4);
    parts.left = twigArm(
      "ApproachTwigL",
      [0.075, 0.93, 0],
      [-0.37, 0.59, 0.002],
    );
    parts.right = twigArm(
      "KnockingTwig",
      [0.075, 0.93, 0.012],
      [0.58, 0.34, 0.008],
    );
    for (const p of [
      [-0.4, 0.4, 0.02],
      [0.06, 0.38, 0.02],
      [0.36, 0.35, 0.02],
      [0.075, 0.93, 0.03],
    ])
      binding(actor, p, 0.038, 5);
    cord(
      actor,
      [
        [0.06, 0.34, 0.045],
        [0.2, 0.29, 0.045],
        [0.36, 0.32, 0.045],
      ],
      0.006,
      palette.fiber,
    );
    parts.head = group("MossHead", actor, [0.075, 1.04, 0.02]);
    moss(parts.head, [0, 0.05, 0], 0.96, 1);
    parts.face = face(parts.head, [0, 0.047, 0.074], 1.12);
  }
  if (art === "ember") {
    branch(actor, [-0.47, 0.24, 0], [0.015, 1.12, 0], 0.022, 1);
    branch(actor, [0.015, 1.12, 0.012], [0.48, 0.21, 0.012], 0.024, 2);
    branch(actor, [-0.54, 0.32, 0.018], [0.58, 0.27, 0.018], 0.023, 3);
    branch(actor, [-0.65, 1.03, 0.022], [0.66, 1.09, 0.022], 0.023, 4);
    for (const p of [
      [-0.4, 0.31, 0.03],
      [0.46, 0.28, 0.03],
      [0.015, 1.12, 0.03],
    ])
      binding(actor, p, 0.038, 5);
    parts.head = group("EmberMoss", actor, [0.015, 1.17, 0.018]);
    moss(parts.head, [0, 0.015, 0], 0.75, 2);
    parts.face = face(parts.head, [0, 0.015, 0.068], 1.08);
    parts.tassels = [
      tassel(actor, "LeftTassel", [-0.53, 1.04, 0.025], -1, 7, 0.31),
      tassel(actor, "RightTassel", [0.52, 1.085, 0.025], 1, 7, 0.31),
    ];
    cord(
      actor,
      [
        [0.45, 0.27, 0.04],
        [0.47, 0.17, 0.05],
        [0.54, 0.12, 0.04],
      ],
      0.005,
    );
  }
  if (art === "knots") {
    branch(actor, [-0.45, 0.16, 0.012], [0.04, 1.29, 0], 0.021, 1);
    branch(actor, [0.04, 1.28, 0.005], [0.38, 0.36, 0.012], 0.021, 2);
    branch(actor, [-0.56, 0.37, 0.03], [0.25, 0.24, 0.03], 0.021, 3);
    branch(actor, [-0.29, 0.1, 0.018], [0.57, 0.57, 0.018], 0.022, 4);
    branch(actor, [0.04, 0.28, -0.014], [0.02, 1.43, -0.014], 0.018, 5);
    for (const p of [
      [-0.38, 0.34, 0.04],
      [0.03, 0.29, 0.045],
      [0.38, 0.46, 0.04],
      [0.03, 1.25, 0.03],
    ])
      binding(actor, p, 0.035, 5);
    parts.head = group("TopKnot", actor, [0.03, 1.25, 0.04]);
    binding(parts.head, [0, 0, 0], 0.056, 7);
    parts.face = face(parts.head, [0, 0, 0.06], 1.07);
    parts.cord = group("LooseCord", actor, [0.03, 1.25, 0.04]);
    // A continuous flexible cord, plus a knot tied on that cord. Its base never detaches.
    const c1 = group("CordBend", parts.cord, [0, 0, 0]);
    cord(
      c1,
      [
        [0, 0, 0],
        [0.13, 0.02, 0.01],
        [0.2, -0.08, 0.02],
        [0.22, -0.19, 0.02],
      ],
      0.006,
    );
    parts.bend = c1;
    parts.bow = group("JoiningBow", actor, [0.035, 0.3, 0.085]);
    for (const sign of [-1, 1])
      cord(
        parts.bow,
        [
          [0, 0, 0],
          [sign * 0.078, 0.063, 0.006],
          [sign * 0.112, 0.008, 0.01],
          [sign * 0.07, -0.045, 0.005],
        ],
        0.006,
        palette.pale,
        fiber,
        17,
        5,
        true,
      );
    binding(parts.bow, [0, 0, 0], 0.021, 3);
    parts.tail = tassel(parts.bow, "KnotEnds", [0, -0.014, 0.01], 1, 3, 0.13);
  }
  if (art === "host") {
    branch(actor, [0, 0.18, -0.02], [0, 1.2, -0.02], 0.023, 1);
    // Densely wrapped head is a volumetric twine ball, not a solid generic human head.
    parts.head = group("WrappedHead", actor, [0, 1.17, 0]);
    ball(parts.head, [0, 0, 0], [0.103, 0.126, 0.092], "#7c6141", fiber, 8);
    ball(actor, [0, 0.72, 0], [0.065, 0.3, 0.05], "#806444", fiber, 8);
    for (let i = 0; i < 14; i++) {
      const pts = [];
      const phi = i * 2.399;
      const q = new T.Quaternion().setFromEuler(
        new T.Euler(0.3 * Math.sin(phi), phi, 0.22 * Math.cos(phi)),
      );
      for (let j = 0; j < 18; j++) {
        const a = (j / 18) * TAU;
        const point = new T.Vector3(
          Math.cos(a) * (0.115 + 0.009 * Math.sin(i)),
          Math.sin(a) * 0.14,
          0.012 * Math.sin(a * 3 + i),
        ).applyQuaternion(q);
        pts.push(point.toArray());
      }
      cord(
        parts.head,
        pts,
        0.0075,
        i % 4 ? palette.fiber : palette.pale,
        fiber,
        18,
        5,
        true,
      );
    }
    parts.face = face(parts.head, [0, 0.005, 0.126], 1.12);
    // Tapered harvest bundle, long strands, neck and waist cinches.
    for (let i = 0; i < 18; i++) {
      const a = (TAU * i) / 18,
        rr = 0.068 + 0.012 * Math.sin(i * 3);
      const xx = Math.cos(a),
        zz = Math.sin(a);
      cord(
        actor,
        [
          [xx * 0.035, 1.05, zz * 0.035],
          [xx * 0.09, 0.86, zz * 0.07],
          [xx * rr, 0.59, zz * rr],
          [xx * 0.09, 0.39, zz * 0.06],
          [xx * (0.13 + (i % 3) * 0.012), 0.12 + (i % 4) * 0.019, zz * 0.06],
        ],
        0.007,
        i % 4 ? palette.fiber : palette.pale,
        fiber,
        18,
        5,
      );
    }
    for (const [y, r, n] of [
      [1.005, 0.057, 5],
      [0.47, 0.077, 5],
    ])
      binding(actor, [0, y, 0], r, n);
    parts.left = twigArm(
      "OfferingArmL",
      [-0.045, 0.86, 0],
      [-0.38, 0.015, 0.006],
    );
    parts.right = twigArm(
      "OfferingArmR",
      [0.045, 0.86, 0],
      [0.38, 0.03, 0.008],
    );
    moss(actor, [0, 0.84, 0.005], 0.78, 3);
    for (const [x, a] of [
      [-0.17, 0.8],
      [0.17, -0.8],
    ])
      leaf(actor, [x, 0.87, 0.04], 0.085, a);
    parts.hem = tassel(actor, "HarvestHem", [0, 0.24, 0], -1, 6, 0.17);
  }
  if (art === "door") {
    const corners = [
      [-0.43, 0.23, 0],
      [-0.45, 0.88, 0],
      [0.1, 1.27, 0],
      [0.57, 0.79, 0],
      [0.39, 0.14, 0],
    ];
    for (let i = 0; i < corners.length; i++) {
      const a = v(corners[i]),
        b = v(corners[(i + 1) % 5]),
        d = b.clone().sub(a).normalize();
      branch(
        actor,
        a.clone().addScaledVector(d, -0.1).toArray(),
        b.clone().addScaledVector(d, 0.1).toArray(),
        0.024,
        i + 1,
      );
      binding(
        actor,
        corners[i].map((x, k) => (k === 2 ? x + 0.018 : x)),
        0.04,
        5,
      );
    }
    // The crossed filling is a gate hinged exactly on the pentagon's left bind.
    parts.gate = group("OpeningGate", actor, [-0.445, 0.84, 0.025]);
    branch(parts.gate, [0, 0, 0], [0.86, -0.7, 0], 0.021, 7);
    branch(parts.gate, [-0.02, -0.61, 0.015], [1.01, -0.05, 0.015], 0.021, 8);
    binding(parts.gate, [0.43, -0.34, 0.015], 0.033, 4);
    parts.head = group("DoorTopKnot", actor, [0.1, 1.27, 0.01]);
    moss(parts.head, [0, 0.025, 0], 0.53, 4);
    parts.face = face(parts.head, [0, 0, 0.065], 1.1);
    parts.veil = tassel(
      actor,
      "ThresholdThreads",
      [0.1, 1.2, -0.025],
      1,
      4,
      0.22,
    );
  }
  // Closed pieces merge per moving parent/material, keeping draw calls bounded.
  for (const [parent, byMat] of bins)
    for (const [mat, geos] of byMat) {
      const geo = mergeVertices(mergeGeometries(geos), 1e-6);
      geo.computeVertexNormals();
      const mesh = new T.Mesh(geo, mat);
      mesh.name = parent.name + "Surface" + mat.name.replaceAll(" ", "");
      parent.add(mesh);
    }
  const rests = new Map(
    animated.map((n) => [
      n,
      { p: n.position.clone(), q: n.quaternion.clone(), s: n.scale.clone() },
    ]),
  );
  function reset() {
    for (const n of animated) {
      const r = rests.get(n);
      n.position.copy(r.p);
      n.quaternion.copy(r.q);
      n.scale.copy(r.s);
    }
  }
  function blink(t, ats) {
    let sy = 1;
    for (const at of ats)
      if (Math.abs(t - at) < 0.085)
        sy = Math.min(sy, 0.08 + 0.92 * smooth(Math.abs(t - at) / 0.085));
    for (const e of eyes) e.scale.y = sy;
  }
  function settle(t) {
    const b = bump(t, 0.08, 0.42, 1);
    actor.rotation.x = 0.09 * b;
    if (parts.head) parts.head.rotation.x = -0.055 * b;
    if (art === "host") {
      parts.left.rotation.y = 0.12 * b;
      parts.right.rotation.y = -0.12 * b;
    }
    if (art === "door") parts.gate.rotation.y = -0.13 * b;
    blink(t, [0.46]);
  }
  function quiet(t, d) {
    const s = Math.sin((TAU * t) / d),
      lag = Math.sin((TAU * t) / d) * Math.sin((Math.PI * t) / d);
    actor.rotation.z = s * 0.012;
    if (parts.head) parts.head.rotation.z = s * 0.018;
    if (parts.tassels)
      parts.tassels.forEach((o, i) => {
        o.base.rotation.z = s * 0.025 * (i ? 1 : -1);
        o.strands.forEach(
          (n, j) => (n.rotation.x = lag * 0.025 * Math.sin(j + 1)),
        );
      });
    if (parts.hem) parts.hem.base.rotation.z = s * 0.02;
    if (parts.veil) parts.veil.base.rotation.x = s * 0.025;
    blink(t, [0.92, 1.88]);
  }
  function play(t) {
    if (art === "fork") {
      const shy = bump(t, 0, 0.3, 0.7);
      actor.rotation.z = -0.055 * shy;
      parts.head.rotation.z = 0.09 * shy;
      const knock =
        bump(t, 0.63, 0.76, 0.94) +
        0.78 * bump(t, 1.0, 1.13, 1.3) +
        0.62 * bump(t, 1.4, 1.53, 1.72);
      parts.right.rotation.x = 0.23 * knock;
      parts.right.rotation.z = 0.045 * knock;
      parts.left.rotation.z = -0.055 * bump(t, 1.75, 2.1, 2.55);
      parts.head.rotation.x = 0.06 * bump(t, 1.85, 2.18, 2.7);
    } else if (art === "ember") {
      const gather = bump(t, 0, 0.42, 0.85),
        spread = bump(t, 0.55, 1.28, 2.55);
      actor.rotation.z = 0.025 * spread;
      parts.head.rotation.z = -0.09 * bump(t, 1.5, 1.95, 2.75);
      parts.tassels.forEach((o, i) => {
        const sign = i ? 1 : -1;
        o.base.rotation.z = sign * (0.25 * gather - 0.58 * spread);
        o.base.rotation.x = -0.22 * spread;
        o.strands.forEach((n, j) => {
          n.rotation.z =
            sign * 0.13 * bump(t, 0.72 + j * 0.035, 1.42 + j * 0.025, 2.8);
          n.rotation.x =
            0.15 * Math.sin(t * 7 - j * 0.5) * bump(t, 0.65, 1.35, 2.7);
        });
      });
    } else if (art === "knots") {
      const inspect = bump(t, 0.05, 0.4, 0.8),
        fix = bump(t, 0.55, 1.45, 2.55);
      parts.head.rotation.z = -0.12 * inspect + 0.05 * fix;
      parts.head.rotation.x = 0.05 * inspect;
      parts.bend.rotation.z = -0.65 * fix;
      parts.bend.rotation.x = 0.25 * fix;
      parts.bow.rotation.z = 0.32 * bump(t, 0.7, 1.25, 2.15);
      parts.bow.scale.setScalar(1 - 0.16 * fix);
      parts.tail.base.rotation.z = -0.25 * bump(t, 0.9, 1.55, 2.7);
    } else if (art === "host") {
      parts.head.rotation.y =
        -0.24 * bump(t, 0.05, 0.35, 0.8) + 0.22 * bump(t, 0.6, 0.95, 1.35);
      const offer = bump(t, 1.05, 1.85, 2.85);
      parts.left.rotation.y = 0.64 * offer;
      parts.right.rotation.y = -0.58 * offer;
      parts.left.rotation.z = -0.16 * offer;
      parts.right.rotation.z = 0.15 * offer;
      parts.head.rotation.x = 0.065 * bump(t, 1.55, 2.05, 2.85);
      parts.hem.base.rotation.x = 0.09 * bump(t, 1.1, 1.95, 2.9);
    } else if (art === "door") {
      const anticipate = bump(t, 0, 0.3, 0.65),
        open = bump(t, 0.45, 1.35, 2.9);
      parts.gate.rotation.y = 0.06 * anticipate - 1.1 * open;
      parts.head.rotation.z = -0.065 * bump(t, 0.9, 1.7, 2.8);
      parts.veil.base.rotation.x = 0.26 * bump(t, 0.7, 1.6, 2.9);
      parts.veil.strands.forEach(
        (n, j) =>
          (n.rotation.z =
            0.07 * Math.sin(t * 5 - j * 0.6) * bump(t, 0.7, 1.6, 2.9)),
      );
    }
    blink(t, [0.43, 2.6]);
  }
  function clip(name, duration, pose) {
    const frames = Math.ceil(duration * 24),
      times = [],
      channels = new Map(animated.map((n) => [n, { p: [], q: [], s: [] }]));
    for (let i = 0; i <= frames; i++) {
      reset();
      const t = (duration * i) / frames;
      pose(t, duration);
      times.push(t);
      for (const n of animated) {
        const c = channels.get(n);
        c.p.push(...n.position);
        c.q.push(...n.quaternion);
        c.s.push(...n.scale);
      }
    }
    const tracks = [];
    for (const n of animated) {
      const c = channels.get(n);
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
    clip("Idle", 2.4, quiet),
    clip("Awaken", 0.9, (t) => {
      const b = bump(t, 0, 0.28, 0.9);
      actor.rotation.x = -0.045 * b;
      if (parts.head) {
        parts.head.rotation.y = 0.055 * b;
        parts.head.rotation.z = -0.065 * b;
      }
      if (parts.left) parts.left.rotation.z = 0.04 * b;
      if (parts.gate) parts.gate.rotation.y = -0.05 * b;
      blink(t, [0.16]);
    }),
    clip("Play", 3, play),
    clip("Settle", 1, settle),
    clip("Greet", 2.4, quiet),
  ];
  reset();
  scene.updateMatrixWorld(true);
  return { art, id, file, title, scene, clips, animated };
}

for (const args of [
  ["fork", "MAKE-01", "ForkSpirit", "The First Knock"],
  ["ember", "MAKE-02", "EmberSpirit", "The Ember Guest"],
  ["knots", "MAKE-03", "KnotsSpirit", "The Knotkeeper"],
  ["host", "MAKE-04", "HostSpirit", "The Little Host"],
  ["door", "MAKE-05", "DoorSpirit", "The Open Door"],
]) {
  const { art, id, file, title, scene, clips, animated } = makeAsset(...args);
  const bytes = Buffer.from(
    await new GLTFExporter().parseAsync(scene, {
      binary: true,
      animations: clips,
      onlyVisible: true,
    }),
  );
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
    created: "2026-10-31",
    guardianId: id,
    art,
    title,
    generator: "scripts/guardian-models/build-twig-spirits.mjs",
    reference:
      "Host current handmade guardian photographs; silhouette/material observations only; private references excluded",
    sourceScanGeometry: false,
    sourcePhotoTextures: false,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    triangles,
    primitives,
    images: 0,
    texturePixels: 0,
    bones: 0,
    animatedNodes: animated.length,
    clips: clips.map((c) => ({
      name: c.name,
      duration: c.duration,
      tracks: c.tracks.length,
    })),
    dimensions: new T.Box3()
      .setFromObject(scene)
      .getSize(new T.Vector3())
      .toArray(),
    axes: { up: "+Y", front: "+Z" },
    closedGeometry:
      "capped wood cylinders, closed twine loops, capped strand ends; authored rigid craft joints",
  };
  if (bytes.length >= 1_000_000 || triangles >= 15000 || primitives >= 45)
    throw new Error(
      `${art} exceeds authoring target: ${JSON.stringify({ bytes: bytes.length, triangles, primitives })}`,
    );
  await mkdir(OUT + art, { recursive: true });
  await writeFile(`${OUT}${art}/${file}.glb`, bytes);
  await writeFile(
    `${OUT}${art}/provenance.json`,
    JSON.stringify(provenance, null, 2) + "\n",
  );
  await writeFile(
    `${OUT}${art}/SOURCE.md`,
    `# ${title}\n\nOriginal procedural model and animation authored October 31, 2026 for Hollow Court (${id}). Editable source: [build-twig-spirits.mjs](../../../../scripts/guardian-models/build-twig-spirits.mjs). [Identity and performance brief](../../../../twig-spirits-2026-10-31.md).\n\nThe host's actual handmade prop guides the silhouette, wood/flax palette and bindings. Current private reference photographs were viewed locally; no private photograph pixels, scan geometry, room background, guest data, downloaded model or third-party texture is included. Unseen sides are a stylized interpretation. The assets contain original code-generated closed geometry, vertex colors and five authored local-joint clips, with no external resources. Three.js is the existing MIT-licensed authoring/export dependency.\n\nRebuild from the app folder with \`node scripts/guardian-models/build-twig-spirits.mjs\`. +Y is up, +Z is front. The normalized craft can be staged by the shared runtime. \`Idle\` and \`Greet\` loop for 2.4s; \`Awaken\` 0.9s, \`Play\` 3s and \`Settle\` 1s are once-only. See provenance.json for exact checksum and measured resource counts. Physical-phone performance and host appearance acceptance remain separate gates.\n`,
  );
  console.log(
    JSON.stringify({
      art,
      bytes: bytes.length,
      triangles,
      primitives,
      sha256: provenance.sha256,
    }),
  );
}
