/** Four original photo-guided house spirits. References are never loaded at build time. */
import * as T from "three";
import {
  mergeGeometries,
  mergeVertices,
} from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
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
const TAU = Math.PI * 2;
const ease = (x) => {
  const v = T.MathUtils.clamp(x, 0, 1);
  return v * v * (3 - 2 * v);
};
const beat = (t, a, b, c) =>
  t < b ? ease((t - a) / (b - a)) : 1 - ease((t - b) / (c - b));
const pulse = (t, a, b) =>
  Math.sin(Math.PI * T.MathUtils.clamp((t - a) / (b - a), 0, 1)) ** 2;
const PALETTE = {
  ivory: "#f1e2c2",
  bone: "#d7c49b",
  shadow: "#484231",
  black: "#202027",
  green: "#6c8143",
  gold: "#c8a25d",
  white: "#fff4db",
  orange: "#e88021",
};

function studio(key, filename, title, reference) {
  const scene = new T.Scene();
  scene.name = "HollowCourt" + filename;
  const bins = new Map(),
    animated = [];
  const satin = new T.MeshStandardMaterial({
    name: "Hand painted satin",
    vertexColors: true,
    roughness: 0.67,
  });
  const gloss = new T.MeshStandardMaterial({
    name: "Glazed eyes and foil",
    vertexColors: true,
    roughness: 0.24,
    metalness: 0.08,
  });
  const glow = new T.MeshStandardMaterial({
    name: "Soft spirit light",
    vertexColors: true,
    roughness: 0.5,
    emissive: "#94dc83",
    emissiveIntensity: 0.38,
  });
  function group(name, parent = scene, pos = [0, 0, 0], moves = false) {
    const g = new T.Group();
    g.name = name;
    g.position.fromArray(pos);
    parent.add(g);
    if (moves) animated.push(g);
    return g;
  }
  function add(
    parent,
    geo,
    p = [0, 0, 0],
    scale = [1, 1, 1],
    color = PALETTE.ivory,
    mat = satin,
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
        colors = [];
      for (let i = 0; i < geo.attributes.position.count; i++)
        colors.push(c.r, c.g, c.b);
      geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    }
    if (!bins.has(parent)) bins.set(parent, new Map());
    const b = bins.get(parent);
    if (!b.has(mat)) b.set(mat, []);
    b.get(mat).push(geo.index ? geo.toNonIndexed() : geo);
  }
  const ball = (g, p, s, c, m = satin, detail = 14) =>
    add(
      g,
      new T.SphereGeometry(1, detail, Math.max(6, Math.round(detail * 0.65))),
      p,
      s,
      c,
      m,
    );
  const box = (g, p, s, c, rot = [0, 0, 0], m = satin) =>
    add(g, new RoundedBoxGeometry(1, 1, 1, 1, 0.12), p, s, c, m, rot);
  const tube = (g, pts, r, c, m = satin, segments = 12, sides = 6) =>
    add(
      g,
      new T.TubeGeometry(
        new T.CatmullRomCurve3(pts.map((p) => new T.Vector3(...p))),
        segments,
        r,
        sides,
        false,
      ),
      undefined,
      undefined,
      c,
      m,
    );
  const cone = (g, p, r, h, c, rot = [0, 0, 0]) =>
    add(g, new T.ConeGeometry(r, h, 8), p, undefined, c, satin, rot);
  function eye(
    parent,
    name,
    pos,
    size,
    color = PALETTE.black,
    material = gloss,
  ) {
    const e = group(name, parent, pos, true);
    ball(e, [0, 0, 0], size, color, material);
    ball(
      e,
      [-size[0] * 0.25, size[1] * 0.3, size[2] * 0.84],
      size.map((x) => x * 0.24),
      PALETTE.white,
      gloss,
      8,
    );
    return e;
  }
  function leaf(parent, name, pos, color, scale = 1, moves = false) {
    const g = group(name, parent, pos, moves),
      shape = new T.Shape();
    shape.moveTo(0, -0.07);
    shape.bezierCurveTo(-0.1, -0.025, -0.11, 0.065, 0, 0.13);
    shape.bezierCurveTo(0.1, 0.055, 0.08, -0.035, 0, -0.07);
    add(
      g,
      new T.ExtrudeGeometry(shape, {
        depth: 0.008,
        bevelEnabled: true,
        bevelSize: 0.005,
        bevelThickness: 0.004,
        bevelSegments: 1,
        curveSegments: 5,
      }),
      undefined,
      [scale, scale, scale],
      color,
    );
    tube(
      g,
      [
        [0, -0.065 * scale, 0.013 * scale],
        [0.002, 0.04 * scale, 0.02 * scale],
        [0, 0.105 * scale, 0.011 * scale],
      ],
      0.003 * scale,
      "#e7c98c",
      satin,
      6,
      4,
    );
    return g;
  }
  function blink(eyes, t, centres) {
    const b = centres.reduce(
      (v, c) => Math.max(v, pulse(t, c - 0.085, c + 0.085)),
      0,
    );
    for (const e of eyes) e.scale.y = 1 - 0.92 * b;
  }
  function chocolate(parent, name, pos, color, moves = false) {
    const g = group(name, parent, pos, moves);
    box(g, [0, 0, 0], [0.1, 0.048, 0.06], "#512f24");
    box(g, [0, 0, 0.004], [0.077, 0.052, 0.063], color, [0, 0, 0], gloss);
    for (const s of [-1, 1]) {
      box(
        g,
        [s * 0.057, 0, 0],
        [0.022, 0.04, 0.052],
        color,
        [0, s * 0.2, s * 0.13],
        gloss,
      );
      tube(
        g,
        [
          [s * 0.065, -0.015, 0.026],
          [s * 0.057, 0, 0.028],
          [s * 0.065, 0.015, 0.026],
        ],
        0.002,
        "#f6d28b",
        satin,
        4,
        4,
      );
    }
    ball(g, [0, 0.002, 0.038], [0.015, 0.015, 0.002], "#f8dfac", satin, 8);
    return g;
  }
  async function finish(pose) {
    for (const [parent, materials] of bins)
      for (const [material, geos] of materials) {
        const merged = mergeVertices(mergeGeometries(geos), 1e-6);
        const mesh = new T.Mesh(merged, material);
        mesh.name = parent.name + "Surface" + material.id;
        parent.add(mesh);
      }
    const neutral = animated.map((n) => ({
      n,
      p: n.position.clone(),
      q: n.quaternion.clone(),
      s: n.scale.clone(),
    }));
    const reset = () => {
      for (const { n, p, q, s } of neutral) {
        n.position.copy(p);
        n.quaternion.copy(q);
        n.scale.copy(s);
      }
    };
    function clip(name, duration) {
      const channels = animated.map(() => ({ p: [], q: [], s: [] })),
        times = [];
      const frames = Math.round(duration * 30);
      for (let i = 0; i <= frames; i++) {
        reset();
        const t = (i * duration) / frames;
        pose(name, t, duration);
        times.push(t);
        animated.forEach((n, j) => {
          channels[j].p.push(...n.position);
          channels[j].q.push(...n.quaternion);
          channels[j].s.push(...n.scale);
        });
      }
      const tracks = [];
      animated.forEach((n, j) => {
        for (const [suffix, type, data] of [
          ["position", T.VectorKeyframeTrack, channels[j].p],
          ["quaternion", T.QuaternionKeyframeTrack, channels[j].q],
          ["scale", T.VectorKeyframeTrack, channels[j].s],
        ]) {
          const stride = suffix === "quaternion" ? 4 : 3;
          if (data.some((v, k) => Math.abs(v - data[k % stride]) > 1e-7))
            tracks.push(new type(n.name + "." + suffix, times, data));
        }
      });
      reset();
      return new T.AnimationClip(name, duration, tracks).optimize();
    }
    const clips = [
      ["Idle", 2.4],
      ["Awaken", 0.9],
      ["Play", 3],
      ["Settle", 1],
      ["Greet", 2.4],
    ].map(([n, d]) => clip(n, d));
    reset();
    scene.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(scene);
    const bytes = Buffer.from(
      await new GLTFExporter().parseAsync(scene, {
        binary: true,
        animations: clips,
        onlyVisible: true,
      }),
    );
    let triangles = 0,
      primitives = 0,
      vertices = 0;
    scene.traverse((o) => {
      if (o.isMesh) {
        triangles +=
          (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
        vertices += o.geometry.attributes.position.count;
        primitives++;
      }
    });
    if (bytes.length >= 1_000_000 || triangles >= 18_000 || primitives >= 45)
      throw new Error(
        `${key} exceeds authoring budget: ${bytes.length} bytes, ${triangles} triangles, ${primitives} primitives`,
      );
    const out = fileURLToPath(
      new URL(`../../src/client/assets/${key}/`, import.meta.url),
    );
    const provenance = {
      kind: "authored-procedural-character",
      created: "2026-10-31",
      guardian: title,
      generator: "scripts/guardian-models/build-house-spirits.mjs",
      reference,
      sourceScanGeometry: false,
      sourcePhotoTextures: false,
      externalServices: false,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      triangles,
      vertices,
      primitives,
      images: 0,
      texturePixels: 0,
      bones: 0,
      articulatedNodes: animated.length,
      axes: "+Y up, +Z front",
      ground: 0,
      clips: clips.map((c) => ({ name: c.name, duration: c.duration })),
      dimensions: bounds.getSize(new T.Vector3()).toArray(),
      neutralBounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
    };
    await mkdir(out, { recursive: true });
    await writeFile(out + filename + ".glb", bytes);
    await writeFile(
      out + "provenance.json",
      JSON.stringify(provenance, null, 2) + "\n",
    );
    await writeFile(
      out + "SOURCE.md",
      `# ${title}\n\nOriginal authored geometry and local joint animation, October 31, 2026.\n\n${reference}. Private references were inspected for identity and palette; no photographs, scan geometry, private room pixels or external service were used in the public GLB. Unseen surfaces are a stylized interpretation.\n\nRebuild from the app directory with \`node scripts/guardian-models/build-house-spirits.mjs\`. The deterministic source uses the existing Three.js dependency. +Y is up; +Z is front. Neutral pose is grounded. \`provenance.json\` records the exact exported checksum and geometry/resource metrics.\n\nClips: Idle (2.4s loop), Awaken (0.9s), Play (3s), Settle (1s), Greet (2.4s loop). Every clip joins at the same neutral transform; the runtime supplies stage emergence.\n\nLocal artifact checks and review are described in [the house-spirit handoff](../../../../house-spirits-2026-10-31.md). Phone performance and host acceptance remain separate.\n`,
    );
    console.log(
      JSON.stringify({
        key,
        filename,
        bytes: bytes.length,
        triangles,
        primitives,
        sha256: provenance.sha256,
      }),
    );
  }
  return {
    scene,
    group,
    add,
    ball,
    box,
    tube,
    cone,
    eye,
    leaf,
    chocolate,
    blink,
    satin,
    gloss,
    glow,
    finish,
  };
}

async function moon() {
  const a = studio(
    "moon",
    "MoonThatStayed",
    "DEC-01 The Moon That Stayed",
    "Host single spherical cratered Moon Well lamp on a wooden tripod; also the listener",
  );
  const { scene, group, ball, box, tube, eye, satin, gloss } = a;
  // Honey wooden tripod remains planted throughout the listener's turn.
  for (let i = 0; i < 3; i++) {
    const ang = (i * TAU) / 3 + Math.PI / 2,
      x = Math.cos(ang),
      z = Math.sin(ang);
    tube(
      scene,
      [
        [x * 0.18, 0.025, z * 0.18],
        [x * 0.11, 0.12, z * 0.11],
        [x * 0.14, 0.24, z * 0.14],
      ],
      0.024,
      "#b08b54",
      satin,
      8,
    );
    ball(
      scene,
      [x * 0.18, 0.022, z * 0.18],
      [0.033, 0.022, 0.033],
      "#c7a779",
      satin,
      10,
    );
  }
  const orb = group("ListeningMoon", scene, [0, 0.565, 0], true);
  const geo = new T.SphereGeometry(0.405, 48, 32),
    pos = geo.attributes.position;
  const craters = Array.from({ length: 24 }, (_, i) => {
    const y = 1 - 2 * ((i + 0.5) / 24),
      angle = i * 2.399963229728653;
    return {
      dir: new T.Vector3(
        Math.sqrt(1 - y * y) * Math.cos(angle),
        y,
        Math.sqrt(1 - y * y) * Math.sin(angle),
      ),
      r: 0.05 + (i % 4) * 0.018,
    };
  });
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const d = new T.Vector3().fromBufferAttribute(pos, i).normalize();
    let delta = 0;
    for (const c of craters) {
      const dist = Math.sqrt(Math.max(0, 2 - 2 * d.dot(c.dir))) * 0.405;
      delta +=
        -0.018 * Math.exp(-((dist / (c.r * 0.62)) ** 2)) +
        0.006 * Math.exp(-(((dist - c.r) / (c.r * 0.2)) ** 2));
    }
    pos.setXYZ(
      i,
      d.x * (0.405 + delta),
      d.y * (0.405 + delta),
      d.z * (0.405 + delta),
    );
    const col = new T.Color("#ece6d3").lerp(
      new T.Color("#959ca7"),
      T.MathUtils.clamp(-delta * 32, 0, 0.7),
    );
    colors.push(col.r, col.g, col.b);
  }
  geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  a.add(orb, geo);
  // Sparse raised crater lips keep the lamp readable at a small phone scale.
  for (const c of craters.filter(
    (c) =>
      c.dir.z > -0.1 && (Math.abs(c.dir.x) > 0.48 || Math.abs(c.dir.y) > 0.42),
  )) {
    const lip = new T.TorusGeometry(c.r * 0.83, 0.0032, 4, 20);
    const lp = lip.attributes.position;
    for (let i = 0; i < lp.count; i++)
      lp.setZ(
        i,
        lp.getZ(i) +
          Math.sqrt(0.404 ** 2 - lp.getX(i) ** 2 - lp.getY(i) ** 2) -
          0.404,
      );
    lip.computeVertexNormals();
    lip.applyQuaternion(
      new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), c.dir),
    );
    a.add(
      orb,
      lip,
      c.dir.clone().multiplyScalar(0.404).toArray(),
      undefined,
      "#c4c7c6",
    );
  }
  const eyes = [-1, 1].map((s) =>
    eye(
      orb,
      "MoonEye" + s,
      [s * 0.118, 0.015, 0.388],
      [0.031, 0.04, 0.018],
      "#3e4655",
    ),
  );
  for (const s of [-1, 1]) {
    ball(
      orb,
      [s * 0.187, -0.042, 0.353],
      [0.04, 0.014, 0.007],
      "#d5b7a3",
      satin,
      10,
    );
    tube(
      orb,
      [
        [s * 0.15, 0.093, 0.372],
        [s * 0.119, 0.104, 0.386],
        [s * 0.086, 0.096, 0.389],
      ],
      0.007,
      "#b6b5ae",
      satin,
      7,
    );
  }
  tube(
    orb,
    [
      [-0.047, -0.068, 0.398],
      [0, -0.083, 0.405],
      [0.047, -0.068, 0.398],
    ],
    0.006,
    "#6b6b70",
    gloss,
    8,
  );
  const hands = [-1, 1].map((s) => {
    const h = group(
      "MoonListeningHand" + s,
      orb,
      [s * 0.335, -0.13, 0.02],
      true,
    );
    tube(
      h,
      [
        [0, 0, 0],
        [s * 0.092, -0.035, 0.025],
        [s * 0.104, 0.035, 0.085],
      ],
      0.014,
      "#aa885c",
      satin,
      10,
    );
    ball(h, [s * 0.101, 0.055, 0.088], [0.032, 0.042, 0.018], "#cfb581");
    for (let f = 0; f < 3; f++)
      tube(
        h,
        [
          [s * (0.08 + f * 0.019), 0.072, 0.086],
          [s * (0.079 + f * 0.02), 0.102 - Math.abs(f - 1) * 0.009, 0.08],
        ],
        0.008,
        "#cfb581",
        satin,
        3,
      );
    return h;
  });
  return a.finish((clip, t, duration) => {
    if (clip === "Idle" || clip === "Greet") {
      orb.rotation.z = 0.018 * Math.sin((t * TAU) / duration);
      hands[0].rotation.z = 0.035 * Math.sin((t * TAU) / duration);
      a.blink(eyes, t, [clip === "Idle" ? 1.25 : 0.9]);
    }
    if (clip === "Awaken") {
      orb.rotation.x = -0.075 * beat(t, 0.03, 0.29, 0.9);
      a.blink(eyes, t, [0.21]);
    }
    if (clip === "Play") {
      const l = beat(t, 0.02, 0.48, 1.36),
        r = beat(t, 1.14, 1.82, 2.94);
      orb.rotation.y = -0.23 * l + 0.25 * r;
      orb.rotation.z = 0.1 * l - 0.09 * r;
      hands[0].rotation.z = -0.65 * l;
      hands[1].rotation.z = 0.65 * r;
      orb.rotation.x = -0.04 * beat(t, 1.9, 2.35, 3);
      a.blink(eyes, t, [1.43, 2.5]);
    }
    if (clip === "Settle") {
      orb.rotation.x = 0.105 * beat(t, 0, 0.42, 1);
      a.blink(eyes, t, [0.45]);
    }
  });
}

async function keeper() {
  const a = studio(
    "guardian",
    "KeeperOfPulse",
    "DEC-03 The Keeper of Pulse",
    "Host actual pale faun/ram mask with curled horns, moss, green eyes and a striped dark jacket behind the DJ desk",
  );
  const { scene, group, ball, box, tube, cone, eye, satin, gloss, glow } = a;
  // A low two-platter desk anchors the jacketed musician in the actual installation.
  box(scene, [0, 0.205, 0.22], [0.79, 0.09, 0.38], "#272932");
  for (const s of [-1, 1])
    box(scene, [s * 0.29, 0.1, 0.22], [0.055, 0.2, 0.23], "#22252b");
  const decks = [-1, 1].map((s) => {
    const d = group("KeeperPlatter" + s, scene, [s * 0.22, 0.26, 0.235], true);
    a.add(
      d,
      new T.CylinderGeometry(0.11, 0.11, 0.015, 24),
      undefined,
      undefined,
      "#54545a",
      gloss,
    );
    a.add(
      d,
      new T.CylinderGeometry(0.078, 0.078, 0.017, 20),
      [0, 0.005, 0],
      undefined,
      "#202229",
    );
    box(d, [0.065, 0.017, 0], [0.026, 0.007, 0.009], "#d5b472");
    return d;
  });
  for (let i = 0; i < 5; i++)
    box(
      scene,
      [(i - 2) * 0.035, 0.259, 0.31],
      [0.014, 0.01, 0.045],
      i % 2 ? "#b9b277" : "#78a88b",
      undefined,
      glow,
    );
  const torso = group("KeeperTorso", scene, [0, 0.29, -0.035], true);
  ball(torso, [0, 0.19, 0], [0.235, 0.255, 0.13], "#303036");
  box(torso, [0, 0.145, 0.12], [0.34, 0.045, 0.019], "#a34b43");
  tube(
    torso,
    [
      [0, -0.015, 0.105],
      [0, 0.14, 0.132],
      [0, 0.385, 0.095],
    ],
    0.006,
    "#aa9383",
    gloss,
    12,
  );
  for (const s of [-1, 1]) {
    box(torso, [s * 0.068, 0.32, 0.115], [0.077, 0.13, 0.026], "#45434a", [
      0,
      0,
      s * -0.29,
    ]);
    tube(
      torso,
      [
        [s * 0.08, 0.32, 0.132],
        [s * 0.12, 0.24, 0.126],
      ],
      0.004,
      "#b9a88e",
      satin,
      4,
    );
  }
  const head = group("KeeperMask", torso, [0, 0.47, 0.01], true);
  ball(head, [0, 0.035, 0], [0.182, 0.205, 0.13], "#d9c59a");
  ball(head, [0, -0.1, 0.082], [0.102, 0.093, 0.087], "#dac59c");
  ball(head, [0, -0.156, 0.095], [0.054, 0.048, 0.048], "#72716b");
  const eyes = [-1, 1].map((s) => {
    ball(head, [s * 0.091, 0.009, 0.115], [0.067, 0.064, 0.034], "#615a50");
    const e = eye(
      head,
      "KeeperEye" + s,
      [s * 0.091, 0.01, 0.142],
      [0.036, 0.042, 0.019],
      "#6bdc63",
      glow,
    );
    ball(e, [0, -0.001, 0.018], [0.014, 0.021, 0.004], "#303e32", a.gloss, 10);
    ball(
      e,
      [-0.005, 0.007, 0.022],
      [0.005, 0.005, 0.002],
      "#fff6d9",
      a.gloss,
      8,
    );
    tube(
      head,
      [
        [s * 0.145, 0.079, 0.1],
        [s * 0.092, 0.101, 0.126],
        [s * 0.05, 0.077, 0.131],
      ],
      0.012,
      "#686153",
      satin,
      8,
    );
    ball(head, [s * 0.051, -0.071, 0.161], [0.037, 0.036, 0.025], "#e5d2ab");
    // Spiral horns curl down beside the mask rather than becoming wolf-like ears.
    const pts = [
      [s * 0.13, 0.15, -0.015],
      [s * 0.217, 0.19, -0.015],
      [s * 0.271, 0.13, 0.005],
      [s * 0.264, 0.054, 0.038],
      [s * 0.215, 0.047, 0.065],
      [s * 0.202, 0.097, 0.067],
    ];
    tube(head, pts, 0.035, "#89887c", satin, 20, 8);
    for (let k = 0; k < 4; k++)
      ball(
        head,
        [
          s * (0.18 + Math.sin(k * 0.7) * 0.075),
          0.16 - k * 0.023,
          0.01 + k * 0.009,
        ],
        [0.038, 0.012, 0.04],
        "#98978a",
        satin,
        10,
      );
    tube(
      head,
      [
        [s * 0.11, -0.018, 0.138],
        [s * 0.132, -0.056, 0.118],
        [s * 0.078, -0.096, 0.153],
      ],
      0.005,
      "#b4a27c",
      satin,
      6,
    );
    // Short draping moss is part of the mask silhouette, not a second antler rack.
    for (let k = 0; k < 4; k++)
      tube(
        head,
        [
          [s * (0.11 + k * 0.026), 0.177, -0.025],
          [s * (0.12 + k * 0.023), 0.22 + 0.018 * (k % 2), -0.03],
          [s * (0.15 + k * 0.025), 0.11 - 0.012 * k, -0.02],
        ],
        0.007,
        k % 2 ? "#697541" : "#8c9958",
        satin,
        8,
        5,
      );
    return e;
  });
  ball(head, [0, -0.087, 0.178], [0.023, 0.017, 0.009], "#68665a", gloss, 10);
  tube(
    head,
    [
      [-0.036, -0.127, 0.166],
      [0, -0.137, 0.174],
      [0.036, -0.127, 0.166],
    ],
    0.0045,
    "#786c57",
    satin,
    8,
  );
  const spiral = [];
  for (let i = 0; i <= 32; i++) {
    const u = i / 32,
      ang = u * Math.PI * 4,
      x = Math.cos(ang) * (0.004 + 0.049 * u),
      y = 0.127 + Math.sin(ang) * (0.004 + 0.049 * u),
      z =
        0.13 * Math.sqrt(1 - (x / 0.182) ** 2 - ((y - 0.035) / 0.205) ** 2) +
        0.006;
    spiral.push([x, y, z]);
  }
  tube(head, spiral, 0.0055, "#7c963d", satin, 40, 5);
  const arms = [-1, 1].map((s) => {
    const upper = group(
      "KeeperUpperArm" + s,
      torso,
      [s * 0.19, 0.26, -0.005],
      true,
    );
    tube(
      upper,
      [
        [0, 0, 0],
        [s * 0.055, -0.12, 0.005],
        [s * 0.065, -0.24, 0.025],
      ],
      0.067,
      "#33333b",
      satin,
      10,
      8,
    );
    box(upper, [s * 0.04, -0.105, 0.055], [0.11, 0.025, 0.019], "#a65347", [
      0,
      0,
      s * -0.15,
    ]);
    box(upper, [s * 0.047, -0.145, 0.059], [0.107, 0.021, 0.016], "#dbcfb8", [
      0,
      0,
      s * -0.15,
    ]);
    const fore = group(
      "KeeperForearm" + s,
      upper,
      [s * 0.065, -0.24, 0.025],
      true,
    );
    ball(fore, [0, 0, 0], [0.061, 0.061, 0.061], "#33333b");
    tube(
      fore,
      [
        [0, 0, 0],
        [-s * 0.02, -0.015, 0.11],
        [-s * 0.027, -0.025, 0.21],
      ],
      0.058,
      "#35353d",
      satin,
      10,
      8,
    );
    ball(fore, [-s * 0.027, -0.027, 0.243], [0.057, 0.026, 0.05], "#d5c49d");
    for (let f = 0; f < 3; f++)
      ball(
        fore,
        [-s * 0.027 + (f - 1) * 0.027, -0.03, 0.279],
        [0.011, 0.013, 0.025],
        "#dcccaa",
        satin,
        8,
      );
    return { upper, fore };
  });
  return a.finish((clip, t, d) => {
    if (clip === "Idle" || clip === "Greet") {
      head.rotation.z = 0.025 * Math.sin((t * TAU) / d);
      a.blink(eyes, t, [1.3]);
    }
    if (clip === "Awaken") {
      head.rotation.x = -0.12 * beat(t, 0, 0.3, 0.9);
      a.blink(eyes, t, [0.14]);
    }
    if (clip === "Play") {
      const phrase = beat(t, 0, 0.24, 2.94),
        scratch = Math.sin(t * 13) * beat(t, 0.25, 0.75, 1.55);
      head.rotation.x = 0.09 * Math.sin(t * 11) * phrase;
      head.rotation.z = -0.07 * Math.sin(t * 5) * phrase;
      torso.rotation.y = 0.035 * Math.sin(t * 5) * phrase;
      arms[0].fore.rotation.x =
        -0.19 * beat(t, 0.1, 0.42, 1.1) + scratch * 0.055;
      arms[1].fore.rotation.x = -0.21 * beat(t, 0.85, 1.28, 2.18);
      arms[0].upper.rotation.z = -0.05 * scratch;
      decks[0].rotation.y = 0.45 * scratch;
      decks[1].rotation.y = 0.3 * Math.sin(t * 10) * beat(t, 1.0, 1.6, 2.4);
      a.blink(eyes, t, [1.95]);
    }
    if (clip === "Settle") {
      head.rotation.z = -0.07 * beat(t, 0, 0.3, 1);
      arms[1].fore.rotation.x = -0.46 * beat(t, 0.02, 0.43, 1);
    }
  });
}

async function seed() {
  const a = studio(
    "seed",
    "LastSeed",
    "DEC-04 The Last Seed",
    "Host friendly orange open-mouth pumpkin candy bowl, attached black spider, green leaf and surrounding chocolates",
  );
  const { scene, group, ball, tube, eye, satin, gloss } = a;
  // Chocolate offerings on the floor are unbranded authored foil forms.
  const colors = ["#b85b49", "#c1a35b", "#56866b", "#c49c4b", "#8e4750"];
  for (let i = 0; i < 5; i++) {
    const c = a.chocolate(
      scene,
      "Offering" + i,
      [(i - 2) * 0.15, 0.026, 0.27 + 0.11 * Math.abs(Math.sin(i * 1.4))],
      colors[i],
    );
    c.rotation.y = (i - 2) * 0.2;
  }
  const body = group("PumpkinBowl", scene, [0, 0.4, -0.015], true);
  const geo = new T.SphereGeometry(1, 64, 40),
    src = geo.toNonIndexed(),
    p = src.attributes.position;
  const positions = [],
    normals = [],
    vertexColors = [];
  for (let i = 0; i < p.count; i += 3) {
    const centre = new T.Vector3();
    for (let j = 0; j < 3; j++)
      centre.add(new T.Vector3().fromBufferAttribute(p, i + j));
    centre.multiplyScalar(1 / 3);
    const mouth =
      centre.z > 0.45 &&
      (centre.x / 0.79) ** 2 + ((centre.y + 0.39) / 0.34) ** 2 < 1;
    if (mouth) continue;
    for (let j = 0; j < 3; j++) {
      const v = new T.Vector3().fromBufferAttribute(p, i + j),
        angle = Math.atan2(v.x, v.z),
        rib = 1 + 0.04 * Math.cos(angle * 9);
      const col = new T.Color("#e87519").lerp(
        new T.Color("#ffb33c"),
        0.2 + 0.25 * Math.max(0, Math.cos(angle * 9)),
      );
      positions.push(v.x * 0.407 * rib, v.y * 0.37, v.z * 0.342 * rib);
      vertexColors.push(col.r, col.g, col.b);
    }
  }
  let shell = new T.BufferGeometry();
  shell.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  shell.setAttribute("color", new T.Float32BufferAttribute(vertexColors, 3));
  shell = mergeVertices(shell, 1e-6);
  shell.computeVertexNormals();
  a.add(body, shell);
  ball(body, [0, -0.115, 0.109], [0.315, 0.136, 0.19], "#4c3025");
  // Rolled lip and ivory corners conceal the shell opening without flattening the volume.
  const lip = [];
  for (let i = 0; i <= 36; i++) {
    const ang = (i * TAU) / 36,
      x = Math.cos(ang) * 0.32,
      y = -0.145 + Math.sin(ang) * 0.126;
    lip.push([
      x,
      y,
      0.34 * Math.sqrt(Math.max(0.08, 1 - (x / 0.43) ** 2 - (y / 0.4) ** 2)) +
        0.012,
    ]);
  }
  tube(body, lip, 0.018, "#f39a29", satin, 40, 8);
  const eyes = [-1, 1].map((s) => {
    const e = eye(
      body,
      "PumpkinEye" + s,
      [s * 0.119, 0.085, 0.326],
      [0.044, 0.061, 0.014],
    );
    e.rotation.z = s * -0.17;
    ball(
      body,
      [s * 0.128, 0.066, 0.34],
      [0.02, 0.02, 0.005],
      "#f6dba7",
      satin,
      10,
    );
    return e;
  });
  a.cone(body, [0, 0.004, 0.356], 0.032, 0.067, "#3c3029", [0, 0, Math.PI]);
  for (const s of [-1, 1]) {
    a.box(body, [s * 0.205, -0.069, 0.284], [0.05, 0.061, 0.026], "#f9d49a", [
      0,
      s * 0.2,
      0,
    ]);
    ball(
      body,
      [s * 0.247, 0.01, 0.276],
      [0.042, 0.017, 0.007],
      "#d35d23",
      satin,
      10,
    );
  }
  tube(
    body,
    [
      [0, 0.34, 0],
      [-0.012, 0.4, -0.01],
      [0.025, 0.445, -0.015],
    ],
    0.033,
    "#657b3d",
    satin,
    8,
    8,
  );
  const greenLeaf = a.leaf(
    body,
    "PumpkinGreenLeaf",
    [0.105, 0.353, 0.055],
    "#5f783d",
    0.75,
  );
  greenLeaf.rotation.set(0.5, 0.1, -0.8);
  const spider = group("AttachedSpider", body, [0, 0.4, 0.032], true);
  ball(spider, [0, 0.055, -0.03], [0.116, 0.072, 0.105], "#25232a", gloss);
  ball(spider, [0, 0.032, 0.092], [0.086, 0.065, 0.056], "#25232a", gloss);
  const spiderEyes = [-1, 1].map((s) => {
    ball(
      spider,
      [s * 0.032, 0.046, 0.14],
      [0.026, 0.032, 0.012],
      "#f4ead5",
      gloss,
    );
    return eye(
      spider,
      "SpiderEye" + s,
      [s * 0.029, 0.047, 0.15],
      [0.012, 0.016, 0.006],
    );
  });
  const legs = [];
  for (const s of [-1, 1])
    for (let k = 0; k < 4; k++) {
      const leg = group(
        "SpiderLeg" + s + "_" + k,
        spider,
        [s * 0.065, 0.03, 0.07 - k * 0.045],
        true,
      );
      tube(
        leg,
        [
          [0, 0, 0],
          [s * 0.105, 0.025, 0.05 - k * 0.022],
          [s * 0.15, -0.115 - k * 0.012, 0.065 - k * 0.025],
        ],
        0.013,
        "#29262c",
        gloss,
        10,
      );
      ball(
        leg,
        [s * 0.105, 0.025, 0.05 - k * 0.022],
        [0.019, 0.019, 0.019],
        "#302b30",
        gloss,
        8,
      );
      legs.push({ leg, s, k });
    }
  const gift = a.chocolate(
    body,
    "OfferedChocolate",
    [0, -0.16, 0.245],
    "#c4a454",
    true,
  );
  gift.scale.setScalar(1.25);
  a.chocolate(body, "BowlChocolateL", [-0.13, -0.14, 0.21], "#a74443");
  const c = a.chocolate(
    body,
    "BowlChocolateR",
    [0.15, -0.16, 0.198],
    "#4f8460",
  );
  c.rotation.z = 0.3;
  return a.finish((clip, t, d) => {
    if (clip === "Idle" || clip === "Greet") {
      spider.rotation.z = 0.022 * Math.sin((t * TAU) / d);
      a.blink(eyes, t, [1.3]);
      a.blink(spiderEyes, t, [0.7]);
    }
    if (clip === "Awaken") {
      spider.rotation.x = 0.12 * beat(t, 0, 0.35, 0.9);
      a.blink(spiderEyes, t, [0.2]);
    }
    if (clip === "Play") {
      const offer = beat(t, 0.25, 1.3, 3),
        peek = beat(t, 0, 0.45, 1.15),
        clap = beat(t, 1.25, 1.6, 2.6);
      body.rotation.x = -0.025 * offer;
      spider.rotation.x = 0.14 * peek;
      gift.position.z += 0.13 * offer;
      gift.position.y += 0.035 * offer;
      gift.rotation.z = 0.12 * Math.sin(t * 6) * offer;
      for (const { leg, s, k } of legs)
        if (k === 0) {
          leg.rotation.z = -s * (0.5 + 0.12 * Math.sin(t * 19)) * clap;
          leg.rotation.x = -0.3 * clap;
        }
      a.blink(eyes, t, [2.2]);
      a.blink(spiderEyes, t, [0.8, 2.5]);
    }
    if (clip === "Settle") {
      body.rotation.x = 0.045 * beat(t, 0, 0.35, 1);
      a.blink(eyes, t, [0.4]);
    }
  });
}

async function skull() {
  const a = studio(
    "skull",
    "UnfinishedGuest",
    "DEC-05 The Unfinished Guest",
    "Host pale hornless long-muzzle wolf skull on the Grove moss shrine; distinct from the horned DJ guardian",
  );
  const { scene, group, ball, tube, cone, eye, satin } = a;
  // A small moss cushion supports the skull's jaw. No prop horns or ears are invented.
  for (let i = 0; i < 9; i++) {
    const ang = i * 2.399,
      r = 0.08 + (0.12 * (i % 3)) / 2;
    ball(
      scene,
      [Math.cos(ang) * r, 0.022, Math.sin(ang) * r - 0.02],
      [0.102, 0.023, 0.11],
      i % 2 ? "#69744a" : "#596646",
      satin,
      10,
    );
  }
  const head = group("WolfSkull", scene, [0, 0.15, -0.045], true);
  ball(head, [0, 0.119, -0.118], [0.179, 0.154, 0.18], "#e9d9b7");
  ball(head, [0, 0.091, 0.096], [0.114, 0.102, 0.244], "#e6d4ad");
  // Long nasal ridge, large side sockets and cheek arches preserve the reference silhouette.
  tube(
    head,
    [
      [0, 0.245, -0.12],
      [0, 0.196, 0.04],
      [0, 0.151, 0.25],
    ],
    0.014,
    "#f0e1c3",
    satin,
    16,
  );
  const eyes = [-1, 1].map((s) => {
    ball(head, [s * 0.123, 0.118, 0.024], [0.071, 0.088, 0.074], "#5b5142");
    ball(head, [s * 0.121, 0.12, 0.054], [0.054, 0.067, 0.047], "#3d3a32");
    const e = eye(
      head,
      "SkullSpiritEye" + s,
      [s * 0.128, 0.125, 0.094],
      [0.018, 0.022, 0.01],
      "#c4ae73",
    );
    tube(
      head,
      [
        [s * 0.085, 0.196, -0.002],
        [s * 0.169, 0.182, -0.012],
        [s * 0.218, 0.082, 0.001],
        [s * 0.15, 0.014, 0.122],
        [s * 0.1, 0.036, 0.18],
      ],
      0.025,
      "#e4d0a9",
      satin,
      18,
      8,
    );
    for (let i = 0; i < 5; i++)
      cone(
        head,
        [s * (0.081 - i * 0.006), -0.001, 0.12 + i * 0.037],
        0.014 - i * 0.001,
        0.042 - i * 0.003,
        "#f5e5c5",
        [Math.PI, 0, s * -0.05],
      );
    cone(head, [s * 0.082, -0.001, 0.103], 0.019, 0.073, "#f3e1ba", [
      Math.PI,
      0,
      s * -0.05,
    ]);
    return e;
  });
  // Dark nasal opening sits within an ivory bridge, rather than a black button nose.
  ball(head, [0, 0.091, 0.317], [0.057, 0.067, 0.02], "#534b3d");
  tube(
    head,
    [
      [-0.065, 0.049, 0.309],
      [-0.05, 0.134, 0.319],
      [0, 0.164, 0.305],
      [0.05, 0.134, 0.319],
      [0.065, 0.049, 0.309],
    ],
    0.016,
    "#e5d1a9",
    satin,
    16,
    8,
  );
  for (const s of [-1, 1])
    for (let i = 0; i < 3; i++)
      cone(
        head,
        [s * (0.017 + i * 0.019), 0.006, 0.324 - i * 0.004],
        0.011,
        0.032,
        "#f7e8c9",
        [Math.PI, 0, 0],
      );
  const jaw = group("WolfHingedJaw", head, [0, -0.025, -0.057], true);
  for (const s of [-1, 1]) {
    tube(
      jaw,
      [
        [s * 0.141, 0.043, -0.04],
        [s * 0.118, -0.031, 0.074],
        [s * 0.07, -0.044, 0.288],
        [s * 0.045, -0.035, 0.374],
      ],
      0.025,
      "#d8c39d",
      satin,
      18,
      8,
    );
    for (let i = 0; i < 5; i++)
      cone(
        jaw,
        [s * (0.082 - i * 0.007), -0.008, 0.17 + i * 0.034],
        0.011,
        0.029,
        "#f4e4c2",
      );
  }
  tube(
    jaw,
    [
      [-0.05, -0.035, 0.375],
      [0, -0.039, 0.39],
      [0.05, -0.035, 0.375],
    ],
    0.023,
    "#dac59d",
    satin,
    10,
    8,
  );
  const leaf = a.leaf(
    scene,
    "AutumnVisitor",
    [-0.22, 0.044, 0.19],
    "#bd823c",
    0.55,
    true,
  );
  leaf.rotation.set(-Math.PI / 2 + 0.1, 0, -0.6);
  return a.finish((clip, t, d) => {
    if (clip === "Idle" || clip === "Greet") {
      head.rotation.z = 0.021 * Math.sin((t * TAU) / d);
      a.blink(eyes, t, [1.25]);
    }
    if (clip === "Awaken") {
      head.rotation.x = -0.05 * beat(t, 0, 0.28, 0.9);
      a.blink(eyes, t, [0.18]);
    }
    if (clip === "Play") {
      const notice = beat(t, 0.02, 0.45, 1.45),
        chatter = beat(t, 0.5, 0.75, 1.4),
        nuzzle = beat(t, 1.3, 2.0, 3);
      head.rotation.y = -0.16 * notice;
      head.rotation.z = 0.08 * notice - 0.06 * nuzzle;
      jaw.rotation.x = (0.035 + 0.075 * Math.sin(t * 24) ** 2) * chatter;
      head.rotation.x = 0.055 * nuzzle;
      leaf.position.x += 0.17 * nuzzle;
      leaf.position.z += 0.1 * nuzzle;
      leaf.position.y += 0.07 * Math.sin(Math.PI * nuzzle);
      leaf.rotation.z += 0.45 * nuzzle;
      leaf.rotation.y = 0.25 * Math.sin(t * 8) * nuzzle;
      a.blink(eyes, t, [2.45]);
    }
    if (clip === "Settle") {
      head.rotation.z = -0.065 * beat(t, 0, 0.44, 1);
      a.blink(eyes, t, [0.52]);
    }
  });
}

await moon();
await keeper();
await seed();
await skull();
