// 桐桐貓貓島 3D 場景：十一座島的形狀、位置和二十座木板橋照桐桐的兩張草稿描，學習數學島是她後來說要加的。
// 50 隻 Q 版貓在島上散步、排隊上跳臺比跳高、上表演區表演、躲紙箱、寫日記、寫數學作業、去公園休息、回貓貓之家睡覺；
// 這一輪跳最高的三隻會走上排行榜島的頒獎臺。兩腳走路、綁頭帶的貓貓教練會去找晃來晃去的貓，叫牠去跳臺跳；
// 戴眼鏡的貓貓老師站在學習數學島的黑板前，桐桐改錯作業時會提醒她。
// 島上的樹是開白花的油桐樹（桐桐的「桐」）。所有文字一律走 textContent。
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ISLANDS, BRIDGES, LEVELS, SKETCH, PERFECT, TRICKS, TRICK_KEYS, fromSketch, meterAt, peakHeight, toCm, autoPower, maxCm, mulberry32 } from './logic.js';

const TAU = Math.PI * 2;
const TOP = 0.8;
const GRAVITY = 7;
const RUN = 2.1;
const PATH_HALF = 0.2;
const TAG_DISTANCE = 15;
const FLY_MS = 1000;
const INTRO_MS = 1800;
const RIG_Y = -0.12;
const RIG_Z = -0.12;
const FONT = '"Huninn", "PingFang TC", "Microsoft JhengHei", sans-serif';
const NUM_FONT = '"Fredoka", "Huninn", "Arial Rounded MT Bold", Arial, sans-serif';

const C = {
  grass: 0xa8db8a, cliff: 0xead0a6, cliffDark: 0xddbb8e, sand: 0xf7e8c6, halo: 0xb9ebe9,
  path: 0xf6eddc, plank: 0xd09c63, plankDark: 0xa7794b, wood: 0xc28c58, woodDark: 0x8d6441,
  white: 0xffffff, cream: 0xfff7e6, ink: 0x3e4bb8, sun: 0xffc93c, gold: 0xf2b200, silver: 0xb7c0cc, bronze: 0xcc8448,
  leafA: 0x7cc46c, leafB: 0x68b65f, leafC: 0x8fd07a, blossom: 0xfffdf4, trunk: 0x8a6446,
  box: 0xdcb27b, boxDark: 0xc39a63, water: 0x8ad6dc, pond: 0x55bccb, roof: 0x5c6ad6, wall: 0xfff9ea, door: 0x8a5f3c,
  glass: 0xbfe6f5, pink: 0xffa8ba, sky: 0x9ec9ff, lemon: 0xffe08a, koi: 0xff8a3d, lily: 0x6fbf6a, stone: 0xd9d4ca,
  stage: 0xf3d29b, stageEdge: 0xd9a95e, curtain: 0xe8466e, curtainDark: 0xb8304f, floor: 0xe9c48f, floorDark: 0xc9a06a,
  paper: 0xfffdf6, rug: 0xbfc8ff, headband: 0xe8466e, kibble: 0xb7834b, waterBowl: 0x7fc6e8,
};

// 三座跳臺的場地：laneZ 是跑道在島上的南北位置，run 是樓梯水平長度，D 是從跳板尖到軟墊的距離，R 是軟墊半徑
const LANES = {
  low: { laneZ: 0.15, run: 0.7, deck: 0.8, board: 0.4, D: 1.3, R: 0.5, shift: 0, queueDir: [-0.3, 1], queueMax: 3, watch: null },
  mid: { laneZ: 0.45, run: 1.5, deck: 0.8, board: 0.45, D: 1.7, R: 0.55, shift: -0.2, queueDir: [-1, 0], queueMax: 4, watch: [1.3, -1.75] },
  high: { laneZ: 0.6, run: 2.2, deck: 0.9, board: 0.5, D: 2.1, R: 0.6, shift: 0.2, queueDir: [-1, 0], queueMax: 4, watch: [1.3, -1.9] },
};

// 貓的姿勢參數：lift 身體高度、pitch 身體前後傾（負的是抬頭）、hp／hy／hr 頭、front／rear 前後腳角度、lf／lr 腳長、
// swing 走路擺腳、tail／t2／t3 尾巴三節、side 尾巴往旁邊捲、wag 尾巴搖、eye 眼睛張開、wiggle 準備撲之前扭屁股
const POSE_KEYS = ['lift', 'pitch', 'hp', 'hy', 'hr', 'front', 'rear', 'lf', 'lr', 'swing', 'tail', 't2', 't3', 'side', 'wag', 'eye', 'wiggle'];
const BASE_POSE = { lift: 0, pitch: 0, hp: 0, hy: 0, hr: 0, front: 0, rear: 0, lf: 1, lr: 1, swing: 0, tail: -0.3, t2: -0.25, t3: 0.55, side: 0, wag: 0.18, eye: 1, wiggle: 0 };
const POSES = {};
POSES.stand = { ...BASE_POSE };
POSES.walk = { ...BASE_POSE, swing: 0.55, tail: -0.15, t2: -0.15, t3: 0.5, wag: 0.25 };
POSES.run = { ...BASE_POSE, swing: 0.85, pitch: 0.04, tail: -1.2, t2: 0.1, t3: 0.2, wag: 0.08 };
POSES.sit = { ...BASE_POSE, lift: -0.06, pitch: -0.55, hp: 0.45, front: 0.55, rear: -0.65, lf: 1.42, lr: 0.8, tail: -1.25, t2: 0.2, t3: 0.2, side: 0.7, wag: 0.06 };
POSES.proud = { ...POSES.sit, hp: 0.25 };
POSES.groom = { ...POSES.sit, hp: 0.6, hy: 0.5 };
POSES.loaf = { ...BASE_POSE, lift: -0.085, hp: 0.05, front: -1.4, rear: 1.4, lf: 0.45, lr: 0.45, tail: -1.6, t2: 0.1, t3: 0.1, side: 1, wag: 0.03 };
POSES.sleep = { ...POSES.loaf, hp: 0.45, hy: 0.3, hr: 0.35, eye: 0.06, wag: 0 };
POSES.inbox = { ...POSES.loaf, lift: -0.15 };
POSES.eat = { ...BASE_POSE, pitch: 0.1, hp: 0.8, front: -0.1 };
POSES.wiggle = { ...BASE_POSE, lift: -0.03, pitch: 0.06, front: -0.2, rear: 0.25, lf: 0.88, lr: 0.85, tail: -1.35, t2: 0, t3: 0.15, wag: 0.4, wiggle: 1 };
POSES.crouch = { ...POSES.wiggle, lift: -0.08, front: -0.45, rear: 0.5, lf: 0.7, lr: 0.65, wiggle: 0.3 };
POSES.air = { ...BASE_POSE, front: -1.15, rear: 1.05, lf: 1.12, lr: 1.12, tail: -1.5, t2: 0.05, t3: 0, wag: 0 };
POSES.land = { ...BASE_POSE, lift: -0.05, front: -0.3, rear: 0.3, lf: 0.85, lr: 0.85 };
POSES.hide = { ...POSES.loaf, lift: -0.3 };
// 兩隻腳站起來：身體往後仰到快直立，後腳、前腳和頭再轉回來朝下、朝前（教練、表演都用）
POSES.upright = { ...BASE_POSE, lift: 0.07, pitch: -1.42, hp: 1.3, front: 1.25, rear: 1.42, lf: 0.85, lr: 1, tail: -0.1, t2: -0.6, t3: -0.5, wag: 0.25 };
POSES.uprightWalk = { ...POSES.upright, swing: 0.4 };
POSES.wave = { ...POSES.upright };
POSES.point = { ...POSES.upright };
POSES.bow = { ...BASE_POSE, lift: -0.02, pitch: 0.3, hp: 0.55, front: -0.5, rear: 0.1, lf: 0.75, tail: -1.5, t2: 0.1, t3: 0.2, wag: 0.4 };
POSES.sing = { ...POSES.sit, hp: -0.15, wag: 0.3 };
POSES.cheer = { ...POSES.sit, hp: 0.15, lf: 1.05 };
POSES.write = { ...POSES.sit, hp: 0.75 };

const matCache = new Map();
function mat(color, extra) {
  if (extra) return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.9, metalness: 0, flatShading: true }, extra));
  let material = matCache.get(color);
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, flatShading: true });
    matCache.set(color, material);
  }
  return material;
}

function makeMesh(geometry, material, cast = true, receive = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

function put(parent, object, x = 0, y = 0, z = 0) {
  object.position.set(x, y, z);
  parent.add(object);
  return object;
}

function damp(a, b, rate, dt) {
  return a + (b - a) * (1 - Math.exp(-rate * dt));
}

function dampAngle(a, b, rate, dt) {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * (1 - Math.exp(-rate * dt));
}

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function lighten(hex, amount) {
  return new THREE.Color(hex).lerp(new THREE.Color(0xffffff), amount).getHex();
}

// 島形：本機座標 { x, z }，畫成 Shape 時 z 要反過來（ShapeGeometry 轉平後 y→-z）
function shapeOf(points, Kind = THREE.Shape) {
  const shape = new Kind();
  points.forEach((p, i) => (i ? shape.lineTo(p.x, -p.z) : shape.moveTo(p.x, -p.z)));
  shape.closePath();
  return shape;
}

function scalePts(points, k) {
  return points.map((p) => ({ x: p.x * k, z: p.z * k }));
}

// 從島中心往 (dx, dz) 方向，走多遠會碰到島邊
function rayToEdge(points, dx, dz) {
  let best = Infinity;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const ex = b.x - a.x;
    const ez = b.z - a.z;
    const den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = (a.x * ez - a.z * ex) / den;
    const u = (a.x * dz - a.z * dx) / den;
    if (t > 0 && u >= 0 && u <= 1) best = Math.min(best, t);
  }
  return best;
}

function segDist(px, pz, ax, az, bx, bz) {
  const vx = bx - ax;
  const vz = bz - az;
  const len2 = vx * vx + vz * vz;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / len2)) : 0;
  return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
}

function insidePoly(points, x, z) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    if ((a.z > z) !== (b.z > z) && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

function edgeDist(points, x, z) {
  let best = Infinity;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    best = Math.min(best, segDist(x, z, a.x, a.z, b.x, b.z));
  }
  return best;
}

function flatMesh(shape, color, y, extra) {
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), extra ? mat(color, extra) : mat(color));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.receiveShadow = true;
  return mesh;
}

// 一段平鋪在地上的小路（平面幾何，最後每座島合併成一個網格）
function stripGeometry(ax, az, bx, bz, width, y) {
  const length = Math.hypot(bx - ax, bz - az);
  const geometry = new THREE.PlaneGeometry(width, length + width * 0.6);
  geometry.rotateX(-Math.PI / 2);
  geometry.rotateY(Math.atan2(bx - ax, bz - az));
  geometry.translate((ax + bx) / 2, y, (az + bz) / 2);
  return geometry;
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function roundRectShape(w, h, r) {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

// 桐桐的印章：圓耳朵小動物探頭在「桐」字名牌上面（草稿上蓋的那顆）
function drawStamp(ctx, cx, cy, size, ink) {
  const s = size / 120;
  ctx.save();
  ctx.translate(cx - 60 * s, cy - 60 * s);
  ctx.scale(s, s);
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = ink;
  ctx.fillStyle = '#ffffff';
  for (const x of [37, 83]) {
    ctx.beginPath();
    ctx.arc(x, 24, 11, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(60, 52, 30, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = ink;
  for (const [x, y, r] of [[49, 41, 3.6], [71, 41, 3.6], [60, 31, 2.2], [51, 29, 1.8], [69, 29, 1.8]]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  roundRectPath(ctx, 10, 50, 100, 58, 29);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.font = `44px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('桐', 60, 81);
  ctx.restore();
}

// ---------- 貓的模型：每個部位上色後合併，一隻貓只有 10 個網格 ----------
const CAT_GEO = {
  body: new THREE.CapsuleGeometry(0.115, 0.2, 6, 14),
  head: new THREE.SphereGeometry(0.125, 20, 16),
  ear: new THREE.ConeGeometry(0.05, 0.1, 4),
  earInner: new THREE.ConeGeometry(0.03, 0.066, 4),
  eye: new THREE.SphereGeometry(0.024, 12, 10),
  shine: new THREE.SphereGeometry(0.008, 6, 5),
  nose: new THREE.SphereGeometry(0.014, 8, 6),
  cheek: new THREE.SphereGeometry(0.036, 12, 10),
  patch: new THREE.SphereGeometry(0.08, 12, 10),
  stripe: new THREE.TorusGeometry(0.117, 0.013, 6, 18, Math.PI),
  leg: new THREE.CapsuleGeometry(0.036, 0.09, 4, 8),
  paw: new THREE.SphereGeometry(0.042, 10, 8),
  tail: new THREE.CapsuleGeometry(0.028, 0.08, 4, 8),
  crownBand: new THREE.CylinderGeometry(0.062, 0.066, 0.045, 12, 1, true),
  crownSpike: new THREE.ConeGeometry(0.018, 0.05, 4),
};
const CAT_MATERIAL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 });
const CAT_MATERIAL_DOUBLE = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide });

function part(geometry, color, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const g = geometry.clone();
  g.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
    new THREE.Vector3(...scale),
  ));
  const c = new THREE.Color(color);
  const count = g.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

function buildCatModel(cat) {
  const coat = cat.coat;
  const body = coat.body;
  const head = coat.head || body;
  const ear = coat.ear || head;
  const legs = coat.legs || body;
  const paws = coat.paws || legs;
  const tail = coat.tail || body;
  const muzzle = coat.muzzle || head;
  const eyeL = coat.eye || '#2B2730';
  const eyeR = coat.eyeRight || eyeL;
  const ch = cat.chubby;

  const root = new THREE.Group();
  const spin = put(root, new THREE.Group(), 0, 0.2, 0);
  const rig = put(spin, new THREE.Group(), 0, RIG_Y, RIG_Z);
  // 以貓腳底為原點的座標，換成 rig（後腿根）的座標
  const at = (x, y, z) => [x, y - 0.2 - RIG_Y, z - RIG_Z];

  const bodyParts = [part(CAT_GEO.body, body, [0, 0, 0], [Math.PI / 2, 0, 0])];
  if (coat.chest) bodyParts.push(part(CAT_GEO.patch, coat.chest, [0, -0.035, 0.12], [0, 0, 0], [0.95, 0.9, 0.75]));
  if (coat.stripe) [-0.085, 0, 0.085].forEach((z) => bodyParts.push(part(CAT_GEO.stripe, coat.stripe, [0, 0, z])));
  if (coat.patches) {
    [[0.05, 0.072, -0.06], [-0.055, 0.07, 0.07], [0.0, 0.082, 0.0]].forEach((p, i) => {
      if (coat.patches[i]) bodyParts.push(part(CAT_GEO.patch, coat.patches[i], p, [0, i, 0], [1, 0.5, 1.15]));
    });
  }
  const bodyGeo = mergeGeometries(bodyParts, false);
  bodyGeo.scale(ch, 1 + (ch - 1) * 0.55, 1);
  const bodyMesh = put(rig, makeMesh(bodyGeo, CAT_MATERIAL, true, false), ...at(0, 0.2, 0));

  const headPivot = put(rig, new THREE.Group(), ...at(0, 0.31, 0.19));
  const headParts = [part(CAT_GEO.head, head, [0, 0, 0], [0, 0, 0], [1.1, 0.95, 1])];
  if (coat.headPatch) headParts.push(part(CAT_GEO.patch, coat.headPatch, [0.03, 0.078, -0.01], [0, 0, 0], [1, 0.5, 1]));
  if (coat.mask) headParts.push(part(CAT_GEO.patch, coat.mask, [0, -0.03, 0.06], [0, 0, 0], [1.15, 0.95, 0.8]));
  [-1, 1].forEach((s) => {
    headParts.push(part(CAT_GEO.ear, ear, [s * 0.072, 0.1, -0.005], [-0.12, Math.PI / 4, -s * 0.32]));
    headParts.push(part(CAT_GEO.earInner, coat.mask ? '#C9908F' : '#F4A7B4', [s * 0.07, 0.094, 0.014], [-0.12, Math.PI / 4, -s * 0.32], [1, 1, 0.55]));
    headParts.push(part(CAT_GEO.cheek, muzzle, [s * 0.03, -0.045, 0.098], [0, 0, 0], [1, 0.85, 0.9]));
  });
  headParts.push(part(CAT_GEO.nose, '#F08497', [0, -0.022, 0.127], [0, 0, 0], [1.25, 0.8, 0.8]));
  const headMesh = put(headPivot, makeMesh(mergeGeometries(headParts, false), CAT_MATERIAL, true, false), 0, 0.04, 0.03);

  const eyeParts = [];
  [[-1, eyeL], [1, eyeR]].forEach(([s, color]) => {
    eyeParts.push(part(CAT_GEO.eye, color, [s * 0.05, 0, 0], [0, 0, 0], [1, 1.15, 0.6]));
    if (color !== '#2B2730') eyeParts.push(part(CAT_GEO.eye, '#1F1B22', [s * 0.05, 0, 0.006], [0, 0, 0], [0.45, 0.95, 0.5]));
    eyeParts.push(part(CAT_GEO.shine, '#FFFFFF', [s * 0.05 + 0.008, 0.011, 0.014]));
  });
  const eyes = put(headPivot, makeMesh(mergeGeometries(eyeParts, false), CAT_MATERIAL, false, false), 0, 0.055, 0.138);

  const legGeo = mergeGeometries([
    part(CAT_GEO.leg, legs, [0, -0.08, 0]),
    part(CAT_GEO.paw, paws, [0, -0.14, 0.012], [0, 0, 0], [1, 0.7, 1.15]),
  ], false);
  const legPivots = [[-1, 0.11], [1, 0.11], [-1, -0.11], [1, -0.11]].map(([s, z]) => {
    const pivot = put(rig, new THREE.Group(), ...at(s * 0.065 * ch, 0.17, z));
    put(pivot, makeMesh(legGeo, CAT_MATERIAL, false, false));
    return pivot;
  });

  const tailGeo = mergeGeometries([part(CAT_GEO.tail, tail, [0, 0.05, 0])], false);
  const tailTipGeo = mergeGeometries([part(CAT_GEO.tail, coat.tailTip || tail, [0, 0.05, 0], [0, 0, 0], [0.82, 1, 0.82])], false);
  const tailRoot = put(rig, new THREE.Group(), ...at(0, 0.25, -0.2));
  put(tailRoot, makeMesh(tailGeo, CAT_MATERIAL, false, false));
  const tail2 = put(tailRoot, new THREE.Group(), 0, 0.1, 0);
  put(tail2, makeMesh(tailGeo, CAT_MATERIAL, false, false)).scale.set(0.9, 1, 0.9);
  const tail3 = put(tail2, new THREE.Group(), 0, 0.1, 0);
  put(tail3, makeMesh(tailTipGeo, CAT_MATERIAL, false, false));

  // 這一輪的冠軍會戴金色小皇冠
  const crownParts = [part(CAT_GEO.crownBand, '#F2B200')];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    crownParts.push(part(CAT_GEO.crownSpike, '#F2B200', [Math.cos(a) * 0.055, 0.045, Math.sin(a) * 0.055]));
  }
  crownParts.push(part(CAT_GEO.shine, '#E85D5D', [0, 0.01, 0.066], [0, 0, 0], [1.6, 1.6, 1]));
  const crown = put(headPivot, makeMesh(mergeGeometries(crownParts, false), CAT_MATERIAL_DOUBLE, false, false), 0, 0.165, 0.01);
  crown.rotation.x = -0.15;
  crown.visible = false;

  root.scale.setScalar(cat.size);
  const pick = { type: 'cat', index: cat.index };
  bodyMesh.userData.pick = pick;
  headMesh.userData.pick = pick;
  return { root, spin, rig, head: headPivot, eyes, legs: legPivots, tail: [tailRoot, tail2, tail3], crown, pickables: [bodyMesh, headMesh] };
}

// ---------- 小道具 ----------
function makeTree(random, scale = 1) {
  const group = new THREE.Group();
  put(group, makeMesh(new THREE.CylinderGeometry(0.05, 0.075, 0.5, 6), mat(C.trunk)), 0, 0.25, 0);
  const blobs = [];
  const flowers = [];
  [[0, 0.72, 0, 0.34], [0.2, 0.62, 0.08, 0.26], [-0.18, 0.64, -0.06, 0.25], [0.02, 0.92, -0.04, 0.22]].forEach(([x, y, z, r]) => {
    const g = new THREE.IcosahedronGeometry(r, 0);
    g.translate(x, y, z);
    blobs.push(g);
    for (let i = 0; i < 3; i++) {
      const a = random() * TAU;
      const b = random() * Math.PI * 0.5;
      const f = new THREE.IcosahedronGeometry(0.055 + random() * 0.025, 0);
      f.translate(x + Math.cos(a) * Math.cos(b) * r, y + Math.sin(b) * r, z + Math.sin(a) * Math.cos(b) * r);
      flowers.push(f);
    }
  });
  put(group, makeMesh(mergeGeometries(blobs, false), mat([C.leafA, C.leafB, C.leafC][Math.floor(random() * 3)])));
  put(group, makeMesh(mergeGeometries(flowers, false), mat(C.blossom), false, false));
  group.scale.setScalar(scale);
  return group;
}

function makeBench(width = 0.9) {
  const group = new THREE.Group();
  put(group, makeMesh(new THREE.BoxGeometry(width, 0.05, 0.3), mat(C.wood)), 0, 0.25, 0);
  put(group, makeMesh(new THREE.BoxGeometry(width, 0.15, 0.04), mat(C.wood)), 0, 0.38, -0.14);
  [-1, 1].forEach((s) => put(group, makeMesh(new THREE.BoxGeometry(0.05, 0.25, 0.26), mat(C.woodDark)), s * (width / 2 - 0.08), 0.125, 0));
  return group;
}

function makeFlag(color, height = 1.0) {
  const group = new THREE.Group();
  put(group, makeMesh(new THREE.CylinderGeometry(0.018, 0.018, height, 6), mat(C.woodDark)), 0, height / 2, 0);
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.36, -0.1);
  shape.lineTo(0, -0.22);
  const flag = put(group, makeMesh(new THREE.ShapeGeometry(shape), mat(color, { side: THREE.DoubleSide })), 0.01, height - 0.02, 0);
  group.userData.flag = flag;
  return group;
}

function makeBox() {
  const group = new THREE.Group();
  const s = 0.46;
  const h = 0.3;
  put(group, makeMesh(new THREE.BoxGeometry(s, 0.02, s), mat(C.boxDark)), 0, 0.01, 0);
  put(group, makeMesh(new THREE.BoxGeometry(s, h, 0.025), mat(C.box)), 0, h / 2, s / 2);
  put(group, makeMesh(new THREE.BoxGeometry(s, h, 0.025), mat(C.box)), 0, h / 2, -s / 2);
  put(group, makeMesh(new THREE.BoxGeometry(0.025, h, s), mat(C.box)), s / 2, h / 2, 0);
  put(group, makeMesh(new THREE.BoxGeometry(0.025, h, s), mat(C.box)), -s / 2, h / 2, 0);
  const flapA = put(group, makeMesh(new THREE.BoxGeometry(s, 0.02, 0.2), mat(C.boxDark)), 0, h + 0.07, -s / 2 - 0.07);
  flapA.rotation.x = -0.9;
  const flapB = put(group, makeMesh(new THREE.BoxGeometry(0.2, 0.02, s), mat(C.boxDark)), s / 2 + 0.07, h + 0.07, 0);
  flapB.rotation.z = -0.9;
  return group;
}

function makeBed(color) {
  const group = new THREE.Group();
  const ring = put(group, makeMesh(new THREE.TorusGeometry(0.27, 0.09, 8, 20), mat(color, { flatShading: false })), 0, 0.08, 0);
  ring.rotation.x = Math.PI / 2;
  put(group, makeMesh(new THREE.CylinderGeometry(0.27, 0.27, 0.05, 20), mat(lighten(color, 0.45))), 0, 0.04, 0);
  return group;
}

function makeBowl(fill) {
  const group = new THREE.Group();
  put(group, makeMesh(new THREE.CylinderGeometry(0.13, 0.1, 0.07, 14), mat(C.white)), 0, 0.035, 0);
  put(group, makeMesh(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 14), mat(fill), false), 0, 0.065, 0);
  return group;
}

function makeYarn(color) {
  const group = new THREE.Group();
  put(group, makeMesh(new THREE.SphereGeometry(0.13, 12, 10), mat(color, { flatShading: false })), 0, 0.13, 0);
  [0, 1.2, 2.2].forEach((r) => {
    const wrap = put(group, makeMesh(new THREE.TorusGeometry(0.13, 0.012, 6, 20), mat(lighten(color, 0.35)), false), 0, 0.13, 0);
    wrap.rotation.set(r, r * 0.7, 0);
  });
  return group;
}

function makeFish(color) {
  const geo = mergeGeometries([
    part(new THREE.CapsuleGeometry(0.06, 0.12, 4, 8), color, [0, 0, 0], [Math.PI / 2, 0, 0], [0.7, 1, 1]),
    part(new THREE.ConeGeometry(0.06, 0.1, 4), color, [0, 0, -0.14], [-Math.PI / 2, 0, 0], [1, 1, 0.4]),
    part(CAT_GEO.shine, '#1F1B22', [0.035, 0.015, 0.08]),
    part(CAT_GEO.shine, '#1F1B22', [-0.035, 0.015, 0.08]),
  ], false);
  return makeMesh(geo, CAT_MATERIAL, false, false);
}

// 貓貓教練的頭帶：繞額頭一圈，後腦勺打結垂兩條帶子
function addHeadband(model) {
  const parts = [
    part(new THREE.TorusGeometry(0.122, 0.02, 6, 24), '#E8466E', [0, 0, 0], [Math.PI / 2, 0, 0], [1.1, 1, 1]),
    part(new THREE.TorusGeometry(0.124, 0.008, 4, 24), '#FFFFFF', [0, 0.004, 0], [Math.PI / 2, 0, 0], [1.1, 1, 1]),
  ];
  [-1, 1].forEach((s) => parts.push(part(new THREE.BoxGeometry(0.032, 0.12, 0.014), '#E8466E', [s * 0.035, -0.055, -0.13], [0.45, 0, s * 0.4])));
  const band = put(model.head, makeMesh(mergeGeometries(parts, false), CAT_MATERIAL, false, false), 0, 0.09, 0.03);
  band.rotation.x = -0.2;
}

// 貓貓老師：圓眼鏡，右手拿一根教鞭
function addGlasses(model) {
  const ink = '#2B2730';
  const parts = [part(new THREE.BoxGeometry(0.03, 0.006, 0.006), ink, [0, 0.006, 0])];
  [-1, 1].forEach((s) => {
    parts.push(part(new THREE.TorusGeometry(0.036, 0.007, 6, 18), ink, [s * 0.05, 0, 0]));
    parts.push(part(new THREE.BoxGeometry(0.006, 0.006, 0.1), ink, [s * 0.087, 0.004, -0.05]));
  });
  put(model.head, makeMesh(mergeGeometries(parts, false), CAT_MATERIAL, false, false), 0, 0.055, 0.152);
  const stick = mergeGeometries([
    part(new THREE.CylinderGeometry(0.008, 0.011, 0.3, 6), '#8D6441', [0, -0.3, 0.02]),
    part(new THREE.SphereGeometry(0.015, 8, 6), '#FFFFFF', [0, -0.45, 0.02]),
  ], false);
  put(model.legs[1], makeMesh(stick, CAT_MATERIAL, false, false));
}

function makeCushion(color) {
  const group = new THREE.Group();
  put(group, makeMesh(new THREE.CylinderGeometry(0.2, 0.22, 0.08, 16), mat(color, { flatShading: false })), 0, 0.04, 0);
  put(group, makeMesh(new THREE.SphereGeometry(0.03, 8, 6), mat(lighten(color, 0.4)), false), 0, 0.085, 0);
  return group;
}

// 日記區的小書桌：桌上攤開一本日記和一支鉛筆
function makeDesk() {
  const group = new THREE.Group();
  put(group, makeMesh(new THREE.BoxGeometry(0.56, 0.04, 0.36), mat(C.wood)), 0, 0.26, 0);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => put(group, makeMesh(new THREE.BoxGeometry(0.04, 0.24, 0.04), mat(C.woodDark)), sx * 0.24, 0.12, sz * 0.14));
  [-1, 1].forEach((s) => {
    const page = put(group, makeMesh(new THREE.BoxGeometry(0.17, 0.012, 0.22), mat(C.paper)), s * 0.088, 0.29, 0.02);
    page.rotation.z = -s * 0.08;
  });
  put(group, makeMesh(new THREE.BoxGeometry(0.36, 0.008, 0.24), mat(C.ink)), 0, 0.282, 0.02);
  const pencil = put(group, makeMesh(new THREE.CylinderGeometry(0.009, 0.009, 0.16, 6), mat(C.sun), false), 0.2, 0.295, 0.06);
  pencil.rotation.set(Math.PI / 2, 0, 0.5);
  return group;
}

// 草稿上日記區那顆圓圓的燈
function makeLamp() {
  const group = new THREE.Group();
  put(group, makeMesh(new THREE.CylinderGeometry(0.16, 0.18, 0.05, 12), mat(C.woodDark)), 0, 0.025, 0);
  put(group, makeMesh(new THREE.CylinderGeometry(0.025, 0.025, 1.25, 8), mat(C.woodDark)), 0, 0.65, 0);
  put(group, makeMesh(new THREE.SphereGeometry(0.2, 16, 12), mat(C.lemon, { flatShading: false, emissive: 0xffd36b, emissiveIntensity: 0.6 }), false), 0, 1.32, 0);
  put(group, makeMesh(new THREE.TorusGeometry(0.2, 0.025, 6, 20), mat(C.white)), 0, 1.32, 0).rotation.x = Math.PI / 2;
  return group;
}

export function createScene(container, { cats: catData, hooks = {}, reducedMotion = false, seed = 7 }) {
  const random = mulberry32(seed);
  const rand = (a = 0, b = 1) => a + (b - a) * random();
  const pickOne = (list) => list[Math.floor(random() * list.length)];

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(container.clientWidth, container.clientHeight);
  labelRenderer.domElement.className = 'scene-labels';
  container.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xdff4f3, 60, 170);
  const clock = new THREE.Clock();

  const camera = new THREE.PerspectiveCamera(34, container.clientWidth / Math.max(1, container.clientHeight), 0.1, 400);
  // 群島東西約 -19.3～22.6、南北約 -21.1～9.9 公尺
  const overview = { position: new THREE.Vector3(), target: new THREE.Vector3(1.4, 0.8, -4.9) };
  function fitOverview() {
    const halfV = THREE.MathUtils.degToRad(camera.fov / 2);
    const halfH = Math.atan(Math.tan(halfV) * camera.aspect);
    const distance = Math.max(22.8 / Math.tan(halfH), 15.9 / Math.tan(halfV)) * 1.03;
    const elevation = THREE.MathUtils.degToRad(52);
    overview.position.set(overview.target.x, overview.target.y + Math.sin(elevation) * distance, overview.target.z + Math.cos(elevation) * distance);
    overview.distance = distance;
    // 手機直拿時鏡頭要拉得很遠才放得下整個群島：霧往後推，免得整片島變白
    scene.fog.near = Math.max(60, distance * 0.95);
    scene.fog.far = Math.max(170, distance * 2);
  }
  fitOverview();
  camera.position.copy(overview.position).multiplyScalar(reducedMotion ? 1 : 1.35);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(overview.target);
  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.45;
  controls.minDistance = 2.5;
  controls.maxDistance = Math.max(110, overview.distance * 1.15);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xbcae94, 1.25));
  const sun = new THREE.DirectionalLight(0xfff1dd, 2.5);
  sun.target.position.set(1.6, 0, -4.9);
  sun.position.set(1.6 + 12, 24, -4.9 + 14);
  scene.add(sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -29, right: 29, top: 29, bottom: -29, near: 1, far: 90 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xc7dcff, 0.4);
  fill.position.set(-12, 9, -10);
  scene.add(fill);

  const water = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: C.water, roughness: 0.55 }));
  water.rotation.x = -Math.PI / 2;
  water.receiveShadow = true;
  scene.add(water);

  const textures = [];
  function paintTexture(width, height, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.userData.repaint = () => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, width, height);
      draw(ctx, width, height);
      texture.needsUpdate = true;
    };
    texture.userData.repaint();
    textures.push(texture);
    return texture;
  }

  const pickables = [];
  const pickHandlers = [];
  function pickable(object, pick) {
    object.traverse((child) => {
      if (child.isMesh) {
        child.userData.pick = pick;
        pickables.push(child);
      }
    });
  }

  // ---------- 島 ----------
  const islands = ISLANDS.map((def, index) => {
    const raw = def.outline.map(fromSketch);
    const center = raw.reduce((sum, p) => ({ x: sum.x + p.x / raw.length, z: sum.z + p.z / raw.length }), { x: 0, z: 0 });
    const local = raw.map((p) => ({ x: (p.x - center.x) * SKETCH.shrink, z: (p.z - center.z) * SKETCH.shrink }));
    const radius = local.reduce((sum, p) => sum + Math.hypot(p.x, p.z), 0) / local.length;
    const group = new THREE.Group();
    group.position.set(center.x, 0, center.z);
    scene.add(group);
    return {
      def, index, id: def.id, kind: def.kind, name: def.name, cx: center.x, cz: center.z, local, radius,
      ring: def.ring, group, ringNodes: [], obstacles: [], spurs: [], strips: [], spots: [], headPts: [], random: mulberry32(index * 131 + 7),
    };
  });
  const islandById = Object.fromEntries(islands.map((island) => [island.id, island]));
  const W = (island, x, y, z) => new THREE.Vector3(island.cx + x, y, island.cz + z);

  islands.forEach((island) => {
    const { local, group, index } = island;
    const pick = { type: 'island', id: island.id };
    const bevel = 0.07;
    const body = makeMesh(new THREE.ExtrudeGeometry(shapeOf(local), { depth: TOP - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: 0.1, bevelSegments: 2 }),
      [mat(C.grass), mat(index % 2 ? C.cliff : C.cliffDark)]);
    body.rotation.x = -Math.PI / 2;
    body.position.y = bevel;
    const beach = makeMesh(new THREE.ExtrudeGeometry(shapeOf(scalePts(local, 1.08)), { depth: 0.32, bevelEnabled: false }), mat(C.sand), false, true);
    beach.rotation.x = -Math.PI / 2;
    beach.position.y = -0.02;
    const halo = flatMesh(shapeOf(scalePts(local, 1.3)), C.halo, 0.012 + index * 0.002, { transparent: true, opacity: 0.7, depthWrite: false, flatShading: false });
    group.add(body, beach, halo);
    body.userData.pick = pick;
    beach.userData.pick = pick;
    pickables.push(body, beach);

    // 環島步道
    const d = PATH_HALF / island.radius;
    const ringShape = shapeOf(scalePts(local, island.ring + d));
    ringShape.holes.push(shapeOf(scalePts(local, island.ring - d), THREE.Path));
    group.add(flatMesh(ringShape, C.path, TOP + 0.012));
  });

  // ---------- 走路的路網：每座島一圈步道節點，再接橋頭、休息點、排隊處 ----------
  const nodes = [];
  const adj = [];
  function addNode(island, x, z, kind = 'spot') {
    const id = nodes.length;
    nodes.push({ id, island: island.id, x, z, kind, v: W(island, x, TOP + 0.005, z) });
    adj.push([]);
    return id;
  }
  function link(a, b, mid = []) {
    const pts = [nodes[a].v, ...mid, nodes[b].v];
    let len = 0;
    for (let i = 0; i < pts.length - 1; i++) len += pts[i].distanceTo(pts[i + 1]);
    adj[a].push({ to: b, pts, len });
    adj[b].push({ to: a, pts: pts.slice().reverse(), len });
  }
  function blocked(island, x, z, pad = 0.1) {
    return island.obstacles.some((o) => (o.r !== undefined
      ? Math.hypot(x - o.x, z - o.z) < o.r + pad
      : Math.abs(x - o.x) < o.w / 2 + pad && Math.abs(z - o.z) < o.d / 2 + pad));
  }
  function segmentClear(island, ax, az, bx, bz, pad = 0.1) {
    const length = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(2, Math.ceil(length / 0.08));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (blocked(island, ax + (bx - ax) * t, az + (bz - az) * t, pad)) return false;
    }
    return true;
  }
  function nearestRing(island, x, z) {
    const sorted = island.ringNodes.slice().sort((a, b) => Math.hypot(nodes[a].x - x, nodes[a].z - z) - Math.hypot(nodes[b].x - x, nodes[b].z - z));
    return sorted.find((id) => segmentClear(island, x, z, nodes[id].x, nodes[id].z)) ?? sorted[0];
  }
  // 從某個節點鋪一段小路接到最近的環島步道
  function spur(island, id, draw = true) {
    const ring = nearestRing(island, nodes[id].x, nodes[id].z);
    link(id, ring);
    island.spurs.push([nodes[id].x, nodes[id].z, nodes[ring].x, nodes[ring].z]);
    if (draw) island.strips.push(stripGeometry(nodes[id].x, nodes[id].z, nodes[ring].x, nodes[ring].z, 0.36, TOP + 0.011));
    return ring;
  }

  islands.forEach((island) => {
    const ringPts = scalePts(island.local, island.ring);
    const list = [];
    ringPts.forEach((p, i) => {
      const q = ringPts[(i + 1) % ringPts.length];
      list.push(p, { x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 });
    });
    island.ringNodes = list.map((p) => addNode(island, p.x, p.z, 'ring'));
    island.ringNodes.forEach((id, i) => link(id, island.ringNodes[(i + 1) % island.ringNodes.length]));
  });

  // 休息點：approach 是走過去的地面位置，pos 是最後跳上去的位置（長椅、貓床、頒獎臺）；
  // event 是貓坐下來之後要記進日記的事
  const spots = [];
  function addSpot(island, { approach, pos, face, poses, kind, doing, draw = true, event = null }) {
    const node = addNode(island, approach[0], approach[1], 'spot');
    const spot = { index: spots.length, island: island.id, kind, node, pos: W(island, pos[0], pos[1], pos[2]), face, poses, doing, event, occupant: null };
    spots.push(spot);
    island.spots.push(spot);
    spot.ring = spur(island, node, draw);
    return spot;
  }

  function addBench(island, x, z, face, { width = 0.9, seats = 2, kind = 'rest', poses = ['loaf', 'sleep', 'sit'], doing, side = false, event = null }) {
    const bench = makeBench(width);
    bench.position.set(x, TOP, z);
    bench.rotation.y = face;
    island.group.add(bench);
    const ax = Math.cos(face);
    const az = -Math.sin(face);
    const fx = Math.sin(face);
    const fz = Math.cos(face);
    [-1, 0, 1].forEach((k) => island.obstacles.push({ x: x + ax * k * (width / 2 - 0.15), z: z + az * k * (width / 2 - 0.15), r: 0.2 }));
    for (let i = 0; i < seats; i++) {
      const u = (i - (seats - 1) / 2) * (width / seats);
      const sx = x + ax * u;
      const sz = z + az * u;
      const approach = side
        ? [x + ax * (width / 2 + 0.38) * (i < seats / 2 ? -1 : 1), z + az * (width / 2 + 0.38) * (i < seats / 2 ? -1 : 1)]
        : [sx + fx * 0.42, sz + fz * 0.42];
      addSpot(island, { approach, pos: [sx, TOP + 0.275, sz], face, poses, kind, doing, event });
    }
    return bench;
  }

  function addTreeAt(island, x, z, scale) {
    const tree = makeTree(island.random, scale);
    tree.position.set(x, TOP, z);
    tree.rotation.y = island.random() * TAU;
    island.group.add(tree);
    island.obstacles.push({ x, z, r: 0.35 });
  }

  function flowerSpot(island, x, z) {
    island.flowers = island.flowers || [];
    island.flowers.push([x, z]);
  }

  // ---------- 貓貓之家：藍屋頂房子，屋頂上掛桐桐的印章招牌 ----------
  let homeDoor = null;
  function buildHome(island) {
    const g = island.group;
    const hx = -0.5;
    const hz = -1.05;
    const wallW = 3.0;
    const wallD = 1.9;
    const wallH = 1.35;
    const house = new THREE.Group();
    house.position.set(hx, TOP, hz);
    g.add(house);
    put(house, makeMesh(new THREE.BoxGeometry(wallW + 0.3, 0.1, wallD + 0.3), mat(C.stone)), 0, 0.05, 0);
    put(house, makeMesh(new THREE.BoxGeometry(wallW, wallH, wallD), mat(C.wall)), 0, 0.1 + wallH / 2, 0);
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-wallD / 2 - 0.28, 0);
    roofShape.lineTo(wallD / 2 + 0.28, 0);
    roofShape.lineTo(0, 0.95);
    roofShape.closePath();
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: wallW + 0.4, bevelEnabled: false });
    roofGeo.translate(0, 0, -(wallW + 0.4) / 2);
    roofGeo.rotateY(Math.PI / 2);
    put(house, makeMesh(roofGeo, mat(C.roof)), 0, 0.1 + wallH, 0);
    // 拱門＋貓門
    const doorShape = new THREE.Shape();
    doorShape.moveTo(-0.32, 0);
    doorShape.lineTo(-0.32, 0.6);
    doorShape.absarc(0, 0.6, 0.32, Math.PI, 0, true);
    doorShape.lineTo(0.32, 0);
    doorShape.closePath();
    put(house, makeMesh(new THREE.ExtrudeGeometry(doorShape, { depth: 0.05, bevelEnabled: false }), mat(C.door)), 0, 0.1, wallD / 2 - 0.02);
    put(house, makeMesh(new THREE.BoxGeometry(0.26, 0.24, 0.02), mat(0x6b4529)), 0, 0.24, wallD / 2 + 0.04);
    put(house, makeMesh(new THREE.SphereGeometry(0.03, 8, 6), mat(C.sun)), 0.2, 0.62, wallD / 2 + 0.05);
    [-1, 1].forEach((s) => {
      const glass = put(house, makeMesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 20), mat(C.glass, { flatShading: false, roughness: 0.3 })), s * 0.95, 0.85, wallD / 2 + 0.01);
      glass.rotation.x = Math.PI / 2;
      const frame = put(house, makeMesh(new THREE.TorusGeometry(0.23, 0.035, 6, 20), mat(C.white)), s * 0.95, 0.85, wallD / 2 + 0.03);
      frame.rotation.y = 0;
      put(house, makeMesh(new THREE.BoxGeometry(0.03, 0.42, 0.02), mat(C.white)), s * 0.95, 0.85, wallD / 2 + 0.035);
    });
    put(house, makeMesh(new THREE.BoxGeometry(1.0, 0.08, 0.36), mat(C.stone)), 0, 0.04, wallD / 2 + 0.2);
    // 屋頂上的「桐」字招牌
    const ridge = 0.1 + wallH + 0.95;
    put(house, makeMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), mat(C.woodDark)), 0, ridge + 0.2, 0);
    const signTexture = paintTexture(512, 512, (ctx, w, h) => {
      drawStamp(ctx, w / 2, h / 2 + 6, 460, '#3E4BB8');
    });
    const sign = new THREE.Group();
    sign.position.set(0, ridge + 0.82, 0.02);
    house.add(sign);
    put(sign, makeMesh(new THREE.ShapeGeometry(roundRectShape(1.3, 1.25, 0.3)), mat(C.white, { side: THREE.DoubleSide })), 0, 0, -0.02);
    put(sign, new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: signTexture, transparent: true, toneMapped: false })), 0, 0, 0.005);
    pickable(house, { type: 'island', id: island.id });
    island.obstacles.push({ x: hx, z: hz, w: wallW + 0.4, d: wallD + 0.5 });

    // 門口：走進去就躲進家裡
    const doorNode = addNode(island, hx, 0.4, 'spot');
    homeDoor = { node: doorNode, inside: W(island, hx, TOP + 0.005, hz + wallD / 2 - 0.05), island: island.id };
    // 門前小廣場
    const plaza = flatMesh(new THREE.Shape().absarc(0, 0, 0.95, 0, TAU), C.path, TOP + 0.011);
    plaza.position.set(hx, TOP + 0.011, 1.25);
    g.add(plaza);
    const plazaNode = addNode(island, hx, 1.25, 'spot');
    link(doorNode, plazaNode);
    spur(island, plazaNode);

    // 貓床（睡覺）、碗（吃飯）、廣場（坐著）
    [[2.3, -1.6, 0xffa8ba], [2.95, -0.4, 0x9ec9ff], [-3.0, -0.5, 0xffe08a]].forEach(([x, z, color], i) => {
      const bed = makeBed(color);
      bed.position.set(x, TOP, z);
      g.add(bed);
      island.obstacles.push({ x, z, r: 0.38 });
      const approach = i === 2 ? [x, z + 0.5] : [x + 0.5, z];
      addSpot(island, { approach, pos: [x, TOP + 0.06, z], face: rand(0, TAU), poses: ['sleep', 'loaf'], kind: 'home', doing: '在貓貓之家的貓床睡覺', event: { type: 'sleep', place: '貓貓之家' } });
    });
    [[0.75, 0.62, 0xb7834b], [1.2, 0.62, 0x7fc6e8]].forEach(([x, z, fillColor], i) => {
      const bowl = makeBowl(fillColor);
      bowl.position.set(x, TOP, z);
      g.add(bowl);
      island.obstacles.push({ x, z, r: 0.14 });
      addSpot(island, { approach: [x, z + 0.55], pos: [x, TOP + 0.005, z + 0.3], face: Math.PI, poses: ['eat'], kind: 'home', doing: i === 0 ? '在貓貓之家吃飯' : '在貓貓之家喝水', draw: false, event: { type: i === 0 ? 'eat' : 'drink' } });
      link(spots[spots.length - 1].node, plazaNode);
    });
    [[-1.25, 1.55], [0.2, 1.7]].forEach(([x, z]) => {
      const spot = addSpot(island, { approach: [x, z], pos: [x, TOP + 0.005, z], face: rand(-0.6, 0.6), poses: ['sit', 'groom', 'loaf'], kind: 'home', doing: '在貓貓之家門口曬太陽', draw: false });
      link(spot.node, plazaNode);
    });
    // 貓抓柱
    const post = new THREE.Group();
    post.position.set(-2.5, TOP, 1.0);
    g.add(post);
    put(post, makeMesh(new THREE.CylinderGeometry(0.3, 0.34, 0.06, 12), mat(C.box)), 0, 0.03, 0);
    put(post, makeMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 10), mat(0xe8d5b0)), 0, 0.5, 0);
    put(post, makeMesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 12), mat(C.pink)), 0, 0.96, 0);
    put(post, makeMesh(new THREE.SphereGeometry(0.06, 10, 8), mat(C.sun, { flatShading: false })), 0.16, 0.62, 0);
    island.obstacles.push({ x: -2.5, z: 1.0, r: 0.36 });
    [[-2.0, -0.05], [1.0, -0.05], [-1.75, 0.0], [0.55, 0.0]].forEach(([x, z]) => flowerSpot(island, x, z));
    island.labelY = TOP + 4.3;
    island.labelZ = hz;
    island.labelX = hx;
  }

  // ---------- 跳臺島：樓梯、平臺、跳板、軟墊、貓耳朵身高尺 ----------
  const platforms = [];
  function buildJump(island) {
    const level = LEVELS[island.def.level];
    const lane = LANES[level.key];
    const g = island.group;
    const H = level.tower;
    const L = lane.run + lane.deck + lane.board + lane.D + lane.R + 0.45;
    const x0 = -L / 2 + lane.shift;
    const z = lane.laneZ;
    const deckStart = x0 + lane.run;
    const deckEnd = deckStart + lane.deck;
    const tip = deckEnd + lane.board;
    const land = tip + lane.D;
    const exitX = land + lane.R + 0.45;
    const color = new THREE.Color(level.color).getHex();
    const maxM = maxCm(level.key) / 100;

    put(g, makeMesh(new THREE.BoxGeometry(lane.deck, 0.08, 0.86), mat(C.cream)), (deckStart + deckEnd) / 2, TOP + H - 0.04, z);
    put(g, makeMesh(new THREE.BoxGeometry(lane.deck + 0.04, 0.05, 0.9), mat(color)), (deckStart + deckEnd) / 2, TOP + H - 0.1, z);
    for (const lx of [deckStart + 0.07, deckEnd - 0.07]) {
      for (const lz of [z - 0.36, z + 0.36]) {
        put(g, makeMesh(new THREE.CylinderGeometry(0.035, 0.045, H - 0.08, 6), mat(C.woodDark)), lx, TOP + (H - 0.08) / 2, lz);
      }
    }
    if (H > 1.2) {
      [z - 0.36, z + 0.36].forEach((lz) => {
        const brace = put(g, makeMesh(new THREE.BoxGeometry(0.04, Math.hypot(lane.deck - 0.14, H * 0.6), 0.03), mat(C.woodDark)), (deckStart + deckEnd) / 2, TOP + H * 0.4, lz);
        brace.rotation.z = Math.atan2(lane.deck - 0.14, H * 0.6);
      });
    }
    if (H >= 1) {
      [z - 0.42, z + 0.42].forEach((lz) => {
        put(g, makeMesh(new THREE.BoxGeometry(lane.deck, 0.03, 0.03), mat(color)), (deckStart + deckEnd) / 2, TOP + H + 0.2, lz);
        [deckStart + 0.03, deckEnd - 0.03].forEach((px) => put(g, makeMesh(new THREE.BoxGeometry(0.03, 0.2, 0.03), mat(C.woodDark)), px, TOP + H + 0.1, lz));
      });
    }
    // 樓梯：斜坡加止滑條
    const rampLen = Math.hypot(lane.run, H);
    const angle = Math.atan2(H, lane.run);
    const ramp = put(g, makeMesh(new THREE.BoxGeometry(rampLen, 0.05, 0.5), mat(C.plank)), x0 + lane.run / 2, TOP + H / 2 - 0.02, z);
    ramp.rotation.z = angle;
    const cleats = Math.max(3, Math.floor(rampLen / 0.17));
    for (let i = 0; i < cleats; i++) {
      const t = (i + 0.5) / cleats;
      const cleat = put(g, makeMesh(new THREE.BoxGeometry(0.035, 0.03, 0.5), mat(C.plankDark), false), x0 + lane.run * t, TOP + H * t + 0.01, z);
      cleat.rotation.z = angle;
    }
    // 跳板：從平臺邊伸出去，跳的時候會彈
    const boardPivot = put(g, new THREE.Group(), deckEnd, TOP + H - 0.01, z);
    put(boardPivot, makeMesh(new THREE.BoxGeometry(lane.board + 0.12, 0.045, 0.42), mat(color)), (lane.board + 0.12) / 2 - 0.12, 0, 0);
    put(boardPivot, makeMesh(new THREE.BoxGeometry(0.06, 0.05, 0.42), mat(C.white)), lane.board - 0.04, 0.003, 0);
    // 軟墊
    const cushion = put(g, makeMesh(new THREE.SphereGeometry(lane.R, 24, 12, 0, TAU, 0, Math.PI / 2), mat(lighten(color, 0.5), { flatShading: false, roughness: 0.95 })), land, TOP, z);
    cushion.scale.y = 0.55;
    const rim = put(g, makeMesh(new THREE.TorusGeometry(lane.R * 0.97, 0.07, 8, 28), mat(color)), land, TOP + 0.05, z);
    rim.rotation.x = Math.PI / 2;
    // 身高尺：上面長貓耳朵，每 10 公分一格、每 50 公分寫數字
    const rulerH = maxM + 0.35;
    const rulerX = tip + lane.D * 0.42;
    const rulerZ = z - 0.62;
    const ruler = new THREE.Group();
    ruler.position.set(rulerX, TOP, rulerZ);
    g.add(ruler);
    put(ruler, makeMesh(new THREE.BoxGeometry(0.5, rulerH, 0.06), mat(C.ink)), 0, rulerH / 2, 0);
    const rulerTexture = paintTexture(128, Math.min(2048, Math.round((128 * rulerH) / 0.42)), (ctx, w, h) => {
      const pxPerM = h / rulerH;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      const bands = ['#FFE7A3', '#CFEFD6', '#D9DEFF', '#FFD6DE'];
      for (let cm = 0, i = 0; cm < rulerH * 100; cm += 50, i += 1) {
        const y0 = h - (cm / 100) * pxPerM;
        const y1 = h - ((cm + 50) / 100) * pxPerM;
        ctx.fillStyle = bands[i % bands.length];
        ctx.fillRect(0, y1, w, y0 - y1);
      }
      ctx.strokeStyle = '#2A3490';
      ctx.fillStyle = '#2A3490';
      for (let cm = 10; cm < rulerH * 100 - 4; cm += 10) {
        const y = h - (cm / 100) * pxPerM;
        const major = cm % 50 === 0;
        ctx.lineWidth = major ? 5 : 2.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(major ? 42 : 22, y);
        ctx.stroke();
        if (major) {
          ctx.font = `600 34px ${NUM_FONT}`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(cm), 50, y);
        }
      }
    });
    put(ruler, new THREE.Mesh(new THREE.PlaneGeometry(0.42, rulerH), new THREE.MeshBasicMaterial({ map: rulerTexture, toneMapped: false })), 0, rulerH / 2, 0.031);
    [-1, 1].forEach((s) => {
      const earCone = put(ruler, makeMesh(new THREE.ConeGeometry(0.1, 0.2, 4), mat(C.ink)), s * 0.15, rulerH + 0.08, 0);
      earCone.rotation.set(0, Math.PI / 4, -s * 0.25);
    });
    put(ruler, makeMesh(new THREE.BoxGeometry(0.7, 0.06, 0.34), mat(C.ink)), 0, 0.03, 0);
    // 剛跳的高度（粉紅箭頭）與這座跳臺的最高紀錄（金色橫條）
    const marker = put(ruler, new THREE.Group(), 0, 0, 0.05);
    const arrow = put(marker, makeMesh(new THREE.ConeGeometry(0.07, 0.16, 3), mat(0xff6f91), false), 0.33, 0, 0);
    arrow.rotation.z = Math.PI / 2;
    put(marker, makeMesh(new THREE.BoxGeometry(0.46, 0.025, 0.02), mat(0xff6f91), false), 0, 0, 0);
    marker.visible = false;
    const markerEl = document.createElement('div');
    markerEl.className = 'ruler-tag';
    const markerTag = new CSS2DObject(markerEl);
    markerTag.position.set(0.62, 0, 0);
    markerTag.center.set(0, 0.5);
    marker.add(markerTag);
    const best = put(ruler, new THREE.Group(), 0, 0, 0.06);
    put(best, makeMesh(new THREE.BoxGeometry(0.6, 0.035, 0.03), mat(C.gold), false), 0, 0, 0);
    best.visible = false;
    const bestEl = document.createElement('div');
    bestEl.className = 'ruler-tag ruler-tag--best';
    const bestTag = new CSS2DObject(bestEl);
    bestTag.position.set(-0.36, 0, 0);
    bestTag.center.set(1, 0.5);
    best.add(bestTag);

    const flag = makeFlag(color, 1.0 + H);
    flag.position.set(deckStart + 0.05, TOP, z - 0.45);
    g.add(flag);
    pickable(ruler, { type: 'island', id: island.id });

    island.obstacles.push({ x: (x0 + land + lane.R) / 2, z, w: land + lane.R - x0 + 0.1, d: 1.0 });
    island.obstacles.push({ x: rulerX, z: rulerZ, w: 0.8, d: 0.4 });

    const qd = new THREE.Vector2(lane.queueDir[0], lane.queueDir[1]).normalize();
    const slotLocal = [];
    for (let k = 0; k < lane.queueMax; k++) slotLocal.push([x0 - 0.32 + qd.x * 0.42 * k, z + qd.y * 0.42 * k]);
    const queueNode = addNode(island, slotLocal[lane.queueMax - 1][0], slotLocal[lane.queueMax - 1][1], 'queue');
    spur(island, queueNode);
    const exitNode = addNode(island, exitX, z, 'exit');
    spur(island, exitNode);
    island.strips.push(stripGeometry(slotLocal[0][0], slotLocal[0][1], slotLocal[lane.queueMax - 1][0], slotLocal[lane.queueMax - 1][1], 0.42, TOP + 0.011));
    island.strips.push(stripGeometry(land + lane.R, z, exitX, z, 0.36, TOP + 0.011));

    if (lane.watch) {
      addBench(island, rulerX + lane.watch[0], z + lane.watch[1], 0, { width: 1.0, seats: 2, kind: 'watch', poses: ['sit', 'loaf'], doing: `在${level.name}看比賽`, side: true, event: { type: 'watchJump', level: level.key } });
    }

    const platform = {
      id: island.id, level: level.key, name: level.name, island, H, lane, maxM,
      rampBase: W(island, x0 - 0.05, TOP + 0.005, z),
      rampTop: W(island, deckStart + 0.08, TOP + H + 0.005, z),
      tipStand: W(island, tip - 0.17, TOP + H + 0.02, z),
      landTop: W(island, land, TOP + lane.R * 0.55, z),
      exitHop: W(island, land + lane.R + 0.22, TOP + 0.005, z),
      cushionTop: lane.R * 0.55,
      slots: slotLocal.map(([x, sz]) => W(island, x, TOP + 0.005, sz)),
      queueNode, exitNode, queueMax: lane.queueMax,
      queue: [], incoming: new Set(), climber: null, ready: null, charging: null, user: false,
      boardPivot, cushion, kick: 0, kickT: 9, squash: 0, marker, markerEl, best, bestEl, rulerH,
      center: W(island, (x0 + exitX) / 2, TOP + maxM * 0.42, z - 0.2),
      span: exitX - x0 + 1.4,
      summonTimer: 0,
    };
    platforms.push(platform);
    island.labelY = TOP + rulerH + 0.75;
    island.labelX = rulerX;
    island.labelZ = rulerZ;
  }

  // ---------- 排行榜島：草稿上的 2、1、3 頒獎臺，後面是獎盃和成績看板 ----------
  const podiumSpots = [];
  let boardRows = [];
  function buildRank(island) {
    const g = island.group;
    const px = 0.2;
    const pz = -0.3;
    const podium = new THREE.Group();
    podium.position.set(px, TOP, pz);
    g.add(podium);
    const medal = [C.gold, C.silver, C.bronze];
    const blocks = [{ rank: 2, x: -0.85, h: 0.42 }, { rank: 1, x: 0, h: 0.62 }, { rank: 3, x: 0.85, h: 0.3 }];
    blocks.forEach(({ rank, x, h }) => {
      put(podium, makeMesh(new THREE.BoxGeometry(0.82, h, 0.72), mat(C.white)), x, h / 2, 0);
      put(podium, makeMesh(new THREE.BoxGeometry(0.86, 0.05, 0.76), mat(medal[rank - 1])), x, h + 0.02, 0);
      const digit = paintTexture(128, 128, (ctx, w, hh) => {
        ctx.fillStyle = '#3E4BB8';
        ctx.beginPath();
        ctx.arc(w / 2, hh / 2, 56, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `600 80px ${NUM_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(rank), w / 2, hh / 2 + 4);
      });
      put(podium, new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: digit, transparent: true, toneMapped: false })), x, Math.max(0.17, h * 0.5), 0.361);
      podiumSpots[rank - 1] = { rank, x: px + x, h };
    });
    island.obstacles.push({ x: px, z: pz, w: 2.6, d: 0.8 });
    // 獎盃
    const cup = new THREE.Group();
    cup.position.set(px, TOP, -1.08);
    g.add(cup);
    put(cup, makeMesh(new THREE.BoxGeometry(0.42, 0.62, 0.42), mat(C.white)), 0, 0.31, 0);
    const gold = mat(C.gold, { flatShading: false, roughness: 0.35, metalness: 0.3 });
    put(cup, makeMesh(new THREE.CylinderGeometry(0.12, 0.16, 0.06, 14), gold), 0, 0.65, 0);
    put(cup, makeMesh(new THREE.CylinderGeometry(0.035, 0.05, 0.16, 10), gold), 0, 0.76, 0);
    put(cup, makeMesh(new THREE.CylinderGeometry(0.22, 0.09, 0.3, 16), gold), 0, 0.99, 0);
    [-1, 1].forEach((s) => {
      const handle = put(cup, makeMesh(new THREE.TorusGeometry(0.08, 0.02, 6, 12, Math.PI), gold), s * 0.22, 1.0, 0);
      handle.rotation.z = -s * Math.PI / 2;
    });
    island.obstacles.push({ x: px, z: -1.08, r: 0.32 });
    // 成績看板
    const board = new THREE.Group();
    board.position.set(px, TOP, -1.72);
    g.add(board);
    [-1.15, 1.15].forEach((x) => put(board, makeMesh(new THREE.BoxGeometry(0.08, 1.4, 0.08), mat(C.woodDark)), x, 0.7, 0));
    const boardTexture = paintTexture(1024, 600, (ctx, w, h) => {
      ctx.fillStyle = '#2A3490';
      roundRectPath(ctx, 0, 0, w, h, 52);
      ctx.fill();
      ctx.fillStyle = '#FFC93C';
      ctx.font = `66px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('這次跳最高', w / 2, 78);
      if (!boardRows.length) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `48px ${FONT}`;
        ctx.fillText('貓貓正在暖身…', w / 2, 330);
        return;
      }
      const medals = ['#F2B200', '#C3CBD6', '#D99559', '#8D96E8', '#8D96E8'];
      boardRows.slice(0, 5).forEach((row, i) => {
        const y = 168 + i * 88;
        ctx.fillStyle = medals[i];
        ctx.beginPath();
        ctx.arc(96, y, 32, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#22253A';
        ctx.font = `600 40px ${NUM_FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(String(i + 1), 96, y + 2);
        ctx.fillStyle = '#ffffff';
        ctx.font = `52px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.fillText(row.name, 156, y);
        ctx.textAlign = 'right';
        ctx.font = `30px ${FONT}`;
        ctx.fillText('公分', w - 56, y + 8);
        ctx.font = `600 58px ${NUM_FONT}`;
        ctx.fillStyle = '#FFC93C';
        ctx.fillText(String(row.cm), w - 132, y + 2);
      });
    });
    put(board, makeMesh(new THREE.BoxGeometry(2.5, 1.5, 0.06), mat(0x2a3490)), 0, 1.4 + 0.75, -0.04);
    put(board, new THREE.Mesh(new THREE.PlaneGeometry(2.44, 1.43), new THREE.MeshBasicMaterial({ map: boardTexture, transparent: true, toneMapped: false })), 0, 1.4 + 0.75, 0.0);
    island.obstacles.push({ x: px, z: -1.72, w: 2.6, d: 0.3 });
    island.boardTexture = boardTexture;
    pickable(podium, { type: 'island', id: island.id });
    pickable(board, { type: 'island', id: island.id });
    pickable(cup, { type: 'island', id: island.id });
    [[-1.65, -0.9, C.ink], [2.05, -0.9, C.sun]].forEach(([x, fz, color]) => {
      const flag = makeFlag(color, 1.4);
      flag.position.set(x, TOP, fz);
      g.add(flag);
      island.obstacles.push({ x, z: fz, r: 0.1 });
    });
    // 頒獎臺前面的走道，冠軍從這裡跳上去
    const fronts = podiumSpots.map((s) => {
      const node = addNode(island, s.x, pz + 0.75, 'podium');
      s.node = node;
      s.pos = W(island, s.x, TOP + s.h + 0.03, pz);
      s.face = 0;
      s.poses = ['sit'];
      s.island = island.id;
      return node;
    });
    // 由西到東串起來，中間（第一名前面）接到步道
    const sorted = fronts.slice().sort((a, b) => nodes[a].x - nodes[b].x);
    for (let i = 0; i < sorted.length - 1; i++) link(sorted[i], sorted[i + 1]);
    island.strips.push(stripGeometry(nodes[sorted[0]].x, nodes[sorted[0]].z, nodes[sorted[2]].x, nodes[sorted[2]].z, 0.4, TOP + 0.011));
    spur(island, fronts[0]);
    // 觀眾席
    addBench(island, -1.3, 1.45, Math.PI, { width: 1.0, seats: 2, kind: 'watch', poses: ['sit', 'loaf'], doing: '在排行榜島看頒獎臺', side: true });
    addBench(island, 1.7, 1.45, Math.PI, { width: 1.0, seats: 2, kind: 'watch', poses: ['sit', 'loaf'], doing: '在排行榜島看頒獎臺', side: true });
    island.labelY = TOP + 3.35;
    island.labelX = px;
    island.labelZ = -1.72;
  }

  // ---------- 兩座公園 ----------
  function buildPark1(island) {
    addBench(island, -0.75, -0.2, 0, { width: 0.9, seats: 2, kind: 'rest', doing: '在紙箱公園的長椅上休息', event: { type: 'sleep', place: '紙箱公園的長椅上' } });
    addBench(island, 0.8, -0.2, 0, { width: 0.9, seats: 2, kind: 'rest', doing: '在紙箱公園的長椅上休息', event: { type: 'sleep', place: '紙箱公園的長椅上' } });
    const corners = scalePts(island.local, 0.8);
    let boxes = 0;
    corners.forEach((p) => {
      if (boxes >= 3) return;
      const near = island.spurs.some(([ax, az, bx, bz]) => segDist(p.x, p.z, ax, az, bx, bz) < 0.7)
        || island.headPts.some(([hx, hz]) => Math.hypot(p.x - hx, p.z - hz) < 1.1);
      if (near) return;
      const box = makeBox();
      box.position.set(p.x, TOP, p.z);
      box.rotation.y = island.random() * 0.6 - 0.3;
      island.group.add(box);
      island.obstacles.push({ x: p.x, z: p.z, r: 0.34 });
      const inward = Math.hypot(p.x, p.z) || 1;
      const spot = addSpot(island, { approach: [p.x - (p.x / inward) * 0.55, p.z - (p.z / inward) * 0.55], pos: [p.x, TOP + 0.03, p.z], face: Math.atan2(-p.x, -p.z), poses: ['inbox'], kind: 'rest', doing: '躲在紙箱公園的紙箱裡', event: { type: 'box', place: '紙箱公園' } });
      spot.box = box;
      pickable(box, { type: 'box', spot: spot.index });
      boxes += 1;
    });
    island.extraTrees = [[0, 0.6]];
    island.labelY = TOP + 1.7;
  }

  // 錦鯉：每條魚自己挑池子裡的下一個點游過去，有時慢慢晃、有時衝一小段，
  // 池邊有貓坐著看魚的時候，偶爾游到牠面前停一下；頭永遠朝游的方向（魚的模型頭朝本機 +z）
  const kois = [];
  const koiRandom = mulberry32(seed + 1013);
  function addKoi(island, color, cx, cz, pr) {
    const fish = makeFish(color);
    island.group.add(fish);
    const a = koiRandom() * TAU;
    const d = Math.sqrt(koiRandom()) * pr * 0.6;
    // timer 0：第一格畫面才挑目標，那時貓已經在島上了
    const koi = { fish, island, cx, cz, limit: pr - 0.2, x: cx + Math.cos(a) * d, z: cz + Math.sin(a) * d, heading: koiRandom() * TAU, speed: 0.15, want: 0.15, tx: cx, tz: cz, timer: 0, wiggle: koiRandom() * TAU, visit: null, visited: false, y: TOP + 0.005 };
    kois.push(koi);
  }
  // 這座島上「看魚」的位置，現在有貓坐好在看的
  function koiWatchers(koi) {
    return koi.island.spots.filter((s) => s.event && s.event.type === 'fish' && s.occupant !== null
      && cats[s.occupant].spot === s && cats[s.occupant].state === 'rest');
  }
  function towardSpot(koi, spot) {
    const dx = spot.pos.x - koi.island.cx - koi.cx;
    const dz = spot.pos.z - koi.island.cz - koi.cz;
    const len = Math.hypot(dx, dz) || 1;
    return [dx / len, dz / len];
  }
  // room：目標最遠可以到池子可游範圍的幾成
  function setKoiGoal(koi, x, z, room) {
    let tx = x - koi.cx;
    let tz = z - koi.cz;
    const reach = Math.hypot(tx, tz);
    const max = koi.limit * room;
    if (reach > max) {
      tx *= max / reach;
      tz *= max / reach;
    }
    koi.tx = koi.cx + tx;
    koi.tz = koi.cz + tz;
  }
  function pickKoiGoal(koi) {
    // 游到看魚的貓前面了：放慢、往牠那邊再靠一點，停在那裡給牠看
    if (koi.visit) {
      const spot = koi.visit;
      koi.visit = null;
      if (koiWatchers(koi).includes(spot)) {
        const [ux, uz] = towardSpot(koi, spot);
        koi.want = 0.03;
        koi.timer = 2.5 + koiRandom() * 2;
        koi.visited = true;
        setKoiGoal(koi, koi.x + ux * 0.12, koi.z + uz * 0.12, 0.97);
        return;
      }
    }
    // 有貓在看就偶爾游過去，同一隻貓前面最多兩條；剛看完的魚先游開
    const fresh = !koi.visited;
    koi.visited = false;
    const watched = koiWatchers(koi).filter((s) => kois.filter((k) => k.visit === s).length < 2);
    if (fresh && watched.length && koiRandom() < 0.4) {
      const spot = watched[Math.floor(koiRandom() * watched.length)];
      const [ux, uz] = towardSpot(koi, spot);
      const side = (koiRandom() - 0.5) * 0.5;
      koi.visit = spot;
      koi.want = 0.2 + koiRandom() * 0.1;
      koi.timer = 8;
      setKoiGoal(koi, koi.cx + (ux - uz * side) * koi.limit, koi.cz + (uz + ux * side) * koi.limit, 0.9);
      return;
    }
    const mood = koiRandom();
    const a = koiRandom() * TAU;
    let d;
    if (mood < 0.25) {
      // 慢慢晃到附近
      d = 0.15 + koiRandom() * 0.35;
      koi.want = 0.04 + koiRandom() * 0.08;
      koi.timer = 2 + koiRandom() * 3;
    } else if (mood < 0.37) {
      // 衝一小段
      d = 0.8 + koiRandom() * 0.6;
      koi.want = 0.55 + koiRandom() * 0.2;
      koi.timer = 1.6;
    } else {
      d = 0.4 + koiRandom() * 0.9;
      koi.want = 0.16 + koiRandom() * 0.16;
      koi.timer = 5 + koiRandom() * 4;
    }
    setKoiGoal(koi, koi.x + Math.cos(a) * d, koi.z + Math.sin(a) * d, 0.85);
  }
  function stepKoi(koi, dt, t) {
    koi.timer -= dt;
    if (koi.timer <= 0 || Math.hypot(koi.tx - koi.x, koi.tz - koi.z) < 0.08) pickKoiGoal(koi);
    const far = Math.hypot(koi.tx - koi.x, koi.tz - koi.z) || 1;
    let gx = (koi.tx - koi.x) / far;
    let gz = (koi.tz - koi.z) / far;
    // 同一個池子裡太靠近的魚互相讓開
    for (const other of kois) {
      if (other === koi || other.cx !== koi.cx || other.cz !== koi.cz) continue;
      const ox = koi.x - other.x;
      const oz = koi.z - other.z;
      const gap = Math.hypot(ox, oz);
      if (gap > 0 && gap < 0.3) {
        const push = ((0.3 - gap) / 0.3) * 1.5;
        gx += (ox / gap) * push;
        gz += (oz / gap) * push;
      }
    }
    const goal = Math.atan2(gx, gz);
    const turn = Math.atan2(Math.sin(goal - koi.heading), Math.cos(goal - koi.heading));
    // 照現在的方向再游一下就會碰到池邊：轉快一點、放慢
    const ahead = 0.12 + koi.speed * 0.5;
    const nearEdge = Math.hypot(koi.x + Math.sin(koi.heading) * ahead - koi.cx, koi.z + Math.cos(koi.heading) * ahead - koi.cz) > koi.limit;
    const rate = (nearEdge ? 3.5 : 1.2) + koi.speed * 3;
    koi.heading += Math.max(-rate * dt, Math.min(rate * dt, turn));
    // 轉大彎的時候先放慢
    const want = koi.want * (0.35 + 0.65 * Math.max(0, Math.cos(turn))) * (nearEdge ? 0.4 : 1);
    koi.speed += (want - koi.speed) * (1 - Math.exp(-2.5 * dt));
    koi.x += Math.sin(koi.heading) * koi.speed * dt;
    koi.z += Math.cos(koi.heading) * koi.speed * dt;
    const rx = koi.x - koi.cx;
    const rz = koi.z - koi.cz;
    const out = Math.hypot(rx, rz);
    if (out > koi.limit) {
      const nx = rx / out;
      const nz = rz / out;
      koi.x = koi.cx + nx * koi.limit;
      koi.z = koi.cz + nz * koi.limit;
      // 真的碰到池邊就沿著池邊轉，不要頭朝外橫著滑
      let hx = Math.sin(koi.heading);
      let hz = Math.cos(koi.heading);
      const outward = hx * nx + hz * nz;
      if (outward > 0) {
        hx -= nx * outward;
        hz -= nz * outward;
        koi.heading = Math.hypot(hx, hz) > 1e-3 ? Math.atan2(hx, hz) : koi.heading + Math.PI / 2;
      }
      pickKoiGoal(koi);
    }
    koi.fish.position.set(koi.x, koi.y, koi.z);
    // 身體左右擺，游越快擺越快
    koi.fish.rotation.y = koi.heading + Math.sin(t * (5 + koi.speed * 14) + koi.wiggle) * (0.05 + koi.speed * 0.22);
  }

  function buildPark2(island) {
    const g = island.group;
    const px = 0.15;
    const pz = -0.1;
    const pr = 1.1;
    const pond = flatMesh(new THREE.Shape().absarc(0, 0, pr, 0, TAU), C.pond, TOP + 0.014, { flatShading: false, roughness: 0.25 });
    pond.position.set(px, TOP + 0.014, pz);
    g.add(pond);
    for (let i = 0; i < 21; i++) {
      const a = (i / 21) * TAU;
      const rock = put(g, makeMesh(new THREE.DodecahedronGeometry(0.1 + island.random() * 0.04, 0), mat(C.stone)), px + Math.cos(a) * (pr + 0.05), TOP + 0.03, pz + Math.sin(a) * (pr + 0.05));
      rock.scale.y = 0.6;
    }
    [[0.45, 0.25], [-0.5, -0.4], [0.15, -0.6], [-0.3, 0.55]].forEach(([x, z]) => {
      put(g, makeMesh(new THREE.CylinderGeometry(0.13, 0.13, 0.01, 12), mat(C.lily), false), px + x, TOP + 0.02, pz + z);
    });
    [0xff8a3d, 0xffffff, 0xff8a3d].forEach((color) => addKoi(island, color, px, pz, pr));
    island.obstacles.push({ x: px, z: pz, r: pr + 0.15 });
    // 毛線球先放，等一下鋪小路才知道要繞開
    [[1.95, -1.0, 0xff8fab], [-1.75, 0.5, 0x8d9cf0]].forEach(([x, z, color]) => {
      const yarn = makeYarn(color);
      yarn.position.set(x, TOP, z);
      g.add(yarn);
      island.obstacles.push({ x, z, r: 0.2 });
    });
    // 長椅面向魚池，正前方離池邊太近，從長椅兩頭上去
    [-0.6, 0.1].forEach((k) => {
      const x = px + Math.cos(Math.PI * k) * 1.55;
      const z = pz + Math.sin(Math.PI * k) * 1.55;
      addBench(island, x, z, Math.atan2(px - x, pz - z), { width: 0.9, seats: 2, kind: 'rest', side: true, doing: '在魚池公園的長椅上休息', event: { type: 'sleep', place: '魚池公園的長椅上' } });
    });
    [Math.PI * 0.55, Math.PI, -Math.PI * 0.2].forEach((a) => {
      const x = px + Math.cos(a) * (pr + 0.37);
      const z = pz + Math.sin(a) * (pr + 0.37);
      addSpot(island, { approach: [x + Math.cos(a) * 0.15, z + Math.sin(a) * 0.15], pos: [x, TOP + 0.005, z], face: Math.atan2(px - x, pz - z), poses: ['sit', 'loaf'], kind: 'rest', doing: '在魚池公園看魚', event: { type: 'fish', place: '魚池公園' } });
    });
    island.labelY = TOP + 1.7;
  }

  // ---------- 表演區：草稿上左右兩階、中間最高的舞臺，前面是讓觀眾坐的木頭地板 ----------
  const show = { island: null, performer: null, waiting: null, last: null, user: false, summonTimer: 0 };
  function buildStage(island) {
    const g = island.group;
    const sz = -0.75;
    const stage = new THREE.Group();
    stage.position.set(0, TOP, sz);
    g.add(stage);
    put(stage, makeMesh(new THREE.BoxGeometry(3.2, 0.25, 1.1), mat(C.stage)), 0, 0.125, 0);
    put(stage, makeMesh(new THREE.BoxGeometry(3.26, 0.04, 1.16), mat(C.stageEdge)), 0, 0.25, 0);
    put(stage, makeMesh(new THREE.BoxGeometry(1.6, 0.25, 0.8), mat(C.stage)), 0, 0.395, -0.1);
    put(stage, makeMesh(new THREE.BoxGeometry(1.66, 0.04, 0.86), mat(C.stageEdge)), 0, 0.52, -0.1);
    // 舞臺正面的小星星
    const starShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + (i / 10) * TAU;
      const r = i % 2 ? 0.045 : 0.1;
      if (i) starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      else starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    [-1.15, 0, 1.15].forEach((x, i) => put(stage, makeMesh(new THREE.ShapeGeometry(starShape), mat(i === 1 ? C.sun : C.white), false), x, i === 1 ? 0.39 : 0.13, i === 1 ? 0.305 : 0.555));
    // 後面的布幕、橫幅和兩盞燈
    const back = new THREE.Group();
    back.position.set(0, TOP + 0.25, sz - 0.47);
    g.add(back);
    [-1.62, 1.62].forEach((x) => {
      put(back, makeMesh(new THREE.BoxGeometry(0.1, 1.8, 0.1), mat(C.woodDark)), x, 0.9, 0);
      put(back, makeMesh(new THREE.SphereGeometry(0.09, 10, 8), mat(C.lemon, { flatShading: false, emissive: 0xffd36b, emissiveIntensity: 0.7 }), false), x, 1.86, 0.06);
    });
    put(back, makeMesh(new THREE.BoxGeometry(3.4, 0.1, 0.12), mat(C.woodDark)), 0, 1.78, 0);
    [-1, 1].forEach((s) => {
      for (let k = 0; k < 4; k++) {
        const fold = put(back, makeMesh(new THREE.CylinderGeometry(0.11, 0.13, 1.5, 8), mat(k % 2 ? C.curtain : C.curtainDark)), s * (1.47 - k * 0.19), 0.98, 0.02);
        fold.scale.z = 0.5;
      }
    });
    put(back, makeMesh(new THREE.BoxGeometry(1.95, 1.5, 0.03), mat(0x5c3d8f)), 0, 0.98, -0.03);
    const bannerTexture = paintTexture(512, 128, (ctx, w, h) => {
      ctx.fillStyle = '#FFF4D1';
      roundRectPath(ctx, 4, 4, w - 8, h - 8, 40);
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#E8466E';
      ctx.stroke();
      ctx.fillStyle = '#B8304F';
      ctx.font = `68px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★ 表演區 ★', w / 2, h / 2 + 4);
    });
    put(back, new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.42), new THREE.MeshBasicMaterial({ map: bannerTexture, transparent: true, toneMapped: false })), 0, 1.98, 0.07);
    // 兩根柱子之間的三角旗
    const flagColors = [0xffc93c, 0x8d9cf0, 0xff8fab, 0x7cc46c];
    for (let i = 0; i < 9; i++) {
      const t = (i + 0.5) / 9;
      const tri = put(back, makeMesh(new THREE.ConeGeometry(0.06, 0.14, 3), mat(flagColors[i % flagColors.length], { side: THREE.DoubleSide }), false), -1.55 + 3.1 * t, 1.62 - Math.sin(Math.PI * t) * 0.12, 0.08);
      tri.rotation.x = Math.PI;
    }
    pickable(stage, { type: 'island', id: island.id });
    pickable(back, { type: 'island', id: island.id });
    island.obstacles.push({ x: 0, z: sz, w: 3.4, d: 1.25 });

    // 觀眾席：木頭地板上一排坐墊，坐著看臺上
    const fz = 0.5;
    put(g, makeMesh(new THREE.BoxGeometry(3.9, 0.05, 0.95), mat(C.floor)), 0, TOP + 0.025, fz);
    for (let k = -3; k <= 3; k++) put(g, makeMesh(new THREE.BoxGeometry(0.02, 0.012, 0.95), mat(C.floorDark), false), k * 0.55, TOP + 0.052, fz);
    const cushions = [0xff8fab, 0xffc93c, 0x8d9cf0, 0x7cc46c, 0xffa96b, 0xb8a2ff];
    cushions.forEach((color, i) => {
      const x = -1.55 + i * 0.62;
      const cushion = makeCushion(color);
      cushion.position.set(x, TOP + 0.05, fz);
      g.add(cushion);
      addSpot(island, { approach: [x, fz + 0.52], pos: [x, TOP + 0.135, fz], face: Math.PI, poses: ['sit'], kind: 'audience', doing: '在表演區看表演' });
    });
    island.obstacles.push({ x: 0, z: fz, w: 3.9, d: 0.95 });

    // 等著上臺的位置在舞臺右邊，表演完從左邊下去
    show.island = island;
    show.waitNode = addNode(island, 2.25, sz + 0.15, 'spot');
    spur(island, show.waitNode);
    show.exitNode = addNode(island, -2.25, sz + 0.15, 'spot');
    spur(island, show.exitNode);
    const climb = (x, y, z, hop) => {
      const p = W(island, x, TOP + y + 0.005, z);
      p.hop = hop;
      return p;
    };
    show.climb = [climb(1.32, 0.27, sz, true), climb(0.55, 0.54, sz - 0.1, true), climb(0, 0.54, sz - 0.1, false)];
    show.descend = [climb(-0.55, 0.54, sz - 0.1, false), climb(-1.32, 0.27, sz, true), climb(-2.25, 0, sz + 0.15, true)];
    show.stand = W(island, 0, TOP + 0.545, sz - 0.1);
    island.treeFilter = (x, z) => z < sz - 0.2;
    island.treeLimit = 3;
    island.labelY = TOP + 2.95;
    island.labelZ = sz - 0.47;
  }

  // ---------- 多多紙箱區：滿地紙箱，貓鑽進去只露出耳朵，或整隻躲起來讓紙箱晃來晃去 ----------
  const boxSpots = [];
  function addBoxSpot(island, x, z, place) {
    const box = makeBox();
    box.position.set(x, TOP, z);
    box.rotation.y = island.random() * 1.2 - 0.6;
    box.scale.setScalar(0.92 + island.random() * 0.22);
    island.group.add(box);
    island.obstacles.push({ x, z, r: 0.34 });
    // 從紙箱往步道那一邊找一個沒被擋住的地方當入口
    let approach = null;
    const ring = scalePts(island.local, island.ring);
    const base = Math.atan2(-z, -x);
    for (let k = 0; k < 8 && !approach; k++) {
      const a = base + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 4);
      const ax = x + Math.cos(a) * 0.52;
      const az = z + Math.sin(a) * 0.52;
      if (!blocked(island, ax, az, 0.02) && insidePoly(island.local, ax, az) && edgeDist(island.local, ax, az) > 0.25) approach = [ax, az];
    }
    approach = approach || [x * 0.7, z * 0.7];
    const spot = addSpot(island, {
      approach, pos: [x, TOP + 0.03, z], face: Math.atan2(approach[0] - x, approach[1] - z), poses: ['inbox', 'hide'], kind: 'box',
      doing: `躲在${place}的紙箱裡`, draw: false, event: { type: 'box', place },
    });
    spot.box = box;
    spot.boxTurn = box.rotation.y;
    boxSpots.push(spot);
    pickable(box, { type: 'box', spot: spot.index });
    return spot;
  }

  function buildBoxes(island) {
    const { local, random: r } = island;
    const ring = scalePts(local, island.ring);
    const inner = scalePts(local, 0.86);
    const xs = local.map((p) => p.x);
    const zs = local.map((p) => p.z);
    const candidates = [];
    for (let x = Math.min(...xs); x <= Math.max(...xs); x += 0.5) {
      for (let z = Math.min(...zs); z <= Math.max(...zs); z += 0.5) {
        candidates.push([x + (r() - 0.5) * 0.25, z + (r() - 0.5) * 0.25, r()]);
      }
    }
    candidates.sort((a, b) => a[2] - b[2]);
    // 步道裡面和步道外面都擺，彼此隔一點讓貓走得進去
    const placed = [];
    for (const [x, z] of candidates) {
      if (placed.length >= 16) break;
      if (!insidePoly(inner, x, z) || edgeDist(ring, x, z) < 0.46 || edgeDist(local, x, z) < 0.42) continue;
      if (island.headPts.some(([hx, hz]) => Math.hypot(x - hx, z - hz) < 0.95)) continue;
      if (placed.some(([px, pz]) => Math.hypot(x - px, z - pz) < 0.66)) continue;
      placed.push([x, z]);
      addBoxSpot(island, x, z, '多多紙箱區');
    }
    // 角落疊一座紙箱塔當招牌
    const tower = new THREE.Group();
    const corner = inner.reduce((best, p) => (edgeDist(ring, p.x, p.z) > edgeDist(ring, best.x, best.z) ? p : best), inner[0]);
    const tx = corner.x * 0.92;
    const tz = corner.z * 0.92;
    if (!blocked(island, tx, tz, 0.3)) {
      tower.position.set(tx, TOP, tz);
      [[0, 0, 0, 1.1], [0.05, 0.33, 0.6, 0.9], [-0.02, 0.6, 1.1, 0.7]].forEach(([dx, y, turn, s]) => {
        const box = makeBox();
        box.position.set(dx, y, 0);
        box.rotation.y = turn;
        box.scale.setScalar(s);
        tower.add(box);
      });
      island.group.add(tower);
      island.obstacles.push({ x: tx, z: tz, r: 0.4 });
      pickable(tower, { type: 'island', id: island.id });
    }
    island.treeLimit = 2;
    island.labelY = TOP + 1.7;
  }

  // ---------- 日記區：一排小書桌，後面立一本大大的貓貓日記 ----------
  const diaryDesks = [];
  function buildDiary(island) {
    const g = island.group;
    const rug = flatMesh(new THREE.Shape().absarc(0, 0, 1, 0, TAU), C.rug, TOP + 0.013);
    rug.scale.set(1.75, 0.62, 1);
    rug.position.set(0, TOP + 0.013, 0.2);
    g.add(rug);
    [-1.05, -0.35, 0.35, 1.05].forEach((x) => {
      const desk = makeDesk();
      desk.position.set(x, TOP, 0);
      desk.rotation.y = Math.PI;
      g.add(desk);
      island.obstacles.push({ x, z: 0, w: 0.6, d: 0.4 });
      const spot = addSpot(island, { approach: [x, 0.72], pos: [x, TOP + 0.005, 0.37], face: Math.PI, poses: ['write'], kind: 'diary', doing: '在日記區寫日記' });
      diaryDesks.push(spot);
    });
    // 大日記本：兩頁攤開斜斜立著，點了就打開日記
    const bookTexture = paintTexture(512, 360, (ctx, w, h) => {
      ctx.fillStyle = '#FFFDF6';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#DCE0F3';
      ctx.lineWidth = 3;
      for (let y = 96; y < h - 20; y += 44) {
        ctx.beginPath();
        ctx.moveTo(24, y);
        ctx.lineTo(w - 24, y);
        ctx.stroke();
      }
      ctx.fillStyle = '#3E4BB8';
      ctx.font = `64px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('貓貓日記', w / 2, 52);
      ctx.fillStyle = '#FF8FAB';
      [[150, 210], [300, 250], [380, 170], [210, 300]].forEach(([x, y], i) => {
        const s = i % 2 ? 0.8 : 1;
        ctx.beginPath();
        ctx.ellipse(x, y + 12 * s, 26 * s, 21 * s, 0, 0, TAU);
        ctx.fill();
        [[-26, -12], [-10, -28], [10, -28], [26, -12]].forEach(([dx, dy]) => {
          ctx.beginPath();
          ctx.ellipse(x + dx * s, y + dy * s, 9 * s, 11 * s, 0, 0, TAU);
          ctx.fill();
        });
      });
    });
    const book = new THREE.Group();
    book.position.set(0.3, TOP, -1.2);
    g.add(book);
    put(book, makeMesh(new THREE.BoxGeometry(0.5, 0.5, 0.36), mat(C.woodDark)), 0, 0.25, 0);
    const cover = put(book, makeMesh(new THREE.BoxGeometry(1.5, 1.02, 0.06), mat(C.ink)), 0, 0.98, -0.02);
    cover.rotation.x = -0.32;
    const pages = put(book, new THREE.Mesh(new THREE.PlaneGeometry(1.38, 0.94), new THREE.MeshBasicMaterial({ map: bookTexture, toneMapped: false })), 0, 0.99, 0.02);
    pages.rotation.x = -0.32;
    put(book, makeMesh(new THREE.BoxGeometry(0.04, 0.96, 0.02), mat(0x2a3490)), 0, 0.99, 0.035).rotation.x = -0.32;
    pickable(book, { type: 'island', id: island.id });
    island.obstacles.push({ x: 0.3, z: -1.2, w: 1.6, d: 0.6 });
    island.obstacles.push({ x: 0, z: 0.3, w: 3.3, d: 0.9 });
    const lamp = makeLamp();
    lamp.position.set(-1.25, TOP, -0.85);
    g.add(lamp);
    island.obstacles.push({ x: -1.25, z: -0.85, r: 0.22 });
    island.treeLimit = 3;
    island.labelY = TOP + 2.25;
    island.labelX = 0.3;
    island.labelZ = -1.2;
  }

  // ---------- 合體公園：一個紙箱、看魚的池子、水碗和飼料碗全部合在一起 ----------
  function buildCombo(island) {
    const g = island.group;
    const px = 0;
    const pz = -0.3;
    const pr = 0.7;
    const pond = flatMesh(new THREE.Shape().absarc(0, 0, pr, 0, TAU), C.pond, TOP + 0.014, { flatShading: false, roughness: 0.25 });
    pond.position.set(px, TOP + 0.014, pz);
    g.add(pond);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU;
      const rock = put(g, makeMesh(new THREE.DodecahedronGeometry(0.1 + island.random() * 0.04, 0), mat(C.stone)), px + Math.cos(a) * (pr + 0.05), TOP + 0.03, pz + Math.sin(a) * (pr + 0.05));
      rock.scale.y = 0.6;
    }
    put(g, makeMesh(new THREE.CylinderGeometry(0.11, 0.11, 0.01, 12), mat(C.lily), false), px + 0.3, TOP + 0.02, pz - 0.25);
    [0xff8a3d, 0xffffff, 0xffc93c].forEach((color) => addKoi(island, color, px, pz, pr));
    island.obstacles.push({ x: px, z: pz, r: pr + 0.15 });
    [[Math.PI, 1.05], [-0.15 * Math.PI, 1.05], [0.3 * Math.PI, 1.05]].forEach(([a, r]) => {
      const x = px + Math.cos(a) * r;
      const z = pz + Math.sin(a) * r;
      addSpot(island, { approach: [x + Math.cos(a) * 0.15, z + Math.sin(a) * 0.15], pos: [x, TOP + 0.005, z], face: Math.atan2(px - x, pz - z), poses: ['sit', 'loaf'], kind: 'rest', doing: '在合體公園看魚', event: { type: 'fish', place: '合體公園' } });
    });
    addBoxSpot(island, 0.95, -1.45, '合體公園');
    [[-0.5, 1.0, C.waterBowl, '在合體公園喝水', 'drink'], [0.35, 1.2, C.kibble, '在合體公園吃飯', 'eat']].forEach(([x, z, fill, doing, type]) => {
      const bowl = makeBowl(fill);
      bowl.position.set(x, TOP, z);
      bowl.scale.setScalar(1.15);
      g.add(bowl);
      if (type === 'eat') {
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * TAU;
          put(bowl, makeMesh(new THREE.SphereGeometry(0.03, 6, 5), mat(0x8d5a2b), false), Math.cos(a) * 0.06, 0.08, Math.sin(a) * 0.06);
        }
      }
      island.obstacles.push({ x, z, r: 0.16 });
      addSpot(island, { approach: [x, z + 0.55], pos: [x, TOP + 0.005, z + 0.3], face: Math.PI, poses: ['eat'], kind: 'eat', doing, event: { type } });
    });
    island.treeLimit = 3;
    island.labelY = TOP + 1.7;
  }

  // ---------- 學習數學島：黑板、講桌上一疊作業、一排課桌，貓貓老師站在黑板前 ----------
  // classCats：今天來上課的貓（app 每天換一批），只有牠們會去課桌寫作業
  const learn = { island: null, teacherPos: null, faceClass: 0.15, faceBoard: 1.98, classCats: null };
  const inClass = (cat) => !learn.classCats || learn.classCats.has(cat.index);
  function buildLearn(island) {
    const g = island.group;
    const bx = 0.4;
    const bz = -1.4;
    const board = new THREE.Group();
    board.position.set(bx, TOP, bz);
    g.add(board);
    [-1.55, 1.55].forEach((x) => put(board, makeMesh(new THREE.BoxGeometry(0.08, 1.9, 0.08), mat(C.woodDark)), x, 0.95, 0));
    put(board, makeMesh(new THREE.BoxGeometry(3.2, 1.36, 0.1), mat(C.wood)), 0, 1.15, 0);
    const boardTexture = paintTexture(1024, 420, (ctx, w, h) => {
      ctx.fillStyle = '#2F5D50';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let i = 0; i < 40; i++) ctx.fillRect((i * 97) % w, (i * 53) % h, 60, 3);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#F4F1E8';
      ctx.font = `600 50px ${NUM_FONT}`;
      ctx.fillText('1  2  3  4  5  6  7  8  9  10', w / 2, 62);
      ctx.fillStyle = '#FFE08A';
      ctx.font = `600 64px ${NUM_FONT}`;
      ctx.fillText('3 + 4 = 7', w * 0.3, 190);
      ctx.fillStyle = '#FFB3C4';
      ctx.fillText('8 − 3 = 5', w * 0.3, 300);
      // 粉筆畫的時鐘、三角形和貓臉
      ctx.strokeStyle = '#F4F1E8';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(w * 0.68, 240, 78, 0, TAU);
      ctx.moveTo(w * 0.68, 240);
      ctx.lineTo(w * 0.68, 180);
      ctx.moveTo(w * 0.68, 240);
      ctx.lineTo(w * 0.68 + 44, 240);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.86, 300);
      ctx.lineTo(w * 0.93, 180);
      ctx.lineTo(w * 0.99 - 10, 300);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w * 0.88, 110 + 250, 30, 0, TAU);
      ctx.stroke();
    });
    put(board, new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.23), new THREE.MeshBasicMaterial({ map: boardTexture, toneMapped: false })), 0, 1.15, 0.056);
    put(board, makeMesh(new THREE.BoxGeometry(3.0, 0.04, 0.14), mat(C.wood)), 0, 0.5, 0.09);
    [[-0.9, C.white], [-0.75, C.lemon], [-0.62, C.pink]].forEach(([x, color]) => {
      const chalk = put(board, makeMesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 6), mat(color), false), x, 0.54, 0.1);
      chalk.rotation.z = Math.PI / 2;
    });
    const signTexture = paintTexture(512, 128, (ctx, w, h) => {
      ctx.fillStyle = '#FFF4D1';
      roundRectPath(ctx, 4, 4, w - 8, h - 8, 40);
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#3E4BB8';
      ctx.stroke();
      ctx.fillStyle = '#2A3490';
      ctx.font = `68px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('學習數學島', w / 2, h / 2 + 4);
    });
    put(board, new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.35), new THREE.MeshBasicMaterial({ map: signTexture, transparent: true, toneMapped: false })), 0, 2.0, 0.06);
    // 點黑板：貓貓老師上課
    pickable(board, { type: 'board' });
    island.obstacles.push({ x: bx, z: bz, w: 3.4, d: 0.4 });

    // 講桌（講台）：一疊作業、一支紅筆、一顆蘋果，點了就開始改作業
    const desk = new THREE.Group();
    desk.position.set(-2.1, TOP, -0.75);
    g.add(desk);
    put(desk, makeMesh(new THREE.BoxGeometry(1.0, 0.5, 0.5), mat(C.wood)), 0, 0.25, 0);
    put(desk, makeMesh(new THREE.BoxGeometry(1.06, 0.05, 0.56), mat(C.woodDark)), 0, 0.52, 0);
    for (let i = 0; i < 8; i++) {
      const sheet = put(desk, makeMesh(new THREE.BoxGeometry(0.34, 0.022, 0.26), mat(i % 2 ? C.paper : 0xf0ebdc)), -0.18 + (random() - 0.5) * 0.04, 0.556 + i * 0.023, (random() - 0.5) * 0.04);
      sheet.rotation.y = (random() - 0.5) * 0.3;
    }
    const pen = put(desk, makeMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 6), mat(0xe85d5d), false), 0.12, 0.56, 0.12);
    pen.rotation.set(Math.PI / 2, 0, 0.6);
    put(desk, makeMesh(new THREE.SphereGeometry(0.075, 12, 10), mat(0xe85d5d, { flatShading: false })), 0.32, 0.62, -0.06);
    put(desk, makeMesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 5), mat(C.trunk), false), 0.32, 0.71, -0.06);
    pickable(desk, { type: 'podium' });
    island.obstacles.push({ x: -2.1, z: -0.75, w: 1.1, d: 0.6 });
    learn.island = island;
    learn.teacherPos = W(island, -1.0, TOP + 0.005, -0.8);
    island.obstacles.push({ x: -1.0, z: -0.8, r: 0.3 });

    // 一排課桌，貓坐著寫數學作業
    const rug = flatMesh(new THREE.Shape().absarc(0, 0, 1, 0, TAU), 0xfff1c4, TOP + 0.013);
    rug.scale.set(3.3, 0.62, 1);
    rug.position.set(0, TOP + 0.013, 0.45);
    g.add(rug);
    [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].forEach((x) => {
      const studyDesk = makeDesk();
      studyDesk.position.set(x, TOP, 0.3);
      studyDesk.rotation.y = Math.PI;
      g.add(studyDesk);
      addSpot(island, { approach: [x, 1.08], pos: [x, TOP + 0.005, 0.67], face: Math.PI, poses: ['write'], kind: 'study', doing: '在學習數學島寫作業', event: { type: 'study' } });
    });
    island.obstacles.push({ x: 0, z: 0.45, w: 6.0, d: 0.9 });

    // 書櫃
    const shelf = new THREE.Group();
    shelf.position.set(3.3, TOP, -0.9);
    shelf.rotation.y = -Math.PI / 2;
    g.add(shelf);
    put(shelf, makeMesh(new THREE.BoxGeometry(0.9, 1.2, 0.35), mat(C.woodDark)), 0, 0.6, 0);
    const bookColors = [0xff8fab, 0x8d9cf0, 0xffc93c, 0x7cc46c, 0xffa96b, 0xb8a2ff];
    [0.25, 0.65, 1.02].forEach((y, row) => {
      put(shelf, makeMesh(new THREE.BoxGeometry(0.84, 0.03, 0.3), mat(C.wood)), 0, y - 0.03, 0.03);
      for (let k = 0; k < 6; k++) {
        const book = put(shelf, makeMesh(new THREE.BoxGeometry(0.09, 0.26 + ((k + row) % 3) * 0.03, 0.22), mat(bookColors[(k + row * 2) % bookColors.length]), false), -0.3 + k * 0.12, y + 0.12, 0.07);
        book.rotation.z = k === 5 ? 0.25 : 0;
      }
    });
    island.obstacles.push({ x: 3.3, z: -0.9, w: 0.5, d: 1.0 });
    island.treeFilter = (x, z) => z < -1.7 || Math.abs(x) > 3.7;
    island.treeLimit = 3;
    island.labelY = TOP + 2.75;
    island.labelX = bx;
    island.labelZ = bz;
  }

  // 橋頭的位置先算好，島上擺東西時才知道要讓開
  const bridgePlans = BRIDGES.map((def, index) => {
    const pts = def.points.map(fromSketch);
    const sides = [[islandById[def.a], pts[0]]];
    if (!def.join) sides.push([islandById[def.b], pts[pts.length - 1]]);
    const ends = sides.map(([island, p]) => {
      const dx = p.x - island.cx;
      const dz = p.z - island.cz;
      const d = Math.hypot(dx, dz);
      const ux = dx / d;
      const uz = dz / d;
      const edge = rayToEdge(island.local, ux, uz);
      island.headPts.push([ux * (edge - 0.8), uz * (edge - 0.8)]);
      return { island, ux, uz, edge };
    });
    return { index, def, pts, ends };
  });

  islands.forEach((island) => {
    if (island.kind === 'home') buildHome(island);
    else if (island.kind === 'jump') buildJump(island);
    else if (island.kind === 'rank') buildRank(island);
    else if (island.kind === 'stage') buildStage(island);
    else if (island.kind === 'boxes') buildBoxes(island);
    else if (island.kind === 'diary') buildDiary(island);
    else if (island.kind === 'combo') buildCombo(island);
    else if (island.kind === 'learn') buildLearn(island);
    else if (island.id === 'park1') buildPark1(island);
    else if (island.id === 'park2') buildPark2(island);
  });
  const platformById = Object.fromEntries(platforms.map((p) => [p.id, p]));

  // ---------- 木板橋：照草稿畫成一格一格的木板 ----------
  const plankMatrices = [];
  const beamGeos = [];
  const pillarGeos = [];
  // 別的橋接上來的轉角（表演區那座橋接在長橋上），路網在那裡多一個岔路節點
  const junctionAt = new Map();
  BRIDGES.forEach((def) => def.join && junctionAt.set(def.join.join(':'), null));
  function addJunction(x, z) {
    const id = nodes.length;
    nodes.push({ id, island: null, x, z, kind: 'junction', v: new THREE.Vector3(x, TOP + 0.005, z) });
    adj.push([]);
    return id;
  }
  const edgePoint = (e) => ({ x: e.island.cx + e.ux * (e.edge - 0.35), z: e.island.cz + e.uz * (e.edge - 0.35) });
  const onDeck = (p) => new THREE.Vector3(p.x, TOP + 0.005, p.z);
  bridgePlans.filter((plan) => !plan.def.join).concat(bridgePlans.filter((plan) => plan.def.join)).forEach(({ index, def, pts, ends }) => {
    const deck = def.join
      ? [edgePoint(ends[0]), ...pts.slice(1)]
      : [edgePoint(ends[0]), ...pts.slice(1, -1), edgePoint(ends[1])];
    for (let i = 0; i < deck.length - 1; i++) {
      const a = deck[i];
      const b = deck[i + 1];
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      const angle = Math.atan2(b.x - a.x, b.z - a.z);
      const count = Math.max(2, Math.round(length / 0.3));
      for (let k = 0; k < count; k++) {
        const t = (k + 0.5) / count;
        plankMatrices.push(new THREE.Matrix4().compose(
          new THREE.Vector3(a.x + (b.x - a.x) * t, TOP - 0.008, a.z + (b.z - a.z) * t),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle),
          new THREE.Vector3(1, 1, 1),
        ));
      }
      const px = Math.cos(angle);
      const pz = -Math.sin(angle);
      [-0.3, 0.3].forEach((side) => {
        const beam = new THREE.BoxGeometry(0.08, 0.1, length + 0.1);
        beam.rotateY(angle);
        beam.translate((a.x + b.x) / 2 + px * side, TOP - 0.08, (a.z + b.z) / 2 + pz * side);
        beamGeos.push(beam);
      });
      const pillars = Math.floor(length / 2.6);
      for (let k = 1; k <= pillars; k++) {
        const t = k / (pillars + 1);
        [-0.3, 0.3].forEach((side) => {
          const pillar = new THREE.CylinderGeometry(0.07, 0.09, TOP, 6);
          pillar.translate(a.x + (b.x - a.x) * t + px * side, TOP / 2 - 0.08, a.z + (b.z - a.z) * t + pz * side);
          pillarGeos.push(pillar);
        });
      }
    }
    // 轉角的平臺
    pts.slice(1, -1).forEach((p) => {
      plankMatrices.push(new THREE.Matrix4().compose(new THREE.Vector3(p.x, TOP - 0.008, p.z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 4.1)));
    });
    // 兩端橋頭，接到島上的步道
    const heads = ends.map(({ island, ux, uz, edge }) => {
      const lx = ux * (edge - 0.8);
      const lz = uz * (edge - 0.8);
      const id = addNode(island, lx, lz, 'head');
      spur(island, id);
      return id;
    });
    if (def.join) {
      link(heads[0], junctionAt.get(def.join.join(':')), deck.slice(0, -1).map(onDeck));
      return;
    }
    let from = heads[0];
    let start = 0;
    for (let k = 1; k < pts.length - 1; k++) {
      const key = `${index}:${k}`;
      if (!junctionAt.has(key)) continue;
      const id = addJunction(pts[k].x, pts[k].z);
      junctionAt.set(key, id);
      link(from, id, deck.slice(start, k).map(onDeck));
      from = id;
      start = k + 1;
    }
    link(from, heads[1], deck.slice(start).map(onDeck));
  });
  const planks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.82, 0.05, 0.22), mat(C.plank), plankMatrices.length);
  plankMatrices.forEach((m, i) => planks.setMatrixAt(i, m));
  planks.castShadow = true;
  planks.receiveShadow = true;
  scene.add(planks);
  scene.add(makeMesh(mergeGeometries(beamGeos, false), mat(C.plankDark), false, true));
  if (pillarGeos.length) scene.add(makeMesh(mergeGeometries(pillarGeos, false), mat(C.woodDark), false, false));

  // ---------- 樹、花、小路 ----------
  islands.forEach((island) => {
    const { local, random: r } = island;
    const ringPts = scalePts(local, island.ring);
    const clearForTree = (x, z) => insidePoly(local, x, z)
      && edgeDist(local, x, z) > 0.45
      && edgeDist(ringPts, x, z) > 0.55
      && !blocked(island, x, z, 0.35)
      && !island.spurs.some(([ax, az, bx, bz]) => segDist(x, z, ax, az, bx, bz) < 0.6)
      && (!island.treeFilter || island.treeFilter(x, z));
    const candidates = scalePts(local, 0.86).map((p) => [p.x, p.z]);
    (island.extraTrees || []).forEach((p) => candidates.push(p));
    for (let i = 0; i < 40; i++) {
      const a = r() * TAU;
      const k = island.ring + 0.12 + r() * (0.92 - island.ring - 0.12);
      const reach = rayToEdge(local, Math.cos(a), Math.sin(a));
      candidates.push([Math.cos(a) * reach * k, Math.sin(a) * reach * k]);
    }
    const limit = island.treeLimit ?? (island.kind === 'home' ? 7 : island.kind === 'jump' ? 5 : 4);
    let planted = 0;
    candidates.forEach(([x, z]) => {
      if (planted >= limit || !clearForTree(x, z)) return;
      addTreeAt(island, x, z, 0.85 + r() * 0.35);
      planted += 1;
    });
    for (let i = 0; i < 18; i++) {
      const a = r() * TAU;
      const reach = rayToEdge(local, Math.cos(a), Math.sin(a));
      const k = 0.2 + r() * 0.7;
      const x = Math.cos(a) * reach * k;
      const z = Math.sin(a) * reach * k;
      if (edgeDist(ringPts, x, z) > 0.4 && edgeDist(local, x, z) > 0.3 && !blocked(island, x, z, 0.2)
        && !island.spurs.some(([ax, az, bx, bz]) => segDist(x, z, ax, az, bx, bz) < 0.35)) flowerSpot(island, x, z);
    }
    if (island.strips.length) island.group.add(makeMesh(mergeGeometries(island.strips, false), mat(C.path), false, true));
  });
  const flowerColors = [0xff9fb2, 0xffd166, 0xb8a2ff, 0xffffff];
  const flowerSpots = [];
  islands.forEach((island) => (island.flowers || []).forEach(([x, z]) => {
    for (let k = 0; k < 4; k++) flowerSpots.push([island.cx + x + (random() - 0.5) * 0.3, island.cz + z + (random() - 0.5) * 0.3, k]);
  }));
  flowerColors.forEach((color, ci) => {
    const list = flowerSpots.filter((s) => s[2] % flowerColors.length === ci);
    const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.055, 0), mat(color), list.length);
    list.forEach(([x, z], i) => flowers.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, TOP + 0.06, z)));
    scene.add(flowers);
  });

  // 雲
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const parts = [];
    for (let k = 0; k < 4; k++) {
      const g = new THREE.IcosahedronGeometry(0.9 + random() * 0.7, 1);
      g.translate(k * 1.1 - 1.6 + random() * 0.4, random() * 0.4, random() * 0.6);
      parts.push(g);
    }
    const cloud = makeMesh(mergeGeometries(parts, false), mat(C.white, { flatShading: false, transparent: true, opacity: 0.92 }), false, false);
    cloud.scale.y = 0.55;
    cloud.position.set(-40 + random() * 80, 8 + random() * 3, -48 + random() * 18);
    cloud.userData.speed = 0.25 + random() * 0.3;
    scene.add(cloud);
    clouds.push(cloud);
  }

  // 偶爾有魚跳出海面
  const jumper = makeFish(0xff8a3d);
  jumper.scale.setScalar(1.6);
  jumper.visible = false;
  scene.add(jumper);
  const splash = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.32, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
  splash.rotation.x = -Math.PI / 2;
  scene.add(splash);
  const seaFish = { t: 0, next: 3, from: new THREE.Vector3(), to: new THREE.Vector3(), active: false, splashT: 9 };

  // ---------- 島名牌（可以點） ----------
  islands.forEach((island) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `island-pill island-pill--${island.kind}`;
    if (island.kind === 'jump') {
      const level = LEVELS[island.def.level];
      button.style.setProperty('--level', level.color);
      const stars = document.createElement('span');
      stars.className = 'island-pill__stars';
      stars.textContent = '★'.repeat(level.stars);
      stars.setAttribute('aria-hidden', 'true');
      button.append(stars);
    }
    const name = document.createElement('span');
    name.textContent = island.name;
    button.append(name);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      pickHandlers.forEach((cb) => cb({ type: 'island', id: island.id }));
    });
    const label = new CSS2DObject(button);
    label.position.set(island.labelX ?? 0, island.labelY ?? TOP + 1.6, island.labelZ ?? 0);
    island.group.add(label);
  });

  // ---------- 貓 ----------
  const cats = catData.map((data) => {
    const model = buildCatModel(data);
    scene.add(model.root);
    model.pickables.forEach((m) => pickables.push(m));
    const tagEl = document.createElement('div');
    tagEl.className = 'cat-tag';
    const dot = document.createElement('i');
    dot.style.background = data.coat.body;
    const name = document.createElement('span');
    name.textContent = data.name;
    tagEl.append(dot, name);
    const tag = new CSS2DObject(tagEl);
    tag.position.set(0, 0.68, 0);
    model.root.add(tag);
    const pp = { ...POSES.stand };
    return {
      ...data, model, tag, tagEl, pp,
      pos: new THREE.Vector3(), heading: random() * TAU, targetHeading: 0, hop: 0, moving: false,
      state: 'idle', pose: 'stand', purpose: 'idle', doing: '在島上散步', timer: 1, node: 0, spot: null, reserved: null,
      path: null, pi: 0, pathSpeed: data.speed, onArrive: null, segLen: 0,
      platform: null, charge: 0, crouchFor: 0, crouchAmt: 0, autoPower: 0, byTong: false, jump: null, vy: 0, spinX: 0, spinY: 0, squash: 0,
      podiumSlot: null, gait: random() * TAU, phase: random() * TAU, blink: rand(1, 5), look: 0, nod: 0, nodT: 0,
      tailSide: random() < 0.5 ? -1 : 1, zzz: null, followed: false,
      news: 0, restPose: 'sit', peekT: 0, cheerT: 0, lostMark: null, trick: null, lastPodium: null,
    };
  });

  // ---------- 島上的大人貓：兩腳站著，不參加比賽 ----------
  function makeHelper(data, decorate, tagClass, pickType) {
    const model = buildCatModel(data);
    decorate(model);
    scene.add(model.root);
    model.pickables.forEach((m) => {
      m.userData.pick = { type: pickType };
      pickables.push(m);
    });
    const tagEl = document.createElement('div');
    tagEl.className = `cat-tag ${tagClass}`;
    const name = document.createElement('span');
    name.textContent = data.name;
    tagEl.append(name);
    const tag = new CSS2DObject(tagEl);
    tag.position.set(0, 0.86, 0);
    model.root.add(tag);
    return {
      ...data, model, tag, tagEl, pp: { ...POSES.upright }, bubbleY: 1.12,
      pos: new THREE.Vector3(), heading: 0, targetHeading: 0, hop: 0, moving: false,
      state: 'idle', pose: 'upright', timer: 2.5, node: 0, spot: null,
      path: null, pi: 0, pathSpeed: 1, onArrive: null, segLen: 0, vy: 0, spinX: 0, spinY: 0, squash: 0,
      gait: 0, phase: 1.3, blink: 2, look: 0, nodT: 0, tailSide: 1, followed: false,
    };
  }

  // 貓貓教練：頭上綁頭帶，到處找晃來晃去的貓
  const coach = Object.assign(
    makeHelper({ index: -1, name: '貓貓教練', coat: { label: '教練', body: '#FAF8F3', eye: '#5DAE5A' }, size: 1.12, chubby: 1, speed: 1.2 }, addHeadband, 'cat-tag--coach', 'coach'),
    { purpose: 'patrol', doing: '在島上巡邏', target: null, talkLevel: null, sent: 0, scanT: 0 },
  );

  // 貓貓老師：戴圓眼鏡，站在學習數學島的黑板前，桐桐改錯作業時會提醒她
  const teacher = Object.assign(
    makeHelper({ index: -2, name: '貓貓老師', coat: { label: '老師', body: '#A4A9B1', stripe: '#7F858E', muzzle: '#E6E8EC' }, size: 1.1, chubby: 1.05, speed: 0.8 }, addGlasses, 'cat-tag--teacher', 'teacher'),
    { mode: 'class', timer: 4, sayT: 0, doing: '在學習數學島上課' },
  );
  if (learn.teacherPos) {
    teacher.pos.copy(learn.teacherPos);
    teacher.heading = learn.faceClass;
    teacher.targetHeading = learn.faceClass;
  } else {
    teacher.model.root.visible = false;
  }

  let champions = [];
  function championSlot(cat) {
    const k = champions.indexOf(cat.index);
    return k >= 0 ? k : null;
  }

  // ---------- 找路（Dijkstra） ----------
  function routePoints(from, to) {
    if (from === to) return [];
    const n = nodes.length;
    const dist = new Float64Array(n).fill(Infinity);
    const prev = new Int32Array(n).fill(-1);
    const prevEdge = new Array(n);
    const done = new Uint8Array(n);
    dist[from] = 0;
    for (;;) {
      let u = -1;
      let best = Infinity;
      for (let i = 0; i < n; i++) {
        if (!done[i] && dist[i] < best) {
          best = dist[i];
          u = i;
        }
      }
      if (u < 0 || u === to) break;
      done[u] = 1;
      for (const e of adj[u]) {
        const nd = dist[u] + e.len;
        if (nd < dist[e.to]) {
          dist[e.to] = nd;
          prev[e.to] = u;
          prevEdge[e.to] = e;
        }
      }
    }
    if (prev[to] < 0) return [];
    const edges = [];
    for (let v = to; v !== from; v = prev[v]) edges.push(prevEdge[v]);
    edges.reverse();
    const out = [];
    for (const e of edges) for (let i = 1; i < e.pts.length; i++) out.push(e.pts[i].clone());
    return out;
  }

  function setPath(cat, pts, speed, then) {
    cat.path = pts;
    cat.pi = 0;
    cat.pathSpeed = speed;
    cat.onArrive = then;
    cat.segLen = pts.length ? cat.pos.distanceTo(pts[0]) : 0;
    if (!pts.length) {
      cat.path = null;
      cat.onArrive = null;
      if (then) then();
    }
  }

  function followPath(cat, dt) {
    let move = cat.pathSpeed * dt;
    cat.moving = false;
    while (cat.path && move > 0) {
      const target = cat.path[cat.pi];
      const dx = target.x - cat.pos.x;
      const dy = target.y - cat.pos.y;
      const dz = target.z - cat.pos.z;
      const d = Math.hypot(dx, dy, dz);
      if (d <= move) {
        cat.pos.copy(target);
        move -= d;
        cat.pi += 1;
        cat.hop = 0;
        if (cat.pi >= cat.path.length) {
          const then = cat.onArrive;
          cat.path = null;
          cat.onArrive = null;
          if (then) then();
          return;
        }
        cat.segLen = cat.pos.distanceTo(cat.path[cat.pi]);
        continue;
      }
      cat.pos.x += (dx / d) * move;
      cat.pos.y += (dy / d) * move;
      cat.pos.z += (dz / d) * move;
      if (Math.hypot(dx, dz) > 0.02) cat.targetHeading = Math.atan2(dx, dz);
      const progress = cat.segLen > 0 ? 1 - (d - move) / cat.segLen : 1;
      cat.hop = target.hop ? Math.sin(Math.PI * Math.min(1, Math.max(0, progress))) * 0.24 : 0;
      cat.moving = true;
      move = 0;
    }
  }

  function go(cat, toId, then, { speed = cat.speed, purpose = 'walk', doing = '' } = {}) {
    const pts = [];
    const here = nodes[cat.node];
    if (cat.pos.distanceTo(here.v) > 0.05) {
      const p = here.v.clone();
      if (Math.abs(cat.pos.y - p.y) > 0.05) p.hop = true;
      pts.push(p);
    }
    routePoints(cat.node, toId).forEach((p) => pts.push(p));
    cat.spot = null;
    cat.state = 'walk';
    cat.purpose = purpose;
    if (doing) cat.doing = doing;
    setPath(cat, pts, speed, () => {
      cat.node = toId;
      if (then) then();
    });
  }

  function hopInto(cat, spot, then) {
    const p = spot.pos.clone();
    p.hop = Math.abs(p.y - cat.pos.y) > 0.03 || spot.poses.includes('inbox');
    cat.state = 'walk';
    setPath(cat, [p], Math.min(cat.speed, 0.8), () => {
      cat.spot = spot;
      cat.targetHeading = spot.face;
      then();
    });
  }

  function releaseSpot(cat) {
    if (cat.reserved && cat.reserved.occupant === cat.index) cat.reserved.occupant = null;
    cat.reserved = null;
  }

  function showSleep(cat) {
    if (cat.zzz) return;
    const el = document.createElement('div');
    el.className = 'zzz';
    el.textContent = 'z Z';
    const wrap = document.createElement('div');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.append(el);
    cat.zzz = new CSS2DObject(wrap);
    cat.zzz.position.set(0.12, 0.55, 0);
    cat.model.root.add(cat.zzz);
  }
  function clearSleep(cat) {
    if (!cat.zzz) return;
    cat.model.root.remove(cat.zzz);
    cat.zzz = null;
  }

  function idle(cat, a, b, pose) {
    cat.state = 'idle';
    cat.timer = rand(a, b);
    cat.pose = pose || (cat.sitter ? pickOne(['sit', 'sit', 'groom', 'stand']) : pickOne(['stand', 'stand', 'sit', 'groom']));
    cat.moving = false;
  }

  function islandName(id) {
    return islandById[id] ? islandById[id].name : '';
  }

  // 記一件今天做過的事，貓去日記區時會寫進日記
  function emit(cat, data) {
    cat.news += 1;
    if (hooks.event) hooks.event(cat.index, data);
  }

  // 被叫走之前先把手上的事放下：起床、讓出位子、停止拍手和探頭
  function freeUp(cat) {
    clearSleep(cat);
    releaseSpot(cat);
    cat.cheerT = 0;
    cat.peekT = 0;
  }

  // ---------- 貓要做什麼 ----------
  function decide(cat) {
    // 寫完日記：做過兩件以上的事才交出去，而且全島隔一陣子才收一篇（桐桐在日記區時快一點，做過一件就能寫）
    const watching = focusId === 'diary';
    if (cat.state === 'rest' && cat.spot && cat.spot.kind === 'diary' && cat.news >= (watching ? 1 : 2)
      && clock.elapsedTime - lastDiaryAt > (watching ? 10 : 35)) {
      lastDiaryAt = clock.elapsedTime;
      cat.news = 0;
      if (hooks.diary) hooks.diary(cat.index);
    }
    freeUp(cat);
    clearLost(cat);
    if (show.waiting === cat.index) show.waiting = null;
    if (show.performer === cat.index) show.performer = null;
    cat.byTong = false;
    cat.trick = null;
    cat.spinY = 0;
    if (championSlot(cat) !== null) {
      goPodium(cat);
      return;
    }
    const userPlatform = platforms.find((p) => p.user);
    const lostCount = cats.filter((c) => c.state === 'lost' || c.purpose === 'lost').length;
    const weights = [
      ['jump', 0.36 + 0.4 * cat.sporty + (userPlatform ? 0.3 : 0)],
      ['rest', 0.12 + 0.3 * cat.sleepy],
      ['home', 0.14],
      ['wander', 0.16],
      ['watch', 0.05 + (cat.sporty < 0.25 ? 0.15 : 0)],
      ['box', 0.12],
      ['eat', 0.05],
      ['show', 0.05 + (show.performer !== null ? 0.12 : 0) + (show.user ? 0.1 : 0)],
      ['perform', show.waiting === null ? 0.04 + 0.06 * cat.sporty : 0],
      ['diary', cat.news >= 3 ? 0.12 : 0.02],
      ['lost', lostCount < 2 ? 0.06 : 0],
      ['study', learn.island && inClass(cat) ? 0.25 : 0],
    ];
    let r = random() * weights.reduce((sum, [, w]) => sum + w, 0);
    for (const [kind, w] of weights) {
      r -= w;
      if (r > 0) continue;
      if (kind === 'jump' && goJump(cat)) return;
      if (kind === 'rest' && goSpot(cat, 'rest')) return;
      if (kind === 'home' && goHome(cat)) return;
      if (kind === 'watch' && goSpot(cat, 'watch')) return;
      if (kind === 'box' && goSpot(cat, 'box')) return;
      if (kind === 'eat' && goSpot(cat, 'eat')) return;
      if (kind === 'show' && goSpot(cat, 'audience')) return;
      if (kind === 'perform' && goPerform(cat)) return;
      if (kind === 'diary' && goSpot(cat, 'diary')) return;
      if (kind === 'lost' && goLost(cat)) return;
      if (kind === 'study' && goSpot(cat, 'study')) return;
      break;
    }
    wander(cat);
  }

  // ---------- 晃來晃去、不知道要做什麼的貓：頭上冒問號，等教練來 ----------
  function goLost(cat) {
    const here = nodes[cat.node] && islandById[nodes[cat.node].island];
    const island = here || pickOne(islands);
    const target = pickOne(island.ringNodes);
    go(cat, target, () => {
      cat.state = 'lost';
      cat.lostT = 0;
      cat.coachComing = false;
      cat.waitCoach = false;
      cat.timer = rand(0.3, 1.2);
      cat.lostHome = cat.pos.clone();
      cat.pose = 'stand';
      cat.doing = '晃來晃去，不知道要做什麼';
      markLost(cat, '？');
    }, { purpose: 'lost', doing: `在${island.name}晃來晃去` });
    return true;
  }

  function markLost(cat, text) {
    if (!cat.lostMark) {
      const el = document.createElement('div');
      el.className = 'lost-mark';
      const wrap = document.createElement('div');
      wrap.setAttribute('aria-hidden', 'true');
      wrap.append(el);
      cat.lostMark = new CSS2DObject(wrap);
      cat.lostMark.position.set(0, 1.0, 0);
      cat.model.root.add(cat.lostMark);
    }
    const el = cat.lostMark.element.firstChild;
    el.textContent = text;
    el.classList.toggle('lost-mark--got', text !== '？');
  }

  function clearLost(cat) {
    if (cat.lostMark) {
      cat.lostMark.removeFromParent();
      cat.lostMark = null;
    }
    cat.coachComing = false;
    cat.waitCoach = false;
  }

  function stepLost(cat, dt) {
    cat.lostT += dt;
    if (cat.waitCoach) {
      cat.moving = false;
      cat.pose = 'stand';
      cat.targetHeading = Math.atan2(coach.pos.x - cat.pos.x, coach.pos.z - cat.pos.z);
      return;
    }
    if (!cat.coachComing && cat.lostT > 40) {
      decide(cat);
      return;
    }
    if (cat.path) {
      followPath(cat, dt);
      cat.pose = cat.moving ? 'walk' : 'stand';
      return;
    }
    cat.pose = 'stand';
    cat.moving = false;
    cat.timer -= dt;
    if (cat.timer > 0) return;
    const p = cat.lostHome.clone();
    p.x += rand(-0.45, 0.45);
    p.z += rand(-0.45, 0.45);
    setPath(cat, [p], 0.4, () => {
      cat.timer = rand(0.8, 2.4);
    });
  }

  // 頭上冒出一句話（教練說話、表演的動作名稱、愛心、音符）
  function say(who, text, seconds, className = 'speech') {
    const el = document.createElement('div');
    el.className = className;
    el.textContent = text;
    const wrap = document.createElement('div');
    if (className !== 'speech' && className !== 'trick-tag') wrap.setAttribute('aria-hidden', 'true');
    wrap.append(el);
    const bubble = new CSS2DObject(wrap);
    if (className === 'notes') bubble.position.set(0.32, 0.62, 0);
    else bubble.position.set(0, who.bubbleY || 0.92, 0);
    // 同一隻貓說新的話，舊的泡泡先收掉，免得疊在一起
    if (className === 'speech') {
      if (who.speech) who.speech.removeFromParent();
      who.speech = bubble;
    }
    who.model.root.add(bubble);
    transient.push({ object: bubble, until: clock.elapsedTime + seconds });
  }

  // ---------- 貓貓教練 ----------
  // 看貓的彈力和準度決定叫牠去哪一座；那一座排滿了就換有空位的
  function levelFor(cat) {
    const score = ((cat.spring - 0.86) / 0.14) * 0.5 + ((cat.skill - 0.45) / 0.4) * 0.5;
    const want = score > 0.62 ? 'high' : score > 0.33 ? 'mid' : 'low';
    const room = (p) => p.queueMax - p.queue.length - p.incoming.size;
    if (room(platformById[want]) > 0) return want;
    const other = platforms.filter((p) => room(p) > 0).sort((a, b) => room(b) - room(a))[0];
    return other ? other.level : want;
  }

  function coachNext() {
    coach.target = null;
    const lost = cats.filter((c) => c.state === 'lost' && !c.waitCoach);
    if (lost.length) {
      const cat = lost.reduce((a, b) => (a.pos.distanceTo(coach.pos) <= b.pos.distanceTo(coach.pos) ? a : b));
      coach.target = cat.index;
      cat.coachComing = true;
      go(coach, cat.node, () => coachApproach(cat), { speed: 1.4, purpose: 'coach', doing: `要去找${cat.name}` });
      return;
    }
    const pool = random() < 0.6 ? islands.filter((i) => i.kind === 'jump') : islands;
    go(coach, pickOne(pickOne(pool).ringNodes), () => {
      coach.state = 'idle';
      coach.timer = rand(2.5, 5);
      coach.doing = `在${islandName(nodes[coach.node].island)}看大家`;
    }, { speed: 1.0, purpose: 'patrol', doing: '在島上巡邏，找晃來晃去的貓' });
  }

  function coachApproach(cat) {
    if (cat.state !== 'lost') {
      coachNext();
      return;
    }
    cat.waitCoach = true;
    const dx = coach.pos.x - cat.pos.x;
    const dz = coach.pos.z - cat.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    const p = new THREE.Vector3(cat.pos.x + (d > 0.05 ? dx / d : 0) * 0.55, cat.pos.y, cat.pos.z + (d > 0.05 ? dz / d : 1) * 0.55);
    coach.state = 'walk';
    setPath(coach, [p], 0.9, () => {
      coach.state = 'talk';
      coach.timer = 1.9;
      coach.moving = false;
      coach.targetHeading = Math.atan2(cat.pos.x - coach.pos.x, cat.pos.z - coach.pos.z);
      coach.talkLevel = levelFor(cat);
      say(coach, `去${LEVELS[coach.talkLevel].short}跳臺跳！`, 2.1);
      markLost(cat, '！');
      cat.nodT = 0.7;
      coach.doing = `叫${cat.name}去${LEVELS[coach.talkLevel].name}跳`;
      if (hooks.sound) hooks.sound('whistle', nodes[cat.node].island);
    });
  }

  function updateCoach(dt) {
    if (coach.state === 'walk') {
      followPath(coach, dt);
      coach.pose = coach.moving ? 'uprightWalk' : 'upright';
      return;
    }
    if (coach.state === 'talk') {
      coach.pose = 'point';
      coach.timer -= dt;
      if (coach.timer > 0) return;
      const cat = coach.target !== null ? cats[coach.target] : null;
      if (cat && cat.state === 'lost') {
        const level = coach.talkLevel;
        clearLost(cat);
        emit(cat, { type: 'coach', level });
        coach.sent += 1;
        if (!goJump(cat, platformById[level], true)) decide(cat);
      }
      coach.target = null;
      coach.state = 'idle';
      coach.timer = rand(1, 2);
      return;
    }
    coach.pose = 'upright';
    coach.timer -= dt;
    if (coach.timer <= 0 || cats.some((c) => c.state === 'lost' && !c.coachComing)) coachNext();
  }

  // ---------- 表演區 ----------
  const clonePt = (p) => {
    const q = p.clone();
    q.hop = p.hop;
    return q;
  };

  function goPerform(cat, fast = false) {
    if (show.waiting !== null || !show.island) return false;
    show.waiting = cat.index;
    go(cat, show.waitNode, () => {
      cat.state = 'stageWait';
      cat.pose = cat.sitter ? 'sit' : 'stand';
      cat.targetHeading = -Math.PI / 2;
      cat.doing = '在表演區等著上臺';
    }, { speed: fast ? RUN : cat.speed, purpose: 'perform', doing: '要去表演區表演' });
    return true;
  }

  function audienceCats() {
    return cats.filter((c) => c.state === 'rest' && c.spot && c.spot.kind === 'audience');
  }

  function startPerform(cat) {
    cat.state = 'perform';
    cat.pose = 'stand';
    cat.targetHeading = 0;
    cat.trick = null;
    cat.tricks = [];
    cat.claps = 0;
    cat.leaving = false;
    cat.nextTrick = show.user ? 1.5 : 0.8;
    cat.leaveAt = clock.elapsedTime + (show.user ? 40 : rand(12, 18));
    cat.doing = '在表演區的舞臺上表演';
    audienceCats().forEach((c) => {
      c.doing = `在表演區看${cat.name}表演`;
    });
  }

  function startTrick(cat, name) {
    cat.trick = { name, t: 0, dur: name === 'bow' ? 1.3 : TRICKS[name].dur };
    cat.spinX = 0;
    cat.spinY = 0;
    cat.hop = 0;
    if (name === 'bow') return;
    const label = TRICKS[name].label;
    if (!cat.tricks.includes(label)) cat.tricks.push(label);
    say(cat, `${label}！`, 1.7, 'trick-tag');
    if (name === 'sing') say(cat, '♪ ♫ ♪', 2.6, 'notes');
    cat.doing = `在表演區表演${label}`;
    audienceCats().forEach((c) => {
      c.doing = `在表演區看${cat.name}${label}`;
    });
    if (hooks.sound) hooks.sound(name === 'flip' ? 'boing' : name, 'stage');
  }

  function leaveStage(cat) {
    cat.leaving = false;
    cat.state = 'walk';
    cat.purpose = 'exitStage';
    cat.doing = '表演完，走下舞臺';
    setPath(cat, show.descend.map(clonePt), 0.75, () => {
      cat.node = show.exitNode;
      show.last = cat.index;
      if (show.performer === cat.index) show.performer = null;
      emit(cat, { type: 'perform', tricks: cat.tricks.slice(), claps: cat.claps });
      idle(cat, 1, 2.5, 'stand');
      cat.doing = '剛表演完，好開心';
    });
  }

  function stepPerform(cat, dt) {
    const tr = cat.trick;
    if (tr) {
      tr.t += dt;
      const k = Math.min(1, tr.t / tr.dur);
      if (tr.name === 'spin') {
        cat.pose = 'upright';
        cat.spinY = easeInOut(k) * TAU;
      } else if (tr.name === 'wave') cat.pose = 'wave';
      else if (tr.name === 'flip') {
        cat.pose = k < 0.85 ? 'air' : 'land';
        cat.hop = Math.sin(Math.PI * k) * 0.6;
        cat.spinX = easeInOut(k) * TAU;
      } else if (tr.name === 'sing') cat.pose = 'sing';
      else cat.pose = 'bow';
      if (tr.t < tr.dur) return;
      cat.trick = null;
      cat.spinX = 0;
      cat.spinY = 0;
      cat.hop = 0;
      cat.pose = 'stand';
      if (tr.name === 'flip') cat.squash = 0.8;
      if (tr.name !== 'bow' && random() < 0.55) cheerAudience(false);
      cat.nextTrick = show.user ? 7 : rand(1, 2);
      if (cat.leaving) leaveStage(cat);
      return;
    }
    cat.pose = 'stand';
    cat.targetHeading = 0;
    if (clock.elapsedTime >= cat.leaveAt && !cat.leaving) {
      cat.leaving = true;
      startTrick(cat, 'bow');
      return;
    }
    cat.nextTrick -= dt;
    if (cat.nextTrick <= 0) startTrick(cat, pickOne(TRICK_KEYS));
  }

  // 臺下的貓一起拍手；hearts 為 true 時每隻頭上飄愛心
  function cheerAudience(hearts) {
    const list = audienceCats();
    list.forEach((c) => {
      c.cheerT = rand(1.3, 2);
      if (hearts) say(c, '♥', 1.5, 'heart');
    });
    return list.length;
  }

  function stepShow(dt) {
    if (!show.island) return;
    if (show.performer === null && show.waiting !== null) {
      const cat = cats[show.waiting];
      if (cat.state === 'stageWait') {
        show.waiting = null;
        show.performer = cat.index;
        cat.state = 'walk';
        cat.purpose = 'climbStage';
        cat.doing = '正在走上表演區的舞臺';
        setPath(cat, show.climb.map(clonePt), 0.75, () => startPerform(cat));
      }
    }
    if (!show.user) return;
    show.summonTimer -= dt;
    if (show.summonTimer > 0) return;
    show.summonTimer = 1.5;
    const free = (c) => (c.state === 'idle' || c.state === 'rest') && c.model.root.visible && championSlot(c) === null
      && !(c.spot && (c.spot.kind === 'diary' || c.spot.kind === 'audience'));
    if (show.performer === null && show.waiting === null) {
      // 剛表演完的那隻先休息，換別隻上臺
      const target = nodes[show.waitNode].v;
      const cat = cats.filter((c) => free(c) && c.index !== show.last).sort((a, b) => a.pos.distanceTo(target) - b.pos.distanceTo(target))[0];
      if (cat) {
        freeUp(cat);
        goPerform(cat, true);
      }
    }
    let need = 4 - audienceCats().length - cats.filter((c) => c.state === 'walk' && c.purpose === 'audience').length;
    if (need <= 0) return;
    const list = cats.filter(free).sort((a, b) => a.pos.distanceTo(show.stand) - b.pos.distanceTo(show.stand));
    for (const cat of list) {
      if (need <= 0) break;
      freeUp(cat);
      if (goSpot(cat, 'audience', undefined, RUN)) need -= 1;
    }
  }

  // ---------- 學習數學島：桐桐在改作業時，課桌前至少坐 4 隻貓；老師輪流看黑板、看大家 ----------
  let studyTimer = 0;
  function stepLearn(dt) {
    if (focusId !== 'learn' || !learn.island) return;
    studyTimer -= dt;
    if (studyTimer > 0) return;
    studyTimer = 2;
    const studying = cats.filter((c) => (c.state === 'rest' && c.spot && c.spot.kind === 'study') || (c.state === 'walk' && c.purpose === 'study')).length;
    if (studying >= 4) return;
    const target = learn.teacherPos;
    const free = cats.filter((c) => (c.state === 'idle' || c.state === 'rest') && c.model.root.visible && championSlot(c) === null && inClass(c)
      && !(c.spot && (c.spot.kind === 'diary' || c.spot.kind === 'study')))
      .sort((a, b) => a.pos.distanceTo(target) - b.pos.distanceTo(target));
    if (free[0]) {
      freeUp(free[0]);
      goSpot(free[0], 'study', undefined, RUN);
    }
  }

  function updateTeacher(dt) {
    if (!learn.island) return;
    teacher.moving = false;
    if (teacher.sayT > 0) {
      teacher.sayT -= dt;
      teacher.pose = 'point';
      teacher.targetHeading = learn.faceClass;
      return;
    }
    teacher.timer -= dt;
    if (teacher.mode === 'board') {
      teacher.pose = 'point';
      teacher.targetHeading = learn.faceBoard;
      teacher.doing = '指著黑板上課';
      if (teacher.timer <= 0) {
        teacher.mode = 'class';
        teacher.timer = rand(5, 9);
      }
    } else {
      teacher.pose = 'upright';
      teacher.targetHeading = learn.faceClass;
      teacher.doing = '看大家寫數學作業';
      if (teacher.timer <= 0) {
        teacher.mode = 'board';
        teacher.timer = 2;
      }
    }
  }

  // 老師轉向前面說一句話（桐桐改錯作業時提醒、改對時稱讚）
  function teacherSay(text, seconds = 2.6) {
    if (!learn.island) return;
    say(teacher, text, seconds);
    teacher.sayT = seconds;
    teacher.nodT = 0.7;
  }

  // ---------- 日記區：桐桐在看日記區時，至少要有貓在書桌前寫 ----------
  let diaryTimer = 0;
  let lastDiaryAt = -30;
  function stepDiary(dt) {
    if (focusId !== 'diary') return;
    diaryTimer -= dt;
    if (diaryTimer > 0) return;
    diaryTimer = 2;
    const writing = cats.filter((c) => (c.state === 'rest' && c.spot && c.spot.kind === 'diary') || (c.state === 'walk' && c.purpose === 'diary')).length;
    if (writing >= 2) return;
    const free = cats.filter((c) => (c.state === 'idle' || c.state === 'rest') && c.model.root.visible && championSlot(c) === null && !(c.spot && c.spot.kind === 'diary'))
      .sort((a, b) => b.news - a.news);
    if (free[0]) {
      freeUp(free[0]);
      goSpot(free[0], 'diary', undefined, RUN);
    }
  }

  function wander(cat) {
    const here = nodes[cat.node].island;
    let island = islandById[here];
    if (random() < 0.35) island = pickOne(islands);
    const target = pickOne(island.ringNodes);
    go(cat, target, () => {
      const p = nodes[target].v.clone();
      p.x += (random() - 0.5) * 0.36;
      p.z += (random() - 0.5) * 0.36;
      setPath(cat, [p], cat.speed, () => {
        idle(cat, 2, 6);
        cat.doing = `在${islandName(island.id)}散步`;
      });
    }, { purpose: 'wander', doing: island.id === here ? `在${islandName(here)}散步` : `要去${islandName(island.id)}逛逛` });
  }

  function goJump(cat, prefer = null, fast = false) {
    const options = platforms.filter((p) => p.queue.length + p.incoming.size < p.queueMax);
    if (!options.length) return false;
    let p = prefer && options.includes(prefer) ? prefer : null;
    if (!p) {
      const user = options.find((o) => o.user);
      if (user && random() < 0.6) {
        p = user;
      } else {
        const weight = (o) => (o.level === 'high' ? 0.6 + cat.sporty : o.level === 'mid' ? 1 : 1.3 - cat.sporty * 0.6) / (1 + o.queue.length + o.incoming.size);
        let r = random() * options.reduce((sum, o) => sum + weight(o), 0);
        p = options.find((o) => (r -= weight(o)) <= 0) || options[0];
      }
    }
    p.incoming.add(cat.index);
    cat.platform = p.id;
    go(cat, p.queueNode, () => {
      p.incoming.delete(cat.index);
      if (championSlot(cat) !== null) {
        goPodium(cat);
        return;
      }
      p.queue.push(cat.index);
      cat.state = 'queue';
      cat.doing = `在${p.name}排隊`;
    }, { speed: fast ? RUN : cat.speed, purpose: 'jump', doing: fast ? `跑去${p.name}排隊` : `要去${p.name}排隊` });
    return true;
  }

  const GO_DOING = {
    watch: (name) => `要去${name}看比賽`,
    box: (name) => `要去${name}躲紙箱`,
    eat: (name) => `要去${name}吃東西`,
    audience: () => '要去表演區看表演',
    diary: () => '要去日記區寫日記',
    study: () => '要去學習數學島寫作業',
  };

  function goSpot(cat, kind, filter = () => true, speed = cat.speed) {
    const free = spots.filter((s) => s.kind === kind && s.occupant === null && filter(s));
    if (!free.length) return false;
    const spot = pickOne(free);
    spot.occupant = cat.index;
    cat.reserved = spot;
    go(cat, spot.node, () => hopInto(cat, spot, () => settle(cat, spot)), {
      speed,
      purpose: kind,
      doing: (GO_DOING[kind] || ((name) => `要去${name}休息`))(islandName(spot.island)),
    });
    return true;
  }

  function settle(cat, spot) {
    let pose = pickOne(spot.poses);
    if (spot.poses.includes('sleep') && random() < cat.sleepy) pose = 'sleep';
    cat.pose = pose;
    cat.restPose = pose;
    cat.state = 'rest';
    cat.doing = pose === 'sleep' && !spot.doing.includes('睡') ? spot.doing.replace('休息', '睡覺') : spot.doing;
    if (spot.kind === 'audience') cat.doing = show.performer !== null ? `在表演區看${cats[show.performer].name}表演` : '在表演區等表演開始';
    const base = spot.kind === 'watch' ? rand(8, 16)
      : pose === 'eat' ? rand(4, 8)
        : spot.kind === 'audience' ? rand(10, 18)
          : spot.kind === 'diary' ? rand(7, 11)
            : spot.kind === 'study' ? rand(10, 16)
            : spot.kind === 'box' ? rand(8, 18)
              : rand(12, 26) * (0.7 + cat.sleepy);
    cat.timer = base;
    if (pose === 'sleep') showSleep(cat);
    if (spot.event && !(spot.event.type === 'sleep' && pose !== 'sleep')) emit(cat, { ...spot.event, slept: pose === 'hide' && cat.sleepy > 0.6 });
    if (spot.kind === 'audience') emit(cat, { type: 'watch', performer: show.performer !== null ? cats[show.performer].name : null });
  }

  function goHome(cat) {
    if (random() < 0.3 && homeDoor) {
      go(cat, homeDoor.node, () => {
        setPath(cat, [homeDoor.inside.clone()], cat.speed, () => {
          cat.state = 'inside';
          cat.timer = rand(6, 16);
          cat.model.root.visible = false;
          cat.doing = '躲在貓貓之家裡面';
        });
      }, { purpose: 'home', doing: '要回貓貓之家' });
      return true;
    }
    return goSpot(cat, 'home');
  }

  function leaveHouse(cat) {
    cat.model.root.visible = true;
    cat.state = 'walk';
    cat.doing = '從貓貓之家走出來';
    setPath(cat, [nodes[homeDoor.node].v.clone()], cat.speed, () => {
      cat.node = homeDoor.node;
      idle(cat, 1, 3);
    });
  }

  function goPodium(cat) {
    const k = championSlot(cat);
    if (k === null) {
      decide(cat);
      return;
    }
    const spot = podiumSpots[k];
    cat.podiumSlot = k;
    go(cat, spot.node, () => hopInto(cat, spot, () => {
      cat.state = 'podium';
      cat.pose = k === 0 ? 'proud' : 'sit';
      cat.doing = `站在頒獎臺上（第 ${k + 1} 名）`;
      if (cat.lastPodium !== k) {
        cat.lastPodium = k;
        emit(cat, { type: 'podium', rank: k + 1 });
      }
    }), { speed: Math.max(cat.speed, 1.5), purpose: 'podium', doing: '跑去頒獎臺領獎' });
  }

  // 一打開島時，上一次留下來的前三名直接站在頒獎臺上
  function placeOnPodium(cat, k) {
    clearSleep(cat);
    releaseSpot(cat);
    clearLost(cat);
    if (show.waiting === cat.index) show.waiting = null;
    const p = cat.platform ? platformById[cat.platform] : null;
    if (p) {
      p.queue = p.queue.filter((i) => i !== cat.index);
      p.incoming.delete(cat.index);
      if (p.ready === cat.index) p.ready = null;
      if (p.climber === cat.index) p.climber = null;
      if (p.charging === cat.index) p.charging = null;
    }
    const spot = podiumSpots[k];
    cat.model.root.visible = true;
    cat.path = null;
    cat.onArrive = null;
    cat.platform = null;
    cat.node = spot.node;
    cat.pos.copy(spot.pos);
    cat.spot = spot;
    cat.podiumSlot = k;
    cat.state = 'podium';
    cat.pose = k === 0 ? 'proud' : 'sit';
    cat.heading = 0;
    cat.targetHeading = 0;
    cat.hop = 0;
    cat.doing = `站在頒獎臺上（第 ${k + 1} 名）`;
    Object.assign(cat.pp, POSES[cat.pose]);
  }

  function stepPodium(cat) {
    const k = championSlot(cat);
    if (k === cat.podiumSlot) return;
    cat.podiumSlot = null;
    if (k === null) decide(cat);
    else goPodium(cat);
  }

  function afterJump(cat) {
    cat.byTong = false;
    cat.platform = null;
    if (championSlot(cat) !== null) {
      goPodium(cat);
      return;
    }
    if (random() < 0.3 * (0.5 + cat.sporty) && goJump(cat)) return;
    idle(cat, 1, 2.5, 'stand');
    cat.doing = '剛跳完，喘口氣';
  }

  // ---------- 跳臺 ----------
  function stepQueue(cat, dt) {
    const p = platformById[cat.platform];
    const k = p ? p.queue.indexOf(cat.index) : -1;
    if (k < 0) {
      decide(cat);
      return;
    }
    const slot = p.slots[Math.min(k, p.slots.length - 1)];
    const dx = slot.x - cat.pos.x;
    const dz = slot.z - cat.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.02) {
      const step = Math.min(d, 0.75 * dt);
      cat.pos.x += (dx / d) * step;
      cat.pos.z += (dz / d) * step;
      cat.pos.y = slot.y;
      cat.targetHeading = Math.atan2(dx, dz);
      cat.pose = 'walk';
      cat.moving = true;
    } else {
      const ahead = k === 0 ? p.rampBase : p.slots[k - 1];
      cat.targetHeading = Math.atan2(ahead.x - cat.pos.x, ahead.z - cat.pos.z);
      cat.pose = cat.sitter ? 'sit' : 'stand';
      cat.moving = false;
    }
  }

  function stepPlatform(p, dt) {
    if (p.climber === null && p.ready === null && p.queue.length) {
      const front = cats[p.queue[0]];
      if (front.state === 'queue' && front.pos.distanceTo(p.slots[0]) < 0.06) {
        p.queue.shift();
        p.climber = front.index;
        front.state = 'walk';
        front.purpose = 'climb';
        front.doing = `正在爬上${p.name}`;
        setPath(front, [p.rampBase.clone(), p.rampTop.clone(), p.tipStand.clone()], 0.62, () => {
          p.climber = null;
          p.ready = front.index;
          front.state = 'ready';
          front.pose = 'wiggle';
          front.targetHeading = Math.PI / 2;
          front.timer = rand(0.7, 1.4);
          front.doing = `站在${p.name}上準備跳`;
        });
      }
    }
    // 跳板蓄力時往下壓、跳出去後彈一彈；軟墊被壓扁再回來
    let dip = 0;
    if (p.charging !== null || (p.ready !== null && cats[p.ready].state === 'crouch')) {
      dip = 0.16 * cats[p.ready].crouchAmt;
    }
    p.kickT += dt;
    const wobble = p.kick * Math.exp(-p.kickT * 4.5) * Math.cos(p.kickT * 24) * 0.2;
    p.boardPivot.rotation.z = -(dip + wobble);
    p.squash = damp(p.squash, 0, 5, dt);
    p.cushion.scale.set(1 + p.squash * 0.12, 0.55 * (1 - p.squash * 0.4), 1 + p.squash * 0.12);
    if (p.user) {
      p.summonTimer -= dt;
      if (p.summonTimer <= 0) {
        p.summonTimer = 1.2;
        summon(p);
      }
    }
  }

  function summon(p) {
    const have = p.queue.length + p.incoming.size + (p.climber !== null ? 1 : 0) + (p.ready !== null ? 1 : 0);
    let need = Math.min(3, p.queueMax) - have;
    if (need <= 0) return;
    const target = nodes[p.queueNode].v;
    const free = cats.filter((c) => (c.state === 'idle' || c.state === 'rest') && c.model.root.visible && championSlot(c) === null && !(c.spot && c.spot.kind === 'diary'))
      .sort((a, b) => a.pos.distanceTo(target) - b.pos.distanceTo(target));
    for (const cat of free) {
      if (need <= 0) break;
      freeUp(cat);
      if (goJump(cat, p, true)) need -= 1;
    }
  }

  function stepReady(cat, dt) {
    const p = platformById[cat.platform];
    cat.pose = 'wiggle';
    cat.targetHeading = Math.PI / 2;
    if (p.user) return;
    cat.timer -= dt;
    if (cat.timer > 0) return;
    cat.state = 'crouch';
    cat.charge = 0;
    cat.byTong = false;
    cat.autoPower = autoPower(cat.skill, random(), random());
    cat.crouchFor = 0.45 + cat.autoPower * 0.7;
    cat.crouchAmt = 0;
  }

  function stepCrouch(cat, dt) {
    const p = platformById[cat.platform];
    cat.charge += dt;
    cat.pose = 'crouch';
    if (cat.byTong) {
      cat.crouchAmt = meterAt(p.level, cat.charge);
      return;
    }
    cat.crouchAmt = Math.min(1, cat.charge / cat.crouchFor) * cat.autoPower;
    if (cat.charge >= cat.crouchFor) launch(cat, p, cat.autoPower);
  }

  function launch(cat, p, power) {
    const peak = peakHeight(p.level, power, cat.spring, random());
    const vy = Math.sqrt(2 * GRAVITY * Math.max(0.01, peak - p.H));
    const T = (vy + Math.sqrt(vy * vy + 2 * GRAVITY * (p.H - p.cushionTop))) / GRAVITY;
    cat.jump = {
      t: 0, T, vy, H: p.H, from: p.tipStand.clone(), to: p.landTop.clone(), peakAt: vy / GRAVITY, peakDone: false,
      cm: toCm(peak), peak, perfect: power >= PERFECT, tong: cat.byTong,
    };
    cat.state = 'air';
    cat.pose = 'air';
    cat.doing = `正在${p.name}上跳！`;
    p.ready = null;
    p.charging = null;
    p.kick = 1;
    p.kickT = 0;
    if (hooks.sound) hooks.sound('boing', p.id);
  }

  function stepAir(cat, dt) {
    const p = platformById[cat.platform];
    const j = cat.jump;
    j.t += dt;
    const t = Math.min(j.t, j.T);
    const k = t / j.T;
    cat.pos.x = j.from.x + (j.to.x - j.from.x) * k;
    cat.pos.z = j.from.z + (j.to.z - j.from.z) * k;
    cat.pos.y = TOP + j.H + j.vy * t - 0.5 * GRAVITY * t * t;
    cat.vy = j.vy - GRAVITY * t;
    cat.spinX = j.perfect ? easeInOut(k) * TAU : 0;
    if (!j.peakDone && j.t >= j.peakAt) {
      j.peakDone = true;
      const info = { cat: cat.index, level: p.level, cm: j.cm, tong: j.tong, perfect: j.perfect, platform: p.id };
      const judge = (hooks.onJump && hooks.onJump(info)) || {};
      showPeak(cat, p, j, judge);
      emit(cat, { type: 'jump', level: p.level, cm: j.cm, perfect: j.perfect, tong: j.tong, record: !!(judge.island || judge.platform) });
    }
    if (j.t >= j.T) {
      cat.pos.copy(p.landTop);
      cat.spinX = 0;
      cat.state = 'land';
      cat.pose = 'land';
      cat.squash = 1;
      cat.timer = 0.55;
      p.squash = 1;
      cat.doing = `剛落在${p.name}的軟墊上`;
      if (hooks.sound) hooks.sound('land', p.id);
    }
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function leaveCushion(cat) {
    const p = platformById[cat.platform];
    const down = p.exitHop.clone();
    down.hop = true;
    cat.state = 'walk';
    cat.purpose = 'exit';
    setPath(cat, [down, nodes[p.exitNode].v.clone()], cat.speed, () => {
      cat.node = p.exitNode;
      afterJump(cat);
    });
  }

  // 跳到最高點時浮出的高度數字，粉紅箭頭也滑到身高尺上那一格
  const transient = [];
  function showPeak(cat, p, j, judge) {
    const el = document.createElement('div');
    el.className = 'peak-tag';
    if (judge.island) el.classList.add('peak-tag--island');
    else if (judge.platform) el.classList.add('peak-tag--record');
    const num = document.createElement('b');
    num.textContent = String(j.cm);
    const unit = document.createElement('span');
    unit.textContent = '公分';
    el.append(num, unit);
    if (judge.island || judge.platform) {
      const note = document.createElement('em');
      note.textContent = judge.island ? '全島新紀錄' : '新紀錄';
      el.prepend(note);
    } else if (j.perfect) {
      const note = document.createElement('em');
      note.textContent = '完美！';
      el.prepend(note);
    }
    // CSS2D 每一幀都會改外層的 transform，動畫放在內層
    const wrap = document.createElement('div');
    wrap.append(el);
    const label = new CSS2DObject(wrap);
    label.position.set(cat.pos.x, cat.pos.y + 0.75, cat.pos.z);
    scene.add(label);
    transient.push({ object: label, until: clock.elapsedTime + 2.6 });
    p.marker.visible = true;
    p.marker.position.y = j.peak;
    p.markerEl.textContent = String(j.cm);
  }

  // ---------- 每一幀的貓 ----------
  function updateCat(cat, dt) {
    switch (cat.state) {
      case 'walk':
        followPath(cat, dt);
        if (cat.moving) cat.pose = cat.pathSpeed > 1.3 ? 'run' : 'walk';
        break;
      case 'idle':
      case 'rest':
        // 被點到的紙箱貓探頭出來；臺下的觀眾拍手
        if (cat.peekT > 0) {
          cat.peekT -= dt;
          cat.pose = cat.peekT > 0 ? 'sit' : cat.restPose;
        }
        if (cat.cheerT > 0) {
          cat.cheerT -= dt;
          cat.pose = cat.cheerT > 0 ? 'cheer' : cat.restPose;
        }
        cat.timer -= dt;
        if (cat.timer <= 0) decide(cat);
        break;
      case 'lost':
        stepLost(cat, dt);
        break;
      case 'perform':
        stepPerform(cat, dt);
        break;
      case 'inside':
        cat.timer -= dt;
        if (cat.timer <= 0) leaveHouse(cat);
        break;
      case 'queue':
        stepQueue(cat, dt);
        break;
      case 'ready':
        stepReady(cat, dt);
        break;
      case 'crouch':
        stepCrouch(cat, dt);
        break;
      case 'air':
        stepAir(cat, dt);
        break;
      case 'land':
        cat.timer -= dt;
        if (cat.timer <= 0) leaveCushion(cat);
        break;
      case 'podium':
        stepPodium(cat);
        break;
      default:
        break;
    }
  }

  function applyPose(cat, dt, t) {
    const target = POSES[cat.pose] || POSES.stand;
    const pp = cat.pp;
    const k = 1 - Math.exp(-dt * (cat.state === 'air' ? 16 : 9));
    for (const key of POSE_KEYS) pp[key] += (target[key] - pp[key]) * k;
    const m = cat.model;
    const running = cat.pose === 'run';
    if (pp.swing > 0.05 && (cat.moving || cat.pose === 'walk' || running)) cat.gait += dt * (running ? 14 : 9.5);
    const s = Math.sin(cat.gait);
    const swing = cat.moving ? pp.swing : pp.swing * 0.2;
    const legs = [
      pp.front + swing * s,
      pp.front + swing * (running ? s : -s),
      pp.rear - swing * s,
      pp.rear + swing * (running ? -s : s),
    ];
    if (cat.pose === 'groom') legs[1] = -1.25 + Math.sin(t * 7 + cat.phase) * 0.15;
    // 揮手、指方向、寫日記、拍手：前腳另外擺
    let clap = 0;
    if (cat.pose === 'wave') legs[0] = -1.55 + Math.sin(t * 9 + cat.phase) * 0.45;
    else if (cat.pose === 'point') legs[1] = 0.15;
    else if (cat.pose === 'write') legs[1] = -0.55 + Math.sin(t * 11 + cat.phase) * 0.12;
    else if (cat.pose === 'cheer') {
      legs[0] = -0.85;
      legs[1] = -0.85;
      clap = 0.22 + Math.sin(t * 16 + cat.phase) * 0.2;
    }
    m.legs.forEach((leg, i) => {
      leg.rotation.x = legs[i];
      leg.rotation.z = i === 0 ? clap : i === 1 ? -clap : 0;
      leg.scale.y = i < 2 ? pp.lf : pp.lr;
    });
    const bob = swing * Math.abs(Math.sin(cat.gait)) * 0.03;
    m.rig.position.set(0, RIG_Y + pp.lift + bob, RIG_Z);
    let pitch = pp.pitch + (running && cat.moving ? Math.sin(cat.gait) * 0.12 : 0);
    if (cat.state === 'air') pitch = Math.max(-0.55, Math.min(0.55, -cat.vy * 0.09));
    m.rig.rotation.x = pitch;
    m.rig.rotation.z = pp.wiggle * Math.sin(t * 15 + cat.phase) * 0.09;
    const looking = cat.pose === 'stand' || cat.pose === 'sit' || cat.pose === 'proud' || cat.pose === 'upright';
    cat.look = damp(cat.look, looking ? Math.sin(t * 0.45 + cat.phase) * 0.45 : 0, 3, dt);
    if (cat.nodT > 0) cat.nodT -= dt;
    const nod = cat.nodT > 0 ? -Math.sin((cat.nodT / 0.7) * Math.PI) * 0.45 : 0;
    const eatBob = cat.pose === 'eat' ? Math.abs(Math.sin(t * 6 + cat.phase)) * 0.15 : 0;
    const groomBob = cat.pose === 'groom' ? Math.sin(t * 7 + cat.phase) * 0.1 : 0;
    const writeBob = cat.pose === 'write' ? Math.sin(t * 2.4 + cat.phase) * 0.06 : 0;
    const singSway = cat.pose === 'sing' ? Math.sin(t * 3.2 + cat.phase) * 0.25 : 0;
    m.head.rotation.set(pp.hp + eatBob + groomBob + writeBob + nod, pp.hy * cat.tailSide + cat.look, pp.hr * cat.tailSide + singSway);
    const wag = Math.sin(t * 2.6 + cat.phase);
    const side = pp.side * cat.tailSide;
    m.tail[0].rotation.set(pp.tail, 0, side * 0.35 + pp.wag * wag);
    m.tail[1].rotation.set(pp.t2, 0, side * 0.6 + pp.wag * Math.sin(t * 2.6 + cat.phase - 0.7));
    m.tail[2].rotation.set(pp.t3, 0, side * 0.7 + pp.wag * Math.sin(t * 2.6 + cat.phase - 1.4) * 1.3);
    cat.blink -= dt;
    if (cat.blink < 0) cat.blink = rand(2, 6);
    m.eyes.scale.y = Math.max(0.08, pp.eye * (cat.blink < 0.12 ? 0.1 : 1));
    cat.squash = damp(cat.squash, 0, 7, dt);
    const breathe = cat.pose === 'sleep' || cat.pose === 'loaf' ? Math.sin(t * 2.2 + cat.phase) * 0.025 : 0;
    m.spin.rotation.x = cat.spinX;
    m.spin.scale.set(1 + cat.squash * 0.25, 1 - cat.squash * 0.32 + breathe, 1 + cat.squash * 0.25);
    cat.heading = dampAngle(cat.heading, cat.targetHeading, 10, dt);
    m.root.position.set(cat.pos.x, cat.pos.y + cat.hop, cat.pos.z);
    m.root.rotation.y = cat.heading + cat.spinY;
  }

  // ---------- 開場：每座跳臺一隻在跳板上、兩隻排隊，其他的散在各島 ----------
  (function seedCats() {
    const order = cats.map((c) => c.index).sort(() => random() - 0.5);
    let i = 0;
    platforms.forEach((p) => {
      const top = cats[order[i++]];
      top.platform = p.id;
      top.node = p.exitNode;
      top.pos.copy(p.tipStand);
      top.state = 'ready';
      top.pose = 'wiggle';
      top.targetHeading = Math.PI / 2;
      top.heading = Math.PI / 2;
      top.timer = rand(0.8, 3);
      top.doing = `站在${p.name}上準備跳`;
      p.ready = top.index;
      for (let k = 0; k < 2; k++) {
        const q = cats[order[i++]];
        q.platform = p.id;
        q.node = p.queueNode;
        p.queue.push(q.index);
        q.pos.copy(p.slots[k]);
        q.state = 'queue';
        q.doing = `在${p.name}排隊`;
      }
    });
    // 表演區一開始就有一隻貓在臺上
    if (show.island) {
      const star = cats[order[i++]];
      star.node = show.exitNode;
      star.pos.copy(show.stand);
      star.heading = 0;
      show.performer = star.index;
      startPerform(star);
    }
    const ringAll = islands.flatMap((island) => island.ringNodes);
    while (i < order.length) {
      const cat = cats[order[i++]];
      const free = spots.filter((s) => s.occupant === null);
      if (random() < 0.5 && free.length) {
        const spot = pickOne(free);
        spot.occupant = cat.index;
        cat.reserved = spot;
        cat.spot = spot;
        cat.node = spot.node;
        cat.pos.copy(spot.pos);
        cat.heading = spot.face;
        cat.targetHeading = spot.face;
        settle(cat, spot);
        cat.timer = rand(3, 18);
      } else {
        const node = pickOne(ringAll);
        cat.node = node;
        cat.pos.copy(nodes[node].v);
        cat.pos.x += (random() - 0.5) * 0.3;
        cat.pos.z += (random() - 0.5) * 0.3;
        idle(cat, 0.5, 6);
        cat.doing = `在${islandName(nodes[node].island)}散步`;
      }
    }
    cats.forEach((cat) => {
      Object.assign(cat.pp, POSES[cat.pose] || POSES.stand);
      if (cat.state !== 'ready') cat.targetHeading = cat.heading;
    });
    coach.node = pickOne(islandById.home.ringNodes);
    coach.pos.copy(nodes[coach.node].v);
  })();

  // ---------- 鏡頭 ----------
  const marker = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.035, 8, 28), new THREE.MeshBasicMaterial({ color: C.ink }));
  marker.rotation.x = Math.PI / 2;
  marker.visible = false;
  scene.add(marker);

  let flight = null;
  function startFlight(position, target, duration = FLY_MS, follow = null) {
    if (reducedMotion) {
      camera.position.copy(position);
      controls.target.copy(target);
      controls.update();
      flight = null;
      return;
    }
    flight = { start: performance.now(), duration, fromPosition: camera.position.clone(), fromTarget: controls.target.clone(), toPosition: position, toTarget: target, follow };
  }

  // insets：介面浮層在畫面上佔掉的像素，讓目標落在剩下可見區的中間
  function framedShift(offset, insets = {}) {
    const up = new THREE.Vector3(0, 1, 0);
    const forward = offset.clone().negate().normalize();
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();
    const camUp = new THREE.Vector3().crossVectors(right, forward).normalize();
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    const left = Math.min(Math.max(0, insets.left || 0), width * 0.7);
    const bottom = Math.min(Math.max(0, insets.bottom || 0), height * 0.7);
    const top = Math.min(Math.max(0, insets.top || 0), height * 0.5);
    const halfH = offset.length() * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const halfW = halfH * camera.aspect;
    return new THREE.Vector3()
      .addScaledVector(right, -(left / width) * halfW)
      .addScaledVector(camUp, -((bottom - top) / height) * halfH);
  }

  let mode = 'overview';
  let focusId = 'overview';
  let followed = null;
  let lastFollow = null;

  function clearFollow() {
    if (followed) {
      followed.followed = false;
      followed.tagEl.classList.remove('cat-tag--strong');
    }
    followed = null;
    lastFollow = null;
    marker.visible = false;
  }

  function setUser(p, on) {
    if (p.user === on) return;
    p.user = on;
    p.summonTimer = 0;
    if (!on) {
      if (p.charging !== null) {
        const cat = cats[p.charging];
        launch(cat, p, meterAt(p.level, cat.charge));
      } else if (p.ready !== null && cats[p.ready].state === 'ready') {
        cats[p.ready].timer = rand(0.4, 1);
      }
    }
  }

  function focus(id, insets = {}) {
    clearFollow();
    focusId = id;
    platforms.forEach((p) => setUser(p, p.id === id));
    show.user = id === 'stage';
    show.summonTimer = 0;
    diaryTimer = 0;
    studyTimer = 0;
    // 桐桐來看表演時，臺上那隻多待一會兒，等她按動作
    if (show.user && show.performer !== null && cats[show.performer].state === 'perform') {
      cats[show.performer].leaveAt = Math.max(cats[show.performer].leaveAt, clock.elapsedTime + 40);
    }
    const island = islandById[id];
    if (!island) {
      mode = 'overview';
      focusId = 'overview';
      startFlight(overview.position.clone(), overview.target.clone());
      return;
    }
    mode = id;
    const halfV = THREE.MathUtils.degToRad(camera.fov / 2);
    const visibleH = Math.max(0.3, 1 - ((insets.bottom || 0) + (insets.top || 0)) / Math.max(1, container.clientHeight));
    const visibleW = Math.max(0.3, 1 - (insets.left || 0) / Math.max(1, container.clientWidth));
    const halfH = Math.atan(Math.tan(halfV) * camera.aspect * visibleW);
    const halfVv = Math.atan(Math.tan(halfV) * visibleH);
    let target;
    let offset;
    if (island.kind === 'jump') {
      const p = platformById[id];
      const distance = Math.max((p.span / 2) / Math.tan(halfH), ((p.maxM + 2.2) / 2) / Math.tan(halfVv)) * 1.08;
      offset = new THREE.Vector3(0.12, 0.34, 1).normalize().multiplyScalar(distance);
      target = p.center.clone();
    } else if (island.kind === 'learn') {
      // 從課桌後面看黑板和老師
      const distance = Math.max(3.9 / Math.tan(halfH), 2.3 / Math.tan(halfVv)) * 1.05;
      offset = new THREE.Vector3(0.06, 0.72, 1).normalize().multiplyScalar(distance);
      target = W(island, 0.1, TOP + 0.75, -0.35);
    } else if (island.kind === 'stage') {
      // 從觀眾席後面看舞臺
      const distance = Math.max(3.1 / Math.tan(halfH), 1.9 / Math.tan(halfVv)) * 1.05;
      offset = new THREE.Vector3(0.08, 0.5, 1).normalize().multiplyScalar(distance);
      target = W(island, 0, TOP + 0.75, -0.35);
    } else {
      // 新加的島比較長，用最遠的角來算，整座島才放得進畫面
      const far = Math.max(...island.local.map((p) => Math.hypot(p.x, p.z)));
      const reach = (['boxes', 'diary', 'combo'].includes(island.kind) ? far * 0.82 : island.radius * 0.85) + 0.6;
      const distance = Math.max(reach / Math.tan(halfH), (reach * 0.8) / Math.tan(halfVv)) * 1.05;
      offset = new THREE.Vector3(0.2, 0.85, 1).normalize().multiplyScalar(distance);
      target = new THREE.Vector3(island.cx, TOP + (island.kind === 'home' || island.kind === 'rank' ? 1.0 : 0.4), island.cz);
    }
    target.add(framedShift(offset, insets));
    startFlight(target.clone().add(offset), target);
  }

  // index 是貓的編號，或 'coach' 跟著教練
  function follow(index, insets = {}) {
    const cat = index === 'coach' ? coach : cats[index];
    if (!cat) return false;
    clearFollow();
    platforms.forEach((p) => setUser(p, false));
    show.user = false;
    focusId = 'follow';
    cat.followed = true;
    cat.tagEl.classList.add('cat-tag--strong');
    followed = cat;
    marker.visible = true;
    mode = 'follow';
    const offset = new THREE.Vector3(0, 3.6, 5.2);
    const shift = framedShift(offset, insets);
    const target = cat.pos.clone().add(shift);
    startFlight(target.clone().add(offset), target, FLY_MS, { offset, shift });
    return true;
  }

  // ---------- 點選 ----------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt = null;
  function onPointerDown(event) {
    downAt = { x: event.clientX, y: event.clientY };
  }
  function onPointerUp(event) {
    if (!downAt || Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y) > 8) return;
    downAt = null;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(pickables, false).find((h) => h.object.visible && (h.object.userData.pick.type !== 'cat' || cats[h.object.userData.pick.index].model.root.visible));
    // 直接點到貓、教練、老師、黑板或講台就算數；黑板、講台不用讓給旁邊的貓
    if (hit && ['cat', 'coach', 'teacher', 'board', 'podium'].includes(hit.object.userData.pick.type)) {
      pickHandlers.forEach((cb) => cb(hit.object.userData.pick));
      return;
    }
    // 小朋友的手指點不準：鏡頭夠近時，點在貓旁邊 36 像素內也算點到牠
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    let near = null;
    let nearest = 36;
    for (const cat of cats.concat([coach, teacher])) {
      if (!cat.model.root.visible || camera.position.distanceTo(cat.pos) > 26) continue;
      screenPoint.set(cat.pos.x, cat.pos.y + cat.hop + 0.25 * cat.size, cat.pos.z).project(camera);
      if (screenPoint.z > 1) continue;
      const d = Math.hypot(((screenPoint.x + 1) / 2) * rect.width - px, ((1 - screenPoint.y) / 2) * rect.height - py);
      if (d < nearest) {
        nearest = d;
        near = cat;
      }
    }
    const pick = near ? (near === coach ? { type: 'coach' } : near === teacher ? { type: 'teacher' } : { type: 'cat', index: near.index }) : hit && hit.object.userData.pick;
    if (pick) pickHandlers.forEach((cb) => cb(pick));
  }
  const screenPoint = new THREE.Vector3();
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);

  // ---------- 主迴圈 ----------
  let frame = 0;
  function render(now) {
    frame = requestAnimationFrame(render);
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    platforms.forEach((p) => stepPlatform(p, dt));
    stepShow(dt);
    stepDiary(dt);
    stepLearn(dt);
    for (const cat of cats) {
      updateCat(cat, dt);
      applyPose(cat, dt, t);
    }
    updateCoach(dt);
    applyPose(coach, dt, t);
    updateTeacher(dt);
    applyPose(teacher, dt, t);
    // 整隻躲起來的貓，紙箱偶爾會晃一晃
    boxSpots.forEach((spot) => {
      const cat = spot.occupant !== null ? cats[spot.occupant] : null;
      const hiding = !reducedMotion && cat && cat.spot === spot && cat.state === 'rest' && cat.pose === 'hide';
      const wobble = hiding && Math.sin(t * 0.8 + spot.index) > 0.72 ? Math.sin(t * 22) * 0.07 : 0;
      spot.box.rotation.z = damp(spot.box.rotation.z, wobble, 14, dt);
    });
    if (flight) {
      const k = Math.min(1, (now - flight.start) / flight.duration);
      const e = easeOutQuart(k);
      if (flight.follow && followed) {
        flight.toTarget = followed.pos.clone().add(flight.follow.shift);
        flight.toPosition = flight.toTarget.clone().add(flight.follow.offset);
      }
      camera.position.lerpVectors(flight.fromPosition, flight.toPosition, e);
      controls.target.lerpVectors(flight.fromTarget, flight.toTarget, e);
      if (k >= 1) {
        flight = null;
        lastFollow = followed ? followed.pos.clone() : null;
      }
    } else if (followed && lastFollow) {
      const dx = followed.pos.x - lastFollow.x;
      const dy = followed.pos.y - lastFollow.y;
      const dz = followed.pos.z - lastFollow.z;
      camera.position.x += dx;
      camera.position.y += dy;
      camera.position.z += dz;
      controls.target.x += dx;
      controls.target.y += dy;
      controls.target.z += dz;
      lastFollow.copy(followed.pos);
    }
    if (followed) marker.position.set(followed.pos.x, followed.pos.y + 0.02, followed.pos.z);
    // 名牌：鏡頭近才出現；正在跳臺上的貓、被跟著的貓一定顯示
    const focusPlatform = platformById[focusId];
    for (const cat of cats) {
      const onStage = focusPlatform && cat.platform === focusPlatform.id && ['ready', 'crouch', 'air', 'land'].includes(cat.state);
      const performing = focusId === 'stage' && show.performer === cat.index;
      cat.tag.visible = cat.model.root.visible && (cat.followed || onStage || performing || camera.position.distanceTo(cat.pos) < TAG_DISTANCE);
      if (cat.zzz) cat.zzz.visible = cat.tag.visible;
    }
    coach.tag.visible = coach.followed || camera.position.distanceTo(coach.pos) < TAG_DISTANCE * 1.4;
    teacher.tag.visible = teacher.model.root.visible && camera.position.distanceTo(teacher.pos) < TAG_DISTANCE * 1.4;
    for (let i = transient.length - 1; i >= 0; i--) {
      if (t > transient[i].until) {
        transient[i].object.removeFromParent();
        transient.splice(i, 1);
      }
    }
    kois.forEach((koi) => stepKoi(koi, dt, t));
    if (!reducedMotion) {
      clouds.forEach((cloud) => {
        cloud.position.x += cloud.userData.speed * dt;
        if (cloud.position.x > 50) cloud.position.x = -50;
      });
      stepSeaFish(dt);
    }
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }

  function stepSeaFish(dt) {
    seaFish.splashT += dt;
    splash.material.opacity = Math.max(0, 0.7 - seaFish.splashT * 0.9);
    splash.scale.setScalar(1 + seaFish.splashT * 2.2);
    if (!seaFish.active) {
      seaFish.next -= dt;
      if (seaFish.next > 0) return;
      const island = pickOne(islands);
      const a = random() * TAU;
      const reach = rayToEdge(island.local, Math.cos(a), Math.sin(a)) + 1.3 + random() * 1.5;
      seaFish.from.set(island.cx + Math.cos(a) * reach, 0, island.cz + Math.sin(a) * reach);
      const b = a + (random() < 0.5 ? 1 : -1) * Math.PI / 2;
      seaFish.to.set(seaFish.from.x + Math.cos(b) * 1.6, 0, seaFish.from.z + Math.sin(b) * 1.6);
      seaFish.t = 0;
      seaFish.active = true;
      jumper.visible = true;
      splash.position.set(seaFish.from.x, 0.02, seaFish.from.z);
      seaFish.splashT = 0;
      return;
    }
    seaFish.t += dt / 1.1;
    const k = Math.min(1, seaFish.t);
    jumper.position.lerpVectors(seaFish.from, seaFish.to, k);
    jumper.position.y = Math.sin(Math.PI * k) * 1.4 - 0.1;
    jumper.rotation.set(0, Math.atan2(seaFish.to.x - seaFish.from.x, seaFish.to.z - seaFish.from.z), 0);
    jumper.rotateX(-Math.cos(Math.PI * k) * 1.1);
    if (k >= 1) {
      seaFish.active = false;
      jumper.visible = false;
      seaFish.next = 3 + random() * 5;
      splash.position.set(seaFish.to.x, 0.02, seaFish.to.z);
      seaFish.splashT = 0;
    }
  }

  if (reducedMotion) camera.position.copy(overview.position);
  else startFlight(overview.position.clone(), overview.target.clone(), INTRO_MS);
  frame = requestAnimationFrame(render);

  // 字型載入後重畫看板、身高尺、招牌上的字
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load(`40px ${FONT}`, '桐這次跳最高'), document.fonts.load(`600 40px ${NUM_FONT}`, '0123456789')])
      .catch(() => {})
      .then(() => textures.forEach((texture) => texture.userData.repaint()));
  }

  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    labelRenderer.setSize(width, height);
    fitOverview();
    controls.maxDistance = Math.max(110, overview.distance * 1.15);
    if (mode === 'overview' && !flight) {
      camera.position.copy(overview.position);
      controls.target.copy(overview.target);
    }
  }

  // ---------- 給介面用的 ----------
  function press() {
    const p = platformById[focusId];
    if (!p || p.ready === null) return false;
    const cat = cats[p.ready];
    if (cat.state !== 'ready') return false;
    cat.state = 'crouch';
    cat.charge = 0;
    cat.crouchAmt = 0;
    cat.byTong = true;
    p.charging = cat.index;
    return true;
  }

  function release() {
    const p = platformById[focusId];
    if (!p || p.charging === null) return null;
    const cat = cats[p.charging];
    const power = meterAt(p.level, cat.charge);
    launch(cat, p, power);
    return { power, cat: cat.index };
  }

  function platformView(id) {
    const p = platformById[id];
    if (!p) return null;
    const readyCat = p.ready !== null ? cats[p.ready] : null;
    return {
      level: p.level,
      ready: readyCat && readyCat.state === 'ready' ? readyCat.index : null,
      charging: p.charging,
      meter: p.charging !== null ? meterAt(p.level, cats[p.charging].charge) : 0,
      climber: p.climber,
      queue: p.queue.slice(),
      incoming: p.incoming.size,
    };
  }

  function islandOf(cat) {
    if (['queue', 'ready', 'crouch', 'air', 'land'].includes(cat.state) || cat.purpose === 'climb' || cat.purpose === 'exit') return cat.platform;
    if (cat.state === 'perform' || cat.purpose === 'climbStage' || cat.purpose === 'exitStage') return 'stage';
    if (cat.state === 'walk') return null;
    if (cat.state === 'inside') return 'home';
    return nodes[cat.node] ? nodes[cat.node].island : null;
  }

  function catInfo(index) {
    const cat = cats[index];
    if (!cat) return null;
    return {
      doing: cat.doing, island: islandOf(cat), sleeping: cat.pose === 'sleep', inside: cat.state === 'inside',
      lost: cat.state === 'lost', hiding: cat.state === 'rest' && !!cat.spot && cat.spot.kind === 'box',
      writing: cat.state === 'rest' && !!cat.spot && cat.spot.kind === 'diary', performing: cat.state === 'perform',
    };
  }

  // ---------- 表演區、紙箱、日記、教練給介面用的 ----------
  function stageView() {
    const cat = show.performer !== null ? cats[show.performer] : null;
    return {
      performer: cat ? cat.index : null,
      ready: !!cat && cat.state === 'perform',
      trick: cat && cat.trick ? cat.trick.name : null,
      waiting: show.waiting,
      audience: audienceCats().length,
    };
  }

  // 桐桐按了動作鈕：臺上的貓馬上做（正在做的動作快做完了才換下一個）
  function stageTrick(name) {
    const cat = show.performer !== null ? cats[show.performer] : null;
    if (!cat || cat.state !== 'perform' || !TRICKS[name]) return false;
    if (cat.trick && cat.trick.name !== 'bow' && cat.trick.t < cat.trick.dur * 0.7) return false;
    cat.leaving = false;
    startTrick(cat, name);
    cat.leaveAt = Math.max(cat.leaveAt, clock.elapsedTime + 15);
    return true;
  }

  function stageClap() {
    const count = cheerAudience(true);
    const cat = show.performer !== null ? cats[show.performer] : null;
    if (cat && cat.state === 'perform') {
      cat.claps += 1;
      say(cat, '♥', 1.5, 'heart');
      if (!cat.trick) startTrick(cat, 'bow');
      cat.leaveAt = Math.max(cat.leaveAt, clock.elapsedTime + 12);
    }
    return count;
  }

  // 點紙箱：有貓就探頭出來，沒有就冒一句「空的！」
  function peekBox(index) {
    const spot = spots[index];
    if (!spot || !spot.box) return null;
    const cat = spot.occupant !== null ? cats[spot.occupant] : null;
    if (cat && cat.spot === spot && cat.state === 'rest') {
      cat.peekT = 1.8;
      return cat.index;
    }
    const el = document.createElement('div');
    el.className = 'speech speech--small';
    el.textContent = '空的！';
    const wrap = document.createElement('div');
    wrap.append(el);
    const bubble = new CSS2DObject(wrap);
    spot.box.getWorldPosition(bubble.position);
    bubble.position.y += 0.6;
    scene.add(bubble);
    transient.push({ object: bubble, until: clock.elapsedTime + 1.4 });
    return null;
  }

  function writers() {
    return cats.filter((c) => c.state === 'rest' && c.spot && c.spot.kind === 'diary').map((c) => c.index);
  }

  function coachInfo() {
    return { doing: coach.doing, sent: coach.sent, following: coach.followed };
  }

  function islandCats(id) {
    return cats.filter((cat) => islandOf(cat) === id).map((cat) => cat.index);
  }

  function meow(index) {
    const cat = cats[index];
    if (!cat) return;
    cat.nodT = 0.7;
    if (cat.state === 'rest' && cat.spot && cat.spot.kind === 'box') cat.peekT = 1.8;
    const el = document.createElement('div');
    el.className = 'meow';
    el.textContent = '喵～';
    const wrap = document.createElement('div');
    wrap.append(el);
    const bubble = new CSS2DObject(wrap);
    bubble.position.set(0, 0.85, 0);
    cat.model.root.add(bubble);
    transient.push({ object: bubble, until: clock.elapsedTime + 1.6 });
    if (hooks.sound) hooks.sound('meow', null);
  }

  // app 給的成績摘要：冠軍（前三名的貓）、每座跳臺最高紀錄、看板前五名
  let boardReady = false;
  function updateBoard({ champions: list = [], best = {}, top = [] }) {
    champions = list.slice(0, 3);
    const instant = !boardReady;
    boardReady = true;
    cats.forEach((cat) => {
      const k = championSlot(cat);
      cat.model.crown.visible = k === 0;
      cat.tagEl.classList.toggle('cat-tag--gold', k === 0);
      cat.tagEl.classList.toggle('cat-tag--silver', k === 1);
      cat.tagEl.classList.toggle('cat-tag--bronze', k === 2);
      if (k === null) return;
      if (instant && cat.state !== 'air' && cat.state !== 'perform') {
        placeOnPodium(cat, k);
      } else if (cat.state === 'idle' || cat.state === 'rest' || cat.state === 'lost' || cat.state === 'stageWait') {
        decide(cat);
      } else if (cat.state === 'queue') {
        const p = platformById[cat.platform];
        if (p) p.queue = p.queue.filter((i) => i !== cat.index);
        decide(cat);
      }
    });
    platforms.forEach((p) => {
      const record = best[p.level];
      p.best.visible = !!record;
      if (record) {
        p.best.position.y = record.cm / 100;
        p.bestEl.textContent = `最高 ${record.cm}`;
      }
    });
    boardRows = top;
    const rank = islands.find((island) => island.kind === 'rank');
    if (rank && rank.boardTexture) rank.boardTexture.userData.repaint();
  }

  function dispose() {
    cancelAnimationFrame(frame);
    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    renderer.domElement.removeEventListener('pointerup', onPointerUp);
    controls.dispose();
    renderer.dispose();
    container.replaceChildren();
  }

  return {
    focus,
    follow,
    clearFollow,
    press,
    release,
    platformView,
    catInfo,
    islandCats,
    meow,
    updateBoard,
    stageView,
    stageTrick,
    stageClap,
    peekBox,
    writers,
    coachInfo,
    teacherSay,
    note(index, data) {
      if (cats[index]) emit(cats[index], data);
    },
    setClass(indices) {
      learn.classCats = new Set(indices);
    },
    onPick(cb) {
      pickHandlers.push(cb);
    },
    get focusId() {
      return focusId;
    },
    resize,
    dispose,
  };
}
