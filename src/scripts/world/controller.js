// Hero "Tab World" controller: pins the hero while the scroll drives the camera, places the
// HTML beacon labels, opens feature cards, pauses rendering off-screen, and runs the optional
// synthesised soundscape (Web Audio, off by default; no audio files).

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { WORLD_FEATURES } from '../../content/world.js';

gsap.registerPlugin(ScrollTrigger);

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

// ── Sound ──────────────────────────────────────────────────────────────────────────────
function createSound() {
  let ctx = null;
  let master = null;
  const start = () => {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // Wind: filtered brown noise.
    const length = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 420;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.35;
    noise.connect(lowpass).connect(windGain).connect(master);
    noise.start();

    // Drone: two soft detuned tones with a slow swell.
    [55, 82.4, 110.2].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.value = 0.05 / (i + 1);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.03;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.03 / (i + 1);
      lfo.connect(lfoGain).connect(gain.gain);
      osc.connect(gain).connect(master);
      osc.start();
      lfo.start();
    });
  };
  return {
    get on() { return Boolean(master && master.gain.value > 0.001); },
    toggle(on) {
      if (on && !ctx) start();
      if (!ctx) return;
      if (on) ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(on ? 0.6 : 0, ctx.currentTime + 1.2);
    },
    blip(index) {
      if (!ctx || !master || master.gain.value < 0.01) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 440 * 2 ** ([0, 3, 5, 7, 10, 12][index % 6] / 12);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      osc.connect(gain).connect(master);
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
    },
  };
}

// ── Controller ─────────────────────────────────────────────────────────────────────────
export function initWorld() {
  const section = document.querySelector('[data-world]');
  if (!section) return;
  const stage = section.querySelector('[data-world-stage]');
  const intro = section.querySelector('[data-world-intro]');
  const hint = section.querySelector('[data-world-hint]');
  const labels = [...section.querySelectorAll('[data-beacon]')];
  const cards = [...section.querySelectorAll('[data-card]')];
  const soundButton = section.querySelector('[data-sound]');
  const soundLabel = section.querySelector('[data-sound-label]');

  const live = window.matchMedia('(min-width: 900px)').matches && supportsWebGL();
  if (!live) {
    section.classList.add('world-static');
    return;
  }

  let world = null;
  let progress = 0;
  let selected = null;
  const sound = createSound();

  // Pin first (synchronously), so later ScrollTriggers include this pin's spacing.
  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=170%',
    pin: section.querySelector('.world-pin'),
    scrub: true,
    onUpdate: (self) => {
      progress = self.progress;
      world?.setProgress(progress);
    },
    onLeave: () => world?.pause(),
    onEnterBack: () => world?.resume(),
  });
  gsap.to(intro, {
    opacity: 0,
    y: -80,
    filter: 'blur(10px)',
    ease: 'none',
    scrollTrigger: { trigger: section, start: 'top top', end: '+=55%', scrub: true },
  });
  gsap.to(hint, {
    opacity: 0,
    ease: 'none',
    scrollTrigger: { trigger: section, start: '+=120%', end: '+=170%', scrub: true },
  });

  const openCard = (index) => {
    if (index === selected) return;
    selected = index;
    world?.select(index);
    cards.forEach((card, i) => {
      const open = i === index;
      card.hidden = !open;
      card.classList.toggle('is-open', open);
    });
    section.classList.toggle('world-focused', index !== null);
    if (index !== null) {
      sound.blip(index);
      cards[index].querySelector('a, button')?.focus({ preventScroll: true });
    }
  };

  labels.forEach((label) => label.addEventListener('click', () => openCard(Number(label.dataset.beacon))));
  cards.forEach((card) => card.querySelector('[data-close]').addEventListener('click', () => openCard(null)));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && selected !== null) openCard(null);
  });

  soundButton.addEventListener('click', () => {
    const on = soundButton.getAttribute('aria-pressed') !== 'true';
    sound.toggle(on);
    soundButton.setAttribute('aria-pressed', String(on));
    soundLabel.textContent = on ? 'Sound on' : 'Sound off';
  });

  // Load the 3D world (separate chunk) once the page has painted.
  const boot = async () => {
    try {
      const { createWorld } = await import('./world.js');
      world = await createWorld(stage, WORLD_FEATURES);
      world.setProgress(progress);
      section.classList.add('world-ready');
      world.onHover((index) => {
        labels.forEach((label, i) => label.classList.toggle('is-hover', i === index));
        if (index !== null) sound.blip(index);
      });
      world.onSelect((index) => openCard(index));
      world.onFrame((beacons) => {
        beacons.forEach((beacon, i) => {
          const s = beacon.screen;
          const label = labels[i];
          if (!s || !label) return;
          label.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) translate(-50%, -100%)`;
          label.classList.toggle('is-hidden', !s.visible || selected !== null);
        });
      });
    } catch (err) {
      console.warn('[world] 3D hero unavailable:', err);
      section.classList.add('world-static');
    }
  };
  if ('requestIdleCallback' in window) requestIdleCallback(boot, { timeout: 800 });
  else setTimeout(boot, 200);
}
