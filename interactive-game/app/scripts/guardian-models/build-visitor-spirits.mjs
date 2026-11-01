/** Original reference-guided woodland visitors. No private pixels or external art. */
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
const smooth = (n) => {
  const t = T.MathUtils.clamp(n, 0, 1);
  return t * t * (3 - 2 * t);
};
const pulse = (t, a, b, c) =>
  t < b ? smooth((t - a) / (b - a)) : 1 - smooth((t - b) / (c - b));
const TAU = Math.PI * 2;
const durations = [
  ["Idle", 2.4],
  ["Awaken", 0.9],
  ["Play", 3],
  ["Settle", 1],
  ["Greet", 2.4],
];

function workshop(label) {
  const scene = new T.Scene();
  scene.name = "HollowCourt" + label;
  const bins = new Map(),
    animated = [],
    eyes = [];
  const satin = new T.MeshStandardMaterial({
    name: "Handcrafted satin",
    vertexColors: true,
    roughness: 0.72,
  });
  const gloss = new T.MeshStandardMaterial({
    name: "Bright glass eyes",
    vertexColors: true,
    roughness: 0.21,
  });
  const metal = new T.MeshStandardMaterial({
    name: "Antique honey metal",
    vertexColors: true,
    roughness: 0.35,
    metalness: 0.58,
  });
  const g = (name, parent = scene, p = [0, 0, 0], move = true) => {
    const node = new T.Group();
    node.name = label + name;
    node.position.fromArray(p);
    parent.add(node);
    if (move) animated.push(node);
    return node;
  };
  function add(parent, geo, p, s, color, rot = [0, 0, 0], mat = satin) {
    geo.deleteAttribute("uv");
    const colors = new Float32Array(geo.attributes.position.count * 3);
    const c = new T.Color(color),
      pos = geo.attributes.position;
    // A restrained baked shade variation gives sculpted detail without textures.
    for (let i = 0; i < pos.count; i++) {
      const shade =
        0.94 + 0.06 * T.MathUtils.clamp((pos.getY(i) + 1) * 0.5, 0, 1);
      colors.set([c.r * shade, c.g * shade, c.b * shade], i * 3);
    }
    geo.setAttribute("color", new T.BufferAttribute(colors, 3));
    geo.applyMatrix4(
      new T.Matrix4().compose(
        new T.Vector3(...p),
        new T.Quaternion().setFromEuler(new T.Euler(...rot)),
        new T.Vector3(...s),
      ),
    );
    if (!bins.has(parent)) bins.set(parent, new Map());
    if (!bins.get(parent).has(mat)) bins.get(parent).set(mat, []);
    bins
      .get(parent)
      .get(mat)
      .push(geo.index ? geo.toNonIndexed() : geo);
  }
  const ball = (parent, p, s, c, rot = [0, 0, 0], mat = satin, detail = 12) =>
    add(parent, new T.SphereGeometry(1, detail, 8), p, s, c, rot, mat);
  const feather = (parent, p, s, c, rot = [0, 0, 0]) =>
    add(parent, new T.SphereGeometry(1, 8, 5), p, s, c, rot);
  function tube(parent, points, r, c, mat = satin, segments = 10, endR = r) {
    const path = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)));
    const geo = new T.TubeGeometry(path, segments, r, 7, false);
    if (endR !== r) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const u = Math.floor(i / 8) / segments,
          at = path.getPointAt(u),
          ratio = 1 + (endR / r - 1) * u;
        p.setXYZ(
          i,
          at.x + (p.getX(i) - at.x) * ratio,
          at.y + (p.getY(i) - at.y) * ratio,
          at.z + (p.getZ(i) - at.z) * ratio,
        );
      }
      geo.computeVertexNormals();
    }
    add(parent, geo, [0, 0, 0], [1, 1, 1], c, [0, 0, 0], mat);
    for (const [p, rad] of [
      [points[0], r],
      [points.at(-1), endR],
    ])
      ball(parent, p, [rad, rad, rad], c, [0, 0, 0], mat, 8);
  }
  function cone(parent, p, s, c, rot = [0, 0, 0], mat = satin) {
    add(parent, new T.ConeGeometry(1, 1, 12), p, s, c, rot, mat);
  }
  function eye(parent, p, size, ring = "#6a482c") {
    const e = g("Eye" + eyes.length, parent, p);
    eyes.push(e);
    ball(
      e,
      [0, 0, 0],
      [size * 1.2, size * 1.25, size * 0.47],
      ring,
      undefined,
      gloss,
    );
    ball(
      e,
      [0, 0, size * 0.3],
      [size, size, size * 0.6],
      "#100e14",
      undefined,
      gloss,
    );
    ball(
      e,
      [-size * 0.27, size * 0.32, size * 0.82],
      [size * 0.24, size * 0.24, size * 0.12],
      "#fff7e6",
      undefined,
      gloss,
      8,
    );
    ball(
      e,
      [size * 0.26, -size * 0.18, size * 0.88],
      [size * 0.1, size * 0.1, size * 0.08],
      "#b6d3df",
      undefined,
      gloss,
      8,
    );
    return e;
  }
  function finishGeometry() {
    for (const [parent, materials] of bins)
      for (const [mat, geos] of materials) {
        const geo = mergeVertices(mergeGeometries(geos), 1e-6);
        geo.computeVertexNormals();
        const mesh = new T.Mesh(geo, mat);
        mesh.name = parent.name + "Surface";
        parent.add(mesh);
      }
  }
  const blink = (t, ats) => {
    let y = 1;
    for (const at of ats)
      y = Math.min(y, 0.06 + 0.94 * smooth(Math.abs(t - at) / 0.1));
    eyes.forEach((e) => (e.scale.y = y));
  };
  return {
    scene,
    animated,
    eyes,
    satin,
    gloss,
    metal,
    g,
    add,
    ball,
    feather,
    tube,
    cone,
    eye,
    finishGeometry,
    blink,
  };
}

function birds(kind) {
  const owl = kind === "owl",
    w = workshop(owl ? "BarnOwl" : "Raven");
  const { scene, g, ball, feather, tube, cone, eye, gloss, blink } = w;
  const dark = owl ? "#b2844e" : "#252c39",
    light = owl ? "#efd0a0" : "#3a4354";
  const perch = g("Perch", scene, [0, 0, 0], false);
  ball(perch, [0, 0.055, 0], [0.26, 0.055, 0.22], "#4b3c2b");
  tube(
    perch,
    [
      [0, 0.08, 0],
      [-0.025, 0.19, -0.015],
      [0.02, 0.35, 0],
    ],
    0.075,
    "#5e4933",
    undefined,
    10,
    0.052,
  );
  tube(
    perch,
    [
      [-0.18, 0.31, 0.04],
      [0, 0.35, 0.015],
      [0.2, 0.39, -0.01],
    ],
    0.055,
    "#73583a",
  );
  for (let i = 0; i < 4; i++)
    tube(
      perch,
      [
        [Math.sin(i * 1.7) * 0.04, 0.12, 0.04],
        [Math.sin(i * 1.7) * 0.17, 0.035, Math.cos(i * 1.7) * 0.13],
      ],
      0.026,
      i % 2 ? "#65523a" : "#847049",
    );
  // Engraved end-grain and a few moss cushions are public authored geometry.
  ball(perch, [0.2, 0.39, -0.01], [0.012, 0.049, 0.049], "#bc9461");
  for (let i = 0; i < 3; i++)
    ball(
      perch,
      [-0.12 + i * 0.09, 0.075, 0.12],
      [0.06, 0.025, 0.04],
      i % 2 ? "#637348" : "#748357",
      undefined,
      undefined,
      8,
    );
  const body = g("Body", scene, [0, 0.59, 0]);
  ball(
    body,
    [0, 0.1, -0.03],
    [owl ? 0.225 : 0.215, owl ? 0.33 : 0.3, 0.21],
    dark,
  );
  ball(body, [0, 0.12, 0.1], [0.18, 0.265, 0.14], owl ? "#f5eddb" : "#2b3441");
  const head = g("Head", body, [0, 0.41, 0.08]);
  ball(
    head,
    [0, 0.015, 0],
    [owl ? 0.28 : 0.24, owl ? 0.285 : 0.225, owl ? 0.22 : 0.23],
    owl ? "#c99a61" : "#28303d",
  );
  const wings = [];
  for (const s of [-1, 1]) {
    const wing = g(s < 0 ? "LeftWing" : "RightWing", body, [
      s * 0.17,
      0.24,
      -0.045,
    ]);
    wings.push(wing);
    ball(wing, [s * 0.045, -0.13, -0.04], [0.105, 0.23, 0.125], dark, [
      s * 0.12,
      0,
      s * 0.12,
    ]);
    for (let i = 0; i < 6; i++)
      feather(
        wing,
        [s * (0.025 + i * 0.011), -0.12 - i * 0.027, -0.115 + i * 0.014],
        [0.054, 0.15 - i * 0.007, 0.024],
        i % 2 ? dark : light,
        [0.25, 0, s * (-0.15 + i * 0.055)],
      );
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 3; col++)
        feather(
          wing,
          [s * (0.04 + col * 0.045), 0.01 - row * 0.068, -0.004],
          [0.037, 0.061, 0.026],
          owl
            ? col % 2
              ? "#d8ae75"
              : "#bd8c53"
            : col % 2
              ? "#3d4656"
              : "#303947",
          [0.2, 0, s * 0.17],
        );
    if (owl)
      for (let i = 0; i < 10; i++)
        ball(
          wing,
          [
            s * (0.02 + (i % 3) * 0.045),
            0.015 - Math.floor(i / 3) * 0.065,
            0.021,
          ],
          [0.007, 0.009, 0.004],
          "#70553e",
          undefined,
          undefined,
          8,
        );
  }
  const tail = g("Tail", body, [0, -0.08, -0.14]);
  for (let i = 0; i < 5; i++)
    feather(
      tail,
      [(i - 2) * 0.035, -0.13, -0.065],
      [0.04, owl ? 0.14 : 0.24, 0.025],
      i % 2 ? dark : light,
      [0.55, 0, (i - 2) * -0.07],
    );
  const feet = [];
  for (const s of [-1, 1]) {
    const f = g(s < 0 ? "LeftFoot" : "RightFoot", scene, [
      s * 0.09,
      0.39,
      0.065,
    ]);
    feet.push(f);
    tube(
      f,
      [
        [0, 0.08, -0.035],
        [0, 0.02, 0],
      ],
      0.021,
      owl ? "#b58c53" : "#33343a",
    );
    for (let i = 0; i < 3; i++)
      tube(
        f,
        [
          [0, 0.015, 0],
          [(i - 1) * 0.029, -0.002, 0.055],
          [(i - 1) * 0.035, -0.024, 0.078],
        ],
        0.011,
        owl ? "#d3aa6e" : "#4a4d56",
        undefined,
        7,
        0.005,
      );
    tube(
      f,
      [
        [0, 0.015, 0],
        [s * 0.025, -0.008, -0.057],
      ],
      0.01,
      owl ? "#b58c53" : "#44464d",
      undefined,
      6,
      0.005,
    );
  }
  let jaw;
  if (owl) {
    // Heart disk: softly beveled closed shape, with the central notch above the beak.
    const heart = new T.Shape();
    heart.moveTo(0, -0.235);
    heart.bezierCurveTo(-0.06, -0.2, -0.265, -0.06, -0.25, 0.105);
    heart.bezierCurveTo(-0.24, 0.29, -0.065, 0.255, 0, 0.17);
    heart.bezierCurveTo(0.065, 0.255, 0.24, 0.29, 0.25, 0.105);
    heart.bezierCurveTo(0.265, -0.06, 0.06, -0.2, 0, -0.235);
    w.add(
      head,
      new T.ExtrudeGeometry(heart, {
        depth: 0.025,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.018,
        bevelThickness: 0.012,
        curveSegments: 12,
      }),
      [0, 0, 0.18],
      [1, 1, 1],
      "#f7f0df",
    );
    for (const s of [-1, 1]) {
      eye(head, [s * 0.105, 0.035, 0.225], 0.058, "#8b6b49");
      for (let i = 0; i < 7; i++) {
        const a = -1.15 + i * 0.33;
        feather(
          head,
          [s * (0.1 + Math.cos(a) * 0.095), 0.025 + Math.sin(a) * 0.12, 0.223],
          [0.014, 0.042, 0.008],
          i % 2 ? "#e3d8c1" : "#fff7e7",
          [0, 0, s * -a],
        );
      }
    }
    cone(head, [0, -0.055, 0.265], [0.036, 0.095, 0.04], "#bfa376", [
      Math.PI,
      0,
      0,
    ]);
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 5; col++)
        feather(
          body,
          [(col - 2) * 0.06, 0.27 - row * 0.09, 0.209 - row * 0.005],
          [0.035, 0.057, 0.012],
          row % 2 ? "#e5decd" : "#fff7e6",
          [0, 0, (col - 2) * 0.04],
        );
  } else {
    for (const s of [-1, 1]) {
      const e = eye(head, [s * 0.139, 0.055, 0.176], 0.043, "#5f5a46");
      e.rotation.y = s * 0.2;
      feather(head, [s * 0.14, 0.115, 0.16], [0.1, 0.027, 0.025], "#202633", [
        0,
        0,
        s * -0.16,
      ]);
    }
    // Long raven bill, with a genuine lower-jaw hinge and overlapping gape.
    cone(
      head,
      [0, -0.015, 0.33],
      [0.093, 0.35, 0.075],
      "#1c232d",
      [Math.PI / 2, 0, 0],
      gloss,
    );
    jaw = g("LowerBeak", head, [0, -0.055, 0.19]);
    cone(
      jaw,
      [0, -0.005, 0.14],
      [0.076, 0.29, 0.038],
      "#434c58",
      [Math.PI / 2, 0, 0],
      gloss,
    );
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 7; col++) {
        const a = (col - 3) * 0.33;
        feather(
          body,
          [
            Math.sin(a) * (0.17 - row * 0.006),
            0.31 - row * 0.065,
            0.085 + Math.cos(a) * 0.13,
          ],
          [0.037, 0.057, 0.014],
          (row + col) % 2 ? "#3d4656" : "#2d3543",
          [0, a, Math.sin(a) * 0.15],
        );
      }
  }
  function loop(t, greet = false) {
    const a = (TAU * t) / 2.4;
    body.rotation.z = 0.012 * Math.sin(a);
    head.rotation.z = (greet ? (owl ? -0.075 : 0.11) : 0) + 0.025 * Math.sin(a);
    head.rotation.y = 0.035 * Math.sin(a) + (greet && !owl ? -0.13 : 0);
    wings.forEach(
      (wing, i) => (wing.rotation.z = (i ? 1 : -1) * 0.012 * Math.sin(a)),
    );
    tail.rotation.x = 0.028 * Math.sin(a);
    blink(t, [1.42]);
  }
  function pose(name, t) {
    if (name === "Idle" || name === "Greet") return loop(t, name === "Greet");
    if (name === "Awaken") {
      const perk = pulse(t, 0, 0.32, 0.9);
      head.rotation.x = -0.16 * perk;
      head.rotation.z = (owl ? -0.18 : 0.15) * perk;
      head.position.y += 0.025 * perk;
      wings[0].rotation.z = -0.06 * perk;
      wings[1].rotation.z = 0.06 * perk;
      blink(t, [0.16]);
    } else if (name === "Play") {
      if (owl) {
        head.rotation.y =
          -0.5 * pulse(t, 0.05, 0.4, 0.85) + 0.54 * pulse(t, 0.8, 1.12, 1.55);
        const fuss = pulse(t, 1.25, 1.6, 2.25);
        wings[0].rotation.z = -0.65 * fuss;
        wings[1].rotation.z = 0.32 * pulse(t, 1.5, 1.85, 2.4);
        head.rotation.x = 0.17 * pulse(t, 1.5, 1.85, 2.5);
        head.rotation.z = 0.12 * fuss;
        feet[0].rotation.x = -0.4 * pulse(t, 1.65, 1.9, 2.3);
        feet[0].position.y += 0.035 * pulse(t, 1.65, 1.9, 2.3);
        head.rotation.x += 0.2 * pulse(t, 2.4, 2.65, 3);
        blink(t, [1.1, 2.65]);
      } else {
        const listen = pulse(t, 0.02, 0.5, 1.2);
        head.rotation.y = -0.38 * listen;
        head.rotation.z = 0.18 * listen;
        body.rotation.x = 0.08 * listen;
        head.rotation.x = -0.14 * listen;
        const flourish = pulse(t, 0.8, 1.32, 2.25),
          follow = pulse(t, 1.05, 1.6, 2.45);
        wings[0].rotation.z = -1.1 * flourish;
        wings[1].rotation.z = 0.91 * follow;
        wings[0].rotation.x = -0.2 * flourish;
        wings[1].rotation.x = -0.24 * follow;
        jaw.rotation.x = 0.42 * pulse(t, 1.42, 1.67, 1.99);
        head.rotation.x -= 0.12 * follow;
        tail.rotation.x = 0.2 * follow;
        blink(t, [0.72, 2.5]);
      }
    } else {
      const bow = pulse(t, 0, 0.38, 1);
      head.rotation.x = 0.16 * bow;
      head.rotation.z = (owl ? -0.075 : 0.11) * smooth(t);
      head.rotation.y = owl ? 0 : -0.13 * smooth(t);
      wings[0].rotation.z = -0.06 * bow;
      wings[1].rotation.z = 0.06 * bow;
      blink(t, [0.5]);
    }
  }
  return {
    ...w,
    pose,
    meta: {
      guardianId: owl ? "BUY-02" : "BUY-01",
      art: kind,
      file: owl ? "BarnOwl.glb" : "Raven.glb",
      identity: owl
        ? "Buff barn owl with ivory heart face and forked wood perch"
        : "Charcoal raven with a long bill, layered wings and wood perch",
      rig: "Rigid overlapping head, wing, tail and toe pivots; raven includes lower-jaw hinge",
    },
  };
}

function stag() {
  const w = workshop("GoldenStag"),
    { scene, g, ball, tube, eye, metal, blink } = w;
  const gold = "#c49a43",
    bronze = "#a17a32";
  const base = g("Base", scene, [0, 0, 0], false);
  ball(
    base,
    [0, 0.018, -0.045],
    [0.26, 0.018, 0.27],
    "#af914f",
    undefined,
    metal,
  );
  const body = g("Body", scene, [0, 0, 0]);
  ball(
    body,
    [0, 0.65, -0.08],
    [0.072, 0.075, 0.24],
    gold,
    [-0.12, 0, 0],
    metal,
  );
  // The reference is an airy gold sculpture: crown dominates a very thin body.
  tube(
    body,
    [
      [0, 0.62, 0.1],
      [0, 0.83, 0.18],
      [0, 1.04, 0.19],
    ],
    0.042,
    gold,
    metal,
    15,
    0.027,
  );
  const legs = [];
  for (const s of [-1, 1])
    for (const front of [true, false]) {
      const z = front ? 0.1 : -0.23,
        leg = g(
          (s < 0 ? "Left" : "Right") + (front ? "Foreleg" : "Hindleg"),
          body,
          [s * 0.052, 0.64, z],
        );
      legs.push(leg);
      tube(
        leg,
        [
          [0, 0, 0],
          [s * 0.018, -0.28, front ? -0.014 : 0.04],
          [s * 0.012, -0.59, front ? 0.02 : 0.01],
        ],
        front ? 0.019 : 0.022,
        gold,
        metal,
        12,
        0.014,
      );
      ball(
        leg,
        [s * 0.012, -0.606, front ? 0.028 : 0.018],
        [0.027, 0.022, 0.041],
        bronze,
        undefined,
        metal,
      );
    }
  const head = g("Head", body, [0, 1.035, 0.185]);
  // Make the face readable on a phone without enlarging the reference's huge crown.
  const face = g("Face", head, [0, 0, 0], false);
  face.scale.setScalar(1.35);
  ball(face, [0, 0.018, 0.018], [0.079, 0.08, 0.098], gold, undefined, metal);
  ball(face, [0, -0.025, 0.093], [0.058, 0.037, 0.076], gold, undefined, metal);
  ball(
    face,
    [0, -0.013, 0.155],
    [0.029, 0.025, 0.017],
    bronze,
    undefined,
    metal,
  );
  const ears = [];
  for (const s of [-1, 1]) {
    const ear = g(s < 0 ? "LeftEar" : "RightEar", head, [
      s * 0.055,
      0.055,
      -0.003,
    ]);
    ears.push(ear);
    ball(
      ear,
      [s * 0.045, 0, 0],
      [0.083, 0.026, 0.037],
      gold,
      [0, 0, s * 0.38],
      metal,
    );
    ball(
      ear,
      [s * 0.055, 0.005, 0.019],
      [0.044, 0.011, 0.012],
      bronze,
      [0, 0, s * 0.38],
      metal,
    );
    const e = eye(face, [s * 0.051, 0.027, 0.091], 0.019, "#f3dfaa");
    e.rotation.y = s * 0.28;
  }
  const crown = g("Crown", head, [0, 0.075, -0.012]);
  for (const s of [-1, 1]) {
    const main = [
      [0, 0, 0],
      [s * 0.2, 0.045, 0],
      [s * 0.43, 0.13, -0.005],
      [s * 0.66, 0.29, -0.02],
      [s * 0.8, 0.53, -0.04],
      [s * 0.82, 0.82, -0.055],
    ];
    tube(crown, main, 0.027, gold, metal, 28, 0.013);
    for (let i = 0; i < 5; i++) {
      const x = 0.16 + i * 0.135,
        y = 0.02 + Math.pow(i / 4, 1.55) * 0.43,
        reach = [0.26, 0.32, 0.35, 0.38, 0.32][i];
      tube(
        crown,
        [
          [s * x, y, 0],
          [s * (x - 0.014), y + reach * 0.5, 0.015],
          [s * (x + 0.015), y + reach, 0.005],
        ],
        0.019,
        gold,
        metal,
        12,
        0.009,
      );
      if (i > 0)
        tube(
          crown,
          [
            [s * (x - 0.005), y + reach * 0.46, 0.015],
            [s * (x - 0.068), y + reach * 0.65, 0.027],
            [s * (x - 0.07), y + reach * 0.84, 0.02],
          ],
          0.013,
          gold,
          metal,
          8,
          0.006,
        );
    }
    tube(
      crown,
      [
        [s * 0.8, 0.53, -0.04],
        [s * 0.88, 0.62, -0.03],
        [s * 0.9, 0.78, -0.035],
      ],
      0.017,
      gold,
      metal,
      10,
      0.007,
    );
  }
  const leaf = g("CaughtLeaf", crown, [0.64, 0.47, 0.03]);
  ball(leaf, [0, 0, 0], [0.04, 0.075, 0.009], "#a16a2f", [0, 0, -0.6]);
  tube(
    leaf,
    [
      [0, -0.055, 0.011],
      [0, 0.055, 0.011],
    ],
    0.0025,
    "#e9c775",
    undefined,
    5,
  );
  const tail = g("Tail", body, [0, 0.68, -0.3]);
  ball(
    tail,
    [0, 0.025, -0.02],
    [0.019, 0.055, 0.027],
    gold,
    [-0.6, 0, 0],
    metal,
  );
  function pose(name, t) {
    if (name === "Idle" || name === "Greet") {
      const a = (TAU * t) / 2.4;
      head.rotation.z = 0.02 * Math.sin(a);
      tail.rotation.z = 0.08 * Math.sin(a);
      head.rotation.x = name === "Greet" ? -0.04 : 0;
      blink(t, [1.45]);
      if (name === "Greet") {
        leaf.scale.setScalar(0.001);
        leaf.position.add(new T.Vector3(0.2, -0.88, 0));
        leaf.rotation.set(0, 3, -0.8);
      }
    } else if (name === "Awaken") {
      const p = pulse(t, 0, 0.3, 0.9);
      head.rotation.x = -0.11 * p;
      head.rotation.z = -0.05 * p;
      tail.rotation.z = 0.22 * p;
      ears[0].rotation.x = -0.25 * p;
      blink(t, [0.12]);
    } else if (name === "Play") {
      head.rotation.x = 0.13 * pulse(t, 0.05, 0.5, 1.2);
      head.rotation.z = -0.09 * pulse(t, 0.45, 0.8, 1.4);
      const shake = pulse(t, 1.15, 1.7, 2.45);
      head.rotation.y = 0.14 * Math.sin((t - 1.15) * 15) * shake;
      crown.rotation.z = 0.025 * Math.sin(t * 18) * shake;
      const fall = smooth((t - 1.65) / 0.85);
      leaf.position.x += 0.2 * fall;
      leaf.position.y -= 0.88 * fall;
      leaf.rotation.z = -0.8 * fall;
      leaf.rotation.y = fall * 3;
      leaf.scale.setScalar(1 - 0.999 * smooth((t - 2.3) / 0.4));
      tail.rotation.z = 0.2 * shake;
      ears[0].rotation.x = -0.28 * pulse(t, 0.7, 1.1, 1.55);
      ears[1].rotation.x = 0.24 * pulse(t, 1.0, 1.45, 2.0);
      blink(t, [0.95, 2.6]);
    } else {
      const bow = pulse(t, 0, 0.45, 1);
      head.rotation.x = 0.18 * bow - 0.04 * smooth(t);
      head.rotation.z = 0.02 * bow;
      leaf.scale.setScalar(0.001);
      leaf.position.add(new T.Vector3(0.2, -0.88, 0));
      leaf.rotation.set(0, 3, -0.8);
      blink(t, [0.45]);
    }
  }
  return {
    ...w,
    pose,
    meta: {
      guardianId: "BUY-04",
      art: "stag",
      file: "GoldenStag.glb",
      identity:
        "Metallic gold sculpture with tiny slender body and very broad many-tined crown",
      rig: "Overlapping rigid head/crown/ears, four thin planted legs, tail and caught leaf",
    },
  };
}

function hare() {
  const w = workshop("Hare"),
    { scene, g, ball, tube, feather, eye, blink } = w;
  const brown = "#775334",
    tan = "#d4ae76",
    ivory = "#f2e7d3";
  const root = g("Root", scene),
    body = g("Body", root, [0, 0.37, -0.045]);
  ball(body, [0, 0, -0.065], [0.25, 0.25, 0.34], brown);
  ball(body, [0, 0.07, 0.15], [0.19, 0.23, 0.19], "#8b603d");
  ball(body, [0, 0.065, 0.3], [0.13, 0.18, 0.035], ivory, [-0.1, 0, 0]);
  const head = g("Head", body, [0, 0.24, 0.225]);
  ball(head, [0, 0.05, 0], [0.255, 0.235, 0.235], "#8c6541");
  ball(head, [0, 0.17, 0.03], [0.16, 0.14, 0.17], "#9b7751");
  for (const s of [-1, 1]) {
    ball(head, [s * 0.13, 0.022, 0.173], [0.092, 0.092, 0.037], tan, [
      0,
      s * 0.25,
      s * -0.12,
    ]);
    const e = eye(head, [s * 0.135, 0.04, 0.208], 0.054, "#b29462");
    e.rotation.y = s * 0.22;
    ball(head, [s * 0.071, -0.075, 0.21], [0.083, 0.069, 0.083], tan);
    for (let i = 0; i < 3; i++)
      tube(
        head,
        [
          [s * 0.1, -0.075 - i * 0.009, 0.26],
          [s * (0.2 + i * 0.015), -0.064 - i * 0.02, 0.26],
        ],
        0.0024,
        "#e1c79b",
        undefined,
        4,
      );
  }
  const nose = g("Nose", head, [0, -0.058, 0.288]);
  ball(nose, [0, 0, 0], [0.035, 0.025, 0.021], "#5d493c");
  tube(
    head,
    [
      [0, -0.073, 0.29],
      [0, -0.11, 0.282],
    ],
    0.003,
    "#72513d",
    undefined,
    4,
  );
  tube(
    head,
    [
      [-0.043, -0.114, 0.27],
      [0, -0.125, 0.28],
      [0.043, -0.114, 0.27],
    ],
    0.003,
    "#72513d",
    undefined,
    6,
  );
  const ears = [];
  for (const s of [-1, 1]) {
    const ear = g(s < 0 ? "LeftEar" : "RightEar", head, [
      s * 0.1,
      0.19,
      -0.025,
    ]);
    ears.push(ear);
    ball(ear, [0, 0.23, 0], [0.078, 0.29, 0.054], "#96754e", [
      0.14,
      0,
      s * -0.12,
    ]);
    ball(ear, [0, 0.25, 0.043], [0.046, 0.21, 0.014], "#c69e91", [
      0.14,
      0,
      s * -0.12,
    ]);
    feather(ear, [s * 0.025, 0.3, 0.052], [0.009, 0.15, 0.008], "#dec4a9", [
      0.14,
      0,
      s * -0.12,
    ]);
  }
  const tail = g("Tail", body, [0, 0, -0.36]);
  ball(tail, [0, 0, 0], [0.115, 0.12, 0.1], ivory);
  for (let i = 0; i < 7; i++) {
    const a = (TAU * i) / 7;
    ball(
      tail,
      [Math.cos(a) * 0.06, Math.sin(a) * 0.07, -0.02],
      [0.063, 0.066, 0.075],
      i % 2 ? ivory : "#fff4e2",
      undefined,
      undefined,
      8,
    );
  }
  // Two-bone limbs solve to ground-space targets; root bounce never drags planted paws.
  const limbs = [];
  for (const front of [true, false])
    for (const s of [-1, 1]) {
      const hip = g(
        (s < 0 ? "Left" : "Right") + (front ? "ForeArm" : "HindThigh"),
        body,
        [s * (front ? 0.15 : 0.2), front ? -0.03 : -0.05, front ? 0.18 : -0.21],
      );
      const l1 = front ? 0.18 : 0.2,
        l2 = 0.2;
      ball(
        hip,
        [0, -l1 * 0.44, 0],
        front ? [0.057, l1 * 0.62, 0.057] : [0.11, l1 * 0.72, 0.12],
        front ? brown : "#845d3d",
      );
      const knee = g(
        (s < 0 ? "Left" : "Right") + (front ? "ForeWrist" : "HindAnkle"),
        hip,
        [0, -l1, 0],
      );
      ball(
        knee,
        [0, -l2 * (front ? 0.45 : 0.4), 0],
        [
          front ? 0.05 : 0.055,
          l2 * (front ? 0.56 : 0.49),
          front ? 0.05 : 0.035,
        ],
        front ? tan : brown,
      );
      const foot = g(
        (s < 0 ? "Left" : "Right") + (front ? "ForePaw" : "HindPaw"),
        knee,
        [0, -l2, 0],
      );
      ball(
        foot,
        [0, 0.036, 0.025],
        [front ? 0.075 : 0.09, 0.054, front ? 0.095 : 0.13],
        tan,
      );
      for (let i = -1; i <= 1; i++)
        tube(
          foot,
          [
            [i * 0.023, 0.033, 0.065],
            [i * 0.023, 0.029, 0.105],
          ],
          0.003,
          "#b2895a",
          undefined,
          3,
        );
      limbs.push({ hip, knee, foot, l1, l2, s, front });
    }
  function legs(jump = 0, crouch = 0, t = 0) {
    body.position.y = 0.37 - 0.065 * crouch;
    for (const l of limbs) {
      // body world translation is explicit, so stance targets stay on the same floor.
      const targetY = 0.018 + root.position.y + 0.065 * jump,
        targetZ = l.front ? 0.3 : -0.15;
      const dy =
          targetY - (root.position.y + body.position.y + l.hip.position.y),
        dz = targetZ - (body.position.z + l.hip.position.z);
      const dist = T.MathUtils.clamp(
        Math.hypot(dy, dz),
        0.08,
        l.l1 + l.l2 - 0.003,
      );
      const bend =
        (l.front ? 1 : -1) *
        Math.acos(
          T.MathUtils.clamp(
            (dist * dist - l.l1 * l.l1 - l.l2 * l.l2) / (2 * l.l1 * l.l2),
            -1,
            1,
          ),
        );
      const angle =
        Math.atan2(-dz, -dy) -
        Math.atan2(l.l2 * Math.sin(bend), l.l1 + l.l2 * Math.cos(bend));
      l.hip.rotation.x = angle;
      l.knee.rotation.x = bend;
      l.foot.rotation.x = -angle - bend;
    }
  }
  function pose(name, t) {
    let crouch = 0,
      jump = 0;
    if (name === "Idle" || name === "Greet") {
      const a = (TAU * t) / 2.4;
      head.rotation.z = (name === "Greet" ? -0.1 : 0) + 0.02 * Math.sin(a);
      ears[0].rotation.z = -0.035 * Math.sin(a);
      ears[1].rotation.x = 0.04 * Math.sin(a);
      nose.scale.setScalar(1 + 0.045 * Math.sin(a * 3));
      tail.rotation.z = 0.07 * Math.sin(a);
      blink(t, [1.55]);
    } else if (name === "Awaken") {
      const p = pulse(t, 0, 0.3, 0.9);
      ears[0].rotation.z = -0.22 * p;
      ears[1].rotation.x = -0.18 * p;
      head.rotation.y = -0.12 * p;
      blink(t, [0.1]);
    } else if (name === "Play") {
      const feint = pulse(t, 0.03, 0.27, 0.55),
        second = pulse(t, 0.55, 0.77, 1.05);
      head.rotation.y = -0.22 * feint + 0.18 * second;
      ears[0].rotation.x = -0.27 * feint;
      ears[1].rotation.z = 0.2 * second;
      crouch = pulse(t, 0.86, 1.12, 1.38) + 0.65 * pulse(t, 1.93, 2.1, 2.43);
      jump = pulse(t, 1.25, 1.58, 1.98);
      root.position.y = 0.16 * jump;
      head.rotation.x = -0.12 * jump + 0.11 * pulse(t, 1.95, 2.12, 2.5);
      ears[0].rotation.x += 0.3 * jump - 0.18 * pulse(t, 2.0, 2.16, 2.6);
      ears[1].rotation.x = 0.4 * pulse(t, 1.35, 1.7, 2.3);
      tail.rotation.x = -0.22 * jump;
      nose.scale.setScalar(1 + 0.09 * pulse(t, 2.42, 2.6, 2.8));
      blink(t, [0.7, 2.1]);
    } else {
      crouch = 0.22 * pulse(t, 0, 0.3, 0.7);
      head.rotation.z = -0.1 * smooth(t);
      head.rotation.x = 0.1 * pulse(t, 0.1, 0.4, 0.85);
      ears[0].rotation.z = -0.09 * pulse(t, 0, 0.3, 0.8);
      blink(t, [0.45]);
    }
    legs(jump, crouch, t);
  }
  return {
    ...w,
    pose,
    meta: {
      guardianId: "BUY-05",
      art: "hare",
      file: "Hare.glb",
      identity:
        "Brown plush-like rabbit with tan face/paws, pink-lined upright ears, ivory chest and pompom tail",
      rig: "Rigid overlapping plush body/head, independent ears/nose/tail, four solved two-bone legs and grounded paws",
    },
  };
}

async function exportVisitor(w) {
  const { scene, animated, pose, meta } = w;
  w.finishGeometry();
  const rests = new Map(
    animated.map((n) => [
      n,
      { p: n.position.clone(), q: n.quaternion.clone(), s: n.scale.clone() },
    ]),
  );
  const reset = () =>
    animated.forEach((n) => {
      const r = rests.get(n);
      n.position.copy(r.p);
      n.quaternion.copy(r.q);
      n.scale.copy(r.s);
    });
  const clips = durations.map(([name, duration]) => {
    const times = [],
      data = new Map(animated.map((n) => [n, { p: [], q: [], s: [] }])),
      frames = Math.round(duration * 30);
    for (let i = 0; i <= frames; i++) {
      reset();
      const t = (duration * i) / frames;
      pose(name, t);
      times.push(t);
      for (const n of animated) {
        const d = data.get(n);
        d.p.push(...n.position);
        d.q.push(...n.quaternion);
        d.s.push(...n.scale);
      }
    }
    const tracks = [];
    for (const n of animated) {
      const d = data.get(n);
      tracks.push(
        new T.VectorKeyframeTrack(n.name + ".position", times, d.p),
        new T.QuaternionKeyframeTrack(n.name + ".quaternion", times, d.q),
        new T.VectorKeyframeTrack(n.name + ".scale", times, d.s),
      );
    }
    return new T.AnimationClip(name, duration, tracks).optimize();
  });
  reset();
  pose("Idle", 0);
  scene.updateMatrixWorld(true);
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
        (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
      primitives++;
    }
  });
  const bounds = new T.Box3().setFromObject(scene, true),
    out = fileURLToPath(
      new URL(`../../src/client/assets/${meta.art}/`, import.meta.url),
    );
  const provenance = {
    kind: "authored-procedural-character",
    created: "2026-10-31",
    generator: "scripts/guardian-models/build-visitor-spirits.mjs",
    ...meta,
    reference:
      "Host private live guardian photographs; silhouette/palette only, not copied pixels",
    sourceScanGeometry: false,
    sourcePhotoTextures: false,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    triangles,
    primitives,
    images: 0,
    texturePixels: 0,
    bones: 0,
    articulatedNodes: animated.length,
    clips: clips.map((c) => ({ name: c.name, duration: c.duration })),
    dimensions: bounds.getSize(new T.Vector3()).toArray(),
    bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
    axes: { up: "+Y", front: "+Z", ground: 0 },
    mobileAcceptance: "Pending actual iPhone and Android review",
  };
  if (bytes.length > 1_000_000 || triangles > 18_000 || primitives > 45)
    throw new Error(
      `${meta.art}: resource budget exceeded: ${bytes.length} bytes, ${triangles} triangles, ${primitives} primitives`,
    );
  await mkdir(out, { recursive: true });
  await writeFile(out + meta.file, bytes);
  await writeFile(
    out + "provenance.json",
    JSON.stringify(provenance, null, 2) + "\n",
  );
  await writeFile(
    out + "SOURCE.md",
    `# ${meta.identity}\n\nOriginal Hollow Court character authored October 31, 2026 with the repository's Three.js dependency. Rebuild from the app folder with \`node scripts/guardian-models/build-visitor-spirits.mjs\`. The host's private physical-prop photos guide silhouette, proportions and palette; no photo pixels, private room imagery, scans, external models, textures or third-party art are embedded. Geometry, vertex colors and joint motion are original code-authored project artwork.\n\nGuardian: ${meta.guardianId}. ${meta.rig}. +Y up, +Z front, neutral ground y=0. Named clips are Idle (2.4s loop), Awaken (0.9s once), Play (3.0s once), Settle (1.0s once), Greet (2.4s loop). The app supplies the shared emergence and staging. See [identity/storyboard and review](../../../../visitor-spirits-2026-10-31.md) and [provenance](provenance.json) for limits and exact metrics. Actual phone acceptance remains pending.\n`,
  );
  console.log(
    `${meta.art}: ${meta.file}, ${bytes.length} bytes, ${triangles} triangles, ${primitives} primitives, sha256 ${provenance.sha256}`,
  );
}
for (const visitor of [birds("raven"), birds("owl"), stag(), hare()])
  await exportVisitor(visitor);
