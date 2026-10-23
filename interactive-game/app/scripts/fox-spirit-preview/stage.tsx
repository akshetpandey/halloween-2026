import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/cormorant-garamond/latin-400-italic.css";
import "@fontsource/dm-sans/latin-400.css";
import "../../src/client/style.css";
import FoxSpiritReveal from "../../src/client/FoxSpiritReveal";
import { spiritOrigin } from "../../src/client/spirit-motion";
import FOX_URL from "../../src/client/assets/fox-spirit/Fox.glb?url";
const position = new URLSearchParams(location.search).get("origin");
const origin =
  position === "left"
    ? spiritOrigin({ left: 0.08, top: 0.15, right: 0.23, bottom: 0.3 })
    : position === "right"
      ? spiritOrigin({ left: 0.55, top: 0.6, right: 1, bottom: 0.95 })
      : spiritOrigin();
createRoot(document.getElementById("root")!).render(
  <FoxSpiritReveal
    asset={
      new URLSearchParams(location.search).has("capture")
        ? { url: FOX_URL, name: "Local GLB loader fixture" }
        : undefined
    }
    origin={origin}
    onClose={() => location.reload()}
  />,
);
