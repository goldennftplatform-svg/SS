import React, { memo } from 'react'

// The road sprites are little illustrations; the dispatch seal also has
// to read at 16px, so its silhouette and check carry the whole design.
export const DispatchSeal = memo(function DispatchSeal() {
  return <svg viewBox="0 0 32 32" aria-hidden="true" className="dispatch-seal">
    <path d="m8 17-4 12 6-2 3 4 4-11 4 11 3-5 5 2-5-12" fill="#c56c4d" stroke="#23342b" strokeWidth="2"/>
    <path d="m16 1 4 2 5 1 2 4 3 4-1 5-1 5-5 2-4 3-5-1-5-1-3-4-3-4 1-5 1-5 5-2z" fill="#e6b760" stroke="#23342b" strokeWidth="2"/>
    <circle cx="16" cy="14" r="9" fill="#245d4a"/>
    <path d="m11 14 3.5 3.5 7-8" fill="none" stroke="#fff2cf" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
})

export const FieldScoop = memo(function FieldScoop() {
  return <svg viewBox="0 0 32 32" className="field-scoop" aria-hidden="true">
    <g stroke="#23342b" strokeWidth="1.8" strokeLinejoin="round">
      <path d="m11 19 12-14 3 3-12 14z" fill="#e6b760"/>
      <path d="m20 5 3-4 7 6-3 4z" fill="#42725c"/>
      <path d="m2 22 6-7 7 1 5 5-7 9-8-2z" fill="#97b7a9"/>
      <path d="m3 22 9 2 7-4-6 10-8-2z" fill="#548173"/>
    </g>
    <path d="m6 21 4-4m-4 8 5 1" stroke="#fff2cf" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
})

const siding = ['#cd8358', '#7ba596', '#d8b671']
export const CedarHouse = memo(function CedarHouse({ lot }) {
  const style = lot % 3
  return <svg className="cedar-house" viewBox="0 0 80 60" aria-hidden="true">
    <ellipse cx="40" cy="55" rx="38" ry="4" fill="#23342b" opacity=".24"/>
    <g stroke="#23342b" strokeWidth="2.3" strokeLinejoin="round">
      <path d="M8 52V36H2l8-13H5l8-17 7 17h-4l8 13h-8v16z" fill="#386952"/>
      <path d="M17 31 36 14l18 13h16v26H17z" fill={siding[style]}/>
      <path d="M49 23V9h7v16" fill="#b8785b"/>
      <path d={['M11 31 35 7l23 15h12l5 9H52L36 18 18 35z',
        'M11 32 29 9h20l11 14h10l5 8H54L44 19H32L19 34z',
        'M12 32 37 5l24 23h10l4 5H54L37 16 19 36z'][style]} fill="#435b5b"/>
      <path d="M22 36h13v11H22z" fill="#ffe6a4"/>
      <path d="M28.5 36v11m-6.5-5.5h13" strokeWidth="1.4"/>
      <path d="M41 52V34h10v18" fill="#365c50"/>
      <path d="M56 37h9v8h-9z" fill="#ffe6a4"/>
      <path d="M39 53h14l3 3H36z" fill="#c6c3aa"/>
    </g>
    <circle cx="48" cy="44" r="1.3" fill="#efc36e"/>
    <path d="M17 51q1-8 6-5 4-5 8 1 5-1 6 5H17z" fill="#507a51"/>
  </svg>
})
