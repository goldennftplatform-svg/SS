import React, { useCallback, useEffect, useRef, useState } from 'react'
import { characterById } from '../game/engine.js'
import CharacterSprite from './CharacterSprite.jsx'
import { audio } from '../audio/chiptune.js'

const ROAD_LENGTH = 100
const PILES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  at: 8 + i * 6.4 + (i % 3) * 1.2,
  lane: i % 3,
}))
const HAZARDS = [
  { id: 'h1', at: 26, lane: 1, type: 'sprinkler' },
  { id: 'h2', at: 44, lane: 0, type: 'dog' },
  { id: 'h3', at: 61, lane: 2, type: 'sprinkler' },
  { id: 'h4', at: 79, lane: 1, type: 'dog' },
]
const FRIENDLY_DOG_AT = [34, 70]

export default function RouteGame({ market, characterId, urgency, upgrades, onFinish, onQuit, onCallout }) {
  const char = characterById(characterId)
  const bikeLevel = upgrades.bike || 0
  const scoopLevel = upgrades.scoop || 0
  const baseSpeed = (0.9 + bikeLevel * 0.12) * (char.perkEffect.speed || 1) * (urgency ? 1.18 : 1)

  const [pos, setPos] = useState(0)
  const [lane, setLane] = useState(1)
  const [cleared, setCleared] = useState([])
  const [combo, setCombo] = useState(0)
  const [timeLeft, setTimeLeft] = useState(urgency ? 30 : 42)
  const [bump, setBump] = useState(false)
  const [waved, setWaved] = useState([])
  const [done, setDone] = useState(false)
  const posRef = useRef(0)
  const laneRef = useRef(1)
  const clearedRef = useRef([])
  const bumpRef = useRef(false)
  const frameRef = useRef(null)
  const lastRef = useRef(0)
  const tierRef = useRef(0)

  const scoopRadius = 4.2 + scoopLevel * 0.8 + (char.perkEffect.scoopRadius ? 3 : 0)

  const finish = useCallback((performance) => {
    if (done) return
    setDone(true)
    onFinish({ performance: Math.max(0, Math.min(1, performance)), urgency, character: char })
  }, [done, onFinish, urgency, char])

  // main ride loop
  useEffect(() => {
    if (done) return
    let raf
    const tick = (t) => {
      if (!lastRef.current) lastRef.current = t
      const dt = Math.min(0.05, (t - lastRef.current) / 1000)
      lastRef.current = t
      const finalBoost = posRef.current > 82 && char.perkEffect.finalSpeed ? char.perkEffect.finalSpeed : 1
      const next = Math.min(ROAD_LENGTH, posRef.current + baseSpeed * finalBoost * dt * 12)
      posRef.current = next
      setPos(next)

      if (bumpRef.current) {
        if (Math.random() < 0.1) { bumpRef.current = false; setBump(false) }
      }

      if (next >= ROAD_LENGTH) {
        const total = PILES.length
        const cleanRatio = clearedRef.current.length / total
        const timeRatio = timeLeft / (urgency ? 30 : 42)
        const performance = cleanRatio * 0.65 + timeRatio * 0.25 + Math.min(1, combo / 12) * 0.1
        finish(performance)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [done, baseSpeed, timeLeft, combo, urgency, finish, char])

  // countdown
  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { finish(0); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [done, finish])

  // keyboard controls
  useEffect(() => {
    if (done) return
    const onKey = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') { laneRef.current = Math.max(0, laneRef.current - 1); setLane(laneRef.current) }
      if (e.key === 'ArrowRight' || e.key === 'd') { laneRef.current = Math.min(2, laneRef.current + 1); setLane(laneRef.current) }
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); doScoop() }
      if (e.key === 'w' || e.key === 'ArrowUp') { doWave() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const doScoop = () => {
    if (done) return
    const p = posRef.current
    const near = PILES.filter((pile) =>
      !clearedRef.current.includes(pile.id) &&
      pile.lane === laneRef.current &&
      Math.abs(pile.at - p) < scoopRadius
    )
    if (near.length) {
      const ids = near.map((n) => n.id)
      clearedRef.current = [...clearedRef.current, ...ids]
      setCleared(clearedRef.current)
      audio.scoop()
      setCombo((c) => {
        const next = c + ids.length
        if (next >= 20 && tierRef.current < 3) { tierRef.current = 3; audio.combo(3); onCallout?.('legend') }
        else if (next >= 10 && tierRef.current < 2) { tierRef.current = 2; audio.combo(2); onCallout?.('storm') }
        else if (next >= 5 && tierRef.current < 1) { tierRef.current = 1; audio.combo(1); onCallout?.('hotStreak') }
        return next
      })
    } else {
      audio.tap()
      setCombo((c) => Math.max(0, c - 1))
    }
  }

  const doWave = () => {
    if (done) return
    const p = posRef.current
    if (FRIENDLY_DOG_AT.some((at) => Math.abs(at - p) < 7) && !waved.includes(Math.floor(p / 10))) {
      audio.dog()
      setWaved((w) => [...w, Math.floor(p / 10)])
      setCombo((c) => c + (char.perkEffect.waveTips ? 4 : 2))
    }
  }

  // hazard collision check per frame on position change
  useEffect(() => {
    HAZARDS.forEach((h) => {
      if (h.lane === lane && Math.abs(h.at - pos) < 2.2 && !bumpRef.current) {
        bumpRef.current = true
        setBump(true)
        audio.hurt()
        onCallout?.('sprinkler')
        setCombo((c) => Math.max(0, c - 3))
      }
    })
  }, [pos, lane])

  const visiblePiles = PILES.filter((p) => p.at > pos - Math.max(8,scoopRadius) && p.at < pos + 34 && !cleared.includes(p.id))
  const visibleHazards = HAZARDS.filter((h) => h.at > pos - 8 && h.at < pos + 34)
  const lanePositions = [22, 50, 78]
  const groundY = at => `${78 - (at - pos) * 2}%`
  const inReach = p => p.lane === lane && Math.abs(p.at - pos) < scoopRadius
  const ready = visiblePiles.some(inReach)

  return (
    <div className={`route-game ${bump ? 'bumping' : ''}`}>
      <div className="route-hud">
        <button className="hud-quit" onClick={onQuit}>← Map</button>
        <div className="route-hud-center">
          <div className="progress-track"><div className="progress-fill" style={{ width: `${pos}%` }} /></div>
          <small>{market} · {urgency ? '🚨 Emergency' : 'Bike route'} · {Math.floor(pos)}%</small>
        </div>
        <div className="route-hud-right">
          <span className="combo">🔥 x{combo}</span>
          <span className={`timer ${timeLeft <= 10 ? 'low' : ''}`}>⏱ {timeLeft}s</span>
        </div>
      </div>

      <div className="game-viewport">
        <div className="sky" />
        <div className="sun" />
        <div className="hills" />
        <div className="houses">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={`house house-${i}`} style={{ left: `${((i * 18 - pos * 0.4) % 120 + 120) % 120 - 10}%` }}>🏠</div>)}
        </div>

        <div className="road">
          {[0, 1, 2].map((l) => <div key={l} className="lane-line" style={{ left: `${lanePositions[l] - 7}%` }} />)}
          {visiblePiles.map((p) => (
            <div key={p.id} className={`pile ${inReach(p)?'in-reach':''}`} style={{ left: `${lanePositions[p.lane]}%`, top: groundY(p.at) }}>💩</div>
          ))}
          {visibleHazards.map((h) => (
            <div key={h.id} className={`hazard hazard-${h.type}`} style={{ left: `${lanePositions[h.lane]}%`, top: groundY(h.at) }}>
              {h.type === 'sprinkler' ? '💦' : '🐶'}
            </div>
          ))}
          {FRIENDLY_DOG_AT.filter((at) => at > pos - 5 && at < pos + 28).map((at) => (
            <div key={at} className="friendly-dog" style={{ left: '78%', top: groundY(at) }}>🐕</div>
          ))}
          <div className="player" style={{ left: `${lanePositions[lane]}%`, '--player-color': char.color }}>
            <div className="player-char"><CharacterSprite character={char} /></div>
            {char.id !== 'sir-scoops' && <div className="player-bike">🚲</div>}
          </div>
        </div>

        <div className="hud-bottom">
          <div className="score-plate">🧹 Cleared <strong>{cleared.length}/{PILES.length}</strong></div>
          <div className="controls-hint">
            <span>← → steer</span><span>SPACE scoop</span><span>W wave 🐕</span>
          </div>
        </div>

        <div className="mobile-controls">
          <button onClick={() => { laneRef.current = Math.max(0, laneRef.current - 1); setLane(laneRef.current) }}>◀</button>
          <button className={`scoop-btn ${ready?'ready':''}`} onClick={doScoop}>{ready?'SCOOP NOW!':'SCOOP 🧹'}</button>
          <button onClick={() => { laneRef.current = Math.min(2, laneRef.current + 1); setLane(laneRef.current) }}>▶</button>
          <button onClick={doWave}>WAVE 🐕</button>
        </div>
      </div>
    </div>
  )
}
