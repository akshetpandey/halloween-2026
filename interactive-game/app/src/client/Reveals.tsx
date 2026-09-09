import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Leaf, X } from "lucide-react";
import type { Chapter } from "../shared/types";
export type Reveal = { chapter: Chapter; preview?: boolean };
export function StoryReveal({
  reveal,
  onClose,
  onSummons,
  onLookingGlass,
}: {
  reveal: Reveal;
  onClose: () => void;
  onLookingGlass: () => void;
  onSummons: (n: number) => void;
}) {
  const [stage, setStage] = useState<"chapter" | "summons">("chapter");
  const dialog = useRef<HTMLDialogElement>(null);
  const c = reveal.chapter,
    summons = c.at === 4 || c.at === 10;
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => {
      dialog.current?.close();
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="story-reveal"
      onCancel={onClose}
      aria-labelledby="reveal-title"
    >
      <button
        className="icon-button reveal-close"
        aria-label="Keep this for later"
        onClick={onClose}
      >
        <X />
      </button>
      {reveal.preview && (
        <span className="rehearsal-label">
          REHEARSAL · REPLAYING THE GUEST REVEAL
        </span>
      )}
      <div className="reveal-mark">
        {stage === "chapter" ? <BookOpen size={32} /> : <Leaf size={32} />}
      </div>
      <span className="eyebrow">
        {stage === "chapter"
          ? "A PAGE STIRS IN THE CHRONICLE"
          : "A SUMMONS IS YOURS"}
      </span>
      <h2 id="reveal-title">
        {stage === "chapter"
          ? c.title.split(" — ")[1]
          : c.at === 4
            ? "Make room beneath the boughs."
            : "Keep the circle open."}
      </h2>
      <p className="reveal-story">
        {stage === "chapter"
          ? c.text
          : c.at === 4
            ? "The Court has heard your name. Carry this invitation to someone here whose name it has yet to learn."
            : "You know your way among the creatures now. Find someone here who does not. Let this become their evening too."}
      </p>
      {stage === "chapter" ? (
        <>
          <button
            className="btn"
            onClick={() => (summons ? setStage("summons") : onClose())}
          >
            {summons
              ? "Something waits between the pages"
              : "Keep the story with you"}
            <ArrowRight size={16} />
          </button>
          {c.at === 6 && (
            <button className="btn secondary" onClick={onLookingGlass}>
              Visit the Looking Glass <Leaf size={16} />
            </button>
          )}
          <p className="small muted">This page is kept in your Chronicle.</p>
        </>
      ) : (
        <>
          <button className="btn" onClick={() => onSummons(c.at)}>
            Unseal your invitation
            <ArrowRight size={16} />
          </button>
          <button className="text-button" onClick={onClose}>
            Not now · keep it for later
          </button>
        </>
      )}
    </dialog>
  );
}
