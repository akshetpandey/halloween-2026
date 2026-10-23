import { afterEach, expect, it, vi } from "vitest";
import type { VisionRequest, VisionReply } from "../src/client/vision.worker";
const fixture = vi.hoisted(() => ({
  creations: 0,
  traces: 0,
  closed: 0,
  masksLive: 0,
  fail: false,
  options: null as any,
  points: [] as any[],
  clear: vi.fn(),
  bitmapClose: vi.fn(),
}));
vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: { forVisionTasks: vi.fn(async () => ({})) },
  InteractiveSegmenterLegacy: {
    createFromOptions: async (_files: unknown, options: unknown) => {
      fixture.creations++;
      fixture.options = options;
      return {
        close: () => fixture.closed++,
        segment: (
          canvas: { width: number; height: number },
          roi: unknown,
          callback: (result: any) => void,
        ) => {
          fixture.traces++;
          fixture.points.push(roi);
          if (fixture.fail) {
            fixture.fail = false;
            throw Error("Outline failed");
          }
          const data = new Float32Array(canvas.width * canvas.height).fill(0.1);
          data.fill(0.9, 0, Math.floor(data.length / 3));
          fixture.masksLive++;
          try {
            callback({
              confidenceMasks: [
                {
                  width: canvas.width,
                  height: canvas.height,
                  getAsFloat32Array: () => data,
                },
              ],
            });
          } finally {
            fixture.masksLive--;
          }
        },
      };
    },
  },
}));
afterEach(() => {
  fixture.creations = fixture.traces = fixture.closed = fixture.masksLive = 0;
  fixture.fail = false;
  fixture.options = null;
  fixture.points = [];
  fixture.clear.mockClear();
  fixture.bitmapClose.mockClear();
  vi.unstubAllGlobals();
  vi.resetModules();
});
async function worker() {
  let id = 0;
  const pending = new Map<number, (result: VisionReply) => void>();
  const scope = {
    onmessage: null as null | ((e: { data: VisionRequest }) => void),
    postMessage(result: VisionReply) {
      if (!result.progress) {
        pending.get(result.id)?.(result);
        pending.delete(result.id);
      }
    },
  };
  vi.stubGlobal("self", scope);
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({
      width: 4032,
      height: 3024,
      close: fixture.bitmapClose,
    })),
  );
  vi.stubGlobal(
    "OffscreenCanvas",
    class {
      constructor(
        public width: number,
        public height: number,
      ) {}
      getContext() {
        return { clearRect: fixture.clear, fillRect() {}, drawImage() {} };
      }
    },
  );
  await import("../src/client/segmentation.worker");
  return (
    kind: VisionRequest["kind"],
    imageKey = "photo",
    point?: { x: number; y: number },
  ) =>
    new Promise<VisionReply>((resolve) => {
      pending.set(++id, resolve);
      scope.onmessage!({
        data: { id, kind, image: new Blob(), imageKey, point, backend: "wasm" },
      });
    });
}
it("warms a CPU-only CNN once, bounds phone photos to 512px, reuses it, and releases transient masks", async () => {
  const send = await worker();
  expect((await send("prepare-segment")).ready).toBe(true);
  expect(fixture.options.baseOptions.delegate).toBe("CPU");
  expect(fixture.options.baseOptions.modelAssetPath).toContain(
    "magic_touch.tflite",
  );
  expect(fixture.traces).toBe(1);
  await send("prepare-segment");
  expect(fixture.creations).toBe(1);
  expect(fixture.traces).toBe(1);
  const photo = await send("segment");
  expect(photo.segmentation).toMatchObject({
    width: 512,
    height: 384,
    usable: true,
  });
  expect(fixture.bitmapClose).toHaveBeenCalledOnce();
  await send("segment", "photo", { x: 0.2, y: 0.3 });
  expect(fixture.points.at(-1)).toEqual({ keypoint: { x: 0.2, y: 0.3 } });
  expect(fixture.bitmapClose).toHaveBeenCalledOnce();
  await send("release-image");
  expect(fixture.clear).toHaveBeenCalledWith(0, 0, 512, 384);
  await send("segment", "another");
  expect(fixture.creations).toBe(1);
  expect(fixture.bitmapClose).toHaveBeenCalledTimes(2);
  expect(fixture.masksLive).toBe(0);
});
it("closes failed models and can retry without a GPU/CPU fallback loop", async () => {
  const send = await worker();
  fixture.fail = true;
  expect((await send("prepare-segment")).error).toBe("Outline failed");
  expect(fixture.closed).toBe(1);
  expect((await send("prepare-segment")).ready).toBe(true);
  expect(fixture.creations).toBe(2);
  expect(fixture.masksLive).toBe(0);
});
