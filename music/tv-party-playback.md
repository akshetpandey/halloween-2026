# Halloween Shorts · Android TV playback

Updated September 9, 2026. Library and base playlist verified in the host's signed-in Chrome session. The host approved the continuous video and clarified that it belongs in the existing Halloween Shorts library. The continuous derivative is built, technically verified and visible in the same library. No segment plugin installation or actual TV rehearsal performed.

## Live playlist

**[Halloween — October Grove](https://the-screening-room.com/web/#/details?id=a53a6452c866ca027b33e9def4f4e22b&serverId=71435b6dd7be4207a0220387ded760c5)** contains **25 tracks / 3h24m displayed**. These are the 25 approved complete originals. Its initial sequence follows library title order; shuffle was not enabled. The playlist was created with public access unchecked. Verify access if the television uses a different Jellyfin user.

- Server: The-Projector, Jellyfin 12.0.0.
- Library: Halloween Shorts, ID `ea9b35d956566f3baedf0a58a25171d3`.
- Playlist ID: `a53a6452c866ca027b33e9def4f4e22b`.
- Media: `/Users/akshet/Transmission/Halloween Shorts`.
- Playback on the actual Android TV device is untested; playlist creation does not enable repeat or credit skipping.

## Continuous party video · built and imported

Created [October Grove - Continuous Party Video](https://the-screening-room.com/web/#/details?id=69285593e12b8739814c101dc5117f08&serverId=71435b6dd7be4207a0220387ded760c5) from all 25 approved shorts, with individually chosen cuts and unchanged originals. The additional movie folder is inside the existing Halloween Shorts library. Video is 1920×1080 SDR H.264 at 25 fps with aspect-preserving letterboxing; frame duplication/drop converts differing source cadences to 25 fps. This is an additional compatibility encode, not a quality upgrade. The party copy has a generated silent AAC stereo track. Creator/source attribution is retained in SOURCES.txt beside the derivative and in the original files.

One encoded pass was repeated four times without another video encode into a **12:20:37.60 file**, with **100 chapters** at film starts. The file is **13,985,652,629 bytes (13.03 GiB / 13.99 GB)** and is imported in Halloween Shorts. This removes file-loading interruptions at film boundaries. Start from the beginning rather than resuming an old session. The finite file covers the evening and rollback with reserve; **it is not an infinite loop**. Four passes are unnecessary for unique content accounting but avoid relying on repeat controls during the party.

This route is recommended because the standard Android TV video queue in the inspected **v0.19.10** source ends after its final item. `hasNextItem()` only tests for another index, and `itemComplete()` ends playback when there is no next item. A web-player repeat setting should not be assumed to apply to Android TV. This is a source-based finding, not a test of the host's installed client. [Tagged official player source](https://github.com/jellyfin/jellyfin-androidtv/blob/v0.19.10/app/src/main/java/org/jellyfin/androidtv/ui/playback/PlaybackController.java).

For a genuinely endless loop, a separate controller that refills/restarts the TV queue would need development and a device test, or a tested external repeat-capable player would be needed. Neither is configured. The completed long continuous file is the selected fit for the host's official-client requirement and smooth joins.

The host approved compilation on September 9 and then clarified that it should go in the **existing Halloween Shorts library**, superseding the brief request for a new library. The [cut record](tv-party-cuts.md) and [edit decision list](tv-party-edit.json) record each source range and exception. [Build helper](build-tv-party-video.py) encodes and verifies the segments, repeats them four times, adds a silent AAC track and 100 chapters, and writes an additional movie folder. The final ranges total **3:05:09.40 per cycle**, removing **18:45.52 (9.2%)** from the complete sources. Verification passed: all 27 encoded sections fully decoded; all 1,110,940 final video packets have continuous 25 fps timestamps; all four cycles have identical encoded payload hashes; all 100 chapters are contiguous; silent audio samples passed at the beginning, second cycle and end. All 25 original SHA-256 hashes were rechecked before assembly. [Build report](tv-party-build.json) · [Verification helper](verify-tv-party-video.py). The opening footage played successfully in the signed-in Chrome Jellyfin player. Browser chapter seeks were not verified. Actual Android TV playback and an unattended endurance run remain untested.

## Alternative · keep individual shorts

Android TV **0.18 and later** supports Jellyfin media segments. Each film needs an **Outro** segment from the chosen credit start through the actual file end. On the TV, choose **Skip** for Outro, rather than the default **Ask to skip**. This skips without a remote-button prompt. The timestamps belong to item metadata, not playlist start/end fields. [Official Android TV release explanation](https://jellyfin.org/posts/androidtv-v0.18.0/).

Jellyfin's official **Chapter Segments Provider** can turn named chapters into segments; files without credit chapters need those timestamps authored first. Alternatively, a segment editor/provider can store manually reviewed markers. After configuring a provider, run **Media segment scan**. No plugin has been installed, server restarted, or segments written in this session. [Official media-segment setup](https://jellyfin.org/docs/general/server/metadata/media-segments/).

For unattended separate-item playback, also disable **Show inactivity timeout popup** and **Show next video info** in the actual Android TV app. Those names and their effect on advancing the queue are verified in the [tagged settings strings](https://github.com/jellyfin/jellyfin-androidtv/blob/v0.19.10/app/src/main/res/values/strings.xml) and player source linked above. These TV preferences were not changed through Chrome. Repeated entries in a longer finite queue, if duplicate handling is verified, could cover the night; automatic outro skipping by itself does not supply repeat-all or remove buffering between files.

If media segments prove unreliable on the device, separate trimmed derivatives are another option. They still load separately and therefore cannot guarantee smooth joins. Prefer new copies over replacing the original library files.

## Credit review and retained runtime

[Machine-readable candidate windows](tv-credit-review.json) cover all 25 films and identify the exact source files by SHA-256. Sixteen frames from the final 40% of every file were visually inspected. The contact sheets remain outside Git at `/Users/akshet/Transmission/.halloween-downloads/credit-review`.

The rough window sums span **3:04:27–3:10:33 retained**, before any opening trims, versus **3:23:55 raw**. That implies approximately **7–10% removed**, not 30%. These are preliminary editing bounds, not a measured finished runtime; some windows include intentional closing imagery. The 2–3-hour unique-content goal is therefore likely exceeded by several minutes if all endings are preserved. There is no present need to find additional shorts.

Special cases:

- **O Black Hole!** continues animating under early credits. Preserve that ending and investigate the later move to plain black credits.
- **La Noria** has credit text over Ferris wheel imagery. Decide how much of that visual coda to retain after the narrative ending.
- **Les Escargots** continues almost to the end. Do not force a large credit cut where no substantial end-credit block exists.
- **Kukuschka** overlays credits on a changing sky; preserve the final night scene.
- **The Old Man & the Goblins** has a long pale fade before credits. Refine the last action rather than cutting by a fixed percentage.

The initial candidate review is retained as historical evidence. It was refined with one-second ending sequences, expanded opening surveys, and independently sought frames at 0.3-second intervals around cuts. This is visual frame inspection, not a claim of continuous human viewing. The final editorial choices are in [tv-party-edit.json](tv-party-edit.json). The Mountain of SGaana has a later blanket/bed coda and The Old Man & the Goblins has a brief goblin coda; both are retained as second ranges after excising intervening credits. O Black Hole! retains its animated ending underneath early credits. Long opening padding is removed, while illustrated titles and internal chapter cards remain. The originals are untouched.

## Acceptance test on the actual TV

1. Confirm the installed official Android TV version and access to the playlist/reel with the TV's Jellyfin account.
2. Play several joins, including low-resolution, 4K and AV1 source cases if using individual films. For the reel, verify aspect ratio, muted audio, motion and chapter seeks.
3. Confirm direct play or acceptable transcoding while the Mac runs bedroom music and serves the other room.
4. Verify no next-video or inactivity dialogs interrupt playback. Disable device screensaver/sleep behavior only as needed for the party.
5. Seek across the first cycle boundary and near the final file end to verify intended finite coverage. Test the full unattended duration before party day; a quick seek check is not an endurance test.

[Source files and acquisition checks](tv-library-setup.md) · [Approved programme](tv-visuals.md).
