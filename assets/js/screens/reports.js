/* ==========================================================================
   Reports — date range, revenue vs target, retention cohorts, churn and why,
   attendance, lifetime value by plan, peak hours.
   ========================================================================== */
(function () {
  'use strict';
  var App = window.MFApp, MF = window.MF, ui = App.ui, fmt = App.fmt, icon = App.icon, charts = App.charts, motion = App.motion;
  var state = { range: 6, weekly: true };
  var RANGES = [[1, 'This month'], [3, '3 months'], [6, '6 months'], [12, '12 months']];
  var DAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function avg(arr) { return arr.reduce(function (s, v) { return s + v; }, 0) / (arr.length || 1); }

  App.screen('reports', {
    title: 'Reports',
    render: function (view) {
      view.innerHTML =
        ui.pageHead('Reports', 'The numbers that matter. Nothing else.',
          '<button class="btn" type="button" data-toast="Report exported to muscle-flex-report.csv.">' + icon('download', 'icon--sm') + 'CSV</button>' +
          '<button class="btn btn--primary" type="button" data-toast="PDF ready: muscle-flex-report.pdf.">' + icon('download', 'icon--sm') + 'Export PDF</button>') +
        '<div class="rangebar"><div class="fchips" style="padding:0" role="group" aria-label="Date range" id="rp-range"></div>' +
          '<label class="rangebar__weekly"><span>Email me this every Monday</span>' + ui.switchHtml(state.weekly, 'Email this report every Monday', 'id="rp-weekly"') + '</label></div>' +
        '<div class="grid grid--4" id="rp-kpis" style="margin-bottom:var(--s-4)"></div>' +
        '<div class="dash">' +
          '<section class="card span-8" aria-labelledby="h-rrev"><div class="card__head"><div><h2 id="h-rrev">Revenue</h2><p id="rp-rev-sub"></p></div>' +
            '<div class="legend"><span><i class="lg lg--bar"></i>Revenue</span><span><i class="lg lg--now"></i>This month so far</span><span><i class="lg lg--line"></i>Target</span></div></div><div id="rp-rev" class="chartbox" style="height:280px"></div></section>' +
          '<section class="card span-4" aria-labelledby="h-ltv"><div class="card__head"><div><h2 id="h-ltv">Lifetime value</h2><p>What a member is worth, by plan</p></div></div><div id="rp-ltv" class="chartbox"></div>' +
            '<p class="insight">' + icon('flame', 'icon--sm') + '<span id="rp-ltv-note"></span></p></section>' +

          '<section class="card card--flush span-8" aria-labelledby="h-coh"><div class="card__head pad"><div><h2 id="h-coh">Retention by joining month</h2><p>Of the people who joined, how many are still paying each month after</p></div></div>' +
            '<div class="table-wrap" style="margin-top:var(--s-3)"><table class="table cohort" id="rp-coh"></table></div></section>' +
          '<section class="card span-4" aria-labelledby="h-churn"><div class="card__head"><div><h2 id="h-churn">Churn</h2><p id="rp-churn-sub"></p></div></div><div id="rp-churn" class="chartbox"></div></section>' +

          '<section class="card span-4" aria-labelledby="h-why"><div class="card__head"><div><h2 id="h-why">Why people leave</h2><p>From exit messages, last 12 months</p></div></div><div id="rp-why" class="chartbox"></div></section>' +
          '<section class="card span-4" aria-labelledby="h-att"><div class="card__head"><div><h2 id="h-att">Attendance</h2><p id="rp-att-sub"></p></div></div><div id="rp-att" class="chartbox"></div></section>' +
          '<section class="card span-4" aria-labelledby="h-peak"><div class="card__head"><div><h2 id="h-peak">Peak hours</h2><p>Busiest five slots in a typical week</p></div></div><div id="rp-peak" class="chartbox"></div></section>' +
        '</div>';

      var $ = function (id) { return view.querySelector('#' + id); };

      function paint(animate, first) {
        var n = state.range, months = MF.revenue.months.slice(-n), churn = MF.reports.churn.slice(-n), visits = MF.reports.visits.slice(-n);
        var revenue = months.reduce(function (s, m) { return s + m.revenue; }, 0), target = months.reduce(function (s, m) { return s + m.target; }, 0);
        var members = MF.activeMembers().length, churnAvg = avg(churn.map(function (c) { return c.value; }));
        var perMember = revenue / n / members, ltvAll = perMember / (churnAvg / 100);

        $('rp-range').innerHTML = RANGES.map(function (r) { return '<button class="fchip" type="button" data-range="' + r[0] + '" aria-pressed="' + (state.range === r[0]) + '">' + r[1] + '</button>'; }).join('');

        var cards = [['Revenue', revenue, 'money', Math.round(revenue / target * 100) + '% of target'], ['Per member, a month', Math.round(perMember), 'money', members + ' active members'],
          ['Retention', Math.round((100 - churnAvg) * 10) / 10, 'pct', churnAvg.toFixed(1) + '% leave each month'], ['Lifetime value', Math.round(ltvAll / 100) * 100, 'money', 'average, across all plans']];
        $('rp-kpis').innerHTML = cards.map(function (k) {
          var inner = k[2] === 'money' ? '<span' + (first ? ' data-count="' + k[1] + '" data-format="money"' : '') + '>' + fmt.money(k[1]) + '</span>' : k[1] + '%';
          return '<div class="card kpi"><p class="eyebrow">' + k[0] + '</p><p class="figure kpi__val">' + inner + '</p><p class="kpi__note faint">' + k[3] + '</p></div>';
        }).join('');

        /* revenue */
        var rb = $('rp-rev');
        rb.innerHTML = charts.bars(months.map(function (m) {
          return { label: m.label, value: m.revenue, target: m.target, now: !!m.partial, tip: m.label + ' ' + m.year + ' · ' + fmt.money(m.revenue) + (m.partial ? ' so far' : '') + ' · target ' + fmt.money(m.target) };
        }), Math.max(260, rb.clientWidth), 280, { label: 'Revenue against target for the selected range.' });
        $('rp-rev-sub').textContent = fmt.money(revenue) + ' against a ' + fmt.money(target) + ' target';

        /* lifetime value by plan */
        var lb = $('rp-ltv'), plans = MF.plans.filter(function (p) { return p.kind === 'membership'; }).map(function (p) {
          var monthly = p.period === 'year' ? p.price / 12 : p.price;
          return { label: p.name, value: Math.round(monthly / (churnAvg / 100) / 100) * 100 };
        }).sort(function (a, b) { return b.value - a.value; });
        lb.innerHTML = charts.hbars(plans.map(function (p, i) { return { label: p.label, value: p.value, text: fmt.moneyShort(p.value), cls: i === 0 ? 'hbar--accent' : '', tip: p.label + ' · ' + fmt.money(p.value) + ' over a typical membership' }; }),
          Math.max(220, lb.clientWidth), { label: 'Lifetime value by plan.', valueWidth: 64 });
        $('rp-ltv-note').innerHTML = 'A typical member stays <strong>' + Math.round(100 / churnAvg) + ' months</strong>. Every point of churn you cut adds about ' + fmt.moneyShort(perMember / ((churnAvg - 1) / 100) - ltvAll) + ' per member.';

        /* cohorts */
        var maxCols = 6;
        $('rp-coh').innerHTML = '<thead><tr><th>Joined</th><th class="t-right">People</th>' + Array.apply(null, Array(maxCols)).map(function (x, i) { return '<th class="cohort__h">' + (i === 0 ? 'Month 0' : '+' + i) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          MF.reports.cohorts.map(function (c) {
            return '<tr><td><strong>' + c.label + '</strong></td><td class="t-right muted">' + c.size + '</td>' + Array.apply(null, Array(maxCols)).map(function (x, i) {
              var v = c.kept[i];
              return v == null ? '<td class="cohort__c cohort__c--none"></td>'
                : '<td class="cohort__c"><span class="' + (v >= 86 ? 'cohort__hi' : '') + '" style="background:color-mix(in srgb, var(--accent-mark) ' + Math.round(Math.max(8, (v - 60) / 40 * 78)) + '%, transparent)" data-tip="' + c.label + ' · month +' + i + ' · ' + v + '% still members (' + Math.round(c.size * v / 100) + ' of ' + c.size + ')">' + v + '%</span></td>';
            }).join('') + '</tr>';
          }).join('') + '</tbody>';

        /* churn */
        var cb = $('rp-churn'), cs = churn.length > 1 ? churn : MF.reports.churn.slice(-2);
        cb.innerHTML = charts.line([{ name: 'Churn', values: cs.map(function (c) { return c.value; }), cls: 'ln-accent', unit: '%' }], cs.map(function (c) { return c.label; }), Math.max(220, cb.clientWidth), 200, { label: 'Monthly churn rate.' });
        var d = Math.round((cs[cs.length - 1].value - cs[0].value) * 10) / 10;
        $('rp-churn-sub').textContent = cs[cs.length - 1].value + '% a month now, ' + (d <= 0 ? 'down ' + Math.abs(d) : 'up ' + d) + ' points over the period';

        /* reasons, attendance, peak */
        var wb = $('rp-why'), total = MF.reports.churnReasons.reduce(function (s, r) { return s + r[1]; }, 0);
        wb.innerHTML = charts.hbars(MF.reports.churnReasons.map(function (r, i) { return { label: r[0], value: r[1], text: Math.round(r[1] / total * 100) + '%', cls: i === 0 ? 'hbar--accent' : '', tip: r[0] + ' · ' + r[1] + ' members' }; }),
          Math.max(220, wb.clientWidth), { label: 'Reasons members gave for leaving.', valueWidth: 44 });
        var ab = $('rp-att'), vs = visits.length > 1 ? visits : MF.reports.visits.slice(-2);
        ab.innerHTML = charts.line([{ name: 'Visits a week', values: vs.map(function (v) { return v.value; }), cls: 'ln-accent', unit: '' }], vs.map(function (v) { return v.label; }), Math.max(220, ab.clientWidth), 200, { label: 'Average visits per member per week.' });
        $('rp-att-sub').textContent = vs[vs.length - 1].value + ' visits a week per member';
        var slots = [];
        MF.heatmap.forEach(function (row, dd) { row.forEach(function (v, i) { slots.push({ d: dd, h: MF.hours[i], v: v }); }); });
        slots.sort(function (a, b) { return b.v - a.v; });
        var pb = $('rp-peak');
        pb.innerHTML = charts.hbars(slots.slice(0, 5).map(function (s, i) { return { label: DAY_LONG[s.d].slice(0, 3) + ' ' + pad(s.h) + ':00', value: s.v, text: s.v + '% full', cls: i === 0 ? 'hbar--accent' : '', tip: DAY_LONG[s.d] + ' ' + pad(s.h) + ':00 · about ' + Math.round(s.v / 100 * MF.live.capacity * .82) + ' on the floor' }; }),
          Math.max(220, pb.clientWidth), { label: 'Five busiest hours of the week.', valueWidth: 64 });

        if (animate) motion.drawChart(view);
      }

      $('rp-range').addEventListener('click', function (e) {
        var b = e.target.closest('[data-range]');
        if (!b) return;
        state.range = +b.getAttribute('data-range');
        paint(true, false);
        $('rp-range').querySelector('[aria-pressed="true"]').focus();
      });
      $('rp-weekly').addEventListener('click', function (e) {
        state.weekly = !state.weekly;
        e.currentTarget.setAttribute('aria-checked', state.weekly);
        ui.toast(state.weekly ? 'You\'ll get this every Monday at 07:00.' : 'Weekly email switched off.', state.weekly ? 'success' : 'info');
      });

      paint(true, true);

      var lastW = $('rp-rev').clientWidth, rt = null, ro = null;
      function onResize() { clearTimeout(rt); rt = setTimeout(function () { var b = $('rp-rev'); if (b && b.clientWidth !== lastW) { lastW = b.clientWidth; paint(false, false); } }, 140); }
      if (window.ResizeObserver) { ro = new ResizeObserver(onResize); ro.observe($('rp-rev')); }
      window.addEventListener('resize', onResize);
      return function () { clearTimeout(rt); if (ro) ro.disconnect(); window.removeEventListener('resize', onResize); };
    }
  });
})();
