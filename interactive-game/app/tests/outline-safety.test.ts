import { afterEach, expect, it, vi } from "vitest";
import { OutlineSafety, OUTLINE_PENDING } from "../src/client/outline-safety";
afterEach(() => vi.unstubAllGlobals());
function storage() {
  const data = new Map<string, string>();
  const sessionStorage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  };
  vi.stubGlobal("window", { sessionStorage });
  return data;
}
it("marks in-flight work and clears the marker after success or a caught failure", async () => {
  const data = storage(),
    safety = new OutlineSafety();
  await safety.run(async () => {
    expect(data.has(OUTLINE_PENDING)).toBe(true);
  });
  expect(data.has(OUTLINE_PENDING)).toBe(false);
  await expect(
    safety.run(async () => {
      throw Error("Model failed");
    }),
  ).rejects.toThrow("Model failed");
  expect(data.has(OUTLINE_PENDING)).toBe(false);
});
it("does not automatically repeat interrupted work after a crash/reload, but supports explicit retry", async () => {
  const data = storage();
  data.set(OUTLINE_PENDING, "1");
  const safety = new OutlineSafety(),
    work = vi.fn(async () => 1);
  await expect(safety.run(work)).rejects.toThrow("interrupted");
  expect(work).not.toHaveBeenCalled();
  safety.retry();
  expect(await safety.run(work)).toBe(1);
  expect(data.has(OUTLINE_PENDING)).toBe(false);
});
it("keeps the marker until every shared concurrent preparation finishes", async () => {
  const data = storage(),
    safety = new OutlineSafety();
  let finish!: () => void;
  const first = safety.run(
    () => new Promise<void>((resolve) => (finish = resolve)),
  );
  await safety.run(async () => {});
  expect(data.has(OUTLINE_PENDING)).toBe(true);
  finish();
  await first;
  expect(data.has(OUTLINE_PENDING)).toBe(false);
});
it("works when session storage is unavailable", async () => {
  vi.stubGlobal("window", {
    get sessionStorage() {
      throw Error("Storage blocked");
    },
  });
  expect(await new OutlineSafety().run(async () => 1)).toBe(1);
});
