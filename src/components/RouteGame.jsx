import React, { useEffect, useRef, useState } from 'react'
import { BlockArt } from './BlockArt.jsx'
import CharacterSprite from './CharacterSprite.jsx'
import { characterById } from '../game/engine.js'
import { audio } from '../audio/chiptune.js'

const LENGTH = 75
const GAPS = [14, 36, 59]
const PAWS = [-.7, .7, 0]
const CONES = [{ at: 24, lane: 0 }, { at: 47, lane: -.75 }, { at: 68, lane: .75 }]
const lift = t => t > 0 && t < .95 ? 4 * (t/.95) * (1-t/.95) : 0
const clamp = v => Math.max(-1, Math.min(1,v))
const progress = d => `${d / LENGTH * 100}%`

export default function RouteGame({ market, characterId, urgency, upgrades, level, record, onFinish, onQuit }) {
  const char = characterById(characterId)
  const speed = (urgency ? 6.4 : 5.2) + Math.min(1.8,(level-1)*.08 + (upgrades.bike || 0)*.22)
  const run = useRef({ distance:0, x:0, t:0, jump:-10, gaps:0, badges:0, mistakes:0, gapIndex:0, coneIndex:0, message:'' }).current
  const keys = useRef({})
  const [started, start] = useState(false)
  const [, frame] = useState(0)
  const finish = useRef(onFinish); finish.current = onFinish
  const hop = () => { if (started && run.t-run.jump > 1.15) run.jump=run.t }
  useEffect(() => {
    if (!started) return
    const key = (e, down) => {
      const k = e.key.toLowerCase()
      if (!['arrowleft','arrowright','a','d',' '].includes(k)) return
      e.preventDefault()
      if (k === ' ' && down && !e.repeat && run.t-run.jump > 1.15) run.jump=run.t
      keys.current[k]=down
    }
    const down=e=>key(e,true), up=e=>key(e,false), blur=()=>{keys.current={}}
    window.addEventListener('keydown',down); window.addEventListener('keyup',up); window.addEventListener('blur',blur)
    let last=performance.now()
    const id=setInterval(()=>{
      const now=performance.now(), dt=Math.min(.06,(now-last)/1000); last=now
      run.t+=dt
      const k=keys.current
      run.x=clamp(run.x+((k.arrowright||k.d?1:0)-(k.arrowleft||k.a?1:0))*dt*2.5)
      run.distance+=dt*speed
      const height=lift(run.t-run.jump)
      if (run.distance>=GAPS[run.gapIndex]) {
        const lane=PAWS[run.gapIndex++]
        if (height>.35) {
          run.gaps++
          const paw=height>.65 && Math.abs(lane-run.x)<.28
          if (paw) run.badges++
          run.message=paw?'Brass paw! +125 ride points':'Gap cleared! +75 ride points'
          audio.coin()
        } else { run.mistakes++; run.message='Clipped the gap · jump a little earlier'; audio.hurt() }
        run.messageUntil=run.t+1.1
      }
      const cone=CONES[run.coneIndex]
      if (cone && run.distance>=cone.at) {
        run.coneIndex++
        if (Math.abs(run.x-cone.lane)<.32 && height<.35) {run.mistakes++;run.message='Cone hit · steer or hop';run.messageUntil=run.t+1;audio.hurt()}
      }
      if (run.distance>=LENGTH) {
        clearInterval(id)
        finish.current({ points:run.gaps*75+run.badges*50, gaps:run.gaps, badges:run.badges, mistakes:run.mistakes })
      } else frame(v=>v+1)
    },16)
    return ()=>{clearInterval(id);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur)}
  },[started,run,speed])
  const depth = at => 1-(at-run.distance)/30
  const project = (at,lane) => {
    const p=depth(at)**2
    return {left:`${50+lane*(6+20*p)}%`,top:`${30+58*p}%`,transform:`translate(-50%,-100%) scale(${.3+.9*p})`}
  }
  const visible=at=>depth(at)>=0 && depth(at)<=1
  const gap=GAPS[run.gapIndex], eta=(gap-run.distance)/speed
  const side=['left','right','center'][run.gapIndex]
  const district=Math.min(2,Math.floor(run.distance/25))
  return <div className={`ride-game block-${district} ${urgency?'urgent':''}`}>
    <div className="ride-hud"><button className="hud-quit" onClick={onQuit}>← Map</button><strong>{market}</strong><span className="ride-hud-right">🚲 Ride → 🧹 Service</span></div>
    <div className="ride-minimap"><div className="ride-mini-track">
      <i className="ride-mini-fill" style={{width:progress(run.distance)}}/>
      {GAPS.map(at=><span key={at} className="ride-mini-house" style={{left:progress(at)}}>∧</span>)}
      <span className="ride-mini-house" style={{left:'98%'}}>🏡</span><b className="ride-mini-bike" style={{left:progress(run.distance)}}>🚲</b>
    </div></div>
    <div className="stop-order"><small>SCUPH DISPATCH · LEG 1/2 · {['Cedar Row','Market Steps','Sound View'][district]}</small>
      <strong>{!started?'Ride to the customer’s gate':eta<=.76 && eta>0?'Jump now!':gap?`Gap ahead · bonus paw ${side}`:'Customer’s gate ahead'}</strong>
      <span>{!started?'Park at the house, then clean on foot. Steer with A/D or arrows; Space jumps.':`Ride: ${run.gaps*75+run.badges*50} pts · 75 per gap + 50 per paw`}{record>0 && ` · Job best ${record}`}</span></div>
    <div className="ride-viewport"><div className="ride-sky"/><div className="ride-sun"/><div className="ride-hills"/>
      <div className="district-props">{[0,1,2,3,4].map(i=><BlockArt key={i} kind={['pine','market','lighthouse'][district]}/>)}</div>
      <svg className="ride-road" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M41 30h18l37 70H4z" fill="#40574f" stroke="#31453b" strokeWidth=".7"/>
        {Array.from({length:8},(_,i)=>Math.ceil(run.distance/4)*4+i*4).filter(visible).map(at=>{const p=depth(at)**2;return <path key={at} d={`M50 ${30+58*p}v${1+2*p}`} stroke="#fff1cd" strokeWidth={.3+p}/>})}
        {GAPS.filter(visible).map(at=>{const p=depth(at)**2,w=9+31*p;return <g key={at}><path d={`M${50-w} ${30+58*p}h${2*w}`} stroke="#1b282e" strokeWidth={1+3*p}/><path d={`M${50-w} ${31+58*p}h${2*w}`} stroke="#fed171" strokeWidth=".8" strokeDasharray="3 1"/></g>})}
      </svg>
      {GAPS.map((at,i)=>visible(at)&&<div key={at} className="brass-paw" style={project(at,PAWS[i])}><b>🐾</b></div>)}
      {CONES.map(c=>visible(c.at)&&<div key={c.at} className="ride-hazard cone" style={project(c.at,c.lane)}><BlockArt kind="cone"/></div>)}
      {visible(LENGTH)&&<div className="ride-house" style={project(LENGTH,.7)}><BlockArt kind="house" className="cedar-house"/><small>CLIENT GATE</small></div>}
      <div className="ride-player" style={{left:`${50+26*run.x}%`,transform:`translate(-50%,${-85*lift(run.t-run.jump)}%)`}}><CharacterSprite character={char} pose="ride"/></div>
      {run.messageUntil>run.t&&<div className="ride-banner">{run.message}</div>}
      <div className="ride-controls">{!started?<button className="ride-scoop" onClick={()=>start(true)}>🚲 Pedal to {market} →</button>:<>
        {['left','jump','right'].map(dir=>dir==='jump'?<button key={dir} className={`ride-jump ${eta<=.76&&eta>0?'lit':''}`} onClick={hop}>↑ Jump</button>:<button key={dir} aria-label={`Steer ${dir}`} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);keys.current['arrow'+dir]=true}} onLostPointerCapture={()=>{keys.current['arrow'+dir]=false}}>{dir==='left'?'◀':'▶'}</button>)}
      </>}</div>
    </div>
  </div>
}
