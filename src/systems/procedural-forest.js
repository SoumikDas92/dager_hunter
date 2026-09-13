import { BASIC_ENEMY_IDS, MINI_BOSSES } from '../data/content.js';
import { RNG, clamp, distanceToSegment, drawOutlinedText, drawRoundedRect } from '../core/utils.js';

function resolveCircleRect(entity, rect) {
  const nearestX = clamp(entity.x, rect.x, rect.x + rect.w);
  const nearestY = clamp(entity.y, rect.y, rect.y + rect.h);
  let dx = entity.x - nearestX;
  let dy = entity.y - nearestY;
  let dist = Math.hypot(dx, dy);
  if (dist > entity.radius || dist <= 0.0001) {
    if (dist > entity.radius) return;
    const left = Math.abs(entity.x - rect.x);
    const right = Math.abs(rect.x + rect.w - entity.x);
    const top = Math.abs(entity.y - rect.y);
    const bottom = Math.abs(rect.y + rect.h - entity.y);
    const min = Math.min(left, right, top, bottom);
    if (min === left) {
      dx = -1;
      dy = 0;
      dist = 0;
    } else if (min === right) {
      dx = 1;
      dy = 0;
      dist = 0;
    } else if (min === top) {
      dx = 0;
      dy = -1;
      dist = 0;
    } else {
      dx = 0;
      dy = 1;
      dist = 0;
    }
  }
  const push = entity.radius - dist + 0.01;
  const nx = dist > 0 ? dx / dist : dx;
  const ny = dist > 0 ? dy / dist : dy;
  entity.x += nx * push;
  entity.y += ny * push;
}

function resolveCircleObstacle(entity, obstacle) {
  const dx = entity.x - obstacle.x;
  const dy = entity.y - obstacle.y;
  const minDistance = entity.radius + obstacle.r;
  const dist = Math.hypot(dx, dy);
  if (dist >= minDistance || dist <= 0.0001) return;
  const push = minDistance - dist + 0.01;
  entity.x += (dx / dist) * push;
  entity.y += (dy / dist) * push;
}

export class BaseWorld {
  constructor() {
    this.kind = 'base';
    this.width = 1700;
    this.height = 1160;
    this.start = { x: 850, y: 760 };
    this.boundsPadding = 34;
    this.buildings = [
      {
        id: 'world_map',
        label: 'World Map',
        subtitle: 'Start Forest Hunt',
        x: 1220,
        y: 410,
        w: 210,
        h: 154,
        color: '#315c2b',
        roof: '#2d4030',
        icon: '✦',
        radius: 140
      },
      {
        id: 'blacksmith',
        label: 'Blacksmith',
        subtitle: 'Upgrade daggers',
        x: 365,
        y: 365,
        w: 220,
        h: 166,
        color: '#714332',
        roof: '#321a17',
        icon: '⚒',
        radius: 145
      },
      {
        id: 'armorer',
        label: 'Armorer',
        subtitle: 'Upgrade armor',
        x: 655,
        y: 250,
        w: 200,
        h: 145,
        color: '#4b5974',
        roof: '#252c3d',
        icon: '◆',
        radius: 130
      },
      {
        id: 'storage',
        label: 'Storage',
        subtitle: 'Inventory',
        x: 1068,
        y: 760,
        w: 218,
        h: 146,
        color: '#6a4c2f',
        roof: '#332416',
        icon: '▣',
        radius: 130
      },
      {
        id: 'customization',
        label: 'Wardrobe',
        subtitle: 'Cosmetics',
        x: 270,
        y: 720,
        w: 212,
        h: 142,
        color: '#603a7f',
        roof: '#301948',
        icon: '✿',
        radius: 130
      },
      {
        id: 'skill_master',
        label: 'Skill Master',
        subtitle: 'Hunter notes',
        x: 840,
        y: 132,
        w: 230,
        h: 136,
        color: '#4b306d',
        roof: '#20122f',
        icon: '☽',
        radius: 132
      },
      {
        id: 'training',
        label: 'Training Yard',
        subtitle: 'Practice parry',
        x: 690,
        y: 870,
        w: 280,
        h: 176,
        color: '#42533b',
        roof: '#293121',
        icon: '◎',
        radius: 160
      }
    ];
    this.obstacles = [
      { x: 160, y: 210, r: 46, type: 'tree' },
      { x: 250, y: 270, r: 33, type: 'tree' },
      { x: 1450, y: 230, r: 52, type: 'tree' },
      { x: 1545, y: 330, r: 38, type: 'tree' },
      { x: 125, y: 950, r: 58, type: 'tree' },
      { x: 1525, y: 940, r: 62, type: 'tree' },
      { x: 1170, y: 210, r: 31, type: 'rock' },
      { x: 530, y: 985, r: 28, type: 'rock' },
      { x: 1350, y: 735, r: 26, type: 'rock' }
    ];
  }

  getStartPosition() {
    return { ...this.start };
  }

  resolveCollision(entity) {
    entity.x = clamp(entity.x, this.boundsPadding + entity.radius, this.width - this.boundsPadding - entity.radius);
    entity.y = clamp(entity.y, this.boundsPadding + entity.radius, this.height - this.boundsPadding - entity.radius);
    for (const obstacle of this.obstacles) resolveCircleObstacle(entity, obstacle);
    for (const building of this.buildings) {
      // Leave the World Map portal walkable in the center; block only the physical buildings.
      if (building.id === 'world_map') continue;
      resolveCircleRect(entity, { x: building.x, y: building.y, w: building.w, h: building.h });
    }
  }

  nearestBuilding(player) {
    let best = null;
    let bestD = Infinity;
    for (const building of this.buildings) {
      const cx = building.x + building.w / 2;
      const cy = building.y + building.h / 2;
      const d = Math.hypot(player.x - cx, player.y - cy);
      if (d < building.radius && d < bestD) {
        best = building;
        bestD = d;
      }
    }
    return best;
  }

  draw(ctx, game) {
    ctx.save();
    ctx.fillStyle = '#294c35';
    ctx.fillRect(0, 0, this.width, this.height);

    // Comic-style boundary forest.
    for (let i = 0; i < 34; i += 1) {
      const x = (i * 137) % this.width;
      const y = i % 2 === 0 ? 50 + ((i * 53) % 140) : this.height - 80 - ((i * 47) % 150);
      this.drawTree(ctx, x, y, 36 + (i % 5) * 5, i % 3 === 0);
    }

    // Main base paths.
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#17101f';
    ctx.lineWidth = 78;
    ctx.beginPath();
    ctx.moveTo(this.start.x, this.start.y);
    for (const b of this.buildings) {
      ctx.moveTo(this.start.x, this.start.y);
      ctx.lineTo(b.x + b.w / 2, b.y + b.h / 2);
    }
    ctx.stroke();
    ctx.strokeStyle = '#8b7645';
    ctx.lineWidth = 58;
    ctx.stroke();
    ctx.strokeStyle = '#b9965a';
    ctx.lineWidth = 5;
    ctx.setLineDash([18, 18]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Training ring.
    ctx.save();
    ctx.strokeStyle = '#ffecc7';
    ctx.fillStyle = 'rgba(255, 209, 102, 0.08)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(830, 972, 174, 96, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    drawOutlinedText(ctx, 'TRAINING', 830, 973, { size: 18, color: '#ffecc7' });
    ctx.restore();

    // Buildings.
    for (const building of this.buildings) this.drawBuilding(ctx, building, game);

    // Obstacles after paths for silhouettes.
    for (const obstacle of this.obstacles) {
      if (obstacle.type === 'tree') this.drawTree(ctx, obstacle.x, obstacle.y, obstacle.r, true);
      else this.drawRock(ctx, obstacle.x, obstacle.y, obstacle.r);
    }

    drawOutlinedText(ctx, 'Blood Hunter Base', this.start.x, this.start.y - 82, { size: 24, color: '#ffd166' });
    drawOutlinedText(ctx, 'Something is corrupting the world. Hunt monsters and discover why.', this.start.x, this.start.y - 52, {
      size: 13,
      color: '#ffecc7',
      width: 4
    });
    ctx.restore();
  }

  drawBuilding(ctx, building, game) {
    const cx = building.x + building.w / 2;
    const cy = building.y + building.h / 2;
    const active = Math.hypot(game.player.x - cx, game.player.y - cy) < building.radius;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.38)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = active ? 'rgba(255,209,102,0.18)' : 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.ellipse(cx, building.y + building.h + 16, building.w * 0.6, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    drawRoundedRect(ctx, building.x, building.y + 35, building.w, building.h - 35, 16);
    ctx.fillStyle = building.color;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#0a0610';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(building.x - 18, building.y + 44);
    ctx.lineTo(cx, building.y - 14);
    ctx.lineTo(building.x + building.w + 18, building.y + 44);
    ctx.closePath();
    ctx.fillStyle = building.roof;
    ctx.fill();
    ctx.strokeStyle = '#0a0610';
    ctx.lineWidth = 6;
    ctx.stroke();

    if (building.id === 'world_map') {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = active ? '#ffd166' : '#70e8ff';
      ctx.lineWidth = active ? 8 : 5;
      ctx.beginPath();
      ctx.arc(cx, cy, 66 + Math.sin(game.time * 3) * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(112,232,255,0.22)';
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = '#ffecc7';
    ctx.strokeStyle = '#08040d';
    ctx.lineWidth = 5;
    ctx.font = '900 36px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(building.icon, cx, building.y + building.h / 2 + 20);
    ctx.fillText(building.icon, cx, building.y + building.h / 2 + 20);

    drawOutlinedText(ctx, building.label, cx, building.y + building.h + 32, {
      size: active ? 17 : 15,
      color: active ? '#ffd166' : '#ffecc7'
    });
    drawOutlinedText(ctx, building.subtitle, cx, building.y + building.h + 53, { size: 11, color: '#cbb7d9', width: 3 });
    ctx.restore();
  }

  drawTree(ctx, x, y, r, dark = false) {
    ctx.save();
    ctx.fillStyle = '#15100d';
    ctx.beginPath();
    ctx.roundRect?.(x - r * 0.15, y + r * 0.1, r * 0.3, r * 0.92, 8);
    if (!ctx.roundRect) drawRoundedRect(ctx, x - r * 0.15, y + r * 0.1, r * 0.3, r * 0.92, 8);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.88, r * 0.72, 0, 0, Math.PI * 2);
    ctx.fillStyle = dark ? '#1f5736' : '#2f7d48';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#0a0610';
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x - r * 0.22, y - r * 0.17, r * 0.32, r * 0.23, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = dark ? '#2d7444' : '#54a75d';
    ctx.fill();
    ctx.restore();
  }

  drawRock(ctx, x, y, r) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - r, y + r * 0.25);
    ctx.lineTo(x - r * 0.45, y - r * 0.7);
    ctx.lineTo(x + r * 0.42, y - r * 0.82);
    ctx.lineTo(x + r, y + r * 0.12);
    ctx.lineTo(x + r * 0.32, y + r * 0.78);
    ctx.closePath();
    ctx.fillStyle = '#6e7180';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#0a0610';
    ctx.stroke();
    ctx.restore();
  }
}

export class ProceduralForest {
  constructor(seed = Date.now()) {
    this.kind = 'hunt';
    this.seed = seed;
    this.rng = new RNG(seed);
    this.width = 2700;
    this.height = 1900;
    this.boundsPadding = 26;
    this.rooms = [];
    this.corridors = [];
    this.obstacles = [];
    this.chests = [];
    this.shrines = [];
    this.exits = [];
    this.enemySpawns = [];
    this.miniBossId = null;
    this.generate();
  }

  getStartPosition() {
    return { x: this.start.x, y: this.start.y };
  }

  generate() {
    const rng = this.rng;
    const roomTypes = ['clearing', 'river', 'ruins', 'cave', 'mushroom_grove', 'fallen_tower'];
    const pathRooms = [];
    let y = rng.range(this.height * 0.35, this.height * 0.65);
    const count = 8;
    for (let i = 0; i < count; i += 1) {
      y = clamp(y + rng.range(-210, 210), 245, this.height - 245);
      const room = {
        id: `path-${i}`,
        x: 250 + i * 310 + rng.range(-44, 44),
        y,
        w: rng.range(230, 335) + i * 8,
        h: rng.range(175, 280),
        type: i === 0 ? 'hunter_camp' : i === count - 1 ? 'boss_grove' : rng.pick(roomTypes),
        criticalPath: true,
        secret: false,
        discovered: i === 0,
        danger: i / (count - 1)
      };
      pathRooms.push(room);
      this.rooms.push(room);
      if (i > 0) this.corridors.push({ a: pathRooms[i - 1], b: room, width: rng.range(100, 148) });
    }

    this.start = { x: pathRooms[0].x - 52, y: pathRooms[0].y };
    this.bossRoom = pathRooms[pathRooms.length - 1];
    this.boss = { x: this.bossRoom.x + 26, y: this.bossRoom.y };

    // Secret branches: visible if explored, always connected to avoid impossible layouts.
    const branchSourceIndexes = rng.shuffle([2, 3, 4, 5, 6]).slice(0, 3);
    for (const [branchIndex, sourceIndex] of branchSourceIndexes.entries()) {
      const source = pathRooms[sourceIndex];
      const sign = rng.chance(0.5) ? -1 : 1;
      const room = {
        id: `secret-${branchIndex}`,
        x: clamp(source.x + rng.range(-80, 150), 230, this.width - 230),
        y: clamp(source.y + sign * rng.range(285, 395), 230, this.height - 230),
        w: rng.range(210, 285),
        h: rng.range(160, 235),
        type: rng.pick(['hidden_cache', 'cave', 'ruins', 'shrine_grove']),
        criticalPath: false,
        secret: true,
        discovered: false,
        danger: sourceIndex / (count - 1) + 0.15
      };
      this.rooms.push(room);
      this.corridors.push({ a: source, b: room, width: rng.range(66, 92), secret: true });
    }

    this.generateInteractables();
    this.generateEnemySpawns();
    this.generateObstacles();
  }

  generateInteractables() {
    const rng = this.rng;
    for (const room of this.rooms) {
      if (room.type === 'hunter_camp' || room.type === 'boss_grove') continue;
      if (room.secret || rng.chance(0.54)) {
        this.chests.push({
          id: `chest-${this.chests.length}`,
          x: room.x + rng.range(-room.w * 0.26, room.w * 0.26),
          y: room.y + rng.range(-room.h * 0.25, room.h * 0.25),
          opened: false,
          hidden: room.secret || rng.chance(0.2),
          discovered: !room.secret && !rng.chance(0.2),
          dangerous: room.secret || rng.chance(0.18),
          roomId: room.id
        });
      }
      if (!room.secret && rng.chance(0.28)) {
        this.shrines.push({
          id: `shrine-${this.shrines.length}`,
          x: room.x + rng.range(-room.w * 0.22, room.w * 0.22),
          y: room.y + rng.range(-room.h * 0.22, room.h * 0.22),
          used: false,
          roomId: room.id
        });
      }
    }
    // Ensure at least one temporary ability source per hunt.
    if (!this.shrines.length) {
      const room = this.rooms.find((r) => r.id === 'path-3') ?? this.rooms[2];
      this.shrines.push({ id: 'shrine-guaranteed', x: room.x, y: room.y - room.h * 0.24, used: false, roomId: room.id });
    }

    this.exits.push({
      id: 'entry_exit',
      label: 'Return to Base',
      x: this.start.x - 42,
      y: this.start.y,
      r: 45,
      unlocked: true,
      discovered: true
    });
    this.exits.push({
      id: 'boss_exit',
      label: 'Escape Portal',
      x: this.boss.x + 105,
      y: this.boss.y,
      r: 50,
      unlocked: false,
      discovered: false
    });
  }

  generateEnemySpawns() {
    const rng = this.rng;
    const basicWeightsByDepth = (depth) => [
      { value: 'wolf', weight: 5 - depth * 1.5 },
      { value: 'goblin', weight: 4.4 },
      { value: 'goblin_archer', weight: 1.1 + depth * 2.2 },
      { value: 'mage', weight: Math.max(0.2, depth * 2.1) },
      { value: 'brute', weight: Math.max(0.15, depth * 1.7) }
    ];

    for (const room of this.rooms) {
      if (room.type === 'hunter_camp') continue;
      if (room.type === 'boss_grove') continue;
      const depth = clamp(room.danger ?? 0.2, 0, 1);
      let count = room.secret ? rng.int(2, 4) : rng.int(1, 2 + Math.floor(depth * 3));
      if (room.secret) count += 1;
      for (let i = 0; i < count; i += 1) {
        const type = rng.weighted(basicWeightsByDepth(depth));
        this.enemySpawns.push({
          type,
          x: room.x + rng.range(-room.w * 0.32, room.w * 0.32),
          y: room.y + rng.range(-room.h * 0.32, room.h * 0.32),
          roomId: room.id,
          patrolRadius: Math.max(room.w, room.h) * 0.36
        });
      }
      if (room.secret && rng.chance(0.65)) {
        this.enemySpawns.push({
          type: rng.pick(['brute', 'mage']),
          x: room.x + rng.range(-room.w * 0.2, room.w * 0.2),
          y: room.y + rng.range(-room.h * 0.2, room.h * 0.2),
          roomId: room.id,
          patrolRadius: 120
        });
      }
    }

    this.miniBossId = rng.pick(Object.keys(MINI_BOSSES));
    this.enemySpawns.push({
      type: this.miniBossId,
      boss: true,
      x: this.boss.x,
      y: this.boss.y,
      roomId: this.bossRoom.id,
      patrolRadius: 220
    });
  }

  generateObstacles() {
    const rng = this.rng;
    const isSafe = (x, y, r) => {
      if (Math.hypot(x - this.start.x, y - this.start.y) < 150 + r) return false;
      for (const room of this.rooms) {
        const nx = Math.abs(x - room.x) / (room.w * 0.5 + r);
        const ny = Math.abs(y - room.y) / (room.h * 0.5 + r);
        // Keep inner encounter spaces mostly clear.
        if (nx * nx + ny * ny < 0.88) return false;
      }
      for (const c of this.corridors) {
        if (distanceToSegment(x, y, c.a.x, c.a.y, c.b.x, c.b.y) < c.width * 0.55 + r) return false;
      }
      return true;
    };

    let attempts = 0;
    while (this.obstacles.length < 210 && attempts < 2000) {
      attempts += 1;
      const x = rng.range(60, this.width - 60);
      const y = rng.range(60, this.height - 60);
      const r = rng.range(16, 42);
      if (isSafe(x, y, r)) {
        this.obstacles.push({ x, y, r, type: rng.chance(0.78) ? 'tree' : 'rock', hue: rng.range(-12, 12) });
      }
    }
  }

  markDiscovered(player, game) {
    for (const room of this.rooms) {
      if (room.discovered) continue;
      const nx = Math.abs(player.x - room.x) / (room.w * 0.62);
      const ny = Math.abs(player.y - room.y) / (room.h * 0.62);
      if (nx * nx + ny * ny < 1) {
        room.discovered = true;
        if (room.secret) {
          game.save.data.player.stats.secretsFound += 1;
          game.notify('Secret path discovered!', 'good');
        }
      }
    }
    for (const chest of this.chests) {
      if (!chest.discovered && Math.hypot(player.x - chest.x, player.y - chest.y) < 120) {
        chest.discovered = true;
        game.notify(chest.dangerous ? 'Dangerous hidden chest found!' : 'Hidden chest found!', chest.dangerous ? 'danger' : 'good');
      }
    }
  }

  unlockBossExit() {
    const exit = this.exits.find((e) => e.id === 'boss_exit');
    if (exit) {
      exit.unlocked = true;
      exit.discovered = true;
    }
  }

  resolveCollision(entity) {
    entity.x = clamp(entity.x, this.boundsPadding + entity.radius, this.width - this.boundsPadding - entity.radius);
    entity.y = clamp(entity.y, this.boundsPadding + entity.radius, this.height - this.boundsPadding - entity.radius);
    for (const obstacle of this.obstacles) resolveCircleObstacle(entity, obstacle);
  }

  nearestInteractive(player) {
    let best = null;
    let bestDistance = Infinity;
    for (const chest of this.chests) {
      if (chest.opened || !chest.discovered) continue;
      const d = Math.hypot(player.x - chest.x, player.y - chest.y);
      if (d < 82 && d < bestDistance) {
        best = { type: 'chest', label: chest.dangerous ? 'Open Risk Chest' : 'Open Chest', target: chest };
        bestDistance = d;
      }
    }
    for (const shrine of this.shrines) {
      if (shrine.used) continue;
      const d = Math.hypot(player.x - shrine.x, player.y - shrine.y);
      if (d < 90 && d < bestDistance) {
        best = { type: 'shrine', label: 'Choose Ability', target: shrine };
        bestDistance = d;
      }
    }
    for (const exit of this.exits) {
      if (!exit.unlocked || !exit.discovered) continue;
      const d = Math.hypot(player.x - exit.x, player.y - exit.y);
      if (d < exit.r + 42 && d < bestDistance) {
        best = { type: 'exit', label: exit.label, target: exit };
        bestDistance = d;
      }
    }
    return best;
  }

  draw(ctx, game) {
    ctx.save();
    ctx.fillStyle = '#1d3d2a';
    ctx.fillRect(0, 0, this.width, this.height);

    // Outer comic forest silhouettes.
    ctx.fillStyle = '#132719';
    ctx.fillRect(0, 0, this.width, 50);
    ctx.fillRect(0, this.height - 50, this.width, 50);
    ctx.fillRect(0, 0, 50, this.height);
    ctx.fillRect(this.width - 50, 0, 50, this.height);

    // Corridors first.
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const corridor of this.corridors) {
      const alpha = corridor.secret && !corridor.b.discovered ? 0.42 : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#0b0711';
      ctx.lineWidth = corridor.width + 14;
      ctx.beginPath();
      ctx.moveTo(corridor.a.x, corridor.a.y);
      const midX = (corridor.a.x + corridor.b.x) / 2;
      ctx.quadraticCurveTo(midX, corridor.a.y, corridor.b.x, corridor.b.y);
      ctx.stroke();
      ctx.strokeStyle = corridor.secret ? '#536a36' : '#6b7642';
      ctx.lineWidth = corridor.width;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 236, 199, 0.13)';
      ctx.lineWidth = 3;
      ctx.setLineDash([20, 24]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    for (const room of this.rooms) this.drawRoom(ctx, room, game);

    // Environmental obstacles.
    for (const obstacle of this.obstacles) {
      if (obstacle.type === 'tree') this.drawTree(ctx, obstacle.x, obstacle.y, obstacle.r, obstacle.hue);
      else this.drawRock(ctx, obstacle.x, obstacle.y, obstacle.r);
    }

    for (const exit of this.exits) this.drawExit(ctx, exit, game.time);
    for (const shrine of this.shrines) this.drawShrine(ctx, shrine, game.time);
    for (const chest of this.chests) this.drawChest(ctx, chest, game.time);
    ctx.restore();
  }

  drawRoom(ctx, room, game) {
    const hidden = room.secret && !room.discovered;
    ctx.save();
    ctx.globalAlpha = hidden ? 0.44 : 1;
    ctx.beginPath();
    ctx.ellipse(room.x, room.y, room.w * 0.52, room.h * 0.52, 0, 0, Math.PI * 2);
    ctx.fillStyle = room.type === 'boss_grove' ? '#42344c' : room.secret ? '#4a5b35' : '#61753d';
    ctx.fill();
    ctx.lineWidth = room.secret ? 5 : 3;
    ctx.strokeStyle = room.secret ? '#ffe066' : 'rgba(15, 8, 18, 0.7)';
    ctx.stroke();

    if (room.type === 'river') {
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = '#19334f';
      ctx.lineWidth = 54;
      ctx.beginPath();
      ctx.moveTo(room.x - room.w * 0.55, room.y + room.h * 0.1);
      ctx.bezierCurveTo(room.x - 40, room.y - room.h * 0.4, room.x + 30, room.y + room.h * 0.45, room.x + room.w * 0.6, room.y - room.h * 0.12);
      ctx.stroke();
      ctx.strokeStyle = '#50b6d8';
      ctx.lineWidth = 38;
      ctx.stroke();
      ctx.restore();
    }

    if (room.type === 'ruins' || room.type === 'fallen_tower') {
      ctx.fillStyle = '#7d807d';
      ctx.strokeStyle = '#0a0610';
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i += 1) {
        const x = room.x - room.w * 0.28 + i * room.w * 0.18;
        const y = room.y + (i % 2 ? -room.h * 0.22 : room.h * 0.18);
        drawRoundedRect(ctx, x, y, 45, 28, 7);
        ctx.fill();
        ctx.stroke();
      }
    }

    if (room.type === 'cave' || room.type === 'hidden_cache') {
      ctx.beginPath();
      ctx.ellipse(room.x + room.w * 0.18, room.y - room.h * 0.1, 45, 34, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#15111d';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#0a0610';
      ctx.stroke();
    }

    if (room.type === 'mushroom_grove' || room.type === 'shrine_grove') {
      for (let i = 0; i < 7; i += 1) {
        const a = (i / 7) * Math.PI * 2;
        const x = room.x + Math.cos(a) * room.w * 0.28;
        const y = room.y + Math.sin(a) * room.h * 0.24;
        ctx.beginPath();
        ctx.ellipse(x, y, 10, 7, 0, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 ? '#b68cff' : '#ff6b91';
        ctx.fill();
        ctx.strokeStyle = '#0a0610';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    if (room.type === 'boss_grove') {
      ctx.save();
      ctx.strokeStyle = `rgba(229,44,89,${0.25 + Math.sin(game.time * 3) * 0.08})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(room.x, room.y, room.w * 0.38, room.h * 0.38, 0, 0, Math.PI * 2);
      ctx.stroke();
      drawOutlinedText(ctx, 'MINI-BOSS GROVE', room.x, room.y - room.h * 0.45, { size: 14, color: '#ff9bb0' });
      ctx.restore();
    }

    if (room.secret && room.discovered) {
      drawOutlinedText(ctx, 'SECRET', room.x, room.y - room.h * 0.42, { size: 12, color: '#ffd166', width: 4 });
    }
    ctx.restore();
  }

  drawExit(ctx, exit, time) {
    if (!exit.discovered) return;
    ctx.save();
    ctx.globalAlpha = exit.unlocked ? 1 : 0.22;
    const pulse = Math.sin(time * 4) * 4;
    ctx.beginPath();
    ctx.arc(exit.x, exit.y, exit.r + pulse, 0, Math.PI * 2);
    ctx.strokeStyle = exit.id === 'entry_exit' ? '#70e8ff' : '#ffd166';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(exit.x, exit.y, exit.r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = exit.id === 'entry_exit' ? 'rgba(112,232,255,0.18)' : 'rgba(255,209,102,0.22)';
    ctx.fill();
    drawOutlinedText(ctx, exit.label, exit.x, exit.y + exit.r + 24, { size: 12, color: '#ffecc7', width: 4 });
    ctx.restore();
  }

  drawShrine(ctx, shrine, time) {
    if (shrine.used) return;
    ctx.save();
    ctx.translate(shrine.x, shrine.y);
    ctx.strokeStyle = '#0a0610';
    ctx.lineWidth = 4;
    ctx.fillStyle = '#4b306d';
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(24, 18);
    ctx.lineTo(-24, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -5, 8 + Math.sin(time * 5) * 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd166';
    ctx.fill();
    drawOutlinedText(ctx, 'Shrine', 0, 44, { size: 12, color: '#ffecc7', width: 3 });
    ctx.restore();
  }

  drawChest(ctx, chest, time) {
    if (!chest.discovered || chest.opened) return;
    ctx.save();
    ctx.translate(chest.x, chest.y);
    ctx.globalAlpha = chest.hidden ? 0.9 : 1;
    const glow = chest.dangerous ? '#ff315f' : '#ffd166';
    ctx.shadowColor = glow;
    ctx.shadowBlur = 10 + Math.sin(time * 4) * 4;
    ctx.fillStyle = chest.dangerous ? '#7e1233' : '#8a5a20';
    drawRoundedRect(ctx, -24, -16, 48, 32, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#0a0610';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(-4, -16, 8, 32);
    ctx.fillRect(-22, -2, 44, 8);
    drawOutlinedText(ctx, chest.dangerous ? 'Risk' : 'Chest', 0, 38, { size: 11, color: chest.dangerous ? '#ff9bb0' : '#ffecc7', width: 3 });
    ctx.restore();
  }

  drawTree(ctx, x, y, r, hue = 0) {
    ctx.save();
    ctx.fillStyle = '#17100e';
    drawRoundedRect(ctx, x - r * 0.13, y + r * 0.18, r * 0.26, r * 0.8, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.75, 0, 0, Math.PI * 2);
    ctx.fillStyle = hue > 0 ? '#315f3c' : '#244f34';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#0a0610';
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x - r * 0.2, y - r * 0.15, r * 0.35, r * 0.23, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = hue > 0 ? '#438a50' : '#337542';
    ctx.fill();
    ctx.restore();
  }

  drawRock(ctx, x, y, r) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - r, y + r * 0.12);
    ctx.lineTo(x - r * 0.42, y - r * 0.8);
    ctx.lineTo(x + r * 0.5, y - r * 0.65);
    ctx.lineTo(x + r, y + r * 0.24);
    ctx.lineTo(x + r * 0.28, y + r * 0.8);
    ctx.closePath();
    ctx.fillStyle = '#59616b';
    ctx.fill();
    ctx.strokeStyle = '#0a0610';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
}

export { BASIC_ENEMY_IDS };
