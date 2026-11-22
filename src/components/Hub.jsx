import React, { useState } from 'react'
import { CHARACTERS, SERVICES, UPGRADES, STORY_BEATS } from '../data/gameData.js'
import CharacterSprite from './CharacterSprite.jsx'
import { progressToNextLevel, upgradeCost } from '../game/engine.js'

const TABS = ['CREW', 'SERVICES', 'UPGRADES', 'STORY']

export default function Hub({ save, onMap, onBuyUpgrade, onSelectCharacter, onReset }) {
  const [tab, setTab] = useState('CREW')
  const progress = progressToNextLevel(save.xp, save.level)

  return (
    <div className="screen hub-screen">
      <header className="hud">
        <div className="hud-brand">
          <img src="./assets/brand/scuph-logo.png" width="54" height="30" alt="Scūph" />
          <span>SCUPH SAFARI · BIKE DEPOT</span>
        </div>
        <div className="hud-stats">
          <span className="stat" title="Level">⭐ Lv {save.level}</span>
          <span className="stat" title="Coins">🪙 {save.coins}</span>
          <span className="stat" title="Bones">🦴 {save.bones}</span>
          <span className="stat" title="Reputation">🌟 {save.reputation.toFixed(1)}</span>
          <span className="stat" title="Day streak">🔥 {save.streak}</span>
        </div>
      </header>

      <div className="xp-bar-wrap">
        <div className="xp-bar" style={{ width: `${progress.pct}%` }} />
        <span className="xp-label">XP {progress.current}/{progress.need}</span>
      </div>

      <main className="hub-body">
        <nav className="tabs">
          <button className="tab" onClick={onMap}>← MAP</button>
          {TABS.map((t) => <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
        </nav>

        <section className="panel">
          {tab === 'CREW' && <CrewPanel save={save} onSelectCharacter={onSelectCharacter} />}
          {tab === 'SERVICES' && <ServicesPanel save={save} />}
          {tab === 'UPGRADES' && <UpgradesPanel save={save} onBuyUpgrade={onBuyUpgrade} />}
          {tab === 'STORY' && <StoryPanel save={save} />}
        </section>
      </main>

      <footer className="hub-footer">
        <span>Making the world cleaner, one scoop at a time.</span>
        <button className="link-btn" onClick={onReset} title="Reset saved progress">Reset save</button>
      </footer>
    </div>
  )
}

function RoutePanel({ save, onStartRoute, onStartYard }) {
  const active = CHARACTERS.find((c) => c.id === save.activeCharacter)
  const unlockedServices = save.unlockedServices.length
  return (
    <div>
      <div className="panel-head">
        <h2>Today's Route Board</h2>
        <p>Pick a route, ride the street, scoop every pile, reach the finish line!</p>
      </div>
      <div className="route-cards">
        <button className="route-card featured" onClick={() => onStartRoute('normal')}>
          <div className="route-icon">🛵</div>
          <h3>Maple Valley Route</h3>
          <p>Your neighborhood. Scoop, dodge sprinklers, make customers smile.</p>
          <span className="tag">STANDARD · 3 STARS</span>
        </button>
        <button className="route-card urgent" onClick={() => onStartRoute('urgent')}>
          <div className="route-icon">🚨</div>
          <h3>Emergency Cleanup</h3>
          <p>Same-day urgent service! 2× coins + bonus. Tighter timer.</p>
          <span className="tag tag-red">2× REWARDS · HARD</span>
        </button>
        <button className="route-card yard" onClick={onStartYard}>
          <div className="route-icon">🏡</div>
          <h3>Yard Job — Full Visit</h3>
          <p>Show up and do it all: find hidden piles, scoop, mow, and rake. Chaos + big rewards!</p>
          <span className="tag tag-green">4 PHASES · YARD REFRESH</span>
        </button>
      </div>
      <div className="route-summary">
        <div><strong>{save.routesCompleted}</strong><span>routes finished</span></div>
        <div><strong>{save.yardJobsCompleted || 0}</strong><span>yard jobs done</span></div>
        <div><strong>{save.totalStars}</strong><span>stars earned</span></div>
        <div><strong>{unlockedServices}</strong><span>services offered</span></div>
        <div><strong>{(save.perks || []).length}</strong><span>perks earned</span></div>
        <div><strong>${save.franchiseRevenue}</strong><span>revenue</span></div>
      </div>
      <div className="active-crew-strip">
        <CharacterSprite key={active?.id} character={active} />
        <div><small>LEADING ROUTE</small><strong>{active?.name}</strong><p>{active?.perk}</p></div>
      </div>
    </div>
  )
}

function CrewPanel({ save, onSelectCharacter }) {
  return (
    <div>
      <div className="panel-head"><h2>Your Scūphr Crew</h2><p>Six heroes. One clean mission. Level up to unlock them all.</p></div>
      <div className="crew-grid">
        {CHARACTERS.map((c) => {
          const unlocked = save.unlockedCharacters.includes(c.id)
          const active = save.activeCharacter === c.id
          return (
            <button key={c.id} disabled={!unlocked} onClick={() => onSelectCharacter(c.id)}
              className={`crew-card ${unlocked ? '' : 'locked'} ${active ? 'selected' : ''}`}
              style={{ '--crew-color': c.color, '--crew-accent': c.accent }}>
               <div className="crew-sprite"><CharacterSprite character={c} pose="ride" /></div>
              <h3>{c.name}</h3>
              <small>{c.title}</small>
              <p>{c.perk}</p>
              <span className={`tag ${active ? 'tag-green' : ''}`}>
                {active ? 'LEADING' : unlocked ? c.perkShort : `UNLOCKS LV ${c.unlockLevel}`}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ServicesPanel({ save }) {
  return (
    <div>
      <div className="panel-head"><h2>The Upsell Tree</h2><p>A clean yard earns trust. Trust lets you offer more care — that's the business.</p></div>
      <div className="service-tree">
        {SERVICES.map((s, i) => {
          const unlocked = save.unlockedServices.includes(s.id)
          return (
            <div key={s.id} className={`service-node ${unlocked ? 'unlocked' : ''}`}>
              <div className="service-icon">{s.icon}</div>
              <div className="service-info"><strong>{s.name}</strong><p>{s.blurb}</p></div>
              <div className="service-price">${s.price}<small>/visit</small></div>
              <div className="service-status">{unlocked ? '✅ OFFERED' : `🔒 LV ${s.unlockLevel}`}</div>
              {i < SERVICES.length - 1 && <div className="service-connector" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function UpgradesPanel({ save, onBuyUpgrade }) {
  return (
    <div>
      <div className="panel-head"><h2>HQ Upgrade Station</h2><p>Reinvest your tips to grow the franchise. Clash-style, kid-friendly timers.</p></div>
      <div className="upgrade-grid">
        {UPGRADES.map((u) => {
          const level = save.upgrades[u.id] || 0
          const maxed = level >= u.max
          const cost = upgradeCost(u, level)
          return (
            <div key={u.id} className="upgrade-card">
              <div className="upgrade-icon">{u.icon}</div>
              <div className="upgrade-body">
                <strong>{u.name}</strong>
                <p>{u.desc}</p>
                <div className="pips">{Array.from({ length: u.max }).map((_, i) => <span key={i} className={i < level ? 'on' : ''} />)}</div>
              </div>
              <button className="btn btn-small" disabled={maxed || save.coins < cost} onClick={() => onBuyUpgrade(u.id, u)}>
                {maxed ? 'MAX' : `🪙 ${cost}`}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StoryPanel({ save }) {
  return (
    <div>
      <div className="panel-head"><h2>The Bedroom-to-Business Story</h2><p>Every great company starts small. Follow the Scūph journey.</p></div>
      <div className="story-list">
        {STORY_BEATS.map((b) => {
          const seen = save.level >= b.level
          return (
            <div key={b.level} className={`story-beat ${seen ? 'seen' : ''}`}>
              <div className="beat-level">{b.level}</div>
              <div><strong>{b.title}</strong><p>{b.text}</p></div>
              <div className="beat-check">{seen ? '⭐' : '🔒'}</div>
            </div>
          )
        })}
      </div>
      <div className="lesson-box">
        <h3>💡 Business Lesson of the Day</h3>
        <p>Start with one job done well. Earn trust. Reinvest your earnings. Take care of customers. That's how a route becomes a business — and how you make it to the finish line.</p>
      </div>
    </div>
  )
}
