/* ==========================================================================
   Member profile — #/members/MF1042  (?tab=payments opens a tab directly)
   Header + one-click actions · plan / expiry countdown / churn risk / QR card
   Tabs: Overview (attendance heatmap) · Payments · Body progress · PT ·
   Notes · Docs
   ========================================================================== */
(function () {
  'use strict';
  var App = window.MFApp, MF = window.MF, ui = App.ui, fmt = App.fmt, icon = App.icon, charts = App.charts, motion = App.motion;
  var esc = fmt.esc;
  var TABS = [['overview', 'Overview'], ['payments', 'Payments'], ['progress', 'Body progress'], ['pt', 'PT sessions'], ['notes', 'Notes'], ['docs', 'Docs']];
  var lastTab = {};   /* remembers the tab per member for the session */

  function riskReasons(m) {
    var out = [];
    if (m.daysSinceVisit >= 7) out.push('Not in for ' + m.daysSinceVisit + ' days');
    if (m.visits30 <= 4) out.push('Only ' + m.visits30 + ' visit' + (m.visits30 === 1 ? '' : 's') + ' in 30 days');
    if (m.dd === 'Failed' || m.dd === 'Retry') out.push('Direct Debit failed');
    if (fmt.daysUntil(m.joined) > -60) out.push('New member — habits not set yet');
    if (!out.length) out.push(m.churnRisk < 30 ? 'Regular. Training steadily.' : 'Visits dropping off');
    return out.slice(0, 2);
  }
  function stat(label, value, note) {
    return '<div class="mini"><dt>' + label + '</dt><dd>' + value + '</dd>' + (note ? '<small>' + note + '</small>' : '') + '</div>';
  }
  function delta(arr, unit, goodDown) {
    var d = Math.round((arr[arr.length - 1] - arr[0]) * 10) / 10, good = goodDown ? d <= 0 : d >= 0;
    return '<span class="delta ' + (good ? 'delta--good' : 'delta--bad') + '">' + icon(d >= 0 ? 'arrowUpRight' : 'arrowDownRight', 'icon--sm') + Math.abs(d) + unit + '</span>';
  }

  App.screen('member', {
    title: 'Member',
    render: function (view, params, query) {
      var m = MF.memberById[String(params.id || '').toUpperCase()];
      if (!m) {
        view.innerHTML = ui.pageHead('Member not found', 'No one with the ID “' + (params.id || '') + '”.') +
          '<section class="card">' + ui.state({ icon: 'user', title: 'No such member', text: 'Check the ID, or search by name.',
            actions: '<a class="btn btn--primary" href="#/members">All members</a><button class="btn" type="button" data-action="palette">' + icon('search', 'icon--sm') + 'Search</button>' }) + '</section>';
        return;
      }
      document.title = m.name + ' · Muscle Flex';

      var d = MF.memberDetail(m.id), plan = MF.planById[m.plan], first = fmt.first(m.name);
      var left = fmt.daysUntil(m.expires), lvl = ui.riskLevel(m.churnRisk);
      var periodDays = plan.period === 'year' ? 365 : plan.period === 'month' ? 30 : plan.period === '7 days' ? 7 : 1;
      var used = Math.max(0, Math.min(1, 1 - left / periodDays));
      var tab = TABS.some(function (t) { return t[0] === query.tab; }) ? query.tab : (lastTab[m.id] || 'overview');
      var canRenew = m.status === 'expiring' || m.status === 'expired' || m.status === 'overdue';

      view.innerHTML =
        '<a class="backlink" href="#/members">' + icon('arrowLeft', 'icon--sm') + 'Members</a>' +

        '<section class="card profile">' +
          '<div class="profile__id"><span class="avatar avatar--lg">' + esc(m.initials) + '</span><div>' +
            '<h1>' + esc(m.name) + '</h1>' +
            '<p class="profile__meta"><span>' + m.id + '</span>' + ui.chip(m.status) + '<span>' + esc(plan.name) + '</span><span>Since ' + fmt.date(m.joined) + '</span>' +
              (m.streak > 1 ? '<span class="streak">' + icon('flame', 'icon--sm') + m.streak + '-day streak</span>' : '') + '</p></div></div>' +
          '<div class="profile__acts">' +
            '<button class="btn btn--primary" type="button" id="p-wa">' + icon('message', 'icon--sm') + 'WhatsApp</button>' +
            '<button class="btn" type="button" data-toast="Calling ' + esc(first) + ' on ' + m.phone + '…" data-toast-type="info">' + icon('phone', 'icon--sm') + 'Call</button>' +
            '<button class="btn" type="button" id="p-renew">' + icon('refresh', 'icon--sm') + (m.status === 'frozen' ? 'Unfreeze' : 'Renew') + '</button>' +
            '<button class="icon-btn" type="button" id="p-more" aria-haspopup="menu" aria-expanded="false" aria-label="More actions">' + icon('more') + '</button>' +
          '</div>' +
        '</section>' +

        '<div class="grid pstats">' +
          '<section class="card"><p class="eyebrow">Plan</p><p class="pstat__big">' + esc(plan.name) + '</p>' +
            '<p class="muted">' + fmt.gbp(plan.price) + ' / ' + plan.period + '</p><p style="margin-top:var(--s-3)">' + ui.chip(m.dd, m.dd === 'n/a' ? null : 'Direct Debit · ' + m.dd) + '</p></section>' +

          '<section class="card"><p class="eyebrow">' + (left < 0 ? 'Expired' : 'Expires') + '</p>' +
            '<p class="pstat__big ' + (left < 0 ? 'accent-text' : left <= 7 ? 'warning-text' : '') + '"><span class="figure">' + Math.abs(left) + '</span> day' + (Math.abs(left) === 1 ? '' : 's') + (left < 0 ? ' ago' : ' left') + '</p>' +
            '<p class="muted">' + fmt.date(m.expires) + '</p>' +
            '<span class="meter meter--lg' + (left <= 7 ? '' : ' meter--quiet') + '" role="img" aria-label="' + Math.round(used * 100) + '% of this period used"><i style="transform:scaleX(' + used + ')"></i></span></section>' +

          '<section class="card"><p class="eyebrow">Churn risk</p>' +
            '<p class="pstat__big ' + (lvl === 'High' ? 'accent-text' : '') + '"><span class="figure" data-count="' + m.churnRisk + '">' + m.churnRisk + '</span>% · ' + lvl + '</p>' +
            '<ul class="reasons">' + riskReasons(m).map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>' +
            '<span class="meter meter--lg' + (lvl === 'High' ? '' : ' meter--quiet') + '" aria-hidden="true"><i style="transform:scaleX(' + m.churnRisk / 100 + ')"></i></span></section>' +

          '<section class="card qrcard"><div class="qrcard__code">' + charts.qr(m.id, 92) + '</div>' +
            '<div><p class="eyebrow">Door pass</p><p class="pstat__big">' + m.id + '</p><p class="muted">Scan at the door.</p>' +
            '<button class="btn btn--sm" type="button" style="margin-top:var(--s-3)" data-toast="Door pass sent to ' + esc(first) + '’s phone.">Send to phone</button></div></section>' +
        '</div>' +

        '<section class="card card--flush">' +
          '<div class="tabs" role="tablist" aria-label="Member details" id="p-tabs">' + TABS.map(function (t) {
            var n = t[0] === 'payments' ? d.payments.length : t[0] === 'pt' ? (d.pt.length || null) : t[0] === 'notes' ? d.notes.length : null;
            return '<button class="tab" type="button" role="tab" id="ptab-' + t[0] + '" data-tab="' + t[0] + '" aria-controls="p-panel" aria-selected="false" tabindex="-1">' + t[1] + (n !== null ? '<span class="tab__n">' + n + '</span>' : '') + '</button>';
          }).join('') + '</div>' +
          '<div id="p-panel" role="tabpanel" class="ppanel"></div>' +
        '</section>';

      var panel = view.querySelector('#p-panel'), tabsEl = view.querySelector('#p-tabs');

      /* ------------------------------------------------------ panels ---- */
      var PANELS = {
        overview: function () {
          panel.innerHTML =
            '<div class="split">' +
              '<div><div class="card__head"><div><h2>Attendance</h2><p>Last 12 weeks · ' + d.visits84 + ' visits</p></div>' +
                '<div class="legend"><span><i class="lg lg--off"></i>No visit</span><span><i class="lg lg--now"></i>Trained</span></div></div>' +
                '<div id="p-cal" class="chartbox"></div>' +
                '<dl class="minis">' + stat('Last 30 days', m.visits30, 'visits') + stat('All time', fmt.num(m.totalVisits), 'visits') +
                  stat('Usual time', d.favTime, 'most visits') + stat('Last in', ui.agoText(m.daysSinceVisit), fmt.dateShort(m.lastVisit)) + '</dl></div>' +
              '<div><h2 style="margin-bottom:var(--s-3)">Details</h2><dl class="kv">' +
                '<div><dt>Mobile</dt><dd>' + m.phone + '</dd></div><div><dt>Email</dt><dd class="truncate">' + esc(m.email) + '</dd></div>' +
                '<div><dt>Date of birth</dt><dd>' + fmt.date(m.dob) + '</dd></div><div><dt>Goal</dt><dd>' + esc(m.goal) + '</dd></div>' +
                '<div><dt>Joined</dt><dd>' + fmt.date(m.joined) + '</dd></div><div><dt>Personal training</dt><dd>' + (m.pt ? 'Yes' : 'Not yet') + '</dd></div></dl>' +
                '<h2 style="margin:var(--s-5) 0 var(--s-2)">Recent visits</h2>' +
                (d.recent.length ? '<ul class="timeline">' + d.recent.map(function (v) { return '<li><span>' + fmt.date(v.date) + '</span><span class="faint">' + v.time + '</span></li>'; }).join('') + '</ul>'
                  : '<p class="muted">No visits in the last 12 weeks.</p>') + '</div>' +
            '</div>';
          var box = panel.querySelector('#p-cal');
          box.innerHTML = charts.calendar(d.attendance, Math.max(240, box.clientWidth), { label: 'Attendance for the last 12 weeks: ' + d.visits84 + ' visits.' });
        },

        payments: function () {
          panel.innerHTML = '<div class="ppanel__bar"><p class="muted">' + fmt.gbp(d.paidTotal, true) + ' paid across ' + d.payments.length + ' payment' + (d.payments.length === 1 ? '' : 's') + '.</p>' +
              '<button class="btn btn--sm" type="button" data-action="quick:payment">' + icon('plus', 'icon--sm') + 'Take payment</button></div>' +
            '<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Item</th><th class="c-plan">Type</th><th>Status</th><th class="t-right">Amount</th><th class="t-acts"><span class="sr-only">Receipt</span></th></tr></thead><tbody>' +
            d.payments.map(function (p, i) {
              return '<tr data-pay="' + i + '" class="is-click"><td>' + fmt.date(p.date) + '</td><td>' + esc(p.item) + (p.note ? '<small class="faint">' + esc(p.note) + '</small>' : '') + '</td><td class="c-plan muted">' + p.type + '</td>' +
                '<td>' + ui.chip(p.status) + '</td><td class="t-right"><strong>' + fmt.gbp(p.amount, true) + '</strong></td>' +
                '<td class="t-acts"><button class="icon-btn" type="button" aria-label="Open receipt ' + p.id + '">' + icon('chevronRight') + '</button></td></tr>';
            }).join('') + '</tbody></table></div>';
        },

        progress: function () {
          var b = d.body;
          panel.innerHTML = '<div class="ppanel__bar"><p class="muted">Monthly check-ins with the team. ' + esc(m.goal) + '.</p>' +
              '<button class="btn btn--sm" type="button" data-toast="Check-in logged for ' + esc(first) + '.">' + icon('plus', 'icon--sm') + 'Log check-in</button></div>' +
            '<div class="split split--even">' +
              '<div><div class="card__head"><div><h2>Body</h2><p>Weight ' + b.weight[b.weight.length - 1] + ' kg ' + delta(b.weight, ' kg', m.goal === 'Lose fat' || m.goal === 'Bodybuilding prep') +
                ' · Body fat ' + b.fat[b.fat.length - 1] + '% ' + delta(b.fat, '%', true) + '</p></div>' +
                '</div><p class="eyebrow">Weight, kg</p><div id="p-weight" class="chartbox"></div>' +
                '<p class="eyebrow" style="margin-top:var(--s-3)">Body fat, %</p><div id="p-fat" class="chartbox"></div></div>' +
              '<div><div class="card__head"><div><h2>Lifts</h2><p>Squat ' + b.squat[7] + ' ' + delta(b.squat, ' kg') + ' · Bench ' + b.bench[7] + ' ' + delta(b.bench, ' kg') + ' · Deadlift ' + b.dead[7] + ' ' + delta(b.dead, ' kg') + '</p></div>' +
                '<div class="legend"><span><i class="lg lg--now"></i>Deadlift</span><span><i class="lg lg--mid"></i>Squat</span><span><i class="lg lg--mute"></i>Bench</span></div></div><div id="p-lifts" class="chartbox"></div></div>' +
            '</div>';
          var b1 = panel.querySelector('#p-weight'), b3 = panel.querySelector('#p-fat'), b2 = panel.querySelector('#p-lifts');
          b1.innerHTML = charts.line([{ name: 'Weight', values: b.weight, cls: 'ln-accent', unit: ' kg' }], b.labels, Math.max(240, b1.clientWidth), 118, { label: 'Body weight over 8 months.' });
          b3.innerHTML = charts.line([{ name: 'Body fat', values: b.fat, cls: 'ln-mute', unit: '%' }], b.labels, Math.max(240, b3.clientWidth), 118, { label: 'Body fat over 8 months.' });
          b2.innerHTML = charts.line([{ name: 'Bench', values: b.bench, cls: 'ln-mute', unit: ' kg' }, { name: 'Squat', values: b.squat, cls: 'ln-mid', unit: ' kg' }, { name: 'Deadlift', values: b.dead, cls: 'ln-accent', unit: ' kg' }], b.labels, Math.max(240, b2.clientWidth), 268, { label: 'Squat, bench and deadlift over 8 months.' });
          motion.drawChart(panel);
        },

        pt: function () {
          if (!d.pt.length) {
            panel.innerHTML = ui.state({ icon: 'dumbbell', title: 'No PT yet', text: first + ' trains solo. A first session is the easiest upsell you have.',
              actions: '<button class="btn btn--primary" type="button" data-action="quick:booking">Book a session</button>' });
            return;
          }
          var tr = MF.staffById[d.pt[0].trainerId];
          panel.innerHTML = '<div class="ppanel__bar"><p class="muted">Training with ' + esc(tr.name) + ' · ' + esc(tr.speciality || tr.role) + '.</p>' +
              '<button class="btn btn--sm" type="button" data-action="quick:booking">' + icon('plus', 'icon--sm') + 'Book session</button></div>' +
            '<ul class="alist">' + d.pt.slice().reverse().map(function (s) {
              return '<li class="arow"><span class="avatar avatar--icon">' + icon('dumbbell') + '</span><span class="grow"><strong>' + esc(s.focus) + '</strong>' +
                '<small>' + fmt.date(s.date) + ' · ' + s.time + ' · 60 min with ' + esc(fmt.first(tr.name)) + '</small></span>' + ui.chip(s.status) +
                '<strong class="nowrap">' + fmt.gbp(s.price) + '</strong>' +
                (s.status === 'Booked' ? '<button class="btn btn--sm" type="button" data-toast="Reminder sent to ' + esc(first) + '.">Remind</button>' : '') + '</li>';
            }).join('') + '</ul>';
        },

        notes: function () {
          panel.innerHTML = '<form class="noteform" id="p-noteform"><label class="sr-only" for="p-note">Add a note</label>' +
              '<textarea class="textarea" id="p-note" rows="2" placeholder="Add a note for the team…"></textarea>' +
              '<button class="btn btn--primary" type="submit">Add note</button></form>' +
            '<ul class="notes" id="p-notes">' + d.notes.map(noteHtml).join('') + '</ul>';
          var form = panel.querySelector('#p-noteform');
          form.addEventListener('submit', function (e) {
            e.preventDefault();
            var ta = form.querySelector('textarea'), text = ta.value.trim();
            if (!text) { ta.focus(); ui.toast('Write something first.', 'warning'); return; }
            var note = { text: text, by: MF.gym.owner.name, date: MF.todayIso, fresh: true };
            d.notes.unshift(note);
            ta.value = '';
            var list = panel.querySelector('#p-notes');
            list.insertAdjacentHTML('afterbegin', noteHtml(note));
            motion.listInsert(list.firstElementChild);
            tabsEl.querySelector('#ptab-notes .tab__n').textContent = d.notes.length;
            ui.toast('Note saved.', 'success');
          });
        },

        docs: function () {
          panel.innerHTML = '<ul class="alist">' + d.docs.map(function (doc, i) {
            var state = doc.na ? ['', 'Not needed'] : doc.signed ? ['success', 'Signed'] : ['danger', 'Missing'];
            return '<li class="arow"><span class="avatar avatar--icon">' + icon(doc.signed ? 'checkCircle' : 'alert') + '</span><span class="grow"><strong>' + esc(doc.name) + '</strong>' +
              '<small>' + (doc.na ? 'Paid up front — no mandate required' : doc.signed ? 'Signed ' + fmt.date(doc.date) : 'Not on file') + '</small></span>' +
              '<span class="chip' + (state[0] ? ' chip--' + state[0] : '') + '">' + state[1] + '</span>' +
              (doc.na ? '' : doc.signed ? '<button class="btn btn--sm" type="button" data-doc="' + i + '">View</button>'
                : '<button class="btn btn--sm btn--primary" type="button" data-toast="Sent to ' + esc(first) + ' to sign on their phone.">Send to sign</button>') + '</li>';
          }).join('') + '</ul>';
        }
      };
      function noteHtml(n) {
        return '<li class="note"><p>' + esc(n.text) + '</p><small class="faint">' + esc(n.by) + ' · ' + (n.fresh ? 'just now' : fmt.date(n.date)) + '</small></li>';
      }

      function show(key, animate) {
        tab = key; lastTab[m.id] = key;
        var btns = tabsEl.querySelectorAll('.tab');
        for (var i = 0; i < btns.length; i++) {
          var on = btns[i].getAttribute('data-tab') === key;
          btns[i].setAttribute('aria-selected', on);
          btns[i].tabIndex = on ? 0 : -1;
        }
        panel.setAttribute('aria-labelledby', 'ptab-' + key);
        PANELS[key]();
        if (animate) motion.contentIn(panel);
      }

      /* ------------------------------------------------------ events ---- */
      tabsEl.addEventListener('click', function (e) {
        var b = e.target.closest('[data-tab]');
        if (b) show(b.getAttribute('data-tab'), true);
      });
      tabsEl.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var keys = TABS.map(function (t) { return t[0]; }), ix = keys.indexOf(tab);
        show(keys[(ix + (e.key === 'ArrowRight' ? 1 : -1) + keys.length) % keys.length], true);
        tabsEl.querySelector('[aria-selected="true"]').focus();
        e.preventDefault();
      });
      panel.addEventListener('click', function (e) {
        var row = e.target.closest('[data-pay]');
        if (row) { ui.receipt(d.payments[+row.getAttribute('data-pay')]); return; }
        var doc = e.target.closest('[data-doc]');
        if (doc) {
          var x = d.docs[+doc.getAttribute('data-doc')];
          ui.modal({ title: x.name, subtitle: m.name + ' · ' + m.id,
            body: '<dl class="kv"><div><dt>Status</dt><dd>Signed</dd></div><div><dt>Signed on</dt><dd>' + fmt.date(x.date) + '</dd></div><div><dt>Signed by</dt><dd>' + esc(m.name) + '</dd></div><div><dt>Method</dt><dd>On phone, at sign-up</dd></div></dl>',
            footer: '<button class="btn btn--ghost" type="button" data-close>Close</button><button class="btn btn--primary" type="button" data-close data-toast="Copy sent to ' + esc(first) + '.">Send a copy</button>' });
        }
      });

      view.querySelector('#p-wa').addEventListener('click', function () {
        ui.whatsapp({ name: m.name, phone: m.phone, message: ui.fillTemplate(m.status === 'expiring' || m.status === 'expired' ? 't2' : m.dd === 'Failed' || m.dd === 'Retry' ? 't4' : 't3', m) });
      });
      view.querySelector('#p-renew').addEventListener('click', function () {
        var until = new Date(MF.now); until.setDate(until.getDate() + periodDays);
        var wasFrozen = m.status === 'frozen';
        if (!wasFrozen && !canRenew && left > 7) { ui.toast(first + ' is paid up until ' + fmt.date(m.expires) + '. Nothing to renew yet.', 'info'); return; }
        m.status = 'active';
        if (!wasFrozen) m.expires = until.getFullYear() + '-' + ('0' + (until.getMonth() + 1)).slice(-2) + '-' + ('0' + until.getDate()).slice(-2);
        if (m.dd !== 'n/a') m.dd = 'Paid';
        App.router.refresh();
        ui.toast(wasFrozen ? first + ' is unfrozen. Access is back on.' : 'Renewed. ' + first + ' is good until ' + fmt.date(m.expires) + '.', 'success');
      });
      view.querySelector('#p-more').addEventListener('click', function (e) {
        var pop = ui.popover(e.currentTarget,
          '<button class="menu-item" type="button" role="menuitem" data-more="freeze">' + icon('clock') + '<span class="grow">Freeze membership</span></button>' +
          '<button class="menu-item" type="button" role="menuitem" data-toast="Plan change link sent to ' + esc(first) + '.">' + icon('ticket') + '<span class="grow">Change plan</span></button>' +
          '<button class="menu-item" type="button" role="menuitem" data-action="quick:payment">' + icon('card') + '<span class="grow">Take payment</span></button>' +
          '<button class="menu-item" type="button" role="menuitem" data-action="quick:booking">' + icon('calendar') + '<span class="grow">Book class or PT</span></button>' +
          '<div class="menu-sep"></div>' +
          '<button class="menu-item" type="button" role="menuitem" data-toast="Cancellation needs ' + esc(first) + ' to confirm. Link sent." data-toast-type="warning">' + icon('x') + '<span class="grow">Cancel membership</span></button>', 'More actions');
        if (!pop) return;
        pop.querySelector('[data-more="freeze"]').addEventListener('click', function () {
          ui.modal({ title: 'Freeze ' + first + '?', subtitle: 'Access pauses today. £5 a month holding fee. Unfreeze any time.',
            body: '<p class="muted">' + first + ' gets a WhatsApp confirming it.</p>',
            footer: '<button class="btn btn--ghost" type="button" data-close>Not now</button><button class="btn btn--primary" type="button" id="fz">Freeze</button>',
            onOpen: function (el, close) {
              el.querySelector('#fz').addEventListener('click', function () {
                m.status = 'frozen'; if (m.dd !== 'n/a') m.dd = 'Paused';
                close(); App.router.refresh(); ui.toast(first + '’s membership is frozen.', 'info');
              });
            } });
        });
      });

      show(tab, false);

      /* redraw width-dependent charts when the panel changes size */
      var lastW = panel.clientWidth, timer = null, ro = null;
      function onResize() {
        clearTimeout(timer);
        timer = setTimeout(function () {
          if (panel.clientWidth === lastW) return;
          lastW = panel.clientWidth;
          if (tab === 'overview' || tab === 'progress') PANELS[tab]();
        }, 140);
      }
      if (window.ResizeObserver) { ro = new ResizeObserver(onResize); ro.observe(panel); }
      window.addEventListener('resize', onResize);
      return function () { clearTimeout(timer); if (ro) ro.disconnect(); window.removeEventListener('resize', onResize); };
    }
  });
})();
