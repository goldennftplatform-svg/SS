import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { audio } from './audio/chiptune.js'

// Mobile browsers only allow audio after a real gesture.
const wake = () => audio.wake()
window.addEventListener('pointerdown', wake, { once: true })
window.addEventListener('keydown', wake, { once: true })

if(import.meta.env.PROD && /^https?:$/.test(location.protocol) && 'serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn))
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
