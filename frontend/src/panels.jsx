import {lab,rc} from './api'

export function Timeline({meta,f,setF,play,setPlay,peaks}){
  const t=meta.frames[f]
  return <div className="p-4 sm:p-5">
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <button className="btn" style={{padding:'8px 18px'}} onClick={()=>setPlay(!play)}>{play?'Pause':'Play forecast'}</button>
      <button className="chip" onClick={()=>{setPlay(false);setF(meta.now)}}>Jump to now</button>
      <h3 className="text-base ml-auto m-0 font-bold" style={{color:t>0?'#b4501b':'var(--blue)'}}>{t>0?'Forecast '+lab(t)+' ahead':t===0?'Latest observation':'Observed '+lab(t)}</h3>
    </div>
    <div className="flex items-end gap-[3px] h-14">
      {meta.frames.map((m,i)=>{const c=rc(peaks[i]||0);return <button key={i} title={lab(m)+': '+Math.round(peaks[i]||0)+' dBZ'} onClick={()=>{setPlay(false);setF(i)}} className="flex-1 rounded-md border-0 p-0 cursor-pointer" style={{height:Math.max(10,(peaks[i]||0)/70*100)+'%',background:c?`rgb(${c})`:'#cfd9f3',opacity:i<meta.now?.45:1,outline:i===f?'2px solid var(--ink)':'none',outlineOffset:2}}/>})}
    </div>
    <input type="range" min="0" max={meta.frames.length-1} value={f} onChange={e=>{setPlay(false);setF(+e.target.value)}} className="w-full mt-3" style={{accentColor:'#2f5bff'}} aria-label="Forecast time"/>
    <div className="flex justify-between text-xs" style={{color:'var(--mut)'}}><span>-60 min</span><span>Now</span><span>+90</span><span>+180 min, 15-min steps</span></div>
  </div>
}

export function Feeds({feeds}){
  const live=feeds.filter(s=>s.ok).length
  return <section className="glass p-5">
    <div className="flex items-center justify-between mb-3"><h3 className="text-lg m-0">Data feeds</h3><span className="tag g"><span className="live">&#9679;</span> {live} of {feeds.length} in sync</span></div>
    <ul className="grid gap-2.5 m-0 p-0 list-none">{feeds.map(s=><li key={s.name} className="flex items-center gap-3 text-[13px]">
      <span style={{width:9,height:9,borderRadius:9,background:s.ok?'var(--ok)':'var(--cor)',flex:'none'}}/>
      <span className="flex-1 min-w-0"><span className="font-semibold">{s.name}</span><span style={{color:'var(--mut)'}}> {s.kind}, every {s.cadence>=60?s.cadence/60+' h':s.cadence+' min'}</span></span>
      <span className="whitespace-nowrap font-medium" style={{color:s.ok?'var(--mut)':'var(--cor)'}}>{s.ok?s.latency+' min':'Lagging '+s.latency+' min'}</span></li>)}</ul>
  </section>
}

const col={Severe:'var(--cor)',Warning:'#d99000',Watch:'var(--blue)'}
export function Alerts({log,sent,send,total,onFocus,onCap,user}){
  return <section className="glass p-5">
    <div className="flex items-center justify-between mb-3"><h3 className="text-lg m-0">Alert dispatcher</h3><span className="tag b">{total} cities at risk in 3 h</span></div>
    <ul className="grid gap-2.5 m-0 p-0 list-none overflow-auto scr" style={{maxHeight:360}}>
      {log.length===0&&<li className="text-[13px]" style={{color:'var(--mut)'}}>Waiting for the first alert from the model.</li>}
      {log.map(e=>{const auto=e.level==='Severe'||sent[e.k];return <li key={e.k} role="button" tabIndex={0} onClick={()=>onFocus(e)} onKeyDown={x=>x.key==='Enter'&&onFocus(e)} title="Fly to the storm cell" className="rounded-2xl p-3.5 text-[13px] cursor-pointer" style={{background:'rgba(255,255,255,.78)',borderLeft:'4px solid '+col[e.level],boxShadow:e.level==='Severe'?'0 0 0 2px rgba(229,72,77,.25)':'none'}}>
        <div className="flex justify-between gap-2"><span className="font-bold" style={{color:col[e.level]}}>{e.level}: {e.city}</span><span style={{color:'var(--mut)'}}>{new Date(e.at*1000).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata'})}</span></div>
        <div className="mt-1">{e.prob}% chance of thunderstorm and lightning in {e.lead===0?'progress':e.lead+' min'}, peak {e.peak} dBZ.</div>
        <div className="mt-2 flex gap-2 flex-wrap items-center">
          <button className="chip" onClick={x=>{x.stopPropagation();onCap(e)}}>View CAP XML</button>
          {auto?<span className="tag g">Sent by {e.level==='Severe'&&!sent[e.k]?'auto-dispatch':user.name}</span>:<button className="chip on" onClick={x=>{x.stopPropagation();send(e.k)}}>Dispatch alert</button>}
          <span className="text-[11px] ml-auto" style={{color:'var(--mut)'}}>Tap card to locate</span></div></li>})}
    </ul>
  </section>
}

export function Skill({skill,t}){
  const lead=Math.max(0,t),k=[30,60,120,180].reduce((p,c)=>Math.abs(c-lead)<Math.abs(p-lead)?c:p),s=skill&&skill[k]
  const bar=(n,v,c)=><div className="flex items-center gap-2 text-xs mb-1.5"><span style={{width:34}} className="font-semibold">{n}</span><span className="flex-1 rounded-full" style={{background:'#e3eafb',height:9}}><span style={{display:'block',height:9,width:v*100+'%',background:c,borderRadius:9,transition:'width .5s'}}/></span><span style={{width:32,textAlign:'right'}}>{v.toFixed(2)}</span></div>
  return <section className="glass p-5">
    <h3 className="text-lg m-0 mb-2">Model and skill</h3>
    <p className="text-[13px] m-0 mb-3" style={{color:'var(--mut)',lineHeight:1.55}}>Radar, INSAT IR, lightning and NWP fields feed a gradient-boosted classifier that returns storm probability per city and lead time.</p>
    {s?<><div className="text-xs mb-2 font-semibold">Holdout skill at {k} min lead</div>{bar('POD',s.pod,'#12a374')}{bar('FAR',s.far,'#e5484d')}{bar('CSI',s.csi,'#2f5bff')}</>:<div className="text-xs">Loading skill scores.</div>}
    <p className="text-xs m-0 mt-2" style={{color:'var(--mut)'}}>Scores come from synthetic storms. Retrain with backend/train.py.</p>
  </section>
}
