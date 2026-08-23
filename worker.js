// worker.js — Cloudflare Worker 入口 (留言板 + 排行榜 API + 静态资源)
// 与本地 server.js 保持相同 API 契约, 数据持久化使用 Cloudflare KV
const GAME_IDS = ['tetris', 'fruit', 'star', 'guard'];
const MAX_NAME_LENGTH = 24;
const MAX_CONTENT_LENGTH = 500;
const MAX_MESSAGES = 200;
const MAX_SCORES_PER_GAME = 50;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API 路由
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env, url);
    }

    // 其余请求交给静态资源 (dist/)
    return env.ASSETS.fetch(request);
  },
};

async function handleApi(request, env, url) {
  const { pathname, searchParams } = url;
  const method = request.method;

  if (pathname === '/api/health') {
    return json({ ok: true });
  }

  if (pathname === '/api/messages') {
    if (method === 'GET') {
      const messages = await readMessages(env);
      return json({ ok: true, count: messages.length, messages });
    }
    if (method === 'POST') {
      const body = await readJson(request);
      const cleanName = String(body?.name || '').trim().slice(0, MAX_NAME_LENGTH);
      const cleanContent = String(body?.content || '').trim().slice(0, MAX_CONTENT_LENGTH);
      if (!cleanName) return json({ ok: false, error: 'NAME_REQUIRED' }, 400);
      if (!cleanContent) return json({ ok: false, error: 'CONTENT_REQUIRED' }, 400);

      const messages = await readMessages(env);
      const message = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        name: cleanName,
        content: cleanContent,
        lang: body?.lang === 'zh' ? 'zh' : 'en',
        createdAt: Date.now(),
      };
      messages.push(message);
      await env.DATA.put('messages', JSON.stringify(messages.slice(-MAX_MESSAGES)));
      return json({ ok: true, message }, 201);
    }
  }

  if (pathname === '/api/scores') {
    if (method === 'GET') {
      const game = searchParams.get('game');
      const limit = Math.max(1, Math.min(50, Number(searchParams.get('limit')) || 10));
      const all = await readScores(env);
      if (game) {
        if (!GAME_IDS.includes(game)) return json({ ok: false, error: 'UNKNOWN_GAME' }, 400);
        const list = all[game].slice().sort((a, b) => b.score - a.score).slice(0, limit);
        return json({ ok: true, game, count: list.length, scores: list });
      }
      const grouped = {};
      GAME_IDS.forEach((id) => {
        grouped[id] = all[id].slice().sort((a, b) => b.score - a.score).slice(0, limit);
      });
      return json({ ok: true, games: grouped });
    }
    if (method === 'POST') {
      const body = await readJson(request);
      const game = body?.game;
      if (!GAME_IDS.includes(game)) return json({ ok: false, error: 'UNKNOWN_GAME' }, 400);
      const numericScore = Number(body?.score);
      if (!Number.isFinite(numericScore) || numericScore < 0) {
        return json({ ok: false, error: 'INVALID_SCORE' }, 400);
      }
      const cleanName = String(body?.name || '').trim().slice(0, MAX_NAME_LENGTH) || 'Player';

      const all = await readScores(env);
      const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        name: cleanName,
        score: Math.round(numericScore),
        lang: body?.lang === 'zh' ? 'zh' : 'en',
        createdAt: Date.now(),
      };
      all[game].push(entry);
      all[game] = all[game].slice().sort((a, b) => b.score - a.score).slice(0, MAX_SCORES_PER_GAME);
      await env.DATA.put('scores', JSON.stringify(all));
      return json({ ok: true, score: entry }, 201);
    }
  }

  return json({ ok: false, error: 'NOT_FOUND' }, 404);
}

async function readMessages(env) {
  try {
    const raw = await env.DATA.get('messages');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

async function readScores(env) {
  try {
    const raw = await env.DATA.get('scores');
    const parsed = raw ? JSON.parse(raw) : {};
    GAME_IDS.forEach((id) => {
      if (!Array.isArray(parsed[id])) parsed[id] = [];
    });
    return parsed;
  } catch (err) {
    const empty = {};
    GAME_IDS.forEach((id) => { empty[id] = []; });
    return empty;
  }
}

async function readJson(request) {
  try {
    return await request.json();
  } catch (err) {
    return {};
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}