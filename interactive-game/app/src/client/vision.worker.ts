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
  point?: { x: number; y: number };
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
let ort: typeof Ort,
  preferGPU = false,
  runtimeReady = false;
const sessionBackends = new WeakMap<Ort.InferenceSession, string>();
async function runtime(job: VisionRequest) {
  if (runtimeReady) return;
  if (job.backend !== "wasm") {
    try {
      const gpu = (
        self.navigator as Navigator & {
          gpu?: { requestAdapter: () => Promise<object | null> };
        }
      ).gpu;
      preferGPU = !!(await gpu?.requestAdapter());
    } catch {
      preferGPU = false;
    }
  }
  ort = preferGPU
    ? await import("onnxruntime-web/webgpu")
    : await import("onnxruntime-web/wasm");
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = new URL(VISION_ASSETS, self.location.origin).href;
  runtimeReady = true;
}
async function session(
  graph: Uint8Array,
  job: VisionRequest,
  options: Ort.InferenceSession.SessionOptions = {},
) {
  if (preferGPU) {
    try {
      const result = await ort.InferenceSession.create(graph, {
        ...options,
        executionProviders: ["webgpu", "wasm"],
      });
      sessionBackends.set(result, "WebGPU + WASM fallback");
      return result;
    } catch {
      progress(job.id, "This model is taking the CPU path on this phone…");
    }
  }
  const result = await ort.InferenceSession.create(graph, {
    ...options,
    executionProviders: ["wasm"],
  });
  sessionBackends.set(result, "WASM CPU");
  return result;
}
let embedder: Ort.InferenceSession | null = null;
let encoder: Ort.InferenceSession | null = null;
let decoder: Ort.InferenceSession | null = null;
let segmentationWarmed = false;
let imageCache: {
  key: string;
  embeddings: Record<string, Ort.Tensor>;
  width: number;
  height: number;
  resizedW: number;
  resizedH: number;
  backend: string;
} | null = null;
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
function pixels(
  image: ImageBitmap,
  width: number,
  height: number,
  padded = false,
  crop = false,
) {
  const canvas = new OffscreenCanvas(width, height),
    ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (crop) {
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
  } else ctx.drawImage(image, 0, 0, width, height);
  const rgba = ctx.getImageData(0, 0, width, height).data;
  const side = padded ? 1024 : width,
    fullHeight = padded ? 1024 : height;
  const values = new Float32Array(3 * side * fullHeight);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      for (let c = 0; c < 3; c++)
        values[c * side * fullHeight + y * side + x] =
          (rgba[(y * width + x) * 4 + c] / 255 - mean[c]) / std[c];
  return new ort.Tensor("float32", values, [1, 3, fullHeight, side]);
}
class GPUExecutionError extends Error {}
async function run(
  model: Ort.InferenceSession,
  feeds: Record<string, Ort.Tensor>,
) {
  try {
    return await model.run(feeds);
  } catch (error) {
    if (sessionBackends.get(model)?.startsWith("WebGPU"))
      throw new GPUExecutionError(String(error));
    throw error;
  }
}
async function releaseModels() {
  if (imageCache) {
    dispose(imageCache.embeddings);
    imageCache = null;
  }
  const sessions = [embedder, encoder, decoder];
  embedder = null;
  encoder = null;
  decoder = null;
  segmentationWarmed = false;
  await Promise.all(sessions.map((model) => model?.release().catch(() => {})));
}
async function prepareRecognition(job: VisionRequest) {
  if (embedder) return;
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
  embedder = await session(graph, job, { graphOptimizationLevel: "all" });
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
    out = await run(embedder!, { pixel_values: input });
  } finally {
    input.dispose();
    if (out) dispose(out);
  }
  self.postMessage({
    id: job.id,
    ready: true,
    ms: performance.now() - started,
    backend: sessionBackends.get(embedder!),
  } satisfies VisionReply);
}
async function embed(job: VisionRequest) {
  await prepareRecognition(job);
  const started = performance.now();
  const image =
    job.image instanceof Blob ? await createImageBitmap(job.image) : job.image;
  const input = pixels(image, 224, 224, false, true);
  image.close();
  let out: Record<string, Ort.Tensor> | undefined;
  try {
    out = await run(embedder!, { pixel_values: input });
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
      backend: sessionBackends.get(embedder!),
    } satisfies VisionReply);
  } finally {
    input.dispose();
    if (out) dispose(out);
  }
}
function clearImage() {
  if (imageCache) dispose(imageCache.embeddings);
  imageCache = null;
}
async function prepareSegmentation(job: VisionRequest) {
  if (!encoder) {
    const graph = await asset(
      "sam-encoder.onnx",
      job.id,
      "Preparing the awakening",
    );
    encoder = await session(graph, job, { graphOptimizationLevel: "all" });
  }
  if (!decoder) {
    const graph = await asset(
      "sam-decoder.onnx",
      job.id,
      "Preparing the awakening",
    );
    decoder = await session(graph, job, { graphOptimizationLevel: "all" });
  }
}
async function warmSegmentation(job: VisionRequest) {
  const started = performance.now();
  await prepareSegmentation(job);
  if (!segmentationWarmed) {
    progress(job.id, "Waking the woodland light · preparing its first outline");
    const input = new ort.Tensor(
      "float32",
      new Float32Array(3 * 1024 * 1024),
      [1, 3, 1024, 1024],
    );
    const points = new ort.Tensor(
      "float32",
      new Float32Array([512, 512]),
      [1, 1, 1, 2],
    );
    const labels = new ort.Tensor("int64", new BigInt64Array([1n]), [1, 1, 1]);
    let embeddings: Record<string, Ort.Tensor> | undefined;
    let masks: Record<string, Ort.Tensor> | undefined;
    try {
      embeddings = await run(encoder!, { pixel_values: input });
      masks = await run(decoder!, {
        ...embeddings,
        input_points: points,
        input_labels: labels,
      });
      segmentationWarmed = true;
    } finally {
      input.dispose();
      points.dispose();
      labels.dispose();
      if (masks) dispose(masks);
      if (embeddings) dispose(embeddings);
    }
  }
  self.postMessage({
    id: job.id,
    ready: true,
    ms: performance.now() - started,
    backend: sessionBackends.get(encoder!),
  } satisfies VisionReply);
}
async function segment(job: VisionRequest) {
  const started = performance.now();
  await prepareSegmentation(job);
  if (imageCache?.key !== job.imageKey) {
    clearImage();
    const image =
      job.image instanceof Blob
        ? await createImageBitmap(job.image)
        : job.image;
    const ratio = 1024 / Math.max(image.width, image.height),
      width = image.width,
      height = image.height;
    const resizedW = Math.round(width * ratio),
      resizedH = Math.round(height * ratio);
    const input = pixels(image, resizedW, resizedH, true);
    image.close();
    try {
      progress(job.id, "Tracing the creature through the leaves…");
      const embeddings = await run(encoder!, { pixel_values: input });
      imageCache = {
        key: job.imageKey,
        embeddings,
        width,
        height,
        resizedW,
        resizedH,
        backend: sessionBackends.get(encoder!)!,
      };
    } finally {
      input.dispose();
    }
  }
  const cache = imageCache!,
    point = job.point ?? { x: 0.5, y: 0.5 };
  const points = new ort.Tensor(
    "float32",
    new Float32Array([point.x * cache.resizedW, point.y * cache.resizedH]),
    [1, 1, 1, 2],
  );
  const labels = new ort.Tensor("int64", new BigInt64Array([1n]), [1, 1, 1]);
  let result: Record<string, Ort.Tensor> | undefined;
  try {
    result = await run(decoder!, {
      ...cache.embeddings,
      input_points: points,
      input_labels: labels,
    });
    const raw = result.pred_masks.data as Float32Array,
      scores = result.iou_scores.data as Float32Array;
    const maskSide = result.pred_masks.dims.at(-1)!,
      plane = maskSide * maskSide;
    const ratio = Math.min(1, 768 / Math.max(cache.width, cache.height));
    const width = Math.round(cache.width * ratio),
      height = Math.round(cache.height * ratio);
    const masks = Array.from({ length: scores.length }, (_, index) => {
      const mask = new Uint8Array(width * height);
      let count = 0;
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          const mx = Math.min(
            maskSide - 1,
            Math.floor((((x / width) * cache.resizedW) / 1024) * maskSide),
          );
          const my = Math.min(
            maskSide - 1,
            Math.floor((((y / height) * cache.resizedH) / 1024) * maskSide),
          );
          if (raw[index * plane + my * maskSide + mx] > 0) {
            mask[y * width + x] = 255;
            count++;
          }
        }
      return {
        mask,
        area: count / (width * height),
        quality: Number(scores[index]),
      };
    });
    const selected =
      masks
        .filter((m) => m.area > 0.008 && m.area < 0.88)
        .sort((a, b) => b.quality - a.quality)[0] ?? masks[0];
    const segmentation: MaskResult = {
      ...selected,
      width,
      height,
      usable: selected.area > 0.008 && selected.area < 0.88,
      ms: performance.now() - started,
    };
    self.postMessage(
      {
        id: job.id,
        segmentation,
        backend: cache.backend,
      } satisfies VisionReply,
      { transfer: [segmentation.mask.buffer as ArrayBuffer] },
    );
  } finally {
    points.dispose();
    labels.dispose();
    if (result) dispose(result);
  }
}
// Serialize calls so uploads and mask refinements never share mutable inference buffers.
let queue = Promise.resolve();
self.onmessage = (event: MessageEvent<VisionRequest>) => {
  const job = event.data;
  queue = queue.then(async () => {
    try {
      if (job.kind === "release-image") {
        clearImage();
        self.postMessage({ id: job.id, ready: true } satisfies VisionReply);
        return;
      }
      await runtime(job);
      const execute = () => {
        if (job.kind === "prepare") return warm(job);
        if (job.kind === "prepare-segment") return warmSegmentation(job);
        if (job.kind === "embed") return embed(job);
        return segment(job);
      };
      try {
        await execute();
      } catch (error) {
        if (!(error instanceof GPUExecutionError)) throw error;
        progress(job.id, "This phone is switching to the CPU path…");
        preferGPU = false;
        await releaseModels();
        await execute();
      }
    } catch (e) {
      self.postMessage({
        id: job.id,
        retryCPU: preferGPU,
        error:
          e instanceof Error
            ? e.message
            : "This phone could not prepare the lens. Try again.",
      } satisfies VisionReply);
    }
  });
};
