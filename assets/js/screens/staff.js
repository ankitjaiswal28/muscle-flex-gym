/* ==========================================================================
   Staff & trainers — staff cards with on-shift status, weekly rota checked
   against staffed hours (gaps flagged, shifts editable), PT revenue and
   commission.
   ========================================================================== */
(function () {
  'use strict';
  var App = window.MFApp, MF = window.MF, ui = App.ui, fmt = App.fmt, icon = App.icon, charts = App.charts, motion = App.motion;
  var esc = fmt.esc, staffNo = 20;
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], DAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function win(day) { return day >= 5 ? MF.gym.staffed.weekend : MF.gym.staffed.weekday; }
  function shiftText(s) { return s ? pad(s[0]) + ':00–' + pad(s[1]) + ':00' : 'Off'; }
  /* hours inside the staffed window that nobody covers */
  function gaps(day) {
    var w = win(day), out = [], start = null;
    for (var h = w.from; h < w.to; h++) {
      var covered = MF.staff.some(function (s) { var r = s.rota[day]; return r && h >= r[0] && h < r[1]; });
      if (!covered && start === null) start = h;
      if (covered && start !== null) { out.push([start, h]); start = null; }
    }
    if (start !== null) out.push([start, w.to]);
    return out;
  }
  function onNow(s) { var r = s.rota[MF.todayDow], h = MF.now.getHours(); return !!(r && h >= r[0] && h < r[1]); }
  function hoursWeek(s) { return s.rota.reduce(function (t, r) { return t + (r ? r[1] - r[0] : 0); }, 0); }

  App.screen('staff', {
    title: 'Staff & trainers',
    render: function (view) {
      view.innerHTML =
        ui.pageHead('Staff & trainers', 'Who\'s on, when, and what they bring in.',
          '<button class="btn" type="button" data-toast="Rota sent to the team on WhatsApp.">' + icon('message', 'icon--sm') + 'Send rota</button>' +
          '<button class="btn btn--primary" type="button" id="st-add">' + icon('plus', 'icon--sm') + 'Add staff</button>') +
        '<div class="grid people" id="st-cards"></div>' +
        '<section class="card card--flush" style="margin-top:var(--s-4)" aria-labelledby="h-rota"><div class="card__head pad"><div><h2 id="h-rota">Rota</h2><p>Click a shift to change it. Gaps in staffed hours show up straight away.</p></div><span id="st-cover"></span></div>' +
          '<div class="table-wrap" style="margin-top:var(--s-3)"><table class="table rota" id="st-rota"></table></div></section>' +
        '<div class="dash" style="margin-top:var(--s-4)">' +
          '<section class="card span-4" aria-labelledby="h-ptrev"><div class="card__head"><div><h2 id="h-ptrev">PT revenue</h2><p>This month, by trainer</p></div></div><div id="st-chart" class="chartbox"></div>' +
            '<p class="insight">' + icon('flame', 'icon--sm') + '<span id="st-insight"></span></p></section>' +
          '<section class="card card--flush span-8" aria-labelledby="h-comm"><div class="card__head pad"><div><h2 id="h-comm">Commission</h2><p>What each trainer earns, what the gym keeps</p></div>' +
            '<button class="btn btn--sm btn--primary" type="button" id="st-pay">Run payout</button></div>' +
            '<div class="table-wrap" style="margin-top:var(--s-3)"><table class="table" id="st-comm"></table></div></section>' +
        '</div>';

      var $ = function (id) { return view.querySelector('#' + id); };

      function paintCards() {
        $('st-cards').innerHTML = MF.staff.map(function (s) {
          var on = onNow(s), today = s.rota[MF.todayDow], clients = s.pt ? MF.members.filter(function (m, i) { return m.pt && i % MF.trainers.length === MF.trainers.indexOf(s); }).length : 0;
          return '<article class="card person"><div class="person__top"><span class="avatar avatar--lg' + (s.role === 'Owner' ? ' avatar--owner' : '') + '">' + esc(s.initials) + '</span>' +
            '<div class="grow"><h2 class="truncate">' + esc(s.name) + '</h2><p class="muted truncate">' + esc(s.role) + '</p></div>' +
            '<span class="chip ' + (on ? 'chip--success' : '') + '">' + (on ? 'On shift' : today ? 'In later' : 'Off today') + '</span></div>' +
            '<dl class="kv person__kv"><div><dt>Today</dt><dd>' + shiftText(today) + '</dd></div><div><dt>This week</dt><dd>' + hoursWeek(s) + ' hours</dd></div>' +
            (s.pt ? '<div><dt>PT clients</dt><dd>' + clients + '</dd></div><div><dt>Speciality</dt><dd class="truncate">' + esc(s.speciality) + '</dd></div>' : '<div><dt>Mobile</dt><dd>' + s.phone + '</dd></div>') + '</dl>' +
            '<div class="plan__acts"><button class="btn btn--sm" type="button" data-wa="' + s.id + '">' + icon('message', 'icon--sm') + 'WhatsApp</button>' +
            '<button class="btn btn--sm" type="button" data-toast="Calling ' + esc(fmt.first(s.name)) + ' on ' + s.phone + '…" data-toast-type="info">' + icon('phone', 'icon--sm') + 'Call</button></div></article>';
        }).join('');
      }
      function paintRota() {
        var head = '<thead><tr><th>Team</th>' + DAYS.map(function (d, i) {
          var w = win(i);
          return '<th class="rota__day' + (i === MF.todayDow ? ' is-today' : '') + '">' + d + '<small>' + pad(w.from) + '–' + pad(w.to) + '</small></th>';
        }).join('') + '<th class="t-right">Hours</th></tr></thead>';
        var body = '<tbody>' + MF.staff.map(function (s) {
          return '<tr><td><span class="who"><span class="avatar avatar--sm">' + esc(s.initials) + '</span><span><strong>' + esc(s.name) + '</strong><small>' + esc(s.role) + '</small></span></span></td>' +
            s.rota.map(function (r, d) {
              return '<td class="rota__cell"><button class="shift' + (r ? '' : ' shift--off') + '" type="button" data-shift="' + s.id + ':' + d + '" aria-label="' + esc(s.name + ', ' + DAY_LONG[d] + ': ' + shiftText(r) + '. Change shift.') + '">' + (r ? pad(r[0]) + '–' + pad(r[1]) : 'Off') + '</button></td>';
            }).join('') + '<td class="t-right"><strong>' + hoursWeek(s) + '</strong></td></tr>';
        }).join('') + '</tbody>';
        var total = 0;
        var foot = '<tfoot><tr><td><strong>Cover</strong><small class="faint" style="display:block">Staffed hours</small></td>' + DAYS.map(function (d, i) {
          var g = gaps(i); total += g.length;
          return '<td class="rota__cell">' + (g.length ? '<span class="chip chip--danger" data-tip="Nobody on ' + g.map(function (x) { return pad(x[0]) + ':00–' + pad(x[1]) + ':00'; }).join(', ') + '">Gap ' + pad(g[0][0]) + '–' + pad(g[0][1]) + '</span>' : '<span class="chip chip--success">Covered</span>') + '</td>';
        }).join('') + '<td></td></tr></tfoot>';
        $('st-rota').innerHTML = head + body + foot;
        $('st-cover').innerHTML = total ? '<span class="chip chip--danger">' + total + ' gap' + (total === 1 ? '' : 's') + ' this week</span>' : '<span class="chip chip--success">Fully covered</span>';
      }
      function paintMoney(animate) {
        var rows = MF.trainers.map(function (t) {
          var payout = Math.round(t.ptRevenue * t.commission / 100);
          return { t: t, sessions: Math.round(t.ptRevenue / 1200), payout: payout, keep: t.ptRevenue - payout };
        });
        var sum = function (k) { return rows.reduce(function (s, r) { return s + r[k]; }, 0); }, rev = MF.trainers.reduce(function (s, t) { return s + t.ptRevenue; }, 0);
        $('st-comm').innerHTML = '<thead><tr><th>Trainer</th><th class="c-plan t-right">Sessions</th><th class="t-right">PT revenue</th><th class="c-exp t-right">Rate</th><th class="t-right">Trainer earns</th><th class="c-plan t-right">Gym keeps</th></tr></thead><tbody>' +
          rows.map(function (r) {
            return '<tr><td><span class="who"><span class="avatar avatar--sm">' + esc(r.t.initials) + '</span><span><strong>' + esc(r.t.name) + '</strong><small>' + esc(r.t.speciality) + '</small></span></span></td>' +
              '<td class="c-plan t-right">' + r.sessions + '</td><td class="t-right">' + fmt.money(r.t.ptRevenue) + '</td><td class="c-exp t-right muted">' + r.t.commission + '%</td>' +
              '<td class="t-right"><strong>' + fmt.money(r.payout) + '</strong></td><td class="c-plan t-right">' + fmt.money(r.keep) + '</td></tr>';
          }).join('') + '</tbody><tfoot><tr><td><strong>Total</strong></td><td class="c-plan t-right"><strong>' + sum('sessions') + '</strong></td><td class="t-right"><strong>' + fmt.money(rev) + '</strong></td><td class="c-exp"></td>' +
          '<td class="t-right"><strong>' + fmt.money(sum('payout')) + '</strong></td><td class="c-plan t-right"><strong>' + fmt.money(sum('keep')) + '</strong></td></tr></tfoot>';
        var box = $('st-chart'), sorted = rows.slice().sort(function (a, b) { return b.t.ptRevenue - a.t.ptRevenue; });
        box.innerHTML = charts.hbars(sorted.map(function (r, i) {
          return { label: fmt.first(r.t.name), value: r.t.ptRevenue, text: fmt.moneyShort(r.t.ptRevenue), cls: i === 0 ? 'hbar--accent' : '', tip: r.t.name + ' · ' + fmt.money(r.t.ptRevenue) + ' · ' + r.sessions + ' sessions' };
        }), Math.max(220, box.clientWidth), { label: 'PT revenue by trainer this month.', valueWidth: 64 });
        $('st-insight').innerHTML = '<strong>' + esc(fmt.first(sorted[0].t.name)) + '</strong> leads on ' + fmt.money(sorted[0].t.ptRevenue) + '. PT is ' + Math.round(rev / MF.revenue.target * 100) + '% of the monthly target.';
        if (animate) motion.drawChart(box);
        return { payout: sum('payout'), n: rows.length };
      }

      /* ------------------------------------------------------ events ----- */
      $('st-cards').addEventListener('click', function (e) {
        var b = e.target.closest('[data-wa]');
        if (!b) return;
        var s = MF.staffById[b.getAttribute('data-wa')];
        ui.whatsapp({ name: s.name, phone: s.phone, message: 'Hi ' + fmt.first(s.name) + ', quick one about the rota this week — can you call me when you\'re free?' });
      });
      $('st-rota').addEventListener('click', function (e) {
        var b = e.target.closest('[data-shift]');
        if (!b) return;
        var bits = b.getAttribute('data-shift').split(':'), s = MF.staffById[bits[0]], d = +bits[1], cur = s.rota[d], opts = '';
        function hourOpts(sel) { var o = ''; for (var h = 5; h <= 22; h++) o += '<option value="' + h + '"' + (h === sel ? ' selected' : '') + '>' + pad(h) + ':00</option>'; return o; }
        ui.drawer({ title: fmt.first(s.name) + ' · ' + DAY_LONG[d], subtitle: 'Staffed hours are ' + pad(win(d).from) + ':00–' + pad(win(d).to) + ':00',
          body: '<form class="stack" id="sh-form" novalidate><div class="field"><label for="sh-on">Working?</label><select class="select" id="sh-on"><option value="1"' + (cur ? ' selected' : '') + '>On shift</option><option value="0"' + (cur ? '' : ' selected') + '>Day off</option></select></div>' +
            '<div class="field"><label for="sh-from">Starts</label><select class="select" id="sh-from">' + hourOpts(cur ? cur[0] : win(d).from) + '</select></div>' +
            '<div class="field"><label for="sh-to">Finishes</label><select class="select" id="sh-to">' + hourOpts(cur ? cur[1] : win(d).to) + '</select></div></form>',
          footer: '<button class="btn btn--ghost" type="button" data-close>Cancel</button><button class="btn btn--primary" type="submit" form="sh-form">Save shift</button>',
          onOpen: function (el, close) {
            el.querySelector('form').addEventListener('submit', function (ev) {
              ev.preventDefault();
              var on = el.querySelector('#sh-on').value === '1', from = +el.querySelector('#sh-from').value, to = +el.querySelector('#sh-to').value;
              if (on && to <= from) { ui.toast('The finish needs to be after the start.', 'warning'); return; }
              s.rota[d] = on ? [from, to] : null;
              close(); paintRota(); paintCards();
              var g = gaps(d);
              ui.toast(fmt.first(s.name) + ': ' + DAYS[d] + ' ' + shiftText(s.rota[d]) + '.' + (g.length ? ' Heads up — ' + DAYS[d] + ' has a gap ' + pad(g[0][0]) + ':00–' + pad(g[0][1]) + ':00.' : ' ' + DAYS[d] + ' is covered.'), g.length ? 'warning' : 'success');
            });
          } });
      });
      $('st-pay').addEventListener('click', function () {
        var t = paintMoney(false);
        ui.modal({ title: 'Run PT payout?', subtitle: fmt.money(t.payout) + ' to ' + t.n + ' trainers',
          body: '<p class="muted">Each trainer gets a breakdown on WhatsApp. Demo only — no money moves.</p>',
          footer: '<button class="btn btn--ghost" type="button" data-close>Not now</button><button class="btn btn--primary" type="button" data-close data-toast="Payout statements sent. Demo only, no money moved.">Run payout</button>' });
      });
      $('st-add').addEventListener('click', function () {
        ui.drawer({ title: 'Add staff', subtitle: 'They get a login and show up on the rota.',
          body: '<form class="stack" id="st-form" novalidate><div class="field"><label for="sf-name">Full name</label><input class="input" id="sf-name" type="text" placeholder="e.g. Sam Carter" autocomplete="off" data-autofocus></div>' +
            '<div class="field"><label for="sf-role">Role</label><select class="select" id="sf-role"><option>Front Desk</option><option>Personal Trainer</option><option>Coach</option><option>Cleaner</option></select></div>' +
            '<div class="field"><label for="sf-phone">Mobile</label><input class="input" id="sf-phone" type="tel" placeholder="07700 900123" autocomplete="off"></div></form>',
          footer: '<button class="btn btn--ghost" type="button" data-close>Cancel</button><button class="btn btn--primary" type="submit" form="st-form">Add to team</button>',
          onOpen: function (el, close) {
            el.querySelector('form').addEventListener('submit', function (ev) {
              ev.preventDefault();
              var name = el.querySelector('#sf-name').value.trim(), role = el.querySelector('#sf-role').value;
              if (!name) { ui.toast('Add a name first.', 'warning'); el.querySelector('#sf-name').focus(); return; }
              var s = { id: 's' + (staffNo++), name: name, role: role, initials: name.split(' ').map(function (x) { return x[0]; }).join('').slice(0, 2).toUpperCase(), pt: false,
                phone: el.querySelector('#sf-phone').value.trim() || '07700 900000', shift: '', ptRevenue: 0, commission: 0, rota: [null, null, null, null, null, null, null] };
              MF.staff.push(s); MF.staffById[s.id] = s;
              close(); paintCards(); paintRota();
              ui.toast(fmt.first(name) + ' added. Set their shifts on the rota.', 'success');
            });
          } });
      });

      paintCards(); paintRota(); paintMoney(true);

      var lastW = $('st-chart').clientWidth, rt = null, ro = null;
      function onResize() { clearTimeout(rt); rt = setTimeout(function () { var b = $('st-chart'); if (b && b.clientWidth !== lastW) { lastW = b.clientWidth; paintMoney(false); } }, 140); }
      if (window.ResizeObserver) { ro = new ResizeObserver(onResize); ro.observe($('st-chart')); }
      window.addEventListener('resize', onResize);
      return function () { clearTimeout(rt); if (ro) ro.disconnect(); window.removeEventListener('resize', onResize); };
    }
  });
})();
