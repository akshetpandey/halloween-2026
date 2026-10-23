import type * as Ort from "onnxruntime-web";
import {
  normalizeVector,
  VISION_ASSETS,
  VISION_DIMENSIONS,
} from "../shared/vision";

export type VisionRequest = {
  id: number;
  kind: "embed" | "segment";
  image: Blob;
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
let dino: Ort.InferenceSession | null = null;
let decoder: Ort.InferenceSession | null = null;
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
async function asset(name: string, id: number, label: string) {
  const response = await fetch(VISION_ASSETS + name, { cache: "force-cache" });
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
) {
  const canvas = new OffscreenCanvas(width, height),
    ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, width, height);
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
  const sessions = [dino, decoder];
  dino = null;
  decoder = null;
  await Promise.all(sessions.map((model) => model?.release().catch(() => {})));
}
async function embed(job: VisionRequest) {
  const started = performance.now();
  if (!dino) {
    // Release the previous segmentation image before loading the other model.
    if (imageCache) {
      dispose(imageCache.embeddings);
      imageCache = null;
    }
    if (decoder) {
      await decoder.release();
      decoder = null;
    }
    progress(
      job.id,
      "Preparing the eyes of the wood · first use may take a moment",
    );
    const graph = await asset("dino.onnx", job.id, "Preparing recognition");
    const data = await asset(
      "model_quantized.onnx_data",
      job.id,
      "Preparing recognition",
    );
    dino = await session(graph, job, {
      externalData: [{ path: "model_quantized.onnx_data", data }],
      graphOptimizationLevel: "all",
    });
  }
  progress(job.id, "Looking for a familiar creature…");
  const image = await createImageBitmap(job.image);
  const input = pixels(image, 224, 224);
  image.close();
  let out: Record<string, Ort.Tensor> | undefined;
  try {
    out = await run(dino, { pixel_values: input });
    const features = out.pooler_output ?? out.last_hidden_state;
    if (!features)
      throw Error("The recognition model returned no image features.");
    const vector = normalizeVector(
      Array.from(features.data.slice(0, VISION_DIMENSIONS), Number),
    );
    if (!vector)
      throw Error("The photo could not be read. Move closer and try again.");
    self.postMessage({
      id: job.id,
      vector,
      ms: performance.now() - started,
      backend: sessionBackends.get(dino),
    } satisfies VisionReply);
  } finally {
    input.dispose();
    if (out) dispose(out);
  }
}
async function segment(job: VisionRequest) {
  const started = performance.now();
  if (imageCache?.key !== job.imageKey) {
    if (imageCache) {
      dispose(imageCache.embeddings);
      imageCache = null;
    }
    if (dino) {
      await dino.release();
      dino = null;
    }
    progress(job.id, "Something stirs · preparing its outline");
    const graph = await asset(
      "sam-encoder.onnx",
      job.id,
      "Preparing the outline",
    );
    const encoder = await session(graph, job, {
      graphOptimizationLevel: "all",
    });
    const image = await createImageBitmap(job.image);
    const ratio = 1024 / Math.max(image.width, image.height),
      width = image.width,
      height = image.height;
    const resizedW = Math.round(width * ratio),
      resizedH = Math.round(height * ratio);
    const input = pixels(image, resizedW, resizedH, true);
    image.close();
    try {
      progress(job.id, "Tracing the creature through the leaves…");
      const embeddings = await run(encoder, { pixel_values: input });
      imageCache = {
        key: job.imageKey,
        embeddings,
        width,
        height,
        resizedW,
        resizedH,
        backend: sessionBackends.get(encoder)!,
      };
    } finally {
      input.dispose();
      await encoder.release();
    }
  }
  if (!decoder) {
    const graph = await asset(
      "sam-decoder.onnx",
      job.id,
      "Preparing the outline",
    );
    decoder = await session(graph, job, { graphOptimizationLevel: "all" });
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
    result = await run(decoder, {
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
      await runtime(job);
      const execute = () => (job.kind === "embed" ? embed(job) : segment(job));
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
