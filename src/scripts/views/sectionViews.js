// 3D scenes for every product frame on the page ([data-view] elements). One fixed WebGL
// canvas renders each visible frame's scene into that frame's rectangle (scissor), so the
// page needs a single context however many scenes it has. Scenes reuse the hero's glass kit.

import * as THREE from 'three';
import {
  ART,
  FONT_BODY,
  FONT_DISPLAY,
  GLASS_FRAG,
  GLASS_VERT,
  BACKDROP_FRAG,
  artTexture,
  panelGeometry,
  roundRect,
  sparkline,
} from '../hero/dashboard3d.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const lerp = THREE.MathUtils.lerp;

// ── Extra artwork for the section scenes ───────────────────────────────────────────────
Object.assign(ART, {
  answer(ctx, w, h) {
    ctx.fillStyle = 'rgba(10,132,255,0.16)';
    roundRect(ctx, 0, 0, w, h, h * 0.14);
    ctx.fill();
    ctx.fillStyle = '#7fb8ff';
    ctx.font = `700 ${h * 0.11}px ${FONT_BODY}`;
    ctx.textAlign = 'left';
    ctx.fillText('CURRENCY', w * 0.06, h * 0.22);
    ctx.fillStyle = '#fff';
    ctx.font = `600 ${h * 0.34}px ${FONT_DISPLAY}`;
    ctx.fillText('₹8,342.50', w * 0.05, h * 0.62);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `500 ${h * 0.1}px ${FONT_BODY}`;
    ctx.fillText('100 USD = 8,342.50 INR  ·  Enter to copy', w * 0.06, h * 0.84);
  },
  watchlist(ctx, w, h) {
    const rows = [
      ['NIFTY 50', '23,111.90', '+0.50%', true],
      ['SENSEX', '74,057.15', '+0.42%', true],
      ['RELIANCE', '1,205.20', '-0.31%', false],
      ['Gold 24K', '₹13,891', '+1.25%', true],
    ];
    const rh = h / rows.length;
    rows.forEach(([name, price, change, up], i) => {
      const y = i * rh;
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)';
      roundRect(ctx, 0, y + rh * 0.08, w, rh * 0.84, rh * 0.22);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.font = `600 ${rh * 0.3}px ${FONT_BODY}`;
      ctx.fillText(name, w * 0.05, y + rh * 0.6);
      ctx.textAlign = 'right';
      ctx.font = `500 ${rh * 0.28}px ${FONT_BODY}`;
      ctx.fillText(price, w * 0.68, y + rh * 0.6);
      ctx.fillStyle = up ? '#30d158' : '#ff6961';
      roundRect(ctx, w * 0.73, y + rh * 0.24, w * 0.23, rh * 0.52, rh * 0.18);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = `700 ${rh * 0.26}px ${FONT_BODY}`;
      ctx.fillText(change, w * 0.845, y + rh * 0.6);
    });
  },
  keycap(ctx, w, h, label) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2c2f3a');
    g.addColorStop(1, '#16181f');
    ctx.fillStyle = g;
    roundRect(ctx, 0, 0, w, h, h * 0.18);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = `600 ${h * 0.34}px ${FONT_BODY}`;
    ctx.fillText(label, w / 2, h * 0.62);
  },
  photo(ctx, w, h, seed = 0) {
    const palettes = [
      ['#0b1d3a', '#1f4f8f', '#f2a65a'], ['#1a0f2e', '#5b2a86', '#ff7eb6'], ['#0d2b26', '#1f6f5c', '#c9f2c7'],
      ['#2b1405', '#8a3f12', '#ffd27a'], ['#06121f', '#14455e', '#7fd6ff'], ['#1d0b0b', '#7a1f2b', '#ffb199'],
      ['#101820', '#3a4a5c', '#e8e2d0'],
    ];
    const [a, b, c] = palettes[seed % palettes.length];
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, a);
    sky.addColorStop(0.65, b);
    sky.addColorStop(1, c);
    ctx.fillStyle = sky;
    roundRect(ctx, 0, 0, w, h, w * 0.05);
    ctx.fill();
    ctx.save();
    roundRect(ctx, 0, 0, w, h, w * 0.05);
    ctx.clip();
    ctx.fillStyle = c;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(w * (0.3 + (seed % 3) * 0.2), h * 0.42, h * 0.1, 0, Math.PI * 2);
    ctx.fill();
    for (let layer = 0; layer < 3; layer += 1) {
      ctx.globalAlpha = 0.55 + layer * 0.2;
      ctx.fillStyle = layer === 2 ? '#05070c' : a;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= 12; x += 1) {
        const px = (x / 12) * w;
        const py = h * (0.55 + layer * 0.12) - Math.abs(Math.sin(x * 0.9 + seed + layer * 2)) * h * (0.18 - layer * 0.04);
        ctx.lineTo(px, py);
      }
      ctx.lineTo(w, h);
      ctx.fill();
    }
    ctx.restore();
  },
  disc(ctx, w, h) {
    const c = w / 2;
    const g = ctx.createConicGradient(0, c, c);
    ['#8c5aff', '#0a84ff', '#ff5ea8', '#ffb340', '#8c5aff'].forEach((col, i, arr) => g.addColorStop(i / (arr.length - 1), col));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c, c, c, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    for (let r = c * 0.42; r < c; r += c * 0.06) {
      ctx.lineWidth = c * 0.008;
      ctx.beginPath();
      ctx.arc(c, c, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#0b0b0f';
    ctx.beginPath();
    ctx.arc(c, c, c * 0.12, 0, Math.PI * 2);
    ctx.fill();
  },
  layer(ctx, w, h) {
    // A full new-tab "wallpaper" plate for the exploded view.
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#0b2a6b');
    g.addColorStop(0.5, '#43207a');
    g.addColorStop(1, '#7a4a12');
    ctx.fillStyle = g;
    roundRect(ctx, 0, 0, w, h, w * 0.03);
    ctx.fill();
  },
});

function textureFor(renderer, kind, w, h, ...args) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * 64);
  canvas.height = Math.round(h * 64);
  ART[kind](canvas.getContext('2d'), canvas.width, canvas.height, ...args);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

// ── Shared glass panel factory ─────────────────────────────────────────────────────────
function makePanel(ctx, { kind, w, h, glass = false, radius = 1.2, depth = 0.8, args = [], bare = false }) {
  const geometry = bare ? new THREE.PlaneGeometry(w, h) : panelGeometry(w, h, radius, depth);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      tBackdrop: { value: ctx.backdropTarget.texture },
      tArt: { value: args.length ? textureFor(ctx.renderer, kind, w, h, ...args) : artTexture(kind, w, h, ctx.renderer) },
      uResolution: { value: ctx.resolution },
      uSize: { value: new THREE.Vector2(w, h) },
      uGlass: { value: glass ? 1 : 0 },
      uHover: { value: 0 },
    },
    vertexShader: GLASS_VERT,
    fragmentShader: GLASS_FRAG,
    transparent: true,
  });
  return new THREE.Mesh(geometry, material);
}

function baseScene() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.5, 500);
  camera.position.set(0, 0, 60);
  const rig = new THREE.Group();
  scene.add(rig);
  return { scene, camera, rig };
}

// ── Scenes ─────────────────────────────────────────────────────────────────────────────

const SCENES = {
  // Dashboard layers separating in depth and tilting to an isometric angle.
  dashboard(ctx) {
    const s = baseScene();
    s.camera.position.z = 74;
    const plate = makePanel(ctx, { kind: 'layer', w: 56, h: 35, radius: 2, depth: 0.6 });
    const clock = makePanel(ctx, { kind: 'clock', w: 26, h: 11.5, bare: true });
    const search = makePanel(ctx, { kind: 'search', w: 30, h: 3.4, glass: true, radius: 1.7 });
    const stack = [
      makePanel(ctx, { kind: 'weather', w: 9, h: 9 }),
      makePanel(ctx, { kind: 'gold', w: 9, h: 9 }),
      makePanel(ctx, { kind: 'markets', w: 9, h: 9 }),
    ];
    const dock = makePanel(ctx, { kind: 'dock', w: 32, h: 4.4, glass: true, radius: 2.2 });
    const island = makePanel(ctx, { kind: 'island', w: 12, h: 2.6, radius: 1.3 });
    clock.position.set(0, 3.5, 0);
    search.position.set(0, -4.5, 0);
    stack.forEach((card, i) => card.position.set(20, 10 - i * 10, 0));
    dock.position.set(0, -14, 0);
    island.position.set(0, 14.5, 0);
    const layers = [plate, clock, search, ...stack, dock, island];
    const depthOf = [0, 1, 1.4, 2, 2.2, 2.4, 3, 3.3];
    s.rig.add(...layers);
    return {
      ...s,
      update(t, p) {
        const e = ease(clamp01(p * 1.3 - 0.1));
        layers.forEach((layer, i) => { layer.position.z = depthOf[i] * e * 7; });
        s.rig.rotation.x = -e * 0.85;
        s.rig.rotation.z = e * 0.5;
        s.rig.rotation.y = Math.sin(t * 0.3) * 0.05;
        s.rig.position.y = -e * 4;
      },
    };
  },

  // Smart Stack: four cards on a vertical flip wheel.
  stack(ctx) {
    const s = baseScene();
    const kinds = ['weather', 'currency', 'gold', 'markets'];
    const cards = kinds.map((kind) => makePanel(ctx, { kind, w: 20, h: 20, radius: 2.4, depth: 1.2 }));
    const wheel = new THREE.Group();
    const R = 11;
    cards.forEach((card, i) => {
      const holder = new THREE.Group();
      holder.rotation.x = (i / kinds.length) * Math.PI * 2;
      card.position.z = R;
      holder.add(card);
      wheel.add(holder);
    });
    s.rig.add(wheel);
    return {
      ...s,
      update(t, p, pointer) {
        const steps = p * (kinds.length - 1);
        const snapped = Math.floor(steps) + ease(steps % 1);
        wheel.rotation.x = -(snapped / kinds.length) * Math.PI * 2;
        s.rig.rotation.y = pointer.x * 0.35 + Math.sin(t * 0.5) * 0.08;
        s.rig.rotation.x = -pointer.y * 0.2;
      },
    };
  },

  // Spotlight: bar + answer card + Ctrl/K keycaps.
  spotlight(ctx) {
    const s = baseScene();
    const bar = makePanel(ctx, { kind: 'search', w: 34, h: 4, glass: true, radius: 2 });
    const answer = makePanel(ctx, { kind: 'answer', w: 30, h: 9, radius: 1.4, depth: 0.6 });
    const ctrl = makePanel(ctx, { kind: 'keycap', w: 7, h: 5, radius: 1, depth: 2, args: ['Ctrl'] });
    const k = makePanel(ctx, { kind: 'keycap', w: 5, h: 5, radius: 1, depth: 2, args: ['K'] });
    bar.position.set(0, 6, 0);
    answer.position.set(0, -2.5, 0);
    ctrl.position.set(-6, -13, 2);
    k.position.set(2.5, -13, 2);
    s.rig.add(bar, answer, ctrl, k);
    return {
      ...s,
      update(t, p, pointer) {
        const loop = t % 3.2;
        const press = (start) => Math.max(0, 1 - Math.abs(loop - start) * 6);
        ctrl.position.z = 2 - press(0.4) * 1.2;
        k.position.z = 2 - press(0.65) * 1.2;
        const reveal = ease(clamp01((loop - 0.8) / 0.6)) * (loop < 2.8 ? 1 : 1 - (loop - 2.8) / 0.4);
        answer.position.z = lerp(-8, 3, reveal);
        answer.material.uniforms.uHover.value = reveal * 0.5;
        answer.scale.setScalar(lerp(0.9, 1, reveal));
        s.rig.rotation.y = pointer.x * 0.3 + Math.sin(t * 0.4) * 0.06 - 0.15 + p * 0.3;
        s.rig.rotation.x = -pointer.y * 0.2 + 0.12;
      },
    };
  },

  // Markets: a glowing 3D chart ribbon that draws in + watchlist.
  markets(ctx) {
    const s = baseScene();
    const points = [];
    let v = 0;
    for (let i = 0; i <= 60; i += 1) {
      v += Math.sin(i * 0.45) * 0.55 + Math.cos(i * 0.17) * 0.35 + 0.08;
      points.push(new THREE.Vector3(-22 + (i / 60) * 44, v * 0.9 - 2, 0));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 300, 0.35, 10, false),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd27a') }),
    );
    // Soft area under the line.
    const shape = new THREE.Shape();
    shape.moveTo(points[0].x, -10);
    points.forEach((pt) => shape.lineTo(pt.x, pt.y));
    shape.lineTo(points[points.length - 1].x, -10);
    const area = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#e3b04b'), transparent: true, opacity: 0.16, side: THREE.DoubleSide }),
    );
    area.position.z = -0.2;
    const chart = new THREE.Group();
    chart.add(area, tube);
    chart.position.set(0, 3, -6);
    const list = makePanel(ctx, { kind: 'watchlist', w: 26, h: 13, glass: true, radius: 1.4 });
    list.position.set(-6, -10, 4);
    s.rig.add(chart, list);
    const total = tube.geometry.index.count;
    return {
      ...s,
      update(t, p, pointer) {
        const draw = ease(clamp01(p * 1.6));
        tube.geometry.setDrawRange(0, Math.floor((total * draw) / 6) * 6);
        area.material.opacity = 0.16 * draw;
        s.rig.rotation.y = pointer.x * 0.3 - 0.25 + Math.sin(t * 0.35) * 0.05;
        s.rig.rotation.x = -pointer.y * 0.2 + 0.18;
        list.position.y = -10 + Math.sin(t * 0.8) * 0.4;
      },
    };
  },

  // Wallpapers: a rotating carousel of photo cards.
  wallpapers(ctx) {
    const s = baseScene();
    const ring = new THREE.Group();
    const count = 7;
    const cards = [];
    for (let i = 0; i < count; i += 1) {
      const card = makePanel(ctx, { kind: 'photo', w: 14, h: 9.5, radius: 0.8, depth: 0.4, args: [i] });
      const holder = new THREE.Group();
      holder.rotation.y = (i / count) * Math.PI * 2;
      card.position.z = 19;
      holder.add(card);
      ring.add(holder);
      cards.push(card);
    }
    s.camera.position.set(0, 6, 62);
    s.camera.lookAt(0, 0, 0);
    s.rig.add(ring);
    return {
      ...s,
      update(t, p, pointer) {
        ring.rotation.y = -p * Math.PI * 1.4 - t * 0.05 + pointer.x * 0.25;
        s.rig.rotation.x = 0.12 - pointer.y * 0.12;
        cards.forEach((card, i) => {
          const world = new THREE.Vector3();
          card.getWorldPosition(world);
          const front = clamp01((world.z + 5) / 24);
          card.material.uniforms.uHover.value = front * 0.4;
          card.scale.setScalar(0.85 + front * 0.25 + (i === 0 ? 0 : 0));
        });
      },
    };
  },

  // Music: spinning disc, glass island and equaliser bars.
  music(ctx) {
    const s = baseScene();
    const discTexture = textureFor(ctx.renderer, 'disc', 20, 20);
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(10, 10, 0.6, 64),
      [
        new THREE.MeshBasicMaterial({ color: '#0b0b0f' }),
        new THREE.MeshBasicMaterial({ map: discTexture }),
        new THREE.MeshBasicMaterial({ map: discTexture }),
      ],
    );
    disc.rotation.x = Math.PI / 2;
    disc.position.set(-8, 2, -4);
    const island = makePanel(ctx, { kind: 'island', w: 22, h: 4.8, radius: 2.4 });
    island.position.set(6, -9, 4);
    const bars = [];
    const barMaterial = new THREE.MeshBasicMaterial({ color: '#b48cff' });
    for (let i = 0; i < 12; i += 1) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1, 0.9), barMaterial);
      bar.position.set(6 + i * 1.5, 4, 0);
      bars.push(bar);
    }
    s.rig.add(disc, island, ...bars);
    return {
      ...s,
      update(t, p, pointer) {
        disc.rotation.y = t * 1.4;
        bars.forEach((bar, i) => {
          const hgt = 1.5 + Math.abs(Math.sin(t * 3 + i * 0.7)) * 7 + Math.abs(Math.sin(t * 1.3 + i)) * 3;
          bar.scale.y = hgt;
          bar.position.y = -1 + hgt / 2;
        });
        s.rig.rotation.y = pointer.x * 0.3 - 0.2 + p * 0.3;
        s.rig.rotation.x = -pointer.y * 0.2 + 0.1;
      },
    };
  },
};

// ── Renderer ───────────────────────────────────────────────────────────────────────────

export async function initSectionViews() {
  const elements = [...document.querySelectorAll('[data-view]')].filter((el) => SCENES[el.dataset.view]);
  if (!elements.length) return false;
  await document.fonts.ready;

  const canvas = document.createElement('canvas');
  canvas.className = 'views-layer';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    canvas.remove();
    return false;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setScissorTest(true);
  renderer.autoClear = false;

  const resolution = new THREE.Vector2(1, 1);
  const backdropTarget = new THREE.WebGLRenderTarget(256, 160, { type: THREE.HalfFloatType });
  const backdropMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPointer: { value: new THREE.Vector2() } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: BACKDROP_FRAG,
    depthWrite: false,
    depthTest: false,
  });
  const backdropScene = new THREE.Scene();
  backdropScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), backdropMaterial));
  const backdropCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // Clears everything outside the frame's rounded rect, so corners match the DOM frame.
  const maskMaterial = new THREE.ShaderMaterial({
    uniforms: { uRect: { value: new THREE.Vector4() }, uRadius: { value: 0 } },
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform vec4 uRect;
      uniform float uRadius;
      void main() {
        vec2 hs = uRect.zw * 0.5;
        vec2 q = abs(gl_FragCoord.xy - uRect.xy - hs) - hs + uRadius;
        float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
        gl_FragColor = vec4(0.0, 0.0, 0.0, smoothstep(-0.75, 0.75, d));
      }`,
    depthWrite: false,
    depthTest: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.ZeroFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  const maskScene = new THREE.Scene();
  maskScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), maskMaterial));

  const ctx = { renderer, resolution, backdropTarget };
  const views = elements.map((el) => ({ el, scene: SCENES[el.dataset.view](ctx), radius: 0 }));
  elements.forEach((el) => el.classList.add('view-live'));

  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX / window.innerWidth - 0.5;
    pointer.y = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    const dpr = renderer.getPixelRatio();
    resolution.set(window.innerWidth * dpr, window.innerHeight * dpr);
    views.forEach((view) => { view.radius = parseFloat(getComputedStyle(view.el).borderTopLeftRadius) || 0; });
  };
  resize();
  window.addEventListener('resize', resize);

  const start = performance.now();
  const frame = () => {
    const t = (performance.now() - start) / 1000;
    pointer.sx += (pointer.x - pointer.sx) * 0.06;
    pointer.sy += (pointer.y - pointer.sy) * 0.06;
    const W = window.innerWidth;
    const H = window.innerHeight;

    renderer.setScissor(0, 0, W, H);
    renderer.setViewport(0, 0, W, H);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();

    let any = false;
    for (const view of views) {
      // Inset by the 1px border so the DOM frame's edge stays visible around the scene.
      const b = view.el.getBoundingClientRect();
      const r = { left: b.left + 1, top: b.top + 1, right: b.right - 1, bottom: b.bottom - 1, width: b.width - 2, height: b.height - 2 };
      if (r.bottom < 0 || r.top > H || r.right < 0 || r.left > W || r.width < 2) continue;
      if (!any) {
        backdropMaterial.uniforms.uTime.value = t;
        renderer.setRenderTarget(backdropTarget);
        renderer.setViewport(0, 0, 256, 160);
        renderer.setScissor(0, 0, 256, 160);
        renderer.render(backdropScene, backdropCamera);
        renderer.setRenderTarget(null);
        any = true;
      }
      // Progress through the viewport (vertical, or horizontal inside the sideways gallery).
      const vertical = clamp01((H - r.top) / (H + r.height));
      const horizontal = clamp01((W - r.left) / (W + r.width));
      const progress = view.el.closest('.hscroll') && window.matchMedia('(min-width: 900px)').matches ? horizontal : vertical;
      const x = Math.max(0, r.left);
      const y = Math.max(0, H - r.bottom);
      renderer.setViewport(r.left, H - r.bottom, r.width, r.height);
      renderer.setScissor(x, y, Math.min(r.right, W) - x, Math.min(r.bottom, H) - Math.max(0, r.top));
      renderer.clearDepth();
      renderer.render(backdropScene, backdropCamera);
      view.scene.camera.aspect = r.width / r.height;
      view.scene.camera.updateProjectionMatrix();
      view.scene.update(t, progress, { x: pointer.sx, y: pointer.sy });
      renderer.render(view.scene.scene, view.scene.camera);
      const dpr = renderer.getPixelRatio();
      maskMaterial.uniforms.uRect.value.set(r.left * dpr, (H - r.bottom) * dpr, r.width * dpr, r.height * dpr);
      maskMaterial.uniforms.uRadius.value = Math.max(0, view.radius - 1) * dpr;
      renderer.render(maskScene, backdropCamera);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return true;
}
