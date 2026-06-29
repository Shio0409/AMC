// Boss pattern tuning. Pattern counts and barrage variants live here for quick iteration.
window.AMC_BOSS_PATTERNS = {
  patternThresholds: [
    { minLv: 70, count: 7 },
    { minLv: 45, count: 6 },
    { minLv: 25, count: 5 },
    { minLv: 0, count: 3 },
  ],
  barrage: [
    { minLv: 90, mod: { repeatMul: 10, repeatDelay: 0.07, powMul: 0.1, split: 5, spread: 0.2 } },
    { minLv: 70, mod: { repeatMul: 10, repeatDelay: 0.08, powMul: 0.1, split: 3, spread: 0.18 } },
    { minLv: 45, mod: { split: 5, spread: 0.22 } },
    { minLv: 0, mod: { split: 2, spread: 0.16 } },
  ],
  megaBarrage: { repeatMul: 10, repeatDelay: 0.07, powMul: 0.1, split: 5, spread: 0.2 },
  barrageStyles: [
    {},
    { split: 8, radial: true, spread: 0.18, mpMul: 1.2 },
    { spread: 1.2, randomSpread: true },
    { sizeMul: 1.45, speedMul: 0.72, splashMul: 1.2 },
    { split: 4, radial: true },
  ],
};
