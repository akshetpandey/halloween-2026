import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { inspectSpiritGLB, MAX_SPIRIT_BYTES } from "../src/client/spirit-asset";
function glb(scene: object) {
  const json = new TextEncoder().encode(JSON.stringify(scene));
  const padded = Math.ceil(json.length / 4) * 4,
    bytes = new ArrayBuffer(20 + padded);
  const view = new DataView(bytes);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, bytes.byteLength, true);
  view.setUint32(12, padded, true);
  view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(bytes, 20).fill(32);
  new Uint8Array(bytes, 20, json.length).set(json);
  return bytes;
}
const scene = {
  asset: { version: "2.0" },
  meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
  accessors: [{ count: 300 }],
};
it("accepts the actual lightweight rigged sample, including its embedded texture", () => {
  const file = readFileSync(
    new URL("../src/client/assets/fox-spirit/Fox.glb", import.meta.url),
  );
  expect(
    inspectSpiritGLB(
      file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
    ),
  ).toMatchObject({ clips: 3 });
});
it("rejects external resources, excessive geometry, unsupported compression and oversized files before rendering", () => {
  expect(() =>
    inspectSpiritGLB(
      glb({ ...scene, images: [{ uri: "https://example.com/texture.jpg" }] }),
    ),
  ).toThrow(/external/);
  expect(() =>
    inspectSpiritGLB(glb({ ...scene, accessors: [{ count: 300003 }] })),
  ).toThrow(/100,000/);
  expect(() =>
    inspectSpiritGLB(
      glb({ ...scene, extensionsUsed: ["KHR_draco_mesh_compression"] }),
    ),
  ).toThrow(/uncompressed/);
  expect(() => inspectSpiritGLB(new ArrayBuffer(MAX_SPIRIT_BYTES + 1))).toThrow(
    /12 MB/,
  );
});
it("rejects incomplete GLBs and point clouds, while allowing an unrigged mesh preview", () => {
  expect(() => inspectSpiritGLB(new ArrayBuffer(30))).toThrow(/binary glTF/);
  expect(() => inspectSpiritGLB(glb({ ...scene, meshes: [] }))).toThrow(
    /mesh model/,
  );
  expect(inspectSpiritGLB(glb(scene))).toEqual({ triangles: 100, clips: 0 });
});
