// 貓貓領養島的規則（照桐桐寫的規則稿）。瀏覽器和 Node 共用的純邏輯，不碰畫面。
// - 一開始島上一隻貓都沒有。假扮成貓的人隨機給 3 隻，每隻有一顆骰子，可以重骰一次換一隻，按確定之後就住上島。
// - 之後每天有 3 隻貓可以領養，一次只能選 1 隻，要 50 個小魚金幣。假扮成貓的人要花 24 小時才會把貓帶回來，
//   帶回來之前不能再領養。
// - 島上最多 100 隻。領養的貓不能換、也不會離開，要照顧牠一輩子。

export const STARTER_COUNT = 3;
export const OFFER_COUNT = 3;
export const ADOPT_PRICE = 50;
export const ADOPT_MS = 24 * 60 * 60 * 1000;
export const ISLAND_MAX = 100;

// 同一個字串算出來的亂數都一樣（同一天的候選貓，重新整理也不會變）
export function seededRandom(key, salt = 0) {
  let h = 2166136261 ^ salt;
  for (const c of String(key)) h = Math.imul(h ^ c.codePointAt(0), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 從還沒領養的貓裡隨機挑 count 隻（不重複）
export function pickCats(catCount, taken, count, random = Math.random) {
  const pool = [];
  for (let i = 0; i < catCount; i++) if (!taken.includes(i)) pool.push(i);
  const out = [];
  while (out.length < count && pool.length) out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return out;
}

// 第一批的 3 隻：cats 是現在的三隻、rolled 是哪幾隻已經骰過了
export function newStarter(catCount, random = Math.random) {
  return { cats: pickCats(catCount, [], STARTER_COUNT, random), rolled: [false, false, false] };
}

// 骰子：第 slot 隻換成別隻（不會換到另外兩隻），每隻只能骰一次。回傳新的狀態，骰過了就原樣回傳
export function rerollStarter(starter, slot, catCount, random = Math.random) {
  if (!starter || starter.rolled[slot] || slot < 0 || slot >= starter.cats.length) return starter;
  const [next] = pickCats(catCount, starter.cats, 1, random);
  if (next === undefined) return starter;
  const cats = starter.cats.slice();
  cats[slot] = next;
  const rolled = starter.rolled.slice();
  rolled[slot] = true;
  return { cats, rolled };
}

export function sanitizeStarter(value, catCount) {
  if (!value || !Array.isArray(value.cats) || value.cats.length !== STARTER_COUNT) return null;
  const cats = value.cats.filter((n) => Number.isInteger(n) && n >= 0 && n < catCount);
  if (new Set(cats).size !== STARTER_COUNT) return null;
  const rolled = Array.isArray(value.rolled) ? cats.map((_, i) => value.rolled[i] === true) : [false, false, false];
  return { cats, rolled };
}

// 今天可以領養的 3 隻：用日期當亂數種子，同一天重新整理還是同樣三隻。
// owned 是已經在島上的貓（這三隻一定不會出現），salt 讓不同島主看到的不一樣
export function dailyOffer(day, catCount, owned, salt = '') {
  return pickCats(catCount, owned, OFFER_COUNT, seededRandom(`${day}|${salt}`, 7));
}

// 正在帶回來的貓：{ cat, at }，at 是付錢的時間
export function sanitizePending(value, catCount) {
  if (!value || !Number.isInteger(value.cat) || value.cat < 0 || value.cat >= catCount) return null;
  if (!Number.isFinite(value.at) || value.at <= 0) return null;
  return { cat: value.cat, at: value.at };
}

export function arriveAt(pending) {
  return pending.at + ADOPT_MS;
}

export function arrived(pending, now) {
  return !!pending && now >= arriveAt(pending);
}

// 還要多久：「23 小時 5 分」「12 分」「1 分」
export function waitText(pending, now) {
  const left = Math.max(0, arriveAt(pending) - now);
  const minutes = Math.max(1, Math.ceil(left / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} 分`;
  return m ? `${h} 小時 ${m} 分` : `${h} 小時`;
}

// 現在能不能領養：reason 是 'pending'（還在帶貓）、'full'（滿 100 隻了）、'coins'（金幣不夠）
export function canAdopt({ owned, pending, coins }) {
  if (pending) return { ok: false, reason: 'pending' };
  if (owned.length >= ISLAND_MAX) return { ok: false, reason: 'full' };
  if (coins < ADOPT_PRICE) return { ok: false, reason: 'coins' };
  return { ok: true };
}
