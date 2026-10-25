import { expect, it } from "vitest";
import {
  FOCUS_MODEL,
  focusSignature,
  validFocus,
  prepareFocus,
  matchFocus,
  type RegionFeatures,
  type DecodedFocus,
} from "../src/shared/recognition-focus";
const vector = (a: number, b = 0, c = 0) =>
  Float32Array.from({ length: 576 }, (_, i) =>
    i === 0 ? a : i === 1 ? b : i === 2 ? c : 0,
  );
const frame = (v: Float32Array): RegionFeatures => ({
  model: FOCUS_MODEL,
  width: 224,
  height: 224,
  data: Float32Array.from(
    Array.from({ length: 49 }, () => Array.from(v)).flat(),
  ),
});
const refs: DecodedFocus[] = [
  {
    referenceId: "a",
    guardianId: "tree",
    foreground: [vector(1)],
    background: [vector(0, 0, 1)],
  },
  {
    referenceId: "b",
    guardianId: "fox",
    foreground: [vector(0, 1)],
    background: [vector(0, 0, 1)],
  },
];
it("learns foreground and surrounding negatives, quantizes them and rejects malformed setups", () => {
  const f = frame(vector(0, 0, 1));
  for (let i = 0; i < 49; i++) if (i % 7 < 3) f.data.set(vector(1), i * 576);
  const setup = focusSignature(f, [
    { x: 0, y: 0 },
    { x: 0.43, y: 0 },
    { x: 0.43, y: 1 },
    { x: 0, y: 1 },
  ]);
  expect(validFocus(setup)).toBe(true);
  const decoded = prepareFocus([
    { ...setup, referenceId: "a", guardianId: "tree" },
  ]);
  expect(decoded[0].foreground[0][0]).toBeCloseTo(1);
  expect(decoded[0].background[0][2]).toBeCloseTo(1);
  for (const bad of [
    { ...setup, model: "old" },
    { ...setup, foreground: btoa("x") },
    { ...setup, background: btoa("\0".repeat(576)) },
    { ...setup, polygon: [{ x: Infinity, y: 0 }] },
  ])
    expect(validFocus(bad)).toBe(false);
});
it("accepts supported object patches while rejecting backgrounds and ambiguous identities", () => {
  const f = frame(vector(0, 0, 1));
  for (const p of [16, 17, 18, 23, 24]) f.data.set(vector(1), p * 576);
  expect(matchFocus(f, refs)).toMatchObject({
    guardianId: "tree",
    suggestion: null,
  });
  expect(matchFocus(frame(vector(0, 0, 1)), refs)).toMatchObject({
    guardianId: null,
    suggestion: null,
  });
  expect(
    matchFocus(f, [...refs, { ...refs[0], guardianId: "other-tree" }]),
  ).toMatchObject({ guardianId: null, suggestion: null });
  expect(matchFocus(f, []).guardianId).toBeNull();
});
it("offers uncertain shapes for explicit confirmation without accepting them automatically", () => {
  const f = frame(vector(0.62, Math.sqrt(1 - 0.62 ** 2 - 0.56 ** 2), 0.56));
  expect(matchFocus(f, refs)).toMatchObject({
    guardianId: null,
    suggestion: "tree",
  });
});
it("omits padded portrait regions from the reference foreground/background bank", () => {
  const f = frame(vector(1));
  f.width = 100;
  f.height = 200;
  // Only the letterboxed photo's left half should contribute, never pad columns.
  for (let p = 0; p < 49; p++)
    if (p % 7 === 0 || p % 7 === 6) f.data.set(vector(0, 0, 1), p * 576);
  const s = focusSignature(f, [
    { x: 0, y: 0 },
    { x: 0.5, y: 0 },
    { x: 0.5, y: 1 },
    { x: 0, y: 1 },
  ]);
  const bank = prepareFocus([
    { ...s, guardianId: "tree", referenceId: "a" },
  ])[0];
  expect(
    [...bank.foreground, ...bank.background].every((v) => v[2] === 0),
  ).toBe(true);
});
it("does not recognize the synthetic padding above a landscape camera frame", () => {
  const f = frame(vector(0, 0, 1));
  f.width = 400;
  f.height = 100;
  for (let i = 0; i < 49; i++)
    if (i < 14 || i >= 35) f.data.set(vector(1), i * 576);
  expect(matchFocus(f, refs)).toMatchObject({
    guardianId: null,
    suggestion: null,
  });
});
