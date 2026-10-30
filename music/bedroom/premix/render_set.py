#!/usr/bin/env python3
"""Render a current approved REAPER plan in bounded, overlap-checked chapters."""
import argparse
from datetime import datetime,timedelta,UTC
import json
import math
from pathlib import Path
import re
import shutil
import subprocess
from zoneinfo import ZoneInfo

from actual_audition import measure, source_rest
from analyze_audio import digest, write_json
from native_build import build_only
from plan_mix import validate_current
from prepare import DEFAULT_DB
from reaper_proof import build_lock, check_saved_project, save_plan
from compact_audio import pcm_identity

BASE = Path(__file__).resolve().parent
RATE = 48000


def chapter_bounds(duration, maximum=3600):
    if not math.isfinite(duration) or duration <= 0 or not 60 <= maximum <= 5400:
        raise ValueError('Invalid chapter duration')
    frames = round(duration * RATE)
    size = round(maximum * RATE)
    return [(n / RATE, min(frames, n+size) / RATE) for n in range(0, frames, size)]


def run(args, timeout=None):
    return subprocess.run(args, capture_output=True, text=True, check=True, timeout=timeout)


def render_native(plan, directory, binary, profile, validator):
    validator()
    verification = build_only(plan, directory, binary, profile, validator, timeout=150)
    check_saved_project(plan)
    validator()
    render_profile = profile.parent / ('render-'+plan['run_id']+'.ini')
    shutil.copyfile(profile, render_profile)
    with (directory / 'render.log').open('w') as log:
        subprocess.run([str(binary), '-newinst', '-nosplash', '-noactivate',
                        '-cfgfile', str(render_profile), '-renderproject', plan['project']],
                       stdout=log, stderr=subprocess.STDOUT, check=True, timeout=7200)
    validator()
    output = Path(plan['render_directory']) / (plan['render_name']+'.wav')
    if not output.exists():
        raise ValueError('REAPER returned without an audio render')
    return output, verification


def read_section(path, start, seconds):
    import soundfile as sf
    with sf.SoundFile(path) as source:
        source.seek(round(start * RATE))
        return source.read(round(seconds * RATE), dtype='float32', always_2d=True)


def verify_seam(previous, incoming, seam):
    import numpy as np
    # Native renders contain two-second handles. Compare the same absolute
    # half-second on both sides of the chapter split before trimming handles.
    start, seconds = seam-.25, .5
    a = read_section(Path(previous['native']), start-previous['render_start'], seconds)
    b = read_section(Path(incoming['native']), start-incoming['render_start'], seconds)
    if a.shape != b.shape or not len(a):
        raise ValueError('Chapter handle length mismatch')
    error = a-b
    maximum = float(np.max(np.abs(error)))
    rms = float(np.sqrt(np.mean(error**2)))
    if maximum > .01 or rms > .001:
        raise ValueError(f'Chapter render discontinuity: peak error {maximum}, RMS {rms}')
    return {'at_seconds': seam, 'comparison_seconds': seconds, 'maximum_pcm_error': maximum, 'rms_pcm_error': rms}


def silence_check(path, native, absolute_start=0):
    result = run(['ffmpeg','-hide_banner','-nostdin','-i',str(path),'-af',
                  'silencedetect=noise=-50dB:d=0.25','-f','null','-'])
    starts = [float(x) for x in re.findall(r'silence_start: ([0-9.]+)',result.stderr)]
    ends = [float(x) for x in re.findall(r'silence_end: ([0-9.]+)',result.stderr)]
    duration = measure_duration(path)
    if len(starts) > len(ends):
        ends.append(duration)
    accepted, unexpected = [], []
    for a,b in zip(starts,ends,strict=True):
        if a < .25 or b > duration-.25:
            if b-a <= 2:
                continue
        rest = source_rest(native, [a+absolute_start,b+absolute_start],maximum_seconds=2.0)
        if rest:
            accepted.append(rest)
        else:
            unexpected.append([a+absolute_start,b+absolute_start])
    return {'source_confirmed_rests':accepted,'unexplained_silences':unexpected,'maximum_source_confirmed_pause_seconds':2.0}


def measure_duration(path):
    data = json.loads(run(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(path)]).stdout)
    return float(data['format']['duration'])


def stage_chapter(native,report,directory,start,end):
    """Decode only active chapter sources once for fast native stretch seeking."""
    analysis={t['id']:t for t in json.loads(Path(report['inputs']['analysis']).read_text())['tracks']}
    staged=[];bindings=[]
    for index,(definition,detail) in enumerate(zip(native['tracks'],report['tracks'],strict=True)):
        if not any(c['position']<end and c['position']+c['length']>start for c in definition['clips']):continue
        source=Path(definition['path'])
        if digest(source)!=definition['sha256']:raise ValueError('Source changed before chapter staging')
        target=directory/'sources'/f'source-{index+1:03d}.wav';target.parent.mkdir(parents=True,exist_ok=True)
        run(['ffmpeg','-v','error','-nostdin','-y','-i',str(source),'-ar',str(RATE),'-ac','2','-c:a','pcm_f32le',str(target)])
        measured=analysis[detail['id']]
        expected=measured.get('analysis_pcm_sha256')
        frames=measured.get('analysis_pcm_frames')
        if expected:
            if pcm_identity(target,frames)!=(expected,frames):raise ValueError('Staged PCM does not match analyzed recording')
        elif pcm_identity(target)!=pcm_identity(source):raise ValueError('Staged source identity failed')
        staged.append({**definition,'path':str(target),'sha256':digest(target)})
        bindings.append({'source_sha256':definition['sha256'],'staged_sha256':staged[-1]['sha256'],'path':str(target),'analysis_pcm_sha256':expected})
    write_json(directory/'staged-source-bindings.json',bindings)
    return staged


def render(report_path, database, output, binary, profile, preview=False):
    report = json.loads(report_path.read_text())
    validator = lambda: validate_current(report,database)
    validator()
    if not preview and report['planned_seconds_excluding_bridges'] < 32400:
        raise ValueError('Final programme must provide nine hours excluding loop padding')
    native = json.loads(Path(report['native_plan']).read_text())
    output.mkdir(parents=True,exist_ok=True)
    receipt_path = output/'render-receipt.json'
    old = json.loads(receipt_path.read_text()) if receipt_path.exists() else {}
    if old and old['mix_plan_sha256'] != digest(report_path):
        raise ValueError('Output belongs to a different plan; choose a new output directory')
    receipt = old or {'mix_plan_sha256':digest(report_path),'native_manifest_sha256':report['native_manifest_sha256'],
                     'chapters':[],'seams':[],'rendered':False,'preview':preview,'hardware_playback_tested':False}
    completed=output/'delivery-verification.json'
    if receipt.get('rendered') and completed.exists():
        delivered=json.loads(completed.read_text())
        if delivered.get('mix_plan_sha256')==digest(report_path) and digest(Path(delivered['master']))==delivered['master_sha256']:
            return receipt
    bounds = chapter_bounds(report['planned_seconds'])
    with build_lock(output):
        # The editable master retains compact permanent sources. Chapter render
        # projects use disposable, hash-proved PCM copies for efficient seeking.
        current_project=False
        if Path(native['project']).exists():
            try:check_saved_project(native);current_project=True
            except RuntimeError:pass
        if not current_project:
            build_only(native,Path(native['project']).parent,binary,profile,validator,timeout=180)
        for index,(start,end) in enumerate(bounds):
            if index < len(receipt['chapters']):
                chapter = receipt['chapters'][index]
                if digest(Path(chapter['native'])) != chapter['sha256']:
                    raise ValueError('Previously rendered chapter changed')
                continue
            directory = output/f'native-{index+1:02d}'
            render_start = max(0,start-2)
            render_end = min(report['planned_seconds'],end+2)
            active=stage_chapter(native,report,directory,render_start,render_end)
            plan = save_plan(directory, f'hollow-{index+1:02d}', active,native['end_seconds'],native['markers'],
                             purpose='Approved Hollow programme chapter',bpm=native['bpm'],master_db=native['master_db'],
                             tempo_map=native.get('tempo_map'),render_bounds=(render_start,render_end))
            wav,verified = render_native(plan,directory,binary,profile,validator)
            meters = measure(wav)
            if (abs(meters['duration_seconds']-(render_end-render_start)) > 2/RATE or meters['sample_rate']!=RATE
                    or meters['channels']!=2 or meters['codec']!='pcm_s24le'
                    or not math.isfinite(meters['integrated_lufs']) or meters['true_peak_dbfs'] > -1):
                raise ValueError('Native chapter format/duration/headroom failed: '+str(meters))
            silence=silence_check(wav,native,absolute_start=render_start)
            if silence['unexplained_silences']:
                raise ValueError('Chapter has unexplained silences: '+str(silence['unexplained_silences']))
            chapter = {'index':index+1,'start':start,'end':end,'render_start':render_start,'render_end':render_end,
                       'native':str(wav),'sha256':digest(wav),'meters':meters,'silence':silence,'native_verification':verified}
            if receipt['chapters']:
                receipt['seams'].append(verify_seam(receipt['chapters'][-1],chapter,start))
            archive=wav.with_suffix('.flac')
            run(['ffmpeg','-v','error','-nostdin','-y','-i',str(wav),'-c:a','flac','-sample_fmt','s32',str(archive)])
            if pcm_identity(wav)!=pcm_identity(archive):raise ValueError('Native archive is not PCM-identical')
            chapter.update(native=str(archive),sha256=digest(archive),original_wav_sha256=digest(wav),lossless_archive_verified=True)
            wav.unlink()
            for source in active:Path(source['path']).unlink()
            receipt['chapters'].append(chapter)
            write_json(receipt_path,receipt)
            print('RENDERED chapter',index+1,'of',len(bounds),'seconds',round(end-start,2),flush=True)
        validator()
        receipt['rendered'] = True
        receipt['native_duration_seconds'] = sum(c['end']-c['start'] for c in receipt['chapters'])
        write_json(receipt_path,receipt)
    return receipt


def deliver(report_path, output, database=DEFAULT_DB):
    report=json.loads(report_path.read_text())
    validate_current(report,database)
    verification_path=output/'delivery-verification.json'
    if verification_path.exists():
        saved=json.loads(verification_path.read_text())
        if saved.get('mix_plan_sha256')==digest(report_path) and digest(Path(saved['master']))==saved['master_sha256'] and digest(Path(saved['mp3']))==saved['mp3_sha256']:
            return saved
    receipt=json.loads((output/'render-receipt.json').read_text())
    if not receipt['rendered'] or receipt['mix_plan_sha256']!=digest(report_path):
        raise ValueError('No complete current native render')
    chapters=receipt['chapters']
    if any(not Path(c['native']).exists() for c in chapters):
        raise ValueError('Native scratch was released by an earlier assembly; rerender into a new output directory')
    weighted=sum(10**(c['meters']['integrated_lufs']/10)*(c['end']-c['start']) for c in chapters)/receipt['native_duration_seconds']
    approximate_lufs=10*math.log10(weighted)
    gain=min(-16-approximate_lufs,-2-max(c['meters']['true_peak_dbfs'] for c in chapters))
    delivery=output/'delivery';delivery.mkdir(exist_ok=True)
    # Stream measured native chapters into one encoder, releasing each verified
    # scratch archive after use. Originals and REAPER projects remain intact.
    master=delivery/'The-Hollow-continuous.flac'
    encoder=subprocess.Popen(['ffmpeg','-v','error','-nostdin','-y','-f','s24le','-ar',str(RATE),'-ac','2','-i','pipe:0',
                              '-af',f'volume={gain}dB','-c:a','flac','-sample_fmt','s32','-compression_level','5',
                              '-metadata','title=The Hollow — continuous prepared programme',str(master)],stdin=subprocess.PIPE)
    total_frames=0
    try:
        for c in chapters:
            if digest(Path(c['native']))!=c['sha256']:raise ValueError('Native chapter changed')
            decoder=subprocess.Popen(['ffmpeg','-v','error','-nostdin','-i',c['native'],'-af',
                                      f'atrim=start_sample={round((c["start"]-c["render_start"])*RATE)}:end_sample={round((c["end"]-c["render_start"])*RATE)}',
                                      '-f','s24le','-c:a','pcm_s24le','-'],stdout=subprocess.PIPE)
            frames=0
            while data:=decoder.stdout.read(1024*1024):encoder.stdin.write(data);frames+=len(data)
            if decoder.wait()!=0 or frames!=round((c['end']-c['start'])*RATE)*6:
                raise ValueError('Native chapter decode length changed')
            total_frames+=frames//6
            Path(c['native']).unlink()
            c['native_scratch_released_after_streaming']=True
            write_json(output/'render-receipt.json',receipt)
        encoder.stdin.close()
        if encoder.wait()!=0:raise ValueError('Continuous master encoder failed')
    except BaseException:
        if encoder.poll() is None:encoder.terminate();encoder.wait()
        raise
    if total_frames!=round(report['planned_seconds']*RATE):raise ValueError('Master frame count mismatch')
    files=[]
    for c in chapters:
        target=delivery/f'The-Hollow-{c["index"]:02d}.mp3'
        run(['ffmpeg','-v','error','-nostdin','-y','-ss',str(c['start']),'-i',str(master),'-t',str(c['end']-c['start']),
             '-c:a','libmp3lame','-b:a','320k',str(target)])
        if abs(measure_duration(target)-(c['end']-c['start']))>.06:raise ValueError('Delivery chapter length mismatch')
        files.append(target)
    meters=measure(master)
    if abs(meters['duration_seconds']-report['planned_seconds'])>2/RATE or meters['true_peak_dbfs']>-1.8:
        raise ValueError('Continuous delivery duration/headroom failed')
    native=json.loads(Path(report['native_plan']).read_text())
    silence=silence_check(master,native)
    if silence['unexplained_silences']:raise ValueError('Unexplained silences: '+str(silence['unexplained_silences']))
    mp3=delivery/'The-Hollow-continuous.mp3'
    run(['ffmpeg','-v','error','-nostdin','-y','-i',str(master),'-c:a','libmp3lame','-b:a','320k','-metadata','title=The Hollow — continuous prepared programme',str(mp3)])
    mp3_meters=measure(mp3)
    if mp3_meters['true_peak_dbfs']>-1:raise ValueError('MP3 encoding exceeded headroom')
    # Reserve must not run automatically after the programmed closing. Keep the
    # full nine-hour archive, but make the default playlist stop before reserve.
    reserve=next((c['start_seconds'] for c in report['chapters'] if c['name'].startswith(('10 ','11 '))),None)
    party_end=reserve if reserve is not None else report['planned_seconds']
    party=delivery/'The-Hollow-party.mp3'
    run(['ffmpeg','-v','error','-nostdin','-y','-i',str(master),'-t',str(party_end),
         '-af',f'afade=t=out:st={max(0,party_end-8)}:d=8','-c:a','libmp3lame','-b:a','320k',
         '-metadata','title=The Hollow — party programme, stops after closing',str(party)])
    party_meters=measure(party)
    if party_meters['true_peak_dbfs']>-1 or abs(party_meters['duration_seconds']-party_end)>.06:
        raise ValueError('Party programme duration/headroom failed')
    reserve_file=None
    if reserve is not None:
        reserve_file=delivery/'The-Hollow-reserve.mp3'
        run(['ffmpeg','-v','error','-nostdin','-y','-ss',str(reserve),'-i',str(master),
             '-af','afade=t=in:d=0.1','-c:a','libmp3lame','-b:a','320k',str(reserve_file)])
    playlist=delivery/'The-Hollow-play.m3u8';playlist.write_text('#EXTM3U\n# Fixed party programme: shuffle off, repeat off, Auto DJ off. Reserve is separate.\n'+party.name+'\n')
    (delivery/'The-Hollow-full.m3u8').write_text('#EXTM3U\n# Full prepared archive includes reserve after the closing.\n'+master.name+'\n')
    (delivery/'The-Hollow-chapters.m3u8').write_text('#EXTM3U\n'+'\n'.join(p.name for p in files)+'\n')
    closing=datetime(2026,11,1,4,tzinfo=ZoneInfo('America/New_York'))
    proposed_start=(closing.astimezone(UTC)-timedelta(seconds=party_end)).astimezone(ZoneInfo('America/New_York'))
    schedule={'status':'proposed manual playback timing; no scheduler installed',
              'timezone':'America/New_York','start':proposed_start.isoformat(),'closing':closing.isoformat()}
    (delivery/'PLAYBACK.md').write_text(
        '# The Hollow playback\n\n'
        'Load `The-Hollow-party.mp3` into one rekordbox deck and play once at original tempo (0% pitch). '
        'Keep beat/key sync, Automix/Auto DJ, shuffle, repeat and additional transition effects off. '
        'All transitions, tempo changes, EQ and ducking are already rendered. The single-item `The-Hollow-play.m3u8` '
        'selects this party file. The file ends with the programmed closing and an eight-second fade; reserve does not start automatically.\n\n'
        f'For a 04:00 EST close, proposed manual start: **{proposed_start.isoformat()}**, America/New_York. '
        f'Closing: **{closing.isoformat()}**. These explicit offsets account for the clock rollback. '
        'No automatic start/stop job or physical audio routing has been configured by this production task.\n\n'
        '`The-Hollow-continuous.flac` is the complete lossless rendered archive including reserve; '
        '`The-Hollow-continuous.mp3` is its 320 kbps backup. `The-Hollow-reserve.mp3` is optional extra programme. '
        'Numbered MP3s are hourly recovery chapters; use the continuous party file for normal playback. '
        'See `tracklist.md` for incoming blend timestamps and `The-Hollow-preview.mp3` for a five-minute excerpt.\n')
    lines=['# The Hollow · prepared tracklist','', 'Times are incoming blend starts. This is not a human-listening or physical-output certification.','', '| Time | Track | BPM | Incoming transition |','|---|---|---:|---|']
    for index,t in enumerate(report['tracks']):
        sec=int(t['start_seconds']);stamp=f'{sec//3600:02d}:{sec%3600//60:02d}:{sec%60:02d}'
        lines.append(f"| {stamp} | {t['artist']} — {t['title']} | {t['source_bpm']:.2f} | {report['transitions'][index-1]['kind'] if index else 'Start'} |")
    (delivery/'tracklist.md').write_text('\n'.join(lines)+'\n')
    preview=delivery/'The-Hollow-preview.mp3'
    representative=next((t for t in report['tracks'] if (t.get('programme_chapter') or '').startswith('03 ')),
                        report['tracks'][min(3,len(report['tracks'])-1)])
    start=max(0,representative['start_seconds']-15)
    seconds=min(300,meters['duration_seconds']-start)
    run(['ffmpeg','-v','error','-nostdin','-y','-ss',str(start),'-i',str(master),'-t',str(seconds),'-af',f'afade=t=in:d=0.02,afade=t=out:st={seconds-.2}:d=.2','-c:a','libmp3lame','-b:a','320k',str(preview)])
    validate_current(report,database)
    result={'rendered':True,'mix_plan_sha256':digest(report_path),'minimum_nine_hours_excluding_bridges':report['planned_seconds_excluding_bridges']>=32400,
            'constant_delivery_gain_db':gain,'meters':meters,'mp3_meters':mp3_meters,'silence':silence,
            'master':str(master),'master_sha256':digest(master),'mp3':str(mp3),'mp3_sha256':digest(mp3),
            'playlist':str(playlist),'preview':str(preview),'preview_start_seconds':start,'preview_duration_seconds':seconds,
            'party':str(party),'party_sha256':digest(party),'party_meters':party_meters,
            'party_programme_seconds':party_end,'reserve_seconds':report['planned_seconds']-party_end,
            'reserve':str(reserve_file) if reserve_file else None,
            'reserve_sha256':digest(reserve_file) if reserve_file else None,'playback_schedule':schedule,
            'chapters':len(files),'chapter_backup_format':'320 kbps MP3; the continuous FLAC is the primary master',
            'seams':receipt['seams'],'subjective_listening_verified':False,'hardware_playback_tested':False}
    write_json(output/'delivery-verification.json',result)
    return result


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--mix-plan',type=Path,required=True)
    p.add_argument('--database',type=Path,default=DEFAULT_DB)
    p.add_argument('--output',type=Path,required=True)
    p.add_argument('--reaper',type=Path,default=Path('/Applications/REAPER.app/Contents/MacOS/REAPER'))
    p.add_argument('--profile',type=Path,default=BASE/'.local/reaper-resource/reaper.ini')
    p.add_argument('--preview',action='store_true')
    p.add_argument('--render',action='store_true')
    p.add_argument('--deliver',action='store_true')
    a=p.parse_args()
    if a.render:render(a.mix_plan,a.database,a.output.resolve(),a.reaper,a.profile,a.preview)
    if a.deliver:print(json.dumps(deliver(a.mix_plan,a.output.resolve(),a.database),indent=2))
