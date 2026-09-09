import { describe, it, expect } from "vitest";
import {
  costumeWindow,
  reminderDue,
  COSTUME_REMINDER_AT,
} from "../src/shared/costumes";
import { validateChoices } from "../src/worker/costumes";
const opens = "2026-10-31T20:00:00-04:00",
  closes = "2026-11-01T02:00:00-05:00";
describe("costume timing on the New York rollback night", () => {
  it("reminds at the first 1 AM, catches returning guests, and never repeats an acknowledged reminder", () => {
    const first = Date.parse(COSTUME_REMINDER_AT);
    expect(new Date(first).toISOString()).toBe("2026-11-01T05:00:00.000Z");
    expect(reminderDue(opens, closes, first - 1, false)).toBe(false);
    expect(reminderDue(opens, closes, first, false)).toBe(true);
    expect(
      reminderDue(
        opens,
        closes,
        Date.parse("2026-11-01T01:00:00-05:00"),
        false,
      ),
    ).toBe(true);
    expect(
      reminderDue(opens, closes, Date.parse("2026-11-01T01:00:00-05:00"), true),
    ).toBe(false);
    expect(reminderDue(opens, closes, Date.parse(closes), false)).toBe(false);
  });
  it("closes at 2 AM EST, with exact boundaries and publication freezing rehearsal votes too", () => {
    expect(costumeWindow(opens, closes, Date.parse(opens) - 1)).toBe(false);
    expect(costumeWindow(opens, closes, Date.parse(opens))).toBe(true);
    expect(costumeWindow(opens, closes, Date.parse(closes) - 1)).toBe(true);
    expect(costumeWindow(opens, closes, Date.parse(closes))).toBe(false);
    expect(costumeWindow(opens, closes, 0, true)).toBe(true);
    expect(costumeWindow(opens, closes, 0, true, true)).toBe(false);
  });
  it("accepts an empty ballot and at most three distinct other costumes", () => {
    const self = "a".repeat(32),
      other = ["b", "c", "d"].map((x) => x.repeat(32));
    expect(() => validateChoices([], self)).not.toThrow();
    expect(() => validateChoices(other, self)).not.toThrow();
    for (const value of [
      null,
      {},
      [self],
      [other[0], other[0]],
      [...other, "e".repeat(32)],
      ["unknown"],
    ])
      expect(() => validateChoices(value, self)).toThrow();
  });
});
