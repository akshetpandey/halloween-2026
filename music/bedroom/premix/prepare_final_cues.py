#!/usr/bin/env python3
"""Recover sparse source entries and reprint final drum cues without clipping.

Preserves the previous cue registry. Recovery requires an already fitted local
drum clock and original full-mix low-frequency evidence; failed clocks stay out.
"""
import argparse
from copy import deepcopy
from importlib.metadata import version
import json
import math
from pathlib import Path
import subprocess
import sys

from analyze_audio import digest, write_json
from prepare import DEFAULT_DB, approved_pool, file_key, host_rows
from production_cues import phrase_phase, select_cycle

BASE = Path(__file__).resolve().parent
VERSION = 'final-float-cues-1'


def recover_body(profile, grid, low_times, low_db, duration):
    import numpy as np
    from scipy.ndimage import uniform_filter1d
    p = 60 / grid['bpm']; bar = 4 * p; phase = grid['phase_seconds']; bc = grid['bar_class']
    times = np.asarray(profile['times']); drums = np.asarray(profile['drums_db']); lead = np.asarray(profile['lead_db'])
    def power(v): return 10 * np.log10(np.maximum(1e-12, uniform_filter1d(10 ** (v / 10), 4, mode='nearest')))
    drums, lead = power(drums), power(lead)
    low = np.interp(times, low_times, low_db)
    drum_floor = max(-43, float(np.percentile(drums, 85)) - 11)
    low_floor = max(-48, float(np.percentile(low_db, 85)) - 13)
    lead_floor = max(-50, float(np.percentile(lead, 85)) - 16)
    rhythmic = (drums >= drum_floor) & (low >= low_floor)
    phrase = phrase_phase(profile, phase, grid['bpm'], bc)
    anchor = phase + bc * p + phrase['phase_bars'] * bar
    candidates = []
    # Require rhythm plus phrase-level lead activity, allowing sparse acid and
    # short melodic stabs. The earlier sustained-vocal style test was too strict.
    for i in range(len(times) - 8):
        if times[i] > min(74, duration * .48): break
        if max(np.diff(times[i:i+8])) > p * 1.1: continue
        future = (times >= times[i]) & (times < times[i] + 32*p)
        if np.mean(rhythmic[i:i+8]) < .75 or np.mean(lead[future] >= lead_floor) < .22: continue
        # Quantize toward the real rhythmic entry, not an earlier silent phrase.
        a = phase + bc*p + math.ceil((times[i] - phase - bc*p) / bar - .15)*bar
        upcoming = low_db[(low_times >= a) & (low_times < min(duration, a + 64*p))]
        if len(upcoming) < 24: continue
        longest = run = 0
        for active in upcoming >= low_floor:
            run = 0 if active else run + 1; longest = max(longest, run)
        if longest > 8: continue
        candidates.append((a, i))
    if not candidates: raise ValueError('No supported sparse-lead entry without an immediate low-band breakdown')
    start, index = candidates[0]
    last = np.flatnonzero(rhythmic & (times > max(0, duration - 75)))
    if not len(last): raise ValueError('No supported original-mix rhythmic exit')
    final_main = float(times[last[-1]] + p)
    natural_end = anchor + math.floor((duration - anchor - .05) / (8*bar)) * 8*bar
    body_end = min(anchor + math.ceil((final_main-anchor)/(8*bar)-1e-7)*8*bar, natural_end-8*bar)
    if body_end - start < 16*bar: raise ValueError('Recovered body is too short')
    return {'start': float(start), 'body_end': float(body_end), 'end': float(body_end+8*bar),
            'outro_bars': 8, 'phrase': phrase, 'entry_is_source_opening': start < bar,
            'melodic_activity_present': True, 'human_verified': False,
            'method': 'Original full-mix low band plus local drum/phrase-length sparse-lead activity; inferred source sections',
            'evidence': {'first_main_seconds': float(times[index]), 'last_main_seconds': final_main,
                         'drum_activity_floor_dbfs': drum_floor, 'original_low_band_floor_dbfs': low_floor,
                         'lead_activity_floor_dbfs': lead_floor, 'maximum_entry_low_gap_beats': 8}}


def low_profile(track, grid):
    import numpy as np
    from scipy.signal import butter, sosfiltfilt
    sr = 12000
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-nostdin', '-i', track['path'], '-ar', str(sr), '-ac', '1', '-f', 'f32le', '-'])
    x = np.frombuffer(raw, '<f4'); x = sosfiltfilt(butter(3, [30, 180], fs=sr, btype='bandpass', output='sos'), x)
    p = 60/grid['bpm']; times = np.arange(grid['phase_seconds'], len(x)/sr-p, p)
    db = np.array([10*np.log10(max(1e-12, float(np.mean(x[round(a*sr):round((a+p)*sr)]**2)))) for a in times])
    return times, db


def worker(state, output, limit):
    import numpy as np
    import soundfile as sf
    import torch
    from demucs.apply import apply_model
    from demucs.pretrained import get_model
    torch.hub.set_dir(str(BASE/'.local/ml-models/hub')); torch.set_num_threads(3)
    device = 'mps' if torch.backends.mps.is_available() else 'cpu'
    if device == 'mps': torch.mps.set_per_process_memory_fraction(.5)
    model = get_model('htdemucs'); sr = model.samplerate
    weight = next((BASE/'.local/ml-models/hub/checkpoints').glob('955717e8-*.th'))
    allowed, _ = approved_pool(host_rows(DEFAULT_DB)); allowed = {t['id'] for t in allowed}
    tracks = json.loads((state/'final-plan/inputs/analysis.json').read_text())['tracks']
    def separate(track, start, end):
        raw = subprocess.check_output(['ffmpeg','-v','error','-nostdin','-i',track['path'],
                                       '-af',f'atrim=start={start}:end={end}', '-ar',str(sr),'-ac','2','-f','f32le','-'])
        signal = np.frombuffer(raw,'<f4').reshape(-1,2).copy(); wav = torch.from_numpy(signal.T)
        ref = wav.mean(0); mean, std = ref.mean(), ref.std()
        if float(std) < 1e-8: raise ValueError('Silent source cue')
        torch.manual_seed(0)
        with torch.inference_mode():
            values = (apply_model(model,(wav-mean)[None]/std,device=device,shifts=0,split=True,overlap=.25,progress=False)[0]*std+mean).cpu().numpy()
        if device == 'mps': torch.mps.empty_cache()
        return {name:v.T for name,v in zip(model.sources,values)}
    done = 0
    for t in tracks:
        prior = state/'revision-08/cues'/file_key(t['id'])/'cue.json'
        if t['id'] not in allowed or not prior.exists(): continue
        old = json.loads(prior.read_text())
        if not old.get('grid'): continue
        folder = output/'cues'/file_key(t['id']); target = folder/'cue.json'
        binding = {'version': VERSION, 'source_sha256': t['sha256'], 'parent_cue_sha256': digest(prior),
                   'weight_sha256': digest(weight), 'implementation_sha256': digest(Path(__file__)),
                   'packages': {p: version(p) for p in ['torch','torchaudio','demucs','numpy','soundfile']}, 'device': device}
        if target.exists():
            cached = json.loads(target.read_text())
            if cached.get('binding') == binding:
                if cached['status'] != 'prepared' or all(digest(Path(p['path'])) == p['sha256'] for p in cached['parts']): continue
        if digest(Path(t['path'])) != t['sha256']: raise ValueError('Source changed')
        folder.mkdir(parents=True, exist_ok=True)
        print('FINAL CUES', t['id'], t['title'], flush=True)
        try:
            record = deepcopy(old); grid = old['grid']
            if old['status'] != 'prepared':
                lt, ld = low_profile(t, grid)
                record['body'] = recover_body(old['profile'], grid, lt, ld, t['duration_seconds'])
                record['recovered_from'] = old.get('error')
            body = record['body']
            # Recovered entries still need a measured drum cycle. Prepared ones
            # retain their exact source cue and timing evidence.
            if old['status'] == 'prepared': cycle = old['cycle']
            else:
                end = min(75, t['duration_seconds'])
                stems = separate(t, 0, end)
                cycle = select_cycle(stems['drums'], sr, grid, 0, body['start'])
            parts = []
            for role, a, b in [('intro', cycle['start'], cycle['end']), ('outro', body['body_end'], body['end'])]:
                start = max(0, a-5); end = min(t['duration_seconds'], b+5)
                stems = separate(t, start, end)
                source_start = max(0, a-.02); source_end = b+.02
                lo, hi = round((source_start-start)*sr), round((source_end-start)*sr)
                signal = stems['drums'][lo:hi]
                path = folder/(role+'-drums.wav'); sf.write(path, signal, sr, subtype='FLOAT')
                parts.append({'role': role, 'path': str(path.resolve()), 'sha256': digest(path),
                              'source_start': start+lo/sr, 'offset': a-(start+lo/sr), 'start': a, 'end': b,
                              'samplerate': sr, 'format': 'WAV_FLOAT', 'unclipped_peak': float(np.max(np.abs(signal))),
                              'note': 'Unclipped drums only; own original recording and htdemucs model bound'})
            if digest(Path(t['path'])) != t['sha256']: raise ValueError('Source changed during preparation')
            record.update(binding=binding, parts=parts, cycle=cycle, status='prepared', id=t['id'])
            record.pop('error', None)
            write_json(target, record)
            print('FINAL READY', t['id'], round((body['body_end']-body['start'])/60,2), flush=True)
        except Exception as error:
            write_json(target, {'id': t['id'], 'binding': binding, 'status': 'needs cue review', 'error': str(error)})
            print('FINAL REVIEW', t['id'], str(error), flush=True)
        done += 1
        if limit and done >= limit: break

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--state',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    p.add_argument('--limit',type=int,default=10);p.add_argument('--supervise',action='store_true');a=p.parse_args()
    if a.supervise:
        a.output.mkdir(parents=True,exist_ok=True)
        for n in range(30):
            before={str(p):digest(p) for p in (a.output/'cues').glob('*/cue.json')}
            with (a.output/f'batch-{n:02d}.log').open('w') as log:
                subprocess.run([sys.executable,str(Path(__file__).resolve()),'--state',str(a.state),'--output',str(a.output),'--limit',str(a.limit)],stdout=log,stderr=subprocess.STDOUT,check=True)
            after={str(p):digest(p) for p in (a.output/'cues').glob('*/cue.json')}
            print('FINAL CUE BATCH',n,len(after),flush=True)
            if after==before:break
    else: worker(a.state.resolve(),a.output.resolve(),a.limit)


if __name__=='__main__':main()
