import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Camera,
  Check,
  ChevronRight,
  Compass,
  Copy,
  Crown,
  ExternalLink,
  Leaf,
  LockKeyhole,
  Menu,
  Moon,
  ScanLine,
  Settings2,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/cormorant-garamond/latin-400-italic.css";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import { guardians, type Guardian } from "../shared/catalog";
import { familyNames, type State, type PuzzleView } from "../shared/types";
import { Forest, GuardianArt, Mark } from "./Art";
import { WoodlandQR } from "./WoodlandQR";
import { Puzzle } from "./Puzzle";
import "./style.css";
import { api } from "./api";
import { HostDashboard } from "./HostDashboard";
import { StoryReveal, type Reveal } from "./Reveals";
function App() {
  const [location, setLocation] = useState(
      window.location.pathname + window.location.search,
    ),
    [state, setState] = useState<State | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [debug, setDebug] = useState(false),
    [mobile, setMobile] = useState(false),
    [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState<{ id: string; code: string }[]>([]),
    [encounter, setEncounter] = useState<{
      guardian: Guardian;
      puzzle: PuzzleView;
      earned: boolean;
    } | null>(null),
    [trialMessage, setTrialMessage] = useState(""),
    [card, setCard] = useState<Guardian | null>(null),
    [reveal, setReveal] = useState<Reveal | null>(null);
  const [invite, setInvite] = useState<{
      milestone: number;
      used: boolean;
      inviter: string;
      preview: boolean;
    } | null>(null),
    [standing, setStanding] = useState<
      {
        id: string;
        name: string;
        photo: number;
        favors: number;
        referrals: number;
      }[]
    >([]),
    [ballot, setBallot] = useState<{
      id: string;
      people: { id: string; name: string }[];
    } | null>(null);
  const path = location.split("?")[0],
    params = new URLSearchParams(location.split("?")[1] || "");
  const count = state?.favors.length || 0;
  const summonsOrigin =
    state?.player?.realm === "preview"
      ? window.location.origin
      : state?.publicOrigin;
  async function refresh() {
    const s = await api<State>("/state");
    setState(s);
    return s;
  }
  function go(to: string) {
    if (!to.startsWith("/") || to.startsWith("//")) to = "/court";
    history.pushState(null, "", to);
    setLocation(to);
    setError("");
    setNotice("");
    setMobile(false);
    setDebug(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  useEffect(() => {
    const pop = () =>
      setLocation(window.location.pathname + window.location.search);
    window.addEventListener("popstate", pop);
    void refresh().catch((e) => setError(e.message));
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    if (state?.previewAvailable)
      void api<{ id: string; code: string }[]>("/debug/guardians")
        .then(setCodes)
        .catch((e) => setError(e.message));
  }, [state?.previewAvailable]);
  useEffect(() => {
    setEncounter(null);
    setTrialMessage("");
    setBallot(null);
    if (
      path.startsWith("/g/") &&
      state?.player?.registered &&
      state.status === "open"
    ) {
      let live = true;
      void api<{ guardian: Guardian; puzzle: PuzzleView; earned: boolean }>(
        "/guardian/" + path.split("/")[2],
      )
        .then((e) => {
          if (live) setEncounter(e);
        })
        .catch((e) => setError(e.message));
      return () => {
        live = false;
      };
    }
  }, [path, state?.player?.id, state?.player?.registered, state?.status]);
  useEffect(() => {
    if (
      /^\/s\//i.test(path) &&
      state &&
      (state.previewAvailable || state.status !== "sealed")
    ) {
      setInvite(null);
      void api<typeof invite>("/invite/" + path.split("/")[2])
        .then(setInvite)
        .catch((e) => setError(e.message));
    }
  }, [path, state?.previewAvailable, state?.status]);
  useEffect(() => {
    if (path === "/standing" && state?.player?.registered) {
      const load = () =>
        void api<typeof standing>("/standing")
          .then(setStanding)
          .catch((e) => setError(e.message));
      load();
      const timer = setInterval(load, 15000);
      return () => clearInterval(timer);
    }
  }, [path, state?.player?.id]);
  useEffect(() => {
    const timer = setInterval(() => void refresh().catch(() => {}), 30000);
    return () => clearInterval(timer);
  }, []);
  async function start(preview = false, demo = false, to = "/court") {
    setBusy(true);
    try {
      const s = await api<State & { recovery?: string }>(
        "/session/start",
        "POST",
        { preview, demo },
      );
      setState(s);
      go(s.player?.registered ? to : "/join?next=" + encodeURIComponent(to));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Copied to your clipboard.");
    } catch {
      setNotice("Copy this link: " + value);
    }
  }
  async function solve(answer: unknown) {
    if (!encounter) return false;
    setBusy(true);
    setTrialMessage("");
    try {
      const result = await api<{ correct: boolean; state?: State }>(
        "/solve/" + path.split("/")[2],
        "POST",
        { answer },
      );
      if (result.correct) {
        const newChapter = result.state!.chapters.find(
          (c) => !state?.chapters.some((old) => old.at === c.at),
        );
        setState(result.state!);
        if (newChapter) setReveal({ chapter: newChapter });
        setEncounter({ ...encounter, earned: true });
        setTrialMessage("Its Favor is yours.");
        setBallot(
          await api<typeof ballot>("/ballot?guardian=" + encounter.guardian.id),
        );
        return true;
      }
      setTrialMessage("The creature waits. Try again.");
      return false;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function previewReveal(at: number) {
    await action(async () => {
      if (!state?.player?.registered || state.player.realm !== "preview") {
        await api("/session/start", "POST", { preview: true, demo: true });
      }
      const next = await api<State>("/debug/progress", "POST", { count: at });
      setState(next);
      go("/court");
      const chapter = next.chapters.find((c) => c.at === at);
      if (chapter) setReveal({ chapter, preview: true });
    });
  }
  const Logo = () => (
    <button className="brand" onClick={() => go("/court")}>
      <span className="brand-mark">
        <Leaf size={22} />
      </span>
      <span>
        THE HOLLOW COURT<small>A GATHERING BENEATH THE BOUGHS</small>
      </span>
    </button>
  );
  const nav = [
    ["/court", "The Court", Compass],
    ["/bestiary", "Bestiary", Leaf],
    ["/chronicle", "Chronicle", BookOpen],
    ["/summons", "Summons", Users],
    ["/standing", "Standing", Sparkles],
  ] as const;
  const locked =
    path === "/sealed" ||
    (state?.status === "sealed" && !state.previewAvailable) ||
    (!["/join", "/recover", "/account"].includes(path) &&
      !/^\/s\//i.test(path) &&
      state?.status === "sealed");
  let content: React.ReactNode;
  if (!state)
    content = (
      <div className="loading">
        <Moon className="breathe" />
        <p>The wood is listening…</p>
        {error && (
          <>
            <p>{error}</p>
            <button
              className="btn"
              onClick={() => void refresh().catch((e) => setError(e.message))}
            >
              Try again
            </button>
          </>
        )}
      </div>
    );
  else if (path === "/host")
    content = <HostDashboard preview={state.previewAvailable} />;
  else if (locked)
    content = (
      <>
        <section className="sealed-hero">
          <Forest />
          <div className="sealed-copy">
            <div className="eyebrow">
              <span className="status-dot" /> THE THRESHOLD IS SEALED
            </div>
            <h1>
              Some doors open
              <br />
              <em>only after dark.</em>
            </h1>
            <p>
              Something beneath this house is still sleeping.
              <br />
              Return when the eighth bell has sounded.
            </p>
            <div className="date-rule">
              <span>OCTOBER 31, 2026</span>
              <i />8 PM · NEW YORK
            </div>
          </div>
        </section>
        <section className="invitation-band">
          <div>
            <span className="eyebrow">
              UNTIL THEN, THE MORTAL INVITATION REMAINS
            </span>
            <h2>
              You are expected
              <br />
              <em>beneath the boughs.</em>
            </h2>
            <p>
              An evening of strange company, woodland spirits,
              <br className="desktop-only" /> and a little unfinished business.
            </p>
          </div>
          <div className="qr-bookplate">
            <WoodlandQR value={state.partifulUrl} />
            <span>FOLLOW THE LEAVES</span>
            <a
              className="qr-invitation-link"
              href={state.partifulDirectUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open the invitation <ExternalLink size={12} />
            </a>
          </div>
        </section>
        <div className="whisper">
          “The roots have reached this house. They are learning who lives above
          them.”
        </div>
      </>
    );
  else if (path === "/join")
    content = (
      <Join
        state={state}
        next={params.get("next") || "/court"}
        inviteToken={params.get("invite") || ""}
        onDone={(s) => {
          setState(s);
          go(params.get("next") || "/court");
          if (s.chapters[0]) setReveal({ chapter: s.chapters[0] });
        }}
        onRecover={() => go("/recover")}
        onStart={() =>
          start(state.previewAvailable, false, params.get("next") || "/court")
        }
      />
    );
  else if (path === "/recover")
    content = (
      <section className="narrow panel page-top">
        <span className="eyebrow">A FAMILIAR PRESENCE</span>
        <h1>
          The wood
          <br />
          <em>remembers you.</em>
        </h1>
        <p>
          Ask the host to find you in the guest book and give you a three-word
          return phrase. Your Favors and assigned trials will return with you.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            void action(async () => {
              const s = await api<State & { recovery: string }>(
                "/session/recover",
                "POST",
                { code: form.get("code") },
              );
              setState(s);
              go("/account");
              setNotice("You are recognized. This browser will remember you.");
            });
          }}
        >
          <label>
            YOUR RETURN PHRASE
            <input
              name="code"
              autoComplete="off"
              required
              placeholder="Three words from the host"
              autoCapitalize="none"
              spellCheck={false}
            />
          </label>
          <button className="btn" disabled={busy}>
            Return to the Court <ArrowRight size={16} />
          </button>
        </form>
      </section>
    );
  else if (/^\/s\//i.test(path))
    content = (
      <section className="invite-arrival narrow page-top">
        <Mark index={1} size={48} />
        <span className="eyebrow">A SUMMONS FROM THE HOLLOW COURT</span>
        <h1>
          Someone has
          <br />
          <em>made room for you.</em>
        </h1>
        {invite ? (
          <>
            <p>
              {invite.inviter} carries this invitation. The creatures are
              listening. Enter the gathering beneath the boughs.
            </p>
            {invite.used ? (
              <>
                <p>
                  This Summons has already welcomed someone. You can still join
                  the Court.
                </p>
                <button
                  className="btn"
                  onClick={() => void start(invite.preview, false)}
                >
                  Enter the Court <ArrowRight size={16} />
                </button>
              </>
            ) : state.player?.registered ? (
              <>
                <p>
                  You are already known to the Court. This invitation is for
                  someone who has yet to enter.
                </p>
                <button className="btn" onClick={() => go("/court")}>
                  Return to your gathering
                </button>
                {state.previewAvailable && invite.preview && (
                  <>
                    <button
                      className="btn secondary"
                      disabled={busy}
                      onClick={() =>
                        void action(async () => {
                          await api("/session/logout", "POST");
                          setState(
                            await api<State>("/session/start", "POST", {
                              preview: true,
                            }),
                          );
                          go("/join?invite=" + path.split("/")[2]);
                        })
                      }
                    >
                      Test accepting as a new rehearsal guest
                    </button>
                    <p className="small muted">
                      Starts a new guest in this browser. Your existing
                      rehearsal guest stays saved.
                    </p>
                  </>
                )}
              </>
            ) : (
              <button
                className="btn"
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    const s = await api<State & { recovery?: string }>(
                      "/session/start",
                      "POST",
                      { preview: invite.preview },
                    );
                    setState(s);
                    go("/join?invite=" + path.split("/")[2]);
                  })
                }
              >
                Accept the Summons <ArrowRight size={16} />
              </button>
            )}
            <p className="small muted">
              For someone already at the party. No account or app download
              needed.
            </p>
          </>
        ) : (
          <p>Unfolding your invitation…</p>
        )}
      </section>
    );
  else if (state.status === "closed")
    content = (
      <section className="narrow page-top">
        <Moon size={40} />
        <h1>
          The Court
          <br />
          <em>has closed.</em>
        </h1>
        <p>
          The witnesses have been heard. The host will announce the Court’s
          judgment when the testimony is ready.
        </p>
        <p className="muted">The party continues.</p>
      </section>
    );
  else if (!state.player?.registered && path !== "/account")
    content = (
      <section className="welcome-gate page-top narrow">
        <GuardianArt kind="door" />
        <span className="eyebrow">THE COURT REQUIRES A WITNESS</span>
        <h1>
          Leave a name.
          <br />
          <em>Become a story.</em>
        </h1>
        <p>
          Leave the name by which we may call you, and the guise in which you
          arrived tonight.
        </p>
        <button className="btn" onClick={() => void start(false, false, path)}>
          Enter the gathering <ArrowRight size={16} />
        </button>
        <button className="text-button" onClick={() => go("/recover")}>
          I have been here before
        </button>
      </section>
    );
  else if (path === "/court" || path === "/")
    content = (
      <>
        <section className="court-hero">
          <Forest />
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="status-dot" /> THE COURT IS AWAKE
            </div>
            <h1>
              The wood is
              <br />
              <em>learning your name.</em>
            </h1>
            <p>
              Fifteen guardians. One unfinished gathering.
              <br />
              Find the creatures. Earn their Favor.
              <br />
              Let the evening become a story.
            </p>
            <button className="btn light" onClick={() => go("/bestiary")}>
              Meet the guardians <ArrowRight size={16} />
            </button>
          </div>
          <div className="hero-footnote">
            <span>OCTOBER XXXI · MMXXVI</span>
            <span>WILLIAMSBURG, BROOKLYN</span>
          </div>
        </section>
        <section className="progress-strip">
          <span className="avatar">
            {state.player?.photo ? (
              <img src={"/api/photo/" + state.player.id} alt="Your guise" />
            ) : (
              <Leaf size={22} />
            )}
          </span>
          <div className="welcome-name">
            <span className="eyebrow">A PRESENCE IN THE WOOD</span>
            <h3>{state.player?.name}</h3>
          </div>
          <div className="favor-progress">
            <div>
              <span>
                {count} <small>of 15 Favors</small>
              </span>
              <span>
                {count === 15
                  ? "Every creature remembers."
                  : "The creatures are listening."}
              </span>
            </div>
            <div className="progress-ticks">
              {guardians.map((g, i) => (
                <i key={g.id} className={i < count ? "earned" : ""} />
              ))}
            </div>
          </div>
          <button className="text-button" onClick={() => go("/account")}>
            Your keepsakes <ArrowRight size={14} />
          </button>
        </section>
        <section className="home-story">
          <div className="chapter-preview">
            <span className="eyebrow">
              FROM THE CHRONICLE · CHAPTER {state.chapters.length}
            </span>
            <h2>{state.chapters.at(-1)?.title.split(" — ")[1]}</h2>
            <p>{state.chapters.at(-1)?.text}</p>
            <button className="text-button" onClick={() => go("/chronicle")}>
              Read the Chronicle <ArrowRight size={16} />
            </button>
          </div>
          <div className="field-note">
            <ScanLine size={26} />
            <span className="eyebrow">A SMALL FIELD NOTE</span>
            <h3>Look for the little moons.</h3>
            <p>
              A moon beside a creature marks its threshold. Hold the top of your
              phone nearby, open the link, and see what it asks of you.
            </p>
            <small>The creatures stay where they live.</small>
          </div>
        </section>
        <section className="rooms">
          <div className="section-heading">
            <div>
              <span className="eyebrow">THREE PLACES, ONE GATHERING</span>
              <h2>Where the Court takes root</h2>
            </div>
            <span className="ornament">✧</span>
          </div>
          {[
            ["October Grove", "The place that remembers.", "tree"],
            ["The Hollow", "The place that remains alive.", "guardian"],
            ["Moon Well", "The place that lets go.", "well"],
          ].map(([room, tag, art], i) => (
            <button
              className="room-card"
              key={room}
              onClick={() => go("/bestiary?room=" + encodeURIComponent(room))}
            >
              <span className="room-index">0{i + 1}</span>
              <GuardianArt kind={art} />
              <div>
                <h3>{room}</h3>
                <p>{tag}</p>
              </div>
              <ArrowRight size={20} />
            </button>
          ))}
        </section>
        {count >= 4 && (
          <section className="summons-nudge">
            <Leaf />
            <div>
              <h3>Leave the door open.</h3>
              <p>
                {state.summons.filter((s) => !s.redeemed).length} Summons
                waiting to welcome someone new.
              </p>
            </div>
            <button className="btn secondary" onClick={() => go("/summons")}>
              Your Summons <ArrowRight size={15} />
            </button>
          </section>
        )}
      </>
    );
  else if (path === "/bestiary")
    content = (
      <section className="page-top">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A RECORD OF ACQUAINTANCE</span>
            <h1>
              The <em>Bestiary</em>
            </h1>
            <p>
              Some are ancient. Some are made of straw.
              <br />
              Each has a different reason to remember you.
            </p>
          </div>
          <div className="collection-count">
            {count}
            <span>/ XV RECOGNIZED</span>
          </div>
        </div>
        <div className="filters">
          {["All guardians", "October Grove", "The Hollow", "Moon Well"].map(
            (room) => (
              <button
                key={room}
                className={
                  (params.get("room") || "All guardians") === room
                    ? "active"
                    : ""
                }
                onClick={() =>
                  go(
                    "/bestiary" +
                      (room === "All guardians"
                        ? ""
                        : "?room=" + encodeURIComponent(room)),
                  )
                }
              >
                {room}
              </button>
            ),
          )}
        </div>
        <div className="guardian-grid">
          {guardians
            .filter((g) => !params.get("room") || g.room === params.get("room"))
            .map((g, i) => (
              <button
                className={
                  "guardian-card " +
                  (state.favors.includes(g.id) ? "earned" : "unknown")
                }
                key={g.id}
                onClick={() => setCard(g)}
              >
                <div className="guardian-card-top">
                  <span>
                    {String(guardians.indexOf(g) + 1).padStart(2, "0")}
                  </span>
                  {state.favors.includes(g.id) ? (
                    <span>
                      <Check size={12} /> FAVOR EARNED
                    </span>
                  ) : (
                    <span>AWAITING YOU</span>
                  )}
                </div>
                <GuardianArt kind={g.art} />
                <span className="eyebrow">{g.room}</span>
                <h3>{g.name}</h3>
                <span className="card-virtue">
                  {g.virtue} <ChevronRight size={14} />
                </span>
              </button>
            ))}
        </div>
      </section>
    );
  else if (path.startsWith("/g/"))
    content = encounter ? (
      <section className="encounter page-top">
        <button className="text-button back" onClick={() => go("/court")}>
          <ArrowLeft size={15} /> Back to the Court
        </button>
        <div className="encounter-layout">
          <aside className="guardian-portrait">
            <span className="eyebrow">{encounter.guardian.room}</span>
            <GuardianArt kind={encounter.guardian.art} />
            <span className="plate-caption">
              {encounter.guardian.virtue} · WITNESS{" "}
              {String(
                guardians.indexOf(
                  guardians.find((g) => g.id === encounter.guardian.id)!,
                ) + 1,
              ).padStart(2, "0")}
            </span>
          </aside>
          <div className="encounter-main">
            <span className="eyebrow">YOU HAVE FOUND A GUARDIAN</span>
            <h1>{encounter.guardian.name}</h1>
            <p className="guardian-greeting">“{encounter.guardian.greeting}”</p>
            {encounter.earned ? (
              <div className="earned-panel">
                <span className="earned-medallion">
                  <Check size={28} />
                </span>
                <span className="eyebrow">ONE VOICE IN YOUR FAVOR</span>
                <h2>It remembers you.</h2>
                <p>{encounter.guardian.lore}</p>
                {ballot && (
                  <div className="looking-glass">
                    <span className="eyebrow">THE LOOKING GLASS</span>
                    <h3>Which guise has captured the Court’s attention?</h3>
                    <div>
                      {ballot.people.map((person) => (
                        <button
                          key={person.id}
                          onClick={() =>
                            void action(async () => {
                              await api("/ballot", "POST", {
                                id: ballot.id,
                                choice: person.id,
                              });
                              setBallot(null);
                              setNotice("The glass remembers your judgment.");
                            })
                          }
                        >
                          <img
                            src={"/api/photo/" + person.id}
                            alt={person.name + " costume"}
                          />
                          <span>{person.name}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setBallot(null)}
                    >
                      Not now
                    </button>
                  </div>
                )}
                <div className="earned-actions">
                  <button
                    className="btn"
                    onClick={() =>
                      go(count === 4 || count === 10 ? "/summons" : "/court")
                    }
                  >
                    {count === 4 || count === 10
                      ? "A Summons awaits"
                      : "Return to the gathering"}
                    <ArrowRight size={16} />
                  </button>
                  {state.previewAvailable && (
                    <button
                      className="text-button"
                      onClick={() =>
                        setEncounter({ ...encounter, earned: false })
                      }
                    >
                      Replay this trial · no extra Favor
                    </button>
                  )}
                  {state.previewAvailable && (
                    <button
                      className="text-button"
                      onClick={() => setDebug(true)}
                    >
                      Meet another guardian
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Puzzle
                  key={encounter.guardian.id}
                  p={encounter.puzzle}
                  onSubmit={solve}
                  busy={busy}
                />
                {trialMessage && (
                  <p role="status" className="trial-message">
                    {trialMessage}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    ) : (
      <div className="loading">
        <Moon className="breathe" />
        <p>Something has noticed you…</p>
      </div>
    );
  else if (path === "/chronicle")
    content = (
      <section className="chronicle page-top">
        <span className="eyebrow">WHAT THE WOOD REMEMBERS</span>
        <h1>
          The <em>Chronicle</em>
        </h1>
        <p>A gathering recorded one voice at a time.</p>
        <div className="chronicle-list">
          {state.chapters.map((c, i) => (
            <article key={c.at}>
              <div className="chapter-number">
                {["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"][i]}
              </div>
              <div>
                <span className="eyebrow">
                  {c.at === 0 ? "YOUR ARRIVAL" : `${c.at} FAVORS EARNED`}
                </span>
                <h2>{c.title.split(" — ")[1]}</h2>
                <p>{c.text}</p>
              </div>
            </article>
          ))}
          {count < 15 && (
            <div className="chapter-locked">
              <LockKeyhole size={20} />
              <p>
                More of the record is still unwritten.
                <br />
                <span>Continue earning the guardians’ Favor.</span>
              </p>
            </div>
          )}
        </div>
      </section>
    );
  else if (path === "/summons")
    content = (
      <section className="summons-page page-top">
        <span className="eyebrow">HOSPITALITY IS ITS OWN KIND OF MAGIC</span>
        <h1>
          Leave the
          <br />
          <em>door open.</em>
        </h1>
        <p>
          The gathering has room for someone new.
          <br />
          Carry a Summons to a guest who has yet to enter the Court.
        </p>
        {params.get("milestone") && (
          <button className="text-button" onClick={() => go("/summons")}>
            View all your Summons
          </button>
        )}
        <div className="summons-grid">
          {[4, 10]
            .filter(
              (n) =>
                !params.get("milestone") ||
                Number(params.get("milestone")) === n,
            )
            .map((n) => {
              const i = n === 4 ? 0 : 1;
              const s = state.summons.find((s) => s.milestone === n);
              return (
                <article
                  key={n}
                  className={"summons-card " + (!s ? "is-locked" : "")}
                >
                  <span className="eyebrow">
                    SUMMONS {i === 0 ? "I" : "II"} · {n} FAVORS
                  </span>
                  <h2>
                    {i === 0
                      ? "Make room beneath the boughs."
                      : "Keep the circle open."}
                  </h2>
                  {s ? (
                    s.redeemed ? (
                      <div className="summons-used">
                        <Check size={34} />
                        <h3>A new name has entered.</h3>
                        <p>
                          Your invitation has been received.
                          <br />
                          One point has been added to your Standing.
                        </p>
                      </div>
                    ) : (
                      <>
                        <p>
                          {i === 0
                            ? "The Court has heard your name. Carry this invitation to someone here whose name it has yet to learn."
                            : "You know your way among the creatures now. Find someone here who does not. Let this become their evening too."}
                        </p>
                        <WoodlandQR value={summonsOrigin + "/s/" + s.token} />
                        <button
                          className="btn secondary"
                          onClick={() =>
                            void copy(summonsOrigin + "/s/" + s.token)
                          }
                        >
                          <Copy size={15} /> Copy invitation link
                        </button>
                        {state.previewAvailable && (
                          <button
                            className="text-button"
                            onClick={() => go("/s/" + s.token)}
                          >
                            Preview the receiving guest’s invitation
                          </button>
                        )}
                        <button
                          className="text-button"
                          onClick={() => go("/court")}
                        >
                          Not now · keep it for later
                        </button>
                      </>
                    )
                  ) : (
                    <div className="summons-locked">
                      <LockKeyhole size={32} />
                      <p>
                        {Math.max(0, n - count)} more Favors to open this
                        Summons.
                      </p>
                      <div className="mini-progress">
                        <span
                          style={{
                            width: Math.min(100, (count / n) * 100) + "%",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
        </div>
        <p className="small muted">
          Each invitation welcomes one new player already at the party. A
          completed name and selfie registration earns you one point. Existing
          players do not count.
        </p>
      </section>
    );
  else if (path === "/standing")
    content = (
      <section className="page-top standing">
        <span className="eyebrow">SOME NAMES CARRY FARTHER</span>
        <h1>
          Before <em>the Court</em>
        </h1>
        <p>
          The Looking Glass has not rendered its judgment.
          <br />
          Favors and completed Summons are counted here.
        </p>
        <div className="podium">
          {standing.slice(0, 3).map((s, i) => (
            <article key={s.id}>
              <span className="standing-rank">
                {standing.findIndex(
                  (x) => x.favors + x.referrals === s.favors + s.referrals,
                ) + 1}
              </span>
              <div className="standing-portrait">
                {s.photo ? (
                  <img src={"/api/photo/" + s.id} alt={s.name} />
                ) : (
                  <GuardianArt
                    kind={i === 0 ? "stag" : i === 1 ? "owl" : "raven"}
                  />
                )}
              </div>
              <h3>{s.name}</h3>
              <strong>
                {s.favors + s.referrals}
                <small> POINTS</small>
              </strong>
            </article>
          ))}
        </div>
        <div className="standing-list">
          {standing.map((s, i) => (
            <div key={s.id}>
              <span>
                {standing.findIndex(
                  (x) => x.favors + x.referrals === s.favors + s.referrals,
                ) + 1}
              </span>
              <strong>
                {s.name}
                {s.id === state.player?.id && <small> YOU</small>}
              </strong>
              <span>
                {s.favors} Favors · {s.referrals} Summons
              </span>
              <b>{s.favors + s.referrals}</b>
            </div>
          ))}
        </div>
        <p className="small muted">
          Equal scores share a place. The costume award and final ceremony await
          the host’s agreed rules.
        </p>
      </section>
    );
  else if (path === "/account")
    content = (
      <section className="narrow page-top account">
        <span className="eyebrow">YOUR KEEPSAKES</span>
        <h1>
          A name
          <br />
          <em>worth keeping.</em>
        </h1>
        {state.player?.photo && (
          <img
            className="account-photo"
            src={"/api/photo/" + state.player.id}
            alt="Your costume portrait"
          />
        )}
        <h2>{state.player?.name || "A visitor at the threshold"}</h2>
        <p>
          This browser remembers you. If you change phones or lose your place,
          ask the host for a three-word return phrase. Nothing to save or
          remember tonight.
        </p>
        <button className="text-button" onClick={() => go("/recover")}>
          Enter a return phrase <ArrowRight size={16} />
        </button>
        <p className="small muted">
          Your portrait is visible to registered participants for costume
          judgments and standings. Your account and portrait are kept without an
          automatic expiry.
        </p>
        <div className="account-actions">
          <button
            className="btn secondary"
            onClick={() =>
              void action(async () => {
                await api("/session/logout", "POST");
                await refresh();
                go("/");
              })
            }
          >
            Leave this browser
          </button>
        </div>
      </section>
    );
  else
    content = (
      <section className="narrow page-top">
        <h1>Beyond the wood.</h1>
        <p>This path has no guardian.</p>
        <button className="btn" onClick={() => go("/court")}>
          Return to the Court
        </button>
      </section>
    );
  return (
    <>
      <header className="site-header">
        <Logo />
        {!!state?.player?.registered && (
          <>
            <nav className={mobile ? "mobile-open" : ""}>
              {nav.map(([href, title, Icon]) => (
                <button
                  key={href}
                  className={path === href ? "active" : ""}
                  onClick={() => go(href)}
                >
                  <Icon size={15} />
                  {title}
                </button>
              ))}
            </nav>
            <button
              className="header-avatar"
              aria-label="Your account"
              onClick={() => go("/account")}
            >
              {state?.player?.photo ? (
                <img src={"/api/photo/" + state.player.id} alt="" />
              ) : (
                <Moon size={19} />
              )}
            </button>
            <button
              className="mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={22} />
            </button>
          </>
        )}
      </header>
      {state?.player?.realm === "preview" && (
        <div className="rehearsal-banner">
          <span>REHEARSAL</span> A little world for trying things. Event scores
          are separate.
        </div>
      )}
      {error && (
        <div className="toast error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss error">
            <X size={16} />
          </button>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button onClick={() => setNotice("")} aria-label="Dismiss notice">
            <X size={16} />
          </button>
        </div>
      )}
      <main>{content}</main>
      <footer>
        <Leaf size={17} />
        <span>THE HOLLOW COURT</span>
        <p>May your gatherings be strange, and your guests find room.</p>
        <small>HALLOWEEN · MMXXVI</small>
      </footer>
      {reveal && (
        <StoryReveal
          key={reveal.chapter.at + ":" + String(reveal.preview)}
          reveal={reveal}
          onClose={() => setReveal(null)}
          onSummons={(n) => {
            setReveal(null);
            go("/summons?milestone=" + n);
          }}
        />
      )}
      {state?.previewAvailable && (
        <button className="debug-toggle" onClick={() => setDebug(!debug)}>
          <Settings2 size={16} /> Field notes <span>DEBUG</span>
        </button>
      )}
      {debug && (
        <div className="modal-backdrop" onClick={() => setDebug(false)}>
          <section
            className="debug-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Debug field notes"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">REHEARSAL TOOLS</span>
                <h2>The keeper’s field notes</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setDebug(false)}
                aria-label="Close debug menu"
              >
                <X />
              </button>
            </div>
            <p>
              Jump into any trial. These twelve-character paths are stored in
              the rehearsal database; future NFC tags will use the event
              deployment’s routes.
            </p>
            <div className="debug-shortcuts">
              <button onClick={() => go("/sealed")}>Locked entrance</button>
              <button onClick={() => void start(true, true)}>Open Court</button>
              <button
                onClick={() =>
                  void action(async () => {
                    await api("/session/logout", "POST");
                    const s = await api<State & { recovery: string }>(
                      "/session/start",
                      "POST",
                      { preview: true },
                    );
                    setState(s);
                    go("/join");
                  })
                }
              >
                Name + selfie
              </button>
              <button onClick={() => go("/recover")}>Recovery login</button>
              <button onClick={() => go("/host")}>Host guest book</button>
              <button disabled={busy} onClick={() => void previewReveal(4)}>
                First Summons reveal
              </button>
              <button disabled={busy} onClick={() => void previewReveal(10)}>
                Second Summons reveal
              </button>
              <button
                onClick={() =>
                  void action(async () => {
                    if (
                      !state?.player?.registered ||
                      state.player.realm !== "preview"
                    )
                      await api("/session/start", "POST", {
                        preview: true,
                        demo: true,
                      });
                    setState(
                      await api<State>("/debug/progress", "POST", {
                        count: 15,
                      }),
                    );
                    go("/chronicle");
                  })
                }
              >
                Full Chronicle
              </button>
            </div>
            <h3>Replay a Chronicle reveal</h3>
            <p className="small muted">
              Replay any page, even after unlocking it. These shortcuts add
              rehearsal progress; they do not remove existing Favors.
            </p>
            <div className="debug-shortcuts">
              {[0, 1, 3, 4, 6, 8, 10, 12, 15].map((at, i) => (
                <button
                  disabled={busy}
                  key={at}
                  onClick={() => void previewReveal(at)}
                >
                  Chapter {i + 1} · {at === 0 ? "Arrival" : at + " Favors"}
                </button>
              ))}
            </div>
            <div className="debug-guardians">
              {guardians.map((g, i) => {
                const code = codes.find((c) => c.id === g.id)?.code;
                return (
                  <button
                    key={g.id}
                    disabled={!code || busy}
                    onClick={() => void start(true, true, "/g/" + code)}
                  >
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{g.name}</strong>
                      <small>{familyNames[g.family]}</small>
                    </div>
                    <code>{code || "Loading…"}</code>
                    <ArrowRight size={14} />
                  </button>
                );
              })}
            </div>
            <p className="small muted">
              Puzzle pairings are rehearsal choices. Unbroken Sigil still needs
              a real-phone comfort test. Debug tools are disabled when PREVIEW
              is false.
            </p>
          </section>
        </div>
      )}
      {card && (
        <div className="modal-backdrop" onClick={() => setCard(null)}>
          <section
            className="bestiary-modal"
            role="dialog"
            aria-modal="true"
            aria-label={card.name}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="icon-button close"
              onClick={() => setCard(null)}
              aria-label="Close guardian"
            >
              <X />
            </button>
            <GuardianArt kind={card.art} />
            <span className="eyebrow">
              {card.room} · {card.virtue}
            </span>
            <h2>{card.name}</h2>
            <p>
              {state?.favors.includes(card.id)
                ? card.lore
                : "“" + card.greeting + "”"}
            </p>
            {!state?.favors.includes(card.id) && (
              <p className="small muted">
                Find this creature’s moon touchpoint at the party to earn its
                Favor.
              </p>
            )}
            <button className="btn secondary" onClick={() => setCard(null)}>
              Return to the Bestiary
            </button>
          </section>
        </div>
      )}
    </>
  );
}
function Join({
  state,
  next,
  inviteToken,
  onDone,
  onRecover,
  onStart,
}: {
  state: State;
  next: string;
  inviteToken: string;
  onDone: (s: State) => void;
  onRecover: () => void;
  onStart: () => void;
}) {
  const [step, setStep] = useState(1),
    [name, setName] = useState(""),
    [photo, setPhoto] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [skipInvite, setSkipInvite] = useState(false);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  async function select(file: File) {
    setError("");
    setBusy(true);
    try {
      if (file.size > 20 * 1024 * 1024)
        throw Error("Choose a photo smaller than 20 MB.");
      const url = URL.createObjectURL(file),
        img = new Image();
      img.src = url;
      try {
        await img.decode();
      } catch {
        URL.revokeObjectURL(url);
        throw Error(
          "This image format could not be opened. Try a JPEG, PNG, or a camera photo saved as JPEG.",
        );
      }
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 720;
      const ctx = canvas.getContext("2d")!;
      const edge = Math.min(img.width, img.height);
      ctx.drawImage(
        img,
        (img.width - edge) / 2,
        (img.height - edge) / 2,
        edge,
        edge,
        0,
        0,
        720,
        720,
      );
      URL.revokeObjectURL(url);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) =>
            b ? resolve(b) : reject(Error("Could not prepare this portrait.")),
          "image/jpeg",
          0.86,
        ),
      );
      const portrait = new File([blob], "costume-portrait.jpg", {
        type: "image/jpeg",
      });
      setPhoto(portrait);
      setPreview(URL.createObjectURL(portrait));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const data = new FormData();
      data.set("name", name);
      if (photo) data.set("photo", photo);
      if (inviteToken && !skipInvite) data.set("invite", inviteToken);
      const s = await api<State>("/register", "POST", data);
      onDone(s);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!state.player)
    return (
      <section className="narrow page-top">
        <h1>The Court awaits.</h1>
        <button className="btn" onClick={onStart}>
          Begin your arrival
        </button>
      </section>
    );
  if (state.player.registered)
    return (
      <section className="narrow page-top">
        <h1>You are remembered.</h1>
        <button className="btn" onClick={() => onDone(state)}>
          Return to the gathering
        </button>
      </section>
    );
  return (
    <section className="onboarding page-top">
      <aside>
        <GuardianArt kind="door" />
        <span className="eyebrow">THE COURT REQUIRES A WITNESS</span>
        <h1>
          Leave a name.
          <br />
          <em>Become a story.</em>
        </h1>
        <p>
          Every gathering begins with an arrival.
          <br />
          The wood would like to remember yours.
        </p>
        <button className="text-button" onClick={onRecover}>
          Already entered? Recover your place <ArrowRight size={14} />
        </button>
      </aside>
      <div className="join-panel">
        <div className="step-indicator">
          {["Your name", "Your guise", "Your arrival"].map((s, i) => (
            <span key={s} className={step === i + 1 ? "active" : ""}>
              <b>{i + 1}</b>
              {s}
            </span>
          ))}
        </div>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        {step === 1 ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep(2);
            }}
          >
            <span className="eyebrow">FIRST, A NAME</span>
            <h2>
              What shall the
              <br />
              creatures call you?
            </h2>
            <p>
              Your chosen name appears beside your portrait and your place in
              the gathering.
            </p>
            <label>
              NAME FOR THE EVENING
              <input
                name="name"
                autoComplete="nickname"
                maxLength={40}
                required
                minLength={1}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name, or your woodland alias"
              />
            </label>
            <button className="btn" disabled={!name.trim()}>
              Continue <ArrowRight size={16} />
            </button>
          </form>
        ) : step === 2 ? (
          <>
            <span className="eyebrow">NEXT, YOUR GUISE</span>
            <h2>
              How will the
              <br />
              wood remember you?
            </h2>
            <p>
              A costume portrait for the Looking Glass. Find a little light;
              strange company is welcome.
            </p>
            <div className="photo-frame">
              {preview ? (
                <img src={preview} alt="Your portrait preview" />
              ) : (
                <>
                  <Camera size={34} />
                  <span>Your apparition belongs here</span>
                </>
              )}
            </div>
            <div className="photo-actions">
              <label className="btn secondary">
                <Camera size={16} /> {photo ? "Retake" : "Take a selfie"}
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={(e) => {
                    if (e.target.files?.[0]) void select(e.target.files[0]);
                  }}
                />
              </label>
              <label className="text-button">
                Choose a photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  onChange={(e) => {
                    if (e.target.files?.[0]) void select(e.target.files[0]);
                  }}
                />
              </label>
            </div>
            <p className="small muted">
              Your portrait is cropped to a square; the preview shows exactly
              what others will see. Uploads are resized and stripped of photo
              metadata.
            </p>
            <p className="small muted">
              Your name and portrait appear to registered Court participants for
              costume judgments and standings.
            </p>
            <div className="form-actions">
              <button className="text-button" onClick={() => setStep(1)}>
                <ArrowLeft size={14} /> Back
              </button>
              <button
                className="btn"
                disabled={!photo || busy}
                onClick={() => setStep(3)}
              >
                Keep this guise <ArrowRight size={16} />
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="eyebrow">YOUR PLACE IN THE GATHERING</span>
            <h2>
              The wood will
              <br />
              remember you.
            </h2>
            {preview && (
              <img
                className="arrival-portrait"
                src={preview}
                alt="Your chosen costume portrait"
              />
            )}
            <h3>{name}</h3>
            <p>
              This browser keeps your place. If you lose it, the host can help
              you return. There is nothing to save tonight.
            </p>
            {inviteToken && (
              <p className="small muted">
                Your Summons will be received when registration finishes.
              </p>
            )}
            {error.includes("invitation") && (
              <label className="consent">
                <input
                  type="checkbox"
                  checked={skipInvite}
                  onChange={(e) => setSkipInvite(e.target.checked)}
                />
                <span>Join without crediting this invitation.</span>
              </label>
            )}
            <div className="form-actions">
              <button className="text-button" onClick={() => setStep(2)}>
                <ArrowLeft size={14} /> Back
              </button>
              <button
                className="btn"
                disabled={busy}
                onClick={() => void submit()}
              >
                {busy ? "The Court is listening…" : "Enter the gathering"}
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
