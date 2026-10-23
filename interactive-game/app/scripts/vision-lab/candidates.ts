import * as cpu from "onnxruntime-web/wasm";
import type * as Ort from "onnxruntime-web";
let ort: typeof Ort = cpu;
const base = "/private/vision-comparison-2026-10-23/";
let encoder: Ort.InferenceSession, decoder: Ort.InferenceSession;
export async function prepareCandidate(kind: string) {
  if (kind === "sam2-gpu") {
    ort = await import("onnxruntime-web/webgpu");
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = "/bench-ort/";
  }
  const providers = kind === "sam2-gpu" ? ["webgpu"] : ["wasm"];
  if (kind === "yolo")
    encoder = await ort.InferenceSession.create(base + "yoloe-26n-seg.onnx", {
      executionProviders: providers,
    });
  else {
    encoder = await ort.InferenceSession.create(base + "sam2-encoder.onnx", {
      executionProviders: providers,
      externalData: [
        {
          path: "vision_encoder_quantized.onnx_data",
          data: base + "sam2-encoder.onnx_data",
        },
      ],
    });
    decoder = await ort.InferenceSession.create(base + "sam2-decoder.onnx", {
      executionProviders: providers,
      externalData: [
        {
          path: "prompt_encoder_mask_decoder_quantized.onnx_data",
          data: base + "sam2-decoder.onnx_data",
        },
      ],
    });
  }
}
export async function candidate(kind: string, file: Blob) {
  const img = await createImageBitmap(file),
    side = kind === "yolo" ? 640 : 1024,
    canvas = new OffscreenCanvas(side, side),
    ctx = canvas.getContext("2d")!;
  const pad = kind === "yolo" ? 80 : 0;
  ctx.fillStyle = "rgb(114,114,114)";
  ctx.fillRect(0, 0, side, side);
  ctx.drawImage(img, pad, 0, side - pad * 2, side);
  img.close();
  const rgba = ctx.getImageData(0, 0, side, side).data,
    data = new Float32Array(3 * side * side);
  for (let i = 0; i < side * side; i++)
    for (let c = 0; c < 3; c++)
      data[c * side * side + i] =
        kind === "yolo"
          ? rgba[i * 4 + c] / 255
          : (rgba[i * 4 + c] / 255 - [0.485, 0.456, 0.406][c]) /
            [0.229, 0.224, 0.225][c];
  const input = new ort.Tensor("float32", data, [1, 3, side, side]);
  const emb = await encoder.run({
    [kind === "yolo" ? "images" : "pixel_values"]: input,
  });
  input.dispose();
  let score = 0,
    area = 0;
  try {
    if (kind === "yolo") {
      const det = Object.values(emb).find((t) => t.dims.length === 3)!
        .data as Float32Array;
      score = det[4];
      return {
        score,
        box: Array.from(det.slice(0, 4)),
        detections: Array.from(
          { length: 300 },
          (_, i) => det[i * 38 + 4],
        ).filter((x) => x > 0.25).length,
      };
    }
    const view = Number((file as File).name.match(/(\d)/)?.[1] ?? 1),
      box = [
        [220, 150, 580, 630],
        [185, 255, 575, 725],
        [320, 190, 540, 600],
      ][view - 1];
    // SAM2 stretches the image to 1024 square; use an explicitly supplied box.
    const points = new ort.Tensor("float32", new Float32Array(0), [1, 1, 0, 2]),
      labels = new ort.Tensor("int64", new BigInt64Array(0), [1, 1, 0]),
      boxes = new ort.Tensor(
        "float32",
        Float32Array.from(box, (x, i) => x * (i % 2 ? 1 : 1024 / 768)),
        [1, 1, 4],
      );
    let out: Record<string, Ort.Tensor>;
    try {
      out = await decoder.run({
        ...emb,
        input_points: points,
        input_labels: labels,
        input_boxes: boxes,
      });
    } finally {
      points.dispose();
      labels.dispose();
      boxes.dispose();
    }
    try {
      const scores = out.iou_scores.data as Float32Array;
      let best = 0;
      for (let i = 1; i < scores.length; i++)
        if (scores[i] > scores[best]) best = i;
      score = scores[best];
      const raw = out.pred_masks.data as Float32Array,
        w = out.pred_masks.dims.at(-1)!,
        h = out.pred_masks.dims.at(-2)!;
      const mask = Float32Array.from(
        raw.slice(best * w * h, (best + 1) * w * h),
        (x) => (x > 0 ? 1 : 0),
      );
      area = mask.reduce((n, x) => n + x, 0) / mask.length;
      return { score, mask, width: w, height: h, area };
    } finally {
      Object.values(out).forEach((t) => t.dispose());
    }
  } finally {
    Object.values(emb).forEach((t) => t.dispose());
  }
}
