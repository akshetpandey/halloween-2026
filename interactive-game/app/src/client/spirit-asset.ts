export type SpiritAsset = {
  url: string;
  name: string;
  front?: number;
  bytes?: ArrayBuffer;
};
export const MAX_SPIRIT_BYTES = 12 * 1024 * 1024;
type GLBScene = {
  asset?: { version?: string };
  meshes?: {
    primitives?: {
      mode?: number;
      indices?: number;
      attributes?: { POSITION?: number };
    }[];
  }[];
  buffers?: { uri?: string }[];
  images?: { uri?: string; bufferView?: number; mimeType?: string }[];
  bufferViews?: { byteOffset?: number; byteLength: number }[];
  nodes?: unknown[];
  accessors?: { count: number }[];
  animations?: unknown[];
  extensionsUsed?: string[];
};
// Local host preview only. Keep all resources inside one bounded GLB; the
// loader must never fetch URLs supplied by an imported capture.
export function inspectSpiritGLB(bytes: ArrayBuffer) {
  if (bytes.byteLength > MAX_SPIRIT_BYTES || bytes.byteLength < 28)
    throw Error("Choose a GLB capture up to 12 MB.");
  const view = new DataView(bytes);
  if (
    view.getUint32(0, true) !== 0x46546c67 ||
    view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== bytes.byteLength ||
    view.getUint32(16, true) !== 0x4e4f534a
  )
    throw Error(
      "Choose a binary glTF 2.0 (.glb) model with embedded textures.",
    );
  const length = view.getUint32(12, true);
  if (length > 1024 * 1024 || 20 + length > bytes.byteLength)
    throw Error("This GLB has an invalid or oversized scene description.");
  let scene: GLBScene;
  try {
    scene = JSON.parse(
      new TextDecoder().decode(new Uint8Array(bytes, 20, length)),
    );
  } catch {
    throw Error("The GLB scene could not be read.");
  }
  if (scene.asset?.version !== "2.0" || !scene.meshes?.length)
    throw Error(
      "Export a mesh model, rather than a Gaussian splat or point cloud.",
    );
  if ([...(scene.buffers ?? []), ...(scene.images ?? [])].some((r) => r.uri))
    throw Error(
      "Embed all textures and geometry in the GLB; external files are not supported.",
    );
  const binStart = 20 + length + 8;
  let pixels = 0;
  for (const image of scene.images ?? []) {
    const b =
      image.bufferView === undefined
        ? undefined
        : scene.bufferViews?.[image.bufferView];
    if (!b || binStart + (b.byteOffset ?? 0) + b.byteLength > bytes.byteLength)
      throw Error("The capture has an invalid embedded texture.");
    const imageView = new DataView(
      bytes,
      binStart + (b.byteOffset ?? 0),
      b.byteLength,
    );
    let w = 0,
      h = 0;
    if (
      image.mimeType === "image/png" &&
      b.byteLength >= 24 &&
      imageView.getUint32(0) === 0x89504e47
    ) {
      w = imageView.getUint32(16);
      h = imageView.getUint32(20);
    } else if (
      image.mimeType === "image/jpeg" &&
      b.byteLength >= 4 &&
      imageView.getUint16(0) === 0xffd8
    ) {
      let offset = 2;
      while (offset + 4 < b.byteLength) {
        const marker = imageView.getUint16(offset),
          size = imageView.getUint16(offset + 2);
        if (
          [0xffc0, 0xffc1, 0xffc2].includes(marker) &&
          offset + 9 < b.byteLength
        ) {
          h = imageView.getUint16(offset + 5);
          w = imageView.getUint16(offset + 7);
          break;
        }
        if (size < 2) break;
        offset += size + 2;
      }
    }
    pixels += w * h;
    if (!w || !h || w > 2048 || h > 2048 || pixels > 8 * 1024 * 1024)
      throw Error(
        "Use embedded PNG/JPEG textures up to 2048px, with at most 8 megapixels in total.",
      );
  }
  const unsupported = [
    "KHR_draco_mesh_compression",
    "EXT_meshopt_compression",
    "KHR_texture_basisu",
  ];
  if ((scene.extensionsUsed ?? []).some((e) => unsupported.includes(e)))
    throw Error("Export an uncompressed GLB for this prototype.");
  const primitives = scene.meshes.flatMap((m) => m.primitives ?? []);
  let triangles = 0;
  for (const p of primitives) {
    if ((p.mode ?? 4) !== 4)
      throw Error("Export a triangle mesh for this preview.");
    const index = p.indices ?? p.attributes?.POSITION;
    const count =
      index === undefined ? undefined : scene.accessors?.[index]?.count;
    if (count === undefined || !Number.isSafeInteger(count) || count < 3)
      throw Error("The model has invalid geometry.");
    triangles += count / 3;
  }
  if (
    triangles > 100000 ||
    primitives.length > 128 ||
    (scene.nodes?.length ?? 0) > 1024 ||
    (scene.images?.length ?? 0) > 8
  )
    throw Error(
      "Simplify the capture to at most 100,000 triangles, 128 mesh parts and eight textures.",
    );
  return {
    triangles: Math.ceil(triangles),
    clips: scene.animations?.length ?? 0,
  };
}
