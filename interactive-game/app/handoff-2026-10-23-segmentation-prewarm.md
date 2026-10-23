# Segmentation warm-up during arrival

- Session title: Looking Lens segmentation prewarm and phone test guide.
- Updated date: October 23, 2026, America/New_York.
- Scope / owned files: shared vision session lifecycle, SlimSAM Worker warm-up/reuse, Lens status/host diagnostics, focused tests and CPU smoke, camera documentation.
- Checkout, branch and base commit: shared `/Users/akshet/workspace/halloween-2026`, `main`, base `5a963b8`.
- Status: implementation and local verification complete; publishing next. Real-phone and real-prop acceptance remains open.
- Confirmed user decision: preload and warm segmentation during onboarding alongside recognition, and provide a practical phone test with guardian pictures (October 23).
- Proposals awaiting a decision: none required for this change.

## Completed work

- [Shared preparation pool](src/client/prepared-vision-session.ts) deduplicates concurrent preparation and retains ready Workers. Recognition keeps its existing policy; [segmentation arrival preparation](src/client/segmentation-session.ts) follows the small recognizer during name/selfie, recovery and returning rehearsal sessions. Neither blocks registration. Sealed public entry and the host guest book do not preload models.
- [Vision Worker](src/client/vision.worker.ts) loads both SlimSAM sessions once, runs a zero-input encoder/decoder warm-up and disposes synthetic tensors. Both models remain alive across actual photos. Photo embeddings are reused for tap refinement, then cleared on reset/Lens exit. GPU execution failure releases sessions and retries CPU; failed initialization retains the existing fresh-Worker CPU fallback.
- [Lens](src/client/GuardianLens.tsx) joins that shared preparation and displays **Lens ready · awakening ready**. Host diagnostics separate initial warm-up from per-photo inference. A backend comparison replaces the old large session. Greeting/particles and trial still begin before the mask completes; prewarm cannot eliminate inference for a new image.
- [Phone test walkthrough](guardian-phone-test.md) covers private reference enrollment, held-out pictures, live camera, rejection checks, onboarding reuse and timing reports. The [current prototype guide](guardian-camera-prototype.md) reflects the new lifecycle.

## Checks actually run

- `npm test`: **100 tests passed across 11 files**, including session deduplication/backend switching, actual Worker warm/reuse/refinement/image disposal/GPU-retry protocol, existing puzzles and native QR verification.
- `npm run build`: passed TypeScript and Vite; client `index-DTmOCMJV.js`, Worker `vision.worker-V4R-hgoC.js`.
- Real local ONNX CPU smoke: recognition median **9.2 ms**, p95 **9.6 ms**; SlimSAM zero-input warm-up **5,394 ms**, two new photos with retained sessions **5,071 / 5,047 ms**, finite masks/scores. This is a Mac CPU result, not phone performance.
- Chrome Play browser: both model downloads occurred on `/recover` before Lens entry; Lens immediately reported both ready. A held-out synthetic owl photo matched correctly, produced the greeting/trial then the glowing segmented cutout. Court → Lens navigation remained ready with no additional model requests. Screenshot stays ignored at `private/segmentation-prewarm-ready.png`. No personal photo or real webcam stream used.
- Deployment/dry-run/hosted verification: pending below.

## External changes and next actions

- No new Cloudflare resources, migrations, auth scopes, reference uploads or paid services are needed. Existing weights, versions, runtime storage and public pilot gate remain unchanged.
- Publish the existing Worker, verify exact hosted bundles/cache/gates, then record deployment evidence here.
- Host: follow the phone walkthrough using the actual props. Measure warm-up, stable match and new-photo inference separately, including WebGPU/CPU backend and ordinary-object rejection. Mobile memory pressure, dim-light accuracy and whole-object segmentation are still unmeasured.
- Dependencies on sibling tasks: none; no budget or physical-tag changes.
- Unpersisted details/access limits: all durable decisions/results are here. Guest camera remains preview-only. A full reload or browser-reclaimed session reinitializes, with cached weights where available.
- Commits on main / unrelated dirty files: source/documentation checkpoint pending; no unrelated dirty files observed before this handoff.
