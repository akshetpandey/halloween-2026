#!/usr/bin/env python3
"""Independent mechanical QA for the original synthetic REAPER render proof.

Requires installed ffmpeg/ffprobe, otherwise uses Python's standard library.
Does not operate REAPER, change projects, or claim an audible audition.
"""
import argparse
from array import array
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import sys
import wave


DEFAULT_ROOT = Path(__file__).resolve().parent / '.local/reaper-proof'
RATE = 48000


def _run(command):
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode:
        raise ValueError(f'{command[0]} failed: {result.stderr[-1500:]}')
    return result


def _probe(path):
    return json.loads(_run(['ffprobe', '-v', 'error', '-show_streams',
                            '-show_format', '-of', 'json', str(path)]).stdout)


def _decode(path, target):
    _run(['ffmpeg', '-v', 'error', '-nostdin', '-y', '-i', str(path),
          '-map', '0:a:0', '-ar', str(RATE), '-ac', '2',
          '-c:a', 'pcm_s16le', str(target)])


def _pcm(path, start=0, end=None):
    with wave.open(str(path), 'rb') as handle:
        if (handle.getnchannels(), handle.getsampwidth(), handle.getframerate()) != (2, 2, RATE):
            raise ValueError('QA waveform must be stereo PCM16/48kHz')
        first = round(start * RATE)
        count = handle.getnframes() - first if end is None else round((end - start) * RATE)
        if first < 0 or count <= 0 or first + count > handle.getnframes():
            raise ValueError('Requested QA region is outside the waveform')
        handle.setpos(first)
        values = array('h', handle.readframes(count))
    if sys.byteorder != 'little':
        values.byteswap()
    return values


def _correlation(left, right):
    if len(left) != len(right) or not left:
        raise ValueError('Correlation requires equally sized nonempty regions')
    count = len(left)
    a, b = sum(left), sum(right)
    covariance = sum(x * y for x, y in zip(left, right)) - a * b / count
    variance_a = sum(x * x for x in left) - a * a / count
    variance_b = sum(x * x for x in right) - b * b / count
    return covariance / math.sqrt(variance_a * variance_b) if variance_a > 0 and variance_b > 0 else 0.0


def _loudness_and_silence(path, duration):
    result = _run(['ffmpeg', '-hide_banner', '-nostats', '-nostdin', '-i', str(path),
                   '-af', 'ebur128=peak=true:framelog=verbose,silencedetect=noise=-70dB:d=0.1',
                   '-f', 'null', '-'])
    log = result.stderr
    integrated = re.search(r'Integrated loudness:\s+I:\s+([-\d.]+) LUFS', log)
    peak = re.search(r'True peak:\s+Peak:\s+([-\d.]+) dBFS', log)
    if not integrated or not peak:
        raise ValueError('FFmpeg did not report integrated loudness and true peak')
    intervals, start = [], None
    for match in re.finditer(r'silence_(start|end):\s*([-\d.]+)', log):
        if match[1] == 'start':
            start = float(match[2])
        elif start is not None:
            intervals.append({'start_seconds': start, 'end_seconds': float(match[2])})
            start = None
    if start is not None:
        intervals.append({'start_seconds': start, 'end_seconds': duration})
    for interval in intervals:
        interval['duration_seconds'] = interval['end_seconds'] - interval['start_seconds']
        interval['expected_edge'] = (interval['start_seconds'] >= duration - .15
                                     or interval['end_seconds'] <= .15)
    return {'integrated_lufs': float(integrated[1]), 'true_peak_dbfs': float(peak[1]),
            'silence_threshold_dbfs': -70, 'silence_minimum_seconds': .1,
            'ignored_edge_seconds': .15, 'silences': intervals,
            'unexpected_silences': [x for x in intervals if not x['expected_edge']]}


def _tone_frequency(samples):
    # Positive zero crossings with linear interpolation, away from file edges.
    crossings = []
    previous = samples[0]
    for frame in range(1, len(samples) // 2):
        value = samples[2 * frame]
        if previous <= 0 < value:
            crossings.append(frame - 1 + (-previous / (value - previous)))
        previous = value
    if len(crossings) < 100:
        raise ValueError('Calibration tone has too few usable positive crossings')
    return RATE * (len(crossings) - 1) / (crossings[-1] - crossings[0])


def _tempo_diagnostic(samples):
    # Low-pass bass/kick RMS -> positive energy flux -> autocorrelation.
    # This is a diagnostic for this fixed 4/4 fixture, not a general beat tracker.
    alpha = 1 - math.exp(-2 * math.pi * 100 / RATE)
    low, energy, envelope = 0.0, 0.0, []
    block = RATE // 200
    for frame in range(len(samples) // 2):
        mono = (samples[2 * frame] + samples[2 * frame + 1]) / 65536
        low += alpha * (mono - low)
        energy += low * low
        if (frame + 1) % block == 0:
            envelope.append(math.sqrt(energy / block))
            energy = 0.0
    flux = [max(0, b - a) for a, b in zip(envelope, envelope[1:])]
    mean = sum(flux) / len(flux)
    flux = [value - mean for value in flux]
    scores = {lag: _correlation(flux[:-lag], flux[lag:]) for lag in range(75, 116)}
    best = max(scores, key=scores.get)
    lag = float(best)
    if best - 1 in scores and best + 1 in scores:
        a, b, c = scores[best - 1], scores[best], scores[best + 1]
        denominator = a - 2 * b + c
        if denominator:
            lag += max(-.5, min(.5, .5 * (a - c) / denominator))
    bpm = 60 * 200 / lag
    confidence = scores[best]
    status = 'uncertain' if confidence < .5 else ('matched' if abs(bpm - 128) <= 2 else 'mismatch')
    return {'method': '100Hz low-pass, 200Hz RMS flux autocorrelation; fixture-specific',
            'source_region_output_seconds': [45, 73], 'expected_bpm': 128,
            'estimated_bpm': bpm, 'autocorrelation': confidence, 'status': status,
            'note': 'Does not prove downbeat, phrase or musical transition quality.'}


def verify(root: Path):
    root = Path(root).expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)
    report = {'checked_at': datetime.now(timezone.utc).isoformat(),
              'scope': 'Synthetic REAPER render mechanical QA; no audible audition.',
              'passed': False, 'checks': {}, 'failures': []}
    checks = report['checks']

    def check(name, passed, detail):
        checks[name] = {'passed': bool(passed), **detail}
        if not passed:
            report['failures'].append(name)

    try:
        fixtures = json.loads((root / 'sources/fixtures.json').read_text())
        source_a = Path(fixtures['tracks']['a']['path'])
        report['origin'] = fixtures['origin']
        for name in ('a', 'b'):
            source = Path(fixtures['tracks'][name]['path'])
            expected_hash = fixtures['tracks'][name]['sha256']
            check(f'source_{name}_identity', hashlib.sha256(source.read_bytes()).hexdigest() == expected_hash,
                  {'expected_sha256': expected_hash})
        master = root / 'renders/reaper-proof.wav'
        probe = _probe(master)
        audio = [stream for stream in probe['streams'] if stream['codec_type'] == 'audio']
        stream = audio[0]
        duration = float(stream.get('duration', probe['format']['duration']))
        check('format', len(audio) == 1 and stream['codec_name'] == 'pcm_s24le'
              and int(stream['sample_rate']) == RATE and stream['channels'] == 2,
              {'codec': stream['codec_name'], 'sample_rate': stream['sample_rate'],
               'channels': stream['channels'], 'bits_per_sample': stream.get('bits_per_sample')})
        check('duration', abs(duration - 75) <= 1 / RATE + 1e-7,
              {'actual_seconds': duration, 'expected_seconds': 75, 'tolerance_frames': 1})
        report['master'] = {'path': str(master), 'sha256': hashlib.sha256(master.read_bytes()).hexdigest()}
        measured = _loudness_and_silence(master, duration)
        report['audio_measurements'] = measured
        check('no_unexpected_silence', not measured['unexpected_silences'],
              {'intervals': measured['unexpected_silences']})
        qa = root / 'qa.wav'
        _decode(master, qa)
        decoded = _pcm(qa)
        sample_peak = max(abs(value) for value in decoded) / 32768
        check('no_clipping', sample_peak < 32767 / 32768 and measured['true_peak_dbfs'] < 0,
              {'decoded_sample_peak_dbfs': 20 * math.log10(sample_peak) if sample_peak else None,
               'true_peak_dbfs': measured['true_peak_dbfs'],
               'note': 'Checks output full-scale samples/true peak; does not inspect upstream history.'})
        with wave.open(str(qa), 'rb') as handle:
            check('decoded_frame_count', abs(handle.getnframes() - 75 * RATE) <= 1,
                  {'frames': handle.getnframes(), 'expected_frames': 75 * RATE})
        before = _correlation(_pcm(qa, 10, 14), _pcm(source_a, 10, 14))
        after = _correlation(_pcm(qa, 16, 20), _pcm(source_a, 31, 35))
        wrong = _correlation(_pcm(qa, 16, 20), _pcm(source_a, 16, 20))
        check('pre_cut_identity', before > .99,
              {'output_seconds': [10, 14], 'source_seconds': [10, 14], 'correlation': before})
        check('post_cut_identity', after > .99 and after - wrong > .02,
              {'output_seconds': [16, 20], 'correct_source_seconds': [31, 35],
               'wrong_uncut_source_seconds': [16, 20], 'correct_correlation': after,
               'wrong_correlation': wrong, 'required_correct_minus_wrong': .02})
        tempo = _tempo_diagnostic(_pcm(qa, 45, 73))
        report['tempo_diagnostic'] = tempo
        if tempo['status'] != 'uncertain':
            check('b_only_kick_spacing', tempo['status'] == 'matched', tempo)
        pitch = root / 'renders/pitch-check.wav'
        if pitch.exists():
            tone_probe = _probe(pitch)
            tone_duration = float(tone_probe['format']['duration'])
            tone_qa = root / 'pitch-qa.wav'
            _decode(pitch, tone_qa)
            frequency = _tone_frequency(_pcm(tone_qa, 1, min(5, tone_duration - .2)))
            check('pitch_preservation', abs(frequency - 440) <= 2,
                  {'estimated_hz': frequency, 'expected_hz': 440, 'tolerance_hz': 2,
                   'unpreserved_expected_hz': 440 * 128 / 132})
            check('pitch_calibration_duration', abs(tone_duration - 6.1875) <= 1 / RATE + 1e-7,
                  {'actual_seconds': tone_duration, 'expected_seconds': 6.1875})
        else:
            report['pitch_calibration'] = {'status': 'not present; not tested', 'optional': True}
        report['passed'] = not report['failures']
    except (OSError, ValueError, KeyError, IndexError, wave.Error) as error:
        report['failures'].append('verification_error')
        report['error'] = str(error)
    target = root / 'verification.json'
    temp = target.with_suffix('.json.tmp')
    temp.write_text(json.dumps(report, indent=2) + '\n')
    temp.replace(target)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=DEFAULT_ROOT)
    args = parser.parse_args()
    result = verify(args.root)
    print(json.dumps(result, indent=2))
    return 0 if result['passed'] else 2


if __name__ == '__main__':
    raise SystemExit(main())
