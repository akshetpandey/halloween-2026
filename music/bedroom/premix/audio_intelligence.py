#!/usr/bin/env python3
"""Hash-bound beat/key/vocal evidence for mix planning; never changes a render/vote.

Run in the optional ML environment. Model predictions remain advisory, especially
downbeats and separated vocals; neither is a human annotation or a confidence %.
"""

import argparse
import itertools
import json
import math
import os
import re
import time
from collections import Counter
from datetime import UTC, datetime
from importlib.metadata import version
from pathlib import Path

from analyze_audio import digest, write_json
from prepare import file_key

BASE = Path(__file__).resolve().parent
DEFAULT_ROOT = BASE / ".local/actual-batch-01"
VERSION = "mix-evidence-2"
PACKAGES = (
    "beat-this",
    "torch",
    "torchaudio",
    "demucs",
    "essentia",
    "numpy",
    "soxr",
    "soundfile",
)
STEM_SETTINGS = {
    "model": "htdemucs",
    "device": "cpu",
    "seed": 0,
    "shifts": 0,
    "overlap": 0.25,
    "split": True,
    "normalization": "mono-reference mean and standard deviation",
}


def valid_times(values, duration, minimum=1):
    values = [float(t) for t in values]
    if (
        len(values) < minimum
        or any(not math.isfinite(t) or not 0 <= t <= duration for t in values)
        or any(b <= a for a, b in itertools.pairwise(values))
    ):
        raise ValueError("Invalid or insufficient model timing evidence")
    return values


def beat_evidence(beats, downbeats, track):
    import numpy as np

    beats = valid_times(beats, track["duration_seconds"], 16)
    downbeats = valid_times(downbeats, track["duration_seconds"], 4)
    beat_array = np.asarray(beats)
    distance = np.min(np.abs(np.asarray(downbeats)[:, None] - beat_array), axis=1)
    if float(np.max(distance)) > 0.08:
        raise ValueError("Predicted downbeats are not close to predicted beats")
    period = 60 / track["bpm"]
    anchor = track["grid_anchor_seconds"]
    residual = ((beat_array - anchor + period / 2) % period) - period / 2
    classes = np.rint((np.asarray(downbeats) - anchor) / period).astype(int) % 4
    counts = Counter(int(v) for v in classes)
    bar_class, count = counts.most_common(1)[0]
    # Beat This timestamps are quantized to 20 ms. A single-interval median can
    # turn 123 BPM into 125 BPM; span multiple predicted beats to reduce bias.
    median_bpm = float(60 * 8 / np.median(beat_array[8:] - beat_array[:-8]))
    intervals = np.diff(beat_array)
    # Compare an independent model against the existing grid; never bless a new
    # grid merely because a model emits a plausible BPM or a precise timestamp.
    issues = []
    tempo_ratio = median_bpm / track["bpm"]
    if abs(tempo_ratio - 1) > 0.02:
        issues.append(
            "model median tempo disagrees with baseline by over 2 percent; inspect half/double time or missing beats"
        )
    agreement = float(np.mean(np.abs(residual) <= 0.07))
    if agreement < 0.85:
        issues.append(
            "fewer than 85 percent of model beats agree within 70 ms of baseline grid"
        )
    if count / len(downbeats) < 0.8:
        issues.append(
            "model downbeat phase changes relative to baseline; inspect sections separately"
        )
    elif bar_class != 0:
        issues.append(f"model downbeat is {bar_class} beat(s) after baseline bar phase")
    return {
        "provider": "CPJKU Beat This final0, float32 CPU, minimal postprocessor",
        "beats_seconds": beats,
        "downbeats_seconds": downbeats,
        "median_eight_beat_bpm": median_bpm,
        "single_interval_median_bpm": float(60 / np.median(intervals)),
        "interval_fraction_near_baseline_beat": float(
            np.mean(np.abs(intervals - period) <= 0.07)
        ),
        "interval_fraction_near_half_time": float(
            np.mean(np.abs(intervals - 2 * period) <= 0.07)
        ),
        "interval_fraction_near_double_time": float(
            np.mean(np.abs(intervals - 0.5 * period) <= 0.07)
        ),
        "baseline_bpm": track["bpm"],
        "baseline_beat_agreement_70ms": agreement,
        "baseline_beat_residual_p95_ms": float(
            np.percentile(np.abs(residual), 95) * 1000
        ),
        "downbeat_class_counts_vs_baseline": dict(sorted(counts.items())),
        "dominant_downbeat_class": bar_class,
        "dominant_class_fraction": count / len(downbeats),
        "review_flags": issues,
        "human_verified": False,
        "note": "Timing estimates and engineering review thresholds, not calibrated accuracy/confidence or eight-bar phrase recognition. Median tempo is descriptive, not a validated BPM when predictions contain missing beats or metrical switches.",
    }


def key_evidence(signal, sr, track):
    import essentia.standard as es
    import numpy as np
    import soxr

    mono = np.ascontiguousarray(
        soxr.resample(signal.mean(axis=1), sr, 44100), dtype="float32"
    )
    extractor = es.KeyExtractor(sampleRate=44100, profileType="bgate")

    def measure(start, end):
        section = mono[round(start * 44100) : round(end * 44100)]
        key, scale, strength = extractor(section)
        if not math.isfinite(float(strength)):
            raise ValueError("Nonfinite tonal estimate")
        return {
            "start_seconds": start,
            "end_seconds": end,
            "key": key,
            "scale": scale,
            "profile_strength": float(strength),
        }

    windows = [
        measure(p["start_seconds"], p["end_seconds"])
        for p in track["phrases"]
        if p["end_seconds"] - p["start_seconds"] >= 4
    ]
    return {
        "provider": "Essentia KeyExtractor, bgate profile, mono 44.1 kHz",
        "global": measure(0, len(signal) / sr),
        "eight_bar_windows": windows,
        "note": "Classical tonal-profile estimate, not an ML prediction. Strength is not a probability; compare retained windows, not just the global label.",
    }


def active_regions(frames, gap=0.25, minimum=0.5):
    regions = []
    for frame in frames:
        if not frame["candidate_vocal"]:
            continue
        if regions and frame["start_seconds"] - regions[-1][1] <= gap + 1e-8:
            regions[-1][1] = frame["end_seconds"]
        else:
            regions.append([frame["start_seconds"], frame["end_seconds"]])
    return [r for r in regions if r[1] - r[0] >= minimum]


def vocal_evidence(mixture, vocals, sr):
    import numpy as np

    if mixture.shape != vocals.shape or mixture.ndim != 2 or sr <= 0:
        raise ValueError("Vocal stem and source must have identical stereo timing")
    if not np.all(np.isfinite(mixture)) or not np.all(np.isfinite(vocals)):
        raise ValueError("Nonfinite audio samples")
    frames = []
    step = max(1, round(0.25 * sr))
    for a in range(0, len(mixture), step):
        b = min(a + step, len(mixture))
        mix_power = float(np.mean(mixture[a:b] ** 2))
        voice_power = float(np.mean(vocals[a:b] ** 2))
        voice_db = 10 * math.log10(max(voice_power, 1e-12))
        ratio_db = 10 * math.log10(max(voice_power, 1e-12) / max(mix_power, 1e-12))
        frames.append(
            {
                "start_seconds": a / sr,
                "end_seconds": b / sr,
                "vocal_dbfs": voice_db,
                "vocal_to_mix_db": ratio_db,
                "candidate_vocal": voice_db > -50
                and ratio_db > -18
                and mix_power > 1e-6,
            }
        )
    regions = active_regions(frames)
    return {
        "frame_seconds": 0.25,
        "frames": frames,
        "candidate_vocal_regions": regions,
        "candidate_vocal_fraction": sum(b - a for a, b in regions)
        / (len(mixture) / sr),
        "thresholds": {
            "vocal_dbfs_above": -50,
            "vocal_to_mix_db_above": -18,
            "mix_dbfs_above": -60,
            "minimum_region_seconds": 0.5,
            "bridge_gap_seconds": 0.25,
        },
        "note": "Demucs vocal-stem energy heuristic, not speech recognition or a calibrated singing detector. Synths/drums can leak; absence is not proof of a safe lyric cut.",
    }


def vocal_fraction(evidence, start, end):
    if evidence is None or end <= start:
        return None
    intervals = evidence["candidate_vocal_regions"]
    return sum(max(0, min(end, b) - max(start, a)) for a, b in intervals) / (
        end - start
    )


def annotate_edits(track, evidence, edit):
    period = 60 / track["bpm"]
    downbeats = evidence["rhythm"]["downbeats_seconds"]
    ranges = edit["retained_source_ranges"]
    if (
        not ranges
        or any(not 0 <= a < b <= track["duration_seconds"] for a, b in ranges)
        or any(a[1] > b[0] for a, b in itertools.pairwise(ranges))
    ):
        raise ValueError("Invalid retained source ranges")

    def boundary(at):
        nearest = min(downbeats, key=lambda t: abs(t - at))
        return {
            "source_seconds": at,
            "nearest_model_downbeat_seconds": nearest,
            "distance_to_model_downbeat_ms": abs(nearest - at) * 1000,
            "candidate_vocal_fraction_near_boundary": vocal_fraction(
                evidence.get("vocals"),
                max(0, at - 0.35),
                min(track["duration_seconds"], at + 0.35),
            ),
        }

    cuts = [
        {"outgoing": boundary(a[1]), "incoming": boundary(b[0])}
        for a, b in itertools.pairwise(ranges)
    ]
    return {
        "id": track["id"],
        "interior_cuts": cuts,
        "entry": boundary(ranges[0][0]),
        "exit": boundary(ranges[-1][1]),
        "candidate_vocal_fraction_first_8_bars": vocal_fraction(
            evidence.get("vocals"),
            ranges[0][0],
            min(ranges[0][1], ranges[0][0] + 32 * period),
        ),
        "candidate_vocal_fraction_last_8_bars": vocal_fraction(
            evidence.get("vocals"),
            max(ranges[-1][0], ranges[-1][1] - 32 * period),
            ranges[-1][1],
        ),
        "note": "Evidence for revising cuts/joins; existing edit decisions, audio and host approvals are unchanged.",
    }


def join_evidence(previous, incoming, evidence):
    """Compare vocals at the same overlap time, respecting the two source rates."""
    outgoing_voice = evidence.get(previous["id"], {}).get("vocals")
    incoming_voice = evidence.get(incoming["id"], {}).get("vocals")
    overlap = incoming["overlap_seconds"]
    result = {
        "outgoing_id": previous["id"],
        "incoming_id": incoming["id"],
        "overlap_seconds": overlap,
        "reset_before": incoming.get("reset_before", False),
        "both_vocal_evidence_available": outgoing_voice is not None
        and incoming_voice is not None,
        "simultaneous_vocal_candidate_fraction": None,
        "review_flags": [],
    }
    if (
        result["reset_before"]
        or overlap <= 0
        or not result["both_vocal_evidence_available"]
    ):
        return result
    out_end = previous["retained_source_ranges"][-1][1]
    in_start = incoming["retained_source_ranges"][0][0]
    out_rate = previous["outgoing_bpm"] / previous["measured_bpm"]
    in_rate = incoming["incoming_bpm"] / incoming["measured_bpm"]
    # Only evaluate the middle 60% where both fades can be audible. This is
    # source-activity evidence, not measurement of audible clash in the mix.
    start, end = 0.2 * overlap, 0.8 * overlap
    steps = max(1, math.ceil((end - start) / 0.1))
    simultaneous = 0

    def active(voice, at):
        return any(a <= at < b for a, b in voice["candidate_vocal_regions"])

    for i in range(steps):
        at = start + (i + 0.5) * (end - start) / steps
        simultaneous += int(
            active(outgoing_voice, out_end - (overlap - at) * out_rate)
            and active(incoming_voice, in_start + at * in_rate)
        )
    fraction = simultaneous / steps
    result["simultaneous_vocal_candidate_fraction"] = fraction
    if fraction > 0.25:
        result["review_flags"].append(
            "both separated vocal candidates active through over 25 percent of central overlap; inspect or choose a quieter vocal window"
        )
    return result


def separate(track, signal, sr, directory, model, binding):
    import numpy as np
    import soundfile as sf
    import soxr
    import torch
    from demucs.apply import apply_model

    directory.mkdir(parents=True, exist_ok=True)
    manifest = directory / "binding.json"
    target = directory / "vocals.wav"
    if target.exists() and manifest.exists():
        old = json.loads(manifest.read_text())

        # Rhythm/tonal revisions do not invalidate unchanged stem inference.
        def stem_binding(value):
            # The first pilot used these exact settings before serializing
            # them explicitly; unknown future/partial bindings do not qualify.
            settings = value.get("stem_settings")
            if settings is None and value.get("version") == "mix-evidence-1":
                settings = {
                    "model": "htdemucs",
                    "device": "cpu",
                    "seed": 0,
                    "shifts": 0,
                    "overlap": 0.25,
                    "split": True,
                    "normalization": "mono-reference mean and standard deviation",
                }
            return {
                "source_sha256": value.get("source_sha256"),
                "weight": value.get("weights", {}).get("htdemucs_955717e8"),
                "settings": settings,
                "packages": {
                    p: value.get("packages", {}).get(p)
                    for p in ("demucs", "torch", "torchaudio", "soxr", "soundfile")
                },
            }

        if stem_binding(old.get("binding", {})) == stem_binding(binding) and old.get(
            "vocal_sha256"
        ) == digest(target):
            vocals, sample_rate = sf.read(target, dtype="float32", always_2d=True)
            mix = (
                soxr.resample(signal, sr, sample_rate) if sr != sample_rate else signal
            )
            return vocal_evidence(mix, vocals, sample_rate)
    mix = (
        soxr.resample(signal, sr, model.samplerate)
        if sr != model.samplerate
        else signal
    )
    wav = torch.from_numpy(np.ascontiguousarray(mix.T))
    ref = wav.mean(0)
    mean, std = ref.mean(), ref.std()
    if float(std) <= 1e-8:
        raise ValueError("Cannot separate silence")
    torch.manual_seed(0)
    with torch.inference_mode():
        stems = (
            apply_model(
                model,
                (wav - mean)[None] / std,
                device=binding.get("stem_settings", {}).get("device", "cpu"),
                shifts=0,
                split=True,
                overlap=0.25,
                progress=False,
            )[0]
            * std
            + mean
        )
    vocals = stems[model.sources.index("vocals")].cpu().numpy().T
    sf.write(target, vocals, model.samplerate, subtype="FLOAT")
    write_json(manifest, {"binding": binding, "vocal_sha256": digest(target)})
    return vocal_evidence(mix, vocals, model.samplerate)


def run(root, only=None, vocal_ids=None):
    import certifi
    import soundfile as sf
    import torch
    from beat_this.inference import File2Beats
    from demucs.pretrained import get_model

    # Keep caches inside the ignored task folder. Use a real CA bundle rather
    # than disabling TLS validation on macOS's standalone Python installation.
    os.environ.setdefault("SSL_CERT_FILE", certifi.where())
    torch.hub.set_dir(str(BASE / ".local/ml-models/hub"))
    torch.set_num_threads(4)
    baseline = json.loads((root / "analysis.json").read_text())
    selected = [t for t in baseline["tracks"] if not only or t["id"] in only]
    available = {t["id"] for t in selected}
    if (
        not selected
        or len(selected) != len(available)
        or any(not file_key(ident) for ident in available)
        or (only and not only <= available)
        or not (vocal_ids or set()) <= available
    ):
        raise ValueError(
            "Requested source IDs are not all present in selected analysis"
        )
    rhythm_model = File2Beats(checkpoint_path="final0", device="cpu", dbn=False)
    stem_model = get_model("htdemucs") if vocal_ids else None
    model_dir = Path(torch.hub.get_dir()) / "checkpoints"
    weights = {"beat_this_final0": digest(model_dir / "beat_this-final0.ckpt")}
    if stem_model is not None:
        weights["htdemucs_955717e8"] = digest(model_dir / "955717e8-8726e21a.th")
    packages = {name: version(name) for name in PACKAGES}
    directory = root / "intelligence"
    report = {
        "version": VERSION,
        "generated_at": datetime.now(UTC).isoformat(),
        "model_weights_sha256": weights,
        "packages": packages,
        "tracks": [],
        "errors": [],
        "party_ready": False,
        "host_votes_changed": False,
        "render_changed": False,
    }
    for track in selected:
        ident = track["id"]
        start = time.monotonic()
        try:
            path = Path(track["path"])
            if digest(path) != track["sha256"]:
                raise ValueError("Source changed since baseline analysis")
            signal, sr = sf.read(path, dtype="float32", always_2d=True)
            if (
                signal.shape[1] != 2
                or abs(len(signal) / sr - track["duration_seconds"]) > 0.01
            ):
                raise ValueError("Source format/duration changed")
            binding = {
                "source_sha256": track["sha256"],
                "baseline": track,
                "version": VERSION,
                "packages": packages,
                "weights": weights,
                "vocals_requested": ident in (vocal_ids or set()),
                "stem_settings": STEM_SETTINGS,
            }
            key = file_key(ident)
            cache = directory / f"{key}.json"
            old = json.loads(cache.read_text()) if cache.exists() else {}
            if old.get("binding") == binding:
                evidence = old["evidence"]
                # Re-score cached raw events without re-running the model.
                evidence["rhythm"] = beat_evidence(
                    evidence["rhythm"]["beats_seconds"],
                    evidence["rhythm"]["downbeats_seconds"],
                    track,
                )
                write_json(cache, {"binding": binding, "evidence": evidence})
            else:
                beats, downbeats = rhythm_model(str(path))
                evidence = {
                    "id": ident,
                    "source_sha256": track["sha256"],
                    "rhythm": beat_evidence(beats, downbeats, track),
                    "tonal": key_evidence(signal, sr, track),
                }
                if ident in (vocal_ids or set()):
                    evidence["vocals"] = separate(
                        track,
                        signal,
                        sr,
                        directory / "stems" / key,
                        stem_model,
                        binding,
                    )
                write_json(cache, {"binding": binding, "evidence": evidence})
            report["tracks"].append(evidence)
            print(
                ident,
                "model BPM",
                round(evidence["rhythm"]["median_eight_beat_bpm"], 2),
                "flags",
                len(evidence["rhythm"]["review_flags"]),
                "key",
                evidence["tonal"]["global"]["key"],
                evidence["tonal"]["global"]["scale"],
                "vocals",
                bool(evidence.get("vocals")),
                "seconds",
                round(time.monotonic() - start, 1),
                flush=True,
            )
        except Exception as error:  # noqa: BLE001 - retain per-source failures in the report
            report["errors"].append({"id": ident, "error": str(error)})
            print(ident, "ERROR", error, flush=True)
        write_json(directory / "report.json", report)
    edits_path = root / "audition-edit-report.json"
    if edits_path.exists():
        edits = json.loads(edits_path.read_text())
        evidence = {t["id"]: t for t in report["tracks"]}
        baselines = {t["id"]: t for t in selected}
        for edit in edits["tracks"]:
            if (
                edit["id"] in evidence
                and edit["source_sha256"] != evidence[edit["id"]]["source_sha256"]
            ):
                raise ValueError("Edit report refers to a changed source")
        report["existing_edit_review"] = [
            annotate_edits(baselines[t["id"]], evidence[t["id"]], t)
            for t in edits["tracks"]
            if t["id"] in evidence
        ]
        report["existing_join_review"] = [
            join_evidence(a, b, evidence)
            for a, b in itertools.pairwise(edits["tracks"])
        ]
        write_json(directory / "report.json", report)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT)
    parser.add_argument("--only", action="append")
    parser.add_argument(
        "--vocals",
        action="append",
        help="Also separate/analyze vocals for this selected source ID",
    )
    args = parser.parse_args()
    result = run(
        args.root.expanduser().resolve(), set(args.only or []), set(args.vocals or [])
    )
    raise SystemExit(2 if result["errors"] else 0)
