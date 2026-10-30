"""Compile source-bound drum support around a single full-stereo musical lead."""
import copy
import math

from actual_audition import warped_clip
from programme_order import shared_tempo
from research_audition import eq,points
from transition_design import SCHEMA


def _handled(item,position,pre=.005):
    """Use a preceding source handle while keeping the musical one in place."""
    rate=(item['stretch_markers'][1]['source']-item['stretch_markers'][0]['source'])/(item['stretch_markers'][1]['position']-item['stretch_markers'][0]['position'])
    if item['source_start']<pre*rate or position<pre:
        item['position']=position;return item
    source=item['source_start']-pre*rate
    item['stretch_markers']=[{'position':0.,'source':source}]+[{'position':p['position']+pre,'source':p['source']} for p in item['stretch_markers']]
    item.update(source_start=source,position=position-pre,length=item['length']+pre,fade_in=pre,fade_out=pre)
    return item


def compile_timeline(ordered,tracks,cues,gains):
    by={t['id']:t for t in tracks};definitions=[];details=[];markers=[];tempos=[];bindings=[];end=0;fresh=[]
    boundaries=[ordered[i]['programme_role']!=ordered[i+1]['programme_role'] for i in range(len(ordered)-1)]
    joins=[]
    for i in range(len(ordered)-1):
        if boundaries[i]:
            joins.append({'kind':'programme_boundary','bars':0,'overlap_seconds':0,'loop':None,
                          'incoming_bpm':cues[ordered[i+1]['id']]['grid']['bpm'],'outgoing_bpm':cues[ordered[i]['id']]['grid']['bpm'],
                          'reason':'Event finale complete; separately indexed optional reserve begins'})
        else:
            bpm=shared_tempo(cues[ordered[i]['id']]['grid']['bpm'],cues[ordered[i+1]['id']]['grid']['bpm'])
            if bpm is None:raise ValueError('Order cannot be blended within the rate limits')
            joins.append({'kind':'single_lead_bass_swap','bars':16,'overlap_seconds':16*240/bpm,
                          'incoming_bpm':bpm,'outgoing_bpm':bpm,'loop':None,
                          'reason':'Own drums introduce the next groove; full musical leads exchange at source phrases, outgoing drums complete the blend'})
    for i,entry in enumerate(ordered):
        ident=entry['id'];track=by[ident];cue=cues[ident];bpm=cue['grid']['bpm'];body=cue['body'];parts={p['role']:p for p in cue['parts']}
        before=joins[i-1] if i else None;after=joins[i] if i<len(joins) else None
        has_before=before and before['kind']!='programme_boundary';has_after=after and after['kind']!='programme_boundary'
        intro_beats=32 if has_before else 0;tail_beats=32 if has_after else 0
        # At an actual programme ending, keep the final original stereo phrase
        # rather than closing on the stem-only support tail.
        body_end=body['body_end'] if has_after else body['end']
        body_beats=round((body_end-body['start'])*bpm/60)
        if body_beats%4 or abs(body_beats-(body_end-body['start'])*bpm/60)>1e-4:raise ValueError('Body no longer contains complete bars')
        total=intro_beats+body_beats+tail_beats
        incoming=before['incoming_bpm'] if has_before else bpm;outgoing=after['outgoing_bpm'] if has_after else bpm
        hold=64 if has_before or has_after else 32
        start=end-(before['overlap_seconds'] if has_before else 0)
        offset=0;local=0;rate_values=[];component_indices=[]
        def add(kind,path,sha,clips,volume,bands,label):
            component_indices.append(len(definitions))
            definitions.append({'name':f'{i+1:03d} · {track["artist"]} · {label}','path':path,'sha256':sha,
                                'gain_db':gains[ident],'clips':clips,'volume':volume,'eq_bands':bands})
            bindings.append({'parent_id':ident,'parent_sha256':track['sha256'],'sha256':sha,'kind':kind})
        if intro_beats:
            prefix=[];part=parts['intro']
            for repeat in range(2):
                item,tmp,rates=warped_clip(part['offset'],16,bpm,offset,total,incoming,outgoing,hold)
                duration=item['length'];item=_handled(item,start+local)
                prefix.append(item);rate_values+=rates
                # The outgoing deck's continuous map owns the overlap tempo.
                local+=duration;offset+=16
            a=start;z=start+local
            add('drums',part['path'],part['sha256'],prefix,
                points([(0,0),(a,0),(a+(z-a)*.65,.7),(z,.7)],'amplitude'),
                eq([(0,-24),(z,-24)],[(0,-6),(z,-6)],[(0,-6),(a,-6),(z,-3)]),'drum intro')
        main_start=start+local
        item,tmp,rates=warped_clip(body['start'],body_beats,bpm,offset,total,incoming,outgoing,hold)
        duration=item['length'];item=_handled(item,main_start);main_end=main_start+duration
        tempos.extend({'time':main_start+p['time'],'bpm':p['bpm']} for p in tmp)
        rate_values+=rates;local+=duration;offset+=body_beats;fresh.append([main_start,main_end])
        volume=points([(0,1),(main_end,1)],'amplitude') if has_after else points([(0,1),(max(main_start,main_end-8),1),(main_end,0)],'amplitude')
        add('original',track['path'],track['sha256'],[item],volume,
            eq([(0,0),(main_end,0)],[(0,0),(main_end,0)],[(0,0),(main_end,0)]),track['title'])
        if tail_beats:
            part=parts['outro'];item,tmp,rates=warped_clip(part['offset'],32,bpm,offset,total,incoming,outgoing,hold)
            duration=item['length'];tail_start=start+local;item=_handled(item,tail_start);local+=duration;rate_values+=rates
            tail_end=start+local
            add('drums',part['path'],part['sha256'],[item],
                points([(0,.7),(tail_start,.7),(tail_end,0)],'amplitude'),
                eq([(0,-24),(tail_end,-24)],[(0,-3),(tail_end,-6)],[(0,-3),(tail_end,-6)]),'outgoing drum tail')
        end=start+local
        if min(rate_values)<.97 or max(rate_values)>1.03:raise ValueError('Timeline exceeds source rate limits')
        markers.append({'time':main_start,'name':track['artist']+' · '+track['title']})
        details.append({**entry,'artist':track['artist'],'title':track['title'],'lane':track.get('lane'),
            'source_sha256':track['sha256'],'source_bpm':bpm,'start_seconds':start,'main_start_seconds':main_start,
            'main_end_seconds':main_end,'end_seconds':end,'incoming_bpm':incoming,'outgoing_bpm':outgoing,
            'ranges':[[body['start'],body_end]],'removed_repeats':[],'grid':cue['grid'],
            'rate_range':[min(rate_values),max(rate_values)],'gain_db':gains[ident],
            'native_component_indices':component_indices,'loop_bridge':None,'vocal_evidence_available':True,
            'phrase_alignment':{'entry':body['phrase'],'exit':body['phrase']},'intro_loop_bars':8 if has_before else 0})
    for i,join in enumerate(joins):
        if join['kind']=='programme_boundary':continue
        a,b=details[i:i+2];ca,cb=cues[a['id']],cues[b['id']]
        if abs(a['main_end_seconds']-b['main_start_seconds'])>.00001:raise ValueError('Musical lead handover has a gap or overlap')
        join['arrangement_design']={'schema':SCHEMA,'source_sha256':[a['source_sha256'],b['source_sha256']],
            'review_state':'Host-approved single-lead technique; this individual join is inferred',
            'phrase_cues':[{'deck':'outgoing','source_seconds':ca['body']['body_end'],'event':'complete source phrase; musical lead leaves',
                           'evidence':'Measured stem section profile and recurrent 8-bar phase; outgoing support is drums only'},
                          {'deck':'incoming','source_seconds':cb['body']['start'],'event':'main rhythmic source phrase; full stereo enters',
                           'evidence':'Measured sustained rhythmic/lead section, fitted local attacks; preceding support is drums only'}],
            'lead_schedule':[{'start_beat':0,'end_beat':32,'primary':'outgoing','supporting_audio':'Incoming separated drums; incoming vocal/other/bass stems excluded'},
                             {'start_beat':32,'end_beat':64,'primary':'incoming','supporting_audio':'Outgoing separated drums, bass EQ attenuated; outgoing vocal/other/bass stems excluded'}],
            'bass_swap_beat':32,'incoming_bass_present_at_swap':True,'unintended_breakdown':False,
            'realized_timing':{'status':'pending'},'human_verified':False,
            'handover_seconds':a['main_end_seconds'],'mix_start_seconds':b['start_seconds'],'mix_end_seconds':a['end_seconds']}
    # Count wall-clock coverage of fresh full-stereo bodies. Drum prefixes are
    # entirely under preceding fresh music; repeated loops cannot extend this.
    covered=0.;last=0.
    for a,b in sorted(fresh):covered+=max(0,b-max(a,last));last=max(last,b)
    if abs(covered-end)>.001:raise ValueError('Intro/tail padding extends beyond fresh musical coverage')
    return {'definitions':definitions,'details':details,'joins':joins,'markers':markers,
            'tempo_map':sorted(tempos,key=lambda p:p['time']),'end':end,'fresh_seconds':covered,'native_source_bindings':bindings}
