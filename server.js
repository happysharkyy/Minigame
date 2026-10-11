// server.js — 留言板本地后端 (Express + JSON 文件存储)
// 运行方式: node server.js  (默认端口 3001)
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'messages.json');

const MAX_NAME_LENGTH = 24;
const MAX_CONTENT_LENGTH = 500;
const MAX_MESSAGES = 200;

const GAME_IDS = ['tetris', 'fruit', 'star', 'guard'];
const MAX_SCORES_PER_GAME = 50;

app.use(express.json({ limit: '32kb' }));

// 确保数据目录与文件存在
function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

function readMessages() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function writeMessages(messages) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2), 'utf8');
}

// 获取全部留言(按时间倒序)
app.get('/api/messages', (req, res) => {
  const messages = readMessages().sort((a, b) => b.createdAt - a.createdAt);
  res.json({ ok: true, count: messages.length, messages });
});

// 新增留言
app.post('/api/messages', (req, res) => {
  const { name, content, lang } = req.body || {};

  const cleanName = String(name || '').trim().slice(0, MAX_NAME_LENGTH);
  const cleanContent = String(content || '').trim().slice(0, MAX_CONTENT_LENGTH);

  if (!cleanName) {
    return res.status(400).json({ ok: false, error: 'NAME_REQUIRED' });
  }
  if (!cleanContent) {
    return res.status(400).json({ ok: false, error: 'CONTENT_REQUIRED' });
  }

  const messages = readMessages();
  const message = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: cleanName,
    content: cleanContent,
    lang: lang === 'zh' ? 'zh' : 'en',
    createdAt: Date.now(),
  };

  messages.push(message);
  // 限制留言总数,保留最新的
  const trimmed = messages.slice(-MAX_MESSAGES);
  writeMessages(trimmed);

  res.status(201).json({ ok: true, message });
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// ── 排行榜 ────────────────────────────────
const SCORE_FILE = path.join(DATA_DIR, 'scores.json');

function ensureScoreFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SCORE_FILE)) {
    const empty = {};
    GAME_IDS.forEach((id) => { empty[id] = []; });
    fs.writeFileSync(SCORE_FILE, JSON.stringify(empty, null, 2), 'utf8');
  }
}

function readScores() {
  ensureScoreFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(SCORE_FILE, 'utf8'));
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

function writeScores(scores) {
  ensureScoreFile();
  fs.writeFileSync(SCORE_FILE, JSON.stringify(scores, null, 2), 'utf8');
}

// 获取某款游戏排行榜(按分数倒序, 默认取前 10)
app.get('/api/scores', (req, res) => {
  const { game } = req.query;
  const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));

  const all = readScores();
  if (game) {
    if (!GAME_IDS.includes(game)) {
      return res.status(400).json({ ok: false, error: 'UNKNOWN_GAME' });
    }
    const list = all[game].slice().sort((a, b) => b.score - a.score).slice(0, limit);
    return res.json({ ok: true, game, count: list.length, scores: list });
  }

  const grouped = {};
  GAME_IDS.forEach((id) => {
    grouped[id] = all[id].slice().sort((a, b) => b.score - a.score).slice(0, limit);
  });
  res.json({ ok: true, games: grouped });
});

// 提交一局分数
app.post('/api/scores', (req, res) => {
  const { game, name, score, lang } = req.body || {};

  if (!GAME_IDS.includes(game)) {
    return res.status(400).json({ ok: false, error: 'UNKNOWN_GAME' });
  }
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore) || numericScore < 0) {
    return res.status(400).json({ ok: false, error: 'INVALID_SCORE' });
  }
  const cleanName = String(name || '').trim().slice(0, MAX_NAME_LENGTH) || 'Player';

  const all = readScores();
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: cleanName,
    score: Math.round(numericScore),
    lang: lang === 'zh' ? 'zh' : 'en',
    createdAt: Date.now(),
  };

  all[game].push(entry);
  all[game] = all[game].slice().sort((a, b) => b.score - a.score).slice(0, MAX_SCORES_PER_GAME);
  writeScores(all);

  res.status(201).json({ ok: true, score: entry });
});

// ── 评价体系 ────────────────────────────────
const REVIEW_FILE = path.join(DATA_DIR, 'reviews.json');
const MAX_COMMENT_LENGTH = 600;
const MAX_REVIEWS = 500;
const REVIEW_TAGS = [
  'accurate', 'smooth', 'fun', 'addictive', 'easy', 'exhausting',
  'laggy', 'unclear', 'camera', 'moreGames',
];

function ensureReviewFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(REVIEW_FILE)) {
    fs.writeFileSync(REVIEW_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

function readReviews() {
  ensureReviewFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(REVIEW_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function summarizeReviews(list) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const byGame = {};
  let sum = 0;
  list.forEach((review) => {
    const rating = Math.min(5, Math.max(1, Math.round(review.rating)));
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
  const total = list.length;
  return { total, distribution, byGame, average: total ? Math.round((sum / total) * 10) / 10 : 0 };
}

app.get('/api/reviews', (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 30));
  const reviews = readReviews().sort((a, b) => b.createdAt - a.createdAt);
  res.json({ ok: true, ...summarizeReviews(reviews), reviews: reviews.slice(0, limit) });
});

app.post('/api/reviews', (req, res) => {
  const { rating, tags, comment, name, game, lang, website, hp } = req.body || {};

  if (website || hp) {
    return res.status(400).json({ ok: false, error: 'REJECTED' });
  }
  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ ok: false, error: 'INVALID_RATING' });
  }

  const review = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    rating: numericRating,
    tags: Array.isArray(tags) ? tags.filter((tag) => REVIEW_TAGS.includes(tag)).slice(0, 6) : [],
    comment: String(comment || '').replace(/\s+/g, ' ').trim().slice(0, MAX_COMMENT_LENGTH),
    name: String(name || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH),
    game: GAME_IDS.includes(game) ? game : 'overall',
    lang: lang === 'zh' ? 'zh' : 'en',
    createdAt: Date.now(),
  };

  const all = [...readReviews(), review].slice(-MAX_REVIEWS);
  ensureReviewFile();
  fs.writeFileSync(REVIEW_FILE, JSON.stringify(all, null, 2), 'utf8');

  // 本地开发不发送邮件, 线上由 Worker 通过 SMTP 推送
  res.status(201).json({ ok: true, review, stats: summarizeReviews(all) });
});

app.listen(PORT, () => {
  console.log(`Message board API running at http://localhost:${PORT}`);
});
