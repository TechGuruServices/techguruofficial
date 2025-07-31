// TechGuru Website - Main JavaScript
// Consolidated and optimized functionality

document.addEventListener('DOMContentLoaded', function() {
    initThemeToggle();
    initNavigation();
    initContactForm();
    initFAQ();
    initMobileMenu();
    initSmoothScroll();
    initParticles();
    initCyberpunkEffects();
});

// Theme Toggle
function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-toggle-icon');
    
    if (!themeToggle || !themeIcon) return;

    themeToggle.addEventListener('click', function(e) {
        e.preventDefault();
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    });

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.className = theme + '-theme';
        document.body.className = theme + '-theme';
        
        if (theme === 'dark') {
            themeIcon.className = 'fas fa-sun';
            themeIcon.style.color = '#fbbf24';
        } else {
            themeIcon.className = 'fas fa-moon';
            themeIcon.style.color = '#475569';
        }
    }
}

// Navigation
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
            // Scrolling down - hide header
            header.classList.add('hidden');
        } else if (scrollY < lastScrollY) {
            // Scrolling up - show header
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

// Contact Form
function initContactForm() {
    const contactForm = document.querySelector('#contact-form');
    if (!contactForm) return;

    contactForm.addEventListener('submit', function(e) {
        const name = contactForm.querySelector('input[name="name"]').value;
        const email = contactForm.querySelector('input[name="email"]').value;
        const message = contactForm.querySelector('textarea[name="message"]').value;

        if (!name || !email || !message) {
            e.preventDefault();
            alert('Please fill in all fields.');
            return;
        }

        // Form validation passed, allow normal submission
    });
}

// FAQ Accordion
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        
        if (!question || !answer) return;

        question.addEventListener('click', function() {
            const isOpen = item.classList.contains('open');
            
            // Close all other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('open');
                }
            });
            
            // Toggle current item
            if (isOpen) {
                item.classList.remove('open');
            } else {
                item.classList.add('open');
            }
        });
    });
}

// Mobile Menu
function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const nav = document.getElementById('main-nav');
    
    if (!hamburger || !nav) return;

    hamburger.addEventListener('click', function() {
        nav.classList.toggle('mobile-open');
        hamburger.classList.toggle('active');
    });

    // Close mobile menu when clicking on a link
    const navLinks = nav.querySelectorAll('a');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            nav.classList.remove('mobile-open');
            hamburger.classList.remove('active');
        });
    });
}

// Smooth Scroll
function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Particle Background (using particles.js)
function initParticles() {
    particlesJS("particles-js", {
      particles: {
        number: {
          value: 120, // Increased particle count for a richer background
          density: {
            enable: true,
            value_area: 1000 // Expanded area for better distribution
          }
        },
        color: {
          value: ["#6366f1", "#8b5cf6", "#10b981"] // Added gradient-like colors
        },
        shape: {
          type: "circle",
          stroke: {
            width: 0,
            color: "#000000"
          },
          polygon: {
            nb_sides: 6 // Changed to hexagon for variety
          }
        },
        opacity: {
          value: 0.7, // Increased opacity for better visibility
          random: true, // Randomized opacity for dynamic effect
          anim: {
            enable: true,
            speed: 2,
            opacity_min: 0.3,
            sync: false
          }
        },
        size: {
          value: 4, // Slightly larger particles
          random: true,
          anim: {
            enable: true,
            speed: 20,
            size_min: 0.5,
            sync: false
          }
        },
        line_linked: {
          enable: true,
          distance: 120, // Reduced distance for tighter connections
          color: "#6366f1",
          opacity: 0.5,
          width: 1.5 // Slightly thicker lines
        },
        move: {
          enable: true,
          speed: 4, // Reduced speed for smoother movement
          direction: "none",
          random: true, // Randomized movement for dynamic effect
          straight: false,
          out_mode: "out",
          bounce: false,
          attract: {
            enable: true,
            rotateX: 800,
            rotateY: 1600
          }
        }
      },
      interactivity: {
        detect_on: "canvas",
        events: {
          onhover: {
            enable: true,
            mode: "bubble" // Changed to bubble for interactive effect
          },
          onclick: {
            enable: true,
            mode: "repulse" // Changed to repulse for click interaction
          },
          resize: true
        },
        modes: {
          grab: {
            distance: 400,
            line_linked: {
              opacity: 1
            }
          },
          bubble: {
            distance: 300,
            size: 10,
            duration: 2,
            opacity: 0.8,
            speed: 3
          },
          repulse: {
            distance: 200,
            duration: 0.4
          },
          push: {
            particles_nb: 6
          },
          remove: {
            particles_nb: 2
          }
        }
      },
      retina_detect: true
    });
}

// Cyberpunk Effects (simplified)
function initCyberpunkEffects() {
    console.log('Cyberpunk effects initialized');
    
    // Add glow effect to buttons on hover
    const buttons = document.querySelectorAll('.btn, .cta-button');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.boxShadow = '0 0 20px rgba(74, 144, 226, 0.5)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.boxShadow = '';
        });
    });
}

// Chatbot Toggle
function toggleChatbox() {
    const chatbox = document.querySelector('.chatbox');
    if (chatbox) {
        chatbox.classList.toggle('open');
    }
}

// Export functions for inline use
window.toggleChatbox = toggleChatbox;