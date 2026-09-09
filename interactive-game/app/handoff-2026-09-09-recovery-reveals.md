# Host recovery and story reveals — September 9, 2026

- Session: Hollow Court host recovery and reveal rehearsal.
- Checkout: shared `/Users/akshet/workspace/halloween-2026`, `main`, base `bcc6972`.
- Status: guest-facing changes deployed; Cloudflare Access activation pending the host's billing authorization.
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

## External changes

- Additive migration `0004_host_recovery.sql` applied locally and remotely.
- Worker deployment `8c2425d2-fe46-49ae-ad7e-b988fe696dba` serves both configured hostnames.
- Wrangler OAuth can read Access apps/identity providers but creating an Access app returned 403. No app was created by that attempt.
- Signed-in Chrome dashboard confirms the existing Zero Trust team is `computer-toolbox`, but no active plan. Selected Zero Trust Free ($0/month); checkout requires accepting terms and authorizing excess-usage charges on the saved card. **Neither checkbox nor Activate was submitted.** Host approval requested; no purchase or subscription activation completed.

## Next steps

1. After billing authorization/host activation, create one Access self-hosted app for `hollow-court.com/host` and `hollow-court.com/api/admin`, allowing only the privately supplied admin email via email PIN, with a 16-hour session.
2. Read and verify app audience and team issuer. Set non-secret `ACCESS_AUD` and `ACCESS_TEAM_DOMAIN` in Wrangler config and `HOST_EMAIL` as a Worker secret. Deploy and verify signed-in guest search/portrait/recovery with a synthetic rehearsal guest.
3. Update this status and README after activation. Host APIs currently fail closed; the host dashboard is not yet usable in production.
4. Retain real-phone NFC/camera/QR and party-length gameplay checks from earlier handoffs. Final coronation tools remain outside this change.

## Local continuation

- Wrangler local development is running on port 8787 with local JWT fixture settings from ignored `.dev.vars`. Integration tests serve their local JWKS on 8789 and keep the generated key under ignored `private/`. Never deploy these local issuer values.
- Actual host email is in ignored `private/host-email.txt`; no email or credential is committed. The abandoned password draft was removed.
- Chrome user tab `216303612` is at Cloudflare Zero Trust checkout. The older in-app Cloudflare login tab is redundant.
- Commit: this handoff is included in the next focused checkpoint on `main`; no unrelated dirty files were observed before that checkpoint.
