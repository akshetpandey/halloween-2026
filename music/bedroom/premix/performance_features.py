"""Occasional source-authored features around the clean single-lead compiler."""
from copy import deepcopy
import json
from pathlib import Path
import subprocess

from actual_audition import source_time
from analyze_audio import digest,write_json
from audit_single_lead import crop_clip
from dj_performance_fx import check_repeat_clock,echo_tail,spectral_sweep,tightening_roll
from performance_showcase import effect_gain
from prepare import file_key
from reaper_proof import clip,save_plan
from render_set import measure,render_native
from research_audition import BASE,eq,points


def select(result,tracks,evidence):
    by={t['id']:t for t in tracks};selected=[];last={};next_at={};types=['roll_filter_drop','echo_release','call_response_fill','hook_tease_drop']
    bridges=[j['arrangement_design']['handover_seconds'] for j in result['joins'] if j['kind']=='percussion_tempo_bridge']
    count=0
    for index,join in enumerate(result['joins']):
        a,b=result['details'][index:index+2];role=b['programme_role'];now=join.get('arrangement_design',{}).get('handover_seconds',0)
        if role not in next_at:next_at[role]=b['main_start_seconds']+18*60
        if join['kind']!='single_lead_bass_swap' or now<next_at[role]:continue
        if any(abs(now-t)<240 for t in bridges):continue
        kind=types[count%len(types)];body_start=b['ranges'][0][0];p=60/b['source_bpm']
        vocal=evidence[b['id']].get('vocals',{}).get('candidate_vocal_regions',[])
        overlap=sum(max(0,min(region[1],body_start+16*p)-max(region[0],body_start)) for region in vocal)
        if kind=='hook_tease_drop' and (overlap<1.5 or body_start<p):
            if now<next_at[role]+180:continue
            kind='call_response_fill'
        if a['main_end_seconds']-a['main_start_seconds']<90:continue
        selected.append({'index':index,'kind':kind,'at_seconds':now,'bpm':join['incoming_bpm'],
                         'incoming_id':b['id'],'outgoing_id':a['id'],'vocal_candidate_seconds':overlap})
        next_at[role]=now+(18+int(by[b['id']]['sha256'][:2],16)%8)*60;last[role]=now;count+=1
    return selected


def apply(result,tracks,cues,evidence,output,validator):
    import numpy as np
    import soundfile as sf
    selected=select(result,tracks,evidence)
    if not selected:return []
    output.mkdir(parents=True,exist_ok=True);by={t['id']:t for t in tracks};raw_defs=[];position=0;model=None;device=None
    def hook_file(ident,start,end):
        nonlocal model,device
        import torch
        from demucs.apply import apply_model
        from demucs.pretrained import get_model
        path=output/(file_key(ident)+'-hook.wav');record_path=path.with_suffix('.json');track=by[ident]
        binding={'source_sha256':track['sha256'],'source_seconds':[start,end],'model':'htdemucs','shifts':0,
                 'weight_sha256':digest(next((BASE/'.local/ml-models/hub/checkpoints').glob('955717e8-*.th')))}
        if path.exists() and record_path.exists():
            record=json.loads(record_path.read_text())
            if record['binding']==binding and digest(path)==record['sha256']:return path
        if model is None:
            torch.hub.set_dir(str(BASE/'.local/ml-models/hub'));torch.set_num_threads(3)
            device='mps' if torch.backends.mps.is_available() else 'cpu'
            if device=='mps':torch.mps.set_per_process_memory_fraction(.4)
            model=get_model('htdemucs')
        sr=model.samplerate;lo=max(0,start-5);hi=end+5
        raw=subprocess.check_output(['ffmpeg','-v','error','-nostdin','-i',track['path'],'-af',f'atrim=start={lo}:end={hi}',
                                     '-ar',str(sr),'-ac','2','-f','f32le','-'])
        signal=np.frombuffer(raw,'<f4').reshape(-1,2).copy();wav=torch.from_numpy(signal.T);ref=wav.mean(0);mean,std=ref.mean(),ref.std()
        torch.manual_seed(0)
        with torch.inference_mode():
            stems=(apply_model(model,(wav-mean)[None]/std,device=device,shifts=0,split=True,overlap=.25,progress=False)[0]*std+mean).cpu().numpy()
        voice=stems[model.sources.index('vocals')].T[round((start-lo)*sr):round((end-lo)*sr)]
        sf.write(path,voice,sr,subtype='FLOAT');write_json(record_path,{'binding':binding,'sha256':digest(path)})
        if device=='mps':torch.mps.empty_cache()
        return path
    for feature in selected:
        index=feature['index'];a,b=result['details'][index:index+2];beat=60/feature['bpm'];kind=feature['kind']
        owner=a if kind=='echo_release' else b;role='intro'
        part=next(p for p in cues[owner['id']]['parts'] if p['role']==role)
        source_bpm=owner['source_bpm'];source=part['offset']+60/source_bpm;rate=feature['bpm']/source_bpm
        length=(1 if kind=='echo_release' else 16)*beat
        if kind=='roll_filter_drop' or kind=='hook_tease_drop':
            events=tightening_roll(feature['bpm'])
        elif kind=='call_response_fill':
            events=[{'time':(bar*4+at)*beat,'beats':size} for bar in range(4) for at,size in [(0,.5),(1.5,.5),(2.5,.25),(3.25,.25)]]
        else:events=[{'time':0,'beats':1}]
        raw_defs.append({'name':f'Feature {index+1} · {kind}','path':part['path'],'sha256':part['sha256'],'gain_db':0,
                         'clips':[clip(source,source+e['beats']*60/source_bpm,position+e['time'],rate,.001,.001) for e in events]})
        feature.update(raw_start=position,raw_length=length,raw_owner=owner['id'],source_drum_sha256=part['sha256'],events=events)
        position+=length+.5
        if kind=='hook_tease_drop':
            start=cues[b['id']]['body']['start']-60/b['source_bpm'];end=start+17*60/b['source_bpm']
            path=hook_file(b['id'],start,end)
            raw_defs.append({'name':f'Feature {index+1} · incoming hook','path':str(path),'sha256':digest(path),'gain_db':0,
                             'clips':[clip(0,end-start,position,feature['bpm']/b['source_bpm'])]})
            feature.update(hook_start=position,hook_length=17*beat,hook_source_sha256=digest(path),hook_source_seconds=[start,end])
            position+=17*beat+.5
    plan=save_plan(output/'raw-native','feature-print',raw_defs,position,[],master_db=-12,
                   purpose='Source-bound occasional DJ feature layers; no hardware output')
    def raw_validator():
        validator()
        if any(digest(Path(d['path']))!=d['sha256'] for d in raw_defs):raise ValueError('Feature print input changed')
    wave,readback=render_native(plan,output/'raw-native',Path('/Applications/REAPER.app/Contents/MacOS/REAPER'),BASE/'.local/reaper-resource/reaper.ini',raw_validator)
    raw,sr=sf.read(wave,dtype='float32',always_2d=True)
    if np.max(abs(raw))>.999:raise ValueError('Feature print clipped')
    raw*=10**(12/20)
    def register(feature,name,signal,at,owner,gain=None,volume=None):
        path=output/(f'join-{feature["index"]+1:03d}-'+name+'.wav');sf.write(path,signal,sr,subtype='FLOAT')
        sha=digest(path);meters=measure(path);gain=effect_gain(meters,-18) if gain is None else gain
        result['definitions'].append({'name':f'Featured {feature["index"]+1} · '+name,'path':str(path),'sha256':sha,'gain_db':gain,
                                      'clips':[clip(0,len(signal)/sr,at)],'volume':points(volume or [(0,1)],'amplitude')})
        result['native_source_bindings'].append({'parent_id':owner['id'],'parent_sha256':owner['source_sha256'],'sha256':sha,'kind':'effect'})
        cues[owner['id']]['parts'].append({'role':'effect-'+name,'path':str(path),'sha256':sha,'format':'WAV_FLOAT',
                                         'recipe':{'kind':feature['kind'],'source_drum_sha256':feature['source_drum_sha256'],
                                                   'hook_source_sha256':feature.get('hook_source_sha256'),'bpm':feature['bpm']}})
        feature.setdefault('prints',[]).append({'name':name,'sha256':sha,'gain_db':gain,'meters':meters,'at_seconds':at})
        return gain
    for f in selected:
        i=f['index'];a,b=result['details'][i:i+2];join=result['joins'][i];beat=60/f['bpm'];at=f['at_seconds'];kind=f['kind']
        signal=raw[round(f['raw_start']*sr):round((f['raw_start']+f['raw_length'])*sr)]
        if kind in ['roll_filter_drop','hook_tease_drop']:
            check=check_repeat_clock(signal,sr,f['bpm'])
            if check['status']!='checked':raise ValueError('Actual feature roll clock failed')
            f['repeat_timing']=check;swept=spectral_sweep(signal,sr,400,2200,8000)
            gain=register(f,'tightening-roll',swept,at-16*beat,b,volume=[(0,.55),(at-16*beat,.55),(at-beat,1),(at,1)])
            tail=echo_tail(swept[-round(beat*sr):],sr,f['bpm'],3,.4)
            register(f,'percussion-echo',tail,at-beat,b,gain-7)
        elif kind=='call_response_fill':
            swept=spectral_sweep(signal,sr,550,1600,7000)
            register(f,'call-response-fill',swept,at-16*beat,b)
        else:
            tail=echo_tail(spectral_sweep(signal,sr,350,350,5000),sr,f['bpm'],3,.45)
            register(f,'echo-release',tail,at-beat,a)
            # Let the echo have space by exiting the ordinary dry tail early.
            for n in a['native_component_indices']:
                definition=result['definitions'][n]
                if definition['name'].endswith('outgoing drum tail'):
                    definition['volume']=points([(0,.7),(at,.7),(at+4*beat,0)],'amplitude')
        if kind=='hook_tease_drop':
            clear=at-32*beat
            for n in a['native_component_indices']:
                d=result['definitions'][n]
                if result['native_source_bindings'][n]['kind']!='original':continue
                before=deepcopy(d['clips'][0]);new=crop_clip(before,before['position'],clear,before['position']);d['clips']=[new]
                a['ranges'][-1][1]=source_time(before,clear)
            result['fresh_seconds']-=32*beat
            part=next(p for p in cues[a['id']]['parts'] if p['role']=='intro')
            result['definitions'].append({'name':f'Feature {i+1} · percussion under hook','path':part['path'],'sha256':part['sha256'],
                'gain_db':a['gain_db'],'clips':[clip(part['offset'],part['offset']+16*60/a['source_bpm'],clear+n*16*beat,f['bpm']/a['source_bpm']) for n in range(2)],
                'eq_bands':eq([(0,0),(at-beat-.01,0),(at-beat,-24)],[(0,-3)],[(0,-3)])})
            result['native_source_bindings'].append({'parent_id':a['id'],'parent_sha256':a['source_sha256'],'sha256':part['sha256'],'kind':'drums'})
            hook=raw[round(f['hook_start']*sr):round((f['hook_start']+f['hook_length'])*sr)]
            hg=register(f,'hook-tease',hook,at-29*beat,b,effect_gain(measure(output/(file_key(b['id'])+'-hook.wav')),-16))
            tail=echo_tail(spectral_sweep(hook[-round(beat*sr):],sr,250,250,4000),sr,f['bpm'],3,.45)
            register(f,'hook-echo',tail,at-13*beat,b,hg-6)
            join['arrangement_design']['lead_schedule']=[{'start_beat':0,'end_beat':64,'primary':'incoming',
                'supporting_audio':'Outgoing full musical lead clears eight bars early; own isolated drums beneath incoming hook/echo, then incoming original drop'}]
            join['arrangement_design']['phrase_cues'][0]['source_seconds']=a['ranges'][-1][1]
            f['outgoing_lead_clears_seconds']=clear
        if kind in ['roll_filter_drop','call_response_fill']:
            for n in a['native_component_indices']:
                d=result['definitions'][n]
                if result['native_source_bindings'][n]['kind']=='original':
                    d['eq_bands'][0]['points']=points([(0,0),(at-beat-.01,0),(at-beat,-24),(at,-24)])
        public={k:v for k,v in f.items() if k not in ['raw_start','raw_length','hook_start','hook_length','events']}
        join['arrangement_design']['performance']=public
        result['markers'].append({'time':at,'name':'FEATURE · '+kind})
    write_json(output/'feature-report.json',{'selected':selected,'native_print_readback':readback,'raw_sha256':digest(wave),
                                            'technical_only':True,'physical_playback_tested':False})
    return selected
