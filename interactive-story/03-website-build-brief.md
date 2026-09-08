# Hollow Court — website requirements for later implementation
Status: Documentation only, September 4, 2026. **Do not implement application code in this task.** Plan for roughly 30–60 guests, with capacity/variant reserves. The [narrative/game design](09-hollow-court-narrative-and-game.md) is the current product brief; the [selected puzzle families](10-puzzle-design-proposals.md) await samples and playtesting, and the [physical roster](11-physical-entity-plan.md) remains iterative.

## Guest flow and pages
1. Before 8 p.m., every guest entry route shows the sealed Court, cryptic copy and stylized Partiful QR plus tappable link. Remember an entity/referral deep link for later entry.
2. After opening, first visit asks for display name and costume selfie with clear in-game display agreement. Return visits restore the same player without logging in again throughout the event. Resume the pending entity or Summons after registration.
3. An entity NFC URL opens that entity's greeting and the player's persistent assigned puzzle. A server-validated solution earns one Favor; a scan/page view never does.
4. Illuminate the illustrated Bestiary card, archive entity lore and newly unlocked Chronicle chapters, then offer one pairwise costume judgment. Missing/abandoned votes must not undo earned Favor.
5. At four and ten earned entities, unlock a persistent, deferrable Summons with its own QR/link. A qualifying new registration completes it for one point under the proposed cap.
6. Show live Standing with a top-three podium; before finalization, costume bonus remains pending. At close, stop scoring/votes, freeze results and present the secret succession finale.

Navigation: **The Court** (Favor, latest chapter, Continue and outstanding Summons), **Bestiary** (fifteen illustrated collection slots), **Chronicle** (all unlocked passages), **Standing** (live rankings and podium), **Summons** (unused/used invitations). The Looking Glass appears after each newly earned Favor and can resume an interrupted vote. Reopening earned entities shows collection/lore state without another award.

## Identity, images and recovery
Use a secure first-party, HttpOnly session cookie and server-issued player ID. Choose a session lifetime that comfortably covers the party, including post-midnight use. Never use display name as identity or silently merge matching names. Browser changes/private browsing can lose continuity; provide an admin-assisted recovery credential/flow and preserve puzzle assignments, Favors and invitations on recovery.

Selfies serve as avatars, contest entries and final portraits. Plan upload limits, supported mobile formats, preview/retry and sensible portrait cropping; bound/escape names and other text. Explain who can see the photos. Keep guest data off public indexing, avoid unnecessary trackers/contact details, and protect original uploads. Final photo/session retention and removal policy are open; do not carry over the old nickname-only cleanup plan without review. Consider guests who decline selfies as an explicit product decision.

## Hosting direction, not deployed architecture
The host selected **Cloudflare Workers with other Cloudflare services as backend**. Proposed service roles: Workers handles requests/rules, D1 holds structured game data, R2 stores guest selfies and entity artwork. Final services, cost, configuration and current API choices belong to the implementation task and must be verified then. No hosting skill/deployment procedure is being executed now.

Use a stable host-controlled HTTPS domain, with `hollow-court.com` only a candidate. No dependency on the Mac running music/TV. Entity links use opaque, unguessable tokens, e.g. `/s/<token>` as an illustrative route shape. Do not encode placeholder URLs. Keep hidden tag URLs out of public collection data and client bundles. Static NFC links remain shareable and do not prove physical presence.

## Planned records and invariants
| Record | Required responsibility |
|---|---|
| Event | Opening/closing instants, display zone, state, active entities, rules/puzzle versions and finalization snapshot |
| Entity | ID, private route token, name, family/theme, image, sigil, lore, active flag and physical register reference |
| Player/session | Stable ID, display name, selfie reference, display agreement, recovery and eligibility state |
| Puzzle variant/assignment | Validated prompt/answer or terminal state, game + player + entity seed, version and persistent assignment per player/entity |
| Favor | Unique event + player + entity completion, server time, normal/helper origin |
| Summons/referral | Milestone, inviter, single-use token, pending/redeemed state, qualifying new player and one-time point |
| Looking Glass vote | Issued ballot, voter, two eligible other players, choice, accepted time and deduplication key |
| Chronicle unlock | Earned entity-count threshold, preserved text/version and unlocked state |
| Admin action/final result | Authenticated actor, reason/time, corrections, costume award, frozen ranking and ceremony disposition |

Server rules govern answers, eligibility, awards, time and finalization. Use atomic writes/uniqueness so retries, two tabs and duplicate callbacks cannot create another Favor, referral point, vote or costume bonus. GET requests and link previews only display content. Do not send hidden answers with unsolved puzzles or trust client-calculated scores. Use bounded inputs and per-player/token limits that permit many guests on one Wi-Fi address.

## Puzzles and progression
Puzzle families are designed independently of entities and assigned later; each eventual entity has one consistent family. Generate each guest's instance deterministically from game + player + entity, include the puzzle version, and persist the assignment. As a starting capacity target for 30–60 guests, prove at least 100 materially distinct validated instances per selected family/entity, then adjust to the final attendance cap. If cross-player uniqueness is required, detect and resolve structural collisions rather than assuming a simple hash modulo a bank is unique. Handle capacity exhaustion explicitly. Puzzle correctness may depend only on deterministic code, HTML, CSS, SVG and preauthored assets; generative imagery may decorate a screen but must never carry required puzzle information. Reload/recovery/retry restores the same challenge, and Brief Vision replays the same scene after failure.

There is **no hint system**. Most players should solve each family in **20–45 seconds**, and nearly everyone should finish in **under 90 seconds**. Attempts are unlimited. Incorrect actions may produce a short theatrical response, but cannot remove Favor, reroll the instance, impose a timed failure or lock the guest out. Family-specific resets return to the same deterministic starting state.

Milestones use distinct successful entities, not scans or total score. Current proposed chapter thresholds are registration, 1, 3, 4, 6, 8, 10, 12 and all 15. Summons at 4/10 are host requirements. Completion count comes from active entities, currently fifteen. If admin disables an entity, record how maximum score, completion and already-earned Favors are handled; do not silently change eligibility midgame.

## Costume ranking and referrals
Present two other guests after each new Favor. Never self-vote; balance contestant exposure, avoid repeated pairs, support late entrants and keep ballot creation/submission idempotent. With fewer than two other eligible contestants, defer without blocking. Prefer adaptive pairwise ranking; Bradley–Terry is a proposed candidate. Decide sparse-voting/no-vote behavior, ties and late-entry fairness before build. Do not claim that a small sample proves an objectively best costume.

Summons tokens unlock at four/ten Favors, stay accessible after dismissal and credit only completed new registrations. One recruited player credits at most one inviter; no self-referral or credit for existing players. A token is single-use under the proposal, giving at most two referral points. Determine attribution before completing registration and preserve it through upload retries. A referral QR should register a guest, not expose an entity URL.

Current proposed arithmetic: live score = distinct Favors + qualified Summons, max 17. Final score adds 3 only to the costume winner, max 20. Ranking/tie procedure is in the game design; configure agreed rules explicitly rather than relying on incidental database order.

## Event clock and host controls
Proposed precise instants:
- Open: `2026-10-31T20:00:00-04:00` = `2026-11-01T00:00:00Z`.
- Close: `2026-11-01T02:00:00-05:00` = `2026-11-01T07:00:00Z`.

Display **America/New_York**, with date and EDT/EST in admin. The default close is after rollback, seven elapsed hours after opening. Host can edit opening/closing, extend, pause or close now. When editing a time within the repeated 1 a.m. hour, require an unambiguous offset. Server time is authoritative; clients refresh the current deadline and do not repeat finale actions at the clock change.

Admin needs authenticated controls for entity activation, player recovery/photo moderation, helper-completed puzzles, point corrections with reasons, voting diagnostics, live standings, final export and ceremony handling. Keep a helper's limited permissions separate from full admin control. Helpers explicitly select the guest player ID; never score a helper's ordinary account by accident.

Finalization: enforce cutoff against concurrent submissions; finalize costume ranking; apply bonus exactly once; compute tie rules; freeze/export a result snapshot; then release the theatrical reveal to current and returning clients. If votes/ties are insufficiently resolved, hold result publication for an explicit admin decision. An extension before close is normal; reopening a frozen result needs a deliberate audited operation and must not silently change a crowned winner.

## NFC and QR scope
**Confirmed by host, September 4: entities are NFC-only; QR codes are only for the Partiful link and guest invitations (Summons).** Physical entities keep concealed NFC URL tags with premade moon markers. **No physical QR fallback.** Test their styled frames for readability; provide ordinary links as well. Both preserve the intended onboarding destination.

Carry forward all [phone feasibility](01-phone-and-nfc-feasibility.md), [mounting](05-nfc-creature-figurines.md) and [permanent locking](08-iphone-programming-and-locking.md) gates. Resolve production domain/routes before locking; test each mounted tag, lock only after the full guest flow works, verify read-only and normal scan, then seal. No actual tag values or tests have been entered by this update.

## Acceptance checklist for the future build
- Two supported iPhones and one NFC Android: mounted scan, name/selfie signup, pending deep-link return, second entity, reload, same variant and account recovery.
- Valid/invalid answers, unlimited retry/reset without hints, repeat solution, two tabs, helper/normal duplicate and variant-capacity exhaustion; every family has a proven unique answer or terminal state.
- Four/ten distinct-Favor milestones, deferred Summons visible on return, new/existing/self-referrals, duplicate registration and simultaneous token redemption.
- Self-exclusion in ballots, too few contestants, late entry, repeat votes, interrupted voting, sparse/no-vote close and tied costume results.
- Fifteen collection slots, correct discovery/earned states, artwork, rereadable chapters, top-three podium, tied live standings and 17/20 score maxima.
- Before open, paused, exact cutoff, concurrent finalization, changed deadline, rollback, reconnect after close, absent/declining winner and one-time bonus.
- Weak connectivity and upload failure: no false success, safe retry, no lost pending entity/referral, no double points.
- Authenticated admin/helper boundaries, bounded uploads, escaped names, recovery, export, data cleanup and explicit photo participation.
- Direct NFC deep links on the hosted domain, actual invitation QR readability, no localhost/music-Mac dependency and a reconciled paper fallback.

These are future acceptance criteria, not tests already run. The [previous implementation brief](history/2026-09-04-before-hollow-court/interactive-story__03-website-build-brief.md.txt) preserves earlier requirements verbatim; instant claims, nickname-only onboarding, private-only standings, blanket QR ban and earlier timestamps are superseded.
