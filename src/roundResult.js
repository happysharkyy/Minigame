// src/roundResult.js — 局末结算的纯计算
//
// 刻意不碰 DOM / localStorage / 音频: 这块逻辑有真实的边界情况
// (0 分、和最佳打平、第一次玩、后端挂了), 抽成纯函数才能用 node --test 覆盖。
// 展示与副作用(写个人最佳、播音效)留在 main.js。

export function computeRoundResult({ score, previousBest, rounds, hasRated }) {
  const safeScore = Math.max(0, Math.round(Number(score) || 0));
  const safeBest = Math.max(0, Math.round(Number(previousBest) || 0));
  const safeRounds = Math.max(1, Math.round(Number(rounds) || 1));

  // 0 分不算破纪录 —— 否则第一局空手而归也会弹"新纪录", 之后就没人信这个徽章了
  const isRecord = safeScore > safeBest && safeScore > 0;
  const best = Math.max(safeBest, safeScore);
  const gap = best - safeScore;

  return {
    score: safeScore,
    best,
    isRecord,
    // 只有在"确实落后、且不是 0 分"时才值得提示差距
    gap: !isRecord && safeScore > 0 && gap > 0 ? gap : 0,
    rounds: safeRounds,
    // 劝评: 玩够 2 局且还没评过。第一次进站就要评价会反噬评价质量
    showReview: !hasRated && safeRounds >= 2,
  };
}
