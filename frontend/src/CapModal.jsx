import {useEffect,useState} from 'react'
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
const iso=d=>new Date(d.getTime()+19800000).toISOString().slice(0,19)+'+05:30'

export const buildCap=(e,c)=>{
  const sent=new Date(e.at*1000),onset=new Date(sent.getTime()+e.lead*60000),end=new Date(onset.getTime()+90*60000)
  const sev={Severe:'Severe',Warning:'Moderate',Watch:'Minor'}[e.level],id='RISORA-'+e.city.toUpperCase()+'-'+Math.floor(e.at)
  return `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>${esc(id)}</identifier>
  <sender>alerts@risora.in</sender>
  <sent>${iso(sent)}</sent>
  <status>Test</status>
  <msgType>Alert</msgType>
  <source>Risora Nowcasting Centre</source>
  <scope>Public</scope>
  <info>
    <language>en-IN</language>
    <category>Met</category>
    <event>Thunderstorm and Lightning</event>
    <responseType>Shelter</responseType>
    <urgency>${e.lead<=30?'Immediate':'Expected'}</urgency>
    <severity>${sev}</severity>
    <certainty>${e.prob>=70?'Likely':'Possible'}</certainty>
    <effective>${iso(sent)}</effective>
    <onset>${iso(onset)}</onset>
    <expires>${iso(end)}</expires>
    <senderName>Risora Nowcasting Centre</senderName>
    <headline>${esc(e.level+': thunderstorm and lightning likely near '+e.city)}</headline>
    <description>${esc(e.prob+'% probability of thunderstorm and lightning around '+e.city+' starting in about '+e.lead+' minutes, peak radar reflectivity '+e.peak+' dBZ.')}</description>
    <instruction>Move indoors or into a hard-topped vehicle. Avoid open fields, tall trees and water. Wait 30 minutes after the last thunder.</instruction>
    <parameter><valueName>ProbabilityPercent</valueName><value>${e.prob}</value></parameter>
    <parameter><valueName>PeakReflectivityDBZ</valueName><value>${e.peak}</value></parameter>
    <area>
      <areaDesc>${esc(e.city)} and surrounding district</areaDesc>
      <circle>${c?c.lat.toFixed(4)+','+c.lon.toFixed(4):'0,0'} 80.0</circle>
    </area>
  </info>
</alert>`
}

export default function CapModal({e,city,onClose}){
  const xml=buildCap(e,city),[cp,setCp]=useState(false)
  useEffect(()=>{const k=x=>x.key==='Escape'&&onClose();window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)},[])
  const dl=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([xml],{type:'application/xml'}));a.download='cap-'+e.city.toLowerCase()+'.xml';a.click()}
  return <div className="fixed inset-0 z-[1300] grid place-items-center p-4" style={{background:'rgba(18,32,74,.4)',backdropFilter:'blur(6px)'}} onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label="CAP alert XML" className="glass pop w-full max-w-3xl flex flex-col" style={{maxHeight:'88vh',background:'rgba(255,255,255,.9)'}} onClick={x=>x.stopPropagation()}>
      <div className="flex items-center gap-3 p-5" style={{borderBottom:'1px solid var(--line)'}}>
        <div><h3 className="text-xl m-0">CAP v1.2 payload</h3><div className="text-xs" style={{color:'var(--mut)'}}>{e.level}: {e.city}, ready for SACHET or any CAP-compatible gateway</div></div>
        <span className="tag ml-auto">Status: Test</span>
        <button className="chip" onClick={onClose} aria-label="Close">Close</button>
      </div>
      <pre className="m-0 p-5 overflow-auto scr text-[12.5px] leading-relaxed" style={{background:'#0f1b3d',color:'#d9e4ff',fontFamily:'ui-monospace,Menlo,Consolas,monospace',flex:1}}>{xml}</pre>
      <div className="p-4 flex gap-2 justify-end"><button className="btn ghost" onClick={()=>{navigator.clipboard&&navigator.clipboard.writeText(xml);setCp(true);setTimeout(()=>setCp(false),1500)}}>{cp?'Copied':'Copy XML'}</button><button className="btn" onClick={dl}>Download .xml</button></div>
    </div>
  </div>
}
