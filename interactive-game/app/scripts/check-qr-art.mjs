import sharp from "sharp";
import jsQR from "jsqr";

const [file, expected] = process.argv.slice(2);
if (!file || !expected) {
  console.error(
    "Usage: node scripts/check-qr-art.mjs <image> <exact QR payload>",
  );
  process.exit(2);
}

// Decode the delivered pixels; never reconstruct or repair the QR for this check.
let failures = 0;
for (const width of [244, 280, 320, 488, 768]) {
  for (const blur of [0, 0.4, 0.8]) {
    let raster = sharp(file).resize(width, width);
    if (blur) raster = raster.blur(blur);
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
console.log(
  `${15 - failures}/15 exact-payload checks passed. Real-camera testing remains necessary.`,
);
process.exitCode = failures ? 1 : 0;
