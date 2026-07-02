#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const input = path.resolve(repoRoot, process.argv[2] || 'editor/AMC.tmj');

const AREA_LAYERS = new Set(['Areas', 'Areas_Towns', 'Areas_Fields', 'Areas_Dungeons', 'Areas_Routes']);
const POINT_LAYERS = ['Facilities', 'Stones', 'RespawnPoints', 'Bosses'];

function propMap(properties) {
  const out = {};
  for (const p of properties || []) out[p.name] = p.value;
  return out;
}

function absolutePolygon(object) {
  if (!object.polygon || object.polygon.length < 3) return null;
  return object.polygon.map(p => ({ x: (object.x || 0) + p.x, y: (object.y || 0) + p.y }));
}

function boundsOf(object) {
  const poly = absolutePolygon(object);
  if (poly) {
    const xs = poly.map(p => p.x), ys = poly.map(p => p.y);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const maxX = Math.max(...xs), maxY = Math.max(...ys);
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  return { x: object.x || 0, y: object.y || 0, w: object.width || 0, h: object.height || 0 };
}

function centerOf(object) {
  const b = boundsOf(object);
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

function pointInPolygon(x, y, poly) {
  let inside = false;
  if (!poly || poly.length < 3) return false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    const hit = ((a.y > y) !== (b.y > y)) && (x < (b.x - a.x) * (y - a.y) / ((b.y - a.y) || 1e-9) + a.x);
    if (hit) inside = !inside;
  }
  return inside;
}

function pointInArea(point, area) {
  const b = area.bounds;
  if (point.x < b.x || point.x > b.x + b.w || point.y < b.y || point.y > b.y + b.h) return false;
  return area.polygon ? pointInPolygon(point.x, point.y, area.polygon) : true;
}

function collectAreas(map) {
  const areas = new Map();
  for (const layer of map.layers || []) {
    if (!AREA_LAYERS.has(layer.name)) continue;
    for (const object of layer.objects || []) {
      const props = propMap(object.properties);
      const id = String(props.id || object.name || '').trim();
      if (!id) continue;
      areas.set(id, {
        id,
        object,
        props,
        polygon: absolutePolygon(object),
        bounds: boundsOf(object),
      });
    }
  }
  return areas;
}

function layerByName(map, name) {
  return (map.layers || []).find(l => l.name === name);
}

function anchorPoint(area) {
  if (area.polygon) {
    const p = {
      x: area.polygon.reduce((sum, v) => sum + v.x, 0) / area.polygon.length,
      y: area.polygon.reduce((sum, v) => sum + v.y, 0) / area.polygon.length,
    };
    if (pointInArea(p, area)) return p;
  }
  const b = area.bounds;
  const center = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  if (pointInArea(center, area)) return center;
  return nearestInside(area, center);
}

function nearestInside(area, preferred) {
  const b = area.bounds;
  let best = null, bestD = Infinity;
  const step = Math.max(24, Math.min(96, Math.floor(Math.min(b.w, b.h) / 10) || 24));
  for (let y = b.y + step / 2; y <= b.y + b.h; y += step) {
    for (let x = b.x + step / 2; x <= b.x + b.w; x += step) {
      const p = { x, y };
      if (!pointInArea(p, area)) continue;
      const d = Math.hypot(x - preferred.x, y - preferred.y);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
  }
  return best || { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

function slotCandidate(area, base, index, total) {
  if (total <= 1) return base;
  const b = area.bounds;
  const radius = Math.max(48, Math.min(220, Math.min(b.w, b.h) * 0.22));
  const angle = -Math.PI / 2 + index * Math.PI * 2 / total;
  const p = { x: base.x + Math.cos(angle) * radius, y: base.y + Math.sin(angle) * radius };
  if (pointInArea(p, area)) return p;
  const inner = { x: base.x + Math.cos(angle) * radius * 0.55, y: base.y + Math.sin(angle) * radius * 0.55 };
  if (pointInArea(inner, area)) return inner;
  return nearestInside(area, inner);
}

function moveObjectCenter(object, point) {
  const w = object.width || 0, h = object.height || 0;
  object.x = Math.round(point.x - w / 2);
  object.y = Math.round(point.y - h / 2);
}

function repairLayer(map, areas, layerName) {
  const layer = layerByName(map, layerName);
  if (!layer) return 0;
  const grouped = new Map();
  for (const object of layer.objects || []) {
    const props = propMap(object.properties);
    const areaId = String(props.area || '').trim();
    if (!areaId || !areas.has(areaId)) continue;
    if (!grouped.has(areaId)) grouped.set(areaId, []);
    grouped.get(areaId).push(object);
  }

  let moved = 0;
  for (const [areaId, objects] of grouped) {
    const area = areas.get(areaId);
    const base = anchorPoint(area);
    for (let i = 0; i < objects.length; i++) {
      const object = objects[i];
      if (pointInArea(centerOf(object), area)) continue;
      const point = slotCandidate(area, base, i, objects.length);
      moveObjectCenter(object, point);
      moved++;
    }
  }
  return moved;
}

if (!fs.existsSync(input)) {
  console.error(`Tiled file not found: ${path.relative(repoRoot, input)}`);
  process.exit(1);
}

const map = JSON.parse(fs.readFileSync(input, 'utf8'));
const areas = collectAreas(map);
let moved = 0;
for (const layer of POINT_LAYERS) moved += repairLayer(map, areas, layer);

fs.writeFileSync(input, `${JSON.stringify(map, null, 2)}\n`, 'utf8');
console.log(`Repaired ${moved} Tiled point placements in ${path.relative(repoRoot, input).replace(/\\/g, '/')}.`);
