// Awwwards-style scroll set pieces (GSAP ScrollTrigger + Lenis velocity).
// Desktop-only pieces (pinning, horizontal gallery, cursor) are skipped on small or touch
// screens, where the same markup reads as a normal vertical page.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const desktop = () => window.matchMedia('(min-width: 900px)').matches;
const finePointer = () => window.matchMedia('(pointer: fine)').matches;

// ── Progress bar ──────────────────────────────────────────────────────────────────────
function progressBar() {
  const bar = document.querySelector('.scroll-progress');
  if (!bar) return;
  gsap.to(bar, {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: 0.3 },
  });
}

// ── Marquees: constant drift, sped up and skewed by scroll velocity ────────────────────
function marquees(lenis) {
  const bands = [...document.querySelectorAll('[data-marquee]')].map((el) => ({
    track: el.querySelector('.marquee-track'),
    dir: Number(el.dataset.marquee) || 1,
    x: 0,
    skew: 0,
  }));
  if (!bands.length) return;
  let velocity = 0;
  lenis?.on('scroll', (e) => { velocity = e.velocity || 0; });
  gsap.ticker.add((_time, delta) => {
    const dt = delta / 1000;
    velocity *= 0.92;
    for (const band of bands) {
      const half = band.track.scrollWidth / 2;
      if (!half) continue;
      const speed = 60 + Math.min(Math.abs(velocity) * 40, 1600);
      const sign = velocity < 0 ? -1 : 1;
      band.x -= band.dir * sign * speed * dt;
      band.x = ((band.x % half) - half) % half; // wrap within [-half, 0)
      band.skew += (gsap.utils.clamp(-12, 12, velocity * -0.6 * band.dir) - band.skew) * 0.12;
      band.track.style.transform = `translate3d(${band.x}px,0,0) skewX(${band.skew}deg)`;
    }
  });
}

// ── Pinned zoom: the dashboard grows from a card to full-bleed ─────────────────────────
function pinnedZoom() {
  const section = document.querySelector('.zoom');
  const frame = section?.querySelector('.zoom-frame');
  if (!section || !frame || !desktop()) return;
  const copy = section.querySelector('.zoom-copy');
  const targetScale = () => (window.innerWidth / frame.offsetWidth) * 1.02;
  gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: '+=170%',
      pin: section.querySelector('.zoom-pin'),
      scrub: 1,
      invalidateOnRefresh: true,
    },
    defaults: { ease: 'none' },
  })
    .to(copy, { y: -140, opacity: 0, duration: 0.35 }, 0)
    .fromTo(frame, { scale: 0.9, y: 40, borderRadius: 20 }, {
      scale: targetScale,
      y: () => -(frame.getBoundingClientRect().top - (window.innerHeight - frame.offsetHeight) / 2) * 0.6,
      borderRadius: 0,
      duration: 0.75,
    }, 0)
    .to(frame, { filter: 'brightness(0.55)', duration: 0.25 }, 0.75);
}

// ── Horizontal gallery: vertical scroll moves the feature panels sideways ──────────────
function horizontalGallery() {
  const section = document.querySelector('.hscroll');
  const track = section?.querySelector('.hscroll-track');
  if (!section || !track || !desktop()) return;
  const distance = () => track.scrollWidth - window.innerWidth;
  const tween = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => `+=${distance()}`,
      pin: section.querySelector('.hscroll-pin'),
      scrub: 1,
      invalidateOnRefresh: true,
    },
  });
  // Inner parallax: screenshots drift against the panel as it crosses the screen.
  track.querySelectorAll('.hpanel').forEach((panel) => {
    const frame = panel.querySelector('.hpanel-frame');
    const copy = panel.querySelector('.hpanel-copy');
    const st = { trigger: panel, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true };
    if (frame) gsap.fromTo(frame, { xPercent: 18, rotateY: -14, transformPerspective: 1400 }, { xPercent: -18, rotateY: 10, ease: 'none', scrollTrigger: st });
    if (copy) gsap.fromTo(copy, { xPercent: -6, opacity: 0.35 }, { xPercent: 6, opacity: 1, ease: 'none', scrollTrigger: { ...st, end: 'center center' } });
  });
}

// ── Stacked cards: each card shrinks and dims as the next one slides over it ───────────
function stackedCards() {
  const cards = gsap.utils.toArray('.stack-card');
  cards.forEach((card, i) => {
    const next = cards[i + 1];
    if (!next) return;
    gsap.to(card, {
      scale: 0.9 + i * 0.012,
      filter: 'brightness(0.72)',
      ease: 'none',
      scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 30%', scrub: true },
    });
  });
}

// ── Statement: words fill in and gain weight with the scroll ───────────────────────────
function statementFill() {
  document.querySelectorAll('.statement[data-fill]').forEach((el) => {
    const label = el.textContent.trim();
    el.setAttribute('aria-label', label);
    el.innerHTML = label.split(/\s+/).map((w) => `<span class="fw" aria-hidden="true">${w}</span>`).join(' ');
    const words = el.querySelectorAll('.fw');
    gsap.to(words, {
      color: '#f5f5f7',
      fontVariationSettings: "'wght' 640",
      stagger: 0.08,
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 45%', scrub: 0.5 },
    });
  });
}

// ── Section tints: the page background shifts colour by section ────────────────────────
function tints() {
  document.querySelectorAll('[data-tint]').forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 55%',
      end: 'bottom 45%',
      onToggle: ({ isActive }) => {
        if (isActive) document.body.dataset.tint = section.dataset.tint;
        else if (document.body.dataset.tint === section.dataset.tint) delete document.body.dataset.tint;
      },
    });
  });
}

// ── Footer wordmark rises out of the footer ────────────────────────────────────────────
function wordmark() {
  const mark = document.querySelector('[data-wordmark]');
  if (!mark) return;
  gsap.fromTo(mark, { yPercent: 55, scale: 0.92 }, {
    yPercent: 0,
    scale: 1,
    ease: 'none',
    scrollTrigger: { trigger: '.site-footer', start: 'top bottom', end: 'bottom bottom', scrub: true },
  });
}

// ── Cursor + magnetic buttons (fine pointers only) ─────────────────────────────────────
function cursor() {
  if (!finePointer() || !desktop()) return;
  const root = document.querySelector('.cursor');
  const dot = root?.querySelector('.cursor-dot');
  const ring = root?.querySelector('.cursor-ring');
  if (!dot || !ring) return;
  document.documentElement.classList.add('has-cursor');
  const pos = { x: innerWidth / 2, y: innerHeight / 2, rx: innerWidth / 2, ry: innerHeight / 2 };
  window.addEventListener('pointermove', (e) => {
    pos.x = e.clientX;
    pos.y = e.clientY;
    const hover = e.target.closest?.('a, button, summary, [data-magnetic]');
    document.documentElement.classList.toggle('cursor-hover', Boolean(hover));
  }, { passive: true });
  gsap.ticker.add(() => {
    pos.rx += (pos.x - pos.rx) * 0.18;
    pos.ry += (pos.y - pos.ry) * 0.18;
    dot.style.transform = `translate3d(${pos.x}px,${pos.y}px,0)`;
    ring.style.transform = `translate3d(${pos.rx}px,${pos.ry}px,0)`;
  });

  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const strength = 0.35;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, {
        x: (e.clientX - (r.left + r.width / 2)) * strength,
        y: (e.clientY - (r.top + r.height / 2)) * strength,
        duration: 0.4,
        ease: 'power3.out',
      });
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.35)' }));
  });
}

export function initShowcase(lenis) {
  progressBar();
  marquees(lenis);
  pinnedZoom();
  horizontalGallery();
  stackedCards();
  statementFill();
  tints();
  wordmark();
  cursor();
  ScrollTrigger.refresh();
}
