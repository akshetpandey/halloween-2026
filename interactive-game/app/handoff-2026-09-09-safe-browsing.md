# Chrome warning on the Partiful redirect

- Updated September 9, 2026. Shared `main`, base `799011f`.
- User report: `/r` shows a dangerous-site warning in Chrome, while the base domain and direct Partiful URL work.
- Status: direct-link mitigation deployed; Google classification remains unresolved. False-positive report prepared but not submitted; sending a report to Google requires explicit user authorization.
- Scope: additive `partifulDirectUrl` in server state/types, invitation anchor, integration assertion, README/domain status and this handoff.

## Evidence

Chrome navigation to `/r` produced a security interstitial. Its expanded details explicitly said Google Safe Browsing recently found phishing. Details were read without clicking through the unsafe-site link or changing browser security. This is not evidence of a TLS error.

Read-only response inspection returned HTTP 302 with the expected fixed Location `https://partiful.com/e/CVuHCtIIuMl4G7JuWo2u`, `Cache-Control: no-store`, and the expected security headers. The route source accepts no user-controlled redirect destination. The homepage returned HTTP 200. No unexpected destination was found in this route; this narrow audit is not a complete account compromise assessment. The reason for Google's classification is unknown.

[Google's status page](https://transparencyreport.google.com/safe-browsing/search?url=https%3A%2F%2Fhollow-court.com%2Fr) returned “No available data”, despite the browser warning. [Chrome warning documentation](https://support.google.com/chrome/answer/99020) identifies these warnings as Safe Browsing classifications.

## Change and verification

The small invitation anchor uses the configured direct Partiful event URL. `partifulUrl` remains the short URL for QR generation, while additive `partifulDirectUrl` supplies the anchor. The original host-selected artwork, payload, `/r` and `/R` routes remain unchanged. No alternate redirect route was added to evade the blocklist. The QR still depends on the flagged redirect route; the mitigation does not resolve its warning.

- Build passed; all four API integration tests passed, including the direct destination and unchanged short redirect.
- Formatting and `git diff --check` passed.
- `npx wrangler deploy` succeeded: version `fded3b12-1372-4a77-a11f-b9046033588f` on both configured domains.
- Live Chrome homepage loaded and showed the invitation anchor pointing directly to the correct Partiful event. Sealed gate and absence of debug/navigation preserved.

## Prepared report, not submitted

Form: https://safebrowsing.google.com/safebrowsing/report_error/?url=https%3A%2F%2Fhollow-court.com%2Fr

Type: This page is safe. URL: `https://hollow-court.com/r`.

> Please review a possible false positive for https://hollow-court.com/r (the equivalent QR route is /R). This is a host-owned Halloween event website. The route returns an HTTP 302 with a fixed Location of https://partiful.com/e/CVuHCtIIuMl4G7JuWo2u. It accepts no destination parameter and serves no login form or script. Chrome currently shows a phishing warning on /r, while the host reports the homepage and direct Partiful event open normally. The deployed response was checked and matches the configured destination. Please reassess this redirect URL.

The form says submission also sends some account/system information and may share URL/status with third parties. No guest data or credentials are in the draft. Do not submit until the host authorizes the Google report. If a CAPTCHA appears, follow the computer-use confirmation requirement rather than bypassing it.

Next: obtain report authorization, submit and record confirmation, then verify the warning after Google's reassessment. Clearing a Safe Browsing classification is external and has not been claimed. No purchases, account changes, DNS changes or sibling dependencies. No unrelated dirty files at checkpoint; commit hash reported in final response.
