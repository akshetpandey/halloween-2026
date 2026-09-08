#!/usr/bin/env python3
"""Retrieve sourced audio descriptors from ReccoBeats, without audio uploads."""
import argparse
import hashlib
import json
import re
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from lab import Store, DEFAULT_STATE, now, save_json, uri_id, validate_feature

FIELDS = {'tempo','key','mode','energy','danceability','valence','acousticness','speechiness',
          'instrumentalness','liveness','loudness'}


def canonical(value):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFKC', value).replace('’', "'").casefold()).strip()


def spotify_id(url):
    parsed = urllib.parse.urlsplit(url or '')
    match = re.fullmatch(r'/track/([A-Za-z0-9]{22})', parsed.path)
    return match[1] if parsed.scheme == 'https' and parsed.hostname == 'open.spotify.com' and match else None


def choose_match(track, candidates, allow_recording=False):
    """Prefer exact Spotify ID. Unbound records require title, artists and duration."""
    if track.get('spotify_uri'):
        matches = [c for c in candidates if spotify_id(c.get('href')) == uri_id(track['spotify_uri'])]
        if len(matches)==1:return matches[0], 'exact Spotify ID'
        if not allow_recording or not track.get('isrc'):
            return None, 'exact ID missing/ambiguous'
        candidates=[c for c in candidates if c.get('isrc')==track['isrc']]
    duration = track.get('duration_ms') or (track.get('duration_seconds') or 0)*1000
    if not duration:
        return None, 'duration unknown; resolve Spotify version first'
    artists = {canonical(a) for a in (track.get('artists') or re.split(r'\s*(?:&|,)\s*', track['artist']))}
    matches = [c for c in candidates if canonical(c.get('trackTitle','')) == canonical(track['title'])
               and {canonical(a['name']) for a in c.get('artists',[])} == artists
               and abs(c.get('durationMs',0)-duration) <= 2500]
    if not matches:
        return None, 'no exact title/artist/duration match'
    # Several releases of the same recording can share an ISRC; keep Spotify version unresolved.
    recordings = {c.get('isrc') or c['id'] for c in matches}
    if len(recordings) != 1:
        return None, 'multiple recordings match; manual version resolution needed'
    basis='same ISRC + title + artists + duration; alternate catalog release' if track.get('spotify_uri') else 'catalog title + artists + duration; Spotify version unverified'
    return matches[0], basis


class Recco:
    def __init__(self, state):
        self.cache = Path(state)/'reccobeats-cache'
        self.last_request = 0
    def get(self, path):
        if not path.startswith('/') or path.startswith('//'):
            raise ValueError('Expected relative API path')
        cached = self.cache/(hashlib.sha256(path.encode()).hexdigest()+'.json')
        if cached.exists():
            entry = json.loads(cached.read_text())
            if time.time()-entry['fetched_at'] < 86400:
                return entry['data']
        req = urllib.request.Request('https://api.reccobeats.com/v1'+path,
            headers={'Accept':'application/json','User-Agent':'OctoberGrovePlaylistLab/1.0'})
        for attempt in range(4):
            time.sleep(max(0, 1.0-(time.monotonic()-self.last_request)))
            self.last_request = time.monotonic()
            try:
                with urllib.request.urlopen(req,timeout=20) as response:
                    data=json.load(response)
                break
            except urllib.error.HTTPError as e:
                if e.code==404:return None
                if e.code==429 and attempt<3:
                    try: delay=max(float(e.headers.get('Retry-After','1')),2**attempt)
                    except ValueError: delay=60
                    if 0<=delay<=30:
                        time.sleep(delay)
                        continue
                raise ValueError(f'ReccoBeats HTTP {e.code}; enrichment stopped. Retry-After: {e.headers.get("Retry-After","unspecified")}') from None
            except (urllib.error.URLError,TimeoutError):
                raise ValueError('ReccoBeats connection failed; enrichment stopped, prior progress retained.') from None
        save_json(cached, {'fetched_at':time.time(),'data':data})
        return data


def search_candidates(service, title):
    path='/track/search?'+urllib.parse.urlencode({'searchText':title})
    first=service.get(path) or {}
    candidates=list(first.get('content',[]))
    for page in range(1,min(8,first.get('totalPages',1))):
        data=service.get(path+'&page='+str(page)) or {}
        if data.get('page')!=page:raise ValueError('Unexpected catalog search page; match discarded')
        candidates.extend(data.get('content',[]))
    return candidates


def enrich_track(store, service, track):
    if track.get('spotify_uri'):
        response=service.get('/track?'+urllib.parse.urlencode({'ids':uri_id(track['spotify_uri'])}))
    else:
        response={'content':search_candidates(service,track['title'])}
    match,basis=choose_match(track,(response or {}).get('content',[]))
    if not match and track.get('spotify_uri') and track.get('isrc'):
        match,basis=choose_match(track,search_candidates(service,track['title']),allow_recording=True)
    if not match:return {'id':track['id'],'title':track['title'],'status':'unresolved','reason':basis}
    if not re.fullmatch(r'[0-9a-fA-F-]{36}',match['id']):raise ValueError('Invalid ReccoBeats ID')
    data=service.get('/track/'+match['id']+'/audio-features')
    if not data:return {'id':track['id'],'title':track['title'],'status':'missing features'}
    if data.get('id')!=match['id'] or data.get('href')!=match.get('href'):
        raise ValueError('Audio-feature identity mismatch; no values attached')
    source='ReccoBeats catalog (not a live Spotify feature measurement)'
    features={f:{'value':validate_feature(f,data[f],source),'source':source,'observed_at':now(),
                 'track_url':match['href'],'match_basis':basis} for f in FIELDS & data.keys() if data[f] is not None and not(f=='key' and data[f]==-1)}
    result={'provider':'ReccoBeats','match_basis':basis,'track_url':match['href'],'isrc':match.get('isrc'),
            'duration_ms':match.get('durationMs'),'observed_at':now(),'features':features}
    fresh=store.track(track['id'])
    # These remain distinct from host scores and editorial estimates.
    fresh['catalog_analysis']=result
    with store.db:
        store.put(fresh)
        store.event('catalog_enrichment',{'id':track['id'],'provider':'ReccoBeats','match_basis':basis,'fields':sorted(features)})
    return {'id':track['id'],'title':track['title'],'status':'enriched','fields':len(features),'match_basis':basis}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--state',type=Path,default=DEFAULT_STATE)
    p.add_argument('--audition',action='store_true')
    p.add_argument('--limit',type=int)
    args=p.parse_args()
    store=Store(args.state);service=Recco(args.state)
    rows=store.rows()
    if args.audition:rows=[t for t in rows if t.get('audition_rank')]
    if args.limit is not None:rows=rows[:args.limit]
    report=[]
    try:
        for track in rows:
            result=enrich_track(store,service,track);report.append(result)
            print(json.dumps(result,ensure_ascii=False),flush=True)
    finally:
        save_json(args.state/'enrichment-report.json',{'updated':now(),'results':report})
    print(f'Enriched {sum(r["status"]=="enriched" for r in report)}/{len(rows)}; others remain unknown.')

if __name__=='__main__':
    try:main()
    except (ValueError,OSError) as e:raise SystemExit(str(e)) from None
