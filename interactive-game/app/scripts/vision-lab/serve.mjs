// Loopback-only model lab. Never serves keys, reference metadata or guest data.
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
const app = resolve(import.meta.dirname, "../..");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".wasm": "application/wasm",
  ".jpg": "image/jpeg",
};
createServer(async (req, res) => {
  try {
    const path = new URL(req.url, "http://127.0.0.1").pathname;
    let file;
    if (path.startsWith("/models/")) file = resolve(app, "public" + path);
    else if (/^\/bench-ort\/ort-wasm-[\w.-]+\.(wasm|mjs)$/.test(path))
      file = resolve(
        app,
        "node_modules/onnxruntime-web/dist",
        path.split("/").at(-1),
      );
    else if (
      /^\/private\/vision-comparison-2026-10-23\/[\w.-]+\.(onnx|onnx_data|task)$/.test(
        path,
      ) ||
      /^\/private\/fox-pilot-2026-10-23\/fox-[123]\.jpg$/.test(path)
    )
      file = resolve(app, "." + path);
    else
      file = resolve(
        app,
        "private/vision-lab-dist",
        "." + (path === "/" ? "/index.html" : path),
      );
    if (!file.startsWith(app + "/")) throw Error("Outside lab");
    const info = await stat(file);
    if (!info.isFile()) throw Error("Not a file");
    res.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Content-Length": info.size,
      "Cache-Control": "no-store",
    });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404);
    res.end("Unavailable");
  }
}).listen(5173, "127.0.0.1", () =>
  console.log("Local model lab: http://127.0.0.1:5173/"),
);
