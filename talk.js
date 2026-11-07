// 島上的話：回到島主之家時的「最近的新鮮事」、跟貓聊天時貓說的話。瀏覽器與 Node 共用的純邏輯。
// 公告和比賽、紀錄、日記都是真的發生過的；「聽說」開頭的是每天換的島上小故事。

import { mulberry32 } from './logic.js';

// 島上真的蓋了什麼：上次來之後才有的會報給島主聽，最新的放前面
export const ISLAND_NEWS = [
  { day: '2026-11-07', text: '紙箱公園改建成島主之家了，這裡就是你的家。' },
  { day: '2026-11-07', text: '跑步田徑場島蓋好了，七條跑道可以看貓貓比賽。' },
];

// 每天換的島上小故事，a、b 是兩隻不同的貓
export const GOSSIP = [
  (a) => `聽說${a}昨天晚上偷偷跑去魚池公園看錦鯉，看到睡著了。`,
  (a, b) => `聽說${a}和${b}在多多紙箱區玩躲貓貓，找了好久都找不到對方。`,
  (a, b) => `聽說${a}說牠今天要跳得比${b}還高，大家都在等著看。`,
  (a) => `聽說貓貓老師誇${a}最近上課很認真，作業都有寫。`,
  (a) => `聽說貓貓教練又看到${a}在島上晃來晃去，叫牠快去跳臺練習。`,
  (a) => `聽說${a}在日記區寫了好長的日記，寫到飼料都忘記吃。`,
  (a) => `聽說${a}在跑步田徑場的草場跑了好多圈，跑完就躺在草地上。`,
  (a) => `聽說表演區最近很熱鬧，${a}練了一個新的翻跟斗。`,
  (a) => `聽說合體公園的水碗被${a}打翻了，牠還裝作不是牠做的。`,
  (a, b) => `聽說${a}把最喜愛的毛線球借給${b}玩，兩隻貓玩了一個下午。`,
];

function daySeed(day) {
  return [...day].reduce((sum, c) => (sum * 31 + c.charCodeAt(0)) % 2147483647, 7);
}

// 同一天看到的小故事都一樣，隔天換新的
export function dailyGossip(day, names, count = 2) {
  const random = mulberry32(daySeed(day));
  const pool = GOSSIP.slice();
  const out = [];
  for (let i = 0; i < count && pool.length; i++) {
    const make = pool.splice(Math.floor(random() * pool.length), 1)[0];
    const a = Math.floor(random() * names.length);
    let b = Math.floor(random() * names.length);
    if (b === a) b = (a + 1) % names.length;
    out.push(make(names[a], names[b]));
  }
  return out;
}

// 島上真的發生的事，邊玩邊記下來（最多留 NEWS_MAX 筆，舊的丟掉）
export const NEWS_MAX = 20;

export function sanitizeNews(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((n) => n && typeof n.text === 'string' && n.text.length > 0 && n.text.length <= 80 && typeof n.day === 'string' && n.day.length <= 10)
    .slice(-NEWS_MAX)
    .map((n) => ({ day: n.day, text: n.text }));
}

export function recordNews(list, day, text) {
  const next = list.filter((n) => n.text !== text);
  next.push({ day, text });
  return next.slice(-NEWS_MAX);
}

export function recordJumpNews(name, levelName, cm) {
  return `${name}在${levelName}跳了 ${cm} 公分，是全島新紀錄！`;
}

export function recordRaceNews(name) {
  return `${name}在跑步田徑場跑了第一名！`;
}

// 回到島主之家時要說的話：公告、真的發生的事、日記、聽說，最多 limit 則
// previousDay 是上次來的日期（第一次來是空字串，就不報公告）
export function composeNews({ today, previousDay, events = [], diary = null, names, limit = 5 }) {
  const out = [];
  if (previousDay) {
    ISLAND_NEWS.filter((n) => n.day >= previousDay).slice(0, 2).forEach((n) => out.push({ tag: '島上公告', text: n.text }));
  }
  events.slice(-2).reverse().forEach((n) => out.push({ tag: '島上大事', text: n.text }));
  if (diary) out.push({ tag: '貓貓日記', text: `${diary.name}在日記裡寫：「${diary.line}」` });
  dailyGossip(today, names, Math.max(1, limit - out.length)).forEach((text) => out.push({ tag: '島上小故事', text }));
  return out.slice(0, limit);
}

// ---------- 跟貓聊天 ----------
function pickFrom(list, pick) {
  return list[Math.min(list.length - 1, Math.floor(pick * list.length))];
}

export function chatGreeting(cat, who, pick = 0.5) {
  if (cat.sporty > 0.7) return pickFrom([`${who}島主好！我今天想跳得更高！`, `${who}島主，你看我的腿，很有力吧！`], pick);
  if (cat.sleepy > 0.7) return pickFrom([`${who}島主…我有一點想睡覺。`, `喵…${who}島主，你也要來睡午覺嗎？`], pick);
  return pickFrom([`喵～${who}島主好！`, `${who}島主，你來找我玩嗎？`, `${who}島主，今天島上好好玩。`], pick);
}

export function chatPet(pick = 0.5) {
  return pickFrom(['喵～再摸一下！', '呼嚕呼嚕…', '島主最好了，我最愛島主！', '嘿嘿，好癢喔！'], pick);
}

// doing 是這隻貓現在在做的事（scene.catInfo 給的）
export function chatDoing(doing) {
  return doing ? `我${doing}。` : '我在島上晃來晃去。';
}

export function chatBest(best, levelName) {
  return best ? `我跳最高是 ${best} 公分，在${levelName}跳的。` : '我這一輪還沒跳過，你可以去跳臺幫我按按看。';
}

export function chatDiary(line) {
  return line ? `我最近在日記寫：「${line}」` : '我還沒寫日記，等我做了好玩的事就寫。';
}

// 正在比賽、跳高、表演的貓沒辦法停下來
export function chatBusy(doing) {
  return doing ? `等一下喔，我${doing}。` : '等一下喔，我在忙。';
}
