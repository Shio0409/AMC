# AMC Tiled ワールド仕様

このフォルダは、将来的なシームレス巨大ワールド用の編集データと変換ツールを置く場所です。

## 目的

今後は「小さいマップ同士をポータルで接続する方式」から、次の構造へ移行します。

- 1枚の巨大なワールド座標を持つ。
- その中に名前付きのエリアを配置する。
- プレイヤーがエリアに入ったら、エリア名を画面上に表示する。
- エリアごとに敵、施設、NPC、石碑、ボス、BGM、推奨レベルなどを持たせる。
- プレイヤー周辺のチャンク/エリアだけ読み込む。
- 遠く離れたチャンク/エリアの情報は破棄する。
- ポータル移動ではなく、辺や境界をまたいだ自然な移動にする。

Tiled のファイルは「編集元データ」として扱います。ゲーム本体が Tiled の仕様に強く依存しないよう、`import-tiled-world.mjs` でゲーム用の `world_data.js` に変換します。

## 推奨ファイル構成

```txt
editor/
  TILED_SPEC.md
  AMC.tmj
  AMC.world
  import-tiled-world.mjs
  tilesets/
  legacy/
world_data.js
```

- `AMC.tmj`: Tiled で編集するメインワールド。
- `AMC.world`: 複数マップに分ける場合の Tiled ワールドファイル。最初は無くてもよいです。
- `world_data.js`: importer が生成するゲーム用データ。手で編集しません。

## Tiled 側の基本設定

推奨設定:

- 形式: `.tmj`
- タイルサイズ: `32 x 32`
- Orientation: `Orthogonal`
- Infinite Map: 使用可
- 座標: 巨大ワールド上のピクセル座標として扱う

## レイヤー仕様

レイヤー名は大文字小文字を区別します。

### タイルレイヤー

- `Ground`: 地面の基本タイル。
- `Detail`: 道、花、床の変化、小さな地面装飾など。

### オブジェクトレイヤー

- `Areas`: 名前付きエリア。必須。
- `SpawnZones`: モンスターの湧き範囲。
- `Facilities`: 店、ギルド、教会、銀行など。
- `NPCs`: NPC の配置。
- `Stones`: 石碑の配置。
- `Bosses`: ボスの位置や範囲。
- `Collision`: 通行不可範囲。
- `Decoration`: 木、岩、瓦礫、置物など。

最初の importer では `Areas` だけ必須です。移行中は他のレイヤーが空でも構いません。

## オブジェクトの type

Tiled のオブジェクトには、できるだけ `type` を設定します。

- `area`
- `spawnZone`
- `facility`
- `npc`
- `stone`
- `boss`
- `collision`
- `deco`

`type` が空の場合、importer はレイヤー名から推測します。

## Areas レイヤー

エリアは矩形またはポリゴンで配置します。まずは矩形推奨です。

必須/推奨プロパティ:

- `id`: 安定したエリアID。例: `town`, `mabel_field`
- `name`: 画面に表示するエリア名
- `kind`: `town`, `field`, `dungeon`, `road` など
- `level`: 推奨レベル
- `theme`: 見た目テーマ。例: `village`, `farm`, `forest`
- `bgm`: BGM キー。任意

例:

```txt
type: area
id: town
name: リンドフィー
kind: town
level: 1
theme: village
```

## SpawnZones レイヤー

敵の湧き範囲を矩形またはポリゴンで配置します。

プロパティ:

- `area`: 所属エリアID。省略時は、範囲が入っているエリアから推測予定。
- `enemies`: 敵IDをカンマ区切りで指定。例: `slime,hornRabbit,manaBunny`
- `level`: 湧き範囲のレベル補正。任意。
- `rate`: 湧き速度倍率。省略時 `1`
- `max`: その範囲の最大同時出現数。任意。

## Facilities レイヤー

施設を点オブジェクトとして配置します。

プロパティ:

- `area`: 所属エリアID。任意。
- `facility`: 施設種別
- `label`: 表示名。任意。

施設種別:

- `equip`
- `smith`
- `rune`
- `jewel`
- `alchemy`
- `guild`
- `market`
- `bank`
- `church`

## NPCs レイヤー

NPC を点オブジェクトとして配置します。

プロパティ:

- `area`: 所属エリアID。任意。
- `npc`: 安定した NPC ID
- `name`: 表示名
- `role`: 役割。任意。

## Stones レイヤー

石碑を点オブジェクトとして配置します。

プロパティ:

- `area`: 所属エリアID。任意。
- `id`: 安定した石碑ID
- `spell`: 解読で習得する魔法名

## Bosses レイヤー

ボス位置やボス範囲を配置します。

プロパティ:

- `area`: 所属エリアID。任意。
- `boss`: ボスID、またはボス定義キー
- `level`: ボスレベル補正。任意。

## Collision レイヤー

通行不可範囲を矩形またはポリゴンで配置します。

用途:

- 崖
- 壁
- 建物
- 水辺
- 大きな岩や障害物

## Decoration レイヤー

タイルではなくオブジェクトとして置きたい装飾を配置します。

プロパティ:

- `deco`: 装飾ID、画像ID、またはプリセット名
- `scale`: 拡大率。任意。
- `variant`: バリエーション番号。任意。

## 生成される world_data.js

importer は次の形で出力します。

```js
window.AMC_WORLD_DATA = {
  version: 1,
  source: "editor/AMC.tmj",
  tileSize: 32,
  width: 0,
  height: 0,
  infinite: false,
  areas: [],
  spawnZones: [],
  facilities: [],
  npcs: [],
  stones: [],
  bosses: [],
  collisions: [],
  decorations: [],
  chunks: []
};
```

最初のゲーム統合では、まず `areas` を読み、プレイヤーが入ったエリア名を表示するところから始めます。

## 移行方針

- 既存の `maps.js` は、しばらく残します。
- 新方式が安定するまでは、旧マップと新ワールドを併用します。
- まずは `town` 周辺など小さい範囲だけを Tiled 化します。
- フィールド間のシームレス移動が安定してから、ポータル方式を段階的に廃止します。
- AMC 固有のルールチェックは Tiled ではなく importer/checker 側に書きます。

## importer 実行

```powershell
node editor/import-tiled-world.mjs
```

既定では `editor/AMC.tmj` を読み、`world_data.js` を生成します。

別ファイルを指定する場合:

```powershell
node editor/import-tiled-world.mjs editor/AMC.tmj world_data.js
```
