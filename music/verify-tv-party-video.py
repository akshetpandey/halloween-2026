#!/usr/bin/env python3
"""Verify continuity and repeated encoded payloads in the completed party MP4."""
import csv
import hashlib
import json
import subprocess
from pathlib import Path

WORK = Path('/Users/akshet/Transmission/.halloween-downloads/party-reel')
HERE = Path(__file__).resolve().parent

def main():
    state = json.loads((WORK / 'build-state.json').read_text())
    edit = json.loads((HERE / 'tv-party-edit.json').read_text())
    output = Path(state['output']['path'])
    cycle_frames = sum(s['frames'] for s in state['segments'].values())
    report = {'path': str(output), 'checks': {}}
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams',
        '-show_chapters', '-show_format', '-of', 'json', str(output)]))
    with output.open('rb') as handle:
        assert hashlib.file_digest(handle, 'sha256').hexdigest() == state['output']['sha256']
    report['checks']['file_sha256'] = 'passed'
    expected_start = 0.0
    for chapter in probe['chapters']:
        assert abs(float(chapter['start_time']) - expected_start) < .001
        expected_start = float(chapter['end_time'])
    assert len(probe['chapters']) == len(edit['files']) * edit['cycles']
    assert abs(expected_start - state['total_seconds']) < .001
    report['checks']['contiguous_chapters'] = len(probe['chapters'])
    command = ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_packets',
        '-show_entries', 'packet=dts_time,duration_time,data_hash', '-show_data_hash',
        'sha256', '-of', 'csv=p=0', str(output)]
    count = 0
    previous = None
    hashes = []
    current = hashlib.sha256()
    max_gap = 0.0
    with (WORK / 'packet-check.log').open('w') as log:
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=log, text=True)
        for row in csv.reader(process.stdout):
            if not row:
                continue
            dts, duration, payload_hash = row[:3]
            dts, duration = float(dts), float(duration)
            assert abs(duration - 1 / edit['fps']) < .00001, row
            if previous is not None:
                gap = abs(dts - previous - 1 / edit['fps'])
                max_gap = max(max_gap, gap)
                assert gap < .00001, (count, previous, dts)
            previous = dts
            current.update(payload_hash.encode())
            count += 1
            if count % cycle_frames == 0:
                hashes.append(current.hexdigest())
                current = hashlib.sha256()
                print(f'Packet continuity verified through cycle {len(hashes)}', flush=True)
        assert process.wait() == 0
    assert count == cycle_frames * edit['cycles'], count
    assert len(set(hashes)) == 1, 'Repeated cycles have different encoded payloads'
    report['checks']['video_packets'] = count
    report['checks']['max_dts_step_error_seconds'] = max_gap
    report['checks']['identical_cycle_payload_sha256'] = hashes
    report['checks']['encoded_sections_full_decode'] = all(
        s['full_video_decode'] == 'passed' for s in state['segments'].values())
    assert report['checks']['encoded_sections_full_decode']
    # Check silence in distant portions, including after a full programme cycle.
    for sample, timestamp in enumerate([0, state['single_cycle_seconds'] + 1, state['total_seconds'] - 11]):
        result = subprocess.run(['ffmpeg', '-hide_banner', '-ss', str(timestamp), '-i',
            str(output), '-t', '10', '-vn', '-af', 'volumedetect', '-f', 'null', '-'],
            capture_output=True, text=True, check=True)
        log = WORK / f'silence-{sample}.log'
        log.write_text(result.stderr)
        assert 'max_volume: -91.0 dB' in result.stderr or 'max_volume: -inf dB' in result.stderr
    report['checks']['silent_audio_samples'] = 'passed: beginning, second cycle, final seconds'
    report['actual_android_tv_test'] = 'not performed'
    (WORK / 'verification.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2), flush=True)

if __name__ == '__main__':
    main()
