# The Hollow — Auto DJ research and rehearsal plan

Researched October 19, 2026. **Recommendation, not a tested installation.** The host requested high-energy techno, tech house, DnB, acid and trance, with bouncy, dark underground rave character and broader producer variety. This document supplies the playback decision; [the room plan](playlist.md) and Playlist Lab own curation and approval.

**Updated scope:** the host now prioritizes custom crowd-responsive selection and permits a software change/local files. The [adaptive Auto DJ plan](adaptive-auto-dj-plan-2026-10-19.md) is the current recommendation: pilot VirtualDJ's documented control path and compare djay for automatic mix quality. The installed-rekordbox-first recommendation below is the earlier fixed-queue baseline, not the adaptive engine decision.

## Recommended route

Start with **approved, acquired local tracks in the existing rekordbox Automix**, ordered into coherent tempo/genre chapters. Prepare continuous mixes of difficult boundaries or whole chapters as the fallback. This keeps bedroom playback independent of the Spotify account running the living-room Google Homes and removes live catalog/network availability from the bedroom's main route. This is our reliability judgment, pending the tests below.

**Spotify Automix is now possible in newer rekordbox.** The installed app predates that capability. Updating could support an inexpensive streaming rehearsal, but it does not solve the account conflict or provide offline protection. Compare the actual transitions before buying a different DJ application. Move to VirtualDJ if its editable transitions or scheduler solve a demonstrated problem; Mixxx is a free fallback, rather than the first migration.

## What is confirmed

- Read-only inspection found `/Applications/rekordbox 7/rekordbox.app`, bundle version **7.2.14.0323**. No VirtualDJ or Mixxx main application was found in `/Applications` or the user's `Applications` folder during this bounded inventory. This is not an inventory of every disk or package manager.
- The host's Mac reports **macOS 26.6.2**, `arm64`. No app was launched, library opened, controller connected, firmware read, gain changed or sound played in this research pass.
- The repository records DDJ-FLX4 and two powered bedroom speakers, separate Google Home Spotify playback in the living room, and Jellyfin on the same Mac. Simultaneous operation remains a rehearsal gate.
- Current rekordbox download documentation lists **7.2.19**, released September 24, 2026, and macOS Tahoe 26 support. Installed 7.2.14 must not be described as the current release. [Official download and requirements](https://rekordbox.com/en/download/)
- FLX4 unlocks rekordbox Performance control when connected without a paid rekordbox plan. This does not include a streaming-service subscription. [Official hardware-unlock FAQ](https://rekordbox.com/en/support/faq/v7/#faq-q700001)

## Options and their actual automation

| Route | What it can automate | Limit for this party | Cost verified October 19 |
|---|---|---|---|
| Existing rekordbox + local files | Ordered Automix queue, deck loading and transitions; repeat/random settings | Need to audition automatic mix points; external reliable schedule/gain API not established here | No additional DJ-software subscription needed with connected FLX4; audio acquisition separate |
| Updated rekordbox + Spotify | Spotify Automix from **7.2.16**, July 9 | Online only; separate Spotify account from the living-room stream; current version and long-run behavior need testing | Existing hardware unlock; Spotify Premium required, current account entitlement not inspected |
| VirtualDJ + local files | Automix types, editable transitions for each ordered pair, optional dual-deck mode, timed actions | Migration, mapping, saved transitions and recovery need rehearsal | Pro **$19/month before tax**; no purchase made |
| Mixxx 2.5.6 + local files | Auto DJ queue and cue-based/timed crossfades | Does not itself assess rhythm, frequency content or track volume; not proven to improve this set's mixing | **Free** full version; no purchase needed |
| Prepared continuous local mixes | All transitions and chapter durations fixed before the night | Less flexible; producing/auditioning them takes time; output route still needs testing | Can use existing tools with appropriately acquired audio; no new application assumed |

Rekordbox release notes explicitly added Spotify Automix in **7.2.16**. Older May 2026 forum advice saying Spotify cannot Automix is superseded for that version onward, but remains consistent with the installed 7.2.14. No update was performed. Back up the library before a planned update, rehearse the chosen build, and freeze software after the final rehearsal. [Official release notes](https://rekordbox.com/en/support/releasenote/)

Rekordbox's installed-version manual describes dragging a playlist into Automix and automatically loading decks 1/2. Unloading a loaded track stops Automix; pressing its stop control leaves the current song playing to its end. Auto Gain and output attenuation are available; the manual warns that hitting the limiter harms transients. These are documented controls, not proof that saved cues dictate Automix boundaries or that every transition is beat/phrase-correct. [7.2.14 manual, pp. 166 and 235](https://cdn.rekordbox.com/files/20260409151936/rekordbox7.214_manual_EN.pdf)

Rekordbox does **not** automatically cancel Active Loops in Automix. Audit every queued track for active loops; an unintended persistent loop is a direct unattended-playback failure. Loading an unrelated track can also stop automatic operation. [Official operation FAQ](https://rekordbox.com/en/support/faq/operation-hint/)

VirtualDJ's Smart mode estimates transition points; fade modes can remove intro/outro material or silence, and its tempo behavior is configurable. For this party, the stronger feature is the **Automix Editor**: preview and save each ordered pair's in/out points, overlap and BPM-match choice. An edited pair is reused in that order. This allows a deliberate tempo reset rather than a forced beatmatch. [Automix controls](https://virtualdj.com/manuals/virtualdj/interface/browser/sideview/automix.html) · [Pair editor](https://virtualdj.com/manuals/virtualdj/editors/automixeditor.html)

VirtualDJ's built-in Event Scheduler supports intervals, clock times and script actions. Its documentation does not establish restart recovery or daylight-saving rollback semantics; these must be tested. Its **Home $4/month** tier supports FLX4 but retains audio drops/branding, making **Pro $19/month** the relevant unbranded candidate. The controller is not a free license for VirtualDJ. [Scheduler](https://virtualdj.com/manuals/virtualdj/interface/topsection/appcontrols/eventscheduler.html) · [Current prices](https://virtualdj.com/buy/) · [Home conditions and controller list](https://virtualdj.com/products/virtualdj/home.html)

Mixxx's current stable release is **2.5.6**; the website advises using stable for live work rather than 2.6 beta/2.7 development. Its official FLX4 mapping supports macOS and master channels 1–2/headphones 3–4, but does not implement Smart Fader, Smart CFX or every pad mode. The hardware master knob is independent of Mixxx software gain. Auto DJ uses intro/outro cue regions or timed fades; rhythm-aware performance is not promised. [Stable download](https://mixxx.org/download/) · [FLX4 mapping](https://manual.mixxx.org/2.5/en/hardware/controllers/pioneer_ddj_flx4.html) · [Auto DJ manual](https://manual.mixxx.org/2.5/en/chapters/djing_with_mixxx.html#auto-dj)

## Sources of playable audio

| Service/source | Rekordbox | VirtualDJ | Party implication |
|---|---|---|---|
| Acquired local MP3/WAV/AIFF/FLAC in a supported format | Local library | Local library | Preferred; match the exact version and rehearse actual files |
| Spotify Premium | Current versions support manual mixing; Automix from 7.2.16 | Current official manual includes Spotify | Online only; no Spotify offline cache; do not plan concurrent independent rooms on one account |
| Apple Music | Supported streaming source; no offline DJ playback | Not established by the current alternate-catalog manual used here | Not a reason to switch apps or assume downloaded Apple Music tracks are plain audio files |
| Beatport Streaming | Supported; offline storage available subject to plan | Supported; Pro subscription required for offline playback | Potential subscription alternative after catalog/version checks |
| SoundCloud | Go+ streaming; DJ tier offers eligible offline tracks | Supported streaming catalog | Confirm DJ-app offline support and eligibility before treating any track as an offline reserve |
| Tidal | DJ option supports eligible offline storage | DJ Extension and eligible cached files supported | Offline authorization and catalog/version checks still required |
| Mixxx | Local-file route evaluated | Not applicable | No official Spotify integration is established by the sources reviewed here |

For rekordbox, Spotify requires Premium, has no offline storage, and one account cannot play independently on another device: starting Spotify elsewhere stops the current session. SoundCloud DJ and Tidal offline authorizations have renewal windows; Beatport offline availability still depends on the subscribed offering and stored tracks. These caches remain service-managed, unlike acquired files. [Rekordbox streaming FAQ](https://rekordbox.com/en/support/faq/streaming-7/)

VirtualDJ's current manual lists Spotify, Deezer, SoundCloud, Beatport and Tidal. Spotify has neither stems nor offline caching. Beatport offline needs its Pro tier; Tidal needs DJ Extension, with cached files reauthorized every 30 days. **Spotify support is confirmed; Spotify Automix compatibility on this Mac is not tested.** [Official catalog manual](https://virtualdj.com/manuals/virtualdj/interface/database/onlinemusic/altcatalogs.html)

Spotify itself limits DJ integration to online personal, non-commercial use and notes that connected-app availability can vary. A Spotify playlist or API URI is catalog/approval evidence, not an acquired DJ file or a recording license. This research does not certify the party's use under a streaming service's terms. [Spotify DJ integration](https://support.spotify.com/us/article/dj-integration/)

## How to make this collection mix well

These are proposed programming rules, not measured BPM labels for the new batch:

1. Keep **tech house roughly 126–132**, **groove/driving techno roughly 132–145**, and **acid/trance roughly 138–150** in contiguous chapters where the actual tracks permit. DnB gets its own **roughly 170–176** chapter. High energy does not require every genre to become faster or harder.
2. Normalize half/double-time analysis explicitly: a track reported as 87 BPM might belong with 174 BPM DnB. That does not make it a compatible beatmatch with 130 BPM house. Inspect the first downbeat and grid over the whole file.
3. Treat **128 → 174 as a 35.94% tempo jump**. Use a rehearsed short fade/cut on a musical boundary or a prepared transition, with BPM matching disabled there. Do not ask an unattended sync algorithm to stretch that jump. Start a whole new DnB chapter, rather than shuffling it between four-to-the-floor tracks.
4. Use a provisional **6% maximum tempo adjustment within a chapter**, judged by ear. This is our starting limit, not a vendor guarantee. Key compatibility is a useful ordering hint; repeated basslines, overlapping vocals, phrasing and groove still decide whether the join works.
5. Favor **16- or 32-bar clean drum sections** when the arrangement offers them. Skip long low-energy lead-ins and tails. A track's DJ intro/outro section can be useful for mixing; standalone album intros/interludes/outros and long empty passages do not belong in the party queue.
6. Keep natural transitions inside chapters; manually audition every genre boundary, vocal clash and dramatic breakdown. Save pair-specific boundaries in VirtualDJ if required, or render approved transition/chapter mixes from permitted local audio if rekordbox cannot reliably reproduce them.
7. For each approved candidate maintain Spotify URI/ISRC, exact mix/version, source/acquisition status, local path, analyzed BPM/key, grid checked, mix-in/out markers, gain adjustment, chapter and transition-review status. ReccoBeats estimates support selection; actual-file analysis and listening determine DJ readiness.

Use Auto Gain as a starting point and check quiet older masters against loud recent releases. VirtualDJ also documents automatic gain on load; Mixxx separately supports ReplayGain normalization, so the latter's Auto DJ limitations do not mean that the whole application lacks loudness tools. Neither feature decides whether overlapping basslines or vocal phrases sound good. [VirtualDJ options](https://virtualdj.com/manuals/virtualdj/appendix/optionslist.html) · [Mixxx ReplayGain](https://mixxx.org/features/)

Start with output attenuation/headroom such as **−6 dB** as a rehearsal setting, then calibrate the real chain. A limiter should catch a mistake, not be continuously driven. Neither it nor a laptop slider measures room loudness. Bedroom reduction/stop must be tested through the DDJ and speakers; living-room volume is a separate control path.

## Duration and the repeated hour

The proposed guest programme remains **2026-10-31T21:30:00-04:00 → 2026-11-01T04:00:00-05:00**, which is **7.5 elapsed hours**. The repository requirement remains **at least nine hours of usable music per room after actual cuts/transitions**, covering the programme plus reserve. This does not move the 4 a.m. closing. Python `zoneinfo` verified the UTC endpoints, 01:30Z and 09:00Z on November 1.

The two 1:15 a.m. instants are **01:15−04:00 = 05:15Z** and **01:15−05:00 = 06:15Z**. Persist cue IDs and use explicit offsets/UTC for an external controller. A built-in clock scheduler without a proven rollback test is insufficient evidence. The first 1 a.m. hour contains peak/release; the repeated hour descends. Keep schedule and gain decisions in [Mac orchestration](../mac-orchestration.md) and [run of show](../../operations/run-of-show.md).

Measure the actual prepared sequence: effective file durations at playback rates, less trimmed portions and overlap, without double-counting cuts. Fifty five-and-a-half-minute tracks are only 4:35 raw, or about **4:10:30** with 49 thirty-second overlaps before other cuts. A review batch is not a completed all-night queue. Publish distinct-track count, duplication/version checks and measured mixed duration when the queue is finalized.

## Decision gates and practical tests

**Gate 1 — choose the source.** Determine whether the host already has acquired files for the Keeps. Use a small permitted local-file test first. If acquisition is deferred, test current-version Spotify Automix only after establishing a second eligible account for a genuinely independent bedroom stream, or pause the living-room stream during a rehearsal. Do not silently buy a service or repurpose the living-room account.

**Gate 2 — 45–60 minute bench test.** At low speaker level, use 10–12 approved tracks: two similar-tempo joins per main chapter, a vocal pair, a quiet/loud master pair, one long breakdown, the planned DnB entry and exit, and a final fade. Log exact app/firmware versions, paths, chosen settings and audible results.

- [ ] Main goes only to FLX4 → both bedroom speakers; cue goes only to headphones. PC MASTER OUT stays off for the proposed independent-room setup.
- [ ] Track starts, mix points, bass/vocal overlap and tempo changes sound intentional. No accidental active loop, repeat or shuffle.
- [ ] Saved ordering, points, gain and mode survive an app restart. Starting with physical knobs/faders in the photographed restore positions produces expected output.
- [ ] Manual lower, pause, next and stop behave as expected; stopping Automix is distinguished from stopping audible playback.
- [ ] If the candidate is streaming, confirm each exact track/version can load. Disconnect Wi-Fi during rehearsal and observe actual buffering/failure/recovery; a cached-looking waveform is not offline proof.
- [ ] Deliberately test a missing local file, track-end behavior and queue exhaustion on the bench. Reconnect controller only with speaker gain down; verify no surprise system-output fallback.
- [ ] Trigger the permitted backup mix/player through a documented output; one helper can restore music or quiet both rooms in under one minute.

**Gate 3 — choose the engine.** Keep rekordbox if its saved sequence and joins pass. Pilot VirtualDJ Pro if pair editing or scheduling is needed and unavailable in the tested setup. Use Mixxx only after validating its mapping and transition behavior; do not change software solely because it has an Auto DJ button. Record reasons and the approved cost before procurement.

**Gate 4 — nine-hour combined soak.** Run the final acquired queue, real controller/speakers, living-room Google group and muted Jellyfin programme together for at least nine elapsed hours. Let the DJ app remain unattended for long stretches; record gaps, clipping, unwanted repeats, temperature/resource symptoms and time to recovery. Confirm the exact final duration after joins/cuts, lowering at each checkpoint, that manual lowering is never reversed, and final stop. Test rollback/restart logic with a fake clock or isolated schedule simulator rather than changing the Mac's real clock. Keep Jellyfin direct-play where possible, then test the realistic worst-case load. Freeze the proven app/library/settings afterward.

## Research handoff

- Branch: shared `main`; base `7349ac3` as observed at this research pass's start (parent will record the final combined commit).
- Owned file: this document only; parent owns canonical music plans, batch creation, live playlist changes and the combined handoff/commit.
- Verification performed: current primary vendor documentation; bounded app bundle inventory; `sw_vers`/`uname -m`; Python DST/duration calculations. No playback, mapping, controller, acquisition, Spotify login, update, installation, purchase or deployment test performed.
- Remaining: exact files/source choice; bench rehearsal; engine decision; finalized approved queue and nine-hour combined soak. All checkboxes above remain open.
