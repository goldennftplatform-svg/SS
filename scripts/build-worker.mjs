import {readFile,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
const html=await readFile('dist/index.html','utf8')
const files=['./','./index.html','./manifest.webmanifest','./assets/brand/scuph-logo.png',
  ...['apple','192','512','maskable'].map(i=>`./icons/${i}.png`),
  ...[...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+\.(?:js|css))"/g)].map(m=>m[1])]
const hash=createHash('sha256')
for(const file of files.slice(1))hash.update(await readFile('dist/'+file))
await writeFile('dist/sw.js',`
const prefix='scuph-safari:'+self.registration.scope+':'
const cache=prefix+'${hash.digest('hex').slice(0,16)}'
const urls=${JSON.stringify(files)}
self.addEventListener('install',e=>e.waitUntil((async()=>{
  const c=await caches.open(cache)
  await c.addAll(urls)
  await self.skipWaiting()
})()))
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  const keys=await caches.keys()
  const hadOld=keys.some(k=>k.startsWith(prefix)&&k!==cache)
  for(const k of keys)if(k.startsWith(prefix)&&k!==cache)await caches.delete(k)
  await self.clients.claim()
  if(hadOld){
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true})
    for(const client of clients)client.postMessage({type:'scuph-update'})
  }
})()))
self.addEventListener('message',e=>{if(e.data?.type==='scuph-update-check')e.waitUntil(self.registration.update())})
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||!e.request.url.startsWith(self.registration.scope))return
 e.respondWith((async()=>{const c=await caches.open(cache);return await c.match(e.request.mode==='navigate'?'./index.html':e.request)||fetch(e.request)})())
})
`)
