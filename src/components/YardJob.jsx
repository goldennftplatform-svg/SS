import React, { useCallback, useEffect, useRef, useState } from 'react'
import { YARD_PHASES } from '../data/gameData.js'
import { characterById } from '../game/engine.js'
import CharacterSprite from './CharacterSprite.jsx'
import { audio } from '../audio/chiptune.js'

const MAX_SCORE = 880
const rand = (min, max) => min + Math.random() * (max - min)

function makeObjects() {
  const bushes = Array.from({ length: 10 }, (_, i) => ({
    id: `b${i}`, x: rand(9, 91), y: rand(14, 82), found: false,
  }))
  const poops = bushes.map((b, i) => ({
    id: `p${i}`, x: b.x + rand(-3, 3), y: b.y + rand(-3, 3), found: false, scooped: false,
  }))
  const strips = Array.from({ length: 12 }, (_, i) => ({
    id: `s${i}`, x: rand(7, 93), y: rand(12, 84), mowed: false,
  }))
  const leaves = Array.from({ length: 12 }, (_, i) => ({
    id: `l${i}`, x: rand(7, 93), y: rand(12, 84), raked: false,
  }))
  return { bushes, poops, strips, leaves }
}

export default function YardJob({ market, characterId, perks = [], upgrades = {}, onFinish, onQuit, onCallout }) {
  const char = characterById(characterId)
  const hasPerk = useCallback((id) => perks.includes(id), [perks])
  const phaseDuration = YARD_PHASES[0].duration + (hasPerk('rally-timer') ? 4 : 0)

  const [objects, setObjects] = useState(makeObjects)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(phaseDuration)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [banner, setBanner] = useState('🔍 FIND THE HIDDEN PILES!')
  const [chaos, setChaos] = useState(null)

  const objectsRef = useRef(objects)
  objectsRef.current = objects
  const chaosRef = useRef(chaos)
  chaosRef.current = chaos
  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const phaseRef = useRef(0)
  const phaseLockRef = useRef(false)
  const finishedRef = useRef(false)
  const tierRef = useRef(0)
  const foundOnce = useRef(false)

  // Combo milestones get their own voice line + chips sound.
  useEffect(() => {
    if (combo >= 20 && tierRef.current < 3) { tierRef.current = 3; audio.combo(3); onCallout?.('legend') }
    else if (combo >= 10 && tierRef.current < 2) { tierRef.current = 2; audio.combo(2); onCallout?.('storm') }
    else if (combo >= 5 && tierRef.current < 1) { tierRef.current = 1; audio.combo(1); onCallout?.('hotStreak') }
  }, [combo, onCallout])

  const addScore = useCallback((n, comboGain = 0) => {
    scoreRef.current += n
    setScore(scoreRef.current)
    if (comboGain) {
      comboRef.current = Math.max(0, comboRef.current + comboGain)
      setCombo(comboRef.current)
    }
  }, [])

  const bumpCombo = useCallback((delta) => {
    comboRef.current = Math.max(0, comboRef.current + delta)
    setCombo(comboRef.current)
  }, [])

  const award = useCallback((base, comboGain = 0) => {
    const mult = 1 + Math.min(1, Math.floor(comboRef.current / 5) * 0.25)
    addScore(Math.round(base * mult), comboGain)
  }, [addScore])

  const finish = useCallback((performance) => {
    if (finishedRef.current) return
    finishedRef.current = true
    onFinish({ performance: Math.max(0, Math.min(1, performance)), character: char, perks })
  }, [onFinish, char, perks])

  const advancePhase = useCallback(() => {
    if (phaseLockRef.current || finishedRef.current) return
    phaseLockRef.current = true
    addScore(50)
    audio.phase()
    onCallout?.('phase')
    setBanner('✨ PHASE CLEAR! +50')
    const next = phaseRef.current + 1
    window.setTimeout(() => {
      if (next >= YARD_PHASES.length) {
        finish(scoreRef.current / MAX_SCORE)
      } else {
        phaseRef.current = next
        setPhaseIndex(next)
        setTimeLeft(phaseDuration)
        setChaos(null)
        setBanner(`${YARD_PHASES[next].icon} ${YARD_PHASES[next].hint}`)
        phaseLockRef.current = false
      }
    }, 850)
  }, [addScore, finish, phaseDuration, onCallout])

  // per-second countdown, resets on each phase
  useEffect(() => {
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [phaseIndex])

  useEffect(() => {
    if (timeLeft <= 0) advancePhase()
  }, [timeLeft, advancePhase])

  // Magnet Bag: auto-scoop a found pile every 2s during SCOOP
  useEffect(() => {
    if (phaseIndex !== 1 || !hasPerk('magnet-bag')) return
    const id = setInterval(() => {
      const cur = objectsRef.current
      const next = cur.poops.find((p) => p.found && !p.scooped)
      if (!next) return
      const updated = {
        ...cur,
        poops: cur.poops.map((p) => (p.id === next.id ? { ...p, scooped: true } : p)),
      }
      objectsRef.current = updated
      setObjects(updated)
      award(10, 1)
      const found = cur.poops.filter((p) => p.found)
      if (found.length && found.every((p) => p.scooped)) advancePhase()
    }, 2000)
    return () => clearInterval(id)
  }, [phaseIndex, hasPerk, award, advancePhase])

  // Chaos events during the work phases
  useEffect(() => {
    if (phaseIndex === 0) return
    const id = setInterval(() => {
      if (chaosRef.current || phaseLockRef.current || finishedRef.current) return
      if (Math.random() > 0.45) return
      const types = ['sprinkler', 'dog', 'gust']
      const type = types[Math.floor(Math.random() * types.length)]
      setChaos({ type, id: Date.now() })
      if (type === 'sprinkler') {
        audio.hurt()
        onCallout?.('sprinkler')
        if (hasPerk('hearth-shield')) {
          award(40)
          setBanner('🛡️ SHIELD BLOCK! +40')
        } else {
          if (!hasPerk('combo-keeper')) bumpCombo(-3)
          setBanner('💦 SPRINKLER! COMBO -3')
        }
      } else if (type === 'dog') {
        audio.dog()
        onCallout?.('dog')
        setBanner('🐕 LOOSE DOG! TAP IT!')
      } else {
        setBanner('🍃 LEAF GUST!')
        const cur = objectsRef.current
        const updated = {
          ...cur,
          leaves: cur.leaves.map((l) => (l.raked ? l : { ...l, x: rand(7, 93), y: rand(12, 84) })),
        }
        objectsRef.current = updated
        setObjects(updated)
      }
      window.setTimeout(() => { setChaos(null); setBanner(null) }, 2800)
    }, 5000)
    return () => clearInterval(id)
  }, [phaseIndex, hasPerk, award, bumpCombo, onCallout])

  // ---- interactions ----
  // Handlers read/write objectsRef synchronously so rapid clicks in the same
  // tick cannot use a stale closure and skip the phase-complete check.
  const commit = useCallback((next) => {
    objectsRef.current = next
    setObjects(next)
  }, [])

  const onBush = (id) => {
    if (phaseRef.current !== 0 || phaseLockRef.current) return
    const cur = objectsRef.current
    const targets = hasPerk('super-sniffer') ? 2 : 1
    const bushes = cur.bushes.map((b) => ({ ...b }))
    const poops = cur.poops.map((p) => ({ ...p }))
    const clicked = bushes.find((b) => b.id === id)
    const extras = bushes.filter((b) => !b.found && b.id !== id)
    const chosen = [clicked, ...extras].filter(Boolean).slice(0, targets)
    chosen.forEach((b) => {
      b.found = true
      const p = poops.find((x) => x.id === `p${b.id.slice(1)}`)
      if (p) p.found = true
    })
    commit({ ...cur, bushes, poops })
    audio.tap()
    if (!foundOnce.current) { foundOnce.current = true; onCallout?.('found') }
    award(5 * chosen.length, chosen.length)
    if (bushes.every((b) => b.found)) advancePhase()
  }

  const onPoop = (id) => {
    if (phaseRef.current !== 1 || phaseLockRef.current) return
    const cur = objectsRef.current
    const poops = cur.poops.map((p) => (p.id === id ? { ...p, scooped: true } : p))
    commit({ ...cur, poops })
    audio.scoop()
    award(hasPerk('golden-scoop') ? 40 : 20, 1)
    const found = poops.filter((p) => p.found)
    if (found.length && found.every((p) => p.scooped)) advancePhase()
  }

  const onStrip = (id) => {
    if (phaseRef.current !== 2 || phaseLockRef.current) return
    const cur = objectsRef.current
    const targets = hasPerk('turbo-mower') ? 2 : 1
    const strips = cur.strips.map((s) => ({ ...s }))
    const clicked = strips.find((s) => s.id === id)
    const extras = strips.filter((s) => !s.mowed && s.id !== id)
    const chosen = [clicked, ...extras].filter(Boolean).slice(0, targets)
    chosen.forEach((s) => { s.mowed = true })
    commit({ ...cur, strips })
    audio.tap()
    award(15 * chosen.length, chosen.length)
    if (strips.every((s) => s.mowed)) advancePhase()
  }

  const onLeaf = (id) => {
    if (phaseRef.current !== 3 || phaseLockRef.current) return
    const cur = objectsRef.current
    const targets = hasPerk('leaf-blower') ? 2 : 1
    const leaves = cur.leaves.map((l) => ({ ...l }))
    const clicked = leaves.find((l) => l.id === id)
    const extras = leaves.filter((l) => !l.raked && l.id !== id)
    const chosen = [clicked, ...extras].filter(Boolean).slice(0, targets)
    chosen.forEach((l) => { l.raked = true })
    commit({ ...cur, leaves })
    audio.tap()
    award(15 * chosen.length, chosen.length)
    if (leaves.every((l) => l.raked)) advancePhase()
  }

  const onChaosDog = () => {
    if (!chaos || chaos.type !== 'dog') return
    audio.dog()
    award(30, 2)
    setChaos(null)
    setBanner('🎉 GOOD DOG! +30')
    window.setTimeout(() => setBanner(null), 1400)
  }

  const phase = YARD_PHASES[phaseIndex]
  const comboTier = combo >= 20 ? 'LEGENDARY SCŪPHR' : combo >= 10 ? 'SCUPH STORM' : combo >= 5 ? 'HOT STREAK' : null
  const tool = { find: '🔍', scoop: '🧹', mow: '🚜', rake: '🍂' }[phase.id]

  return (
    <div className={`yard-job ${comboTier ? `tier-${combo >= 20 ? 'legend' : combo >= 10 ? 'storm' : 'hot'}` : ''}`}>
      <div className="yard-hud">
        <button className="hud-quit" onClick={onQuit}>← Map</button><strong>{market}</strong>
        <div className="phase-track">
          {YARD_PHASES.map((p, i) => (
            <div key={p.id} className={`phase-pill ${i < phaseIndex ? 'done' : i === phaseIndex ? 'active' : ''}`}>
              <span>{p.icon}</span><small>{p.label}</small>
            </div>
          ))}
        </div>
        <div className="yard-hud-right">
          <span className="yard-score">🪙 {score}</span>
          <span className={`timer ${timeLeft <= 5 ? 'low' : ''}`}>⏱ {timeLeft}s</span>
        </div>
      </div>

      <div className="yard-arena">
        <div className="yard-sky" />
        <div className="yard-sun" />
        <div className="yard-fence" />
        <div className="yard-grass" />
        <div className="yard-house">🏡</div>

        <div className="yard-target-field">
        {phase.id === 'find' && objects.bushes.filter((b) => !b.found).map((b) => (
          <button key={b.id} className="yard-obj bush" style={{ left: `${b.x}%`, top: `${b.y}%` }} onClick={() => onBush(b.id)} title="Tap to search">
            🌳<span className="question">?</span>
          </button>
        ))}

        {phase.id === 'scoop' && objects.poops.filter((p) => p.found && !p.scooped).map((p) => (
          <button key={p.id} className="yard-obj poop" style={{ left: `${p.x}%`, top: `${p.y}%` }} onClick={() => onPoop(p.id)} title="Scoop it!">
            💩
          </button>
        ))}

        {phase.id === 'mow' && objects.strips.filter((s) => !s.mowed).map((s) => (
          <button key={s.id} className="yard-obj strip" style={{ left: `${s.x}%`, top: `${s.y}%` }} onClick={() => onStrip(s.id)} title="Mow it!">
            🌿
          </button>
        ))}
        {phase.id === 'mow' && objects.strips.filter((s) => s.mowed).map((s) => (
          <div key={s.id} className="yard-obj mowed" style={{ left: `${s.x}%`, top: `${s.y}%` }} />
        ))}

        {phase.id === 'rake' && objects.leaves.filter((l) => !l.raked).map((l) => (
          <button key={l.id} className="yard-obj leaf" style={{ left: `${l.x}%`, top: `${l.y}%` }} onClick={() => onLeaf(l.id)} title="Rake it!">
            🍂
          </button>
        ))}
        {phase.id === 'rake' && objects.leaves.filter((l) => l.raked).map((l) => (
          <div key={l.id} className="yard-obj raked" style={{ left: `${l.x}%`, top: `${l.y}%` }}>🍁</div>
        ))}

        </div>
        {chaos?.type === 'sprinkler' && <div className="sprinkler-overlay">💦 SPRINKLER! 💦</div>}
        {chaos?.type === 'dog' && <button className="chaos-dog" onClick={onChaosDog}>🐕</button>}
        {chaos?.type === 'gust' && <div className="gust-overlay">🍃🍃🍃</div>}

        <div className="yard-character" style={{ '--player-color': char.color }}>
          <span className="yard-char-sprite"><CharacterSprite character={char} pose="work" /></span>
          <span className="yard-tool">{tool}</span>
        </div>

        {banner && <div className="yard-banner">{banner}</div>}

        {comboTier && (
          <div className="combo-tier">
            <span className="combo-x">x{combo}</span> {comboTier}
          </div>
        )}
      </div>

      <div className="yard-bottom">
        <div className="combo-plate">🔥 Combo <strong>x{combo}</strong></div>
        <div className="yard-hint">{phase.hint}</div>
        <div className="perk-strip">
          {perks.length === 0 ? <span className="no-perks">No perks yet — level up to earn one!</span>
            : perks.map((id) => <span key={id} className="perk-chip">{id.replace(/-/g, ' ')}</span>)}
        </div>
      </div>
    </div>
  )
}
