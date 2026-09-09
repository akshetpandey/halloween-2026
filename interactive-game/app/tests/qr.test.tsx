import { it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import jsQR from "jsqr";
import QRCode from "qrcode";
import { WoodlandQR } from "../src/client/WoodlandQR";
import { qrPayload, shortInviteCode } from "../src/shared/links";
const artwork =
  "data:image/png;base64," +
  (
    await sharp(readFileSync("src/client/assets/woodland-portal.webp"))
      .png()
      .toBuffer()
  ).toString("base64");
const values = [
  "https://hollow-court.com/r",
  ...Array.from(
    { length: 12 },
    (_, i) =>
      "https://hollow-court.com/s/" +
      Array.from(
        { length: 12 },
        (_, j) => "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[(i * 7 + j * 3) % 32],
      ).join(""),
  ),
  "https://hollow-court-preview.example.workers.dev/s/0123456789abcdef0123456789abcdef",
];
for (const [i, value] of values.entries()) {
  for (const width of [244, 488])
    it(`illustrated QR ${i} decodes at ${width}px`, async () => {
      const svg = renderToStaticMarkup(<WoodlandQR value={value} />).replace(
        /href="[^"]+"/,
        `href="${artwork}"`,
      );
      const raster = await sharp(Buffer.from(svg))
        .resize(width, width)
        .png()
        .toBuffer();
      if (i < 2 && width === 488) {
        mkdirSync("private/qr-review", { recursive: true });
        writeFileSync(
          `private/qr-review/${i === 0 ? "partiful" : "summons"}.png`,
          raster,
        );
      }
      const { data, info } = await sharp(raster)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const result = jsQR(new Uint8ClampedArray(data), info.width, info.height);
      expect(result?.data).toBe(qrPayload(value));
    });
}
it("compact URLs keep Q correction in 25/29 module grids and preserve legacy tokens", () => {
  expect(
    QRCode.create(qrPayload(values[0]), { errorCorrectionLevel: "Q" }).modules
      .size,
  ).toBe(25);
  expect(
    QRCode.create(qrPayload(values[1]), { errorCorrectionLevel: "Q" }).modules
      .size,
  ).toBe(29);
  for (const value of [
    values.at(-1)!,
    "https://hollow-court.com/s/aBcDeFgH1234",
    "https://hollow-court.com/r?x=1",
  ])
    expect(qrPayload(value)).toBe(value);
  const codes = Array.from({ length: 1000 }, shortInviteCode);
  expect(codes.every((c) => /^[A-Z2-7]{12}$/.test(c))).toBe(true);
  expect(new Set(codes).size).toBe(codes.length);
});
it("varied compact invitations survive mobile rasterization and mild optical blur", async () => {
  let seed = 0x12345678;
  for (let i = 0; i < 64; i++) {
    const code = Array.from({ length: 12 }, () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[(seed >>> 0) % 32];
    }).join("");
    const value = "https://hollow-court.com/s/" + code;
    const svg = renderToStaticMarkup(<WoodlandQR value={value} />).replace(
      /href="[^"]+"/,
      `href="${artwork}"`,
    );
    const { data, info } = await sharp(Buffer.from(svg))
      .resize(244, 244)
      .blur(0.4)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(
      jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data,
      code,
    ).toBe(qrPayload(value));
  }
}, 60000);
