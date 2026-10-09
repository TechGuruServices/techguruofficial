/* TechGuru portfolio — Interactive Mockup Theatre
   Video is the default view; thumbnails swap screenshots into the device
   frame with a cross-fade. The <video> element is kept alive (never
   re-created) so switching back resumes instantly. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.pf-case').forEach(function (cs) {
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

    function setPulse(isPlaying) {
      pulse.innerHTML = isPlaying
        ? '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';
      pulse.classList.add('is-on');
      clearTimeout(pulseTimer);
      pulseTimer = setTimeout(function () { pulse.classList.remove('is-on'); }, 650);
    }

    function show(i) {
      var t = thumbs[i];
      thumbs.forEach(function (b, k) {
        b.setAttribute('aria-selected', k === i ? 'true' : 'false');
        b.tabIndex = k === i ? 0 : -1;
      });
      var isVideo = t.dataset.type === 'video';
      showingVideo = isVideo;
      video.classList.toggle('is-active', isVideo);
      shots.forEach(function (s) { s.classList.toggle('is-active', !isVideo && s.dataset.key === t.dataset.key); });
      restore.classList.toggle('is-on', !isVideo);
      if (urlBar && t.dataset.url) urlBar.textContent = t.dataset.url;

      clearTimeout(capTimer);
      if (isVideo) {
        caption.classList.remove('is-on');
        if (inView && !reduce) video.play().catch(function () {});
      } else {
        video.pause();
        caption.textContent = t.dataset.label || '';
        caption.classList.add('is-on');
        capTimer = setTimeout(function () { caption.classList.remove('is-on'); }, 3200);
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
    restore.addEventListener('click', function () { show(0); thumbs[0].focus({ preventScroll: true }); });

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
  });

  // scroll reveal
  var rev = document.querySelectorAll('.pf-reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    rev.forEach(function (el) { io.observe(el); });
  } else {
    rev.forEach(function (el) { el.classList.add('is-in'); });
  }
})();
