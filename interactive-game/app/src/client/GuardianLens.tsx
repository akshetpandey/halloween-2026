import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
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
import { LensConfirmation } from "./LensConfirmation";
import { recognitionSession } from "./recognition-session";
import { lensCamera, recognitionFrames, captureFrames } from "./lens-camera";
import {
  getSegmentationSession,
  type SegmentationSession,
} from "./segmentation-session";
import { preparePhoto, cutoutPhoto, type PreparedPhoto } from "./vision-engine";
import type { MaskResult, VisionReply } from "./vision.worker";
import { motionRequest } from "./motion-engine";
import {
  motionPrompts,
  type MotionAlignment,
  type MotionPose,
} from "../shared/guardian-motion";
import { FoxAwakening } from "./FoxAwakening";
import { estimateFoxRig, FOX_POINTS, type FoxRig } from "./fox-rig";
import { hostSpiritCharacter } from "./spirit-character";
import { preloadFoxSpirit } from "./fox-spirit-loader";
import { spiritOrigin, type SpiritOrigin } from "./spirit-motion";
import { resolveSpiritEntrance } from "./spirit-entrance";
import type { SpiritAsset } from "./spirit-asset";
import "./vision.css";
const FoxSpiritReveal = lazy(() => import("./FoxSpiritReveal"));
export function GuardianLens({
  manifest: provided,
  host = false,
  onContinue,
  onClose,
  initialPhoto,
  spiritAsset,
}: {
  manifest?: VisionManifest;
  initialPhoto?: Blob;
  spiritAsset?: SpiritAsset;
  host?: boolean;
  onContinue?: (id: string) => Promise<void>;
  onClose?: () => void;
}) {
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    section.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, []);
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
  const [outlineState, setOutlineState] = useState<
    "preparing" | "ready" | "failed"
  >(() => (getSegmentationSession().ready ? "ready" : "preparing"));
  const [outlineProgress, setOutlineProgress] = useState(
    "Preparing the awakening…",
  );
  const [details, setDetails] = useState({
    embedBackend: "",
    segmentBackend: "",
    embedMs: 0,
    segmentMs: 0,
    prepareMs: 0,
    outlinePrepareMs: 0,
    outlinePrepareBackend: "",
    liveMs: 0,
    frames: 0,
    cameraMs: 0,
    previewMs: 0,
    rememberedCamera: false,
  });
  const [live, setLive] = useState({
    count: 0,
    frames: 0,
    ms: 0,
    candidateId: null as string | null,
    confirmed: false,
    noticed: false,
  });
  const [continuing, setContinuing] = useState(false);
  const [alignment, setAlignment] = useState<MotionAlignment | null>(null),
    [motionKnown, setMotionKnown] = useState(false),
    [motionStatus, setMotionStatus] = useState("");
  const aligned = useRef<MotionAlignment | null>(null);
  const poses = useRef(new Map<string, Promise<MotionPose[]>>());
  const [foxRig, setFoxRig] = useState<FoxRig | null>(null);
  const [moving, setMoving] = useState(true);
  const [puppetReady, setPuppetReady] = useState(false);
  const [rigPoint, setRigPoint] = useState<keyof FoxRig | null>(null);
  const [spiritOpen, setSpiritOpen] = useState(false),
    [spiritStart, setSpiritStart] = useState<SpiritOrigin | null>(null),
    [spiritPrepared, setSpiritPrepared] = useState(false);
  const outlineSession = useRef<SegmentationSession | null>(null);
  const video = useRef<HTMLVideoElement>(null),
    cameraStarted = useRef(0),
    clip = useRef("");
  const action = useRef(0),
    mounted = useRef(true),
    currentPhoto = useRef<PreparedPhoto | null>(null),
    cutoutRef = useRef("");
  const busy = phase === "reading";
  const guardian = guardians.find((g) => g.id === match?.guardianId);
  const isFox = guardian?.art === "fox";
  const spiritCharacter = hostSpiritCharacter(guardian?.art);
  const spiritPrototype = host && !!spiritCharacter;
  const puppetEligible = isFox || !!alignment;
  useEffect(() => {
    setFoxRig(
      outline?.usable
        ? (alignment?.rig ??
            (!motionKnown && isFox ? estimateFoxRig(outline) : null))
        : null,
    );
    setRigPoint(null);
  }, [outline, isFox, alignment, motionKnown]);
  const ready = !!manifest?.references.some((r) => r.guardianId);
  async function load() {
    setManifest(provided ?? (await api<VisionManifest>("/vision/references")));
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [provided]);
  useEffect(() => {
    if (host && initialPhoto) void recognize(initialPhoto);
  }, [initialPhoto]);
  function getMotionPoses(id: string) {
    let pending = poses.current.get(id);
    if (!pending) {
      pending = api<MotionPose[]>(
        (host ? "/admin" : "") + "/vision/motion/" + id,
      );
      poses.current.set(id, pending);
      void pending.catch(() => poses.current.delete(id));
    }
    return pending;
  }
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
    if (ready && host)
      for (const g of guardians.filter((g) => hostSpiritCharacter(g.art)))
        void getMotionPoses(g.id).catch(() => {});
    if (ready)
      void warmRecognizer()
        .then(async () => {
          if (!mounted.current) return;
          if (host) {
            // Keep model preparation sequential on memory-constrained phones.
            await preloadFoxSpirit("fox");
            if (!mounted.current) return;
            await preloadFoxSpirit("tree");
            if (mounted.current) setSpiritPrepared(true);
          } else await warmOutline();
        })
        .catch((e) => {
          if (mounted.current) setError(e.message);
        });
  }, [ready, host]);
  function getOutlineSession() {
    const session = getSegmentationSession();
    outlineSession.current = session;
    return session;
  }
  function warmOutline(session = getOutlineSession()) {
    setOutlineState(session.ready ? "ready" : "preparing");
    return session
      .prepare((text) => {
        if (mounted.current && outlineSession.current === session)
          setOutlineProgress(text);
      })
      .then((result) => {
        if (mounted.current && outlineSession.current === session) {
          setOutlineState("ready");
          setDetails((old) => ({
            ...old,
            outlinePrepareMs: result.ms ?? 0,
            outlinePrepareBackend: result.backend || "",
          }));
        }
        return result;
      })
      .catch((error) => {
        if (mounted.current && outlineSession.current === session)
          setOutlineState("failed");
        throw error;
      });
  }
  function stopCamera() {
    lensCamera.stop();
    recognitionFrames.clear();
    captureFrames.clear();
    if (video.current) {
      video.current.pause();
      video.current.srcObject = null;
    }
    if (clip.current) URL.revokeObjectURL(clip.current);
    clip.current = "";
  }
  function stopOutline() {
    outlineSession.current?.clearImage();
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
    setLive({
      count: 0,
      frames: 0,
      ms: 0,
      candidateId: null,
      confirmed: false,
      noticed: false,
    });
    setFoxRig(null);
    setAlignment(null);
    aligned.current = null;
    setMotionKnown(false);
    setMotionStatus("");
    setPuppetReady(false);
    setRigPoint(null);
    setMoving(true);
    setSpiritOpen(false);
    setSpiritStart(null);
    setDetails((old) => ({
      ...old,
      liveMs: 0,
      frames: 0,
      cameraMs: 0,
      previewMs: 0,
      rememberedCamera: false,
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
      outlineSession.current?.clearImage();
      if (currentPhoto.current) URL.revokeObjectURL(currentPhoto.current.url);
      if (cutoutRef.current) URL.revokeObjectURL(cutoutRef.current);
    };
  }, []);
  useEffect(() => {
    const suspend = () => {
      if (lensCamera.stream || lensCamera.opening || clip.current) reset();
    };
    const hide = () => {
      if (document.hidden) suspend();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", suspend);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", suspend);
    };
  }, []);
  async function snapshot(v: HTMLVideoElement) {
    const canvas = captureFrames.draw(v, 1280);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!blob) throw Error("The frame could not be captured.");
    return blob;
  }
  async function outlinePhoto(
    p: PreparedPhoto,
    attempt: number,
    point?: { x: number; y: number },
  ) {
    setOutlining(true);
    setProgress("Tracing its shape · you can enter the trial now");
    try {
      const session = getOutlineSession();
      await warmOutline(session);
      if (attempt !== action.current) return;
      const result = await session.segment(
        p.blob,
        p.key,
        (text) => {
          if (attempt === action.current) setProgress(text);
        },
        point ??
          (aligned.current
            ? motionPrompts(aligned.current)
            : { x: 0.5, y: 0.5 }),
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
    if (
      host &&
      hostSpiritCharacter(guardians.find((g) => g.id === found.guardianId)?.art)
    ) {
      setSpiritOpen(true);
      const matched = await resolveSpiritEntrance(
        getMotionPoses(found.guardianId!),
        async (saved, remaining) =>
          attempt === action.current
            ? ((
                await motionRequest(p.blob, {
                  poses: saved,
                  timeoutMs: remaining,
                })
              ).alignment ?? null)
            : null,
      );
      if (attempt !== action.current) return;
      setAlignment(matched);
      setMotionStatus(
        matched
          ? `Entrance anchored to the reference · ${matched.inliers} matching details. Final pose faces the screen.`
          : "Entrance starts at the lens centre. Final pose faces the screen.",
      );
      setSpiritStart(spiritOrigin(matched?.bounds));
      setProgress("");
      return;
    }
    setOutlining(true);
    try {
      let pending = poses.current.get(found.guardianId!);
      if (!pending) {
        pending = api<MotionPose[]>(
          (host ? "/admin" : "") + "/vision/motion/" + found.guardianId,
        );
        poses.current.set(found.guardianId!, pending);
      }
      const saved = await pending;
      if (attempt !== action.current) return;
      setMotionKnown(saved.length > 0);
      if (saved.length) {
        setProgress("Finding its familiar features…");
        const result = await motionRequest(p.blob, { poses: saved });
        if (attempt !== action.current) return;
        aligned.current = result.alignment ?? null;
        setAlignment(aligned.current);
        setMotionStatus(
          aligned.current
            ? `Saved movement aligned · ${aligned.current.inliers} matching details`
            : "No reliable movement alignment for this angle. Add a movement setup for a closer reference view.",
        );
      } else setMotionStatus("No saved movement for this guardian yet.");
    } catch {
      if (attempt !== action.current) return;
      setMotionKnown(true);
      setMotionStatus(
        "Saved movement is unavailable. The guardian's trial is still ready.",
      );
    }
    if (attempt === action.current) void outlinePhoto(p, attempt);
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
        const bitmap = await createImageBitmap(recognitionFrames.draw(v, 960));
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
        setLive((previous) => ({
          count: Math.min(STABLE_FRAMES, streak.count),
          frames,
          ms: result.ms || 0,
          candidateId: streak.id,
          confirmed: streak.stable,
          noticed: previous.noticed || !!streak.id,
        }));
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
    else if (lensCamera.stream) v.srcObject = lensCamera.stream;
    void v
      .play()
      .then(() => {
        if (attempt !== action.current) return;
        if (!clip.current)
          setDetails((old) => ({
            ...old,
            previewMs: performance.now() - cameraStarted.current,
          }));
        return scan(v, attempt);
      })
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
    cameraStarted.current = performance.now();
    try {
      const opened = await lensCamera.open();
      if (!opened || attempt !== action.current) return;
      setDetails((old) => ({
        ...old,
        cameraMs: opened.ms,
        rememberedCamera: opened.remembered,
      }));
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
    if (
      spiritPrototype ||
      !photo ||
      !guardian ||
      outlining ||
      phase !== "awake"
    )
      return;
    const box = event.currentTarget.getBoundingClientRect();
    const point = {
      x: Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)),
      y: Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)),
    };
    if (host && rigPoint && foxRig) {
      setFoxRig({ ...foxRig, [rigPoint]: point });
      return;
    }
    void outlinePhoto(photo, ++action.current, point);
  }
  return (
    <section
      ref={section}
      className={"guardian-lens " + (host ? "host-lens" : "page-top")}
    >
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
        <p className="small muted">
          Fox and Gilded Root prototypes: authored 3D spirits, with no outline
          processing. Other guardians use MagicTouch · GPU with CPU fallback.
          {initialPhoto &&
            ". Testing a saved reference checks the reveal, not accuracy on a new photo."}
        </p>
      )}
      {ready && (
        <p className="lens-ready" role="status">
          {modelReady
            ? host
              ? spiritPrepared
                ? "Lens ready · spirit assets ready"
                : "Lens ready · preparing the spirits…"
              : outlineState === "ready"
                ? "Lens ready · awakening ready"
                : outlineState === "failed"
                  ? "Lens ready · you can meet the guardian without its outline"
                  : "Lens ready · preparing the awakening…"
            : prepareProgress}
        </p>
      )}
      {ready && outlineState === "failed" && !spiritPrototype && (
        <button
          className="text-button"
          onClick={() => {
            const session = getOutlineSession();
            session.retry();
            setError("");
            if (currentPhoto.current && guardian)
              void outlinePhoto(currentPhoto.current, action.current);
            else void warmOutline(session).catch((e) => setError(e.message));
          }}
        >
          Retry awakening outline
        </button>
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
              <LensConfirmation
                ready={modelReady}
                candidateName={
                  guardians.find((g) => g.id === live.candidateId)?.name
                }
                count={live.count}
                confirmed={live.confirmed}
                noticed={live.noticed}
              />
              <button
                className="lens-shutter"
                aria-label="Take a photo instead"
                disabled={live.confirmed}
                onClick={() => void capture()}
              >
                <Camera />
              </button>
            </div>
          ) : photo ? (
            <div
              className={
                "lens-photo " +
                (phase === "awake" ? "is-awake " : "") +
                (puppetEligible ? "is-fox " : "") +
                (puppetEligible && puppetReady ? "has-fox-puppet" : "")
              }
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
              {cutout && puppetEligible && foxRig && (
                <FoxAwakening
                  src={cutout}
                  rig={foxRig}
                  parts={alignment?.parts}
                  moving={moving && !rigPoint}
                  onAvailable={setPuppetReady}
                />
              )}
              {host && rigPoint && foxRig && (
                <svg
                  className="lens-rig-points"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d={`M${foxRig.head.x * 100},${foxRig.head.y * 100} L${foxRig.neck.x * 100},${foxRig.neck.y * 100} M${foxRig.tail.x * 100},${foxRig.tail.y * 100} L${foxRig.rump.x * 100},${foxRig.rump.y * 100}`}
                  />
                  {FOX_POINTS.map(({ key }, i) => (
                    <g key={key}>
                      <circle
                        cx={foxRig[key].x * 100}
                        cy={foxRig[key].y * 100}
                        r={key === rigPoint ? 2 : 1.3}
                      />
                      <text
                        x={foxRig[key].x * 100 + 2.5}
                        y={foxRig[key].y * 100}
                      >
                        {i + 1}
                      </text>
                    </g>
                  ))}
                </svg>
              )}
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
                {spiritPrototype
                  ? "Its spirit is ready to greet you. This animation does not need an outline."
                  : rigPoint
                    ? `Tap the creature’s ${FOX_POINTS.find((p) => p.key === rigPoint)!.label.toLowerCase()} in the photograph.`
                    : cutout
                      ? "Tap the creature in your photograph to refine its outline."
                      : "Its voice is waiting, even if the outline is quiet."}
              </p>
              {puppetEligible && cutout && puppetReady && (
                <button
                  className="text-button lens-retrace"
                  onClick={() => setMoving(!moving)}
                  aria-pressed={!moving}
                >
                  {moving ? "Let it rest" : "Wake it again"}
                </button>
              )}
              {host && puppetEligible && cutout && foxRig && (
                <details
                  className="lens-rig-editor"
                  onToggle={(e) => {
                    if (!e.currentTarget.open) setRigPoint(null);
                  }}
                >
                  <summary>Adjust this capture’s movement</summary>
                  <p className="small muted">
                    The starting pose estimates a head and upright tail from the
                    outline. Choose a point, then tap its position in this
                    photo. Adjustments here apply only to this capture. Save
                    permanent points with “Set up movement” on a reference
                    photo.
                  </p>
                  <div className="lens-rig-controls">
                    {FOX_POINTS.map(({ key, label }, i) => (
                      <button
                        className="btn secondary"
                        key={key}
                        aria-pressed={rigPoint === key}
                        onClick={() => setRigPoint(key)}
                      >
                        {i + 1}. {label}
                      </button>
                    ))}
                    <button className="btn" onClick={() => setRigPoint(null)}>
                      Watch movement
                    </button>
                  </div>
                </details>
              )}
              {spiritPrototype ? (
                <button
                  className="btn secondary"
                  onClick={() => setSpiritOpen(true)}
                >
                  Replay guardian spirit
                </button>
              ) : (
                <button
                  className="text-button lens-retrace"
                  disabled={outlining}
                  onClick={() =>
                    photo && void outlinePhoto(photo, ++action.current)
                  }
                >
                  {alignment
                    ? "Trace saved points again"
                    : "Trace from the centre again"}
                </button>
              )}
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
              . Awakening preparation:{" "}
              {(details.outlinePrepareMs / 1000).toFixed(2)}s
              {details.outlinePrepareBackend
                ? ` · ${details.outlinePrepareBackend}`
                : ""}
              . Recognition uses a warmed CPU model. The host fox and Gilded
              Root use a 3D reveal; other guardians use outlines with GPU/CPU
              fallback.
              {details.cameraMs > 0 && (
                <>
                  {" "}
                  Camera opened: {(details.cameraMs / 1000).toFixed(2)}s ·
                  preview ready: {(details.previewMs / 1000).toFixed(2)}s from
                  tap ·{" "}
                  {details.rememberedCamera
                    ? "remembered camera"
                    : "initial camera selection"}
                  .
                </>
              )}
            </p>
          )}
          {host && match && (
            <details className="lens-diagnostics" open>
              <summary>Recognition diagnostics</summary>
              <p>
                Recognition: {details.embedBackend || "Local processing"} ·{" "}
                {(details.embedMs / 1000).toFixed(2)}s. Outline:{" "}
                {spiritPrototype
                  ? "skipped for 3D spirit"
                  : details.segmentBackend || "pending"}{" "}
                · {(details.segmentMs / 1000).toFixed(2)}s per photograph. Model
                warm-up is reported separately above.
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
              {motionStatus && <p>{motionStatus}</p>}
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
      {spiritOpen && photo && (
        <Suspense fallback={<p role="status">Opening the guardian spirit…</p>}>
          <FoxSpiritReveal
            character={spiritCharacter ?? "fox"}
            asset={spiritCharacter === "fox" ? spiritAsset : undefined}
            photo={photo}
            origin={spiritStart}
            onClose={() => setSpiritOpen(false)}
            onScanAgain={() => {
              reset();
              void openCamera();
            }}
          />
        </Suspense>
      )}
    </section>
  );
}
