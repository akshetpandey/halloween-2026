"""Hard-rave runs, genuine slower resets, and a separately prepared reserve."""
import math

WAVES=[('01 Entry and first hard run',65,8.8,153),('02 Reset',10,6.6,136),
       ('03 Hard run',55,9.3,156),('04 Reset',15,6.8,138),
       ('05 Midnight rave and DnB',55,9.6,166),('06 Reset',15,7.0,139),
       ('07 Hard run through rollback',60,9.4,156),('08 Reset',15,6.8,136),
       ('09 Hard run',55,9.3,155),('10 Long reset',20,6.4,134),
       ('11 Hard run',45,9.3,155),('12 Reset',10,7.0,138),('13 Finale',30,9.7,160)]


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
    left=set(by);result=[];elapsed=0;diagnostics=[];protected=set()
    def allowed(previous,ident,bridge=False):
        if previous is None:return True
        a,b=by[previous],by[ident]
        if artists(a)&artists(b):return False
        if shared_tempo(a['bpm'],b['bpm']) is not None:return True
        return bridge and max(a['bpm'],b['bpm'])/min(a['bpm'],b['bpm'])<=1.25
    def append(ident,name,role='party',bridge=False):
        nonlocal elapsed
        previous=result[-1]['id'] if result and result[-1]['programme_role']==role else None
        if not allowed(previous,ident,bridge):raise ValueError('Unprepared transition in programme order')
        mode='percussion_tempo_bridge' if previous and shared_tempo(by[previous]['bpm'],by[ident]['bpm']) is None else 'single_lead'
        result.append({'id':ident,'programme_chapter':name,'programme_role':role,'pressure_proxy':levels[ident],
                       'entry_transition':mode})
        left.remove(ident);elapsed+=lengths[ident]
    # Protect a high-energy, varied half-hour before the main pool is consumed.
    finale=[];seconds=0;previous=None
    while seconds<waves[-1][1]*60-40:
        target=153+7*min(1,seconds/max(1,waves[-1][1]*45))
        options=[i for i in left-set(finale) if 150<=by[i]['bpm']<=162 and not dnb(by[i]) and allowed(previous,i)]
        if not options:raise ValueError('Insufficient source variety for a protected hard finale')
        ident=min(options,key=lambda i:(.05*(by[i]['bpm']-target)**2+1.5*(levels[i]-9.7)**2+
                                       4*sum(bool(artists(by[i])&artists(by[j])) for j in finale[-8:]),i))
        finale.append(ident);seconds+=lengths[ident];previous=ident
    protected.update(finale)
    dnbs={i for i in left if dnb(by[i])};entry=exit=None
    high={i for i in left-protected if by[i]['bpm']>=164.5 or i in dnbs}
    if dnbs:
        median=sorted(by[i]['bpm'] for i in dnbs)[len(dnbs)//2]
        bridges=[i for i in left-protected-dnbs if shared_tempo(by[i]['bpm'],median) is not None]
        bridges.sort(key=lambda i:(by[i]['bpm'],-lengths[i],i))
        if len(bridges)<2:raise ValueError('DnB requires two source-qualified crossover tracks')
        entry=bridges[0];exit=next((i for i in bridges[1:] if not artists(by[i])&artists(by[entry])),bridges[1])
        protected.update([entry,exit]);protected.update(dnbs)
        protected.update(high)
    def high_chain(previous):
        def search(prior,pending,path,started=False):
            if not pending:return path if by[prior]['bpm']<=166 else None
            pending_dnb=pending&dnbs
            options=[i for i in pending if allowed(prior,i)]
            if started and pending_dnb:options=[i for i in options if i in dnbs]
            if not started and any(by[i]['bpm']>=169 and i not in dnbs for i in pending):
                options=[i for i in options if i not in dnbs]
            options.sort(key=lambda i:(abs(by[i]['bpm']-(174 if i in dnbs else 170)),i))
            for ident in options:
                # One 165-BPM source must remain to leave the fast feature.
                following=pending-{ident}
                if following and not any(by[j]['bpm']<=166 for j in following) and by[ident]['bpm']<=166:continue
                answer=search(ident,following,path+[ident],started or ident in dnbs)
                if answer:return answer
            return None
        answer=search(previous,set(high),[])
        if answer is None:raise ValueError('No coherent complete 165/DnB crossover route')
        return answer
    for wi,(name,minutes,goal,target) in enumerate(waves):
        reset='reset' in name.lower();start=elapsed;count=0
        if wi==len(waves)-1:
            for n,ident in enumerate(finale):append(ident,name,bridge=n==0)
            continue
        midnight='midnight' in name.lower();dnb_done=False
        while elapsed-start<minutes*60-40:
            spent=elapsed-start;previous=result[-1]['id'] if result else None
            # A prepared crossover makes the DnB feature one coherent run.
            if midnight and not dnb_done and spent>=minutes*60*.23:
                for ident in high_chain(previous):append(ident,name)
                dnb_done=True
                continue
            local_target=target
            if wi==0:local_target=135+20*min(1,spent/900)
            if midnight:local_target=160 if not dnb_done else 160
            # Reset boundaries deliberately change tempo on isolated drums.
            # Ordinary bodies still stay within +/-3 percent playback rate.
            bridge=count==0 and wi>0
            options=[]
            for ident in left-protected:
                t=by[ident];bpm=t['bpm']
                if dnb(t):continue
                if reset:
                    if not 125<=bpm<=143:continue
                elif wi==0 and spent<900:
                    if not 132<=bpm<=160:continue
                elif not 144.5<=bpm<=165.5:continue
                if not allowed(previous,ident,bridge):continue
                predicted=spent+lengths[ident]
                if reset and predicted>1200:continue
                # Do not strand the midpoint's crossover by drifting low.
                if midnight and not dnb_done and spent>minutes*60*.15 and not allowed(ident,entry):continue
                repeated=sum(bool(artists(t)&artists(by[r['id']])) for r in result[-9:])
                score=.04*(bpm-local_target)**2+1.2*(levels[ident]-goal)**2+4*repeated
                if reset:score+=.02*(bpm-target)**2
                if spent>minutes*60-300:score+=1.5*abs(predicted-minutes*60)/60
                options.append((score,ident))
            if not options:break
            _,ident=min(options)
            if count and spent>=minutes*60*.85 and (not reset or spent>=300) and abs(spent-minutes*60)<=abs(spent+lengths[ident]-minutes*60):break
            append(ident,name,bridge=bridge);count+=1
        actual=elapsed-start
        diagnostics.append({'wave':name,'fresh_seconds':actual,'target_seconds':minutes*60})
        if reset and not 300<=actual<=1200:raise ValueError('Reset outside 5-20 minutes: '+name)
        if not reset and actual<minutes*60*.85:raise ValueError('Insufficient fast source material for '+name+f': {actual/60:.1f} minutes')
        if midnight and dnbs and not dnb_done:raise ValueError('DnB feature was not placed')
    party=elapsed;previous=None
    # Reserve is a separate ascending programme. An explicit percussion bridge
    # connects any remaining tempo gap; no half-second fallback is available.
    while left:
        options=[i for i in left if allowed(previous,i,True)]
        if not options:
            tail=[]
            while len(tail)<8 and result and result[-1]['programme_role']=='reserve':
                removed=result.pop();tail.append(removed['id']);left.add(removed['id']);elapsed-=lengths[removed['id']]
            prior=result[-1]['id'] if result and result[-1]['programme_role']=='reserve' else None
            def repair(previous,pending):
                if not pending:return []
                choices=sorted((i for i in pending if allowed(previous,i,True)),key=lambda i:(abs(by[i]['bpm']-(by[previous]['bpm'] if previous else 125)),i))
                for ident in choices:
                    rest=repair(ident,pending-{ident})
                    if rest is not None:return [ident]+rest
                return None
            repaired=repair(prior,set(left))
            if repaired is None:raise ValueError('Reserve producer spacing cannot be completed')
            for ident in repaired:append(ident,'90 Prepared reserve','reserve',True)
            break
        ident=min(options,key=lambda i:((by[i]['bpm'] if previous is None else abs(by[i]['bpm']-by[previous]['bpm']))+
                                      8*sum(bool(artists(by[i])&artists(by[r['id']])) for r in result[-6:] if r['programme_role']=='reserve'),i))
        append(ident,'90 Prepared reserve','reserve',True);previous=ident
    return result,{'estimated_party_seconds':party,'estimated_total_seconds':elapsed,'omitted_ids':[],
                   'waves':waves,'diagnostics':diagnostics,'pressure_note':'Editorial tempo/style/catalog proxy; not sensed audience response'}
