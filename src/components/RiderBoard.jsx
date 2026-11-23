import React,{useState,useEffect} from 'react'
import {profile,saveName,modes,challenge,challengeURL,syncBoard,onlineRanks} from '../game/riders.js'
export default function RiderBoard({back,play}){
  const rival=challenge(),[p,setP]=useState(profile),[name,setName]=useState(p.name),[mode,setMode]=useState(rival?.mode||'route')
  const [rows,setRows]=useState([]),[msg,status]=useState(''),[link,setLink]=useState('')
  useEffect(()=>{let active=true;setRows([]);setLink('');status('')
    if(onlineRanks && p.name)syncBoard(mode).then(r=>{if(active)setRows(r)}).catch(e=>{if(active)status(e.message)})
    return()=>{active=false}
  },[mode,p])
  const local=[...(p.best[mode]!=null?[{nickname:p.name||'You',points:p.best[mode]}]:[]),...(rival?.mode===mode?[rival]:[])].sort((a,b)=>b.points-a.points)
  return <section className="mow-mode rider-board"><header><button onClick={back}>← Map</button><b>SCUPH · RIDER CLUB</b></header><main><small>SOUTH SOUND / TIME SHIFT LEAGUE</small><h1>Rider leaderboard</h1>
    <form onSubmit={e=>{e.preventDefault();try{saveName(name.trim());setP(profile())}catch(err){status(err.message)}}}>
      <label>Rider nickname <input value={name} maxLength={16} placeholder="e.g. CedarFox" autoComplete="off" onChange={e=>setName(e.target.value)}/></label>
      <button>{p.name?'Save name':'Join with nickname'}</button></form>
    <p>{p.name?`Riding as ${p.name}. `:''}Use a made-up name. Your rider and campaign stay in this browser.</p>
    <label>Dispatch <select value={mode} onChange={e=>setMode(e.target.value)}>{Object.entries(modes).map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
    <h2>{rival?.mode===mode?'Friend challenge':'Your personal best'}</h2>
    {local.length?<ol>{local.map((r,i)=><li key={i}>{r.nickname} <b>{r.points} pts</b></li>)}</ol>:<p>Finish an on-time job in this mode to post a score.</p>}
    {onlineRanks && <><h2>Shared top 20</h2>{rows.length?<ol>{rows.map((r,i)=><li key={i}>{r.nickname} <b>{r.points} pts</b></li>)}</ol>:<p>{p.name?'No shared scores loaded yet.':'Join to view and post shared scores.'}</p>}</>}
    <button disabled={!p.name||p.best[mode]==null} onClick={async()=>{const u=challengeURL(mode);setLink(u);try{await navigator.clipboard.writeText(u);status('Challenge link copied. Send it to a friend!')}catch{status('Copy the challenge link below.')}}}>Challenge a friend ↗</button>
    {link&&<input aria-label="Challenge link" value={link} readOnly onFocus={e=>e.target.select()}/>}
    <p role="status">{msg}</p><button onClick={()=>play(mode)}>Play {modes[mode]} →</button> <button onClick={back}>Back to dispatch →</button></main></section>
}
