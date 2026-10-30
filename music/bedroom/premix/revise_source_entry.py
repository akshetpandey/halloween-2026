#!/usr/bin/env python3
"""Move one original entry by complete bars; preserve order, effects and cues.

Recompile that musical body, shift its later support/programme by the measured
duration change, and invalidate only changed per-deck diagnostic geometry.
"""
import argparse
import json
from pathlib import Path

from actual_audition import warped_clip
from analyze_audio import write_json
from plan_mix import validate_current
from prepare import DEFAULT_DB
from reaper_proof import save_plan
from repair_transition_geometry import geometry
from single_lead_timeline import _handled


def revise(path,index,bars,output):
    r=json.loads(path.read_text());validate_current(r,DEFAULT_DB)
    n=json.loads(Path(r['native_plan']).read_text());before=[geometry(n,r,i) for i in range(len(r['transitions']))]
    t=r['tracks'][index];old_end=t['main_end_seconds'];start=t['main_start_seconds'];source_start,source_end=t['ranges'][0]
    if any(f['index'] in [index-1,index] for f in r['performance_features']):raise ValueError('Featured boundary needs an explicit effect revision')
    if any(r['transitions'][i]['kind']!='single_lead_bass_swap' for i in [index-1,index]):raise ValueError('Only ordinary supported source entries are handled')
    source_start+=bars*240/t['source_bpm'];beats=round((source_end-source_start)*t['source_bpm']/60);total=32+beats+32
    if beats<64 or beats%4:raise ValueError('Revised entry must retain complete bars')
    c,tempo,rates=warped_clip(source_start,beats,t['source_bpm'],32,total,t['incoming_bpm'],t['outgoing_bpm'],min(64,max(16,(total-4)//4*2)))
    new_end=start+c['length'];delta=new_end-old_end
    indices={v['id']:i for i,v in enumerate(r['tracks'])}
    def shift_envelopes(d):
        for p in d.get('volume',[]):
            if p['time']>0:p['time']+=delta
        for band in d.get('eq_bands',[]):
            for p in band['points']:
                if p['time']>0:p['time']+=delta
    for d,b in zip(n['tracks'],r['native_source_bindings'],strict=True):
        owner=indices[b['parent_id']]
        if owner==index and b['kind']=='original':
            d['clips']=[_handled(c,start)]
            for p in d.get('volume',[]):
                if abs(p['time']-old_end)<.01:p['time']+=delta
        elif owner>index or (owner==index and d['name'].endswith('outgoing drum tail')):
            for clip in d['clips']:clip['position']+=delta
            shift_envelopes(d)
    n['tempo_map']=[{**p,'time':p['time']+(delta if p['time']>=old_end-.0001 else 0)} for p in n['tempo_map'] if not start-.0001<=p['time']<old_end-.0001]
    n['tempo_map']+= [{'time':start+p['time'],'bpm':p['bpm']} for p in tempo]
    n['tempo_map'].sort(key=lambda p:p['time'])
    for marker in n['markers']:
        if marker['time']>=old_end-.01:marker['time']+=delta
    for i,v in enumerate(r['tracks']):
        for key in ['start_seconds','main_start_seconds','main_end_seconds','end_seconds']:
            if i>index or (i==index and key in ['main_end_seconds','end_seconds']):v[key]+=delta
    t['ranges']=[[source_start,source_end]];t['rate_range']=[min(rates),max(rates)]
    r['transitions'][index-1]['arrangement_design']['phrase_cues'][1]['source_seconds']=source_start
    t['entry_revision']={'advance_bars':bars,'source_start':source_start,'reason':'Begin at sustained drop after the early breakdown; native timing recheck required'}
    for i,j in enumerate(r['transitions']):
        if i<index or j['kind']=='programme_boundary':continue
        d=j['arrangement_design']
        for key in ['mix_start_seconds','mix_end_seconds','handover_seconds']:d[key]+=delta
        if 'performance' in d:
            for key in ['at_seconds']:
                if key in d['performance']:d['performance'][key]+=delta
    for feature in r['performance_features']:
        if feature['index']<index:continue
        feature['at_seconds']+=delta
        for item in feature.get('prints',[]):item['at_seconds']+=delta
    for chapter in r['chapters']:
        if chapter['start_seconds']>=old_end-60:chapter['start_seconds']+=delta
        if chapter['end_seconds']>=old_end-60:chapter['end_seconds']+=delta
    r['planned_seconds']+=delta;r['planned_seconds_excluding_bridges']+=delta;n['end_seconds']+=delta
    if r['planned_seconds_excluding_bridges']<32400:raise ValueError('Entry correction would violate nine distinct hours')
    changed=[]
    for i,j in enumerate(r['transitions']):
        after=geometry(n,r,i)
        if after!=before[i]:j['arrangement_design']['realized_timing']={'status':'pending'};changed.append(i)
        if after:j['arrangement_design']['diagnostic_geometry_sha256']=after
    previous=r['native_plan'];plan=save_plan(output,'entry-revised',n['tracks'],n['end_seconds'],n['markers'],bpm=n['bpm'],master_db=n['master_db'],tempo_map=n['tempo_map'])
    r.update(native_plan=str(output/'entry-revised-plan.json'),native_manifest_sha256=plan['manifest_sha256'])
    r.setdefault('source_entry_revisions',[]).append({'index':index,'id':t['id'],'source_advance_bars':bars,'duration_delta_seconds':delta,'changed_joins':changed,'prior_native_plan':previous})
    validate_current(r,DEFAULT_DB);write_json(path,r)
    print('SOURCE ENTRY REVISED',index,'seconds',delta,'joins',changed,flush=True)


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--mix-plan',type=Path,required=True);p.add_argument('--index',type=int,required=True);p.add_argument('--bars',type=int,required=True);p.add_argument('--output',type=Path,required=True)
    a=p.parse_args();revise(a.mix_plan.resolve(),a.index,a.bars,a.output.resolve())
