const SCALE = 4.8;
const PADDING = 420;
const PLAYER_RADIUS = 14;
const TARGET_GAP = PLAYER_RADIUS * 2 * 3;

const STORY_LAYOUT = [
  ['town', 'リンデフィー', 6200, 6500, 2600, 2150, 'town', 'meadow'],
  ['field', 'メイベル農地', 5350, 5900, 2300, 1800, 'field', 'farm'],
  ['hill', 'なだらかな丘陵', 6450, 5050, 2200, 1700, 'field', 'plains'],
  ['westRoad', '西街道', 5050, 7250, 2100, 1350, 'road', 'road'],
  ['eastRoad', '東街道', 7350, 7000, 2100, 1350, 'road', 'road'],
  ['oldForest', '古街道の森', 6100, 8150, 2350, 1900, 'field', 'forest'],
  ['watchtower', '街道の監視塔跡', 6500, 9550, 1750, 1500, 'dungeon', 'ruin'],
  ['windmere', 'ウィンドメア', 7600, 5450, 1350, 1150, 'village', 'meadow'],
  ['mabel', 'メイベル村', 4050, 6150, 1250, 1050, 'village', 'farm'],
  ['fenceEnd', 'フェンス・エンド', 6000, 7750, 1200, 1000, 'camp', 'road'],
  ['northgateHamlet', '北門の小村', 5750, 4200, 1300, 1000, 'village', 'meadow'],
  ['riverbend', '曲がり川の草地', 5000, 5200, 1900, 1250, 'field', 'river'],
  ['herbGrove', '薬草の木立', 4300, 7050, 1500, 1150, 'field', 'forest'],
  ['southFarm', '南の麦畑', 6850, 8550, 1750, 1250, 'field', 'farm'],

  ['univel', '王都ユニヴェル', 9000, 6500, 3000, 2400, 'town', 'royal'],
  ['ceres', 'セレス宿場', 8050, 6250, 1350, 1050, 'village', 'road'],
  ['royalPlain', '王都外縁平原', 9150, 8050, 2450, 1800, 'field', 'plains'],
  ['oldRoyalRoad', '旧王都街道', 8800, 4850, 2300, 1500, 'road', 'road'],
  ['sewer', '地下水路', 10100, 7500, 1850, 1500, 'dungeon', 'waterway'],
  ['undergrow', 'アンダーグロウ', 10150, 5200, 2100, 1600, 'field', 'ruin'],
  ['shrineRuins', '地下祭祀場跡', 10350, 4000, 1800, 1500, 'dungeon', 'ruin'],
  ['marbleBridge', '白石橋', 10150, 6150, 1500, 1050, 'road', 'road'],
  ['moonwell', '月見の泉', 11300, 5350, 1500, 1150, 'field', 'lake'],
  ['oldAqueduct', '旧導水橋', 11050, 7300, 1600, 1100, 'field', 'waterway'],

  ['goldhahn', 'ゴールドハーン', 8050, 9650, 2350, 1800, 'town', 'farm'],
  ['goldenPlain', '黄金平原', 8050, 11300, 2450, 1850, 'field', 'farm'],
  ['marketRoad', '市場街道', 6800, 10250, 2050, 1300, 'road', 'road'],
  ['farmBelt', '農地帯', 9500, 10450, 2400, 1750, 'field', 'farm'],
  ['windPlateau', '風車高原', 6450, 9000, 2100, 1650, 'field', 'plains'],
  ['canal', '灌漑水路', 7100, 11650, 2150, 1450, 'field', 'river'],
  ['stillrow', 'スティルロウ', 9900, 11850, 1250, 1050, 'camp', 'farm'],
  ['irrigationRuins', '地下灌漑機構跡', 8700, 12850, 1850, 1500, 'dungeon', 'ruin'],
  ['sunflowerField', 'ひまわり畑', 6200, 11200, 1750, 1300, 'field', 'farm'],
  ['oldMill', '古い水車小屋', 7600, 10050, 1300, 1000, 'village', 'river'],
  ['wheatGranary', '麦倉庫街', 10450, 9900, 1450, 1050, 'village', 'farm'],

  ['rowendil', 'ロウェンディル', 5550, 3500, 1350, 1100, 'village', 'forest'],
  ['timber', 'ティンバー', 4150, 4550, 1250, 1050, 'camp', 'forest'],
  ['hunterHideout', '狩人の隠れ家', 5550, 2300, 1150, 950, 'camp', 'forest'],
  ['greenhollow', 'グリーンホロウ', 6350, 3150, 1250, 1050, 'camp', 'forest'],
  ['blackRoad', '黒森街道', 5600, 4550, 2250, 1500, 'road', 'forest'],
  ['greenForest', '深緑の森', 4400, 3100, 2600, 2100, 'field', 'deepForest'],
  ['mistMarsh', '霧深い湿地', 7050, 3550, 2300, 1850, 'field', 'marsh'],
  ['oldTreeHunt', '古樹の狩場', 6550, 1850, 2350, 1800, 'field', 'deepForest'],
  ['forestLab', '森に埋もれた研究施設跡', 7600, 1850, 1850, 1550, 'dungeon', 'ruin'],
  ['cedarPass', '杉の峠道', 3400, 3300, 1600, 1200, 'road', 'forest'],
  ['bluebellLake', '青鐘の小湖', 4750, 1850, 1500, 1100, 'field', 'lake'],
  ['cliffShrine', '崖上の祠', 8200, 3200, 1250, 1000, 'dungeon', 'ruin'],
  ['owlWood', '梟の森', 3150, 4700, 1650, 1250, 'field', 'deepForest'],

  ['miraLake', 'ミラレイク', 11950, 6300, 2200, 1750, 'town', 'lake'],
  ['ripple', 'リップル', 11100, 5000, 1200, 1000, 'village', 'lake'],
  ['resortTown', '保養街', 12650, 4800, 1250, 1000, 'village', 'lake'],
  ['mirrorLake', '水鏡の湖', 12400, 6100, 3000, 2350, 'field', 'lake'],
  ['fogPromenade', '霧の遊歩道', 11050, 7000, 2100, 1350, 'road', 'marsh'],
  ['rippleShore', 'リップル湖岸', 11450, 8200, 2250, 1550, 'field', 'lake'],
  ['sunkenRoad', '沈みかけた旧街道', 13200, 7750, 2200, 1500, 'road', 'marsh'],
  ['thinkTank', 'シンクタンク', 12650, 7300, 1850, 1450, 'field', 'lake'],
  ['lakeRuins', '湖底遺跡', 12850, 8850, 1850, 1500, 'dungeon', 'waterway'],
  ['reedMarsh', '葦原の湿地', 10850, 8650, 1800, 1300, 'field', 'marsh'],
  ['glassLagoon', '硝子の入り江', 13900, 6100, 1850, 1300, 'field', 'lake'],
  ['mistFisherVillage', '霧漁りの村', 14150, 7550, 1250, 1000, 'village', 'lake'],

  ['acrossPort', '港町アクロス', 12600, 10300, 2450, 1900, 'town', 'coast'],
  ['dockside', 'ドックサイド', 11100, 9850, 1250, 1000, 'village', 'coast'],
  ['saltFlat', 'ソルティ・フラット', 12850, 11950, 1400, 1100, 'camp', 'coast'],
  ['seaRoad', '潮風街道', 11900, 9200, 2100, 1350, 'road', 'coast'],
  ['windCape', '風待ち岬', 14000, 9400, 2100, 1550, 'field', 'coast'],
  ['warehouseCanal', '倉庫運河', 13600, 10550, 2050, 1400, 'field', 'river'],
  ['offshorePier', '沖合浮桟橋', 14050, 11650, 1850, 1350, 'field', 'coast'],
  ['airshipDock', '沈没した飛空船ドック跡', 13550, 13050, 1750, 1450, 'dungeon', 'ruin'],
  ['gullVillage', 'カモメ村', 11450, 11050, 1250, 950, 'village', 'coast'],
  ['coralBeach', '珊瑚浜', 15100, 10200, 1800, 1200, 'field', 'coast'],
  ['lighthouseCape', '灯台岬', 15500, 11600, 1400, 1100, 'village', 'coast'],
  ['tideCave', '潮鳴り洞', 15150, 13050, 1500, 1150, 'dungeon', 'coast'],

  ['graubachCity', '工業都市グラウバッハ', 11100, 12450, 2550, 2000, 'town', 'industry'],
  ['ashCommon', 'アッシュ・コモン', 9700, 12050, 1250, 1000, 'village', 'industry'],
  ['elixirField', 'エリクサー田', 10100, 13650, 2100, 1550, 'field', 'industry'],
  ['sootyRoad', '煤けた街道', 11300, 14050, 2100, 1350, 'road', 'industry'],
  ['manaFogLowland', 'マナ霧の低地', 12650, 13200, 2150, 1600, 'field', 'marsh'],
  ['elixirEdge', 'エリクサー田外縁', 12550, 14500, 2050, 1500, 'field', 'industry'],
  ['refineLine', '精製ライン', 11150, 15300, 1850, 1450, 'dungeon', 'industry'],
  ['elixirPlant', 'エリクサー濃縮工場跡', 11950, 16500, 1700, 1400, 'dungeon', 'industry'],
  ['smokeHamlet', '煙突長屋', 9800, 15100, 1300, 1000, 'village', 'industry'],
  ['gearYard', '歯車置き場', 12850, 15750, 1650, 1200, 'field', 'industry'],
  ['slagRavine', '鉱滓の谷', 10800, 16900, 1750, 1250, 'field', 'wasteland'],

  ['eisenroar', 'アイゼンロア', 7600, 13800, 2450, 1900, 'town', 'mountain'],
  ['deepvein', 'ディープヴェイン', 6200, 13150, 1250, 1000, 'village', 'mountain'],
  ['freepick', 'フリーピック', 8750, 13050, 1250, 1000, 'camp', 'mountain'],
  ['ironRoad', '鉄の山道', 7700, 15200, 2100, 1350, 'road', 'mountain'],
  ['oldMine', '古鉱道', 6900, 16450, 2050, 1500, 'dungeon', 'mine'],
  ['crystalCave', '結晶洞窟', 8350, 16650, 1950, 1500, 'field', 'mine'],
  ['independentMine', '独立採掘区', 9400, 15450, 1900, 1400, 'field', 'mine'],
  ['miningMech', 'AMC採掘機構跡', 8300, 18100, 1700, 1400, 'dungeon', 'mine'],
  ['upperQuarry', '上層採石場', 6400, 14700, 1650, 1200, 'field', 'mine'],
  ['snowlineCamp', '雪線キャンプ', 7050, 19000, 1250, 1000, 'camp', 'mountain'],
  ['frozenPass', '凍てつく峠', 9050, 19400, 1750, 1250, 'field', 'snow'],
  ['obsidianPeak', '黒曜峰', 10300, 18300, 1650, 1200, 'dungeon', 'mountain'],

  ['wallguard', 'ウォールガード', 4700, 12600, 2400, 1850, 'town', 'frontier'],
  ['garrison', '王国軍駐屯地', 3500, 11700, 1250, 1000, 'camp', 'frontier'],
  ['pioneerVillages', '開拓村群', 5200, 11350, 1350, 1050, 'village', 'frontier'],
  ['liberta', 'リベルタ', 3300, 13400, 1300, 1050, 'village', 'frontier'],
  ['greyFrontier', '灰色の辺境路', 4700, 14350, 2200, 1500, 'road', 'wasteland'],
  ['frontierWilderness', '開拓荒野', 5750, 15150, 2250, 1700, 'field', 'wasteland'],
  ['borderForts', '境界砦群', 4300, 15850, 2050, 1450, 'field', 'ruin'],
  ['libertaEdge', 'リベルタ外縁区', 3050, 15100, 1700, 1300, 'field', 'wasteland'],
  ['borderDungeon', '境界砦地下構', 3700, 16950, 1700, 1400, 'dungeon', 'ruin'],
  ['frontierOasis', '辺境の湧き水', 2050, 12650, 1550, 1150, 'field', 'wasteland'],
  ['boneDunes', '白骨砂丘', 2100, 14600, 1800, 1300, 'field', 'desert'],
  ['silentMesa', '沈黙の台地', 5350, 17400, 1750, 1250, 'field', 'wasteland'],
  ['brokenObelisk', '折れた方尖塔', 2350, 16400, 1450, 1100, 'dungeon', 'ruin'],

  ['lastHold', 'ラストホールド', 2600, 9300, 2350, 1800, 'town', 'wasteland'],
  ['exileCamp', '流亡者集落', 1300, 8500, 1250, 1000, 'camp', 'wasteland'],
  ['ruinedSankt', '廃区ザンクト', 3600, 8200, 1350, 1050, 'village', 'ruin'],
  ['whiteWilderness', '白灰の荒野', 1900, 10050, 2150, 1600, 'field', 'wasteland'],
  ['rottenPioneer', '朽ちた開拓地', 3700, 10150, 2050, 1500, 'field', 'wasteland'],
  ['sanktRoad', 'ザンクト外縁廃道', 4200, 9100, 1950, 1350, 'road', 'ruin'],
  ['oblivionOuter', '忘却の外郭', 2500, 11350, 2350, 1750, 'field', 'void'],
  ['oblivionRuins', '忘却の遺跡群', 2300, 12800, 2050, 1550, 'dungeon', 'void'],
  ['recordCore', '賢者の記録中枢', 2000, 14350, 1850, 1450, 'dungeon', 'void'],
  ['starshipWreck', '墜落飛空船の残骸', 2600, 15750, 1850, 1450, 'dungeon', 'void'],
  ['finalSector', '最終区画', 2200, 17100, 1750, 1400, 'dungeon', 'void'],
  ['postGameSector', 'ポストゲーム区画', 3600, 18050, 1750, 1400, 'dungeon', 'void'],
  ['ashPilgrimRoad', '灰の巡礼路', 950, 10100, 1650, 1200, 'road', 'wasteland'],
  ['voidBloomField', '虚無花の原', 950, 11900, 1750, 1300, 'field', 'void'],
  ['memoryGarden', '記憶の庭', 1200, 13600, 1550, 1150, 'field', 'void'],
  ['macroJail', '牢獄', 10100, 2800, 1450, 1150, 'jail', 'ruin']
];

const MAJOR_ROUTES = [
  ['town', 'univel', '王都街道', 'road'],
  ['univel', 'goldhahn', '黄金街道', 'farm'],
  ['univel', 'miraLake', '湖畔街道', 'lake'],
  ['miraLake', 'acrossPort', '湖港街道', 'coast'],
  ['acrossPort', 'graubachCity', '工業湾岸路', 'industry'],
  ['graubachCity', 'eisenroar', '鉄山街道', 'mountain'],
  ['eisenroar', 'wallguard', '辺境山道', 'wasteland'],
  ['wallguard', 'lastHold', '灰境街道', 'wasteland']
];

function routeFillerRows() {
  const rows = [];
  const byId = new Map(STORY_LAYOUT.map(row => [row[0], row]));
  for (const [fromId, toId, label, biome] of MAJOR_ROUTES) {
    const from = byId.get(fromId);
    const to = byId.get(toId);
    if (!from || !to) continue;
    const dx = to[2] - from[2];
    const dy = to[3] - from[3];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 1; i <= 6; i++) {
      const t = i / 7;
      const wave = (i % 2 === 0 ? 1 : -1) * (420 + i * 35);
      const id = `route_${fromId}_${toId}_${String(i).padStart(2, '0')}`;
      const kind = i === 3 ? 'village' : i === 5 ? 'field' : 'road';
      const name = kind === 'village' ? `${label}の宿場${i}` : `${label}${i}`;
      rows.push([
        id,
        name,
        from[2] + dx * t + nx * wave,
        from[3] + dy * t + ny * wave,
        kind === 'village' ? 1350 : 1650,
        kind === 'village' ? 1000 : 1150,
        kind,
        biome
      ]);
    }
  }
  return rows;
}

function allLayoutRows() {
  const rows = [...STORY_LAYOUT, ...routeFillerRows()];
  return [...rows, ...gapFillerRows(rows)];
}

function gapFillerRows(baseRows) {
  const rows = [];
  const minX = Math.min(...baseRows.map(row => row[2]));
  const maxX = Math.max(...baseRows.map(row => row[2]));
  const minY = Math.min(...baseRows.map(row => row[3]));
  const maxY = Math.max(...baseRows.map(row => row[3]));
  const gap = 520;
  const threshold = 460;
  const biomes = ['plains', 'forest', 'farm', 'river', 'lake', 'marsh', 'coast', 'mountain', 'wasteland'];
  let index = 1;

  for (let y = minY + gap * 0.55; y <= maxY - gap * 0.35; y += gap) {
    for (let x = minX + gap * 0.55; x <= maxX - gap * 0.35; x += gap) {
      const nearest = Math.min(...baseRows.map(row => Math.hypot(row[2] - x, row[3] - y)));
      if (nearest < threshold) continue;
      const biome = biomes[(index + Math.floor(x / gap) + Math.floor(y / gap)) % biomes.length];
      const wide = index % 4 === 0;
      rows.push([
        `wild_gap_${String(index).padStart(3, '0')}`,
        `未踏地${index}`,
        x + ((index % 3) - 1) * 180,
        y + ((index % 5) - 2) * 120,
        wide ? 2350 : 1900,
        wide ? 1500 : 1700,
        'field',
        biome
      ]);
      index++;
    }
  }
  return rows;
}

const EXTRA_ENEMY_SETS = {
  meadow: ['slime', 'hornRabbit', 'manaBunny'],
  farm: ['mandrake', 'manaHawk', 'scarab'],
  plains: ['manaWolf', 'manaHawk', 'goblin'],
  road: ['goblin', 'goblinArcher', 'manaWolf'],
  forest: ['manaWolf', 'goblinArcher', 'babyDragon'],
  deepForest: ['alraune', 'yokaiFox', 'manaBear'],
  marsh: ['mirage', 'alraune', 'wisplace'],
  lake: ['aquaJelly', 'manaFish', 'seaSerpent'],
  river: ['aquaJelly', 'manaFish', 'mudGolem'],
  coast: ['siren', 'seaSerpent', 'griffon'],
  industry: ['guardian', 'nightmare', 'crystalGolem'],
  mountain: ['ironGolem', 'sandWorm', 'lich'],
  mine: ['ironGolem', 'crystalGolem', 'sentryCore'],
  frontier: ['sentryCore', 'prismWraith', 'progenitorVampire'],
  wasteland: ['manaAnomaly', 'ancientLich', 'behemoth'],
  desert: ['sandWorm', 'earthDragon', 'ogre'],
  snow: ['frostDragon', 'fenrir', 'troll'],
  void: ['voidSpirit', 'ancientLich', 'calamityDragon'],
  ruin: ['wisplace', 'stoneGolem', 'poltergeist'],
  waterway: ['merman', 'kelpie', 'lizardman']
};

const EXTRA_LEVELS = {
  northgateHamlet: 2,
  riverbend: 3,
  herbGrove: 5,
  southFarm: 9,
  marbleBridge: 18,
  moonwell: 24,
  oldAqueduct: 25,
  sunflowerField: 14,
  oldMill: 12,
  wheatGranary: 13,
  cedarPass: 28,
  bluebellLake: 31,
  cliffShrine: 35,
  owlWood: 30,
  reedMarsh: 43,
  glassLagoon: 46,
  mistFisherVillage: 44,
  gullVillage: 51,
  coralBeach: 55,
  lighthouseCape: 56,
  tideCave: 58,
  smokeHamlet: 62,
  gearYard: 66,
  slagRavine: 68,
  upperQuarry: 73,
  snowlineCamp: 78,
  frozenPass: 82,
  obsidianPeak: 84,
  frontierOasis: 84,
  boneDunes: 86,
  silentMesa: 88,
  brokenObelisk: 89,
  ashPilgrimRoad: 92,
  voidBloomField: 94,
  memoryGarden: 96
};

export function createStoryExtraMaps(genDecos) {
  const out = {};
  const existing = new Set([
    'town', 'field', 'hill', 'westRoad', 'eastRoad', 'oldForest', 'watchtower', 'windmere', 'mabel',
    'fenceEnd', 'univel', 'ceres', 'royalPlain', 'oldRoyalRoad', 'sewer', 'undergrow', 'shrineRuins',
    'goldhahn', 'goldenPlain', 'marketRoad', 'farmBelt', 'windPlateau', 'canal', 'stillrow',
    'irrigationRuins', 'rowendil', 'timber', 'hunterHideout', 'greenhollow', 'blackRoad', 'greenForest',
    'mistMarsh', 'oldTreeHunt', 'forestLab', 'miraLake', 'ripple', 'resortTown', 'mirrorLake',
    'fogPromenade', 'rippleShore', 'sunkenRoad', 'thinkTank', 'lakeRuins', 'acrossPort', 'dockside',
    'saltFlat', 'seaRoad', 'windCape', 'warehouseCanal', 'offshorePier', 'airshipDock', 'graubachCity',
    'ashCommon', 'elixirField', 'sootyRoad', 'manaFogLowland', 'elixirEdge', 'refineLine', 'elixirPlant',
    'eisenroar', 'deepvein', 'freepick', 'ironRoad', 'oldMine', 'crystalCave', 'independentMine',
    'miningMech', 'wallguard', 'garrison', 'pioneerVillages', 'liberta', 'greyFrontier',
    'frontierWilderness', 'borderForts', 'libertaEdge', 'borderDungeon', 'lastHold', 'exileCamp',
    'ruinedSankt', 'whiteWilderness', 'rottenPioneer', 'sanktRoad', 'oblivionOuter', 'oblivionRuins',
    'recordCore', 'starshipWreck', 'finalSector', 'postGameSector', 'macroJail'
  ]);

  for (const row of allLayoutRows()) {
    const [id, name, , , , , kind, biome] = row;
    if (existing.has(id)) continue;
    const mlv = EXTRA_LEVELS[id] || 1;
    const town = ['town', 'village', 'camp', 'jail'].includes(kind);
    out[id] = {
      name,
      mlv: Math.max(0, mlv - 1),
      town,
      ground: '#50644a',
      gpond: '#4d8ca8',
      deco: biome,
      ponds: biome === 'lake' || biome === 'river' || biome === 'marsh' ? [{ x: 1300, y: 930, rx: 260, ry: 150 }] : [],
      decos: genDecos(30000 + Object.keys(out).length * 97, town ? 18 : 56),
      enemies: town ? [] : (EXTRA_ENEMY_SETS[biome] || EXTRA_ENEMY_SETS.plains).slice(),
      boss: kind === 'dungeon',
      bx: 1300,
      by: 560,
      bossDef: kind === 'dungeon' ? { jp: `${name}の主`, el: '', col: '#d0d0d0', hp: 5000 + mlv * 400, atk: 30 + mlv * 3 } : null,
      portals: [],
      facilities: town ? [{ x: 1300, y: 1000, r: 50, type: 'guild' }] : []
    };
  }
  return out;
}

function paddedOverlap(a, b, pad) {
  return a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
}

function resolveOverlaps(rects) {
  const entries = [...rects.entries()];
  const placed = [];
  const step = 260;
  const directions = 24;

  for (const [, rect] of entries) {
    const original = { x: rect.x, y: rect.y };
    let best = null;
    for (let ring = 0; ring <= 80 && !best; ring++) {
      if (ring === 0) {
        if (!placed.some(p => paddedOverlap(rect, p, PADDING))) best = { x: rect.x, y: rect.y };
        continue;
      }
      for (let i = 0; i < directions; i++) {
        const angle = (Math.PI * 2 * i) / directions;
        const candidate = {
          ...rect,
          x: original.x + Math.round(Math.cos(angle) * step * ring),
          y: original.y + Math.round(Math.sin(angle) * step * ring)
        };
        if (!placed.some(p => paddedOverlap(candidate, p, PADDING))) {
          best = { x: candidate.x, y: candidate.y };
          break;
        }
      }
    }
    if (best) {
      rect.x = best.x;
      rect.y = best.y;
    }
    placed.push(rect);
  }
}

function expandRectsFromCenters(rects) {
  const entries = [...rects.entries()];
  const centers = entries.map(([id, r]) => ({ id, r, cx: r.x + r.w / 2, cy: r.y + r.h / 2 }));
  for (const c of centers) {
    let nearest = Infinity;
    for (const other of centers) {
      if (other === c) continue;
      nearest = Math.min(nearest, Math.hypot(other.cx - c.cx, other.cy - c.cy));
    }
    if (!Number.isFinite(nearest)) continue;
    const base = Math.max(c.r.w, c.r.h);
    const target = Math.max(base, nearest - TARGET_GAP);
    const factor = Math.max(1, Math.min(10.5, target / (base * 0.4)));
    const wideBias = c.r.kind === 'road' ? 1.35 : c.r.kind === 'field' ? 1.12 : 1;
    const tallBias = c.r.kind === 'road' ? 0.82 : c.r.kind === 'field' ? 1.08 : 1;
    const nw = Math.round(c.r.w * factor * wideBias);
    const nh = Math.round(c.r.h * factor * tallBias);
    c.r.x = Math.round(c.cx - nw / 2);
    c.r.y = Math.round(c.cy - nh / 2);
    c.r.w = nw;
    c.r.h = nh;
  }
}

export function applyStoryWorldLayout(maps) {
  const rects = new Map();
  const planById = new Map(allLayoutRows().map(row => [row[0], row]));
  let fallback = 0;

  for (const id of Object.keys(maps)) {
    const row = planById.get(id);
    if (row) {
      const [, name, cx, cy, w, h, kind, biome] = row;
      rects.set(id, { x: cx * SCALE - w / 2, y: cy * SCALE - h / 2, w, h, name, kind, biome });
    } else {
      const col = fallback % 6;
      const rowNo = Math.floor(fallback / 6);
      rects.set(id, {
        x: 24000 + col * 1800,
        y: 4500 + rowNo * 1400,
        w: 1400,
        h: 1050,
        name: id,
        kind: maps[id].town ? 'village' : 'field',
        biome: 'unknown'
      });
      fallback++;
    }
  }

  resolveOverlaps(rects);
  expandRectsFromCenters(rects);

  const minX = Math.min(...[...rects.values()].map(r => r.x));
  const minY = Math.min(...[...rects.values()].map(r => r.y));
  const margin = 512;
  for (const r of rects.values()) {
    r.x = Math.round(r.x - minX + margin);
    r.y = Math.round(r.y - minY + margin);
    r.w = Math.round(r.w);
    r.h = Math.round(r.h);
  }

  return rects;
}
