// Finch Design Group — progressive enhancement only.
// Without this file every page still works: links navigate, FAQs open, all
// service descriptions show, the gallery shows all work, and forms post.
(function () {
  // Header over the hero turns solid once the page scrolls. Bound once.
  function header() {
    var hdr = document.querySelector('.site-header--overlay');
    if (!hdr || hdr.dataset.bound) return;
    hdr.dataset.bound = '1';
    var onScroll = function () { hdr.classList.toggle('is-solid', window.scrollY > 40); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Service switcher: one open description, one large photo.
  function tabs(root) {
    root.querySelectorAll('[data-tabs]').forEach(function (box) {
      if (box.dataset.bound) return;
      box.dataset.bound = '1';
      var btns = [].slice.call(box.querySelectorAll('.svc-tab__btn'));
      var show = function (active) {
        btns.forEach(function (b) {
          var on = b === active;
          b.setAttribute('aria-expanded', String(on));
          document.getElementById(b.getAttribute('aria-controls')).hidden = !on;
          var img = document.getElementById(b.getAttribute('data-stage'));
          if (img) img.hidden = !on;
        });
      };
      btns.forEach(function (b) { b.addEventListener('click', function () { show(b); }); });
      if (btns.length) show(btns[0]);
    });
  }

  // Azenco louver demo: blades rotate from 0 (closed) to 90 degrees (open).
  function louvers(root) {
    root.querySelectorAll('[data-louver]').forEach(function (box) {
      if (box.dataset.bound) return;
      box.dataset.bound = '1';
      var svg = box.querySelector('svg.lv');
      var range = box.querySelector('.louver__range');
      var note = box.querySelector('.louver__note');
      var modes = [].slice.call(box.querySelectorAll('.louver__mode'));
      var blades = [].slice.call(svg.querySelectorAll('[data-blade]'));
      var shafts = [].slice.call(svg.querySelectorAll('[data-shaft]'));
      var shade = svg.querySelector('[data-shade]');
      var set = function (angle, modeId) {
        angle = Math.max(0, Math.min(90, Number(angle)));
        var open = angle / 90;
        blades.forEach(function (b) { b.setAttribute('transform', 'translate(' + b.getAttribute('data-x') + ' ' + b.getAttribute('data-y') + ') rotate(' + angle + ')'); });
        shafts.forEach(function (s) { s.setAttribute('opacity', (0.05 + 0.5 * open).toFixed(2)); });
        if (shade) shade.setAttribute('opacity', (0.5 * (1 - open)).toFixed(2));
        var id = modeId || (angle < 15 ? 'rain' : angle < 65 ? 'shade' : 'open');
        svg.classList.toggle('is-rain', id === 'rain');
        modes.forEach(function (m) {
          var on = m.getAttribute('data-mode') === id;
          m.setAttribute('aria-pressed', String(on));
          if (on && note) note.textContent = m.getAttribute('data-note');
        });
        if (range && Number(range.value) !== angle) range.value = angle;
      };
      modes.forEach(function (m) { m.addEventListener('click', function () { set(m.getAttribute('data-angle'), m.getAttribute('data-mode')); }); });
      if (range) range.addEventListener('input', function () { set(range.value); });
      set(range ? range.value : 40);
    });
  }

  // Showcase rail arrows.
  function rails(root) {
    root.querySelectorAll('[data-rail-prev], [data-rail-next]').forEach(function (b) {
      if (b.dataset.bound) return;
      b.dataset.bound = '1';
      b.addEventListener('click', function () {
        var rail = document.getElementById(b.getAttribute('aria-controls'));
        if (rail) rail.scrollBy({ left: (b.hasAttribute('data-rail-prev') ? -1 : 1) * rail.clientWidth * 0.8, behavior: 'smooth' });
      });
    });
  }

  // Project filters.
  function filters(root) {
    root.querySelectorAll('.filters').forEach(function (group) {
      if (group.dataset.bound) return;
      group.dataset.bound = '1';
      var gallery = group.nextElementSibling;
      group.addEventListener('click', function (ev) {
        var btn = ev.target.closest('button[data-filter]');
        if (!btn || !gallery) return;
        var f = btn.getAttribute('data-filter');
        group.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        gallery.querySelectorAll('.g-item').forEach(function (it) { it.hidden = !(f === 'all' || it.getAttribute('data-cat') === f); });
      });
    });
  }

  // Lightbox with previous / next across the visible items of one collection.
  var box, boxImg, boxCap, items = [], index = 0;
  function openAt(i) {
    index = (i + items.length) % items.length;
    var fig = items[index], src = fig.querySelector('img');
    boxImg.src = src.currentSrc || src.src;
    boxImg.alt = src.alt;
    var cap = fig.querySelector('figcaption');
    boxCap.textContent = cap ? cap.textContent.replace(/\s+/g, ' ').trim() : src.alt;
    if (!box.open) box.showModal();
  }
  function lightbox(root) {
    box = document.getElementById('lightbox');
    if (!box || typeof box.showModal !== 'function') return;
    boxImg = box.querySelector('img'); boxCap = box.querySelector('p');
    if (!box.dataset.bound) {
      box.dataset.bound = '1';
      box.querySelector('.lightbox__close').addEventListener('click', function () { box.close(); });
      box.querySelector('.lightbox__prev').addEventListener('click', function () { openAt(index - 1); });
      box.querySelector('.lightbox__next').addEventListener('click', function () { openAt(index + 1); });
      box.addEventListener('click', function (ev) { if (ev.target === box) box.close(); });
      box.addEventListener('keydown', function (ev) {
        if (ev.key === 'ArrowLeft') openAt(index - 1);
        if (ev.key === 'ArrowRight') openAt(index + 1);
      });
    }
    root.querySelectorAll('.g-item button[data-full], .rail__item button[data-full]').forEach(function (b) {
      if (b.dataset.bound) return;
      b.dataset.bound = '1';
      b.addEventListener('click', function () {
        var fig = b.closest('.g-item, .rail__item');
        var group = fig.parentElement;
        items = [].slice.call(group.children).filter(function (n) { return !n.hidden; });
        openAt(items.indexOf(fig));
      });
    });
  }

  // Mockup forms: validate, then confirm without sending anything.
  function forms(root) {
    root.querySelectorAll('#project-form, #quick-form').forEach(function (form) {
      if (form.dataset.bound) return;
      form.dataset.bound = '1';
      form.addEventListener('submit', function (ev) {
        if (!form.checkValidity()) { ev.preventDefault(); form.reportValidity(); return; }
        // A live form posts to its action. Only mockup forms stop here.
        if (!form.hasAttribute('data-mock')) return;
        ev.preventDefault();
        var done = document.createElement('p');
        done.className = 'form-done';
        done.setAttribute('role', 'status');
        done.textContent = 'Thanks — this is a mockup, so nothing was sent. On the live site Finch would receive this request and call to book your consultation.';
        var foot = form.querySelector('.form__foot');
        if (foot) foot.replaceWith(done); else form.appendChild(done);
      });
    });
  }

  // Hero motion clip: honours reduced motion, can be paused, and falls back to
  // the photo slideshow if the video cannot play.
  function heroVideo() {
    var hero = document.querySelector('[data-hero-video]');
    if (!hero || hero.dataset.bound) return;
    hero.dataset.bound = '1';
    var video = hero.querySelector('.hero__video');
    var btn = hero.querySelector('[data-motion-toggle]');
    if (!video || !btn) return;
    var label = function (playing) { btn.textContent = playing ? 'Pause motion' : 'Play motion'; };
    var fallback = function () { video.remove(); btn.parentNode.remove(); hero.classList.remove('hero--video'); };
    video.addEventListener('error', fallback);
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { video.removeAttribute('autoplay'); video.pause(); label(false); }
    else {
      label(true);
      var attempt = video.play();
      if (attempt && attempt.catch) attempt.catch(function () { label(false); });
    }
    btn.addEventListener('click', function () {
      if (video.paused) { var p = video.play(); if (p && p.catch) p.catch(function () {}); label(true); }
      else { video.pause(); label(false); }
    });
  }

  // "Explore a finished project": one open description, markers in sync.
  function explore(root) {
    root.querySelectorAll('[data-explore]').forEach(function (box) {
      if (box.dataset.bound) return;
      box.dataset.bound = '1';
      var items = [].slice.call(box.querySelectorAll('.explore__item'));
      var spots = [].slice.call(box.querySelectorAll('.spot'));
      var show = function (i) {
        items.forEach(function (it, n) {
          var on = n === i;
          if (on) it.setAttribute('data-active', ''); else it.removeAttribute('data-active');
          it.querySelector('.explore__btn').setAttribute('aria-expanded', String(on));
        });
        spots.forEach(function (s, n) { s.setAttribute('aria-pressed', String(n === i)); });
      };
      box.addEventListener('click', function (ev) {
        if (ev.target.closest('a')) return;
        var t = ev.target.closest('.spot, .explore__btn');
        if (t) show(Number(t.getAttribute('data-spot')));
      });
      show(0);
    });
  }

  // Project film: the poster is local; YouTube loads only when a visitor presses play.
  function film(root) {
    root.querySelectorAll('[data-film]').forEach(function (box) {
      if (box.dataset.bound) return;
      box.dataset.bound = '1';
      var btn = box.querySelector('.film__play');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var frame = document.createElement('iframe');
        frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(box.getAttribute('data-film')) + '?autoplay=1&rel=0&playsinline=1';
        frame.title = 'Film: ' + (box.getAttribute('data-title') || 'project film');
        frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        frame.setAttribute('allowfullscreen', '');
        box.replaceChildren(frame);
        frame.focus();
      });
    });
  }

  function init(root) {
    root = root || document;
    document.documentElement.classList.add('js');
    heroVideo();
    explore(root);
    film(root);
    var navState = document.getElementById('nav-state');
    root.querySelectorAll('.mobile-nav a').forEach(function (a) {
      a.addEventListener('click', function () { if (navState) navState.checked = false; });
    });
    header();
    tabs(root);
    louvers(root);
    rails(root);
    filters(root);
    lightbox(root);
    forms(root);
  }

  window.finchInit = init;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
  else init();
})();
