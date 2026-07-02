import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const src = fs.readFileSync('index.html', 'utf8');
const scripts = [...src.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map((m) => m[1])
  .filter((body) => body.trim());
const script = scripts.at(-1);
if (!script) throw new Error('script block not found');

new Function(script);

const externalScripts = ['maps.js', 'enemies.js', 'bestiary.js', 'enemy_spells.js', 'boss_patterns.js', 'npc_dialogue.js', 'world_data.js']
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n');
const allSrc = `${src}\n${externalScripts}`;

function loadGameGlobals() {
  const instrumented = script.replace(
    /\}\)\(\);\s*$/,
    `globalThis.__AMC_CHECK__ = { SPELLS, ENEMY_SPELLS, visibleSpellList, MAGIC_OBJECT_HANDLERS, AI_STATES, DEMON_AI_STATES, BOSS_PATTERN_ACTIONS, COMBAT_BALANCE, packSave: typeof packSave, applyPlayerState: typeof applyPlayerState, SAVE_VERSION };\n})();`,
  );
  if (instrumented === script) throw new Error('script instrumentation point not found');
  const sandbox = `
    var window = globalThis;
    var performance = { now: () => 0 };
    var localStorage = { getItem(){return null}, setItem(){}, removeItem(){} };
    var document = {
      cookie: '',
      getElementById(id) {
        if (id === 'game') return { width: 900, height: 600, getContext(){ return new Proxy({}, { get(){ return function(){}; }, set(){ return true; } }); }, addEventListener(){} };
        return { value: '', textContent: '', addEventListener(){}, style: {} };
      },
      addEventListener(){},
    };
    var Image = function(){ this.complete = false; this.naturalWidth = 0; };
    var AudioContext = function(){};
    var webkitAudioContext = AudioContext;
    var navigator = {};
    var indexedDB = null;
    var addEventListener = function(){};
    var requestAnimationFrame = function(){};
  `;
  return new Function(`${sandbox}\n${externalScripts}\n${instrumented}\nreturn globalThis.__AMC_CHECK__;`)();
}

const required = [
  'projectiles',
  'magicObjects',
  'MAGIC_OBJECT_HANDLERS',
  'SPELL_ACTION_HANDLERS',
  'syncCombatEvent',
  'packPlayerState',
  'applyPlayerState',
  'unitRef',
  'startDungeon',
  'buildDungeonMap',
  'advanceDungeonFloor',
  'dungeonBossCleared',
  'spawnDungeonFloorContents',
  'NPC_KEYWORD_REPLIES',
  'npcRespondToSpeech',
  'macroFlush',
  'macroFinalize',
  'macroSubmit',
];

for (const name of required) {
  if (!allSrc.includes(name)) throw new Error(`missing ${name}`);
}

if (src.includes('const NPC_KEYWORD_REPLIES=[')) {
  throw new Error('NPC keyword replies must stay in npc_dialogue.js');
}
if (!externalScripts.includes('AMC_NPC_KEYWORD_REPLIES')) {
  throw new Error('npc_dialogue.js is not loaded');
}

{
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('npc_dialogue.js', 'utf8'), ctx);
  const rows = ctx.window.AMC_NPC_KEYWORD_REPLIES || [];
  const kana = /^[\u3041-\u3096\u30fc]+$/;
  const nonKanaKeys = [];
  rows.forEach((row, index) => {
    for (const key of row.keys || []) {
      if (!kana.test(key)) nonKanaKeys.push(`${index}:${key}`);
    }
  });
  if (nonKanaKeys.length) throw new Error(`NPC dialogue keys must be hiragana only: ${nonKanaKeys.join(', ')}`);
}

if (/\b(?:shots|eshots)\s*=\s*\[/.test(src)) {
  throw new Error('legacy shot arrays are back');
}

{
  const rawPendingPushes = [...src.matchAll(/pending\.push/g)].length;
  if (rawPendingPushes !== 1 || !src.includes('function schedulePending')) {
    throw new Error('pending queue must go through schedulePending');
  }
}

if (/useMapPortal|MAP\.portals|\.portals/.test(src) || /\.portals/.test(fs.readFileSync('maps.js', 'utf8'))) {
  throw new Error('legacy portal references are back in game code');
}
if (/WORLD_W\s*\/\s*r\.w/.test(src)) {
  throw new Error('Tiled area rendering must not normalize every area to WORLD_W');
}

for (const needle of [
  'world_data.js',
  'function findWorldAreaAt',
  'function switchWorldEdgeIfNeeded',
  'function drawMinimap',
  'miniZoom',
  'a.minimap',
  'seedMapEnemies(id,enemies)',
  'function drawTiledTileLayers',
  'function tiledWorldActive',
  'function drawTileScaled',
  'function tiledGroundCfg',
  'function pickTiledFallbackTile',
  'function drawTiledFallbackGround',
  'drawTiledFallbackGround(area,view,ts,dw,dh)',
  'function worldLocalScale',
  'function areaLocalScale',
  'function areaLocalWidth',
  'function areaLocalHeight',
  'function clampUnitToMap',
  'function areaLocalRawPoint',
  'if(tiledWorldActive()){drawTiledTileLayers',
  'if(!tiledWorldActive())for(const d of MAP.decos)',
  'const lw=areaLocalWidth(a),lh=areaLocalHeight(a)',
  'dh=dw',
  'WORLD_DATA.tileLayers',
  'WORLD_DATA.tileImages',
  'function playerWorldPos',
  'function syncPlayerWorldPos',
  'function savedWorldSpawn',
  'function movePlayerWorld',
  'function setPlayerWorld',
  'function worldPointRef',
  'function syncPointWorld',
  'function syncUnitWorld',
  'function randomLocalPoint',
  'function syncEnemyWorld',
  'function syncBossWorld',
  'function syncDemonWorld',
  'function syncProjectileWorld',
  'function syncMagicWorld',
  'function syncNpcWorld',
  'function unitDistance',
  'function inPlayerView',
  'function combatActiveNearPlayer',
  'function despawnFarFromPlayer',
  'function transientObjectAlive',
  'function relocalizeWorldObject',
  'function carrySeamlessObjects',
  'function showAreaName',
  'function drawAreaName',
  'function drawWorldDecorations',
  'function drawWorldFacilities',
  'function drawWorldFieldStones',
  'function drawWorldTreasureChests',
  'function drawWorldNpcs',
  'function mpVisualSpellLocal',
  'function mpWorldEventLocal',
  'mpWorldEventLocal(msg,PROJECTILE_PAD)',
  'mpWorldEventLocal(msg,360)',
  'mpWorldEventLocal(m,260)',
  'syncPointWorld(payload.map,payload.x,payload.y)',
  'function cachedEnemiesNearPlayer',
  'function visibleWorldEnemies',
  'function processCachedEnemyDeaths',
  'function processWorldBossDeaths',
  'function drawWorldEnemies',
  'mapRuntime',
  'function saveMapRuntime',
  'function restoreMapRuntime',
  'function ensureNearbyMapRuntime',
  'function ageMapRuntimeCaches',
  'function pruneMapRuntimeAround',
  'function minimapWorldFacilities',
  'function minimapWorldStones',
  'function syncWeatherWorld',
  'wrect:z.rect',
  'wx:p.wx',
  'syncEnemyWorld(en)',
  'syncBossWorld(b)',
  'syncDemonWorld(d)',
  'syncProjectileWorld(o)',
  'syncMagicWorld(o)',
  'function syncChestWorld',
  'syncChestWorld({',
  'function unitMap',
  'function pointUnit',
  'function pointDistance',
  'function unitAim',
  'function pointAim',
  'function currentWorldView',
  'function currentLocalFromWorld',
  'function withCurrentLocal',
  'function worldObjInView',
  'function displayUnit',
  'function displayPoint',
  'function worldNearPlayer',
  'unitDistance(P,',
  'pointDistance(map,x,y',
  'syncWeatherWorld({',
  'syncWeatherWorld(w)',
  'despawnFarFromPlayer(e)',
  'transientObjectAlive(s',
  'carrySeamlessObjects(id',
  'seamless?0.18:1',
  'showAreaName(MAP.name,seamless)',
  'drawAreaName();',
  'saveMapRuntime(MAPID)',
  'oldPending=seamless?pending.filter',
  'function schedulePending',
  'function tickPending',
  'tickPending(dt)',
  'schedulePending(i*delay',
  'pending=oldPending||[]',
  'syncEnemyWorld({...e,map:id})',
  'syncUnitWorld({...c},id',
  'restoreMapRuntime(id)',
  'ensureNearbyMapRuntime(id)',
  'ageMapRuntimeCaches()',
  'mapRuntime.values()',
  'useWorld&&Number.isFinite(n.wx)',
  'useWorld&&Number.isFinite(p.wx)',
  'useWorld&&Number.isFinite(d.wx)',
  'for(const b of bosses.values())',
  'wa:P.worldArea',
  'wx:Math.round(P.wx',
  'twx:tw.wx',
  'twy:tw.wy',
  'wx:Number.isFinite(msg.wx)',
  'savedWorldSpawn(d)',
  'function tiledSettlementKind',
  "town=tiledSettlementKind(a.kind)",
  "function townSpawn(id)",
  "facilities.find(f=>f.type==='guild')",
  'const sp=townSpawn(a.id)',
  'townSpawn(town)',
  'townSpawn(id)',
]) {
  if (!src.includes(needle)) throw new Error(`Tiled world runtime hook missing: ${needle}`);
}

{
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('world_data.js', 'utf8'), ctx);
  const world = ctx.window.AMC_WORLD_DATA;
  if (!world || !Array.isArray(world.tileImages) || world.tileImages.length < 1) {
    throw new Error('world_data.js must include tileImages from editor/maptiles.tsj');
  }
  if (!Array.isArray(world.tileLayers) || !world.tileLayers.some((l) => l.name === 'Ground')) {
    throw new Error('world_data.js must include Tiled tileLayers');
  }
  if (!world.tileLayers.some((l) => Array.isArray(l.chunks) && l.chunks.length > 0)) {
    throw new Error('world_data.js must include painted Tiled tile chunks');
  }
  if (!Array.isArray(world.decorations) || world.decorations.length < 1) {
    throw new Error('world_data.js must include Tiled Decoration objects');
  }
  const settlements = new Set(['town', 'village', 'camp']);
  const guildAreas = new Set((world.facilities || [])
    .filter((f) => (f.facility || (f.props && f.props.facility)) === 'guild')
    .map((f) => f.area));
  const missingGuild = (world.areas || [])
    .filter((a) => settlements.has(a.kind) && !guildAreas.has(a.id))
    .map((a) => a.id);
  if (missingGuild.length) {
    throw new Error(`settlement areas missing guild facility: ${missingGuild.join(', ')}`);
  }
  if (!fs.existsSync('editor/maptiles.tsj')) {
    throw new Error('editor/maptiles.tsj is required for Tiled map chips');
  }
}

for (const pattern of [
  /for\s*\(\s*let\s+i\s*=\s*0\s*;\s*i\s*<\s*5\s*;\s*i\+\+\s*\)\s*spawnEnemy/,
  /while\s*\(\s*enemies\.length\s*\+\s*enemyRespawns\.length\s*<\s*cap\s*\)/,
]) {
  if (pattern.test(src)) throw new Error(`legacy random map spawn loop is back: ${pattern}`);
}

const directMagicPush = [
  'zones',
  'funnels',
  'rays',
  'totems',
  'summons',
  'rains',
  'orbits',
].filter((name) => new RegExp(`\\b${name}\\.push\\s*\\(`).test(src));

if (directMagicPush.length) {
  throw new Error(`direct magic object push found: ${directMagicPush.join(', ')}`);
}

const kinds = [...new Set([...src.matchAll(/kind:\s*['"]([^'"]+)/g)].map((m) => m[1]))].sort();
const handled = new Set([
  'self', 'meteo', 'mix', 'impact', 'front', 'fan', 'zone', 'aura', 'multi',
  'funnel', 'ray', 'totem', 'summon', 'rain', 'orbit', 'blink', 'guard',
  'donut', 'pulse', 'return', 'teleport', 'resurrect', 'utility', 'heal',
  'buff', 'melee', 'charge', 'enemyArea', 'bolt', 'pierce', 'enemyMelee',
  'enemyCharge',
]);
const missing = kinds.filter((kind) => !handled.has(kind));
if (missing.length) throw new Error(`unhandled spell kinds: ${missing.join(', ')}`);

const game = loadGameGlobals();

if (!game.COMBAT_BALANCE || !game.COMBAT_BALANCE.enemyRanged || !game.COMBAT_BALANCE.boss) {
  throw new Error('combat balance tables are not loaded');
}

for (const state of ['wander', 'approach', 'windup', 'dash', 'recover']) {
  if (!game.AI_STATES || typeof game.AI_STATES[state] !== 'function') {
    throw new Error(`AI_STATES.${state} missing`);
  }
}

for (const state of ['cool', 'approach', 'cast']) {
  if (!game.DEMON_AI_STATES || typeof game.DEMON_AI_STATES[state] !== 'function') {
    throw new Error(`DEMON_AI_STATES.${state} missing`);
  }
}

if (!Array.isArray(game.BOSS_PATTERN_ACTIONS) || game.BOSS_PATTERN_ACTIONS.length < 7) {
  throw new Error('BOSS_PATTERN_ACTIONS must cover boss pattern slots');
}

const spellsWithoutTypeDef = game.SPELLS.filter((s) => !s.typeDef).map((s) => s.name);
if (spellsWithoutTypeDef.length) {
  throw new Error(`SPELLS without typeDef: ${spellsWithoutTypeDef.join(', ')}`);
}

const visibleEnemySpells = game.visibleSpellList().filter((s) => s.enemyOnly).map((s) => s.name);
if (visibleEnemySpells.length) {
  throw new Error(`enemyOnly spells visible: ${visibleEnemySpells.join(', ')}`);
}

for (const kind of ['zone', 'funnel', 'ray', 'totem', 'summon', 'rain', 'orbit']) {
  const handler = game.MAGIC_OBJECT_HANDLERS[kind];
  if (!handler || typeof handler.update !== 'function' || typeof handler.draw !== 'function') {
    throw new Error(`MAGIC_OBJECT_HANDLERS.${kind} must have update and draw`);
  }
}

const spellSet = new Set(game.SPELLS);
const missingEnemySpells = Object.values(game.ENEMY_SPELLS).filter((s) => !spellSet.has(s)).map((s) => s.name);
if (missingEnemySpells.length) {
  throw new Error(`ENEMY_SPELLS not registered in SPELLS: ${missingEnemySpells.join(', ')}`);
}

for (const needle of ['mpu:P.macroPenaltyUntil', 'P.macroPenaltyUntil=d.mpu']) {
  if (!src.includes(needle)) throw new Error(`macro penalty save/apply missing: ${needle}`);
}

{
  const result = spawnSync(process.execPath, ['editor/validate-tiled-world.mjs', '--quiet-warnings'], {
    stdio: 'inherit',
    shell: false,
  });
  if (result.status !== 0) throw new Error('Tiled world validation failed');
}

console.log('game static checks ok');
