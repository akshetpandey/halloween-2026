# Room capture for decor planning

## October 29 corrected review layout

[Updated vector](party-layout-2026-10-29.svg) removes the fifth chair, identifies one nightstand/low cabinet as shrine and applies already documented 8×10 rug coordinates. Original PNG/cutaways remain historical renders. Scan shell and accepted furniture positions unchanged; new foliage/branch attachment spans are proposed in [current room plan](../final-room-plan.md), not measured.

Prepared October 21, 2026. Optional LiDAR capture can help us understand the apartment; ordinary photos plus a measured sketch are sufficient to start. We need positions and usable dimensions for decor decisions, not a perfect digital twin.

## Current party arrangement — later October 21

[Scaled party layout](party-layout-2026-10-21.png) · [SVG](party-layout-2026-10-21.svg) · [Coordinates](party-layout-2026-10-21.json) · [Grove cutaway](grove-cutaway-2026-10-21.png) · [Hollow cutaway](hollow-cutaway-2026-10-21.png). These implement the accepted corner/desk and Grove furniture moves on actual geometry. They supersede the original scanned furniture positions as the proposed party arrangement. The earlier interactive workbench retains comparison defaults; it is not the final arrangement. All raw sources remain ignored.

## Later October 22 — larger Hollow rug

[New 8 × 10-ft rug fit](hollow-rug-fit-2026-10-22.png) · [Vector](hollow-rug-fit-2026-10-22.svg). Current coordinates update the rug only, with accepted furniture positions preserved. Earlier whole-apartment PNG/SVG and cutaway retain the old 5 × 7 rug as historical sizing evidence; use this new diagram for rug decisions. Actual door sweep, rug grip and furniture contact remain untested.

## Scan received — October 21

The supplied GLB and top-down screenshot have been processed locally. **No Business floor-plan export is needed for this planning pass.** Start with the [corrected base plan](apartment-base-plan-2026-10-21.png), [scan review and bedroom space calculation](scan-review-2026-10-21.md), and [derived measurements](scan-measurements-2026-10-21.json). The bedroom space study is shown inline in the decor chat; its [source](bedroom-space-study.html) is retained here. Original inputs remain ignored under `raw/`.

Host corrected Other 1 to the main entrance / coat closet area, Other 2 to a small closet, and living/dining/kitchen to one October Grove. Bedroom is The Hollow. Model the upright-bed/guardian/automated-desk arrangement using the host's **15-in stored bed depth and 49 × 29.5-in desk**. There is no human DJ; both small speakers sit on the desk. Upright support remains unresolved. Remaining checks are one tape scale reference, tabletop fit, construction/mounting details and photos; do not repeat the whole scan. The capture instructions below are retained as reference.

## Confirmed phone and recommended workflow

Host confirmed **iPhone 16 Pro** October 21. Apple lists its [LiDAR scanner](https://support.apple.com/en-us/121031), and [Polycam's supported-device list](https://learn.poly.cam/hc/en-us/articles/30299187161620-How-to-Create-Floorplan-Captures) explicitly includes it. Use **Polycam Floorplan for capture, Floorplanner for moving furniture and comparing layouts**. The capture should take a short session; do not spend a full build day perfecting it.

For this chat, the best packet is a top-down view with dimensions/units, two or three ordinary corner photos per main room, a bathroom doorway view, and a simple furniture list. For bed, sofa, coffee table, DJ table, speaker stands and nightstands, record **width × depth × height**, whether movable, and where it could go **inside** the apartment. Include closet door opening/interior sizes before assuming nightstands fit, plus outlets and heaters marked on the sketch. Keep furniture in place during the first scan; photos explain what simplified scan objects actually are.

[Floorplanner](https://floorplanner.com/personal) is the recommended layout sandbox: browser-based scaled 2D drawing, 3D preview, movable library furniture, manual dimensions and an uploaded/scaled floor-plan image as tracing reference. Its current free personal tier lists five projects, three designs total and SD exports; enough to compare a few party layouts. Generic furniture sized to actual footprints is sufficient. It is not an automatic Polycam mesh import or a photorealistic prediction of purple light, fabric sheen or guest capacity. No new account or uploaded home model has been created here.

Fast sequence: scan one room, confirm a screenshot/export can be saved, then capture the others. Send the dimensioned view + photos + furniture sizes in this decor chat, or give their local paths. A **GLTF ZIP including BIN/textures** is useful if convenient; Polycam currently lists GLTF as its free export. Check the actual export screen; floor-plan PDF/PNG/measurement exports vary by tier/mode. A screenshot plus tape measurements is enough if export is paywalled. No paid subscription is needed for the first planning pass.

After inputs arrive, compare **A: minimal furniture movement** with **B: nightstands stored in closets / furniture redistributed within the apartment**. That early keep-flat default is superseded for planning by the accepted upright corner arrangement above; actual support remains unresolved. Derive the actual plan and fabric/cable quantities from those options; the [current plan](../final-room-plan.md) now contains the scan-derived arrangement and remaining tape checks.

## Recommended route

If your exact iPhone has a supported LiDAR sensor, use **Polycam Floorplan mode** for the measured room shell. Polycam's guide lists compatibility and recommends good lighting, fixed open doors, visible corners, and avoiding or covering large mirrors/glass. Its Floorplan mode is available on supported iOS devices across its listed plans. [Official capture guide](https://learn.poly.cam/hc/en-us/articles/30299187161620-How-to-Create-Floorplan-Captures).

Polycam's export guide currently lists **GLTF on Free**; other formats and measured floor-plan exports depend on subscription tier/capture mode. Check the actual export screen before paying. Do a small test room and confirm the output can be saved before spending time scanning the whole apartment. [Official export guide](https://learn.poly.cam/hc/en-us/articles/27756102599572-What-File-Types-Can-Polycam-Export).

Apple describes RoomPlan as using camera/LiDAR data to build a room floor plan with dimensions and furniture categories. This is useful layout input, but objects may be simplified rather than captured as exact shapes. [Apple RoomPlan overview](https://machinelearning.apple.com/research/roomplan).

## Practical capture packet

1. Identify the iPhone model; don't assume every iPhone has LiDAR. If unsupported, skip to photos and a measured sketch.
2. With normal room lights on, scan living room, bedroom and bathroom. Capture doorways/connections and leave furniture in its current positions. Follow the app's capture directions; keep doors fixed during each scan. Large windows/mirrors may produce gaps, so photograph those separately.
3. Save a top-down view showing dimensions/units if available, plus two or three oblique screenshots. If a measured export is paywalled, a screenshot of measurements plus the sketch is enough for the first pass; don't buy an annual subscription for this task.
4. Export the actual model if convenient: GLTF with its accompanying BIN/textures, preferably kept together in a ZIP; GLB or USDZ is also usable if your app offers it. A bare GLTF without referenced resources may be incomplete. Keep the original export as well as screenshots.
5. Add ordinary photos from room corners showing windows, floor transitions, ceiling, wall finish, outlets, furniture and the tub/shower-curtain rail. Note what may move and what must stay.
6. Tape-measure the dimensions driving purchases: window/backdrop widths and heights, room/floor footprint, door clearance, bed/DJ-table footprint, tub/curtain width. Include at least one measured wall length to cross-check model scale. Record units and which dimensions came from a tape versus the app.

The new task can inspect exported geometry and use screenshots/photos to make an annotated plan. Direct 3D-file viewing depends on available tools; screenshots and verified dimensions are the reliable shared input. Don't spend an evening perfecting the scan or build a viewer before selecting lights and fabric.

## Local files and privacy

Place original scans and personal room photos in `decor/space-inputs/raw/` (ignored by Git). Use clear room names. Start with a small packet rather than repeated huge uploads. Share it in the new decor task or provide its local paths; no public scan-map upload is needed.

Commit only the useful derived measurements, inventory and annotated plans the host wants retained. Keep private identifying details out of those exports. October 21: the GLB and screenshot are now received; neither raw file is tracked in Git.
