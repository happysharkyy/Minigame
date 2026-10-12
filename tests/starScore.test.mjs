// tests/starScore.test.mjs — 星光接力计分规则的单元测试
import test from 'node:test';
import assert from 'node:assert/strict';
import { STAR_COMBO_WINDOW_MS, computeStarBonus, resolveCombo } from '../src/starScore.js';

test('第一次点亮: 连击为 1', () => {
  assert.equal(resolveCombo({ combo: 0, sinceLastLitMs: null }), 1);
});

test('窗口内接着点亮: 连击递增', () => {
  assert.equal(resolveCombo({ combo: 1, sinceLastLitMs: 800 }), 2);
  assert.equal(resolveCombo({ combo: 7, sinceLastLitMs: 100 }), 8);
});

test('刚好等于窗口边界算连上; 超过 1ms 就断连击', () => {
  assert.equal(resolveCombo({ combo: 4, sinceLastLitMs: STAR_COMBO_WINDOW_MS }), 5);
  assert.equal(resolveCombo({ combo: 4, sinceLastLitMs: STAR_COMBO_WINDOW_MS + 1 }), 1);
});

test('隔太久: 连击归 1(不是 0, 也不是继续累加)', () => {
  assert.equal(resolveCombo({ combo: 12, sinceLastLitMs: 60_000 }), 1);
});

test('脏数据不会算出 NaN 或 0 连击', () => {
  assert.equal(resolveCombo({ combo: undefined, sinceLastLitMs: 100 }), 1);
  assert.equal(resolveCombo({ combo: 'x', sinceLastLitMs: 100 }), 1);
  assert.equal(resolveCombo({ combo: -5, sinceLastLitMs: 100 }), 1);
  assert.equal(resolveCombo({ combo: 3, sinceLastLitMs: 'soon' }), 1);
});

test('得分: 基础 20, 每层连击 +4, 加到 30 封顶', () => {
  assert.equal(computeStarBonus(1), 20);
  assert.equal(computeStarBonus(2), 24);
  assert.equal(computeStarBonus(3), 28);
  assert.equal(computeStarBonus(4), 32);
  // (n-1)*4 超过 30 之后不再增长: 避免长连击让分数失控
  assert.equal(computeStarBonus(9), 50);
  assert.equal(computeStarBonus(50), 50);
});

test('得分对脏数据安全', () => {
  assert.equal(computeStarBonus(undefined), 20);
  assert.equal(computeStarBonus(0), 20);
  assert.equal(computeStarBonus('3'), 28);
});
