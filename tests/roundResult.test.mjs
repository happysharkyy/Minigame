// tests/roundResult.test.mjs — 局末结算逻辑的单元测试
// 运行: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRoundResult } from '../src/roundResult.js';

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
