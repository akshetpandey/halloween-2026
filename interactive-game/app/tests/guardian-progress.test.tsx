import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { guardianProgress } from "../src/shared/guardian-progress";
import { GuardianProgress } from "../src/client/GuardianProgress";
const discovered = [
  { guardianId: "DEC-02", code: "abc123abc123" },
  { guardianId: "DEC-01", code: "123abc123abc" },
];
it("separates found-unfinished, solved and unscanned guardians without unlocking others", () => {
  const progress = guardianProgress(["DEC-01"], discovered);
  expect(
    progress.filter((p) => p.status === "pending").map((p) => p.guardian.id),
  ).toEqual(["DEC-02"]);
  expect(progress.filter((p) => p.status === "solved")).toHaveLength(1);
  expect(progress.filter((p) => p.status === "unfound")).toHaveLength(13);
  expect(
    guardianProgress(
      [],
      [
        { guardianId: "DEC-03", code: "//example.com" },
        { guardianId: "unknown", code: "abc123abc123" },
      ],
    ).every((p) => p.status === "unfound"),
  ).toBe(true);
});
it("shows a resume button only for a discovered unfinished puzzle", () => {
  const markup = renderToStaticMarkup(
    <GuardianProgress
      earned={["DEC-01"]}
      discovered={discovered}
      onOpen={() => {}}
      onScan={() => {}}
    />,
  );
  expect(markup).toContain("1 puzzle still to solve.");
  expect(markup.match(/Solve puzzle · Earn 1 Favor/g)).toHaveLength(1);
  expect(markup.match(/class="puzzle-progress-card is-unfound"/g)).toHaveLength(
    13,
  );
  expect(markup.match(/class="puzzle-progress-card is-solved"/g)).toHaveLength(
    1,
  );
  expect(markup).toContain("No need to scan these again.");
});
it("does not claim completion or offer locked puzzles to a new guest", () => {
  const markup = renderToStaticMarkup(
    <GuardianProgress earned={[]} onOpen={() => {}} onScan={() => {}} />,
  );
  expect(markup).not.toContain("Solve puzzle · Earn 1 Favor");
  expect(markup).toContain("Scan a real guardian to unlock its puzzle.");
  expect(
    markup.match(/Not found yet · Scan this guardian first/g),
  ).toHaveLength(15);
});
