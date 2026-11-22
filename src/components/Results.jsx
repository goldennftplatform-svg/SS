import React from 'react'
import { ScoopKnight } from './CharacterSprite.jsx'

export default function Results({ rewards, save, leveledUp, onContinue }) {
  const { stars, coins, bones, xp, repDelta, revenue } = rewards
  return (
    <div className="screen results-screen">
      <div className="results-card">
        {save.activeCharacter === 'sir-scoops' && <ScoopKnight pose="report"/>}
        <div className="results-banner">{stars === 3 ? 'PERFECT ROUTE!' : stars === 2 ? 'NICE SCOOPING!' : 'ROUTE COMPLETE!'}</div>
        <div className="stars">{[0, 1, 2].map((i) => <span key={i} className={i < stars ? 'lit' : ''}>⭐</span>)}</div>
        <p className="results-sub">{rewards.dispatch}</p>
        {rewards.routeCard && <p className="route-receipt">{rewards.routeCard}</p>}
        <div className="rewards-grid">
          <div><span>🪙</span><strong>+{coins}</strong><small>Coins</small></div>
          <div><span>✨</span><strong>+{xp}</strong><small>XP</small></div>
          <div><span>🌟</span><strong>{repDelta >= 0 ? '+' : ''}{repDelta.toFixed(1)}</strong><small>Reputation</small></div>
          <div><span>🦴</span><strong>+{bones}</strong><small>Bones</small></div>
          {rewards.contractBonus > 0 && <div className="contract-bonus"><span>📋</span><strong>+{rewards.contractBonus}</strong><small>Contract</small></div>}
        </div>
        <div className="revenue-line">Franchise revenue: <strong>${save.franchiseRevenue}</strong> total</div>
        {leveledUp && <div className="level-up-banner">🎉 LEVEL UP! You're now Level {save.level} — new crew & services unlocked!</div>}
        <button className="btn btn-primary big" onClick={onContinue}>{leveledUp?'Continue →':'Back to map'}</button>
      </div>
    </div>
  )
}
