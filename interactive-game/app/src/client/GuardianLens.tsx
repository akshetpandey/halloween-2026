import React, { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Leaf, RefreshCw, X } from "lucide-react";
import { guardians } from "../shared/catalog";
import {
  matchGuardian,
  VISION_MODEL,
  type VisionManifest,
  type VisionMatch,
} from "../shared/vision";
import { api } from "./api";
import { GuardianArt } from "./Art";
import {
  VisionEngine,
  preparePhoto,
  cutoutPhoto,
  type PreparedPhoto,
} from "./vision-engine";
import type { MaskResult } from "./vision.worker";
import "./vision.css";

export function GuardianLens({
  manifest: provided,
  host = false,
  onContinue,
  onClose,
}: {
  manifest?: VisionManifest;
  host?: boolean;
  onContinue?: (id: string) => Promise<void>;
  onClose?: () => void;
}) {
  const [manifest, setManifest] = useState(provided ?? null);
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null),
    [cutout, setCutout] = useState("");
  const [phase, setPhase] = useState<
    "idle" | "camera" | "reading" | "unknown" | "outlining" | "awake"
  >("idle");
  const [progress, setProgress] = useState(""),
    [error, setError] = useState("");
  const [match, setMatch] = useState<VisionMatch | null>(null),
    [outline, setOutline] = useState<MaskResult | null>(null);
  const [details, setDetails] = useState({
    embedBackend: "",
    segmentBackend: "",
    embedMs: 0,
    segmentMs: 0,
  });
  const [backend, setBackend] = useState<"auto" | "wasm">("auto"),
    [continuing, setContinuing] = useState(false);
  const engine = useRef<VisionEngine | null>(null),
    stream = useRef<MediaStream | null>(null),
    video = useRef<HTMLVideoElement>(null);
  const action = useRef(0),
    currentPhoto = useRef<PreparedPhoto | null>(null),
    cutoutRef = useRef("");
  const busy = phase === "reading" || phase === "outlining";
  const guardian = guardians.find((g) => g.id === match?.guardianId);
  const ready = !!manifest?.references.some((r) => r.guardianId);
  async function load() {
    setManifest(provided ?? (await api<VisionManifest>("/vision/references")));
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [provided]);
  function stopCamera() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }
  function stopEngine() {
    engine.current?.close();
    engine.current = null;
  }
  function reset() {
    action.current++;
    stopCamera();
    stopEngine();
    setPhase("idle");
    setError("");
    setMatch(null);
    setOutline(null);
    setProgress("");
    if (currentPhoto.current) URL.revokeObjectURL(currentPhoto.current.url);
    currentPhoto.current = null;
    setPhoto(null);
    if (cutoutRef.current) URL.revokeObjectURL(cutoutRef.current);
    cutoutRef.current = "";
    setCutout("");
  }
  useEffect(
    () => () => {
      action.current++;
      stopCamera();
      stopEngine();
      if (currentPhoto.current) URL.revokeObjectURL(currentPhoto.current.url);
      if (cutoutRef.current) URL.revokeObjectURL(cutoutRef.current);
    },
    [],
  );
  useEffect(() => {
    if (phase === "camera" && video.current && stream.current) {
      video.current.srcObject = stream.current;
      void video.current
        .play()
        .catch(() =>
          setError("Tap the camera button again or choose a photo below."),
        );
    }
  }, [phase]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden && stream.current) {
        stopCamera();
        setPhase("idle");
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  function getEngine() {
    if (!engine.current || engine.current.closed)
      engine.current = new VisionEngine(backend);
    return engine.current;
  }
  async function openCamera() {
    reset();
    const attempt = action.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw Error(
          "The live camera is unavailable here. Use Take a photo below, or open this page in Safari or Chrome.",
        );
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });
      if (attempt !== action.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      setPhase("camera");
    } catch (e) {
      if (attempt === action.current)
        setError(
          e instanceof DOMException && e.name === "NotAllowedError"
            ? "Camera access was declined. You can allow it in browser settings, or choose a photo below."
            : (e as Error).message,
        );
    }
  }
  async function outlinePhoto(
    p: PreparedPhoto,
    attempt: number,
    point = { x: 0.5, y: 0.5 },
  ) {
    setPhase("outlining");
    setError("");
    setProgress("Something in the photograph is waking…");
    try {
      const result = await getEngine().request(
        "segment",
        p.blob,
        p.key,
        (text) => {
          if (attempt === action.current) setProgress(text);
        },
        point,
      );
      if (attempt !== action.current) return;
      const seg = result.segmentation!;
      setOutline(seg);
      setDetails((old) => ({
        ...old,
        segmentMs: seg.ms,
        segmentBackend: result.backend || "",
      }));
      if (seg.usable) {
        const url = await cutoutPhoto(p, seg);
        if (attempt !== action.current) {
          URL.revokeObjectURL(url);
          return;
        }
        if (cutoutRef.current) URL.revokeObjectURL(cutoutRef.current);
        cutoutRef.current = url;
        setCutout(url);
      } else {
        if (cutoutRef.current) URL.revokeObjectURL(cutoutRef.current);
        cutoutRef.current = "";
        setCutout("");
        setError(
          "The outline caught the wrong shape. Tap the creature in the photograph to trace it again.",
        );
      }
    } catch (e) {
      if (attempt === action.current)
        setError(
          "The creature was recognized, but its outline could not be drawn on this attempt. You can still meet it. " +
            (host ? (e as Error).message : ""),
        );
    } finally {
      if (attempt === action.current) {
        setPhase("awake");
        setProgress("");
      }
    }
  }
  async function recognize(file: Blob) {
    if (!manifest || !ready) return;
    reset();
    const attempt = action.current;
    setPhase("reading");
    try {
      const p = await preparePhoto(file);
      if (attempt !== action.current) {
        URL.revokeObjectURL(p.url);
        return;
      }
      currentPhoto.current = p;
      setPhoto(p);
      const started = performance.now();
      const result = await getEngine().request(
        "embed",
        p.blob,
        p.key,
        (text) => {
          if (attempt === action.current) setProgress(text);
        },
      );
      if (attempt !== action.current) return;
      const found = matchGuardian(result.vector!, manifest);
      setMatch(found);
      setDetails({
        embedBackend: result.backend || "",
        segmentBackend: "",
        embedMs: performance.now() - started,
        segmentMs: 0,
      });
      if (!found.guardianId) {
        setPhase("unknown");
        setProgress("");
        return;
      }
      await outlinePhoto(p, attempt);
    } catch (e) {
      if (attempt === action.current) {
        setError((e as Error).message);
        setPhase("idle");
      }
    }
  }
  async function capture() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    // Match the visible object-fit: cover framing rather than capturing unseen sides.
    const scale = Math.max(
      v.clientWidth / v.videoWidth,
      v.clientHeight / v.videoHeight,
    );
    const width = v.clientWidth / scale,
      height = v.clientHeight / scale;
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);
    canvas
      .getContext("2d")!
      .drawImage(
        v,
        (v.videoWidth - width) / 2,
        (v.videoHeight - height) / 2,
        width,
        height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    const attempt = action.current;
    stopCamera();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (attempt !== action.current) return;
    if (blob) await recognize(blob);
    else {
      setError("The photo could not be captured. Try again.");
      setPhase("idle");
    }
  }
  function skipOutline() {
    action.current++;
    stopEngine();
    setPhase("awake");
    setProgress("");
  }
  function refine(event: React.MouseEvent<HTMLDivElement>) {
    if (!photo || !guardian || busy || phase !== "awake") return;
    const box = event.currentTarget.getBoundingClientRect();
    const point = {
      x: Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)),
      y: Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)),
    };
    const attempt = ++action.current;
    void outlinePhoto(photo, attempt, point);
  }
  return (
    <section className={"guardian-lens " + (host ? "host-lens" : "page-top")}>
      <div className="lens-title">
        <div>
          <span className="eyebrow">THE LOOKING LENS · REHEARSAL</span>
          <h1>
            Look through <em>the veil.</em>
          </h1>
        </div>
        {onClose && (
          <button
            className="icon-button"
            aria-label="Close Looking Lens"
            onClick={onClose}
          >
            <X />
          </button>
        )}
      </div>
      <p>
        Bring one creature into view. Let the wood recognize what is waiting.
      </p>
      {host && (
        <label className="lens-backend">
          PROCESSING PATH
          <select
            value={backend}
            disabled={busy || phase === "camera"}
            onChange={(e) => {
              reset();
              setBackend(e.target.value as "auto" | "wasm");
            }}
          >
            <option value="auto">Prefer WebGPU · fall back to CPU</option>
            <option value="wasm">CPU / WASM · compare timing</option>
          </select>
        </label>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {!manifest ? (
        <p>Opening the lens…</p>
      ) : !ready ? (
        <div className="panel">
          <h2>No creatures have taken form yet.</h2>
          <p>Add reference photos in the host dashboard to begin testing.</p>
          <button
            className="text-button"
            onClick={() => void load().catch((e) => setError(e.message))}
          >
            <RefreshCw size={16} /> Check again
          </button>
        </div>
      ) : (
        <>
          {phase === "camera" ? (
            <div className="lens-camera">
              <video ref={video} playsInline muted autoPlay />
              <div className="lens-reticle" />
              <p className="lens-camera-hint">
                One creature, comfortably inside the frame
              </p>
              <button
                className="lens-shutter"
                aria-label="Photograph the guardian"
                onClick={() => void capture()}
              >
                <Camera />
              </button>
            </div>
          ) : photo ? (
            <div
              className={"lens-photo " + (phase === "awake" ? "is-awake" : "")}
              style={
                {
                  aspectRatio: `${photo.width}/${photo.height}`,
                  "--photo-ratio": photo.width / photo.height,
                } as React.CSSProperties
              }
              onClick={refine}
            >
              <img
                className="lens-capture-base"
                src={photo.url}
                alt="Your guardian photograph"
              />
              {cutout && <img className="lens-cutout" src={cutout} alt="" />}
              {(busy || phase === "awake") && (
                <div className="lens-pollen" aria-hidden="true">
                  {Array.from({ length: 12 }, (_, i) => (
                    <i
                      key={i}
                      style={{
                        left: 8 + i * 7.5 + "%",
                        animationDelay: i * 0.27 + "s",
                      }}
                    />
                  ))}
                </div>
              )}
              {busy && <div className="lens-scan-line" />}
            </div>
          ) : (
            <div className="lens-empty">
              <Leaf size={42} />
              <p>A familiar shape is enough to begin.</p>
            </div>
          )}
          {busy && (
            <div className="lens-progress" role="status">
              <span className="status-dot" />
              {progress || "Listening to the shape…"}
              <button
                className="text-button"
                onClick={phase === "outlining" ? skipOutline : reset}
              >
                {phase === "outlining"
                  ? "Meet it without the outline"
                  : "Cancel"}
              </button>
            </div>
          )}
          {phase === "unknown" && (
            <div className="panel lens-unknown">
              <h2>The wood cannot quite see.</h2>
              <p>
                Move closer, keep one guardian in the frame, and try another
                angle with a little more light.
              </p>
            </div>
          )}
          {phase === "awake" && guardian && (
            <div className="lens-awakening" role="status">
              <div className={"lens-spirit lens-spirit-" + guardian.art}>
                <GuardianArt kind={guardian.art} />
              </div>
              <span className="eyebrow">A CREATURE STIRS</span>
              <h2>{guardian.name}</h2>
              <p className="lens-voice">“{guardian.greeting}”</p>
              <p className="small muted">
                {cutout
                  ? "Tap the creature in your photograph to refine its outline."
                  : "Its voice is waiting, even if the outline is quiet."}
              </p>
              <button
                className="text-button lens-retrace"
                disabled={busy}
                onClick={() =>
                  photo && void outlinePhoto(photo, ++action.current)
                }
              >
                Trace from the centre again
              </button>
              <button
                className="btn"
                disabled={continuing}
                onClick={() => {
                  if (!onContinue) {
                    onClose?.();
                    return;
                  }
                  setContinuing(true);
                  void onContinue(guardian.id)
                    .catch((e) => setError(e.message))
                    .finally(() => setContinuing(false));
                }}
              >
                {continuing
                  ? "Opening…"
                  : host
                    ? "Back to reference photos"
                    : "Hear its trial"}
              </button>
            </div>
          )}
          {!busy && phase !== "camera" && (
            <div className="lens-actions">
              <button
                className="btn secondary"
                onClick={() => void openCamera()}
              >
                <Camera size={18} />
                {photo ? "Try another photograph" : "Open the camera"}
              </button>
              <label className="btn secondary file-button">
                <ImagePlus size={18} />
                Choose a photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void recognize(file);
                  }}
                />
              </label>
              <label className="text-button file-button">
                Take a photo with the phone camera
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void recognize(file);
                  }}
                />
              </label>
            </div>
          )}
          {phase === "camera" && (
            <button className="text-button" onClick={reset}>
              Close camera
            </button>
          )}
          {host && match && (
            <details className="lens-diagnostics" open>
              <summary>Recognition diagnostics</summary>
              <p>
                Recognition: {details.embedBackend || "Local processing"} ·{" "}
                {(details.embedMs / 1000).toFixed(2)}s. Outline:{" "}
                {details.segmentBackend || "pending"} ·{" "}
                {(details.segmentMs / 1000).toFixed(2)}s. Includes
                preparation/downloads on first use.
              </p>
              <p>
                Decision: <strong>{match.reason}</strong> · similarity{" "}
                {match.score.toFixed(3)} · gap {match.gap.toFixed(3)}.
                Similarity is not a probability.
              </p>
              {match.candidates.slice(0, 3).map((c) => (
                <div key={c.guardianId}>
                  {guardians.find((g) => g.id === c.guardianId)?.name}:{" "}
                  {c.score.toFixed(3)}
                </div>
              ))}
              {outline && (
                <p>
                  Mask area {(outline.area * 100).toFixed(1)}% · mask score{" "}
                  {outline.quality.toFixed(3)}
                </p>
              )}
              {new Set(
                manifest.references
                  .filter((r) => r.guardianId)
                  .map((r) => r.guardianId),
              ).size === 1 && (
                <p>
                  Only one guardian is enrolled. Add background negatives and
                  another guardian before judging rejection accuracy.
                </p>
              )}
            </details>
          )}
          <p className="small muted lens-privacy">
            Your test photograph stays on this phone. Finding a creature opens
            its trial; its Favor comes from solving it.
          </p>
        </>
      )}
    </section>
  );
}
