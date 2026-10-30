#!/usr/bin/env python3
"""Inspect later source entries missed by the original first-75-second window."""
import argparse
from copy import deepcopy
import json
from pathlib import Path
import subprocess
import sys

from analyze_audio import digest,write_json
from prepare import file_key
from prepare_final_cues import BASE,low_profile,recover_body
from production_cues import select_cycle


def prepare(state,output,ids):
    import numpy as np
    import torch
    from demucs.apply import apply_model
    from demucs.pretrained import get_model
    torch.hub.set_dir(str(BASE/'.local/ml-models/hub'));torch.set_num_threads(3)
    device='mps' if torch.backends.mps.is_available() else 'cpu'
    if device=='mps':torch.mps.set_per_process_memory_fraction(.45)
    model=get_model('htdemucs');sr=model.samplerate
    analysis=json.loads((state/'final-plan/inputs/analysis.json').read_text());selected=[t for t in analysis['tracks'] if t['id'] in ids]
    inputs=output/'state/final-plan/inputs';inputs.mkdir(parents=True,exist_ok=True)
    write_json(inputs/'analysis.json',{**analysis,'tracks':selected})
    for t in selected:
        old=json.loads((state/'revision-08/cues'/file_key(t['id'])/'cue.json').read_text());grid=deepcopy(old['grid'])
        if not grid:raise ValueError('Late-entry inspection cannot rescue an unresolved source clock')
        if digest(Path(t['path']))!=t['sha256']:raise ValueError('Source changed')
        start,end=60,min(150,t['duration_seconds']-.1)
        raw=subprocess.check_output(['ffmpeg','-v','error','-nostdin','-i',t['path'],'-af',f'atrim=start={start}:end={end}','-ar',str(sr),'-ac','2','-f','f32le','-'])
        signal=np.frombuffer(raw,'<f4').reshape(-1,2).copy();wav=torch.from_numpy(signal.T);ref=wav.mean(0);mean,std=ref.mean(),ref.std()
        torch.manual_seed(0);print('LATE ENTRY',t['id'],t['title'],flush=True)
        with torch.inference_mode():
            values=(apply_model(model,(wav-mean)[None]/std,device=device,shifts=0,split=True,overlap=.25,progress=False)[0]*std+mean).cpu().numpy()
        stems={name:v.T for name,v in zip(model.sources,values)};p=60/grid['bpm'];samples={}
        for n in range(int(np.ceil((start-grid['phase_seconds'])/p)),int(np.floor((end-grid['phase_seconds'])/p))):
            a=grid['phase_seconds']+n*p;lo=round((a-start)*sr);hi=round((a+p-start)*sr)
            samples[n]=[a]+[float(10*np.log10(max(1e-12,np.mean(v[lo:hi]**2)))) for v in [stems['drums'],stems['bass'],stems['other']+stems['vocals']]]
        for index,a in enumerate(old['profile']['times']):
            if a<end:continue
            samples[round((a-grid['phase_seconds'])/p)]=[a]+[old['profile'][k][index] for k in ['drums_db','bass_db','lead_db']]
        rows=[samples[n] for n in sorted(samples)];profile={k:[r[i] for r in rows] for i,k in enumerate(['times','drums_db','bass_db','lead_db'])}
        lt,ld=low_profile(t,grid);shifted=deepcopy(profile);shifted['times']=[v-start for v in profile['times']]
        relative={**grid,'phase_seconds':grid['phase_seconds']-start}
        keep=lt>=start
        body=recover_body(shifted,relative,lt[keep]-start,ld[keep],t['duration_seconds']-start)
        for key in ['start','body_end','end']:body[key]+=start
        for key in ['first_main_seconds','last_main_seconds']:body['evidence'][key]+=start
        cycle=select_cycle(stems['drums'],sr,grid,start,body['start'])
        record={**old,'body':body,'cycle':cycle,'status':'prepared','profile':profile,
                'late_entry_evidence':{'window_seconds':[start,end],'source_sha256':t['sha256'],'method':'Additional isolated local model window; original full-source clock retained'}}
        target=output/'state/revision-08/cues'/file_key(t['id'])/'cue.json';write_json(target,record)
        print('LATE READY',t['id'],round(body['start'],2),round((body['body_end']-body['start'])/60,2),flush=True)
        if device=='mps':torch.mps.empty_cache()


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--state',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--ids',nargs='+',required=True)
    a=p.parse_args();prepare(a.state.resolve(),a.output.resolve(),a.ids)
