import React, { useCallback, useEffect, useRef, useState } from 'react'
import { YARD_PHASES } from '../data/gameData.js'
import { characterById } from '../game/engine.js'
import CharacterSprite from './CharacterSprite.jsx'
import { audio } from '../audio/chiptune.js'

const BUSHES = 6, STRIPS = 8, LEAVES = 8
const MAX_SCORE = BUSHES * 5 + BUSHES * 20 + STRIPS * 15 + LEAVES * 15 + 150
const PICKUP_RADIUS = 8
const rand = (min, max) => min + Math.random() * (max - min)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

function makeObjects() {
  const bushes = Array.from({ length: BUSHES }, (_, i) => ({ id: `b${i}`, x: rand(10, 90), y: rand(14, 84), found: false }))
  const poops = bushes.map((b, i) => ({ id: `p${i}`, x: clamp(b.x + rand(-6, 6), 8, 92), y: clamp(b.y + rand(-6, 6), 12, 88), found: false, scooped: false }))
  const strips = Array.from({ length: STRIPS }, (_, i) => ({ id: `s${i}`, x: rand(8, 92), y: rand(12, 88), mowed: false }))
  const leaves = Array.from({ length: LEAVES }, (_, i) => ({ id: `l${i}`, x: rand(8, 92), y: rand(12, 88), raked: false }))
  return { bushes, poops, strips, leaves }
}

export default function YardJob({ market, characterId, perks = [], upgrades = {}, onFinish, onQuit, onCallout }) {
  const char = characterById(characterId)
  const hasPerk = (id) => perks.includes(id)
  const speed = 30 + (upgrades.bike || 0) * 3.5 + (char.perkEffect.speed || 1) * 5
  const SHIFT = 58 + (hasPerk('rally-timer') ? 10 : 0)

  const [objects, setObjects] = useState(makeObjects)
  const [player, setPlayer] = useState({ x: 50, y: 82 })
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(SHIFT)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [banner, setBanner] = useState('🐾 MOVE with WASD/arrows · scoop on contact!')
  const [chaos, setChaos] = useState(null)
  const [moving, setMoving] = useState(false)
  const [popping, setPopping] = useState(false)
  const [ended, setEnded] = useState(false)

  const objectsRef = useRef(objects); objectsRef.current = objects
  const playerRef = useRef(player)
  const keysRef = useRef({})
  const movingRef = useRef(false)
  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const phaseRef = useRef(0)
  const phaseLockRef = useRef(false)
  const finishedRef = useRef(false)
  const tierRef = useRef(0)
  const lastCollectRef = useRef(Date.now())
  const collectRef = useRef(() => {})
  const popTimer = useRef(null)

  const commit = useCallback((next) => { objectsRef.current = next; setObjects(next) }, [])

  const bumpCombo = useCallback((delta) => {
    comboRef.current = Math.max(0, comboRef.current + delta)
    setCombo(comboRef.current)
  }, [])

  const addScore = useCallback((n, comboGain = 0) => {
    scoreRef.current += n
    setScore(scoreRef.current)
    lastCollectRef.current = Date.now()
    if (comboGain) bumpCombo(comboGain)
  }, [bumpCombo])

  const award = useCallback((base, comboGain = 0) => {
    const mult = 1 + Math.min(1, Math.floor(comboRef.current / 5) * 0.25)
    addScore(Math.round(base * mult), comboGain)
  }, [addScore])

  const finish = useCallback((late) => {
    if (finishedRef.current) return
    finishedRef.current = true
    setEnded(true)
    const completion = Math.min(1, scoreRef.current / MAX_SCORE)
    const early = late ? 0 : Math.min(0.15, (timeLeft / SHIFT) * 0.15)
    const performance = clamp(completion * (late ? 0.55 : 1) + early, 0, 1)
    if (late) { audio.hurt(); onCallout?.('late') }
    else { audio.fanfare(); onCallout?.('onTime') }
    onFinish({ performance, late, character: char, perks, completion })
  }, [timeLeft, SHIFT, onFinish, char, perks, onCallout])

  const advancePhase = useCallback(() => {
    if (phaseLockRef.current || finishedRef.current) return
    phaseLockRef.current = true
    addScore(50)
    audio.phase()
    onCallout?.('phase')
    setBanner('✨ STATION CLEAR! +50')
    const next = phaseRef.current + 1
    window.setTimeout(() => {
      if (next >= YARD_PHASES.length) finish(false)
      else {
        phaseRef.current = next
        setPhaseIndex(next)
        setBanner(`${YARD_PHASES[next].icon} ${YARD_PHASES[next].hint}`)
        phaseLockRef.current = false
      }
    }, 700)
  }, [addScore, finish, onCallout])

  // ---- movement + auto-collect ----
  const collect = useCallback(() => {
    if (phaseLockRef.current || finishedRef.current) return
    const p = playerRef.current
    const cur = objectsRef.current
    const radius = PICKUP_RADIUS + (hasPerk('magnet-bag') ? 5 : 0)
    // Rendered targets use percentage positions; use distance in percent so
    // the sprite actually overlaps the piles when it scoops them.
    const near = (o) => Math.hypot(p.x - o.x, p.y - o.y) < radius
    const phase = phaseRef.current
    let changed = false
    let points = 0
    let gain = 0

    if (phase === 0) {
      const hits = cur.bushes.filter((b) => !b.found && near(b))
      if (hits.length) {
        changed = true
        const bushes = cur.bushes.map((b) => hits.some((h) => h.id === b.id) ? { ...b, found: true } : b)
        const poops = cur.poops.map((o) => hits.some((h) => o.id === `p${h.id.slice(1)}`) ? { ...o, found: true } : o)
        commit({ ...cur, bushes, poops })
        points = 5 * hits.length; gain = hits.length
        if (!foundOnce.current) { foundOnce.current = true; onCallout?.('found') }
      }
    } else if (phase === 1) {
      const hits = cur.poops.filter((o) => o.found && !o.scooped && near(o))
      if (hits.length) {
        changed = true
        const poops = cur.poops.map((o) => hits.some((h) => h.id === o.id) ? { ...o, scooped: true } : o)
        commit({ ...cur, poops })
        points = (hasPerk('golden-scoop') ? 40 : 20) * hits.length; gain = hits.length
      }
    } else if (phase === 2) {
      const hits = cur.strips.filter((o) => !o.mowed && near(o))
      if (hits.length) {
        changed = true
        const strips = cur.strips.map((o) => hits.some((h) => h.id === o.id) ? { ...o, mowed: true } : o)
        commit({ ...cur, strips })
        points = 15 * hits.length; gain = hits.length
      }
    } else {
      const hits = cur.leaves.filter((o) => !o.raked && near(o))
      if (hits.length) {
        changed = true
        const leaves = cur.leaves.map((o) => hits.some((h) => h.id === o.id) ? { ...o, raked: true } : o)
        commit({ ...cur, leaves })
        points = 15 * hits.length; gain = hits.length
      }
    }

    if (changed) {
      award(points, gain)
      audio.scoop()
      setPopping(true)
      clearTimeout(popTimer.current)
      popTimer.current = window.setTimeout(() => setPopping(false), 180)
      const allDone =
        (phase === 0 && objectsRef.current.bushes.every((b) => b.found)) ||
        (phase === 1 && objectsRef.current.poops.every((p) => p.scooped)) ||
        (phase === 2 && objectsRef.current.strips.every((s) => s.mowed)) ||
        (phase === 3 && objectsRef.current.leaves.every((l) => l.raked))
      if (allDone) advancePhase()
    }
  }, [award, commit, hasPerk, onCallout, advancePhase])
  collectRef.current = collect
  const foundOnce = useRef(false)

  useEffect(() => {
    if (ended) return
    let last = performance.now()
    // setInterval (rather than rAF) keeps the sprint alive in background tabs
    // and low-power mobile browsers where animation frames get throttled.
    const tick = () => {
      const now = performance.now()
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const k = keysRef.current
      const dx = (k.right ? 1 : 0) - (k.left ? 1 : 0)
      const dy = (k.down ? 1 : 0) - (k.up ? 1 : 0)
      const isMoving = !!(dx || dy)
      if (isMoving !== movingRef.current) { movingRef.current = isMoving; setMoving(isMoving) }
      if (isMoving) {
        const n = Math.hypot(dx, dy) || 1
        const slow = chaos?.type === 'sprinkler' && !hasPerk('hearth-shield') ? 0.55 : 1
        const next = {
          x: clamp(playerRef.current.x + (dx / n) * speed * slow * dt, 6, 94),
          y: clamp(playerRef.current.y + (dy / n) * speed * slow * dt, 10, 90),
        }
        playerRef.current = next
        setPlayer(next)
      }
      if (Date.now() - lastCollectRef.current > 3200 && comboRef.current > 0) bumpCombo(-comboRef.current)
      collectRef.current()
    }
    const id = setInterval(tick, 16)
    return () => clearInterval(id)
  }, [speed, ended, chaos?.type, hasPerk, bumpCombo])

  // departure clock
  useEffect(() => {
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => { if (timeLeft <= 0) finish(true) }, [timeLeft, finish])

  // keyboard
  useEffect(() => {
    const set = (key, down) => {
      const map = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down' }
      if (map[key]) keysRef.current[map[key]] = down
    }
    const down = (e) => { set(e.key, true); if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault() }
    const up = (e) => set(e.key, false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  // combo tiers
  useEffect(() => {
    if (combo >= 20 && tierRef.current < 3) { tierRef.current = 3; audio.combo(3); onCallout?.('legend') }
    else if (combo >= 10 && tierRef.current < 2) { tierRef.current = 2; audio.combo(2); onCallout?.('storm') }
    else if (combo >= 5 && tierRef.current < 1) { tierRef.current = 1; audio.combo(1); onCallout?.('hotStreak') }
  }, [combo, onCallout])

  // chaos
  useEffect(() => {
    if (phaseIndex === 0 || ended) return
    const id = setInterval(() => {
      if (chaos || phaseLockRef.current || finishedRef.current) return
      if (Math.random() > 0.45) return
      const types = ['sprinkler', 'dog', 'gust']
      const type = types[Math.floor(Math.random() * types.length)]
      setChaos({ type, id: Date.now() })
      if (type === 'sprinkler') {
        audio.hurt(); onCallout?.('sprinkler')
        if (hasPerk('hearth-shield')) { award(40); setBanner('🛡️ SHIELD BLOCK! +40') }
        else { if (!hasPerk('combo-keeper')) bumpCombo(-3); setBanner('💦 SPRINKLER! SLOWED DOWN') }
      } else if (type === 'dog') {
        audio.dog(); onCallout?.('dog'); setBanner('🐕 LOOSE DOG! TAP IT!')
      } else {
        setBanner('🍃 LEAF GUST!')
        const cur = objectsRef.current
        commit({ ...cur, leaves: cur.leaves.map((l) => l.raked ? l : { ...l, x: rand(8, 92), y: rand(12, 88) }) })
      }
      window.setTimeout(() => { setChaos(null); setBanner(null) }, 2600)
    }, 6000)
    return () => clearInterval(id)
  }, [phaseIndex, ended, chaos, hasPerk, award, bumpCombo, commit, onCallout])

  const onChaosDog = () => {
    if (chaos?.type !== 'dog') return
    audio.dog(); award(30, 2); setChaos(null)
    setBanner('🎉 GOOD DOG! +30')
    window.setTimeout(() => setBanner(null), 1300)
  }

  const hold = (key, down) => { keysRef.current[key] = down }
  const phase = YARD_PHASES[phaseIndex]
  const comboTier = combo >= 20 ? 'LEGENDARY SCŪPHR' : combo >= 10 ? 'SCUPH STORM' : combo >= 5 ? 'HOT STREAK' : null
  const tool = { find: '🔍', scoop: '🧹', mow: '🚜', rake: '🍂' }[phase.id]
  const urgent = timeLeft <= 10

  return (
    <div className={`yard-job action ${urgent ? 'urgent' : ''} ${comboTier ? `tier-${combo >= 20 ? 'legend' : combo >= 10 ? 'storm' : 'hot'}` : ''}`}>
      <div className="yard-hud">
        <button className="hud-quit" onClick={onQuit}>← Map</button><strong>{market}</strong>
        <div className="phase-track">
          {YARD_PHASES.map((p, i) => <div key={p.id} className={`phase-pill ${i < phaseIndex ? 'done' : i === phaseIndex ? 'active' : ''}`}><span>{p.icon}</span><small>{p.label}</small></div>)}
        </div>
        <div className="yard-hud-right">
          <span className="yard-score">🪙 {score}</span>
          <span className={`timer ${urgent ? 'low' : ''}`}>⏱ {timeLeft}s</span>
        </div>
      </div>

      <div className="departure-bar"><i style={{ width: `${(timeLeft / SHIFT) * 100}%` }} /><span>{urgent ? '⏰ LATE TO NEXT JOB!' : `NEXT JOB DEPARTS IN ${timeLeft}s · BE EFFICIENT`}</span></div>

      <div className="yard-arena">
        <div className="yard-sky" /><div className="yard-sun" /><div className="yard-fence" /><div className="yard-grass" /><div className="yard-house">🏡</div>
        <div className="yard-target-field">
          {phase.id === 'find' && objects.bushes.filter((b) => !b.found).map((b) => (
            <button key={b.id} className="yard-obj bush" style={{ left: `${b.x}%`, top: `${b.y}%` }} title="Walk here to search">🌳<span className="question">?</span></button>
          ))}
          {phase.id === 'scoop' && objects.poops.filter((p) => p.found && !p.scooped).map((p) => (
            <div key={p.id} className="yard-obj poop" style={{ left: `${p.x}%`, top: `${p.y}%` }}>💩</div>
          ))}
          {phase.id === 'mow' && objects.strips.filter((s) => !s.mowed).map((s) => (
            <div key={s.id} className="yard-obj strip" style={{ left: `${s.x}%`, top: `${s.y}%` }}>🌿</div>
          ))}
          {phase.id === 'mow' && objects.strips.filter((s) => s.mowed).map((s) => (
            <div key={s.id} className="yard-obj mowed" style={{ left: `${s.x}%`, top: `${s.y}%` }} />
          ))}
          {phase.id === 'rake' && objects.leaves.filter((l) => !l.raked).map((l) => (
            <div key={l.id} className="yard-obj leaf" style={{ left: `${l.x}%`, top: `${l.y}%` }}>🍂</div>
          ))}
          {phase.id === 'rake' && objects.leaves.filter((l) => l.raked).map((l) => (
            <div key={l.id} className="yard-obj raked" style={{ left: `${l.x}%`, top: `${l.y}%` }}>🍁</div>
          ))}

          <div className={`yard-player ${moving ? 'moving' : ''} ${popping ? 'popping' : ''}`} style={{ left: `${player.x}%`, top: `${player.y}%`, '--player-color': char.color }}>
            <CharacterSprite character={char} pose="work" />
            <span className="yard-tool">{tool}</span>
          </div>
        </div>

        {chaos?.type === 'sprinkler' && <div className="sprinkler-overlay">💦 SPRINKLER! 💦</div>}
        {chaos?.type === 'dog' && <button className="chaos-dog" onClick={onChaosDog}>🐕</button>}
        {chaos?.type === 'gust' && <div className="gust-overlay">🍃🍃🍃</div>}
        {banner && <div className="yard-banner">{banner}</div>}
        {comboTier && <div className="combo-tier"><span className="combo-x">x{combo}</span> {comboTier}</div>}
      </div>

      <div className="yard-bottom">
        <div className="combo-plate">🔥 Combo <strong>x{combo}</strong></div>
        <div className="yard-hint">MOVE: WASD / arrows · touch the pad below · scoop by walking into piles</div>
        <div className="perk-strip">{perks.length === 0 ? <span className="no-perks">No perks yet — level up to earn one!</span> : perks.map((id) => <span key={id} className="perk-chip">{id.replace(/-/g, ' ')}</span>)}</div>
      </div>

      <div className="yard-dpad">
        <button onPointerDown={() => hold('up', true)} onPointerUp={() => hold('up', false)} onPointerLeave={() => hold('up', false)}>▲</button>
        <div>
          <button onPointerDown={() => hold('left', true)} onPointerUp={() => hold('left', false)} onPointerLeave={() => hold('left', false)}>◀</button>
          <button onPointerDown={() => hold('down', true)} onPointerUp={() => hold('down', false)} onPointerLeave={() => hold('down', false)}>▼</button>
          <button onPointerDown={() => hold('right', true)} onPointerUp={() => hold('right', false)} onPointerLeave={() => hold('right', false)}>▶</button>
        </div>
      </div>
    </div>
  )
}
