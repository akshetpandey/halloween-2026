# Party-night scan to trial hotfix

- Updated: October 31, 2026, America/New_York, during the live party.
- Scope: guest awakening CTA, shared encounter navigation, and catch-up for earlier scans.
- Checkout: shared main, base b1c7c7a. Unrelated decor/shopping-ready.md preserved.
- User request: finding a guardian did not lead to its puzzle; fix immediately and help earlier scanners reach puzzles.
- Root cause: fullscreen 3D reveal offered Find another guardian; the actual Hear its trial control was hidden behind the dialog. No discovery history was persisted for guests who used that scan-again action.
- Completed: guest reveal now has Solve this guardian’s puzzle, with loading/error/retry and no dependency on animation readiness. Uses the existing authenticated encounter resolver and assigned puzzle route. Host previews retain their original controls. No scoring, assignment, recognition or timing rules changed.
- Catch-up: /trials lets registered guests identify an already-seen guardian and open its assigned puzzle without rescanning. This deliberately uses guest self-report for earlier scans, since their guardian history was never saved; it does not assert that every listed guardian has been discovered. Earned guardians are disabled. A visible notice on Court, Bestiary and Lens links there and explains that solving earns Favor. No message was sent externally. Existing loaded clients must refresh or open the catch-up URL.
- Verification: TypeScript + production build passed; Wrangler dry-run passed. Full suite: 216 passed, one unrelated existing Apple Vision artwork-decoding subprocess assertion failed (empty stdout); QR files untouched. Live rehearsal /trials -> Gilded Root -> assigned Missing Sigil puzzle verified in Chrome, zero Favor awarded merely by opening.
- Deployment: Worker hollow-court-preview, both hollow-court.com and workers.dev; version b3fb34a1-10bd-4afb-9192-87ea4c516759. Production entry index-FkUxH1MZ.js.
- Remaining: real iPhone confirmation during the party; external text blast must be sent by host. No push/SMS system exists. Live photo recognition of the golden tree -> fullscreen 3D awakening -> new Solve button -> assigned puzzle also verified in Chrome. Three focused regression tests (guest CTA before animation ready, host preview unchanged, 15 catch-up choices with earned disabled) passed; ten focused tests total passed.
- Files: src/client/FoxSpiritReveal.tsx, GuardianLens.tsx, GuardianTrials.tsx, main.tsx, style.css; tests/guardian-trial-flow.test.tsx; README.md; this handoff.
