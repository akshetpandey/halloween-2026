# Halloween Shorts · files and Jellyfin setup

Updated September 9, 2026. The host requested downloads of the 25 approved shorts, using yt-dlp at the best available quality and cross-checking YouTube/Vimeo when necessary. Files are arranged locally; all 25 passed full audio/video decode checks. Adding the server library requires an authenticated Jellyfin admin session; the Codex browser currently shows the sign-in page.

## Library choice

Create a **separate Movies-type library named Halloween Shorts**, rooted at:

```text
/Users/akshet/Transmission/Halloween Shorts
```

The content type describes how Jellyfin treats standalone films; it does not require using the existing Movies directory. The existing Movies and Shows library paths were read from their `.mblink` files and each points specifically to its corresponding directory, not the whole Transmission folder. The new sibling directory therefore stays outside both existing libraries.

Each short has one folder, one complete video and `movie.nfo` with its approved title, creator, animation genre and Halloween 2026 tag. Local metadata is locked to avoid erroneous matches for generic titles. The Astronomer's Dream folder includes 2009 to distinguish Sutherland's film from Méliès' film. There are no features or rejected shorts in the library folder.

[Jellyfin movie organization](https://jellyfin.org/docs/general/server/media/movies/) · [Library setup](https://jellyfin.org/docs/general/server/libraries/) · [Local NFO metadata](https://jellyfin.org/docs/general/server/metadata/nfo/).

## Add the library

1. Sign in as an administrator at the existing local Jellyfin server, `http://localhost:8096`.
2. Open Dashboard → Libraries → Add Media Library.
3. Choose **Movies**, display name **Halloween Shorts**, and the folder above. Do not add this folder to the existing Movies library.
4. Disable internet metadata fetchers for this library; use the supplied local NFO files. Leave local image extraction available. This avoids matching unrelated films with the same titles.
5. Save, scan the new library and confirm **25 films** with the expected names. Create a video playlist from these items if a fixed sequence is desired, then test repeat on the actual television. Client playback and looping have not been tested.

Server discovery on September 9 returned Jellyfin **12.0.0**, server name **The-Projector**. No credentials were extracted, configuration files edited, or existing libraries changed.

## Files and quality

[Download manifest](tv-download-manifest.json) records the exact 25 approved titles, selected viewing URLs and destination folder names. [Verified inventory](tv-download-inventory.json) records local paths, actual durations, dimensions, codecs, sizes, SHA-256 hashes and full decode results. Videos remain outside Git.

The final files total **12,234.921 seconds: 3:23:55**, occupying **5.95 GiB** (about 6.39 GB). The host's 70%-retained planning scenario gives **about 2:22:44**; credit boundaries have not been measured. Differences from the original 3:24:20 research total reflect actual selected upload versions, not cuts made during this task.

- The Mountain of SGaana and Throat Notes are **3840×2160**. Most other films have Full HD source dimensions, preserving wider or narrower original aspect ratios.
- Nebula was upgraded from the official Vimeo 720p upload to the official GOBELINS YouTube **1920×1080** upload.
- The Astronomer's Dream uses Animalcolm's YouTube **638×360** version, improving on the Vimeo stream's **480×272**. A full HD source was not found; the chosen upload is about 13.9 seconds shorter than the Vimeo runtime.
- The Old Man & the Goblins remains the creator's **640×480** Vimeo source. The creator's YouTube copy is also 480p, so there is no HD upgrade from that route.
- Les Escargots uses the **720×540** Vimeo upload. A 1280×720 YouTube alternative was downloaded for comparison; sampled frames have substantial black borders and a visibly different scan. The cleaner Vimeo copy was retained. Its actual runtime is **10:47.85**, compared with the original Criterion reference's 11:25; title/scene/end samples match the short. No claim of identical editions or frame-by-frame completeness is made.
- NFB's ordinary yt-dlp extractor could not parse its current player. The public embedded players expose an HLS source, which yt-dlp downloaded successfully for all three NFB films. No login, paywall or DRM bypass was used. Their actual file runtimes differ slightly from the catalogue values, especially The Man Without a Shadow at **9:53.96** versus the catalogue's 9:35.

The complete downloaded streams retain audio and credits. Containers/codecs include MP4/MKV with H.264, VP9 or AV1 video; files were merged without re-encoding. The actual TV may require transcoding some formats. Do not assume direct play until tested.

## Local playlist and repeatability

A UTF-8 M3U playlist is saved beside the folder at `/Users/akshet/Transmission/Halloween Shorts.m3u8`. Its 25 relative paths follow approval-list order, as a convenient local-player fallback rather than a finished party sequence. Import/playback of that playlist has not been tested in Jellyfin.

The resumable helper is [download-tv-shorts.py](download-tv-shorts.py):

```sh
python3 music/download-tv-shorts.py
python3 music/download-tv-shorts.py --title 'Chado'
```

It uses the installed yt-dlp, ffmpeg and ffprobe, verifies duration and audio/video streams, and refuses to overwrite existing library videos. A successful cached download is skipped. Full-source metadata, logs, original comparison copies and result state live outside the library in `/Users/akshet/Transmission/.halloween-downloads`; signed media URLs are not committed. The script downloads the source versions recorded in the manifest; it does not repeat this session's quality comparisons automatically.

No purchases or distribution permissions were obtained. The original NFB download-to-own streaming-server caveat remains relevant to any future DTO purchase; this task did not purchase DTO files or treat downloads as a new licence grant. The host's explicit download instruction authorized the local acquisition work.

Next: add/scan the library, establish per-film credit markers, choose the final order and test TV playback, mute and repeat. Full technical decoding is distinct from a human viewing of every film or a TV rehearsal.
