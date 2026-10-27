# Laser-free Hollow rig and cheaper laptop control — October 22, 2026

**October 27 sourcing update:** [new price/delivery comparison](../research/price-refresh-and-value-plan-2026-10-27.md) supersedes dated prices/budget below. This document preserves the prior selected rig technical plan. New recommendation uses two PAR washes without laptop DMX, or OPPSK-only at the separately quoted price; neither scope switch is host-selected. No purchases/configuration/tests.

**Confirmed host:** remove lasers for safety; original DMXking MAX interface is sold out (host report). Keep OPPSK LED wash/pixels and U’King pair of LED moving-head spots. **Three fixtures**, not four. Fleece accepted with mild curtain-like echo goal; larger rug requested. Approximately $1,600 total-decor target unchanged. Nothing bought, installed or tested.

**Updated October 23:** [exact connection SKUs and refreshed offers](../research/final-offer-check-2026-10-23.md); [current single basket](../shopping-ready.md) owns quantities/cost. No laser or software/physical test added.

## Current control proposal and dated offer

[DSD TECH **SH-RS09B**, 5.9-ft USB-A to 3-pin female DMX cable, B07WV6P5W6](https://www.amazon.com/dp/B07WV6P5W6): **live signed-in Chrome Oct 23: $15.99, in stock, free Oct 24**, Amazon ships / DSD TECH Direct sells. Seller names FTDI chip, Mac and QLC+ support; product diagram uses Enttec Open DMX / FT232R. 10-ft option displayed $18.99, not selected. Replaces **$119 MAX**, saving **$103.01 before tax**. Availability/delivery are offers, not a purchase or Mac test.

Use **free QLC+** on the Mac. [Official DMX USB docs](https://docs.qlcplus.org/v4/plugins/dmx-usb) support FTDI adapters and Enttec Open-compatible output as **Open TX**. Compatibility with this exact received cable/Mac/fixtures is still a physical test. Do not assume every cheap USB/XLR cable is the same protocol; SH-RS09B is the specific selected proposal. No Freestyler or paid software dependency.

This is the **host-timed Open DMX class**, replacing the buffered interface. [ENTTEC's comparison](https://support.enttec.com/dmx/usbdmx/usbdmx-compare-enttecs-dmx-usb-devices) explains that Open lacks onboard processing/frame buffer. Thus timing depends more on the laptop; flicker/stutter under music/media load needs rehearsal. It has no claimed MAX-style stored snapshot. Start with simple slow scenes and test the actual music/TV workload. QLC+ documents native macOS USB support; do not install speculative VCP drivers. No driver/software installed here.

## Wiring, patch and costs

`Mac USB-C → suitable USB-A adapter/hub if needed → SH-RS09B → OPPSK → moving head A → moving head B → 120-ohm terminator`

The SH-RS09B includes the 5.9-ft interface-to-first-fixture lead. Exact connections replace the old L06 allowance: **one Cable Matters two-pack of 25-ft 3-pin DMX leads / $26.99**, **one two-pack 120-ohm terminators / $8.99**, and **one Anker A8731 two-pack USB-C to USB-A data adapters / $8.98**, total **$44.96**. [Exact links/quantities](../shopping-ready.md). One terminator/adapter spare; reuse an owned suitable data adapter first. First-lead reach and perimeter routing need measurement; excess never under rug. DMX is control, not music/power.

Provisional patch after received manuals/profile check: OPPSK **18CH at 001**, U’King A **11CH at 019**, B **11CH at 030**; highest channel 40, one universe ample. OPPSK exact map still missing. Do not blindly copy addresses from incorrect seller examples or force master/slave across different product families.

| Component | Proposed USD | Evidence/status |
|---|---:|---|
| OPPSK B0H6HJJ5DP | 179.99 | Oct 23 refreshed Chrome offer; exact map, support and input load pending |
| U’King two-head pack B0836CXMW6 | 129.99 | Oct 23 refreshed Chrome offer, pair total; independent mounts/fit pending |
| SH-RS09B 5.9-ft interface | 15.99 | Current live Chrome offer above |
| H35–37 exact DMX/terminator/USB connections | 44.96 | Oct 23 stock/Oct 24 option, final routes pending |
| **Three fixtures + control/connections** | **370.93** | Replaces prior $375.97 allowance-based total; $5.04 less |

Three fixture AC plugs fit the proposed one three-AC/two-USB Hollow supply, with guardian USB separate from DMX. Remove the **extra third H19 $19.98** that was added for four fixtures: retain two supplies total, one Grove and one Hollow. Mac/desk audio power still needs the actual outlet map; if additional distribution is needed, re-cost it. L07 **$25 independent-light-support allowance** remains, not a quote for an overhead rig. OPPSK listed 10.6 lb and moving heads do not use fabric hooks, guardian or bed. Dance area remains conditional on fixture/support placement outside routes; no laser fixture replacement.

## Automation and lower-cost fallback

QLC+ can coordinate color/brightness, restrained pixel chases and programmed spot motion. [Audio Triggers](https://docs.qlcplus.org/v4/virtual-console/audio-triggers) can use microphone or a tested audio feed to modulate functions/channels by volume/frequency. Program dimmer changes and bounded looks, not random rapid strobe or unrestricted motion. It is not automatic DJ beat-grid/drop analysis. Guardian USB eyes remain steady and separately powered.

For the premix, use repeating scenes/chases plus audio triggers first. A shared Show Manager audio/light timeline remains an optional music-task integration; independent playback starts do not guarantee nine-hour alignment. Retain accessible steady/normal and blackout controls; test interface detection, data loss, app exit, fixture power cycle and complete music/media load. No USB loss fallback/snapshot assumed.

**$0-interface fallback:** fixture built-in sound/auto/static modes, optionally master/slave within the U’King pair. They can react to the same music but OPPSK and movers are **not centrally choreographed**. No timed laptop show in this fallback. It is useful if the cable test fails or arrives late; no need to buy a second interface speculatively.

## Budget and next actions

[Current basket](../shopping-ready.md) now **$1,421.20** including five flat-wall fleece blankets plus thin furniture covers, expanded supports, **8 × 10-ft rug**, Guardian stand, exact DMX connections, refreshed lamp prices, tax/shipping and $30.48 contingency. **$178.80 below approximately $1,600 beyond that contingency.** Quantity-five fleece and thin-cover pack each show stock/free Oct 24; [current sourcing/cuts](../bedroom/draping/07-flat-walls-thin-covers-2026-10-23.md). Received fabric/mounting remains untested; independent fixture supports remain unpriced beyond the $25 reserve.

Next: full cloth quantity/delivery and tape checks; verify rug door/feet/grip fit; receive cable/lights and build simple patch; establish real supports/outlets; run same-laptop music/TV/light test and nine-hour elapsed rehearsal. Original [all-three/MAX research](fabric-and-combined-rig-2026-10-22.md) is historical for laser/interface choices. This plan is current. No purchases, seller messages, configuration or physical tests. A separate Oct 23 fabric shipping quote temporarily used Big Z’s cart, then restored it empty; [evidence](../research/final-offer-check-2026-10-23.md).
