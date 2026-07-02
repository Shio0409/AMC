#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const input = path.resolve(repoRoot, process.argv[2] || 'editor/AMC.tmj');

const CHUNK = 16;
const TILE = 32;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function propMap(properties) {
  return Object.fromEntries((properties || []).map((p) => [p.name, p.value]));
}

function propsObject(props) {
  return Object.entries(props).map(([name, value]) => ({
    name,
    type: Number.isInteger(value) ? 'int' : typeof value === 'number' ? 'float' : typeof value === 'boolean' ? 'bool' : 'string',
    value,
  }));
}

function hashString(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < String(s).length; i++) {
    h ^= String(s).charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2246822519) >>> 0;
    s = Math.imul(s ^ (s >>> 13), 3266489917) >>> 0;
    return ((s ^ (s >>> 16)) >>> 0) / 4294967296;
  };
}

function absolutePolygon(o) {
  return o.polygon ? o.polygon.map((p) => ({ x: (o.x || 0) + p.x, y: (o.y || 0) + p.y })) : null;
}

function boundsOf(o) {
  const poly = absolutePolygon(o);
  if (poly) {
    const xs = poly.map((p) => p.x), ys = poly.map((p) => p.y);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  return { x: o.x || 0, y: o.y || 0, w: o.width || 0, h: o.height || 0 };
}

function pointInPolygon(x, y, poly) {
  if (!poly || poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (((a.y > y) !== (b.y > y)) && (x < (b.x - a.x) * (y - a.y) / ((b.y - a.y) || 1e-9) + a.x)) inside = !inside;
  }
  return inside;
}

function inArea(area, x, y) {
  const b = area.bounds;
  if (x < b.x || y < b.y || x > b.x + b.w || y > b.y + b.h) return false;
  return !area.polygon || pointInPolygon(x, y, area.polygon);
}

function tileMapFromTileset(map) {
  const ref = (map.tilesets || []).find((t) => t.source === 'maptiles.tsj');
  if (!ref) throw new Error('AMC.tmj must reference maptiles.tsj');
  const ts = readJson(path.resolve(path.dirname(input), ref.source));
  const firstgid = ref.firstgid || 1;
  const out = {};
  for (const tile of ts.tiles || []) out[path.basename(tile.image)] = firstgid + tile.id;
  return out;
}

function layer(map, name, type) {
  let l = (map.layers || []).find((x) => x.name === name);
  if (!l) {
    l = { id: map.nextlayerid++, name, type, visible: true, opacity: 1, x: 0, y: 0 };
    if (type === 'tilelayer') Object.assign(l, { width: map.width, height: map.height, chunks: [] });
    if (type === 'objectgroup') l.objects = [];
    map.layers.push(l);
  }
  return l;
}

function areaObjects(map) {
  return (map.layers || [])
    .filter((l) => l.name === 'Areas' || l.name.startsWith('Areas_'))
    .flatMap((l) => (l.objects || []).map((o) => {
      const p = propMap(o.properties);
      return {
        id: String(p.id || o.name || o.id),
        name: String(p.name || o.name || p.id || o.id),
        kind: String(p.kind || 'field'),
        theme: String(p.theme || p.biome || p.kind || 'meadow'),
        level: Number(p.level || 1),
        bounds: boundsOf(o),
        polygon: absolutePolygon(o),
      };
    }));
}

const TILE_THEME = {
  meadow: { ground: ['grassland_1_32x32.png', 'grassland_2_32x32.png'], detail: ['flower_field_32x32.png', 'unpaved_road_32x32.png'], deco: ['木1.png', '木2.png', '茂み.png', '草1.png', '花1.png', '石1.png'] },
  farm: { ground: ['grassland_1_32x32.png', 'farm_field_32x32.png'], detail: ['flower_field_32x32.png', 'gravel_road_32x32.png'], deco: ['木1.png', '茂み.png', '草1.png', '草2.png', '花1.png'] },
  forest: { ground: ['forest_32x32.png', 'woodland_32x32.png'], detail: ['grassland_2_32x32.png', 'swamp_32x32.png'], deco: ['木2.png', '木3.png', '木4.png', '木5.png', '茂み2.png', '茂み3.png'] },
  water: { ground: ['grassland_2_32x32.png', 'swamp_32x32.png'], detail: ['pond_32x32.png', 'ice_32x32.png'], deco: ['茂み.png', '茂み2.png', '草1.png', '草2.png', '石1.png'] },
  desert: { ground: ['desert_32x32.png', 'soil_32x32.png'], detail: ['rocky_ground_32x32.png'], deco: ['サボテン.png', '砂丘.png', '砂漠岩.png', '砂漠枯れ木1.png', '砂漠枯れ木2.png'] },
  mountain: { ground: ['rocky_ground_32x32.png', 'mountain_1_32x32.png'], detail: ['mountain_2_32x32.png', 'mine_32x32.png'], deco: ['岩1.png', '石1.png', '石2.png', '火山岩石1.png'] },
  snow: { ground: ['snow_mountain_32x32.png', 'ice_32x32.png'], detail: ['mountain_2_32x32.png'], deco: ['雪山樹氷1.png', '雪山岩1.png', '雪山岩2.png', '雪山茂み1.png', '雪山茂み2.png'] },
  ruin: { ground: ['ancient_ruins_1_32x32.png', 'ruins_32x32.png'], detail: ['ancient_ruins_2_32x32.png', 'rocky_ground_32x32.png'], deco: ['遺跡の残骸1.png', '遺跡の残骸2.png', '遺跡の残骸3.png', '遺跡の残骸4.png', '石1.png'] },
  road: { ground: ['unpaved_road_32x32.png', 'grassland_2_32x32.png'], detail: ['gravel_road_32x32.png'], deco: ['草1.png', '草2.png', '石1.png', '石2.png'] },
  town: { ground: ['cobblestone_32x32.png'], detail: ['gravel_road_32x32.png'], deco: ['木1.png', '木2.png', '茂み.png', '花1.png', '石1.png'] },
  village: { ground: ['grassland_1_32x32.png', 'cobblestone_32x32.png'], detail: ['gravel_road_32x32.png', 'farm_field_32x32.png'], deco: ['木1.png', '木2.png', '茂み.png', '草1.png', '花1.png'] },
};

function themeFor(area) {
  const key = area.kind === 'town' || area.kind === 'village' || area.kind === 'camp' || area.kind === 'jail'
    ? area.kind
    : area.theme;
  return TILE_THEME[key] || TILE_THEME[area.theme] || TILE_THEME[area.kind] || TILE_THEME.meadow;
}

function paintLayer() {
  const chunks = new Map();
  function set(tx, ty, gid) {
    if (!gid) return;
    const cx = Math.floor(tx / CHUNK) * CHUNK, cy = Math.floor(ty / CHUNK) * CHUNK;
    const key = `${cx},${cy}`;
    let data = chunks.get(key);
    if (!data) {
      data = Array(CHUNK * CHUNK).fill(0);
      chunks.set(key, data);
    }
    data[(ty - cy) * CHUNK + (tx - cx)] = gid;
  }
  function toChunks() {
    return [...chunks.entries()].map(([key, data]) => {
      const [x, y] = key.split(',').map(Number);
      const buf = Buffer.alloc(data.length * 4);
      data.forEach((gid, i) => buf.writeUInt32LE(gid >>> 0, i * 4));
      return { x, y, width: CHUNK, height: CHUNK, data: zlib.deflateSync(buf).toString('base64') };
    }).sort((a, b) => a.y - b.y || a.x - b.x);
  }
  return { set, toChunks };
}

function pick(list, r, gids) {
  const name = list[Math.floor(r() * list.length) % list.length];
  return gids[name] || gids['grassland_1_32x32.png'];
}

function paintBlob(area, layerOut, gid, cx, cy, rx, ry) {
  const x0 = Math.floor((cx - rx) / TILE), x1 = Math.ceil((cx + rx) / TILE);
  const y0 = Math.floor((cy - ry) / TILE), y1 = Math.ceil((cy + ry) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const px = tx * TILE + TILE / 2, py = ty * TILE + TILE / 2;
      if (!inArea(area, px, py)) continue;
      const dx = (px - cx) / rx, dy = (py - cy) / ry;
      if (dx * dx + dy * dy <= 1) layerOut.set(tx, ty, gid);
    }
  }
}

function paintTown(area, ground, detail, gids, r) {
  const b = area.bounds, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const cobble = gids['cobblestone_32x32.png'], road = gids['gravel_road_32x32.png'];
  paintBlob(area, ground, cobble, cx, cy, Math.min(520, b.w * 0.25), Math.min(420, b.h * 0.22));
  for (const [x, y, rx, ry] of [
    [cx, cy, b.w * 0.42, 46],
    [cx, cy, 46, b.h * 0.38],
    [b.x + b.w * 0.30, b.y + b.h * 0.68, b.w * 0.16, 34],
    [b.x + b.w * 0.70, b.y + b.h * 0.34, b.w * 0.14, 34],
  ]) paintBlob(area, detail, road, x, y, rx, ry);
}

function addDecoration(objects, area, asset, x, y, id) {
  objects.push({
    id,
    name: asset,
    type: 'deco',
    x: Math.round(x),
    y: Math.round(y),
    width: 0,
    height: 0,
    point: true,
    visible: true,
    rotation: 0,
    properties: propsObject({ id: `${area.id}:deco:${id}`, area: area.id, deco: asset }),
  });
}

const map = readJson(input);
const gids = tileMapFromTileset(map);
const ground = paintLayer();
const detail = paintLayer();
const decorations = [];
let nextObjectId = Math.max(Number(map.nextobjectid || 1), 1);

for (const area of areaObjects(map)) {
  const r = rng(hashString(area.id));
  const theme = themeFor(area);
  const b = area.bounds;
  const large = Math.max(b.w, b.h);
  const blobCount = Math.max(2, Math.min(10, Math.round(large / 1300) + (area.kind === 'field' ? 2 : 0)));
  for (let i = 0; i < blobCount; i++) {
    const cx = b.x + b.w * (0.12 + r() * 0.76);
    const cy = b.y + b.h * (0.12 + r() * 0.76);
    if (!inArea(area, cx, cy)) continue;
    const rx = 150 + r() * Math.min(620, b.w * 0.22);
    const ry = 120 + r() * Math.min(520, b.h * 0.20);
    paintBlob(area, ground, pick(theme.ground, r, gids), cx, cy, rx, ry);
    if (r() < 0.72) paintBlob(area, detail, pick(theme.detail, r, gids), cx + (r() - 0.5) * rx, cy + (r() - 0.5) * ry, rx * (0.35 + r() * 0.25), ry * (0.28 + r() * 0.28));
  }
  if (['town', 'village', 'camp', 'jail'].includes(area.kind)) paintTown(area, ground, detail, gids, r);

  const decoCount = Math.max(3, Math.min(24, Math.round((b.w * b.h) / 850000)));
  for (let i = 0; i < decoCount; i++) {
    let x = 0, y = 0, ok = false;
    for (let tries = 0; tries < 18; tries++) {
      x = b.x + b.w * (0.08 + r() * 0.84);
      y = b.y + b.h * (0.08 + r() * 0.84);
      if (inArea(area, x, y)) {
        ok = true;
        break;
      }
    }
    if (!ok) continue;
    addDecoration(decorations, area, theme.deco[Math.floor(r() * theme.deco.length) % theme.deco.length], x, y, nextObjectId++);
  }
}

const groundLayer = layer(map, 'Ground', 'tilelayer');
groundLayer.chunks = ground.toChunks();
groundLayer.width = map.width;
groundLayer.height = map.height;
groundLayer.encoding = 'base64';
groundLayer.compression = 'zlib';
const detailLayer = layer(map, 'Detail', 'tilelayer');
detailLayer.chunks = detail.toChunks();
detailLayer.width = map.width;
detailLayer.height = map.height;
detailLayer.encoding = 'base64';
detailLayer.compression = 'zlib';
const decoLayer = layer(map, 'Decoration', 'objectgroup');
decoLayer.objects = decorations;
map.nextobjectid = Math.max(nextObjectId, Number(map.nextobjectid || 1));

writeJson(input, map);
console.log(`Painted terrain: Ground ${groundLayer.chunks.length} chunks, Detail ${detailLayer.chunks.length} chunks, Decoration ${decorations.length} objects.`);
