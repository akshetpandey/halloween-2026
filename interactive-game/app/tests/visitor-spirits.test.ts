import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { inspectSpiritGLB } from "../src/client/spirit-asset";

const visitors = [
  ["raven", "Raven.glb"],
  ["owl", "BarnOwl.glb"],
  ["stag", "GoldenStag.glb"],
  ["hare", "Hare.glb"],
] as const;
const phases = ["Idle", "Awaken", "Play", "Settle", "Greet"];
const lengths = [2.4, 0.9, 3, 1, 2.4];

for (const [art, name] of visitors)
  describe(art + " exported guardian", () => {
    const file = readFileSync(
      new URL(`../src/client/assets/${art}/${name}`, import.meta.url),
    );
    const bytes = file.buffer.slice(
      file.byteOffset,
      file.byteOffset + file.byteLength,
    ) as ArrayBuffer;
    const provenance = JSON.parse(
      readFileSync(
        new URL(`../src/client/assets/${art}/provenance.json`, import.meta.url),
        "utf8",
      ),
    );
    it("matches its bounded, self-contained and photo-free provenance", () => {
      const json = JSON.parse(
        new TextDecoder().decode(
          new Uint8Array(bytes, 20, new DataView(bytes).getUint32(12, true)),
        ),
      );
      expect(createHash("sha256").update(file).digest("hex")).toBe(
        provenance.sha256,
      );
      expect(file.length).toBe(provenance.bytes);
      expect(file.length).toBeLessThan(1_000_000);
      expect(provenance.triangles).toBeLessThan(18_000);
      expect(provenance.primitives).toBeLessThan(45);
      expect(provenance.sourcePhotoTextures).toBe(false);
      expect(provenance.sourceScanGeometry).toBe(false);
      expect(provenance.bounds.min[1]).toBeCloseTo(0, 5);
      expect(json.images ?? []).toHaveLength(0);
      expect(json.textures ?? []).toHaveLength(0);
      expect(json.buffers.every((b: { uri?: string }) => !b.uri)).toBe(true);
      expect(inspectSpiritGLB(bytes)).toEqual({
        triangles: provenance.triangles,
        clips: 5,
      });
    });
    it("loads actual GLB clips with closed loops and consecutive phase joins", async () => {
      const gltf = await new GLTFLoader().parseAsync(bytes, "");
      expect(gltf.animations.map((c) => c.name)).toEqual(phases);
      gltf.animations.forEach((c, i) =>
        expect(c.duration).toBeCloseTo(lengths[i], 5),
      );
      function endpoint(clip: T.AnimationClip, end: boolean) {
        return new Map(
          clip.tracks.map((track) => {
            const size = track.getValueSize(),
              start = end ? track.values.length - size : 0;
            return [
              track.name,
              Array.from(track.values.slice(start, start + size)),
            ];
          }),
        );
      }
      for (const clip of gltf.animations.filter((c) =>
        ["Idle", "Greet"].includes(c.name),
      )) {
        const first = endpoint(clip, false),
          last = endpoint(clip, true);
        for (const [name, values] of first)
          values.forEach((v, i) =>
            expect(v, clip.name + ":" + name).toBeCloseTo(
              last.get(name)![i],
              5,
            ),
          );
      }
      for (let i = 1; i < gltf.animations.length; i++) {
        const before = endpoint(gltf.animations[i - 1], true),
          after = endpoint(gltf.animations[i], false);
        for (const [name, values] of before)
          values.forEach((v, j) =>
            expect(v, gltf.animations[i].name + ":" + name).toBeCloseTo(
              after.get(name)![j],
              5,
            ),
          );
      }
    });
    it("has finite poses, articulated action, and readable real eye blinks", async () => {
      const { scene, animations } = await new GLTFLoader().parseAsync(
        bytes,
        "",
      );
      const mixer = new T.AnimationMixer(scene);
      for (const clip of animations) {
        mixer.stopAllAction();
        const action = mixer.clipAction(clip);
        action.setLoop(T.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.play();
        for (let i = 0; i <= 30; i++) {
          mixer.setTime((clip.duration * i) / 30);
          scene.updateMatrixWorld(true);
          scene.traverse((o) =>
            expect(o.matrixWorld.elements.every(Number.isFinite)).toBe(true),
          );
        }
      }
      const play = animations.find((c) => c.name === "Play")!;
      const moving = play.tracks.filter((track) => {
        const size = track.getValueSize();
        return Array.from(track.values).some(
          (v, i) => Math.abs(v - track.values[i % size]) > 0.05,
        );
      });
      expect(
        moving.filter((t) => t.name.endsWith(".quaternion")).length,
      ).toBeGreaterThanOrEqual(4);
      const eyeTracks = animations[0].tracks.filter((t) =>
        /Eye\d+\.scale/.test(t.name),
      );
      expect(eyeTracks).toHaveLength(2);
      for (const t of eyeTracks)
        expect(
          Math.min(...Array.from(t.values).filter((_, i) => i % 3 === 1)),
        ).toBeLessThan(0.2);
    });
  });

it("keeps the hare's stance paws on one floor through the spring and recovery", async () => {
  const file = readFileSync(
    new URL("../src/client/assets/hare/Hare.glb", import.meta.url),
  );
  const { scene, animations } = await new GLTFLoader().parseAsync(
    file.buffer.slice(
      file.byteOffset,
      file.byteOffset + file.byteLength,
    ) as ArrayBuffer,
    "",
  );
  const mixer = new T.AnimationMixer(scene);
  for (const clip of animations) {
    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    action.setLoop(T.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    for (let i = 0; i <= 90; i++) {
      const t = (clip.duration * i) / 90;
      mixer.setTime(t);
      scene.updateMatrixWorld(true);
      expect(new T.Box3().setFromObject(scene, true).min.y).toBeGreaterThan(
        -0.001,
      );
      for (const side of ["Left", "Right"])
        for (const part of ["ForePaw", "HindPaw"]) {
          const foot = scene.getObjectByName("Hare" + side + part)!;
          const point = foot.getWorldPosition(new T.Vector3());
          expect(point.y).toBeGreaterThanOrEqual(0.016);
          if (clip.name !== "Play" || t < 1.25 || t > 1.98)
            expect(point.y).toBeCloseTo(0.018, 3);
        }
    }
  }
});
