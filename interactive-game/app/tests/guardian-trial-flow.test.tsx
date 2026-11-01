import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import FoxSpiritReveal from "../src/client/FoxSpiritReveal";
vi.mock("react-dom", () => ({ createPortal: (node: React.ReactNode) => node }));
afterEach(() => vi.unstubAllGlobals());
it("guest awakening offers the puzzle even before the animation is ready", () => {
  vi.stubGlobal("document", { body: {} });
  const markup = renderToStaticMarkup(
    <FoxSpiritReveal
      onClose={() => {}}
      onScanAgain={() => {}}
      onContinue={async () => {}}
    />,
  );
  expect(markup).toContain("Solve this guardian’s puzzle");
  expect(markup).not.toContain("Find another guardian");
  expect(markup).toMatch(
    /<button class="btn">Solve this guardian’s puzzle<\/button>/,
  );
});
it("host animation previews retain their scan-again action", () => {
  vi.stubGlobal("document", { body: {} });
  const markup = renderToStaticMarkup(
    <FoxSpiritReveal onClose={() => {}} onScanAgain={() => {}} />,
  );
  expect(markup).toContain("Find another guardian");
  expect(markup).not.toContain("Solve this guardian’s puzzle");
});
