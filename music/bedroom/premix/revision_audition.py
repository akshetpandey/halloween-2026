#!/usr/bin/env python3
"""REJECTED Eli Brown/BENNETT audition, preserved for reproducing its failure.

The host rejected this sample. Do not use it as a corrected or production join.
See TRANSITION-RESEARCH.md and research_audition.py for the subsequent approach.
"""
import argparse
import copy
import json
from pathlib import Path

from analyze_audio import digest,write_json
from arrangement import measure_arrangement
from audio_intelligence import join_evidence,vocal_fraction
from drum_cues import attack_phase
from plan_mix import choose_grid,compile_timeline,eligible,gain_for,local_key,retained_loudness
from prepare import DEFAULT_DB,file_key
from reaper_proof import save_plan
from render_set import measure,preview_file,render_native,silence_check,stage_chapter

BASE=Path(__file__).resolve().parent


def audition(state,output):
    import numpy as np
    import soundfile as sf
    inputs=state/'final-plan/inputs'
    analysis=json.loads((inputs/'analysis.json').read_text());intelligence=json.loads((inputs/'intelligence.json').read_text())
    tracks,evidence,_=eligible(DEFAULT_DB,analysis,intelligence,inputs/'file-map.json')
    selected=[next(t for t in tracks if t['id']==ident) for ident in ['hollow-01-031','spotify:track:67aNGns9ZH1jm6nruyzBGU']]
    grids=[];cues=[]
    for t in selected:
        grid=choose_grid(t,evidence[t['id']]);period=60/t['bpm']
        stem=state/'revision-06/drums'/file_key(t['id'])/'drums.wav'
        binding=json.loads((stem.parent/'binding.json').read_text())
        if binding['source_sha256']!=t['sha256'] or digest(stem)!=binding['stem_sha256']:raise ValueError('Drum/source evidence changed')
        signal,sr=sf.read(stem,dtype='float32',always_2d=True)
        start,end=(116,149) if len(grids)==0 else (158,180)
        cue=attack_phase(signal[round(start*sr):round(end*sr)],sr,t['bpm'],start)
        if not cue['usable']:raise ValueError('Drum cue is not coherent enough')
        phase=grid['anchor_seconds']%period
        downs=np.array(evidence[t['id']]['rhythm']['downbeats_seconds'])
        counts=np.bincount(np.rint((downs-phase)/period).astype(int)%4,minlength=4)
        anchor=phase+int(np.argmax(counts))*period
        shift=(cue['phase_seconds']-phase+period/2)%period-period/2
        grid.update(anchor_seconds=float(anchor+shift),notes=grid['notes']+['Audition-only dominant bar class; local drum attack correction; downbeat/phrase remains unverified'])
        grids.append(grid);cues.append({**cue,'model_bar_class_support':float(max(counts)/sum(counts)),'attack_shift_seconds':float(shift),'stem_sha256':binding['stem_sha256']})
        t['arrangement']=measure_arrangement(t,grid,output/'arrangement-cache')
    a,b=selected;ga,gb=grids
    end_a=ga['anchor_seconds']+83*240/a['bpm']
    # Leave a solo ramp between the incoming and outgoing 16-bar holds.
    ranges_a=[[end_a-160*60/a['bpm'],end_a]]
    intro=gb['anchor_seconds']+93*240/b['bpm']
    cycle=[intro,intro+16*60/b['bpm']]
    ranges_b=[cycle,cycle.copy(),[gb['anchor_seconds'],gb['anchor_seconds']+256*60/b['bpm']]]
    if ranges_b[-1][1]>=ranges_b[0][0]:raise ValueError('Intro edit would repeat main-body source time')
    if vocal_fraction(evidence[b['id']]['vocals'],*ranges_b[0])>.01:raise ValueError('Intro edit is not vocal-free')
    keys=[local_key(evidence[a['id']],end_a-64*60/a['bpm'],end_a),local_key(evidence[b['id']],*ranges_b[0]),local_key(evidence[b['id']],*ranges_b[-1])]
    if any(key!=[10,'minor'] for key in keys):raise ValueError('Expected measured B-flat-minor regions')
    shared=(a['bpm']+b['bpm'])/2;overlap=64*60/shared
    join={'kind':'harmonic_blend','bars':16,'overlap_seconds':overlap,'incoming_bpm':shared,'outgoing_bpm':shared,
          'harmonic_cost':0,'local_keys':keys[:2],'cost':0,'loop':None,'mix_style':'dj_blend',
          'reason':'Matched B-flat minor, local drum attacks, 16-bar handover; incoming vocal delayed with its own four-bar vocal-free tail looped twice'}
    prior={'id':a['id'],'retained_source_ranges':ranges_a,'outgoing_bpm':shared,'measured_bpm':a['bpm']}
    incoming={'id':b['id'],'retained_source_ranges':ranges_b,'incoming_bpm':shared,'measured_bpm':b['bpm'],'overlap_seconds':overlap}
    join['vocal_overlap']=join_evidence(prior,incoming,evidence)['simultaneous_vocal_candidate_fraction']
    if join['vocal_overlap'] is None or join['vocal_overlap']>.02:raise ValueError('The revision would overlap lead-vocal candidates')
    choices=[]
    for t,grid,ranges in zip(selected,grids,[ranges_a,ranges_b]):
        voice=evidence[t['id']]['vocals']
        choices.append({'id':t['id'],'grid':grid,'ranges':ranges,'start':ranges[0][0],'end':ranges[-1][1],
                        'removed_repeats':[],'vocal_evidence_available':True,
                        'boundary_vocal_candidates':{'entry':vocal_fraction(voice,ranges[0][0],ranges[0][0]+.35),'exit':vocal_fraction(voice,ranges[-1][1]-.35,ranges[-1][1])}})
    gains={t['id']:gain_for(retained_loudness(t,c['ranges'],output/'loudness-cache')) for t,c in zip(selected,choices)}
    definitions,details,markers,tempos,end=compile_timeline(choices,[join],selected,gains,evidence)
    report={'tracks':details,'transitions':[join],'drum_cues':cues,
            'intro_loop':{'source_range':cycle,'repeat_count':2,'extra_rendered_seconds_excluded_from_unique_runtime':16*60/shared},
            'inputs':{'analysis':str((inputs/'analysis.json').resolve())},'note':'Approved-pair revision audition; not a final set or human listening certification'}
    staged=stage_chapter({'tracks':definitions},report,output/'staging',0,end)
    native=save_plan(output/'native','transition-revision',staged,end,markers,purpose=report['note'],bpm=a['bpm'],master_db=-6,tempo_map=tempos)
    def validator():
        refreshed,_,_=eligible(DEFAULT_DB,analysis,intelligence,inputs/'file-map.json')
        allowed={t['id']:t['sha256'] for t in refreshed}
        if any(allowed.get(t['id'])!=t['sha256'] for t in selected):raise ValueError('Approval/source changed')
    wave,readback=render_native(native,output/'native',Path('/Applications/REAPER.app/Contents/MacOS/REAPER'),BASE/'.local/reaper-resource/reaper.ini',validator)
    meters=measure(wave);silence=silence_check(wave,native)
    if silence['unexplained_silences']:raise ValueError('Unexpected silence in revision audition')
    gain=min(-16-meters['integrated_lufs'],-2.1-meters['true_peak_dbfs'])
    preview_start=max(0,details[1]['start_seconds']-15)
    mp3=output/'Hollow-transition-revision-01.mp3';encoded=preview_file(wave,mp3,preview_start,end-preview_start,gain)
    report.update(rendered=True,party_ready=False,readback=readback,native_meters=meters,delivery_meters=encoded,
                  mp3=str(mp3),duration_seconds=end,delivery_gain_db=gain,silence=silence,
                  source_ranges=[ranges_a,ranges_b],source_keys=keys,human_verified=False,preview_start_seconds=preview_start)
    write_json(output/'revision-report.json',report)
    print(json.dumps({'mp3':str(mp3),'duration':end,'blend_seconds':overlap,'shared_bpm':shared,'key':'Bb minor','simultaneous_vocals':join['vocal_overlap'],'meters':encoded}))
    return report


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--state',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    a=p.parse_args();audition(a.state.resolve(),a.output.resolve())
