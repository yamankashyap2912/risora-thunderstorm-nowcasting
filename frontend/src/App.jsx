import {useEffect,useMemo,useState} from 'react'
import {get,wsUrl,peaks as findPeaks} from './api'
import MapView from './MapView'
import {Timeline,Feeds,Alerts,Skill,RiskTable,OperationalSummary,ModelStatus} from './panels'
import Chat from './Chat'
import {Features,Pricing,Footer,How,Faq} from './Sections'
import Login from './Login'
import CapModal from './CapModal'
import CrossSection from './CrossSection'

const NAV=[['dashboard','Dashboard'],['assistant','Assistant'],['how','How it works'],['features','Features'],['pricing','Pricing'],['faq','FAQ']]
function Sec({id,title,sub,children}){return <section id={id} className="mt-20 sm:mt-28"><div className="rv mb-8 max-w-3xl"><h2 className="text-3xl sm:text-4xl font-extrabold m-0">{title}</h2><p className="mt-2 text-[16px]" style={{color:'var(--mut)',lineHeight:1.6}}>{sub}</p></div>{children}</section>}

export default function App(){
  const [meta,setMeta]=useState(null),[frames,setFrames]=useState({}),[f,setF]=useState(6),[play,setPlay]=useState(true)
  const [lay,setLay]=useState({rad:true,sat:true,lit:true,zone:true,vec:true,risk:false}),[feeds,setFeeds]=useState([]),[log,setLog]=useState([]),[sent,setSent]=useState({})
  const [skill,setSkill]=useState(null),[alerts,setAlerts]=useState([]),[err,setErr]=useState(''),[clock,setClock]=useState(new Date()),[probe,setProbe]=useState(null)
  const [health,setHealth]=useState(null),[user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('risora_user'))}catch(e){return null}})
  const [cap,setCap]=useState(null),[showLogin,setShowLogin]=useState(false),[pending,setPending]=useState(null),[plan,setPlan]=useState(null),[focus,setFocus]=useState(null),[xs,setXs]=useState(false),[line,setLine]=useState(null),[act,setAct]=useState('dashboard'),[sy,setSy]=useState(0),[menu,setMenu]=useState(false),[cityFilter,setCityFilter]=useState('All'),[query,setQuery]=useState(''),[alertFilter,setAlertFilter]=useState('All'),[lastUpdate,setLastUpdate]=useState(Date.now())

  useEffect(()=>{
    get('/api/meta').then(m=>{setMeta(m);setF(m.now+2);return Promise.all(m.frames.map((_,i)=>get('/api/frame/'+i)))}).then(a=>{setFrames(Object.fromEntries(a.map((x,i)=>[i,x])));setLastUpdate(Date.now())}).catch(()=>setErr('Cannot reach the API. Start the backend with: uvicorn app.main:app --port 8000'))
    get('/api/skill').then(setSkill).catch(()=>{})
    get('/api/alerts').then(setAlerts).catch(()=>{})
    get('/api/health').then(setHealth).catch(()=>{})
  },[])
  useEffect(()=>{const load=()=>get('/api/feeds').then(x=>{setFeeds(x);setLastUpdate(Date.now())}).catch(()=>{});load();const id=setInterval(load,5000);return()=>clearInterval(id)},[])
  useEffect(()=>{let k=0,w;try{w=new WebSocket(wsUrl());w.onmessage=e=>{const d=JSON.parse(e.data);setLog(l=>[{...d,k:k++},...l].slice(0,30));setLastUpdate(Date.now())};w.onerror=()=>{}}catch(e){}return()=>w&&w.close()},[])
  useEffect(()=>{if(!play||!meta)return;const id=setInterval(()=>setF(x=>(x+1)%meta.frames.length),1500);return()=>clearInterval(id)},[play,meta])
  useEffect(()=>{const id=setInterval(()=>setClock(new Date()),1000);return()=>clearInterval(id)},[])
  useEffect(()=>{const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('in')),{threshold:.12});const t=setTimeout(()=>document.querySelectorAll('.rv').forEach(n=>io.observe(n)),50);const sc=()=>{setSy(window.scrollY);const p=NAV.map(([id])=>[id,document.getElementById(id)?.getBoundingClientRect().top??1e9]).filter(x=>x[1]<180).pop();setAct(p?p[0]:'dashboard')};window.addEventListener('scroll',sc,{passive:true});sc();return()=>{clearTimeout(t);io.disconnect();window.removeEventListener('scroll',sc)}},[])

  const fr=frames[f]
  const peaks=useMemo(()=>meta?meta.frames.map((_,i)=>frames[i]?Math.max(...frames[i].radar.map(r=>Math.max(...r))):0):[],[frames,meta])
  const vec=useMemo(()=>{if(!meta||!frames[f])return [];const j=Math.min(meta.frames.length-1,f+8),dt=meta.frames[j]-meta.frames[f];if(dt<45||!frames[j])return [];const p1=findPeaks(frames[j],34),out=[];findPeaks(frames[f],42).forEach(a=>{let b=null,d=4.5;p1.forEach(q=>{const k=Math.hypot(q.lon-a.lon,q.lat-a.lat);if(k<d){d=k;b=q}});if(b&&d>.3){const la=Math.cos(a.lat*Math.PI/180),brg=(Math.atan2((b.lon-a.lon)*la,b.lat-a.lat)*180/Math.PI+360)%360;out.push({a,b,kmh:Math.round(Math.hypot((b.lon-a.lon)*la,b.lat-a.lat)*111/(dt/60)),dir:['N','NE','E','SE','S','SW','W','NW'][Math.round(brg/45)%8]})}});return out},[frames,f,meta])
  const cityOf=n=>meta&&meta.cities.map(([name,lon,lat])=>({name,lon,lat})).find(c=>c.name===n)
  const focusAlert=e=>{if(!meta)return;const i=Math.max(0,Math.min(meta.frames.length-1,meta.now+Math.round(e.lead/15))),c=cityOf(e.city),fx=frames[i];let tgt={lat:c.lat,lon:c.lon,z:e.peak};if(fx){const n=findPeaks(fx,38).sort((p,q)=>Math.hypot(p.lon-c.lon,p.lat-c.lat)-Math.hypot(q.lon-c.lon,q.lat-c.lat))[0];if(n&&Math.hypot(n.lon-c.lon,n.lat-c.lat)<6)tgt=n}setPlay(false);setF(i);setFocus({...tgt,name:e.city,k:Date.now()});document.getElementById('map-anchor')?.scrollIntoView({behavior:'smooth',block:'center'})}
  const focusCity=c=>{setPlay(false);setF(meta?.now||4);setFocus({lat:c.lat,lon:c.lon,z:fr?.cities?.find(x=>x.name===c.name)?.prob*60||25,name:c.name,k:Date.now()});document.getElementById('map-anchor')?.scrollIntoView({behavior:'smooth',block:'center'})}
  const signOut=()=>{try{localStorage.removeItem('risora_user')}catch(e){};setUser(null)}
  const login=u=>{try{localStorage.setItem('risora_user',JSON.stringify(u))}catch(e){};setUser(u);setShowLogin(false);if(pending){setPlan(pending);setPending(null)}}
  const choosePlan=n=>{if(user)setPlan(n);else{setPending(n);setShowLogin(true)}}
  const toggleXs=()=>{setXs(!xs);setLine(null)}
  const tg=(k,n)=><button key={k} className={'chip '+(lay[k]?'on':'')} aria-pressed={lay[k]} onClick={()=>setLay({...lay,[k]:!lay[k]})}>{n}</button>
  const valid=meta&&new Date(clock.getTime()+meta.frames[f]*60000).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kolkata'})
  const ok=feeds.filter(s=>s.ok).length
  const currentCities=fr?.cities||[]
  const atRisk=currentCities.filter(c=>c.prob>=.6).length
  const maxProb=Math.max(0,...currentCities.map(c=>c.prob))
  const filteredCities=currentCities.filter(c=>(cityFilter==='All'||c.risk===cityFilter)&&c.name.toLowerCase().includes(query.toLowerCase()))
  const filteredLog=log.filter(e=>alertFilter==='All'||e.level===alertFilter)
  const exportReport=()=>{const payload={generatedAt:new Date().toISOString(),frameMinutes:fr?.t,model:health?.model_detail,feedStatus:{ok,total:feeds.filter(x=>x.ok).length},alerts,cityRisk:currentCities};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='risora-operational-report.json';a.click();URL.revokeObjectURL(a.href)}
  const stat=(v,l,c,extra='')=><div className="glass px-4 sm:px-5 py-4 min-w-0"><div className="dsp text-2xl sm:text-3xl font-extrabold" style={{color:c}}>{v}</div><div className="text-xs mt-0.5" style={{color:'var(--mut)'}}>{l}</div>{extra&&<div className="text-[10px] mt-1" style={{color:'var(--mut)'}}>{extra}</div>}</div>

  return <div>
    <div className="bg" aria-hidden="true"><div className="blob" style={{width:520,height:520,background:'#9ad0ff',left:'-8%',top:'-6%',transform:`translateY(${sy*.12}px)`}}/><div className="blob" style={{width:460,height:460,background:'#ffc9a3',right:'-6%',top:'18%',transform:`translateY(${-sy*.08}px)`}}/><div className="blob" style={{width:400,height:400,background:'#ffe08a',left:'30%',bottom:'-10%',transform:`translateY(${sy*.06}px)`}}/></div>
    <nav className="sticky top-0 z-[1000] px-3 pt-3"><div className="glass max-w-[1300px] mx-auto flex items-center gap-3 px-4 py-2.5" style={{borderRadius:18}}>
      <a href="#top" className="dsp text-xl font-extrabold no-underline flex items-center gap-2" style={{color:'var(--ink)'}}><span className="grid place-items-center rounded-lg text-white text-sm" style={{width:28,height:28,background:'linear-gradient(135deg,#2f5bff,#f5b301)'}}>R</span>Risora</a>
      <div className="hidden md:flex gap-1 ml-5">{NAV.map(([id,n])=><a key={id} href={'#'+id} className="no-underline px-3 py-1.5 rounded-full text-sm font-medium" style={{color:act===id?'#fff':'var(--mut)',background:act===id?'var(--blue)':'transparent'}}>{n}</a>)}</div>
      <span className="ml-auto text-sm dsp font-bold hidden lg:block">{clock.toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata'})} IST</span>
      <span className="status-pill hidden sm:inline-flex"><i/> {health?.status==='ok'?'System operational':'Connecting…'}</span>
      <a href="#pricing" className="btn gold no-underline hidden sm:block" style={{padding:'8px 15px',fontSize:14}}>Get access</a>
      {user?<button className="chip hidden sm:block" onClick={signOut}>{user.name}, sign out</button>:<button className="chip hidden sm:block" onClick={()=>setShowLogin(true)}>Sign in</button>}
      <button className="chip md:hidden" onClick={()=>setMenu(!menu)} aria-label="Menu">{menu?'Close':'Menu'}</button>
    </div>
    {menu&&<div className="glass max-w-[1300px] mx-auto mt-2 p-3 grid gap-1 md:hidden">{NAV.map(([id,n])=><a key={id} href={'#'+id} onClick={()=>setMenu(false)} className="no-underline px-3 py-2 rounded-xl font-medium" style={{color:'var(--ink)'}}>{n}</a>)}<button className="chip" onClick={()=>{setMenu(false);user?signOut():setShowLogin(true)}}>{user?'Sign out':'Sign in'}</button></div>}
    {plan&&<div className="glass max-w-[1300px] mx-auto mt-2 px-5 py-3 flex items-center gap-3 flex-wrap text-sm"><span className="tag g">Plan selected</span><span>{plan==='Enterprise'?'Our team will contact '+user.email+' about Enterprise.':'You are on the '+plan+' plan, '+user.name+'. This is a demo, so no payment is processed.'}</span><button className="chip ml-auto" onClick={()=>setPlan(null)}>Dismiss</button></div>}
    </nav>

    <main id="top" className="max-w-[1300px] mx-auto px-3 sm:px-5 pb-6">
      <header className="pt-12 sm:pt-20 grid lg:grid-cols-[1.15fr_1fr] gap-10 items-center">
        <div><span className="tag">SIH26072 • AI/ML thunderstorm + lightning nowcasting</span><h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.02] mt-5 mb-5">See the storm before it becomes a crisis.</h1><p className="text-lg max-w-xl m-0" style={{color:'var(--mut)',lineHeight:1.6}}>Risora fuses radar, INSAT satellite, lightning and atmospheric model signals into a continuously updated 15-minute operational picture.</p><div className="flex gap-3 mt-7 flex-wrap"><a href="#dashboard" className="btn no-underline">Open live dashboard</a><a href="#assistant" className="btn ghost no-underline">Ask the assistant</a></div><div className="mt-5 flex gap-2 flex-wrap"><span className="tag g">{ok}/{feeds.length||'—'} feeds healthy</span><span className="tag b">0–180 min horizon</span><span className="tag p">CAP-ready alerts</span></div></div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">{stat(atRisk,'regions currently above risk threshold','#e5484d','selected frame')}{stat(fr?fr.lightning.length:'—','lightning strikes in frame','#d99000','observed / simulated')}{stat(feeds.length?ok+'/'+feeds.length:'—','data feeds healthy','#12a374','auto-refreshed')}{stat('15 min','forecast step','#2f5bff','up to +180 min')}</div>
      </header>

      {err&&<div className="glass p-4 mt-8 text-sm" style={{borderColor:'var(--cor)'}}>{err}</div>}
      <div className="mt-8 glass px-4 py-3 flex flex-wrap gap-3 items-center text-xs"><span className="font-bold">Operational status</span><span className="tag g">Model: {health?.model_detail||'Loading'}</span><span className="tag">Updated {Math.max(0,Math.round((Date.now()-lastUpdate)/1000))}s ago</span><span className="tag b">Peak risk {Math.round(maxProb*100)}%</span><button className="chip ml-auto" onClick={exportReport}>Export operational report</button><a className="chip no-underline" href="/api/export.csv">Download alert CSV</a></div>

      <Sec id="dashboard" title="Live command center" sub="Explore multi-sensor layers, forecast evolution, risk concentration, feed health and operational alerts from one screen.">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div id="map-anchor" className="glass overflow-hidden rv">
            <div className="flex gap-2 flex-wrap p-4 items-center" style={{borderBottom:'1px solid var(--line)'}}>{tg('rad','Radar')}{tg('sat','Satellite IR')}{tg('lit','Lightning')}{tg('risk','Risk surface')}{tg('zone','Alert zones')}{tg('vec','Motion vectors')}<button className={'chip '+(xs?'on':'')} aria-pressed={xs} onClick={toggleXs}>Vertical profile</button><button className="chip" onClick={()=>setFocus({reset:true,k:Date.now()})}>Reset view</button><span className="ml-auto text-sm font-semibold" style={{color:'var(--mut)'}}>{fr?'Valid '+valid+' IST':'Loading frames'}</span></div>
            <MapView fr={fr} lay={lay} setProbe={setProbe} vec={vec} focus={focus} xs={xs} onLine={setLine}/>
            <div className="flex items-center gap-3 px-4 py-2.5 text-xs flex-wrap" style={{borderTop:'1px solid var(--line)',color:'var(--mut)'}}><span>{probe?probe.lat.toFixed(2)+'N '+probe.lon.toFixed(2)+'E':(xs?'Click two points on the map to draw a vertical profile line.':'Hover for coordinates • Click map to zoom')}</span><span className="ml-auto flex items-center gap-2">15<span style={{width:110,height:8,borderRadius:4,background:'linear-gradient(90deg,#3cb4ff,#28c878,#fadc3c,#ff8c1e,#f03232,#dc3cdc)'}}/>65 dBZ</span></div>
            {meta&&<div style={{borderTop:'1px solid var(--line)'}}><Timeline meta={meta} f={f} setF={setF} play={play} setPlay={setPlay} peaks={peaks}/></div>}
          </div>
          <div className="grid gap-5 content-start"><div className="rv"><OperationalSummary fr={fr} alerts={alerts}/></div><div className="rv"><Alerts log={filteredLog} sent={sent} send={async k=>{const e=log.find(x=>x.k===k);if(e){setSent({...sent,[k]:1});try{await fetch('/api/dispatch/'+encodeURIComponent(e.city),{method:'POST'})}catch(_){}}}} total={alerts.length} onFocus={focusAlert} onCap={setCap} user={user||{name:'Guest operator'}} filter={alertFilter} setFilter={setAlertFilter}/></div><div className="rv"><Feeds feeds={feeds}/></div><div className="rv"><Skill skill={skill} t={meta?meta.frames[f]:0}/></div><div className="rv"><ModelStatus health={health}/></div></div>
        </div>
      </Sec>

      <Sec id="risk" title="City and region risk explorer" sub="Search locations, filter by severity and jump directly to the corresponding forecast frame."><div className="glass p-4 sm:p-5 rv"><div className="flex flex-wrap gap-2 items-center mb-4"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search city or region…" className="search-input" aria-label="Search city"/><div className="flex gap-2 overflow-x-auto scr">{['All','Severe','Warning','Watch','Low'].map(x=><button key={x} className={'chip '+(cityFilter===x?'on':'')} onClick={()=>setCityFilter(x)}>{x}</button>)}</div></div><RiskTable cities={filteredCities} onFocus={focusCity}/></div></Sec>

      <Sec id="assistant" title="Ask Risora" sub="The assistant reads the same forecast frames, alerts, feed status and model skill visible above."><div className="max-w-3xl rv"><Chat ctx={{frames,meta,alerts,skill,feeds}}/></div></Sec>
      <Sec id="how" title="From raw sensors to a warning" sub="A clear operational chain from observation to action — with provenance and model limitations visible."><How/></Sec>
      <Sec id="features" title="Everything a forecaster needs" sub="Built for rapid interpretation, human-in-the-loop decisions and future integration with real atmospheric feeds."><Features/></Sec>
      <Sec id="pricing" title="Simple plans" sub="Prototype plans for local observers, district teams and larger operational deployments."><Pricing onChoose={choosePlan}/></Sec>
      <Sec id="faq" title="Questions, answered" sub="The questions evaluators and operational teams are most likely to ask."><Faq/></Sec>
      <Footer/>
      {showLogin&&<Login plan={pending} onLogin={login} onClose={()=>{setShowLogin(false);setPending(null)}}/>}
      {cap&&<CapModal e={cap} city={cityOf(cap.city)} onClose={()=>setCap(null)}/>} {xs&&line&&fr&&<CrossSection line={line} fr={fr} onClose={()=>{setLine(null);setXs(false)}}/>}
    </main>
  </div>
}
