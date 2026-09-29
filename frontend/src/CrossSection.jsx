import {rc} from './api'
const km=(a,b)=>{const d=Math.PI/180,x=Math.sin((b[0]-a[0])*d/2)**2+Math.cos(a[0]*d)*Math.cos(b[0]*d)*Math.sin((b[1]-a[1])*d/2)**2;return 2*6371*Math.asin(Math.sqrt(x))}
const top=z=>z<15?0:2.5+(z-15)/50*12
const cape=z=>Math.round(400+55*Math.max(0,z-8))

export default function CrossSection({line,fr,onClose}){
  const [a,b]=line,N=64,n=fr.radar.length,len=km(a,b)
  const S=[...Array(N)].map((_,i)=>{const u=i/(N-1),la=a[0]+(b[0]-a[0])*u,lo=a[1]+(b[1]-a[1])*u,r=Math.round((38-la)/33*(n-1)),c=Math.round((lo-66)/33*(n-1));return r<0||c<0||r>=n||c>=n?8:fr.radar[r][c]})
  const zm=Math.max(...S),im=S.indexOf(zm),X0=64,X1=740,Y0=270,W=(X1-X0)/N,y=h=>Y0-h/16*240
  const w=Math.round(zm>=35?zm*.55:zm*.25),shear=Math.round(14+zm*.28),conv=zm>=30
  const tile=(t,v,c)=><div className="rounded-2xl px-4 py-2.5" style={{background:'rgba(255,255,255,.8)'}}><div className="text-xs" style={{color:'var(--mut)'}}>{t}</div><div className="dsp text-xl font-extrabold" style={{color:c}}>{v}</div></div>
  return <div className="fixed left-0 right-0 bottom-0 z-[1200] px-3 sm:px-6 pb-3" style={{paddingBottom:'max(12px,env(safe-area-inset-bottom))'}}>
    <div className="glass drawer max-w-[1100px] mx-auto p-4 sm:p-5 overflow-auto scr" style={{maxHeight:'72vh',background:'rgba(255,255,255,.82)'}}>
      <div className="flex items-center gap-3 mb-3 flex-wrap"><h3 className="text-xl m-0">Vertical wind profile</h3><span className="tag b">{len.toFixed(0)} km section</span><span className="tag">{fr.t>0?'+':''}{fr.t} min frame</span><button className="chip ml-auto" onClick={onClose}>Close</button></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">{tile('Peak CAPE',cape(zm)+' J/kg','#b4501b')}{tile('Updraft core',conv?w+' m/s':'None','#d99000')}{tile('Echo top',top(zm).toFixed(1)+' km','var(--blue)')}{tile('0-6 km shear',shear+' kt','var(--ok)')}</div>
      <svg viewBox="0 0 760 310" className="w-full h-auto" role="img" aria-label="Simulated vertical cross-section of the storm along the drawn line">
        <rect x={X0} y={y(16)} width={X1-X0} height={y(0)-y(16)} fill="#eef4ff" rx="10"/>
        {[4,8,12,16].map(h=><g key={h}><line x1={X0} x2={X1} y1={y(h)} y2={y(h)} stroke="#c9d7f5" strokeWidth="1"/><text x={X0-8} y={y(h)+4} textAnchor="end" fontSize="11" fill="#5b6b94">{h} km</text></g>)}
        <text x={X0-8} y={y(0)+4} textAnchor="end" fontSize="11" fill="#5b6b94">0</text>
        {S.map((z,i)=>z>=15&&<g key={i}><rect x={X0+i*W} y={y(top(z))} width={W+.6} height={y(0)-y(top(z))} fill={`rgb(${rc(z)})`} opacity=".82"/><rect x={X0+i*W} y={y(top(z))} width={W+.6} height={(y(0)-y(top(z)))*.35} fill="#fff" opacity=".28"/></g>)}
        {S.map((z,i)=>z>=42&&<ellipse key={'u'+i} cx={X0+(i+.5)*W} cy={y(top(z)*.5)} rx={W*1.8} ry={(y(0)-y(top(z)))*.3} fill="rgba(245,179,1,.55)" stroke="#b4501b" strokeWidth="1.2"/>)}
        {conv&&<text x={Math.min(X1-130,Math.max(X0+4,X0+im*W-60))} y={y(top(zm))-8} fontSize="12" fontWeight="700" fill="#b4501b">Updraft core {w} m/s, CAPE {cape(zm)}</text>}
        <line x1={X0} x2={X1} y1={y(4.8)} y2={y(4.8)} stroke="#2f5bff" strokeDasharray="6 5"/><text x={X1-4} y={y(4.8)-5} textAnchor="end" fontSize="11" fill="#2f5bff">0 C, 4.8 km</text>
        <line x1={X0} x2={X1} y1={y(9.2)} y2={y(9.2)} stroke="#7a5cff" strokeDasharray="6 5"/><text x={X1-4} y={y(9.2)-5} textAnchor="end" fontSize="11" fill="#7a5cff">-20 C, 9.2 km</text>
        {[1,3,5,7,9,11,13].map(h=>{const L=8+h*1.9,th=200+h*7;return <g key={h} transform={`translate(${14},${y(h)}) rotate(${th})`}><line x1="0" y1="0" x2={L} y2="0" stroke="#12204a" strokeWidth="2"/><polygon points={`${L},0 ${L-6},-3.5 ${L-6},3.5`} fill="#12204a"/></g>})}
        <text x="4" y="14" fontSize="11" fill="#5b6b94">Wind</text>
        {[0,.5,1].map(u=><text key={u} x={X0+u*(X1-X0)} y={Y0+22} textAnchor={u===0?'start':u===1?'end':'middle'} fontSize="11" fill="#5b6b94">{Math.round(len*u)} km</text>)}
        <text x={X0} y={Y0+42} fontSize="11.5" fill="#5b6b94">West end of line: {a[0].toFixed(2)}N {a[1].toFixed(2)}E</text><text x={X1} y={Y0+42} textAnchor="end" fontSize="11.5" fill="#5b6b94">{b[0].toFixed(2)}N {b[1].toFixed(2)}E</text>
      </svg>
      <p className="text-xs m-0 mt-1" style={{color:'var(--mut)'}}>{conv?'Convective core found along the line.':'No significant convection along this line. Draw across a storm cell for a stronger profile.'} Profile is derived from the forecast reflectivity along the line.</p>
    </div>
  </div>
}
