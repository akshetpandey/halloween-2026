# Succession hunt • task tracker

**Current plan, September 4:** [Narrative/game](design/narrative-and-game.md), [puzzle workshop](design/puzzles.md), [15-entity roster](physical/entity-plan.md). September 9 update: [first Cloudflare rehearsal is deployed](app/README.md); physical pilot and final event/admin work remain open. Older “claim” checks below must now test puzzle-earned Favor; “no QR” applies to physical checkpoints, not the required Partiful/Summons invitation features. Dates are proposed planning targets, not scheduled automations.

| ID | Task | Priority | Target | Status |
|---|---|---|---|---|
| SUC-01 | Research no-app iOS/Android route | P1 | Sep 3 | Done — URL tags feasible; physical pilot pending |
| SUC-02 | Review voting/ties, referral cap, crown eligibility and precise closing time | P2 | Sep 13 | Ready to review — 15-entity target and host mechanics documented |
| SUC-03 | Confirm two volunteers and staging boundaries | P2 | Sep 20 | Needs input |
| NFC-01 | Select TAG-01 coins or TAG-02 stickers; arrange two iPhones and one Android | P2 | Sep 20 | Shortlist verified; buying and phone selection pending |
| WEB-01 | Select domain and later build the Cloudflare puzzle/Favor flow | P2 | Sep 27 | Rehearsal deployed Sep 9; permanent domain and final event work pending |
| NFC-02 | One finished base or separate moon touchpoint pilot on three phones; no QR | P2 | Sep 27 | To do |
| WEB-02 | Unique claims, recovery, admin and timing tests | P2 | Oct 4 | Scoring/recovery/DST tests pass; admin/finalization and real-phone tests pending |
| PROP-SUC-01 | Prepare 15 entities: 5 decor + 5 purchased + 5 homemade stick/straw | P2 | Oct 11 | To do — roster review and mounted prototype first; crown separate |
| SUC-04 | Volunteer walkthrough and fallback rehearsal | P2 | Oct 18 | To do |
| SUC-05 | Final counts, encoded tags and placement map | P2 | Oct 25 | To do |

## Pilot acceptance
A guest unfamiliar with the system should find the tap point, open the link, join with a name/selfie, solve the assigned puzzle and earn Favor without installing an app. Two different supported iPhones and one NFC-capable Android should work on the final mounted moon touchpoint. Verify visibility after glow fades. A repeated claim must not increase score. No physical checkpoint QR codes may appear; test the required website invitation QRs separately. Helper-assisted scoring must keep the correct player identity and avoid duplicate points. Test server scoring and cutoff before making more than one prop.

If the pilot is frustrating, revise tag size/placement and repeat the mounted test. If reliable phone reading cannot be achieved, propose a volunteer-led non-digital version or the preserved paper-only ritual; do not reintroduce QR codes. Success is a pleasant optional party interaction, not deploying a complicated game.

Current build tasks MOON-01–05: [bark spirits and moon touchpoints](physical/moon-touchpoints.md).

## September 4 • sourced purchases and programming gates

| ID | Task | Priority | Target | Status |
|---|---|---|---|---|
| NFC-SOURCE-01 | Verify Amazon tags, two animal multipacks and individual raven/owl | P2 | Sep 4 | Done — [prices, sizes and caveats](physical/amazon-figurines-and-tags.md); nothing bought |
| NFC-DOC-01 | Document iPhone writing and permanent read-only workflow | P2 | Sep 4 | Done — [procedure](physical/iphone-programming-and-locking.md); hardware untested |
| FIG-MIX-01 | Select exact pieces and touchpoint mounting within fixed 5/5/5 target | P2 | Sep 13 | Ready to review — two extra decor anchors and five bought figures proposed |
| NFC-WRITE-01 | Read chip/type and write/read back a prototype URI; rehearse locking on a spare | P2 | Sep 27 | To do — requires tags and current NFC Tools |
| NFC-FINAL-01 | Fix permanent domain, create unique tokens and fill private tag register | P2 | Oct 4 | To do — depends on WEB-01/02; no production URL yet |
| NFC-LOCK-01 | Encode final URLs, test each finished prop, permanently lock and verify read-only | P2 | Oct 18 | To do — after NFC-02, WEB-02 and NFC-FINAL-01 |
| NFC-LOCK-02 | Verify URL retained, same-URL write rejected, final mounted background scan passes | P2 | Oct 18 | To do — record separately for every active tag |
| NFC-SETUP-01 | Final shelf/lighting scan; helper map, blank spares and assistance rehearsal | P2 | Oct 25–31 | To do — no QR |

A production tag is complete only when URL readback, website flow, mounted scan and post-lock verification all pass. Research completion does not mark any physical test complete. The [empty register](physical/nfc-tag-register.csv) records chip/UID, URL, placement, phones/cases, tests and lock status. No test/lock date should be filled until performed.

## Hollow Court documentation and next design pass • September 4

| ID | Task | Priority | Target | Status |
|---|---|---|---|---|
| HC-DOC-01 | Integrate narrative arc, onboarding, Summons, voting, standings and finale | P2 | Sep 4 | Done — documentation only; draft rules identified |
| HC-DOC-02 | Record 15 entities in the requested 5/5/5 split and preserve previous notes | P2 | Sep 4 | Done — names/locations/purchases remain proposals |
| PUZ-01 | Select and document fifteen unassigned puzzle families, deterministic generation, retries and differentiation | P2 | Sep 4 | Done — fourteen approved; Unbroken Sigil provisional; no production bank |
| PUZ-02 | Build design samples and phone-test all families for 20–45 second typical solve time, especially Unbroken Sigil tracing | P2 | Sep 13 | All fifteen playable in rehearsal; real-phone timing/comfort playtests pending |
| PUZ-03 | Prove deterministic variant validity/capacity, then assign tested families to entities | P2 | Sep 20 | 9,000 valid generated samples checked; collision reservation, phone tests and final assignments pending |
| FIG-MIX-02 | Review Moon Well threshold and skull/branch shrine as decor anchors four/five | P2 | Sep 13 | Ready to review |
| FIG-SOURCE-02 | Compare five active Amazon figures and re-cost tags/mounts/five handmade pieces | P2 | Sep 13 | To do — retained listings need current offer checks |
| CROWN-01 | Source a separate photogenic winner crown around $100 | P2 | Sep 20 | To do — no item selected or purchased |
| RULE-01 | Decide sparse votes/ties, referral cap, host eligibility, absent winners and photo policy | P2 | Sep 20 | Needs input after proposal review |
| WEB-DESIGN-01 | Review revised guest/admin flow, uniqueness, QR scope and DST schedule | P2 | Sep 20 | Ready to review — Cloudflare chosen, domain pending |

September 9: website implementation is now in rehearsal; NFC fabrication remains future work. Earlier documentation completion did not imply a working site, artwork, validated bank, orders or encoded tags.

## September 8 — legacy NFC handoff reconciled

NFC-HANDOFF-01 complete: [source and coverage review](physical/handoff-2026-09-08-nfc-reconciliation.md). Amazon/app research requested by the old chat was already persisted. No new scope or budget decision; existing prototype, revised sourcing and implementation tasks remain open.

## September 8 — narrative treatment

| ID | Task | Status |
|---|---|---|
| HC-NAR-01 | Develop the existing succession outline into a coherent mystery, character cast and guest copy | Draft complete — [A Name for the Hollow](design/narrative-arc.md); proposed, ready for host review |
| HC-NAR-02 | Review the missing-name premise, compact, tone and fifteen candidate character voices | Ready to review — physical choices and puzzle assignments remain open |
| HC-NAR-03 | Adapt approved character copy to tested puzzle/prop assignments, then rehearse the finale | Pending narrative review, PUZ-02/03 and physical roster review |

The game brief and runbook link to the current narrative text. Existing scoring, Summons milestones, secrecy and physical scope are retained; no shared cost or scope decision changed. [Session handoff](design/handoff-2026-09-08-narrative.md). No code, artwork, purchase, deployment or playtest in this writing task.

## September 9 — first website build

WEB-BUILD-01 complete: [deployed rehearsal and evidence](app/handoff-2026-09-09-first-build.md). Host approved the narrative for implementation and requested the Cloudflare homepage, all guardians/puzzles, hex routes, debug jumps, invite/login/selfie flows and woodland Partiful QR. These are implemented and tested. HC-NAR-02 is complete for narrative direction; physical choices, final pairings and unresolved rules remain separate. No physical tags encoded, props bought or phone pilot performed.

## September 9 — account retention revision

Host requested removal of account/portrait deletion and the seven-day data expiry. [Implementation and verification](app/handoff-2026-09-09-retention.md): deletion UI/API removed, portrait expiry removed from storage and database, onboarding/account copy updated. Session recovery remains available.

## September 9 — phone-first puzzle revision

Implemented host feedback across encounter layout/typography and eleven puzzle families. [Current mechanics, evidence and reference context](design/puzzle-revision-2026-09-09.md). Preview version 2 keeps earned Favors and short routes; resets remain deterministic. Real-phone touch comfort and solve-time playtesting remain open.
