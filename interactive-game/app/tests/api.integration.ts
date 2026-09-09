import { describe, it, expect, afterAll } from "vitest";
// @ts-expect-error CLI-only JavaScript test helper.
import { cleanupFixtures, wranglerJson } from "../scripts/test-fixtures.mjs";
const fixtureIds = new Set<string>();
afterAll(() => cleanupFixtures([...fixtureIds]), 60000);
import sharp from "sharp";
import { generate, PUZZLE_VERSION } from "../src/worker/puzzles";
import { guardians } from "../src/shared/catalog";
import type { State } from "../src/shared/types";
const base = "http://127.0.0.1:8787";
class Client {
  cookie = "";
  async req(path: string, method = "GET", data?: unknown) {
    const headers: Record<string, string> = {};
    if (this.cookie) headers.Cookie = this.cookie;
    if (method !== "GET") headers["x-court-request"] = "1";
    if (data && !(data instanceof FormData))
      headers["Content-Type"] = "application/json";
    const r = await fetch(base + "/api" + path, {
      method,
      headers,
      body:
        data instanceof FormData
          ? data
          : data
            ? JSON.stringify(data)
            : undefined,
    });
    const c = r.headers.get("set-cookie");
    if (c) this.cookie = c.split(";")[0];
    return r;
  }
  async json(path: string, method = "GET", data?: unknown) {
    const r = await this.req(path, method, data);
    const b = await r.json();
    if (b.player?.id) fixtureIds.add(b.player.id);
    expect(r.status, JSON.stringify(b)).toBeLessThan(400);
    return b as State & { recovery: string };
  }
}
const portrait = () =>
  sharp({
    create: { width: 64, height: 64, channels: 3, background: "#8d9a64" },
  })
    .jpeg()
    .toBuffer();
async function registration(invite?: string) {
  const f = new FormData();
  f.set("name", "Rehearsal visitor");
  f.set("consent", "yes");
  f.set(
    "photo",
    new Blob([await portrait()], { type: "image/jpeg" }),
    "test.jpg",
  );
  if (invite) f.set("invite", invite);
  return f;
}
describe("local Worker integration", () => {
  it("seals real entry and protects mutations and photos", async () => {
    const c = new Client();
    const entrance = await c.json("/state");
    expect(entrance.status).toBe("sealed");
    expect(entrance.partifulUrl).toBe("https://hollow-court.com/r");
    for (const path of ["/r", "/R"]) {
      const redirect = await fetch(base + path + "?next=https://example.com", {
        redirect: "manual",
      });
      expect(redirect.status).toBe(302);
      expect(redirect.headers.get("location")).toBe(
        "https://partiful.com/e/CVuHCtIIuMl4G7JuWo2u",
      );
    }
    expect((await c.req("/session/start", "POST", {})).status).toBe(423);
    expect(
      (await fetch(base + "/api/session/start", { method: "POST" })).status,
    ).toBe(403);
    expect((await c.req("/photo/not-a-person")).status).toBe(401);
  });
  it("all fifteen routes restore their assignment and award exactly once under concurrency", async () => {
    const c = new Client();
    const s = await c.json("/session/start", "POST", {
      preview: true,
      demo: true,
    });
    const codes = (await (await c.req("/debug/guardians")).json()) as {
      id: string;
      code: string;
    }[];
    expect(codes).toHaveLength(15);
    for (const g of guardians) {
      const code = codes.find((x) => x.id === g.id)!.code;
      expect(code).toMatch(/^[a-f0-9]{12}$/);
      const encounter = (await (await c.req("/guardian/" + code)).json()) as {
        puzzle: unknown;
      };
      const repeat = (await (await c.req("/guardian/" + code)).json()) as {
        puzzle: unknown;
      };
      expect(encounter.puzzle).toEqual(repeat.puzzle);
      expect(JSON.stringify(encounter)).not.toContain('"answer":');
      const p = generate(
        g.family,
        `halloween-2026:${s.player!.id}:${g.id}:v${PUZZLE_VERSION}`,
      );
      const answer = p.answer;
      const bad = (await (
        await c.req("/solve/" + code, "POST", { answer: null })
      ).json()) as { correct: boolean };
      expect(bad.correct).toBe(false);
      const results = await Promise.all([
        c.req("/solve/" + code, "POST", { answer }),
        c.req("/solve/" + code, "POST", { answer }),
      ]);
      expect(results.every((r) => r.status === 200)).toBe(true);
    }
    const final = await c.json("/state");
    expect(final.favors).toHaveLength(15);
    expect(final.summons.map((s) => s.milestone)).toEqual([4, 10]);
    expect(final.chapters).toHaveLength(9);
    expect(final.referrals).toBe(0);
    wranglerJson([
      "d1",
      "execute",
      "DB",
      "--local",
      "--json",
      "--command",
      `UPDATE assignments SET version=1,instance='{}' WHERE player_id='${s.player!.id}' AND guardian_id='DEC-01'`,
    ]);
    const upgraded = await (
      await c.req("/guardian/" + codes.find((g) => g.id === "DEC-01")!.code)
    ).json();
    expect(upgraded.puzzle.kind).toBe("memory");
    expect(upgraded.earned).toBe(true);
    expect((await c.json("/state")).favors).toHaveLength(15);
    expect((await c.req("/account", "DELETE")).status).toBe(404);
    expect((await c.json("/state")).favors).toHaveLength(15);
  });
  it("selfie onboarding, cookie continuity, single-use referrals, recovery and private image storage", async () => {
    const host = new Client();
    await host.json("/session/start", "POST", { preview: true, demo: true });
    const hs = await host.json("/debug/progress", "POST", { count: 4 });
    const token = hs.summons[0].token;
    expect(token).toMatch(/^[A-Z2-7]{12}$/);
    expect((await host.json("/state")).summons[0].token).toBe(token);
    const original = wranglerJson([
      "d1",
      "execute",
      "DB",
      "--local",
      "--json",
      "--command",
      `SELECT token FROM summons WHERE inviter_id='${hs.player!.id}' AND milestone=4`,
    ])[0].results[0].token as string;
    expect(original).toMatch(/^[a-f0-9]{32}$/);
    expect(await (await host.req("/invite/" + original)).json()).toEqual(
      await (await host.req("/invite/" + token)).json(),
    );
    const guest = new Client(),
      other = new Client();
    const entry = await guest.json("/session/start", "POST", { preview: true });
    await other.json("/session/start", "POST", { preview: true });
    const bad = new FormData();
    bad.set("name", "No portrait");
    bad.set("consent", "yes");
    expect((await guest.req("/register", "POST", bad)).status).toBe(422);
    const [a, b] = await Promise.all([
      guest.req("/register", "POST", await registration(token)),
      other.req("/register", "POST", await registration(original)),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const winner = a.ok ? guest : other,
      loser = a.ok ? other : guest;
    const ws = await winner.json("/state");
    expect(ws.player!.registered).toBe(1);
    expect(ws.player!.photo).toBe(true);
    expect(ws.favors).toHaveLength(0);
    expect((await host.json("/state")).referrals).toBe(1);
    const photo = await winner.req("/photo/" + ws.player!.id);
    expect(photo.status).toBe(200);
    expect(photo.headers.get("Cache-Control")).toBe("no-store");
    expect((await new Client().req("/photo/" + ws.player!.id)).status).toBe(
      401,
    );
    await winner.json("/register", "POST", await registration(token));
    expect((await host.json("/state")).referrals).toBe(1);
    await loser.json("/register", "POST", await registration());
    if (a.ok) {
      const recovered = new Client();
      const oldCookie = guest.cookie;
      const r = await recovered.json("/session/recover", "POST", {
        code: entry.recovery,
      });
      expect(r.player!.id).toBe(entry.player!.id);
      expect(r.recovery).not.toBe(entry.recovery);
      guest.cookie = oldCookie;
      expect((await guest.json("/state")).player).toBe(null);
      expect(
        (await guest.req("/session/recover", "POST", { code: entry.recovery }))
          .status,
      ).toBe(404);
      expect((await recovered.req("/account", "DELETE")).status).toBe(404);
      expect((await recovered.req("/photo/" + entry.player!.id)).status).toBe(
        200,
      );
    }
    const consumed = (await (await host.req("/invite/" + token)).json()) as {
      used: boolean;
    };
    expect(consumed.used).toBe(true);
    expect((await host.json("/state")).referrals).toBe(1);
    const keys = wranglerJson([
      "kv",
      "key",
      "list",
      "--binding",
      "PHOTOS",
      "--local",
    ]) as { name: string; expiration?: number }[];
    const uploaded = keys.filter((k) => k.name.includes(ws.player!.id));
    expect(uploaded).toHaveLength(1);
    expect(uploaded[0].expiration).toBeUndefined();
    expect(ws).not.toHaveProperty("retentionDays");
  });
  it("costume ballots exclude self, preserve one vote and reject another player submitting it", async () => {
    const clients = [new Client(), new Client(), new Client()];
    const states = [];
    for (const c of clients) {
      await c.json("/session/start", "POST", { preview: true });
      states.push(await c.json("/register", "POST", await registration()));
    }
    await clients[0].json("/debug/progress", "POST", { count: 4 });
    const ballot = (await (
      await clients[0].req("/ballot?guardian=DEC-01")
    ).json()) as { id: string; people: { id: string }[] };
    expect(ballot.people).toHaveLength(2);
    expect(ballot.people.every((p) => p.id !== states[0].player!.id)).toBe(
      true,
    );
    const reject = (await (
      await clients[1].req("/ballot", "POST", {
        id: ballot.id,
        choice: ballot.people[0].id,
      })
    ).json()) as { accepted: boolean };
    expect(reject.accepted).toBe(false);
    const accept = (await (
      await clients[0].req("/ballot", "POST", {
        id: ballot.id,
        choice: ballot.people[0].id,
      })
    ).json()) as { accepted: boolean };
    expect(accept.accepted).toBe(true);
    const again = (await (
      await clients[0].req("/ballot", "POST", {
        id: ballot.id,
        choice: ballot.people[1].id,
      })
    ).json()) as { accepted: boolean };
    expect(again.accepted).toBe(false);
  });
});
