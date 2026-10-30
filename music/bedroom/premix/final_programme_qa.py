#!/usr/bin/env python3
"""Final authored programme geometry, duration and approval gate before render."""
import argparse
import json
from pathlib import Path

from analyze_audio import digest,write_json
from plan_mix import validate_current
from prepare import DEFAULT_DB
from transition_design import validate_programme_design


def check(report_path):
    report=json.loads(report_path.read_text());validate_current(report,DEFAULT_DB);validate_programme_design(report)
    native=json.loads(Path(report['native_plan']).read_text());intervals=[]
    for definition,binding in zip(native['tracks'],report['native_source_bindings'],strict=True):
        if binding['kind']!='original':continue
        for c in definition['clips']:
            intervals.append([c['position']+c.get('fade_in',0),c['position']+c['length']-c.get('fade_out',0)])
    fresh=0.;last=0.
    for a,b in sorted(intervals):fresh+=max(0,b-max(a,last));last=max(last,b)
    if abs(fresh-report['planned_seconds_excluding_bridges'])>2:raise ValueError('Declared fresh duration disagrees with actual native original coverage')
    if fresh<32400:raise ValueError('Native originals do not provide nine distinct prepared hours')
    ids=[t['id'] for t in report['tracks']]
    if len(set(ids))!=len(ids):raise ValueError('Repeated recording in final programme')
    phases=[]
    for i,c in enumerate(report['chapters']):
        stop=report['chapters'][i+1]['start_seconds'] if i+1<len(report['chapters']) else report['planned_seconds']
        if abs(stop-c['end_seconds'])>.001:raise ValueError('Chapter boundaries overlap or have a gap')
        seconds=stop-c['start_seconds']
        if 'reset' in c['name'].lower() and not 300<=seconds<=1200:raise ValueError('Actual reset outside five to twenty minutes')
        phases.append({'name':c['name'],'role':c['role'],'start_seconds':c['start_seconds'],'end_seconds':stop,'seconds':seconds,'tracks':len(c['ids'])})
    report['geometry_qa']={'passed':True,'conservative_native_original_seconds':fresh,'phases':phases,
                           'native_plan_sha256':digest(Path(report['native_plan'])),'no_repeated_recordings':True,
                           'note':'Original component interval union excludes fades and all derived loops/effects; source approvals/hashes and realized join timing also passed'}
    write_json(report_path,report)
    write_json(report_path.parent/'geometry-qa.json',report['geometry_qa'])
    print(json.dumps(report['geometry_qa']),flush=True)
    return report


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--mix-plan',type=Path,required=True);a=p.parse_args();check(a.mix_plan.resolve())
