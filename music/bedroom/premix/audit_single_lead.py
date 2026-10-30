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

BASE=Path(__file__).resolve().parent


def crop_clip(clip,start,end,position):
    lo=max(start,clip['position']);hi=min(end,clip['position']+clip['length'])
    if hi<=lo:return None
    source_start=source_time(clip,lo);source_end=source_time(clip,hi)
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
    from scipy.ndimage import gaussian_filter1d,uniform_filter1d
    from scipy.signal import butter,find_peaks,sosfiltfilt
    x=np.asarray(signal,float);period=60/bpm
    if not 0<=start<end<=len(x)/sr or end-start<6:raise ValueError('Insufficient diagnostic window')
    band=sosfiltfilt(butter(3,[150,1000],fs=sr,btype='bandpass',output='sos'),x)
    envelope=np.sqrt(np.maximum(0,uniform_filter1d(band**2,size=max(1,round(.004*sr)))))
    flux=gaussian_filter1d(np.maximum(0,np.diff(envelope,prepend=envelope[0])),max(1,.001*sr))
    peaks,properties=find_peaks(flux,distance=round(.35*period*sr),prominence=np.quantile(flux,.99)*.2)
    times=peaks/sr;weights=properties['prominences'];within=(times>=start)&(times<end)
    times=times[within];weights=weights[within];residual=(times+period/2)%period-period/2
    selected=np.abs(residual)<=.04
    if np.count_nonzero(selected)<8:raise ValueError('Too few actual quarter-grid attacks')
    errors=residual[selected]*1000
    coverage=len(set(np.rint(times[selected]/period).astype(int)))/((end-start)/period)
    support=float(weights[selected].sum()/max(weights.sum(),1e-12))
    return {'median_error_ms':float(np.median(errors)),'p95_error_ms':float(np.percentile(np.abs(errors),95)),
            'attack_coverage':float(coverage),'weighted_support':support,'events':int(sum(selected)),
            'status':'checked' if coverage>=.3 and support>=.15 and np.percentile(np.abs(errors),95)<=25 else 'failed'}


def check_window(signal,sr,bpm,split,end):
    measured=[]
    for a,b in [(1,split-.25),(split+1,end-.25)]:
        decks=[expected_attacks(signal[:,ch],sr,bpm,a,b) for ch in range(2)]
        difference=abs(decks[0]['median_error_ms']-decks[1]['median_error_ms'])
        measured.append({'decks':decks,'interdeck_phase_difference_ms':difference,'window_seconds':[a,b]})
    passed=all(c['status']=='checked' for w in measured for c in w['decks']) and all(w['interdeck_phase_difference_ms']<=15 for w in measured)
    return {'status':'checked' if passed else 'failed','peak_p95_error_ms':max(c['p95_error_ms'] for w in measured for c in w['decks']),
            'interdeck_phase_difference_ms':max(w['interdeck_phase_difference_ms'] for w in measured),'regions':measured,
            'method':'Actual native source/warp/loop geometry; isolated diagnostic channels, expected-grid attack coverage/support checks',
            'human_verified':False}


def audit(report_path,output,batch_size=12):
    import numpy as np
    import soundfile as sf
    report=json.loads(report_path.read_text());validate_current(report,DEFAULT_DB)
    native=json.loads(Path(report['native_plan']).read_text());pending=[i for i,j in enumerate(report['transitions']) if j['kind']!='programme_boundary' and j['arrangement_design']['realized_timing'].get('status')!='checked']
    output.mkdir(parents=True,exist_ok=True)
    for batch in range(0,len(pending),batch_size):
        indices=pending[batch:batch+batch_size];definitions=[];windows=[];end=0
        for index in indices:
            join=report['transitions'][index];design=join['arrangement_design']
            start,stop=design['mix_start_seconds'],design['mix_end_seconds'];duration=stop-start
            parents=[report['tracks'][index]['id'],report['tracks'][index+1]['id']]
            for component,binding in zip(native['tracks'],report['native_source_bindings'],strict=True):
                if binding['parent_id'] not in parents:continue
                clips=[crop_clip(c,start,stop,end) for c in component['clips']];clips=[c for c in clips if c]
                if not clips:continue
                definitions.append({'name':f'Join {index+1} · '+binding['parent_id'],'path':component['path'],'sha256':component['sha256'],
                    'gain_db':-9,'pan':-1 if binding['parent_id']==parents[0] else 1,'downmix_mono':True,'clips':clips})
            windows.append({'index':index,'start':end,'end':end+duration,'split':design['handover_seconds']-start,'bpm':join['incoming_bpm']})
            end+=duration+.5
        folder=output/f'batch-{batch//batch_size:02d}'
        plan=save_plan(folder,'transition-diagnostic',definitions,end,[],master_db=-6,
                       purpose='Per-deck transition timing diagnostic; not musical delivery')
        wave,readback=render_native(plan,folder,Path('/Applications/REAPER.app/Contents/MacOS/REAPER'),BASE/'.local/reaper-resource/reaper.ini',lambda:validate_current(report,DEFAULT_DB))
        signal,sr=sf.read(wave,dtype='float32',always_2d=True)
        results=[]
        for window in windows:
            x=signal[round(window['start']*sr):round(window['end']*sr)]
            try:check=check_window(x,sr,window['bpm'],window['split'],window['end']-window['start']-1/sr)
            except ValueError as error:check={'status':'failed','reason':str(error)}
            index=window['index'];report['transitions'][index]['arrangement_design']['realized_timing']=check
            results.append({'index':index,'tracks':[report['tracks'][index]['id'],report['tracks'][index+1]['id']],**check})
        write_json(folder/'results.json',{'readback':readback,'results':results,'wave_sha256':digest(wave)})
        write_json(report_path,report)
        print('AUDITED joins',batch+len(indices),'of',len(pending),'failed',sum(r['status']!='checked' for r in results),flush=True)
    failures=[{'index':i,'timing':j['arrangement_design']['realized_timing']} for i,j in enumerate(report['transitions']) if j['kind']!='programme_boundary' and j['arrangement_design']['realized_timing']['status']!='checked']
    write_json(output/'audit-summary.json',{'complete':not failures,'failures':failures,'mix_plan_sha256':digest(report_path)})
    if failures:raise ValueError('Native transition timing failed; review the source cues before production')
    return report


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--mix-plan',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--batch-size',type=int,default=12)
    a=p.parse_args();audit(a.mix_plan.resolve(),a.output.resolve(),a.batch_size)
