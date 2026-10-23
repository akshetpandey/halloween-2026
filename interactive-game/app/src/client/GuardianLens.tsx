import React, { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Leaf, RefreshCw, X } from "lucide-react";
import { guardians } from "../shared/catalog";
import {
  matchGuardian,
  type VisionManifest,
  type VisionMatch,
} from "../shared/vision";
import {
  StableGuardian,
  SCAN_INTERVAL_MS,
  STABLE_FRAMES,
} from "../shared/vision-live";
import { api } from "./api";
import { GuardianArt } from "./Art";
import { recognitionSession } from "./recognition-session";
import {
  VisionEngine,
  preparePhoto,
  cutoutPhoto,
  type PreparedPhoto,
} from "./vision-engine";
import type { MaskResult, VisionReply } from "./vision.worker";
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
    "idle" | "camera" | "reading" | "unknown" | "awake"
  >("idle");
  const [progress, setProgress] = useState(""),
    [error, setError] = useState("");
  const [match, setMatch] = useState<VisionMatch | null>(null),
    [outline, setOutline] = useState<MaskResult | null>(null);
  const [outlining, setOutlining] = useState(false),
    [modelReady, setModelReady] = useState(recognitionSession.ready),
    [prepareProgress, setPrepareProgress] = useState(
      "Preparing the fast lens…",
    );
  const [details, setDetails] = useState({
    embedBackend: "",
    segmentBackend: "",
    embedMs: 0,
    segmentMs: 0,
    prepareMs: 0,
    liveMs: 0,
    frames: 0,
  });
  const [live, setLive] = useState({ count: 0, frames: 0, ms: 0 });
  const [backend, setBackend] = useState<"auto" | "wasm">("auto"),
    [continuing, setContinuing] = useState(false);
  const outlineEngine = useRef<VisionEngine | null>(null);
  const stream = useRef<MediaStream | null>(null),
    video = useRef<HTMLVideoElement>(null),
    clip = useRef("");
  const action = useRef(0),
    mounted = useRef(true),
    currentPhoto = useRef<PreparedPhoto | null>(null),
    cutoutRef = useRef("");
  const busy = phase === "reading";
  const guardian = guardians.find((g) => g.id === match?.guardianId);
  const ready = !!manifest?.references.some((r) => r.guardianId);
  async function load() {
    setManifest(provided ?? (await api<VisionManifest>("/vision/references")));
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [provided]);
  function getRecognizer() {
    return recognitionSession.getEngine();
  }
  function warmRecognizer() {
    setModelReady(recognitionSession.ready);
    return recognitionSession
      .prepare((text) => {
        if (mounted.current) setPrepareProgress(text);
      })
      .then((result) => {
        if (mounted.current) {
          setModelReady(true);
          setPrepareProgress("Lens ready · live frames stay on your phone");
          setDetails((old) => ({ ...old, prepareMs: result.ms ?? 0 }));
        }
        return result;
      });
  }
  useEffect(() => {
    if (ready)
      void warmRecognizer().catch((e) => {
        if (mounted.current) setError(e.message);
      });
  }, [ready]);
  function stopCamera() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) {
      video.current.pause();
      video.current.srcObject = null;
    }
    if (clip.current) URL.revokeObjectURL(clip.current);
    clip.current = "";
  }
  function stopOutline() {
    outlineEngine.current?.close();
    outlineEngine.current = null;
    setOutlining(false);
  }
  function reset() {
    action.current++;
    stopCamera();
    stopOutline();
    setPhase("idle");
    setError("");
    setMatch(null);
    setOutline(null);
    setProgress("");
    setLive({ count: 0, frames: 0, ms: 0 });
    setDetails((old) => ({
      ...old,
      liveMs: 0,
      frames: 0,
      embedMs: 0,
      embedBackend: "",
      segmentMs: 0,
      segmentBackend: "",
    }));
    if (currentPhoto.current) URL.revokeObjectURL(currentPhoto.current.url);
    currentPhoto.current = null;
    setPhoto(null);
    if (cutoutRef.current) URL.revokeObjectURL(cutoutRef.current);
    cutoutRef.current = "";
    setCutout("");
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      action.current++;
      stopCamera();
      outlineEngine.current?.close();
      if (currentPhoto.current) URL.revokeObjectURL(currentPhoto.current.url);
      if (cutoutRef.current) URL.revokeObjectURL(cutoutRef.current);
    };
  }, []);
  useEffect(() => {
    const hide = () => {
      if (document.hidden && (stream.current || clip.current)) reset();
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  function frameCanvas(v: HTMLVideoElement, maxEdge = 1280) {
    const viewWidth = v.clientWidth || 3,
      viewHeight = v.clientHeight || 4;
    const scale = Math.max(
      viewWidth / v.videoWidth,
      viewHeight / v.videoHeight,
    );
    const width = viewWidth / scale,
      height = viewHeight / scale,
      ratio = Math.min(1, maxEdge / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
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
    return canvas;
  }
  async function snapshot(v: HTMLVideoElement) {
    const canvas = frameCanvas(v);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!blob) throw Error("The frame could not be captured.");
    return blob;
  }
  async function outlinePhoto(
    p: PreparedPhoto,
    attempt: number,
    point = { x: 0.5, y: 0.5 },
  ) {
    setOutlining(true);
    setProgress("Tracing its shape · you can enter the trial now");
    try {
      if (!outlineEngine.current || outlineEngine.current.closed)
        outlineEngine.current = new VisionEngine(backend);
      const result = await outlineEngine.current.request(
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
          "Tap the creature in your photograph to trace its outline again.",
        );
      }
    } catch (e) {
      if (attempt === action.current)
        setError(
          "The creature is ready. Its outline can wait. " +
            (host ? (e as Error).message : ""),
        );
    } finally {
      if (attempt === action.current) {
        setOutlining(false);
        setProgress("");
      }
    }
  }
  async function reveal(
    file: Blob,
    found: VisionMatch,
    result: VisionReply,
    attempt: number,
    liveMs = 0,
    frames = 0,
  ) {
    const p = await preparePhoto(file);
    if (attempt !== action.current) {
      URL.revokeObjectURL(p.url);
      return;
    }
    currentPhoto.current = p;
    setPhoto(p);
    setMatch(found);
    setPhase("awake");
    setDetails((old) => ({
      ...old,
      embedBackend: result.backend || "",
      embedMs: result.ms || 0,
      segmentBackend: "",
      segmentMs: 0,
      liveMs,
      frames,
    }));
    void outlinePhoto(p, attempt);
  }
  async function recognize(file: Blob) {
    if (!manifest || !ready) return;
    reset();
    const attempt = action.current;
    setPhase("reading");
    try {
      await warmRecognizer();
      if (attempt !== action.current) return;
      const p = await preparePhoto(file);
      if (attempt !== action.current) {
        URL.revokeObjectURL(p.url);
        return;
      }
      const result = await getRecognizer().request("embed", p.blob, p.key);
      const found = matchGuardian(result.vector!, manifest);
      if (attempt !== action.current) {
        URL.revokeObjectURL(p.url);
        return;
      }
      if (!found.guardianId) {
        currentPhoto.current = p;
        setPhoto(p);
        setMatch(found);
        setPhase("unknown");
        setDetails((old) => ({
          ...old,
          embedMs: result.ms || 0,
          embedBackend: result.backend || "",
        }));
        return;
      }
      URL.revokeObjectURL(p.url);
      await reveal(file, found, result, attempt);
    } catch (e) {
      if (attempt === action.current) {
        setError((e as Error).message);
        setPhase("idle");
      }
    }
  }
  async function scan(v: HTMLVideoElement, attempt: number) {
    if (!manifest) return;
    try {
      await warmRecognizer();
      if (attempt !== action.current) return;
      const stable = new StableGuardian(),
        started = performance.now();
      let lastTime = -1,
        frames = 0;
      while (attempt === action.current && !document.hidden) {
        if (v.readyState < 2 || !v.videoWidth || v.currentTime === lastTime) {
          await new Promise((r) => setTimeout(r, 80));
          continue;
        }
        lastTime = v.currentTime;
        const begin = performance.now();
        // One transferable frame in flight; the worker downsamples directly to 224px.
        // Avoid an extra low-resolution resize, which distorts small prop details.
        const bitmap = await createImageBitmap(frameCanvas(v, 960));
        if (attempt !== action.current) {
          bitmap.close();
          return;
        }
        const result = await getRecognizer().request(
          "embed",
          bitmap,
          "live-" + frames,
        );
        if (attempt !== action.current) return;
        const found = matchGuardian(result.vector!, manifest),
          streak = stable.observe(found.guardianId, performance.now());
        frames++;
        setLive({
          count: Math.min(STABLE_FRAMES, streak.count),
          frames,
          ms: result.ms || 0,
        });
        if (host) setMatch(found);
        if (streak.stable) {
          const file = await snapshot(v);
          if (attempt !== action.current) return;
          stopCamera();
          await reveal(
            file,
            found,
            result,
            attempt,
            performance.now() - started,
            frames,
          );
          return;
        }
        await new Promise((r) =>
          setTimeout(
            r,
            Math.max(0, SCAN_INTERVAL_MS - (performance.now() - begin)),
          ),
        );
      }
    } catch (e) {
      if (attempt === action.current) {
        stopCamera();
        setError((e as Error).message);
        setPhase("idle");
      }
    }
  }
  useEffect(() => {
    if (phase !== "camera" || !video.current) return;
    const v = video.current,
      attempt = action.current;
    if (clip.current) v.src = clip.current;
    else if (stream.current) v.srcObject = stream.current;
    void v
      .play()
      .then(() => scan(v, attempt))
      .catch((e) => {
        if (attempt === action.current) {
          setError(
            "The video could not start. Choose another photo or camera. " +
              (host ? e.message : ""),
          );
          stopCamera();
          setPhase("idle");
        }
      });
  }, [phase]);
  async function openCamera() {
    reset();
    const attempt = action.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw Error(
          "The live camera is unavailable. Use the phone camera or choose a photo below.",
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
            ? "Camera access was declined. Allow it in browser settings, or choose a photo below."
            : (e as Error).message,
        );
    }
  }
  function openTestVideo(file: File) {
    reset();
    if (file.size > 50 * 1024 * 1024) {
      setError("Choose a test video up to 50 MB.");
      return;
    }
    clip.current = URL.createObjectURL(file);
    setPhase("camera");
  }
  async function capture() {
    const v = video.current;
    if (!v?.videoWidth) return;
    const attempt = action.current;
    try {
      const blob = await snapshot(v);
      if (attempt === action.current) await recognize(blob);
    } catch (e) {
      if (attempt === action.current) setError((e as Error).message);
    }
  }
  function skipOutline() {
    action.current++;
    stopOutline();
    setProgress("");
  }
  function refine(event: React.MouseEvent<HTMLDivElement>) {
    if (!photo || !guardian || outlining || phase !== "awake") return;
    const box = event.currentTarget.getBoundingClientRect();
    void outlinePhoto(photo, ++action.current, {
      x: Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)),
      y: Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)),
    });
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
          OUTLINE PROCESSING
          <select
            value={backend}
            disabled={busy || outlining || phase === "camera"}
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
      {ready && (
        <p className="lens-ready" role="status">
          {modelReady
            ? "Lens ready · automatic live scanning"
            : prepareProgress}
        </p>
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
              <video ref={video} playsInline muted autoPlay loop />
              <div
                className={"lens-reticle " + (live.count ? "is-steady" : "")}
              />
              <p className="lens-camera-hint">
                {!modelReady
                  ? "Preparing the lens…"
                  : live.count
                    ? `Hold steady · ${live.count} of ${STABLE_FRAMES}`
                    : "Centre one creature · it will wake automatically"}
              </p>
              <button
                className="lens-shutter"
                aria-label="Take a photo instead"
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
              {(busy || outlining) && <div className="lens-scan-line" />}
            </div>
          ) : (
            <div className="lens-empty">
              <Leaf size={42} />
              <p>A familiar shape is enough to begin.</p>
            </div>
          )}
          {(busy || outlining) && (
            <div className="lens-progress" role="status">
              <span className="status-dot" />
              {progress ||
                (modelReady ? "Listening to the shape…" : prepareProgress)}
              <button
                className="text-button"
                onClick={outlining ? skipOutline : reset}
              >
                {outlining ? "Meet it without the outline" : "Cancel"}
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
                disabled={outlining}
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
                {photo ? "Scan another guardian" : "Open the live lens"}
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
              {host && (
                <label className="btn secondary file-button">
                  Test a video
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) openTestVideo(file);
                    }}
                  />
                </label>
              )}
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
          {host && (
            <p className="small muted">
              Model preparation: {(details.prepareMs / 1000).toFixed(2)}s. Live
              frames: {live.frames} · last frame {live.ms.toFixed(0)}ms
              {details.liveMs > 0
                ? ` · stable match in ${(details.liveMs / 1000).toFixed(2)}s (${details.frames} frames)`
                : ""}
              . Recognition runs on the warmed small CPU model; outline backend
              is selected above.
            </p>
          )}
          {host && match && (
            <details className="lens-diagnostics" open>
              <summary>Recognition diagnostics</summary>
              <p>
                Recognition: {details.embedBackend || "Local processing"} ·{" "}
                {(details.embedMs / 1000).toFixed(2)}s. Outline:{" "}
                {details.segmentBackend || "pending"} ·{" "}
                {(details.segmentMs / 1000).toFixed(2)}s. Recognition excludes
                model preparation; outline includes first-use preparation.
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
