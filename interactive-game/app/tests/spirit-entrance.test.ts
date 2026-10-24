import { afterEach, expect, it, vi } from "vitest";
import {
  resolveSpiritEntrance,
  SPIRIT_ANCHOR_BUDGET_MS,
} from "../src/client/spirit-entrance";
import type {
  MotionAlignment,
  MotionPose,
} from "../src/shared/guardian-motion";
afterEach(() => vi.useRealTimers());
it("caps both saved-pose fetching and cosmetic matching without delaying identity recognition", async () => {
  vi.useFakeTimers();
  const match = vi.fn();
  const waiting = resolveSpiritEntrance(new Promise(() => {}), match);
  await vi.advanceTimersByTimeAsync(SPIRIT_ANCHOR_BUDGET_MS);
  expect(await waiting).toBeNull();
  expect(match).not.toHaveBeenCalled();
  const stalled = resolveSpiritEntrance(
    Promise.resolve([{} as MotionPose]),
    () => new Promise(() => {}),
  );
  await vi.advanceTimersByTimeAsync(SPIRIT_ANCHOR_BUDGET_MS);
  expect(await stalled).toBeNull();
});
it("uses a quick reliable anchor, and falls back safely on error or missing poses", async () => {
  const alignment = { inliers: 30 } as MotionAlignment,
    match = vi.fn(
      async (_poses: MotionPose[], _remaining: number) => alignment,
    );
  expect(
    await resolveSpiritEntrance(Promise.resolve([{} as MotionPose]), match),
  ).toBe(alignment);
  expect(match.mock.calls[0][1]).toBeLessThanOrEqual(SPIRIT_ANCHOR_BUDGET_MS);
  expect(await resolveSpiritEntrance(Promise.resolve([]), match)).toBeNull();
  expect(
    await resolveSpiritEntrance(Promise.reject(Error("offline")), match),
  ).toBeNull();
});
