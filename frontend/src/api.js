export const get=u=>fetch(u).then(r=>{if(!r.ok)throw new Error(u);return r.json()})
export const wsUrl=()=>(location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws/alerts'
export const lab=m=>m===0?'Now':m>0?'+'+m+'m':m+'m'
const RS=[[15,[60,180,255]],[25,[40,200,120]],[35,[250,220,60]],[45,[255,140,30]],[55,[240,50,50]],[65,[220,60,220]]]
export const rc=z=>{for(let i=RS.length-1;i>=0;i--)if(z>=RS[i][0])return RS[i][1];return null}
export const peaks=(fr,thr=38)=>{
  const a=fr.radar,n=a.length,o=[]
  for(let r=1;r<n-1;r++)for(let c=1;c<n-1;c++){
    const z=a[r][c];if(z<thr)continue
    let m=true
    for(let i=-1;i<=1&&m;i++)for(let j=-1;j<=1;j++)if((i||j)&&a[r+i][c+j]>z){m=false;break}
    if(m)o.push({lon:66+c/(n-1)*33,lat:38-r/(n-1)*33,z})
  }
  o.sort((x,y)=>y.z-x.z)
  return o.filter((p,i)=>o.slice(0,i).every(q=>Math.hypot(p.lon-q.lon,p.lat-q.lat)>1.2))
}
