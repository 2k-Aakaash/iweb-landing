// Lenis smooth scrolling, driven by GSAP's ticker so ScrollTrigger and the WebGL layer
// read exactly the same scroll position every frame.

import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const HEADER_OFFSET = -100;

export function initSmoothScroll() {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.4,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // In-page anchors glide instead of jumping.
  document.addEventListener('click', (e) => {
    const link = e.target.closest?.('a[href^="#"]');
    const hash = link?.getAttribute('href');
    if (!hash || hash.length < 2) return;
    const target = document.querySelector(hash);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: HEADER_OFFSET });
    history.replaceState(null, '', hash);
  });

  return lenis;
}
