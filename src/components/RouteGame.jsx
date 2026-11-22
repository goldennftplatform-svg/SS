import React, { useCallback, useEffect, useRef, useState } from 'react'
import { characterById } from '../game/engine.js'
import CharacterSprite from './CharacterSprite.jsx'
import { CedarHouse, DispatchSeal, FieldScoop } from './RouteMarks.jsx'
import { audio } from '../audio/chiptune.js'

const LENGTH = 100
const VIEW = 36
const HORIZON = 30
const ROAD_TOP = 9
const ROAD_BOTTOM = 46
const SCOOP_WINDOW = 9
const COMBO_WINDOW = 2600
const TIERS = [4, 8, 12]
const HOUSES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  at: 8 + i * 7.4 + (i % 3) * 0.5,
  side: i % 2 === 0 ? -1 : 1,
  dog: i % 5 === 4,
}))
const HAZARDS = [
  { id: 'h1', at: 15, lane: 0, type: 'sprinkler' },
  { id: 'h2', at: 27, lane: -1, type: 'dog' },
  { id: 'h3', at: 39, lane: 1, type: 'cone' },
  { id: 'h4', at: 52, lane: 0, type: 'dog' },
  { id: 'h5', at: 64, lane: -1, type: 'sprinkler' },
  { id: 'h6', at: 76, lane: 1, type: 'cone' },
  { id: 'h7', at: 88, lane: 0, type: 'sprinkler' },
]
const WAVE_AT = [24, 58, 86]
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default function RouteGame({ market, characterId, urgency, upgrades, level = 1, onFinish, onQuit, onCallout }) {
  const char = characterById(characterId)
  const bikeLevel = upgrades.bike || 0
  const scoopLevel = upgrades.scoop || 0
  const difficulty = 1 + Math.min(0.35, (level - 1) * 0.05)
  const speed = (5 + bikeLevel * 0.35 + scoopLevel * 0.05) * (char.perkEffect.speed || 1) * (urgency ? 1.16 : 1) * difficulty
  const TOTAL_TIME = Math.max(18, Math.round((urgency ? 23 : 28) / (1 + Math.min(0.2, (level - 1) * 0.025))))
  const scoopWindow = Math.max(6, SCOOP_WINDOW - (level - 1) * 0.25)

  const [distance, setDistance] = useState(0)
  const [steer, setSteer] = useState(0)
  const [houses, setHouses] = useState(() => HOUSES.map((h) => ({ ...h, clean: false, missed: false })))
  const [combo, setCombo] = useState(0)
  const [comboClock, setComboClock] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME)
  const [waved, setWaved] = useState([])
  const [banner, setBanner] = useState('🧹 Ride the curb · scoop the glowing houses · dodge the street!')
  const [bump, setBump] = useState(false)
  const [done, setDone] = useState(false)

  const distanceRef = useRef(0)
  const steerRef = useRef(0)
  const housesRef = useRef(houses)
  const comboRef = useRef(0)
  const comboTimeRef = useRef(Date.now())
  const mistakesRef = useRef(0)
  const timeRef = useRef(TOTAL_TIME)
  const wavedRef = useRef([])
  const keysRef = useRef({})
  const hitRef = useRef(new Set())
  const tierRef = useRef(0)
  const bannerTimer = useRef(null)
  const bumpTimer = useRef(null)
  const doneRef = useRef(false)

  timeRef.current = timeLeft

  const flashBanner = useCallback((text, ms = 1600) => {
    setBanner(text)
    clearTimeout(bannerTimer.current)
    bannerTimer.current = window.setTimeout(() => setBanner(null), ms)
  }, [])

  const breakCombo = useCallback(() => {
    if (comboRef.current > 0) {
      comboRef.current = 0
      tierRef.current = 0
      setCombo(0)
      setComboClock(0)
      onCallout?.('comboLost')
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
      cleared: housesRef.current.filter((h) => h.clean).length,
      total: HOUSES.length,
      character: char,
    })
  }, [onFinish, urgency, char])

  const scoop = useCallback((side) => {
    if (doneRef.current) return
    const d = distanceRef.current
    const target = housesRef.current.find((h) => !h.clean && !h.missed && h.side === side && Math.abs(h.at - d) <= scoopWindow)
    if (!target) {
      audio.hurt()
      mistakesRef.current += 1
      setMistakes(mistakesRef.current)
      breakCombo()
      flashBanner(side < 0 ? '↖️ NOTHING TO SCOOP LEFT! Chain lost' : '↗️ NOTHING TO SCOOP RIGHT! Chain lost')
      return
    }
    const next = housesRef.current.map((h) => h.id === target.id ? { ...h, clean: true } : h)
    housesRef.current = next
    setHouses(next)
    audio.scoop()
    const now = Date.now()
    if (now - comboTimeRef.current > COMBO_WINDOW) { comboRef.current = 0; tierRef.current = 0 }
    comboRef.current += 1
    comboTimeRef.current = now
    setCombo(comboRef.current)
    setComboClock(1)
    if (comboRef.current >= TIERS[2] && tierRef.current < 3) { tierRef.current = 3; audio.combo(3); onCallout?.('legend') }
    else if (comboRef.current >= TIERS[1] && tierRef.current < 2) { tierRef.current = 2; audio.combo(2); onCallout?.('storm') }
    else if (comboRef.current >= TIERS[0] && tierRef.current < 1) { tierRef.current = 1; audio.combo(1); onCallout?.('hotStreak') }
    flashBanner(`✨ CLEANED HOUSE #${target.id + 1} · 🔥 x${comboRef.current}`)
  }, [breakCombo, flashBanner, onCallout, scoopWindow])

  const wave = useCallback(() => {
    if (doneRef.current) return
    const d = distanceRef.current
    const idx = WAVE_AT.findIndex((at, i) => Math.abs(at - d) < 3.5 && !wavedRef.current.includes(i))
    if (idx < 0) return
    wavedRef.current = [...wavedRef.current, idx]
    setWaved(wavedRef.current)
    comboRef.current += 1
    comboTimeRef.current = Date.now()
    setCombo(comboRef.current)
    setComboClock(1)
    audio.dog()
    flashBanner('🐕 GOOD DOG! Chain +1')
  }, [flashBanner])

  // ride loop: steering, rolling road, curb targets, hazards, scoring
  useEffect(() => {
    if (done) return
    let last = performance.now()
    const id = setInterval(() => {
      const now = performance.now()
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const k = keysRef.current
      const dir = (k.right ? 1 : 0) - (k.left ? 1 : 0)
      if (dir) {
        steerRef.current = clamp(steerRef.current + dir * 2.4 * dt, -1, 1)
        setSteer(steerRef.current)
      }

      const finalBoost = distanceRef.current > 82 && char.perkEffect.finalSpeed ? char.perkEffect.finalSpeed : 1
      const next = Math.min(LENGTH, distanceRef.current + speed * finalBoost * dt)
      distanceRef.current = next
      setDistance(next)

      if (comboRef.current > 0) {
        const left = 1 - (Date.now() - comboTimeRef.current) / COMBO_WINDOW
        setComboClock(Math.max(0, left))
        if (left <= 0) breakCombo()
      }

      let changed = false
      HOUSES.forEach((h) => {
        const state = housesRef.current[h.id]
        if (!state.clean && !state.missed && next > h.at + scoopWindow * 0.35) {
          housesRef.current[h.id] = { ...state, missed: true }
          changed = true
          mistakesRef.current += 1
          breakCombo()
          flashBanner(`🏠 HOUSE #${h.id + 1} MISSED! Chain lost`)
        }
      })
      if (changed) { setHouses([...housesRef.current]); setMistakes(mistakesRef.current) }

      HAZARDS.forEach((h) => {
        if (hitRef.current.has(h.id)) return
        if (Math.abs(next - h.at) < 1.7 && Math.abs(steerRef.current - h.lane) < 0.42) {
          hitRef.current.add(h.id)
          setBump(true)
          clearTimeout(bumpTimer.current)
          bumpTimer.current = window.setTimeout(() => setBump(false), 260)
          audio.hurt()
          setTimeLeft((t) => Math.max(0, t - 1))
          mistakesRef.current += 1
          setMistakes(mistakesRef.current)
          breakCombo()
          onCallout?.(h.type === 'dog' ? 'dog' : 'sprinkler')
          flashBanner(h.type === 'dog' ? '🐶 ROAD DOG! -1s · chain lost' : '💦 HAZARD HIT! -1s · chain lost')
        }
      })

      if (next >= LENGTH) {
        const clean = housesRef.current.filter((h) => h.clean).length
        const cleanRatio = clean / HOUSES.length
        const timeRatio = timeRef.current / TOTAL_TIME
        const comboRatio = Math.min(1, comboRef.current / TIERS[2])
        const waveRatio = Math.min(1, wavedRef.current.length / WAVE_AT.length)
        const penalty = Math.min(0.3, mistakesRef.current * 0.05)
        const performance = cleanRatio * 0.58 + timeRatio * 0.1 + comboRatio * 0.2 + waveRatio * 0.05 + 0.12 - penalty
        finish(performance)
      }
    }, 16)
    return () => clearInterval(id)
  }, [breakCombo, char, done, finish, flashBanner, onCallout, scoopWindow, speed, TOTAL_TIME])

  // departure countdown
  useEffect(() => {
    if (done) return
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [done])
  useEffect(() => { if (timeLeft <= 0) finish(0, true) }, [timeLeft, finish])

  // keyboard: steer with A/D or arrows, scoop left with Q, right with E, SPACE auto
  useEffect(() => {
    if (done) return
    const down = (e) => {
      const key = e.key
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') keysRef.current.left = true
      if (key === 'ArrowRight' || key === 'd' || key === 'D') keysRef.current.right = true
      if (key === 'q' || key === 'Q') scoop(-1)
      if (key === 'e' || key === 'E') scoop(1)
      if (key === ' ') { e.preventDefault(); scoop(steerRef.current < 0 ? -1 : 1) }
      if (key === 'w' || key === 'W' || key === 'ArrowUp') { e.preventDefault(); wave() }
    }
    const up = (e) => {
      const key = e.key
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') keysRef.current.left = false
      if (key === 'ArrowRight' || key === 'd' || key === 'D') keysRef.current.right = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [done, scoop, wave])

  useEffect(() => {
    if (combo >= TIERS[2] && tierRef.current < 3) { tierRef.current = 3; audio.combo(3); onCallout?.('legend') }
    else if (combo >= TIERS[1] && tierRef.current < 2) { tierRef.current = 2; audio.combo(2); onCallout?.('storm') }
    else if (combo >= TIERS[0] && tierRef.current < 1) { tierRef.current = 1; audio.combo(1); onCallout?.('hotStreak') }
  }, [combo, onCallout])

  useEffect(() => () => { clearTimeout(bannerTimer.current); clearTimeout(bumpTimer.current) }, [])

  const project = (at) => {
    const depth = at - distance
    if (depth < -3 || depth > VIEW) return null
    const t = clamp(1 - Math.max(0, depth) / VIEW, 0, 1)
    const p = Math.pow(t, 1.7)
    return {
      y: HORIZON + (100 - HORIZON) * p,
      scale: 0.3 + t,
      half: ROAD_TOP + (ROAD_BOTTOM - ROAD_TOP) * p,
      t,
    }
  }

  const dashStep = 6
  const dashStart = Math.floor(distance / dashStep) * dashStep
  const dashes = []
  for (let w = dashStart + dashStep; w < distance + VIEW; w += dashStep) {
    const pr = project(w)
    if (pr) dashes.push(pr)
  }

  const cleanCount = houses.filter((h) => h.clean).length
  const missedCount = houses.filter((h) => h.missed).length
  const tier = combo >= TIERS[2] ? 3 : combo >= TIERS[1] ? 2 : combo >= TIERS[0] ? 1 : 0
  const hold = (key, down) => { keysRef.current[key] = down }

  return (
    <div className={`ride-game ${urgency ? 'urgent' : ''} tier-${tier} ${bump ? 'bumping' : ''}`}>
      <div className="ride-hud">
        <button className="hud-quit" onClick={onQuit}>← Map</button>
        <strong>{market}</strong>
        <span className="ride-mode">{urgency ? '🚨 RUSH CLEANUP' : '🚲 STREET ROUTE'}</span>
        <div className="ride-hud-right">
          <span className="ride-chain">🔥 x{combo}<i style={{ width: `${comboClock * 100}%` }} /></span>
          <span className={`timer ${timeLeft <= 6 ? 'low' : ''}`}>⏱ {timeLeft}s</span>
        </div>
      </div>

      <div className="ride-minimap" aria-label="Route house tracker">
        <div className="ride-mini-track">
          <i className="ride-mini-fill" style={{ width: `${distance}%` }} />
          {houses.map((h) => (
            <span key={h.id}
              className={`ride-mini-house ${h.clean ? 'clean' : ''} ${h.missed ? 'missed' : ''} ${!h.clean && !h.missed && Math.abs(h.at - distance) <= scoopWindow ? 'active' : ''}`}
              style={{ left: `${h.at}%` }}>
               {h.clean ? <DispatchSeal /> : h.missed ? '❌' : '🏠'}
            </span>
          ))}
          <b className="ride-mini-bike" style={{ left: `${distance}%` }}>🚲</b>
        </div>
        <div className="ride-mini-meta">
          <span>🏠 {cleanCount}/{HOUSES.length} cleaned</span>
          <span>❌ {missedCount} missed</span>
          <span>⚠ {mistakes} mistakes</span>
          <span>🐕 {waved.length}/{WAVE_AT.length}</span>
        </div>
      </div>

      <div className="ride-viewport">
        <div className="ride-sky" style={{ backgroundPositionX: `${-distance * 2}px` }} />
        <div className={`ride-sun ${urgency ? 'moon' : ''}`} />
        <div className="ride-hills" style={{ backgroundPositionX: `${-distance * 3}px` }} />
        <div className="ride-trees" style={{ backgroundPositionX: `${-distance * 6}px` }} />

        <svg className="ride-road" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="rideRoad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6b7c70" />
              <stop offset="100%" stopColor="#3f5147" />
            </linearGradient>
          </defs>
          <polygon points={`${50 - ROAD_TOP} ${HORIZON}, ${50 + ROAD_TOP} ${HORIZON}, ${50 + ROAD_BOTTOM} 100, ${50 - ROAD_BOTTOM} 100`}
            fill="url(#rideRoad)" stroke="#28382f" strokeWidth="0.6" />
          {dashes.map((pr, i) => (
            <g key={i}>
              <line x1={50 - pr.half * 0.5} y1={pr.y} x2={50 - pr.half * 0.5} y2={pr.y + 3 * pr.scale}
                stroke="#fff6df" strokeWidth={0.5 * pr.scale} opacity=".65" />
              <line x1={50 + pr.half * 0.5} y1={pr.y} x2={50 + pr.half * 0.5} y2={pr.y + 3 * pr.scale}
                stroke="#fff6df" strokeWidth={0.5 * pr.scale} opacity=".65" />
            </g>
          ))}
        </svg>

        {houses.slice().reverse().map((h) => {
          const pr = project(h.at)
          if (!pr) return null
          const x = 50 + h.side * (pr.half + 7 * pr.t)
          const targetX = 50 + h.side * pr.half * 0.86
          const active = !h.clean && !h.missed && Math.abs(h.at - distance) <= scoopWindow
          return (
            <React.Fragment key={h.id}>
              <div className={`ride-house ${h.clean ? 'clean' : ''} ${h.missed ? 'missed' : ''} ${active ? 'active' : ''}`}
                style={{ left: `${x}%`, top: `${pr.y}%`, transform: `translate(-50%,-100%) scale(${pr.scale})` }}>
                 <CedarHouse lot={h.id} /><small>#{h.id + 1}{h.clean && <DispatchSeal />}</small>
              </div>
              {!h.clean && (
                <div className={`ride-target ${active ? 'active' : ''} ${h.missed ? 'missed' : ''}`}
                  style={{ left: `${targetX}%`, top: `${pr.y}%`, transform: `translate(-50%,-50%) scale(${pr.scale})` }}>
                  💩
                </div>
              )}
              {h.dog && !h.clean && (
                <div className="ride-house-dog" style={{ left: `${x + h.side * 6}%`, top: `${pr.y}%`, transform: `translate(-50%,-50%) scale(${pr.scale})` }}>🐕</div>
              )}
            </React.Fragment>
          )
        })}

        {HAZARDS.slice().reverse().map((h) => {
          const pr = project(h.at)
          if (!pr || hitRef.current.has(h.id)) return null
          return (
            <div key={h.id} className={`ride-hazard ${h.type}`}
              style={{ left: `${50 + h.lane * pr.half * 0.5}%`, top: `${pr.y}%`, transform: `translate(-50%,-50%) scale(${pr.scale})` }}>
              {h.type === 'sprinkler' ? '💦' : h.type === 'dog' ? '🐶' : '🚧'}
            </div>
          )
        })}

        {WAVE_AT.map((at, i) => {
          const pr = project(at)
          if (!pr || waved.includes(i)) return null
          const side = i % 2 === 0 ? -1 : 1
          return (
            <div key={i} className="ride-friendly-dog"
              style={{ left: `${50 + side * (pr.half + 4 * pr.t)}%`, top: `${pr.y}%`, transform: `translate(-50%,-50%) scale(${pr.scale})` }}>
              🐕
            </div>
          )
        })}

        <div className={`ride-player ${bump ? 'bump' : ''}`}
          style={{ left: `${50 + steer * 26}%`, transform: `translateX(-50%) rotate(${steer * 8}deg)` }}>
          <CharacterSprite character={char} pose="ride" />
          <span className="ride-broom"><FieldScoop /></span>
        </div>

        {banner && <div className="ride-banner">{banner}</div>}

        <div className="ride-bottom">
          <div className="ride-score-plate">🧹 {cleanCount}/{HOUSES.length} · 🔥 x{combo}</div>
          <div className="ride-hint"><span>◀ ▶ steer</span><span>Q left · E right scoop</span><span>SPACE auto</span><span>W wave 🐕</span></div>
        </div>

        <div className="ride-controls">
          <button onPointerDown={() => hold('left', true)} onPointerUp={() => hold('left', false)} onPointerLeave={() => hold('left', false)}>◀</button>
          <button className="ride-scoop" aria-label="Scoop left" onPointerDown={() => scoop(-1)}><FieldScoop /> LEFT</button>
          <button className="ride-scoop" aria-label="Scoop right" onPointerDown={() => scoop(1)}>RIGHT <FieldScoop /></button>
          <button onPointerDown={() => hold('right', true)} onPointerUp={() => hold('right', false)} onPointerLeave={() => hold('right', false)}>▶</button>
          <button className="ride-wave" onPointerDown={wave}>WAVE 🐕</button>
        </div>
      </div>
    </div>
  )
}
