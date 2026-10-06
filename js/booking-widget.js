/**
 * TECHGURU Booking Widget — embeddable, dependency-free.
 *
 * Replaces the Cal.com embed inside the existing booking modal.
 * Mounts into any container (defaults to #cal-embed, the modal's
 * existing content div, so open/close logic keeps working untouched).
 *
 * Usage:
 *   <script src="js/booking-widget.js"></script>
 *   <script>
 *     TechGuruBooking.mount('#cal-embed', {
 *       apiBase: 'https://api.techguruofficial.us'   // your Worker URL
 *     });
 *   </script>
 *
 * Flow: pick a day → pick a time → your details → confirmed.
 * Times are shown in the VISITOR's local timezone automatically.
 */
(function () {
  'use strict';

  const CSS = `
  .tgb { font-family: inherit; color: #eef2f7; max-width: 560px; margin: 0 auto; }
  .tgb * { box-sizing: border-box; }
  .tgb-steps { display: flex; gap: 8px; margin-bottom: 18px; }
  .tgb-step { flex: 1; text-align: center; font-size: 11px; letter-spacing: .08em;
    text-transform: uppercase; color: #8b93a3; padding-bottom: 8px;
    border-bottom: 2px solid rgba(255,255,255,.08); }
  .tgb-step.on { color: #8b5cf6; border-color: #8b5cf6; }
  .tgb h3 { font-size: 15px; margin: 0 0 12px; color: #cdd5e1; font-weight: 600; }
  .tgb-days { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; }
  .tgb-day { min-width: 68px; padding: 10px 6px; border-radius: 12px; cursor: pointer;
    background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.09);
    color: #eef2f7; text-align: center; transition: all .18s ease; }
  .tgb-day small { display: block; font-size: 10px; letter-spacing: .06em; color: #8b93a3;
    text-transform: uppercase; margin-bottom: 4px; }
  .tgb-day strong { font-size: 17px; }
  .tgb-day:not(:disabled):hover { border-color: rgba(139,92,246,.5); }
  .tgb-day.sel { background: rgba(139,92,246,.14); border-color: #8b5cf6; }
  .tgb-day:disabled { opacity: .28; cursor: default; }
  .tgb-slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
    gap: 8px; margin-top: 4px; }
  .tgb-slot { padding: 10px 6px; border-radius: 10px; cursor: pointer; font-size: 13.5px;
    background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.09); color: #eef2f7; }
  .tgb-slot:not(:disabled):hover { border-color: rgba(139,92,246,.5); }
  .tgb-slot.sel { background: rgba(139,92,246,.16); border-color: #8b5cf6; font-weight: 700; }
  .tgb-field { margin-bottom: 12px; }
  .tgb-field label { display: block; font-size: 12.5px; color: #aab3c2; margin-bottom: 6px; }
  .tgb-field input, .tgb-field textarea { width: 100%; padding: 11px 12px; border-radius: 10px;
    background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12);
    color: #fff; font-size: 14px; font-family: inherit; }
  .tgb-field input:focus, .tgb-field textarea:focus { outline: none; border-color: #8b5cf6; }
  .tgb-field textarea { min-height: 76px; resize: vertical; }
  .tgb-row { display: flex; gap: 10px; margin-top: 16px; }
  .tgb-btn { flex: 1; padding: 13px; border-radius: 12px; border: 0; cursor: pointer;
    font-size: 14.5px; font-weight: 700; font-family: inherit; transition: all .18s ease; }
  .tgb-btn.primary { background: linear-gradient(135deg, #8b5cf6, #60a5fa); color: #1e1b4b; }
  .tgb-btn.primary:hover:not(:disabled) { filter: brightness(1.08); }
  .tgb-btn.primary:disabled { opacity: .5; cursor: default; }
  .tgb-btn.ghost { background: rgba(255,255,255,.06); color: #cdd5e1;
    border: 1px solid rgba(255,255,255,.1); flex: 0 0 auto; padding: 13px 18px; }
  .tgb-err { background: rgba(248,113,113,.1); border: 1px solid rgba(248,113,113,.35);
    color: #fca5a5; padding: 10px 12px; border-radius: 10px; font-size: 13px; margin-bottom: 12px; }
  .tgb-loading { text-align: center; padding: 44px 0; color: #8b93a3; }
  .tgb-spinner { width: 34px; height: 34px; margin: 0 auto 12px; border-radius: 50%;
    border: 3px solid rgba(139,92,246,.2); border-top-color: #8b5cf6;
    animation: tgb-spin .8s linear infinite; }
  @keyframes tgb-spin { to { transform: rotate(360deg); } }
  .tgb-done { text-align: center; padding: 18px 6px; }
  .tgb-done .tgb-check { font-size: 46px; margin-bottom: 8px; }
  .tgb-done h3 { font-size: 19px; color: #fff; }
  .tgb-done p { color: #aab3c2; font-size: 14px; line-height: 1.6; }
  .tgb-done .tgb-when { display: inline-block; margin: 10px 0; padding: 10px 18px;
    border-radius: 12px; background: rgba(139,92,246,.1);
    border: 1px solid rgba(139,92,246,.35); color: #8b5cf6; font-weight: 700; }
  .tgb-meet { display: inline-block; margin-top: 6px; padding: 12px 22px; border-radius: 12px;
    background: linear-gradient(135deg, #8b5cf6, #60a5fa); color: #1e1b4b;
    font-weight: 700; text-decoration: none; }
  .tgb-note { font-size: 12px; color: #8b93a3; margin-top: 14px; }
  `;

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtDay(isoDate) {
    const d = new Date(isoDate + 'T12:00:00');
    return {
      dow: d.toLocaleDateString(undefined, { weekday: 'short' }),
      num: d.getDate(),
      mon: d.toLocaleDateString(undefined, { month: 'short' }),
    };
  }

  function fmtSlot(iso) {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  function fmtWhen(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) +
      ' at ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  const Widget = {
    mount(selector, opts) {
      const root = typeof selector === 'string' ? document.querySelector(selector) : selector;
      if (!root) return;
      new BookingFlow(root, opts || {}).render();
    },
  };

  function BookingFlow(root, opts) {
    this.root = root;
    this.api = (opts.apiBase || '').replace(/\/$/, '');
    this.state = { step: 1, days: [], day: null, slot: null, name: '', email: '', phone: '', format: 'video', notes: '' };
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  BookingFlow.prototype.api2 = function (path, init) {
    return fetch(this.api + path, init).then(r => r.json());
  };

  BookingFlow.prototype.render = function () {
    const s = this.state;
    let steps = ['Day', 'Time', 'Details'].map((label, i) =>
      `<div class="tgb-step${s.step > i + 1 || (s.step === 4 && i === 2) ? ' on' : s.step === i + 1 ? ' on' : ''}">${label}</div>`
    ).join('');

    let body = '';
    if (s.step === 1) body = this.dayHtml();
    else if (s.step === 2) body = this.slotHtml();
    else if (s.step === 3) body = this.formHtml();
    else body = this.doneHtml();

    this.root.innerHTML = `<div class="tgb"><div class="tgb-steps">${steps}</div>${body}</div>`;
    this.bind();
  };

  BookingFlow.prototype.dayHtml = function () {
    const s = this.state;
    if (!s.days.length) {
      return `<div class="tgb-loading"><div class="tgb-spinner"></div>Loading available days…</div>`;
    }
    const btns = s.days.map(d => {
      const f = fmtDay(d.date);
      return `<button class="tgb-day${s.day === d.date ? ' sel' : ''}" data-day="${d.date}"
        ${d.slots.length ? '' : 'disabled'}>
        <small>${f.dow}</small><strong>${f.num}</strong><small>${f.mon}</small>
      </button>`;
    }).join('');
    return `<h3>Pick a day</h3><div class="tgb-days">${btns}</div>
      <div class="tgb-row"><button class="tgb-btn primary" data-next ${s.day ? '' : 'disabled'}>Continue →</button></div>`;
  };

  BookingFlow.prototype.slotHtml = function () {
    const s = this.state;
    const day = s.days.find(d => d.date === s.day);
    const btns = (day ? day.slots : []).map(iso =>
      `<button class="tgb-slot${s.slot === iso ? ' sel' : ''}" data-slot="${esc(iso)}">${fmtSlot(iso)}</button>`
    ).join('');
    return `<h3>Pick a time <span style="color:#8b93a3;font-weight:400">(your local time)</span></h3>
      <div class="tgb-slots">${btns || '<p class="tgb-note">No times left this day — pick another.</p>'}</div>
      <div class="tgb-row"><button class="tgb-btn ghost" data-back>← Back</button>
      <button class="tgb-btn primary" data-next ${s.slot ? '' : 'disabled'}>Continue →</button></div>`;
  };

  BookingFlow.prototype.formHtml = function () {
    const s = this.state;
    const needPhone = s.format !== 'video';
    return `${s.error ? `<div class="tgb-err">${esc(s.error)}</div>` : ''}
      <h3>Your details — <span style="color:#8b5cf6">${esc(fmtWhen(s.slot))}</span></h3>
      <div class="tgb-field"><label>How should we meet? *</label>
        <div style="display:flex;gap:8px">
          ${['video', 'phone', 'whatsapp'].map(f => `
            <button type="button" class="tgb-slot${s.format === f ? ' sel' : ''}" data-format="${f}"
              style="flex:1;text-transform:capitalize">${f === 'video' ? '🎥 Video' : f === 'phone' ? '📞 Phone' : '💬 WhatsApp'}</button>`).join('')}
        </div></div>
      <div class="tgb-field"><label for="tgb-name">Your name *</label>
        <input id="tgb-name" autocomplete="name" value="${esc(s.name)}" placeholder="Jane Smith"></div>
      <div class="tgb-field"><label for="tgb-email">Email *</label>
        <input id="tgb-email" type="email" autocomplete="email" value="${esc(s.email)}"
        placeholder="jane@company.com"></div>
      ${needPhone ? `<div class="tgb-field"><label for="tgb-phone">Phone number *</label>
        <input id="tgb-phone" type="tel" autocomplete="tel" value="${esc(s.phone)}"
        placeholder="+1 555-123-4567"></div>` : ''}
      <div class="tgb-field"><label for="tgb-notes">What would you like to talk about? (optional)</label>
        <textarea id="tgb-notes" placeholder="e.g. New website, rebrand, AI chat widget…">${esc(s.notes)}</textarea></div>
      <div class="tgb-row"><button class="tgb-btn ghost" data-back>← Back</button>
      <button class="tgb-btn primary" data-book ${s.booking ? 'disabled' : ''}>
        ${s.booking ? 'Booking…' : 'Confirm booking →'}</button></div>
      <p class="tgb-note">You'll get a confirmation email with everything you need.</p>`;
  };

  BookingFlow.prototype.doneHtml = function () {
    const s = this.state, r = s.result;
    const meetLine = r.format === 'video' && r.meetLink
      ? `<a class="tgb-meet" href="${esc(r.meetLink)}" target="_blank" rel="noopener">Join video call</a>`
      : r.format === 'phone'
        ? `<p>Lucas will <strong>call you</strong> at ${esc(s.phone)} at the scheduled time.</p>`
        : `<p>Lucas will <strong>message you on WhatsApp</strong> at ${esc(s.phone)} at the scheduled time.</p>`;
    return `<div class="tgb-done"><div class="tgb-check">✅</div>
      <h3>You're booked, ${esc(s.name.split(' ')[0])}!</h3>
      <div class="tgb-when">${esc(fmtWhen(r.start))}</div>
      <p>A confirmation email is on its way to <strong>${esc(s.email)}</strong>.</p>
      ${meetLine}
      <p class="tgb-note">Need to change it? Just reply to your confirmation email.</p></div>`;
  };

  BookingFlow.prototype.bind = function () {
    const s = this.state, root = this.root, self = this;

    root.querySelectorAll('[data-day]').forEach(b => b.addEventListener('click', () => {
      s.day = b.dataset.day; s.slot = null; self.render();
    }));
    root.querySelectorAll('[data-slot]').forEach(b => b.addEventListener('click', () => {
      s.slot = b.dataset.slot; self.render();
    }));
    const next = root.querySelector('[data-next]');
    if (next) next.addEventListener('click', () => { s.error = ''; s.step += 1; self.render(); });
    const back = root.querySelector('[data-back]');
    if (back) back.addEventListener('click', () => { s.error = ''; s.step -= 1; self.render(); });

    const nameEl = root.querySelector('#tgb-name');
    const emailEl = root.querySelector('#tgb-email');
    const notesEl = root.querySelector('#tgb-notes');
    const phoneEl = root.querySelector('#tgb-phone');
    if (nameEl) {
      nameEl.addEventListener('input', () => s.name = nameEl.value);
      emailEl.addEventListener('input', () => s.email = emailEl.value);
      notesEl.addEventListener('input', () => s.notes = notesEl.value);
      if (phoneEl) phoneEl.addEventListener('input', () => s.phone = phoneEl.value);
    }
    root.querySelectorAll('[data-format]').forEach(b => b.addEventListener('click', () => {
      s.format = b.dataset.format; self.render();
    }));
    const bookBtn = root.querySelector('[data-book]');
    if (bookBtn) bookBtn.addEventListener('click', () => self.book());
  };

  BookingFlow.prototype.load = function () {
    const self = this;
    this.api2('/api/booking/availability?days=14')
      .then(data => {
        if (data.ok) {
          self.state.days = Object.keys(data.slots).sort()
            .map(date => ({ date, slots: data.slots[date] }));
        } else {
          self.state.days = [];
          self.state.loadError = true;
        }
        self.render();
      })
      .catch(() => { self.state.days = []; self.state.loadError = true; self.render(); });
  };

  BookingFlow.prototype.book = function () {
    const s = this.state, self = this;
    s.name = (this.root.querySelector('#tgb-name').value || '').trim();
    s.email = (this.root.querySelector('#tgb-email').value || '').trim();
    s.notes = (this.root.querySelector('#tgb-notes').value || '').trim();
    const phoneEl = this.root.querySelector('#tgb-phone');
    s.phone = phoneEl ? phoneEl.value.trim() : '';

    if (s.name.length < 2) { s.error = 'Please enter your name.'; return self.render(); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) { s.error = 'Please enter a valid email.'; return self.render(); }
    if (s.format !== 'video' && s.phone.replace(/\D/g, '').length < 7) { s.error = 'Please enter your phone number.'; return self.render(); }

    s.booking = true; self.render();
    this.api2('/api/booking/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: s.name, email: s.email, phone: s.phone, format: s.format, slot: s.slot, notes: s.notes }),
    }).then(data => {
      s.booking = false;
      if (data.ok) {
        s.result = data; s.step = 4; s.error = '';
      } else if (data.error && /taken/i.test(data.error)) {
        s.error = 'That time was just taken — please pick another.';
        s.step = 2; s.slot = null; self.load();
        return;
      } else {
        s.error = data.error || 'Something went wrong — please try again.';
      }
      self.render();
    }).catch(() => {
      s.booking = false;
      s.error = 'Could not reach the booking service — please try again.';
      self.render();
    });
  };

  // Auto-boot when the modal's #cal-embed container exists and the API base is set.
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('cal-embed');
    if (el && window.TECHGURU_BOOKING_API) {
      const flow = new BookingFlow(el, { apiBase: window.TECHGURU_BOOKING_API });
      flow.render();
      flow.load();
    }
  });

  window.TechGuruBooking = Widget;
})();
