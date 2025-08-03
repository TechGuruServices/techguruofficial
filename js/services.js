// Copilot: Service-card details accordion
// Updated for smooth, accessible toggle and on-brand styling

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.details-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const content = btn.nextElementSibling;
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!isOpen));
      if (isOpen) {
        content.setAttribute('hidden', '');
      } else {
        content.removeAttribute('hidden');
      }
    });
  });
});
