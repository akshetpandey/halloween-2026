import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { inspectSpiritGLB } from "../src/client/spirit-asset";
import { rootStory } from "../src/client/gilded-root-motion";
import { hostSpiritCharacter } from "../src/client/spirit-character";
const file = readFileSync(
  new URL("../src/client/assets/gilded-root/GildedRoot.glb", import.meta.url),
);
const bytes = file.buffer.slice(
  file.byteOffset,
  file.byteOffset + file.byteLength,
) as ArrayBuffer;
const provenance = JSON.parse(
  readFileSync(
    new URL(
      "../src/client/assets/gilded-root/provenance.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
it("ships a bounded authored lamp with no photograph textures or external geometry", () => {
  expect(file.length).toBeLessThan(1_000_000);
  expect(createHash("sha256").update(file).digest("hex")).toBe(
    provenance.sha256,
  );
  expect(provenance).toMatchObject({
    sourceScanGeometry: false,
    sourcePhotoTextures: false,
    texturePixels: 0,
    spineBones: 4,
  });
  expect(inspectSpiritGLB(bytes)).toEqual({
    triangles: provenance.triangles,
    clips: 6,
  });
  const json = JSON.parse(
    new TextDecoder().decode(
      new Uint8Array(bytes, 20, new DataView(bytes).getUint32(12, true)),
    ),
  );
  expect(json.images ?? []).toHaveLength(0);
  expect(json.textures ?? []).toHaveLength(0);
  expect(json.buffers.every((b: { uri?: string }) => !b.uri)).toBe(true);
});
it("keeps every root planted, trunk weights valid and eye blinks/idle loops real", async () => {
  const { scene, animations } = await new GLTFLoader().parseAsync(bytes, "");
  const mixer = new T.AnimationMixer(scene);
  const trunk = scene.getObjectByName("GildedTrunk") as T.SkinnedMesh;
  const weights = trunk.geometry.attributes.skinWeight;
  for (let i = 0; i < weights.count; i++)
    expect(
      [0, 1, 2, 3].reduce((sum, c) => sum + weights.getComponent(i, c), 0),
    ).toBeCloseTo(1, 6);
  expect(trunk.skeleton.bones).toHaveLength(4);
  const rootPositions = Array.from({ length: 5 }, (_, i) =>
    scene.getObjectByName("RootToe" + i)!.position.clone(),
  );
  expect(animations.map((c) => c.name)).toEqual([
    "Idle",
    "Wake",
    "ChaseLeaf",
    "Catch",
    "Bow",
    "Greet",
  ]);
  for (const clip of animations) {
    mixer.stopAllAction();
    mixer.clipAction(clip).play();
    for (let f = 0; f < 20; f++) {
      mixer.setTime((f / 20) * clip.duration);
      scene.updateMatrixWorld(true);
      rootPositions.forEach((p, i) =>
        expect(
          scene.getObjectByName("RootToe" + i)!.position.distanceTo(p),
        ).toBeLessThan(1e-7),
      );
      for (let v = 0; v < trunk.geometry.attributes.position.count; v += 13) {
        const point = new T.Vector3().fromBufferAttribute(
          trunk.geometry.attributes.position,
          v,
        );
        trunk.applyBoneTransform(v, point);
        expect(point.toArray().every(Number.isFinite)).toBe(true);
      }
    }
    if (["Idle", "Greet"].includes(clip.name))
      for (const track of clip.tracks) {
        const n = track.getValueSize();
        for (let i = 0; i < n; i++)
          expect(track.values[i]).toBeCloseTo(
            track.values[track.values.length - n + i],
            4,
          );
      }
  }
  const blink = animations[0].tracks.find((t) => t.name === "RootEyeL.scale")!;
  expect(
    Math.min(...Array.from(blink.values).filter((_, i) => i % 3 === 1)),
  ).toBeLessThan(0.2);
});
it("keeps the caught leaf at its branch tip through the bow and greeting", async () => {
  const { scene, animations } = await new GLTFLoader().parseAsync(bytes, "");
  const mixer = new T.AnimationMixer(scene);
  for (const name of ["Bow", "Greet"]) {
    mixer.stopAllAction();
    const clip = animations.find((c) => c.name === name)!;
    mixer.clipAction(clip).play();
    for (let i = 0; i < 40; i++) {
      mixer.setTime((i / 40) * clip.duration);
      scene.updateMatrixWorld(true);
      const target = scene
        .getObjectByName("LedgerBranch")!
        .localToWorld(new T.Vector3(-0.18, 0.065, 0.014));
      expect(
        scene
          .getObjectByName("LedgerLeaf")!
          .localToWorld(new T.Vector3(0, -0.065, 0.004))
          .distanceTo(target),
      ).toBeLessThan(0.001);
    }
  }
});
it("has its own rooted reveal and restricts the character registry to the two host prototypes", () => {
  expect([0, 2.5, 3.4, 5.2, 6.5, 8].map((t) => rootStory(t).beat)).toEqual([
    "emerge",
    "wake",
    "flutter",
    "catch",
    "bow",
    "greet",
  ]);
  for (let t = 0; t < 20; t += 0.1)
    expect(rootStory(t)).toMatchObject({
      running: false,
      yaw: 0,
      x: 0,
      y: 0,
      flight: 0,
    });
  expect(hostSpiritCharacter("tree")).toBe("tree");
  expect(hostSpiritCharacter("fox")).toBe("fox");
  expect(hostSpiritCharacter("owl")).toBeNull();
});
