/* ==========================================================================
   TECHGURU — CINEMATIC SCROLL-STORYTELLING ENGINE  (added 2026-09-25)
   Vanilla-JS companion to css/cinematic.css. Adds the narrative layer that
   rides on top of the directional reveal system:

     1. Parallax brand glow orbs + hero-media depth drift (single rAF loop)
     2. Line-mask headline reveals (headlines rise out of a clipping mask)
     3. Scroll-linked word lighting on the About manifesto (.about-lead)
     4. Chapter rail — left-edge story navigator with active-chapter sync

   Rules honoured:
     • Everything is gated behind prefers-reduced-motion (layer never boots).
     • html.js-cine is only added when the layer boots, so all CSS effects are
       opt-in — no JS (or an error) means fully visible, static content.
     • A 4s failsafe force-completes masks/words so nothing stays invisible.
     • Only transform / opacity / clip-path are animated (compositor-friendly),
       and all scroll work is rAF-throttled with passive listeners.
   ========================================================================== */
(function () {
  'use strict';

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return; // reduced motion: the story stays, the choreography rests
  }

  function boot(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  boot(function () {
    var root = document.documentElement;
    try {
      root.classList.add('js-cine');

      var vh = window.innerHeight;
      window.addEventListener('resize', function () { vh = window.innerHeight; }, { passive: true });

      /* ------------------------------------------------------------------
         1. PARALLAX — glow orbs + hero reel depth
         ------------------------------------------------------------------ */
      var parallax = [];

      var rotator = document.getElementById('hero-rotator');
      if (rotator) { parallax.push({ el: rotator, f: 0.05 }); }

      var orbSpecs = [
        { host: 'why',      x: 84, y: 8,  size: 340, rgb: '74,108,247',  f: 0.10 },
        { host: 'process',  x: 4,  y: 40, size: 280, rgb: '100,222,223', f: 0.13 },
        { host: 'services', x: 88, y: 30, size: 320, rgb: '162,116,255', f: 0.12 },
        { host: 'portfolio',x: 6,  y: 55, size: 300, rgb: '74,108,247',  f: 0.11 },
        { host: 'about',    x: 86, y: 14, size: 300, rgb: '162,116,255', f: 0.10 },
        { host: 'contact',  x: 80, y: 18, size: 340, rgb: '100,222,223', f: 0.12 }
      ];

      orbSpecs.forEach(function (spec) {
        var host = document.getElementById(spec.host);
        if (!host) { return; }
        if (getComputedStyle(host).position === 'static') { host.style.position = 'relative'; }
        var orb = document.createElement('div');
        orb.className = 'tg-orb';
        orb.setAttribute('aria-hidden', 'true');
        orb.style.left = spec.x + '%';
        orb.style.top = spec.y + '%';
        orb.style.width = spec.size + 'px';
        orb.style.height = spec.size + 'px';
        orb.style.background = 'radial-gradient(circle at 50% 50%, rgba(' + spec.rgb + ',.4), rgba(' + spec.rgb + ',0) 70%)';
        host.appendChild(orb);
        parallax.push({ el: orb, f: spec.f });
      });

      /* ------------------------------------------------------------------
         2. LINE-MASK HEADLINES
         ------------------------------------------------------------------ */
      var heads = Array.prototype.slice.call(
        document.querySelectorAll('.section-header h2, .process-header h2, .features-head h2')
      );
      heads.forEach(function (h) {
        if (h.querySelector('.tg-mask') || !h.textContent.trim()) { return; }
        var mask = document.createElement('span');
        mask.className = 'tg-mask';
        var inner = document.createElement('span');
        inner.className = 'tg-mask-inner';
        while (h.firstChild) { inner.appendChild(h.firstChild); }
        mask.appendChild(inner);
        h.appendChild(mask);
      });

      if ('IntersectionObserver' in window && heads.length) {
        var maskIO = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              e.target.classList.add('mask-in');
              maskIO.unobserve(e.target);
            }
          });
        }, { threshold: 0.4 });
        heads.forEach(function (h) { maskIO.observe(h); });
      } else {
        heads.forEach(function (h) { h.classList.add('mask-in'); });
      }

      /* ------------------------------------------------------------------
         3. STATEMENT WORD LIGHTING (.about-lead)
         ------------------------------------------------------------------ */
      var words = [];
      var lead = document.querySelector('.about-lead');
      if (lead) {
        var raw = lead.textContent.replace(/\s+/g, ' ').trim();
        lead.textContent = '';
        raw.split(' ').forEach(function (w, i) {
          var span = document.createElement('span');
          span.className = 'tg-word';
          span.textContent = w;
          lead.appendChild(span);
          words.push(span);
          if (i < raw.split(' ').length - 1) { lead.appendChild(document.createTextNode(' ')); }
        });
      }

      var litCount = -1;
      function paintStatement() {
        if (!lead || !words.length) { return; }
        var r = lead.getBoundingClientRect();
        var p = (vh * 0.88 - r.top) / (r.height + vh * 0.45);
        p = p < 0 ? 0 : (p > 1 ? 1 : p);
        var lit = Math.round(p * words.length);
        if (lit === litCount) { return; }
        for (var i = 0; i < words.length; i++) {
          words[i].classList.toggle('lit', i < lit);
        }
        litCount = lit;
      }

      /* ------------------------------------------------------------------
         4. CHAPTER RAIL — the story's table of contents
         ------------------------------------------------------------------ */
      var chapters = [
        ['why',       '01 · The Why'],
        ['process',   '02 · The Process'],
        ['services',  '03 · Services'],
        ['portfolio', '04 · The Proof'],
        ['about',     '05 · The Guru'],
        ['faq',       '06 · Answers'],
        ['contact',   '07 · Start']
      ];
      var railItems = [];
      var rail = document.createElement('nav');
      rail.className = 'tg-rail';
      rail.setAttribute('aria-label', 'Story chapters');
      chapters.forEach(function (ch) {
        var sec = document.getElementById(ch[0]);
        if (!sec) { return; }
        var a = document.createElement('a');
        a.className = 'tg-rail-item';
        a.href = '#' + ch[0];
        var dot = document.createElement('span');
        dot.className = 'tg-rail-dot';
        dot.setAttribute('aria-hidden', 'true');
        var label = document.createElement('span');
        label.className = 'tg-rail-label';
        label.textContent = ch[1];
        a.appendChild(dot);
        a.appendChild(label);
        a.setAttribute('aria-label', 'Chapter: ' + ch[1]);
        rail.appendChild(a);
        railItems.push({ id: ch[0], el: a });
      });
      if (railItems.length) { document.body.appendChild(rail); }

      if ('IntersectionObserver' in window && railItems.length) {
        var railIO = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (!e.isIntersecting) { return; }
            railItems.forEach(function (item) {
              item.el.classList.toggle('is-active', item.id === e.target.id);
            });
          });
        }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
        railItems.forEach(function (item) {
          var sec = document.getElementById(item.id);
          if (sec) { railIO.observe(sec); }
        });
      }

      /* ------------------------------------------------------------------
         SCROLL LOOP — one rAF-throttled pass for all depth effects
         ------------------------------------------------------------------ */
      var ticking = false;
      function onScroll() {
        if (ticking) { return; }
        ticking = true;
        window.requestAnimationFrame(function () {
          for (var i = 0; i < parallax.length; i++) {
            var t = parallax[i];
            var r = t.el.getBoundingClientRect();
            var delta = r.top + r.height / 2 - vh / 2;
            t.el.style.transform = 'translate3d(0,' + (delta * -t.f).toFixed(1) + 'px,0)';
          }
          paintStatement();
          ticking = false;
        });
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();

      /* ------------------------------------------------------------------
         FAILSAFE — nothing stays hidden, ever
         ------------------------------------------------------------------ */
      window.setTimeout(function () {
        heads.forEach(function (h) { h.classList.add('mask-in'); });
        words.forEach(function (w) { w.classList.add('lit'); });
      }, 4000);
    } catch (err) {
      /* cinematic layer is decorative: fail loud in console, soft for users */
      root.classList.remove('js-cine');
      if (window.console) { console.warn('Cinematic layer disabled:', err); }
    }
  });
})();
