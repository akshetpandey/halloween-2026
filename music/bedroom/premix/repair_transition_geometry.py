#!/usr/bin/env python3
"""Propose modest drum nudges/phrase-length overlaps, then require new renders.

Full-stereo music, order and programme duration stay fixed. Only source-bound
drum support changes; simulations select candidates, never certify production.
"""
import argparse
from copy import deepcopy
import hashlib
import json
from pathlib import Path

from analyze_audio import write_json
from audit_single_lead import check_window,crop_clip
from plan_mix import validate_current
from prepare import DEFAULT_DB
from reaper_proof import save_plan
from research_audition import eq,points
from single_lead_timeline import _handled


def align_original_phases(native,report):
    """Minimal whole-source cue nudges; align the actual original handover too.

    This prevents fixing support loops from concealing a jump between the two
    original recordings. All offsets are bounded to fifteen source milliseconds.
    """
    import numpy as np
    from scipy.optimize import linprog
    tracks=report['tracks'];index={t['id']:i for i,t in enumerate(tracks)};rows=[];differences=[]
    for j,join in enumerate(report['transitions']):
        if join['kind']!='single_lead_bass_swap':continue
        d=join['arrangement_design'];regions=d['realized_timing'].get('regions',[])
        if len(regions)!=2:continue
        a,b=tracks[j:j+2];row=np.zeros(len(tracks));hook=d.get('performance',{}).get('kind')=='hook_tease_drop'
        if not hook:row[j]=a['source_bpm']/join['incoming_bpm']
        row[j+1]=-b['source_bpm']/join['incoming_bpm']
        rows.append(row);differences.append(regions[1]['decks'][1]['median_error_ms']-regions[0]['decks'][0]['median_error_ms'])
    if not rows or max(abs(v) for v in differences)<=15:return {}
    analysis={t['id']:t for t in json.loads(Path(report['inputs']['analysis']).read_text())['tracks']}
    lower=np.full(len(tracks),-15.);upper=np.full(len(tracks),15.)
    for definition,binding in zip(native['tracks'],report['native_source_bindings'],strict=True):
        if binding['kind']!='original':continue
        k=index[binding['parent_id']];duration=analysis[binding['parent_id']]['duration_seconds']
        low=min(c['source_start'] for c in definition['clips']);high=max(c['stretch_markers'][-1]['source'] for c in definition['clips'])
        prior=tracks[k].get('original_source_nudge_seconds',0)*1000
        lower[k]=max(-15-prior,-low*1000+.05);upper[k]=min(15-prior,(duration-high)*1000-.05)
    # Do not alter an unmeasured original entry/exit adjacent to a tempo bridge.
    for i,join in enumerate(report['transitions']):
        if join['kind']=='percussion_tempo_bridge':lower[i:i+2]=0;upper[i:i+2]=0
    matrix=np.array(rows);diff=np.array(differences);solution=None
    for margin in [12,14.5,15]:
        # L1 minimal cue movement; HiGHS avoids dense quadratic iterations
        # across two hundred sources when only a few edges need correction.
        n=len(tracks);aug=np.column_stack([matrix,-matrix])
        fit=linprog(np.ones(2*n),A_ub=np.vstack([aug,-aug]),
                    b_ub=np.r_[margin-diff,margin+diff],
                    bounds=[(0,max(0,v)) for v in upper]+[(0,max(0,-v)) for v in lower],method='highs')
        if fit.success:solution=fit.x[:n]-fit.x[n:];break
    if solution is None:raise ValueError('Original-recording phases need an authored cue revision, beyond bounded nudges')
    offsets={t['id']:float(solution[i]/1000) for i,t in enumerate(tracks) if abs(solution[i])>.01}
    for definition,binding in zip(native['tracks'],report['native_source_bindings'],strict=True):
        advance=offsets.get(binding['parent_id'],0)
        if binding['kind']!='original' or not advance:continue
        for c in definition['clips']:
            c['source_start']+=advance
            for marker in c['stretch_markers']:marker['source']+=advance
    for t in tracks:
        advance=offsets.get(t['id'],0)
        if not advance:continue
        t['ranges']=[[a+advance,b+advance] for a,b in t['ranges']]
        t['original_source_nudge_seconds']=t.get('original_source_nudge_seconds',0)+advance
    for i,join in enumerate(report['transitions']):
        if join['kind']=='programme_boundary':continue
        for cue in join['arrangement_design']['phrase_cues']:
            ident=tracks[i if cue['deck']=='outgoing' else i+1]['id'];cue['source_seconds']+=offsets.get(ident,0)
    report['original_phase_alignment']={'source_nudges_seconds':offsets,'bound_ms':15,'predicted_max_handover_difference_ms':float(np.max(abs(diff+matrix@solution))),
                                        'status':'Bounded source-cue adjustment; actual native rerender required'}
    return offsets


def loop_clips(part,source_bpm,target_bpm,positions,advance):
    """Slip a four-bar loop cyclically, preserving its true output duration."""
    period=60/source_bpm;source_length=16*period;rate=target_bpm/source_bpm;result=[]
    for position in positions:
        if abs(advance)<=.013:
            sections=[(part['offset']+advance,part['offset']+advance+source_length)]
        else:
            rotated=advance%source_length;sections=[(part['offset']+rotated,part['offset']+source_length),(part['offset'],part['offset']+rotated)]
        at=position
        for a,b in sections:
            length=(b-a)/rate
            item={'source_start':a,'position':at,'length':length,'rate':1,'fade_in':.003,'fade_out':.003,
                  'stretch_markers':[{'position':0,'source':a},{'position':length,'source':b}]}
            result.append(_handled(item,at));at+=length
    return result


def geometry(native,report,index):
    join=report['transitions'][index]
    if join['kind']=='programme_boundary':return None
    d=join['arrangement_design'];parents={t['id'] for t in report['tracks'][index:index+2]};rows=[]
    for track,binding in zip(native['tracks'],report['native_source_bindings'],strict=True):
        if binding['parent_id'] not in parents or binding['kind']=='effect':continue
        clips=[crop_clip(c,d['mix_start_seconds'],d['mix_end_seconds'],0) for c in track['clips']];clips=[c for c in clips if c]
        if clips:rows.append({'parent':binding['parent_id'],'source_sha256':track['sha256'],'clips':clips,'stretch_mode':track.get('stretch_mode',0)})
    def rounded(v):
        if isinstance(v,float):return round(v,10)
        if isinstance(v,list):return [rounded(x) for x in v]
        if isinstance(v,dict):return {k:rounded(x) for k,x in v.items()}
        return v
    return hashlib.sha256(json.dumps(rounded(rows),sort_keys=True).encode()).hexdigest()


def predict(signal,sr,bpm,pre,post,original_split=None):
    import numpy as np
    beat=60/bpm;original_split=32*beat if original_split is None else original_split;lo=original_split-pre*4*beat;hi=original_split+post*4*beat
    x=signal[round(lo*sr):round(hi*sr)].copy();split=pre*4*beat;end=len(x)/sr-1/sr
    try:plain=check_window(x,sr,bpm,split,end)
    except ValueError:return None
    if plain['status']=='checked':return {'pre_bars':pre,'post_bars':post,'intro_source_advance_output_seconds':0.,'tail_source_advance_output_seconds':0.,'predicted':plain}
    first,last=plain['regions'];intro=(first['decks'][1]['median_error_ms']-first['decks'][0]['median_error_ms'])/1000
    tail=(last['decks'][0]['median_error_ms']-last['decks'][1]['median_error_ms'])/1000
    intro=float(np.clip(intro,-.04,.04));tail=float(np.clip(tail,-.04,.04));border=round(split*sr)
    for channel,a,b,advance in [(1,0,border,intro),(0,border,len(x),tail)]:
        v=x[a:b,channel].copy();ticks=np.arange(len(v));x[a:b,channel]=np.interp(ticks+advance*sr,ticks,v,left=0,right=0)
    try:check=check_window(x,sr,bpm,split,end)
    except ValueError:return None
    if check['status']!='checked':return None
    return {'pre_bars':pre,'post_bars':post,'intro_source_advance_output_seconds':intro,'tail_source_advance_output_seconds':tail,'predicted':check}


def repair(report_path,drums,output,apply=False):
    import numpy as np
    import soundfile as sf
    report=json.loads(report_path.read_text());validate_current(report,DEFAULT_DB)
    native=json.loads(Path(report['native_plan']).read_text());before=[geometry(native,report,i) for i in range(len(report['transitions']))];proposals=[];unresolved=[]
    original_offsets=align_original_phases(native,report)
    frozen_cues={c['id']:c for c in json.loads(Path(report['inputs']['cue_index']).read_text())['tracks']}
    for i,join in enumerate(report['transitions']):
        if join['kind']=='programme_boundary' or join['arrangement_design']['realized_timing']['status']=='checked':continue
        folder=drums/f'join-{i+1:03d}';wave=folder/'actual-native-drums.wav'
        if (folder/'actual-native-rhythm.wav').exists():wave=folder/'actual-native-rhythm.wav'
        if not wave.exists():unresolved.append({'index':i,'reason':'Independent actual drum evidence missing'});continue
        signal,sr=sf.read(wave,dtype='float32',always_2d=True);candidates=[];a,b=report['tracks'][i:i+2];feature=join['arrangement_design'].get('performance',{})
        if join['kind']=='percussion_tempo_bridge':
            d=join['arrangement_design'];times=np.asarray(d['variable_beat_times']);ticks=np.arange(len(signal));seconds=ticks/sr
            tempos=np.interp(seconds,(times[:-1]+times[1:])/2,join['bridge_clock']['tempos']);rate=tempos/b['source_bpm']
            for advance in [0,.004,-.004,.008,-.008,.012,-.012]:
                shifted=signal.copy();shifted[:,1]=np.interp(ticks+advance/rate*sr,ticks,signal[:,1],left=0,right=0)
                try:check=check_window(shifted,sr,join['incoming_bpm'],d['handover_seconds']-d['mix_start_seconds'],len(shifted)/sr-1/sr,times)
                except ValueError:continue
                if check['status']=='checked':
                    candidates.append((abs(advance),{'index':i,'kind':'variable_drum_nudge','incoming_source_advance_seconds':advance,'predicted':check}))
            if candidates:proposals.append(min(candidates,key=lambda c:c[0])[1])
            else:proposals.append({'index':i,'kind':'percussion_transient_mode','native_render_required':True,
                                   'reason':'Use REAPER transient-optimized marker stretching on isolated percussion during the larger tempo ramp'})
            continue
        if join['kind']!='single_lead_bass_swap':unresolved.append({'index':i,'reason':'Unsupported repair kind'});continue
        split=join['arrangement_design']['handover_seconds']-join['arrangement_design']['mix_start_seconds'];border=round(split*sr)
        for channel,lo,hi,track in [(0,0,border,a),(1,border,len(signal),b)]:
            if channel==0 and feature.get('kind')=='hook_tease_drop':continue
            advance=original_offsets.get(track['id'],0)*track['source_bpm']/join['incoming_bpm']
            if advance:
                ticks=np.arange(hi-lo);v=signal[lo:hi,channel].copy();signal[lo:hi,channel]=np.interp(ticks+advance*sr,ticks,v,left=0,right=0)
        d=join['arrangement_design'];old_pre=round((d['handover_seconds']-d['mix_start_seconds'])*join['incoming_bpm']/240)
        old_post=round((d['mix_end_seconds']-d['handover_seconds'])*join['incoming_bpm']/240)
        for pre,post in [(8,8),(8,4),(4,8),(4,4)]:
            if pre>old_pre or post>old_post:continue
            if pre==4 and (feature.get('kind')=='hook_tease_drop' or a['programme_chapter']!=b['programme_chapter']):continue
            candidate=predict(signal,sr,join['incoming_bpm'],pre,post,d['handover_seconds']-d['mix_start_seconds'])
            if candidate:
                score=(16-pre-post)*.5+50*(abs(candidate['intro_source_advance_output_seconds'])+abs(candidate['tail_source_advance_output_seconds']))
                candidates.append((score,candidate))
        if not candidates:unresolved.append({'index':i,'reason':'No bounded nudge/4-bar overlap passed prediction'});continue
        choice=min(candidates,key=lambda c:c[0])[1];choice['index']=i;proposals.append(choice)
    output.mkdir(parents=True,exist_ok=True);write_json(output/'proposals.json',{'proposals':proposals,'unresolved':unresolved,'original_offsets':original_offsets,'simulation_only':True})
    if not apply:return proposals,unresolved
    for proposal in proposals:
        i=proposal['index'];join=report['transitions'][i];d=join['arrangement_design'];a,b=report['tracks'][i:i+2]
        if proposal.get('kind') in ['variable_drum_nudge','percussion_transient_mode']:
            for definition,binding in zip(native['tracks'],report['native_source_bindings'],strict=True):
                if not definition['name'].startswith(f'Reset {i+1} · '):continue
                if proposal['kind']=='percussion_transient_mode':definition['stretch_mode']=4
                elif binding['parent_id']==b['id']:
                    advance=proposal['incoming_source_advance_seconds']
                    for clip in definition['clips']:
                        clip['source_start']+=advance
                        for marker in clip['stretch_markers']:marker['source']+=advance
                        if clip['source_start']<0 or clip['stretch_markers'][-1]['source']>sf.info(definition['path']).duration:raise ValueError('Variable drum nudge exceeds handles')
            d['drum_support_adjustment']={**proposal,'status':'Actual native rerender required'};d['realized_timing']={'status':'pending'}
            continue
        beat=60/join['incoming_bpm'];handover=d['handover_seconds'];pre,post=proposal['pre_bars'],proposal['post_bars'];start=handover-pre*4*beat;stop=handover+post*4*beat
        found=set()
        for definition,binding in zip(native['tracks'],report['native_source_bindings'],strict=True):
            intro=binding['parent_id']==b['id'] and definition['name'].endswith('drum intro')
            tail=binding['parent_id']==a['id'] and definition['name'].endswith('outgoing drum tail')
            if not intro and not tail:continue
            found.add('intro' if intro else 'tail')
            advance=proposal['intro_source_advance_output_seconds' if intro else 'tail_source_advance_output_seconds']
            rate=join['incoming_bpm']/(b['source_bpm'] if intro else a['source_bpm']);source_advance=advance*rate
            owner=b if intro else a;part=next(p for p in frozen_cues[owner['id']]['parts'] if p['role']=='intro')
            positions=[start+n*16*beat for n in range(pre//4)] if intro else [handover+n*16*beat for n in range(post//4)]
            cumulative=definition.get('source_phase_advance_seconds',0)+source_advance
            definition['clips']=loop_clips(part,owner['source_bpm'],join['incoming_bpm'],positions,cumulative)
            definition['source_phase_advance_seconds']=cumulative
            for clip in definition['clips']:
                info=sf.info(definition['path']);source_end=clip['stretch_markers'][-1]['source']
                if clip['source_start']<0 or source_end>info.duration:raise ValueError('Drum nudge exceeds verified source handles')
            if intro:
                definition['volume']=points([(0,0),(start,0),(start+(handover-start)*.65,.7),(handover,.7)],'amplitude')
                definition['eq_bands']=eq([(0,-24)],[(0,-6)],[(0,-6),(start,-6),(handover,-3)])
            else:
                definition['volume']=points([(0,.7),(handover,.7),(stop,0)],'amplitude')
                definition['eq_bands']=eq([(0,-24)],[(0,-3),(stop,-6)],[(0,-3),(stop,-6)])
        if found!={'intro','tail'}:raise ValueError('Expected exact source-bound support pair')
        a['end_seconds']=stop;b['start_seconds']=start;b['intro_loop_bars']=pre
        join.update(bars=pre+post,overlap_seconds=(pre+post)*4*beat)
        d.update(mix_start_seconds=start,mix_end_seconds=stop,bass_swap_beat=pre*4,
                 realized_timing={'status':'pending'},drum_support_adjustment={**proposal,'status':'Simulation selected; actual native rerender required',
                 'musical_reason':'Clear the support after a complete four/eight-bar incoming phrase; small own-drum cue nudges align actual deck attacks'})
        if feature.get('kind')=='hook_tease_drop':
            d['lead_schedule']=[{'start_beat':0,'end_beat':(pre+post)*4,'primary':'incoming','supporting_audio':'Incoming isolated hook then original drop, outgoing own drums only'}]
        else:d['lead_schedule']=[{'start_beat':0,'end_beat':pre*4,'primary':'outgoing','supporting_audio':'Incoming own separated drum cycle'},
                                 {'start_beat':pre*4,'end_beat':(pre+post)*4,'primary':'incoming','supporting_audio':'Outgoing own separated drum cycle, low EQ cut'}]
    changed=[]
    for i,join in enumerate(report['transitions']):
        after=geometry(native,report,i)
        if after!=before[i]:
            changed.append(i);join['arrangement_design']['realized_timing']={'status':'pending'}
        if after:join['arrangement_design']['diagnostic_geometry_sha256']=after
    plan=save_plan(output/'native','single-lead-repaired',native['tracks'],native['end_seconds'],native['markers'],
                   purpose='Source-bound Hollow programme; bounded drum-support repairs require native timing recheck',bpm=native['bpm'],
                   master_db=native['master_db'],tempo_map=native.get('tempo_map'))
    prior_native_path=report['native_plan']
    report.update(native_plan=str(output/'native/single-lead-repaired-plan.json'),native_manifest_sha256=plan['manifest_sha256'])
    for index,chapter in enumerate(report['chapters']):chapter['end_seconds']=report['chapters'][index+1]['start_seconds'] if index+1<len(report['chapters']) else report['planned_seconds']
    report.setdefault('native_repair_history',[]).append({'changed_joins':changed,'prior_geometry_sha256':before,'source_order_and_original_music_unchanged':True,
                                                        'prior_native_plan':prior_native_path})
    write_json(report_path,report);print('NATIVE REPAIRS',changed,'unresolved',unresolved,flush=True)
    return proposals,unresolved


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--mix-plan',type=Path,required=True);p.add_argument('--drums',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--apply',action='store_true')
    a=p.parse_args();repair(a.mix_plan.resolve(),a.drums.resolve(),a.output.resolve(),a.apply)
