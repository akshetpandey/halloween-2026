// Development fixture only; not a Vite entry or deployed asset. A generated canvas
// replaces getUserMedia, so the actual Lens can be exercised without a webcam.
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/dm-sans/latin-400.css";
import "../../src/client/style.css";
import { GuardianLens } from "../../src/client/GuardianLens";
import { lensCamera } from "../../src/client/lens-camera";
import { VISION_MODEL, type VisionManifest } from "../../src/shared/vision";
const source = document.createElement("canvas");
source.width = 360;
source.height = 480;
const ctx = source.getContext("2d")!,
  streams: MediaStream[] = [];
let calls = 0,
  requestedAudio: unknown = "not requested",
  tick = 0;
Object.defineProperty(navigator, "mediaDevices", {
  configurable: true,
  value: {
    getUserMedia: async (constraints: MediaStreamConstraints) => {
      calls++;
      requestedAudio = constraints.audio;
      const stream = source.captureStream(12);
      streams.push(stream);
      return stream;
    },
  },
});
const originalFetch = window.fetch.bind(window);
window.fetch = (input, init) =>
  String(input).startsWith("/api/admin/vision/motion/")
    ? Promise.resolve(
        new Response("[]", { headers: { "content-type": "application/json" } }),
      )
    : originalFetch(input, init);
const manifest: VisionManifest = {
  model: VISION_MODEL,
  settings: { threshold: 1, margin: 0.04 },
  focus: [],
  references: [
    {
      id: "fixture",
      guardianId: "BUY-03",
      vector: [1, ...Array(1023).fill(0)],
    },
  ],
};
function Preview() {
  const [view, setView] = useState("court"),
    [, update] = useState(0);
  useEffect(() => lensCamera.bindPageLifecycle(), []);
  useEffect(() => {
    const timer = setInterval(() => {
      if (
        streams.some((s) =>
          s.getVideoTracks().some((t) => t.enabled && t.readyState === "live"),
        )
      ) {
        ctx.fillStyle = tick++ % 2 ? "#263e31" : "#294535";
        ctx.fillRect(0, 0, 360, 480);
        ctx.fillStyle = "#e2d6a4";
        ctx.font = "22px sans-serif";
        ctx.fillText("Synthetic camera", 75, 230);
      }
      update((n) => n + 1);
    }, 1000 / 12);
    return () => clearInterval(timer);
  }, []);
  const track = lensCamera.stream?.getVideoTracks()[0];
  function go(next: string) {
    history.pushState(null, "", "?view=" + next);
    setView(next);
  }
  return (
    <>
      <aside
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#17291f",
          padding: 14,
        }}
      >
        <p className="eyebrow">LOCAL CAMERA FIXTURE · NO REAL CAMERA</p>
        <p role="status">
          Camera requests: {calls} · requested audio: {String(requestedAudio)} ·
          audio tracks: {lensCamera.stream?.getAudioTracks().length ?? 0} ·
          video: {track ? (track.enabled ? "enabled" : "paused") : "released"}
        </p>
        <button
          className="text-button"
          onClick={() => go(view === "court" ? "lens" : "court")}
        >
          {view === "court" ? "Visit Looking Lens" : "Return to Court"}
        </button>
      </aside>
      {view === "lens" ? (
        <GuardianLens host manifest={manifest} onClose={() => go("court")} />
      ) : (
        <main style={{ maxWidth: 600, margin: "40px auto", padding: 20 }}>
          <h1>The Court</h1>
          <p>
            Open the Lens, close live view, navigate here and back, then open
            again. The camera request count should stay at one, with zero audio
            tracks. Explicit release requires a new request next time. This
            verifies stream reuse, not iPhone permission dialogs or hardware
            indicators.
          </p>
        </main>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
