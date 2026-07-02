# AMC Tiled ワールド仕様

このディレクトリは、Tiled で編集する巨大ワールドマップと、それをゲーム用データへ変換するツールを管理します。

## 基本方針

- ゲーム内の通常フィールドは、1枚の巨大な Tiled マップ上にある名前付きエリアとして扱います。
- エリアは四角形でも多角形でも構いません。
- 町、村、キャンプ、フィールド、道、ダンジョンは `kind` で区別します。
- ゲーム側では `world_data.js` を読み込み、既存の `MAPS` に Tiled の情報を反映します。
- `world_data.js` は生成物です。手で編集せず、Tiled の `.tmj` を編集して再生成します。

## 推奨ファイル構成

```txt
editor/
  AMC.tmj
  TILED_SPEC.md
  validate-tiled-world.mjs
  import-tiled-world.mjs
  build-world.mjs
  bootstrap-amc-tmj.mjs
  story-world-layout.mjs
  legacy/
world_data.js
```

## よく使うコマンド

Tiled データを検証するだけ:

```powershell
node editor/validate-tiled-world.mjs
```

検証してから `world_data.js` を生成:

```powershell
node editor/build-world.mjs
```

施設、石碑、復帰地点、ボス配置が所属エリア外に出ている場合の自動補正:

```powershell
node editor/repair-tiled-placements.mjs
```

入力/出力ファイルを指定する場合:

```powershell
node editor/build-world.mjs editor/AMC.tmj world_data.js
```

ゲーム全体の静的チェック:

```powershell
node tools/check-game.mjs
```

`tools/check-game.mjs` は Tiled 検証も実行します。

## Tiled 側の基本設定

- 形式: `.tmj`
- Orientation: `Orthogonal`
- Tile Size: `32 x 32`
- Infinite Map: 使用してもよい
- 座標: Tiled 上のピクセル座標を巨大ワールド座標として扱います。

## レイヤー

### エリアレイヤー

以下はいずれもエリア定義用の Object Layer です。

- `Areas`
- `Areas_Towns`
- `Areas_Fields`
- `Areas_Dungeons`
- `Areas_Routes`

エリアオブジェクトのプロパティ:

- `id`: 必須。ゲーム内で使う安定ID。例: `town`, `mabel_field`
- `name`: 表示名
- `kind`: `town`, `village`, `camp`, `jail`, `field`, `dungeon`, `road`
- `level`: 推奨レベル。1以上
- `theme`: 地形テーマ。例: `plains`, `forest`, `desert`
- `bgm`: BGMキー。任意

### SpawnZones

モンスターの湧き範囲です。四角形または Ellipse を使います。Ellipse はゲーム側では円形扱いです。

プロパティ:

- `area`: 必須。所属エリアID
- `monster`: 必須。モンスターIDを1種類だけ指定
- `baseLevel`: 必須。基準レベル
- `levelVariance`: 任意。初期値 `3`
- `maxAlive`: 必須。その範囲の同時出現上限
- `spawnIntervalMin`: 任意。初期値 `8`
- `spawnIntervalMax`: 任意。初期値 `20`
- `minPlayerDistance`: 任意。初期値 `260`
- `rareChance`: 任意
- `eliteChance`: 任意
- `respawn`: 任意。通常フィールドは `true`、ダンジョンは `false` 推奨
- `shape`: 任意。`rect` または `circle`

ルール:

- 1つのスポーン範囲に入れるモンスターは1種類だけです。
- 町、村、キャンプ、牢獄エリアには配置しません。
- 別のスポーン範囲との重なりは1つまで許可します。
- Polygon のスポーン範囲は使いません。

### Facilities

施設の配置です。

プロパティ:

- `area`: 必須
- `facility`: 必須。施設種別
- `label`: 任意。表示名
- `radius`: 任意。接触判定半径

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

町ごとにすべての施設を置く必要はありません。ただし、復帰地点の基準になるため、町や村には `guild` を置くのを推奨します。

### NPCs

NPC の配置です。

プロパティ:

- `area`: 必須
- `npc`: NPC ID
- `name`: 表示名
- `role`: 任意

### Stones

石碑の配置です。

プロパティ:

- `area`: 必須
- `id`: 石碑ID
- `spell`: 解読で得る内容。任意

### RespawnPoints

復帰地点です。基本的にはギルド前に置きます。

プロパティ:

- `area`: 必須
- `respawn`: 任意

### Bosses

ボス配置です。

プロパティ:

- `area`: 必須
- `boss`: ボス定義キー。任意
- `level`: 任意

### Collision / Decoration

- `Collision`: 通行不可範囲
- `Decoration`: 木、岩、草花、遺跡片など。`deco` プロパティに `assets/pictures/` の画像名を入れるとゲーム内に描画されます。

### タイルレイヤー

Tiled で直接地形を描く場合は、次の Tile Layer を使います。

- `Ground`: 地面の基本タイル
- `Detail`: 道、草花、地形変化などの上描き

マップチップは `editor/maptiles.tsj` に登録しています。画像の実体は `assets/maptip/` にあります。

現時点では `Ground` / `Detail` が空でもゲームは旧自動地形で描画されます。Tiled 側でタイルを置いた場所だけ、ゲーム内で Tiled タイルが上に反映されます。

`editor/paint-tiled-terrain.mjs` を実行すると、エリアの `kind` / `theme` に合わせて `Ground` / `Detail` と `Decoration` を自動配置します。

タイルレイヤーは Tiled 標準の `base64 + zlib` 圧縮チャンクで保存します。ゲーム用の `world_data.js` では、置いたタイルだけを持つ軽量形式に変換されます。

## 検証でエラーになるもの

`editor/validate-tiled-world.mjs` は次をエラーとして扱います。

- エリアIDの未設定または重複
- 空サイズのエリア
- Object Layer であるべきレイヤーが別タイプ
- `Ground` / `Detail` が Tile Layer ではない
- `editor/maptiles.tsj` がない
- `area` プロパティの未設定
- 存在しないエリア参照
- 施設種別の不正
- 存在しないモンスターID
- スポーン範囲に複数モンスターを指定
- 町系エリア内のスポーン範囲
- スポーン範囲が所属エリア外
- スポーン範囲が2つ以上の別スポーン範囲と重なる
- Polygon のスポーン範囲
- 不正な `baseLevel`, `levelVariance`, `maxAlive`, 湧き時間

## 検証で警告になるもの

警告は作業を止めませんが、見直し推奨です。

- エリア表示名の重複
- 未知の `kind`
- エリアレベルとスポーン基準レベルが大きく離れている
- 円形スポーンの幅と高さが違う
- 町系エリアに `guild` がない
- エリアの外接矩形が多数のエリアと重なる

## 生成される world_data.js

`import-tiled-world.mjs` は次のようなデータを出力します。

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
  respawnPoints: [],
  bosses: [],
  collisions: [],
  decorations: [],
  tileImages: [],
  tileLayers: [],
  chunks: []
};
```

## 編集時の運用

1. Tiled で `editor/AMC.tmj` を編集する。
2. 地形と装飾を自動配置し直す場合は `node editor/paint-tiled-terrain.mjs` を実行する。
3. 配置警告が出る場合は `node editor/repair-tiled-placements.mjs` を実行する。
4. `node editor/build-world.mjs` を実行する。
5. `node tools/check-game.mjs` を実行する。
6. ゲームで確認する。

マップ編集で壊れやすいのは、IDの打ち間違い、所属エリアの指定忘れ、スポーン範囲の重なりです。大きく編集した後は、必ず検証を通してください。
