"""Explicit beat maps for source-bound, percussion-only reset tempo changes."""
import math


def clock(outgoing,incoming,bars=None):
    if not all(math.isfinite(v) and 80<=v<=200 for v in [outgoing,incoming]):raise ValueError('Invalid bridge tempo')
    if max(outgoing,incoming)/min(outgoing,incoming)>1.25:raise ValueError('Percussion bridge exceeds bounded rate range')
    bars=bars or (8 if max(outgoing,incoming)/min(outgoing,incoming)<1.1 else 16)
    if bars not in (8,16):raise ValueError('Bridge requires 8 or 16 complete bars')
    beats=bars*4;times=[0.];tempos=[]
    for n in range(beats):
        fraction=max(0,min(1,(n+.5-8)/(beats-16)))
        bpm=outgoing+(incoming-outgoing)*fraction
        tempos.append(bpm);times.append(times[-1]+60/bpm)
    return {'bars':bars,'beat_times':times,'tempos':tempos,'duration_seconds':times[-1]}


def loops(part,source_bpm,beat_times,loop_beats,position=0):
    if loop_beats not in (16,32) or (len(beat_times)-1)%loop_beats:raise ValueError('Incomplete percussion loop map')
    clips=[]
    for first in range(0,len(beat_times)-1,loop_beats):
        start=beat_times[first];end=beat_times[first+loop_beats]
        markers=[{'position':beat_times[first+j]-start,'source':part['offset']+j*60/source_bpm} for j in range(loop_beats+1)]
        clips.append({'source_start':part['offset'],'position':position+start,'length':end-start,
                      'rate':1,'fade_in':.004,'fade_out':.004,'stretch_markers':markers})
    return clips
