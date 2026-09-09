// Opt-in smoke test for this rehearsal deployment only. Creates synthetic accounts and removes them.
import assert from "node:assert/strict";
import sharp from "sharp";
import { cleanupFixtures } from "./test-fixtures.mjs";
const fixtureIds = new Set();
const publicOrigin = "https://hollow-court.com";
const origin = "https://hollow-court-preview.computer-toolbox.workers.dev";
const state = await (await fetch(origin + "/api/state")).json();
assert.equal(
  state.previewAvailable,
  true,
  "Refuse to create test players outside rehearsal",
);
assert.equal(state.partifulUrl, publicOrigin + "/r");
const publicState = await (await fetch(publicOrigin + "/api/state")).json();
assert.equal(publicState.previewAvailable, false);
assert.equal(
  publicState.status,
  Date.now() < Date.parse(publicState.opensAt)
    ? "sealed"
    : Date.now() >= Date.parse(publicState.closesAt)
      ? "closed"
      : "open",
);
assert.equal((await fetch(publicOrigin + "/api/debug/guardians")).status, 404);
for (const path of ["/r", "/R"]) {
  const redirect = await fetch(publicOrigin + path, { redirect: "manual" });
  assert.equal(redirect.status, 302);
  assert.equal(
    redirect.headers.get("location"),
    "https://partiful.com/e/CVuHCtIIuMl4G7JuWo2u",
  );
}
const home = await fetch(origin);
assert.equal(home.status, 200);
assert.match(
  home.headers.get("content-security-policy") || "",
  /frame-ancestors 'none'/,
);
const cookies = [];
async function req(client, path, method = "GET", data) {
  const headers = {};
  if (cookies[client]) headers.Cookie = cookies[client];
  if (method !== "GET") headers["x-court-request"] = "1";
  if (data && !(data instanceof FormData))
    headers["Content-Type"] = "application/json";
  const r = await fetch(origin + "/api" + path, {
    method,
    headers,
    body:
      data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
  });
  if (r.headers.has("set-cookie")) {
    assert.match(r.headers.get("set-cookie"), /HttpOnly/);
    assert.match(r.headers.get("set-cookie"), /Secure/);
    cookies[client] = r.headers.get("set-cookie").split(";")[0];
  }
  return r;
}
async function json(client, path, method = "GET", data) {
  const r = await req(client, path, method, data);
  const b = await r.json();
  if (b.player?.id) fixtureIds.add(b.player.id);
  assert(r.ok, JSON.stringify(b));
  return b;
}
try {
  const rehearsal = await json(0, "/session/start", "POST", {
    preview: true,
    demo: true,
  });
  const copiedCookie = {
    Cookie: cookies[0],
    "x-court-request": "1",
    "Content-Type": "application/json",
  };
  const publicWithCookie = await (
    await fetch(publicOrigin + "/api/state", { headers: copiedCookie })
  ).json();
  assert.equal(publicWithCookie.player, null);
  assert.equal(publicWithCookie.previewAvailable, false);
  assert.equal(
    (
      await fetch(publicOrigin + "/api/debug/progress", {
        method: "POST",
        headers: copiedCookie,
        body: JSON.stringify({ count: 4 }),
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await fetch(publicOrigin + "/api/session/recover", {
        method: "POST",
        headers: copiedCookie,
        body: JSON.stringify({ code: rehearsal.recovery }),
      })
    ).status,
    404,
  );
  if (publicState.status !== "open")
    assert.equal(
      (
        await fetch(publicOrigin + "/api/session/start", {
          method: "POST",
          headers: copiedCookie,
          body: JSON.stringify({ preview: true, demo: true }),
        })
      ).status,
      423,
    );
  const codes = await json(0, "/debug/guardians");
  assert.equal(codes.length, 15);
  assert(codes.every((c) => /^[a-f0-9]{12}$/.test(c.code)));
  const owl = codes.find((c) => c.id === "BUY-02");
  const page = await json(0, "/guardian/" + owl.code);
  const puzzle = page.puzzle;
  const answer = puzzle.optionGroups.findIndex((group) => {
    const x = group.map((mark) => puzzle.witnessMarks.indexOf(mark));
    return (
      puzzle.witnessClues.filter((c) =>
        c.kind === "holds"
          ? x[c.a] === c.b
          : c.kind === "not"
            ? x[c.a] !== c.b
            : c.kind === "left"
              ? x.indexOf(c.a) < x.indexOf(c.b)
              : Math.abs(x.indexOf(c.a) - x.indexOf(c.b)) === 1,
      ).length === 2
    );
  });
  assert(answer >= 0);
  const award = await json(0, "/solve/" + owl.code, "POST", { answer });
  assert.equal(award.correct, true);
  assert.equal(award.state.favors.length, 1);
  const again = await json(0, "/solve/" + owl.code, "POST", { answer });
  assert.equal(again.newFavor, false);
  const host = await json(0, "/debug/progress", "POST", { count: 4 });
  const token = host.summons[0].token;
  assert.match(token, /^[A-Z2-7]{12}$/);
  assert.equal((await fetch(origin + "/S/" + token)).status, 200);
  assert.equal((await json(0, "/invite/" + token)).used, false);
  const guest = await json(1, "/session/start", "POST", { preview: true });
  const photo = await sharp({
    create: { width: 80, height: 80, channels: 3, background: "#819366" },
  })
    .jpeg()
    .toBuffer();
  const form = new FormData();
  form.set("name", "Deployment check · synthetic");
  form.set("invite", token);
  form.set("photo", new Blob([photo], { type: "image/jpeg" }), "synthetic.jpg");
  const registered = await json(1, "/register", "POST", form);
  assert.equal(registered.player.registered, 1);
  assert.equal("retentionDays" in registered, false);
  assert.equal((await req(1, "/account", "DELETE")).status, 404);
  assert.equal((await json(0, "/state")).referrals, 1);
  const portrait = await req(1, "/photo/" + guest.player.id);
  assert.equal(portrait.status, 200);
  assert(portrait.headers.get("content-type").startsWith("image/jpeg"));
  assert((await portrait.arrayBuffer()).byteLength > 20);
  const anonymousPhoto = await fetch(origin + "/api/photo/" + guest.player.id);
  assert.equal(anonymousPhoto.status, 401);
  assert.equal((await fetch(origin + "/api/costumes")).status, 401);
  assert.equal(publicState.costumeReminderAt, "2026-11-01T01:00:00-04:00");
  const gallery = await json(0, "/costumes");
  assert(gallery.people.some((p) => p.id === guest.player.id));
  assert(
    gallery.people.every((p) => Object.keys(p).sort().join() === "id,name"),
  );
  assert.equal("voters" in gallery, false);
  const leaves = await json(0, "/costumes", "POST", {
    choices: [guest.player.id],
    revision: gallery.revision,
  });
  assert.deepEqual(leaves.choices, [guest.player.id]);
  assert.deepEqual((await json(0, "/costumes")).choices, leaves.choices);
  assert.equal(
    (
      await req(0, "/costumes", "POST", {
        choices: [],
        revision: gallery.revision,
      })
    ).status,
    409,
  );
  assert.equal((await req(0, "/ballot")).status, 410);
  const admin = await fetch(publicOrigin + "/api/admin/costumes", {
    redirect: "manual",
  });
  assert.equal(admin.status, 302);
  assert.match(admin.headers.get("location"), /cloudflareaccess\.com/);
  console.log(
    "PASS: hosted HTML/security headers; sealed state/Partiful URL; secure session; fifteen short routes; valid solve/deduplication; Summons redemption; private KV portrait upload/read; costume leaves persistence/privacy/stale revisions; host Access protection; first-1-AM reminder configuration.",
  );
} finally {
  cleanupFixtures([...fixtureIds], "--remote");
  console.log("Removed the synthetic smoke-test accounts and portraits.");
}
