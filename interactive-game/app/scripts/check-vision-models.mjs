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
  let image = sharp(photo);
  if (!pad) {
    const meta = await image.metadata();
    const side = Math.floor(Math.min(meta.width, meta.height) * 0.875);
    image = image.extract({
      left: Math.floor((meta.width - side) / 2),
      top: Math.floor((meta.height - side) / 2),
      width: side,
      height: side,
    });
  }
  const data = await image
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
const recognizer = await ort.InferenceSession.create(
    await readFile(
      new URL(
        "../public/models/hc-lens-mbv3-b1a19675-f32-v2/mobilenet-features.onnx",
        import.meta.url,
      ),
    ),
    { executionProviders: ["wasm"] },
  ),
  small = await input(224, 224),
  start = performance.now();
const features = await recognizer.run({ pixel_values: small });
if (
  features["/flatten/Flatten_output_0"].data.length !== 1024 ||
  !Array.from(features["/flatten/Flatten_output_0"].data).every(Number.isFinite)
)
  throw Error("Invalid MobileNet features");
console.log(
  "MobileNet: finite 1024-value embedding, " +
    Math.round(performance.now() - start) +
    "ms inference",
);
small.dispose();
Object.values(features).forEach((t) => t.dispose());
const times = [];
const benchInput = await input(224, 224);
for (let i = 0; i < 20; i++) {
  const start = performance.now();
  const result = await recognizer.run({ pixel_values: benchInput });
  times.push(performance.now() - start);
  Object.values(result).forEach((t) => t.dispose());
}
times.sort((a, b) => a - b);
console.log(
  `MobileNet warmed CPU: median ${times[10].toFixed(1)}ms, p95 ${times[18].toFixed(1)}ms over 20 inferences (not a phone benchmark)`,
);
benchInput.dispose();
await recognizer.release();
const meta = await sharp(photo).metadata(),
  ratio = 1024 / Math.max(meta.width, meta.height),
  width = Math.round(meta.width * ratio),
  height = Math.round(meta.height * ratio);
const encoder = await model("sam-encoder.onnx"),
  decoder = await model("sam-decoder.onnx");
const labels = new ort.Tensor("int64", new BigInt64Array([1n]), [1, 1, 1]);
const warmInput = new ort.Tensor(
  "float32",
  new Float32Array(3 * 1024 * 1024),
  [1, 3, 1024, 1024],
);
const warmPoint = new ort.Tensor(
  "float32",
  new Float32Array([512, 512]),
  [1, 1, 1, 2],
);
const warmStart = performance.now();
const warmEmbeddings = await encoder.run({ pixel_values: warmInput });
const warmMasks = await decoder.run({
  ...warmEmbeddings,
  input_points: warmPoint,
  input_labels: labels,
});
console.log(
  `SlimSAM zero-input warm-up: ${Math.round(performance.now() - warmStart)}ms`,
);
warmInput.dispose();
warmPoint.dispose();
Object.values(warmMasks).forEach((t) => t.dispose());
Object.values(warmEmbeddings).forEach((t) => t.dispose());
for (let pass = 1; pass <= 2; pass++) {
  const large = await input(width, height, true);
  const points = new ort.Tensor(
    "float32",
    new Float32Array([width / 2, height / 2]),
    [1, 1, 1, 2],
  );
  const start = performance.now();
  const embeddings = await encoder.run({ pixel_values: large });
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
    `SlimSAM warmed photo ${pass}: ${Math.round(performance.now() - start)}ms, finite masks ${JSON.stringify(masks.pred_masks.dims)}; scores ${Array.from(
      masks.iou_scores.data,
    )
      .map((n) => n.toFixed(3))
      .join(", ")}`,
  );
  large.dispose();
  points.dispose();
  Object.values(masks).forEach((t) => t.dispose());
  Object.values(embeddings).forEach((t) => t.dispose());
}
labels.dispose();
await encoder.release();
await decoder.release();
console.log(
  "Model execution and retained-session reuse passed. These are Mac CPU timings; test actual phone performance separately.",
);
