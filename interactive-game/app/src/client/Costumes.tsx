import React, { useEffect, useState } from "react";
import { Leaf, Check, RefreshCw } from "lucide-react";
import { api } from "./api";
import type { CostumeAward, CostumeGallery } from "../shared/costumes";
export function CostumeCelebration({ award }: { award: CostumeAward }) {
  return (
    <section className="costume-celebration panel">
      <span className="eyebrow">THE LOOKING GLASS · COSTUME AWARD</span>
      <h2>
        A guise the Court <em>will remember.</em>
      </h2>
      <img src={"/api/photo/" + award.id} alt={award.name + " costume"} />
      <h3>{award.name}</h3>
      <p>
        The gathering offered its leaves. The host has named tonight’s costume
        award.
      </p>
      <p>
        <Leaf size={18} /> +{award.bonus} points added to their game standing.
      </p>
      <p className="small muted">
        A little applause, and back to the strange company. No speech required.
      </p>
    </section>
  );
}
export function CostumeGalleryPage({ onSaved }: { onSaved: () => void }) {
  const [gallery, setGallery] = useState<CostumeGallery | null>(null),
    [choices, setChoices] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function load() {
    const next = await api<CostumeGallery>("/costumes");
    setGallery(next);
    setChoices(next.choices);
    setError("");
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible")
        void api<CostumeGallery>("/costumes")
          .then((next) =>
            setGallery((old) =>
              old
                ? {
                    ...old,
                    people: next.people,
                    open: next.open,
                    award: next.award,
                  }
                : old,
            ),
          )
          .catch(() => {});
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const dirty =
    !!gallery &&
    JSON.stringify([...choices].sort()) !==
      JSON.stringify([...gallery.choices].sort());
  function toggle(id: string) {
    setNotice("");
    if (choices.includes(id)) setChoices(choices.filter((x) => x !== id));
    else if (choices.length < 3) setChoices([...choices, id]);
    else
      setNotice(
        "Your three leaves are placed. Tap a selected costume to move a leaf.",
      );
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ choices: string[]; revision: number }>(
        "/costumes",
        "POST",
        { choices, revision: gallery!.revision },
      );
      setGallery({ ...gallery!, ...result });
      setNotice(
        "Your leaves are saved. You can change them until voting closes.",
      );
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="costume-gallery page-top">
      <span className="eyebrow">THE LOOKING GLASS</span>
      <h1>
        Which costumes will you <em>remember tomorrow?</em>
      </h1>
      <p>
        Give a leaf to up to three favorites. Clever, strange, homemade,
        extravagant—all welcome.
      </p>
      <p className="small muted">
        Each leaf counts equally and helps guide the host’s costume award: +3
        points at the end. Your choices stay private. Change them until{" "}
        {gallery
          ? new Date(gallery.closesAt).toLocaleTimeString("en-US", {
              timeZone: "America/New_York",
              hour: "numeric",
              minute: "2-digit",
              timeZoneName: "short",
            })
          : "closing"}
        .
      </p>
      {error && (
        <div role="alert" className="inline-error">
          {error}{" "}
          <button
            className="text-button"
            onClick={() => void load().catch((e) => setError(e.message))}
          >
            <RefreshCw size={15} /> Reload saved leaves
          </button>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {!gallery ? (
        <p>Gathering the apparitions…</p>
      ) : (
        <>
          {gallery.award && <CostumeCelebration award={gallery.award} />}
          {!gallery.open && (
            <p className="panel">
              The leaves have been gathered.{" "}
              {gallery.award
                ? "Thank you for celebrating the gathering."
                : "Your host will share the costume award when it is ready."}
            </p>
          )}
          {!gallery.people.length && (
            <p className="panel">
              The glass is waiting for more costumes. Come back as the gathering
              grows.
            </p>
          )}
          <div className="costume-grid">
            {gallery.people.map((person) => (
              <button
                key={person.id}
                className={
                  "costume-card " +
                  (choices.includes(person.id) ? "selected" : "")
                }
                aria-pressed={choices.includes(person.id)}
                aria-label={
                  (choices.includes(person.id)
                    ? "Remove leaf from "
                    : "Give a leaf to ") + person.name
                }
                disabled={busy || !gallery.open}
                onClick={() => toggle(person.id)}
              >
                <img
                  loading="lazy"
                  src={"/api/photo/" + person.id}
                  alt={person.name + " costume"}
                />
                <span className="costume-card-caption">
                  <span>{person.name}</span>
                  <Leaf size={21} />
                </span>
                {choices.includes(person.id) && (
                  <span className="costume-chosen">
                    <Check size={13} /> A leaf from you
                  </span>
                )}
              </button>
            ))}
          </div>
          {gallery.open && (
            <div className="leaf-save-bar">
              <span>
                <Leaf size={18} /> {choices.length} of 3 leaves{" "}
                <small>{dirty ? "Unsaved changes" : "Saved choices"}</small>
              </span>
              <button
                className="btn"
                disabled={busy || !dirty}
                onClick={() => void save()}
              >
                {busy ? "Saving…" : "Save my leaves"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
