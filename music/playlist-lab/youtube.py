#!/usr/bin/env python3
"""Find candidate YouTube embeds using yt-dlp metadata search; never download media."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path
import re
import subprocess
import time
import unicodedata
from lab import Store, DEFAULT_STATE, now, save_json


def words(value):
    text=''.join(c for c in unicodedata.normalize('NFKD',value).casefold() if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+',' ',text).strip()


def ranked_candidates(track, entries):
    # Compare named mixes/edits too; duration alone cannot distinguish recordings.
    title=re.split(r'\s*\(?feat\.',track['title'],flags=re.I)[0]
    needed=set(words(title).split())
    artists=track.get('artists') or [track['artist']]
    main=words(artists[0]);duration=track.get('duration_ms',0)/1000
    matches=[]
    for e in entries:
        if not re.fullmatch(r'[A-Za-z0-9_-]{11}',e.get('id','')) or not duration or not e.get('duration'):continue
        delta=abs(e['duration']-duration)
        if delta>5:continue
        name=words(e.get('title',''));channel=words(e.get('channel') or '')
        tokens=set(name.split())
        if not needed<=tokens:continue
        if (tokens & {'live','cover','slowed','sped','nightcore','karaoke','remix','rework','mashup','instrumental','acoustic','acapella','acappella','demo'})-needed:continue
        artist_channel=any(words(a)==channel or words(a)+' topic'==channel for a in artists)
        if not artist_channel and not (e.get('channel_is_verified') and main in name):continue
        score=(0 if artist_channel else 1,0 if name==words(title) or channel.endswith(' topic') else 1,0 if 'official audio' in name else 1,delta)
        matches.append((score,e))
    result=[];seen=set()
    for _,e in sorted(matches,key=lambda pair:pair[0]):
        if e['id'] in seen:continue
        seen.add(e['id'])
        result.append({'video_id':e['id'],'title':e['title'],'channel':e.get('channel'),'duration_seconds':e['duration'],
            'url':'https://www.youtube.com/watch?v='+e['id'],'match_basis':'Candidate: title + artist/channel + duration within 5s; verify edit by ear',
            'spotify_uri':track['spotify_uri'],'observed_at':now()})
    return result


def select_candidate(track,entries):
    candidates=ranked_candidates(track,entries)
    if not candidates:return None
    return {**candidates[0],'alternatives':candidates[1:4]}


def lookup(track,state):
    artist=(track.get('artists') or [track['artist']])[0]
    queries=[f"{artist} {track['title']} official audio",f"{artist} \"{track['title']}\" Topic"]
    entries=[]
    for i,query in enumerate(queries):
        # Audition tracks get a second search for album audio and alternate uploads.
        if i and select_candidate(track,entries) and not (track.get('audition_rank') or track.get('batch_id')):break
        path=Path(state)/'youtube-search-cache'/(hashlib.sha256(query.encode()).hexdigest()+'.json')
        if path.exists() and time.time()-path.stat().st_mtime<14*86400:
            data=json.loads(path.read_text())
        else:
            command=['yt-dlp','--ignore-config','--flat-playlist','--dump-single-json','--no-warnings',
                     '--skip-download','--socket-timeout','15','--retries','1','--extractor-retries','1','ytsearch7:'+query]
            proc=subprocess.run(command,capture_output=True,text=True,timeout=70)
            if proc.returncode:raise ValueError('yt-dlp search failed; no link changed')
            data=json.loads(proc.stdout);save_json(path,data)
        entries.extend(data.get('entries',[]))
    return select_candidate(track,entries)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--state',type=Path,default=DEFAULT_STATE);p.add_argument('--all',action='store_true')
    p.add_argument('--batch',help='Only this audition batch ID, e.g. 02')
    args=p.parse_args();store=Store(args.state)
    rows=sorted([t for t in store.rows() if t.get('spotify_uri') and (t.get('batch_id')==args.batch if args.batch else args.all or t.get('audition_rank'))],key=lambda t:t.get('audition_rank') or 999)
    report=[]
    with ThreadPoolExecutor(max_workers=3) as pool:
        jobs={pool.submit(lookup,t,args.state):t for t in rows}
        for job in as_completed(jobs):
            t=jobs[job]
            try:
                found=job.result()
                if found:
                    with store.db:
                        fresh=store.track(t['id']);fresh['youtube']=found;store.put(fresh)
                        store.event('youtube_candidate',{'id':t['id'],**found})
                result={'id':t['id'],'title':t['title'],'status':'matched candidate' if found else 'unresolved','youtube':found}
            except (ValueError,OSError,subprocess.TimeoutExpired) as e:
                result={'id':t['id'],'title':t['title'],'status':'error','reason':str(e)}
            report.append(result);save_json(args.state/'youtube-report.json',{'updated':now(),'results':report})
            print(json.dumps(result,ensure_ascii=False),flush=True)
    print(f"Matched candidates: {sum(r['status']=='matched candidate' for r in report)}/{len(rows)}")

if __name__=='__main__':main()
