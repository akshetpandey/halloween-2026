# Guardian camera prototype — October 23, 2026

- Session: guardian reference enrollment, local recognition and animated awakening; current local Codex session.
- Checkout: shared `/Users/akshet/workspace/halloween-2026`, `main`; research baseline `1ec8c29`. Other sessions are committing decor/host-costume work concurrently; no worktrees/branches used.
- Status: implementation complete; deployment and final hosted checks being recorded below. Actual guardian/phone pilot remains open.
- Confirmed host decisions: implement reference uploads in the host dashboard, phone-local recognition, segmentation and animated awakening; prefer WebGPU where usable, WASM CPU fallback. Host has an iPhone 16 Pro/LiDAR, but guests must not need LiDAR. Existing Access sign-in is reused. No new paid service or storage binding.
- Canonical implementation/testing guide: [The Looking Lens](guardian-camera-prototype.md). Existing rules/story/puzzle scoring remain authoritative in design documents. This prototype does not finalize replacement of NFC.

## Completed

- Access-protected reference enrollment for all fifteen guardians, multiple angle/light photos, background negatives, reference removal, pause controls and threshold/gap calibration.
- Local DINOv3 q8 embeddings and distinct-guardian nearest-reference matching. Unknown, background and close ties reject gracefully. SlimSAM q8 centre/tap masks, refinements and skippable outline failure.
- Captured-image glow/cutout movement, dimmed background, particles and existing guardian greeting/animated illustration. Rehearsal guest continues to its existing deterministic puzzle; recognition awards no Favor.
- Module Worker inference, WebGPU capability probe, provider/run fallback and fresh CPU-worker restart after failed initialization. Host backend/timing diagnostics and explicit CPU comparison.
- Same-origin pinned model/runtime preparation with source SHA-256 validation, license/NOTICE delivery and immutable versioned caching. CPU runtime and split/streamed GPU runtime fit Workers Static Assets limits. No third-party recognition request and no guest scan-photo upload.
- Additive migration `0006_guardian_vision.sql`; D1 stores settings/normalized features and private KV stores host reference JPEGs without expiry. Original photos and notes are excluded from the guest manifest. Guest APIs are rehearsal-only; public time gate/debug isolation are retained.
- Source changes under app client/shared/worker, migration, asset preparation/model smoke scripts, unit/API tests, README/build brief, this handoff and the family README/tracker. Runtime weights, photos, fixture keys and cookies remain ignored.

## Verification actually performed

- `npm run build`: passes TypeScript and Vite; all individual stored assets below 25 MiB. ORT uses the external-WASM export condition; no accidental >25 MiB optional binary in the Vite bundle.
- `npm test`: **86 tests passed**, including 9,000 generated puzzle instances, existing QR/DST tests and new matching/runtime/fallback checks. Apple's existing Vision test needs normal macOS cache/inference permissions; initial sandbox-only runs failed there, then the full suite passed with those permissions.
- `npx wrangler deploy --dry-run`: passes, same Worker/bindings/routes, no new resources.
- `npm audit --omit=dev`: **0 vulnerabilities**. Dev-tool findings are pre-existing; no unrelated dependency upgrade.
- Actual CPU inference via `node scripts/check-vision-models.mjs private/vision-fixtures/owl.jpg`: finite 384-value DINO output (~300ms inference); SlimSAM `[1,1,3,256,256]` masks and finite scores (~5.6s encode/decode). These are Mac plumbing tests, not accuracy benchmarks.
- Real local browser enrollment: synthetic images derived from existing owl/raven illustrations plus an ordinary background, uploaded through the host UI and processed by the actual model. A separately rotated/resized owl image matched the owl, not raven/background. No actual host/guest photos used.
- Chrome automatic path: reported WebGPU + WASM fallback, match similarity .945, next guardian .521, gap .425; cold recognition ~17.49s including preparation, outline ~.23s. CPU browser comparison: .946 similarity, gap .420; ~1.49s recognition /6.35s outline. Timing varies with compilation/cache/device. It is not an iPhone benchmark or percentage confidence.
- Guest browser journey: Field notes starts a registered rehearsal at `/scan`; the matched owl awakens and **Hear its trial** opens Three Witnesses. An ordinary background produces the retry state.
- Mobile browser layout: **393px viewport and 393px document width**, no horizontal overflow; capture, awakening, host controls and diagnostics render. Synthetic screenshot is in ignored `private/guardian-lens-mobile.png`.
- Actual local rear-camera permission/capture, iPhone Safari/Android inference, dark-room recognition accuracy, real prop segmentation and physical NFC replacement have **not** been validated.

## Deployment / final checks

Pending evidence entry after deployment. Wrangler's old OAuth token had expired. Automatic approval review rejected reusing its broad legacy scopes; a narrower Worker/D1/KV/routes/account-read/zone-read login was used instead. The user completed Cloudflare 2FA and approved the final CLI login. No Access policy/host identity permission was expanded. Browser-controller reconnection failures caused callback retries; no browser warning/CAPTCHA/security protection was bypassed.

## Next actions

1. Host enrolls actual objects with ordinary photos, then tests held-out photos on iPhone Safari and non-Pro Android in party lighting. Add multiple guardians and ordinary negatives before judging false positives.
2. Record cold/warm recognition/outline timing, model download behavior, mask quality and confusion pairs. Test permission denial, native camera upload, orientation, cancellation/backgrounding and slow/offline conditions on phones.
3. Decide if camera discovery is ready for the live public flow. Keep existing NFC routes until that explicit pilot decision; no physical codes/tags were replaced or locked here.
4. Optional later textured LiDAR/Object Capture asset for 3D animation or rendered reference views. This build consumes RGB photos only.

No purchases, outreach, messages to other sessions or paid model calls. Local fixture JWTs/keys and the loopback-only browser-test proxy are ignored, never deployed. Final commit references and any unrelated dirty paths are reported in the session response; do not amend repeatedly to add this handoff's own hash.
