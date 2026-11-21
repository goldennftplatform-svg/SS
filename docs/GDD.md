# SCUPH SAFARI — Game Design Document

> **Tagline:** Making the world cleaner, one scoop at a time.
> **Genre:** Paperboy-route action × cozy service empire builder × Clash-style base/crew upgrading
> **Audience:** Kids + families (E/E10+), adult nostalgia gamers, SCUPH.COM customers
> **Platform:** Web-first (mobile + desktop), free-to-play, progression-first
> **Repo:** `SCUPH SAFARI`

---

## 1. The High Concept

You are a new **Scūphr** (certified Scūph crew member) in **Maple Valley**. Each level is a suburban route: ride your bike, dodge sprinklers and grumpy dogs, **scoop the poop**, and deliver happy customers. Clean yards → tips → reputation → unlock more services (pet walking, litter care, boarding, house sitting) → grow your own Scūph franchise.

It's **Paperboy** (route flow, obstacles, timing) meets **Animal Crossing** (cozy customers) meets **Clash of Clans** (base/crew upgrading, hero roster, raids) — but the "combat" is customer care, and the "loot" is a clean yard and a five-star review.

**The lesson for kids:** begin with one small job done well → earn trust → reinvest → upsell with care → build a real business and *make it to the finish line*. Every mechanic maps to a real SCUPH.COM service and a real business habit.

**Art direction:** "DuckTales meets Looney Tunes" — vintage cartoon, squash-and-stretch, warm heraldic sunset palette, expressive frogs/knights/animals from the provided reference art. The references are the canonical art source; the prototype uses styled placeholders until they're wired in.

---

## 2. Core Loop (30–90 second runs)

```
Accept route (customer requests)
   ↓
Ride the route (Paperboy-style movement + hazards)
   ↓
Scoop poop + avoid hazards + wave to dogs
   ↓
Deliver / complete within timer → stars (1–3)
   ↓
Earn Coins + Rep + sometimes Bones (premium-lite currency)
   ↓
Spend at HQ: upgrade crew, gear, bike, services
   ↓
New customers unlock → harder routes → bigger story
```

### The Two-Beat Loop
The route gets you there; the yard is the payoff. This mirrors SCUPH.COM's real three-step flow: *Request a Scoop → We Get to Work → Relax & Enjoy.*

```
ROUTE (paperboy travel)  →  YARD JOB (the full visit)  →  REWARDS  →  PERK CARD  →  HQ
```

### Route Run Details
- **Movement:** left/right + brake on a lane-based street (simple for kids, skill ceiling via speed control).
- **Scoop action:** press scoop near a poop pile; satisfying pop + bag + combo multiplier.
- **Dodge:** sprinklers (slow you), loose dogs (combo break), mailboxes/puddles (bump).
- **Wave:** friendly dogs give bonus tips — reinforces "care," not just cleaning.
- **Urgent routes:** "Emergency Poop Cleanup" — 2-hour contact guarantee flavor, 2× base + $10 bonus, timed challenge.
- **Finish line:** reach the end of the route before the timer → stars based on cleanliness, tips, time.

---

## 2b. Yard Job — The Full Visit (implemented)

A second game mode where you show up at the customer's house and do the whole job. Every phase is under ~15 seconds — heavy juice, no punishing fail states.

| Phase | Player action | Character who shines |
|---|---|---|
| **🔍 FIND** | Tap bushes to uncover hidden piles | Hopscotch Hound (Super Sniffer perk) |
| **🧹 SCOOP** | Tap piles, chain combos | Sir Scoops-a-Lot (Golden Scoop perk) |
| **🚜 MOW** | Tap grass strips for a clean cut | Captain Sunbeam (Turbo Mower perk) |
| **🍂 RAKE** | Rake leaves into tidy piles | Sir Wags-a-Lot (Leaf Blower perk) |

**Combo escalations:** x5 `HOT STREAK` → x10 `SCUPH STORM` → x20 `LEGENDARY SCŪPHR`. Higher combos multiply all points and light up the yard.

**Chaos events** (random after phase 1): 💦 sprinkler (combo penalty, or bonus with Hearth Shield), 🐕 loose dog (tap for +30), 🍃 leaf gust (shuffles leaves).

**Roguelite perk cards:** every level-up offers a choice of 3 perks from a pool of 8 (Magnet Bag, Turbo Mower, Leaf Blower 3000, Golden Scoop, Super Sniffer, Hearth Shield, Rally Timer, Combo Keeper). Perks are **earned, never bought** — no pay-to-win.

**Brand guardrail:** mowing/leaves are framed as a **"Yard Refresh" bonus job** inside Waste Removal. Poop stays the star: always phase one, always the first service in the upsell tree. This prevents brand dilution while adding variety.

---

## 3. The 6 Characters (Scūphr Crew)

Each has a cartoon silhouette, a job specialty, and a growth arc. Names/roles designed to map onto your frog-knight/safari art.

| # | Name | Role | Gameplay Perk | Real-world SCUPH service |
|---|------|------|---------------|--------------------------|
| 1 | **Sir Scoops-a-Lot** | The Knight Scūphr | Wide scoop radius, slow but thorough | Waste Removal (flagship) |
| 2 | **Hopscotch Hound** | The Pointer | Sniffs out hidden poop + hazards early | Waste Removal / accuracy |
| 3 | **Duchess Litterly** | The Cat Whisperer | Litter-box combo bonus, calms cats | Waste Care / Litter Box |
| 4 | **Sir Wags-a-Lot** | The Walker | Dogs wave back → double walking tips | Pet Walking (GPS-tracked) |
| 5 | **Sir Hearthguard** | The House Knight | House-sitting streak shield (protects combo overnight) | House Sitting / Boarding |
| 6 | **Captain Sunbeam** | The Rally Leader | Speed boost on final stretch; leads group routes | Complete Care Bundle / Urgent |

**Roster rules:** start with Sir Scoops-a-Lot; unlock others by Rep levels and story beats. Each has 3 outfit tiers (classic → safari → royal) — cosmetic + small perk, a natural home for earned tokens.

---

## 4. Services = The Upsell Tree (the business lesson)

The poop is the **foot in the door**. Each clean yard raises a customer's Trust meter. At high trust, they unlock an add-on — exactly how SCUPH.COM grows:

```
Waste Removal (core)
   └─ Waste Care / Litter Box ($25)
        └─ Pet Walking ($25)
             └─ Boarding / Daycare ($35)
                  └─ House Sitting ($80/night)
                       └─ Complete Care Bundle ($149/week) ← "Best Value"
```

In-game, each service:
- adds a new **route type** with its own mini-mechanic (litter = rhythm taps, walking = timing waves, boarding = care streaks, sitting = light-switch/checklist round),
- increases **Recurring Revenue** shown on your HQ dashboard (kids see money grow),
- raises story stakes: "the finish line" = your franchise hitting a weekly recurring revenue goal and a 5-star reputation.

---

## 5. Progression & Economy

- **XP / Level:** route completion → XP → level ups unlock characters, outfits, routes.
- **Coins (soft currency):** from tips; spend on gear, upgrades, service unlocks.
- **Bones (premium-lite):** rare drop from 3-star routes + daily streaks; cosmetic outfits + boosters. Earnable free, never pay-to-win.
- **Reputation (stars):** per-customer 1–5 stars; determines customer retention and unlocks.
- **HQ upgrades:** Bike speed, Scoop radius, Bag capacity, Crew slots, Service level — Clash-style upgrade timers (short, kid-friendly: seconds→minutes).
- **Finish Line:** "Franchise Milestone" seasons — e.g. reach $X weekly recurring revenue + 4.8★ average. On completion, a parade/celebration and a new region of Maple Valley opens.

### Token note (future, not in this prototype)
A `$SCUPH` style token could power outfits/upgrades, but: **earn-first, cosmetic-first, no pay-to-win, no real-money gambling, kids-first compliance review required.** The prototype uses local save data only; any token/wallet integration is a later adapter behind an interface (see §7).

---

## 6. Level / World Structure

- **Hub:** your HQ / clubhouse (upgrade station, crew roster, customer board, service tree, map).
- **Map:** Maple Valley neighborhoods, unlocked by franchise milestone (Oak Lane → Birch Bend → Fox Hollow → Sunset Estates → Emergency Zone).
- **Routes:** short, replayable, 3-star scored. Daily routes rotate; urgent routes appear as limited-time challenges.
- **Story beats:** short comic panels with a "business lesson of the day" (e.g. "A happy customer tells a friend — that's how a route becomes a business.").

---

## 7. Leveraging the Existing Gaming Platform

The user's other projects plug in as adapters, not rewrites:

| Existing tech | SCUPH SAFARI integration |
|---|---|
| **Hopcity** multiplayer rails | Co-op routes, neighborhood leaderboards, "crew raids" on a blocked storm-drain, guild-style Scūph clubs. Reuse matchmaking/rooms/state sync. |
| **29 Cribbage** | "Cribbage Corner" mini-game at HQ; win coins/bones. Cross-promotes both games. |
| **Desktop Folder / ltcVM wallet** | Optional wallet adapter for tokenized outfits/upgrades. Abstract behind `IWalletProvider` so free players are unaffected. |
| **Skullbond FPS server mechanics** | Netcode/authoritative server patterns for co-op route sync, anti-cheat on leaderboards, and the urgent-route race mode. |
| **Bot/SEO automation repo** | Marketing site, content, and community posts drive players to the free web game. |

Architecture rule: **game logic stays pure and offline-testable; platform adapters are optional implementations of small interfaces.**

---

## 8. Prototype Scope (this build)

The runnable prototype in `/src` implements:
- Title → HQ hub → job selection → playable route **or** 4-phase Yard Job → results → perk card → upgrade loop
- 6 characters with perks and unlock levels
- Service upsell tree with real SCUPH service names/prices
- Coins, XP, Reputation, stars, daily streak, local save (localStorage)
- Urgent route variant
- 4-phase Yard Job with chaos events, combo escalations, and 8-perk level-up card system
- Placeholder art slots (`/public/assets/...`) ready for the provided images
- Clean component/game split so Hopcity/netcode/wallet adapters can be added later

Out of scope for v1: real multiplayer, real token/wallet, audio, backend, finished art.

---

## 9. Brand Voice

- Playful, encouraging, family-safe. "Certified Scūphr." "Poop be gone!" "Because they're worth it."
- Never gross-out for shock; the humor is cartoon-silly, not graphic.
- Every success celebrates **care + reliability + finishing the job**.

---

## 10. Definition of Done for v1

- [ ] A kid can play a route start-to-finish and understand "clean yards → happy customers → grow business."
- [ ] All 6 crew and all 5 services are visible with real SCUPH names.
- [ ] Progress saves locally across refresh.
- [ ] Placeholder assets are clearly swappable with the provided art.
- [ ] README explains how to run and how to plug in Hopcity/wallet later.
