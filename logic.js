// 桐桐貓貓島純邏輯：照桐桐草稿描的島與橋、50 隻貓、三座跳臺的蓄力與高度、這一輪的排行榜、貓寫的日記。
// 瀏覽器與 Node 共用，不 import 任何東西。

// 草稿照片的像素座標換成場景的公尺：草稿中心 (760, 660)，30 像素＝1 公尺；
// 每座島再往自己的中心縮 8%，讓橋底下看得到水
export const SKETCH = { cx: 760, cy: 660, scale: 30, shrink: 0.92 };

export function fromSketch([px, py]) {
  return { x: (px - SKETCH.cx) / SKETCH.scale, z: (py - SKETCH.cy) / SKETCH.scale };
}

// 十二座島：outline 是草稿上的島形頂點；ring 是島上環狀步道離中心的比例。
// 表演區到合體公園四座是桐桐第二張草稿加的，那張照片的角度不一樣，先用兩張照片上相同的角點對齊，再換成第一張的座標；
// 學習島是桐桐後來說要加的，草稿上沒畫，放在高階跳臺上面那塊空地
export const ISLANDS = [
  { id: 'home', kind: 'home', name: '貓貓之家', ring: 0.7, outline: [[560, 700], [593, 527], [895, 520], [960, 680], [860, 800], [640, 800]] },
  { id: 'high', kind: 'jump', level: 'high', name: '高階跳臺', ring: 0.7, outline: [[183, 398], [248, 248], [565, 222], [633, 410], [535, 556], [270, 530]] },
  { id: 'mid', kind: 'jump', level: 'mid', name: '中階跳臺', ring: 0.7, outline: [[893, 345], [1000, 228], [1185, 247], [1222, 330], [1145, 465], [970, 470]] },
  { id: 'low', kind: 'jump', level: 'low', name: '低階跳臺', ring: 0.74, outline: [[980, 528], [1195, 512], [1240, 642], [1000, 655]] },
  { id: 'park1', kind: 'park', name: '紙箱公園', ring: 0.6, outline: [[668, 838], [838, 830], [840, 935], [650, 935]] },
  { id: 'park2', kind: 'park', name: '魚池公園', ring: 0.7, outline: [[895, 875], [1000, 745], [1138, 790], [1140, 935], [948, 955]] },
  { id: 'rank', kind: 'rank', name: '排行榜', ring: 0.7, outline: [[192, 642], [468, 588], [503, 795], [208, 840]] },
  { id: 'stage', kind: 'stage', name: '表演區', ring: 0.82, outline: [[753, 71], [1028, 93], [993, 189], [752, 226]] },
  { id: 'boxes', kind: 'boxes', name: '多多紙箱區', ring: 0.84, outline: [[1200, 201], [1385, 139], [1423, 329], [1323, 357]] },
  { id: 'diary', kind: 'diary', name: '日記區', ring: 0.8, outline: [[1231, 447], [1397, 408], [1387, 580], [1320, 596], [1232, 501]] },
  { id: 'combo', kind: 'combo', name: '合體公園', ring: 0.68, outline: [[1181, 707], [1307, 653], [1366, 760], [1241, 884], [1177, 782]] },
  { id: 'learn', kind: 'learn', name: '學習島', ring: 0.8, outline: [[262, 120], [330, 40], [590, 28], [648, 110], [600, 182], [300, 190]] },
];

// 二十二座木板橋：points 是草稿上的橋頭、轉折與橋尾（第一點靠 a 島、最後一點靠 b 島）。
// 表演區往下那座橋接在高階到中階的長橋上：join 是 [接到第幾座橋, 那座橋的第幾個點]
export const BRIDGES = [
  { a: 'high', b: 'mid', points: [[585, 285], [680, 266], [780, 256], [812, 257], [880, 258], [962, 268]] },
  { a: 'high', b: 'rank', points: [[325, 535], [318, 612]] },
  { a: 'high', b: 'home', points: [[548, 487], [604, 585]] },
  { a: 'mid', b: 'home', points: [[930, 380], [795, 520]] },
  { a: 'mid', b: 'low', points: [[1045, 465], [1040, 522]] },
  { a: 'home', b: 'low', points: [[935, 585], [988, 575]] },
  { a: 'low', b: 'park2', points: [[1065, 650], [1035, 752]] },
  { a: 'home', b: 'park1', points: [[760, 800], [760, 835]] },
  { a: 'home', b: 'rank', points: [[575, 750], [495, 738]] },
  { a: 'home', b: 'park2', points: [[895, 765], [952, 815]] },
  { a: 'park1', b: 'park2', points: [[838, 880], [905, 873]] },
  { a: 'rank', b: 'park1', points: [[325, 835], [330, 925], [652, 915]] },
  { a: 'stage', join: [0, 3], points: [[805, 228], [812, 257]] },
  { a: 'stage', b: 'mid', points: [[984, 201], [1010, 236]] },
  { a: 'mid', b: 'boxes', points: [[1181, 289], [1249, 242]] },
  { a: 'boxes', b: 'diary', points: [[1335, 360], [1323, 410]] },
  { a: 'mid', b: 'diary', points: [[1175, 456], [1231, 462]] },
  { a: 'low', b: 'diary', points: [[1204, 552], [1254, 531]] },
  { a: 'low', b: 'combo', points: [[1184, 673], [1229, 690]] },
  { a: 'park2', b: 'combo', points: [[1144, 836], [1203, 817]] },
  { a: 'learn', b: 'high', points: [[420, 186], [425, 236]] },
  { a: 'learn', b: 'stage', points: [[646, 112], [754, 128]] },
];

// 三座跳臺：tower 是跳板離島面的高度、extra 是蓄滿力最多再往上跳幾公尺（公尺）。
// 能量條：低階一直按住就會滿；中階、高階滿了會往下掉再上來，要抓最滿的時候放開
export const LEVELS = {
  low: { key: 'low', name: '低階跳臺', short: '低階', stars: 1, color: '#3FA45B', tower: 0.4, extra: 1.1, fill: 1.3, bounce: false },
  mid: { key: 'mid', name: '中階跳臺', short: '中階', stars: 2, color: '#E8922A', tower: 1.0, extra: 2.0, fill: 1.0, bounce: true },
  high: { key: 'high', name: '高階跳臺', short: '高階', stars: 3, color: '#E85D5D', tower: 1.8, extra: 3.2, fill: 0.7, bounce: true },
};
export const LEVEL_KEYS = ['low', 'mid', 'high'];

// 能量條超過這個值放開，就是翻跟斗的完美跳
export const PERFECT = 0.93;

// 按住幾秒時能量條在哪裡（0～1）
export function meterAt(levelKey, seconds) {
  const level = LEVELS[levelKey];
  if (!level || !(seconds > 0)) return 0;
  const x = seconds / level.fill;
  if (!level.bounce) return Math.min(1, x);
  const k = x % 2;
  return k <= 1 ? k : 2 - k;
}

// 跳到的最高點（公尺，從島面量）：跳臺高度＋蓄力換來的高度×這隻貓的彈力×一點點運氣（luck 是 0～1 的亂數）
export function peakHeight(levelKey, power, spring = 1, luck = 0.5) {
  const level = LEVELS[levelKey];
  if (!level) return 0;
  const p = Math.min(1, Math.max(0, Number.isFinite(power) ? power : 0));
  const boost = 0.12 + 0.88 * Math.pow(p, 1.15);
  return level.tower + level.extra * boost * spring * (0.97 + 0.06 * luck);
}

// 每座跳臺理論上最高能跳幾公分（身高尺要畫到哪裡）
export function maxCm(levelKey) {
  return toCm(peakHeight(levelKey, 1, 1, 1));
}

export function toCm(meters) {
  return Math.round(meters * 100);
}

// 自己跳的貓：兩個亂數平均，偏向這隻貓的實力
export function autoPower(skill, r1, r2) {
  const noise = (r1 + r2 - 1) * 0.35;
  return Math.min(1, Math.max(0.15, skill + noise));
}

// 花色：每個部位的顏色；patches 是背上的色塊，headPatch 是頭頂色塊，mask 是暹羅臉
const PINK = '#F4A7B4';
export const COATS = {
  orange: { label: '橘貓', body: '#F2A35A', stripe: '#DD7F33', muzzle: '#FFE6C9' },
  orangeWhite: { label: '橘白貓', body: '#F2A35A', stripe: '#DD7F33', muzzle: '#FFFFFF', chest: '#FFFFFF', paws: '#FFFFFF' },
  golden: { label: '金黃貓', body: '#EBBE63', stripe: '#D49F3E', muzzle: '#FFF1D2' },
  black: { label: '黑貓', body: '#2F2C33', eye: '#D8E05A' },
  blackSocks: { label: '黑貓（白襪子）', body: '#2F2C33', paws: '#FFFFFF', eye: '#D8E05A' },
  white: { label: '白貓', body: '#FAF8F3' },
  oddEyes: { label: '白貓（兩眼不同色）', body: '#FAF8F3', eye: '#7CB8F0', eyeRight: '#F2C14E' },
  cream: { label: '奶油貓', body: '#F5DEB8', muzzle: '#FFF6E6' },
  gray: { label: '灰虎斑', body: '#A4A9B1', stripe: '#7F858E', muzzle: '#E6E8EC' },
  blue: { label: '藍灰貓', body: '#7F8B9C', eye: '#A8D45A' },
  lavender: { label: '芋頭色貓', body: '#B4ACC6', muzzle: '#E9E5F0' },
  calico: { label: '三花貓', body: '#FBF8F3', patches: ['#EF9C48', '#3B3335', '#EF9C48'], headPatch: '#EF9C48' },
  tuxedo: { label: '賓士貓', body: '#2E2B30', chest: '#FFFFFF', muzzle: '#FFFFFF', paws: '#FFFFFF', eye: '#D8E05A' },
  pudding: { label: '布丁貓', body: '#F6E3A6', headPatch: '#B8742E', tail: '#B8742E' },
  tan: { label: '奶茶色貓', body: '#D9B58B', muzzle: '#F6E9D8' },
  latte: { label: '拿鐵色貓', body: '#C8A17A', stripe: '#A9805A', muzzle: '#F3E6D4' },
  brownTabby: { label: '棕虎斑', body: '#9B7453', stripe: '#6C4C33', muzzle: '#E9D8C3' },
  darkBrown: { label: '黑糖色貓', body: '#5F4536', eye: '#E2C25A' },
  chestnut: { label: '栗子色貓', body: '#A2613F', stripe: '#83472B' },
  cinnamon: { label: '肉桂虎斑', body: '#C67B4B', stripe: '#A65E31', muzzle: '#F5DDC8' },
  siamese: { label: '暹羅貓', body: '#F2E7D4', mask: '#5B4435', ear: '#4E3A2E', legs: '#5B4435', tail: '#4E3A2E', eye: '#5DA9E9' },
  tortie: { label: '玳瑁貓', body: '#3B3133', patches: ['#E08A3C', '#C46A2A', '#E08A3C'], headPatch: '#E08A3C', eye: '#E2C25A' },
};

// 50 隻貓的名字與花色（台灣小吃與甜點名，配花色取）。新來的貓只能接在最後面，
// 排行榜存的是編號，前面的貓換位置舊成績就會對錯貓
export const CAT_LIST = [
  ['小橘', 'orange'], ['地瓜', 'orangeWhite'], ['南瓜', 'orange'], ['蜜柑', 'orangeWhite'],
  ['鳳梨酥', 'golden'], ['雞蛋糕', 'golden'], ['鬆餅', 'golden'],
  ['芝麻', 'black'], ['仙草', 'black'], ['波霸', 'black'], ['皮蛋', 'blackSocks'],
  ['麻糬', 'white'], ['湯圓', 'white'], ['雪球', 'oddEyes'], ['棉花糖', 'white'],
  ['饅頭', 'cream'], ['奶油', 'cream'], ['豆花', 'cream'],
  ['芋圓', 'lavender'], ['芋頭', 'lavender'], ['藍莓', 'blue'], ['鐵蛋', 'gray'], ['灰灰', 'gray'],
  ['花花', 'calico'], ['三色豆', 'calico'], ['彩虹', 'calico'],
  ['乳牛', 'tuxedo'], ['鋼琴', 'tuxedo'], ['黑輪', 'tuxedo'],
  ['布丁', 'pudding'], ['奶茶', 'tan'], ['花生', 'tan'], ['拿鐵', 'latte'],
  ['可可', 'brownTabby'], ['黑糖', 'darkBrown'], ['栗子', 'chestnut'], ['肉桂', 'cinnamon'],
  ['焦糖', 'siamese'], ['摩卡', 'siamese'], ['咖哩', 'tortie'],
  ['肉圓', 'cream'], ['車輪餅', 'cinnamon'], ['紅豆', 'chestnut'], ['珍珠', 'blackSocks'], ['米漿', 'latte'],
  ['豆漿', 'white'], ['芒果', 'orangeWhite'], ['烏龍', 'tortie'], ['芋泥', 'lavender'], ['雪花冰', 'oddEyes'],
];

// 圓滾滾的名字就做胖一點
const CHUBBY = new Set(['波霸', '湯圓', '饅頭', '麻糬', '肉圓', '布丁']);

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 每隻貓的個性與能力：spring 彈力、skill 自己跳時的蓄力準度、sporty 愛跳高、sleepy 愛睡覺
export function makeCats(seed = 913) {
  const random = mulberry32(seed);
  return CAT_LIST.map(([name, coatKey], index) => {
    const coat = COATS[coatKey];
    const sporty = random();
    const sleepy = random();
    return {
      index,
      name,
      coatKey,
      coat,
      spring: 0.86 + random() * 0.14,
      skill: 0.45 + random() * 0.4,
      sporty,
      sleepy,
      size: 0.92 + random() * 0.16,
      chubby: CHUBBY.has(name) ? 1.28 : 1 + random() * 0.12,
      speed: 0.7 + random() * 0.22,
      sitter: random() < 0.5,
    };
  });
}

export function personality(cat) {
  if (cat.sporty > 0.7) return '最愛跳高';
  if (cat.sleepy > 0.7) return '很愛睡覺';
  if (cat.sporty < 0.25) return '喜歡看別人跳';
  return '喜歡到處逛';
}

// 一筆成績：{ cat: 貓的編號, level: 'low'|'mid'|'high', cm: 公分, tong: 是不是桐桐按的, at: 第幾跳 }
export function isRecord(value, catCount = CAT_LIST.length) {
  return !!value
    && Number.isInteger(value.cat) && value.cat >= 0 && value.cat < catCount
    && LEVEL_KEYS.includes(value.level)
    && Number.isInteger(value.cm) && value.cm > 0 && value.cm < 1000
    && Number.isFinite(value.at);
}

export function sanitizeRecords(value, catCount = CAT_LIST.length) {
  if (!Array.isArray(value)) return [];
  return value.filter((r) => isRecord(r, catCount)).map((r) => ({ cat: r.cat, level: r.level, cm: r.cm, tong: !!r.tong, at: r.at }));
}

// 每隻貓只留牠跳最高的那一次；同樣高度算先跳到的
export function bestPerCat(records, level = 'all') {
  const best = new Map();
  for (const r of records) {
    if (level !== 'all' && r.level !== level) continue;
    const current = best.get(r.cat);
    if (!current || r.cm > current.cm || (r.cm === current.cm && r.at < current.at)) best.set(r.cat, r);
  }
  return best;
}

export function leaderboard(records, level = 'all', limit = 10) {
  return [...bestPerCat(records, level).values()]
    .sort((a, b) => b.cm - a.cm || a.at - b.at)
    .slice(0, limit)
    .map((r, i) => ({ rank: i + 1, ...r }));
}

export function topRecord(records, level = 'all') {
  return leaderboard(records, level, 1)[0] || null;
}

// 這一跳破了哪些紀錄（跟這一跳之前的成績比）
export function judgeJump(records, jump) {
  const island = topRecord(records);
  const platform = topRecord(records, jump.level);
  const own = bestPerCat(records).get(jump.cat);
  return {
    island: !island || jump.cm > island.cm,
    platform: !platform || jump.cm > platform.cm,
    personal: !own || jump.cm > own.cm,
    first: !island,
  };
}

export function cmText(cm) {
  return `${cm} 公分`;
}

export function starsText(levelKey) {
  const level = LEVELS[levelKey];
  return level ? '★'.repeat(level.stars) : '';
}

// 表演區的四個動作：dur 是做一次要幾秒
export const TRICKS = {
  spin: { label: '轉圈圈', dur: 1.5 },
  wave: { label: '站起來揮手', dur: 2.2 },
  flip: { label: '翻跟斗', dur: 1.1 },
  sing: { label: '唱歌', dur: 2.6 },
};
export const TRICK_KEYS = ['spin', 'wave', 'flip', 'sing'];

// ---------- 貓的日記 ----------
// 場景把貓今天做過的事記成 event：{ type, ... }，貓坐到日記區的書桌前，就把最近幾件寫成一篇。
// 一篇日記：{ id, cat, date: '10 月 26 日', lines: [...], paws: 被蓋了幾個貓掌印 }
export const DIARY_MAX = 60;

export function dateText(time) {
  const d = new Date(time);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

function levelName(key) {
  return LEVELS[key] ? LEVELS[key].name : '跳臺';
}

const ENDINGS = {
  sporty: ['明天要跳更高！', '我要繼續練習。'],
  sleepy: ['好睏喔，晚安。', '寫完就要去睡覺了。'],
  other: ['今天好好玩。', '明天見！', '喵～'],
};

// pick 是 0～1 的亂數（測試時可以固定），用來選結尾那一句
export function composeDiary(cat, events, pick = 0.5) {
  const lines = [];
  const seen = new Set();
  const jumps = events.filter((e) => e.type === 'jump');
  if (jumps.length) {
    const best = jumps.reduce((a, b) => (b.cm > a.cm ? b : a));
    lines.push(`今天我在${levelName(best.level)}跳了 ${best.cm} 公分${best.perfect ? '，還在空中翻了一個跟斗' : ''}！`);
    if (best.record) lines.push('是新紀錄喔！');
    if (jumps.some((j) => j.tong)) lines.push('有一次是桐桐幫我按的，好開心。');
    else if (jumps.length >= 3) lines.push(`我一共跳了 ${jumps.length} 次。`);
    seen.add('jump');
  }
  for (const e of events) {
    if (lines.length >= 4) break;
    if (seen.has(e.type)) continue;
    let line = '';
    if (e.type === 'coach') line = `貓貓教練叫我去${levelName(e.level)}跳，我就跑過去了。`;
    else if (e.type === 'perform') line = `我在表演區表演${(e.tricks || []).slice(0, 3).join('、') || '轉圈圈'}${e.claps ? '，大家都幫我拍手' : ''}。`;
    else if (e.type === 'watch') line = e.performer ? `我在表演區看${e.performer}表演，好好看。` : '我在表演區等別的貓上臺表演。';
    else if (e.type === 'box') line = e.slept ? `我躲進${e.place}的紙箱，還在裡面睡著了。` : `我躲進${e.place}的紙箱裡，誰都找不到我。`;
    else if (e.type === 'fish') line = `我在${e.place}看魚，魚游來游去。`;
    else if (e.type === 'eat') line = '我吃了好多飼料，肚子圓滾滾。';
    else if (e.type === 'drink') line = '我喝了好多水，不渴了。';
    else if (e.type === 'sleep') line = `我在${e.place}睡了一個好覺。`;
    else if (e.type === 'podium') line = `我站上頒獎臺，是第 ${e.rank} 名${e.rank === 1 ? '，還戴了皇冠' : ''}！`;
    else if (e.type === 'watchJump') line = `我在${levelName(e.level)}看大家跳高。`;
    else if (e.type === 'study') line = '我在學習島寫數學作業。';
    else if (e.type === 'homework') line = e.right ? '桐桐老師改了我的數學作業，我寫對了！' : '我的數學作業寫錯了，下次要更仔細。';
    if (!line) continue;
    seen.add(e.type);
    lines.push(line);
  }
  if (!lines.length) lines.push('今天我在島上散步。', '風吹在身上涼涼的。');
  const ending = cat.sporty > 0.7 ? ENDINGS.sporty : cat.sleepy > 0.7 ? ENDINGS.sleepy : ENDINGS.other;
  lines.push(ending[Math.min(ending.length - 1, Math.floor(pick * ending.length))]);
  return lines;
}

export function isDiary(value, catCount = CAT_LIST.length) {
  return !!value
    && Number.isInteger(value.id) && value.id > 0
    && Number.isInteger(value.cat) && value.cat >= 0 && value.cat < catCount
    && typeof value.date === 'string' && value.date.length <= 20
    && Array.isArray(value.lines) && value.lines.length > 0 && value.lines.length <= 8
    && value.lines.every((line) => typeof line === 'string' && line.length <= 80)
    && Number.isInteger(value.paws) && value.paws >= 0;
}

export function sanitizeDiaries(value, catCount = CAT_LIST.length) {
  if (!Array.isArray(value)) return [];
  return value.filter((d) => isDiary(d, catCount)).slice(-DIARY_MAX)
    .map((d) => ({ id: d.id, cat: d.cat, date: d.date, lines: d.lines.slice(), paws: Math.min(d.paws, 9999) }));
}

// 第一次打開新版的島時，日記本裡先放三篇，介紹桐桐新加的島
export const DIARY_SEED = [
  { cat: 0, lines: ['今天島上多了四座新的島！', '有表演區、多多紙箱區、日記區，還有合體公園。', '多多紙箱區有好多紙箱，每個都想鑽進去。'] },
  { cat: 7, lines: ['我遇到貓貓教練了！', '教練用兩隻腳走路，頭上綁著頭帶。', '教練說我很會跳，叫我去高階跳臺。'] },
  { cat: 11, lines: ['今天我第一次寫日記。', '日記區的書桌好大，可以坐好多貓。', '寫完要去合體公園看魚。'] },
];
