"""Explicit musical intent and independent, realized-audio rhythm checks.

These gates reject missing evidence. They do not certify that a transition sounds
musically good, and the project thresholds are not universal DJ standards.
"""
import math

SCHEMA = 'cue-led-1'


def validate_design(join):
    if join['kind'] == 'programme_boundary':
        return
    design = join.get('arrangement_design') or {}
    if design.get('schema') != SCHEMA:
        raise ValueError('Transition lacks an authored arrangement design')
    if design.get('review_state') == 'rejected':
        raise ValueError('Host-rejected transition cannot enter production')
    beats = join['bars'] * 4
    if beats <= 0 or not math.isfinite(beats):
        raise ValueError('Transition must have an explicit musical length')
    phrases = design.get('phrase_cues') or []
    for deck in ('outgoing', 'incoming'):
        if not any(c.get('deck') == deck and c.get('event') and c.get('evidence')
                   and c.get('source_seconds', -1) >= 0 for c in phrases):
            raise ValueError('Both decks need source-bound phrase cue evidence')
    schedule = design.get('lead_schedule') or []
    cursor = 0
    for part in schedule:
        if abs(part['start_beat'] - cursor) > 1e-6 or part['end_beat'] <= cursor:
            raise ValueError('Lead ownership has a gap or overlap')
        if part['primary'] not in ('outgoing', 'incoming'):
            raise ValueError('One primary musical lead is required')
        if not part.get('supporting_audio'):
            raise ValueError('Lead ownership needs audio evidence')
        cursor = part['end_beat']
    if abs(cursor - beats) > 1e-6:
        raise ValueError('Lead ownership must cover the complete transition')
    swap = design.get('bass_swap_beat', -1)
    if not 0 <= swap <= beats or abs(swap/4 - round(swap/4)) > 1e-6:
        raise ValueError('Bass handover must land on an explicit bar')
    if not design.get('incoming_bass_present_at_swap'):
        raise ValueError('Cannot hand over to a missing incoming bass')
    if design.get('unintended_breakdown') is not False:
        raise ValueError('Incoming arrangement has not been checked for energy loss')
    timing = design.get('realized_timing') or {}
    if timing.get('status') != 'checked' or timing.get('peak_p95_error_ms', math.inf) > 25:
        raise ValueError('Missing or failed realized-audio beat check')
    if not design.get('source_sha256') or len(design['source_sha256']) != 2:
        raise ValueError('Musical design must be bound to both source files')


def check_rendered_drums(signal, sr, bpm, start, end):
    """Audit two independently panned drum decks after native rate processing.

    The channels are original separated drums through the same native rates and
    offsets, not synthetic clicks. No EQ/fader is applied to diagnostic channels.
    Quarter-beat accuracy cannot establish a bar or phrase; those remain a
    separate source-event requirement above.
    """
    import numpy as np
    from drum_cues import attack_phase
    x = np.asarray(signal)
    if x.ndim != 2 or x.shape[1] != 2 or not 0 <= start < end <= len(x)/sr:
        raise ValueError('Invalid stereo drum diagnostic')
    measured = []
    period = 60/bpm
    for channel in range(2):
        cue = attack_phase(x[round(start*sr):round(end*sr), channel], sr, bpm,
                           start, include_events=True)
        events = np.asarray(cue.pop('events_seconds'))
        cue.pop('event_weights')
        errors = (events + period/2) % period - period/2
        cue['expected_grid_error_p95_ms'] = float(np.percentile(np.abs(errors), 95)*1000)
        cue['signed_median_ms'] = float(np.median(errors)*1000)
        measured.append(cue)
    difference = abs((measured[0]['phase_seconds']-measured[1]['phase_seconds']
                      + period/2) % period-period/2)*1000
    worst = max(c['expected_grid_error_p95_ms'] for c in measured)
    passed = worst <= 25 and difference <= 15 and all(c['usable'] for c in measured)
    return {'status': 'checked' if passed else 'failed', 'peak_p95_error_ms': worst,
            'interdeck_phase_difference_ms': difference, 'decks': measured,
            'window_seconds': [start, end], 'bpm': bpm,
            'note': 'Realized native drum timing only; no claim of musical approval or verified phrases'}


def validate_programme_design(report):
    tracks=report['tracks'];joins=report['transitions']
    if len(joins)!=len(tracks)-1:
        raise ValueError('Transition/source sequence does not agree')
    for index,join in enumerate(joins):
        validate_design(join)
        if join['kind']=='programme_boundary':continue
        expected=[tracks[index]['source_sha256'],tracks[index+1]['source_sha256']]
        if join['arrangement_design']['source_sha256']!=expected:
            raise ValueError('Musical design refers to different source files')


def bass_handover_levels(signal,sr,swap,window):
    """Report actual 30-160 Hz RMS around the exchange, in equal phrase windows.

    This is an energy continuity screen, not perceived loudness or a requirement
    that every intentional drop/breakdown have identical bass.
    """
    import numpy as np
    from scipy.signal import butter,sosfiltfilt
    x=np.asarray(signal)
    if x.ndim==2:x=x.mean(axis=1)
    if not 0<=swap-window<swap<swap+window<=len(x)/sr:
        raise ValueError('Invalid bass handover measurement window')
    band=sosfiltfilt(butter(3,[30,160],fs=sr,btype='bandpass',output='sos'),x)
    values=[]
    for a,b in [(swap-window,swap),(swap,swap+window)]:
        values.append(float(10*np.log10(max(1e-12,np.mean(band[round(a*sr):round(b*sr)]**2)))))
    return {'before_dbfs':values[0],'after_dbfs':values[1],'change_db':values[1]-values[0],
            'window_seconds':window,'band_hz':[30,160]}
