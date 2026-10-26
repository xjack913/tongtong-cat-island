// 桐桐貓貓島：串起 3D 場景、跳臺大按鈕、表演區按鈕、貓貓日記、學習數學島改作業、排行榜與卡片。所有資料文字一律用 textContent。
import {
  LEVELS, LEVEL_KEYS, PERFECT, TRICKS, DIARY_MAX, DIARY_SEED, makeCats, personality, sanitizeRecords, sanitizeDiaries, composeDiary, dateText,
  leaderboard, bestPerCat, topRecord, judgeJump, starsText, mulberry32,
} from './logic.js';
import { MATH_UNITS, dayKey, dailyClass, dailyHomework, sanitizeLearnDay, sanitizeLearnStats } from './math.js';
import { LESSONS } from './lessons.js';
import { drawFigure } from './figures.js';
import { zhuyin } from './zhuyin.js';
import { createScene } from './scene.js';

const STORE_KEY = 'tong-cat-island-v1';
const RING = 2 * Math.PI * 54;
const NAV = [
  { id: 'home', label: '貓貓之家' },
  { id: 'low', label: '低階跳臺', level: 'low' },
  { id: 'mid', label: '中階跳臺', level: 'mid' },
  { id: 'high', label: '高階跳臺', level: 'high' },
  { id: 'stage', label: '表演區' },
  { id: 'diary', label: '日記區' },
  { id: 'learn', label: '學習數學島' },
  { id: 'boxes', label: '多多紙箱區' },
  { id: 'combo', label: '合體公園' },
  { id: 'park1', label: '紙箱公園' },
  { id: 'park2', label: '魚池公園' },
  { id: 'rank', label: '排行榜' },
  { id: 'coach', label: '貓貓教練' },
  { id: 'overview', label: '看全島' },
];
const ISLAND_COPY = {
  home: { label: '島的中間', title: '貓貓之家', lede: '島上 50 隻貓貓的家。屋頂上的招牌，是島主桐桐的印章。', text: '跳累的貓會回來睡貓床、吃飯喝水，有時候還會躲進屋子裡。' },
  boxes: { label: '躲貓貓的島', title: '多多紙箱區', lede: '滿地都是紙箱，貓貓最愛鑽進去躲起來。', text: '有的貓只露出耳朵，有的整隻躲起來，紙箱還會晃來晃去。點一下紙箱，看看誰躲在裡面！' },
  combo: { label: '休息的島', title: '合體公園', lede: '紙箱、魚池、水和飼料，全部合在一起的公園。', text: '貓貓可以躲紙箱、坐在池邊看魚，渴了喝水、餓了吃飼料。' },
  park1: { label: '休息的島', title: '紙箱公園', lede: '跳累了就來這裡休息。', text: '長椅可以趴著睡，角落的紙箱最受歡迎，貓貓一看到就想鑽進去。' },
  park2: { label: '休息的島', title: '魚池公園', lede: '跳累了就來這裡休息。', text: '池子裡有三條錦鯉游來游去，貓貓最愛坐在旁邊看。' },
};
const LEVEL_HINT = {
  low: '一直按住，能量滿了就放開。',
  mid: '能量條會上上下下，最滿的時候放開！',
  high: '能量條跑很快，看準最滿的時候放開！',
};

const $ = (id) => document.getElementById(id);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// GA4 玩法事件：只有 tong.xjack.tw 會載 GA（ga.js），其他地方沒有 gtag 就什麼都不做
function track(name, params = {}) {
  if (typeof window.gtag === 'function') window.gtag('event', name, params);
}

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function writeStore(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {
    // 私密視窗或封鎖網站資料時存不了，這一輪的成績就只留在畫面上
  }
}

// 音效全部用 Web Audio 現場合成，不載入任何檔案；要等使用者點過畫面才會出聲
function createSound(enabled) {
  let ctx = null;
  let on = enabled;
  let charge = null;
  function audio() {
    if (!on) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        ctx = new AC();
      } catch {
        return null;
      }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  function tone(type, from, to, duration, gain = 0.18, delay = 0) {
    const c = audio();
    if (!c) return;
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + duration);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g).connect(c.destination);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }
  const effects = {
    boing() {
      tone('sine', 150, 620, 0.32, 0.2);
    },
    land() {
      tone('triangle', 240, 90, 0.2, 0.16);
    },
    record() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone('triangle', f, f * 1.01, 0.22, 0.14, i * 0.09));
    },
    spin() {
      tone('sine', 280, 940, 0.55, 0.12);
    },
    wave() {
      tone('triangle', 660, 700, 0.16, 0.13);
      tone('triangle', 880, 930, 0.22, 0.13, 0.18);
    },
    sing() {
      [783.99, 880, 987.77, 880, 783.99, 659.25].forEach((f, i) => tone('triangle', f, f * 1.015, 0.2, 0.12, i * 0.24));
    },
    whistle() {
      tone('sine', 2100, 2300, 0.12, 0.1);
      tone('sine', 2100, 2350, 0.16, 0.1, 0.19);
    },
    stamp() {
      tone('sine', 230, 110, 0.16, 0.26);
      tone('triangle', 900, 1350, 0.1, 0.07, 0.03);
    },
    pop() {
      tone('sine', 420, 900, 0.12, 0.14);
    },
    page() {
      tone('triangle', 520, 700, 0.08, 0.06);
    },
    // 拍手：幾段很短的雜音
    clap() {
      const c = audio();
      if (!c) return;
      const length = Math.floor(c.sampleRate * 0.08);
      const buffer = c.createBuffer(1, length, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      for (let k = 0; k < 6; k++) {
        const t = c.currentTime + k * 0.12 + Math.random() * 0.03;
        const src = c.createBufferSource();
        src.buffer = buffer;
        const filter = c.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1500 + Math.random() * 600;
        filter.Q.value = 0.9;
        const g = c.createGain();
        g.gain.value = 0.45;
        src.connect(filter).connect(g).connect(c.destination);
        src.start(t);
      }
    },
    meow() {
      const c = audio();
      if (!c) return;
      const t = c.currentTime;
      const pitch = 0.9 + Math.random() * 0.25;
      const osc = c.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(470 * pitch, t);
      osc.frequency.linearRampToValueAtTime(760 * pitch, t + 0.12);
      osc.frequency.linearRampToValueAtTime(520 * pitch, t + 0.42);
      const filter = c.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 3;
      filter.frequency.setValueAtTime(900, t);
      filter.frequency.linearRampToValueAtTime(1800, t + 0.1);
      filter.frequency.linearRampToValueAtTime(800, t + 0.42);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.46);
      osc.connect(filter).connect(g).connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    },
  };
  return {
    get on() {
      return on;
    },
    set(value) {
      on = value;
      if (!on) this.stopCharge();
    },
    unlock() {
      audio();
    },
    play(name) {
      if (on && effects[name]) effects[name]();
    },
    startCharge() {
      const c = audio();
      if (!c) return;
      this.stopCharge();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = 180;
      gain.gain.value = 0.05;
      osc.connect(gain).connect(c.destination);
      osc.start();
      charge = { osc, gain };
    },
    updateCharge(level) {
      if (charge && ctx) charge.osc.frequency.setTargetAtTime(180 + level * 520, ctx.currentTime, 0.03);
    },
    stopCharge() {
      if (!charge || !ctx) return;
      const { osc, gain } = charge;
      gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03);
      osc.stop(ctx.currentTime + 0.15);
      charge = null;
    },
  };
}

function start(hotData = {}) {
  const cats = makeCats();
  const stored = readStore();
  let records = sanitizeRecords(hotData.records || stored.records, cats.length);
  let jumpCount = records.reduce((max, r) => Math.max(max, r.at), 0);
  const sound = createSound(stored.sound !== false);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let focus = 'overview';
  let rankLevel = 'all';
  let openCatIndex = null;
  let openIslandId = null;
  let holding = false;
  let toastTimer = 0;
  let resultTimer = 0;
  let coachOpen = false;
  let followingCoach = false;
  let learnOpen = false;

  // 學習數學島：今天的作業改到哪裡、桐桐老師一共改了幾張、一次就改對幾張
  let learnDay = sanitizeLearnDay(stored.learn && stored.learn.day, dayKey());
  const learnStats = sanitizeLearnStats(stored.learn);

  // 貓貓日記：舊到新排；第一次打開新版的島時先放三篇介紹新島的日記
  let diaries = sanitizeDiaries(hotData.diaries || stored.diaries, cats.length);
  let diarySeq = diaries.reduce((max, d) => Math.max(max, d.id), 0);
  if (!stored.diarySeeded && !hotData.diaries && !diaries.length) {
    DIARY_SEED.forEach((seed) => diaries.push({ id: ++diarySeq, cat: seed.cat, date: dateText(Date.now()), lines: seed.lines.slice(), paws: 0 }));
  }
  if (!stored.diarySeeded) writeStore({ ...stored, diaries, diarySeeded: true });
  const memories = new Map();
  let diaryPage = 0;
  let diaryOpen = false;
  let seenId = diarySeq;
  let newAfter = diarySeq;
  let unread = 0;

  window.claude?.hot?.snapshot?.(() => ({ records, diaries }));

  function save() {
    writeStore({ records, sound: sound.on, diaries, diarySeeded: true, learn: { day: learnDay, ...learnStats } });
  }

  // 成績太多時只留每隻貓在每座跳臺的最佳，加上最近 1000 跳
  function prune() {
    if (records.length <= 4000) return;
    const keep = new Set(records.slice(-1000));
    LEVEL_KEYS.forEach((level) => bestPerCat(records, level).forEach((r) => keep.add(r)));
    records = records.filter((r) => keep.has(r));
  }

  const scene = createScene($('scene'), {
    cats,
    reducedMotion,
    hooks: {
      onJump,
      sound(name, islandId) {
        if (name === 'meow' || islandId === focus || (name === 'whistle' && followingCoach)) sound.play(name);
      },
      // 貓今天做過的事先記著，等牠去日記區寫
      event(index, data) {
        const list = memories.get(index) || [];
        list.push(data);
        if (list.length > 10) list.shift();
        memories.set(index, list);
      },
      diary: writeDiary,
    },
  });

  // ---------- 一跳到最高點：記成績、更新排行榜、破紀錄就慶祝 ----------
  function onJump(info) {
    const judge = judgeJump(records, info);
    jumpCount += 1;
    records.push({ cat: info.cat, level: info.level, cm: info.cm, tong: !!info.tong, at: jumpCount });
    prune();
    save();
    refreshBoards();
    const name = cats[info.cat].name;
    const level = LEVELS[info.level];
    if (info.tong) {
      track('tong_jump', {
        level: info.level, cm: info.cm, perfect: info.perfect ? 'yes' : 'no',
        record: judge.island ? 'island' : judge.platform ? 'platform' : judge.personal ? 'personal' : 'none',
      });
      let note = '';
      if (judge.island && !judge.first) note = '全島新紀錄！';
      else if (judge.platform) note = `${level.short}跳臺新紀錄！`;
      else if (judge.personal) note = '牠自己的新紀錄！';
      showResult(`${name}跳了 ${info.cm} 公分${info.perfect ? '，完美跳！' : '！'}`, note);
      if (judge.island || judge.platform) sound.play('record');
    }
    if (judge.island && !judge.first && records.length > 3) {
      showToast('全島新紀錄！', `${name}在${level.name}跳了 ${info.cm} 公分`);
      if (!info.tong && info.platform === focus) sound.play('record');
    }
    return judge;
  }

  function refreshBoards() {
    const top = leaderboard(records, 'all', 10);
    const best = {};
    LEVEL_KEYS.forEach((key) => {
      const r = topRecord(records, key);
      if (r) best[key] = { cm: r.cm, name: cats[r.cat].name };
    });
    scene.updateBoard({
      champions: top.slice(0, 3).map((r) => r.cat),
      best,
      top: top.slice(0, 5).map((r) => ({ name: cats[r.cat].name, cm: r.cm, level: r.level })),
    });
    renderMini(top);
    if (!$('rank-card').hidden) renderRank();
    if (openCatIndex !== null) renderCat();
    renderDockBest();
  }

  function renderMini(top) {
    const list = $('mini-list');
    list.replaceChildren();
    top.slice(0, 3).forEach((r) => {
      const li = el('li', 'mini-row');
      li.append(el('span', `medal medal--${r.rank}`, String(r.rank)), el('span', 'mini-row__name', cats[r.cat].name));
      const cm = el('span', 'mini-row__cm', String(r.cm));
      cm.append(el('small', '', '公分'));
      li.append(cm);
      list.append(li);
    });
    $('mini-empty').hidden = top.length > 0;
  }

  // ---------- 導覽 ----------
  const nav = $('island-nav');
  NAV.forEach((item) => {
    const button = el('button', `sticker nav-chip${item.level ? ` nav-chip--${item.level}` : ''}`);
    button.type = 'button';
    button.dataset.island = item.id;
    button.setAttribute('aria-pressed', 'false');
    if (item.level) button.append(el('span', 'nav-chip__stars', starsText(item.level)));
    button.append(el('span', '', item.label));
    if (item.id === 'diary') {
      const badge = el('span', 'nav-chip__badge');
      badge.id = 'diary-badge';
      badge.hidden = true;
      button.append(badge);
    }
    button.addEventListener('click', () => (item.id === 'coach' ? findCoach() : goIsland(item.id)));
    nav.append(button);
  });

  // 還沒看過的新日記數量，標在日記區的導覽鈕上
  function updateBadge() {
    const badge = $('diary-badge');
    badge.hidden = unread === 0;
    badge.textContent = unread > 9 ? '9+' : String(unread);
    badge.setAttribute('aria-label', `${unread} 篇新日記`);
  }

  function updateNav() {
    nav.querySelectorAll('.nav-chip').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.island === focus));
    });
  }

  const bottom = $('bottom');
  function measureBottom() {
    $('app').style.setProperty('--bottom-h', `${Math.ceil(bottom.getBoundingClientRect().height) + 12}px`);
  }
  if ('ResizeObserver' in window) new ResizeObserver(measureBottom).observe(bottom);
  measureBottom();

  // 介面浮層佔掉的範圍，讓鏡頭把目標放在看得到的地方
  function insets() {
    const stage = $('app').getBoundingClientRect();
    const hud = document.querySelector('.hud').getBoundingClientRect();
    const result = { bottom: Math.max(0, stage.bottom - bottom.getBoundingClientRect().top), top: Math.max(70, hud.bottom - stage.top), left: 0 };
    const card = [...document.querySelectorAll('.card')].find((c) => !c.hidden);
    if (card) {
      const rect = card.getBoundingClientRect();
      if (window.innerWidth >= 900) result.left = rect.right - stage.left;
      else result.bottom = Math.max(result.bottom, stage.bottom - rect.top);
    }
    return result;
  }

  // quiet：從島上的東西點過來的（例如點黑板），不用再跳學習數學島的提示
  function goIsland(id, quiet = false) {
    closeCards();
    focus = id;
    track('island_view', { island: id });
    followingCoach = false;
    const level = LEVELS[id];
    const dock = $('dock');
    dock.hidden = !level;
    $('stage-dock').hidden = id !== 'stage';
    if (level) {
      dock.className = `dock dock--${id}`;
      $('dock-level').textContent = `${starsText(id)} ${level.name}`;
      $('dock-hint').textContent = LEVEL_HINT[id];
      $('dock-result').textContent = '';
      renderDockBest();
      lastDock = {};
    } else if (id === 'stage') {
      lastDock = {};
    } else if (id === 'rank') {
      openRank();
    } else if (id === 'diary') {
      openDiary(0);
    } else if (id === 'learn') {
      // 讓桐桐自己選：點黑板上課，點老師或講台改作業
      if (!quiet) showToast('學習數學島', '點黑板聽貓貓老師上課，點老師或講台改作業');
    } else if (ISLAND_COPY[id]) {
      openIsland(id);
    }
    measureBottom();
    scene.focus(id, insets());
    updateNav();
  }

  // ---------- 跳臺大按鈕 ----------
  const jumpBtn = $('jump-btn');
  const jumpFill = $('jump-fill');
  let lastDock = {};

  function setText(id, text) {
    if (lastDock[id] === text) return;
    lastDock[id] = text;
    $(id).textContent = text;
  }

  function renderDockBest() {
    if (!LEVELS[focus]) return;
    const r = topRecord(records, focus);
    const node = $('dock-best');
    node.replaceChildren();
    if (!r) {
      node.textContent = '這座跳臺還沒有紀錄';
      return;
    }
    node.append('這座最高：', el('b', '', String(r.cm)), ` 公分（${cats[r.cat].name}）`);
  }

  function showResult(text, note) {
    const node = $('dock-result');
    node.textContent = note ? `${text}${note}` : text;
    clearTimeout(resultTimer);
    resultTimer = setTimeout(() => {
      node.textContent = '';
    }, 4500);
  }

  function pressJump() {
    if (holding || !LEVELS[focus]) return;
    sound.unlock();
    if (!scene.press()) return;
    holding = true;
    jumpBtn.classList.add('is-holding');
    sound.startCharge();
  }

  function releaseJump() {
    if (!holding) return;
    holding = false;
    jumpBtn.classList.remove('is-holding', 'is-perfect');
    sound.stopCharge();
    scene.release();
  }

  jumpBtn.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    pressJump();
    if (holding) {
      try {
        jumpBtn.setPointerCapture(event.pointerId);
      } catch {
        // 有些瀏覽器不支援，放開時仍會收到 pointerup
      }
    }
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => jumpBtn.addEventListener(type, releaseJump));
  jumpBtn.addEventListener('contextmenu', (event) => event.preventDefault());
  document.addEventListener('keydown', (event) => {
    if ((event.code === 'Space' || event.code === 'Enter') && !$('dock').hidden && !event.repeat) {
      const tag = document.activeElement && document.activeElement.tagName;
      if (event.code === 'Enter' && tag === 'BUTTON' && document.activeElement !== jumpBtn) return;
      event.preventDefault();
      pressJump();
    }
  });
  document.addEventListener('keyup', (event) => {
    if (event.code === 'Space' || event.code === 'Enter') releaseJump();
  });
  window.addEventListener('blur', releaseJump);

  function tick() {
    requestAnimationFrame(tick);
    if (!$('stage-dock').hidden) tickStage();
    if ($('dock').hidden || !LEVELS[focus]) return;
    const view = scene.platformView(focus);
    if (!view) return;
    const charging = view.charging !== null;
    if (!charging && holding) releaseJump();
    jumpBtn.disabled = !(charging || view.ready !== null);
    setText('jump-label', charging ? '放開！' : view.ready !== null ? '按住' : '等一下');
    jumpFill.style.strokeDashoffset = String(RING * (1 - (charging ? view.meter : 0)));
    jumpBtn.classList.toggle('is-perfect', charging && view.meter >= PERFECT);
    if (charging) sound.updateCharge(view.meter);
    const who = charging ? view.charging : view.ready;
    let line;
    if (who !== null) line = `輪到${cats[who].name}了！`;
    else if (view.climber !== null) line = `${cats[view.climber].name}正在爬上去`;
    else if (view.queue.length) line = `${cats[view.queue[0]].name}準備上去`;
    else line = view.incoming ? '貓貓跑過來了…' : '正在叫貓貓過來…';
    setText('dock-who', line);
    const waiting = view.queue.slice(who === null && view.climber === null ? 1 : 0, 4).map((i) => cats[i].name);
    setText('dock-next', waiting.length ? `排隊中：${waiting.join('、')}` : '');
  }
  requestAnimationFrame(tick);

  // ---------- 表演區按鈕：點動作，臺上的貓就表演；拍手，臺下的貓一起拍 ----------
  const trickButtons = [...document.querySelectorAll('[data-trick]')];
  function tickStage() {
    const view = scene.stageView();
    let who;
    if (view.performer !== null) who = view.ready ? `臺上是${cats[view.performer].name}！` : `${cats[view.performer].name}正在走上舞臺`;
    else if (view.waiting !== null) who = `${cats[view.waiting].name}準備上臺`;
    else who = '正在叫貓貓上臺…';
    setText('stage-who', who);
    const next = view.performer !== null && view.waiting !== null ? `，下一個是${cats[view.waiting].name}` : '';
    setText('stage-next', `臺下有 ${view.audience} 隻貓在看${next}`);
    const key = `${view.ready}|${view.trick}`;
    if (lastDock.trickKey === key) return;
    lastDock.trickKey = key;
    trickButtons.forEach((button) => {
      button.disabled = !view.ready;
      button.classList.toggle('is-on', button.dataset.trick === view.trick);
    });
  }
  trickButtons.forEach((button) => button.addEventListener('click', () => {
    sound.unlock();
    if (scene.stageTrick(button.dataset.trick)) {
      track('stage_trick', { trick: button.dataset.trick });
      return;
    }
    // 上一個動作還沒做完：鈕抖一下
    button.classList.remove('is-nope');
    void button.offsetWidth;
    button.classList.add('is-nope');
  }));
  $('clap-btn').addEventListener('click', () => {
    sound.unlock();
    scene.stageClap();
    sound.play('clap');
    track('stage_clap');
  });

  // ---------- 注音：日記區、學習數學島卡片上的字都加注音 ----------
  // 字型本身就帶注音，這裡只替破音字選讀音；卡片上的字一換就自動補上（題目圖裡的字也一樣）
  function markZhuyin(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = zhuyin(node.nodeValue);
      if (text !== node.nodeValue) node.nodeValue = text;
      return;
    }
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) markZhuyin(t);
  }
  const zhuyinWatch = new MutationObserver((changes) => changes.forEach((c) => {
    if (c.type === 'characterData') markZhuyin(c.target);
    else c.addedNodes.forEach(markZhuyin);
  }));
  ['diary-card', 'learn-card', 'lesson-card'].forEach((id) => {
    markZhuyin($(id));
    zhuyinWatch.observe($(id), { childList: true, characterData: true, subtree: true });
  });

  // ---------- 貓貓日記 ----------
  function writeDiary(index) {
    const lines = composeDiary(cats[index], memories.get(index) || [], Math.random());
    memories.delete(index);
    diaries.push({ id: ++diarySeq, cat: index, date: dateText(Date.now()), lines, paws: 0 });
    if (diaries.length > DIARY_MAX) diaries = diaries.slice(-DIARY_MAX);
    save();
    if (diaryOpen) {
      // 正在看舊的那一篇或正在唸的時候，頁碼跟著往後挪，畫面上還是同一篇
      if (diaryPage > 0 || speaking === diaryReader) {
        diaryPage += 1;
        renderDiary(false);
        showToast(`${cats[index].name}寫好日記了！`, '翻回第一頁就看得到');
      } else {
        renderDiary();
      }
    } else {
      unread += 1;
      updateBadge();
      if (focus === 'diary') showToast(`${cats[index].name}寫好日記了！`, '點日記區看看牠寫了什麼');
    }
  }

  function openDiary(page = 0) {
    closeCards();
    diaryOpen = true;
    diaryPage = page;
    newAfter = seenId;
    seenId = diarySeq;
    unread = 0;
    updateBadge();
    renderDiary();
    $('diary-card').hidden = false;
    $('diary-card').scrollTop = 0;
  }

  function currentDiary() {
    return diaries[diaries.length - 1 - diaryPage] || null;
  }

  function renderWriters() {
    const writing = scene.writers();
    $('diary-writers').textContent = writing.length
      ? `現在有 ${writing.length} 隻貓在書桌前寫日記：${writing.map((i) => cats[i].name).join('、')}`
      : '貓貓坐到書桌前寫好日記，就會收進這本日記本。';
  }

  function renderDiary(stop = true) {
    renderWriters();
    const total = diaries.length;
    $('diary-empty').hidden = total > 0;
    $('diary-page').hidden = total === 0;
    $('diary-controls').hidden = total === 0;
    if (!total) return;
    diaryPage = Math.max(0, Math.min(total - 1, diaryPage));
    const diary = currentDiary();
    const cat = cats[diary.cat];
    $('diary-dot').style.background = cat.coat.body;
    $('diary-cat').textContent = cat.name;
    $('diary-date').textContent = diary.date;
    $('diary-new').hidden = diary.id <= newAfter;
    const lines = $('diary-lines');
    lines.replaceChildren(...diary.lines.map((line) => el('p', '', line)));
    renderPaws(diary, false);
    $('diary-index').textContent = `第 ${diaryPage + 1} 篇，共 ${total} 篇`;
    $('diary-prev').disabled = diaryPage === 0;
    $('diary-next').disabled = diaryPage >= total - 1;
    if (stop && speaking === diaryReader) stopSpeaking();
  }

  // 貓掌印蓋在日記右下角，位置跟著這篇日記固定，重新打開也一樣
  function renderPaws(diary, fresh) {
    const box = $('diary-paws');
    box.replaceChildren();
    const shown = Math.min(diary.paws, 16);
    for (let k = 0; k < shown; k++) {
      const r = mulberry32(diary.id * 131 + k);
      const paw = el('span', `paw-print${fresh && k === shown - 1 ? ' paw-print--new' : ''}`);
      paw.style.left = `${6 + r() * 88}%`;
      paw.style.top = `${30 + r() * 46}%`;
      paw.style.setProperty('--turn', `${Math.round(r() * 70 - 35)}deg`);
      box.append(paw);
    }
    $('diary-paw-count').textContent = diary.paws ? `已經蓋了 ${diary.paws} 個貓掌印` : '還沒有貓掌印，蓋一個給牠吧！';
  }

  $('diary-stamp').addEventListener('click', () => {
    const diary = currentDiary();
    if (!diary) return;
    sound.unlock();
    diary.paws += 1;
    save();
    renderPaws(diary, true);
    // 掌印蓋在日記最下面，可能被按鈕列擋住：捲過去讓她看到
    $('diary-paw-count').scrollIntoView({ block: 'nearest' });
    sound.play('stamp');
    scene.meow(diary.cat);
    track('diary_stamp');
  });
  $('diary-prev').addEventListener('click', () => {
    diaryPage -= 1;
    sound.play('page');
    renderDiary();
    $('diary-card').scrollTop = 0;
  });
  $('diary-next').addEventListener('click', () => {
    diaryPage += 1;
    sound.play('page');
    renderDiary();
    $('diary-card').scrollTop = 0;
  });

  // ---------- 唸出來：用裝置內建的中文語音（日記、作業題目、老師的話共用） ----------
  // owner 是按下去的那顆鈕，唸的時候鈕上的字換成「停下來」
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  let speaking = null;
  let speechToken = 0;
  function pickVoice() {
    const voices = synth.getVoices();
    return voices.find((v) => /zh[-_]TW/i.test(v.lang))
      || voices.find((v) => /zh[-_](HK|Hant)/i.test(v.lang))
      || voices.find((v) => /^zh/i.test(v.lang))
      || null;
  }
  function markReader(owner, on) {
    if (!owner) return;
    owner.button.setAttribute('aria-pressed', String(on));
    owner.label.textContent = on ? '停下來' : owner.idle;
  }
  function stopSpeaking() {
    speechToken += 1;
    if (synth && (synth.speaking || synth.pending)) synth.cancel();
    markReader(speaking, false);
    speaking = null;
  }
  function speak(text, owner = null) {
    if (!synth) return;
    stopSpeaking();
    const token = speechToken;
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = 'zh-TW';
    const voice = pickVoice();
    if (voice) speech.voice = voice;
    speech.rate = 0.9;
    speech.pitch = 1.1;
    const done = () => {
      if (token !== speechToken) return;
      markReader(speaking, false);
      speaking = null;
    };
    speech.onend = done;
    speech.onerror = done;
    synth.speak(speech);
    speaking = owner;
    markReader(owner, true);
  }
  const diaryReader = { button: $('diary-read'), label: $('diary-read-label'), idle: '唸給我聽' };
  const learnReader = { button: $('learn-read'), label: $('learn-read-label'), idle: '唸題目' };
  if (!synth) {
    $('diary-read').hidden = true;
    $('learn-read').hidden = true;
  }
  $('diary-read').addEventListener('click', () => {
    const diary = currentDiary();
    if (!diary) return;
    if (speaking === diaryReader) {
      stopSpeaking();
      return;
    }
    speak(`${cats[diary.cat].name}的日記。${diary.date}。${diary.lines.join('')}`, diaryReader);
    track('read_aloud', { what: 'diary' });
  });

  // ---------- 貓貓教練卡 ----------
  function openCoach() {
    sound.unlock();
    closeCards();
    coachOpen = true;
    renderCoach();
    $('coach-card').hidden = false;
    sound.play('whistle');
  }

  function renderCoach() {
    const info = scene.coachInfo();
    $('coach-doing').textContent = info.doing;
    $('coach-sent').textContent = info.sent ? `這次已經叫了 ${info.sent} 隻貓去跳` : '還沒有，正在找晃來晃去的貓';
    $('coach-follow').textContent = followingCoach ? '停止跟著' : '跟著教練走';
  }

  function followCoach() {
    focus = 'coach';
    $('dock').hidden = true;
    $('stage-dock').hidden = true;
    measureBottom();
    scene.follow('coach', insets());
    followingCoach = true;
    updateNav();
    renderCoach();
  }

  // 導覽列的「貓貓教練」：打開教練卡，鏡頭跟著教練走
  function findCoach() {
    track('island_view', { island: 'coach' });
    openCoach();
    followCoach();
  }

  $('coach-follow').addEventListener('click', () => {
    if (followingCoach) {
      scene.clearFollow();
      followingCoach = false;
      focus = 'free';
      updateNav();
      renderCoach();
    } else {
      followCoach();
    }
  });

  // ---------- 學習數學島：桐桐老師改作業 ----------
  // 每天換 10 隻貓來上課，每隻寫一張（9 個單元都會出到）；10 張改完今天就結束，明天換別的貓。
  // 桐桐按「寫對了／寫錯了」，改錯第一次老師給提示，第二次老師直接講解
  let stack = [];
  let stackKey = '';
  let sheetIndex = 0;

  // 換一天就換一批貓和題目；同一天改到哪裡記在 learnDay，重新整理也接得下去
  function loadDay() {
    const key = dayKey();
    if (learnDay.key !== key) {
      learnDay = sanitizeLearnDay(null, key);
      save();
    }
    if (stackKey === key) return;
    const classCats = dailyClass(key, cats.length);
    stack = dailyHomework(key).map((p, i) => ({ p, cat: classCats[i], tries: 0, done: learnDay.results[i] !== null, result: learnDay.results[i] }));
    stackKey = key;
    sheetIndex = stack.findIndex((s) => !s.done);
    if (sheetIndex < 0) sheetIndex = stack.length;
    scene.setClass(classCats);
  }
  loadDay();

  function openLearn() {
    sound.unlock();
    closeCards();
    learnOpen = true;
    loadDay();
    renderLearn();
    $('learn-card').hidden = false;
    showSheetTop();
  }

  // 字有注音、卡片比較長：換一張作業紙就從頭看起，但貓寫的答案一定要看得到，不能被按鈕列擋住
  function showSheetTop() {
    $('learn-card').scrollTop = 0;
    if (!$('sheet-body').hidden) $('sheet-ans').scrollIntoView({ block: 'nearest' });
  }

  function setTip(kind, text) {
    const tip = $('learn-tip');
    tip.hidden = !text;
    if (!text) return;
    tip.className = `tip tip--${kind}`;
    $('learn-tip-text').textContent = text;
    tip.style.animation = 'none';
    void tip.offsetWidth;
    tip.style.animation = '';
    // 字有注音、卡片比較長，老師的話可能在下面：捲過去
    tip.scrollIntoView({ block: 'nearest' });
  }

  function renderLearn() {
    const dots = $('learn-dots');
    dots.replaceChildren(...stack.map((s, i) => {
      const dot = el('li', s.result === 'good' ? 'is-good' : s.result === 'help' ? 'is-help' : i === sheetIndex ? 'is-now' : '');
      dot.setAttribute('aria-label', `第 ${i + 1} 張${s.result === 'good' ? '，一次就改對' : s.result === 'help' ? '，老師幫忙' : ''}`);
      return dot;
    }));
    $('learn-stats').textContent = learnStats.graded
      ? `桐桐老師一共改了 ${learnStats.graded} 張，一次就改對 ${learnStats.right} 張。`
      : '點「寫對了」或「寫錯了」幫貓貓改作業。';
    const finished = sheetIndex >= stack.length;
    $('sheet-body').hidden = finished;
    $('sheet-done').hidden = !finished;
    $('learn-unit').hidden = finished;
    $('learn-read').hidden = !synth;
    if (finished) {
      $('grade-ok').hidden = true;
      $('grade-no').hidden = true;
      const good = stack.filter((s) => s.result === 'good').length;
      $('sheet-done-title').textContent = '今天的作業改完了！';
      $('sheet-done-text').textContent = `${good === stack.length ? `${stack.length} 張全部一次就改對，好棒喔！` : `一次就改對 ${good} 張，其他幾張是貓貓老師陪你一起改好的。`}明天會有別的貓來上課。`;
      $('learn-next').hidden = true;
      setTip('', '');
      return;
    }
    const s = stack[sheetIndex];
    const cat = cats[s.cat];
    $('sheet-dot').style.background = cat.coat.body;
    $('sheet-cat').textContent = cat.name;
    $('sheet-unit').textContent = `第 ${s.p.unit} 單元 ${MATH_UNITS[s.p.unit - 1].name}`;
    $('sheet-q').textContent = s.p.text;
    const fig = $('sheet-fig');
    fig.replaceChildren();
    if (s.p.fig) fig.append(drawFigure(s.p.fig));
    fig.hidden = !s.p.fig;
    $('sheet-ans-label').textContent = `${cat.name}寫：`;
    const ans = $('sheet-ans');
    ans.textContent = s.p.catAnswer;
    ans.className = `pencil${s.done ? (s.p.right ? ' is-right' : ' is-wrong') : ''}`;
    $('sheet-fix').hidden = !s.done || s.p.right;
    $('sheet-fix').textContent = `正確答案：${s.p.answer}`;
    $('sheet-seal').hidden = !s.done;
    // 改完這一張：兩顆批改鈕換成「下一張」
    $('grade-ok').hidden = s.done;
    $('grade-no').hidden = s.done;
    $('learn-next').hidden = !s.done;
    $('learn-next').textContent = sheetIndex === stack.length - 1 ? '看結果' : '下一張';
  }

  function grade(saysRight, button) {
    const s = stack[sheetIndex];
    if (!s || s.done) return;
    sound.unlock();
    const name = cats[s.cat].name;
    if (saysRight === s.p.right) {
      s.done = true;
      s.result = s.tries === 0 ? 'good' : 'help';
      learnDay.results[sheetIndex] = s.result;
      learnStats.graded += 1;
      if (s.tries === 0) learnStats.right += 1;
      save();
      track('homework_grade', { unit: s.p.unit, result: s.tries === 0 ? 'first_try' : 'after_hint', cat_right: s.p.right ? 'yes' : 'no' });
      // 先畫好紅筆批改（作業紙會變高），再出現老師的話，捲動位置才算得準
      renderLearn();
      setTip('good', s.p.right ? `改對了！${name}寫對了。` : `改對了！${name}寫錯了，答案應該是 ${s.p.answer}。`);
      sound.play('stamp');
      scene.meow(s.cat);
      scene.note(s.cat, { type: 'homework', right: s.p.right });
      if (s.tries === 0 && Math.random() < 0.4) scene.teacherSay('改得好！', 1.8);
      if (speaking === learnReader) stopSpeaking();
      return;
    }
    button.classList.remove('is-nope');
    void button.offsetWidth;
    button.classList.add('is-nope');
    if (s.tries === 0) {
      s.tries = 1;
      const text = `再看一次喔！${s.p.hint}`;
      setTip('warn', text);
      scene.teacherSay('再看一次喔！');
      speak(`貓貓老師說：${text}`);
      return;
    }
    s.tries = 2;
    s.done = true;
    s.result = 'help';
    learnDay.results[sheetIndex] = s.result;
    learnStats.graded += 1;
    save();
    track('homework_grade', { unit: s.p.unit, result: 'explained', cat_right: s.p.right ? 'yes' : 'no' });
    const text = `${s.p.why}${name}寫「${s.p.catAnswer}」，${s.p.right ? '是寫對的' : '是寫錯的'}。`;
    renderLearn();
    setTip('explain', text);
    scene.teacherSay('沒關係，我們一起看！');
    scene.note(s.cat, { type: 'homework', right: s.p.right });
    speak(`貓貓老師說：${text}`);
  }
  $('grade-ok').addEventListener('click', (event) => grade(true, event.currentTarget));
  $('grade-no').addEventListener('click', (event) => grade(false, event.currentTarget));

  $('learn-next').addEventListener('click', () => {
    if (sheetIndex >= stack.length) return;
    const next = stack.findIndex((s, i) => i > sheetIndex && !s.done);
    sheetIndex = next < 0 ? stack.length : next;
    if (sheetIndex >= stack.length) track('homework_day_done', { first_try: stack.filter((s) => s.result === 'good').length });
    stopSpeaking();
    setTip('', '');
    sound.play('page');
    renderLearn();
    showSheetTop();
  });

  $('learn-read').addEventListener('click', () => {
    const s = stack[sheetIndex];
    if (!s) return;
    if (speaking === learnReader) {
      stopSpeaking();
      return;
    }
    const name = cats[s.cat].name;
    speak(`${name}的作業。${s.p.speak}${name}寫：${s.p.catAnswer}。`, learnReader);
    track('read_aloud', { what: 'homework' });
  });

  // 點學習數學島上的東西：鏡頭還沒飛過去就先飛過去，再打開卡片
  function atLearn(open) {
    if (focus !== 'learn') goIsland('learn', true);
    open();
  }

  // ---------- 學習數學島：點黑板，貓貓老師上課 ----------
  // 這次考試的範圍是一上 9 個單元：先選單元，老師一頁一頁講（重點、圖、例題），翻到哪一頁就唸哪一頁
  let lessonUnit = null;
  let lessonPage = 0;
  const lessonReader = { button: $('lesson-read'), label: $('lesson-read-label'), idle: '唸給我聽' };
  if (!synth) $('lesson-read').hidden = true;
  // 唸的時候把算式的符號換成字
  const spoken = (text) => text.replace(/＋/g, '加').replace(/−/g, '減').replace(/＝/g, '等於').replace(/□/g, '框框');

  const lessonUnits = $('lesson-units');
  MATH_UNITS.forEach((u) => {
    const chip = el('button', 'unit-chip');
    chip.type = 'button';
    chip.append(el('b', '', String(u.n)), u.name);
    chip.addEventListener('click', () => {
      track('lesson_open', { unit: u.n });
      showLessonPage(u.n, 0);
    });
    lessonUnits.append(chip);
  });

  function openLesson() {
    sound.unlock();
    closeCards();
    lessonUnit = null;
    renderLesson();
    $('lesson-card').hidden = false;
    $('lesson-card').scrollTop = 0;
    scene.teacherSay('我們來上課！', 2.2);
  }

  function showLessonPage(unit, page) {
    lessonUnit = unit;
    lessonPage = page;
    renderLesson();
    $('lesson-card').scrollTop = 0;
    sound.play('page');
    readLesson();
  }

  function backToUnits() {
    stopSpeaking();
    lessonUnit = null;
    renderLesson();
    $('lesson-card').scrollTop = 0;
  }

  function renderLesson() {
    const picking = lessonUnit === null;
    $('lesson-intro').hidden = !picking;
    lessonUnits.hidden = !picking;
    $('lesson-board').hidden = picking;
    $('lesson-dock').hidden = picking;
    if (picking) return;
    const pages = LESSONS[lessonUnit];
    const page = pages[lessonPage];
    $('lesson-unit').textContent = `第 ${lessonUnit} 單元 ${MATH_UNITS[lessonUnit - 1].name}`;
    $('lesson-dots').replaceChildren(...pages.map((_, i) => el('li', i === lessonPage ? 'is-now' : i < lessonPage ? 'is-good' : '')));
    $('lesson-page-title').textContent = page.title;
    $('lesson-lines').replaceChildren(...page.lines.map((line) => el('p', '', line)));
    const fig = $('lesson-fig');
    fig.replaceChildren();
    if (page.fig) fig.append(drawFigure(page.fig));
    fig.hidden = !page.fig;
    $('lesson-ask').textContent = page.ask;
    $('lesson-answer').textContent = page.answer;
    $('lesson-answer').hidden = true;
    $('lesson-reveal').hidden = false;
    $('lesson-prev').disabled = lessonPage === 0;
    $('lesson-next-label').textContent = lessonPage === pages.length - 1 ? '換單元' : '下一頁';
  }

  function readLesson() {
    const page = LESSONS[lessonUnit][lessonPage];
    speak(spoken(`${page.title}。${page.lines.join('')}考考你：${page.ask}`), lessonReader);
  }

  $('lesson-reveal').addEventListener('click', () => {
    const page = LESSONS[lessonUnit][lessonPage];
    $('lesson-answer').hidden = false;
    $('lesson-reveal').hidden = true;
    sound.play('pop');
    speak(spoken(`答案是：${page.answer}`), lessonReader);
    $('lesson-answer').scrollIntoView({ block: 'nearest' });
  });
  $('lesson-prev').addEventListener('click', () => {
    if (lessonPage > 0) showLessonPage(lessonUnit, lessonPage - 1);
  });
  $('lesson-next').addEventListener('click', () => {
    if (lessonPage < LESSONS[lessonUnit].length - 1) showLessonPage(lessonUnit, lessonPage + 1);
    else backToUnits();
  });
  $('lesson-back').addEventListener('click', backToUnits);
  $('lesson-read').addEventListener('click', () => {
    if (speaking === lessonReader) {
      stopSpeaking();
      return;
    }
    readLesson();
    track('read_aloud', { what: 'lesson' });
  });

  // ---------- 破紀錄橫幅 ----------
  function showToast(title, text) {
    const toast = $('toast');
    $('toast-title').textContent = title;
    $('toast-text').textContent = text;
    toast.hidden = false;
    toast.style.animation = 'none';
    void toast.offsetWidth;
    toast.style.animation = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 3400);
  }

  // ---------- 卡片 ----------
  function closeCards() {
    document.querySelectorAll('.card').forEach((card) => {
      card.hidden = true;
    });
    stopSpeaking();
    diaryOpen = false;
    coachOpen = false;
    learnOpen = false;
    openCatIndex = null;
    openIslandId = null;
    $('reset-confirm').hidden = true;
    $('reset-ask').hidden = false;
  }
  document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', closeCards));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeCards();
  });

  $('help-open').addEventListener('click', () => {
    const open = !$('help-card').hidden;
    closeCards();
    $('help-card').hidden = open;
  });

  function soundUi() {
    $('sound-toggle').setAttribute('aria-pressed', String(sound.on));
    $('sound-label').textContent = sound.on ? '聲音開' : '聲音關';
    $('sound-wave').style.display = sound.on ? '' : 'none';
  }
  $('sound-toggle').addEventListener('click', () => {
    sound.set(!sound.on);
    if (sound.on) sound.unlock();
    soundUi();
    save();
  });
  soundUi();

  // 島嶼卡：現在誰在這座島上
  function openIsland(id) {
    const copy = ISLAND_COPY[id];
    closeCards();
    openIslandId = id;
    $('island-label').textContent = copy.label;
    $('island-title').textContent = copy.title;
    $('island-lede').textContent = copy.lede;
    $('island-text').textContent = copy.text;
    renderIsland();
    $('island-card').hidden = false;
  }

  function renderIsland() {
    if (!openIslandId) return;
    const here = scene.islandCats(openIslandId);
    $('island-count').textContent = here.length ? `現在有 ${here.length} 隻貓在這裡` : '現在沒有貓在這裡，等等就會有貓來';
    const box = $('island-cats');
    const key = here.join(',');
    if (box.dataset.key === key) return;
    box.dataset.key = key;
    box.replaceChildren();
    here.forEach((index) => {
      const info = scene.catInfo(index);
      const chip = el('button', 'chip');
      chip.type = 'button';
      const dot = el('i', 'dot');
      dot.style.background = cats[index].coat.body;
      chip.append(dot, cats[index].name);
      if (info && info.sleeping) chip.append(el('small', '', '睡覺中'));
      if (info && info.inside) chip.append(el('small', '', '在屋裡'));
      if (info && info.hiding) chip.append(el('small', '', '躲紙箱'));
      if (info && info.writing) chip.append(el('small', '', '寫日記'));
      if (info && info.performing) chip.append(el('small', '', '表演中'));
      if (info && info.lost) chip.append(el('small', '', '迷路了'));
      chip.addEventListener('click', () => openCat(index));
      box.append(chip);
    });
  }

  // 貓卡
  function openCat(index) {
    sound.unlock();
    closeCards();
    openCatIndex = index;
    scene.meow(index);
    renderCat();
    $('cat-card').hidden = false;
  }

  function renderCat() {
    const index = openCatIndex;
    if (index === null) return;
    const cat = cats[index];
    $('cat-swatch').style.background = cat.coat.body;
    $('cat-coat').textContent = cat.coat.label;
    $('cat-name').textContent = cat.name;
    $('cat-personality').textContent = personality(cat);
    const info = scene.catInfo(index);
    $('cat-doing').textContent = info ? info.doing : '';
    const best = bestPerCat(records).get(index);
    const bestNode = $('cat-best');
    bestNode.replaceChildren();
    if (best) {
      bestNode.append(el('b', '', String(best.cm)), ` 公分（${LEVELS[best.level].name}）`);
      const rank = leaderboard(records, 'all', cats.length).find((r) => r.cat === index);
      if (rank) bestNode.append(`，全島第 ${rank.rank} 名`);
    } else {
      bestNode.textContent = '還沒跳過';
    }
    const levels = $('cat-levels');
    levels.replaceChildren();
    LEVEL_KEYS.forEach((key) => {
      const r = bestPerCat(records, key).get(index);
      const box = el('div', `level-best level-best--${key}`);
      box.append(el('span', '', LEVELS[key].short), el('b', '', r ? String(r.cm) : '—'));
      levels.append(box);
    });
    const following = scene.focusId === 'follow' && !followingCoach;
    $('cat-follow').textContent = following ? '停止跟著' : '跟著牠走';
    const written = diaries.filter((d) => d.cat === index).length;
    $('cat-diary').hidden = written === 0;
    $('cat-diary').textContent = `看牠的日記（${written} 篇）`;
  }

  $('cat-follow').addEventListener('click', () => {
    if (openCatIndex === null) return;
    if (scene.focusId === 'follow' && !followingCoach) {
      scene.clearFollow();
      focus = 'free';
    } else {
      focus = 'follow';
      followingCoach = false;
      $('dock').hidden = true;
      $('stage-dock').hidden = true;
      measureBottom();
      scene.follow(openCatIndex, insets());
    }
    updateNav();
    renderCat();
  });

  // 打開這隻貓最新的那一篇日記
  $('cat-diary').addEventListener('click', () => {
    if (openCatIndex === null) return;
    const latest = diaries.map((d, i) => [d, i]).filter(([d]) => d.cat === openCatIndex).pop();
    if (latest) openDiary(diaries.length - 1 - latest[1]);
  });

  // 排行榜卡
  function openRank() {
    closeCards();
    renderRank();
    $('rank-card').hidden = false;
  }

  function renderRank() {
    document.querySelectorAll('#rank-card .tab').forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.level === rankLevel)));
    const rows = leaderboard(records, rankLevel, 10);
    const list = $('rank-list');
    list.replaceChildren();
    rows.forEach((r) => {
      const li = el('li', 'rank-row');
      li.append(el('span', `medal medal--${r.rank}`, String(r.rank)));
      const dot = el('i', 'dot');
      dot.style.background = cats[r.cat].coat.body;
      li.append(dot);
      const name = el('span', 'rank-row__name', cats[r.cat].name);
      if (r.tong) {
        const badge = el('span', 'tong-badge', '桐');
        badge.title = '桐桐幫忙按的';
        name.append(badge);
      }
      li.append(name);
      li.append(el('span', `level-tag level-tag--${r.level}`, LEVELS[r.level].short));
      const cm = el('span', 'rank-row__cm', String(r.cm));
      cm.append(el('small', '', '公分'));
      li.append(cm);
      list.append(li);
    });
    $('rank-empty').hidden = rows.length > 0;
    $('rank-empty').textContent = rankLevel === 'all' ? '還沒有成績，貓貓正在暖身。' : '這座跳臺還沒有成績，貓貓正在排隊。';
    const tongJumps = records.filter((r) => r.tong).length;
    $('rank-summary').textContent = records.length
      ? `這次一共跳了 ${records.length} 次，桐桐幫忙按了 ${tongJumps} 次。`
      : '這次還沒有人跳。';
  }

  document.querySelectorAll('#rank-card .tab').forEach((tab) => tab.addEventListener('click', () => {
    rankLevel = tab.dataset.level;
    renderRank();
  }));
  $('mini-board').addEventListener('click', () => goIsland('rank'));
  $('reset-open').addEventListener('click', () => {
    $('reset-ask').hidden = true;
    $('reset-confirm').hidden = false;
  });
  $('reset-no').addEventListener('click', () => {
    $('reset-confirm').hidden = true;
    $('reset-ask').hidden = false;
  });
  $('reset-yes').addEventListener('click', () => {
    records = [];
    jumpCount = 0;
    save();
    refreshBoards();
    $('reset-confirm').hidden = true;
    $('reset-ask').hidden = false;
    showToast('新的一輪開始！', '大家重新比，看這次誰跳最高');
  });

  // 3D 場景裡點到的東西
  scene.onPick((pick) => {
    sound.unlock();
    if (pick.type === 'island') goIsland(pick.id);
    else if (pick.type === 'cat') openCat(pick.index);
    else if (pick.type === 'coach') openCoach();
    else if (pick.type === 'teacher' || pick.type === 'podium') atLearn(openLearn);
    else if (pick.type === 'board') atLearn(openLesson);
    else if (pick.type === 'box') {
      const who = scene.peekBox(pick.spot);
      if (who !== null) openCat(who);
      else sound.play('pop');
    }
  });

  // 打開的卡片每秒更新一次（貓會走來走去）
  setInterval(() => {
    if (openIslandId) renderIsland();
    if (openCatIndex !== null) {
      const info = scene.catInfo(openCatIndex);
      if (info) $('cat-doing').textContent = info.doing;
    }
    if (diaryOpen) renderWriters();
    if (coachOpen) renderCoach();
  }, 1000);

  window.addEventListener('resize', () => {
    scene.resize();
    measureBottom();
  });
  document.addEventListener('pointerdown', () => sound.unlock(), { once: true });

  refreshBoards();
  updateNav();
}

const hot = window.claude?.hot;
if (hot?.ready) hot.ready(start);
else start(hot?.data ?? {});
