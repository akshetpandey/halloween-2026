# Recognition prewarm during arrival — October 23, 2026

- Session: preload and warm the guardian recognition model during login/name/selfie onboarding, then reuse it when the camera opens.
- Checkout: shared `/Users/akshet/workspace/halloween-2026`, `main`; starting release notes `e57e432`. No worktree, separate branch or delegated session.
- Status: deployed; local and hosted checks passed. Real phone/prop acceptance remains the existing pilot gate.
- Confirmed user request, October 23: start model preparation during login + selfie so camera entry avoids a cold start. No additional product decision needed.
- Scope / owned files: `src/client/recognition-session.ts`, `main.tsx`, `GuardianLens.tsx`, `tests/recognition-session.test.ts`, application README, [current prototype guide](guardian-camera-prototype.md), this handoff.

## Behavior

- Recognition has one page-owned CPU worker and one shared preparation promise. Preparation fetches the model/runtime, initializes ONNX and runs the existing zero-input warm-up. Camera entry and concurrent consumers join that same preparation; they do not create another worker or repeat its warm-up.
- Name/selfie and recovery entry start preparation in the background. Restored rehearsal sessions prepare too. Form controls and registration do not await it; errors stay out of the onboarding flow and can be retried when the Lens opens.
- Leaving the Lens stops its camera, releases captured images and closes the outline worker, while retaining the feature-only recognition worker for the page lifetime. No portrait is supplied to the warm-up and it requests no camera permission.
- The preload follows the current rehearsal camera rollout: the sealed entrance, host guest book and public domain with camera disabled do not download these assets. Full reloads or a reclaimed/failed worker require initialization again; the Lens recovers through the same session manager. Slow downloads can still be in flight when a very fast signup finishes.
- No Worker API, database schema, Cloudflare resource, authentication, event gate, scoring or retention change. The existing manifest/authentication request remains at Lens entry.

## Checks actually performed

- **11 focused tests passed** across recognition session, worker recovery and temporal stability. They cover concurrent startup deduplication, prepared-worker reuse, retry after download failure, recovery after worker reclamation, unsupported Workers, permitted login/recovery startup and no preload on sealed/disabled/host surfaces.
- `npm run build`: TypeScript and Vite passed. `wrangler deploy --dry-run`: passed against the existing Worker and bindings.
- Actual local browser: sealed home produced zero recognition/model requests. Opening **Field notes → Name + selfie** downloaded the recognition graph, CPU runtime and worker while the name form was still visible. Completed name, synthetic owl portrait, confirmation and registration through the real UI.
- At guest Lens entry the UI showed **Lens ready · automatic live scanning**. Leaving for the Court and reopening the Lens retained readiness. Local request logs across onboarding and both visits recorded one recognition-model request and one recognition-worker download, with zero outline-model requests. Unit tests additionally verify one preparation/inference worker rather than relying on HTTP caching alone.
- Synthetic local fixture only; no actual guest selfie or production account was created. Browser screenshot: ignored `private/arrival-prewarm-ready.png`. Native photo-picker automation stalled before completing its fixture attachment; the app then completed the onboarding and navigation checks normally. No camera hardware/permission test was performed.

## Release and remaining work

- Target: existing `hollow-court-preview` Worker, Workers preview and `hollow-court.com`; no new bindings/migrations.
- Source commit **`cfc21b1`** deployed as Worker version **`4d952043-12a2-44c6-96be-109ad0c54498`**. Both hostnames serve the new `index-Bz4tbP22.js` bundle with the exact local build checksum. Hosted HTML remains no-store; the bundle and model retain immutable caching. Public state remains sealed with preview disabled, preview state permits rehearsal, and the public camera API remains 404. Wrangler’s expired login was refreshed using the same previously authorized deployment scopes; no Access policy or host permissions changed.
- Next: verify the normal phone signup-to-camera journey and cold-network behavior on iPhone Safari and Android, then continue the existing real-prop acceptance pilot. Camera public rollout is unchanged.
- No purchases, messages, new chats or browser permission changes. Local test resources remain ignored; the temporary local Worker and browser test tab were closed. Commit hashes are reported in the final response; this handoff is saved before committing and need not contain its own hash.
