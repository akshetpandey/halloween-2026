import sharp from "sharp";
import jsQR from "jsqr";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const [file, expected, decoder = "jsqr"] = process.argv.slice(2);
if (!file || !expected) {
  console.error(
    "Usage: node scripts/check-qr-art.mjs <image> <exact QR payload> [jsqr|vision]",
  );
  process.exit(2);
}
if (!["jsqr", "vision"].includes(decoder)) throw new Error("Unknown decoder");
if (decoder === "vision" && process.platform !== "darwin")
  throw new Error("Apple Vision verification requires macOS");

const temp = await mkdtemp(join(tmpdir(), "hollow-qr-check-"));
const cases = [];
try {
  // Decode the delivered pixels; never reconstruct or repair the QR for this check.
  let failures = 0;
  for (const width of [244, 280, 320, 488, 768]) {
    for (const blur of [0, 0.4, 0.8]) {
      let raster = sharp(file).resize(width, width);
      if (blur) raster = raster.blur(blur);
      if (decoder === "vision") {
        const path = join(temp, `${width}-${blur}.png`);
        await writeFile(path, await raster.png().toBuffer());
        cases.push({ path, width, blur });
        continue;
      }
      const { data, info } = await raster
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const result = jsQR(new Uint8ClampedArray(data), info.width, info.height);
      const passed = result?.data === expected;
      if (!passed) failures++;
      console.log(`${passed ? "PASS" : "FAIL"} ${width}px blur=${blur}`);
    }
  }
  if (decoder === "vision") {
    const results = JSON.parse(
      execFileSync(
        "swift",
        [
          fileURLToPath(new URL("./decode-qr-vision.swift", import.meta.url)),
          expected,
          ...cases.map((c) => c.path),
        ],
        { encoding: "utf8", timeout: 120000 },
      ),
    );
    if (results.length !== cases.length)
      throw new Error("Incomplete decoder results");
    results.forEach((passed, i) => {
      if (!passed) failures++;
      console.log(
        `${passed ? "PASS" : "FAIL"} ${cases[i].width}px blur=${cases[i].blur}`,
      );
    });
  }
  console.log(
    `${15 - failures}/15 exact-payload checks passed (${decoder}). Real-camera testing remains necessary.`,
  );
  process.exitCode = failures ? 1 : 0;
} finally {
  await rm(temp, { recursive: true, force: true });
}
