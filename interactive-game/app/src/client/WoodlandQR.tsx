import QRCode from "qrcode";
import { useMemo } from "react";
export function WoodlandQR({
  value,
  label = "An invitation through the leaves",
}: {
  value: string;
  label?: string;
}) {
  const qr = useMemo(
    () => QRCode.create(value, { errorCorrectionLevel: "H" }),
    [value],
  );
  const n = qr.modules.size,
    pad = 11,
    size = n + pad * 2;
  return (
    <svg
      data-testid="woodland-qr"
      className="woodland-qr"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
    >
      <rect width={size} height={size} rx="3" fill="#ede9d6" />
      <g fill="none" stroke="#637650" strokeWidth=".42">
        <path
          d={`M3 15Q1 2 15 3M${size - 15} 3Q${size - 1} 2 ${size - 3} 15M3 ${size - 15}Q1 ${size - 2} 15 ${size - 3}M${size - 15} ${size - 3}Q${size - 1} ${size - 2} ${size - 3} ${size - 15}`}
        />
      </g>
      {Array.from({ length: 8 }, (_, i) => {
        const k = 8 + (i * (size - 16)) / 8;
        return (
          <g key={i} fill={i % 2 ? "#9b9a65" : "#536c49"} opacity=".85">
            <ellipse
              cx={k}
              cy="4"
              rx="2.5"
              ry=".85"
              transform={`rotate(-30 ${k} 4)`}
            />
            <ellipse
              cx={k}
              cy={size - 4}
              rx="2.5"
              ry=".85"
              transform={`rotate(30 ${k} ${size - 4})`}
            />
            <ellipse
              cx="4"
              cy={k}
              rx=".85"
              ry="2.5"
              transform={`rotate(-30 4 ${k})`}
            />
            <ellipse
              cx={size - 4}
              cy={k}
              rx=".85"
              ry="2.5"
              transform={`rotate(30 ${size - 4} ${k})`}
            />
          </g>
        );
      })}
      <rect
        x={pad - 4}
        y={pad - 4}
        width={n + 8}
        height={n + 8}
        fill="#faf8ed"
      />
      <g fill="#183b2c">
        {Array.from({ length: n * n }, (_, i) =>
          qr.modules.data[i] ? (
            <rect
              key={i}
              x={pad + (i % n)}
              y={pad + Math.floor(i / n)}
              width="1"
              height="1"
              rx=".12"
            />
          ) : null,
        )}
      </g>
    </svg>
  );
}
