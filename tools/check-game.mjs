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

{
  const facilityFiles = [
    'alchemyshop.png',
    'bank.png',
    'blacksmith.png',
    'church.png',
    'equipmentshop.png',
    'guild.png',
    'jeweryshop.png',
    'market.png',
    'runeshop.png',
  ];
  for (const file of facilityFiles) {
    if (!fs.existsSync(`assets/facility/${file}`)) throw new Error(`missing facility asset: ${file}`);
  }
  for (const needle of ['FACILITY_IMG_FILES', 'facilityImage', 'drawFacilityFallback', ...facilityFiles]) {
    if (!src.includes(needle)) throw new Error(`facility image rendering is missing: ${needle}`);
  }
}

{
  if (!fs.existsSync('assets/fonts/madoufmg.ttf')) {
    throw new Error('missing UI font asset: assets/fonts/madoufmg.ttf');
  }
  for (const needle of ['@font-face', 'MadouFmg', 'UI_FONT_STACK', 'applyUiFontSpec', 'installCanvasFont', 'loadUiFont()', 'LOGICAL_W=900', 'resizeCanvasForDisplay', 'setCanvasTransform', 'devicePixelRatio', 'const W=LOGICAL_W,H=LOGICAL_H', 'Promise.all([loadInitialSave(),loadUiFont()])']) {
    if (!src.includes(needle)) throw new Error(`UI font hook missing: ${needle}`);
  }
  if (src.includes('ctx.setTransform(1,0,0,1,0,0)')) {
    throw new Error('canvas must reset to the logical high-DPI transform, not raw identity');
  }
}

{
  const playerDirs = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];
  const playerAnimSets = [
    ['A_cute_mage_girl_with/animations/Breathing_Idle', 4],
    ['A_cute_mage_girl_with/animations/Walk', 6],
    ['casting_spells/animations/Cross_Punch', 6],
  ];
  if (!fs.existsSync('assets/player/Player/metadata.json')) {
    throw new Error('missing player animation metadata');
  }
  for (const dir of playerDirs) {
    for (const [base, frames] of playerAnimSets) {
      for (let i = 0; i < frames; i += 1) {
        const file = `assets/player/Player/${base}/${dir}/frame_${String(i).padStart(3, '0')}.png`;
        if (!fs.existsSync(file)) throw new Error(`missing player animation frame: ${file}`);
      }
    }
  }
  for (const needle of ['PLAYER_ASSET_BASE', 'PLAYER_ANIMS', 'PLAYER_LAST_READY', 'playerPathInfo', 'playerFramePath', 'preloadPlayerFrames', 'playerFaceDir8', 'playerVisualState', 'remotePlayerVisualState', 'startPlayerCastAnim', 'castAnimT']) {
    if (!src.includes(needle)) throw new Error(`player animation runtime hook missing: ${needle}`);
  }
  for (const removed of ['PLAYER_SPRITES', 'if(!drawPlayerSprite())', 'ctx.arc(x,y-30,18']) {
    if (src.includes(removed)) throw new Error(`old player fallback rendering is back: ${removed}`);
  }
}

{
  const loreFiles = [
    'index.html',
    '設定資料/AMC.md',
    '設定資料/game_design_bible.md',
    '設定資料/quest_story_design.md',
  ].filter((file) => fs.existsSync(file));
  const forbiddenStoryTerms = ['真エンド', '真エンディング', '真の結末', '賢者の記録中枢', '世界の記録中枢', '記録中枢'];
  for (const file of loreFiles) {
    const text = fs.readFileSync(file, 'utf8');
    for (const term of forbiddenStoryTerms) {
      if (text.includes(term)) throw new Error(`forbidden story term in ${file}: ${term}`);
    }
  }
}

function loadGameGlobals() {
  const instrumented = script.replace(
    /\}\)\(\);\s*$/,
    `globalThis.__AMC_CHECK__ = { P, MAPS, WORLD_DATA, npcs, SPELLS, ENEMY_SPELLS, visibleSpellList, MAGIC_OBJECT_HANDLERS, AI_STATES, DEMON_AI_STATES, BOSS_PATTERN_ACTIONS, COMBAT_BALANCE, TITLE_PARTS, TITLE_FRONTS, TITLE_BACKS, TITLE_EFFECT_POOL, questCanonicalKey, questKeyMatches, questKillKey, progressKillQuests, normalizeQuest, unpackQuest, packSave: typeof packSave, applyPlayerState: typeof applyPlayerState, SAVE_VERSION };\n})();`,
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
if (!externalScripts.includes('AMC_NPC_KEYWORD_REPLIES_BY_NPC')) {
  throw new Error('NPC-specific keyword replies are not loaded');
}

{
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('npc_dialogue.js', 'utf8'), ctx);
  const townDataStart = src.indexOf('const TOWN_NPC_DATA=');
  const townDataEnd = src.indexOf('const NPC_RUNE_POOL=', townDataStart);
  if (townDataStart < 0 || townDataEnd < 0) throw new Error('TOWN_NPC_DATA block not found');
  const townNpcData = new Function(`return ${src.slice(townDataStart + 'const TOWN_NPC_DATA='.length, townDataEnd).trim().replace(/;\s*$/, '')}`)();
  const kana = /^[\u3041-\u3096\u30fc]+$/;
  const nonKanaKeys = [];
  const emptyReplies = [];
  const asArray = (v) => v == null ? [] : (Array.isArray(v) ? v : [v]).map((x) => String(x || '').trim()).filter(Boolean);
  const splitKeys = (v) => asArray(v).flatMap((key) => String(key).split(/[|,、]/).map((x) => x.trim()).filter(Boolean));
  const rowsFrom = (src) => {
    if (Array.isArray(src)) return src;
    if (src && typeof src === 'object') return Object.entries(src).map(([keys, replies]) => ({ keys: splitKeys(keys), replies }));
    return [];
  };
  const rowKeys = (row) => {
    if (Array.isArray(row)) return splitKeys(row[0]);
    if (row && typeof row === 'object') return splitKeys(row.keys || row.key || row.words || row.word || row.triggers || row.trigger);
    return [];
  };
  const rowReplies = (row) => {
    if (Array.isArray(row)) return asArray(row[1]);
    if (row && typeof row === 'object') return asArray(row.replies || row.reply || row.lines || row.line || row.responses || row.response);
    return [];
  };
  const checkRows = (src, label) => {
    rowsFrom(src).forEach((row, index) => {
      const keys = rowKeys(row);
      const replies = rowReplies(row);
      for (const key of keys) {
        if (!kana.test(key)) nonKanaKeys.push(`${label}:${index}:${key}`);
      }
      if (keys.length && !replies.length) emptyReplies.push(`${label}:${index}`);
    });
  };
  checkRows(ctx.window.AMC_NPC_KEYWORD_REPLIES || [], 'default');
  const byNpc = ctx.window.AMC_NPC_KEYWORD_REPLIES_BY_NPC || {};
  if (!Object.keys(byNpc).length) throw new Error('NPC-specific keyword replies are empty');
  const expectedNpcIds = Object.entries(townNpcData)
    .flatMap(([home, list]) => (Array.isArray(list) ? list : []).map((row) => `${home}:${row[0]}`))
    .concat(['チュートリアル案内人']);
  const missingNpcIds = expectedNpcIds.filter((id) => !byNpc[id]);
  if (missingNpcIds.length) {
    throw new Error(`NPC-specific keyword replies missing NPCs: ${missingNpcIds.join(', ')}`);
  }
  const emptyNpcRows = [];
  for (const [npcId, rows] of Object.entries(byNpc)) {
    if (!String(npcId).trim()) throw new Error('NPC-specific keyword reply has an empty NPC id');
    checkRows(rows, `npc:${npcId}`);
    if (!rowsFrom(rows).some((row) => rowKeys(row).length && rowReplies(row).length)) emptyNpcRows.push(npcId);
  }
  if (emptyNpcRows.length) {
    throw new Error(`NPC-specific keyword reply has no usable rows: ${emptyNpcRows.join(', ')}`);
  }
  if (emptyReplies.length) {
    throw new Error(`NPC dialogue rows must have at least one reply: ${emptyReplies.join(', ')}`);
  }
  if (nonKanaKeys.length) {
    throw new Error(`NPC dialogue keys must be hiragana only: ${nonKanaKeys.join(', ')}`);
  }
}

if (/\b(?:shots|eshots)\s*=\s*\[/.test(src)) {
  throw new Error('removed shot arrays are back');
}

{
  const rawPendingPushes = [...src.matchAll(/pending\.push/g)].length;
  if (rawPendingPushes !== 1 || !src.includes('function schedulePending')) {
    throw new Error('pending queue must go through schedulePending');
  }
}

if (/useMapPortal|MAP\.portals|\.portals/.test(src) || /\.portals/.test(fs.readFileSync('maps.js', 'utf8'))) {
  throw new Error('removed portal references are back in game code');
}
if (/WORLD_W\s*\/\s*r\.w/.test(src)) {
  throw new Error('Tiled area rendering must not normalize every area to WORLD_W');
}
if (src.includes('const lw=area' + 'LocalWidth(a),lh=area' + 'LocalHeight(a),probes=[]')) {
  throw new Error('removed edge probe area switching is back');
}
for (const removedPattern of [
  'function switchWorldEdgeIfNeeded',
  'function switchToWorldAreaAt',
  'function re' + 'localizeWorldObject',
  'function carry' + 'SeamlessObjects',
  'function world' + 'LocalScale',
  'function area' + 'LocalScale',
  'function area' + 'LocalWidth',
  'function area' + 'LocalHeight',
  'function area' + 'LocalRawPoint',
  'function clampUnit' + 'ToMap',
  'function random' + 'LocalPoint',
  'function current' + 'LocalFromWorld',
  'function with' + 'CurrentLocal',
  'carry' + 'SeamlessObjects(id',
  'old' + 'Projectiles=' + 'sea' + 'mless',
  'old' + 'MagicObjects=' + 'sea' + 'mless',
  'seam' + 'less?0.18:1',
  'old' + 'Pending=' + 'sea' + 'mless',
  'P.transitionLockT=' + 'sea' + 'mless',
  'keepWorld' + 'State',
  'switch' + 'Map(area.id',
]) {
  if (src.includes(removedPattern)) throw new Error(`removed map transition is back: ${removedPattern}`);
}

for (const needle of [
  'world_data.js',
  'function findWorldAreaAt',
  'function drawMinimap',
  'miniZoom',
  'a.minimap',
  'seedMapEnemies(id,enemies)',
  'function drawTiledTileLayers',
  'function drawTiledTileImage',
  'function tiledWorldActive',
  'function drawTileScaled',
  'ch.runs',
  'function tiledWorldBackdrop',
  'tiledWorldActive()?tiledWorldBackdrop():MAP.ground',
  'function clampUnitToDungeon',
  'function settleUnitWorldPosition',
  'function randomWorldPoint',
  'if(tiledWorldActive()){drawTiledTileLayers',
  'for(const d of MAP.decos)',
  'function updateCachedWorldEnemies',
  'updateCachedWorldEnemies(dt)',
  'function runtimeForMap',
  'function reconcileWorldEnemyLists',
  'reconcileWorldEnemyLists()',
  'function removeChestEverywhere',
  'removeChestEverywhere(c)',
  'WORLD_DATA.tileLayers',
  'WORLD_DATA.tileImages',
  'function playerWorldPos',
  'function syncPlayerWorldPos',
  'function savedWorldSpawn',
  'function movePlayerWorld',
  'function resetUnitAreaCrossAction',
  'function moveUnitWorld',
  'function enterWorldArea',
  'reconcileWorldEnemyLists();if(!MAP.town&&!MAP.dungeon',
  'function setPlayerWorld',
  'function worldPoint',
  'function worldRect',
  'function worldPoly',
  'function worldPointRef',
  'function syncPointWorld',
  'function syncUnitWorld',
  'function sameWorldObject',
  'function syncEnemyWorld',
  'function syncBossWorld',
  'function syncDemonWorld',
  'function syncProjectileWorld',
  'function syncMagicWorld',
  'function syncNpcWorld',
  'function unitDistance',
  'function playerTarget',
  'd:pointDistance(map,x,y,P)',
  'function playerSideTargets',
  'const out=[P]',
  'function inPlayerView',
  'function combatActiveNearPlayer',
  'function enemyShouldSleep',
  'function enemyShouldForget',
  'function transientObjectAlive',
  'function showAreaName',
  'function drawAreaName',
  'function drawWorldDecorations',
  'function drawWorldFacilities',
  'function drawWorldFieldStones',
  'function drawWorldTreasureChests',
  'function drawWorldNpcs',
  'function mpVisualSpellWorld',
  'function mpWorldEventView',
  'mpWorldEventView(msg,PROJECTILE_PAD)',
  'mpWorldEventView(msg,360)',
  'mpWorldEventView(m,260)',
  'syncPointWorld(payload.map,payload.x,payload.y)',
  'function cachedEnemiesNearPlayer',
  'function allWorldEnemies',
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
  'function dropFieldChestNear',
  'dropFieldChestNear(p.x,p.y,elite,en.enLv)',
  'if(Math.random()<0.25)spawnTreasureChest()',
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
  'function worldDisplayPoint',
  'function displayWorldObject',
  'function worldObjInView',
  'function displayUnit',
  'function displayPoint',
  'function worldNearPlayer',
  'spreadAreaFacilities',
  'FACILITY_DRAW_SCALE',
  'unitDistance(P,',
  'pointDistance(map,x,y',
  'syncWeatherWorld({',
  'syncWeatherWorld(w)',
  'enemyShouldSleep(e)',
  'enemyShouldForget(e)',
  'allWorldEnemies():enemies.slice()',
  'transientObjectAlive(s',
  'P.transitionLockT=1',
  'showAreaName(MAP.name,false)',
  'drawAreaName();',
  'saveMapRuntime(MAPID)',
  'pending=[]',
  'function schedulePending',
  'function tickPending',
  'tickPending(dt)',
  'schedulePending(i*delay',
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

if (/function drawTiledTileLayers[\s\S]*drawTileScaled\(name,/.test(src)) {
  throw new Error('Tiled tile layers must draw baked Tiled images directly, not runtime tile replacements');
}
if (src.includes('SETTLEMENT_TILE_REPLACE')) {
  throw new Error('area-dependent settlement tile replacement must stay removed; bake terrain in Tiled instead');
}

for (const needle of [
  'function drawTiledFallbackGround',
  'drawTiledFallbackGround(area,view,ts,dw,dh)',
  'function pickTiledFallbackTile',
]) {
  if (src.includes(needle)) throw new Error(`Tiled world runtime should draw painted tiles only, found: ${needle}`);
}

{
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('world_data.js', 'utf8'), ctx);
  const world = ctx.window.AMC_WORLD_DATA;
  if (!world || !Array.isArray(world.tileImages) || world.tileImages.length < 1) {
    throw new Error('world_data.js must include tileImages from editor/maptiles.tsj');
  }
  const usedTileGids = new Set();
  for (const layer of world.tileLayers || []) {
    for (const ch of layer.chunks || []) {
      if (Array.isArray(ch.runs)) for (let i = 0; i < ch.runs.length; i += 3) usedTileGids.add(ch.runs[i + 2]);
      if (Array.isArray(ch.cells)) for (let i = 1; i < ch.cells.length; i += 2) usedTileGids.add(ch.cells[i]);
      if (Array.isArray(ch.data)) for (const gid of ch.data) if (gid) usedTileGids.add(gid);
    }
  }
  for (const file of ['desert_32x32.png', 'soil_32x32.png', 'unpaved_road_32x32.png']) {
    const gid = world.tileImages.indexOf(file) + 1;
    if (gid <= 0 || !usedTileGids.has(gid)) throw new Error(`world_data.js must keep baked Tiled terrain on layers: ${file}`);
  }
  if (!Array.isArray(world.tileLayers) || !world.tileLayers.some((l) => l.name === 'Ground')) {
    throw new Error('world_data.js must include Tiled tileLayers');
  }
  if (!world.tileLayers.some((l) => Array.isArray(l.chunks) && l.chunks.length > 0)) {
    throw new Error('world_data.js must include painted Tiled tile chunks');
  }
  const ground = world.tileLayers.find((l) => l.name === 'Ground');
  const groundTiles = (ground.chunks || []).reduce((sum, ch) => {
    if (Array.isArray(ch.runs)) {
      for (let i = 0; i < ch.runs.length; i += 3) sum += Number(ch.runs[i + 1] || 0);
    } else if (Array.isArray(ch.cells)) {
      sum += ch.cells.length / 2;
    } else if (Array.isArray(ch.data)) {
      sum += ch.data.filter(Boolean).length;
    }
    return sum;
  }, 0);
  const expectedGroundTiles = Math.round((world.width || 0) / (world.tileSize || 32)) * Math.round((world.height || 0) / (world.tileSize || 32));
  if (groundTiles < expectedGroundTiles) {
    throw new Error(`world_data.js Ground has unpainted cells: ${groundTiles}/${expectedGroundTiles}`);
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
  if (pattern.test(src)) throw new Error(`removed random map spawn loop is back: ${pattern}`);
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

{
  const close = [];
  for (const [areaId, map] of Object.entries(game.MAPS || {})) {
    const facilities = Array.isArray(map && map.facilities) ? map.facilities : [];
    for (let i = 0; i < facilities.length; i++) {
      for (let j = i + 1; j < facilities.length; j++) {
        const a = facilities[i], b = facilities[j];
        const d = Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
        if (d < 250) close.push(`${areaId}:${a.type || '?'}-${b.type || '?'}:${Math.round(d)}`);
      }
    }
  }
  if (close.length) throw new Error(`facilities are too close after layout: ${close.join(', ')}`);
}

if (!game.COMBAT_BALANCE || !game.COMBAT_BALANCE.enemyRanged || !game.COMBAT_BALANCE.boss) {
  throw new Error('combat balance tables are not loaded');
}

{
  const allowedTitleEffects = new Set([
    'INT', 'VIT', 'DEX', 'AGI', 'PIE', 'LUK', 'hp', 'mp',
    'INT%', 'VIT%', 'DEX%', 'AGI%', 'PIE%', 'LUK%', 'allstat%',
    'hp%', 'mp%', 'exp%', 'gem%', 'drop%', 'shop%', 'move%', 'castSpeed%',
  ]);
  const parts = game.TITLE_PARTS || [];
  const fronts = game.TITLE_FRONTS || [];
  const backs = game.TITLE_BACKS || [];
  if (fronts.length !== 300 || backs.length !== 300 || parts.length !== 600) {
    throw new Error(`title part count must be 300+300: ${fronts.length}+${backs.length}`);
  }
  const ids = new Set(parts.map((t) => t.id));
  if (ids.size !== parts.length) throw new Error('title part ids must be unique');
  const badTitles = parts.filter((t) => !t.name || !['front', 'back'].includes(t.side) || !t.effect || !allowedTitleEffects.has(t.effect.k) || !t.rule);
  if (badTitles.length) throw new Error(`invalid title parts: ${badTitles.map((t) => t.id || t.name).join(', ')}`);
}

for (const needle of [
  'return s+(setAffixes()[key]||0)+titleBonus(key)',
  'let v=P.base[n]*2+titleBonus(n)',
  "titleBonus('hp')",
  "titleBonus('mp')",
  "playerAffix('gem%')",
  "playerAffix('exp%')",
  "playerAffix('move%')",
  "playerAffix('castSpeed%')",
  'function titleShopPriceMul',
  'titleShopPriceMul()',
  "titleAddStat('gemEarned'",
  'titleRecordKill(',
  'titleRecordQuest(',
  'function updateTitles(dt)',
]) {
  if (!src.includes(needle)) throw new Error(`title bonus hook missing: ${needle}`);
}

{
  const legacy = game.unpackQuest(['slime', 'マナスライム', 3, 0, 120, 80, 1, 'low']);
  const corrupt = game.unpackQuest(['slime', 'マナスライム', 3, 0, 120, 80, 1, 'low', '']);
  const jpKey = game.unpackQuest(['mob', 'マナスライム', 'マナスライム', 3, 0, 120, 80, 1, 'low']);
  const corruptObject = game.normalizeQuest({ type: 'slime', key: 'マナスライム', jp: 3, need: 0, count: 120, gem: 80, exp: 1, lv: 'low' });
  for (const [label, q] of [['legacy', legacy], ['corrupt', corrupt], ['jpKey', jpKey], ['corruptObject', corruptObject]]) {
    if (!q || q.type !== 'mob' || q.key !== 'slime' || q.jp !== 'マナスライム' || q.need !== 3 || q.count !== 0) {
      throw new Error(`slime quest migration failed: ${label}`);
    }
  }
  if (!game.questKeyMatches('slime', 'マナスライム') || !game.questKeyMatches('スライム', 'slime')) {
    throw new Error('slime quest key aliases are not compatible');
  }
  if (game.questKillKey({ key: 'manaSlime', jp: 'マナスライム' }) !== 'slime' || game.questKillKey({ jp: 'マナスライム' }) !== 'slime') {
    throw new Error('enemy kill key normalization is not compatible with mana slime');
  }
  const oldQuests = game.P.quests;
  const oldNpcQuests = game.npcs.map((n) => n.q);
  for (const n of game.npcs) n.q = null;
  game.P.quests = [{ type: 'mob', key: 'slime', jp: 'マナスライム', need: 2, count: 0, gem: 0, exp: 0, lv: 1, rank: 'low' }];
  game.progressKillQuests({ key: 'manaSlime', jp: 'マナスライム' });
  if (game.P.quests[0].count !== 1) throw new Error('manaSlime enemy kill did not progress slime quest');
  game.progressKillQuests('マナスライム');
  if (game.P.quests[0].count !== 2) throw new Error('Japanese mana slime kill did not complete slime quest');
  game.progressKillQuests('マナスライム');
  if (game.P.quests[0].count !== 2) throw new Error('completed kill quest over-counted');
  game.P.quests = oldQuests;
  game.npcs.forEach((n, i) => { n.q = oldNpcQuests[i]; });
}

for (const needle of [
  'function progressStoryKillQuests',
  'function questKillKey',
  'function progressQuestKillEntry',
  'function progressMobKillQuests',
  'function progressKillQuests',
  'function processActiveEnemyDeaths',
  'progressKillQuests(en)',
  'if(!en||en.rewarded)return;en.rewarded=true',
]) {
  if (!src.includes(needle)) throw new Error(`kill quest progression hook missing: ${needle}`);
}
if (src.includes('questProgress(en.key);storyOnKill(en.key)')) {
  throw new Error('enemy kill reward must use unified kill quest progression');
}
{
  const active = src.indexOf('processActiveEnemyDeaths();');
  const cached = src.indexOf('processCachedEnemyDeaths();', active);
  const bosses = src.indexOf('processWorldBossDeaths();', cached);
  const reconcile = src.indexOf('reconcileWorldEnemyLists();', bosses);
  if (!(active >= 0 && cached > active && bosses > cached && reconcile > bosses)) {
    throw new Error('enemy death rewards must run before world enemy reconciliation');
  }
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

for (const needle of [
  'SAVE_VERSION=22',
  'function packWorldState',
  'function applyWorldState',
  'ws:packWorldState()',
  'applyWorldState(d.ws)',
  'd.ws=Array.isArray(d.ws)?d.ws:[]',
]) {
  if (!src.includes(needle)) throw new Error(`world state save/apply missing: ${needle}`);
}

for (const needle of [
  'const COSMETIC_SLOTS',
  'function genCosmetic',
  'function equipCosmetic',
  'function drawCharacterCosmetics',
  'cosmetics:cosmeticSummary(P.cosmetics)',
  'ce:packCosmeticEquip()',
  'applyCosmeticEquip(d.ce)',
  "['look','見た目']",
  'maybeDropCosmetic(x,y,boss,lv,extra*0.35)',
  'function debugAddCosmetic',
  'debugAddCosmetic',
]) {
  if (!src.includes(needle)) throw new Error(`cosmetic equipment hook missing: ${needle}`);
}

for (const needle of [
  'visitedAreas:new Set',
  'va:[...(P.visitedAreas',
  'function markVisitedArea',
  'function hasVisitedArea',
  'objectInVisitedArea',
  "P.spellsSeen.add('マップ')",
  'function stoneIsLearned(st)',
  'function minimapStoneColor(st)',
  'spell:s.spell,done:stoneIsLearned(s)',
  'ctx.fillStyle=minimapStoneColor(st)',
]) {
  if (!src.includes(needle)) throw new Error(`visited map hook missing: ${needle}`);
}

if (src.includes("['world','マップ']")) {
  throw new Error('world map tab must not be exposed from the Esc menu');
}

for (const needle of [
  'function questSpawnMatch',
  'questKeyMatches(key,k)',
  'function spawnZoneMonster(z,map){const list=questEnemyListForZone',
  'spawnZonesForMap(id).some(z=>questEnemyListHas(questEnemyListForZone(z,id),key))',
  'const zs=spawnZonesForMap(id).filter(z=>questEnemyListHas(questEnemyListForZone(z,id),key))',
  'function storyStepKillKeys',
  'storyStepKillKeys(step).some(k=>questKeyMatches(k,key))',
  'questLoc(storyStepKillKeys(step))',
  'actualEnemyQuestTarget(keys,st.map)',
]) {
  if (!src.includes(needle)) throw new Error(`quest target alias/spawn hook missing: ${needle}`);
}

for (const needle of [
  'function nearNpc(){let b=1e9,t=null;for(const n of npcs){const d=unitDistance(P,n)',
  'const near=unitDistance(P,n)<100',
  "if(a.done>=chestReq(a.obj)){finishChest(false);return;}",
  "if(P.chest.done>=chestReq(P.chest.obj)){finishChest(false);return;}",
]) {
  if (!src.includes(needle)) throw new Error(`npc/chest interaction hook missing: ${needle}`);
}

for (const needle of [
  "S('クエスト',['くえすと']",
  "if(['クエスト','くえすと','quest','quests'].includes(said)){openQuestLog('quest')",
  'function drawQuestLog',
  'function questTrackerRows',
  'P.questHudScroll',
  "storyKind(q)==='main'&&(st.active||st.done||storyAvailable(q))",
  'done?storySynopsis(cur):storyObjectiveText(cur)',
]) {
  if (!src.includes(needle)) throw new Error(`quest log/spell hook missing: ${needle}`);
}

for (const needle of [
  'RARE_COLOR_VARIANTS',
  'rareColorById',
  "if(Math.random()<rc)return'rare'",
  'mapWeatherSpawnAdd',
  'spawnZoneMaxAlive',
  'it:{weather:w}',
  'function drawNpcLog',
  "['NPC名鑑'",
]) {
  if (!src.includes(needle)) throw new Error(`npc/weather/rare hook missing: ${needle}`);
}

{
  const storyStart = src.indexOf('const STORY_QUESTS=[');
  const storyEnd = src.indexOf(';\nconst STORY_BY_ID', storyStart);
  if (storyStart < 0 || storyEnd < storyStart) throw new Error('STORY_QUESTS block not found');
  const quests = vm.runInNewContext(
    `${src.slice(storyStart, storyEnd + 1)}\nSTORY_QUESTS;`,
    {},
    { timeout: 5000 },
  );

  const aliasStart = src.indexOf('const QUEST_KEY_ALIASES=');
  const aliasEnd = src.indexOf(';\nfunction questCanonicalKey', aliasStart);
  if (aliasStart < 0 || aliasEnd < aliasStart) throw new Error('quest key alias block not found');
  const aliasCtx = {};
  vm.runInNewContext(
    `${src.slice(aliasStart, aliasEnd + 1)}\nthis.QUEST_KEY_ALIASES=QUEST_KEY_ALIASES;\nthis.QUEST_SPAWN_EXTRAS=QUEST_SPAWN_EXTRAS;`,
    aliasCtx,
    { timeout: 5000 },
  );

  const enemyCtx = { window: {} };
  vm.createContext(enemyCtx);
  vm.runInContext(fs.readFileSync('enemies.js', 'utf8'), enemyCtx, { timeout: 5000 });
  const enemies = enemyCtx.window.AMC_ENEMIES && enemyCtx.window.AMC_ENEMIES.ET;
  if (!enemies) throw new Error('enemy definitions not loaded for story audit');

  const worldCtx = { window: {} };
  vm.createContext(worldCtx);
  vm.runInContext(fs.readFileSync('world_data.js', 'utf8'), worldCtx, { timeout: 5000 });
  const world = worldCtx.window.AMC_WORLD_DATA;
  if (!world || !Array.isArray(world.areas)) throw new Error('world data not loaded for story audit');

  const areaIds = new Set(world.areas.map((a) => a.id));
  const npcIds = new Set((world.npcs || []).map((n) => `${n.area}:${(n.props && n.props.npc) || n.name || n.id}`));
  const titleIds = new Set((game.TITLE_PARTS || []).map((t) => t.id));
  const aliases = aliasCtx.QUEST_KEY_ALIASES || {};
  const spawnExtras = aliasCtx.QUEST_SPAWN_EXTRAS || {};
  const problems = [];
  const ids = new Set();
  const asList = (v) => (Array.isArray(v) ? v : (v ? [v] : []));
  const keysFor = (key) => {
    const out = [];
    const add = (x) => {
      if (x && !out.includes(x)) out.push(x);
    };
    for (const srcKey of asList(key)) {
      add(srcKey);
      for (const alias of aliases[srcKey] || []) add(alias);
    }
    return out;
  };
  const enemyOk = (key) => keysFor(key).some((k) => enemies[k]);
  const zonesByArea = new Map();
  for (const zone of world.spawnZones || []) {
    const rows = zonesByArea.get(zone.area) || [];
    rows.push(zone);
    zonesByArea.set(zone.area, rows);
  }
  const zoneEnemyList = (zone, map) => {
    const out = ((zone && zone.enemies && zone.enemies.length) ? zone.enemies : (zone && zone.monster ? [zone.monster] : [])).filter(Boolean);
    for (const key of spawnExtras[map] || []) if (enemies[key] && !out.includes(key)) out.push(key);
    return out;
  };
  const zoneHasKey = (zone, map, key) => keysFor(key).some((k) => zoneEnemyList(zone, map).includes(k));
  const mapHasKillTarget = (map, key) => (zonesByArea.get(map) || []).some((zone) => zoneHasKey(zone, map, key));
  const checkNpc = (ref, questId) => {
    for (const id of asList(ref)) if (!npcIds.has(id)) problems.push(`missing npc ${questId}: ${id}`);
  };
  const checkMap = (ref, questId) => {
    for (const id of asList(ref)) if (!areaIds.has(id)) problems.push(`missing map ${questId}: ${id}`);
  };

  for (const q of quests) {
    if (ids.has(q.id)) problems.push(`duplicate story quest id: ${q.id}`);
    ids.add(q.id);
    if (!q.title || !q.storyKind) problems.push(`bad story quest header: ${q.id}`);
    const stepCount = (q.steps || []).length;
    const lineCount = (q.steps || []).reduce((n, step) => n + ((step.lines || []).length), 0);
    if (q.id !== 'main_001_lindefy_record' && stepCount < 2) problems.push(`story quest too short ${q.id}: ${stepCount} steps`);
    if (lineCount < 3) problems.push(`story quest needs dialogue ${q.id}: ${lineCount} lines`);
    for (const dep of asList(q.after)) if (!ids.has(dep)) problems.push(`bad story quest prerequisite ${q.id} -> ${dep}`);
    checkNpc(q.startNpc, q.id);
    for (const titleId of asList(q.rewards && q.rewards.titles)) {
      if (!titleIds.has(titleId)) problems.push(`missing title reward ${q.id}: ${titleId}`);
    }
    for (const step of q.steps || []) {
      if (step.type === 'talk') checkNpc(step.npc, q.id);
      if (step.map) checkMap(step.map, q.id);
      if (step.type === 'kill') {
        for (const key of [step.key, ...(step.keys || [])].filter(Boolean)) {
          if (!enemyOk(key)) problems.push(`bad story kill target ${q.id}: ${key}`);
        }
        const killKeys = (step.keys && step.keys.length) ? step.keys : step.key;
        if (step.map) {
          for (const map of asList(step.map)) {
            if (!mapHasKillTarget(map, killKeys)) problems.push(`story kill target not in map spawns ${q.id}: ${map} -> ${asList(killKeys).join('|')}`);
          }
        }
      }
    }
  }

  const main = quests.filter((q) => q.storyKind === 'main');
  const sub = quests.filter((q) => q.storyKind === 'sub');
  for (let i = 1; i < main.length; i += 1) {
    if (asList(main[i].after)[0] !== main[i - 1].id) problems.push(`main story chain break: ${main[i].id}`);
  }
  if (!main.at(-2) || !asList(main.at(-2).flags).includes('main_clear')) {
    problems.push('main_clear flag missing on final clear quest');
  }
  if (!main.at(-1) || !asList(main.at(-1).flags).includes('postgame_patrol_checked')) {
    problems.push('postgame patrol flag missing');
  }
  if (quests.length !== 77 || main.length !== 17 || sub.length !== 60) {
    problems.push(`story quest count changed: ${quests.length} (${main.length} main / ${sub.length} sub)`);
  }
  if (problems.length) throw new Error(`story quest audit failed:\n${problems.join('\n')}`);
}

{
  const result = spawnSync(process.execPath, ['editor/validate-tiled-world.mjs', '--quiet-warnings'], {
    stdio: 'inherit',
    shell: false,
  });
  if (result.status !== 0) throw new Error('Tiled world validation failed');
}

console.log('game static checks ok');
