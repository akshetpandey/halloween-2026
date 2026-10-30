"""Same-recording drum templates verify actual native full-mix kick timing.

Each deck supplies its own drums-only reference from the opposite half of the
blend. This cancels that recording's natural kick attack shape/delay instead of
mistaking late claps or synth notes for a new kick. No other deck is a reference.
"""
import math


def envelopes(signal,sr):
    import numpy as np
    from scipy.ndimage import gaussian_filter1d,uniform_filter1d
    from scipy.signal import butter,sosfiltfilt,resample_poly
    channels=[]
    for band in [(30,180),(180,800)]:
        filtered=sosfiltfilt(butter(3,band,fs=sr,btype='bandpass',output='sos'),np.asarray(signal,float))
        rms=np.sqrt(np.maximum(0,uniform_filter1d(filtered**2,round(.002*sr))))
        flux=gaussian_filter1d(np.maximum(0,np.diff(rms,prepend=rms[0])),.001*sr)
        factor=math.gcd(sr,2000);channels.append(resample_poly(flux,2000//factor,sr//factor))
    return np.column_stack(channels)


def quarter_offsets(features,bpm,reference_start,reference_end,start,end):
    import numpy as np
    from scipy.signal import correlate
    sr=2000;p=60/bpm;pre=.025;post=min(.18,p*.46);n=round((pre+post)*sr);templates=[]
    for at in np.arange(math.ceil(reference_start/p),math.floor(reference_end/p))*p:
        first=round((at-pre)*sr);v=features[first:first+n]
        if first<0 or len(v)!=n:continue
        # Prefer a kick near the expected quarter, not a loud delayed clap.
        early=v[round(pre*sr):round((pre+.07)*sr),0].sum()
        score=early/(v[:,0].sum()+1e-20)
        if score>.35:templates.append((float(early),v.copy()))
    if not templates:raise ValueError('No usable own-recording kick reference')
    reference=max(templates,key=lambda t:t[0])[1]
    # Per-band zero-mean matching rejects a sustained bass note's level.
    reference-=reference.mean(axis=0);reference_energy=np.sum(reference**2,axis=0)
    errors=[];scores=[];beats=0
    for at in np.arange(math.ceil(start/p),math.floor(end/p))*p:
        first=round((at-pre-.06)*sr);last=round((at+post+.06)*sr);segment=features[first:last]
        if first<0 or len(segment)<n:continue
        correlations=[]
        for ch in range(2):
            v=segment[:,ch];summed=np.convolve(v,np.ones(n),'valid');energy=np.convolve(v*v,np.ones(n),'valid')-summed*summed/n
            numerator=correlate(v,reference[:,ch],mode='valid',method='fft')
            correlations.append(numerator/np.sqrt(np.maximum(1e-30,energy*reference_energy[ch])))
        # Kick body gets most weight; the upper transient provides a second cue.
        correlation=.75*correlations[0]+.25*correlations[1];best=int(np.argmax(correlation));score=float(correlation[best]);beats+=1
        if score>=.6:
            errors.append((best/sr-.06)*1000);scores.append(score)
    if len(errors)<8 or len(errors)/max(1,beats)<.35:raise ValueError('Too few confident same-recording kick matches')
    return {'median_error_ms':float(np.median(errors)),'p95_error_ms':float(np.percentile(np.abs(errors),95)),
            'attack_coverage':len(errors)/beats,'events':len(errors),'minimum_template_correlation':min(scores),
            '_errors':errors}


def check(signal,sr,bpm,split):
    import numpy as np
    from audit_single_lead import expected_attacks
    end=len(signal)/sr;features=[envelopes(signal[:,ch],sr) for ch in range(2)];regions=[]
    # Outgoing drums-only tail; incoming drums-only prefix. These are the same
    # actual native drum-support clips used in the final production geometry.
    references=[(split+1,end-.25),(1,split-.25)]
    reference_phases=[expected_attacks(signal[:,ch],sr,bpm,*ref)['median_error_ms'] for ch,ref in enumerate(references)]
    for start,stop in [(1,split-.25),(split+1,end-.25)]:
        decks=[quarter_offsets(f,bpm,*ref,start,stop) for f,ref in zip(features,references)]
        for deck,phase in zip(decks,reference_phases):
            deck['reference_clock_phase_ms']=phase;deck['median_error_ms']+=phase
        difference=abs(decks[0]['median_error_ms']-decks[1]['median_error_ms'])
        common=sum(d['median_error_ms'] for d in decks)/2
        for deck,phase in zip(decks,reference_phases):
            errors=np.asarray(deck.pop('_errors'))+phase;deck['p95_error_ms']=float(np.percentile(abs(errors-common),95))
            deck['status']='checked' if deck['p95_error_ms']<=25 else 'failed'
        regions.append({'decks':decks,'interdeck_phase_difference_ms':difference,'window_seconds':[start,stop]})
    handover_difference=abs(regions[0]['decks'][0]['median_error_ms']-regions[1]['decks'][1]['median_error_ms'])
    passed=all(d['status']=='checked' for r in regions for d in r['decks']) and all(r['interdeck_phase_difference_ms']<=15 for r in regions) and handover_difference<=15
    return {'status':'checked' if passed else 'failed','peak_p95_error_ms':max(d['p95_error_ms'] for r in regions for d in r['decks']),
            'interdeck_phase_difference_ms':max(r['interdeck_phase_difference_ms'] for r in regions),'original_handover_phase_difference_ms':handover_difference,'regions':regions,
            'method':'Actual native audio; own native drum templates with measured reference clock phases retained; 2kHz envelope resolution, confidence >=0.6, coverage >=0.35, 25ms common-phase jitter and 15ms interdeck gates',
            'human_verified':False}
