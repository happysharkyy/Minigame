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

app.listen(PORT, () => {
  console.log(`Message board API running at http://localhost:${PORT}`);
});
