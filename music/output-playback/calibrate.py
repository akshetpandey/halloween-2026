#!/usr/bin/env python3
"""Generate isolated stereo-system tests and analyze one continuous phone recording."""
from __future__ import annotations
import argparse
import importlib.util
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import wave

# Reuse the installed local analysis runtime; no downloads or phone app required.
if __name__ == '__main__' and importlib.util.find_spec('numpy') is None:
    bundled = Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3'
    if bundled.is_file() and Path(sys.executable).resolve() != bundled.resolve():
        os.execv(str(bundled), [str(bundled), str(Path(__file__).resolve()), *sys.argv[1:]])
import numpy as np

FS = 16000
CHANNELS = ('audioengine_left', 'audioengine_right', 'hisense_left', 'hisense_right')
SCHEDULE = ((3, 12, 21, 66), (5, 14, 23), (7, 16, 25), (9, 18, 27))
NOISE_START = (30, 38, 46, 54)
DURATION = 69


def marker(channel, rate=FS):
    rng = np.random.default_rng(9182 + channel)
    size = round(.16*FS)
    data = rng.normal(size=size)
    spectrum = np.fft.rfft(data)
    frequencies = np.fft.rfftfreq(size, 1/FS)
    spectrum[(frequencies < 700) | (frequencies > 5500)] = 0
    data = np.fft.irfft(spectrum, n=size) * np.hanning(size)
    data = data / np.max(np.abs(data)) * .18
    return resample_periodic(data, round(.16*rate)) if rate != FS else data


def resample_periodic(data, size):
    return np.fft.irfft(np.fft.rfft(data), n=size) * (size/len(data))


def pink_noise(rate=FS):
    rng = np.random.default_rng(38123)
    size = 6*FS
    frequencies = np.fft.rfftfreq(size, 1/FS)
    spectrum = np.fft.rfft(rng.normal(size=size)) / np.sqrt(np.maximum(frequencies, 60))
    spectrum[(frequencies < 60) | (frequencies > 6500)] = 0
    data = np.fft.irfft(spectrum, n=size)
    edge = round(.05*FS)
    data[:edge] *= np.linspace(0, 1, edge)
    data[-edge:] *= np.linspace(1, 0, edge)
    data = data / np.max(np.abs(data)) * .18
    return resample_periodic(data, 6*rate) if rate != FS else data


def stimulus(rate=FS):
    audio = np.zeros((DURATION*rate, 4), dtype=np.float32)
    noise = pink_noise(rate)
    # Quiet warm-up wakes the two paths before the timing markers.
    audio[rate//2:rate//2+rate, :] = noise[:rate, None] * .2
    for channel in range(4):
        pulse = marker(channel, rate)
        for when in SCHEDULE[channel]:
            start = round(when*rate)
            audio[start:start+len(pulse), channel] = pulse
        start = NOISE_START[channel]*rate
        audio[start:start+len(noise), channel] = noise
    return audio


def generate(root):
    root = Path(root); root.mkdir(parents=True, exist_ok=True)
    path = root/'calibration-four-channels.wav'
    if path.exists():
        raise FileExistsError('Use a fresh calibration output folder')
    data = np.round(stimulus(48000)*32767).astype('<i2')
    with wave.open(str(path), 'wb') as output:
        output.setnchannels(4); output.setsampwidth(2); output.setframerate(48000)
        output.writeframes(data.tobytes())
    manifest = {'schema': 'phone-stereo-test-1', 'duration_seconds': DURATION,
        'channels': list(CHANNELS), 'timing_seconds': SCHEDULE,
        'noise_start_seconds': NOISE_START, 'noise_duration_seconds': 6,
        'baseline': 'flat EQ, zero delays, equal bus gains',
        'recording': 'one continuous recording, same phone position, no trimming or silence removal'}
    (root/'calibration-manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return path


def decode(path):
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format',
        '-of', 'json', str(path)]))
    streams = [s for s in probe['streams'] if s['codec_type'] == 'audio']
    if not streams:
        raise ValueError('No audio stream in recording')
    channels = streams[0]['channels']
    if channels > 2:
        raise ValueError('Export ordinary mono/stereo audio; spatial recordings are unsupported')
    duration = float(streams[0].get('duration', probe.get('format',{}).get('duration',0)))
    if duration > 180:
        raise ValueError('Use a recording under three minutes, containing the entire 69-second test')
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-map', '0:a:0',
        '-t', '180', '-ar', str(FS), '-f', 'f32le', '-c:a', 'pcm_f32le', '-'])
    audio = np.frombuffer(raw, dtype='<f4').reshape(-1, channels)
    # Avoid cancellation when a stereo phone recording has phase differences.
    selected = int(np.argmax(np.mean(audio.astype(float)**2, axis=0)))
    return audio[:, selected].astype(float), selected


def convolution(a, b):
    length = len(a)+len(b)-1
    size = 1 << (length-1).bit_length()
    return np.fft.irfft(np.fft.rfft(a, size)*np.fft.rfft(b, size), size)[:length]


def scores(audio, template):
    corr = convolution(audio, template[::-1])[len(template)-1:len(audio)]
    sums = np.r_[0, np.cumsum(audio**2)]
    energy = sums[len(template):] - sums[:-len(template)]
    return np.abs(corr) / np.sqrt(np.maximum(energy*np.sum(template**2), 1e-18))


def onset(values, maximum):
    # Keep an earlier substantial arrival when a room reflection is stronger.
    lo = max(0, maximum-round(.035*FS))
    threshold = max(.08, values[maximum]*.35)
    found = np.flatnonzero(values[lo:maximum+1] >= threshold)
    return lo+int(found[0]) if len(found) else maximum


def reference_clock(values):
    working = values.copy()
    peaks = []
    for _ in SCHEDULE[0]:
        peak = int(np.argmax(working))
        if working[peak] < .12:
            raise ValueError('Missing/weak Audioengine reference markers; record the entire test')
        peaks.append(onset(values, peak)/FS)
        working[max(0, peak-FS):peak+FS] = 0
    actual = np.sort(peaks)
    scale, offset = np.polyfit(SCHEDULE[0], actual, 1)
    errors = actual - (offset + scale*np.asarray(SCHEDULE[0]))
    if abs(scale-1) > .002 or max(abs(errors)) > .004:
        raise ValueError('Timing references are inconsistent; check missing audio, silence removal or noise')
    return float(scale), float(offset), float(max(abs(errors))*1000)


def log_bands(data):
    size = 8192
    if len(data) < size:
        raise ValueError('Noise section missing from recording')
    frames = np.lib.stride_tricks.sliding_window_view(data, size)[::size//2]
    power = np.mean(abs(np.fft.rfft(frames*np.hanning(size), axis=1))**2, axis=0)
    frequencies = np.fft.rfftfreq(size, 1/FS)
    centers = 125*2**(np.arange(31)/6)
    bands = []
    for center in centers:
        selected = (frequencies >= center/2**(1/12)) & (frequencies < center*2**(1/12))
        bands.append(10*np.log10(np.mean(power[selected])+1e-20))
    return centers, np.asarray(bands)


def eq_candidates(frequencies, response, other):
    difference = response-other
    difference -= np.median(difference[(frequencies >= 700) & (frequencies <= 2500)])
    candidates = []
    for i, frequency in enumerate(frequencies):
        if not 125 <= frequency <= 630:
            continue
        lo, hi = max(0, i-4), min(len(response), i+5)
        prominence = response[i] - np.median(np.r_[response[lo:max(lo+1,i-1)], response[i+2:hi]])
        if difference[i] >= 4 and prominence >= 1.5:
            candidates.append({'frequency_hz': round(float(frequency)), 'gain_db': -3.0,
                'bandwidth_octaves': 1.5, 'relative_excess_db': round(float(difference[i]), 2)})
    candidates.sort(key=lambda x: x['relative_excess_db'], reverse=True)
    return candidates[:1]  # At most one modest broad cut per system.


def analyze(audio, fixed_gain=False):
    if len(audio) < 67*FS or not np.all(np.isfinite(audio)):
        raise ValueError('Recording is too short or has invalid samples; capture all 69 seconds')
    clipping = float(np.mean(abs(audio) >= .999))
    reference = scores(audio, marker(0))
    scale, offset, clock_residual = reference_clock(reference)
    arrivals, strengths = {}, {}
    for channel, name in enumerate(CHANNELS):
        correlation = reference if channel == 0 else scores(audio, marker(channel))
        residuals, detected = [], []
        for expected in SCHEDULE[channel]:
            predicted = (offset+scale*expected)*FS
            lo, hi = max(0, round(predicted-.7*FS)), min(len(correlation), round(predicted+.7*FS))
            if hi <= lo:
                raise ValueError('Missing end of recording')
            peak = lo+int(np.argmax(correlation[lo:hi]))
            if correlation[peak] < .12:
                raise ValueError(f'Missing/weak {name} marker; check that output and repeat the recording')
            arrival = onset(correlation, peak)/FS
            residuals.append((arrival-offset)/scale-expected)
            detected.append(float(correlation[peak]))
        jitter = max(residuals)-min(residuals)
        if jitter > .008:
            raise ValueError(f'{name} timing varies by {jitter*1000:.1f} ms; do not apply a guessed delay')
        arrivals[name] = {'relative_ms': float(np.median(residuals)*1000),
            'jitter_ms': float(jitter*1000), 'detections': len(residuals)}
        strengths[name] = round(min(detected), 3)
    a = np.median([arrivals[n]['relative_ms'] for n in CHANNELS[:2]])
    h = np.median([arrivals[n]['relative_ms'] for n in CHANNELS[2:]])
    difference = float(h-a)
    if abs(difference) > 500:
        raise ValueError('Offset exceeds the automatic 500 ms limit; inspect the recording')
    delays = {'audioengine': max(0, round(difference)), 'hisense': max(0, round(-difference))}
    _, reference_power = log_bands(pink_noise()[FS//2:11*FS//2])
    responses, levels = [], []
    for channel, start in enumerate(NOISE_START):
        extra = arrivals[CHANNELS[channel]]['relative_ms']/1000
        lo = round((offset+scale*(start+.5+extra))*FS)
        hi = round((offset+scale*(start+5.5+extra))*FS)
        segment = audio[lo:hi]
        frequencies, power = log_bands(segment)
        response = power-reference_power
        mid = (frequencies >= 700) & (frequencies <= 2500)
        levels.append(float(np.median(response[mid])))
        responses.append(response)
    response_a = np.mean(responses[:2], axis=0)
    response_h = np.mean(responses[2:], axis=0)
    gains = {'audioengine': 0.0, 'hisense': 0.0}
    trustworthy_level = fixed_gain and clipping < .001
    if trustworthy_level:
        level_a, level_h = np.mean(levels[:2]), np.mean(levels[2:])
        target = min(level_a, level_h)
        gains = {'audioengine': round(max(-6, target-level_a), 1),
                 'hisense': round(max(-6, target-level_h), 1)}
    filters = {'audioengine': eq_candidates(frequencies, response_a, response_h),
               'hisense': eq_candidates(frequencies, response_h, response_a)}
    warnings = ['Relative arrival alignment at this phone position; internal soundbar speakers are not independent.',
        'Phone frequency response is uncalibrated. EQ candidates are broad cut-only suggestions, not a flat-room correction.']
    if not trustworthy_level:
        warnings.append('Fixed recording gain was not confirmed or clipping was detected: automatic level/EQ changes are withheld.')
    if clipping >= .001:
        warnings.append('Recording is clipped/overloaded; lower levels and repeat before trusting EQ.')
    stereo_spread = {bus: round(abs(arrivals[CHANNELS[i]]['relative_ms']-
        arrivals[CHANNELS[i+1]]['relative_ms']), 2) for bus, i in (('audioengine',0),('hisense',2))}
    if max(stereo_spread.values()) > 10:
        warnings.append('L/R arrivals differ by over 10 ms within a system; common bus delay is a compromise for room coverage.')
    return {'schema': 'phone-stereo-result-1', 'delay_ready': True,
        'recording_clock_ppm': round((scale-1)*1e6, 2), 'clock_fit_residual_ms': clock_residual,
        'channel_arrivals': arrivals, 'minimum_marker_correlations': strengths,
        'hisense_later_than_audioengine_ms': difference, 'add_delay_ms': delays,
        'bus_gain_db': gains, 'fixed_recording_gain_confirmed': fixed_gain,
        'clipped_fraction': clipping, 'eq_candidates': filters, 'eq_automatic_allowed': trustworthy_level,
        'stereo_arrival_spread_ms': stereo_spread, 'warnings': warnings,
        'response_bands_hz': [round(float(x),1) for x in frequencies],
        'relative_response_db': {'audioengine': response_a.tolist(), 'hisense': response_h.tolist()}}


def write_results(root, result, include_eq=False):
    if include_eq and not result['eq_automatic_allowed']:
        raise ValueError('EQ inclusion requires confirmed fixed recording gain and an unclipped recording')
    root = Path(root); root.mkdir(parents=True, exist_ok=False)
    (root/'analysis.json').write_text(json.dumps(result, indent=2)+'\n')
    lines = ['schema\tphone-stereo-preset-1']
    for bus in ('audioengine', 'hisense'):
        lines += [f'{bus}.delay_ms\t{result["add_delay_ms"][bus]}',
                  f'{bus}.gain_db\t{result["bus_gain_db"][bus]}']
        filters = result['eq_candidates'][bus] if include_eq else []
        lines += [f'{bus}.eq_count\t{len(filters)}']
        for index, band in enumerate(filters, 1):
            for name in ('frequency_hz', 'gain_db', 'bandwidth_octaves'):
                lines += [f'{bus}.eq{index}.{name}\t{band[name]}']
    (root/'preset.tsv').write_text('\n'.join(lines)+'\n')
    summary = ['# iPhone stereo calibration analysis', '',
        f'Add Audioengine delay: **{result["add_delay_ms"]["audioengine"]} ms**.',
        f'Add Hisense delay: **{result["add_delay_ms"]["hisense"]} ms**.',
        f'Estimated relative difference: {result["hisense_later_than_audioengine_ms"]:.2f} ms (positive = Hisense later).',
        f'Phone clock fit: {result["recording_clock_ppm"]:.1f} ppm; reference residual {result["clock_fit_residual_ms"]:.2f} ms.',
        '', 'EQ candidates (apply only after review/listening):', '',
        '```json', json.dumps(result['eq_candidates'], indent=2), '```', '',
        f'Preset includes EQ: {include_eq}. Bus gain: {result["bus_gain_db"]}.', '',
        *['- '+warning for warning in result['warnings']], '',
        'Apply to the dedicated party player, then verify by listening. The calibration test project must stay flat/zero-delay for future raw measurements.']
    (root/'ANALYSIS.md').write_text('\n'.join(summary)+'\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='mode', required=True)
    make = sub.add_parser('generate'); make.add_argument('output', type=Path)
    read = sub.add_parser('analyze'); read.add_argument('recording', type=Path)
    read.add_argument('--output', type=Path, required=True)
    read.add_argument('--fixed-gain', action='store_true')
    read.add_argument('--include-eq', action='store_true')
    sub.add_parser('selftest')
    sub.add_parser('verify-native')
    args = parser.parse_args()
    try:
        if args.mode == 'generate':
            print(generate(args.output))
        elif args.mode == 'selftest':
            subprocess.run([sys.executable,'-m','unittest','discover','-s',str(Path(__file__).parent),
                '-p','test_calibrate.py','-v'],check=True)
        elif args.mode == 'verify-native':
            subprocess.run([sys.executable,str(Path(__file__).with_name('verify_calibration.py'))],check=True)
        else:
            audio, channel = decode(args.recording)
            result = analyze(audio, args.fixed_gain)
            result['recording_channel_used'] = channel
            write_results(args.output, result, args.include_eq)
            print(json.dumps({k: result[k] for k in ('add_delay_ms','bus_gain_db','eq_candidates')}, indent=2))
    except (ValueError, FileExistsError) as error:
        parser.exit(2, str(error)+'\n')


if __name__ == '__main__':
    main()
