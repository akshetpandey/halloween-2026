# Auto DJ products for an adaptive bedroom set

**Historical scope:** later October 19 the host chose a [premixed bedroom set](../premixed-set-plan-2026-10-19.md). The live-adaptation ranking below is preserved research; it is not the current software recommendation. Consult the current plan for DJ.Studio version, trial/export and automation boundaries.

Researched October 19, 2026. **Feature-based recommendation; no head-to-head audio test or device installation performed.** This pass follows the host's expanded brief: changing DJ software is acceptable, acquired local files are acceptable, and code should be able to choose the next track and shorten a track when the room loses interest. It extends the [earlier source/routing research](../auto-dj-research-2026-10-19.md); it does not claim that a product can already read this party's crowd.

## Recommendation

**Use VirtualDJ Pro as the first engine to prove for the custom adaptive system.** It combines an actual Automix engine with a vendor-documented HTTP control extension and commands for queue changes and early transitions. That is a substantially better match for custom code than preserving rekordbox merely because it is installed. The selection/feedback logic should live in our code; the existing DJ engine should perform the audio mixing.

**Audition djay Pro alongside it for the best simple automatic playback.** Its documented transition, tempo-blend, song-range and stem tools make it the strongest consumer candidate in this shortlist. **Use DJ.Studio for a polished prepared-mix fallback**, especially tricky genre boundaries. These are judgments about fit and exposed controls, not a claim that we have listened and found a universal sound-quality winner.

No mainstream product reviewed here documents a built-in camera system that reliably infers this crowd's enjoyment and chooses tracks accordingly. Explicit host/helper feedback can drive a practical first version. Crowd motion or phone votes can become additional signals; they do not establish enjoyment on their own.

## Ranking for this particular use case

| Product | Custom adaptive-code fit | Simple automatic playback | What makes it useful | Main unresolved point |
|---|---:|---|---|---|
| **VirtualDJ Pro** | **1 — first pilot** | Strong candidate | Documented HTTP query/execute, scriptable queue and transitions, saved pair edits | Confirm extension, path selection, feedback and recovery on the actual Mac build |
| **Mixxx 2.5.6** | **2 — open fallback** | Basic compared with the leaders | Open source, documented controls and controller scripting | More bridge/selection work; Auto DJ does not make sophisticated rhythm/arrangement decisions |
| **djay Pro** | **3 — promising engine, weaker integration evidence** | **First no-code audition** | Automated entry/exit, song range, tempo blend, Neural Mix transitions | No supported general external control API established in the reviewed documentation |
| **rekordbox** | **4 — installed fallback** | Worth a benchmark | Existing library/FLX4 setup and Automix | No reliable external queue/early-exit control interface established here |
| **DJ.Studio** | **5 for live adaptation** | **First for prepared renders** | Harmonic ordering, full editable timeline, export | The rendered file's future cannot react to the crowd |

The ranking changes with the objective: a person wanting one-click playback should start with djay; a person wanting a fully auditioned fixed mix should start with DJ.Studio. This host wants code-assisted live decisions, so control and state feedback take priority. Sources supporting the individual capabilities follow.

## VirtualDJ Pro: strongest documented integration

The official **Network Control** extension requires VirtualDJ 2023 or later and **Pro**. It exposes HTTP `/query` and `/execute`, accepts POST, supports bearer authentication and returns explicit results/errors. This is a supported starting point for a local Python service, rather than screen automation. The documentation does not prove the extension is working on this Mac; that is the first smoke test, not a detail to defer until party night. Keep the control route local and authenticate it. [Vendor Network Control documentation](https://virtualdj.com/wiki/NetworkControlPlugin)

Useful documented operations include `automix_add_next`, `playlist_add`, `get_automix_song`, `get_automix_position`, `automix_skip`, `mix_selected`, `mix_now` and `mix_now_nosync`. **The queue-add verbs use the browser selection; an atomic insert-next-by-exact-path operation is not established.** Direct loading such as `deck 2 load '/absolute/path'` is a separate route. A smooth-transition command does not guarantee a correct phrase exit: our director still needs verified markers, tempo limits and load/readback checks. [VDJScript reference](https://virtualdj.com/manuals/virtualdj/appendix/vdjscriptverbs.html)

Its Automix modes provide Smart and several fade behaviors; beatmatching on fade and tempo carry/reset are configurable. The **Automix Editor** saves the timing and BPM-match choice for an ordered pair, allowing difficult joins to be rehearsed. Pair-specific edits help known paths; they do not make every arbitrary next-track choice sound good. A dynamic system should select from permitted transition edges rather than assume any two Keeps can be mixed. [Automix controls](https://virtualdj.com/manuals/virtualdj/interface/browser/sideview/automix.html) · [Pair editor](https://virtualdj.com/manuals/virtualdj/editors/automixeditor.html)

Mac/FLX4 support is documented, including factory mapping and the controller audio configuration. Current price is **$19/month before tax** for Pro. The **$4/month Home** offering includes FLX4 but keeps audio branding; it also does not satisfy the Pro requirement of the HTTP extension. A free/controller trial is not proof that a nine-hour licensed setup is ready. [FLX4 setup](https://virtualdj.com/manuals/hardware/pioneer/ddjflx4/setup.html) · [Current licensing](https://virtualdj.com/buy/) · [Home terms](https://virtualdj.com/products/virtualdj/home.html)

**First pass/fail test:** with permitted test files, query the playing path and progress, choose a specific approved path as next, read back its identity, request a transition, and confirm that path becomes audible. Prove browser selection and queue insertion while Automix owns the decks, **or** disable Automix and prove explicit loading into the idle deck plus a controlled transition. These are separate control modes; they must not race to load/transition the same deck. Repeat unfocused, after restart, and with the controller attached. Test credentials and listening interfaces after restart too. No architecture should be coupled to VDJ until this works on the Mac.

## djay Pro: strongest simple-playback audition

The current Mac manual documents automatic/manual transition boundaries, limits on how much of a song plays, fixed or automatic transition duration, tempo synchronization/blending, and **Mix Now**, which selects an early suitable blend point. Matching Songs is a source of compatible recommendations. The automatic effect choice randomly chooses transition types; it is not a documented audience-response model. Start with restrained transitions rather than randomly applying risers throughout a dark techno set. [Current Automix instructions](https://help.algoriddim.com/user-manual/djay-pro-mac/mixing-basics/using-automix)

Neural Mix separates musical components and can help avoid two vocals or bass parts competing. It is audio processing, not room sensing. The Mac product supports local files, multichannel USB interfaces and MIDI mapping, and Algoriddim lists FLX4 among supported controllers. Exact stem quality, load with Jellyfin and automatic transition behavior still need listening tests. [Mac product](https://www.algoriddim.com/djay-pro-mac/) · [Supported hardware](https://www.algoriddim.com/hardware) · [Neural Mix compatibility](https://help.algoriddim.com/topic/using-djay/neuralmix-compatibility)

PRO unlocks Automix and Neural Mix; a **seven-day trial** is documented. The current US Mac App Store lists **$6.99 and $49.99 PRO purchase entries**, along with promotional/duplicate entries; the retrieved listing does not label each entry's billing period. Confirm the actual monthly/annual offer in the purchase sheet rather than treating a 2022 forum price as a new quote. [Purchase guidance](https://help.algoriddim.com/topic/first-steps/how-to-purchase-djay-pro) · [Current US Mac listing](https://apps.apple.com/us/app/djay-dj-app-ai-mixer/id450527929?platform=mac)

A public, supported general scripting/HTTP API for arbitrary queue selection plus state feedback was not established here. MIDI Learn can expose transport/mixer actions, but it is not automatically a full library-selection API. Therefore djay should win the no-code audition on musical results, while VirtualDJ leads the custom-control pilot. Do not promise Python can direct djay robustly until a supported bidirectional control path is demonstrated.

## DJ.Studio: best prepared-mix candidate

DJ.Studio's **Harmonize** orders by BPM and key, respects locks and sets initial transitions. Its own description explicitly says the ordering solver uses **BPM/key rather than subjective energy values**. A mathematically compatible order still needs our selection and energy arc. The timeline allows auditioning and refining the resulting joins before export. [Harmonize details](https://dj.studio/automix)

Exports include rendered MP3/WAV/FLAC, or a DJ-set playlist/cues for supported live applications. A rendered chapter preserves its transitions and exact duration; a playlist/cue export alone does not reproduce the whole audio mix in another engine. For adaptive playback, prepare fallback chapters or certain difficult boundaries, then let the live engine choose when to use them. [Official export guidance](https://help.dj.studio/en/articles/8106079-exporting-mixes) · [DJ-set export](https://help.dj.studio/en/articles/16833153-export-dj-set-to-your-live-dj-software)

It supports the host's Apple Silicon/macOS family and can work offline after initial download/sign-in. It is a preparation tool rather than a controller-performance replacement. Current plans include **Studio, Pro, Pro + Stems and Ultimate**; Pro adds manual transitions/automation, Pro + Stems adds stem work. One-time licenses include 12 months of updates/support, and a **seven-day no-card trial** is documented. The retrieved official price page did not expose current base dollar amounts, so no current dollar quote is claimed. [Requirements/offline behavior](https://dj.studio/system-requirements) · [Plans and current offers](https://dj.studio/pricing?currency=USD)

## Mixxx and rekordbox

**Mixxx 2.5.6** is a free stable release with an official FLX4 mapping. It has local audio, cue-based or timed Auto DJ and separately ReplayGain. Its manual explicitly limits Auto DJ's awareness of rhythm, frequency content and volume. That makes the mixing engine less attractive than VDJ/djay for this request, though the open source architecture is attractive for future deeper development. [Stable version](https://mixxx.org/download/) · [FLX4](https://manual.mixxx.org/2.5/en/hardware/controllers/pioneer_ddj_flx4.html) · [Auto DJ](https://manual.mixxx.org/2.5/en/chapters/djing_with_mixxx.html#auto-dj)

Documented controls include Auto DJ enable, `fade_now` and queue operations; JavaScript controller scripting exposes engine controls. Some library navigation controls require window focus. A Python controller would need a proven bridge and a robust file-selection path; do not edit the live library database as an improvised API. [Control reference](https://manual.mixxx.org/2.5/en/chapters/appendix/mixxx_controls.html) · [Project scripting documentation](https://github.com/mixxxdj/mixxx/wiki/MIDI-Scripting)

**Rekordbox** remains the no-new-license benchmark with the connected FLX4. The locally observed **7.2.14** predates Spotify Automix support, added in 7.2.16; local-file Automix is already documented. Its current public feature/manual material does not establish a reliable external API for this director. It is sensible for a fixed queue, less compelling if we must bend it around custom control. [Hardware unlock](https://rekordbox.com/en/support/faq/v7/#faq-q700001) · [Release notes](https://rekordbox.com/en/support/releasenote/) · [Installed-version manual](https://cdn.rekordbox.com/files/20260409151936/rekordbox7.214_manual_EN.pdf)

## Newer AI-DJ claims checked

These are vendor availability/capability statements, not independently tested quality or field reliability.

| Product | Evidence as of October 19 | Decision for this party |
|---|---|---|
| **MIXX Intelligence** — distinct from Mixxx | Vendor offers macOS download, docs, Apple Silicon/FLX4 support claims and local phrase/energy/vocal-aware mixing. Posted DJ $7.99/month, Pro $9.99/month, Radio $19.99/month; live decks/stems are in Pro. | Available candidate for a later audition. Download was not successfully inspected and no stable external director API or crowd sensing was established. Do not displace the mature pilot from marketing alone. [Product](https://mixxintelligence.com/) · [Docs](https://mixxintelligence.com/docs/) |
| **djOS Pulse** | Current site explicitly labels R&D/in development and says nothing has shipped. Live response learning is in development; shown room-response data are proxies based on a DJ's play history. | Not a purchasable solution for this event despite earlier launch-style coverage. [Current vendor status](https://djos.ai/) |
| **pULPi** | Claims wearables/camera/phone participation, but invites users to early access and notification of a future macOS launch. | No shipping Mac/FLX4 system verified. [Vendor site](https://pulpi.app/) |
| **MixSound AI** | Claims heart-rate/crowd sensing; lists pilots, hardware and commercial API in a 2026 roadmap, with projected metrics. | No ready consumer Mac/FLX4 download, current API contract or demonstrated all-night deployment established. [Vendor roadmap](https://www.mixsound.ai/) |
| **RAVRRR** | Vendor describes QR requests/voting and automated YouTube-based playback; Free 30 songs/night, Pro $9.99/month. | Participation is explicit requests/votes, not camera inference. No acquired-local-file/FLX4/director integration established. Poor fit for this selected local library. [Vendor product](https://www.ravrrr.com/) |
| **Adrenaline Bridge** | Vendor describes local Mac files and generated pair transitions, but a staged beta sign-up and manually triggered two-song workflow. | Not an unattended nine-hour crowd-directed engine. [Vendor beta status](https://adrenalinebridge.com/) |
| **Djoid** | Its own guide describes a preparation/tagging/curation tool and explicitly says it does not mix tracks. | Could improve metadata later; not an Auto DJ substitute. [Official guide](https://docs.djoid.io/getting-started-guide) |

## What the director should control

The near-term target is **adaptive selection and intentional exits**, not generating every beat in Python. Let the engine continue playing if the director stops responding. Build on an approved local library with verified file identities, analyzed grids and safe transition regions.

The director can choose from a compatible shortlist, avoid recent artists/recordings, adjust energy within the current genre chapter, and request an exit at the next eligible phrase. Keep DnB transitions explicit. A dislike/low-interest input should normally shorten the next safe opportunity, not hard-cut the music immediately; a separate quiet/stop action remains immediate. Preserve breakdowns where they are musically rewarding instead of skipping every moment of lower movement.

Begin with host/helper **Keep this / Move on / More energy / Less energy** inputs and historical Playlist Lab preferences. Optional crowd sensing needs its own validated signal model. An empty room could mean guests moved for drinks; lower motion during a build could precede a drop. Avoid turning these ambiguous observations into constant genre changes. Do not call the whole system crowd-adaptive until the signal-to-decision-to-audible-transition loop has been tested.

**Next action:** run the VirtualDJ Mac API smoke test and a blinded musical comparison against djay using the same 10–12 local tracks, including long breakdowns, vocal clashes and DnB entry/exit. Score audible joins, phrase alignment, gain jumps, artifacts, early-exit timing, controller behavior and recovery. Then choose one engine and run the existing nine-hour combined rehearsal. This verifies the actual requirement more directly than another feature comparison.

## Research handoff

- Scope: this new research file only. Canonical plans and any adaptive-controller implementation belong to the parent/coordinating session.
- Branch/base at this pass: shared `main`, `c2126c2`.
- Checks performed: primary official documentation and public price/availability pages; local link validation and whitespace check. No install, purchase, app launch, audio acquisition, crowd capture, playback/device action or engine/API test.
- Decisions still needed from evidence: successful Mac control path, actual mix quality on approved files, selected source files and long-run validation. The recommendation is ready for a concrete prototype; audible readiness remains unverified.
- Commit: parent coordinates the combined commit; this subagent made none.
