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

function portalSide(p) {
  if (p.x < 100) return 'w';
  if (p.x > WORLD_W - 100) return 'e';
  if (p.y < 100) return 'n';
  return 's';
}

function placeRects(maps) {
  const ids = Object.keys(maps);
  const rects = new Map();
  const queue = [];
  const start = maps.town ? 'town' : ids[0];
  rects.set(start, { x: 0, y: 0, w: WORLD_W, h: WORLD_H });
  queue.push(start);

  while (queue.length) {
    const id = queue.shift();
    const base = rects.get(id);
    for (const p of maps[id].portals || []) {
      const to = p.to;
      if (!maps[to] || rects.has(to)) continue;
      const side = portalSide(p);
      let x = base.x;
      let y = base.y;
      if (side === 'e') {
        x = base.x + WORLD_W + GAP;
        y = base.y + (p.y - (p.ty ?? WORLD_H / 2));
      } else if (side === 'w') {
        x = base.x - WORLD_W - GAP;
        y = base.y + (p.y - (p.ty ?? WORLD_H / 2));
      } else if (side === 's') {
        x = base.x + (p.x - (p.tx ?? WORLD_W / 2));
        y = base.y + WORLD_H + GAP;
      } else {
        x = base.x + (p.x - (p.tx ?? WORLD_W / 2));
        y = base.y - WORLD_H - GAP;
      }
      const r = avoidOverlap({ x, y, w: WORLD_W, h: WORLD_H }, rects);
      rects.set(to, r);
      queue.push(to);
    }
  }

  let fallback = 0;
  for (const id of ids) {
    if (rects.has(id)) continue;
    const col = fallback % 8;
    const row = Math.floor(fallback / 8);
    rects.set(id, { x: col * (WORLD_W + GAP), y: (row + 8) * (WORLD_H + GAP), w: WORLD_W, h: WORLD_H });
    fallback++;
  }

  const minX = Math.min(...[...rects.values()].map(r => r.x));
  const minY = Math.min(...[...rects.values()].map(r => r.y));
  const margin = 512;
  for (const r of rects.values()) {
    r.x = Math.round(r.x - minX + margin);
    r.y = Math.round(r.y - minY + margin);
  }
  return rects;
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
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

function buildTiledMap(maps, rects) {
  const cells = buildPartitionCells(rects);
  const areaLayers = {
    Areas_Towns: [],
    Areas_Fields: [],
    Areas_Dungeons: [],
    Areas_Routes: []
  };
  const spawnZones = [];
  const facilities = [];
  const bosses = [];
  const ponds = [];
  const decorations = [];
  const legacyPortals = [];

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

    for (const f of facilityList(id, m, r)) {
      const p = scaledPoint(r, f.x, f.y);
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

    for (const p of m.portals || []) {
      const lp = scaledPoint(r, p.x, p.y);
      legacyPortals.push(pointObject({
        name: p.to || 'portal',
        type: 'legacyPortal',
        x: lp.x,
        y: lp.y,
        properties: props([
          ['area', id],
          ['to', p.to || ''],
          ['tx', p.tx || 0, 'int'],
          ['ty', p.ty || 0, 'int'],
          ['label', p.label || ''],
          ['radius', p.r || 30, 'int']
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
      objectLayer('Bosses', bosses),
      objectLayer('Ponds', ponds),
      objectLayer('Decoration', decorations),
      objectLayer('LegacyPortals', legacyPortals),
      objectLayer('Collision', []),
      objectLayer('NPCs', []),
      objectLayer('Stones', [])
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

const maps = { ...loadMaps(), ...createStoryExtraMaps(genDecos) };
const rects = applyStoryWorldLayout(maps);
const tiled = buildTiledMap(maps, rects);

if (fs.existsSync(output)) {
  const backup = `${output}.bak`;
  if (!fs.existsSync(backup)) fs.copyFileSync(output, backup);
}

fs.writeFileSync(output, `${JSON.stringify(tiled, null, 2)}\n`, 'utf8');
console.log(`Wrote ${path.relative(repoRoot, output)} with ${Object.keys(maps).length} areas.`);
console.log(`Objects: ${tiled.nextobjectid - 1}`);
