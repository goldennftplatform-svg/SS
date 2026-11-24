import React, { useCallback, useEffect, useRef, useState } from 'react'
import Region from './components/Region.jsx'
import Hub from './components/Hub.jsx'
import RouteGame from './components/RouteGame.jsx'
import MowerMaze from './components/MowerMaze.jsx'
import PackWalk from './components/PackWalk.jsx'
import RiderBoard from './components/RiderBoard.jsx'
import {challenge,recordScore,syncBoard,profile,onlineRanks} from './game/riders.js'
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
  const [screen, setScreen] = useState(()=>challenge()?'board':'map')
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
      : ['yard','mower','walk'].includes(screen) ? 'yard' : 'main'
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
    if (challenge() || save.dialogueSeen?.includes('intro')) return
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
    if(type==='mower'||type==='walk'){setScreen(type);return}
    const seen = save.dialogueSeen?.includes('dispatch')
    const lines = [
      ...(seen ? [] : buildLines('dispatch', { city: market.name, job: jobType === 'mower'?'mowing visit':jobType === 'yard' ? 'yard refresh' : 'scoop visit' })),
      ...buildLines('routeStart', {}),
    ]
    afterDialogue.current = () => {
      setSave((s) => markDialogue(s, 'dispatch'))
      setScreen('route')
    }
    setDialogue({ lines, key: 'dispatch' })
  }

  const completeJob = (result, scorer) => {
    const rewards = scorer(result)
    const recordKey = `${jobConfig.city}:${jobConfig.type}`
    const previousBest = save.routeRecords?.[recordKey] || 0
    {
      rewards.coins += result.tip
      rewards.routeCard = jobConfig.type==='walk'
        ? `${result.serviceLabel} · ${result.points} walk pts${result.tip?' · +25 coins for a happy pack':''}`
        : jobConfig.type==='mower'
        ? `${result.serviceLabel} · ${result.points} lawn pts${result.tip?' · +25 coins for efficient mowing':''}`
        : `Ride ${jobConfig.ride.points} + service ${result.points-jobConfig.ride.points} = ${result.points} pts · ${result.delivered}/5 piles hauled · ${result.tip ? `+${result.tip} coins for the 1,200-point target` : result.late ? 'Service incomplete' : 'Target: 1,200 pts'} · ${result.badges}/3 brass paws`
      rewards.routeCard += !result.late && result.points > previousBest ? ' · New town best!' : previousBest ? ` · Town best: ${previousBest}` : ''
    }
    const late = !!result.late
    if(!late){
      recordScore(jobConfig.type,result.points)
      if(onlineRanks && profile().name)syncBoard(jobConfig.type).catch(()=>{})
    }
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
    if (!late && result.points > previousBest) next.routeRecords = { ...next.routeRecords, [recordKey]: result.points }
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
      {screen==='board' && <RiderBoard back={()=>setScreen('map')} play={mode=>{setScreen('map');if(open(save,city))briefJob(mode)}}/>}
      {screen === 'map' && (
        <Region save={save} id={city} select={(i) => { audio.tap(); setCity(i) }}
          onHQ={() => setScreen('hub')}
          onBoard={()=>setScreen('board')}
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
        <RouteGame market={cities[jobConfig.city].name} characterId={save.activeCharacter} urgency={jobConfig.urgency} mower={jobConfig.type==='mower'}
          record={save.routeRecords?.[`${jobConfig.city}:${jobConfig.type}`]}
          upgrades={save.upgrades} level={save.level} onCallout={calloutLine}
          onFinish={(ride) => { setJobConfig({...jobConfig, ride}); setScreen('gate') }}
          onQuit={() => setScreen('map')} />
      )}
      {screen === 'gate' && jobConfig && <div className="screen results-screen"><div className="results-card">
        <small>SCUPH BIKE DISPATCH · LEG 1 COMPLETE</small><h2>Parked at the client’s gate</h2>
        <p>{jobConfig.ride.points} ride points · {jobConfig.ride.delay ? `Road delay: −${jobConfig.ride.delay} ${jobConfig.type==='mower'?'stripes':'seconds'}` : 'Clean ride: full service budget'}</p>
        <p>{jobConfig.type==='mower'?'Trim every grass square. Each direction sends the mower straight to the next hedge. Plan your turns before your stripe budget runs out.':'Walk over piles to scoop. Return to the parked eBike to unload five piles for 200 points each.'}{jobConfig.type === 'yard' && ' This refresh also includes finding, mowing and raking.'}</p>
        <button className="btn btn-primary" onClick={()=>setScreen('yard')}>Dismount & start service →</button>
      </div></div>}
      {screen==='mower' && <MowerMaze city={jobConfig.city} level={save.level} onQuit={()=>setScreen('map')} onFinish={result=>{
        completeJob({...result,points:result.servicePoints,tip:!result.late && result.servicePoints>=1200?25:0},scoreYardJob)
      }}/>}
      {screen==='walk' && <PackWalk level={save.level} market={cities[jobConfig.city].name} onQuit={()=>setScreen('map')} onFinish={r=>completeJob(r,scoreRoute)}/>}
      {screen === 'yard' && jobConfig && (
        <YardJob market={cities[jobConfig.city].name} characterId={save.activeCharacter} perks={save.perks} upgrades={save.upgrades} level={save.level}
          scoopOnly={jobConfig.type !== 'yard'} rush={jobConfig.urgency} delay={jobConfig.ride.delay} ridePoints={jobConfig.ride.points} onCallout={calloutLine}
          onFinish={(result) => {
            const ride=jobConfig.ride, points=ride.points+result.delivered*200
            completeJob({...result, points, badges:ride.badges, urgency:jobConfig.urgency, tip:!result.late && points>=1200?25:0,
              performance:Math.min(1,result.performance*.85+.15*Math.max(0,1-ride.mistakes*.15))},jobConfig.type==='yard'?scoreYardJob:scoreRoute)
          }}
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
