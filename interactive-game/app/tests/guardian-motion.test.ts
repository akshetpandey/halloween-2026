import { expect, it } from "vitest";
import {
  alignMotion,
  robustTransform,
  validMotion,
  MOTION_MODEL,
  type MotionPose,
} from "../src/shared/guardian-motion";
const rig = {
  head: { x: 0.3, y: 0.4 },
  neck: { x: 0.4, y: 0.4 },
  tail: { x: 0.6, y: 0.2 },
  rump: { x: 0.6, y: 0.5 },
};
function pose(): MotionPose {
  return {
    referenceId: "a".repeat(32),
    guardianId: "BUY-02",
    rig,
    parts: "both",
    bounds: { left: 0.1, top: 0.1, right: 0.8, bottom: 0.8 },
    features: {
      model: MOTION_MODEL,
      points: Array.from({ length: 12 }, (_, i) => [
        0.2 + (i % 4) * 0.15,
        0.2 + Math.floor(i / 4) * 0.2,
      ]).flat(),
      descriptors: btoa(
        String.fromCharCode(
          ...Uint8Array.from(
            { length: 12 * 32 },
            (_, i) => (Math.imul(i + 93, 87123) >>> 8) % 256,
          ),
        ),
      ),
    },
  };
}
it("validates bounded private movement DTOs", () => {
  const p = pose();
  expect(validMotion(p)).toBe(true);
  expect(
    validMotion({ ...p, rig: { ...rig, head: { x: Infinity, y: 0 } } }),
  ).toBe(false);
  expect(
    validMotion({ ...p, features: { ...p.features, model: "other" } }),
  ).toBe(false);
  expect(
    validMotion({ ...p, features: { ...p.features, descriptors: "bad" } }),
  ).toBe(false);
  expect(validMotion({ ...p, bounds: { ...p.bounds, right: 0 } })).toBe(false);
  expect(
    validMotion({
      ...p,
      features: { ...p.features, points: Array(1000).fill(0.5) },
    }),
  ).toBe(false);
});
it("recovers an affine camera change with outliers and rejects degenerate correspondences", () => {
  const from = pose().features.points;
  const pairs = Array.from({ length: 12 }, (_, i) => ({
    from: { x: from[i * 2], y: from[i * 2 + 1] },
    to: { x: from[i * 2] * 0.8 + 0.1, y: from[i * 2 + 1] * 0.8 + 0.05 },
  }));
  pairs.push({ from: { x: 0.3, y: 0.4 }, to: { x: 0.9, y: 0.1 } });
  const result = robustTransform(pairs)!;
  expect(result.inliers.length).toBe(12);
  expect(result.matrix[0]).toBeCloseTo(0.8);
  expect(result.matrix[2]).toBeCloseTo(0.1);
  expect(
    robustTransform(
      Array(20).fill({ from: { x: 0.2, y: 0.3 }, to: { x: 0.4, y: 0.5 } }),
    ),
  ).toBeNull();
  expect(robustTransform(pairs.slice(0, 7))).toBeNull();
});
it("does not animate unrelated descriptors", () => {
  expect(
    alignMotion([pose()], {
      points: pose().features.points,
      descriptors: new Uint8Array(12 * 32).fill(0),
    }),
  ).toBeNull();
});
