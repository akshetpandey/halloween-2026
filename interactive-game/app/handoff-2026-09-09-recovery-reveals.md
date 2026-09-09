# Host recovery and story reveals — September 9, 2026

- Session: Hollow Court host recovery and reveal rehearsal.
- Checkout: shared `/Users/akshet/workspace/halloween-2026`, `main`; implementation base `bcc6972`, Access activation base `778780d`.
- Status: complete for host recovery and reveal rehearsal; Cloudflare Access activated and verified end to end on September 9.
- Confirmed decisions: remove the portrait agreement checkbox; no recovery key saving step; host-assisted recovery; Cloudflare email sign-in using the admin email supplied privately in the conversation; make Summons and Chronicle reveals replayable in rehearsal.
- Scope: app onboarding/recovery, host guest book, Access JWT validation, reveal dialogs, preview invitation journey, additive migration 0004, tests and current notice wording in [narrative and game](../design/narrative-and-game.md).

## Implemented

- Name → costume portrait → arrival. A plain portrait visibility notice remains, with no agreement checkbox or key-saving requirement.
- `/host` searches registered guests by name or ID, shows portraits and Favors, and separates event/rehearsal lists. The host verifies the person and issues a fresh three-word phrase, displayed once, valid for ten minutes and one use. Issuing another invalidates the previous phrase. Only phrase hashes are stored. Redemption invalidates old sessions while preserving the account, portrait and game progress. Older saved hex recovery keys remain compatible.
- Host APIs verify an RS256 Cloudflare Access JWT against the configured issuer/JWKS, audience, expiry, application-token type and exact allowed email. Raw identity headers and preview mode grant no access. Host issue/redemption actions are audited without storing plaintext phrases.
- Registration and chapter milestones open the same mobile-friendly dialog used by preview replay. Four- and ten-Favor reveals introduce the corresponding Summons. Field notes offers both Summons reveals and all nine chapter replays, including already unlocked chapters.
- Preview invitation links stay on the preview origin. Recipient preview can start a fresh rehearsal guest to test accepting a Summons; the previous guest is retained.

## Verified

- `npm run build` and `npm run types`: passed.
- `npm test`: 75 passed, including signed Access JWT rejection cases, phrase generation, puzzle/QR/date tests.
- `npm run test:integration`: 5 passed, including registration without consent, guest/portrait authorization, expired/replaced/replayed phrases, concurrent redemption with exactly one winner, and legacy recovery rotation.
- Browser: both Summons chapter → invitation introductions; second Summons opens its filtered QR page; phone 390×844 reveal layout; recipient preview → fresh guest → photo step with no checkbox.
- Live: public `/api/state` stays sealed with preview disabled; both public and Workers preview admin guest APIs return 401 without a host JWT. HSTS and private/no-store headers verified using curl. Python urllib encountered an edge-generated 403; curl reached the Worker normally.
- `git diff --check`: passed before checkpoint.

## Initial deployment and enrollment history

- Additive migration `0004_host_recovery.sql` applied locally and remotely.
- Worker deployment `8c2425d2-fe46-49ae-ad7e-b988fe696dba` serves both configured hostnames.
- Wrangler OAuth can read Access apps/identity providers but creating an Access app returned 403. No app was created by that attempt.
- Signed-in Chrome dashboard confirms the existing Zero Trust team is `computer-toolbox`, but no active plan. Selected Zero Trust Free ($0/month); checkout requires accepting terms and authorizing excess-usage charges on the saved card. **Neither checkbox nor Activate was submitted.** Host approval requested; no purchase or subscription activation completed.

## Access activation completed

- The host reported activation on the Cloudflare account; the dashboard now permits Access applications. No billing checkout was submitted by this agent.
- Created **Hollow Court host guest book**, app `94e96b31-6afc-433b-a5f4-e1d4278d9d13`, covering `hollow-court.com/host` and `hollow-court.com/api/admin` including their subpaths.
- One Allow policy, **Hollow Court host only**, `b5bf0afc-653b-4314-b95b-0a1358c335bd`, with only the privately supplied email. Selected the existing email PIN provider; other applications/policies were preserved. Login branding inherits the account's existing “resistance-online” organization label.
- Application session is **12 hours**, the closest shorter dashboard option to the proposed 16 hours. Policy uses the application duration. HttpOnly enabled on the Access cookie; hostname scope permits both dashboard and API paths.
- Verified the team issuer through the live login redirect and the public AUD in the application's Additional settings; configured both in `wrangler.jsonc`. `HOST_EMAIL` uploaded as a Worker secret from ignored private input.
- Deployed version **36abc72b-d52a-4b88-bae5-36933a165ac7**. Build and generated types passed; targeted host-access tests **2 passed**. The preceding implementation checkpoint passed 75 unit and 5 integration tests.
- Live unauthenticated `/host`, `/api/admin/guests` and `/api/admin/photo/test` redirect to Cloudflare email authentication. Workers preview admin APIs still return 401 without a valid JWT. Public `/api/state` remains sealed, preview disabled, with HSTS/private-no-store response headers. Access's edge-generated login redirects use its own cache/security headers before the Worker runs.
- Completed email PIN sign-in and opened the actual guest book. Created one disposable synthetic rehearsal guest through the normal registration API. Verified host search, actual protected portrait load (80px), and phrase issuance through the dashboard. The public realm rejected the rehearsal phrase; preview redeemed it for the same guest, invalidated the old session, and rejected reuse. Removed only that test guest and portrait using the existing CLI fixture cleanup.
- Wrangler OAuth remains insufficient for individual Access app API reads (403); configuration and audience verification were completed through the signed-in Cloudflare dashboard.

## Remaining work

- Real-phone NFC/camera/QR and party-length gameplay checks from earlier handoffs.
- Final coronation tools and final event rules remain outside this change.

## Local continuation

- Wrangler local development is running on port 8787 with local JWT fixture settings from ignored `.dev.vars`. Integration tests serve their local JWKS on 8789 and keep the generated key under ignored `private/`. Never deploy these local issuer values.
- Actual host email is in ignored `private/host-email.txt`; no email or credential is committed. The abandoned password draft was removed.
- Signed-in Chrome host guest book is left open as the deliverable. The redundant in-app Cloudflare login tab was closed.
- Implementation commit: `778780d` on `main`. Access configuration and this status update are included in the next focused checkpoint; no unrelated dirty files were observed.
