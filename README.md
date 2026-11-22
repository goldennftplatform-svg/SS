# 🟢 SCUPH SAFARI

**[Play or install on your phone](https://goldennftplatform-svg.github.io/SS/).** In iPhone/iPad Safari use Share → Add to Home Screen. In Android Chrome use **Install game** or the browser menu → Install app. After the first online load finishes caching, the installed game can launch offline. Saves stay local to the browser/app.

**New in this build:** a full in-game dialogue cast (intro, dispatch, combo callouts, customer reactions, branch/level celebrations), a procedural **instrumental 8-bit soundtrack** — main map theme plus `route`, `yard` and `urgent` loops, with extra layers unlocking at levels 3 and 5 — generated at the reference track's ~112 BPM in E♭ minor. No vocals, no samples, no downloads. Tap-to-advance dialogue blips, scoop/coin/fanfare SFX, and a mute button are included. The map now has a campaign tracker, daily contract, next-unlock meter, activity log, animated flags/paws/sparkles and per-town customer progress rings. Streaks of 3+ clean jobs pay a bonus. Yard Jobs are now real action sprints: the knight moves and collects on contact while a departure clock threatens your pay, reputation and regulars.

**Current campaign: South Sound takeover.** Start on the interactive 20-city atlas. Dispatch a job in Maple Valley, win regular customers and establish your first branch. Each flag opens neighboring markets and pays six coins on future jobs. Choose your road to Olympia, reinvest spare coins in local flyers, or build out every district. The atlas is a schematic inspired by western Washington, not a navigation map. Open `release/SCUPH-SAFARI.html` for the standalone build.

> **Making the world cleaner, one scoop at a time.**

A free-to-play web game: **Paperboy meets dog-poop pickup meets a Clash-style service empire builder.** Built on the real [SCUPH.COM](https://scuph.com) brand and services. Designed to show kids (and grown-ups) how a business grows from one small job done well into a real franchise — while having a blast.

**Repo name:** `SCUPH SAFARI`
**Art direction:** "DuckTales meets Looney Tunes" — vintage cartoon frogs/knights/safari crew at heraldic sunset. The provided reference images are the canonical art source; this prototype uses emoji placeholders until real art is wired into `public/assets/`.

---

## Run it

```bash
cd SCUPH-SAFARI
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5174`).

- `npm run build` → production build in `dist/`
- `npm run preview` → preview the production build

No backend, no accounts, no wallet needed to play. Progress saves in `localStorage`.

---

## What's in the prototype (v1)

- **Title → HQ hub → Route → Results → Upgrade** full loop
- **🚲 Bike Route — Street Ride:** a rolling-horizon, paperboy-style run down a curbside street. Watch the **house mini-map** up top, scoop the glowing houses on either side before you pass them, wave at good dogs and dodge sprinklers, cones and grumpy dogs. Reach the end before departure.
- **🚨 Rush Cleanup:** the same street ride at night — 2× rewards, faster bike, tighter clock.
- **🏡 Yard Job — Action Sprint:** your knight rides the lawn (WASD/arrows or the touch pad) and **collects on contact** across four phases — **Find** hidden piles → **Scoop** them → **Mow** the grass → **Rake** the leaves. Bags hold only 3 items: ride back to the 🛻 to dump before you can keep working. The **chain** dies if you idle, miss, or get hit, so route smart and keep moving through sprinklers, loose dogs and leaf gusts. Tight tiers (`HOT STREAK` → `SCUPH STORM` → `LEGENDARY SCŪPHR`) need real skill. Miss the departure clock and you are **late**: half pay, lost reputation and a lost regular.
- **Roguelite perk cards:** every level-up offers 3 of 8 perks (Bigger Haul, Turbo Mower, Leaf Blower 3000, Golden Scoop, Super Sniffer, Hearth Shield, Rally Timer, Combo Keeper). **Earned, never bought.**
- **6 characters** with unique perks and unlock levels (Sir Scoops-a-Lot, Hopscotch Hound, Duchess Litterly, Sir Wags-a-Lot, Sir Hearthguard, Captain Sunbeam)
- **The Upsell Tree:** all 6 real SCUPH services with real prices, unlocked as your reputation grows
- **Economy:** coins, bones, XP, reputation stars, day streak, franchise revenue, Clash-style HQ upgrades
- **Story + Business Lessons:** "Your First Route" → "Scūph Franchise"
- **Responsive:** on-screen scoop/steer/wave buttons for mobile

See [`docs/GDD.md`](docs/GDD.md) for the full design.

---

## How to play (controls)

| Action | Keyboard | Mobile |
|---|---|---|
| Steer the bike | ← → / A D | ◀ ▶ buttons |
| Scoop left / right | Q / E (SPACE = auto side) | 🧹 LEFT / RIGHT 🧹 buttons |
| Wave at dog | W / ↑ | WAVE 🐕 button |
| Pause / quit | HQ button | HQ button |

**Yard Job:** move with **WASD / arrows** (or the on-screen D-pad). Work the four stations on contact, then ride back to the **🛻 DUMP** when the bag meter fills. The **🔥 chain** window is short — every hit, splash or pause breaks it. Tap a loose dog before it bites for bonus points. Watch the departure bar — finish the whole visit before it empties or the client cancels.

**Bike Route:** the mini-map shows every house on the street. Its pile glows while you are in range — hit **Q** for a left-side house or **E** for a right-side one. A wild swing breaks the chain; hazards cost a second. Steering is for dodging, not scooping. Route score rewards cleanliness, combo, dog waves and speed. Yard score rewards completion, chain and time. 3 stars = best rewards + bone(s). A missed departure halves pay, costs reputation and removes a regular.

---

## Project structure

```
SCUPH-SAFARI/
├── docs/GDD.md              # full game design document
├── public/assets/
│   ├── characters/          # drop character art here (placeholder now)
│   └── brand/               # logo, frog-knight art, etc.
├── src/
│   ├── data/gameData.js     # characters, services, upgrades, story (single source of truth)
│   ├── game/engine.js       # pure logic: scoring, rewards, save, upgrades
│   ├── components/
│   │   ├── TitleScreen.jsx
│   │   ├── Hub.jsx           # HQ: routes, crew, services, upgrades, story
│   │   ├── RouteGame.jsx     # the playable Paperboy-style route
│   │   ├── YardJob.jsx       # 4-phase full-visit yard job + chaos + combos
│   │   ├── Results.jsx
│   │   └── PerkScreen.jsx    # roguelite level-up card selection
│   ├── App.jsx              # screen router
│   └── styles.css
├── index.html
├── vite.config.js
└── package.json
```

---

## Wiring in your existing platform tech

The architecture keeps game logic pure (`src/game/engine.js`) so your other projects plug in as adapters:

| Your tech | Where it plugs in |
|---|---|
| **Hopcity multiplayer rails** | Co-op routes, neighborhood leaderboards, crew clubs. Reuse room/matchmaking/state-sync behind a `IMultiplayerProvider`. |
| **29 Cribbage** | "Cribbage Corner" at HQ — cross-promote, win coins/bones. Wrap as a mini-game component. |
| **Desktop Folder / ltcVM wallet** | Optional `IWalletProvider` for tokenized outfits/upgrades. Free players never need it. |
| **Skullbond FPS server mechanics** | Authoritative netcode + anti-cheat for route leaderboards and urgent-route races. |

**Token guiding principles (future):** earn-first, cosmetic-first, no pay-to-win, no real-money gambling, kids-first compliance review before any launch. The prototype has zero token/wallet code — that's intentional.

---

## Swapping in the real art

1. Put your SCUPH logo and vintage frog-knight images into `public/assets/brand/` and `public/assets/characters/`.
2. In `src/data/gameData.js`, add an `image` field to each character (e.g. `image: '/assets/characters/sir-scoops.png'`).
3. In `Hub.jsx` / `RouteGame.jsx`, replace the emoji sprite with `<img src={char.image} />`.
4. Keep the `color`/`accent` values for card trim — they're tuned to the sunset palette.

---

## Brand truth used in-game

- Company: **Scūph** (Maple Valley, WA) — dog waste removal & pet care
- Certified crew member = **Scūphr**
- Real services & prices: Waste Removal $40, Waste Care/Litter $25, Pet Walking $25, Boarding/Daycare $35, House Sitting $80/night, Complete Care Bundle $149/week
- Urgent service: "Emergency Poop Cleanup" — 2× base + $10, 2-hour contact guarantee
- Promise: *"Making the world cleaner, one scoop at a time."*
