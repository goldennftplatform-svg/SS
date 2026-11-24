const KEY='scuph-rider-v1', AUTH='scuph-rider-session-v1'
export const modes={route:'eBike route',urgent:'Rush cleanup',yard:'Yard refresh',mower:'Mower Maze',walk:'Pack Walk',fetch:'Fetch Relay'}
export const validName=n=>typeof n==='string' && /^[A-Za-z0-9][A-Za-z0-9 _-]{1,15}$/.test(n)
export function profile(){try{return JSON.parse(localStorage.getItem(KEY))||{name:'',best:{}}}catch{return {name:'',best:{}}}}
export function saveName(name){if(!validName(name))throw Error('Use 2–16 letters, numbers, spaces, dashes or underscores.');localStorage.setItem(KEY,JSON.stringify({...profile(),name}))}
export function recordScore(mode,points){const p=profile();p.best[mode]=Math.max(p.best[mode]||0,points);localStorage.setItem(KEY,JSON.stringify(p))}
const url=import.meta.env.VITE_RANKS_URL,key=import.meta.env.VITE_RANKS_KEY
export const onlineRanks=Boolean(url && key)
async function api(path,token,body){
  const response=await fetch(url.replace(/\/$/,'')+path,{method:body?'POST':'GET',headers:{apikey:key,...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(9000)})
  if(!response.ok)throw Error('Shared board unavailable. Your browser score is saved.')
  const text=await response.text();return text?JSON.parse(text):null
}
let pending
async function session(){
  const s=JSON.parse(localStorage.getItem(AUTH)||'null')
  if(s?.expires_at>Date.now()/1000+60)return s
  const next=s?await api('/auth/v1/token?grant_type=refresh_token',null,{refresh_token:s.refresh_token}):await api('/auth/v1/signup',null,{data:{}})
  if(!next.access_token)throw Error('Anonymous rider sign-in is not enabled.')
  localStorage.setItem(AUTH,JSON.stringify(next));return next
}
export async function syncBoard(mode){
  const p=profile();if(!onlineRanks||!p.name)return []
  pending??=session().finally(()=>{pending=null})
  const s=await pending
  // Re-send device bests on return, including jobs finished offline.
  for(const [m,score] of Object.entries(p.best))if(Object.hasOwn(modes,m))await api('/rest/v1/rpc/post_rider_best',s.access_token,{m,n:p.name,v:score})
  return api(`/rest/v1/rider_scores?select=nickname,points&mode=eq.${mode}&order=points.desc,nickname.asc&limit=20`,s.access_token)
}
export function challenge(){
  const q=new URLSearchParams(location.hash.slice(1)),name=q.get('rider'),mode=q.get('mode'),raw=q.get('pts')
  return validName(name)&&Object.hasOwn(modes,mode)&&/^\d{1,4}$/.test(raw)&&Number(raw)<=1425?{nickname:name,mode,points:Number(raw)}:null
}
export function challengeURL(mode){
  const p=profile(),u=new URL(location.href)
  u.hash=new URLSearchParams({rider:p.name,mode,pts:p.best[mode]}).toString();return u.href
}
