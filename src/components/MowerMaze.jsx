import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { audio } from '../audio/chiptune.js'

// A stripe runs until a hedge or edge. Reflections keep the same solvability.
const lawn=['..#...','......','......','...#..','#....#','#.##.#']
const keys={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1],a:[-1,0],d:[1,0],w:[0,-1],s:[0,1]}
const total=lawn.join('').replaceAll('#','').length
export default function MowerMaze({city,level,onFinish,onQuit}) {
  const rows=city%2?lawn.map(row=>[...row].reverse().join('')):lawn
  const initial=city%2?5:0
  const [pos,setPos]=useState(initial),[cut,setCut]=useState(()=>new Set([initial])),[moves,setMoves]=useState(0)
  const [hint,setHint]=useState('Pick a direction. The mower stops at a hedge or fence.')
  const busy=useRef(false),timer=useRef(),act=useRef(),done=useRef(false)
  const queued=useRef(null),gesture=useRef(null)
  const [turnArrow,setTurnArrow]=useState('')
  const fuel=26-Math.min(4,level-1)
  act.current=(dx,dy)=>{
    if(done.current)return
    if(busy.current){queued.current=[dx,dy];setTurnArrow(dx<0?'←':dx>0?'→':dy<0?'↑':'↓');return}
    let x=pos%6,y=Math.floor(pos/6);const path=[]
    while(rows[y+dy]?.[x+dx]==='.'){x+=dx;y+=dy;path.push(y*6+x)}
    if(!path.length){setHint('Blocked here. Try another direction.');return}
    busy.current=true
    const next=new Set(cut),turn=moves+1
    setMoves(turn);let i=0
    const step=()=>{
      const tile=path[i++];next.add(tile);setPos(tile);setCut(new Set(next))
      if(i===path.length){
        clearInterval(timer.current);busy.current=false
        const gain=next.size-cut.size
        setHint(gain>=4?`Ribbon cut! All ${gain} fresh squares in one pass.`:gain?`Fresh stripe! ${gain} new squares cut.`:'Already trimmed. Aim for the tall grass.')
        if(gain)audio.scoop()
        const win=next.size===total
        if(win||turn>=fuel){
          done.current=true
          onFinish({late:!win,mistakes:0,performance:win?Math.max(.65,1-(turn-16)*.025):.45*next.size/total,
            servicePoints:Math.round(next.size/total*1000)+(win?Math.max(0,24-turn)*50:0),serviceLabel:`${next.size}/${total} squares trimmed in ${turn} stripes`})
        }
      }
    }
    timer.current=setInterval(step,78)
    step()
  }
  useLayoutEffect(()=>{
    if(!busy.current && !done.current && queued.current){const dir=queued.current;queued.current=null;setTurnArrow('');act.current(...dir)}
  },[pos,cut])
  useEffect(()=>{
    const key=e=>{const dir=keys[e.key];if(dir){e.preventDefault();if(!e.repeat)act.current(...dir)}}
    window.addEventListener('keydown',key);return()=>{clearInterval(timer.current);window.removeEventListener('keydown',key)}
  },[])
  return <section className="mow-mode"><header><button onClick={onQuit}>← Map</button><b>SCUPH · MOWER MAZE</b></header>
    <main><small>LAWN PUZZLE · FINISH IN 20 STRIPES FOR +25 COINS</small><h1>Stripe the whole lawn.</h1>
    <div className="mow-stats"><b>🌱 {cut.size}/{total} cut</b><b>⚡ {fuel-moves} stripes left</b></div>
    <div className="mow-board" aria-label="Lawn puzzle" onPointerDown={e=>{if(!e.isPrimary)return;e.currentTarget.setPointerCapture(e.pointerId);gesture.current=[e.clientX,e.clientY]}}
      onPointerCancel={()=>{gesture.current=null}} onPointerMove={e=>{if(!e.isPrimary||!gesture.current)return;const dx=e.clientX-gesture.current[0],dy=e.clientY-gesture.current[1];if(Math.max(Math.abs(dx),Math.abs(dy))<16)return;gesture.current=null;act.current(...(Math.abs(dx)>Math.abs(dy)?[Math.sign(dx),0]:[0,Math.sign(dy)]))}} onPointerUp={()=>{gesture.current=null}}>
      {rows.join('').split('').map((ch,i)=><div key={i} className={ch==='#'?'hedge':cut.has(i)?'trim':'tall'}>
      {i===pos?<span className="mower" aria-label="Mower">🚜</span>:ch==='#'?'🌳':cut.has(i)?'':'〃'}</div>)}</div>
    <p role="status">{turnArrow?`Next turn queued: ${turnArrow}`:hint}</p>
    <div className="mow-pad">{[['←',-1,0,'left'],['↑',0,-1,'up'],['↓',0,1,'down'],['→',1,0,'right']].map(([s,x,y,label])=><button key={s} aria-label={`Mow ${label}`} onClick={()=>act.current(x,y)}>{s}</button>)}</div>
    <small>Swipe the lawn, use arrows / WASD, or tap a direction. Queue one turn ahead.</small></main></section>
}
