import React,{useEffect,useRef,useState} from 'react'
import {audio} from '../audio/chiptune.js'

const dogs=[
  {name:'Maple',coat:'#bc8251',pull:7,pace:3},
  {name:'Pepper',coat:'#4b5454',pull:12,pace:2.6},
  {name:'Waffles',coat:'#dfb56d',pull:16,pace:2.3},
  {name:'Fern',coat:'#ac6950',pull:10,pace:3.5},
]
// Coordinates are percentages across the path. More noses mean a wider
// formation; a recall closes the formation for one obstacle.
const trail=[
  ['puddle',74],['squirrel',24],['puddle',25],['bridge',64],
  ['squirrel',76],['bridge',35],['puddle',72],['squirrel',22],['bridge',67],
]
const icons={puddle:'💧',squirrel:'🐿️',bridge:'🌉'}
const lanes=[25,50,75]
function Pup({dog,x,y}){
  return <g transform={`translate(${x} ${y})`} aria-label={dog.name}>
    <ellipse cy="2" rx="4.4" ry="2.6" fill="#192f3440"/>
    <ellipse cy="-1" rx="2.9" ry="4.2" fill={dog.coat}/>
    <path d="M1 2q4 4 5 1" fill="none" stroke={dog.coat} strokeWidth="1.6" strokeLinecap="round"/>
    <rect x="-2.7" y="-4.4" width="5.4" height="1.5" rx=".5" fill="#efe499"/>
    <ellipse cy="-5" rx="3" ry="2.4" fill={dog.coat}/><path d="m-2-6-2-1 .2 3zm4 0 2-1-.2 3z" fill="#403936"/>
  </g>
}
export default function PackWalk({level,market,onFinish,onQuit}){
  const r=useRef({time:0,leg:0,elapsed:0,lane:1,x:[50],clear:0,heel:false,used:false,feedback:'',finished:false}).current
  const [started,start]=useState(false),[,paint]=useState(0)
  const finish=useRef(onFinish);finish.current=onFinish
  const duration=3.8-Math.min(.6,(level-1)*.07)-(r.x.length-1)*.14
  const draw=()=>paint(v=>v+1)
  const steer=delta=>{if(started&&!r.finished){r.lane=Math.max(0,Math.min(2,r.lane+delta));draw()}}
  const recall=()=>{if(started&&!r.finished&&!r.used){r.used=true;r.heel=true;r.until=r.time+1.4;audio.select();draw()}}
  useEffect(()=>{
    if(!started||r.finished)return
    const down=e=>{if(!['ArrowLeft','ArrowRight','a','d',' '].includes(e.key))return;e.preventDefault();if(e.repeat)return
      if(e.key===' ')recall();else steer(['ArrowLeft','a'].includes(e.key)?-1:1)}
    window.addEventListener('keydown',down);let prev=performance.now(),id
    const tick=now=>{
      const dt=Math.max(0,Math.min(.06,(now-prev)/1000));prev=now;r.time+=dt;r.elapsed+=dt
      const [kind,at]=trail[r.leg],lead=lanes[r.lane]
      r.heel=r.heel&&r.time<r.until
      r.x=r.x.map((x,i)=>{
        const spread=(i-(r.x.length-1)/2)*(r.heel?2:9)
        const tug=r.heel?0:kind==='squirrel'?Math.sign(at-lead)*dogs[i].pull:Math.sin(r.time*2+i)*dogs[i].pull*.24
        return x+(lead+spread+tug-x)*Math.min(1,dt*(r.heel?5:dogs[i].pace))
      })
      if(r.elapsed>=duration){
        const bad=r.x.findIndex(x=>kind==='bridge'?Math.abs(x-at)>17:Math.abs(x-at)<20)
        if(bad===-1){r.clear++;r.feedback=r.heel&&kind==='bridge'?'Tight formation! Every paw on the boards · +150 pts':'Clean pass · +150 pts';audio.coin()}
        else {r.feedback=`${dogs[bad].name} ${kind==='bridge'?'stepped off the boards':kind==='squirrel'?'chased a squirrel':'splashed a puddle'} · no points`;audio.hurt()}
        r.elapsed=0;r.leg++;r.used=false;r.heel=false
        if(r.leg===trail.length){
          r.finished=true;const late=r.clear<5
          finish.current({late,points:r.clear*150,mistakes:trail.length-r.clear,performance:r.clear/trail.length,
            serviceLabel:`${r.x.length} dogs walked · ${r.clear}/${trail.length} clean passes`,tip:r.clear>=8?25:0});return
        }
        if([2,4,6].includes(r.leg)){r.feedback+=` · ${dogs[r.x.length].name} joined!`;r.x.push(lead);audio.dog()}
      }
      draw();id=requestAnimationFrame(tick)
    }
    id=requestAnimationFrame(tick)
    return()=>{cancelAnimationFrame(id);window.removeEventListener('keydown',down)}
  },[started,r,duration])
  const [kind,at]=trail[Math.min(r.leg,trail.length-1)],dir=kind==='bridge'?(at<50?'LEFT':'RIGHT'):(at<50?'RIGHT':'LEFT')
  const y=8+59*Math.min(1,r.elapsed/duration)
  return <section className="mow-mode pack-walk"><header><button onClick={onQuit}>← Map</button><b>SCUPH · PACK WALK</b></header><main>
    <small>{market} / DOG WALKING</small><h1>Walk the whole pack.</h1>
    <div className="mow-stats"><b>🐾 {r.x.length}/4 dogs</b><b>{r.clear}/9 clean passes</b></div>
    <p className="pack-order">{!started?'Guide Maple home. Three friends join on the way.':`${icons[kind]} ${kind==='bridge'?'Narrow bridge':kind==='squirrel'?'Squirrel ahead':'Puddle ahead'} · move ${dir}`}</p>
    <svg className="pack-trail" viewBox="0 0 100 90" role="img" aria-label={`Trail with ${r.x.length} leashed dogs. ${kind} ahead.`}
      onPointerDown={e=>{if(!started||r.finished)return;const box=e.currentTarget.getBoundingClientRect();r.lane=Math.max(0,Math.min(2,Math.floor((e.clientX-box.left)/box.width*3)));draw()}}>
      <rect width="100" height="90" fill="#547452"/><path d="M9 0h82l5 90H4z" fill="#ad9670"/>
      {[17,50,82].map(x=><path key={x} d={`M${x} 0v90`} stroke="#ead7aa" strokeDasharray="1 5" opacity=".5"/>)}
      {kind==='bridge'?<g><rect y={y-4} width="100" height="8" fill="#53858a"/><rect x={at-17} y={y-5} width="34" height="10" fill="#745638"/>{[0,1,2,3,4].map(i=><path key={i} d={`M${at-16} ${y-4+i*2}h32`} stroke="#c4a57b"/>)}</g>:<g><ellipse cx={at} cy={y} rx="19" ry="5" fill={kind==='puddle'?'#487e85':'#a78355'}/><text x={at} y={y+2} textAnchor="middle" fontSize="9">{icons[kind]}</text></g>}
      {r.x.map((x,i)=><path key={i} d={`M${lanes[r.lane]} 80Q${(x+lanes[r.lane])/2} 78 ${x} 67`} fill="none" stroke={r.heel?'#ffdf80':'#443b30'} strokeWidth=".8"/>)}
      {r.x.map((x,i)=><Pup key={i} dog={dogs[i]} x={x} y={67+(i%2)*2}/>)}
      <circle cx={lanes[r.lane]} cy="81" r="4" fill="#244c46" stroke="#ead5a2"/>
      {r.heel&&<g pointerEvents="none"><ellipse cx={lanes[r.lane]} cy="68" rx={7+4*Math.sin((r.until-r.time)*4)**2} ry="7" fill="none" stroke="#fff0a4" strokeWidth=".9" strokeDasharray="2 1"/><text x={lanes[r.lane]} y="59" textAnchor="middle" fill="#20362c" fontSize="3.6" fontWeight="bold">AT HEEL</text></g>}
    </svg>
    <small>{dogs.slice(0,r.x.length).map(d=>d.name).join(' · ')}</small>
    <p role="status">{r.feedback||'Avoid puddles and squirrels. Fit every pup on the bridge.'}</p>
    {!started?<button onClick={()=>start(true)}>Leash up & walk →</button>:<div className="mow-pad"><button aria-label="Walk left" onClick={()=>steer(-1)}>←</button><button disabled={r.used} onClick={recall}>{r.heel?'Pack at heel':r.used?'Whistle resting':'📣 Heel!'}</button><button aria-label="Walk right" onClick={()=>steer(1)}>→</button></div>}
    <p>Tap a lane or steer with ← →. Space calls dogs close for 1.4s, once per obstacle. Clear 5 to finish; 8 earn the tip.</p>
  </main></section>
}
