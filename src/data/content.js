export const SAVE_VERSION = 1;

export const RESOURCE_NAMES = {
  fur: 'Fur',
  meat: 'Meat',
  claws: 'Claws',
  coins: 'Coins',
  iron: 'Iron',
  hide: 'Hide',
  weapon_fragments: 'Weapon Fragments',
  arcane_dust: 'Arcane Dust',
  blood_shards: 'Blood Shards',
  ancient_vine: 'Ancient Vine',
  ember_core: 'Ember Core',
  frost_crystal: 'Frost Crystal',
  shadow_silk: 'Shadow Silk'
};

export const RARITY = {
  common: { label: 'Common', color: '#d6d0c2', value: 1 },
  uncommon: { label: 'Uncommon', color: '#75f28f', value: 2 },
  rare: { label: 'Rare', color: '#70e8ff', value: 3 },
  epic: { label: 'Epic', color: '#b68cff', value: 4 },
  legendary: { label: 'Legendary', color: '#ffd166', value: 5 }
};

export const WEAPONS = {
  bloodfang: {
    id: 'bloodfang',
    name: 'Bloodfang',
    rarity: 'uncommon',
    baseDamage: 13,
    bleedPower: 1.35,
    critChance: 0.06,
    critDamage: 1.65,
    lifesteal: 0.018,
    identity: 'High bleed dagger. Heavy finishers add an extra bleed stack.',
    effect: 'bloodfang'
  },
  iron_stiletto: {
    id: 'iron_stiletto',
    name: 'Iron Stiletto',
    rarity: 'common',
    baseDamage: 12,
    bleedPower: 1,
    critChance: 0.08,
    critDamage: 1.55,
    lifesteal: 0.012,
    identity: 'Reliable starter dagger with balanced speed and damage.',
    effect: 'none'
  },
  shadow_edge: {
    id: 'shadow_edge',
    name: 'Shadow Edge',
    rarity: 'rare',
    baseDamage: 12,
    bleedPower: 0.9,
    critChance: 0.2,
    critDamage: 2.1,
    lifesteal: 0.012,
    identity: 'High critical chance. Perfect parries briefly raise crit chance.',
    effect: 'shadow'
  },
  storm_fang: {
    id: 'storm_fang',
    name: 'Storm Fang',
    rarity: 'rare',
    baseDamage: 12,
    bleedPower: 0.95,
    critChance: 0.1,
    critDamage: 1.65,
    lifesteal: 0.012,
    identity: 'Heavy and special attacks can chain lightning to a nearby enemy.',
    effect: 'storm'
  },
  ember_knife: {
    id: 'ember_knife',
    name: 'Ember Knife',
    rarity: 'uncommon',
    baseDamage: 13,
    bleedPower: 0.95,
    critChance: 0.07,
    critDamage: 1.6,
    lifesteal: 0.01,
    identity: 'Adds a small burn on heavy and special attacks.',
    effect: 'ember'
  },
  vampiric_fang: {
    id: 'vampiric_fang',
    name: 'Vampiric Fang',
    rarity: 'epic',
    baseDamage: 11,
    bleedPower: 1.1,
    critChance: 0.08,
    critDamage: 1.65,
    lifesteal: 0.05,
    identity: 'Lower raw damage but noticeably stronger balanced lifesteal.',
    effect: 'vampiric'
  }
};

export const REGION_CATALOG = [
  {
    id: 'forest_frontier',
    type: 'forest',
    name: 'Whispering Forest',
    status: 'playable',
    description: 'A corrupted fantasy forest with ruins, rivers, caves, ambushes, hidden chests, and a mini-boss route.',
    recommendedLevel: 1
  },
  {
    id: 'region_desert_placeholder',
    type: 'desert',
    name: 'Future Region: Cursed Dunes',
    status: 'placeholder',
    description: 'Data-driven placeholder for a future major region.'
  },
  {
    id: 'region_mountain_placeholder',
    type: 'snow',
    name: 'Future Region: Frozen Peaks',
    status: 'placeholder',
    description: 'Data-driven placeholder for a future major region.'
  },
  {
    id: 'region_volcano_placeholder',
    type: 'volcanic',
    name: 'Future Region: Ember Caldera',
    status: 'placeholder',
    description: 'Data-driven placeholder for a future major region.'
  },
  {
    id: 'region_swamp_placeholder',
    type: 'swamp',
    name: 'Future Region: Blackwater Mire',
    status: 'placeholder',
    description: 'Data-driven placeholder for a future major region.'
  },
  {
    id: 'region_kingdom_placeholder',
    type: 'kingdom',
    name: 'Future Region: Fallen Crownlands',
    status: 'placeholder',
    description: 'Data-driven placeholder for a future major region.'
  }
];

export const PLAYER_BASE = {
  maxHp: 118,
  moveSpeed: 176,
  armorReductionPerLevel: 0.025,
  levelHpGain: 9,
  levelDamageGain: 0.055,
  parryWindow: 0.18,
  blockReduction: 0.58,
  dashCooldown: 1.05,
  dashDuration: 0.18,
  dashSpeed: 520,
  specialCooldown: 7.5
};

export const ATTACKS = {
  light1: {
    id: 'light1',
    label: 'Quick Cut',
    duration: 0.34,
    activeStart: 0.07,
    activeEnd: 0.18,
    range: 62,
    arc: 1.48,
    damageMult: 0.82,
    bleed: 1,
    knockback: 34,
    moveLock: 0.58,
    hitstop: 0.018
  },
  light2: {
    id: 'light2',
    label: 'Cross Cut',
    duration: 0.38,
    activeStart: 0.08,
    activeEnd: 0.21,
    range: 65,
    arc: 1.55,
    damageMult: 0.92,
    bleed: 1,
    knockback: 42,
    moveLock: 0.6,
    hitstop: 0.022
  },
  heavy: {
    id: 'heavy',
    label: 'Heavy Slash',
    duration: 0.58,
    activeStart: 0.18,
    activeEnd: 0.33,
    range: 76,
    arc: 1.22,
    damageMult: 1.62,
    bleed: 2,
    knockback: 90,
    moveLock: 0.78,
    hitstop: 0.045
  },
  finisher: {
    id: 'finisher',
    label: 'Rend Finisher',
    duration: 0.64,
    activeStart: 0.17,
    activeEnd: 0.36,
    range: 86,
    arc: 1.65,
    damageMult: 1.92,
    bleed: 3,
    knockback: 130,
    moveLock: 0.82,
    hitstop: 0.06
  },
  special: {
    id: 'special',
    label: 'Crimson Spiral',
    duration: 0.76,
    activeStart: 0.13,
    activeEnd: 0.47,
    range: 104,
    arc: 6.283185307179586,
    damageMult: 2.25,
    bleed: 3,
    knockback: 105,
    moveLock: 0.86,
    hitstop: 0.055
  },
  counter: {
    id: 'counter',
    label: 'Blood Riposte',
    duration: 0.3,
    activeStart: 0,
    activeEnd: 0.16,
    range: 92,
    arc: 1.9,
    damageMult: 2.85,
    bleed: 4,
    knockback: 170,
    moveLock: 0.95,
    hitstop: 0.09
  }
};

export const BASIC_ENEMY_IDS = ['wolf', 'goblin', 'goblin_archer', 'mage', 'brute'];

export const ENEMY_TYPES = {
  wolf: {
    id: 'wolf',
    name: 'Wolf',
    role: 'fast melee attacker',
    radius: 18,
    maxHp: 54,
    speed: 128,
    damageTint: '#ff6f91',
    body: '#5f5665',
    accent: '#e7d1b1',
    xp: 9,
    aggroRange: 440,
    drops: [
      { id: 'fur', min: 1, max: 3, chance: 0.9 },
      { id: 'meat', min: 1, max: 2, chance: 0.72 },
      { id: 'claws', min: 1, max: 1, chance: 0.32 }
    ],
    coinDrop: [1, 5],
    attacks: [
      {
        id: 'lunge',
        label: 'Lunge',
        kind: 'melee',
        range: 58,
        windup: 0.32,
        active: 0.14,
        recovery: 0.68,
        damage: 10,
        arc: 1.0,
        dash: 156,
        knockback: 85,
        indicatorColor: '#ff406a'
      }
    ]
  },
  goblin: {
    id: 'goblin',
    name: 'Goblin',
    role: 'basic melee fighter',
    radius: 19,
    maxHp: 72,
    speed: 83,
    damageTint: '#9aff6b',
    body: '#4fa64f',
    accent: '#ffc857',
    xp: 12,
    aggroRange: 410,
    drops: [
      { id: 'iron', min: 1, max: 2, chance: 0.42 },
      { id: 'weapon_fragments', min: 1, max: 1, chance: 0.16 },
      { id: 'meat', min: 1, max: 1, chance: 0.28 }
    ],
    coinDrop: [4, 10],
    attacks: [
      {
        id: 'stab',
        label: 'Stab',
        kind: 'melee',
        range: 55,
        windup: 0.48,
        active: 0.18,
        recovery: 0.72,
        damage: 13,
        arc: 1.16,
        dash: 54,
        knockback: 70,
        indicatorColor: '#ffbf3f'
      }
    ]
  },
  goblin_archer: {
    id: 'goblin_archer',
    name: 'Goblin Archer',
    role: 'ranged attacker',
    radius: 17,
    maxHp: 58,
    speed: 74,
    damageTint: '#b7fbff',
    body: '#3a8f5b',
    accent: '#f2c15f',
    xp: 14,
    aggroRange: 560,
    preferredRange: 260,
    drops: [
      { id: 'iron', min: 1, max: 2, chance: 0.5 },
      { id: 'weapon_fragments', min: 1, max: 1, chance: 0.22 },
      { id: 'claws', min: 1, max: 1, chance: 0.13 }
    ],
    coinDrop: [5, 12],
    attacks: [
      {
        id: 'arrow',
        label: 'Aimed Shot',
        kind: 'projectile',
        range: 365,
        windup: 0.78,
        active: 0.08,
        recovery: 1.15,
        damage: 12,
        projectileSpeed: 365,
        projectileRadius: 7,
        indicatorColor: '#ffe066'
      }
    ]
  },
  mage: {
    id: 'mage',
    name: 'Forest Mage',
    role: 'ranged magic and area attacks',
    radius: 18,
    maxHp: 70,
    speed: 58,
    damageTint: '#d4a6ff',
    body: '#6842a5',
    accent: '#92f1ff',
    xp: 18,
    aggroRange: 570,
    preferredRange: 285,
    drops: [
      { id: 'arcane_dust', min: 1, max: 2, chance: 0.68 },
      { id: 'blood_shards', min: 1, max: 1, chance: 0.2 },
      { id: 'weapon_fragments', min: 1, max: 1, chance: 0.2 }
    ],
    coinDrop: [8, 16],
    attacks: [
      {
        id: 'rune_burst',
        label: 'Rune Burst',
        kind: 'aoe',
        range: 330,
        windup: 1.0,
        active: 0.12,
        recovery: 1.22,
        damage: 18,
        areaRadius: 60,
        indicatorColor: '#b68cff'
      },
      {
        id: 'bolt',
        label: 'Hex Bolt',
        kind: 'projectile',
        range: 355,
        windup: 0.58,
        active: 0.08,
        recovery: 1.05,
        damage: 11,
        projectileSpeed: 285,
        projectileRadius: 9,
        indicatorColor: '#70e8ff'
      }
    ]
  },
  brute: {
    id: 'brute',
    name: 'Iron Brute',
    role: 'slow but powerful',
    radius: 26,
    maxHp: 158,
    speed: 48,
    damageTint: '#ff9b54',
    body: '#7c624b',
    accent: '#e1c38a',
    xp: 26,
    aggroRange: 430,
    drops: [
      { id: 'iron', min: 2, max: 4, chance: 0.84 },
      { id: 'hide', min: 1, max: 2, chance: 0.66 },
      { id: 'weapon_fragments', min: 1, max: 2, chance: 0.28 }
    ],
    coinDrop: [10, 22],
    attacks: [
      {
        id: 'wide_slam',
        label: 'Wide Slam',
        kind: 'melee',
        range: 82,
        windup: 0.88,
        active: 0.23,
        recovery: 1.12,
        damage: 26,
        arc: 1.95,
        dash: 34,
        knockback: 155,
        indicatorColor: '#ff6b35'
      }
    ]
  }
};

export const MINI_BOSSES = {
  alpha_wolf: {
    id: 'alpha_wolf',
    name: 'Alpha Wolf',
    role: 'mini-boss',
    radius: 36,
    maxHp: 430,
    speed: 112,
    body: '#3f3f59',
    accent: '#ff4d6d',
    xp: 90,
    coinDrop: [45, 78],
    drops: [
      { id: 'fur', min: 6, max: 10, chance: 1 },
      { id: 'claws', min: 3, max: 6, chance: 1 },
      { id: 'blood_shards', min: 2, max: 4, chance: 0.88 },
      { id: 'weapon_fragments', min: 2, max: 5, chance: 0.7 }
    ],
    weaponChance: 0.34,
    attacks: [
      {
        id: 'alpha_pounce',
        label: 'Alpha Pounce',
        kind: 'charge',
        range: 220,
        windup: 0.64,
        active: 0.32,
        recovery: 0.96,
        damage: 24,
        chargeSpeed: 410,
        knockback: 180,
        indicatorColor: '#ff315f'
      },
      {
        id: 'blood_bite',
        label: 'Blood Bite',
        kind: 'melee',
        range: 82,
        windup: 0.42,
        active: 0.2,
        recovery: 0.78,
        damage: 20,
        arc: 1.22,
        dash: 88,
        knockback: 120,
        indicatorColor: '#ff7993'
      },
      {
        id: 'howl',
        label: 'Howl',
        kind: 'summon',
        range: 480,
        windup: 0.95,
        active: 0.16,
        recovery: 1.7,
        damage: 0,
        summon: 'wolf',
        summonCount: 2,
        indicatorColor: '#ffd166'
      }
    ],
    phase2: {
      threshold: 0.5,
      speedMultiplier: 1.14,
      damageMultiplier: 1.18,
      note: 'The Alpha becomes frenzied and attacks faster below half health.'
    }
  },
  goblin_champion: {
    id: 'goblin_champion',
    name: 'Goblin Champion',
    role: 'mini-boss',
    radius: 34,
    maxHp: 465,
    speed: 82,
    body: '#2f8f58',
    accent: '#ffd166',
    xp: 96,
    coinDrop: [55, 92],
    drops: [
      { id: 'iron', min: 5, max: 9, chance: 1 },
      { id: 'weapon_fragments', min: 4, max: 7, chance: 1 },
      { id: 'blood_shards', min: 1, max: 3, chance: 0.72 }
    ],
    weaponChance: 0.38,
    attacks: [
      {
        id: 'champion_combo',
        label: 'Champion Combo',
        kind: 'triple_melee',
        range: 86,
        windup: 0.5,
        active: 0.22,
        recovery: 1.0,
        damage: 16,
        arc: 1.45,
        dash: 72,
        knockback: 112,
        indicatorColor: '#ffbf3f'
      },
      {
        id: 'shield_crash',
        label: 'Shield Crash',
        kind: 'charge',
        range: 235,
        windup: 0.75,
        active: 0.38,
        recovery: 1.18,
        damage: 24,
        chargeSpeed: 355,
        knockback: 190,
        indicatorColor: '#ff6b35'
      }
    ],
    phase2: {
      threshold: 0.45,
      speedMultiplier: 1.08,
      damageMultiplier: 1.2,
      note: 'Below half health the Champion chains slashes more aggressively.'
    }
  },
  corrupted_treant: {
    id: 'corrupted_treant',
    name: 'Corrupted Treant',
    role: 'mini-boss',
    radius: 42,
    maxHp: 540,
    speed: 45,
    body: '#4d3b2e',
    accent: '#9bff70',
    xp: 105,
    coinDrop: [48, 85],
    drops: [
      { id: 'ancient_vine', min: 3, max: 6, chance: 1 },
      { id: 'hide', min: 4, max: 7, chance: 0.86 },
      { id: 'blood_shards', min: 2, max: 4, chance: 0.82 },
      { id: 'arcane_dust', min: 2, max: 5, chance: 0.76 }
    ],
    weaponChance: 0.32,
    attacks: [
      {
        id: 'root_snare',
        label: 'Root Snare',
        kind: 'aoe',
        range: 340,
        windup: 1.05,
        active: 0.18,
        recovery: 1.35,
        damage: 20,
        areaRadius: 74,
        indicatorColor: '#9bff70'
      },
      {
        id: 'branch_sweep',
        label: 'Branch Sweep',
        kind: 'melee',
        range: 112,
        windup: 0.82,
        active: 0.28,
        recovery: 1.15,
        damage: 27,
        arc: 2.25,
        dash: 18,
        knockback: 175,
        indicatorColor: '#ff6b35'
      }
    ],
    phase2: {
      threshold: 0.5,
      speedMultiplier: 1,
      damageMultiplier: 1.15,
      note: 'Corruption blooms under the Treant, increasing area pressure.'
    }
  }
};

export const REGIONAL_BOSS_BLUEPRINTS = {
  forest_guardian: {
    id: 'forest_guardian',
    regionType: 'forest',
    name: 'Elder Thorn Guardian',
    status: 'architecture-only',
    phaseCount: 2,
    rewardTags: ['legendary_dagger', 'region_unlock_material'],
    attacks: ['sweeping_vines', 'thorn_wall', 'corruption_bloom']
  }
};

export const RUN_ABILITIES = [
  {
    id: 'blood_burst',
    name: 'Blood Burst',
    shortName: 'Blood +',
    color: '#e52c59',
    description: 'Bleed damage is increased by 45% this hunt.',
    modifiers: { bleedDamageMult: 0.45 }
  },
  {
    id: 'shadow_dash',
    name: 'Shadow Dash',
    shortName: 'Dash +',
    color: '#70e8ff',
    description: 'Dash cooldown is reduced by 25% and the trail lasts longer.',
    modifiers: { dashCooldownMult: -0.25, dashTrail: 0.4 }
  },
  {
    id: 'crimson_fury',
    name: 'Crimson Fury',
    shortName: 'Fury',
    color: '#ff6b35',
    description: 'Deal 25% more damage while below 40% health.',
    modifiers: { lowHealthDamageMult: 0.25 }
  },
  {
    id: 'leeching_cuts',
    name: 'Leeching Cuts',
    shortName: 'Leech +',
    color: '#ff8fab',
    description: 'Hits against bleeding enemies restore a little more health.',
    modifiers: { bleedLifesteal: 0.035 }
  },
  {
    id: 'iron_veil',
    name: 'Iron Veil',
    shortName: 'Block +',
    color: '#b7fbff',
    description: 'Normal blocks reduce more incoming damage this hunt.',
    modifiers: { blockReduction: 0.18 }
  },
  {
    id: 'hunters_tempo',
    name: "Hunter's Tempo",
    shortName: 'Tempo',
    color: '#ffd166',
    description: 'Perfect parries reduce special cooldown by 2 seconds.',
    modifiers: { parrySpecialRefund: 2 }
  },
  {
    id: 'rending_rhythm',
    name: 'Rending Rhythm',
    shortName: 'Combo +',
    color: '#f7d9ff',
    description: 'Combo finishers deal 18% more damage and add 1 bleed stack.',
    modifiers: { finisherDamageMult: 0.18, finisherBleed: 1 }
  }
];

export const COSMETIC_OPTIONS = {
  hairColor: ['#2b1a18', '#7d2f25', '#f2d092', '#b72f4f', '#78d6ff', '#f7f0ff'],
  outfitColor: ['#552266', '#7e1233', '#294c60', '#315c2b', '#5c3b20', '#221f35'],
  accentColor: ['#e52c59', '#ffd166', '#70e8ff', '#9bff70', '#b68cff']
};

export function xpToNextLevel(level) {
  return Math.floor(55 + level * 42 + Math.pow(level, 1.35) * 11);
}

export function weaponUpgradeCost(level) {
  return {
    coins: 35 + level * 32,
    iron: Math.max(1, Math.floor(level * 1.25)),
    claws: level >= 2 ? Math.floor(level / 2) : 0,
    weapon_fragments: level >= 3 ? level - 2 : 0,
    blood_shards: level >= 5 ? 1 : 0
  };
}

export function armorUpgradeCost(level) {
  return {
    coins: 30 + level * 28,
    hide: Math.max(1, Math.floor(level * 1.2)),
    fur: Math.max(0, level - 1),
    iron: level >= 3 ? Math.floor(level / 2) : 0
  };
}
