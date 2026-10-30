"""Source-bound bar novelty, phrase hypotheses and conservative loop candidates."""

import hashlib
import json
import math
from importlib.metadata import version
from pathlib import Path

from analyze_audio import digest, write_json
from audio_intelligence import vocal_fraction
from compact_audio import open_analysis_audio

VERSION = "bar-arrangement-3"


def harmonic_ratio(magnitude, frequencies, sr):
    """A coarse mid-band loop-screening descriptor, not a stem estimate."""
    import librosa
    import numpy as np
    mid=(frequencies>=250)&(frequencies<min(6000,sr/2))
    compact=magnitude[mid][::4,::2]
    if compact.shape[0]<7 or compact.shape[1]<7:
        return 1.0
    harmonic,percussive=librosa.decompose.hpss(compact,kernel_size=7)
    hp,pp=float(np.sum(harmonic**2)),float(np.sum(percussive**2))
    return hp/max(hp+pp,1e-12)


def cosine(a, b):
    import numpy as np

    return float(np.dot(a, b) / max(1e-12, np.linalg.norm(a) * np.linalg.norm(b)))


def infer_phrases(bars, stable=True):
    """Infer an eight-bar phase from repeated, measured arrangement changes.

    A downbeat alone cannot establish a phrase. Uniform material has no phrase
    support; local strong changes remain useful even without a global phase.
    """
    import numpy as np

    boundaries = []
    for i in range(2, len(bars) - 2):
        left, right = bars[i - 2 : i], bars[i : i + 2]
        energy = abs(
            np.mean([b["rms_dbfs"] for b in left])
            - np.mean([b["rms_dbfs"] for b in right])
        )
        texture = max(
            0,
            1
            - cosine(
                np.mean([b["spectrum"] for b in left], axis=0),
                np.mean([b["spectrum"] for b in right], axis=0),
            ),
        )
        density = abs(
            np.mean([b["density"] for b in left])
            - np.mean([b["density"] for b in right])
        )
        novelty = min(1.0, float(energy / 8 + texture * 2 + density * 0.3))
        boundaries.append({"bar": i, "time": bars[i]["start"], "novelty": novelty})
    # Collapse a smeared change to its strongest local bar, not three votes.
    salient = [
        p
        for i, p in enumerate(boundaries)
        if p["novelty"] >= 0.25
        and p["novelty"]
        >= max((x["novelty"] for x in boundaries[max(0, i - 2) : i + 3]), default=0)
    ]
    scores = [
        sum(p["novelty"] for p in salient if p["bar"] % 8 == phase)
        for phase in range(8)
    ]
    phase = max(range(8), key=lambda p: (scores[p], -p))
    total = sum(scores)
    support = scores[phase] / total if total else 0.0
    count = sum(p["bar"] % 8 == phase for p in salient)
    supported = bool(stable and count >= 3 and support >= 0.45)
    return {
        "phase_bars": phase if supported else None,
        "supported": supported,
        "support": support,
        "supporting_changes": count,
        "boundaries": boundaries,
        "human_verified": False,
        "method": "two-bar energy/spectrum/density novelty; recurrent eight-bar phase, heuristic not probability",
    }


def measure_arrangement(track, grid, cache):
    """Measure actual bars on the chosen grid, independently of old phrase bins."""
    import librosa
    import numpy as np
    import soundfile as sf

    binding = {
        "version": VERSION,
        "sha256": track["sha256"],
        "bpm": track["bpm"],
        "anchor": grid["anchor_seconds"],
        "stable_bars": grid["splice_supported"],
        "packages": {p: version(p) for p in ("numpy", "librosa", "soundfile")},
        'harmonic_descriptor':'250-6000 Hz, four-bin/two-frame subsampling, seven-point HPSS; conservative loop screening only',
    }
    if digest(Path(track["path"])) != track["sha256"]:
        raise ValueError("Source changed before arrangement measurement")
    key = hashlib.sha256(json.dumps(binding, sort_keys=True).encode()).hexdigest()
    path = cache / (key + ".json")
    if path.exists():
        result = json.loads(path.read_text())
        if result["binding"] != binding:
            raise ValueError("Arrangement cache binding mismatch")
        return result
    bar = 240 / track["bpm"]
    bars = []
    with open_analysis_audio(track["path"]) as audio:
        sr = audio.samplerate
        for i in range(
            math.floor((track["duration_seconds"] - grid["anchor_seconds"]) / bar)
        ):
            start = grid["anchor_seconds"] + i * bar
            audio.seek(round(start * sr))
            signal = np.mean(
                audio.read(
                    round((start + bar) * sr) - round(start * sr),
                    dtype="float32",
                    always_2d=True,
                ),
                axis=1,
            )
            if not len(signal) or not np.all(np.isfinite(signal)):
                raise ValueError("Invalid audio in arrangement measurement")
            magnitude = np.abs(librosa.stft(signal, n_fft=2048, hop_length=512))
            frequencies = librosa.fft_frequencies(sr=sr, n_fft=2048)
            power = magnitude**2
            spectrum = [
                float(
                    np.mean(power[(frequencies >= a) & (frequencies < min(b, sr / 2))])
                )
                if a < sr / 2
                else 0.0
                for a, b in [
                    (30, 180),
                    (180, 500),
                    (500, 1500),
                    (1500, 4000),
                    (4000, 10000),
                ]
            ]
            spectrum = np.sqrt(spectrum)
            spectrum /= max(float(np.linalg.norm(spectrum)), 1e-12)
            harmonic_fraction=harmonic_ratio(magnitude,frequencies,sr)
            flux = np.maximum(0, np.diff(np.sum(power, axis=0)))
            pulse = np.array([np.mean(x) for x in np.array_split(flux, 16)])
            pulse /= max(float(np.linalg.norm(pulse)), 1e-12)
            bars.append(
                {
                    "index": i,
                    "start": start,
                    "end": start + bar,
                    "rms_dbfs": float(
                        20 * np.log10(max(float(np.sqrt(np.mean(signal**2))), 1e-12))
                    ),
                    "spectrum": spectrum.tolist(),
                    "pulse": pulse.tolist(),
                    "density": float(
                        np.mean(flux > max(float(np.mean(flux)) * 2, 1e-12))
                    ),
                    "harmonic_fraction": harmonic_fraction,
                }
            )
    result = {
        "binding": binding,
        "bars": bars,
        "phrases": infer_phrases(bars, grid["splice_supported"]),
    }
    if digest(Path(track["path"])) != track["sha256"]:
        raise ValueError("Source changed during arrangement measurement")
    write_json(path, result)
    return result


def phrase_position(track, grid, at):
    bar_number = (at - grid["anchor_seconds"]) / (240 / track["bpm"])
    phrase = track.get("arrangement", {}).get("phrases", {})
    phase = phrase.get("phase_bars")
    nearest = min(
        phrase.get("boundaries", []),
        key=lambda p: abs(p["bar"] - bar_number),
        default=None,
    )
    novelty = (
        nearest["novelty"]
        if nearest and abs(nearest["bar"] - bar_number) < 0.1
        else 0.0
    )
    offset = (bar_number - phase) % 8 if phrase.get("supported") else None
    if offset is not None and min(offset, 8 - offset) < 1e-5:
        offset = 0.0
    return {
        "phase_bars": offset,
        "local_novelty": novelty,
        "supported": bool(
            phrase.get("supported") or (grid["splice_supported"] and novelty >= 0.35)
        ),
        "human_verified": False,
    }


def boundary_cost(track, grid, at):
    p = phrase_position(track, grid, at)
    if p["phase_bars"] is not None:
        return min(p["phase_bars"], 8 - p["phase_bars"]) / 4 - 0.3 * p["local_novelty"]
    return 0.0 if p["supported"] else 0.4


def loop_tail(track, evidence, choice):
    """A two-bar tail, repeated twice; unknown vocals never authorize a loop."""
    if not choice['grid']['splice_supported'] or not choice['grid'].get('interior_splices_supported',True) or evidence.get("vocals") is None:
        return None
    bar = 240 / track["bpm"]
    start, end = choice["end"] - 2 * bar, choice["end"]
    if (
        start < choice["ranges"][-1][0]
        or vocal_fraction(evidence["vocals"], start - 0.1, end + 0.1) > 0
    ):
        return None
    bars = [
        b
        for b in track.get("arrangement", {}).get("bars", [])
        if b["start"] >= start - 1e-5 and b["end"] <= end + 1e-5
    ]
    if len(bars) != 2:
        return None
    a, b = bars
    if (
        max(x["harmonic_fraction"] for x in bars) > 0.45
        or min(x["rms_dbfs"] for x in bars) < -35
        or abs(a["rms_dbfs"] - b["rms_dbfs"]) > 1.2
        or cosine(a["spectrum"], b["spectrum"]) < 0.97
        or cosine(a["pulse"], b["pulse"]) < 0.8
        or min(sum(x["pulse"]) for x in bars) < 0.1
    ):
        return None
    # Do not flatten a build, drop, or texture change inside the loop.
    if any(
        p["novelty"] >= 0.25 and start - 1e-5 <= p["time"] < end - 1e-5
        for p in track["arrangement"]["phrases"]["boundaries"]
    ):
        return None
    return {
        "source_start": start,
        "source_end": end,
        "cycle_bars": 2,
        "repeat_count": 2,
        "extension_bars": 4,
        "seam_fade_seconds": 0.005,
        "human_verified": False,
        "reason": "known quiet vocal tail; similar percussive bars, no internal arrangement change; repeated source items with seam handles",
    }
