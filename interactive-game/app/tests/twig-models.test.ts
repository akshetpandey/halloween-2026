import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { inspectSpiritGLB } from "../src/client/spirit-asset";
const assets = [
  ["fork", "ForkSpirit", "KnockingTwig"],
  ["ember", "EmberSpirit", "LeftTasselStrand3"],
  ["knots", "KnotsSpirit", "CordBend"],
  ["host", "HostSpirit", "OfferingArmL"],
  ["door", "DoorSpirit", "OpeningGate"],
];
const durations = [2.4, 0.9, 3, 1, 2.4];
for (const [art, name, joint] of assets) {
  const file = readFileSync(
    new URL(`../src/client/assets/${art}/${name}.glb`, import.meta.url),
  );
  const data = file.buffer.slice(
    file.byteOffset,
    file.byteOffset + file.byteLength,
  ) as ArrayBuffer;
  const provenance = JSON.parse(
    readFileSync(
      new URL(`../src/client/assets/${art}/provenance.json`, import.meta.url),
      "utf8",
    ),
  );
  it(`${art} exports a small self-contained original craft with verified provenance`, () => {
    expect(file.length).toBeLessThan(1_000_000);
    expect(provenance.bytes).toBe(file.length);
    expect(provenance.triangles).toBeLessThan(15000);
    expect(provenance.primitives).toBeLessThan(45);
    expect(createHash("sha256").update(file).digest("hex")).toBe(
      provenance.sha256,
    );
    expect(provenance).toMatchObject({
      sourceScanGeometry: false,
      sourcePhotoTextures: false,
      images: 0,
      texturePixels: 0,
      axes: { up: "+Y", front: "+Z" },
    });
    expect(inspectSpiritGLB(data)).toEqual({
      triangles: provenance.triangles,
      clips: 5,
    });
    const json = JSON.parse(
      new TextDecoder().decode(
        new Uint8Array(data, 20, new DataView(data).getUint32(12, true)),
      ),
    );
    expect(json.buffers.every((b: { uri?: string }) => !b.uri)).toBe(true);
    expect(json.images ?? []).toHaveLength(0);
    expect(json.textures ?? []).toHaveLength(0);
    expect(json.extensionsRequired ?? []).toHaveLength(0);
  });
  it(`${art} closes loops, joins the complete story and articulates its own craft joint`, async () => {
    const { scene, animations } = await new GLTFLoader().parseAsync(data, "");
    expect(animations.map((c) => c.name)).toEqual([
      "Idle",
      "Awaken",
      "Play",
      "Settle",
      "Greet",
    ]);
    animations.forEach((c, i) =>
      expect(c.duration).toBeCloseTo(durations[i], 5),
    );
    for (const clip of animations) {
      for (const track of clip.tracks) {
        expect(Array.from(track.values).every(Number.isFinite)).toBe(true);
        if (["Idle", "Greet"].includes(clip.name)) {
          const n = track.getValueSize();
          for (let i = 0; i < n; i++)
            expect(track.values[i]).toBeCloseTo(
              track.values[track.values.length - n + i],
              5,
            );
        }
      }
    }
    for (let i = 0; i < animations.length - 1; i++) {
      const a = animations[i],
        b = animations[i + 1];
      for (const track of a.tracks) {
        const target = b.tracks.find((t) => t.name === track.name)!;
        const n = track.getValueSize();
        for (let k = 0; k < n; k++)
          expect(track.values[track.values.length - n + k]).toBeCloseTo(
            target.values[k],
            5,
          );
      }
    }
    const play = animations.find((c) => c.name === "Play")!,
      moving = play.tracks.find((t) => t.name === joint + ".quaternion")!;
    expect(moving).toBeDefined();
    expect(
      Math.max(
        ...Array.from(moving.values)
          .filter((_, i) => i % 4 !== 3)
          .map(Math.abs),
      ),
    ).toBeGreaterThan(0.04);
    const blink = animations[4].tracks.find((t) => t.name === "EyeL.scale")!;
    expect(
      Math.min(...Array.from(blink.values).filter((_, i) => i % 3 === 1)),
    ).toBeLessThan(0.3);
    // Weld by position for topology only: material normals retain deliberate seams.
    scene.traverse((object) => {
      if (!(object instanceof T.Mesh)) return;
      const geometry = object.geometry,
        position = geometry.attributes.position;
      const points = new Map<string, number>(),
        welded: number[] = [];
      for (let i = 0; i < position.count; i++) {
        const key = [position.getX(i), position.getY(i), position.getZ(i)]
          .map((value) => Math.round(value * 1e5))
          .join(",");
        if (!points.has(key)) points.set(key, points.size);
        welded.push(points.get(key)!);
      }
      const edges = new Map<string, number>();
      const indices = geometry.index?.array ?? welded.map((_, i) => i);
      for (let i = 0; i < indices.length; i += 3) {
        const triangle = [
          welded[indices[i]],
          welded[indices[i + 1]],
          welded[indices[i + 2]],
        ];
        for (let j = 0; j < 3; j++) {
          const a = triangle[j],
            b = triangle[(j + 1) % 3];
          if (a === b) continue;
          const key = a < b ? `${a},${b}` : `${b},${a}`;
          edges.set(key, (edges.get(key) ?? 0) + 1);
        }
      }
      expect(
        [...edges.values()].filter((count) => count === 1),
        object.name,
      ).toHaveLength(0);
    });
    const mixer = new T.AnimationMixer(scene);
    if (art === "host" || art === "fork") {
      const action = mixer.clipAction(play);
      action.setLoop(T.LoopOnce, 1).play();
      mixer.setTime(art === "host" ? 1.85 : 0.76);
      scene.updateMatrixWorld(true);
      const target =
        art === "host"
          ? new T.Vector3(-0.38, 0.015, 0.006)
          : new T.Vector3(0.58, 0.34, 0.008);
      scene.getObjectByName(joint)!.localToWorld(target);
      expect(target.z).toBeGreaterThan(art === "host" ? 0.18 : 0.05);
    }
    for (const clip of animations) {
      mixer.stopAllAction();
      const action = mixer.clipAction(clip);
      action.setLoop(T.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();
      for (let i = 0; i <= 30; i++) {
        mixer.setTime((clip.duration * i) / 30);
        scene.updateMatrixWorld(true);
        const bounds = new T.Box3().setFromObject(scene),
          size = bounds.getSize(new T.Vector3());
        expect([...bounds.min, ...bounds.max].every(Number.isFinite)).toBe(
          true,
        );
        expect(Math.max(...size)).toBeLessThan(2.1);
        expect(
          scene.getObjectByName("KnotFace")!.getWorldPosition(new T.Vector3())
            .z,
        ).toBeGreaterThan(-0.15);
      }
    }
  });
}
