import type * as Ort from "onnxruntime-web";
import {
  normalizeVector,
  VISION_ASSETS,
  VISION_DIMENSIONS,
  RECOGNITION_ASSETS,
} from "../shared/vision";

export type VisionRequest = {
  id: number;
  kind: "prepare" | "prepare-segment" | "embed" | "segment" | "release-image";
  image: Blob | ImageBitmap;
  imageKey: string;
  point?: { x: number; y: number } | { x: number; y: number }[];
  backend?: "auto" | "wasm";
};
export type MaskResult = {
  mask: Uint8Array;
  width: number;
  height: number;
  area: number;
  quality: number;
  usable: boolean;
  ms: number;
};
export type VisionReply = {
  id: number;
  progress?: string;
  error?: string;
  vector?: number[];
  ms?: number;
  segmentation?: MaskResult;
  backend?: string;
  retryCPU?: boolean;
  ready?: boolean;
};
let ort: typeof Ort;
let embedder: Ort.InferenceSession | null = null;
const mean = [0.485, 0.456, 0.406],
  std = [0.229, 0.224, 0.225];
function progress(id: number, text: string) {
  self.postMessage({ id, progress: text } satisfies VisionReply);
}
function dispose(tensors: Record<string, Ort.Tensor>) {
  for (const t of Object.values(tensors)) t.dispose();
}
async function asset(
  name: string,
  id: number,
  label: string,
  base = VISION_ASSETS,
) {
  const response = await fetch(base + name, { cache: "force-cache" });
  if (
    !response.ok ||
    response.headers.get("Content-Type")?.includes("text/html")
  )
    throw Error("The vision models are unavailable. Reload and try again.");
  const reader = response.body!.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0,
    last = 0;
  const total = Number(response.headers.get("Content-Length"));
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
    if (size > 26 * 1024 * 1024) {
      await reader.cancel();
      throw Error("Unexpected vision model size.");
    }
    if (performance.now() - last > 400) {
      progress(
        id,
        `${label} · ${total ? Math.min(100, Math.round((size / total) * 100)) + "%" : (size / 1e6).toFixed(1) + " MB"}`,
      );
      last = performance.now();
    }
  }
  const bytes = new Uint8Array(size);
  let pos = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, pos);
    pos += chunk.length;
  }
  return bytes;
}
function pixels(image: ImageBitmap) {
  const width = 224,
    height = 224;
  const canvas = new OffscreenCanvas(width, height),
    ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  {
    const side = Math.min(image.width, image.height) * 0.875;
    ctx.drawImage(
      image,
      (image.width - side) / 2,
      (image.height - side) / 2,
      side,
      side,
      0,
      0,
      width,
      height,
    );
  }
  const rgba = ctx.getImageData(0, 0, width, height).data;
  const side = width,
    fullHeight = height;
  const values = new Float32Array(3 * side * fullHeight);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      for (let c = 0; c < 3; c++)
        values[c * side * fullHeight + y * side + x] =
          (rgba[(y * width + x) * 4 + c] / 255 - mean[c]) / std[c];
  return new ort.Tensor("float32", values, [1, 3, fullHeight, side]);
}
async function prepareRecognition(job: VisionRequest) {
  if (embedder) return;
  ort = await import("onnxruntime-web/wasm");
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = new URL(VISION_ASSETS, self.location.origin).href;
  progress(
    job.id,
    "Preparing the fast lens · first use downloads its small recognition model",
  );
  const graph = await asset(
    "mobilenet-features.onnx",
    job.id,
    "Preparing the fast lens",
    RECOGNITION_ASSETS,
  );
  embedder = await ort.InferenceSession.create(graph, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });
}
async function warm(job: VisionRequest) {
  const started = performance.now();
  await prepareRecognition(job);
  const input = new ort.Tensor(
    "float32",
    new Float32Array(3 * 224 * 224),
    [1, 3, 224, 224],
  );
  let out: Record<string, Ort.Tensor> | undefined;
  try {
    out = await embedder!.run({ pixel_values: input });
  } finally {
    input.dispose();
    if (out) dispose(out);
  }
  self.postMessage({
    id: job.id,
    ready: true,
    ms: performance.now() - started,
    backend: "WASM CPU",
  } satisfies VisionReply);
}
async function embed(job: VisionRequest) {
  await prepareRecognition(job);
  const started = performance.now();
  const image =
    job.image instanceof Blob ? await createImageBitmap(job.image) : job.image;
  const input = pixels(image);
  image.close();
  let out: Record<string, Ort.Tensor> | undefined;
  try {
    out = await embedder!.run({ pixel_values: input });
    const features = out["/flatten/Flatten_output_0"];
    if (!features || features.data.length !== VISION_DIMENSIONS)
      throw Error("The lens returned incomplete image features.");
    const vector = normalizeVector(Array.from(features.data, Number));
    if (!vector)
      throw Error("The frame could not be read. Move closer and try again.");
    self.postMessage({
      id: job.id,
      vector,
      ms: performance.now() - started,
      backend: "WASM CPU",
    } satisfies VisionReply);
  } finally {
    input.dispose();
    if (out) dispose(out);
  }
}
// Recognition never initializes the former high-memory segmentation graph.
let queue = Promise.resolve();
self.onmessage = (event: MessageEvent<VisionRequest>) => {
  const job = event.data;
  queue = queue.then(async () => {
    try {
      if (job.kind === "prepare") await warm(job);
      else if (job.kind === "embed") await embed(job);
      else throw Error("This worker only handles recognition.");
    } catch (error) {
      self.postMessage({
        id: job.id,
        error:
          error instanceof Error ? error.message : "The lens could not start.",
      } satisfies VisionReply);
    }
  });
};
