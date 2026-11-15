/* ==========================================================================
   Check-ins — today's numbers, hourly chart, simulated QR / kiosk scan,
   door log (All / Unstaffed / Flagged) and the unstaffed-hours security view.
   ========================================================================== */
(function () {
  'use strict';
  var App = window.MFApp, MF = window.MF, ui = App.ui, fmt = App.fmt, icon = App.icon, charts = App.charts, motion = App.motion;
  var esc = fmt.esc;
  var state = { tab: 'all', q: '', shown: 12 };
  var CAMS = ['Entrance', 'Free weights', 'Racks', 'Cardio'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function entries() {
    return MF.checkins.filter(function (c) {
      if (state.tab === 'unstaffed' && c.staffed) return false;
      if (state.tab === 'flagged' && c.result === 'Granted') return false;
      if (state.q) {
        var m = MF.memberById[c.memberId];
        if ((m.name + ' ' + m.id + ' ' + c.method + ' ' + (c.flag || '')).toLowerCase().indexOf(state.q.toLowerCase()) < 0) return false;
      }
      return true;
    });
  }
  function count(fn) { return MF.checkins.filter(fn).length; }
  function byHour() {
    return MF.hours.map(function (h) { return MF.checkins.filter(function (c) { return Math.floor(c.mins / 60) === h && c.result !== 'Denied'; }).length; });
  }
  function staffedWindow() {
    var wk = MF.now.getDay() === 0 || MF.now.getDay() === 6, s = wk ? MF.gym.staffed.weekend : MF.gym.staffed.weekday;
    return { from: s.from, to: s.to, text: '05:00–' + pad(s.from) + ':00 and ' + pad(s.to) + ':00–22:00' };
  }
  function logRow(c) {
    var m = MF.memberById[c.memberId];
    return '<tr class="is-click" data-id="' + m.id + '"><td><strong>' + c.time + '</strong></td>' +
      '<td><a class="who" href="#/members/' + m.id + '"><span class="avatar avatar--sm">' + esc(m.initials) + '</span><span><strong>' + esc(m.name) + '</strong><small>' + esc(c.flag || MF.planById[m.plan].name) + '</small></span></a></td>' +
      '<td class="c-plan muted">' + c.method + '</td><td class="c-exp">' + ui.chip(c.staffed ? 'Staffed' : 'Unstaffed') + '</td><td>' + ui.chip(c.result) + '</td>' +
      '<td class="t-acts"><a class="icon-btn" href="#/members/' + m.id + '" aria-label="Open ' + esc(m.name) + '">' + icon('chevronRight') + '</a></td></tr>';
  }

  App.screen('checkins', {
    title: 'Check-ins',
    render: function (view) {
      var win = staffedWindow(), s = MF.status(MF.now);

      view.innerHTML =
        ui.pageHead('Check-ins', 'Who\'s in, who\'s been, who shouldn\'t be.',
          '<button class="btn" type="button" id="ci-lock">' + icon('lock', 'icon--sm') + 'Lock down</button>' +
          '<button class="btn btn--primary" type="button" data-action="quick:checkin">' + icon('plus', 'icon--sm') + 'Log check-in</button>') +

        '<div class="grid grid--4" id="ci-kpis" style="margin-bottom:var(--s-4)"></div>' +

        '<div class="dash">' +
          '<section class="card span-8" aria-labelledby="h-hours"><div class="card__head"><div><h2 id="h-hours">Today by the hour</h2><p>Entries through the door, 05:00–22:00</p></div>' +
            '<div class="legend"><span><i class="lg lg--bar"></i>Entries</span><span><i class="lg lg--now"></i>This hour</span></div></div>' +
            '<div id="ci-chart" class="chartbox" style="height:340px"></div></section>' +

          '<section class="card span-4 kiosk" aria-labelledby="h-kiosk"><div class="card__head"><div><h2 id="h-kiosk">Door kiosk</h2><p>Try a scan. See what the door does.</p></div></div>' +
            '<div class="kiosk__frame" id="k-frame">' + charts.qr('MUSCLEFLEX-DOOR', 132) + '<span class="kiosk__beam" id="k-beam" aria-hidden="true"></span></div>' +
            '<div class="kiosk__result" id="k-result" role="status" aria-live="polite"><strong>Ready to scan</strong><span>Members show their QR pass here.</span></div>' +
            '<button class="btn btn--primary btn--block" type="button" id="k-scan">' + icon('scan', 'icon--sm') + 'Simulate a scan</button>' +
            '<div class="kiosk__alt"><button class="btn btn--sm btn--ghost" type="button" data-scan="overdue">Overdue member</button><button class="btn btn--sm btn--ghost" type="button" data-scan="expired">Expired member</button></div>' +
          '</section>' +

          '<section class="card card--flush span-8" aria-labelledby="h-log"><div class="card__head pad"><div><h2 id="h-log">Door log</h2><p>Every scan, newest first</p></div>' +
            '<label class="searchbox searchbox--sm">' + icon('search', 'icon--sm') + '<span class="sr-only">Search the door log</span><input type="search" id="ci-q" placeholder="Search name or ID" value="' + esc(state.q) + '" autocomplete="off"></label></div>' +
            '<div class="tabs" role="tablist" aria-label="Door log" id="ci-tabs"></div>' +
            '<div id="ci-log" role="tabpanel"></div></section>' +

          '<section class="card span-4" aria-labelledby="h-sec"><div class="card__head"><div><h2 id="h-sec">Unstaffed hours</h2><p>' + win.text + '</p></div>' +
            '<span class="chip ' + (s.staffed ? '' : 'chip--warning') + '">' + (s.staffed ? 'Team is in' : 'Unstaffed now') + '</span></div>' +
            '<dl class="minis minis--3" id="ci-sec"></dl>' +
            '<div class="cams">' + CAMS.map(function (c, i) {
              return '<button class="cam" type="button" data-toast="Opening camera ' + (i + 1) + ' · ' + c + '." data-toast-type="info"><span class="cam__live"><span class="live-dot"></span>Cam ' + (i + 1) + '</span>' + icon(i === 0 ? 'lock' : 'dumbbell') + '<span class="cam__name">' + c + '</span></button>';
            }).join('') + '</div>' +
            '<ul class="doorstate"><li>' + icon('lock', 'icon--sm') + '<span class="grow">Main door</span><strong>Locked · QR access</strong></li>' +
              '<li>' + icon('shield', 'icon--sm') + '<span class="grow">Panic alarm</span><strong>Armed</strong></li>' +
              '<li>' + icon('alert', 'icon--sm') + '<span class="grow">Fire exit</span><strong>Closed</strong></li></ul>' +
            '<button class="btn btn--block" type="button" id="ci-review">Review flagged entries</button>' +
          '</section>' +
        '</div>';

      var $ = function (id) { return view.querySelector('#' + id); };

      /* ------------------------------------------------------ painters --- */
      function paintKpis(first) {
        var hours = byHour(), peak = 0;
        hours.forEach(function (v, i) { if (v > hours[peak]) peak = i; });
        var granted = count(function (c) { return c.result !== 'Denied'; });
        var cards = [
          ['Through the door', granted, 'today so far', true],
          ['On the floor', MF.live.onFloor, 'of ' + MF.live.capacity + ' capacity', true],
          ['Busiest hour', pad(MF.hours[peak]) + ':00', hours[peak] + ' entries', false],
          ['Unstaffed entries', count(function (c) { return !c.staffed && c.result !== 'Denied'; }), 'no team on site', true]
        ];
        $('ci-kpis').innerHTML = cards.map(function (k) {
          return '<div class="card kpi"><p class="eyebrow">' + k[0] + '</p><p class="figure kpi__val"' + (first && k[3] ? ' data-count="' + k[1] + '"' : '') + '>' + k[1] + '</p><p class="kpi__note faint">' + k[2] + '</p></div>';
        }).join('');
      }
      function paintChart(animate) {
        var box = $('ci-chart'), hours = byHour(), nowH = MF.now.getHours();
        box.innerHTML = charts.bars(MF.hours.map(function (h, i) {
          return { label: pad(h), value: hours[i], now: h === nowH, tip: pad(h) + ':00–' + pad(h + 1) + ':00 · ' + hours[i] + ' entries' + (h < win.from || h >= win.to ? ' · unstaffed' : '') };
        }), Math.max(260, box.clientWidth), 340, { label: 'Entries per hour today.', tick: function (v) { return String(v); } });
        if (animate) motion.drawChart(box);
      }
      function paintTabs() {
        var tabs = [['all', 'All today', MF.checkins.length], ['unstaffed', 'Unstaffed', count(function (c) { return !c.staffed; })], ['flagged', 'Flagged', count(function (c) { return c.result !== 'Granted'; })]];
        $('ci-tabs').innerHTML = tabs.map(function (t) {
          return '<button class="tab" type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (state.tab === t[0]) + '"' + (state.tab === t[0] ? '' : ' tabindex="-1"') + '>' + t[1] + '<span class="tab__n">' + t[2] + '</span></button>';
        }).join('');
      }
      function paintLog(animate) {
        var list = entries(), box = $('ci-log');
        if (!list.length) {
          box.innerHTML = ui.state({ icon: state.tab === 'flagged' ? 'shield' : 'scan', title: state.tab === 'flagged' && !state.q ? 'All clear' : 'Nothing here',
            text: state.q ? 'No scans match “' + state.q + '”.' : state.tab === 'flagged' ? 'No flagged or denied entries today.' : 'No scans yet. Doors open at 05:00.' });
          return;
        }
        box.innerHTML = '<div class="table-wrap"><table class="table"><thead><tr><th>Time</th><th>Member</th><th class="c-plan">Method</th><th class="c-exp">Cover</th><th>Result</th><th class="t-acts"><span class="sr-only">Open</span></th></tr></thead><tbody>' +
          list.slice(0, state.shown).map(logRow).join('') + '</tbody></table></div>' +
          (list.length > state.shown ? '<button class="alist__more" type="button" id="ci-more" style="width:100%;border-top:1px solid var(--border)">Show ' + Math.min(12, list.length - state.shown) + ' more · ' + (list.length - state.shown) + ' left</button>' : '');
        if (animate) motion.contentIn(box);
      }
      function paintSecurity() {
        $('ci-sec').innerHTML =
          '<div class="mini"><dt>Entries</dt><dd>' + count(function (c) { return !c.staffed && c.result !== 'Denied'; }) + '</dd></div>' +
          '<div class="mini"><dt>Flagged</dt><dd>' + count(function (c) { return !c.staffed && c.result === 'Flagged'; }) + '</dd></div>' +
          '<div class="mini"><dt>Denied</dt><dd>' + count(function (c) { return !c.staffed && c.result === 'Denied'; }) + '</dd></div>';
      }
      function refresh() { paintKpis(false); paintChart(false); paintTabs(); paintLog(false); paintSecurity(); ui.refreshLiveCount(); }

      /* ------------------------------------------------------- kiosk ----- */
      var scanning = false;
      function showResult(c) {
        var m = MF.memberById[c.memberId], first = fmt.first(m.name), box = $('k-result');
        var tone = c.result === 'Granted' ? 'ok' : c.result === 'Flagged' ? 'warn' : 'bad';
        var title = c.result === 'Granted' ? 'Welcome, ' + first + '.' : c.result === 'Flagged' ? 'In you go, ' + first + '.' : 'Sorry, ' + first + '.';
        var line = c.result === 'Granted' ? MF.planById[m.plan].name + ' · visit ' + fmt.num(m.totalVisits) + '. Go get it.'
          : c.result === 'Flagged' ? 'Payment overdue. Door opened, desk has been told.'
          : (c.flag || 'No access') + '. Door stays locked. Desk has been told.';
        box.className = 'kiosk__result kiosk__result--' + tone;
        box.innerHTML = icon(tone === 'ok' ? 'checkCircle' : 'alert', 'icon--lg') + '<strong>' + esc(title) + '</strong><span>' + esc(line) + '</span>';
        motion.contentIn(box);
      }
      function scan(kind) {
        if (scanning) return;
        var who = null;
        if (kind) who = MF.members.filter(function (m) { return m.status === kind; })[0];
        if (kind && !who) { ui.toast('No ' + kind + ' members right now. Good.', 'info'); return; }
        scanning = true;
        $('k-scan').disabled = true;
        $('k-frame').classList.add('is-scanning');
        motion.play($('k-beam'), [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(132px)', opacity: 1 }], { duration: 650, easing: motion.ease.state });
        setTimeout(function () {
          scanning = false;
          if (!view.contains($('k-scan'))) return;
          $('k-scan').disabled = false;
          $('k-frame').classList.remove('is-scanning');
          showResult(MF.simulateCheckin(who || undefined));
          refresh();
          var firstRow = view.querySelector('#ci-log tbody tr');
          if (firstRow && state.tab === 'all' && !state.q) motion.listInsert(firstRow.querySelector('.who'));
        }, motion.reduced() ? 0 : 680);
      }

      /* ------------------------------------------------------ events ----- */
      $('k-scan').addEventListener('click', function () { scan(null); });
      view.querySelector('.kiosk__alt').addEventListener('click', function (e) {
        var b = e.target.closest('[data-scan]');
        if (b) scan(b.getAttribute('data-scan'));
      });
      $('ci-tabs').addEventListener('click', function (e) {
        var b = e.target.closest('[data-tab]');
        if (!b) return;
        state.tab = b.getAttribute('data-tab'); state.shown = 12;
        paintTabs(); paintLog(true);
        $('ci-tabs').querySelector('[aria-selected="true"]').focus();
      });
      $('ci-q').addEventListener('input', function (e) { state.q = e.target.value.trim(); state.shown = 12; paintLog(false); });
      $('ci-log').addEventListener('click', function (e) {
        if (e.target.closest('#ci-more')) { state.shown += 12; paintLog(false); return; }
        if (e.target.closest('a, button')) return;
        var tr = e.target.closest('tr[data-id]');
        if (tr) location.hash = '#/members/' + tr.getAttribute('data-id');
      });
      $('ci-review').addEventListener('click', function () {
        state.tab = 'flagged'; state.q = ''; $('ci-q').value = ''; state.shown = 12;
        paintTabs(); paintLog(true);
        $('h-log').scrollIntoView({ block: 'center' });
      });
      $('ci-lock').addEventListener('click', function () {
        ui.modal({ title: 'Lock the gym down?', subtitle: 'QR and fob access stop straight away. People inside can still leave.',
          body: '<p class="muted">Use this if something is wrong on site. Everyone on the floor gets a WhatsApp, and you can unlock from here.</p>',
          footer: '<button class="btn btn--ghost" type="button" data-close>Cancel</button><button class="btn btn--primary" type="button" data-close data-toast="Demo only — nothing was locked. In the live system the doors lock here." data-toast-type="warning">Lock down</button>' });
      });

      paintKpis(true); paintChart(true); paintTabs(); paintLog(false); paintSecurity();

      /* live arrivals + redraw on resize */
      var timer = setTimeout(function tick() {
        if (!document.hidden && !scanning && MF.status(MF.now).open) { MF.simulateCheckin(); refresh(); }
        timer = setTimeout(tick, 7000 + Math.random() * 5000);
      }, 6000);
      var lastW = $('ci-chart').clientWidth, rt = null, ro = null;
      function onResize() { clearTimeout(rt); rt = setTimeout(function () { var b = $('ci-chart'); if (b && b.clientWidth !== lastW) { lastW = b.clientWidth; paintChart(false); } }, 140); }
      if (window.ResizeObserver) { ro = new ResizeObserver(onResize); ro.observe($('ci-chart')); }
      window.addEventListener('resize', onResize);
      return function () { clearTimeout(timer); clearTimeout(rt); if (ro) ro.disconnect(); window.removeEventListener('resize', onResize); };
    }
  });
})();
