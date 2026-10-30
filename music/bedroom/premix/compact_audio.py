"""Small native render sources with measured decoded-PCM identity."""
from contextlib import contextmanager
from functools import lru_cache
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

from analyze_audio import digest
from prepare import probe_duration


def pcm_identity(path, frames=None):
    command=['ffmpeg','-v','error','-nostdin','-i',str(path),'-ar','48000','-ac','2']
    if frames is not None:command += ['-af',f'atrim=end_sample={frames}']
    command += ['-f','f32le','-c:a','pcm_f32le','-']
    fingerprint=hashlib.sha256();size=0
    with subprocess.Popen(command,stdout=subprocess.PIPE,stderr=subprocess.PIPE) as process:
        while data:=process.stdout.read(1024*1024):fingerprint.update(data);size+=len(data)
        if process.wait():raise ValueError('PCM identity decode failed: '+process.stderr.read().decode()[-500:])
    return fingerprint.hexdigest(),size//8


def compact_source(track, evidence):
    """Remux Opus without encoding; use float WavPack for other codecs.

    WebM discard padding can become <=20ms of extra Ogg tail. Every original
    frame must remain bit-identical; the planner excludes the padded tail.
    """
    if track.get('render_storage'):
        return track,evidence,None
    wav=Path(track['path']);original=Path(track['source_path'])
    if wav.suffix!='.wav' or digest(wav)!=track['sha256']:
        raise ValueError('Compact storage requires the bound decoded analysis WAV')
    expected,frames=pcm_identity(wav)
    info=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','a:0','-show_entries','stream=codec_name,channels','-of','json',str(original)]))
    target=wav.with_suffix('.opus')
    storage='Original Opus packets remuxed to Ogg; no audio re-encoding'
    accepted=False;extra=0
    if info['streams'][0]['codec_name']=='opus' and info['streams'][0].get('channels')==2:
        subprocess.run(['ffmpeg','-v','error','-nostdin','-y','-i',str(original),'-map','0:a:0','-c:a','copy',str(target)],check=True)
        full,actual_frames=pcm_identity(target)
        extra=actual_frames-frames
        comparison=full if extra==0 else pcm_identity(target,frames)[0]
        accepted=0<=extra<=960 and comparison==expected
    if not accepted:
        target.unlink(missing_ok=True)
        target=wav.with_suffix('.wv');extra=0
        subprocess.run(['ffmpeg','-v','error','-nostdin','-y','-i',str(wav),'-c:a','wavpack',str(target)],check=True)
        if pcm_identity(target)!=(expected,frames):
            raise ValueError('Lossless float WavPack identity check failed')
        storage='Lossless WavPack float32, decoded PCM bit-identical to analysis input'
    new_hash=digest(target)
    result={**track,'path':str(target.resolve()),'sha256':new_hash,'analysis_pcm_file_sha256':track['sha256'],
            'analysis_pcm_sha256':expected,'analysis_pcm_frames':frames,'extra_container_tail_frames':extra,
            'render_storage':storage}
    evidence={**evidence,'source_sha256':new_hash,'analysis_pcm_file_sha256':track['sha256'],
              'analysis_pcm_sha256':expected,'render_storage':storage}
    return result,evidence,wav


@lru_cache(maxsize=256)
def compact_frames(path,source_hash):
    """Cache decode length by immutable hash; callers still hash each source."""
    import soundfile as sf
    try:
        info=sf.info(path)
        if info.samplerate!=48000 or info.channels!=2:raise ValueError('Compact source format changed')
        return info.frames
    except RuntimeError:
        return pcm_identity(path)[1]


def content_duration(track):
    """Measure audio frames, rather than Ogg packet duration including preskip."""
    if not track.get('render_storage'):
        return probe_duration(Path(track['path']))
    frames=track.get('analysis_pcm_frames');extra=track.get('extra_container_tail_frames')
    if not isinstance(frames,int) or not isinstance(extra,int) or frames<=0 or not 0<=extra<=960:
        raise ValueError('Missing compact-source PCM identity bounds')
    if not track.get('analysis_pcm_sha256') or not track.get('analysis_pcm_file_sha256'):
        raise ValueError('Missing original analysis PCM identity')
    actual=compact_frames(track['path'],track['sha256'])
    if actual!=frames+extra:raise ValueError('Compact decoded source frame count changed')
    return frames/48000


@contextmanager
def open_analysis_audio(path):
    import soundfile as sf
    compressed=Path(path).suffix in {'.opus','.wv'}
    try:
        if compressed:raise RuntimeError('Decode once for efficient random bar access')
        audio=sf.SoundFile(path)
    except RuntimeError:
        # libsndfile supports Ogg/Opus but some builds lack WavPack. Decode just
        # the current file temporarily; retain no large PCM working library.
        with tempfile.TemporaryDirectory(prefix='hollow-pcm-') as directory:
            wav=Path(directory)/'source.wav'
            subprocess.run(['ffmpeg','-v','error','-nostdin','-i',str(path),'-ar','48000','-ac','2','-c:a','pcm_f32le',str(wav)],check=True)
            with sf.SoundFile(wav) as audio:yield audio
        return
    with audio:yield audio
