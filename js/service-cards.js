/* TECHGURU — Service cards v3: scroll-in reveal (staggered), icon draw, price count-up,
   unfoldable stories, pointer-follow glow. Event-driven only — no idle rAF loop. */
(function () {
  'use strict';
  function boot(f) { document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', f) : f(); }
  boot(function () {
    try {
      var grid = document.querySelector('.services-grid'); if (!grid) return;
      var cards = [].slice.call(grid.querySelectorAll('.service-card'));
      var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      grid.classList.add('sc-ready');

      cards.forEach(function (c) {
        var b = c.querySelector('.sc-toggle'), l = b && b.querySelector('.sc-toggle-label');
        if (b) b.addEventListener('click', function () {
          var open = c.classList.toggle('is-open');
          b.setAttribute('aria-expanded', open); l.textContent = open ? 'Hide the story' : 'See how it works';
        });
        c.addEventListener('pointermove', function (e) {
          if (e.pointerType === 'touch') return;
          var r = c.getBoundingClientRect();
          c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
        });
      });

      function count(c) {
        if (reduce) return;
        [].forEach.call(c.querySelectorAll('.sc-num'), function (el) {
          var to = +el.getAttribute('data-to'), t0 = null;
          (function step(t) { t0 = t0 || t; var p = Math.min((t - t0) / 1000, 1);
            el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); })(performance.now());
        });
      }
      if (!('IntersectionObserver' in window) || reduce) { cards.forEach(function (c) { c.classList.add('is-in'); }); return; }
      var io = new IntersectionObserver(function (entries) {
        var n = 0;
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.style.setProperty('--dl', (n++ * 120) + 'ms');
          e.target.classList.add('is-in'); count(e.target); io.unobserve(e.target);
        });
      }, { threshold: 0.2 });
      cards.forEach(function (c) { io.observe(c); });
    } catch (err) { /* fail visible */ }
  });
})();
