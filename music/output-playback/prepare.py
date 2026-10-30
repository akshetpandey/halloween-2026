#!/usr/bin/env python3
"""Prepare a disconnected stereo REAPER playback project and prove its DSP offline."""
from __future__ import annotations

import argparse
from array import array
import configparser
from datetime import datetime
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time
import uuid
import wave
from zoneinfo import ZoneInfo

HERE = Path(__file__).resolve().parent
PREMIX = HERE.parent / 'bedroom/premix'
DEFAULT_SOURCE = PREMIX / '.local/final-hollow-2026-10-29/revision-11/final-render/delivery/The-Hollow-party.mp3'
DEFAULT_SEED = PREMIX / '.local/reaper-resource/reaper.ini'
REAPER = Path('/Applications/REAPER.app/Contents/MacOS/REAPER')


def stop_owned(process):
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)


def lua(value):
    if isinstance(value, bool):
        return str(value).lower()
    return json.dumps(value, ensure_ascii=False)


def offline_profile(root, seed):
    config = configparser.ConfigParser(interpolation=None, strict=False)
    config.optionxform = str
    config.read(seed)
    if not config.has_section('REAPER'):
        raise ValueError('Initialized REAPER seed profile is required')
    config['REAPER'].update({'coreaudioindevnew': '<none>', 'coreaudiooutdevnew': '<none>',
        'lastproject': '', 'loadlastproj': '0', 'newprojdo': '0', 'multinst': '1',
        'coreaudiosrate': '48000', 'coreaudiosrateuse': '1', 'renderclosewhendone': '4'})
    if config.has_section('Recent'):
        config.remove_section('Recent')
    path = root / 'reaper.ini'
    with path.open('w') as handle:
        config.write(handle, space_around_delimiters=False)
    # Bundle's own JSFX, copied into this isolated resource directory only.
    effect = root / 'Effects/delay/time_adjustment'
    effect.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile('/Applications/REAPER.app/Contents/InstallFiles/Effects/delay/time_adjustment', effect)
    return path


def build(root, profile, source, proof=False):
    run_id = str(uuid.uuid4())
    name = 'proof' if proof else 'party-playback'
    project = root / f'{name}.rpp'
    report, error, cancel = [root / f'{name}-{run_id}.{suffix}' for suffix in ('json', 'error', 'cancel')]
    config = {'run_id': run_id, 'profile': str(profile), 'project': str(project),
        'source': str(source.resolve()), 'proof': proof, 'readback': str(report),
        'error': str(error), 'cancel': str(cancel), 'render_dir': str(root),
        'arm_script': str(HERE / 'arm_outputs.lua')}
    dispatch = root / f'build-{run_id}.lua'
    dispatch.write_text('OUTPUT_CONFIG = {\n' + ''.join(
        f'  [{lua(key)}] = {lua(value)},\n' for key, value in config.items())
        + '}\ndofile(' + lua(str(HERE / 'build_router.lua')) + ')\n')
    with (root / f'{name}.log').open('w') as log:
        process = subprocess.Popen([str(REAPER), '-newinst', '-nosplash', '-cfgfile',
            str(profile), str(dispatch)], stdout=log, stderr=subprocess.STDOUT)
        try:
            deadline = time.monotonic() + 45
            while not report.exists():
                if error.exists():
                    raise RuntimeError(error.read_text())
                if process.poll() is not None:
                    raise RuntimeError(f'REAPER exited before readback ({process.returncode}); see {name}.log')
                if time.monotonic() > deadline:
                    cancel.touch()
                    raise RuntimeError('REAPER timed out; inspect its first-run dialog/log')
                time.sleep(.2)
            result = json.loads(report.read_text())
            assert result['run_id'] == run_id and project.is_file()
            assert result['hardware_outputs'] == 0 and result['source_rate'] == 1
            assert result['repeat_mode'] == 0
            assert [t['master_channel_offset'] for t in result['tracks']] == [0, 2]
            return result
        finally:
            cancel.touch()  # Prevent a delayed dispatch from running after this attempt.
            stop_owned(process)


def synthetic_source(path):
    pcm = array('h', [0] * (6 * 48000 * 2))
    for channel, times in ((0, (.5, 1.7, 3.0)), (1, (1.0, 2.3, 4.0))):
        for when in times:
            pcm[round(when * 48000) * 2 + channel] = 8192
    if sys.byteorder != 'little':
        pcm.byteswap()
    with wave.open(str(path), 'wb') as output:
        output.setnchannels(2); output.setsampwidth(2); output.setframerate(48000)
        output.writeframes(pcm.tobytes())


def verify(root, profile):
    source = root / 'test-pulses.wav'
    synthetic_source(source)
    result = build(root, profile, source, proof=True)
    rendered = root / 'stereo-routing-proof.wav'
    if rendered.exists():
        raise FileExistsError('Use a fresh output directory for a new proof')
    with (root / 'render.log').open('w') as log:
        subprocess.run([str(REAPER), '-newinst', '-nosplash', '-cfgfile', str(profile),
            '-renderproject', result['project']], check=True, timeout=60,
            stdout=log, stderr=subprocess.STDOUT)
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams',
        '-of', 'json', str(rendered)]))['streams'][0]
    assert (probe['sample_rate'], probe['channels']) == ('48000', 4)
    decoded = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(rendered),
        '-f', 'f32le', '-c:a', 'pcm_f32le', '-'])
    data = array('f'); data.frombytes(decoded)
    if sys.byteorder != 'little':
        data.byteswap()
    channels = [data[c::4] for c in range(4)]
    # Multiple equal pulses can round differently: inspect the first pulse window.
    first_peaks = [max(range(12000, 60000), key=lambda n: abs(c[n])) for c in channels]
    delays = [(first_peaks[i] - first_peaks[i+2]) / 48 for i in (0, 1)]
    assert all(abs(d - 120) <= 1/48 for d in delays), delays
    gain_ratios = [max(map(abs, channels[i])) / max(map(abs, channels[i+2])) for i in (0, 1)]
    expected = 10 ** (-3/20)
    assert all(abs(g - expected) < .0001 for g in gain_ratios), gain_ratios
    expected_peak = (8192/32768) * 10 ** (-12/20)
    actual_peak = max(map(abs, channels[2]))
    assert abs(actual_peak - expected_peak) < .00001, (actual_peak, expected_peak)
    assert all(abs(channels[c][n]) < .00001 for c, n in ((1, 24000), (3, 24000), (0, 48000), (2, 48000)))
    result.update({'render_channels': 4, 'measured_delays_ms': delays,
        'measured_audioengine_to_hisense_gain': gain_ratios, 'master_peak': actual_peak,
        'master_expected_peak': expected_peak, 'left_right_isolation_passed': True,
        'hardware_tested': False})
    (root / 'verification.json').write_text(json.dumps(result, indent=2) + '\n')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=DEFAULT_SOURCE)
    parser.add_argument('--seed-profile', type=Path, default=DEFAULT_SEED)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--verify', action='store_true')
    parser.add_argument('--open', action='store_true', help='Open the prepared player; never starts playback')
    args = parser.parse_args()
    latest = HERE / '.local/latest.json'
    if args.open:
        if not latest.is_file():
            parser.error('Prepare the player before opening it')
        saved = json.loads(latest.read_text())
        project, profile = Path(saved['project']), Path(saved['profile'])
        if not project.is_file() or not profile.is_file():
            parser.error('Prepared project/profile is missing')
        subprocess.Popen([str(REAPER), '-newinst', '-cfgfile', str(profile), str(project)],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
        print(f'Opening {project}; playback is not started.')
        return
    if not args.source.is_file() or not args.seed_profile.is_file() or not REAPER.is_file():
        parser.error('Installed REAPER, initialized offline seed and local party audio are required')
    timestamp = datetime.now(ZoneInfo('America/New_York')).strftime('%Y%m%d-%H%M%S%z')
    root = (args.output or HERE / '.local' / timestamp).resolve()
    root.mkdir(parents=True, exist_ok=False)
    profile = offline_profile(root, args.seed_profile)
    proof = verify(root, profile) if args.verify else None
    result = build(root, profile, args.source)
    (root / 'party-readback.json').write_text(json.dumps(result, indent=2) + '\n')
    latest.parent.mkdir(parents=True, exist_ok=True)
    latest.write_text(json.dumps({'project': result['project'], 'profile': str(profile)}, indent=2) + '\n')
    print(json.dumps({'project': result['project'], 'source_seconds': result['source_seconds'],
        'outputs_disconnected': True, 'master_muted': result['master_muted'],
        'proof': None if proof is None else {
            'delays_ms': proof['measured_delays_ms'], 'gain_ratios': proof['measured_audioengine_to_hisense_gain'],
            'left_right_isolation_passed': proof['left_right_isolation_passed']}}, indent=2))


if __name__ == '__main__':
    main()
