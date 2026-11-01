import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { inspectSpiritGLB } from "../src/client/spirit-asset";

const models = [
  ["moon", "MoonThatStayed", "ListeningMoon"],
  ["guardian", "KeeperOfPulse", "KeeperMask"],
  ["seed", "LastSeed", "PumpkinBowl"],
  ["skull", "UnfinishedGuest", "WolfSkull"],
] as const;
const contract = [
  { name: "Idle", duration: 2.4 },
  { name: "Awaken", duration: 0.9 },
  { name: "Play", duration: 3 },
  { name: "Settle", duration: 1 },
  { name: "Greet", duration: 2.4 },
];
const load = (key: string, file: string) => {
  const bytes = readFileSync(
    new URL(`../src/client/assets/${key}/${file}.glb`, import.meta.url),
  );
  const data = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.length,
  ) as ArrayBuffer;
  const provenance = JSON.parse(
    readFileSync(
      new URL(`../src/client/assets/${key}/provenance.json`, import.meta.url),
      "utf8",
    ),
  );
  return { bytes, data, provenance };
};
const transforms = (scene: T.Object3D) => {
  const result = new Map<
    string,
    { p: T.Vector3; q: T.Quaternion; s: T.Vector3 }
  >();
  scene.traverse((o) => {
    if (o.name)
      result.set(o.name, {
        p: o.position.clone(),
        q: o.quaternion.clone(),
        s: o.scale.clone(),
      });
  });
  return result;
};
function pose(scene: T.Object3D, clip: T.AnimationClip, t: number) {
  const mixer = new T.AnimationMixer(scene),
    action = mixer.clipAction(clip);
  action.setLoop(T.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();
  mixer.setTime(t);
  scene.updateMatrixWorld(true);
  return mixer;
}

describe.each(models)("%s exported house spirit", (key, file, actor) => {
  it("has a verified checksum, five compatible clips and bounded self-contained geometry", async () => {
    const { bytes, data, provenance } = load(key, file);
    expect(bytes.length).toBeLessThan(1_000_000);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      provenance.sha256,
    );
    expect(provenance.triangles).toBeLessThan(18_000);
    expect(provenance.primitives).toBeLessThan(45);
    expect(provenance).toMatchObject({
      sourcePhotoTextures: false,
      sourceScanGeometry: false,
      externalServices: false,
      images: 0,
      texturePixels: 0,
    });
    expect(provenance.clips).toEqual(contract);
    expect(inspectSpiritGLB(data)).toEqual({
      triangles: provenance.triangles,
      clips: 5,
    });
    const json = JSON.parse(
      new TextDecoder().decode(
        new Uint8Array(data, 20, new DataView(data).getUint32(12, true)),
      ),
    );
    expect(json.images ?? []).toHaveLength(0);
    expect(json.textures ?? []).toHaveLength(0);
    expect(json.buffers.every((b: { uri?: string }) => !b.uri)).toBe(true);
    const { scene, animations } = await new GLTFLoader().parseAsync(data, "");
    expect(scene.getObjectByName(actor)).toBeTruthy();
    expect(animations.map((c) => c.name)).toEqual(contract.map((c) => c.name));
    animations.forEach((c, i) =>
      expect(c.duration).toBeCloseTo(contract[i].duration, 5),
    );
    let triangles = 0,
      primitives = 0;
    scene.traverse((o) => {
      if ((o as T.Mesh).isMesh) {
        const mesh = o as T.Mesh;
        primitives++;
        triangles +=
          (mesh.geometry.index?.count ??
            mesh.geometry.attributes.position.count) / 3;
        expect(mesh.geometry.attributes.color).toBeTruthy();
        for (const attribute of Object.values(mesh.geometry.attributes))
          expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
      }
    });
    expect({ triangles, primitives }).toEqual({
      triangles: provenance.triangles,
      primitives: provenance.primitives,
    });
  });

  it("closes both loops and joins every clip at the identical neutral pose", async () => {
    const { data } = load(key, file);
    for (const { name, duration } of contract) {
      const { scene, animations } = await new GLTFLoader().parseAsync(data, "");
      const neutral = transforms(scene),
        clip = animations.find((c) => c.name === name)!;
      expect(clip.tracks.length).toBeGreaterThan(0);
      for (const t of [0, duration]) {
        const mixer = pose(scene, clip, t);
        scene.traverse((o) => {
          const before = neutral.get(o.name);
          if (!before) return;
          expect(
            o.position.distanceTo(before.p),
            `${name} ${t}: ${o.name} position`,
          ).toBeLessThan(1e-6);
          expect(
            1 - Math.abs(o.quaternion.dot(before.q)),
            `${name} ${t}: ${o.name} facing`,
          ).toBeLessThan(1e-6);
          expect(
            o.scale.distanceTo(before.s),
            `${name} ${t}: ${o.name} scale`,
          ).toBeLessThan(1e-6);
        });
        mixer.stopAllAction();
        mixer.uncacheRoot(scene);
      }
    }
  });

  it("keeps stationary supports planted and animation finite and within stage bounds", async () => {
    const { data } = load(key, file);
    for (const { name, duration } of contract) {
      const { scene, animations } = await new GLTFLoader().parseAsync(data, "");
      scene.updateMatrixWorld(true);
      const supports = scene.children
        .filter((o) => (o as T.Mesh).isMesh)
        .map((o) => [o, o.matrixWorld.clone()] as const);
      const mixer = new T.AnimationMixer(scene),
        action = mixer.clipAction(animations.find((c) => c.name === name)!);
      action.setLoop(T.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();
      for (let frame = 0; frame <= 24; frame++) {
        mixer.setTime((duration * frame) / 24);
        scene.updateMatrixWorld(true);
        supports.forEach(([o, m]) =>
          expect(o.matrixWorld.elements).toEqual(m.elements),
        );
        const bounds = new T.Box3().setFromObject(scene),
          size = bounds.getSize(new T.Vector3());
        expect(
          [...bounds.min.toArray(), ...bounds.max.toArray()].every(
            Number.isFinite,
          ),
        ).toBe(true);
        expect(bounds.min.y).toBeGreaterThan(-0.025);
        expect(Math.max(...size.toArray())).toBeLessThan(1.5);
      }
    }
  });
});

it("gives each guardian an individual articulated performance with moving story props", async () => {
  const measurements = [
    ["moon", "MoonThatStayed", "ListeningMoon", "rotation", "y", 0.2],
    ["guardian", "KeeperOfPulse", "KeeperPlatter-1", "rotation", "y", 0.25],
    ["seed", "LastSeed", "OfferedChocolate", "position", "z", 0.1],
    ["seed", "LastSeed", "SpiderLeg-1_0", "rotation", "z", 0.3],
    ["skull", "UnfinishedGuest", "WolfHingedJaw", "rotation", "x", 0.06],
    ["skull", "UnfinishedGuest", "AutumnVisitor", "position", "x", 0.12],
  ] as const;
  for (const [key, file, node, prop, axis, minSpan] of measurements) {
    const { data } = load(key, file),
      { scene, animations } = await new GLTFLoader().parseAsync(data, "");
    const mixer = new T.AnimationMixer(scene),
      action = mixer.clipAction(animations.find((c) => c.name === "Play")!);
    action.setLoop(T.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    const values = [];
    for (let frame = 0; frame <= 90; frame++) {
      mixer.setTime(frame / 30);
      values.push(scene.getObjectByName(node)![prop][axis]);
    }
    expect(Math.max(...values) - Math.min(...values), node).toBeGreaterThan(
      minSpan,
    );
  }
});
