// 學習島作業上的圖：魚、毛線球、緞帶、分合圖、一捆一捆的棒子、形狀、時鐘。全部用 SVG 畫，文字一律走 textContent。
const NS = 'http://www.w3.org/2000/svg';
const W = 360;
const INK = '#2A3490';
const RED = '#D42A37';
const SHAPE_COLOR = { triangle: '#FFC93C', circle: '#FF8FAB', square: '#8D9CF0', rect: '#7CC46C' };
// 圖上的國字跟作業紙一樣帶注音
const ZY = "'Bpmf Huninn', Huninn, sans-serif";

function node(tag, attrs = {}, parent = null) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  if (parent) parent.append(n);
  return n;
}

function text(parent, x, y, value, attrs = {}) {
  const t = node('text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': `Fredoka, ${ZY}`, 'font-weight': 600, 'font-size': 26, fill: INK, ...attrs }, parent);
  t.textContent = String(value);
  return t;
}

// 一個小東西：s 是大小，(x, y) 是中心
function icon(parent, kind, x, y, s) {
  const g = node('g', { transform: `translate(${x} ${y}) scale(${s / 40})` }, parent);
  if (kind === 'fish') {
    node('path', { d: 'M8 0 L20 -10 L20 10 Z', fill: '#E8792E' }, g);
    node('ellipse', { cx: -2, cy: 0, rx: 15, ry: 10, fill: '#FF8A3D' }, g);
    node('circle', { cx: -9, cy: -2, r: 2.4, fill: '#1F1B22' }, g);
  } else if (kind === 'yarn') {
    node('circle', { r: 15, fill: '#FF8FAB' }, g);
    node('path', { d: 'M-11 -6 Q0 2 12 -8 M-13 4 Q0 12 13 2 M-4 -14 Q4 0 -2 14', stroke: '#E8466E', 'stroke-width': 2, fill: 'none' }, g);
  } else if (kind === 'star') {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 7 : 16;
      pts.push(`${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`);
    }
    node('polygon', { points: pts.join(' '), fill: '#FFC93C', stroke: '#E0A400', 'stroke-width': 1.5 }, g);
  } else {
    node('circle', { cx: 0, cy: 3, r: 14, fill: '#E85D5D' }, g);
    node('path', { d: 'M0 -10 L1 -16', stroke: '#8A6446', 'stroke-width': 2.5, 'stroke-linecap': 'round' }, g);
    node('ellipse', { cx: 6, cy: -14, rx: 6, ry: 3, fill: '#7CC46C', transform: 'rotate(-25 6 -14)' }, g);
  }
  return g;
}

// 東西排成一排 5 個（像十格框），回傳每個的中心
function grid(count, cx, cy, cell, perRow = 5) {
  const rows = Math.ceil(count / perRow);
  const out = [];
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / perRow);
    const inRow = Math.min(perRow, count - r * perRow);
    out.push([cx + (i % perRow - (inRow - 1) / 2) * cell, cy + (r - (rows - 1) / 2) * cell]);
  }
  return out;
}

function svg(height) {
  return node('svg', { viewBox: `0 0 ${W} ${height}`, role: 'img' });
}

function plate(parent, cx, cy, rx, ry) {
  node('ellipse', { cx, cy: cy + 4, rx, ry, fill: '#DCE0F3' }, parent);
  node('ellipse', { cx, cy, rx, ry, fill: '#FFFFFF', stroke: '#B9BED6', 'stroke-width': 2 }, parent);
  node('ellipse', { cx, cy, rx: rx * 0.72, ry: ry * 0.72, fill: 'none', stroke: '#E3E6F5', 'stroke-width': 2 }, parent);
}

const DRAW = {
  objects(f) {
    const el = svg(f.plate ? 130 : 140);
    if (f.plate) {
      plate(el, W / 2, 65, 110, 44);
      return el;
    }
    grid(f.count, W / 2, 70, 58).forEach(([x, y]) => icon(el, f.kind, x, y, 46));
    return el;
  },

  bars(f) {
    const cell = 30;
    const x0 = 78;
    const el = svg(40 + f.bars.length * 56);
    const width = Math.max(...f.bars.map((b) => b.offset + b.len));
    f.bars.forEach((b, i) => {
      const y = 34 + i * 56;
      if (f.grid) {
        for (let k = 0; k < width; k++) node('rect', { x: x0 + k * cell, y: y - 15, width: cell, height: 30, fill: 'none', stroke: '#CDD2EA', 'stroke-width': 1.5 }, el);
      }
      const color = b.color === 'red' ? '#E85D5D' : '#5C6AD6';
      text(el, 36, y, b.name, { fill: color, 'font-size': 20, 'font-family': ZY, 'font-weight': 400 });
      node('rect', { x: x0 + b.offset * cell + 2, y: y - 11, width: b.len * cell - 4, height: 22, rx: 6, fill: color }, el);
      node('path', { d: `M${x0 + (b.offset + b.len) * cell - 2} ${y - 11} l10 -6 v34 l-10 -6z`, fill: color }, el);
    });
    return el;
  },

  measure(f) {
    const cell = Math.min(40, 280 / f.units);
    const x0 = (W - cell * f.units) / 2;
    const el = svg(130);
    const len = cell * f.units;
    node('rect', { x: x0, y: 30, width: len - 22, height: 24, fill: '#FFC93C', stroke: '#E0A400', 'stroke-width': 1.5 }, el);
    node('rect', { x: x0 - 1, y: 30, width: 14, height: 24, rx: 4, fill: '#FF8FAB' }, el);
    node('path', { d: `M${x0 + len - 22} 30 L${x0 + len} 42 L${x0 + len - 22} 54 Z`, fill: '#F6E3A6' }, el);
    node('path', { d: `M${x0 + len - 7} 38 L${x0 + len} 42 L${x0 + len - 7} 46 Z`, fill: '#4A4F6E' }, el);
    for (let k = 0; k < f.units; k++) {
      node('rect', { x: x0 + k * cell + 2, y: 74, width: cell - 4, height: 26, rx: 6, fill: '#FFFFFF', stroke: '#E8466E', 'stroke-width': 2 }, el);
      node('rect', { x: x0 + k * cell + 2, y: 74, width: (cell - 4) * 0.4, height: 26, rx: 6, fill: '#8D9CF0' }, el);
    }
    node('path', { d: `M${x0} 22 V108 M${x0 + len} 22 V108`, stroke: '#B9BED6', 'stroke-width': 2, 'stroke-dasharray': '4 4' }, el);
    return el;
  },

  // 分合圖：上面一個圓圈，下面兩個圓圈，用線連起來
  bond(f) {
    const el = svg(170);
    const spots = [[W / 2, 40, f.top], [W / 2 - 80, 128, f.left], [W / 2 + 80, 128, f.right]];
    node('path', { d: `M${W / 2} 40 L${W / 2 - 80} 128 M${W / 2} 40 L${W / 2 + 80} 128`, stroke: '#B9BED6', 'stroke-width': 4 }, el);
    spots.forEach(([x, y, v]) => {
      node('circle', { cx: x, cy: y, r: 30, fill: v === null ? '#FFF4D1' : '#FFFFFF', stroke: v === null ? '#F2B200' : INK, 'stroke-width': 3, 'stroke-dasharray': v === null ? '6 5' : 'none' }, el);
      text(el, x, y, v === null ? '?' : v, { 'font-size': 30, fill: v === null ? '#C99000' : INK });
    });
    return el;
  },

  // 一排貓，戴帽子的那隻要數出是第幾個
  row(f) {
    const el = svg(120);
    const gap = Math.min(40, 300 / f.count);
    const x0 = (W - gap * (f.count - 1)) / 2;
    text(el, 16, 98, '左', { 'font-size': 16, 'font-family': ZY, fill: '#4A4F6E' });
    text(el, W - 16, 98, '右', { 'font-size': 16, 'font-family': ZY, fill: '#4A4F6E' });
    for (let i = 0; i < f.count; i++) {
      const x = x0 + i * gap;
      const g = node('g', { transform: `translate(${x} 70)` }, el);
      const fur = ['#F2A35A', '#FAF8F3', '#2F2C33', '#A4A9B1', '#F5DEB8'][i % 5];
      node('path', { d: 'M-13 -6 L-11 -22 L-2 -12 Z M13 -6 L11 -22 L2 -12 Z', fill: fur, stroke: '#4A4F6E', 'stroke-width': 1.2 }, g);
      node('circle', { r: 15, fill: fur, stroke: '#4A4F6E', 'stroke-width': 1.2 }, g);
      node('circle', { cx: -5, cy: -1, r: 1.8, fill: fur === '#2F2C33' ? '#D8E05A' : '#1F1B22' }, g);
      node('circle', { cx: 5, cy: -1, r: 1.8, fill: fur === '#2F2C33' ? '#D8E05A' : '#1F1B22' }, g);
      if (i + 1 === f.mark) {
        node('path', { d: 'M-9 -16 L0 -40 L9 -16 Z', fill: RED }, g);
        node('circle', { cx: 0, cy: -41, r: 4, fill: '#FFC93C' }, g);
      }
    }
    return el;
  },

  plates(f) {
    const el = svg(150);
    [[W * 0.27, f.a, '左邊'], [W * 0.73, f.b, '右邊']].forEach(([cx, n, label]) => {
      plate(el, cx, 66, 74, 46);
      grid(n, cx, 64, 28, 3).forEach(([x, y]) => icon(el, f.kind, x, y, 26));
      text(el, cx, 132, label, { 'font-size': 17, 'font-family': ZY, 'font-weight': 400, fill: '#4A4F6E' });
    });
    return el;
  },

  sequence(f) {
    const el = svg(90);
    const size = 56;
    const gap = 10;
    const x0 = (W - (f.items.length * size + (f.items.length - 1) * gap)) / 2;
    f.items.forEach((v, i) => {
      const x = x0 + i * (size + gap);
      node('rect', { x, y: 17, width: size, height: size, rx: 10, fill: v === null ? '#FFF4D1' : '#FFFFFF', stroke: v === null ? '#F2B200' : INK, 'stroke-width': 3, 'stroke-dasharray': v === null ? '6 5' : 'none' }, el);
      text(el, x + size / 2, 45, v === null ? '?' : v, { 'font-size': 26, fill: v === null ? '#C99000' : INK });
    });
    return el;
  },

  // 一捆 10 根（中間綁紅帶子），再加幾根散的
  bundles(f) {
    const el = svg(140);
    const bundleW = 46;
    const looseGap = 11;
    const total = f.tens * (bundleW + 18) + (f.ones ? f.ones * looseGap + 14 : 0);
    let x = (W - total) / 2;
    const stick = (sx) => node('rect', { x: sx, y: 22, width: 3.6, height: 92, rx: 1.6, fill: '#E9B35E', stroke: '#C88F3A', 'stroke-width': 0.8 }, el);
    for (let b = 0; b < f.tens; b++) {
      for (let k = 0; k < 10; k++) stick(x + k * 4.4);
      node('rect', { x: x - 3, y: 60, width: bundleW, height: 12, rx: 4, fill: RED }, el);
      x += bundleW + 18;
    }
    if (f.ones) x += 6;
    for (let k = 0; k < f.ones; k++) stick(x + k * looseGap);
    return el;
  },

  // 加法：兩堆東西，中間一個加號
  groups(f) {
    const el = svg(130);
    [[W * 0.25, f.a], [W * 0.75, f.b]].forEach(([cx, n]) => {
      node('rect', { x: cx - 80, y: 12, width: 160, height: 106, rx: 16, fill: '#FFFFFF', stroke: '#DCE0F3', 'stroke-width': 2 }, el);
      grid(n, cx, 65, 30, 5).forEach(([x, y]) => icon(el, f.kind, x, y, 26));
    });
    text(el, W / 2, 65, '+', { 'font-size': 30 });
    return el;
  },

  // 減法：被拿走的用紅線劃掉
  takeaway(f) {
    const el = svg(140);
    grid(f.total, W / 2, 70, 58).forEach(([x, y], i) => {
      icon(el, f.kind, x, y, 44);
      if (i >= f.total - f.take) node('path', { d: `M${x - 20} ${y + 18} L${x + 20} ${y - 18}`, stroke: RED, 'stroke-width': 4, 'stroke-linecap': 'round' }, el);
    });
    return el;
  },

  // 比多幾個：上下兩排一個對一個
  compare(f) {
    const el = svg(130);
    const cell = Math.min(34, 300 / Math.max(f.a, f.b));
    const x0 = (W - cell * (Math.max(f.a, f.b) - 1)) / 2;
    for (let i = 0; i < f.a; i++) icon(el, f.kind, x0 + i * cell, 38, 30);
    for (let i = 0; i < f.b; i++) icon(el, f.kind, x0 + i * cell, 94, 30);
    return el;
  },

  shape(f) {
    const el = svg(150);
    const color = f.color || SHAPE_COLOR[f.shape];
    const attrs = { fill: color, stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' };
    if (f.shape === 'triangle') node('polygon', { points: `${W / 2},14 ${W / 2 + 70},132 ${W / 2 - 70},132`, ...attrs }, el);
    else if (f.shape === 'circle') node('circle', { cx: W / 2, cy: 75, r: 60, ...attrs }, el);
    else if (f.shape === 'square') node('rect', { x: W / 2 - 60, y: 15, width: 120, height: 120, ...attrs }, el);
    else node('rect', { x: W / 2 - 100, y: 35, width: 200, height: 80, ...attrs }, el);
    return el;
  },

  // 立體：球、圓柱、正方體、長方體，用三種深淺畫出面
  solid(f) {
    const el = svg(160);
    const cx = W / 2;
    const line = { stroke: INK, 'stroke-width': 2.5, 'stroke-linejoin': 'round' };
    if (f.solid === 'ball') {
      node('ellipse', { cx, cy: 146, rx: 50, ry: 8, fill: '#DCE0F3' }, el);
      node('circle', { cx, cy: 80, r: 62, fill: '#FF8FAB', ...line }, el);
      node('path', { d: `M${cx - 60} 72 Q${cx} 100 ${cx + 60} 72`, fill: 'none', stroke: '#E8466E', 'stroke-width': 3 }, el);
      node('ellipse', { cx: cx - 22, cy: 52, rx: 14, ry: 9, fill: '#FFFFFF', opacity: 0.75 }, el);
    } else if (f.solid === 'cylinder') {
      node('path', { d: `M${cx - 50} 34 V126 A50 16 0 0 0 ${cx + 50} 126 V34`, fill: '#7FC6E8', ...line }, el);
      node('ellipse', { cx, cy: 34, rx: 50, ry: 16, fill: '#B9E3F5', ...line }, el);
    } else {
      const wide = f.solid === 'box' ? 150 : 90;
      const h = 90;
      const d = 34;
      const x0 = cx - (wide + d) / 2;
      const y0 = 40;
      node('polygon', { points: `${x0},${y0} ${x0 + d},${y0 - d * 0.7} ${x0 + d + wide},${y0 - d * 0.7} ${x0 + wide},${y0}`, fill: '#FFE08A', ...line }, el);
      node('polygon', { points: `${x0 + wide},${y0} ${x0 + wide + d},${y0 - d * 0.7} ${x0 + wide + d},${y0 + h - d * 0.7} ${x0 + wide},${y0 + h}`, fill: '#E0A400', ...line }, el);
      node('rect', { x: x0, y: y0, width: wide, height: h, fill: '#FFC93C', ...line }, el);
    }
    return el;
  },

  pattern(f) {
    const el = svg(90);
    const n = f.seq.length + 1;
    const size = 40;
    const gap = Math.min(16, (W - n * size) / (n - 1));
    const x0 = (W - (n * size + (n - 1) * gap)) / 2;
    f.seq.forEach((key, i) => {
      const x = x0 + i * (size + gap) + size / 2;
      const attrs = { fill: SHAPE_COLOR[key], stroke: INK, 'stroke-width': 2, 'stroke-linejoin': 'round' };
      if (key === 'triangle') node('polygon', { points: `${x},26 ${x + 19},62 ${x - 19},62`, ...attrs }, el);
      else if (key === 'circle') node('circle', { cx: x, cy: 45, r: 18, ...attrs }, el);
      else if (key === 'square') node('rect', { x: x - 17, y: 28, width: 34, height: 34, ...attrs }, el);
      else node('rect', { x: x - 20, y: 34, width: 40, height: 22, ...attrs }, el);
    });
    const x = x0 + f.seq.length * (size + gap);
    node('rect', { x, y: 25, width: size, height: size, rx: 8, fill: '#FFF4D1', stroke: '#F2B200', 'stroke-width': 3, 'stroke-dasharray': '6 5' }, el);
    text(el, x + size / 2, 45, '?', { 'font-size': 24, fill: '#C99000' });
    return el;
  },

  // 時鐘：短針（時針）粗短、長針（分針）細長
  clock(f) {
    const el = svg(180);
    const cx = W / 2;
    const cy = 90;
    const r = 80;
    node('circle', { cx, cy, r: r + 6, fill: '#8D9CF0' }, el);
    node('circle', { cx, cy, r, fill: '#FFFFFF', stroke: INK, 'stroke-width': 3 }, el);
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const long = i % 5 === 0;
      const r1 = r - (long ? 10 : 5);
      node('line', { x1: cx + Math.sin(a) * r1, y1: cy - Math.cos(a) * r1, x2: cx + Math.sin(a) * (r - 2), y2: cy - Math.cos(a) * (r - 2), stroke: long ? INK : '#B9BED6', 'stroke-width': long ? 2.5 : 1.2 }, el);
    }
    for (let n = 1; n <= 12; n++) {
      const a = (n / 12) * Math.PI * 2;
      text(el, cx + Math.sin(a) * (r - 24), cy - Math.cos(a) * (r - 24), n, { 'font-size': 17 });
    }
    const hourA = (((f.h % 12) + f.m / 60) / 12) * Math.PI * 2;
    const minA = (f.m / 60) * Math.PI * 2;
    const hand = (a, len, width, color) => node('line', { x1: cx, y1: cy, x2: cx + Math.sin(a) * len, y2: cy - Math.cos(a) * len, stroke: color, 'stroke-width': width, 'stroke-linecap': 'round' }, el);
    hand(minA, r - 16, 4, '#4A4F6E');
    hand(hourA, r - 38, 8, INK);
    node('circle', { cx, cy, r: 6, fill: RED }, el);
    return el;
  },
};

export function drawFigure(fig) {
  const draw = DRAW[fig.type];
  const el = draw ? draw(fig) : svg(10);
  el.setAttribute('aria-hidden', 'true');
  return el;
}
