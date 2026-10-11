// scripts/probes/review-flow.js — 评价提交与语言切换的交叉探针
//
// 评价涉及异步提交 + 本地状态 + 语言切换三件事叠在一起, 单测覆盖不到。
// 重点看: 提交后的成功提示会不会被语言切换弄丢、切语言后表单/汇总会不会错位。
//
// 用法: npm run inspect -- mobile --eval-file scripts/probes/review-flow.js

(async () => {
  const q = (s) => document.querySelector(s);
  const rows = [];
  const status = () => {
    const el = q('#reviewStatus');
    return `"${el.textContent}"(hidden=${el.classList.contains('hidden')})`;
  };
  const snap = (label) => rows.push(
    `${label}\n    状态条=${status()} 星星选中=${document.querySelectorAll('#reviewPanel .star-btn.active').length}`
    + ` 汇总="${q('#reviewSummaryMeta').textContent}" 列表条目=${document.querySelectorAll('#reviewList .review-item').length}`
    + ` 分游戏行=${document.querySelectorAll('.bygame-row').length}`,
  );

  snap('① 初始');

  // 打分 + 选标签 + 写文字, 然后提交
  const stars = document.querySelectorAll('#reviewPanel .star-btn');
  stars[3].click();
  snap('② 点 4 星后');

  q('#reviewTags .review-tag').click();
  q('#reviewComment').value = '探针写入的评价';
  q('#reviewComment').dispatchEvent(new Event('input', { bubbles: true }));

  q('#reviewForm').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  await new Promise((r) => setTimeout(r, 700));
  snap('③ 提交后');

  // 交叉场景: 提交完立刻切语言
  q('#langBtn').click();
  snap('④ 提交后立刻切语言');

  // 切换后表单是否还能继续用(残影/重复绑定会在这里暴露)
  q('#reviewPanel .star-btn')?.click();
  snap('⑤ 切语言后再打分');
  q('#langBtn').click();
  snap('⑥ 再切回中文');

  return rows.join('\n');
})()
