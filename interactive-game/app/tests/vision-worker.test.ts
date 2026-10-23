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
async function worker() {
  fixture.create.mockResolvedValue({
    run: async () => {
      const tensor = {
        data: new Float32Array(1024).fill(1),
        disposed: false,
        dispose() {
          this.disposed = true;
        },
      };
      fixture.tensors.push(tensor);
      return { "/flatten/Flatten_output_0": tensor };
    },
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
      expect(url).toContain("mobilenet-features.onnx");
      return new Response(new Uint8Array([1]));
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
          getImageData() {
            return { data: new Uint8ClampedArray(224 * 224 * 4) };
          },
        };
      }
    },
  );
  await import("../src/client/vision.worker");
  return (kind: VisionRequest["kind"]) =>
    new Promise<VisionReply>((resolve) => {
      pending.set(++id, resolve);
      scope.onmessage!({
        data: { id, kind, image: new Blob(), imageKey: "photo" },
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
