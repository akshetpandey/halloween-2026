#!/usr/bin/env python3
"""Create the two source-bound cue windows used by research_audition.py."""
import argparse
from importlib.metadata import version
import json
from pathlib import Path
import subprocess

from analyze_audio import digest,write_json
from prepare import DEFAULT_DB,approved_pool,host_rows,file_key

BASE=Path(__file__).resolve().parent
WINDOWS=[('hollow-02-005',300,380),('spotify:track:2qVqEzl038sc3Br5pp9b8K',0,65)]


def prepare(state):
    import numpy as np
    import torch
    import soundfile as sf
    from demucs.apply import apply_model
    from demucs.pretrained import get_model
    torch.hub.set_dir(str(BASE/'.local/ml-models/hub'));torch.set_num_threads(3)
    device='mps' if torch.backends.mps.is_available() else 'cpu'
    if device=='mps':torch.mps.set_per_process_memory_fraction(.45)
    model=get_model('htdemucs')
    weight=next((BASE/'.local/ml-models/hub/checkpoints').glob('955717e8-*.th'))
    allowed,_=approved_pool(host_rows(DEFAULT_DB));allowed={t['id'] for t in allowed}
    tracks=json.loads((state/'final-plan/inputs/analysis.json').read_text())['tracks']
    for ident,start,end in WINDOWS:
        if ident not in allowed:raise ValueError('Cue source is no longer approved')
        t=next(x for x in tracks if x['id']==ident)
        folder=state/'revision-07/cue-stems'/file_key(ident);folder.mkdir(parents=True,exist_ok=True)
        binding={'source_sha256':t['sha256'],'start':start,'end':end,'model':'htdemucs',
                 'shifts':0,'samplerate':model.samplerate,'weight_sha256':digest(weight),
                 'packages':{p:version(p) for p in ['torch','torchaudio','demucs','numpy','soundfile']},'device':device}
        if digest(Path(t['path']))!=t['sha256']:raise ValueError('Source changed before separation')
        old=json.loads((folder/'binding.json').read_text()) if (folder/'binding.json').exists() else {}
        if old.get('analysis')==binding and all(digest(folder/(name+'.flac'))==sha for name,sha in old.get('stem_sha256',{}).items()) and len(old.get('stem_sha256',{}))==4:
            continue
        raw=subprocess.check_output(['ffmpeg','-v','error','-i',t['path'],'-af',f'atrim=start={start}:end={end}',
            '-ar',str(model.samplerate),'-ac','2','-f','f32le','-'])
        signal=np.frombuffer(raw,'<f4').reshape(-1,2).copy();wav=torch.from_numpy(signal.T)
        ref=wav.mean(0);mean,std=ref.mean(),ref.std()
        if float(std)<1e-8:raise ValueError('Silent source window')
        torch.manual_seed(0);print('CUE SEPARATION',t['title'],start,end,flush=True)
        with torch.inference_mode():
            separated=apply_model(model,(wav-mean)[None]/std,device=device,shifts=0,split=True,overlap=.25,progress=False)[0]*std+mean
        hashes={}
        for name,channel in zip(model.sources,separated.cpu().numpy()):
            path=folder/(name+'.flac');sf.write(path,channel.T,model.samplerate,subtype='PCM_24');hashes[name]=digest(path)
        if digest(Path(t['path']))!=t['sha256']:raise ValueError('Source changed during separation')
        write_json(folder/'binding.json',{'analysis':binding,'stem_sha256':hashes})
        if device=='mps':torch.mps.empty_cache()


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--state',type=Path,required=True)
    a=p.parse_args();prepare(a.state.resolve())
