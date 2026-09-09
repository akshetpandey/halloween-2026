import React, { useEffect, useState } from "react";
import { api } from "./api";
import type { CostumeAward } from "../shared/costumes";
type Tally = {
  people: { id: string; name: string; leaves: number }[];
  voters: number;
  award: CostumeAward | null;
  canPublish: boolean;
};
export function HostCostumes({ realm }: { realm: string }) {
  const [tally, setTally] = useState<Tally | null>(null),
    [winner, setWinner] = useState(""),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [review, setReview] = useState(false);
  async function load() {
    setTally(await api<Tally>("/admin/costumes?realm=" + realm));
  }
  useEffect(() => {
    setTally(null);
    setWinner("");
    setReason("");
    setReview(false);
    void load().catch((e) => setError(e.message));
    const refresh = () => {
      if (document.visibilityState === "visible") void load().catch(() => {});
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [realm]);
  async function publish() {
    setBusy(true);
    setError("");
    try {
      setTally(
        await api<Tally>("/admin/costumes?realm=" + realm, "POST", {
          winnerId: winner,
          reason,
        }),
      );
      setReview(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const chosen = tally?.people.find((p) => p.id === winner);
  return (
    <section className="panel host-costumes">
      <span className="eyebrow">FOR THE KEEPER · PRIVATE COSTUME VOTES</span>
      <h2>
        The gathering’s <em>leaves.</em>
      </h2>
      <p>
        Guests’ opinions guide your choice. At the end, choose the
        recipient—including resolving ties—and publish the costume award with
        its +3 bonus. Guest vote totals stay private.
      </p>
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      {!tally ? (
        <p>Gathering the leaves…</p>
      ) : (
        <>
          <p>
            {tally.voters} guests have placed leaves.{" "}
            <button
              className="text-button"
              onClick={() => void load().catch((e) => setError(e.message))}
            >
              Refresh totals
            </button>
          </p>
          {tally.award ? (
            <p role="status">
              <strong>{tally.award.name}</strong> received the costume award and
              +3 points. Published once; the costume vote is frozen.
            </p>
          ) : (
            <>
              <div className="host-vote-list">
                {tally.people.map((p) => (
                  <div key={p.id}>
                    <span>{p.name}</span>
                    <strong>
                      {p.leaves} {p.leaves === 1 ? "leaf" : "leaves"}
                    </strong>
                  </div>
                ))}
              </div>
              {!tally.people.length ? (
                <p>No costume entries yet.</p>
              ) : (
                <>
                  <label>
                    AWARD RECIPIENT
                    <select
                      value={winner}
                      onChange={(e) => {
                        setWinner(e.target.value);
                        setReview(false);
                      }}
                      disabled={busy}
                    >
                      <option value="">Choose a costume</option>
                      {tally.people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {p.leaves} leaves
                        </option>
                      ))}
                    </select>
                  </label>
                  {chosen && (
                    <img
                      className="host-award-preview"
                      src={"/api/admin/photo/" + chosen.id}
                      alt={chosen.name + " costume"}
                    />
                  )}
                  <label>
                    PRIVATE HOST NOTE
                    <textarea
                      value={reason}
                      maxLength={500}
                      onChange={(e) => {
                        setReason(e.target.value);
                        setReview(false);
                      }}
                      placeholder="Your choice, tie decision, or special recognition"
                      disabled={busy}
                    />
                  </label>
                  {!tally.canPublish ? (
                    <p className="small muted">
                      Publishing unlocks when voting closes. You can review
                      opinions now.
                    </p>
                  ) : (
                    <>
                      {realm === "preview" && (
                        <p className="small muted">
                          This publishes only the rehearsal award and freezes
                          rehearsal costume voting.
                        </p>
                      )}
                      {review && chosen ? (
                        <div className="award-confirm">
                          <p>
                            Announce <strong>{chosen.name}</strong> as the
                            costume-award recipient and add +3 points? This
                            finalizes the award for this gathering.
                          </p>
                          <button
                            className="btn"
                            disabled={busy}
                            onClick={() => void publish()}
                          >
                            {busy ? "Publishing…" : "Publish award +3"}
                          </button>
                          <button
                            className="text-button"
                            disabled={busy}
                            onClick={() => setReview(false)}
                          >
                            Back to review
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn secondary"
                          disabled={!winner || reason.trim().length < 5 || busy}
                          onClick={() => setReview(true)}
                        >
                          Review final +3 award
                        </button>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
