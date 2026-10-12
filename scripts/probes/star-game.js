// scripts/probes/star-game.js — 星光接力的端到端探针
//
// 覆盖: 游戏库卡片可点 -> 开一局 -> 计时/绘制循环持续跑(不抛异常) -> 到时结算 -> 结算卡片出现。
// 注意: 无头环境用的是 Chrome 假摄像头, 没有人形, 所以拿不到姿态关键点, 也就无法真正
// 触发"手伸进光圈"。这一段只能靠人工试玩验证 —— 探针能保证的是整局流程与渲染不会崩。
//
// 用法: npm run check:star

(async () => {
  const q = (s) => document.querySelector(s);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const rows = [];
  const failures = [];

  const expect = (label, actual, predicate, hint) => {
    rows.push(`${predicate(actual) ? '✓' : '✗'} ${label}: ${actual}`);
    if (!predicate(actual)) failures.push(`${label} —— 实际 ${actual}${hint ? ` (${hint})` : ''}`);
  };

  for (let i = 0; i < 2 && !document.documentElement.lang.startsWith('zh'); i += 1) q('#langBtn').click();

  const card = q('#gameCatalog [data-game=star]');
  if (!card) throw new Error('游戏库里找不到星光接力卡片 —— 说明它还是"开发中"状态');

  card.click();
  expect('切到星光接力后的面板标题', q('#gamePanelTitle').textContent, (v) => v.includes('星光接力'));
  expect('第一个指标名', q('#metricOneLabel').textContent, (v) => v === '点亮');
  expect('第二个指标名', q('#metricTwoLabel').textContent, (v) => v === '倒计时');

  q('#mainStartBtn').click();
  const startCountdown = q('#metricTwoValue').textContent;
  expect('开局后状态徽章', q('#gameStateBadge').textContent, (v) => v === '计时中');
  expect('开局时倒计时(约 40 秒)', startCountdown, (v) => /^(39|40)/.test(v), '常量 STAR_ROUND_DURATION=40s');

  await wait(2600);
  const midCountdown = q('#metricTwoValue').textContent;
  expect('2.6 秒后倒计时在走', midCountdown, (v) => parseInt(v, 10) < parseInt(startCountdown, 10), '说明 update 循环在跑');

  // 跑到回合结束(40 秒) + 结算
  await wait(39_000);
  expect('到时后的状态徽章', q('#gameStateBadge').textContent, (v) => v === '已结束');
  expect('结算卡片已显示', q('#overlayResult').classList.contains('hidden'), (v) => v === false);
  expect('结算卡片里是本局得分', q('#resultScore').textContent, (v) => /^\d+$/.test(v));
  expect('结算按钮文案', q('#mainStartBtn').textContent, (v) => v === '再来一局');

  if (failures.length) {
    throw new Error(`星光接力端到端失败 ${failures.length} 条:\n      - ${failures.join('\n      - ')}`);
  }
  return `全部通过\n    ${rows.join('\n    ')}`;
})()
