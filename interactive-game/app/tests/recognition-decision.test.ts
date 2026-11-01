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
it("offers weaker distinct sightings for a human tap while rejecting backgrounds and nearly tied scores", () => {
  expect(
    recognitionDecision(scene({ score: 0.57, gap: 0.08 }), null),
  ).toMatchObject({
    match: { guardianId: null },
    suggestion: { guardianId: "moon" },
  });
  for (const input of [
    scene({ score: 0.53 }),
    scene({ score: 0.7, gap: 0.03 }),
    scene({ reason: "background" }),
    scene({ reason: "empty" }),
  ]) {
    expect(recognitionDecision(input, null)).toMatchObject({
      match: { guardianId: null },
      suggestion: null,
    });
  }
});
it("automatically accepts distinct moderately lit scenes without changing the three-frame camera gate", () => {
  expect(
    recognitionDecision(scene({ score: 0.74, gap: 0.09 }), null),
  ).toMatchObject({
    match: { guardianId: "moon", reason: "match" },
    suggestion: null,
  });
  expect(
    recognitionDecision(scene({ score: 0.71, gap: 0.09 }), null),
  ).toMatchObject({
    match: { guardianId: null },
    suggestion: { guardianId: "moon" },
  });
  expect(
    recognitionDecision(scene({ score: 0.74, gap: 0.07 }), null).match
      .guardianId,
  ).toBeNull();
  expect(
    recognitionDecision(
      scene({ score: 0.9, gap: 0.2, reason: "background" }),
      null,
    ).match.guardianId,
  ).toBeNull();
});
it("uses foreground agreement for darker scenes, but keeps competing identities manual", () => {
  const dark = scene({ score: 0.67, gap: 0.055 });
  expect(
    recognitionDecision(dark, focus({ guardianId: null, suggestion: "moon" })),
  ).toMatchObject({ match: { guardianId: "moon" }, suggestion: null });
  expect(
    recognitionDecision(dark, focus({ guardianId: null, suggestion: "stag" }))
      .match.guardianId,
  ).toBeNull();
  expect(
    recognitionDecision(
      scene({ score: 0.76, gap: 0.1 }),
      focus({ guardianId: null, suggestion: "stag" }),
    ).match.guardianId,
  ).toBeNull();
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
