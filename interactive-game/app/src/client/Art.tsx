import { useId } from "react";
export function Mark({
  index = 0,
  size = 32,
}: {
  index?: number;
  size?: number;
}) {
  const shapes = [
    <>
      <path d="M24 4a12 12 0 1 0 0 24A13 13 0 0 1 24 4Z" />
    </>,
    <>
      <path d="M7 26C0 7 18 3 27 4c1 13-3 24-20 22Z" />
      <path d="m6 28 17-18m-9 9v-7m0 7h7" />
    </>,
    <>
      <path d="m16 3 3 10 10 3-10 3-3 10-3-10L3 16l10-3Z" />
    </>,
    <>
      <path d="m16 3 4 8 9 1-7 7 2 10-8-5-8 5 2-10-7-7 9-1Z" />
    </>,
    <>
      <path d="M2 16s5-9 14-9 14 9 14 9-5 9-14 9S2 16 2 16Z" />
      <circle cx="16" cy="16" r="4" />
    </>,
    <>
      <path d="M7 14h18c1 9-5 15-9 15s-10-6-9-15Zm-2 0c0-11 22-11 22 0ZM16 7V2" />
    </>,
    <>
      <path d="M2 11q7-8 14 0t14 0M2 19q7-8 14 0t14 0M2 27q7-8 14 0t14 0" />
    </>,
    <>
      <circle cx="16" cy="16" r="7" />
      <path d="M16 1v4m0 22v4M1 16h4m22 0h4M5 5l3 3m16 16 3 3M5 27l3-3M24 8l3-3" />
    </>,
  ];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shapes[((index % 8) + 8) % 8]}
    </svg>
  );
}
function Antlers() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <path d="M99 89 72 63 63 32m9 31-30-8-12-20m32 14-19-22m41 49-2-34m-40 13L18 59M121 89l27-26 9-31m-9 31 30-8 12-20m-32 14 19-22m-41 49 2-34m40 13 24 4" />
    </g>
  );
}
export function GuardianArt({
  kind = "guardian",
  className = "",
}: {
  kind?: string;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const creature = () => {
    switch (kind) {
      case "moon":
        return (
          <>
            <circle
              cx="110"
              cy="115"
              r="56"
              fill={`url(#${id})`}
              stroke="currentColor"
            />
            <path d="M122 61c-44 29-44 79 0 108" fill="none" />
            <circle cx="89" cy="96" r="8" opacity=".25" />
            <circle cx="130" cy="128" r="13" opacity=".12" />
          </>
        );
      case "tree":
        return (
          <g fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M110 191V74m0 50L76 96 63 59m13 37-30-9m64 50 38-31 15-42m-15 42 27-2M110 92l24-34m-24 39L92 62M110 165l-30 31m30-31 30 31" />
            {[
              [63, 59],
              [46, 87],
              [92, 62],
              [134, 58],
              [163, 64],
              [175, 104],
            ].map(([x, y]) => (
              <ellipse
                key={x}
                cx={x}
                cy={y}
                rx="9"
                ry="16"
                fill="currentColor"
                opacity=".4"
                transform={`rotate(-25 ${x} ${y})`}
              />
            ))}
          </g>
        );
      case "guardian":
      case "stag":
        return (
          <>
            <Antlers />
            <path
              d="m86 81 24 8 24-8-6 49-18 21-18-21Z"
              fill="#263a2c"
              stroke="currentColor"
            />
            <path d="m94 104 8 4m24-4-8 4" stroke="#f6d793" strokeWidth="3" />
            {kind === "guardian" ? (
              <path
                d="m91 137-31 53h100l-31-53-19 16Z"
                fill="#263a2c"
                stroke="currentColor"
              />
            ) : (
              <path
                d="m95 140-32 10-13 33m58-33 35 3 21 30m-77-24-12 32m45-34 15 34"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />
            )}
          </>
        );
      case "raven":
        return (
          <>
            <path
              d="m74 163 51-24 13-56 23-11-25-9-25 8-21 38-34 40-17 12Z"
              fill="#253a31"
              stroke="currentColor"
            />
            <path
              d="m91 113 27-23-12 48-37 18m35-7-4 31m18-39 6 33"
              fill="none"
              stroke="currentColor"
            />
            <circle cx="128" cy="77" r="3" fill="#e6ce91" />
          </>
        );
      case "owl":
        return (
          <>
            <path
              d="m70 62 18 17q22-9 44 0l18-17-4 101-36 29-36-29Z"
              fill="#3d4937"
              stroke="currentColor"
            />
            <path
              d="M77 98q15-30 33 1 18-31 33-1-2 32-33 45-31-13-33-45Z"
              fill="#c0b98d"
            />
            <circle cx="94" cy="105" r="9" fill="#15211d" />
            <circle cx="126" cy="105" r="9" fill="#15211d" />
            <path d="m105 124 5 8 5-8" />
            <path d="m84 145 26 29 26-29" fill="none" />
          </>
        );
      case "fox":
        return (
          <>
            <path
              d="m65 58 39 31h12l39-31-8 60-37 48-37-48Z"
              fill="#9b6848"
              stroke="currentColor"
            />
            <path d="m74 107 36 28 36-28-36 56Z" fill="#d5c4a1" />
            <path d="m83 105 12 6m42-6-12 6" stroke="#16241d" strokeWidth="4" />
            <path d="m105 145 5 6 5-6Z" />
          </>
        );
      case "hare":
        return (
          <>
            <path
              d="M83 110C53 8 91 8 104 100c-2-99 34-96 17 10 52 40 14 79-23 72-36-8-45-40-15-72Z"
              fill="#b2a480"
              stroke="currentColor"
            />
            <path
              d="M103 136q14-12 22 1m-18 15 9 4"
              fill="none"
              stroke="#16241d"
              strokeWidth="3"
            />
            <path d="m79 160-20 8m22 0-23 9" fill="none" />
          </>
        );
      case "well":
        return (
          <>
            <ellipse
              cx="110"
              cy="143"
              rx="63"
              ry="28"
              fill="#233e3c"
              stroke="currentColor"
            />
            <ellipse
              cx="110"
              cy="143"
              rx="44"
              ry="14"
              fill="none"
              stroke="currentColor"
            />
            <path
              d="M59 151v24q51 30 102 0v-24M109 58c-25 32-22 49 0 49s25-17 0-49Z"
              fill="none"
              stroke="currentColor"
            />
            <path d="M82 131q28-12 56 0" fill="none" />
          </>
        );
      case "skull":
        return (
          <>
            <path
              d="M75 131c-31-71 102-83 72 0l-11 10v26H84v-26Z"
              fill="#c3bb9c"
              stroke="currentColor"
            />
            <path
              d="M85 115q12-13 20 1-12 23-20-1Zm30 1q12-14 20-1-7 24-20 1Zm-9 23 4-10 5 10"
              fill="#17231d"
            />
            <path
              d="M95 146v17m15-17v17m15-17v17M73 87 49 57m98 30 23-35"
              fill="none"
              stroke="currentColor"
            />
          </>
        );
      default:
        return (
          <g stroke="currentColor" strokeWidth="3" fill="none">
            <path
              d={
                kind === "door"
                  ? "M63 187V98q47-84 94 0v89M76 187V98q34-61 68 0v89"
                  : kind === "fork"
                    ? "M110 183V102L73 58m37 44 38-44M78 141h64"
                    : kind === "knots"
                      ? "M65 66 155 180M155 66 65 180M52 123h116"
                      : kind === "ember"
                        ? "m110 82-49 101h98ZM80 126h60"
                        : "M90 90 71 180h78l-19-90Zm-24 44h88"
              }
            />
            <circle
              cx="110"
              cy={kind === "door" ? 114 : 77}
              r="15"
              fill="#697556"
            />
            <path
              d="M93 119h34m-37 6h40m-38 6h36"
              stroke={
                kind === "ember"
                  ? "#ce895d"
                  : kind === "knots"
                    ? "#9398bc"
                    : "#ddcda1"
              }
              strokeWidth="4"
            />
          </g>
        );
    }
  };
  return (
    <svg
      className={"guardian-art " + className}
      viewBox="0 0 220 240"
      role="img"
      aria-label={`${kind} woodland illustration`}
      style={{ color: "#bcb98b" }}
    >
      <defs>
        <radialGradient id={id}>
          <stop stopColor="#ece2b9" />
          <stop offset="1" stopColor="#849780" />
        </radialGradient>
      </defs>
      <path
        d="M25 213V107a85 85 0 0 1 170 0v106"
        fill="none"
        stroke="currentColor"
        opacity=".2"
      />
      <path
        d="M34 211V107a76 76 0 0 1 152 0v104"
        fill="none"
        stroke="currentColor"
        opacity=".13"
      />
      {[
        [43, 99],
        [175, 93],
        [55, 185],
        [171, 178],
        [110, 35],
      ].map(([x, y], i) => (
        <g key={i} stroke="currentColor" opacity=".6">
          <path d={`M${x - 3} ${y}h6m-3-3v6`} />
        </g>
      ))}
      {creature()}
      <path
        d="M31 216q39-13 79 0 40-13 79 0M43 210l-8-13m20 11-5-20m123 22 8-13m-20 11 5-20"
        stroke="currentColor"
        fill="none"
        opacity=".55"
      />
    </svg>
  );
}
export function Forest() {
  return (
    <svg
      className="forest"
      viewBox="0 0 1400 700"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="sky">
          <stop stopColor="#405347" />
          <stop offset=".6" stopColor="#20372e" />
          <stop offset="1" stopColor="#12251e" />
        </radialGradient>
        <radialGradient id="moon">
          <stop stopColor="#e2dfbd" />
          <stop offset=".85" stopColor="#b1b992" />
          <stop offset="1" stopColor="#8c9f7e" />
        </radialGradient>
        <linearGradient id="mist" x2="0" y2="1">
          <stop stopColor="#66785f" stopOpacity="0" />
          <stop offset="1" stopColor="#829579" stopOpacity=".28" />
        </linearGradient>
      </defs>
      <rect width="1400" height="700" fill="url(#sky)" />
      <circle cx="1040" cy="210" r="112" fill="url(#moon)" />
      <circle cx="1083" cy="180" r="94" fill="#243b30" opacity=".22" />
      {Array.from({ length: 23 }, (_, i) => {
        const x = (i * 173) % 1450;
        return (
          <g
            key={i}
            opacity={0.12 + (i % 3) * 0.06}
            stroke="#91a387"
            strokeWidth={6 + (i % 5)}
          >
            <path
              d={`M${x} 620q${i % 2 ? 50 : -50}-230 0-510m0 140-55-75m55 50 60-70m-70 220-75-65m85 25 65-70`}
              fill="none"
            />
          </g>
        );
      })}
      <path d="M0 470Q200 420 420 480T820 480 1400 450V700H0" fill="#12291e" />
      <path
        d="M0 560Q280 440 550 555T1100 500 1400 535V700H0"
        fill="url(#mist)"
      />
      {[40, 1340].map((x, i) => (
        <g key={x} stroke="#101f19" fill="none" strokeLinecap="round">
          <path
            d={`M${x} 760 Q${x + (i ? -55 : 55)} 400 ${x} -80`}
            strokeWidth="75"
          />
          <path
            d={`M${x} 230q${i ? -180 : 180}-190 ${i ? -380 : 380}-120M${x} 400q${i ? -120 : 120}-190 ${i ? -230 : 230}-240`}
            strokeWidth="22"
          />
          <path
            d={`M${x + (i ? -130 : 130)} 110l${i ? -65 : 65}-100m${i ? 20 : -20} 65 ${i ? -140 : 140}-25`}
            strokeWidth="9"
          />
        </g>
      ))}
      <g transform="translate(940 358) scale(.9)" color="#0c1a13">
        <Antlers />
        <path
          d="m84 83 26 7 27-7-10 57-17 17-19-19-39 30-3 63 15 5 13-54 35-4 35 4 13 54 15-5-3-63-37-30Z"
          fill="currentColor"
        />
        <path d="m95 106 7 2m25-2-7 2" stroke="#d7be76" strokeWidth="2" />
      </g>
      {Array.from({ length: 25 }, (_, i) => (
        <circle
          key={i}
          cx={200 + ((i * 127) % 1050)}
          cy={320 + ((i * 79) % 260)}
          r={i % 3 === 0 ? 2 : 1}
          fill="#e0c47d"
          opacity={0.25 + (i % 4) * 0.12}
        />
      ))}
      <path d="M0 640q160-60 350 0t350 0 350 0 350 0v60H0" fill="#101c18" />
    </svg>
  );
}
