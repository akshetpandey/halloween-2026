import { useRef } from "react";
import type { PuzzleView } from "../shared/types";
import { Mark } from "./Art";
export function MatrixSigil({ value }: { value: number }) {
  return (
    <span className="matrix-sigil">
      <Mark index={Math.floor(value / 3)} size={34} />
      <span className="sigil-dots" aria-hidden="true">
        {Array.from({ length: (value % 3) + 1 }, (_, i) => (
          <i key={i} />
        ))}
      </span>
    </span>
  );
}
export function Polygon({ sides }: { sides: number }) {
  const pts = Array.from(
    { length: sides },
    (_, i) =>
      `${24 + 19 * Math.sin((i * 2 * Math.PI) / sides)},${24 - 19 * Math.cos((i * 2 * Math.PI) / sides)}`,
  ).join(" ");
  return (
    <svg
      viewBox="0 0 48 48"
      width="42"
      height="42"
      role="img"
      aria-label={`${sides} sides`}
    >
      <polygon
        points={pts}
        fill="#b9c68e22"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
export function SymbolGroup({
  values,
  polygons = false,
  labels = false,
}: {
  values: number[];
  polygons?: boolean;
  labels?: boolean;
}) {
  return (
    <span className="symbol-group">
      {values.map((n, i) => (
        <span key={i}>
          {labels && <small>{["Fox", "Hare", "Raven"][i]}</small>}
          {polygons ? <Polygon sides={n} /> : <Mark index={n} size={30} />}
        </span>
      ))}
    </span>
  );
}
export function Shard({
  edges,
  rotation = 0,
}: {
  edges: number[];
  rotation?: number;
}) {
  return (
    <svg className="shard" viewBox="0 0 100 100" aria-hidden="true">
      <rect
        x="2"
        y="2"
        width="96"
        height="96"
        rx="5"
        fill="#23382a"
        stroke="#91a17c"
      />
      <g transform={`rotate(${rotation * 90} 50 50)`}>
        {edges.map((n, i) =>
          n > 0 ? (
            <g key={i} transform={`rotate(${i * 90} 50 50)`}>
              <path d="M50 3v17" stroke="#d6bd79" strokeWidth="2" />
              <g transform="translate(38 18)">
                <Mark index={n - 1} size={24} />
              </g>
            </g>
          ) : null,
        )}
        <circle cx="50" cy="50" r="4" fill="#aabd86" opacity=".5" />
      </g>
    </svg>
  );
}
export function StarChart({
  chart,
}: {
  chart: NonNullable<PuzzleView["constellation"]>;
}) {
  return (
    <figure className="star-chart">
      <figcaption>{chart.name} · field guide</figcaption>
      <svg
        viewBox="0 0 420 290"
        aria-label={`${chart.name}, connect numbered stars in order`}
        role="img"
      >
        {chart.route.slice(1).map((b, i) => (
          <line
            key={i}
            x1={chart.points[chart.route[i]].x}
            y1={chart.points[chart.route[i]].y}
            x2={chart.points[b].x}
            y2={chart.points[b].y}
            stroke="#c9cba6"
            strokeWidth="3"
          />
        ))}
        {chart.points.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r="6" fill="#ecdfaa" />
            <text x={n.x + 12} y={n.y - 10} fill="currentColor" fontSize="25">
              {i + 1}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
export function Maze({
  p,
  route,
  onRoute,
}: {
  p: PuzzleView;
  route: number[];
  onRoute: (r: number[]) => void;
}) {
  const maze = p.maze!,
    ref = useRef<HTMLDivElement>(null),
    dragging = useRef(false),
    live = useRef(route);
  live.current = route;
  const move = (i: number) => {
    const r = live.current,
      last = r.at(-1);
    if (i < 0 || i >= maze.thorns.length) return;
    let next: number[];
    if (last === undefined) {
      if (i !== p.start) return;
      next = [i];
    } else if (i === r.at(-2)) next = r.slice(0, -1);
    else {
      if (
        r.includes(i) ||
        !maze.openings.some((e) => e.includes(last) && e.includes(i))
      )
        return;
      next = [...r, i];
    }
    live.current = next;
    onRoute(next);
  };
  const wall = (a: number, b: number) =>
    !maze.openings.some((e) => e.includes(a) && e.includes(b));
  return (
    <div className="maze-wrap">
      <div className="maze-progress">
        <span>
          {route.reduce((s, i) => s + maze.thorns[i], 0)} / {p.target} thorn
          patches
        </span>
        <button
          className="text-button"
          disabled={route.length < 2}
          onClick={() => onRoute(route.slice(0, -1))}
        >
          Undo step
        </button>
      </div>
      <div
        ref={ref}
        className="maze-grid"
        style={{ gridTemplateColumns: `repeat(${maze.width},1fr)` }}
        onPointerMove={(e) => {
          if (!dragging.current || !ref.current) return;
          const box = ref.current.getBoundingClientRect();
          const x = Math.floor(
              ((e.clientX - box.left) / box.width) * maze.width,
            ),
            y = Math.floor(((e.clientY - box.top) / box.height) * maze.height);
          if (x >= 0 && x < maze.width && y >= 0 && y < maze.height)
            move(y * maze.width + x);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      >
        {maze.thorns.map((thorn, i) => (
          <button
            key={i}
            className={`${route.includes(i) ? "visited" : ""} ${route.at(-1) === i ? "current" : ""}`}
            aria-label={`Row ${Math.floor(i / maze.width) + 1}, column ${(i % maze.width) + 1}${thorn ? ", thorn patch" : ""}${i === p.start ? ", gate" : ""}${i === p.end ? ", exit" : ""}`}
            style={{
              borderTopWidth: i < maze.width || wall(i, i - maze.width) ? 3 : 0,
              borderRightWidth:
                i % maze.width === maze.width - 1 || wall(i, i + 1) ? 3 : 0,
              borderBottomWidth: i >= maze.width * (maze.height - 1) ? 3 : 0,
              borderLeftWidth: i % maze.width === 0 ? 3 : 0,
            }}
            onPointerDown={(e) => {
              dragging.current = true;
              move(i);
              ref.current?.setPointerCapture(e.pointerId);
            }}
            onClick={(e) => {
              if (e.detail === 0) move(i);
            }}
          >
            {i === p.start ? (
              <small>GATE</small>
            ) : i === p.end ? (
              <small>EXIT</small>
            ) : thorn ? (
              <svg viewBox="0 0 40 40" width="28" aria-hidden="true">
                <path
                  d="M4 29 14 9l5 16 8-19 8 23M7 20l26 2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />
              </svg>
            ) : route.includes(i) ? (
              <span>•</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
