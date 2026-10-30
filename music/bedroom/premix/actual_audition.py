#!/usr/bin/env python3
"""Build a private real-track audition from hash-bound analysis and explicit edits.

An audition is not an approval export. This tool never opens the review database.
Downloaded music, projects and renders belong in ignored .local storage.
"""
import argparse
from array import array
import bisect
import json
import math
from pathlib import Path
import re
import subprocess
import sys

from reaper_proof import build_lock, checksum, run_reaper, save_plan


BASE = Path(__file__).resolve().parent
DEFAULT_ROOT = BASE / '.local/actual-batch-01'


def tempo_at(beat, total, incoming, outgoing, hold):
    if total <= 2*hold:
        raise ValueError('Retain enough music for two blends and a solo tempo ramp')
    fraction = min(1, max(0, (beat-hold)/(total-2*hold)))
    return incoming + fraction*(outgoing-incoming)


def warped_clip(source_start, beats, source_bpm, offset, total, incoming, outgoing,
                hold=32):
    """Map each source bar to output time; overlaps hold exactly the same tempo.

    Marker source coordinates are absolute seconds in the underlying source file,
    independently checked with the native pulse calibration, including nonzero offset.
    Each bar has a constant rate; tiny changes between solo bars form the ramp.
    """
    if (source_start < 0 or beats <= 0 or beats % 4 or offset < 0
            or any(not math.isfinite(x) or x <= 0
                   for x in [source_bpm, total, incoming, outgoing, hold])):
        raise ValueError('Invalid warp inputs')
    points, tempo, position, rates = [], [], 0.0, []
    for beat in range(0, beats+1, 4):
        points.append({'position': position, 'source': source_start+beat*60/source_bpm})
        if beat == beats:
            break
        bpm = tempo_at(offset+beat+2, total, incoming, outgoing, hold)
        rate = bpm/source_bpm
        if not .94 <= rate <= 1.06:
            raise ValueError(f'Warp exceeds six percent: {rate:.5f}')
        tempo.append({'time': position, 'bpm': bpm})
        rates.append(rate)
        position += 240/bpm
    return ({'source_start': source_start, 'position': 0, 'length': position,
             'rate': 1, 'fade_in': .003, 'fade_out': .003, 'stretch_markers': points},
            tempo, rates)


def build(root, analysis_path, decisions_path):
    root = root.resolve()
    analysis = json.loads(analysis_path.read_text())
    decisions = json.loads(decisions_path.read_text())
    analyzed = {t['id']: t for t in analysis['tracks']}
    ordered = [analyzed[d['id']] for d in decisions['tracks']]
    if len(set(t['id'] for t in ordered)) != len(ordered):
        raise ValueError('Repeated audition recording')
    definitions, details, markers, tempo_map = [], [], [], []
    end = 0.0
    for index, (track, edit) in enumerate(zip(ordered, decisions['tracks'])):
        path = Path(track['path']).resolve()
        if checksum(path) != track['sha256']:
            raise ValueError('Analysis source changed: '+track['id'])
        if not track['grid'].get('usable_constant_grid'):
            raise ValueError('Grid analysis rejected this source: '+track['id'])
        if edit['source_sha256'] != track['sha256']:
            raise ValueError('Edit decisions refer to a different source: '+track['id'])
        if (abs(edit['grid_bpm']-track['bpm']) > .000001
                or abs(edit['grid_anchor_seconds']-track['grid_anchor_seconds']) > .000001):
            raise ValueError('Grid changed since edit selection: '+track['id'])
        bpm = track['bpm']
        previous = ordered[index-1] if index else None
        following = ordered[index+1] if index+1 < len(ordered) else None
        incoming_reset = bool(edit.get('reset_before'))
        outgoing_reset = bool(following and decisions['tracks'][index+1].get('reset_before'))
        incoming = (bpm+previous['bpm'])/2 if previous and not incoming_reset else bpm
        outgoing = (bpm+following['bpm'])/2 if following and not outgoing_reset else bpm
        # All source ranges are explicit eight-bar phrase indices. No opaque auto-cut.
        ranges = edit['retain_phrases']
        if any(not (isinstance(a, int) and isinstance(b, int) and 0 <= a < b)
               for a, b in ranges):
            raise ValueError('Invalid phrase selection')
        if any(ranges[i][1] > ranges[i+1][0] for i in range(len(ranges)-1)):
            raise ValueError('Retained ranges overlap or run backwards')
        total_beats = sum((b-a)*32 for a, b in ranges)
        blend_bars = edit.get('blend_bars', 8)
        if blend_bars not in (4, 8):
            raise ValueError('Use a four- or eight-bar audition blend')
        overlap = (.04 if incoming_reset else blend_bars*240/incoming) if index else 0
        start = end-overlap
        offset, local_position = 0, 0.0
        clips, local_tempo, rates, source_ranges, cuts = [], [], [], [], []
        for range_index, (a, b) in enumerate(ranges):
            source_start = track['grid_anchor_seconds']+a*32*60/bpm
            source_end = track['grid_anchor_seconds']+b*32*60/bpm
            if source_end > track['duration_seconds']-.015:
                raise ValueError('Edit exceeds source: '+track['id'])
            item, tempos, item_rates = warped_clip(source_start, (b-a)*32, bpm,
                offset, total_beats, incoming, outgoing)
            item['position'] = start+local_position
            if range_index:
                cut = {'time': item['position'], 'from_source': source_ranges[-1][1],
                       'to_source': source_start}
                cuts.append(cut)
                markers.append({'time': cut['time'], 'name': 'CUT · '+track['artist']})
            local_tempo.extend({'time': start+local_position+t['time'], 'bpm': t['bpm']}
                               for t in tempos)
            clips.append(item)
            rates.extend(item_rates)
            source_ranges.append([source_start, source_end])
            local_position += item['length']
            offset += (b-a)*32
        end = start+local_position
        outgoing_bars = decisions['tracks'][index+1].get('blend_bars', 8) if following else 0
        fade_out = (.10 if outgoing_reset else outgoing_bars*240/outgoing) if following else 1.5
        clips[0]['fade_in'] = (.025 if incoming_reset else overlap) if index else .04
        clips[-1]['fade_out'] = fade_out
        shelf = [{'time': 0, 'db': -24 if index and not incoming_reset else 0}]
        if overlap and not incoming_reset:
            shelf.extend([{'time': start+overlap*.5-.10, 'db': -24},
                          {'time': start+overlap*.5-.03, 'db': 0}])
        if following and not outgoing_reset:
            shelf.extend([{'time': end-fade_out*.5-.10, 'db': 0},
                          {'time': end-fade_out*.5-.03, 'db': -24},
                          {'time': end, 'db': -24}])
        else:
            shelf.append({'time': end, 'db': 0})
        measured_lufs = track['loudness']['integrated_lufs']
        gain = min(0, max(-18, -14-measured_lufs))
        definitions.append({'name': f'{index+1:02d} · {track["artist"]} · {track["title"]}',
                            'path': str(path), 'sha256': track['sha256'],
                            'gain_db': gain, 'clips': clips, 'shelf': shelf})
        markers.append({'time': start, 'name': f'{index+1:02d} · '+track['artist']+
                        (' · DnB RESET' if incoming_reset else '')})
        # Incoming overlap uses the previous track's identical constant tempo.
        tempo_map.extend(t for t in local_tempo
                         if incoming_reset or t['time'] >= start+overlap)
        details.append({'id': track['id'], 'artist': track['artist'], 'title': track['title'],
            'source_sha256': track['sha256'], 'source_seconds': track['duration_seconds'],
            'measured_bpm': bpm, 'grid_confidence': track['grid']['heuristic_confidence'],
            'downbeat_verified': False, 'retain_phrases': ranges,
            'retained_source_ranges': source_ranges, 'start_seconds': start,
            'end_seconds': end, 'incoming_bpm': incoming, 'outgoing_bpm': outgoing,
            'rate_range': [min(rates), max(rates)], 'gain_db': gain,
            'overlap_seconds': overlap, 'reset_before': incoming_reset,
            'interior_cuts': cuts, 'editorial_reason': edit['reason']})
    plan = save_plan(root, 'hollow-audition-01', definitions, end, markers,
                    purpose='Private bedroom batch audition; host votes unchanged; not party approved',
                    bpm=details[0]['incoming_bpm'], master_db=-7, tempo_map=tempo_map)
    report = {'schema_version': 1, 'audition_only': True, 'party_ready': False,
              'host_votes_changed': False, 'downbeats_human_verified': False,
              'tracks': details, 'end_seconds': end,
              'original_source_seconds': sum(t['duration_seconds'] for t in ordered),
              'retained_source_seconds': sum(b-a for t in details
                                             for a, b in t['retained_source_ranges']),
              'native_plan_manifest_sha256': plan['manifest_sha256']}
    (root/'audition-edit-report.json').write_text(json.dumps(report, indent=2)+'\n')
    return report


def measure(path):
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_format',
        '-show_streams', '-of', 'json', str(path)]))
    result = subprocess.run(['ffmpeg', '-hide_banner', '-nostdin', '-i', str(path),
        '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'],
        capture_output=True, text=True, check=True)
    loud = json.JSONDecoder().raw_decode(result.stderr[result.stderr.rfind('{'):])[0]
    return {'duration_seconds': float(probe['format']['duration']),
            'codec': probe['streams'][0]['codec_name'],
            'sample_rate': int(probe['streams'][0]['sample_rate']),
            'channels': probe['streams'][0]['channels'],
            'integrated_lufs': float(loud['input_i']),
            'true_peak_dbfs': float(loud['input_tp']),
            'loudness_range_lu': float(loud['input_lra'])}


def unexpected_silences(intervals, duration):
    return [[a, b] for a, b in intervals
            if (a > .2 and b < duration-.2) or b-a > 2]


def source_time(item, output_time):
    local = output_time-item['position']
    points = item['stretch_markers']
    index = max(0, min(len(points)-2,
        bisect.bisect_right([p['position'] for p in points], local)-1))
    a, b = points[index:index+2]
    return a['source']+(local-a['position'])/(b['position']-a['position'])*(b['source']-a['source'])


def source_rest(plan, interval, maximum_seconds=.8):
    """Distinguish a short musical rest from an inserted gap, using source PCM.

    Only rests within the explicit limit, completely inside a clip, qualify. Every source
    active at its midpoint must itself be quiet in the central 70 percent.
    A gap at a splice, missing clip, long silence or loud source fails closed.
    """
    a, b = interval
    if b-a > maximum_seconds:
        return None
    evidence = []
    for track in plan['tracks']:
        for item in track['clips']:
            if not item['position'] <= (a+b)/2 < item['position']+item['length']:
                continue
            if a < item['position']+.1 or b > item['position']+item['length']-.1:
                return None
            start, end = source_time(item, a), source_time(item, b)
            margin = (end-start)*.15
            raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-nostdin',
                '-ss', str(start+margin), '-i', track['path'], '-t', str(end-start-2*margin),
                '-f', 'f32le', '-acodec', 'pcm_f32le', '-'])
            signal = array('f')
            signal.frombytes(raw)
            if sys.byteorder != 'little':
                signal.byteswap()
            peak = 20*math.log10(max(max((abs(v) for v in signal), default=0), 1e-12))
            if not signal or peak > -35:
                return None
            evidence.append({'source_sha256': track['sha256'], 'name': track['name'],
                'source_seconds': [start, end], 'central_source_peak_dbfs': peak})
    return {'master_seconds': interval, 'source_evidence': evidence} if evidence else None


def deliver(root):
    """Validate native output, then encode a private audition and transition excerpts."""
    report = json.loads((root/'audition-edit-report.json').read_text())
    plan = json.loads((root/'hollow-audition-01-plan.json').read_text())
    actual = json.loads(Path(plan['readback']).read_text())
    if actual['manifest_sha256'] != plan['manifest_sha256'] or actual['run_id'] != plan['run_id']:
        raise ValueError('Native readback is stale')
    for intended, recorded in zip(plan['tracks'], actual['tracks'], strict=True):
        if checksum(Path(intended['path'])) != intended['sha256']:
            raise ValueError('Source changed during rendering')
        if abs(recorded['gain_db']-intended['gain_db']) > .001:
            raise ValueError('Track gain readback differs')
        for expected, got in zip(intended['clips'], recorded['clips'], strict=True):
            for key in ['source_start', 'position', 'length', 'fade_in', 'fade_out', 'rate']:
                if abs(got[key]-expected[key]) > .00001:
                    raise ValueError('Native clip differs: '+key)
            if got['preserve_pitch'] != 1:
                raise ValueError('Pitch preservation disabled')
            for expected_marker, got_marker in zip(expected['stretch_markers'],
                                                    got['stretch_markers'], strict=True):
                if any(abs(expected_marker[k]-got_marker[k]) > .00001
                       for k in ['position', 'source']):
                    raise ValueError('Native warp differs')
    native_master = root/'renders/hollow-audition-01.wav'
    native_meters = measure(native_master)
    if (abs(native_meters['duration_seconds']-report['end_seconds']) > .05
            or native_meters['channels'] != 2 or native_meters['sample_rate'] != 48000
            or native_meters['codec'] != 'pcm_s24le' or native_meters['true_peak_dbfs'] > -1
            or not math.isfinite(native_meters['integrated_lufs'])
            or not math.isfinite(native_meters['true_peak_dbfs'])):
        raise ValueError('Rendered format, length or true peak check failed: '+str(native_meters))
    # Constant delivery gain only: no new compression or limiters. Keep enough
    # true-peak margin for MP3 encoding and cap the intended audition at -16 LUFS.
    delivery_gain = min(-16-native_meters['integrated_lufs'],
                        -2-native_meters['true_peak_dbfs'])
    master = native_master.with_name('hollow-audition-01-master.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-y', '-i', str(native_master),
        '-af', f'volume={delivery_gain}dB', '-c:a', 'pcm_s24le', str(master)], check=True)
    meters = measure(master)
    if meters['true_peak_dbfs'] > -1.9:
        raise ValueError('Delivery headroom check failed')
    silence = subprocess.run(['ffmpeg', '-hide_banner', '-nostdin', '-i', str(master),
        '-af', 'silencedetect=noise=-50dB:d=0.2', '-f', 'null', '-'],
        capture_output=True, text=True, check=True)
    starts = [float(x) for x in re.findall(r'silence_start: ([0-9.]+)', silence.stderr)]
    ends = [float(x) for x in re.findall(r'silence_end: ([0-9.]+)', silence.stderr)]
    intervals = [[a, b] for a, b in zip(starts, ends, strict=True)]
    candidates = unexpected_silences(intervals, report['end_seconds'])
    expected_rests, unexpected = [], []
    for interval in candidates:
        rest = source_rest(plan, interval)
        (expected_rests if rest else unexpected).append(rest or interval)
    if unexpected:
        raise ValueError('Unexpected interior silence: '+str(unexpected))
    mp3 = master.with_name('hollow-audition-01.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-y', '-i', str(master),
        '-c:a', 'libmp3lame', '-b:a', '256k', '-metadata',
        'title=The Hollow · private batch audition 01', str(mp3)], check=True)
    # A continuous excerpt, never a montage presented as uninterrupted transitions.
    selected = report['tracks'][3:6]
    start = selected[0]['start_seconds']+30
    duration = min(240, selected[-1]['end_seconds']-start)
    preview = master.with_name('hollow-audition-01-preview.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-y', '-ss', str(start),
        '-i', str(master), '-t', str(duration), '-af',
        f'afade=t=in:d=0.03,afade=t=out:st={duration-.3}:d=0.3',
        '-c:a', 'libmp3lame', '-b:a', '256k', str(preview)], check=True)
    reset = next(t for t in report['tracks'] if t['reset_before'])
    reset_clip = master.with_name('hollow-audition-01-dnb-entry.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-y',
        '-ss', str(reset['start_seconds']-20), '-i', str(master), '-t', '60',
        '-af', 'afade=t=in:d=0.03,afade=t=out:st=59.7:d=0.3',
        '-c:a', 'libmp3lame', '-b:a', '256k', str(reset_clip)], check=True)
    result = {'native_timeline_readback_passed': True, 'meters': meters,
              'native_meters': native_meters, 'constant_delivery_gain_db': delivery_gain,
              'silence_threshold_dbfs': -50, 'silence_minimum_seconds': .2,
              'silence_intervals': intervals, 'unexpected_interior_silences': unexpected,
              'verified_short_source_rests': expected_rests,
              'subjective_listening_verified': False, 'party_ready': False,
              'master_sha256': checksum(master), 'mp3_sha256': checksum(mp3),
              'preview_start_seconds': start, 'preview_duration_seconds': duration}
    (root/'render-verification.json').write_text(json.dumps(result, indent=2)+'\n')
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=DEFAULT_ROOT)
    parser.add_argument('--analysis', type=Path, default=DEFAULT_ROOT/'analysis.json')
    parser.add_argument('--decisions', type=Path, default=BASE/'audition-01-decisions.json')
    parser.add_argument('--render', action='store_true')
    parser.add_argument('--deliver-only', action='store_true')
    args = parser.parse_args()
    root = args.output.resolve()
    with build_lock(root):
        if not args.deliver_only:
            result = build(root, args.analysis, args.decisions)
            print(json.dumps({'tracks': len(result['tracks']), 'seconds': result['end_seconds']}, indent=2))
        if args.render:
            run_reaper(root, Path('/Applications/REAPER.app/Contents/MacOS/REAPER'),
                       BASE/'.local/reaper-resource/reaper.ini',
                       names=('hollow-audition-01',), render_timeout=600)
        if args.render or args.deliver_only:
            print(json.dumps(deliver(root), indent=2))
