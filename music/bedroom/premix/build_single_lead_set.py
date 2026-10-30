#!/usr/bin/env python3
"""Freeze prepared cues and compile the accepted single-lead technique.

A plan is not a render. Native join diagnostics must be populated before the
full production gate permits rendering or delivery.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime,UTC
import json
from pathlib import Path
import shutil

from analyze_audio import digest,write_json
from plan_mix import VERSION,eligible,gain_for,retained_loudness,validate_current
from prepare import DEFAULT_DB,approved_pool,host_rows,file_key
from programme_order import order
from reaper_proof import save_plan
from single_lead_timeline import compile_timeline


def build(state,output,subset=None):
    output.mkdir(parents=True,exist_ok=True);inputs=output/'inputs';inputs.mkdir(exist_ok=True)
    if (output/'mix-plan.json').exists():raise ValueError('Choose a fresh output folder; do not mutate a frozen rendered plan')
    for name in ['analysis.json','intelligence.json','file-map.json']:
        shutil.copy2(state/'final-plan/inputs'/name,inputs/name)
    analysis=json.loads((inputs/'analysis.json').read_text());evidence=json.loads((inputs/'intelligence.json').read_text())
    tracks,_,blocked=eligible(DEFAULT_DB,analysis,evidence,inputs/'file-map.json')
    metadata,_=approved_pool(host_rows(DEFAULT_DB));metadata={t['id']:t for t in metadata}
    cues={}
    for t in tracks:
        path=state/'revision-08/cues'/file_key(t['id'])/'cue.json'
        if not path.exists():continue
        cue=json.loads(path.read_text())
        if cue['status']!='prepared':continue
        if cue['binding']['source_sha256']!=t['sha256']:raise ValueError('Prepared cue has stale source binding')
        if any(digest(Path(p['path']))!=p['sha256'] for p in cue['parts']):raise ValueError('Prepared stem changed')
        cues[t['id']]=cue
    if subset:
        if any(i not in cues for i in subset):raise ValueError('Subset cue missing')
        ordered=[{'id':i,'programme_role':'party','programme_chapter':'00 Integration proof','pressure_proxy':None} for i in subset]
        scheduling={'integration_proof':True,'omitted_ids':[]}
    else:
        ordered,scheduling=order(tracks,cues,metadata)
    selected={r['id'] for r in ordered};tracks=[t for t in tracks if t['id'] in selected]
    cue_index=inputs/'cues.json';write_json(cue_index,{'tracks':[cues[r['id']] for r in ordered]})
    def meter(t):
        body=cues[t['id']]['body'];measurement=retained_loudness(t,[[body['start'],body['end']]],output/'loudness-cache')
        return t['id'],measurement
    with ThreadPoolExecutor(max_workers=4) as workers:measured=dict(workers.map(meter,tracks))
    result=compile_timeline(ordered,tracks,cues,{i:gain_for(m) for i,m in measured.items()})
    native=save_plan(output/'native','single-lead-set',result['definitions'],result['end'],result['markers'],
        purpose='Approved-source single-lead Hollow programme; join diagnostics pending',
        bpm=cues[ordered[0]['id']]['grid']['bpm'],master_db=-6,tempo_map=result['tempo_map'])
    chapters=[]
    for t in result['details']:
        if not chapters or chapters[-1]['name']!=t['programme_chapter']:
            chapters.append({'name':t['programme_chapter'],'lane':t['lane'],'role':t['programme_role'],
                             'start_seconds':t['start_seconds'],'end_seconds':t['end_seconds'],'ids':[t['id']]})
        else:chapters[-1]['end_seconds']=t['end_seconds'];chapters[-1]['ids'].append(t['id'])
    report={'version':VERSION,'generated_at':datetime.now(UTC).isoformat(),'source_policy':'verified production acquisitions',
        'source_analysis_sha256':digest(inputs/'analysis.json'),'model_report_sha256':digest(inputs/'intelligence.json'),
        'tracks':result['details'],'transitions':result['joins'],'chapters':chapters,'blocked':blocked,
        'planned_seconds':result['end'],'planned_seconds_excluding_bridges':result['fresh_seconds'],'loop_bridge_seconds':result['end']-result['fresh_seconds'],
        'retained_loudness':measured,'native_source_bindings':result['native_source_bindings'],
        'native_plan':str(output/'native/single-lead-set-plan.json'),'native_manifest_sha256':native['manifest_sha256'],
        'rendered':False,'party_ready':False,'human_verified':False,'host_votes_changed':False,
        'production_sources_verified':True,'meets_nine_hour_planned_duration':result['fresh_seconds']>=32400,
        'inputs':{**{k:str((inputs/name).resolve()) for k,name in [('analysis','analysis.json'),('intelligence','intelligence.json'),('file_map','file-map.json'),('cue_index','cues.json')]},
                  'file_map_sha256':digest(inputs/'file-map.json'),'cue_index_sha256':digest(cue_index)},
        'pacing':scheduling,'transition_policy':'Host-approved single-lead technique; source-event and realized-audio diagnostics remain per join'}
    validate_current(report,DEFAULT_DB);write_json(output/'mix-plan.json',report)
    print(json.dumps({'logical_tracks':len(report['tracks']),'native_components':len(native['tracks']),
        'hours_excluding_loop_padding':report['planned_seconds_excluding_bridges']/3600,'diagnostics_status':'pending'}),flush=True)
    return report


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--state',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--subset',nargs='+')
    a=p.parse_args();build(a.state.resolve(),a.output.resolve(),a.subset)
