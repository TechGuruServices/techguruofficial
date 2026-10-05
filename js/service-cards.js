/* TECHGURU — Service card tilt (companion to css/service-cards.css).
   Vanilla, rAF-throttled, reduced-motion safe, fails visible: every card is
   fully static, readable HTML/CSS on its own — this script only adds a
   pointer-tracked 3D tilt on devices with a precise pointer. If it never
   runs (touch, prefers-reduced-motion, or an error), the cards still work. */
(function () {
  'use strict';

  function boot(fn) { document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn(); }

  boot(function () {
    try {
      var canTilt = window.matchMedia &&
        window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
        !(window.matchMedia('(prefers-reduced-motion: reduce)').matches);

      if (!canTilt) return; // cards stay flat — content is already fully visible

      var cards = document.querySelectorAll('.service-card');
      if (!cards.length) return;

      var MAX_ANGLE = 8; // degrees — subtle on purpose, not a showy gimmick
      var EASE = 0.1;

      var lerp = function (a, b, t) { return (1 - t) * a + t * b; };
      var clamp = function (v, max) { return Math.max(Math.min(v, max), -max); };

      var state = [];
      Array.prototype.forEach.call(cards, function (card) {
        var s = { card: card, tx: 0, ty: 0, cx: 0, cy: 0 };
        state.push(s);

        card.addEventListener('pointermove', function (e) {
          if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
          var r = card.getBoundingClientRect();
          var px = e.clientX - (r.left + r.width / 2);
          var py = e.clientY - (r.top + r.height / 2);
          s.tx = clamp((px / (r.width / 2)) * MAX_ANGLE, MAX_ANGLE);
          s.ty = clamp((-py / (r.height / 2)) * MAX_ANGLE, MAX_ANGLE);
        });

        card.addEventListener('pointerleave', function () { s.tx = 0; s.ty = 0; });
      });

      var tick = function () {
        for (var i = 0; i < state.length; i++) {
          var s = state[i];
          s.cx = lerp(s.cx, s.tx, EASE);
          s.cy = lerp(s.cy, s.ty, EASE);
          s.card.style.setProperty('--ry', s.cx.toFixed(2) + 'deg');
          s.card.style.setProperty('--rx', s.cy.toFixed(2) + 'deg');
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch (err) {
      /* fails visible: a broken tilt should never break the cards themselves */
    }
  });
})();
