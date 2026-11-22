import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import './components/blockWorld.css'
import { audio } from './audio/chiptune.js'

// Mobile browsers only allow audio after a real gesture.
const wake = () => audio.wake()
window.addEventListener('pointerdown', wake, { once: true })
window.addEventListener('keydown', wake, { once: true })

if(import.meta.env.PROD && /^https?:$/.test(location.protocol) && 'serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js').then(async (reg) => {
      // Check immediately and hourly so a new deploy replaces the cached build.
      await reg.update().catch(() => {})
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000)
    }).catch(console.warn)
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data?.type === 'scuph-update') location.reload()
    })
  })
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
