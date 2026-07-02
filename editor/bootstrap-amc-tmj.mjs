#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { applyStoryWorldLayout, createStoryExtraMaps } from './story-world-layout.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const WORLD_W = 2600;
const WORLD_H = 2000;
const TILE = 32;
const GAP = 320;
const output = path.resolve(repoRoot, process.argv[2] || 'editor/AMC.tmj');
const AREA_PLANNING_ONLY = true;
const FACILITY_LABELS = {
  equip: '装備屋',
  smith: '鍛冶屋',
  rune: 'ルーン屋',
  jewel: '宝飾屋',
  alchemy: '錬金屋',
  bank: '銀行',
  market: 'マーケット',
  church: '教会',
  guild: '冒険者ギルド'
};

function genDecos(seed, count) {
  const d = [];
  let s = seed;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = 0; i < count; i++) {
    const x = rnd() * WORLD_W;
    const y = rnd() * WORLD_H;
    if (Math.hypot(x - WORLD_W / 2, y - WORLD_H / 2) < 150) continue;
    d.push({ x, y, t: rnd() });
  }
  return d;
}

function loadMaps() {
  const code = fs.readFileSync(path.resolve(repoRoot, 'maps.js'), 'utf8');
  const sandbox = { window: {}, console };
  vm.runInNewContext(code, sandbox, { filename: 'maps.js' });
  return sandbox.window.AMC_MAPS({ WORLD_W, WORLD_H, genDecos });
}

function loadTownNpcData() {
  const code = fs.readFileSync(path.resolve(repoRoot, 'index.html'), 'utf8');
  const match = code.match(/const TOWN_NPC_DATA=([\s\S]*?);\s*const NPC_RUNE_POOL=/);
  if (!match) return {};
  const sandbox = {};
  vm.runInNewContext(`data=${match[1]}`, sandbox, { filename: 'index.html:TOWN_NPC_DATA' });
  return sandbox.data || {};
}

function avoidOverlap(r, rects) {
  let out = { ...r };
  let guard = 0;
  while ([...rects.values()].some(o => overlaps(out, o)) && guard++ < 40) {
    out.x += (guard % 2 ? WORLD_W + GAP : 0);
    out.y += (guard % 2 ? 0 : WORLD_H + GAP);
  }
  return out;
}

function prop(name, value, type) {
  if (value === undefined || value === null || value === '') return null;
  const t = type || (typeof value === 'number' ? 'float' : typeof value === 'boolean' ? 'bool' : 'string');
  return { name, type: t, value };
}

function props(entries) {
  return entries.map(e => prop(...e)).filter(Boolean);
}

let nextLayerId = 1;
let nextObjectId = 1;

function objectLayer(name, objects) {
  return {
    id: nextLayerId++,
    name,
    type: 'objectgroup',
    visible: true,
    opacity: 1,
    draworder: 'topdown',
    x: 0,
    y: 0,
    objects
  };
}

function tileLayer(name, width, height, infinite = false) {
  if (infinite) {
    return {
      id: nextLayerId++,
      name,
      type: 'tilelayer',
      visible: true,
      opacity: 1,
      x: 0,
      y: 0,
      width,
      height,
      chunks: []
    };
  }

  return {
    id: nextLayerId++,
    name,
    type: 'tilelayer',
    visible: true,
    opacity: 1,
    x: 0,
    y: 0,
    width,
    height,
    data: Array(width * height).fill(0)
  };
}

function rectObject({ name, type, x, y, w, h, properties }) {
  return {
    id: nextObjectId++,
    name: name || '',
    type: type || '',
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(w),
    height: Math.round(h),
    rotation: 0,
    visible: true,
    properties: properties || []
  };
}

function ellipseObject({ name, type, x, y, w, h, properties }) {
  return {
    id: nextObjectId++,
    name: name || '',
    type: type || '',
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(w),
    height: Math.round(h),
    rotation: 0,
    visible: true,
    ellipse: true,
    properties: properties || []
  };
}

function polygonObject({ name, type, x, y, points, properties }) {
  return {
    id: nextObjectId++,
    name: name || '',
    type: type || '',
    x: Math.round(x),
    y: Math.round(y),
    width: 0,
    height: 0,
    rotation: 0,
    visible: true,
    polygon: points.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) })),
    properties: properties || []
  };
}

function polygonObjectFromAbsolute({ name, type, points, properties }) {
  const minX = Math.min(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  return polygonObject({
    name,
    type,
    x: minX,
    y: minY,
    points: points.map(p => ({ x: p.x - minX, y: p.y - minY })),
    properties
  });
}

function pointObject({ name, type, x, y, properties }) {
  return {
    id: nextObjectId++,
    name: name || '',
    type: type || '',
    x: Math.round(x),
    y: Math.round(y),
    width: 0,
    height: 0,
    rotation: 0,
    visible: true,
    point: true,
    properties: properties || []
  };
}

function mapKind(m) {
  if (m.town) return 'town';
  if (m.bossDef) return 'dungeon';
  return 'field';
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function organicPolygon(r, id, kind = 'field', scale = 1) {
  const seed = hashString(id);
  if (['field', 'road'].includes(kind) && seed % 11 === 0) {
    return [
      { x: r.w * 0.5, y: r.h * 0.06 },
      { x: r.w * 0.94, y: r.h * 0.86 },
      { x: r.w * 0.08, y: r.h * 0.74 }
    ];
  }
  if (['field', 'road'].includes(kind) && seed % 7 === 0) {
    return [
      { x: r.w * 0.12, y: r.h * 0.18 },
      { x: r.w * 0.9, y: r.h * 0.1 },
      { x: r.w * 0.82, y: r.h * 0.84 },
      { x: r.w * 0.18, y: r.h * 0.92 }
    ];
  }
  if (['field', 'dungeon'].includes(kind) && seed % 5 === 0) {
    const points = [];
    const steps = 8 + (seed % 3) * 2;
    for (let i = 0; i < steps; i++) {
      const angle = (Math.PI * 2 * i) / steps;
      const radius = i % 2 === 0 ? 0.52 : 0.32;
      points.push({
        x: r.w * 0.5 + Math.cos(angle) * r.w * radius,
        y: r.h * 0.5 + Math.sin(angle) * r.h * radius
      });
    }
    return points;
  }
  if (['field', 'road'].includes(kind) && seed % 13 === 0) {
    return [
      { x: r.w * 0.04, y: r.h * 0.48 },
      { x: r.w * 0.38, y: r.h * 0.16 },
      { x: r.w * 0.96, y: r.h * 0.5 },
      { x: r.w * 0.4, y: r.h * 0.9 }
    ];
  }

  const steps = 5 + (seed % 10);
  const cx = r.w / 2;
  const cy = r.h / 2;
  const rx = r.w * 0.5 * scale;
  const ry = r.h * 0.5 * scale;
  const points = [];
  for (let i = 0; i < steps; i++) {
    const base = (Math.PI * 2 * i) / steps;
    const jitter = (((seed >>> ((i % 8) * 4)) & 15) - 7.5) * 0.032;
    const radius = 0.74 + (((seed >>> ((i % 6) * 5)) & 31) / 31) * 0.24;
    points.push({
      x: cx + Math.cos(base + jitter) * rx * radius,
      y: cy + Math.sin(base + jitter) * ry * radius
    });
  }
  return points;
}

function areaLayerName(kind) {
  if (kind === 'town' || kind === 'village' || kind === 'camp' || kind === 'jail') return 'Areas_Towns';
  if (kind === 'dungeon') return 'Areas_Dungeons';
  if (kind === 'road') return 'Areas_Routes';
  return 'Areas_Fields';
}

function clipPolygon(poly, a, b, c) {
  const out = [];
  const inside = p => a * p.x + b * p.y <= c + 0.001;
  const intersect = (p, q) => {
    const pv = a * p.x + b * p.y - c;
    const qv = a * q.x + b * q.y - c;
    const t = pv / (pv - qv || 1);
    return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
  };

  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const prev = poly[(i + poly.length - 1) % poly.length];
    const curIn = inside(cur);
    const prevIn = inside(prev);
    if (curIn) {
      if (!prevIn) out.push(intersect(prev, cur));
      out.push(cur);
    } else if (prevIn) {
      out.push(intersect(prev, cur));
    }
  }
  return out;
}

function simplifyPolygon(poly) {
  const rounded = poly.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));
  const deduped = [];
  for (const p of rounded) {
    const last = deduped[deduped.length - 1];
    if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 2) deduped.push(p);
  }
  if (deduped.length > 1) {
    const first = deduped[0];
    const last = deduped[deduped.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) <= 2) deduped.pop();
  }
  const cleaned = [];
  for (let i = 0; i < deduped.length; i++) {
    const a = deduped[(i + deduped.length - 1) % deduped.length];
    const b = deduped[i];
    const c = deduped[(i + 1) % deduped.length];
    const area = Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
    if (area > 4) cleaned.push(b);
  }
  return cleaned.length >= 3 ? cleaned : rounded.slice(0, 3);
}

function absolutePolygonBounds(poly) {
  const xs = poly.map(p => p.x);
  const ys = poly.map(p => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

function absolutePolygonCenter(poly) {
  const b = absolutePolygonBounds(poly);
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

function buildPartitionCells(rects) {
  const entries = [...rects.entries()].map(([id, r]) => ({
    id,
    r,
    x: r.x + r.w / 2,
    y: r.y + r.h / 2
  }));
  const minX = Math.min(...entries.map(e => e.x)) - 1600;
  const minY = Math.min(...entries.map(e => e.y)) - 1600;
  const maxX = Math.max(...entries.map(e => e.x)) + 1600;
  const maxY = Math.max(...entries.map(e => e.y)) + 1600;
  const bounds = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY }
  ];
  const cells = new Map();

  for (const p of entries) {
    let poly = bounds.slice();
    for (const q of entries) {
      if (p === q) continue;
      const a = 2 * (q.x - p.x);
      const b = 2 * (q.y - p.y);
      const c = q.x * q.x + q.y * q.y - p.x * p.x - p.y * p.y;
      poly = clipPolygon(poly, a, b, c);
      if (poly.length < 3) break;
    }
    cells.set(p.id, simplifyPolygon(poly));
  }
  return cells;
}

function seededNumber(id, salt = '') {
  return hashString(`${id}:${salt}`);
}

function chooseSpawnMonster(id, m, biome) {
  const pool = (m.enemies && m.enemies.length ? m.enemies : []).filter(Boolean);
  if (!pool.length) return null;
  return pool[seededNumber(id, biome) % pool.length];
}

function spawnZoneShape(id, kind, biome) {
  if (kind === 'dungeon') return 'rect';
  if (biome === 'lake' || biome === 'marsh' || biome === 'river') return 'circle';
  return seededNumber(id, 'shape') % 3 === 0 ? 'circle' : 'rect';
}

function spawnZoneStats(kind, level) {
  const dungeon = kind === 'dungeon';
  const route = kind === 'road';
  return {
    maxAlive: dungeon ? 4 : route ? 2 : Math.max(2, Math.min(5, 2 + Math.floor(level / 28))),
    spawnIntervalMin: dungeon ? 0 : 8,
    spawnIntervalMax: dungeon ? 0 : 20,
    respawn: !dungeon,
    rareChance: dungeon ? 0.04 : route ? 0.015 : 0.025,
    eliteChance: dungeon ? 0.006 : route ? 0.0015 : 0.003
  };
}

function buildSpawnZone(id, m, r, cell, kind) {
  if (kind === 'town' || kind === 'village' || kind === 'camp' || kind === 'jail') return null;
  const biome = r.biome || m.deco || 'plains';
  const monster = chooseSpawnMonster(id, m, biome);
  if (!monster) return null;

  const level = Math.max(1, (m.mlv || 0) + 1);
  const bounds = absolutePolygonBounds(cell);
  const center = absolutePolygonCenter(cell);
  const seed = seededNumber(id, 'spawn');
  const jitterX = ((seed & 255) / 255 - 0.5) * Math.min(260, bounds.w * 0.08);
  const jitterY = (((seed >>> 8) & 255) / 255 - 0.5) * Math.min(260, bounds.h * 0.08);
  const cx = Math.max(bounds.x + 80, Math.min(bounds.x + bounds.w - 80, center.x + jitterX));
  const cy = Math.max(bounds.y + 80, Math.min(bounds.y + bounds.h - 80, center.y + jitterY));
  const shape = spawnZoneShape(id, kind, biome);
  const size = Math.max(280, Math.min(1400, Math.min(bounds.w, bounds.h) * (kind === 'road' ? 0.32 : 0.42)));
  const wide = shape === 'rect' ? size * (1.05 + ((seed >>> 16) & 3) * 0.12) : size;
  const high = shape === 'rect' ? size * (0.82 + ((seed >>> 20) & 3) * 0.1) : size;
  const stats = spawnZoneStats(kind, level);
  const commonProps = props([
    ['area', id],
    ['monster', monster],
    ['baseLevel', level, 'int'],
    ['levelVariance', 3, 'int'],
    ['maxAlive', stats.maxAlive, 'int'],
    ['spawnIntervalMin', stats.spawnIntervalMin, 'float'],
    ['spawnIntervalMax', stats.spawnIntervalMax, 'float'],
    ['minPlayerDistance', 260, 'int'],
    ['rareChance', stats.rareChance, 'float'],
    ['eliteChance', stats.eliteChance, 'float'],
    ['respawn', stats.respawn, 'bool'],
    ['shape', shape],
    ['biome', biome],
    // Legacy fields for older tools while runtime import migrates to monster/baseLevel.
    ['enemies', monster],
    ['level', level, 'int'],
    ['max', stats.maxAlive, 'int'],
    ['rate', 1, 'float']
  ]);

  const object = {
    name: `${id}_${monster}_spawn`,
    type: 'spawnZone',
    x: cx - wide / 2,
    y: cy - high / 2,
    w: wide,
    h: high,
    properties: commonProps
  };
  return shape === 'circle' ? ellipseObject(object) : rectObject(object);
}

function rectGap(a, b) {
  const dx = Math.max(0, Math.max(a.x - b.x - b.w, b.x - a.x - a.w));
  const dy = Math.max(0, Math.max(a.y - b.y - b.h, b.y - a.y - a.h));
  return Math.hypot(dx, dy);
}

function pointSegmentDistance(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

function segmentsDistance(a, b, c, d) {
  return Math.min(
    pointSegmentDistance(a, c, d),
    pointSegmentDistance(b, c, d),
    pointSegmentDistance(c, a, b),
    pointSegmentDistance(d, a, b)
  );
}

function polygonDistance(a, b) {
  const ab = absolutePolygonBounds(a);
  const bb = absolutePolygonBounds(b);
  if (rectGap(ab, bb) > 360) return Infinity;
  let best = Infinity;
  for (let i = 0; i < a.length; i++) {
    const a1 = a[i];
    const a2 = a[(i + 1) % a.length];
    for (let j = 0; j < b.length; j++) {
      const b1 = b[j];
      const b2 = b[(j + 1) % b.length];
      best = Math.min(best, segmentsDistance(a1, a2, b1, b2));
      if (best <= 1) return 0;
    }
  }
  return best;
}

function mapSpawnsInWorld(id, m, r) {
  const kind = areaKind(m, r);
  return !['town', 'village', 'camp', 'jail'].includes(kind) && m.enemies && m.enemies.length;
}

function harmonizeGeneratedMapLevels(maps, rects, cells) {
  const ids = Object.keys(maps).filter(id => mapSpawnsInWorld(id, maps[id], rects.get(id)) && cells.has(id));
  const levels = new Map(ids.map(id => [id, Math.max(1, (maps[id].mlv || 0) + 1)]));
  const mutable = new Set(ids.filter(id => maps[id].generatedArea && !maps[id].levelFixed));
  const neighbors = new Map(ids.map(id => [id, []]));

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i];
      const b = ids[j];
      const d = polygonDistance(cells.get(a), cells.get(b));
      if (d <= 220) {
        neighbors.get(a).push(b);
        neighbors.get(b).push(a);
      }
    }
  }

  for (let iter = 0; iter < 18; iter++) {
    const next = new Map(levels);
    for (const id of mutable) {
      const ns = neighbors.get(id) || [];
      if (!ns.length) continue;
      const avg = ns.reduce((sum, n) => sum + (levels.get(n) || 1), 0) / ns.length;
      let lv = Math.round((levels.get(id) || avg) * 0.25 + avg * 0.75);
      const minAllowed = Math.max(...ns.map(n => (levels.get(n) || 1) - 15));
      const maxAllowed = Math.min(...ns.map(n => (levels.get(n) || 1) + 15));
      if (minAllowed <= maxAllowed) {
        lv = Math.max(minAllowed, Math.min(maxAllowed, lv));
      } else {
        lv = Math.round((minAllowed + maxAllowed) / 2);
      }
      next.set(id, Math.max(1, Math.min(100, lv)));
    }
    for (const [id, lv] of next) levels.set(id, lv);
  }

  for (const id of mutable) maps[id].mlv = Math.max(0, (levels.get(id) || 1) - 1);
}

function scaledPoint(r, x, y) {
  return {
    x: r.x + (x / WORLD_W) * r.w,
    y: r.y + (y / WORLD_H) * r.h
  };
}

function areaName(id, m, r) {
  return r.name || m.name || id;
}

function areaKind(m, r) {
  return r.kind || mapKind(m);
}

function facilityList(id, m, r) {
  const all = m.facilities || [];
  if (areaKind(m, r) === 'town') return all;
  if (areaKind(m, r) === 'village') return all.filter(f => ['equip', 'smith', 'rune', 'guild'].includes(f.type));
  if (areaKind(m, r) === 'camp') return all.filter(f => ['rune', 'guild'].includes(f.type));
  return [];
}

function placedPointInArea(r, id, salt, index, total) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(total || 1)));
  const rows = Math.max(1, Math.ceil((total || 1) / cols));
  const col = index % cols;
  const row = Math.floor(index / cols);
  const seed = seededNumber(id, `${salt}:${index}`);
  const innerX = 0.18 + ((col + 0.5) / cols) * 0.64;
  const innerY = 0.2 + ((row + 0.5) / rows) * 0.58;
  const jitterX = (((seed & 255) / 255) - 0.5) * Math.min(220, r.w / Math.max(5, cols));
  const jitterY = ((((seed >>> 8) & 255) / 255) - 0.5) * Math.min(180, r.h / Math.max(5, rows));
  return {
    x: Math.max(r.x + 80, Math.min(r.x + r.w - 80, r.x + r.w * innerX + jitterX)),
    y: Math.max(r.y + 80, Math.min(r.y + r.h - 80, r.y + r.h * innerY + jitterY))
  };
}

function npcObjectsForArea(id, r, npcData) {
  const list = npcData[id] || [];
  return list.map((a, slot) => {
    const p = placedPointInArea(r, id, 'npc', slot, list.length);
    return pointObject({
      name: a[0] || `${id}_npc_${slot}`,
      type: 'npc',
      x: p.x,
      y: p.y,
      properties: props([
        ['area', id],
        ['npc', a[0] || `${id}_npc_${slot}`],
        ['home', id],
        ['slot', slot, 'int'],
        ['race', a[1] || ''],
        ['role', a[2] || ''],
        ['trait', a[3] || ''],
        ['look', a[4] || ''],
        ['sprite', a[5] == null ? 0 : a[5], 'int']
      ])
    });
  });
}

function respawnObjectForArea(id, r, facilities) {
  const guild = facilities.find(f => f.type === 'guild');
  if (!guild) return null;
  const p = placedPointInArea(r, id, 'respawn', 0, 1);
  const gx = guild.worldX ?? p.x;
  const gy = guild.worldY ?? p.y;
  return pointObject({
    name: `${id}_respawn`,
    type: 'respawn',
    x: gx,
    y: Math.min(r.y + r.h - 70, gy + 92),
    properties: props([
      ['area', id],
      ['respawn', 'guild'],
      ['facility', 'guild'],
      ['priority', 1, 'int']
    ])
  });
}

function stoneObjectsForArea(id, m, r) {
  return (m.stones || []).map((st, index) => {
    const p = scaledPoint(r, st.x, st.y);
    return pointObject({
      name: st.id || `${id}:stone:${index}`,
      type: 'stone',
      x: p.x,
      y: p.y,
      properties: props([
        ['id', st.id || `${id}:${index}`],
        ['area', id],
        ['spell', st.spell || ''],
        ['radius', st.r || 34, 'int']
      ])
    });
  });
}

function buildTiledMap(maps, rects) {
  const cells = buildPartitionCells(rects);
  const npcData = loadTownNpcData();
  const areaLayers = {
    Areas_Towns: [],
    Areas_Fields: [],
    Areas_Dungeons: [],
    Areas_Routes: []
  };
  const spawnZones = [];
  const facilities = [];
  const npcs = [];
  const stones = [];
  const respawnPoints = [];
  const bosses = [];
  const ponds = [];
  const decorations = [];

  for (const [id, m] of Object.entries(maps)) {
    const r = rects.get(id);
    const kind = areaKind(m, r);
    const name = areaName(id, m, r);
    areaLayers[areaLayerName(kind)].push(polygonObjectFromAbsolute({
      name,
      type: 'area',
      points: cells.get(id),
      properties: props([
        ['id', id],
        ['name', name],
        ['kind', kind],
        ['level', (m.mlv || 0) + 1, 'int'],
        ['theme', r.biome || m.deco || 'field'],
        ['biome', r.biome || m.deco || 'field'],
        ['ground', m.ground || ''],
        ['gpond', m.gpond || '']
      ])
    }));

    const spawnZone = buildSpawnZone(id, m, r, cells.get(id), kind);
    if (spawnZone) spawnZones.push(spawnZone);

    const areaFacilities = facilityList(id, m, r);
    const placedFacilities = [];
    for (let i = 0; i < areaFacilities.length; i++) {
      const f = areaFacilities[i];
      const p = placedPointInArea(r, id, 'facility', i, areaFacilities.length);
      const placed = { ...f, worldX: p.x, worldY: p.y };
      placedFacilities.push(placed);
      facilities.push(pointObject({
        name: FACILITY_LABELS[f.type] || f.type,
        type: 'facility',
        x: p.x,
        y: p.y,
        properties: props([
          ['area', id],
          ['facility', f.type],
          ['label', FACILITY_LABELS[f.type] || f.type],
          ['radius', f.r || 44, 'int']
        ])
      }));
    }

    const respawn = respawnObjectForArea(id, r, placedFacilities);
    if (respawn) respawnPoints.push(respawn);
    npcs.push(...npcObjectsForArea(id, r, npcData));
    stones.push(...stoneObjectsForArea(id, m, r));

    if (m.boss && m.bossDef) {
      const p = scaledPoint(r, m.bx || WORLD_W / 2, m.by || WORLD_H * 0.28);
      bosses.push(pointObject({
        name: `${name}のボス`,
        type: 'boss',
        x: p.x,
        y: p.y,
        properties: props([
          ['area', id],
          ['boss', `${id}_boss`],
          ['label', `${name}のボス`],
          ['level', (m.mlv || 0) + 1, 'int'],
          ['element', m.bossDef.el || '']
        ])
      }));
    }

    if (AREA_PLANNING_ONLY) continue;

    if (!m.town && m.enemies && m.enemies.length) {
      spawnZones.push(rectObject({
        name: `${id}_spawn`,
        type: 'spawnZone',
        x: r.x + Math.round(r.w * 0.18),
        y: r.y + Math.round(r.h * 0.18),
        w: Math.round(r.w * 0.68),
        h: Math.round(r.h * 0.68),
        properties: props([
          ['area', id],
          ['enemies', m.enemies.join(',')],
          ['level', (m.mlv || 0) + 1, 'int'],
          ['rate', 1]
        ])
      }));
    }

    for (const p of m.ponds || []) {
      const c = scaledPoint(r, p.x, p.y);
      const rx = (p.rx / WORLD_W) * r.w;
      const ry = (p.ry / WORLD_H) * r.h;
      ponds.push(rectObject({
        name: `${id}_pond`,
        type: 'pond',
        x: c.x - rx,
        y: c.y - ry,
        w: rx * 2,
        h: ry * 2,
        properties: props([
          ['area', id],
          ['rx', Math.round(rx), 'int'],
          ['ry', Math.round(ry), 'int']
        ])
      }));
    }

    for (const d of m.decos || []) {
      const p = scaledPoint(r, d.x, d.y);
      decorations.push(pointObject({
        name: `${id}_deco`,
        type: 'deco',
        x: p.x,
        y: p.y,
        properties: props([
          ['area', id],
          ['deco', r.biome || m.deco || ''],
          ['variant', d.t]
        ])
      }));
    }

  }

  const maxX = Math.max(...[...rects.values()].map(r => r.x + r.w)) + 512;
  const maxY = Math.max(...[...rects.values()].map(r => r.y + r.h)) + 512;
  const width = Math.ceil(maxX / TILE);
  const height = Math.ceil(maxY / TILE);

  return {
    compressionlevel: -1,
    height,
    infinite: true,
    layers: [
      tileLayer('Ground', width, height, true),
      tileLayer('Detail', width, height, true),
      objectLayer('Areas_Towns', areaLayers.Areas_Towns),
      objectLayer('Areas_Fields', areaLayers.Areas_Fields),
      objectLayer('Areas_Dungeons', areaLayers.Areas_Dungeons),
      objectLayer('Areas_Routes', areaLayers.Areas_Routes),
      objectLayer('SpawnZones', spawnZones),
      objectLayer('Facilities', facilities),
      objectLayer('RespawnPoints', respawnPoints),
      objectLayer('Bosses', bosses),
      objectLayer('Ponds', ponds),
      objectLayer('Decoration', decorations),
      objectLayer('Collision', []),
      objectLayer('NPCs', npcs),
      objectLayer('Stones', stones)
    ],
    nextlayerid: nextLayerId,
    nextobjectid: nextObjectId,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.12.2',
    tileheight: TILE,
    tilesets: [],
    tilewidth: TILE,
    type: 'map',
    version: '1.10',
    width
  };
}

const baseMaps = loadMaps();
const maps = { ...baseMaps, ...createStoryExtraMaps(genDecos, baseMaps) };
const rects = applyStoryWorldLayout(maps);
const tiled = buildTiledMap(maps, rects);

if (fs.existsSync(output)) {
  const backup = `${output}.bak`;
  if (!fs.existsSync(backup)) fs.copyFileSync(output, backup);
}

fs.writeFileSync(output, `${JSON.stringify(tiled, null, 2)}\n`, 'utf8');
console.log(`Wrote ${path.relative(repoRoot, output)} with ${Object.keys(maps).length} areas.`);
console.log(`Objects: ${tiled.nextobjectid - 1}`);
