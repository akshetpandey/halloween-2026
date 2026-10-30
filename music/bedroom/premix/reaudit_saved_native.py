#!/usr/bin/env python3
"""Recheck immutable native diagnostic WAVs without repeating DAW renders."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path

from analyze_audio import digest,write_json
from audit_single_lead import check_window
from plan_mix import validate_current
from prepare import DEFAULT_DB
from template_native_audit import check as template_check


def reaudit(report_path,roots,output):
    import soundfile as sf
    report=json.loads(report_path.read_text());validate_current(report,DEFAULT_DB);seen=set();checks=[]
    for root in roots:
        for p in sorted(root.glob('batch-*/results.json')):
            previous=json.loads(p.read_text());wave=p.parent/'renders/transition-diagnostic.wav'
            if digest(wave)!=previous['wave_sha256']:raise ValueError('Native diagnostic audio changed')
            signal,sr=sf.read(wave,dtype='float32',always_2d=True);windows=[];start=0
            for row in previous['results']:
                index=row['index'];design=report['transitions'][index]['arrangement_design']
                duration=design['mix_end_seconds']-design['mix_start_seconds']
                windows.append((index,start,duration));start+=duration+.5
            def one(window):
                index,start,duration=window;join=report['transitions'][index];d=join['arrangement_design']
                x=signal[round(start*sr):round((start+duration)*sr)]
                try:check=check_window(x,sr,join['incoming_bpm'],d['handover_seconds']-d['mix_start_seconds'],len(x)/sr-1/sr,d.get('variable_beat_times'))
                except ValueError as error:check={'status':'failed','reason':str(error)}
                if check['status']!='checked' and not d.get('variable_beat_times'):
                    try:refined=template_check(x,sr,join['incoming_bpm'],d['handover_seconds']-d['mix_start_seconds'])
                    except ValueError as error:refined={'status':'failed','reason':str(error)}
                    if refined['status']=='checked':check={**refined,'full_mix_attack_screen':check}
                    else:check['own_recording_template_screen']=refined
                return index,{**check,'native_wave_sha256':previous['wave_sha256']}
            with ThreadPoolExecutor(max_workers=3) as pool:results=list(pool.map(one,windows))
            for index,check in results:
                if index in seen:raise ValueError('Repeated diagnostic window in native cache')
                seen.add(index);report['transitions'][index]['arrangement_design']['realized_timing']=check
                checks.append({'index':index,**check})
            print('RECHECKED native windows',len(seen),flush=True)
    expected={i for i,j in enumerate(report['transitions']) if j['kind']!='programme_boundary'}
    if seen!=expected:raise ValueError('Incomplete native diagnostic cache')
    write_json(report_path,report)
    result={'complete':all(c['status']=='checked' for c in checks),'checks':checks,'mix_plan_sha256':digest(report_path),
            'implementation_sha256':{n:digest(Path(__file__).with_name(n)) for n in ['audit_single_lead.py','template_native_audit.py','reaudit_saved_native.py']}}
    write_json(output,result);print('NATIVE RECHECK failures',sum(c['status']!='checked' for c in checks),flush=True)
    return result


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--mix-plan',type=Path,required=True);p.add_argument('--diagnostics',type=Path,nargs='+',required=True);p.add_argument('--output',type=Path,required=True)
    a=p.parse_args();reaudit(a.mix_plan.resolve(),a.diagnostics,a.output.resolve())
