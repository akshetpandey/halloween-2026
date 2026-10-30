#!/usr/bin/env python3
"""Joint drum/model clock review and actual low-band entry/exit correction."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
import json
import math
from pathlib import Path
import shutil

from analyze_audio import digest,write_json
from prepare import DEFAULT_DB,approved_pool,file_key,host_rows
from prepare_final_cues import low_profile


def admit(state,output):
    import numpy as np
    analysis=json.loads((state/'final-plan/inputs/analysis.json').read_text())
    evidence=json.loads((state/'final-plan/inputs/intelligence.json').read_text());ev={t['id']:t for t in evidence['tracks']}
    admitted=[]
    for t in analysis['tracks']:
        if t['grid']['usable_constant_grid']:continue
        path=state/'revision-06/drum-grids'/(file_key(t['id'])+'.json')
        if not path.exists():continue
        cue=json.loads(path.read_text())
        if cue.get('status')!='cue timing available' or cue['binding']['source_sha256']!=t['sha256']:continue
        g=cue['grid'];p=60/g['bpm'];beats=np.asarray(ev[t['id']]['rhythm']['beats_seconds'])
        residual=np.abs((beats-g['phase_seconds']+p/2)%p-p/2)
        support=float(np.mean(residual<=.045));median=float(np.median(residual))
        # The former rejection concerned full-mix onsets, not a confirmed tempo
        # change. Require new independent early/late drums AND whole-file model
        # agreement. Actual final native joins still have the stricter 25ms gate.
        if g['residual_p95_ms']>15 or support<.90 or median>.025:continue
        old=deepcopy(t['grid']);t['bpm']=g['bpm'];t['grid'].update(usable_constant_grid=True,rejection_reasons=[],
            period_seconds=p,beat_phase_seconds=g['phase_seconds'],interior_splices_supported=False)
        t['source_clock_refinement']={'prior_grid':old,'source_sha256':t['sha256'],'independent_cue_report_sha256':digest(path),
            'fitted_drum_clock':g,'whole_file_neural_agreement_45ms':support,'median_neural_residual_seconds':median,
            'policy':'Independent early/late drum fit p95 <=15ms, full-file neural agreement >=90%, median <=25ms; final native timing still required'}
        admitted.append(t['id'])
    inputs=output/'final-plan/inputs';inputs.mkdir(parents=True,exist_ok=True)
    write_json(inputs/'analysis.json',analysis);write_json(inputs/'intelligence.json',evidence)
    shutil.copy2(state/'final-plan/inputs/file-map.json',inputs/'file-map.json')
    clock_state=output/'clock-rescues/final-plan/inputs';clock_state.mkdir(parents=True,exist_ok=True)
    write_json(clock_state/'analysis.json',{**analysis,'tracks':[t for t in analysis['tracks'] if t['id'] in admitted]})
    write_json(clock_state/'intelligence.json',{**evidence,'tracks':[t for t in evidence['tracks'] if t['id'] in admitted]})
    write_json(output/'admitted-clocks.json',{'ids':admitted,'source_analysis_sha256':digest(state/'final-plan/inputs/analysis.json')})
    print('NEW JOINTLY VERIFIED CLOCKS',len(admitted),admitted,flush=True)


def correct(state,cue_root,output):
    import numpy as np
    analysis=json.loads((state/'final-plan/inputs/analysis.json').read_text());by={t['id']:t for t in analysis['tracks']}
    metadata,_=approved_pool(host_rows(DEFAULT_DB));metadata={t['id']:t for t in metadata}
    sources=sorted(cue_root.glob('*/cue.json'));output.mkdir(parents=True,exist_ok=True)
    def one(path):
        cue=json.loads(path.read_text())
        if cue['status']!='prepared':return None
        t=by[cue['id']];grid=cue['grid'];body=cue['body'];p=60/grid['bpm'];bar=4*p
        cache=output/'low-cache'/(file_key(t['id'])+'.json')
        binding={'source_sha256':t['sha256'],'grid':grid,'method':'Original full-mix 30-180Hz quarter-beat RMS'}
        if cache.exists() and json.loads(cache.read_text())['binding']==binding:
            c=json.loads(cache.read_text());times,levels=np.array(c['times']),np.array(c['db'])
        else:
            times,levels=low_profile(t,grid);write_json(cache,{'binding':binding,'times':times.tolist(),'db':levels.tolist()})
        floor=max(-45,float(np.percentile(levels,85))-12)
        broken='drum' in metadata[t['id']].get('lane','').lower()
        entry_fraction=.45 if broken else .75;future_fraction=.45 if broken else .65;gap_limit=12 if broken else 8
        def active(a,beats):return levels[(times>=a-.01*p)&(times<a+(beats-.01)*p)]>=floor
        start=body['start'];end=body['body_end'];original=[start,end]
        # Enter on an actual rhythmic bar, never round a detected return back
        # into the preceding eight-bar breakdown. Check the next 16 bars too.
        candidates=[]
        for n in range(math.ceil((min(240,end-64*p)-start)/bar)+1):
            a=start+n*bar;first=active(a,8);future=active(a,64)
            if len(first)<8 or len(future)<48 or first.mean()<entry_fraction or future.mean()<future_fraction:continue
            run=longest=0
            for value in future:
                run=0 if value else run+1;longest=max(longest,run)
            if longest>gap_limit:continue
            candidates.append(a)
        if not candidates:raise ValueError('No supported rhythmic entry before the last complete body phrase: '+t['id'])
        start=candidates[0]
        # A producer's one-bar pre-drop rest is intentional. Check a whole
        # phrase, not only its last two bars, and retain those short breaths.
        # Remove only an actual extended rhythmic fade/empty ending.
        while end-start>128*p:
            phrase=active(end-32*p,32);trailing=0
            for value in phrase[::-1]:
                if value:break
                trailing+=1
            if len(phrase)>=28 and phrase.mean()>=(.4 if broken else .5) and trailing<=8:break
            end-=32*p
        if end-start<64*p:raise ValueError('Corrected body is too short: '+t['id'])
        cue['body']={**body,'start':float(start),'body_end':float(end),'end':float(end+32*p),
                     'original_low_band_screen':{'prior_range':original,'corrected_range':[float(start),float(end)],'floor_dbfs':floor,
                                                 'evidence_sha256':digest(cache),'entry_future_beats':64,'maximum_entry_gap_beats':gap_limit,
                                                 'low_activity_fraction':[entry_fraction,future_fraction],'breakbeat_pattern':broken}}
        cue['parts']=[p for p in cue['parts'] if not p['role'].startswith('effect-')]
        write_json(output/'cues'/file_key(t['id'])/'cue.json',cue)
        return {'id':t['id'],'before':original,'after':[start,end],'removed_seconds':(original[1]-original[0])-(end-start)}
    def safe(path):
        try:return one(path)
        except ValueError as error:
            old=json.loads(path.read_text());write_json(output/'cues'/path.parent.name/'cue.json',
                {'id':old['id'],'status':'needs entry review','error':str(error),'binding':old['binding']})
            return {'id':old['id'],'excluded_reason':str(error),'removed_seconds':0}
    with ThreadPoolExecutor(max_workers=4) as pool:rows=list(pool.map(safe,sources))
    rows=[r for r in rows if r]
    write_json(output/'entry-exit-corrections.json',{'tracks':rows,'removed_seconds':sum(r['removed_seconds'] for r in rows)})
    print('CORRECTED',len(rows),'removed minutes',sum(r['removed_seconds'] for r in rows)/60,flush=True)


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--state',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--cues',type=Path);p.add_argument('--admit',action='store_true')
    a=p.parse_args()
    if a.admit:admit(a.state.resolve(),a.output.resolve())
    else:correct(a.state.resolve(),a.cues.resolve(),a.output.resolve())
