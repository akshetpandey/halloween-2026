import {
  FilesetResolver,
  InteractiveSegmenterLegacy,
} from "@mediapipe/tasks-vision";
import { SEGMENTATION_ASSETS } from "../shared/segmentation";
import type { VisionRequest, VisionReply, MaskResult } from "./vision.worker";

let model: InteractiveSegmenterLegacy | null = null;
let warmed = false;
const canvas = new OffscreenCanvas(1, 1);
let imageKey = "";
let backend = "MagicTouch · WASM CPU";
function progress(id: number, text: string) {
  self.postMessage({ id, progress: text } satisfies VisionReply);
}
async function prepare(job: VisionRequest) {
  if (!model) {
    progress(job.id, "Preparing the lighter awakening model…");
    const files = await FilesetResolver.forVisionTasks(
      SEGMENTATION_ASSETS.replace(/\/$/, ""),
      true,
    );
    model = await InteractiveSegmenterLegacy.createFromOptions(files, {
      baseOptions: {
        modelAssetPath: SEGMENTATION_ASSETS + "magic_touch.tflite",
        delegate: job.backend === "auto" ? "GPU" : "CPU",
      },
      canvas: new OffscreenCanvas(1, 1),
      outputCategoryMask: false,
      outputConfidenceMasks: true,
    });
    backend =
      job.backend === "auto"
        ? "MagicTouch · WebGL GPU"
        : "MagicTouch · WASM CPU";
  }
}
function clearImage() {
  canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  imageKey = "";
}
function trace(point: VisionRequest["point"] = { x: 0.5, y: 0.5 }): MaskResult {
  const start = performance.now(),
    points = (Array.isArray(point) ? point : [point]).slice(0, 3);
  let combined: Float32Array | undefined,
    width = 0,
    height = 0;
  // Each callback owns its tensors. Retain only one bounded combined mask.
  for (const cue of points)
    model!.segment(canvas, { keypoint: cue }, (result) => {
      const foreground =
        result.confidenceMasks?.[result.confidenceMasks.length === 1 ? 0 : 1];
      if (!foreground)
        throw Error("The outline did not return a foreground mask.");
      const raw = foreground.getAsFloat32Array();
      width = foreground.width;
      height = foreground.height;
      if (!combined) combined = new Float32Array(raw.length);
      for (let i = 0; i < raw.length; i++) {
        if (!Number.isFinite(raw[i]))
          throw Error("The outline was incomplete.");
        combined[i] = Math.max(combined[i], raw[i]);
      }
    });
  if (!combined) throw Error("The creature's outline was unavailable.");
  const mask = new Uint8Array(combined.length);
  let count = 0,
    confidence = 0;
  for (let i = 0; i < mask.length; i++)
    if (combined[i] >= 0.5) {
      mask[i] = 255;
      count++;
      confidence += combined[i];
    }
  const area = count / mask.length;
  return {
    mask,
    width,
    height,
    area,
    quality: count ? confidence / count : 0,
    usable: area > 0.008 && area < 0.88,
    ms: performance.now() - start,
  };
}
async function execute(job: VisionRequest) {
  if (job.kind === "release-image") {
    clearImage();
    self.postMessage({
      id: job.id,
      ready: true,
      backend,
    } satisfies VisionReply);
    return;
  }
  const start = performance.now();
  await prepare(job);
  if (job.kind === "prepare-segment") {
    if (!warmed) {
      canvas.width = 384;
      canvas.height = 512;
      canvas.getContext("2d")!.fillRect(0, 0, 384, 512);
      trace();
      clearImage();
      warmed = true;
    }
    self.postMessage({
      id: job.id,
      ready: true,
      backend,
      ms: performance.now() - start,
    } satisfies VisionReply);
    return;
  }
  if (job.kind !== "segment") throw Error("Unknown outline request.");
  if (imageKey !== job.imageKey) {
    const bitmap =
      job.image instanceof Blob
        ? await createImageBitmap(job.image)
        : job.image;
    try {
      const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas
        .getContext("2d")!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      imageKey = job.imageKey;
    } finally {
      bitmap.close();
    }
  }
  progress(job.id, "Tracing the creature through the leaves…");
  const segmentation = trace(job.point);
  segmentation.ms = performance.now() - start;
  self.postMessage(
    { id: job.id, segmentation, backend } satisfies VisionReply,
    { transfer: [segmentation.mask.buffer as ArrayBuffer] },
  );
}
let queue = Promise.resolve();
self.onmessage = (event: MessageEvent<VisionRequest>) => {
  queue = queue.then(async () => {
    try {
      await execute(event.data);
    } catch (error) {
      clearImage();
      model?.close();
      model = null;
      warmed = false;
      self.postMessage({
        id: event.data.id,
        retryCPU: event.data.backend === "auto",
        error:
          error instanceof Error
            ? error.message
            : "The outline can wait. Try again.",
      } satisfies VisionReply);
    }
  });
};
