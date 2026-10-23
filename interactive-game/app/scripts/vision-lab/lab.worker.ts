import { prepareCandidate, candidate } from "./candidates";
import { extractMotion } from "../../src/client/motion-features";
import {
  FilesetResolver,
  InteractiveSegmenter,
  InteractiveSegmenterLegacy,
} from "@mediapipe/tasks-vision";
import * as cpu from "onnxruntime-web/wasm";
import type * as Ort from "onnxruntime-web";
let ort: typeof Ort = cpu;
const base = "/private/vision-comparison-2026-10-23/";
const runtime = "/models/hc-outline-magic-touch-v1-mp111";
let legacy: InteractiveSegmenterLegacy | null = null,
  modern: InteractiveSegmenter | null = null;
let enc: Ort.InferenceSession | null = null,
  dec: Ort.InferenceSession | null = null;
ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = "/models/hc-vision-48988dfe-5850ab45-ort130-v1/";
const canvas = new OffscreenCanvas(1, 1);
const send = (value: unknown) => self.postMessage(value);
async function execute(job: { model: string; file?: Blob }) {
  const begin = performance.now();
  if (!job.file) {
    if (["sam2", "sam2-gpu", "yolo", "orb"].includes(job.model)) {
      if (job.model !== "orb") await prepareCandidate(job.model);
      send({ ready: true, ms: performance.now() - begin });
      return;
    }
    if (job.model.startsWith("legacy") || job.model.startsWith("modern")) {
      const files = await FilesetResolver.forVisionTasks(runtime, true);
      if (job.model.startsWith("legacy"))
        legacy = await InteractiveSegmenterLegacy.createFromOptions(files, {
          baseOptions: {
            modelAssetPath: runtime + "/magic_touch.tflite",
            delegate: job.model.includes("gpu") ? "GPU" : "CPU",
          },
          canvas: new OffscreenCanvas(1, 1),
          outputConfidenceMasks: true,
          outputCategoryMask: false,
        });
      else
        modern = await InteractiveSegmenter.createFromOptions(files, {
          baseOptions: {
            modelAssetPath: base + "magic-touch-768.task",
            delegate: job.model.includes("gpu") ? "GPU" : "CPU",
          },
        });
    } else {
      if (job.model === "edge-gpu" || job.model === "edge-hybrid") {
        ort = await import("onnxruntime-web/webgpu");
        ort.env.wasm.numThreads = 1;
        ort.env.wasm.wasmPaths = "/bench-ort/";
      }
      const ep =
        job.model === "edge-gpu"
          ? ["webgpu"]
          : job.model === "edge-hybrid"
            ? ["webgpu", "wasm"]
            : ["wasm"];
      enc = await ort.InferenceSession.create(
        base + (job.model === "xfeat" ? "xfeat.onnx" : "edge-encoder.onnx"),
        { executionProviders: ep },
      );
      if (job.model.startsWith("edge"))
        dec = await ort.InferenceSession.create(base + "edge-decoder.onnx", {
          executionProviders: ep,
        });
    }
    send({ ready: true, ms: performance.now() - begin });
    return;
  }
  if (["sam2", "sam2-gpu", "yolo", "orb"].includes(job.model)) {
    const result =
      job.model === "orb"
        ? { features: (await extractMotion(job.file)).points.length / 2 }
        : await candidate(job.model, job.file);
    send({ ...result, ms: performance.now() - begin });
    return;
  }
  const image = await createImageBitmap(job.file),
    edge = job.model.startsWith("legacy")
      ? 512
      : job.model.startsWith("modern")
        ? 768
        : job.model === "xfeat"
          ? 512
          : 1024;
  const scale = edge / Math.max(image.width, image.height),
    width = Math.round(image.width * scale),
    height = Math.round(image.height * scale);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0, width, height);
  image.close();
  let mask: Float32Array | undefined,
    outputWidth = width,
    outputHeight = height,
    features: number | undefined;
  if (legacy) {
    const cues = [{ x: 0.5, y: 0.5 }];
    if (job.model.includes("multi")) {
      const view = Number((job.file as File).name.match(/(\d)/)?.[1] ?? 1);
      cues.push(
        [
          { x: 0.65, y: 0.21 },
          { x: 0.62, y: 0.3 },
          { x: 0.55, y: 0.24 },
        ][view - 1],
      );
      cues.push(
        [
          { x: 0.36, y: 0.48 },
          { x: 0.32, y: 0.5 },
          { x: 0.5, y: 0.5 },
        ][view - 1],
      );
    }
    for (const point of cues)
      legacy.segment(canvas, { keypoint: point }, (result) => {
        const m =
            result.confidenceMasks![
              result.confidenceMasks!.length === 1 ? 0 : 1
            ],
          raw = m.getAsFloat32Array();
        if (!mask) mask = new Float32Array(raw);
        else
          for (let i = 0; i < raw.length; i++)
            mask[i] = Math.max(mask[i], raw[i]);
        outputWidth = m.width;
        outputHeight = m.height;
      });
  } else if (modern) {
    modern.setImage(canvas);
    const m = modern.segment([
      { brushMode: 1, point: [{ x: 0.5, y: 0.5 }], isCompleted: true },
    ]);
    try {
      mask = new Float32Array(m.getAsFloat32Array());
      outputWidth = m.width;
      outputHeight = m.height;
    } finally {
      m.close();
    }
  } else {
    const pixels = ctx.getImageData(0, 0, width, height).data,
      side = job.model === "xfeat" ? width : 1024,
      rows = job.model === "xfeat" ? height : 1024;
    const data = new Float32Array(3 * side * rows),
      mean = [123.675, 116.28, 103.53],
      std = [58.395, 57.12, 57.375];
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        for (let c = 0; c < 3; c++)
          data[c * side * rows + y * side + x] =
            job.model === "xfeat"
              ? pixels[(y * width + x) * 4 + c] / 255
              : (pixels[(y * width + x) * 4 + c] - mean[c]) / std[c];
    const input = new ort.Tensor("float32", data, [1, 3, rows, side]);
    let emb: Record<string, Ort.Tensor> | undefined,
      out: Record<string, Ort.Tensor> | undefined;
    try {
      emb = await enc!.run({
        [job.model === "xfeat" ? "images" : "image"]: input,
      });
      if (job.model === "xfeat") features = emb.keypoints.dims[0];
      else {
        const box = job.model !== "edge",
          view = Number((job.file as File).name.match(/(\d)/)?.[1] ?? 1),
          bounds = [
            [220, 150, 580, 630],
            [185, 255, 575, 725],
            [320, 190, 540, 600],
          ][view - 1],
          points = new ort.Tensor(
            "float32",
            Float32Array.from(
              box
                ? bounds.map(
                    (x, i) => x * (i % 2 ? height / 1024 : width / 768),
                  )
                : [width * 0.5, height * 0.5, 0, 0],
            ),
            [1, 2, 2],
          ),
          labels = new ort.Tensor(
            "float32",
            Float32Array.from(box ? [2, 3] : [1, -1]),
            [1, 2],
          );
        try {
          out = await dec!.run({
            ...emb,
            point_coords: points,
            point_labels: labels,
          });
        } finally {
          points.dispose();
          labels.dispose();
        }
        let best = 0;
        for (let i = 1; i < out.scores.data.length; i++)
          if (Number(out.scores.data[i]) > Number(out.scores.data[best]))
            best = i;
        const size = out.masks.dims.at(-1)!,
          raw = out.masks.data as Float32Array;
        const small = new OffscreenCanvas(size, size),
          sc = small.getContext("2d")!,
          rgba = sc.createImageData(size, size);
        for (let i = 0; i < size * size; i++) {
          const n = raw[best * size * size + i] > 0 ? 255 : 0;
          rgba.data.set([n, n, n, 255], i * 4);
        }
        sc.putImageData(rgba, 0, 0);
        const full = new OffscreenCanvas(1024, 1024),
          fc = full.getContext("2d")!;
        fc.drawImage(small, 0, 0, 1024, 1024);
        const crop = fc.getImageData(0, 0, width, height).data;
        mask = Float32Array.from(
          { length: width * height },
          (_, i) => crop[i * 4] / 255,
        );
      }
    } finally {
      input.dispose();
      if (emb) Object.values(emb).forEach((t) => t.dispose());
      if (out) Object.values(out).forEach((t) => t.dispose());
    }
  }
  send({
    ms: performance.now() - begin,
    width: outputWidth,
    height: outputHeight,
    mask,
    area: mask
      ? mask.reduce((n, x) => n + (x >= 0.5 ? 1 : 0), 0) / mask.length
      : undefined,
    features,
  });
}
let queue = Promise.resolve();
self.onmessage = (e) => {
  queue = queue
    .then(() => execute(e.data))
    .catch((e) => send({ error: e instanceof Error ? e.message : String(e) }));
};
