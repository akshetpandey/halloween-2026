// Reproducible first-party model delivery. Weights are ignored, not committed.
import { mkdir, readFile, writeFile, copyFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
const source = await readFile(
  new URL("../src/shared/vision.ts", import.meta.url),
  "utf8",
);
const path = source.match(/VISION_ASSETS = "([^"]+)"/)[1];
const target = new URL("../public" + path, import.meta.url);
await mkdir(target, { recursive: true });
const dino =
  "https://huggingface.co/onnx-community/dinov3-vits16-pretrain-lvd1689m-ONNX/resolve/48988dfe73065df8d6f5ccc0edc7c8bcf307de41/onnx/";
const sam =
  "https://huggingface.co/Xenova/slimsam-77-uniform/resolve/5850ab45f587c112167512ffef949107115e26a0/onnx/";
const files = [
  ["dino.onnx", dino + "model_quantized.onnx", 183889],
  ["model_quantized.onnx_data", dino + "model_quantized.onnx_data", 21762048],
  ["sam-encoder.onnx", sam + "vision_encoder_quantized.onnx", 8882165],
  [
    "sam-decoder.onnx",
    sam + "prompt_encoder_mask_decoder_quantized.onnx",
    4903810,
  ],
  [
    "DINO-LICENSE.txt",
    "https://raw.githubusercontent.com/facebookresearch/dinov3/main/LICENSE.md",
    null,
  ],
  [
    "SAM-LICENSE.txt",
    "https://raw.githubusercontent.com/czg1225/SlimSAM/master/LICENSE",
    null,
  ],
  [
    "ONNX-LICENSE.txt",
    "https://raw.githubusercontent.com/microsoft/onnxruntime/v1.30.0/LICENSE",
    null,
  ],
];
const checksums = {
  "dino.onnx":
    "7686e8c849202c4fdd67d1cd336449c29bdddbcca535d765d3014f50d04d516d",
  "model_quantized.onnx_data":
    "51572f7fc3c272eb574a70509ea1eeb7e674e5ca2cd96fec1632edb38983d529",
  "sam-encoder.onnx":
    "cce23c7b2e5d4f330932738fb67ba518e04b0d99ccdd1cccd22a7da4e01f2971",
  "sam-decoder.onnx":
    "cb90b279f549d2cab7fd6e20c38522438c65d84bdcca3d2a764cff7d857fdce2",
  "DINO-LICENSE.txt":
    "25d122eb8f5b880fd23c736fb6ea8018ee45c12237e00b8a86d14c653904999e",
  "SAM-LICENSE.txt":
    "c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4",
  "ONNX-LICENSE.txt":
    "2f07c72751aed99790b8a4869cf2311df85a860b22ded05fa22803587a48922c",
};
const manifest = [];
for (const [name, url, size] of files) {
  const dest = new URL(name, target);
  let bytes;
  try {
    bytes = await readFile(dest);
    if (size && bytes.length !== size) bytes = null;
  } catch {}
  if (!bytes) {
    const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
    if (size && bytes.length !== size)
      throw new Error(`${name}: unexpected model size`);
    await writeFile(dest, bytes);
  }
  if (createHash("sha256").update(bytes).digest("hex") !== checksums[name])
    throw new Error(
      `${name}: SHA-256 mismatch; review the pinned source before updating it`,
    );
  if (bytes.length > 25 * 1024 * 1024)
    throw new Error(`${name} exceeds the Workers Static Asset limit`);
  manifest.push({
    name,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    source: url,
  });
  console.log(`${name}: ${(bytes.length / 1e6).toFixed(2)} MB`);
}
const runtimeRoot = new URL(
  "../node_modules/onnxruntime-web/",
  import.meta.url,
);
const runtime = JSON.parse(
  await readFile(new URL("package.json", runtimeRoot), "utf8"),
);
if (runtime.version !== "1.30.0")
  throw new Error("Re-version the vision assets before changing ONNX Runtime");
for (const name of [
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.asyncify.mjs",
]) {
  const from = new URL("dist/" + name, runtimeRoot),
    to = new URL(name, target);
  if ((await stat(from)).size > 25 * 1024 * 1024)
    throw new Error("Runtime exceeds asset size limit");
  await copyFile(from, to);
  const bytes = await readFile(to);
  manifest.push({
    name,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    source: "onnxruntime-web@1.30.0",
  });
}
// WebGPU's runtime exceeds 25 MiB. The Worker streams these two immutable
// pieces as one WASM response; no large buffer is allocated on the server.
const gpu = await readFile(
  new URL("dist/ort-wasm-simd-threaded.asyncify.wasm", runtimeRoot),
);
for (let i = 0; i < 2; i++) {
  const name = "ort-wasm-simd-threaded.asyncify.wasm." + i;
  const bytes = gpu.subarray(
    i * 16 * 1024 * 1024,
    i === 0 ? 16 * 1024 * 1024 : gpu.length,
  );
  await writeFile(new URL(name, target), bytes);
  manifest.push({
    name,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    source: "onnxruntime-web@1.30.0",
  });
}
await writeFile(
  new URL("manifest.json", target),
  JSON.stringify({ runtime: runtime.version, files: manifest }, null, 2) + "\n",
);
await writeFile(
  new URL("NOTICE.txt", target),
  "Hollow Court vision prototype\nDINOv3 by Meta: DINOv3 license, see DINO-LICENSE.txt\nSlimSAM by Zigeng Chen et al.; ONNX export by Xenova: Apache-2.0, see SAM-LICENSE.txt\nONNX Runtime by Microsoft: MIT, see ONNX-LICENSE.txt\nSource URLs, versions and checksums are in manifest.json.\n",
);
console.log("Prepared pinned vision models and runtime at public" + path);
