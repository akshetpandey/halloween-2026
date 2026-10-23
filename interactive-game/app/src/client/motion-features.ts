import jsfeat from "jsfeat";
import {
  MOTION_MODEL,
  type MotionBounds,
  type MotionFeatures,
} from "../shared/guardian-motion";
// A small local registration pass, not an identity recognizer. RANSAC rejects
// incompatible views rather than moving the wrong part of a creature.
export function motionFeatures(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  bounds?: MotionBounds,
): MotionFeatures {
  const gray = new jsfeat.matrix_t(width, height, jsfeat.U8_t | jsfeat.C1_t);
  jsfeat.imgproc.grayscale(pixels, width, height, gray);
  const corners = Array.from(
    { length: width * height },
    () => new jsfeat.keypoint_t(),
  );
  jsfeat.yape06.laplacian_threshold = 20;
  jsfeat.yape06.min_eigen_value_threshold = 15;
  const count = jsfeat.yape06.detect(gray, corners, 19);
  const candidates = corners
    .slice(0, count)
    .filter(
      (p) =>
        !bounds ||
        (p.x / width >= bounds.left &&
          p.x / width <= bounds.right &&
          p.y / height >= bounds.top &&
          p.y / height <= bounds.bottom),
    )
    .sort((a, b) => b.score - a.score);
  // Spread points over the object rather than filling all slots with one Lego seam.
  const buckets = new Map<string, number>(),
    selected: typeof candidates = [];
  for (const p of candidates) {
    const cell = `${Math.floor((p.x / width) * 12)},${Math.floor((p.y / height) * 12)}`,
      n = buckets.get(cell) ?? 0;
    if (n >= 10) continue;
    buckets.set(cell, n + 1);
    selected.push(p);
    if (selected.length >= (bounds ? 384 : 1024)) break;
  }
  for (const p of selected) {
    let mx = 0,
      my = 0;
    for (let dy = -15; dy <= 15; dy++)
      for (let dx = -15; dx <= 15; dx++)
        if (dx * dx + dy * dy <= 225) {
          const v = gray.data[(p.y + dy) * width + p.x + dx];
          mx += dx * v;
          my += dy * v;
        }
    p.angle = Math.atan2(my, mx);
  }
  jsfeat.imgproc.gaussian_blur(gray, gray, 7, 2);
  const desc = new jsfeat.matrix_t(
    32,
    selected.length,
    jsfeat.U8_t | jsfeat.C1_t,
  );
  jsfeat.orb.describe(gray, selected, selected.length, desc);
  const bytes = desc.data.slice(0, selected.length * 32);
  return {
    model: MOTION_MODEL,
    points: selected.flatMap((p) => [p.x / width, p.y / height]),
    descriptors: btoa(String.fromCharCode(...bytes)),
  };
}
export async function extractMotion(
  blob: Blob,
  bounds?: MotionBounds,
): Promise<MotionFeatures> {
  const image = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, 640 / Math.max(image.width, image.height)),
      w = Math.round(image.width * scale),
      h = Math.round(image.height * scale),
      canvas = new OffscreenCanvas(w, h),
      ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0, w, h);
    return motionFeatures(ctx.getImageData(0, 0, w, h).data, w, h, bounds);
  } finally {
    image.close();
  }
}
