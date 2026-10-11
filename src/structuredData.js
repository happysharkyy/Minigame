// src/structuredData.js — 让结构化数据与"当前显示的语言"保持一致
//
// 问题: 页面可以直接在浏览器里切中英文, 但 <script type="application/ld+json"> 是静态 HTML。
// 英文用户看到的是英文常见问题, 而标注里还是中文 —— Google 要求标注内容必须真的出现在
// 页面上, 语言对不上就属于不一致。
//
// 做法: 用与页面同一套 i18n 文案重写这份 JSON-LD(不新增第二块, 否则会出现两份互相冲突的
// FAQPage)。不执行 JS 的爬虫拿到的仍是静态 HTML 里那份中文标注, 与它看到的正文一致。

import { getLang, t } from './i18n.js';

const FAQ_ENTRIES = [1, 2, 3, 4, 5];

export function updateFaqSchema(doc = document) {
  const script = doc.querySelector('#faqSchema');
  if (!script) return false;

  const mainEntity = FAQ_ENTRIES.map((n) => ({
    '@type': 'Question',
    name: t(`faq.q${n}`),
    acceptedAnswer: { '@type': 'Answer', text: t(`faq.a${n}`) },
  }));

  script.textContent = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage: doc.documentElement.lang || (getLang() === 'zh' ? 'zh-CN' : 'en'),
      mainEntity,
    },
    null,
    2,
  );
  return true;
}
