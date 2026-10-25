import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Camera } from "lucide-react";
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/dm-sans/latin-400.css";
import "../../src/client/style.css";
import "../../src/client/vision.css";
import { LensConfirmation } from "../../src/client/LensConfirmation";
import { GuardianArt } from "../../src/client/Art";
function Preview() {
  const [step, setStep] = useState("search");
  const found = ["first", "second", "early", "confirmed", "owl"].includes(step);
  return (
    <main style={{ maxWidth: 390, margin: "20px auto", padding: 14 }}>
      <p className="eyebrow">Actual Lens overlay · no camera or ML</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {[
          ["search", "Searching"],
          ["first", "First sighting"],
          ["second", "Hold steady"],
          ["early", "Third frame too early"],
          ["confirmed", "Confirmed"],
          ["lost", "Lost sighting"],
          ["owl", "Different guardian"],
        ].map(([s, label]) => (
          <button key={s} className="text-button" onClick={() => setStep(s)}>
            {label}
          </button>
        ))}
      </div>
      <div
        className="lens-camera"
        style={{ width: "100%", height: 480, maxHeight: "none" }}
      >
        <div
          style={{
            height: "100%",
            display: "grid",
            placeItems: "center",
            background:
              "radial-gradient(ellipse at center,#365b3c,#0d2018 75%)",
          }}
        >
          <div style={{ width: 200, marginTop: 30 }}>
            <GuardianArt kind={step === "owl" ? "owl" : "fox"} />
          </div>
        </div>
        <LensConfirmation
          ready
          candidateName={
            found
              ? step === "owl"
                ? "The Very Certain Owl"
                : "The Fox of Small Print"
              : undefined
          }
          count={
            step === "first" || step === "owl"
              ? 1
              : step === "second"
                ? 2
                : step === "early" || step === "confirmed"
                  ? 3
                  : 0
          }
          confirmed={step === "confirmed"}
          noticed={step !== "search"}
        />
        <button
          className="lens-shutter"
          aria-label="Take a photo instead"
          disabled={step === "confirmed"}
        >
          <Camera />
        </button>
      </div>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
