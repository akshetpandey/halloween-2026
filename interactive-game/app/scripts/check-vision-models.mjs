// Optional local CPU inference smoke check. This is not an accuracy benchmark.
import * as ort from "onnxruntime-web";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const source = await readFile(
  new URL("../src/shared/vision.ts", import.meta.url),
  "utf8",
);
const folder = new URL(
  "../public" + source.match(/VISION_ASSETS = "([^"]+)"/)[1],
  import.meta.url,
);
ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = fileURLToPath(
  new URL("../node_modules/onnxruntime-web/dist/", import.meta.url),
);
const photo = process.argv[2];
if (!photo)
  throw Error("Usage: node scripts/check-vision-models.mjs <local test image>");
const mean = [0.485, 0.456, 0.406],
  std = [0.229, 0.224, 0.225];
async function input(width, height, pad = false) {
  const data = await sharp(photo)
    .resize(width, height, { fit: "fill" })
    .removeAlpha()
    .toColourspace("srgb")
    .raw()
    .toBuffer();
  const side = pad ? 1024 : width,
    fullHeight = pad ? 1024 : height,
    values = new Float32Array(3 * side * fullHeight);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      for (let c = 0; c < 3; c++)
        values[c * side * fullHeight + y * side + x] =
          (data[(y * width + x) * 3 + c] / 255 - mean[c]) / std[c];
  return new ort.Tensor("float32", values, [1, 3, fullHeight, side]);
}
async function model(name, external = false) {
  return ort.InferenceSession.create(await readFile(new URL(name, folder)), {
    executionProviders: ["wasm"],
    ...(external
      ? {
          externalData: [
            {
              path: "model_quantized.onnx_data",
              data: await readFile(
                new URL("model_quantized.onnx_data", folder),
              ),
            },
          ],
        }
      : {}),
  });
}
const dino = await model("dino.onnx", true),
  small = await input(224, 224),
  start = performance.now();
const features = await dino.run({ pixel_values: small });
if (
  features.pooler_output.data.length !== 384 ||
  !Array.from(features.pooler_output.data).every(Number.isFinite)
)
  throw Error("Invalid DINO features");
console.log(
  "DINO: finite 384-value embedding, " +
    Math.round(performance.now() - start) +
    "ms inference",
);
small.dispose();
Object.values(features).forEach((t) => t.dispose());
await dino.release();
const meta = await sharp(photo).metadata(),
  ratio = 1024 / Math.max(meta.width, meta.height),
  width = Math.round(meta.width * ratio),
  height = Math.round(meta.height * ratio);
const encoder = await model("sam-encoder.onnx"),
  large = await input(width, height, true),
  samStart = performance.now();
const embeddings = await encoder.run({ pixel_values: large });
large.dispose();
await encoder.release();
const decoder = await model("sam-decoder.onnx");
const points = new ort.Tensor(
    "float32",
    new Float32Array([width / 2, height / 2]),
    [1, 1, 1, 2],
  ),
  labels = new ort.Tensor("int64", new BigInt64Array([1n]), [1, 1, 1]);
const masks = await decoder.run({
  ...embeddings,
  input_points: points,
  input_labels: labels,
});
if (
  masks.pred_masks.dims.at(-1) !== 256 ||
  !Array.from(masks.iou_scores.data).every(Number.isFinite)
)
  throw Error("Invalid SAM output");
console.log(
  "SlimSAM: " +
    JSON.stringify(masks.pred_masks.dims) +
    ", scores " +
    Array.from(masks.iou_scores.data)
      .map((n) => n.toFixed(3))
      .join(", ") +
    ", " +
    Math.round(performance.now() - samStart) +
    "ms encode/decode",
);
points.dispose();
labels.dispose();
Object.values(embeddings).forEach((t) => t.dispose());
Object.values(masks).forEach((t) => t.dispose());
await decoder.release();
console.log(
  "Model execution passed. Test recognition accuracy and camera behavior on real phones separately.",
);
