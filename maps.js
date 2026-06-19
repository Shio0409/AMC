// Map definitions are separated from index.html so they can be edited by hand.
// Available helpers: WORLD_W, WORLD_H, genDecos(seed, count).
window.AMC_MAPS=function AMC_MAPS(ctx){
 const {WORLD_W,WORLD_H,genDecos}=ctx;
 const THEME={village:{ground:'#6f675b',gpond:'#5a7a9a',deco:'tree',ponds:[]},farm:{ground:'#7b8942',gpond:'#5a9fba',deco:'flower',ponds:[{x:1900,y:1300,rx:220,ry:130}]},plains:{ground:'#4f8a3f',gpond:'#3f86b8',deco:'crop',ponds:[{x:1500,y:720,rx:220,ry:120}]},road:{ground:'#5c7440',gpond:'#4d8ca8',deco:'tree',ponds:[]},forest:{ground:'#2c5e2b',gpond:'#2a5a86',deco:'tree',ponds:[{x:1100,y:1250,rx:260,ry:150}]},marsh:{ground:'#34543d',gpond:'#426e76',deco:'bush',ponds:[{x:980,y:880,rx:260,ry:170},{x:2050,y:1420,rx:240,ry:140}]},water:{ground:'#3d6070',gpond:'#5aa4c8',deco:'bush',ponds:[{x:980,y:820,rx:300,ry:180},{x:1970,y:1370,rx:280,ry:160}]},port:{ground:'#566970',gpond:'#4284a4',deco:'rock',ponds:[{x:1200,y:1020,rx:260,ry:150}]},ruin:{ground:'#2a2630',gpond:'#5a5070',deco:'rock',ponds:[{x:1300,y:1000,rx:240,ry:150}]},mine:{ground:'#34333b',gpond:'#69758e',deco:'rock',ponds:[{x:1740,y:1120,rx:220,ry:130}]},industry:{ground:'#4a4640',gpond:'#646b63',deco:'rock',ponds:[{x:1600,y:980,rx:230,ry:130}]},wasteland:{ground:'#615a58',gpond:'#6b7480',deco:'rock',ponds:[{x:1380,y:1120,rx:220,ry:120}]},void:{ground:'#1a1622',gpond:'#3a2e50',deco:'rock',ponds:[{x:1300,y:1000,rx:260,ry:150}]}};
 const FAC={full:['equip','smith','tool','jewel','bank','market','church','guild'],small:['equip','smith','tool','guild'],outpost:['tool','guild']};
 const LABEL={equip:'装備屋',smith:'鍛冶屋',tool:'道具屋',jewel:'宝飾店',bank:'銀行',market:'マーケット',church:'教会',guild:'冒険者ギルド'};
 function facilities(kind){const pos=[[WORLD_W/2-420,WORLD_H/2-110],[WORLD_W/2-150,WORLD_H/2-190],[WORLD_W/2+150,WORLD_H/2-190],[WORLD_W/2+420,WORLD_H/2-110],[WORLD_W/2+420,WORLD_H/2+120],[WORLD_W/2-420,WORLD_H/2+120],[WORLD_W/2+250,WORLD_H/2-210],[WORLD_W/2,WORLD_H/2+210]];return (FAC[kind]||FAC.small).map((type,i)=>({x:pos[i][0],y:pos[i][1],r:type==='guild'?50:44,type,label:LABEL[type]}));}
 function portal(side,to,label){const p={to,r:30,color:'#7CFFA0'};if(side==='n')Object.assign(p,{x:WORLD_W/2,y:58,tx:WORLD_W/2,ty:WORLD_H-130,label:'↑ '+label});else if(side==='s')Object.assign(p,{x:WORLD_W/2,y:WORLD_H-58,tx:WORLD_W/2,ty:130,label:'↓ '+label});else if(side==='w')Object.assign(p,{x:58,y:WORLD_H/2,tx:WORLD_W-130,ty:WORLD_H/2,label:'← '+label});else Object.assign(p,{x:WORLD_W-58,y:WORLD_H/2,tx:130,ty:WORLD_H/2,label:label+' →'});return p;}
 function spreadPortals(ps){const groups={n:[],s:[],w:[],e:[]};for(const p of ps){const side=p.x<100?'w':p.x>WORLD_W-100?'e':p.y<100?'n':'s';groups[side].push(p);}for(const side in groups){const g=groups[side];for(let i=0;i<g.length;i++){const off=(i-(g.length-1)/2)*88;if(side==='n'||side==='s')g[i].x=Math.max(140,Math.min(WORLD_W-140,g[i].x+off));else g[i].y=Math.max(140,Math.min(WORLD_H-140,g[i].y+off));}}}
 const A=[
 ['town','リンドフィー',0,'village','town',11111,24,[],null,'full'],['field','メイベルの麦畑',1,'farm','field',11112,105,['slime','hornRabbit','manaBunny']],['hill','なだらかな丘陵',3,'plains','field',11113,92,['slime','manaWolf','manaHawk']],['westRoad','西街道',5,'road','field',11114,82,['goblin','goblinArcher','manaWolf']],['eastRoad','東街道',6,'road','field',11115,82,['goblin','goblinMage','hornRabbit']],['oldForest','古街道の森',8,'forest','field',11116,130,['manaWolf','goblinArcher','babyDragon']],['watchtower','街道の監視塔跡',10,'ruin','dungeon',11117,70,['goblin','goblinArcher','goblinMage','hobgoblin'],{jp:'ゴブリンロード',el:'風',col:'#6fe0c8',hp:1200,atk:30}],['windmere','ウィンドミア',0,'village','town',11118,22,[],null,'small'],['mabel','メイベル村',0,'village','town',11119,18,[],null,'outpost'],['fenceEnd','フェンス・エンド',0,'village','town',11120,18,[],null,'outpost'],
 ['goldhahn','ゴールドハーン',0,'village','town',12001,22,[],null,'small'],['goldenPlain','黄金平原',11,'farm','field',12011,115,['mandrake','manaHawk','scarab','pudding']],['farmBelt','農園地帯',13,'farm','field',12012,125,['mandrake','myconid','scarab','manaFlower']],['windPlateau','風車高原',15,'plains','field',12013,90,['manaHawk','scarab','gnome','goblinMage']],['canal','灌漑水路',14,'water','field',12014,82,['aquaJelly','manaFish','mudGolem','scarab']],['stillrow','スティルロウ',0,'village','town',12015,18,[],null,'outpost'],['irrigationRuins','地中灌漑機構跡',17,'ruin','dungeon',12016,72,['mudGolem','scarab','goblinMage','gnome'],{jp:'ゴブリンロード',el:'土',col:'#b89050',hp:1500,atk:36}],
 ['univel','王都ユニヴェル',0,'village','town',13001,28,[],null,'full'],['ceres','セレス',0,'village','town',13002,20,[],null,'small'],['royalPlain','王都外縁平原',20,'plains','field',13011,98,['goblinRider','killerBee','sylph','prism']],['oldRoyalRoad','旧王道跡',22,'road','field',13012,85,['hobgoblin','saberCat','harpy','giantSpider']],['sewer','地下水路',24,'water','dungeon',13013,70,['merman','kelpie','lizardman','wisplace']],['undergrow','アンダーグロウ',26,'ruin','field',13014,78,['wisplace','poltergeist','lizardman','gemSlime']],['shrineRuins','地下祭祀場跡',28,'ruin','dungeon',13015,68,['stoneGolem','wisplace','cockatrice','tanuki'],{jp:'キングスライム',el:'土',col:'#8a7a55',hp:2100,atk:44}],
 ['rowendil','ロウェンディル',0,'village','town',14001,22,[],null,'small'],['timber','ティンバー',0,'village','town',14002,18,[],null,'outpost'],['hunterHideout','狩人の隠れ里',0,'village','town',14003,16,[],null,'outpost'],['greenhollow','グリーンホロウ',0,'village','town',14004,18,[],null,'outpost'],['blackRoad','黒森街道',30,'forest','field',14011,112,['drake','tanuki','wyvern','succubus']],['greenForest','深緑の森',32,'forest','field',14012,145,['alraune','yokaiFox','manaBear','darkElf','elderDrake']],['mistMarsh','霧鳴き湿地',33,'marsh','field',14013,110,['mirage','alraune','cockatrice','wisplace']],['oldTreeHunt','古樹の狩場',36,'forest','field',14014,130,['yokaiFox','succubus','darkElf','mirage']],['forestLab','森に埋もれた研究施設跡',40,'ruin','dungeon',14015,72,['succubus','darkElf','mirage','stoneGolem'],{jp:'九尾',asset:'フェンリル',el:'風',col:'#d0b070',hp:3800,atk:62}],
 ['miraLake','ミラレイク',0,'village','town',15001,22,[],null,'small'],['ripple','リプル',0,'village','town',15002,18,[],null,'outpost'],['mirrorLake','水鏡の湖',44,'water','field',15011,95,['seaSerpent','giantTurtle','frostDragon','lindwurm']],['fogPromenade','霧の遊歩道',44,'road','field',15012,88,['troll','cyclops','ogre','earthDragon']],['rippleShore','リプル湖岸',46,'water','field',15013,96,['seaSerpent','giantTurtle','stormDragon','frostDragon']],['sunkenRoad','沈みかけた旧街道',48,'marsh','field',15014,86,['ironGolem','sandWorm','earthDragon','ogre']],['lakeRuins','湖底遺跡',52,'water','dungeon',15015,68,['seaSerpent','giantTurtle','stoneGolem','frostDragon'],{jp:'アースドラゴン',el:'土',col:'#e0c060',hp:6200,atk:78}],
 ['acrossPort','港町アクロス',0,'port','town',16001,24,[],null,'full'],['dockside','ドックサイド',0,'port','town',16002,18,[],null,'small'],['saltFlat','ソルティ・フラット',0,'port','town',16003,18,[],null,'outpost'],['seaRoad','潮風街道',52,'port','field',16011,86,['griffon','thunder','cerberus','lindwurm']],['windCape','風待ち岬',54,'plains','field',16012,76,['siren','thunder','pegasus','jinn','unicorn']],['warehouseCanal','倉庫運河',52,'water','field',16013,82,['seaSerpent','giantTurtle','siren','lindwurm']],['offshorePier','沖合浮桟橋',58,'port','field',16014,74,['siren','seaSerpent','vampire','nightmare']],['airshipDock','沈没した飛空艇ドック跡',60,'ruin','dungeon',16015,62,['sentry','seaSerpent','phantom','guardian'],{jp:'クラーケン',asset:'シーサーペント',el:'水',col:'#7fd0e8',hp:9000,atk:95}],
 ['graubachCity','工業都市グラウバッハ',0,'industry','town',17001,22,[],null,'full'],['ashCommon','アッシュ・コモン',0,'industry','town',17002,18,[],null,'small'],['elixirField','エリクサー田',62,'industry','field',17011,88,['crystalGolem','guardian','nightmare','gemKing']],['sootyRoad','煤けた街道',62,'industry','field',17012,82,['cerberus','nightmare','guardian','fenrir']],['manaFogLowland','マナ霧の低地',66,'marsh','field',17013,78,['guardian','fenrir','hydra','unicorn']],['elixirEdge','エリクサー田外縁',68,'industry','field',17014,76,['fenrir','hydra','phoenix','ironGolem']],['refineLine','廃精製ライン',70,'industry','dungeon',17015,64,['ironGolem','crystalGolem','guardian','sentryCore'],{jp:'ガーディアン',asset:'ロックスライム',el:'無',col:'#a8b0b8',hp:12500,atk:120}],['elixirPlant','エリクサー濃縮工場跡',72,'industry','dungeon',17016,58,['guardian','sentryCore','crystalGolem','nightmare'],{jp:'賢者の石',asset:'ジェムスライム',el:'無',col:'#ff5a9a',hp:18000,atk:135}],
 ['eisenroar','アイゼンロア',0,'mine','town',18001,22,[],null,'full'],['deepvein','ディープヴェイン',0,'mine','town',18002,18,[],null,'small'],['freepick','フリーピック',0,'mine','town',18003,18,[],null,'outpost'],['ironRoad','鉄灰の山道',74,'mine','field',18011,78,['nineTail','ironGolem','lich','sandWorm']],['oldMine','古鉱道',76,'mine','dungeon',18012,70,['ironGolem','sandWorm','lich','ancientDragon']],['crystalCave','結晶洞窟',78,'mine','field',18013,72,['crystalGolem','sentryCore','lich','titanGolem']],['independentMine','独立採掘区',76,'mine','field',18014,72,['ironGolem','nineTail','sandWorm','gemKing']],['miningMech','AMC採掘機構跡',82,'ruin','dungeon',18015,58,['sentryCore','ironGolem','crystalGolem','ancientDragon'],{jp:'エンシェントドラゴン',el:'無',col:'#ff2d6d',hp:26000,atk:160}],
 ['wallguard','ウォールガード',0,'wasteland','town',19001,22,[],null,'full'],['garrison','王国軍駐屯地',0,'wasteland','town',19002,18,[],null,'small'],['pioneerVillages','開拓村群',0,'wasteland','town',19003,18,[],null,'outpost'],['liberta','リベルタ',0,'wasteland','town',19004,18,[],null,'small'],['greyFrontier','灰色の辺境道',84,'wasteland','field',19011,72,['sentryCore','prismWraith','progenitorVampire']],['frontierWilderness','開拓荒野',85,'wasteland','field',19012,72,['prismWraith','manaAnomaly','titanGolem']],['borderForts','境界砦群',87,'ruin','field',19013,68,['sentryCore','progenitorVampire','arcWarden']],['libertaEdge','リベルタ外縁区',87,'wasteland','field',19014,68,['prismWraith','progenitorVampire','manaAnomaly']],['borderDungeon','境界砦地下遺構',90,'ruin','dungeon',19015,56,['sentryCore','manaAnomaly','prismWraith','arcWarden'],{jp:'アーク・ウォーデン',asset:'ルクス',el:'無',col:'#bcd0ff',hp:42000,atk:210}],
 ['lastHold','ラストホールド',0,'wasteland','town',20001,20,[],null,'full'],['exileCamp','流刑者集落',0,'wasteland','town',20002,18,[],null,'outpost'],['ruinedSankt','廃区ザンクト',0,'ruin','town',20003,18,[],null,'small'],['whiteWilderness','白虹の荒野',92,'void','field',20011,66,['manaAnomaly','voidSpirit','ancientLich']],['rottenPioneer','朽ちた開拓地',92,'wasteland','field',20012,66,['manaAnomaly','ancientLich','behemoth']],['sanktRoad','ザンクト外縁廃道',94,'ruin','field',20013,62,['voidSpirit','ancientLich','calamityDragon']],['oblivionOuter','忘却の外郭',96,'void','field',20014,60,['calamityDragon','behemoth','arcGuardian']],['oblivionRuins','忘却の遺跡群',98,'void','dungeon',20015,56,['sentryCore','manaAnomaly','ancientDragon','arcGuardian']],['recordCore','賢者の記録中枢',99,'void','dungeon',20016,52,['arcGuardian','ancientLich','manaAnomaly','voidSpirit']],['starshipWreck','惑星間飛行船の残骸',99,'void','dungeon',20017,50,['sentryCore','arcGuardian','calamityDragon','behemoth']],['finalSector','最終区画',99,'void','dungeon',20018,48,['arcGuardian','ancientLich','calamityDragon','behemoth'],{jp:'忘却の番人アムネシア',asset:'アンブラ',el:'無',col:'#d9c7ff',hp:90000,atk:310,mega:true,fixedDrop:true}],['postGameSector','ポストゲーム区画',99,'void','dungeon',20019,48,['arcGuardian','ancientLich','calamityDragon','behemoth'],{jp:'忘却の番人アムネシア',asset:'アンブラ',el:'無',col:'#d9c7ff',hp:140000,atk:380,mega:true,fixedDrop:true}]
 ];
 const LINKS={
  town:[['n','windmere'],['e','field'],['s','mabel']],
  windmere:[['s','town'],['e','westRoad'],['n','oldForest']],
  field:[['w','town'],['e','hill'],['s','mabel']],
  mabel:[['n','field'],['e','eastRoad'],['s','town']],
  hill:[['w','field'],['e','westRoad'],['s','eastRoad']],
  westRoad:[['w','hill'],['n','windmere'],['e','oldForest'],['s','ceres']],
  eastRoad:[['w','mabel'],['n','hill'],['e','watchtower'],['s','goldenPlain']],
  oldForest:[['w','westRoad'],['e','fenceEnd'],['s','watchtower'],['n','windmere']],
  fenceEnd:[['w','oldForest']],
  watchtower:[['w','eastRoad'],['n','oldForest']],

  goldhahn:[['n','goldenPlain'],['e','farmBelt'],['s','canal']],
  goldenPlain:[['n','eastRoad'],['s','goldhahn'],['e','farmBelt'],['w','royalPlain']],
  farmBelt:[['w','goldenPlain'],['s','stillrow'],['e','windPlateau'],['n','goldhahn']],
  windPlateau:[['w','farmBelt'],['s','canal']],
  canal:[['n','goldhahn'],['e','irrigationRuins'],['w','stillrow'],['s','royalPlain'],['e','windPlateau']],
  stillrow:[['e','canal'],['n','farmBelt']],
  irrigationRuins:[['w','canal']],

  univel:[['w','ceres'],['s','royalPlain'],['n','oldRoyalRoad'],['e','mirrorLake']],
  ceres:[['e','univel'],['w','westRoad']],
  royalPlain:[['n','univel'],['w','goldenPlain'],['e','mirrorLake'],['s','sewer'],['s','canal']],
  oldRoyalRoad:[['s','univel'],['n','blackRoad'],['e','undergrow']],
  sewer:[['n','royalPlain'],['e','undergrow']],
  undergrow:[['w','oldRoyalRoad'],['s','shrineRuins'],['e','sewer']],
  shrineRuins:[['n','undergrow']],

  rowendil:[['s','blackRoad'],['e','timber'],['w','greenForest']],
  timber:[['w','rowendil'],['s','greenhollow'],['n','hunterHideout']],
  hunterHideout:[['s','timber'],['e','greenForest']],
  greenhollow:[['n','timber'],['s','mistMarsh']],
  blackRoad:[['s','oldRoyalRoad'],['n','rowendil'],['e','greenForest']],
  greenForest:[['w','rowendil'],['e','mistMarsh'],['n','hunterHideout'],['s','oldTreeHunt'],['w','blackRoad']],
  mistMarsh:[['w','greenForest'],['n','greenhollow'],['s','oldTreeHunt']],
  oldTreeHunt:[['n','greenForest'],['e','forestLab'],['s','acrossPort'],['w','mistMarsh']],
  forestLab:[['w','oldTreeHunt']],

  miraLake:[['n','mirrorLake'],['e','ripple'],['s','fogPromenade']],
  ripple:[['w','miraLake'],['s','rippleShore']],
  mirrorLake:[['w','univel'],['s','miraLake'],['e','fogPromenade'],['n','royalPlain']],
  fogPromenade:[['n','miraLake'],['w','mirrorLake'],['e','sunkenRoad']],
  rippleShore:[['n','ripple'],['e','lakeRuins'],['s','acrossPort']],
  sunkenRoad:[['w','fogPromenade'],['s','lakeRuins']],
  lakeRuins:[['w','rippleShore'],['n','sunkenRoad']],

  acrossPort:[['n','rippleShore'],['w','oldTreeHunt'],['e','warehouseCanal'],['s','seaRoad'],['w','dockside'],['s','saltFlat']],
  dockside:[['e','acrossPort'],['s','warehouseCanal']],
  saltFlat:[['n','acrossPort'],['e','seaRoad']],
  seaRoad:[['n','acrossPort'],['w','saltFlat'],['e','windCape']],
  windCape:[['w','seaRoad'],['s','offshorePier']],
  warehouseCanal:[['w','acrossPort'],['n','dockside'],['s','offshorePier']],
  offshorePier:[['n','windCape'],['w','warehouseCanal'],['e','airshipDock'],['s','graubachCity']],
  airshipDock:[['w','offshorePier']],

  graubachCity:[['n','offshorePier'],['w','ashCommon'],['e','sootyRoad'],['s','elixirField']],
  ashCommon:[['e','graubachCity'],['s','sootyRoad']],
  elixirField:[['n','graubachCity'],['e','manaFogLowland']],
  sootyRoad:[['w','ashCommon'],['e','manaFogLowland'],['n','graubachCity']],
  manaFogLowland:[['w','elixirField'],['n','sootyRoad'],['s','elixirEdge']],
  elixirEdge:[['n','manaFogLowland'],['e','refineLine'],['s','eisenroar']],
  refineLine:[['w','elixirEdge'],['e','elixirPlant']],
  elixirPlant:[['w','refineLine']],

  eisenroar:[['n','elixirEdge'],['w','deepvein'],['e','ironRoad'],['s','crystalCave']],
  deepvein:[['e','eisenroar'],['s','oldMine']],
  freepick:[['w','oldMine'],['s','independentMine']],
  ironRoad:[['w','eisenroar'],['e','crystalCave']],
  oldMine:[['n','deepvein'],['e','freepick']],
  crystalCave:[['w','ironRoad'],['n','eisenroar'],['s','independentMine']],
  independentMine:[['n','crystalCave'],['w','freepick'],['e','miningMech'],['s','wallguard']],
  miningMech:[['w','independentMine']],

  wallguard:[['n','independentMine'],['e','garrison'],['s','greyFrontier']],
  garrison:[['w','wallguard'],['s','pioneerVillages']],
  pioneerVillages:[['n','garrison'],['e','liberta']],
  liberta:[['w','pioneerVillages'],['s','libertaEdge']],
  greyFrontier:[['n','wallguard'],['e','frontierWilderness']],
  frontierWilderness:[['w','greyFrontier'],['e','borderForts']],
  borderForts:[['w','frontierWilderness'],['s','libertaEdge']],
  libertaEdge:[['n','liberta'],['w','borderForts'],['e','borderDungeon'],['s','lastHold']],
  borderDungeon:[['w','libertaEdge']],

  lastHold:[['n','libertaEdge'],['e','exileCamp'],['s','whiteWilderness']],
  exileCamp:[['w','lastHold'],['s','ruinedSankt']],
  ruinedSankt:[['n','exileCamp'],['s','sanktRoad']],
  whiteWilderness:[['n','lastHold'],['e','rottenPioneer']],
  rottenPioneer:[['w','whiteWilderness'],['e','sanktRoad']],
  sanktRoad:[['n','ruinedSankt'],['w','rottenPioneer'],['s','oblivionOuter']],
  oblivionOuter:[['n','sanktRoad'],['s','oblivionRuins']],
  oblivionRuins:[['n','oblivionOuter'],['e','recordCore']],
  recordCore:[['w','oblivionRuins'],['e','starshipWreck']],
  starshipWreck:[['w','recordCore'],['e','finalSector']],
  finalSector:[['w','starshipWreck'],['s','postGameSector']],
  postGameSector:[['n','finalSector']]
 };
 const out={};
 for(let i=0;i<A.length;i++){const [id,name,mlv,theme,kind,seed,count,enemies,bossDef,fac]=A[i],t=THEME[theme]||THEME.plains,town=kind==='town';out[id]={name,mlv,town,ground:t.ground,gpond:t.gpond,deco:t.deco,ponds:t.ponds.map(p=>({...p})),decos:genDecos(seed,count),enemies:(enemies||[]).slice(),boss:!!bossDef,bx:WORLD_W/2,by:WORLD_H*0.28,bossDef:bossDef||null,portals:[]};if(town)out[id].facilities=facilities(fac||'small');}
 for(const id in LINKS)if(out[id]){for(const [side,to] of LINKS[id])if(out[to])out[id].portals.push(portal(side,to,out[to].name));spreadPortals(out[id].portals);}
 return out;
};
