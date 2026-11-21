import React, { useRef, useState } from 'react'
import { cities, roads, count, open, owned, neighbors, dividend, flyerCost } from '../game/region.js'
import { CHARACTERS, SERVICES } from '../data/gameData.js'
import { ScoopKnight } from './CharacterSprite.jsx'
import Install from './Install.jsx'
import './region.css'
import colors from '../data/palette.json'

const missions = { yard: '🚜 Yard refresh', route: '🚲 Bike route', urgent: '🚨 Rush cleanup' }
const emojiFor = { yard: '🍂', route: '🚲', urgent: '🚨' }

// Bisect the atlas between towns to draw adjoining claimable districts.
function district(c) {
  let p = [[0, 0], [1040, 0], [1040, 646], [0, 646]]
  for (const d of cities.filter((x) => x !== c)) {
    const side = ([x, y]) => (x - (c.x + d.x) / 2) * (d.x - c.x) + (y - (c.y + d.y) / 2) * (d.y - c.y)
    p = p.flatMap((a, i) => {
      const b = p[(i + 1) % p.length], u = side(a), v = side(b)
      return [...(u <= 0 ? [a] : []), ...(u * v < 0 ? [[a[0] + (b[0] - a[0]) * u / (u - v), a[1] + (b[1] - a[1]) * u / (u - v)]] : [])]
    })
  }
  return p.map((v) => v.join(',')).join(' ')
}
const polygons = cities.map(district)

export default function Region({ save, id, select, onJob, onFlyer, onHQ, onShowDialogue, muted, onToggleSound }) {
  const [zoom, setZoom] = useState(1)
  const box = useRef(null)
  const c = cities[id]
  const available = open(save, id)
  const claimed = owned(save, id)
  const branches = cities.filter((n) => owned(save, n.id))
  const stars = save.totalStars || 0
  const nextChar = CHARACTERS.find((x) => x.unlockLevel > save.level)
  const nextService = SERVICES.find((x) => x.unlockLevel > save.level)
  const nextUnlock = nextChar || nextService
  const campaignPct = Math.round((branches.length / cities.length) * 100)
  const contract = save.contract
  const contractCity = contract ? cities[contract.city] : null

  function locate(n) {
    select(n.id)
    const el = box.current
    if (el) el.scrollTo({ left: el.scrollWidth * n.x / 1040 - el.clientWidth / 2, top: el.scrollHeight * n.y / 646 - el.clientHeight / 2, behavior: 'smooth' })
  }
  React.useEffect(() => {
    const el = box.current
    if (el) { el.scrollLeft = el.scrollWidth * c.x / 1040 - el.clientWidth / 2; el.scrollTop = el.scrollHeight * c.y / 646 - el.clientHeight / 2 }
  }, [zoom]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="atlas" style={Object.fromEntries(Object.entries(colors).map(([k, v]) => [`--${k}`, v]))}>
      <header>
        <div className="atlas-title">
          <div className="atlas-hero"><ScoopKnight pose="ride" /></div>
          <div>
            <small><span className="brand-pip" /> SCŪPH SAFARI　/　CAMPAIGN 01</small>
            <h1>South Sound <em>takeover.</em></h1>
            <p className="atlas-sub">From Maple Valley to Olympia — one clean yard at a time.</p>
          </div>
        </div>
        <div className="atlas-actions">
          <button className="sound-mini" onClick={onToggleSound} aria-label="Toggle sound">{muted ? '🔇' : '🎵'}</button>
          <Install />
          <button onClick={onHQ}>Crew & HQ ↗</button>
        </div>
      </header>

      <section className="tracker-strip" aria-label="Campaign progress">
        <div className="tracker-main">
          <span className="tracker-label">🏁 CAMPAIGN PROGRESS</span>
          <div className="tracker-bar"><i style={{ width: `${campaignPct}%` }} /></div>
          <b>{branches.length}/{cities.length} branches · {campaignPct}%</b>
        </div>
        <div className="tracker-chip"><span>⭐</span><b>Lv {save.level}</b><small>XP {save.xp}</small></div>
        <div className="tracker-chip"><span>🪙</span><b>{save.coins}</b><small>coins</small></div>
        <div className="tracker-chip"><span>🌟</span><b>{save.reputation.toFixed(1)}</b><small>reputation</small></div>
        <div className="tracker-chip"><span>🔥</span><b>{save.streak || 1}×</b><small>streak</small></div>
        <div className="tracker-chip"><span>⭐</span><b>{stars}</b><small>stars</small></div>
        <div className="tracker-chip"><span>🦴</span><b>{save.bones}</b><small>bones</small></div>
      </section>

      <section className="atlas-layout">
        <div className="map-shell">
          <div className="map-tools">
            <b>🗺️ WASHINGTON · FIELD ATLAS</b>
            <span className="map-tools-note">Tap a town to dispatch</span>
            <button aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom(zoom - .5)}>−</button>
            <button aria-label="Zoom in" disabled={zoom >= 2} onClick={() => setZoom(zoom + .5)}>+</button>
          </div>
          <div className="map-scroll" ref={box}>
            <svg viewBox="0 0 1040 646" style={{ width: `${zoom * 100}%`, minWidth: 740 * zoom }} aria-label="Interactive South Sound territory map">
              <defs>
                <pattern id="pines" width="34" height="28" patternUnits="userSpaceOnUse"><path d="m8 16 5-8 5 8m-8-1 3-4 2 3" fill="none" stroke="var(--mist)" opacity=".25" /></pattern>
                <pattern id="water" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="var(--fjord)" /><circle cx="4" cy="4" r="1" fill="#57759a" /></pattern>
              </defs>
              <rect width="1040" height="646" fill="var(--terrain)" />
              {cities.map((n) => <polygon key={n.id} points={polygons[n.id]} className={owned(save, n.id) ? 'district owned' : open(save, n.id) ? 'district available' : 'district'} onClick={() => select(n.id)} />)}
              <path d="M0 0H458L402 79 419 116 389 162 404 202 352 263 330 237 346 190 310 208 280 274 237 263 251 211 216 239 181 324 135 355 157 392 108 458 81 439 117 373 93 370 53 456 62 520 36 573 27 548 29 489 0 510Z" fill="url(#water)" stroke="#51678e" strokeWidth="2" />
              <path d="M1040 300 995 330 942 390 855 423 802 475 687 512 566 646h474Z" fill="url(#pines)" />
              <text x="98" y="148" transform="rotate(-22 98 148)" className="geo-label">PUGET SOUND</text>
              <text x="730" y="544" className="geo-label">CASCADE FOOTHILLS</text>
              <g className="compass" transform="translate(976 96)"><circle r="30" fill="none" stroke="var(--border)" /><path d="M0-24 6 0 0 24-6 0Z" fill="var(--lime)" /><text y="-36" textAnchor="middle" className="geo-label">N</text></g>
              {roads.map(([a, b]) => {
                const live = owned(save, a) || owned(save, b)
                return <g key={`${a}-${b}`}>
                  <path d={`M${cities[a].x} ${cities[a].y}L${cities[b].x} ${cities[b].y}`} stroke={live ? 'var(--mint)' : '#71809e'} strokeWidth="2.5" strokeDasharray={live ? undefined : '4 5'} />
                  <text x={(cities[a].x + cities[b].x) / 2} y={(cities[a].y + cities[b].y) / 2 + 5} textAnchor="middle" className="road-paw">{live ? '🐾' : '·'}</text>
                </g>
              })}
              {cities.map((n) => {
                const isOwned = owned(save, n.id), isOpen = open(save, n.id)
                const progress = count(save, n.id) / n.goal
                return <g key={n.id} className={`town-pin ${id === n.id ? 'selected' : ''}`} tabIndex="0" role="button"
                  aria-label={`${n.name}, ${isOwned ? 'branch' : isOpen ? 'available' : 'locked'}`}
                  onClick={() => select(n.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(n.id) } }}>
                  <circle cx={n.x} cy={n.y} r="24" fill="transparent" />
                  {id === n.id && <circle cx={n.x} cy={n.y} r="18" fill="none" stroke="var(--iris)" strokeWidth="3" className="pin-ring" />}
                  {isOpen && !isOwned && <text x={n.x + 20} y={n.y - 16} className="pin-spark">✨</text>}
                  {isOwned && <text x={n.x + 17} y={n.y - 14} className="pin-flag">🚩</text>}
                  <circle cx={n.x} cy={n.y} r="10" fill={isOwned ? 'var(--mint)' : isOpen ? 'var(--lime)' : 'var(--mist)'} stroke="var(--midnight)" strokeWidth="3" />
                  <text x={n.x} y={n.y + 4} textAnchor="middle" fill="var(--midnight)" fontSize="12">{isOwned ? '⚑' : n.id === 19 ? '★' : '•'}</text>
                  <circle cx={n.x} cy={n.y} r="13" fill="none" stroke={isOwned ? 'var(--mint)' : 'var(--lime)'} strokeWidth="2.5"
                    strokeDasharray={`${progress * 82} 82`} transform={`rotate(-90 ${n.x} ${n.y})`} opacity={isOpen ? 1 : 0} />
                  <text x={n.x} y={n.y + 34} textAnchor="middle" className="town-label">{n.name}</text>
                  {isOpen && <text x={n.x} y={n.y + 47} textAnchor="middle" className="town-need">{emojiFor[n.special]} {count(save, n.id)}/{n.goal}</text>}
                </g>
              })}
            </svg>
          </div>
          <footer><span>● Open market</span><span>⚑ Your branch</span><span>• Unreached</span><span>◎ Selected</span><span>🐾 Active road</span></footer>
        </div>

        <aside>
          <div className="contract-card" onClick={() => contract && onShowDialogue?.('contractHint', { city: contractCity?.name, goal: contract?.label, reward: contract?.reward })} role="button" tabIndex="0">
            <small>📋 DAILY CONTRACT</small>
            <b>{contract?.label || 'Scooping contract'}</b>
            <span>{contractCity?.name || 'Maple Valley'} · {contract?.progress || 0}/{contract?.goal || 1}</span>
            <div className="contract-bar"><i style={{ width: `${Math.round(((contract?.progress || 0) / (contract?.goal || 1)) * 100)}%` }} /></div>
            <strong>+{contract?.reward || 0} 🪙 bonus</strong>
          </div>

          <small>REGIONAL LEDGER</small>
          <div className="ledger"><b>{branches.length}/{cities.length} branches</b><b>{save.coins} coins</b></div>
          <p>{owned(save, 19) ? '★ Olympia secured! Fill the remaining districts to own the whole region.' : 'Campaign goal: plant your flag in Olympia.'}</p>

          <hr />
          <small>{claimed ? 'ESTABLISHED BRANCH' : available ? 'DISPATCH BOARD' : 'UNREACHED MARKET'}</small>
          <h2>{c.name} <span className="h2-emoji">{emojiFor[c.special]}</span></h2>
          <i>{c.hood}</i>
          <p>{count(save, id)} / {c.goal} regular customers</p>
          <progress value={count(save, id)} max={c.goal} />
          {available ? <>
            <p>{claimed ? `Your network pays ${dividend(save)} bonus coins per completed job.` : `Win ${c.goal - count(save, id)} more to plant a flag. Each star earns a regular.`}</p>
            {Object.entries(missions).sort(([a], [b]) => Number(b === c.special) - Number(a === c.special)).map(([type, label]) => (
              <button key={type} onClick={() => onJob(type)}>{label}{type === c.special ? ' · Local demand +1' : ''} →</button>
            ))}
            {!claimed && id !== 0 && <button disabled={save.coins < flyerCost} onClick={onFlyer}>📣 Send flyers · {flyerCost} coins / +1 regular</button>}
          </> : <p>Establish a branch in a connected city to enter this market.</p>}

          {nextUnlock && <><hr /><small>NEXT UNLOCK · LEVEL {nextUnlock.unlockLevel}</small>
            <div className="unlock-row"><span>{nextChar ? nextChar.sprite : nextService.icon}</span><b>{nextChar?.name || nextService.name}</b></div>
            <div className="unlock-bar"><i style={{ width: `${Math.min(100, (save.xp / (100 + (save.level - 1) * 60)) * 100)}%` }} /></div></>}

          <hr /><small>RECENT DISPATCHES</small>
          <ul className="event-log">
            {(save.eventLog || []).length === 0 && <li>No dispatches yet. Your story starts here.</li>}
            {(save.eventLog || []).slice(0, 3).map((e, i) => <li key={`${e.at}-${i}`}>{e.text}</li>)}
          </ul>

          <hr /><small>CONNECTING ROADS</small>
          <div className="road-links">{neighbors(id).map((i) => <button key={i} onClick={() => locate(cities[i])}>{cities[i].name} ↗</button>)}</div>
        </aside>
      </section>
    </main>
  )
}
