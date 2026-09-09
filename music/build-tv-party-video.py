#!/usr/bin/env python3
"""Build the authorized silent party derivative; never modify the 25 originals."""
import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path
from xml.etree import ElementTree as ET

HERE = Path(__file__).resolve().parent
WORK = Path('/Users/akshet/Transmission/.halloween-downloads/party-reel')
DEST = Path('/Users/akshet/Transmission/Halloween Shorts/October Grove - Continuous Party Video')

def digest(path):
    with path.open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()

def probe(path):
    return json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_streams', '-show_format', '-show_chapters',
        '-of', 'json', str(path)]))

def run(args, log):
    with log.open('w') as handle:
        subprocess.run(args, stdout=handle, stderr=handle, check=True)

def save(path, value):
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    tmp.replace(path)

def ffescape(value):
    for char in ('\\', '=', ';', '#', '\n'):
        value = value.replace(char, '\\' + char)
    return value

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--stage', choices=['all', 'encode', 'assemble'], default='all')
    args = parser.parse_args()
    edit_path = HERE / 'tv-party-edit.json'
    edit = json.loads(edit_path.read_text())
    fps = edit['fps']
    WORK.mkdir(parents=True, exist_ok=True)
    segment_dir = WORK / 'segments'
    segment_dir.mkdir(exist_ok=True)
    report_path = WORK / 'build-state.json'
    state = json.loads(report_path.read_text()) if report_path.exists() else {'segments': {}}
    config_hash = digest(edit_path)
    if state.get('edit_sha256', config_hash) != config_hash:
        raise RuntimeError('Edit changed; use a new work directory rather than stale cached segments.')
    state['edit_sha256'] = config_hash
    paths, chapters = [], []
    cursor = 0
    for film in edit['files']:
        source = Path(film['source_path'])
        if digest(source) != film['source_sha256']:
            raise RuntimeError(f'Source changed: {source}')
        chapter_start = cursor
        for number, (start, end) in enumerate(film['keep_ranges_seconds'], 1):
            if not 0 <= start < end <= float(probe(source)['format']['duration']):
                raise RuntimeError(f'Invalid source range: {film["title"]}')
            key = f'{film["order"]:02}-{number}'
            path = segment_dir / f'{key}.mp4'
            frames = round((end - start) * fps)
            duration = frames / fps
            cached = state['segments'].get(key)
            if path.exists() and cached and digest(path) == cached.get('sha256'):
                print(f'Cached {key} {film["title"]}', flush=True)
            elif args.stage == 'assemble':
                raise RuntimeError(f'Missing verified segment: {key}')
            else:
                if shutil.disk_usage(WORK).free < 5 * 1024**3:
                    raise RuntimeError('Less than 5 GiB free; stopping before encoding.')
                print(f'Encoding {key} {film["title"]}: {start:.2f}–{end:.2f}', flush=True)
                partial = path.with_suffix('.partial.mp4')
                filters = ('scale=1920:1080:force_original_aspect_ratio=decrease:'
                           'force_divisible_by=2:flags=lanczos:out_color_matrix=bt709,'
                           'pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,'
                           f'fps={fps}:start_time=0,format=yuv420p')
                run(['ffmpeg', '-hide_banner', '-nostdin', '-y', '-threads', '4',
                     '-ss', str(start), '-i', str(source), '-map', '0:v:0', '-an',
                     '-vf', filters, '-frames:v', str(frames),
                     '-c:v', 'h264_videotoolbox', '-b:v', edit['video_bitrate'],
                     '-maxrate', edit['video_maxrate'], '-bufsize', '12M',
                     '-profile:v', 'high', '-level:v', '4.1', '-g', str(fps * 2),
                     '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
                     '-video_track_timescale', '12800', '-map_metadata', '-1',
                     str(partial)], WORK / f'{key}-encode.log')
                info = probe(partial)
                video = next(s for s in info['streams'] if s['codec_type'] == 'video')
                if (int(video['nb_frames']) != frames or video['codec_name'] != 'h264'
                        or video['width'] != 1920 or video['height'] != 1080):
                    raise RuntimeError(f'Unexpected encoded stream: {key}')
                run(['ffmpeg', '-v', 'error', '-xerror', '-threads', '4', '-i', str(partial),
                     '-map', '0:v:0', '-f', 'null', '-'], WORK / f'{key}-decode.log')
                partial.replace(path)
                state['segments'][key] = {'title': film['title'], 'path': str(path),
                    'frames': frames, 'duration_seconds': duration, 'sha256': digest(path),
                    'bytes': path.stat().st_size, 'full_video_decode': 'passed'}
                save(report_path, state)
                print(f'Verified {key}: {duration:.2f}s', flush=True)
            paths.append(path)
            cursor += frames
        chapters.append({'title': film['title'], 'start_frame': chapter_start, 'end_frame': cursor})
    state['single_cycle_seconds'] = cursor / fps
    state['total_seconds'] = cursor / fps * edit['cycles']
    save(report_path, state)
    if args.stage == 'encode':
        return
    output = DEST / (edit['title'] + '.mp4')
    if output.exists():
        if state.get('output', {}).get('sha256') == digest(output):
            print(f'Already built and verified: {output}', flush=True)
            return
        raise RuntimeError('Refusing to overwrite an unrecognized final video.')
    expected_bytes = sum(p.stat().st_size for p in paths) * edit['cycles']
    if shutil.disk_usage(WORK).free < expected_bytes * 1.15 + 2 * 1024**3:
        raise RuntimeError('Not enough free space to assemble with reserve.')
    playlist = WORK / 'concat.txt'
    playlist.write_text(''.join(f"file '{p.as_posix()}'\n" for _ in range(edit['cycles']) for p in paths))
    metadata = [';FFMETADATA1', f'title={edit["title"]}', 'comment=Muted Halloween party programme; four cycles.']
    for cycle in range(edit['cycles']):
        for chapter in chapters:
            offset = cycle * cursor
            metadata.extend(['[CHAPTER]', f'TIMEBASE=1/{fps}',
                f'START={offset + chapter["start_frame"]}',
                f'END={offset + chapter["end_frame"]}',
                f'title={ffescape(str(cycle + 1) + " · " + chapter["title"])}'])
    chapter_file = WORK / 'chapters.ffmetadata'
    chapter_file.write_text('\n'.join(metadata) + '\n')
    partial = WORK / 'party-video.partial.mp4'
    print(f'Assembling {edit["cycles"]} cycles: {state["total_seconds"]:.2f}s', flush=True)
    run(['ffmpeg', '-hide_banner', '-nostdin', '-y', '-f', 'concat', '-safe', '0',
         '-i', str(playlist), '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
         '-f', 'ffmetadata', '-i', str(chapter_file), '-map', '0:v:0', '-map', '1:a:0',
         '-map_metadata', '2', '-map_chapters', '2', '-c:v', 'copy', '-c:a', 'aac',
         '-b:a', '32k', '-t', str(state['total_seconds']), '-movflags', '+faststart',
         str(partial)], WORK / 'assemble.log')
    info = probe(partial)
    video = next(s for s in info['streams'] if s['codec_type'] == 'video')
    if int(video['nb_frames']) != cursor * edit['cycles'] or len(info['chapters']) != 100:
        raise RuntimeError('Final frame or chapter count mismatch.')
    if abs(float(info['format']['duration']) - state['total_seconds']) > 0.05:
        raise RuntimeError('Final duration mismatch.')
    DEST.mkdir(parents=True, exist_ok=True)
    movie = ET.Element('movie')
    for tag, value in {'title': edit['title'], 'sorttitle': '00 October Grove - Continuous Party Video',
            'year': '2026', 'runtime': str(round(state['total_seconds'] / 60)),
            'plot': 'Silent party programme: all 25 approved animated shorts, edited to remove end-credit gaps, repeated four times. Original complete films remain separately available. Each film has a chapter in each cycle.',
            'genre': 'Animation', 'tag': 'Halloween 2026', 'lockdata': 'true'}.items():
        ET.SubElement(movie, tag).text = value
    ET.indent(movie)
    (DEST / 'movie.nfo').write_bytes(ET.tostring(movie, encoding='utf-8', xml_declaration=True))
    (DEST / 'SOURCES.txt').write_text('\n'.join(f'{f["title"]} — {f["creator"]}\n{f["source_url"]}\n' for f in edit['files']))
    partial.replace(output)
    state['output'] = {'path': str(output), 'sha256': digest(output), 'bytes': output.stat().st_size,
        'duration_seconds': float(info['format']['duration']), 'chapters': len(info['chapters']),
        'frames': int(video['nb_frames']), 'codec': video['codec_name'], 'width': video['width'],
        'height': video['height'], 'fps': video['r_frame_rate'], 'audio': 'silent AAC stereo'}
    save(report_path, state)
    save(WORK / 'final-probe.json', info)
    print(json.dumps(state['output'], ensure_ascii=False), flush=True)

if __name__ == '__main__':
    main()
