#!/usr/bin/env python3
"""Audit realized per-deck rhythm after the actual native clip warps and loops.

Diagnostic copies downmix/pan the two logical decks separately and omit mixer
EQ/faders. They are analysis artifacts, not musical previews or playback files.
"""
import argparse
import copy
import json
from pathlib import Path

from actual_audition import source_time
from analyze_audio import digest,write_json
from plan_mix import validate_current
from prepare import DEFAULT_DB
from reaper_proof import save_plan
from render_set import render_native
from compact_audio import pcm_identity

BASE=Path(__file__).resolve().parent


def crop_clip(clip,start,end,position):
    lo=max(start,clip['position']);hi=min(end,clip['position']+clip['length'])
    if hi<=lo:return None
    at=lambda value:source_time(clip,value) if clip.get('stretch_markers') else clip['source_start']+(value-clip['position'])*clip['rate']
    source_start=at(lo);source_end=at(hi)
    markers=[{'position':0.,'source':source_start}]
    for marker in clip.get('stretch_markers',[]):
        at=clip['position']+marker['position']
        if lo<at<hi:markers.append({'position':at-lo,'source':marker['source']})
    markers.append({'position':hi-lo,'source':source_end})
    return {'position':position+lo-start,'length':hi-lo,'source_start':source_start,'rate':1,
            'fade_in':min(.003,hi-lo),'fade_out':min(.003,hi-lo),'stretch_markers':markers}


def expected_attacks(signal,sr,bpm,start,end):
    """Find actual attacks near the expected grid, without confusing offbeat bass.

    Weight/support and coverage stay explicit; a narrow residual alone is not
    sufficient because it would merely restate the event-selection window.
    """
    import numpy as np
    return mapped_attacks(signal,sr,np.arange(0,len(signal)/sr,60/bpm),start,end)


def mapped_attacks(signal,sr,beat_times,start,end,frequency_band=(150,1000)):
    import numpy as np
    from scipy.ndimage import gaussian_filter1d,uniform_filter1d
    from scipy.signal import butter,find_peaks,sosfiltfilt
    x=np.asarray(signal,float);grid=np.asarray(beat_times,float);period=float(np.min(np.diff(grid)))
    if not 0<=start<end<=len(x)/sr or end-start<max(3,8*period):raise ValueError('Insufficient diagnostic window')
    band=sosfiltfilt(butter(3,frequency_band,fs=sr,btype='bandpass',output='sos'),x)
    envelope=np.sqrt(np.maximum(0,uniform_filter1d(band**2,size=max(1,round(.004*sr)))))
    flux=gaussian_filter1d(np.maximum(0,np.diff(envelope,prepend=envelope[0])),max(1,.001*sr))
    peaks,properties=find_peaks(flux,distance=round(.35*period*sr),prominence=np.quantile(flux,.99)*.2)
    times=peaks/sr;weights=properties['prominences'];within=(times>=start)&(times<end)
    times=times[within];weights=weights[within]
    at=np.searchsorted(grid,times);left=np.clip(at-1,0,len(grid)-1);right=np.clip(at,0,len(grid)-1)
    nearest=np.where(abs(times-grid[left])<=abs(times-grid[right]),left,right);residual=times-grid[nearest]
    selected=np.abs(residual)<=.04
    if np.count_nonzero(selected)<8:raise ValueError('Too few actual quarter-grid attacks')
    errors=residual[selected]*1000
    coverage=len(set(nearest[selected]))/max(1,np.count_nonzero((grid>=start)&(grid<end)))
    support=float(weights[selected].sum()/max(weights.sum(),1e-12))
    return {'median_error_ms':float(np.median(errors)),'p95_error_ms':float(np.percentile(np.abs(errors),95)),
            'attack_coverage':float(coverage),'weighted_support':support,'events':int(sum(selected)),
            '_signed_errors_ms':errors.tolist(),
            'status':'checked' if coverage>=.3 and support>=.15 and np.percentile(np.abs(errors),95)<=25 else 'failed'}


def check_window(signal,sr,bpm,split,end,beat_times=None,frequency_band=(150,1000)):
    import numpy as np
    if beat_times is None:beat_times=np.arange(0,len(signal)/sr,60/bpm)
    measured=[]
    for a,b in [(1,split-.25),(split+1,end-.25)]:
        decks=[mapped_attacks(signal[:,ch],sr,beat_times,a,b,frequency_band) for ch in range(2)]
        difference=abs(decks[0]['median_error_ms']-decks[1]['median_error_ms'])
        # There is no audible external metronome. Compare both decks to one
        # common realized onset phase, allowing a shared timbral attack delay;
        # never independently recenter decks, which could conceal a bad mix.
        common=sum(d['median_error_ms'] for d in decks)/2
        for d in decks:
            errors=np.asarray(d.pop('_signed_errors_ms'))
            d['absolute_grid_p95_ms']=d['p95_error_ms'];d['p95_error_ms']=float(np.percentile(abs(errors-common),95))
            d['status']='checked' if d['attack_coverage']>=.3 and d['weighted_support']>=.15 and d['p95_error_ms']<=25 else 'failed'
        measured.append({'decks':decks,'interdeck_phase_difference_ms':difference,'common_realized_phase_ms':common,'window_seconds':[a,b]})
    handover_difference=abs(measured[0]['decks'][0]['median_error_ms']-measured[1]['decks'][1]['median_error_ms'])
    passed=all(c['status']=='checked' for w in measured for c in w['decks']) and all(w['interdeck_phase_difference_ms']<=15 for w in measured) and handover_difference<=15
    return {'status':'checked' if passed else 'failed','peak_p95_error_ms':max(c['p95_error_ms'] for w in measured for c in w['decks']),
            'interdeck_phase_difference_ms':max(w['interdeck_phase_difference_ms'] for w in measured),'original_handover_phase_difference_ms':handover_difference,'regions':measured,
            'method':'Actual native geometry; independent deck coverage/support, p95 jitter around one common realized phase, interdeck median difference; absolute grid residual also retained',
            'human_verified':False}


def stage_sources(definitions,report,directory):
    import subprocess
    from prepare import file_key
    analysis={t['id']:t for t in json.loads(Path(report['inputs']['analysis']).read_text())['tracks']}
    cache={};records=[];result=[]
    for definition in definitions:
        if definition.get('source_kind')!='original':result.append(definition);continue
        source=Path(definition['path'])
        if source not in cache:
            target=directory/'sources'/(file_key(definition['parent_id'])+'.wav');target.parent.mkdir(parents=True,exist_ok=True)
            subprocess.run(['ffmpeg','-v','error','-nostdin','-y','-i',str(source),'-ar','48000','-ac','2','-c:a','pcm_f32le',str(target)],check=True)
            t=analysis[definition['parent_id']]
            if pcm_identity(target,t['analysis_pcm_frames'])!=(t['analysis_pcm_sha256'],t['analysis_pcm_frames']):raise ValueError('Diagnostic PCM differs from analyzed recording')
            cache[source]={'path':str(target),'sha256':digest(target)}
            records.append({'parent_id':definition['parent_id'],'source_sha256':definition['sha256'],**cache[source],
                            'analyzed_pcm_sha256':t['analysis_pcm_sha256'],'analyzed_frames':t['analysis_pcm_frames']})
        result.append({**definition,**cache[source]})
    write_json(directory/'staged-source-bindings.json',records)
    return result,[Path(v['path']) for v in cache.values()]


def audit(report_path,output,batch_size=12,after_index=-1,stage=False):
    import numpy as np
    import soundfile as sf
    report=json.loads(report_path.read_text());validate_current(report,DEFAULT_DB)
    native=json.loads(Path(report['native_plan']).read_text());pending=[i for i,j in enumerate(report['transitions']) if i>after_index and j['kind']!='programme_boundary' and j['arrangement_design']['realized_timing'].get('status')!='checked']
    output.mkdir(parents=True,exist_ok=True)
    for batch in range(0,len(pending),batch_size):
        indices=pending[batch:batch+batch_size];definitions=[];windows=[];end=0
        for index in indices:
            join=report['transitions'][index];design=join['arrangement_design']
            start,stop=design['mix_start_seconds'],design['mix_end_seconds'];duration=stop-start
            parents=[report['tracks'][index]['id'],report['tracks'][index+1]['id']]
            for component,binding in zip(native['tracks'],report['native_source_bindings'],strict=True):
                if binding['parent_id'] not in parents:continue
                if binding['kind']=='effect':continue
                clips=[crop_clip(c,start,stop,end) for c in component['clips']];clips=[c for c in clips if c]
                if not clips:continue
                definitions.append({'name':f'Join {index+1} · '+binding['parent_id'],'path':component['path'],'sha256':component['sha256'],
                    'gain_db':-9,'pan':-1 if binding['parent_id']==parents[0] else 1,'downmix_mono':True,'clips':clips,
                    'parent_id':binding['parent_id'],'source_kind':binding['kind'],
                    **({'stretch_mode':component['stretch_mode']} if 'stretch_mode' in component else {})})
            windows.append({'index':index,'start':end,'end':end+duration,'split':design['handover_seconds']-start,'bpm':join['incoming_bpm'],
                            'beat_times':design.get('variable_beat_times')})
            end+=duration+.5
        folder=output/f'batch-{batch//batch_size:02d}'
        folder.mkdir(parents=True,exist_ok=True);staged=[]
        if stage:definitions,staged=stage_sources(definitions,report,folder)
        plan=save_plan(folder,'transition-diagnostic',definitions,end,[],master_db=-6,
                       purpose='Per-deck transition timing diagnostic; not musical delivery')
        wave,readback=render_native(plan,folder,Path('/Applications/REAPER.app/Contents/MacOS/REAPER'),BASE/'.local/reaper-resource/reaper.ini',lambda:validate_current(report,DEFAULT_DB))
        signal,sr=sf.read(wave,dtype='float32',always_2d=True)
        results=[]
        for window in windows:
            x=signal[round(window['start']*sr):round(window['end']*sr)]
            try:check=check_window(x,sr,window['bpm'],window['split'],window['end']-window['start']-1/sr,window['beat_times'])
            except ValueError as error:check={'status':'failed','reason':str(error)}
            if check['status']!='checked' and window['beat_times'] is None:
                from template_native_audit import check as template_check
                try:refined=template_check(x,sr,window['bpm'],window['split'])
                except ValueError as error:refined={'status':'failed','reason':str(error)}
                if refined['status']=='checked':check={**refined,'full_mix_attack_screen':check}
                else:check['own_recording_template_screen']=refined
            index=window['index'];report['transitions'][index]['arrangement_design']['realized_timing']=check
            results.append({'index':index,'tracks':[report['tracks'][index]['id'],report['tracks'][index+1]['id']],**check})
        write_json(folder/'results.json',{'readback':readback,'results':results,'wave_sha256':digest(wave)})
        write_json(report_path,report)
        for path in staged:path.unlink()
        print('AUDITED joins',batch+len(indices),'of',len(pending),'failed',sum(r['status']!='checked' for r in results),flush=True)
    failures=[{'index':i,'timing':j['arrangement_design']['realized_timing']} for i,j in enumerate(report['transitions']) if j['kind']!='programme_boundary' and j['arrangement_design']['realized_timing']['status']!='checked']
    write_json(output/'audit-summary.json',{'complete':not failures,'failures':failures,'mix_plan_sha256':digest(report_path)})
    if failures:raise ValueError('Native transition timing failed; review the source cues before production')
    return report


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--mix-plan',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--batch-size',type=int,default=12)
    p.add_argument('--after-index',type=int,default=-1);p.add_argument('--stage-pcm',action='store_true')
    a=p.parse_args();audit(a.mix_plan.resolve(),a.output.resolve(),a.batch_size,a.after_index,a.stage_pcm)
