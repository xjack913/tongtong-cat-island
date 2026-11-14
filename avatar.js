// 島主的樣子：大人、小孩、男生、女生（貓的樣子在 scene.js，直接用貓的模型）。
// 模型的臉朝 +z、腳踩在 y = 0。每個姿勢是四肢的角度：往前抬是負的、往後是正的。
import * as THREE from 'three';

const SKIN = 0xf7d2b4;
const LOOKS = {
  man: { scale: 1, hair: 0x4a3426, hairStyle: 'short', top: 0x3e4bb8, bottom: 0x34405f, skirt: false },
  woman: { scale: 0.97, hair: 0x5c3a28, hairStyle: 'long', top: 0xe8466e, bottom: 0xe8466e, skirt: true },
  boy: { scale: 0.78, hair: 0x2e2622, hairStyle: 'short', top: 0xffc93c, bottom: 0x3e4bb8, skirt: false },
  girl: { scale: 0.78, hair: 0x3a2a22, hairStyle: 'pigtails', top: 0x8d9cf0, bottom: 0xff8fab, skirt: true },
  // 貓貓商店的店員：桐桐畫的綁兩邊頭髮的小女孩，穿綠色圍裙洋裝，跟島主的小孩樣子分得出來
  clerk: { scale: 0.8, hair: 0x7a4a2a, hairStyle: 'pigtails', top: 0x4fb388, bottom: 0xfff2d8, skirt: true },
};
const LEG_LENGTH = 0.3;

const POSE_ANGLES = {
  stand: { arm: [0, 0], leg: [0, 0], lean: 0, lift: 0 },
  walk: { arm: [0, 0], leg: [0, 0], lean: 0.04, lift: 0 },
  run: { arm: [-0.5, -0.5], leg: [0, 0], lean: 0.22, lift: 0 },
  sit: { arm: [-0.55, -0.55], leg: [-1.45, -1.45], lean: 0, lift: -LEG_LENGTH + 0.03 },
  cheer: { arm: [-2.7, -2.7], leg: [0, 0], lean: 0, lift: 0 },
  wave: { arm: [0, -2.8], leg: [0, 0], lean: 0, lift: 0 },
  pet: { arm: [0, -1.25], leg: [0, 0], lean: 0.2, lift: 0 },
  crouch: { arm: [0.5, 0.5], leg: [-0.75, -0.75], lean: 0.32, lift: -0.08 },
  jump: { arm: [-2.5, -2.5], leg: [0.35, -0.35], lean: 0, lift: 0 },
  sing: { arm: [-1.1, 0], leg: [0, 0], lean: -0.06, lift: 0 },
  ready: { arm: [0.4, -0.5], leg: [-0.45, 0.35], lean: 0.26, lift: -0.03 },
  // 吃東西：右手拿到嘴邊一口一口咬；喝東西：右手舉高、頭往後仰
  eat: { arm: [0, -2.05], leg: [0, 0], lean: 0.04, lift: 0 },
  drink: { arm: [0, -2.3], leg: [0, 0], lean: -0.08, lift: 0 },
};

function material(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...extra });
}

export function buildHuman(kind) {
  const look = LOOKS[kind] || LOOKS.girl;
  const root = new THREE.Group();
  const spin = new THREE.Group();
  spin.position.y = 0.55;
  root.add(spin);
  const body = new THREE.Group();
  body.position.y = -0.55;
  spin.add(body);
  const meshes = [];
  const add = (parent, geometry, color, x = 0, y = 0, z = 0, extra) => {
    const mesh = new THREE.Mesh(geometry, material(color, extra));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    meshes.push(mesh);
    return mesh;
  };

  // 腳：從髖關節往下，旋轉點在上面
  const hipY = LEG_LENGTH + 0.04;
  const legs = [-1, 1].map((side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.075, hipY, 0);
    body.add(leg);
    add(leg, new THREE.CylinderGeometry(0.052, 0.046, LEG_LENGTH - 0.04, 8), look.skirt ? SKIN : look.bottom, 0, -(LEG_LENGTH - 0.04) / 2, 0);
    add(leg, new THREE.BoxGeometry(0.095, 0.05, 0.16), 0xffffff, 0, -LEG_LENGTH + 0.005, 0.03);
    return leg;
  });

  // 身體：男生上衣加短褲，女生洋裝
  if (look.skirt) {
    add(body, new THREE.CylinderGeometry(0.09, 0.2, 0.42, 10), look.top, 0, hipY + 0.14, 0);
    add(body, new THREE.CylinderGeometry(0.205, 0.215, 0.05, 10), look.bottom, 0, hipY - 0.07, 0);
  } else {
    add(body, new THREE.CylinderGeometry(0.11, 0.135, 0.3, 10), look.top, 0, hipY + 0.17, 0);
    add(body, new THREE.CylinderGeometry(0.135, 0.13, 0.11, 10), look.bottom, 0, hipY + 0.01, 0);
  }

  // 手：旋轉點在肩膀
  const shoulderY = hipY + 0.3;
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.145, shoulderY, 0);
    body.add(arm);
    add(arm, new THREE.CylinderGeometry(0.038, 0.034, 0.25, 8), look.top, 0, -0.11, 0);
    add(arm, new THREE.SphereGeometry(0.044, 8, 6), SKIN, 0, -0.25, 0);
    return arm;
  });

  // 頭比較大，看起來可愛；小孩的頭再大一點
  const head = new THREE.Group();
  head.position.y = shoulderY + 0.19;
  if (kind === 'boy' || kind === 'girl' || kind === 'clerk') head.scale.setScalar(1.14);
  body.add(head);
  add(head, new THREE.SphereGeometry(0.19, 16, 12), SKIN, 0, 0, 0, { flatShading: false });
  const hair = new THREE.SphereGeometry(0.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const cap = add(head, hair, look.hair, 0, 0.012, -0.015, { flatShading: false });
  cap.rotation.x = -0.25;
  if (look.hairStyle === 'long') {
    add(head, new THREE.BoxGeometry(0.34, 0.34, 0.1), look.hair, 0, -0.1, -0.13);
  } else if (look.hairStyle === 'pigtails') {
    [-1, 1].forEach((side) => add(head, new THREE.SphereGeometry(0.07, 10, 8), look.hair, side * 0.2, 0.01, -0.03, { flatShading: false }));
  }
  [-1, 1].forEach((side) => {
    add(head, new THREE.SphereGeometry(0.022, 8, 6), 0x2a2430, side * 0.07, 0.0, 0.175, { flatShading: false });
    add(head, new THREE.CircleGeometry(0.032, 10), 0xffb3b3, side * 0.115, -0.05, 0.158, { transparent: true, opacity: 0.7 });
  });
  const mouth = add(head, new THREE.TorusGeometry(0.03, 0.007, 6, 12, Math.PI), 0xb8485a, 0, -0.04, 0.183);
  mouth.rotation.z = Math.PI;

  root.scale.setScalar(look.scale);
  return { kind, root, spin, body, legs, arms, head, meshes, height: (shoulderY + 0.42) * look.scale, angles: { arm: [0, 0], leg: [0, 0], lean: 0, lift: 0 }, gait: 0 };
}

// 每一幀把四肢轉到這個姿勢；走路、跑步時手腳前後擺
export function animateHuman(model, pose, moving, dt, t) {
  const target = POSE_ANGLES[pose] || POSE_ANGLES.stand;
  const a = model.angles;
  const k = 1 - Math.exp(-dt * 12);
  const swinging = moving && (pose === 'walk' || pose === 'run');
  const amount = pose === 'run' ? 1.05 : 0.62;
  if (swinging) model.gait += dt * (pose === 'run' ? 15 : 9.5);
  const s = swinging ? Math.sin(model.gait) * amount : 0;
  let armR = target.arm[1];
  if (pose === 'wave') armR += Math.sin(t * 9) * 0.3;
  if (pose === 'cheer') armR += Math.sin(t * 14) * 0.2;
  if (pose === 'eat') armR += Math.max(0, Math.sin(t * 11)) * 0.45;
  const wanted = {
    arm: [target.arm[0] + s, armR - s],
    leg: [target.leg[0] - s, target.leg[1] + s],
  };
  [0, 1].forEach((i) => {
    a.arm[i] += (wanted.arm[i] - a.arm[i]) * k;
    a.leg[i] += (wanted.leg[i] - a.leg[i]) * k;
    model.arms[i].rotation.x = a.arm[i];
    model.legs[i].rotation.x = a.leg[i];
  });
  a.lean += (target.lean - a.lean) * k;
  a.lift += (target.lift - a.lift) * k;
  model.body.rotation.x = a.lean;
  model.body.position.y = -0.55 + a.lift + (swinging ? Math.abs(Math.sin(model.gait)) * 0.03 : 0);
  model.head.rotation.z = pose === 'sing' ? Math.sin(t * 3.2) * 0.14 : 0;
  // 吃的時候點頭嚼、喝的時候仰頭
  const nod = pose === 'eat' ? Math.sin(t * 11) * 0.1 : pose === 'drink' ? -0.38 : 0;
  model.head.rotation.x += (nod - model.head.rotation.x) * k;
}

export function disposeModel(model) {
  model.meshes.forEach((mesh) => {
    mesh.geometry.dispose();
    mesh.material.dispose();
  });
}
