import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { LensConfirmation } from "../src/client/LensConfirmation";
import { StableGuardian } from "../src/shared/vision-live";
const render = (
  candidateName: string | undefined,
  count: number,
  confirmed: boolean,
  ready = true,
) =>
  renderToStaticMarkup(
    <LensConfirmation
      ready={ready}
      candidateName={candidateName}
      count={count}
      confirmed={confirmed}
      noticed={true}
    />,
  );
it("acknowledges a first sighting immediately but keeps the final leaf pending until temporal acceptance", () => {
  const tracker = new StableGuardian();
  const first = tracker.observe("fox", 100);
  const firstView = render("The Fox of Small Print", first.count, first.stable);
  expect(firstView).toContain("The Fox of Small Print");
  expect(firstView).toContain("Hold steady");
  expect(firstView).toContain('aria-valuenow="1"');
  expect(firstView).not.toContain("You found it");
  tracker.observe("fox", 200);
  const earlyThird = tracker.observe("fox", 300);
  expect(earlyThird.stable).toBe(false);
  expect(
    render("The Fox of Small Print", earlyThird.count, earlyThird.stable),
  ).toContain('aria-valuenow="2"');
  const accepted = tracker.observe("fox", 600);
  const acceptedView = render(
    "The Fox of Small Print",
    accepted.count,
    accepted.stable,
  );
  expect(acceptedView).toContain('aria-valuenow="3"');
  expect(acceptedView).toContain("Waking the guardian");
});
it("drops stale identity/progress on lost or changed sightings and hides it until the model is ready", () => {
  const tracker = new StableGuardian();
  tracker.observe("fox", 0);
  tracker.observe("fox", 250);
  const changed = tracker.observe("owl", 500);
  const changedView = render(
    "The Very Certain Owl",
    changed.count,
    changed.stable,
  );
  expect(changedView).toContain("The Very Certain Owl");
  expect(changedView).toContain('aria-valuenow="1"');
  expect(changedView).not.toContain("Fox");
  const lost = tracker.observe(null, 750),
    lostView = render(undefined, lost.count, lost.stable);
  expect(lostView).toContain("The shape slipped away");
  expect(lostView).not.toContain('role="progressbar"');
  expect(render("The Very Certain Owl", 2, false, false)).not.toContain(
    "The Very Certain Owl",
  );
});
