import { expect, it, vi } from "vitest";
import worker from "../src/worker/index";
import { responseHeaders } from "../src/worker/http";

const origin = "https://hollow-court.com";
const ctx = {} as ExecutionContext;
function fixture(
  response: () => Response = () =>
    new Response("<html></html>", {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }),
) {
  const fetch = vi.fn(async () => response());
  const prepare = vi.fn();
  const env = {
    ASSETS: { fetch },
    DB: { prepare },
    PREVIEW: "true",
    PREVIEW_HOST: "hollow-court-preview.computer-toolbox.workers.dev",
    PARTIFUL_URL: "https://partiful.com/e/example",
  } as unknown as Env;
  return { env, fetch, prepare };
}
function secure(response: Response) {
  expect(response.headers.get("Strict-Transport-Security")).toBe(
    "max-age=31536000",
  );
  expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(response.headers.get("X-Frame-Options")).toBe("DENY");
  expect(response.headers.get("Referrer-Policy")).toBe("same-origin");
  expect(response.headers.get("Content-Security-Policy")).toContain(
    "frame-ancestors 'none'",
  );
  expect(response.headers.get("Permissions-Policy")).toContain("camera=(self)");
}

it.each(["GET", "HEAD", "POST"])(
  "upgrades HTTP %s before assets or API side effects, preserving the URL",
  async (method) => {
    const { env, fetch, prepare } = fixture();
    for (const host of ["hollow-court.com", env.PREVIEW_HOST]) {
      const response = await worker.fetch(
        new Request(`http://${host}/api/session/start?next=%2Fg%2Fabc`, {
          method,
          ...(method === "POST" ? { body: "fixture" } : {}),
        }),
        env,
        ctx,
      );
      expect(response.status).toBe(308);
      expect(response.headers.get("Location")).toBe(
        `https://${host}/api/session/start?next=%2Fg%2Fabc`,
      );
      expect(response.headers.get("Strict-Transport-Security")).toBeNull();
      expect(response.headers.get("Cache-Control")).toContain("no-store");
    }
    expect(fetch).not.toHaveBeenCalled();
    expect(prepare).not.toHaveBeenCalled();
  },
);

it.each(["localhost", "127.0.0.1", "[::1]"])(
  "keeps local HTTP development usable on %s",
  async (host) => {
    const { env } = fixture();
    const response = await worker.fetch(
      new Request(`http://${host}:8787/`),
      env,
      ctx,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Strict-Transport-Security")).toBeNull();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  },
);

it.each(["/", "/g/example", "/assets/missing-Abcd1234.js"])(
  "never caches HTML, including SPA fallbacks at %s",
  async (path) => {
    const { env } = fixture();
    const response = await worker.fetch(new Request(origin + path), env, ctx);
    secure(response);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.text()).toBe("<html></html>");
  },
);

it.each([
  ["/assets/index-Abcd1234.js", "text/javascript"],
  ["/assets/index-Abcd_-12.css", "text/css"],
  ["/assets/qr-art-BrfDLJ7R.webp", "image/webp"],
  ["/assets/dm-sans-CW0RaeGs.woff2", "font/woff2"],
])(
  "caches fingerprinted asset %s immutably for GET, HEAD and typed 304 responses",
  async (path, type) => {
    for (const [method, status] of [
      ["GET", 200],
      ["HEAD", 200],
      ["GET", 304],
    ] as const) {
      const { env } = fixture(
        () =>
          new Response(status === 304 ? null : "asset", {
            status,
            headers: { "Content-Type": type, ETag: '"fixture"' },
          }),
      );
      const response = await worker.fetch(
        new Request(origin + path, { method }),
        env,
        ctx,
      );
      secure(response);
      expect(response.status).toBe(status);
      expect(response.headers.get("ETag")).toBe('"fixture"');
      expect(response.headers.get("Cache-Control")).toBe(
        "public, max-age=31536000, immutable",
      );
    }
  },
);

it("revalidates unhashed assets and keeps errors, redirects and ambiguous 304s uncached", async () => {
  for (const [path, status, type, cache] of [
    ["/favicon.svg", 200, "image/svg+xml", "no-cache"],
    ["/assets/index.js", 200, "text/javascript", "no-cache"],
    ["/assets/missing-Abcd1234.js", 404, "text/plain", "no-store"],
    ["/assets/index-Abcd1234.js", 304, "", "no-store"],
    ["/r", 302, "", "no-store"],
    ["/R", 302, "", "no-store"],
  ] as const) {
    const { env } = fixture(
      () =>
        new Response(status === 304 ? null : "fixture", {
          status,
          headers: type ? { "Content-Type": type } : {},
        }),
    );
    const response = await worker.fetch(new Request(origin + path), env, ctx);
    secure(response);
    expect(response.headers.get("Cache-Control")).toBe(cache);
    if (/^\/r$/i.test(path))
      expect(response.headers.get("Location")).toBe(env.PARTIFUL_URL);
  }
});

it("protects private portraits and responses that set cookies from public caching", () => {
  const cookie = "court_session=fixture; HttpOnly; Secure; SameSite=Lax";
  for (const path of ["/api/photo/fixture", "/assets/portrait-Abcd1234.webp"]) {
    const response = responseHeaders(
      new Request(origin + path),
      new Response("portrait", {
        headers: { "Content-Type": "image/webp", "Set-Cookie": cookie },
      }),
    );
    secure(response);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Set-Cookie")).toBe(cookie);
  }
});

it("applies security and no-store to thrown responses and unexpected failures", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    for (const error of [
      new Response("denied", { status: 403 }),
      new Error("fixture"),
    ]) {
      const { env } = fixture(() => {
        throw error;
      });
      const response = await worker.fetch(
        new Request(origin + "/assets/qr-art-BrfDLJ7R.webp"),
        env,
        ctx,
      );
      secure(response);
      expect(response.status).toBe(error instanceof Response ? 403 : 500);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    }
  } finally {
    log.mockRestore();
  }
});
