import { expect, it, vi } from "vitest";
import worker from "../src/worker/index";
import { VISION_MODEL } from "../src/shared/vision";

function fixture() {
  const ctx = {} as ExecutionContext;
  const batch = vi.fn();
  const person = {
    id: "fixture",
    name: "Fixture",
    photo_key: null,
    registered: 1,
    realm: "live",
  };
  const env = {
    PREVIEW: "true",
    PREVIEW_HOST: "hollow-court-preview.computer-toolbox.workers.dev",
    CAMERA_DISCOVERY: "true",
    PUBLIC_ORIGIN: "https://hollow-court.com",
    PARTIFUL_URL: "https://partiful.com/e/example",
    OPENS_AT: "2020-10-31T20:00:00-04:00",
    CLOSES_AT: "2099-11-01T02:00:00-05:00",
    DB: {
      batch,
      prepare(sql: string) {
        let values: unknown[] = [];
        const stmt = {
          bind: (...args: unknown[]) => {
            values = args;
            return stmt;
          },
          first: async () => {
            if (sql.includes("JOIN sessions")) return person;
            if (sql.includes("rate_limits")) return { count: 1 };
            if (sql.includes("FROM vision_settings"))
              return { threshold: 0.8, margin: 0.04 };
            if (sql.includes("SELECT g.code"))
              return values[0] === "BUY-02" ? { code: "123abc123abc" } : null;
            return null;
          },
          all: async () => ({
            results: sql.includes("SELECT r.id,r.guardian_id")
              ? [
                  {
                    id: "ref",
                    guardian_id: "BUY-02",
                    vector: JSON.stringify([1, ...Array(1023).fill(0)]),
                    note: "Private reference note",
                    created_at: 1,
                    model_version: VISION_MODEL,
                  },
                ]
              : [],
          }),
        };
        return stmt;
      },
    },
  } as unknown as Env;
  const req = (path: string, signedIn = true, body?: unknown) =>
    worker.fetch(
      new Request("https://hollow-court.com/api" + path, {
        method: body ? "POST" : "GET",
        headers: {
          ...(signedIn ? { Cookie: "court_session=" + "a".repeat(64) } : {}),
          "x-court-request": "1",
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
      env,
      ctx,
    );
  return { env, person, batch, req };
}

it("opens live discovery independently of rehearsal and keeps host originals private", async () => {
  const { req } = fixture();
  expect(await (await req("/state", false)).json()).toMatchObject({
    status: "open",
    cameraAvailable: true,
    previewAvailable: false,
  });
  expect((await req("/debug/guardians")).status).toBe(404);
  expect((await req("/vision/references", false)).status).toBe(401);
  const manifest = await (await req("/vision/references")).json();
  expect(manifest.references).toHaveLength(1);
  expect(Object.keys(manifest).sort()).toEqual([
    "focus",
    "model",
    "references",
    "settings",
  ]);
  expect(JSON.stringify(manifest)).not.toMatch(
    /Private reference note|photo_key|created_at/,
  );
  expect((await req("/admin/vision/references/ref")).status).toBe(401);
});

it("requires registration, respects the live dates, and supports disabling the rollout", async () => {
  const { env, person, req } = fixture();
  person.registered = 0;
  expect((await req("/vision/references")).status).toBe(401);
  person.registered = 1;
  for (const dates of [
    ["2099-10-31T20:00:00-04:00", "2099-11-01T02:00:00-05:00"],
    ["2020-10-31T20:00:00-04:00", "2020-11-01T02:00:00-05:00"],
  ]) {
    [env.OPENS_AT, env.CLOSES_AT] = dates;
    expect((await req("/vision/references")).status).toBe(423);
    expect(
      (
        await req("/vision/encounter", true, {
          guardianId: "BUY-02",
          model: VISION_MODEL,
        })
      ).status,
    ).toBe(423);
    expect(await (await req("/state", false)).json()).toMatchObject({
      cameraAvailable: false,
    });
  }
  env.CAMERA_DISCOVERY = "false";
  expect((await req("/vision/references")).status).toBe(404);
});

it("resolves an enrolled live encounter without granting Favor or trusting arbitrary identities", async () => {
  const { req, batch } = fixture();
  const response = await req("/vision/encounter", true, {
    guardianId: "BUY-02",
    model: VISION_MODEL,
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ code: "123abc123abc" });
  expect(batch).not.toHaveBeenCalled();
  expect(
    (
      await req("/vision/encounter", true, {
        guardianId: "BUY-02",
        model: "stale",
      })
    ).status,
  ).toBe(409);
  expect(
    (
      await req("/vision/encounter", true, {
        guardianId: "unknown",
        model: VISION_MODEL,
      })
    ).status,
  ).toBe(404);
});
