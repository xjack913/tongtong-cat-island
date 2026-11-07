// 桐桐貓貓島的島主卡雲端存檔（Cloudflare Worker＋D1）
//
//   POST /players {deviceId, data}        → 開一張新卡，回傳島主暗號
//   POST /sync    {code, deviceId, data?} → 存這臺裝置的資料（可省略），回傳別臺裝置合起來的資料
//
// 只存玩家取的名字和遊戲裡的數字，不收 email、不記 IP。
// 暗號只存雜湊，資料庫裡看不出原本的暗號；只有帶著暗號才讀得到那張卡。
// 請求用 text/plain 送，瀏覽器不用先問一次 CORS，分頁關掉時也送得出去。
import {
  CODE_CHARS, CODE_LENGTH, isDeviceId, mergeDevices, mergeOwn, normalizeCode, sanitizeDeviceData,
} from '../../profile.js';

const ALLOWED_ORIGINS = ['https://tong.xjack.tw'];
const MAX_BODY = 16 * 1024;
const MAX_DEVICES = 20; // 一張卡最多幾臺裝置
const CAT_LIMIT = 500; // 先留空間，之後島上貓變多也不用改這裡

// DEV_ORIGIN 給本機測試用，正式部署不帶
function isAllowed(origin, env) {
  return ALLOWED_ORIGINS.includes(origin) || (!!env.DEV_ORIGIN && origin === env.DEV_ORIGIN);
}

function corsHeaders(origin, env) {
  return {
    'Access-Control-Allow-Origin': isAllowed(origin, env) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
    'Cache-Control': 'no-store',
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH * 4));
  let code = '';
  // 丟掉超出整數倍的值，每個字出現的機率才會一樣
  const limit = 256 - (256 % CODE_CHARS.length);
  for (const b of bytes) {
    if (b < limit) code += CODE_CHARS[b % CODE_CHARS.length];
    if (code.length === CODE_LENGTH) return code;
  }
  return newCode();
}

async function playerId(env, code) {
  const data = new TextEncoder().encode(`${env.CODE_SALT}:${code}`);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return [...hash].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function parseRow(row) {
  try {
    return sanitizeDeviceData(JSON.parse(row.data), CAT_LIMIT);
  } catch {
    return sanitizeDeviceData(null, CAT_LIMIT);
  }
}

async function devicesOf(env, id) {
  const { results } = await env.DB.prepare('SELECT device_id, data FROM devices WHERE player_id = ?').bind(id).all();
  return results;
}

async function saveDevice(env, id, deviceId, data) {
  await env.DB.prepare(
    `INSERT INTO devices (player_id, device_id, data, updated_at) VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT (player_id, device_id) DO UPDATE SET data = ?3, updated_at = ?4`,
  ).bind(id, deviceId, JSON.stringify(data), new Date().toISOString()).run();
}

async function createPlayer(env, body, headers) {
  if (!isDeviceId(body.deviceId)) return json({ error: 'bad request' }, 400, headers);
  const data = sanitizeDeviceData(body.data, CAT_LIMIT);
  for (let tries = 0; tries < 5; tries++) {
    const code = newCode();
    const id = await playerId(env, code);
    const inserted = await env.DB.prepare('INSERT OR IGNORE INTO players (id, created_at) VALUES (?, ?)')
      .bind(id, new Date().toISOString()).run();
    if (inserted.meta.changes === 1) {
      await saveDevice(env, id, body.deviceId, data);
      return json({ code, others: mergeDevices([], CAT_LIMIT) }, 200, headers);
    }
  }
  return json({ error: 'try again' }, 503, headers);
}

async function sync(env, body, headers) {
  const code = normalizeCode(body.code);
  if (!code || !isDeviceId(body.deviceId)) return json({ error: 'bad request' }, 400, headers);
  const id = await playerId(env, code);
  const player = await env.DB.prepare('SELECT id FROM players WHERE id = ?').bind(id).first();
  if (!player) return json({ error: 'not found' }, 404, headers);

  const rows = await devicesOf(env, id);
  const mine = rows.find((row) => row.device_id === body.deviceId);
  const others = rows.filter((row) => row.device_id !== body.deviceId).map(parseRow);

  if (body.data) {
    if (!mine && rows.length >= MAX_DEVICES) return json({ error: 'too many devices' }, 409, headers);
    const incoming = sanitizeDeviceData(body.data, CAT_LIMIT);
    const merged = mine ? mergeOwn(parseRow(mine), incoming) : incoming;
    // 沒有變就不寫，省 D1 的免費額度
    if (!mine || JSON.stringify(parseRow(mine)) !== JSON.stringify(merged)) await saveDevice(env, id, body.deviceId, merged);
  }
  return json({ others: mergeDevices(others, CAT_LIMIT) }, 200, headers);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

    const { pathname } = new URL(request.url);
    if (request.method === 'GET' && pathname === '/health') return json({ ok: true }, 200, headers);
    if (request.method !== 'POST' || (pathname !== '/players' && pathname !== '/sync')) {
      return json({ error: 'not found' }, 404, headers);
    }
    if (!isAllowed(origin, env)) return json({ error: 'forbidden' }, 403, headers);
    if (!env.CODE_SALT) return json({ error: 'not configured' }, 500, headers);

    const text = await request.text();
    if (text.length > MAX_BODY) return json({ error: 'too large' }, 413, headers);
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return json({ error: 'bad request' }, 400, headers);
    }
    if (!body || typeof body !== 'object') return json({ error: 'bad request' }, 400, headers);

    return pathname === '/players' ? createPlayer(env, body, headers) : sync(env, body, headers);
  },
};
