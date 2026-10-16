// WebGL heading layer: every heading is redrawn as 3D letters (troika SDF text) on a fixed
// canvas, aligned to the real DOM text, which stays in place (transparent) for SEO,
// selection and screen readers.
//
// As a heading scrolls into view its letters fly in from depth with a stagger; as it leaves
// through the top they scatter toward the camera. A field of particles at different depths
// gives the page parallax. Everything is driven from GSAP's ticker (the same clock as Lenis).

import * as THREE from 'three';
import { Text, preloadFont } from 'troika-three-text';
import { gsap } from 'gsap';
import { HEADING_SELECTOR, splitHeading } from './split.js';

const FONTS = {
  semibold: '/fonts/gl/ClashDisplay-Semibold.woff',
  medium: '/fonts/gl/ClashDisplay-Medium.woff',
};
const FOV = 35;
const STAGGER = 0.55;
const DAMPING = 7;
const INTRO_SECONDS = 1.8;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeIn = (t) => t * t * t;

// Deterministic pseudo-random per character, so scatter directions are stable.
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function preload(url) {
  return new Promise((resolve) => preloadFont({ font: url, characters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,&!?\'’-' }, resolve));
}

function syncText(text) {
  return new Promise((resolve) => text.sync(resolve));
}

// ── Particles: soft points at many depths; nearer ones move faster with the scroll ──────

const PARTICLE_VERT = /* glsl */ `
  uniform float uScroll;
  uniform float uTime;
  uniform float uRange;
  uniform float uHalfH;
  uniform float uPixelRatio;
  attribute float aSpeed;
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    vec3 p = position;
    float y = mod(p.y - uScroll * aSpeed, uRange);
    p.y = uHalfH + uRange * 0.18 - y;
    p.x += sin(uTime * 0.25 + position.y * 0.004) * 18.0;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (900.0 / -mv.z);
    vColor = aColor;
    vFade = smoothstep(0.0, 0.12, y / uRange) * (1.0 - smoothstep(0.85, 1.0, y / uRange));
  }
`;

const PARTICLE_FRAG = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, a * a * uOpacity * vFade);
  }
`;

function createParticles(count) {
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  const sizes = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const palette = [new THREE.Color('#0a84ff'), new THREE.Color('#ffffff'), new THREE.Color('#e3b04b'), new THREE.Color('#7fb8ff')];
  for (let i = 0; i < count; i += 1) {
    const depth = Math.random();
    positions[i * 3] = (Math.random() - 0.5) * 2600;
    positions[i * 3 + 1] = Math.random() * 4000;
    positions[i * 3 + 2] = -1800 + depth * 1900;
    speeds[i] = 0.25 + depth * 1.2; // closer → faster: parallax
    sizes[i] = 3 + Math.random() * 7;
    const c = palette[Math.random() < 0.55 ? 0 : Math.random() < 0.6 ? 1 : Math.random() < 0.5 ? 2 : 3];
    colors.set([c.r, c.g, c.b], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.ShaderMaterial({
    vertexShader: PARTICLE_VERT,
    fragmentShader: PARTICLE_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uScroll: { value: 0 },
      uTime: { value: 0 },
      uRange: { value: 4000 },
      uHalfH: { value: 450 },
      uPixelRatio: { value: 1 },
      uOpacity: { value: 0.55 },
    },
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

// ── Headings ───────────────────────────────────────────────────────────────────────────

async function buildHeading(el, index) {
  const chars = splitHeading(el);
  const style = getComputedStyle(el);
  const font = Number(style.fontWeight) >= 600 ? FONTS.semibold : FONTS.medium;
  const fontSize = parseFloat(style.fontSize);
  const color = style.color;

  const group = new THREE.Group();
  const letters = [];
  for (let i = 0; i < chars.length; i += 1) {
    const pivot = new THREE.Object3D();
    const text = new Text();
    text.text = chars[i].textContent;
    text.font = font;
    text.fontSize = fontSize;
    text.color = color;
    text.anchorX = 'center';
    text.anchorY = 'middle';
    text.lineHeight = 'normal';
    text.material.depthWrite = false;
    pivot.add(text);
    group.add(pivot);
    const seed = index * 1000 + i;
    letters.push({ pivot, text, span: chars[i], dx: 0, dy: 0, rx: hash(seed) - 0.5, ry: hash(seed + 0.5) - 0.5, rz: hash(seed + 0.25) - 0.5 });
  }
  await Promise.all(letters.map((l) => syncText(l.text)));
  return { el, group, letters, enter: 0, exit: 0, hero: Boolean(el.closest('.hero')) };
}

// Character offsets relative to the heading's box (re-measured on resize / font swap).
function measure(heading) {
  const box = heading.el.getBoundingClientRect();
  heading.baseWidth = box.width || 1;
  for (const letter of heading.letters) {
    const r = letter.span.getBoundingClientRect();
    letter.dx = r.left + r.width / 2 - box.left;
    letter.dy = r.top + r.height / 2 - box.top;
  }
}

export async function initGlText() {
  const canvas = document.createElement('canvas');
  canvas.className = 'gl-layer';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch {
    canvas.remove();
    return false;
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 6000);
  const particles = createParticles(window.innerWidth > 1200 ? 900 : 600);
  scene.add(particles);

  let width = 0;
  let height = 0;
  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // One world unit = one CSS pixel on the z = 0 plane.
    camera.position.z = height / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    camera.updateProjectionMatrix();
    particles.material.uniforms.uHalfH.value = height / 2;
    particles.material.uniforms.uRange.value = Math.max(height * 2.4, 2000);
    particles.material.uniforms.uPixelRatio.value = dpr;
  };
  resize();

  await Promise.all([document.fonts.ready, preload(FONTS.semibold), preload(FONTS.medium)]);

  const headings = [];
  const elements = [...document.querySelectorAll(HEADING_SELECTOR)];
  for (let i = 0; i < elements.length; i += 1) {
    const heading = await buildHeading(elements[i], i);
    measure(heading);
    scene.add(heading.group);
    headings.push(heading);
  }

  // Swap the DOM text for the WebGL letters only once everything is ready (no flash).
  document.documentElement.classList.add('gl-text-ready');

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    resize();
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => headings.forEach(measure), 150);
  });

  // Gentle pointer parallax for the particle field.
  const pointer = { x: 0, y: 0, cx: 0, cy: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX / width - 0.5;
    pointer.y = e.clientY / height - 0.5;
  }, { passive: true });

  const start = performance.now();
  let last = start;

  const update = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const k = 1 - Math.exp(-dt * DAMPING);
    const intro = easeOut(clamp01((now - start) / 1000 / INTRO_SECONDS));

    particles.material.uniforms.uScroll.value = window.scrollY;
    particles.material.uniforms.uTime.value = (now - start) / 1000;
    pointer.cx += (pointer.x - pointer.cx) * k;
    pointer.cy += (pointer.y - pointer.cy) * k;
    particles.rotation.y = pointer.cx * 0.08;
    particles.rotation.x = pointer.cy * 0.05;

    for (const heading of headings) {
      const box = heading.el.getBoundingClientRect();
      const visible = box.bottom > -height * 0.5 && box.top < height * 1.5;
      heading.group.visible = visible;
      if (!visible) continue;

      // Enter: top crosses from 95% to 45% of the viewport. Exit: bottom from 32% to 0%.
      const enterTarget = heading.hero ? intro : Math.min(intro, clamp01((height * 0.95 - box.top) / (height * 0.5)));
      const exitTarget = clamp01((height * 0.32 - box.bottom) / (height * 0.32));
      heading.enter += (enterTarget - heading.enter) * k;
      heading.exit += (exitTarget - heading.exit) * k;

      // Follows the DOM box, including scroll-driven transforms (e.g. the hero shrinking).
      const scale = box.width / heading.baseWidth;
      heading.group.position.set(box.left - width / 2, height / 2 - box.top, 0);
      heading.group.scale.setScalar(scale);

      const n = heading.letters.length;
      heading.letters.forEach((letter, i) => {
        const order = n > 1 ? i / (n - 1) : 0;
        const e = easeOut(clamp01((heading.enter - order * STAGGER) / (1 - STAGGER)));
        const xOrder = n > 1 ? (letter.rx + 0.5) : 0; // random exit order
        const x = easeIn(clamp01((heading.exit - xOrder * STAGGER * 0.6) / (1 - STAGGER * 0.6)));

        const inv = 1 - e;
        letter.pivot.position.set(
          letter.dx + letter.rx * x * 420,
          -letter.dy - inv * 70 + x * (140 + letter.ry * 160),
          -inv * 900 + x * (520 + letter.rz * 300),
        );
        letter.pivot.rotation.set(-inv * 1.5 + x * letter.rx * 2.4, inv * letter.ry * 0.8 + x * letter.ry * 2, x * letter.rz * 2.6);
        letter.text.fillOpacity = e * (1 - x);
      });
    }

    renderer.render(scene, camera);
  };

  gsap.ticker.add(update);
  return true;
}
