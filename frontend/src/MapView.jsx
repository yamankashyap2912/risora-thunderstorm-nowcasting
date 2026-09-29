import {useEffect,useRef} from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {rc} from './api'

const arrow=(g,a,b,kmh,dir)=>{
  L.polyline([[a.lat,a.lon],[b.lat,b.lon]],{color:'#12204a',weight:2.5,opacity:.6}).bindTooltip('Moving '+kmh+' km/h toward '+dir+' over 120 min',{sticky:true}).addTo(g)
  const la=Math.cos(b.lat*Math.PI/180),ang=Math.atan2(b.lat-a.lat,(b.lon-a.lon)*la),p=s=>[b.lat+.4*Math.sin(ang+s),b.lon+.4*Math.cos(ang+s)/la]
  L.polygon([[b.lat,b.lon],p(2.6),p(-2.6)],{color:'#12204a',weight:1,opacity:.6,fillColor:'#12204a',fillOpacity:.65}).addTo(g)
}

const S=440
const my=l=>Math.log(Math.tan(Math.PI/4+l*Math.PI/360))
const bil=(a,r,c)=>{const n=a.length,r0=Math.max(0,Math.min(n-1,Math.floor(r))),c0=Math.max(0,Math.min(n-1,Math.floor(c))),r1=Math.min(n-1,r0+1),c1=Math.min(n-1,c0+1),fr=r-r0,fc=c-c0
  return a[r0][c0]*(1-fr)*(1-fc)+a[r0][c1]*(1-fr)*fc+a[r1][c0]*fr*(1-fc)+a[r1][c1]*fr*fc}

function paint(cv,fr,lay,b){
  const [,,y0,y1]=b,g=cv.getContext('2d'),img=g.createImageData(S,S),n=fr.radar.length,ya=my(y1),yb=my(y0)
  for(let py=0;py<S;py++){
    const lat=(2*Math.atan(Math.exp(ya-(py+.5)/S*(ya-yb)))-Math.PI/2)*180/Math.PI,r=(y1-lat)/(y1-y0)*(n-1)
    for(let px=0;px<S;px++){
      const c=px/S*(n-1),o=(py*S+px)*4
      let R=0,G=0,B=0,A=0
      if(lay.sat){const s=Math.min(1,Math.max(0,(285-bil(fr.sat,r,c))/85));if(s>.04){R=70+140*s;G=95+120*s;B=215+30*s;A=175*Math.pow(s,.9)}}
      if(lay.rad){const z=bil(fr.radar,r,c),k=rc(z);if(k){const a=Math.min(1,(z-13)/8)*225;R=(R*(255-a)+k[0]*a)/255;G=(G*(255-a)+k[1]*a)/255;B=(B*(255-a)+k[2]*a)/255;A=Math.max(A,a)}}
      img.data[o]=R;img.data[o+1]=G;img.data[o+2]=B;img.data[o+3]=A
    }
  }
  g.putImageData(img,0,0)
}

export default function MapView({fr,lay,setProbe,vec,focus,xs,onLine}){
  const el=useRef(),st=useRef({}),cv=useRef(document.createElement('canvas'))
  useEffect(()=>{
    cv.current.width=cv.current.height=S
    const bd=[[5,66],[38,99]],m=L.map(el.current,{zoomControl:true,scrollWheelZoom:false,minZoom:4,maxZoom:10,zoomSnap:.25})
    m.fitBounds(bd)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(m)
    st.current={m,ov:null,risk:L.layerGroup().addTo(m),lit:L.layerGroup().addTo(m),vl:L.layerGroup().addTo(m),cit:L.layerGroup().addTo(m),tg:L.layerGroup().addTo(m),xl:L.layerGroup().addTo(m)}
    m.on('mousemove',e=>setProbe&&setProbe({lat:e.latlng.lat,lon:e.latlng.lng}))
    m.on('click',()=>m.scrollWheelZoom.enable())
    return()=>m.remove()
  },[])
  useEffect(()=>{
    if(!fr)return
    const s=st.current
    paint(cv.current,fr,lay,[66,99,5,38])
    const url=cv.current.toDataURL()
    if(s.ov)s.ov.setUrl(url);else s.ov=L.imageOverlay(url,[[5,66],[38,99]],{opacity:.92,interactive:false}).addTo(s.m)
    s.lit.clearLayers();s.cit.clearLayers();s.vl.clearLayers();s.risk.clearLayers()
    if(lay.vec&&vec)vec.forEach(v=>arrow(s.vl,v.a,v.b,v.kmh,v.dir))
    if(lay.risk) fr.cities.filter(c=>c.prob>=.4).forEach(c=>{const p=c.prob;const col=p>=.85?'#e5484d':p>=.7?'#ff9d1f':'#6a8bff';L.circle([c.lat,c.lon],{radius:45000+90000*p,color:col,weight:1.5,opacity:.45,fillColor:col,fillOpacity:.08}).bindTooltip(`${c.name} modeled risk ${Math.round(p*100)}%`,{sticky:true}).addTo(s.risk)})
    if(lay.lit)fr.lightning.forEach(([lo,la])=>L.circleMarker([la,lo],{radius:fr.t>0?5:3.5,color:'#12204a',weight:1,fillColor:'#f5b301',fillOpacity:fr.t>0?.15:1}).addTo(s.lit))
    fr.cities.forEach(c=>{
      const col=c.prob>=.7?'#e5484d':c.prob>=.4?'#f5b301':'#2f5bff'
      L.circleMarker([c.lat,c.lon],{radius:6,color:'#fff',weight:2,fillColor:col,fillOpacity:1}).bindTooltip(c.name+' '+Math.round(c.prob*100)+'%',{permanent:true,direction:'right',offset:[8,0],className:'cl'}).addTo(s.cit)
      if(lay.zone&&c.prob>=.6)L.circle([c.lat,c.lon],{radius:80000,color:'#e5484d',dashArray:'6 5',weight:2,fillColor:'#e5484d',fillOpacity:.08}).addTo(s.cit)
    })
  },[fr,lay,vec])
  useEffect(()=>{
    const s=st.current;if(!s.m||!focus)return
    s.tg.clearLayers()
    if(focus.reset){s.m.flyToBounds([[5,66],[38,99]],{duration:1.4});return}
    s.m.flyTo([focus.lat,focus.lon],8,{duration:2})
    L.circle([focus.lat,focus.lon],{radius:55000,color:'#e5484d',weight:3,fillColor:'#e5484d',fillOpacity:.15,className:'pulse-ring'}).bindTooltip('Storm cell near '+focus.name+', '+Math.round(focus.z)+' dBZ',{direction:'top'}).addTo(s.tg)
    L.circleMarker([focus.lat,focus.lon],{radius:6,color:'#fff',weight:2,fillColor:'#e5484d',fillOpacity:1}).addTo(s.tg)
  },[focus])
  useEffect(()=>{
    const s=st.current,m=s.m;if(!m)return
    const box=m.getContainer();box.style.cursor=xs?'crosshair':''
    s.p0=null;s.xl.clearLayers()
    if(!xs)return
    const dot=ll=>L.circleMarker(ll,{radius:5,color:'#fff',weight:2,fillColor:'#2f5bff',fillOpacity:1}).addTo(s.xl)
    const click=e=>{
      if(!s.p0){s.xl.clearLayers();s.p0=e.latlng;dot(e.latlng);s.rb=L.polyline([e.latlng,e.latlng],{color:'#2f5bff',weight:3,dashArray:'8 6'}).addTo(s.xl)}
      else{const a=s.p0,b=e.latlng;s.p0=null;s.rb.setLatLngs([a,b]).setStyle({dashArray:null});dot(b);onLine([[a.lat,a.lng],[b.lat,b.lng]])}
    }
    const move=e=>{if(s.p0&&s.rb)s.rb.setLatLngs([s.p0,e.latlng])}
    m.on('click',click);m.on('mousemove',move)
    return()=>{m.off('click',click);m.off('mousemove',move);box.style.cursor=''}
  },[xs])
  return <div ref={el} className="w-full" style={{height:'min(68vh,620px)',minHeight:340}} role="application" aria-label="Multi-sensor weather map"/>
}
