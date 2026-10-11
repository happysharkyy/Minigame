// src/sfx.js — 用 WebAudio 现场合成音效, 不依赖任何音频文件
//
// 设计要点:
// - 浏览器要求音频必须由用户手势启动, 所以 AudioContext 懒创建(第一次交互时才 new),
//   并且在页面恢复可见/首次点击时尝试 resume。
// - 只做很短的音, 每个音有独立的增益包络; 高频动作(移动/旋转)带最小间隔, 避免噪音堆积。
// - 连击音会随 combo 提高音高, 这是"越玩越上头"最便宜的一种反馈。

const ENABLED_KEY = 'move-arcade-sound';

let ctx = null;
let master = null;
let enabled = true;
let lastPlayedAt = {};

function readEnabled() {
  try {
    const saved = localStorage.getItem(ENABLED_KEY);
    return saved === null ? true : saved === '1';
  } catch (err) {
    return true;
  }
}

function writeEnabled(value) {
  try {
    localStorage.setItem(ENABLED_KEY, value ? '1' : '0');
  } catch (err) {
    /* 隐私模式 */
  }
}

function ensureContext() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch (err) {
    return null;
  }
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  return ctx;
}

// 单个音符: waveform 波形, from→to 扫频, dur 时长, gain 音量
function tone({ wave = 'sine', from = 440, to = from, dur = 0.12, gain = 0.3, delay = 0 }) {
  const audio = ensureContext();
  if (!audio) return;
  if (audio.state === 'suspended') audio.resume().catch(() => {});

  const startAt = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const env = audio.createGain();

  osc.type = wave;
  osc.frequency.setValueAtTime(from, startAt);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), startAt + dur);

  env.gain.setValueAtTime(0.0001, startAt);
  env.gain.exponentialRampToValueAtTime(gain, startAt + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);

  osc.connect(env);
  env.connect(master);
  osc.start(startAt);
  osc.stop(startAt + dur + 0.03);
}

function noise({ dur = 0.16, gain = 0.22, delay = 0, filterFrom = 2600, filterTo = 500 }) {
  const audio = ensureContext();
  if (!audio) return;
  if (audio.state === 'suspended') audio.resume().catch(() => {});

  const startAt = audio.currentTime + delay;
  const frames = Math.floor(audio.sampleRate * dur);
  const buffer = audio.createBuffer(1, frames, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);

  const src = audio.createBufferSource();
  src.buffer = buffer;

  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFrom, startAt);
  filter.frequency.exponentialRampToValueAtTime(Math.max(60, filterTo), startAt + dur);

  const env = audio.createGain();
  env.gain.setValueAtTime(gain, startAt);
  env.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);

  src.connect(filter);
  filter.connect(env);
  env.connect(master);
  src.start(startAt);
}

// 同一个音效的最小间隔(毫秒), 防止手势抖动导致连续爆音
const THROTTLE = {
  move: 70,
  rotate: 90,
};

const VOICES = {
  move: () => tone({ wave: 'triangle', from: 320, to: 420, dur: 0.06, gain: 0.16 }),
  rotate: () => tone({ wave: 'square', from: 520, to: 700, dur: 0.07, gain: 0.14 }),
  lock: () => tone({ wave: 'sine', from: 180, to: 120, dur: 0.09, gain: 0.2 }),
  clear: (level = 1) => {
    const base = 520 + Math.min(3, level - 1) * 90;
    tone({ wave: 'triangle', from: base, to: base * 1.9, dur: 0.14, gain: 0.26 });
    tone({ wave: 'sine', from: base * 1.5, to: base * 2.6, dur: 0.18, gain: 0.2, delay: 0.06 });
  },
  slice: (combo = 1) => {
    // 连击越高音越亮, 形成"想连下去"的正反馈
    const step = Math.min(9, Math.max(0, combo - 1));
    const base = 620 * Math.pow(1.06, step);
    tone({ wave: 'triangle', from: base, to: base * 1.7, dur: 0.09, gain: 0.22 });
  },
  bomb: () => {
    noise({ dur: 0.3, gain: 0.26, filterFrom: 1200, filterTo: 120 });
    tone({ wave: 'sawtooth', from: 160, to: 60, dur: 0.26, gain: 0.2 });
  },
  start: () => {
    tone({ wave: 'sine', from: 440, to: 660, dur: 0.14, gain: 0.22 });
    tone({ wave: 'sine', from: 660, to: 880, dur: 0.16, gain: 0.18, delay: 0.1 });
  },
  countdown: () => tone({ wave: 'square', from: 700, to: 700, dur: 0.05, gain: 0.12 }),
  gameover: () => {
    tone({ wave: 'triangle', from: 420, to: 300, dur: 0.2, gain: 0.24 });
    tone({ wave: 'triangle', from: 300, to: 180, dur: 0.34, gain: 0.22, delay: 0.16 });
  },
  record: () => {
    [523, 659, 784, 1046].forEach((freq, i) => {
      tone({ wave: 'triangle', from: freq, to: freq, dur: 0.16, gain: 0.2, delay: i * 0.09 });
    });
  },
  ui: () => tone({ wave: 'sine', from: 520, to: 620, dur: 0.05, gain: 0.12 }),
};

function play(name, arg) {
  if (!enabled) return;
  const voice = VOICES[name];
  if (!voice) return;

  const nowMs = performance.now();
  const gap = THROTTLE[name];
  if (gap && nowMs - (lastPlayedAt[name] || 0) < gap) return;
  lastPlayedAt[name] = nowMs;

  try {
    voice(arg);
  } catch (err) {
    // 音频失败不应该影响游戏
  }
}

function setEnabled(value) {
  enabled = Boolean(value);
  writeEnabled(enabled);
  if (enabled) {
    ensureContext();
    play('ui');
  }
}

function isEnabled() {
  return enabled;
}

// 音量总体压低一点, 避免深夜玩的时候太吵
function setVolume(value) {
  if (!master) return;
  master.gain.value = Math.max(0, Math.min(1, value));
}

function initSfx() {
  enabled = readEnabled();
  // 首次手势时创建/恢复 AudioContext(浏览器自动播放策略)
  const unlock = () => {
    ensureContext();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  return enabled;
}

export { initSfx, play, setEnabled, isEnabled, setVolume };
