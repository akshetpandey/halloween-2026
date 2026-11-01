import { expect, it, vi } from "vitest";
import { guardians } from "../src/shared/catalog";
import {
  hostSpiritCharacter,
  spiritCharacters,
} from "../src/client/spirit-character";
import { SPIRIT_MODELS } from "../src/client/spirit-models";
import {
  foregroundSpiritOrigin,
  coverOrigin,
} from "../src/client/spirit-motion";
import {
  guardianClip,
  guardianStory,
  GUARDIAN_TIMING,
} from "../src/client/guardian-spirit-motion";
import { SpiritTemplateCache } from "../src/client/spirit-cache";

it("covers every guardian exactly once with an authored asset and canonical voice", () => {
  expect(guardians).toHaveLength(15);
  expect(new Set(guardians.map((g) => hostSpiritCharacter(g.art))).size).toBe(
    15,
  );
  expect(Object.keys(SPIRIT_MODELS)).toHaveLength(15);
  for (const g of guardians) {
    const key = hostSpiritCharacter(g.art)!;
    expect(key).toBeTruthy();
    expect(SPIRIT_MODELS[key].url).toMatch(/\.glb/);
    expect(spiritCharacters[key]).toMatchObject({
      name: g.name,
      greeting: g.greeting,
    });
  }
  for (const unknown of ["well", "background", "__proto__", "constructor", ""])
    expect(hostSpiritCharacter(unknown)).toBeNull();
});
it("uses distinct authored clips while retaining a fixed viewer-facing stage", () => {
  const times = [
    0,
    GUARDIAN_TIMING.awaken,
    GUARDIAN_TIMING.play,
    GUARDIAN_TIMING.settle,
    GUARDIAN_TIMING.greet,
    200,
  ];
  expect(times.map((t) => guardianClip(guardianStory(t).beat))).toEqual([
    "Idle",
    "Awaken",
    "Play",
    "Settle",
    "Greet",
    "Greet",
  ]);
  for (const t of times)
    expect(guardianStory(t)).toMatchObject({
      yaw: 0,
      x: 0,
      y: 0,
      bank: 0,
      flight: 0,
      chaseAmount: 0,
    });
});
it("maps recognition cells through portrait/landscape padding for an entrance only", () => {
  const origin = foregroundSpiritOrigin([16, 17, 23, 24], {
    width: 768,
    height: 1024,
  })!;
  expect(origin.source).toBe("foreground");
  expect(origin.x).toBeLessThan(0.5);
  expect(origin.y).toBeLessThan(0.6);
  const landscape = foregroundSpiritOrigin([15, 16, 22, 23], {
    width: 1024,
    height: 768,
  })!;
  expect(landscape.x).toBeLessThan(0.5);
  expect(landscape.size).toBeGreaterThan(0.12);
  const covered = coverOrigin(
    origin,
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  );
  expect(covered.x).toBeGreaterThanOrEqual(0.06);
  expect(covered.y).toBeLessThanOrEqual(0.82);
  expect(
    foregroundSpiritOrigin([0, 6, -1, NaN], { width: 768, height: 1024 }),
  ).toBeNull();
  expect(foregroundSpiritOrigin([3, 4], { width: 0, height: 0 })).toBeNull();
});
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
it("deduplicates noisy A-B-C-A requests and serializes model parsing before resident eviction", async () => {
  const started: string[] = [],
    resolvers = new Map<string, (value: string) => void>(),
    release = vi.fn();
  const cache = new SpiritTemplateCache(
    2,
    (key: string) => {
      started.push(key);
      return new Promise<string>((resolve) => resolvers.set(key, resolve));
    },
    release,
  );
  const a = cache.get("A"),
    b = cache.get("B"),
    c = cache.get("C");
  expect(cache.get("A")).toBe(a);
  await tick();
  expect(started).toEqual(["A"]);
  resolvers.get("A")!("model A");
  await a;
  await tick();
  expect(started).toEqual(["A", "B"]);
  resolvers.get("B")!("model B");
  await b;
  expect(await cache.get("A")).toBe("model A");
  await tick();
  expect(started).toEqual(["A", "B", "C"]);
  resolvers.get("C")!("model C");
  await c;
  expect(release).toHaveBeenCalledExactlyOnceWith("model B");
  expect(started).toEqual(["A", "B", "C"]);
});
it("recovers after a failed model without stalling later characters or caching rejection", async () => {
  const load = vi
    .fn()
    .mockRejectedValueOnce(Error("offline"))
    .mockResolvedValueOnce("B")
    .mockResolvedValueOnce("A");
  const cache = new SpiritTemplateCache(2, load, vi.fn());
  const a = cache.get("A"),
    b = cache.get("B");
  await expect(a).rejects.toThrow("offline");
  expect(await b).toBe("B");
  expect(await cache.get("A")).toBe("A");
  expect(load.mock.calls.map((c) => c[0])).toEqual(["A", "B", "A"]);
});
