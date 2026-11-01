# Full guardian reference review for live testing

- Updated October 31, 2026, America/New_York; UTC date November 1.
- Checkout: shared `main`, `/Users/akshet/workspace/halloween-2026`; base `6048ff5`.
- Scope: completed upload batch, object-focused recognition, especially twig guardians. No puzzle, progression, invitation, score or event-clock changes.
- Status at checkpoint: reference updates live; code validated and ready to publish. Independent phone acceptance remains pending.

## Reviewed and saved

The host said all reference uploads were finished. Production snapshot: **59 photos across all fifteen guardians**. Thirty-six outlines already existed. Visually reviewed the new **22 photos**: four DEC-05 skull views and eighteen MAKE-01–05 stick/twine views. Added **21 object-focused profiles**, using the existing regional model and host outline format. The farthest skull view, like the farthest moon view, is too small for enough foreground grid patches; both originals and global features remain available.

Saved the outlines with validated conditional inserts, preserving any existing host edits, current reference ownership and the six-profile-per-guardian limit. Added one `vision_focus_review` audit row. No original images/vectors, movement profiles, guardian route codes, guest records or puzzle assignments were replaced. Private photos, descriptors, polygons, SQL and detailed case output remain under ignored `private/live-guardians-2026-10-31/` and in existing private runtime storage. Credentials and guest identities are not part of the review or committed output.

| Guardian | Reference views | Saved outlines |
|---|---:|---:|
| DEC-01 Moon That Stayed / listener | 3 | 2 |
| DEC-02 Gilded Root | 4 | 4 |
| DEC-03 Keeper of the Pulse | 5 | 5 |
| DEC-04 Last Seed pumpkin | 4 | 4 |
| DEC-05 Unfinished Guest skull | 4 | 3 |
| BUY-01 Black Correspondent | 4 | 4 |
| BUY-02 Very Certain Owl | 5 | 5 |
| BUY-03 Fox of Small Print | 5 | 5 |
| BUY-04 Stag at the Edge | 3 | 3 |
| BUY-05 Hare of Almost | 4 | 4 |
| MAKE-01 First Knock | 4 | 4 |
| MAKE-02 Ember Guest | 3 | 3 |
| MAKE-03 Knotkeeper | 4 | 4 |
| MAKE-04 Little Host | 4 | 4 |
| MAKE-05 Open Door | 3 | 3 |
| **Total** | **59** | **57** |

## Recognition change and comparison

[Recognition decision](src/shared/recognition-decision.ts) retains the automatic scene thresholds **0.80 similarity / 0.04 margin** and existing foreground thresholds. Besides the existing manual suggestion path (0.60 / 0.12), it now permits a **manual-only** scene choice at **0.70 / 0.08 when no foreground identity was accepted**. It does not displace accepted foreground evidence or grant an automatic wake. This recovers the dim First Knock case. [Regression test](tests/recognition-decision.test.ts) covers manual-only behavior, weaker/ambiguous rejection and preserving accepted foreground evidence.

Native CPU/WASM comparison uses production model preprocessing and matching. Each positive query is excluded from both galleries. Before: 59 global references and 36 existing outlines. After: the same global references, 57 outlines and the manual-only refinement. [Sanitized results](scripts/vision-lab/full-gallery-results-2026-10-31.json) contain no private reference identifiers or features.

- Original 59 views: **36 correct auto / 20 correct manual / 3 wrong manual** before; **44 correct auto / 14 correct manual / 1 unknown / no wrong identities** after.
- Eighteen minor-guardian views: **4 correct auto / 11 correct manual / 3 wrong manual** before; **11 correct auto / 6 correct manual / 1 unknown / no wrong identities** after.
- Quarter-brightness variants: correct auto/manual rose from 38 to 44; wrong manual fell from 7 to 2; 13 remain unknown. No wrong automatic positive identities.
- Blue-tinted variants: correct auto/manual rose from 41 to 46; wrong manual fell from 10 to 4; 9 remain unknown. No wrong automatic positive identities.
- Thirty-five object-absent crops: **33 rejected, one wrong automatic fox match and one wrong manual fox suggestion**. The two candy-only errors were already observed in the [pumpkin review](handoff-2026-10-31-moon-pumpkin.md); do not report this as a clean background pass. New crops include screens, plain cupboard/fridge panels, plants, wall/floor and the area below the dark stick figure. Crops were visually selected outside each subject's bounds.

The remaining original miss is the **green/cyan, extremely dark MAKE-03 Knotkeeper view with that exact reference withheld**. Its other three reference views offer the correct manual choice. That reference is included for real scanning, but this does not establish generalization to new phone frames. Do not lower automatic thresholds just to turn this result into a pass.

These are reviewed enrollment photographs plus synthetic transforms, not independent captures or unbiased production accuracy estimates. They do not establish phone latency, memory, real low-light robustness, motion-blur tolerance or performance with people behind the objects. No new weights, runtime or GPU path were introduced.

## Checks and deployment

- `npm run build`: passed, including TypeScript and pinned model checksum preparation.
- `npm test`: **26 files / 176 tests passed**.
- `npx wrangler deploy --dry-run`: passed; existing Cloudflare account, Worker, bindings, custom domain and clock retained.
- Production settings confirmed **0.80 / 0.04**; no guardian paused. Readback confirms all fifteen guardian IDs and the saved profile counts.
- Code publish/live asset verification: pending at this checkpoint.

## Phone test / remaining work

Reload [the host guardian page](https://hollow-court.com/host?tab=guardians), open **Test the Looking Lens → Open the live lens**, and start with Knotkeeper, First Knock and Ember Guest. Frame the entire figure and move close enough that the twine knots are clear; hold still through the three leaves. A correct **Wake …** button is an intentional manual confirmation, not a failure. Try the real changing room light and a fresh angle, including a view from which the object occupies less of the frame. Then check owl/hare and repeat scans. Do not take a retained-original/self-match test as proof of live recognition.

Prioritize actual phone feedback on the green-lit Knotkeeper, then the existing candy/fox hard negatives. All originals and their associations are preserved, so failures can be reviewed without re-enrolling the entire set. Game mechanics, fifteen IDs, single moon/listener, pumpkin identity and the authored fox/tree reveals remain as previously deployed.

## Handoff and Git

Own files: recognition decision/test, app README, camera prototype index, this handoff and sanitized result JSON. Commit the validated checkpoint on `main`, then record publication evidence in a follow-up commit. The pre-existing unrelated `decor/shopping-ready.md` edit stays unstaged. No purchases, messages, new dependencies, schema migrations or changes to access policies.
