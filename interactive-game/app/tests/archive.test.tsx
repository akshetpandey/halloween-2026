import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import worker from "../src/worker/index";
import { replayAssignment } from "../src/worker/archive";
import { rankFinalStandings } from "../src/shared/archive";
import { guardians } from "../src/shared/catalog";
import { FinalResults, GuardianGallery } from "../src/client/Archive";
const origin = "https://hollow-court.com";
const ctx = {} as ExecutionContext;
function fixture() {
  const prepare = vi.fn(() => {
    throw Error("Replay must not access the database");
  });
  return {
    prepare,
    env: {
      ARCHIVE_MODE: "true",
      DB: { prepare },
      PREVIEW: "true",
      PREVIEW_HOST: "preview.example",
      ASSETS: { fetch: vi.fn() },
    } as unknown as Env,
  };
}
const request = (path: string, method = "GET", body?: unknown) =>
  new Request(origin + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: "court_session=" + "f".repeat(64),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
it("keeps equal final scores tied without inventing a costume award", () => {
  const standings = rankFinalStandings([
    { name: "Third", favors: 15, referrals: 0, costumeBonus: 0 },
    { name: "First", favors: 15, referrals: 1, costumeBonus: 0 },
    { name: "Also first", favors: 15, referrals: 1, costumeBonus: 0 },
  ]);
  expect(standings.map((p) => [p.name, p.rank, p.total])).toEqual([
    ["First", 1, 16],
    ["Also first", 1, 16],
    ["Third", 3, 15],
  ]);
  const markup = renderToStaticMarkup(
    <FinalResults
      results={{
        standings,
        closedAt: "2026-11-01",
        costumeAward: null,
        guests: 3,
        favors: 45,
        guardians: 15,
      }}
    />,
  );
  expect(markup).toContain("SHARED FIRST PLACE");
  expect(markup).not.toContain("Looking Glass costume award");
  expect(markup).not.toContain("/api/photo/");
});
it("shows a published costume award and escapes display names", () => {
  const markup = renderToStaticMarkup(
    <FinalResults
      results={{
        standings: [],
        closedAt: "2026-11-01",
        costumeAward: { name: "<guest>", bonus: 3 },
        guests: 0,
        favors: 0,
        guardians: 15,
      }}
    />,
  );
  expect(markup).toContain("&lt;guest&gt;");
  expect(markup).toContain("(+3)");
});
it("makes every guardian and puzzle reachable without discovery or login", () => {
  const markup = renderToStaticMarkup(<GuardianGallery />);
  for (const g of guardians)
    expect(markup).toContain(`href="/guardians/${g.id}"`);
  expect(markup).not.toContain("/join");
});
it("public mode detection does not read a login cookie or storage", async () => {
  const { env, prepare } = fixture();
  const response = await worker.fetch(request("/api/mode"), env, ctx);
  expect(await response.json()).toEqual({ archive: true });
  expect(prepare).not.toHaveBeenCalled();
});
for (const g of guardians)
  it(`${g.id}: anonymous replay creates, checks and retries without cookies, sessions, points or writes`, async () => {
    const { env, prepare } = fixture();
    const started = await worker.fetch(
      request(`/api/archive/puzzle/${g.id}?seed=repeatable-test`),
      env,
      ctx,
    );
    expect(started.status).toBe(200);
    expect(started.headers.has("set-cookie")).toBe(false);
    const trial = (await started.json()) as {
      seed: string;
      puzzle: unknown;
      answer?: unknown;
    };
    expect(trial.answer).toBeUndefined();
    const generated = replayAssignment(g.id, trial.seed);
    expect(trial.puzzle).toEqual(generated.view);
    for (const answer of [null, generated.answer, generated.answer]) {
      const response = await worker.fetch(
        request(`/api/archive/puzzle/${g.id}`, "POST", {
          seed: trial.seed,
          answer,
        }),
        env,
        ctx,
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ correct: answer !== null });
      expect(response.headers.has("set-cookie")).toBe(false);
    }
    expect(prepare).not.toHaveBeenCalled();
  });
it("rejects malformed/unknown puzzles and disables legacy scoring before storage writes", async () => {
  const { env, prepare } = fixture();
  for (const path of [
    "/api/solve",
    "/api/session/start",
    "/api/register",
    "/api/costumes",
    "/api/session/recover",
  ]) {
    expect(
      (await worker.fetch(request(path, "POST", {}), env, ctx)).status,
    ).toBe(410);
  }
  expect(
    (
      await worker.fetch(
        request("/api/archive/puzzle/DEC-01?seed=" + "a".repeat(81)),
        env,
        ctx,
      )
    ).status,
  ).toBe(422);
  expect(
    (await worker.fetch(request("/api/archive/puzzle/DEC-99"), env, ctx))
      .status,
  ).toBe(404);
  expect(
    (
      await worker.fetch(
        request("/api/archive/puzzle/DEC-01", "POST", {
          seed: "safe",
          answer: { bad: true },
        }),
        env,
        ctx,
      )
    ).status,
  ).toBe(200);
  expect(prepare).not.toHaveBeenCalled();
  expect(
    (
      await worker.fetch(
        request("/api/archive/puzzle/DEC-01"),
        { ...env, ARCHIVE_MODE: "false" },
        ctx,
      )
    ).status,
  ).toBe(404);
});
it("publishes only live display names and final scores, never identities, photos or private votes", async () => {
  const { env } = fixture();
  const queries: string[] = [];
  env.DB = {
    prepare: (sql: string) => {
      queries.push(sql);
      return {
        all: async () => ({
          results: [
            { name: "Guest", favors: 3, referrals: 1, costumeBonus: 0 },
          ],
        }),
        first: async () => null,
      };
    },
  } as unknown as D1Database;
  const response = await worker.fetch(
    request("/api/archive/results"),
    env,
    ctx,
  );
  const result = await response.json();
  expect(response.status).toBe(200);
  expect(result).toMatchObject({
    guests: 1,
    favors: 3,
    costumeAward: null,
    standings: [{ name: "Guest", rank: 1, total: 4 }],
  });
  expect(queries.every((q) => q.includes("'live'"))).toBe(true);
  expect(JSON.stringify(result)).not.toMatch(
    /photo_key|recovery|token|player_id|created_at/,
  );
  expect(queries.every((q) => /^\s*SELECT/.test(q))).toBe(true);
});
