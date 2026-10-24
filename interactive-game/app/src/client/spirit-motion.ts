import type { MotionBounds } from "../shared/guardian-motion";
export type SpiritOrigin = {
  x: number;
  y: number;
  size: number;
  source: "reference" | "centre";
};
const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};
export const SPIRIT_DESTINATION = { x: 0.5, y: 0.34, size: 1 };
export function spiritOrigin(bounds?: MotionBounds): SpiritOrigin {
  return bounds
    ? {
        x: clamp((bounds.left + bounds.right) / 2),
        y: clamp((bounds.top + bounds.bottom) / 2),
        size: clamp(
          Math.max(bounds.right - bounds.left, bounds.bottom - bounds.top),
          0.12,
          0.7,
        ),
        source: "reference",
      }
    : { x: 0.5, y: 0.5, size: 0.28, source: "centre" };
}
// Normalized image coordinates -> a cover-fitted photo in the full-screen stage.
export function coverOrigin(
  origin: SpiritOrigin,
  image: { width: number; height: number } | undefined,
  viewport: { width: number; height: number },
): SpiritOrigin {
  if (!image) return origin;
  const scale = Math.max(
      viewport.width / image.width,
      viewport.height / image.height,
    ),
    w = image.width * scale,
    h = image.height * scale;
  return {
    ...origin,
    x: clamp(
      (origin.x * w + (viewport.width - w) / 2) / viewport.width,
      0.06,
      0.94,
    ),
    y: clamp(
      (origin.y * h + (viewport.height - h) / 2) / viewport.height,
      0.08,
      0.82,
    ),
  };
}
export function spiritFrame(
  seconds: number,
  origin: SpiritOrigin,
  destination = SPIRIT_DESTINATION,
) {
  const emerge = smooth((seconds - 0.18) / 1.9),
    arrive = smooth((seconds - 1.5) / 0.9);
  return {
    x: origin.x + (destination.x - origin.x) * emerge,
    y:
      origin.y +
      (destination.y - origin.y) * emerge -
      Math.sin(emerge * Math.PI) * 0.09,
    scale: origin.size * 0.65 + (1 - origin.size * 0.65) * emerge,
    opacity: smooth((seconds - 0.12) / 0.65),
    arrival: arrive,
    portal: 1 - smooth((seconds - 1.3) / 1.9),
    complete: seconds >= 2.4,
  };
}
// A small authored story, not a random idle: arrive, notice, chase, settle, greet.
export function foxStory(seconds: number) {
  const chase = clamp((seconds - 3.1) / 2.7),
    angle = chase * Math.PI * 2;
  const running = seconds >= 3.1 && seconds < 5.8;
  return {
    beat:
      seconds < 2.4
        ? "emerge"
        : seconds < 3.1
          ? "notice"
          : running
            ? "chase"
            : seconds < 6.6
              ? "settle"
              : "greet",
    running,
    yaw: running
      ? Math.PI / 2 - angle
      : seconds >= 5.8 && seconds < 6.35
        ? -Math.PI * 1.5 - (Math.PI / 2) * smooth((seconds - 5.8) / 0.55)
        : seconds >= 2.75 && seconds < 3.1
          ? (Math.PI / 2) * smooth((seconds - 2.75) / 0.35)
          : 0,
    x: running ? Math.sin(angle) * 0.15 : 0,
    y: running ? (Math.cos(angle) - 1) * 0.025 : 0,
    turnToTail:
      seconds >= 2.4 && seconds < 3.1
        ? Math.sin(((seconds - 2.4) / 0.7) * Math.PI)
        : 0,
    sit: smooth((seconds - 5.8) / 0.8),
  };
}
