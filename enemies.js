// Enemy definitions are separated from index.html so they can be edited by hand.
// ET contains monster data. ENEMY_RANK contains rank multipliers and sync settings.
window.AMC_ENEMIES={
 ET:{
 // 草原
 slime: {jp:'マナスライム',el:'水',at:'melee', hp:60, def:5, atk:9, spd:0.50,r:15,col:'#3aa0ff',exp:16,windup:2.2,recover:1.3},
 sprite:{jp:'ホーンラビット',el:'風',at:'melee',hp:40,def:5,atk:8,spd:1.05,r:11,col:'#bdf06a',exp:18,windup:1.3,recover:1.0},
 // 深緑の森
 boar:  {jp:'マナウルフ',  el:'土',at:'charge',hp:120,def:9, atk:20,spd:0.70,r:17,col:'#b07a4a',exp:42,windup:1.1,recover:1.3,dash:12},
 hornet:{jp:'ゴブリンアーチャー',el:'風',at:'ranged',hp:70,def:7,atk:14,spd:0.85,r:12,col:'#e6b531',exp:38,windup:1.3,recover:1.1,range:320,shotSpd:5.2,burst:3},
 fungus:{jp:'ゴブリンメイジ',el:'土',at:'ranged',hp:90,def:9,atk:13,spd:0.45,r:15,col:'#8a9a5a',exp:40,windup:1.6,recover:1.3,range:280,shotSpd:3.6},
 // 紅蓮の火山
 wisp:  {jp:'ウィル・オ・ウィスプ',el:'火',at:'ranged',hp:80,def:8,atk:16,spd:0.70,r:13,col:'#ff8a4a',exp:48,windup:1.2,recover:1.1,range:320,shotSpd:4.6},
 salaman:{jp:'サラマンダー',el:'火',at:'melee',hp:150,def:11,atk:22,spd:0.80,r:16,col:'#ff5a2a',exp:56,windup:1.5,recover:1.2},
 magma: {jp:'フレイムスライム',el:'火',at:'charge',hp:170,def:13,atk:26,spd:0.72,r:18,col:'#ff3a1a',exp:60,windup:1.1,recover:1.4,dash:12},
 // 蒼氷の洞窟
 frost: {jp:'ケルピー',el:'水',at:'charge',hp:200,def:14,atk:28,spd:0.74,r:18,col:'#7fe0ff',exp:74,windup:1.2,recover:1.4,dash:11},
 icewisp:{jp:'ウンディーネ',el:'水',at:'ranged',hp:130,def:12,atk:24,spd:0.72,r:13,col:'#bfefff',exp:70,windup:1.3,recover:1.1,range:340,shotSpd:5.0,burst:3},
 yeti:  {jp:'フェンリル',el:'水',at:'melee',hp:260,def:16,atk:30,spd:0.62,r:20,col:'#cfe8f0',exp:80,windup:1.7,recover:1.3},
 // 忘却の遺跡
 wraith:{jp:'スピリット',el:'無',at:'ranged',hp:170,def:16,atk:30,spd:0.82,r:14,col:'#9a7adf',exp:96,windup:1.4,recover:1.0,range:360,shotSpd:5.6,burst:3},
 sentry:{jp:'ホブゴブリン',el:'無',at:'melee',hp:330,def:20,atk:34,spd:0.60,r:20,col:'#8a8f9a',exp:104,windup:1.8,recover:1.4},
 phantom:{jp:'ナイトメア',el:'無',at:'charge',hp:240,def:17,atk:36,spd:0.92,r:16,col:'#b0a0d0',exp:100,windup:1.0,recover:1.3,dash:14},
 // 灼熱の砂漠
 scarab:{jp:'ロックスライム',el:'土',at:'charge',hp:300,def:20,atk:40,spd:0.78,r:17,col:'#c8a060',exp:120,windup:1.1,recover:1.3,dash:13},
 mirage:{jp:'ノーム',el:'火',at:'ranged',hp:220,def:18,atk:38,spd:0.80,r:13,col:'#ffb060',exp:118,windup:1.3,recover:1.0,range:360,shotSpd:5.4,burst:3},
 sandw: {jp:'サイクロプス',el:'土',at:'melee',hp:420,def:24,atk:44,spd:0.60,r:22,col:'#b89050',exp:140,windup:1.7,recover:1.3},
 // 雷鳴の天空
 griffon:{jp:'グリフォン',el:'風',at:'charge',hp:360,def:22,atk:48,spd:1.00,r:18,col:'#dfe8a0',exp:150,windup:0.9,recover:1.2,dash:16},
 thunder:{jp:'サンダーバード',el:'風',at:'ranged',hp:300,def:20,atk:46,spd:0.85,r:14,col:'#ffe14a',exp:148,windup:1.2,recover:1.0,range:380,shotSpd:6.2,burst:3},
 cloud: {jp:'ペガサス',el:'水',at:'melee',hp:480,def:26,atk:50,spd:0.62,r:20,col:'#cfe0f0',exp:160,windup:1.6,recover:1.3},
 // 虚無の深淵
 shade: {jp:'アンブラ',el:'無',at:'melee',hp:560,def:30,atk:58,spd:0.70,r:18,col:'#7a708a',exp:200,windup:1.5,recover:1.2},
 abyssal:{jp:'ルクス',el:'無',at:'ranged',hp:440,def:28,atk:56,spd:0.80,r:14,col:'#9a6aa0',exp:196,windup:1.3,recover:1.0,range:400,shotSpd:6.6,burst:4},
 devour:{jp:'ケルベロス',el:'無',at:'charge',hp:520,def:30,atk:64,spd:0.95,r:18,col:'#a04a6a',exp:210,windup:1.0,recover:1.3,dash:17},
 // 終焉の玉座
 revenant:{jp:'オーガロード',el:'無',at:'melee',hp:900,def:38,atk:88,spd:0.78,r:20,col:'#6a5a7a',exp:320,windup:1.4,recover:1.2},
 doomeye:{jp:'ドレイク',el:'無',at:'ranged',hp:760,def:36,atk:84,spd:0.78,r:15,col:'#b04a9a',exp:316,windup:1.2,recover:0.9,range:420,shotSpd:7.0,burst:5},
 // 風の谷（森・北分岐）
 mantis:{jp:'マナディア',el:'風',at:'melee',hp:90,def:8,atk:18,spd:1.15,r:13,col:'#9ee06a',exp:46,windup:0.9,recover:0.9,mv:'weave'},
 pixie: {jp:'シルフ',el:'風',at:'ranged',hp:60,def:7,atk:15,spd:1.05,r:11,col:'#c0ffd0',exp:44,windup:1.0,recover:1.0,range:300,shotSpd:5.0,burst:2,mv:'circle'},
 // 水晶谷（洞窟・北分岐）
 crystalan:{jp:'ジェムスライム',el:'水',at:'charge',hp:240,def:16,atk:30,spd:0.85,r:17,col:'#aef0ff',exp:82,windup:1.0,recover:1.3,dash:13,mv:'burst'},
 prism: {jp:'プリズムバード',el:'水',at:'ranged',hp:160,def:14,atk:26,spd:0.7,r:13,col:'#dffaff',exp:80,windup:1.2,recover:1.0,range:360,shotSpd:5.6,burst:4,mv:'circle'},
},
 ENEMY_RANK:{
 normal:{hpMul:1,atkMul:1,scale:1,expRate:0.5,sync:false},
 rare:{hpMul:4,atkMul:1.8,scale:1.35,expRate:0.7,sync:false,announce:true},
 elite:{hpMul:50,atkMul:3,scale:3,expRate:0.8,sync:true,announce:true},
 boss:{hpMul:1,atkMul:1,scale:1,expRate:0.7,sync:true,announce:true},
 demon:{hpMul:50,atkMul:3,scale:1,expRate:0.8,sync:true,announce:true,caster:true}
}
};
