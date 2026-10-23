# Fox reference and awakening pilot

- Session title: Test the host's three fox references and describe the awakening.
- Updated date: October 23, 2026, America/New_York.
- Scope / owned files: app README, phone walkthrough and this evidence handoff. No source changes.
- Checkout, branch and base: shared `/Users/akshet/workspace/halloween-2026`, `main`, base `4912761`.
- Status: saved-photo flow verified; ready for held-out phone and physical-object testing.
- Confirmed user evidence: the host test page now opens on iPhone Chrome; the host added three fox photos and requested a recognition/awakening test. This confirms initial page stability, not phone inference or repeated scans.
- Proposals awaiting decision: none. Calibration settings remain unchanged.

## Test and findings

- Authenticated Wrangler reads confirmed three `BUY-03` references, all using `mobilenetv3-small-f32-b1a19675-features-v2`. The fox is the only enrolled guardian; no room-background negatives are enrolled. Threshold is 0.80 and margin 0.04. No remote data was changed.
- Copied those three private JPEGs/features into ignored local fixtures and an isolated local D1/KV persistence directory, using fresh local guardian route codes. Ran the existing production frontend and local signed host fixture through the loopback-only proxy. Production Access protection and existing local database state were unchanged.
- Chrome Play on Mac, first fox photo: recognition preparation **1.72s**, outline preparation **2.31s**, warmed recognition **0.08s**, new-photo outline **0.84s**. Correctly identified **The Fox of Small Print** with similarity **0.938**. This photo was in the reference set, so the result is a flow check rather than independent accuracy evidence. Similarity is not a probability; a single enrolled guardian also makes the gap uninformative about confusion with other guardians.
- The actual photo produced a usable cutout of the fox's head, body, legs and much of its tail. The upper tail tip remained in the darkened background. Default mask area was 7.1%; foreground score was 0.977, which is not a measurement of outline accuracy. No tap-refinement quality claim is made.
- Animation observed: a gold scan line during tracing, dimmed/desaturated photo background, gold glowing foreground cutout rising slightly and then floating, drifting gold pollen, illustrated fox avatar, name and text greeting. The greeting reads: “The terms are before you. I do recommend reading them.” No 3D tracking, head/limb articulation or spoken audio. Reduced-motion preferences disable the movement.
- Host test ends with **Back to reference photos**; guest rehearsal uses **Hear its trial**, available before the cutout completes. Corrected that distinction in the phone guide.
- Leave-one-out check using the actual saved feature vectors and shared matcher: holding out each reference and comparing to the other two gave **0.7794 / 0.7257 / 0.7794**, all rejected as weak under current calibration. This is a limited vector comparison, not fresh camera inference. More close views/angles and background negatives are needed before assessing recognition quality or lowering thresholds.
- Private local evidence remains ignored under `private/fox-pilot-2026-10-23/`: original photos, metadata/features, isolated state and actual awakening screenshots. None are committed, nor are production KV keys, tokens or guardian route codes.

## Verification and next actions

- Actually run: authenticated production reference/settings reads; actual-model browser saved-photo recognition and MagicTouch outline; visual verification of cutout, name/greeting and animation; shared-matcher leave-one-out comparison; Markdown link validation and `git diff --check` for documentation.
- No source changes, build, full test-suite rerun or deployment in this session. Existing deployed version remains `3781fcb7-336a-4922-a298-3484b604f28b`, with the crash correction implemented in `f12ec5e`.
- Next: on iPhone, open [host guardian photos](https://hollow-court.com/host?tab=guardians), choose **Test the Looking Lens**, wait for **Lens ready · awakening ready**, and use **Choose a photo**. A saved reference can show the animation; an untrained photo tests recognition. Record the actual iPhone timings and whether the whole fox is outlined, then test live camera capture, camera release and repeated Lens visits.
- Add closer views from different sides/distances and intended room lighting, then enroll background negatives and another guardian. Test rejection before changing calibration. LiDAR is unnecessary.
- Remaining limitations: physical iPhone recognition/outline performance and stability, held-out photographs, live physical-object scanning, dim-light accuracy, whole-tail masks and false-accept behavior remain unverified.
- Dependencies on sibling tasks: none.
- External changes: read-only Cloudflare access; no deployment, resource creation, permission change, production enrollment or calibration mutation.
- Cleanup: temporary browser tab and local proxy/Worker servers closed/stopped after verification.
- Commit(s) / unrelated dirty files: documentation checkpoint follows this handoff; no unrelated dirty files observed before editing. Private test evidence intentionally remains ignored.
