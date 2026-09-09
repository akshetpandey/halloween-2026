# Public time gate and preview isolation

- Session title and ID: Public time gate; `01a08367-2c08-7451-8ede-52803d3c1c40`.
- Updated date: September 9, 2026, America/New_York.
- Scope / owned files: Worker hostname policy/session/recovery/invite guards, frontend sealed-route handling, Wrangler preview/local settings, access tests, hosted smoke test and relevant game/app documentation.
- Checkout, branch and base commit: Shared `/Users/akshet/workspace/halloween-2026`, `main`, base `136d727`.
- Status: Complete and deployed.
- Confirmed user decisions: Hide debug and activate the time gate on `hollow-court.com`; show hosted debug only through workers.dev (September 9 request).
- Proposals awaiting a decision: None for this change.
- Completed work and canonical file links: [App behavior and setup](README.md), [domain notes](domain-and-qr.md). The configured preview hostname alone enables hosted rehearsal; local HTTP loopback development also supports it. A request-scoped environment prevents cross-request flag changes. Public requests ignore rehearsal cookies, reject their recovery and invitation use, and disable debug endpoints. All public frontend entry routes show the sealed entrance before opening, including `/join?preview=true`. Existing data remains stored.
- Checks actually run and results: 57 unit/property/QR tests and 4 local integration tests passed; build, generated types, Prettier, Markdown links and diff checks passed. Local Wrangler originally inherited the custom hostname; explicit loopback upstream settings corrected that and the integration suite then passed. Hosted smoke passed on workers.dev and verified public gating, disabled debug endpoints, copied-cookie rejection and blocked preview start/recovery on the custom domain. Its synthetic accounts/portraits were cleaned up. Browser verified public root and signup deep link are sealed with no Field notes/rehearsal banner; workers.dev still displays its existing rehearsal account and debug button.
- Purchases / external changes / deployments actually performed: Deployed Worker version `654907f1-d82f-494a-8a1b-c6b534a73789` to the existing custom domain and workers.dev endpoint. No migration, new resources, purchase, tag changes or Git push.
- Remaining work in priority order: None for the request. Existing final-event/admin and real-phone tasks remain in the game tracker. Opening stays October 31, 2026 at 8 p.m. EDT; closing stays November 1 at 2 a.m. EST.
- Dependencies on sibling tasks: None introduced.
- Unpersisted conversation details or access limitations: Rehearsal invitation QR codes still encode the short public domain, which now respects its time gate; rehearsal invitation functionality is tested on the preview hostname. Public and preview records remain separate realms in the existing storage.
- Commit(s) on main and remaining unrelated dirty files: `357d932` (`Restrict rehearsal tools to preview host and gate public domain`); this handoff is the final documentation checkpoint. No unrelated dirty files observed.
