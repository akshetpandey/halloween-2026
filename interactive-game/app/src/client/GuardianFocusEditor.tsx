import React, { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { preparePhoto, type PreparedPhoto } from "./vision-engine";
import { recognitionSession } from "./recognition-session";
import {
  focusSignature,
  type FocusPoint,
  type FocusSetup,
  type RegionFeatures,
} from "../shared/recognition-focus";
export function GuardianFocusEditor({
  referenceId,
  name,
  onClose,
  onSaved,
}: {
  referenceId: string;
  name: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null),
    [polygon, setPolygon] = useState<FocusPoint[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const features = useRef<RegionFeatures | null>(null),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    let p: PreparedPhoto | undefined;
    void (async () => {
      try {
        const [r, saved] = await Promise.all([
          fetch("/api/admin/vision/references/" + referenceId),
          api<FocusSetup | null>(
            "/admin/vision/references/" + referenceId + "/focus",
          ),
        ]);
        if (!r.ok) throw Error("The reference photograph is unavailable.");
        p = await preparePhoto(await r.blob());
        if (!alive.current) {
          URL.revokeObjectURL(p.url);
          return;
        }
        setPhoto(p);
        setPolygon(saved?.polygon ?? []);
      } catch (e) {
        if (alive.current) setError((e as Error).message);
      }
    })();
    return () => {
      alive.current = false;
      if (p) URL.revokeObjectURL(p.url);
    };
  }, [referenceId]);
  async function save() {
    if (!photo || polygon.length < 3) return;
    setBusy(true);
    setError("");
    try {
      setStatus("Learning this guardian’s shape…");
      await recognitionSession.prepare();
      if (!features.current) {
        const r = await recognitionSession
          .getEngine()
          .request("regions", photo.blob, photo.key);
        features.current = r.regions!;
      }
      if (!alive.current) return;
      const setup = focusSignature(features.current!, polygon);
      await api(
        "/admin/vision/references/" + referenceId + "/focus",
        "POST",
        setup,
      );
      if (alive.current) {
        await onSaved();
        setStatus(
          "Foreground saved. The Lens can look for this shape in another setting.",
        );
      }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section className="host-references">
      <span className="eyebrow">FOR THE KEEPER · RECOGNITION</span>
      <h2>
        Show the Lens <em>what matters.</em>
      </h2>
      <p>
        {name}: tap around the outside of the guardian to outline it. Leave
        walls, tables and nearby objects outside. A rough outline is enough;
        give thin twigs a little space. Save once for each useful angle.
      </p>
      <p className="small muted">
        This changes recognition, separately from the animated character.
        Original photos remain private. Only compact shape features reach
        rehearsal players.
      </p>
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      {status && <p role="status">{status}</p>}
      {photo && (
        <div
          className="focus-editor-photo"
          onClick={(e) => {
            if (busy || polygon.length >= 48) return;
            const r = e.currentTarget.getBoundingClientRect();
            setPolygon((old) => [
              ...old,
              {
                x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
                y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
              },
            ]);
          }}
        >
          <img src={photo.url} alt="Reference photograph to outline" />
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <mask id="focus-outline">
                <rect width="100" height="100" fill="white" />
                <polygon
                  points={polygon
                    .map((p) => `${p.x * 100},${p.y * 100}`)
                    .join(" ")}
                  fill="black"
                />
              </mask>
            </defs>
            {polygon.length >= 3 && (
              <rect
                width="100"
                height="100"
                fill="#07150c88"
                mask="url(#focus-outline)"
              />
            )}
            <polygon
              points={polygon.map((p) => `${p.x * 100},${p.y * 100}`).join(" ")}
              fill="#ebcf7320"
              stroke="#f3d68a"
              strokeWidth=".5"
            />
            {polygon.map((p, i) => (
              <circle
                key={i}
                cx={p.x * 100}
                cy={p.y * 100}
                r=".8"
                fill="#fff2c2"
              />
            ))}
          </svg>
        </div>
      )}
      <div className="focus-editor-controls">
        <button
          className="btn"
          disabled={busy || polygon.length < 3 || !photo}
          onClick={() => void save()}
        >
          {busy ? "Learning…" : "Save guardian outline"}
        </button>
        <button
          className="btn secondary"
          disabled={busy || !polygon.length}
          onClick={() => setPolygon((p) => p.slice(0, -1))}
        >
          Undo point
        </button>
        <button
          className="text-button"
          disabled={busy}
          onClick={() => setPolygon([])}
        >
          Start outline again
        </button>
        <button className="text-button" disabled={busy} onClick={onClose}>
          Back to reference photos
        </button>
      </div>
    </section>
  );
}
