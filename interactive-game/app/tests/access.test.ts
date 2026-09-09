import { it, expect, vi } from "vitest";
import worker from "../src/worker/index";
import { previewEnabled } from "../src/worker/access";
const previewHost = "hollow-court-preview.computer-toolbox.workers.dev";
it("only the configured preview hostname and local HTTP development enable rehearsal", () => {
  for (const url of [
    `https://${previewHost}/`,
    "http://127.0.0.1:8787/",
    "http://localhost:5173/",
  ])
    expect(previewEnabled(url, "true", previewHost)).toBe(true);
  for (const url of [
    "https://hollow-court.com/",
    `https://${previewHost}.example.com/`,
    "https://other.workers.dev/",
    "https://localhost/",
  ])
    expect(previewEnabled(url, "true", previewHost)).toBe(false);
  expect(previewEnabled(`https://${previewHost}/`, "false", previewHost)).toBe(
    false,
  );
});
it("public requests ignore rehearsal cookies, reject debug/start/recovery bypasses and keep the shared env unchanged", async () => {
  const previewPlayer = {
    id: "fixture",
    name: "Test rehearsal",
    registered: 1,
    realm: "preview",
    photo_key: null,
  };
  const batch = vi.fn();
  const env = {
    PREVIEW: "true",
    PREVIEW_HOST: previewHost,
    PUBLIC_ORIGIN: "https://hollow-court.com",
    PARTIFUL_URL: "https://partiful.com/e/example",
    OPENS_AT: "2099-10-31T20:00:00-04:00",
    CLOSES_AT: "2099-11-01T02:00:00-05:00",
    DB: {
      batch,
      prepare: (sql: string) => {
        const stmt = {
          bind: (..._args: unknown[]) => stmt,
          first: async () =>
            sql.includes("rate_limits") ? { count: 1 } : previewPlayer,
          all: async () => ({ results: [] }),
        };
        return stmt;
      },
    },
  } as unknown as Env;
  const ctx = {} as ExecutionContext;
  const req = (host: string, path: string, data?: unknown) =>
    worker.fetch(
      new Request(`https://${host}/api${path}`, {
        method: data ? "POST" : "GET",
        headers: {
          Cookie: "court_session=" + "a".repeat(64),
          "x-court-request": "1",
          "Content-Type": "application/json",
        },
        body: data ? JSON.stringify(data) : undefined,
      }),
      env,
      ctx,
    );
  const [publicResponse, previewResponse] = await Promise.all([
    req("hollow-court.com", "/state"),
    req(previewHost, "/state"),
  ]);
  expect(await publicResponse.json()).toMatchObject({
    player: null,
    status: "sealed",
    previewAvailable: false,
    favors: [],
    chapters: [],
  });
  expect(await previewResponse.json()).toMatchObject({
    player: { id: previewPlayer.id, realm: "preview", registered: 1 },
    status: "open",
    previewAvailable: true,
  });
  expect((await req("hollow-court.com", "/debug/guardians")).status).toBe(404);
  expect(
    (await req("hollow-court.com", "/debug/progress", { count: 4 })).status,
  ).toBe(404);
  expect(
    (
      await req("hollow-court.com", "/session/start", {
        preview: true,
        demo: true,
      })
    ).status,
  ).toBe(423);
  expect(
    (
      await req("hollow-court.com", "/session/recover", {
        code: "b".repeat(32),
      })
    ).status,
  ).toBe(404);
  expect((await req("hollow-court.com", "/invite/EXAMPLE")).status).toBe(423);
  expect(batch).not.toHaveBeenCalled();
  expect(env.PREVIEW).toBe("true");
});
