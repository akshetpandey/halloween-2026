import React, { lazy, Suspense, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Crown,
  Leaf,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { guardians, type Guardian } from "../shared/catalog";
import type { ArchiveResults } from "../shared/archive";
import { familyNames, type PuzzleView } from "../shared/types";
import { GuardianArt, Forest } from "./Art";
import { Puzzle } from "./Puzzle";
import { api } from "./api";
import type { SpiritCharacter } from "./spirit-character";
import "./archive.css";
const Spirit = lazy(() => import("./FoxSpiritReveal"));

export function FinalResults({ results }: { results: ArchiveResults }) {
  const leaders = results.standings.filter((p) => p.rank === 1);
  return (
    <section
      className="archive-section"
      id="results"
      aria-labelledby="results-heading"
    >
      <span className="eyebrow">THE EVENING, REMEMBERED</span>
      <h2 id="results-heading">
        The final <em>standing.</em>
      </h2>
      {leaders.length > 0 && (
        <div className="archive-winners">
          <Crown size={28} aria-hidden="true" />
          <div>
            <span className="eyebrow">
              {leaders.length > 1 ? "SHARED FIRST PLACE" : "FIRST PLACE"}
            </span>
            <h3>{leaders.map((p) => p.name).join(" & ")}</h3>
            <p>
              {leaders[0].total} points{leaders.length > 1 ? " each" : ""}.
              Thank you for keeping the Court curious.
            </p>
          </div>
        </div>
      )}
      {results.costumeAward && (
        <p className="archive-award">
          <Sparkles size={18} /> Looking Glass costume award:{" "}
          <strong>{results.costumeAward.name}</strong> (+
          {results.costumeAward.bonus}).
        </p>
      )}
      {results.standings.length ? (
        <div className="archive-table-wrap">
          <table className="archive-table">
            <caption>Final party results. Equal scores share a place.</caption>
            <thead>
              <tr>
                <th scope="col">Place</th>
                <th scope="col">Guest</th>
                <th scope="col">Favors</th>
                <th scope="col">Summons</th>
                <th scope="col">Costume</th>
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {results.standings.map((p, i) => (
                <tr key={i}>
                  <td>{p.rank}</td>
                  <th scope="row">{p.name}</th>
                  <td>{p.favors}</td>
                  <td>{p.referrals}</td>
                  <td>{p.costumeBonus || "—"}</td>
                  <td>
                    <strong>{p.total}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>The gathering is remembered, even where no scores were recorded.</p>
      )}
      <p className="small muted">
        These are the party’s recorded results. Replaying a puzzle will not
        change them.
      </p>
    </section>
  );
}

export function GuardianGallery() {
  return (
    <section className="archive-section" aria-labelledby="guardians-heading">
      <span className="eyebrow">THE BESTIARY IS OPEN</span>
      <h1 id="guardians-heading">
        Old friends. <em>Unfinished riddles.</em>
      </h1>
      <p>
        Meet all fifteen guardians, watch their spirits come to life, and try
        every puzzle. Stay as long as you like.
      </p>
      <div className="archive-grid">
        {guardians.map((g) => (
          <a
            className="archive-guardian"
            href={`/guardians/${g.id}`}
            key={g.id}
          >
            <div className="archive-guardian-art">
              <GuardianArt kind={g.art} />
            </div>
            <span className="eyebrow">
              {g.room} · {g.virtue}
            </span>
            <h2>{g.name}</h2>
            <p>{familyNames[g.family]}</p>
            <span className="archive-card-action">
              Meet & play <ArrowRight size={16} />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

function GuardianReplay({ guardian: g }: { guardian: Guardian }) {
  const [trial, setTrial] = useState<{
    seed: string;
    puzzle: PuzzleView;
  } | null>(null);
  const [generation, setGeneration] = useState(0),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [solved, setSolved] = useState(false),
    [spirit, setSpirit] = useState(false);
  useEffect(() => {
    let active = true;
    setTrial(null);
    setError("");
    setMessage("");
    setSolved(false);
    void api<{ seed: string; puzzle: PuzzleView }>(`/archive/puzzle/${g.id}`)
      .then((next) => {
        if (active) setTrial(next);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [g.id, generation]);
  async function submit(answer: unknown) {
    if (!trial || busy) return false;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ correct: boolean }>(
        `/archive/puzzle/${g.id}`,
        "POST",
        { seed: trial.seed, answer },
      );
      setSolved(result.correct);
      setMessage(
        result.correct
          ? "The guardian is delighted. Well solved."
          : "Not quite. The guardian has time for another try.",
      );
      return result.correct;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="archive-section archive-replay">
      <a className="text-button" href="/guardians">
        <ArrowLeft size={16} /> All guardians
      </a>
      <div className="archive-portrait-row">
        <GuardianArt kind={g.art} />
        <div>
          <span className="eyebrow">
            {g.room} · {g.virtue}
          </span>
          <h1>{g.name}</h1>
          <p className="archive-greeting">“{g.greeting}”</p>
        </div>
      </div>
      <p>{g.lore}</p>
      <button className="btn secondary" onClick={() => setSpirit(true)}>
        <Sparkles size={17} /> Meet the spirit
      </button>
      <div className="panel archive-puzzle">
        <span className="eyebrow">A PUZZLE FOR ITS OWN SAKE</span>
        <h2>{familyNames[g.family]}</h2>
        <p className="small muted">
          No sign-in. No points. Your attempts are not saved.
        </p>
        {error && (
          <div role="alert">
            <p>{error}</p>
            <button
              className="text-button"
              onClick={() => setGeneration((n) => n + 1)}
            >
              Load another puzzle
            </button>
          </div>
        )}
        {!trial && !error && (
          <p role="status">The guardian is preparing a riddle…</p>
        )}
        {trial && !solved && (
          <Puzzle
            key={trial.seed}
            p={trial.puzzle}
            onSubmit={submit}
            busy={busy}
          />
        )}
        {message && (
          <p className={solved ? "archive-solved" : ""} role="status">
            {solved && <Check size={18} />} {message}
          </p>
        )}
        {trial && (
          <button
            className="text-button"
            disabled={busy}
            onClick={() => setGeneration((n) => n + 1)}
          >
            <RotateCcw size={16} /> Try a new variation
          </button>
        )}
      </div>
      {spirit && (
        <Suspense fallback={<p role="status">The spirit is waking…</p>}>
          <Spirit
            character={g.art as SpiritCharacter}
            onClose={() => setSpirit(false)}
            onContinue={async () => {
              setSpirit(false);
              document
                .querySelector(".archive-puzzle")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        </Suspense>
      )}
    </section>
  );
}

export default function Archive() {
  const [results, setResults] = useState<ArchiveResults | null>(null),
    [error, setError] = useState("");
  const path = window.location.pathname;
  const id = /^\/guardians\/([^/]+)\/?$/.exec(path)?.[1];
  const guardian = guardians.find((g) => g.id === id);
  const gallery = [
    "/guardians",
    "/guardians/",
    "/bestiary",
    "/trials",
  ].includes(path);
  async function load() {
    setError("");
    try {
      setResults(await api<ArchiveResults>("/archive/results"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="archive-site">
      <header className="archive-header">
        <a className="brand" href="/">
          <Leaf size={24} />
          <span>
            THE HOLLOW COURT
            <small>OCTOBER 31, 2026 · A NIGHT TO REMEMBER</small>
          </span>
        </a>
        <nav aria-label="Archive">
          <a href="/results">Final results</a>
          <a href="/guardians">Guardians & puzzles</a>
        </nav>
      </header>
      <main>
        {guardian ? (
          <GuardianReplay guardian={guardian} />
        ) : gallery ? (
          <GuardianGallery />
        ) : (
          <>
            {path !== "/results" && path !== "/standing" && (
              <section className="archive-hero">
                <Forest />
                <div className="archive-hero-copy">
                  <span className="eyebrow">UNTIL THE FOREST OPENS AGAIN</span>
                  <h1>
                    The Court was yours.
                    <br />
                    <em>Thank you for the magic.</em>
                  </h1>
                  <p>
                    To everyone who came beneath the boughs: thank you for the
                    costumes, the dancing, the laughter, and the strange little
                    moments you brought to life. The gathering has ended, but
                    its creatures are staying a little longer.
                  </p>
                  <div className="archive-actions">
                    <a className="btn" href="/guardians">
                      Visit the guardians <ArrowRight size={17} />
                    </a>
                    <a className="btn secondary" href="#results">
                      See the final results
                    </a>
                  </div>
                  {results && (
                    <p className="archive-stats">
                      {results.guests} guests joined the game · {results.favors}{" "}
                      Favors earned · {results.guardians} guardians to revisit
                    </p>
                  )}
                </div>
              </section>
            )}
            {error && (
              <div className="archive-section" role="alert">
                <p>
                  Final results could not load. The guardian puzzles are still
                  open.
                </p>
                <button className="btn secondary" onClick={() => void load()}>
                  Try results again
                </button>
              </div>
            )}
            {results && <FinalResults results={results} />}
            {!results && !error && (
              <p className="archive-section" role="status">
                Opening the guest book…
              </p>
            )}
            <section className="archive-section archive-invitation">
              <Leaf size={32} />
              <h2>
                A little more <em>wonder.</em>
              </h2>
              <p>
                Missed a guardian? Want another go at a riddle? Every spirit and
                every puzzle is here, open to everyone.
              </p>
              <a className="btn" href="/guardians">
                Explore all fifteen <ArrowRight size={17} />
              </a>
            </section>
          </>
        )}
      </main>
      <footer className="archive-footer">
        The Hollow Court · Halloween 2026
        <br />
        <span>Play freely. No login, no points, no saved progress.</span>
      </footer>
    </div>
  );
}
