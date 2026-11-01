import React from "react";
import { ArrowRight, Camera, Check, LockKeyhole } from "lucide-react";
import { GuardianArt } from "./Art";
import { guardianProgress, type Discovery } from "../shared/guardian-progress";
export function GuardianProgress({
  earned,
  discovered = [],
  onOpen,
  onScan,
  compact = false,
}: {
  earned: string[];
  discovered?: Discovery[];
  onOpen: (code: string) => void;
  onScan: () => void;
  compact?: boolean;
}) {
  const all = guardianProgress(earned, discovered),
    pending = all.filter((g) => g.status === "pending"),
    solved = all.filter((g) => g.status === "solved"),
    unfound = all.filter((g) => g.status === "unfound");
  const Title = compact ? "h2" : "h1";
  return (
    <section
      className={
        compact
          ? "guardian-progress panel"
          : "guardian-progress page-top narrow"
      }
      aria-label="Your puzzle progress"
    >
      <span className="eyebrow">YOUR PUZZLES</span>
      <Title className="progress-title">
        {pending.length
          ? `${pending.length} puzzle${pending.length === 1 ? "" : "s"} still to solve.`
          : solved.length === 15
            ? "Every Favor earned."
            : "Find a guardian. Solve its puzzle."}
      </Title>
      <div className="puzzle-counts" aria-label="Progress totals">
        <span>
          <strong>{solved.length}</strong> Solved
        </span>
        <span className={pending.length ? "has-pending" : ""}>
          <strong>{pending.length}</strong> Unfinished
        </span>
        <span>
          <strong>{unfound.length}</strong> Still to find
        </span>
      </div>
      {!!pending.length && (
        <>
          <h2 className="progress-subtitle">Found — waiting for your answer</h2>
          <p className="small muted">
            You have already found these guardians. Open a puzzle to earn its
            Favor. No need to scan these again.
          </p>
          <div className="puzzle-progress-list">
            {pending.map(({ guardian, code }) => (
              <button
                key={guardian.id}
                className="puzzle-progress-card is-pending"
                onClick={() => code && onOpen(code)}
              >
                <GuardianArt kind={guardian.art} />
                <span>
                  <strong>{guardian.name}</strong>
                  <small>Found · Puzzle unfinished</small>
                  <b>Solve puzzle · Earn 1 Favor</b>
                </span>
                <ArrowRight size={20} />
              </button>
            ))}
          </div>
        </>
      )}
      {!pending.length && solved.length < 15 && (
        <p>
          {solved.length
            ? "You’ve solved every puzzle you’ve found. Scan another guardian to unlock its puzzle."
            : "Scan a real guardian to unlock its puzzle. Finding it starts the challenge; solving it earns a Favor."}
        </p>
      )}
      {!pending.length && solved.length < 15 && (
        <p className="small muted">
          If an earlier awakening is missing here, scan that guardian once more
          to save its puzzle.
        </p>
      )}
      {!!unfound.length && (
        <button className="btn" onClick={onScan}>
          <Camera size={18} />
          Find and scan {pending.length ? "another" : "a"} guardian
        </button>
      )}
      {!compact && !!unfound.length && (
        <>
          <h2 className="progress-subtitle">Not found yet — scan to unlock</h2>
          <div className="puzzle-progress-list">
            {unfound.map(({ guardian }) => (
              <article
                key={guardian.id}
                className="puzzle-progress-card is-unfound"
              >
                <GuardianArt kind={guardian.art} />
                <span>
                  <strong>{guardian.name}</strong>
                  <small>Not found yet · Scan this guardian first</small>
                </span>
                <LockKeyhole size={18} />
              </article>
            ))}
          </div>
        </>
      )}
      {!compact && !!solved.length && (
        <>
          <h2 className="progress-subtitle">Completed — Favor earned</h2>
          <div className="puzzle-progress-list">
            {solved.map(({ guardian }) => (
              <article
                key={guardian.id}
                className="puzzle-progress-card is-solved"
              >
                <GuardianArt kind={guardian.art} />
                <span>
                  <strong>{guardian.name}</strong>
                  <small>Puzzle solved · Favor earned</small>
                </span>
                <Check size={20} />
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
