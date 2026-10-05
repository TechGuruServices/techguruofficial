/* ======================================================================
   TECHGURU rotating CTA — strict Vanilla JS (ES6+), no dependencies
   ====================================================================== */
const boot = (fn) => {
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', fn); } else { fn(); }
};
boot(() => {
  'use strict';

  const cta = document.getElementById('tg-cta');
  if (!cta) return;

  const prefixSlot = cta.querySelector('[data-cta-slot="prefix"]');
  const suffixSlot = cta.querySelector('[data-cta-slot="suffix"]');
  const centerWord = cta.querySelector('[data-cta-slot="center"]').textContent.trim(); // "My"
  const reduceMQ   = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---- state machine: [prefix, suffix] per step; step 4 keeps prefix ---- */
  const STATES = [
    { prefix: 'Build',  suffix: 'Site'  },   // 1 start
    { prefix: 'Launch', suffix: 'App'   },   // 2 both rotate
    { prefix: 'Elevate',suffix: 'Brand' },   // 3 both rotate
    { prefix: 'Elevate',suffix: 'Logo'  },   // 4 prefix static, suffix rotates
  ];
  const CYCLE_MS = 2750;                      // within the 2500–3000ms spec
  const OUT_MS   = 420;                       // exit slide duration
  const IN_MS    = 480;                       // entry slide duration

  /* ---- geometry lock: slot width = widest candidate word (no shift) ---- */
  const lockSlotWidths = () => {
    [prefixSlot, suffixSlot].forEach(slot => {
      const live = slot.querySelector('.tg-cta-word');
      const cs   = getComputedStyle(live);
      const probe = document.createElement('span');
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;';
      probe.style.fontFamily = cs.fontFamily;
      probe.style.fontSize   = cs.fontSize;
      probe.style.fontWeight = cs.fontWeight;
      probe.style.letterSpacing = cs.letterSpacing;
      probe.style.textTransform = cs.textTransform;
      document.body.appendChild(probe);
      let max = 0;
      slot.dataset.words.split('|').forEach(w => {
        probe.textContent = w;
        max = Math.max(max, probe.offsetWidth);
      });
      document.body.removeChild(probe);
      slot.style.width = `${Math.ceil(max)}px`;
    });
  };

  /* ---- vertical slide-and-fade word swap ---- */
  const rotateSlot = (slot, next) => {
    const wordEl = slot.querySelector('.tg-cta-word');
    if (wordEl.textContent === next) return;          // static this step
    if (reduceMQ.matches || !wordEl.animate) { wordEl.textContent = next; return; }
    // clock-based Web Animations + clock-based swap: immune to flush delays
    const out = wordEl.animate(
      [{ transform: 'translateY(0)', opacity: 1 },
       { transform: 'translateY(-110%)', opacity: 0 }],
      { duration: OUT_MS, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' });
    window.setTimeout(() => {                          // same tick as aria update
      wordEl.textContent = next;
      out.cancel();
      const inn = wordEl.animate(
        [{ transform: 'translateY(110%)', opacity: 0 },
         { transform: 'translateY(0)', opacity: 1 }],
        { duration: IN_MS, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' });
      window.setTimeout(() => inn.cancel(), IN_MS + 60);  // natural style returns
    }, OUT_MS);
  };

  /* ---- apply a state + keep title/aria-label in sync with what shows ---- */
  const applyState = (i) => {
    const { prefix, suffix } = STATES[i];
    rotateSlot(prefixSlot, prefix);
    rotateSlot(suffixSlot, suffix);
    const label = `${prefix} ${centerWord} ${suffix}`;
    window.setTimeout(() => {                         // same tick the new words
      cta.setAttribute('title', label);               // become the visible string
      cta.setAttribute('aria-label', label);
    }, reduceMQ.matches ? 0 : OUT_MS);
  };

  /* ---- boot ---- */
  lockSlotWidths();
  let resizeTimer;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(lockSlotWidths, 150);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(lockSlotWidths);

  let index = 0;
  window.setInterval(() => {
    index = (index + 1) % STATES.length;              // …loop back to state 1
    applyState(index);
  }, CYCLE_MS);
});
