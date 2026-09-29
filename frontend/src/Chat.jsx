import {useEffect,useRef,useState} from 'react'

const CHIPS=['Which cities are at risk?','When will Kolkata get a storm?','How many strikes right now?','How accurate is the model?','Are the data feeds healthy?','Lightning safety tips']

function reply(q,c){
  const s=q.toLowerCase(),{frames,meta,alerts,skill,feeds}=c
  const fut=meta?meta.frames.map((m,i)=>[m,frames[i]]).filter(x=>x[1]):[]
  const city=meta&&meta.cities.map(x=>x[0]).find(n=>s.includes(n.toLowerCase()))
  if(city&&fut.length){
    const rows=fut.filter(([m])=>m>=0).map(([m,f])=>[m,f.cities.find(x=>x.name===city).prob])
    const peak=rows.reduce((a,b)=>b[1]>a[1]?b:a),first=rows.find(r=>r[1]>=.6)
    if(!first)return `${city} stays low risk for the next 3 hours. The highest storm probability is ${Math.round(peak[1]*100)}% at +${peak[0]} min.`
    return `${city} is likely to get a thunderstorm. Probability first crosses 60% at +${first[0]} min and peaks at ${Math.round(peak[1]*100)}% around +${peak[0]} min. Move indoors before the ${first[0]} minute mark.`
  }
  if(/risk|alert|warn|which|cities/.test(s))return alerts.length?'Cities at risk in the next 3 hours: '+alerts.map(a=>`${a.city} (${a.level}, ${a.prob}% in ${a.lead} min)`).join('; ')+'.':'No city crosses the 60% alert threshold in the next 3 hours.'
  if(/strike|lightning now|flash/.test(s)){const f=frames[meta?meta.now:0];return f?`The latest frame has ${f.lightning.length} observed strikes. The forecast frames show predicted strike density as hollow rings.`:'Frames are still loading.'}
  if(/accura|skill|model|pod|far|csi|trust/.test(s))return skill?`On held-out synthetic storms the model scores POD ${skill[30].pod} and CSI ${skill[30].csi} at 30 min, and POD ${skill[120].pod} at 2 h. Skill drops with lead time, as expected. Retrain on IMD and INSAT archives before quoting real-world numbers.`:'Skill scores are loading.'
  if(/feed|data|radar|insat|lag|health|sync/.test(s)){const bad=feeds.filter(x=>!x.ok);return bad.length?`${feeds.length-bad.length} of ${feeds.length} feeds are in sync. Lagging now: ${bad.map(x=>x.name+' ('+x.latency+' min)').join(', ')}.`:`All ${feeds.length} feeds are in sync.`}
  if(/safe|tip|do|shelter|lightning/.test(s))return 'When thunder is audible, go into a building or a hard-topped vehicle. Stay away from open fields, tall trees and water, and wait 30 minutes after the last thunder before going back out.'
  if(/price|plan|cost/.test(s))return 'Plans are Community (free), Pro and Enterprise. Open the Pricing section below for details.'
  if(/hi|hello|hey/.test(s))return 'Hello. Ask me about city risk, lead times, strike counts, data feeds or model skill.'
  return 'I can answer questions about city risk, lead times, strikes, feed health and model skill. Try one of the suggestions.'
}

export default function Chat({ctx}){
  const [msgs,setMsgs]=useState([{r:'bot',t:'Hi, I am the Risora assistant. I read the same forecast frames, alerts and feed status as the dashboard. What would you like to know?'}]),[q,setQ]=useState(''),[busy,setBusy]=useState(false),end=useRef()
  useEffect(()=>{end.current&&end.current.parentNode.scrollTo({top:end.current.offsetTop,behavior:'smooth'})},[msgs,busy])
  const ask=t=>{if(!t.trim()||busy)return;setMsgs(m=>[...m,{r:'me',t}]);setQ('');setBusy(true);setTimeout(()=>{setMsgs(m=>[...m,{r:'bot',t:reply(t,ctx)}]);setBusy(false)},650)}
  return <div className="glass flex flex-col overflow-hidden" style={{height:520}}>
    <div className="px-5 py-4 flex items-center gap-3" style={{borderBottom:'1px solid var(--line)'}}>
      <span className="grid place-items-center rounded-full font-bold text-white" style={{width:36,height:36,background:'linear-gradient(135deg,#2f5bff,#f5b301)'}}>G</span>
      <div><div className="font-bold">Risora assistant</div><div className="text-xs" style={{color:'var(--mut)'}}>Answers from live dashboard data</div></div><span className="tag ml-auto">Beta</span>
    </div>
    <div className="flex-1 overflow-auto scr p-5 grid gap-3 content-start">
      {msgs.map((m,i)=><div key={i} className={'max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed '+(m.r==='me'?'justify-self-end text-white':'')} style={m.r==='me'?{background:'linear-gradient(135deg,#2f5bff,#5b7dff)'}:{background:'rgba(255,255,255,.85)'}}>{m.t}</div>)}
      {busy&&<div className="rounded-2xl px-4 py-3 justify-self-start" style={{background:'rgba(255,255,255,.85)'}}><span className="dot"/><span className="dot" style={{animationDelay:'.15s'}}/><span className="dot" style={{animationDelay:'.3s'}}/></div>}
      <span ref={end}/>
    </div>
    <div className="px-4 pt-2 flex gap-2 overflow-x-auto scr">{CHIPS.map(c=><button key={c} className="chip whitespace-nowrap" onClick={()=>ask(c)}>{c}</button>)}</div>
    <div className="p-4 flex gap-2"><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&ask(q)} placeholder="Ask about a city, lead time or model skill" aria-label="Message" className="flex-1 rounded-xl px-4 py-2.5 text-sm border-0" style={{background:'rgba(255,255,255,.85)',border:'1px solid var(--line)'}}/><button className="btn" onClick={()=>ask(q)}>Send</button></div>
  </div>
}
