// src/i18n.js — 中英双语字典与语言工具 (CN/EN dictionary and language helpers)
//
// 默认语言为英文 (en)。解析顺序:localStorage 保存的选择 → 浏览器语言(zh 前缀 → 中文,其余 → 英文)。

const LANG_KEY = 'move-arcade-lang';

const I18N = {
  zh: {
    // 页面标题 / 品牌
    'app.title': 'MOVE ARCADE · 体感游戏中心',
    'seo.title': 'MOVE ARCADE · 体感游戏中心',
    'seo.desc': '无需手柄，用摄像头和身体动作游玩俄罗斯方块、切西瓜、星光接力、能量守门员等体感小游戏。支持 PC 与移动端，中英双语，打开即玩。',
    'brand.aria': 'MOVE ARCADE 首页',
    'brand.tagline': '让身体成为手柄',
    'session.status': '正在准备体感空间',
    'sound.on': '声音 开',
    'sound.title': '切换提示音',
    'help.btn': '新手帮助',

    // 游戏库
    'lib.heading': '今天想怎么玩？',
    'lib.playableCount': '4 款可玩',
    'lib.intro': '拖动游戏卡片调整顺序，或让系统根据你的最近体验自动推荐。',
    'lib.sortLabel': '游戏排序方式',
    'lib.sort.custom': '我的顺序',
    'lib.sort.smart': '智能推荐',
    'lib.sort.recent': '最近玩过',
    'lib.shuffle': '换一换',
    'lib.shuffle.title': '随机换一组顺序',
    'lib.catalogAria': '体感游戏列表',
    'lib.noteLabel': '产品提示',
    'lib.note': '建议每局 3–5 分钟，游戏间穿插低强度玩法，减少持续高举手臂的疲劳。',

    'lib.tetris.title': '俄罗斯方块',
    'lib.tetris.badge': '经典',
    'lib.tetris.desc': '抬手移动、旋转和加速，强调节奏与精确控制。',
    'lib.tetris.tagline': '协调 · 中强度',
    'lib.fruit.title': '切西瓜',
    'lib.fruit.badge': '热门',
    'lib.fruit.desc': '快速挥臂切开水果，连续命中加分，注意避开炸弹。',
    'lib.fruit.tagline': '爆发 · 高强度',
    'lib.star.title': '星光接力',
    'lib.star.badge': '舒缓',
    'lib.star.desc': '移动任意一只手进入光点并短暂停留，连续点亮星图。',
    'lib.star.tagline': '伸展 · 低强度',
    'lib.guard.title': '能量守门员',
    'lib.guard.badge': '新作',
    'lib.guard.desc': '用双手挡住下落能量球，左右协作守住三格护盾。',
    'lib.guard.tagline': '反应 · 中强度',
    'lib.rhythm.title': '节奏击打',
    'lib.rhythm.badge': '下一款',
    'lib.rhythm.desc': '跟随节拍击中四周飞来的光球，支持派对轮流挑战。',
    'lib.rhythm.tagline': '音乐 · 高强度',
    'lib.wall.title': '光墙闪避',
    'lib.wall.badge': '企划中',
    'lib.wall.desc': '根据轮廓缺口摆出对应姿势，让全身穿过光墙。',
    'lib.wall.tagline': '全身 · 中强度',
    'lib.boxing.title': '体感拳击',
    'lib.boxing.badge': '企划中',
    'lib.boxing.desc': '左右直拳、格挡与闪躲组成连招，适合双人积分赛。',
    'lib.boxing.tagline': '竞技 · 高强度',

    'catalog.action.current': '当前正在玩',
    'catalog.action.switch': '点击切换',
    'catalog.action.placeholder': '创意预留位',

    // 游戏状态徽标
    'game.state.ready': '准备中',
    'game.state.playing': '游戏中',
    'game.state.timer': '计时中',
    'game.state.over': '已结束',
    'game.state.unavailable': '不可用',
    'game.currentMode': '当前模式：',

    // 遮罩 / 结算
    'overlay.gameOver': '游戏结束',
    'overlay.restartHintFruit': '双手高举重新开始，或者切换到切西瓜。',
    'overlay.timeUp': '时间到',
    'overlay.restartBackHint': '双手高举重新开始，或者切换回俄罗斯方块。',
    'overlay.startAction': '不用手势，直接开始',
    'overlay.toastWait': '等待动作',
    'overlay.cameraStartFail': '无法启动摄像头',
    'overlay.modelStartFail': '摄像头已连接，但姿态模型启动失败',
    'overlay.modelLoading': '正在加载姿态模型',
    'overlay.modelLoadingHint': '首次加载需下载模型文件，请耐心等待。',
    'overlay.reloadHint': '请刷新页面重试；若仍失败，请检查浏览器控制台错误信息。',
    'overlay.errorDetail': '错误：{msg}',

    // 统计
    'stats.score': '分数',
    'stats.recognition': '识别反馈',
    'stats.waiting': '等待识别',

    // 手势识别反馈
    'gesture.idle': '站稳身体，抬手操控',
    'gesture.rotate': '双手高举：旋转',
    'gesture.rotateStandby': '双手高举：旋转待命',
    'gesture.left': '左手抬高：向左',
    'gesture.right': '右手抬高：向右',
    'gesture.drop': '双手下压：加速下落',
    'gesture.handsInView': '请让双手保持入镜',
    'gesture.dualSlash': '双手连斩中',
    'gesture.leftSlash': '左手挥切',
    'gesture.rightSlash': '右手挥切',
    'gesture.quickSlash': '快速挥动双手切水果',
    'gesture.noBody': '未检测到人体，请后退半步并让肩膀与双手入镜',
    'gesture.startPose': '开始手势',
    'gesture.start': '游戏开始',
    'gesture.restartPrefix': '重新开始：',

    // 开始手势站位提示
    'gesture.hint.default': '双手高举开始',
    'gesture.hint.shoulders': '肩膀需要入镜，请后退半步',
    'gesture.hint.handsIn': '请把双手完整放进画面',
    'gesture.hint.leftIn': '左手再往画面中间一点',
    'gesture.hint.rightIn': '右手再往画面中间一点',
    'gesture.hint.raiseBoth': '双手再抬高一点',
    'gesture.hint.raiseLeft': '左手再抬高一点',
    'gesture.hint.raiseRight': '右手再抬高一点',

    // 摄像头状态
    'camera.status.loading': '加载模型中',
    'camera.status.gpu': '识别中（GPU）',
    'camera.status.cpu': '识别中（CPU）',
    'camera.status.request': '请求摄像头',
    'camera.status.connected': '摄像头已连接',
    'camera.status.tracking': '识别中',
    'camera.status.trackingCount': '识别中 · {count}/33',
    'camera.status.noBody': '识别中 · 未检测到人体',
    'camera.status.fail': '摄像头失败',
    'camera.status.modelFail': '模型失败',
    'camera.status.modelLoadFail': '姿态模型加载失败',
    'camera.status.unavailable': '摄像头不可用',

    // 摄像头错误
    'camera.err.insecure': '当前页面不是安全环境，请用 localhost 打开，而不是直接双击 HTML 文件。',
    'camera.err.denied': '浏览器已拦截摄像头权限，请点击地址栏摄像头图标并允许访问。',
    'camera.err.notFound': '没有检测到可用摄像头，请确认笔记本摄像头可用。',
    'camera.err.busy': '摄像头正被其他应用占用，请关闭会议软件或相机程序后重试。',
    'camera.err.constraint': '当前摄像头不支持请求的分辨率，系统将回退到默认配置。',
    'camera.err.failed': '摄像头启动失败：{msg}',
    'camera.err.unknown': '未知错误',
    'camera.err.noGetUserMedia': '当前浏览器不支持 getUserMedia。',

    // 水果模式画布文字
    'fruit.combo': '连斩',
    'fruit.countdownSuffix': '秒',
    'fruit.result': '本局得分 {score}，切开 {sliced} 个水果，最高 {combo} 连斩。',

    // 操作按钮
    'controls.start': '开始游戏',
    'controls.pause': '暂停',
    'controls.restart': '重新开始',
    'controls.keyboardTip': '键盘备用：Enter 开始 · P 暂停 · 1–4 切换游戏',

    // 体感镜头面板
    'cameraPanel.title': '体感镜头',
    'cameraPanel.status': '等待授权',
    'cameraPanel.safeFrame': '站在框内 · 保持上半身入镜',
    'cameraPanel.quality': '识别质量',
    'cameraPanel.trackingQuality': '准备中',
    'cameraPanel.tip': '摄像头开启后，这里会实时提示站位。',
    'cameraPanel.expand': '展开摄像头',
    'cameraPanel.collapse': '收起摄像头',

    // 舒适度面板
    'comfort.title': '操作舒适度',
    'comfort.chip': '已防误触',
    'comfort.rangeLabel': '动作幅度',
    'comfort.rangeHint': '肩颈不舒服时选“轻柔”',
    'comfort.gentle': '轻柔',
    'comfort.standard': '标准',
    'comfort.active': '活力',
    'comfort.reduceFx': '减少动态效果',
    'comfort.reduceFxHint': '降低闪光和粒子密度',

    // 本局动作面板
    'guide.title': '本局动作',
    'guide.chip': '先看再玩',

    // 帮助弹窗
    'help.close': '关闭帮助',
    'help.kicker': '60 秒上手',
    'help.title': '先让身体和镜头建立默契',
    'help.step1.title': '退后半步',
    'help.step1.desc': '让头部、肩膀、手腕都出现在安全框内。',
    'help.step2.title': '双手高举',
    'help.step2.desc': '保持约 0.8 秒，随后会有 3 秒倒计时，避免突然开局。',
    'help.step3.title': '小幅试动作',
    'help.step3.desc': '先观察“识别反馈”，动作被确认后再继续。',
    'help.note': '随时可用按钮或键盘操作；累了就把动作幅度切到“轻柔”。',
    'help.done': '知道了，开始体验',

    // 语言切换
    'lang.aria': '切换语言',

    // 各游戏模式元信息
    'meta.tetris.name': '俄罗斯方块',
    'meta.tetris.subtitle': '用简单抬手完成移动与旋转，动作确认后会有清晰反馈。',
    'meta.tetris.panelTitle': '俄罗斯方块',
    'meta.tetris.difficulty': '轻松上手',
    'meta.tetris.metricOne': '消除',
    'meta.tetris.metricTwo': '等级',
    'meta.tetris.startTitle': '双手高举开始',
    'meta.tetris.startHint': '左手抬高向左，右手抬高向右，双手高举旋转，双手下压加速。',
    'meta.tetris.g1l': '左手抬高',
    'meta.tetris.g1a': '向左移动',
    'meta.tetris.g2l': '右手抬高',
    'meta.tetris.g2a': '向右移动',
    'meta.tetris.g3l': '双手高举',
    'meta.tetris.g3a': '旋转方块',
    'meta.tetris.g4l': '双手下压',
    'meta.tetris.g4a': '快速下落',

    'meta.fruit.name': '切西瓜',
    'meta.fruit.subtitle': '45 秒爆发挑战，挥臂切水果，连斩加分，炸弹只扣分不出局。',
    'meta.fruit.panelTitle': '切西瓜 · 45 秒挑战',
    'meta.fruit.difficulty': '高能燃脂',
    'meta.fruit.metricOne': '切开',
    'meta.fruit.metricTwo': '倒计时',
    'meta.fruit.startTitle': '双手高举开始',
    'meta.fruit.startHint': '45 秒内尽量多切水果，炸弹会扣分但不会直接结束。',
    'meta.fruit.g1l': '左手挥切',
    'meta.fruit.g1a': '切开左侧水果加分',
    'meta.fruit.g2l': '右手挥切',
    'meta.fruit.g2a': '切开右侧水果加分',
    'meta.fruit.g3l': '双手快挥',
    'meta.fruit.g3a': '更容易打出连斩高分',
    'meta.fruit.g4l': '切到炸弹',
    'meta.fruit.g4a': '扣分并打断连斩',

    'meta.star.name': '星光接力',
    'meta.star.subtitle': '低强度伸展玩法，把任意一只手移动到光点内并短暂停留即可得分。',
    'meta.star.panelTitle': '星光接力 · 舒缓挑战',
    'meta.star.difficulty': '低强度友好',
    'meta.star.metricOne': '点亮',
    'meta.star.metricTwo': '倒计时',
    'meta.star.startTitle': '双手高举，点亮星图',
    'meta.star.startHint': '开局后把任意一只手移入光点，停留片刻即可点亮。',
    'meta.star.g1l': '左手靠近光点',
    'meta.star.g1a': '进入光圈',
    'meta.star.g2l': '右手靠近光点',
    'meta.star.g2a': '进入光圈',
    'meta.star.g3l': '短暂停留',
    'meta.star.g3a': '完成点亮',
    'meta.star.g4l': '连续命中',
    'meta.star.g4a': '提升连击得分',

    'meta.guard.name': '能量守门员',
    'meta.guard.subtitle': '双手协作挡住下落能量球，漏球会损失护盾，但不会突然结束。',
    'meta.guard.panelTitle': '能量守门员 · 双手协作',
    'meta.guard.difficulty': '反应挑战',
    'meta.guard.metricOne': '扑救',
    'meta.guard.metricTwo': '护盾',
    'meta.guard.startTitle': '双手高举，守住能量门',
    'meta.guard.startHint': '移动左右手接住下落光球，漏接会损失一格护盾。',
    'meta.guard.g1l': '移动左手',
    'meta.guard.g1a': '封住左侧来球',
    'meta.guard.g2l': '移动右手',
    'meta.guard.g2a': '封住右侧来球',
    'meta.guard.g3l': '双手分开',
    'meta.guard.g3a': '扩大防守范围',
    'meta.guard.g4l': '保持入镜',
    'meta.guard.g4a': '持续追踪双手',

    // 留言板
    'msg.kicker': '社区留言',
    'msg.title': '留言板',
    'msg.subtitle': '分享你的体验、建议或问题，帮助我们一起变得更好。',
    'msg.nameLabel': '昵称',
    'msg.namePlaceholder': '你的昵称',
    'msg.contentLabel': '留言内容',
    'msg.contentPlaceholder': '写下你的留言或建议…',
    'msg.submit': '发布留言',
    'msg.count': '{count} 条留言',
    'msg.empty': '还没有留言，来抢沙发吧！',
    'msg.loading': '正在加载留言…',
    'msg.loadError': '留言板暂时无法连接，请确认后端服务已启动（npm run server）。',
    'msg.sendError': '发送失败，请稍后再试。',
    'msg.success': '留言发布成功！',
    'msg.nameRequired': '请输入昵称',
    'msg.contentRequired': '请输入留言内容',
    'msg.justNow': '刚刚',
    'msg.minutesAgo': '{n} 分钟前',
    'msg.hoursAgo': '{n} 小时前',
    'msg.daysAgo': '{n} 天前',
    'msg.langZh': '中文留言',
    'msg.langEn': 'English',

    // 排行榜
    'lb.kicker': '排行榜',
    'lb.title': '分数排行榜',
    'lb.subtitle': '看看谁是这一轮的体感之王',
    'lb.empty': '还没有成绩，快来创造第一分吧！',
    'lb.loadError': '排行榜暂时无法连接，请确认后端服务已启动（npm run server）。',
    'lb.you': '你',
    'lb.defaultName': '体感玩家',
    'lb.newRecord': '新纪录',

    // 页脚
    'footer.tagline': '用身体重新发现游戏的乐趣',
    'footer.sub': '姿态识别 · 本地数据存储 · 建议在明亮环境下体验',
  },

  en: {
    // Page title / brand
    'app.title': 'MOVE ARCADE · Motion Game Hub',
    'seo.title': 'MOVE ARCADE · Motion Game Hub',
    'seo.desc': 'Play motion-sensing arcade games (Tetris, Fruit Ninja, Star Relay, Energy Goalkeeper) using just your webcam and body gestures — no controller needed. Works on PC and mobile, bilingual ZH/EN, play instantly.',
    'brand.aria': 'MOVE ARCADE home',
    'brand.tagline': 'Make your body the controller',
    'session.status': 'Preparing motion space',
    'sound.on': 'Sound On',
    'sound.title': 'Toggle sound',
    'help.btn': 'Help',

    // Game library
    'lib.heading': 'What do you want to play today?',
    'lib.playableCount': '4 games playable',
    'lib.intro': 'Drag game cards to reorder, or let the system recommend based on your recent sessions.',
    'lib.sortLabel': 'Sort games by',
    'lib.sort.custom': 'My order',
    'lib.sort.smart': 'Smart pick',
    'lib.sort.recent': 'Recently played',
    'lib.shuffle': 'Shuffle',
    'lib.shuffle.title': 'Shuffle the order',
    'lib.catalogAria': 'Game library',
    'lib.noteLabel': 'Tips',
    'lib.note': 'Keep each round to 3–5 minutes and mix in low-intensity games to reduce arm fatigue from holding your arms up.',

    'lib.tetris.title': 'Block Drop',
    'lib.tetris.badge': 'Classic',
    'lib.tetris.desc': 'Move, rotate and drop with your hands. Rhythm and precision.',
    'lib.tetris.tagline': 'Coordination · Medium',
    'lib.fruit.title': 'Fruit Ninja',
    'lib.fruit.badge': 'Popular',
    'lib.fruit.desc': 'Swipe to slice fruit and chain hits for combo points. Watch out for bombs.',
    'lib.fruit.tagline': 'Explosive · High',
    'lib.star.title': 'Star Relay',
    'lib.star.badge': 'Gentle',
    'lib.star.desc': 'Move either hand into the light dots and hold briefly to light up the star map.',
    'lib.star.tagline': 'Stretch · Low',
    'lib.guard.title': 'Energy Keeper',
    'lib.guard.badge': 'New',
    'lib.guard.desc': 'Block falling energy orbs with both hands and hold the shield line.',
    'lib.guard.tagline': 'Reaction · Medium',
    'lib.rhythm.title': 'Beat Strike',
    'lib.rhythm.badge': 'Coming next',
    'lib.rhythm.desc': 'Hit the incoming orbs to the beat. Great for party turn-taking.',
    'lib.rhythm.tagline': 'Music · High',
    'lib.wall.title': 'Light Wall',
    'lib.wall.badge': 'In planning',
    'lib.wall.desc': 'Pose to match the wall opening and slip your whole body through.',
    'lib.wall.tagline': 'Full body · Medium',
    'lib.boxing.title': 'Motion Boxing',
    'lib.boxing.badge': 'In planning',
    'lib.boxing.desc': 'Jabs, blocks and dodges build combos. Great for two-player scoring.',
    'lib.boxing.tagline': 'Competitive · High',

    'catalog.action.current': 'Now playing',
    'catalog.action.switch': 'Switch',
    'catalog.action.placeholder': 'Coming soon',

    // Game state badges
    'game.state.ready': 'Ready',
    'game.state.playing': 'Playing',
    'game.state.timer': 'In play',
    'game.state.over': 'Game over',
    'game.state.unavailable': 'Unavailable',
    'game.currentMode': 'Current: ',

    // Overlay / results
    'overlay.gameOver': 'Game over',
    'overlay.restartHintFruit': 'Raise both hands to restart, or switch to Fruit Ninja.',
    'overlay.timeUp': "Time's up",
    'overlay.restartBackHint': 'Raise both hands to restart, or switch back to Block Drop.',
    'overlay.startAction': 'Start without gestures',
    'overlay.toastWait': 'Waiting for your move',
    'overlay.cameraStartFail': 'Could not start camera',
    'overlay.modelStartFail': 'Camera is connected, but the pose model failed to start',
    'overlay.modelLoading': 'Loading pose model',
    'overlay.modelLoadingHint': 'The first load downloads the model files — please wait.',
    'overlay.reloadHint': 'Refresh the page and try again. If it still fails, check the browser console.',
    'overlay.errorDetail': 'Error: {msg}',

    // Stats
    'stats.score': 'Score',
    'stats.recognition': 'Recognition',
    'stats.waiting': 'Waiting for recognition',

    // Gesture recognition feedback
    'gesture.idle': 'Stand steady, raise a hand to control',
    'gesture.rotate': 'Both hands up: rotate',
    'gesture.rotateStandby': 'Both hands up: rotate (ready)',
    'gesture.left': 'Left hand up: move left',
    'gesture.right': 'Right hand up: move right',
    'gesture.drop': 'Both hands down: fast drop',
    'gesture.handsInView': 'Keep both hands in view',
    'gesture.dualSlash': 'Dual slicing',
    'gesture.leftSlash': 'Left swipe',
    'gesture.rightSlash': 'Right swipe',
    'gesture.quickSlash': 'Swipe quickly to slice fruit',
    'gesture.noBody': 'No body detected. Step back and keep your shoulders and hands in view',
    'gesture.startPose': 'Start pose',
    'gesture.start': 'Game on!',
    'gesture.restartPrefix': 'Restart: ',

    // Start-pose positioning hints
    'gesture.hint.default': 'Raise both hands to start',
    'gesture.hint.shoulders': 'Your shoulders need to be in view. Step back a bit',
    'gesture.hint.handsIn': 'Move both hands fully into frame',
    'gesture.hint.leftIn': 'Move your left hand toward center',
    'gesture.hint.rightIn': 'Move your right hand toward center',
    'gesture.hint.raiseBoth': 'Raise both hands a bit more',
    'gesture.hint.raiseLeft': 'Raise your left hand a bit more',
    'gesture.hint.raiseRight': 'Raise your right hand a bit more',

    // Camera status
    'camera.status.loading': 'Loading model',
    'camera.status.gpu': 'Tracking (GPU)',
    'camera.status.cpu': 'Tracking (CPU)',
    'camera.status.request': 'Requesting camera',
    'camera.status.connected': 'Camera connected',
    'camera.status.tracking': 'Tracking',
    'camera.status.trackingCount': 'Tracking · {count}/33',
    'camera.status.noBody': 'Tracking · no body detected',
    'camera.status.fail': 'Camera failed',
    'camera.status.modelFail': 'Model failed',
    'camera.status.modelLoadFail': 'Pose model failed to load',
    'camera.status.unavailable': 'Camera unavailable',

    // Camera errors
    'camera.err.insecure': 'This page is not in a secure context. Open it via localhost instead of double-clicking the HTML file.',
    'camera.err.denied': 'Camera access was blocked. Click the camera icon in the address bar and allow access.',
    'camera.err.notFound': 'No camera found. Make sure your laptop camera is available.',
    'camera.err.busy': 'The camera is in use by another app. Close video-call or camera software and try again.',
    'camera.err.constraint': 'The camera does not support the requested resolution. Falling back to defaults.',
    'camera.err.failed': 'Camera failed to start: {msg}',
    'camera.err.unknown': 'Unknown error',
    'camera.err.noGetUserMedia': 'This browser does not support getUserMedia.',

    // Fruit-mode canvas text
    'fruit.combo': 'Combo',
    'fruit.countdownSuffix': 's',
    'fruit.result': 'Score {score} · {sliced} fruits sliced · best combo {combo}.',

    // Action buttons
    'controls.start': 'Start game',
    'controls.pause': 'Pause',
    'controls.restart': 'Restart',
    'controls.keyboardTip': 'Keyboard: Enter start · P pause · 1–4 switch games',

    // Camera panel
    'cameraPanel.title': 'Motion Camera',
    'cameraPanel.status': 'Waiting for permission',
    'cameraPanel.safeFrame': 'Stand in the frame · keep your upper body visible',
    'cameraPanel.quality': 'Tracking quality',
    'cameraPanel.trackingQuality': 'Preparing',
    'cameraPanel.tip': 'Once the camera is on, position tips appear here in real time.',
    'cameraPanel.expand': 'Expand camera',
    'cameraPanel.collapse': 'Collapse camera',

    // Comfort panel
    'comfort.title': 'Comfort',
    'comfort.chip': 'Accident-proof',
    'comfort.rangeLabel': 'Motion range',
    'comfort.rangeHint': 'Choose "Gentle" if your shoulders feel tired',
    'comfort.gentle': 'Gentle',
    'comfort.standard': 'Standard',
    'comfort.active': 'Active',
    'comfort.reduceFx': 'Reduce motion effects',
    'comfort.reduceFxHint': 'Lower flash and particle density',

    // Guide panel
    'guide.title': 'This round',
    'guide.chip': 'Read before you play',

    // Help dialog
    'help.close': 'Close help',
    'help.kicker': 'Get started in 60s',
    'help.title': 'Let your body and camera get acquainted',
    'help.step1.title': 'Step back',
    'help.step1.desc': 'Keep your head, shoulders and wrists inside the safe frame.',
    'help.step2.title': 'Raise both hands',
    'help.step2.desc': 'Hold for about 0.8s; a 3-second countdown follows so the game never starts abruptly.',
    'help.step3.title': 'Try small moves',
    'help.step3.desc': 'Watch the "Recognition" readout and continue once your moves register.',
    'help.note': 'You can always use buttons or the keyboard; switch to "Gentle" when you need a break.',
    'help.done': "Got it, let's play",

    // Language switch
    'lang.aria': 'Switch language',

    // Per-mode meta
    'meta.tetris.name': 'Block Drop',
    'meta.tetris.subtitle': 'Move and rotate with simple raises; every action gets clear feedback.',
    'meta.tetris.panelTitle': 'Block Drop',
    'meta.tetris.difficulty': 'Easy to learn',
    'meta.tetris.metricOne': 'Lines',
    'meta.tetris.metricTwo': 'Level',
    'meta.tetris.startTitle': 'Raise both hands to start',
    'meta.tetris.startHint': 'Left hand up = left, right hand up = right, both up = rotate, both down = speed up.',
    'meta.tetris.g1l': 'Left hand up',
    'meta.tetris.g1a': 'Move left',
    'meta.tetris.g2l': 'Right hand up',
    'meta.tetris.g2a': 'Move right',
    'meta.tetris.g3l': 'Both hands up',
    'meta.tetris.g3a': 'Rotate',
    'meta.tetris.g4l': 'Both hands down',
    'meta.tetris.g4a': 'Fast drop',

    'meta.fruit.name': 'Fruit Ninja',
    'meta.fruit.subtitle': 'A 45-second sprint. Swipe to slice fruit and chain combos; bombs cost points but never end the round.',
    'meta.fruit.panelTitle': 'Fruit Ninja · 45s Challenge',
    'meta.fruit.difficulty': 'High-energy',
    'meta.fruit.metricOne': 'Sliced',
    'meta.fruit.metricTwo': 'Countdown',
    'meta.fruit.startTitle': 'Raise both hands to start',
    'meta.fruit.startHint': 'Slice as many fruits as you can in 45 seconds. Bombs cost points but never end the round.',
    'meta.fruit.g1l': 'Left swipe',
    'meta.fruit.g1a': 'Slice left fruit for points',
    'meta.fruit.g2l': 'Right swipe',
    'meta.fruit.g2a': 'Slice right fruit for points',
    'meta.fruit.g3l': 'Both hands quick',
    'meta.fruit.g3a': 'Triggers higher combo scores',
    'meta.fruit.g4l': 'Hit a bomb',
    'meta.fruit.g4a': 'Deduct points and break combo',

    'meta.star.name': 'Star Relay',
    'meta.star.subtitle': 'A gentle stretch game. Move either hand into the light dots and hold to score.',
    'meta.star.panelTitle': 'Star Relay · Gentle Challenge',
    'meta.star.difficulty': 'Low-intensity',
    'meta.star.metricOne': 'Lit',
    'meta.star.metricTwo': 'Countdown',
    'meta.star.startTitle': 'Raise both hands to light up the stars',
    'meta.star.startHint': 'Move either hand into a light dot and hold briefly to light it.',
    'meta.star.g1l': 'Left hand to dot',
    'meta.star.g1a': 'Enter the glow',
    'meta.star.g2l': 'Right hand to dot',
    'meta.star.g2a': 'Enter the glow',
    'meta.star.g3l': 'Hold briefly',
    'meta.star.g3a': 'Light it up',
    'meta.star.g4l': 'Consecutive hits',
    'meta.star.g4a': 'Boost streak score',

    'meta.guard.name': 'Energy Keeper',
    'meta.guard.subtitle': 'Block falling energy orbs with both hands. Misses cost shield but never end the round.',
    'meta.guard.panelTitle': 'Energy Keeper · Two Hands',
    'meta.guard.difficulty': 'Reaction',
    'meta.guard.metricOne': 'Saves',
    'meta.guard.metricTwo': 'Shield',
    'meta.guard.startTitle': 'Raise both hands to guard the gate',
    'meta.guard.startHint': 'Move your hands to catch falling orbs. Missing one costs a shield bar.',
    'meta.guard.g1l': 'Move left hand',
    'meta.guard.g1a': 'Block the left lane',
    'meta.guard.g2l': 'Move right hand',
    'meta.guard.g2a': 'Block the right lane',
    'meta.guard.g3l': 'Spread both hands',
    'meta.guard.g3a': 'Widen your coverage',
    'meta.guard.g4l': 'Stay in frame',
    'meta.guard.g4a': 'Keep both hands tracked',

    // Message board
    'msg.kicker': 'COMMUNITY',
    'msg.title': 'Message Board',
    'msg.subtitle': 'Share your experience, suggestions or questions to help us improve.',
    'msg.nameLabel': 'Name',
    'msg.namePlaceholder': 'Your name',
    'msg.contentLabel': 'Message',
    'msg.contentPlaceholder': 'Leave a message or suggestion…',
    'msg.submit': 'Post',
    'msg.count': '{count} messages',
    'msg.empty': 'No messages yet. Be the first to leave one!',
    'msg.loading': 'Loading messages…',
    'msg.loadError': 'Message board is temporarily unavailable. Make sure the backend is running (npm run server).',
    'msg.sendError': 'Failed to send. Please try again later.',
    'msg.success': 'Message posted!',
    'msg.nameRequired': 'Please enter your name',
    'msg.contentRequired': 'Please enter a message',
    'msg.justNow': 'Just now',
    'msg.minutesAgo': '{n} min ago',
    'msg.hoursAgo': '{n} h ago',
    'msg.daysAgo': '{n} d ago',
    'msg.langZh': 'Chinese',
    'msg.langEn': 'English',

    // Leaderboard
    'lb.kicker': 'LEADERBOARD',
    'lb.title': 'Score Leaderboard',
    'lb.subtitle': 'See who rules the arena',
    'lb.empty': 'No scores yet. Be the first to set one!',
    'lb.loadError': 'Leaderboard is temporarily unavailable. Make sure the backend is running (npm run server).',
    'lb.you': 'You',
    'lb.defaultName': 'Player',
    'lb.newRecord': 'New record',

    // Footer
    'footer.tagline': 'Rediscover the joy of games with your body',
    'footer.sub': 'Pose tracking · Local data storage · Best in a bright room',
  },
};

let currentLang = 'en';

function getLang() {
  return currentLang;
}

function t(key) {
  return I18N[currentLang]?.[key] ?? I18N.en[key] ?? key;
}

function tf(key, params) {
  return String(t(key)).replace(/\{(\w+)\}/g, (match, name) => (params && name in params ? params[name] : match));
}

function applyStaticTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
  });

  // 同步 SEO meta 标签（description / OG / Twitter）跟随当前语言
  const seoMetaMap = {
    'meta[name="description"]': 'seo.desc',
    'meta[property="og:title"]': 'seo.title',
    'meta[property="og:description"]': 'seo.desc',
    'meta[name="twitter:title"]': 'seo.title',
    'meta[name="twitter:description"]': 'seo.desc',
  };
  Object.entries(seoMetaMap).forEach(([selector, key]) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute('content', t(key));
  });
}

function setHtmlLang(lang) {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
}

function readSavedLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === 'zh' || saved === 'en' ? saved : null;
  } catch (err) {
    return null;
  }
}

function saveLang(lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch (err) {
    // 忽略隐私模式 / 存储被禁用的情况
  }
}

function initLanguage() {
  const saved = readSavedLang();
  if (saved) {
    currentLang = saved;
  } else {
    currentLang = (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  }
  setHtmlLang(currentLang);
  applyStaticTranslations();
  return currentLang;
}

function setLang(lang) {
  currentLang = lang === 'zh' ? 'zh' : 'en';
  setHtmlLang(currentLang);
  saveLang(currentLang);
  applyStaticTranslations();
  return currentLang;
}

export { I18N, getLang, initLanguage, setLang, t, tf };
