import { body, fail, hash, json } from "./request";
import type { RowPlayer } from "./index";
import { COSTUME_BONUS, costumeWindow, reminderDue } from "../shared/costumes";

export async function costumeAward(env: Env, realm: string) {
  const award = await env.DB.prepare(
    "SELECT p.id,p.name FROM costume_awards a JOIN players p ON p.id=a.winner_id WHERE a.realm=?",
  )
    .bind(realm)
    .first<{ id: string; name: string }>();
  return award ? { ...award, bonus: COSTUME_BONUS } : null;
}
export function validateChoices(
  value: unknown,
  self: string,
): asserts value is string[] {
  if (
    !Array.isArray(value) ||
    value.length > 3 ||
    value.some((x) => typeof x !== "string" || !/^[a-f0-9]{32}$/.test(x)) ||
    new Set(value).size !== value.length ||
    value.includes(self)
  )
    fail("Choose up to three different costumes, other than your own.", 422);
}
export async function costumeApi(request: Request, env: Env, p: RowPlayer) {
  const path = new URL(request.url).pathname;
  if (path === "/api/costumes/reminder" && request.method === "POST") {
    if (!reminderDue(env.OPENS_AT, env.CLOSES_AT, Date.now(), false))
      return json({ acknowledged: false });
    await env.DB.prepare("INSERT OR IGNORE INTO costume_reminders VALUES(?,?)")
      .bind(p.id, Date.now())
      .run();
    return json({ acknowledged: true });
  }
  const award = await costumeAward(env, p.realm);
  const isOpen = costumeWindow(
    env.OPENS_AT,
    env.CLOSES_AT,
    Date.now(),
    p.realm === "preview" && env.PREVIEW === "true",
    !!award,
  );
  if (path === "/api/costumes" && request.method === "GET") {
    const ballot = await env.DB.prepare(
      "SELECT choices,revision FROM costume_ballots WHERE voter_id=?",
    )
      .bind(p.id)
      .first<{ choices: string; revision: number }>();
    const people = (
      await env.DB.prepare(
        "SELECT id,name FROM players WHERE realm=? AND registered=1 AND photo_key IS NOT NULL AND id!=?",
      )
        .bind(p.realm, p.id)
        .all<{ id: string; name: string }>()
    ).results;
    // Stable per-voter shuffle. No totals, popularity order, or other votes leave this API.
    const shuffled = await Promise.all(
      people.map(async (person) => ({
        person,
        key: await hash(p.id + ":costumes:" + person.id),
      })),
    );
    shuffled.sort((a, b) => a.key.localeCompare(b.key));
    return json({
      people: shuffled.map((x) => x.person),
      choices: ballot ? JSON.parse(ballot.choices) : [],
      revision: ballot?.revision || 0,
      open: isOpen,
      closesAt: env.CLOSES_AT,
      award,
    });
  }
  if (path === "/api/costumes" && request.method === "POST") {
    if (!isOpen) fail("The Looking Glass has finished gathering leaves.", 423);
    const input = await body(request);
    validateChoices(input.choices, p.id);
    if (!Number.isSafeInteger(input.revision) || Number(input.revision) < 0)
      fail("Refresh the gallery before saving.", 422);
    const people = (
      await env.DB.prepare(
        "SELECT id FROM players WHERE realm=? AND registered=1 AND photo_key IS NOT NULL AND id!=?",
      )
        .bind(p.realm, p.id)
        .all<{ id: string }>()
    ).results;
    if (input.choices.some((id) => !people.some((x) => x.id === id)))
      fail("Choose costumes from this gathering.", 422);
    const now = Date.now(),
      preview = p.realm === "preview" && env.PREVIEW === "true";
    // One row holds the entire ballot, so concurrent saves cannot exceed three.
    // Recheck the cutoff in SQLite at the write, and use revision to reject stale tabs.
    const result = await env.DB.prepare(
      `INSERT INTO costume_ballots(voter_id,choices,revision,updated_at)
      SELECT ?,?,1,? WHERE NOT EXISTS(SELECT 1 FROM costume_awards WHERE realm=?)
      AND (? OR (CAST(strftime('%s','now') AS INTEGER)*1000>=? AND CAST(strftime('%s','now') AS INTEGER)*1000<?))
      AND (?=0 OR EXISTS(SELECT 1 FROM costume_ballots WHERE voter_id=?))
      ON CONFLICT(voter_id) DO UPDATE SET choices=excluded.choices,revision=costume_ballots.revision+1,updated_at=excluded.updated_at
      WHERE costume_ballots.revision=?`,
    )
      .bind(
        p.id,
        JSON.stringify(input.choices),
        now,
        p.realm,
        preview ? 1 : 0,
        Date.parse(env.OPENS_AT),
        Date.parse(env.CLOSES_AT),
        input.revision,
        p.id,
        input.revision,
      )
      .run();
    if (!result.meta.changes)
      fail(
        "Your ballot changed or voting closed. Reload the gallery to see the saved leaves.",
        409,
      );
    return json({
      choices: input.choices,
      revision: Number(input.revision) + 1,
    });
  }
  fail("Not found.", 404);
}
export async function costumeTally(env: Env, realm: string) {
  const people = (
    await env.DB.prepare(
      `SELECT p.id,p.name,COUNT(v.voter_id) AS leaves FROM players p
    LEFT JOIN (SELECT b.voter_id,j.value AS choice FROM costume_ballots b JOIN players voter ON voter.id=b.voter_id,json_each(b.choices) j WHERE voter.realm=? AND voter.registered=1) v ON v.choice=p.id
    WHERE p.realm=? AND p.registered=1 AND p.photo_key IS NOT NULL GROUP BY p.id ORDER BY leaves DESC,p.name COLLATE NOCASE`,
    )
      .bind(realm, realm)
      .all<{ id: string; name: string; leaves: number }>()
  ).results;
  const voters = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM costume_ballots b JOIN players p ON p.id=b.voter_id WHERE p.realm=? AND json_array_length(b.choices)>0`,
  )
    .bind(realm)
    .first<{ total: number }>();
  return {
    people,
    voters: voters?.total || 0,
    award: await costumeAward(env, realm),
    canPublish: realm === "preview" || Date.now() >= Date.parse(env.CLOSES_AT),
  };
}
export async function costumeAdmin(request: Request, env: Env, actor: string) {
  const url = new URL(request.url),
    realm = url.searchParams.get("realm") === "preview" ? "preview" : "live";
  if (request.method === "GET") return json(await costumeTally(env, realm));
  if (request.method !== "POST") fail("Not found.", 404);
  const input = await body(request),
    tally = await costumeTally(env, realm);
  if (!tally.canPublish)
    fail("Wait until costume voting closes before publishing the award.", 423);
  if (tally.award) fail("The costume award has already been published.", 409);
  if (!tally.people.some((p) => p.id === input.winnerId))
    fail("Choose a registered costume from this gathering.", 422);
  const reason =
    typeof input.reason === "string" ? input.reason.trim().slice(0, 500) : "";
  if (reason.length < 5)
    fail("Add a short host note for the award decision.", 422);
  const publishedAt = Date.now();
  const results = await env.DB.batch([
    env.DB.prepare(
      "INSERT OR IGNORE INTO costume_awards VALUES(?,?,?,?,?)",
    ).bind(realm, input.winnerId, publishedAt, actor, reason),
    env.DB.prepare(
      `INSERT INTO host_audit(actor_hash,action,player_id,created_at) SELECT ?,'publish_costume_award',winner_id,published_at FROM costume_awards WHERE realm=? AND actor_hash=? AND changes()=1`,
    ).bind(actor, realm, actor),
  ]);
  if (!results[0].meta.changes)
    fail("The costume award has already been published.", 409);
  return json(await costumeTally(env, realm));
}
