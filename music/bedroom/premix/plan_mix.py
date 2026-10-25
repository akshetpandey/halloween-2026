#!/usr/bin/env python3
"""Choose and validate an evidence-informed mix plan. Never launch/render REAPER."""

import argparse
import hashlib
import itertools
import json
import math
import re
import subprocess
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

from actual_audition import warped_clip
from analyze_audio import analyze_track, digest, write_json
from audio_intelligence import join_evidence, vocal_fraction
from prepare import DEFAULT_DB, approved_pool, check_file, host_rows, probe_duration
from reaper_proof import save_plan

BASE = Path(__file__).resolve().parent
VERSION = "mix-planner-1"
LANES = ["Tech house", "Acid", "Techno", "Trance", "Drum & bass"]
KEYS = {
    "C": 0,
    "C#": 1,
    "Db": 1,
    "D": 2,
    "D#": 3,
    "Eb": 3,
    "E": 4,
    "F": 5,
    "F#": 6,
    "Gb": 6,
    "G": 7,
    "G#": 8,
    "Ab": 8,
    "A": 9,
    "A#": 10,
    "Bb": 10,
    "B": 11,
}


def choose_grid(track, evidence):
    """Retain the measured tempo; only adopt a coherent independent phase."""
    import numpy as np

    if not track["grid"].get("usable_constant_grid"):
        raise ValueError("Baseline rejected a constant tempo grid")
    bpm = float(track["bpm"])
    period = 60 / bpm
    if not 60 <= bpm <= 220:
        raise ValueError("Unsupported or nonfinite tempo")
    fallback = float(track["grid_anchor_seconds"])
    rhythm = evidence.get("rhythm", {})
    beats = np.asarray(rhythm.get("beats_seconds", []), dtype=float)
    downs = np.asarray(rhythm.get("downbeats_seconds", []), dtype=float)
    phase, support, bar_support, stable = fallback % period, 0.0, 0.0, False
    notes = []
    if len(beats) >= 16 and len(downs) >= 4:
        if (
            not np.all(np.isfinite(beats))
            or not np.all(np.diff(beats) > 0)
            or not np.all(np.isfinite(downs))
            or not np.all(np.diff(downs) > 0)
            or min(beats[0], downs[0]) < 0
            or max(beats[-1], downs[-1]) > track["duration_seconds"]
        ):
            raise ValueError("Invalid model timing evidence")
        angle = np.angle(np.mean(np.exp(2j * np.pi * beats / period)))
        center = angle * period / (2 * np.pi)
        residual = (beats - center + period / 2) % period - period / 2
        support = float(np.mean(np.abs(residual) <= 0.045))
        if support >= 0.85:
            phase = float((center + np.median(residual)) % period)
            classes = np.rint((downs - phase) / period).astype(int) % 4
            bar_class, count = Counter(int(x) for x in classes).most_common(1)[0]
            bar_support = count / len(downs)
            if bar_support >= 0.70:
                anchor = phase + bar_class * period
                stable = True
            else:
                anchor = phase + round((fallback - phase) / period) % 4 * period
                notes.append(
                    "uncertain bar phase: disable interior splices and use a reset"
                )
        else:
            anchor = fallback
            notes.append(
                "dispersed model beat phase: preserve baseline and disable interior splices"
            )
    else:
        anchor = fallback
        notes.append("missing independent beat/bar evidence")
    return {
        "bpm": bpm,
        "anchor_seconds": float(anchor),
        "beat_support": support,
        "bar_support": bar_support,
        "splice_supported": stable,
        "shift_from_baseline_seconds": float(anchor - fallback),
        "human_verified": False,
        "notes": notes,
        "method": "baseline measured tempo; circular model beat phase and dominant 4/4 class; heuristic support, not probability",
    }


def phrase_at(track, at):
    return min(
        track["phrases"],
        key=lambda p: abs((p["start_seconds"] + p["end_seconds"]) / 2 - at),
    )


def local_key(evidence, start, end):
    weights = Counter()
    for window in evidence.get("tonal", {}).get("eight_bar_windows", []):
        duration = max(
            0, min(end, window["end_seconds"]) - max(start, window["start_seconds"])
        )
        key = window.get("key")
        scale = window.get("scale")
        strength = window.get("profile_strength", 0)
        if (
            duration > 0
            and key in KEYS
            and scale in ("major", "minor")
            and math.isfinite(strength)
            and strength >= 0.6
        ):
            weights[(KEYS[key], scale)] += duration * strength
    if not weights:
        return None
    key, weight = weights.most_common(1)[0]
    return list(key) if weight / sum(weights.values()) >= 0.6 else None


def harmonic_cost(a, b):
    if a is None or b is None:
        return 0.5
    if a == b:
        return 0.0
    if a[1] == b[1] and (a[0] - b[0]) % 12 in (5, 7):
        return 0.1
    major, minor = (a, b) if a[1] == "major" else (b, a)
    if major[1] == "major" and minor[1] == "minor" and (minor[0] - major[0]) % 12 == 9:
        return 0.1
    return 1.0


def cut_repeats(track, evidence, grid, start, end):
    voice = evidence.get("vocals")
    if not grid["splice_supported"] or voice is None:
        return [[start, end]], []
    beat = 60 / track["bpm"]
    width = 32 * beat
    bar = 4 * beat
    removals = []
    peak = max(
        track["phrases"], key=lambda p: p["rms_dbfs"] + 0.5 * p.get("onset_strength", 0)
    )
    protected = (peak["start_seconds"] + peak["end_seconds"]) / 2
    for p in track["phrases"]:
        if not p.get("repeat_candidate") or p.get("partial"):
            continue
        a = (
            grid["anchor_seconds"]
            + round((p["start_seconds"] - grid["anchor_seconds"]) / bar) * bar
        )
        b = a + width
        previous = phrase_at(track, max(start, a - width / 2))
        following = phrase_at(track, min(end, b + width / 2))
        # Preserve transitions/builds/drops and the first occurrence of a hook.
        if (
            a < start + width
            or a <= protected <= b
            or b > end - width
            or end - start - width * (len(removals) + 1) < 90
            or abs(p["rms_dbfs"] - previous["rms_dbfs"]) > 1.5
            or following["rms_dbfs"] - p["rms_dbfs"] > 2
            or vocal_fraction(voice, a, b) > 0.05
            or vocal_fraction(voice, a - 0.35, a + 0.35) > 0.05
            or vocal_fraction(voice, b - 0.35, b + 0.35) > 0.05
            or any(not (b <= x or a >= y) for x, y in removals)
        ):
            continue
        removals.append([a, b])
        if len(removals) == 2:
            break
    ranges, cursor = [], start
    for a, b in sorted(removals):
        if a > cursor + 1e-6:
            ranges.append([cursor, a])
        cursor = b
    ranges.append([cursor, end])
    return ranges, removals


def candidates(track, evidence):
    grid = choose_grid(track, evidence)
    duration = track["duration_seconds"]
    bar = 240 / track["bpm"]
    anchor = grid["anchor_seconds"]
    ends = [
        anchor + i * bar
        for i in range(math.ceil(duration / bar))
        if 0.02 <= anchor + i * bar <= duration - 0.04
    ]
    starts = [
        t
        for i, t in enumerate(ends)
        if i % 4 == 0 and t <= duration - min(90, duration * 0.6)
    ]
    minimum = min(90, duration * 0.60)
    target = min(165, duration * 0.85)
    peak = max(
        track["phrases"], key=lambda p: p["rms_dbfs"] + 0.5 * p.get("onset_strength", 0)
    )
    peak_time = (peak["start_seconds"] + peak["end_seconds"]) / 2
    choices = []
    for start in starts:
        for end in ends:
            length = end - start
            if not minimum <= length <= 210 or not start <= peak_time <= end:
                continue
            ranges, removed = cut_repeats(track, evidence, grid, start, end)
            body = sum(b - a for a, b in ranges)
            voice = evidence.get("vocals")
            entry = vocal_fraction(voice, start, min(end, start + 8 * bar))
            exit = vocal_fraction(voice, max(start, end - 8 * bar), end)
            entry_boundary = vocal_fraction(voice, max(0, start - 0.35), start + 0.35)
            exit_boundary = vocal_fraction(voice, end - 0.35, min(duration, end + 0.35))
            quality = abs(body - target) / target + 0.15 * start / max(1, duration)
            quality += 0.15 * ((entry or 0) + (exit or 0))
            quality += 2 * (entry_boundary or 0) + (exit_boundary or 0)
            quality -= 0.07 * len(removed)
            choices.append(
                {
                    "id": track["id"],
                    "grid": grid,
                    "ranges": ranges,
                    "removed_repeats": removed,
                    "start": start,
                    "end": end,
                    "body_seconds": body,
                    "selection_cost": quality,
                    "protected_peak_seconds": peak_time,
                    "vocal_evidence_available": voice is not None,
                    "boundary_vocal_candidates": {
                        "entry": entry_boundary,
                        "exit": exit_boundary,
                    },
                }
            )
    if not choices:
        raise ValueError("No usable body contains the main energy landmark")
    return sorted(choices, key=lambda c: (c["selection_cost"], c["start"], c["end"]))


def transition(a, b, tracks, evidence):
    outgoing, incoming = tracks[a["id"]], tracks[b["id"]]
    bpm_a, bpm_b = outgoing["bpm"], incoming["bpm"]
    family_change = (outgoing.get("lane") == "Drum & bass") != (
        incoming.get("lane") == "Drum & bass"
    )
    if (
        family_change
        or abs(bpm_a - bpm_b) / min(bpm_a, bpm_b) > 0.05
        or not (a["grid"]["splice_supported"] and b["grid"]["splice_supported"])
    ):
        return {
            "kind": "reset",
            "bars": 0,
            "overlap_seconds": 0.08,
            "incoming_bpm": bpm_b,
            "outgoing_bpm": bpm_a,
            "vocal_overlap": None,
            "harmonic_cost": None,
            "cost": 2.0,
            "reason": "tempo/family/phase uncertainty: intentional short reset; no forced beatmatch",
        }
    shared = (bpm_a + bpm_b) / 2
    key_a = local_key(evidence[a["id"]], a["end"] - 16 * 60 / bpm_a, a["end"])
    key_b = local_key(evidence[b["id"]], b["start"], b["start"] + 16 * 60 / bpm_b)
    harmony = harmonic_cost(key_a, key_b)
    options = []
    for bars in (1, 4, 8):
        overlap = bars * 240 / shared
        prior = {
            "id": a["id"],
            "retained_source_ranges": a["ranges"],
            "outgoing_bpm": shared,
            "measured_bpm": bpm_a,
        }
        latter = {
            "id": b["id"],
            "retained_source_ranges": b["ranges"],
            "incoming_bpm": shared,
            "measured_bpm": bpm_b,
            "overlap_seconds": overlap,
        }
        voice = join_evidence(prior, latter, evidence)[
            "simultaneous_vocal_candidate_fraction"
        ]
        kind = (
            "quick_handover"
            if bars == 1
            else "short_bass_swap"
            if bars == 4
            else "harmonic_blend"
        )
        cost = (voice * 8 if voice is not None else 1.0) + harmony * bars / 4
        cost += 0.8 if bars == 1 else 0.0 if bars == 4 else 0.15
        # Long melody/vocal overlaps need positive evidence, not missing data.
        if bars == 8 and (harmony > 0.1 or voice is None or voice > 0.1):
            continue
        options.append(
            {
                "kind": kind,
                "bars": bars,
                "overlap_seconds": overlap,
                "incoming_bpm": shared,
                "outgoing_bpm": shared,
                "vocal_overlap": voice,
                "harmonic_cost": harmony,
                "local_keys": [key_a, key_b],
                "cost": cost,
                "reason": "score aligned vocal activity, local harmony and blend length; no key transposition",
            }
        )
    return min(options, key=lambda x: (x["cost"], x["bars"]))


def sequence(tracks, evidence):
    by_id = {t["id"]: t for t in tracks}
    choices = {t["id"]: candidates(t, evidence[t["id"]]) for t in tracks}
    ordered = []
    joins = []
    for lane in LANES + sorted({t.get("lane", "Other") for t in tracks} - set(LANES)):
        remaining = {t["id"] for t in tracks if t.get("lane", "Other") == lane}
        while remaining:
            if not ordered:
                ident = min(remaining, key=lambda i: (by_id[i]["bpm"], i))
                ordered.append(choices[ident][0])
                remaining.remove(ident)
                continue
            current = ordered[-1]
            # Preserve the entry already chosen for the preceding join while
            # optimizing the current exit and the incoming body together.
            tails = [
                c
                for c in choices[current["id"]]
                if abs(c["start"] - current["start"]) < 1e-6
            ][:6]
            ranked = []
            for ident in sorted(
                remaining,
                key=lambda ident: (
                    abs(by_id[current["id"]]["bpm"] - by_id[ident]["bpm"]),
                    ident,
                ),
            )[:8]:
                artist_repeat = any(
                    by_id[c["id"]]["artist"] == by_id[ident]["artist"]
                    for c in ordered[-3:]
                )
                for a, b in itertools.product(tails, choices[ident][:8]):
                    join = transition(a, b, by_id, evidence)
                    cost = (
                        join["cost"]
                        + a["selection_cost"]
                        + b["selection_cost"]
                        + 2 * artist_repeat
                    )
                    cost += abs(by_id[a["id"]]["bpm"] - by_id[ident]["bpm"]) / 50
                    ranked.append((cost, ident, a, b, join))
            _, ident, a, b, join = min(
                ranked, key=lambda x: (x[0], x[1], x[2]["end"], x[3]["start"])
            )
            ordered[-1] = a
            ordered.append(b)
            joins.append(join)
            remaining.remove(ident)
    return ordered, joins


def retained_loudness(track, ranges, cache_dir):
    binding = {
        "sha256": track["sha256"],
        "ranges": ranges,
        "method": "FFmpeg atrim/concat ebur128 true peak, source timing before warp",
    }
    key = hashlib.sha256(json.dumps(binding, sort_keys=True).encode()).hexdigest()
    path = cache_dir / (key + ".json")
    if path.exists():
        cached = json.loads(path.read_text())
        if cached.get("binding") != binding:
            raise ValueError("Retained loudness cache binding mismatch")
        return cached
    n = len(ranges)
    graph = f"[0:a:0]asplit={n}" + "".join(f"[s{i}]" for i in range(n)) + ";"
    graph += (
        ";".join(
            f"[s{i}]atrim=start={a:.9f}:end={b:.9f},asetpts=PTS-STARTPTS[r{i}]"
            for i, (a, b) in enumerate(ranges)
        )
        + ";"
    )
    graph += (
        "".join(f"[r{i}]" for i in range(n))
        + f"concat=n={n}:v=0:a=1,ebur128=peak=true:framelog=verbose[out]"
    )
    result = subprocess.run(
        [
            "ffmpeg",
            "-v",
            "info",
            "-nostdin",
            "-nostats",
            "-i",
            track["path"],
            "-filter_complex",
            graph,
            "-map",
            "[out]",
            "-f",
            "null",
            "-",
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    integrated = re.findall(
        r"Integrated loudness:\s+I:\s+([-\d.]+) LUFS", result.stderr
    )
    peak = re.findall(r"True peak:\s+Peak:\s+([-\d.]+) dBFS", result.stderr)
    if not integrated or not peak or float(integrated[-1]) < -50:
        raise ValueError("Retained body has no usable loudness measurement")
    measured = {
        "integrated_lufs": float(integrated[-1]),
        "true_peak_dbfs": float(peak[-1]),
        "binding": binding,
    }
    write_json(path, measured)
    return measured


def gain_for(measured):
    if any(
        not math.isfinite(measured[k]) for k in ("integrated_lufs", "true_peak_dbfs")
    ):
        raise ValueError("Nonfinite loudness")
    gain = min(3.0, -14 - measured["integrated_lufs"], -3 - measured["true_peak_dbfs"])
    if gain < -30:
        raise ValueError("Source requires excessive attenuation; inspect the recording")
    return gain


def compile_timeline(ordered, joins, tracks, gains):
    by_id = {t["id"]: t for t in tracks}
    definitions = []
    details = []
    markers = []
    tempo_map = []
    end = 0.0
    for i, choice in enumerate(ordered):
        track = by_id[choice["id"]]
        bpm = track["bpm"]
        before = joins[i - 1] if i else None
        after = joins[i] if i < len(joins) else None
        reset_in = bool(before and before["kind"] == "reset")
        reset_out = bool(after and after["kind"] == "reset")
        incoming = before["incoming_bpm"] if before else bpm
        outgoing = after["outgoing_bpm"] if after else bpm
        overlap = before["overlap_seconds"] if before else 0.0
        start = end - overlap
        total = round(sum(b - a for a, b in choice["ranges"]) * bpm / 60)
        hold = 4 * max(
            before["bars"] if before else 0, after["bars"] if after else 0, 1
        )
        offset = 0
        local = 0.0
        clips = []
        rates = []
        for a, b in choice["ranges"]:
            beats = round((b - a) * bpm / 60)
            if beats % 4 or abs(beats - (b - a) * bpm / 60) > 1e-5:
                raise ValueError("Retained ranges must preserve whole bars")
            item, tempos, item_rates = warped_clip(
                a, beats, bpm, offset, total, incoming, outgoing, hold
            )
            if min(item_rates) < 0.97 or max(item_rates) > 1.03:
                raise ValueError("Planned stretch exceeds three percent")
            item["position"] = start + local
            clips.append(item)
            rates.extend(item_rates)
            tempo_map.extend(
                {"time": start + local + t["time"], "bpm": t["bpm"]}
                for t in tempos
                if reset_in or start + local + t["time"] >= start + overlap - 1e-7
            )
            local += item["length"]
            offset += beats
        end = start + local
        fade = after["overlap_seconds"] if after else 1.5
        clips[0]["fade_in"] = overlap if before and not reset_in else 0.04
        clips[-1]["fade_out"] = (
            fade if after and not reset_out else 0.12 if after else 1.5
        )
        shelf = [{"time": 0, "db": -24 if before and not reset_in else 0}]
        if before and not reset_in:
            shelf.extend(
                [
                    {"time": start + overlap * 0.5 - 0.04, "db": -24},
                    {"time": start + overlap * 0.5 + 0.04, "db": 0},
                ]
            )
        if after and not reset_out:
            shelf.extend(
                [
                    {"time": end - fade * 0.5 - 0.04, "db": 0},
                    {"time": end - fade * 0.5 + 0.04, "db": -24},
                ]
            )
        else:
            shelf.append({"time": end, "db": 0})
        if any(
            c["position"] < 0 or max(c["fade_in"], c["fade_out"]) > c["length"]
            for c in clips
        ):
            raise ValueError("Invalid position/fade allocation")
        definitions.append(
            {
                "name": f"{i + 1:03d} · {track['artist']} · {track['title']}",
                "path": track["path"],
                "sha256": track["sha256"],
                "gain_db": gains[track["id"]],
                "clips": clips,
                "shelf": shelf,
            }
        )
        markers.append(
            {
                "time": start,
                "name": track["artist"]
                + " · "
                + (before["kind"] if before else "START"),
            }
        )
        details.append(
            {
                "id": track["id"],
                "artist": track["artist"],
                "title": track["title"],
                "lane": track.get("lane"),
                "source_sha256": track["sha256"],
                "ranges": choice["ranges"],
                "removed_repeats": choice["removed_repeats"],
                "grid": choice["grid"],
                "start_seconds": start,
                "end_seconds": end,
                "incoming_bpm": incoming,
                "outgoing_bpm": outgoing,
                "source_bpm": bpm,
                "rate_range": [min(rates), max(rates)],
                "gain_db": gains[track["id"]],
                "boundary_vocal_candidates": choice["boundary_vocal_candidates"],
                "vocal_evidence_available": choice["vocal_evidence_available"],
            }
        )
    return definitions, details, markers, tempo_map, end


def eligible(database, analysis, intelligence, file_map=None, audition=False):
    approved, _ = approved_pool(host_rows(database))
    approved_by = {t["id"]: t for t in approved}
    evidence = {t["id"]: t for t in intelligence.get("tracks", [])}
    bindings = json.loads(file_map.read_text()) if file_map else {}
    tracks = []
    blocked = []
    analyzed = {t["id"]: t for t in analysis.get("tracks", [])}
    if len(analyzed) != len(analysis.get("tracks", [])) or len(evidence) != len(
        intelligence.get("tracks", [])
    ):
        raise ValueError("Repeated analysis/model IDs")
    for ident, metadata in approved_by.items():
        t = analyzed.get(ident)
        e = evidence.get(ident)
        reason = None
        if not t or not e:
            reason = "missing source analysis or independent evidence"
        elif e["source_sha256"] != t["sha256"]:
            raise ValueError("Model/source binding mismatch: " + ident)
        elif digest(Path(t["path"])) != t["sha256"]:
            raise ValueError("Analyzed source changed: " + ident)
        elif (
            not math.isfinite(t["duration_seconds"])
            or abs(probe_duration(Path(t["path"])) - t["duration_seconds"]) > 0.02
        ):
            raise ValueError(
                "Decoded duration disagrees with source analysis: " + ident
            )
        elif not audition:
            binding = check_file(
                metadata,
                bindings.get(metadata["spotify_uri"]),
                file_map.parent if file_map else Path.cwd(),
            )
            if binding["status"] != "ready for import":
                reason = binding.get("reason", binding["status"])
            else:
                raw = Path(t.get("source_path", t["path"])).resolve()
                expected = t.get("source_sha256", t["sha256"])
                if raw != Path(binding["path"]) or expected != binding["sha256"]:
                    raise ValueError(
                        "Analysis is not bound to the verified acquisition: " + ident
                    )
        if reason:
            blocked.append({"id": ident, "reason": reason})
            continue
        tracks.append(
            {
                **t,
                "lane": metadata.get("lane") or "Other",
                "spotify_uri": metadata["spotify_uri"],
            }
        )
    if len({t["sha256"] for t in tracks}) != len(tracks):
        raise ValueError("Same audio file is bound to multiple approved recordings")
    return tracks, {t["id"]: evidence[t["id"]] for t in tracks}, blocked


def build_plan(
    database, analysis_path, intelligence_path, output, file_map=None, audition=False
):
    analysis = json.loads(analysis_path.read_text())
    intelligence = json.loads(intelligence_path.read_text())
    tracks, evidence, blocked = eligible(
        database, analysis, intelligence, file_map, audition
    )
    report = {
        "version": VERSION,
        "generated_at": datetime.now(UTC).isoformat(),
        "source_policy": "audition engineering test"
        if audition
        else "verified production acquisitions",
        "source_analysis_sha256": digest(analysis_path),
        "model_report_sha256": digest(intelligence_path),
        "blocked": blocked,
        "tracks": [],
        "transitions": [],
        "planned_seconds": 0.0,
        "rendered": False,
        "party_ready": False,
        "human_verified": False,
        "host_votes_changed": False,
        "production_sources_verified": False,
        "meets_nine_hour_planned_duration": False,
        "chapters": [],
        "inputs": {
            "analysis": str(analysis_path.resolve()),
            "intelligence": str(intelligence_path.resolve()),
            "file_map": str(file_map.resolve()) if file_map else None,
            "file_map_sha256": digest(file_map) if file_map else None,
        },
    }
    if tracks:
        ordered, joins = sequence(tracks, evidence)
        measured = {
            c["id"]: retained_loudness(
                next(t for t in tracks if t["id"] == c["id"]),
                c["ranges"],
                output / "loudness-cache",
            )
            for c in ordered
        }
        gains = {ident: gain_for(value) for ident, value in measured.items()}
        definitions, details, markers, tempo_map, end = compile_timeline(
            ordered, joins, tracks, gains
        )
        # Re-read approvals/files after expensive measurements, before emitting
        # a plan. Later changes still require rebuilding before final rendering.
        refreshed, _, _ = eligible(database, analysis, intelligence, file_map, audition)
        if {t["id"] for t in refreshed} != {t["id"] for t in tracks}:
            raise ValueError(
                "Host approvals or source bindings changed during planning"
            )
        native = save_plan(
            output / "native",
            "planned-chapter",
            definitions,
            end,
            markers,
            purpose="Unrendered evidence-informed planning test"
            if audition
            else "Unrendered approved production plan",
            bpm=next(t["bpm"] for t in tracks if t["id"] == ordered[0]["id"]),
            master_db=-6,
            tempo_map=tempo_map,
        )
        report.update(
            tracks=details,
            transitions=joins,
            planned_seconds=end,
            retained_loudness=measured,
            native_manifest_sha256=native["manifest_sha256"],
            native_plan=str(output / "native/planned-chapter-plan.json"),
            meets_nine_hour_planned_duration=end >= 32400,
            production_sources_verified=not audition,
        )
        # Chapter index only; no chapter audio is exported.
        chapters = []
        for track in details:
            if (
                not chapters
                or chapters[-1]["lane"] != track["lane"]
                or track["end_seconds"] - chapters[-1]["start_seconds"] > 5400
            ):
                chapters.append(
                    {
                        "lane": track["lane"],
                        "start_seconds": track["start_seconds"],
                        "end_seconds": track["end_seconds"],
                        "ids": [track["id"]],
                    }
                )
            else:
                chapters[-1]["end_seconds"] = track["end_seconds"]
                chapters[-1]["ids"].append(track["id"])
        report["chapters"] = chapters
    write_json(output / "mix-plan.json", report)
    return report


def refresh_analysis(database, file_map, output):
    """Verified acquisition -> decoded analysis -> all-source vocal evidence."""
    from audio_intelligence import run as model_analysis

    approved, _ = approved_pool(host_rows(database))
    bindings = json.loads(file_map.read_text())
    tracks = []
    errors = []
    root = output / "evidence"
    for t in approved:
        binding = check_file(t, bindings.get(t["spotify_uri"]), file_map.parent)
        if binding["status"] != "ready for import":
            errors.append(
                {"id": t["id"], "error": binding.get("reason", binding["status"])}
            )
            continue
        try:
            tracks.append(analyze_track(t, root, source=Path(binding["path"])))
        except (ValueError, OSError, subprocess.CalledProcessError) as error:
            errors.append({"id": t["id"], "error": str(error)})
    write_json(
        root / "analysis.json",
        {"tracks": tracks, "errors": errors, "party_ready": False},
    )
    if tracks:
        model_analysis(root, vocal_ids={t["id"] for t in tracks})
    else:
        write_json(root / "intelligence/report.json", {"tracks": [], "errors": errors})
    return root / "analysis.json", root / "intelligence/report.json"


def validate_current(report, database, require_production=True):
    """Recheck frozen inputs, current votes/acquisitions and native fingerprint."""
    if not report["tracks"]:
        raise ValueError("Empty planning result")
    audition = report["source_policy"] == "audition engineering test"
    if require_production and audition:
        raise ValueError("Audition files are not verified production acquisitions")
    inputs = report["inputs"]
    analysis = Path(inputs["analysis"])
    intelligence = Path(inputs["intelligence"])
    file_map = Path(inputs["file_map"]) if inputs["file_map"] else None
    if (
        digest(analysis) != report["source_analysis_sha256"]
        or digest(intelligence) != report["model_report_sha256"]
        or (file_map and digest(file_map) != inputs["file_map_sha256"])
    ):
        raise ValueError("Planning inputs changed; rebuild the plan")
    tracks, _, _ = eligible(
        database,
        json.loads(analysis.read_text()),
        json.loads(intelligence.read_text()),
        file_map,
        audition,
    )
    allowed = {t["id"]: t["sha256"] for t in tracks}
    if any(allowed.get(t["id"]) != t["source_sha256"] for t in report["tracks"]):
        raise ValueError("Planned track no longer approved or source changed")
    native = json.loads(Path(report["native_plan"]).read_text())
    fingerprint = native.pop("manifest_sha256")
    actual = hashlib.sha256(json.dumps(native, sort_keys=True).encode()).hexdigest()
    if actual != fingerprint or fingerprint != report["native_manifest_sha256"]:
        raise ValueError("Native plan changed")
    if [t["sha256"] for t in native["tracks"]] != [
        t["source_sha256"] for t in report["tracks"]
    ]:
        raise ValueError("Native plan no longer matches selected sources")
    return {
        "current_inputs_valid": True,
        "production_sources_verified": not audition,
        "rendered": False,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, default=DEFAULT_DB)
    parser.add_argument(
        "--analysis", type=Path, default=BASE / ".local/actual-batch-01/analysis.json"
    )
    parser.add_argument(
        "--intelligence",
        type=Path,
        default=BASE / ".local/actual-batch-01/intelligence/report.json",
    )
    parser.add_argument("--file-map", type=Path)
    parser.add_argument(
        "--validate",
        type=Path,
        help="Validate an existing production mix-plan.json against current inputs/votes; no rendering",
    )
    parser.add_argument(
        "--audition-sources",
        action="store_true",
        help="Engineering plan using existing test copies, still restricted to current host Keeps",
    )
    parser.add_argument(
        "--refresh-analysis",
        action="store_true",
        help="Analyze verified production acquisitions and local models; no rendering",
    )
    parser.add_argument("--output", type=Path, default=BASE / ".local/mix-planning")
    args = parser.parse_args()
    if args.validate:
        print(
            json.dumps(
                validate_current(json.loads(args.validate.read_text()), args.database)
            )
        )
        return 0
    if args.refresh_analysis:
        if args.audition_sources or not args.file_map:
            parser.error("Refresh requires a production file map")
        args.analysis, args.intelligence = refresh_analysis(
            args.database, args.file_map, args.output
        )
    report = build_plan(
        args.database,
        args.analysis,
        args.intelligence,
        args.output,
        args.file_map,
        args.audition_sources,
    )
    print(
        json.dumps(
            {
                k: report[k]
                for k in ("source_policy", "planned_seconds", "rendered", "party_ready")
            }
        )
    )
    print(
        "planned tracks",
        len(report["tracks"]),
        "blocked approvals",
        len(report["blocked"]),
    )
    return 0 if report["tracks"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
