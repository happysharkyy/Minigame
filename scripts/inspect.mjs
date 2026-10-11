// scripts/inspect.mjs — 用 CDP 在真实移动端视口下截图 + 量布局
//
// 为什么不用 --window-size: Windows 上 Edge/Chrome 的窗口有最小宽度(实测约 518px),
// 传 --window-size=390 会被夹到 518 —— 截出来的图只有左半边, 看起来像"元素被裁掉了",
// 其实是拍到了更宽的布局。真实手机视口只能靠 CDP 的 Emulation.setDeviceMetricsOverride。
//
// 用法(需要 Node 20 的 --experimental-websocket; Node 22+ 可省略):
//   npm run inspect -- mobile            # 390x844 手机竖屏, 首屏
//   npm run inspect -- mobile --full     # 手机整页
//   npm run inspect -- desktop           # 1440x900
//   npm run inspect -- 360x780 --full    # 自定义尺寸
//   npm run inspect -- mobile --eval "getComputedStyle(document.body).fontSize"

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

if (typeof WebSocket === 'undefined') {
  console.error('需要 WebSocket 支持: 请用 Node 20 时加 --experimental-websocket 运行');
  console.error('  node --experimental-websocket scripts/inspect.mjs mobile');
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const outDir = path.join(root, '.screenshots');
const PORT = Number(process.env.INSPECT_PORT) || 8795;
// 固定端口会被上一次没退干净的浏览器进程占住("连不上调试端口"), 所以每次换一个
const CDP_PORT = Number(process.env.INSPECT_CDP_PORT) || (9300 + Math.floor(Math.random() * 400));

const PRESETS = {
  mobile: { w: 390, h: 844, dpr: 2, mobile: true, label: '手机竖屏 (iPhone 14 尺寸)' },
  'mobile-small': { w: 360, h: 780, dpr: 2, mobile: true, label: '小屏手机' },
  'mobile-landscape': { w: 844, h: 390, dpr: 2, mobile: true, label: '手机横屏' },
  tablet: { w: 768, h: 1024, dpr: 2, mobile: true, label: '平板' },
  desktop: { w: 1440, h: 900, dpr: 1, mobile: false, label: '桌面' },
  'desktop-narrow': { w: 1100, h: 800, dpr: 1, mobile: false, label: '窄桌面' },
};

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm',
  '.task': 'application/octet-stream', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
};

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

const args = process.argv.slice(2);
const presetName = args.find((a) => !a.startsWith('--')) || 'mobile';
const isFull = args.includes('--full');
const evalIndex = args.indexOf('--eval');
const customEval = evalIndex !== -1 ? args[evalIndex + 1] : null;
// --scroll "#faqPanel": 截图前先滚到某个位置, 用来检查页面下半部分
const scrollIndex = args.indexOf('--scroll');
const scrollTo = scrollIndex !== -1 ? args[scrollIndex + 1] : null;
// --open "details": 截图前展开所有匹配元素(用来检查折叠内容)
const openIndex = args.indexOf('--open');
const openSelector = openIndex !== -1 ? args[openIndex + 1] : null;
// --click "#mainStartBtn": 截图与测量前先点一下, 用来检查"游戏进行中"这类状态的布局
const clickIndex = args.indexOf('--click');
const clickSelector = clickIndex !== -1 ? args[clickIndex + 1] : null;

let viewport;
if (PRESETS[presetName]) {
  viewport = PRESETS[presetName];
} else if (/^\d+x\d+$/.test(presetName)) {
  const [w, h] = presetName.split('x').map(Number);
  viewport = { w, h, dpr: 1, mobile: w < 700, label: `自定义 ${w}x${h}` };
} else {
  console.error(`未知视口: ${presetName}\n可用: ${Object.keys(PRESETS).join(', ')}, 或 390x844`);
  process.exit(1);
}

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('✗ dist/index.html 不存在, 请先 npm run build');
  process.exit(1);
}
const browser = BROWSERS.find((c) => fs.existsSync(c));
if (!browser) {
  console.error('✗ 找不到 Edge/Chrome');
  process.exit(1);
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 静态服务器 ──────────────────────────────
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://local').pathname);
  let file = path.join(dist, p);
  if (!file.startsWith(dist)) return res.writeHead(403).end();
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    if (p.startsWith('/api/')) {
      // 后端不存在时给前端合法的示例数据 —— 空数据会让评价/排行榜区域整块隐藏,
      // 那样截图就看不到这些区块的真实排版
      const now = Date.now();
      const body = p.includes('/reviews')
        ? JSON.stringify({
          ok: true,
          total: 7,
          average: 4.3,
          distribution: { 1: 0, 2: 1, 3: 1, 4: 2, 5: 3 },
          reviews: [
            { id: 'a', rating: 5, tags: ['accurate', 'addictive'], comment: '切西瓜很上头，识别比我预期准', name: '小明', game: 'fruit', lang: 'zh', createdAt: now - 120000 },
            { id: 'b', rating: 3, tags: ['laggy'], comment: '老笔记本上偶尔掉帧', name: 'Anonymous', game: 'tetris', lang: 'zh', createdAt: now - 3600000 },
            { id: 'c', rating: 4, tags: ['fun', 'easy'], comment: '', name: 'Mia', game: 'overall', lang: 'en', createdAt: now - 7200000 },
          ],
        })
        : p.includes('/messages')
          ? '{"ok":true,"count":2,"messages":[{"id":"m1","name":"Aki","content":"希望能加双人模式","lang":"zh","createdAt":' + now + '},{"id":"m2","name":"Ben","content":"Star Relay looks fun!","lang":"en","createdAt":' + now + '}]}'
          : p.includes('/scores')
            ? '{"ok":true,"games":{"tetris":[{"id":"s1","name":"Aki","score":2400,"lang":"zh","createdAt":' + now + '},{"id":"s2","name":"Ben","score":1800,"lang":"en","createdAt":' + now + '}],"fruit":[{"id":"s3","name":"Mia","score":640,"lang":"en","createdAt":' + now + '}]}}'
            : '{"ok":true}';
      return res.writeHead(200, { 'Content-Type': 'application/json' }).end(body);
    }
    file = path.join(dist, 'index.html');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

// ── 启动浏览器 + CDP ────────────────────────
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
const child = spawn(browser, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${profile}`, `--remote-debugging-port=${CDP_PORT}`,
  '--window-size=1200,900', '--hide-scrollbars',
  '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
  'about:blank',
]);

let version = null;
for (let i = 0; i < 40 && !version; i += 1) {
  await delay(250);
  try {
    version = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json();
  } catch { /* 还没起来 */ }
}
if (!version) {
  child.kill();
  server.close();
  console.error('✗ 连不上浏览器调试端口');
  process.exit(1);
}

const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

let nextId = 0;
const pending = new Map();
const listeners = new Map();

ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
    return;
  }
  const key = `${msg.sessionId || ''}:${msg.method}`;
  const queue = listeners.get(key);
  if (queue && queue.length) queue.shift()(msg.params);
});

function send(method, params = {}, sessionId) {
  const id = (nextId += 1);
  return new Promise((resolve, reject) => {
    pending.set(id, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)));
    ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  });
}

function once(method, sessionId) {
  return new Promise((resolve) => {
    const key = `${sessionId || ''}:${method}`;
    if (!listeners.has(key)) listeners.set(key, []);
    listeners.get(key).push(resolve);
  });
}

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);
await send('Emulation.setDeviceMetricsOverride', {
  width: viewport.w,
  height: viewport.h,
  deviceScaleFactor: viewport.dpr,
  mobile: viewport.mobile,
}, sessionId);
if (viewport.mobile) {
  await send('Emulation.setUserAgentOverride', {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  }, sessionId);
  await send('Emulation.setTouchEmulationEnabled', { enabled: true }, sessionId);
}

const loaded = once('Page.loadEventFired', sessionId);
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` }, sessionId);
await loaded;
// 姿态模型是异步加载的, 等它把遮罩换掉再截图
await delay(4500);

// ── 量布局 ──────────────────────────────────
// 先点一下(如果要求), 让测量拿到的就是点击后的状态
if (clickSelector) {
  const clicked = await send('Runtime.evaluate', {
    expression: `(() => { const el = document.querySelector(${JSON.stringify(clickSelector)}); if (!el) return 'NOT_FOUND'; el.click(); return 'clicked'; })()`,
    returnByValue: true,
  }, sessionId);
  console.log(`--click ${clickSelector}: ${clicked.result?.value}`);
  await delay(800);
}

const METRICS = `(() => {
  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
  };
  return {
    innerW: window.innerWidth,
    innerH: window.innerHeight,
    docScrollW: document.documentElement.scrollWidth,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    appShell: box('.app-shell'),
    topbar: box('.topbar'),
    topActions: box('.top-actions'),
    gamePanel: box('.game-panel'),
    canvas: box('#gameCanvas'),
    cameraPanel: box('.camera-panel'),
    cameraPosition: getComputedStyle(document.querySelector('.camera-panel')).position,
    libraryPanel: box('.library-panel'),
    leaderboard: box('.leaderboard-panel'),
    reviewPanel: box('.review-panel'),
    messagePanel: box('.message-panel'),
    firstScreenBottom: window.innerHeight,
    startBtn: box('#mainStartBtn'),
  };
})()`;

const metricsResult = await send('Runtime.evaluate', { expression: METRICS, returnByValue: true }, sessionId);
const metrics = metricsResult.result?.value;

let extra = null;
if (customEval) {
  const r = await send('Runtime.evaluate', { expression: customEval, returnByValue: true }, sessionId);
  extra = r.result?.value ?? r.result?.description ?? r.exceptionDetails?.text;
}

// 任意元素超出视口右边界 = 横向溢出/被裁切。
// 但要排除"本来就在横向滚动容器里"的元素(例如手机端横向滚动的游戏库卡片),
// 它们的祖先有 overflow-x: auto/scroll/hidden, 超出是预期行为。
const OVERFLOW_PROBE = `(() => {
  const inScrollContainer = (el) => {
    let node = el.parentElement;
    // 一路查到 body: body 上的 overflow-x: hidden 同样会让"超出视口"变成预期行为
    while (node) {
      const ox = getComputedStyle(node).overflowX;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true;
      node = node.parentElement;
    }
    return false;
  };
  const bad = [];
  document.querySelectorAll('body *').forEach((el) => {
    const r = el.getBoundingClientRect();
    const out = r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1);
    if (out && !inScrollContainer(el)) {
      bad.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && typeof el.className === 'string') ? el.className.slice(0, 60) : '',
        left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width),
        position: getComputedStyle(el).position,
      });
    }
  });
  return bad.slice(0, 15);
})()`;
const overflowResult = await send('Runtime.evaluate', { expression: OVERFLOW_PROBE, returnByValue: true }, sessionId);
const overflowing = overflowResult.result?.value || [];

// ── 截图 ────────────────────────────────────
fs.mkdirSync(outDir, { recursive: true });

if (openSelector) {
  await send('Runtime.evaluate', {
    expression: `document.querySelectorAll(${JSON.stringify(openSelector)}).forEach((el) => { if (el.tagName === 'DETAILS') el.open = true; })`,
  }, sessionId);
  await delay(300);
}
if (scrollTo) {
  await send('Runtime.evaluate', {
    expression: `(() => { const el = document.querySelector(${JSON.stringify(scrollTo)}); if (el) el.scrollIntoView({ block: 'start' }); return !!el; })()`,
    returnByValue: true,
  }, sessionId);
  await delay(400);
}

let clip;
if (isFull) {
  const heightResult = await send('Runtime.evaluate', {
    expression: 'Math.min(document.documentElement.scrollHeight, 12000)',
    returnByValue: true,
  }, sessionId);
  clip = { x: 0, y: 0, width: viewport.w, height: heightResult.result.value, scale: 1 };
}
const shot = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: isFull,
  ...(clip ? { clip } : {}),
}, sessionId);

const suffix = isFull ? '-full' : [scrollTo && 'scrolled', clickSelector && 'clicked', openSelector && 'open'].filter(Boolean).map((x) => '-' + x).join('');
const fileName = `${presetName}${suffix}.png`;
const outFile = path.join(outDir, fileName);
fs.writeFileSync(outFile, Buffer.from(shot.data, 'base64'));

await send('Target.closeTarget', { targetId });
ws.close();
child.kill();
server.close();

console.log(`${viewport.label} — ${viewport.w}x${viewport.h} @${viewport.dpr}x${viewport.mobile ? ' (移动端模拟)' : ''}`);
console.log('布局:', JSON.stringify(metrics, null, 1));
if (extra !== null && extra !== undefined) console.log('--eval 结果:', JSON.stringify(extra));
console.log(`横向溢出元素 (${overflowing.length}):`, overflowing.length ? JSON.stringify(overflowing, null, 1) : '无');
console.log(`截图 -> ${path.relative(root, outFile)} (${(fs.statSync(outFile).size / 1024).toFixed(1)} KB)`);

// ── 可回归的布局断言 ────────────────────────
// 这几条都是实际踩过的坑: 横向溢出、移动端棋牌被挤出首屏、摄像头浮层盖住正文。
if (args.includes('--assert')) {
  const portraitPhone = viewport.mobile && viewport.h > viewport.w;
  const RULES = [
    {
      name: '没有横向溢出',
      test: () => !metrics.horizontalOverflow && overflowing.length === 0,
      hint: '页面比视口宽, 用户会看到横向滚动条或被裁切的内容',
    },
    {
      name: '手机端摄像头默认收成 48px 状态点(不遮挡正文)',
      test: () => !viewport.mobile || clickSelector || (metrics.cameraPanel?.w === 48 && metrics.cameraPanel?.h === 48),
      hint: '摄像头浮层又变成常驻大窗了, 会盖住正文',
    },
    {
      name: '竖屏手机: 棋盘+分数+按钮完整落在首屏内',
      test: () => !portraitPhone || metrics.gamePanel.y + metrics.gamePanel.h <= metrics.innerH + 1,
      hint: '游戏面板比一屏还高, 玩的时候看不到自己的分数',
    },
    {
      name: '桌面端摄像头是右列普通面板, 不是浮层',
      test: () => viewport.mobile || metrics.cameraPosition === 'relative',
      hint: '桌面端摄像头变成了 fixed 浮层',
    },
  ];

  let failedRules = 0;
  console.log('--- 布局断言 ---');
  for (const rule of RULES) {
    const ok = rule.test();
    console.log(`${ok ? '✓' : '✗'} ${rule.name}`);
    if (!ok) {
      console.error(`    ${rule.hint}`);
      failedRules += 1;
    }
  }
  process.exit(failedRules === 0 ? 0 : 1);
}

process.exit(0);
