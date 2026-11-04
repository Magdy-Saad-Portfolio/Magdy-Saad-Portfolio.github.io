// Motion and interactions for the portfolio.
// Everything animates with transform and opacity only, and replays when scrolling up or down.
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');

  // Split a headline into words for the word-by-word reveal. Safe to call again after the text changes.
  function split(el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach(function (w, i) {
      var o = document.createElement('span'); o.className = 'w';
      var s = document.createElement('span'); s.textContent = w; s.style.transitionDelay = (i * 0.045) + 's';
      o.appendChild(s); el.appendChild(o); el.appendChild(document.createTextNode(' '));
    });
  }
  document.querySelectorAll('[data-split]').forEach(split);

  // Reveal on enter, reset on leave.
  var io = null;
  function onIntersect(entries) {
    entries.forEach(function (e) {
      var t = e.target;
      if (t.classList.contains('ch')) { t.classList.toggle('on', e.isIntersecting); return; }
      if (e.isIntersecting) { t.classList.add('in'); countUp(t); }
      else { t.classList.remove('in'); resetCount(t); }
    });
  }
  function observe(scope) {
    var targets = (scope || document).querySelectorAll('[data-r],[data-ph],.words,.flow,.ch');
    if (!io) {
      if (!('IntersectionObserver' in window)) { targets.forEach(function (t) { t.classList.add('in', 'on'); }); return; }
      io = new IntersectionObserver(onIntersect, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    }
    targets.forEach(function (t) { io.observe(t); });
  }
  observe();

  function countUp(scope) {
    if (reduce) return;
    scope.querySelectorAll('[data-count]').forEach(function (b) {
      var end = +b.dataset.count, suf = b.dataset.suffix || '', t0 = null;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min(1, (ts - t0) / 1100);
        b.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suf;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }
  function resetCount(scope) {
    scope.querySelectorAll('[data-count]').forEach(function (b) { b.textContent = b.dataset.count + (b.dataset.suffix || ''); });
  }

  // Scroll-linked: progress bar, header hide/show, thread fill, parallax, pinned gallery.
  var top = document.getElementById('top'), prog = document.getElementById('progress'), fill = document.getElementById('threadFill');
  var story = document.querySelector('.story'), hs = document.getElementById('hs'), track = document.getElementById('hsTrack');
  var px = [].slice.call(document.querySelectorAll('[data-px]'));
  var lastY = window.scrollY, ticking = false;
  function frame() {
    ticking = false;
    var y = window.scrollY, vh = window.innerHeight, docH = root.scrollHeight - vh;
    prog.style.transform = 'scaleX(' + (docH > 0 ? y / docH : 0) + ')';
    top.classList.toggle('scrolled', y > 20);
    if (y > lastY + 6 && y > 200) top.classList.add('hide'); else if (y < lastY - 6) top.classList.remove('hide');
    lastY = y;
    if (reduce) return;
    var r = story.getBoundingClientRect();
    var p = Math.max(0, Math.min(1, (vh * 0.6 - r.top) / r.height));
    fill.style.transform = 'scaleY(' + p + ')';
    px.forEach(function (img) {
      var b = img.parentNode.getBoundingClientRect();
      if (b.bottom < 0 || b.top > vh) return;
      var c = (b.top + b.height / 2 - vh / 2) / vh;
      img.style.transform = 'translate3d(0,' + (c * -6) + '%,0) scale(1.12)';
    });
    if (hs && window.innerWidth > 900) {
      var hr = hs.getBoundingClientRect(), span = hr.height - vh;
      var q = Math.max(0, Math.min(1, -hr.top / span));
      track.style.transform = 'translate3d(' + (-q * (track.scrollWidth - window.innerWidth)) + 'px,0,0)';
    }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  window.addEventListener('resize', frame);
  frame();

  // CV viewer
  var dlg = document.getElementById('cv');
  document.querySelectorAll('[data-cv]').forEach(function (b) {
    b.addEventListener('click', function () { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); });
  });
  document.getElementById('cvClose').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });

  // Used by supabase-loader.js after it swaps in text from the dashboard.
  window.Site = {
    resplit: function (el) { split(el); if (io) io.observe(el); },
    observe: observe
  };
})();
