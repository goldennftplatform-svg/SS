import React, { useEffect, useRef, useState } from 'react'
import { rideRenderer } from '../game/rideRenderer.js'
import { characterById } from '../game/engine.js'
import { audio } from '../audio/chiptune.js'

const LENGTH = 75
const GAPS = [14, 36, 59]
const PAWS = [-.7, .7, 0]
// Work fences can't be jumped. Each leaves one full bike-width open.
const FENCES = [{ at: 8, side: 1 }, { at: 24, side: 1 }, { at: 30, side: -1 }, { at: 47, side: -1 }, { at: 52, side: 1 }, { at: 68, side: -1 }]
const lift = t => t > 0 && t < .95 ? 4 * (t/.95) * (1-t/.95) : 0
const clamp = v => Math.max(-1, Math.min(1,v))
const progress = d => `${d / LENGTH * 100}%`

export default function RouteGame({ market, characterId, urgency, upgrades, level, record, mower, onFinish, onQuit }) {
  const char = characterById(characterId)
  const speed = (urgency ? 6.4 : 5.2) + Math.min(1.8,(level-1)*.08 + (upgrades.bike || 0)*.22)
  const opening = urgency ? .55 : .45
  const clearance = urgency ? .74 : .60
  const run = useRef({ distance:0, x:0, t:0, jump:-10, gaps:0, badges:0, mistakes:0, gapIndex:0, coneIndex:0, message:'',cells:2,assistUntil:0,bonus:0 }).current
  const assist=()=>{if(started && run.cells>0 && run.t>=run.assistUntil){run.cells--;run.assistUntil=run.t+2}}
  const keys = useRef({})
  const [started, start] = useState(false)
  const [, frame] = useState(0)
  const canvas=useRef(null), painter=useRef(null)
  useEffect(()=>{
    const draw=rideRenderer(canvas.current,{night:urgency,gaps:GAPS,paws:PAWS,fences:FENCES,opening,length:LENGTH,lift,jersey:char.id==='sir-scoops'?'#39675b':char.color})
    painter.current=draw;draw(run)
    const observer=new ResizeObserver(()=>draw(run));observer.observe(canvas.current)
    return ()=>{observer.disconnect();painter.current=null}
  },[run,urgency,opening,char])
  const finish = useRef(onFinish); finish.current = onFinish
  const hop = () => { if (started && run.t-run.jump > 1.15) run.jump=run.t }
  useEffect(() => {
    if (!started) return
    const key = (e, down) => {
      const k = e.key.toLowerCase()
      if (!['arrowleft','arrowright','a','d',' ','shift'].includes(k)) return
      e.preventDefault()
      if (k === ' ' && down && !e.repeat && run.t-run.jump > 1.15) run.jump=run.t
      if(k==='shift' && down && !e.repeat)assist()
      keys.current[k]=down
    }
    const down=e=>key(e,true), up=e=>key(e,false), blur=()=>{keys.current={}}
    window.addEventListener('keydown',down); window.addEventListener('keyup',up); window.addEventListener('blur',blur)
    let last=performance.now(), hud=0, id
    const tick=now=>{
      const dt=Math.max(0,Math.min(.06,(now-last)/1000)); last=now
      run.t+=dt
      const k=keys.current
      run.x=clamp(run.x+((k.arrowright||k.d?1:0)-(k.arrowleft||k.a?1:0))*dt*2.5)
      const boosted=run.t<run.assistUntil
      run.distance+=dt*speed*(boosted?1.38:1)
      const height=lift(run.t-run.jump)
      if (run.distance>=GAPS[run.gapIndex]) {
        const lane=PAWS[run.gapIndex++]
        if (height>=clearance) {
          run.gaps++
          const paw=height>.80 && Math.abs(lane-run.x)<.24
          if (paw) run.badges++
          if(boosted)run.bonus+=25
          run.message=`${paw?'Brass paw':'Gap clear'} · +${75+(paw?50:0)+(boosted?25:0)} pts`
          audio.coin()
        } else { run.mistakes++; run.message=`HIT: road gap #${run.gapIndex} · ${height===0?'wheels on ground':'jump too low'}`; run.hitUntil=run.t+.45; audio.hurt() }
        run.messageUntil=run.t+1.1
      }
      const fence=FENCES[run.coneIndex]
      if (fence && run.distance>=fence.at) {
        run.coneIndex++
        if (run.x*fence.side<opening) {run.mistakes++;run.message=`HIT: work fence #${run.coneIndex} · opening was ${fence.side>0?'RIGHT':'LEFT'}`;run.messageUntil=run.t+1.25;run.hitUntil=run.t+.45;audio.hurt()}
      }
      if (run.distance>=LENGTH) {
        finish.current({ points:run.gaps*75+run.badges*50+run.bonus, gaps:run.gaps, badges:run.badges, mistakes:run.mistakes, delay:Math.min(4,run.mistakes) })
      } else {
        painter.current?.(run)
        if(now-hud>=80){frame(v=>v+1);hud=now}
        id=requestAnimationFrame(tick)
      }
    }
    id=requestAnimationFrame(tick)
    return ()=>{cancelAnimationFrame(id);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur)}
  },[started,run,speed,opening,clearance])
  const gap=GAPS[run.gapIndex], eta=(gap-run.distance)/(speed*(run.t<run.assistUntil?1.38:1))
  const fence=FENCES[run.coneIndex], steerNext=fence && fence.at<(gap??Infinity)
  const jumpNow=!steerNext && eta<=.67 && eta>0
  const side=['left','right','center'][run.gapIndex]
  const district=Math.min(2,Math.floor(run.distance/25))
  return <div className={`ride-game block-${district} ${urgency?'urgent':''}`}>
    <div className="ride-hud"><button className="hud-quit" onClick={onQuit}>← Map</button><strong>{market}</strong><span className="ride-hud-right">⚡ eBike → {mower?'Mow':'Scoop'}</span></div>
    <div className="ride-minimap"><div className="ride-mini-track">
      <i className="ride-mini-fill" style={{width:progress(run.distance)}}/>
      {GAPS.map(at=><span key={at} className="ride-mini-house" style={{left:progress(at)}}>∧</span>)}
      <span className="ride-mini-house" style={{left:'98%'}}>🏡</span><b className="ride-mini-bike" style={{left:progress(run.distance)}}>🚲</b>
    </div></div>
    <div className="stop-order"><small>SCUPH DISPATCH · LEG 1/2 · {['Cedar Row','Market Steps','Sound View'][district]}</small>
      <strong>{!started?'Steer past fences. Jump the gaps.':steerNext?`Fence ahead · stay ${fence.side>0?'RIGHT ▶':'◀ LEFT'}`:jumpNow?'Jump now!':gap?`Gap ahead · bonus paw ${side}`:'Customer’s gate ahead'}</strong>
      <span>{!started?'Arrows steer · Space jumps · Shift boosts. Clear a gap on assist for +25.':`Next: ${Math.ceil(Math.max(0,(steerNext?fence.at:gap??LENGTH)-run.distance))} m · ${run.gaps*75+run.badges*50+run.bonus} pts · Delay −${Math.min(run.mistakes,4)} ${mower?'stripes':'sec'}`}{record>0 && ` · Best ${record}`}</span></div>
    <div className="ride-viewport"><canvas className="courier-scene" ref={canvas} aria-label="South Sound bike ride. Follow dispatch cues to steer and jump."/>
      {run.messageUntil>run.t&&<div className="ride-banner">{run.message}</div>}
      <div className="ride-controls">{!started?<button className="ride-scoop" onClick={()=>start(true)}>🚲 Pedal to {market} →</button>:<>
        <button onClick={assist} disabled={!run.cells || run.t<run.assistUntil}>⚡ {run.t<run.assistUntil?'Boosting':`Boost ×${run.cells}`}</button>
        {['left','jump','right'].map(dir=>dir==='jump'?<button key={dir} className={`ride-jump ${jumpNow?'lit':''}`} onClick={hop}>↑ Jump</button>:<button key={dir} aria-label={`Steer ${dir}`} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);keys.current['arrow'+dir]=true}} onLostPointerCapture={()=>{keys.current['arrow'+dir]=false}}>{dir==='left'?'◀':'▶'}</button>)}
      </>}</div>
    </div>
  </div>
}
