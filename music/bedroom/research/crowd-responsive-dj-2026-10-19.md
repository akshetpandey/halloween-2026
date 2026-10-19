# The Hollow · crowd-responsive DJ decision loop

Researched October 19, 2026. **Proposed design, not an implemented or tested crowd reader.** Scope: a 30–60-person apartment party with a smaller, changing bedroom dancefloor; high-energy techno, tech house, DnB, acid and trance. No camera, microphone or wearable was accessed; no guest data was collected, service enabled, software installed or playback changed. Sensor activation and guest participation remain host decisions.

## Recommendation

Use a **prepared DJ queue with a helper supervising limited next-track choices**. Add four helper controls: **Hold course / More bounce / Ease slightly / Exit this track soon**, plus separate manual playback and emergency quiet controls. Optional guest reactions can inform the helper. Begin in advisory mode: recommend a next track, explain why, and let the helper queue it using the tested DJ application. There is no established integration here that can safely reorder the installed rekordbox Automix queue on demand.

An optional camera could later provide **local, coarse floor occupancy and relative motion**, with a quality flag. Treat those as observations that can prompt a check, never as proof that guests like a song or as an automatic command to skip. For this event, helper context is more useful than a complex online reinforcement-learning experiment. If nobody is supervising, the rehearsed queue should continue independently.

This is a separate layer from [the playback engine/source research](../auto-dj-research-2026-10-19.md). Good track analysis and good automatic transitions do not supply audience understanding.

## What the evidence establishes

| Primary system / study | What was actually demonstrated or proposed | Limit for this party |
|---|---|---|
| **hpDJ**, Dave Cliff, HP technical report 2005 / later book chapter | Automatic selection/mixing; proposed crowd feedback via venue sensors or voting devices. The report explicitly explains why a dancefloor headcount lacks context without knowing how many people could be dancing. It distinguishes an earlier nightclub test from the later crowd-responsive version, which had not yet been tested in a real nightclub. [Author report](https://eprints.soton.ac.uk/262144/1/HPL-2005-88.pdf) | Historical architecture, not a validated current product or evidence that camera movement reliably measures preference. We should not instrument the whole apartment merely to obtain a denominator. |
| **Sensing Dance Engagement for Collaborative Music Control**, Kuhn et al., IEEE ISWC 2011, DOI 10.1109/ISWC.2011.17 | Smartphone acceleration plus its relationship to the music distinguished dancing from other activities; the abstract reports 86.8% overall accuracy. A separate, constrained bar experiment involved 11 participants, assigned dancing/non-dancing roles and two-minute excerpts. [Institutional paper](https://tik-db.ee.ethz.ch/file/f2cb3e997eed9560534a7ba5551d2d2e/) | Dance classification is not song-liking accuracy. This phone-sensor study does not validate laptop-camera inference under costumes, crowding and party lighting, or a complete autonomous DJ. |
| **Multi-Motion Crossfader**, Kobayashi and Nishikado, Keio research prototype | PoseNet-based people counting drives the crossfader toward the side with more people, deliberately letting spatial movement influence the mix. [Lab project](https://cclab.sfc.keio.ac.jp/projects/multi-motion-crossfader/) | A participatory interaction prototype, not an evaluation proving that passive movement reveals musical preferences. Guests intentionally choosing a side is a different input from incidental movement. |
| **DJ-MC**, Liebman, Saar-Tsechansky and Stone | Models both song and transition preferences, learns from feedback, and evaluates simulation plus laboratory listeners; the human study used 47 participants. [Author paper](https://arxiv.org/html/1401.1880) | Supports considering sequence context rather than independent track scores. It does not validate anonymous camera feedback, live club operation or learning a stable group preference within one small party. |
| **DJs’ Perspectives on Interaction and Awareness in Nightclubs**, Gates, Subramanian and Gutwin, DIS 2006 | Interviews with 11 DJs describe varied crowd cues and planning several songs ahead; participants resisted simplistic crowd-control technology. [Author paper](https://vjcarriegates.com/wp-content/uploads/2015/08/dj_perspectives_on_interaction_and_awareness_in_nightclubs-carrie_gates-2006.pdf) | Qualitative practitioner evidence, not an algorithmic accuracy benchmark. It supports retaining helper judgment and musical pacing rather than a raw popularity contest. |

These studies make a feedback loop plausible. They do not establish a reliable universal function from visible movement to enjoyment. The design below is our proposal, including all thresholds and timing windows; it is not a result claimed by those papers.

## Product claims checked

| Product / category | Current official evidence | Assessment |
|---|---|---|
| **djay Automix / Matching Songs** | Automatic/manual transition points, song range and next-track matching based on the playing song. [Mac manual](https://help.algoriddim.com/user-manual/djay-pro-mac/mixing-basics/using-automix) | Track/transition intelligence. This documentation does not establish passive audience sensing. |
| **Spotify DJ** | Explicit requests adapt a personalized session using the request and listening preferences/history. [Spotify announcement](https://newsroom.spotify.com/2025-05-13/dj-voice-requests/) | Personal recommendation feedback is not an apartment crowd sensor or control API for our DJ engine. |
| **Rockbot Request** | Guests request and vote on tracks, with choices filtered through a venue’s approved playlist. [Official product](https://rockbot.com/request) | A concrete explicit-feedback pattern, without inferring emotion from guests. This is a design reference, not a recommendation to buy a venue subscription. |
| **crowdDJ / Nightlife** | Approved venue lists, requests, guest credits to limit repeated picks, and host queue control. [Venue product](https://www.nightlife.com.au/crowddj) · [Controls guide](https://support.nightlife.com.au/knowledge-base/crowddj-controls/) | Useful moderation mechanisms. Its Host Mode removes same-artist limits, so our own concentration constraints would still be needed. No camera-based preference validation was found in these reviewed guides. |
| **pULPi** | Its own site claims camera/wearable crowd sensing, gestures and biometrics; it solicits early-access signups for macOS. [Vendor site](https://pulpi.app/) | The page does not provide a reproducible crowd-response evaluation or establish compatibility with this rig. Do not mistake an early-access claim for party-ready evidence. |
| **KiKi DJ** | Vendor claims camera-based engagement, facial-expression analysis, frequent adaptation and local processing. [Vendor site](https://www.djinsta.com/) | Marketing claims were verified as present; accuracy, privacy implementation, licensing, reliability and integration were not independently verified. Facial/emotion inference is outside the proposed system. |

No examined product supplies enough evidence to replace this party’s rehearsal with a promise of automatic crowd understanding. This is a bounded review, not proof that no other commercial product exists.

## Separate three kinds of information

1. **Track properties:** exact recording/version, actual-file BPM and grid, key, arrangement sections, mix points, gain, genre/chapter and an editorial energy/bounce label. Catalog energy or valence describes a recording according to a provider; it does not describe the room’s current mood.
2. **Room observations:** helper direction, optional explicit reactions, estimated occupancy/motion and observation quality, synchronized to the audible track and musical section. These are incomplete, contextual signals.
3. **Decision policy:** choose among approved, available tracks with rehearsed transitions while respecting phase, artist/alias concentration, tempo constraints, closing time and manual control. A high predicted preference cannot make an untested 128→174 BPM beatmatch acceptable.

Keep the host’s durable Playlist Lab Keep/Cut decisions separate from transient party reactions. A guest liking a track must not overwrite a host Cut; someone leaving the floor must not create a permanent dislike. A track can be good but wrong for this moment or this audience subset.

## Minimum viable inputs

| Input | Proposed interpretation | Safeguard |
|---|---|---|
| Helper **Hold course** | The current direction is working or no change is warranted | Clears pending automatic suggestions; does not require constant button pressing |
| Helper **More bounce / Ease slightly** | Pick a different texture/density within the present chapter | Do not translate automatically into higher BPM, louder output or a genre jump |
| Helper **Exit soon** | Prepare the next reviewed safe exit | Show the proposed exit and next track; distinct from emergency quiet/stop |
| Optional guest **More like this / Less like this** for the current track | A self-selected participant’s contextual preference | One effective reaction per ephemeral session per track; show participant count and conflicting votes; sparse/non-votes are unknown |
| Optional requests | A preference among approved, ready candidates | Restricted shortlist, rate limits and helper veto; no arbitrary search-to-deck path |
| Optional camera occupancy + motion | Relative activity inside a defined bedroom floor region | Local processing, confidence gating, no identities or preference label; advisory only |

For the first rehearsal, the helper and a prepared queue are enough. A later guest page would need its own scoped, temporary participation capability; do not expose the host’s Cloudflare-protected review/admin library to make requests easy. Device/session rate limits reduce casual repeat voting but do not prove unique people or prevent coordinated voting. Show counts honestly rather than calling a few phones “the crowd.”

### Optional local camera proposal

If the host later chooses this, fix one view of the dance area and exclude doorways, seating and private spaces as far as practical. Process frames in memory locally. Emit only coarse occupancy, robust relative motion and quality summaries; discard frames and short-lived tracking state. No face recognition, face crops, identity embeddings, persistent person tracks, demographic inference, emotion inference, biometric wearables or microphone input are needed. Keep a visible camera-off control and indicator. Local/non-recorded imaging still observes guests; it is not automatically anonymous just because a video file is never saved. Communicate the chosen setup before use and provide a practical unsensed area.

A person detector plus motion within person masks is a possible engineering route; simple whole-image pixel change will respond to lighting and projections. Even person-mask motion is an activity proxy, not verified dancing. Keep occupancy and motion separate rather than making a single opaque “vibe score.” As a starting proposal, summarize 30-second bins, smooth over roughly 90 seconds, and require multiple consistent high-quality bins before showing a trend. Retain only a short operational rolling window; any longer aggregate log and its deletion schedule need a separate decision.

Low light, strobing, moving projections, masks/large costumes, occlusion and camera movement can invalidate estimates. Mark occluded/stale/unstable input **unknown**, never zero activity. Calibrate with the actual decor and music before enabling even advisory output. A failing sensor must be removable without interrupting playback.

## Proposed adaptive policy

**At each upcoming transition, rank a small set of eligible alternatives; keep the prepared queue as the default.** Eligibility comes first: host-approved exact file, available source, correct current chapter, reviewed incoming/outgoing transition, tempo/pitch bounds, artist/alias and repeat limits, and sufficient remaining prepared duration. Freeze the loaded/committed next deck so late votes cannot repeatedly replace it.

Use the helper’s direction to select among these alternatives. Explicit guest reactions can provide a small, bounded preference adjustment. Optional activity trends can generate a prompt such as “floor activity falling; check context,” but cannot by themselves force a skip or genre/tempo change. Until a real supervised pilot establishes thresholds, there is no justified numeric camera-to-preference weight. The UI should expose evidence and uncertainty, not a spurious percentage confidence that a song is liked.

Suggested starting rules to rehearse:

- Require at least two completed tracks between policy-driven changes of energy direction; move at most one qualitative step at once. Preserve the scheduled arc and approved energy ceiling. A helper can override deliberately.
- If the floor is empty or contains only a few people, continue the planned groove or ask the helper. Do not respond by escalating BPM until somebody moves.
- Favor changes within a chapter. DnB entry/exit and big tempo/genre resets remain deliberate, rehearsed chapter boundaries, not reactions to one low-motion window.
- Do not optimize maximum movement. Keep groove, variety and recovery; movement may fall during a good breakdown and return at the drop. More physical motion is not necessarily greater enjoyment.
- Never increase volume in response to a sensor or vote. Manual lowering/stop persists; closing time and the explicit-offset schedule cannot be extended by positive feedback. The repeated November 1 hour must not restart the peak.
- No live learning that explores unapproved tracks or rewrites durable host taste. Initially use transparent rules and a prepared shortlist; assess broader learning after the event, with appropriate data decisions.

### Rewards lag; do not blame the wrong song

The track becoming audible, the end of its intro, its first substantial drop, a transition and a guest’s reaction happen at different times. Record the audible track and section from the playback engine if a tested interface exists; otherwise let the helper confirm it. If track identity/position is stale, stop adaptation rather than identifying music through a microphone.

Measure reactions after a useful musical section, not immediately on load. Proposed initial windows can ignore the first 45–60 seconds after a transition and assess the following main section, but actual arrangement cues should override that generic timing. Exclude known breakdowns and major fades. Let effects on the following track remain part of the sequence context; do not assign every departing person to the current song.

Two people fetching drinks can halve a four-person floor. Guests also move for the game, conversation, bathroom, temperature, arrivals and social connections. A crowd total of 30–60 does not mean 30–60 simultaneous independent dancefloor measurements. Repeated windows from the same few people are not new votes. Compare like musical sections and nearby context, record helper explanations such as “drinks break,” and allow **unknown / no action**. Occupancy plus motion cannot establish a causal effect of a track, infer why somebody left, or tell whether the people outside the room dislike the music.

### Early exits and manual takeover

A negative guest reaction or one activity dip should not chop a track. A helper can request **Exit soon**; use a pre-auditioned phrase/exit marker once the intended musical payoff has had a chance, then mix into a compatible reserve. Wait through a planned breakdown unless the helper deliberately overrides. If there is no validated exit/next pair, keep the existing safe ending rather than improvising an untested automated cut.

For this event, any proposed sensor-triggered early exit should require helper confirmation. Immediate manual next/pause/quiet remains separate and authoritative. Disabling adaptation must leave the current music and prepared queue running. When manual DJ control starts, suspend automatic queue changes until the helper explicitly resumes them. If the controller cannot detect takeover reliably, keep the entire feedback layer advisory.

## Evaluation before the party

Start with **synthetic events and an advisory-only dashboard**, requiring no camera or guest data. Test: no input, one enthusiastic voter, conflicting votes, a four-person floor losing two people, a drinks break, a long breakdown/drop, DnB half-time movement, false motion from lighting, stale track identity, disconnected sensor/helper phone, repeated-hour schedule and restart during a queued exit.

Acceptance conditions for this first stage: zero ineligible selections, zero volume increases, zero automatic early cuts from sensor input, no change to the loaded transition after commitment, no false reset of the closing schedule, and clean return to the prepared queue on missing input. Review every suggestion and reason with the host; thresholds above are adjustable proposals, not passed tests.

If the host then wants sensing, run a short opt-in rehearsal with consenting volunteers under realistic lighting. The helper labels context and whether a suggestion was useful, without requiring face labels, identities or mood scores. Include deliberate drink/walk/breakdown cases. For any classifier, hold out whole sessions/lighting conditions rather than scattering adjacent frames from the same scene across training and test data. Report false skip suggestions and unnecessary direction changes, not only a flattering average activity accuracy.

Compare the supervised adaptive shortlist with the fixed prepared queue in a small listening rehearsal. Judge musical flow, variety, unwanted exits, false explanations, helper workload and time to manual recovery. This cannot establish causal crowd-satisfaction improvement for the actual party; it can catch an unreliable controller. Complete the playback engine’s bench and nine-hour combined soak separately. Crowd sensing adds CPU load on the Mac already running DJ software and Jellyfin, so include it in that soak only if it is actually chosen.

## Research handoff

- Scope / owned file: this document only; parent owns canonical plans, implementation decisions and Git commit.
- Checkout: shared `main`; base observed for this research task `c2126c2`.
- Status: research complete; recommendation is helper-first advisory control with optional, undecided local sensing.
- Confirmed decisions: host requested parallel auto-DJ research; no sensor activation or guest-data collection authorized by this research task.
- Proposals awaiting decision: whether guest input is useful; whether any sensing is wanted; helper role; retention/notice/access design if pursued.
- Verification: primary papers, institutional projects and official product pages reviewed October 19; local document/link and diff checks only. No model, hardware, app-control, sensing, privacy implementation or playback validation performed.
- Remaining: choose the simple control scope, prepare approved files/transition graph, test synthetic advisory policy, then decide whether a consenting sensor rehearsal adds value. Use the fixed rehearsed queue if it does not.
- External actions: none. No cameras/microphones, recordings, installs, purchases, account changes or guest-data collection.
- Commit: parent will integrate and commit the named file with related research; no independent Git operation performed.
