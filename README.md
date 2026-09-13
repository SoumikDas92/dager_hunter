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
- PWA manifest and service worker for offline-friendly browser deployment.
- Native Android WebView wrapper source for building a downloadable APK.

## Run locally in a browser

```bash
npm start
```

Then open `http://localhost:5173`.

No build step or online service is required for the browser/PWA version.

## Android APK

The `android/` folder contains a native Android WebView wrapper that bundles the HTML/CSS/JS game inside the APK, so the installed game does **not** need an internet connection.

### Build with GitHub Actions

A workflow is included at `.github/workflows/android-apk.yml`.

1. Push this branch to GitHub.
2. Open the repository's **Actions** tab.
3. Run or open **Build Android APK**.
4. Download the artifact named `DagerHunter-debug-apk`.

The artifact contains:

```text
DagerHunter-debug.apk
```

This is a debug/testing APK suitable for direct install after enabling Android's install-from-unknown-sources option.

### Build locally

Install Android Studio or the Android SDK, Java 17, and Gradle. Then run:

```bash
npm run android:apk
```

The output APK will be created at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

### Release signing note

The included APK workflow builds a debug APK. For Play Store/internal production distribution, add a release signing config and keep the keystore secrets outside the repository.
