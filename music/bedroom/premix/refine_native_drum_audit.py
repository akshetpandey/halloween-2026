#!/usr/bin/env python3
"""Resolve ambiguous full-mix attacks using drums from the actual native audio.

Each deck is separated independently as dual-mono. The other diagnostic deck
is never given to the model, preventing cross-deck bleed from faking sync.
Failed rhythm remains failed; no timing thresholds are relaxed.
"""
import argparse
from copy import deepcopy
from importlib.metadata import version
import json
from pathlib import Path
import subprocess
import sys

from analyze_audio import digest,write_json
from audit_single_lead import check_window
from plan_mix import validate_current
from prepare import DEFAULT_DB

BASE=Path(__file__).resolve().parent


def refine(report_path,diagnostics,output,limit=6,rhythm=False):
    import numpy as np
    import soundfile as sf
    import torch
    from scipy.signal import resample_poly
    from demucs.apply import apply_model
    from demucs.pretrained import get_model
    report=json.loads(report_path.read_text());validate_current(report,DEFAULT_DB)
    pending=[]
    roots=diagnostics if isinstance(diagnostics,list) else [diagnostics]
    for result_file in sorted(p for root in roots for p in root.glob('batch-*/results.json')):
        record=json.loads(result_file.read_text());offset=0.
        wave=result_file.parent/'renders/transition-diagnostic.wav'
        for row in record['results']:
            join=report['transitions'][row['index']];design=join['arrangement_design'];duration=design['mix_end_seconds']-design['mix_start_seconds']
            if design['realized_timing'].get('status')!='checked':pending.append((row['index'],wave,record['wave_sha256'],offset,duration))
            offset+=duration+.5
    if not pending:return 0
    torch.hub.set_dir(str(BASE/'.local/ml-models/hub'));torch.set_num_threads(3)
    device='mps' if torch.backends.mps.is_available() else 'cpu'
    if device=='mps':torch.mps.set_per_process_memory_fraction(.5)
    model=None;weight=next((BASE/'.local/ml-models/hub/checkpoints').glob('955717e8-*.th'))
    checked=0;wave_cache={}
    for index,wave,sha,start,duration in pending:
        if checked>=limit:break
        folder=output/f'join-{index+1:03d}';target=folder/'check.json'
        join=report['transitions'][index];design=join['arrangement_design']
        binding={'wave_sha256':sha,'native_window_seconds':[start,start+duration],
                 'source_sha256':design['source_sha256'],'model':'htdemucs','weight_sha256':digest(weight),'shifts':0,
                 'component':'drums+bass' if rhythm else 'drums',
                 'packages':{p:version(p) for p in ['torch','torchaudio','demucs','numpy','scipy']},
                 'implementation_sha256':digest(Path(__file__)),'checker_sha256':digest(BASE/'audit_single_lead.py')}
        previous=None
        if target.exists():
            previous=json.loads(target.read_text())
            if previous['binding']==binding:
                if previous['check']['status']=='checked':
                    design['full_mix_attack_screen']=design['realized_timing'];design['realized_timing']=previous['check']
                    write_json(report_path,report);checked+=1
                continue
        path=folder/('actual-native-rhythm.wav' if rhythm else 'actual-native-drums.wav')
        separation_keys=['wave_sha256','native_window_seconds','source_sha256','model','weight_sha256','shifts','packages','component']
        reusable=previous and all(previous['binding'].get(k,'drums' if k=='component' else None)==binding[k] for k in separation_keys) and path.exists() and digest(path)==previous['check'].get('native_drum_sha256')
        if wave not in wave_cache:
            if digest(wave)!=sha:raise ValueError('Actual diagnostic render changed')
            wave_cache.clear();wave_cache[wave]=sf.read(wave,dtype='float32',always_2d=True)
        signal,sr=wave_cache[wave];x=signal[round(start*sr):round((start+duration)*sr)]
        # Anti-alias resampling preserves the actual native time axis; each
        # independent model input contains only one already-rendered deck.
        x=resample_poly(x,147,160,axis=0) if sr==48000 else x
        if sr not in [44100,48000]:raise ValueError('Unexpected native diagnostic sample rate')
        drums=[];folder.mkdir(parents=True,exist_ok=True)
        print('REFINE REAL DRUMS',index+1,flush=True)
        if reusable:
            separated,separated_sr=sf.read(path,dtype='float32',always_2d=True)
            if separated_sr!=44100:raise ValueError('Unexpected cached drum sample rate')
        else:
            if model is None:model=get_model('htdemucs')
            for channel in range(2):
                wav=torch.from_numpy(np.tile(x[:,channel],(2,1)).astype('float32'));ref=wav.mean(0);mean,std=ref.mean(),ref.std()
                if float(std)<1e-8:raise ValueError('Silent actual diagnostic deck')
                torch.manual_seed(0)
                with torch.inference_mode():
                    stems=(apply_model(model,(wav-mean)[None]/std,device=device,shifts=0,split=True,overlap=.25,progress=False)[0]*std+mean).cpu().numpy()
                voice=stems[model.sources.index('drums')]
                if rhythm:voice=voice+stems[model.sources.index('bass')]
                drums.append(voice.mean(axis=0))
                if device=='mps':torch.mps.empty_cache()
            separated=np.column_stack(drums);sf.write(path,separated,44100,subtype='FLOAT')
        candidates=[]
        for band in [(150,1000),(300,2000)]:
            try:
                check=check_window(separated,44100,join['incoming_bpm'],design['handover_seconds']-design['mix_start_seconds'],len(separated)/44100-1/44100,design.get('variable_beat_times'),band)
                check['attack_band_hz']=list(band);candidates.append(check)
            except ValueError as error:candidates.append({'status':'failed','reason':str(error),'attack_band_hz':list(band)})
        result=next((v for v in candidates if v['status']=='checked'),candidates[0])
        result['alternative_attack_screens']=[v for v in candidates if v is not result]
        result.update(method='Independent per-deck Demucs '+binding['component']+' from actual native audio; coverage/support, 25ms common-phase jitter, 15ms interdeck and handover gates; absolute grid residuals retained',
                      native_drum_sha256=digest(path),model_weight_sha256=binding['weight_sha256'],human_verified=False)
        write_json(target,{'binding':binding,'check':result,'full_mix_screen':deepcopy(design['realized_timing'])})
        design['full_mix_attack_screen']=design['realized_timing'];design['realized_timing']=result
        write_json(report_path,report);checked+=1
        print('DRUM RESULT',index+1,result['status'],result.get('peak_p95_error_ms'),result.get('interdeck_phase_difference_ms'),flush=True)
    return checked


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--mix-plan',type=Path,required=True);p.add_argument('--diagnostics',type=Path,nargs='+',required=True);p.add_argument('--output',type=Path,required=True)
    p.add_argument('--limit',type=int,default=6);p.add_argument('--supervise',action='store_true');p.add_argument('--rhythm',action='store_true');a=p.parse_args()
    if a.supervise:
        a.output.mkdir(parents=True,exist_ok=True)
        for n in range(40):
            before=digest(a.mix_plan)
            with (a.output/f'batch-{n:02d}.log').open('w') as log:
                subprocess.run([sys.executable,str(Path(__file__).resolve()),'--mix-plan',str(a.mix_plan),'--diagnostics',*[str(p) for p in a.diagnostics],'--output',str(a.output),'--limit',str(a.limit)]+(['--rhythm'] if a.rhythm else []),stdout=log,stderr=subprocess.STDOUT,check=True)
            print('NATIVE DRUM BATCH',n,flush=True)
            if digest(a.mix_plan)==before:break
    else:refine(a.mix_plan.resolve(),[p.resolve() for p in a.diagnostics],a.output.resolve(),a.limit,a.rhythm)
