import { RESOURCE_NAMES, RARITY, WEAPONS, xpToNextLevel } from '../data/content.js';
import { clamp, formatResources } from '../core/utils.js';

export class UIManager {
  constructor(game) {
    this.game = game;
    this.modalOpen = false;
    this.elements = {
      mode: document.getElementById('mode-label'),
      hpBar: document.getElementById('health-bar'),
      hpText: document.getElementById('health-text'),
      xpBar: document.getElementById('xp-bar'),
      xpText: document.getElementById('xp-text'),
      currency: document.getElementById('currency-line'),
      runLoot: document.getElementById('run-loot-line'),
      enemyCard: document.getElementById('enemy-card'),
      enemyName: document.getElementById('enemy-name'),
      enemyBleed: document.getElementById('enemy-bleed-pill'),
      enemyHp: document.getElementById('enemy-health-bar'),
      combo: document.getElementById('combo-label'),
      abilityRow: document.getElementById('ability-row'),
      notifications: document.getElementById('notifications'),
      minimap: document.getElementById('minimap'),
      pause: document.getElementById('pause-button'),
      modal: document.getElementById('modal-backdrop'),
      modalTitle: document.getElementById('modal-title'),
      modalBody: document.getElementById('modal-body'),
      modalActions: document.getElementById('modal-actions'),
      modalClose: document.getElementById('modal-close'),
      specialCd: document.getElementById('special-cd'),
      dashCd: document.getElementById('dash-cd'),
      interactLabel: document.getElementById('interact-label'),
      interactHint: document.getElementById('interact-hint')
    };
    this.buttons = {
      special: document.querySelector('[data-action="special"]'),
      dash: document.querySelector('[data-action="dash"]'),
      interact: document.querySelector('[data-action="interact"]'),
      light: document.querySelector('[data-action="light"]'),
      heavy: document.querySelector('[data-action="heavy"]'),
      block: document.querySelector('[data-action="block"]')
    };

    this.elements.pause.addEventListener('click', () => this.game.openPauseMenu());
    this.elements.modalClose.addEventListener('click', () => this.closeModal());
  }

  notify(text, type = '') {
    const node = document.createElement('div');
    node.className = `toast ${type}`;
    node.textContent = text;
    this.elements.notifications.prepend(node);
    while (this.elements.notifications.children.length > 4) {
      this.elements.notifications.lastElementChild.remove();
    }
    window.setTimeout(() => {
      node.style.opacity = '0';
      node.style.transform = 'translateY(-6px) scale(0.94)';
      window.setTimeout(() => node.remove(), 250);
    }, type === 'parry' ? 1600 : 2200);
  }

  showModal(title, bodyHtml, actions = [], { lock = true } = {}) {
    this.modalOpen = lock;
    this.game.pausedForUi = lock;
    this.elements.modalTitle.textContent = title;
    this.elements.modalBody.innerHTML = bodyHtml;
    this.elements.modalActions.innerHTML = '';
    for (const action of actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `modal-button ${action.className || ''}`.trim();
      button.innerHTML = action.html !== undefined ? action.html : action.label;
      button.disabled = Boolean(action.disabled);
      button.addEventListener('click', () => {
        this.game.audio.play('ui');
        if (action.onClick) action.onClick();
      });
      this.elements.modalActions.append(button);
    }
    this.elements.modal.classList.remove('hidden');
  }

  closeModal() {
    this.elements.modal.classList.add('hidden');
    this.modalOpen = false;
    this.game.pausedForUi = false;
  }

  update() {
    const game = this.game;
    const player = game.player;
    const save = game.save.data;
    this.elements.mode.textContent = game.mode === 'hunt' ? `Forest Hunt · ${game.run ? game.run.seedLabel : ''}` : 'Base';

    const hpPct = clamp(player.health / player.maxHealth, 0, 1);
    this.elements.hpBar.style.width = `${hpPct * 100}%`;
    this.elements.hpText.textContent = `HP ${Math.ceil(player.health)} / ${player.maxHealth}`;

    const next = xpToNextLevel(save.player.level);
    const xpPct = clamp(save.player.xp / next, 0, 1);
    this.elements.xpBar.style.width = `${xpPct * 100}%`;
    this.elements.xpText.textContent = `LV ${save.player.level} · XP ${save.player.xp}/${next}`;

    const weapon = WEAPONS[save.equipment.equippedWeapon];
    const equippedRecord = save.equipment.weapons[weapon.id];
    this.elements.currency.textContent = `Coins ${save.wallet.coins} · ${weapon.name} +${equippedRecord ? equippedRecord.level : 1}`;

    if (game.mode === 'hunt') {
      const run = game.run;
      this.elements.runLoot.textContent = `Run loot: ${run.tempCoins} coins · ${formatResources(run.tempResources, RESOURCE_NAMES)} · XP ${run.tempXp}`;
    } else {
      this.elements.runLoot.textContent = `Safe resources: ${formatResources(save.wallet.resources, RESOURCE_NAMES)}`;
    }

    const target = game.getFocusedEnemy();
    if (target) {
      this.elements.enemyCard.classList.remove('hidden');
      this.elements.enemyName.textContent = target.name;
      this.elements.enemyBleed.textContent = target.isBleeding() ? `BLEED ×${target.bleedStacks}` : `Bleed ${target.bleedStacks}`;
      this.elements.enemyHp.style.width = `${clamp(target.hp / target.maxHp, 0, 1) * 100}%`;
    } else {
      this.elements.enemyCard.classList.add('hidden');
    }

    this.updateComboStrip();
    this.updateAbilityRow();
    this.updateButtons();
    this.drawMinimap();
  }

  updateComboStrip() {
    const player = this.game.player;
    const expired = this.game.time > player.comboExpire;
    const step = expired ? 0 : player.comboStep;
    const labels = ['LIGHT', 'LIGHT', 'HEAVY', 'SPECIAL'];
    const next = labels[Math.min(step, labels.length - 1)] || 'LIGHT';
    let detail = 'Light → Light → Heavy → Special';
    if (step === 1) detail = '<strong>Light</strong> → HEAVY → Special';
    if (step === 2) detail = '<strong>Heavy Finisher</strong> → Special';
    if (step === 3) detail = '<strong>Special Combo</strong> ready';
    if (step >= 4) detail = 'Combo complete';
    this.elements.combo.innerHTML = `Combo next: ${next} · ${detail}`;
  }

  updateAbilityRow() {
    const abilities = this.game.player.tempAbilities;
    if (!abilities.length) {
      this.elements.abilityRow.innerHTML = '';
      return;
    }
    this.elements.abilityRow.innerHTML = abilities
      .map((a) => `<span class="ability-chip" style="border-color:${a.color}; box-shadow:0 0 12px ${a.color}55">${a.shortName}</span>`)
      .join('');
  }

  updateButtons() {
    const player = this.game.player;
    const stats = player.getStats();
    const specialReady = player.specialCooldown <= 0;
    const dashReady = player.dashCooldown <= 0;
    this.elements.specialCd.textContent = specialReady ? 'READY' : `${player.specialCooldown.toFixed(1)}s`;
    this.elements.dashCd.textContent = dashReady ? 'READY' : `${player.dashCooldown.toFixed(1)}s`;
    this.buttons.special.classList.toggle('cooling', !specialReady);
    this.buttons.dash.classList.toggle('cooling', !dashReady);

    const context = this.game.contextAction;
    if (context) {
      this.buttons.interact.classList.remove('disabled');
      this.elements.interactLabel.textContent = 'ACT';
      this.elements.interactHint.textContent = context.label.toUpperCase().slice(0, 10);
    } else {
      this.buttons.interact.classList.add('disabled');
      this.elements.interactLabel.textContent = 'ACT';
      this.elements.interactHint.textContent = this.game.mode === 'base' ? 'BUILDING' : 'NEARBY';
    }

    this.buttons.block.classList.toggle('cooling', player.blocking && this.game.time - player.blockStartTime > 0.22);
    this.buttons.heavy.classList.toggle('cooling', this.game.time <= player.comboExpire && player.comboStep === 2);
    this.buttons.light.classList.toggle('cooling', this.game.time <= player.comboExpire && player.comboStep === 1);

    this.buttons.special.title = `Crimson Spiral cooldown: ${stats.specialCooldown}s`;
  }

  drawMinimap() {
    const canvas = this.elements.minimap;
    const ctx = canvas.getContext('2d');
    const game = this.game;
    const world = game.world;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(8,4,13,0.84)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!world) return;
    const pad = 7;
    const sx = (canvas.width - pad * 2) / world.width;
    const sy = (canvas.height - pad * 2) / world.height;
    const map = (x, y) => ({ x: pad + x * sx, y: pad + y * sy });

    ctx.save();
    if (world.kind === 'hunt') {
      ctx.strokeStyle = 'rgba(255,236,199,0.18)';
      ctx.lineWidth = 2;
      for (const c of world.corridors) {
        if (c.secret && !c.b.discovered) continue;
        const a = map(c.a.x, c.a.y);
        const b = map(c.b.x, c.b.y);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      for (const room of world.rooms) {
        if (room.secret && !room.discovered) continue;
        const p = map(room.x, room.y);
        ctx.beginPath();
        ctx.arc(p.x, p.y, room.type === 'boss_grove' ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = room.type === 'boss_grove' ? '#ff315f' : room.secret ? '#ffd166' : '#61753d';
        ctx.fill();
      }
      for (const chest of world.chests) {
        if (!chest.discovered || chest.opened) continue;
        const p = map(chest.x, chest.y);
        ctx.fillStyle = chest.dangerous ? '#ff315f' : '#ffd166';
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      }
      for (const shrine of world.shrines) {
        if (shrine.used) continue;
        const p = map(shrine.x, shrine.y);
        ctx.fillStyle = '#b68cff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const exit of world.exits) {
        if (!exit.discovered) continue;
        const p = map(exit.x, exit.y);
        ctx.strokeStyle = exit.unlocked ? '#70e8ff' : '#555';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (const enemy of game.enemies) {
        if (enemy.dead || (!enemy.aggro && !enemy.boss)) continue;
        const p = map(enemy.x, enemy.y);
        ctx.fillStyle = enemy.boss ? '#ff315f' : '#ff9b54';
        ctx.beginPath();
        ctx.arc(p.x, p.y, enemy.boss ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      for (const building of world.buildings) {
        const p = map(building.x + building.w / 2, building.y + building.h / 2);
        ctx.fillStyle = building.id === 'world_map' ? '#70e8ff' : '#ffd166';
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      }
    }
    const p = map(game.player.x, game.player.y);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e52c59';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  weaponCard(weaponId, record, equipped) {
    const weapon = WEAPONS[weaponId];
    if (!weapon) return '';
    const rarity = RARITY[weapon.rarity];
    return `<div class="weapon-card ${equipped ? 'equipped' : ''}">
      <strong style="color:${rarity.color}">${weapon.name} +${record.level}</strong> ${equipped ? '<span class="pill">Equipped</span>' : ''}<br />
      <span class="pill">${rarity.label}</span><span class="pill">Damage ${weapon.baseDamage}</span><span class="pill">Bleed ×${weapon.bleedPower}</span><span class="pill">Crit ${Math.round(weapon.critChance * 100)}%</span><br />
      <small>${weapon.identity}</small>
    </div>`;
  }
}
