/* ==========================================================================
   TECHGURU — GUIDE CINEMATIC SCROLL ENGINE
   Scroll-storytelling for lead-magnet guide pages:
     1. Top scroll progress bar
     2. Chapter rail (auto-built from h2s, active-chapter sync)
     3. Line-mask headline reveals
     4. Fade-rise reveals on content blocks
     5. Parallax brand glow orbs
   Gated behind prefers-reduced-motion. html.js-gcine enables CSS effects.
   4s failsafe force-completes all reveals.
   ========================================================================== */
(function () {
  'use strict';

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function boot(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  boot(function () {
    var root = document.documentElement;
    var body = document.querySelector('.guide-body');
    if (!body) return;
    root.classList.add('js-gcine');

    /* ---------- 1. PROGRESS BAR ---------- */
    var prog = document.createElement('div');
    prog.className = 'gc-progress';
    prog.setAttribute('aria-hidden', 'true');
    var fill = document.createElement('div');
    fill.className = 'gc-progress-fill';
    prog.appendChild(fill);
    document.body.appendChild(prog);

    /* ---------- 2. CHAPTER RAIL ---------- */
    var heads = Array.prototype.slice.call(body.querySelectorAll('h2'));
    var rail = null, railLinks = [];
    if (heads.length > 1) {
      rail = document.createElement('nav');
      rail.className = 'gc-rail';
      rail.setAttribute('aria-label', 'Guide chapters');
      heads.forEach(function (h, i) {
        if (!h.id) h.id = 'chapter-' + (i + 1);
        // chapter tag
        var tag = document.createElement('span');
        tag.className = 'gc-chapter-tag';
        tag.textContent = 'Chapter ' + (i + 1);
        h.insertBefore(tag, h.firstChild);
        // line-mask wrap
        var inner = h.innerHTML;
        // keep tag outside mask
        h.innerHTML = '';
        h.appendChild(tag);
        var mask = document.createElement('span');
        mask.className = 'gc-mask';
        var line = document.createElement('span');
        line.className = 'gc-line';
        // move remaining nodes into line
        var tmp = document.createElement('div');
        tmp.innerHTML = inner;
        // strip the tag we already added (it was in inner)
        var tagDup = tmp.querySelector('.gc-chapter-tag');
        if (tagDup) tagDup.remove();
        while (tmp.firstChild) line.appendChild(tmp.firstChild);
        mask.appendChild(line);
        h.appendChild(mask);
        // rail link
        var a = document.createElement('a');
        a.href = '#' + h.id;
        var label = h.textContent.replace(/^Chapter \d+\s*/, '').trim().slice(0, 42);
        a.innerHTML = '<span class="gc-num">' + String(i + 1).padStart(2, '0') + '</span><span>' + label + '</span>';
        a.addEventListener('click', function (e) {
          e.preventDefault();
          h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        rail.appendChild(a);
        railLinks.push(a);
      });
      document.body.appendChild(rail);
    } else {
      // single h2: still apply line-mask
      heads.forEach(function (h) {
        var line = document.createElement('span');
        line.className = 'gc-line';
        var mask = document.createElement('span');
        mask.className = 'gc-mask';
        while (h.firstChild) line.appendChild(h.firstChild);
        mask.appendChild(line);
        h.appendChild(mask);
      });
    }

    /* ---------- 3+4. REVEALS ---------- */
    var revealEls = [];
    Array.prototype.forEach.call(body.children, function (el) {
      if (el.tagName === 'H2') return; // handled by line-mask
      el.classList.add('gc-reveal');
      revealEls.push(el);
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('gc-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });

    // headline observer (line-mask + rail sync)
    var hio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('gc-in');
          var idx = heads.indexOf(en.target);
          if (idx > -1) {
            railLinks.forEach(function (a, i) {
              a.classList.toggle('active', i === idx);
              if (i < idx) a.classList.add('seen');
            });
          }
        }
      });
    }, { rootMargin: '-30% 0px -55% 0px', threshold: 0 });
    heads.forEach(function (h) { hio.observe(h); });

    /* ---------- 5. PARALLAX ORBS ---------- */
    var wrap = document.querySelector('.guide-wrap');
    var orbs = [];
    if (wrap) {
      var specs = [
        { y: 6,  x: 85, size: 300, rgb: '74,108,247',  f: 0.08 },
        { y: 38, x: 5,  size: 260, rgb: '162,116,255', f: 0.11 },
        { y: 68, x: 88, size: 280, rgb: '100,222,223', f: 0.09 }
      ];
      specs.forEach(function (s) {
        var o = document.createElement('div');
        o.className = 'gc-orb';
        o.setAttribute('aria-hidden', 'true');
        o.style.top = s.y + '%';
        o.style.left = s.x + '%';
        o.style.width = s.size + 'px';
        o.style.height = s.size + 'px';
        o.style.background = 'radial-gradient(circle, rgba(' + s.rgb + ',.22), transparent 70%)';
        wrap.appendChild(o);
        orbs.push({ el: o, f: s.f, base: 0 });
      });
      // hero glow
      var hero = document.querySelector('.guide-hero');
      if (hero) {
        var glow = document.createElement('div');
        glow.className = 'gc-hero-glow';
        glow.setAttribute('aria-hidden', 'true');
        hero.appendChild(glow);
      }
    }

    /* ---------- SCROLL LOOP (progress + parallax) ---------- */
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var st = window.scrollY || window.pageYOffset;
        var max = document.documentElement.scrollHeight - window.innerHeight;
        fill.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, st / max) : 0) + ')';
        for (var i = 0; i < orbs.length; i++) {
          var o = orbs[i];
          o.el.style.transform = 'translateY(' + (st * o.f) + 'px)';
        }
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ---------- FAILSAFE ---------- */
    setTimeout(function () {
      document.querySelectorAll('.gc-reveal:not(.gc-in)').forEach(function (el) { el.classList.add('gc-in'); });
      document.querySelectorAll('.guide-body h2:not(.gc-in)').forEach(function (h) { h.classList.add('gc-in'); });
    }, 4000);
  });
})();
