// Pure game logic. Kept free of React so platform adapters (Hopcity netcode,
// wallet providers, etc.) can reuse it later.

import { CHARACTERS, SERVICES, XP_PER_LEVEL, pickPerkChoices } from '../data/gameData.js'
import { open } from './region.js'

const SAVE_KEY = 'scuph-safari-save-v1'

export const defaultSave = () => ({
  coins: 120,
  bones: 0,
  xp: 0,
  level: 1,
  reputation: 3.0,
  streak: 1,
  unlockedCharacters: ['sir-scoops'],
  activeCharacter: 'sir-scoops',
  unlockedServices: ['waste-removal'],
  upgrades: { bike: 0, scoop: 0, bag: 0, crew: 1, service: 0 },
  perks: [],
  routesCompleted: 0,
  yardJobsCompleted: 0,
  totalStars: 0,
  franchiseRevenue: 0,
  storySeen: [],
  dialogueSeen: [],
  eventLog: [],
  contract: null,
})

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return defaultSave()
    const parsed = JSON.parse(raw)
    return { ...defaultSave(), ...parsed, upgrades: { ...defaultSave().upgrades, ...(parsed.upgrades || {}) } }
  } catch {
    return defaultSave()
  }
}

export function persistSave(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save))
  } catch {
    /* storage disabled - game still works in memory */
  }
}

export function characterById(id) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0]
}

export function serviceById(id) {
  return SERVICES.find((s) => s.id === id) || SERVICES[0]
}

export function upgradeCost(upgrade, currentLevel) {
  return Math.round(upgrade.baseCost * Math.pow(1.6, currentLevel))
}

export function progressToNextLevel(xp, level) {
  const need = XP_PER_LEVEL(level)
  return { current: xp, need, pct: Math.min(100, (xp / need) * 100) }
}

// Score a finished route. `performance` is 0..1 (cleanliness + speed + combo).
export function scoreRoute({ performance, urgency = false, character, mistakes = 0 }) {
  const stars = performance >= 0.93 ? 3 : performance >= 0.68 ? 2 : 1
  const baseCoins = Math.round(35 + performance * 70)
  const coinMult = urgency ? 2 : 1
  const coins = Math.round(baseCoins * coinMult + (character?.perkEffect?.waveTips ? 10 : 0))
  const xp = Math.round(30 + performance * 55)
  const bones = stars === 3 ? 1 : 0
  const repDelta = +((stars - 2) * 0.12 - Math.min(0.15, mistakes * 0.03)).toFixed(2)
  const revenue = urgency ? 90 : Math.round(35 + performance * 50)
  return { stars, coins, xp, bones, repDelta, revenue }
}

// Score a full yard job (find + scoop + mow + rake). More valuable than a
// drive-by route because the customer trusts you with more of their yard.
export function scoreYardJob({ performance, character, perks = [], mistakes = 0 }) {
  const stars = performance >= 0.93 ? 3 : performance >= 0.68 ? 2 : 1
  const perkBonus = perks.length * 0.05
  const coins = Math.round((50 + performance * 85) * (1 + perkBonus))
  const xp = Math.round(45 + performance * 70)
  const bones = stars === 3 ? 2 : stars === 2 ? 1 : 0
  const repDelta = +((stars - 2) * 0.15 - Math.min(0.15, mistakes * 0.03)).toFixed(2)
  const revenue = Math.round(60 + performance * 95)
  return { stars, coins, xp, bones, repDelta, revenue, yard: true }
}

export function grantPerk(save, perkId) {
  if (!perkId || save.perks.includes(perkId)) return save
  return { ...save, perks: [...save.perks, perkId], perkChoices: [] }
}

export function rollPerkChoices(save) {
  return pickPerkChoices(save.perks || [], 3)
}

export function applyRewards(save, rewards) {
  const next = { ...save, upgrades: { ...save.upgrades } }
  next.coins += rewards.coins
  next.bones += rewards.bones
  next.xp += rewards.xp
  next.totalStars += rewards.stars
  next.routesCompleted += 1
  if (rewards.yard) next.yardJobsCompleted = (next.yardJobsCompleted || 0) + 1
  next.franchiseRevenue += rewards.revenue
  next.reputation = Math.max(0, Math.min(5, +(next.reputation + rewards.repDelta).toFixed(2)))

  const need = XP_PER_LEVEL(next.level)
  if (next.xp >= need) {
    next.xp -= need
    next.level += 1
    const newlyUnlocked = CHARACTERS.filter((c) => c.unlockLevel === next.level).map((c) => c.id)
    next.unlockedCharacters = [...new Set([...next.unlockedCharacters, ...newlyUnlocked])]
    const newServices = SERVICES.filter((s) => s.unlockLevel === next.level).map((s) => s.id)
    next.unlockedServices = [...new Set([...next.unlockedServices, ...newServices])]
    next.levelUpFlash = true
  }
  return next
}

// A rotating contract gives every job a reason to exist beyond the map grind.
export function makeContract(save, cities) {
  const available = cities.filter((c) => open(save, c.id))
  const pool = available.length ? available : cities.slice(0, 1)
  const city = pool[Math.floor(Math.random() * pool.length)]
  const goals = { yard: 4, route: 5, urgent: 3 }
  const rewards = { yard: 35, route: 45, urgent: 60 }
  return {
    city: city.id,
    type: city.special,
    goal: goals[city.special] || 4,
    progress: 0,
    reward: rewards[city.special] || 35,
    label: city.special === 'yard' ? 'Yard Refreshes' : city.special === 'urgent' ? 'Rush cleanups' : 'Bike routes',
  }
}

export function updateContract(save, cities, result) {
  const contract = save.contract || makeContract(save, cities)
  const matches = contract.city === result.city && (contract.type === result.type || contract.type === result.jobType)
  if (!matches) return { save: { ...save, contract }, completed: false }
  const progress = Math.min(contract.goal, contract.progress + Math.max(1, result.stars))
  const done = progress >= contract.goal
  const next = {
    ...save,
    contract: done ? makeContract({ ...save, coins: save.coins + contract.reward }, cities) : { ...contract, progress },
    coins: save.coins + (done ? contract.reward : 0),
  }
  return { save: next, completed: done, reward: done ? contract.reward : 0, label: contract.label }
}

export function logEvent(save, text) {
  return { ...save, eventLog: [{ text, at: Date.now() }, ...(save.eventLog || [])].slice(0, 6) }
}

export function markDialogue(save, key) {
  if (save.dialogueSeen?.includes(key)) return save
  return { ...save, dialogueSeen: [...(save.dialogueSeen || []), key] }
}

export function buyUpgrade(save, upgradeId, upgradeDef) {
  const level = save.upgrades[upgradeId] || 0
  if (level >= upgradeDef.max) return { save, ok: false, reason: 'maxed' }
  const cost = upgradeCost(upgradeDef, level)
  if (save.coins < cost) return { save, ok: false, reason: 'coins' }
  return {
    ok: true,
    save: {
      ...save,
      coins: save.coins - cost,
      upgrades: { ...save.upgrades, [upgradeId]: level + 1 },
    },
  }
}
