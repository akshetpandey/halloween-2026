// Desktop-only candidates. Never included by the app build or deployed assets.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "../.."),
  dir = resolve(root, "private/vision-comparison-2026-10-23");
await mkdir(dir, { recursive: true });
const models = JSON.parse(
  await readFile(new URL("./models.json", import.meta.url), "utf8"),
);
for (const model of models) {
  const file = resolve(dir, model.name),
    hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
  let bytes;
  try {
    bytes = await readFile(file);
  } catch {}
  if (!bytes || hash(bytes) !== model.sha256) {
    const response = await fetch(model.url);
    if (!response.ok) throw Error(`Download failed: ${model.name}`);
    bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length !== model.bytes || hash(bytes) !== model.sha256)
      throw Error(`Candidate checksum mismatch: ${model.name}`);
    await writeFile(file, bytes);
  }
  console.log(`${model.name}: ${model.bytes} bytes verified`);
}
