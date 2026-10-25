# Host Access session duration

- Session: extend Hollow Court host login to one week.
- Updated: October 25, 2026, America/New_York.
- Scope: Cloudflare Access configuration for the existing host application; this handoff only. No application code changes.
- Checkout: `/Users/akshet/workspace/halloween-2026`, shared `main`, base `eff1a0e`.
- Status: **ready to continue; waiting for dashboard authenticator sign-in. No session-duration change has been saved.**

## Confirmed decision

The host requested a one-week Cloudflare host login on October 25. Target the existing **Hollow Court host guest book** application (`94e96b31-6afc-433b-a5f4-e1d4278d9d13`) in account `a1560f8d41d8c681a915c4f4429e736a`. Preserve the host-only Allow policy, email identity provider, protected paths, cookie settings and Worker token verification. Do not extend unrelated applications or the organization-wide session.

The [original Access activation](handoff-2026-09-09-recovery-reveals.md) records a **12-hour application session**, with **Hollow Court host only** policy (`b5bf0afc-653b-4314-b95b-0a1358c335bd`) inheriting the application duration. This is historical evidence, not a fresh dashboard read; inspect the live configuration after sign-in before editing.

## Investigation and checks actually completed

- Wrangler `whoami` succeeds in the intended account; the existing OAuth scopes omit Access management. A narrow GET of the known Access application returned `auth.forbidden` (Cloudflare code 1010). No write was attempted.
- Chrome profile **Play** reached Cloudflare's existing-account Google sign-in and is now at the authenticator screen. The **Host login** tab is marked for continuation. The host was asked to complete sign-in; no authenticator value was requested or stored.
- [Current Cloudflare session documentation](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/) supports seven-day application sessions. A policy inheriting the application timeout receives that token lifetime. A valid application token remains usable for its lifetime even after the global token expires, so the broader organization setting does not need changing for this request.
- Read `src/worker/host-access.ts`: it verifies the signed token's issuer, audience, expiry, required claims, type and approved host identity, without imposing a separate 12-hour maximum. No Worker redeployment is needed for the configuration change.
- Live unauthenticated checks: custom-domain `/host` and `/api/admin/session` both return **302** to the expected Cloudflare Access login; Workers preview `/api/admin/session` returns **401**.
- No code tests were run because no code changed. `git diff --check` is part of the documentation checkpoint.

## Next actions

1. After the host completes authenticator sign-in, inspect the exact application and its policy inheritance in Zero Trust → Access controls → Applications.
2. Prepare the application duration as **7 days / 168 hours**, preserving other fields. Apply the browser tool's action-time confirmation rule for extending security-sensitive access before submitting the final save.
3. Save, reload and verify the persisted duration and inherited policy. Repeat the unauthenticated route checks. Do not revoke the host's current session just to test; the longer expiry applies to subsequently issued tokens.
4. Update the current session statement in [README](README.md) and this handoff with the actual result and verification. Capture dashboard proof privately; do not commit account screenshots or runtime identity data.

## External changes, dependencies and commits

- External actions: attempted read-only API request and routine dashboard sign-in; **no Access configuration update, deployment, billing or policy change**.
- Dependency: host completes Cloudflare authenticator sign-in in Chrome. Existing CLI credentials cannot manage this application.
- No proposals, cost changes or sibling-task dependencies.
- This checkpoint contains only this handoff; the final response reports its commit hash. Checkout was clean at the start; no unrelated dirty files were present.
