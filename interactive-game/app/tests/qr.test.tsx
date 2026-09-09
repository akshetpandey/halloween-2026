import { it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import jsQR from "jsqr";
import { WoodlandQR } from "../src/client/WoodlandQR";
for (const value of [
  "https://partiful.com/e/CVuHCtIIuMl4G7JuWo2u",
  "https://hollow-court-preview.example.workers.dev/s/0123456789abcdef0123456789abcdef",
]) {
  for (const width of [244, 488])
    it(`leaf-framed QR decodes at ${width}px: ${value.includes("partiful") ? "Partiful" : "Summons"}`, async () => {
      const svg = renderToStaticMarkup(<WoodlandQR value={value} />);
      const { data, info } = await sharp(Buffer.from(svg))
        .resize(width, width)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const result = jsQR(new Uint8ClampedArray(data), info.width, info.height);
      expect(result?.data).toBe(value);
    });
}
