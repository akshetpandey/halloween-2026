import React, { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { api } from "./api";
import { GuardianMotionEditor } from "./GuardianMotionEditor";
import { GuardianLens } from "./GuardianLens";
import { GuardianArt } from "./Art";
import { VisionEngine, preparePhoto } from "./vision-engine";
import {
  MAX_REFERENCES,
  VISION_MODEL,
  type HostVision,
} from "../shared/vision";
export function HostReferences() {
  const [editingMotion, setEditingMotion] = useState("");
  const [data, setData] = useState<HostVision | null>(null),
    [selected, setSelected] = useState("BUY-02"),
    [note, setNote] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [testing, setTesting] = useState(false);
  const [threshold, setThreshold] = useState(0.8),
    [margin, setMargin] = useState(0.04);
  const engine = useRef<VisionEngine | null>(null),
    alive = useRef(true);
  async function load() {
    const next = await api<HostVision>("/admin/vision");
    if (alive.current) {
      setData(next);
      setThreshold(next.settings.threshold);
      setMargin(next.settings.margin);
    }
  }
  useEffect(() => {
    alive.current = true;
    void load().catch((e) => setError(e.message));
    return () => {
      alive.current = false;
      engine.current?.close();
    };
  }, []);
  const chosen = data?.guardians.find((g) => g.id === selected),
    id = selected === "background" ? null : selected;
  const photos = data?.photos.filter((p) => p.guardianId === id) ?? [];
  async function upload(files: File[]) {
    if (!files.length || !data) return;
    if (files.length + photos.length > MAX_REFERENCES) {
      setError(
        "Keep up to 40 reference photos for each guardian. Remove a weak view before adding more.",
      );
      return;
    }
    setBusy(true);
    setError("");
    let saved = 0;
    const errors: string[] = [];
    engine.current = new VisionEngine("wasm");
    try {
      for (const [i, file] of files.entries()) {
        if (!alive.current) break;
        let url = "";
        try {
          const prefix = `Photo ${i + 1} of ${files.length}`;
          setStatus(prefix + " · preparing");
          const photo = await preparePhoto(file);
          url = photo.url;
          const result = await engine.current.request(
            "embed",
            photo.blob,
            photo.key,
            (text) => {
              if (alive.current) setStatus(prefix + " · " + text);
            },
          );
          if (!alive.current) break;
          const form = new FormData();
          form.set("guardianId", selected);
          form.set("model", VISION_MODEL);
          form.set("vector", JSON.stringify(result.vector));
          form.set("note", note);
          form.set("photo", photo.blob, "guardian.jpg");
          setStatus(prefix + " · saving reference");
          await api("/admin/vision/references", "POST", form);
          saved++;
        } catch (e) {
          errors.push(file.name + ": " + (e as Error).message);
        } finally {
          if (url) URL.revokeObjectURL(url);
        }
      }
      if (alive.current) {
        await load();
        setStatus(
          `${saved} reference ${saved === 1 ? "photo" : "photos"} saved.`,
        );
        setError(errors.join(" "));
      }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      engine.current?.close();
      engine.current = null;
      if (alive.current) setBusy(false);
    }
  }
  async function refreshFeatures() {
    const stale = photos.filter((p) => p.needsProcessing);
    if (!stale.length) return;
    setBusy(true);
    setError("");
    engine.current = new VisionEngine("wasm");
    try {
      for (const [i, p] of stale.entries()) {
        if (!alive.current) break;
        setStatus(`Refreshing saved view ${i + 1} of ${stale.length}…`);
        const response = await fetch("/api/admin/vision/references/" + p.id);
        if (!response.ok) throw Error("Could not open a saved view.");
        const result = await engine.current.request(
          "embed",
          await response.blob(),
          p.id,
        );
        await api("/admin/vision/references/" + p.id + "/features", "POST", {
          model: VISION_MODEL,
          vector: result.vector,
        });
      }
      await load();
      setStatus("Saved views refreshed for the fast lens.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      engine.current?.close();
      engine.current = null;
      setBusy(false);
    }
  }
  async function remove(ref: string) {
    setBusy(true);
    setError("");
    try {
      await api("/admin/vision/references/" + ref, "DELETE");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (editingMotion && chosen)
    return (
      <GuardianMotionEditor
        referenceId={editingMotion}
        guardianId={chosen.id}
        name={chosen.name}
        onClose={() => setEditingMotion("")}
        onSaved={load}
      />
    );
  if (testing && data) {
    const enabled = new Set(
      data.guardians.filter((g) => g.enabled).map((g) => g.id),
    );
    return (
      <GuardianLens
        host
        manifest={{
          ...data,
          references: data.references.filter(
            (r) => r.guardianId === null || enabled.has(r.guardianId),
          ),
        }}
        onClose={() => setTesting(false)}
      />
    );
  }
  return (
    <section className="host-references">
      <span className="eyebrow">FOR THE KEEPER · CAMERA PROTOTYPE</span>
      <h2>
        Teach the wood <em>its creatures.</em>
      </h2>
      <p>
        Add actual photographs of each guardian. Include different angles,
        distances and the lighting you will use at the party. Three views are
        enough to begin testing; aim for 10–20 varied views before relying on
        it.
      </p>
      <p className="small muted">
        Reference photos are saved privately. Their image features are computed
        on your device; rehearsal players download features, not your reference
        photographs. Guest test photographs stay on their phones.
      </p>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {status && <p role="status">{status}</p>}
      {!data ? (
        <p>Opening the reference book…</p>
      ) : (
        <>
          <div className="reference-topline">
            <label>
              GUARDIAN
              <select
                value={selected}
                disabled={busy}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setError("");
                  setStatus("");
                }}
              >
                {data.guardians.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ·{" "}
                    {data.photos.filter((p) => p.guardianId === g.id).length}{" "}
                    views{g.enabled ? "" : " · paused"}
                  </option>
                ))}
                <option value="background">
                  Room backgrounds · not a guardian
                </option>
              </select>
            </label>
            <button
              className="btn"
              disabled={
                busy ||
                !data.references.some(
                  (r) =>
                    r.guardianId &&
                    data.guardians.find((g) => g.id === r.guardianId)?.enabled,
                )
              }
              onClick={() => setTesting(true)}
            >
              <Camera size={18} />
              Test the Looking Lens
            </button>
          </div>
          <div className="reference-guide panel">
            {chosen && <GuardianArt kind={chosen.art} />}
            <div>
              <h3>{chosen?.name ?? "The ordinary room"}</h3>
              <p>
                {chosen
                  ? "Centre the whole guardian inside the middle square of the photo, with a little space around it. Add its front, both sides, and a few views in dim light. Photos of this exact object work better than illustrations."
                  : "Add an empty shelf, nearby decoration or ordinary room object. These teach the lens when to say ‘not a guardian’."}
              </p>
              <p className="small muted">
                {photos.length} of {MAX_REFERENCES} reference views
                {photos.length > 0 && photos.length < 3
                  ? " · add more angles for a useful test"
                  : ""}
              </p>
              {chosen && (
                <label className="reference-enabled">
                  <input
                    type="checkbox"
                    checked={chosen.enabled}
                    disabled={busy}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setBusy(true);
                      void api<HostVision>("/admin/vision/guardian", "POST", {
                        guardianId: chosen.id,
                        enabled,
                      })
                        .then(setData)
                        .catch((e) => setError(e.message))
                        .finally(() => setBusy(false));
                    }}
                  />
                  Use this guardian in rehearsal recognition
                </label>
              )}
            </div>
          </div>
          <label>
            VIEW / LIGHTING NOTE · OPTIONAL
            <input
              value={note}
              maxLength={100}
              disabled={busy}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. front and sides, purple room light"
            />
          </label>
          {photos.some((p) => p.needsProcessing) && (
            <div className="panel">
              <p>These saved photos need features for the new fast lens.</p>
              <button
                className="btn"
                disabled={busy}
                onClick={() => void refreshFeatures()}
              >
                Refresh saved views
              </button>
            </div>
          )}
          <div className="reference-upload">
            <label className="btn file-button">
              <ImagePlus size={18} />
              {busy ? "Preparing references…" : "Add reference photos"}
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={busy}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  void upload(files);
                }}
              />
            </label>
            <label className="btn secondary file-button">
              <Camera size={18} />
              Take a reference photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                disabled={busy}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  void upload(files);
                }}
              />
            </label>
          </div>
          <div className="reference-grid">
            {photos.map((p) => (
              <article key={p.id}>
                <img
                  src={"/api/admin/vision/references/" + p.id}
                  loading="lazy"
                  decoding="async"
                  alt={(chosen?.name ?? "Background") + " reference"}
                />
                <p>{p.note || "Reference view"}</p>
                {chosen && !p.needsProcessing && (
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => setEditingMotion(p.id)}
                  >
                    {data.motionReferences.includes(p.id)
                      ? "Edit saved movement"
                      : "Set up movement"}
                  </button>
                )}
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => void remove(p.id)}
                  aria-label="Remove reference photo"
                >
                  <Trash2 size={15} />
                  Remove
                </button>
              </article>
            ))}
          </div>
          {!photos.length && (
            <p className="reference-empty">
              No reference photos for this guardian yet.
            </p>
          )}
          <details className="reference-calibration">
            <summary>Calibration and device details</summary>
            <p>
              These are prototype settings, not measured accuracy. Test a
              separate photograph. A higher match threshold rejects more images;
              the gap requires a clearer lead over another guardian or
              background.
            </p>
            <div>
              <label>
                MATCH THRESHOLD
                <input
                  type="number"
                  min="0.3"
                  max="0.99"
                  step="0.01"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                />
              </label>
              <label>
                MINIMUM GAP
                <input
                  type="number"
                  min="0.005"
                  max="0.3"
                  step="0.005"
                  value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))}
                />
              </label>
              <button
                className="btn secondary"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setError("");
                  void api<HostVision>("/admin/vision/settings", "POST", {
                    threshold,
                    margin,
                  })
                    .then((next) => {
                      setData(next);
                      setStatus("Calibration saved.");
                    })
                    .catch((e) => setError(e.message))
                    .finally(() => setBusy(false));
                }}
              >
                Save calibration
              </button>
            </div>
            <p className="small muted">
              The small MobileNet recognizer runs locally on a warmed CPU model.
              MagicTouch outlines try GPU acceleration and fall back to CPU. The
              test view reports the selected backend and timing. Model/runtime
              files are downloaded on first use and cached. A LiDAR scan is not
              required: use normal photos from any phone.
            </p>
          </details>
        </>
      )}
    </section>
  );
}
