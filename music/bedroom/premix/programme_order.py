"""Hard-rave runs and bounded recovery periods; source Keeps remain authoritative."""
import math

WAVES=[('01 Entry and first hard run',65,8.8,153),('02 Reset',10,6.6,147),
       ('03 Hard run',55,9.3,159),('04 Reset',15,6.8,148),
       ('05 Midnight rave and DnB',55,9.6,170),('06 Reset',15,7.0,153),
       ('07 Hard run through rollback',60,9.4,160),('08 Reset',15,6.8,149),
       ('09 Hard run',55,9.3,159),('10 Long reset',20,6.4,145),
       ('11 Hard run',45,9.3,159),('12 Reset',10,7.0,151),('13 Finale',30,9.7,163)]


def shared_tempo(a,b):
    value=math.sqrt(a*b)
    if not all(.97<=value/x<=1.03 for x in [a,b]):return None
    return value


def artists(track):
    return set(track.get('artist_ids') or [a.strip().casefold() for a in track['artist'].split(',')])


def dnb(track):
    lane=track.get('lane','').lower()
    return 'drum' in lane and ('bass' in lane or 'dnb' in lane)


def pressure(track,metadata):
    """Editorial/catalog proxy, not a measured audience response or loudness."""
    lane=track.get('lane','').lower();speed=max(0,min(1,(track['bpm']-125)/50))
    style=.95 if 'hard techno' in lane or dnb(track) else .85 if 'hard' in lane or 'psy' in lane else .75 if 'acid' in lane else .6 if 'trance' in lane else .5 if 'techno' in lane else .35
    value=metadata.get(track['id'],{}).get('catalog_analysis',{}).get('features',{}).get('energy',{})
    energy=value.get('value',.85) if isinstance(value,dict) else .85
    return 4+6*(.4*speed+.45*style+.15*float(energy))


def order(tracks,cues,metadata,waves=WAVES):
    by={t['id']:{**t,'bpm':cues[t['id']]['grid']['bpm']} for t in tracks if t['id'] in cues}
    lengths={i:cues[i]['body']['body_end']-cues[i]['body']['start'] for i in by}
    levels={i:pressure(t,metadata) for i,t in by.items()}
    left=set(by);result=[];elapsed=0;diagnostics=[]
    # Leave a continuous tempo ladder for the separate reserve programme.
    protected=set()
    for target in range(125,146,5):
        options=[i for i,t in by.items() if abs(t['bpm']-target)<=1.1 and not dnb(t)]
        if options:protected.add(min(options,key=lambda i:(levels[i],-lengths[i],i)))
    # Reserve the closing chain first, so earlier peaks cannot consume every
    # hard track or tempo bridge needed for a strong finish.
    finale=[];finale_seconds=0.;finale_previous=None
    final_minutes=waves[-1][1]
    while finale_seconds<final_minutes*60-45:
        options=[];target=155+5*min(1,finale_seconds/max(1,final_minutes*60*.6))
        for ident in left-protected-set(finale):
            t=by[ident]
            if not 150<=t['bpm']<=162 or dnb(t):continue
            if finale_previous is None and abs(t['bpm']-155)>2.5:continue
            if finale_previous and (shared_tempo(by[finale_previous]['bpm'],t['bpm']) is None or artists(by[finale_previous])&artists(t)):continue
            repeated=sum(bool(artists(t)&artists(by[j])) for j in finale[-8:])
            options.append((.04*(t['bpm']-target)**2+2*(levels[ident]-9.6)**2+3*repeated,ident))
        if not options:raise ValueError('Insufficient source variety for a protected hard finale')
        _,ident=min(options);finale.append(ident);finale_previous=ident;finale_seconds+=lengths[ident]
    protected.update(finale)
    dnb_ids={i for i,t in by.items() if dnb(t)}
    rave_entry=rave_exit=None
    if dnb_ids:
        median=sorted(by[i]['bpm'] for i in dnb_ids)[len(dnb_ids)//2]
        bridges=sorted([i for i,t in by.items() if not dnb(t) and i not in protected and shared_tempo(t['bpm'],median) is not None],key=lambda i:(by[i]['bpm'],-levels[i],i))
        if len(bridges)<2:raise ValueError('DnB needs distinct, source-qualified entry and exit bridges')
        rave_entry=bridges[0]
        rave_exit=next((i for i in bridges[1:] if not artists(by[i])&artists(by[rave_entry])),bridges[1])
        protected.update([rave_entry,rave_exit])
    last_reset=[];last_reset_seconds=0.
    if len(waves)>1 and 'reset' in waves[-2][0].lower():
        for target in [160,155,150]:
            options=[i for i in left-protected-set(last_reset) if not dnb(by[i]) and abs(by[i]['bpm']-target)<=5.1
                     and (not last_reset or (shared_tempo(by[last_reset[-1]]['bpm'],by[i]['bpm']) is not None and not artists(by[last_reset[-1]])&artists(by[i])))
                     and (target!=150 or (shared_tempo(by[i]['bpm'],by[finale[0]]['bpm']) is not None and not artists(by[i])&artists(by[finale[0]])))]
            if not options:raise ValueError('No protected final recovery ladder')
            near=[i for i in options if abs(by[i]['bpm']-target)<=1.5]
            ident=min(near or options,key=lambda i:(.04*(by[i]['bpm']-target)**2+.5*(levels[i]-6.8)**2+abs(lengths[i]-160)/180,i))
            last_reset.append(ident);last_reset_seconds+=lengths[ident]
        while last_reset_seconds<max(300,waves[-2][1]*60-45):
            options=[i for i in left-protected-set(last_reset) if not dnb(by[i]) and 148<=by[i]['bpm']<=153
                     and shared_tempo(by[last_reset[-1]]['bpm'],by[i]['bpm']) is not None and not artists(by[last_reset[-1]])&artists(by[i])
                     and shared_tempo(by[i]['bpm'],by[finale[0]]['bpm']) is not None and not artists(by[i])&artists(by[finale[0]])
                     and last_reset_seconds+lengths[i]<=1200]
            if not options:break
            ident=min(options,key=lambda i:(levels[i],abs(last_reset_seconds+lengths[i]-waves[-2][1]*60),i))
            last_reset.append(ident);last_reset_seconds+=lengths[ident]
        if not 300<=last_reset_seconds<=1200:raise ValueError('Protected final reset cannot meet 5–20 minutes')
        protected.update(last_reset)
    for wi,(name,minutes,goal,bpm) in enumerate(waves):
        if wi==len(waves)-2 and last_reset:
            if result and (shared_tempo(by[result[-1]['id']]['bpm'],by[last_reset[0]]['bpm']) is None or artists(by[result[-1]['id']])&artists(by[last_reset[0]])):
                raise ValueError('Last hard run cannot enter the protected final reset: '+str((by[result[-1]['id']]['artist'],by[result[-1]['id']]['bpm'],by[last_reset[0]]['artist'],by[last_reset[0]]['bpm'])))
            for ident in last_reset:
                result.append({'id':ident,'programme_chapter':name,'programme_role':'party','pressure_proxy':levels[ident]})
                left.remove(ident);elapsed+=lengths[ident]
            continue
        if wi==len(waves)-1:
            if result:
                prior=by[result[-1]['id']];following=by[finale[0]]
                if shared_tempo(prior['bpm'],following['bpm']) is None or artists(prior)&artists(following):
                    raise ValueError('Last reset cannot enter the protected finale')
            for ident in finale:
                result.append({'id':ident,'programme_chapter':name,'programme_role':'party','pressure_proxy':levels[ident]})
                left.remove(ident);elapsed+=lengths[ident]
            break
        start=elapsed;count=0;reset='Reset' in name or 'reset' in name
        while elapsed-start<minutes*60-45:
            current=by[result[-1]['id']] if result else None
            spent=elapsed-start;fraction=spent/(minutes*60)
            target=bpm
            if reset:
                # The return toward the next hard run is part of the reset,
                # rather than a surprise tempo jump at a chapter boundary.
                target=bpm+5*max(0,(fraction-.55)/.45)
            if 'Midnight' in name:
                target=160 if fraction<.2 else 173 if fraction<.8 else 165
            local_goal=goal
            if wi==0:
                target=135+20*min(1,spent/900)
                local_goal=7.5+(goal-7.5)*min(1,spent/900)
            options=[]
            admissible=set(left-protected)
            dnb_started=any(dnb(by[r['id']]) for r in result if r['programme_chapter']==name)
            dnb_closed=dnb_started and rave_exit is not None and rave_exit not in left
            if dnb_closed:target=160
            available_dnb=[j for j in left&dnb_ids if current is None or (shared_tempo(current['bpm'],by[j]['bpm']) is not None and not artists(current)&artists(by[j]))]
            if 'Midnight' in name:
                if rave_entry in left:admissible.add(rave_entry)
                if dnb_started and not available_dnb and rave_exit in left:admissible.add(rave_exit)
            for ident in admissible:
                t=by[ident]
                minimum=132 if wi==0 and spent<900 else 138
                if t['bpm']<minimum:continue
                if dnb(t) and ('Midnight' not in name or dnb_closed):continue
                if 'Midnight' in name and dnb_closed and t['bpm']>165:continue
                if current and (shared_tempo(current['bpm'],t['bpm']) is None or artists(current)&artists(t)):continue
                predicted=spent+lengths[ident]
                if reset and predicted>20*60:continue
                if wi==len(waves)-2 and predicted>=minutes*60-45:
                    following=by[finale[0]]
                    if shared_tempo(t['bpm'],following['bpm']) is None or artists(t)&artists(following):continue
                if current:
                    degree=sum(shared_tempo(t['bpm'],by[j]['bpm']) is not None and not artists(t)&artists(by[j]) for j in left if j!=ident)
                    if degree==0 and sum(lengths[j] for j in left)>300:continue
                recent=[r['id'] for r in result[-9:]]
                repetition=sum(bool(artists(t)&artists(by[j])) for j in recent)
                score=.025*(t['bpm']-target)**2+1.2*(levels[ident]-local_goal)**2+3*repetition
                if 'Midnight' in name:
                    if .2<=fraction<.8:score+=0 if dnb(t) else 4
                    elif dnb(t):score+=6
                    if dnb_started and not dnb_closed and available_dnb and not dnb(t):score+=30
                if reset and dnb(t):score+=30
                score+=max(0,predicted-minutes*60)/120
                if spent>=minutes*60-300:score+=1.5*abs(predicted-minutes*60)/60
                options.append((score,ident))
            if not options:
                diagnostics.append({'wave':name,'elapsed_minutes':spent/60,'reason':'No admissible next track without breaking source/tempo/artist constraints'})
                break
            _,ident=min(options)
            if count and spent>=minutes*60*.85 and (not reset or spent>=300) and abs(spent-minutes*60)<=abs(spent+lengths[ident]-minutes*60):
                break
            result.append({'id':ident,'programme_chapter':name,'programme_role':'party','pressure_proxy':levels[ident]})
            left.remove(ident);elapsed+=lengths[ident];count+=1
        if reset and elapsed-start<5*60:
            raise ValueError('Cannot establish a five-minute recovery period: '+name)
        if elapsed-start<max(5,minutes*.65)*60:
            raise ValueError('Insufficient admissible source material for wave: '+name+f' ({(elapsed-start)/60:.1f} minutes; last {by[result[-1]["id"]]["bpm"]:.1f} BPM)')
    party_estimate=elapsed
    # Reserve starts independently after the event's completed finale. It is
    # deliberately not a forced in-set cut from the final rave track.
    previous=None
    while left:
        options=[]
        for ident in left:
            t=by[ident]
            if previous and (shared_tempo(by[previous]['bpm'],t['bpm']) is None or artists(by[previous])&artists(t)):continue
            repeat=sum(bool(artists(t)&artists(by[r['id']])) for r in result[-6:] if r['programme_role']=='reserve')
            score=t['bpm'] if previous is None else abs(t['bpm']-by[previous]['bpm'])+repeat*10
            options.append((score,ident))
        if not options:break
        _,ident=min(options);left.remove(ident);previous=ident
        result.append({'id':ident,'programme_chapter':'90 Prepared reserve','programme_role':'reserve','pressure_proxy':levels[ident]})
        elapsed+=lengths[ident]
    return result,{'estimated_party_seconds':party_estimate,'estimated_total_seconds':elapsed,'omitted_ids':sorted(left),'waves':waves,'diagnostics':diagnostics,
                   'pressure_note':'Editorial tempo/style/catalog proxy, not sensed floor response or an objective perceptual-energy measurement'}
