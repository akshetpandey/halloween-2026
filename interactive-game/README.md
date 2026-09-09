# The succession of the Hollow Court
[Project home](../README.md) · [Design task](design/README.md) · [Physical/NFC task](physical/README.md) · [App task](app/README.md)

Status: Narrative approved for implementation and [first Cloudflare rehearsal deployed](app/README.md), September 9, 2026. All fifteen guardian trials, entrance, Summons and name/selfie flows are working. Physical pilot and final event/admin rules remain open.

Guests discover the secret through volunteer gossip. The site opens at **8 p.m. October 31**, collects name and costume selfie, recognizes returning guests, and sends them into an NFC hunt for the Court's Favor. Each solved entity earns one point. The optional Looking Glass gallery lets every registered guest give equal leaves to up to three favorite costumes; the host reviews private totals and chooses the final +3 recipient. Invitations unlock at four and ten Favors. At the adjustable closing time, default **2 a.m. November 1**, the site reveals the succession and the host awards a separate crown, approximately $100.

## Current scope and document map
**15 physical entities = 5 decor-integrated + 5 purchased figures, Amazon preferred + 5 homemade stick/straw figures with color accents.** Physical identities and puzzle assignments remain open. The three established decor anchors are moon light, golden tree and giant DJ creature; Moon Well threshold and a skull/branch shrine are proposed additions.

| Document | Purpose |
|---|---|
| [A Name for the Hollow](design/narrative-arc.md) | Approved narrative direction, Chronicle copy, fifteen character voices, Summons text and finale script |
| [Narrative and game](design/narrative-and-game.md) | Current mechanics, story integration, progression, Summons, voting, scoring and finale gates |
| [Selected puzzle families](design/puzzles.md) | Finalized fifteen: fourteen approved plus Unbroken Sigil provisional; deterministic generation, retry and distinction rules; no entity assignment |
| [Physical entities](physical/entity-plan.md) | Fifteen-slot 5/5/5 plan, reuse, sourcing and build gates |
| [Website app](app/README.md) | Deployed rehearsal, setup, implemented features and verification |
| [Website brief](app/build-brief.md) | Full requirements, including remaining event/admin work |
| [Volunteer runbook](volunteer-runbook.md) | Gossip, helper rules, timing and ceremony |
| [Tracker](task-tracker.md) | Documentation, design, sourcing and future build work |
| [Phone feasibility](physical/phone-and-nfc-feasibility.md) | Existing device research and real-phone pilot requirements |
| [Figurine construction](physical/figurine-construction.md) | Reusable tag/base techniques and earlier purchase notes |
| [Bark and moon touchpoints](physical/moon-touchpoints.md) | Reusable texture/mounting research; all-bark batch is superseded |
| [Amazon shortlist](physical/amazon-figurines-and-tags.md) | Previously researched products; older mix/budget retained as history |
| [Programming and locking](physical/iphone-programming-and-locking.md) | Future test-before-lock workflow and verification |

## Current versus historical requirements
The narrative/game brief governs current mechanics, the physical plan governs the count and category split, and the website brief translates these into implementation requirements. Earlier most-finds-only scoring, nickname-only registration, twelve entities, private-only standings and 12:30/12:45 a.m. closure/ceremony are superseded.

**Confirmed by host, September 4: entities are NFC-only; QR codes are only for the Partiful link and guest invitations (Summons).** No entity QR fallback. Existing phone assistance and permanent-lock testing requirements remain.

Current scoring: up to 15 Favors + 2 successful single-use Summons + 3 for the winning costume = **20**. Live standings show up to 17 before the costume bonus is resolved. The host resolves costume ties and chooses the +3 recipient once voting closes. Overall game tie rules, referral cap interpretation and crown eligibility still need review. Account/portrait retention follows the host’s [September 9 update](app/handoff-2026-09-09-retention.md). The website's 8 p.m. opening is separate from proposed 9:30 p.m. doors. Default 2 a.m. closing is interpreted as EST after rollback, with date/time currently configured in Wrangler; an editable event-clock dashboard remains pending.

[September 9 costume voting and host award implementation](app/handoff-2026-09-09-costume-leaves.md) includes the optional first-Favor prompt, Borrowed Eyes link, and first-1-AM EDT reminder.

## Budget and next iteration
The older $100 prop basket was costed for a different mix. Re-cost the 5/5/5 plan, charging only incremental NFC/mounts for decor already budgeted elsewhere. Keep the approximately $100 crown and hosting/domain separate. No new product prices or availability were checked in this documentation update; existing sourcing evidence stays dated.

Phone-test the implemented puzzle families, especially Unbroken Sigil, and review the two additional decor proposals next. Website pairings are rehearsal choices pending that review. Then select the five bought figures and five homemade silhouettes. The host supplied the Partiful event URL; it is configured in the app. The host purchased `hollow-court.com`; it now serves the time-gated public entrance and short invitation URLs, with debug confined to the Workers preview hostname. Final event routing and mounted NFC tests remain pending. [Build handoff](app/handoff-2026-09-09-first-build.md).

## Preserved history and fallback
Exact pre-update copies of this index, the overview, runbook and website brief are in [history](history/2026-09-04-before-hollow-court/README.md). Physical research, links and earlier cost calculations remain in their existing documents, with current-scope notices. The [Last Leaf offering-bowl ritual](design/last-leaf-fallback.md) is still available as a paper-only alternative; choose one main ceremony.
