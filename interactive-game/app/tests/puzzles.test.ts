import { describe, it, expect } from "vitest";
import {
  generate,
  validate,
  toggle,
  hasCrossings,
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
        const answer =
          p.view.kind === "seal"
            ? { slots: [0, 1, 2, 3], rotations: [0, 0, 0, 0] }
            : p.answer;
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
  it("witness statements have exactly one possible hidden mark", () => {
    for (let i = 0; i < 200; i++) {
      const p = generate("witnesses", `w-${i}`);
      const solutions = p.view
        .options!.map((mark, index) => ({
          index,
          truths: p.view.text!.filter((t) => {
            const m = t.match(/is (not )?(.+)\.”/)!;
            return m[1] ? mark !== m[2] : mark === m[2];
          }).length,
        }))
        .filter((x) => x.truths === 1);
      expect(solutions.map((x) => x.index)).toEqual([p.answer]);
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
  it("thorn paths have exactly one legal solution", () => {
    for (let i = 0; i < 100; i++) {
      const p = generate("thorns", `t-${i}`),
        v = p.view;
      let found: number[][] = [];
      function walk(route: number[], weight: number) {
        const a = route.at(-1)!;
        if (a === v.end) {
          if (weight === v.target) found.push(route);
          return;
        }
        for (const [x, b] of v.edges!)
          if (x === a) walk([...route, b], weight + (v.nodes![b].weight || 0));
      }
      walk([0], 0);
      expect(found).toEqual([p.answer]);
    }
  });
  it("constellation instructions are unambiguous", () => {
    for (let i = 0; i < 500; i++) {
      const p = generate("constellation", `c-${i}`),
        v = p.view,
        route = p.answer as number[];
      for (let j = 1; j < route.length; j++) {
        const a = v.nodes![route[j - 1]];
        const ds = v
          .nodes!.map((b, k) => ({ k, d: (a.x - b.x) ** 2 + (a.y - b.y) ** 2 }))
          .filter((b) => !route.slice(0, j).includes(b.k))
          .sort((a, b) => a.d - b.d);
        expect(ds[0].d).not.toBe(ds[1]?.d);
        expect(ds[0].k).toBe(route[j]);
      }
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
