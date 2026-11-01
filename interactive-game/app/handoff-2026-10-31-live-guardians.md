# Guest camera rollout and incoming reference review

- Updated: October 31, 2026, America/New_York.
- Session: open Hollow Court to guests and review uploaded guardian photographs for live recognition.
- Checkout: shared `/Users/akshet/workspace/halloween-2026`, `main`, base `9ec41c6`; no worktree or branch.
- Scope: independent public camera capability, guest Lens/prewarming, existing authored fox/tree reveals, manual recognition confirmation, private reference outlines and the documentation linked here.
- Status: **guest scanner deployed; first 33-photo batch reviewed and calibrated. More uploads and real phone results are pending from the host.**

## User decisions and entry points

On October 31 the host requested opening the guest page and reviewing incoming guardian photos for live detection. This supersedes the previous rehearsal-only camera rollout. The host subsequently confirmed **more guardians are coming**; do not treat absent uploads as reviewed or claim all fifteen objects have passed a test.

- [Host guardian uploads](https://hollow-court.com/host?tab=guardians): existing Cloudflare host sign-in → choose guardian → add actual photos.
- [Guest entrance](https://hollow-court.com/): already open at the first check because the configured **October 31, 8 p.m. EDT** opening had passed.
- [Guest scanner](https://hollow-court.com/scan): registered guests only, during the event. Existing closing time remains **November 1, 2 a.m. EST after rollback**, `2026-11-01T02:00:00-05:00`.
- Guests already on an old page should refresh once for the new frontend. Following an upload batch, leave/reopen the Lens to load its current reference gallery. A guest who stays in an already-open scanner retains that visit's gallery; no continuous polling was added.

## Implementation and deployments

- `CAMERA_DISCOVERY=true` enables the public scanner separately from `PREVIEW`. `/api/state` supplies `cameraAvailable`; debug remains confined to the configured Workers hostname/local development.
- Registration and event timing remain enforced for reference descriptors, movement data and encounter resolution. Original reference photos and enrollment stay behind Access/Worker host verification. Recognition resolves the existing trial and awards no Favor; puzzle validation is unchanged.
- Public name/selfie/recovery onboarding can warm recognition and segmentation. Camera-only retained-stream handling, no microphone, 12 fps ideal/15 maximum capture and three-frame confirmation remain unchanged.
- Existing fox/tree 3D performances now serve guests too. Their models and motion assets were not reauthored. Other guardians retain MagicTouch and can enter their puzzle before outlining completes.
- Distinct weaker whole-object matches offer a **Wake [guardian]** confirmation with similarity ≥0.60 and gap ≥0.12. These thresholds produce manual suggestions only. Automatic baseline thresholds remain **0.80 / 0.04**; regional thresholds/model remain unchanged.
- When regional and whole-object rankings disagree, require a tap instead of automatic awakening. A distinctly supported whole-object candidate is preferred for that confirmation. This prevented the observed synthetic dark-lamp → stag auto-wake in the reviewed dataset.
- Code `64439d0`: guest camera rollout. First Worker version `b16e3781-f359-4dcb-a3b2-b3624656b697`.
- Code `c252041`: measured confirmation/conflict adjustment. Current Worker version **`481ad9e0-9caa-4691-9a27-7a7bf3de3fa8`**, on `hollow-court.com` and the existing Workers hostname. Current entry `index-V3jp1U9I.js`.

## Reviewed enrollment and external data changes

| Guardian | Saved photos | Saved outlines |
| --- | ---: | ---: |
| Black Correspondent / BUY-01 | 4 | 4 |
| Very Certain Owl / BUY-02 | 5 | 5 |
| Fox of Small Print / BUY-03 | 5 | 5 |
| Stag at the Edge / BUY-04 | 3 | 3 |
| Hare of Almost / BUY-05 | 4 | 4 |
| Moon That Stayed / DEC-01 | 3 | 2 |
| Gilded Root / DEC-02 | 4 | 4 |
| Keeper of the Pulse / DEC-03 | 5 | 5 |

Reviewed all 33 photographs, added **27 outlines** to the five previously configured views, and verified **32 persisted outlines** across these eight guardians. Two private review audit records were added. Original photos/vectors and existing host edits were preserved; conditional inserts skipped existing outlines and enforced the six-view per-guardian cap. No other guest/game data was changed. The smallest distant moon supplied fewer than two foreground patches, so its original reference was retained without inventing an object outline. Recommended a closer moon view with visible crater texture, plus actual party-light/angle views.

Originals, vectors, polygons, SQL, reference IDs, scripts and screenshots remain in ignored `private/live-guardians-2026-10-31/`. `*-initial.json` preserves the first 12-view pass; `*-first33.json` preserves the reviewed 33-view snapshot. No guest identities or private photos belong in Git. No new model, dependency, product, purchase or permission grant was introduced.

## Measurements and verification

[Sanitized results](scripts/vision-lab/party-results-2026-10-31.json) record the **108-case** comparison. Each positive query's own image was excluded from both galleries. Native single-thread CPU/WASM and Sharp preprocessing were used; browser resampling may differ.

| Query set | Correct automatic | Correct tap suggestion | Wrong automatic | Wrong suggestion | Unknown |
| --- | ---: | ---: | ---: | ---: | ---: |
| 33 original photographs | 27 | 6 | 0 | 0 | 0 |
| 33 synthetic quarter-brightness variants | 9 | 15 | 0 | 2 | 7 |
| 33 synthetic blue-tinted variants | 17 | 9 | 0 | 2 | 5 |
| 9 off-object background crops | 0 | 0 | 0 | 0 | 9 |

These are tuning checks on a small enrollment set, not an independent party accuracy or false-positive-rate estimate. Crops and digital darkening do not simulate phone noise, exposure, motion, people or actual colored light. No new live iPhone/Android result has been reported yet. The host was asked to try owl/hare live and report auto-wake, correct confirmation, or miss/wrong identity.

- **175 unit checks passed** across the final non-QR suite (145) and the separately rerun QR suite (30). Initial native QR execution was blocked by the filesystem sandbox; the escalated rerun passed, retaining the pre-existing heavy-blur QR limitation.
- **6/6 local integration checks passed** with the historical sealed-entry fixture configured using future dates only on its local CLI server. The first run used tonight's now-open dates and failed two historical sealed assertions (4/6); production dates were never moved. New rollout unit tests explicitly cover live-open, sealed/closed, registration, descriptors-only privacy, disabled rollout, debug isolation and encounter resolution without points.
- Build/typecheck and Wrangler dry-run passed before deployment; the final client-only decision adjustment also passed build/typecheck and its full non-QR suite.
- Public live state confirmed `status=open`, `cameraAvailable=true`, `previewAvailable=false`. Anonymous descriptors returned **401**, debug **404**, private host API **302** to Access; pinned regional model returned **200**.
- Actual deployed host **Test this reference** recognized the owl and produced its MagicTouch cutout. Desktop diagnostic: approximately **0.14 seconds** recognition and **0.04 seconds** outline inference; cold preparations were separate (3.27/7.48 seconds). This is a self-reference reveal smoke test, not held-out accuracy or a phone latency result.
- A separate local saved-photo guest browser fixture was not completed: the Chrome automation file chooser did not arrive, and Vite development serving differed from the Worker for the MagicTouch module. Do not claim that fixture passed. Production model processing was checked through the actual host UI instead; original-source-excluded comparisons are the offline measurements above.

## Continuation, risks and rollback

1. Continue reviewing new uploads when they arrive; compare identities against the full current gallery, including negative backgrounds, before saving new outline profiles. Recheck counts rather than assuming this table is final.
2. Obtain the pending live phone result. Add useful close/lighting/angle references for failures. Keep original uploads and avoid lowering automatic thresholds from positive-only tests.
3. Remaining seven guardian slots have no photos at this snapshot. Keep their IDs and puzzle assignments; do not invent enrollments or claim fifteen-guardian coverage.
4. For a reversible public scanner rollback, deploy `CAMERA_DISCOVERY=false`; public debug must remain disabled. Reference originals/data remain stored. Older frontend pages need refresh for any code change.

No cost changes or sibling-task changes were made. The unrelated `decor/shopping-ready.md` edit was present before this work and must remain untouched. This handoff and release notes are the final documentation checkpoint; report its commit separately from code commits. Owned local Worker/Vite test servers and the temporary guest fixture tab were closed. The host upload tab is retained as the user-facing deliverable. Final public entry bytes match the tested build; documentation links, sanitized JSON and whitespace checks passed.
