import { afterEach, expect, it, vi } from "vitest";
import type { VisionReply, VisionRequest } from "../src/client/vision.worker";
const fixture = vi.hoisted(() => ({
  create: vi.fn(),
  tensors: [] as { disposed: boolean }[],
}));
vi.mock("onnxruntime-web/wasm", () => ({
  env: { wasm: {} },
  Tensor: class {
    disposed = false;
    constructor() {
      fixture.tensors.push(this);
    }
    dispose() {
      this.disposed = true;
    }
  },
  InferenceSession: { create: fixture.create },
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  fixture.tensors.length = 0;
  fixture.create.mockReset();
});
async function worker(failRegions: boolean | number = false) {
  fixture.create.mockImplementation(async (bytes: Uint8Array) => {
    if (bytes[0] === 2 && failRegions) {
      if (typeof failRegions === "number") failRegions--;
      throw Error("Region model unavailable");
    }
    return {
      run: async () => {
        const tensor = {
          data: new Float32Array(bytes[0] === 2 ? 576 * 49 : 1024).fill(1),
          disposed: false,
          dispose() {
            this.disposed = true;
          },
        };
        fixture.tensors.push(tensor);
        return {
          [bytes[0] === 2
            ? "/blocks/blocks.5/blocks.5.0/bn1/act/Mul_output_0"
            : "/flatten/Flatten_output_0"]: tensor,
        };
      },
    };
  });
  let id = 0;
  const pending = new Map<number, (reply: VisionReply) => void>();
  const scope = {
    location: { origin: "https://example.test" },
    onmessage: null as null | ((event: { data: VisionRequest }) => void),
    postMessage(reply: VisionReply) {
      if (!reply.progress) {
        pending.get(reply.id)?.(reply);
        pending.delete(reply.id);
      }
    },
  };
  vi.stubGlobal("self", scope);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      expect(url).toMatch(/mobilenet-features.onnx|regions.onnx/);
      return new Response(
        new Uint8Array([url.includes("regions.onnx") ? 2 : 1]),
      );
    }),
  );
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ width: 600, height: 700, close() {} })),
  );
  vi.stubGlobal(
    "OffscreenCanvas",
    class {
      getContext() {
        return {
          drawImage() {},
          fillRect() {},
          getImageData() {
            return { data: new Uint8ClampedArray(224 * 224 * 4) };
          },
        };
      }
    },
  );
  await import("../src/client/vision.worker");
  return (kind: VisionRequest["kind"], focus?: VisionRequest["focus"]) =>
    new Promise<VisionReply>((resolve) => {
      pending.set(++id, resolve);
      scope.onmessage!({
        data: { id, kind, image: new Blob(), imageKey: "photo", focus },
      });
    });
}
it("warms and reuses a CPU recognizer, disposes temporary tensors and returns normalized features", async () => {
  const send = await worker();
  expect((await send("prepare")).ready).toBe(true);
  expect((await send("embed")).vector).toHaveLength(1024);
  expect(fixture.create).toHaveBeenCalledOnce();
  expect(fixture.create.mock.calls[0][1].executionProviders).toEqual(["wasm"]);
  expect(fixture.tensors.every((t) => t.disposed)).toBe(true);
});
it("rejects outline work without loading SAM or any recognition model", async () => {
  const send = await worker();
  expect((await send("prepare-segment")).error).toContain(
    "only handles recognition",
  );
  expect(fixture.create).not.toHaveBeenCalled();
});

it("returns bounded normalized regions to the editor and matches live frames inside the worker", async () => {
  const send = await worker();
  const regions = await send("regions");
  expect(regions.regions?.data).toHaveLength(49 * 576);
  expect(regions.regions?.data[0]).toBeCloseTo(1 / 24, 6);
  const { FOCUS_MODEL } = await import("../src/shared/recognition-focus");
  await send("configure-focus", [
    {
      model: FOCUS_MODEL,
      referenceId: "test",
      guardianId: "tree",
      foreground: btoa(String.fromCharCode(...Array(576).fill(5))),
      background: btoa(String.fromCharCode(127, ...Array(575).fill(0))),
    },
  ]);
  const r = await send("observe");
  expect(r.vector).toHaveLength(1024);
  expect(r.regions).toBeUndefined();
  expect(r.focusMatch?.guardianId).toBe("tree");
  expect(fixture.create).toHaveBeenCalledTimes(2);
  expect(fixture.tensors.every((t) => t.disposed)).toBe(true);
  await send("observe");
  expect(fixture.create).toHaveBeenCalledTimes(2);
  await send("configure-focus", []);
  expect((await send("observe")).focusMatch?.guardianId).toBeNull();
});
it("falls back to the existing scene encoder when foreground initialization fails", async () => {
  const send = await worker(true);
  const r = await send("observe");
  expect(r.vector).toHaveLength(1024);
  expect(r.focusUnavailable).toBe(true);
  expect(r.error).toBeUndefined();
  await send("observe");
  expect(fixture.create).toHaveBeenCalledTimes(2);
});
it("recovers foreground matching after an explicit successful preparation retry", async () => {
  const send = await worker(1);
  expect((await send("observe")).focusUnavailable).toBe(true);
  expect((await send("prepare-regions")).ready).toBe(true);
  const restored = await send("observe");
  expect(restored.focusUnavailable).toBeUndefined();
  expect(restored.focusMatch).toBeDefined();
});
