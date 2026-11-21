import React, { useEffect, useState } from 'react'
import Region from './components/Region.jsx'
import { cities, open, owned, count, expand, dividend, canvass, neighbors } from './game/region.js'
import Hub from './components/Hub.jsx'
import RouteGame from './components/RouteGame.jsx'
import YardJob from './components/YardJob.jsx'
import Results from './components/Results.jsx'
import PerkScreen from './components/PerkScreen.jsx'
import { loadSave, persistSave, applyRewards, buyUpgrade, scoreRoute, scoreYardJob, grantPerk, rollPerkChoices } from './game/engine.js'

export default function App() {
  const [screen, setScreen] = useState('map')
  const [save, setSave] = useState(() => loadSave())
  const [city,setCity] = useState(()=>cities[save.lastCity]?.id ?? 0)
  const [jobConfig, setJobConfig] = useState(null)
  const [lastRewards, setLastRewards] = useState(null)
  const [leveledUp, setLeveledUp] = useState(false)
  const [perkChoices, setPerkChoices] = useState([])

  useEffect(() => { persistSave(save) }, [save])

  const startRoute = (type) => {
    if (!open(save,city)) return
    setJobConfig({ city,type:type==='urgent'?'urgent':'route', urgency: type === 'urgent' })
    setScreen('route')
  }

  const startYard = () => {
    if (!open(save,city)) return
    setJobConfig({ city,type:'yard' })
    setScreen('yard')
  }

  const completeJob = (result, scorer) => {
    const rewards = scorer(result)
    const id=jobConfig.city, market=cities[id], bonus=dividend(save)
    rewards.coins+=bonus
    const quality=result.performance>=0.3
    const next = expand(applyRewards(save, rewards),id,quality?rewards.stars+Number(market.special===jobConfig.type):0)
    next.lastCity=id
    const won=!owned(save,id)&&owned(next,id)
    const newMarkets=neighbors(id).filter(i=>!open(save,i)&&open(next,i)).map(i=>cities[i].name)
    rewards.dispatch=`${market.name}: +${count(next,id)-count(save,id)} regulars. ${won?(id===19?'Olympia secured! Campaign won.':'Branch established! '):''}${newMarkets.length?'Roads opened: '+newMarkets.join(', ')+'. ':''}${bonus?'Network dividend: +'+bonus+' coins.':''}${!quality?' More completed work earns referrals.':''}`
    const didLevel = next.level > save.level
    setLeveledUp(didLevel)
    if (didLevel) setPerkChoices(rollPerkChoices(next))
    else setPerkChoices([])
    setLastRewards(rewards)
    setSave(next)
    setScreen('results')
  }

  const buy = (id, def) => {
    const res = buyUpgrade(save, id, def)
    if (res.ok) setSave(res.save)
  }

  const afterResults = () => {
    if (leveledUp && perkChoices.length > 0) setScreen('perk')
    else setScreen('map')
  }

  const pickPerk = (id) => {
    setSave((s) => grantPerk(s, id))
    setScreen('map')
  }

  const reset = () => {
    if (window.confirm('Reset all SCUPH SAFARI progress? This cannot be undone.')) {
      localStorage.removeItem('scuph-safari-save-v1')
      setSave(loadSave())
      setCity(0)
      setScreen('map')
      setLeveledUp(false)
      setPerkChoices([])
    }
  }

  return (
    <div className="app">
      {screen === 'map' && <Region save={save} id={city} select={setCity} onHQ={()=>setScreen('hub')} onFlyer={()=>setSave(s=>canvass(s,city))} onJob={type=>type==='yard'?startYard():startRoute(type)}/>}
      {screen === 'hub' && (
        <Hub save={save} onMap={()=>setScreen('map')}
          onBuyUpgrade={buy}
          onSelectCharacter={(id) => setSave((s) => ({ ...s, activeCharacter: id }))}
          onReset={reset} />
      )}
      {screen === 'route' && jobConfig && (
        <RouteGame market={cities[jobConfig.city].name} characterId={save.activeCharacter} urgency={jobConfig.urgency}
          upgrades={save.upgrades}
          onFinish={(result) => completeJob(result, scoreRoute)}
          onQuit={() => setScreen('map')} />
      )}
      {screen === 'yard' && (
        <YardJob market={cities[jobConfig.city].name} characterId={save.activeCharacter} perks={save.perks} upgrades={save.upgrades}
          onFinish={(result) => completeJob(result, scoreYardJob)}
          onQuit={() => setScreen('map')} />
      )}
      {screen === 'results' && lastRewards && (
        <Results rewards={lastRewards} save={save} leveledUp={leveledUp} onContinue={afterResults} />
      )}
      {screen === 'perk' && (
        <PerkScreen choices={perkChoices} newLevel={save.level} onPick={pickPerk} />
      )}
    </div>
  )
}
