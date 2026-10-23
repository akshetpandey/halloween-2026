import { mkdir, readFile, writeFile, copyFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
const base = new URL(
  "../public/models/hc-outline-magic-touch-v1-mp111/",
  import.meta.url,
);
await mkdir(base, { recursive: true });
const source =
  "https://storage.googleapis.com/mediapipe-models/interactive_segmenter/magic_touch/float32/1/magic_touch.tflite";
const checksum =
  "e24338a717c1b7ad8d159666677ef400babb7f33b8ad60c4d96db4ecf694cd25";
const target = new URL("magic_touch.tflite", base);
let bytes;
try {
  bytes = await readFile(target);
} catch {}
if (!bytes) {
  const r = await fetch(source, { signal: AbortSignal.timeout(120000) });
  if (!r.ok) throw Error("MagicTouch download failed: " + r.status);
  bytes = Buffer.from(await r.arrayBuffer());
}
if (
  bytes.length !== 6227884 ||
  createHash("sha256").update(bytes).digest("hex") !== checksum
)
  throw Error("MagicTouch checksum mismatch; review pinned source");
await writeFile(target, bytes);
const root = new URL(
  "../node_modules/@mediapipe/tasks-vision/",
  import.meta.url,
);
const version = JSON.parse(
  await readFile(new URL("package.json", root), "utf8"),
).version;
if (version !== "1.1.1")
  throw Error("Re-version outline assets before changing MediaPipe");
const files = [
  { name: "magic_touch.tflite", source, sha256: checksum, bytes: bytes.length },
];
// ES module loader is required for module Workers; all files fit Static Assets.
for (const name of [
  "vision_wasm_module_internal.js",
  "vision_wasm_module_internal.wasm",
]) {
  const from = new URL("wasm/" + name, root);
  if ((await stat(from)).size > 25 * 1024 * 1024)
    throw Error("Outline runtime exceeds static limit");
  await copyFile(from, new URL(name, base));
  const data = await readFile(from);
  files.push({
    name,
    source: "@mediapipe/tasks-vision@1.1.1",
    sha256: createHash("sha256").update(data).digest("hex"),
    bytes: data.length,
  });
}
// Model card explicitly licenses MagicTouch under Apache-2.0.
await copyFile(
  new URL(
    "../public/models/hc-vision-48988dfe-5850ab45-ort130-v1/SAM-LICENSE.txt",
    import.meta.url,
  ),
  new URL("APACHE-2.0.txt", base),
);
await writeFile(
  new URL("NOTICE.txt", base),
  "MagicTouch by Google / MediaPipe Authors, Apache-2.0.\nModel card: https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MagicTouch.pdf\nMediaPipe Tasks Vision 1.1.1, Apache-2.0.\nPinned sources and checksums in manifest.json.\n",
);
await writeFile(
  new URL("manifest.json", base),
  JSON.stringify({ runtime: "@mediapipe/tasks-vision@1.1.1", files }, null, 2) +
    "\n",
);
console.log(
  "Prepared MagicTouch 512px outline model (6.23 MB) and pinned CPU runtime",
);
