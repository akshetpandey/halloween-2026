# Hollow Court — narrative and game design

Status: Working rules dated September 4, 2026; narrative references updated September 8, 2026. Documentation only; no application built. Source: the host's requirements and assistant draft in [Interactive Succession Design](chatgpt-conversation://6a9af574-7854-83ea-980a-a9b43437c385), followed by the host's revised fifteen-entity brief. Draft prose and unconfirmed mechanics below are proposals for iteration.

## Requirements and proposals

The host requests a secret succession at the end of the party, seeded by volunteer gossip and kept off the invitation. The website opens at **8 p.m. on October 31**; guests register a name and costume selfie, remain recognized throughout the night, find NFC-linked entities, solve individual puzzles, earn Favor, compare costume selfies, and unlock invitations after their fourth and tenth successful entities. The website includes collectible entity art, rereadable lore and a live leaderboard with a top-three podium. Cloudflare Workers and other Cloudflare services are the intended future platform. Default closing is **2 a.m., adjustable by the host**. A separate physical winner's crown has an approximately **$100 target**.

The current physical target is **15 entities: 5 decor-integrated + 5 purchased figures, Amazon preferred + 5 homemade stick/straw figures with color accents**. Names, puzzle assignments, two of the five decor choices and specific purchases remain open.

Working title **Sovereign of the Hollow Court**, chapter copy, exact chapter thresholds other than the two Summons, two single-use referral tokens, costume-winner-only bonus, ranking method and tie procedure are design proposals carried forward from the conversation. They are not new host approvals of every detail.

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

Show a stylized QR linking to the host's Partiful invitation, plus an ordinary tappable invitation link. The working domain is `hollow-court.com`; availability, ownership and final URL are unconfirmed. The 8 p.m. site opening does not change the still-proposed 9:30 p.m. party doors.

On first entry after opening:

> **THE COURT REQUIRES A WITNESS**
>
> Leave the name by which we may call you,
> and the guise in which you arrived tonight.

Collect display name and costume selfie, with clear agreement that the image appears to participating guests for voting and standings. Restore the same account on return without a repeated login. Preserve a pending entity or referral through registration. No email, social login or guest app required. Account recovery needs a practical host-assisted route.

## Chronicle — an arc independent of discovery order

Entity lore stands alone, so guests can find the objects in any order. Main chapters unlock by **distinct Favors earned**, not scans, invitations, votes or total points. All unlocked passages remain in the Chronicle and can be reread after closing. These thresholds are an initial pacing proposal; fourth/tenth-Favor Summons are required.

The proposed triggers remain registration, 1, 3, 4, 6, 8, 10, 12 and all active entities (currently 15). The [current Chronicle passages](narrative-arc.md#chronicle--guest-facing-draft) replace the September 4 placeholder text. The story progresses from first recognition, through an unfinished record and invitations, to testimony awaiting the closing.

The twelve-Favor chapter is a late-act beat, **not completion**. Completion uses all active entities, currently fifteen. A guest who completes the collection can still use an outstanding Summons, reread lore and check Standing. The finale is event-wide, including for guests who have not unlocked every chapter; it must explain itself without requiring completion.

## Entity encounter and collection

Find an object → tap its nearby concealed NFC target → open its page → register if needed → read one short entity greeting → solve the assigned puzzle → earn **one Favor / one point** → illuminate its illustrated Bestiary card → read its lore → make a Looking Glass choice → return to the Court.

Target **20–45 seconds for most players and under 90 seconds for nearly everyone**, with the full encounter still under two minutes. Scanning alone earns nothing. A deterministic game + player + entity seed and persisted assignment restore the same puzzle across reloads, recovery and retries; an already-completed entity cannot score again. There are **no hints**. Attempts are unlimited, and failures may be theatrical but never punitive or locking. Brief Vision specifically replays the same scene after a failed answer. Art, sigil, name, discovered/earned state and earned lore remain in the collection. Unknown entities use fifteen silhouettes; do not expose hidden tag URLs through the collection.

Puzzle mechanics are designed independently of entity identity and assigned later. The [selected set](puzzles.md) contains fourteen approved families plus provisionally approved Unbroken Sigil; each eventual entity receives one coherent family and each guest receives a deterministic validated instance. Puzzle correctness may use only deterministic code, HTML, CSS, SVG and preauthored assets, never generative imagery. The earlier Moth, Fox, Judge, Crow, Hare, Archivist, Wight, Bride, Hearthling, Ferryman, Bell and Stag archetypes remain an optional naming pool, not a locked roster or mapping.

## The Looking Glass

After each newly earned Favor, show two other guests' costume selfies:

> **THE LOOKING GLASS DEMANDS A JUDGMENT**
>
> Which guise has captured the Court's attention?

One tap chooses; aim for five seconds. Rotate “Whose guise would the Court remember?” or “Which apparition commands the room?” Never display the voter's own image. If two eligible other contestants do not exist yet, keep the earned Favor and defer the vote. Interrupted votes should be recoverable without another score award.

Proposal: adaptive pairwise ranking rather than single elimination. Balance exposure, give late entrants opportunities, avoid repeatedly serving the same pair, compare uncertain rankings and include occasional broad comparisons. A Bradley–Terry-style approach is a candidate, not a finalized algorithm or a guarantee of accuracy. Before implementation, decide minimum evidence, sparse-vote behavior and ties with simulated guest participation.

At close, the top costume receives **+3 points** under the conversation's proposed interpretation of “costume contest is 3 points.” Other costumes receive no bonus. Keep the costume ranking separate from the game's overall standings.

## Summons — invitations at four and ten

Each milestone grants one single-use invitation QR/token. A guest may choose **Not now**; the opportunity remains prominent on the dashboard and in Summons. Use an on-theme border or frame while preserving readable code geometry, contrast and clear space. Include a copyable/tappable link and test actual phones before approving styling.

Award the inviter **+1 point only when a previously unregistered guest completes name/selfie registration through that token**. Existing players do not qualify. Each new guest credits at most one inviter; prevent self-referrals, repeated token use and duplicate registration retries from creating extra points. Proposed maximum is two referral points, one per Summons. A referee does not automatically receive a point for joining. Unused opportunities expire for scoring when the event closes.

**Confirmed by host, September 4: entities are NFC-only. QR codes are only for the Partiful link and guest invitations (Summons).** No entity QR codes, including hidden fallback codes. Helpers assist unsupported phones. This is an explicit confirmed requirement, not an inferred reconciliation of earlier notes.

## Scoring and live Standing

| Component | Points | Maximum |
|---|---:|---:|
| Each distinct entity puzzle solved | +1 | 15 |
| Each completed qualifying Summons | +1 | 2, proposed cap |
| Top Looking Glass costume at close | +3 | 3 |
| **Maximum final score** | | **20** |

Before close, show Favor + completed Summons: up to **17**. Display “The Looking Glass has not rendered its judgment.” Top three sit on a podium, followed by the rest and a clear view of the player's own standing. Ties before close should be visibly tied rather than implying a meaningful first place through arbitrary ordering. Finalization adds the costume bonus once and freezes the results.

Proposed final ordering: total score, then raw costume standing, then Favors, then an admin-recorded ceremonial lot if still tied. No speed bonus. Choose and document sparse-voting rules before build. Decide whether an absent/declining winner keeps the recorded game result while the physical honor passes onward; recommended approach is to preserve scores and distinguish the crown recipient. Host eligibility and willingness/presence rules remain open.

## Closing and finale

Default opening: **October 31, 2026, 8 p.m. EDT**. Default closing: **November 1, 2026, 2 a.m. EST**, after the clock rollback in New York. The latter is a proposed precise interpretation of the host's “2 am, maybe later”; show the date and time zone in admin. The game lasts seven elapsed hours under this schedule. Admin can extend, pause or close now, and guests see the current closing time. Extending before close must update the single authoritative deadline.

At close: stop new scoring and votes, finalize costume ranking, assign the bonus once, freeze a snapshot, then reveal to connected and returning guests. If scoring needs repair, hold the reveal until reviewed rather than publish a changing winner. Reopening after finalization requires an explicit admin procedure; a repeated timer event must not award another bonus.

The [current finale sequence and host script](narrative-arc.md#finale--the-name-the-wood-will-keep) reveal the old compact and explain each form of testimony before recognizing the Sovereign. They replace the earlier seven-screen draft. The result must use the finalized scoring and eligibility rules above; fiction does not add another election, require fifteen Favors or guarantee the physical crown to an absent/declining winner.

The host gives a separate, photogenic crown, approximately $100. The host's fitted Antler King headpiece stays a separate costume item. No specific winner crown has been selected or ordered. Keep the ceremony short, avoid requiring a speech, and allow people to keep enjoying the party.

## Next design decisions

Prototype and playtest the selected puzzle families first, especially Unbroken Sigil's touch behavior; assign entities afterward. Confirm the two additional decor integrations and five bought figures; reconcile the revised prop allowance and crown with the party budget. Settle voting confidence/ties, referral cap, host eligibility, absent winners, helper participation without a selfie, photo retention and the precise closing-time interpretation. Domain selection, artwork generation, purchasing, fabrication and application implementation are future work.
