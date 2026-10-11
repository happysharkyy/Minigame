// scripts/check-ui-wiring.mjs — 检查 index.html 里"用户能点/能填"的元素是否真的有 JS 绑定
//
// 背景: 页面上曾经有 9 个控件(开始游戏/暂停/声音/帮助/排序/换一换/动作幅度/减少动态效果)
// 只写了 HTML 和文案, JS 里完全没有对应逻辑 —— 点了没反应。这类问题构建不会报错,
// 只能靠静态检查发现, 所以固化成脚本, 每次改动后跑一遍。
//
// 用法: npm run check:ui   (有未绑定的控件时以非 0 退出)

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const SRC_FILES = ['main.js', 'i18n.js', 'leaderboard.js', 'messageBoard.js', 'reviewBoard.js']
  .map((file) => path.join(root, 'src', file));

// 这些元素由父容器做事件委托, 或只是纯展示/被 <label> 包裹, 不直接出现在 JS 里
const DELEGATED = new Set(['messageForm', 'reviewForm', 'messagePanel', 'reviewPanel']);
// 纯展示元素(id 仅用于 CSS 或 aria-labelledby)
const DISPLAY_ONLY = new Set([
  'leaderboardTitle', 'messageTitle', 'reviewTitle', 'overlayIcon',
  'qualityMeter', 'trackingTip', 'sessionStatus', 'actionToast',
]);

const sources = SRC_FILES.map((file) => fs.readFileSync(file, 'utf8')).join('\n');

// 抓取所有带 id 的可交互标签
const interactive = [];
const tagRe = /<(button|select|input|textarea|dialog|form)\b[^>]*>/g;
let match;
while ((match = tagRe.exec(html)) !== null) {
  const idMatch = /\bid="([A-Za-z0-9_-]+)"/.exec(match[0]);
  if (idMatch) interactive.push({ id: idMatch[1], tag: match[1] });
}

const missing = interactive.filter(({ id }) => (
  !DELEGATED.has(id)
  && !DISPLAY_ONLY.has(id)
  && !sources.includes(id)
));

// 有些控件靠 data-* 属性挂钩(没有 id), 例如动作幅度的三个按钮用 data-range 区分
const ACTION_ATTRS = ['data-range'];
const missingAttrs = ACTION_ATTRS.filter((attr) => (
  html.includes(`${attr}=`) && !sources.includes(attr)
));

console.log(`检查了 ${interactive.length} 个可交互元素`);
if (missing.length === 0 && missingAttrs.length === 0) {
  console.log('✓ 全部都有 JS 绑定');
  process.exit(0);
}

if (missing.length > 0) {
  console.error(`✗ 有 ${missing.length} 个控件没有任何 JS 绑定(点了不会有反应):`);
  missing.forEach(({ id, tag }) => console.error(`  - <${tag} id="${id}">`));
}
if (missingAttrs.length > 0) {
  console.error(`✗ 有 ${missingAttrs.length} 个 data-* 挂钩没有被 JS 使用:`);
  missingAttrs.forEach((attr) => console.error(`  - ${attr}`));
}
process.exit(1);
