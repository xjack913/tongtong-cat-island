import * as THREE from 'three';
import { mulberry32 } from './logic.js';

const PALETTES = {
  dawn: { sky: 0xf4c5a4, water: 0x8dbbbe, far: 0x8f88aa, near: 0x708d8b, light: 0xffd4ae, sun: 1.65, ambient: 1.1 },
  day: { sky: 0xc4eaf4, water: 0x89c7ca, far: 0x98b3c2, near: 0x648d90, light: 0xfff1dd, sun: 2.5, ambient: 1.25 },
  dusk: { sky: 0xe6a598, water: 0x789bb3, far: 0x8984a9, near: 0x6a7c90, light: 0xffc199, sun: 1.5, ambient: 1.05 },
  night: { sky: 0x26365c, water: 0x375c78, far: 0x485779, near: 0x395573, light: 0xbbd1ff, sun: 0.52, ambient: 0.93 },
};
const OVERCAST = { sky: 0x9db5c9, water: 0x688fa7, far: 0x8395a7, near: 0x647d88, light: 0xd8e6f4 };

function ridge(z, height, seed) {
  const random = mulberry32(seed);
  const points = [];
  const faces = [];
  for (let i = 0; i < 21; i++) {
    const x = (i - 10) * 9;
    const crest = 4 + height * (0.30 + random() * 0.62 + Math.sin(i * 1.36) * 0.15);
    points.push(x, 0, z + 8 + random() * 4, x, crest, z - random() * 4, x, 0, z - 13);
    if (i < 20) {
      const a = i * 3;
      faces.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ flatShading: true, side: THREE.DoubleSide }));
}

function sunTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const glow = ctx.createRadialGradient(64, 64, 15, 64, 64, 63);
  glow.addColorStop(0, 'rgba(255,255,255,.75)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(64, 64, 28, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

export function createWeatherScene({ scene, camera, water, sun, ambient, fill, clouds, reducedMotion }) {
  const far = ridge(-72, 22, 762);
  const near = ridge(-45, 16, 247);
  const sky = new THREE.Color(PALETTES.day.sky);
  scene.background = sky;
  const texture = sunTexture();
  const disk = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture, color: 0xffdf92, fog: false, depthTest: false, depthWrite: false, transparent: true, toneMapped: false,
  }));
  disk.renderOrder = 10;
  const count = 260;
  const random = mulberry32(7624);
  const drops = Array.from({ length: count }, () => [random() * 80 - 40, random() * 28, random() * 78 - 35, 12 + random() * 7]);
  const rainVertices = new THREE.Float32BufferAttribute(new Float32Array(count * 6), 3).setUsage(THREE.DynamicDrawUsage);
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute('position', rainVertices);
  const rainMaterial = new THREE.LineBasicMaterial({ color: 0xd5edff, transparent: true, opacity: 0.66, depthWrite: false, fog: false });
  const rain = new THREE.LineSegments(rainGeometry, rainMaterial);
  rain.frustumCulled = false;
  rain.visible = false;
  scene.add(far, near, disk, rain);

  const target = {};
  const mist = new THREE.Color();
  const cloudColour = new THREE.Color();
  const discPosition = new THREE.Vector3();
  const cameraDirection = new THREE.Vector3();
  let sunPosition = 0.5;
  let sunVisible = true;
  let moonVisible = false;
  let rainVisible = false;
  let rainDirty = false;
  let isNight = false;
  let initial = true;

  function setWeather(state) {
    const palette = PALETTES[state.phase] ?? PALETTES.day;
    isNight = state.phase === 'night';
    const overcast = Math.min(1, state.cloud * 0.57 + (state.raining ? 0.55 : 0));
    for (const key of ['sky', 'water', 'far', 'near', 'light']) {
      target[key] = new THREE.Color(palette[key]).lerp(mist.setHex(OVERCAST[key]), overcast * (isNight ? 0.26 : 0.8));
    }
    target.cloud = cloudColour.setHex(isNight ? 0x8f9ebc : 0xffffff).lerp(mist.setHex(0x819ab1), overcast * 0.65);
    target.sun = palette.sun * (1 - overcast * 0.62);
    target.ambient = palette.ambient * (1 - overcast * 0.13);
    target.fill = isNight ? 0.66 : 0.4;
    sunPosition = state.solar;
    sunVisible = state.sunUp && !state.raining && state.cloud < 0.95;
    moonVisible = isNight && !state.raining && state.cloud < 0.85;
    rainDirty = rainDirty || rainVisible !== state.raining;
    rainVisible = state.raining;
    rainMaterial.opacity = state.rain >= 1 ? 0.74 : 0.55;
    rainGeometry.setDrawRange(0, (state.rain >= 1 ? count : 180) * 2);
  }

  function step(dt) {
    const t = initial || reducedMotion ? 1 : 1 - Math.exp(-2.5 * dt);
    initial = false;
    sky.lerp(target.sky, t);
    scene.fog.color.copy(sky);
    water.material.color.lerp(target.water, t);
    far.material.color.lerp(target.far, t);
    near.material.color.lerp(target.near, t);
    sun.color.lerp(target.light, t);
    sun.intensity = THREE.MathUtils.lerp(sun.intensity, target.sun, t);
    const sunArc = isNight ? 0.85 : sunPosition;
    const moonOrSunX = sun.target.position.x + Math.sin((sunArc - 0.5) * 1.65) * 23;
    const moonOrSunY = 9 + Math.sin(sunArc * Math.PI) * 18;
    sun.position.x = THREE.MathUtils.lerp(sun.position.x, moonOrSunX, t);
    sun.position.y = THREE.MathUtils.lerp(sun.position.y, moonOrSunY, t);
    ambient.intensity = THREE.MathUtils.lerp(ambient.intensity, target.ambient, t);
    fill.intensity = THREE.MathUtils.lerp(fill.intensity, target.fill, t);
    clouds.forEach((cloud) => cloud.material.color.lerp(target.cloud, t));
    disk.visible = sunVisible || moonVisible;
    if (disk.visible) {
      const x = isNight ? 0.39 : (sunPosition - 0.5) * 1.1;
      const y = isNight ? 0.55 : 0.32 + Math.sin(sunPosition * Math.PI) * 0.34;
      camera.getWorldPosition(disk.position);
      cameraDirection.copy(discPosition.set(x, y, 0.5).unproject(camera)).sub(disk.position).normalize();
      disk.position.addScaledVector(cameraDirection, 180);
      disk.scale.setScalar(isNight ? 12 : 19);
      disk.material.color.setHex(isNight ? 0xdee7ff : 0xffdf92);
    }
    rain.visible = rainVisible;
    if (!rainVisible || (reducedMotion && !rainDirty)) return;
    rainDirty = false;
    for (const [i, drop] of drops.entries()) {
      const [x, y, z, speed] = drop;
      const nextY = reducedMotion ? y : y > 0.3 ? y - speed * dt : 28;
      drop[1] = nextY;
      rainVertices.setXYZ(i * 2, x, nextY, z);
      rainVertices.setXYZ(i * 2 + 1, x - 0.23, nextY + 0.75, z + 0.06);
    }
    rainVertices.needsUpdate = true;
  }

  setWeather({ phase: 'day', sunUp: true, solar: 0.55, cloud: 0.21, rain: 0, raining: false });
  return {
    setWeather,
    step,
    dispose() {
      for (const object of [far, near, disk, rain]) {
        object.removeFromParent();
        if (object.isMesh || object.isLineSegments) object.geometry.dispose();
        object.material.dispose();
      }
      texture.dispose();
    },
  };
}
