// scripts/probes/state-machine.js — 交叉状态的回归断言
//
// 单个功能各自测都过, 但"暂停中切游戏""运行中切语言"这类组合最容易漏, 而且单测/冒烟/
// 布局断言都覆盖不到 —— 它们只会在用户手上偶发。
//
// 这个探针在真实浏览器里把这些顺序跑一遍并断言结果; 任何一条不符就抛异常,
// 配合 `--strict-eval` 让 npm run check:states 以非 0 退出。
//
// 用法: npm run check:states

(() => {
  const q = (s) => document.querySelector(s);
  const failures = [];

  // 断言用的文案跟语言走, 所以先把界面锁到中文, 免得换台机器(初始语言不同)就误报
  for (let i = 0; i < 2 && !document.documentElement.lang.startsWith('zh'); i += 1) {
    q('#langBtn').click();
  }
  if (!document.documentElement.lang.startsWith('zh')) {
    throw new Error(`无法把界面切到中文, 当前 lang=${document.documentElement.lang}`);
  }

  const state = () => ({
    badge: q('#gameStateBadge').textContent,
    pauseLabel: q('#pauseBtn').textContent,
    pauseDisabled: q('#pauseBtn').disabled,
    mainLabel: q('#mainStartBtn').textContent,
    mainDisabled: q('#mainStartBtn').disabled,
    overlayShown: !q('#gameOverlay').classList.contains('hidden'),
    overlayTitle: q('#overlayTitle').textContent,
    camWidth: Math.round(q('.camera-panel').getBoundingClientRect().width),
    playing: document.body.classList.contains('is-playing'),
  });

  const check = (label, actual, expected) => {
    Object.entries(expected).forEach(([key, want]) => {
      if (actual[key] !== want) {
        failures.push(`${label}: ${key} 期望 ${JSON.stringify(want)}, 实际 ${JSON.stringify(actual[key])}`);
      }
    });
  };

  const snap = (label) => {
    const s = state();
    console.log(`    ${label}: badge=${s.badge} 暂停="${s.pauseLabel}"(%d) 主按钮="${s.mainLabel}" 遮罩=${s.overlayShown} 小窗=${s.camWidth}px playing=${s.playing}`, s.pauseDisabled);
    return s;
  };

  check('① 初始', snap('① 初始'), {
    badge: '准备中', pauseDisabled: true, mainLabel: '开始游戏', mainDisabled: false,
    overlayShown: true, camWidth: 48, playing: false,
  });

  q('#mainStartBtn').click();
  check('② 开始后', snap('② 开始后'), {
    badge: '游戏中', pauseDisabled: false, mainDisabled: true,
    overlayShown: false, camWidth: 150, playing: true,
  });

  q('#pauseBtn').click();
  check('③ 暂停后', snap('③ 暂停后'), {
    badge: '已暂停', pauseLabel: '继续', mainLabel: '继续', overlayShown: true, overlayTitle: '已暂停',
  });

  // 关键交叉: 暂停时游戏时钟是"停表"的, 换游戏必须把停表状态清掉, 否则新一局永远不动
  q('#gameCatalog [data-game=fruit]').click();
  check('④ 暂停中切游戏', snap('④ 暂停中切游戏'), {
    badge: '准备中', pauseDisabled: true, mainLabel: '开始游戏',
    camWidth: 48, playing: false,
  });

  q('#langBtn').click();
  const english = snap('⑤ 切英文');
  if (!english.badge.includes('Ready') && english.badge !== '准备中') {
    failures.push(`⑤ 切英文: 状态徽章既不是 Ready 也不是准备中, 实际 ${english.badge}`);
  }
  q('#langBtn').click();
  check('⑥ 切回中文', snap('⑥ 切回中文'), { badge: '准备中', mainLabel: '开始游戏' });

  q('#mainStartBtn').click();
  check('⑦ 再开始一局', snap('⑦ 再开始一局'), {
    badge: '计时中', mainDisabled: true, camWidth: 150, playing: true,
  });

  // 关键交叉: 运行中切语言, 运行状态不能被重置
  q('#langBtn').click();
  check('⑧ 运行中切英文', snap('⑧ 运行中切英文'), { playing: true, mainDisabled: true, camWidth: 150 });
  q('#langBtn').click();
  check('⑨ 运行中切回中文', snap('⑨ 运行中切回中文'), { badge: '计时中', playing: true, mainDisabled: true });

  q('#pauseBtn').click();
  check('⑩ 再暂停', snap('⑩ 再暂停'), { badge: '已暂停', pauseLabel: '继续', overlayShown: true });

  // 暂停中点主按钮应当"继续"而不是重开
  q('#mainStartBtn').click();
  check('⑪ 暂停中点主按钮', snap('⑪ 暂停中点主按钮'), {
    badge: '计时中', overlayShown: false, pauseLabel: '暂停', playing: true,
  });

  if (failures.length) {
    throw new Error(`交叉状态断言失败 ${failures.length} 条:\n      - ${failures.join('\n      - ')}`);
  }
  return `全部通过 (11 步交叉状态)`;
})()
