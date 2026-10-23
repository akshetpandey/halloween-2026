import { expect, it } from "vitest";
import { StableGuardian } from "../src/shared/vision-live";
it("requires consecutive matches across separately timed frames", () => {
  const s = new StableGuardian();
  expect(s.observe("owl", 0).stable).toBe(false);
  expect(s.observe("owl", 250).stable).toBe(false);
  expect(s.observe("owl", 500)).toEqual({ id: "owl", count: 3, stable: true });
});
it("resets on unknown frames, changed identities and long pauses", () => {
  const s = new StableGuardian();
  s.observe("owl", 0);
  s.observe("owl", 250);
  expect(s.observe(null, 500).count).toBe(0);
  expect(s.observe("owl", 750).stable).toBe(false);
  expect(s.observe("raven", 1000).count).toBe(1);
  expect(s.observe("raven", 4000).count).toBe(1);
});
it("does not accept a burst of duplicated timestamps or return stale matches after reset", () => {
  const s = new StableGuardian();
  for (let i = 0; i < 8; i++) expect(s.observe("owl", 0).stable).toBe(false);
  expect(s.observe("owl", 500).count).toBe(2);
  s.reset();
  expect(s.observe("owl", 1000).count).toBe(1);
});
