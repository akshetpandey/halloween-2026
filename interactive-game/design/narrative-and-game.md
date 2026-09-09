# Hollow Court — narrative and game design

Status: Working rules dated September 4, 2026; narrative approved September 8; costume voting and host award confirmed and implemented September 9. See the app README for deployed scope; broader finale and eligibility proposals remain open. Source: the host's requirements and assistant draft in [Interactive Succession Design](chatgpt-conversation://6a9af574-7854-83ea-980a-a9b43437c385), followed by the host's revised fifteen-entity brief. Draft prose and unconfirmed mechanics below are proposals for iteration.

## Requirements and proposals

The host requests a secret succession at the end of the party, seeded by volunteer gossip and kept off the invitation. The website opens at **8 p.m. on October 31**; guests register a name and costume selfie, remain recognized throughout the night, find NFC-linked entities, solve individual puzzles, earn Favor, compare costume selfies, and unlock invitations after their fourth and tenth successful entities. The website includes collectible entity art, rereadable lore and a live leaderboard with a top-three podium. Cloudflare Workers and other Cloudflare services are the intended future platform. Default closing is **2 a.m., adjustable by the host**. A separate physical winner's crown has an approximately **$100 target**.

The current physical target is **15 entities: 5 decor-integrated + 5 purchased figures, Amazon preferred + 5 homemade stick/straw figures with color accents**. Names, puzzle assignments, two of the five decor choices and specific purchases remain open.

Working title **Sovereign of the Hollow Court**, chapter copy, exact chapter thresholds other than the two Summons, two single-use referral tokens, overall ranking method and tie procedure are design proposals carried forward from the conversation. They are not new host approvals of every detail.

## Canon and secrecy

The current proposed fiction is [A Name for the Hollow](narrative-arc.md): the private compact, missing-name mystery, room roles, fifteen candidate character voices and finale live there. Its September 8 treatment develops the existing outgoing-Antler-King succession premise and replaces this brief's earlier short canon summary. The new details remain proposals for host review.

Tone: ancient woodland fairy tale, elegant, a little threatening, lightly funny, never an exposition lecture. Keep each screen brief. Before the finale, guest-facing copy must not explicitly name succession, a throne, a crown, a monarch or a winner's prize. Volunteers may spread suggestive rumors, including that a crown exists; the website and invitation preserve the reveal. The host/admin documents may state the full rules.

## Sealed entrance and arrival

Before opening, including when arriving through a deep link:

> **THE COURT IS CLOSED**
>
> Something beneath this house is still sleeping.
> Return when the eighth bell has sounded.
> Until then, the mortal invitation remains.

Show a stylized QR linking to the host's Partiful invitation, plus an ordinary tappable invitation link. Confirmed September 9: the host purchased **hollow-court.com** and authorized connecting it to the existing Cloudflare Worker. The short `/r` route redirects to Partiful; current deployment remains a rehearsal. The 8 p.m. site opening does not change the still-proposed 9:30 p.m. party doors.

On first entry after opening:

> **THE COURT REQUIRES A WITNESS**
>
> Leave the name by which we may call you,
> and the guise in which you arrived tonight.

Collect display name and costume selfie, with a plain notice that the image appears to participating guests for voting and standings. Confirmed September 9: no agreement checkbox and no guest recovery-key saving step. The host can find a guest by name and portrait and issue a three-word return phrase, valid for ten minutes and one use; Cloudflare email sign-in protects the host guest book. Activation of the host sign-in is tracked in the app handoff. Restore the same account on return without a repeated login. Preserve a pending entity or referral through registration. No email, social login or guest app required. Account recovery needs a practical host-assisted route. Confirmed September 9: remove guest account/portrait deletion and automatic seven-day expiry. Account data, progress and portraits are retained without an automatic deadline; expiring login sessions do not delete the account.

## Chronicle — an arc independent of discovery order

Entity lore stands alone, so guests can find the objects in any order. Main chapters unlock by **distinct Favors earned**, not scans, invitations, votes or total points. All unlocked passages remain in the Chronicle and can be reread after closing. These thresholds are an initial pacing proposal; fourth/tenth-Favor Summons are required.

The proposed triggers remain registration, 1, 3, 4, 6, 8, 10, 12 and all active entities (currently 15). The [current Chronicle passages](narrative-arc.md#chronicle--guest-facing-draft) replace the September 4 placeholder text. The story progresses from first recognition, through an unfinished record and invitations, to testimony awaiting the closing.

The twelve-Favor chapter is a late-act beat, **not completion**. Completion uses all active entities, currently fifteen. A guest who completes the collection can still use an outstanding Summons, reread lore and check Standing. The finale is event-wide, including for guests who have not unlocked every chapter; it must explain itself without requiring completion.

## Entity encounter and collection

Find an object → tap its nearby concealed NFC target → open its page → register if needed → read one short entity greeting → solve the assigned puzzle → earn **one Favor / one point** → illuminate its illustrated Bestiary card → read its lore → optionally visit the Looking Glass → return to the Court.

Target **20–45 seconds for most players and under 90 seconds for nearly everyone**, with the full encounter still under two minutes. Scanning alone earns nothing. A deterministic game + player + entity seed and persisted assignment restore the same puzzle across reloads, recovery and retries; an already-completed entity cannot score again. There are **no hints**. Attempts are unlimited, and failures may be theatrical but never punitive or locking. Brief Vision specifically replays the same scene after a failed answer. Art, sigil, name, discovered/earned state and earned lore remain in the collection. Unknown entities use fifteen silhouettes; do not expose hidden tag URLs through the collection.

Puzzle mechanics are designed independently of entity identity and assigned later. The [selected set](puzzles.md) contains fourteen approved families plus provisionally approved Unbroken Sigil; each eventual entity receives one coherent family and each guest receives a deterministic validated instance. Puzzle correctness may use only deterministic code, HTML, CSS, SVG and preauthored assets, never generative imagery. The earlier Moth, Fox, Judge, Crow, Hare, Archivist, Wight, Bride, Hearthling, Ferryman, Bell and Stag archetypes remain an optional naming pool, not a locked roster or mapping.

## The Looking Glass

Confirmed by the host September 9: replace pairwise comparisons with a lighthearted gallery. Every registered guest can give **up to three equal leaves to distinct other costumes**, with no rank among their choices. They can change or remove leaves until closing. The gallery uses a stable shuffle for each voter, preserves the full outfit photo, and never shows public vote totals or a costume popularity ranking. Late arrivals appear as they register; votes are opinions, not an objective measurement.

> **THE LOOKING GLASS**
>
> Which costumes will you remember tomorrow?
> Give a leaf to up to three favorites. Clever, strange, homemade, extravagant—all welcome.

The gallery is always accessible from the Court and navigation after registration, including at zero Favors. Signup explains its purpose and encourages a whole-outfit photo. Offer a small optional invitation after the first Favor and a gallery link in **Borrowed Eyes** at six Favors. Keep the four/ten-Favor Summons reveals focused on invitations. Voting is optional and never blocks progress or grants Favors.

The event reminder is hardcoded to **the first 1 a.m. on November 1, EDT (`2026-11-01T01:00:00-04:00`)**, before the New York rollback. Everyone with the site open receives an in-app invitation; returning registered guests see it before closing unless already acknowledged. Acknowledgment follows the player across recovery and prevents a repeat during the second 1 a.m. No background phone push, SMS or email is implemented.

At closing, voting stops. The signed-in host privately reviews totals and chooses **any registered costume** for the **+3 bonus**, including resolving ties or sparse participation. Guest leaves guide the choice; they do not automatically determine it. The host records a private note, reviews the named recipient, then publishes once. The award freezes costume voting and adds +3 to that player's overall Standing, without adding Favors or unlocking chapters/Summons. The gallery and Court celebrate only the recipient, with no public totals, losers, ranked costume list or required speech. Full game tie resolution and the succession ceremony are separate remaining work.

## Summons — invitations at four and ten

Each milestone grants one single-use invitation QR/token. A guest may choose **Not now**; the opportunity remains prominent on the dashboard and in Summons. September 9 visual direction: use woodland imagery woven through the QR, like the host’s artistic-code references. Preserve structural markers, contrast and clear space, and verify decoding. Compact invitation aliases and the host-owned domain reduce density. Include a copyable/tappable link and test actual phones before approving styling.

Award the inviter **+1 point only when a previously unregistered guest completes name/selfie registration through that token**. Existing players do not qualify. Each new guest credits at most one inviter; prevent self-referrals, repeated token use and duplicate registration retries from creating extra points. Proposed maximum is two referral points, one per Summons. A referee does not automatically receive a point for joining. Unused opportunities expire for scoring when the event closes.

**Confirmed by host, September 4: entities are NFC-only. QR codes are only for the Partiful link and guest invitations (Summons).** No entity QR codes, including hidden fallback codes. Helpers assist unsupported phones. This is an explicit confirmed requirement, not an inferred reconciliation of earlier notes.

## Scoring and live Standing

| Component | Points | Maximum |
|---|---:|---:|
| Each distinct entity puzzle solved | +1 | 15 |
| Each completed qualifying Summons | +1 | 2, proposed cap |
| Host-selected costume award after close | +3 | 3 |
| **Maximum final score** | | **20** |

Before close, show Favor + completed Summons: up to **17**. Display “The Looking Glass has not rendered its judgment.” Top three sit on a podium, followed by the rest and a clear view of the player's own standing. Ties before close should be visibly tied rather than implying a meaningful first place through arbitrary ordering. Finalization adds the costume bonus once and freezes the results.

Overall final tie ordering remains unapproved; current Standing visibly ties equal totals. The earlier proposal to use raw costume standing as a tie-break is superseded by private, advisory leaves and a host-chosen costume award. No speed bonus. Decide whether an absent/declining winner keeps the recorded game result while the physical honor passes onward; recommended approach is to preserve scores and distinguish the crown recipient. Host eligibility and willingness/presence rules remain open.

## Closing and finale

Default opening: **October 31, 2026, 8 p.m. EDT**. Default closing: **November 1, 2026, 2 a.m. EST**, after the clock rollback in New York. The latter is a proposed precise interpretation of the host's “2 am, maybe later”; show the date and time zone in admin. The game lasts seven elapsed hours under this schedule. Admin can extend, pause or close now, and guests see the current closing time. Extending before close must update the single authoritative deadline.

At close: stop new scoring and votes. The host reviews private costume totals and publishes the chosen +3 award once. Full game result snapshots and theatrical succession publication remain future implementation. If scoring needs repair, hold the reveal until reviewed rather than publish a changing winner. Reopening after finalization requires an explicit admin procedure; a repeated timer event must not award another bonus.

The [current finale sequence and host script](narrative-arc.md#finale--the-name-the-wood-will-keep) reveal the old compact and explain each form of testimony before recognizing the Sovereign. They replace the earlier seven-screen draft. The result must use the finalized scoring and eligibility rules above; fiction does not add another election, require fifteen Favors or guarantee the physical crown to an absent/declining winner.

The host gives a separate, photogenic crown, approximately $100. The host's fitted Antler King headpiece stays a separate costume item. No specific winner crown has been selected or ordered. Keep the ceremony short, avoid requiring a speech, and allow people to keep enjoying the party.

## Next design decisions

Prototype and playtest the selected puzzle families first, especially Unbroken Sigil's touch behavior; assign entities afterward. Confirm the two additional decor integrations and five bought figures; reconcile the revised prop allowance and crown with the party budget. Settle overall game ties, referral cap, host eligibility, absent winners, helper participation without a selfie and the precise closing-time interpretation. Domain connection, website artwork and rehearsal implementation are documented in the [app](../app/README.md); purchasing physical props, fabrication and final event readiness remain future work.
