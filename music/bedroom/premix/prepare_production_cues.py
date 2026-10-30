#!/usr/bin/env python3
"""Bounded stem/cue preparation for the approved whole-programme revision."""
import argparse
from importlib.metadata import version
import json
from pathlib import Path
import subprocess
import sys

from analyze_audio import digest,write_json
from drum_cues import attack_phase
from prepare import DEFAULT_DB,approved_pool,host_rows,file_key
from prepare_drum_grids import fit_cues
from production_cues import select_body,select_cycle

BASE=Path(__file__).resolve().parent
VERSION='single-lead-cues-2'
IMPLEMENTATION_HASHES={name:digest(BASE/name) for name in ['prepare_production_cues.py','production_cues.py','drum_cues.py','prepare_drum_grids.py']}


def reusable(record,binding):
    if record.get('binding')==binding:return True
    old=record.get('binding',{})
    compatible=record.get('status')=='prepared' and old.get('version')=='single-lead-cues-1' and 'phrase' in record.get('body',{})
    if not compatible:return False
    if any(old.get(k)!=binding.get(k) for k in ['source_sha256','weight_sha256','packages','device']):return False
    return all(Path(part['path']).is_file() and digest(Path(part['path']))==part['sha256'] for part in record.get('parts',[])) and len(record.get('parts',[]))==2


def worker(state,limit):
    import numpy as np
    import soundfile as sf
    import torch
    from demucs.apply import apply_model
    from demucs.pretrained import get_model
    torch.hub.set_dir(str(BASE/'.local/ml-models/hub'));torch.set_num_threads(3)
    device='mps' if torch.backends.mps.is_available() else 'cpu'
    if device=='mps':torch.mps.set_per_process_memory_fraction(.5)
    model=get_model('htdemucs');weight=next((BASE/'.local/ml-models/hub/checkpoints').glob('955717e8-*.th'))
    allowed,_=approved_pool(host_rows(DEFAULT_DB));allowed={t['id'] for t in allowed}
    tracks=json.loads((state/'final-plan/inputs/analysis.json').read_text())['tracks']
    evidence={t['id']:t for t in json.loads((state/'final-plan/inputs/intelligence.json').read_text())['tracks']}
    # Work on previously constant-grid-qualified sources. A local cue alone does
    # not rescue a previously rejected full-source clock.
    tracks=[t for t in tracks if t['id'] in allowed and t['grid']['usable_constant_grid']]
    tracks.sort(key=lambda t:(t['id'] not in ['hollow-02-005','spotify:track:2qVqEzl038sc3Br5pp9b8K'],t['id']))
    count=0
    for t in tracks:
        folder=state/'revision-08/cues'/file_key(t['id']);target=folder/'cue.json'
        binding={'version':VERSION,'source_sha256':t['sha256'],'weight_sha256':digest(weight),
                 'packages':{p:version(p) for p in ['torch','torchaudio','demucs','numpy','soundfile']},'device':device,
                 'implementation_sha256':IMPLEMENTATION_HASHES}
        if target.exists() and reusable(json.loads(target.read_text()),binding):continue
        if digest(Path(t['path']))!=t['sha256']:raise ValueError('Source changed before cue preparation')
        print('PREPARE CUES',t['id'],t['title'],flush=True)
        profile=None;grid=None
        try:
            sr=model.samplerate
            raw=subprocess.check_output(['ffmpeg','-v','error','-i',t['path'],'-af',f'atrim=end_sample={t["analysis_pcm_frames"]}',
                                         '-ar',str(sr),'-ac','2','-f','f32le','-'])
            y=np.frombuffer(raw,'<f4').reshape(-1,2).copy();duration=len(y)/sr
            windows=[(0,duration)] if duration<=150 else [(0,75),(duration-75,duration)]
            separated=[];local_cues=[]
            for start,end in windows:
                wav=torch.from_numpy(y[round(start*sr):round(end*sr)].T.copy());ref=wav.mean(0);mean,std=ref.mean(),ref.std()
                if float(std)<1e-8:raise ValueError('Silent cue window')
                torch.manual_seed(0)
                with torch.inference_mode():
                    values=(apply_model(model,(wav-mean)[None]/std,device=device,shifts=0,split=True,overlap=.25,progress=False)[0]*std+mean).cpu().numpy()
                stems={name:v.T for name,v in zip(model.sources,values)};separated.append((start,end,stems))
                cue_options=[]
                for offset in range(2,max(3,int(end-start)-20),10):
                    stop=min(end-start-2,offset+24)
                    if stop-offset<12:continue
                    try:cue=attack_phase(stems['drums'][round(offset*sr):round(stop*sr)],sr,t['bpm'],start+offset,include_events=True)
                    except ValueError:continue
                    neural=np.asarray(evidence[t['id']]['rhythm']['beats_seconds']);neural=neural[(neural>=start+offset)&(neural<start+stop)]
                    period=60/t['bpm'];support=float(np.mean(np.abs((neural-cue['phase_seconds']+period/2)%period-period/2)<=.04)) if len(neural)>=16 else 0
                    if cue['weighted_support']<.35 or cue['attack_coverage']<.35:continue
                    if support<.7 and cue['weighted_support']<.7:continue
                    cue.update(source_seconds=[start+offset,start+stop],neural_beat_agreement=support)
                    cue_options.append((cue['weighted_support']+.3*support,cue))
                if not cue_options:raise ValueError('No coherent local drum window')
                local_cues.append(max(cue_options,key=lambda x:x[0])[1])
                if device=='mps':torch.mps.empty_cache()
            if len(local_cues)==1:
                # Short tracks still need separated timing regions, not two
                # copies of the exact same evidence.
                start,end,stems=separated[0];half=duration/2
                local_cues=[attack_phase(stems['drums'][round(a*sr):round(b*sr)],sr,t['bpm'],a,include_events=True) for a,b in [(2,half),(half,duration-2)]]
                if any(c['weighted_support']<.35 or c['attack_coverage']<.35 for c in local_cues):raise ValueError('Short source has insufficient independent drum cues')
            grid=fit_cues(t,local_cues);p=60/grid['bpm'];profile={'times':[],'drums_db':[],'bass_db':[],'lead_db':[]}
            for start,end,stems in separated:
                n0=int(np.ceil((start-grid['phase_seconds'])/p));n1=int(np.floor((end-grid['phase_seconds'])/p))
                for n in range(n0,n1):
                    a=grid['phase_seconds']+n*p;b=a+p;lo=round((a-start)*sr);hi=round((b-start)*sr)
                    profile['times'].append(a)
                    for key,signal in [('drums_db',stems['drums']),('bass_db',stems['bass']),('lead_db',stems['other']+stems['vocals'])]:
                        profile[key].append(float(10*np.log10(max(1e-12,np.mean(signal[lo:hi]**2)))))
            downs=np.asarray(evidence[t['id']]['rhythm']['downbeats_seconds'])
            classes=np.rint((downs-grid['phase_seconds'])/p).astype(int)%4
            counts=np.bincount(classes,minlength=4)
            bar_class=int(np.argmax(counts)) if len(classes) else 0
            grid['bar_class']=bar_class;grid['model_bar_class_support']=float(max(counts)/sum(counts)) if sum(counts) else 0
            grid['bar_phase_note']='Provisional dominant model bar class checked against local physical attacks; source sections inferred'
            body=select_body(profile,grid['phase_seconds'],grid['bpm'],duration,bar_class)
            start,end,stems=separated[0];cycle=select_cycle(stems['drums'],sr,grid,start,body['start'])
            source_parts=[]
            for label,a,b in [('intro',cycle['start'],cycle['end']),('outro',body['body_end'],body['end'])]:
                window=next((w for w in separated if w[0]<=a-.02 and w[1]>=b+.02),None)
                if window is None:raise ValueError('Selected source cue lacks a complete separated window')
                ws,we,ss=window;lo=round((a-ws-.02)*sr);hi=round((b-ws+.02)*sr)
                path=folder/(label+'-drums.flac');path.parent.mkdir(parents=True,exist_ok=True)
                sf.write(path,ss['drums'][lo:hi],sr,subtype='PCM_24')
                source_parts.append({'role':label,'path':str(path.resolve()),'sha256':digest(path),
                    'source_start':ws+lo/sr,'offset':a-(ws+lo/sr),'start':a,'end':b,'samplerate':sr,
                    'note':'Drums stem only; original vocal/other/bass not included'})
            if digest(Path(t['path']))!=t['sha256']:raise ValueError('Source changed during cue preparation')
            for c in local_cues:c.pop('events_seconds',None);c.pop('event_weights',None)
            write_json(target,{'binding':binding,'id':t['id'],'grid':grid,'body':body,'cycle':cycle,
                               'parts':source_parts,'local_cues':local_cues,'profile':profile,'status':'prepared'})
            print('CUES READY',t['id'],round(body['start'],2),round(body['end'],2),flush=True)
        except Exception as error:
            write_json(target,{'binding':binding,'id':t['id'],'status':'needs cue review','error':str(error),'profile':profile,'grid':grid})
            print('CUES REVIEW',t['id'],str(error),flush=True)
        count+=1
        if limit and count>=limit:break


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--state',type=Path,required=True);p.add_argument('--limit',type=int,default=12);p.add_argument('--supervise',action='store_true')
    a=p.parse_args()
    if a.supervise:
        root=a.state/'revision-08';root.mkdir(parents=True,exist_ok=True)
        for n in range(25):
            before={str(p):digest(p) for p in (root/'cues').glob('*/cue.json')}
            with (root/f'cue-batch-{n:02d}.log').open('w') as log:
                subprocess.run([sys.executable,str(Path(__file__).resolve()),'--state',str(a.state),'--limit',str(a.limit)],stdout=log,stderr=subprocess.STDOUT,check=True)
            after={str(p):digest(p) for p in (root/'cues').glob('*/cue.json')};print('PRODUCTION CUE BATCH',n,len(after),flush=True)
            if after==before:break
    else:worker(a.state.resolve(),a.limit)
