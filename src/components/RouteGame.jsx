import React, { useCallback, useEffect, useRef, useState } from 'react'
import { characterById } from '../game/engine.js'
import CharacterSprite from './CharacterSprite.jsx'
import { audio } from '../audio/chiptune.js'

const ROAD_LENGTH = 100
const LANE_PATTERN = [1, 0, 2, 1, 2, 0, 2, 1, 0, 2, 1, 0, 1, 2]
const PILES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  at: 6 + i * 6.5 + (i % 3) * 0.6,
  lane: LANE_PATTERN[i],
}))
const HAZARDS = [
  { id: 'h1', at: 18, lane: 1, type: 'sprinkler' },
  { id: 'h2', at: 34, lane: 2, type: 'dog' },
  { id: 'h3', at: 50, lane: 0, type: 'sprinkler' },
  { id: 'h4', at: 66, lane: 1, type: 'dog' },
  { id: 'h5', at: 82, lane: 2, type: 'sprinkler' },
  { id: 'h6', at: 93, lane: 0, type: 'dog' },
]
const FRIENDLY_DOG_AT = [32, 67]
const COMBO_WINDOW = 1900
const TIERS = [5, 10, 14]

export default function RouteGame({ market, characterId, urgency, upgrades, level = 1, onFinish, onQuit, onCallout }) {
  const char = characterById(characterId)
  const bikeLevel = upgrades.bike || 0
  const scoopLevel = upgrades.scoop || 0
  const difficulty = 1 + Math.min(0.35, (level - 1) * 0.05)
  const baseSpeed = (0.45 + bikeLevel * 0.045) * (char.perkEffect.speed || 1) * (urgency ? 1.12 : 1) * difficulty
  const TOTAL_TIME = Math.max(17, Math.round((urgency ? 22 : 28) / (1 + Math.min(0.2, (level - 1) * 0.025))))

  const [pos, setPos] = useState(0)
  const [lane, setLane] = useState(1)
  const [cleared, setCleared] = useState([])
  const [combo, setCombo] = useState(0)
  const [comboClock, setComboClock] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME)
  const [bump, setBump] = useState(false)
  const [waved, setWaved] = useState([])
  const [done, setDone] = useState(false)
  const doneRef = useRef(false)
  const posRef = useRef(0)
  const laneRef = useRef(1)
  const clearedRef = useRef([])
  const bumpRef = useRef(false)
  const tierRef = useRef(0)
  const comboRef = useRef(0)
  const comboTimeRef = useRef(Date.now())
  const mistakesRef = useRef(0)
  const hitRef = useRef(new Set())
  const wavedRef = useRef([])

  const scoopRadius = 3.6 + scoopLevel * 0.5 + (char.perkEffect.scoopRadius ? 1.5 : 0)

  const breakCombo = useCallback((reason) => {
    if (comboRef.current > 0) {
      comboRef.current = 0
      tierRef.current = 0
      setCombo(0)
      setComboClock(0)
      if (reason) onCallout?.('comboLost')
    }
    comboTimeRef.current = Date.now()
  }, [onCallout])

  const finish = useCallback((performance, late = false) => {
    if (doneRef.current) return
    doneRef.current = true
    setDone(true)
    onFinish({
      performance: Math.max(0, Math.min(1, performance)),
      late,
      urgency,
      mistakes: mistakesRef.current,
      combo: comboRef.current,
      cleared: clearedRef.current.length,
      total: PILES.length,
      character: char,
    })
  }, [onFinish, urgency, char])

  // main ride loop
  useEffect(() => {
    if (done) return
    let last = performance.now()
    const tick = () => {
      const now = performance.now()
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const finalBoost = posRef.current > 82 && char.perkEffect.finalSpeed ? char.perkEffect.finalSpeed : 1
      const next = Math.min(ROAD_LENGTH, posRef.current + baseSpeed * finalBoost * dt * 12)
      posRef.current = next
      setPos(next)

      if (bumpRef.current && Math.random() < 0.08) { bumpRef.current = false; setBump(false) }

      if (comboRef.current > 0) {
        const left = 1 - (Date.now() - comboTimeRef.current) / COMBO_WINDOW
        setComboClock(Math.max(0, left))
        if (left <= 0) breakCombo()
      }

      if (next >= ROAD_LENGTH) {
        const cleanRatio = clearedRef.current.length / PILES.length
        const timeRatio = timeLeft / TOTAL_TIME
        const comboRatio = Math.min(1, comboRef.current / TIERS[2])
        const dogRatio = Math.min(1, wavedRef.current.length / FRIENDLY_DOG_AT.length)
        const penalty = Math.min(0.3, mistakesRef.current * 0.05)
        const performance = Math.max(0, Math.min(1,
          cleanRatio * 0.55 + timeRatio * 0.1 + comboRatio * 0.2 + dogRatio * 0.05 + 0.12 - penalty
        ))
        finish(performance)
      }
    }
    const id = setInterval(tick, 16)
    return () => clearInterval(id)
  }, [baseSpeed, breakCombo, char, done, finish, timeLeft, TOTAL_TIME])

  // countdown
  useEffect(() => {
    if (done) return
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [done])
  useEffect(() => { if (timeLeft <= 0) finish(0, true) }, [timeLeft, finish])

  // keyboard controls
  useEffect(() => {
    if (done) return
    const onKey = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') { laneRef.current = Math.max(0, laneRef.current - 1); setLane(laneRef.current) }
      if (e.key === 'ArrowRight' || e.key === 'd') { laneRef.current = Math.min(2, laneRef.current + 1); setLane(laneRef.current) }
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); doScoop() }
      if (e.key === 'w' || e.key === 'ArrowUp') { e.preventDefault(); doWave() }
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
      const now = Date.now()
      if (now - comboTimeRef.current > COMBO_WINDOW) { comboRef.current = 0; tierRef.current = 0 }
      comboRef.current += ids.length
      comboTimeRef.current = now
      setCombo(comboRef.current)
      if (comboRef.current >= TIERS[2] && tierRef.current < 3) { tierRef.current = 3; audio.combo(3); onCallout?.('legend') }
      else if (comboRef.current >= TIERS[1] && tierRef.current < 2) { tierRef.current = 2; audio.combo(2); onCallout?.('storm') }
      else if (comboRef.current >= TIERS[0] && tierRef.current < 1) { tierRef.current = 1; audio.combo(1); onCallout?.('hotStreak') }
    } else {
      // Wild swings now break the chain instead of merely ticking it down.
      audio.hurt()
      mistakesRef.current += 1
      setMistakes(mistakesRef.current)
      breakCombo('wrong-scoop')
    }
  }

  const doWave = () => {
    if (done) return
    const p = posRef.current
    const dogIndex = FRIENDLY_DOG_AT.findIndex((at, i) => Math.abs(at - p) < 3.5 && !wavedRef.current.includes(i))
    if (dogIndex >= 0) {
      audio.dog()
      wavedRef.current = [...wavedRef.current, dogIndex]
      setWaved(wavedRef.current)
      comboRef.current += 2
      comboTimeRef.current = Date.now()
      setCombo(comboRef.current)
    }
  }

  // hazard collision
  useEffect(() => {
    HAZARDS.forEach((h) => {
      if (h.lane === lane && Math.abs(h.at - pos) < 2.4 && !hitRef.current.has(h.id)) {
        hitRef.current.add(h.id)
        bumpRef.current = true
        setBump(true)
        audio.hurt()
        setTimeLeft((t) => Math.max(0, t - 1))
        mistakesRef.current += 1
        setMistakes(mistakesRef.current)
        breakCombo('hazard')
        onCallout?.(h.type === 'dog' ? 'dog' : 'sprinkler')
      }
    })
  }, [breakCombo, lane, onCallout, pos])

  const visiblePiles = PILES.filter((p) => p.at > pos - Math.max(8, scoopRadius) && p.at < pos + 32 && !cleared.includes(p.id))
  const visibleHazards = HAZARDS.filter((h) => h.at > pos - 8 && h.at < pos + 32)
  const lanePositions = [22, 50, 78]
  const groundY = at => `${78 - (at - pos) * 2}%`
  const inReach = p => p.lane === lane && Math.abs(p.at - pos) < scoopRadius
  const ready = visiblePiles.some(inReach)

  const steer = (dir) => {
    laneRef.current = clamp(laneRef.current + dir, 0, 2)
    setLane(laneRef.current)
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  const tier = combo >= TIERS[2] ? 3 : combo >= TIERS[1] ? 2 : combo >= TIERS[0] ? 1 : 0

  return (
    <div className={`route-game ${bump ? 'bumping' : ''} tier-${tier}`}>
      <div className="route-hud">
        <button className="hud-quit" onClick={onQuit}>← Map</button>
        <div className="route-hud-center">
          <div className="progress-track"><div className="progress-fill" style={{ width: `${pos}%` }} /></div>
          <small>{market} · {urgency ? '🚨 Emergency' : 'Bike route'} · {Math.floor(pos)}% · ⚠ {mistakes}</small>
        </div>
        <div className="route-hud-right">
          <span className="combo">🔥 x{combo}</span>
          <span className={`timer ${timeLeft <= 6 ? 'low' : ''}`}>⏱ {timeLeft}s</span>
        </div>
      </div>

      <div className="pressure-bar route-pressure">
        <div className="combo-meter"><span>🔥 CHAIN WINDOW</span><i style={{ width: `${comboClock * 100}%` }} /></div>
        <div className="mistake-meter">MISS = CHAIN BREAK · HAZARD = -1s</div>
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
          <div className="score-plate">🧹 {cleared.length}/{PILES.length} · 🚨 {mistakes} misses</div>
          <div className="controls-hint">
            <span>← → steer</span><span>SPACE scoop</span><span>W wave 🐕</span>
          </div>
        </div>

        <div className="mobile-controls">
          <button onClick={() => steer(-1)}>◀</button>
          <button className={`scoop-btn ${ready?'ready':''}`} onClick={doScoop}>{ready?'SCOOP NOW!':'SCOOP 🧹'}</button>
          <button onClick={() => steer(1)}>▶</button>
          <button onClick={doWave}>WAVE 🐕</button>
        </div>
      </div>
    </div>
  )
}
