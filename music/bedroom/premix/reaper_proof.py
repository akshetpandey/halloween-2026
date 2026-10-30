#!/usr/bin/env python3
"""Generate reproducible REAPER proof plans/scripts from original test audio."""
import argparse
from array import array
from contextlib import contextmanager
import fcntl
import hashlib
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys
import time
import uuid
import wave

from synth_test_audio import create_fixtures


DEFAULT_OUTPUT = Path(__file__).resolve().parent / '.local/reaper-proof'


def checksum(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def lua(value):
    """Serialize data as Lua literals without evaluating external strings."""
    if isinstance(value, str):
        size = 0
        while ']' + '=' * size + ']' in value:
            size += 1
        delimiter = '=' * size
        # A leading newline is stripped by Lua long strings; prefix/remove a sentinel.
        return 'string.sub([' + delimiter + '[x' + value + ']' + delimiter + '],2)'
    if value is True or value is False:
        return str(value).lower()
    if isinstance(value, (int, float)) and math.isfinite(value):
        return repr(value)
    if isinstance(value, list):
        return '{' + ','.join(lua(x) for x in value) + '}'
    if isinstance(value, dict):
        return '{' + ','.join('[' + lua(k) + ']=' + lua(v) for k, v in value.items()) + '}'
    raise ValueError('Unsupported or non-finite plan data')


def exact_repeats(path, bpm, phrase_bars=8):
    """Find sample-identical phrases on a supplied, known 4/4 grid, not learned structure."""
    with wave.open(str(path), 'rb') as audio:
        frames = round(phrase_bars * 4 * 60 / bpm * audio.getframerate())
        seen, repeats, start = {}, [], 0
        while chunk := audio.readframes(frames):
            if len(chunk) != frames * audio.getnchannels() * audio.getsampwidth():
                break
            fingerprint = hashlib.sha256(chunk).hexdigest()
            if fingerprint in seen:
                repeats.append({'first_start': seen[fingerprint],
                                'start': start / audio.getframerate(),
                                'end': (start + frames) / audio.getframerate()})
            else:
                seen[fingerprint] = start / audio.getframerate()
            start += frames
        return repeats


def clip(start, end, position, rate=1, fade_in=.003, fade_out=.003):
    if not (0 <= start < end and position >= 0 and .8 <= rate <= 1.2):
        raise ValueError('Invalid source range, position or test rate')
    length = (end-start)/rate
    if not (0 <= fade_in <= length and 0 <= fade_out <= length):
        raise ValueError('Invalid fade length')
    return {'source_start': start, 'position': position, 'length': length,
            'rate': rate, 'fade_in': fade_in, 'fade_out': fade_out}


def save_plan(root, name, tracks, end_seconds, markers, *,
              purpose='synthetic engineering proof', bpm=128, master_db=-2, tempo_map=None,
              render_bounds=None):
    root = Path(root).resolve()
    (root / 'renders').mkdir(parents=True, exist_ok=True)
    run_id = str(uuid.uuid4())
    plan = {'schema_version': 1, 'purpose': purpose, 'bpm': bpm,
            'run_id': run_id,
            'master_db': master_db, 'tracks': tracks, 'end_seconds': end_seconds, 'markers': markers,
            'project': str(root / (name + '.rpp')), 'render_directory': str(root / 'renders'),
            'render_name': name, 'readback': str(root / (name + '-readback.json')),
            'build_script': str(root / (name + '-build-' + run_id + '.lua')),
            'cancel_file': str(root / ('cancelled-' + run_id)),
            'error_file': str(root / (name + '-' + run_id + '-error.txt'))}
    if tempo_map:
        plan['tempo_map'] = tempo_map
    if render_bounds is not None:
        start, end = map(float, render_bounds)
        if not (math.isfinite(start) and math.isfinite(end) and 0 <= start < end <= end_seconds):
            raise ValueError('Invalid chapter render bounds')
        plan['render_start_seconds'], plan['render_end_seconds'] = start, end
    for track in tracks:
        if checksum(Path(track['path'])) != track['sha256']:
            raise ValueError('Source changed before script generation')
    raw = json.dumps(plan, sort_keys=True).encode()
    plan['manifest_sha256'] = hashlib.sha256(raw).hexdigest()
    (root / (name + '-plan.json')).write_text(json.dumps(plan, indent=2) + '\n')
    builder = Path(__file__).with_name('reaper_timeline.lua').resolve()
    Path(plan['build_script']).write_text(
        'local builder = dofile(' + lua(str(builder)) + ')\nbuilder.run(' + lua(plan) + ')\n')
    return plan


def prepare_proof(root, regenerate=False):
    root = root.expanduser().resolve()
    (root / 'renders').mkdir(parents=True, exist_ok=True)
    fixture_path = root / 'sources/fixtures.json'
    fixtures = (create_fixtures(root / 'sources') if regenerate or not fixture_path.exists()
                else json.loads(fixture_path.read_text()))
    a, b = (fixtures['tracks'][key] for key in ('a', 'b'))
    repeats = exact_repeats(Path(a['path']), a['bpm'])
    if len(repeats) != 1 or repeats[0]['start'] != 15 or repeats[0]['end'] != 30:
        raise ValueError('Synthetic repeat proof precondition failed')
    rate = 128 / b['bpm']
    end = 30 + b['duration_seconds'] / rate
    tracks = [
        {'name': 'A · repeated phrase removed', 'path': a['path'], 'sha256': a['sha256'],
         'clips': [clip(0, 15, 0, fade_in=.025), clip(30, 60, 15, fade_out=15)],
         'shelf': [{'time': 0, 'db': 0}, {'time': 30, 'db': 0},
                   {'time': 37.5, 'db': -24}, {'time': 45, 'db': -24}]},
        {'name': 'B · 132 to 128 BPM, pitch preserved', 'path': b['path'], 'sha256': b['sha256'],
         'clips': [clip(0, b['duration_seconds'], 30, rate, 15, 1)],
         'shelf': [{'time': 0, 'db': -24}, {'time': 30, 'db': -24},
                   {'time': 37.5, 'db': 0}, {'time': end, 'db': 0}]},
    ]
    markers = [{'time': 15, 'name': 'CUT · source A jumps 15 → 30 seconds'},
               {'time': 30, 'name': 'BLEND START · eight bars'},
               {'time': 37.5, 'name': 'BASS HANDOVER'},
               {'time': 45, 'name': 'B SOLO · tempo matched at 128 BPM'}]
    main = save_plan(root, 'reaper-proof', tracks, end, markers)
    # Independent pitch calibration makes B_PPITCH an audible-signal check too.
    tone_path = root / 'sources/pitch-440hz.wav'
    pcm = array('h', (round(8192 * math.sin(2*math.pi*440*i/48000)
                           * min(1, i/2400, (6*48000-1-i)/2400))
                      for i in range(6*48000)))
    if sys.byteorder != 'little':
        pcm.byteswap()
    with wave.open(str(tone_path), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(48000)
        output.writeframes(pcm.tobytes())
    tone = {'name': '440 Hz pitch-preservation calibration', 'path': str(tone_path),
            'sha256': checksum(tone_path), 'clips': [clip(0, 6, 0, rate, .01, .01)]}
    pitch = save_plan(root, 'pitch-check', [tone], 6/rate, [])
    summary = {'duplicate_detection': repeats, 'removed_seconds': 15,
               'transition_seconds': [30, 45], 'nominal_master_seconds': end,
               'plans': [main['project'], pitch['project']]}
    (root / 'proof-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    return summary


def check_saved_project(plan):
    path = Path(plan['project'])
    if not path.is_file() or plan['manifest_sha256'] not in path.read_text():
        raise RuntimeError('Saved REAPER project does not match this build manifest')


def run_reaper(root, binary, profile, names=('reaper-proof', 'pitch-check'), render_timeout=90):
    """Build via native ReaScript, then use REAPER's native offline renderer."""
    root, binary, profile = root.resolve(), binary.resolve(), profile.resolve()
    if not binary.is_file() or not profile.is_file():
        raise ValueError('REAPER and the initialized offline task profile must exist')
    config = profile.read_text()
    for key in ('coreaudioindevnew=<none>', 'coreaudiooutdevnew=<none>'):
        if key not in config:
            raise ValueError('Initialize the task profile with no hardware audio device first')
    log_path = root / 'reaper-command.log'
    for name in names:
        plan = json.loads((root / (name + '-plan.json')).read_text())
        for track in plan['tracks']:
            if checksum(Path(track['path'])) != track['sha256']:
                raise ValueError('Source hash changed; regenerate this proof')
        with log_path.open('a') as log:
            client = subprocess.Popen([str(binary), '-nonewinst', '-noactivate',
                '-cfgfile', str(profile), plan['build_script']],
                stdout=log, stderr=subprocess.STDOUT)
            deadline = time.monotonic() + 40
            try:
                while True:
                    if client.poll() not in (None, 0):
                        raise RuntimeError('REAPER build client failed; inspect command log')
                    readback = Path(plan['readback'])
                    error = Path(plan['error_file'])
                    if error.exists():
                        raise RuntimeError(error.read_text())
                    if readback.exists():
                        try:
                            actual = json.loads(readback.read_text())
                        except json.JSONDecodeError:
                            actual = {}
                        if (actual.get('run_id') == plan['run_id'] and
                                actual.get('manifest_sha256') == plan['manifest_sha256']):
                            break
                    if time.monotonic() > deadline:
                        raise RuntimeError('REAPER did not finish the build; inspect first-run dialogs/log')
                    time.sleep(.2)
            except BaseException:
                # A dispatched IPC script may run after its client exits. Revoke that
                # exact immutable script so a late run cannot overwrite a retry.
                Path(plan['cancel_file']).touch()
                if client.poll() is None:
                    client.terminate()
                    client.wait(timeout=5)
                raise
            if client.poll() is not None:
                client.wait()
            check_saved_project(plan)
            for track in plan['tracks']:
                if checksum(Path(track['path'])) != track['sha256']:
                    raise ValueError('Source changed during REAPER build')
            # Existing render outputs belong to this synthetic proof; preserve them.
            output = Path(plan['render_directory']) / (plan['render_name'] + '.wav')
            if output.exists():
                archive = output.parent / 'previous' / plan['run_id']
                archive.mkdir(parents=True, exist_ok=True)
                output.rename(archive / output.name)
            render_profile = profile.with_name('render-' + name + '.ini')
            shutil.copyfile(profile, render_profile)
            subprocess.run([str(binary), '-newinst', '-nosplash', '-cfgfile', str(render_profile),
                            '-renderproject', plan['project']],
                           stdout=log, stderr=subprocess.STDOUT, check=True, timeout=render_timeout)
            if not output.exists() or output.stat().st_size < 1000:
                raise RuntimeError('REAPER exited without a complete audio file')


@contextmanager
def build_lock(root):
    root.mkdir(parents=True, exist_ok=True)
    with (root / 'automation.lock').open('a') as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise RuntimeError('Another proof build owns this output directory') from error
        try:
            yield
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def export_preview(root):
    master = root.resolve() / 'renders/reaper-proof.wav'
    preview = master.with_name('reaper-proof-45s.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-y', '-ss', '7.5',
        '-i', str(master), '-t', '45', '-af',
        'afade=t=in:d=0.03,afade=t=out:st=44.8:d=0.2',
        '-c:a', 'libmp3lame', '-b:a', '256k',
        '-metadata', 'title=The Hollow — REAPER automation proof',
        '-metadata', 'artist=Original procedural test audio', str(preview)], check=True)
    return preview


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--regenerate', action='store_true')
    parser.add_argument('--render', action='store_true', help='Build and render in initialized REAPER')
    parser.add_argument('--reaper', type=Path, default=Path('/Applications/REAPER.app/Contents/MacOS/REAPER'))
    parser.add_argument('--profile', type=Path,
                        default=DEFAULT_OUTPUT.parent / 'reaper-resource/reaper.ini')
    args = parser.parse_args()
    with build_lock(args.output):
        print(json.dumps(prepare_proof(args.output, args.regenerate), indent=2))
        if args.render:
            run_reaper(args.output, args.reaper, args.profile)
            from verify_reaper_proof import verify
            result = verify(args.output)
            if result['passed']:
                print('Preview:', export_preview(args.output))
            print(json.dumps(result, indent=2))
            raise SystemExit(0 if result['passed'] else 1)
