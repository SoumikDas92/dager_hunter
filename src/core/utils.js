export const TAU = Math.PI * 2;

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function inverseLerp(a, b, v) {
  if (a === b) return 0;
  return clamp((v - a) / (b - a), 0, 1);
}

export function smoothstep(t) {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function distanceSq(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function angleTo(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export function angleDiff(a, b) {
  let d = ((a - b + Math.PI) % TAU) - Math.PI;
  if (d < -Math.PI) d += TAU;
  return d;
}

export function normalize(x, y) {
  const len = Math.hypot(x, y);
  if (len <= 0.0001) return { x: 0, y: 0, len: 0 };
  return { x: x / len, y: y / len, len };
}

export function pointInRect(p, r) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

export function circleRectOverlap(cx, cy, cr, rect) {
  const nearestX = clamp(cx, rect.x, rect.x + rect.w);
  const nearestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy <= cr * cr;
}

export function distanceToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(px - ax, py - ay);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(px - bx, py - by);
  const t = c1 / c2;
  const projX = ax + t * vx;
  const projY = ay + t * vy;
  return Math.hypot(px - projX, py - projY);
}

export function lineCircleDistance(ax, ay, bx, by, cx, cy) {
  return distanceToSegment(cx, cy, ax, ay, bx, by);
}

export function rgba(hex, alpha) {
  const value = hex.replace('#', '');
  const bigint = Number.parseInt(value.length === 3 ? value.split('').map((v) => v + v).join('') : value, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function formatResources(resources, names = {}) {
  const entries = Object.entries(resources || {}).filter(([, qty]) => qty > 0);
  if (!entries.length) return 'none';
  return entries
    .map(([id, qty]) => `${names[id] || id.replace(/_/g, ' ')} ×${qty}`)
    .join(', ');
}

export function hashString(input) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class RNG {
  constructor(seed = Date.now()) {
    this.seed = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
    if (this.seed === 0) this.seed = 0x9e3779b9;
  }

  next() {
    // Mulberry32: tiny, deterministic, good enough for procedural MVP layouts.
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min, max) {
    return min + (max - min) * this.next();
  }

  int(min, maxInclusive) {
    return Math.floor(this.range(min, maxInclusive + 1));
  }

  chance(probability) {
    return this.next() < probability;
  }

  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }

  shuffle(list) {
    const result = [...list];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  weighted(entries) {
    const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = this.range(0, total);
    for (const entry of entries) {
      roll -= entry.weight;
      if (roll <= 0) return entry.value;
    }
    return entries.length ? entries[entries.length - 1].value : undefined;
  }
}

export function drawOutlinedText(ctx, text, x, y, options = {}) {
  const {
    align = 'center',
    color = '#ffecc7',
    outline = '#08040d',
    size = 16,
    font = '900 16px system-ui',
    width = 5
  } = options;
  ctx.save();
  ctx.font = font.replace('16px', `${size}px`);
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = outline;
  ctx.fillStyle = color;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
