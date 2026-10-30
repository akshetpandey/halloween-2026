# Hollow single-lead production continuation · October 30

- Scope: finish the actual prepared Hollow set from canonical shared Keeps. The original acquisition/analysis/full-render objective remains active; a short successful audition is not completion.
- Checkout: shared main, `/Users/akshet/workspace/halloween-2026`. Research/host-approved short example committed as **d8555ec**. Preserve unrelated decor edits; no push authorized.
- Confirmed host decisions: hard rave until the end, occasional 5–20-minute slower resets; production micro-decisions delegated. The old two-minute repair failed because **melodies or vocals clashed**. The host then confirmed **“The new 1:43 test is solid.”** That approves the [researched single-lead example](premix/TRANSITION-RESEARCH.md), not an unbuilt full set.
- Accepted sample remains at ignored `premix/.local/final-hollow-2026-10-29/revision-07/audition/Hollow-cue-led-transition.mp3`. It is unchanged by the subsequent whole-programme compiler. All audio, raw model/provider data, votes and runtime paths remain ignored. No account, hosting, hardware-routing, purchase or music-upload changes.

## Implemented continuation

- `prepare_production_cues.py` / `production_cues.py`: bounded local htdemucs workers, source/model/package/implementation hashes; full-source constant-grid gate retained. First/last source windows provide independent drum timing, activity/section profiles, recurrent eight-bar phase estimates, a four-bar drums-only intro cycle and an eight-bar drums-only exit. Valid version-1 results remain reusable; version 2 smooths power over a bar so staccato material is not mistaken for silence. These are inferred cues, not verified musical phrases or lyric recognition.
- `source_bindings.py`, `plan_mix.py`, `render_set.py`: one logical recording can have several native original/stem components. Frozen cue-index hashes and parent/source/stem hashes gate them; derived chapter staging proves its own PCM identity instead of comparing a drum stem with the original full mix's hash. Existing one-component plans remain supported but version 5 is invalid for current production.
- `programme_order.py`: hard/reset waves, producer spacing, protected finale, distinct DnB entry/exit bridges, ±3% rate bounds using geometric-mean shared tempos, and separate reserve. Pressure is an editorial tempo/style/catalog proxy, not measured crowd response. **Full order is still provisional until all actual cues are available.** Earlier approximate sizing found tempo/bridge exhaustion; the algorithm now reserves those routes rather than inventing a short reset.
- `single_lead_timeline.py`: incoming four-bar drums cycle plays twice under the preceding original body. At the cue, original full-stereo leads exchange; outgoing drums then fade for eight bars. No simultaneous full musical leads. Prefix loops cannot extend runtime: union of fresh original-body intervals must cover the complete wall-clock programme. Solo ramps and constant transition holds use existing calibrated native stretch markers. Final programme phrases remain original stereo with an eight-second fade; reserve starts independently.
- `build_single_lead_set.py`: freezes analysis/models/acquisition map/cue registry; measures retained-source loudness; compiles editable native components and a logical tracklist. New output directory required; no mutation of a frozen full plan. Its joins start with timing `pending` and cannot pass final rendering/delivery until audited.
- `audit_single_lead.py`: crops the **actual native warp/loop geometry**, downmixes/pans diagnostic decks into separate channels, omits diagnostic mixer EQ/faders, and measures actual attack coverage/support and phase before/after each handover. Failed joins block production. REAPER pan/mono API readback is checked; normal musical source routing remains stereo.
- `prepare_priority_cues.py`: prepares a few pending sources in a separate bounded cache, copies only completed source-bound cue records into the main queue, and leaves existing completed canonical results intact. This avoids changing a running worker's implementation or queue.

## Verified actual integration

The generic compiler built **two logical recordings / four native components**, about **8:09** of fresh body coverage, from the approved example pair. Native audit of its loop/lead handover passed: p95 expected-grid error **13.00 ms**, maximum interdeck phase difference **1.60 ms**. A normal stereo excerpt around that join rendered **41.77 s, −16.0 LUFS / −2.8 dBTP**, with zero unexplained silence. Readback: four tracks, five items, twelve EQ bands, twelve active volume points. This is an engineering integration test; the host approved the earlier 1:43 example, not this later full-source selection.

Private evidence:

- `premix/.local/final-hollow-2026-10-29/revision-08/integration-01/mix-plan.json`
- `.../integration-01/diagnostics/audit-summary.json`
- `.../integration-01/integration-render-check.json` and `integration-check.mp3`
- `.../revision-08/pan-proof/proof.json`: native synthetic left/right diagnostic isolation passed; not physical output.

Latest complete suite is **134 tests** (see runtime log); rerun after further implementation changes. Test coverage includes body/entry-breakdown selection, staccato activity, source-bound component substitution/tamper rejection, derived PCM staging, no artificial loop runtime, warp-preserving crop, offbeat-bass timing rejection and producer/tempo/reset/finale constraints.

## Running source work

Runtime root: `premix/.local/final-hollow-2026-10-29/`.

- Main source pass: terminal session **67655**, `revision-08/cue-supervisor-02.log`; child logs `cue-batch-*.log`. Each child handles twelve new/review sources then restarts to bound MPS graph-cache memory. At this handoff it has progressed past 100 attempted sources; read current JSON counts, do not reuse this as a final inventory.
- Four critical bridges: terminal session **77342**, output state `revision-08/priority-bridges/`. Targets are Europaträume, DIE LIEBE KOMMT NICHT AUS BERLIN, Makina Time and My Little White Pony. Its completed cue records reference permanent ignored priority stem paths and are merged for the main worker to reuse. This enables an actual 165/170→174/175→165 boundary test before the main pass ends.
- **Do not edit the running worker's source files** (`prepare_production_cues.py`, `production_cues.py`, `drum_cues.py`, `prepare_drum_grids.py`) casually: implementation hashes deliberately invalidate changed analyses. Valid V1 ready results are explicitly retained by V2; failed older results are retried. Other compiler/order/audit modules can be edited independently.
- The previous first worker was stopped by signaling only its identified Python supervisor/child, not REAPER. Cached results/sources were preserved.
- Some review cases remain overly conservative: sparse lead activity can fail the 75%-active/eight-beat entry criterion; Amelie Lens — Hypnotized's early kick is in the drum stem while bass-stem activity is weak. V2 review records retain `profile` and `grid`, allowing diagnosis without guessing. If finished duration is short, recover these with actual original-mix low-band evidence and a phrase-length staccato criterion, then re-separate only needed cue windows. Do not call a source unfit merely because this screening rule failed. Two sources also lack coherent sampled drum timing; keep them out until separately resolved.

## Next actions

1. Read actual source-pass/priority results and complete the techno/DnB boundary audit; handle timing failures without a half-second fallback.
2. Finish actual cue inventory and duration sizing. Initial **provisional** sizing (part measured, part estimated) was around 9.8 body hours; this is not a nine-hour proof. The 202 original constant-grid-qualified sources total 11:57 raw, while the earlier 170 sampled-drum successes alone total only 10:04 raw and are too thin after edits.
3. Build full sequence in a fresh directory with `build_single_lead_set.py`; fix any admissible-order/bridge scarcity and audit every realized join with `audit_single_lead.py`. Actual reset periods must be 5–20 minutes; retain the protected hard finale. Check actual artist credits/coverage/omissions and exposed source cues.
4. Prove at least **nine distinct finished hours**, without isolated loop padding. Party programme is proposed around 7.5 elapsed hours; separate prepared reserve supplies coverage without playing after the closing. Compute manual start backward from `2026-11-01T04:00:00-05:00`, America/New_York; this handles the rollback. Actual start can shift slightly with complete musical phrases; do not cut randomly to fit a timestamp.
5. Native render in new output directory, verify format/headroom/silence/chapter seams, assemble/deliver/export. Never resume the rejected version-5 archive. Current final render/delivery gate intentionally blocks unaudited designs.
6. Physical rekordbox/FLX4/soundbar routing remains the sibling task. Deliver recommended playback settings and files; do not claim actual hardware/player configuration.

Disk: original acquired/compact sources and accepted previews must remain. If space is needed, roughly **6.87 GiB** of regenerable rejected version-5 `.wav/.flac` files remain under `final-render/native-*/renders/`; inspect exact files and record their removal before cleaning. Preserve projects, receipts, test evidence, source files and accepted samples. No blanket cleanup.

An extra REAPER inspection window was left untouched after automatic approval review blocked closing it because it could interrupt rendering. Do not bypass that decision with a broad process kill. Native child processes use the isolated no-device profile and are controlled by their own launch lifecycle.

Priority bridge pass completed all four sources. Three completed records were copied to the canonical cue registry; the fourth already had a completed canonical record, which was retained. Their permanent ignored priority stem paths remain source/hash bound. The whole-source pass continues independently.

### Latest programming finding — reset boundaries need a distinct technique

Provisional whole-sequence attempts still expose a **content allocation problem**: resets at 147–153 BPM consume fast sources, then a late nominal hard run can drift to 140 BPM. Debug example was Hannah Laing at 140 trying to enter a protected 160 final reset. Do not freeze that result or merely relax its error. Estimated capacity was about 6.66 body hours at ≥145 BPM, 4.75 at ≥150, versus about 350 required fast minutes after a short entry. Spending 85 recovery minutes from the same fast pool is the wrong allocation.

New primary research is recorded in [the transition note](premix/TRANSITION-RESEARCH.md#deliberate-recovery-period-tempo-changes--october-30). Crossfader explicitly teaches suitable nonvocal loops with gradual wide BPM changes, and prepared 128→150 changes across eight bars.

**Next intended implementation, not yet present:** keep ordinary joins at restrained rates with the accepted single-lead pattern. At the user-requested reset boundaries, use a deliberately authored drums-only common tempo ramp (8–16 bars, larger rate range confined to isolated percussion), then restore the next full musical lead at native tempo. No melodic/vocal overlap; no unplanned half-second reset. Exclude inserted bridge seconds from nine distinct hours. Audit the explicit variable beat map through native rendering and audition one example. That permits slower 132–145 reset blocks while reserving enough ≥145/150 content for the hard runs and protected finale. The initial quick entry may ramp roughly 135→155 over about fifteen minutes; no long late-night descent.

The existing `programme_order.py` contains provisional finale/final-reset/bridge reservation experiments and currently raises on the deliberately incompatible late result. Preserve its useful artist/tempo/body-duration constraints, but simplify the final-reset ladder once explicit reset-boundary transitions exist. Full admission gates remain correct; do not bypass them to get a render.
