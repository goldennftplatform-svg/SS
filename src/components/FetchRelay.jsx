import React,{useState,useEffect,useRef} from 'react'
import {openPark,kennels,toys,beds} from '../game/fetchPark.js'
import {audio} from '../audio/chiptune.js'

const names=['Maple','Pepper','Fern'],colors=['#ffe49c','#abe5ff','#ffbda9']
export default function FetchRelay({onQuit,onFinish}){
  const park=useRef(),finish=useRef(onFinish);finish.current=onFinish
  const game=useRef({jobs:[null,null,null],bank:new Set(),time:0,started:false,elapsed:0}).current
  const [dog,pick]=useState(0),[status,say]=useState('Opening the park…'),[,paint]=useState(0)
  useEffect(()=>{
    let active=true,id,last
    openPark().then(p=>{
      if(!active){p.close();return}park.current=p;say('Choose a dog, then a ball. Send all three out at once!')
      function frame(now){
        const dt=Math.min(.05,(now-(last??now))/1000);last=now
        if(game.started){
          game.time+=dt;p.step(dt)
          game.jobs.forEach((job,i)=>{
            if(!job)return
            const pos=p.agents[i].position(),[x,z]=job.back?kennels[i]:toys[job.toy]
            if(Math.hypot(pos.x-x,pos.z-z)>.85)return
            if(job.back){game.bank.add(job.toy);game.jobs[i]=null;audio.coin();say(`${names[i]} delivered ball ${job.toy+1}!`)}
            else{job.back=true;p.send(i,kennels[i]);say(`${names[i]} has ball ${job.toy+1} and is heading home.`)}
          })
          if(game.bank.size===6||game.time>=60){
            const count=game.bank.size,late=count<6,bonus=late?0:Math.max(0,Math.floor(60-game.time))
            finish.current({points:count*150+bonus*10,late,tip:bonus>=15?25:0,performance:count/6,mistakes:6-count,serviceLabel:`${count}/6 balls fetched · ${Math.ceil(game.time)}s`});return
          }
        }
        game.elapsed+=dt;if(game.elapsed>=1/30){game.elapsed=0;paint(v=>v+1)}
        id=requestAnimationFrame(frame)
      }
      id=requestAnimationFrame(frame)
    }).catch(()=>{if(active)say('The park could not open. Return to the map and try again.')})
    return()=>{active=false;cancelAnimationFrame(id);park.current?.close();park.current=null}
  },[game])
  const busy=n=>game.bank.has(n)||game.jobs.some(j=>j?.toy===n)
  function send(n){
    if(!park.current||busy(n)||game.jobs[dog])return
    if(!park.current.send(dog,toys[n]))return
    game.started=true;game.jobs[dog]={toy:n,back:false};audio.select()
    say(`${names[dog]} is fetching ball ${n+1}.`)
    const next=game.jobs.findIndex(j=>!j);if(next>=0)pick(next)
  }
  return <section className="mow-mode pack-walk"><header><button onClick={onQuit}>← Map</button><b>SCUPH · DOG PARK</b></header><main>
    <small>OFF-LEASH TEAM TRIAL</small><h1>Fetch Relay</h1>
    <div className="mow-stats"><b>🎾 {game.bank.size}/6 home</b><b>{Math.ceil(60-game.time)}s left</b></div>
    <svg viewBox="0 0 210 150" style={{display:'block',width:'min(100%,65vh)',margin:'auto',background:'#6b985b',borderRadius:10}} aria-label="Fenced fetch park">
      {beds.map(([x,z,w,h])=><g key={x}><rect x={10*x} y={10*z} width={10*w} height={10*h} rx="2" fill="#38583f" stroke="#e0bc88" strokeWidth="2"/><path d={`M${10*x+7} ${10*z+4}v${10*h-8}`} stroke="#70925d" strokeDasharray="4 3"/></g>)}
      <rect x="8" y="98" width="30" height="43" rx="8" fill="#c6aa77"/><text x="12" y="106" fontSize="6">HOME</text>
      {toys.map(([x,z],n)=>!busy(n)&&<g key={n} onClick={()=>send(n)} style={{cursor:'pointer'}}><circle cx={10*x} cy={10*z} r="8" fill="#ecfa71"/><text x={10*x} y={10*z+3} textAnchor="middle" fontSize="9">{n+1}</text></g>)}
      {kennels.map(([x,z],i)=>{const pos=park.current?.agents[i].position(),job=game.jobs[i];return <g key={i} transform={`translate(${10*(pos?.x??x)} ${10*(pos?.z??z)})`}>
        <ellipse rx="4.6" ry="4" fill={colors[i]} stroke={i===dog?'white':'#493f32'}/><path d="m-4-1-2-4 4 1m4 2 1-4-4 1" fill="#564432"/><text textAnchor="middle" y="2" fontSize="5">{names[i][0]}</text>{job?.back&&<circle cx="4" cy="2" r="2" fill="#ecfa71"/>}</g>})}
    </svg>
    <div>{names.map((name,i)=><button key={name} aria-pressed={dog===i} onClick={()=>pick(i)}>{dog===i?'▸ ':''}{name} · {game.jobs[i]?.back?'returning':game.jobs[i]?'fetching':'ready'}</button>)}</div>
    <div>{toys.map((_,i)=><button key={i} disabled={!park.current||busy(i)||!!game.jobs[dog]} onClick={()=>send(i)}>Ball {i+1}</button>)}</div>
    <p role="status">{status}</p><small>Bring all six home in 60s. Finish with 15s to spare for a tip.</small>
  </main></section>
}
