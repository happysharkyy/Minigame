// tests/roundResult.test.mjs — 局末结算逻辑的单元测试
// 运行: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRoundResult, computeStreak, isNextDay } from '../src/roundResult.js';

test('第一次玩且得分 > 0 就是新纪录', () => {
  const result = computeRoundResult({ score: 320, previousBest: 0, rounds: 1, hasRated: false });
  assert.equal(result.isRecord, true);
  assert.equal(result.best, 320);
  assert.equal(result.gap, 0);
});

test('0 分不算新纪录(否则第一局空手而归也会弹徽章, 徽章就不值钱了)', () => {
  const result = computeRoundResult({ score: 0, previousBest: 0, rounds: 1, hasRated: false });
  assert.equal(result.isRecord, false);
  assert.equal(result.best, 0);
  assert.equal(result.gap, 0);
});

test('0 分不显示"差多少破纪录"——没有参考价值, 只会打击人', () => {
  const result = computeRoundResult({ score: 0, previousBest: 500, rounds: 3, hasRated: false });
  assert.equal(result.gap, 0);
});

test('没破纪录时显示与个人最佳的差距', () => {
  const result = computeRoundResult({ score: 480, previousBest: 600, rounds: 2, hasRated: false });
  assert.equal(result.isRecord, false);
  assert.equal(result.best, 600);
  assert.equal(result.gap, 120);
});

test('和最佳打平不算破纪录, 也不该显示 0 差距', () => {
  const result = computeRoundResult({ score: 600, previousBest: 600, rounds: 4, hasRated: false });
  assert.equal(result.isRecord, false);
  assert.equal(result.best, 600);
  assert.equal(result.gap, 0);
});

test('破纪录时 best 立即更新为本局得分', () => {
  const result = computeRoundResult({ score: 900, previousBest: 600, rounds: 5, hasRated: true });
  assert.equal(result.isRecord, true);
  assert.equal(result.best, 900);
  assert.equal(result.gap, 0);
});

test('劝评: 第一局不出现(刚进站就要评价很打扰)', () => {
  const result = computeRoundResult({ score: 100, previousBest: 0, rounds: 1, hasRated: false });
  assert.equal(result.showReview, false);
});

test('劝评: 玩到第 2 局且没评过时出现', () => {
  const result = computeRoundResult({ score: 100, previousBest: 200, rounds: 2, hasRated: false });
  assert.equal(result.showReview, true);
});

test('劝评: 评过之后就不再出现', () => {
  const result = computeRoundResult({ score: 100, previousBest: 200, rounds: 9, hasRated: true });
  assert.equal(result.showReview, false);
});

test('脏数据(undefined / 字符串 / 负数)不会产生 NaN 或负数', () => {
  const result = computeRoundResult({ score: undefined, previousBest: 'abc', rounds: null, hasRated: false });
  assert.equal(Number.isFinite(result.score), true);
  assert.equal(Number.isFinite(result.best), true);
  assert.equal(Number.isFinite(result.gap), true);
  assert.ok(result.score >= 0 && result.best >= 0 && result.gap >= 0);
  assert.equal(result.rounds, 1);

  const negative = computeRoundResult({ score: -50, previousBest: -10, rounds: 1, hasRated: false });
  assert.equal(negative.score, 0);
  assert.equal(negative.isRecord, false);
});

test('小数得分会被取整(避免结算卡片出现 319.99999)', () => {
  const result = computeRoundResult({ score: 319.6, previousBest: 100, rounds: 1, hasRated: false });
  assert.equal(result.score, 320);
  assert.equal(result.best, 320);
});

// ── 连续游玩天数 ────────────────────────────

test('第一次玩: 连续 1 天', () => {
  const result = computeStreak({ lastDate: undefined, days: undefined, today: '2026-10-12' });
  assert.deepEqual(result, { lastDate: '2026-10-12', days: 1 });
});

test('同一天再玩: 天数不变(一天玩十局也只算一天)', () => {
  const result = computeStreak({ lastDate: '2026-10-12', days: 4, today: '2026-10-12' });
  assert.deepEqual(result, { lastDate: '2026-10-12', days: 4 });
});

test('昨天玩过: +1', () => {
  const result = computeStreak({ lastDate: '2026-10-11', days: 4, today: '2026-10-12' });
  assert.deepEqual(result, { lastDate: '2026-10-12', days: 5 });
});

test('断档(隔了一天以上): 重新从 1 开始', () => {
  const result = computeStreak({ lastDate: '2026-10-09', days: 9, today: '2026-10-12' });
  assert.deepEqual(result, { lastDate: '2026-10-12', days: 1 });
});

test('跨月: 1 月 31 日 -> 2 月 1 日 算连续', () => {
  assert.equal(isNextDay('2026-01-31', '2026-02-01'), true);
  assert.deepEqual(
    computeStreak({ lastDate: '2026-01-31', days: 3, today: '2026-02-01' }),
    { lastDate: '2026-02-01', days: 4 },
  );
});

test('跨年: 12 月 31 日 -> 1 月 1 日 算连续', () => {
  assert.equal(isNextDay('2026-12-31', '2027-01-01'), true);
});

test('平年 2 月 28 日 -> 3 月 1 日 算连续; 闰年 2 月 29 日 -> 3 月 1 日 也算连续', () => {
  assert.equal(isNextDay('2026-02-28', '2026-03-01'), true);
  assert.equal(isNextDay('2028-02-29', '2028-03-01'), true);
});

test('相隔 1 天但方向相反(今天早于记录) 不算连续, 且不会把天数算成负数', () => {
  assert.equal(isNextDay('2026-10-13', '2026-10-12'), false);
  const result = computeStreak({ lastDate: '2026-10-13', days: 5, today: '2026-10-12' });
  assert.equal(result.days, 1);
});

test('日期串损坏 / 缺失时不炸, 安全地重算为 1', () => {
  assert.equal(isNextDay('随便写的', '2026-10-12'), false);
  assert.equal(isNextDay('2026-13-40', '2026-10-12'), false);
  assert.equal(isNextDay(null, '2026-10-12'), false);
  assert.equal(computeStreak({ lastDate: '2026-10-11', days: 5, today: null }).days, 1);
  assert.equal(computeStreak({ lastDate: 'bad', days: 'x', today: '2026-10-12' }).days, 1);
  assert.equal(computeStreak({ lastDate: '2026-10-12', days: 'x', today: '2026-10-12' }).days, 1);
});
