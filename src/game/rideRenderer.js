// A cached painted backdrop plus a small, depth-sorted foreground. World units
// are independent of device pixels; the same contacts drive art and physics.
export function rideRenderer(canvas, {night, gaps, paws, fences, opening, length, lift, jersey}) {
  const g=canvas.getContext('2d',{alpha:false}), sky=document.createElement('canvas')
  const bg=sky.getContext('2d')
  let w=1,h=1,ratio=1
  function poly(c,ink,...v){c.fillStyle=ink;c.beginPath();c.moveTo(v[0],v[1]);for(let i=2;i<v.length;i+=2)c.lineTo(v[i],v[i+1]);c.closePath();c.fill()}
  function stroke(c,ink,width,...v){c.strokeStyle=ink;c.lineWidth=width;c.beginPath();c.moveTo(v[0],v[1]);for(let i=2;i<v.length;i+=2)c.lineTo(v[i],v[i+1]);c.stroke()}
  function oval(c,ink,x,y,rx,ry){c.fillStyle=ink;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()}
  function pine(c,x,y,size,ink){
    c.save();c.translate(x,y);c.scale(size,size)
    poly(c,ink,-.04,0,.04,0,.04,-.16,.33,-.12,.16,-.37,.25,-.32,.11,-.6,.18,-.55,0,-1,-.15,-.56,-.1,-.59,-.24,-.34,-.16,-.38,-.32,-.15,-.04,-.17)
    c.restore()
  }
  function resize(){
    w=Math.max(1,canvas.clientWidth);h=Math.max(1,canvas.clientHeight)
    ratio=Math.min(devicePixelRatio||1,1.75,Math.sqrt(1800000/(w*h)))
    sky.width=canvas.width=Math.round(w*ratio);sky.height=canvas.height=Math.round(h*ratio)
    bg.setTransform(sky.width/w,0,0,sky.height/h,0,0)
    const wash=bg.createLinearGradient(0,0,0,h*.49)
    wash.addColorStop(0,night?'#10192d':'#527985');wash.addColorStop(.72,night?'#43516a':'#c4b69e');wash.addColorStop(1,night?'#696c76':'#f0cba1')
    bg.fillStyle=wash;bg.fillRect(0,0,w,h)
    const glow=bg.createRadialGradient(w*.77,h*.12,0,w*.77,h*.12,h*.23)
    glow.addColorStop(0,night?'#bed8ef42':'#ffe1b47a');glow.addColorStop(1,'#ffffff00')
    bg.fillStyle=glow;bg.fillRect(0,0,w,h*.4)
    if(night)for(let i=0;i<65;i++){bg.fillStyle=i%4?'#c4d4e04a':'#eee6ce95';bg.fillRect(((i*359)%997)/997*w,((i*71)%239)/239*h*.24,1,1)}
    oval(bg,night?'#e2e7ce':'#ffdfac',w*.77,h*.12,h*.026,h*.026)
    // Glaciated summit, broken rock faces, then two ridges of Douglas fir.
    bg.save();bg.scale(w,h)
    poly(bg,night?'#56627a':'#99a9a8',0,.33,.10,.26,.17,.28,.34,.18,.39,.20,.50,.105,.535,.097,.56,.123,.59,.119,.68,.21,.77,.22,.84,.18,1,.27,1,.43,0,.43)
    poly(bg,night?'#a5b8c5':'#e3ddd1',.397,.198,.50,.105,.535,.097,.56,.123,.59,.119,.646,.178,.584,.146,.595,.167,.552,.137,.541,.15,.511,.126,.486,.16,.469,.154)
    poly(bg,night?'#374962':'#788d93',.535,.099,.56,.123,.59,.119,.68,.21,.72,.25,.61,.199,.57,.159,.58,.181)
    bg.restore()
    for(let layer=0;layer<2;layer++){
      const ink=(night?['#334957','#203d41']:['#718780','#475f55'])[layer]
      for(let i=-2;i<=100;i++){
        const y=h*(.32+layer*.052+.022*Math.sin(i*.094+layer*2))
        pine(bg,i*w/96,y,h*(.037+.022*(1+Math.sin(i*45.3))),ink)
        bg.fillStyle=ink;bg.fillRect(i*w/96,y-2,w/96+1,h-y+3)
      }
    }
  }
  const props=[]
  for(let at=0;at<length+27;at+=3){
    const n=at/3
    props.push({at,side:n%2?1:-1,kind:n%9===3?'cabin':n%5===0?'lamp':'pine'})
  }
  fences.forEach(f=>props.push({...f,kind:'fence'}))
  gaps.forEach((at,i)=>props.push({at,side:paws[i],kind:'gap'}))
  props.push({at:length,side:1,kind:'client'})
  props.sort((a,b)=>b.at-a.at)
  function cabin(x,y,s,client){
    g.save();g.translate(x,y);g.scale(s,s)
    poly(g,'#785f4a',-19,0,9,0,9,-18,-19,-18);poly(g,'#4e5049',9,0,22,-4,22,-21,9,-18)
    poly(g,'#39494b',-23,-17,-9,-31,20,-32,26,-21,9,-15)
    for(let j=0;j<3;j++){g.fillStyle=night?'#efc780':'#d5b283';g.fillRect(-16+j*8,-13,4,6)}
    if(client){g.fillStyle='#e5c17d';g.fillRect(-28,-12,3,12);g.fillRect(-32,-13,10,5)}
    g.restore()
  }
  function paint(r){
    if(w!==canvas.clientWidth||h!==canvas.clientHeight)resize()
    g.setTransform(1,0,0,1,0,0);g.drawImage(sky,0,0)
    g.setTransform(canvas.width/w,0,0,canvas.height/h,0,0)
    const horizon=h*.37, foot=h*.81
    const center=p=>w*(.5+.105*Math.sin(r.distance*.055+.6)*(1-p)**2)
    const y=p=>horizon+(foot-horizon)*p, road=p=>w*(.018+.415*p)
    const point=(p,k)=>center(p)+road(p)*k
    g.fillStyle=night?'#233936':'#526852';g.fillRect(0,horizon,w,h-horizon)
    for(const [k,col] of [[1.12,night?'#51605d':'#aa9e80'],[1,night?'#26303b':'#414c50'],[.966,night?'#353e48':'#535c5d']]){
      g.fillStyle=col;g.beginPath();g.moveTo(point(0,-k),y(0))
      for(let i=1;i<=28;i++)g.lineTo(point(i/20,-k),y(i/20))
      for(let i=28;i>=0;i--)g.lineTo(point(i/20,k),y(i/20))
      g.closePath();g.fill()
    }
    for(let at=Math.floor(r.distance/3)*3;at<r.distance+30;at+=3){
      const p=(1-(at-r.distance)/30)**2
      stroke(g,night?'#b59e69':'#d1b079',Math.max(.7,p*w*.005),center(p),y(p),center(p+.028*p),y(p+.028*p))
    }
    // Small road imperfections and grass tufts are fixed to world positions.
    const first=Math.floor(r.distance*5)
    for(let i=first;i<first+150;i++){
      const p=(1-(i/5-r.distance)/30)**2, sign=i%2?1:-1
      const x=point(p,sign*(.13+(i*47%79)/100)), yy=y(p)
      g.fillStyle=i%3?'#d2d5cd18':'#19252237';g.fillRect(x,yy,Math.max(1,p*w*.009),Math.max(.55,p*1.5))
      const gx=point(p,sign*(1.15+(i*17%59)/37))
      stroke(g,night?'#72937726':'#b7bf8e60',Math.max(.5,p*1.4),gx,yy,gx+p*3,yy-p*4)
    }
    for(const o of props){
      const z=o.at-r.distance;if(z<-.9||z>30)continue
      const t=1-z/30,p=t*t, cy=y(p),cx=center(p), rw=road(p), s=Math.min(w,h)/220*(.08+.92*p)
      const x=cx+rw*o.side*1.13
      if(o.kind==='pine'){pine(g,x,cy,74*s,night?'#152d2e':'#28483d');pine(g,x+6*s,cy+2*s,45*s,night?'#234039':'#35584a')}
      else if(o.kind==='lamp'){
        if(night){
          oval(g,'#f1ce8721',cx+rw*o.side*.82,cy,24*s,4*s)
          poly(g,'#ecd39c0b',x-o.side*9*s,cy-62*s,x-o.side*28*s,cy,x+o.side*8*s,cy)
        }
        stroke(g,'#524e42',2.1*s,x,cy,x,cy-61*s,x-o.side*9*s,cy-63*s)
        oval(g,'#ffe2a6',x-o.side*9*s,cy-62*s,3*s,1.5*s)
      }else if(o.kind==='cabin'||o.kind==='client')cabin(x,cy,s*1.45,o.kind==='client')
      else if(o.kind==='fence'){
        const left=cx-o.side*rw,end=cx+o.side*opening*w*(.012+.248*p), top=cy-12*s
        for(const px of [left,end])stroke(g,'#313638',2.4*s,px,cy,px,top-2*s)
        stroke(g,'#bd774a',6*s,left,top,end,top)
        for(let j=0;j<10;j++){const u=left+(end-left)*(j+.2)/10;stroke(g,'#f5dfb0',2*s,u,top+2*s,u+2*s,top-2*s)}
      }else{
        poly(g,'#20292c',cx-rw,cy-2*s,cx+rw,cy-2*s,cx+rw,cy+3*s,cx-rw,cy+3*s)
        stroke(g,'#e9bf72',1.6*s,cx-rw,cy+3*s,cx+rw,cy+3*s)
        const bx=cx+o.side*w*(.012+.248*p),by=cy-19*s
        oval(g,'#bf924b',bx,by,5*s,6*s);oval(g,'#f7d99a',bx,by,3*s,4*s)
        oval(g,'#67502f',bx,by+s,1.6*s,1.2*s)
        for(let i=-1;i<=1;i++)oval(g,'#67502f',bx+i*1.35*s,by-(i===0?1.8:1)*s,.56*s,.75*s)
      }
    }
    // Rear three-quarter courier: slim tyres, steel tubes, waxed panniers,
    // articulated knees and a brass reflective stripe on the work jacket.
    const j=lift(r.t-r.jump),rx=w*(.5+.26*r.x),scale=Math.min(w*.0028,h*.0025,1.8)
    oval(g,'#24303380',rx,foot,18*scale,4*scale)
    g.save();g.translate(rx,foot-j*44*scale);g.scale(scale,scale)
    const pedal=Math.sin(r.t*11)*4
    oval(g,'#212b2d',0,-12,4,14);stroke(g,'#99aaa1',1,0,-23,0,0)
    stroke(g,'#d9ad68',2,-8,-26,0,-8,9,-28,-8,-26)
    stroke(g,'#384346',5,-6,-37,-10,-24+pedal,-5,-15+pedal)
    stroke(g,'#293739',5,6,-37,10,-24-pedal,6,-15-pedal)
    poly(g,jersey||'#35685e',-10,-49,8,-49,11,-40,6,-33,-7,-33,-12,-40)
    stroke(g,'#deb97a',2,-10,-42,9,-42);stroke(g,'#344a48',3.5,-10,-47,-15,-37,-12,-34)
    stroke(g,'#344a48',3.5,8,-47,15,-37,12,-34)
    oval(g,'#b5bcae',0,-54,7,7);stroke(g,'#536561',1.6,-3,-60,-2,-53)
    for(const a of [-1,1]){poly(g,'#33574e',a*4,-23,a*14,-22,a*13,-9,a*5,-8);stroke(g,'#d3af75',1.6,a*5,-20,a*13,-19)}
    oval(g,'#f39c77',0,-24,2.3,1.3);g.restore()
  }
  resize()
  return paint
}
