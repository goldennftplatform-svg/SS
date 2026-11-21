// Schematic road atlas; branch boundaries are gameplay districts, not city limits.
const rows = [
  ['Maple Valley',885,83,3,'Lake Wilderness','yard'],
  ['Covington',741,112,4,'Cedar Creek','route'],
  ['Black Diamond',916,175,4,'Old Town','yard'],
  ['Kent',597,75,5,'Green River','route'],
  ['Auburn',636,178,5,'Game Farm Park','yard'],
  ['Federal Way',476,132,5,'Steel Lake','urgent'],
  ['Enumclaw',963,280,5,'Plateau farms','yard'],
  ['Pacific',654,256,4,'Riverfront','urgent'],
  ['Milton',480,222,4,'Mill district','route'],
  ['Sumner',686,335,4,'Rhubarb country','route'],
  ['Bonney Lake',826,360,5,'Lake Tapps','yard'],
  ['Fife',504,301,4,'Valley flats','urgent'],
  ['Puyallup',600,400,6,'Fairgrounds','yard'],
  ['Tacoma',381,291,7,'North End','urgent'],
  ['University Place',242,332,5,'Chambers Bay','yard'],
  ['Lakewood',314,409,6,'American Lake','route'],
  ['Steilacoom',175,408,4,'Waterfront','yard'],
  ['DuPont',221,479,5,'Historic Village','route'],
  ['Lacey',140,555,5,'Woodland trails','urgent'],
  ['Olympia',46,596,8,'Capitol district','yard'],
]
export const cities = rows.map(([name,x,y,goal,hood,special],id)=>({id,name,x,y,goal,hood,special}))
export const roads = [[0,1],[0,2],[1,3],[1,4],[2,4],[2,6],[3,5],[3,4],[4,7],[5,8],[6,10],[7,9],[8,11],[9,10],[9,12],[10,12],[11,13],[11,12],[12,13],[13,14],[13,15],[14,16],[14,15],[15,17],[16,17],[17,18],[18,19]]
export const count=(s,id)=>s.territories?.[id]||0
export const owned=(s,id)=>count(s,id)>=cities[id].goal
export const neighbors=id=>roads.filter(r=>r.includes(id)).map(r=>r.find(i=>i!==id))
export const open=(s,id)=>id===0||owned(s,id)||neighbors(id).some(n=>owned(s,n))
export const dividend=s=>cities.filter(c=>owned(s,c.id)).length*6
export function expand(s,id,gain){
  if(!cities[id]||!open(s,id)) return s
  return {...s,territories:{...s.territories,[id]:Math.min(cities[id].goal,count(s,id)+gain)}}
}
export const flyerCost=45
export function canvass(s,id){
  if(!cities[id]||id===0||!open(s,id)||owned(s,id)||s.coins<flyerCost) return s
  return expand({...s,coins:s.coins-flyerCost},id,1)
}
