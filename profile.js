// 島民卡：玩家自己取的名字、會一直累積的數字、拿到的徽章。瀏覽器與 Node 共用的純邏輯。
// 存在 localStorage 的 profile 欄位；數字只會往上加，排行榜的「重新比一次」不會清掉這裡。
// 沒取名字的人維持原本的設定，就是島主桐桐。
import { plainText } from './zhuyin.js';

export const DEFAULT_NAME = '桐桐';
export const NAME_MAX = 8;

// 算「全島走透透」的島，id 跟 app.js 的 NAV 一樣（「看全島」和「貓貓教練」不是島）
export const ISLAND_IDS = ['home', 'low', 'mid', 'high', 'stage', 'diary', 'learn', 'boxes', 'combo', 'park1', 'park2', 'rank'];
const UNIT_COUNT = 9;
const COUNT_MAX = 1e9;
const COUNT_KEYS = ['jumps', 'perfect', 'perfectHigh', 'records', 'graded', 'right', 'daysDone', 'daysAllRight', 'stamps', 'tricks', 'claps', 'boxes', 'days'];

// stat 是 counts 裡的數字，或 seen 裡收集到幾個（islands、cats、units）
export const BADGE_GROUPS = [
  { id: 'jump', title: '跳高' },
  { id: 'teach', title: '當老師' },
  { id: 'explore', title: '逛島' },
  { id: 'back', title: '常回來' },
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
  { id: 'days7', group: 'back', title: '常來的島民', text: '來島上 7 天', stat: 'days', goal: 7 },
  { id: 'days30', group: 'back', title: '老島民', text: '來島上 30 天', stat: 'days', goal: 30 },
];

function emptyCounts() {
  return Object.fromEntries(COUNT_KEYS.map((key) => [key, 0]));
}

function count(value) {
  return Number.isInteger(value) && value > 0 ? Math.min(value, COUNT_MAX) : 0;
}

function uniqueWhere(value, ok) {
  return Array.isArray(value) ? [...new Set(value.filter(ok))] : [];
}

const isDay = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

// 留下看得到的字：去掉換行、控制字元和注音選擇子，空白併成一個，最多 NAME_MAX 個字
export function cleanName(text) {
  const plain = plainText(String(text ?? '')).replace(/[\p{C}\p{Zl}\p{Zp}]/gu, '').replace(/\s+/g, ' ').trim();
  return [...plain].slice(0, NAME_MAX).join('').trim();
}

// raw 是存檔裡的 profile。第一次打開新版時還沒有，就用舊存檔算得出來的數字開始（seed）
export function sanitizeProfile(raw, catCount, seed = {}) {
  const isObject = raw && typeof raw === 'object' && !Array.isArray(raw);
  const from = isObject ? raw : { counts: seed };
  const counts = emptyCounts();
  COUNT_KEYS.forEach((key) => {
    counts[key] = count(from.counts && from.counts[key]);
  });
  const seen = from.seen || {};
  const earned = {};
  BADGES.forEach((badge) => {
    const day = from.earned && from.earned[badge.id];
    if (isDay(day)) earned[badge.id] = day;
  });
  return {
    name: cleanName(from.name),
    asked: from.asked === true,
    firstDay: isDay(from.firstDay) ? from.firstDay : '',
    lastDay: isDay(from.lastDay) ? from.lastDay : '',
    bestCm: count(from.bestCm),
    counts,
    seen: {
      islands: uniqueWhere(seen.islands, (id) => ISLAND_IDS.includes(id)),
      cats: uniqueWhere(seen.cats, (n) => Number.isInteger(n) && n >= 0 && n < catCount),
      units: uniqueWhere(seen.units, (n) => Number.isInteger(n) && n >= 1 && n <= UNIT_COUNT),
    },
    earned,
  };
}

export function playerName(profile) {
  return profile.name || DEFAULT_NAME;
}

// 排行榜上蓋的章：名字的第一個字
export function stampChar(profile) {
  return [...playerName(profile)][0];
}

export function statValue(profile, stat) {
  return profile.seen[stat] ? profile.seen[stat].length : profile.counts[stat] || 0;
}

export function bump(profile, key, amount = 1) {
  if (!COUNT_KEYS.includes(key)) throw new Error(`沒有這個數字：${key}`);
  profile.counts[key] = Math.min(profile.counts[key] + amount, COUNT_MAX);
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
