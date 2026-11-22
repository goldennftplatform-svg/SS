import React from 'react'
import { BlockArt } from './BlockArt.jsx'

// Original vector puppet: the same face, visor and tabard in three silhouettes.
export function ClassicKnight({ pose = 'ride' }) {
  const ride = pose === 'ride', bow = pose === 'report'
  const ink = '#23342b', brass = '#f1bb52', leaf = '#92bd58', steel = '#adc4b6'
  return <svg className={`scoop-knight knight-${pose}`} viewBox="0 0 200 160" role="img"
    aria-label={ride ? 'Sir Scoops pedaling his service bike' : bow ? 'Sir Scoops bowing with a checked yard report' : 'Sir Scoops crouching with his scoop'}>
    <ellipse cx="99" cy="148" rx="84" ry="6" fill="#26372a" opacity=".16"/>
    <g stroke={ink} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
      {ride && <g>
        {[45,154].map(x=><g key={x}><circle cx={x} cy="122" r="26" fill="#fff1c6"/><circle cx={x} cy="122" r="21" fill={steel}/><path d={`M${x-20} 122h40 M${x} 102v40`} strokeWidth="2"/></g>)}
        <path d="M45 122l26-40 29 40H45l68-28 22-13 19 41-23-57h-13" fill="none" strokeWidth="6"/>
        <path d="M68 82l-4-10m-10 0h26" fill="none"/><path d="M27 81l25-2 1 26-24 3z" fill="#ab6944"/><path d="M26 81l13 11 13-13" fill={brass}/>
        <path d="M41 112l53-15" stroke={brass}/><path d="M89 95l12-6 5 9-14 3z" fill={steel}/>
      </g>}
      <g transform={ride?'translate(9 -4)':bow?'translate(-4 10)':'translate(0 17)'}>
        <path d={ride?'M77 87q-17 13 2 21l18 6 9-7-19-10 11-8':'M77 89q-29 2-28 21l24 10 18-3-18-11 25-10'} fill={leaf}/>
        <path d={ride?'M90 79q27 3 22 19l-10 16-12-4 8-16-17-1':'M95 85q22 5 18 19l-12 10 19 3q7 8-5 9H88q-11-4-4-12l11-13-16-3'} fill={leaf}/>
        <path d="M82 48q-10 8-18 23l-19 7q13 11 30 3l10-17" fill="#cf6542"/>
        <path d="M84 48q25-5 30 18l-8 27q-19 8-40-4l8-28z" fill="#245d4a"/>
        <path d="M74 80q16 7 36 3l-2 8q-17 4-38-4z" fill={brass}/>
        <g transform={bow?'rotate(26 93 55)':ride?'rotate(-7 93 55)':'rotate(12 93 55)'}>
          <path d="M70 36q1-18 17-18 10-13 24-6 9 3 10 16 20 1 22 13 0 16-29 20-40 7-46-9z" fill={leaf}/>
          <ellipse cx="113" cy="28" rx="10" ry="13" fill="#fff2c8"/>
          <ellipse cx="117" cy="29" rx="3" ry="6" fill={ink} stroke="none"/>
          <path d="M94 46q18 10 41-3" fill="none"/>
          <path d="M59 30l7-7Q67 0 89 2q21 0 28 16l11 2-4 6-42 3-8 16-12-1z" fill={steel}/>
          <path d="M66 24l50-5 13 1-1 5-56 6z" fill={brass}/><circle cx="74" cy="34" r="3" fill={brass} strokeWidth="2"/>
        </g>
        {ride ? <path d="M102 60q7-5 10 3l5 8 13-6q6-1 7 5l-17 12q-8 3-13-4l-8-10z" fill={leaf}/>
          : bow ? <g><path d="M105 64q8-3 11 9l17 5-2 12-24-6-9-13z" fill={leaf}/>
            <path d="M123 58l35-5 5 45-35 4z" fill="#fff2cf"/><path d="M132 71l5 4 8-11" fill="none" stroke="#337451"/><path d="M133 84l17-2m-16 9 12-1" strokeWidth="2"/></g>
          : <g><path d="M101 64q9-4 13 8l16 7-6 10-19-9-9-9z" fill={leaf}/><path d="M119 75l43 41" strokeWidth="6"/><path d="M149 111l12-8 19 13q-7 16-24 10z" fill={steel}/></g>}
      </g>
    </g>
  </svg>
}

export function ScoopKnight({ pose = 'ride' }) {
  return <BlockArt kind="worker" pose={pose} className={`scoop-knight knight-${pose}`} label="Sir Scoops-a-Lot"/>
}
export default function CharacterSprite({ character, pose = 'work' }) {
  return <BlockArt kind="worker" character={character} pose={pose} className={`scoop-knight knight-${pose}`} label={character?.name}/>
}
