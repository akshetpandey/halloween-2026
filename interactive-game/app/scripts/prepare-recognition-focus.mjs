// Offline helper: input manifest/photos, exported descriptor records and SQL are
// PRIVATE. This reads no remote resources and never uploads a photograph.
import * as ort from "onnxruntime-web";
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import {
  focusSignature,
  FOCUS_MODEL,
} from "../src/shared/recognition-focus.ts";
const [source, destination] = process.argv.slice(2);
if (!source || !destination)
  throw Error(
    "Usage: node scripts/prepare-recognition-focus.mjs <private input.json> <private output.json>",
  );
const input = JSON.parse(await readFile(source, "utf8"));
ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = new URL(
  "../node_modules/onnxruntime-web/dist/",
  import.meta.url,
).pathname;
const graph = await readFile(
  new URL(
    "../public/models/hc-lens-regions-b1a19675-v1/regions.onnx",
    import.meta.url,
  ),
);
const session = await ort.InferenceSession.create(graph, {
  executionProviders: ["wasm"],
});
const profiles = [];
for (const row of input) {
  const path = resolve(dirname(source), row.file),
    meta = await sharp(path).metadata(),
    rgb = await sharp(path)
      .resize(224, 224, { fit: "contain", background: "#808080" })
      .removeAlpha()
      .raw()
      .toBuffer();
  const values = new Float32Array(3 * 224 * 224);
  for (let i = 0; i < 224 * 224; i++)
    for (let c = 0; c < 3; c++)
      values[c * 224 * 224 + i] =
        (rgb[i * 3 + c] / 255 - [0.485, 0.456, 0.406][c]) /
        [0.229, 0.224, 0.225][c];
  const tensor = new ort.Tensor("float32", values, [1, 3, 224, 224]);
  const out = await session.run({ pixel_values: tensor });
  const raw = Object.values(out)[0].data,
    data = new Float32Array(49 * 576);
  for (let p = 0; p < 49; p++) {
    let sum = 0;
    for (let c = 0; c < 576; c++) {
      const n = Number(raw[c * 49 + p]);
      data[p * 576 + c] = n;
      sum += n * n;
    }
    sum = Math.sqrt(sum) || 1;
    for (let c = 0; c < 576; c++) data[p * 576 + c] /= sum;
  }
  const polygon = row.polygon.map((p) => ({
    x: p[0] / meta.width,
    y: p[1] / meta.height,
  }));
  profiles.push({
    referenceId: row.referenceId,
    guardianId: row.guardianId,
    ...focusSignature(
      { model: FOCUS_MODEL, data, width: meta.width, height: meta.height },
      polygon,
    ),
  });
  tensor.dispose();
  Object.values(out).forEach((t) => t.dispose());
}
await session.release();
await writeFile(destination, JSON.stringify(profiles, null, 2) + "\n");
console.log(
  `Prepared ${profiles.length} private foreground profiles; no uploads.`,
);
