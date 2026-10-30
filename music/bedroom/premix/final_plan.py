#!/usr/bin/env python3
"""Freeze finished source evidence, size a nine-hour programme, then plan it."""
import argparse
from collections import Counter
from concurrent.futures import ProcessPoolExecutor, as_completed
import json
from pathlib import Path
import shutil

from analyze_audio import write_json
from arrangement import measure_arrangement
from plan_mix import (assign_programme,build_plan,canonical_lane,choose_grid,
                      compile_timeline,eligible,sequence)
from prepare import DEFAULT_DB
from refine_set import freeze_evidence


def build_final(database,state,output):
    inputs=output/'inputs'
    freeze_evidence(database,state,inputs)
    a=inputs/'analysis.json';e=inputs/'intelligence.json';m=inputs/'file-map.json'
    tracks,evidence,blocked=eligible(database,json.loads(a.read_text()),json.loads(e.read_text()),m)
    cache=output/'planned/arrangement-cache'
    if (output/'arrangement-cache').exists():
        shutil.copytree(output/'arrangement-cache',cache,dirs_exist_ok=True)
    with ProcessPoolExecutor(max_workers=3) as workers:
        jobs={}
        for t in tracks:
            t['lane']=canonical_lane(t.get('lane',''))
            jobs[workers.submit(measure_arrangement,t,choose_grid(t,evidence[t['id']]),cache)]=t
        for index,job in enumerate(as_completed(jobs)):
            t=jobs[job];t['arrangement']=job.result()
            print('ARRANGEMENT',index+1,'of',len(tracks),t['id'],flush=True)
    attempts=[]
    for retention in [.75,.78,.81,.84,.87,.9,.94,.98,1.0]:
        pacing={'retention':retention,'maximum_body_seconds':300,'canonical_lanes':True,'programme_arc':True}
        assign_programme(tracks,pacing)
        choices,joins=sequence(tracks,evidence,pacing)
        _,details,_,_,end=compile_timeline(choices,joins,tracks,{t['id']:0 for t in tracks},evidence)
        bridges=sum(t['loop_bridge']['end_seconds']-t['loop_bridge']['start_seconds'] for t in details if t['loop_bridge'])
        attempts.append({'retention':retention,'planned_seconds':end,'seconds_excluding_bridges':end-bridges,
                         'tracks':len(details),'transition_kinds':dict(Counter(j['kind'] for j in joins))})
        write_json(output/'programme-sizing.json',{'attempts':attempts,'blocked':blocked})
        print('PROGRAMME SIZE',retention,'hours',round((end-bridges)/3600,3),flush=True)
        if end-bridges>=33300:break
    else:raise ValueError('Available verified source bodies cannot provide nine hours plus fifteen minutes of margin')
    result=build_plan(database,a,e,output/'planned',m,pacing=pacing)
    if abs(result['planned_seconds']-end)>.001:raise ValueError('Final measured plan differs from sizing pass')
    if not result['meets_nine_hour_planned_duration']:raise ValueError('Final plan failed the nine-hour gate')
    return result


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--database',type=Path,default=DEFAULT_DB)
    p.add_argument('--state',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    a=p.parse_args();r=build_final(a.database,a.state.resolve(),a.output.resolve())
    print(json.dumps({'tracks':len(r['tracks']),'planned_hours':r['planned_seconds']/3600,'pacing':r['pacing'],'native_plan':r['native_plan']}),flush=True)
