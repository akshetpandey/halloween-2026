"""Private Deezer preview research, never Spotify audio. No human listening claim.
Caches catalog responses and provider previews only below the explicit ignored state.
Strict title/version, primary artist and <=3s full-duration match; missing stays missing.
The 30s excerpts cannot establish full-song form, lyrics, or hook appeal.
"""
import argparse, concurrent.futures, hashlib, json, re, time, unicodedata, urllib.parse, urllib.request
from pathlib import Path

def norm(s):
    return re.sub(r'[^a-z0-9]+',' ',''.join(c for c in unicodedata.normalize('NFKD',s.casefold()) if not unicodedata.combining(c))).strip()
def titlekey(s):
    s=re.sub(r'\bfeat\.?\s+.*','',s,flags=re.I)
    return norm(s.replace(' - ',' ').replace('Radio Edit','').replace('(Edit)','').replace(' - Edit',''))
def key(t):return hashlib.sha256((t.get('spotify_uri') or t['id']).encode()).hexdigest()[:20]
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'GrovePersonalPreviewResearch/1.0'}),timeout=25) as r:return r.read()
def fetch(t,state):
    k=key(t);c=state/'deezer-cache'/f'{k}.json';out=state/'deezer-audio'/f'{k}.mp3'
    try:
        if c.exists():r=json.loads(c.read_text())
        else:
            q=t['artists'][0]+' '+t['title'];r=json.loads(get('https://api.deezer.com/search?'+urllib.parse.urlencode({'q':q,'limit':15})));c.write_text(json.dumps(r));time.sleep(.35)
        matches=[v for v in r.get('data',[]) if titlekey(v.get('title',''))==titlekey(t['title'])
                 and norm(t['artists'][0])==norm(v.get('artist',{}).get('name',''))
                 and abs(v.get('duration',0)*1000-t['duration_ms'])<=3000 and v.get('preview')]
        if not matches:return dict(id=t['id'],status='no_strict_match')
        v=min(matches,key=lambda v:abs(v['duration']*1000-t['duration_ms']))
        if not out.exists():out.write_bytes(get(v['preview']))
        return dict(id=t['id'],status='matched',audio=str(out),provider='Deezer',catalog_id=v['id'],catalog_title=v['title'],catalog_artist=v['artist']['name'],
                    catalog_duration_ms=v['duration']*1000,url=v['link'],preview_url=v['preview'],
                    match='normalized title/version + primary artist + full catalog duration within 3s; no cross-catalog ISRC proof')
    except Exception as e:return dict(id=t['id'],status='error',error=type(e).__name__)

def select(rows):
    g=[t for t in rows if t.get('room','living-room')=='living-room' and t['vote'] in ('up','down')]
    train=[t for t in g if int(t.get('batch_id') or 0)<14];test=[t for t in g if int(t.get('batch_id') or 0)>=14]
    # Fixed before observing audio results; no hand-picked favorable test examples.
    choose=lambda ts,n:sorted(ts,key=lambda t:key(t))[:n]
    return choose([t for t in train if t['vote']=='up'],200)+choose([t for t in train if t['vote']=='down'],100)+[t for t in test if t['vote']=='up']+choose([t for t in test if t['vote']=='down'],100)
if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--state',type=Path,required=True);a.add_argument('--candidates',type=Path);p=a.parse_args();s=p.state
    for d in ['deezer-cache','deezer-audio']:(s/d).mkdir(exist_ok=True)
    rows=json.loads(p.candidates.read_text()) if p.candidates else select(json.loads((s/'review-private.json').read_text()))
    matches=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for i,r in enumerate(pool.map(lambda t:fetch(t,s),rows),1):
            matches.append(r)
            if i%20==0:print(json.dumps({'processed':i,'matched':sum(x['status']=='matched' for x in matches)}),flush=True)
    dest=s/('candidate-previews-private.json' if p.candidates else 'historical-previews-private.json');dest.write_text(json.dumps(matches,indent=2));print(json.dumps({'total':len(matches),'matched':sum(x['status']=='matched' for x in matches)}))
