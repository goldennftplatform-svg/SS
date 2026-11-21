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
self.addEventListener('install',e=>e.waitUntil(caches.open(cache).then(c=>c.addAll(urls))))
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith(prefix)&&k!==cache)await caches.delete(k);await self.clients.claim()})()))
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||!e.request.url.startsWith(self.registration.scope))return
 e.respondWith((async()=>{const c=await caches.open(cache);return await c.match(e.request.mode==='navigate'?'./index.html':e.request)||fetch(e.request)})())
})
`)
