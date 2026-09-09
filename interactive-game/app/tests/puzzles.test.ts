import { describe, it, expect } from "vitest";
import {
  generate,
  validate,
  toggle,
  hasCrossings,
  permutations,
  mazePaths,
  edgeRule,
  crossingPairs,
  validSeal,
} from "../src/worker/puzzles";
import { guardians } from "../src/shared/catalog";
import { marks, type Point } from "../src/shared/types";
import { phase } from "../src/worker/index";
describe("fifteen distinct guardian trials", () => {
  for (const g of guardians)
    it(`${g.family}: 600 stable, solvable assignments, malformed answers rejected`, () => {
      const seen = new Set<string>();
      for (let i = 0; i < 600; i++) {
        const p = generate(g.family, `event:player-${i}:${g.id}:v1`);
        expect(generate(g.family, `event:player-${i}:${g.id}:v1`)).toEqual(p);
        seen.add(JSON.stringify(p.view));
        const answer = p.answer;
        expect(validate(p, answer), `invalid generated ${g.family} ${i}`).toBe(
          true,
        );
        expect(validate(p, null)).toBe(false);
        expect(validate(p, { x: 1 })).toBe(false);
        if (p.view.family === "reflection") {
          const original = p.view.grid!,
            mirror = p.view.mirror!;
          expect(
            mirror.filter(
              (n, j) => n !== original[Math.floor(j / 3) * 3 + 2 - (j % 3)],
            ),
          ).toHaveLength(1);
        }
        if (p.view.kind === "untangle") {
          expect(hasCrossings(p.view.nodes!, p.view.edges!)).toBe(true);
          expect(
            validate(
              p,
              p.view.nodes!.map(() => ({ x: 50, y: 50 })),
            ),
          ).toBe(false);
        }
        if (p.view.kind === "lanterns") {
          const board = [...p.view.board!];
          for (const move of p.answer as number[]) toggle(board, move);
          expect(board.every((n) => n === 1)).toBe(true);
        }
        if (
          p.view.kind === "choice" ||
          p.view.kind === "memory" ||
          p.view.kind === "token"
        )
          expect(p.view.options!.filter((_, j) => validate(p, j))).toHaveLength(
            1,
          );
      }
      expect(seen.size).toBeGreaterThanOrEqual(100);
    });
  it("two-truth witness clues determine a unique complete arrangement", () => {
    for (let i = 0; i < 300; i++) {
      const p = generate("witnesses", `w-${i}`),
        v = p.view;
      const truth = (
        c: NonNullable<typeof v.witnessClues>[number],
        x: number[],
      ) =>
        c.kind === "holds"
          ? x[c.a] === c.b
          : c.kind === "not"
            ? x[c.a] !== c.b
            : c.kind === "left"
              ? x.indexOf(c.a) < x.indexOf(c.b)
              : Math.abs(x.indexOf(c.a) - x.indexOf(c.b)) === 1;
      const solutions = permutations([0, 1, 2]).filter(
        (x) => v.witnessClues!.filter((c) => truth(c, x)).length === 2,
      );
      expect(solutions).toHaveLength(1);
      expect(v.optionGroups![p.answer as number]).toEqual(
        solutions[0].map((i) => v.witnessMarks![i]),
      );
      expect(
        v.witnessClues!.some((c) => c.kind === "left" || c.kind === "beside"),
      ).toBe(true);
    }
  });
  it("offerings have exactly one valid subset of three", () => {
    for (let i = 0; i < 100; i++) {
      const p = generate("offering", `o-${i}`);
      const choices = p.view.items!;
      let matches = 0;
      for (let a = 0; a < 4; a++)
        for (let b = a + 1; b < 5; b++)
          for (let c = b + 1; c < 6; c++)
            if (
              choices[a].value + choices[b].value + choices[c].value ===
              p.view.target
            )
              matches++;
      expect(matches).toBe(1);
    }
  });
  it("wall mazes have alternatives but exactly one valid thorn route", () => {
    for (let i = 0; i < 200; i++) {
      const p = generate("thorns", `t-${i}`),
        v = p.view,
        maze = v.maze!;
      const paths = mazePaths(maze.openings, v.start!, v.end!);
      expect(paths.length).toBeGreaterThan(1);
      expect(
        paths.filter(
          (path) => path.reduce((s, n) => s + maze.thorns[n], 0) === v.target,
        ),
      ).toEqual([p.answer]);
      expect((p.answer as number[]).length).toBeGreaterThanOrEqual(12);
      expect(validate(p, [v.start, v.end])).toBe(false);
      expect(validate(p, [v.start, ...(p.answer as number[])])).toBe(false);
    }
  });
  it("all 512 lantern states are reachable, with distinct three-to-five-tap starts", () => {
    const states = new Set<string>();
    for (let mask = 0; mask < 512; mask++) {
      const board = Array(9).fill(1);
      for (let i = 0; i < 9; i++) if (mask & (1 << i)) toggle(board, i);
      states.add(board.join(""));
    }
    expect(states.size).toBe(512);
    for (let i = 0; i < 200; i++) {
      const p = generate("lanterns", `l-${i}`);
      expect((p.answer as number[]).length).toBeGreaterThanOrEqual(3);
      expect((p.answer as number[]).length).toBeLessThanOrEqual(5);
      expect(p.view.board!.some((x) => x === 0)).toBe(true);
      expect(p.view.board!.some((x) => x === 1)).toBe(true);
    }
  });
  it("no knot can be solved by moving just one stone", () => {
    for (let i = 0; i < 200; i++) {
      const p = generate("untangle", `u-${i}`),
        v = p.view;
      expect(crossingPairs(v.nodes!, v.edges!).length).toBeGreaterThanOrEqual(
        6,
      );
      for (let n = 0; n < v.nodes!.length; n++)
        expect(
          hasCrossings(
            v.nodes!,
            v.edges!.filter((e) => !e.includes(n)),
          ),
        ).toBe(true);
      expect(validate(p, p.answer)).toBe(true);
    }
    expect(
      hasCrossings(
        [
          { x: 0, y: 0, label: "" },
          { x: 1, y: 0, label: "" },
          { x: 2, y: 0, label: "" },
          { x: 3, y: 0, label: "" },
        ],
        [
          [0, 1],
          [2, 3],
        ],
      ),
    ).toBe(false);
  });
  it("arithmetic edge examples distinguish their rule and admit one answer", () => {
    for (let i = 0; i < 200; i++) {
      const p = generate("rule", `r-${i}`),
        v = p.view;
      const rules = [0, 1, 2].filter((mode) =>
        v.ruleExamples!.every((e) => edgeRule(mode, e.shapes) === e.accepted),
      );
      expect(rules).toHaveLength(1);
      expect(
        v
          .optionGroups!.map((x, i) => (edgeRule(rules[0], x) ? i : -1))
          .filter((i) => i >= 0),
      ).toEqual([p.answer]);
    }
  });
  it("the anchored six-shard seal has one matching-edge arrangement", () => {
    for (let seed = 0; seed < 20; seed++) {
      const p = generate("seal", `s-${seed}`),
        edges = p.view.sealEdges!;
      let solutions = 0;
      function place(slots: number[], rotations: number[]) {
        if (slots.length === 6) {
          if (validSeal(edges, { slots, rotations })) solutions++;
          return;
        }
        const i = slots.length;
        for (let piece = 1; piece < 6; piece++)
          if (!slots.includes(piece))
            for (let r = 0; r < 4; r++) {
              const at = (side: number) => edges[piece][(side - r + 4) % 4];
              if (
                (i < 3 && at(0) !== 0) ||
                (i >= 3 && at(2) !== 0) ||
                (i % 3 === 0 && at(3) !== 0) ||
                (i % 3 === 2 && at(1) !== 0)
              )
                continue;
              if (
                i % 3 &&
                at(3) !==
                  edges[slots[i - 1]][(1 - rotations[slots[i - 1]] + 4) % 4]
              )
                continue;
              if (
                i >= 3 &&
                at(0) !==
                  edges[slots[i - 3]][(2 - rotations[slots[i - 3]] + 4) % 4]
              )
                continue;
              const next = [...rotations];
              next[piece] = r;
              place([...slots, piece], next);
            }
      }
      place([0], [0, 0, 0, 0, 0, 0]);
      expect(solutions).toBe(1);
      expect(
        validate(p, {
          slots: [0, 1, 2, 3, 4, 5],
          rotations: [0, 1, 0, 0, 0, 0],
        }),
      ).toBe(false);
    }
  });
  it("real-star patterns preserve proportions and have one visual match", () => {
    for (let i = 0; i < 200; i++) {
      const p = generate("constellation", `c-${i}`),
        v = p.view,
        ref = v.constellation!.points,
        route = p.answer as number[];
      expect(["Cassiopeia", "Corona Borealis"]).toContain(
        v.constellation!.name,
      );
      expect(route).toHaveLength(ref.length);
      const origin = v.nodes![v.start!],
        dx = ref[1].x - ref[0].x,
        dy = ref[1].y - ref[0].y,
        l = dx * dx + dy * dy;
      const matches: number[][] = [];
      for (let b = 0; b < v.nodes!.length; b++)
        if (b !== v.start) {
          const q = v.nodes![b],
            u = q.x - origin.x,
            w = q.y - origin.y,
            c = (u * dx + w * dy) / l,
            s = (w * dx - u * dy) / l;
          const candidate = ref.map((n) => {
            const x = origin.x + (n.x - ref[0].x) * c - (n.y - ref[0].y) * s,
              y = origin.y + (n.x - ref[0].x) * s + (n.y - ref[0].y) * c;
            return v.nodes!.findIndex((n) => Math.hypot(n.x - x, n.y - y) < 12);
          });
          if (
            candidate.every((n) => n >= 0) &&
            new Set(candidate).size === ref.length
          )
            matches.push(candidate);
        }
      expect(matches).toEqual([route]);
    }
  });
});
describe("New York opening and rollback", () => {
  const opens = "2026-10-31T20:00:00-04:00",
    closes = "2026-11-01T02:00:00-05:00";
  it("opens exactly at 8pm EDT and closes exactly at 2am EST", () => {
    expect(phase(opens, closes, Date.parse(opens) - 1)).toBe("sealed");
    expect(phase(opens, closes, Date.parse(opens))).toBe("open");
    expect(phase(opens, closes, Date.parse(closes) - 1)).toBe("open");
    expect(phase(opens, closes, Date.parse(closes))).toBe("closed");
  });
  it("both occurrences of 1:45am remain open", () => {
    for (const offset of ["-04:00", "-05:00"])
      expect(
        phase(opens, closes, Date.parse("2026-11-01T01:45:00" + offset)),
      ).toBe("open");
    expect(Date.parse(closes) - Date.parse(opens)).toBe(7 * 60 * 60 * 1000);
  });
});
