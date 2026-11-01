# All fifteen guardian awakenings

- Updated October 31, 2026, America/New_York; UTC date November 1.
- Checkout: shared `/Users/akshet/workspace/halloween-2026`, `main`; base `1ba43c2`.
- User authorized creating every missing guardian animation in parallel, pushing changes and deploying.
- Status: complete, pushed and deployed; all fifteen live previews verified. Actual phone hardware/performance and host aesthetic acceptance remain open.

## Authored assets

The existing fox and golden tree remain. Three parallel authoring groups inspected the actual private host reference photographs and created thirteen original textured-by-material, articulated 3D characters. No raw photos, scans, guest data, external modeling services or new dependencies are included.

- [Four woodland visitors](visitor-spirits-2026-10-31.md): raven gossip/wing flourish, barn owl adjudication, metallic gold stag/antler leaf, brown-and-cream hare/hesitant spring. [Builder](scripts/guardian-models/build-visitor-spirits.mjs).
- [Four house presences](house-spirits-2026-10-31.md): single spherical moon/listener, horned faun Keeper in its actual striped jacket at a desk, orange pumpkin/spider/chocolates, separate hornless long-muzzle skull/leaf. [Builder](scripts/guardian-models/build-house-spirits.mjs).
- [Five twig guardians](twig-spirits-2026-10-31.md): actual branch/moss lattice, tasselled triangle, triangle with upright/string, twine doll with green collar and crossed pentagonal opening. Each uses its own joining, offering, knock or welcoming performance. [Builder](scripts/guardian-models/build-twig-spirits.mjs).

Every asset has a deterministic source generator, self-contained GLB, SOURCE.md and checksum/metrics provenance in `src/client/assets/<art>/`. Five common clips: Idle, Awaken, Play, Settle, Greet. The shared stage supplies emergence and standard front-facing framing; individual clips supply the acting. Existing fox/tree clips retain their own timing and choreography.

## Review and checks at checkpoint

Separate agents reviewed each other's exported models and sampled moving renders in the real portrait component. Parent reviewed the fifteen-model identity gallery. Revisions include warmer twig highlights, a 35% larger stag face without enlarging the antler crown, a slight raven head turn for bill readability, more readable Keeper forehead spiral, connected joints/overlaps and corrected viewer-directed twig actions. These are desktop rendered reviews, not host approval or hardware FPS measurements.

Focused tests cover bounded files/geometry, no photo textures/external resources, deterministic checksums, exact clips, loop closure, clip joins, finite poses and relevant planted supports/contact. Visitors: 13 tests; house: 13; twigs: 10. Per-group briefs record exact artifact metrics and limitations.

## Integration work

The shared fifteen-character registry, two-template resident cache with per-opening owned geometry, generic clip sequencing, selected-character preload, foreground-cell entrance location, host **Preview selected guardian**, arrival stage warm-up and scanner routing are implemented. Pending loads deduplicate separately from resident templates and serialize one GLB parse at a time. The independent technical reviewer reproduced overlapping A→B→C→A loads in the first cache draft; the corrected implementation and regression test resolve that issue. Speculative loads wait for two consecutive matching frames, while actual acceptance retains the existing three-frame/500ms gate. All authored encounters skip mask inference; the private segmentation/movement editor remains available. The camera stream and recognition models/thresholds are unchanged. No puzzle, score, identity, invitation, clock, domain or access-policy changes.

Full `npm test`: **30 files / 217 tests passed**, including actual exported GLB joins/motion/resource limits, registry coverage, foreground entrance coordinates, bounded/deduplicated/serialized model loads and failure retry, plus existing camera, puzzle, scoring, access and QR checks. `npm run build` passed with TypeScript and pinned model checks. `wrangler deploy --dry-run` passed with the existing account/bindings/routes/config; 69 static files, including fifteen hashed GLBs. New models are approximately 184–512KB apiece, with no image textures. No recognition model or runtime dependencies changed. Root and separate agents reviewed each other's models in the actual renderer; mobile hardware FPS remains unmeasured.

## Published release and live verification

- Assets committed as **`2fa3c34`**; shared integration **`6ffb370`**. Both pushed to `origin/main`, along with the earlier guardian reference/story commits. No force push or branch/worktree creation.
- Worker/static deployment **`c52eabaf-8c4d-46e5-8f6c-f0f4d7a8db54`** serves `hollow-court.com` and the existing Workers preview. No DB migration or production data write in this animation task.
- Live entry **`index-CmBBet8_.js`**, SHA-256 `cce8ba3f64656212a7eb6b4cf76d3f26a6f9115e6ec629a7ee3c40e421da6187`, matched the tested build byte-for-byte. All **15 hashed GLB URLs** returned 200, immutable cache policy and exact local byte counts/SHA-256. Combined model size is 7,055,632 bytes; each is fetched on demand, not as one download.
- HTML stays `no-store`; camera availability true; public debug false; anonymous reference API 401; public debug API 404. Existing domain, access policies, event times, recognition thresholds and camera stream behavior remain intact.
- Signed-in production host page, **390×844 desktop Chrome viewport**: selected each of the fifteen guardians, opened its authored preview, waited for ready, replayed, tapped to greet, verified its identity/response and closed. All **15/15** passed; no console errors reported. This also exercised template eviction across the full roster, including existing fox/tree.
- Production scanner smoke: the enrolled green-lit Knotkeeper reference recognized, opened **The Knotkeeper awakens**, used its recognized foreground as the entrance and skipped segmentation (**0.00s**). Recognition was **0.34s** and preparation **0.66s** on this desktop browser; these are not phone measurements or held-out accuracy. The actual 3D twig figure now appears instead of the poor segmented cutout.
- Paused Knotkeeper, resized to **375×667** and **844×390**, inspected the retained model pose and readable controls/copy, then resumed and returned to references. Viewport override was reset. Production host tab remains ready for testing.
- Private evidence: `private/guardian-spirits-2026-10-31/` contains `deployment-verification.json`, `release-assets.json`, `live-preview-smoke.json`, phone/landscape screenshots and `guardian-roster.png`. No private screenshots/original photos are committed.

Actual iPhone/Android frame rate, repeated scanning and host aesthetic approval remain separate acceptance steps. Reload the [host reference page](https://hollow-court.com/host?tab=guardians), select any guardian and use **Preview selected guardian**, or recognize it through the live Lens. Existing open guest tabs need a reload to pick up this client release; their progress remains stored. No guardian is awarded Favor merely for its animation.

Optional continuous recording export is incomplete: the local phone harness completed an eleven-second moon canvas capture and displayed its save link, but the browser download-event call hung and was aborted before returning a filesystem path. No saved WebM is claimed. Publication is based on independent sampled moving-render reviews, structural/motion tests and live checks, not an invented thirteen-recording pass. The local recording control remains available for later inspection; no external service or guest data is involved.

## Shared work and private artifacts

Agents `/root/visitor_spirits`, `/root/house_spirits`, `/root/twig_spirits` authored and cross-reviewed isolated asset groups; parent serializes all Git writes. Preserve the unrelated pre-existing `decor/shopping-ready.md` edit. Reference originals and working screenshots remain ignored under `private/`; only original public-safe art/source is committed. No purchases or messages to other people.

Asset checkpoint: **`2fa3c34`**; deployed integration checkpoint: **`6ffb370`**. This documentation-only follow-up records verified release results and is pushed separately. Remote main was fetched and had no unmerged commits before release preparation. Final unrelated dirty file remains `decor/shopping-ready.md`.
