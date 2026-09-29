import {useState} from 'react'
const ROLES=['Forecaster','District officer','Administrator']
export default function Login({onLogin,onClose,plan}){
  const [mode,setMode]=useState('in'),[name,setName]=useState(''),[email,setEmail]=useState('forecaster@risora.in'),[pw,setPw]=useState('risora123'),[role,setRole]=useState(ROLES[0]),[err,setErr]=useState('')
  const go=e=>{
    e.preventDefault()
    if(!/^\S+@\S+\.\S+$/.test(email))return setErr('Enter a valid email address.')
    if(pw.length<6)return setErr('Password must be at least 6 characters.')
    if(mode==='up'&&!name.trim())return setErr('Enter your name.')
    onLogin({name:mode==='up'?name.trim():email.split('@')[0].replace(/[._]/g,' '),email,role})
  }
  const inp={background:'rgba(255,255,255,.9)',border:'1px solid var(--line)'}
  return <div className="fixed inset-0 z-[1400] overflow-auto" style={{background:'rgba(255,248,243,.82)',backdropFilter:'blur(14px)'}} onClick={onClose}><div className="min-h-full grid lg:grid-cols-2 items-center gap-8 p-5 max-w-[1200px] mx-auto" onClick={e=>e.stopPropagation()}>
    <div className="hidden lg:block pr-10">
      <span className="tag">Smart India Hackathon, SIH26072</span>
      <h1 className="text-6xl font-extrabold leading-[1.02] mt-5 mb-5">Risora</h1>
      <p className="text-xl m-0 mb-8" style={{color:'var(--mut)',lineHeight:1.6}}>Operational thunderstorm and lightning nowcasting for disaster-response teams.</p>
      {['Radar, INSAT, lightning and model data on one live map','Forecast frames every 15 minutes up to 3 hours ahead','One-click CAP v1.2 alerts for district control rooms'].map(t=><div key={t} className="flex gap-3 mb-3 items-start"><span className="grid place-items-center rounded-full text-white text-xs shrink-0" style={{width:22,height:22,background:'var(--blue)'}}>&#10003;</span><span>{t}</span></div>)}
    </div>
    <div className="glass p-7 sm:p-9 w-full max-w-md justify-self-center pop relative" role="dialog" aria-modal="true" aria-label="Sign in">
      <button className="chip absolute" style={{right:16,top:16}} onClick={onClose}>Close</button>
      {plan&&<span className="tag mb-3">Sign in to get the {plan} plan</span>}
      <div className="dsp text-2xl font-extrabold lg:hidden mb-4">Risora</div>
      <h2 className="text-3xl font-extrabold m-0">{mode==='in'?'Welcome back':'Create your account'}</h2>
      <p className="mt-1 mb-6 text-sm" style={{color:'var(--mut)'}}>{mode==='in'?'Sign in to open the command center.':'Set up access for your team.'}</p>
      <form onSubmit={go} className="grid gap-3.5">
        {mode==='up'&&<label className="grid gap-1 text-sm font-semibold">Full name<input value={name} onChange={e=>setName(e.target.value)} className="rounded-xl px-4 py-2.5 font-normal" style={inp} autoComplete="name"/></label>}
        <label className="grid gap-1 text-sm font-semibold">Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="rounded-xl px-4 py-2.5 font-normal" style={inp} autoComplete="email"/></label>
        <label className="grid gap-1 text-sm font-semibold">Password<input type="password" value={pw} onChange={e=>setPw(e.target.value)} className="rounded-xl px-4 py-2.5 font-normal" style={inp} autoComplete="current-password"/></label>
        <label className="grid gap-1 text-sm font-semibold">Role<select value={role} onChange={e=>setRole(e.target.value)} className="rounded-xl px-4 py-2.5 font-normal" style={inp}>{ROLES.map(r=><option key={r}>{r}</option>)}</select></label>
        {err&&<div className="text-sm" role="alert" style={{color:'var(--cor)'}}>{err}</div>}
        <button className="btn mt-1" type="submit">{mode==='in'?'Sign in':'Create account'}</button>
        <button className="btn ghost" type="button" onClick={()=>onLogin({name:'Demo Forecaster',email:'demo@risora.in',role:'Forecaster'})}>Continue with demo account</button>
      </form>
      <p className="text-sm text-center mt-5 mb-0" style={{color:'var(--mut)'}}>{mode==='in'?'New to Risora? ':'Already have an account? '}<button className="border-0 bg-transparent font-semibold cursor-pointer" style={{color:'var(--blue)'}} onClick={()=>{setMode(mode==='in'?'up':'in');setErr('')}}>{mode==='in'?'Create an account':'Sign in'}</button></p>
    </div>
  </div></div>
}
