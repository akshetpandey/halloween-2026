"""Attenuation-only DJ EQ, source-mapped vocal ducking and track fades."""

import itertools
import math


def merge_regions(regions, gap=0.0):
    result = []
    for a, b in sorted(regions):
        if b <= a:
            continue
        if result and a <= result[-1][1] + gap:
            result[-1][1] = max(result[-1][1], b)
        else:
            result.append([a, b])
    return result


def mapped_vocals(definition, voice):
    """Map exact retained/warped/looped source intervals to project seconds."""
    if voice is None:
        return None
    result = []
    for clip in definition["clips"]:
        points = clip.get("stretch_markers") or [
            {"position": 0, "source": clip["source_start"]},
            {
                "position": clip["length"],
                "source": clip["source_start"] + clip["length"] * clip["rate"],
            },
        ]
        for left, right in itertools.pairwise(points):
            a, b = left["source"], right["source"]
            if b <= a:
                raise ValueError("Nonmonotone source mapping")
            rate = (right["position"] - left["position"]) / (b - a)
            for x, y in voice["candidate_vocal_regions"]:
                lo, hi = max(a, x), min(b, y)
                if hi > lo:
                    result.append(
                        [
                            clip["position"] + left["position"] + (lo - a) * rate,
                            clip["position"] + left["position"] + (hi - a) * rate,
                        ]
                    )
    return merge_regions(result, 0.001)


def duck_regions(outgoing, incoming, start, end):
    if outgoing is None or incoming is None:
        return []
    # Incoming lead has priority; never alternate the priority within a join.
    return merge_regions(
        [
            [max(start, a, c), min(end, b, d)]
            for a, b in outgoing
            for c, d in incoming
            if min(end, b, d) - max(start, a, c) >= 0.12
        ],
        0.12,
    )


def volume_points(start, end, fade_in, fade_out, regions):
    """Linear crossfades times a smooth, capped -4.5 dB activity envelope.

    This ducks the outgoing stereo mix, not a separated vocal stem. Gain is
    multiplied into the native volume envelope so REAPER automation cannot
    accidentally override the independently measured track gain.
    """
    if not (
        0 <= start < end
        and 0 < fade_in
        and 0 < fade_out
        and fade_in + fade_out < end - start
    ):
        raise ValueError("Invalid track fade geometry")
    attenuation = 10 ** (-4.5 / 20)
    events = []
    spans = [(start, start + fade_in), (end - fade_out, end)]
    for a, b in merge_regions(regions, 0.12):
        events.append((max(start, a - 0.06), a, min(end, b + 0.08), min(end, b + 0.33)))
        spans.append((events[-1][0], events[-1][-1]))
    times = {0.0, start, start + fade_in, end - fade_out, end}
    for a, b in spans:
        times.update(
            a + (b - a) * i / max(1, math.ceil((b - a) / 0.05))
            for i in range(math.ceil((b - a) / 0.05) + 1)
        )
    for event in events:
        times.update(event)
    points = []
    for t in sorted(times):
        blend = max(0, min(1, (t - start) / fade_in, (end - t) / fade_out))
        duck = 1.0
        for attack, a, b, release in events:
            if attack <= t < a:
                value = 1 + (attenuation - 1) * (t - attack) / max(a - attack, 1e-12)
            elif a <= t <= b:
                value = attenuation
            elif b < t < release:
                value = attenuation + (1 - attenuation) * (t - b) / max(
                    release - b, 1e-12
                )
            else:
                value = 1.0
            duck = min(duck, value)
        points.append({"time": t, "amplitude": blend * duck})
    return points


def three_band_eq(start, end, before, after):
    """A bass exchange, restrained high handover and clash-dependent mids."""
    bands = []
    for name, kind, hz, depth in [
        ("low", 1, 180, -24),
        ("mid", 2, 1200, -3),
        ("high", 4, 6000, -3),
    ]:
        points = [{"time": 0.0, "db": 0.0}]
        if before and before["kind"] != "reset":
            width = before["overlap_seconds"]
            mid = start + width * 0.5
            cut = depth
            if (
                name == "mid"
                and (before.get("harmonic_cost", 0.5) or 0) <= 0.1
                and not before.get("vocal_overlap")
            ):
                cut = 0
            points = [
                {"time": 0.0, "db": cut},
                {"time": start, "db": cut},
                {
                    "time": mid - 0.04 if name == "low" else start + width * 0.25,
                    "db": cut,
                },
                {
                    "time": mid + 0.04 if name == "low" else start + width * 0.75,
                    "db": 0.0,
                },
            ]
        if after and after["kind"] != "reset":
            width = after["overlap_seconds"]
            join_start = end - width
            mid = end - width * 0.5
            cut = depth
            if name == "mid":
                cut = (
                    -6
                    if (after.get("harmonic_cost") or 0) > 0.1
                    else -3
                    if after.get("vocal_overlap")
                    else 0
                )
            points.extend(
                [
                    {
                        "time": mid - 0.04
                        if name == "low"
                        else join_start + width * 0.25,
                        "db": 0.0,
                    },
                    {
                        "time": mid + 0.04
                        if name == "low"
                        else join_start + width * 0.75,
                        "db": cut,
                    },
                ]
            )
        points.append({"time": end, "db": points[-1]["db"]})
        bands.append(
            {
                "name": name,
                "band_type": kind,
                "band_index": 0,
                "frequency_hz": hz,
                "q": 0.666667 if name == "mid" else 0.707107,
                "points": points,
            }
        )
    return bands


def automate(definitions, details, joins, evidence):
    voices = [
        mapped_vocals(d, evidence.get(t["id"], {}).get("vocals"))
        for d, t in zip(definitions, details)
    ]
    for i, (definition, detail) in enumerate(zip(definitions, details)):
        before = joins[i - 1] if i else None
        after = joins[i] if i < len(joins) else None
        start, end = detail["start_seconds"], detail["end_seconds"]
        regions = []
        if after and after["kind"] != "reset":
            regions = duck_regions(
                voices[i], voices[i + 1], end - after["overlap_seconds"], end
            )
        fade_in = (
            before["overlap_seconds"] if before and before["kind"] != "reset" else 0.04
        )
        fade_out = (
            after["overlap_seconds"]
            if after and after["kind"] != "reset"
            else 0.12
            if after
            else 1.5
        )
        definition["volume"] = volume_points(start, end, fade_in, fade_out, regions)
        definition["eq_bands"] = three_band_eq(start, end, before, after)
        detail["vocal_ducking"] = {
            "regions": regions,
            "depth_db": -4.5,
            "attack_seconds": 0.06,
            "release_seconds": 0.25,
            "priority": "incoming lead",
            "target": "outgoing stereo mix",
            "evidence_available": voices[i] is not None
            and (not after or voices[i + 1] is not None),
        }
