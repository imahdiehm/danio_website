/* Decorative data flow only; no simulation is performed in this diagram. */
(() => {
  'use strict';
  const figure = document.querySelector('.architecture-figure');
  if (!figure) return;
  const button = figure.querySelector('.architecture-motion');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const persian = document.documentElement.lang === 'fa';
  let requested = !motion.matches;
  let visible = false;
  function update() {
    const running = requested && visible && !document.hidden;
    figure.dataset.motion = running ? 'running' : 'paused';
    button.setAttribute('aria-pressed', String(requested));
    button.textContent = persian
      ? (requested ? 'توقف حرکت دیاگرام' : 'اجرای حرکت دیاگرام')
      : (requested ? 'Pause diagram motion' : 'Play diagram motion');
  }
  button.hidden = false;
  button.addEventListener('click', () => { requested = !requested; update(); });
  document.addEventListener('visibilitychange', update);
  motion.addEventListener('change', () => { requested = !motion.matches; update(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    }).observe(figure);
  } else {
    visible = true;
  }
  update();
})();
