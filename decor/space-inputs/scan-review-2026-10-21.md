# Apartment scan review — October 21, 2026

**Received and processed locally.** The host's Polycam GLB is sufficient to derive our planning view; no paid floor-plan export is needed for this step. [Corrected base plan PNG](apartment-base-plan-2026-10-21.png) · [Editable SVG](apartment-base-plan-2026-10-21.svg) · [Derived measurements](scan-measurements-2026-10-21.json) · [Bedroom space study source](bedroom-space-study.html).

This replaces the independent rectangles in the [earlier conceptual schematic](../room-layout-provisional.png) as the source of apartment geometry. Decor placement, mounting and purchases remain proposals.

## Host corrections and current bedroom proposal

Direct answers October 21:

- **Other 1 = main entrance vestibule**, with a coat closet on the right. The model includes a side opening but does not capture that closet's interior.
- **Other 2 = small closet.** Living / Dining / Kitchen are one awkwardly shaped open **October Grove** area, not three enclosed rooms.
- Bedroom = techno dungeon / The Hollow. Host proposes moving the desk in, standing the bed **upright on its edge against the closet wall**, placing the guardian in front, then the desk/DJ setup in front of the guardian.
- Latest dimensions from host: bed is **15 in deep without legs**, and desk is **49 × 29.5 in**. Host explicitly asks us to assume leg removal, or a flipped arrangement with the guardian concealing the legs, keeps stored depth at 15 in. Use this supplied depth for the footprint study; bed support and actual protrusions are not established by the scan.
- Later correction in this same chat: **no human DJ**; the guardian is the pretend DJ and playback/equipment on the desk is automated. The two speakers are small enough to sit **directly on the desk**. Remove the earlier human standing bay and speaker floor bases from the layout. Tabletop equipment fit and actual playback have not been tested in this task.

The central narrow recess between kitchen and bathroom is not classified by a floor mesh and was not identified by the host. It is **not assumed to be the apartment entrance**. Door hinges/swings and closet door operation still need ordinary photos. The screenshot shows some swings, but their direction was not encoded in the GLB door planes.

## What the geometry gives us

All figures below are **scan estimates, not tape-confirmed**. Feet/inches are rounded for use. Model coordinates follow the supplied screenshot, not compass north.

| Quantity | Derived estimate | Interpretation |
|---|---:|---|
| Bedroom maximum inside-wall width | 2.795 m / **9′2″** | Narrower at the stepped upper-right corner |
| Bedroom inside-wall depth | 4.171 m / **13′8″** | Closet-front boundary to opposite window wall |
| Bedroom floor mesh area | 11.908 m² / 128.2 sq ft | Boundary runs to wall centerlines; not all usable interior |
| Bedroom estimated inside-wall shell | 11.201 m² / **120.6 sq ft** | Inset 5 cm for the modeled 10 cm walls; stepped corner included, furniture excluded |
| Bed bounding footprint | 2.189 × 1.682 m / **7′2″ × 5′6″** | Approximately **39.6 sq ft** flat; simplified scan asset |
| Bed bounding height, including scanned base/legs | 0.596 m / **23.4 in** | Original simplified scan asset; superseded for stored depth by the host's 15-in figure |
| Host-provided stored bed depth | **15 in / 0.381 m** | Assumes legs removed or host's flipped/hidden-leg arrangement; support unresolved |
| Upright footprint at supplied depth | 2.189 × 0.381 m / **9.0 sq ft** | Geometric study only; about **30.6 sq ft recovered** versus flat |
| Open Grove floor meshes combined | ~28.832 m² / 310.3 sq ft | Before wall correction, counters, furniture and routes; not guest capacity or total apartment area |
| Small central closet floor mesh | ~0.901 × 0.695 m / 35½ × 27⅜ in | Centerline bounds; usable interior and door opening are smaller and need checking |
| Bathtub object bounding box | ~1.558 × 0.808 m / 61⅜ × 31⅞ in | Outer simplified asset, **not** tub interior or curtain-rail size |

## Bedroom: floor left by the proposed stack

The interactive study uses the corrected bedroom shell and the host's sequence, facing toward the entrance: **closet wall → upright bed → independently supported guardian → automated desk with speakers → dancing**. There is no human DJ bay or speaker floor stand. A side route provides occasional controls/maintenance access. It assumes the nightstand and the low cabinet under the bedroom's upper window can be relocated elsewhere **inside the apartment**. Their destinations are not yet verified. Leaving the cabinet in place removes roughly 4.6 sq ft from the front study.

Current study inputs distinguish host dimensions from planning allowances:

| Element | Default allowance |
|---|---|
| Upright bed | 86.2 in along closet wall from scan × **15 in stored depth from host** |
| Guardian's independent support | 1.00 × 0.30 m / ~39 × 12 in |
| Desk | **49 × 29.5 in**, supplied by host |
| Human DJ / speaker floor bases | **None** — guardian is pretend DJ; small speakers sit on desk, per host |
| Side access / entry route | **0.85 m / ~33½ in planning allowance**, not a code-compliance finding |

With those inputs, roughly **98 sq ft is unoccupied by the blocks**, including circulation and side pockets. About **54 sq ft remains in the front dance study** after excluding the reserved entry/side route. That area is irregular: it must not be described as a clear rectangle or converted into an approved guest count. Bed + guardian allowance + desk use about **4′8″** of room depth, leaving approximately **9 ft ahead of the desk before the stepped corner/route deductions**. Earlier 79 / 33 sq ft (human DJ / floor speakers) and 93 / 51 sq ft (placeholder dimensions) are superseded.

For comparison, keeping the bed flat against the same closet wall with the **same automated booth arrangement** leaves about 68 sq ft unoccupied and 27 sq ft in front. This is a comparison of that arrangement only, not an optimized flat-bed layout. A different booth orientation may improve it.

Reducing stored bed depth from the original 23.5-in placeholder to the supplied 15 in recovers about **5.1 sq ft of total floor**. The current study already includes that saving; do not count leg removal a second time.

The study lets the host change desk size, stored depth and block positions. The automated desk and guardian move together; the bed moves separately. Speakers are included on the desk rather than as separate floor blocks. It calculates a union of occupied footprints on a 1 cm sampling grid, so overlaps are not double-subtracted. It flags overlaps, objects outside the shell and blocks in the reserved route. "Unoccupied" does not establish ventilation, window access, door operation, support stability or capacity.

**Upright support remains unresolved.** An ordinary freestanding bed on its edge cannot be assumed stable; removing legs does not establish a support system. No straps, wall anchors or DIY restraint design have been specified or approved. The scan cannot settle bed construction, removable legs, loads or securement. Until a suitable support/storage arrangement exists, the physical execution plan retains its flat-bed fallback and the guardian has its own support. This is a layout calculation, not a reason to stand the bed up to test it.

## Windows and purchasing implications

Window IDs on the new base plan are local labels W1–W7, corresponding to GLB nodes Window_0–Window_6.

| Bedroom window | Scanned span | Scanned opening height | Top of opening above model floor |
|---|---:|---:|---:|
| W4 — upper wall | **79.9 in** | **83.5 in** | ~112.6 in |
| W6 — right wall | **104.6 in** | **82.7 in** | ~112.3 in |

These spans supersede the hypothetical two 72-in runs in the [fabric price example](../shopping-ready.md). At 1.25 fullness with an illustrative four inches added at each side, each run needs **three 52-in panels**: six panels / three pairs in total, if the same compatible panels can be distributed between runs. Buying pairs separately per window would unnecessarily round this up to four pairs. Actual edge overlap, opacity, usable panel width, mounting and drop still need tape/photos.

The opening height is already nearly 84 in, so **52 × 84 in is not a confirmed fit** once mounting above the opening and bottom overlap are allowed. Do not order H22–25 using the old example counts or selected curtain length. No alternative-length price, support quantity or revised delivered total has been verified here. The $973.12 basket remains an example; preserve the $1,000 ceiling and apply its scope cuts when the fitted package is priced. No budget amount or purchase status changed in this scan review.

## Next small input packet

1. Desk dimensions are now supplied: **49 × 29.5 in**. Check both small speakers, controller/laptop, wiring and cooling fit on that tabletop; no floor stands are planned.
2. One tape-measured inside bedroom wall for scale, plus bed model/construction photos to resolve upright support. The calculation uses the host's 15-in stored depth assumption, with no second approval requested for modeling it.
3. Bedroom photos showing closet fronts, door swing, low cabinet, windows, outlets and heaters; where the nightstand/cabinet will go inside the apartment.
4. Window mounting-to-finish drop and span including edge overlap; proposed DJ backdrop span; bathroom rail/drop and actual dry shelf/tub fit. No repeat whole-apartment scan is needed.

## Method and provenance

- Original `/Users/akshet/Downloads/10_21_2026.glb` and supplied screenshot copied to ignored `raw/`. Original bytes retained; no upload to a third-party planner or scan service.
- GLB v2, **378,576 bytes**, 133 nodes, 121 meshes, 37 materials, 12 embedded images. SHA-256: `11f62df6f940c3e3ad5f7cb7491b4b37390114324f2746e3b0d6d8b1ce539bbd`.
- All node transforms in this export are identity. Positions/indices decoded from the binary chunk with accessor offsets/strides; top triangles give floor boundaries/areas. The [glTF specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#coordinate-system-and-units) defines +Y up and linear positions in metres. This supports unit interpretation, not scanner accuracy.
- Wall faces intersected at Y = 1.2 m; solid intervals along each wall projected to its modeled thickness. This preserves windows/doors and the broad vestibule opening without drawing every overhead lintel as a blocked route. Simplified joints and furniture bounding boxes are a planning representation.
- The base-plan drawing uses **133 px per metre** and includes a one-metre bar. It can be traced/scaled manually in the previously recommended Floorplanner workflow. No automatic GLB import, public share link or new account is implied.
- Generated SVG XML and measurement JSON are editable. The PNG and inline bedroom fragment were visually inspected; details of checks are in the [scan handoff](handoff-2026-10-21-scan.md).
