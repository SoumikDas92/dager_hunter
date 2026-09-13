import { COSMETIC_OPTIONS, SAVE_VERSION } from '../data/content.js';

const STORAGE_KEY = 'dager-hunter-save-v1';

export function createDefaultSave() {
  return {
    version: SAVE_VERSION,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    player: {
      level: 1,
      xp: 0,
      unlockedRegions: ['forest_frontier'],
      stats: {
        huntsStarted: 0,
        huntsEscaped: 0,
        deaths: 0,
        enemiesDefeated: 0,
        miniBossesDefeated: 0,
        perfectParries: 0,
        chestsOpened: 0,
        secretsFound: 0
      }
    },
    wallet: {
      coins: 0,
      resources: {
        fur: 0,
        meat: 0,
        claws: 0,
        iron: 0,
        hide: 0,
        weapon_fragments: 0,
        arcane_dust: 0,
        blood_shards: 0,
        ancient_vine: 0,
        ember_core: 0,
        frost_crystal: 0,
        shadow_silk: 0
      }
    },
    equipment: {
      equippedWeapon: 'bloodfang',
      weapons: {
        bloodfang: { owned: true, level: 1, foundAt: Date.now() },
        iron_stiletto: { owned: true, level: 1, foundAt: Date.now() }
      },
      armor: {
        id: 'hunter_garb',
        name: 'Hunter Garb',
        level: 1
      }
    },
    cosmetics: {
      hair: 'windswept',
      face: 'scarred',
      hairColor: COSMETIC_OPTIONS.hairColor[3],
      outfitColor: COSMETIC_OPTIONS.outfitColor[0],
      accentColor: COSMETIC_OPTIONS.accentColor[0]
    },
    base: {
      blacksmithLevel: 1,
      armorerLevel: 1,
      storageLevel: 1,
      storyFlags: {
        introSeen: false
      }
    }
  };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeDefaults(defaultValue, savedValue) {
  if (Array.isArray(defaultValue)) {
    return Array.isArray(savedValue) ? savedValue : [...defaultValue];
  }
  if (isPlainObject(defaultValue)) {
    const out = { ...defaultValue };
    if (isPlainObject(savedValue)) {
      for (const [key, value] of Object.entries(savedValue)) {
        out[key] = key in defaultValue ? mergeDefaults(defaultValue[key], value) : value;
      }
    }
    return out;
  }
  return savedValue === undefined ? defaultValue : savedValue;
}

export class SaveSystem {
  constructor() {
    this.storageKey = STORAGE_KEY;
    this.data = this.load();
  }

  load() {
    const fallback = createDefaultSave();
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return mergeDefaults(fallback, parsed);
    } catch (error) {
      console.warn('Could not load save; using defaults.', error);
      return fallback;
    }
  }

  save() {
    this.data.updatedAt = Date.now();
    window.localStorage.setItem(this.storageKey, JSON.stringify(this.data));
  }

  reset() {
    this.data = createDefaultSave();
    this.save();
  }

  export() {
    return JSON.stringify(this.data, null, 2);
  }

  import(json) {
    const parsed = JSON.parse(json);
    this.data = mergeDefaults(createDefaultSave(), parsed);
    this.save();
  }
}
