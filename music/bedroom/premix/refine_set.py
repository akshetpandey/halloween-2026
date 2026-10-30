"""Conservative model-event timing review and immutable production evidence."""
import copy
import json
from pathlib import Path

from analyze_audio import digest,write_json
from audio_intelligence import beat_evidence
from prepare import approved_pool,file_key,host_rows


def double_time_grid(track,evidence):
    """Interpret a stable half-time onset grid using sustained model tempo.

    This changes musical counting, never playback speed. Retain conservative
    splice restrictions; normal phase support still gates each beatmatched join.
    """
    import numpy as np
    if not track['grid']['usable_constant_grid'] or not 65<track['bpm']<110:return None
    beats=np.asarray(evidence.get('rhythm',{}).get('beats_seconds',[]),float)
    if len(beats)<64 or not np.all(np.isfinite(beats)) or np.any(np.diff(beats)<=0):return None
    tempo=480/(beats[8:]-beats[:-8]);target=track['bpm']*2
    if np.mean(np.abs(tempo-target)/target<.01)<.6:return None
    grid=copy.deepcopy(track['grid']);grid.update(
        period_seconds=60/target,model_only_refinement=True,
        method='Stable independent onset grid counted in double time, corroborated by >=60% of eight-beat model spans within 1%; counting only, phase support still gates joins; interior splices/loops disabled')
    for key in ['first_half_bpm','second_half_bpm']:
        if key in grid:grid[key]*=2
    return {'bpm':target,'anchor':track['grid_anchor_seconds'],'support':float(np.mean(np.abs(tempo-target)/target<.01)),
            'bar_support':None,'grid':grid}


def model_grid(track,evidence,prior=None):
    """Fit a constant grid to quantized model events; reject drift/unstable bars."""
    import numpy as np
    rhythm=evidence.get('rhythm',{});beats=np.asarray(rhythm.get('beats_seconds',[]),float)
    downs=np.asarray(rhythm.get('downbeats_seconds',[]),float)
    if len(beats)<64 or len(downs)<8 or np.any(np.diff(beats)<=0):return None
    prior=float(prior or track['bpm']);period=60/prior
    phase=np.angle(np.mean(np.exp(2j*np.pi*beats/period)))*period/(2*np.pi)
    numbers=np.rint((beats-phase)/period)
    mask=np.abs(beats-(phase+numbers*period))<=.045
    if np.mean(mask)<.95:return None
    for _ in range(3):
        slope,intercept=np.polyfit(numbers[mask],beats[mask],1)
        residual=beats-(intercept+numbers*slope)
        mask=np.abs(residual)<=.03
    support=float(np.mean(mask));bpm=60/slope
    if support<.95 or abs(bpm-prior)/prior>.005:return None
    if float(np.percentile(np.abs(residual[mask]),95))>.025:return None
    midpoint=track['duration_seconds']/2
    halves=[]
    for selected in [mask&(beats<midpoint),mask&(beats>=midpoint)]:
        if np.count_nonzero(selected)<16:return None
        halves.append(float(60/np.polyfit(numbers[selected],beats[selected],1)[0]))
    if abs(halves[0]-halves[1])/bpm>.0025:return None
    phase=float(intercept%slope)
    classes=np.rint((downs-phase)/slope).astype(int)%4
    counts=np.bincount(classes,minlength=4);bar=int(np.argmax(counts));bar_support=float(counts[bar]/len(downs))
    if bar_support<.85:return None
    return {'bpm':float(bpm),'anchor':phase+bar*slope,'support':support,'bar_support':bar_support,
            'grid':{'period_seconds':float(slope),'beat_phase_seconds':phase,
                    'beat_residual_p95_ms':float(np.percentile(np.abs(residual[mask]),95)*1000),
                    'first_half_bpm':halves[0],'second_half_bpm':halves[1],
                    'usable_constant_grid':True,'rejection_reasons':[],
                    'model_only_refinement':True,'downbeat_verified':False,'phrase_verified':False,
                    'method':'Robust integer grid from Beat This events; >=95% within 30ms, stable halves and >=85% bar-class agreement; interior splices/loops disabled'}}


def freeze_evidence(database,root,output):
    approved,_=approved_pool(host_rows(database));mapping=json.loads((root/'file-map.json').read_text())
    tracks=[];events=[];reviews=[];missing=[]
    for metadata in approved:
        if metadata['spotify_uri'] not in mapping:missing.append({'id':metadata['id'],'reason':'no matched acquired source'});continue
        path=root/'evidence/production-cache'/(file_key(metadata['id'])+'.json')
        if not path.exists():raise ValueError('Analysis still missing: '+metadata['id'])
        data=json.loads(path.read_text());track=copy.deepcopy(data['analysis']);evidence=copy.deepcopy(data['evidence'])
        if digest(Path(track['path']))!=track['sha256'] or evidence['source_sha256']!=track['sha256']:
            raise ValueError('Changed or mismatched source evidence')
        half=65<track['bpm']<110 and track['bpm']*2<=210
        if half or not track['grid']['usable_constant_grid']:
            candidate=double_time_grid(track,evidence) if half else model_grid(track,evidence)
            if candidate:
                original={'bpm':track['bpm'],'anchor':track['grid_anchor_seconds'],'grid':track['grid']}
                track.update(bpm=candidate['bpm'],grid_anchor_seconds=candidate['anchor'],grid=candidate['grid'],original_onset_assessment=original)
                track['timing_review_note']='Half/double-time interpretation reviewed' if half else 'Onset-only grid failed; independent model events support a constant bar grid'
                evidence['rhythm']=beat_evidence(evidence['rhythm']['beats_seconds'],evidence['rhythm']['downbeats_seconds'],track)
                evidence['rhythm']['comparison_note']='Model-assisted refinement; agreement is not independent validation or a confidence probability'
                reviews.append({'id':track['id'],'old_bpm':original['bpm'],'new_bpm':track['bpm'],'half_time_review':half,'model_support':candidate['support'],'bar_support':candidate['bar_support'],'interior_splices_enabled':False})
        tracks.append(track);events.append(evidence)
    hashes=[t.get('analysis_pcm_sha256',t['sha256']) for t in tracks]
    if len(hashes)!=len(set(hashes)):raise ValueError('Repeated decoded audio needs explicit review')
    output.mkdir(parents=True,exist_ok=True)
    write_json(output/'analysis.json',{'tracks':tracks,'timing_reviews':reviews})
    write_json(output/'intelligence.json',{'tracks':events,'note':'Predictions are advisory; no human timing/listening verification'})
    write_json(output/'file-map.json',mapping)
    write_json(output/'evidence-summary.json',{'approved':len(approved),'analyzed':len(tracks),'constant_grid':sum(t['grid']['usable_constant_grid'] for t in tracks),'timing_reviews':reviews,'missing':missing,'duplicate_decoded_sources':0})
    return tracks,events,reviews
