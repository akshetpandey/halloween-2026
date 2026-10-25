import React from "react";
import { Check, Leaf } from "lucide-react";
import { STABLE_FRAMES } from "../shared/vision-live";
export type LensSighting = {
  ready: boolean;
  candidateName?: string;
  count: number;
  confirmed: boolean;
  noticed: boolean;
  tentative?: boolean;
};
export function LensConfirmation({
  ready,
  candidateName,
  count,
  confirmed,
  noticed,
  tentative = false,
}: LensSighting) {
  const found = ready && !!candidateName;
  const complete = found && confirmed;
  // A fast third sample can arrive before the elapsed-time guard. Keep the last
  // leaf pending until StableGuardian actually accepts the sighting.
  const leaves = found
    ? Math.min(count, complete ? STABLE_FRAMES : STABLE_FRAMES - 1)
    : 0;
  return (
    <>
      <div
        className={
          "lens-reticle" +
          (found ? " is-sighted" : "") +
          (complete ? " is-confirmed" : "")
        }
        aria-hidden="true"
      >
        {complete && (
          <span className="lens-lock">
            <Check size={24} />
          </span>
        )}
      </div>
      <div
        className={
          "lens-confirmation" +
          (found ? " has-sighting" : "") +
          (complete ? " is-confirmed" : "")
        }
      >
        <div
          className="lens-confirmation-copy"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {found ? (
            <>
              <span className="lens-sighting-label">
                {complete
                  ? "A creature stirs"
                  : tentative
                    ? "Could it be…?"
                    : "A familiar presence…"}
              </span>
              <strong>{candidateName}</strong>
              <span className="lens-sighting-hint">
                {complete
                  ? "You found it. Waking the guardian…"
                  : tentative
                    ? "Tap below if this is who you found."
                    : "Hold steady · it’s coming into focus"}
              </span>
            </>
          ) : (
            <>
              <strong>
                {!ready
                  ? "Preparing the lens…"
                  : noticed
                    ? "The shape slipped away"
                    : "Find a guardian"}
              </strong>
              <span className="lens-sighting-hint">
                {!ready
                  ? "A little magic is getting ready."
                  : noticed
                    ? "Centre the creature again · we’re still looking"
                    : "Centre one creature · it will wake automatically"}
              </span>
            </>
          )}
        </div>
        {found && !tentative && (
          <div
            className="lens-confirmation-leaves"
            role="progressbar"
            aria-label="Guardian coming into focus"
            aria-valuemin={0}
            aria-valuemax={STABLE_FRAMES}
            aria-valuenow={leaves}
          >
            {Array.from({ length: STABLE_FRAMES }, (_, i) => (
              <span
                key={i}
                className={i < leaves ? "is-lit" : ""}
                aria-hidden="true"
              >
                <Leaf size={16} />
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
