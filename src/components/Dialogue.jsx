import React, { useCallback, useEffect, useRef, useState } from 'react'
import { SPEAKERS } from '../data/dialogue.js'
import { ScoopKnight } from './CharacterSprite.jsx'
import { audio } from '../audio/chiptune.js'

function Portrait({ speaker }) {
  const s = SPEAKERS[speaker] || SPEAKERS.narrator
  return (
    <div className="dlg-portrait" style={{ '--speaker': s.color }} aria-hidden="true">
      {s.knight ? <ScoopKnight pose="report" /> : <span>{s.icon}</span>}
    </div>
  )
}

export function Dialogue({ lines, onDone }) {
  const [idx, setIdx] = useState(0)
  const [shown, setShown] = useState('')
  const typing = useRef(false)
  const line = lines[Math.min(idx, lines.length - 1)]
  const speaker = SPEAKERS[line?.speaker] || SPEAKERS.narrator

  useEffect(() => {
    setShown('')
    const text = line?.text || ''
    let i = 0
    typing.current = true
    const id = setInterval(() => {
      i += 1
      setShown(text.slice(0, i))
      if (i % 4 === 0) audio.blip(speaker.knight ? 1.25 : speaker.icon === '💩' ? 0.7 : 1)
      if (i >= text.length) { clearInterval(id); typing.current = false }
    }, 22)
    return () => clearInterval(id)
  }, [idx, line?.text, speaker.knight, speaker.icon])

  const advance = useCallback(() => {
    if (typing.current) {
      typing.current = false
      setShown(line?.text || '')
      return
    }
    audio.select()
    if (idx + 1 >= lines.length) onDone?.()
    else setIdx(idx + 1)
  }, [idx, lines.length, line?.text, onDone])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); advance() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance])

  return (
    <div className="dlg-scrim" onClick={advance} role="presentation">
      <div className="dlg-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`${speaker.name} says`}>
        <Portrait speaker={line?.speaker} />
        <div className="dlg-body">
          <div className="dlg-name" style={{ color: speaker.color }}>{speaker.name}</div>
          <p className="dlg-text">{shown}<span className="dlg-caret">▌</span></p>
          <div className="dlg-foot">
            <span className="dlg-dots">{lines.map((_, i) => <i key={i} className={i === idx ? 'on' : i < idx ? 'seen' : ''} />)}</span>
            <button onClick={advance}>{idx + 1 === lines.length ? 'GOT IT ▶' : 'NEXT ▶'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Callout({ line, onDone }) {
  const s = SPEAKERS[line?.speaker] || SPEAKERS.dispatch
  useEffect(() => {
    audio.blip(1.15)
    const id = setTimeout(() => onDone?.(), 2800)
    return () => clearTimeout(id)
  }, [line?.text, onDone])

  return (
    <button className="callout" style={{ '--speaker': s.color }} onClick={onDone}>
      <span className="callout-icon">{s.icon}</span>
      <span><b>{s.name}</b> {line?.text}</span>
    </button>
  )
}
