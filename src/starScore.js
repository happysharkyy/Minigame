// src/starScore.js — 星光接力的计分规则(纯函数, 便于单测)
//
// 抽出来的理由和 roundResult 一样: 连击窗口这种"隔多久算断了"的规则很容易写错,
// 而且错了在界面上只表现为"分数不太对", 很难发现。

export const STAR_COMBO_WINDOW_MS = 2600;

/**
 * 点亮一个光点时, 先决定这次算不算连击。
 * - 从未点亮过(sinceLastLitMs 为 null): 从 1 开始
 * - 距上次点亮超过连击窗口: 断连击, 重新从 1 开始
 * - 窗口内: 连击 +1
 */
export function resolveCombo({ combo, sinceLastLitMs, windowMs = STAR_COMBO_WINDOW_MS }) {
  const previous = Math.max(0, Math.round(Number(combo) || 0));
  const elapsed = Number(sinceLastLitMs);

  if (!Number.isFinite(elapsed) || elapsed > windowMs) return 1;
  return previous + 1;
}

/** 单个光点的得分: 基础 20, 每层连击 +4, 最多加到 30 封顶 */
export function computeStarBonus(combo) {
  const safe = Math.max(1, Math.round(Number(combo) || 1));
  return 20 + Math.min(30, (safe - 1) * 4);
}
