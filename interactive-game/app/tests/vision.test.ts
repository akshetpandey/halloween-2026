import { expect, it } from "vitest";
import {
  matchGuardian,
  normalizeVector,
  VISION_DIMENSIONS,
  VISION_MODEL,
  type VisionManifest,
} from "../src/shared/vision";
import { GPU_WASM, visionRuntimeAsset } from "../src/worker/vision-assets";
import { responseHeaders } from "../src/worker/http";
const vector = (x = 1, y = 0) => [
  x,
  y,
  ...Array(VISION_DIMENSIONS - 2).fill(0),
];
const manifest = (entries: [string | null, number[]][]): VisionManifest => ({
  model: VISION_MODEL,
  settings: { threshold: 0.8, margin: 0.04 },
  references: entries.map(([guardianId, value], i) => ({
    id: String(i),
    guardianId,
    vector: normalizeVector(value)!,
  })),
});
it("normalizes valid features and rejects malformed, nonfinite and empty embeddings", () => {
  expect(normalizeVector(vector(3, 4))?.slice(0, 2)).toEqual([0.6, 0.8]);
  for (const input of [
    [],
    vector(0, 0),
    vector(NaN),
    vector(Infinity),
    vector(1e7),
    "bad",
    [...vector(), 0],
  ])
    expect(normalizeVector(input)).toBeNull();
});
it("compares distinct guardians rather than competing reference views of the same object", () => {
  const result = matchGuardian(
    vector(),
    manifest([
      ["owl", vector()],
      ["owl", vector(0.99, 0.01)],
      ["raven", vector(0, 1)],
    ]),
  );
  expect(result.guardianId).toBe("owl");
  expect(result.candidates).toHaveLength(2);
  expect(result.gap).toBe(1);
});
it("rejects unknown objects, close guardian ties and familiar room backgrounds", () => {
  expect(matchGuardian(vector(), manifest([])).reason).toBe("empty");
  expect(
    matchGuardian(vector(), manifest([["owl", vector(0, 1)]])).reason,
  ).toBe("weak");
  expect(
    matchGuardian(
      vector(),
      manifest([
        ["owl", vector()],
        ["raven", vector(0.99, 0.03)],
      ]),
    ).reason,
  ).toBe("ambiguous");
  expect(
    matchGuardian(
      vector(),
      manifest([
        ["owl", vector()],
        [null, vector(0.99, 0.03)],
      ]),
    ).reason,
  ).toBe("background");
  expect(
    matchGuardian(
      vector(),
      manifest([
        ["owl", vector()],
        [null, vector(0, 1)],
      ]),
    ).guardianId,
  ).toBe("owl");
});
it("streams WebGPU runtime pieces in order and applies immutable first-party caching", async () => {
  const calls: string[] = [];
  const assets = {
    fetch: async (req: Request) => {
      calls.push(req.url);
      return new Response(new Uint8Array([req.url.endsWith(".0") ? 1 : 2]), {
        headers: { "Content-Type": "application/octet-stream" },
      });
    },
  } as Fetcher;
  const request = new Request("https://hollow-court.com" + GPU_WASM);
  const response = responseHeaders(
    request,
    (await visionRuntimeAsset(request, assets))!,
  );
  expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2]);
  expect(calls.map((url) => url.slice(-2))).toEqual([".0", ".1"]);
  expect(response.headers.get("Content-Type")).toBe("application/wasm");
  expect(response.headers.get("Cache-Control")).toBe(
    "public, max-age=31536000, immutable",
  );
  const head = await visionRuntimeAsset(
    new Request(request, { method: "HEAD" }),
    assets,
  );
  expect(await head!.text()).toBe("");
  expect(
    await visionRuntimeAsset(
      new Request("https://hollow-court.com/other"),
      assets,
    ),
  ).toBeNull();
});
it("never mistakes SPA fallback HTML or missing pieces for a WASM binary", async () => {
  for (const status of [200, 404]) {
    const assets = {
      fetch: async () =>
        new Response("<html>fallback</html>", {
          status,
          headers: { "Content-Type": "text/html" },
        }),
    } as Fetcher;
    const request = new Request("https://hollow-court.com" + GPU_WASM);
    const response = responseHeaders(
      request,
      (await visionRuntimeAsset(request, assets))!,
    );
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(
      (await visionRuntimeAsset(
        new Request(request, { method: "POST" }),
        assets,
      ))!.status,
    ).toBe(405);
  }
});
