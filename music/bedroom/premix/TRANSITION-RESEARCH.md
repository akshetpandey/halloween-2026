# Transition research and correction

Researched October 29, 2026 after the host rejected both production excerpts. **Both are failed auditions.** Matching BPM/key and passing native readback did not establish a good transition. This note governs the next musical revision alongside [the set thesis](SET-THESIS.md).

## What the instruction actually teaches

**Three separate timing jobs.** Tempo matching, aligning individual beats, and aligning musical phrases are distinct. Digital DJ Tips describes all three; similar BPM alone does not prevent a doubled kick, and matching beats alone does not line up arrangements. Their approximate ±4% tempo suggestion is guidance, not permission to force any pairing. Our existing ±3% limit remains a project choice. [Beatmixing: the three elements](https://www.digitaldjtips.com/rock-the-dancefloor/beatmixing-part-2-the-three-elements-of-a-good-beatmix/).

**A clear musical foreground.** Digital DJ Tips recommends identifying which deck carries the music throughout a blend. Drums under a lead are a safer starting point than two complete arrangements. Key compatibility helps when pitched material overlaps, but does not choose complementary melodies or determine the right place to exit. Preserve a worthwhile musical idea before moving on. [House mixing principles](https://www.digitaldjtips.com/the-ultimate-guide-to-mixing-house-music/).

**There is no universal crossfade duration.** Crossfader demonstrates gradual top/mid/low exchanges, phrase-timed instantaneous bass exchanges, and deliberate layering with the same pair of house tracks. These serve different energy goals. The bass exchange should respond to the arrangement; it need not happen halfway through a generic fade. Their gradual example exchanges treble and mids over roughly four bars each, then bass over 8–16 bars. [Three house techniques](https://blog.wearecrossfader.co.uk/blog/3-ways-to-mix-house-music/).

**Techno needs an arrangement, too.** Crossfader's techno demonstration uses extended blends and a contrasting drop swap. Its slow blend introduces mids over about 16 bars, exchanges highs, changes the bass, then removes the outgoing deck over another eight bars. Its high-energy example replaces the expected returning bass with the next track's bass at an actual mini-break/drop. These are authored cue relationships, not fixed-length fades applied indiscriminately. [Three techno techniques](https://blog.wearecrossfader.co.uk/blog/mix-like-a-techno-dj-3-ways-to-mix-techno/).

**Short transitions can be correct; failed matches cannot authorize them.** Phil Morse also teaches phrase-timed cuts, end-to-end changes and fades for material that does not support a beatmix. His bass-swap example prevents both double bass and a gap before the incoming bass arrives. We should choose the appropriate technique explicitly, rather than automatically using a half-second reset when another rule fails. [Five basic transitions](https://www.digitaldjtips.com/rock-the-dancefloor/five-basic-dj-transitions/).

**Software follows its grid, including mistakes.** Mixxx documents tempo plus phase matching, the need for an accurate grid, and the weakening/doubling kick that can indicate drift. Its intro/outro cues describe sections, not merely points; their relationship is an artistic choice. [Mixxx mixing and cue manual](https://manual.mixxx.org/2.5/en/chapters/djing_with_mixxx.html).

**A model downbeat is evidence, not ground truth.** Beat This deliberately avoids DBN constraints for generality. The authors report weaker continuity metrics and acknowledge failures. Running without DBN is not itself an error; accepting inconsistent predictions as verified musical bars was our error. Adding DBN would not establish phrase starts or good blends. [Beat This paper](https://arxiv.org/abs/2407.21658).

## Audit of our failed examples

| Example | Evidence | Consequence |
|---|---|---|
| Be The One → CRUSH | 136→150 BPM; 0.5-second reset | A failed tempo/phrase pairing was turned into an abrupt change. Reject this default. |
| Be The One → Lullaby | Shared 139 BPM; measured B-flat minor; 16 bars / 27.6 seconds | These properties did not establish complementary arrangements. |
| Second example's phrase evidence | Both selected boundaries reported `supported: false`; Eli's dominant model bar class had only 55% support | The builder still rendered it. Missing phrase evidence must block a production beatmix. |
| Second example's borrowed intro | A four-bar tail was repeated twice because it was vocal-free | No demonstration that its instrumental lead, groove or jump back to the body worked. This edit is rejected along with the sample. |
| Generic automation | Bass moved at the mathematical midpoint; compatible key could leave both mid bands flat | The automation had no authored answer for which lead owned each part of the blend. |

The host subsequently identified **melodies or vocals clashing** as the main problem in the second failed excerpt. These weaknesses support that feedback. Source-model metrics cannot replace listening.

## Applied production rules

1. Design each join around named source events: mix-in phrase, bass handover/drop, lead handover and mix-out phrase. Record source seconds, beat counts, evidence and uncertainty. A high-confidence whole-file bar label alone is insufficient.
2. Prefer an intact, demonstrably percussive intro/outro. If an edit is needed, specify its purpose. Vocal-free does not mean lead-free. A drum/bass stem intro is a different, explicitly documented edit; it is not a secretly looped melodic tail.
3. Keep one primary kick/bass and one musical lead. Permit intentional complementary layering only with explicit evidence. Ducking is a finishing tool, not a remedy for a bad arrangement.
4. Choose transition length from those events. Eight-, sixteen-, twenty-four- or thirty-two-bar blends are available; longer is not automatically better. A short cut needs its own musical rationale, not a fallback path.
5. Inspect local drum timing at both ends, and verify the realized audio after REAPER's rate/pitch processing. Matching planned BPM is not that verification. Constant tempo between sampled cues remains an assumption.
6. Do not land in an unintended breakdown. Preserve the host's hard-rave runs and explicit 5–20-minute resets. Remove an entry breakdown only as a phrase-preserving edit that has been checked for lead pickups and a clean splice.
7. Treat technical checks, musical review, and final approval as separate states. Both failed auditions stay rejected. No unattended full render may silently accept legacy joins without an authored arrangement design.

Numerical cue/lead/drift thresholds in the implementation are conservative project screening rules, not universal professional standards. Demucs stems can contain bleed or artifacts. All local source/music/model evidence remains ignored; public documentation contains no audio or reviewer identities.

## New controlled test

Use approved **DJ HEARTSTRING — Will You Remember Me When I'm Gone? → Funk Tribu — Speakers Blowing**. Whole-file key analysis estimates A-flat minor for both; local drum fits are approximately 150 and 148 BPM. Meet at 149 BPM (about ±0.7%). Use an actual 16-bar drum/bass intro and an eight-bar outgoing tail: 24 bars total, about 38.7 seconds.

The incoming source drops its bass by roughly 25 dB at 26.15 seconds and restores it at 52.09 seconds. Putting the former under the outgoing exit would lose energy. The test removes that complete 16-bar entry breakdown and places the latter, a real bass return, at the outgoing phrase/lead handover. Its intro is explicitly made from its own separated drums and bass, avoiding the vocal pickup before the removed breakdown. No tail loop or loop padding is used. The original incoming stereo resumes on the bass return. At that point the outgoing eight-bar tail switches to its drums stem, with low EQ cut, before fading away. Local key estimates disagree (outgoing A-flat minor, incoming first-drop A-flat major), so neither the shared tonic nor the whole-file labels authorize overlapping leads. Original stereo carries the solo passages; stem separation carries the supporting intro/tail.

The host confirmed **“The new 1:43 test is solid”** on October 29. This approves the short test; the full set remains unfinished. The runtime report records native/rendered timing, source mapping, level measurements and limitations.

### Measured test outcome

The 1:43 MP3 is rendered at 48 kHz / 320 kbps, **−16.6 LUFS / −2.1 dBTP**, with no unexplained silence. At 0:26 the incoming drums enter; at 0:52 its real bass return takes over; by 1:04 the outgoing deck has left. The blend lasts 38.7 seconds. The native drum diagnostic checks both sides of the entry edit: maximum 95th-percentile error against the expected beat grid is **1.35 ms**, and maximum interdeck phase difference is **1.07 ms**. The rendered 30–160 Hz RMS increases **1.13 dB** across equal four-bar windows at the bass handover. These measurements establish timing/continuity, not that the blend sounds good. [Sanitized result record](transition-research-results-2026-10-29.json).

The complete 216-source drum-cue pass found consistent sampled timing for 170 sources; 46 need review. It verifies neither phrases nor the unsampled middle of a recording. The next full sequence remains to be rebuilt under the source-event rules; the previous automatic ordering does not yet emit the required arrangement designs and is deliberately blocked from final rendering/delivery.

Host response to the new stem-supported, source-event-led 1:43 excerpt: **“The new 1:43 test is solid.”** Use this accepted pattern for the full revision, with one musical lead as the default. This does not approve an unbuilt full sequence or physical playback.
