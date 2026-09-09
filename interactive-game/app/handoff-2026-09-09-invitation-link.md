# Entrance invitation cleanup

- Session title and ID: Small invitation link below QR; `01a08367-2c08-7451-8ede-52803d3c1c40`.
- Updated date: September 9, 2026, America/New_York.
- Scope / owned files: Client entrance markup/styles and this handoff.
- Checkout, branch and base commit: Shared `main`, base `77bdb08`.
- Status: Complete and deployed.
- Confirmed user decisions: Move the invitation link to a small element beneath the QR; remove the location/Halloween-night details and the separate Court-opening disclaimer.
- Proposals awaiting a decision: None.
- Completed work and canonical file links: [Client markup](src/client/main.tsx), [styles](src/client/style.css). Replaced the large invitation button with a 12px underlined link below the QR and Follow the Leaves caption, retaining a 44px touch target. Removed the requested two detail lines. The top time-gate date/time remains.
- Checks actually run and results: Build, Prettier and diff checks passed. Local desktop structure and 390px mobile screenshot checked. Live site verified after refresh: link is inside the QR bookplate, points to the short Partiful redirect and removed copy is absent. Temporary viewport reset. No new tests for this small presentation edit.
- Purchases / external changes / deployments actually performed: Deployed existing Worker/static assets, version `df14396d-31bf-41d8-bd8c-d7008aa19c87`. No purchases, data changes or Git push.
- Remaining work in priority order: None for this request; existing open tabs may need refresh to load the new frontend.
- Dependencies on sibling tasks: None.
- Unpersisted conversation details or access limitations: None.
- Commit(s) on main and remaining unrelated dirty files: Implementation `4649911`; this handoff is the final documentation checkpoint. No unrelated dirty files observed.
