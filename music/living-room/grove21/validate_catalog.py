"""Read a private canonical snapshot; compare catalog-only rules on a later holdout.
No writes to the hosted DB, credentials, or votes. No artist/title/lane text features.
Run with an environment supplying numpy and scikit-learn; --state stays ignored.
"""
import argparse, json
from pathlib import Path
import numpy as np
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score, average_precision_score

FEATURES = ['tempo','energy','danceability','valence','acousticness','speechiness',
            'instrumentalness','liveness','loudness']
def vector(t):
    f=t.get('catalog_analysis',{}).get('features',{})
    return [t.get('duration_ms',0)/1000]+[f.get(k,{}).get('value',np.nan) for k in FEATURES]
def run(rows):
    rows=[t for t in rows if t.get('room','living-room')=='living-room'
          and t.get('vote') in ('up','down') and t.get('catalog_analysis')]
    train=[t for t in rows if int(t.get('batch_id') or 0)<14]
    test=[t for t in rows if int(t.get('batch_id') or 0)>=14]
    x=np.asarray([vector(t) for t in train]); y=np.asarray([t['vote']=='up' for t in train]);xt=np.asarray([vector(t) for t in test]);yt=np.asarray([t['vote']=='up' for t in test])
    models={'catalog_logistic':make_pipeline(SimpleImputer(),StandardScaler(),LogisticRegression(C=.1,max_iter=2000,random_state=21)),
            'catalog_forest':make_pipeline(SimpleImputer(),RandomForestClassifier(n_estimators=300,min_samples_leaf=12,max_features=.7,random_state=21))}
    result={'features':['duration_seconds']+FEATURES,'train_n':len(train),'test_n':len(test),'test_keeps':int(yt.sum()),'test_keep_rate':float(yt.mean()),'models':{}}
    for name,model in models.items():
        model.fit(x,y); s=model.predict_proba(xt)[:,1];top=np.argsort(-s)[:15]
        result['models'][name]={'roc_auc':float(roc_auc_score(yt,s)),'average_precision':float(average_precision_score(yt,s)),
           'top15_keeps':int(yt[top].sum()),'top15_late_failed_batch_tracks':sum(int(test[i].get('batch_id') or 0)>=17 for i in top),
           'top15':[{'artist':test[i]['artist'],'title':test[i]['title'],'vote':test[i]['vote'],'batch':test[i].get('batch_id')} for i in top]}
    return result
if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--state',type=Path,required=True);a=ap.parse_args();r=run(json.loads((a.state/'review-private.json').read_text()));(a.state/'catalog-validation-private.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,indent=2))
