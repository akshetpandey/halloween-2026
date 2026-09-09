import { useEffect, useRef, useState } from "react";
import { RotateCcw, ArrowRight, Check, Play } from "lucide-react";
import { Mark } from "./Art";
import {
  MatrixSigil,
  SymbolGroup,
  Shard,
  StarChart,
  Maze,
} from "./PuzzleFigures";
import { marks, type Point, type PuzzleView } from "../shared/types";
function Symbol({ name }: { name: string }) {
  const index = marks.indexOf(name.split(" · ")[0]);
  return (
    <>
      {index >= 0 && <Mark index={index} />}
      <span>{name}</span>
    </>
  );
}
export function Puzzle({
  p,
  onSubmit,
  busy,
}: {
  p: PuzzleView;
  onSubmit: (answer: unknown) => Promise<boolean>;
  busy: boolean;
}) {
  const [choice, setChoice] = useState<number | null>(null),
    [order, setOrder] = useState<string[]>([]),
    [route, setRoute] = useState<number[]>([]),
    [selected, setSelected] = useState<number[]>([]);
  const [board, setBoard] = useState(p.board || []),
    [moves, setMoves] = useState<number[]>([]),
    [nodes, setNodes] = useState(p.nodes || []),
    [active, setActive] = useState<number | null>(null);
  const [slots, setSlots] = useState<(number | null)[]>(
      p.sealEdges ? [0, null, null, null, null, null] : Array(4).fill(null),
    ),
    [rotations, setRotations] = useState(p.rotations || []);
  const [stage, setStage] = useState<"ready" | "watch" | "answer" | "reveal">(
      "ready",
    ),
    [positions, setPositions] = useState([0, 1, 2]),
    [swapStep, setSwapStep] = useState(-1),
    [lifted, setLifted] = useState(false),
    [tokenPending, setTokenPending] = useState(false);
  const svg = useRef<SVGSVGElement>(null),
    drag = useRef<number | null>(null),
    dragged = useRef(false),
    timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  function reset() {
    setChoice(null);
    setOrder([]);
    setRoute([]);
    setSelected([]);
    setBoard([...(p.board || [])]);
    setMoves([]);
    setNodes([...(p.nodes || [])]);
    setActive(null);
    setSlots(
      p.sealEdges ? [0, null, null, null, null, null] : Array(4).fill(null),
    );
    setRotations([...(p.rotations || [])]);
    timers.current.forEach(clearTimeout);
    setStage("ready");
    setPositions([0, 1, 2]);
    setSwapStep(-1);
    setLifted(false);
  }
  function play() {
    timers.current.forEach(clearTimeout);
    setLifted(false);
    setChoice(null);
    setStage("watch");
    setPositions([0, 1, 2]);
    setSwapStep(-1);
    if (p.kind === "memory") {
      timers.current.push(setTimeout(() => setStage("answer"), 5000));
      return;
    }
    timers.current.push(setTimeout(() => setLifted(true), 100));
    timers.current.push(setTimeout(() => setLifted(false), 1600));
    const current = [0, 1, 2];
    p.swaps!.forEach(([a, b], i) =>
      timers.current.push(
        setTimeout(
          () => {
            for (let cup = 0; cup < 3; cup++) {
              if (current[cup] === a) current[cup] = b;
              else if (current[cup] === b) current[cup] = a;
            }
            setSwapStep(i);
            setPositions([...current]);
          },
          2000 + i * 1100,
        ),
      ),
    );
    timers.current.push(
      setTimeout(() => setStage("answer"), 2000 + p.swaps!.length * 1100),
    );
  }
  async function submit(value: unknown) {
    if (p.kind === "token") {
      if (stage !== "answer") return;
      setTokenPending(true);
      setStage("reveal");
      setLifted(true);
      await new Promise<void>((resolve) =>
        timers.current.push(setTimeout(resolve, 1600)),
      );
    }
    setTokenPending(false);
    const ok = await onSubmit(value);
    if (!ok && p.kind === "memory") setStage("ready");
  }
  function graphPoint(i: number) {
    if (route.length === 0) {
      if (p.start !== undefined && i !== p.start) return;
      setRoute([i]);
      return;
    }
    const last = route.at(-1)!;
    if (i === last) {
      setRoute(route.slice(0, -1));
      return;
    }
    if (
      p.edges &&
      !p.edges.some(
        ([a, b]) => (a === last && b === i) || (a === i && b === last),
      )
    )
      return;
    if (p.family === "thorns" && p.nodes![i].x <= p.nodes![last].x) return;
    if (
      p.family === "sigil" &&
      route
        .slice(1)
        .some(
          (b, j) =>
            (route[j] === last && b === i) || (route[j] === i && b === last),
        )
    )
      return;
    if (p.family === "constellation" && route.includes(i)) return;
    setRoute([...route, i]);
  }
  function coords(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(
        15,
        Math.min(405, ((e.clientX - rect.left) / rect.width) * 420),
      ),
      y: Math.max(
        15,
        Math.min(275, ((e.clientY - rect.top) / rect.height) * 290),
      ),
    };
  }
  const grid = (values: number[], interactive = false) => (
    <div className={"sigil-grid " + (interactive ? "interactive" : "")}>
      {values.map((s, i) =>
        interactive ? (
          <button
            key={i}
            aria-label={`Reflection mark ${i + 1}: ${marks[s]}`}
            className={choice === i ? "selected" : ""}
            onClick={() => setChoice(i)}
          >
            <Mark index={s} />
          </button>
        ) : (
          <div key={i}>
            {s < 0 ? (
              <span className="missing">?</span>
            ) : (
              <>
                <Mark index={p.family === "matrix" ? Math.floor(s / 3) : s} />
                {p.family === "matrix" && (
                  <span className="matrix-dots">{"●".repeat((s % 3) + 1)}</span>
                )}
              </>
            )}
          </div>
        ),
      )}
    </div>
  );
  return (
    <div className="puzzle" data-family={p.family}>
      <div className="puzzle-heading">
        <span className="eyebrow">The guardian’s trial</span>
        <button
          className="text-button puzzle-reset"
          onClick={reset}
          disabled={busy || tokenPending}
        >
          <RotateCcw size={16} /> Start over
        </button>
      </div>
      <h2>{p.title}</h2>
      <p className="instructions">{p.instructions}</p>
      {p.text && (
        <div className="evidence">
          {p.text.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
        </div>
      )}
      {p.ruleExamples && (
        <div className="rule-examples">
          {p.ruleExamples.map((e, i) => (
            <div key={i}>
              <span className={e.accepted ? "accepted" : "refused"}>
                {e.accepted ? "Accepted" : "Refused"}
              </span>
              <SymbolGroup values={e.shapes} polygons />
            </div>
          ))}
        </div>
      )}
      {p.family === "matrix" && grid(p.grid!)}
      {p.constellation && <StarChart chart={p.constellation} />}
      {p.kind === "maze" && <Maze p={p} route={route} onRoute={setRoute} />}
      {p.family === "wheel" && (
        <svg
          className="wheel"
          viewBox="0 0 300 300"
          aria-label="Eight marks, read clockwise from the top"
        >
          <circle
            cx="150"
            cy="150"
            r="108"
            fill="none"
            stroke="currentColor"
            opacity=".3"
          />
          {p.symbols!.map((n, i) => {
            const x = 150 + 108 * Math.sin((i * Math.PI) / 4),
              y = 150 - 108 * Math.cos((i * Math.PI) / 4);
            return (
              <g key={i} transform={`translate(${x - 16} ${y - 16})`}>
                <Mark index={n} />
                <text
                  x="16"
                  y="47"
                  textAnchor="middle"
                  fontSize="11"
                  fill="currentColor"
                >
                  {marks[n]}
                </text>
              </g>
            );
          })}
          <text
            x="150"
            y="160"
            textAnchor="middle"
            fontSize="30"
            fill="currentColor"
          >
            ↻
          </text>
        </svg>
      )}
      {p.kind === "reflection" && (
        <div className="reflection">
          <div>
            <span>THE TRUE SEAL</span>
            {grid(p.grid!)}
          </div>
          <div>
            <span>ITS REFLECTION</span>
            {grid(p.mirror!, true)}
          </div>
        </div>
      )}
      {p.kind === "memory" && (
        <div className="vision">
          <div className="vision-stage">
            {stage === "watch" ? (
              <div className="vision-grid">
                {p.symbols!.map((s, i) => (
                  <div key={i}>
                    <Mark index={s} />
                    <small>{marks[s]}</small>
                  </div>
                ))}
              </div>
            ) : stage === "answer" ? (
              <p className="vision-question">{p.question}</p>
            ) : (
              <>
                <Mark index={4} size={48} />
                <p>The vision waits for you.</p>
              </>
            )}
          </div>
          {stage === "watch" ? (
            <p className="small muted">Look closely…</p>
          ) : stage === "ready" ? (
            <button className="btn secondary" onClick={play}>
              <Play size={16} /> Look into the vision
            </button>
          ) : (
            <button className="text-button" onClick={play}>
              Look again
            </button>
          )}
        </div>
      )}
      {p.kind === "token" && (
        <div className="token-stage">
          <div className={"cups " + (swapStep >= 0 ? "shuffling" : "")}>
            {[0, 1, 2].map((c) => (
              <div
                key={c}
                className={
                  "cup " +
                  (lifted &&
                  (c === p.tokenStart ||
                    (stage === "reveal" && positions[c] === choice))
                    ? "lifted"
                    : "")
                }
                style={{ left: `${positions[c] * 33.333}%` }}
              >
                {c === p.tokenStart && (
                  <span className="acorn">
                    <Mark index={5} size={28} />
                  </span>
                )}
                <svg
                  className="cup-cover"
                  viewBox="0 0 100 100"
                  aria-hidden="true"
                >
                  <path
                    d="M25 20h50l13 60H12Z"
                    fill="#4a5740"
                    stroke="#c4cba4"
                    strokeWidth="2"
                  />
                  <path
                    d="M30 26h40l7 36"
                    fill="none"
                    stroke="#a4ac86"
                    opacity=".5"
                  />
                </svg>
              </div>
            ))}
          </div>
          {stage === "ready" || stage === "reveal" ? (
            <button
              className="btn secondary"
              onClick={play}
              disabled={busy || tokenPending}
            >
              <Play size={16} />{" "}
              {stage === "reveal"
                ? "Replay the same shuffle"
                : "Follow the acorn"}
            </button>
          ) : (
            <p className="small muted">
              {stage === "watch"
                ? swapStep < 0
                  ? "The acorn begins here."
                  : `The cups move · ${swapStep + 1} of 5`
                : "Where is the acorn now?"}
            </p>
          )}
        </div>
      )}
      {(p.kind === "choice" ||
        ((p.kind === "memory" || p.kind === "token") &&
          stage === "answer")) && (
        <div
          className={
            "choices " +
            (p.matrixOptions || p.optionGroups ? "visual-choices" : "")
          }
        >
          {p.options!.map((option, i) => (
            <button
              key={i}
              aria-label={option}
              onClick={() => setChoice(i)}
              className={choice === i ? "selected" : ""}
              aria-pressed={choice === i}
            >
              <span className="option-number">
                {String.fromCharCode(65 + i)}
              </span>
              {p.matrixOptions ? (
                <MatrixSigil value={p.matrixOptions[i]} />
              ) : p.optionGroups ? (
                <SymbolGroup
                  values={p.optionGroups[i]}
                  polygons={p.family === "rule"}
                  labels={p.family === "witnesses"}
                />
              ) : (
                <Symbol name={option} />
              )}
              {choice === i && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
      {p.kind === "order" && (
        <>
          <div className="order-slots">
            {Array.from({ length: p.options!.length }, (_, i) => (
              <button
                key={i}
                aria-label={`Position ${i + 1}${order[i] ? ": " + order[i] : ", empty"}`}
                onClick={() => setOrder(order.filter((_, j) => j !== i))}
              >
                <small>{i + 1}</small>
                {order[i] ? <Symbol name={order[i]} /> : <span>·</span>}
              </button>
            ))}
          </div>
          <div className="order-options">
            {p.options!.map((o) => (
              <button
                key={o}
                disabled={order.includes(o)}
                onClick={() => setOrder([...order, o])}
              >
                <Symbol name={o} />
              </button>
            ))}
          </div>
        </>
      )}
      {(p.kind === "graph" || p.kind === "untangle") && (
        <>
          <svg
            ref={svg}
            className="graph"
            viewBox="0 0 420 290"
            onPointerMove={(e) => {
              if (drag.current !== null) {
                dragged.current = true;
                const pt = coords(e);
                if (p.kind === "untangle") {
                  setNodes(
                    nodes.map((n, i) =>
                      i === drag.current ? { ...n, ...pt } : n,
                    ),
                  );
                } else if (p.family === "sigil") {
                  const near = nodes.findIndex(
                    (n) => Math.hypot(n.x - pt.x, n.y - pt.y) < 25,
                  );
                  if (near >= 0 && near !== route.at(-1)) graphPoint(near);
                }
              }
            }}
            onPointerUp={(e) => {
              if (drag.current !== null) {
                drag.current = null;
                return;
              }
              if (
                p.kind === "untangle" &&
                active !== null &&
                e.target === e.currentTarget
              ) {
                const pt = coords(e);
                setNodes(
                  nodes.map((n, i) => (i === active ? { ...n, ...pt } : n)),
                );
                setActive(null);
              }
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
            aria-label={p.title}
          >
            {p.edges?.map(([a, b], i) => (
              <line
                key={i}
                x1={nodes[a].x}
                y1={nodes[a].y}
                x2={nodes[b].x}
                y2={nodes[b].y}
                stroke="currentColor"
                opacity=".3"
                strokeWidth="2"
              />
            ))}
            {route.slice(1).map((b, i) => (
              <line
                key={i}
                x1={nodes[route[i]].x}
                y1={nodes[route[i]].y}
                x2={nodes[b].x}
                y2={nodes[b].y}
                stroke="#d6bd79"
                strokeWidth="4"
              />
            ))}
            {nodes.map((n, i) => (
              <g
                key={i}
                tabIndex={0}
                role="button"
                aria-label={`${n.label}${p.start === i ? ", start" : ""}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    p.kind === "graph" ? graphPoint(i) : setActive(i);
                  }
                  if (p.kind === "untangle" && e.key.startsWith("Arrow")) {
                    e.preventDefault();
                    setNodes(
                      nodes.map((node, j) =>
                        j !== i
                          ? node
                          : {
                              ...node,
                              x: Math.max(
                                15,
                                Math.min(
                                  405,
                                  node.x +
                                    (e.key === "ArrowRight"
                                      ? 10
                                      : e.key === "ArrowLeft"
                                        ? -10
                                        : 0),
                                ),
                              ),
                              y: Math.max(
                                15,
                                Math.min(
                                  275,
                                  node.y +
                                    (e.key === "ArrowDown"
                                      ? 10
                                      : e.key === "ArrowUp"
                                        ? -10
                                        : 0),
                                ),
                              ),
                            },
                      ),
                    );
                  }
                }}
                onPointerDown={(e) => {
                  if (p.kind === "untangle") {
                    drag.current = i;
                    dragged.current = false;
                    setActive(i);
                    svg.current?.setPointerCapture(e.pointerId);
                  } else if (p.family === "sigil") {
                    graphPoint(i);
                    drag.current = i;
                    svg.current?.setPointerCapture(e.pointerId);
                  }
                }}
                onClick={() => {
                  if (p.family === "sigil") return;
                  if (p.kind === "graph") graphPoint(i);
                  else if (!dragged.current) setActive(i);
                }}
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={30}
                  fill="transparent"
                  stroke="none"
                />
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={
                    p.family === "constellation"
                      ? 6
                      : p.kind === "untangle"
                        ? 24
                        : 25
                  }
                  fill={
                    p.family === "constellation"
                      ? "#f0dfa4"
                      : route.includes(i) || active === i
                        ? "#b6ba87"
                        : "#20392b"
                  }
                  stroke={p.start === i ? "#dbca8f" : "#819674"}
                  strokeWidth={p.start === i ? 3 : 1.5}
                />
                <text
                  x={n.x}
                  y={n.y + (p.family === "constellation" ? 23 : 4)}
                  textAnchor="middle"
                  fill={
                    p.family !== "constellation" &&
                    (route.includes(i) || active === i)
                      ? "#142319"
                      : "#e3e5cb"
                  }
                  fontSize={n.label.length > 4 ? 10 : 13}
                >
                  {n.label}
                </text>
                {p.start === i && (
                  <text
                    x={n.x}
                    y={n.y - 32}
                    textAnchor="middle"
                    fill="#d2c490"
                    fontSize="10"
                  >
                    START
                  </text>
                )}
              </g>
            ))}
          </svg>
          {p.kind === "graph" && (
            <button
              className="text-button undo-route"
              disabled={!route.length}
              onClick={() => setRoute(route.slice(0, -1))}
            >
              Undo last star / point
            </button>
          )}
          {p.kind === "graph" && (
            <p className="small muted">
              {route.length
                ? route.map((i) => nodes[i].label).join(" → ")
                : "Begin at the marked starting point."}
            </p>
          )}
          {p.kind === "untangle" && (
            <p className="small muted">
              Seven stones, twelve threads. All crossings must disappear. Drag
              stones or select one and tap a new position.
            </p>
          )}
        </>
      )}
      {p.kind === "offering" && (
        <>
          <div className="offering-count">
            <span>{selected.length} / 3 offerings</span>
            <strong>
              {selected.reduce((s, i) => s + p.items![i].value, 0)} / {p.target}
            </strong>
          </div>
          <div className="offerings">
            {p.items!.map((item, i) => (
              <button
                key={i}
                className={selected.includes(i) ? "selected" : ""}
                aria-pressed={selected.includes(i)}
                onClick={() =>
                  setSelected(
                    selected.includes(i)
                      ? selected.filter((n) => n !== i)
                      : [...selected, i],
                  )
                }
              >
                <Mark index={marks.indexOf(item.label)} />
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </button>
            ))}
          </div>
        </>
      )}
      {p.kind === "lanterns" && (
        <div className="lanterns">
          {board.map((n, i) => (
            <button
              key={i}
              className={n ? "lit" : ""}
              aria-label={`Lantern ${i + 1}, ${n ? "lit" : "unlit"}`}
              onClick={() => {
                const b = [...board];
                for (const j of [
                  i,
                  i - 3,
                  i + 3,
                  ...(i % 3 > 0 ? [i - 1] : []),
                  ...(i % 3 < 2 ? [i + 1] : []),
                ])
                  if (j >= 0 && j < 9) b[j] = 1 - b[j];
                setBoard(b);
                setMoves([...moves, i]);
              }}
            >
              <Mark index={n ? 7 : 0} size={32} />
              <small>{n ? "LIT" : "UNLIT"}</small>
            </button>
          ))}
        </div>
      )}
      {p.kind === "seal" && !p.sealEdges && (
        <>
          <div className="seal-reference">
            <span>THE COMPLETE SEAL</span>
            <div>
              {p.symbols!.map((s, i) => (
                <div key={i}>
                  <i />
                  <Mark index={s} size={20} />
                </div>
              ))}
            </div>
          </div>
          <div className="seal-slots">
            {slots.map((piece, i) => (
              <button
                key={i}
                aria-label={`Seal slot ${i + 1}`}
                onClick={() => {
                  if (active !== null) {
                    setSlots(
                      slots.map((v, j) =>
                        j === i ? active : v === active ? null : v,
                      ),
                    );
                    setActive(null);
                  } else if (piece !== null) {
                    setSlots(slots.map((v, j) => (j === i ? null : v)));
                    setActive(piece);
                  }
                }}
              >
                {piece !== null ? (
                  <div
                    className="seal-piece"
                    style={{ transform: `rotate(${rotations[piece] * 90}deg)` }}
                  >
                    <i />
                    <Mark index={p.symbols![piece]} size={40} />
                  </div>
                ) : (
                  <span>{i + 1}</span>
                )}
              </button>
            ))}
          </div>
          <div className="seal-pieces">
            {p.pieces!.map((piece) => (
              <div key={piece}>
                <button
                  disabled={slots.includes(piece)}
                  className={active === piece ? "selected" : ""}
                  aria-label={`Select seal piece ${piece + 1}`}
                  onClick={() => setActive(piece)}
                >
                  <div
                    className="seal-piece"
                    style={{ transform: `rotate(${rotations[piece] * 90}deg)` }}
                  >
                    <i />
                    <Mark index={p.symbols![piece]} />
                  </div>
                </button>
                <button
                  className="rotate"
                  aria-label={`Rotate piece ${piece + 1}`}
                  onClick={() =>
                    setRotations(
                      rotations.map((r, i) => (i === piece ? (r + 1) % 4 : r)),
                    )
                  }
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {p.kind === "seal" && p.sealEdges && (
        <div className="edge-seal">
          <div className="edge-seal-board">
            {slots.map((piece, i) => (
              <button
                key={i}
                aria-label={`Seal slot ${i + 1}${i === 0 ? ", anchored" : ""}`}
                disabled={i === 0}
                onClick={() => {
                  if (active !== null) {
                    setSlots(
                      slots.map((v, j) =>
                        j === i ? active : v === active ? null : v,
                      ),
                    );
                    setActive(null);
                  } else if (piece !== null) {
                    setSlots(slots.map((v, j) => (j === i ? null : v)));
                    setActive(piece);
                  }
                }}
              >
                {piece === null ? (
                  <span>{i + 1}</span>
                ) : (
                  <Shard
                    edges={p.sealEdges![piece]}
                    rotation={rotations[piece]}
                  />
                )}
              </button>
            ))}
          </div>
          <p className="small muted">
            {active === null
              ? "Choose a loose shard below."
              : "Shard selected. Rotate it or tap an empty space."}
          </p>
          <div className="edge-seal-tray">
            {p.pieces!.map((piece) => (
              <div key={piece}>
                <button
                  className={active === piece ? "selected" : ""}
                  disabled={slots.includes(piece)}
                  aria-label={`Select shard ${piece + 1}`}
                  onClick={() => setActive(piece)}
                >
                  <Shard
                    edges={p.sealEdges![piece]}
                    rotation={rotations[piece]}
                  />
                </button>
                <button
                  className="rotate"
                  aria-label={`Rotate shard ${piece + 1}`}
                  onClick={() =>
                    setRotations(
                      rotations.map((r, i) => (i === piece ? (r + 1) % 4 : r)),
                    )
                  }
                >
                  <RotateCcw size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="puzzle-actions">
        <button
          className="text-button"
          onClick={reset}
          disabled={busy || tokenPending}
        >
          <RotateCcw size={14} /> Reset trial
        </button>
        <button
          className="btn"
          disabled={
            busy ||
            tokenPending ||
            (["choice", "reflection", "memory", "token"].includes(p.kind) &&
              choice === null) ||
            (p.kind === "order" && order.length !== p.options!.length) ||
            ((p.kind === "graph" || p.kind === "maze") && route.length < 2) ||
            (p.kind === "token" && stage !== "answer") ||
            (p.kind === "offering" && selected.length !== 3) ||
            (p.kind === "seal" && slots.some((s) => s === null))
          }
          onClick={() =>
            void submit(
              p.kind === "order"
                ? order
                : p.kind === "graph" || p.kind === "maze"
                  ? route
                  : p.kind === "offering"
                    ? selected
                    : p.kind === "seal"
                      ? { slots, rotations }
                      : p.kind === "lanterns"
                        ? moves
                        : p.kind === "untangle"
                          ? nodes
                          : choice,
            )
          }
        >
          {busy
            ? "Listening…"
            : p.kind === "token"
              ? "Lift the cup"
              : "Offer your answer"}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
