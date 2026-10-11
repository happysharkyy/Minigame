// scripts/smoke.mjs — 无头浏览器冒烟测试: 真的把构建产物跑起来, 断言 JS 生成的 DOM
//
// 为什么需要: vite build 只能发现语法错误。如果模块在导入期或 bootstrap 期抛异常,
// 构建照样成功, 但线上会是一个空壳页面(卡片渲染不出来)。这个脚本用 Edge/Chrome 无头模式
// 打开 dist/, 等 JS 跑完后 dump DOM, 断言那些"只有 JS 才会生成"的内容确实存在。
//
// 用法: npm run smoke   (需要先 npm run build)

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const PORT = Number(process.env.SMOKE_PORT) || 8791;

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.wasm': 'application/wasm',
  '.task': 'application/octet-stream',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://local').pathname);
    let filePath = path.join(dist, urlPath);
    if (!filePath.startsWith(dist)) {
      res.writeHead(403).end();
      return;
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      // API 在冒烟环境里不存在, 返回 404 让前端走错误分支(不影响本次断言)
      if (urlPath.startsWith('/api/')) {
        res.writeHead(404, { 'Content-Type': 'application/json' }).end('{"ok":false}');
        return;
      }
      filePath = path.join(dist, 'index.html');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
  // 显式绑 127.0.0.1: 绑 0.0.0.0 在 Windows 上可能撞到系统保留端口段而报 EACCES
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

function findBrowser() {
  return BROWSERS.find((candidate) => fs.existsSync(candidate)) || null;
}

function dumpDom(browser, url, budgetMs) {
  return new Promise((resolve, reject) => {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-'));
    const child = spawn(browser, [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${profile}`,
      `--virtual-time-budget=${budgetMs}`,
      // 无摄像头环境: 用假设备避免权限弹窗卡住
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      // 把页面控制台输出重定向到 stderr, 用来抓"未捕获异常"
      '--enable-logging=stderr',
      '--v=0',
      '--dump-dom',
      url,
    ]);
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => { out += chunk; });
    child.stderr.on('data', (chunk) => { err += chunk; });
    child.on('error', reject);
    child.on('close', () => resolve({ dom: out, log: err }));
  });
}

const CHECKS = [
  {
    name: '游戏库卡片由 JS 渲染出来(不是空壳)',
    test: (dom) => (dom.match(/class="catalog-card[" ]/g) || []).length === 7,
    detail: 'catalog-card 不是 7 张 —— 说明 main.js 在 bootstrap 之前就抛异常了',
  },
  {
    name: '可玩数量文案已更新为 2 款',
    test: (dom) => dom.includes('2 款可玩') || dom.includes('2 games playable'),
    detail: '仍然是 4 款可玩, 说明 i18n 没生效或静态文案没改',
  },
  {
    name: '未实现的 5 款玩法渲染为不可点卡片',
    test: (dom) => (dom.match(/class="catalog-card coming[" ]/g) || []).length === 5,
    detail: 'coming 卡片不是 5 张(星光接力/能量守门员/节奏击打/光墙闪避/体感拳击)',
  },
  {
    name: '评价面板的星星由 JS 生成',
    test: (dom) => (dom.match(/class="star-btn/g) || []).length === 5,
    detail: 'star-btn 不是 5 个',
  },
  {
    name: '主按钮不再是死按钮(可用且文案正确)',
    test: (dom) => /id="mainStartBtn"[^>]*>(开始游戏|Start game|游戏中|Playing)/.test(dom.replace(/\s+/g, ' ')),
    detail: 'mainStartBtn 文案不对',
  },
  {
    name: '排行榜只保留已实现的 2 个标签',
    test: (dom) => (dom.match(/class="lb-tab[" ]/g) || []).length === 2,
    detail: 'lb-tab 数量不是 2',
  },
  {
    name: '声音按钮文案由 JS 接管(不再是写死的"声音 开")',
    test: (dom) => /id="soundBtn"[^>]*aria-pressed="(true|false)"/.test(dom.replace(/\s+/g, ' ')),
    detail: 'soundBtn 没有 aria-pressed, 说明 syncSoundButton 没跑',
  },
  {
    name: '舒适度设置已生效(动作幅度/减少动态效果)',
    test: (dom) => /data-motion-range="(gentle|standard|active)"/.test(dom)
      && /data-reduced-motion="(true|false)"/.test(dom),
    detail: 'body 上没有 data-motion-range / data-reduced-motion, 说明 loadComfort 没跑',
  },
  {
    name: '游戏库排序方式已生效',
    test: (dom) => /id="gameCatalog"[^>]*data-sort-mode="/.test(dom.replace(/\s+/g, ' ')),
    detail: 'gameCatalog 上没有 data-sort-mode, 说明排序状态没接上',
  },
];

const browser = findBrowser();
if (!browser) {
  console.error('✗ 找不到 Edge/Chrome, 跳过冒烟测试');
  process.exit(0);
}
if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('✗ dist/index.html 不存在, 请先 npm run build');
  process.exit(1);
}

const server = await startServer();
console.log(`静态服务器: http://127.0.0.1:${PORT}`);
console.log(`浏览器: ${path.basename(browser)}`);

let dom = '';
let browserLog = '';
try {
  const result = await dumpDom(browser, `http://127.0.0.1:${PORT}/`, 6000);
  dom = result.dom;
  browserLog = result.log;
} finally {
  server.close();
}

if (!dom || dom.length < 500) {
  console.error('✗ 拿不到页面 DOM(浏览器可能启动失败)');
  process.exit(1);
}

let failed = 0;
for (const check of CHECKS) {
  const ok = check.test(dom);
  console.log(`${ok ? '✓' : '✗'} ${check.name}`);
  if (!ok) {
    console.error(`    ${check.detail}`);
    failed += 1;
  }
}

// 未捕获异常: DOM 断言可能漏掉"渲染完了但中途抛错"的情况, 这里补一道
const errors = browserLog
  .split('\n')
  .filter((line) => /Uncaught|ERROR:CONSOLE|SyntaxError|TypeError/i.test(line))
  .map((line) => line.trim())
  .filter(Boolean);
const logLines = browserLog.split('\n').filter(Boolean).length;

if (errors.length > 0) {
  console.error(`✗ 页面控制台出现 ${errors.length} 条错误(共 ${logLines} 行日志):`);
  errors.slice(0, 8).forEach((line) => console.error(`    ${line.slice(0, 200)}`));
  failed += 1;
} else if (logLines > 0) {
  console.log(`✓ 没有未捕获异常(共 ${logLines} 行浏览器日志)`);
} else {
  console.log('(浏览器未输出日志, 跳过异常检查)');
}

console.log(failed === 0 ? '\n全部通过' : `\n${failed} 项失败`);
process.exit(failed === 0 ? 0 : 1);
