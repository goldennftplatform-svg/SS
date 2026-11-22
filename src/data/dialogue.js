// Full in-game dialogue. Placeholders are filled from game state at display time.
export const SPEAKERS = {
  narrator: { name: 'THE FIELD LOG', color: '#BDACFF', icon: '📖' },
  scoops: { name: 'SIR SCOOPS-A-LOT', color: '#D6FF69', icon: '🗡️', knight: true },
  hopscotch: { name: 'HOPSCOTCH HOUND', color: '#E88B5A', icon: '🐕' },
  duchess: { name: 'DUCHESS LITTERLY', color: '#C9A7F0', icon: '🐈' },
  wags: { name: 'SIR WAGS-A-LOT', color: '#5EE4BB', icon: '🐕‍🦺' },
  hearthguard: { name: 'SIR HEARTHGUARD', color: '#F08C8C', icon: '🏰' },
  captain: { name: 'CAPTAIN SUNBEAM', color: '#F2D05A', icon: '🦁' },
  customer: { name: 'YOUR CUSTOMER', color: '#F1F3FF', icon: '🏡' },
  mascot: { name: 'A VERY SMALL PILE', color: '#C9A978', icon: '💩' },
  dispatch: { name: 'DISPATCH RADIO', color: '#5EE4BB', icon: '📻' },
}

const L = (speaker, text) => ({ speaker, text })

export const SCRIPTS = {
  intro: [
    L('narrator', 'Maple Valley, Washington. A quiet street. A very not-quiet pile.'),
    L('mascot', 'Excuse me. I have been left unattended. Again.'),
    L('scoops', 'Fear not, citizen. The Knight Scūphr has arrived.'),
    L('scoops', 'My scooper is polished. My visor is straight. My route is... substantial.'),
    L('narrator', 'One street. One scoop. One small business. Tap anywhere to begin the takeover.'),
  ],
  dispatch: [
    L('dispatch', 'New work in {city}! The {job} request just came in.'),
    L('customer', 'Oh! You found it. I was about to get the rake. No rush,Scūphr.'),
  ],
  routeStart: [
    L('scoops', 'Slow down, read the lane, hit the pile. Wild swings break the chain.'),
    L('dispatch', 'Chain window is short. Hazards cost two seconds. Wave at good dogs if you dare.'),
  ],
  yardStart: [
    L('customer', 'Bushes, piles, grass, leaves — and my truck is the dump point.'),
    L('scoops', 'Carry only what you can haul. Keep moving or the chain dies. No farming today!'),
  ],
  hotStreak: [L('scoops', 'HOT STREAK! The crowd is starting to notice.')],
  storm: [L('dispatch', 'SCUPH STORM! Keep that chain alive!')],
  legend: [L('narrator', 'LEGENDARY SCŪPHR. Somewhere, a tiny flag salutes you.')],
  comboLost: [L('dispatch', 'Chain broken! No time for daydreams out there.')],
  sprinkler: [L('mascot', 'SPRINKLER! I was peaceful one moment ago!')],
  dog: [L('customer', 'Loose dog! Quick, give them a wave!')],
  found: [L('scoops', 'Found you. No pile escapes the visor.')],
  phase: [L('dispatch', 'Phase clear. Advance to the next station!')],
  gust: [L('mascot', 'WIND! I did not consent to be airborne!')],
  onTime: [L('dispatch', 'Departure made! The next client is already waiting.')],
  late: [L('dispatch', 'You missed the departure! The client cancelled and the referral is gone.')],
  perfect: [
    L('customer', 'Spotless. Absolutely spotless. Did you polishthe grass too?'),
    L('scoops', 'Only the grass that required it, madam.'),
  ],
  good: [L('customer', 'That is a huge improvement. Thank you,Scūphr!')],
  rough: [L('customer', 'A valiant start! A few stragglers remain, but the yard breathes easier.')],
  branch: [
    L('dispatch', 'Branch established in {city}! Your flag goes up.'),
    L('captain', 'That is how a route becomes a network. Onward!'),
  ],
  olympia: [
    L('narrator', 'Olympia secured. The capital knows the name SCUPH.'),
    L('scoops', 'We came. We scooped. We left a cleaner kingdom.'),
  ],
  levelUp: [
    L('narrator', 'LEVEL {level}! A new chapter opens for the crew.'),
    L('scoops', 'A bigger shovel is fine, but a bigger heart is better.'),
  ],
  contract: [
    L('dispatch', 'Daily contract complete: {goal}. Bonus {reward} coins deposited!'),
  ],
  contractHint: [
    L('dispatch', 'Current contract: {goal} in {city}. Finish it for {reward} bonus coins.'),
  ],
  hub: [
    L('hopscotch', 'I sniffed the whole map. Everything smells like opportunity.'),
    L('duchess', 'And a little like litter boxes. We should charge extra.'),
  ],
  unlocked: [L('narrator', 'New crew and services unlocked. Check Crew & HQ!')],
}

export function buildLines(key, ctx = {}) {
  const script = SCRIPTS[key] || []
  return script.map((line, i) => ({
    ...line,
    id: `${key}-${i}`,
    text: line.text.replace(/\{(\w+)\}/g, (_, k) => ctx[k] ?? ''),
  }))
}
