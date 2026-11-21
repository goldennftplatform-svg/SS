import React from 'react'
import { ScoopKnight } from './CharacterSprite.jsx'

export default function TitleScreen({ onPlay, save }) {
  return (
    <div className="screen title-screen">
      <div className="sunburst" aria-hidden="true" />
      <div className="title-card">
        <div className="title-badge">A SCUPH.COM GAME</div>
        <h1 className="game-title">
          <span className="title-scuph">SCUPH</span>
          <span className="title-safari">SAFARI</span>
        </h1>
        <p className="title-tagline">Making the world cleaner, one scoop at a time.</p>
        <div className="title-art">
          <ScoopKnight />
        </div>
        <button className="btn btn-primary big" onClick={onPlay}>
          {save.routesCompleted > 0 ? 'CONTINUE ROUTE' : 'START YOUR FIRST ROUTE'}
        </button>
        <p className="title-footnote">Free to play · Built for dreamers & Scūphrs · Maple Valley, WA</p>
      </div>
    </div>
  )
}
