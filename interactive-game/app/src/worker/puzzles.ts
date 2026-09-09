import {
  marks,
  familyNames,
  type Assignment,
  type Family,
  type PuzzleView,
  type Point,
} from "../shared/types";
export const PUZZLE_VERSION = 1;
function rng(seed: string) {
  let n = 2166136261;
  for (const c of seed) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return () => {
    n += 0x6d2b79f5;
    let t = Math.imul(n ^ (n >>> 15), n | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function generate(family: Family, seed: string): Assignment {
  const random = rng(seed),
    int = (n: number) => Math.floor(random() * n),
    shuffle = <T>(a: readonly T[]) => {
      const b = [...a];
      for (let i = b.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [b[i], b[j]] = [b[j], b[i]];
      }
      return b;
    };
  const symbols = shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
  let answer: unknown;
  const v: PuzzleView = {
    family,
    title: familyNames[family],
    instructions: "",
    kind: "choice",
  };
  if (family === "witnesses") {
    const opts = symbols.slice(0, 4).map((i) => marks[i]);
    let statements: { i: number; not: boolean }[] = [];
    let valid: number[] = [];
    for (let tries = 0; tries < 1000; tries++) {
      statements = Array.from({ length: 3 }, () => ({
        i: int(4),
        not: random() < 0.5,
      }));
      valid = [0, 1, 2, 3].filter(
        (c) =>
          statements.filter((s) => (s.not ? c !== s.i : c === s.i)).length ===
          1,
      );
      if (valid.length === 1) break;
    }
    if (valid.length !== 1) throw Error("Witness construction failed");
    v.options = opts;
    v.text = statements.map(
      (s, i) =>
        `${["The first", "The second", "The third"][i]} witness: “The hidden mark is ${s.not ? "not " : ""}${opts[s.i]}.”`,
    );
    v.instructions =
      "Exactly one witness tells the truth. Which mark is hidden?";
    answer = valid[0];
  } else if (family === "matrix") {
    const shapes = shuffle(symbols).slice(0, 3),
      dots = shuffle([0, 1, 2]);
    v.grid = Array.from(
      { length: 9 },
      (_, i) => shapes[i % 3] * 3 + dots[Math.floor(i / 3)],
    );
    const missing = int(9),
      correct = v.grid[missing];
    v.grid[missing] = -1;
    const choices = shuffle([
      correct,
      ...shuffle(
        Array.from({ length: 24 }, (_, i) => i).filter((i) => i !== correct),
      ).slice(0, 3),
    ]);
    v.options = choices.map(
      (n) =>
        `${marks[Math.floor(n / 3)]} · ${(n % 3) + 1} ${n % 3 === 0 ? "dot" : "dots"}`,
    );
    answer = choices.indexOf(correct);
    v.instructions =
      "Each row and column follows a pattern of marks and dots. Which sigil belongs in the empty space?";
  } else if (family === "procession") {
    const order = shuffle(symbols.slice(0, 5)).map((i) => marks[i]);
    v.kind = "order";
    v.options = shuffle(order);
    v.text = shuffle(
      order
        .slice(1)
        .map((n, i) => `${order[i]} stands immediately before ${n}.`),
    );
    v.instructions =
      "Arrange the five visitors from first to last. Tap a visitor to place it; tap a placed visitor to undo.";
    answer = order;
  } else if (family === "vision") {
    v.kind = "memory";
    v.symbols = symbols.slice(0, 6);
    const index = [0, 1, 3, 4][int(4)];
    const correct = marks[v.symbols[index + 1]];
    v.question = `Which mark was immediately to the right of ${marks[v.symbols[index]]}?`;
    v.options = shuffle(v.symbols.map((i) => marks[i])).slice(0, 4);
    if (!v.options.includes(correct)) v.options[0] = correct;
    v.options = shuffle(v.options);
    answer = v.options.indexOf(correct);
    v.instructions =
      "Watch six marks for five seconds. A question follows. You can replay the same vision.";
  } else if (family === "reflection") {
    v.kind = "reflection";
    v.grid = Array.from({ length: 9 }, () => int(8));
    v.mirror = Array.from(
      { length: 9 },
      (_, i) => v.grid![Math.floor(i / 3) * 3 + 2 - (i % 3)],
    );
    const index = int(9);
    v.mirror[index] = (v.mirror[index] + 1 + int(7)) % 8;
    answer = index;
    v.instructions =
      "The right panel claims to be a left-to-right reflection. Tap its one false mark.";
  } else if (family === "wheel") {
    v.symbols = symbols;
    const turns = 1 + int(6);
    const origin = int(8);
    v.instructions = `The wheel turns ${turns} places clockwise. Which mark ends in the position currently occupied by ${marks[symbols[origin]]}?`;
    const correct = marks[symbols[(origin - turns + 8) % 8]];
    v.options = shuffle([
      correct,
      ...shuffle(marks.filter((m) => m !== correct)).slice(0, 3),
    ]);
    answer = v.options.indexOf(correct);
  } else if (family === "rule") {
    const mode = int(3);
    const accepted = (a: number[]) =>
      mode === 0
        ? a[0] === a[2] && a[0] !== a[1]
        : mode === 1
          ? new Set(a).size === 3
          : a[0] === a[1] && a[1] === a[2];
    const groups: number[][] = [];
    while (groups.length < 8) {
      const a = Array.from({ length: 3 }, () => int(8));
      if (
        !groups.some((g) => g.join() == a.join()) &&
        accepted(a) === groups.length < 4
      )
        groups.push(a);
    }
    v.text = [
      ...groups
        .slice(0, 3)
        .map((g) => "Accepted: " + g.map((i) => marks[i]).join(" · ")),
      ...groups
        .slice(4, 7)
        .map((g) => "Refused: " + g.map((i) => marks[i]).join(" · ")),
    ];
    const correct = groups[3].map((i) => marks[i]).join(" · ");
    let bad: string[] = [];
    while (bad.length < 3) {
      const a = Array.from({ length: 3 }, () => int(8)),
        s = a.map((i) => marks[i]).join(" · ");
      if (!accepted(a) && !bad.includes(s)) bad.push(s);
    }
    v.options = shuffle([correct, ...bad]);
    answer = v.options.indexOf(correct);
    v.instructions =
      "The examples follow one law about matching marks. Which new group will be accepted?";
  } else if (family === "thorns") {
    v.kind = "graph";
    v.nodes = [{ x: 25, y: 140, label: "Gate" }];
    v.edges = [];
    let route = [0];
    let sum = 0;
    let previous = 0;
    const weights = shuffle([1, 2, 4]);
    for (let d = 0; d < 3; d++) {
      const upper = v.nodes.length,
        lower = upper + 1,
        merge = upper + 2,
        x = 85 + d * 110;
      const high = weights[d];
      const topHigh = random() < 0.5;
      v.nodes.push(
        {
          x,
          y: 65,
          label: String(topHigh ? high : 0),
          weight: topHigh ? high : 0,
        },
        {
          x,
          y: 215,
          label: String(topHigh ? 0 : high),
          weight: topHigh ? 0 : high,
        },
        { x: x + 55, y: 140, label: d === 2 ? "Home" : "•" },
      );
      v.edges.push(
        [previous, upper],
        [previous, lower],
        [upper, merge],
        [lower, merge],
      );
      const chosen = random() < 0.5 ? upper : lower;
      route.push(chosen, merge);
      sum += v.nodes[chosen].weight!;
      previous = merge;
    }
    v.start = 0;
    v.end = 9;
    v.target = sum;
    v.instructions = `Go from Gate to Home, moving only right. Cross exactly ${sum} thorns in total; the numbers show each branch's thorns. Tap successive stones.`;
    answer = route;
  } else if (family === "constellation") {
    v.kind = "graph";
    v.start = int(6);
    let route: number[] = [];
    let unambiguous = false;
    while (!unambiguous) {
      v.nodes = symbols
        .slice(0, 6)
        .map((n, i) => ({
          x: 35 + (i % 3) * 130 + int(60),
          y: 45 + Math.floor(i / 3) * 140 + int(60),
          label: marks[n],
        }));
      route = [v.start];
      let current = v.start;
      unambiguous = true;
      while (route.length < 4) {
        const candidates = v.nodes
          .map((p, i) => ({
            i,
            d: Math.hypot(p.x - v.nodes![current].x, p.y - v.nodes![current].y),
          }))
          .filter((p) => !route.includes(p.i))
          .sort((a, b) => a.d - b.d);
        if (candidates[1].d - candidates[0].d < 14) {
          unambiguous = false;
          break;
        }
        current = candidates[0].i;
        route.push(current);
      }
    }
    v.instructions = `Start at ${v.nodes![v.start].label}. Connect to the nearest unvisited star, then repeat twice more (four stars total).`;
    answer = route;
  } else if (family === "offering") {
    v.kind = "offering";
    v.items = shuffle([1, 2, 4, 8, 16, 32]).map((value, i) => ({
      label: marks[symbols[i]],
      value,
    }));
    const indices = shuffle([0, 1, 2, 3, 4, 5])
      .slice(0, 3)
      .sort((a, b) => a - b);
    v.target = indices.reduce((s, i) => s + v.items![i].value, 0);
    v.count = 3;
    v.instructions = `Choose exactly three offerings whose values total ${v.target}.`;
    answer = indices;
  } else if (family === "seal") {
    v.kind = "seal";
    v.symbols = symbols.slice(0, 4);
    v.pieces = shuffle([0, 1, 2, 3]);
    v.rotations = Array.from({ length: 4 }, () => int(4));
    v.instructions =
      "Restore the seal to match the small reference. Select a piece, then its slot. Rotate pieces with the turn buttons; the small notch points upward in the finished seal.";
    answer = [0, 1, 2, 3];
  } else if (family === "lanterns") {
    v.kind = "lanterns";
    v.size = 3;
    v.board = Array(9).fill(1);
    const moves = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 1 + int(3));
    for (const i of moves) toggle(v.board, i);
    v.instructions =
      "Wake all nine lanterns. Tapping a lantern changes it and its immediate neighbors above, below, left and right. Reset anytime.";
    answer = moves;
  } else if (family === "token") {
    v.kind = "token";
    v.tokenStart = int(3);
    let pos = v.tokenStart;
    v.swaps = Array.from({ length: 5 }, () => shuffle([0, 1, 2]).slice(0, 2));
    for (const [a, b] of v.swaps) {
      if (pos === a) pos = b;
      else if (pos === b) pos = a;
    }
    v.options = ["Left", "Middle", "Right"];
    v.instructions =
      "Watch the acorn beneath three cups. Follow it through five swaps, then choose its final place. Replay the same shuffle anytime.";
    answer = pos;
  } else if (family === "sigil") {
    v.kind = "graph";
    const n = 5 + int(2);
    v.nodes = Array.from({ length: n }, (_, i) => ({
      x: 210 + 145 * Math.cos((i * 2 * Math.PI) / n),
      y: 145 + 105 * Math.sin((i * 2 * Math.PI) / n),
      label: String(i + 1),
    }));
    const route = shuffle(Array.from({ length: n }, (_, i) => i));
    route.push(route[0]);
    v.edges = route.slice(1).map((b, i) => [route[i], b]);
    // One extra chord creates exactly two odd vertices, with a valid Euler trail.
    const a = route[0],
      b = route[2];
    v.edges.push([a, b]);
    v.start = a;
    v.end = b;
    answer = [...route, b];
    v.instructions = `Start at ${a + 1}. Trace each line exactly once, ending at ${b + 1}. Tap connected points for a forgiving alternative to tracing. Nodes may be revisited; lines may not.`;
  } else if (family === "untangle") {
    v.kind = "untangle";
    const n = 5 + int(2);
    const clean = Array.from({ length: n }, (_, i) => ({
      x: 210 + 145 * Math.cos((i * 2 * Math.PI) / n),
      y: 145 + 105 * Math.sin((i * 2 * Math.PI) / n),
      label: String(i + 1),
    }));
    v.edges = clean.map((_, i) => [i, (i + 1) % n]);
    v.edges.push([0, 2]);
    v.nodes = shuffle(clean).map((p, i) => ({ ...p, label: String(i + 1) }));
    while (!hasCrossings(v.nodes, v.edges))
      v.nodes = shuffle(clean).map((p, i) => ({ ...p, label: String(i + 1) }));
    v.instructions =
      "Move the stones until none of the threads cross. Drag a stone, or select it and tap a new position. Keep the stones apart.";
    answer = clean;
  }
  return { version: PUZZLE_VERSION, view: v, answer };
}
export function toggle(board: number[], i: number) {
  for (const j of [
    i,
    i - 3,
    i + 3,
    ...(i % 3 > 0 ? [i - 1] : []),
    ...(i % 3 < 2 ? [i + 1] : []),
  ])
    if (j >= 0 && j < 9) board[j] = 1 - board[j];
}
function orient(a: Point, b: Point, c: Point) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}
export function hasCrossings(nodes: Point[], edges: number[][]) {
  for (let i = 0; i < edges.length; i++)
    for (let j = i + 1; j < edges.length; j++) {
      const [a, b] = edges[i],
        [c, d] = edges[j];
      if (new Set([a, b, c, d]).size < 4) continue;
      const p = nodes[a],
        q = nodes[b],
        r = nodes[c],
        s = nodes[d];
      if (
        orient(p, q, r) * orient(p, q, s) <= 0 &&
        orient(r, s, p) * orient(r, s, q) <= 0
      )
        return true;
    }
  return false;
}
export function validate(p: Assignment, input: unknown): boolean {
  const v = p.view;
  if (v.kind === "lanterns") {
    if (
      !Array.isArray(input) ||
      input.length > 1000 ||
      !input.every((n) => Number.isInteger(n) && n >= 0 && n < 9)
    )
      return false;
    const board = [...v.board!];
    for (const i of input) toggle(board, i);
    return board.every((n) => n === 1);
  }
  if (v.kind === "seal")
    return (
      typeof input === "object" &&
      input !== null &&
      "slots" in input &&
      "rotations" in input &&
      JSON.stringify(input.slots) === "[0,1,2,3]" &&
      Array.isArray(input.rotations) &&
      input.rotations.length === 4 &&
      input.rotations.every((n) => n === 0)
    );
  if (v.kind === "untangle") {
    if (!Array.isArray(input) || input.length !== v.nodes!.length) return false;
    if (
      !input.every(
        (p) =>
          p &&
          typeof p.x === "number" &&
          Number.isFinite(p.x) &&
          p.x >= 12 &&
          p.x <= 408 &&
          typeof p.y === "number" &&
          Number.isFinite(p.y) &&
          p.y >= 12 &&
          p.y <= 278,
      )
    )
      return false;
    const points = input as Point[];
    if (
      points.some((a, i) =>
        points.some((b, j) => i !== j && Math.hypot(a.x - b.x, a.y - b.y) < 28),
      )
    )
      return false;
    // Prevent collinear nodes hiding a non-adjacent edge.
    for (const [a, b] of v.edges!)
      for (let c = 0; c < points.length; c++)
        if (
          c !== a &&
          c !== b &&
          Math.abs(orient(points[a], points[b], points[c])) < 0.1
        )
          return false;
    return !hasCrossings(points, v.edges!);
  }
  if (v.family === "sigil") {
    if (
      !Array.isArray(input) ||
      input.length !== v.edges!.length + 1 ||
      input[0] !== v.start ||
      input.at(-1) !== v.end ||
      !input.every((n) => Number.isInteger(n) && n >= 0 && n < v.nodes!.length)
    )
      return false;
    const remaining = v.edges!.map((e) => [...e].sort().join(","));
    for (let i = 1; i < input.length; i++) {
      const key = [input[i - 1], input[i]].sort().join(","),
        index = remaining.indexOf(key);
      if (index < 0) return false;
      remaining.splice(index, 1);
    }
    return remaining.length === 0;
  }
  if (v.kind === "offering")
    return (
      Array.isArray(input) &&
      JSON.stringify([...input].sort((a, b) => a - b)) ===
        JSON.stringify(p.answer)
    );
  return JSON.stringify(input) === JSON.stringify(p.answer);
}
