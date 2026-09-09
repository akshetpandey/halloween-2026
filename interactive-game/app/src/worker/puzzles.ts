import {
  marks,
  familyNames,
  type Assignment,
  type Family,
  type PuzzleView,
  type Point,
  type WitnessClue,
} from "../shared/types";
export const PUZZLE_VERSION = 2;
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
    const items = symbols.slice(0, 3);
    const cases = permutations([0, 1, 2]);
    const pool: WitnessClue[] = [];
    for (let a = 0; a < 3; a++)
      for (let b = 0; b < 3; b++) {
        pool.push({ kind: "holds", a, b }, { kind: "not", a, b });
        if (a !== b)
          pool.push({ kind: "left", a, b }, { kind: "beside", a, b });
      }
    let clues: WitnessClue[] = [],
      solutions: number[][] = [];
    for (let trial = 0; trial < 3000; trial++) {
      clues = shuffle(pool).slice(0, 3);
      if (!clues.some((c) => c.kind === "left" || c.kind === "beside"))
        continue;
      const masks = clues.map((c) =>
        cases.map((x) => +witnessTruth(c, x)).join(""),
      );
      if (new Set(masks).size !== 3) continue;
      solutions = cases.filter(
        (x) => clues.filter((c) => witnessTruth(c, x)).length === 2,
      );
      if (
        solutions.length === 1 &&
        clues.every(
          (_, skip) =>
            cases.filter((x) => {
              const truths = clues.filter(
                (c, j) => j !== skip && witnessTruth(c, x),
              ).length;
              return truths === 1 || truths === 2;
            }).length > 1,
        )
      )
        break;
    }
    if (solutions.length !== 1) throw Error("Witness construction failed");
    const choices = shuffle([
      solutions[0],
      ...shuffle(cases.filter((x) => x.join() !== solutions[0].join())).slice(
        0,
        3,
      ),
    ]);
    const people = ["Fox", "Hare", "Raven"];
    v.witnessMarks = items;
    v.witnessClues = clues;
    v.optionGroups = choices.map((x) => x.map((i) => items[i]));
    v.options = choices.map((x) =>
      x.map((item, i) => `${people[i]}: ${marks[items[item]]}`).join(" · "),
    );
    v.text = clues.map(
      (c, i) =>
        `${["The ash", "The yew", "The elder"][i]} whispers: “${
          c.kind === "holds"
            ? `${people[c.a]} carries the ${marks[items[c.b]]}`
            : c.kind === "not"
              ? `${people[c.a]} does not carry the ${marks[items[c.b]]}`
              : `The ${marks[items[c.a]]} is ${c.kind === "left" ? "somewhere to the left of" : "beside"} the ${marks[items[c.b]]}`
        }. ”`,
    );
    v.instructions = `Fox, Hare and Raven stand left to right. Each carries one different mark: ${items.map((i) => marks[i]).join(", ")}. Exactly TWO statements are true and ONE is a lie. Who carries what?`;
    answer = choices.findIndex((x) => x.join() === solutions[0].join());
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
    v.matrixOptions = choices;
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
    let turns = [1 + int(6), 1 + int(6), 1 + int(6)];
    while (
      (turns[0] - turns[1] + turns[2] + 16) % 8 === 0 ||
      turns[0] === turns[1] ||
      turns[1] === turns[2]
    )
      turns = [1 + int(6), 1 + int(6), 1 + int(6)];
    const origin = int(8),
      net = turns[0] - turns[1] + turns[2];
    v.text = [
      `1. Rotate ${turns[0]} places clockwise.`,
      `2. Rotate ${turns[1]} places counterclockwise.`,
      `3. Rotate ${turns[2]} places clockwise.`,
    ];
    v.instructions = `Apply all three turns to the wheel. Which mark finishes in the place currently occupied by ${marks[symbols[origin]]}?`;
    const correct = marks[symbols[(origin - net + 24) % 8]];
    v.options = shuffle([
      correct,
      ...shuffle(marks.filter((m) => m !== correct)).slice(0, 3),
    ]);
    answer = v.options.indexOf(correct);
  } else if (family === "rule") {
    const mode = int(3),
      groups = [] as number[][];
    for (let a = 3; a <= 8; a++)
      for (let b = 3; b <= 8; b++)
        for (let c = 3; c <= 8; c++) groups.push([a, b, c]);
    const good = shuffle(groups.filter((g) => edgeRule(mode, g))),
      bad = shuffle(groups.filter((g) => !edgeRule(mode, g)));
    let examples = [
      ...good.slice(0, 3).map((shapes) => ({ accepted: true, shapes })),
      ...bad.slice(0, 3).map((shapes) => ({ accepted: false, shapes })),
    ];
    // Include counterexamples until the supported arithmetic rules are distinguished.
    for (let other = 0; other < 3; other++)
      if (
        other !== mode &&
        examples.every((e) => edgeRule(other, e.shapes) === e.accepted)
      ) {
        const g = groups.find((g) => edgeRule(other, g) !== edgeRule(mode, g))!;
        examples.push({ accepted: edgeRule(mode, g), shapes: g });
      }
    v.ruleExamples = examples;
    v.optionGroups = shuffle([good[3], ...bad.slice(3, 6)]);
    v.options = v.optionGroups.map((g) =>
      g.map((n) => `${n}-sided shape`).join(" · "),
    );
    answer = v.optionGroups.findIndex((g) => edgeRule(mode, g));
    v.instructions =
      "Count the straight edges. One arithmetic rule links the three shapes in every accepted group. Which new group obeys it?";
  } else if (family === "thorns") {
    v.kind = "maze";
    const width = 5,
      height = 6,
      n = width * height;
    let paths: number[][] = [],
      thorns: number[] = [],
      openings: number[][] = [],
      chosen: number[] | undefined;
    for (let attempt = 0; attempt < 500 && !chosen; attempt++) {
      openings = [];
      const visited = new Set([0]),
        stack = [0];
      while (stack.length) {
        const a = stack.at(-1)!;
        const next = shuffle(
          [
            a - width,
            a + width,
            ...(a % width ? [a - 1] : []),
            ...(a % width < width - 1 ? [a + 1] : []),
          ].filter((b) => b >= 0 && b < n && !visited.has(b)),
        );
        if (!next.length) {
          stack.pop();
          continue;
        }
        openings.push([a, next[0]]);
        visited.add(next[0]);
        stack.push(next[0]);
      }
      const extra: number[][] = [];
      for (let a = 0; a < n; a++)
        for (const b of [a + width, ...(a % width < width - 1 ? [a + 1] : [])])
          if (b < n && !openings.some((e) => e.includes(a) && e.includes(b)))
            extra.push([a, b]);
      openings.push(...shuffle(extra).slice(0, 2));
      paths = mazePaths(openings, 0, n - 1);
      if (paths.length < 2) continue;
      thorns = Array.from({ length: n }, (_, i) =>
        i !== 0 && i !== n - 1 && random() < 0.22 ? 1 : 0,
      );
      const sums = paths.map((path) =>
        path.reduce((sum, i) => sum + thorns[i], 0),
      );
      const candidates = paths.filter(
        (path, i) =>
          path.length >= 12 &&
          sums[i] >= 2 &&
          sums[i] <= 5 &&
          sums.filter((x) => x === sums[i]).length === 1,
      );
      chosen = shuffle(candidates)[0];
    }
    if (!chosen) throw Error("Maze construction failed");
    v.maze = { width, height, openings, thorns };
    v.start = 0;
    v.end = n - 1;
    v.target = chosen.reduce((sum, i) => sum + thorns[i], 0);
    v.instructions = `Find the exit through the walls, crossing exactly ${v.target} thorn patches. Tap neighboring squares or drag along the path. No revisiting squares; tap your previous square to backtrack.`;
    answer = chosen;
  } else if (family === "constellation") {
    v.kind = "graph";
    const pattern = constellations[int(constellations.length)];
    const angle = int(2) * Math.PI,
      scale = 0.9 + random() * 0.08;
    const points = pattern.points.map(([x, y], i) => ({
      x,
      y,
      label: String(i + 1),
    }));
    const rotate = (p: Point) => ({
      x:
        210 +
        ((p.x - 210) * Math.cos(angle) - (p.y - 145) * Math.sin(angle)) * scale,
      y:
        145 +
        ((p.x - 210) * Math.sin(angle) + (p.y - 145) * Math.cos(angle)) * scale,
      label: p.label,
    });
    const stars = points.map(rotate);
    for (let i = 0; i < 3; i++) {
      let node: Point;
      do {
        node = { x: 35 + int(350), y: 30 + int(230), label: "" };
      } while (stars.some((s) => Math.hypot(s.x - node.x, s.y - node.y) < 58));
      stars.push(node);
    }
    const order = shuffle(stars.map((_, i) => i));
    v.nodes = order.map((old, i) => ({
      ...stars[old],
      label: String.fromCharCode(65 + i),
    }));
    answer = points.map((_, i) => order.indexOf(i));
    v.start = (answer as number[])[0];
    v.count = points.length;
    v.constellation = {
      name: pattern.name,
      points,
      route: points.map((_, i) => i),
    };
    v.instructions = `Find ${pattern.name} among the stray stars. Start at ${v.nodes[v.start].label} and copy the numbered chart in order (${points.length} stars). The sky may be rotated; its proportions stay the same.`;
  } else if (family === "offering") {
    v.kind = "offering";
    let values: number[] = [],
      choices: number[][] = [],
      indices: number[] | undefined;
    while (!indices) {
      values = shuffle(Array.from({ length: 12 }, (_, i) => i + 4)).slice(0, 6);
      choices = [];
      for (let a = 0; a < 4; a++)
        for (let b = a + 1; b < 5; b++)
          for (let c = b + 1; c < 6; c++) choices.push([a, b, c]);
      const sums = choices.map((g) => g.reduce((sum, i) => sum + values[i], 0));
      const sorted = [...sums].sort((a, b) => a - b),
        middle = sorted[Math.floor(sorted.length / 2)];
      indices = shuffle(
        choices.filter(
          (g, i) =>
            sums.filter((x) => x === sums[i]).length === 1 &&
            Math.abs(sums[i] - middle) <= 3 &&
            g.some((j) => values[j] % 2 === 0) &&
            g.some((j) => values[j] % 2 !== 0),
        ),
      )[0];
    }
    v.items = values.map((value, i) => ({ label: marks[symbols[i]], value }));
    v.target = indices.reduce((sum, i) => sum + values[i], 0);
    v.count = 3;
    v.instructions = `Choose exactly three offerings totaling ${v.target}. Each offering can be used only once.`;
    answer = indices;
  } else if (family === "seal") {
    v.kind = "seal";
    const edges = shuffle([1, 2, 3, 4, 5, 6, 7]);
    v.sealEdges = [
      [0, edges[0], edges[4], 0],
      [0, edges[1], edges[5], edges[0]],
      [0, 0, edges[6], edges[1]],
      [edges[4], edges[2], 0, 0],
      [edges[5], edges[3], 0, edges[2]],
      [edges[6], 0, 0, edges[3]],
    ];
    v.pieces = shuffle([1, 2, 3, 4, 5]);
    v.rotations = [0, ...Array.from({ length: 5 }, () => 1 + int(3))];
    v.instructions =
      "Rebuild the six-shard seal. Matching runes must meet along every shared edge; bare edges face outside. The upper-left shard is anchored. Choose a shard, rotate it, then tap a space.";
    answer = { slots: [0, 1, 2, 3, 4, 5], rotations: [0, 0, 0, 0, 0, 0] };
  } else if (family === "lanterns") {
    v.kind = "lanterns";
    v.size = 3;
    let moves: number[];
    do {
      v.board = Array(9).fill(1);
      moves = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 3 + int(3));
      for (const i of moves) toggle(v.board, i);
    } while (v.board.every((n) => n === 0) || v.board.every((n) => n === 1));
    v.instructions =
      "Wake all nine lanterns. Tapping a lantern changes it and its immediate neighbors above, below, left and right. Reset anytime.";
    answer = moves;
  } else if (family === "token") {
    v.kind = "token";
    v.tokenStart = 0;
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
    const n = 7;
    const clean = Array.from({ length: 6 }, (_, i) => ({
      x: 210 + 145 * Math.cos((i * Math.PI) / 3),
      y: 145 + 105 * Math.sin((i * Math.PI) / 3),
      label: String(i + 1),
    }));
    clean.push({ x: 210, y: 145, label: "7" });
    v.edges = Array.from({ length: 6 }, (_, i) => [i, (i + 1) % 6]);
    v.edges.push(...Array.from({ length: 6 }, (_, i) => [i, 6]));
    do {
      v.nodes = shuffle(clean).map((point, i) => ({
        ...point,
        label: String(i + 1),
      }));
    } while (
      crossingPairs(v.nodes, v.edges).length < 6 ||
      Array.from({ length: n }, (_, i) => i).some(
        (i) =>
          !hasCrossings(
            v.nodes!,
            v.edges!.filter((e) => !e.includes(i)),
          ),
      )
    );
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
export function crossingPairs(nodes: Point[], edges: number[][]) {
  const result: number[][] = [];
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
        Math.max(p.x, q.x) < Math.min(r.x, s.x) ||
        Math.max(r.x, s.x) < Math.min(p.x, q.x) ||
        Math.max(p.y, q.y) < Math.min(r.y, s.y) ||
        Math.max(r.y, s.y) < Math.min(p.y, q.y)
      )
        continue;
      if (
        orient(p, q, r) * orient(p, q, s) <= 0 &&
        orient(r, s, p) * orient(r, s, q) <= 0
      )
        result.push([i, j]);
    }
  return result;
}
export function hasCrossings(nodes: Point[], edges: number[][]) {
  return crossingPairs(nodes, edges).length > 0;
}
export function segmentDistance(p: Point, a: Point, b: Point) {
  const length = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / length,
    ),
  );
  return Math.hypot(p.x - a.x - t * (b.x - a.x), p.y - a.y - t * (b.y - a.y));
}
export function permutations(a: number[]): number[][] {
  return a.length
    ? a.flatMap((n, i) =>
        permutations(a.filter((_, j) => j !== i)).map((t) => [n, ...t]),
      )
    : [[]];
}
export function witnessTruth(c: WitnessClue, assignment: number[]) {
  if (c.kind === "holds") return assignment[c.a] === c.b;
  if (c.kind === "not") return assignment[c.a] !== c.b;
  const a = assignment.indexOf(c.a),
    b = assignment.indexOf(c.b);
  return c.kind === "left" ? a < b : Math.abs(a - b) === 1;
}
export function edgeRule(mode: number, [a, b, c]: number[]) {
  return mode === 0
    ? a + c === 2 * b
    : mode === 1
      ? a + c === b
      : a + b + c === 12;
}
export function mazePaths(edges: number[][], start: number, end: number) {
  const paths: number[][] = [];
  function walk(route: number[]) {
    const a = route.at(-1)!;
    if (a === end) {
      paths.push(route);
      return;
    }
    for (const e of edges) {
      if (!e.includes(a)) continue;
      const b = e[0] === a ? e[1] : e[0];
      if (!route.includes(b)) walk([...route, b]);
    }
  }
  walk([start]);
  return paths;
}
export function validSeal(edges: number[][], input: unknown) {
  if (
    !input ||
    typeof input !== "object" ||
    !("slots" in input) ||
    !("rotations" in input)
  )
    return false;
  const { slots, rotations } = input;
  if (
    !Array.isArray(slots) ||
    !Array.isArray(rotations) ||
    slots.length !== 6 ||
    rotations.length !== 6 ||
    new Set(slots).size !== 6 ||
    !slots.every((i) => Number.isInteger(i) && i >= 0 && i < 6) ||
    !rotations.every((i) => Number.isInteger(i) && i >= 0 && i < 4) ||
    slots[0] !== 0 ||
    rotations[0] !== 0
  )
    return false;
  const at = (slot: number, side: number) =>
    edges[slots[slot]][(side - rotations[slots[slot]] + 4) % 4];
  for (let i = 0; i < 6; i++)
    for (let side = 0; side < 4; side++) {
      const neighbor =
        side === 0
          ? i >= 3
            ? i - 3
            : -1
          : side === 1
            ? i % 3 < 2
              ? i + 1
              : -1
            : side === 2
              ? i < 3
                ? i + 3
                : -1
              : i % 3
                ? i - 1
                : -1;
      if (
        neighbor < 0
          ? at(i, side) !== 0
          : at(i, side) === 0 || at(i, side) !== at(neighbor, (side + 2) % 4)
      )
        return false;
    }
  return true;
}
// Simplified proportional star patterns, oriented for play; see design/puzzle-revision-2026-09-09.md.
export const constellations = [
  {
    name: "Cassiopeia",
    points: [
      [40, 60],
      [120, 220],
      [205, 95],
      [285, 195],
      [375, 50],
    ],
  },
  {
    name: "Corona Borealis",
    points: [
      [55, 55],
      [75, 130],
      [130, 205],
      [205, 235],
      [285, 215],
      [340, 145],
      [365, 65],
    ],
  },
];
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
  if (v.kind === "seal" && v.sealEdges) return validSeal(v.sealEdges, input);
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
    // A stone cannot hide a thread passing through it; extensions beyond endpoints are fine.
    for (const [a, b] of v.edges!)
      for (let c = 0; c < points.length; c++)
        if (
          c !== a &&
          c !== b &&
          segmentDistance(points[c], points[a], points[b]) < 10
        )
          return false;
    return !hasCrossings(points, v.edges!);
  }
  if (v.kind === "maze") {
    if (
      !Array.isArray(input) ||
      input[0] !== v.start ||
      input.at(-1) !== v.end ||
      new Set(input).size !== input.length ||
      !input.every(
        (i) => Number.isInteger(i) && i >= 0 && i < v.maze!.thorns.length,
      )
    )
      return false;
    return (
      input
        .slice(1)
        .every((b, j) =>
          v.maze!.openings.some((e) => e.includes(input[j]) && e.includes(b)),
        ) && input.reduce((sum, i) => sum + v.maze!.thorns[i], 0) === v.target
    );
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
