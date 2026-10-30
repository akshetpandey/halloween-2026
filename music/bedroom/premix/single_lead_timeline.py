"""Single musical leads, native drum support, and explicit reset-tempo bridges."""
from actual_audition import warped_clip
from percussion_bridge import clock as bridge_clock,loops as bridge_loops
from programme_order import shared_tempo
from research_audition import eq,points
from transition_design import SCHEMA


def _handled(item,position,pre=.005):
    rate=(item['stretch_markers'][1]['source']-item['stretch_markers'][0]['source'])/(item['stretch_markers'][1]['position']-item['stretch_markers'][0]['position'])
    if item['source_start']<pre*rate or position<pre:
        item['position']=position;return item
    source=item['source_start']-pre*rate
    item['stretch_markers']=[{'position':0.,'source':source}]+[{'position':p['position']+pre,'source':p['source']} for p in item['stretch_markers']]
    item.update(source_start=source,position=position-pre,length=item['length']+pre,fade_in=pre,fade_out=pre)
    return item


def compile_timeline(ordered,tracks,cues,gains):
    by={t['id']:t for t in tracks};definitions=[];details=[];markers=[];tempos=[];bindings=[];end=0.;fresh=[]
    joins=[]
    for a,b in zip(ordered,ordered[1:]):
        ab,bb=[cues[t['id']]['grid']['bpm'] for t in [a,b]]
        if a['programme_role']!=b['programme_role']:
            joins.append({'kind':'programme_boundary','bars':0,'overlap_seconds':0,'loop':None,'incoming_bpm':bb,'outgoing_bpm':ab})
        elif b.get('entry_transition')=='percussion_tempo_bridge':
            bridge=bridge_clock(ab,bb)
            joins.append({'kind':'percussion_tempo_bridge','bars':bridge['bars'],'overlap_seconds':bridge['duration_seconds'],
                          'incoming_bpm':bb,'outgoing_bpm':ab,'loop':None,'bridge_clock':bridge,
                          'reason':'Explicit recovery/reserve tempo change on isolated percussion; original leads remain at restrained rates'})
        else:
            bpm=shared_tempo(ab,bb)
            if bpm is None:raise ValueError('Ordinary join cannot meet source rate limits')
            joins.append({'kind':'single_lead_bass_swap','bars':16,'overlap_seconds':16*240/bpm,
                          'incoming_bpm':bpm,'outgoing_bpm':bpm,'loop':None,
                          'reason':'Own drums support a phrase-timed exchange of full musical leads'})
    for i,entry in enumerate(ordered):
        ident=entry['id'];t=by[ident];cue=cues[ident];bpm=cue['grid']['bpm'];body=cue['body'];parts={p['role']:p for p in cue['parts']}
        before=joins[i-1] if i else None;after=joins[i] if i<len(joins) else None
        normal_before=bool(before and before['kind']=='single_lead_bass_swap');normal_after=bool(after and after['kind']=='single_lead_bass_swap')
        musical_after=bool(after and after['kind']!='programme_boundary')
        body_end=body['body_end'] if musical_after else body['end']
        beats=round((body_end-body['start'])*bpm/60)
        if beats%4 or abs(beats-(body_end-body['start'])*bpm/60)>.0001:raise ValueError('Body must contain complete source bars')
        prefix=32 if normal_before else 0;tail=32 if normal_after else 0;total=prefix+beats+tail
        incoming=before['incoming_bpm'] if normal_before else bpm;outgoing=after['outgoing_bpm'] if normal_after else bpm
        item,tmp,rates=warped_clip(body['start'],beats,bpm,prefix,total,incoming,outgoing,min(64,max(16,(total-4)//4*2)))
        main_start=end+(before['bridge_clock']['duration_seconds'] if before and before['kind']=='percussion_tempo_bridge' else 0)
        main_end=main_start+item['length'];item=_handled(item,main_start)
        indices=[]
        def add(kind,path,sha,clips,volume,bands,label):
            indices.append(len(definitions));definitions.append({'name':f'{i+1:03d} · {t["artist"]} · {label}','path':path,'sha256':sha,
                'gain_db':gains[ident],'clips':clips,'volume':volume,'eq_bands':bands})
            bindings.append({'parent_id':ident,'parent_sha256':t['sha256'],'sha256':sha,'kind':kind})
        volume=points([(0,1),(main_end,1)],'amplitude') if musical_after else points([(0,1),(max(main_start,main_end-8),1),(main_end,0)],'amplitude')
        add('original',t['path'],t['sha256'],[item],volume,eq([(0,0)],[(0,0)],[(0,0)]),t['title'])
        tempos.extend({'time':main_start+p['time'],'bpm':p['bpm']} for p in tmp)
        start=main_start
        if normal_before:
            part=parts['intro'];duration=32*60/incoming;start=main_start-duration;clips=[]
            for n in range(2):
                c,_,_=warped_clip(part['offset'],16,bpm,n*16,total,incoming,outgoing,64)
                clips.append(_handled(c,start+n*16*60/incoming))
            add('drums',part['path'],part['sha256'],clips,
                points([(0,0),(start,0),(start+duration*.65,.7),(main_start,.7)],'amplitude'),
                eq([(0,-24)],[(0,-6)],[(0,-6),(start,-6),(main_start,-3)]),'drum intro')
        if normal_after:
            part=parts['intro'];clips=[]
            for n in range(2):
                c,_,_=warped_clip(part['offset'],16,bpm,prefix+beats+n*16,total,incoming,outgoing,64)
                clips.append(_handled(c,main_end+n*16*60/outgoing))
            stop=main_end+32*60/outgoing
            add('drums',part['path'],part['sha256'],clips,points([(0,.7),(main_end,.7),(stop,0)],'amplitude'),
                eq([(0,-24)],[(0,-3),(stop,-6)],[(0,-3),(stop,-6)]),'outgoing drum tail')
        else:stop=main_end
        if min(rates)<.97 or max(rates)>1.03:raise ValueError('Original musical body exceeds source rate limits')
        markers.append({'time':main_start,'name':t['artist']+' · '+t['title']});fresh.append([main_start,main_end])
        details.append({**entry,'artist':t['artist'],'title':t['title'],'lane':t.get('lane'),'source_sha256':t['sha256'],'source_bpm':bpm,
            'start_seconds':start,'main_start_seconds':main_start,'main_end_seconds':main_end,'end_seconds':stop,
            'incoming_bpm':incoming,'outgoing_bpm':outgoing,'ranges':[[body['start'],body_end]],'removed_repeats':[],
            'grid':cue['grid'],'rate_range':[min(rates),max(rates)],'gain_db':gains[ident],'native_component_indices':indices,
            'loop_bridge':None,'vocal_evidence_available':True,'phrase_alignment':{'entry':body['phrase'],'exit':body['phrase']},'intro_loop_bars':8 if normal_before else 0})
        end=main_end
    for i,j in enumerate(joins):
        if j['kind']=='programme_boundary':continue
        a,b=details[i:i+2];ca,cb=cues[a['id']],cues[b['id']]
        base={'schema':SCHEMA,'source_sha256':[a['source_sha256'],b['source_sha256']],
              'review_state':'Host-approved single-lead/performance techniques; individual source cues inferred',
              'phrase_cues':[{'deck':'outgoing','source_seconds':ca['body']['body_end'],'event':'complete source phrase; musical lead clears',
                             'evidence':'Local physical clock plus recurrent stem-section phase; support uses isolated drums'},
                            {'deck':'incoming','source_seconds':cb['body']['start'],'event':'main rhythmic source entry',
                             'evidence':'Local physical clock, section/low-band activity; incoming full musical lead enters at its selected source cue'}],
              'incoming_bass_present_at_swap':True,'unintended_breakdown':False,'realized_timing':{'status':'pending'},'human_verified':False}
        if j['kind']=='single_lead_bass_swap':
            if abs(a['main_end_seconds']-b['main_start_seconds'])>.00001:raise ValueError('Ordinary musical handover has a gap/overlap')
            base.update(lead_schedule=[{'start_beat':0,'end_beat':32,'primary':'outgoing','supporting_audio':'Incoming own drums only'},
                                       {'start_beat':32,'end_beat':64,'primary':'incoming','supporting_audio':'Outgoing own low-cut drums only'}],
                        bass_swap_beat=32,handover_seconds=a['main_end_seconds'],mix_start_seconds=b['start_seconds'],mix_end_seconds=a['end_seconds'])
        else:
            clock=j['bridge_clock'];times=clock['beat_times'];start=a['main_end_seconds'];stop=b['main_start_seconds'];middle=start+times[len(times)//2]
            for deck,detail,cue,role,loop_beats in [('outgoing',a,ca,'intro',16),('incoming',b,cb,'intro',16)]:
                part=next(p for p in cue['parts'] if p['role']==role);incoming_deck=deck=='incoming'
                clips=[_handled(c,c['position']) for c in bridge_loops(part,detail['source_bpm'],times,loop_beats,start)]
                low=[(0,-24),(middle-.01,-24),(middle+.01,0),(stop,0)] if incoming_deck else [(0,0),(middle-.01,0),(middle+.01,-24),(stop,-24)]
                vol=[(0,0),(start,0),(start+times[8],.8),(stop,.8)] if incoming_deck else [(0,.8),(start,.8),(middle,.7),(stop,0)]
                definitions.append({'name':f'Reset {i+1} · {deck} drums','path':part['path'],'sha256':part['sha256'],
                                    'gain_db':gains[detail['id']],'clips':clips,'volume':points(vol,'amplitude'),
                                    'eq_bands':eq(low,[(0,-3)],[(0,-3)])})
                bindings.append({'parent_id':detail['id'],'parent_sha256':detail['source_sha256'],'sha256':part['sha256'],'kind':'drums'})
                detail['native_component_indices'].append(len(definitions)-1)
            b['start_seconds']=start;a['end_seconds']=stop
            tempos.extend({'time':start+t,'bpm':v} for t,v in zip(times,clock['tempos']))
            base.update(lead_schedule=[{'start_beat':0,'end_beat':clock['bars']*4,'primary':'percussion','supporting_audio':'Both musical leads excluded; own isolated drum loops share one explicit tempo map'}],
                        bass_swap_beat=clock['bars']*2,handover_seconds=middle,mix_start_seconds=start,mix_end_seconds=stop,
                        variable_beat_times=times,percussion_only=True,drum_rate_limit=[.8,1.25])
        j['arrangement_design']=base
    covered=sum(b-a for a,b in fresh);bridge_seconds=sum(j['bridge_clock']['duration_seconds'] for j in joins if j['kind']=='percussion_tempo_bridge')
    if abs(covered+bridge_seconds-end)>.001:raise ValueError('Unaccounted artificial runtime')
    return {'definitions':definitions,'details':details,'joins':joins,'markers':markers,'tempo_map':sorted(tempos,key=lambda p:p['time']),
            'end':end,'fresh_seconds':covered,'native_source_bindings':bindings}
