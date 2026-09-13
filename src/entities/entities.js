import {
  ATTACKS,
  ENEMY_TYPES,
  MINI_BOSSES,
  PLAYER_BASE,
  RESOURCE_NAMES,
  WEAPONS
} from '../data/content.js';
import { angleDiff, angleTo, clamp, drawOutlinedText, drawRoundedRect, normalize, rgba, smoothstep, TAU } from '../core/utils.js';

let NEXT_ID = 1;

function nextId(prefix) {
  NEXT_ID += 1;
  return `${prefix}-${NEXT_ID}`;
}

function attackProgress(attack) {
  const duration = attack.spec.duration !== undefined ? attack.spec.duration : 1;
  return clamp(attack.elapsed / Math.max(0.001, duration), 0, 1);
}

export class Particle {
  constructor({ x, y, vx = 0, vy = 0, life = 0.45, radius = 4, color = '#ffffff', gravity = 0, fade = true, type = 'circle' }) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.radius = radius;
    this.color = color;
    this.gravity = gravity;
    this.fade = fade;
    this.type = type;
  }

  update(dt) {
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    return this.life > 0;
  }

  draw(ctx) {
    const t = clamp(this.life / this.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = this.fade ? smoothstep(t) : 1;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#07040b';
    ctx.lineWidth = 2;
    if (this.type === 'slash') {
      ctx.translate(this.x, this.y);
      ctx.rotate(Math.atan2(this.vy, this.vx));
      ctx.scale(1, 0.45);
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius * (1.4 - t * 0.35), this.radius * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'spark') {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - this.vx * 0.035, this.y - this.vy * 0.035);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.radius;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * (0.55 + t * 0.65), 0, TAU);
      ctx.fill();
      if (this.radius > 3) ctx.stroke();
    }
    ctx.restore();
  }
}

export class FloatingText {
  constructor(text, x, y, { color = '#ffecc7', life = 0.8, size = 16 } = {}) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.vy = -35;
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.size = size;
  }

  update(dt) {
    this.y += this.vy * dt;
    this.vy -= 8 * dt;
    this.life -= dt;
    return this.life > 0;
  }

  draw(ctx) {
    const t = clamp(this.life / this.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = smoothstep(t);
    drawOutlinedText(ctx, this.text, this.x, this.y, { size: this.size, color: this.color, width: 5 });
    ctx.restore();
  }
}

export class Pickup {
  constructor({ x, y, kind, id, amount = 1, label = '', color = '#ffd166', weaponId = null }) {
    this.id = nextId('pickup');
    this.x = x;
    this.y = y;
    this.kind = kind;
    this.itemId = id;
    this.amount = amount;
    this.label = label;
    this.color = color;
    this.weaponId = weaponId;
    this.radius = kind === 'weapon' ? 16 : 11;
    this.vx = (Math.random() - 0.5) * 130;
    this.vy = (Math.random() - 0.5) * 130;
    this.life = 120;
    this.age = 0;
  }

  update(dt, game) {
    this.age += dt;
    this.life -= dt;
    this.vx *= Math.pow(0.08, dt);
    this.vy *= Math.pow(0.08, dt);
    const dx = game.player.x - this.x;
    const dy = game.player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 112) {
      const pull = 420 * (1 - dist / 112);
      if (dist > 0.001) {
        this.vx += (dx / dist) * pull * dt;
        this.vy += (dy / dist) * pull * dt;
      }
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (dist < game.player.radius + this.radius + 10) {
      this.collect(game);
      return false;
    }
    return this.life > 0;
  }

  collect(game) {
    game.audio.play('loot');
    if (this.kind === 'coins') {
      game.addRunCoins(this.amount);
      game.notify(`Coins +${this.amount}`, 'good');
    } else if (this.kind === 'resource') {
      game.addRunResource(this.itemId, this.amount);
      const resourceName = RESOURCE_NAMES[this.itemId] !== undefined ? RESOURCE_NAMES[this.itemId] : this.itemId;
      game.notify(`${resourceName} +${this.amount}`, 'good');
    } else if (this.kind === 'weapon') {
      game.addRunWeapon(this.weaponId);
      game.notify(`${WEAPONS[this.weaponId].name} found! Extract to keep it.`, 'good');
    }
    for (let i = 0; i < 6; i += 1) {
      game.addParticle(
        new Particle({
          x: this.x,
          y: this.y,
          vx: (Math.random() - 0.5) * 120,
          vy: (Math.random() - 0.5) * 120,
          life: 0.35,
          radius: 3 + Math.random() * 3,
          color: this.color
        })
      );
    }
  }

  draw(ctx) {
    ctx.save();
    const bob = Math.sin(this.age * 7) * 3;
    ctx.translate(this.x, this.y + bob);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#08040d';
    ctx.lineWidth = 3;
    if (this.kind === 'coins') {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, TAU);
      ctx.fill();
      ctx.stroke();
      drawOutlinedText(ctx, '$', 0, 0, { size: 14, color: '#5a3500', outline: 'rgba(255,255,255,0)', width: 0 });
    } else if (this.kind === 'weapon') {
      ctx.rotate(-0.65);
      ctx.fillStyle = '#f7f0ff';
      ctx.fillRect(-4, -20, 8, 40);
      ctx.strokeRect(-4, -20, 8, 40);
      ctx.fillStyle = '#e52c59';
      ctx.fillRect(-10, 4, 20, 7);
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -this.radius);
      ctx.lineTo(this.radius, 0);
      ctx.lineTo(0, this.radius);
      ctx.lineTo(-this.radius, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}

export class Projectile {
  constructor({ x, y, vx, vy, damage, radius = 7, owner = null, color = '#ffe066', label = 'projectile' }) {
    this.id = nextId('projectile');
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.radius = radius;
    this.owner = owner;
    this.color = color;
    this.label = label;
    this.life = 3.2;
    this.hit = false;
  }

  update(dt, game) {
    this.life -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (game.world && game.world.resolveCollision) game.world.resolveCollision(this);
    const player = game.player;
    if (!this.hit && Math.hypot(player.x - this.x, player.y - this.y) < player.radius + this.radius) {
      this.hit = true;
      player.takeDamage(this.damage, this.owner, game, { kind: 'projectile', label: this.label, knockback: 75 });
      game.spawnImpact(this.x, this.y, this.color, 8);
      return false;
    }
    return this.life > 0 && !this.hit;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.atan2(this.vy, this.vx));
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#08040d';
    ctx.fillStyle = this.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-10, -this.radius);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, this.radius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

export class Player {
  constructor(saveData) {
    this.id = 'player';
    this.x = 0;
    this.y = 0;
    this.radius = 19;
    this.facing = -Math.PI / 2;
    this.health = 1;
    this.maxHealth = 1;
    this.invulnerableTimer = 0;
    this.attack = null;
    this.queuedAction = null;
    this.comboStep = 0;
    this.comboExpire = 0;
    this.comboBoost = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashVector = { x: 0, y: 0 };
    this.specialCooldown = 0;
    this.blocking = false;
    this.blockStartTime = -99;
    this.parryConsumed = false;
    this.shadowCritTimer = 0;
    this.tempAbilities = [];
    this.modifiers = this.createEmptyModifiers();
    this.syncFromSave(saveData, false);
  }

  createEmptyModifiers() {
    return {
      bleedDamageMult: 0,
      dashCooldownMult: 0,
      lowHealthDamageMult: 0,
      bleedLifesteal: 0,
      blockReduction: 0,
      parrySpecialRefund: 0,
      finisherDamageMult: 0,
      finisherBleed: 0,
      dashTrail: 0
    };
  }

  syncFromSave(saveData, preserveHealthRatio = true) {
    const ratio = preserveHealthRatio ? this.health / Math.max(1, this.maxHealth) : 1;
    this.saveData = saveData;
    this.maxHealth = this.getMaxHealth();
    this.health = clamp(this.maxHealth * ratio, 1, this.maxHealth);
  }

  get level() {
    return this.saveData.player.level;
  }

  get weaponId() {
    return this.saveData.equipment.equippedWeapon;
  }

  get weaponRecord() {
    return this.saveData.equipment.weapons[this.weaponId] || { owned: true, level: 1 };
  }

  get weapon() {
    return WEAPONS[this.weaponId] || WEAPONS.bloodfang;
  }

  getMaxHealth() {
    const armorLevel = this.saveData.equipment.armor.level;
    return Math.round(PLAYER_BASE.maxHp + (this.saveData.player.level - 1) * PLAYER_BASE.levelHpGain + armorLevel * 14);
  }

  getStats() {
    const levelDamage = 1 + (this.level - 1) * PLAYER_BASE.levelDamageGain;
    const upgradeDamage = 1 + (Math.max(1, this.weaponRecord.level) - 1) * 0.16;
    const lowHealth = this.health / this.maxHealth < 0.4 ? 1 + this.modifiers.lowHealthDamageMult : 1;
    return {
      damage: this.weapon.baseDamage * upgradeDamage * levelDamage * lowHealth,
      bleedPower: this.weapon.bleedPower * (1 + this.modifiers.bleedDamageMult),
      critChance: clamp(this.weapon.critChance + (this.shadowCritTimer > 0 ? 0.2 : 0), 0, 0.75),
      critDamage: this.weapon.critDamage,
      lifesteal: this.weapon.lifesteal,
      armorReduction: clamp(this.saveData.equipment.armor.level * PLAYER_BASE.armorReductionPerLevel, 0, 0.36),
      blockReduction: clamp(PLAYER_BASE.blockReduction + this.modifiers.blockReduction, 0, 0.84),
      dashCooldown: Math.max(0.55, PLAYER_BASE.dashCooldown * (1 + this.modifiers.dashCooldownMult)),
      specialCooldown: PLAYER_BASE.specialCooldown
    };
  }

  resetForBase() {
    this.tempAbilities = [];
    this.modifiers = this.createEmptyModifiers();
    this.attack = null;
    this.queuedAction = null;
    this.comboStep = 0;
    this.comboExpire = 0;
    this.dashCooldown = 0;
    this.specialCooldown = 0;
    this.dashTimer = 0;
    this.blocking = false;
    this.invulnerableTimer = 0;
    this.health = this.maxHealth;
  }

  resetForHunt() {
    this.resetForBase();
    this.tempAbilities = [];
    this.modifiers = this.createEmptyModifiers();
  }

  addRunAbility(ability) {
    if (this.tempAbilities.some((a) => a.id === ability.id)) return;
    this.tempAbilities.push(ability);
    for (const [key, value] of Object.entries(ability.modifiers)) {
      this.modifiers[key] = (this.modifiers[key] || 0) + value;
    }
  }

  update(dt, game) {
    this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.specialCooldown = Math.max(0, this.specialCooldown - dt);
    this.shadowCritTimer = Math.max(0, this.shadowCritTimer - dt);

    const blockDown = game.input.isDown('block') && !this.attack && this.dashTimer <= 0;
    if (blockDown && !this.blocking) {
      this.blockStartTime = game.time;
      this.parryConsumed = false;
      game.audio.play('block', 0.75);
    }
    this.blocking = blockDown;

    if (game.input.consume('dash')) this.tryDash(game);
    if (game.input.consume('light')) this.queueOrStart('light', game);
    if (game.input.consume('heavy')) this.queueOrStart('heavy', game);
    if (game.input.consume('special')) this.queueOrStart('special', game);

    this.updateAttack(dt, game);
    this.updateMovement(dt, game);
  }

  updateMovement(dt, game) {
    const input = game.input.move;
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.x += this.dashVector.x * PLAYER_BASE.dashSpeed * dt;
      this.y += this.dashVector.y * PLAYER_BASE.dashSpeed * dt;
      if (Math.random() < 0.9) {
        game.addParticle(
          new Particle({
            x: this.x - this.dashVector.x * 14 + (Math.random() - 0.5) * 8,
            y: this.y - this.dashVector.y * 14 + (Math.random() - 0.5) * 8,
            vx: -this.dashVector.x * 55 + (Math.random() - 0.5) * 40,
            vy: -this.dashVector.y * 55 + (Math.random() - 0.5) * 40,
            life: 0.24 + this.modifiers.dashTrail,
            radius: 7,
            color: 'rgba(112,232,255,0.62)'
          })
        );
      }
    } else {
      const stats = this.getStats();
      let speed = PLAYER_BASE.moveSpeed;
      if (this.blocking) speed *= 0.48;
      if (this.attack) {
        const moveLock = this.attack.spec.moveLock !== undefined ? this.attack.spec.moveLock : 0.65;
        speed *= 1 - moveLock;
      }
      const strength = input.strength;
      if (strength > 0.08) {
        const nx = input.x;
        const ny = input.y;
        this.x += nx * speed * strength * dt;
        this.y += ny * speed * strength * dt;
        if (!this.attack && !this.blocking) this.facing = Math.atan2(ny, nx);
      }
      if (stats.dashCooldown < this.dashCooldown) this.dashCooldown = Math.min(this.dashCooldown, stats.dashCooldown);
    }
    if (game.world && game.world.resolveCollision) game.world.resolveCollision(this);
  }

  tryDash(game) {
    if (this.dashCooldown > 0 || this.attack || this.blocking) return;
    const input = game.input.move;
    let dx = input.x;
    let dy = input.y;
    if (input.strength < 0.12) {
      dx = Math.cos(this.facing);
      dy = Math.sin(this.facing);
    }
    const n = normalize(dx, dy);
    if (n.len <= 0.001) return;
    this.dashVector.x = n.x;
    this.dashVector.y = n.y;
    this.facing = Math.atan2(n.y, n.x);
    this.dashTimer = PLAYER_BASE.dashDuration;
    this.dashCooldown = this.getStats().dashCooldown;
    this.invulnerableTimer = PLAYER_BASE.dashDuration + 0.08;
    this.comboStep = 0;
    game.audio.play('dash');
    game.spawnText('Evade', this.x, this.y - 32, '#70e8ff', 13);
  }

  queueOrStart(kind, game) {
    if (this.blocking || this.dashTimer > 0) return;
    if (this.attack) {
      // Input buffer makes taps responsive without letting button mashing skip recovery.
      this.queuedAction = { kind, time: game.time };
      return;
    }
    this.startAttackKind(kind, game);
  }

  startAttackKind(kind, game, forceSpec = null) {
    const now = game.time;
    let spec = forceSpec;
    let nextComboStep = 0;
    let comboBoost = false;
    if (!spec) {
      if (now > this.comboExpire) this.comboStep = 0;
      if (kind === 'light') {
        if (this.comboStep === 1 && now <= this.comboExpire) {
          spec = ATTACKS.light2;
          nextComboStep = 2;
        } else {
          spec = ATTACKS.light1;
          nextComboStep = 1;
        }
      } else if (kind === 'heavy') {
        if (this.comboStep === 2 && now <= this.comboExpire) {
          spec = ATTACKS.finisher;
          nextComboStep = 3;
        } else {
          spec = ATTACKS.heavy;
          nextComboStep = 0;
        }
      } else if (kind === 'special') {
        if (this.specialCooldown > 0) {
          game.spawnText('Cooldown', this.x, this.y - 46, '#b7fbff', 13);
          return;
        }
        spec = ATTACKS.special;
        comboBoost = this.comboStep === 3 && now <= this.comboExpire;
        nextComboStep = 4;
        this.specialCooldown = this.getStats().specialCooldown * (comboBoost ? 0.75 : 1);
      }
    }

    if (!spec) return;
    const target = game.findNearestEnemy(this, spec.range + 150);
    if (target) this.facing = angleTo(this, target);
    this.attack = {
      spec,
      elapsed: 0,
      hitIds: new Set(),
      visualSpawned: false,
      comboBoost
    };
    this.comboStep = nextComboStep;
    this.comboBoost = comboBoost;
    this.comboExpire = now + spec.duration + 0.58;
    if (spec.id === 'special') game.audio.play('special');
    else game.audio.play(spec.id === 'heavy' || spec.id === 'finisher' || spec.id === 'counter' ? 'heavy' : 'light');
    game.spawnSlash(this.x, this.y, this.facing, spec);
  }

  updateAttack(dt, game) {
    if (!this.attack) return;
    const attack = this.attack;
    attack.elapsed += dt;
    const spec = attack.spec;
    if (!attack.visualSpawned && attack.elapsed >= spec.activeStart) {
      attack.visualSpawned = true;
      if (spec.id === 'special') game.spawnShockwave(this.x, this.y, spec.range, '#e52c59');
    }
    if (attack.elapsed >= spec.activeStart && attack.elapsed <= spec.activeEnd) {
      this.applyAttackHits(game, attack);
    }
    if (attack.elapsed >= spec.duration) {
      this.attack = null;
      const queued = this.queuedAction;
      this.queuedAction = null;
      if (queued && game.time - queued.time < 0.42) {
        this.startAttackKind(queued.kind, game);
      }
    }
  }

  applyAttackHits(game, attack) {
    const spec = attack.spec;
    const stats = this.getStats();
    for (const enemy of game.enemies) {
      if (enemy.dead || attack.hitIds.has(enemy.id)) continue;
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > spec.range + enemy.radius) continue;
      const dir = Math.atan2(dy, dx);
      if (spec.arc < TAU - 0.1 && Math.abs(angleDiff(dir, this.facing)) > spec.arc / 2) continue;
      attack.hitIds.add(enemy.id);
      let damage = stats.damage * spec.damageMult;
      if (spec.id === 'finisher') damage *= 1 + this.modifiers.finisherDamageMult;
      if (attack.comboBoost) damage *= 1.16;
      let crit = Math.random() < stats.critChance;
      if (crit) damage *= stats.critDamage;

      let bleedStacks = spec.bleed;
      if (this.weapon.effect === 'bloodfang' && (spec.id === 'heavy' || spec.id === 'finisher')) bleedStacks += 1;
      if (spec.id === 'finisher') bleedStacks += this.modifiers.finisherBleed;
      const result = enemy.takeDamage(damage, this, game, {
        crit,
        attackId: spec.id,
        angle: this.facing,
        bleedStacks,
        bleedPower: stats.bleedPower,
        knockback: spec.knockback,
        stagger: spec.id === 'counter' ? 0.78 : spec.id === 'finisher' ? 0.18 : 0,
        dot: false
      });
      if (result) this.onHitEnemy(enemy, damage, crit, spec, game);
    }
  }

  onHitEnemy(enemy, damage, crit, spec, game) {
    const stats = this.getStats();
    let heal = Math.min(5.5, damage * stats.lifesteal);
    if (enemy.isBleeding()) heal += Math.min(5, damage * (0.015 + this.modifiers.bleedLifesteal));
    if (spec.id === 'special') heal += Math.min(10, damage * 0.055);
    if (heal > 0.08) this.heal(heal, game, spec.id === 'special' ? 'Blood heal' : 'Lifesteal');

    if (this.weapon.effect === 'storm' && (spec.id === 'heavy' || spec.id === 'finisher' || spec.id === 'special') && Math.random() < 0.32) {
      game.chainLightning(enemy, Math.max(5, damage * 0.32));
    }
    if (this.weapon.effect === 'ember' && (spec.id === 'heavy' || spec.id === 'finisher' || spec.id === 'special')) {
      enemy.applyBurn(3.2, Math.max(1.3, damage * 0.045));
    }
    if (crit) game.audio.play('crit');
  }

  heal(amount, game, label = '+HP') {
    if (this.health <= 0) return;
    const before = this.health;
    this.health = clamp(this.health + amount, 0, this.maxHealth);
    const gained = this.health - before;
    if (gained > 0.35) {
      game.spawnText(`+${Math.round(gained)}`, this.x, this.y - 48, '#8cff7e', 14);
      for (let i = 0; i < 4; i += 1) {
        game.addParticle(
          new Particle({
            x: this.x + (Math.random() - 0.5) * 22,
            y: this.y + (Math.random() - 0.5) * 22,
            vx: (Math.random() - 0.5) * 50,
            vy: -20 - Math.random() * 50,
            life: 0.42,
            radius: 3 + Math.random() * 3,
            color: '#8cff7e'
          })
        );
      }
    }
  }

  takeDamage(amount, source, game, info = {}) {
    if (this.health <= 0) return { dead: true };
    if (this.invulnerableTimer > 0) {
      game.spawnText('DODGED', this.x, this.y - 48, '#70e8ff', 13);
      return { dodged: true };
    }

    const stats = this.getStats();
    let finalDamage = amount;
    const canParry = this.blocking && game.time - this.blockStartTime <= PLAYER_BASE.parryWindow && !this.parryConsumed;
    if (canParry && source) {
      this.parryConsumed = true;
      this.perfectParry(source, game);
      return { parried: true };
    }

    if (this.blocking) {
      finalDamage *= 1 - stats.blockReduction;
      game.audio.play('block');
      game.spawnText('Blocked', this.x, this.y - 48, '#b7fbff', 13);
      game.screenShake = Math.max(game.screenShake, 4);
    } else {
      finalDamage *= 1 - stats.armorReduction;
      this.invulnerableTimer = 0.28;
      game.audio.play('enemy');
      game.screenShake = Math.max(game.screenShake, 9);
    }

    finalDamage = Math.max(1, finalDamage);
    this.health = clamp(this.health - finalDamage, 0, this.maxHealth);
    game.spawnText(`-${Math.round(finalDamage)}`, this.x, this.y - 58, '#ff6b91', 16);
    if (source && info.knockback) {
      const a = angleTo(source, this);
      this.x += Math.cos(a) * Math.min(20, info.knockback * 0.12);
      this.y += Math.sin(a) * Math.min(20, info.knockback * 0.12);
    }
    if (this.health <= 0) game.handlePlayerDeath();
    return { damage: finalDamage };
  }

  perfectParry(source, game) {
    this.facing = angleTo(this, source);
    source.staggerTimer = Math.max(source.staggerTimer, 1.0);
    source.attack = null;
    source.cooldown = Math.max(source.cooldown, 0.75);
    if (this.weapon.effect === 'shadow') this.shadowCritTimer = 3;
    this.specialCooldown = Math.max(0, this.specialCooldown - this.modifiers.parrySpecialRefund);
    game.save.data.player.stats.perfectParries += 1;
    game.audio.play('parry', 1.25);
    game.hitStop = Math.max(game.hitStop, 0.1);
    game.timeSlow = Math.max(game.timeSlow, 0.18);
    game.screenShake = Math.max(game.screenShake, 14);
    game.flash('#fff2a8', 0.23);
    game.notify('PERFECT PARRY!', 'parry');
    game.spawnText('PERFECT PARRY!', this.x, this.y - 76, '#fff2a8', 20);
    for (let i = 0; i < 18; i += 1) {
      const a = Math.random() * TAU;
      const s = 120 + Math.random() * 260;
      game.addParticle(
        new Particle({
          x: this.x + Math.cos(a) * 10,
          y: this.y + Math.sin(a) * 10,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 0.22 + Math.random() * 0.22,
          radius: 3 + Math.random() * 3,
          color: i % 2 ? '#fff2a8' : '#70e8ff',
          type: i % 3 === 0 ? 'spark' : 'circle'
        })
      );
    }
    this.heal(5, game, 'Parry heal');
    if (Math.hypot(source.x - this.x, source.y - this.y) > ATTACKS.counter.range + source.radius) {
      const stats = this.getStats();
      source.takeDamage(stats.damage * 1.65, this, game, {
        crit: false,
        attackId: 'counter',
        angle: angleTo(this, source),
        bleedStacks: 2,
        bleedPower: stats.bleedPower,
        knockback: 55,
        stagger: 0.8
      });
    }
    this.startAttackKind('counter', game, ATTACKS.counter);
  }

  draw(ctx, game) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const cosmetics = this.saveData.cosmetics;
    const invulnFlash = this.invulnerableTimer > 0 && Math.floor(game.time * 24) % 2 === 0;
    ctx.globalAlpha = invulnFlash ? 0.55 : 1;

    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(0, 18, 24, 11, 0, 0, TAU);
    ctx.fill();

    ctx.rotate(this.facing);

    // Dash trail aura and blocking shield.
    if (this.dashTimer > 0) {
      ctx.strokeStyle = '#70e8ff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-34, -14);
      ctx.lineTo(-58, 0);
      ctx.lineTo(-34, 14);
      ctx.stroke();
    }
    if (this.blocking) {
      const parryAlpha = clamp(1 - (game.time - this.blockStartTime) / PLAYER_BASE.parryWindow, 0, 1);
      ctx.strokeStyle = `rgba(183,251,255,${0.55 + parryAlpha * 0.4})`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(22, 0, 34, -1.15, 1.15);
      ctx.stroke();
      if (parryAlpha > 0) {
        ctx.strokeStyle = '#fff2a8';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }

    // Cloak/body.
    ctx.fillStyle = '#08040d';
    ctx.beginPath();
    ctx.moveTo(-16, -16);
    ctx.lineTo(21, 0);
    ctx.lineTo(-16, 16);
    ctx.lineTo(-7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = cosmetics.outfitColor;
    ctx.beginPath();
    ctx.moveTo(-12, -14);
    ctx.lineTo(19, 0);
    ctx.lineTo(-12, 14);
    ctx.lineTo(-4, 0);
    ctx.closePath();
    ctx.fill();

    // Head/hair.
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, TAU);
    ctx.fillStyle = '#d8a16f';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#08040d';
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(-5, -7, 13, 8, -0.3, 0, TAU);
    ctx.fillStyle = cosmetics.hairColor;
    ctx.fill();

    // Comic eye/facing slash.
    ctx.strokeStyle = '#08040d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(7, -5);
    ctx.lineTo(14, -2);
    ctx.stroke();

    // Dual daggers.
    const accent = cosmetics.accentColor;
    ctx.fillStyle = '#f7f0ff';
    ctx.strokeStyle = '#08040d';
    ctx.lineWidth = 3;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(12, side * 16);
      ctx.rotate(side * 0.5);
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(28, 0);
      ctx.lineTo(0, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(-7, -6, 10, 12);
      ctx.restore();
    }

    if (this.attack) {
      const spec = this.attack.spec;
      const p = attackProgress(this.attack);
      ctx.strokeStyle = rgba(spec.id === 'special' ? '#e52c59' : '#ffecc7', 0.55 * (1 - Math.abs(0.5 - p)));
      ctx.lineWidth = spec.id === 'special' ? 8 : 6;
      ctx.beginPath();
      if (spec.arc >= TAU - 0.1) {
        ctx.arc(0, 0, spec.range * smoothstep(p), 0, TAU);
      } else {
        ctx.arc(0, 0, spec.range, -spec.arc / 2, spec.arc / 2);
      }
      ctx.stroke();
    }

    ctx.restore();
  }
}

export class Enemy {
  constructor(spawn, game) {
    const data = ENEMY_TYPES[spawn.type] || MINI_BOSSES[spawn.type];
    if (!data) throw new Error(`Unknown enemy type ${spawn.type}`);
    this.id = nextId('enemy');
    this.type = spawn.type;
    this.data = data;
    this.name = data.name;
    this.role = data.role;
    this.x = spawn.x;
    this.y = spawn.y;
    this.homeX = spawn.x;
    this.homeY = spawn.y;
    this.patrolRadius = spawn.patrolRadius !== undefined ? spawn.patrolRadius : 140;
    this.radius = data.radius;
    this.maxHp = data.maxHp;
    this.hp = data.maxHp;
    this.speed = data.speed;
    this.boss = Boolean(spawn.boss || MINI_BOSSES[spawn.type]);
    this.dead = false;
    this.facing = Math.random() * TAU;
    this.aggro = this.boss;
    this.cooldown = game.rng && game.rng.range ? game.rng.range(0.25, 1.4) : Math.random();
    this.attack = null;
    this.staggerTimer = 0;
    this.knockX = 0;
    this.knockY = 0;
    this.bleedStacks = 0;
    this.bleedTimer = 0;
    this.bleedTick = 0.65;
    this.bleedPower = 1;
    this.burnTimer = 0;
    this.burnTick = 0.5;
    this.burnDamage = 0;
    this.phase2 = false;
    this.wanderTimer = 0;
    this.wanderAngle = Math.random() * TAU;
  }

  isBleeding() {
    return this.bleedStacks >= 3 && this.bleedTimer > 0;
  }

  applyBleed(stacks, power, game) {
    if (stacks <= 0 || this.dead) return;
    this.bleedStacks = clamp(this.bleedStacks + stacks, 0, 9);
    this.bleedPower = Math.max(this.bleedPower, power);
    this.bleedTimer = Math.max(this.bleedTimer, 5.8 + stacks * 0.3);
    if (this.bleedStacks >= 3) {
      game.spawnText('BLEED', this.x, this.y - this.radius - 28, '#ff315f', 14);
      for (let i = 0; i < 5; i += 1) {
        game.addParticle(
          new Particle({
            x: this.x + (Math.random() - 0.5) * this.radius,
            y: this.y + (Math.random() - 0.5) * this.radius,
            vx: (Math.random() - 0.5) * 90,
            vy: (Math.random() - 0.5) * 90,
            life: 0.32,
            radius: 3 + Math.random() * 4,
            color: '#e52c59'
          })
        );
      }
    }
  }

  applyBurn(duration, damagePerTick) {
    this.burnTimer = Math.max(this.burnTimer, duration);
    this.burnDamage = Math.max(this.burnDamage, damagePerTick);
  }

  takeDamage(amount, source, game, info = {}) {
    if (this.dead) return false;
    let damage = amount;
    if (this.staggerTimer > 0 && !info.dot) damage *= 1.08;
    this.hp = clamp(this.hp - damage, 0, this.maxHp);
    this.aggro = true;
    if (info.bleedStacks && source && source.id === 'player') {
      this.applyBleed(info.bleedStacks, info.bleedPower !== undefined ? info.bleedPower : 1, game);
    }
    if (info.knockback && !this.boss) {
      this.knockX += Math.cos(info.angle) * info.knockback;
      this.knockY += Math.sin(info.angle) * info.knockback;
    }
    if (info.stagger) this.staggerTimer = Math.max(this.staggerTimer, info.stagger);
    const color = info.dot ? '#ff8fab' : info.crit ? '#ffd166' : '#ffecc7';
    game.spawnText(`${info.crit ? 'CRIT ' : ''}${Math.round(damage)}`, this.x, this.y - this.radius - 24, color, info.crit ? 18 : 14);
    game.spawnImpact(this.x, this.y, info.dot ? '#e52c59' : '#ffecc7', info.crit ? 13 : 8);
    if (!info.dot) {
      game.audio.play('hit', info.crit ? 1.15 : 0.85);
      game.hitStop = Math.max(game.hitStop, info.attackId === 'counter' ? 0.08 : info.attackId === 'finisher' ? 0.045 : 0.018);
      game.screenShake = Math.max(game.screenShake, info.attackId === 'counter' ? 10 : info.crit ? 7 : 3);
    }
    game.lastTarget = this;
    game.lastTargetTime = game.time;
    if (this.hp <= 0) this.die(game, source);
    return true;
  }

  die(game, source) {
    if (this.dead) return;
    this.dead = true;
    this.attack = null;
    game.audio.play(this.boss ? 'death' : 'enemy', this.boss ? 1.1 : 0.7);
    if (!this.training) {
      game.save.data.player.stats.enemiesDefeated += 1;
      if (this.boss) game.save.data.player.stats.miniBossesDefeated += 1;
    }
    for (let i = 0; i < (this.boss ? 28 : 12); i += 1) {
      const a = Math.random() * TAU;
      const s = 60 + Math.random() * (this.boss ? 210 : 120);
      game.addParticle(
        new Particle({
          x: this.x + Math.cos(a) * this.radius * 0.4,
          y: this.y + Math.sin(a) * this.radius * 0.4,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 0.42 + Math.random() * 0.35,
          radius: 3 + Math.random() * (this.boss ? 7 : 4),
          color: this.boss ? '#ffd166' : '#e52c59'
        })
      );
    }
    game.onEnemyDefeated(this);
  }

  update(dt, game) {
    if (this.dead) return;
    this.updateStatuses(dt, game);
    if (this.dead) return;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.staggerTimer = Math.max(0, this.staggerTimer - dt);
    if (this.knockX || this.knockY) {
      this.x += this.knockX * dt;
      this.y += this.knockY * dt;
      this.knockX *= Math.pow(0.04, dt);
      this.knockY *= Math.pow(0.04, dt);
      if (Math.hypot(this.knockX, this.knockY) < 3) {
        this.knockX = 0;
        this.knockY = 0;
      }
      if (game.world && game.world.resolveCollision) game.world.resolveCollision(this);
    }
    if (this.staggerTimer > 0) return;

    if (this.boss && this.data.phase2 && !this.phase2 && this.hp / this.maxHp <= this.data.phase2.threshold) {
      this.phase2 = true;
      game.notify(`${this.name} enters a new phase!`, 'danger');
      game.spawnShockwave(this.x, this.y, this.radius + 70, '#ff315f');
      game.screenShake = Math.max(game.screenShake, 12);
    }

    if (this.attack) {
      this.updateAttack(dt, game);
      if (game.world && game.world.resolveCollision) game.world.resolveCollision(this);
      return;
    }

    const player = game.player;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    const aggroRange = this.data.aggroRange !== undefined ? this.data.aggroRange : 420;
    if (!this.aggro && dist < aggroRange) this.aggro = true;

    if (!this.aggro) {
      this.updateWander(dt, game);
      return;
    }

    const attack = this.chooseAttack(dist, game);
    if (attack && this.cooldown <= 0) {
      this.startAttack(attack, game);
      return;
    }

    this.moveCombat(dt, game, dist);
    if (game.world && game.world.resolveCollision) game.world.resolveCollision(this);
  }

  updateStatuses(dt, game) {
    if (this.bleedTimer > 0) {
      this.bleedTimer -= dt;
      this.bleedTick -= dt;
      if (this.bleedTimer <= 0) {
        this.bleedStacks = 0;
        this.bleedPower = 1;
      } else if (this.isBleeding() && this.bleedTick <= 0) {
        this.bleedTick = 0.68;
        const damage = (1.4 + this.bleedStacks * 1.25) * this.bleedPower;
        this.takeDamage(damage, null, game, { dot: true });
      }
    }
    if (this.burnTimer > 0) {
      this.burnTimer -= dt;
      this.burnTick -= dt;
      if (this.burnTick <= 0) {
        this.burnTick = 0.5;
        this.takeDamage(this.burnDamage, null, game, { dot: true });
        game.addParticle(new Particle({ x: this.x, y: this.y - this.radius * 0.2, vx: 0, vy: -30, life: 0.3, radius: 5, color: '#ff8f3f' }));
      }
    }
  }

  updateWander(dt, game) {
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      this.wanderTimer = 1.2 + Math.random() * 2;
      this.wanderAngle = Math.random() * TAU;
    }
    const homeDist = Math.hypot(this.x - this.homeX, this.y - this.homeY);
    let angle = this.wanderAngle;
    if (homeDist > this.patrolRadius) angle = Math.atan2(this.homeY - this.y, this.homeX - this.x);
    this.x += Math.cos(angle) * this.speed * 0.22 * dt;
    this.y += Math.sin(angle) * this.speed * 0.22 * dt;
    this.facing = angle;
    if (game.world && game.world.resolveCollision) game.world.resolveCollision(this);
  }

  chooseAttack(dist, game) {
    const attacks = this.data.attacks;
    if (!attacks || !attacks.length) return null;
    const usable = attacks.filter((attack) => dist <= attack.range + (attack.kind === 'melee' || attack.kind === 'triple_melee' ? this.radius + game.player.radius : 0));
    if (!usable.length) return null;
    if (this.boss) {
      // Bosses rotate through patterns based on range but remain readable.
      return game.rng.pick(usable);
    }
    return usable[0];
  }

  moveCombat(dt, game, dist) {
    const player = game.player;
    const a = Math.atan2(player.y - this.y, player.x - this.x);
    this.facing = a;
    const preferred = this.data.preferredRange;
    let dir = 1;
    let speedScale = 1;
    if (preferred) {
      if (dist < preferred * 0.72) dir = -1;
      else if (dist < preferred * 1.08) {
        dir = 0;
        // Strafe so ranged enemies are not identical to melee enemies.
        this.x += Math.cos(a + Math.PI / 2) * this.speed * 0.42 * Math.sin(game.time * 2 + this.radius) * dt;
        this.y += Math.sin(a + Math.PI / 2) * this.speed * 0.42 * Math.sin(game.time * 2 + this.radius) * dt;
      }
    } else if (dist < this.radius + player.radius + 26) {
      dir = -0.25;
      speedScale = 0.55;
    }
    const phaseSpeed = this.phase2 && this.data.phase2 ? this.data.phase2.speedMultiplier : 1;
    this.x += Math.cos(a) * this.speed * speedScale * phaseSpeed * dir * dt;
    this.y += Math.sin(a) * this.speed * speedScale * phaseSpeed * dir * dt;
  }

  startAttack(def, game) {
    this.facing = angleTo(this, game.player);
    this.attack = {
      def,
      elapsed: 0,
      hit: false,
      fire: false,
      targetX: game.player.x,
      targetY: game.player.y,
      chargeStarted: false,
      comboIndex: 0,
      hitIndexes: new Set(),
      angle: this.facing
    };
    this.cooldown = def.recovery + (this.boss ? 0.18 : 0.36) + Math.random() * (this.boss ? 0.36 : 0.72);
  }

  updateAttack(dt, game) {
    const attack = this.attack;
    const def = attack.def;
    attack.elapsed += dt;
    const player = game.player;
    if (attack.elapsed < def.windup * 0.65 && def.kind !== 'aoe') {
      this.facing = angleTo(this, player);
      attack.angle = this.facing;
      attack.targetX = player.x;
      attack.targetY = player.y;
    }

    if (def.kind === 'melee') {
      if (attack.elapsed >= def.windup && attack.elapsed <= def.windup + def.active) {
        if (def.dash && !attack.dashDone) {
          attack.dashDone = true;
          this.x += Math.cos(this.facing) * def.dash * 0.28;
          this.y += Math.sin(this.facing) * def.dash * 0.28;
        }
        if (!attack.hit) {
          attack.hit = true;
          this.tryMeleeHit(game, def);
        }
      }
    } else if (def.kind === 'triple_melee') {
      const hitTimes = [def.windup, def.windup + 0.28, def.windup + 0.56];
      for (let i = 0; i < hitTimes.length; i += 1) {
        if (!attack.hitIndexes.has(i) && attack.elapsed >= hitTimes[i]) {
          attack.hitIndexes.add(i);
          this.facing = angleTo(this, player);
          const dashDistance = def.dash !== undefined ? def.dash : 60;
          this.x += Math.cos(this.facing) * dashDistance * 0.17;
          this.y += Math.sin(this.facing) * dashDistance * 0.17;
          this.tryMeleeHit(game, def, 0.75 + i * 0.12);
          game.spawnSlash(this.x, this.y, this.facing, { ...def, range: def.range, arc: def.arc, id: 'enemy_slash' }, def.indicatorColor);
        }
      }
    } else if (def.kind === 'projectile') {
      if (!attack.fire && attack.elapsed >= def.windup) {
        attack.fire = true;
        const a = Math.atan2(attack.targetY - this.y, attack.targetX - this.x);
        const speed = def.projectileSpeed;
        game.projectiles.push(
          new Projectile({
            x: this.x + Math.cos(a) * (this.radius + 12),
            y: this.y + Math.sin(a) * (this.radius + 12),
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            damage: this.scaledDamage(def),
            radius: def.projectileRadius,
            owner: this,
            color: def.indicatorColor,
            label: def.label
          })
        );
        game.audio.play('enemy', 0.55);
      }
    } else if (def.kind === 'aoe') {
      if (!attack.fire && attack.elapsed >= def.windup) {
        attack.fire = true;
        game.spawnShockwave(attack.targetX, attack.targetY, def.areaRadius, def.indicatorColor);
        const dist = Math.hypot(player.x - attack.targetX, player.y - attack.targetY);
        if (dist <= def.areaRadius + player.radius) {
          player.takeDamage(this.scaledDamage(def), this, game, {
            kind: 'aoe',
            label: def.label,
            knockback: def.knockback !== undefined ? def.knockback : 90
          });
        }
      }
    } else if (def.kind === 'charge') {
      if (attack.elapsed >= def.windup && attack.elapsed <= def.windup + def.active) {
        if (!attack.chargeStarted) {
          attack.chargeStarted = true;
          attack.angle = Math.atan2(attack.targetY - this.y, attack.targetX - this.x);
          game.spawnShockwave(this.x, this.y, this.radius + 25, def.indicatorColor);
        }
        this.x += Math.cos(attack.angle) * def.chargeSpeed * dt;
        this.y += Math.sin(attack.angle) * def.chargeSpeed * dt;
        this.facing = attack.angle;
        if (!attack.hit && Math.hypot(player.x - this.x, player.y - this.y) <= player.radius + this.radius + 8) {
          attack.hit = true;
          player.takeDamage(this.scaledDamage(def), this, game, { kind: 'charge', label: def.label, knockback: def.knockback });
        }
      }
    } else if (def.kind === 'summon') {
      if (!attack.fire && attack.elapsed >= def.windup) {
        attack.fire = true;
        const current = game.enemies.filter((e) => !e.dead).length;
        if (current < 22) {
          for (let i = 0; i < def.summonCount; i += 1) {
            const a = (i / def.summonCount) * TAU + Math.random() * 0.5;
            game.spawnEnemy(def.summon, this.x + Math.cos(a) * 85, this.y + Math.sin(a) * 85, { aggro: true });
          }
          game.notify(`${this.name} calls reinforcements!`, 'danger');
        }
      }
    }

    const total = def.windup + def.active + def.recovery + (def.kind === 'triple_melee' ? 0.48 : 0);
    if (attack.elapsed >= total) this.attack = null;
  }

  scaledDamage(def) {
    const phase = this.phase2 && this.data.phase2 ? this.data.phase2.damageMultiplier : 1;
    return def.damage * phase;
  }

  tryMeleeHit(game, def, mult = 1) {
    const player = game.player;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > def.range + player.radius) return false;
    const dir = Math.atan2(dy, dx);
    const arc = def.arc !== undefined ? def.arc : 1.2;
    if (Math.abs(angleDiff(dir, this.facing)) > arc / 2) return false;
    player.takeDamage(this.scaledDamage(def) * mult, this, game, { kind: 'melee', label: def.label, knockback: def.knockback });
    return true;
  }

  drawTelegraph(ctx, game) {
    if (!this.attack || this.dead) return;
    const { def, elapsed, targetX, targetY, angle } = this.attack;
    if (elapsed > def.windup + def.active) return;
    const wind = clamp(elapsed / def.windup, 0, 1);
    const alpha = 0.18 + wind * 0.32;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = def.indicatorColor;
    ctx.fillStyle = rgba(def.indicatorColor, 0.18 + wind * 0.18);
    ctx.lineWidth = 4 + wind * 4;

    if (def.kind === 'aoe') {
      ctx.beginPath();
      ctx.arc(targetX, targetY, def.areaRadius, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(targetX, targetY, def.areaRadius * wind, 0, TAU);
      ctx.stroke();
    } else if (def.kind === 'projectile') {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
    } else if (def.kind === 'charge') {
      ctx.translate(this.x, this.y);
      ctx.rotate(angle);
      drawRoundedRect(ctx, 0, -this.radius * 0.65, def.range, this.radius * 1.3, 18);
      ctx.fill();
      ctx.stroke();
    } else if (def.kind === 'summon') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 48 * wind, 0, TAU);
      ctx.stroke();
    } else {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.facing);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const arc = def.arc !== undefined ? def.arc : 1.2;
      ctx.arc(0, 0, def.range, -arc / 2, arc / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  draw(ctx, game) {
    if (this.dead) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    const hurt = game.lastTarget === this && game.time - game.lastTargetTime < 0.08;
    if (hurt) ctx.globalAlpha = 0.72;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, this.radius * 0.75, this.radius * 1.12, this.radius * 0.45, 0, 0, TAU);
    ctx.fill();
    ctx.rotate(this.facing);
    const scale = this.boss ? 1.08 : 1;
    ctx.scale(scale, scale);

    if (this.type.includes('wolf')) this.drawWolf(ctx);
    else if (this.type.includes('archer')) this.drawGoblin(ctx, true);
    else if (this.type.includes('goblin')) this.drawGoblin(ctx, false);
    else if (this.type.includes('mage')) this.drawMage(ctx);
    else if (this.type.includes('brute')) this.drawBrute(ctx);
    else if (this.type.includes('treant')) this.drawTreant(ctx);
    else this.drawWolf(ctx);

    if (this.staggerTimer > 0) {
      drawOutlinedText(ctx, '✦', 0, -this.radius - 20, { size: 18, color: '#ffd166' });
    }
    ctx.restore();

    this.drawHealth(ctx);
  }

  drawHealth(ctx) {
    if (this.hp >= this.maxHp && !this.boss && !this.isBleeding()) return;
    const w = this.boss ? 92 : 48;
    const h = this.boss ? 8 : 6;
    const x = this.x - w / 2;
    const y = this.y - this.radius - (this.boss ? 34 : 22);
    ctx.save();
    ctx.fillStyle = '#09050e';
    drawRoundedRect(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.fillStyle = this.boss ? '#ffd166' : '#ff6b35';
    drawRoundedRect(ctx, x, y, w * (this.hp / this.maxHp), h, 6);
    ctx.fill();
    ctx.strokeStyle = '#09050e';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (this.bleedStacks > 0) {
      for (let i = 0; i < Math.min(9, this.bleedStacks); i += 1) {
        ctx.beginPath();
        ctx.arc(x + 6 + i * 8, y + h + 8, 3, 0, TAU);
        ctx.fillStyle = this.isBleeding() ? '#ff315f' : '#8d1236';
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawWolf(ctx) {
    ctx.fillStyle = this.data.body;
    ctx.strokeStyle = '#08040d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius * 1.1, this.radius * 0.75, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(this.radius * 0.82, 0, this.radius * 0.62, this.radius * 0.55, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = this.data.accent;
    ctx.beginPath();
    ctx.moveTo(this.radius * 1.15, -this.radius * 0.35);
    ctx.lineTo(this.radius * 1.45, -this.radius * 0.95);
    ctx.lineTo(this.radius * 0.72, -this.radius * 0.52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.radius * 1.15, this.radius * 0.35);
    ctx.lineTo(this.radius * 1.45, this.radius * 0.95);
    ctx.lineTo(this.radius * 0.72, this.radius * 0.52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = this.data.accent;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-this.radius * 0.9, 0);
    ctx.quadraticCurveTo(-this.radius * 1.55, -this.radius * 0.62, -this.radius * 1.75, -this.radius * 0.15);
    ctx.stroke();
  }

  drawGoblin(ctx, archer) {
    ctx.strokeStyle = '#08040d';
    ctx.lineWidth = 4;
    ctx.fillStyle = this.data.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius * 0.85, this.radius, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#97d37d';
    ctx.beginPath();
    ctx.arc(this.radius * 0.55, 0, this.radius * 0.62, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = this.data.accent;
    ctx.fillRect(-this.radius * 0.5, -this.radius * 0.65, this.radius * 0.7, this.radius * 1.3);
    ctx.strokeRect(-this.radius * 0.5, -this.radius * 0.65, this.radius * 0.7, this.radius * 1.3);
    if (archer) {
      ctx.strokeStyle = '#f2c15f';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(this.radius * 0.95, 0, 18, -1.3, 1.3);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#f7f0ff';
      ctx.beginPath();
      ctx.moveTo(this.radius * 0.75, -5);
      ctx.lineTo(this.radius * 1.75, 0);
      ctx.lineTo(this.radius * 0.75, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  drawMage(ctx) {
    ctx.strokeStyle = '#08040d';
    ctx.lineWidth = 4;
    ctx.fillStyle = this.data.body;
    ctx.beginPath();
    ctx.moveTo(-this.radius, this.radius);
    ctx.lineTo(0, -this.radius * 1.25);
    ctx.lineTo(this.radius, this.radius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = this.data.accent;
    ctx.beginPath();
    ctx.arc(this.radius * 0.2, -this.radius * 0.35, 8, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = this.data.accent;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(this.radius * 0.75, -this.radius * 0.7);
    ctx.lineTo(this.radius * 1.25, this.radius * 0.8);
    ctx.stroke();
  }

  drawBrute(ctx) {
    ctx.strokeStyle = '#08040d';
    ctx.lineWidth = 5;
    ctx.fillStyle = this.data.body;
    drawRoundedRect(ctx, -this.radius * 0.9, -this.radius * 0.82, this.radius * 1.55, this.radius * 1.64, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = this.data.accent;
    ctx.beginPath();
    ctx.arc(this.radius * 0.55, 0, this.radius * 0.58, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e1c38a';
    drawRoundedRect(ctx, -this.radius * 0.55, -this.radius * 0.45, this.radius * 0.75, this.radius * 0.9, 8);
    ctx.fill();
    ctx.stroke();
  }

  drawTreant(ctx) {
    ctx.strokeStyle = '#08040d';
    ctx.lineWidth = 5;
    ctx.fillStyle = this.data.body;
    drawRoundedRect(ctx, -this.radius * 0.72, -this.radius, this.radius * 1.35, this.radius * 2, 18);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = this.data.accent;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-this.radius * 0.2, -this.radius * 0.4);
    ctx.quadraticCurveTo(-this.radius * 0.7, -this.radius * 1.1, -this.radius * 1.25, -this.radius * 1.24);
    ctx.moveTo(this.radius * 0.1, -this.radius * 0.35);
    ctx.quadraticCurveTo(this.radius * 0.9, -this.radius * 1.0, this.radius * 1.35, -this.radius * 1.08);
    ctx.stroke();
  }
}
