/* ==========================================================================
   MUSCLE FLEX — motion helpers
   Built with the motionsites-web-builder skill's motion rules:
     · entrances ease-out  cubic-bezier(.22,1,.36,1)
     · state changes       cubic-bezier(.4,0,.2,1)
     · exits faster than entrances
     · transform + opacity only (60fps)
     · rest state is always the visible state — if anything here fails,
       nothing is left hidden
     · every helper has a prefers-reduced-motion branch (jump to final state)
   Timings follow CLAUDE.md (page 250ms, stagger 40ms, count-up 900ms).
   Engine: the native Web Animations API. No library, nothing to download.
   CSS-only motion (hover lift, press, live dot, shimmer, nav indicator)
   lives in the "Motion" block at the end of components.css.
   ========================================================================== */
(function () {
  'use strict';
  var App = window.MFApp = window.MFApp || {};

  var EASE_OUT = 'cubic-bezier(.22, 1, .36, 1)';
  var EASE_STATE = 'cubic-bezier(.4, 0, .2, 1)';
  var DUR = { page: 250, stagger: 40, count: 900, drawer: 300, pop: 180, exit: 150, skeleton: 600 };

  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function reduced() { return !!mq.matches; }
  function can(el) { return el && typeof el.animate === 'function' && !reduced(); }

  /* Run a WAAPI animation; always resolve `done`, even if it is cancelled. */
  function play(el, frames, opts, done) {
    if (!can(el)) { if (done) done(); return null; }
    var a = el.animate(frames, opts), fired = false;
    function fin() { if (!fired) { fired = true; if (done) done(); } }
    a.onfinish = fin;
    a.oncancel = fin;
    /* Safety net: if the browser is not painting frames (background tab,
       throttled window) the finish event never comes — never leave the UI stuck. */
    if (done) setTimeout(fin, (opts.duration || 0) + (opts.delay || 0) + 120);
    return a;
  }

  /* Guard for entrances that start hidden (fill: backwards). If the browser is
     not painting frames, cancel them after their time is up so the content
     snaps to its normal, visible state. In a healthy tab they are long done. */
  function guard(anims, ms) {
    setTimeout(function () {
      anims.forEach(function (a) { if (a && a.playState !== 'finished') { try { a.cancel(); } catch (e) { /* gone */ } } });
    }, ms);
  }

  var RISE = [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }];

  /* ---- page transition: fade + 12px rise, blocks staggered 40ms --------- */
  function pageIn(view) {
    if (!can(view)) return;
    var blocks = [], kids = view.children, i, j;
    for (i = 0; i < kids.length; i++) {
      var k = kids[i];
      /* a grid of cards staggers card by card; everything else moves as one block */
      if (k.classList.contains('grid')) { for (j = 0; j < k.children.length; j++) blocks.push(k.children[j]); }
      else blocks.push(k);
    }
    var anims = blocks.slice(0, 14).map(function (el, n) {
      /* fill: backwards → hidden only while waiting its turn, then released */
      return el.animate(RISE, { duration: DUR.page, delay: n * DUR.stagger, easing: EASE_OUT, fill: 'backwards' });
    });
    guard(anims, DUR.page + 14 * DUR.stagger + 200);
  }

  /* ---- tab panel / list swap: quick fade + 8px rise ---------------------- */
  function contentIn(el) {
    play(el, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 200, easing: EASE_OUT });
  }

  /* ---- KPI count-up ------------------------------------------------------ */
  function countUp(el, value, format) {
    if (!el) return;
    format = format || function (n) { return String(Math.round(n)); };
    if (reduced() || !window.requestAnimationFrame) { el.textContent = format(value); return; }
    var start = null, finished = false;
    el.textContent = format(0);
    /* Safety net: frames may never fire in a background tab — always land on the real number. */
    setTimeout(function () { if (!finished) { finished = true; el.textContent = format(value); } }, DUR.count + 200);
    function tick(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / DUR.count);
      var eased = 1 - Math.pow(1 - p, 3);                 /* ease-out cubic */
      if (finished) return;
      el.textContent = format(p < 1 ? value * eased : value);
      if (p < 1 && document.contains(el)) requestAnimationFrame(tick); else finished = true;
    }
    requestAnimationFrame(tick);
  }
  /* Count up every [data-count] inside root. data-format: money | num (default) */
  function countAll(root) {
    var fmt = App.fmt, nodes = root.querySelectorAll('[data-count]');
    for (var i = 0; i < nodes.length; i++) {
      (function (el) {
        var v = parseFloat(el.getAttribute('data-count')) || 0;
        var f = el.getAttribute('data-format') === 'money'
          ? function (n) { return fmt.money(Math.round(n)); }
          : function (n) { return fmt.num(Math.round(n)); };
        countUp(el, v, f);
      })(nodes[i]);
    }
  }

  /* ---- overlays: drawer slides from right, modal/palette settle in ------- */
  function panelOf(el) { return el.querySelector('.drawer, .modal, .palette'); }
  function overlayIn(el) {
    var panel = panelOf(el), back = el.querySelector('.overlay__backdrop');
    play(back, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'linear' });
    if (!panel) return;
    if (panel.classList.contains('drawer')) {
      play(panel, [{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], { duration: DUR.drawer, easing: EASE_OUT });
    } else {
      play(panel, [{ opacity: 0, transform: 'translateY(10px) scale(.97)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: DUR.pop, easing: EASE_OUT });
    }
  }
  function overlayOut(el, done) {
    var panel = panelOf(el), back = el.querySelector('.overlay__backdrop');
    if (!can(panel)) { if (done) done(); return; }
    el.style.pointerEvents = 'none';
    play(back, [{ opacity: 1 }, { opacity: 0 }], { duration: DUR.exit, easing: 'linear', fill: 'forwards' });
    var frames = panel.classList.contains('drawer')
      ? [{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }]
      : [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.98)' }];
    play(panel, frames, { duration: DUR.exit, easing: EASE_STATE, fill: 'forwards' }, done);
  }

  /* ---- popover menus ----------------------------------------------------- */
  function popIn(el) {
    play(el, [{ opacity: 0, transform: 'translateY(-6px) scale(.98)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 140, easing: EASE_OUT });
  }

  /* ---- toasts ------------------------------------------------------------ */
  function toastIn(el) {
    play(el, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, easing: EASE_OUT });
  }
  function toastOut(el, done) {
    play(el, [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(16px)' }], { duration: DUR.exit, easing: EASE_STATE, fill: 'forwards' }, done);
  }

  /* ---- sidebar: sliding active indicator --------------------------------- */
  var indicator = null, lastActive = null;
  function navIndicator(activeEl) {
    var nav = document.getElementById('nav');
    if (!nav) return;
    if (!indicator || !nav.contains(indicator)) {
      indicator = document.createElement('span');
      indicator.className = 'nav__indicator';
      indicator.setAttribute('aria-hidden', 'true');
      nav.appendChild(indicator);
      nav.classList.add('has-indicator');
    }
    lastActive = activeEl || null;
    if (!activeEl || !nav.contains(activeEl)) { indicator.style.opacity = '0'; return; }
    var first = indicator.style.opacity !== '1';
    var y = activeEl.getBoundingClientRect().top - nav.getBoundingClientRect().top + nav.scrollTop;
    if (first) indicator.style.transition = 'none';       /* place it, don't fly in from 0 */
    indicator.style.height = (activeEl.offsetHeight - 16) + 'px';
    indicator.style.transform = 'translateY(' + Math.round(y + 8) + 'px)';
    indicator.style.opacity = '1';
    if (first) { void indicator.offsetWidth; indicator.style.transition = ''; }
  }
  window.addEventListener('resize', function () { if (lastActive) { if (indicator) indicator.style.opacity = '0'; navIndicator(lastActive); } });

  /* ---- skeleton shimmer on first visit to a screen ----------------------- */
  function skeleton(view, done) {
    if (reduced()) { done(); return; }
    view.innerHTML =
      '<div class="sk" aria-hidden="true">' +
        '<div class="skeleton sk__title"></div><div class="skeleton sk__sub"></div>' +
        '<div class="grid grid--4 sk__row"><div class="skeleton sk__card"></div><div class="skeleton sk__card"></div><div class="skeleton sk__card"></div><div class="skeleton sk__card"></div></div>' +
        '<div class="skeleton sk__block"></div>' +
      '</div><p class="sr-only" role="status">Loading…</p>';
    setTimeout(done, DUR.skeleton);
  }

  /* ---- hooks for later stages (charts, live feed, kanban) ---------------- */
  /* ---- charts draw in: bars grow, lines wipe, donut/ring settle ---------- */
  function each(root, sel, fn) {
    var n = root.querySelectorAll(sel);
    for (var i = 0; i < n.length; i++) fn(n[i], i);
  }
  function drawChart(root) {
    if (!root || reduced() || !root.animate) return;
    var anims = [];
    var GROW = [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }];
    each(root, '.bars .bar', function (el, i) { anims.push(el.animate(GROW, { duration: 520, delay: 80 + i * 30, easing: EASE_OUT, fill: 'backwards' })); });
    each(root, '.strip .bar', function (el, i) { anims.push(el.animate(GROW, { duration: 420, delay: 120 + i * 16, easing: EASE_OUT, fill: 'backwards' })); });
    each(root, '.hbars .hbar', function (el, i) { anims.push(el.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 520, delay: 80 + i * 50, easing: EASE_OUT, fill: 'backwards' })); });
    each(root, '.reveal', function (el) { anims.push(el.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 800, delay: 380, easing: EASE_STATE, fill: 'backwards' })); });
    each(root, '.donut', function (el) { anims.push(el.animate([{ transform: 'rotate(-50deg)' }, { transform: 'rotate(0deg)' }], { duration: 700, easing: EASE_OUT })); });
    each(root, '.donut__seg', function (el, i) { anims.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 60 + i * 70, easing: 'linear', fill: 'backwards' })); });
    each(root, '.ring', function (el) { anims.push(el.animate([{ opacity: 0, transform: 'rotate(-70deg)' }, { opacity: 1, transform: 'rotate(0deg)' }], { duration: 700, delay: 80, easing: EASE_OUT, fill: 'backwards' })); });
    each(root, '.heat__col', function (el, i) { anims.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, delay: 60 + i * 18, easing: 'linear', fill: 'backwards' })); });
    guard(anims, 1600);
  }

  /* ---- live feed: new row slides in with a short accent glow ------------- */
  function listInsert(el) {
    if (!can(el)) return el;
    el.animate([{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 280, easing: EASE_OUT });
    var glow = document.createElement('span');
    glow.className = 'row-glow';
    glow.setAttribute('aria-hidden', 'true');
    el.appendChild(glow);
    play(glow, [{ opacity: 1 }, { opacity: 0 }], { duration: 1400, easing: EASE_STATE, fill: 'forwards' }, function () {
      if (glow.parentNode) glow.parentNode.removeChild(glow);
    });
    return el;
  }
  /* Row leaves: fade + slide, then the caller removes it */
  function listRemove(el, done) {
    play(el, [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(12px)' }], { duration: DUR.exit + 30, easing: EASE_STATE, fill: 'forwards' }, done);
  }

  /* ---- kanban drag: lift with a slight tilt, settle on drop --------------- */
  /* The carried card is a fixed-position copy moved with transform only. */
  var TILT = 3;
  function dragLift(ghost) {
    if (!can(ghost)) return;
    ghost.animate([{ transform: 'translate3d(0,0,0) rotate(0deg) scale(1)' }, { transform: 'translate3d(0,0,0) rotate(' + TILT + 'deg) scale(1.03)' }], { duration: 140, easing: EASE_OUT });
  }
  function dragMove(ghost, dx, dy) {
    ghost.style.transform = 'translate3d(' + dx + 'px,' + dy + 'px,0)' + (reduced() ? '' : ' rotate(' + TILT + 'deg) scale(1.03)');
  }
  function dragDrop(ghost, dx, dy, done) {
    play(ghost, [{ transform: ghost.style.transform || 'none' }, { transform: 'translate3d(' + dx + 'px,' + dy + 'px,0) rotate(0deg) scale(1)' }],
      { duration: 190, easing: EASE_OUT, fill: 'forwards' }, done);
  }

  App.motion = {
    reduced: reduced,
    ease: { out: EASE_OUT, state: EASE_STATE },
    dur: DUR,
    play: play,
    pageIn: pageIn,
    contentIn: contentIn,
    countUp: countUp,
    countAll: countAll,
    overlayIn: overlayIn,
    overlayOut: overlayOut,
    popIn: popIn,
    toastIn: toastIn,
    toastOut: toastOut,
    navIndicator: navIndicator,
    skeleton: skeleton,
    drawChart: drawChart,
    listInsert: listInsert,
    listRemove: listRemove,
    dragLift: dragLift,
    dragMove: dragMove,
    dragDrop: dragDrop
  };
})();
