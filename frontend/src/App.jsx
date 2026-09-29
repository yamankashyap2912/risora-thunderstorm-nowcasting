import {useEffect,useMemo,useState} from 'react'
import {get,wsUrl,peaks as findPeaks} from './api'
import MapView from './MapView'
import {Timeline,Feeds,Alerts,Skill} from './panels'
import Chat from './Chat'
import {Features,Pricing,Footer,How,Faq} from './Sections'
import Login from './Login'
import CapModal from './CapModal'
import CrossSection from './CrossSection'

const NAV=[['dashboard','Dashboard'],['assistant','Assistant'],['how','How it works'],['features','Features'],['pricing','Pricing'],['faq','FAQ']]

function Sec({id,title,sub,children}){
  return <section id={id} className="mt-20 sm:mt-28"><div className="rv mb-8 max-w-2xl"><h2 className="text-3xl sm:text-4xl font-extrabold m-0">{title}</h2><p className="mt-2 text-[16px]" style={{color:'var(--mut)',lineHeight:1.6}}>{sub}</p></div>{children}</section>
}

export default function App(){
  const [meta,setMeta]=useState(null),[frames,setFrames]=useState({}),[f,setF]=useState(6),[play,setPlay]=useState(true)
  const [lay,setLay]=useState({rad:true,sat:true,lit:true,zone:true,vec:true}),[feeds,setFeeds]=useState([]),[log,setLog]=useState([]),[sent,setSent]=useState({})
  const [skill,setSkill]=useState(null),[alerts,setAlerts]=useState([]),[err,setErr]=useState(''),[clock,setClock]=useState(new Date()),[probe,setProbe]=useState(null)
  const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('risora_user'))}catch(e){return null}}),[cap,setCap]=useState(null),[showLogin,setShowLogin]=useState(false),[pending,setPending]=useState(null),[plan,setPlan]=useState(null),[focus,setFocus]=useState(null),[xs,setXs]=useState(false),[line,setLine]=useState(null),[act,setAct]=useState('dashboard'),[sy,setSy]=useState(0),[menu,setMenu]=useState(false)

  useEffect(()=>{
    get('/api/meta').then(m=>{setMeta(m);setF(m.now+2);return Promise.all(m.frames.map((_,i)=>get('/api/frame/'+i)))}).then(a=>setFrames(Object.fromEntries(a.map((x,i)=>[i,x])))).catch(()=>setErr('Cannot reach the API. Start the backend with: uvicorn app.main:app --port 8000'))
    get('/api/skill').then(setSkill).catch(()=>{})
    get('/api/alerts').then(setAlerts).catch(()=>{})
  },[])
  useEffect(()=>{const id=setInterval(()=>get('/api/feeds').then(setFeeds).catch(()=>{}),2500);get('/api/feeds').then(setFeeds).catch(()=>{});return()=>clearInterval(id)},[])
  useEffect(()=>{let k=0,w;try{w=new WebSocket(wsUrl());w.onmessage=e=>{const d=JSON.parse(e.data);setLog(l=>[{...d,k:k++},...l].slice(0,25))}}catch(e){}return()=>w&&w.close()},[])
  useEffect(()=>{if(!play||!meta)return;const id=setInterval(()=>setF(x=>(x+1)%meta.frames.length),1000);return()=>clearInterval(id)},[play,meta])
  useEffect(()=>{const id=setInterval(()=>setClock(new Date()),1000);return()=>clearInterval(id)},[])
  useEffect(()=>{
    const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('in')),{threshold:.12})
    const t=setTimeout(()=>document.querySelectorAll('.rv').forEach(n=>io.observe(n)),50)
    const sc=()=>{setSy(window.scrollY);const p=NAV.map(([id])=>[id,document.getElementById(id)?.getBoundingClientRect().top??1e9]).filter(x=>x[1]<180).pop();setAct(p?p[0]:'dashboard')}
    window.addEventListener('scroll',sc,{passive:true});sc()
    return()=>{clearTimeout(t);io.disconnect();window.removeEventListener('scroll',sc)}
  },[meta,user])

  const fr=frames[f]
  const peaks=useMemo(()=>meta?meta.frames.map((_,i)=>frames[i]?Math.max(...frames[i].radar.map(r=>Math.max(...r))):0):[],[frames,meta])
  const vec=useMemo(()=>{
    if(!meta||!frames[f])return []
    const j=Math.min(meta.frames.length-1,f+8),dt=meta.frames[j]-meta.frames[f]
    if(dt<45||!frames[j])return []
    const p1=findPeaks(frames[j],34),out=[]
    findPeaks(frames[f],42).forEach(a=>{
      let b=null,d=4.5
      p1.forEach(q=>{const k=Math.hypot(q.lon-a.lon,q.lat-a.lat);if(k<d){d=k;b=q}})
      if(b&&d>.3){const la=Math.cos(a.lat*Math.PI/180),brg=(Math.atan2((b.lon-a.lon)*la,b.lat-a.lat)*180/Math.PI+360)%360
        out.push({a,b,kmh:Math.round(Math.hypot((b.lon-a.lon)*la,b.lat-a.lat)*111/(dt/60)),dir:['N','NE','E','SE','S','SW','W','NW'][Math.round(brg/45)%8]})}
    })
    return out
  },[frames,f,meta])
  const cityOf=n=>meta&&meta.cities.map(([name,lon,lat])=>({name,lon,lat})).find(c=>c.name===n)
  const focusAlert=e=>{
    if(!meta)return
    const i=Math.max(0,Math.min(meta.frames.length-1,meta.now+Math.round(e.lead/15))),c=cityOf(e.city),fx=frames[i]
    let tgt={lat:c.lat,lon:c.lon,z:e.peak}
    if(fx){const n=findPeaks(fx,38).sort((p,q)=>Math.hypot(p.lon-c.lon,p.lat-c.lat)-Math.hypot(q.lon-c.lon,q.lat-c.lat))[0];if(n&&Math.hypot(n.lon-c.lon,n.lat-c.lat)<6)tgt=n}
    setPlay(false);setF(i);setFocus({...tgt,name:e.city,k:Date.now()})
    document.getElementById('map-anchor')?.scrollIntoView({behavior:'smooth',block:'center'})
  }
  const signOut=()=>{try{localStorage.removeItem('risora_user')}catch(e){};setUser(null)}
  const login=u=>{try{localStorage.setItem('risora_user',JSON.stringify(u))}catch(e){};setUser(u);setShowLogin(false);if(pending){setPlan(pending);setPending(null)}}
  const choosePlan=n=>{if(user)setPlan(n);else{setPending(n);setShowLogin(true)}}
  const toggleXs=()=>{setXs(!xs);setLine(null)}
  const tg=(k,n)=><button key={k} className={'chip '+(lay[k]?'on':'')} aria-pressed={lay[k]} onClick={()=>setLay({...lay,[k]:!lay[k]})}>{n}</button>
  const valid=meta&&new Date(clock.getTime()+meta.frames[f]*60000).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kolkata'})
  const ok=feeds.filter(s=>s.ok).length
  const stat=(v,l,c)=><div className="glass px-5 py-4 min-w-[140px]"><div className="dsp text-3xl font-extrabold" style={{color:c}}>{v}</div><div className="text-xs mt-0.5" style={{color:'var(--mut)'}}>{l}</div></div>

  return <div>
    <div className="bg" aria-hidden="true">
      <div className="blob" style={{width:520,height:520,background:'#9ad0ff',left:'-8%',top:'-6%',transform:`translateY(${sy*.12}px)`}}/>
      <div className="blob" style={{width:460,height:460,background:'#ffc9a3',right:'-6%',top:'18%',transform:`translateY(${-sy*.08}px)`}}/>
      <div className="blob" style={{width:400,height:400,background:'#ffe08a',left:'30%',bottom:'-10%',transform:`translateY(${sy*.06}px)`}}/>
    </div>
    <nav className="sticky top-0 z-[1000] px-3 pt-3"><div className="glass max-w-[1300px] mx-auto flex items-center gap-3 px-4 py-2.5" style={{borderRadius:18}}>
      <a href="#top" className="dsp text-xl font-extrabold no-underline flex items-center gap-2" style={{color:'var(--ink)'}}><span className="grid place-items-center rounded-lg text-white text-sm" style={{width:28,height:28,background:'linear-gradient(135deg,#2f5bff,#f5b301)'}}>G</span>Risora</a>
      <div className="hidden md:flex gap-1 ml-6">{NAV.map(([id,n])=><a key={id} href={'#'+id} className="no-underline px-3.5 py-1.5 rounded-full text-sm font-medium" style={{color:act===id?'#fff':'var(--mut)',background:act===id?'var(--blue)':'transparent'}}>{n}</a>)}</div>
      <span className="ml-auto text-sm dsp font-bold hidden sm:block">{clock.toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata'})} IST</span>
      <a href="#pricing" className="btn gold no-underline hidden sm:block" style={{padding:'8px 16px',fontSize:14}}>Get access</a>
      {user?<button className="chip hidden sm:block" onClick={signOut} title={user.role}>{user.name}, sign out</button>:<button className="chip hidden sm:block" onClick={()=>setShowLogin(true)}>Sign in</button>}
      <button className="chip md:hidden" onClick={()=>setMenu(!menu)} aria-label="Menu">{menu?'Close':'Menu'}</button>
    </div>
    {menu&&<div className="glass max-w-[1300px] mx-auto mt-2 p-3 grid gap-1 md:hidden">{NAV.map(([id,n])=><a key={id} href={'#'+id} onClick={()=>setMenu(false)} className="no-underline px-3 py-2 rounded-xl font-medium" style={{color:'var(--ink)'}}>{n}</a>)}<button className="chip" onClick={()=>{setMenu(false);user?signOut():setShowLogin(true)}}>{user?'Sign out':'Sign in'}</button></div>}
    {plan&&<div className="glass max-w-[1300px] mx-auto mt-2 px-5 py-3 flex items-center gap-3 flex-wrap text-sm"><span className="tag g">Plan selected</span><span>{plan==='Enterprise'?'Our team will contact '+user.email+' about Enterprise.':'You are on the '+plan+' plan, '+user.name+'. This is a demo, so no payment is processed.'}</span><button className="chip ml-auto" onClick={()=>setPlan(null)}>Dismiss</button></div>}
    </nav>

    <main id="top" className="max-w-[1300px] mx-auto px-3 sm:px-5 pb-6">
      <header className="pt-14 sm:pt-20 grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
        <div><span className="tag">SIH26072 thunderstorm and lightning nowcasting</span>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.02] mt-5 mb-5">See the storm three hours before it lands.</h1>
          <p className="text-lg max-w-xl m-0" style={{color:'var(--mut)',lineHeight:1.6}}>Risora fuses radar, INSAT satellite, lightning and model data into 15-minute forecasts and alerts for every district in India.</p>
          <div className="flex gap-3 mt-7 flex-wrap"><a href="#dashboard" className="btn no-underline">Open live dashboard</a><a href="#assistant" className="btn ghost no-underline">Ask the assistant</a></div></div>
        <div className="grid grid-cols-2 gap-4">{stat(alerts.length,'cities at risk in 3 hours','#e5484d')}{stat(fr?fr.lightning.length:'-','lightning strikes in this frame','#d99000')}{stat(feeds.length?ok+'/'+feeds.length:'-','data feeds in sync','#12a374')}{stat('15 min','forecast step, up to 180 min','#2f5bff')}</div>
      </header>

      {err&&<div className="glass p-4 mt-8 text-sm" style={{borderColor:'var(--cor)'}}>{err}</div>}

      <Sec id="dashboard" title="Live command center" sub="Toggle layers, scrub the timeline and watch alerts arrive as the model updates.">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div id="map-anchor" className="glass overflow-hidden rv">
            <div className="flex gap-2 flex-wrap p-4 items-center" style={{borderBottom:'1px solid var(--line)'}}>{tg('rad','Radar')}{tg('sat','Satellite IR')}{tg('lit','Lightning')}{tg('zone','Alert zones')}{tg('vec','Motion vectors')}<button className={'chip '+(xs?'on':'')} aria-pressed={xs} onClick={toggleXs}>Vertical wind profile</button><button className="chip" onClick={()=>setFocus({reset:true,k:Date.now()})}>Reset view</button>
              <span className="ml-auto text-sm font-semibold" style={{color:'var(--mut)'}}>{fr?'Valid '+valid+' IST':'Loading frames'}</span></div>
            <MapView fr={fr} lay={lay} setProbe={setProbe} vec={vec} focus={focus} xs={xs} onLine={setLine}/>
            <div className="flex items-center gap-3 px-4 py-2.5 text-xs flex-wrap" style={{borderTop:'1px solid var(--line)',color:'var(--mut)'}}>
              <span>{probe?probe.lat.toFixed(2)+'N '+probe.lon.toFixed(2)+'E':(xs?'Click two points on the map to draw a cross-section line.':'Hover for coordinates. Click the map to enable scroll zoom.')}</span>
              <span className="ml-auto flex items-center gap-2">15<span style={{width:110,height:8,borderRadius:4,background:'linear-gradient(90deg,#3cb4ff,#28c878,#fadc3c,#ff8c1e,#f03232,#dc3cdc)'}}/>65 dBZ</span></div>
            {meta&&<div style={{borderTop:'1px solid var(--line)'}}><Timeline meta={meta} f={f} setF={setF} play={play} setPlay={setPlay} peaks={peaks}/></div>}
          </div>
          <div className="grid gap-5 content-start"><div className="rv"><Alerts log={log} sent={sent} send={k=>setSent({...sent,[k]:1})} total={alerts.length} onFocus={focusAlert} onCap={setCap} user={user||{name:'Guest operator'}}/></div><div className="rv"><Feeds feeds={feeds}/></div><div className="rv"><Skill skill={skill} t={meta?meta.frames[f]:0}/></div></div>
        </div>
      </Sec>

      <Sec id="assistant" title="Ask Risora" sub="A demo assistant that answers from the same forecast frames, alerts and feed status you see above."><div className="max-w-3xl rv"><Chat ctx={{frames,meta,alerts,skill,feeds}}/></div></Sec>
      <Sec id="how" title="From raw sensors to a warning" sub="Four steps that run every few minutes, so forecasters see one consistent picture."><How/></Sec>
      <Sec id="features" title="Everything a forecaster needs" sub="Built around the four data sources in the problem statement, with the lead time and uncertainty visible."><Features/></Sec>
      <Sec id="pricing" title="Simple plans" sub="Start free and move up when your district team needs the full 3-hour window and alert dispatch."><Pricing onChoose={choosePlan}/></Sec>
      <Sec id="faq" title="Questions, answered" sub="What evaluators and district teams ask most."><Faq/></Sec>
      <Footer/>
      {showLogin&&<Login plan={pending} onLogin={login} onClose={()=>{setShowLogin(false);setPending(null)}}/>}
      {cap&&<CapModal e={cap} city={cityOf(cap.city)} onClose={()=>setCap(null)}/>}
      {xs&&line&&fr&&<CrossSection line={line} fr={fr} onClose={()=>{setLine(null);setXs(false)}}/>}
    </main>
  </div>
}
