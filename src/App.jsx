import React, { useCallback, useEffect, useRef, useState } from 'react'
import Region from './components/Region.jsx'
import Hub from './components/Hub.jsx'
import RouteGame from './components/RouteGame.jsx'
import YardJob from './components/YardJob.jsx'
import Results from './components/Results.jsx'
import PerkScreen from './components/PerkScreen.jsx'
import { Dialogue, Callout } from './components/Dialogue.jsx'
import { audio } from './audio/chiptune.js'
import { buildLines } from './data/dialogue.js'
import { cities, open, owned, count, expand, dividend, canvass, neighbors } from './game/region.js'
import {
  loadSave, persistSave, applyRewards, buyUpgrade, scoreRoute, scoreYardJob,
  grantPerk, rollPerkChoices, makeContract, updateContract, logEvent, markDialogue,
} from './game/engine.js'

export default function App() {
  const [screen, setScreen] = useState('map')
  const [save, setSave] = useState(() => {
    const s = loadSave()
    return s.contract ? s : { ...s, contract: makeContract(s, cities) }
  })
  const [city, setCity] = useState(() => cities[save.lastCity]?.id ?? 0)
  const [jobConfig, setJobConfig] = useState(null)
  const [lastRewards, setLastRewards] = useState(null)
  const [leveledUp, setLeveledUp] = useState(false)
  const [perkChoices, setPerkChoices] = useState([])
  const [dialogue, setDialogue] = useState(null)
  const [callout, setCallout] = useState(null)
  const [muted, setMuted] = useState(audio.muted)
  const afterDialogue = useRef(null)
  const lastCallout = useRef(0)

  useEffect(() => { persistSave(save) }, [save])
  useEffect(() => audio.onChange(setMuted), [])
  useEffect(() => { audio.setLevel(save.level) }, [save.level])
  useEffect(() => {
    const track = screen === 'route' ? (jobConfig?.urgency ? 'urgent' : 'route')
      : screen === 'yard' ? 'yard' : 'main'
    audio.setTrack(track)
  }, [screen, jobConfig?.urgency])

  const showDialogue = useCallback((key, ctx, after) => {
    const lines = buildLines(key, ctx)
    if (!lines.length) { after?.(); return }
    afterDialogue.current = after
    setDialogue({ lines, key })
  }, [])

  const calloutLine = useCallback((key, ctx) => {
    const now = Date.now()
    if (now - lastCallout.current < 4000) return
    lastCallout.current = now
    const line = buildLines(key, ctx)[0]
    if (line) setCallout(line)
  }, [])

  useEffect(() => {
    if (save.dialogueSeen?.includes('intro')) return
    showDialogue('intro', {}, () => {
      setSave((s) => markDialogue(s, 'intro'))
      setScreen('map')
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const briefJob = (type) => {
    if (!open(save, city)) return
    const market = cities[city]
    const jobType = type
    const config = { city, type: jobType, urgency: type === 'urgent' }
    setJobConfig(config)
    audio.select()
    const seen = save.dialogueSeen?.includes('dispatch')
    const lines = [
      ...(seen ? [] : buildLines('dispatch', { city: market.name, job: market.special })),
      ...buildLines(jobType === 'yard' ? 'yardStart' : 'routeStart', {}),
    ]
    afterDialogue.current = () => {
      setSave((s) => markDialogue(s, 'dispatch'))
      setScreen(jobType === 'yard' ? 'yard' : 'route')
    }
    setDialogue({ lines, key: 'dispatch' })
  }

  const completeJob = (result, scorer) => {
    const rewards = scorer(result)
    if (jobConfig.type !== 'yard') rewards.routeCard = `${result.cleared}/${result.total} curbs cleaned · best chain ×${result.combo}`
    const late = !!result.late
    if (late) {
      rewards.coins = Math.round(rewards.coins * 0.5)
      rewards.xp = Math.round(rewards.xp * 0.6)
      rewards.repDelta = +(rewards.repDelta - 0.3).toFixed(2)
      rewards.late = true
    }
    const id = jobConfig.city
    const market = cities[id]
    const bonus = dividend(save)
    const streakBonus = !late && (save.streak || 1) >= 3 ? 15 : 0
    rewards.coins += bonus + streakBonus

    const contract = updateContract(save, cities, {
      city: id, type: jobConfig.type, jobType: market.special, stars: rewards.stars,
    })
    rewards.contractBonus = contract.reward || 0
    rewards.contractLabel = contract.label

    const quality = !late && result.performance >= 0.3
    let next = expand(applyRewards(contract.save, rewards), id, quality ? rewards.stars + Number(market.special === jobConfig.type) : 0)
    // Missing the departure window costs a regular, not just a worse grade.
    if (late) next = { ...next, territories: { ...next.territories, [id]: Math.max(0, count(next, id) - 1) } }
    next.lastCity = id
    next.streak = !late && rewards.stars >= 2 ? (save.streak || 1) + 1 : 1
    const won = !owned(save, id) && owned(next, id)
    const newMarkets = neighbors(id).filter((i) => !open(save, i) && open(next, i)).map((i) => cities[i].name)
    rewards.dispatch = `${market.name}: +${count(next, id) - count(save, id)} regulars. ${won ? (id === 19 ? 'Olympia secured! Campaign won. ' : 'Branch established! ') : ''}${newMarkets.length ? 'Roads opened: ' + newMarkets.join(', ') + '. ' : ''}${bonus ? 'Network dividend: +' + bonus + ' coins. ' : ''}${streakBonus ? 'Streak bonus: +' + streakBonus + ' coins. ' : ''}${late ? ' LATE: lost a regular, half pay and reputation. ' : ''}${!quality && !late ? ' More completed work earns referrals.' : ''}`
    next = logEvent(next, `${late ? '⏰' : won ? '🏁' : '🧹'} ${market.name} ${jobConfig.type} · ${rewards.stars}★ · +${rewards.coins}🪙${late ? ' · LATE' : ''}`)

    const didLevel = next.level > save.level
    setLeveledUp(didLevel)
    if (didLevel) setPerkChoices(rollPerkChoices(next))
    else setPerkChoices([])
    setLastRewards(rewards)
    setSave(next)
    audio.coin()

    const reaction = rewards.stars === 3 ? 'perfect' : rewards.stars === 2 ? 'good' : 'rough'
    const lines = [
      ...(late ? buildLines('late', { city: market.name }) : buildLines(reaction, { city: market.name })),
      ...(won ? buildLines(id === 19 ? 'olympia' : 'branch', { city: market.name }) : []),
      ...(contract.completed ? buildLines('contract', { goal: contract.label, reward: contract.reward }) : []),
    ]
    if (won) audio.fanfare()
    afterDialogue.current = () => setScreen('results')
    setDialogue({ lines, key: reaction })
  }

  const buy = (id, def) => {
    const res = buyUpgrade(save, id, def)
    if (res.ok) { audio.coin(); setSave(res.save) }
    else audio.hurt()
  }

  const afterResults = () => {
    if (leveledUp && perkChoices.length > 0) {
      audio.fanfare()
      showDialogue('levelUp', { level: save.level }, () => setScreen('perk'))
    } else setScreen('map')
  }

  const pickPerk = (id) => {
    audio.select()
    setSave((s) => grantPerk(s, id))
    setScreen('map')
  }

  const reset = () => {
    if (window.confirm('Reset all SCUPH SAFARI progress? This cannot be undone.')) {
      localStorage.removeItem('scuph-safari-save-v1')
      const fresh = loadSave()
      setSave({ ...fresh, contract: makeContract(fresh, cities) })
      setCity(0)
      setScreen('map')
      setLeveledUp(false)
      setPerkChoices([])
      setDialogue(null)
    }
  }

  const finishDialogue = () => {
    const next = afterDialogue.current
    afterDialogue.current = null
    setDialogue(null)
    next?.()
  }

  const gameProps = {
    onCallout: calloutLine,
    onToggleSound: () => audio.toggleMute(),
    muted,
  }

  return (
    <div className="app">
      {screen === 'map' && (
        <Region save={save} id={city} select={(i) => { audio.tap(); setCity(i) }}
          onHQ={() => setScreen('hub')}
          onFlyer={() => { audio.tap(); setSave((s) => canvass(s, city)) }}
          onJob={briefJob}
          onShowDialogue={showDialogue}
          {...gameProps} />
      )}
      {screen === 'hub' && (
        <Hub save={save} onMap={() => setScreen('map')}
          onBuyUpgrade={buy}
          onSelectCharacter={(id) => { audio.select(); setSave((s) => ({ ...s, activeCharacter: id })) }}
          onReset={reset} />
      )}
      {screen === 'route' && jobConfig && (
        <RouteGame market={cities[jobConfig.city].name} characterId={save.activeCharacter} urgency={jobConfig.urgency}
          upgrades={save.upgrades} level={save.level} onCallout={calloutLine}
          onFinish={(result) => completeJob(result, scoreRoute)}
          onQuit={() => setScreen('map')} />
      )}
      {screen === 'yard' && jobConfig && (
        <YardJob market={cities[jobConfig.city].name} characterId={save.activeCharacter} perks={save.perks} upgrades={save.upgrades} level={save.level}
          onCallout={calloutLine}
          onFinish={(result) => completeJob(result, scoreYardJob)}
          onQuit={() => setScreen('map')} />
      )}
      {screen === 'results' && lastRewards && (
        <Results rewards={lastRewards} save={save} leveledUp={leveledUp} onContinue={afterResults} />
      )}
      {screen === 'perk' && (
        <PerkScreen choices={perkChoices} newLevel={save.level} onPick={pickPerk} />
      )}

      {callout && <Callout line={callout} onDone={() => setCallout(null)} />}
      {dialogue && <Dialogue lines={dialogue.lines} onDone={finishDialogue} />}
      <button className="global-sound" onClick={() => audio.toggleMute()} title={muted ? 'Turn sound on' : 'Turn sound off'} aria-label="Toggle sound">
        {muted ? '🔇' : '🔊'}
      </button>
    </div>
  )
}
