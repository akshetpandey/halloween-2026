// Opt-in smoke test for this rehearsal deployment only. Creates synthetic accounts and removes them.
import assert from "node:assert/strict";
import sharp from "sharp";
const origin = "https://hollow-court-preview.computer-toolbox.workers.dev";
const state = await (await fetch(origin + "/api/state")).json();
assert.equal(
  state.previewAvailable,
  true,
  "Refuse to create test players outside rehearsal",
);
assert.equal(state.partifulUrl, "https://partiful.com/e/CVuHCtIIuMl4G7JuWo2u");
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
  assert(r.ok, JSON.stringify(b));
  return b;
}
try {
  await json(0, "/session/start", "POST", { preview: true, demo: true });
  const codes = await json(0, "/debug/guardians");
  assert.equal(codes.length, 15);
  assert(codes.every((c) => /^[a-f0-9]{12}$/.test(c.code)));
  const owl = codes.find((c) => c.id === "BUY-02");
  const page = await json(0, "/guardian/" + owl.code);
  const puzzle = page.puzzle;
  const answer = puzzle.options.findIndex(
    (mark) =>
      puzzle.text.filter((t) => {
        const m = t.match(/is (not )?(.+)\.”/);
        return m[1] ? mark !== m[2] : mark === m[2];
      }).length === 1,
  );
  assert(answer >= 0);
  const award = await json(0, "/solve/" + owl.code, "POST", { answer });
  assert.equal(award.correct, true);
  assert.equal(award.state.favors.length, 1);
  const again = await json(0, "/solve/" + owl.code, "POST", { answer });
  assert.equal(again.newFavor, false);
  const host = await json(0, "/debug/progress", "POST", { count: 4 });
  const token = host.summons[0].token;
  const guest = await json(1, "/session/start", "POST", { preview: true });
  const photo = await sharp({
    create: { width: 80, height: 80, channels: 3, background: "#819366" },
  })
    .jpeg()
    .toBuffer();
  const form = new FormData();
  form.set("name", "Deployment check · synthetic");
  form.set("consent", "yes");
  form.set("invite", token);
  form.set("photo", new Blob([photo], { type: "image/jpeg" }), "synthetic.jpg");
  const registered = await json(1, "/register", "POST", form);
  assert.equal(registered.player.registered, 1);
  assert.equal((await json(0, "/state")).referrals, 1);
  const portrait = await req(1, "/photo/" + guest.player.id);
  assert.equal(portrait.status, 200);
  assert(portrait.headers.get("content-type").startsWith("image/jpeg"));
  assert((await portrait.arrayBuffer()).byteLength > 20);
  const anonymousPhoto = await fetch(origin + "/api/photo/" + guest.player.id);
  assert.equal(anonymousPhoto.status, 401);
  console.log(
    "PASS: hosted HTML/security headers; sealed state/Partiful URL; secure session; fifteen short routes; valid solve/deduplication; Summons redemption; private KV portrait upload/read.",
  );
} finally {
  for (let i = 0; i < cookies.length; i++)
    if (cookies[i]) {
      const r = await req(i, "/account", "DELETE");
      assert.equal(r.status, 200);
    }
  console.log("Removed the synthetic smoke-test accounts and portraits.");
}
