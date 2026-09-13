import { AudioManager } from './core/audio.js';
import { InputManager } from './core/input.js';
import { SaveSystem } from './core/save-system.js';
import {
  armorUpgradeCost,
  COSMETIC_OPTIONS,
  ENEMY_TYPES,
  MINI_BOSSES,
  REGION_CATALOG,
  RESOURCE_NAMES,
  RARITY,
  RUN_ABILITIES,
  WEAPONS,
  weaponUpgradeCost,
  xpToNextLevel
} from './data/content.js';
import { Enemy, FloatingText, Particle, Pickup } from './entities/entities.js';
import { BaseWorld, ProceduralForest } from './systems/procedural-forest.js';
import { UIManager } from './ui/ui.js';
import { angleTo, clamp, drawOutlinedText, formatResources, RNG, TAU } from './core/utils.js';
import { Player } from './entities/entities.js';

const RESOURCE_COLORS = {
  fur: '#caa77a',
  meat: '#ff8fab',
  claws: '#f7f0ff',
  iron: '#9ba3b2',
  hide: '#a87948',
  weapon_fragments: '#70e8ff',
  arcane_dust: '#b68cff',
  blood_shards: '#e52c59',
  ancient_vine: '#9bff70',
  ember_core: '#ff8f3f',
  frost_crystal: '#b7fbff',
  shadow_silk: '#8d7dff'
};

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.save = new SaveSystem();
    this.audio = new AudioManager();
    this.input = new InputManager({ onFirstInput: () => this.audio.unlock() });
    this.player = new Player(this.save.data);
    this.ui = new UIManager(this);

    this.mode = 'boot';
    this.world = null;
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.particles = [];
    this.floaters = [];
    this.effects = [];
    this.run = null;
    this.rng = new RNG(Date.now());
    this.camera = { x: 0, y: 0 };
    this.viewport = { w: 1, h: 1, dpr: 1 };
    this.time = 0;
    this.lastFrame = performance.now();
    this.hitStop = 0;
    this.timeSlow = 0;
    this.screenShake = 0;
    this.flashOverlay = { color: '#ffffff', alpha: 0, life: 0, maxLife: 0 };
    this.pausedForUi = false;
    this.contextAction = null;
    this.lastTarget = null;
    this.lastTargetTime = -99;
    this.playerDying = false;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => window.setTimeout(() => this.resize(), 150));

    this.enterBase({ first: true });
    requestAnimationFrame((now) => this.loop(now));

    if (!this.save.data.base.storyFlags.introSeen) {
      window.setTimeout(() => this.showIntro(), 500);
    } else {
      this.notify('Welcome back, Blood Hunter.', 'good');
    }
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = this.canvas.getBoundingClientRect();
    this.viewport.w = Math.max(320, rect.width || window.innerWidth);
    this.viewport.h = Math.max(240, rect.height || window.innerHeight);
    this.viewport.dpr = dpr;
    this.canvas.width = Math.floor(this.viewport.w * dpr);
    this.canvas.height = Math.floor(this.viewport.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  loop(now) {
    let rawDt = Math.min(0.04, (now - this.lastFrame) / 1000 || 0.016);
    this.lastFrame = now;
    this.ctx.setTransform(this.viewport.dpr, 0, 0, this.viewport.dpr, 0, 0);

    if (this.pausedForUi) {
      this.render(rawDt);
      this.ui.update();
      this.input.endFrame();
      requestAnimationFrame((next) => this.loop(next));
      return;
    }

    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - rawDt);
      rawDt = 0;
    }
    const dt = rawDt * (this.timeSlow > 0 ? 0.42 : 1);
    this.time += dt;
    this.timeSlow = Math.max(0, this.timeSlow - rawDt);
    this.update(dt);
    this.render(rawDt);
    this.ui.update();
    this.input.endFrame();
    requestAnimationFrame((next) => this.loop(next));
  }

  update(dt) {
    if (this.input.consume('pause')) this.openPauseMenu();

    this.contextAction = this.computeContextAction();
    if (this.input.consume('interact')) this.performContextAction();

    if (this.world?.kind === 'hunt') this.world.markDiscovered(this.player, this);

    this.player.update(dt, this);

    if (this.mode === 'base') this.ensureTrainingShade();

    for (const enemy of this.enemies) enemy.update(dt, this);
    this.enemies = this.enemies.filter((enemy) => !enemy.dead || enemy.trainingRespawnTimer !== undefined);

    this.projectiles = this.projectiles.filter((projectile) => projectile.update(dt, this));
    this.pickups = this.pickups.filter((pickup) => pickup.update(dt, this));
    this.particles = this.particles.filter((particle) => particle.update(dt));
    this.floaters = this.floaters.filter((floater) => floater.update(dt));
    this.effects = this.effects.filter((effect) => {
      effect.life -= dt;
      return effect.life > 0;
    });

    if (this.flashOverlay.life > 0) {
      this.flashOverlay.life -= dt;
      this.flashOverlay.alpha = clamp(this.flashOverlay.life / this.flashOverlay.maxLife, 0, 1);
    } else {
      this.flashOverlay.alpha = 0;
    }
    this.screenShake = Math.max(0, this.screenShake - dt * 38);
    this.contextAction = this.computeContextAction();
  }

  enterBase({ first = false, nearPortal = false } = {}) {
    this.mode = 'base';
    this.world = new BaseWorld();
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.effects = [];
    this.run = null;
    this.rng = new RNG(Date.now());
    this.player.syncFromSave(this.save.data, false);
    this.player.resetForBase();
    const start = this.world.getStartPosition();
    this.player.x = nearPortal ? 1210 : start.x;
    this.player.y = nearPortal ? 640 : start.y;
    this.ensureTrainingShade();
    this.contextAction = null;
    if (!first) this.save.save();
  }

  ensureTrainingShade() {
    const active = this.enemies.some((enemy) => enemy.training && !enemy.dead);
    if (active) return;
    const shade = this.spawnEnemy('goblin', 830, 970, { training: true, aggro: false });
    shade.name = 'Training Shade';
    shade.maxHp = 260;
    shade.hp = shade.maxHp;
    shade.radius = 22;
    shade.speed = 46;
    shade.data = {
      ...ENEMY_TYPES.goblin,
      name: 'Training Shade',
      maxHp: 260,
      speed: 46,
      xp: 0,
      coinDrop: [0, 0],
      drops: [],
      aggroRange: 230,
      attacks: [
        {
          id: 'practice_swing',
          label: 'Practice Swing',
          kind: 'melee',
          range: 65,
          windup: 0.95,
          active: 0.2,
          recovery: 1.25,
          damage: 1,
          arc: 1.4,
          dash: 18,
          knockback: 25,
          indicatorColor: '#70e8ff'
        }
      ]
    };
  }

  startHunt(regionId = 'forest_frontier') {
    const region = REGION_CATALOG.find((r) => r.id === regionId);
    if (!region || region.status !== 'playable') {
      this.notify('That region is not ready in this MVP yet.', 'danger');
      return;
    }
    const seed = Date.now() ^ Math.floor(Math.random() * 999999);
    this.rng = new RNG(seed);
    this.mode = 'hunt';
    this.world = new ProceduralForest(seed);
    const start = this.world.getStartPosition();
    this.player.syncFromSave(this.save.data, false);
    this.player.resetForHunt();
    this.player.x = start.x;
    this.player.y = start.y;
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.particles = [];
    this.floaters = [];
    this.effects = [];
    this.lastTarget = null;
    this.playerDying = false;

    for (const spawn of this.world.enemySpawns) this.spawnEnemy(spawn.type, spawn.x, spawn.y, spawn);

    this.run = {
      regionId,
      seed,
      seedLabel: `#${String(seed >>> 0).slice(-5)}`,
      tempCoins: 0,
      tempResources: {},
      tempXp: 0,
      tempWeapons: [],
      abilities: [],
      bossDefeated: false,
      startTime: this.time
    };
    this.save.data.player.stats.huntsStarted += 1;
    this.save.save();
    this.ui.closeModal();
    this.notify('Forest hunt started. Explore, fight, loot, then escape.', 'good');
  }

  spawnEnemy(type, x, y, options = {}) {
    const enemy = new Enemy({ type, x, y, ...options }, this);
    if (options.aggro !== undefined) enemy.aggro = options.aggro;
    if (options.training) enemy.training = true;
    this.enemies.push(enemy);
    return enemy;
  }

  computeContextAction() {
    if (!this.world) return null;
    if (this.mode === 'base') {
      const building = this.world.nearestBuilding(this.player);
      return building ? { type: 'building', label: building.label, target: building } : null;
    }
    return this.world.nearestInteractive(this.player);
  }

  performContextAction() {
    const action = this.contextAction;
    if (!action) {
      this.notify(this.mode === 'base' ? 'Move near a building to interact.' : 'No nearby object to interact with.', '');
      return;
    }
    if (action.type === 'building') this.openBaseBuilding(action.target);
    else if (action.type === 'chest') this.openChest(action.target);
    else if (action.type === 'shrine') this.offerRunAbilities(action.target);
    else if (action.type === 'exit') this.endHunt(true);
  }

  openBaseBuilding(building) {
    switch (building.id) {
      case 'world_map':
        this.openWorldMap();
        break;
      case 'blacksmith':
        this.openBlacksmith();
        break;
      case 'armorer':
        this.openArmorer();
        break;
      case 'storage':
        this.openStorage();
        break;
      case 'customization':
        this.openCustomization();
        break;
      case 'skill_master':
        this.openSkillMaster();
        break;
      case 'training':
        this.openTraining();
        break;
      default:
        this.notify('This base system is a placeholder for later expansion.', '');
    }
  }

  showIntro() {
    this.save.data.base.storyFlags.introSeen = true;
    this.save.save();
    this.ui.showModal(
      'Blood Hunter Base',
      `<p><strong>Something is corrupting the world.</strong> You are a dagger-wielding Blood Hunter: fast, aggressive, and vulnerable when you mistime blocks or dashes.</p>
       <div class="info-card">
         <strong>Core loop:</strong> explore the forest, fight monsters, gather temporary loot, discover secrets, defeat the mini-boss, then escape through a portal to secure rewards.
       </div>
       <p>Touch controls are on-screen. Desktop fallback: WASD move, J light, K heavy, L special, Shift block/parry, Space dash, E interact.</p>`,
      [
        { label: 'Start Forest Hunt', className: 'primary', onClick: () => this.startHunt('forest_frontier') },
        { label: 'Explore Base First', onClick: () => this.ui.closeModal() }
      ]
    );
  }

  openWorldMap() {
    const body = `<p>Select a region. Only the first fantasy forest region is fully playable in this MVP; the remaining entries are data-driven placeholders so future regions can be added cleanly.</p>
      <div class="card-list">
        ${REGION_CATALOG.map(
          (region) => `<div class="info-card"><strong>${region.name}</strong> <span class="pill">${region.status}</span><br/><small>${region.description}</small></div>`
        ).join('')}
      </div>`;
    const actions = REGION_CATALOG.map((region) => ({
      label: region.status === 'playable' ? `Enter ${region.name}` : `${region.name} (Future)`,
      className: region.status === 'playable' ? 'primary' : '',
      disabled: region.status !== 'playable',
      onClick: () => this.startHunt(region.id)
    }));
    actions.push({ label: 'Close', onClick: () => this.ui.closeModal() });
    this.ui.showModal('World Map', body, actions);
  }

  openBlacksmith() {
    const save = this.save.data;
    const equipped = save.equipment.equippedWeapon;
    const record = save.equipment.weapons[equipped] ?? { level: 1 };
    const cost = weaponUpgradeCost(record.level);
    const can = this.canPay(cost);
    const weaponCards = Object.entries(save.equipment.weapons)
      .filter(([, r]) => r.owned)
      .map(([id, rec]) => this.ui.weaponCard(id, rec, id === equipped))
      .join('');
    const body = `<p>The blacksmith upgrades dagger power while preserving each weapon's identity.</p>
      <div class="info-card"><strong>Upgrade ${WEAPONS[equipped].name} +${record.level}</strong><br/>Cost: ${this.costHtml(cost)}</div>
      <h3>Owned Daggers</h3><div class="card-list">${weaponCards}</div>`;
    const actions = [
      {
        label: can ? 'Upgrade Equipped Dagger' : 'Missing Materials',
        className: can ? 'primary' : '',
        disabled: !can,
        onClick: () => {
          this.upgradeWeapon(equipped);
          this.openBlacksmith();
        }
      },
      ...Object.entries(save.equipment.weapons)
        .filter(([id, r]) => r.owned && id !== equipped)
        .map(([id]) => ({ label: `Equip ${WEAPONS[id].name}`, onClick: () => { this.equipWeapon(id); this.openBlacksmith(); } })),
      { label: 'Close', onClick: () => this.ui.closeModal() }
    ];
    this.ui.showModal('Blacksmith', body, actions);
  }

  openArmorer() {
    const armor = this.save.data.equipment.armor;
    const cost = armorUpgradeCost(armor.level);
    const can = this.canPay(cost);
    const projectedHp = this.player.getMaxHealth() + 14;
    const body = `<p>Armor is intentionally simple in the MVP: it provides defense and health only, without changing cosmetics.</p>
      <div class="info-card"><strong>${armor.name} +${armor.level}</strong><br/>
      Current max health: ${this.player.maxHealth}<br/>Next max health: ${projectedHp}<br/>
      Block/dodge/parry timing still matters even with upgraded armor.</div>
      <div class="info-card"><strong>Upgrade cost:</strong> ${this.costHtml(cost)}</div>`;
    this.ui.showModal('Armorer', body, [
      {
        label: can ? 'Upgrade Armor' : 'Missing Materials',
        className: can ? 'primary' : '',
        disabled: !can,
        onClick: () => {
          this.upgradeArmor();
          this.openArmorer();
        }
      },
      { label: 'Close', onClick: () => this.ui.closeModal() }
    ]);
  }

  openStorage() {
    const save = this.save.data;
    const resources = Object.entries(save.wallet.resources)
      .filter(([, amount]) => amount > 0)
      .map(([id, amount]) => `<span class="pill">${RESOURCE_NAMES[id] ?? id} ×${amount}</span>`)
      .join('') || '<span class="muted">No secured resources yet.</span>';
    const stats = save.player.stats;
    const body = `<div class="modal-grid">
        <div class="info-card"><strong>Secured Loot</strong><br/>Coins: ${save.wallet.coins}<br/>${resources}</div>
        <div class="info-card"><strong>Hunter Record</strong><br/>
          Hunts: ${stats.huntsStarted}<br/>Escapes: ${stats.huntsEscaped}<br/>Deaths: ${stats.deaths}<br/>Perfect Parries: ${stats.perfectParries}<br/>Secrets: ${stats.secretsFound}
        </div>
      </div>
      <p class="muted">Temporary run loot is only resolved when you escape or die. Secured loot is stored locally offline.</p>`;
    this.ui.showModal('Storage', body, [
      { label: 'Save Now', className: 'good', onClick: () => { this.save.save(); this.notify('Game saved locally.', 'good'); } },
      { label: 'Close', onClick: () => this.ui.closeModal() }
    ]);
  }

  openCustomization() {
    const c = this.save.data.cosmetics;
    const swatches = `<div class="info-card"><strong>Cosmetics do not change combat stats.</strong><br/>
      Hair color: <span class="pill" style="background:${c.hairColor}">${c.hairColor}</span><br/>
      Outfit color: <span class="pill" style="background:${c.outfitColor}">${c.outfitColor}</span><br/>
      Accent color: <span class="pill" style="background:${c.accentColor}">${c.accentColor}</span></div>`;
    this.ui.showModal('Wardrobe', swatches, [
      { label: 'Cycle Hair Color', onClick: () => { this.cycleCosmetic('hairColor'); this.openCustomization(); } },
      { label: 'Cycle Outfit Color', onClick: () => { this.cycleCosmetic('outfitColor'); this.openCustomization(); } },
      { label: 'Cycle Accent Color', onClick: () => { this.cycleCosmetic('accentColor'); this.openCustomization(); } },
      { label: 'Close', onClick: () => this.ui.closeModal() }
    ]);
  }

  openSkillMaster() {
    const abilityList = RUN_ABILITIES.map((a) => `<div class="info-card"><strong style="color:${a.color}">${a.name}</strong><br/><small>${a.description}</small></div>`).join('');
    const body = `<p>The Skill Master currently documents temporary run abilities. Permanent skill-tree management is intentionally left as an expandable future system.</p>
      <div class="info-card"><strong>Combat lesson:</strong> hold block too early for normal damage reduction, or press it inside the brief perfect-parry window as an attack lands for a riposte.</div>
      <h3>Run Ability Pool</h3><div class="card-list">${abilityList}</div>`;
    this.ui.showModal('Skill Master', body, [{ label: 'Close', onClick: () => this.ui.closeModal() }]);
  }

  openTraining() {
    const body = `<p>The Training Shade attacks slowly and drops no loot. Use it to practice the core skill loop:</p>
      <div class="info-card"><strong>Timing drill:</strong> wait for the blue attack cone to nearly finish, then tap/hold BLOCK. A perfect parry staggers the shade and triggers Blood Riposte.</div>
      <p>Use Light → Light → Heavy → Special to practice the combo chain.</p>`;
    this.ui.showModal('Training Yard', body, [
      { label: 'Heal & Reset Shade', className: 'good', onClick: () => { this.player.health = this.player.maxHealth; this.enemies = []; this.ensureTrainingShade(); this.notify('Training reset.', 'good'); this.ui.closeModal(); } },
      { label: 'Close', onClick: () => this.ui.closeModal() }
    ]);
  }

  openPauseMenu() {
    if (this.ui.modalOpen) {
      this.ui.closeModal();
      return;
    }
    const inHunt = this.mode === 'hunt';
    const body = `<p><strong>Offline save:</strong> progress is stored locally on this device/browser.</p>
      <div class="info-card">${inHunt ? 'You are in a hunt. Escaping through a portal secures all temporary loot. Abandoning now resolves loot like a defeat.' : 'You are at base. Upgrade, customize, or enter the forest from the World Map.'}</div>`;
    const actions = [
      { label: 'Resume', className: 'good', onClick: () => this.ui.closeModal() },
      { label: 'Save Locally', onClick: () => { this.save.save(); this.notify('Saved.', 'good'); } }
    ];
    if (inHunt) actions.push({ label: 'Abandon Hunt (Lose Loot)', className: 'warn', onClick: () => this.endHunt(false) });
    else actions.push({ label: 'Start Forest Hunt', className: 'primary', onClick: () => this.startHunt('forest_frontier') });
    actions.push({
      label: 'Reset Save',
      className: 'warn',
      onClick: () => {
        if (window.confirm('Reset local Dager Hunter save?')) {
          this.save.reset();
          this.player.syncFromSave(this.save.data, false);
          this.enterBase({ first: true });
          this.ui.closeModal();
          this.notify('Save reset.', 'danger');
        }
      }
    });
    this.ui.showModal('Pause', body, actions);
  }

  canPay(cost) {
    const wallet = this.save.data.wallet;
    for (const [id, amount] of Object.entries(cost)) {
      if (!amount) continue;
      const owned = id === 'coins' ? wallet.coins : wallet.resources[id] ?? 0;
      if (owned < amount) return false;
    }
    return true;
  }

  payCost(cost) {
    if (!this.canPay(cost)) return false;
    const wallet = this.save.data.wallet;
    for (const [id, amount] of Object.entries(cost)) {
      if (!amount) continue;
      if (id === 'coins') wallet.coins -= amount;
      else wallet.resources[id] = (wallet.resources[id] ?? 0) - amount;
    }
    return true;
  }

  costHtml(cost) {
    return Object.entries(cost)
      .filter(([, amount]) => amount > 0)
      .map(([id, amount]) => {
        const owned = id === 'coins' ? this.save.data.wallet.coins : this.save.data.wallet.resources[id] ?? 0;
        const cls = owned >= amount ? 'cost-ok' : 'cost-missing';
        return `<span class="pill ${cls}">${RESOURCE_NAMES[id] ?? id} ${owned}/${amount}</span>`;
      })
      .join('');
  }

  upgradeWeapon(id) {
    const record = this.save.data.equipment.weapons[id];
    if (!record) return;
    const cost = weaponUpgradeCost(record.level);
    if (!this.payCost(cost)) return;
    record.level += 1;
    this.player.syncFromSave(this.save.data, true);
    this.save.save();
    this.notify(`${WEAPONS[id].name} upgraded to +${record.level}.`, 'good');
  }

  upgradeArmor() {
    const armor = this.save.data.equipment.armor;
    const cost = armorUpgradeCost(armor.level);
    if (!this.payCost(cost)) return;
    armor.level += 1;
    this.player.syncFromSave(this.save.data, true);
    this.player.health = this.player.maxHealth;
    this.save.save();
    this.notify(`${armor.name} upgraded to +${armor.level}.`, 'good');
  }

  equipWeapon(id) {
    if (!this.save.data.equipment.weapons[id]?.owned) return;
    this.save.data.equipment.equippedWeapon = id;
    this.player.syncFromSave(this.save.data, true);
    this.save.save();
    this.notify(`${WEAPONS[id].name} equipped.`, 'good');
  }

  cycleCosmetic(key) {
    const options = COSMETIC_OPTIONS[key];
    const current = this.save.data.cosmetics[key];
    const index = options.indexOf(current);
    this.save.data.cosmetics[key] = options[(index + 1) % options.length];
    this.save.save();
  }

  openChest(chest) {
    if (chest.opened) return;
    chest.opened = true;
    this.save.data.player.stats.chestsOpened += 1;
    const bonus = chest.dangerous ? 1.75 : 1;
    const coins = Math.floor(this.rng.range(10, 28) * bonus);
    this.spawnPickup(chest.x, chest.y, { kind: 'coins', amount: coins, color: '#ffd166' });
    const pool = chest.dangerous
      ? ['iron', 'weapon_fragments', 'blood_shards', 'arcane_dust', 'claws']
      : ['fur', 'meat', 'iron', 'hide', 'claws'];
    const drops = this.rng.int(2, chest.dangerous ? 5 : 3);
    for (let i = 0; i < drops; i += 1) {
      const id = this.rng.pick(pool);
      this.spawnPickup(chest.x, chest.y, {
        kind: 'resource',
        id,
        amount: this.rng.int(1, chest.dangerous ? 3 : 2),
        color: RESOURCE_COLORS[id] ?? '#ffecc7'
      });
    }
    if (this.rng.chance(chest.dangerous ? 0.3 : 0.12)) {
      const weaponId = this.randomWeaponDrop();
      this.spawnPickup(chest.x, chest.y, { kind: 'weapon', weaponId, color: RARITY[WEAPONS[weaponId].rarity].color });
    }
    if (this.rng.chance(0.25)) this.offerRunAbilities(null, 'A rune flares inside the chest. Choose its power.');

    if (chest.dangerous) {
      this.notify('Ambush! The risk chest was guarded.', 'danger');
      for (let i = 0; i < 2 + this.rng.int(0, 1); i += 1) {
        const a = (i / 3) * TAU + this.rng.range(-0.4, 0.4);
        const type = this.rng.pick(['wolf', 'goblin', 'goblin_archer', 'brute']);
        this.spawnEnemy(type, chest.x + Math.cos(a) * 110, chest.y + Math.sin(a) * 110, { aggro: true });
      }
    } else {
      this.notify('Chest opened.', 'good');
    }
  }

  offerRunAbilities(shrine = null, introText = 'Ancient blood-runes answer your hunt. Choose one temporary ability.') {
    if (!this.run) return;
    if (shrine) shrine.used = true;
    const available = RUN_ABILITIES.filter((ability) => !this.player.tempAbilities.some((owned) => owned.id === ability.id));
    if (!available.length) {
      this.notify('No more run abilities available in this MVP pool.', 'good');
      return;
    }
    const choices = this.rng.shuffle(available).slice(0, Math.min(3, available.length));
    const body = `<p>${introText}</p><div class="modal-grid">${choices
      .map(
        (ability) => `<div class="choice-card" style="border-color:${ability.color}"><strong style="color:${ability.color}">${ability.name}</strong><br/><small>${ability.description}</small></div>`
      )
      .join('')}</div>`;
    const actions = choices.map((ability) => ({
      html: `<strong style="color:${ability.color}">${ability.name}</strong><br/><small>${ability.shortName}</small>`,
      className: 'primary',
      onClick: () => {
        this.player.addRunAbility(ability);
        this.run.abilities.push(ability.id);
        this.notify(`${ability.name} gained for this hunt.`, 'good');
        this.ui.closeModal();
      }
    }));
    this.ui.showModal('Temporary Ability', body, actions);
  }

  addRunCoins(amount) {
    if (!this.run) return;
    this.run.tempCoins += Math.max(0, Math.floor(amount));
  }

  addRunResource(id, amount) {
    if (!this.run) return;
    this.run.tempResources[id] = (this.run.tempResources[id] ?? 0) + Math.max(0, Math.floor(amount));
  }

  addRunWeapon(id) {
    if (!this.run) return;
    this.run.tempWeapons.push(id);
  }

  addRunXp(amount) {
    if (!this.run) return;
    this.run.tempXp += Math.max(0, Math.floor(amount));
  }

  onEnemyDefeated(enemy) {
    if (enemy.training) {
      this.notify('Training shade defeated. It reforms for more practice.', 'good');
      window.setTimeout(() => this.ensureTrainingShade(), 800);
      return;
    }

    this.addRunXp(enemy.data.xp ?? 0);
    this.dropLoot(enemy);
    if (enemy.boss) {
      this.run.bossDefeated = true;
      this.world.unlockBossExit();
      this.notify(`${enemy.name} defeated! Escape portal opened.`, 'parry');
      this.flash('#ffd166', 0.32);
      if (this.rng.chance(enemy.data.weaponChance ?? 0.3)) {
        const weaponId = this.randomWeaponDrop();
        this.spawnPickup(enemy.x, enemy.y, { kind: 'weapon', weaponId, color: RARITY[WEAPONS[weaponId].rarity].color });
      }
    }
  }

  dropLoot(enemy) {
    const [coinMin, coinMax] = enemy.data.coinDrop ?? [0, 0];
    const coins = this.rng.int(coinMin, coinMax);
    if (coins > 0) this.spawnPickup(enemy.x, enemy.y, { kind: 'coins', amount: coins, color: '#ffd166' });
    for (const drop of enemy.data.drops ?? []) {
      if (this.rng.chance(drop.chance)) {
        this.spawnPickup(enemy.x, enemy.y, {
          kind: 'resource',
          id: drop.id,
          amount: this.rng.int(drop.min, drop.max),
          color: RESOURCE_COLORS[drop.id] ?? '#ffecc7'
        });
      }
    }
  }

  spawnPickup(x, y, data) {
    this.pickups.push(new Pickup({ x, y, ...data }));
  }

  randomWeaponDrop() {
    const weighted = [
      { id: 'ember_knife', weight: 4 },
      { id: 'shadow_edge', weight: 3 },
      { id: 'storm_fang', weight: 3 },
      { id: 'vampiric_fang', weight: 1.3 },
      { id: 'bloodfang', weight: 2 }
    ];
    const total = weighted.reduce((s, w) => s + w.weight, 0);
    let roll = this.rng.range(0, total);
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) return entry.id;
    }
    return 'ember_knife';
  }

  handlePlayerDeath() {
    if (this.playerDying) return;
    this.playerDying = true;
    this.audio.play('death');
    this.flash('#e52c59', 0.45);
    if (this.mode === 'hunt') this.endHunt(false);
    else {
      this.player.health = this.player.maxHealth;
      this.notify('The base wards revive you.', 'danger');
      this.playerDying = false;
    }
  }

  endHunt(success) {
    if (!this.run) {
      this.enterBase({ nearPortal: true });
      return;
    }
    const run = this.run;
    const keepRate = success ? 1 : 0.4;
    const xpRate = success ? 1 : 0.55;
    const securedCoins = Math.floor(run.tempCoins * keepRate);
    const securedResources = {};
    const lostResources = {};
    for (const [id, amount] of Object.entries(run.tempResources)) {
      securedResources[id] = Math.floor(amount * keepRate);
      lostResources[id] = amount - securedResources[id];
    }
    const securedXp = Math.floor(run.tempXp * xpRate);
    const securedWeapons = success ? [...run.tempWeapons] : run.tempWeapons.filter(() => this.rng.chance(0.4));
    const lostWeapons = run.tempWeapons.filter((id, index) => !securedWeapons.includes(id) || securedWeapons.indexOf(id) !== index);

    this.save.data.wallet.coins += securedCoins;
    for (const [id, amount] of Object.entries(securedResources)) {
      this.save.data.wallet.resources[id] = (this.save.data.wallet.resources[id] ?? 0) + amount;
    }
    const levelUps = this.grantPermanentXp(securedXp);
    const weaponMessages = securedWeapons.map((id) => this.secureWeapon(id));
    if (success) this.save.data.player.stats.huntsEscaped += 1;
    else this.save.data.player.stats.deaths += 1;
    this.save.save();

    const title = success ? (run.bossDefeated ? 'Hunt Cleared!' : 'Loot Secured') : 'Defeated — Partial Recovery';
    const lostText = success
      ? '<span class="cost-ok">No temporary loot lost.</span>'
      : `<span class="cost-missing">Lost ${run.tempCoins - securedCoins} coins, ${formatResources(lostResources, RESOURCE_NAMES)}${lostWeapons.length ? `, ${lostWeapons.map((id) => WEAPONS[id].name).join(', ')}` : ''}.</span>`;
    const body = `<div class="info-card"><strong>${success ? 'Escaped safely.' : 'You returned to base wounded.'}</strong><br/>
        Secured: ${securedCoins} coins · ${formatResources(securedResources, RESOURCE_NAMES)} · XP ${securedXp}<br/>
        ${weaponMessages.filter(Boolean).join('<br/>') || ''}
      </div>
      <div class="info-card">${lostText}</div>
      ${levelUps ? `<div class="info-card"><strong class="cost-ok">Level up ×${levelUps}!</strong> Your health and damage increased.</div>` : ''}
      <p class="muted">Temporary run abilities have faded. Permanent equipment and resources remain saved offline.</p>`;

    this.enterBase({ nearPortal: true });
    this.playerDying = false;
    this.ui.showModal(title, body, [
      { label: 'Upgrade at Base', className: 'good', onClick: () => this.ui.closeModal() },
      { label: 'Start Another Hunt', className: 'primary', onClick: () => this.startHunt('forest_frontier') }
    ]);
  }

  grantPermanentXp(amount) {
    const player = this.save.data.player;
    player.xp += amount;
    let ups = 0;
    while (player.xp >= xpToNextLevel(player.level)) {
      player.xp -= xpToNextLevel(player.level);
      player.level += 1;
      ups += 1;
    }
    this.player.syncFromSave(this.save.data, true);
    return ups;
  }

  secureWeapon(id) {
    const weapon = WEAPONS[id];
    if (!weapon) return '';
    const equipment = this.save.data.equipment;
    if (equipment.weapons[id]?.owned) {
      const fragments = Math.max(2, RARITY[weapon.rarity].value + 1);
      this.save.data.wallet.resources.weapon_fragments += fragments;
      return `Duplicate ${weapon.name} converted to Weapon Fragments ×${fragments}.`;
    }
    equipment.weapons[id] = { owned: true, level: 1, foundAt: Date.now() };
    return `<strong style="color:${RARITY[weapon.rarity].color}">${weapon.name}</strong> added to your dagger inventory.`;
  }

  notify(text, type = '') {
    this.ui.notify(text, type);
  }

  flash(color = '#ffffff', duration = 0.2) {
    this.flashOverlay = { color, alpha: 1, life: duration, maxLife: duration };
  }

  addParticle(particle) {
    this.particles.push(particle);
    if (this.particles.length > 260) this.particles.splice(0, this.particles.length - 260);
  }

  spawnText(text, x, y, color = '#ffecc7', size = 15) {
    this.floaters.push(new FloatingText(text, x, y, { color, size }));
    if (this.floaters.length > 64) this.floaters.shift();
  }

  spawnImpact(x, y, color = '#ffecc7', count = 8) {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * TAU;
      const s = 80 + Math.random() * 190;
      this.addParticle(
        new Particle({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 0.22 + Math.random() * 0.2,
          radius: 2 + Math.random() * 4,
          color,
          type: i % 4 === 0 ? 'spark' : 'circle'
        })
      );
    }
  }

  spawnSlash(x, y, facing, spec, overrideColor = null) {
    const color = overrideColor ?? (spec.id === 'counter' ? '#fff2a8' : spec.id === 'special' ? '#e52c59' : '#ffecc7');
    const amount = spec.id === 'special' ? 14 : 7;
    for (let i = 0; i < amount; i += 1) {
      const spread = spec.arc >= TAU - 0.1 ? TAU : spec.arc;
      const a = facing - spread / 2 + (spread * (i + 0.5)) / amount;
      const r = (spec.range ?? 70) * (0.45 + Math.random() * 0.45);
      this.addParticle(
        new Particle({
          x: x + Math.cos(a) * r,
          y: y + Math.sin(a) * r,
          vx: Math.cos(a) * 120,
          vy: Math.sin(a) * 120,
          life: 0.12 + Math.random() * 0.12,
          radius: spec.id === 'special' ? 16 : 11,
          color,
          type: 'slash'
        })
      );
    }
  }

  spawnShockwave(x, y, radius, color = '#ffecc7') {
    this.effects.push({ type: 'ring', x, y, radius, color, life: 0.38, maxLife: 0.38 });
  }

  chainLightning(origin, damage) {
    const targets = this.enemies
      .filter((enemy) => !enemy.dead && enemy !== origin && Math.hypot(enemy.x - origin.x, enemy.y - origin.y) < 190)
      .sort((a, b) => Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y))
      .slice(0, 2);
    for (const target of targets) {
      target.takeDamage(damage, this.player, this, { attackId: 'storm', angle: angleTo(origin, target), knockback: 35 });
      this.effects.push({ type: 'line', x: origin.x, y: origin.y, x2: target.x, y2: target.y, color: '#70e8ff', life: 0.18, maxLife: 0.18 });
    }
    if (targets.length) this.audio.play('crit', 0.65);
  }

  findNearestEnemy(from, maxDistance = Infinity) {
    let best = null;
    let bestD = maxDistance;
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const d = Math.hypot(enemy.x - from.x, enemy.y - from.y);
      if (d < bestD) {
        best = enemy;
        bestD = d;
      }
    }
    return best;
  }

  getFocusedEnemy() {
    if (this.lastTarget && !this.lastTarget.dead && this.time - this.lastTargetTime < 4.5) return this.lastTarget;
    return this.findNearestEnemy(this.player, 220);
  }

  render(rawDt) {
    const ctx = this.ctx;
    const w = this.viewport.w;
    const h = this.viewport.h;
    ctx.clearRect(0, 0, w, h);
    if (!this.world) return;

    const desiredX = clamp(this.player.x - w / 2, 0, Math.max(0, this.world.width - w));
    const desiredY = clamp(this.player.y - h / 2, 0, Math.max(0, this.world.height - h));
    const ease = 1 - Math.pow(0.001, rawDt || 0.016);
    this.camera.x += (desiredX - this.camera.x) * ease;
    this.camera.y += (desiredY - this.camera.y) * ease;

    const shakeX = this.screenShake > 0 ? (Math.random() - 0.5) * this.screenShake : 0;
    const shakeY = this.screenShake > 0 ? (Math.random() - 0.5) * this.screenShake : 0;
    ctx.save();
    ctx.translate(-Math.round(this.camera.x) + shakeX, -Math.round(this.camera.y) + shakeY);

    this.world.draw(ctx, this);

    for (const enemy of this.enemies) enemy.drawTelegraph(ctx, this);
    this.drawContextPrompt(ctx);

    for (const pickup of this.pickups) pickup.draw(ctx);
    for (const projectile of this.projectiles) projectile.draw(ctx);

    const actors = [this.player, ...this.enemies.filter((enemy) => !enemy.dead)].sort((a, b) => a.y - b.y);
    for (const actor of actors) actor.draw(ctx, this);

    for (const effect of this.effects) this.drawEffect(ctx, effect);
    for (const particle of this.particles) particle.draw(ctx);
    for (const floater of this.floaters) floater.draw(ctx);
    ctx.restore();

    if (this.flashOverlay.alpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.flashOverlay.alpha * 0.55;
      ctx.fillStyle = this.flashOverlay.color;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  drawContextPrompt(ctx) {
    if (!this.contextAction) return;
    const target = this.contextAction.target;
    const x = target.x + (target.w ? target.w / 2 : 0);
    const y = target.y - (target.r ?? 34) - 18;
    ctx.save();
    drawOutlinedText(ctx, `ACT: ${this.contextAction.label}`, x, y, { size: 14, color: '#ffd166', width: 4 });
    ctx.restore();
  }

  drawEffect(ctx, effect) {
    const t = clamp(effect.life / effect.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = t;
    if (effect.type === 'ring') {
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 5 + (1 - t) * 8;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius * (1.15 - t * 0.25), 0, TAU);
      ctx.stroke();
    } else if (effect.type === 'line') {
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(effect.x, effect.y);
      ctx.lineTo(effect.x2, effect.y2);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }
}
