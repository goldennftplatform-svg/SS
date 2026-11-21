import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const read = path => readFile(resolve('dist', path.replace(/^\//, '')), 'utf8')
let page = await read('index.html')
const js = page.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/)
const css = page.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/)
const logo = await readFile('dist/assets/brand/scuph-logo.png')
const code = (await read(js[1])).replaceAll('/assets/brand/scuph-logo.png', `data:image/png;base64,${logo.toString('base64')}`).replace(/<\/script/gi,'<\\/script')
const style = await read(css[1])
page = page.replace(js[0], '').replace(css[0], () => `<style>${style}</style>`)
  .replace(/<link[^>]+https:\/\/fonts\.[^>]+>/g, '')
  .replace('</body>', () => `<script type="module">${code}</script></body>`)
await mkdir('release', { recursive: true })
await writeFile('release/SCUPH-SAFARI.html', page)
console.log('Offline edition: release/SCUPH-SAFARI.html')
