#!/usr/bin/env python3
"""Independent drum-cue grids for approved recordings; retain evidence, not stems."""
import argparse
from importlib.metadata import version
import json
from pathlib import Path
import subprocess
import sys

from analyze_audio import digest,write_json
from drum_cues import attack_phase
from prepare import DEFAULT_DB,approved_pool,file_key,host_rows

BASE=Path(__file__).resolve().parent
VERSION='drum-cue-grid-1'


def fit_cues(track,cues):
    import numpy as np
    times=np.asarray([x for cue in cues for x in cue['events_seconds']]);weights=np.asarray([x for cue in cues for x in cue['event_weights']])
    if len(times)<16 or len(times)!=len(weights) or not np.all(np.isfinite(times)) or not np.all(np.isfinite(weights)) or np.any(weights<=0):
        raise ValueError('Insufficient finite weighted drum events')
    period=60/track['bpm'];phase=cues[0]['phase_seconds'];numbers=np.rint((times-phase)/period)
    if np.ptp(numbers)<16:raise ValueError('Insufficient cue span')
    slope,intercept=np.polyfit(numbers,times,1,w=weights)
    residual=times-(intercept+numbers*slope);p95=float(np.percentile(np.abs(residual),95))
    bpm=60/slope
    if abs(bpm-track['bpm'])/track['bpm']>.003 or p95>.025:
        raise ValueError('Drum cue timing is inconsistent across the recording')
    return {'bpm':float(bpm),'phase_seconds':float(intercept%slope),'period_seconds':float(slope),
            'residual_p95_ms':p95*1000,'source_prior_bpm':track['bpm'],
            'method':'Weighted local drum attacks at two source regions; constant timing remains an assumption between measured cues',
            'human_verified':False,'downbeat_verified':False}


def worker(state,limit):
    import numpy as np
    import torch
    from demucs.apply import apply_model
    from demucs.pretrained import get_model
    torch.hub.set_dir(str(BASE/'.local/ml-models/hub'));torch.set_num_threads(4)
    device='mps' if torch.backends.mps.is_available() else 'cpu'
    if device=='mps':torch.mps.set_per_process_memory_fraction(.6)
    model=get_model('htdemucs')
    approved,_=approved_pool(host_rows(DEFAULT_DB));allowed={t['id']:t for t in approved}
    tracks=json.loads((state/'final-plan/inputs/analysis.json').read_text())['tracks']
    tracks.sort(key=lambda t:(t['grid']['usable_constant_grid'],t['id']))
    folder=state/'revision-06/drum-grids';count=0
    weight=next((BASE/'.local/ml-models/hub/checkpoints').glob('955717e8-*.th'))
    weight_sha=digest(weight)
    for t in tracks:
        if t['id'] not in allowed:continue
        target=folder/(file_key(t['id'])+'.json')
        binding={'version':VERSION,'source_sha256':t['sha256'],'weight_sha256':weight_sha,
                 'packages':{p:version(p) for p in ['demucs','torch','torchaudio','numpy']},'device':device}
        if target.exists() and json.loads(target.read_text()).get('binding')==binding:continue
        if digest(Path(t['path']))!=t['sha256']:raise ValueError('Source changed before cue analysis')
        print('DRUM GRID',t['id'],t['title'],flush=True)
        try:
            raw=subprocess.check_output(['ffmpeg','-v','error','-i',t['path'],'-af',f'atrim=end_sample={t["analysis_pcm_frames"]}',
                                         '-ar',str(model.samplerate),'-ac','2','-f','f32le','-'])
            signal=np.frombuffer(raw,'<f4').reshape(-1,2).copy();sr=model.samplerate;duration=len(signal)/sr
            windows=[(0,duration)] if duration<=130 else [(0,65),(duration-65,duration)]
            cues=[]
            for start,end in windows:
                wav=torch.from_numpy(signal[round(start*sr):round(end*sr)].T.copy());ref=wav.mean(0);mean,std=ref.mean(),ref.std()
                if float(std)<1e-8:raise ValueError('Silent drum cue window')
                torch.manual_seed(0)
                with torch.inference_mode():
                    stems=apply_model(model,(wav-mean)[None]/std,device=device,shifts=0,split=True,overlap=.25,progress=False)[0]*std+mean
                drums=stems[model.sources.index('drums')].cpu().numpy().T
                # Discard separation edges; two independent halves for short sources.
                slices=[(2,min(end-start-2,63))] if len(windows)>1 else [(2,duration/2),(duration/2,duration-2)]
                for a,b in slices:
                    cue=attack_phase(drums[round(a*sr):round(b*sr)],sr,t['bpm'],start+a,include_events=True)
                    threshold=.25 if 'drum' in allowed[t['id']].get('lane','').lower() else .5
                    if cue['weighted_support']<.6 or cue['attack_coverage']<threshold:raise ValueError('Insufficient coherent drum-cue coverage')
                    cue['source_seconds']=[start+a,start+b];cues.append(cue)
                if device=='mps':torch.mps.empty_cache()
            grid=fit_cues(t,cues)
            if digest(Path(t['path']))!=t['sha256']:raise ValueError('Source changed during cue analysis')
            write_json(target,{'binding':binding,'id':t['id'],'grid':grid,'cues':cues,'status':'cue timing available'})
            print('DRUM GRID READY',t['id'],round(grid['bpm'],4),round(grid['residual_p95_ms'],2),flush=True)
        except Exception as error:
            write_json(target,{'binding':binding,'id':t['id'],'status':'needs cue review','error':str(error)})
            print('DRUM GRID REVIEW',t['id'],str(error),flush=True)
        count+=1
        if limit and count>=limit:break


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--state',type=Path,required=True);p.add_argument('--limit',type=int,default=12);p.add_argument('--supervise',action='store_true')
    a=p.parse_args()
    if a.supervise:
        folder=a.state/'revision-06/drum-grids'
        for n in range(30):
            before=len(list(folder.glob('*.json'))) if folder.exists() else 0
            with (a.state/'revision-06'/f'drum-grid-batch-{n:02d}.log').open('w') as log:
                subprocess.run([sys.executable,str(Path(__file__).resolve()),'--state',str(a.state),'--limit',str(a.limit)],stdout=log,stderr=subprocess.STDOUT,check=True)
            after=len(list(folder.glob('*.json')))
            print('DRUM GRID BATCH',n,'cached',after,flush=True)
            if after==before:break
    else:worker(a.state.resolve(),a.limit)
