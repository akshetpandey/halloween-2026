import { expect, it, vi, afterEach } from "vitest";
import { VisionEngine } from "../src/client/vision-engine";
class TestWorker {
  static instances: TestWorker[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  sent: any[] = [];
  terminated = false;
  constructor() {
    TestWorker.instances.push(this);
  }
  postMessage(message: unknown) {
    this.sent.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  reply(data: unknown) {
    this.onmessage?.({ data });
  }
}
afterEach(() => {
  vi.unstubAllGlobals();
  TestWorker.instances = [];
});
it("restarts a failed GPU initialization in a fresh CPU worker and preserves the request", async () => {
  vi.stubGlobal("Worker", TestWorker);
  const engine = new VisionEngine(),
    progress = vi.fn(),
    blob = new Blob(["fixture"]);
  const result = engine.request("embed", blob, "image-1", progress);
  const gpu = TestWorker.instances[0],
    request = gpu.sent[0];
  gpu.reply({
    id: request.id,
    error: "GPU initialization failed",
    retryCPU: true,
  });
  expect(gpu.terminated).toBe(true);
  const cpu = TestWorker.instances[1];
  expect(cpu.sent[0]).toEqual({ ...request, backend: "wasm" });
  cpu.reply({ id: request.id, vector: [1], backend: "WASM CPU" });
  expect((await result).backend).toBe("WASM CPU · GPU fallback");
  expect(progress).toHaveBeenCalledWith(expect.stringContaining("CPU"));
  engine.close();
});
it("does not loop after CPU failure and rejects pending work when closed", async () => {
  vi.stubGlobal("Worker", TestWorker);
  const engine = new VisionEngine("wasm");
  const result = engine.request("segment", new Blob(), "image-1");
  const rejected = expect(result).rejects.toThrow("CPU failed");
  TestWorker.instances[0].reply({
    id: TestWorker.instances[0].sent[0].id,
    error: "CPU failed",
    retryCPU: true,
  });
  await rejected;
  expect(TestWorker.instances).toHaveLength(1);
  const pending = engine.request("embed", new Blob(), "image-2");
  const cancelled = expect(pending).rejects.toThrow("closed");
  engine.close();
  await cancelled;
  await expect(engine.request("embed", new Blob(), "image-3")).rejects.toThrow(
    "closed",
  );
});
