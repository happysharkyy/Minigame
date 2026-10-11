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

// ── 连续游玩天数 ──────────────────────────────
// 日期算错是最难发现的一类 bug(跨月、跨年、夏令时), 所以同样抽成纯函数并覆盖边界。

function parseStamp(stamp) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(stamp ?? ''));
  if (!m) return null;
  const y = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { y, month, day };
}

// 用 UTC 构造再取天数差: 本地时间构造会被夏令时搞成 0.958 天, 取整后误判成"不是相邻天"
function dayIndex({ y, month, day }) {
  return Date.UTC(y, month - 1, day) / 86_400_000;
}

export function isNextDay(previousStamp, todayStamp) {
  const previous = parseStamp(previousStamp);
  const today = parseStamp(todayStamp);
  if (!previous || !today) return false;
  return dayIndex(today) - dayIndex(previous) === 1;
}

/**
 * 按"今天"推进连续天数:
 * - 同一天再玩: 天数不变(一天玩十局也只算一天)
 * - 昨天玩过: +1
 * - 有断档 / 没有记录 / 记录损坏: 重新从 1 开始
 */
export function computeStreak({ lastDate, days, today }) {
  const safeToday = parseStamp(today) ? today : null;
  const previousDays = Math.max(0, Math.round(Number(days) || 0));

  if (!safeToday) return { lastDate: null, days: 1 };
  if (lastDate === safeToday) return { lastDate: safeToday, days: Math.max(1, previousDays) };
  if (isNextDay(lastDate, safeToday)) return { lastDate: safeToday, days: previousDays + 1 };
  return { lastDate: safeToday, days: 1 };
}
