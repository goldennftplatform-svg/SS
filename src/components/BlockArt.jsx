import React, { memo } from 'react'

// Front, sunlit lid, shaded end. All props share one projection and light source.
function Brick({ x, y, w, h, d = 4, color }) {
  const r = d * .65
  return <g fill={color}>
    <rect x={x} y={y} width={w} height={h}/>
    <path d={`M${x} ${y}l${d} ${-r}h${w}l${-d} ${r}z`} />
    <path d={`M${x} ${y}l${d} ${-r}h${w}l${-d} ${r}z`} fill="#fff5cc" opacity=".38"/>
    <path d={`M${x+w} ${y}l${d} ${-r}v${h}l${-d} ${r}z`}/>
    <path d={`M${x+w} ${y}l${d} ${-r}v${h}l${-d} ${r}z`} fill="#152939" opacity=".36"/>
  </g>
}
const box = (x,y,w,h,color,d) => <Brick {...{x,y,w,h,color,d}}/>
const ink = '#263839', brass = '#e6b456', leaf = '#85af58'
function Cabin({ variant }) {
  const wall = ['#c07b51','#67a49a','#d5a963'][variant % 3]
  return <>{box(6,27,45,28,wall,9)}{box(3,23,49,6,ink,9)}
    {box(8,18,39,6,'#39665e',9)}{variant % 3 !== 1 && box(14,12,27,6,'#477c6b',9)}
    {box(38,10,5,10,'#975a42')}{box(10,33,11,10,brass,1)}{box(37,34,9,8,brass,1)}
    {box(25,35,8,20,'#294d49',1)}<path d="M15 33v10m-5-5h11" stroke={ink} strokeWidth="2"/>
    <path d="M28 45h2M10 50h10" stroke="#fff0b4" strokeWidth="2"/></>
}
function Worker({ ride, color = leaf, pose, id }) {
  return <>{ride && <><path d="M5 46h12l4 5v8l-4 4H5l-4-4v-8zm38 0h12l5 5v8l-5 4H43l-4-4v-8z" fill={ink}/>
    <path d="M10 54l11-17 12 17H10l30-13 10 13-7-23h-8" fill="none" stroke={brass} strokeWidth="3"/></>}
    {box(20,40,8,ride?11:17,'#536a65')}{box(31,40,8,ride?13:17,'#384d4b')}
    {box(17,25,23,18,'#216154',5)}{box(17,39,23,4,brass,5)}{box(16,10,25,17,color,6)}
    {box(14,6,28,7,'#98aea3',6)}{box(13,12,32,3,brass,5)}
    <path d="M33 17h7v5h-7z" fill="#fff1c9"/><path d="M37 17h3v4h-3z" fill={ink}/>
    {id === 'duchess-litterly' && <>{box(15,3,6,8,color,2)}{box(34,3,6,8,color,2)}<path d="M38 23h9m-9 2h7" stroke={ink}/></>}
    {['hopscotch','sir-wags'].includes(id) && <>{box(13,13,7,15,'#785337',2)}{box(37,22,9,5,color,2)}{box(44,21,4,4,ink,1)}</>}
    {id === 'sir-hearthguard' && <>{box(14,3,6,6,'#81928e')}{box(25,3,6,6,'#81928e')}{box(36,3,6,6,'#81928e')}</>}
    {id === 'captain-sunbeam' && <>{box(11,13,7,17,'#cb7b3e')}{box(17,24,16,6,'#cb7b3e')}</>}
    {box(34,28,7,9,color,3)}{box(38,33,9,5,color,3)}
    {pose === 'report' && box(41,23,12,17,'#fff2c9',2)}</>
}
export const BlockArt = memo(function BlockArt({ kind, variant = 0, character, pose, className = '', label }) {
  let art
  switch (kind) {
    case 'bike': art = <><g fill="none" strokeWidth="4"><circle cx="13" cy="44" r="10" stroke={ink}/><circle cx="50" cy="44" r="10" stroke={ink}/><path d="m13 44 12-20 8 20H13l29-14 8 14-9-26h-7" stroke={brass}/></g>{box(5,23,16,10,'#326e60',3)}{box(20,20,11,4,ink,2)}</>;break
    case 'house': art = <Cabin variant={variant}/>; break
    case 'worker': art = <Worker ride={pose === 'ride'} {...{pose}} color={character?.id === 'sir-scoops' ? leaf : character?.color} id={character?.id}/>; break
    case 'pine': art = <>{box(25,41,9,19,'#805c41')}{box(8,31,40,15,'#315f49',7)}{box(14,20,28,14,'#43805a',6)}{box(21,10,15,13,'#64995e',5)}</>; break
    case 'pile': art = <>{box(9,38,41,13,'#845534',7)}{box(16,28,27,11,'#a16940',6)}{box(23,20,12,9,'#b77d4d',4)}</>; break
    case 'truck': art = <>{box(5,33,47,14,'#2b7765',6)}{box(31,18,18,17,brass,6)}{box(35,20,11,9,'#98d2d3',1)}{box(9,44,10,9,ink)}{box(39,44,10,9,ink)}</>; break
    case 'grass': art = <>{box(7,32,11,17,'#5a883f')}{box(22,19,10,30,leaf)}{box(36,28,11,21,'#6d993d')}</>; break
    case 'leaf': art = <>{box(9,35,14,10,'#bf8039')}{box(20,27,16,14,'#da9644')}{box(33,19,12,14,'#edb55a')}{box(43,15,6,9,'#a86637')}</>; break
    case 'cone': art = <>{box(8,47,42,6,ink)}{box(15,34,27,12,'#dd7848')}{box(20,26,18,9,'#ffe7ac')}{box(24,16,10,10,'#cf6442')}</>; break
    case 'market': art = <>{box(9,36,44,16,'#ab7149',6)}{box(12,19,4,18,ink,2)}{box(46,19,4,18,ink,2)}{box(6,14,48,8,'#cb7448',6)}{[12,26,40].map(x=><rect key={x} x={x} y="14" width="6" height="8" fill="#ffdfa2"/>)}{box(20,32,12,5,leaf)}</>; break
    case 'lighthouse': art = <>{box(10,50,39,6,'#596c65')}{box(21,21,17,29,'#f3dab5',6)}{box(21,32,17,8,'#bc6747',6)}{box(16,17,26,5,ink)}{box(21,9,16,8,brass)}{box(18,5,22,4,ink)}</>; break
    default: return null
  }
  return <svg viewBox="0 0 64 64" className={`block-art ${className}`} role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true}>{art}</svg>
})
