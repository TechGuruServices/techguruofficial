/*
 * Premium TECHGURU Landing Page JavaScript
 *
 * Handles form submissions, rotating taglines, hamburger menu, FAQ accordion,
 * exit intent popup, smooth interactions, and theme toggle.
 */

// Fade in decorative SVG icons (star & triangle) after page load to prevent flash
window.addEventListener('load', () => {
  document.documentElement.classList.add('decor-loaded');
});

document.addEventListener('DOMContentLoaded', () => {
  // ============================================
  // API BASE URL - Cloudflare Worker
  // ============================================
  const API_BASE = 'https://techguru-api.lucas-a13.workers.dev';

  // ============================================
  // THEME TOGGLE WITH LOCALSTORAGE
  // ============================================
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;

  // Check for saved theme preference or default to dark
  const currentTheme = localStorage.getItem('theme') || 'dark';

  // Apply saved theme on page load
  if (currentTheme === 'light') {
    body.classList.add('light-theme');
    body.classList.remove('dark-theme');
    if (themeToggle) themeToggle.checked = true;
  } else {
    body.classList.add('dark-theme');
    body.classList.remove('light-theme');
    if (themeToggle) themeToggle.checked = false;
  }

  // Theme toggle event listener
  if (themeToggle) {
    themeToggle.addEventListener('change', () => {
      if (themeToggle.checked) {
        // Switch to light theme
        body.classList.add('light-theme');
        body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
      } else {
        // Switch to dark theme
        body.classList.add('dark-theme');
        body.classList.remove('light-theme');
        localStorage.setItem('theme', 'dark');
      }
    });
  }

  // ============================================
  // HERO MEDIA ROTATION — cinematic video CTA playlist (v2, 2026-09-25)
  // 7 brand clips (5s each) + 3 stills, crossfaded. Videos play once and
  // hand off on `ended`; stills hold. Dots = manual control. Rotation pauses
  // when the rotator leaves the viewport or the tab is hidden.
  // ============================================
  const rotator = document.getElementById('hero-rotator');
  const heroSlides = Array.from(document.querySelectorAll('.hero-slide'));

  if (rotator && heroSlides.length > 1) {
    const STILL_HOLD = 9000;
    let current = Math.max(0, heroSlides.findIndex(s => s.classList.contains('active')));
    let rotationTimer = null;
    let inView = true;

    const isVideo = (el) => el.tagName === 'VIDEO';

    /* --- progress dots ------------------------------------------------ */
    const dotsWrap = document.createElement('div');
    dotsWrap.className = 'hero-rotator-dots';
    dotsWrap.setAttribute('role', 'group');
    dotsWrap.setAttribute('aria-label', 'Hero highlight reel controls');
    heroSlides.forEach((slide, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'hero-dot';
      dot.setAttribute('aria-label', (isVideo(slide) ? 'Play highlight clip ' : 'Show highlight still ') + (i + 1) + ' of ' + heroSlides.length);
      dot.addEventListener('click', () => goTo(i, true));
      dotsWrap.appendChild(dot);
    });
    rotator.insertAdjacentElement('afterend', dotsWrap);
    const dots = Array.from(dotsWrap.children);

    const syncDots = () => dots.forEach((d, i) => {
      d.classList.toggle('active', i === current);
      if (i === current) { d.setAttribute('aria-current', 'true'); } else { d.removeAttribute('aria-current'); }
    });

    /* --- playback helpers --------------------------------------------- */
    const playVideo = (el) => {
      if (el.preload === 'none') { el.preload = 'metadata'; try { el.load(); } catch (e) { /* noop */ } }
      try { el.currentTime = 0; } catch (e) { /* not loaded yet */ }
      const p = el.play();
      if (p && p.catch) { p.catch(err => console.debug('Hero clip autoplay interrupted', err)); }
    };

    const holdFor = (el) => {
      if (isVideo(el)) {
        const d = el.duration;
        return (d && isFinite(d) && d > 0 ? d * 1000 : 5000) + 250;
      }
      return STILL_HOLD;
    };

    const scheduleNextRotation = () => {
      if (rotationTimer) { clearTimeout(rotationTimer); rotationTimer = null; }
      if (!inView || document.hidden) { return; }
      rotationTimer = setTimeout(() => goTo(current + 1), holdFor(heroSlides[current]));
    };

    const goTo = (index, manual) => {
      const total = heroSlides.length;
      const next = ((index % total) + total) % total;
      if (next === current && !manual) { return; }
      const prev = heroSlides[current];
      prev.classList.add('fade-out');
      prev.classList.remove('active');
      if (isVideo(prev)) { prev.pause(); }
      setTimeout(() => prev.classList.remove('fade-out'), 1800);

      current = next;
      const el = heroSlides[current];
      el.classList.add('active');
      el.classList.remove('fade-out');
      if (isVideo(el)) { playVideo(el); }

      /* warm up the clip after next so handoffs never stutter */
      const lookahead = heroSlides[(current + 1) % total];
      if (isVideo(lookahead) && lookahead.preload === 'none') {
        lookahead.preload = 'metadata';
        try { lookahead.load(); } catch (e) { /* noop */ }
      }
      syncDots();
      scheduleNextRotation();
    };

    /* videos hand off exactly at their last frame */
    heroSlides.forEach((slide, i) => {
      if (!isVideo(slide)) { return; }
      slide.addEventListener('ended', () => { if (i === current) { goTo(current + 1); } });
      slide.addEventListener('loadedmetadata', () => { if (i === current) { scheduleNextRotation(); } });
    });

    /* pause the reel when nobody is watching */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          inView = entry.isIntersecting;
          const el = heroSlides[current];
          if (!inView) {
            if (rotationTimer) { clearTimeout(rotationTimer); rotationTimer = null; }
            if (isVideo(el)) { el.pause(); }
          } else {
            if (isVideo(el)) { playVideo(el); }
            scheduleNextRotation();
          }
        });
      }, { threshold: 0.08 }).observe(rotator);
    }
    document.addEventListener('visibilitychange', () => {
      const el = heroSlides[current];
      if (document.hidden) {
        if (rotationTimer) { clearTimeout(rotationTimer); rotationTimer = null; }
        if (isVideo(el)) { el.pause(); }
      } else if (inView) {
        if (isVideo(el)) { playVideo(el); }
        scheduleNextRotation();
      }
    });

    syncDots();
    scheduleNextRotation();
  }

  // ============================================
  // ROTATING TAGLINES
  // ============================================
  const taglines = [
    "Build. Brand. Automate.",
    "Stop losing jobs to a worse business with a better website.",
    "One person builds your site, start to finish. Me.",
    "The chat widget on this page? I can put one on yours.",
    "Built by hand, not dragged and dropped.",
    "I answer my own phone.",
    "Everything in my portfolio is live right now. Go click it."
  ];

  const taglineEl = document.getElementById('rotating-tagline');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (taglineEl) {
    let currentIndex = 0;
    const SCRAMBLE_CHARS = '!<>-_\\/[]{}=+*^?#01';

    /* decode-style swap: characters scramble, then settle left-to-right */
    const scrambleTo = (el, next) => {
      const duration = 560;
      const startTs = performance.now();
      const step = (now) => {
        const p = Math.min((now - startTs) / duration, 1);
        const revealed = p * next.length * 1.12;
        let out = '';
        for (let i = 0; i < next.length; i++) {
          const ch = next[i];
          if (ch === ' ') { out += ' '; continue; }
          out += i < revealed ? ch : SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
        }
        el.textContent = out;
        if (p < 1) { requestAnimationFrame(step); } else { el.textContent = next; }
      };
      requestAnimationFrame(step);
    };

    const rotateTagline = () => {
      currentIndex = (currentIndex + 1) % taglines.length;
      if (reduceMotion) { taglineEl.textContent = taglines[currentIndex]; return; }
      taglineEl.classList.add('fade');
      setTimeout(() => {
        taglineEl.classList.remove('fade');
        scrambleTo(taglineEl, taglines[currentIndex]);
      }, 320);
    };

    setInterval(rotateTagline, 4000);
  }

  // ============================================
  // HAMBURGER MENU
  // ============================================
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('active');
      navMenu.classList.toggle('active');
    });

    // Close menu when clicking a link
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navMenu.classList.remove('active');
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
        navToggle.classList.remove('active');
        navMenu.classList.remove('active');
      }
    });
  }

  // ============================================
  // FAQ ACCORDION
  // ============================================
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');

    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close all other items
      faqItems.forEach(otherItem => {
        otherItem.classList.remove('active');
        otherItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });

      // Toggle current item
      if (!isActive) {
        item.classList.add('active');
        question.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ============================================
  // PRICING DROPDOWN TOGGLES
  // ============================================
  const pricingToggles = document.querySelectorAll('.pricing-toggle');

  pricingToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const card = toggle.closest('.service-card-premium');
      const dropdown = card.querySelector('.pricing-dropdown');
      const isExpanded = toggle.getAttribute('aria-expanded') === 'true';

      // Toggle state
      toggle.setAttribute('aria-expanded', !isExpanded);
      card.classList.toggle('pricing-open');

      // Animate dropdown
      if (!isExpanded) {
        dropdown.style.maxHeight = dropdown.scrollHeight + 'px';
        dropdown.style.opacity = '1';
      } else {
        dropdown.style.maxHeight = '0';
        dropdown.style.opacity = '0';
      }
    });
  });

  // ============================================
  // PRICING TIER SELECTION - Enhanced UX
  // ============================================
  const pricingTiers = document.querySelectorAll('.pricing-tier');

  pricingTiers.forEach(tier => {
    tier.addEventListener('click', (e) => {
      // Get parent card to scope selection
      const parentCard = tier.closest('.service-card-premium');
      const siblingsInCard = parentCard.querySelectorAll('.pricing-tier');
      
      // Remove selected from siblings within same card
      siblingsInCard.forEach(sibling => {
        sibling.classList.remove('selected');
      });
      
      // Add selected to clicked tier
      tier.classList.add('selected');
      
      // Optional: Update CTA button text to reflect selection
      const ctaBtn = parentCard.querySelector('.service-cta');
      const tierName = tier.querySelector('.tier-name').textContent;
      if (ctaBtn && tierName) {
        ctaBtn.textContent = `Get ${tierName} Quote →`;
      }
    });
  });

  // ============================================
  // EXIT INTENT POPUP - Only on Contact Form Abandonment
  // ============================================
  const exitPopup = document.getElementById('exit-popup');
  const exitPopupClose = document.getElementById('exit-popup-close');
  const exitPopupForm = document.getElementById('exit-popup-form');
  const contactForm = document.getElementById('contact-form');
  const contactSection = document.getElementById('contact');

  let hasShownExitPopup = sessionStorage.getItem('exitPopupShown');
  let hasInteractedWithContactForm = false;
  let hasSubmittedContactForm = false;

  // Track when user interacts with contact form fields
  if (contactForm) {
    const formInputs = contactForm.querySelectorAll('input, textarea, select');

    formInputs.forEach(input => {
      input.addEventListener('focus', () => {
        hasInteractedWithContactForm = true;
      });
      input.addEventListener('input', () => {
        hasInteractedWithContactForm = true;
      });
    });

    // Track successful form submission
    contactForm.addEventListener('submit', () => {
      hasSubmittedContactForm = true;
    });

    // Pricing fit-check: conditional "something else" select + step completion states
    const otherWrap = document.getElementById('service-other-wrap');
    const qSteps = Array.from(contactForm.querySelectorAll('.q-step'));
    const refreshQ = () => {
      const rv = contactForm.querySelector('input[name="service"]:checked');
      if (otherWrap) {
        const showOther = !!(rv && rv.value === 'other');
        otherWrap.hidden = !showOther;
        const sel = otherWrap.querySelector('select');
        if (sel) { sel.required = showOther; }
      }
      qSteps.forEach(st => {
        let ok = false;
        if (st.dataset.step === '1') {
          ok = !!rv && (rv.value !== 'other' || !!(otherWrap && otherWrap.querySelector('select').value));
        } else if (st.dataset.step === '3') {
          ok = st.querySelectorAll('input:checked').length > 0;
        } else {
          const el = st.querySelector('select');
          ok = !!(el && el.value);
        }
        st.classList.toggle('done', ok);
      });
    };
    contactForm.addEventListener('change', refreshQ);
    refreshQ();
  }

  // Show popup only when user clicks outside contact form after interacting with it
  if (exitPopup && contactSection) {
    document.addEventListener('click', (e) => {
      // Only trigger if:
      // 1. User has interacted with the contact form
      // 2. User has NOT submitted the form
      // 3. Popup hasn't been shown yet
      // 4. Click is outside the contact section
      // 5. Click is not on the exit popup itself
      if (
        hasInteractedWithContactForm &&
        !hasSubmittedContactForm &&
        !hasShownExitPopup &&
        !contactSection.contains(e.target) &&
        !exitPopup.contains(e.target) &&
        !e.target.closest('.exit-popup-overlay')
      ) {
        showExitPopup();
      }
    });
  }

  function showExitPopup() {
    if (exitPopup && !hasShownExitPopup) {
      exitPopup.classList.add('active');
      hasShownExitPopup = true;
      sessionStorage.setItem('exitPopupShown', 'true');
    }
  }

  if (exitPopupClose) {
    exitPopupClose.addEventListener('click', () => {
      exitPopup.classList.remove('active');
    });
  }

  if (exitPopup) {
    exitPopup.addEventListener('click', (e) => {
      if (e.target === exitPopup) {
        exitPopup.classList.remove('active');
      }
    });
  }

  const exitPopupFormObj = document.getElementById('exit-popup-form');
  if (exitPopupFormObj) {
    exitPopupFormObj.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = exitPopupFormObj.querySelector('input[name="email"]');
      const email = emailInput ? emailInput.value.trim() : '';
      const button = exitPopupFormObj.querySelector('button');
      const originalText = button.textContent;

      if (!email) {
        showFormMessage(exitPopupFormObj, 'Please enter a valid email address.', 'error');
        return;
      }

      button.textContent = 'Sending...';
      button.disabled = true;

      try {
        const res = await fetch(`${API_BASE}/api/subscribe`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            email,
            source: 'exit_popup'
          })
        });
        if (!res.ok) throw new Error('Network response was not ok');

        showFormMessage(exitPopupFormObj, '✓ Success! Check your inbox for the starter kit.', 'success');
        exitPopupFormObj.reset();
        setTimeout(() => {
          if (exitPopup) exitPopup.classList.remove('active');
        }, 2500);
      } catch (err) {
        console.error(err);
        showFormMessage(exitPopupFormObj, 'Something went wrong. Please try again.', 'error');
      } finally {
        button.textContent = originalText;
        button.disabled = false;
      }
    });
  }
  // ============================================
  // NEWSLETTER SUBSCRIPTION
  // ============================================
  const subscribeForm = document.getElementById('subscribe-form');
  if (subscribeForm) {
    subscribeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('subscribe-email');
      const email = emailInput.value.trim();
      const button = subscribeForm.querySelector('button');
      const originalText = button.textContent;

      if (!email) {
        showFormMessage(subscribeForm, 'Please enter a valid email address.', 'error');
        return;
      }

      button.textContent = 'Sending...';
      button.disabled = true;

      try {
        const res = await fetch(`${API_BASE}/api/subscribe`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            email,
            source: 'newsletter'
          })
        });
        if (!res.ok) throw new Error('Network response was not ok');

        showFormMessage(subscribeForm, '✓ Success! Check your inbox for the starter kit.', 'success');
        subscribeForm.reset();
      } catch (err) {
        console.error(err);
        showFormMessage(subscribeForm, 'Something went wrong. Please try again.', 'error');
      } finally {
        button.textContent = originalText;
        button.disabled = false;
      }
    });
  }

  // ============================================
  // CONTACT FORM
  // ============================================
  if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const name = document.getElementById('contact-name')?.value || '';
      const email = document.getElementById('contact-email')?.value || '';
      const company = document.getElementById('contact-company')?.value || '';
      const phone = document.getElementById('contact-phone')?.value || '';
      const serviceRadio = contactForm.querySelector('input[name="service"]:checked');
      const otherSel = document.getElementById('contact-service');
      const service = serviceRadio
        ? (serviceRadio.value === 'other' ? (otherSel ? otherSel.value : '') : serviceRadio.value)
        : '';
      const notes = document.getElementById('contact-message')?.value || '';
      const budget = document.getElementById('contact-budget')?.value || '';
      const timeline = document.getElementById('contact-timeline')?.value || '';
      const infra = Array.from(contactForm.querySelectorAll('input[name="infra"]:checked')).map(c => c.value);
      const button = contactForm.querySelector('button[type="submit"]');
      const originalText = button.textContent;

      if (!name || !email || !service || !timeline || !budget) {
        showFormMessage(contactForm, 'Please complete fit-check steps 1, 2 and 4, plus your name and email.', 'error');
        return;
      }

      /* compose the fit-check into the message so it reaches email with zero Worker changes */
      const fitLine = '[Fit-check] Service: ' + service +
        ' | Timeline: ' + timeline +
        ' | Budget: ' + budget +
        ' | Infrastructure: ' + (infra.join('; ') || '—');
      const composedMessage = (fitLine + (notes ? '\nNotes: ' + notes : '')).slice(0, 4900);

      button.textContent = 'Sending...';
      button.disabled = true;

      try {
        const res = await fetch(`${API_BASE}/api/contact`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            name, email, company, phone, service,
            message: composedMessage,
            budget, timeline, infrastructure: infra.join('; '),
            source: 'contact-form'
          })
        });
        
        if (!res.ok) throw new Error('Network response was not ok');

        showFormMessage(contactForm, '✓ Message sent successfully! We will get back to you soon.', 'success');
        contactForm.reset();
      } catch (err) {
        console.error(err);
        showFormMessage(contactForm, 'Something went wrong. Please try again or email us directly.', 'error');
      } finally {
        button.textContent = originalText;
        button.disabled = false;
      }
    });
  }

  // ============================================
  // FORM MESSAGE HELPER
  // ============================================
  function showFormMessage(form, message, type) {
    // Remove existing message
    const existingMsg = form.parentElement.querySelector('.form-message');
    if (existingMsg) existingMsg.remove();

    const msgEl = document.createElement('p');
    msgEl.className = 'form-message';
    msgEl.style.cssText = `
      margin-top: 1rem;
      padding: 0.8rem 1rem;
      border-radius: 8px;
      text-align: center;
      white-space: pre-line;
      ${type === 'success'
        ? 'background: rgba(100, 222, 223, 0.1); color: #64dedf; border: 1px solid rgba(100, 222, 223, 0.3);'
        : 'background: rgba(255, 107, 107, 0.1); color: #ff6b6b; border: 1px solid rgba(255, 107, 107, 0.3);'
      }
    `;
    msgEl.textContent = message;
    form.parentElement.insertBefore(msgEl, form.nextSibling);

    // Auto-remove after 5 seconds
    setTimeout(() => msgEl.remove(), 5000);
  }

  // ============================================
  // NAVBAR HIDE/SHOW ON SCROLL
  // ============================================
  const navbar = document.querySelector('.navbar');
  let lastScrollY = window.scrollY;
  let ticking = false;

  const handleScroll = () => {
    const y = Math.max(window.scrollY, 0);
    const menu = document.getElementById('nav-menu');
    navbar.classList.toggle('navbar-scrolled', y > 10);
    const delta = y - lastScrollY;
    // never hide while the mobile menu is open, a nav control has focus, or near the top
    if ((menu && menu.classList.contains('active')) || navbar.matches(':focus-within') || y <= 80) {
      navbar.classList.remove('navbar-hidden');
    } else if (delta > 6) {
      navbar.classList.add('navbar-hidden');
    } else if (delta < -6) {
      navbar.classList.remove('navbar-hidden');
    }
    lastScrollY = y;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(handleScroll);
      ticking = true;
    }
  }, { passive: true });

  // ============================================
  // SMOOTH SCROLL FOR ANCHOR LINKS
  // ============================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const id = this.getAttribute('href');
      if (!id || id.length < 2) return; // bare "#" would throw in querySelector
      e.preventDefault();
      const target = document.querySelector(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ============================================
  // CAL.COM BOOKING MODAL
  // ============================================

  // Initialize Cal.com embed when modal opens
  let calInitialized = false;

  window.openBookingModal = function () {
    const modal = document.getElementById('booking-modal');
    if (!modal) return;

    // Show modal
    modal.hidden = false;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Focus trap - focus the close button
    const closeBtn = modal.querySelector('.booking-modal-close');
    if (closeBtn) closeBtn.focus();

    // Initialize Cal.com embed on first open
    if (!calInitialized) {
      initCalEmbed();
      calInitialized = true;
    }

    // Handle escape key
    document.addEventListener('keydown', handleModalEscape);
  };

  window.closeBookingModal = function () {
    const modal = document.getElementById('booking-modal');
    if (!modal) return;

    modal.classList.remove('active');
    // Wait for animation before hiding
    setTimeout(() => {
      modal.hidden = true;
    }, 300);
    document.body.style.overflow = '';

    // Remove escape key listener
    document.removeEventListener('keydown', handleModalEscape);

    // Return focus to the booking button
    const bookingBtn = document.querySelector('.btn-booking');
    if (bookingBtn) bookingBtn.focus();
  };

  function handleModalEscape(e) {
    if (e.key === 'Escape') {
      closeBookingModal();
    }
  }

  function initCalEmbed() {
    const embedContainer = document.getElementById('cal-embed');
    if (!embedContainer) return;

    // Create the Cal.com inline embed
    const calInline = document.createElement('cal-inline');
    calInline.setAttribute('calLink', 'techguru/strategy-call');
    calInline.style.width = '100%';
    calInline.style.height = '100%';
    calInline.style.overflow = 'auto';

    // Add Cal.com embed script if not already loaded
    if (!window.Cal) {
      const script = document.createElement('script');
      script.src = 'https://app.cal.com/embed/embed.js';
      script.async = true;
      script.onload = function () {
        // Initialize Cal.com
        window.Cal('init', { origin: 'https://app.cal.com' });

        // Add inline embed to container
        embedContainer.innerHTML = '';
        embedContainer.appendChild(calInline);

        // Configure embed with TechGuru branding
        window.Cal('inline', {
          calLink: 'techguru/strategy-call',
          elementOrSelector: '#cal-embed',
          config: {
            theme: document.body.classList.contains('light-theme') ? 'light' : 'dark',
            styles: {
              branding: {
                brandColor: '#4a6cf7'
              }
            }
          }
        });
      };
      document.head.appendChild(script);
    } else {
      // Cal.com already loaded, just initialize
      embedContainer.innerHTML = '';
      embedContainer.appendChild(calInline);
      window.Cal('inline', {
        calLink: 'techguru/strategy-call',
        elementOrSelector: '#cal-embed',
        config: {
          theme: document.body.classList.contains('light-theme') ? 'light' : 'dark',
          styles: {
            branding: {
              brandColor: '#4a6cf7'
            }
          }
        }
      });
    }
  }

  // ============================================
  // COUNTER ANIMATION ON RESULTS - Premium Stats
  // ============================================
  const resultNumbers = document.querySelectorAll('.result-number');
  
  // Parse value and suffix from text (e.g., "40+" -> {value: 40, suffix: "+"})
  function parseResultValue(text) {
    const cleaned = text.trim();
    // Match patterns like "40+", "95%", "2-4x", "24/7", "80%", "3x"
    const numMatch = cleaned.match(/^([\d.]+)/);
    if (numMatch) {
      const value = parseFloat(numMatch[1]);
      const suffix = cleaned.replace(numMatch[1], '');
      return { value, suffix, hasNumber: true };
    }
    // For patterns like "24/7" - don't animate, just return as-is
    return { value: 0, suffix: cleaned, hasNumber: false };
  }

  // Animate counter from 0 to target value
  function animateCounter(element, targetValue, suffix, duration = 1500) {
    const startTime = performance.now();
    const startValue = 0;
    
    function updateCounter(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth deceleration
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = startValue + (targetValue - startValue) * easeOutQuart;
      
      // Format display value
      let displayValue;
      if (targetValue % 1 !== 0) {
        // Has decimal, show one decimal place during animation
        displayValue = currentValue.toFixed(1);
      } else {
        displayValue = Math.round(currentValue);
      }
      
      element.textContent = displayValue + suffix;
      
      // Add pulse effect periodically
      if (progress < 1) {
        if (elapsed % 100 < 20) {
          element.classList.add('counting');
          setTimeout(() => element.classList.remove('counting'), 150);
        }
        requestAnimationFrame(updateCounter);
      } else {
        // Animation complete
        element.textContent = targetValue + suffix;
        element.classList.add('count-complete');
        element.dataset.counted = 'true';
        setTimeout(() => element.classList.remove('count-complete'), 500);
      }
    }
    
    requestAnimationFrame(updateCounter);
  }

  // Intersection Observer for triggering counter animation
  if ('IntersectionObserver' in window) {
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        
        // Only animate once
        if (element.dataset.counted === 'true') return;
        
        const originalText = element.dataset.originalValue || element.textContent;
        element.dataset.originalValue = originalText;
        
        const parsed = parseResultValue(originalText);
        
        if (parsed.hasNumber && parsed.value > 0) {
          // Start with 0
          element.textContent = '0' + parsed.suffix;
          // Animate to target
          setTimeout(() => {
            animateCounter(element, parsed.value, parsed.suffix, 1200);
          }, 200);
        }
      }
    });
  }, {
    threshold: 0.5,
    rootMargin: '0px 0px -50px 0px'
  });

  // Observe all result numbers
  resultNumbers.forEach(num => {
    counterObserver.observe(num);
  });
  }
});
