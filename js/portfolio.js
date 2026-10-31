/* TechGuru portfolio — Interactive Mockup Theatre
   Video is the default view; thumbnails swap screenshots into the device
   frame with a cross-fade. The <video> element is kept alive (never
   re-created) so switching back resumes instantly. */

/* Fix 2026-10-31 (AH-MUSE-ME): the portfolio section rendered completely
   blank. Root cause: the first .pf-case in the page (TINKL.) is a showcase
   layout with NO theatre elements (no .pf-viewport/.pf-video/.pf-thumb/
   .pf-restore/.pf-caption/.pf-pulse). The old loop called
   restore.addEventListener(...) and video.addEventListener(...) on null,
   which threw on the FIRST case and killed the whole script — including
   the scroll-reveal setup at the bottom — so every .pf-reveal case stayed
   at opacity: 0 forever.
   Fixes applied:
   1. Scroll reveal is armed FIRST, before any theatre wiring, and has a
      3s force-reveal fallback, so a theatre error can never blank the
      section again.
   2. Theatre wiring skips any case without a viewport/video/thumbnails
      (e.g. TINKL.) and every optional element (restore, caption, pulse,
      url bar) is null-guarded.
   3. Each case is wired inside try/catch so one bad case cannot stop
      the others. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. scroll reveal (armed first, fail-visible) ---------- */
  var rev = document.querySelectorAll('.pf-reveal');
  function revealAll() {
    rev.forEach(function (el) { el.classList.add('is-in'); });
  }
  try {
    if ('IntersectionObserver' in window && !reduce) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
      }, { threshold: 0.12 });
      rev.forEach(function (el) { io.observe(el); });
      /* Failsafe: anything still hidden after 3s is revealed anyway. */
      setTimeout(revealAll, 3000);
    } else {
      revealAll();
    }
    /* Tell the CSS the JS reveal is armed (cancels the CSS-only
       failsafe animation in portfolio.css where that rule exists). */
    document.documentElement.classList.add('pf-js');
  } catch (err) {
    revealAll();
  }

  /* ---------- 2. interactive theatres (guarded per case) ---------- */
  document.querySelectorAll('.pf-case').forEach(function (cs) {
    try {
      var viewport = cs.querySelector('.pf-viewport');
      var video = cs.querySelector('.pf-video');
      var shots = Array.prototype.slice.call(cs.querySelectorAll('.pf-shot'));
      var thumbs = Array.prototype.slice.call(cs.querySelectorAll('.pf-thumb'));
      var restore = cs.querySelector('.pf-restore');
      var caption = cs.querySelector('.pf-caption');
      var pulse = cs.querySelector('.pf-pulse');
      var urlBar = cs.querySelector('.pf-url');
      var showingVideo = true;
      var inView = false;
      var pulseTimer, capTimer;

      /* Showcase-only cases (e.g. TINKL.) have no theatre to wire. */
      if (!viewport || !video || !thumbs.length) { return; }

      function setPulse(isPlaying) {
        if (!pulse) { return; }
        pulse.innerHTML = isPlaying
          ? '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'
          : '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';
        pulse.classList.add('is-on');
        clearTimeout(pulseTimer);
        pulseTimer = setTimeout(function () { pulse.classList.remove('is-on'); }, 650);
      }

      function show(i) {
        var t = thumbs[i];
        if (!t) { return; }
        thumbs.forEach(function (b, k) {
          b.setAttribute('aria-selected', k === i ? 'true' : 'false');
          b.tabIndex = k === i ? 0 : -1;
        });
        var isVideo = t.dataset.type === 'video';
        showingVideo = isVideo;
        video.classList.toggle('is-active', isVideo);
        shots.forEach(function (s) { s.classList.toggle('is-active', !isVideo && s.dataset.key === t.dataset.key); });
        if (restore) { restore.classList.toggle('is-on', !isVideo); }
        if (urlBar && t.dataset.url) urlBar.textContent = t.dataset.url;

        clearTimeout(capTimer);
        if (isVideo) {
          if (caption) { caption.classList.remove('is-on'); }
          if (inView && !reduce) video.play().catch(function () {});
        } else {
          video.pause();
          if (caption) {
            caption.textContent = t.dataset.label || '';
            caption.classList.add('is-on');
            capTimer = setTimeout(function () { caption.classList.remove('is-on'); }, 3200);
          }
        }
      }

      thumbs.forEach(function (b, i) {
        b.addEventListener('click', function () { show(i); });
        b.addEventListener('keydown', function (e) {
          var n = null;
          if (e.key === 'ArrowRight') n = (i + 1) % thumbs.length;
          else if (e.key === 'ArrowLeft') n = (i - 1 + thumbs.length) % thumbs.length;
          else if (e.key === 'Home') n = 0;
          else if (e.key === 'End') n = thumbs.length - 1;
          if (n !== null) { e.preventDefault(); show(n); thumbs[n].focus(); }
        });
      });
      if (restore) {
        restore.addEventListener('click', function () { show(0); thumbs[0].focus({ preventScroll: true }); });
      }

      video.addEventListener('click', function () {
        if (video.paused) { video.play(); setPulse(true); } else { video.pause(); setPulse(false); }
      });

      // autoplay muted only while the theatre is on screen & showing video
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            inView = en.isIntersecting;
            if (inView && showingVideo && !reduce) video.play().catch(function () {});
            else video.pause();
          });
        }, { threshold: 0.45 }).observe(viewport);
      }
      show(0);
    } catch (err) {
      /* One broken case must never take down the others — or the reveal. */
      if (window.console && console.warn) { console.warn('portfolio: case skipped', err); }
    }
  });
})();
