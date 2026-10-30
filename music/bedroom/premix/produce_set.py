#!/usr/bin/env python3
"""Production source analysis and chapter delivery for the approved Hollow set."""
import argparse
import json
import os
from pathlib import Path
import time
import subprocess
import sys
from importlib.metadata import version

from analyze_audio import analyze_track, decode_source, digest, write_json
from audio_intelligence import beat_evidence, key_evidence, separate, STEM_SETTINGS, PACKAGES
from prepare import DEFAULT_DB, approved_pool, check_file, file_key, host_rows
from compact_audio import compact_source

BASE = Path(__file__).resolve().parent
VERSION = "hollow-production-evidence-1"


def tempo_prior(beats, track):
    import numpy as np
    if len(beats) < 20:
        raise ValueError("Too few model beats for a source tempo prior")
    measured = float(60 * 8 / np.median(np.asarray(beats)[8:] - np.asarray(beats)[:-8]))
    catalog = track.get("catalog_analysis", {}).get("features", {}).get("tempo", {}).get("value")
    choices = [b for b in [measured / 2, measured, measured * 2] if 65 <= b <= 210]
    if "drum" in track.get("lane", "").casefold():
        choices = [b for b in choices if 150 <= b <= 195] or choices
    elif any(w in track.get("lane", "").casefold() for w in ["hard", "rave", "psy", "techno", "acid", "trance"]):
        choices = [b for b in choices if 120 <= b <= 200] or choices
    value = min(choices, key=lambda b: abs(b - float(catalog or measured)))
    return {"value": value, "source": "Beat This final0 on this acquired file; eight-beat spans with explicit half/double-time selection", "kind": "audio-model tempo prior, refined by independent onset regression"}


def supervise(database,root,shard,shards):
    """Bound the lifetime of Metal graph caches; resume via per-source evidence."""
    previous=-1;stalls=0
    for batch in range(30):
        with (root/f'analysis-shard-{shard}-batch-{batch:02d}.log').open('w') as log:
            subprocess.run([sys.executable,str(Path(__file__).resolve()),'--database',str(database),
                            '--output',str(root),'--shard',str(shard),'--shards',str(shards),
                            '--new-limit','16'],stdout=log,stderr=subprocess.STDOUT,check=True)
        report=json.loads((root/f'evidence/analysis-{shard}.json').read_text())
        tracks,_=approved_pool(host_rows(database));mapping=json.loads((root/'file-map.json').read_text())
        wanted={t['id'] for i,t in enumerate(tracks) if i%shards==shard and t['spotify_uri'] in mapping}
        complete={t['id'] for t in report['tracks']}
        print('ANALYSIS BATCH',shard,batch,'complete',len(complete),'of',len(wanted),'errors',len(report['errors']),flush=True)
        if complete>=wanted:return
        stalls=stalls+1 if len(complete)<=previous else 0;previous=len(complete)
        if stalls>=3:raise RuntimeError('Repeated source failures remain; inspect shard report')
    raise RuntimeError('Analysis batch limit reached; inspect progress before continuing')


def analyze_sources(database, root, watch=False, limit=None, shard=0, shards=1, new_limit=0):
    import certifi
    import numpy as np
    import soundfile as sf
    import torch
    from beat_this.inference import File2Beats
    from demucs.pretrained import get_model
    os.environ.setdefault("SSL_CERT_FILE", certifi.where())
    torch.set_num_threads(4)
    torch.hub.set_dir(str(BASE / ".local/ml-models/hub"))
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    if device=='mps':torch.mps.set_per_process_memory_fraction(.6)
    print('Production model device:', device, flush=True)
    rhythm_model = File2Beats(checkpoint_path="final0", device=device, dbn=False)
    stem_model = get_model("htdemucs")
    model_dir = Path(torch.hub.get_dir()) / "checkpoints"
    weights = {"beat_this_final0": digest(model_dir / "beat_this-final0.ckpt"),
               "htdemucs_955717e8": digest(model_dir / "955717e8-8726e21a.th")}
    analysis_root = root / "evidence"
    analysis_root.mkdir(parents=True, exist_ok=True)
    done = {}
    errors = {}
    new_count=0
    while True:
        approved, _ = approved_pool(host_rows(database))
        allowed = {t["id"]: t for t in approved}
        mapping_path = root / "file-map.json"
        mapping = json.loads(mapping_path.read_text()) if mapping_path.exists() else {}
        for position,metadata in enumerate(approved):
            if position%shards!=shard:continue
            ident = metadata["id"]
            if ident in done or ident in errors:
                continue
            binding = mapping.get(metadata["spotify_uri"])
            if not binding:
                continue
            started = time.monotonic()
            key = file_key(ident)
            try:
                bound = check_file(metadata, binding, root)
                if bound["status"] != "ready for import":
                    raise ValueError(bound.get("reason", bound["status"]))
                cache = analysis_root / "production-cache" / (key + ".json")
                cached = json.loads(cache.read_text()) if cache.exists() else {}
                expected = {"version": VERSION, "source_sha256": bound["sha256"], "weights": weights,
                            "packages": {p: version(p) for p in PACKAGES},
                            "stem_settings": {**STEM_SETTINGS, "device": device}}
                if (cached.get("binding") == expected
                        and (cached['analysis']['grid']['usable_constant_grid'] or cached['analysis'].get('timing_review_attempted'))
                        and digest(Path(cached["analysis"]["path"])) == cached["analysis"]["sha256"]):
                    track, evidence = cached["analysis"], cached["evidence"]
                else:
                    decoded = decode_source(Path(bound["path"]), analysis_root, ident)
                    print('RHYTHM', ident, flush=True)
                    beats, downbeats = rhythm_model(str(decoded))
                    print('STRUCTURE', ident, flush=True)
                    track = analyze_track({**metadata, "analysis_tempo_prior": tempo_prior(beats, metadata)}, analysis_root, source=Path(bound["path"]))
                    if not track['grid']['usable_constant_grid']:
                        catalog = metadata.get('catalog_analysis', {}).get('features', {}).get('tempo')
                        if catalog:
                            alternate = analyze_track(metadata, analysis_root, source=Path(bound['path']))
                            if alternate['grid']['usable_constant_grid']:
                                track = alternate
                    track['timing_review_attempted']=True
                    signal, sr = sf.read(track["path"], dtype="float32", always_2d=True)
                    print('TONAL', ident, flush=True)
                    evidence = {"id": ident, "source_sha256": track["sha256"],
                                "rhythm": beat_evidence(beats, downbeats, track),
                                "tonal": key_evidence(signal, sr, track)}
                    stem_dir = analysis_root / "intelligence" / "stems" / key
                    print('VOCALS', ident, flush=True)
                    evidence["vocals"] = separate(track, signal, sr, stem_dir, stem_model,
                                                  {**expected, "source_sha256": track["sha256"]})
                    write_json(cache, {"binding": expected, "analysis": track, "evidence": evidence})
                    # The render uses original stereo sources. Keep measured vocal
                    # regions and hashes, without retaining 13 hours of unused stems.
                    (stem_dir / "vocals.wav").unlink(missing_ok=True)
                track,evidence,temporary = compact_source(track,evidence)
                write_json(cache, {"binding": expected, "analysis": track, "evidence": evidence})
                if temporary is not None:
                    if digest(temporary)!=track['analysis_pcm_file_sha256']:
                        raise ValueError('Decoded scratch file changed before compaction')
                    temporary.unlink()
                done[ident] = {"analysis": track, "evidence": evidence}
                if cached.get('binding')!=expected:new_count+=1
                print(f"ANALYZED {len(done)}/{len(approved)} {ident} bpm={track['bpm']:.3f} grid={track['grid']['usable_constant_grid']} vocals={evidence['vocals']['candidate_vocal_fraction']:.2f} elapsed={time.monotonic()-started:.1f}s", flush=True)
            except Exception as error:
                errors[ident] = str(error)
                print("ANALYSIS ERROR", ident, str(error), flush=True)
            ordered = [t["id"] for t in approved if t["id"] in done]
            suffix='' if shards==1 else f'-{shard}'
            write_json(analysis_root / f"analysis{suffix}.json", {"tracks": [done[i]["analysis"] for i in ordered], "errors": errors,'shard':shard,'shards':shards})
            write_json(analysis_root / f"intelligence/report{suffix}.json", {"version": VERSION, "model_weights_sha256": weights, "tracks": [done[i]["evidence"] for i in ordered], "errors": errors,'shard':shard,'shards':shards})
            if device=='mps':torch.mps.empty_cache()
            if limit and len(done) >= limit:
                return done, errors
            if new_limit and new_count>=new_limit:
                return done,errors
        progress_path = root / "acquisition-report.json"
        progress = json.loads(progress_path.read_text()) if progress_path.exists() else {}
        finished = len(progress.get("results", [])) == len(approved)
        if not watch or finished:
            return done, errors
        time.sleep(5)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, default=DEFAULT_DB)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--watch", action="store_true")
    parser.add_argument("--limit", type=int)
    parser.add_argument('--shard',type=int,default=0)
    parser.add_argument('--shards',type=int,choices=range(1,3),default=1)
    parser.add_argument('--new-limit',type=int,default=0)
    parser.add_argument('--supervise',action='store_true')
    args = parser.parse_args()
    if not 0<=args.shard<args.shards:parser.error('Invalid analysis shard')
    if args.supervise:supervise(args.database,args.output.resolve(),args.shard,args.shards)
    else:analyze_sources(args.database, args.output.resolve(), args.watch, args.limit,args.shard,args.shards,args.new_limit)
