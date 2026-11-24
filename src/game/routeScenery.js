// Seeded, layered value noise. Sample at setup/resize, never in the frame loop.
export function scenery(town) {
  let seed=2166136261
  for(const letter of town)seed=Math.imul(seed^letter.charCodeAt(0),16777619)
  const hash=(i,channel=0)=>{
    let n=seed^Math.imul(i,0x27d4eb2d)^Math.imul(channel,0x165667b1)
    n=Math.imul(n^(n>>>16),0x85ebca6b)
    return ((n^(n>>>13))>>>0)/4294967296
  }
  function noise(x,ch){
    const i=Math.floor(x),f=x-i,t=f*f*(3-2*f)
    return hash(i,ch)*(1-t)+hash(i+1,ch)*t
  }
  return {hash,ridge:(x,ch)=>noise(x,ch)*.62+noise(x*2.1,ch+3)*.28+noise(x*5,ch+7)*.1}
}

// A burst is sampled analytically from its contact time, not integrated per
// frame. No timers, DOM nodes, or particles survive the life of the ride.
export function contactBurst(g,fx,now,w,h) {
  if(!fx)return
  const age=now-fx.time
  if(age<0||age>.58)return
  const scale=Math.min(w,h)/400,x=w*(.5+.26*fx.lane),y=h*.81-fx.height*44*Math.min(w*.0028,h*.0025,1.8)
  const hit=fx.kind==='hit',gold=fx.kind==='paw'
  g.save();g.translate(x,y);g.scale(scale,scale)
  g.globalAlpha=Math.max(0,1-age/.58)
  for(let i=0;i<(gold?16:10);i++){
    const a=(i*.618+fx.time*.13)%1*Math.PI*2,v=32+(i*19)%58
    const px=Math.cos(a)*v*age,py=-(35+Math.abs(Math.sin(a))*v)*age+age*age*(hit?145:83)
    g.fillStyle=hit?(i%2?'#d89762':'#fff0b5'):gold?'#ffe08c':'#9ce6c2'
    if(hit)g.fillRect(px,py,2+i%3,2)
    else {g.beginPath();g.moveTo(px,py-3);g.lineTo(px+2,py);g.lineTo(px,py+3);g.lineTo(px-2,py);g.fill()}
  }
  g.restore()
}
