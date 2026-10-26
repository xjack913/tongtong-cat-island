// 學習島、日記區的字加注音。字型是「注音粉圓」（Bpmf Huninn），每個國字右邊直接畫好注音；
// 破音字在字的後面加一個異體字選擇子，U+E01E1 是第 2 個讀音、U+E01E2 是第 3 個，以此類推。
// 讀音順序照注音 IVS 字型規格的讀音表（ButTaiwan/bpmfvs 的 phonic_table_Z），標法照教育部國語辭典。
// 瀏覽器與 Node 共用，不 import 任何東西。

// 用得到的破音字：第 0 個是字型預設的讀音，順序不能改
export const READINGS = {
  長: ['ㄔㄤˊ', 'ㄓㄤˇ', 'ㄓㄤˋ'],
  著: ['˙ㄓㄜ', 'ㄓㄨˋ', 'ㄓㄠ', 'ㄓㄠˊ', 'ㄓㄨㄛˊ'],
  覺: ['ㄐㄩㄝˊ', 'ㄐㄧㄠˋ'],
  重: ['ㄓㄨㄥˋ', 'ㄔㄨㄥˊ'],
  轉: ['ㄓㄨㄢˇ', 'ㄓㄨㄢˋ'],
  頭: ['ㄊㄡˊ', '˙ㄊㄡ'],
  西: ['ㄒㄧ', '˙ㄒㄧ'],
  巴: ['ㄅㄚ', '˙ㄅㄚ'],
  冠: ['ㄍㄨㄢˋ', 'ㄍㄨㄢ'],
  應: ['ㄧㄥ', 'ㄧㄥˋ'],
  數: ['ㄕㄨˋ', 'ㄕㄨˇ', 'ㄕㄨㄛˋ', 'ㄘㄨˋ', 'ㄙㄨˋ'],
  子: ['ㄗˇ', '˙ㄗ'],
  喔: ['ㄛ', '˙ㄛ', 'ㄨㄛˋ'],
  得: ['ㄉㄜˊ', '˙ㄉㄜ', 'ㄉㄟˇ'],
  個: ['ㄍㄜˋ', '˙ㄍㄜ', 'ㄍㄜˇ'],
};

// 在這些詞裡的字讀這個音：[詞, 詞裡的字, 讀音]
export const WORDS = [
  ['長出', '長', 'ㄓㄤˇ'],
  ['睡著', '著', 'ㄓㄠˊ'],
  ['睡覺', '覺', 'ㄐㄧㄠˋ'],
  ['好覺', '覺', 'ㄐㄧㄠˋ'],
  ['重複', '重', 'ㄔㄨㄥˊ'],
  ['轉圈', '轉', 'ㄓㄨㄢˋ'],
  ['饅頭', '頭', '˙ㄊㄡ'],
  ['芋頭', '頭', '˙ㄊㄡ'],
  ['東西', '西', '˙ㄒㄧ'],
  ['尾巴', '巴', '˙ㄅㄚ'],
  ['皇冠', '冠', 'ㄍㄨㄢ'],
  ['應用', '應', 'ㄧㄥˋ'],
  ['數學', '數', 'ㄕㄨˋ'],
  ['數字', '數', 'ㄕㄨˋ'],
  ['個位', '個', 'ㄍㄜˋ'],
];

// 不在上面的詞裡時，這幾個字一律讀這個音：數一數的「數」、盤子的「子」、句尾的「喔」、拿得起來的「得」、
// 幾個、第 5 個的量詞「個」（輕聲，課本這樣標）
export const CHARS = { 數: 'ㄕㄨˇ', 子: '˙ㄗ', 喔: '˙ㄛ', 得: '˙ㄉㄜ', 個: '˙ㄍㄜ' };

const VS = 0xe01e0;
const SELECTORS = /[\u{E01E0}-\u{E01EF}]/gu;

export function plainText(text) {
  return String(text).replace(SELECTORS, '');
}

// 已經加過的字再跑一次結果一樣，所以畫面上的字改了就可以直接再跑
export function zhuyin(text) {
  const chars = [...plainText(text)];
  const picked = new Array(chars.length).fill(null);
  for (const [word, ch, reading] of WORDS) {
    const w = [...word];
    const at = w.indexOf(ch);
    for (let i = 0; i + w.length <= chars.length; i++) {
      if (picked[i + at] === null && w.every((c, j) => chars[i + j] === c)) picked[i + at] = reading;
    }
  }
  return chars.map((c, i) => {
    const reading = picked[i] || CHARS[c];
    const n = reading ? READINGS[c].indexOf(reading) : 0;
    return n > 0 ? c + String.fromCodePoint(VS + n) : c;
  }).join('');
}
