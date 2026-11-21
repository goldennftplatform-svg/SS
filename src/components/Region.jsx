import React,{useRef,useState} from 'react'
import {cities,roads,count,open,owned,neighbors,dividend,flyerCost} from '../game/region.js'
import './region.css'
import colors from '../data/palette.json'
import Install from './Install.jsx'

const missions={yard:'Yard refresh',route:'Bike route',urgent:'Rush cleanup'}
// Bisect the atlas between towns to draw adjoining claimable districts.
function district(c){
  let p=[[0,0],[1040,0],[1040,646],[0,646]]
  for(const d of cities.filter(d=>d!==c)){
    const side=([x,y])=>(x-(c.x+d.x)/2)*(d.x-c.x)+(y-(c.y+d.y)/2)*(d.y-c.y)
    p=p.flatMap((a,i)=>{const b=p[(i+1)%p.length],u=side(a),v=side(b)
      return [...(u<=0?[a]:[]),...(u*v<0?[[a[0]+(b[0]-a[0])*u/(u-v),a[1]+(b[1]-a[1])*u/(u-v)]]:[])]})
  }return p.map(v=>v.join(',')).join(' ')
}
const polygons=cities.map(district)
export default function Region({save,id,select,onJob,onFlyer,onHQ}){
  const [zoom,setZoom]=useState(1),box=useRef(null),c=cities[id],available=open(save,id),claimed=owned(save,id)
  const branches=cities.filter(n=>owned(save,n.id))
  function locate(n){select(n.id);const el=box.current;if(el)el.scrollTo({left:el.scrollWidth*n.x/1040-el.clientWidth/2,top:el.scrollHeight*n.y/646-el.clientHeight/2,behavior:'smooth'})}
  React.useEffect(()=>{const el=box.current;if(el){el.scrollLeft=el.scrollWidth*c.x/1040-el.clientWidth/2;el.scrollTop=el.scrollHeight*c.y/646-el.clientHeight/2}},[zoom])
  return <main className="atlas" style={Object.fromEntries(Object.entries(colors).map(([k,v])=>[`--${k}`,v]))}><header><div><small><span className="brand-pip"/> SCŪPH SAFARI　 /　 CAMPAIGN 01</small><h1>South Sound <em>takeover.</em></h1></div><div className="atlas-actions"><Install/><button onClick={onHQ}>Crew & HQ ↗</button></div></header>
    <section className="atlas-layout"><div className="map-shell"><div className="map-tools"><b>WASHINGTON　·　FIELD ATLAS</b><button aria-label="Zoom out" disabled={zoom<=1} onClick={()=>setZoom(zoom-.5)}>−</button><button aria-label="Zoom in" disabled={zoom>=2} onClick={()=>setZoom(zoom+.5)}>+</button></div>
    <div className="map-scroll" ref={box}><svg viewBox="0 0 1040 646" style={{width:`${zoom*100}%`,minWidth:740*zoom}} aria-label="Interactive South Sound territory map">
    <defs><pattern id="pines" width="34" height="28" patternUnits="userSpaceOnUse"><path d="m8 16 5-8 5 8m-8-1 3-4 2 3" fill="none" stroke="var(--mist)" opacity=".25"/></pattern>
    <pattern id="water" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="var(--fjord)"/><circle cx="4" cy="4" r="1" fill="#57759a"/></pattern></defs>
    <rect width="1040" height="646" fill="var(--terrain)"/>
    {cities.map(n=><polygon key={n.id} points={polygons[n.id]} className={owned(save,n.id)?'district owned':open(save,n.id)?'district available':'district'} onClick={()=>select(n.id)}/>)}
    <path d="M0 0H458L402 79 419 116 389 162 404 202 352 263 330 237 346 190 310 208 280 274 237 263 251 211 216 239 181 324 135 355 157 392 108 458 81 439 117 373 93 370 53 456 62 520 36 573 27 548 29 489 0 510Z" fill="url(#water)" stroke="#51678e" strokeWidth="2"/>
    <path d="M1040 300 995 330 942 390 855 423 802 475 687 512 566 646h474Z" fill="url(#pines)"/>
    <text x="98" y="148" transform="rotate(-22 98 148)" className="geo-label">PUGET SOUND</text>
    <text x="730" y="544" className="geo-label">CASCADE FOOTHILLS</text>
    {roads.map(([a,b])=><path key={`${a}-${b}`} d={`M${cities[a].x} ${cities[a].y}L${cities[b].x} ${cities[b].y}`} stroke={owned(save,a)||owned(save,b)?'var(--mint)':'#71809e'} strokeWidth="2.5" strokeDasharray={owned(save,a)||owned(save,b)?undefined:'4 5'} />)}
    {cities.map(n=><g key={n.id} className="town-pin" tabIndex="0" role="button" aria-label={`${n.name}, ${owned(save,n.id)?'branch':open(save,n.id)?'available':'locked'}`} onClick={()=>select(n.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(n.id)}}}>
      <circle cx={n.x} cy={n.y} r="21" fill="transparent"/>{id===n.id&&<circle cx={n.x} cy={n.y} r="17" fill="none" stroke="var(--iris)" strokeWidth="3"/>}
      <circle cx={n.x} cy={n.y} r="10" fill={owned(save,n.id)?'var(--mint)':open(save,n.id)?'var(--lime)':'var(--mist)'} stroke="var(--midnight)" strokeWidth="3"/>
      <text x={n.x} y={n.y+4} textAnchor="middle" fill="var(--midnight)" fontSize="12">{owned(save,n.id)?'⚑':n.id===19?'★':'•'}</text>
      <text x={n.x} y={n.y+32} textAnchor="middle" className="town-label">{n.name}</text></g>)}
    </svg></div><footer><span>● Open market</span><span>⚑ Your branch</span><span>• Unreached</span><span>◎ Selected</span></footer></div>
    <aside><small>REGIONAL LEDGER</small><div className="ledger"><b>{branches.length}/{cities.length} branches</b><b>{save.coins} coins</b></div><p>{owned(save,19)?'★ Olympia secured! Fill the remaining districts to own the whole region.':'Campaign goal: plant your flag in Olympia.'}</p>
    <hr/><small>{claimed?'ESTABLISHED BRANCH':available?'DISPATCH BOARD':'UNREACHED MARKET'}</small><h2>{c.name}</h2><i>{c.hood}</i><p>{count(save,id)} / {c.goal} regular customers</p><progress value={count(save,id)} max={c.goal}/>
    {available?<><p>{claimed?`Your network pays ${dividend(save)} bonus coins per completed job.`:`Win ${c.goal-count(save,id)} more to plant a flag. Do the work to earn one regular per star; match local demand for one extra.`}</p>
    {Object.entries(missions).sort(([a],[b])=>Number(b===c.special)-Number(a===c.special)).map(([type,label])=><button key={type} onClick={()=>onJob(type)}>{label}{type===c.special?' · Local demand +1':''} →</button>)}
    {!claimed&&id!==0&&<button disabled={save.coins<flyerCost} onClick={onFlyer}>Send flyers · {flyerCost} coins / +1 regular</button>}</>:<p>Establish a branch in a connected city to enter this market.</p>}
    <hr/><small>CONNECTING ROADS</small><div className="road-links">{neighbors(id).map(i=><button key={i} onClick={()=>locate(cities[i])}>{cities[i].name} ↗</button>)}</div></aside></section></main>
}
