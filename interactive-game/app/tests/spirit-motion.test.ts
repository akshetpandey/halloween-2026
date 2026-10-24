import { expect, it } from "vitest";
import {
  foxStory,
  coverOrigin,
  spiritFrame,
  spiritOrigin,
} from "../src/client/spirit-motion";
it("uses a matched guardian boundary and falls back to the reticle without a mask", () => {
  expect(spiritOrigin()).toMatchObject({ x: 0.5, y: 0.5, source: "centre" });
  const origin = spiritOrigin({ left: 0.1, top: 0.2, right: 0.3, bottom: 0.6 });
  expect(origin).toMatchObject({ x: 0.2, y: 0.4, source: "reference" });
  expect(origin.size).toBeCloseTo(0.4);
});
it("converges from different photo positions and sizes to one large front-facing presentation", () => {
  for (const bounds of [
    { left: 0, top: 0, right: 0.1, bottom: 0.15 },
    { left: 0.7, top: 0.6, right: 1, bottom: 1 },
    { left: 0.1, top: 0.1, right: 0.9, bottom: 0.9 },
  ]) {
    const origin = spiritOrigin(bounds),
      start = spiritFrame(0, origin),
      end = spiritFrame(3, origin);
    expect(start.x).toBe(origin.x);
    expect(start.y).toBe(origin.y);
    expect(start.scale).toBeLessThan(0.5);
    expect(end).toMatchObject({
      x: 0.5,
      y: 0.34,
      scale: 1,
      opacity: 1,
      complete: true,
    });
  }
});
it("plays a complete story and always settles facing the viewer", () => {
  expect([0, 2.5, 4, 6, 8].map((t) => foxStory(t).beat)).toEqual([
    "emerge",
    "notice",
    "chase",
    "settle",
    "greet",
  ]);
  expect(foxStory(4).running).toBe(true);
  for (const t of [6.6, 8, 100])
    expect(foxStory(t)).toMatchObject({
      running: false,
      yaw: 0,
      x: 0,
      y: 0,
      sit: 1,
    });
});
it("maps cover-fitted photos into portrait and landscape viewports and keeps the origin on-screen", () => {
  const image = { width: 768, height: 1024 };
  expect(
    coverOrigin(spiritOrigin(), image, { width: 390, height: 844 }).x,
  ).toBeCloseTo(0.5);
  const corner = coverOrigin(
    { x: 0, y: 0, size: 0.2, source: "reference" },
    image,
    { width: 390, height: 844 },
  );
  expect(corner.x).toBeGreaterThanOrEqual(0.06);
  expect(corner.y).toBeGreaterThanOrEqual(0.08);
  expect(
    coverOrigin(spiritOrigin(), undefined, { width: 844, height: 390 }),
  ).toEqual(spiritOrigin());
});

it("turns continuously into and out of the chase, including equivalent full rotations", () => {
  for (const time of [3.1, 5.8, 6.35]) {
    const before = foxStory(time - 0.0001).yaw,
      after = foxStory(time + 0.0001).yaw;
    expect(Math.cos(before)).toBeCloseTo(Math.cos(after), 3);
    expect(Math.sin(before)).toBeCloseTo(Math.sin(after), 3);
  }
});
