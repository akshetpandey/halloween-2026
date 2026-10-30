"""Source-event selection for the host-approved, single-lead mixing pattern.

Stem activity and arrangement cues are inferred. They are not lyric recognition,
verified musical bars, or a listening-quality certification.
"""
import math


def phrase_phase(profile,phase,bpm,bar_class):
    """Recurrent 8-bar section-change phase; a heuristic, not certainty."""
    import numpy as np
    p=60/bpm;times=np.asarray(profile['times'])
    values=np.column_stack([np.clip(profile[k],-60,0) for k in ['drums_db','bass_db','lead_db']])
    novelty={}
    for i in range(5,len(times)-5):
        if max(np.diff(times[i-5:i+6]))>p*1.1:continue
        number=round((times[i]-phase)/p)
        novelty[number]=float(np.linalg.norm(values[i:i+4].mean(0)-values[i-4:i].mean(0)))
    bars={}
    for n in novelty:
        if (n-bar_class)%4:continue
        bars[(n-bar_class)//4]=max(novelty.get(n+j,0) for j in [-1,0,1])
    salient=[(n,v) for n,v in bars.items() if v>=6 and v>=max(bars.get(n+j,0) for j in [-2,-1,1,2])]
    scores=[sum(v for n,v in salient if n%8==i) for i in range(8)]
    selected=max(range(8),key=lambda i:(scores[i],-i));total=sum(scores)
    return {'phase_bars':selected,'support':scores[selected]/total if total else 0,
            'supporting_changes':sum(n%8==selected for n,_ in salient),'human_verified':False,
            'method':'Stem-activity section changes, local maxima with one-beat tolerance; recurrent eight-bar phase'}


def select_body(profile,phase,bpm,duration,bar_class=0):
    """Keep the main rhythmic material; remove weak entry/exit padding.

    A sustained lead plus rhythm identifies useful material. Quantization uses
    the dominant source section-change phase, rather than a presumed eight-bar
    phase inherited from the old analyzer's arbitrary anchor.
    """
    import numpy as np
    times=np.asarray(profile['times']);drums=np.asarray(profile['drums_db']);bass=np.asarray(profile['bass_db']);lead=np.asarray(profile['lead_db'])
    period=60/bpm
    if len(times)<32 or not np.all(np.isfinite(np.concatenate([times,drums,bass,lead]))):
        raise ValueError('Insufficient finite section profile')
    from scipy.ndimage import uniform_filter1d
    # A staccato note is still a musical lead. Smooth power over a bar before
    # asking whether a section is active; do not require sustained singing.
    def bar_power(db):return 10*np.log10(np.maximum(1e-12,uniform_filter1d(10**(db/10),size=4,mode='nearest')))
    drums,bass,lead=[bar_power(v) for v in [drums,bass,lead]]
    drum_floor=max(-42,float(np.percentile(drums,85))-9)
    bass_floor=max(-48,float(np.percentile(bass,85))-12)
    melodic=float(np.percentile(lead-drums,85))>-19
    lead_floor=max(-48,float(np.percentile(lead,85))-12)
    bass_present=float(np.percentile(bass,85))>-45
    rhythmic=(drums>=drum_floor)&((bass>=bass_floor) if bass_present else True)
    relative_floor=min(-14.,float(np.percentile(lead-drums,85))-3)
    main=rhythmic&(((lead>=lead_floor)&(lead-drums>=relative_floor)) if melodic else True)
    first=np.flatnonzero(main&(times<min(75,duration*.45)))
    last=np.flatnonzero(main&(times>max(0,duration-75)))
    if not len(first) or not len(last):raise ValueError('No supported first/last main rhythmic region')
    # Require a short run, not one cymbal transient. A run may contain one rest.
    first_candidates=[i for i in first if np.mean(main[i:min(len(main),i+8)])>=.75
                      and max(np.diff(times[i:min(len(times),i+8)]),default=0)<=period*1.1]
    if not first_candidates:raise ValueError('No sustained main entry')
    first_index=first_candidates[0]
    # Full-mix intros that are already active start at the first audible beat.
    opening=first_index<=12
    if opening:start=phase+bar_class*period
    else:
        lo=max(1,first_index-8);hi=min(len(times)-4,first_index+2)
        novelty=[]
        for i in range(lo,hi):
            # Stem steps locate a real structural event. Avoid treating a
            # detector's downbeat confidence as semantic phrase verification.
            before=np.array([np.mean(v[max(0,i-4):i]) for v in [drums,bass,lead]])
            after=np.array([np.mean(v[i:i+4]) for v in [drums,bass,lead]])
            novelty.append((float(np.linalg.norm(after-before)),i))
        _,selected=max(novelty)
        number=round((times[selected]-phase)/period)
        number=bar_class+4*round((number-bar_class)/4)
        start=phase+number*period
    bar=period*4
    phrasing=phrase_phase(profile,phase,bpm,bar_class)
    phrase_anchor=phase+bar_class*period+phrasing['phase_bars']*bar
    if not opening:
        start=max(phase+bar_class*period,phrase_anchor+math.floor((start-phrase_anchor)/(8*bar))*8*bar)
    final_main=float(times[last[-1]]+period)
    # Complete an eight-bar source phrase, then reserve eight real source bars
    # for the drums-only outgoing tail; never manufacture additional runtime.
    body_end=phrase_anchor+math.ceil((final_main-phrase_anchor)/(8*bar)-1e-7)*8*bar
    natural_end=phrase_anchor+math.floor((duration-phrase_anchor-.05)/(8*bar))*8*bar
    body_end=min(body_end,natural_end-8*bar)
    end=body_end+8*bar
    if body_end-start<32*bar:raise ValueError('Too little supported body after intro/outro preparation')
    return {'start':float(start),'body_end':float(body_end),'end':float(end),
            'outro_bars':8,'phrase':phrasing,'melodic_activity_present':bool(melodic),'entry_is_source_opening':bool(opening),
            'evidence':{'first_main_seconds':float(times[first_index]),'last_main_seconds':final_main,
                        'drum_activity_floor_dbfs':drum_floor,'bass_activity_floor_dbfs':bass_floor,
                        'lead_activity_floor_dbfs':lead_floor},'human_verified':False,
            'method':'Sustained local stem activity and section change; complete 8-bar phrases, estimated 4/4'}


def select_cycle(drums,sr,grid,window_start,body_start):
    """Choose four complete bars of separated drums, with coherent attacks."""
    import numpy as np
    from drum_cues import attack_phase
    p=60/grid['bpm'];bar=4*p;candidates=[]
    # All cycles share the body event's bar phase, including its subdivisions.
    first=math.ceil((window_start+2-body_start)/bar)
    last=math.floor((window_start+len(drums)/sr-2-body_start)/bar)-4
    for i in range(first,last+1):
        a=body_start+i*bar;b=a+4*bar
        x=drums[round((a-window_start)*sr):round((b-window_start)*sr)]
        # Six-second 4-bar loops can be too short for attack_phase's eight-second
        # gate; evaluate a doubled copy without claiming extra source evidence.
        doubled=np.concatenate([x,x])
        try:cue=attack_phase(doubled,sr,grid['bpm'],a)
        except ValueError:continue
        if cue['weighted_support']<.3 or cue['attack_coverage']<.4:continue
        levels=[10*np.log10(max(1e-12,float(np.mean(part**2)))) for part in np.array_split(x,4)]
        if max(levels)-min(levels)>4 or min(levels)<-40:continue
        error=abs((cue['phase_seconds']-grid['phase_seconds']+p/2)%p-p/2)
        if error>.025:continue
        cost=max(levels)-min(levels)+abs(a-body_start)/120
        candidates.append((cost,a,b,cue))
    if not candidates:raise ValueError('No stable source-bound four-bar drum cycle')
    _,a,b,cue=min(candidates,key=lambda x:(x[0],x[1]))
    return {'start':a,'end':b,'bars':4,'cue':cue,'note':'Separated drums only; may repeat under preceding fresh music'}
