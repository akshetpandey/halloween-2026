import type { MaskResult, VisionReply, VisionRequest } from "./vision.worker";
let nextId = 0;
export class VisionEngine {
  closed = false;
  private backend: "auto" | "wasm";
  private worker!: Worker;
  private fellBack = false;
  private pending = new Map<
    number,
    {
      request: VisionRequest;
      resolve: (value: VisionReply) => void;
      reject: (e: Error) => void;
      progress?: (text: string) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  constructor(backend: "auto" | "wasm" = "auto") {
    this.backend = backend;
    this.startWorker();
  }
  private fallback() {
    this.worker.terminate();
    this.backend = "wasm";
    this.fellBack = true;
    this.startWorker();
    for (const job of this.pending.values()) {
      job.progress?.("This phone is switching to CPU processing…");
      this.worker.postMessage({ ...job.request, backend: "wasm" });
    }
  }
  private startWorker() {
    this.worker = new Worker(new URL("./vision.worker.ts", import.meta.url), {
      type: "module",
    });
    this.worker.onmessage = (event: MessageEvent<VisionReply>) => {
      const reply = event.data,
        job = this.pending.get(reply.id);
      if (!job) return;
      if (reply.progress) {
        job.progress?.(reply.progress);
        return;
      }
      // A failed WASM/GPU initialization can poison the runtime in that worker.
      // Restart with the CPU-only entry rather than reusing that failed module.
      if (reply.error && reply.retryCPU && this.backend === "auto") {
        this.fallback();
        return;
      }
      clearTimeout(job.timer);
      this.pending.delete(reply.id);
      if (reply.error) job.reject(Error(reply.error));
      else
        job.resolve({
          ...reply,
          backend: reply.backend + (this.fellBack ? " · GPU fallback" : ""),
        });
    };
    this.worker.onerror = () => {
      if (this.backend === "auto") this.fallback();
      else
        this.close(
          "This phone could not start the recognition engine. Reload and try again.",
        );
    };
  }
  request(
    kind: VisionRequest["kind"],
    image: Blob,
    imageKey: string,
    progress?: (text: string) => void,
    point?: { x: number; y: number },
  ) {
    if (this.closed) return Promise.reject(Error("The lens was closed."));
    const id = ++nextId,
      request: VisionRequest = {
        id,
        kind,
        image,
        imageKey,
        point,
        backend: this.backend,
      };
    return new Promise<VisionReply>((resolve, reject) => {
      const timer = setTimeout(
        () =>
          this.close("The lens took too long. Try again with a smaller photo."),
        180000,
      );
      this.pending.set(id, { request, resolve, reject, progress, timer });
      this.worker.postMessage(request);
    });
  }
  close(message = "The lens was closed.") {
    this.closed = true;
    this.worker.terminate();
    for (const job of this.pending.values()) {
      clearTimeout(job.timer);
      job.reject(Error(message));
    }
    this.pending.clear();
  }
}
export type PreparedPhoto = {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  key: string;
};
export async function preparePhoto(
  file: Blob,
  maxEdge = 1024,
): Promise<PreparedPhoto> {
  if (file.size > 25 * 1024 * 1024) throw Error("Choose a photo up to 25 MB.");
  const url = URL.createObjectURL(file),
    image = new Image();
  try {
    image.src = url;
    await image.decode();
    const scale = Math.min(
      1,
      maxEdge / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#101c18";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b ? resolve(b) : reject(Error("Could not prepare this photo.")),
        "image/jpeg",
        0.85,
      ),
    );
    return {
      blob,
      url: URL.createObjectURL(blob),
      width: canvas.width,
      height: canvas.height,
      key: crypto.randomUUID(),
    };
  } catch {
    throw Error(
      "This image could not be opened. Try a JPEG, PNG or a new camera photo.",
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function cutoutPhoto(
  photo: PreparedPhoto,
  seg: MaskResult,
): Promise<string> {
  const image = new Image();
  image.src = photo.url;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = seg.width;
  canvas.height = seg.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0, seg.width, seg.height);
  const pixels = ctx.getImageData(0, 0, seg.width, seg.height);
  for (let i = 0; i < seg.mask.length; i++)
    pixels.data[i * 4 + 3] = seg.mask[i];
  ctx.putImageData(pixels, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) =>
        b
          ? resolve(URL.createObjectURL(b))
          : reject(Error("The outline could not be drawn.")),
      "image/png",
    ),
  );
}
