#!/usr/bin/env python3
"""Build/read back an isolated REAPER project. Never play or render audio."""

import argparse
import hashlib
import json
import math
import shutil
import subprocess
import time
from pathlib import Path

from analyze_audio import digest, write_json
from plan_mix import compile_timeline, validate_current
from prepare import DEFAULT_DB
from reaper_proof import build_lock, check_saved_project, lua, save_plan
from synth_test_audio import create_fixtures

BASE = Path(__file__).resolve().parent


def verify_readback(plan, actual):
    if (
        actual.get("run_id") != plan["run_id"]
        or actual.get("manifest_sha256") != plan["manifest_sha256"]
    ):
        raise ValueError("Stale native readback")
    if len(actual["tracks"]) != len(plan["tracks"]):
        raise ValueError("Wrong native track count")
    if actual.get("global_automation_override", -1) != -1:
        raise ValueError("Global automation override would bypass planned envelopes")
    if actual.get('repeat_mode', 0) != 0:
        raise ValueError('Project repeat mode must be off')
    for expected, track in zip(plan["tracks"], actual["tracks"]):
        if len(track["clips"]) != len(expected["clips"]):
            raise ValueError("Wrong native item count")
        for a, b in zip(expected["clips"], track["clips"]):
            if Path(b["path"]).resolve() != Path(expected["path"]).resolve():
                raise ValueError("Wrong native source file")
            for key in (
                "source_start",
                "position",
                "length",
                "rate",
                "fade_in",
                "fade_out",
            ):
                if not math.isclose(a[key], b[key], rel_tol=0, abs_tol=1e-6):
                    raise ValueError("Native clip mismatch: " + key)
            if b["preserve_pitch"] != 1:
                raise ValueError("Pitch preservation missing")
            wanted = a.get("stretch_markers", [])
            observed = b.get("stretch_markers", [])
            if not isinstance(observed, list) and not wanted:
                observed = []
            if len(wanted) != len(observed) or any(
                not math.isclose(x[k], y[k], rel_tol=0, abs_tol=1e-6)
                for x, y in zip(wanted, observed)
                for k in ("position", "source")
            ):
                raise ValueError("Native warp mismatch")
        if "eq_bands" in expected:
            if len(track.get("eq_bands", [])) != 3:
                raise ValueError("Three-band EQ missing")
            for band, result in zip(expected["eq_bands"], track["eq_bands"]):
                if (
                    not result["enabled"]
                    or not result.get("automation_active", False)
                    or band["band_type"] != result["band_type"]
                    or len(band["points"]) != len(result["points"])
                    or not math.isclose(
                        float(result["parameters"]["0"]),
                        band["frequency_hz"],
                        rel_tol=0,
                        abs_tol=0.1,
                    )
                    or not math.isclose(
                        float(result["parameters"]["2"]),
                        band["q"],
                        rel_tol=0,
                        abs_tol=0.01,
                    )
                ):
                    raise ValueError("Native EQ band mismatch")
                for p, q in zip(band["points"], result["points"]):
                    if not math.isclose(
                        p["time"], q["time"], rel_tol=0, abs_tol=1e-6
                    ) or not math.isclose(
                        float(q["plugin_readout"].split()[0]),
                        p["db"],
                        rel_tol=0,
                        abs_tol=0.11,
                    ):
                        raise ValueError("Native EQ automation mismatch")
        if "volume" in expected:
            points = track.get("volume", {}).get("points", [])
            if (
                not track.get("volume", {}).get("active", False)
                or track.get("volume", {}).get("automation_mode") != 1
                or len(points) != len(expected["volume"])
            ):
                raise ValueError("Native volume automation missing")
            gain = 10 ** (expected.get("gain_db", 0) / 20)
            for p, q in zip(expected["volume"], points):
                if not math.isclose(
                    p["time"], q["time"], rel_tol=0, abs_tol=1e-6
                ) or not math.isclose(
                    p["amplitude"] * gain, q["amplitude"], abs_tol=1e-6
                ):
                    raise ValueError("Native volume/gain mismatch")
    return {
        "passed": True,
        "tracks": len(plan["tracks"]),
        "items": sum(len(t["clips"]) for t in plan["tracks"]),
        "eq_bands": sum(len(t.get("eq_bands", [])) for t in plan["tracks"]),
        "volume_points": sum(len(t.get("volume", [])) for t in plan["tracks"]),
        "rendered": False,
        "hardware_playback_tested": False,
        "reaper_version": actual.get("version"),
        "pitch_algorithm": actual.get("pitch_algorithm"),
    }


def build_only(plan, root, binary, profile, validator=None, timeout=45):
    """A private new instance/profile; terminate only the child we launched."""
    if validator:
        validator()
    if Path(plan["cancel_file"]).exists() or Path(plan["error_file"]).exists():
        raise ValueError(
            "Native request was already used/cancelled; regenerate the plan"
        )
    if (
        Path(plan["readback"]).exists()
        and json.loads(Path(plan["readback"]).read_text()).get("run_id")
        == plan["run_id"]
    ):
        raise ValueError("Native request already completed; regenerate the plan")
    frozen = dict(plan)
    fingerprint = frozen.pop("manifest_sha256")
    if (
        hashlib.sha256(json.dumps(frozen, sort_keys=True).encode()).hexdigest()
        != fingerprint
    ):
        raise ValueError("Native plan fingerprint mismatch")
    for t in plan["tracks"]:
        if digest(Path(t["path"])) != t["sha256"]:
            raise ValueError("Source changed before native build")
    config = profile.read_text()
    if any(
        key not in config
        for key in ("coreaudioindevnew=<none>", "coreaudiooutdevnew=<none>")
    ):
        raise ValueError("Native verification requires the no-hardware profile")
    # Recreate trusted script text, never execute an editable cached script.
    builder = BASE / "reaper_timeline.lua"
    script = Path(plan["build_script"])
    script.write_text(
        "local builder = dofile("
        + lua(str(builder))
        + ")\nbuilder.run("
        + lua(plan)
        + ")\n"
    )
    run_profile = root / ("native-" + plan["run_id"] + ".ini")
    shutil.copyfile(profile, run_profile)
    with (root / "native-build.log").open("a") as log:
        child = subprocess.Popen(
            [
                str(binary),
                "-newinst",
                "-nosplash",
                "-noactivate",
                "-cfgfile",
                str(run_profile),
                str(script),
            ],
            stdout=log,
            stderr=subprocess.STDOUT,
        )
        try:
            deadline = time.monotonic() + timeout
            while True:
                if Path(plan["error_file"]).exists():
                    raise RuntimeError(Path(plan["error_file"]).read_text())
                if Path(plan["readback"]).exists():
                    try:
                        actual = json.loads(Path(plan["readback"]).read_text())
                    except json.JSONDecodeError:
                        actual = {}
                    if actual.get("run_id") == plan["run_id"]:
                        break
                if child.poll() is not None or time.monotonic() >= deadline:
                    raise RuntimeError(
                        "Native build did not finish; inspect native-build.log"
                    )
                time.sleep(0.2)
            check_saved_project(plan)
            result = verify_readback(plan, actual)
            if validator:
                validator()
            if any(digest(Path(t["path"])) != t["sha256"] for t in plan["tracks"]):
                raise ValueError("Source changed during native build")
            write_json(root / "native-verification.json", result)
            return result
        finally:
            Path(plan["cancel_file"]).touch()
            if child.poll() is None:
                child.terminate()
                child.wait(timeout=5)


def procedural_plan(root):
    """Known fixture grids exercise a loop join plus a separate vocal handover."""
    fixtures = create_fixtures(root / "sources")
    tracks, choices, evidence = [], [], {}
    for ident, key in [("a", "a"), ("b", "b"), ("c", "a")]:
        source = fixtures["tracks"][key]
        bpm = source["bpm"]
        end = 24 * 240 / bpm
        track = {
            **source,
            "id": ident,
            "artist": "Original fixture",
            "title": ident,
            "lane": "Tech house",
            "arrangement": {},
        }
        tracks.append(track)
        choices.append(
            {
                "id": ident,
                "grid": {"anchor_seconds": 0, "splice_supported": True},
                "ranges": [[0, end]],
                "start": 0,
                "end": end,
                "removed_repeats": [],
                "boundary_vocal_candidates": {},
                "vocal_evidence_available": True,
            }
        )
        evidence[ident] = {
            "vocals": {
                "candidate_vocal_regions": [[end - 10, end]]
                if ident == "b"
                else [[0, 10]]
                if ident == "c"
                else []
            }
        }
    loop = {
        "source_start": choices[0]["end"] - 2 * 240 / 128,
        "source_end": choices[0]["end"],
        "cycle_bars": 2,
        "repeat_count": 2,
        "extension_bars": 4,
        "seam_fade_seconds": 0.005,
    }
    joins = [
        {
            "kind": "loop_bridge",
            "bars": 4,
            "overlap_seconds": 4 * 240 / 130,
            "incoming_bpm": 130,
            "outgoing_bpm": 130,
            "loop": loop,
            "harmonic_cost": 0,
            "vocal_overlap": 0,
        },
        {
            "kind": "short_bass_swap",
            "bars": 4,
            "overlap_seconds": 4 * 240 / 130,
            "incoming_bpm": 130,
            "outgoing_bpm": 130,
            "harmonic_cost": 1,
            "vocal_overlap": 1,
        },
    ]
    definitions, details, markers, tempo, end = compile_timeline(
        choices, joins, tracks, {"a": -3, "b": -4, "c": -2}, evidence
    )
    write_json(
        root / "procedural-decisions.json", {"tracks": details, "transitions": joins}
    )
    return save_plan(
        root,
        "transition-proof",
        definitions,
        end,
        markers,
        purpose="Procedural build/readback only; no audio rendering",
        bpm=128,
        master_db=-6,
        tempo_map=tempo,
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--mix-plan", type=Path)
    group.add_argument("--procedural-proof", action="store_true")
    parser.add_argument(
        "--engineering",
        action="store_true",
        help="Allow an existing Keep-only audition plan, not production approval",
    )
    parser.add_argument("--database", type=Path, default=DEFAULT_DB)
    parser.add_argument(
        "--output", type=Path, default=BASE / ".local/native-transition-proof"
    )
    parser.add_argument(
        "--profile", type=Path, default=BASE / ".local/reaper-resource/reaper.ini"
    )
    parser.add_argument(
        "--reaper",
        type=Path,
        default=Path("/Applications/REAPER.app/Contents/MacOS/REAPER"),
    )
    args = parser.parse_args()
    root = args.output.resolve()
    with build_lock(root):
        validator = None
        if args.mix_plan:
            report = json.loads(args.mix_plan.read_text())
            validator = lambda: validate_current(
                report, args.database, require_production=not args.engineering
            )
            validator()
            plan = json.loads(Path(report["native_plan"]).read_text())
        else:
            plan = procedural_plan(root)
        print(json.dumps(build_only(plan, root, args.reaper, args.profile, validator)))


if __name__ == "__main__":
    main()
