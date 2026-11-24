import { init, Crowd } from 'recast-navigation'
import { generateSoloNavMesh } from 'recast-navigation/generators'

export const beds=[[5,0,2,8],[10,5,2,9],[15,0,2,8]]
export const toys=[[3,2],[9,3],[14,11],[19,2],[19,12],[8,12]]
export const kennels=[[2,11],[3,12],[2,13]]
const vec=([x,z])=>({x,y:0,z})
let ready
export async function openPark(){
  await (ready??=init().catch(e=>{ready=null;throw e}))
  const positions=[],indices=[]
  for(let z=0;z<15;z++)for(let x=0;x<21;x++){
    if(beds.some(([a,b,w,h])=>x>=a&&x<a+w&&z>=b&&z<b+h))continue
    const n=positions.length/3
    positions.push(x,0,z,x,0,z+1,x+1,0,z+1,x+1,0,z)
    indices.push(n,n+1,n+2,n,n+2,n+3)
  }
  const mesh=generateSoloNavMesh(positions,indices,{cs:.2,ch:.15,walkableRadius:2,minRegionArea:2})
  if(!mesh.success)throw Error(mesh.error)
  const crowd=new Crowd(mesh.navMesh,{maxAgents:3,maxAgentRadius:.45})
  const agents=kennels.map((p,i)=>crowd.addAgent(vec(p),{radius:.34,maxSpeed:4+i*.45,maxAcceleration:14,collisionQueryRange:2.4,separationWeight:1.4,updateFlags:31}))
  return {agents,send:(i,p)=>agents[i].requestMoveTarget(vec(p)),step:dt=>crowd.update(dt),
    close:()=>{crowd.destroy();mesh.navMesh.destroy()}}
}
