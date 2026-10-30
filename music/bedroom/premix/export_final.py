#!/usr/bin/env python3
"""Export allowlisted production evidence without private runtime paths or votes."""
import argparse
from collections import Counter
import json
from pathlib import Path
import re
from urllib.parse import parse_qs,urlparse

from analyze_audio import digest,write_json


def public_source_url(value):
    parsed=urlparse(value)
    if parsed.scheme!='https' or parsed.username or parsed.password:
        raise ValueError('Expected a public HTTPS source URL')
    if parsed.hostname in ['www.youtube.com','youtube.com','music.youtube.com']:
        ident=parse_qs(parsed.query).get('v',[''])[0]
    elif parsed.hostname=='youtu.be':ident=parsed.path.strip('/')
    else:raise ValueError('Unexpected acquisition provider URL')
    if not re.fullmatch('[A-Za-z0-9_-]{11}',ident):raise ValueError('Invalid public video identifier')
    return 'https://www.youtube.com/watch?v='+ident


def export(report_path,verification_path,output):
    report=json.loads(report_path.read_text())
    verification=json.loads(verification_path.read_text())
    if not verification.get('rendered') or verification['mix_plan_sha256']!=digest(report_path):
        raise ValueError('A complete render bound to this plan is required')
    analysis={t['id']:t for t in json.loads(Path(report['inputs']['analysis']).read_text())['tracks']}
    intelligence={t['id']:t for t in json.loads(Path(report['inputs']['intelligence']).read_text())['tracks']}
    mappings=json.loads(Path(report['inputs']['file_map']).read_text())
    mappings={b['id']:b for b in mappings.values()}
    records=[]
    for index,t in enumerate(report['tracks']):
        binding=mappings[t['id']];a=analysis[t['id']];e=intelligence[t['id']]
        records.append({
            'index':index+1,'artist':t['artist'],'title':t['title'],
            'spotify_uri':binding['spotify_uri'],'isrc':binding.get('isrc'),
            'source_url':public_source_url(binding['source_url']),'channel':binding.get('channel'),
            'source_title':binding.get('source_title'),'license':binding.get('license'),
            'original_source_sha256':binding['sha256'],'render_source_sha256':t['source_sha256'],
            'metadata_version_verified':binding['version_verified'],'acoustic_identity_verified':False,
            'source_duration_seconds':a['duration_seconds'],'source_bpm':t['source_bpm'],
            'global_key':e.get('tonal',{}).get('global'),
            'lane':t['lane'],'programme_chapter':t['programme_chapter'],
            'start_seconds':t['start_seconds'],'end_seconds':t['end_seconds'],
            'retained_source_ranges':t['ranges'],'removed_repeats':t['removed_repeats'],
            'rate_range':t['rate_range'],'gain_db':t['gain_db'],
            'incoming_transition':report['transitions'][index-1] if index else None,
            'loop_bridge':t['loop_bridge'],'phrase_alignment':t['phrase_alignment'],
            'timing':{k:t['grid'].get(k) for k in ['beat_support','bar_support','splice_supported','interior_splices_supported','human_verified']},
            'full_file_vocal_evidence':t['vocal_evidence_available'],
        })
    output.mkdir(parents=True,exist_ok=True)
    public={k:verification[k] for k in ['rendered','mix_plan_sha256','minimum_nine_hours_excluding_bridges',
            'constant_delivery_gain_db','meters','mp3_meters','silence','master_sha256','mp3_sha256',
            'preview_start_seconds','preview_duration_seconds','chapters','chapter_backup_format',
            'seams','subjective_listening_verified','hardware_playback_tested',
            'party_sha256','party_meters','party_programme_seconds','reserve_seconds','reserve_sha256','playback_schedule']}
    public.update(planner_version=report['version'],generated_at=report['generated_at'],
        selected_tracks=len(records),analyzed_sources=len(analysis),
        planned_seconds=report['planned_seconds'],seconds_excluding_bridges=report['planned_seconds_excluding_bridges'],
        loop_bridge_seconds=report['loop_bridge_seconds'],
        transition_kinds=dict(Counter(t['kind'] for t in report['transitions'])),
        interior_repeat_cuts=sum(len(t['removed_repeats']) for t in records),
        blocked=report['blocked'],chapters_index=report['chapters'],
        playback={'settings_status':'recommended player settings; actual rekordbox settings not changed',
                  'shuffle':False,'repeat':False,'live_auto_dj':False,'automatic_gain':False,
                  'native_automation':'Read; repeat off and global override clear verified by native readback',
                  'hardware_routing':'separate task'})
    write_json(output/'verification.json',public)
    write_json(output/'track-decisions.json',{'tracks':records,'note':'Public metadata and measured edit evidence only; metadata corroboration is not acoustic identity or source licensing.'})
    return public


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--mix-plan',type=Path,required=True)
    p.add_argument('--verification',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    a=p.parse_args();export(a.mix_plan,a.verification,a.output)
