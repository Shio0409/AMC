#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const input = path.resolve(repoRoot, process.argv[2] || 'editor/AMC.tmj');
const output = path.resolve(repoRoot, process.argv[3] || 'world_data.js');

const OBJECT_LAYERS = new Set([
  'Areas',
  'Areas_Towns',
  'Areas_Fields',
  'Areas_Dungeons',
  'Areas_Routes',
  'SpawnZones',
  'Facilities',
  'NPCs',
  'Stones',
  'RespawnPoints',
  'Bosses',
  'Collision',
  'Decoration'
]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function propMap(properties) {
  const out = {};
  for (const p of properties || []) out[p.name] = p.value;
  return out;
}

function layerByName(map, name) {
  return (map.layers || []).find(l => l.name === name);
}

function normalizeAssetPath(file) {
  const rel = path.relative(repoRoot, file).replace(/\\/g, '/');
  return rel.startsWith('assets/maptip/') ? rel.slice('assets/maptip/'.length) : rel;
}

function readTileset(ts) {
  if (!ts.source) return { ...ts, baseDir: repoRoot };
  const file = path.resolve(path.dirname(input), ts.source);
  const data = readJson(file);
  return { ...data, firstgid: ts.firstgid || 1, baseDir: path.dirname(file) };
}

function collectTilesets(map) {
  const gidToImage = new Map();
  for (const ref of map.tilesets || []) {
    const ts = readTileset(ref);
    const firstgid = ref.firstgid || ts.firstgid || 1;
    for (const tile of ts.tiles || []) {
      if (!tile.image) continue;
      const img = path.resolve(ts.baseDir || repoRoot, tile.image);
      gidToImage.set(firstgid + Number(tile.id || 0), normalizeAssetPath(img));
    }
  }
  const gids = [...gidToImage.keys()].sort((a, b) => a - b);
  const tileImages = [];
  const gidToIndex = new Map();
  for (const gid of gids) {
    gidToIndex.set(gid, tileImages.length + 1);
    tileImages.push(gidToImage.get(gid));
  }
  return { tileImages, gidToIndex };
}

function normalizeGid(gid, gidToIndex) {
  const raw = Number(gid || 0) & 0x1fffffff;
  return raw ? (gidToIndex.get(raw) || 0) : 0;
}

function decodeTileData(layer, data, expected) {
  if (Array.isArray(data)) return data;
  if (layer.encoding !== 'base64' || typeof data !== 'string') return [];
  let buf = Buffer.from(data.trim(), 'base64');
  if (layer.compression === 'zlib') buf = zlib.inflateSync(buf);
  else if (layer.compression) throw new Error(`Unsupported tile compression: ${layer.compression}`);
  const out = [];
  for (let i = 0; i + 3 < buf.length && out.length < expected; i += 4) out.push(buf.readUInt32LE(i));
  return out;
}

function compactTileChunk(data) {
  if (!data.some(Boolean)) return null;
  const cells = [];
  const runs = [];
  for (let i = 0; i < data.length;) {
    const gid = data[i];
    if (!gid) {
      i++;
      continue;
    }
    const start = i;
    let len = 1;
    while (i + len < data.length && data[i + len] === gid) len++;
    for (let j = 0; j < len; j++) cells.push(start + j, gid);
    runs.push(start, len, gid);
    i += len;
  }
  return runs.length * 3 < cells.length ? { runs } : { cells };
}

function normalizedChunk(x, y, w, h, rawData, gidToIndex) {
  const data = rawData.map(gid => normalizeGid(gid, gidToIndex));
  const payload = compactTileChunk(data);
  return payload ? { x, y, w, h, ...payload } : null;
}

function collectTileLayers(map, gidToIndex) {
  const out = [];
  for (const layer of map.layers || []) {
    if (layer.type !== 'tilelayer' || layer.visible === false) continue;
    const chunks = [];
    if (Array.isArray(layer.chunks)) {
      for (const chunk of layer.chunks) {
        const rawData = decodeTileData(layer, chunk.data || [], Number(chunk.width || 0) * Number(chunk.height || 0));
        const ch = normalizedChunk(Number(chunk.x || 0), Number(chunk.y || 0), Number(chunk.width || 0), Number(chunk.height || 0), rawData, gidToIndex);
        if (ch) chunks.push(ch);
      }
    } else if (Array.isArray(layer.data)) {
      const rawData = decodeTileData(layer, layer.data, Number(layer.width || map.width || 0) * Number(layer.height || map.height || 0));
      const ch = normalizedChunk(Number(layer.x || 0), Number(layer.y || 0), Number(layer.width || map.width || 0), Number(layer.height || map.height || 0), rawData, gidToIndex);
      if (ch) chunks.push(ch);
    }
    out.push({
      name: layer.name,
      opacity: layer.opacity == null ? 1 : Number(layer.opacity),
      chunks
    });
  }
  return out;
}

function objectType(layerName, object) {
  if (object.type) return object.type;
  if (layerName.startsWith('Areas')) return 'area';
  const fallback = {
    Areas: 'area',
    SpawnZones: 'spawnZone',
    Facilities: 'facility',
    NPCs: 'npc',
    Stones: 'stone',
    RespawnPoints: 'respawn',
    Bosses: 'boss',
    Collision: 'collision',
    Decoration: 'deco'
  };
  return fallback[layerName] || 'object';
}

function polygonBounds(object) {
  if (!object.polygon || !object.polygon.length) return null;
  const xs = object.polygon.map(p => (object.x || 0) + p.x);
  const ys = object.polygon.map(p => (object.y || 0) + p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    x: Math.round(minX),
    y: Math.round(minY),
    w: Math.round(maxX - minX),
    h: Math.round(maxY - minY)
  };
}

function objectBase(layerName, object) {
  const props = propMap(object.properties);
  const bounds = polygonBounds(object);
  return {
    id: props.id || object.name || `${layerName}_${object.id}`,
    name: props.name || object.name || '',
    type: objectType(layerName, object),
    x: bounds ? bounds.x : Math.round(object.x || 0),
    y: bounds ? bounds.y : Math.round(object.y || 0),
    w: bounds ? bounds.w : Math.round(object.width || 0),
    h: bounds ? bounds.h : Math.round(object.height || 0),
    rotation: object.rotation || 0,
    polygon: object.polygon
      ? object.polygon.map(p => ({ x: Math.round((object.x || 0) + p.x), y: Math.round((object.y || 0) + p.y) }))
      : null,
    props
  };
}

function normalizeArea(layerName, object) {
  const o = objectBase(layerName, object);
  return {
    id: String(o.props.id || o.id),
    name: String(o.props.name || o.name || o.id),
    kind: String(o.props.kind || 'field'),
    level: Number(o.props.level || 1),
    theme: String(o.props.theme || ''),
    bgm: String(o.props.bgm || ''),
    rect: { x: o.x, y: o.y, w: o.w, h: o.h },
    polygon: o.polygon,
    props: o.props
  };
}

function normalizeSpawnZone(layerName, object) {
  const o = objectBase(layerName, object);
  const monster = String(o.props.monster || o.props.enemy || o.props.enemies || '').split(',')[0].trim();
  const baseLevel = o.props.baseLevel == null
    ? (o.props.level == null ? null : Number(o.props.level))
    : Number(o.props.baseLevel);
  const maxAlive = o.props.maxAlive == null
    ? (o.props.max == null ? null : Number(o.props.max))
    : Number(o.props.maxAlive);
  return {
    id: o.id,
    area: o.props.area || '',
    monster,
    baseLevel,
    levelVariance: Number(o.props.levelVariance == null ? 3 : o.props.levelVariance),
    maxAlive,
    spawnIntervalMin: Number(o.props.spawnIntervalMin == null ? 8 : o.props.spawnIntervalMin),
    spawnIntervalMax: Number(o.props.spawnIntervalMax == null ? 20 : o.props.spawnIntervalMax),
    minPlayerDistance: Number(o.props.minPlayerDistance == null ? 260 : o.props.minPlayerDistance),
    rareChance: Number(o.props.rareChance == null ? 0 : o.props.rareChance),
    eliteChance: Number(o.props.eliteChance == null ? 0 : o.props.eliteChance),
    respawn: o.props.respawn == null ? true : !!o.props.respawn,
    shape: object.ellipse ? 'circle' : String(o.props.shape || 'rect'),
    enemies: monster ? [monster] : String(o.props.enemies || '').split(',').map(s => s.trim()).filter(Boolean),
    level: baseLevel,
    rate: Number(o.props.rate == null ? 1 : o.props.rate),
    max: maxAlive,
    rect: { x: o.x, y: o.y, w: o.w, h: o.h },
    polygon: o.polygon,
    props: o.props
  };
}

function normalizePoint(layerName, object, keyName) {
  const o = objectBase(layerName, object);
  return {
    id: o.id,
    area: o.props.area || '',
    [keyName]: o.props[keyName] || o.props.type || object.type || '',
    name: o.name,
    x: o.x,
    y: o.y,
    props: o.props
  };
}

function normalizeCollision(layerName, object) {
  const o = objectBase(layerName, object);
  return {
    id: o.id,
    area: o.props.area || '',
    rect: { x: o.x, y: o.y, w: o.w, h: o.h },
    polygon: o.polygon,
    props: o.props
  };
}

function collectObjects(map, layerName, normalize) {
  const layer = layerByName(map, layerName);
  if (!layer) return [];
  if (layer.type !== 'objectgroup') {
    throw new Error(`${layerName} must be an object layer`);
  }
  return (layer.objects || []).map(o => normalize(layerName, o));
}

function collectAreaObjects(map) {
  const layers = (map.layers || []).filter(l => l.name === 'Areas' || l.name.startsWith('Areas_'));
  return layers.flatMap(layer => {
    if (layer.type !== 'objectgroup') {
      throw new Error(`${layer.name} must be an object layer`);
    }
    return (layer.objects || []).map(o => normalizeArea(layer.name, o));
  });
}

function validate(map, world) {
  const errors = [];
  if (!world.areas.length) errors.push('Missing area layers: Areas or Areas_*');
  for (const layer of map.layers || []) {
    if ((OBJECT_LAYERS.has(layer.name) || layer.name.startsWith('Areas_')) && layer.type !== 'objectgroup') {
      errors.push(`${layer.name} must be an object layer`);
    }
  }
  const areaIds = new Set();
  for (const area of world.areas) {
    if (!area.id) errors.push('Area without id');
    if (areaIds.has(area.id)) errors.push(`Duplicate area id: ${area.id}`);
    areaIds.add(area.id);
    if (!area.rect.w || !area.rect.h) errors.push(`Area ${area.id} has empty rect`);
  }
  for (const zone of world.spawnZones) {
    if (!zone.monster && !zone.enemies.length) errors.push(`Spawn zone ${zone.id} has no monster`);
    if (zone.area && !areaIds.has(zone.area)) errors.push(`Spawn zone ${zone.id} references missing area: ${zone.area}`);
  }
  for (const point of world.respawnPoints || []) {
    if (point.area && !areaIds.has(point.area)) errors.push(`Respawn point ${point.id} references missing area: ${point.area}`);
  }
  return errors;
}

function buildWorld(map) {
  const tiles = collectTilesets(map);
  return {
    version: 1,
    source: path.relative(repoRoot, input).replace(/\\/g, '/'),
    tileSize: map.tilewidth || 32,
    width: (map.width || 0) * (map.tilewidth || 32),
    height: (map.height || 0) * (map.tileheight || 32),
    infinite: !!map.infinite,
    areas: collectAreaObjects(map),
    spawnZones: collectObjects(map, 'SpawnZones', normalizeSpawnZone),
    facilities: collectObjects(map, 'Facilities', (layer, o) => normalizePoint(layer, o, 'facility')),
    npcs: collectObjects(map, 'NPCs', (layer, o) => normalizePoint(layer, o, 'npc')),
    stones: collectObjects(map, 'Stones', (layer, o) => normalizePoint(layer, o, 'spell')),
    respawnPoints: collectObjects(map, 'RespawnPoints', (layer, o) => normalizePoint(layer, o, 'respawn')),
    bosses: collectObjects(map, 'Bosses', (layer, o) => normalizePoint(layer, o, 'boss')),
    collisions: collectObjects(map, 'Collision', normalizeCollision),
    decorations: collectObjects(map, 'Decoration', (layer, o) => normalizePoint(layer, o, 'deco')),
    tileImages: tiles.tileImages,
    tileLayers: collectTileLayers(map, tiles.gidToIndex),
    chunks: []
  };
}

function writeWorld(world) {
  const body = `// Generated by editor/import-tiled-world.mjs. Do not edit by hand.\nwindow.AMC_WORLD_DATA=${JSON.stringify(world)};\n`;
  fs.writeFileSync(output, body, 'utf8');
}

if (!fs.existsSync(input)) {
  console.error(`Input not found: ${path.relative(repoRoot, input)}`);
  console.error('Create editor/world.tmj in Tiled, then run this importer again.');
  process.exit(1);
}

const tiledMap = readJson(input);
const world = buildWorld(tiledMap);
const errors = validate(tiledMap, world);
if (errors.length) {
  console.error('Tiled import failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

writeWorld(world);
console.log(`Imported ${world.areas.length} areas, ${world.spawnZones.length} spawn zones.`);
console.log(`Wrote ${path.relative(repoRoot, output)}`);
