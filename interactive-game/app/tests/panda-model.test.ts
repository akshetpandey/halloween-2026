import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { pandaClip } from "../src/client/panda-model";
import { inspectSpiritGLB } from "../src/client/spirit-asset";
const file = readFileSync(
  new URL("../src/client/assets/red-panda/RedPanda.glb", import.meta.url),
);
const bytes = file.buffer.slice(
  file.byteOffset,
  file.byteOffset + file.byteLength,
) as ArrayBuffer;
const manifest = JSON.parse(
  readFileSync(
    new URL("../src/client/assets/red-panda/provenance.json", import.meta.url),
    "utf8",
  ),
);
const json = JSON.parse(
  new TextDecoder().decode(
    new Uint8Array(bytes, 20, new DataView(bytes).getUint32(12, true)),
  ),
);

it("ships the authored mobile character without scan geometry or photo texture allocations", () => {
  expect(file.length).toBeLessThan(1_100_000);
  expect(createHash("sha256").update(file).digest("hex")).toBe(manifest.sha256);
  expect(manifest).toMatchObject({
    sourceScanGeometry: false,
    sourcePhotoTextures: false,
    texturePixels: 0,
    tailBones: 5,
  });
  expect(json.images ?? []).toHaveLength(0);
  expect(json.textures ?? []).toHaveLength(0);
  expect(inspectSpiritGLB(bytes)).toEqual({
    triangles: manifest.triangles,
    clips: 7,
  });
});

it("keeps the tail connected and watertight across stripe boundaries with normalized skin weights", async () => {
  const gltf = await new GLTFLoader().parseAsync(bytes, "");
  const scene = clone(gltf.scene);
  const tail = scene.getObjectByName("PandaTail") as THREE.SkinnedMesh;
  expect(tail.isSkinnedMesh).toBe(true);
  expect(tail.skeleton.bones).toHaveLength(5);
  const geometry = tail.geometry,
    positions = geometry.attributes.position;
  const indices = geometry.index!,
    weights = geometry.attributes.skinWeight,
    joints = geometry.attributes.skinIndex;
  const vertices = new Map<string, number>(),
    welded: number[] = [];
  for (let v = 0; v < positions.count; v++) {
    const key = [positions.getX(v), positions.getY(v), positions.getZ(v)]
      .map((n) => Math.round(n * 1e7))
      .join(",");
    if (!vertices.has(key)) vertices.set(key, vertices.size);
    welded.push(vertices.get(key)!);
    let sum = 0;
    for (let c = 0; c < 4; c++) {
      sum += weights.getComponent(v, c);
      expect(joints.getComponent(v, c)).toBeLessThan(5);
    }
    expect(sum).toBeCloseTo(1, 5);
  }
  const edges = new Map<string, number>(),
    neighbors = new Map<number, Set<number>>();
  for (let i = 0; i < indices.count; i += 3) {
    const points = [0, 1, 2].map((c) =>
      new THREE.Vector3().fromBufferAttribute(positions, indices.getX(i + c)),
    );
    const normal = new THREE.Vector3().fromBufferAttribute(
      geometry.attributes.normal,
      indices.getX(i),
    );
    expect(
      points[1].sub(points[0]).cross(points[2].sub(points[0])).dot(normal),
    ).toBeGreaterThan(0);
    const triangle = [0, 1, 2].map((c) => welded[indices.getX(i + c)]);
    expect(new Set(triangle).size).toBe(3);
    for (let j = 0; j < 3; j++) {
      const a = triangle[j],
        b = triangle[(j + 1) % 3],
        key = [Math.min(a, b), Math.max(a, b)].join(":");
      edges.set(key, (edges.get(key) ?? 0) + 1);
      if (!neighbors.has(a)) neighbors.set(a, new Set());
      neighbors.get(a)!.add(b);
      if (!neighbors.has(b)) neighbors.set(b, new Set());
      neighbors.get(b)!.add(a);
    }
  }
  // Painted seams duplicate vertices, but every physical edge still has two faces.
  expect([...edges.values()].every((count) => count === 2)).toBe(true);
  const visited = new Set<number>(),
    queue = [0];
  while (queue.length) {
    const v = queue.pop()!;
    if (visited.has(v)) continue;
    visited.add(v);
    queue.push(...neighbors.get(v)!);
  }
  expect(visited.size).toBe(vertices.size);
  const mixer = new THREE.AnimationMixer(scene),
    point = new THREE.Vector3();
  for (const clip of gltf.animations) {
    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    action.play();
    for (const time of [0, clip.duration * 0.25, clip.duration * 0.75]) {
      mixer.setTime(time);
      scene.updateMatrixWorld(true);
      const seams = new Map<number, THREE.Vector3>();
      for (let v = 0; v < positions.count; v++) {
        point.fromBufferAttribute(positions, v);
        tail.applyBoneTransform(v, point);
        expect(point.toArray().every(Number.isFinite)).toBe(true);
        const old = seams.get(welded[v]);
        if (old) expect(point.distanceTo(old)).toBeLessThan(1e-6);
        else seams.set(welded[v], point.clone());
      }
    }
  }
});

it("has real blinks, valid named choreography, and seamless idle/run loops", async () => {
  const { scene, animations } = await new GLTFLoader().parseAsync(bytes, "");
  expect(animations.map((c) => c.name)).toEqual([
    "Survey",
    "Anticipate",
    "Run",
    "Pounce",
    "Settle",
    "Curious",
    "Greet",
  ]);
  expect(scene.getObjectByName("PandaHead")).toBeDefined();
  for (const clip of animations) {
    for (const track of clip.tracks) {
      expect(Array.from(track.values).every(Number.isFinite)).toBe(true);
      expect(scene.getObjectByName(track.name.split(".")[0])).toBeDefined();
      if (["Survey", "Run", "Greet"].includes(clip.name)) {
        const size = track.getValueSize(),
          values = track.values;
        for (let i = 0; i < size; i++)
          expect(values[i]).toBeCloseTo(values[values.length - size + i], 5);
      }
    }
  }
  const eye = animations[0].tracks.find((t) => t.name === "PandaEyeL.scale")!;
  expect(
    Math.min(...Array.from(eye.values).filter((_, i) => i % 3 === 1)),
  ).toBeLessThan(0.2);
});

it("plants the forepaws as the rump lowers, then holds a curious viewer-facing sit", async () => {
  const { scene, animations } = await new GLTFLoader().parseAsync(bytes, "");
  const mixer = new THREE.AnimationMixer(scene),
    body = scene.getObjectByName("PandaBody")!,
    head = scene.getObjectByName("PandaHead")!;
  for (const name of ["Settle", "Curious", "Greet"]) {
    mixer.stopAllAction();
    const clip = animations.find((c) => c.name === name)!;
    mixer.clipAction(clip).play();
    for (const t of [0.1, 0.5, 0.9]) {
      mixer.setTime(t);
      scene.updateMatrixWorld(true);
      for (const side of ["L", "R"]) {
        // Greet raises one paw deliberately; the other remains the weight-bearing anchor.
        if (name === "Greet" && side === "L") continue;
        const foot = scene.getObjectByName(`PandaFore${side}Foot`)!;
        expect(foot.getWorldPosition(new THREE.Vector3()).y).toBeCloseTo(
          0.0135,
          3,
        );
        expect(
          new THREE.Euler().setFromQuaternion(
            foot.getWorldQuaternion(new THREE.Quaternion()),
          ).x,
        ).toBeCloseTo(0, 3);
      }
    }
    if (name !== "Settle") {
      expect(body.position.y).toBeLessThan(0.082);
      expect(body.rotation.x).toBeLessThan(-0.45);
      expect(head.rotation.z).toBeLessThan(-0.2);
    }
  }
});

it("keeps previous four-clip panda imports seated during the new curious beat", () => {
  const previous = new Set(["Survey", "Run", "Settle", "Greet"]);
  expect(pandaClip("curious", previous)).toBe("Greet");
  expect(pandaClip("pounce", previous)).toBe("Run");
  expect(pandaClip("notice", previous)).toBe("Survey");
  expect(pandaClip("curious", new Set([...previous, "Curious"]))).toBe(
    "Curious",
  );
});
