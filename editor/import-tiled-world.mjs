#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
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

function objectType(layerName, object) {
  if (object.type) return object.type;
  if (layerName.startsWith('Areas')) return 'area';
  const fallback = {
    Areas: 'area',
    SpawnZones: 'spawnZone',
    Facilities: 'facility',
    NPCs: 'npc',
    Stones: 'stone',
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
  return {
    id: o.id,
    area: o.props.area || '',
    enemies: String(o.props.enemies || '').split(',').map(s => s.trim()).filter(Boolean),
    level: o.props.level == null ? null : Number(o.props.level),
    rate: Number(o.props.rate == null ? 1 : o.props.rate),
    max: o.props.max == null ? null : Number(o.props.max),
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
    if (!zone.enemies.length) errors.push(`Spawn zone ${zone.id} has no enemies`);
    if (zone.area && !areaIds.has(zone.area)) errors.push(`Spawn zone ${zone.id} references missing area: ${zone.area}`);
  }
  return errors;
}

function buildWorld(map) {
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
    bosses: collectObjects(map, 'Bosses', (layer, o) => normalizePoint(layer, o, 'boss')),
    collisions: collectObjects(map, 'Collision', normalizeCollision),
    decorations: collectObjects(map, 'Decoration', (layer, o) => normalizePoint(layer, o, 'deco')),
    chunks: []
  };
}

function writeWorld(world) {
  const body = `// Generated by editor/import-tiled-world.mjs. Do not edit by hand.\nwindow.AMC_WORLD_DATA = ${JSON.stringify(world, null, 2)};\n`;
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
