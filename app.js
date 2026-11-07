// 桐桐貓貓島：串起 3D 場景、跳臺大按鈕、表演區按鈕、貓貓日記、學習數學島改作業、排行榜與卡片。所有資料文字一律用 textContent。
import {
  LEVELS, LEVEL_KEYS, PERFECT, TRICKS, DIARY_MAX, DIARY_SEED, makeCats, personality, sanitizeRecords, sanitizeDiaries, composeDiary, dateText,
  leaderboard, bestPerCat, topRecord, judgeJump, starsText, mulberry32,
  sanitizeRaceBoard, addRaceResult, raceLeaderboard, raceTopWinner, secondsText,
} from './logic.js';
import { MATH_UNITS, dayKey, dailyClass, dailyHomework, sanitizeLearnDay, sanitizeLearnStats } from './math.js';
import { LESSONS } from './lessons.js';
import { drawFigure } from './figures.js';
import { zhuyin, plainText } from './zhuyin.js';
import {
  BADGES, BADGE_GROUPS, ISLAND_IDS, NAME_MAX, sanitizeProfile, sanitizeDeviceData, cleanName, playerName, stampChar, statValue, total, bestCm, seenCount, bump, addSeen, markDay, award, earnedDayText,
  normalizeCode, formatCode, ownData, applyRemote,
} from './profile.js';
import { composeNews, sanitizeNews, recordNews, recordJumpNews, recordRaceNews, chatGreeting, chatPet, chatDoing, chatBest, chatDiary, chatBusy } from './talk.js';
import { createScene } from './scene.js';

const STORE_KEY = 'tong-cat-island-v1';
const RING = 2 * Math.PI * 54;
const NAV = [
  { id: 'park1', label: '島主之家' },
  { id: 'owner', label: '跟著島主走' },
  { id: 'home', label: '貓貓之家' },
  { id: 'low', label: '低階跳臺', level: 'low' },
  { id: 'mid', label: '中階跳臺', level: 'mid' },
  { id: 'high', label: '高階跳臺', level: 'high' },
  { id: 'stage', label: '表演區' },
  { id: 'track', label: '跑步田徑場島' },
  { id: 'diary', label: '日記區' },
  { id: 'learn', label: '學習數學島' },
  { id: 'boxes', label: '多多紙箱區' },
  { id: 'combo', label: '合體公園' },
  { id: 'park2', label: '魚池公園' },
  { id: 'rank', label: '排行榜' },
  { id: 'coach', label: '貓貓教練' },
  { id: 'overview', label: '看全島' },
];
const ISLAND_COPY = {
  home: { label: '島的中間', title: '貓貓之家', lede: '島上 50 隻貓貓的家。屋頂上的招牌，是設計師桐桐的印章。', text: '跳累的貓會回來睡貓床、吃飯喝水，有時候還會躲進屋子裡。' },
  boxes: { label: '躲貓貓的島', title: '多多紙箱區', lede: '滿地都是紙箱，貓貓最愛鑽進去躲起來。', text: '有的貓只露出耳朵，有的整隻躲起來，紙箱還會晃來晃去。點一下紙箱，看看誰躲在裡面！' },
  combo: { label: '休息的島', title: '合體公園', lede: '紙箱、魚池、水和飼料，全部合在一起的公園。', text: '貓貓可以躲紙箱、坐在池邊看魚，渴了喝水、餓了吃飼料。' },
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

// 島主卡的雲端存檔：本機預覽接 wrangler dev，其他都接正式的
const CLOUD_API = /^(127\.0\.0\.1|localhost)$/.test(location.hostname) ? 'http://127.0.0.1:8787' : 'https://tong-api.xjack.tw';
const SYNC_DELAY = 20000;

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
  // 跑步比賽的成績：每隻貓跑最快的那一次、第一名幾次（「重新比一次」會跟跳高一起清掉）
  let raceBoard = sanitizeRaceBoard(hotData.raceBoard || stored.race, cats.length);
  const sound = createSound(stored.sound !== false);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let focus = 'overview';
  let rankLevel = 'all';
  let rankKind = 'jump';
  let openCatIndex = null;
  let openIslandId = null;
  let holding = false;
  let toastTimer = 0;
  let resultTimer = 0;
  let coachOpen = false;
  let followingCoach = false;
  let learnOpen = false;

  // 學習數學島：今天的作業改到哪裡
  let learnDay = sanitizeLearnDay(stored.learn && stored.learn.day, dayKey());

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

  // 島主卡：名字、累積的數字、徽章。舊存檔第一次升級時，用還留著的成績、改作業張數、掌印當起點
  const hadProfile = !!(hotData.profile || stored.profile);
  const profile = sanitizeProfile(hotData.profile || stored.profile, cats.length, {
    jumps: records.filter((r) => r.tong).length,
    ...sanitizeLearnStats(stored.learn),
    stamps: diaries.reduce((sum, d) => sum + d.paws, 0),
  });
  // 升級前就達標的徽章直接給，不用一次跳一大串提示
  if (!hadProfile) award(profile, dayKey());
  // 上次來是哪一天，回到島主之家時才知道有哪些新公告；markDay 會把它換成今天，要先記下來
  const previousDay = hadProfile ? profile.lastDay : '';
  markDay(profile, dayKey());
  const who = () => playerName(profile);
  const ownerLabel = () => `${who()}島主`;
  // 島上真的發生的大事，邊玩邊記，回到島主之家時報給島主聽
  let newsLog = sanitizeNews(stored.news);

  window.claude?.hot?.snapshot?.(() => ({ records, raceBoard, diaries, profile }));
  // 島主正在做的事：站在跳臺軟墊上自己跳、站在表演區舞臺上
  let ownerJumping = false;
  let ownerOnStage = false;

  // 第一次來的人先看島的故事，看過就不再跳出來
  let storySeen = !!stored.storySeen;

  function save() {
    writeStore({ records, race: raceBoard, sound: sound.on, diaries, diarySeeded: true, storySeen, learn: { day: learnDay }, profile, news: newsLog });
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
      raceEnd(order, times = []) {
        if (!order.length) return;
        const { ownerIndex } = scene.raceView();
        const nameOf = (i) => (i === ownerIndex ? ownerLabel() : cats[i].name);
        newsLog = recordNews(newsLog, dayKey(), recordRaceNews(nameOf(order[0])));
        // 排行榜島的跑步排行只比貓貓，島主跑的不算
        const results = order
          .map((cat, k) => ({ cat, place: k + 1, tenths: Math.round((times[k] || 0) * 10) }))
          .filter((r) => r.cat !== ownerIndex && r.cat >= 0 && r.cat < cats.length && r.tenths > 0);
        if (results.length) raceBoard = addRaceResult(raceBoard, results);
        save();
        refreshBoards();
        if (focus !== 'track') return;
        const place = order.indexOf(ownerIndex);
        showToast('比賽結束！', place >= 0 ? `你跑了第 ${place + 1} 名` : `第一名是${nameOf(order[0])}`);
      },
      ownerJump({ level, cm, perfect }) {
        showResult(`${ownerLabel()}跳了 ${cm} 公分${perfect ? '，完美跳！' : '！'}`, '');
        if (perfect) {
          bump(profile, 'perfect');
          if (level === 'high') bump(profile, 'perfectHigh');
          tallied();
        }
      },
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
    const islandRecord = judge.island && !judge.first && records.length > 3;
    if (islandRecord) {
      newsLog = recordNews(newsLog, dayKey(), recordJumpNews(name, level.name, info.cm));
      save();
      showToast('全島新紀錄！', `${name}在${level.name}跳了 ${info.cm} 公分`);
      if (!info.tong && info.platform === focus) sound.play('record');
    }
    if (info.tong) {
      bump(profile, 'jumps');
      if (info.perfect) bump(profile, 'perfect');
      if (info.perfect && info.level === 'high') bump(profile, 'perfectHigh');
      if (islandRecord) bump(profile, 'records');
      profile.bestCm = Math.max(profile.bestCm, info.cm);
      tallied();
    }
    return judge;
  }

  // ---------- 島主卡：累積數字變了就看有沒有新徽章，存起來 ----------
  const badgeQueue = [];
  let badgeTimer = 0;
  let newBadges = 0;

  function tallied() {
    // 頁面開著過了半夜，下一次動作就算新的一天
    markDay(profile, dayKey());
    const fresh = award(profile, dayKey());
    save();
    if (fresh.length) announceBadges(fresh);
    if (!$('profile-card').hidden) renderProfile();
    scheduleSync();
  }

  function tally(key) {
    bump(profile, key);
    tallied();
  }

  function see(key, value) {
    if (addSeen(profile, key, value)) tallied();
  }

  function announceBadges(list) {
    badgeQueue.push(...list);
    if ($('profile-card').hidden) newBadges += list.length;
    updateProfileBadge();
    nextBadge();
  }

  // 一次一個，正在顯示別的提示（例如全島新紀錄）就等它結束
  function nextBadge() {
    if (badgeTimer || !badgeQueue.length) return;
    const wait = (ms) => {
      badgeTimer = setTimeout(() => {
        badgeTimer = 0;
        nextBadge();
      }, ms);
    };
    if (!$('toast').hidden) {
      wait(500);
      return;
    }
    const badge = badgeQueue.shift();
    showToast(`拿到徽章：${badge.title}`, badge.text);
    // 還沒點過畫面就不出聲，不然聲音會排到第一次點擊才一起響
    if (!navigator.userActivation || navigator.userActivation.hasBeenActive) sound.play('record');
    wait(3600);
  }

  function updateProfileBadge() {
    const badge = $('profile-badge');
    badge.hidden = newBadges === 0;
    badge.textContent = String(newBadges);
    badge.setAttribute('aria-label', `${newBadges} 個新徽章`);
  }

  // 名字會出現在哪裡都由這裡換：工具列、招牌下面、改作業的標題、排行榜的說明
  function applyName() {
    $('profile-label').textContent = profile.name || '島主卡';
    $('plate-sub').textContent = profile.name ? `島主：${profile.name}` : '50 隻貓貓的跳高比賽';
    scene.setOwnerName(who());
    scene.setOwnerLook(profile.avatar);
    markLooks();
    $('learn-title').textContent = `${who()}老師改作業`;
    $('rank-note').textContent = rankNote();
    $('help-who').textContent = profile.name ? `島主${profile.name}` : '這座島的島主';
  }

  let profileEditing = false;
  // 第一次取完名字會留在島主卡（要看到島主暗號），關掉卡片才回到島主之家
  let homeAfterProfile = false;
  // 預留文字的字也要選對讀音（量詞「個」）
  $('profile-input').placeholder = zhuyin(`最多 ${NAME_MAX} 個字`);

  // asking：第一次問名字（問過一次就不再跳出來）
  function openProfile(asking = false) {
    closeCards();
    if (asking) {
      profile.asked = true;
      save();
    }
    profileEditing = asking;
    newBadges = 0;
    updateProfileBadge();
    renderProfile();
    $('profile-card').hidden = false;
    $('profile-card').scrollTop = 0;
  }

  const PROFILE_STATS = [
    ['完美跳', () => total(profile, 'perfect'), '次'],
    ['幫貓貓跳', () => total(profile, 'jumps'), '次'],
    ['跳最高', () => bestCm(profile), '公分'],
    ['改作業', () => total(profile, 'graded'), '張'],
    ['點過的貓', () => seenCount(profile, 'cats'), '隻'],
    ['來島上', () => total(profile, 'days'), '天'],
  ];

  function renderProfile() {
    $('profile-go-home').hidden = !homeAfterProfile || profileEditing;
    $('profile-title').textContent = profileEditing && !profile.name ? '你的島主卡' : `${who()}的島主卡`;
    $('profile-form').hidden = !profileEditing;
    $('profile-rename').hidden = profileEditing;
    if (profileEditing) {
      const input = $('profile-input');
      if (document.activeElement !== input) input.value = profile.name;
      $('profile-save').disabled = !cleanName(input.value);
      $('profile-skip').textContent = profile.name ? '先不改' : '繼續當桐桐';
    }
    renderCloud();
    $('profile-stats').replaceChildren(...PROFILE_STATS.map(([label, value, unit]) => {
      const tile = el('div', 'stat-tile');
      const number = el('b', '', String(value()));
      number.append(el('small', '', unit));
      tile.append(el('span', '', label), number);
      return tile;
    }));
    const earnedCount = BADGES.filter((b) => profile.earned[b.id]).length;
    $('profile-count').textContent = `徽章 ${earnedCount}／${BADGES.length}`;
    $('profile-badges').replaceChildren(...BADGE_GROUPS.flatMap((group) => [
      el('h3', 'badge-group', group.title),
      ...BADGES.filter((b) => b.group === group.id).map(badgeRow),
    ]));
  }

  function badgeRow(badge) {
    const day = profile.earned[badge.id];
    const row = el('div', `badge${day ? ' is-earned' : ''}`);
    row.append($('badge-paw').content.cloneNode(true));
    const body = el('div', 'badge__body');
    body.append(el('p', 'badge__title', badge.title), el('p', 'badge__text', badge.text));
    if (day) {
      body.append(el('p', 'badge__day', `${earnedDayText(day)}拿到`));
    } else if (badge.goal > 1) {
      const value = Math.min(statValue(profile, badge.stat), badge.goal);
      const bar = el('div', 'badge__bar');
      const fill = el('i');
      fill.style.width = `${(value / badge.goal) * 100}%`;
      bar.append(fill);
      body.append(bar, el('p', 'badge__day', `${value}／${badge.goal}`));
    }
    row.append(body);
    return row;
  }

  $('profile-open').addEventListener('click', () => {
    if ($('profile-card').hidden) openProfile();
    else closeCards();
  });
  $('profile-rename').addEventListener('click', () => {
    profileEditing = true;
    renderProfile();
    $('profile-input').focus();
  });
  $('profile-input').addEventListener('input', () => {
    $('profile-save').disabled = !cleanName($('profile-input').value);
  });
  $('profile-skip').addEventListener('click', () => {
    profileEditing = false;
    renderProfile();
    sound.play('pop');
  });
  $('profile-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = cleanName($('profile-input').value);
    if (!name) return;
    profile.name = name;
    profile.nameAt = Date.now();
    profileEditing = false;
    $('profile-input').blur();
    save();
    applyName();
    renderProfile();
    if (!$('learn-card').hidden) renderLearn();
    sound.play('stamp');
    showToast(`${name}，歡迎來到貓貓島！`, '貓貓記住你的名字了');
    if (profile.cloud.code) scheduleSync(0);
    else linkCloud();
  });

  // ---------- 島主的樣子 ----------
  function markLooks() {
    document.querySelectorAll('.look-btn').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.look === profile.avatar)));
  }

  function setLook(look) {
    const first = !profile.avatar;
    profile.avatar = look;
    profile.avatarAt = Date.now();
    scene.setOwnerLook(look);
    markLooks();
    syncOwnerButtons();
    save();
    scheduleSync(0);
    sound.play('stamp');
    if (!$('home-card').hidden) renderHome();
    if (first) showToast('這就是你了！', '點地上就走過去，點貓貓可以聊天');
  }

  // 島主卡和島主之家都放一排按鈕，內容從同一份範本抄
  ['profile-looks', 'home-looks'].forEach((id) => {
    const box = $(id);
    box.append($('look-template').content.cloneNode(true));
    box.querySelectorAll('.look-btn').forEach((button) => button.addEventListener('click', () => setLook(button.dataset.look)));
  });
  $('profile-looks').querySelectorAll('.look-btn').forEach((button) => button.setAttribute('tabindex', '0'));

  // ---------- 島主暗號：存到雲端，換裝置或資料不見都找得回來 ----------
  // 平常只存在這臺裝置；有暗號之後，動作停下來 20 秒、或離開頁面時送一次。連不上就先記在本機，等一下再試
  let cloudState = 'idle'; // idle、saving、saved、offline、missing
  let syncTimer = 0;
  let syncBusy = false;
  let linking = false;
  let lastSent = '';
  $('cloud-input').placeholder = zhuyin('例如 K7MP-3XQ2');

  function newDeviceId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function deviceId() {
    if (!profile.cloud.deviceId) profile.cloud.deviceId = newDeviceId();
    return profile.cloud.deviceId;
  }

  // 用 text/plain 送，瀏覽器不用先問一次 CORS，關分頁時也送得出去。連不上回 status 0
  async function cloudPost(path, body, keepalive = false) {
    try {
      const res = await fetch(`${CLOUD_API}${path}`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body), keepalive });
      return { status: res.status, body: await res.json().catch(() => ({})) };
    } catch {
      return { status: 0, body: {} };
    }
  }

  function setCloudState(state) {
    cloudState = state;
    if (!$('profile-card').hidden) renderCloud();
  }

  // 收到別臺裝置合起來的資料：畫面上的數字、名字、徽章跟著更新
  function receiveOthers(others) {
    const renamed = applyRemote(profile, sanitizeDeviceData(others, cats.length));
    if (renamed) applyName();
    const fresh = award(profile, dayKey());
    save();
    if (fresh.length) announceBadges(fresh);
    if (!$('profile-card').hidden) renderProfile();
    if (!$('learn-card').hidden) renderLearn();
  }

  function scheduleSync(delay = SYNC_DELAY) {
    if (!profile.cloud.code) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncNow(), delay);
  }

  async function syncNow({ keepalive = false, force = false } = {}) {
    // 離開頁面時就算上一次還在路上也要送：頁面一關，上一次沒帶到的數字就沒機會了（重送不會多算）
    if (!profile.cloud.code || (syncBusy && !keepalive)) return;
    const code = profile.cloud.code;
    const data = ownData(profile);
    const sent = JSON.stringify(data);
    if (sent === lastSent && !force) return;
    syncBusy = true;
    clearTimeout(syncTimer);
    const res = await cloudPost('/sync', { code, deviceId: deviceId(), data }, keepalive);
    syncBusy = false;
    if (code !== profile.cloud.code) return;
    if (res.status === 200) {
      lastSent = sent;
      receiveOthers(res.body.others);
      setCloudState('saved');
      if (JSON.stringify(ownData(profile)) !== lastSent) scheduleSync();
    } else if (res.status === 404) {
      setCloudState('missing');
    } else {
      setCloudState('offline');
      scheduleSync(60000);
    }
  }

  // 開一張新卡：這臺裝置到現在累積的都帶上去
  async function linkCloud() {
    if (profile.cloud.code || linking) return;
    linking = true;
    setCloudState('saving');
    const data = ownData(profile);
    const res = await cloudPost('/players', { deviceId: deviceId(), data });
    linking = false;
    const code = res.status === 200 ? normalizeCode(res.body.code) : '';
    if (!code) {
      setCloudState('offline');
      return;
    }
    profile.cloud.code = code;
    lastSent = JSON.stringify(data);
    save();
    setCloudState('saved');
    if (!$('profile-card').hidden) renderProfile();
    if (JSON.stringify(ownData(profile)) !== lastSent) scheduleSync();
  }

  const CLOUD_STATUS = {
    idle: '',
    saving: '正在存到島上的資料庫…',
    saved: '已經存好了。',
    offline: '現在連不上，數字還記在這臺裝置上，等一下會再試。',
    missing: '島上的資料庫找不到這組暗號，數字還記在這臺裝置上。',
  };

  function renderCloud() {
    const code = profile.cloud.code;
    $('cloud-has').hidden = !code;
    $('cloud-none').hidden = !!code || profileEditing;
    $('cloud-code').textContent = formatCode(code);
    const status = code || cloudState === 'offline' ? CLOUD_STATUS[cloudState] : '';
    $('cloud-status').hidden = !status;
    $('cloud-status').textContent = status;
    $('cloud-switch-note').hidden = !code;
    $('cloud-switch-note').textContent = code
      ? `這臺裝置現在是${who()}的卡。換過去之後，輸入原本的暗號 ${formatCode(code)} 還能換回來，先記下來喔。`
      : '';
  }

  function closeRestore() {
    $('cloud-restore').hidden = true;
    $('cloud-restore-open').hidden = false;
    $('cloud-error').hidden = true;
    $('cloud-input').value = '';
    $('cloud-find').disabled = false;
  }

  function restoreError(text) {
    $('cloud-error').textContent = text;
    $('cloud-error').hidden = false;
    $('cloud-find').disabled = false;
  }

  // 輸入暗號找回卡：先不帶資料問一次，暗號對了才動這臺裝置的存檔
  async function restoreCard(raw) {
    const code = normalizeCode(raw);
    if (!code) {
      restoreError('暗號是 8 碼英文字母和數字，再看一次有沒有打錯。');
      return;
    }
    if (code === profile.cloud.code) {
      closeRestore();
      showToast('這就是你現在的卡', '不用再找一次');
      return;
    }
    $('cloud-find').disabled = true;
    const switching = !!profile.cloud.code;
    const id = switching ? newDeviceId() : deviceId();
    const res = await cloudPost('/sync', { code, deviceId: id });
    if (res.status === 404) {
      restoreError('找不到這組暗號，再看一次有沒有打錯。');
      return;
    }
    if (res.status !== 200) {
      restoreError('現在連不上，等一下再試一次。');
      return;
    }
    // 這臺原本是別張卡：先把舊卡存好再換；還沒有卡的話，這臺已經玩的數字會加進找回來的卡
    if (switching) {
      await syncNow({ force: true });
      const today = dayKey();
      Object.assign(profile, sanitizeProfile({ firstDay: today, lastDay: today }, cats.length));
    }
    profile.asked = true;
    profile.cloud = { code, deviceId: id };
    lastSent = '';
    profileEditing = false;
    closeRestore();
    receiveOthers(res.body.others);
    applyName();
    syncOwnerButtons();
    setCloudState('saving');
    renderProfile();
    sound.play('stamp');
    showToast('找回來了！', `${who()}，歡迎回來`);
    syncNow({ force: true });
  }

  $('cloud-get').addEventListener('click', () => {
    sound.unlock();
    linkCloud();
  });
  $('cloud-restore-open').addEventListener('click', () => {
    $('cloud-restore').hidden = false;
    $('cloud-restore-open').hidden = true;
    $('cloud-input').focus();
  });
  $('cloud-cancel').addEventListener('click', closeRestore);
  $('cloud-restore').addEventListener('submit', (event) => {
    event.preventDefault();
    $('cloud-error').hidden = true;
    restoreCard($('cloud-input').value);
  });
  $('cloud-copy').addEventListener('click', async () => {
    const label = $('cloud-copy');
    try {
      await navigator.clipboard.writeText(formatCode(profile.cloud.code));
      label.textContent = '複製好了';
    } catch {
      label.textContent = '請手抄下來';
    }
    setTimeout(() => {
      label.textContent = '複製';
    }, 2500);
  });
  // 離開頁面時把還沒送的補送出去
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) syncNow({ keepalive: true });
  });
  window.addEventListener('pagehide', () => syncNow({ keepalive: true }));

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
      raceTop: raceLeaderboard(raceBoard, 5).map((r) => ({ name: cats[r.cat].name, sec: secondsText(r.best) })),
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
    button.addEventListener('click', () => {
      if (item.id === 'coach') findCoach();
      else if (item.id === 'owner') followOwner();
      else goIsland(item.id);
    });
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
  // auto：程式自己帶過來的（重新打開網站回到島主之家），不算玩家按的，不送 GA
  function goIsland(id, quiet = false, auto = false) {
    closeCards();
    focus = id;
    if (!auto) track('island_view', { island: id });
    if (ISLAND_IDS.includes(id)) see('islands', id);
    followingCoach = false;
    ownerJumping = false;
    ownerOnStage = false;
    syncOwnerButtons();
    scene.ownerGoIsland(id);
    const level = LEVELS[id];
    const dock = $('dock');
    dock.hidden = !level;
    $('stage-dock').hidden = id !== 'stage';
    $('race-dock').hidden = id !== 'track';
    if (level) {
      dock.className = `dock dock--${id}`;
      $('dock-level').textContent = `${starsText(id)} ${level.name}`;
      $('dock-hint').textContent = LEVEL_HINT[id];
      $('dock-result').textContent = '';
      renderDockBest();
      lastDock = {};
    } else if (id === 'stage') {
      lastDock = {};
    } else if (id === 'track') {
      lastDock = {};
      showToast('跑步田徑場島', '七隻貓到齊，按「開始比賽」就開跑');
    } else if (id === 'park1') {
      openHome();
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

  // ---------- 島主也來玩：跳臺、舞臺、跑道上的按鈕 ----------
  function syncOwnerButtons() {
    const can = !!profile.avatar;
    $('dock-owner').hidden = !can;
    $('dock-owner').textContent = ownerJumping ? '換貓貓跳' : '換我跳';
    $('stage-owner').hidden = !can;
    $('stage-owner').textContent = ownerOnStage ? '我要下臺' : '我也要上臺';
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
    if (ownerJumping ? !scene.ownerJumpPress() : !scene.press()) return;
    holding = true;
    jumpBtn.classList.add('is-holding');
    sound.startCharge();
  }

  function releaseJump() {
    if (!holding) return;
    holding = false;
    jumpBtn.classList.remove('is-holding', 'is-perfect');
    sound.stopCharge();
    if (ownerJumping) scene.ownerJumpRelease();
    else scene.release();
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
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
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
    if (!$('race-dock').hidden) tickRace();
    if ($('dock').hidden || !LEVELS[focus]) return;
    if (ownerJumping) {
      const own = scene.ownerJumpView();
      if (!own.charging && holding) releaseJump();
      jumpBtn.disabled = !(own.charging || own.ready);
      setText('jump-label', own.charging ? '放開！' : own.ready ? '按住' : '等一下');
      jumpFill.style.strokeDashoffset = String(RING * (1 - own.meter));
      jumpBtn.classList.toggle('is-perfect', own.charging && own.meter >= PERFECT);
      if (own.charging) sound.updateCharge(own.meter);
      setText('dock-who', own.ready || own.charging ? `換${ownerLabel()}跳！` : `${ownerLabel()}走過去了…`);
      setText('dock-next', '站在軟墊上，能量條和貓貓一樣');
      return;
    }
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

  // ---------- 跑步比賽的按鈕和戰況 ----------
  function tickRace() {
    const view = scene.raceView();
    const name = (k) => {
      const i = view.standing[k];
      if (i === undefined) return '';
      return i === view.ownerIndex ? ownerLabel() : cats[i].name;
    };
    let who = '';
    let next = '';
    if (view.phase === 'idle') {
      who = '下一場比賽快開始了';
      next = '貓貓正在休息';
    } else if (view.phase === 'gather') {
      who = `貓貓跑去起跑線（${view.arrived}／${view.lanes}）`;
      next = '到齊就可以比賽';
    } else if (view.phase === 'ready') {
      who = view.ownerIn ? '大家都就位了！' : `${view.total} 隻貓都就位了！`;
      next = '按「開始比賽」就開跑';
    } else if (view.phase === 'countdown') {
      who = `預備…${Math.max(1, view.count)}`;
      next = '看哪一隻跑最快';
    } else if (view.phase === 'running') {
      who = `領先：${name(0)}`;
      next = `第二 ${name(1)}、第三 ${name(2)}`;
    } else {
      who = `第一名是${name(0)}！`;
      next = `第二名 ${name(1)}、第三名 ${name(2)}`;
    }
    setText('race-who', who);
    setText('race-next', next);
    const running = view.phase === 'running' && view.ownerIn;
    setText('race-go', running ? '加速！' : '開始比賽');
    $('race-go').disabled = !(view.phase === 'ready' || running);
    $('race-owner').hidden = !profile.avatar || view.ownerIn || !['gather', 'ready'].includes(view.phase);
  }
  $('race-go').addEventListener('click', () => {
    sound.unlock();
    if (scene.raceView().phase === 'running') scene.raceBoost();
    else scene.raceStart();
  });
  $('race-owner').addEventListener('click', () => {
    sound.unlock();
    if (scene.raceJoin()) showToast('島主也要跑！', '開跑後連按「加速！」，跑得更快');
  });

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
    const key = `${view.ready}|${view.trick}|${ownerOnStage}`;
    if (lastDock.trickKey === key) return;
    lastDock.trickKey = key;
    trickButtons.forEach((button) => {
      button.disabled = !view.ready && !ownerOnStage;
      button.classList.toggle('is-on', button.dataset.trick === view.trick);
    });
  }
  trickButtons.forEach((button) => button.addEventListener('click', () => {
    sound.unlock();
    const mine = ownerOnStage && scene.ownerTrick(button.dataset.trick);
    if (scene.stageTrick(button.dataset.trick)) {
      track('stage_trick', { trick: button.dataset.trick });
      tally('tricks');
      return;
    }
    if (mine) return;
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
    tally('claps');
    scene.ownerCheer();
  });
  $('stage-owner').addEventListener('click', () => {
    sound.unlock();
    if (!scene.ownerStage(!ownerOnStage)) return;
    ownerOnStage = !ownerOnStage;
    syncOwnerButtons();
  });
  $('dock-owner').addEventListener('click', () => {
    sound.unlock();
    if (!scene.ownerCushion(!ownerJumping, focus)) return;
    ownerJumping = !ownerJumping;
    syncOwnerButtons();
    lastDock = {};
    renderDockBest();
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
  ['diary-card', 'learn-card', 'lesson-card', 'story-card', 'report-card', 'profile-card', 'home-card', 'chat-card'].forEach((id) => {
    markZhuyin($(id));
    zhuyinWatch.observe($(id), { childList: true, characterData: true, subtree: true });
  });

  // ---------- 貓貓日記 ----------
  function writeDiary(index) {
    const lines = composeDiary(cats[index], memories.get(index) || [], Math.random(), who());
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
    tally('stamps');
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
    $('race-dock').hidden = true;
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
      track('cat_follow', { what: 'coach' });
    }
  });

  // ---------- 學習數學島：玩家當老師改作業 ----------
  // 每天換 20 隻貓來上課，每隻寫一張（9 個單元都會出到）；20 張改完今天就結束，明天換別的貓。
  // 玩家按「寫對了／寫錯了」，改錯第一次老師給提示，第二次老師直接講解
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
    track('class_open', { what: 'homework' });
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
    $('learn-stats').textContent = total(profile, 'graded')
      ? `${who()}老師一共改了 ${total(profile, 'graded')} 張，一次就改對 ${total(profile, 'right')} 張。`
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

  // 改好一張：累積張數；今天 20 張都改好了再算一天，全部一次就改對的另外記
  function tallyGrade(firstTry) {
    bump(profile, 'graded');
    if (firstTry) bump(profile, 'right');
    if (learnDay.results.every((r) => r !== null)) {
      bump(profile, 'daysDone');
      if (learnDay.results.every((r) => r === 'good')) bump(profile, 'daysAllRight');
    }
    tallied();
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
      tallyGrade(s.tries === 0);
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
    track('homework_miss', { unit: s.p.unit });
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
    tallyGrade(false);
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
    track('class_open', { what: 'lesson' });
    lessonUnit = null;
    renderLesson();
    $('lesson-card').hidden = false;
    $('lesson-card').scrollTop = 0;
    scene.teacherSay('我們來上課！', 2.2);
  }

  function showLessonPage(unit, page) {
    lessonUnit = unit;
    lessonPage = page;
    // 翻到最後一頁就算這個單元上完了
    if (page === LESSONS[unit].length - 1) {
      track('lesson_done', { unit });
      see('units', unit);
    }
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
    $('lesson-report').hidden = !picking;
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
    track('lesson_reveal', { unit: lessonUnit });
    sound.play('pop');
    speak(spoken(`答案是：${page.answer}`), lessonReader);
    $('lesson-answer').scrollIntoView({ block: 'nearest' });
  });
  $('lesson-prev').addEventListener('click', () => {
    if (lessonPage === 0) return;
    track('lesson_page', { unit: lessonUnit, what: 'prev' });
    showLessonPage(lessonUnit, lessonPage - 1);
  });
  $('lesson-next').addEventListener('click', () => {
    if (lessonPage === LESSONS[lessonUnit].length - 1) {
      backToUnits();
      return;
    }
    track('lesson_page', { unit: lessonUnit, what: 'next' });
    showLessonPage(lessonUnit, lessonPage + 1);
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

  // ---------- 島的故事：第一次來的時候跳出歡迎卡（字有注音，可以唸出來） ----------
  const storyReader = { button: $('story-read'), label: $('story-read-label'), idle: '唸給我聽' };
  if (!synth) $('story-read').hidden = true;
  function openStory() {
    closeCards();
    $('story-card').hidden = false;
    $('story-card').scrollTop = 0;
    storySeen = true;
    save();
  }
  $('story-read').addEventListener('click', () => {
    if (speaking === storyReader) {
      stopSpeaking();
      return;
    }
    speak(plainText(`${$('story-title').textContent}${$('story-text').textContent}`).replace(/\s+/g, ''), storyReader);
    track('read_aloud', { what: 'story' });
  });

  // ---------- 問題回報：送到桐爸的 Google 表單（不用登入，回報不公開） ----------
  // 回報卡疊在正在看的卡片上面，自動附上看到哪裡：黑板課哪一頁、哪一張作業、哪一篇日記。
  // 畫面上的字有注音，送出去的是不帶選擇子的原文
  const REPORT_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSdOJtSk4mTgL5d_P8hrdcaBHFs1EMEMRwvMbjmfVhGza_CUuw';
  const REPORT_FIELDS = { kind: 'entry.2056357624', where: 'entry.1964930136', text: 'entry.1806888704', device: 'entry.754595705' };
  const reportReader = { button: $('report-read'), label: $('report-read-label'), idle: '唸給我聽' };
  if (!synth) $('report-read').hidden = true;
  const reportKinds = [...document.querySelectorAll('.report-kind')];
  let reportKind = null;
  let reportWhere = null;

  function reportContext() {
    if (!$('lesson-card').hidden) {
      if (lessonUnit === null) return { from: 'lesson', show: '黑板課的單元選單', detail: '黑板課的單元選單' };
      const page = LESSONS[lessonUnit][lessonPage];
      const show = `黑板課：第 ${lessonUnit} 單元 ${MATH_UNITS[lessonUnit - 1].name}，第 ${lessonPage + 1} 頁`;
      return { from: 'lesson', show, detail: `${show}「${page.title}」｜考考你：${page.ask}｜答案：${page.answer}` };
    }
    if (!$('learn-card').hidden) {
      const s = stack[sheetIndex];
      if (!s) return { from: 'learn', show: '改作業：今天的作業改完了', detail: '改作業：今天的作業改完了' };
      const name = cats[s.cat].name;
      const show = `改作業：第 ${s.p.unit} 單元 ${MATH_UNITS[s.p.unit - 1].name}，${name}的作業`;
      return { from: 'learn', show, detail: `${show}｜題目：${s.p.text}｜${name}寫：${s.p.catAnswer}｜正確答案：${s.p.answer}` };
    }
    if (!$('diary-card').hidden) {
      const diary = currentDiary();
      if (!diary) return { from: 'diary', show: '日記：還沒有日記', detail: '日記：還沒有日記' };
      const show = `日記：${cats[diary.cat].name}的日記，${diary.date}`;
      // 日記裡可能寫著玩家取的名字，回報時換掉
      const lines = diary.lines.join('');
      return { from: 'diary', show, detail: `${show}｜${profile.name ? lines.replaceAll(profile.name, '玩家') : lines}` };
    }
    const place = NAV.find((n) => n.id === focus);
    const show = `島上：${place ? place.label : '桐桐貓貓島'}`;
    return { from: 'island', show, detail: show };
  }

  function openReport(via) {
    sound.unlock();
    stopSpeaking();
    reportWhere = reportContext();
    reportKind = null;
    reportKinds.forEach((b) => b.setAttribute('aria-pressed', 'false'));
    $('report-where').textContent = reportWhere.show;
    $('report-text').value = '';
    $('report-form').hidden = false;
    $('report-error').hidden = true;
    $('report-done').hidden = true;
    $('report-send').hidden = false;
    $('report-send').disabled = true;
    $('report-ok').hidden = true;
    $('report-card').hidden = false;
    $('report-card').scrollTop = 0;
    track('report_open', { what: via === 'toolbar' ? 'toolbar' : reportWhere.from });
  }

  function closeReport() {
    if (speaking === reportReader) stopSpeaking();
    $('report-card').hidden = true;
  }

  $('report-open').addEventListener('click', () => {
    if ($('report-card').hidden) openReport('toolbar');
    else closeReport();
  });
  document.querySelectorAll('[data-report]').forEach((button) => button.addEventListener('click', () => openReport('card')));
  $('report-close').addEventListener('click', closeReport);
  $('report-ok').addEventListener('click', closeReport);
  reportKinds.forEach((button) => button.addEventListener('click', () => {
    reportKind = button;
    reportKinds.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    $('report-send').disabled = false;
    sound.play('pop');
  }));
  $('report-read').addEventListener('click', () => {
    if (speaking === reportReader) {
      stopSpeaking();
      return;
    }
    const text = $('report-done').hidden
      ? `回報問題。選一個最像的，按送出，桐爸就會收到。可以選：${reportKinds.map((b) => plainText(b.textContent)).join('、')}。${plainText($('report-note').textContent)}`
      : plainText($('report-done').textContent).replace(/\s+/g, '');
    speak(text, reportReader);
    track('read_aloud', { what: 'report' });
  });

  $('report-send').addEventListener('click', async () => {
    if (!reportKind || !reportWhere) return;
    const fields = {
      [REPORT_FIELDS.kind]: plainText(reportKind.textContent),
      [REPORT_FIELDS.where]: reportWhere.detail,
      [REPORT_FIELDS.text]: $('report-text').value.trim(),
      [REPORT_FIELDS.device]: `${location.host || '本機檔案'}｜${innerWidth}×${innerHeight}｜${navigator.userAgent}`,
    };
    const button = $('report-send');
    button.disabled = true;
    $('report-error').hidden = true;
    try {
      // Google 表單不回 CORS 標頭，只能用 no-cors 送：送得出去就算成功，看不到表單的回覆
      await fetch(`${REPORT_FORM}/formResponse`, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(fields) });
    } catch {
      // 沒有網路，或 claude.ai 上的版本不能直接連 Google：給一個帶好內容的表單網頁連結。
      // 小朋友打的字不放進網址（會留在瀏覽紀錄），到表單上再打一次
      const link = new URL(`${REPORT_FORM}/viewform`);
      link.searchParams.set('usp', 'pp_url');
      Object.entries(fields).forEach(([key, value]) => {
        if (key !== REPORT_FIELDS.text) link.searchParams.set(key, value);
      });
      $('report-link').href = link.href;
      $('report-error').hidden = false;
      $('report-error').scrollIntoView({ block: 'nearest' });
      button.disabled = false;
      return;
    }
    track('report_send', { what: reportKind.dataset.kind });
    if (speaking === reportReader) stopSpeaking();
    sound.play('stamp');
    $('report-form').hidden = true;
    $('report-done').hidden = false;
    button.hidden = true;
    $('report-ok').hidden = false;
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
    const wasChat = chatIndex !== null;
    chatIndex = null;
    homeAfterProfile = false;
    scene.chatEnd();
    // 聊完鏡頭回到島主身上（卡片都收起來才算得準，所以等這一輪結束）
    if (wasChat && focus === 'owner') requestAnimationFrame(() => { if (focus === 'owner' && chatIndex === null) scene.follow('owner', insets()); });
    $('reset-confirm').hidden = true;
    $('reset-ask').hidden = false;
  }
  function closeToHome() {
    const goHome = homeAfterProfile;
    closeCards();
    if (goHome) goIsland('park1', true, true);
  }
  document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', closeToHome));
  $('profile-go-home').addEventListener('click', closeToHome);
  // 看完島的故事，接著問要叫什麼名字
  $('story-start').addEventListener('click', () => {
    if (profile.asked) {
      goIsland('park1', true, true);
      return;
    }
    openProfile(true);
    homeAfterProfile = true;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if ($('report-card').hidden) closeCards();
    else closeReport();
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
    $('island-sit').hidden = !scene.ownerCanSit(id);
    $('island-card').hidden = false;
  }
  $('island-sit').addEventListener('click', () => {
    if (openIslandId && scene.ownerSit(openIslandId)) showToast('坐下來休息', `${ownerLabel()}走過去坐下了`);
  });

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
      chip.addEventListener('click', () => openChat(index, 'island_card'));
      box.append(chip);
    });
  }

  // ---------- 島主之家：回到島上先到這裡，報告最近的新鮮事 ----------
  const homeReader = { button: $('home-read'), label: $('home-read-label'), idle: '唸給我聽' };
  if (!synth) $('home-read').hidden = true;
  let homeItems = [];
  // 第一次打開網站看到的是歡迎，之後才是歡迎回來
  let firstVisit = !stored.storySeen;

  function buildHomeItems() {
    const latest = diaries[diaries.length - 1];
    homeItems = composeNews({
      today: dayKey(),
      previousDay,
      events: newsLog,
      diary: latest ? { name: cats[latest.cat].name, line: latest.lines[0] } : null,
      names: cats.map((c) => c.name),
      // 第一次來還要選樣子，新鮮事少一點，不用捲那麼遠
      limit: firstVisit ? 3 : 5,
    });
  }

  function renderHome() {
    $('home-title').textContent = firstVisit ? '這裡是你的家！' : `${ownerLabel()}，歡迎回來！`;
    $('home-news').replaceChildren(...homeItems.map((item) => {
      const li = el('li', 'news-item');
      li.append(el('span', 'news-item__tag', item.tag), el('span', 'news-item__text', item.text));
      return li;
    }));
    const noLook = !profile.avatar;
    $('home-pick').hidden = !noLook;
    $('home-change').hidden = noLook;
    $('home-go').textContent = noLook ? '先選島主的樣子' : '出門逛島';
    $('home-go').disabled = noLook;
  }

  function openHome() {
    closeCards();
    stopSpeaking();
    buildHomeItems();
    renderHome();
    $('home-card').hidden = false;
    $('home-card').scrollTop = 0;
  }

  $('home-read').addEventListener('click', () => {
    if (speaking === homeReader) {
      stopSpeaking();
      return;
    }
    speak(`${plainText($('home-title').textContent)}最近島上的新鮮事：${homeItems.map((item) => item.text).join('')}`, homeReader);
    track('read_aloud', { what: 'home' });
  });
  $('home-change').addEventListener('click', () => openProfile());
  $('home-go').addEventListener('click', () => {
    sound.unlock();
    firstVisit = false;
    followOwner();
  });

  // 鏡頭跟著島主走：點地上就走過去、點貓貓就聊天
  function followOwner() {
    if (!profile.avatar) {
      goIsland('park1');
      showToast('先選島主的樣子', '選好就可以出門逛島');
      return;
    }
    closeCards();
    focus = 'owner';
    followingCoach = false;
    ownerJumping = false;
    ownerOnStage = false;
    syncOwnerButtons();
    $('dock').hidden = true;
    $('stage-dock').hidden = true;
    $('race-dock').hidden = true;
    measureBottom();
    scene.follow('owner', insets());
    track('island_view', { island: 'owner' });
    updateNav();
    showToast('出門逛島', '點地上就走過去，點貓貓可以聊天');
  }

  // ---------- 跟貓聊天 ----------
  let chatIndex = null;

  function chatSay(text) {
    $('chat-line').textContent = text;
    speak(text);
  }

  function openChat(index, via) {
    sound.unlock();
    closeCards();
    chatIndex = index;
    track('cat_open', { what: via });
    see('cats', index);
    const { busy } = scene.chatStart(index);
    scene.meow(index);
    const cat = cats[index];
    $('chat-swatch').style.background = cat.coat.body;
    $('chat-coat').textContent = cat.coat.label;
    $('chat-name').textContent = cat.name;
    const info = scene.catInfo(index);
    $('chat-card').hidden = false;
    $('chat-card').scrollTop = 0;
    // 跟著島主走的時候，鏡頭讓出卡片的位置，才看得到島主和貓
    if (focus === 'owner') scene.follow('owner', insets());
    chatSay(busy ? chatBusy(info && info.doing) : chatGreeting(cat, who(), Math.random()));
  }

  $('chat-pet').addEventListener('click', () => {
    if (chatIndex === null) return;
    scene.chatPet();
    chatSay(chatPet(Math.random()));
  });
  $('chat-doing').addEventListener('click', () => {
    if (chatIndex === null) return;
    const info = scene.catInfo(chatIndex);
    chatSay(chatDoing(info && info.doing));
  });
  $('chat-best').addEventListener('click', () => {
    if (chatIndex === null) return;
    const best = bestPerCat(records).get(chatIndex);
    chatSay(chatBest(best && best.cm, best && LEVELS[best.level].name));
  });
  $('chat-diary').addEventListener('click', () => {
    if (chatIndex === null) return;
    const mine = diaries.filter((d) => d.cat === chatIndex).pop();
    chatSay(chatDiary(mine && mine.lines[0]));
  });
  $('chat-info').addEventListener('click', () => {
    if (chatIndex !== null) openCat(chatIndex, 'chat');
  });

  // 貓卡
  // via：從哪裡點進來的（3d、island_card、box），給 GA 看大家怎麼找到貓
  function openCat(index, via) {
    sound.unlock();
    closeCards();
    openCatIndex = index;
    track('cat_open', { what: via });
    see('cats', index);
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
      $('race-dock').hidden = true;
      measureBottom();
      scene.follow(openCatIndex, insets());
      track('cat_follow', { what: 'cat' });
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

  function rankNote() {
    return rankKind === 'race'
      ? '每隻貓只算牠跑最快的那一次，跑一圈用的秒數越少越快。島主一起跑的不算，這裡只比貓貓。'
      : `每隻貓只算牠跳最高的那一次。名字旁邊蓋了「${stampChar(profile)}」字章的，是${who()}幫忙按的。`;
  }

  function renderRank() {
    const racing = rankKind === 'race';
    document.querySelectorAll('#rank-kinds .tab').forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.kind === rankKind)));
    document.querySelectorAll('#rank-levels .tab').forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.level === rankLevel)));
    $('rank-levels').hidden = racing;
    $('rank-title').textContent = racing ? '這次誰跑最快？' : '這次誰跳最高？';
    $('rank-note').textContent = rankNote();
    if (racing) {
      renderRaceRank();
      return;
    }
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
        const badge = el('span', 'tong-badge', stampChar(profile));
        badge.title = `${who()}幫忙按的`;
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
      ? `這次一共跳了 ${records.length} 次，${who()}幫忙按了 ${tongJumps} 次。`
      : '這次還沒有人跳。';
  }

  // 跑步排行：秒數越少越前面；跑過第一名的貓旁邊寫第一名幾次
  function renderRaceRank() {
    const rows = raceLeaderboard(raceBoard, 10);
    const list = $('rank-list');
    list.replaceChildren();
    rows.forEach((r) => {
      const li = el('li', 'rank-row');
      li.append(el('span', `medal medal--${r.rank}`, String(r.rank)));
      const dot = el('i', 'dot');
      dot.style.background = cats[r.cat].coat.body;
      li.append(dot);
      li.append(el('span', 'rank-row__name', cats[r.cat].name));
      li.append(r.wins ? el('span', 'level-tag level-tag--win', `第一名 ${r.wins} 次`) : el('span'));
      const sec = el('span', 'rank-row__cm', secondsText(r.best));
      sec.append(el('small', '', '秒'));
      li.append(sec);
      list.append(li);
    });
    $('rank-empty').hidden = rows.length > 0;
    $('rank-empty').textContent = '還沒有比賽成績，貓貓正在田徑場暖身。';
    const champ = raceTopWinner(raceBoard);
    $('rank-summary').textContent = raceBoard.races
      ? `這次一共比了 ${raceBoard.races} 場${champ ? `，最常跑第一名的是${cats[champ.cat].name}（${champ.wins} 次）` : ''}。`
      : '這次還沒有比賽。';
  }

  document.querySelectorAll('#rank-kinds .tab').forEach((tab) => tab.addEventListener('click', () => {
    rankKind = tab.dataset.kind;
    renderRank();
  }));
  document.querySelectorAll('#rank-levels .tab').forEach((tab) => tab.addEventListener('click', () => {
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
    raceBoard = sanitizeRaceBoard(null);
    save();
    refreshBoards();
    $('reset-confirm').hidden = true;
    $('reset-ask').hidden = false;
    showToast('新的一輪開始！', '大家重新比，看這次誰跳最高、誰跑最快');
  });

  const foundInBox = new Map();

  // 3D 場景裡點到的東西
  scene.onPick((pick) => {
    sound.unlock();
    if (pick.type === 'island') {
      // 已經在這座島上（或正跟著島主逛）：點地上就是島主走過去
      if (pick.point && profile.avatar && (focus === pick.id || focus === 'owner')) scene.ownerWalkTo(pick.point, pick.id);
      else goIsland(pick.id);
    } else if (pick.type === 'owner') openProfile();
    else if (pick.type === 'ownerHome') {
      if (focus === 'park1') openHome();
      else goIsland('park1');
    } else if (pick.type === 'cat') openChat(pick.index, '3d');
    else if (pick.type === 'coach') openCoach();
    else if (pick.type === 'teacher' || pick.type === 'podium') atLearn(openLearn);
    else if (pick.type === 'board') atLearn(openLesson);
    else if (pick.type === 'box') {
      const hiding = scene.peekBox(pick.spot);
      track('box_peek', { result: hiding !== null ? 'found' : 'empty' });
      if (hiding !== null) {
        // 同一隻貓一分鐘內再點只算一次，連點同一個紙箱不會一直累積
        if (Date.now() - (foundInBox.get(hiding) || 0) > 60000) tally('boxes');
        foundInBox.set(hiding, Date.now());
        openChat(hiding, 'box');
      } else {
        sound.play('pop');
      }
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
  applyName();
  syncOwnerButtons();
  // 第一次來先看故事，看完問名字和樣子；再來就直接回到島主之家，先聽最近的新鮮事
  if (!storySeen) {
    openStory();
  } else if (!profile.asked) {
    openProfile(true);
    homeAfterProfile = true;
  } else {
    goIsland('park1', true, true);
  }
  tallied();
  // 有暗號就先對一次雲端；有名字還沒有暗號（連不上或舊版取的名字）就補開一張
  if (profile.cloud.code) syncNow({ force: true });
  else if (profile.name) linkCloud();
}

const hot = window.claude?.hot;
if (hot?.ready) hot.ready(start);
else start(hot?.data ?? {});
