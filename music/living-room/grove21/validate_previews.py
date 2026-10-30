"""Exploratory signal analysis of Deezer excerpts, not listening or lyric analysis.
No Spotify audio. Fixed temporal split: batches <=13 train; >=14 test.
Gate fixed before results: AUC >=.70, >=7/15 Keeps and >=2 more than the
catalog baseline on identical test rows. A failure withholds batch publication.
This is a diagnostic on a small matched subset, never a guarantee of taste.
"""
import argparse, concurrent.futures, json, subprocess, warnings
from pathlib import Path
import numpy as np
import librosa
from scipy.stats import entropy
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, average_precision_score
from validate_catalog import vector as catalog_vector
warnings.filterwarnings('ignore',category=UserWarning)

def extract(row,state):
    path=Path(row['audio']);cache=state/'signal-cache'/(path.stem+'.json')
    if cache.exists():return row['id'],json.loads(cache.read_text())
    raw=subprocess.run(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-ac','1','-ar','16000','-'],capture_output=True,check=True).stdout
    y=np.frombuffer(raw,dtype=np.float32).copy();sr=16000;hop=320
    spec=np.abs(librosa.stft(y,n_fft=1024,hop_length=hop));power=spec**2
    mfcc=librosa.feature.mfcc(S=librosa.power_to_db(librosa.feature.melspectrogram(S=power,sr=sr,n_mels=40)),n_mfcc=13)[1:]
    chroma=librosa.feature.chroma_stft(S=power,sr=sr,n_fft=1024)
    onset=librosa.onset.onset_strength(S=librosa.power_to_db(power),sr=sr,hop_length=hop)
    rms=librosa.feature.rms(S=spec,frame_length=1024)[0];centroid=librosa.feature.spectral_centroid(S=spec,sr=sr)[0]
    flux=np.maximum(np.diff(spec,axis=1),0).sum(axis=0)/(spec.sum(axis=0)[:-1]+1e-9)
    ac=librosa.autocorrelate(onset,max_size=150);ac/=max(ac[0],1e-9)
    segments=np.array_split(mfcc,6,axis=1);section_means=np.array([z.mean(axis=1) for z in segments])
    d=np.linalg.norm(np.diff(section_means,axis=0),axis=1)
    pitch=chroma.mean(axis=1);pitch/=pitch.sum()+1e-9
    v=np.r_[mfcc.mean(axis=1),mfcc.std(axis=1),np.abs(np.diff(mfcc,axis=1)).mean(axis=1),
        [np.mean(rms),np.std(rms),np.quantile(rms,.1)/(np.quantile(rms,.9)+1e-9),np.mean(centroid),np.std(centroid),
         np.mean(flux),np.std(flux),np.mean(onset),np.std(onset),float(np.mean(onset>np.quantile(onset,.75)*1.5)),
         np.max(ac[15:60]),np.mean(ac[15:60]),entropy(pitch),np.mean(chroma.std(axis=1)),np.mean(d),np.max(d)]]
    r={'vector':v.tolist(),'seconds':len(y)/sr,'rms_cv':float(np.std(rms)/(np.mean(rms)+1e-9)),
       'onset_cv':float(np.std(onset)/(np.mean(onset)+1e-9)),'spectral_change_mean':float(np.mean(d)),
       'pulse_autocorrelation_peak':float(np.max(ac[15:60]))}
    cache.write_text(json.dumps(r));return row['id'],r

def main(state):
    (state/'signal-cache').mkdir(exist_ok=True)
    rows=json.loads((state/'review-private.json').read_text());idx={t['id']:t for t in rows}
    previews=[t for t in json.loads((state/'historical-previews-private.json').read_text()) if t['status']=='matched']
    signals={}
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for i,(ident,v) in enumerate(pool.map(lambda t:extract(t,state),previews),1):
            signals[ident]=v
            if i%30==0:print('Analyzed',i,flush=True)
    train=[idx[t['id']] for t in previews if int(idx[t['id']].get('batch_id') or 0)<14];test=[idx[t['id']] for t in previews if int(idx[t['id']].get('batch_id') or 0)>=14]
    y=np.array([t['vote']=='up' for t in train]);yt=np.array([t['vote']=='up' for t in test]);report={'train_n':len(train),'train_keeps':int(y.sum()),'test_n':len(test),'test_keeps':int(yt.sum()),'models':{}}
    for name,vec in [('catalog_same_subset',catalog_vector),('audio_excerpt',lambda t:signals[t['id']]['vector']),('audio_and_catalog',lambda t:signals[t['id']]['vector']+catalog_vector(t))]:
        model=make_pipeline(SimpleImputer(),StandardScaler(),LogisticRegression(C=.1,max_iter=3000,random_state=21))
        model.fit([vec(t) for t in train],y);s=model.predict_proba([vec(t) for t in test])[:,1];top=np.argsort(-s)[:15]
        report['models'][name]={'roc_auc':float(roc_auc_score(yt,s)),'average_precision':float(average_precision_score(yt,s)),'top15_keeps':int(yt[top].sum()),
            'top15':[{'artist':test[i]['artist'],'title':test[i]['title'],'vote':test[i]['vote'],'batch':test[i].get('batch_id'),'score':float(s[i])} for i in top]}
    baseline=report['models']['catalog_same_subset']['top15_keeps'];r=report['models']['audio_and_catalog'];report['publication_gate_passed']=bool(r['roc_auc']>=.7 and r['top15_keeps']>=7 and r['top15_keeps']>=baseline+2)
    (state/'signal-validation-private.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--state',required=True,type=Path);main(p.parse_args().state)
