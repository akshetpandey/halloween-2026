import { VISION_ASSETS } from "../shared/vision";
export const GPU_WASM = VISION_ASSETS + "ort-wasm-simd-threaded.asyncify.wasm";
// Workers Static Assets limits an individual stored file to 25 MiB. Stream the
// versioned WebGPU binary from two smaller pieces, respecting backpressure.
export async function visionRuntimeAsset(
  request: Request,
  assets: Fetcher,
): Promise<Response | null> {
  if (new URL(request.url).pathname !== GPU_WASM) return null;
  if (!["GET", "HEAD"].includes(request.method))
    return new Response("Method not allowed", { status: 405 });
  const parts = await Promise.all(
    [0, 1].map((i) =>
      assets.fetch(new Request(new URL(GPU_WASM + "." + i, request.url))),
    ),
  );
  if (
    parts.some(
      (r) => !r.ok || r.headers.get("Content-Type")?.includes("text/html"),
    )
  ) {
    await Promise.all(parts.map((r) => r.body?.cancel()));
    return new Response("Vision runtime unavailable", { status: 404 });
  }
  if (request.method === "HEAD") {
    await Promise.all(parts.map((r) => r.body?.cancel()));
    return new Response(null, {
      headers: { "Content-Type": "application/wasm" },
    });
  }
  const readers = parts.map((r) => r.body!.getReader());
  let index = 0;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (index < readers.length) {
          const { done, value } = await readers[index].read();
          if (done) {
            index++;
            continue;
          }
          controller.enqueue(value);
          return;
        }
        controller.close();
      } catch (e) {
        controller.error(e);
        await Promise.all(readers.map((r) => r.cancel().catch(() => {})));
      }
    },
    async cancel() {
      await Promise.all(readers.map((r) => r.cancel().catch(() => {})));
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/wasm" },
  });
}
