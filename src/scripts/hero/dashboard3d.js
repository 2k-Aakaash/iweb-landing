// Hero: iWeb's own interface as floating 3D glass panels (clock, Spotlight bar, Smart Stack
// cards, dock, notes, Dynamic Island). They drift scattered in depth and, as the pinned hero
// is scrolled, fly together into the finished new-tab layout. The glass is frosted: a
// low-resolution render of the animated backdrop is sampled behind each panel.

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export const FONT_DISPLAY = "'Clash Display', 'Inter Variable', sans-serif";
export const FONT_BODY = "'Inter Variable', system-ui, sans-serif";
export const PX = 64; // canvas pixels per world unit for panel artwork

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// ── Panel artwork (drawn on canvases) ─────────────────────────────────────────────────

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function sparkline(ctx, x, y, w, h, color, seed = 1) {
  const pts = [];
  let v = 0.5;
  for (let i = 0; i < 28; i += 1) {
    v += Math.sin(i * 0.9 + seed) * 0.08 + Math.cos(i * 0.37 + seed * 2) * 0.05;
    pts.push(Math.min(0.95, Math.max(0.05, v)));
  }
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, `${color}66`);
  grad.addColorStop(1, `${color}00`);
  ctx.beginPath();
  pts.forEach((p, i) => {
    const px = x + (i / (pts.length - 1)) * w;
    const py = y + (1 - p) * h;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  });
  ctx.lineWidth = h * 0.05;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.fillStyle = grad;
  ctx.fill();
}

export const ART = {
  clock(ctx, w, h) {
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = `600 ${h * 0.56}px ${FONT_DISPLAY}`;
    ctx.fillText('9:41', w / 2, h * 0.6);
    ctx.font = `500 ${h * 0.13}px ${FONT_BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.fillText('Make today count, Aakaash!', w / 2, h * 0.86);
  },
  search(ctx, w, h) {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = h * 0.06;
    ctx.beginPath();
    ctx.arc(h * 0.55, h * 0.48, h * 0.17, 0, Math.PI * 2);
    ctx.moveTo(h * 0.67, h * 0.62);
    ctx.lineTo(h * 0.8, h * 0.75);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `500 ${h * 0.34}px ${FONT_BODY}`;
    ctx.textAlign = 'left';
    ctx.fillText('100 usd to inr', h * 1.05, h * 0.6);
    ctx.fillStyle = '#7fb8ff';
    ctx.textAlign = 'right';
    ctx.font = `600 ${h * 0.34}px ${FONT_BODY}`;
    ctx.fillText('₹8,342.50', w - h * 0.5, h * 0.6);
  },
  weather(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#4f8fe8');
    g.addColorStop(1, '#2a5fb8');
    ctx.fillStyle = g;
    roundRect(ctx, 0, 0, w, h, w * 0.12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.font = `600 ${h * 0.11}px ${FONT_BODY}`;
    ctx.fillText('Chennai', w * 0.1, h * 0.2);
    ctx.font = `500 ${h * 0.34}px ${FONT_DISPLAY}`;
    ctx.fillText('29°', w * 0.08, h * 0.52);
    ctx.font = `500 ${h * 0.09}px ${FONT_BODY}`;
    ctx.fillText('Partly cloudy', w * 0.1, h * 0.78);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('H:33° L:25°', w * 0.1, h * 0.9);
  },
  gold(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#8a5f12');
    g.addColorStop(1, '#4e3409');
    ctx.fillStyle = g;
    roundRect(ctx, 0, 0, w, h, w * 0.12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.font = `600 ${h * 0.1}px ${FONT_BODY}`;
    ctx.fillText('Gold 24K', w * 0.1, h * 0.2);
    ctx.font = `600 ${h * 0.2}px ${FONT_DISPLAY}`;
    ctx.fillText('₹13,891', w * 0.08, h * 0.44);
    ctx.fillStyle = '#a8ffcb';
    ctx.font = `600 ${h * 0.09}px ${FONT_BODY}`;
    ctx.fillText('▲ 1.25%', w * 0.1, h * 0.58);
    sparkline(ctx, w * 0.1, h * 0.64, w * 0.8, h * 0.26, '#ffd27a', 2);
  },
  markets(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1d8a4a');
    g.addColorStop(1, '#0d5730');
    ctx.fillStyle = g;
    roundRect(ctx, 0, 0, w, h, w * 0.12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.font = `600 ${h * 0.1}px ${FONT_BODY}`;
    ctx.fillText('NIFTY 50', w * 0.1, h * 0.2);
    ctx.font = `600 ${h * 0.19}px ${FONT_DISPLAY}`;
    ctx.fillText('23,111', w * 0.08, h * 0.43);
    ctx.font = `600 ${h * 0.09}px ${FONT_BODY}`;
    ctx.fillStyle = '#c8ffe1';
    ctx.fillText('▲ 0.50%', w * 0.1, h * 0.57);
    sparkline(ctx, w * 0.1, h * 0.63, w * 0.8, h * 0.27, '#ffffff', 5);
  },
  currency(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1e7f7a');
    g.addColorStop(1, '#0d4f52');
    ctx.fillStyle = g;
    roundRect(ctx, 0, 0, w, h, w * 0.12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.font = `600 ${h * 0.1}px ${FONT_BODY}`;
    ctx.fillText('USD → INR', w * 0.1, h * 0.2);
    ctx.font = `600 ${h * 0.2}px ${FONT_DISPLAY}`;
    ctx.fillText('₹95.06', w * 0.08, h * 0.44);
    ctx.font = `500 ${h * 0.085}px ${FONT_BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('1 USD = 95.06 INR', w * 0.1, h * 0.58);
    sparkline(ctx, w * 0.1, h * 0.64, w * 0.8, h * 0.26, '#9ff3e6', 8);
  },
  notes(ctx, w, h) {
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.font = `600 ${h * 0.09}px ${FONT_DISPLAY}`;
    ctx.fillText('Notes', w * 0.1, h * 0.16);
    ctx.font = `500 ${h * 0.06}px ${FONT_BODY}`;
    ['Ship landing page', 'Gold rate check', 'Call Amma at 7', 'Read 20 pages'].forEach((line, i) => {
      const y = h * (0.32 + i * 0.15);
      ctx.strokeStyle = i < 2 ? '#30d158' : 'rgba(255,255,255,0.5)';
      ctx.lineWidth = h * 0.012;
      ctx.beginPath();
      ctx.arc(w * 0.14, y - h * 0.02, h * 0.035, 0, Math.PI * 2);
      ctx.stroke();
      if (i < 2) { ctx.fillStyle = '#30d158'; ctx.fill(); }
      ctx.fillStyle = i < 2 ? 'rgba(255,255,255,0.5)' : '#fff';
      ctx.fillText(line, w * 0.24, y);
    });
  },
  island(ctx, w, h) {
    ctx.fillStyle = '#000';
    roundRect(ctx, 0, 0, w, h, h / 2);
    ctx.fill();
    const art = ctx.createLinearGradient(0, 0, h, h);
    art.addColorStop(0, '#8c5aff');
    art.addColorStop(1, '#0a84ff');
    ctx.fillStyle = art;
    ctx.beginPath();
    ctx.arc(h * 0.5, h * 0.5, h * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.font = `600 ${h * 0.3}px ${FONT_BODY}`;
    ctx.fillText('Midnight City', h * 1.0, h * 0.62);
    ctx.fillStyle = '#b48cff';
    for (let i = 0; i < 5; i += 1) {
      const bh = h * (0.2 + Math.abs(Math.sin(i * 1.7)) * 0.35);
      ctx.fillRect(w - h * 1.6 + i * h * 0.22, (h - bh) / 2, h * 0.1, bh);
    }
  },
  dock(ctx, w, h) {
    const colors = ['#ff5a36', '#0a84ff', '#30d158', '#ffd60a', '#bf5af2', '#ff9f0a', '#64d2ff', '#ff375f', '#ffffff'];
    const n = colors.length;
    const s = h * 0.66;
    const gap = (w - n * s) / (n + 1);
    colors.forEach((c, i) => {
      const x = gap + i * (s + gap);
      const y = (h - s) / 2;
      const g = ctx.createLinearGradient(0, y, 0, y + s);
      g.addColorStop(0, c);
      g.addColorStop(1, `${c}aa`);
      ctx.fillStyle = g;
      roundRect(ctx, x, y, s, s, s * 0.26);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      roundRect(ctx, x + s * 0.12, y + s * 0.08, s * 0.76, s * 0.3, s * 0.15);
      ctx.fill();
    });
  },
};

export function artTexture(kind, w, h, renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * PX);
  canvas.height = Math.round(h * PX);
  const ctx = canvas.getContext('2d');
  ART[kind](ctx, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

// ── Layout: final new-tab positions (world units, camera sees ~ ±50 × ±31) ─────────────
// opaque: cards drawn fully (Smart Stack widgets / island), else frosted glass + artwork.
const PANELS = [
  { kind: 'island', w: 17, h: 3.6, at: [0, 25.5, 0], glass: false },
  { kind: 'clock', w: 34, h: 15, at: [0, 6, 0], glass: false, bare: true },
  { kind: 'search', w: 40, h: 4.4, at: [0, -6, 0], glass: true },
  { kind: 'weather', w: 13, h: 13, at: [37, 19, 0], glass: false },
  { kind: 'gold', w: 13, h: 13, at: [37, 4, 0], glass: false },
  { kind: 'markets', w: 13, h: 13, at: [37, -11, 0], glass: false },
  { kind: 'currency', w: 13, h: 13, at: [-37, 19, 0], glass: false },
  { kind: 'notes', w: 13, h: 19, at: [-37, -0.5, 0], glass: true },
  { kind: 'dock', w: 46, h: 6.4, at: [0, -24, 0], glass: true },
];

function scatterFor(index) {
  const a = index * 2.399963; // golden angle
  const r = 26 + (index % 3) * 14;
  return {
    position: new THREE.Vector3(Math.cos(a) * r * 1.4, Math.sin(a) * r * 0.75, -40 - (index % 4) * 28),
    rotation: new THREE.Euler((Math.sin(a * 3) * 0.6), Math.cos(a * 2) * 0.9, Math.sin(a) * 0.35),
  };
}

// ── Materials ─────────────────────────────────────────────────────────────────────────

export const GLASS_VERT = /* glsl */ `
  uniform vec2 uSize;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vFront;
  void main() {
    vUv = position.xy / uSize + 0.5;
    vNormal = normalize(normalMatrix * normal);
    vFront = step(0.5, normal.z);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

export const GLASS_FRAG = /* glsl */ `
  uniform sampler2D tBackdrop;
  uniform sampler2D tArt;
  uniform vec2 uResolution;
  uniform float uGlass;
  uniform float uHover;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vFront;
  void main() {
    vec2 suv = gl_FragCoord.xy / uResolution;
    vec3 blur = vec3(0.0);
    for (int x = -2; x <= 2; x++) for (int y = -2; y <= 2; y++) {
      blur += texture2D(tBackdrop, suv + vec2(float(x), float(y)) * 0.006).rgb;
    }
    blur /= 25.0;
    float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.5);
    vec3 glass = blur * 1.15 + vec3(0.08, 0.1, 0.16) + fres * vec3(0.55, 0.65, 0.9);
    vec4 art = texture2D(tArt, vUv);
    vec3 col;
    float alpha;
    if (uGlass > 0.5) {
      col = mix(glass, art.rgb, art.a * vFront);
      alpha = 0.82;
    } else {
      col = mix(glass, art.rgb, art.a * vFront);
      alpha = mix(0.0, 1.0, max(art.a * vFront, fres * 0.9 + (1.0 - vFront) * 0.6));
    }
    col += uHover * 0.06 + fres * 0.12;
    gl_FragColor = vec4(col, alpha);
  }
`;

export function panelGeometry(w, h, radius, depth) {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  const r = Math.min(radius, w / 2, h / 2);
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.4,
    bevelSize: Math.min(0.35, r * 0.4),
    bevelSegments: 3,
    curveSegments: 10,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

export const BACKDROP_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  varying vec2 vUv;
  vec3 blob(vec2 uv, vec2 c, float r, vec3 col) { float d = length(uv - c); return col * smoothstep(r, 0.0, d); }
  void main() {
    vec2 uv = vUv;
    float t = uTime * 0.06;
    vec3 col = vec3(0.025, 0.03, 0.06);
    col += blob(uv, vec2(0.3 + sin(t * 1.3) * 0.12, 0.62 + cos(t) * 0.1) + uPointer * 0.03, 0.5, vec3(0.04, 0.28, 0.7));
    col += blob(uv, vec2(0.72 + cos(t * 0.9) * 0.1, 0.38 + sin(t * 1.1) * 0.1) - uPointer * 0.02, 0.45, vec3(0.42, 0.18, 0.72));
    col += blob(uv, vec2(0.58 + sin(t * 0.7) * 0.15, 0.8 + cos(t * 1.4) * 0.06), 0.3, vec3(0.7, 0.45, 0.12));
    col += blob(uv, vec2(0.15 + cos(t * 1.7) * 0.06, 0.2 + sin(t * 0.8) * 0.08), 0.28, vec3(0.05, 0.45, 0.42));
    gl_FragColor = vec4(col, 1.0);
  }
`;

export const FINISH = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime; varying vec2 vUv;
    float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      vec2 c = vUv - 0.5;
      col *= 1.0 - dot(c, c) * 0.9;
      col += (rand(vUv * 800.0 + uTime) - 0.5) * 0.035;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

// ── Scene ─────────────────────────────────────────────────────────────────────────────

export async function createDashboard3D(container) {
  await document.fonts.ready;

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.domElement.className = 'hero3d-canvas';
  container.prepend(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.5, 600);
  camera.position.set(0, 0, 105);

  // Backdrop scene (also rendered small into a target that the glass samples).
  const backdropScene = new THREE.Scene();
  const backdropCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const backdropMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPointer: { value: new THREE.Vector2() } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: BACKDROP_FRAG,
    depthWrite: false,
  });
  backdropScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), backdropMaterial));
  const backdropTarget = new THREE.WebGLRenderTarget(256, 160, { type: THREE.HalfFloatType });

  const scene = new THREE.Scene();
  const rig = new THREE.Group();
  scene.add(rig);

  const resolution = new THREE.Vector2(1, 1);
  const panels = PANELS.map((spec, index) => {
    const geometry = spec.bare
      ? new THREE.PlaneGeometry(spec.w, spec.h)
      : panelGeometry(spec.w, spec.h, spec.kind === 'island' || spec.kind === 'dock' || spec.kind === 'search' ? spec.h / 2 : 1.6, 0.9);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        tBackdrop: { value: backdropTarget.texture },
        tArt: { value: artTexture(spec.kind, spec.w, spec.h, renderer) },
        uResolution: { value: resolution },
        uSize: { value: new THREE.Vector2(spec.w, spec.h) },
        uGlass: { value: spec.glass ? 1 : 0 },
        uHover: { value: 0 },
      },
      vertexShader: GLASS_VERT,
      fragmentShader: GLASS_FRAG,
      transparent: true,
    });
    if (spec.bare) {
      material.uniforms.uGlass.value = 0;
      geometry.computeVertexNormals();
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.index = index;
    rig.add(mesh);
    const scatter = scatterFor(index);
    return {
      spec,
      mesh,
      final: new THREE.Vector3(...spec.at),
      scatter,
      hover: 0,
      phase: index * 1.37,
    };
  });

  const composer = new EffectComposer(renderer);
  const backdropPass = new RenderPass(backdropScene, backdropCam);
  composer.addPass(backdropPass);
  const scenePass = new RenderPass(scene, camera);
  scenePass.clear = false;
  scenePass.clearDepth = true;
  composer.addPass(scenePass);
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.5, 0.82));
  const finish = new ShaderPass(FINISH);
  composer.addPass(finish);
  composer.addPass(new OutputPass());

  const state = { progress: 0, smooth: 0, px: 0, py: 0, spx: 0, spy: 0, hovered: null };
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2(-10, -10);

  const onPointer = (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    state.px = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    state.py = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    ndc.set(state.px, state.py);
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  let width = 1;
  let height = 1;
  const resize = () => {
    width = container.clientWidth;
    height = container.clientHeight;
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    const dpr = renderer.getPixelRatio();
    resolution.set(width * dpr, height * dpr);
    camera.aspect = width / height;
    // Keep the whole layout in view on narrower screens.
    camera.position.z = 105 * Math.max(1, 1.62 / camera.aspect);
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  let running = true;
  const start = performance.now();
  let last = start;
  const tmpQ = new THREE.Quaternion();
  const finalQ = new THREE.Quaternion();

  function frame() {
    if (!running) return;
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = (now - start) / 1000;
    const k = 1 - Math.exp(-dt * 4);
    state.smooth += (state.progress - state.smooth) * k;
    state.spx += (state.px - state.spx) * k;
    state.spy += (state.py - state.spy) * k;

    // Assemble: each panel arrives with a small stagger.
    panels.forEach((panel, i) => {
      // Every panel has landed by ~85% of the scroll, so the finished tab holds briefly.
      const local = ease(clamp01((state.smooth * 1.15 - i * 0.03) / 0.82));
      const drift = 1 - local;
      const p = panel.mesh.position;
      p.lerpVectors(panel.scatter.position, panel.final, local);
      p.y += Math.sin(t * 0.8 + panel.phase) * 1.4 * drift + Math.sin(t * 0.6 + panel.phase) * 0.25;
      p.z += panel.hover * 3;
      tmpQ.setFromEuler(new THREE.Euler(
        panel.scatter.rotation.x + Math.sin(t * 0.5 + panel.phase) * 0.1,
        panel.scatter.rotation.y + Math.cos(t * 0.4 + panel.phase) * 0.12,
        panel.scatter.rotation.z,
      ));
      panel.mesh.quaternion.slerpQuaternions(tmpQ, finalQ, local);
      const target = state.hovered === i ? 1 : 0;
      panel.hover += (target - panel.hover) * 0.12;
      panel.mesh.material.uniforms.uHover.value = panel.hover;
    });

    // Whole scene tilts toward the pointer; settles flatter once assembled.
    const tilt = 0.18 - state.smooth * 0.1;
    rig.rotation.y += (state.spx * tilt - rig.rotation.y) * 0.08;
    rig.rotation.x += (-state.spy * tilt * 0.7 - rig.rotation.x) * 0.08;
    rig.position.z = (1 - ease(clamp01(state.smooth * 1.15))) * -10;

    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(panels.map((p) => p.mesh))[0];
    state.hovered = hit ? hit.object.userData.index : null;

    backdropMaterial.uniforms.uTime.value = t;
    backdropMaterial.uniforms.uPointer.value.set(state.spx, state.spy);
    finish.uniforms.uTime.value = t;

    // Backdrop into the small target (for frosted glass), then the full frame.
    renderer.setRenderTarget(backdropTarget);
    renderer.render(backdropScene, backdropCam);
    renderer.setRenderTarget(null);
    composer.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    setProgress(p) { state.progress = clamp01(p); },
    pause() { running = false; },
    resume() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } },
    dispose() {
      running = false;
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
