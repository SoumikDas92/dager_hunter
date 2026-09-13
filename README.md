# Dager Hunter

Playable MVP/prototype of an Android-friendly offline fantasy hack-and-slash action RPG.

## What is implemented

- One playable **Blood Hunter** hero using dual daggers.
- Responsive mobile controls: virtual left joystick plus Light, Heavy, Special, Block/Parry, Dash, and Interact buttons.
- Desktop fallback: **WASD/Arrow** move, **J** light, **K** heavy, **L** special, **Shift** block/parry, **Space** dash, **E** interact, **Esc/P** pause.
- Skill-based combat foundation:
  - Light → Light → Heavy → Special combo route.
  - Attack input buffering.
  - Quick dash with cooldown and invulnerability window.
  - Hold block for reduced damage.
  - Strict perfect-parry window that staggers enemies and triggers Blood Riposte.
- Stackable enemy bleed meter, bleed damage over time, stylized feedback, and balanced lifesteal.
- Five basic enemy archetypes: wolf, goblin, goblin archer, mage, and brute.
- Random mini-boss selected from Alpha Wolf, Goblin Champion, or Corrupted Treant.
- Procedurally generated fantasy forest hunts with different paths, rooms, encounters, hidden chests, risk chests, shrines, and exit portals.
- A physical explorable base with World Map, Blacksmith, Armorer, Storage, Wardrobe, Skill Master, and Training Yard.
- Loot and risk loop:
  - Run loot is temporary during a hunt.
  - Escaping secures all run loot.
  - Death/abandoning secures only a portion and loses the rest.
- Persistent local offline save: level, XP, coins, resources, equipment, upgrades, cosmetics, and base/story flags.
- Data-driven architecture for adding more regions, monsters, bosses, weapons, abilities, cosmetics, and base buildings later.
- PWA manifest and service worker for offline-friendly deployment.

## Run locally

```bash
npm start
```

Then open `http://localhost:5173`.

No build step or online service is required.

## Android notes

This MVP is a lightweight HTML5 Canvas/PWA implementation designed for Android browsers/WebViews and future native wrapping. It avoids external dependencies and stores progress in `localStorage`, so it remains fully offline after the app shell is cached.

For a future native Android release, this project can be wrapped with Capacitor/Cordova or ported to a native engine while preserving the current data-driven combat/world/save architecture.
