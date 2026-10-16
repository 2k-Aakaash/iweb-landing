// "Tab World": the hero's 3D landscape. The iWeb mark is carved into a misty terrain
// (heightmap drawn on a canvas + fractal noise in the vertex shader), water fills the
// grooves, six feature beacons glow on the ridges, and bloom + grain finish the look.
// Scroll (while the hero is pinned) and drag move the camera; clicking a beacon flies to it.
// No model or texture files: everything is generated.

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const SIZE = 420; // terrain width/depth in world units
const SEGMENTS = 360;
const HEIGHT = 34;
const WATER_LEVEL = 3.2;
const FOG = new THREE.Color('#0a1427');

// ── Shared GLSL noise ──────────────────────────────────────────────────────────────────
const NOISE = /* glsl */ `
  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(dot(hash2(i), f), dot(hash2(i + vec2(1, 0)), f - vec2(1, 0)), u.x),
               mix(dot(hash2(i + vec2(0, 1)), f - vec2(0, 1)), dot(hash2(i + vec2(1, 1)), f - vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
    return v;
  }
  float ridged(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * (1.0 - abs(noise(p))); p = p * 2.1 + 9.0; a *= 0.5; }
    return v;
  }
`;

// ── Heightmap: the iWeb mark (rings + "iW") drawn on a canvas ──────────────────────────
function drawMark(fontFamily) {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  ctx.filter = 'blur(10px)';
  ctx.strokeStyle = '#fff';
  ctx.lineCap = 'round';
  const c = size / 2;
  // Two broken rings around the mark (gaps let the "rivers" flow out).
  ctx.lineWidth = 46;
  ctx.beginPath();
  ctx.arc(c, c, 380, 0.25 * Math.PI, 1.85 * Math.PI);
  ctx.stroke();
  ctx.lineWidth = 34;
  ctx.beginPath();
  ctx.arc(c, c, 290, 1.1 * Math.PI, 0.9 * Math.PI + 2 * Math.PI);
  ctx.stroke();
  // The "iW" letters, filled, in the brand display face.
  ctx.fillStyle = '#fff';
  ctx.font = `600 360px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('iW', c, c + 18);
  ctx.filter = 'none';
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return { texture, ctx, size };
}

// Height function mirrored on the CPU (for beacon placement): mark + falloff.
function markValue(ctx, size, u, v) {
  const x = Math.min(size - 1, Math.max(0, Math.round(u * (size - 1))));
  const y = Math.min(size - 1, Math.max(0, Math.round(v * (size - 1))));
  return ctx.getImageData(x, y, 1, 1).data[0] / 255;
}

// ── Terrain ────────────────────────────────────────────────────────────────────────────
function createTerrain(markTexture, beacons) {
  const geometry = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMark: { value: markTexture },
      uTime: { value: 0 },
      uFog: { value: FOG },
      uBeaconPos: { value: beacons.map((b) => b.position) },
      uBeaconColor: { value: beacons.map((b) => b.color) },
      uPulse: { value: beacons.map(() => 1) },
    },
    vertexShader: /* glsl */ `
      uniform sampler2D uMark;
      varying vec3 vPos;
      varying float vMark;
      varying vec3 vNormal;
      ${NOISE}
      float height(vec2 xz) {
        vec2 uv = xz / ${SIZE.toFixed(1)} + 0.5;
        float mark = texture2D(uMark, vec2(uv.x, 1.0 - uv.y)).r;
        float d = length(xz) / ${(SIZE / 2).toFixed(1)};
        float mountains = smoothstep(0.62, 1.05, d) * (ridged(xz * 0.012) * 1.6);
        float base = fbm(xz * 0.02) * 0.35 + 0.18;
        float carved = mark * (0.75 + fbm(xz * 0.05) * 0.5);
        return (base + carved + mountains) * ${HEIGHT.toFixed(1)};
      }
      void main() {
        vec3 p = position;
        p.y = height(p.xz);
        float e = 1.2;
        float hx = height(p.xz + vec2(e, 0.0)) - height(p.xz - vec2(e, 0.0));
        float hz = height(p.xz + vec2(0.0, e)) - height(p.xz - vec2(0.0, e));
        vNormal = normalize(vec3(-hx, 2.0 * e, -hz));
        vec2 uv = p.xz / ${SIZE.toFixed(1)} + 0.5;
        vMark = texture2D(uMark, vec2(uv.x, 1.0 - uv.y)).r;
        vPos = p;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uFog;
      uniform float uTime;
      uniform vec3 uBeaconPos[6];
      uniform vec3 uBeaconColor[6];
      uniform float uPulse[6];
      varying vec3 vPos;
      varying float vMark;
      varying vec3 vNormal;
      ${NOISE}
      void main() {
        vec3 n = normalize(vNormal);
        float slope = 1.0 - n.y;
        vec3 rock = mix(vec3(0.035, 0.06, 0.12), vec3(0.11, 0.17, 0.28), smoothstep(0.0, 30.0, vPos.y));
        rock = mix(rock, vec3(0.025, 0.04, 0.08), smoothstep(0.25, 0.7, slope));
        rock += vec3(0.16, 0.22, 0.32) * smoothstep(30.0, 44.0, vPos.y) * (1.0 - slope);
        float grain = fbm(vPos.xz * 0.35) * 0.06;
        vec3 moon = normalize(vec3(-0.4, 0.8, -0.35));
        float diff = clamp(dot(n, moon), 0.0, 1.0);
        vec3 col = rock * (0.3 + diff * 0.75) + grain * 0.6;
        col += vec3(0.2, 0.4, 0.9) * vMark * 0.07;
        // Coloured light from the beacons on nearby terrain.
        for (int i = 0; i < 6; i++) {
          float d = distance(vPos, uBeaconPos[i]);
          col += uBeaconColor[i] * (1.0 / (1.0 + d * d * 0.006)) * 0.35 * uPulse[i];
        }
        float dist = length(cameraPosition - vPos);
        float fog = 1.0 - exp(-dist * 0.0036);
        float heightFog = smoothstep(18.0, 0.0, vPos.y) * 0.35;
        col = mix(col, uFog, clamp(fog + heightFog * fog, 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  return new THREE.Mesh(geometry, material);
}

// ── Water ──────────────────────────────────────────────────────────────────────────────
function createWater(beacons) {
  const geometry = new THREE.PlaneGeometry(SIZE * 1.4, SIZE * 1.4, 1, 1);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uFog: { value: FOG },
      uBeaconPos: { value: beacons.map((b) => b.position) },
      uBeaconColor: { value: beacons.map((b) => b.color) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(vPos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uFog;
      uniform vec3 uBeaconPos[6];
      uniform vec3 uBeaconColor[6];
      varying vec3 vPos;
      ${NOISE}
      void main() {
        vec3 view = normalize(cameraPosition - vPos);
        float ripple = fbm(vPos.xz * 0.08 + vec2(uTime * 0.05, uTime * 0.03));
        float fresnel = pow(1.0 - clamp(view.y, 0.0, 1.0), 3.0);
        vec3 col = mix(vec3(0.02, 0.05, 0.1), vec3(0.22, 0.32, 0.5), fresnel * 0.8 + ripple * 0.12);
        // Fake reflections: streaks of each beacon's colour across the water.
        for (int i = 0; i < 6; i++) {
          vec2 dir = normalize(uBeaconPos[i].xz - cameraPosition.xz);
          vec2 rel = vPos.xz - uBeaconPos[i].xz;
          float across = abs(dot(rel, vec2(-dir.y, dir.x)));
          float along = dot(rel, dir);
          float streak = exp(-across * 0.12) * exp(-abs(along) * 0.02) * (0.6 + ripple);
          col += uBeaconColor[i] * streak * 0.7;
        }
        col += vec3(0.6, 0.75, 1.0) * pow(max(ripple, 0.0), 6.0) * 1.2; // glints
        float dist = length(cameraPosition - vPos);
        col = mix(col, uFog, 1.0 - exp(-dist * 0.004));
        gl_FragColor = vec4(col, 0.9);
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = WATER_LEVEL;
  return mesh;
}

// ── Sky dome ───────────────────────────────────────────────────────────────────────────
function createSky() {
  const geometry = new THREE.SphereGeometry(1500, 32, 16);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uFog: { value: FOG } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uFog;
      varying vec3 vDir;
      void main() {
        float h = vDir.y;
        vec3 top = vec3(0.02, 0.04, 0.09);
        vec3 col = mix(uFog, top, smoothstep(0.0, 0.55, h));
        col += vec3(0.25, 0.35, 0.6) * pow(max(0.0, 1.0 - abs(h - 0.08) * 6.0), 2.0) * 0.25;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  return new THREE.Mesh(geometry, material);
}

// ── Beacons: light column + rising sparks + base glow ──────────────────────────────────
function createBeacon(beacon) {
  const group = new THREE.Group();
  group.position.copy(beacon.position);

  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 3.2, 46, 24, 1, true),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uColor: { value: beacon.color }, uTime: { value: 0 }, uPulse: { value: 1 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uTime; uniform float uPulse;
        varying vec2 vUv;
        void main() {
          float fade = pow(1.0 - vUv.y, 2.2);
          float flicker = 0.75 + 0.25 * sin(uTime * 3.0 + vUv.y * 18.0);
          gl_FragColor = vec4(uColor * fade * flicker * uPulse * 1.4, fade * 0.6);
        }
      `,
    }),
  );
  column.position.y = 23;
  group.add(column);

  const count = 90;
  const seeds = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) seeds.set([Math.random(), Math.random(), Math.random()], i * 3);
  const sparks = new THREE.BufferGeometry();
  sparks.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  sparks.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
  const sparkMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: beacon.color }, uTime: { value: 0 }, uPulse: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      attribute vec3 aSeed;
      varying float vLife;
      void main() {
        float life = fract(aSeed.x + uTime * (0.08 + aSeed.y * 0.12));
        float a = aSeed.z * 6.2831;
        vec3 p = vec3(cos(a) * (1.0 + life * 5.0), life * 40.0, sin(a) * (1.0 + life * 5.0));
        vLife = life;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (1.0 - life) * 260.0 / -mv.z;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uPulse;
      varying float vLife;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * (1.0 - vLife);
        gl_FragColor = vec4(uColor * 2.0 * uPulse, a);
      }
    `,
  });
  const points = new THREE.Points(sparks, sparkMaterial);
  points.frustumCulled = false;
  group.add(points);

  // Invisible hit target for hover / click.
  const hit = new THREE.Mesh(new THREE.SphereGeometry(10, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 10;
  hit.userData.beacon = beacon.index;
  group.add(hit);

  return { group, materials: [column.material, sparkMaterial], hit };
}

// ── Post: grain + vignette + slight chromatic aberration ───────────────────────────────
const FinishShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAmount: { value: 0.045 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uAmount;
    varying vec2 vUv;
    float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 c = vUv - 0.5;
      float r = dot(c, c);
      vec2 off = c * r * 0.012;
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      col *= 1.0 - smoothstep(0.18, 0.75, r) * 0.75;
      col += (rand(vUv * 900.0 + uTime) - 0.5) * uAmount;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

// ── World ──────────────────────────────────────────────────────────────────────────────

/**
 * Creates the world inside `container`. `features` = [{ id, color }] (6 entries).
 * Returns { setProgress(p), select(index|null), onHover(cb), onSelect(cb), beacons, dispose }.
 */
export async function createWorld(container, features, { fontFamily = 'Clash Display' } = {}) {
  await document.fonts.ready;
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.domElement.className = 'world-canvas';
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = FOG.clone();
  const camera = new THREE.PerspectiveCamera(42, 1, 1, 4000);

  const mark = drawMark(fontFamily);

  // Beacons sit on the mark's ridges, spread around the centre.
  const beacons = features.map((feature, index) => {
    const angle = (index / features.length) * Math.PI * 2 + 0.4;
    let best = null;
    for (let r = 60; r <= 190; r += 4) {
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const value = markValue(mark.ctx, mark.size, x / SIZE + 0.5, z / SIZE + 0.5);
      if (!best || value > best.value) best = { x, z, value };
    }
    const y = (0.18 + best.value * 0.85) * HEIGHT;
    return { index, id: feature.id, color: new THREE.Color(feature.color), position: new THREE.Vector3(best.x, y, best.z) };
  });

  const terrain = createTerrain(mark.texture, beacons);
  const water = createWater(beacons);
  scene.add(createSky(), terrain, water);
  const beaconObjects = beacons.map((beacon) => {
    const object = createBeacon(beacon);
    scene.add(object.group);
    return object;
  });

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.55, 0.72);
  composer.addPass(bloom);
  const finish = new ShaderPass(FinishShader);
  composer.addPass(finish);
  composer.addPass(new OutputPass());

  // Camera rig: progress (scroll) moves along a path; drag adds an orbit offset.
  const rig = {
    progress: 0, smoothProgress: 0,
    drag: 0, smoothDrag: 0,
    pointerX: 0, pointerY: 0, smoothPX: 0, smoothPY: 0,
    focus: null, focusMix: 0,
  };
  const target = new THREE.Vector3();
  const focusTarget = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  function cameraAt(p, drag) {
    const azimuth = -0.35 + p * 1.25 + drag;
    const elevation = THREE.MathUtils.lerp(0.62, 0.3, p);
    const radius = THREE.MathUtils.lerp(340, 215, p);
    tmp.set(Math.sin(azimuth) * Math.cos(elevation) * radius, Math.sin(elevation) * radius + 10, Math.cos(azimuth) * Math.cos(elevation) * radius);
    return tmp;
  }

  // Interaction.
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered = null;
  const listeners = { hover: () => {}, select: () => {} };
  let dragging = null;

  const el = renderer.domElement;
  el.addEventListener('pointerdown', (e) => {
    dragging = { x: e.clientX, drag: rig.drag, moved: false };
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    const rect = el.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    rig.pointerX = ndc.x;
    rig.pointerY = ndc.y;
    if (dragging) {
      const dx = e.clientX - dragging.x;
      if (Math.abs(dx) > 4) dragging.moved = true;
      rig.drag = dragging.drag + dx * 0.004;
    }
  });
  el.addEventListener('pointerup', (e) => {
    const wasDrag = dragging?.moved;
    dragging = null;
    el.releasePointerCapture?.(e.pointerId);
    if (!wasDrag) listeners.select(hovered);
  });
  el.addEventListener('pointerleave', () => { hovered = null; listeners.hover(null); });

  let width = 1;
  let height = 1;
  const resize = () => {
    width = container.clientWidth;
    height = container.clientHeight;
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    bloom.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  const startTime = performance.now();
  let lastTime = startTime;
  let running = true;
  const screen = new THREE.Vector3();

  function frame() {
    if (!running) return;
    const nowMs = performance.now();
    const dt = Math.min((nowMs - lastTime) / 1000, 0.05);
    lastTime = nowMs;
    const t = (nowMs - startTime) / 1000;
    const k = 1 - Math.exp(-dt * 3.2);
    rig.smoothProgress += (rig.progress - rig.smoothProgress) * k;
    rig.smoothDrag += (rig.drag - rig.smoothDrag) * k;
    rig.smoothPX += (rig.pointerX - rig.smoothPX) * k;
    rig.smoothPY += (rig.pointerY - rig.smoothPY) * k;
    rig.focusMix += ((rig.focus === null ? 0 : 1) - rig.focusMix) * (1 - Math.exp(-dt * 2.6));

    const base = cameraAt(rig.smoothProgress, rig.smoothDrag).clone();
    target.set(rig.smoothPX * 14, 8, -rig.smoothPY * 8);
    if (rig.focus !== null) {
      const b = beacons[rig.focus].position;
      focusTarget.copy(b).add(new THREE.Vector3(0, 12, 0));
      const away = new THREE.Vector3().subVectors(base, b).setY(0).normalize();
      const close = b.clone().add(away.multiplyScalar(130)).add(new THREE.Vector3(0, 62, 0));
      base.lerp(close, rig.focusMix);
      target.lerp(focusTarget, rig.focusMix);
    }
    camera.position.copy(base);
    camera.position.x += rig.smoothPX * 10;
    camera.position.y += rig.smoothPY * 6;
    camera.lookAt(target);

    // Hover.
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(beaconObjects.map((b) => b.hit))[0];
    const next = hit ? hit.object.userData.beacon : null;
    if (next !== hovered) {
      hovered = next;
      listeners.hover(hovered);
      el.style.cursor = hovered === null ? 'grab' : 'pointer';
    }

    const pulses = terrain.material.uniforms.uPulse.value;
    beaconObjects.forEach((object, i) => {
      const active = hovered === i || rig.focus === i ? 1.9 : 1;
      pulses[i] += (active - pulses[i]) * 0.1;
      for (const m of object.materials) {
        m.uniforms.uTime.value = t;
        m.uniforms.uPulse.value = pulses[i];
      }
      // Screen position for HTML labels.
      screen.copy(beacons[i].position).add(new THREE.Vector3(0, 30, 0)).project(camera);
      beacons[i].screen = { x: (screen.x * 0.5 + 0.5) * width, y: (-screen.y * 0.5 + 0.5) * height, visible: screen.z < 1 };
    });

    terrain.material.uniforms.uTime.value = t;
    water.material.uniforms.uTime.value = t;
    finish.uniforms.uTime.value = t;
    composer.render();
    listeners.frame?.(beacons);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    beacons,
    setProgress(p) { rig.progress = THREE.MathUtils.clamp(p, 0, 1); },
    select(index) { rig.focus = index; },
    onHover(cb) { listeners.hover = cb; },
    onSelect(cb) { listeners.select = cb; },
    onFrame(cb) { listeners.frame = cb; },
    pause() { running = false; },
    resume() { if (!running) { running = true; lastTime = performance.now(); requestAnimationFrame(frame); } },
    dispose() {
      running = false;
      window.removeEventListener('resize', resize);
      renderer.dispose();
      el.remove();
    },
  };
}
