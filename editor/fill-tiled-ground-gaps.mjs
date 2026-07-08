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

const AREA_LAYERS = new Set(['Areas', 'Areas_Towns', 'Areas_Fields', 'Areas_Dungeons', 'Areas_Routes']);
const DEFAULT_TILE = 'grassland_1_32x32.png';
const GROUND_THEME = {
  town: ['cobblestone_32x32.png'],
  village: ['grassland_1_32x32.png', 'cobblestone_32x32.png'],
  camp: ['grassland_1_32x32.png', 'unpaved_road_32x32.png'],
  jail: ['ancient_ruins_1_32x32.png', 'cave_32x32.png'],
  meadow: ['grassland_1_32x32.png', 'grassland_2_32x32.png'],
  plains: ['grassland_1_32x32.png', 'grassland_2_32x32.png'],
  farm: ['farm_field_32x32.png', 'grassland_1_32x32.png'],
  forest: ['forest_32x32.png', 'woodland_32x32.png'],
  deepForest: ['woodland_32x32.png', 'forest_32x32.png'],
  grove: ['woodland_32x32.png', 'grassland_2_32x32.png'],
  lake: ['grassland_2_32x32.png', 'swamp_32x32.png'],
  river: ['grassland_2_32x32.png', 'swamp_32x32.png'],
  water: ['grassland_2_32x32.png', 'swamp_32x32.png'],
  waterway: ['swamp_32x32.png', 'grassland_2_32x32.png'],
  coast: ['soil_32x32.png', 'grassland_2_32x32.png'],
  marsh: ['swamp_32x32.png', 'grassland_2_32x32.png'],
  desert: ['desert_32x32.png', 'soil_32x32.png'],
  mountain: ['rocky_ground_32x32.png', 'mountain_1_32x32.png'],
  mine: ['mine_32x32.png', 'rocky_ground_32x32.png'],
  snow: ['snow_mountain_32x32.png', 'ice_32x32.png'],
  ice: ['ice_32x32.png', 'snow_mountain_32x32.png'],
  ruin: ['ancient_ruins_1_32x32.png', 'ruins_32x32.png'],
  industry: ['rocky_ground_32x32.png', 'soil_32x32.png'],
  frontier: ['soil_32x32.png', 'rocky_ground_32x32.png'],
  wasteland: ['soil_32x32.png', 'rocky_ground_32x32.png'],
  void: ['cave_32x32.png', 'ruins_32x32.png'],
  road: ['unpaved_road_32x32.png', 'gravel_road_32x32.png'],
  royal: ['cobblestone_32x32.png'],
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function propMap(properties) {
  return Object.fromEntries((properties || []).map((p) => [p.name, p.value]));
}

function hashString(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < String(s).length; i++) {
    h ^= String(s).charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
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
    map.layers.push(l);
  }
  return l;
}

function areaObjects(map) {
  return (map.layers || [])
    .filter((l) => AREA_LAYERS.has(l.name))
    .flatMap((l) => (l.objects || []).map((o) => {
      const p = propMap(o.properties);
      return {
        id: String(p.id || o.name || o.id),
        kind: String(p.kind || 'field'),
        theme: String(p.theme || p.biome || p.kind || 'meadow'),
        bounds: boundsOf(o),
        polygon: absolutePolygon(o),
      };
    }));
}

function decodeChunk(layer, chunk) {
  const count = Number(chunk.width || 0) * Number(chunk.height || 0);
  if (Array.isArray(chunk.data)) return chunk.data.slice(0, count);
  if (layer.encoding !== 'base64' || typeof chunk.data !== 'string') return Array(count).fill(0);
  let buf = Buffer.from(chunk.data.trim(), 'base64');
  if (layer.compression === 'zlib') buf = zlib.inflateSync(buf);
  else if (layer.compression) throw new Error(`Unsupported tile compression: ${layer.compression}`);
  const out = [];
  for (let i = 0; i + 3 < buf.length && out.length < count; i += 4) out.push(buf.readUInt32LE(i));
  while (out.length < count) out.push(0);
  return out;
}

function encodeChunk(data) {
  const buf = Buffer.alloc(data.length * 4);
  for (let i = 0; i < data.length; i++) buf.writeUInt32LE((data[i] || 0) >>> 0, i * 4);
  return zlib.deflateSync(buf).toString('base64');
}

function groundStore() {
  const chunks = new Map();
  let nonzero = 0;
  const keyOf = (cx, cy) => `${cx},${cy}`;
  const origin = (v) => Math.floor(v / CHUNK) * CHUNK;
  const getChunk = (tx, ty, create) => {
    const cx = origin(tx), cy = origin(ty), key = keyOf(cx, cy);
    let data = chunks.get(key);
    if (!data && create) {
      data = new Uint32Array(CHUNK * CHUNK);
      chunks.set(key, data);
    }
    return { cx, cy, data };
  };
  const get = (tx, ty) => {
    const ch = getChunk(tx, ty, false);
    return ch.data ? ch.data[(ty - ch.cy) * CHUNK + (tx - ch.cx)] : 0;
  };
  const set = (tx, ty, gid) => {
    if (!gid) return false;
    const ch = getChunk(tx, ty, true);
    const i = (ty - ch.cy) * CHUNK + (tx - ch.cx);
    if (ch.data[i]) return false;
    ch.data[i] = gid;
    nonzero++;
    return true;
  };
  const load = (layer) => {
    for (const chunk of layer.chunks || []) {
      const raw = decodeChunk(layer, chunk);
      const w = Number(chunk.width || 0), h = Number(chunk.height || 0);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const gid = raw[y * w + x] || 0;
        if (gid) set(Number(chunk.x || 0) + x, Number(chunk.y || 0) + y, gid);
      }
    }
  };
  const toChunks = () => [...chunks.entries()].map(([key, data]) => {
    const [x, y] = key.split(',').map(Number);
    return { x, y, width: CHUNK, height: CHUNK, data: encodeChunk(data) };
  }).sort((a, b) => a.y - b.y || a.x - b.x);
  return { get, set, load, toChunks, count: () => nonzero, chunkCount: () => chunks.size };
}

function themeGround(area, gids) {
  const kindKey = ['town', 'village', 'camp', 'jail'].includes(area.kind) ? area.kind : '';
  const names = GROUND_THEME[kindKey] || GROUND_THEME[area.theme] || GROUND_THEME[area.kind] || GROUND_THEME.meadow;
  const usable = names.map((name) => gids[name]).filter(Boolean);
  return usable.length ? usable[hashString(area.id) % usable.length] : gids[DEFAULT_TILE];
}

if (!fs.existsSync(input)) {
  console.error(`Tiled file not found: ${path.relative(repoRoot, input)}`);
  process.exit(1);
}

const map = readJson(input);
const gids = tileMapFromTileset(map);
const fallbackGid = gids[DEFAULT_TILE];
if (!fallbackGid) throw new Error(`Missing default ground tile: ${DEFAULT_TILE}`);

const groundLayer = layer(map, 'Ground', 'tilelayer');
const ground = groundStore();
ground.load(groundLayer);
const before = ground.count();
let areaFilled = 0;
let defaultFilled = 0;

for (const area of areaObjects(map)) {
  const gid = themeGround(area, gids);
  const b = area.bounds;
  const minTx = Math.max(0, Math.floor(b.x / TILE));
  const maxTx = Math.min(Number(map.width || 0) - 1, Math.ceil((b.x + b.w) / TILE));
  const minTy = Math.max(0, Math.floor(b.y / TILE));
  const maxTy = Math.min(Number(map.height || 0) - 1, Math.ceil((b.y + b.h) / TILE));
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      const px = tx * TILE + TILE / 2, py = ty * TILE + TILE / 2;
      if (inArea(area, px, py) && ground.set(tx, ty, gid)) areaFilled++;
    }
  }
}

const mw = Number(map.width || 0), mh = Number(map.height || 0);
for (let ty = 0; ty < mh; ty++) {
  for (let tx = 0; tx < mw; tx++) {
    if (ground.get(tx, ty)) continue;
    if (ground.set(tx, ty, fallbackGid)) defaultFilled++;
  }
}

groundLayer.chunks = ground.toChunks();
groundLayer.width = mw;
groundLayer.height = mh;
groundLayer.encoding = 'base64';
groundLayer.compression = 'zlib';

writeJson(input, map);
console.log(`Filled Ground gaps: existing ${before}, area ${areaFilled}, default ${defaultFilled}, total ${ground.count()}, chunks ${ground.chunkCount()}.`);
