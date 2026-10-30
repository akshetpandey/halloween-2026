#!/usr/bin/env python3
"""Prepare a few pending critical sources without changing the main worker queue."""
import argparse
import json
from pathlib import Path

from analyze_audio import write_json
from prepare import file_key
from prepare_production_cues import worker


def prepare(state,output,ids):
    inputs=output/'final-plan/inputs';inputs.mkdir(parents=True,exist_ok=True)
    analysis=json.loads((state/'final-plan/inputs/analysis.json').read_text())
    evidence=json.loads((state/'final-plan/inputs/intelligence.json').read_text())
    selected=[t for t in analysis['tracks'] if t['id'] in ids]
    if {t['id'] for t in selected}!=set(ids):raise ValueError('Unknown priority source')
    write_json(inputs/'analysis.json',{**analysis,'tracks':selected})
    write_json(inputs/'intelligence.json',{**evidence,'tracks':[t for t in evidence['tracks'] if t['id'] in ids]})
    worker(output,len(ids))
    copied=[]
    for ident in ids:
        source=output/'revision-08/cues'/file_key(ident)/'cue.json'
        record=json.loads(source.read_text())
        if record['status']!='prepared':continue
        target=state/'revision-08/cues'/file_key(ident)/'cue.json'
        # Retain an already-complete canonical result if the main worker reached
        # this source meanwhile. The source/part hashes remain independently checked.
        current=json.loads(target.read_text()) if target.exists() else {}
        if current.get('status')=='prepared':continue
        write_json(target,record);copied.append(ident)
    print(json.dumps({'prepared_priority_sources':copied,'note':'Permanent priority stem paths stay ignored and source-bound'}),flush=True)


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--state',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--ids',nargs='+',required=True)
    a=p.parse_args();prepare(a.state.resolve(),a.output.resolve(),a.ids)
