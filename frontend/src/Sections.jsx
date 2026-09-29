import {useState} from 'react'

const F=[['Multi-sensor fusion','One grid from Doppler radars, INSAT IR, lightning strikes and GFS/WRF fields.',['Radar','INSAT','Lightning','NWP'],'b'],['0 to 3 hour playback','15-minute frames, one tap from the last observation to +180 minutes.',['15 min','180 min'],'g'],['Alert dispatcher','Watch, Warning and Severe alerts with one-click dispatch to control rooms.',['CAP','SMS'],'p'],['Ask Risora','A chat assistant that answers from the same frames, alerts and feed status.',['Beta'],''],['Honest skill scores','POD, FAR and CSI shown per lead time, so nobody over-trusts the forecast.',['POD','FAR','CSI'],'g'],['Open API','REST for frames and alerts, WebSocket for live warnings.',['REST','WebSocket'],'b']]

export function Features(){
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{F.map((f,i)=><article key={f[0]} className="glass p-6 rv" style={{transitionDelay:i*70+'ms'}}>
    <h3 className="text-xl m-0 mb-2">{f[0]}</h3><p className="m-0 mb-4 text-[14px]" style={{color:'var(--mut)',lineHeight:1.6}}>{f[1]}</p>
    <div className="flex gap-2 flex-wrap">{f[2].map(t=><span key={t} className={'tag '+f[3]}>{t}</span>)}</div></article>)}</div>
}

const P=[['Community',0,'For students and local observers',['Map with radar, satellite and lightning','60-minute forecast','Assistant, 20 questions a day'],false],['Pro',4999,'For district disaster teams',['Full 0 to 3 hour forecast','Alert dispatch by SMS and CAP','REST and WebSocket API','Priority feed monitoring'],true],['Enterprise',null,'For state agencies and utilities',['Your own radar and INSAT ingestion','On-premise deployment','Model retraining on your archives','24/7 support'],false]]

export function Pricing({onChoose}){
  const [yr,setYr]=useState(false)
  return <div>
    <div className="flex justify-center gap-2 mb-8"><button className={'chip '+(!yr?'on':'')} onClick={()=>setYr(false)}>Monthly</button><button className={'chip '+(yr?'on':'')} onClick={()=>setYr(true)}>Yearly, save 20%</button></div>
    <div className="grid gap-5 md:grid-cols-3 items-stretch">{P.map((p,i)=><article key={p[0]} className="glass p-7 flex flex-col rv" style={{transitionDelay:i*90+'ms',boxShadow:p[4]?'0 18px 50px rgba(245,179,1,.28)':undefined,border:p[4]?'2px solid #f5b301':undefined}}>
      <div className="flex items-center gap-2"><h3 className="text-2xl m-0">{p[0]}</h3>{p[4]&&<span className="tag">Most popular</span>}</div>
      <p className="text-sm mt-1" style={{color:'var(--mut)'}}>{p[2]}</p>
      <div className="dsp my-4"><span className="text-4xl font-extrabold">{p[1]===null?'Custom':p[1]===0?'Free':'Rs '+Math.round(p[1]*(yr?.8:1)).toLocaleString('en-IN')}</span>{p[1]>0&&<span style={{color:'var(--mut)'}}> per month</span>}</div>
      <ul className="m-0 p-0 list-none grid gap-2 text-[14px] flex-1">{p[3].map(x=><li key={x} className="flex gap-2"><span style={{color:'var(--ok)'}}>&#10003;</span>{x}</li>)}</ul>
      <button onClick={()=>onChoose(p[0])} className={'btn mt-6 '+(p[4]?'gold':'ghost')}>{p[1]===null?'Contact sales':p[1]===0?'Start free':'Choose Pro'}</button></article>)}</div>
    <p className="text-center text-xs mt-6" style={{color:'var(--mut)'}}>Demo pricing for the prototype. No payments are processed.</p>
  </div>
}

const HOW=[['Ingest','Doppler radar volumes, INSAT IR and visible grids, lightning strikes and GFS or WRF fields arrive on their own schedules and are checked for freshness.'],['Fuse','Every source is regridded to one common grid and time step, so radar, satellite, lightning and model data line up cell by cell.'],['Predict','The model returns storm probability for each city and each 15-minute step out to 180 minutes, with motion vectors for the strongest cells.'],['Alert','Probabilities above threshold become Watch, Warning or Severe alerts, exported as CAP v1.2 for district control rooms.']]
export function How(){
  return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{HOW.map((h,i)=><article key={h[0]} className="glass p-6 rv" style={{transitionDelay:i*80+'ms'}}>
    <span className="grid place-items-center rounded-full font-extrabold dsp mb-4" style={{width:40,height:40,background:'linear-gradient(135deg,#f5b301,#ff9d4d)',color:'#3a2600'}}>{i+1}</span>
    <h3 className="text-xl m-0 mb-2">{h[0]}</h3><p className="m-0 text-[14px]" style={{color:'var(--mut)',lineHeight:1.6}}>{h[1]}</p></article>)}</div>
}

const Q=[['How far ahead can Risora forecast?','Up to 180 minutes in 15-minute steps. Skill is highest in the first hour and decreases with lead time, and the dashboard shows POD, FAR and CSI for the lead time you select.'],['Which data sources does it use?','IMD Doppler weather radars, INSAT-3DR and INSAT-3DS satellite grids, a lightning detection network, and GFS or WRF model fields.'],['How do alerts reach people?','Each alert can be opened as a CAP v1.2 XML message and sent to any CAP-compatible gateway, such as a state or national alerting platform.'],['What do the motion arrows show?','The predicted movement of the strongest storm cells over the next 120 minutes, with speed and direction on hover.'],['Can I use my own data?','Yes. The backend has a single loader for each source, so you can point them at your own radar, satellite and lightning archives and retrain the model.']]
export function Faq(){
  return <div className="grid gap-3 max-w-3xl">{Q.map((q,i)=><details key={q[0]} className="glass px-6 py-4 rv" style={{borderRadius:18,transitionDelay:i*60+'ms'}}><summary className="flex justify-between gap-3 font-semibold dsp text-lg">{q[0]}<span style={{color:'var(--blue)'}}>+</span></summary><p className="mt-3 mb-0 text-[14.5px]" style={{color:'var(--mut)',lineHeight:1.65}}>{q[1]}</p></details>)}</div>
}

export function Footer(){
  return <footer className="mt-24 pb-10 text-center text-sm" style={{color:'var(--mut)'}}>
    <div className="dsp text-lg font-bold" style={{color:'var(--ink)'}}>Risora</div>
    <div className="mt-1">Built for Smart India Hackathon problem SIH26072.</div></footer>
}
