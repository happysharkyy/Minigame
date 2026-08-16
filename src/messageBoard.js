// src/messageBoard.js — 留言板交互逻辑 (加载 / 渲染 / 发布 / 中英切换)
import { getLang, t, tf } from './i18n.js';

const NAME_KEY = 'move-arcade-msg-name';
const MAX_CONTENT = 500;

let els = null;
let messages = [];
let submitting = false;

function esc(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[ch]);
}

function formatTime(ts) {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return t('msg.justNow');
  if (min < 60) return tf('msg.minutesAgo', { n: min });
  const hours = Math.floor(min / 60);
  if (hours < 24) return tf('msg.hoursAgo', { n: hours });
  return tf('msg.daysAgo', { n: Math.floor(hours / 24) });
}

function renderMessages() {
  if (!els) return;
  const { list, empty, error, count } = els;

  error.classList.add('hidden');

  if (messages.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    count.textContent = tf('msg.count', { count: 0 });
    return;
  }

  empty.classList.add('hidden');
  count.textContent = tf('msg.count', { count: messages.length });

  const frag = document.createDocumentFragment();
  messages.forEach((msg, i) => {
    const item = document.createElement('article');
    item.className = 'message-item';
    item.style.animationDelay = `${Math.min(i * 35, 210)}ms`;
    const langClass = msg.lang === 'zh' ? 'zh' : 'en';
    item.innerHTML = `
      <span class="message-avatar" aria-hidden="true">${esc(String(msg.name).slice(0, 1).toUpperCase())}</span>
      <div class="message-body">
        <div class="message-meta">
          <strong>${esc(msg.name)}</strong>
          <span class="message-lang ${langClass}">${msg.lang === 'zh' ? t('msg.langZh') : t('msg.langEn')}</span>
          <span class="message-time">${formatTime(msg.createdAt)}</span>
        </div>
        <p class="message-text">${esc(msg.content)}</p>
      </div>`;
    frag.appendChild(item);
  });
  list.innerHTML = '';
  list.appendChild(frag);
}

async function fetchMessages() {
  if (!els) return;
  const { error, empty } = els;
  empty.classList.add('hidden');
  error.classList.add('hidden');
  empty.textContent = t('msg.loading');
  empty.classList.remove('hidden');

  try {
    const res = await fetch('/api/messages');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    messages = Array.isArray(data.messages) ? data.messages : [];
  } catch (err) {
    messages = [];
    error.textContent = t('msg.loadError');
    error.classList.remove('hidden');
  }

  empty.classList.add('hidden');
  renderMessages();
}

function setSubmitting(value) {
  submitting = value;
  if (!els) return;
  els.submitBtn.disabled = value;
  els.submitBtn.textContent = value ? '…' : t('msg.submit');
}

async function handleSubmit(event) {
  event.preventDefault();
  if (!els || submitting) return;

  const name = els.nameInput.value.trim();
  const content = els.contentInput.value.trim();

  if (!name) {
    els.nameInput.focus();
    els.submitBtn.textContent = t('msg.nameRequired');
    setTimeout(() => { if (!submitting) els.submitBtn.textContent = t('msg.submit'); }, 1400);
    return;
  }
  if (!content) {
    els.contentInput.focus();
    els.submitBtn.textContent = t('msg.contentRequired');
    setTimeout(() => { if (!submitting) els.submitBtn.textContent = t('msg.submit'); }, 1400);
    return;
  }

  setSubmitting(true);
  try {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content, lang: getLang() }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    try {
      localStorage.setItem(NAME_KEY, name);
    } catch (err) {
      // 忽略隐私模式下的存储失败
    }

    messages = [data.message, ...messages];
    els.contentInput.value = '';
    els.charCount.textContent = `0/${MAX_CONTENT}`;
    renderMessages();

    els.submitBtn.textContent = t('msg.success');
    setTimeout(() => { if (!submitting) els.submitBtn.textContent = t('msg.submit'); }, 1600);
  } catch (err) {
    els.submitBtn.textContent = t('msg.sendError');
    setTimeout(() => { if (!submitting) els.submitBtn.textContent = t('msg.submit'); }, 1600);
  } finally {
    setSubmitting(false);
  }
}

// 语言切换后刷新时间文案 / 计数 / 语言徽标
function refresh() {
  if (!els) return;
  renderMessages();
  if (els.submitBtn.textContent === '…') return;
  els.submitBtn.textContent = t('msg.submit');
}

function initMessageBoard() {
  if (els) return els;

  els = {
    panel: document.querySelector('#messagePanel'),
    nameInput: document.querySelector('#messageName'),
    contentInput: document.querySelector('#messageContent'),
    charCount: document.querySelector('#messageCharCount'),
    submitBtn: document.querySelector('#messageSubmitBtn'),
    list: document.querySelector('#messageList'),
    empty: document.querySelector('#messageEmpty'),
    error: document.querySelector('#messageError'),
    count: document.querySelector('#messageCount'),
  };

  if (!els.panel) {
    els = null;
    return null;
  }

  // 恢复上次填写的昵称
  try {
    const savedName = localStorage.getItem(NAME_KEY);
    if (savedName) els.nameInput.value = savedName;
  } catch (err) {
    // 忽略
  }

  els.contentInput.addEventListener('input', () => {
    els.charCount.textContent = `${els.contentInput.value.length}/${MAX_CONTENT}`;
  });

  els.panel.addEventListener('submit', handleSubmit);

  fetchMessages();
  return { refresh };
}

export { initMessageBoard, refresh as refreshMessageBoard };
