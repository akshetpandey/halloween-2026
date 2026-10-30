#!/usr/bin/env python3
"""A source-bound featured DJ edit of the accepted pair; not a final programme.

REAPER performs pitch-preserved cue playback and loop slicing. Only the
isolated roll/echo layers are printed with DSP; original stereo bodies remain
editable. Requires the existing ignored research stems and approved sources.
"""
import argparse
import json
import math
from pathlib import Path

from analyze_audio import digest, write_json
from dj_performance_fx import check_repeat_clock, echo_tail, spectral_sweep, tightening_roll
from plan_mix import eligible, gain_for, retained_loudness
from prepare import DEFAULT_DB, approved_pool, file_key, host_rows
from reaper_proof import clip, save_plan
from render_set import measure, preview_file, render_native, silence_check
from research_audition import BASE, IDS, eq, points


def schedule(bpm=149):
    beat = 60 / bpm
    return {
        'bpm': bpm, 'beat': beat, 'feature': 64 * beat,
        'hook': 67 * beat, 'hook_end': 84 * beat,
        'roll': 80 * beat, 'drum_cut': 95 * beat,
        'drop': 96 * beat, 'tail_end': 112 * beat, 'end': 224 * beat,
    }


def effect_gain(meters, target=-18, max_gain=8):
    if not all(math.isfinite(meters[k]) for k in ['integrated_lufs', 'true_peak_dbfs']):
        raise ValueError('Silent or nonfinite performance layer')
    return min(max_gain, target - meters['integrated_lufs'], -4 - meters['true_peak_dbfs'])


def run(state, output, stem_root=None):
    import numpy as np
    import soundfile as sf

    output.mkdir(parents=True, exist_ok=True)
    if (output / 'performance-report.json').exists():
        raise ValueError('Preserve the existing audition; choose a fresh output folder')
    inputs = state / 'final-plan/inputs'
    analysis = json.loads((inputs / 'analysis.json').read_text())
    intelligence = json.loads((inputs / 'intelligence.json').read_text())
    tracks, _, _ = eligible(DEFAULT_DB, analysis, intelligence, inputs / 'file-map.json')
    selected = [next(t for t in tracks if t['id'] == i) for i in IDS]
    grids, stem_paths, bindings = [], [], []
    for track in selected:
        folder = (stem_root or state / 'revision-07/cue-stems') / file_key(track['id'])
        record = json.loads((folder / 'binding.json').read_text())
        grid = json.loads((state / 'revision-06/drum-grids' / (file_key(track['id']) + '.json')).read_text())
        if (record['analysis']['source_sha256'] != track['sha256']
                or grid['binding']['source_sha256'] != track['sha256']
                or grid['status'] != 'cue timing available'):
            raise ValueError('Stale/unresolved cue evidence')
        suffix = '.wav' if record['analysis'].get('format') == 'WAV_FLOAT' else '.flac'
        paths = {name: folder / (name + suffix) for name in ['drums', 'vocals']}
        for name, path in paths.items():
            if digest(path) != record['stem_sha256'][name]:
                raise ValueError('Cue stem changed')
        grids.append(grid['grid']); stem_paths.append(paths); bindings.append(record)

    a, b = selected; ga, gb = grids; clock = schedule(); beat = clock['beat']
    abar, bbar = 240 / ga['bpm'], 240 / gb['bpm']
    ap, bp = ga['phase_seconds'], gb['phase_seconds']
    ra, rb = clock['bpm'] / ga['bpm'], clock['bpm'] / gb['bpm']
    if max(abs(ra - 1), abs(rb - 1)) > .03:
        raise ValueError('Original bodies exceed restrained tempo range')
    a_start, a_mix = ap + 184 * abar, ap + 200 * abar
    a_stem_offset = bindings[0]['analysis']['start']
    hook_start, hook_end = bp + 16 * bbar - 60 / gb['bpm'], bp + 20 * bbar
    b_start, b_end = bp + 32 * bbar, bp + 64 * bbar
    roll_source = bp + 33 * 60 / gb['bpm']
    roll_events = tightening_roll(clock['bpm'])

    # Freeze every used original/derived hash before native work, and recheck
    # after each launch. Nothing here changes Spotify or canonical votes.
    source_hashes = {Path(t['path']): t['sha256'] for t in selected}
    for paths, record in zip(stem_paths, bindings, strict=True):
        source_hashes.update({p: record['stem_sha256'][name] for name, p in paths.items()})
    def validator():
        current, _ = approved_pool(host_rows(DEFAULT_DB))
        if not set(IDS).issubset({t['id'] for t in current}):
            raise ValueError('Party approval changed')
        for path, expected in source_hashes.items():
            if digest(path) != expected:
                raise ValueError('Source or performance print changed')

    binary = Path('/Applications/REAPER.app/Contents/MacOS/REAPER')
    profile = BASE / '.local/reaper-resource/reaper.ini'
    raw_roll_at = 17 * beat + .2
    raw_definitions = [
        {'name': 'Incoming isolated hook; native pitch-preserved',
         'path': str(stem_paths[1]['vocals']), 'sha256': digest(stem_paths[1]['vocals']),
         'gain_db': 0, 'clips': [clip(hook_start, hook_end, 0, rb)]},
        {'name': 'Four-bar beat roll: 1, 1/2, 1/4, 1/8 beat',
         'path': str(stem_paths[1]['drums']), 'sha256': digest(stem_paths[1]['drums']),
         'gain_db': 0, 'clips': [clip(roll_source, roll_source + e['beats'] * 60 / gb['bpm'],
                                   raw_roll_at + e['time'], rb, .001, .001)
                                for e in roll_events]},
    ]
    raw_plan = save_plan(output / 'raw-native', 'performance-layers', raw_definitions,
                         raw_roll_at + 16 * beat, [], bpm=clock['bpm'], master_db=-12,
                         purpose='Native source-bound hook/roll time processing; no hardware output')
    raw_path, raw_readback = render_native(raw_plan, output / 'raw-native', binary, profile, validator)
    raw, sr = sf.read(raw_path, dtype='float32', always_2d=True)
    if np.max(np.abs(raw)) > .999:
        raise ValueError('Native intermediate clipped before effect printing')
    raw = raw * 10 ** (12 / 20)
    hook = raw[:round(17 * beat * sr)]
    roll = raw[round(raw_roll_at * sr):round((raw_roll_at + 16 * beat) * sr)]
    if abs(len(roll) - round(16 * beat * sr)) > 1:
        raise ValueError('Native roll length changed')
    roll_timing = check_repeat_clock(roll, sr, clock['bpm'])
    if roll_timing['status'] != 'checked':
        raise ValueError('Native percussion repetitions lost timing')
    # Float intermediate prints retain overshoots until the final master gain;
    # PCM24 printing here would hard-clip an otherwise valid filtered roll.
    hook_path = output / 'hook-native.wav'; sf.write(hook_path, hook, sr, subtype='FLOAT')
    roll_path = output / 'roll-swept.wav'
    swept = spectral_sweep(roll, sr, 400, 2200, 8000)
    sf.write(roll_path, swept, sr, subtype='FLOAT')
    # Wet-only tails start a beat after the last dry beat's start. No extra
    # musical lead survives into the drop; only a quiet percussion echo does.
    hook_echo = echo_tail(spectral_sweep(hook[-round(beat * sr):], sr, 250, 250, 4000),
                          sr, clock['bpm'], taps=3, decay=.45)
    hook_echo_path = output / 'hook-echo.wav'; sf.write(hook_echo_path, hook_echo, sr, subtype='FLOAT')
    roll_echo = echo_tail(spectral_sweep(swept[-round(beat * sr):], sr, 1000, 1000, 6000),
                          sr, clock['bpm'], taps=3, decay=.4)
    roll_echo_path = output / 'roll-echo.wav'; sf.write(roll_echo_path, roll_echo, sr, subtype='FLOAT')
    for path in [hook_path, roll_path, hook_echo_path, roll_echo_path]:
        source_hashes[path] = digest(path)
    gains = [gain_for(retained_loudness(t, ranges, output / 'loudness-cache'))
             for t, ranges in zip(selected, [[[a_start, a_mix]], [[b_start, b_end]]], strict=True)]
    hook_meter, roll_meter = measure(hook_path), measure(roll_path)
    hook_gain, roll_gain = effect_gain(hook_meter, -16), effect_gain(roll_meter, -18)
    low_cut = eq([(0, -24)], [(0, -6)], [(0, -6)])
    def definition(name, path, gain, clips, volume=None, bands=None):
        result = {'name': name, 'path': str(path), 'sha256': digest(path), 'gain_db': gain, 'clips': clips}
        if volume: result['volume'] = points(volume, 'amplitude')
        if bands: result['eq_bands'] = bands
        return result
    definitions = [
        definition(a['artist'] + ' · original solo', Path(a['path']), gains[0],
                   [clip(a_start, a_mix, 0, ra)]),
        definition(a['artist'] + ' · drums under hook and roll', stem_paths[0]['drums'], gains[0],
                   [clip(a_mix - a_stem_offset, a_mix - a_stem_offset + 31 * 60 / ga['bpm'], clock['feature'], ra)],
                   bands=eq([(0, 0)], [(0, -3)], [(0, -3)])),
        definition('Incoming hook tease, one clear musical lead', hook_path, hook_gain,
                   [clip(0, len(hook) / sr, clock['hook'])]),
        definition('One-beat filtered hook echo', hook_echo_path, hook_gain - 6,
                   [clip(0, len(hook_echo) / sr, clock['hook_end'] - beat)]),
        definition('Tightening percussion roll and high-pass sweep', roll_path, roll_gain,
                   [clip(0, len(swept) / sr, clock['roll'])],
                   [(0, .55), (clock['roll'], .55), (clock['drop'] - beat, 1), (clock['drop'], 1)]),
        definition('Quiet percussion echo beyond drop', roll_echo_path, roll_gain - 6,
                   [clip(0, len(roll_echo) / sr, clock['drop'] - beat)]),
        definition(b['artist'] + ' · original stereo drop and body', Path(b['path']), gains[1],
                   [clip(b_start, b_end, clock['drop'], rb)],
                   [(0, 1), (clock['end'] - .2, 1), (clock['end'], 0)]),
        definition(a['artist'] + ' · low-cut drum tail', stem_paths[0]['drums'], gains[0],
                   [clip(a_mix - a_stem_offset + 32 * 60 / ga['bpm'],
                         a_mix - a_stem_offset + 48 * 60 / ga['bpm'], clock['drop'], ra)],
                   [(0, .5), (clock['drop'], .5), (clock['tail_end'], 0)], low_cut),
    ]
    markers = [{'time': clock[key], 'name': name} for key, name in [
        ('feature', 'Outgoing lead clears; percussion bed'), ('hook', 'Incoming hook tease'),
        ('roll', 'Four-bar tightening roll + filter'), ('drum_cut', 'One-beat low-end pause'),
        ('drop', 'Incoming original drop'), ('tail_end', 'Incoming solo')]]
    plan = save_plan(output / 'native', 'featured-transition', definitions, clock['end'], markers,
                     bpm=clock['bpm'], master_db=-6,
                     purpose='Featured performance audition; accepted pair, new unreviewed edit')
    wave, readback = render_native(plan, output / 'native', binary, profile, validator)
    meters = measure(wave); silence = silence_check(wave, plan)
    if silence['unexplained_silences']:
        raise ValueError('Unexpected silent gap in featured audition')
    gain = min(-16 - meters['integrated_lufs'], -2.1 - meters['true_peak_dbfs'])
    mp3 = output / 'Hollow-featured-transition.mp3'
    encoded = preview_file(wave, mp3, 0, clock['end'], gain)
    report = {
        'schema': 'featured-transition-1', 'host_review': 'unreviewed', 'party_ready': False,
        'track_ids': IDS, 'titles': [t['artist'] + ' — ' + t['title'] for t in selected],
        'clock': clock, 'events': markers, 'duration_seconds': clock['end'],
        'native_readback': readback, 'raw_native_readback': raw_readback,
        'native_print_headroom_db': 12, 'fx_intermediate_format': '32-bit float WAV',
        'delivery_meters': encoded, 'delivery_gain_db': gain, 'silence': silence,
        'source_grids': grids, 'source_rates': [ra, rb], 'stem_bindings': bindings,
        'source_ranges': {'a_body': [a_start, a_mix], 'b_hook': [hook_start, hook_end],
                          'b_body': [b_start, b_end], 'b_percussion_roll_beat': roll_source},
        'roll': {'events': roll_events, 'high_pass_hz': [400, 2200], 'low_pass_hz': 8000,
                 'native_frames': len(roll), 'filtered_frames': len(swept), 'repeat_timing': roll_timing},
        'echo': {'spacing_beats': 1, 'taps': 3, 'hook_decay': .45, 'roll_decay': .4,
                 'wet_only': True},
        'layer_meters': {'hook': hook_meter, 'roll': roll_meter},
        'layer_gains_db': {'bodies': gains, 'hook': hook_gain, 'roll': roll_gain},
        'source_hashes': {str(p): h for p, h in source_hashes.items()},
        'native_plan': str(output / 'native/featured-transition-plan.json'), 'mp3': str(mp3),
        'limitations': ['New performance edit is not host approved', 'Stem separation may have bleed/artifacts',
                        'Physical output not tested', 'No musical quality claim from measurements'],
    }
    write_json(output / 'performance-report.json', report)
    print(json.dumps({k: report[k] for k in ['mp3', 'duration_seconds', 'events', 'delivery_meters']}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--state', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--stems', type=Path, help='Separate floating-point cue stem cache')
    args = parser.parse_args()
    run(args.state.resolve(), args.output.resolve(), args.stems.resolve() if args.stems else None)
