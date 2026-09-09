# Header navigation visibility

- Session title and ID: Signed-out header cleanup; `01a08367-2c08-7451-8ede-52803d3c1c40`.
- Updated date: September 9, 2026, America/New_York.
- Scope / owned files: Client header in `src/client/main.tsx`, app README and this handoff.
- Checkout, branch and base commit: Shared repository on `main`, base `be03dc1`.
- Status: Complete and deployed.
- Confirmed user decisions: Hide the top buttons that do not work before login.
- Proposals awaiting a decision: None.
- Completed work and canonical file links: [App README](README.md). Render navigation, account avatar and mobile-menu toggle only for registered players. Anonymous/loading/incomplete-registration states show only the header logo.
- Checks actually run and results: `npm run build`, Prettier and `git diff --check` passed. Browser verified signed-out header on desktop and 390px mobile, registered desktop controls, and the working registered mobile menu. Live custom-domain check shows only the logo, with the sealed entrance and no debug. Temporary viewport override reset. No new tests added for this small rendering condition.
- Purchases / external changes / deployments actually performed: Deployed existing Worker/static assets, version `4bfb85ff-9ae1-45ee-9724-0f0dd45f8f2d`. No purchase, data migration, resource changes or Git push.
- Remaining work in priority order: None for this request.
- Dependencies on sibling tasks: None.
- Unpersisted conversation details or access limitations: No account data changed; existing local test sessions were inspected without logging them out.
- Commit(s) on main and remaining unrelated dirty files: Implementation `d2b26f0`; this handoff is the final documentation checkpoint. No unrelated dirty files observed.
