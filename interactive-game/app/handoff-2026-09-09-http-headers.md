# HTTPS, security and cache headers

- Session title and ID: Hollow Court HTTP policy; current local Codex session.
- Updated date: September 9, 2026, America/New_York.
- Scope / owned files: `src/worker/http.ts`, `src/worker/index.ts`, `wrangler.jsonc`, removal of `public/_headers`, `tests/http.test.ts`, the portrait cache assertion in `tests/api.integration.ts`, app README and this handoff.
- Checkout, branch and base commit: `/Users/akshet/workspace/halloween-2026`, shared `main`, base `615f437`; checkout was clean.
- Status: complete; deployed and verified.
- Confirmed user decisions: September 9 request to redirect HTTP to HTTPS, send HSTS and standard security headers, permanently cache generated hashed assets and prevent HTML caching.
- Proposals awaiting a decision: none for this scope.

## Implemented policy

- `assets.run_worker_first: true` makes the Worker enforce the same policy on API, static assets and SPA documents. Assets still stream from the ASSETS binding. The duplicated static `_headers` file is removed.
- HTTP is upgraded before API/authentication/database/asset work. Status 308 preserves method/body, pathname and query. Exact loopback hostnames remain usable over HTTP for local development.
- HTTPS responses carry `Strict-Transport-Security: max-age=31536000`, including redirects and errors. This is host-only, without preload or an assumption that future subdomains support HTTPS. Local development does not send HSTS.
- Existing CSP, `nosniff`, same-origin referrer policy and search exclusion now apply consistently to errors too. `X-Frame-Options: DENY` complements CSP frame restrictions. Permissions Policy permits the site's selfie camera and disables microphone, geolocation, payment and USB access.
- HTML and XHTML use `Cache-Control: no-store`, including deep links and SPA fallbacks at filenames that appear hashed. API responses, private portraits and any response setting cookies use `private, no-store`. Redirects, failed responses, mutation responses and responses without a known content type use `no-store`.
- Successful static GET/HEAD responses in `/assets/` with the current Vite eight-character filename hash and supported image/font/script/style extensions use `public, max-age=31536000, immutable`. Unhashed static assets use `no-cache`, allowing storage but requiring revalidation. Typed asset 304 responses retain their policy; a 304 without a content type conservatively uses `no-store` rather than risking caching an HTML fallback. Cookies, ETags and body streaming are preserved.
- This changes HTTP behavior; the separate Google Safe Browsing review remains unresolved and was not retested as part of this task.

## Verification and deployment

- `npm run types`: passed, no generated type diff.
- `npm run build`: TypeScript and production Vite build passed; frontend assets unchanged.
- `npm test`: **73 passed** across four files, including 16 new HTTP policy cases.
- `npm run test:integration`: **4 passed**, exercising local onboarding, portraits, cookies, referrals and recovery. Its original exact `no-store` assertion failed on the newly explicit `private, no-store`; updated to the intended policy and reran successfully.
- `npx wrangler deploy`: successful; Worker **hollow-court-preview**, version **55c903ca-90f6-4957-8859-50c60cc8953e**. Both existing domains and the cleanup schedule remain configured. No database or portrait storage migration.
- Live read-only HTTP verification: **16 redirect/cache/security checks per hostname**, on `hollow-court.com` and `hollow-court-preview.computer-toolbox.workers.dev`. Checked the HTTP upgrade with pathname/query preservation; root and deep-link HTML; missing hash-shaped asset fallback; both Partiful redirects; denied portrait read; and all deployed JS/CSS/WebP/WOFF2 files. Both state endpoints also passed private cache checks, with the public Court sealed and preview available only on the preview host.
- `git diff --check`: passed before commit.

## Handoff

- Purchases / external changes: Worker deployment only, as above.
- Remaining work: no outstanding work for this request. Existing Google review and real-phone event playtests remain separate.
- Dependencies on sibling tasks: none.
- Unpersisted conversation details or access limitations: none for this scope.
- Commit(s) on main and unrelated dirty files: this work is committed with this handoff; resulting hash reported in the final response. No unrelated dirty files at review time. No push performed.

References consulted: [Cloudflare Worker-first routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/), [static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/), [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/), and [HSTS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security). Current installed Wrangler schema and generated runtime types were also checked.
