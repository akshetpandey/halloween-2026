# Room capture for decor planning

Prepared October 21, 2026. Optional LiDAR capture can help us understand the apartment; ordinary photos plus a measured sketch are sufficient to start. We need positions and usable dimensions for decor decisions, not a perfect digital twin.

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

Commit only the useful derived measurements, inventory and annotated plans the host wants retained. Keep private identifying details out of those exports. No scan or photos have been supplied as of this guide's creation.
