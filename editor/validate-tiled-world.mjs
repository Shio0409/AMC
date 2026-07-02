#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const quietWarnings = args.includes('--quiet-warnings');
const inputArg = args.find(arg => !arg.startsWith('--')) || 'editor/AMC.tmj';
const input = path.resolve(repoRoot, inputArg);

const AREA_LAYERS = new Set(['Areas', 'Areas_Towns', 'Areas_Fields', 'Areas_Dungeons', 'Areas_Routes']);
const OBJECT_LAYERS = new Set([
  ...AREA_LAYERS,
  'SpawnZones',
  'Facilities',
  'NPCs',
  'Stones',
  'RespawnPoints',
  'Bosses',
  'Collision',
  'Decoration',
]);
const TOWN_KINDS = new Set(['town', 'village', 'camp', 'jail']);
const FACILITY_TYPES = new Set(['equip', 'smith', 'rune', 'jewel', 'alchemy', 'guild', 'market', 'bank', 'church']);
const AREA_KINDS = new Set(['town', 'village', 'camp', 'jail', 'field', 'dungeon', 'road']);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function propMap(properties) {
  const out = {};
  for (const p of properties || []) out[p.name] = p.value;
  return out;
}

function loadEnemyKeys() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.resolve(repoRoot, 'enemies.js'), 'utf8'), sandbox, { filename: 'enemies.js' });
  return new Set(Object.keys(sandbox.window.AMC_ENEMIES?.ET || {}));
}

function layerObjects(map, name) {
  const layer = (map.layers || []).find(l => l.name === name);
  if (!layer) return [];
  return (layer.objects || []).map(o => ({ layer: name, object: o, props: propMap(o.properties) }));
}

function allAreaObjects(map) {
  return (map.layers || [])
    .filter(l => AREA_LAYERS.has(l.name))
    .flatMap(l => (l.objects || []).map(o => ({ layer: l.name, object: o, props: propMap(o.properties) })));
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

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function objectLabel(entry) {
  return `${entry.layer}:${entry.object.name || entry.props.id || entry.object.id}`;
}

function collectAreas(map, errors, warnings) {
  const areas = [];
  const ids = new Set();
  const names = new Map();
  for (const entry of allAreaObjects(map)) {
    const id = String(entry.props.id || entry.object.name || '').trim();
    const name = String(entry.props.name || entry.object.name || id).trim();
    const kind = String(entry.props.kind || 'field').trim();
    const bounds = boundsOf(entry.object);
    const polygon = absolutePolygon(entry.object);
    if (!id) errors.push(`${objectLabel(entry)} area id is required`);
    if (ids.has(id)) errors.push(`duplicate area id: ${id}`);
    ids.add(id);
    if (name) {
      const prev = names.get(name);
      if (prev && prev !== id) warnings.push(`area name is duplicated: ${name} (${prev}, ${id})`);
      names.set(name, id);
    }
    if (!AREA_KINDS.has(kind)) warnings.push(`${id} uses unknown area kind: ${kind}`);
    if (bounds.w <= 0 || bounds.h <= 0) errors.push(`${id} has empty area size`);
    if (entry.object.polygon && entry.object.polygon.length < 3) errors.push(`${id} polygon must have at least 3 points`);
    const level = Number(entry.props.level || 1);
    if (!Number.isFinite(level) || level < 1) errors.push(`${id} has invalid level: ${entry.props.level}`);
    areas.push({ id, name, kind, bounds, polygon, entry, level });
  }
  if (!areas.length) errors.push('no areas found. Add Areas or Areas_* object layer entries.');

  return areas;
}

function referencedArea(entry, areas, errors) {
  const areaId = String(entry.props.area || '').trim();
  if (!areaId) {
    errors.push(`${objectLabel(entry)} must set area property`);
    return null;
  }
  const area = areas.find(a => a.id === areaId);
  if (!area) errors.push(`${objectLabel(entry)} references missing area: ${areaId}`);
  return area || null;
}

function validatePointLayer(name, areas, errors, warnings, validateType) {
  for (const entry of layerObjects(map, name)) {
    const area = referencedArea(entry, areas, errors);
    if (area && !pointInArea(centerOf(entry.object), area)) {
      warnings.push(`${objectLabel(entry)} is outside its area: ${area.id}`);
    }
    validateType?.(entry, errors, warnings);
  }
}

function validateSpawnZones(map, areas, enemyKeys, errors, warnings) {
  const zones = layerObjects(map, 'SpawnZones');
  const byArea = new Map();
  for (const entry of zones) {
    const area = referencedArea(entry, areas, errors);
    const monsterRaw = String(entry.props.monster || entry.props.enemy || entry.props.enemies || '').trim();
    const monsters = monsterRaw.split(',').map(s => s.trim()).filter(Boolean);
    if (monsters.length !== 1) errors.push(`${objectLabel(entry)} must contain exactly one monster`);
    if (monsters[0] && !enemyKeys.has(monsters[0])) errors.push(`${objectLabel(entry)} references unknown monster: ${monsters[0]}`);
    if (entry.object.polygon) errors.push(`${objectLabel(entry)} must be rect or ellipse, not polygon`);
    if (entry.object.ellipse && entry.object.width !== entry.object.height) warnings.push(`${objectLabel(entry)} circle spawn should use equal width/height`);
    const baseLevel = Number(entry.props.baseLevel ?? entry.props.level);
    if (!Number.isFinite(baseLevel) || baseLevel < 1) errors.push(`${objectLabel(entry)} has invalid baseLevel`);
    const variance = Number(entry.props.levelVariance ?? 3);
    if (!Number.isFinite(variance) || variance < 0 || variance > 8) errors.push(`${objectLabel(entry)} has invalid levelVariance`);
    const maxAlive = Number(entry.props.maxAlive ?? entry.props.max);
    if (!Number.isFinite(maxAlive) || maxAlive < 1) errors.push(`${objectLabel(entry)} has invalid maxAlive`);
    const minT = Number(entry.props.spawnIntervalMin ?? 8), maxT = Number(entry.props.spawnIntervalMax ?? 20);
    const respawn = entry.props.respawn == null ? true : !!entry.props.respawn;
    if (!Number.isFinite(minT) || !Number.isFinite(maxT) || minT < 0 || maxT < minT || (respawn && minT <= 0)) errors.push(`${objectLabel(entry)} has invalid spawn interval`);
    const minDist = Number(entry.props.minPlayerDistance ?? 260);
    if (!Number.isFinite(minDist) || minDist < 0) errors.push(`${objectLabel(entry)} has invalid minPlayerDistance`);
    const rect = boundsOf(entry.object);
    if (rect.w <= 0 || rect.h <= 0) errors.push(`${objectLabel(entry)} has empty spawn size`);
    if (area) {
      if (TOWN_KINDS.has(area.kind)) errors.push(`${objectLabel(entry)} is inside town area: ${area.id}`);
      if (!pointInArea(centerOf(entry.object), area)) errors.push(`${objectLabel(entry)} center is outside its area: ${area.id}`);
      if (!byArea.has(area.id)) byArea.set(area.id, []);
      byArea.get(area.id).push({ entry, rect });
      if (Math.abs(baseLevel - area.level) > 8) warnings.push(`${objectLabel(entry)} baseLevel ${baseLevel} is far from area ${area.id} level ${area.level}`);
    }
  }
  for (const list of byArea.values()) {
    for (let i = 0; i < list.length; i++) {
      let count = 0;
      for (let j = 0; j < list.length; j++) if (i !== j && rectsOverlap(list[i].rect, list[j].rect)) count++;
      if (count > 1) errors.push(`${objectLabel(list[i].entry)} overlaps more than one spawn zone`);
    }
  }
}

function validateTownGuilds(areas, facilities, warnings) {
  const guildAreas = new Set(
    facilities
      .filter(e => String(e.props.facility || e.props.type || '').trim() === 'guild')
      .map(e => String(e.props.area || '').trim()),
  );
  for (const area of areas) {
    if (TOWN_KINDS.has(area.kind) && area.id !== 'macroJail' && !guildAreas.has(area.id)) {
      warnings.push(`town area has no guild facility: ${area.id}`);
    }
  }
}

if (!fs.existsSync(input)) {
  console.error(`Tiled file not found: ${path.relative(repoRoot, input)}`);
  process.exit(1);
}

const map = readJson(input);
const errors = [];
const warnings = [];

for (const layer of map.layers || []) {
  if ((OBJECT_LAYERS.has(layer.name) || layer.name.startsWith('Areas_')) && layer.type !== 'objectgroup') {
    errors.push(`${layer.name} must be an object layer`);
  }
}

const enemyKeys = loadEnemyKeys();
const areas = collectAreas(map, errors, warnings);

for (const layerName of ['Ground', 'Detail']) {
  const layer = (map.layers || []).find(l => l.name === layerName);
  if (!layer) errors.push(`missing tile layer: ${layerName}`);
  else if (layer.type !== 'tilelayer') errors.push(`${layerName} must be a tile layer`);
}
if (!Array.isArray(map.tilesets) || !map.tilesets.some(t => t.source === 'maptiles.tsj')) {
  errors.push('AMC.tmj must reference editor/maptiles.tsj');
} else {
  const tilesetPath = path.resolve(path.dirname(input), 'maptiles.tsj');
  if (!fs.existsSync(tilesetPath)) errors.push('missing editor/maptiles.tsj');
  else {
    const tileset = readJson(tilesetPath);
    if (!Array.isArray(tileset.tiles) || !tileset.tiles.length) errors.push('editor/maptiles.tsj has no tiles');
  }
}

validateSpawnZones(map, areas, enemyKeys, errors, warnings);
const facilities = layerObjects(map, 'Facilities');
validatePointLayer('Facilities', areas, errors, warnings, (entry, errs) => {
  const type = String(entry.props.facility || entry.props.type || '').trim();
  if (!FACILITY_TYPES.has(type)) errs.push(`${objectLabel(entry)} has invalid facility: ${type || '(empty)'}`);
});
validatePointLayer('NPCs', areas, errors, warnings, null);
validatePointLayer('Stones', areas, errors, warnings, null);
validatePointLayer('RespawnPoints', areas, errors, warnings, null);
validatePointLayer('Bosses', areas, errors, warnings, null);
validateTownGuilds(areas, facilities, warnings);

if (!quietWarnings) for (const warning of warnings) console.warn(`warning: ${warning}`);
if (errors.length) {
  console.error('Tiled validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Tiled validation ok: ${areas.length} areas, ${layerObjects(map, 'SpawnZones').length} spawn zones.`);
