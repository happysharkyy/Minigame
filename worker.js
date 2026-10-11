// worker.js — Cloudflare Worker 入口 (静态资源 + 留言 / 排行榜 / 评价 API)
//
// 数据持久化使用 Durable Object (SQLite 后端, 免费版可用), 无需在控制台手动创建命名空间。
// 新增评价时, 通过 SMTP 把内容推送到站长的 QQ 邮箱 (需要配置 QQ_SMTP_PASS Secret)。
import { DurableObject } from 'cloudflare:workers';
import { getMailConfig, sendMail } from './worker/mail.js';

const GAME_IDS = ['tetris', 'fruit', 'star', 'guard'];
const MAX_NAME_LENGTH = 24;
const MAX_CONTENT_LENGTH = 500;
const MAX_COMMENT_LENGTH = 600;
const MAX_MESSAGES = 200;
const MAX_REVIEWS = 500;
const MAX_SCORES_PER_GAME = 50;

// 评价标签白名单(前端只发送这些 key)
const REVIEW_TAGS = [
  'accurate', 'smooth', 'fun', 'addictive', 'easy', 'exhausting',
  'laggy', 'unclear', 'camera', 'moreGames',
];
const MIN_RATING = 1;
const MAX_RATING = 5;

// 防滥用: 同一 IP 的评价间隔 / 每小时最多提醒邮件数
const REVIEW_COOLDOWN_MS = 20_000;
const MAIL_BUDGET_PER_HOUR = 20;

// ── Worker 入口 ─────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url, ctx);
      } catch (err) {
        return json({ ok: false, error: 'INTERNAL', detail: String(err?.message || err) }, 500);
      }
    }

    // 静态资源的响应头不在这里改: Workers 静态资源对"确实存在的文件"会直接返回、
    // 根本不进 Worker, 所以改不到。缓存策略统一写在 public/_headers 里(Cloudflare 会解析)。
    return env.ASSETS.fetch(request);
  },
};

function store(env) {
  return env.STORE.get(env.STORE.idFromName('global'));
}

async function handleApi(request, env, url, ctx) {
  const { pathname, searchParams } = url;
  const method = request.method;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  if (pathname === '/api/health') {
    const mail = getMailConfig(env);
    return json({ ok: true, storage: 'durable-object', mail: mail.configured });
  }

  if (!env.STORE) {
    return json({ ok: false, error: 'STORE_UNAVAILABLE' }, 503);
  }

  // ── 留言板 ──────────────────────────────────────────────
  if (pathname === '/api/messages') {
    if (method === 'GET') {
      const messages = await store(env).getMessages();
      return json({ ok: true, count: messages.length, messages });
    }
    if (method === 'POST') {
      const body = await readJson(request);
      const name = clean(body?.name, MAX_NAME_LENGTH);
      const content = clean(body?.content, MAX_CONTENT_LENGTH);
      if (!name) return json({ ok: false, error: 'NAME_REQUIRED' }, 400);
      if (!content) return json({ ok: false, error: 'CONTENT_REQUIRED' }, 400);
      if (isSpam(body)) return json({ ok: false, error: 'REJECTED' }, 400);

      const message = await store(env).addMessage({ name, content, lang: normLang(body?.lang) });
      return json({ ok: true, message }, 201);
    }
  }

  // ── 排行榜 ──────────────────────────────────────────────
  if (pathname === '/api/scores') {
    if (method === 'GET') {
      const game = searchParams.get('game');
      const limit = clampInt(searchParams.get('limit'), 1, 50, 10);
      if (game && !GAME_IDS.includes(game)) {
        return json({ ok: false, error: 'UNKNOWN_GAME' }, 400);
      }
      const all = await store(env).getScores();
      if (game) {
        const list = sortScores(all[game]).slice(0, limit);
        return json({ ok: true, game, count: list.length, scores: list });
      }
      const grouped = {};
      GAME_IDS.forEach((id) => { grouped[id] = sortScores(all[id]).slice(0, limit); });
      return json({ ok: true, games: grouped });
    }
    if (method === 'POST') {
      const body = await readJson(request);
      const game = body?.game;
      if (!GAME_IDS.includes(game)) return json({ ok: false, error: 'UNKNOWN_GAME' }, 400);
      const numericScore = Number(body?.score);
      if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 10_000_000) {
        return json({ ok: false, error: 'INVALID_SCORE' }, 400);
      }
      const score = await store(env).addScore({
        game,
        name: clean(body?.name, MAX_NAME_LENGTH) || 'Player',
        score: Math.round(numericScore),
        lang: normLang(body?.lang),
      });
      return json({ ok: true, score }, 201);
    }
  }

  // ── 评价体系 ────────────────────────────────────────────
  if (pathname === '/api/reviews') {
    if (method === 'GET') {
      const limit = clampInt(searchParams.get('limit'), 1, 100, 30);
      const data = await store(env).getReviews(limit);
      return json({ ok: true, ...data });
    }
    if (method === 'POST') {
      const body = await readJson(request);
      const rating = Number(body?.rating);
      if (!Number.isInteger(rating) || rating < MIN_RATING || rating > MAX_RATING) {
        return json({ ok: false, error: 'INVALID_RATING' }, 400);
      }
      if (isSpam(body)) return json({ ok: false, error: 'REJECTED' }, 400);

      const tags = Array.isArray(body?.tags)
        ? body.tags.filter((tag) => REVIEW_TAGS.includes(tag)).slice(0, 6)
        : [];
      const game = GAME_IDS.includes(body?.game) ? body.game : 'overall';

      const result = await store(env).addReview({
        rating,
        tags,
        comment: clean(body?.comment, MAX_COMMENT_LENGTH),
        name: clean(body?.name, MAX_NAME_LENGTH),
        game,
        lang: normLang(body?.lang),
        clientKey: ip,
      });

      if (result.throttled) {
        return json({ ok: false, error: 'TOO_FAST', retryAfterMs: result.retryAfterMs }, 429);
      }

      if (result.review) {
        // 邮件通知放在后台执行, 不阻塞前端响应
        ctx.waitUntil(notifyOwner(env, result.review, result.stats).catch((err) => {
          console.warn('review notification failed:', err?.message || err);
        }));
        return json({ ok: true, review: result.review, stats: result.stats }, 201);
      }
      return json({ ok: false, error: 'REJECTED' }, 400);
    }
  }

  return json({ ok: false, error: 'NOT_FOUND' }, 404);
}

// 发送评价提醒; 由 Durable Object 负责"提醒频率预算"
async function notifyOwner(env, review, stats) {
  const mail = getMailConfig(env);
  if (!mail.configured) {
    console.warn('[mail] 未配置 QQ_SMTP_PASS, 跳过提醒');
    return;
  }

  const allowed = await store(env).takeMailSlot();
  if (!allowed) {
    console.warn('[mail] 本小时提醒额度已用完, 跳过');
    return;
  }

  const stars = '★★★★★'.slice(0, review.rating) + '☆☆☆☆☆'.slice(0, MAX_RATING - review.rating);
  const rows = [
    review.comment ? `<p style="margin:0 0 12px;white-space:pre-wrap;font-size:15px;line-height:1.7;color:#111">${escapeHtml(review.comment)}</p>` : '',
    review.tags.length ? `<p style="margin:0 0 12px;color:#555;font-size:13px">标签: ${review.tags.map(escapeHtml).join(' · ')}</p>` : '',
  ].join('');

  const html = `<!doctype html><html><body style="margin:0;background:#eef1f7;padding:24px;font-family:-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px 26px;box-shadow:0 6px 24px rgba(15,23,42,.08)">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:.14em;color:#7c8aa5;text-transform:uppercase">MOVE ARCADE · 新评价</p>
    <p style="margin:0 0 18px;font-size:26px;letter-spacing:3px;color:#f4a020">${stars} <span style="font-size:15px;color:#334155;letter-spacing:0">${review.rating}/5</span></p>
    ${rows || '<p style="margin:0 0 12px;color:#94a3b8;font-size:14px">(未填写文字评价)</p>'}
    <table style="width:100%;border-collapse:collapse;font-size:13px;color:#475569;margin-top:6px">
      <tr><td style="padding:5px 0">昵称</td><td style="padding:5px 0;text-align:right;color:#0f172a">${escapeHtml(review.name || '匿名玩家')}</td></tr>
      <tr><td style="padding:5px 0">游戏</td><td style="padding:5px 0;text-align:right;color:#0f172a">${escapeHtml(review.game)}</td></tr>
      <tr><td style="padding:5px 0">语言</td><td style="padding:5px 0;text-align:right;color:#0f172a">${escapeHtml(review.lang)}</td></tr>
      <tr><td style="padding:5px 0">时间</td><td style="padding:5px 0;text-align:right;color:#0f172a">${new Date(review.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })} (北京时间)</td></tr>
    </table>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0" />
    <p style="margin:0;font-size:13px;color:#475569">
      累计 ${stats.total} 条评价 · 平均 <strong style="color:#0f172a">${stats.average}/5</strong><br />
      <span style="color:#94a3b8">1★ ${stats.distribution['1'] || 0} · 2★ ${stats.distribution['2'] || 0} · 3★ ${stats.distribution['3'] || 0} · 4★ ${stats.distribution['4'] || 0} · 5★ ${stats.distribution['5'] || 0}</span>
    </p>
    <p style="margin:18px 0 0"><a href="https://motionsensinggame.top/" style="color:#2563eb;font-size:13px">打开 MOVE ARCADE →</a></p>
  </div>
</body></html>`;

  await sendMail(env, { subject: `新评价 ${review.rating}/5 · ${review.name || '匿名玩家'}`, html });
  console.log(`[mail] 评价提醒已发送 rating=${review.rating} total=${stats.total}`);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[ch]);
}

// ── 数据存储: Durable Object ────────────────────────────────
export class ArcadeStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.seen = new Map(); // IP → 上次评价时间 (实例内存, 仅作快速节流)
  }

  async read(key, fallback) {
    const value = await this.ctx.storage.get(key);
    return value ?? fallback;
  }

  async getMessages() {
    const list = await this.read('messages', []);
    return Array.isArray(list) ? list : [];
  }

  async addMessage({ name, content, lang }) {
    const message = { id: newId(), name, content, lang, createdAt: Date.now() };
    const list = await this.getMessages();
    list.push(message);
    await this.ctx.storage.put('messages', list.slice(-MAX_MESSAGES));
    return message;
  }

  async getScores() {
    const raw = await this.read('scores', {});
    const all = {};
    GAME_IDS.forEach((id) => { all[id] = Array.isArray(raw?.[id]) ? raw[id] : []; });
    return all;
  }

  async addScore({ game, name, score, lang }) {
    const entry = { id: newId(), name, score, lang, createdAt: Date.now() };
    const all = await this.getScores();
    all[game] = sortScores([...all[game], entry]).slice(0, MAX_SCORES_PER_GAME);
    await this.ctx.storage.put('scores', all);
    return entry;
  }

  async getReviews(limit = 30) {
    const list = await this.read('reviews', []);
    const reviews = (Array.isArray(list) ? list : []).slice().sort((a, b) => b.createdAt - a.createdAt);
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    // 按游戏分组统计: "切西瓜 4.6 / 俄罗斯方块 4.1"这种差异才是对产品最有用的信息,
    // 只在客户端按返回的那一页算会漏掉更早的评价, 所以在服务端遍历全量
    const byGame = {};
    let sum = 0;
    reviews.forEach((review) => {
      const rating = Math.min(MAX_RATING, Math.max(MIN_RATING, Math.round(review.rating)));
      distribution[rating] += 1;
      sum += rating;

      const game = GAME_IDS.includes(review.game) ? review.game : 'overall';
      if (!byGame[game]) byGame[game] = { count: 0, sum: 0 };
      byGame[game].count += 1;
      byGame[game].sum += rating;
    });
    Object.keys(byGame).forEach((game) => {
      const entry = byGame[game];
      entry.average = Math.round((entry.sum / entry.count) * 10) / 10;
      delete entry.sum;
    });

    const total = reviews.length;
    return {
      total,
      distribution,
      byGame,
      average: total ? Math.round((sum / total) * 10) / 10 : 0,
      reviews: reviews.slice(0, limit),
    };
  }

  async addReview(payload) {
    const now = Date.now();
    const last = this.seen.get(payload.clientKey) || 0;
    if (now - last < REVIEW_COOLDOWN_MS) {
      return { throttled: true, retryAfterMs: REVIEW_COOLDOWN_MS - (now - last) };
    }
    this.seen.set(payload.clientKey, now);

    const review = {
      id: newId(),
      rating: payload.rating,
      tags: payload.tags,
      comment: payload.comment,
      name: payload.name,
      game: payload.game,
      lang: payload.lang,
      createdAt: now,
    };

    const existing = await this.read('reviews', []);
    const trimmed = [...(Array.isArray(existing) ? existing : []), review].slice(-MAX_REVIEWS);
    await this.ctx.storage.put('reviews', trimmed);

    const stats = await this.getReviews(1);
    return {
      review,
      stats: {
        total: stats.total,
        average: stats.average,
        distribution: stats.distribution,
        byGame: stats.byGame,
      },
    };
  }

  // 每小时最多 MAIL_BUDGET_PER_HOUR 封提醒, 避免被刷爆邮箱
  async takeMailSlot() {
    const now = Date.now();
    const log = (await this.read('mailLog', [])).filter((ts) => now - ts < 3_600_000);
    if (log.length >= MAIL_BUDGET_PER_HOUR) return false;
    log.push(now);
    await this.ctx.storage.put('mailLog', log);
    return true;
  }
}

// ── 工具 ────────────────────────────────────────────────────
function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function sortScores(list) {
  return (Array.isArray(list) ? list : [])
    .slice()
    .sort((a, b) => b.score - a.score || a.createdAt - b.createdAt);
}

function normLang(lang) {
  return lang === 'zh' ? 'zh' : 'en';
}

function clean(value, maxLength) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function clampInt(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

// 简易反垃圾: 前端埋了一个对真人不可见的 honeypot 字段, 被填即视为机器人
function isSpam(body) {
  if (body?.website || body?.hp) return true;
  return false;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
