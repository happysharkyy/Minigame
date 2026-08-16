// src/leaderboard.js — 排行榜 (按游戏查看 / 自动刷新 / 中英切换)
import { getLang, t, tf } from './i18n.js';

const NAME_KEY = 'move-arcade-msg-name';
const GAME_TABS = [
  { id: 'tetris', titleKey: 'lib.tetris.title' },
  { id: 'fruit', titleKey: 'lib.fruit.title' },
  { id: 'star', titleKey: 'lib.star.title' },
  { id: 'guard', titleKey: 'lib.guard.title' },
];

let els = null;
let activeGame = 'tetris';
let scoresByGame = {};
let myId = null;

function esc(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[ch]);
}

function getSavedName() {
  try {
    return localStorage.getItem(NAME_KEY) || '';
  } catch (err) {
    return '';
  }
}

function formatTime(ts) {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return t('msg.justNow');
  if (min < 60) return tf('msg.minutesAgo', { n: min });
  const hours = Math.floor(min / 60);
  if (hours < 24) return tf('msg.hoursAgo', { n: hours });
  return tf('msg.daysAgo', { n: Math.floor(hours / 24) });
}

function renderTabs() {
  const tabs = els.tabs;
  tabs.innerHTML = '';
  GAME_TABS.forEach((game) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `lb-tab${game.id === activeGame ? ' active' : ''}`;
    btn.dataset.game = game.id;
    btn.setAttribute('role', 'tab');
    btn.textContent = t(game.titleKey);
    tabs.appendChild(btn);
  });
}

function renderList() {
  const list = els.list;
  const entries = scoresByGame[activeGame] || [];
  const empty = els.empty;
  const error = els.error;
  const banner = els.banner;

  error.classList.add('hidden');

  if (entries.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    banner.classList.add('hidden');
    return;
  }

  empty.classList.add('hidden');
  banner.classList.toggle('hidden', !(myId && entries[0] && entries[0].id === myId));

  const frag = document.createDocumentFragment();
  entries.forEach((entry, index) => {
    const rank = index + 1;
    const isMe = myId && entry.id === myId;
    const row = document.createElement('div');
    row.className = `lb-row${isMe ? ' me' : ''}`;

    const rankEl = document.createElement('span');
    rankEl.className = `lb-rank${rank <= 3 ? ` top-${rank}` : ''}`;
    rankEl.textContent = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : String(rank);

    const nameEl = document.createElement('span');
    nameEl.className = 'lb-name';
    nameEl.textContent = entry.name;
    if (isMe) {
      const youTag = document.createElement('em');
      youTag.textContent = t('lb.you');
      nameEl.appendChild(youTag);
    }

    const scoreEl = document.createElement('strong');
    scoreEl.className = 'lb-score';
    scoreEl.textContent = String(entry.score);

    const timeEl = document.createElement('span');
    timeEl.className = 'lb-time';
    timeEl.textContent = formatTime(entry.createdAt);

    row.append(rankEl, nameEl, scoreEl, timeEl);
    frag.appendChild(row);
  });
  list.innerHTML = '';
  list.appendChild(frag);
}

function render() {
  if (!els) return;
  renderTabs();
  renderList();
}

async function fetchScores() {
  if (!els) return;
  const { empty, error } = els;
  empty.classList.add('hidden');
  error.classList.add('hidden');

  try {
    const res = await fetch('/api/scores');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    scoresByGame = data.games || {};
  } catch (err) {
    scoresByGame = {};
    error.textContent = t('lb.loadError');
    error.classList.remove('hidden');
  }
  renderList();
}

// 提交一局分数到排行榜
async function submitScore(game, score) {
  if (!score || score <= 0) return;
  try {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game, name: getSavedName() || t('lb.defaultName'), score, lang: getLang() }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.score) myId = data.score.id;
  } catch (err) {
    // 后端未启动等场景静默失败,不打扰游戏体验
    return;
  }
  await fetchScores();
}

// 语言切换后刷新文案
function refresh() {
  if (!els) return;
  render();
}

// 切换游戏时联动排行榜 Tab
function setActiveGame(game) {
  if (!GAME_TABS.some((g) => g.id === game)) return;
  activeGame = game;
  if (els) render();
}

function initLeaderboard() {
  if (els) return;

  els = {
    panel: document.querySelector('#leaderboardPanel'),
    tabs: document.querySelector('#lbTabs'),
    list: document.querySelector('#lbList'),
    empty: document.querySelector('#lbEmpty'),
    error: document.querySelector('#lbError'),
    banner: document.querySelector('#lbBanner'),
  };

  if (!els.panel) {
    els = null;
    return;
  }

  els.tabs.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-game]');
    if (!tab) return;
    activeGame = tab.dataset.game;
    render();
  });

  render();
  fetchScores();
  return { refresh };
}

export { initLeaderboard, refresh as refreshLeaderboard, setActiveGame, submitScore };
