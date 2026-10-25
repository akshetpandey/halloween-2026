# Camera preparation without an idle stream

**Historical policy:** the host explicitly changed this requirement on October 25. [Retained camera-only session](handoff-2026-10-25-camera-session.md) is current; the full-stop behavior below describes this earlier release.

- Session title: Lens camera lifecycle and reusable frame buffers.
- Updated date: October 23, 2026, America/New_York.
- Scope / owned files: Lens camera acquisition, frame surfaces, host startup diagnostics, tests and current camera docs.
- Checkout, branch and base commit: `/Users/akshet/workspace/halloween-2026`, shared `main`, base `fe8c1bc`.
- Status: implemented, committed, deployed and verified on both domains. Physical-phone camera/indicator checks remain open.
- Confirmed user decision (October 23): preserve useful camera preparation between pages, without video capture or the active recording indicator while outside the Lens.
- Proposals awaiting a decision: none.

## Implementation

- [Camera lifecycle](src/client/lens-camera.ts) retains the last successful device ID only in page memory. The next explicit open uses it as an optional `ideal` hint with a rear-facing preference. No local/server persistence, ID logging or device enumeration. No camera/microphone request during onboarding, route entry or idle; only the existing explicit open button requests camera access, without audio.
- Requests target 1280×960, 24fps with a 30fps cap. A browser may choose an available resolution consistent with the ideal hints. No claimed measured reduction in hardware startup latency yet.
- Two page-owned canvases are allocated lazily and reused at unchanged geometry (recognition ≤960px long edge, captured photo ≤1280px). Scanning stop clears their pixels; there is no old image retained in these buffers on other pages. Model sessions remain warmed as implemented previously.
- [Lens](src/client/GuardianLens.tsx) stops all tracks on reset, navigation/unmount, capture, backgrounding and page hide. An outstanding camera request is invalidated too. Since getUserMedia has no abort signal, a late result is immediately stopped. A superseded request cannot replace the current camera. The page does not keep a hidden/disabled stream alive.
- Host diagnostics add camera-open and tap-to-preview time, and initial/remembered selection. Permission prompts count toward startup time; compare repeated opens after granting permission.
- [Phone test guide](guardian-phone-test.md) adds indicator, backgrounding, late-permission cancellation and reopen timing checks.

## Browser evidence and constraints

[MediaStreamTrack.stop()](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/stop) releases a track's source; browser/OS hardware behavior and indicators remain outside the app's control. Keeping a disabled track is not a portable promise of either retained hardware warmth or an extinguished indicator; the [media lifecycle specification](https://www.w3.org/TR/mediacapture-streams/#life-cycle-and-media-flow) permits device release/reacquisition. This implementation fully stops tracks. Remembering [deviceId as a constraint](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints/deviceId) selects a prior source without keeping it active. Actual hardware opening still takes time.

## Verification and release

- Focused suite: **21 tests passed across five files**, including six new camera/buffer tests covering no pre-open capture, all-track stop, device-hint reuse, cancellation of late/hidden/superseded requests, explicit retry after refusal, frame cropping/bounded allocation and pixel clearing.
- `npm run build`: passed TypeScript and Vite. Client `index-BdD6ppLQ.js`; vision Worker unchanged `vision.worker-V4R-hgoC.js`.
- Chrome Play local host test, using a synthetic video rather than the physical webcam: first stable owl match **0.87s / 3 frames**, repeated after closing/reopening Lens **0.94s / 4 frames**. Returning showed both models ready and the inactive Lens/open button, without an automatic stream. No additional model downloads on re-entry. Screenshot ignored at `private/camera-ready-inactive.png`.
- These browser tests also showed remaining segmentation latency: WebGPU + WASM warm-up **36.19s**, then **14.53s / 11.20s** per captured photograph in this session. They validate the frame/capture/reuse path, not a universal instant cutout or a phone speed improvement. CPU smoke from the prior task was about five seconds per photo. Phone backend/latency acceptance remains necessary.
- `git diff --check` and local Markdown-link checks passed. `wrangler deploy --dry-run` passed (Worker 173.88 KiB / 57.34 KiB gzip).
- Deployed existing `hollow-court-preview` to Workers preview and `hollow-court.com`, version **`d7f40402-ff3a-41e5-b642-7cbd76361ddf`**, October 23 EDT. Only HTML and client bundle changed; model Worker/weights unchanged.
- Both hosts serve exact local `index-BdD6ppLQ.js` bytes with immutable caching; HTML is `no-store`. Public state stays sealed with preview off, guest camera references 404. Workers preview permits rehearsal with unauthenticated references 401. No API/schema/auth changes.
- Purchases/resources/schema/auth policy changes: none. No real guest data or physical webcam needed for automated tests.
- Remaining: real-phone camera opening latency, permission/indicator behavior and mobile memory pressure; follow the phone guide. Rejection/real-prop accuracy acceptance remains open from the earlier prototype.
- Dependencies on sibling tasks: none. Existing public time gate, preview-only guest camera pilot and private host access remain in place.
- Unpersisted details/access limits: all durable decisions are recorded here. Hardware cannot be guaranteed warm while inactive; the performance wins here are reused allocations/preferences and previously warmed models.
- Commits / unrelated dirty files: **`c6807bb`** implements camera preparation/release and docs; deployment-evidence documentation committed afterward. No unrelated dirty files observed. Local browser tab, proxy and Wrangler dev server have been closed/stopped.
