import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pause, Play, RotateCcw, X } from "lucide-react";
import { GuardianArt } from "./Art";
import { preloadFoxSpirit } from "./fox-spirit-loader";
import { spiritOrigin, type SpiritOrigin } from "./spirit-motion";
import type { SpiritStage, SpiritStats } from "./fox-spirit-runtime";
import type { SpiritAsset } from "./spirit-asset";
import "./fox-spirit.css";
const CENTRE = spiritOrigin();
export default function FoxSpiritReveal({
  photo,
  origin = CENTRE,
  onClose,
  onScanAgain,
  asset,
  onFrontChange,
}: {
  photo?: { url: string; width: number; height: number };
  origin?: SpiritOrigin | null;
  onClose: () => void;
  onScanAgain?: () => void;
  asset?: SpiritAsset;
  onFrontChange?: (angle: number) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    dialog = useRef<HTMLElement>(null),
    stage = useRef<SpiritStage | null>(null);
  const [ready, setReady] = useState(false),
    [error, setError] = useState(false),
    [paused, setPaused] = useState(false),
    [retry, setRetry] = useState(0),
    [stats, setStats] = useState<SpiritStats | null>(null);
  const [greeting, setGreeting] = useState(false);
  const [front, setFront] = useState(0);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    let alive = true;
    setReady(false);
    setError(false);
    setPaused(false);
    setFront(asset?.front ?? 0);
    if (!origin) return;
    void preloadFoxSpirit()
      .then((runtime) => {
        if (!alive || !canvas.current) return;
        stage.current = runtime.mountFoxSpirit(
          canvas.current,
          origin,
          photo,
          {
            ready: () => {
              if (alive) setReady(true);
            },
            error: () => {
              if (alive) {
                setError(true);
                setReady(false);
              }
            },
            stats: (value) => {
              if (alive) setStats(value);
            },
          },
          asset,
        );
        return stage.current.ready;
      })
      .catch(() => {
        if (alive) {
          setError(true);
          setReady(false);
        }
      });
    return () => {
      alive = false;
      stage.current?.dispose();
      stage.current = null;
    };
  }, [
    origin?.x,
    origin?.y,
    origin?.size,
    photo?.url,
    photo?.width,
    photo?.height,
    retry,
    asset?.url,
  ]);
  function greet() {
    if (!ready || paused) return;
    stage.current?.greet();
    setGreeting(true);
  }
  return createPortal(
    <section
      ref={dialog}
      className={
        "fox-spirit-reveal " +
        (ready ? "is-ready " : "") +
        (error ? "has-error" : "")
      }
      role="dialog"
      aria-modal="true"
      aria-label="The Fox of Small Print awakens"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "Tab") {
          const nodes = Array.from(
            e.currentTarget.querySelectorAll<HTMLElement>(
              "button:not(:disabled),details[open] a[href],summary,canvas[tabindex]",
            ),
          );
          const first = nodes[0],
            last = nodes.at(-1);
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      {photo && (
        <img
          className="fox-spirit-photo"
          src={photo.url}
          alt="The guardian you found"
        />
      )}
      <div className="fox-spirit-atmosphere" aria-hidden="true" />
      <div className="fox-spirit-vignette" aria-hidden="true" />
      <header className="fox-spirit-header">
        <div>
          <span className="eyebrow">THE LOOKING LENS</span>
          <span className="fox-spirit-location">A little magic, found.</span>
        </div>
        <div className="fox-spirit-tools">
          <button
            aria-label="Replay awakening"
            disabled={!ready}
            onClick={() => {
              setPaused(false);
              setGreeting(false);
              stage.current?.pause(false);
              stage.current?.replay();
            }}
          >
            <RotateCcw size={18} />
          </button>
          <button
            aria-label={paused ? "Resume fox animation" : "Pause fox animation"}
            disabled={!ready}
            onClick={() => {
              stage.current?.pause(!paused);
              setPaused(!paused);
            }}
          >
            {paused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button aria-label="Close awakening" onClick={onClose}>
            <X size={22} />
          </button>
        </div>
      </header>
      {asset && (
        <div className="fox-spirit-capture-tools">
          <span>Local capture · {asset.name}</span>
          <button
            className="text-button"
            disabled={!ready}
            onClick={() => {
              const next = front + Math.PI / 2;
              setFront(next);
              stage.current?.turn(next);
              onFrontChange?.(next);
            }}
          >
            Turn capture to face you ↻
          </button>
          <small>
            Shape preview. An unrigged capture cannot move its head or tail yet.
          </small>
        </div>
      )}
      <canvas
        key={retry}
        ref={canvas}
        className="fox-spirit-canvas"
        role="button"
        tabIndex={0}
        aria-label="Greet the fox"
        onClick={greet}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            greet();
          }
        }}
      />
      {!ready && !error && (
        <p className="fox-spirit-loading" role="status">
          {origin
            ? "Something in the wood is waking…"
            : "A familiar spirit is drawing near…"}
        </p>
      )}
      {error && (
        <div className="fox-spirit-fallback">
          <GuardianArt kind="fox" />
          <p>The fox is here. Its magic is taking a moment.</p>
          <button
            className="text-button"
            onClick={() => setRetry((n) => n + 1)}
          >
            Try the animation again
          </button>
        </div>
      )}
      <footer className="fox-spirit-footer">
        <span className="eyebrow">
          {ready ? "A CREATURE STIRS" : "THE FOX OF SMALL PRINT"}
        </span>
        <h2>{greeting ? "Well, hello there." : "You found me."}</h2>
        <p className="fox-spirit-voice">
          “The terms are before you.
          <br />I do recommend reading them.”
        </p>
        <p className="fox-spirit-touch">
          {ready
            ? paused
              ? "Resting for a moment."
              : greeting
                ? "A promising witness."
                : "Tap the fox to say hello."
            : "The Court has been expecting you."}
        </p>
        <button className="btn" onClick={onScanAgain ?? onClose}>
          {onScanAgain ? "Find another guardian" : "Back to reference photos"}
        </button>
        <details className="fox-spirit-details">
          <summary>Model credits & device details</summary>
          {asset ? (
            <p>
              Your local GLB capture. Existing animation clips play when
              present; no animal rig is generated. It is not uploaded or saved
              to the host account.
            </p>
          ) : (
            <>
              <p>
                Fox model: PixelMannen (CC0). Rigging & animation: tomkranis.
                glTF conversion: Asobo Studio & scurest (
                <a
                  href="https://creativecommons.org/licenses/by/4.0/"
                  target="_blank"
                  rel="noreferrer"
                >
                  CC BY 4.0
                </a>
                ).{" "}
                <a
                  href="https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox"
                  target="_blank"
                  rel="noreferrer"
                >
                  Source
                </a>
                . Custom woodland lighting, animation timing and effects.
              </p>
              <p>
                Temporary animation stand-in. The final model must match the
                LEGO 31394 guardian’s brick shape and colors.
              </p>
            </>
          )}
          <p>
            {stats
              ? `${stats.fps.toFixed(0)} FPS · ${stats.drawCalls} draw calls · ${stats.triangles.toLocaleString()} triangles · renderer ready ${(stats.readyMs / 1000).toFixed(2)}s`
              : "Preparing the 163 KB animated fox."}{" "}
            Starting point:{" "}
            {origin?.source === "reference"
              ? "matched reference view"
              : "lens centre"}
            . The final pose always faces you at the same screen size.
          </p>
        </details>
      </footer>
    </section>,
    document.body,
  );
}
