"""Beat-counted performance edits; audio stays in ignored source-bound caches."""
import math


def tightening_roll(bpm,stage_beats=4,fractions=(1,.5,.25,.125)):
    if not math.isfinite(bpm) or not 60<=bpm<=220:raise ValueError('Invalid roll tempo')
    if not math.isfinite(stage_beats) or stage_beats<=0 or not fractions:raise ValueError('Invalid roll stages')
    events=[];beat=0.
    for fraction in fractions:
        if not math.isfinite(fraction) or fraction<=0:raise ValueError('Invalid loop fraction')
        count=round(stage_beats/fraction)
        if fraction<=0 or abs(count*fraction-stage_beats)>1e-9:raise ValueError('Roll stage must contain complete loops')
        for _ in range(count):
            events.append({'beat':beat,'beats':fraction,'time':beat*60/bpm,'seconds':fraction*60/bpm})
            beat+=fraction
    return events


def spectral_sweep(signal,sr,start_hz=400,end_hz=2200,lowpass_hz=8000):
    """Smooth zero-phase spectral high-pass motion; no time-axis resampling.

    This prints only a selected percussion/effect layer, never a whole programme.
    Hopwise filter motion leaves sample count and beat positions unchanged.
    """
    import numpy as np
    from scipy.signal import stft,istft
    x=np.asarray(signal,dtype=float);mono=x.ndim==1
    if mono:x=x[:,None]
    if x.ndim!=2 or len(x)<2048 or not np.all(np.isfinite(x)) or not 20<=min(start_hz,end_hz)<max(start_hz,end_hz,lowpass_hz)<sr/2:
        raise ValueError('Invalid spectral sweep bounds or audio')
    out=[]
    for channel in x.T:
        f,t,z=stft(channel,fs=sr,nperseg=1024,noverlap=768,boundary='zeros',padded=True)
        cutoff=np.exp(np.log(start_hz)+(np.log(end_hz)-np.log(start_hz))*np.clip(t/(len(x)/sr),0,1))
        high=1/np.sqrt(1+(cutoff[None,:]/np.maximum(f[:,None],1e-9))**8)
        low=1/np.sqrt(1+(f[:,None]/lowpass_hz)**8)
        _,y=istft(z*high*low,fs=sr,nperseg=1024,noverlap=768,input_onesided=True,boundary=True)
        out.append(y[:len(channel)])
    result=np.column_stack(out)
    if not np.all(np.isfinite(result)):raise ValueError('Nonfinite filtered effect')
    return result[:,0] if mono else result


def check_repeat_clock(signal,sr,bpm):
    """Compare actual native repetitions at each loop length, not plan markers.

    This checks repeat consistency against the first realized loop in each
    stage. It does not independently establish the initial source downbeat.
    """
    import numpy as np
    from scipy.signal import correlate,correlation_lags
    x=np.asarray(signal,float)
    if x.ndim==2:x=x.mean(axis=1)
    events=tightening_roll(bpm);stages=[]
    if len(x)<round(16*60/bpm*sr)-1 or not np.all(np.isfinite(x)):
        raise ValueError('Incomplete/nonfinite native roll')
    for fraction in [1,.5,.25,.125]:
        group=[e for e in events if e['beats']==fraction]
        frames=round(group[0]['seconds']*sr)-4
        pieces=[x[round(e['time']*sr):round(e['time']*sr)+frames] for e in group]
        reference=pieces[0];errors=[];matches=[]
        for piece in pieces:
            if np.sum(piece**2)<1e-10:raise ValueError('Silent native loop')
            correlation=correlate(piece,reference,mode='full',method='fft')
            lags=correlation_lags(len(piece),len(reference));keep=np.abs(lags)<=round(.01*sr)
            best=int(np.argmax(correlation[keep]));lag=lags[keep][best]
            errors.append(float(lag*1000/sr))
            matches.append(float(correlation[keep][best]/np.sqrt(np.sum(piece**2)*np.sum(reference**2))))
        stages.append({'loop_beats':fraction,'repetitions':len(group),
                       'maximum_repeat_offset_ms':max(abs(v) for v in errors),
                       'minimum_waveform_correlation':min(matches)})
    return {'status':'checked' if all(s['maximum_repeat_offset_ms']<=2 and s['minimum_waveform_correlation']>=.9 for s in stages) else 'failed',
            'stages':stages,'method':'Actual native dry-roll correlation within each loop stage; initial source beat phase remains separately inferred'}


def echo_tail(signal,sr,bpm,taps=3,decay=.45):
    """Wet-only, one-beat-spaced echoes with short click-prevention tap fades."""
    import numpy as np
    x=np.asarray(signal,dtype=float);mono=x.ndim==1
    if mono:x=x[:,None]
    if not 0<decay<1 or not 1<=taps<=6 or not 60<=bpm<=220 or not len(x) or not np.all(np.isfinite(x)):
        raise ValueError('Invalid echo')
    delay=sr*60/bpm;result=np.zeros((len(x)+round(taps*delay),x.shape[1]))
    fade=min(round(.003*sr),len(x)//8);envelope=np.ones(len(x))
    if fade:
        envelope[:fade]=np.linspace(0,1,fade);envelope[-fade:]=np.linspace(1,0,fade)
    for tap in range(1,taps+1):
        offset=round(tap*delay)
        result[offset:offset+len(x)]+=x*envelope[:,None]*decay**tap
    return result[:,0] if mono else result
