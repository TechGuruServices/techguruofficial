/* TECHGURU — Cinematic story layer (companion to cinematic.js). Vanilla, rAF-throttled, reduced-motion safe, fails visible. */
(function () {
  'use strict';
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  function boot(fn) { document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn(); }
  boot(function () {
    var root = document.documentElement;
    try {
      root.classList.add('js-story');
      var vh = window.innerHeight, ticking = false;
      var names = { why: 'Why', portfolio: 'Work', features: 'Features', services: 'Services', process: 'Process', about: 'About', lead: 'Guide', faq: 'Answers', contact: 'Contact' };
      var chapters = [];
      var n = 0;
      Array.prototype.forEach.call(document.querySelectorAll('main > section'), function (sec) {
        if (sec.id === 'home' || !names[sec.id]) return;
        n++;
        var c = document.createElement('div');
        c.className = 'tg-chapter'; c.setAttribute('aria-hidden', 'true');
        c.innerHTML = '<span class="tg-chapter-num">' + (n < 10 ? '0' : '') + n + '</span><span class="tg-chapter-name">' + names[sec.id] + '</span>';
        if (getComputedStyle(sec).position === 'static') sec.style.position = 'relative';
        sec.insertBefore(c, sec.firstChild);
        chapters.push({ sec: sec, el: c });
      });

      // staggered entrances for card grids
      var stag = [];
      ['.why-grid', '.services-grid', '.portfolio-grid', '.faq-grid', '.process-timeline-premium', '.about-facts'].forEach(function (sel) {
        Array.prototype.forEach.call(document.querySelectorAll(sel), function (grid) {
          Array.prototype.forEach.call(grid.children, function (kid, i) { kid.classList.add('tg-stag'); kid.style.setProperty('--i', Math.min(i, 6)); stag.push(kid); });
        });
      });
      var show = function (el) { el.classList.add('tg-in'); };
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }); }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
        stag.forEach(function (el) { io.observe(el); });
        var cio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.style.setProperty('--in', 1); cio.unobserve(e.target); } }); }, { threshold: 0.2 });
        chapters.forEach(function (c) { cio.observe(c.sec); });
      } else { stag.forEach(show); chapters.forEach(function (c) { c.el.style.setProperty('--in', 1); }); }
      setTimeout(function () { stag.forEach(show); }, 6000); // failsafe: nothing stays hidden

      // scroll-linked: hero exit + chapter parallax
      function frame() {
        var y = window.scrollY || 0;
        root.style.setProperty('--hp', Math.max(0, Math.min(1, y / (vh * 0.75))).toFixed(3));
        chapters.forEach(function (c) {
          var r = c.sec.getBoundingClientRect();
          if (r.bottom < -100 || r.top > vh + 100) return;
          c.el.style.setProperty('--p', (((vh - r.top) / (vh + r.height)) * 2 - 1).toFixed(3));
        });
        ticking = false;
      }
      function req() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
      window.addEventListener('scroll', req, { passive: true });
      window.addEventListener('resize', function () { vh = window.innerHeight; req(); }, { passive: true });
      frame();
    } catch (err) { root.classList.remove('js-story'); }
  });
})();
