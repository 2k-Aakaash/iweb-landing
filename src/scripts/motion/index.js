// Motion entry. Content is fully readable without any of this; motion is layered on top.
//   - prefers-reduced-motion: nothing runs (native scrolling, static page)
//   - everyone else: Lenis smooth scroll + GSAP parallax and in/out reveals
//   - WebGL-capable screens ≥ 900px: headings become 3D letters (lazy-loaded Three.js chunk)
//   - smaller screens / no WebGL: headings animate per character in the DOM

import { initSmoothScroll } from './smooth.js';
import { initParallax, initDomHeadings } from './parallax.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

async function start() {
  document.documentElement.classList.add('motion');
  initSmoothScroll();
  initParallax();

  const wantsGl = window.innerWidth >= 900 && supportsWebGL();
  if (!wantsGl) {
    initDomHeadings();
    return;
  }
  try {
    const { initGlText } = await import('./glText.js');
    const ok = await initGlText();
    if (!ok) initDomHeadings();
  } catch (err) {
    console.warn('[motion] WebGL headings unavailable, using DOM animation:', err);
    document.documentElement.classList.remove('gl-text-ready');
    initDomHeadings();
  }
}

if (!reducedMotion) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
