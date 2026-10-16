// Scroll-scrubbed parallax and in/out reveals (GSAP ScrollTrigger). Runs on every device
// that allows motion; the WebGL heading layer is added on top where supported.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HEADING_SELECTOR, splitHeading } from './split.js';

gsap.registerPlugin(ScrollTrigger);

// Body content that drifts in from below and out above, scrubbed with the scroll.
const REVEAL_SELECTOR = [
  'main .section .eyebrow',
  'main .section .lead',
  'main .section .small',
  'main .section .ticks li',
  'main .section .text-link',
  'main .section .card',
  'main .section .timeline li',
  'main .section .faq details',
  'main .section .steps li',
  'main .section .actions',
  'main .page-hero .eyebrow',
  'main .page-hero .lead',
  'main .prose > *',
].join(',');

// Content in the last screen of the page can never scroll past its exit point, so it
// only animates in (otherwise the end of the page would sit half faded).
function nearPageEnd(el) {
  const top = el.getBoundingClientRect().top + window.scrollY;
  return top > document.documentElement.scrollHeight - window.innerHeight * 1.6;
}

function revealInOut(el, index = 0) {
  const delay = Math.min(index, 6) * 0.025;
  const exits = !nearPageEnd(el);
  const tl = gsap.timeline({
    scrollTrigger: { trigger: el, start: 'top bottom', end: exits ? 'bottom top' : 'top 55%', scrub: 0.6 },
    defaults: { ease: 'none' },
  })
    .fromTo(el, { y: 70, opacity: 0, filter: 'blur(8px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.28 }, delay);
  if (exits) {
    tl.to(el, { y: 0, duration: 0.52 }).to(el, { y: -50, opacity: 0, filter: 'blur(6px)', duration: 0.2 });
  }
}

export function initParallax() {
  // Hero: glow layers drift at different depths, the content lifts away as you leave.
  gsap.utils.toArray('[data-parallax]').forEach((el) => {
    const speed = Number(el.dataset.parallax) || 0.2;
    gsap.fromTo(el, { yPercent: -speed * 50 }, {
      yPercent: speed * 50,
      ease: 'none',
      scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  const heroInner = document.querySelector('.hero-inner');
  if (heroInner) {
    gsap.to(heroInner, {
      yPercent: -18,
      scale: 0.94,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });
    gsap.to('.hero .lead, .hero .actions, .hero-badges', {
      opacity: 0,
      y: -30,
      ease: 'none',
      stagger: 0.04,
      scrollTrigger: { trigger: '.hero', start: '15% top', end: '55% top', scrub: true },
    });
  }

  // Product frames: depth parallax plus a 3D tilt that settles flat mid-screen.
  gsap.utils.toArray('main .frame:not(.zoom-frame):not(.hpanel-frame)').forEach((frame) => {
    gsap.set(frame, { transformPerspective: 1400, transformOrigin: '50% 60%' });
    gsap.timeline({
      scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: 0.8 },
      defaults: { ease: 'none' },
    })
      .fromTo(frame, { y: 140, rotateX: 18, rotateY: -8, scale: 0.86, opacity: 0.4 }, { y: 0, rotateX: 0, rotateY: 0, scale: 1, opacity: 1, duration: 0.45 })
      .to(frame, { y: -120, rotateX: -10, rotateY: 6, scale: 0.94, opacity: 0.55, duration: 0.55 });
  });

  // Body content in and out.
  const groups = new Map();
  gsap.utils.toArray(REVEAL_SELECTOR).forEach((el) => {
    const parent = el.parentElement;
    const index = groups.get(parent) || 0;
    groups.set(parent, index + 1);
    revealInOut(el, index);
  });

  ScrollTrigger.refresh();
}

/**
 * DOM fallback for headings (no WebGL, small screens): characters rise in with a stagger
 * as the heading enters, and fall away as it leaves, scrubbed with the scroll.
 */
export function initDomHeadings() {
  document.querySelectorAll(HEADING_SELECTOR).forEach((heading) => {
    const chars = splitHeading(heading);
    if (!chars.length) return;
    gsap.set(chars, { display: 'inline-block', transformOrigin: '50% 100%' });
    const inHero = Boolean(heading.closest('.hero'));
    const tl = gsap.timeline({
      scrollTrigger: { trigger: heading, start: inHero ? 'top top' : 'top bottom', end: 'bottom top', scrub: 0.6 },
      defaults: { ease: 'none' },
    });
    if (!inHero) {
      tl.fromTo(chars, { yPercent: 110, rotateX: -80, opacity: 0 }, { yPercent: 0, rotateX: 0, opacity: 1, stagger: 0.012, duration: 0.3 });
      tl.to(chars, { yPercent: 0, duration: 0.4 });
    }
    tl.to(chars, { yPercent: -60, rotateX: 60, opacity: 0, stagger: 0.008, duration: 0.3 });
  });
}
