/* ==========================================================================
   MUSCLE FLEX — UI helpers
   formatters · shell render · toasts · popovers · drawer / modal ·
   command palette · quick-action forms · theme toggle
   Declarative hooks any screen can use (so there are never dead clicks):
     data-nav="#/route"        navigate
     data-toast="Message"      show a toast   (data-toast-type="success|info|warning|danger")
     data-action="palette|new|notifications|account|theme|more|quick:<id>"
     data-close                close the open drawer / modal
   ========================================================================== */
(function () {
  'use strict';
  var App = window.MFApp = window.MFApp || {};
  var MF = window.MF;
  var icon = App.icon;

  /* ---------------------------------------------------------------- fmt -- */
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toDate(d) {
    if (d instanceof Date) return d;
    var p = String(d).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  var fmt = App.fmt = {
    esc: function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },
    gbp: function (n, pence) {
      var opts = pence || n % 1 !== 0 ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 };
      return '£' + Number(n).toLocaleString('en-GB', opts);
    },
    num: function (n) { return Number(n).toLocaleString('en-GB'); },
    date: function (d) { d = toDate(d); return pad(d.getDate()) + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); },
    dateShort: function (d) { d = toDate(d); return pad(d.getDate()) + ' ' + MONTHS[d.getMonth()]; },
    time: function (d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); },
    daysUntil: function (d) {
      var a = toDate(d), b = new Date(MF.now.getFullYear(), MF.now.getMonth(), MF.now.getDate());
      return Math.round((a - b) / 864e5);
    },
    first: function (name) { return String(name).split(' ')[0]; }
  };

  /* -------------------------------------------------------------- toast -- */
  var TOAST_ICON = { success: 'checkCircle', info: 'info', warning: 'alert', danger: 'alert' };
  function toast(msg, type) {
    type = TOAST_ICON[type] ? type : 'success';
    var root = document.getElementById('toast-root');
    var el = document.createElement('div');
    el.className = 'toast toast--' + type;
    el.setAttribute('role', 'status');
    el.innerHTML = icon(TOAST_ICON[type]) + '<div class="toast__msg">' + fmt.esc(msg) + '</div>' +
      '<button class="toast__close" type="button" aria-label="Dismiss">' + icon('x', 'icon--sm') + '</button>';
    function remove() {
      if (!el.parentNode) return;
      App.motion.toastOut(el, function () { if (el.parentNode) el.parentNode.removeChild(el); });
    }
    el.querySelector('.toast__close').addEventListener('click', remove);
    while (root.children.length >= 4) root.removeChild(root.firstChild);
    root.appendChild(el);
    App.motion.toastIn(el);
    setTimeout(remove, 4200);
    return el;
  }

  /* ------------------------------------------------------------ popover -- */
  var pop = null;
  function closePopover() {
    if (!pop) return;
    pop.anchor.setAttribute('aria-expanded', 'false');
    if (pop.el.parentNode) pop.el.parentNode.removeChild(pop.el);
    pop = null;
  }
  function popover(anchor, html, label) {
    if (pop && pop.anchor === anchor) { closePopover(); return null; }
    closePopover();
    var el = document.createElement('div');
    el.className = 'popover';
    el.setAttribute('role', 'menu');
    if (label) el.setAttribute('aria-label', label);
    el.innerHTML = html;
    document.body.appendChild(el);
    var r = anchor.getBoundingClientRect(), w = el.offsetWidth, vw = window.innerWidth;
    el.style.top = Math.round(r.bottom + 8) + 'px';
    el.style.left = Math.round(Math.min(Math.max(8, r.right - w), vw - w - 8)) + 'px';
    anchor.setAttribute('aria-expanded', 'true');
    pop = { el: el, anchor: anchor };
    App.motion.popIn(el);
    var first = el.querySelector('.menu-item');
    if (first) first.focus();
    return el;
  }

  /* ----------------------------------------------------------- overlays -- */
  var stack = [];
  var uid = 0;
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function mountOverlay(kind, innerHtml, opts) {
    opts = opts || {};
    closePopover();
    var el = document.createElement('div');
    el.className = 'overlay overlay--' + kind;
    el.innerHTML = '<div class="overlay__backdrop" data-close></div>' + innerHtml;
    var entry = { el: el, prev: document.activeElement, onClose: opts.onClose };
    stack.push(entry);
    document.getElementById('overlay-root').appendChild(el);
    document.body.style.overflow = 'hidden';
    App.motion.overlayIn(el);
    var bodyEl = el.querySelector('.sheet__body');
    var target = el.querySelector('[data-autofocus]') || (bodyEl && bodyEl.querySelector(FOCUSABLE)) || el.querySelector(FOCUSABLE);
    if (target) target.focus();
    var api = { el: el, close: function () { closeOverlay(entry); } };
    if (opts.onOpen) opts.onOpen(el, api.close);
    return api;
  }
  function closeOverlay(entry) {
    var ix = stack.indexOf(entry);
    if (ix < 0) return;
    stack.splice(ix, 1);
    App.motion.overlayOut(entry.el, function () {
      if (entry.el.parentNode) entry.el.parentNode.removeChild(entry.el);
      if (!stack.length) document.body.style.overflow = '';
      if (entry.onClose) entry.onClose();
      if (entry.prev && entry.prev.focus && document.contains(entry.prev)) entry.prev.focus();
    });
  }
  function closeTop() { if (stack.length) closeOverlay(stack[stack.length - 1]); }
  function closeAll() { while (stack.length) closeOverlay(stack[stack.length - 1]); closePopover(); }

  function sheet(kind, opts) {
    var id = 'sheet-title-' + (++uid);
    var html = '<section class="' + kind + '" role="dialog" aria-modal="true" aria-labelledby="' + id + '">' +
      '<header class="sheet__head"><div><h2 id="' + id + '">' + fmt.esc(opts.title) + '</h2>' +
      (opts.subtitle ? '<p>' + fmt.esc(opts.subtitle) + '</p>' : '') + '</div>' +
      '<button class="icon-btn" type="button" data-close aria-label="Close">' + icon('x') + '</button></header>' +
      '<div class="sheet__body">' + (opts.body || '') + '</div>' +
      (opts.footer ? '<footer class="sheet__foot">' + opts.footer + '</footer>' : '') +
      '</section>';
    return mountOverlay(kind === 'drawer' ? 'drawer' : 'modal', html, opts);
  }
  function drawer(opts) { return sheet('drawer', opts); }
  function modal(opts) { return sheet('modal', opts); }

  /* -------------------------------------------- status chips + labels -- */
  var STATUS = {
    active: ['success', 'Active'], expiring: ['warning', 'Expiring'], overdue: ['danger', 'Overdue'], frozen: ['', 'Frozen'], expired: ['', 'Expired'],
    Paid: ['success', 'Paid'], Pending: ['warning', 'Pending'], Failed: ['danger', 'Failed'], Retry: ['warning', 'Retry'],
    Paused: ['', 'Paused'], Cancelled: ['', 'Cancelled'], 'n/a': ['', 'No Direct Debit'],
    Booked: ['warning', 'Booked'], Completed: ['success', 'Completed']
  };
  function chip(key, label) {
    var s = STATUS[key] || ['', key];
    return '<span class="chip' + (s[0] ? ' chip--' + s[0] : '') + '">' + fmt.esc(label || s[1]) + '</span>';
  }
  function riskLevel(n) { return n >= 60 ? 'High' : n >= 30 ? 'Medium' : 'Low'; }
  function agoText(days) { return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : days + ' days ago'; }
  function inText(days) { return days === 0 ? 'today' : days === 1 ? 'tomorrow' : days > 0 ? 'in ' + days + ' days' : days === -1 ? 'yesterday' : -days + ' days ago'; }

  /* ---------------------------------------------------- receipt drawer -- */
  function receipt(p) {
    var m = p.memberId ? MF.memberById[p.memberId] : null, who = m ? m.name : (p.guest || 'Guest');
    var failed = p.status === 'Failed' || p.status === 'Retry';
    drawer({
      title: 'Receipt', subtitle: p.id,
      body: '<div class="receipt"><div class="receipt__top"><span class="brand__mark" aria-hidden="true">MF</span><div><strong>' + fmt.esc(MF.gym.name) + '</strong><span>' + fmt.esc(MF.gym.address) + '</span></div></div>' +
        '<p class="figure receipt__total">' + fmt.gbp(p.amount, true) + '</p><p class="receipt__status">' + chip(p.status) + '</p>' +
        '<dl class="receipt__rows">' +
        '<div><dt>Customer</dt><dd>' + fmt.esc(who) + (m ? ' · ' + m.id : '') + '</dd></div>' +
        '<div><dt>Item</dt><dd>' + fmt.esc(p.item) + (p.note ? ' · ' + fmt.esc(p.note) : '') + '</dd></div>' +
        '<div><dt>Type</dt><dd>' + fmt.esc(p.type) + '</dd></div>' +
        '<div><dt>Method</dt><dd>' + fmt.esc(p.method || p.type) + '</dd></div>' +
        '<div><dt>Date</dt><dd>' + fmt.date(p.date) + ' · ' + p.time + '</dd></div>' +
        '<div><dt>Reference</dt><dd>' + p.id + '</dd></div></dl>' +
        '<p class="faint receipt__foot">No contracts. No hidden fees. Thanks for training with us.</p></div>',
      footer: failed
        ? '<button class="btn btn--ghost" type="button" data-close>Close</button><button class="btn" type="button" data-close data-toast="Payment link sent to ' + fmt.esc(fmt.first(who)) + '.">Send link</button><button class="btn btn--primary" type="button" data-close data-toast="Retry queued. We will tell you how it lands.">Retry now</button>'
        : '<button class="btn btn--ghost" type="button" data-close>Close</button><button class="btn" type="button" data-toast="Sent to the printer at the desk." data-toast-type="info">Print</button><button class="btn btn--primary" type="button" data-close data-toast="Receipt sent to ' + fmt.esc(fmt.first(who)) + '.">Send receipt</button>'
    });
  }

  /* ------------------------------------------------ one-click WhatsApp -- */
  function bestTimeToday() {
    var row = MF.heatmap[MF.todayDow], best = null, h = MF.now.getHours();
    MF.hours.forEach(function (hr, i) { if (hr > h && (best === null || row[i] < row[MF.hours.indexOf(best)])) best = hr; });
    if (best === null) best = 14;
    return pad(best) + ':00';
  }
  function fillTemplate(id, p, extra) {
    var t = MF.templates.filter(function (x) { return x.id === id; })[0];
    var plan = p.plan && MF.planById[p.plan];
    var map = {
      first: fmt.first(p.name), plan: plan ? plan.name : 'membership',
      expiry: p.expires ? fmt.date(p.expires) : 'soon', besttime: bestTimeToday(),
      amount: plan ? fmt.gbp(plan.price) : '', link: 'mflex.example/pay'
    };
    if (extra) Object.keys(extra).forEach(function (k) { map[k] = extra[k]; });
    return (t ? t.body : 'Hi {first}, ').replace(/\{(\w+)\}/g, function (m, k) { return map[k] != null ? map[k] : m; });
  }
  /* o: { name, phone, message, sent (toast text), onSent } */
  function whatsapp(o) {
    var id = 'wa-' + (++uid);
    modal({
      title: 'WhatsApp ' + fmt.first(o.name), subtitle: o.name + ' · ' + o.phone,
      body: '<div class="wa"><label class="label" for="' + id + '">Message</label>' +
        '<textarea class="textarea wa__bubble" id="' + id + '" rows="4" data-autofocus>' + fmt.esc(o.message) + '</textarea>' +
        '<p class="faint" style="font-size:var(--fs-12)">Pre-filled from your template. Edit it or just send.</p></div>',
      footer: '<button class="btn btn--ghost" type="button" data-close>Cancel</button>' +
        '<button class="btn btn--primary" type="button" data-wa-send>' + icon('message', 'icon--sm') + 'Send on WhatsApp</button>',
      onOpen: function (el, close) {
        el.querySelector('[data-wa-send]').addEventListener('click', function () {
          close();
          toast(o.sent || ('Sent to ' + fmt.first(o.name) + ' on WhatsApp.'), 'success');
          if (o.onSent) o.onSent();
        });
      }
    });
  }

  /* -------------------------------------------------- quick-action forms -- */
  function planOptions() {
    return MF.plans.map(function (p) { return p.name + ' — ' + fmt.gbp(p.price) + ' / ' + p.period; });
  }
  var QUICK = {
    member: {
      title: 'New member', subtitle: 'Thirty seconds. No paperwork.', icon: 'userPlus', hint: 'Sign someone up',
      fields: [['Full name', 'text', 'e.g. Tom Hughes'], ['Mobile', 'tel', '07700 900123'], ['Plan', 'select', planOptions]],
      cta: 'Create member', done: 'Member created. Welcome message queued on WhatsApp.'
    },
    payment: {
      title: 'Take payment', subtitle: 'Card, contactless or cash at the desk.', icon: 'card', hint: 'POS sale or top-up',
      fields: [['Member or guest', 'text', 'Name or member ID'], ['Item', 'select', function () { return MF.products.map(function (p) { return p.name + ' — ' + fmt.gbp(p.price, true); }); }], ['Method', 'select', ['Card', 'Contactless', 'Cash']]],
      cta: 'Take payment', done: 'Payment taken. Receipt sent.'
    },
    checkin: {
      title: 'Log check-in', subtitle: 'For when someone forgets their phone.', icon: 'scan', hint: 'Manual door entry',
      fields: [['Member', 'text', 'Name or member ID'], ['Reason', 'select', ['Forgot phone', 'Fob not working', 'Guest of member', 'Other']]],
      cta: 'Check in', done: 'Checked in. They\'re on the floor.'
    },
    lead: {
      title: 'Add lead', subtitle: 'Capture it now. Chase it later.', icon: 'target', hint: 'New enquiry',
      fields: [['Full name', 'text', 'e.g. Megan Price'], ['Mobile', 'tel', '07700 900123'], ['Source', 'select', function () { return MF.leadSources; }], ['Note', 'textarea', 'What are they after?']],
      cta: 'Add lead', done: 'Lead added to New. Follow-up set for tomorrow.'
    },
    booking: {
      title: 'Book class or PT', subtitle: 'Pick the session, we hold the spot.', icon: 'calendar', hint: 'Class or PT session',
      fields: [['Member', 'text', 'Name or member ID'], ['Session', 'select', function () { return MF.classes.map(function (c) { return c.name + ' — ' + c.start; }); }]],
      cta: 'Book spot', done: 'Booked. Confirmation sent.'
    }
  };
  function fieldHtml(f, ix) {
    var id = 'qf-' + (++uid), label = f[0], type = f[1], extra = f[2], control;
    if (type === 'select') {
      var optsList = typeof extra === 'function' ? extra() : extra;
      control = '<select class="select" id="' + id + '">' + optsList.map(function (o) { return '<option>' + fmt.esc(o) + '</option>'; }).join('') + '</select>';
    } else if (type === 'textarea') {
      control = '<textarea class="textarea" id="' + id + '" placeholder="' + fmt.esc(extra) + '"></textarea>';
    } else {
      control = '<input class="input" id="' + id + '" type="' + type + '" placeholder="' + fmt.esc(extra) + '" autocomplete="off"' + (ix === 0 ? ' required data-autofocus' : '') + '>';
    }
    return '<div class="field"><label for="' + id + '">' + fmt.esc(label) + '</label>' + control + '</div>';
  }
  function quick(id) {
    var q = QUICK[id];
    if (!q) return;
    var formId = 'quick-form-' + (++uid);
    drawer({
      title: q.title, subtitle: q.subtitle,
      body: '<form class="stack" id="' + formId + '" novalidate>' + q.fields.map(fieldHtml).join('') + '</form>',
      footer: '<button class="btn btn--ghost" type="button" data-close>Cancel</button>' +
        '<button class="btn btn--primary" type="submit" form="' + formId + '">' + fmt.esc(q.cta) + '</button>',
      onOpen: function (el, close) {
        var form = el.querySelector('form');
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var req = form.querySelector('[required]');
          if (req && !req.value.trim()) {
            req.setAttribute('aria-invalid', 'true');
            req.focus();
            toast('Add a name first.', 'warning');
            return;
          }
          close();
          toast(q.done, 'success');
        });
      }
    });
  }

  /* --------------------------------------------------------- top menus --- */
  function menuItem(o) {
    var tag = o.href ? 'a' : 'button';
    return '<' + tag + ' class="menu-item" role="menuitem"' +
      (o.href ? ' href="' + o.href + '"' : ' type="button"') +
      (o.action ? ' data-action="' + o.action + '"' : '') + '>' +
      icon(o.icon) + '<span class="grow">' + fmt.esc(o.label) + (o.sub ? '<small>' + fmt.esc(o.sub) + '</small>' : '') + '</span>' +
      (o.hint ? '<span class="menu-item__hint">' + fmt.esc(o.hint) + '</span>' : '') + '</' + tag + '>';
  }
  function openNewMenu(anchor) {
    popover(anchor, '<p class="popover__title eyebrow">Quick actions</p>' + Object.keys(QUICK).map(function (k) {
      return menuItem({ icon: QUICK[k].icon, label: QUICK[k].title, sub: QUICK[k].hint, action: 'quick:' + k });
    }).join(''), 'Quick actions');
  }
  function openNotifications(anchor) {
    var html = '<p class="popover__title eyebrow">Notifications</p>' + MF.notifications.map(function (n) {
      return menuItem({ icon: n.icon, label: n.title, sub: n.body, hint: n.time, href: n.href });
    }).join('') + '<div class="menu-sep"></div>' +
      '<button class="menu-item" type="button" role="menuitem" data-action="read-all">' + icon('check') + '<span class="grow">Mark all as read</span></button>';
    popover(anchor, html, 'Notifications');
  }
  function openAccount(anchor) {
    var light = document.documentElement.getAttribute('data-theme') === 'light';
    popover(anchor,
      '<div class="popover__title"><strong>' + fmt.esc(MF.gym.owner.name) + '</strong><br><span class="faint" style="font-size:var(--fs-12)">' + fmt.esc(MF.gym.owner.role) + ' · ' + fmt.esc(MF.gym.short) + '</span></div>' +
      '<div class="menu-sep"></div>' +
      menuItem({ icon: 'settings', label: 'Settings', href: '#/settings' }) +
      menuItem({ icon: 'smartphone', label: 'Member app preview', href: '#/member-app' }) +
      menuItem({ icon: light ? 'moon' : 'sun', label: light ? 'Dark mode' : 'Light mode', action: 'theme' }) +
      '<div class="menu-sep"></div>' +
      menuItem({ icon: 'logout', label: 'Sign out', href: '#/login' }), 'Account');
  }
  function openMore() {
    var body = App.nav.map(function (g) {
      return '<p class="eyebrow" style="margin:var(--s-4) 0 var(--s-1) var(--s-3)">' + fmt.esc(g.title) + '</p>' + g.items.map(function (it) {
        return menuItem({ icon: it.icon, label: it.label, href: '#/' + it.path, hint: it.badge && it.badge() ? String(it.badge()) : '' });
      }).join('');
    }).join('') + '<div class="menu-sep"></div>' +
      menuItem({ icon: 'sun', label: 'Switch light / dark', action: 'theme' }) +
      menuItem({ icon: 'logout', label: 'Sign out', href: '#/login' });
    drawer({ title: 'Menu', subtitle: MF.gym.address, body: '<nav aria-label="All screens" style="margin-top:calc(var(--s-4) * -1)">' + body + '</nav>' });
  }

  /* ---------------------------------------------------- command palette -- */
  var paletteOpen = null;
  function paletteData(q) {
    q = q.trim().toLowerCase();
    function hit(text) { return !q || text.toLowerCase().indexOf(q) >= 0; }
    var groups = [];
    var go = [];
    App.nav.forEach(function (g) {
      g.items.forEach(function (it) {
        if (hit(it.label + ' ' + g.title + ' ' + (it.keywords || ''))) go.push({ icon: it.icon, label: it.label, hint: g.title, run: function () { location.hash = '#/' + it.path; } });
      });
    });
    var actions = [];
    Object.keys(QUICK).forEach(function (k) {
      if (hit(QUICK[k].title + ' ' + QUICK[k].hint)) actions.push({ icon: QUICK[k].icon, label: QUICK[k].title, hint: 'Action', run: function () { quick(k); } });
    });
    [
      { icon: 'message', label: 'Send WhatsApp broadcast', k: 'whatsapp message broadcast', run: function () { location.hash = '#/messages'; } },
      { icon: 'sun', label: 'Toggle light / dark mode', k: 'theme light dark mode', run: toggleTheme },
      { icon: 'logout', label: 'Sign out', k: 'logout sign out login', run: function () { location.hash = '#/login'; } }
    ].forEach(function (a) { if (hit(a.label + ' ' + a.k)) actions.push({ icon: a.icon, label: a.label, hint: 'Action', run: a.run }); });

    var people = [];
    if (q) {
      MF.members.some(function (m) {
        if ((m.name + ' ' + m.id + ' ' + m.phone).toLowerCase().indexOf(q) >= 0) {
          people.push({ icon: 'user', label: m.name, hint: m.id + ' · ' + MF.planById[m.plan].name, run: function () { location.hash = '#/members/' + m.id; } });
        }
        return people.length >= 6;
      });
    }
    if (people.length) groups.push({ title: 'Members', items: people });
    if (go.length) groups.push({ title: 'Go to', items: go });
    if (actions.length) groups.push({ title: 'Actions', items: actions });
    return groups;
  }
  function openPalette() {
    if (paletteOpen) return;
    var html = '<section class="palette" role="dialog" aria-modal="true" aria-label="Command palette">' +
      '<div class="palette__input">' + icon('search') +
      '<input type="text" id="palette-q" data-autofocus placeholder="Search members, screens, actions…" autocomplete="off" spellcheck="false" ' +
      'role="combobox" aria-expanded="true" aria-controls="palette-list" aria-label="Search members, screens and actions">' +
      '<span class="kbd">Esc</span></div>' +
      '<div class="palette__list" id="palette-list" role="listbox"></div>' +
      '<div class="palette__foot"><span><span class="kbd">↑</span><span class="kbd">↓</span> move</span><span><span class="kbd">Enter</span> open</span><span>Try a name or “MF1042”</span></div>' +
      '</section>';
    var flat = [], active = 0, listEl, inputEl;
    function render() {
      var groups = paletteData(inputEl.value);
      flat = [];
      var out = '';
      groups.forEach(function (g) {
        out += '<p class="palette__group eyebrow">' + g.title + '</p>';
        g.items.forEach(function (it) {
          var ix = flat.length;
          flat.push(it);
          out += '<button class="menu-item" type="button" role="option" id="pal-' + ix + '" data-ix="' + ix + '" tabindex="-1">' +
            icon(it.icon) + '<span class="grow truncate">' + fmt.esc(it.label) + '</span><span class="menu-item__hint">' + fmt.esc(it.hint) + '</span></button>';
        });
      });
      if (!flat.length) {
        out = '<div class="state" style="padding:var(--s-7) var(--s-5)"><div class="state__icon">' + icon('search') + '</div>' +
          '<h3>Nothing matches “' + fmt.esc(inputEl.value) + '”</h3><p>Try a member name, an ID like MF1042, or a screen.</p></div>';
      }
      listEl.innerHTML = out;
      active = 0;
      mark();
    }
    function mark() {
      var items = listEl.querySelectorAll('.menu-item');
      for (var i = 0; i < items.length; i++) {
        var on = i === active;
        items[i].classList.toggle('is-active', on);
        items[i].setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) { items[i].scrollIntoView({ block: 'nearest' }); inputEl.setAttribute('aria-activedescendant', items[i].id); }
      }
    }
    function run(ix) {
      var it = flat[ix];
      if (!it) return;
      paletteOpen.close();
      it.run();
    }
    paletteOpen = mountOverlay('palette', html, {
      onClose: function () { paletteOpen = null; },
      onOpen: function (el) {
        listEl = el.querySelector('#palette-list');
        inputEl = el.querySelector('#palette-q');
        inputEl.addEventListener('input', render);
        inputEl.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(flat.length - 1, active + 1); mark(); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); mark(); }
          else if (e.key === 'Enter') { e.preventDefault(); run(active); }
        });
        listEl.addEventListener('click', function (e) {
          var b = e.target.closest('[data-ix]');
          if (b) run(+b.getAttribute('data-ix'));
        });
        listEl.addEventListener('mousemove', function (e) {
          var b = e.target.closest('[data-ix]');
          if (b && +b.getAttribute('data-ix') !== active) { active = +b.getAttribute('data-ix'); mark(); }
        });
        render();
      }
    });
  }

  /* -------------------------------------------------------------- theme -- */
  function applyThemeUi() {
    var light = document.documentElement.getAttribute('data-theme') === 'light';
    var btn = document.querySelector('.theme-toggle');
    if (btn) {
      btn.innerHTML = icon(light ? 'moon' : 'sun');
      btn.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
      btn.setAttribute('title', light ? 'Dark mode' : 'Light mode');
    }
  }
  function toggleTheme() {
    var root = document.documentElement;
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    if (next === 'light') root.setAttribute('data-theme', 'light'); else root.removeAttribute('data-theme');
    try { localStorage.setItem('mf-theme', next); } catch (e) { /* file:// with storage blocked — fine */ }
    applyThemeUi();
    document.dispatchEvent(new CustomEvent('mf:theme', { detail: next }));
  }

  /* -------------------------------------------------------------- shell -- */
  var TABS = [
    { path: 'dashboard', label: 'Overview', icon: 'dashboard' },
    { path: 'members', label: 'Members', icon: 'users' },
    { path: 'checkins', label: 'Check-ins', icon: 'scan' },
    { path: 'payments', label: 'Payments', icon: 'card' }
  ];
  function renderShell() {
    var nav = document.getElementById('nav');
    nav.innerHTML = App.nav.map(function (g) {
      return '<div class="nav__group"><p class="nav__title">' + fmt.esc(g.title) + '</p><ul>' + g.items.map(function (it) {
        var b = it.badge ? it.badge() : 0;
        return '<li><a class="nav__item" href="#/' + it.path + '" data-navkey="' + it.path + '" title="' + fmt.esc(it.label) + '">' +
          icon(it.icon) + '<span class="nav__label">' + fmt.esc(it.label) + '</span>' +
          (b ? '<span class="nav__badge" aria-label="' + b + ' need attention">' + b + '</span>' : '') + '</a></li>';
      }).join('') + '</ul></div>';
    }).join('');

    document.getElementById('tabbar').innerHTML = TABS.map(function (t) {
      return '<a class="tabbar__item" href="#/' + t.path + '" data-navkey="' + t.path + '">' + icon(t.icon) + '<span>' + t.label + '</span></a>';
    }).join('') + '<button class="tabbar__item" type="button" data-action="more" data-navkey="__more">' + icon('menu') + '<span>More</span></button>';

    refreshStatus();
    document.getElementById('owner-avatar').textContent = MF.gym.owner.initials;
    App.hydrateIcons(document);
    applyThemeUi();
  }
  function refreshStatus() {
    var s = MF.status(MF.now);
    var dotCls = !s.open ? 'live-dot live-dot--off' : s.staffed ? 'live-dot' : 'live-dot live-dot--warn';
    var chip = document.getElementById('status-chip');
    chip.innerHTML = '<span class="' + dotCls + '"></span><span><strong>' + s.label + '</strong> · ' + s.detail + '</span>';
    var pill = document.getElementById('live-pill');
    pill.innerHTML = '<span class="live-dot' + (s.open ? '' : ' live-dot--off') + '"></span>' +
      '<span class="live-pill__text">Live:</span><strong id="live-count">' + MF.live.onFloor + '</strong><span class="live-pill__text">on the floor</span>';
    pill.setAttribute('aria-label', 'Live: ' + MF.live.onFloor + ' on the floor. Open check-ins.');
    var foot = document.getElementById('sidebar-foot');
    foot.innerHTML = '<div class="row" style="gap:var(--s-2)"><span class="' + dotCls + '"></span><strong>' + s.label + ' now</strong></div>' +
      '<span>' + s.detail + ' · Open 05:00–22:00</span>';
  }
  function setActiveNav(key) {
    var all = document.querySelectorAll('[data-navkey]');
    var tabKeys = TABS.map(function (t) { return t.path; });
    for (var i = 0; i < all.length; i++) {
      var k = all[i].getAttribute('data-navkey');
      var on = k === key || (k === '__more' && key && tabKeys.indexOf(key) < 0);
      if (on) all[i].setAttribute('aria-current', 'page'); else all[i].removeAttribute('aria-current');
    }
    App.motion.navIndicator(document.querySelector('.nav__item[aria-current="page"]'));
  }

  /* --------------------------------------------------- shared renderers -- */
  function pageHead(title, sub, actionsHtml) {
    return '<header class="page-head"><div><h1>' + fmt.esc(title) + '</h1>' + (sub ? '<p>' + fmt.esc(sub) + '</p>' : '') + '</div>' +
      (actionsHtml ? '<div class="page-head__actions">' + actionsHtml + '</div>' : '') + '</header>';
  }
  function state(o) {
    return '<div class="state' + (o.error ? ' state--error' : '') + '"><div class="state__icon">' + icon(o.icon || 'info', 'icon--lg') + '</div>' +
      '<h2>' + fmt.esc(o.title) + '</h2>' + (o.text ? '<p>' + fmt.esc(o.text) + '</p>' : '') + (o.extra || '') +
      (o.actions ? '<div class="state__actions">' + o.actions + '</div>' : '') + '</div>';
  }
  /* "Coming in stage N" screen — keeps every route alive while we build */
  function placeholder(view, o) {
    var list = '<ul class="todo-list">' + o.items.map(function (t) {
      return '<li>' + icon('chevronRight', 'icon--sm') + '<span>' + fmt.esc(t) + '</span></li>';
    }).join('') + '</ul>';
    view.innerHTML = pageHead(o.title, o.sub, o.actions) +
      '<section class="card">' + state({
        icon: o.icon, title: 'Built in stage ' + o.stage, text: o.text || 'The shell is live. This screen lands next.', extra: list,
        actions: '<a class="btn" href="#/dashboard">' + icon('arrowLeft', 'icon--sm') + 'Back to overview</a>' +
          '<button class="btn btn--ghost" type="button" data-action="palette">' + icon('search', 'icon--sm') + 'Search anything</button>'
      }) + '</section>';
  }

  /* ------------------------------------------------------ global events -- */
  var ACTIONS = {
    palette: function () { openPalette(); },
    'new': function (el) { openNewMenu(el); },
    notifications: function (el) {
      openNotifications(el);
      var dot = el.querySelector('.icon-btn__dot');
      if (dot) dot.hidden = true;
    },
    account: function (el) { openAccount(el); },
    theme: function () { closePopover(); toggleTheme(); },
    more: function () { openMore(); },
    'read-all': function () { closePopover(); toast('All caught up.', 'info'); }
  };

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;

    if (t.closest('.skip-link')) {   /* don't let "#view" hit the hash router */
      e.preventDefault();
      document.getElementById('view').focus();
      return;
    }

    var closer = t.closest('[data-close]');
    if (closer && closer.closest('.overlay')) {
      closeTop();
      if (closer.hasAttribute('data-toast')) toast(closer.getAttribute('data-toast'), closer.getAttribute('data-toast-type') || 'success');
      return;
    }

    var act = t.closest('[data-action]');
    if (act) {
      var name = act.getAttribute('data-action');
      var keepPopover = name === 'new' || name === 'notifications' || name === 'account';
      if (!keepPopover) closePopover();
      if (name.indexOf('quick:') === 0) { if (act.closest('.overlay')) closeAll(); quick(name.slice(6)); }
      else if (ACTIONS[name]) ACTIONS[name](act);
      return;
    }

    var tst = t.closest('[data-toast]');
    if (tst) toast(tst.getAttribute('data-toast'), tst.getAttribute('data-toast-type') || 'success');

    var nav = t.closest('[data-nav]');
    if (nav) location.hash = nav.getAttribute('data-nav');

    if (pop && !t.closest('.popover')) closePopover();
    else if (pop && t.closest('.menu-item')) closePopover();
  });

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (paletteOpen) paletteOpen.close(); else openPalette();
      return;
    }
    if (e.key === 'Escape') {
      if (pop) { var a = pop.anchor; closePopover(); a.focus(); }
      else closeTop();
      return;
    }
    if (pop && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      var items = Array.prototype.slice.call(pop.el.querySelectorAll('.menu-item'));
      var ix = items.indexOf(document.activeElement);
      e.preventDefault();
      items[(ix + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
      return;
    }
    if (e.key === 'Tab' && stack.length) {
      var top = stack[stack.length - 1].el;
      var f = Array.prototype.slice.call(top.querySelectorAll(FOCUSABLE)).filter(function (n) { return n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!top.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener('resize', closePopover);

  document.addEventListener('DOMContentLoaded', renderShell);

  /* -------------------------------------------------------------- export -- */
  App.ui = {
    toast: toast,
    drawer: drawer,
    modal: modal,
    popover: popover,
    closePopover: closePopover,
    closeAll: closeAll,
    palette: openPalette,
    quick: quick,
    whatsapp: whatsapp,
    receipt: receipt,
    chip: chip,
    riskLevel: riskLevel,
    agoText: agoText,
    inText: inText,
    fillTemplate: fillTemplate,
    bestTimeToday: bestTimeToday,
    toggleTheme: toggleTheme,
    setActiveNav: setActiveNav,
    refreshStatus: refreshStatus,
    pageHead: pageHead,
    state: state,
    placeholder: placeholder
  };
})();
