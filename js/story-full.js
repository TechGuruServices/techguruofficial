/* ==========================================================================
   TECHGURU — STORY-FULL: whole-page cinematic scroll layer (2026-10-04)
   Companion to js/story.js + js/cinematic.js. Extends the storytelling from
   the first viewport to EVERY section, in the same visual language:
   glass, cyan→violet glow, chapter numerals, mask & stagger choreography.

   Adds (only where the existing engines do NOT already animate):
     1. Universal staggered reveals — hero chips/highlights/urgency line,
        section label chips, subtitles, feature cards, about columns,
        lead-magnet split, services CTA band, contact items + form,
        footer columns + finale CTA.
     2. Scroll-linked word-lighting on every section subtitle (the site's
        signature "statement" effect, previously only on the About manifesto).
     3. Process step rings pop + glow as the connector line reaches them.
     4. Scene depth — section headers drift a few px against scroll (--sp).
     5. Contact form glow-sweep on first entry (the "start the story" beat).

   Rules honoured (same contract as the existing layers):
     • prefers-reduced-motion → layer never boots, everything static/visible.
     • html.js-storyfull only exists when booted → no JS = fully visible.
     • 5s failsafe force-reveals; try/catch removes the class on any error.
     • Only opacity / transform / clip-path animated; one rAF-throttled
       scroll pass; passive listeners; observers unobserve after firing.
     • Never double-stages an element already handled (.tg-stag / .tg-word).
   ========================================================================== */
(function () {
  'use strict';

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }

  function boot(fn) {
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', fn); } else { fn(); }
  }

  boot(function () {
    var root = document.documentElement;
    try {
      root.classList.add('js-storyfull');

      var vh = window.innerHeight;
      window.addEventListener('resize', function () { vh = window.innerHeight; }, { passive: true });

      function each(sel, fn, scope) {
        Array.prototype.forEach.call((scope || document).querySelectorAll(sel), fn);
      }

      /* ------------------------------------------------------------------
         1. UNIVERSAL STAGGERED REVEALS
         ------------------------------------------------------------------ */
      var staged = [];
      function addRvl(el, variant, delay) {
        if (!el || el.classList.contains('tg-stag') || el.classList.contains('tg-rvl')) { return; }
        el.classList.add('tg-rvl');
        if (variant) { el.setAttribute('data-rv', variant); }
        el.style.setProperty('--d', String(delay || 0));
        staged.push(el);
      }

      // hero: the opening beat — badge drops, highlights & trust chips rise in sequence
      addRvl(document.querySelector('.hero-location-badge'), 'drop', 0);
      each('.hero-highlights li', function (el, i) { addRvl(el, 'up', i + 1); });
      each('.trust-chip', function (el, i) { addRvl(el, 'up', i + 2); });
      addRvl(document.querySelector('.hero-urgency'), 'up', 4);

      // every section: label chip → subtitle → bodies
      each('main > section', function (sec) {
        addRvl(sec.querySelector('.section-label, .process-label'), 'chip', 0);
        addRvl(sec.querySelector('.section-subtitle, .contact-subtitle'), 'up', 1);
      });

      // features: the four "basics" cards (never animated before)
      each('.feature-card', function (el, i) { addRvl(el, 'up', i % 4); });

      // about: two-column depth — portrait side from the left, story side from the right
      each('.about-grid > *', function (el, i) { addRvl(el, i % 2 ? 'right' : 'left', i % 2); });

      // lead magnet: guide copy from the left, preview card from the right, list items stagger
      addRvl(document.querySelector('.lead-magnet-text'), 'left', 0);
      addRvl(document.querySelector('.lead-magnet-preview'), 'right', 1);
      each('.lead-magnet-list li', function (el, i) { addRvl(el, 'up', i + 1); });

      // services: closing CTA band
      addRvl(document.querySelector('.services-cta'), 'scale', 2);

      // portfolio: case-study body copy under each media wall
      each('.portfolio-body', function (el, i) { addRvl(el, 'up', 1); });

      // contact: the "start" beat — info items stagger, form rises, then glow-sweep
      each('.contact-item', function (el, i) { addRvl(el, 'up', i); });
      addRvl(document.querySelector('.contact-form'), 'up', 2);

      // footer: the credits roll
      each('.footer-content > *', function (el, i) { addRvl(el, 'up', i); });
      addRvl(document.querySelector('.footer-cta'), 'scale', 1);

      var show = function (el) { el.classList.add('rv-in'); };
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
          });
        }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
        staged.forEach(function (el) { io.observe(el); });
      } else {
        staged.forEach(show);
      }

      /* ------------------------------------------------------------------
         2. WORD-LIGHTING ON SECTION SUBTITLES (signature statement effect)
         ------------------------------------------------------------------ */
      var wordBlocks = [];
      each('.section-subtitle, .contact-subtitle', function (block) {
        if (block.querySelector('.tg-word')) { return; }           // already handled elsewhere
        var raw = block.textContent.replace(/\s+/g, ' ').trim();
        if (!raw || raw.split(' ').length < 6) { return; }         // only real statements
        block.textContent = '';
        var spans = [];
        raw.split(' ').forEach(function (w, i, arr) {
          var s = document.createElement('span');
          s.className = 'tg-wl';
          s.textContent = w;
          block.appendChild(s);
          spans.push(s);
          if (i < arr.length - 1) { block.appendChild(document.createTextNode(' ')); }
        });
        wordBlocks.push({ el: block, words: spans, lit: -1 });
      });

      function paintWords() {
        for (var b = 0; b < wordBlocks.length; b++) {
          var blk = wordBlocks[b];
          var r = blk.el.getBoundingClientRect();
          if (r.bottom < -80 || r.top > vh + 80) { continue; }
          var p = (vh * 0.9 - r.top) / (r.height + vh * 0.35);
          p = p < 0 ? 0 : (p > 1 ? 1 : p);
          var lit = Math.round(p * blk.words.length);
          if (lit === blk.lit) { continue; }
          for (var i = 0; i < blk.words.length; i++) {
            blk.words[i].classList.toggle('wl-in', i < lit);
          }
          blk.lit = lit;
        }
      }

      /* ------------------------------------------------------------------
         3. PROCESS STEP RINGS — pop + glow as the connector line reaches them
         ------------------------------------------------------------------ */
      var steps = [];
      each('.process-step-premium', function (el) { steps.push(el); });
      if (steps.length && 'IntersectionObserver' in window) {
        var sio = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) { e.target.classList.add('step-in'); sio.unobserve(e.target); }
          });
        }, { threshold: 0.35 });
        steps.forEach(function (el) { sio.observe(el); });
      } else {
        steps.forEach(function (el) { el.classList.add('step-in'); });
      }

      /* ------------------------------------------------------------------
         4+5. SCROLL LOOP — scene depth (--sp per section) in one rAF pass
         ------------------------------------------------------------------ */
      var scenes = [];
      each('main > section', function (sec) {
        var head = sec.querySelector('.section-header, .process-header');
        if (head) { scenes.push({ sec: sec, head: head }); }
      });
      var ticking = false;
      function frame() {
        for (var i = 0; i < scenes.length; i++) {
          var r = scenes[i].sec.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) { continue; }
          var sp = (vh - r.top) / (vh + r.height);
          sp = sp < 0 ? 0 : (sp > 1 ? 1 : sp);
          scenes[i].head.style.transform = 'translate3d(0,' + ((sp - .5) * -16).toFixed(1) + 'px,0)';
        }
        paintWords();
        ticking = false;
      }
      function req() { if (!ticking) { ticking = true; window.requestAnimationFrame(frame); } }
      window.addEventListener('scroll', req, { passive: true });
      req();

      /* FAILSAFE — nothing stays hidden, ever */
      window.setTimeout(function () {
        staged.forEach(show);
        wordBlocks.forEach(function (b) {
          b.words.forEach(function (w) { w.classList.add('wl-in'); });
        });
      }, 5000);
    } catch (err) {
      root.classList.remove('js-storyfull');
    }
  });
})();
