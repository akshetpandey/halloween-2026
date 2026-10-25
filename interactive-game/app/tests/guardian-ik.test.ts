import { expect, it } from "vitest";
import { solvePlanarLeg } from "../src/shared/guardian-ik";
it("places a downward two-link leg on its target with one consistent knee branch", () => {
  for (const [y, z] of [
    [-0.08, 0],
    [-0.05, 0.02],
    [-0.02, 0.03],
    [-0.07, -0.015],
  ]) {
    const { hip, knee } = solvePlanarLeg(y, z, 0.043, 0.041);
    expect(knee).toBeGreaterThan(0);
    expect(-0.043 * Math.cos(hip) - 0.041 * Math.cos(hip + knee)).toBeCloseTo(
      y,
      6,
    );
    expect(-0.043 * Math.sin(hip) - 0.041 * Math.sin(hip + knee)).toBeCloseTo(
      z,
      6,
    );
  }
});
it("clamps coincident and unreachable targets without singularities", () => {
  for (const [y, z] of [
    [0, 0],
    [-10, 10],
    [-0.084, 0],
  ]) {
    const { hip, knee } = solvePlanarLeg(y, z, 0.043, 0.041);
    expect([hip, knee].every(Number.isFinite)).toBe(true);
    expect(knee).toBeGreaterThan(0);
    expect(knee).toBeLessThan(Math.PI);
  }
});

it("folds fore elbows in the opposite direction without moving their paw targets", () => {
  for (const [y, z] of [
    [-0.078, 0.02],
    [-0.05, -0.02],
    [-0.025, 0.025],
  ]) {
    const { hip, knee } = solvePlanarLeg(y, z, 0.043, 0.041, -1);
    expect(knee).toBeLessThan(0);
    expect(-0.043 * Math.cos(hip) - 0.041 * Math.cos(hip + knee)).toBeCloseTo(
      y,
      6,
    );
    expect(-0.043 * Math.sin(hip) - 0.041 * Math.sin(hip + knee)).toBeCloseTo(
      z,
      6,
    );
  }
});
