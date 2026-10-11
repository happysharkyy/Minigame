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
      // API 在冒烟环境里不存在。返回示例数据而不是 404: 空数据会让评价/排行榜区块整块
      // 隐藏, 那样这些区域就永远没被真正渲染过, 断言也就覆盖不到它们。
      if (urlPath.startsWith('/api/')) {
        const now = Date.now();
        const body = urlPath.includes('/reviews')
          ? JSON.stringify({
            ok: true,
            total: 7,
            average: 4.3,
            distribution: { 1: 0, 2: 1, 3: 1, 4: 2, 5: 3 },
            byGame: {
              fruit: { count: 3, average: 4.7 },
              tetris: { count: 2, average: 3.5 },
              overall: { count: 2, average: 4.5 },
            },
            reviews: [
              { id: 'a', rating: 5, tags: ['accurate', 'addictive'], comment: '切西瓜很上头', name: '小明', game: 'fruit', lang: 'zh', createdAt: now - 60000 },
              { id: 'b', rating: 3, tags: ['laggy'], comment: '老笔记本偶尔掉帧', name: 'Anonymous', game: 'tetris', lang: 'zh', createdAt: now - 3600000 },
            ],
          })
          : urlPath.includes('/messages')
            ? '{"ok":true,"count":1,"messages":[{"id":"m1","name":"Aki","content":"希望能加双人模式","lang":"zh","createdAt":' + now + '}]}'
            : urlPath.includes('/scores')
              ? '{"ok":true,"games":{"tetris":[{"id":"s1","name":"Aki","score":2400,"lang":"zh","createdAt":' + now + '}],"fruit":[]}}'
              : '{"ok":true}';
        return res.writeHead(200, { 'Content-Type': 'application/json' }).end(body);
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
  {
    name: '页面只有一个 h1 且是站名(SEO/读屏软件的页面标题)',
    test: (dom) => {
      const h1s = dom.match(/<h1[^>]*>[\s\S]*?<\/h1>/g) || [];
      return h1s.length === 1 && /MOVE ARCADE/.test(h1s[0]);
    },
    detail: 'h1 不是唯一、或 h1 里不是站名(可能又变回"今天想怎么玩？"这类界面问句)',
  },
  {
    name: '局末结算卡片的元素都在(结算时由 JS 填充)',
    test: (dom) => ['resultScore', 'resultBest', 'resultRecord', 'resultGap', 'resultToday', 'resultReviewBtn']
      .every((id) => dom.includes(`id="${id}"`)),
    detail: '结算卡片缺少元素, 局末会看不到分数/个人最佳/差距',
  },
  {
    // 摄像头用的是 Chrome 的假设备, 所以这条能在无摄像头的机器上跑; 它验证的是
    // 授权 -> 并行加载 wasm/模型 -> 姿态图启动 这条核心链路真的走通了
    name: 'MediaPipe 姿态图成功启动(摄像头→模型→推理 端到端)',
    test: (_dom, log) => /Graph successfully started running/.test(log),
    detail: '浏览器日志里没有 "Graph successfully started running", 姿态识别链路没能初始化',
  },
  {
    name: '页面没有未捕获异常',
    test: (_dom, log) => !/Uncaught|ERROR:CONSOLE|SyntaxError|TypeError/i.test(log),
    detail: '控制台出现未捕获异常, 见下方日志',
  },
  {
    // 结构化数据写错不会报错, 只会静默失效; Google 还要求标注内容必须真的在页面上,
    // 所以这里同时校验"JSON 合法"和"问题数 == 页面上可见的条目数"
    name: 'FAQ 正文与 FAQPage 结构化数据一致(JSON 合法且条目数相同)',
    test: (dom) => {
      const visible = (dom.match(/class="faq-item"/g) || []).length;
      const blocks = [...dom.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
        .map((m) => m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
      let faqQuestions = 0;
      for (const raw of blocks) {
        let data;
        try {
          data = JSON.parse(raw);
        } catch {
          return false;
        }
        if (data['@type'] === 'FAQPage') faqQuestions = (data.mainEntity || []).length;
      }
      return visible === 5 && faqQuestions === 5 && blocks.length >= 3;
    },
    detail: 'JSON-LD 不是合法 JSON, 或 FAQ 可见条目数与 FAQPage 问题数不一致(结构化数据会失效)',
  },
  {
    name: '摄像头隐私说明真的出现在页面上(信任问题)',
    test: (dom) => dom.includes('视频画面不离开你的设备') || dom.includes('The video never leaves your device'),
    detail: '页面上找不到"画面不会被上传"的说明 —— 这是摄像头类产品最该正面回答的问题',
  },
  {
    name: '有评价数据时: 评分入口与分游戏评分都渲染出来',
    test: (dom) => {
      const rows = (dom.match(/class="bygame-row"/g) || []).length;
      // 别依赖属性顺序: 模板里是 class 在前、id 在后, 之前正是这个写反了
      const jumpVisible = /<button class="review-jump" id="reviewJump"/.test(dom);
      const byGameVisible = dom.includes('id="reviewByGame"') && !/class="review-bygame hidden"/.test(dom);
      return rows === 3 && jumpVisible && byGameVisible;
    },
    detail: '评分入口或分游戏评分没有渲染(bygame-row 应为 3 个: 切西瓜/俄罗斯方块/整体体验)',
    debug: (dom) => ({
      rows: (dom.match(/class="bygame-row"/g) || []).length,
      jumpVisible: /<button class="review-jump" id="reviewJump"/.test(dom),
      byGameVisible: dom.includes('id="reviewByGame"') && !/class="review-bygame hidden"/.test(dom),
    }),
  },

  {
    name: '有成绩数据时: 排行榜列表真的渲染出条目',
    test: (dom) => /class="lb-row|class="lb-item|lb-medal/.test(dom) || dom.includes('2400'),
    detail: '排行榜有数据但没有渲染出条目',
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
  const ok = check.test(dom, browserLog);
  console.log(`${ok ? '✓' : '✗'} ${check.name}`);
  if (!ok) {
    console.error(`    ${check.detail}`);
    if (check.debug) console.error('    诊断:', JSON.stringify(check.debug(dom)));
    failed += 1;
  }
}

// 失败时把日志打出来便于定位; SMOKE_VERBOSE=1 则总是打印
const failedChecks = CHECKS.filter((check) => !check.test(dom, browserLog));
if (failedChecks.length > 0 || process.env.SMOKE_VERBOSE === '1') {
  console.log('--- 浏览器日志 ---');
  browserLog.split('\n').filter(Boolean).forEach((line) => console.log(`    ${line.slice(0, 200)}`));
}

console.log(failed === 0 ? '\n全部通过' : `\n${failed} 项失败`);
process.exit(failed === 0 ? 0 : 1);
