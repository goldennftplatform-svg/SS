import React, { useCallback, useEffect, useRef, useState } from 'react'
import { YARD_PHASES } from '../data/gameData.js'
import { characterById } from '../game/engine.js'
import CharacterSprite from './CharacterSprite.jsx'
import { audio } from '../audio/chiptune.js'

const BUSHES = 5, STRIPS = 6, LEAVES = 6
const TARGETS = BUSHES + BUSHES + STRIPS + LEAVES
const PHASE_BONUS = YARD_PHASES.length * 40
const MAX_SCORE = BUSHES * 5 + BUSHES * 25 + STRIPS * 15 + LEAVES * 15 + PHASE_BONUS + 60
const PICKUP_RADIUS = 6.5
const TRUCK = { x: 50, y: 92 }
const COMBO_WINDOW = 2400
const TIERS = [6, 12, 18]

const rand = (min, max) => min + Math.random() * (max - min)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const near = (a, b, r) => Math.hypot(a.x - b.x, a.y - b.y) < r

function makeObjects() {
  const bushes = Array.from({ length: BUSHES }, (_, i) => ({ id: `b${i}`, x: rand(12, 88), y: rand(16, 84), found: false }))
  const poops = bushes.map((b, i) => ({ id: `p${i}`, x: clamp(b.x + rand(-9, 9), 8, 92), y: clamp(b.y + rand(-9, 9), 12, 88), found: false, scooped: false }))
  const strips = Array.from({ length: STRIPS }, (_, i) => ({ id: `s${i}`, x: rand(8, 92), y: rand(14, 86), mowed: false }))
  const leaves = Array.from({ length: LEAVES }, (_, i) => ({ id: `l${i}`, x: rand(8, 92), y: rand(14, 86), raked: false }))
  return { bushes, poops, strips, leaves }
}

export default function YardJob({ market, characterId, perks = [], upgrades = {}, level = 1, scoopOnly=false, rush=false, ridePoints=0, onFinish, onQuit, onCallout }) {
  const char = characterById(characterId)
  const hasPerk = useCallback((id) => perks.includes(id), [perks])
  const difficulty = 1 + Math.min(0.4, (level - 1) * 0.06)
  const speed = (34 + (upgrades.bike || 0) * 2.5 + (char.perkEffect.speed || 1) * 4) * (1 + (level - 1) * 0.015)
  const capacity = 3 + (hasPerk('magnet-bag') ? 2 : 0) + Math.min(2, upgrades.bag || 0)
  const SHIFT = Math.round(((scoopOnly ? rush ? 18 : 25 : 52) + (hasPerk('rally-timer') ? 7 : 0)) / (1 + Math.min(0.25, (level - 1) * 0.04)))

  const [objects, setObjects] = useState(()=>{const o=makeObjects();if(scoopOnly)o.poops.forEach(p=>{p.found=true});return o})
  const [player, setPlayer] = useState({ ...TRUCK })
  const [phaseIndex, setPhaseIndex] = useState(scoopOnly?1:0)
  const [timeLeft, setTimeLeft] = useState(SHIFT)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [comboClock, setComboClock] = useState(0)
  const [carried, setCarried] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [banner, setBanner] = useState('Walk to targets · unload at your parked bike')
  const [chaos, setChaos] = useState(null)
  const [moving, setMoving] = useState(false)
  const [popping, setPopping] = useState(false)
  const [bagFlash, setBagFlash] = useState(false)
  const [ended, setEnded] = useState(false)

  const objectsRef = useRef(objects); objectsRef.current = objects
  const playerRef = useRef(player)
  const keysRef = useRef({})
  const movingRef = useRef(false)
  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const comboTimeRef = useRef(Date.now())
  const carriedRef = useRef(0)
  const mistakesRef = useRef(0)
  const phaseRef = useRef(phaseIndex)
  const hauled = useRef(0)
  const phaseTimer = useRef(null)
  useEffect(()=>()=>clearTimeout(phaseTimer.current),[])
  const phaseLockRef = useRef(false)
  const finishedRef = useRef(false)
  const tierRef = useRef(0)
  const collectRef = useRef(() => {})
  const dumpRef = useRef(() => {})
  const popTimer = useRef(null)
  const bagTimer = useRef(null)
  const chaosTimer = useRef(null)
  const chaosRef = useRef(null)
  const hazardHitRef = useRef(false)
  const fullWarnRef = useRef(0)
  const bannerTimer = useRef(null)

  const commit = useCallback((next) => { objectsRef.current = next; setObjects(next) }, [])

  const flashBanner = useCallback((text, ms = 1800) => {
    setBanner(text)
    clearTimeout(bannerTimer.current)
    bannerTimer.current = window.setTimeout(() => setBanner(null), ms)
  }, [])

  const clearChaos = useCallback(() => { chaosRef.current = null; setChaos(null) }, [])

  const breakCombo = useCallback((reason) => {
    if (comboRef.current > 0) {
      comboRef.current = 0
      tierRef.current = 0
      setCombo(0)
      setComboClock(0)
      if (reason) flashBanner(reason)
    }
    comboTimeRef.current = Date.now()
  }, [flashBanner])

  const addScore = useCallback((n, comboGain = 0) => {
    scoreRef.current += n
    setScore(scoreRef.current)
    if (comboGain) {
      const now = Date.now()
      if (now - comboTimeRef.current > COMBO_WINDOW) {
        comboRef.current = 0
        tierRef.current = 0
      }
      comboRef.current += comboGain
      comboTimeRef.current = now
      setCombo(comboRef.current)
    }
  }, [])

  const award = useCallback((base, comboGain = 0) => {
    const mult = 1 + Math.min(0.75, Math.floor(comboRef.current / 4) * 0.15)
    addScore(Math.round(base * mult), comboGain)
  }, [addScore])

  const phaseDone = useCallback(() => {
    const cur = objectsRef.current
    const phase = phaseRef.current
    const clear =
      (phase === 0 && cur.bushes.every((b) => b.found)) ||
      (phase === 1 && cur.poops.every((p) => p.scooped) && carriedRef.current === 0) ||
      (phase === 2 && cur.strips.every((s) => s.mowed)) ||
      (phase === 3 && cur.leaves.every((l) => l.raked) && carriedRef.current === 0)
    return clear
  }, [])

  const finish = useCallback((late) => {
    if (finishedRef.current) return
    finishedRef.current = true
    setEnded(true)
    const cur = objectsRef.current
    const done = cur.bushes.filter((b) => b.found).length + cur.poops.filter((p) => p.scooped).length +
      cur.strips.filter((s) => s.mowed).length + cur.leaves.filter((l) => l.raked).length
    const completion = scoopOnly ? hauled.current / BUSHES : done / TARGETS
    const timeRatio = timeLeft / SHIFT
    const comboRatio = Math.min(1, comboRef.current / TIERS[2])
    const phases = phaseRef.current / YARD_PHASES.length
    const penalty = Math.min(0.35, mistakesRef.current * 0.07)
    let performance = clamp(completion * 0.5 + phases * 0.08 + timeRatio * 0.1 + comboRatio * 0.17 + 0.18 - penalty, 0, 1)
    if(scoopOnly) performance=clamp(completion*.88+timeRatio*.16+.05-penalty,0,1)
    if (late) performance *= 0.55
    if (late) { audio.hurt(); onCallout?.('late') }
    else { audio.fanfare(); onCallout?.('onTime') }
    onFinish({ performance, late, mistakes: mistakesRef.current, character: char, perks, completion, delivered:hauled.current })
  }, [timeLeft, SHIFT, onFinish, char, perks, onCallout, scoopOnly])

  const advancePhase = useCallback(() => {
    if (phaseLockRef.current || finishedRef.current) return
    phaseLockRef.current = true
    if(scoopOnly || phaseRef.current===3) {finish(false);return}
    addScore(40)
    audio.phase()
    onCallout?.('phase')
    flashBanner('✨ STATION CLEAR! +40 · chain carries over!')
    const next = phaseRef.current + 1
    phaseTimer.current=window.setTimeout(() => {
      if (next >= YARD_PHASES.length) finish(false)
      else {
        phaseRef.current = next
        setPhaseIndex(next)
        flashBanner(`${YARD_PHASES[next].icon} ${YARD_PHASES[next].hint}`, 2200)
        phaseLockRef.current = false
      }
    }, 650)
  }, [addScore, finish, onCallout, flashBanner,scoopOnly])

  const dumpBag = useCallback(() => {
    const n = carriedRef.current
    if (n <= 0 || finishedRef.current) return
    if (phaseRef.current===1) hauled.current+=n
    carriedRef.current = 0
    setCarried(0)
    addScore(n * 8)
    audio.coin()
    setBagFlash(true)
    clearTimeout(bagTimer.current)
    bagTimer.current = window.setTimeout(() => setBagFlash(false), 350)
    flashBanner(`🚲 Unloaded ${n} at the bike`)
    if (phaseDone()) advancePhase()
  }, [addScore, advancePhase, flashBanner, phaseDone])

  dumpRef.current = dumpBag

  const collect = useCallback(() => {
    if (phaseLockRef.current || finishedRef.current) return
    const p = playerRef.current
    const cur = objectsRef.current
    const radius = PICKUP_RADIUS + (hasPerk('magnet-bag') ? 1.5 : 0)
    const phase = phaseRef.current
    let changed = false
    let points = 0
    let gain = 0

    if (phase === 0) {
      const hits = cur.bushes.filter((b) => !b.found && near(p, b, radius))
      if (hits.length) {
        changed = true
        const ids = new Set(hits.map((h) => h.id))
        // Super Sniffer reveals one extra bush nearby, not the whole lawn.
        if (hasPerk('super-sniffer')) {
          const extra = cur.bushes.filter((b) => !b.found && !ids.has(b.id))
            .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]
          if (extra) ids.add(extra.id)
        }
        const bushes = cur.bushes.map((b) => ids.has(b.id) ? { ...b, found: true } : b)
        const poops = cur.poops.map((o) => ids.has(`b${o.id.slice(1)}`) ? { ...o, found: true } : o)
        commit({ ...cur, bushes, poops })
        points = 5 * ids.size
        gain = ids.size
        onCallout?.('found')
      }
    } else if (phase === 1) {
      const available = cur.poops.filter((o) => o.found && !o.scooped && near(p, o, radius))
      if (available.length && carriedRef.current >= capacity) {
        if (Date.now() - fullWarnRef.current > 1500) {
          fullWarnRef.current = Date.now()
          audio.hurt()
          flashBanner('🎒 Bag full! Walk back to the bike to unload.')
        }
        return
      }
      const slots = capacity - carriedRef.current
      const hits = available.slice(0, slots)
      if (hits.length) {
        changed = true
        const ids = new Set(hits.map((h) => h.id))
        const poops = cur.poops.map((o) => ids.has(o.id) ? { ...o, scooped: true } : o)
        commit({ ...cur, poops })
        carriedRef.current += hits.length
        setCarried(carriedRef.current)
        points = (hasPerk('golden-scoop') ? 50 : 25) * hits.length
        gain = hits.length
        if (carriedRef.current >= capacity) flashBanner('🎒 Bag full! Unload at the bike.')
      }
    } else if (phase === 2) {
      const hits = cur.strips.filter((o) => !o.mowed && near(p, o, radius))
      if (hits.length) {
        changed = true
        const ids = new Set(hits.map((h) => h.id))
        if (hasPerk('turbo-mower')) {
          const extra = cur.strips.filter((o) => !o.mowed && !ids.has(o.id))
            .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]
          if (extra) ids.add(extra.id)
        }
        const strips = cur.strips.map((o) => ids.has(o.id) ? { ...o, mowed: true } : o)
        commit({ ...cur, strips })
        points = 15 * ids.size
        gain = ids.size
      }
    } else {
      const available = cur.leaves.filter((o) => !o.raked && near(p, o, radius))
      if (available.length && carriedRef.current >= capacity) {
        if (Date.now() - fullWarnRef.current > 1500) {
          fullWarnRef.current = Date.now()
          audio.hurt()
          flashBanner('🍂 Arms full! Walk back to the bike.')
        }
        return
      }
      const slots = capacity - carriedRef.current
      const hits = available.slice(0, slots)
      if (hits.length) {
        changed = true
        const ids = new Set(hits.map((h) => h.id))
        if (hasPerk('leaf-blower')) {
          const extra = cur.leaves.filter((o) => !o.raked && !ids.has(o.id))
            .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]
          if (extra && carriedRef.current + ids.size < capacity) ids.add(extra.id)
        }
        const leaves = cur.leaves.map((o) => ids.has(o.id) ? { ...o, raked: true } : o)
        commit({ ...cur, leaves })
        carriedRef.current += ids.size
        setCarried(carriedRef.current)
        points = 15 * ids.size
        gain = ids.size
        if (carriedRef.current >= capacity) flashBanner('🍂 Arms full! Unload at the bike.')
      }
    }

    if (changed) {
      award(points, gain)
      audio.scoop()
      setPopping(true)
      clearTimeout(popTimer.current)
      popTimer.current = window.setTimeout(() => setPopping(false), 160)
      if (phaseDone()) advancePhase()
    }
  }, [advancePhase, award, capacity, commit, flashBanner, hasPerk, onCallout, phaseDone])
  collectRef.current = collect

  // movement, combo clock, carry dump, hazard contact
  useEffect(() => {
    if (ended) return
    let last = performance.now()
    const tick = () => {
      const now = performance.now()
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const k = keysRef.current
      const dx = (k.right ? 1 : 0) - (k.left ? 1 : 0)
      const dy = (k.down ? 1 : 0) - (k.up ? 1 : 0)
      const isMoving = !!(dx || dy)
      if (isMoving !== movingRef.current) { movingRef.current = isMoving; setMoving(isMoving) }

      if (isMoving) {
        let slow = 1
        if (chaos && (chaos.type === 'sprinkler' || chaos.type === 'mud') && near(playerRef.current, chaos.pos, 13)) slow = hasPerk('hearth-shield') ? 0.85 : 0.5
        const n = Math.hypot(dx, dy)
        const next = {
          x: clamp(playerRef.current.x + (dx / n) * speed * slow * dt, 5, 95),
          y: clamp(playerRef.current.y + (dy / n) * speed * slow * dt, 10, 93),
        }
        playerRef.current = next
        setPlayer(next)
      }

      if (carriedRef.current > 0 && near(playerRef.current, TRUCK, 8)) dumpRef.current()

      if (comboRef.current > 0) {
        const left = 1 - (Date.now() - comboTimeRef.current) / COMBO_WINDOW
        setComboClock(Math.max(0, left))
        if (left <= 0) breakCombo('🔥 COMBO COOLED! Chain lost')
      }

      if (chaos && !hazardHitRef.current && (chaos.type === 'sprinkler' || chaos.type === 'mud') && near(playerRef.current, chaos.pos, 11)) {
        hazardHitRef.current = true
        if (hasPerk('hearth-shield')) {
          addScore(40)
          flashBanner('🛡️ SHIELD BLOCK! +40')
        } else {
          mistakesRef.current += 1
          setMistakes(mistakesRef.current)
          setTimeLeft((t) => Math.max(0, t - 2))
          if (hasPerk('combo-keeper')) flashBanner(chaos.type === 'sprinkler' ? '💦 SPLASHED! -2s · chain held' : '🟤 MUD! -2s · chain held')
          else breakCombo(chaos.type === 'sprinkler' ? '💦 SPLASHED! -2s · combo lost' : '🟤 MUD! -2s · combo lost')
        }
      }

      collectRef.current()
    }
    const id = setInterval(tick, 16)
    return () => clearInterval(id)
  }, [addScore, breakCombo, chaos, ended, flashBanner, hasPerk, speed])

  // departure clock
  useEffect(() => {
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => { if (timeLeft <= 0) finish(true) }, [timeLeft, finish])

  // keyboard
  useEffect(() => {
    const map = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down' }
    const set = (key, down) => { if (map[key]) keysRef.current[map[key]] = down }
    const down = (e) => { set(e.key, true); if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault() }
    const up = (e) => set(e.key, false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  // combo tiers
  useEffect(() => {
    if (combo >= TIERS[2] && tierRef.current < 3) { tierRef.current = 3; audio.combo(3); onCallout?.('legend') }
    else if (combo >= TIERS[1] && tierRef.current < 2) { tierRef.current = 2; audio.combo(2); onCallout?.('storm') }
    else if (combo >= TIERS[0] && tierRef.current < 1) { tierRef.current = 1; audio.combo(1); onCallout?.('hotStreak') }
  }, [combo, onCallout])

  // chaos escalates each phase
  useEffect(() => {
    if (phaseIndex === 0 || ended) return
    const id = setInterval(() => {
      if (chaos || phaseLockRef.current || finishedRef.current) return
      if (Math.random() > 0.55 * difficulty) return
      const types = ['sprinkler', 'dog', 'gust', 'mud']
      const type = types[Math.floor(Math.random() * types.length)]
      hazardHitRef.current = false
      const next = { type, id: Date.now(), pos: { x: rand(12, 88), y: rand(18, 86) } }
      chaosRef.current = { ...next, active: true }
      setChaos(next)
      if (type === 'dog') {
        audio.dog(); onCallout?.('dog')
        flashBanner('🐕 LOOSE DOG! TAP IT BEFORE IT BITES!', 2000)
        chaosTimer.current = window.setTimeout(() => {
          if (finishedRef.current || !chaosRef.current?.active || chaosRef.current.id !== next.id) return
          chaosRef.current.active = false
          mistakesRef.current += 1
          setMistakes(mistakesRef.current)
          setTimeLeft((t) => Math.max(0, t - 3))
          if (hasPerk('combo-keeper')) flashBanner('🐕 DOG BIT! -3s · chain held')
          else breakCombo('🐕 DOG BIT! -3s · combo lost')
          clearChaos()
        }, 2200)
      } else if (type === 'gust') {
        const cur = objectsRef.current
        commit({
          ...cur,
          leaves: cur.leaves.map((l) => l.raked ? l : { ...l, x: rand(8, 92), y: rand(14, 86) }),
          poops: cur.poops.map((p) => p.scooped ? p : { ...p, x: clamp(p.x + rand(-8, 8), 8, 92), y: clamp(p.y + rand(-8, 8), 12, 88) }),
        })
        audio.hurt(); onCallout?.('gust')
        flashBanner('🍃 GUST! Targets moved — re-route!', 1800)
        chaosTimer.current = window.setTimeout(clearChaos, 1400)
      } else {
        audio.hurt(); onCallout?.('sprinkler')
        flashBanner(type === 'sprinkler' ? '💦 SPRINKLER ZONE! Avoid the water' : '🟤 MUD PATCH! Slow going', 1800)
        chaosTimer.current = window.setTimeout(clearChaos, 3200)
      }
    }, Math.max(2600, 4400 / difficulty))
    return () => clearInterval(id)
  }, [breakCombo, chaos, clearChaos, commit, difficulty, ended, flashBanner, hasPerk, onCallout, phaseIndex])

  const onChaosDog = () => {
    if (chaos?.type !== 'dog') return
    clearTimeout(chaosTimer.current)
    if (chaosRef.current) chaosRef.current.active = false
    audio.dog()
    award(30, 2)
    clearChaos()
    flashBanner('🎉 GOOD DOG! +30 · chain saved')
  }

  const hold = (key, down) => { keysRef.current[key] = down }
  const phase = YARD_PHASES[phaseIndex]
  const tier = combo >= TIERS[2] ? 3 : combo >= TIERS[1] ? 2 : combo >= TIERS[0] ? 1 : 0
  const comboTier = ['', 'HOT STREAK', 'SCUPH STORM', 'LEGENDARY SCŪPHR'][tier]
  const tool = { find: '🔍', scoop: '🧹', mow: '🚜', rake: '🍂' }[phase.id]
  const urgent = timeLeft <= 8
  const full = carried >= capacity

  return (
    <div className={`yard-job action ${urgent ? 'urgent' : ''} ${tier ? `tier-${['', 'hot', 'storm', 'legend'][tier]}` : ''}`}>
      <div className="yard-hud">
        <button className="hud-quit" onClick={onQuit}>← Map</button><strong>{market}</strong>
        <div className="phase-track">
          {scoopOnly ? <b>🚲 PARKED · SCOOP {hauled.current}/5</b> : YARD_PHASES.map((p, i) => <div key={p.id} className={`phase-pill ${i < phaseIndex ? 'done' : i === phaseIndex ? 'active' : ''}`}><span>{p.icon}</span><small>{p.label}</small></div>)}
        </div>
        <div className="yard-hud-right">
          <span className="yard-score">{ridePoints+hauled.current*200}/1200 pts</span>
          <span className={`timer ${urgent ? 'low' : ''}`}>⏱ {timeLeft}s</span>
        </div>
      </div>

      <div className="departure-bar"><i style={{ width: `${(timeLeft / SHIFT) * 100}%` }} /><span>{urgent ? '⏰ DEPARTURE IMMINENT!' : `NEXT JOB DEPARTS IN ${timeLeft}s · ROUTE SMART`}</span></div>
      <div className="pressure-bar">
        <div className="combo-meter"><span>🔥 CHAIN {combo}</span><i style={{ width: `${comboClock * 100}%` }} /></div>
        <div className={`bag-meter ${full ? 'full' : ''} ${bagFlash ? 'flash' : ''}`}><span>🎒 {carried}/{capacity}</span><small>{full ? 'UNLOAD AT BIKE!' : 'carry limit'}</small></div>
        <div className="mistake-meter">⚠ {mistakes} mistakes</div>
      </div>

      <div className="yard-arena">
        <div className="yard-sky" /><div className="yard-sun" /><div className="yard-fence" /><div className="yard-grass" /><div className="yard-house"><BlockArt kind="house"/></div>
        <div className="yard-target-field">
          <div className={`yard-truck ${full ? 'calling' : ''}`} style={{ left: `${TRUCK.x}%`, top: `${TRUCK.y}%` }}><BlockArt kind="bike"/><small>BIKE · UNLOAD</small></div>
          {phase.id === 'find' && objects.bushes.filter((b) => !b.found).map((b) => (
             <div key={b.id} className="yard-obj bush" style={{ left: `${b.x}%`, top: `${b.y}%` }}><BlockArt kind="pine"/><span className="question">?</span></div>
          ))}
          {phase.id === 'scoop' && objects.poops.filter((p) => p.found && !p.scooped).map((p) => (
             <div key={p.id} className="yard-obj poop" style={{ left: `${p.x}%`, top: `${p.y}%` }}><BlockArt kind="pile"/></div>
          ))}
          {phase.id === 'mow' && objects.strips.filter((s) => !s.mowed).map((s) => (
             <div key={s.id} className="yard-obj strip" style={{ left: `${s.x}%`, top: `${s.y}%` }}><BlockArt kind="grass"/></div>
          ))}
          {phase.id === 'mow' && objects.strips.filter((s) => s.mowed).map((s) => (
            <div key={s.id} className="yard-obj mowed" style={{ left: `${s.x}%`, top: `${s.y}%` }} />
          ))}
          {phase.id === 'rake' && objects.leaves.filter((l) => !l.raked).map((l) => (
             <div key={l.id} className="yard-obj leaf" style={{ left: `${l.x}%`, top: `${l.y}%` }}><BlockArt kind="leaf"/></div>
          ))}
          {phase.id === 'rake' && objects.leaves.filter((l) => l.raked).map((l) => (
            <div key={l.id} className="yard-obj raked" style={{ left: `${l.x}%`, top: `${l.y}%` }}>🍁</div>
          ))}

          {chaos && (chaos.type === 'sprinkler' || chaos.type === 'mud') && (
            <div className={`hazard-zone ${chaos.type}`} style={{ left: `${chaos.pos.x}%`, top: `${chaos.pos.y}%` }}>
              {chaos.type === 'sprinkler' ? '💦' : '🟤'}
            </div>
          )}

          <div className={`yard-player ${moving ? 'moving' : ''} ${popping ? 'popping' : ''}`} style={{ left: `${player.x}%`, top: `${player.y}%`, '--player-color': char.color }}>
            <CharacterSprite character={char} pose="work" />
            <span className="yard-tool">{full ? '🚲' : tool}</span>
          </div>
        </div>

        {chaos?.type === 'dog' && <button className="chaos-dog" onClick={onChaosDog}>🐕</button>}
        {banner && <div className="yard-banner">{banner}</div>}
        {comboTier && <div className="combo-tier"><span className="combo-x">x{combo}</span> {comboTier}</div>}
      </div>

      <div className="yard-bottom">
        <div className="combo-plate">🔥 <strong>x{combo}</strong> / {TIERS[2]}</div>
        <div className="yard-hint">Leg 2 · Walk with WASD / arrows. Scoop on contact. Unload at 🚲 to count your haul.</div>
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
import { BlockArt } from './BlockArt.jsx'
