# Host Access session duration

- Session: extend Hollow Court host login to one week.
- Updated: October 25, 2026, America/New_York.
- Scope: Cloudflare Access configuration for the existing host application; this handoff only. No application code changes.
- Checkout: `/Users/akshet/workspace/halloween-2026`, shared `main`, base `eff1a0e`.
- Status: **ready to save; waiting for action-time confirmation. One week is selected in the dashboard, but no session-duration change has been saved.**

## Confirmed decision

The host requested a one-week Cloudflare host login on October 25. Target the existing **Hollow Court host guest book** application (`94e96b31-6afc-433b-a5f4-e1d4278d9d13`) in account `a1560f8d41d8c681a915c4f4429e736a`. Preserve the host-only Allow policy, email identity provider, protected paths, cookie settings and Worker token verification. Do not extend unrelated applications or the organization-wide session.

The [original Access activation](handoff-2026-09-09-recovery-reveals.md) records a **12-hour application session**, with **Hollow Court host only** policy (`b5bf0afc-653b-4314-b95b-0a1358c335bd`) inheriting the application duration. The live dashboard confirmed both settings on October 25. The policy now has two existing email entries and is shared by two applications, including October Grove Playlist Lab; preserve it without editing. The Worker's independent identity restriction is unchanged.

## Investigation and checks actually completed

- Wrangler `whoami` succeeds in the intended account; the existing OAuth scopes omit Access management. A narrow GET of the known Access application returned `auth.forbidden` (Cloudflare code 1010). No write was attempted.
- The host completed authenticator sign-in. Chrome profile **Play** is signed into the intended account. The **Host login** tab is marked for continuation, with the application Details view showing **1 week** selected and **Save** still pending. No authenticator value was requested or stored.
- Live application inspection confirmed destinations `hollow-court.com/host` and `hollow-court.com/api/admin`, the existing Allow policy, instant identity-provider redirect enabled and Cloudflare One Client authentication disabled. Only the application duration was edited in the unsaved form. Private review screenshot: `private/host-session-2026-10-25/prepared.png` (ignored by Git).
- [Current Cloudflare session documentation](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/) supports seven-day application sessions. A policy inheriting the application timeout receives that token lifetime. A valid application token remains usable for its lifetime even after the global token expires, so the broader organization setting does not need changing for this request.
- Read `src/worker/host-access.ts`: it verifies the signed token's issuer, audience, expiry, required claims, type and approved host identity, without imposing a separate 12-hour maximum. No Worker redeployment is needed for the configuration change.
- Live unauthenticated checks: custom-domain `/host` and `/api/admin/session` both return **302** to the expected Cloudflare Access login; Workers preview `/api/admin/session` returns **401**.
- No code tests were run because no code changed. `git diff --check` is part of the documentation checkpoint.

## Next actions

1. Await the pending action-time confirmation to save **1 week** for the prepared application. The browser tool requires this confirmation because the private dashboard's authenticated access duration increases; the original request alone does not satisfy its action-time rule.
2. Resume the marked **Host login** tab, confirm the prepared application and selection, and submit **Save** only after approval. Do not edit the shared policy.
3. Save, reload and verify the persisted duration and inherited policy. Repeat the unauthenticated route checks. Do not revoke the host's current session just to test; the longer expiry applies to subsequently issued tokens.
4. Update the current session statement in [README](README.md) and this handoff with the actual result and verification. Capture dashboard proof privately; do not commit account screenshots or runtime identity data.

## External changes, dependencies and commits

- External actions: attempted read-only API request, routine dashboard sign-in, and preparing an unsaved form; **no persisted Access configuration update, deployment, billing or policy change**.
- Dependency: action-time confirmation to save the prepared duration. Existing CLI credentials cannot manage this application.
- No proposals, cost changes or sibling-task dependencies.
- Prior checkpoint: `cadc2f2` recorded the authenticator dependency; this update supersedes that blocker. This checkpoint contains only this handoff; the final response reports its commit hash. Checkout was clean at the start; no unrelated dirty files were present.
