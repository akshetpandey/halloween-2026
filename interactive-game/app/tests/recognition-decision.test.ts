import { expect, it } from "vitest";
import { recognitionDecision } from "../src/shared/recognition-decision";
import type { VisionMatch } from "../src/shared/vision";
import type { FocusMatch } from "../src/shared/recognition-focus";
const scene = (overrides: Partial<VisionMatch> = {}): VisionMatch => ({
  guardianId: null,
  score: 0.7,
  gap: 0.2,
  reason: "weak",
  candidates: [{ guardianId: "moon", score: 0.7 }],
  ...overrides,
});
const focus = (overrides: Partial<FocusMatch> = {}): FocusMatch => ({
  guardianId: "moon",
  suggestion: null,
  score: 0.9,
  gap: 0.2,
  foreground: 0.75,
  contrast: 0.1,
  points: [],
  ...overrides,
});
it("keeps distinct weaker scene matches manual, rather than lowering automatic thresholds", () => {
  expect(recognitionDecision(scene(), null)).toMatchObject({
    match: { guardianId: null },
    suggestion: { guardianId: "moon" },
  });
  expect(
    recognitionDecision(scene({ score: 0.59 }), null).suggestion,
  ).toBeNull();
  expect(recognitionDecision(scene({ gap: 0.03 }), null).suggestion).toBeNull();
  expect(
    recognitionDecision(scene({ reason: "background" }), null).suggestion,
  ).toBeNull();
});
it("requires a tap when the shape and whole-object rankings conflict", () => {
  expect(
    recognitionDecision(scene(), focus({ guardianId: "stag" })),
  ).toMatchObject({
    match: { guardianId: null, reason: "ambiguous" },
    suggestion: { guardianId: "moon" },
  });
  expect(
    recognitionDecision(scene({ score: 0.45 }), focus({ guardianId: "stag" })),
  ).toMatchObject({
    match: { guardianId: null },
    suggestion: { guardianId: "stag" },
  });
});
it("preserves agreed automatic matches, baseline fallback and valid outline suggestions", () => {
  expect(recognitionDecision(scene(), focus())).toMatchObject({
    match: { guardianId: "moon", reason: "match" },
    suggestion: null,
  });
  expect(
    recognitionDecision(scene({ guardianId: "moon", reason: "match" }), null)
      .match.guardianId,
  ).toBe("moon");
  expect(
    recognitionDecision(
      scene({ score: 0.4 }),
      focus({ guardianId: null, suggestion: "moon" }),
    ).suggestion?.guardianId,
  ).toBe("moon");
});
