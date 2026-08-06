import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { getLang, initLanguage, setLang, t, tf } from './i18n.js';

const GAME_MODES = {
  TETRIS: 'tetris',
  FRUIT: 'fruit',
  STAR: 'star',
  GUARD: 'guard',
};

const BOARD_COLS = 10;
const BOARD_ROWS = 20;
const VISIBLE_ROWS = 20;
const BLOCK_SIZE = 36;
const DROP_BASE = 950;

const LANDMARK_VISIBILITY = 0.28;
const GESTURE_LANDMARK_VISIBILITY = 0.18;
const DRAW_LANDMARK_VISIBILITY = 0.12;
const START_WRIST_MARGIN = 0.015;
const ACTION_WRIST_MARGIN = 0.04;
const HANDS_DOWN_MARGIN = 0.02;
const HANDS_DOWN_SHOULDER_OFFSET = 0.1;
const HANDS_DOWN_ELBOW_MARGIN = 0.015;
const SOFT_DROP_INTERVAL = 42;
const GESTURE_COOLDOWN = 420;
const START_POSE_HOLD = 550;
const POSE_MODEL_PATH = '/models/pose_landmarker_full.task';

const FRUIT_GRAVITY = 1660;
const FRUIT_SLASH_SPEED = 0.34;
const FRUIT_SLASH_DISTANCE = 12;
const FRUIT_SLASH_COOLDOWN = 45;
const FRUIT_PARTICLE_LIFE = 560;
const FRUIT_IMPACT_LIFE = 320;
const FRUIT_POPUP_LIFE = 720;
const FRUIT_FRAGMENT_LIFE = 780;
const FRUIT_ROUND_DURATION = 45_000;
const FRUIT_BOMB_PENALTY = 18;

const STAR_ROUND_DURATION = 40_000;
const STAR_HOLD_TIME = 220;
const GUARD_ROUND_DURATION = 45_000;
const GAME_ORDER_KEY = 'move-arcade-game-order';
const GAME_USAGE_KEY = 'move-arcade-game-usage';
const COMFORT_KEY = 'move-arcade-comfort';



const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
};

const PIECES = [
  { key: 'I', color: '#38bdf8' },
  { key: 'O', color: '#facc15' },
  { key: 'T', color: '#a855f7' },
  { key: 'S', color: '#4ade80' },
  { key: 'Z', color: '#fb7185' },
  { key: 'J', color: '#60a5fa' },
  { key: 'L', color: '#fb923c' },
];

const FRUIT_BOMB_ASSET = '/fruits/bomb.svg';

const FRUIT_TYPES = [
  { name: '西瓜', color: '#22c55e', asset: '/fruits/watermelon.svg' },
  { name: '橙子', color: '#fb923c', asset: '/fruits/orange.svg' },
  { name: '苹果', color: '#ef4444', asset: '/fruits/apple.svg' },
  { name: '菠萝', color: '#f59e0b', asset: '/fruits/pineapple.svg' },
  { name: '猕猴桃', color: '#84cc16', asset: '/fruits/kiwi.svg' },
];

const GAME_LIBRARY = [
  {
    id: GAME_MODES.TETRIS,
    titleKey: 'lib.tetris.title',
    badgeKey: 'lib.tetris.badge',
    descKey: 'lib.tetris.desc',
    taglineKey: 'lib.tetris.tagline',
    mode: GAME_MODES.TETRIS,
    priority: 90,
  },
  {
    id: GAME_MODES.FRUIT,
    titleKey: 'lib.fruit.title',
    badgeKey: 'lib.fruit.badge',
    descKey: 'lib.fruit.desc',
    taglineKey: 'lib.fruit.tagline',
    mode: GAME_MODES.FRUIT,
    priority: 100,
  },
  {
    id: GAME_MODES.STAR,
    titleKey: 'lib.star.title',
    badgeKey: 'lib.star.badge',
    descKey: 'lib.star.desc',
    taglineKey: 'lib.star.tagline',
    mode: GAME_MODES.STAR,
    priority: 80,
  },
  {
    id: GAME_MODES.GUARD,
    titleKey: 'lib.guard.title',
    badgeKey: 'lib.guard.badge',
    descKey: 'lib.guard.desc',
    taglineKey: 'lib.guard.tagline',
    mode: GAME_MODES.GUARD,
    priority: 92,
  },
  {
    id: 'rhythm',
    titleKey: 'lib.rhythm.title',
    badgeKey: 'lib.rhythm.badge',
    descKey: 'lib.rhythm.desc',
    taglineKey: 'lib.rhythm.tagline',
    priority: 70,
  },
  {
    id: 'wall',
    titleKey: 'lib.wall.title',
    badgeKey: 'lib.wall.badge',
    descKey: 'lib.wall.desc',
    taglineKey: 'lib.wall.tagline',
    priority: 65,
  },
  {
    id: 'boxing',
    titleKey: 'lib.boxing.title',
    badgeKey: 'lib.boxing.badge',
    descKey: 'lib.boxing.desc',
    taglineKey: 'lib.boxing.tagline',
    priority: 60,
  },
];

const GAME_META = {
  [GAME_MODES.TETRIS]: {
    nameKey: 'meta.tetris.name',
    subtitleKey: 'meta.tetris.subtitle',
    panelTitleKey: 'meta.tetris.panelTitle',
    difficultyKey: 'meta.tetris.difficulty',
    metricOneLabelKey: 'meta.tetris.metricOne',
    metricTwoLabelKey: 'meta.tetris.metricTwo',
    startTitleKey: 'meta.tetris.startTitle',
    startHintKey: 'meta.tetris.startHint',
    gestureKeys: [
      ['meta.tetris.g1l', 'meta.tetris.g1a'],
      ['meta.tetris.g2l', 'meta.tetris.g2a'],
      ['meta.tetris.g3l', 'meta.tetris.g3a'],
      ['meta.tetris.g4l', 'meta.tetris.g4a'],
    ],
  },
  [GAME_MODES.FRUIT]: {
    nameKey: 'meta.fruit.name',
    subtitleKey: 'meta.fruit.subtitle',
    panelTitleKey: 'meta.fruit.panelTitle',
    difficultyKey: 'meta.fruit.difficulty',
    metricOneLabelKey: 'meta.fruit.metricOne',
    metricTwoLabelKey: 'meta.fruit.metricTwo',
    startTitleKey: 'meta.fruit.startTitle',
    startHintKey: 'meta.fruit.startHint',
    gestureKeys: [
      ['meta.fruit.g1l', 'meta.fruit.g1a'],
      ['meta.fruit.g2l', 'meta.fruit.g2a'],
      ['meta.fruit.g3l', 'meta.fruit.g3a'],
      ['meta.fruit.g4l', 'meta.fruit.g4a'],
    ],
  },
  [GAME_MODES.STAR]: {
    nameKey: 'meta.star.name',
    subtitleKey: 'meta.star.subtitle',
    panelTitleKey: 'meta.star.panelTitle',
    difficultyKey: 'meta.star.difficulty',
    metricOneLabelKey: 'meta.star.metricOne',
    metricTwoLabelKey: 'meta.star.metricTwo',
    startTitleKey: 'meta.star.startTitle',
    startHintKey: 'meta.star.startHint',
    gestureKeys: [
      ['meta.star.g1l', 'meta.star.g1a'],
      ['meta.star.g2l', 'meta.star.g2a'],
      ['meta.star.g3l', 'meta.star.g3a'],
      ['meta.star.g4l', 'meta.star.g4a'],
    ],
  },
  [GAME_MODES.GUARD]: {
    nameKey: 'meta.guard.name',
    subtitleKey: 'meta.guard.subtitle',
    panelTitleKey: 'meta.guard.panelTitle',
    difficultyKey: 'meta.guard.difficulty',
    metricOneLabelKey: 'meta.guard.metricOne',
    metricTwoLabelKey: 'meta.guard.metricTwo',
    startTitleKey: 'meta.guard.startTitle',
    startHintKey: 'meta.guard.startHint',
    gestureKeys: [
      ['meta.guard.g1l', 'meta.guard.g1a'],
      ['meta.guard.g2l', 'meta.guard.g2a'],
      ['meta.guard.g3l', 'meta.guard.g3a'],
      ['meta.guard.g4l', 'meta.guard.g4a'],
    ],
  },
};

function getLocalizedMeta(mode) {
  const meta = GAME_META[mode];
  return {
    ...meta,
    name: t(meta.nameKey),
    subtitle: t(meta.subtitleKey),
    panelTitle: t(meta.panelTitleKey),
    difficulty: t(meta.difficultyKey),
    metricOneLabel: t(meta.metricOneLabelKey),
    metricTwoLabel: t(meta.metricTwoLabelKey),
    startTitle: t(meta.startTitleKey),
    startHint: t(meta.startHintKey),
    gestures: meta.gestureKeys.map(([labelKey, actionKey]) => [t(labelKey), t(actionKey)]),
  };
}

function getLocalizedLibrary() {
  return GAME_LIBRARY.map((item) => ({
    ...item,
    title: t(item.titleKey),
    badge: t(item.badgeKey),
    description: t(item.descKey),
    tagline: t(item.taglineKey),
  }));
}

const video = document.querySelector('#camera');
const poseCanvas = document.querySelector('#poseCanvas');
const poseCtx = poseCanvas.getContext('2d');
const gameCanvas = document.querySelector('#gameCanvas');
const gameCtx = gameCanvas.getContext('2d');
const cameraStatus = document.querySelector('#cameraStatus');
const gameStateBadge = document.querySelector('#gameStateBadge');
const gestureValue = document.querySelector('#gestureValue');
const scoreLabel = document.querySelector('#scoreLabel');
const scoreValue = document.querySelector('#scoreValue');
const metricOneLabel = document.querySelector('#metricOneLabel');
const metricOneValue = document.querySelector('#metricOneValue');
const metricTwoLabel = document.querySelector('#metricTwoLabel');
const metricTwoValue = document.querySelector('#metricTwoValue');
const restartBtn = document.querySelector('#restartBtn');
const overlay = document.querySelector('#gameOverlay');
const overlayTitle = document.querySelector('#overlayTitle');
const overlayHint = document.querySelector('#overlayHint');
const appSubtitle = document.querySelector('#appSubtitle');
const activeGameName = document.querySelector('#activeGameName');
const gamePanelTitle = document.querySelector('#gamePanelTitle');
const gameCatalog = document.querySelector('#gameCatalog');
const gestureLabels = [
  document.querySelector('#gestureLabel1'),
  document.querySelector('#gestureLabel2'),
  document.querySelector('#gestureLabel3'),
  document.querySelector('#gestureLabel4'),
];
const gestureActions = [
  document.querySelector('#gestureAction1'),
  document.querySelector('#gestureAction2'),
  document.querySelector('#gestureAction3'),
  document.querySelector('#gestureAction4'),
];
const difficultyLabel = document.querySelector('#difficultyLabel');
const langBtn = document.querySelector('#langBtn');

let lastCameraStatus = { key: null, params: null };
let startupFailure = null;
let overlayVisible = false;
let modelLoading = false;

function setCameraStatus(key, params) {
  lastCameraStatus = { key, params };
  cameraStatus.textContent = params ? tf(key, params) : t(key);
}

function updateLangButton() {
  if (!langBtn) return;
  langBtn.textContent = getLang() === 'zh' ? 'EN' : '中文';
}

let poseLandmarker;
let lastVideoTime = -1;
let latestLandmarks = null;
let startPoseSince = 0;
let currentGame = GAME_MODES.TETRIS;
let frameStartedAt = 0;
let targetId = 1;

const spriteCache = new Map();

function getSprite(src) {
  if (!src) return null;
  if (spriteCache.has(src)) {
    return spriteCache.get(src);
  }

  const image = new Image();
  image.decoding = 'async';
  image.src = src;
  spriteCache.set(src, image);
  return image;
}

async function preloadSprites() {
  const assets = [...new Set([...FRUIT_TYPES.map((fruit) => fruit.asset), FRUIT_BOMB_ASSET])];

  await Promise.all(
    assets.map(
      (src) => new Promise((resolve) => {
        const image = getSprite(src);
        if (!image) {
          resolve();
          return;
        }

        if (image.complete) {
          resolve();
          return;
        }

        const finalize = () => resolve();
        image.addEventListener('load', finalize, { once: true });
        image.addEventListener('error', finalize, { once: true });
      }),
    ),
  );
}

const lastTetrisGestureAt = {
  left: 0,
  right: 0,
  rotate: 0,
};

const tetrisState = createTetrisState();
const fruitState = createFruitState();
const handState = {
  left: createHandTrack(),
  right: createHandTrack(),
};

function createHandTrack() {
  return {
    current: null,
    previous: null,
    speed: 0,
    lastUpdated: 0,
    lastSlashAt: 0,
  };
}

function createTetrisState() {
  return {
    board: createBoard(),
    active: null,
    queue: [],
    score: 0,
    lines: 0,
    level: 1,
    dropInterval: DROP_BASE,
    lastDropAt: 0,
    running: false,
    gameOver: false,
    softDrop: false,
  };
}

function createFruitState() {
  return {
    targets: [],
    particles: [],
    slashes: [],
    fragments: [],
    impacts: [],
    popups: [],
    score: 0,
    sliced: 0,
    combo: 0,
    bestCombo: 0,
    nextSpawnAt: 0,
    lastTick: 0,
    lastSliceAt: 0,
    timeLeftMs: FRUIT_ROUND_DURATION,
    roundEndsAt: 0,
    running: false,
    gameOver: false,
  };
}


function createBoard() {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
}

function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

function rotateMatrix(matrix) {
  return matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse());
}

function randomPiece() {
  const def = PIECES[Math.floor(Math.random() * PIECES.length)];
  return {
    key: def.key,
    matrix: cloneMatrix(SHAPES[def.key]),
    color: def.color,
    x: Math.floor((BOARD_COLS - SHAPES[def.key][0].length) / 2),
    y: 0,
  };
}

function refillQueue() {
  while (tetrisState.queue.length < 4) {
    tetrisState.queue.push(randomPiece());
  }
}

function collides(matrix, offsetX, offsetY) {
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      if (!matrix[y][x]) continue;
      const boardX = offsetX + x;
      const boardY = offsetY + y;
      if (boardX < 0 || boardX >= BOARD_COLS || boardY >= BOARD_ROWS) {
        return true;
      }
      if (boardY >= 0 && tetrisState.board[boardY][boardX]) {
        return true;
      }
    }
  }
  return false;
}

function spawnPiece() {
  refillQueue();
  tetrisState.active = tetrisState.queue.shift();
  tetrisState.active.x = Math.floor((BOARD_COLS - tetrisState.active.matrix[0].length) / 2);
  tetrisState.active.y = 0;

  if (collides(tetrisState.active.matrix, tetrisState.active.x, tetrisState.active.y)) {
    tetrisState.running = false;
    tetrisState.gameOver = true;
    updateGameOverlay(true, t('overlay.gameOver'), t('overlay.restartHintFruit'));
    gameStateBadge.textContent = t('game.state.over');
  }
}

function mergeActivePiece() {
  if (!tetrisState.active) return;
  tetrisState.active.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (!value) return;
      const boardY = tetrisState.active.y + y;
      if (boardY >= 0) {
        tetrisState.board[boardY][tetrisState.active.x + x] = tetrisState.active.color;
      }
    });
  });
}

function clearLines() {
  let cleared = 0;
  for (let y = BOARD_ROWS - 1; y >= 0; y -= 1) {
    if (tetrisState.board[y].every(Boolean)) {
      tetrisState.board.splice(y, 1);
      tetrisState.board.unshift(Array(BOARD_COLS).fill(null));
      cleared += 1;
      y += 1;
    }
  }

  if (!cleared) return;

  const scoreMap = [0, 100, 300, 500, 800];
  tetrisState.lines += cleared;
  tetrisState.score += scoreMap[cleared] * tetrisState.level;
  tetrisState.level = Math.floor(tetrisState.lines / 8) + 1;
  tetrisState.dropInterval = Math.max(220, DROP_BASE - (tetrisState.level - 1) * 85);
  updateHud();
}

function lockPiece() {
  mergeActivePiece();
  clearLines();
  spawnPiece();
}

function tryMove(deltaX) {
  if (!tetrisState.running || !tetrisState.active || currentGame !== GAME_MODES.TETRIS) return false;
  const nextX = tetrisState.active.x + deltaX;
  if (!collides(tetrisState.active.matrix, nextX, tetrisState.active.y)) {
    tetrisState.active.x = nextX;
    return true;
  }
  return false;
}

function tryRotate() {
  if (!tetrisState.running || !tetrisState.active || currentGame !== GAME_MODES.TETRIS) return false;
  const rotated = rotateMatrix(tetrisState.active.matrix);
  const offsets = [0, -1, 1, -2, 2];
  for (const offset of offsets) {
    if (!collides(rotated, tetrisState.active.x + offset, tetrisState.active.y)) {
      tetrisState.active.matrix = rotated;
      tetrisState.active.x += offset;
      return true;
    }
  }
  return false;
}

function stepDown() {
  if (!tetrisState.running || !tetrisState.active || currentGame !== GAME_MODES.TETRIS) return false;
  const nextY = tetrisState.active.y + 1;
  if (!collides(tetrisState.active.matrix, tetrisState.active.x, nextY)) {
    tetrisState.active.y = nextY;
    return true;
  }
  lockPiece();
  return false;
}

function resetTetrisGame() {
  tetrisState.board = createBoard();
  tetrisState.queue = [];
  tetrisState.score = 0;
  tetrisState.lines = 0;
  tetrisState.level = 1;
  tetrisState.dropInterval = DROP_BASE;
  tetrisState.lastDropAt = performance.now();
  tetrisState.running = false;
  tetrisState.gameOver = false;
  tetrisState.softDrop = false;
  refillQueue();
  spawnPiece();
  updateHud();
  const tetrisMeta = getLocalizedMeta(GAME_MODES.TETRIS);
  updateGameOverlay(true, tetrisMeta.startTitle, tetrisMeta.startHint);
  gameStateBadge.textContent = t('game.state.ready');
  gestureValue.textContent = t('stats.waiting');
}

function startTetrisGame() {
  if (tetrisState.running || currentGame !== GAME_MODES.TETRIS) return;
  if (tetrisState.gameOver) {
    resetTetrisGame();
  }
  tetrisState.running = true;
  tetrisState.gameOver = false;
  tetrisState.lastDropAt = performance.now();
  updateGameOverlay(false);
  gameStateBadge.textContent = t('game.state.playing');
}

function updateTetris(timestamp) {
  if (!tetrisState.running || tetrisState.gameOver || currentGame !== GAME_MODES.TETRIS) return;
  const effectiveInterval = tetrisState.softDrop
    ? Math.min(SOFT_DROP_INTERVAL, Math.max(32, tetrisState.dropInterval * 0.08))
    : tetrisState.dropInterval;

  if (timestamp - tetrisState.lastDropAt >= effectiveInterval) {
    stepDown();
    tetrisState.lastDropAt = timestamp;
  }
}

function drawRoundedCell(x, y, color) {
  const gap = 2;
  const size = BLOCK_SIZE - gap * 2;
  const radius = 8;

  gameCtx.fillStyle = color;
  gameCtx.beginPath();
  gameCtx.moveTo(x + gap + radius, y + gap);
  gameCtx.arcTo(x + gap + size, y + gap, x + gap + size, y + gap + size, radius);
  gameCtx.arcTo(x + gap + size, y + gap + size, x + gap, y + gap + size, radius);
  gameCtx.arcTo(x + gap, y + gap + size, x + gap, y + gap, radius);
  gameCtx.arcTo(x + gap, y + gap, x + gap + size, y + gap, radius);
  gameCtx.closePath();
  gameCtx.fill();

  gameCtx.fillStyle = 'rgba(255,255,255,0.14)';
  gameCtx.fillRect(x + gap + 5, y + gap + 5, size - 10, 5);
}

function drawTetris() {
  gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
  gameCtx.fillStyle = '#090d18';
  gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

  for (let y = 0; y < VISIBLE_ROWS; y += 1) {
    for (let x = 0; x < BOARD_COLS; x += 1) {
      gameCtx.strokeStyle = 'rgba(110, 231, 255, 0.08)';
      gameCtx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      const cell = tetrisState.board[y][x];
      if (cell) {
        drawRoundedCell(x * BLOCK_SIZE, y * BLOCK_SIZE, cell);
      }
    }
  }

  if (tetrisState.active) {
    tetrisState.active.matrix.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        if (!value) return;
        drawRoundedCell((tetrisState.active.x + colIndex) * BLOCK_SIZE, (tetrisState.active.y + rowIndex) * BLOCK_SIZE, tetrisState.active.color);
      });
    });
  }
}

function resetFruitGame() {
  fruitState.targets = [];
  fruitState.particles = [];
  fruitState.slashes = [];
  fruitState.fragments = [];
  fruitState.impacts = [];
  fruitState.popups = [];
  fruitState.score = 0;
  fruitState.sliced = 0;
  fruitState.combo = 0;
  fruitState.bestCombo = 0;
  fruitState.lastSliceAt = 0;
  fruitState.timeLeftMs = FRUIT_ROUND_DURATION;
  fruitState.roundEndsAt = 0;
  fruitState.nextSpawnAt = performance.now() + 480;
  fruitState.lastTick = performance.now();
  fruitState.running = false;
  fruitState.gameOver = false;
  updateHud();
  const fruitMeta = getLocalizedMeta(GAME_MODES.FRUIT);
  updateGameOverlay(true, fruitMeta.startTitle, fruitMeta.startHint);
  gameStateBadge.textContent = t('game.state.ready');
  gestureValue.textContent = t('stats.waiting');
}

function startFruitGame() {
  if (fruitState.running || currentGame !== GAME_MODES.FRUIT) return;
  if (fruitState.gameOver) {
    resetFruitGame();
  }
  const now = performance.now();
  fruitState.running = true;
  fruitState.gameOver = false;
  fruitState.lastTick = now;
  fruitState.lastSliceAt = 0;
  fruitState.timeLeftMs = FRUIT_ROUND_DURATION;
  fruitState.roundEndsAt = now + FRUIT_ROUND_DURATION;
  fruitState.nextSpawnAt = now + 420;
  fruitState.targets = [];
  fruitState.particles = [];
  fruitState.slashes = [];
  fruitState.fragments = [];
  fruitState.impacts = [];
  fruitState.popups = [];
  updateHud();
  updateGameOverlay(false);
  gameStateBadge.textContent = t('game.state.timer');
}


function endFruitGame(title, hint) {
  fruitState.running = false;
  fruitState.gameOver = true;
  fruitState.combo = 0;
  updateHud();
  updateGameOverlay(true, title, `${hint} ${t('overlay.restartBackHint')}`);
  gameStateBadge.textContent = t('game.state.over');
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rgbaFromRgb(rgb, alpha) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function createFruitTarget(kind = 'fruit') {
  const width = gameCanvas.width;
  const height = gameCanvas.height;
  if (kind === 'bomb') {
    return {
      id: targetId += 1,
      kind,
      asset: FRUIT_BOMB_ASSET,
      color: '#94a3b8',
      x: randomBetween(96, width - 96),
      y: height + 84,
      vx: randomBetween(-180, 180),
      vy: randomBetween(-1600, -1340),
      radius: randomBetween(30, 38),
      rotation: randomBetween(-0.5, 0.5),
      spin: randomBetween(-2.6, 2.6),
      aura: randomBetween(1.5, 1.75),
      wobbleOffset: randomBetween(0, Math.PI * 2),
    };
  }

  const fruit = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
  return {
    id: targetId += 1,
    kind,
    name: fruit.name,
    asset: fruit.asset,
    color: fruit.color,
    x: randomBetween(86, width - 86),
    y: height + 78,
    vx: randomBetween(-220, 220),
    vy: randomBetween(-1580, -1260),
    radius: randomBetween(30, 44),
    rotation: randomBetween(-0.5, 0.5),
    spin: randomBetween(-3.3, 3.3),
    aura: randomBetween(1.65, 1.95),
    wobbleOffset: randomBetween(0, Math.PI * 2),
  };
}

function createFruitFragments(target, from, to) {
  if (target.kind !== 'fruit') return;

  const slashDx = to.x - from.x;
  const slashDy = to.y - from.y;
  const slashLength = Math.max(1, Math.hypot(slashDx, slashDy));
  const tangentX = slashDx / slashLength;
  const tangentY = slashDy / slashLength;
  const normalX = -tangentY;
  const normalY = tangentX;
  const sliceAngle = Math.atan2(slashDy, slashDx);

  [-1, 1].forEach((side) => {
    fruitState.fragments.push({
      kind: target.kind,
      asset: target.asset,
      color: target.color,
      x: target.x + normalX * side * target.radius * 0.18,
      y: target.y + normalY * side * target.radius * 0.18,
      vx: target.vx + normalX * side * randomBetween(150, 240) + tangentX * randomBetween(-36, 36),
      vy: target.vy + normalY * side * randomBetween(80, 180) - randomBetween(20, 120),
      radius: target.radius,
      rotation: target.rotation,
      spin: target.spin + side * randomBetween(1.9, 3.6),
      wobbleOffset: target.wobbleOffset + side * 0.75,
      aura: Math.max(1.18, (target.aura ?? 1.7) - 0.28),
      side,
      sliceAngle,
      life: FRUIT_FRAGMENT_LIFE,
      maxLife: FRUIT_FRAGMENT_LIFE,
    });
  });
}

function getExtendedSlashSegment(start, end, speed) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const nx = dx / length;
  const ny = dy / length;
  const lead = Math.min(104, 18 + length * 0.92 + speed * 42);
  const tail = Math.min(20, 6 + length * 0.18);

  return {
    from: {
      x: clamp(start.x - nx * tail, -36, gameCanvas.width + 36),
      y: clamp(start.y - ny * tail, -36, gameCanvas.height + 36),
    },
    to: {
      x: clamp(end.x + nx * lead, -36, gameCanvas.width + 36),
      y: clamp(end.y + ny * lead, -36, gameCanvas.height + 36),
    },
    travel: length + lead + tail,
  };
}

function scheduleNextFruitWave(now) {
  const cadence = Math.max(320, 760 - fruitState.score * 2.2);
  fruitState.nextSpawnAt = now + randomBetween(cadence * 0.72, cadence * 1.08);
}

function spawnFruitWave(now) {
  const extra = fruitState.score > 100 ? 1 : 0;
  const count = 1 + Math.floor(Math.random() * (2 + extra));
  const shouldSpawnBomb = fruitState.score > 20 && Math.random() < 0.18;

  for (let index = 0; index < count; index += 1) {
    const isBomb = shouldSpawnBomb && index === count - 1;
    fruitState.targets.push(createFruitTarget(isBomb ? 'bomb' : 'fruit'));
  }

  scheduleNextFruitWave(now);
}

function spawnImpactWave(x, y, color, text = '', isCombo = false) {
  fruitState.impacts.push({
    x,
    y,
    color,
    maxRadius: randomBetween(72, 128),
    life: FRUIT_IMPACT_LIFE,
    maxLife: FRUIT_IMPACT_LIFE,
  });

  if (text) {
    fruitState.popups.push({
      x,
      y: y - 18,
      text,
      color,
      isCombo,
      vx: randomBetween(-14, 14),
      vy: randomBetween(-138, -112),
      life: FRUIT_POPUP_LIFE,
      maxLife: FRUIT_POPUP_LIFE,
    });
  }
}

function spawnJuiceBurst(x, y, color, size = 12, intensity = 1) {
  const amount = Math.floor(randomBetween(size * 1.1, size * 1.7) * intensity);
  for (let index = 0; index < amount; index += 1) {
    const life = FRUIT_PARTICLE_LIFE * randomBetween(0.72, 1.08);
    const spraySpeed = randomBetween(160, 520) * intensity;
    const angle = randomBetween(-Math.PI * 0.96, Math.PI * 0.12);
    fruitState.particles.push({
      type: 'droplet',
      x,
      y,
      vx: Math.cos(angle) * spraySpeed,
      vy: Math.sin(angle) * spraySpeed - randomBetween(30, 180),
      radius: randomBetween(2.8, 7.4),
      color,
      life,
      maxLife: life,
    });
  }

  const sparkCount = Math.max(8, Math.floor(size * 0.42 * intensity));
  for (let index = 0; index < sparkCount; index += 1) {
    const life = FRUIT_PARTICLE_LIFE * randomBetween(0.4, 0.72);
    const speed = randomBetween(120, 420) * intensity;
    const angle = randomBetween(0, Math.PI * 2);
    fruitState.particles.push({
      type: 'spark',
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: randomBetween(1.2, 2.1),
      length: randomBetween(14, 28),
      rotation: angle,
      spin: randomBetween(-12, 12),
      color,
      life,
      maxLife: life,
    });
  }
}

function segmentDistanceToPoint(start, end, point) {

  const lineX = end.x - start.x;
  const lineY = end.y - start.y;
  const lineLengthSquared = lineX * lineX + lineY * lineY;
  if (!lineLengthSquared) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const projection = ((point.x - start.x) * lineX + (point.y - start.y) * lineY) / lineLengthSquared;
  const t = clamp(projection, 0, 1);
  const closestX = start.x + lineX * t;
  const closestY = start.y + lineY * t;
  return Math.hypot(point.x - closestX, point.y - closestY);
}

function sliceFruitTarget(target, now) {
  if (now - fruitState.lastSliceAt > 900) {
    fruitState.combo = 0;
  }
  fruitState.lastSliceAt = now;
  fruitState.combo += 1;
  fruitState.bestCombo = Math.max(fruitState.bestCombo, fruitState.combo);
  const bonus = 12 + Math.min(24, (fruitState.combo - 1) * 3);
  fruitState.score += bonus;
  fruitState.sliced += 1;
  const isCombo = fruitState.combo >= 2;
  const popupText = isCombo ? `+${bonus} · ${fruitState.combo} ${t('fruit.combo')}` : `+${bonus}`;
  spawnJuiceBurst(target.x, target.y, target.color, Math.max(18, target.radius * 0.78), 1.18);
  spawnImpactWave(target.x, target.y, target.color, popupText, isCombo);
  updateHud();
}

function triggerFruitSlash(from, to, handKey, now) {
  const handRgb = handKey === 'left' ? [110, 231, 255] : [248, 113, 113];
  const trailLife = 180;
  fruitState.slashes.push({
    from: { ...from },
    to: { ...to },
    rgb: handRgb,
    width: handKey === 'left' ? 16 : 18,
    coreWidth: handKey === 'left' ? 6 : 7,
    life: trailLife,
    maxLife: trailLife,
  });

  for (const target of [...fruitState.targets]) {
    const distance = segmentDistanceToPoint(from, to, target);
    if (distance > target.radius + 16) continue;

    if (target.kind === 'bomb') {
      const previousScore = fruitState.score;
      fruitState.score = Math.max(0, fruitState.score - FRUIT_BOMB_PENALTY);
      const deducted = previousScore - fruitState.score;
      fruitState.combo = 0;
      spawnJuiceBurst(target.x, target.y, '#fbbf24', 30, 1.45);
      spawnImpactWave(target.x, target.y, '#fbbf24', deducted > 0 ? `BOOM -${deducted}` : 'BOOM');
      fruitState.targets = fruitState.targets.filter((item) => item.id !== target.id);
      updateHud();
      return;
    }

    sliceFruitTarget(target, now);
    fruitState.targets = fruitState.targets.filter((item) => item.id !== target.id);
  }
}


function updateTrackedHand(track, point, now) {
  if (!point) {
    track.previous = track.current;
    track.current = null;
    track.speed = 0;
    track.lastUpdated = now;
    return;
  }

  const previous = track.current;
  track.previous = previous;
  track.current = point;

  if (previous && track.lastUpdated) {
    const dt = Math.max(16, now - track.lastUpdated);
    const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
    track.speed = distance / dt;
  } else {
    track.speed = 0;
  }

  track.lastUpdated = now;
}

function resetHandTracking() {
  handState.left = createHandTrack();
  handState.right = createHandTrack();
}

function registerHandSlash(handKey, now) {
  if (currentGame !== GAME_MODES.FRUIT || !fruitState.running || fruitState.gameOver) return;
  const track = handState[handKey];
  if (!track.previous || !track.current) return;
  const distance = Math.hypot(track.current.x - track.previous.x, track.current.y - track.previous.y);
  if (track.speed < FRUIT_SLASH_SPEED || distance < FRUIT_SLASH_DISTANCE) return;
  if (now - track.lastSlashAt < FRUIT_SLASH_COOLDOWN) return;

  const slashSegment = getExtendedSlashSegment(track.previous, track.current, track.speed);
  triggerFruitSlash(slashSegment.from, slashSegment.to, handKey, now);
  track.lastSlashAt = now;
}


function updateFruitGame(timestamp) {
  if (!fruitState.running || fruitState.gameOver || currentGame !== GAME_MODES.FRUIT) return;
  const previousTimeLeftMs = fruitState.timeLeftMs;
  const dt = Math.min(34, Math.max(16, timestamp - fruitState.lastTick)) / 1000;
  fruitState.lastTick = timestamp;
  fruitState.timeLeftMs = Math.max(0, fruitState.roundEndsAt - timestamp);

  if (fruitState.timeLeftMs <= 0) {
    fruitState.timeLeftMs = 0;
    endFruitGame(
      t('overlay.timeUp'),
      tf('fruit.result', {
        score: fruitState.score,
        sliced: fruitState.sliced,
        combo: fruitState.bestCombo,
      }),
    );
    return;
  }

  if (Math.ceil(previousTimeLeftMs / 1000) !== Math.ceil(fruitState.timeLeftMs / 1000)) {
    updateHud();
  }

  if (timestamp >= fruitState.nextSpawnAt) {
    spawnFruitWave(timestamp);
  }

  fruitState.targets = fruitState.targets.filter((target) => {
    target.x += target.vx * dt;
    target.y += target.vy * dt;
    target.vy += FRUIT_GRAVITY * dt;
    target.rotation += target.spin * dt;

    if (target.y - target.radius > gameCanvas.height + 70) {
      if (target.kind === 'fruit') {
        fruitState.combo = 0;
      }
      return false;
    }

    return target.x > -90 && target.x < gameCanvas.width + 90;
  });

  fruitState.slashes = fruitState.slashes
    .map((slash) => ({ ...slash, life: slash.life - dt * 1000 }))
    .filter((slash) => slash.life > 0);

  fruitState.fragments = (fruitState.fragments ?? [])
    .map((fragment) => ({
      ...fragment,
      x: fragment.x + fragment.vx * dt,
      y: fragment.y + fragment.vy * dt,
      vx: fragment.vx * 0.992,
      vy: fragment.vy + FRUIT_GRAVITY * 0.44 * dt,
      rotation: fragment.rotation + fragment.spin * dt,
      life: fragment.life - dt * 1000,
    }))
    .filter(
      (fragment) => fragment.life > 0
        && fragment.y - fragment.radius < gameCanvas.height + 120
        && fragment.x > -140
        && fragment.x < gameCanvas.width + 140,
    );

  fruitState.impacts = fruitState.impacts
    .map((impact) => ({ ...impact, life: impact.life - dt * 1000 }))
    .filter((impact) => impact.life > 0);


  fruitState.popups = fruitState.popups
    .map((popup) => ({
      ...popup,
      x: popup.x + popup.vx * dt,
      y: popup.y + popup.vy * dt,
      vy: popup.vy + 120 * dt,
      life: popup.life - dt * 1000,
    }))
    .filter((popup) => popup.life > 0);

  fruitState.particles = fruitState.particles
    .map((particle) => ({
      ...particle,
      x: particle.x + particle.vx * dt,
      y: particle.y + particle.vy * dt,
      vx: particle.vx * (particle.type === 'spark' ? 0.985 : 0.996),
      vy: particle.vy + FRUIT_GRAVITY * (particle.type === 'spark' ? 0.12 : 0.32) * dt,
      rotation: (particle.rotation ?? 0) + (particle.spin ?? 0) * dt,
      life: particle.life - dt * 1000,
    }))
    .filter((particle) => particle.life > 0);
}


function drawFruitBackground() {
  const gradient = gameCtx.createLinearGradient(0, 0, 0, gameCanvas.height);
  gradient.addColorStop(0, '#081224');
  gradient.addColorStop(0.46, '#0b1630');
  gradient.addColorStop(1, '#06101d');
  gameCtx.fillStyle = gradient;
  gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

  const leftGlow = gameCtx.createRadialGradient(gameCanvas.width * 0.18, gameCanvas.height * 0.2, 20, gameCanvas.width * 0.18, gameCanvas.height * 0.2, gameCanvas.width * 0.52);
  leftGlow.addColorStop(0, 'rgba(34, 197, 94, 0.22)');
  leftGlow.addColorStop(1, 'rgba(34, 197, 94, 0)');
  gameCtx.fillStyle = leftGlow;
  gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

  const rightGlow = gameCtx.createRadialGradient(gameCanvas.width * 0.78, gameCanvas.height * 0.16, 24, gameCanvas.width * 0.78, gameCanvas.height * 0.16, gameCanvas.width * 0.5);
  rightGlow.addColorStop(0, 'rgba(251, 146, 60, 0.2)');
  rightGlow.addColorStop(1, 'rgba(251, 146, 60, 0)');
  gameCtx.fillStyle = rightGlow;
  gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

  gameCtx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
  for (let row = 1; row < 8; row += 1) {
    const y = (gameCanvas.height / 8) * row;
    gameCtx.beginPath();
    gameCtx.moveTo(0, y);
    gameCtx.lineTo(gameCanvas.width, y);
    gameCtx.stroke();
  }

  const vignette = gameCtx.createRadialGradient(gameCanvas.width / 2, gameCanvas.height * 0.45, gameCanvas.width * 0.12, gameCanvas.width / 2, gameCanvas.height * 0.45, gameCanvas.width * 0.92);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(2, 6, 14, 0.4)');
  gameCtx.fillStyle = vignette;
  gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
}

function drawFruitTarget(target) {
  const riseBoost = clamp((-target.vy - 320) / 1350, 0, 1);
  const pulse = 1 + Math.sin(frameStartedAt * 0.008 + target.wobbleOffset) * 0.045;
  const auraRadius = target.radius * (target.aura ?? 1.75) * (1 + riseBoost * 0.18);
  const sprite = getSprite(target.asset);
  const spriteSize = target.radius * (target.kind === 'bomb' ? 2.5 : 2.7);

  gameCtx.save();
  gameCtx.translate(target.x, target.y);
  gameCtx.rotate(target.rotation);
  gameCtx.scale(pulse, pulse);
  gameCtx.shadowColor = target.kind === 'bomb' ? 'rgba(251, 191, 36, 0.55)' : `${target.color}88`;
  gameCtx.shadowBlur = 28;

  const glow = gameCtx.createRadialGradient(0, 0, target.radius * 0.16, 0, 0, auraRadius);
  glow.addColorStop(0, `${target.color}88`);
  glow.addColorStop(0.58, `${target.color}28`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  gameCtx.fillStyle = glow;
  gameCtx.beginPath();
  gameCtx.arc(0, 0, auraRadius, 0, Math.PI * 2);
  gameCtx.fill();

  gameCtx.shadowBlur = 0;
  gameCtx.fillStyle = target.kind === 'bomb' ? 'rgba(255, 236, 179, 0.12)' : 'rgba(255,255,255,0.08)';
  gameCtx.beginPath();
  gameCtx.arc(0, 0, target.radius * 1.02, 0, Math.PI * 2);
  gameCtx.fill();

  if (sprite?.complete && sprite.naturalWidth) {
    gameCtx.drawImage(sprite, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
  } else {
    gameCtx.fillStyle = target.color;
    gameCtx.beginPath();
    gameCtx.arc(0, 0, target.radius, 0, Math.PI * 2);
    gameCtx.fill();
  }

  gameCtx.restore();
}

function drawFruitFragment(fragment) {
  const alpha = fragment.life / fragment.maxLife;
  const pulse = 1 + Math.sin(frameStartedAt * 0.008 + fragment.wobbleOffset) * 0.035;
  const auraRadius = fragment.radius * (fragment.aura ?? 1.42);
  const sprite = getSprite(fragment.asset);
  const spriteSize = fragment.radius * 2.7;

  gameCtx.save();
  gameCtx.globalAlpha = alpha;
  gameCtx.translate(fragment.x, fragment.y);
  gameCtx.rotate(fragment.rotation);
  gameCtx.scale(pulse, pulse);

  const glow = gameCtx.createRadialGradient(0, 0, fragment.radius * 0.16, 0, 0, auraRadius);
  glow.addColorStop(0, `${fragment.color}66`);
  glow.addColorStop(0.7, `${fragment.color}18`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  gameCtx.fillStyle = glow;
  gameCtx.beginPath();
  gameCtx.arc(0, 0, auraRadius, 0, Math.PI * 2);
  gameCtx.fill();

  gameCtx.rotate(fragment.sliceAngle);
  gameCtx.beginPath();
  gameCtx.rect(fragment.side < 0 ? -spriteSize * 0.55 : 0, -spriteSize * 0.55, spriteSize * 0.55, spriteSize * 1.1);
  gameCtx.clip();
  gameCtx.rotate(-fragment.sliceAngle);

  if (sprite?.complete && sprite.naturalWidth) {
    gameCtx.drawImage(sprite, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
  } else {
    gameCtx.fillStyle = fragment.color;
    gameCtx.beginPath();
    gameCtx.arc(0, 0, fragment.radius, 0, Math.PI * 2);
    gameCtx.fill();
  }

  gameCtx.restore();
}

function drawSlashTrail(slash) {
  const alpha = slash.life / slash.maxLife;
  const gradient = gameCtx.createLinearGradient(slash.from.x, slash.from.y, slash.to.x, slash.to.y);
  gradient.addColorStop(0, rgbaFromRgb(slash.rgb, 0));
  gradient.addColorStop(0.2, rgbaFromRgb(slash.rgb, alpha * 0.6));
  gradient.addColorStop(0.5, rgbaFromRgb(slash.rgb, alpha));
  gradient.addColorStop(0.8, rgbaFromRgb(slash.rgb, alpha * 0.6));
  gradient.addColorStop(1, rgbaFromRgb(slash.rgb, 0));

  gameCtx.save();
  gameCtx.lineCap = 'round';
  gameCtx.shadowColor = rgbaFromRgb(slash.rgb, 0.95);
  gameCtx.shadowBlur = 26;
  gameCtx.strokeStyle = gradient;
  gameCtx.lineWidth = slash.width * (0.86 + alpha * 0.35);
  gameCtx.beginPath();
  gameCtx.moveTo(slash.from.x, slash.from.y);
  gameCtx.lineTo(slash.to.x, slash.to.y);
  gameCtx.stroke();

  gameCtx.globalCompositeOperation = 'lighter';
  gameCtx.shadowBlur = 12;
  gameCtx.strokeStyle = `rgba(255,255,255,${(alpha * 0.92).toFixed(3)})`;
  gameCtx.lineWidth = slash.coreWidth;
  gameCtx.beginPath();
  gameCtx.moveTo(slash.from.x, slash.from.y);
  gameCtx.lineTo(slash.to.x, slash.to.y);
  gameCtx.stroke();
  gameCtx.restore();
}

function drawImpactWave(impact) {
  const alpha = impact.life / impact.maxLife;
  const progress = 1 - alpha;
  const radius = 24 + impact.maxRadius * progress;

  gameCtx.save();
  gameCtx.globalCompositeOperation = 'lighter';
  gameCtx.globalAlpha = alpha * 0.72;
  gameCtx.strokeStyle = impact.color;
  gameCtx.lineWidth = 16 * alpha + 2;
  gameCtx.shadowColor = impact.color;
  gameCtx.shadowBlur = 24;
  gameCtx.beginPath();
  gameCtx.arc(impact.x, impact.y, radius, 0, Math.PI * 2);
  gameCtx.stroke();

  gameCtx.globalAlpha = alpha * 0.22;
  gameCtx.fillStyle = impact.color;
  gameCtx.beginPath();
  gameCtx.arc(impact.x, impact.y, radius * 0.55, 0, Math.PI * 2);
  gameCtx.fill();
  gameCtx.restore();
}

function drawParticle(particle) {
  const alpha = particle.life / particle.maxLife;
  gameCtx.save();
  gameCtx.globalAlpha = alpha;

  if (particle.type === 'spark') {
    gameCtx.translate(particle.x, particle.y);
    gameCtx.rotate(particle.rotation ?? 0);
    gameCtx.strokeStyle = particle.color;
    gameCtx.lineWidth = particle.radius;
    gameCtx.lineCap = 'round';
    gameCtx.shadowColor = particle.color;
    gameCtx.shadowBlur = 12;
    gameCtx.beginPath();
    gameCtx.moveTo(-particle.length * 0.5, 0);
    gameCtx.lineTo(particle.length * 0.5, 0);
    gameCtx.stroke();
    gameCtx.restore();
    return;
  }

  gameCtx.fillStyle = particle.color;
  gameCtx.shadowColor = particle.color;
  gameCtx.shadowBlur = 14;
  gameCtx.beginPath();
  gameCtx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
  gameCtx.fill();
  gameCtx.restore();
}

function drawFruitPopup(popup) {
  const alpha = popup.life / popup.maxLife;
  gameCtx.save();
  gameCtx.globalAlpha = alpha;
  gameCtx.textAlign = 'center';
  gameCtx.textBaseline = 'middle';
  gameCtx.font = popup.isCombo ? '900 22px Inter' : '800 20px Inter';
  gameCtx.lineWidth = 5;
  gameCtx.strokeStyle = popup.color;
  gameCtx.fillStyle = 'rgba(255,255,255,0.98)';
  gameCtx.shadowColor = popup.color;
  gameCtx.shadowBlur = 16;
  gameCtx.strokeText(popup.text, popup.x, popup.y);
  gameCtx.fillText(popup.text, popup.x, popup.y);
  gameCtx.restore();
}

function drawHandCursor(track, color) {
  if (!track.current) return;
  gameCtx.save();
  gameCtx.strokeStyle = color;
  gameCtx.fillStyle = `${color}22`;
  gameCtx.lineWidth = 3;
  gameCtx.beginPath();
  gameCtx.arc(track.current.x, track.current.y, 18, 0, Math.PI * 2);
  gameCtx.fill();
  gameCtx.stroke();
  gameCtx.restore();
}

function drawFruitHud() {
  if (!fruitState.running || fruitState.gameOver) return;

  gameCtx.save();
  gameCtx.textAlign = 'right';
  gameCtx.shadowColor = 'rgba(99, 102, 241, 0.35)';
  gameCtx.shadowBlur = 16;
  gameCtx.fillStyle = 'rgba(8, 15, 32, 0.68)';
  gameCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  gameCtx.lineWidth = 1.5;
  gameCtx.beginPath();
  gameCtx.roundRect(gameCanvas.width - 122, 18, 96, 36, 18);
  gameCtx.fill();
  gameCtx.stroke();
  gameCtx.fillStyle = fruitState.timeLeftMs <= 10_000 ? '#fca5a5' : '#f8fafc';
  gameCtx.font = '800 20px Inter';
  gameCtx.fillText(`${Math.ceil(fruitState.timeLeftMs / 1000)}${t('fruit.countdownSuffix')}`, gameCanvas.width - 42, 43);
  gameCtx.restore();

  if (fruitState.combo < 2) return;
  const comboGradient = gameCtx.createLinearGradient(gameCanvas.width / 2 - 80, 0, gameCanvas.width / 2 + 80, 0);
  comboGradient.addColorStop(0, '#6ee7ff');
  comboGradient.addColorStop(1, '#f9a8d4');
  gameCtx.save();
  gameCtx.textAlign = 'center';
  gameCtx.shadowColor = 'rgba(110, 231, 255, 0.45)';
  gameCtx.shadowBlur = 18;
  gameCtx.fillStyle = comboGradient;
  gameCtx.font = '900 28px Inter';
  gameCtx.fillText(`${fruitState.combo} ${t('fruit.combo')}`, gameCanvas.width / 2, 56);
  gameCtx.restore();
}

function drawFruitGame() {
  gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
  drawFruitBackground();
  fruitState.impacts.forEach(drawImpactWave);
  fruitState.particles.forEach(drawParticle);
  fruitState.targets.forEach(drawFruitTarget);
  fruitState.fragments.forEach(drawFruitFragment);
  fruitState.slashes.forEach(drawSlashTrail);
  fruitState.popups.forEach(drawFruitPopup);
  drawHandCursor(handState.left, 'rgba(110, 231, 255, 0.88)');
  drawHandCursor(handState.right, 'rgba(248, 113, 113, 0.88)');
  drawFruitHud();
}


function getCurrentMeta() {
  return getLocalizedMeta(currentGame);
}

function getCurrentGameState() {
  return currentGame === GAME_MODES.TETRIS ? tetrisState : fruitState;
}

function isCurrentGameRunning() {
  return getCurrentGameState().running;
}

function isCurrentGameOver() {
  return getCurrentGameState().gameOver;
}

function updateGameOverlay(show, title = overlayTitle.textContent, hint = overlayHint.textContent) {
  overlayVisible = show;
  overlay.classList.toggle('hidden', !show);
  overlayTitle.textContent = title;
  overlayHint.textContent = hint;
}

function updateHud() {
  const meta = getCurrentMeta();
  scoreLabel.textContent = t('stats.score');
  metricOneLabel.textContent = meta.metricOneLabel;
  metricTwoLabel.textContent = meta.metricTwoLabel;

  if (currentGame === GAME_MODES.TETRIS) {
    scoreValue.textContent = String(tetrisState.score);
    metricOneValue.textContent = String(tetrisState.lines);
    metricTwoValue.textContent = String(tetrisState.level);
  } else {
    scoreValue.textContent = String(fruitState.score);
    metricOneValue.textContent = String(fruitState.sliced);
    metricTwoValue.textContent = `${Math.ceil(fruitState.timeLeftMs / 1000)}${t('fruit.countdownSuffix')}`;
  }
}

function renderGameCatalog() {
  if (!gameCatalog) return;
  gameCatalog.replaceChildren();

  getLocalizedLibrary().forEach((item) => {
    const card = document.createElement(item.mode ? 'button' : 'article');
    card.className = `catalog-card${item.mode ? '' : ' coming'}${item.mode === currentGame ? ' active' : ''}`;
    if (item.mode) {
      card.type = 'button';
      card.dataset.game = item.mode;
    }

    const head = document.createElement('div');
    head.className = 'catalog-card-head';

    const title = document.createElement('h3');
    title.textContent = item.title;

    const badge = document.createElement('span');
    badge.className = 'catalog-pill';
    badge.textContent = item.badge;

    head.append(title, badge);

    const description = document.createElement('p');
    description.textContent = item.description;

    const foot = document.createElement('div');
    foot.className = 'catalog-card-foot';

    const tagline = document.createElement('span');
    tagline.className = 'catalog-tag';
    tagline.textContent = item.tagline;

    const action = document.createElement('span');
    action.className = 'catalog-tag';
    action.textContent = item.mode
      ? (item.mode === currentGame ? t('catalog.action.current') : t('catalog.action.switch'))
      : t('catalog.action.placeholder');

    foot.append(tagline, action);
    card.append(head, description, foot);
    gameCatalog.append(card);
  });
}

function applyGameMeta() {

  const meta = getCurrentMeta();
  appSubtitle.textContent = meta.subtitle;
  activeGameName.textContent = `${t('game.currentMode')}${meta.name}`;
  gamePanelTitle.textContent = meta.panelTitle;
  if (difficultyLabel) {
    difficultyLabel.textContent = meta.difficulty;
  }
  meta.gestures.forEach(([label, action], index) => {
    gestureLabels[index].textContent = label;
    gestureActions[index].textContent = action;
  });
  renderGameCatalog();
  updateHud();
}


function resetCurrentGame() {
  startPoseSince = 0;
  if (currentGame === GAME_MODES.TETRIS) {
    resetTetrisGame();
  } else {
    resetFruitGame();
  }
  updateHud();
}

function startCurrentGame() {
  if (currentGame === GAME_MODES.TETRIS) {
    startTetrisGame();
  } else {
    startFruitGame();
  }
}

function drawCurrentGame() {
  if (currentGame === GAME_MODES.TETRIS) {
    drawTetris();
  } else {
    drawFruitGame();
  }
}

function updateCurrentGame(timestamp) {
  if (currentGame === GAME_MODES.TETRIS) {
    updateTetris(timestamp);
  } else {
    updateFruitGame(timestamp);
  }
}

function switchGame(mode) {
  if (!GAME_META[mode] || mode === currentGame) return;
  currentGame = mode;
  resetHandTracking();
  applyGameMeta();
  resetCurrentGame();
  drawCurrentGame();
}

function resizePoseCanvas() {
  const rect = video.getBoundingClientRect();
  poseCanvas.width = rect.width * window.devicePixelRatio;
  poseCanvas.height = rect.height * window.devicePixelRatio;
  poseCtx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
}

function isVisible(point, minVisibility = LANDMARK_VISIBILITY) {
  return point && (point.visibility ?? 1) > minVisibility;
}

function isGestureVisible(point, minVisibility = GESTURE_LANDMARK_VISIBILITY) {
  return point && (point.visibility ?? 1) > minVisibility;
}

function getJointY(point, fallbackY = null) {
  return isGestureVisible(point) ? point.y : fallbackY;
}

function getStartGestureState(landmarks) {
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  const visibleShoulders = [leftShoulder, rightShoulder].filter((point) => isGestureVisible(point));
  const shoulderLine = visibleShoulders.length
    ? visibleShoulders.reduce((sum, point) => sum + point.y, 0) / visibleShoulders.length
    : null;

  const leftWristVisible = isGestureVisible(leftWrist);
  const rightWristVisible = isGestureVisible(rightWrist);
  const leftReferenceY = getJointY(leftShoulder, shoulderLine);
  const rightReferenceY = getJointY(rightShoulder, shoulderLine);

  const leftRaised = leftWristVisible && leftReferenceY !== null && leftWrist.y < leftReferenceY - START_WRIST_MARGIN;
  const rightRaised = rightWristVisible && rightReferenceY !== null && rightWrist.y < rightReferenceY - START_WRIST_MARGIN;

  let hint = t('gesture.hint.default');
  if (!visibleShoulders.length) {
    hint = t('gesture.hint.shoulders');
  } else if (!leftWristVisible && !rightWristVisible) {
    hint = t('gesture.hint.handsIn');
  } else if (!leftWristVisible) {
    hint = t('gesture.hint.leftIn');
  } else if (!rightWristVisible) {
    hint = t('gesture.hint.rightIn');
  } else if (!leftRaised && !rightRaised) {
    hint = t('gesture.hint.raiseBoth');
  } else if (!leftRaised) {
    hint = t('gesture.hint.raiseLeft');
  } else if (!rightRaised) {
    hint = t('gesture.hint.raiseRight');
  }

  return {
    ready: leftRaised && rightRaised,
    hint,
  };
}

function getVideoContainMetrics() {
  const canvasWidth = poseCanvas.width / window.devicePixelRatio;
  const canvasHeight = poseCanvas.height / window.devicePixelRatio;
  const videoWidth = video.videoWidth || canvasWidth;
  const videoHeight = video.videoHeight || canvasHeight;
  const videoAspect = videoWidth / videoHeight;
  const canvasAspect = canvasWidth / canvasHeight;

  let drawWidth = canvasWidth;
  let drawHeight = canvasHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (videoAspect > canvasAspect) {
    drawWidth = canvasWidth;
    drawHeight = drawWidth / videoAspect;
    offsetY = (canvasHeight - drawHeight) / 2;
  } else {
    drawHeight = canvasHeight;
    drawWidth = drawHeight * videoAspect;
    offsetX = (canvasWidth - drawWidth) / 2;
  }

  return {
    drawWidth,
    drawHeight,
    offsetX,
    offsetY,
  };
}

function mapLandmarkToCanvas(point, metrics) {
  if (!isVisible(point, DRAW_LANDMARK_VISIBILITY)) {
    return null;
  }

  return {
    x: metrics.offsetX + (1 - point.x) * metrics.drawWidth,
    y: metrics.offsetY + point.y * metrics.drawHeight,
  };
}

function mapLandmarkToGameCanvas(point) {
  if (!isGestureVisible(point, DRAW_LANDMARK_VISIBILITY)) {
    return null;
  }

  return {
    x: (1 - point.x) * gameCanvas.width,
    y: point.y * gameCanvas.height,
  };
}

function getVisibleLandmarkCount(landmarks, minVisibility = DRAW_LANDMARK_VISIBILITY) {
  return landmarks.reduce((count, point) => count + (isVisible(point, minVisibility) ? 1 : 0), 0);
}

function drawPose(landmarks) {
  const canvasWidth = poseCanvas.width / window.devicePixelRatio;
  const canvasHeight = poseCanvas.height / window.devicePixelRatio;
  poseCtx.clearRect(0, 0, canvasWidth, canvasHeight);
  if (!landmarks) return;

  const metrics = getVideoContainMetrics();
  const points = landmarks.map((point) => mapLandmarkToCanvas(point, metrics));

  poseCtx.save();
  poseCtx.lineCap = 'round';
  poseCtx.lineJoin = 'round';
  poseCtx.strokeStyle = 'rgba(110, 231, 255, 0.88)';
  poseCtx.lineWidth = 3;

  const poseConnections = Array.isArray(PoseLandmarker.POSE_CONNECTIONS) ? PoseLandmarker.POSE_CONNECTIONS : [];
  for (const connection of poseConnections) {
    const startIndex = Array.isArray(connection) ? connection[0] : connection?.start;
    const endIndex = Array.isArray(connection) ? connection[1] : connection?.end;
    if (typeof startIndex !== 'number' || typeof endIndex !== 'number') continue;
    const start = points[startIndex];
    const end = points[endIndex];
    if (!start || !end) continue;
    poseCtx.beginPath();
    poseCtx.moveTo(start.x, start.y);
    poseCtx.lineTo(end.x, end.y);
    poseCtx.stroke();
  }

  poseCtx.fillStyle = 'rgba(250, 204, 21, 0.98)';
  for (const point of points) {
    if (!point) continue;
    poseCtx.beginPath();
    poseCtx.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
    poseCtx.fill();
  }

  poseCtx.restore();
}

function updateHandTracking(landmarks, now) {
  const leftPoint = landmarks ? mapLandmarkToGameCanvas(landmarks[15]) : null;
  const rightPoint = landmarks ? mapLandmarkToGameCanvas(landmarks[16]) : null;

  updateTrackedHand(handState.left, leftPoint, now);
  updateTrackedHand(handState.right, rightPoint, now);
  registerHandSlash('left', now);
  registerHandSlash('right', now);
}

function evaluateTetrisGestures(landmarks, now) {
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftElbow = landmarks[13];
  const rightElbow = landmarks[14];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  const visibleShoulders = [leftShoulder, rightShoulder].filter((point) => isGestureVisible(point));
  const shoulderLine = visibleShoulders.length
    ? visibleShoulders.reduce((sum, point) => sum + point.y, 0) / visibleShoulders.length
    : null;
  const leftShoulderY = getJointY(leftShoulder, shoulderLine);
  const rightShoulderY = getJointY(rightShoulder, shoulderLine);

  const visibleElbows = [leftElbow, rightElbow].filter((point) => isGestureVisible(point));
  const elbowLine = visibleElbows.length
    ? visibleElbows.reduce((sum, point) => sum + point.y, 0) / visibleElbows.length
    : null;
  const leftElbowY = getJointY(leftElbow, elbowLine);
  const rightElbowY = getJointY(rightElbow, elbowLine);

  const visibleHips = [leftHip, rightHip].filter((point) => isGestureVisible(point));
  const hipLine = visibleHips.length
    ? visibleHips.reduce((sum, point) => sum + point.y, 0) / visibleHips.length
    : null;
  const torsoMidLine = shoulderLine !== null && hipLine !== null ? shoulderLine + (hipLine - shoulderLine) * 0.45 : null;
  const leftHipY = getJointY(leftHip, hipLine);
  const rightHipY = getJointY(rightHip, hipLine);

  const leftRaised = isGestureVisible(leftWrist) && leftShoulderY !== null && leftWrist.y < leftShoulderY - ACTION_WRIST_MARGIN;
  const rightRaised = isGestureVisible(rightWrist) && rightShoulderY !== null && rightWrist.y < rightShoulderY - ACTION_WRIST_MARGIN;
  const leftDownEnough =
    isGestureVisible(leftWrist) &&
    shoulderLine !== null &&
    leftWrist.y > shoulderLine + HANDS_DOWN_SHOULDER_OFFSET &&
    ((leftElbowY !== null && leftWrist.y > leftElbowY + HANDS_DOWN_ELBOW_MARGIN) ||
      (torsoMidLine !== null && leftWrist.y > torsoMidLine - HANDS_DOWN_MARGIN) ||
      (leftHipY !== null && leftWrist.y > leftHipY - HANDS_DOWN_MARGIN));
  const rightDownEnough =
    isGestureVisible(rightWrist) &&
    shoulderLine !== null &&
    rightWrist.y > shoulderLine + HANDS_DOWN_SHOULDER_OFFSET &&
    ((rightElbowY !== null && rightWrist.y > rightElbowY + HANDS_DOWN_ELBOW_MARGIN) ||
      (torsoMidLine !== null && rightWrist.y > torsoMidLine - HANDS_DOWN_MARGIN) ||
      (rightHipY !== null && rightWrist.y > rightHipY - HANDS_DOWN_MARGIN));

  let currentGesture = t('gesture.idle');

  if (leftRaised && rightRaised) {
    if (now - lastTetrisGestureAt.rotate > GESTURE_COOLDOWN) {
      if (tryRotate()) {
        currentGesture = t('gesture.rotate');
        lastTetrisGestureAt.rotate = now;
      }
    } else {
      currentGesture = t('gesture.rotateStandby');
    }
  } else if (leftRaised && now - lastTetrisGestureAt.left > GESTURE_COOLDOWN) {
    if (tryMove(-1)) {
      currentGesture = t('gesture.left');
      lastTetrisGestureAt.left = now;
    }
  } else if (rightRaised && now - lastTetrisGestureAt.right > GESTURE_COOLDOWN) {
    if (tryMove(1)) {
      currentGesture = t('gesture.right');
      lastTetrisGestureAt.right = now;
    }
  }

  tetrisState.softDrop = leftDownEnough && rightDownEnough;
  if (tetrisState.softDrop) {
    currentGesture = t('gesture.drop');
  }

  gestureValue.textContent = currentGesture;
}

function evaluateFruitGestures(landmarks) {
  const leftVisible = isGestureVisible(landmarks[15]);
  const rightVisible = isGestureVisible(landmarks[16]);

  if (!leftVisible && !rightVisible) {
    gestureValue.textContent = t('gesture.handsInView');
    return;
  }

  const leftFast = handState.left.speed >= FRUIT_SLASH_SPEED;
  const rightFast = handState.right.speed >= FRUIT_SLASH_SPEED;

  if (leftFast && rightFast) {
    gestureValue.textContent = t('gesture.dualSlash');
  } else if (leftFast) {
    gestureValue.textContent = t('gesture.leftSlash');
  } else if (rightFast) {
    gestureValue.textContent = t('gesture.rightSlash');
  } else {
    gestureValue.textContent = t('gesture.quickSlash');
  }
}

function evaluateGestures(landmarks, now) {
  if (!landmarks) {
    gestureValue.textContent = t('gesture.noBody');
    tetrisState.softDrop = false;
    return;
  }

  const startGesture = getStartGestureState(landmarks);

  if (!isCurrentGameRunning()) {
    if (startGesture.ready) {
      startPoseSince = startPoseSince || now;
      const held = now - startPoseSince;
      const progress = Math.min(100, Math.round((held / START_POSE_HOLD) * 100));
      gestureValue.textContent = progress < 100 ? `${t('gesture.startPose')} ${progress}%` : t('gesture.start');
      if (held >= START_POSE_HOLD) {
        startCurrentGame();
        startPoseSince = 0;
        gestureValue.textContent = t('gesture.start');
        lastTetrisGestureAt.rotate = now;
      }
    } else {
      startPoseSince = 0;
      gestureValue.textContent = isCurrentGameOver() ? `${t('gesture.restartPrefix')}${startGesture.hint}` : startGesture.hint;
    }
    return;
  }

  if (currentGame === GAME_MODES.TETRIS) {
    evaluateTetrisGestures(landmarks, now);
  } else {
    evaluateFruitGestures(landmarks);
  }
}

async function createPoseLandmarker(vision, delegate) {
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: POSE_MODEL_PATH,
      delegate,
    },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.35,
    minPosePresenceConfidence: 0.35,
    minTrackingConfidence: 0.35,
  });
}

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

const MODEL_LOAD_TIMEOUT = 60_000;
const GPU_ATTEMPT_TIMEOUT = 12_000;

function isMobileDevice() {
  const ua = navigator.userAgent || '';
  return (
    navigator.userAgentData?.mobile === true ||
    /Mobile|Android|iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

async function initPose() {
  setCameraStatus('camera.status.loading');
  const vision = await withTimeout(FilesetResolver.forVisionTasks('/mediapipe/wasm'), MODEL_LOAD_TIMEOUT);

  // 移动端 GPU delegate 在部分浏览器(尤其 iOS Safari)创建模型时会无限挂起而不抛错,
  // 导致「GPU 失败就退回 CPU」的 fallback 永远不触发,页面一直停在「加载模型中」。
  // 所以移动端直接走 CPU,并用超时兜底,确保一定会失败前进。
  if (isMobileDevice()) {
    setCameraStatus('camera.status.cpu');
    poseLandmarker = await withTimeout(createPoseLandmarker(vision, 'CPU'), MODEL_LOAD_TIMEOUT);
    return;
  }

  try {
    poseLandmarker = await withTimeout(createPoseLandmarker(vision, 'GPU'), GPU_ATTEMPT_TIMEOUT);
    setCameraStatus('camera.status.gpu');
  } catch (gpuError) {
    console.warn('GPU delegate failed or timed out, fallback to CPU.', gpuError);
    poseLandmarker = await withTimeout(createPoseLandmarker(vision, 'CPU'), MODEL_LOAD_TIMEOUT);
    setCameraStatus('camera.status.cpu');
  }
}

function describeCameraError(error) {
  if (!window.isSecureContext) {
    return t('camera.err.insecure');
  }

  switch (error?.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return t('camera.err.denied');
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return t('camera.err.notFound');
    case 'NotReadableError':
    case 'TrackStartError':
      return t('camera.err.busy');
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return t('camera.err.constraint');
    default:
      return tf('camera.err.failed', { msg: error?.message || t('camera.err.unknown') });
  }
}

async function requestCameraStream(constraints) {
  return navigator.mediaDevices.getUserMedia({
    video: constraints,
    audio: false,
  });
}

async function initCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(t('camera.err.noGetUserMedia'));
  }

  setCameraStatus('camera.status.request');

  let stream;
  try {
    stream = await requestCameraStream({
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'user',
    });
  } catch (error) {
    if (error?.name === 'OverconstrainedError' || error?.name === 'ConstraintNotSatisfiedError') {
      stream = await requestCameraStream(true);
    } else {
      throw error;
    }
  }

  video.srcObject = stream;
  await video.play();
  resizePoseCanvas();
  setCameraStatus('camera.status.connected');
}

function detectPose(now) {
  if (!poseLandmarker || video.readyState < 2) return;

  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    const result = poseLandmarker.detectForVideo(video, now);
    latestLandmarks = result.landmarks?.[0] ?? null;

    if (latestLandmarks) {
      setCameraStatus('camera.status.trackingCount', { count: getVisibleLandmarkCount(latestLandmarks) });
    } else {
      setCameraStatus('camera.status.noBody');
    }

    updateHandTracking(latestLandmarks, now);
    drawPose(latestLandmarks);
    evaluateGestures(latestLandmarks, now);
  }
}

function setLanguage(lang) {
  setLang(lang);
  updateLangButton();
  applyGameMeta();

  const state = getCurrentGameState();

  if (startupFailure) {
    gameStateBadge.textContent = t('game.state.unavailable');
  } else if (state.gameOver) {
    gameStateBadge.textContent = t('game.state.over');
  } else if (state.running) {
    gameStateBadge.textContent = currentGame === GAME_MODES.TETRIS ? t('game.state.playing') : t('game.state.timer');
  } else {
    gameStateBadge.textContent = t('game.state.ready');
  }

  if (lastCameraStatus.key) {
    setCameraStatus(lastCameraStatus.key, lastCameraStatus.params);
  }

  if (startupFailure) {
    gestureValue.textContent = startupFailure.kind === 'camera' ? t('camera.status.unavailable') : t('camera.status.modelLoadFail');
  } else {
    gestureValue.textContent = t('stats.waiting');
  }

  if (overlayVisible) {
    if (modelLoading) {
      updateGameOverlay(true, t('overlay.modelLoading'), t('overlay.modelLoadingHint'));
    } else if (startupFailure) {
      if (startupFailure.kind === 'camera') {
        updateGameOverlay(true, t('overlay.cameraStartFail'), describeCameraError(startupFailure.error));
      } else {
        updateGameOverlay(
          true,
          t('overlay.modelStartFail'),
          `${t('overlay.reloadHint')}${startupFailure.error?.message ? `\n${tf('overlay.errorDetail', { msg: startupFailure.error.message })}` : ''}`,
        );
      }
    } else if (state.gameOver) {
      if (currentGame === GAME_MODES.TETRIS) {
        updateGameOverlay(true, t('overlay.gameOver'), t('overlay.restartHintFruit'));
      } else {
        updateGameOverlay(
          true,
          t('overlay.timeUp'),
          `${tf('fruit.result', {
            score: fruitState.score,
            sliced: fruitState.sliced,
            combo: fruitState.bestCombo,
          })} ${t('overlay.restartBackHint')}`,
        );
      }
    } else {
      const meta = getCurrentMeta();
      updateGameOverlay(true, meta.startTitle, meta.startHint);
    }
  }
}

function setupEvents() {
  window.addEventListener('resize', resizePoseCanvas);

  restartBtn.addEventListener('click', () => {
    resetHandTracking();
    resetCurrentGame();
  });

  langBtn?.addEventListener('click', () => {
    setLanguage(getLang() === 'zh' ? 'en' : 'zh');
  });

  gameCatalog?.addEventListener('click', (event) => {
    const target = event.target.closest('[data-game]');
    if (!target) return;
    switchGame(target.dataset.game);
  });

  window.addEventListener('keydown', (event) => {

    if (event.code === 'Digit1') {
      switchGame(GAME_MODES.TETRIS);
      return;
    }
    if (event.code === 'Digit2') {
      switchGame(GAME_MODES.FRUIT);
      return;
    }

    if (event.code === 'Enter') {
      startCurrentGame();
      return;
    }

    if (currentGame !== GAME_MODES.TETRIS) return;

    switch (event.code) {
      case 'ArrowLeft':
        tryMove(-1);
        break;
      case 'ArrowRight':
        tryMove(1);
        break;
      case 'ArrowUp':
      case 'Space':
        tryRotate();
        break;
      case 'ArrowDown':
        tetrisState.softDrop = true;
        break;
      default:
        break;
    }
  });

  window.addEventListener('keyup', (event) => {
    if (currentGame === GAME_MODES.TETRIS && event.code === 'ArrowDown') {
      tetrisState.softDrop = false;
    }
  });
}

function gameLoop(timestamp) {
  frameStartedAt = timestamp;
  detectPose(timestamp);
  updateCurrentGame(timestamp);
  drawCurrentGame();
  requestAnimationFrame(gameLoop);
}

async function bootstrap() {
  initLanguage();
  updateLangButton();
  await preloadSprites();
  applyGameMeta();
  resetCurrentGame();
  setupEvents();
  drawCurrentGame();

  try {
    await initCamera();

  } catch (error) {
    console.error(error);
    startupFailure = { kind: 'camera', error };
    setCameraStatus('camera.status.fail');
    gameStateBadge.textContent = t('game.state.unavailable');
    gestureValue.textContent = t('camera.status.unavailable');
    updateGameOverlay(true, t('overlay.cameraStartFail'), describeCameraError(error));
    requestAnimationFrame(gameLoop);
    return;
  }

  try {
    // 模型加载可能较久(首次需下载模型文件),先把覆盖层切到加载提示。
    modelLoading = true;
    updateGameOverlay(true, t('overlay.modelLoading'), t('overlay.modelLoadingHint'));

    await initPose();
    modelLoading = false;
    setCameraStatus('camera.status.tracking');
    const meta = getCurrentMeta();
    updateGameOverlay(true, meta.startTitle, meta.startHint);
  } catch (error) {
    modelLoading = false;
    console.error(error);
    startupFailure = { kind: 'model', error };
    setCameraStatus('camera.status.modelFail');
    gameStateBadge.textContent = t('game.state.unavailable');
    gestureValue.textContent = t('camera.status.modelLoadFail');
    updateGameOverlay(
      true,
      t('overlay.modelStartFail'),
      `${t('overlay.reloadHint')}${error?.message ? `\n${tf('overlay.errorDetail', { msg: error.message })}` : ''}`,
    );
  }

  requestAnimationFrame(gameLoop);
}

bootstrap();
