#!/usr/bin/env python3
"""Local playlist review and Spotify API management. Python 3.10+, stdlib only."""
import argparse
import base64
import collections
import csv
import hashlib
import http.server
import json
import os
from pathlib import Path
import re
import secrets
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser

ROOT = Path(__file__).resolve().parent
DEFAULT_STATE = ROOT / '.local'
PLAYLIST = '6FEcecNrYObHqVunRf9Vzf'
SCOPES = 'playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public'
VOTES = {'up', 'down', 'maybe', 'unrated'}
FEATURES = {'tempo', 'key', 'mode', 'energy', 'danceability', 'valence', 'acousticness', 'speechiness', 'instrumentalness', 'liveness', 'loudness', 'popularity', 'genre', 'bounce', 'melody', 'sexy', 'repetition', 'theme_fit', 'vocal_density'}

def now():
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())

def save_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as f:
        json.dump(value, f, ensure_ascii=False, indent=2)
        f.write('\n')
    temp.replace(path)

def local_id(t):
    identity = '\0'.join(str(t.get(k, '')).casefold() for k in ('artist', 'title', 'album'))
    return 'local:' + hashlib.sha256(identity.encode()).hexdigest()[:20]

def valid_id(value):
    if not re.fullmatch(r'[A-Za-z0-9]{22}', value):
        raise ValueError('Expected a 22-character Spotify ID.')
    return value

def uri_id(value):
    if not re.fullmatch(r'spotify:track:[A-Za-z0-9]{22}', value):
        raise ValueError('Expected an exact Spotify track URI.')
    return value.rsplit(':', 1)[1]

def validate_feature(field, value, source):
    if field not in FEATURES or not source or len(source) > 1000:
        raise ValueError('Unknown feature or missing source')
    if value is None:
        return None
    if field not in {'key', 'genre'}:
        value = float(value)
        if not (-1000 < value < 1000):
            raise ValueError('Invalid feature value')
        if field in {'energy','danceability','valence','acousticness','speechiness','instrumentalness','liveness'} and not 0 <= value <= 1:
            raise ValueError('Spotify feature must be between 0 and 1')
        if field in {'bounce','melody','sexy','repetition','theme_fit','vocal_density'} and not 1 <= value <= 5:
            raise ValueError('Listening score must be between 1 and 5')
        if field == 'tempo' and value <= 0:
            raise ValueError('Tempo must be positive')
        if field == 'popularity' and not 0 <= value <= 100:
            raise ValueError('Popularity must be between 0 and 100')
    return value

def audit(tracks):
    artist_counts = collections.Counter(a for t in tracks for a in (t.get('artists') or [t.get('artist', 'unknown')]))
    albums = collections.Counter((t.get('artist','unknown'), t.get('album')) for t in tracks if t.get('album'))
    lengths = [t.get('duration_ms', (t.get('duration_seconds') or 0)*1000)/1000 for t in tracks]
    identities = collections.Counter(t.get('isrc') or t.get('spotify_uri') or local_id(t) for t in tracks)
    return {'count':len(tracks), 'artists':dict(artist_counts.most_common()),
            'albums_over_two':[{'artist':a,'album':b,'count':n} for (a,b),n in albums.items() if n>2],
            'duplicate_identities':[ident for ident,n in identities.items() if n>1],
            'known_duration_seconds':sum(lengths),'unknown_durations':lengths.count(0),
            'planning_seconds_after_12s_joins':max(0,sum(lengths)-12*max(0,len(tracks)-1)) if all(lengths) else None,
            'spotify_versions_unresolved':sum(not t.get('spotify_uri') for t in tracks),
            'feature_coverage':{field:sum(field in t.get('features',{}) for t in tracks) for field in sorted(FEATURES)},
            'catalog_feature_coverage':{field:sum(field in t.get('catalog_analysis',{}).get('features',{}) for t in tracks) for field in sorted(FEATURES)},
            'warning':'Catalog/estimated runtime is not a device playback test.'}

class Store:
    def __init__(self, state):
        self.state = Path(state)
        self.state.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(self.state / 'library.sqlite3')
        self.db.row_factory = sqlite3.Row
        self.db.executescript('''
        CREATE TABLE IF NOT EXISTS tracks(id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS feedback(id TEXT PRIMARY KEY, vote TEXT NOT NULL, reason TEXT NOT NULL, updated TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY, at TEXT NOT NULL, kind TEXT NOT NULL, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS snapshots(playlist TEXT PRIMARY KEY, snapshot TEXT NOT NULL, data TEXT NOT NULL);
        ''')

    def event(self, kind, data):
        self.db.execute('INSERT INTO events(at,kind,data) VALUES(?,?,?)', (now(), kind, json.dumps(data)))

    def put(self, t):
        ident = t.get('id') or local_id(t)
        old = self.db.execute('SELECT data FROM tracks WHERE id=?', (ident,)).fetchone()
        merged = json.loads(old[0]) if old else {}
        merged.update(t, id=ident)
        self.db.execute('INSERT OR REPLACE INTO tracks VALUES(?,?)', (ident, json.dumps(merged)))
        return ident

    def seed(self, path):
        data = json.loads(Path(path).read_text())
        with self.db:
            for track in data['tracks']:
                ident = track.get('id') or local_id(track)
                # Re-seeding cannot overwrite later bindings, annotations or votes.
                if not self.db.execute('SELECT 1 FROM tracks WHERE id=?', (ident,)).fetchone():
                    self.put(track)
            self.event('import', {'source': str(path), 'count': len(data['tracks'])})

    def rows(self):
        result = []
        for row in self.db.execute('SELECT t.data,f.vote,f.reason FROM tracks t LEFT JOIN feedback f ON t.id=f.id ORDER BY t.rowid'):
            t = json.loads(row[0])
            t.update(vote=row[1] or 'unrated', reason=row[2] or '')
            result.append(t)
        return result

    def track(self, ident):
        row = self.db.execute('SELECT data FROM tracks WHERE id=?', (ident,)).fetchone()
        if not row:
            raise ValueError('Unknown track')
        return json.loads(row[0])

    def vote(self, ident, vote, reason=''):
        self.track(ident)
        if vote not in VOTES or len(reason) > 2000:
            raise ValueError('Invalid vote or reason')
        with self.db:
            self.db.execute('INSERT OR REPLACE INTO feedback VALUES(?,?,?,?)', (ident, vote, reason, now()))
            self.event('vote', {'id': ident, 'vote': vote, 'reason': reason})

    def annotate(self, ident, field, value, source):
        value = validate_feature(field, value, source)
        t = self.track(ident)
        if value is None:
            t.setdefault('features', {}).pop(field, None)
        else:
            t.setdefault('features', {})[field] = {'value': value, 'source': source, 'observed_at': now()}
        with self.db:
            self.put(t)
            self.event('annotation', {'id': ident, 'field': field, 'value': value, 'source': source})

    def bind(self, ident, exact):
        track = self.track(ident)
        duplicates = [t for t in self.rows() if t.get('spotify_uri') == exact['spotify_uri'] and t['id'] != ident]
        own_vote = self.db.execute('SELECT vote,reason,updated FROM feedback WHERE id=?', (ident,)).fetchone()
        for duplicate in duplicates:
            other = self.db.execute('SELECT vote,reason,updated FROM feedback WHERE id=?', (duplicate['id'],)).fetchone()
            if own_vote and other and tuple(own_vote[:2]) != tuple(other[:2]):
                raise ValueError('Both records have different feedback. Reconcile their votes/notes before binding.')
        with self.db:
            for duplicate in duplicates:
                other = self.db.execute('SELECT vote,reason,updated FROM feedback WHERE id=?', (duplicate['id'],)).fetchone()
                if other and not own_vote:
                    self.db.execute('INSERT OR REPLACE INTO feedback VALUES(?,?,?,?)', (ident,*tuple(other)))
                    own_vote = other
                track['features'] = {**duplicate.get('features',{}), **track.get('features',{})}
                self.db.execute('DELETE FROM feedback WHERE id=?', (duplicate['id'],))
                self.db.execute('DELETE FROM tracks WHERE id=?', (duplicate['id'],))
            self.put({**track, **exact})
            self.event('explicit_version_binding', {'id':ident, 'before':track, 'after':exact, 'merged_ids':[t['id'] for t in duplicates]})

    def import_features(self, path):
        with Path(path).open(newline='') as handle:
            rows = list(csv.DictReader(handle))
        prepared = []
        for row in rows:
            self.track(row['id'])
            prepared.append((row['id'], row['field'], validate_feature(row['field'], row['value'], row['source']), row['source']))
        with self.db:
            for ident, field, value, source in prepared:
                track = self.track(ident)
                track.setdefault('features', {})[field] = {'value': value, 'source': source, 'observed_at': now()}
                self.put(track)
                self.event('imported_feature', {'id': ident, 'field': field, 'value': value, 'source': source})
        return len(rows)

    def record_snapshot(self, snapshot, managed=False):
        pid = snapshot['playlist_id']
        previous = self.db.execute('SELECT data FROM snapshots WHERE playlist=?', (pid,)).fetchone()
        old = json.loads(previous[0]) if previous else None
        current = [t.get('spotify_uri') for t in snapshot['tracks']]
        changes = {'added': [], 'removed': [], 'reordered': False}
        if old:
            before = [t.get('spotify_uri') for t in old['tracks']]
            changes = {'added': list((collections.Counter(current)-collections.Counter(before)).elements()),
                       'removed': list((collections.Counter(before)-collections.Counter(current)).elements()),
                       'reordered': before != current and collections.Counter(before) == collections.Counter(current)}
        with self.db:
            stored = self.rows()
            existing = {t.get('spotify_uri'): t['id'] for t in stored if t.get('spotify_uri')}
            used = set(existing.values())
            for track in snapshot['tracks']:
                if track.get('spotify_uri'):
                    ident = existing.get(track['spotify_uri'])
                    if ident is None:
                        matches = [t for t in stored if t['id'] not in used and not t.get('spotify_uri')
                                   and t.get('title', '').casefold() == track['title'].casefold()
                                   and t.get('artist', '').casefold() in {track['artist'].casefold(), (track.get('artists') or [''])[0].casefold()}
                                   and (not t.get('album') or t['album'].casefold() == track.get('album', '').casefold())
                                   and (not t.get('duration_seconds') or abs(t['duration_seconds']*1000-track['duration_ms']) < 2500)]
                        if len(matches) == 1:
                            ident = matches[0]['id']
                            self.event('baseline_identity_match', {'id': ident, 'spotify_uri': track['spotify_uri'], 'source': 'unique title/artist/available album and duration in observed playlist'})
                    track['id'] = ident or track['spotify_uri']
                    used.add(track['id'])
                    self.put(track)
            self.db.execute('INSERT OR REPLACE INTO snapshots VALUES(?,?,?)', (pid, snapshot['snapshot_id'], json.dumps(snapshot)))
            self.event('managed_sync' if managed else 'observed_sync', {'playlist': pid, **changes})
        save_json(self.state / 'snapshots' / f'{pid}-{time.time_ns()}.json', snapshot)
        return changes

class API:
    def __init__(self, state):
        self.state = Path(state)
        path = self.state / 'token.json'
        if not path.exists():
            raise ValueError('Spotify is not connected. Run: lab.py auth --client-id YOUR_CLIENT_ID')
        self.token = json.loads(path.read_text())

    def token_request(self, data):
        req = urllib.request.Request('https://accounts.spotify.com/api/token', urllib.parse.urlencode(data).encode())
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                token = json.load(res)
        except urllib.error.HTTPError as e:
            raise ValueError(f'Spotify authorization failed (HTTP {e.code}); reconnect with auth.') from None
        token['refresh_token'] = token.get('refresh_token', self.token.get('refresh_token'))
        token['client_id'] = data['client_id']
        token['expires_at'] = time.time() + token['expires_in']
        self.token = token
        save_json(self.state / 'token.json', token)

    def request(self, method, path, body=None):
        if self.token['expires_at'] < time.time() + 60:
            self.token_request({'grant_type':'refresh_token', 'refresh_token':self.token['refresh_token'], 'client_id':self.token['client_id']})
        if not path.startswith('/') or path.startswith('//'):
            raise ValueError('API path must be relative')
        for attempt in range(3):
            req = urllib.request.Request('https://api.spotify.com/v1'+path,
                data=None if body is None else json.dumps(body).encode(), method=method,
                headers={'Authorization':'Bearer '+self.token['access_token'], 'Content-Type':'application/json'})
            try:
                with urllib.request.urlopen(req, timeout=30) as res:
                    return json.loads(res.read() or '{}')
            except urllib.error.HTTPError as e:
                if e.code == 429 and method == 'GET' and attempt < 2:
                    delay = float(e.headers.get('Retry-After', '1'))
                    if 0 <= delay <= 30:
                        time.sleep(delay)
                        continue
                raise ValueError(f'Spotify HTTP {e.code} on {method} {path.split("?")[0]}. '
                                 'No automatic write retry; pull current state before retrying. '
                                 '403 may mean app/scope/ownership restrictions; 429 means wait for quota reset.') from None
            except (urllib.error.URLError, TimeoutError):
                raise ValueError('Spotify network failure. A write may have succeeded; pull before retrying.') from None
        raise ValueError('Spotify rate limit; try later.')

    def pull(self, pid):
        valid_id(pid)
        meta = self.request('GET', f'/playlists/{pid}')
        rows, offset, total = [], 0, None
        while total is None or offset < total:
            page = self.request('GET', f'/playlists/{pid}/items?limit=50&offset={offset}&market=US')
            items = page['items']
            total = page['total']
            if not items and offset < total:
                raise ValueError('Incomplete playlist page; snapshot discarded')
            for wrapper in items:
                item = wrapper.get('item', wrapper.get('track'))
                if item is None or item.get('is_local') or item.get('type') != 'track':
                    raise ValueError('Unavailable/local/non-track item found; snapshot discarded to avoid false removals')
                rows.append(normalize(item))
            offset += len(items)
        after = self.request('GET', f'/playlists/{pid}')
        if meta['snapshot_id'] != after['snapshot_id'] or len(rows) != total:
            raise ValueError('Playlist changed while reading; retry pull')
        return {'playlist_id': pid, 'name': meta['name'], 'url': meta.get('external_urls',{}).get('spotify'),
                'snapshot_id': meta['snapshot_id'], 'observed_at': now(), 'tracks': rows}

def normalize(item):
    return {'spotify_uri': item['uri'], 'spotify_url': item['external_urls']['spotify'],
            'artist': ', '.join(a['name'] for a in item['artists']), 'artists': [a['name'] for a in item['artists']],
            'artist_ids': [a['id'] for a in item['artists']], 'title': item['name'],
            'album': item['album']['name'], 'album_id': item['album']['id'], 'duration_ms': item['duration_ms'],
            'duration_source': 'Spotify Web API', 'explicit': item['explicit'],
            'isrc': item.get('external_ids',{}).get('isrc'), 'release_date': item['album'].get('release_date'),
            'popularity': item.get('popularity'), 'metadata_at': now(), 'is_playable': item.get('is_playable')}

def fetch_genres(api, store):
    """Cache artist-level genres separately from editorial track styles."""
    path = store.state / 'artist-cache.json'
    cache = json.loads(path.read_text()) if path.exists() else {}
    ids = sorted({a for t in store.rows() for a in t.get('artist_ids',[])})
    fetched = 0
    for aid in ids:
        valid_id(aid)
        entry = cache.get(aid)
        if entry is None or time.time()-entry['fetched_at'] > 30*86400:
            data = api.request('GET', '/artists/'+aid)
            cache[aid] = {'name':data['name'], 'genres':data.get('genres'),
                          'source':'Spotify artist API', 'observed_at':now(), 'fetched_at':time.time()}
            save_json(path, cache)
            fetched += 1
            time.sleep(.3)
    with store.db:
        for t in store.rows():
            if t.get('artist_ids'):
                t['artist_genres'] = {a:cache[a] for a in t['artist_ids']}
                store.put(t)
        store.event('artist_genres_import', {'artists':len(ids), 'fetched':fetched})
    return {'artists':len(ids), 'fetched':fetched, 'note':'Artist genres are not track-level classifications.'}

def authenticate(state, client_id, port, open_browser=True):
    if not re.fullmatch(r'[a-fA-F0-9]{32}', client_id):
        raise ValueError('Expected the public 32-character Spotify Client ID, not a secret')
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip('=')
    nonce = secrets.token_urlsafe(32)
    redirect = f'http://127.0.0.1:{port}/callback'
    result = {}
    class Callback(http.server.BaseHTTPRequestHandler):
        def log_message(self, *args): pass
        def do_GET(self):
            parsed = urllib.parse.urlsplit(self.path)
            q = urllib.parse.parse_qs(parsed.query)
            if parsed.path != '/callback' or q.get('state') != [nonce]:
                self.send_error(400); return
            result.update(code=q.get('code', [None])[0], error=q.get('error', [None])[0])
            self.send_response(200); self.end_headers()
            self.wfile.write(b'Authorization received. You can return to Playlist Lab.')
    with http.server.HTTPServer(('127.0.0.1', port), Callback) as server:
        server.timeout = 1
        url = 'https://accounts.spotify.com/authorize?' + urllib.parse.urlencode({
            'client_id':client_id, 'response_type':'code', 'redirect_uri':redirect,
            'scope':SCOPES, 'state':nonce, 'code_challenge_method':'S256', 'code_challenge':challenge})
        print('Register this redirect URI in your Spotify app:', redirect, flush=True)
        print('Waiting up to 5 minutes for Spotify authorization.', flush=True)
        save_json(Path(state) / 'auth-request.json', {'url': url, 'expires_at': time.time() + 300})
        if open_browser:
            webbrowser.open(url)
        else:
            print('Authorization URL saved in local auth-request.json; open it in your browser.', flush=True)
        deadline = time.time() + 300
        while not result and time.time() < deadline:
            server.handle_request()
    if not result.get('code'):
        raise ValueError('Authorization denied or timed out')
    api = object.__new__(API)
    api.state, api.token = Path(state), {}
    api.token_request({'client_id':client_id, 'grant_type':'authorization_code', 'code':result['code'],
                       'redirect_uri':redirect, 'code_verifier':verifier})
    print('Connected. Token stored locally and excluded from Git.')

def plan_changes(snapshot, desired):
    uris = [t['spotify_uri'] for t in snapshot['tracks']]
    for uri in desired: uri_id(uri)
    if not desired or len(desired) != len(set(desired)):
        raise ValueError('Desired sequence must be nonempty and contain no duplicate URIs')
    if len(uris) != len(set(uris)):
        raise ValueError('Live duplicates need explicit review before syncing')
    return {'playlist_id':snapshot['playlist_id'], 'snapshot_id':snapshot['snapshot_id'],
            'before':uris, 'desired':desired, 'add':[u for u in desired if u not in uris],
            'remove':[u for u in uris if u not in desired], 'created_at':now()}

def apply_plan(api, store, plan):
    pid = valid_id(plan['playlist_id'])
    current = api.pull(pid)
    validated = plan_changes(current, plan['desired'])
    if current['snapshot_id'] != plan['snapshot_id'] or validated['before'] != plan['before']:
        raise ValueError('Live playlist changed. Pull and create a new plan.')
    down = {t.get('spotify_uri') for t in store.rows() if t['vote'] == 'down'}
    if down.intersection(plan['desired']):
        raise ValueError('Desired sequence includes a downvoted track; revise the plan or change its vote first')
    if pid == PLAYLIST:
        metadata = {t['spotify_uri']: t for t in current['tracks']}
        for uri in validated['add']:
            metadata[uri] = normalize(api.request('GET', '/tracks/' + uri_id(uri)))
        seconds = sum(metadata[u]['duration_ms'] for u in plan['desired'])/1000 - 12*(len(plan['desired'])-1)
        if seconds < 9*3600:
            raise ValueError('Party playlist would fall below nine hours with a 12-second planning overlap. Use a separate audition playlist.')
        if any(re.search(r'\b(intro|outro|interlude|prelude)\b', metadata[u]['title'], re.I) for u in plan['desired']):
            raise ValueError('Party playlist contains an excluded intro/outro/interlude/prelude title')
    # Recompute actions; never trust edited add/remove arrays in a saved plan.
    save_json(store.state / 'backups' / f'{pid}-{time.time_ns()}.json', current)
    work = list(validated['before'])
    snapshot = current['snapshot_id']
    store.record_snapshot(current)
    def mutate(method, body):
        nonlocal snapshot
        live = api.request('GET', f'/playlists/{pid}')
        if live['snapshot_id'] != snapshot:
            raise ValueError('Concurrent edit detected; stop and re-plan from live state')
        with store.db: store.event('write_attempt', {'playlist':pid, 'method':method, 'body':body})
        response = api.request(method, f'/playlists/{pid}/items', body)
        snapshot = response['snapshot_id']
        with store.db: store.event('write_acknowledged', {'playlist':pid, 'snapshot':snapshot})
    for start in range(0, len(validated['remove']), 100):
        chunk = validated['remove'][start:start+100]
        mutate('DELETE', {'items':[{'uri':u} for u in chunk], 'snapshot_id':snapshot})
        work = [u for u in work if u not in chunk]
    for start in range(0, len(validated['add']), 100):
        chunk = validated['add'][start:start+100]
        mutate('POST', {'uris':chunk})
        work.extend(chunk)
    for target, uri in enumerate(plan['desired']):
        index = work.index(uri)
        if index != target:
            mutate('PUT', {'range_start':index, 'range_length':1, 'insert_before':target, 'snapshot_id':snapshot})
            work.insert(target, work.pop(index))
    final = api.pull(pid)
    if [t['spotify_uri'] for t in final['tracks']] != plan['desired']:
        raise ValueError('Read-back mismatch; inspect live playlist and backup before retrying')
    store.record_snapshot(final, managed=True)
    return {'verified':True, 'track_count':len(work), 'snapshot_id':final['snapshot_id']}

def serve(store, port):
    csrf = secrets.token_urlsafe(32)
    origin = f'http://127.0.0.1:{port}'
    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self, *args): pass
        def respond(self, data, status=200, mime='application/json'):
            raw = data if isinstance(data, bytes) else json.dumps(data).encode()
            self.send_response(status)
            self.send_header('Content-Type', mime)
            self.send_header('Content-Length', str(len(raw)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers(); self.wfile.write(raw)
        def allowed(self):
            return self.headers.get('Host') == f'127.0.0.1:{port}'
        def do_GET(self):
            if not self.allowed(): self.send_error(403); return
            if self.path == '/':
                self.respond((ROOT/'review.html').read_bytes(), mime='text/html; charset=utf-8')
            elif self.path == '/api/tracks':
                self.respond({'tracks':store.rows(), 'csrf':csrf})
            elif self.path == '/api/events':
                self.respond([dict(r) for r in store.db.execute('SELECT * FROM events ORDER BY seq DESC LIMIT 100')])
            else: self.send_error(404)
        def do_POST(self):
            if not self.allowed() or self.headers.get('Origin') != origin or self.headers.get('X-CSRF-Token') != csrf:
                self.send_error(403); return
            try:
                size = int(self.headers.get('Content-Length','0'))
                if not 0 < size < 16384: raise ValueError('Invalid request size')
                data = json.loads(self.rfile.read(size))
                if self.path == '/api/vote': store.vote(data['id'], data['vote'], data.get('reason',''))
                elif self.path == '/api/annotate': store.annotate(data['id'], data['field'], data['value'], 'host listening')
                else: self.send_error(404); return
                self.respond({'saved':True})
            except (ValueError, KeyError, TypeError) as e: self.respond({'error':str(e)}, 400)
    print(f'Playlist Lab: {origin} (Ctrl-C to stop)', flush=True)
    with http.server.HTTPServer(('127.0.0.1', port), Handler) as server:
        server.serve_forever()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--state', type=Path, default=DEFAULT_STATE)
    sub = parser.add_subparsers(dest='command', required=True)
    p = sub.add_parser('auth'); p.add_argument('--client-id', required=True); p.add_argument('--port',type=int,default=8766); p.add_argument('--no-browser',action='store_true')
    p = sub.add_parser('import'); p.add_argument('file',type=Path)
    p = sub.add_parser('serve'); p.add_argument('--port',type=int,default=8765)
    p = sub.add_parser('audit'); p.add_argument('--audition',action='store_true'); p.add_argument('--approved',action='store_true')
    p = sub.add_parser('export'); p.add_argument('file',type=Path)
    p = sub.add_parser('pull'); p.add_argument('--playlist',default=PLAYLIST)
    p = sub.add_parser('search'); p.add_argument('query')
    p = sub.add_parser('bind'); p.add_argument('id'); p.add_argument('uri')
    p = sub.add_parser('vote'); p.add_argument('id'); p.add_argument('vote',choices=sorted(VOTES)); p.add_argument('--reason',default='')
    p = sub.add_parser('annotate'); p.add_argument('id'); p.add_argument('field',choices=sorted(FEATURES)); p.add_argument('value'); p.add_argument('--source',required=True)
    p = sub.add_parser('import-features'); p.add_argument('file',type=Path)
    p = sub.add_parser('create'); p.add_argument('name'); p.add_argument('--apply',action='store_true')
    p = sub.add_parser('features'); p.add_argument('--limit',type=int,default=1)
    sub.add_parser('genres')
    p = sub.add_parser('plan'); p.add_argument('desired',type=Path); p.add_argument('output',type=Path); p.add_argument('--playlist',default=PLAYLIST)
    p = sub.add_parser('apply'); p.add_argument('plan',type=Path); p.add_argument('--apply',action='store_true')
    args = parser.parse_args()
    store = Store(args.state)
    if args.command == 'auth': authenticate(args.state, args.client_id, args.port, not args.no_browser)
    elif args.command == 'import': store.seed(args.file); print('Imported', len(store.rows()), 'tracks')
    elif args.command == 'serve': serve(store,args.port)
    elif args.command == 'import-features': print('Imported', store.import_features(args.file), 'feature values')
    elif args.command == 'create':
        if not args.apply: print('Preview: create private playlist', args.name, '(pass --apply to execute)')
        else:
            created = API(args.state).request('POST','/me/playlists',{'name':args.name, 'public':False})
            with store.db: store.event('created_playlist', {'id':created['id'], 'name':created['name']})
            print(json.dumps({'id':created['id'],'url':created.get('external_urls',{}).get('spotify')},indent=2))
    elif args.command == 'audit':
        rows = store.rows()
        if args.audition: rows = [t for t in rows if t.get('audition_rank')]
        if args.approved: rows = [t for t in rows if t['vote'] == 'up']
        print(json.dumps(audit(rows),indent=2,ensure_ascii=False))
    elif args.command == 'export':
        save_json(args.file, {'exported_at':now(), 'tracks':store.rows(), 'events':[dict(r) for r in store.db.execute('SELECT * FROM events ORDER BY seq')]})
        print('Saved', args.file)
    elif args.command == 'vote': store.vote(args.id,args.vote,args.reason)
    elif args.command == 'annotate': store.annotate(args.id,args.field,args.value,args.source)
    elif args.command == 'apply':
        plan = json.loads(args.plan.read_text())
        if not args.apply: print(json.dumps(plan,indent=2)); print('Preview only. Pass --apply to execute.')
        else: print(json.dumps(apply_plan(API(args.state),store,plan),indent=2))
    else:
        api = API(args.state)
        if args.command == 'genres': print(json.dumps(fetch_genres(api,store)))
        elif args.command == 'pull':
            snap = api.pull(args.playlist)
            print(json.dumps({'name':snap['name'],'count':len(snap['tracks']), 'changes':store.record_snapshot(snap)},indent=2))
        elif args.command == 'search':
            response = api.request('GET','/search?'+urllib.parse.urlencode({'q':args.query,'type':'track','limit':10,'market':'US'}))
            print(json.dumps([normalize(t) for t in response['tracks']['items']],indent=2,ensure_ascii=False))
        elif args.command == 'bind':
            t = store.track(args.id)
            exact = normalize(api.request('GET','/tracks/'+uri_id(args.uri)))
            store.bind(args.id, exact)
            print('Bound exact Spotify version. Review title, artist, album and duration in the UI.')
        elif args.command == 'features':
            for t in [t for t in store.rows() if t.get('spotify_uri')][:args.limit]:
                data = api.request('GET','/audio-features/'+uri_id(t['spotify_uri']))
                for field in FEATURES & data.keys():
                    if data[field] is not None: store.annotate(t['id'],field,data[field],'Spotify audio-features API')
            print('Feature probe complete; unavailable fields stay unknown.')
        elif args.command == 'plan':
            desired = json.loads(args.desired.read_text())
            snap = api.pull(args.playlist)
            store.record_snapshot(snap)
            plan = plan_changes(snap, desired)
            save_json(args.output,plan)
            print(json.dumps({'add':plan['add'],'remove':plan['remove'],'desired_count':len(desired),'saved':str(args.output)},indent=2))

if __name__ == '__main__':
    try: main()
    except KeyboardInterrupt:
        print('Stopped.')
    except (ValueError, OSError, KeyError) as error:
        raise SystemExit(str(error)) from None
