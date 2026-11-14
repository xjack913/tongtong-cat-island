// 島主卡：玩家自己取的名字、島主的樣子、會一直累積的數字、拿到的徽章。瀏覽器、Node、Worker 共用的純邏輯。
// 每個來的人都是這座島的島主，貓貓才是島民。
// 存在 localStorage 的 profile 欄位；數字只會往上加，排行榜的「重新比一次」不會清掉這裡。
// 沒取名字的人就叫桐桐。
//
// 有暗號的話，每臺裝置只把「自己這臺累積的」存到雲端（一臺一列）。別臺的合起來放在 remote，
// 畫面上看到的是兩邊加起來。同一臺裝置重送只會取比較大的數字，所以送兩次不會多算。
import { plainText } from './zhuyin.js';

export const DEFAULT_NAME = '桐桐';
export const NAME_MAX = 8;

// 島主可以選的樣子
export const AVATARS = [
  { id: 'man', label: '大人（男）' },
  { id: 'woman', label: '大人（女）' },
  { id: 'boy', label: '小孩（男）' },
  { id: 'girl', label: '小孩（女）' },
  { id: 'cat', label: '貓' },
];
const AVATAR_IDS = AVATARS.map((a) => a.id);

// 算「全島走透透」的島，id 跟 app.js 的 NAV 一樣（「看全島」和「貓貓教練」不是島）
export const ISLAND_IDS = ['home', 'low', 'mid', 'high', 'stage', 'track', 'diary', 'learn', 'boxes', 'combo', 'park1', 'park2', 'rank', 'shop'];
const UNIT_COUNT = 9;
const COUNT_MAX = 1e9;
// 小魚金幣和電也用「只會往上加」的數字記：一共賺到、一共花掉的金幣，一共用掉、一共補回來的電。
// 這樣跟其他數字一樣，同一臺取大的、不同臺加起來，換裝置也對得起來
const COUNT_KEYS = ['jumps', 'perfect', 'perfectHigh', 'records', 'graded', 'right', 'daysDone', 'daysAllRight', 'stamps', 'tricks', 'claps', 'boxes', 'days',
  'coinsIn', 'coinsOut', 'powerOut', 'powerIn',
  // 徽章用的：在商店買了幾次、睡覺一共補了幾個電、島主跑了幾場比賽、跑進前三名幾次
  'buys', 'sleepPower', 'races', 'raceTop3'];

// ---------- 島主的電和小魚金幣（照桐桐寫的規則） ----------
export const POWER_MAX = 30;
// 玩一次要用掉幾個電：跑步田徑場、三座跳臺；改作業不用電
export const POWER_COST = { track: 20, high: 10, mid: 5, low: 3 };
// 跳一次拿到的小魚金幣：破紀錄、完美跳、其他，只拿最高的那一種
export const JUMP_REWARD = {
  high: { record: 20, perfect: 10, other: 3 },
  mid: { record: 5, perfect: 3, other: 1 },
  low: { record: 3, perfect: 2, other: 0 },
};
export const RACE_REWARD = { top: 15, other: 10 };
export const HOMEWORK_REWARD = 1;
// 貓貓商店：買了馬上吃掉、喝掉
export const SHOP_ITEMS = [
  { id: 'fruit', name: '水果', verb: '吃', price: 5, power: 15 },
  { id: 'water', name: '水', verb: '喝', price: 3, power: 10 },
  { id: 'juice', name: '果汁', verb: '喝', price: 10, power: 10 },
];
const LEVELS3 = ['low', 'mid', 'high'];
const CM_MAX = 100000;

// 島主暗號：8 碼，拿掉長得很像的 0、O、1、I、L，小朋友抄的時候才不會抄錯
export const CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const CODE_LENGTH = 8;

// stat 是 counts 裡的數字，或 seen 裡收集到幾個（islands、cats、units）
export const BADGE_GROUPS = [
  { id: 'jump', title: '跳高' },
  { id: 'teach', title: '當老師' },
  { id: 'explore', title: '逛島' },
  { id: 'back', title: '常回來' },
  { id: 'power', title: '電和小魚金幣' },
];
export const BADGES = [
  { id: 'perfect1', group: 'jump', title: '第一次翻跟斗', text: '按出第一個完美跳', stat: 'perfect', goal: 1 },
  { id: 'perfect10', group: 'jump', title: '翻跟斗小高手', text: '按出 10 次完美跳', stat: 'perfect', goal: 10 },
  { id: 'perfect50', group: 'jump', title: '翻跟斗教練', text: '按出 50 次完美跳', stat: 'perfect', goal: 50 },
  { id: 'perfect100', group: 'jump', title: '翻跟斗大師', text: '按出 100 次完美跳', stat: 'perfect', goal: 100 },
  { id: 'perfectHigh', group: 'jump', title: '高階也不怕', text: '在高階跳臺按出完美跳', stat: 'perfectHigh', goal: 1 },
  { id: 'jumps100', group: 'jump', title: '跳臺常客', text: '幫貓貓按 100 次跳', stat: 'jumps', goal: 100 },
  { id: 'record1', group: 'jump', title: '全島新紀錄', text: '幫貓貓跳出全島新紀錄', stat: 'records', goal: 1 },
  { id: 'graded1', group: 'teach', title: '小老師上任', text: '改好第一張作業', stat: 'graded', goal: 1 },
  { id: 'graded20', group: 'teach', title: '認真的小老師', text: '改好 20 張作業', stat: 'graded', goal: 20 },
  { id: 'graded100', group: 'teach', title: '資深老師', text: '改好 100 張作業', stat: 'graded', goal: 100 },
  { id: 'allRight', group: 'teach', title: '滿分老師', text: '一天 20 張全部一次就改對', stat: 'daysAllRight', goal: 1 },
  { id: 'units9', group: 'teach', title: '九個單元都上完', text: '黑板課 9 個單元都看到最後一頁', stat: 'units', goal: UNIT_COUNT },
  { id: 'islands', group: 'explore', title: '全島走透透', text: `${ISLAND_IDS.length} 座島都去過`, stat: 'islands', goal: ISLAND_IDS.length },
  { id: 'cats10', group: 'explore', title: '貓貓好夥伴', text: '點過 10 隻不一樣的貓', stat: 'cats', goal: 10 },
  { id: 'cats50', group: 'explore', title: '貓貓大集合', text: '50 隻貓都點過', stat: 'cats', goal: 50 },
  { id: 'boxes10', group: 'explore', title: '躲貓貓高手', text: '找到 10 次躲紙箱的貓', stat: 'boxes', goal: 10 },
  { id: 'stamps100', group: 'explore', title: '掌印收集家', text: '幫日記蓋 100 個貓掌印', stat: 'stamps', goal: 100 },
  { id: 'claps30', group: 'explore', title: '最佳觀眾', text: '在表演區拍手 30 次', stat: 'claps', goal: 30 },
  { id: 'tricks30', group: 'explore', title: '小小導演', text: '叫臺上的貓表演 30 次', stat: 'tricks', goal: 30 },
  { id: 'days3', group: 'back', title: '又回來玩了', text: '來島上 3 天', stat: 'days', goal: 3 },
  { id: 'days7', group: 'back', title: '常來的島主', text: '來島上 7 天', stat: 'days', goal: 7 },
  { id: 'days30', group: 'back', title: '老島主', text: '來島上 30 天', stat: 'days', goal: 30 },
  { id: 'coins10', group: 'power', title: '第一桶小魚金幣', text: '賺到 10 個小魚金幣', stat: 'coinsIn', goal: 10 },
  { id: 'coins100', group: 'power', title: '小魚金幣高手', text: '賺到 100 個小魚金幣', stat: 'coinsIn', goal: 100 },
  { id: 'coins500', group: 'power', title: '小魚金幣大富翁', text: '賺到 500 個小魚金幣', stat: 'coinsIn', goal: 500 },
  { id: 'buy1', group: 'power', title: '第一次逛商店', text: '在貓貓商店買 1 次', stat: 'buys', goal: 1 },
  { id: 'buy20', group: 'power', title: '商店常客', text: '在貓貓商店買 20 次', stat: 'buys', goal: 20 },
  { id: 'sleep30', group: 'power', title: '睡飽飽', text: '回家睡覺補了 30 個電', stat: 'sleepPower', goal: 30 },
  { id: 'race1', group: 'power', title: '島主也來跑', text: '跟貓貓一起跑 1 場比賽', stat: 'races', goal: 1 },
  { id: 'raceTop3', group: 'power', title: '跑進前三名', text: '比賽跑進前三名', stat: 'raceTop3', goal: 1 },
];
const BADGE_IDS = new Set(BADGES.map((b) => b.id));

function count(value) {
  return Number.isInteger(value) && value > 0 ? Math.min(value, COUNT_MAX) : 0;
}

function uniqueWhere(value, ok) {
  return Array.isArray(value) ? [...new Set(value.filter(ok))] : [];
}

const isDay = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const isObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
const isTime = (value) => Number.isInteger(value) && value > 0 && value < 1e14;

// 留下看得到的字：去掉換行、控制字元和注音選擇子，空白併成一個，最多 NAME_MAX 個字
export function cleanName(text) {
  const plain = plainText(String(text ?? '')).replace(/[\p{C}\p{Zl}\p{Zp}]/gu, '').replace(/\s+/g, ' ').trim();
  return [...plain].slice(0, NAME_MAX).join('').trim();
}

// 暗號：大小寫、空白、連字號都不計較；不是 8 碼或有不該出現的字就回空字串
export function normalizeCode(text) {
  const code = String(text ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (code.length !== CODE_LENGTH) return '';
  return [...code].every((c) => CODE_CHARS.includes(c)) ? code : '';
}

export function formatCode(code) {
  return code ? `${code.slice(0, 4)}-${code.slice(4)}` : '';
}

// 一臺裝置累積的東西：存檔、上傳、合併都是這個形狀
export function sanitizeDeviceData(raw, catCount) {
  const from = isObject(raw) ? raw : {};
  const counts = {};
  COUNT_KEYS.forEach((key) => {
    counts[key] = count(from.counts && from.counts[key]);
  });
  const seen = isObject(from.seen) ? from.seen : {};
  const earned = {};
  BADGES.forEach((badge) => {
    const day = from.earned && from.earned[badge.id];
    if (isDay(day)) earned[badge.id] = day;
  });
  return {
    name: cleanName(from.name),
    nameAt: isTime(from.nameAt) ? from.nameAt : 0,
    avatar: AVATAR_IDS.includes(from.avatar) ? from.avatar : '',
    avatarAt: isTime(from.avatarAt) ? from.avatarAt : 0,
    bestCm: count(from.bestCm),
    tops: sanitizeTops(from.tops),
    counts,
    seen: {
      islands: uniqueWhere(seen.islands, (id) => ISLAND_IDS.includes(id)),
      cats: uniqueWhere(seen.cats, (n) => Number.isInteger(n) && n >= 0 && n < catCount),
      units: uniqueWhere(seen.units, (n) => Number.isInteger(n) && n >= 1 && n <= UNIT_COUNT),
    },
    earned,
  };
}

// 算「破紀錄」用的最高成績：cat 是每座跳臺貓跳過最高的、own 是島主自己跳過最高的（公分）。
// 排行榜的「重新比一次」不會清掉這裡，不然清完第一跳就破紀錄
function sanitizeTops(raw) {
  const from = isObject(raw) ? raw : {};
  const pick = (group) => Object.fromEntries(LEVELS3.map((level) => [level, Math.min(count(isObject(from[group]) && from[group][level]), CM_MAX)]));
  return { cat: pick('cat'), own: pick('own') };
}

function mergeTops(a, b) {
  const pick = (group) => Object.fromEntries(LEVELS3.map((level) => [level, Math.max(a[group][level], b[group][level])]));
  return { cat: pick('cat'), own: pick('own') };
}

// raw 是存檔裡的 profile。第一次打開新版時還沒有，就用舊存檔算得出來的數字開始（seed）
export function sanitizeProfile(raw, catCount, seed = {}) {
  const from = isObject(raw) ? raw : { counts: seed };
  const cloud = isObject(from.cloud) ? from.cloud : {};
  return {
    ...sanitizeDeviceData(from, catCount),
    asked: from.asked === true,
    firstDay: isDay(from.firstDay) ? from.firstDay : '',
    lastDay: isDay(from.lastDay) ? from.lastDay : '',
    cloud: {
      code: normalizeCode(cloud.code),
      deviceId: isDeviceId(cloud.deviceId) ? cloud.deviceId : '',
    },
    remote: sanitizeDeviceData(from.remote, catCount),
  };
}

export function isDeviceId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(value);
}

// 這臺裝置要上傳的部分
export function ownData(profile) {
  const { name, nameAt, avatar, avatarAt, bestCm, tops, counts, seen, earned } = profile;
  return { name, nameAt, avatar, avatarAt, bestCm, tops, counts, seen, earned };
}

function earliest(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

function mergeEarned(a, b) {
  const out = { ...a };
  Object.entries(b).forEach(([id, day]) => {
    if (BADGE_IDS.has(id)) out[id] = earliest(out[id], day);
  });
  return out;
}

function unionSeen(a, b) {
  return {
    islands: [...new Set([...a.islands, ...b.islands])],
    cats: [...new Set([...a.cats, ...b.cats])],
    units: [...new Set([...a.units, ...b.units])],
  };
}

function latestName(a, b) {
  if (b.name && (!a.name || b.nameAt >= a.nameAt)) return { name: b.name, nameAt: b.nameAt };
  return { name: a.name, nameAt: a.nameAt };
}

function latestAvatar(a, b) {
  if (b.avatar && (!a.avatar || b.avatarAt >= a.avatarAt)) return { avatar: b.avatar, avatarAt: b.avatarAt };
  return { avatar: a.avatar, avatarAt: a.avatarAt };
}

// 同一臺裝置的舊資料和新資料：數字只取大的，重送、晚到都不會多算或變少
export function mergeOwn(previous, next) {
  const counts = {};
  COUNT_KEYS.forEach((key) => {
    counts[key] = Math.max(previous.counts[key], next.counts[key]);
  });
  return {
    ...latestName(previous, next),
    ...latestAvatar(previous, next),
    bestCm: Math.max(previous.bestCm, next.bestCm),
    tops: mergeTops(previous.tops, next.tops),
    counts,
    seen: unionSeen(previous.seen, next.seen),
    earned: mergeEarned(previous.earned, next.earned),
  };
}

// 不同裝置：數字加起來，收集的東西取聯集，名字用最後改的
export function mergeDevices(list, catCount) {
  return list.reduce((sum, device) => {
    const counts = {};
    COUNT_KEYS.forEach((key) => {
      counts[key] = Math.min(sum.counts[key] + device.counts[key], COUNT_MAX);
    });
    return {
      ...latestName(sum, device),
      ...latestAvatar(sum, device),
      bestCm: Math.max(sum.bestCm, device.bestCm),
      tops: mergeTops(sum.tops, device.tops),
      counts,
      seen: unionSeen(sum.seen, device.seen),
      earned: mergeEarned(sum.earned, device.earned),
    };
  }, sanitizeDeviceData(null, catCount));
}

// 收到別臺裝置合起來的資料。回傳 true 表示名字或樣子變了，畫面要跟著換
export function applyRemote(profile, others) {
  profile.remote = others;
  profile.earned = mergeEarned(profile.earned, others.earned);
  const named = latestName(profile, others);
  const looked = latestAvatar(profile, others);
  const changed = named.name !== profile.name || looked.avatar !== profile.avatar;
  profile.name = named.name;
  profile.nameAt = named.nameAt;
  profile.avatar = looked.avatar;
  profile.avatarAt = looked.avatarAt;
  return changed;
}

export function playerName(profile) {
  return profile.name || DEFAULT_NAME;
}

// 排行榜上蓋的章：名字的第一個字
export function stampChar(profile) {
  return [...playerName(profile)][0];
}

// 畫面上看到的數字：這臺加上別臺
export function total(profile, key) {
  return Math.min(profile.counts[key] + profile.remote.counts[key], COUNT_MAX);
}

export function bestCm(profile) {
  return Math.max(profile.bestCm, profile.remote.bestCm);
}

export function seenCount(profile, key) {
  return new Set([...profile.seen[key], ...profile.remote.seen[key]]).size;
}

export function statValue(profile, stat) {
  return profile.seen[stat] ? seenCount(profile, stat) : total(profile, stat);
}

export function bump(profile, key, amount = 1) {
  if (!COUNT_KEYS.includes(key)) throw new Error(`沒有這個數字：${key}`);
  profile.counts[key] = Math.min(profile.counts[key] + amount, COUNT_MAX);
}

// ---------- 小魚金幣和電 ----------
// 畫面上的數字都是「這臺加別臺」算出來的。兩臺裝置同時玩的話可能一時對不上，所以最後都夾在合理範圍裡
export function coins(profile) {
  return Math.max(0, total(profile, 'coinsIn') - total(profile, 'coinsOut'));
}

export function power(profile) {
  return Math.max(0, Math.min(POWER_MAX, POWER_MAX - total(profile, 'powerOut') + total(profile, 'powerIn')));
}

export function earnCoins(profile, amount) {
  if (Number.isInteger(amount) && amount > 0) bump(profile, 'coinsIn', amount);
  return amount > 0 ? amount : 0;
}

// 電夠才扣，回傳 true；不夠就什麼都不動
export function usePower(profile, amount) {
  if (power(profile) < amount) return false;
  // 兩臺裝置各補各的，加起來可能超過 30：先把多出來的部分抵掉，扣完才會是「現在的電減掉這次用的」
  const raw = POWER_MAX - total(profile, 'powerOut') + total(profile, 'powerIn');
  bump(profile, 'powerOut', amount + Math.max(0, raw - POWER_MAX));
  return true;
}

// 補電，最多補到 30；回傳真的補了多少
export function gainPower(profile, amount) {
  const raw = POWER_MAX - total(profile, 'powerOut') + total(profile, 'powerIn');
  const gained = Math.max(0, Math.min(amount, POWER_MAX - power(profile)));
  // raw 比 0 還小（兩臺同時用電）的時候先補回 0，再加這次補的
  if (gained > 0) bump(profile, 'powerIn', gained + Math.max(0, -raw));
  return gained;
}

// 在貓貓商店買東西：金幣不夠、電已經滿了都不能買
export function buyItem(profile, id) {
  const item = SHOP_ITEMS.find((i) => i.id === id);
  if (!item) return { ok: false, reason: 'none' };
  if (coins(profile) < item.price) return { ok: false, reason: 'coins', item };
  if (power(profile) >= POWER_MAX) return { ok: false, reason: 'full', item };
  bump(profile, 'coinsOut', item.price);
  bump(profile, 'buys');
  return { ok: true, item, gained: gainPower(profile, item.power) };
}

// who 是 'cat'（幫貓貓按的）或 'own'（島主自己跳）。先看有沒有破這座跳臺的紀錄，再把紀錄記下來
export function jumpTop(profile, who, level) {
  return Math.max(profile.tops[who][level], profile.remote.tops[who][level]);
}

export function noteJumpTop(profile, who, level, cm) {
  if (cm > profile.tops[who][level]) profile.tops[who][level] = Math.min(cm, CM_MAX);
}

// 這一跳是哪一種：比以前最高的還高就是破紀錄。這座跳臺第一次有成績也算（跟排行榜原本的判定一樣），
// 但紀錄不會被「重新比一次」清掉，所以每座跳臺只有一次
export function jumpGrade(top, cm, perfect) {
  if (cm > top) return 'record';
  return perfect ? 'perfect' : 'other';
}

export function jumpReward(level, grade) {
  return JUMP_REWARD[level] ? JUMP_REWARD[level][grade] || 0 : 0;
}

export function raceReward(place) {
  return place >= 1 && place <= 3 ? RACE_REWARD.top : RACE_REWARD.other;
}

// 回家睡覺：sleepAt 是開始睡（或上次補電）的時間，每過 1 分鐘補 1 個電，補到 30 為止。
// 關掉網頁也照算，下次打開一次補齊。回傳補了多少、和新的 sleepAt（不滿 1 分鐘的零頭留著）
export function sleepGain(profile, sleepAt, now) {
  const minutes = Math.floor((now - sleepAt) / 60000);
  if (!(minutes > 0)) return { gained: 0, sleepAt: now < sleepAt ? now : sleepAt };
  const gained = gainPower(profile, minutes);
  if (gained > 0) bump(profile, 'sleepPower', gained);
  return { gained, sleepAt: power(profile) >= POWER_MAX ? now : sleepAt + minutes * 60000 };
}

// 第一次收集到才回傳 true
export function addSeen(profile, key, value) {
  if (profile.seen[key].includes(value)) return false;
  profile.seen[key].push(value);
  return true;
}

// 今天第一次來才回傳 true
export function markDay(profile, day) {
  if (profile.lastDay === day) return false;
  profile.lastDay = day;
  if (!profile.firstDay) profile.firstDay = day;
  bump(profile, 'days');
  return true;
}

// 達標就給徽章，回傳這次新拿到的；拿到了就不會收回
export function award(profile, day) {
  const fresh = BADGES.filter((badge) => !profile.earned[badge.id] && statValue(profile, badge.stat) >= badge.goal);
  fresh.forEach((badge) => {
    profile.earned[badge.id] = day;
  });
  return fresh;
}

// 2026-11-07 → 11 月 7 日
export function earnedDayText(day) {
  const [, month, date] = day.split('-').map(Number);
  return `${month} 月 ${date} 日`;
}
