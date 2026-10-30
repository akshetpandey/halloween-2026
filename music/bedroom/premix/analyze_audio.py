#!/usr/bin/env python3
"""Measure local audition sources; preserve catalog priors and provisional grids.

Use the analysis venv (numpy, scipy, librosa, soundfile) plus ffmpeg. Outputs and
decoded audio stay in the ignored audition directory. No votes are changed.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import tempfile

from prepare import file_key


VERSION = 'onset-phrase-4'
DEFAULT_ROOT = Path(__file__).resolve().parent / '.local/actual-batch-01'
ANALYSIS_SR = 22050
HOP = 256
FFT = 2048


def digest(path):
    value = hashlib.sha256()
    with Path(path).open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            value.update(chunk)
    return value.hexdigest()


def write_json(path, value):
    """Readers see the prior complete report or the new complete report."""
    path = Path(path)
    serialized = json.dumps(value, indent=2, allow_nan=False) + '\n'
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode='w', dir=path.parent, prefix=path.name + '.',
                                     suffix='.tmp', delete=False) as handle:
        temporary = Path(handle.name)
        try:
            handle.write(serialized)
            handle.flush()
            temporary.replace(path)
        finally:
            temporary.unlink(missing_ok=True)


def run(command):
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode:
        raise ValueError(f'{command[0]} failed: {result.stderr[-1000:]}')
    return result


def catalog_prior(track):
    explicit = track.get('analysis_tempo_prior')
    if explicit and 60 < float(explicit['value']) < 240 and explicit.get('source'):
        return explicit
    feature = track.get('catalog_analysis', {}).get('features', {}).get('tempo')
    if feature and 60 < float(feature['value']) < 240:
        return {'value': float(feature['value']), 'source': feature.get('source'),
                'kind': 'catalog prior, not this file measurement'}
    if track.get('id') == 'hollow-01-008':
        return {'value': 174.0, 'source': 'Sub Focus Solar System production prior',
                'kind': 'engineering prior, not catalog or file measurement'}
    raise ValueError(f"No explicit usable tempo prior for {track.get('id')}")


def periodic_tempo(onsets, prior, sr=ANALYSIS_SR, hop=HOP):
    """Constrained spectral coherence, independent of missing beat counts."""
    import numpy as np
    from scipy.optimize import minimize_scalar
    samples = np.asarray(onsets, dtype=float)
    times = np.arange(len(samples)) * hop / sr
    weighted = (samples - np.mean(samples)) * np.hanning(len(samples))
    nfft = 2 ** math.ceil(math.log2(max(32768, len(samples) * 8)))
    spectrum = np.abs(np.fft.rfft(weighted, nfft))
    frequencies = np.fft.rfftfreq(nfft, hop / sr)
    allowed = np.flatnonzero((frequencies >= prior / 60 * .97)
                             & (frequencies <= prior / 60 * 1.03))
    harmonics = (1, 2, 3, 4, 6, 8)
    harmonic_weights = (.25, 1 / math.sqrt(2), 1 / math.sqrt(3), .5,
                        1 / math.sqrt(6), 1 / math.sqrt(8))
    # Sparse kick patterns and repeated vocals can have a weak fundamental.
    # Summing their pulse-train harmonics avoids choosing a nearby vocal rate.
    score = sum(np.interp(frequencies[allowed] * h, frequencies, spectrum) * weight
                for h, weight in zip(harmonics, harmonic_weights))
    best = int(allowed[np.argmax(score)])
    def coefficient(frequency):
        return np.dot(weighted, np.exp(-2j * np.pi * frequency * times))
    def pulse_score(frequency):
        return sum(abs(coefficient(frequency * h)) * weight
                   for h, weight in zip(harmonics, harmonic_weights))
    search = minimize_scalar(lambda frequency: -pulse_score(frequency),
                             bounds=(frequencies[best - 1], frequencies[best + 1]),
                             method='bounded', options={'xatol': 1e-10})
    frequency = float(search.x)
    phase = float((-np.angle(coefficient(frequency)) / (2 * np.pi * frequency)) % (1 / frequency))
    return 60 * frequency, phase


def fit_grid(onsets, prior, duration, sr=ANALYSIS_SR, hop=HOP):
    import numpy as np
    from scipy.signal import find_peaks
    samples = np.asarray(onsets, dtype=float)
    if len(samples) < 32 or float(np.max(samples)) <= 0:
        raise ValueError('Insufficient beat evidence; refusing a fabricated grid')
    spectral_bpm, phase = periodic_tempo(samples, prior, sr, hop)
    period = 60 / spectral_bpm
    peaks, _ = find_peaks(samples, distance=max(1, int(.18 * period * sr / hop)),
                          prominence=max(.05, .08 * float(np.percentile(samples, 95))))
    times = peaks * hop / sr
    from scipy.ndimage import gaussian_filter1d
    phase_bins = 256
    histogram, _ = np.histogram(times % period, bins=phase_bins, range=(0, period),
                                weights=samples[peaks])
    smoothed = gaussian_filter1d(histogram.astype(float), max(1, .012 / period * phase_bins), mode='wrap')
    phase = float((np.argmax(smoothed) + .5) / phase_bins * period)
    # Integer grid assignments preserve gaps. Enumerating tracker events instead
    # would count a missing kick as a shorter song and bias its measured tempo.
    numbers = np.rint((times - phase) / period)
    residual = times - (phase + numbers * period)
    weights = np.sqrt(np.maximum(samples[peaks], .001))
    mask = np.abs(residual) < .16 * period
    if np.count_nonzero(mask) < 16:
        raise ValueError('Insufficient coherent onset peaks near the catalog tempo')
    for _ in range(4):
        period, intercept = np.polyfit(numbers[mask], times[mask], 1, w=weights[mask])
        residual = times - (intercept + period * numbers)
        mad = np.median(np.abs(residual[mask] - np.median(residual[mask])))
        mask = np.abs(residual - np.median(residual[mask])) < max(.025, min(.06, 3.5 * mad))
        if np.count_nonzero(mask) < 16:
            raise ValueError('Grid fit has too few consistent beats')
    period, intercept = np.polyfit(numbers[mask], times[mask], 1, w=weights[mask])
    residual = times - (intercept + period * numbers)
    bpm = 60 / period
    phase = float(intercept % period)
    # A bar-phase guess, not downbeat recognition: accumulated onset accents.
    grid_times = np.arange(phase, duration, period)
    grid_frames = np.clip(np.rint(grid_times * sr / hop).astype(int), 0, len(samples) - 1)
    accents = [float(np.mean(samples[grid_frames[c::4]])) for c in range(4)]
    bar_class = int(np.argmax(accents))
    anchor = phase + bar_class * period
    p95 = float(np.percentile(np.abs(residual[mask]), 95))
    coverage = min(1.0, len(np.unique(numbers[mask])) / max(1, duration / period))
    confidence = coverage * math.exp(-p95 / .075)
    agreement = abs(bpm - prior) / prior
    if agreement > .03:
        confidence *= .4
    half = len(samples) // 2
    first = periodic_tempo(samples[:half], prior, sr, hop)[0]
    second = periodic_tempo(samples[half:], prior, sr, hop)[0]
    half_disagreement = abs(first - second) / bpm
    issues = []
    if p95 > .045:
        issues.append('consistent onset residual exceeds 45 ms')
    if half_disagreement > .005:
        issues.append('first/second half tempo disagreement exceeds 0.5 percent')
    if coverage < .25:
        issues.append('fewer than 25 percent of beats have matching onset evidence')
    if agreement > .02:
        issues.append('measurement differs from catalog prior by over 2 percent')
    return {'bpm': float(bpm), 'grid_anchor_seconds': float(anchor),
            'grid': {'period_seconds': float(period), 'beat_phase_seconds': phase,
                     'heuristic_confidence': float(confidence),
                     'beat_residual_p95_ms': 1000 * p95, 'beat_count': int(np.count_nonzero(mask)),
                     'coherent_beat_coverage': coverage,
                     'consistent_beat_fraction': float(np.mean(mask)),
                     'first_half_bpm': float(first), 'second_half_bpm': float(second),
                     'half_tempo_disagreement_percent': 100 * half_disagreement,
                     'usable_constant_grid': not issues, 'rejection_reasons': issues,
                     'method': 'prior-constrained spectral coherence and robust integer-grid onset regression',
                     'prior_difference_percent': 100 * agreement,
                     'downbeat_verified': False, 'phrase_verified': False,
                     'anchor_note': ('Provisional strongest four-beat accent class; '
                                     'not a recognized or human-verified downbeat. '
                                     'STFT/onset timing is approximate, not sample accurate.'),
                     'accent_scores': accents}}


def cosine(a, b):
    import numpy as np
    norm = float(np.linalg.norm(a) * np.linalg.norm(b))
    return float(np.dot(a, b) / norm) if norm > 1e-12 else 0.0


def phrase_metrics(y, power, onsets, bpm, anchor, sr=ANALYSIS_SR, hop=HOP):
    import numpy as np
    import librosa
    from scipy.signal import butter, sosfilt
    duration = len(y) / sr
    chroma = librosa.feature.chroma_stft(S=power, sr=sr, n_fft=FFT,
                                        hop_length=hop, tuning=0)
    mel = librosa.feature.melspectrogram(S=power, sr=sr, n_fft=FFT,
                                         n_mels=32, fmin=30, fmax=10000)
    mfcc = librosa.feature.mfcc(S=librosa.power_to_db(mel), n_mfcc=13)
    low = sosfilt(butter(3, [35, 180], btype='bandpass', fs=sr, output='sos'), y)
    width = 8 * 4 * 60 / bpm
    phrases, vectors = [], []
    for index, start in enumerate(np.arange(anchor, duration, width)):
        end = min(duration, start + width)
        if end - start < .5:
            continue
        a, b = round(start * sr), round(end * sr)
        f0, f1 = int(start * sr / hop), min(power.shape[1], math.ceil(end * sr / hop))
        rms = float(np.sqrt(np.mean(y[a:b] ** 2)))
        low_rms = float(np.sqrt(np.mean(low[a:b] ** 2)))
        c = np.mean(chroma[:, f0:f1], axis=1)
        c = c / max(float(np.linalg.norm(c)), 1e-12)
        timbre = np.mean(mfcc[1:13, f0:f1], axis=1) / 100
        vector = np.concatenate((c, timbre))
        similarity = cosine(vector, vectors[-1]) if vectors else None
        rms_db = 20 * math.log10(max(rms, 1e-12))
        repeat = (similarity is not None and similarity >= .985
                  and abs(rms_db - phrases[-1]['rms_dbfs']) <= 1.5
                  and end - start >= .95 * width
                  and not phrases[-1]['partial'])
        phrases.append({'index': index, 'start_seconds': float(start),
                        'end_seconds': float(end), 'partial': bool(end - start < .95 * width),
                        'rms_dbfs': rms_db,
                        'lowband_dbfs': 20 * math.log10(max(low_rms, 1e-12)),
                        'onset_strength': float(np.mean(onsets[f0:f1])),
                        'chroma': [float(v) for v in c],
                        'texture_vector': [float(v) for v in vector],
                        'texture_similarity_previous': similarity,
                        'repeat_candidate': bool(repeat),
                        'repeat_note': 'Similarity flag only; not evidence a passage is musically expendable.'})
        vectors.append(vector)
    return phrases


def analyze_signal(y, sr, prior):
    import numpy as np
    import librosa
    power = np.abs(librosa.stft(y, n_fft=FFT, hop_length=HOP)) ** 2
    db = librosa.power_to_db(power, ref=np.max)
    broad = librosa.onset.onset_strength(S=db, sr=sr, hop_length=HOP, center=False)
    frequencies = librosa.fft_frequencies(sr=sr, n_fft=FFT)
    bass = librosa.onset.onset_strength(S=db[(frequencies >= 35) & (frequencies <= 180)],
                                       sr=sr, hop_length=HOP, center=False)
    # Avoid letting broadband hats/snare alone dictate the grid phase.
    broad = broad / max(float(np.percentile(broad, 95)), 1e-6)
    bass = bass / max(float(np.percentile(bass, 95)), 1e-6)
    onset = .65 * bass + .35 * broad
    result = fit_grid(onset, prior, len(y) / sr, sr)
    result['phrase_bars'] = 8
    result['phrases'] = phrase_metrics(y, power, onset, result['bpm'],
                                       result['grid_anchor_seconds'], sr)
    return result


def loudness(path):
    result = run(['ffmpeg', '-hide_banner', '-nostdin', '-nostats', '-i', str(path),
                  '-af', 'ebur128=peak=true:framelog=verbose', '-f', 'null', '-'])
    value = re.search(r'Integrated loudness:\s+I:\s+([-\d.]+) LUFS', result.stderr)
    peak = re.search(r'True peak:\s+Peak:\s+([-\d.]+) dBFS', result.stderr)
    return {'integrated_lufs': float(value[1]) if value else None,
            'true_peak_dbfs': float(peak[1]) if peak else None,
            'source': 'FFmpeg ebur128 on decoded source audio'}


def decode_source(source, root, ident):
    """Share one hash-checked float decode between beat models and analysis."""
    source, root = Path(source).resolve(), Path(root)
    key = file_key(ident)
    wav = root / 'decoded' / f'{key}.wav'
    if wav.resolve() == source:
        raise ValueError('Decoded output must not replace the original source')
    binding_path = root / 'decoded' / f'{key}-binding.json'
    source_hash = digest(source)
    binding = json.loads(binding_path.read_text()) if binding_path.exists() else {}
    if (wav.exists() and binding.get('source_sha256') == source_hash
            and binding.get('decoded_sha256') == digest(wav)):
        return wav
    wav.parent.mkdir(parents=True, exist_ok=True)
    run(['ffmpeg', '-v', 'error', '-nostdin', '-y', '-i', str(source), '-map', '0:a:0',
         '-ar', '48000', '-ac', '2', '-c:a', 'pcm_f32le', str(wav)])
    write_json(binding_path, {'source_sha256': source_hash, 'decoded_sha256': digest(wav)})
    return wav


def analyze_track(track, root, include_loudness=True, source=None):
    import librosa
    import soundfile as sf
    ident = track['id']
    audition = source is None
    key = file_key(ident)
    if audition and not re.fullmatch(r'hollow-01-\d{3}', ident):
        raise ValueError('Unexpected audition track ID')
    source = (root / 'sources' / f'{ident}.webm') if audition else Path(source).resolve()
    wav = source.with_suffix('.wav') if audition else root / 'decoded' / f'{key}.wav'
    if wav.resolve() == source.resolve():
        raise ValueError('Decoded output must not replace the original source')
    wav.parent.mkdir(parents=True, exist_ok=True)
    cache = root / 'cache' / f'{key}.json'
    source_hash = digest(source)
    prior = catalog_prior(track)
    if cache.exists() and wav.exists():
        try:
            old = json.loads(cache.read_text())
            if not isinstance(old, dict):
                old = {}
        except (OSError, json.JSONDecodeError):
            old = {}
        if (old.get('analysis_version') == VERSION and old.get('source_sha256') == source_hash
                and old.get('catalog_tempo') == prior and old.get('sha256') == digest(wav)
                and old.get('audition_only') == audition
                and (not include_loudness or old.get('loudness'))):
            return old
    if audition:
        run(['ffmpeg', '-v', 'error', '-nostdin', '-y', '-i', str(source), '-map', '0:a:0',
             '-ar', '48000', '-ac', '2', '-c:a', 'pcm_f32le', str(wav)])
    else:
        wav = decode_source(source, root, ident)
    info = sf.info(str(wav))
    y, sr = librosa.load(str(wav), sr=ANALYSIS_SR, mono=True)
    result = {'analysis_version': VERSION, 'id': ident, 'artist': track['artist'],
              'title': track['title'], 'path': str(wav.resolve()), 'sha256': digest(wav),
              'source_path': str(source.resolve()), 'source_sha256': source_hash,
              'duration_seconds': info.frames / info.samplerate,
              'catalog_duration_seconds': track['duration_ms'] / 1000,
              'catalog_tempo': prior, 'audition_only': audition,
              'decode_format': '48 kHz stereo IEEE float32 WAV; source overs preserved before gain',
              'host_approved': False, 'measured_at': datetime.now(timezone.utc).isoformat(),
              'feature_note': 'Phrase RMS/lowband are mono analysis measures, not LUFS or room loudness.'}
    result.update(analyze_signal(y, sr, prior['value']))
    result['loudness'] = loudness(wav) if include_loudness else None
    write_json(cache, result)
    return result


def summarize(track):
    grid = track['grid']
    print(f"{track['id']} {track['artist']} — {track['title']} | measured {track['bpm']:.3f} "
          f"BPM vs prior {track['catalog_tempo']['value']:.3f}; anchor {track['grid_anchor_seconds']:.3f}s "
          f"PROVISIONAL; conf {grid['heuristic_confidence']:.2f}; residual95 {grid['beat_residual_p95_ms']:.1f}ms; "
          f"usable={grid['usable_constant_grid']}; halves {grid['first_half_bpm']:.3f}/{grid['second_half_bpm']:.3f}", flush=True)
    if grid['rejection_reasons']:
        print('  GRID REJECTED: ' + '; '.join(grid['rejection_reasons']), flush=True)
    for p in track['phrases']:
        similarity = '-' if p['texture_similarity_previous'] is None else f"{p['texture_similarity_previous']:.3f}"
        print(f"  p{p['index']:02d} {p['start_seconds']:7.2f}–{p['end_seconds']:7.2f}s "
              f"rms {p['rms_dbfs']:6.1f} low {p['lowband_dbfs']:6.1f} "
              f"onset {p['onset_strength']:.2f} sim {similarity} "
              f"{'REPEAT?' if p['repeat_candidate'] else ''}{' partial' if p['partial'] else ''}", flush=True)


def analyze(root=DEFAULT_ROOT, include_loudness=True, only=None):
    root = Path(root).expanduser().resolve()
    selected = json.loads((root / 'selection.json').read_text())
    if only:
        selected = [track for track in selected if track['id'] in only]
    output = {'analysis_version': VERSION, 'tracks': [], 'errors': [],
              'downbeats_human_verified': False, 'party_ready': False,
              'note': 'Actual-file estimates for delegated audition production; no votes or recording approvals implied.'}
    for track in selected:
        try:
            print(f"Analyzing {track['id']} {track['artist']} — {track['title']} ...", flush=True)
            measured = analyze_track(track, root, include_loudness)
            output['tracks'].append(measured)
            summarize(measured)
        except Exception as error:
            output['errors'].append({'id': track['id'], 'error': str(error)})
            print(f"ERROR {track['id']}: {error}", flush=True)
        write_json(root / 'analysis.json', output)
    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=DEFAULT_ROOT)
    parser.add_argument('--only', action='append')
    parser.add_argument('--skip-loudness', action='store_true')
    args = parser.parse_args()
    result = analyze(args.root, not args.skip_loudness, set(args.only or []))
    raise SystemExit(2 if result['errors'] else 0)
