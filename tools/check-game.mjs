import fs from 'node:fs';

const src = fs.readFileSync('index.html', 'utf8');
const scripts = [...src.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map((m) => m[1])
  .filter((body) => body.trim());
const script = scripts.at(-1);
if (!script) throw new Error('script block not found');

new Function(script);

const externalScripts = ['maps.js', 'enemies.js', 'bestiary.js', 'enemy_spells.js', 'boss_patterns.js', 'npc_dialogue.js']
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

if (/\b(?:shots|eshots)\s*=\s*\[/.test(src)) {
  throw new Error('legacy shot arrays are back');
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

console.log('game static checks ok');
