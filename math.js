// 學習島的數學作業：照南一版一年級上學期的 9 個單元自己出題（不是抄課本），貓寫的答案有對有錯，
// 錯的都是一年級小朋友常犯的錯（少數一個、加減弄反、從右邊數、時針分針看反）。
// 瀏覽器與 Node 共用，不 import 任何東西。

export const MATH_UNITS = [
  { n: 1, name: '數到10' },
  { n: 2, name: '比長短' },
  { n: 3, name: '分與合' },
  { n: 4, name: '順序和多少' },
  { n: 5, name: '數到30' },
  { n: 6, name: '加一加' },
  { n: 7, name: '認識形狀' },
  { n: 8, name: '減一減與加減應用' },
  { n: 9, name: '讀鐘錶' },
];
// 115 學年度南一版的進度，十月底大約上到第 5 單元
export const DEFAULT_UNITS = [1, 2, 3, 4, 5];
// 貓寫錯的機率
export const WRONG_RATE = 0.45;

const THINGS = {
  fish: { name: '魚', unit: '條' },
  yarn: { name: '毛線球', unit: '個' },
  star: { name: '星星', unit: '顆' },
  apple: { name: '蘋果', unit: '顆' },
};
const SHAPES = {
  triangle: { name: '三角形', hint: '數一數有幾條邊、幾個角。', why: '有 3 條邊、3 個角，是三角形。', confuse: ['正方形'] },
  circle: { name: '圓形', hint: '這是畫在紙上、平平的形狀喔。', why: '圓圓的、沒有角，又是平平的，是圓形。', confuse: ['球'] },
  square: { name: '正方形', hint: '看看 4 條邊是不是一樣長。', why: '4 條邊一樣長，是正方形。', confuse: ['長方形'] },
  rect: { name: '長方形', hint: '看看 4 條邊是不是一樣長。', why: '有 2 條長長的邊、2 條短短的邊，是長方形。', confuse: ['正方形'] },
};
const SOLIDS = {
  ball: { name: '球', hint: '它是平平的，還是圓滾滾、拿得起來的東西？', why: '圓滾滾的，往哪裡都可以滾，是球。', confuse: ['圓形'] },
  cylinder: { name: '圓柱', hint: '看看上面和下面是什麼形狀。', why: '上面和下面都是圓形，可以站著也可以躺著滾，是圓柱。', confuse: ['球'] },
  cube: { name: '正方體', hint: '看看每一面是不是一樣大的正方形。', why: '每一面都是一樣大的正方形，是正方體。', confuse: ['長方體'] },
  box: { name: '長方體', hint: '看看每一面是不是一樣大。', why: '有長長的面，不是每一面都一樣大，是長方體。', confuse: ['正方體'] },
};
const NAMES = [['小橘', '麻糬'], ['芝麻', '湯圓'], ['布丁', '奶茶'], ['可可', '花花']];

const int = (rand, a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (rand, list) => list[Math.floor(rand() * list.length)];

// 決定貓寫對還是寫錯：wrongs 是常見的錯誤答案，挑一個跟正確答案不一樣的
function finish(rand, p) {
  const answer = String(p.answer);
  const wrongs = [...new Set((p.wrongs || []).map(String))].filter((w) => w !== answer && w !== 'NaN' && !w.startsWith('-'));
  const wrong = wrongs.length > 0 && rand() < WRONG_RATE;
  const catAnswer = wrong ? pick(rand, wrongs) : answer;
  const speak = (p.speak || p.text).replace(/＋|\+/g, '加').replace(/−|-/g, '減').replace(/＝|=/g, '等於').replace(/□/g, '框框');
  return { unit: p.unit, text: p.text, speak, fig: p.fig || null, answer, catAnswer, right: catAnswer === answer, hint: p.hint, why: p.why };
}

function unit1(rand) {
  const kind = pick(rand, Object.keys(THINGS));
  const t = THINGS[kind];
  const n = rand() < 0.1 ? 0 : int(rand, 1, 10);
  if (n === 0) {
    return finish(rand, {
      unit: 1, text: `盤子裡有幾${t.unit}${t.name}？`, fig: { type: 'objects', kind, count: 0, plate: true },
      answer: 0, wrongs: [1, 10], hint: '盤子裡面還有沒有東西？', why: '盤子裡什麼都沒有，就是 0。',
    });
  }
  return finish(rand, {
    unit: 1, text: `數一數，有幾${t.unit}${t.name}？`, fig: { type: 'objects', kind, count: n },
    answer: n, wrongs: [n - 1, n + 1].filter((v) => v >= 1),
    hint: '用手指一個一個點著數，數過的不要再數。', why: `一個一個數，一共有 ${n} ${t.unit}，答案是 ${n}。`,
  });
}

function unit2(rand) {
  const type = int(rand, 0, 2);
  if (type === 0) {
    const a = int(rand, 3, 9);
    let b = int(rand, 3, 9);
    while (b === a) b = int(rand, 3, 9);
    const ask = rand() < 0.6 ? '長' : '短';
    const bars = [{ len: a, offset: 0, color: 'red', name: '紅色' }, { len: b, offset: 0, color: 'blue', name: '藍色' }];
    const win = (ask === '長') === (a > b) ? bars[0] : bars[1];
    const lose = win === bars[0] ? bars[1] : bars[0];
    return finish(rand, {
      unit: 2, text: `哪一條緞帶比較${ask}？`, fig: { type: 'bars', bars, grid: false },
      answer: win.name, wrongs: [lose.name],
      hint: `兩條緞帶的頭對齊了，看哪一條的尾巴${ask === '長' ? '比較遠' : '比較近'}。`, why: `${win.name}緞帶比較${ask}，答案是${win.name}。`,
    });
  }
  if (type === 1) {
    // 頭沒對齊：短的那條往右放，尾巴反而比較遠，最容易看錯
    const long = int(rand, 4, 7);
    const short = long - int(rand, 1, 2);
    const shift = long - short + int(rand, 1, 2);
    const longFirst = rand() < 0.5;
    const L = { len: long, offset: 0, color: longFirst ? 'red' : 'blue', name: longFirst ? '紅色' : '藍色' };
    const S = { len: short, offset: shift, color: longFirst ? 'blue' : 'red', name: longFirst ? '藍色' : '紅色' };
    return finish(rand, {
      unit: 2, text: '頭沒有對齊，哪一條緞帶比較長？', fig: { type: 'bars', bars: longFirst ? [L, S] : [S, L], grid: true },
      answer: L.name, wrongs: [S.name],
      hint: '頭沒有對齊，不能只看尾巴！數一數每一條有幾格。', why: `${L.name}有 ${long} 格，${S.name}只有 ${short} 格，${L.name}比較長。`,
    });
  }
  const n = int(rand, 3, 8);
  return finish(rand, {
    unit: 2, text: '鉛筆有幾個橡皮擦那麼長？', fig: { type: 'measure', units: n },
    answer: n, wrongs: [n - 1, n + 1],
    hint: '橡皮擦一個接一個排好，數數看排了幾個。', why: `排了 ${n} 個橡皮擦，鉛筆有 ${n} 個橡皮擦那麼長。`,
  });
}

function unit3(rand) {
  const total = int(rand, 3, 10);
  const a = int(rand, 1, total - 1);
  const b = total - a;
  if (rand() < 0.5) {
    return finish(rand, {
      unit: 3, text: `${total} 可以分成 ${a} 和幾？`, fig: { type: 'bond', top: total, left: a, right: null },
      answer: b, wrongs: [b - 1, b + 1].filter((v) => v >= 1 && v < total),
      hint: `把 ${total} 個分成兩堆，一堆有 ${a} 個，另一堆有幾個？`, why: `${a} 和 ${b} 合起來是 ${total}，所以 ${total} 可以分成 ${a} 和 ${b}。`,
    });
  }
  return finish(rand, {
    unit: 3, text: `${a} 和 ${b} 合起來是幾？`, fig: { type: 'bond', top: null, left: a, right: b },
    answer: total, wrongs: [total - 1, total + 1, a !== b ? Math.abs(a - b) : total + 2],
    hint: '兩堆放在一起，一共有幾個？', why: `${a} 和 ${b} 合起來是 ${total}。`,
  });
}

function unit4(rand) {
  const type = int(rand, 0, 2);
  if (type === 0) {
    const count = int(rand, 5, 9);
    let k = int(rand, 2, count - 1);
    if (count - k + 1 === k) k = Math.max(2, k - 1);
    return finish(rand, {
      unit: 4, text: '從左邊數過來，戴帽子的貓排第幾個？', fig: { type: 'row', count, mark: k },
      answer: `第 ${k} 個`, wrongs: [`第 ${count - k + 1} 個`, `第 ${k + 1} 個`],
      hint: '要從左邊開始數喔，第 1 個是最左邊那隻。', why: `從左邊數 1、2、3…，戴帽子的貓排第 ${k} 個。`,
    });
  }
  if (type === 1) {
    const kind = pick(rand, Object.keys(THINGS));
    const t = THINGS[kind];
    const a = int(rand, 2, 9);
    let b = int(rand, 2, 9);
    while (b === a) b = int(rand, 2, 9);
    const more = a > b ? '左邊' : '右邊';
    return finish(rand, {
      unit: 4, text: `哪一盤的${t.name}比較多？`, fig: { type: 'plates', kind, a, b },
      answer: more, wrongs: [a > b ? '右邊' : '左邊'],
      hint: '兩盤都數一數，再比哪一個數字比較大。', why: `左邊有 ${a} ${t.unit}，右邊有 ${b} ${t.unit}，${more}比較多。`,
    });
  }
  const start = int(rand, 1, 6);
  const hole = int(rand, 1, 3);
  const items = [0, 1, 2, 3, 4].map((i) => (i === hole ? null : start + i));
  const ans = start + hole;
  return finish(rand, {
    unit: 4, text: '照順序排，□ 裡面是多少？', speak: '照順序排，框框裡面是多少？', fig: { type: 'sequence', items },
    answer: ans, wrongs: [ans - 1, ans + 1],
    hint: '1、2、3…往後數，每次多 1。', why: `${ans - 1} 的後面是 ${ans}，答案是 ${ans}。`,
  });
}

function unit5(rand) {
  const type = int(rand, 0, 3);
  if (type === 0 || type === 1) {
    const tens = int(rand, 1, 2);
    const ones = type === 0 ? int(rand, 0, 9) : int(rand, 1, 9);
    const n = tens * 10 + ones;
    const swap = ones * 10 + tens;
    const wrongs = [tens + ones, n + 1, n - 1];
    if (ones > 0 && ones !== tens) wrongs.unshift(swap);
    if (type === 0) {
      return finish(rand, {
        unit: 5, text: '一捆是 10 根，一共有幾根？', fig: { type: 'bundles', tens, ones },
        answer: n, wrongs: wrongs.slice(0, 3),
        hint: '一捆是 10 根。先數捆的：10、20，再一根一根往後數。', why: `${tens} 捆是 ${tens * 10} 根，再加 ${ones} 根，一共 ${n} 根。`,
      });
    }
    return finish(rand, {
      unit: 5, text: `${tens} 個十和 ${ones} 個一合起來是多少？`, fig: { type: 'bundles', tens, ones },
      answer: n, wrongs: wrongs.slice(0, 2),
      hint: '1 個十就是 10，2 個十就是 20。', why: `${tens} 個十是 ${tens * 10}，再和 ${ones} 個一合起來是 ${n}。`,
    });
  }
  if (type === 2) {
    const n = int(rand, 9, 29);
    const wrongs = [n - 1, n + 2];
    // 19 後面寫成 110、29 後面寫成 210，是剛學到 20、30 時很常見的錯
    if (n >= 19 && n % 10 === 9) wrongs.unshift(`${Math.floor(n / 10)}10`);
    return finish(rand, {
      unit: 5, text: `${n} 的後面是多少？`, fig: { type: 'sequence', items: [n - 1, n, null] },
      answer: n + 1, wrongs: wrongs.slice(0, 2),
      hint: '往後數 1 個，就是多 1。', why: `${n} 的後面是 ${n + 1}。`,
    });
  }
  // 比大小：30 以內十位、個位對調的只有 12 和 21，常出這一對，其他隨機
  let a;
  let b;
  if (rand() < 0.3) {
    [a, b] = [12, 21];
  } else {
    a = int(rand, 10, 30);
    b = int(rand, 10, 30);
    while (b === a) b = int(rand, 10, 30);
  }
  if (rand() < 0.5) [a, b] = [b, a];
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  const sameTens = Math.floor(big / 10) === Math.floor(small / 10);
  return finish(rand, {
    unit: 5, text: `${a} 和 ${b}，哪一個比較大？`,
    answer: big, wrongs: [small],
    hint: '先比十位：幾個十比較多，就比較大。十位一樣，再比個位。',
    why: sameTens
      ? `兩個都是 ${Math.floor(big / 10)} 個十，${big} 的個位是 ${big % 10}，比 ${small % 10} 大，所以 ${big} 比較大。`
      : `${big} 有 ${Math.floor(big / 10)} 個十，${small} 只有 ${Math.floor(small / 10)} 個十，所以 ${big} 比較大。`,
  });
}

function unit6(rand) {
  const a = int(rand, 1, 8);
  const b = int(rand, 1, 10 - a);
  const s = a + b;
  const kind = pick(rand, Object.keys(THINGS));
  const t = THINGS[kind];
  const wrongs = [s - 1, s + 1];
  if (a !== b) wrongs.push(Math.abs(a - b));
  if (rand() < 0.5) {
    return finish(rand, {
      unit: 6, text: `${a} ＋ ${b} ＝ □`, speak: `${a} 加 ${b} 等於多少？`, fig: { type: 'groups', kind, a, b },
      answer: s, wrongs, hint: `從 ${Math.max(a, b)} 開始，再往後數 ${Math.min(a, b)} 個。`, why: `${a} 加 ${b} 等於 ${s}。`,
    });
  }
  const [c1, c2] = pick(rand, NAMES);
  const story = pick(rand, [
    { text: `盤子裡有 ${a} 條魚，又放進 ${b} 條，一共有幾條？`, unit: '條', kind: 'fish' },
    { text: `${c1}有 ${a} 個毛線球，${c2}有 ${b} 個，兩隻貓一共有幾個？`, unit: '個', kind: 'yarn' },
    { text: `樹上有 ${a} 顆蘋果，又長出 ${b} 顆，現在有幾顆？`, unit: '顆', kind: 'apple' },
  ]);
  return finish(rand, {
    unit: 6, text: story.text, fig: { type: 'groups', kind: story.kind, a, b },
    answer: s, wrongs, hint: '「又放進」「一共」是要合起來，用加法。', why: `${a} ＋ ${b} ＝ ${s}，一共有 ${s} ${story.unit}。`,
  });
}

function unit7(rand) {
  const type = int(rand, 0, 2);
  if (type === 0) {
    const key = pick(rand, Object.keys(SHAPES));
    const s = SHAPES[key];
    return finish(rand, {
      unit: 7, text: '這是什麼形狀？', fig: { type: 'shape', shape: key, color: pick(rand, ['#FF8FAB', '#8D9CF0', '#7CC46C', '#FFC93C']) },
      answer: s.name, wrongs: s.confuse, hint: s.hint, why: s.why,
    });
  }
  if (type === 1) {
    const key = pick(rand, Object.keys(SOLIDS));
    const s = SOLIDS[key];
    return finish(rand, {
      unit: 7, text: '這個東西是什麼形狀？', fig: { type: 'solid', solid: key },
      answer: s.name, wrongs: s.confuse, hint: s.hint, why: s.why,
    });
  }
  const keys = Object.keys(SHAPES);
  const A = pick(rand, keys);
  let B = pick(rand, keys);
  while (B === A) B = pick(rand, keys);
  const unitSeq = rand() < 0.5 ? [A, B] : [A, B, B];
  const seq = [];
  while (seq.length < 5 + (unitSeq.length === 3 ? 1 : 0)) seq.push(unitSeq[seq.length % unitSeq.length]);
  const next = unitSeq[seq.length % unitSeq.length];
  const other = next === A ? B : A;
  return finish(rand, {
    unit: 7, text: '照規律排下去，下一個是什麼形狀？', fig: { type: 'pattern', seq },
    answer: SHAPES[next].name, wrongs: [SHAPES[other].name],
    hint: '看看是哪幾個形狀一直重複。',
    why: `每次都是「${unitSeq.map((k) => SHAPES[k].name).join('、')}」重複，所以下一個是${SHAPES[next].name}。`,
  });
}

function unit8(rand) {
  const type = int(rand, 0, 3);
  const a = int(rand, 3, 10);
  const b = int(rand, 1, a - 1);
  const d = a - b;
  const wrongs = [d - 1, d + 1, a + b].filter((v) => v >= 0);
  if (type === 0) {
    const kind = pick(rand, Object.keys(THINGS));
    return finish(rand, {
      unit: 8, text: `${a} − ${b} ＝ □`, speak: `${a} 減 ${b} 等於多少？`, fig: { type: 'takeaway', kind, total: a, take: b },
      answer: d, wrongs, hint: `先有 ${a} 個，劃掉 ${b} 個，數數看還剩幾個。`, why: `${a} 減 ${b} 等於 ${d}。`,
    });
  }
  if (type === 1) {
    const [c1] = pick(rand, NAMES);
    const story = pick(rand, [
      { text: `盤子裡有 ${a} 條魚，${c1}吃掉 ${b} 條，還剩幾條？`, unit: '條', kind: 'fish' },
      { text: `有 ${a} 個毛線球，滾走了 ${b} 個，還剩幾個？`, unit: '個', kind: 'yarn' },
    ]);
    return finish(rand, {
      unit: 8, text: story.text, fig: { type: 'takeaway', kind: story.kind, total: a, take: b },
      answer: d, wrongs: [a + b, d - 1, d + 1].filter((v) => v >= 0),
      hint: '「吃掉」「滾走」是變少了，要用減法。', why: `${a} − ${b} ＝ ${d}，還剩 ${d} ${story.unit}。`,
    });
  }
  if (type === 2) {
    const [c1, c2] = pick(rand, NAMES);
    return finish(rand, {
      unit: 8, text: `${c1}有 ${a} 條魚，${c2}有 ${b} 條魚，${c1}比${c2}多幾條？`, fig: { type: 'compare', kind: 'fish', a, b },
      answer: d, wrongs: [a + b, d + 1, a].filter((v) => v !== d),
      hint: '上下一條對一條排好，看多出來幾條。', why: `${a} − ${b} ＝ ${d}，${c1}多 ${d} 條。`,
    });
  }
  // 要用加法還是減法：看東西變多還是變少
  const add = rand() < 0.5;
  const story = add
    ? pick(rand, [`樹上有 ${a} 隻小鳥，又飛來 ${b} 隻。要算現在有幾隻，要用加法還是減法？`, `箱子裡有 ${a} 隻貓，又跳進 ${b} 隻。要算現在有幾隻，要用加法還是減法？`])
    : pick(rand, [`樹上有 ${a} 隻小鳥，飛走了 ${b} 隻。要算還剩幾隻，要用加法還是減法？`, `箱子裡有 ${a} 隻貓，跳出去 ${b} 隻。要算還剩幾隻，要用加法還是減法？`]);
  return finish(rand, {
    unit: 8, text: story, answer: add ? '加法' : '減法', wrongs: [add ? '減法' : '加法'],
    hint: '東西是變多了，還是變少了？', why: add ? `又來了 ${b} 隻，變多了，要用加法：${a} ＋ ${b} ＝ ${a + b}。` : `走了 ${b} 隻，變少了，要用減法：${a} − ${b} ＝ ${d}。`,
  });
}

function unit9(rand) {
  const h = int(rand, 1, 12);
  const next = (h % 12) + 1;
  if (rand() < 0.5) {
    return finish(rand, {
      unit: 9, text: '時鐘上是幾點？', fig: { type: 'clock', h, m: 0 },
      answer: `${h} 點`, wrongs: h === 12 ? [`${h} 點半`, '6 點'] : ['12 點', `${h} 點半`],
      hint: '短針指著幾，就是幾點；長針指著 12，是剛好整點。', why: `短針指著 ${h}，長針指著 12，是 ${h} 點。`,
    });
  }
  return finish(rand, {
    unit: 9, text: '時鐘上是幾點？', fig: { type: 'clock', h, m: 30 },
    answer: `${h} 點半`, wrongs: h === 6 ? [`${next} 點半`, `${h} 點`] : [`${next} 點半`, '6 點', `${h} 點`],
    hint: '長針指著 6 是「半」；短針已經走過了哪個數字？', why: `短針在 ${h} 和 ${next} 中間，已經走過 ${h}，長針指著 6，是 ${h} 點半。`,
  });
}

const MAKERS = { 1: unit1, 2: unit2, 3: unit3, 4: unit4, 5: unit5, 6: unit6, 7: unit7, 8: unit8, 9: unit9 };

export function makeProblem(unit, rand = Math.random) {
  const maker = MAKERS[unit];
  return maker ? maker(rand) : null;
}

// 從勾選的單元裡出一疊作業，同一疊裡盡量不出重複的題目
export function makeStack(units, size = 5, rand = Math.random) {
  const list = units.filter((u) => MAKERS[u]);
  const pool = list.length ? list : DEFAULT_UNITS;
  const stack = [];
  let guard = 0;
  while (stack.length < size && guard < size * 20) {
    guard += 1;
    const p = makeProblem(pool[Math.floor(rand() * pool.length)], rand);
    if (stack.some((q) => q.text === p.text && JSON.stringify(q.fig) === JSON.stringify(p.fig))) continue;
    stack.push(p);
  }
  return stack;
}

export function sanitizeUnits(value) {
  if (!Array.isArray(value)) return DEFAULT_UNITS.slice();
  const units = [...new Set(value.filter((u) => Number.isInteger(u) && MAKERS[u]))].sort((a, b) => a - b);
  return units.length ? units : DEFAULT_UNITS.slice();
}

export function sanitizeLearnStats(value) {
  const ok = (n) => Number.isInteger(n) && n >= 0 && n < 1e6;
  if (!value || !ok(value.graded) || !ok(value.right) || value.right > value.graded) return { graded: 0, right: 0 };
  return { graded: value.graded, right: value.right };
}

export function unitsText(units) {
  if (!units.length) return '';
  const runs = [];
  let start = units[0];
  let prev = units[0];
  for (const u of units.slice(1).concat([null])) {
    if (u === prev + 1) {
      prev = u;
      continue;
    }
    runs.push(start === prev ? `${start}` : `${start}～${prev}`);
    start = u;
    prev = u;
  }
  return runs.join('、');
}
