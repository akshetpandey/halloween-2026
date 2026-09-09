#!/usr/bin/env python3
"""Fetch the explicit TV manifest, verify files, and arrange a separate library.

Usage: python3 music/download-tv-shorts.py [--title 'Chado']
Original audio and credits are retained. No transcoding, credentials or DRM tools.
Logs and source info containing temporary URLs stay outside Git and the library.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import re
import shutil
import subprocess
import urllib.request
import xml.etree.ElementTree as ET

HERE = Path(__file__).resolve().parent
MANIFEST = HERE / 'tv-download-manifest.json'
STATE = Path('/Users/akshet/Transmission/.halloween-downloads')


def probe(path):
    result = subprocess.run(['ffprobe', '-v', 'error', '-show_format', '-show_streams',
                             '-of', 'json', str(path)], capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def download(film, root):
    work = STATE / film['folder']
    work.mkdir(parents=True, exist_ok=True)
    dest = root / film['folder']
    result_path = work / 'result.json'
    if result_path.exists():
        previous = json.loads(result_path.read_text())
        if (previous.get('status') == 'downloaded'
                and previous.get('source_url') == film['source_url']
                and Path(previous['path']).is_file()):
            print('Already downloaded: ' + film['title'], flush=True)
            return previous
    result = {**film, 'status': 'failed'}
    url = film['source_url']
    match = re.fullmatch(r'https://vimeo.com/(\d+)', url)
    if match:
        # Same publicly embedded film, supported by yt-dlp without Vimeo web login.
        url = 'https://player.vimeo.com/video/' + match[1]
    result['download_url'] = url
    if url.startswith('https://www.nfb.ca/film/'):
        # The current public embed provides IFRAME_OPTIONS; yt-dlp's NFB
        # extractor still expects the retired player-data layout.
        try:
            embed_url = url.rstrip('/') + '/embed/player/'
            with urllib.request.urlopen(embed_url, timeout=30) as response:
                html = response.read().decode()
            options = json.JSONDecoder().raw_decode(html.split('window.IFRAME_OPTIONS = ', 1)[1])[0]
            url = options['source']
            if not isinstance(url, str) or '.m3u8' not in url:
                raise ValueError('No public HLS source')
        except (OSError, ValueError, KeyError, IndexError) as exc:
            result['error'] = 'NFB public player extraction failed: ' + str(exc)
            result_path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
            return result
    args = ['yt-dlp', '--ignore-config', '--no-playlist', '--no-progress',
            '--socket-timeout', '30', '--retries', '3', '--fragment-retries', '3',
            '--abort-on-unavailable-fragments', '--concurrent-fragments', '4',
            '--format', 'bv*+ba/b', '--merge-output-format', 'mkv',
            '--write-info-json', '--no-overwrites',
            '-o', str(work / 'source.%(ext)s'), url]
    print('Downloading: ' + film['title'], flush=True)
    try:
        if shutil.disk_usage(root).free < 5 * 1024**3:
            raise RuntimeError('Less than 5 GiB free; paused to protect disk space')
        with (work / 'download.log').open('w') as log:
            proc = subprocess.run(args, stdout=log, stderr=subprocess.STDOUT, timeout=1500)
        if proc.returncode:
            raise RuntimeError('yt-dlp failed; inspect local download.log')
        candidates = [p for p in work.glob('source.*') if p.suffix in {'.mp4', '.mkv', '.webm', '.mov'}]
        if len(candidates) != 1:
            raise RuntimeError('Expected one merged video, found ' + str(len(candidates)))
        source = candidates[0]
        data = probe(source)
        duration = float(data['format']['duration'])
        video = next(s for s in data['streams'] if s['codec_type'] == 'video')
        audio = [s for s in data['streams'] if s['codec_type'] == 'audio']
        if not audio or not 0.8 * film['expected_seconds'] <= duration <= 1.2 * film['expected_seconds']:
            raise RuntimeError('Audio or duration mismatch; requires review before import')
        info = json.loads((work / 'source.info.json').read_text())
        dest.mkdir(exist_ok=True)
        target = dest / (film['folder'] + source.suffix)
        if target.exists():
            raise RuntimeError('Destination already exists; refusing to overwrite')
        shutil.move(str(source), target)
        movie = ET.Element('movie')
        for key, value in [('title', film['title']), ('originaltitle', film['title']),
                           ('sorttitle', film['title']), ('director', film['creator']),
                           ('plot', film['title'] + ' — ' + film['creator'] + '. Approved for the October Grove TV programme.'),
                           ('runtime', str(round(duration / 60))), ('genre', 'Animation'),
                           ('tag', 'Halloween 2026'), ('lockdata', 'true')]:
            ET.SubElement(movie, key).text = value
        ET.indent(movie)
        ET.ElementTree(movie).write(dest / 'movie.nfo', encoding='utf-8', xml_declaration=True)
        result.update(status='downloaded', path=str(target), duration_seconds=duration,
                      bytes=target.stat().st_size, width=video['width'], height=video['height'],
                      video_codec=video['codec_name'], audio_codecs=[s['codec_name'] for s in audio],
                      upload_title=film['title'] if film['source_url'].startswith('https://www.nfb.ca/') else info.get('title'),
                      uploader='NFB' if film['source_url'].startswith('https://www.nfb.ca/') else info.get('uploader'),
                      format_id=info.get('format_id'), credits_trimmed=False)
        print('Done: ' + film['title'] + f" ({video['width']}x{video['height']}, {duration:.1f}s)", flush=True)
    except (OSError, RuntimeError, subprocess.SubprocessError, KeyError, StopIteration) as exc:
        result['error'] = str(exc)
        print('Needs attention: ' + film['title'] + ': ' + str(exc), flush=True)
    result_path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--title', action='append', help='Only fetch matching canonical titles')
    args = parser.parse_args()
    manifest = json.loads(MANIFEST.read_text())
    root = Path(manifest['media_root'])
    root.mkdir(exist_ok=True)
    films = manifest['films']
    if args.title:
        films = [f for f in films if f['title'] in args.title]
        if len(films) != len(set(args.title)):
            parser.error('Unknown title; use exact title from manifest')
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda f: download(f, root), films))
    print(f"Completed {sum(r['status'] == 'downloaded' for r in results)}/{len(results)} selected films", flush=True)
    raise SystemExit(0 if all(r['status'] == 'downloaded' for r in results) else 1)


if __name__ == '__main__':
    main()
