import asyncio,random,time
from fastapi import FastAPI,WebSocket
from fastapi.middleware.cors import CORSMiddleware
from . import sim,model

app=FastAPI(title="Garaj Nowcast API")
app.add_middleware(CORSMiddleware,allow_origins=["*"],allow_methods=["*"],allow_headers=["*"])

def build_alerts():
    out=[]
    for n,lo,la in sim.CITIES:
        best=0;pk=0;lead=None
        for m in sim.FR[sim.NOW:]:
            p=model.prob(lo,la,0,max(0,m))
            if p>best:
                best=p;pk=round(sim.point(lo,la,m))
            if p>=.6 and lead is None:
                lead=m
        if lead is not None:
            out.append(dict(city=n,prob=round(best*100),lead=lead,peak=pk,level="Severe" if best>=.85 else "Warning" if best>=.7 else "Watch"))
    return sorted(out,key=lambda a:a["lead"])

ALERTS=build_alerts()
SRC=[("DWR Delhi","Doppler radar",10,2.1),("DWR Mumbai","Doppler radar",10,2.4),("DWR Kolkata","Doppler radar",10,3.0),("DWR Chennai","Doppler radar",10,2.7),("INSAT-3DR","IR and water vapour grid",15,4.5),("INSAT-3DS","Visible and IR grid",15,4.8),("Lightning network","Strike points",1,.6),("GFS 0.25 deg","NWP fields",360,38),("WRF 3 km","NWP fields",180,22)]

@app.get("/api/meta")
def meta():
    return dict(frames=sim.FR,now=sim.NOW,bounds=sim.B,cities=sim.CITIES,generated=time.time())

@app.get("/api/frame/{i}")
def frame(i:int):
    i=max(0,min(len(sim.FR)-1,i));t=sim.FR[i]
    z,tb=sim.fields(t)
    cities=[dict(name=n,lon=lo,lat=la,prob=round(model.prob(lo,la,min(t,0),max(t,0)),2)) for n,lo,la in sim.CITIES]
    return dict(t=t,radar=z.round().astype(int).tolist(),sat=tb.round().astype(int).tolist(),lightning=sim.lightning(t,i+7),cities=cities)

@app.get("/api/feeds")
def feeds():
    out=[]
    for n,k,c,l in SRC:
        v=l*(.8+random.random()*.5)*(2.4 if random.random()<.06 else 1)
        out.append(dict(name=n,kind=k,cadence=c,latency=round(v,1),ok=v<=l*1.6))
    return out

@app.get("/api/alerts")
def alerts():
    return ALERTS

@app.get("/api/skill")
def skill():
    return model.SKILL

@app.websocket("/ws/alerts")
async def ws(sock:WebSocket):
    await sock.accept()
    k=0
    try:
        while True:
            a=dict(ALERTS[k%len(ALERTS)]);a["at"]=time.time();a["repeat"]=k>=len(ALERTS)
            await sock.send_json(a)
            k+=1
            await asyncio.sleep(3.5)
    except Exception:
        pass
