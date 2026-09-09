/// <reference path="../../worker-configuration.d.ts" />
import { guardians } from "../shared/catalog";
import { chapters } from "./story";
import { generate, validate } from "./puzzles";
import type { Assignment } from "../shared/types";
type RowPlayer = {
  id: string;
  name: string;
  photo_key: string | null;
  realm: "live" | "preview";
  registered: number;
};
const DAY = 86400000;
const hex = (n = 32) =>
  Array.from(crypto.getRandomValues(new Uint8Array(n)), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
async function hash(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
function fail(message: string, status = 400): never {
  throw new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}
export function phase(opens: string, closes: string, now = Date.now()) {
  return now < Date.parse(opens)
    ? "sealed"
    : now >= Date.parse(closes)
      ? "closed"
      : "open";
}
function cookie(token: string, request: Request, maxAge = 60 * 60 * 24 * 14) {
  return `court_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
async function player(request: Request, env: Env) {
  const token = request.headers
    .get("Cookie")
    ?.match(/(?:^|;\s*)court_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (!token) return null;
  return env.DB.prepare(
    "SELECT p.* FROM players p JOIN sessions s ON p.id=s.player_id WHERE s.token_hash=? AND s.expires_at>?",
  )
    .bind(await hash(token), Date.now())
    .first<RowPlayer>();
}
function open(env: Env, p: RowPlayer | null) {
  if (p?.realm === "preview" && env.PREVIEW === "true") return;
  if (phase(env.OPENS_AT, env.CLOSES_AT) !== "open")
    fail("The Court is sealed. Return when it opens.", 423);
}
function requirePlayer(p: RowPlayer | null): asserts p is RowPlayer {
  if (!p) fail("Enter the Court to continue.", 401);
}
function registered(p: RowPlayer | null): asserts p is RowPlayer {
  requirePlayer(p);
  if (!p.registered) fail("Leave your name and guise first.", 401);
}
async function readBody(request: Request, limit: number) {
  if (Number(request.headers.get("content-length")) > limit)
    fail("That file is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      fail("That file is too large.", 413);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}
async function body(request: Request): Promise<Record<string, unknown>> {
  try {
    const result: unknown = JSON.parse(
      new TextDecoder().decode(await readBody(request, 16000)),
    );
    if (!result || typeof result !== "object" || Array.isArray(result))
      fail("Expected an object.");
    return result as Record<string, unknown>;
  } catch (e) {
    if (e instanceof Response) throw e;
    fail("The request could not be read.");
  }
}
async function state(env: Env, p: RowPlayer | null) {
  const favors = p
    ? (
        await env.DB.prepare(
          "SELECT guardian_id FROM favors WHERE player_id=? ORDER BY earned_at",
        )
          .bind(p.id)
          .all<{ guardian_id: string }>()
      ).results.map((f) => f.guardian_id)
    : [];
  const invites = p
    ? (
        await env.DB.prepare(
          "SELECT token,milestone,redeemed_at FROM summons WHERE inviter_id=? ORDER BY milestone",
        )
          .bind(p.id)
          .all<{
            token: string;
            milestone: number;
            redeemed_at: number | null;
          }>()
      ).results
    : [];
  return {
    player: p
      ? {
          id: p.id,
          name: p.name,
          realm: p.realm,
          registered: p.registered,
          photo: !!p.photo_key,
        }
      : null,
    status:
      p?.realm === "preview" && env.PREVIEW === "true"
        ? "open"
        : phase(env.OPENS_AT, env.CLOSES_AT),
    previewAvailable: env.PREVIEW === "true",
    partifulUrl: env.PARTIFUL_URL,
    opensAt: env.OPENS_AT,
    closesAt: env.CLOSES_AT,
    favors,
    summons: invites.map((s) => ({
      token: s.token,
      milestone: s.milestone,
      redeemed: !!s.redeemed_at,
    })),
    referrals: invites.filter((s) => s.redeemed_at).length,
    chapters: p?.registered
      ? chapters.filter((c) => c.at <= favors.length)
      : [],
  };
}
async function session(env: Env, id: string) {
  const token = hex();
  await env.DB.prepare("INSERT INTO sessions VALUES(?,?,?)")
    .bind(await hash(token), id, Date.now() + 14 * DAY)
    .run();
  return token;
}
async function rate(request: Request, env: Env, path: string) {
  const window = Math.floor(Date.now() / 60000),
    ip = request.headers.get("CF-Connecting-IP") || "local";
  const key = await hash(
    `${ip}:${window}:${path.includes("recover") ? "recover" : "write"}`,
  );
  const r = await env.DB.prepare(
    "INSERT INTO rate_limits(key,count,resets_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
  )
    .bind(key, Date.now() + 2 * 60000)
    .first<{ count: number }>();
  if (r!.count > (path.includes("recover") ? 12 : 180))
    fail("The Court needs a moment. Please try again shortly.", 429);
}
async function api(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url),
    path = url.pathname;
  const p = await player(request, env);
  if (request.method !== "GET") {
    if (request.headers.get("x-court-request") !== "1")
      fail("This request must come from the Court.", 403);
    const origin = request.headers.get("origin");
    if (origin && origin !== url.origin)
      fail("This request must come from the Court.", 403);
    await rate(request, env, path);
  }
  if (path === "/api/state" && request.method === "GET")
    return json(await state(env, p));
  if (path === "/api/session/start" && request.method === "POST") {
    const b = await body(request);
    const preview = b.preview === true && env.PREVIEW === "true";
    if (!preview) open(env, null);
    if (p && p.realm === (preview ? "preview" : "live")) {
      if (preview && b.demo === true && !p.registered) {
        await env.DB.prepare(
          "UPDATE players SET name='Wandering Guest',registered=1 WHERE id=? AND registered=0",
        )
          .bind(p.id)
          .run();
        return json(
          await state(env, { ...p, name: "Wandering Guest", registered: 1 }),
        );
      }
      return json(await state(env, p));
    }
    const id = hex(16),
      recovery = hex(16);
    const demo = preview && b.demo === true;
    await env.DB.prepare(
      "INSERT INTO players(id,name,realm,recovery_hash,registered,created_at) VALUES(?,?,?,?,?,?)",
    )
      .bind(
        id,
        demo ? "Wandering Guest" : "",
        preview ? "preview" : "live",
        await hash(recovery),
        demo ? 1 : 0,
        Date.now(),
      )
      .run();
    const token = await session(env, id);
    const created = await env.DB.prepare("SELECT * FROM players WHERE id=?")
      .bind(id)
      .first<RowPlayer>();
    return json({ ...(await state(env, created)), recovery }, 201, {
      "Set-Cookie": cookie(token, request),
    });
  }
  if (path === "/api/session/logout" && request.method === "POST") {
    const token = request.headers
      .get("Cookie")
      ?.match(/court_session=([a-f0-9]{64})/)?.[1];
    if (token)
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
        .bind(await hash(token))
        .run();
    return json({ ok: true }, 200, { "Set-Cookie": cookie("", request, 0) });
  }
  if (path === "/api/session/recover" && request.method === "POST") {
    const b = await body(request);
    if (
      typeof b.code !== "string" ||
      !/^([a-f0-9]{4}[ -]?){8}$/i.test(b.code.trim())
    )
      fail("Enter your 32-character recovery key.", 422);
    const key = b.code.replace(/[ -]/g, "").toLowerCase();
    const found = await env.DB.prepare(
      "SELECT * FROM players WHERE recovery_hash=?",
    )
      .bind(await hash(key))
      .first<RowPlayer>();
    if (!found) fail("That recovery key was not recognized.", 404);
    const recovery = hex(16),
      token = hex();
    await env.DB.batch([
      env.DB.prepare("DELETE FROM sessions WHERE player_id=?").bind(found.id),
      env.DB.prepare("UPDATE players SET recovery_hash=? WHERE id=?").bind(
        await hash(recovery),
        found.id,
      ),
      env.DB.prepare("INSERT INTO sessions VALUES(?,?,?)").bind(
        await hash(token),
        found.id,
        Date.now() + 14 * DAY,
      ),
    ]);
    return json({ ...(await state(env, found)), recovery }, 200, {
      "Set-Cookie": cookie(token, request),
    });
  }
  if (path === "/api/register" && request.method === "POST") {
    requirePlayer(p);
    open(env, p);
    if (p.registered) return json(await state(env, p));
    const raw = await readBody(request, 3 * 1024 * 1024);
    const form = await new Response(raw, {
      headers: { "Content-Type": request.headers.get("Content-Type") || "" },
    }).formData();
    const name = String(form.get("name") || "").trim(),
      consent = form.get("consent") === "yes",
      photo = form.get("photo"),
      invite = String(form.get("invite") || "");
    if (name.length < 1 || name.length > 40 || /[\u0000-\u001f<>]/.test(name))
      fail("Use a name between 1 and 40 characters.", 422);
    if (!consent)
      fail("Please agree to share your portrait within this Court.", 422);
    if (
      !(photo instanceof File) ||
      photo.size < 20 ||
      photo.size > 2 * 1024 * 1024
    )
      fail("Choose a portrait up to 2 MB.", 422);
    const bytes = new Uint8Array(await photo.arrayBuffer());
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
      png =
        bytes[0] === 137 &&
        bytes[1] === 80 &&
        bytes[2] === 78 &&
        bytes[3] === 71,
      webp =
        new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
        new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
    if (!jpeg && !png && !webp)
      fail(
        "Use a JPEG, PNG or WebP portrait. Your phone can convert it on upload.",
        422,
      );
    const contentType = jpeg ? "image/jpeg" : png ? "image/png" : "image/webp";
    const photoKey = `${p.realm}/${p.id}/${hex(12)}`;
    await env.PHOTOS.put(photoKey, bytes, {
      metadata: { contentType },
    });
    const queries = [
      env.DB.prepare(
        `UPDATE players SET name=?,photo_key=?,registered=1 WHERE id=? AND registered=0 ${invite ? "AND EXISTS (SELECT 1 FROM summons s JOIN players host ON host.id=s.inviter_id WHERE s.token=? AND s.redeemed_at IS NULL AND s.inviter_id!=? AND host.realm=?)" : ""}`,
      ).bind(name, photoKey, p.id, ...(invite ? [invite, p.id, p.realm] : [])),
    ];
    if (invite)
      queries.push(
        env.DB.prepare(
          "UPDATE summons SET redeemed_by=?,redeemed_at=? WHERE token=? AND redeemed_at IS NULL AND inviter_id!=? AND EXISTS(SELECT 1 FROM players WHERE id=? AND photo_key=? AND registered=1)",
        ).bind(p.id, Date.now(), invite, p.id, p.id, photoKey),
      );
    let results;
    try {
      results = await env.DB.batch(queries);
    } catch {
      await env.PHOTOS.delete(photoKey);
      fail(
        "Registration could not finish. Your invitation may have just been used. Try again.",
        409,
      );
    }
    if (!results[0].meta.changes) {
      await env.PHOTOS.delete(photoKey);
      fail(
        "That invitation has already been used. You can still join without it.",
        409,
      );
    }
    return json(
      await state(
        env,
        await env.DB.prepare("SELECT * FROM players WHERE id=?")
          .bind(p.id)
          .first<RowPlayer>(),
      ),
    );
  }
  if (path.startsWith("/api/invite/") && request.method === "GET") {
    const token = path.split("/").at(-1)!;
    const invite = await env.DB.prepare(
      "SELECT s.milestone,s.redeemed_at,p.name,p.realm FROM summons s JOIN players p ON p.id=s.inviter_id WHERE s.token=?",
    )
      .bind(token)
      .first<{
        milestone: number;
        redeemed_at: number | null;
        name: string;
        realm: string;
      }>();
    if (!invite) fail("This invitation could not be found.", 404);
    return json({
      milestone: invite.milestone,
      used: !!invite.redeemed_at,
      inviter: invite.name,
      preview: invite.realm === "preview",
    });
  }
  if (path === "/api/debug/progress" && request.method === "POST") {
    if (env.PREVIEW !== "true" || p?.realm !== "preview")
      fail("Not found.", 404);
    registered(p);
    const b = await body(request);
    if (![4, 10, 15].includes(Number(b.count)))
      fail("Choose a rehearsal milestone.");
    await env.DB.batch(
      guardians
        .slice(0, Number(b.count))
        .map((g) =>
          env.DB.prepare("INSERT OR IGNORE INTO favors VALUES(?,?,?)").bind(
            p.id,
            g.id,
            Date.now(),
          ),
        ),
    );
    await env.DB.batch(
      [4, 10].map((n) =>
        env.DB.prepare(
          "INSERT OR IGNORE INTO summons(token,inviter_id,milestone) SELECT ?,?,? WHERE (SELECT COUNT(*) FROM favors WHERE player_id=?)>=?",
        ).bind(hex(16), p.id, n, p.id, n),
      ),
    );
    return json(await state(env, p));
  }
  if (path === "/api/debug/guardians" && request.method === "GET") {
    if (env.PREVIEW !== "true") fail("Not found.", 404);
    return json(
      (await env.DB.prepare("SELECT id,code FROM guardians ORDER BY id").all())
        .results,
    );
  }
  if (path.startsWith("/api/guardian/") && request.method === "GET") {
    open(env, p);
    registered(p);
    const code = path.split("/").at(-1)!;
    const row = await env.DB.prepare("SELECT id FROM guardians WHERE code=?")
      .bind(code)
      .first<{ id: string }>();
    if (!row) fail("This path leads beyond the wood.", 404);
    const g = guardians.find((g) => g.id === row.id)!; // The stable player ID is server issued; answers never leave this module.
    const generated = generate(g.family, `${env.EVENT_ID}:${p.id}:${g.id}:v1`);
    await env.DB.prepare("INSERT OR IGNORE INTO assignments VALUES(?,?,?,?)")
      .bind(p.id, g.id, generated.version, JSON.stringify(generated))
      .run();
    const record = await env.DB.prepare(
      "SELECT instance FROM assignments WHERE player_id=? AND guardian_id=?",
    )
      .bind(p.id, g.id)
      .first<{ instance: string }>();
    const a: Assignment = JSON.parse(record!.instance);
    const earned = !!(await env.DB.prepare(
      "SELECT 1 FROM favors WHERE player_id=? AND guardian_id=?",
    )
      .bind(p.id, g.id)
      .first());
    return json({ guardian: g, puzzle: a.view, earned });
  }
  if (path.startsWith("/api/solve/") && request.method === "POST") {
    open(env, p);
    registered(p);
    const code = path.split("/").at(-1)!;
    const row = await env.DB.prepare("SELECT id FROM guardians WHERE code=?")
      .bind(code)
      .first<{ id: string }>();
    if (!row) fail("Unknown guardian.", 404);
    const record = await env.DB.prepare(
      "SELECT instance FROM assignments WHERE player_id=? AND guardian_id=?",
    )
      .bind(p.id, row.id)
      .first<{ instance: string }>();
    if (!record) fail("Meet the guardian before answering.", 409);
    const input = await body(request);
    if (!validate(JSON.parse(record.instance), input.answer))
      return json({ correct: false });
    const award = await env.DB.prepare(
      "INSERT OR IGNORE INTO favors VALUES(?,?,?)",
    )
      .bind(p.id, row.id, Date.now())
      .run();
    await env.DB.batch(
      [4, 10].map((n) =>
        env.DB.prepare(
          "INSERT OR IGNORE INTO summons(token,inviter_id,milestone) SELECT ?,?,? WHERE (SELECT COUNT(*) FROM favors WHERE player_id=?)>=?",
        ).bind(hex(16), p.id, n, p.id, n),
      ),
    );
    return json({
      correct: true,
      newFavor: !!award.meta.changes,
      state: await state(env, p),
    });
  }
  if (path === "/api/standing" && request.method === "GET") {
    registered(p);
    const rows = (
      await env.DB.prepare(
        `SELECT p.id,p.name,(p.photo_key IS NOT NULL) AS photo, (SELECT COUNT(*) FROM favors f WHERE f.player_id=p.id) AS favors,(SELECT COUNT(*) FROM summons s WHERE s.inviter_id=p.id AND s.redeemed_at IS NOT NULL) AS referrals FROM players p WHERE p.registered=1 AND p.realm=? ORDER BY favors+referrals DESC,p.created_at ASC LIMIT 100`,
      )
        .bind(p.realm)
        .all<{
          id: string;
          name: string;
          photo: number;
          favors: number;
          referrals: number;
        }>()
    ).results;
    return json(rows);
  }
  if (path === "/api/ballot" && request.method === "GET") {
    registered(p);
    const favor = url.searchParams.get("guardian");
    if (
      !favor ||
      !(await env.DB.prepare(
        "SELECT 1 FROM favors WHERE player_id=? AND guardian_id=?",
      )
        .bind(p.id, favor)
        .first())
    )
      return json(null);
    let ballot = await env.DB.prepare(
      "SELECT * FROM ballots WHERE voter_id=? AND guardian_id=?",
    )
      .bind(p.id, favor)
      .first<{ id: string; a: string; b: string; choice: string | null }>();
    if (!ballot) {
      const candidates = (
        await env.DB.prepare(
          `SELECT p.id FROM players p WHERE p.realm=? AND p.registered=1 AND p.id!=? AND p.photo_key IS NOT NULL ORDER BY (SELECT COUNT(*) FROM ballots b WHERE b.a=p.id OR b.b=p.id), RANDOM() LIMIT 2`,
        )
          .bind(p.realm, p.id)
          .all<{ id: string }>()
      ).results;
      if (candidates.length < 2) return json(null);
      await env.DB.prepare(
        "INSERT OR IGNORE INTO ballots VALUES(?,?,?,?,?,NULL,?)",
      )
        .bind(
          hex(16),
          p.id,
          favor,
          candidates[0].id,
          candidates[1].id,
          Date.now(),
        )
        .run();
      ballot = await env.DB.prepare(
        "SELECT * FROM ballots WHERE voter_id=? AND guardian_id=?",
      )
        .bind(p.id, favor)
        .first();
    }
    if (!ballot || ballot.choice) return json(null);
    const people = (
      await env.DB.prepare("SELECT id,name FROM players WHERE id IN (?,?)")
        .bind(ballot.a, ballot.b)
        .all()
    ).results;
    return json({ id: ballot.id, people });
  }
  if (path === "/api/ballot" && request.method === "POST") {
    registered(p);
    open(env, p);
    const b = await body(request);
    if (typeof b.id !== "string" || typeof b.choice !== "string")
      fail("Choose one apparition.");
    const r = await env.DB.prepare(
      "UPDATE ballots SET choice=? WHERE id=? AND voter_id=? AND choice IS NULL AND (a=? OR b=?)",
    )
      .bind(b.choice, b.id, p.id, b.choice, b.choice)
      .run();
    return json({ accepted: !!r.meta.changes });
  }
  if (path.startsWith("/api/photo/") && request.method === "GET") {
    registered(p);
    const id = path.split("/").at(-1)!;
    const owner = await env.DB.prepare(
      "SELECT photo_key FROM players WHERE id=? AND realm=? AND registered=1",
    )
      .bind(id, p.realm)
      .first<{ photo_key: string | null }>();
    if (!owner?.photo_key) fail("Portrait unavailable.", 404);
    const object = await env.PHOTOS.getWithMetadata<{ contentType: string }>(
      owner.photo_key,
      "arrayBuffer",
    );
    if (!object.value) fail("Portrait unavailable.", 404);
    return new Response(object.value, {
      headers: {
        "Content-Type": object.metadata?.contentType || "image/jpeg",
        "Cache-Control": "private, no-store",
      },
    });
  }
  fail("This path leads beyond the wood.", 404);
}
export default {
  async fetch(request, env, ctx) {
    try {
      const response = new URL(request.url).pathname.startsWith("/api/")
        ? await api(request, env)
        : await env.ASSETS.fetch(request);
      const secured = new Response(response.body, response);
      secured.headers.set("X-Content-Type-Options", "nosniff");
      secured.headers.set("Referrer-Policy", "same-origin");
      secured.headers.set("X-Robots-Tag", "noindex, nofollow");
      if (new URL(request.url).pathname.startsWith("/api/"))
        secured.headers.set("Cache-Control", "no-store");
      secured.headers.set(
        "Content-Security-Policy",
        "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      );
      return secured;
    } catch (e) {
      if (e instanceof Response) {
        e.headers.set("Cache-Control", "no-store");
        return e;
      }
      console.error(
        JSON.stringify({
          event: "request_failed",
          method: request.method,
          error: e instanceof Error ? e.name : "unknown",
        }),
      );
      return json(
        { error: "The wood has gone quiet for a moment. Please try again." },
        500,
      );
    }
  },
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      (async () => {
        await env.DB.batch([
          env.DB.prepare("DELETE FROM sessions WHERE expires_at<?").bind(
            Date.now(),
          ),
          env.DB.prepare("DELETE FROM rate_limits WHERE resets_at<?").bind(
            Date.now(),
          ),
        ]);
      })(),
    );
  },
} satisfies ExportedHandler<Env>;
