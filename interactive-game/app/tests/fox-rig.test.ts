import { describe, expect, it } from "vitest";
import { estimateFoxRig, rigWeight } from "../src/client/fox-rig";
import type { MaskResult } from "../src/client/vision.worker";

function mask(
  width: number,
  height: number,
  fill: (x: number, y: number) => boolean,
): MaskResult {
  return {
    width,
    height,
    mask: Uint8Array.from({ length: width * height }, (_, i) =>
      fill(i % width, Math.floor(i / width)) ? 255 : 0,
    ),
    area: 0.2,
    usable: true,
    quality: 1,
    ms: 0,
  };
}
describe("fox photo rig", () => {
  it("keeps empty and degenerate outlines on the static fallback", () => {
    expect(estimateFoxRig(mask(40, 60, () => false))).toBeNull();
    expect(
      estimateFoxRig(mask(40, 60, (x, y) => x === 10 && y === 10)),
    ).toBeNull();
  });
  it("keeps movement points inside small and edge-touching images", () => {
    for (const [width, height] of [
      [30, 60],
      [60, 30],
      [2, 2],
    ]) {
      const rig = estimateFoxRig(mask(width, height, () => true))!;
      for (const p of Object.values(rig)) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(1);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(1);
      }
    }
  });
  it("pins the neck and tail base while moving their outer parts", () => {
    const pivot = { x: 0.5, y: 0.6 },
      tip = { x: 0.7, y: 0.2 };
    for (const tail of [false, true]) {
      expect(rigWeight(pivot, tip, pivot, 384, 512, tail)).toBe(0);
      expect(rigWeight(tip, tip, pivot, 384, 512, tail)).toBe(1);
      expect(rigWeight({ x: 0.1, y: 0.95 }, tip, pivot, 384, 512, tail)).toBe(
        0,
      );
    }
  });
  it("does not produce NaNs when adjustment points overlap", () => {
    const p = { x: 0.5, y: 0.5 };
    expect(rigWeight(p, p, p, 384, 512, true)).toBe(0);
    expect(rigWeight(p, p, p, 384, 512, false)).toBe(0);
  });
  it("preserves physical influence under portrait/landscape rotation", () => {
    const p = { x: 0.65, y: 0.35 },
      tip = { x: 0.7, y: 0.2 },
      pivot = { x: 0.5, y: 0.6 };
    const rotate = (v: typeof p) => ({ x: v.y, y: 1 - v.x });
    for (const tail of [true, false])
      expect(rigWeight(p, tip, pivot, 384, 512, tail)).toBeCloseTo(
        rigWeight(rotate(p), rotate(tip), rotate(pivot), 512, 384, tail),
        8,
      );
  });
});
