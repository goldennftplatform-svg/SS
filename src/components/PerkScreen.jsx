import React from 'react'

export default function PerkScreen({ choices, newLevel, onPick }) {
  return (
    <div className="screen perk-screen">
      <div className="perk-bg-stars" aria-hidden="true">✦ ✧ ✦ ✧ ✦</div>
      <div className="perk-header">
        <div className="perk-burst">🎉</div>
        <h1>LEVEL {newLevel}!</h1>
        <p>Your Scūph business is growing. Choose one upgrade to keep it rolling!</p>
      </div>
      <div className="perk-cards">
        {choices.map((perk) => (
          <button key={perk.id} className="perk-card" onClick={() => onPick(perk.id)}
            style={{ '--perk-color': perk.color }}>
            <div className="perk-icon">{perk.icon}</div>
            <h2>{perk.name}</h2>
            <p>{perk.desc}</p>
            <span className="perk-choose">CHOOSE THIS →</span>
          </button>
        ))}
      </div>
      <p className="perk-footnote">Perks are earned by playing — never bought. That's the Scūph way.</p>
    </div>
  )
}
