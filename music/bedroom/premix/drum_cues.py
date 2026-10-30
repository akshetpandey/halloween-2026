"""Local drum-attack timing; this does not recognize musical downbeats."""
import math


def attack_phase(signal,sr,bpm,start_seconds=0,include_events=False):
    import numpy as np
    from scipy.ndimage import gaussian_filter1d,uniform_filter1d
    from scipy.signal import butter,find_peaks,sosfiltfilt
    if not 60<=bpm<=220 or sr<4000 or not math.isfinite(start_seconds):
        raise ValueError('Invalid drum cue bounds')
    y=np.asarray(signal,float)
    if y.ndim==2:y=y.mean(axis=1)
    if not np.all(np.isfinite(y)) or len(y)/sr<8:
        raise ValueError('Insufficient finite drum audio')
    period=60/bpm
    # Mid-band attacks retain the kick click/snare while avoiding delayed sub
    # envelopes and offbeat bass notes. Separation is advisory, never infallible.
    band=sosfiltfilt(butter(3,[150,1000],fs=sr,btype='bandpass',output='sos'),y)
    envelope=np.sqrt(np.maximum(0,uniform_filter1d(band**2,size=max(1,round(.004*sr)))))
    flux=gaussian_filter1d(np.maximum(0,np.diff(envelope,prepend=envelope[0])),max(1,.001*sr))
    peaks,properties=find_peaks(flux,distance=round(.4*period*sr),prominence=np.quantile(flux,.99)*.3)
    if len(peaks)<16:raise ValueError('Too few drum attacks')
    times=peaks/sr+start_seconds;weights=properties['prominences']
    hist=np.bincount(np.floor(times%period/period*256).astype(int),weights=weights,minlength=256)
    hist=gaussian_filter1d(hist,2,mode='wrap');phase=(np.argmax(hist)+.5)*period/256
    residual=(times-phase+period/2)%period-period/2;keep=np.abs(residual)<.025
    if np.count_nonzero(keep)<16:raise ValueError('Insufficient coherent drum attacks')
    phase=float((phase+np.average(residual[keep],weights=weights[keep]))%period)
    residual=(times-phase+period/2)%period-period/2
    support=float(weights[keep].sum()/weights.sum());coverage=float(np.count_nonzero(keep)/(len(y)/sr/period))
    p95=float(np.percentile(np.abs(residual[keep]),95))
    result={'phase_seconds':phase,'weighted_support':support,'attack_coverage':coverage,
            'residual_p95_ms':p95*1000,'usable':support>=.6 and coverage>=.5 and p95<=.025,
            'method':'150-1000 Hz drum-stem attacks, fixed measured tempo; heuristic support, not probability',
            'downbeat_verified':False,'human_verified':False}
    if include_events:
        result.update(events_seconds=times[keep].tolist(),event_weights=weights[keep].tolist())
    return result
