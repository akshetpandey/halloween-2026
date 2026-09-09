import { requireHost } from "./host-access";
import { body, fail, hash, hex, json } from "./request";
import { recoveryWords } from "./recovery-words";
import type { RowPlayer } from "./index";

const MINUTE = 60000;
export function recoveryPhrase() {
  const words: string[] = [];
  const limit =
    Math.floor(0x100000000 / recoveryWords.length) * recoveryWords.length;
  while (words.length < 3) {
    const n = crypto.getRandomValues(new Uint32Array(1))[0];
    if (n < limit) words.push(recoveryWords[n % recoveryWords.length]);
  }
  return words.join(" ");
}
export function normalizePhrase(code: string) {
  return code
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, " ");
}
export async function adminApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url),
    path = url.pathname;
  const actor = await requireHost(request, env);
  if (path === "/api/admin/session" && request.method === "GET")
    return json({ ok: true });
  if (path === "/api/admin/guests" && request.method === "GET") {
    const realm =
      url.searchParams.get("realm") === "preview" ? "preview" : "live";
    const search = (url.searchParams.get("q") || "").trim().slice(0, 80);
    const rows = await env.DB.prepare(
      `SELECT p.id,p.name,p.realm,p.created_at,p.photo_key IS NOT NULL AS photo,
      (SELECT COUNT(*) FROM favors f WHERE f.player_id=p.id) AS favors,
      r.expires_at AS recovery_expires_at,r.consumed_at AS recovery_used_at
      FROM players p LEFT JOIN host_recovery r ON r.player_id=p.id
      WHERE p.registered=1 AND p.realm=? AND (instr(lower(p.name),lower(?))>0 OR p.id=?)
      ORDER BY p.name COLLATE NOCASE,p.created_at LIMIT 200`,
    )
      .bind(realm, search, search)
      .all();
    return json(rows.results);
  }
  if (path.startsWith("/api/admin/photo/") && request.method === "GET") {
    const p = await env.DB.prepare(
      "SELECT photo_key FROM players WHERE id=? AND registered=1",
    )
      .bind(path.split("/").at(-1))
      .first<{ photo_key: string | null }>();
    if (!p?.photo_key) fail("Portrait unavailable.", 404);
    const object = await env.PHOTOS.getWithMetadata<{ contentType: string }>(
      p.photo_key,
      "arrayBuffer",
    );
    if (!object.value) fail("Portrait unavailable.", 404);
    return new Response(object.value, {
      headers: { "Content-Type": object.metadata?.contentType || "image/jpeg" },
    });
  }
  if (path === "/api/admin/recovery" && request.method === "POST") {
    const input = await body(request);
    if (typeof input.playerId !== "string") fail("Choose a guest.", 422);
    const p = await env.DB.prepare(
      "SELECT id FROM players WHERE id=? AND registered=1",
    )
      .bind(input.playerId)
      .first<{ id: string }>();
    if (!p) fail("Guest not found.", 404);
    const code = recoveryPhrase(),
      expiresAt = Date.now() + 10 * MINUTE;
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO host_recovery(player_id,code_hash,expires_at) VALUES(?,?,?)
        ON CONFLICT(player_id) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at,consumed_at=NULL,session_hash=NULL`,
      ).bind(p.id, await hash(normalizePhrase(code)), expiresAt),
      env.DB.prepare(
        "INSERT INTO host_audit(actor_hash,action,player_id,created_at) VALUES(?,'issue_recovery',?,?)",
      ).bind(actor, p.id, Date.now()),
    ]);
    return json({ code, expiresAt, playerId: p.id });
  }
  fail("Not found.", 404);
}
export async function redeemHostRecovery(env: Env, code: string) {
  const codeHash = await hash(normalizePhrase(code));
  const found = await env.DB.prepare(
    `SELECT p.* FROM players p JOIN host_recovery r ON r.player_id=p.id
    WHERE r.code_hash=? AND r.consumed_at IS NULL AND r.expires_at>?`,
  )
    .bind(codeHash, Date.now())
    .first<RowPlayer>();
  if (!found || (found.realm === "preview" && env.PREVIEW !== "true"))
    fail(
      "That phrase has expired or was not recognized. Ask the host for a new one.",
      404,
    );
  const token = hex(),
    tokenHash = await hash(token),
    now = Date.now();
  // The winning redemption marks the row with its new session hash. All later
  // statements are conditional on that marker, in one transactional D1 batch.
  const results = await env.DB.batch([
    env.DB.prepare(
      "UPDATE host_recovery SET consumed_at=?,session_hash=? WHERE code_hash=? AND consumed_at IS NULL AND expires_at>?",
    ).bind(now, tokenHash, codeHash, now),
    env.DB.prepare(
      "DELETE FROM sessions WHERE player_id=? AND EXISTS(SELECT 1 FROM host_recovery WHERE code_hash=? AND session_hash=?)",
    ).bind(found.id, codeHash, tokenHash),
    env.DB.prepare(
      "UPDATE players SET recovery_hash=? WHERE id=? AND EXISTS(SELECT 1 FROM host_recovery WHERE code_hash=? AND session_hash=?)",
    ).bind(await hash(hex()), found.id, codeHash, tokenHash),
    env.DB.prepare(
      "INSERT INTO sessions SELECT ?,player_id,? FROM host_recovery WHERE code_hash=? AND session_hash=?",
    ).bind(tokenHash, now + 14 * 86400000, codeHash, tokenHash),
    env.DB.prepare(
      "INSERT INTO host_audit(actor_hash,action,player_id,created_at) SELECT ?,'redeem_recovery',player_id,? FROM host_recovery WHERE code_hash=? AND session_hash=?",
    ).bind(tokenHash, now, codeHash, tokenHash),
  ]);
  if (!results[0].meta.changes)
    fail("That phrase has already been used. Ask the host for a new one.", 409);
  return { player: found, token };
}
