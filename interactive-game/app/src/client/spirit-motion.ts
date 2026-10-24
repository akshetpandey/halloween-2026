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
export const FOX_TIMING = {
  notice: 2.4,
  chase: 3.2,
  pounce: 5.4,
  settle: 6.25,
  curious: 7.25,
  greet: 8.35,
};
// The arc has anticipation, acceleration and a held reaction, rather than a
// constant-speed orbit. The model's authored clips supply the actual pounce/IK sit.
export function foxStory(seconds: number) {
  const t = FOX_TIMING;
  const chase = clamp((seconds - t.chase) / (t.pounce - t.chase));
  const angle = (0.5 - 0.5 * Math.cos(chase * Math.PI)) * Math.PI * 2;
  const running = seconds >= t.chase && seconds < t.pounce;
  const chaseAmount =
    smooth((seconds - (t.chase - 0.35)) / 0.35) *
    (1 - smooth((seconds - (t.pounce + 0.18)) / 0.42));
  const yaw = running
    ? Math.PI / 2 - angle
    : seconds >= t.pounce && seconds < t.pounce + 0.35
      ? -Math.PI * 1.5 - (Math.PI / 2) * smooth((seconds - t.pounce) / 0.35)
      : seconds >= t.chase - 0.35 && seconds < t.chase
        ? (Math.PI / 2) * smooth((seconds - (t.chase - 0.35)) / 0.35)
        : 0;
  return {
    beat:
      seconds < t.notice
        ? "emerge"
        : seconds < t.chase
          ? "notice"
          : running
            ? "chase"
            : seconds < t.settle
              ? "pounce"
              : seconds < t.curious
                ? "settle"
                : seconds < t.greet
                  ? "curious"
                  : "greet",
    running,
    yaw,
    chaseAmount,
    bank: running ? -0.045 * Math.sin(angle) * Math.sin(chase * Math.PI) : 0,
    x: running ? Math.sin(angle) * (0.14 + 0.02 * Math.sin(angle)) : 0,
    y: running ? (Math.cos(angle) - 1) * 0.022 : 0,
    flight:
      seconds >= t.pounce && seconds < t.settle
        ? Math.sin(clamp((seconds - t.pounce - 0.18) / 0.42) * Math.PI)
        : 0,
    sit: smooth((seconds - t.settle) / (t.curious - t.settle)),
  };
}
