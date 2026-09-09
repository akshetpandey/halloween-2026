import React, { useEffect, useState } from "react";
import { Copy, Search, Users } from "lucide-react";
import { HostCostumes } from "./HostCostumes";
import { api } from "./api";
type Guest = {
  id: string;
  name: string;
  realm: string;
  photo: number;
  favors: number;
  created_at: number;
  recovery_expires_at: number | null;
  recovery_used_at: number | null;
};
export function HostDashboard({ preview }: { preview: boolean }) {
  const [signedIn, setSignedIn] = useState(false),
    [checking, setChecking] = useState(true);
  const [realm, setRealm] = useState(preview ? "preview" : "live"),
    [search, setSearch] = useState(""),
    [guests, setGuests] = useState<Guest[]>([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [issued, setIssued] = useState<{
    code: string;
    expiresAt: number;
    playerId: string;
    name: string;
  } | null>(null);
  useEffect(() => {
    void api("/admin/session")
      .then(() => setSignedIn(true))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);
  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    const timer = setTimeout(() => {
      void api<Guest[]>(
        `/admin/guests?realm=${realm}&q=${encodeURIComponent(search)}`,
      )
        .then((rows) => {
          if (active) setGuests(rows);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [signedIn, realm, search, issued]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="host-dashboard page-top">
      <span className="eyebrow">FOR THE KEEPER</span>
      <h1>
        The guest <em>book.</em>
      </h1>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {checking ? (
        <p>Opening the guest book…</p>
      ) : !signedIn ? (
        <div className="panel host-login">
          <h2>Host sign-in</h2>
          <p>
            Open the guest book with your approved Cloudflare email sign-in.
          </p>
          <a className="btn" href="https://hollow-court.com/host">
            Sign in with Cloudflare
          </a>
        </div>
      ) : (
        <>
          <div className="host-toolbar">
            <label>
              <Search size={16} /> FIND A GUEST
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or guest ID"
              />
            </label>
            <label>
              GUEST LIST
              <select
                value={realm}
                onChange={(e) => {
                  setRealm(e.target.value);
                  setIssued(null);
                  setGuests([]);
                }}
              >
                <option value="live">Event guests</option>
                <option value="preview">Rehearsal guests</option>
              </select>
            </label>
            <a className="text-button" href="/cdn-cgi/access/logout">
              Sign out as host
            </a>
          </div>
          <HostCostumes key={realm} realm={realm} />
          <p>
            Match the name and portrait with the guest in front of you, then
            create a phrase. Their Favors, trials and Summons stay with them.
          </p>
          {issued && (
            <div className="panel recovery-issued" role="status">
              <span className="eyebrow">RETURN PHRASE FOR {issued.name}</span>
              <h2>{issued.code}</h2>
              <p>
                Have them open <strong>/recover</strong> on{" "}
                {realm === "preview"
                  ? "the Workers preview"
                  : "hollow-court.com"}{" "}
                and enter these three words. One use, valid until{" "}
                {new Date(issued.expiresAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
                .
              </p>
              <button
                className="btn secondary"
                onClick={() =>
                  void run(async () => {
                    await navigator.clipboard.writeText(issued.code);
                    setNotice("Phrase copied.");
                  })
                }
              >
                <Copy size={16} /> Copy phrase
              </button>
              <p className="small muted">
                Shown once here. Create a new phrase if this one is lost; the
                previous one will stop working.
              </p>
            </div>
          )}
          <div className="host-guests">
            {guests.map((g) => (
              <article className="host-guest" key={g.id}>
                {g.photo ? (
                  <img
                    src={"/api/admin/photo/" + g.id}
                    alt={g.name + " costume"}
                  />
                ) : (
                  <div className="host-photo-placeholder">
                    <Users />
                  </div>
                )}
                <div>
                  <h3>{g.name}</h3>
                  <p>
                    {g.favors} Favors ·{" "}
                    {g.realm === "preview" ? "Rehearsal" : "Event"}
                  </p>
                  <small>
                    Guest {g.id.slice(0, 8)} · joined{" "}
                    {new Date(g.created_at).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </small>
                  {g.recovery_used_at ? (
                    <p className="small muted">Last phrase used</p>
                  ) : g.recovery_expires_at &&
                    g.recovery_expires_at > Date.now() ? (
                    <p className="small muted">A return phrase is active</p>
                  ) : null}
                </div>
                <button
                  className="btn secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const r = await api<{
                        code: string;
                        expiresAt: number;
                        playerId: string;
                      }>("/admin/recovery", "POST", { playerId: g.id });
                      setIssued({ ...r, name: g.name });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    })
                  }
                >
                  Create return phrase
                </button>
              </article>
            ))}
          </div>
          {!guests.length && (
            <p className="muted">No registered guests in this list yet.</p>
          )}
        </>
      )}
    </section>
  );
}
