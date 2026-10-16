// Pins the hero while the scroll assembles the floating glass dashboard, fades the intro
// copy out, and pauses rendering once the hero has been scrolled past.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function initHero3D() {
  const section = document.querySelector('[data-hero3d]');
  if (!section) return;
  const live = window.matchMedia('(min-width: 900px)').matches && supportsWebGL();
  if (!live) {
    section.classList.add('hero3d-static');
    return;
  }

  let scene = null;
  let progress = 0;

  // Pin first (synchronously), so later ScrollTriggers include this pin's spacing.
  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=160%',
    pin: section.querySelector('.hero3d-pin'),
    scrub: true,
    onUpdate: (self) => {
      progress = self.progress;
      scene?.setProgress(progress);
    },
    onLeave: () => scene?.pause(),
    onEnterBack: () => scene?.resume(),
  });

  gsap.to(section.querySelector('[data-hero3d-intro]'), {
    opacity: 0,
    scale: 0.92,
    filter: 'blur(12px)',
    ease: 'none',
    scrollTrigger: { trigger: section, start: 'top top', end: '+=45%', scrub: true },
  });
  gsap.to(section.querySelector('[data-hero3d-hint]'), {
    opacity: 0,
    ease: 'none',
    scrollTrigger: { trigger: section, start: 'top top', end: '+=30%', scrub: true },
  });

  const boot = async () => {
    try {
      const { createDashboard3D } = await import('./dashboard3d.js');
      scene = await createDashboard3D(section.querySelector('[data-hero3d-stage]'));
      scene.setProgress(progress);
      section.classList.add('hero3d-ready');
    } catch (err) {
      console.warn('[hero3d] unavailable:', err);
      section.classList.add('hero3d-static');
    }
  };
  if ('requestIdleCallback' in window) requestIdleCallback(boot, { timeout: 800 });
  else setTimeout(boot, 200);
}
