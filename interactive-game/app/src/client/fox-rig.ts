import type { MaskResult } from "./vision.worker";

export type RigPoint = { x: number; y: number };
export type FoxRig = Record<"head" | "neck" | "tail" | "rump", RigPoint>;
export const FOX_POINTS: { key: keyof FoxRig; label: string }[] = [
  { key: "head", label: "Head" },
  { key: "neck", label: "Neck" },
  { key: "tail", label: "Tail tip" },
  { key: "rump", label: "Tail base" },
];

// A silhouette-based starting pose for the upright-tail fox pilot, not animal
// landmark detection. Host adjustments are deliberately local to this capture.
export function estimateFoxRig(seg: MaskResult): FoxRig | null {
  let left = seg.width,
    right = -1,
    top = seg.height,
    bottom = -1;
  for (let y = 0; y < seg.height; y++)
    for (let x = 0; x < seg.width; x++)
      if (seg.mask[y * seg.width + x] >= 128) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
  if (right <= left || bottom <= top) return null;
  const w = right - left,
    h = bottom - top;
  function centre(x0: number, y0: number, x1: number, y1: number): RigPoint {
    let sx = 0,
      sy = 0,
      count = 0;
    for (let y = Math.floor(top + h * y0); y <= top + h * y1; y++)
      for (let x = Math.floor(left + w * x0); x <= left + w * x1; x++)
        if (seg.mask[y * seg.width + x] >= 128) {
          sx += x;
          sy += y;
          count++;
        }
    return {
      x: (count ? sx / count : left + (w * (x0 + x1)) / 2) / seg.width,
      y: (count ? sy / count : top + (h * (y0 + y1)) / 2) / seg.height,
    };
  }
  const head = centre(0, 0.35, 0.42, 0.8),
    tail = centre(0, 0, 1, 0.18);
  return {
    head,
    tail,
    neck: {
      x: Math.min((right + 1) / seg.width, head.x + (w / seg.width) * 0.24),
      y: Math.max(0, head.y - (h / seg.height) * 0.08),
    },
    rump: {
      x: (left + w * 0.76) / seg.width,
      y: (top + h * 0.59) / seg.height,
    },
  };
}

// Pixel metric preserves angles on portrait and landscape captures alike.
export function rigWeight(
  p: RigPoint,
  centre: RigPoint,
  pivot: RigPoint,
  width: number,
  height: number,
  tail: boolean,
) {
  const px = p.x * width,
    py = p.y * height;
  const cx = centre.x * width,
    cy = centre.y * height;
  const rx = pivot.x * width,
    ry = pivot.y * height;
  const dx = cx - rx,
    dy = cy - ry,
    length = Math.hypot(dx, dy);
  if (length < 2) return 0;
  const t = ((px - rx) * dx + (py - ry) * dy) / (length * length);
  const smooth = (a: number, b: number, n: number) => {
    const v = Math.max(0, Math.min(1, (n - a) / (b - a)));
    return v * v * (3 - 2 * v);
  };
  const distance = tail
    ? Math.hypot(
        px - (rx + dx * Math.max(0, Math.min(1, t))),
        py - (ry + dy * Math.max(0, Math.min(1, t))),
      )
    : Math.hypot(px - cx, py - cy);
  const radius = length * (tail ? 0.42 : 1.35);
  return (
    smooth(0, tail ? 0.7 : 0.55, t) *
    (1 - smooth(radius * 0.4, radius, distance))
  );
}
