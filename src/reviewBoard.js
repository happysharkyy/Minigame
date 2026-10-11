// src/reviewBoard.js — 评价体系 (星级评分 + 标签 + 文字评价 + 聚合展示)
import { getLang, t, tf } from './i18n.js';

const TAGS = [
  'accurate', 'smooth', 'fun', 'addictive', 'easy',
  'exhausting', 'laggy', 'unclear', 'camera', 'moreGames',
];
const NAME_KEY = 'move-arcade-msg-name';
const RATED_KEY = 'move-arcade-rated';
const MAX_COMMENT = 600;
const MAX_RATING = 5;
const RATED_COOLDOWN_MS = 20_000;

let els = null;
let rating = 0;
let hoverRating = 0;
let selectedTags = new Set();
let submitting = false;
let reviews = [];
let stats = { total: 0, average: 0, distribution: {}, byGame: {} };
let currentGame = 'overall';
let lastSubmitAt = 0;

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[ch]);
}

function starString(value) {
  const filled = Math.max(0, Math.min(MAX_RATING, Math.round(value)));
  return '★'.repeat(filled) + '☆'.repeat(MAX_RATING - filled);
}

function formatTime(ts) {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return t('msg.justNow');
  if (min < 60) return tf('msg.minutesAgo', { n: min });
  const hours = Math.floor(min / 60);
  if (hours < 24) return tf('msg.hoursAgo', { n: hours });
  return tf('msg.daysAgo', { n: Math.floor(hours / 24) });
}

function toast(key, tone = 'info') {
  if (!els) return;
  els.status.textContent = t(key);
  els.status.dataset.tone = tone;
  els.status.classList.remove('hidden');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => els && els.status.classList.add('hidden'), 2600);
}

// ── 渲染 ────────────────────────────────────
function paintStars() {
  const shown = hoverRating || rating;
  els.starButtons.forEach((btn, index) => {
    const value = index + 1;
    btn.classList.toggle('active', value <= shown);
    btn.setAttribute('aria-checked', String(value === rating));
    btn.tabIndex = value === (rating || 1) ? 0 : -1;
  });
  els.ratingValue.textContent = shown
    ? t(rating ? 'rv.ratingLabel' : 'rv.starHint') + ` · ${shown}/${MAX_RATING}`
    : t('rv.starHint');
}

function paintTags() {
  els.tagButtons.forEach((btn) => {
    btn.classList.toggle('active', selectedTags.has(btn.dataset.tag));
    btn.setAttribute('aria-pressed', String(selectedTags.has(btn.dataset.tag)));
  });
}

function renderSummary() {
  const { total, average, distribution } = stats;
  if (!total) {
    els.summaryValue.textContent = '—';
    els.summaryMeta.textContent = t('rv.noReviews');
    els.distribution.innerHTML = '';
    renderJump();
    return;
  }
  els.summaryValue.textContent = average.toFixed(1);
  els.summaryMeta.textContent = `${t('rv.average').replace('{avg}', average)} · ${tf('rv.total', { count: total })}`;

  const frag = document.createDocumentFragment();
  for (let star = MAX_RATING; star >= 1; star -= 1) {
    const count = distribution[star] || distribution[String(star)] || 0;
    const percent = total ? Math.round((count / total) * 100) : 0;
    const row = document.createElement('div');
    row.className = 'rating-bar';
    row.innerHTML = `
      <span class="rating-bar-label">${star}★</span>
      <span class="rating-bar-track"><i style="width:${percent}%"></i></span>
      <span class="rating-bar-count">${count}</span>`;
    row.setAttribute('aria-label', tf('rv.distAria', { n: star, count }));
    frag.appendChild(row);
  }
  els.distribution.innerHTML = '';
  els.distribution.appendChild(frag);

  renderJump();
  renderByGame();
}

// 分游戏看: 整体平均分看不出"哪款更好玩", 而这款差异才是决定下一步优化什么的信息。
// 数据由服务端遍历全量评价算出(客户端只能看到最近一页, 会算少)。
function renderByGame() {
  if (!els?.byGame) return;

  const entries = Object.entries(stats.byGame || {})
    .filter(([, value]) => value && value.count > 0)
    .sort((a, b) => b[1].count - a[1].count);

  // 只有一个分组时与上面的大分数完全重复, 不如不显示
  if (entries.length < 2) {
    els.byGame.classList.add('hidden');
    els.byGame.innerHTML = '';
    return;
  }

  els.byGame.innerHTML = `<span class="review-feed-label">${esc(t('rv.byGame'))}</span>`
    + entries.map(([game, value]) => {
      const title = game === 'overall' ? t('rv.gameOverall') : t(`lib.${game}.title`);
      const row = tf('rv.byGameRow', { avg: value.average ?? 0, count: value.count });
      return `<span class="bygame-row"><b>${esc(title)}</b>${esc(row)}</span>`;
    }).join('');
  els.byGame.classList.remove('hidden');
}

// 排行榜里的聚合评分入口: 评价面板在页面很靠后, 这个按钮是它主要的曝光位。
// 一条评价都没有时不显示 —— 空的"0 条评价"只会让人觉得这站没人用。
function renderJump() {
  if (!els?.jump) return;
  if (!stats.total) {
    els.jump.classList.add('hidden');
    return;
  }
  els.jumpStars.textContent = starString(stats.average);
  els.jumpText.textContent = tf('rv.jumpSummary', {
    avg: stats.average.toFixed(1),
    count: stats.total,
  });
  els.jump.setAttribute('aria-label', t('rv.jumpCta'));
  els.jump.classList.remove('hidden');
}

function scrollToReviewForm() {
  const panel = document.querySelector('#reviewPanel');
  if (!panel) return;
  panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => panel.querySelector('.star-btn')?.focus({ preventScroll: true }), 400);
}

function renderList() {
  const list = els.list;
  const empty = els.empty;
  const error = els.error;

  error.classList.add('hidden');
  error.textContent = '';

  if (reviews.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  const frag = document.createDocumentFragment();
  reviews.slice(0, 8).forEach((review, index) => {
    const item = document.createElement('article');
    item.className = 'review-item';
    item.style.animationDelay = `${Math.min(index * 40, 240)}ms`;
    const chips = (review.tags || [])
      .map((tag) => `<span class="review-chip">${esc(t(`rv.tag.${tag}`))}</span>`)
      .join('');
    item.innerHTML = `
      <div class="review-item-head">
        <span class="review-stars" aria-hidden="true">${starString(review.rating)}</span>
        <span class="review-author">${esc(review.name || t('rv.anonymous'))}</span>
        <span class="review-time">${formatTime(review.createdAt)}</span>
      </div>
      ${review.comment ? `<p class="review-comment">${esc(review.comment)}</p>` : ''}
      ${chips ? `<div class="review-chips">${chips}</div>` : ''}`;
    frag.appendChild(item);
  });
  list.innerHTML = '';
  list.appendChild(frag);
}

// ── 数据 ────────────────────────────────────
async function fetchReviews() {
  if (!els) return;
  els.empty.textContent = t('rv.loading');
  els.empty.classList.remove('hidden');

  try {
    const res = await fetch('/api/reviews?limit=30');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'BAD_RESPONSE');
    reviews = Array.isArray(data.reviews) ? data.reviews : [];
    stats = {
      total: Number(data.total) || 0,
      average: Number(data.average) || 0,
      distribution: data.distribution || {},
      byGame: data.byGame || {},
    };
  } catch (err) {
    reviews = [];
    stats = { total: 0, average: 0, distribution: {}, byGame: {} };
    els.error.textContent = t('rv.loadError');
    els.error.classList.remove('hidden');
  }

  els.empty.classList.add('hidden');
  renderSummary();
  renderList();
}

function savedName() {
  try {
    return localStorage.getItem(NAME_KEY) || '';
  } catch (err) {
    return '';
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  if (!els || submitting) return;

  if (!rating) {
    toast('rv.needRating', 'warn');
    els.starButtons[0].focus();
    return;
  }
  if (Date.now() - lastSubmitAt < RATED_COOLDOWN_MS) {
    toast('rv.tooFast', 'warn');
    return;
  }

  submitting = true;
  els.submitBtn.disabled = true;
  const originalLabel = t('rv.submit');
  els.submitBtn.textContent = '…';

  try {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating,
        tags: [...selectedTags],
        comment: els.comment.value.trim(),
        name: els.name.value.trim(),
        game: currentGame,
        lang: getLang(),
        website: els.trap.value, // honeypot: 真人始终为空
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.status === 429) {
      toast('rv.tooFast', 'warn');
      return;
    }
    if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);

    lastSubmitAt = Date.now();
    const name = els.name.value.trim();
    if (name) {
      try {
        localStorage.setItem(NAME_KEY, name);
      } catch (err) {
        /* 隐私模式 */
      }
    }
    try {
      localStorage.setItem(RATED_KEY, String(Date.now()));
    } catch (err) {
      /* 忽略 */
    }

    if (data.review) reviews = [data.review, ...reviews];
    if (data.stats) {
      stats = {
        total: Number(data.stats.total) || stats.total,
        average: Number(data.stats.average) || stats.average,
        distribution: data.stats.distribution || stats.distribution,
        byGame: data.stats.byGame || stats.byGame,
      };
    }

    // 重置表单(保留昵称), 便于下一次评价
    rating = 0;
    hoverRating = 0;
    selectedTags = new Set();
    els.comment.value = '';
    els.charCount.textContent = `0/${MAX_COMMENT}`;
    paintStars();
    paintTags();

    renderSummary();
    renderList();
    toast('rv.thanks', 'success');
  } catch (err) {
    toast('rv.sendError', 'error');
  } finally {
    submitting = false;
    els.submitBtn.disabled = false;
    els.submitBtn.textContent = originalLabel;
  }
}

// ── 初始化 ──────────────────────────────────
function buildStars() {
  const group = els.starGroup;
  group.innerHTML = '';
  els.starButtons = [];
  for (let value = 1; value <= MAX_RATING; value += 1) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'star-btn';
    btn.dataset.value = String(value);
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-label', tf('rv.starAria', { n: value }));
    btn.textContent = '★';
    btn.addEventListener('click', () => {
      rating = value;
      paintStars();
    });
    btn.addEventListener('mouseenter', () => {
      hoverRating = value;
      paintStars();
    });
    group.appendChild(btn);
    els.starButtons.push(btn);
  }
  group.addEventListener('mouseleave', () => {
    hoverRating = 0;
    paintStars();
  });
  group.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = Math.max(1, Math.min(MAX_RATING, (rating || 0) + (event.key === 'ArrowRight' ? 1 : -1)));
    rating = next;
    paintStars();
    els.starButtons[next - 1].focus();
  });
}

function buildTags() {
  const wrap = els.tagWrap;
  wrap.innerHTML = '';
  els.tagButtons = [];
  TAGS.forEach((tag) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'review-tag';
    btn.dataset.tag = tag;
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent = t(`rv.tag.${tag}`);
    btn.addEventListener('click', () => {
      if (selectedTags.has(tag)) selectedTags.delete(tag);
      else if (selectedTags.size < 6) selectedTags.add(tag);
      paintTags();
    });
    wrap.appendChild(btn);
    els.tagButtons.push(btn);
  });
}

function initReviewBoard() {
  if (els) return els;

  const panel = document.querySelector('#reviewPanel');
  if (!panel) return null;

  els = {
    panel,
    starGroup: panel.querySelector('#reviewStars'),
    ratingValue: panel.querySelector('#reviewRatingValue'),
    tagWrap: panel.querySelector('#reviewTags'),
    comment: panel.querySelector('#reviewComment'),
    charCount: panel.querySelector('#reviewCharCount'),
    name: panel.querySelector('#reviewName'),
    trap: panel.querySelector('#reviewWebsite'),
    submitBtn: panel.querySelector('#reviewSubmitBtn'),
    status: panel.querySelector('#reviewStatus'),
    summaryValue: panel.querySelector('#reviewAverage'),
    summaryMeta: panel.querySelector('#reviewSummaryMeta'),
    distribution: panel.querySelector('#reviewDistribution'),
    list: panel.querySelector('#reviewList'),
    empty: panel.querySelector('#reviewEmpty'),
    error: panel.querySelector('#reviewError'),
    byGame: panel.querySelector('#reviewByGame'),
    gameHint: panel.querySelector('#reviewGameHint'),
    // 聚合评分入口在排行榜面板里(见 index.html), 所以不在 panel 内查找
    jump: document.querySelector('#reviewJump'),
    jumpStars: document.querySelector('#reviewJumpStars'),
    jumpText: document.querySelector('#reviewJumpText'),
  };

  els.name.value = savedName();

  els.comment.addEventListener('input', () => {
    els.charCount.textContent = `${els.comment.value.length}/${MAX_COMMENT}`;
  });

  panel.addEventListener('submit', handleSubmit);
  els.jump?.addEventListener('click', scrollToReviewForm);

  buildStars();
  buildTags();
  paintStars();
  paintTags();
  fetchReviews();

  return { refresh: refreshReviewBoard };
}

// 语言切换 / 当前游戏变化后调用
function refreshReviewBoard() {
  if (!els) return;
  buildTags();
  paintTags();
  paintStars();
  renderSummary();
  renderList();
  if (els.status.dataset.tone) els.status.textContent = '';
  els.status.classList.add('hidden');
  els.charCount.textContent = `${els.comment.value.length}/${MAX_COMMENT}`;
}

// 记录当前正在玩的游戏, 随评价一起提交
function setReviewGame(gameId) {
  currentGame = gameId || 'overall';
  if (!els) return;
  els.gameHint.textContent = currentGame === 'overall'
    ? t('rv.gameOverall')
    : t(`lib.${currentGame}.title`);
}

// 是否已经评过(用于决定要不要在局末结算里继续劝评)
function hasRated() {
  try {
    return Boolean(localStorage.getItem(RATED_KEY));
  } catch (err) {
    return false;
  }
}

export { initReviewBoard, refreshReviewBoard, setReviewGame, hasRated, scrollToReviewForm, RATED_KEY };
