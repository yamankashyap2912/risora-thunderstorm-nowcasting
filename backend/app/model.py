import json,os
import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from . import sim
HERE=os.path.dirname(__file__)
MP=os.path.join(HERE,"model.joblib")
SP=os.path.join(HERE,"skill.json")

def features(lo,la,t0,lead,cells,r):
    here=sim.point(lo,la,t0,cells)
    up=max(sim.point(lo-1,la,t0,cells),sim.point(lo-2,la,t0,cells),sim.point(lo-3,la,t0,cells))
    m=max(here,up)
    nwp=max(c['p']*np.exp(-((lo-(c['x']+c['vx']*lead/60))**2+(la-(c['y']+c['vy']*lead/60))**2)/(3*c['r'])**2)*np.exp(-((lead-c['t'])/(2*c['w']))**2) for c in cells)+r.normal(0,4)
    return [here,up,sim.sat_point(lo,la,t0,cells),max(0,here-30)*1.6,55+.4*m+r.normal(0,8),500+25*nwp,lead,nwp]

def train(n=9000,seed=0):
    r=np.random.default_rng(seed)
    X=[];y=[]
    for _ in range(n):
        cells=sim.rand_cells(r)
        lead=int(r.integers(0,13))*15
        if r.random()<.65:
            c=cells[int(r.integers(len(cells)))]
            lo=c['x']+c['vx']*lead/60+r.normal(0,1.3);la=c['y']+c['vy']*lead/60+r.normal(0,1.3)
        else:
            lo=r.uniform(70,95);la=r.uniform(9,33)
        X.append(features(lo,la,0,lead,cells,r))
        y.append(int(sim.point(lo,la,lead,cells)>=40))
    X=np.array(X);y=np.array(y)
    k=int(n*.75)
    m=GradientBoostingClassifier(n_estimators=120,max_depth=3,random_state=seed).fit(X[:k],y[:k])
    p=m.predict_proba(X[k:])[:,1]>=.5
    yt=y[k:].astype(bool);ld=X[k:,6]
    sk={}
    for L in (30,60,120,180):
        s=np.abs(ld-L)<=15
        h=(p[s]&yt[s]).sum();mi=(~p[s]&yt[s]).sum();fa=(p[s]&~yt[s]).sum()
        sk[str(L)]=dict(pod=round(h/max(1,h+mi),2),far=round(fa/max(1,h+fa),2),csi=round(h/max(1,h+mi+fa),2))
    joblib.dump(m,MP)
    json.dump(sk,open(SP,"w"))
    return m,sk

def load():
    if os.path.exists(MP) and os.path.exists(SP):
        return joblib.load(MP),json.load(open(SP))
    return train()

MODEL,SKILL=load()

def prob(lo,la,t0,lead):
    x=features(lo,la,t0,lead,sim.CELLS,np.random.default_rng(int(lo*1000+la*10+lead)))
    return float(MODEL.predict_proba([x])[0][1])
