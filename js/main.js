document.addEventListener('DOMContentLoaded', function () {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(savedTheme);

  initThemeToggle();
  initNavigation();
  initContactForm();
  initFAQ();
  initMobileMenu();
  initSmoothScroll();
  initParticles();
  initCyberpunkEffects();
});

function initThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;

  themeToggle.addEventListener('click', function (e) {
    e.preventDefault();
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.className = theme + '-theme';
  document.body.className = theme + '-theme';

  const themeIcon = document.getElementById('theme-toggle-icon');
  if (!themeIcon) return;

  if (theme === 'dark') {
    themeIcon.className = 'fas fa-sun';
    themeIcon.style.color = '#fbbf24';
  } else {
    themeIcon.className = 'fas fa-moon';
    themeIcon.style.color = '#475569';
  }
}

function initNavigation() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  let lastScrollY = 0;
  let ticking = false;

  function updateHeader() {
    const scrollY = window.scrollY;

    if (scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    if (scrollY > lastScrollY && scrollY > 100) {
      header.classList.add('hidden');
    } else if (scrollY < lastScrollY) {
      header.classList.remove('hidden');
    }

    lastScrollY = scrollY;
    ticking = false;
  }

  function requestTick() {
    if (!ticking) {
      requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }

  window.addEventListener('scroll', requestTick);
}

function initContactForm() {
  const contactForm = document.querySelector('#contact-form');
  if (!contactForm) return;

  contactForm.addEventListener('submit', function (e) {
    const name = contactForm.querySelector('input[name="name"]').value;
    const email = contactForm.querySelector('input[name="email"]').value;
    const message = contactForm.querySelector('textarea[name="message"]').value;

    if (!name || !email || !message) {
      e.preventDefault();
      alert('Please fill in all fields.');
      return;
    }
  });
}

function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach((item) => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    if (!question || !answer) return;

    question.addEventListener('click', function () {
      const isOpen = item.classList.contains('open');

      faqItems.forEach((otherItem) => {
        if (otherItem !== item) {
          otherItem.classList.remove('open');
        }
      });

      if (isOpen) {
        item.classList.remove('open');
      } else {
        item.classList.add('open');
      }
    });
  });
}

function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const nav = document.getElementById('main-nav');

  if (!hamburger || !nav) return;

  hamburger.addEventListener('click', function () {
    nav.classList.toggle('mobile-open');
    hamburger.classList.toggle('active');
  });

  const navLinks = nav.querySelectorAll('a');
  navLinks.forEach((link) => {
    link.addEventListener('click', function () {
      nav.classList.remove('mobile-open');
      hamburger.classList.remove('active');
    });
  });
}

function initSmoothScroll() {
  const links = document.querySelectorAll('a[href^="#"]');

  links.forEach((link) => {
    link.addEventListener('click', function (e) {
      e.preventDefault();

      const targetId = this.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    });
  });
}

function initParticles() {
  particlesJS('particles-js', {
    particles: {
      number: { value: 120, density: { enable: true, value_area: 1000 } },
      color: { value: ['#6366f1', '#8b5cf6', '#10b981'] },
      shape: { type: 'circle', stroke: { width: 0, color: '#000000' }, polygon: { nb_sides: 6 } },
      opacity: { value: 0.7, random: true, anim: { enable: true, speed: 2, opacity_min: 0.3, sync: false } },
      size: { value: 4, random: true, anim: { enable: true, speed: 20, size_min: 0.5, sync: false } },
      line_linked: { enable: true, distance: 120, color: '#6366f1', opacity: 0.5, width: 1.5 },
      move: {
        enable: true,
        speed: 4,
        direction: 'none',
        random: true,
        straight: false,
        out_mode: 'out',
        bounce: false,
        attract: { enable: true, rotateX: 800, rotateY: 1600 },
      },
    },
    interactivity: {
      detect_on: 'canvas',
      events: { onhover: { enable: true, mode: 'bubble' }, onclick: { enable: true, mode: 'repulse' }, resize: true },
      modes: {
        grab: { distance: 400, line_linked: { opacity: 1 } },
        bubble: { distance: 300, size: 10, duration: 2, opacity: 0.8, speed: 3 },
        repulse: { distance: 200, duration: 0.4 },
        push: { particles_nb: 6 },
        remove: { particles_nb: 2 },
      },
    },
    retina_detect: true,
  });
}

function initCyberpunkEffects() {
  console.log('Cyberpunk effects initialized');

  const buttons = document.querySelectorAll('.btn, .cta-button');
  buttons.forEach((button) => {
    button.addEventListener('mouseenter', function () {
      this.style.boxShadow = '0 0 20px rgba(74, 144, 226, 0.5)';
    });

    button.addEventListener('mouseleave', function () {
      this.style.boxShadow = '';
    });
  });
}

function toggleChatbox() {
  const chatbox = document.querySelector('.chatbox');
  if (chatbox) {
    chatbox.classList.toggle('open');
  }
}
window.toggleChatbox = toggleChatbox;
