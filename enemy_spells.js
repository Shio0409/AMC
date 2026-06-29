// Enemy spell tuning. Keep enemy/demon rune choices data-driven for balance passes.
window.AMC_ENEMY_SPELL_BALANCE = {
  enemyRanged: {
    defaultSpread: 0.18,
    highLevelRuneChance: 0.22,
    highLevelRuneAt: 55,
    burstRunes: [
      { min: 7, rune: 'バラージ' },
      { min: 5, rune: 'ショットガン' },
      { min: 3, rune: 'スプリット' },
      { min: 2, rune: 'セーバー' },
    ],
    highLevelRunes: ['ワイドショット', 'スキャッター'],
  },
  demon: {
    runes: [
      { minLv: 70, chance: 0.35, any: ['トリプル', 'ダブル'] },
      { minLv: 45, rune: 'ヘビー' },
      { minLv: 70, chance: 0.45, rune: 'ワイドショット' },
    ],
  },
};
