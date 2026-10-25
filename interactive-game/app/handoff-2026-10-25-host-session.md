# Access global login duration

- Session: extend Cloudflare Access login to one week across applications.
- Updated: October 25, 2026, America/New_York.
- Scope: the existing account's global Access session duration; this handoff and [app README](README.md). No application code changes.
- Checkout: `/Users/akshet/workspace/halloween-2026`, shared `main`, initial base `eff1a0e`; continuation base `41f91f0`.
- Status: **complete — saved globally and verified after reloading the dashboard.**

## Confirmed decision and saved configuration

The host originally requested a one-week host login. In the action-time confirmation reply on October 25, the host explicitly changed the scope: **“change the default one to one week so it applies to everything not just the host dashboard.”** This supersedes the earlier host-application-only draft.

In account `a1560f8d41d8c681a915c4f4429e736a`, Zero Trust → Access controls → Access settings → **Set your global session duration** changed from **Same as application session timeout** to **1 week**. Saved through the signed-in Chrome **Play** profile, then reloaded and verified **Duration: 1 week**.

The unsaved host application duration draft was discarded using **Cancel → Confirm and exit** before changing the global setting. No application duration, policy, permitted identity, destination, MFA, client authentication or service-token setting was changed. The global identity session setting applies to this Zero Trust organization; it does not change login duration for Cloudflare's administrative dashboard itself or the game's separate guest sessions.

## Application and policy context

- **Hollow Court host guest book**: application `94e96b31-6afc-433b-a5f4-e1d4278d9d13`, destinations `hollow-court.com/host` and `hollow-court.com/api/admin`.
- The live dashboard confirmed its existing **12-hour application duration** before the discarded draft.
- **Hollow Court host only** policy `b5bf0afc-653b-4314-b95b-0a1358c335bd` inherits the application timeout. It has two existing email entries and is shared with October Grove Playlist Lab. The policy was inspected but not edited. The Worker's independent approved-host identity restriction remains unchanged.
- [Cloudflare session documentation](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/) explains that Access can renew expired application tokens while the global identity token remains valid and the identity still passes its policies. Specific policy/client requirements can still override the general login experience; this change does not remove those requirements.
- The longer duration governs subsequently issued global tokens. Existing tokens retain their issued expiry, so one more sign-in may be needed. No current sessions were revoked to force a test. Seven days of real elapsed use has not been tested.

## Checks actually completed

- Dashboard save finished and returned the global duration to its read-only **1 week** display.
- Full page reload retained **Duration: 1 week**. Private proof screenshot: `private/host-session-2026-10-25/global-saved.png`, ignored by Git. The saved global settings page was retained as the browser deliverable.
- After the save, unauthenticated custom-domain `/host` and `/api/admin/session` returned **302** to `computer-toolbox.cloudflareaccess.com/cdn-cgi/access/login/hollow-court.com`; the Workers preview `/api/admin/session` returned **401**.
- Previously inspected `src/worker/host-access.ts`: signature, issuer, audience, expiry, required claims, token type and approved host identity are checked without an independent 12-hour maximum. No code change or Worker deployment was needed.
- Local documentation links and `git diff --check` passed for this documentation update. No code tests were run because no code changed.

## Access limitations and external actions

- Wrangler `whoami` confirmed the intended account, but its current OAuth scopes omit Access management. A narrow application GET returned Cloudflare `auth.forbidden` (code 1010). No API write was attempted; the existing authenticated dashboard was used instead.
- The host completed Cloudflare's authenticator sign-in. No authenticator value, credential or guest identity is saved in Git.
- External change performed: **global Access session duration only**. No deployment, billing, purchase or subscription change.
- Rollback if requested: edit the same global duration back to **Same as application session timeout**. This would govern newly issued global tokens; already issued token revocation is a separate action.

## Remaining work and commits

- No required implementation work remains for the global timeout change. On the next normal sign-in, confirm that the longer login experience behaves as intended on the host's phone; browser cookie clearing and explicit overrides can still cause a fresh login.
- No cost changes, proposals awaiting a decision or sibling-task dependencies.
- Prior checkpoints: `cadc2f2` recorded the authenticator dependency; `41f91f0` recorded the unsaved host-only draft. Both pending states are superseded by this completed global change.
- This continuation changes only this handoff and the app README. The final response reports the resulting commit hash. Checkout was clean at the start; no unrelated dirty files were present.
