import React, { useState } from "react";
import { Camera, Check, ArrowRight } from "lucide-react";
import { guardians } from "../shared/catalog";
import { GuardianArt } from "./Art";

/** Party-night catch-up for guests whose earlier awakening hid the trial link. */
export function GuardianTrials({
  earned,
  onOpen,
  onScan,
}: {
  earned: string[];
  onOpen: (guardianId: string) => Promise<void>;
  onScan: () => void;
}) {
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState("");
  return (
    <section className="page-top narrow">
      <span className="eyebrow">A LITTLE UNFINISHED BUSINESS</span>
      <h1>
        You found them. <em>Now earn their Favor.</em>
      </h1>
      <p>
        If you already scanned a guardian and saw its awakening, choose it below
        to open your puzzle. You do not need to scan it again. Each solved
        puzzle earns one Favor.
      </p>
      <button className="btn secondary" onClick={onScan}>
        <Camera size={18} /> Find a new guardian
      </button>
      {error && <p role="alert">{error}</p>}
      <div className="trial-recovery-list">
        {guardians.map((guardian) => {
          const done = earned.includes(guardian.id);
          return (
            <button
              className="trial-recovery-item"
              key={guardian.id}
              disabled={done || opening !== null}
              onClick={() => {
                setOpening(guardian.id);
                setError("");
                void onOpen(guardian.id)
                  .catch((e: Error) =>
                    setError(
                      e.message || "Please try opening the puzzle again.",
                    ),
                  )
                  .finally(() => setOpening(null));
              }}
            >
              <GuardianArt kind={guardian.art} />
              <span>
                <strong>{guardian.name}</strong>
                <small>
                  {done
                    ? "Favor earned"
                    : opening === guardian.id
                      ? "Opening puzzle…"
                      : "Already found · Open puzzle"}
                </small>
              </span>
              {done ? <Check size={18} /> : <ArrowRight size={18} />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
