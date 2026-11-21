// SCUPH SAFARI - canonical game data
// Brand facts pulled from SCUPH.COM (Maple Valley pet waste & pet care).

export const CHARACTERS = [
  {
    id: 'sir-scoops',
    name: 'Sir Scoops-a-Lot',
    title: 'The Knight Scūphr',
    perk: 'Wide scoop radius. Slow, steady, thorough.',
    perkShort: 'Wide Scoop',
    unlockLevel: 1,
    color: '#f4c95d',
    accent: '#8c5a1f',
    sprite: '🗡️',
    perkEffect: { scoopRadius: 1.6, speed: 0.9 },
  },
  {
    id: 'hopscotch',
    name: 'Hopscotch Hound',
    title: 'The Pointer',
    perk: 'Sniffs out hidden piles and hazards early.',
    perkShort: 'Sniffer',
    unlockLevel: 2,
    color: '#e88b5a',
    accent: '#7a3d1f',
    sprite: '🐕',
    perkEffect: { visibility: 1.5, speed: 1.0 },
  },
  {
    id: 'duchess-litterly',
    name: 'Duchess Litterly',
    title: 'The Cat Whisperer',
    perk: 'Litter-box combo bonus. Cats stay calm.',
    perkShort: 'Cat Calm',
    unlockLevel: 3,
    color: '#b58ce0',
    accent: '#5b3a80',
    sprite: '🐈',
    perkEffect: { litterBonus: 2, speed: 1.0 },
  },
  {
    id: 'sir-wags',
    name: 'Sir Wags-a-Lot',
    title: 'The Walker',
    perk: 'Friendly dogs wave back — double walking tips.',
    perkShort: 'Wag Master',
    unlockLevel: 4,
    color: '#7fc6a0',
    accent: '#2f6e4f',
    sprite: '🐕‍🦺',
    perkEffect: { waveTips: 2, speed: 1.05 },
  },
  {
    id: 'sir-hearthguard',
    name: 'Sir Hearthguard',
    title: 'The House Knight',
    perk: 'Overnight shield protects your combo streak.',
    perkShort: 'Hearth Shield',
    unlockLevel: 5,
    color: '#e07b7b',
    accent: '#7a2f2f',
    sprite: '🏰',
    perkEffect: { comboShield: true, speed: 0.95 },
  },
  {
    id: 'captain-sunbeam',
    name: 'Captain Sunbeam',
    title: 'The Rally Leader',
    perk: 'Speed burst on the final stretch. Leads the crew.',
    perkShort: 'Rally Speed',
    unlockLevel: 6,
    color: '#f2d05a',
    accent: '#9a6b12',
    sprite: '🦁',
    perkEffect: { finalSpeed: 1.5, speed: 1.1 },
  },
]

// Real services from SCUPH.COM, ordered as the business-lesson upsell tree.
export const SERVICES = [
  { id: 'waste-removal', name: 'Waste Removal', price: 40, blurb: 'Yard cleanup service. The job that starts it all.', icon: '🧹', unlockLevel: 1 },
  { id: 'waste-care', name: 'Waste Care / Litter Box', price: 25, blurb: 'Litter maintenance & feeding. Happy cats, happy homes.', icon: '🐱', unlockLevel: 2 },
  { id: 'pet-walking', name: 'Pet Walking', price: 25, blurb: 'GPS-tracked walks with photo updates. Adventure time!', icon: '🦮', unlockLevel: 3 },
  { id: 'boarding', name: 'Boarding / Daycare Drop-In', price: 35, blurb: 'Short stays or long periods. Safe and happy pets.', icon: '🏠', unlockLevel: 4 },
  { id: 'house-sitting', name: 'House Sitting', price: 80, blurb: 'We come to your home. Pets stay in their own space.', icon: '🛏️', unlockLevel: 5 },
  { id: 'complete-care', name: 'Complete Care Bundle', price: 149, blurb: 'All services included — Best Value!', icon: '🏆', unlockLevel: 6 },
]

export const NEIGHBORHOODS = [
  { id: 'oak-lane', name: 'Oak Lane', unlockLevel: 1, color: '#8fbf6a' },
  { id: 'birch-bend', name: 'Birch Bend', unlockLevel: 2, color: '#6fa85c' },
  { id: 'fox-hollow', name: 'Fox Hollow', unlockLevel: 3, color: '#d18a4a' },
  { id: 'sunset-estates', name: 'Sunset Estates', unlockLevel: 4, color: '#c96f5a' },
  { id: 'emergency-zone', name: 'Emergency Zone', unlockLevel: 5, color: '#b34a4a' },
]

export const UPGRADES = [
  { id: 'bike', name: 'Bike Speed', icon: '🚲', max: 5, baseCost: 60, desc: 'Ride faster through the route.' },
  { id: 'scoop', name: 'Scooper Pro', icon: '🥄', max: 5, baseCost: 75, desc: 'Bigger scoop radius, faster pops.' },
  { id: 'bag', name: 'Bag Capacity', icon: '🎒', max: 5, baseCost: 50, desc: 'Carry more before heading home.' },
  { id: 'crew', name: 'Crew Slots', icon: '👥', max: 4, baseCost: 120, desc: 'Bring more Scūphrs on group routes.' },
  { id: 'service', name: 'Service Level', icon: '⭐', max: 5, baseCost: 100, desc: 'Level up services for bigger tips.' },
]

export const STORY_BEATS = [
  { level: 1, title: 'Your First Route', text: 'One small job, done well. That is how every business starts.' },
  { level: 2, title: 'A Happy Customer', text: 'A happy customer tells a friend. That is how a route becomes a business.' },
  { level: 3, title: 'More Than Poop', text: 'Clean yards earn trust. Trust lets you offer more care.' },
  { level: 4, title: 'The Finish Line', text: 'Reliability is a habit. Show up, finish strong, repeat.' },
  { level: 5, title: 'Scūph Franchise', text: 'You built this from a bedroom dream into a Maple Valley crew.' },
]

export const XP_PER_LEVEL = (level) => 100 + (level - 1) * 60

// Yard Job phases - a full customer visit, not just a drive-by scoop.
export const YARD_PHASES = [
  { id: 'find', label: 'FIND', icon: '🔍', hint: 'Ride into bushes to uncover hidden piles!', duration: 14 },
  { id: 'scoop', label: 'SCOOP', icon: '🧹', hint: 'Scoop piles on contact. Chain combos!', duration: 14 },
  { id: 'mow', label: 'MOW', icon: '🚜', hint: 'Mow grass strips by riding through them!', duration: 14 },
  { id: 'rake', label: 'RAKE', icon: '🍂', hint: 'Rake leaves into tidy piles before departure!', duration: 14 },
]

// Roguelite level-up rewards. Pick 1 of 3 after every level up.
export const PERKS = [
  { id: 'magnet-bag', name: 'Magnet Bag', icon: '🧲', desc: 'Auto-scoops a nearby pile every 2 seconds.', color: '#7fc6a0' },
  { id: 'turbo-mower', name: 'Turbo Mower', icon: '⚡', desc: 'Each mow clears 2 grass strips at once.', color: '#f2d05a' },
  { id: 'leaf-blower', name: 'Leaf Blower 3000', icon: '🍃', desc: 'Each rake clears 2 leaf clusters.', color: '#8fbf6a' },
  { id: 'golden-scoop', name: 'Golden Scoop', icon: '🪙', desc: 'Double points from every scoop.', color: '#f2c14e' },
  { id: 'super-sniffer', name: 'Super Sniffer', icon: '🐽', desc: 'Uncover 2 bushes with every tap.', color: '#e88b5a' },
  { id: 'hearth-shield', name: 'Hearth Shield', icon: '🛡️', desc: 'Chaos events become bonus points instead of penalties.', color: '#e07b7b' },
  { id: 'rally-timer', name: 'Rally Timer', icon: '⏱️', desc: '+4 seconds on every phase.', color: '#b58ce0' },
  { id: 'combo-keeper', name: 'Combo Keeper', icon: '🔥', desc: 'Chaos never breaks your combo streak.', color: '#e0694f' },
]

export function pickPerkChoices(owned = [], count = 3) {
  const pool = PERKS.filter((p) => !owned.includes(p.id))
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

// Art mapping — fill these in once the character↔file assignment is confirmed.
// See public/assets/ART-MANIFEST.md. `null` keeps the emoji fallback in play.
export const CHARACTER_ART = {
  'sir-scoops': null,
  'hopscotch': null,
  'duchess-litterly': null,
  'sir-wags': null,
  'sir-hearthguard': null,
  'captain-sunbeam': null,
}

export const BRAND_ART = {
  logo: '/assets/brand/scuph-logo.png',
  keyArt: null,
  rally: '/assets/brand/safari-knights-rally.gif',
  lineup: '/assets/brand/frog-knights-castle-lineup.png',
}
