#!/usr/bin/env python3
"""Acquire public, unprotected source candidates for current shared Hollow Keeps.

No Spotify audio extraction, cookies, authentication bypass or purchases. Source
metadata is version evidence, not an acoustic identity or reuse-license claim.
Original files, provider metadata and manifests belong in ignored local storage.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from pathlib import Path
import re
import subprocess
import unicodedata

from analyze_audio import digest, write_json
from prepare import DEFAULT_DB, approved_pool, file_key, host_rows, probe_duration


def normalized(text):
    text = unicodedata.normalize("NFKD", text).casefold()
    text = re.sub(r"[\[(]\s*(?:feat\.?|featuring|ft\.?)\s+[^)\]]*[\])]", "", text)
    text = re.sub(r"\b(?:feat\.?|featuring|ft\.?)\s+[^–—\-\[(]+", "", text)
    return "".join(c for c in text if c.isalnum() and unicodedata.category(c) != "Mn")


def version_match(track, info):
    """Accept corroborated distributor/artist metadata, rejecting other edits."""
    expected = track["title"]
    actual = info.get("track") or info.get("title", "")
    duration = info.get("duration") or 0
    if abs(duration - track["duration_ms"] / 1000) > 5:
        return False, "catalog duration mismatch"
    description = info.get("description", "")
    supplied = "provided to youtube by" in description.casefold()
    artists = track.get("artists", [track["artist"]])
    channel = normalized(re.sub(r"\s*-\s*Topic$", "", info.get("channel", "")))
    official_artist = channel in {normalized(a) for a in artists}
    label = info.get("channel", "") in {"UKF Drum & Bass", "UKF", "Spinnin' Records", "Armada Music TV", "Monstercat Uncaged", "Anjunabeats", "Revealed Music", "Selected."}
    if not ((supplied and info.get("track") and info.get("artist")) or official_artist or label):
        return False, "needs distributor metadata or artist/label channel evidence"
    artist = normalized(info.get("artist") or track["artist"])
    if not any(normalized(a) in artist for a in artists):
        return False, "artist mismatch"
    for name in sorted(artists + [track["artist"]], key=len, reverse=True):
        actual = re.sub(r"^" + re.escape(name) + r"\s*[-–—:]\s*", "", actual, flags=re.I)
    actual = re.sub(r"\s*[\[(](?:official\s*)?(?:audio|video|music video|visuali[sz]er)[\])]", "", actual, flags=re.I)
    # Radio/edit labels are sometimes absent from the distributor's title. Their
    # identity remains provisional; a different remix/extended/show/live version
    # is never accepted just because its length happens to be close.
    markers = r"\b(extended|remix|live|mixed|instrumental|dub|sped|slowed|asot)\b"
    if set(re.findall(markers, expected.casefold())) != set(re.findall(markers, actual.casefold())):
        return False, "version qualifier mismatch"
    clean = lambda s: normalized(re.sub(r"\b(?:radio\s*)?(?:edit|mix)\b", "", s, flags=re.I))
    if clean(expected) != clean(actual):
        return False, "title/version mismatch"
    source = "distributor-provided" if supplied else "artist/label-channel"
    return True, source + " artist/title/version and catalog duration within 5 seconds; not acoustic verification"


def command(args, timeout=90):
    result = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        raise ValueError(result.stderr[-1200:])
    return result.stdout


def acquire_track(track, root):
    ident = track["id"]
    key = file_key(ident)
    directory = root / "sources" / key
    directory.mkdir(parents=True, exist_ok=True)
    receipt = directory / "source.json"
    if receipt.exists():
        old = json.loads(receipt.read_text())
        path = Path(old["path"])
        if (old.get("spotify_uri") == track["spotify_uri"] and path.exists()
                and digest(path) == old["sha256"]):
            return old
        raise ValueError("Acquired file changed; inspect before replacing: " + ident)
    candidates = []
    candidate = track.get("youtube", {})
    for c in [candidate] + candidate.get("alternatives", []):
        if re.fullmatch(r"[A-Za-z0-9_-]{11}", c.get("video_id", "")):
            candidates.append(c["video_id"])
    errors = []
    searched = False
    while True:
        for video in dict.fromkeys(candidates):
            cache = directory / (video + "-info.json")
            try:
                if cache.exists():
                    info = json.loads(cache.read_text())
                else:
                    text = command(["yt-dlp", "--no-playlist", "--no-cache-dir",
                                    "--no-warnings", "--socket-timeout", "15",
                                    "--skip-download", "--dump-single-json",
                                    "https://www.youtube.com/watch?v=" + video])
                    info = json.loads(text)
                    write_json(cache, info)
                accepted, basis = version_match(track, info)
                if not accepted:
                    errors.append({"video": video, "reason": basis})
                    continue
                output = directory / (video + ".%(ext)s")
                command(["yt-dlp", "--no-playlist", "--no-cache-dir", "--no-warnings",
                         "--no-progress", "--socket-timeout", "15", "--retries", "2",
                         "--fragment-retries", "2", "--max-filesize", "50M",
                         "-f", "bestaudio[ext=webm]/bestaudio", "-o", str(output),
                         "https://www.youtube.com/watch?v=" + video], timeout=180)
                files = [p for p in directory.glob(video + ".*") if p.suffix in (".webm", ".m4a", ".opus", ".mp3")]
                if len(files) != 1:
                    raise ValueError("Expected exactly one acquired audio file")
                path = files[0].resolve()
                seconds = probe_duration(path)
                if abs(seconds - track["duration_ms"] / 1000) > 5:
                    raise ValueError("Downloaded audio duration differs from catalog")
                result = {"id": ident, "spotify_uri": track["spotify_uri"],
                          "isrc": track.get("isrc"), "path": str(path),
                          "sha256": digest(path), "duration_seconds": seconds,
                          "source": "Public artist/label/distributor YouTube audio: https://www.youtube.com/watch?v=" + video,
                          "source_url": "https://www.youtube.com/watch?v=" + video,
                          "source_title": info["title"], "source_artist": info.get("artist") or track["artist"],
                          "source_album": info.get("album"), "channel": info.get("channel"),
                          "version_verified": True, "version_evidence": basis,
                          "acoustic_identity_verified": False,
                          "license": info.get("license"),
                          "acquisition_status": "public compressed stream; not purchased; reuse license not established"}
                write_json(receipt, result)
                return result
            except (ValueError, OSError, subprocess.TimeoutExpired, json.JSONDecodeError) as error:
                errors.append({"video": video, "reason": str(error)})
        if searched:
            write_json(directory / "unresolved.json", {"id": ident, "errors": errors})
            return {"id": ident, "spotify_uri": track["spotify_uri"], "blocked": errors[-5:]}
        query = (track.get('artists') or [track['artist']])[0] + " " + track["title"] + " Topic"
        data = json.loads(command(["yt-dlp", "--no-cache-dir", "--no-warnings",
                                  "--flat-playlist", "--dump-single-json", "ytsearch5:" + query]))
        write_json(directory / "search.json", data)
        candidates = [e["id"] for e in data.get("entries", []) if re.fullmatch(r"[A-Za-z0-9_-]{11}", e.get("id", ""))]
        searched = True


def acquire(database, root, workers=3, limit=None):
    tracks, excluded = approved_pool(host_rows(database))
    if limit:
        tracks = tracks[:limit]
    root.mkdir(parents=True, exist_ok=True)
    write_json(root / "selection-private.json", tracks)
    results = []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(acquire_track, t, root): t for t in tracks}
        for future in as_completed(futures):
            track = futures[future]
            try:
                result = future.result()
            except Exception as error:
                result = {"id": track["id"], "spotify_uri": track["spotify_uri"], "blocked": str(error)}
            results.append(result)
            bindings = {r["spotify_uri"]: r for r in results if r.get("path")}
            write_json(root / "file-map.json", bindings)
            write_json(root / "acquisition-report.json", {"approved": len(tracks), "results": results, "excluded": excluded})
            print(f"{len(results)}/{len(tracks)} ready={len(bindings)} " + track["id"] + (" OK" if result.get("path") else " BLOCKED"), flush=True)
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, default=DEFAULT_DB)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--workers", type=int, choices=range(1,5), default=3)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--acquire", action="store_true", required=True)
    args = parser.parse_args()
    acquire(args.database, args.output.resolve(), args.workers, args.limit)
