import { afterEach, expect, it, vi } from "vitest";
import {
  RecognitionSession,
  shouldWarmRecognition,
} from "../src/client/recognition-session";
import type { VisionReply, VisionRequest } from "../src/client/vision.worker";
import type { State } from "../src/shared/types";
import {
  SegmentationSession,
  getSegmentationSession,
} from "../src/client/segmentation-session";

class TestWorker {
  static instances: TestWorker[] = [];
  onmessage: ((event: { data: VisionReply }) => void) | null = null;
  onerror: (() => void) | null = null;
  sent: VisionRequest[] = [];
  terminated = false;
  constructor() {
    TestWorker.instances.push(this);
  }
  postMessage(message: VisionRequest) {
    this.sent.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  reply(data: Omit<VisionReply, "id">) {
    this.onmessage?.({ data: { id: this.sent.at(-1)!.id, ...data } });
  }
}
const sessions: RecognitionSession[] = [];
function session() {
  vi.stubGlobal("Worker", TestWorker);
  const value = new RecognitionSession();
  sessions.push(value);
  return value;
}
afterEach(() => {
  sessions.splice(0).forEach((s) => s.close());
  TestWorker.instances = [];
  vi.unstubAllGlobals();
});

it("shares in-flight onboarding preparation with the camera and reuses the warmed worker on later visits", async () => {
  const s = session(),
    arrival = s.prepare(),
    progress = vi.fn(),
    camera = s.prepare(progress);
  expect(TestWorker.instances).toHaveLength(1);
  const worker = TestWorker.instances[0];
  expect(worker.sent).toHaveLength(1);
  expect(worker.sent[0]).toMatchObject({ kind: "prepare", backend: "wasm" });
  expect(s.ready).toBe(false);
  worker.reply({ progress: "Preparing model" });
  expect(progress).toHaveBeenCalledWith("Preparing model");
  worker.reply({ ready: true, ms: 200, backend: "WASM CPU" });
  expect(await arrival).toEqual(await camera);
  expect(s.ready).toBe(true);

  const engine = s.getEngine();
  await s.prepare();
  expect(worker.sent).toHaveLength(1);
  expect(TestWorker.instances).toHaveLength(1);
  expect(s.getEngine()).toBe(engine);
  const frame = engine.request("embed", new Blob(), "guardian-frame");
  worker.reply({ vector: [1], ms: 10, backend: "WASM CPU" });
  expect((await frame).vector).toEqual([1]);
  await s.prepare();
  expect(worker.sent.map((r) => r.kind)).toEqual(["prepare", "embed"]);
  expect(worker.terminated).toBe(false);
});

it("allows camera retry after a failed background preload", async () => {
  const s = session(),
    preload = s.prepare(),
    failed = expect(preload).rejects.toThrow("Download failed");
  TestWorker.instances[0].reply({ error: "Download failed" });
  await failed;
  expect(s.ready).toBe(false);
  expect(TestWorker.instances[0].terminated).toBe(true);
  const retry = s.prepare();
  expect(TestWorker.instances).toHaveLength(2);
  TestWorker.instances[1].reply({ ready: true, backend: "WASM CPU" });
  await retry;
  expect(s.ready).toBe(true);
});

it("rebuilds a reclaimed worker rather than claiming a dead session is ready", async () => {
  const s = session(),
    preload = s.prepare();
  TestWorker.instances[0].reply({ ready: true });
  await preload;
  s.getEngine().close();
  expect(s.ready).toBe(false);
  const restored = s.prepare();
  TestWorker.instances[1].reply({ ready: true });
  await restored;
  expect(s.ready).toBe(true);
});

it("returns a rejected preload promise when Workers are unavailable, so onboarding can continue", async () => {
  const s = session();
  vi.stubGlobal("Worker", undefined);
  await expect(s.prepare()).rejects.toThrow();
  expect(s.ready).toBe(false);
});

it("retains warmed segmentation models while releasing a previous photo", async () => {
  vi.stubGlobal("Worker", TestWorker);
  const s = new SegmentationSession();
  sessions.push(s);
  s.clearImage();
  expect(TestWorker.instances).toHaveLength(0);
  const warm = s.prepare();
  const worker = TestWorker.instances[0];
  expect(worker.sent[0]).toMatchObject({
    kind: "prepare-segment",
    backend: "auto",
  });
  worker.reply({ ready: true, backend: "WebGPU + WASM fallback" });
  await warm;
  s.clearImage();
  expect(worker.sent[1].kind).toBe("release-image");
  worker.reply({ ready: true });
  await s.prepare();
  expect(worker.sent.map((r) => r.kind)).toEqual([
    "prepare-segment",
    "release-image",
  ]);
  expect(s.ready).toBe(true);
  expect(worker.terminated).toBe(false);
});

it("retains only one large segmentation worker when the host changes backend", async () => {
  vi.stubGlobal("Worker", TestWorker);
  const gpu = getSegmentationSession("auto");
  sessions.push(gpu);
  const warming = gpu.prepare();
  TestWorker.instances[0].reply({ ready: true });
  await warming;
  const cpu = getSegmentationSession("wasm");
  sessions.push(cpu);
  expect(TestWorker.instances[0].terminated).toBe(true);
  expect(gpu.ready).toBe(false);
  const ready = cpu.prepare();
  expect(TestWorker.instances[1].sent[0].backend).toBe("wasm");
  TestWorker.instances[1].reply({ ready: true });
  await ready;
  expect(cpu.ready).toBe(true);
  expect(TestWorker.instances.filter((w) => !w.terminated)).toHaveLength(1);
});

const state = (
  overrides: Partial<
    Pick<State, "previewAvailable" | "status" | "player">
  > = {},
) => ({
  previewAvailable: true,
  status: "sealed" as const,
  player: null,
  ...overrides,
});
const guest: State["player"] = {
  id: "fixture",
  name: "",
  registered: 0,
  realm: "preview",
  photo: false,
};
it("starts during name/selfie or recovery entry, and prepares returning guests too", () => {
  expect(shouldWarmRecognition(state(), "/join")).toBe(true);
  expect(shouldWarmRecognition(state(), "/recover")).toBe(true);
  expect(
    shouldWarmRecognition(state({ status: "open", player: guest }), "/court"),
  ).toBe(true);
});
it("keeps the sealed entrance, host dashboard and disabled public camera rollout free of preloads", () => {
  expect(shouldWarmRecognition(null, "/join")).toBe(false);
  expect(shouldWarmRecognition(state(), "/")).toBe(false);
  expect(shouldWarmRecognition(state(), "/sealed")).toBe(false);
  expect(shouldWarmRecognition(state({ status: "closed" }), "/join")).toBe(
    false,
  );
  expect(
    shouldWarmRecognition(state({ status: "open", player: guest }), "/host"),
  ).toBe(false);
  expect(
    shouldWarmRecognition(
      state({ previewAvailable: false, status: "open", player: guest }),
      "/join",
    ),
  ).toBe(false);
});
