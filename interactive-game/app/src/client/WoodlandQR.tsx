import QRCode from "qrcode";
import { useMemo } from "react";
import woodland from "./assets/woodland-portal.webp";
import partifulArt from "./assets/partiful-qr-art.webp";
import { qrPayload } from "../shared/links";

export function WoodlandQR({
  value,
  label = "An invitation through the leaves",
}: {
  value: string;
  label?: string;
}) {
  // This bitmap encodes one exact public redirect, never a personalized Summons.
  if (qrPayload(value) === "HTTPS://HOLLOW-COURT.COM/R")
    return (
      <img
        data-testid="woodland-qr"
        className="woodland-qr"
        src={partifulArt}
        alt={label}
        width={1254}
        height={1254}
      />
    );
  return <DynamicWoodlandQR value={value} label={label} />;
}

function DynamicWoodlandQR({ value, label }: { value: string; label: string }) {
  const qr = useMemo(
    () => QRCode.create(qrPayload(value), { errorCorrectionLevel: "Q" }),
    [value],
  );
  const n = qr.modules.size,
    pad = 4,
    size = n + pad * 2;
  return (
    <svg
      data-testid="woodland-qr"
      className="woodland-qr"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
    >
      <rect width={size} height={size} fill="#f5f0dd" />
      <image href={woodland} x={pad} y={pad} width={n} height={n} />
      {Array.from({ length: n * n }, (_, i) => {
        const x = pad + (i % n),
          y = pad + Math.floor(i / n);
        const dark = !!qr.modules.data[i],
          reserved = !!qr.modules.reservedBit[i];
        const fill = dark ? "#10261c" : "#fffbe9";
        const col = i % n,
          row = Math.floor(i / n);
        // Q correction covers this small window; structural markers stay intact.
        const doorway =
          !reserved &&
          Math.abs(col - Math.floor(n / 2)) <= 2 &&
          row >= Math.floor(n * 0.44) &&
          row < Math.floor(n * 0.44) + 7;
        if (doorway) return null;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width="1"
              height="1"
              fill={fill}
              opacity={reserved ? 0.85 : 0.12}
            />
            {!reserved && (
              <rect
                x={x + 0.28}
                y={y + 0.28}
                width=".44"
                height=".44"
                rx=".10"
                fill={fill}
                opacity=".94"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
