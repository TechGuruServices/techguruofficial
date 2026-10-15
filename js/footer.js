/* TECHGURU — Footer v3: scroll-triggered story. Adds .tgf-ready to <html> only when motion is allowed (fails visible). */
(function(){try{
  var els=[].slice.call(document.querySelectorAll('.tgf-rv,.tgf-edge'));
  if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  document.documentElement.classList.add('tgf-ready');
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('tgf-in');io.unobserve(e.target)}})},{threshold:.15});
  els.forEach(function(el){io.observe(el)});
}catch(e){}})();
