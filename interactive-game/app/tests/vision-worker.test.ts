import { afterEach, expect, it, vi } from "vitest";
import type { VisionReply, VisionRequest } from "../src/client/vision.worker";

const fixture = vi.hoisted(() => ({
  sessions: [] as {
    kind: number;
    gpu: boolean;
    runs: number;
    released: boolean;
  }[],
  tensors: [] as { disposed: boolean; dims: number[] }[],
  failGPU: false,
}));
vi.mock("onnxruntime-web/wasm", () => ({
  env: { wasm: {} },
  Tensor: class {
    disposed = false;
    constructor(
      public type: string,
      public data: Float32Array | BigInt64Array,
      public dims: number[],
    ) {
      fixture.tensors.push(this);
    }
    dispose() {
      this.disposed = true;
    }
  },
  InferenceSession: {
    create: async (
      graph: Uint8Array,
      options: { executionProviders: string[] },
    ) => {
      const record = {
        kind: graph[0],
        gpu: options.executionProviders[0] === "webgpu",
        runs: 0,
        released: false,
      };
      fixture.sessions.push(record);
      function tensor(data: Float32Array, dims: number[]) {
        const t = {
          data,
          dims,
          disposed: false,
          dispose() {
            this.disposed = true;
          },
        };
        fixture.tensors.push(t);
        return t;
      }
      return {
        run: async () => {
          record.runs++;
          if (record.gpu && fixture.failGPU) {
            fixture.failGPU = false;
            throw Error("GPU warm-up failed");
          }
          if (record.kind === 1)
            return {
              image_embeddings: tensor(new Float32Array([1]), [1]),
              image_positional_embeddings: tensor(new Float32Array([1]), [1]),
            };
          const mask = new Float32Array(3 * 256 * 256).fill(-1);
          for (let y = 64; y < 128; y++)
            for (let x = 64; x < 128; x++) mask[y * 256 + x] = 1;
          return {
            pred_masks: tensor(mask, [1, 1, 3, 256, 256]),
            iou_scores: tensor(new Float32Array([0.9, 0.8, 0.7]), [1, 1, 3]),
          };
        },
        release: async () => {
          record.released = true;
        },
      };
    },
  },
}));
vi.mock(
  "onnxruntime-web/webgpu",
  async () => await import("onnxruntime-web/wasm"),
);
afterEach(() => {
  fixture.sessions.length = 0;
  fixture.tensors.length = 0;
  fixture.failGPU = false;
  vi.unstubAllGlobals();
  vi.resetModules();
});
async function worker(gpu = false) {
  let next = 0;
  const pending = new Map<number, (reply: VisionReply) => void>();
  const scope = {
    location: { origin: "https://example.test" },
    navigator: gpu ? { gpu: { requestAdapter: async () => ({}) } } : {},
    onmessage: null as null | ((e: { data: VisionRequest }) => void),
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
      const kind = url.endsWith("sam-encoder.onnx")
        ? 1
        : url.endsWith("sam-decoder.onnx")
          ? 2
          : 0;
      if (!kind) throw Error("Unexpected model fetch " + url);
      return new Response(new Uint8Array([kind]), {
        headers: { "Content-Type": "application/octet-stream" },
      });
    }),
  );
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ width: 600, height: 700, close: vi.fn() })),
  );
  vi.stubGlobal(
    "OffscreenCanvas",
    class {
      constructor(
        private width: number,
        private height: number,
      ) {}
      getContext() {
        return {
          drawImage() {},
          getImageData: () => ({
            data: new Uint8ClampedArray(this.width * this.height * 4),
          }),
        };
      }
    },
  );
  await import("../src/client/vision.worker");
  return (kind: VisionRequest["kind"], key = "photo") =>
    new Promise<VisionReply>((resolve) => {
      const id = ++next;
      pending.set(id, resolve);
      scope.onmessage!({
        data: {
          id,
          kind,
          image: new Blob(),
          imageKey: key,
          backend: gpu ? "auto" : "wasm",
        },
      });
    });
}

it("warms both segmentation models once, reuses them for photos/refinements, and releases photo tensors separately", async () => {
  const send = await worker();
  expect((await send("prepare-segment")).ready).toBe(true);
  expect(fixture.sessions.map((s) => s.runs)).toEqual([1, 1]);
  expect(fixture.tensors.every((t) => t.disposed)).toBe(true);
  expect(fixture.tensors.some((t) => t.dims.join() === "1,3,1024,1024")).toBe(
    true,
  );
  await send("prepare-segment");
  expect(fixture.sessions.map((s) => s.runs)).toEqual([1, 1]);
  expect((await send("segment")).segmentation?.usable).toBe(true);
  expect(fixture.sessions.map((s) => s.runs)).toEqual([2, 2]);
  await send("segment");
  expect(fixture.sessions.map((s) => s.runs)).toEqual([2, 3]);
  await send("release-image");
  expect(fixture.tensors.every((t) => t.disposed)).toBe(true);
  await send("segment", "next-photo");
  expect(fixture.sessions).toHaveLength(2);
  expect(fixture.sessions.map((s) => s.runs)).toEqual([3, 4]);
  expect(fixture.sessions.every((s) => !s.released)).toBe(true);
  await send("release-image");
  expect(fixture.tensors.every((t) => t.disposed)).toBe(true);
});

it("recovers from GPU warm-up failure by releasing those sessions and warming CPU models", async () => {
  fixture.failGPU = true;
  const send = await worker(true);
  const reply = await send("prepare-segment");
  expect(reply.ready).toBe(true);
  expect(reply.backend).toBe("WASM CPU");
  expect(fixture.sessions).toHaveLength(4);
  expect(fixture.sessions.slice(0, 2).every((s) => s.released)).toBe(true);
  expect(
    fixture.sessions.slice(2).map((s) => ({ gpu: s.gpu, runs: s.runs })),
  ).toEqual([
    { gpu: false, runs: 1 },
    { gpu: false, runs: 1 },
  ]);
  expect(fixture.tensors.every((t) => t.disposed)).toBe(true);
});
