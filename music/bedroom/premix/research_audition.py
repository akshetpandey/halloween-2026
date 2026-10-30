#!/usr/bin/env python3
"""Cue-led approved-pair test following TRANSITION-RESEARCH.md; never a final set.

Requires the ignored, source-bound Demucs cue windows. No source discovery,
account changes, device routing, purchases or automatic full-set generation.
"""
import argparse
import json
from pathlib import Path

from analyze_audio import digest,write_json
from plan_mix import eligible,gain_for,retained_loudness,local_key
from prepare import DEFAULT_DB,approved_pool,host_rows,file_key
from reaper_proof import clip,save_plan
from render_set import measure,preview_file,render_native,silence_check
from transition_design import SCHEMA,check_rendered_drums,validate_design

BASE=Path(__file__).resolve().parent
IDS=['hollow-02-005','spotify:track:2qVqEzl038sc3Br5pp9b8K']


def points(values,field='db'):
    return [{'time':t,field:v} for t,v in values]


def eq(low,mid,high):
    return [{'name':name,'band_type':kind,'band_index':0,'frequency_hz':hz,
             'q':.666667 if name=='mid' else .707107,'points':points(values)}
            for name,kind,hz,values in [('low',1,180,low),('mid',2,1200,mid),('high',4,6000,high)]]


def run(state,output):
    import numpy as np
    import soundfile as sf
    output.mkdir(parents=True,exist_ok=True)
    inputs=state/'final-plan/inputs'
    analysis=json.loads((inputs/'analysis.json').read_text());intelligence=json.loads((inputs/'intelligence.json').read_text())
    tracks,evidence,_=eligible(DEFAULT_DB,analysis,intelligence,inputs/'file-map.json')
    selected=[next(t for t in tracks if t['id']==i) for i in IDS]
    grids=[];stems=[];bindings=[]
    for t in selected:
        d=state/'revision-07/cue-stems'/file_key(t['id']);record=json.loads((d/'binding.json').read_text());binding=record['analysis']
        grid_report=json.loads((state/'revision-06/drum-grids'/(file_key(t['id'])+'.json')).read_text())
        if binding['source_sha256']!=t['sha256'] or grid_report['binding']['source_sha256']!=t['sha256']:
            raise ValueError('Stale source cue evidence')
        if grid_report['status']!='cue timing available':raise ValueError('Unresolved local drum grid')
        arrays={}
        for name in ['drums','bass','other','vocals']:
            path=d/(name+'.flac')
            if digest(path)!=record['stem_sha256'][name]:raise ValueError('Cue stem changed')
            arrays[name],sr=sf.read(path,dtype='float32',always_2d=True)
            if sr!=44100:raise ValueError('Unexpected cue stem sample rate')
        stems.append(arrays);grids.append(grid_report['grid']);bindings.append(binding)
    a,b=selected;ga,gb=grids;shared=149.;bar=240/shared
    # All source positions are counted from independently fitted attacks. Model
    # downbeat class is cross-checked against these actual arrangement changes.
    aa=ga['phase_seconds'];ba=gb['phase_seconds'];abar=240/ga['bpm'];bbar=240/gb['bpm']
    a_start=aa+184*abar;a_mix=aa+200*abar;a_handover=aa+216*abar;a_end=aa+224*abar
    b_intro=[ba,ba+16*bbar];b_body=[ba+32*bbar,ba+64*bbar]
    mix=16*bar;swap=32*bar;out_end=40*bar;end=64*bar
    rates=[shared/ga['bpm'],shared/gb['bpm']]
    if any(abs(r-1)>.03 for r in rates):raise ValueError('Excessive tempo change')
    sr=44100
    intro=stems[1]['drums']+stems[1]['bass']
    intro_path=output/'incoming-drums-bass.flac';sf.write(intro_path,intro,sr,subtype='PCM_24')
    tail_path=output/'outgoing-drums.flac';sf.write(tail_path,stems[0]['drums'],sr,subtype='PCM_24')
    regional_keys=[local_key(evidence[a['id']],a_mix,a_handover),local_key(evidence[b['id']],b_body[0],b_body[0]+16*bbar)]
    # The rendered diagnostic retains the two real drum decks in separate
    # channels through the exact production offsets/rates, without mixer EQ.
    diagnostic=[]
    for index,(t,g,s,binding,rate) in enumerate(zip(selected,grids,stems,bindings,rates)):
        signal=np.zeros_like(s['drums']);signal[:,index]=s['drums'].mean(axis=1)
        path=output/f'diagnostic-drums-{index}.flac';sf.write(path,signal,sr,subtype='PCM_24')
        start=a_mix-binding['start'] if index==0 else b_intro[0]
        length=(23 if index==0 else 16)*(240/g['bpm'])
        diagnostic.append({'name':f'Drum timing deck {index+1}','path':str(path),'sha256':digest(path),
                           'gain_db':-6,'clips':[clip(start,start+length,0,rate)]})
    diagnostic[1]['clips'].append(clip(b_body[0],b_body[0]+7*bbar,16*bar,rates[1]))
    allowed_hash={t['id']:t['sha256'] for t in selected}
    def validator():
        current,_=approved_pool(host_rows(DEFAULT_DB));allowed={t['id'] for t in current}
        for t in selected:
            if t['id'] not in allowed or digest(Path(t['path']))!=allowed_hash[t['id']]:
                raise ValueError('Approval or source changed')
    binary=Path('/Applications/REAPER.app/Contents/MacOS/REAPER');profile=BASE/'.local/reaper-resource/reaper.ini'
    diagnostic_plan=save_plan(output/'diagnostic-native','real-drums',diagnostic,23*bar,[],bpm=shared,master_db=-6)
    diagnostic_wave,diagnostic_readback=render_native(diagnostic_plan,output/'diagnostic-native',binary,profile,validator)
    signal,sr=sf.read(diagnostic_wave,dtype='float32',always_2d=True)
    checks=[check_rendered_drums(signal,sr,shared,2,16*bar-1),
            check_rendered_drums(signal,sr,shared,16*bar+1,23*bar-.2)]
    timing={'status':'checked' if all(c['status']=='checked' for c in checks) else 'failed',
            'peak_p95_error_ms':max(c['peak_p95_error_ms'] for c in checks),
            'interdeck_phase_difference_ms':max(c['interdeck_phase_difference_ms'] for c in checks),
            'regions':checks,'note':'Checked before and after the entry-breakdown edit in realized native audio'}
    if timing['status']!='checked':
        write_json(output/'failed-timing.json',timing);raise ValueError('Actual native drum timing failed')
    gains=[gain_for(retained_loudness(t,ranges,output/'loudness-cache')) for t,ranges in zip(selected,[[[a_start,a_end]],[b_intro,b_body]])]
    # Incoming intro has no lead; do not use vocal activity as a proxy for this.
    lead_power=np.mean((stems[1]['other']+stems[1]['vocals'])[round(b_intro[0]*44100):round(b_intro[1]*44100)]**2)
    drum_power=np.mean(stems[1]['drums'][round(b_intro[0]*44100):round(b_intro[1]*44100)]**2)
    lead_ratio=10*np.log10(max(1e-12,lead_power)/max(1e-12,drum_power))
    join={'kind':'bass_swap','bars':24,'overlap_seconds':24*bar,'incoming_bpm':shared,'outgoing_bpm':shared,
        'arrangement_design':{'schema':SCHEMA,'source_sha256':[a['sha256'],b['sha256']],
        'review_state':'unreviewed','bass_swap_beat':64,'incoming_bass_present_at_swap':True,
        'unintended_breakdown':False,'realized_timing':timing,
        'phrase_cues':[{'deck':'outgoing','source_seconds':a_mix,'event':'eight-bar phrase before outro',
                       'evidence':'Model downbeats agree with .077s attack phase; recurring 8-bar vocal pattern ends at 216 bars'},
                      {'deck':'outgoing','source_seconds':a_handover,'event':'lead leaves; percussive outro',
                       'evidence':'Demucs vocal/other reduction and completed repeated vocal phrase'},
                      {'deck':'incoming','source_seconds':b_intro[0],'event':'original 16-bar drum/bass intro',
                       'evidence':'Source drum timing, recurrent 8-bar changes, explicit drums+bass stem edit'},
                      {'deck':'incoming','source_seconds':b_body[0],'event':'bass returns after 16-bar entry breakdown',
                       'evidence':'Low-band power returns by about 25 dB; 32 bars from opening cue'}],
        'lead_schedule':[{'start_beat':0,'end_beat':64,'primary':'outgoing','supporting_audio':'Incoming drums+bass stems; no incoming vocal/other stem'},
                         {'start_beat':64,'end_beat':96,'primary':'incoming','supporting_audio':'Outgoing drums-only stem; outgoing vocal/other/bass stems removed, low EQ cut and fader exit'}],
        'human_verified':False,'regional_keys':regional_keys,'key_policy':'Whole-file key estimates do not prove regional compatibility; separated leads avoid the minor/major conflict'}}
    validate_design(join)
    definitions=[{'name':a['artist']+' · '+a['title'],'path':a['path'],'sha256':a['sha256'],'gain_db':gains[0],
        'clips':[clip(a_start,a_handover,0,rates[0])],
        'volume':points([(0,1),(swap,1)],'amplitude'),
        'eq_bands':eq([(0,0),(swap-.01,0),(swap+.01,-24),(out_end,-24)],
                      [(0,0),(swap,0),(out_end,-12)],
                      [(0,0),(mix,0),(mix+8*bar,-3),(out_end,-6)])},
        {'name':b['artist']+' · prepared drum/bass intro','path':str(intro_path),'sha256':digest(intro_path),'gain_db':gains[1],
         'clips':[clip(*b_intro,mix,rates[1])],
         'volume':points([(0,0),(mix,0),(mix+8*bar,1),(swap,1)],'amplitude'),
         'eq_bands':eq([(0,-24),(swap,-24)],[(0,-3),(swap,-3)],[(0,-6),(mix,-6),(mix+8*bar,0),(swap,0)])},
        {'name':b['artist']+' · '+b['title']+' · original stereo body','path':b['path'],'sha256':b['sha256'],'gain_db':gains[1],
         'clips':[clip(*b_body,swap,rates[1],fade_in=.003,fade_out=.003)],
         'volume':points([(0,1),(end-1,1),(end,0)],'amplitude'),
         'eq_bands':eq([(0,0),(end,0)],[(0,0),(end,0)],[(0,0),(end,0)])},
        {'name':a['artist']+' · outgoing drums-only tail','path':str(tail_path),'sha256':digest(tail_path),'gain_db':gains[0],
         'clips':[clip(a_handover-bindings[0]['start'],a_end-bindings[0]['start'],swap,rates[0])],
         'volume':points([(0,1),(swap,1),(out_end,0)],'amplitude'),
         'eq_bands':eq([(0,-24),(out_end,-24)],[(0,-3),(out_end,-6)],[(0,-3),(out_end,-6)])}]
    markers=[{'time':0,'name':'Outgoing solo'}, {'time':mix,'name':'Incoming drum intro'},
             {'time':swap,'name':'Incoming bass return and lead handover'}, {'time':out_end,'name':'Incoming solo'}]
    plan=save_plan(output/'native','cue-led-transition',definitions,end,markers,bpm=shared,master_db=-6,
                   purpose='Research-led arrangement audition; no musical approval claimed')
    wave,readback=render_native(plan,output/'native',binary,profile,validator)
    meters=measure(wave);silence=silence_check(wave,plan)
    from transition_design import bass_handover_levels
    rendered,render_sr=sf.read(wave,dtype='float32',always_2d=True)
    bass_levels=bass_handover_levels(rendered,render_sr,swap,4*bar)
    if abs(bass_levels['change_db'])>3:raise ValueError('Unexpected low-band energy step at bass handover')
    if silence['unexplained_silences']:raise ValueError('Unexplained silence in research audition')
    gain=min(-16-meters['integrated_lufs'],-2.1-meters['true_peak_dbfs'])
    mp3=output/'Hollow-cue-led-transition.mp3';encoded=preview_file(wave,mp3,0,end,gain)
    report={'schema':'research-audition-1','party_ready':False,'host_review':'unreviewed',
        'track_ids':IDS,'titles':[t['artist']+' — '+t['title'] for t in selected],
        'transition':join,'native_readback':readback,'diagnostic_readback':diagnostic_readback,
        'source_ranges':[[[a_start,a_end]],[b_intro,b_body]],'source_grid':grids,'rates':rates,
        'incoming_intro_edit':'Own drums+bass stems; omitted vocal/other; not looped',
        'outgoing_tail_edit':'Own drums stem; omitted bass/vocal/other at lead handover; not looped',
        'regional_keys':regional_keys,
        'removed_entry_breakdown':[b_intro[1],b_body[0]],'original_intro_lead_to_drums_db':float(lead_ratio),
        'events':markers,'duration_seconds':end,'delivery_gain_db':gain,'delivery_meters':encoded,
        'silence':silence,'bass_handover_levels':bass_levels,'cue_stem_bindings':[json.loads((state/'revision-07/cue-stems'/file_key(t['id'])/'binding.json').read_text()) for t in selected],'mp3':str(mp3),'native_plan':str(output/'native/cue-led-transition-plan.json'),
        'limitations':['No human musical approval','Stem separation can have bleed/artifacts',
                       'Physical output not tested','Source arrangement cues are inferred, not human verified']}
    write_json(output/'research-report.json',report)
    print(json.dumps({k:report[k] for k in ['mp3','duration_seconds','events','delivery_meters']}),flush=True)
    print(json.dumps(timing),flush=True)


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--state',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    args=p.parse_args();run(args.state.resolve(),args.output.resolve())
