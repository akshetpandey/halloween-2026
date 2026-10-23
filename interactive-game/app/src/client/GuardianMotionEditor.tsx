import React, { useEffect, useState, useRef } from "react";
import { api } from "./api";
import { motionRequest } from "./motion-engine";
import { FOX_POINTS, type FoxRig } from "./fox-rig";
import { getSegmentationSession } from "./segmentation-session";
import { cutoutPhoto, preparePhoto, type PreparedPhoto } from "./vision-engine";
import { FoxAwakening } from "./FoxAwakening";
import {
  motionPrompts,
  type MotionBounds,
  type MotionPose,
} from "../shared/guardian-motion";
type PointKey = keyof FoxRig | "corner1" | "corner2";
export function GuardianMotionEditor({
  referenceId,
  guardianId,
  name,
  onClose,
  onSaved,
}: {
  referenceId: string;
  guardianId: string;
  name: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const section = useRef<HTMLElement>(null);
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null),
    [rig, setRig] = useState<FoxRig>({
      head: { x: 0.4, y: 0.5 },
      neck: { x: 0.5, y: 0.5 },
      tail: { x: 0.6, y: 0.25 },
      rump: { x: 0.6, y: 0.55 },
    }),
    [bounds, setBounds] = useState<MotionBounds>({
      left: 0.2,
      top: 0.15,
      right: 0.8,
      bottom: 0.8,
    });
  const [point, setPoint] = useState<PointKey>("corner1"),
    [parts, setParts] = useState<MotionPose["parts"]>("both"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [cutout, setCutout] = useState(""),
    [preview, setPreview] = useState(false),
    [playing, setPlaying] = useState(true),
    [puppetReady, setPuppetReady] = useState(false);
  useEffect(() => {
    section.current?.scrollIntoView({ block: "start", behavior: "instant" });
    let alive = true,
      p: PreparedPhoto | undefined;
    void (async () => {
      try {
        const [response, poses] = await Promise.all([
          fetch("/api/admin/vision/references/" + referenceId),
          api<MotionPose[]>("/admin/vision/motion/" + guardianId),
        ]);
        if (!response.ok)
          throw Error("The reference photograph is unavailable.");
        p = await preparePhoto(await response.blob());
        if (!alive) {
          URL.revokeObjectURL(p.url);
          return;
        }
        setPhoto(p);
        const saved = poses.find((p) => p.referenceId === referenceId);
        if (saved) {
          setRig(saved.rig);
          setBounds(saved.bounds);
          setParts(saved.parts);
          setStatus("Saved movement loaded.");
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
      if (p) URL.revokeObjectURL(p.url);
      getSegmentationSession().clearImage();
    };
  }, [referenceId, guardianId]);
  useEffect(
    () => () => {
      if (cutout) URL.revokeObjectURL(cutout);
    },
    [cutout],
  );
  function place(e: React.MouseEvent<HTMLDivElement>) {
    if (busy || preview) return;
    const rect = e.currentTarget.getBoundingClientRect(),
      p = {
        x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
      };
    if (point === "corner1") setBounds({ ...bounds, left: p.x, top: p.y });
    else if (point === "corner2")
      setBounds({ ...bounds, right: p.x, bottom: p.y });
    else setRig({ ...rig, [point]: p });
  }
  async function save() {
    if (!photo) return;
    setBusy(true);
    setError("");
    setStatus("Saving movement…");
    try {
      const { features } = await motionRequest(photo.blob, { bounds });
      if (!features || features.points.length < 16)
        throw Error(
          "Include more of the creature inside the boundary, or choose a sharper reference.",
        );
      await api("/admin/vision/references/" + referenceId + "/motion", "POST", {
        rig,
        bounds,
        parts,
        features,
      });
      await onSaved();
      setStatus("Movement saved. Similar new photos will align automatically.");
    } catch (e) {
      setError((e as Error).message);
      setStatus("");
    } finally {
      setBusy(false);
    }
  }
  async function watch() {
    if (!photo) return;
    setBusy(true);
    setError("");
    try {
      const session = getSegmentationSession();
      await session.prepare(setStatus);
      const points = motionPrompts({ rig, parts });
      const result = await session.segment(
        photo.blob,
        photo.key,
        setStatus,
        points,
      );
      if (!result.segmentation?.usable)
        throw Error("The outline needs a clearer reference.");
      setCutout(await cutoutPhoto(photo, result.segmentation));
      setPreview(true);
      setPlaying(true);
      setStatus(
        "Previewing saved-style movement. Save when the points look right.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section ref={section} className="guardian-motion-editor">
      <span className="eyebrow">SAVED MOVEMENT · {name}</span>
      <h2>
        Give this view <em>a little life.</em>
      </h2>
      <p>
        Mark the whole creature, then its head and tail. Save once for each
        useful angle. Similar camera photos align automatically; a different
        side may need its own reference setup.
      </p>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {status && <p role="status">{status}</p>}
      <div className="motion-toolbar">
        <label>
          Place a marker
          <select
            aria-label="Place a marker"
            value={point}
            disabled={busy}
            onChange={(e) => {
              setPoint(e.target.value as PointKey);
              setPreview(false);
            }}
          >
            {[
              { key: "corner1", label: "Boundary: top left" },
              { key: "corner2", label: "Boundary: bottom right" },
              ...FOX_POINTS,
            ].map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Moving parts
          <select
            aria-label="Moving parts"
            value={parts}
            disabled={busy}
            onChange={(e) => {
              setParts(e.target.value as MotionPose["parts"]);
              setPreview(false);
            }}
          >
            <option value="both">Head and tail</option>
            <option value="head">Head only</option>
            <option value="tail">Tail only</option>
          </select>
        </label>
      </div>
      {photo && (
        <div
          className={
            "lens-photo motion-setup-photo " +
            (preview
              ? "is-awake is-fox " + (puppetReady ? "has-fox-puppet" : "")
              : "")
          }
          style={{ aspectRatio: `${photo.width}/${photo.height}` }}
          onClick={place}
        >
          <img
            className="lens-capture-base"
            src={photo.url}
            alt={name + " movement reference"}
          />
          {preview && cutout && (
            <img className="lens-cutout" src={cutout} alt="" />
          )}
          {preview && cutout && (
            <FoxAwakening
              src={cutout}
              rig={rig}
              parts={parts}
              moving={playing}
              onAvailable={setPuppetReady}
            />
          )}
          {!preview && (
            <svg
              className="lens-rig-points"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <rect
                x={bounds.left * 100}
                y={bounds.top * 100}
                width={Math.max(0, bounds.right - bounds.left) * 100}
                height={Math.max(0, bounds.bottom - bounds.top) * 100}
              />
              <path
                d={`M${rig.head.x * 100},${rig.head.y * 100} L${rig.neck.x * 100},${rig.neck.y * 100} M${rig.tail.x * 100},${rig.tail.y * 100} L${rig.rump.x * 100},${rig.rump.y * 100}`}
              />
              {FOX_POINTS.map(({ key }, i) => (
                <g key={key}>
                  <circle
                    cx={rig[key].x * 100}
                    cy={rig[key].y * 100}
                    r={point === key ? 2 : 1.3}
                  />
                  <text x={rig[key].x * 100 + 2} y={rig[key].y * 100}>
                    {i + 1}
                  </text>
                </g>
              ))}
            </svg>
          )}
        </div>
      )}
      <p className="small muted">
        {preview
          ? "Movement plays even with Reduce Motion enabled."
          : `Choose a control, then tap its position in the photo. Selected: ${point}.`}
      </p>
      {preview && (
        <button className="text-button" onClick={() => setPlaying(!playing)}>
          {playing ? "Let it rest" : "Wake it again"}
        </button>
      )}
      <div className="lens-actions">
        <button
          className="btn"
          disabled={busy || !photo}
          onClick={() => void save()}
        >
          Save movement
        </button>
        <button
          className="btn secondary"
          disabled={busy || !photo}
          onClick={() => void watch()}
        >
          Preview awakening
        </button>
        <button
          className="text-button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void api(
              "/admin/vision/references/" + referenceId + "/motion",
              "DELETE",
            )
              .then(onSaved)
              .then(() => setStatus("Saved movement cleared for this view."))
              .catch((e) => setError(e.message))
              .finally(() => setBusy(false));
          }}
        >
          Clear saved movement
        </button>
        <button className="text-button" disabled={busy} onClick={onClose}>
          Back to references
        </button>
      </div>
    </section>
  );
}
