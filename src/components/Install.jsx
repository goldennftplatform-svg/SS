import React,{useState,useEffect} from 'react'

let offer=null
let installed=false
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();offer=e;window.dispatchEvent(new Event('installstate'))
})
window.addEventListener('appinstalled',()=>{
  offer=null;installed=true;window.dispatchEvent(new Event('installstate'))
})
const standalone=()=>installed||navigator.standalone||matchMedia('(display-mode: standalone)').matches
export default function Install(){
  const [hidden,hide]=useState(standalone),[help,show]=useState(false)
  useEffect(()=>{const update=()=>hide(standalone());window.addEventListener('installstate',update);return()=>window.removeEventListener('installstate',update)},[])
  if(hidden||location.protocol==='file:')return null
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)
  async function install(){
    if(!offer){show(!help);return}
    const prompt=offer;offer=null
    try{await prompt.prompt();await prompt.userChoice;show(false)}catch{show(true)}
  }
  return <div className="install-box"><button onClick={install}>Install game ↓</button>{help&&<div role="status">{ios?'In Safari, tap Share → Add to Home Screen → Add. Turn on Open as Web App if shown.':'In Chrome, open the browser menu → Install app or Add to Home screen. If unavailable, open this page directly in your mobile browser.'}<button onClick={()=>show(false)}>Close</button></div>}</div>
}
