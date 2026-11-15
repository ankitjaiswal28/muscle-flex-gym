/* ==========================================================================
   Overview dashboard — the hero screen.
   KPI row · live occupancy gauge + best time · 12-month revenue vs target ·
   needs attention · live check-in feed · busy-hours heatmap · target ring ·
   membership mix · churn-risk watchlist · birthdays & milestones.
   ========================================================================== */
(function () {
  'use strict';
  var App = window.MFApp, MF = window.MF, ui = App.ui, fmt = App.fmt, icon = App.icon, charts = App.charts, motion = App.motion;
  var esc = fmt.esc;
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var DAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  /* Rows the owner has dealt with stay dealt with for the session */
  var handled = {};
  var activeTab = 'expiring';

  /* ---------------------------------------------------------------- data -- */
  function pct(a, b) { return b ? Math.round((a - b) / b * 100) : 0; }
  function level(p) { return p < 25 ? 'Quiet' : p < 55 ? 'Steady' : p < 80 ? 'Busy' : 'Packed'; }
  function floorPct() { return Math.round(MF.live.onFloor / MF.live.capacity * 100); }

  function bestHour() {
    var row = MF.heatmap[MF.todayDow], h = MF.now.getHours(), best = null, bestV = 999;
    MF.hours.forEach(function (hr, i) { if (hr > h && row[i] < bestV) { bestV = row[i]; best = hr; } });
    return best;
  }
  function peakCell() {
    var best = { v: -1 };
    MF.heatmap.forEach(function (row, d) { row.forEach(function (v, i) { if (v > best.v) best = { v: v, d: d, h: MF.hours[i] }; }); });
    return best;
  }
  function daysToBirthday(dob) {
    var p = dob.split('-'), t = new Date(MF.now.getFullYear(), MF.now.getMonth(), MF.now.getDate());
    var next = new Date(t.getFullYear(), +p[1] - 1, +p[2]);
    if (next < t) next.setFullYear(t.getFullYear() + 1);
    return Math.round((next - t) / 864e5);
  }
  function churnReason(m) {
    var bits = [];
    if (m.daysSinceVisit >= 7) bits.push('not in for ' + m.daysSinceVisit + ' days');
    if (m.visits30 <= 4) bits.push(m.visits30 + ' visit' + (m.visits30 === 1 ? '' : 's') + ' in 30 days');
    if (m.dd === 'Failed' || m.dd === 'Retry') bits.push('payment failed');
    if (!bits.length) bits.push('visits dropping off');
    return bits.slice(0, 2).join(' · ');
  }

  var TABS = {
    expiring: {
      label: 'Expiring', all: '#/members?status=expiring', allLabel: 'All expiring members',
      rows: function () {
        return MF.members.filter(function (m) { return m.status === 'expiring'; })
          .sort(function (a, b) { return a.expires.localeCompare(b.expires); })
          .map(function (m) {
            var d = fmt.daysUntil(m.expires);
            return { key: 'e' + m.id, person: m, href: '#/members/' + m.id, risk: m.churnRisk,
              line: MF.planById[m.plan].name + ' · expires ' + (d <= 0 ? 'today' : d === 1 ? 'tomorrow' : 'in ' + d + ' days'),
              tpl: 't2', cta: 'Renew',
              done: 'Renewed. ' + fmt.first(m.name) + ' is good for another ' + MF.planById[m.plan].period + '.' };
          });
      }
    },
    failed: {
      label: 'Failed payments', all: '#/payments', allLabel: 'All payments',
      rows: function () {
        return MF.members.filter(function (m) { return m.dd === 'Failed' || m.dd === 'Retry'; })
          .map(function (m) {
            return { key: 'f' + m.id, person: m, href: '#/members/' + m.id, risk: m.churnRisk,
              line: fmt.money(MF.planById[m.plan].price) + ' Direct Debit ' + (m.dd === 'Retry' ? 'on retry' : 'failed'),
              tpl: 't4', cta: 'Retry', done: 'Retry queued for ' + fmt.first(m.name) + '. You\'ll hear how it lands.' };
          });
      }
    },
    notseen: {
      label: 'Not seen 14+ days', all: '#/members?sort=lastVisit', allLabel: 'All members',
      rows: function () {
        return MF.members.filter(function (m) { return m.status === 'active' && m.daysSinceVisit >= 14; })
          .sort(function (a, b) { return b.daysSinceVisit - a.daysSinceVisit; })
          .map(function (m) {
            return { key: 'n' + m.id, person: m, href: '#/members/' + m.id, risk: m.churnRisk,
              line: 'Last in ' + m.daysSinceVisit + ' days ago · ' + MF.planById[m.plan].name,
              tpl: 't3', cta: 'Nudge', nudge: true };
          });
      }
    },
    leads: {
      label: 'New leads', all: '#/leads', allLabel: 'Open the lead board',
      rows: function () {
        return MF.leads.filter(function (l) { return l.stage === 'New'; })
          .sort(function (a, b) { return a.created.localeCompare(b.created); })
          .map(function (l) {
            var w = -fmt.daysUntil(l.created);
            return { key: 'l' + l.id, person: l, href: '#/leads', lead: true,
              line: l.source + ' · ' + l.interest + ' · waiting ' + (w <= 0 ? 'since today' : w + ' day' + (w === 1 ? '' : 's')),
              msg: 'Hi ' + fmt.first(l.name) + ', thanks for getting in touch with Muscle Flex. Fancy a free look round this week? No contracts, no hidden fees.',
              cta: 'Contacted', done: fmt.first(l.name) + ' marked contacted. Moved on the board.' };
          });
      }
    }
  };
  function openRows(key) { return TABS[key].rows().filter(function (r) { return !handled[r.key]; }); }

  /* ------------------------------------------------------------- pieces -- */
  function delta(value, goodWhenUp, suffix) {
    var up = value >= 0, good = up === goodWhenUp;
    return '<span class="delta ' + (good ? 'delta--good' : 'delta--bad') + '">' + icon(up ? 'arrowUpRight' : 'arrowDownRight', 'icon--sm') +
      Math.abs(value) + (suffix == null ? '%' : suffix) + '</span>';
  }
  function kpi(o) {
    return '<a class="card kpi" href="' + o.href + '" aria-label="' + esc(o.label + ': ' + o.text + '. ' + o.note) + '">' +
      '<div class="kpi__top"><span class="eyebrow">' + o.label + '</span>' + (o.delta || '') + '</div>' +
      '<div class="kpi__mid"><p class="figure kpi__val"' + (o.id ? ' id="' + o.id + '"' : '') + ' data-count="' + o.value + '"' + (o.money ? ' data-format="money"' : '') + '>' + o.text + '</p></div>' +
      '<div class="kpi__foot"><p class="kpi__note faint truncate">' + o.note + '</p>' + charts.sparkline(o.spark, 56, 22) + '</div></a>';
  }
  function personRow(r) {
    var p = r.person;
    return '<li class="arow" data-key="' + r.key + '">' +
      '<a class="arow__main" href="' + r.href + '"><span class="avatar">' + esc(p.initials || p.name.split(' ').map(function (x) { return x[0]; }).join('')) + '</span>' +
      '<span class="grow"><strong class="truncate">' + esc(p.name) + '</strong><small class="truncate">' + esc(r.line) + '</small></span></a>' +
      (r.risk != null ? '<span class="risk' + (r.risk >= 60 ? ' risk--high' : '') + '" title="Churn risk">' + r.risk + '%<small>risk</small></span>' : '') +
      '<span class="arow__acts">' +
      '<button class="icon-btn" type="button" data-act="wa" aria-label="WhatsApp ' + esc(p.name) + '" data-tip="WhatsApp">' + icon('message') + '</button>' +
      '<button class="icon-btn" type="button" data-act="call" aria-label="Call ' + esc(p.name) + '" data-tip="Call ' + esc(p.phone) + '">' + icon('phone') + '</button>' +
      '<button class="btn btn--sm" type="button" data-act="go">' + r.cta + '</button></span></li>';
  }
  function attentionPanel() {
    var rows = openRows(activeTab), t = TABS[activeTab];
    if (!rows.length) {
      return '<div class="state" style="padding:var(--s-7) var(--s-5)"><div class="state__icon">' + icon('checkCircle', 'icon--lg') + '</div>' +
        '<h3>All clear.</h3><p>Nothing chasing you here. Go lift something.</p></div>';
    }
    return '<ul class="alist">' + rows.slice(0, 5).map(personRow).join('') + '</ul>' +
      '<a class="alist__more" href="' + t.all + '">' + (rows.length > 5 ? 'View all ' + rows.length + ' · ' : '') + t.allLabel + icon('chevronRight', 'icon--sm') + '</a>';
  }
  function tabsHtml() {
    return Object.keys(TABS).map(function (k) {
      var n = openRows(k).length;
      return '<button class="tab" type="button" role="tab" id="tab-' + k + '" aria-controls="attention-panel" aria-selected="' + (k === activeTab) + '" data-tab="' + k + '"' + (k === activeTab ? '' : ' tabindex="-1"') + '>' +
        TABS[k].label + '<span class="tab__n">' + n + '</span></button>';
    }).join('');
  }
  function feedRow(c) {
    var m = MF.memberById[c.memberId];
    return '<li class="frow"><span class="avatar avatar--sm">' + esc(m.initials) + '</span>' +
      '<a class="grow" href="#/members/' + m.id + '"><strong class="truncate">' + esc(m.name) + '</strong>' +
      '<small class="truncate">' + c.method + ' · ' + esc(MF.planById[m.plan].name) + (c.staffed ? '' : ' · unstaffed') + '</small></a>' +
      (c.flag ? '<span class="chip chip--' + (c.result === 'Denied' ? 'danger' : 'warning') + '">' + c.flag + '</span>' : '') +
      '<time class="faint">' + c.time + '</time></li>';
  }

  function mixSegments() {
    var act = MF.activeMembers(), counts = {};
    act.forEach(function (m) { var k = MF.planById[m.plan].kind === 'pass' ? 'pass' : m.plan; counts[k] = (counts[k] || 0) + 1; });
    var order = [['monthly', 'Monthly Rolling'], ['student', 'Student'], ['offpeak', 'Off-Peak'], ['annual', 'Annual'], ['couples', 'Couples'], ['pass', 'Week & day passes']];
    return order.map(function (o, i) {
      var n = counts[o[0]] || 0;
      return { value: n, name: o[1], cls: 'seg-' + (i + 1), share: Math.round(n / act.length * 100), tip: o[1] + ' · ' + n + ' members · ' + Math.round(n / act.length * 100) + '%' };
    }).filter(function (s) { return s.value > 0; });
  }
  function celebrations() {
    var out = [];
    MF.members.filter(function (m) { return m.status !== 'expired'; }).map(function (m) { return { m: m, d: daysToBirthday(m.dob) }; })
      .filter(function (x) { return x.d <= 7; }).sort(function (a, b) { return a.d - b.d; }).slice(0, 3).forEach(function (x) {
        out.push({ m: x.m, icon: 'cake', line: 'Birthday ' + (x.d === 0 ? 'today' : x.d === 1 ? 'tomorrow' : 'in ' + x.d + ' days'), tpl: 't5', cta: 'Send wish' });
      });
    var act = MF.activeMembers();
    var streak = act.slice().sort(function (a, b) { return b.streak - a.streak; })[0];
    if (streak && streak.streak > 1) out.push({ m: streak, icon: 'flame', line: streak.streak + '-day streak. Longest in the gym.', msg: 'Hi ' + fmt.first(streak.name) + ', ' + streak.streak + ' days straight. That\'s how it\'s done. Keep going.', cta: 'Big up' });
    var loyal = act.slice().sort(function (a, b) { return a.joined.localeCompare(b.joined); })[0];
    if (loyal) out.push({ m: loyal, icon: 'dumbbell', line: 'Member since ' + fmt.date(loyal.joined) + '. Your longest-standing.', msg: 'Hi ' + fmt.first(loyal.name) + ', just a thank you for sticking with Muscle Flex all this time. Next shake is on us.', cta: 'Say thanks' });
    var visits = act.filter(function (m) { return m !== loyal && m !== streak; }).sort(function (a, b) { return b.totalVisits - a.totalVisits; })[0];
    if (visits) out.push({ m: visits, icon: 'target', line: fmt.num(visits.totalVisits) + ' visits and counting.', msg: 'Hi ' + fmt.first(visits.name) + ', ' + fmt.num(visits.totalVisits) + ' sessions logged at Muscle Flex. Serious work.', cta: 'Big up' });
    return out.slice(0, 5);
  }

  /* -------------------------------------------------------------- render -- */
  App.screen('dashboard', {
    title: 'Overview',
    render: function (view) {
      var s = MF.status(MF.now), rev = MF.revenue;
      var h = MF.now.getHours(), greet = (h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening') + ', ' + MF.gym.owner.name + '.';
      var fp = floorPct(), best = bestHour(), peak = peakCell();
      var dim = new Date(MF.now.getFullYear(), MF.now.getMonth() + 1, 0).getDate(), daysLeft = dim - MF.now.getDate();
      var toGo = Math.max(0, rev.target - rev.mtd), pace = Math.round(rev.mtd / (MF.now.getDate() / dim) / 10) * 10, ahead = pace >= rev.target;
      var segs = mixSegments(), totalActive = MF.activeMembers().length;
      var watch = MF.members.filter(function (m) { return m.status === 'active' || m.status === 'expiring' || m.status === 'overdue'; })
        .sort(function (a, b) { return b.churnRisk - a.churnRisk; }).slice(0, 5);
      var party = celebrations();
      var vibe = !s.open ? 'Doors are shut.' : fp >= 55 ? 'Floor\'s busy. Good.' : fp >= 25 ? 'Steady on the floor.' : 'Quiet floor. Good time for a tidy-up.';
      var expiringN = openRows('expiring').length;

      view.innerHTML =
        ui.pageHead(greet, fmt.date(MF.now) + ' · ' + s.label + ' — ' + s.detail.toLowerCase() + '. ' + vibe,
          '<button class="btn" type="button" id="remind-all"' + (expiringN ? '' : ' disabled') + '>' + icon('message', 'icon--sm') + 'Remind ' + expiringN + ' expiring</button>' +
          '<button class="btn btn--primary" type="button" data-action="quick:member">' + icon('plus', 'icon--sm') + 'New member</button>') +

        /* KPI row */
        '<div class="grid kpis">' +
          kpi({ label: 'Today', value: rev.today, text: fmt.money(rev.today), money: true, href: '#/payments', note: 'revenue · vs last ' + DAYS[MF.todayDow], spark: rev.spark.today, delta: delta(9, true) }) +
          kpi({ label: 'This month', value: rev.mtd, text: fmt.money(rev.mtd), money: true, href: '#/reports', note: 'revenue · vs last month', spark: rev.spark.month, delta: delta(pct(rev.mtd, rev.lastMonthSameDay), true) }) +
          kpi({ label: 'Active members', value: totalActive, text: fmt.num(totalActive), href: '#/members', note: 'net up this month', spark: rev.spark.members, delta: delta(MF.newJoins30, true, '') }) +
          kpi({ label: 'On the floor', id: 'kpi-floor', value: MF.live.onFloor, text: String(MF.live.onFloor), href: '#/checkins', note: 'of ' + MF.live.capacity + ' capacity', spark: rev.spark.floor }) +
          kpi({ label: 'New joins', value: MF.newJoins30, text: String(MF.newJoins30), href: '#/members', note: 'last 30 days', spark: rev.spark.joins, delta: delta(25, true) }) +
          kpi({ label: 'Overdue', value: rev.overdue, text: fmt.money(rev.overdue), money: true, href: '#/payments', note: MF.counts.failedPayments + ' failed payments', spark: rev.spark.overdue, delta: delta(-18, false) }) +
        '</div>' +

        '<div class="dash">' +

        /* Occupancy */
        '<section class="card span-4" aria-labelledby="h-floor">' +
          '<div class="card__head"><div><h2 id="h-floor">On the floor</h2><p>Live from the door</p></div><span class="chip chip--plain"><span class="live-dot' + (s.open ? '' : ' live-dot--off') + '"></span>Live</span></div>' +
          '<div class="gaugebox"><div id="gauge"></div>' +
            '<div class="gaugebox__val"><span class="figure" id="floor-val">' + MF.live.onFloor + '</span><span class="faint">of ' + MF.live.capacity + '</span></div></div>' +
          '<p class="gaugebox__label"><strong id="floor-label">' + level(fp) + '</strong> · <span id="floor-pct">' + fp + '</span>% full</p>' +
          '<hr style="margin:var(--s-4) 0">' +
          '<p class="eyebrow" style="margin-bottom:var(--s-2)">Today, hour by hour</p><div id="strip"></div>' +
          '<div class="besttime">' + icon('clock') + '<span class="grow">' + (best !== null
            ? 'Best time to train: <strong>' + (best < 10 ? '0' : '') + best + ':00</strong>. Quietest hour left today.'
            : 'That\'s the last hour. Doors shut at 22:00.') + '</span>' +
            '<button class="btn btn--sm" type="button" id="tell-members">Tell members</button></div>' +
        '</section>' +

        /* Revenue */
        '<section class="card span-8" aria-labelledby="h-rev">' +
          '<div class="card__head"><div><h2 id="h-rev">Revenue</h2><p>Last 12 months against target</p></div>' +
            '<div class="legend"><span><i class="lg lg--bar"></i>Revenue</span><span><i class="lg lg--now"></i>This month so far</span><span><i class="lg lg--line"></i>Target</span></div></div>' +
          '<div class="row row--wrap" style="gap:var(--s-2) var(--s-4);margin-bottom:var(--s-3)"><span class="figure" style="font-size:var(--fs-32)">' + fmt.money(rev.mtd) + '</span>' +
            '<span class="muted">this month so far</span>' + delta(pct(rev.mtd, rev.lastMonthSameDay), true) + '<span class="faint">vs same day last month</span></div>' +
          '<div id="rev-chart" class="chartbox" style="height:304px"></div>' +
        '</section>' +

        /* Needs attention */
        '<section class="card card--flush span-8" aria-labelledby="h-att">' +
          '<div class="card__head pad"><div><h2 id="h-att">Needs attention</h2><p>Sort it in one tap. WhatsApp, call or done.</p></div></div>' +
          '<div class="tabs" role="tablist" aria-label="Needs attention" id="att-tabs">' + tabsHtml() + '</div>' +
          '<div id="attention-panel" role="tabpanel" aria-labelledby="tab-' + activeTab + '">' + attentionPanel() + '</div>' +
        '</section>' +

        /* Live feed */
        '<section class="card card--flush span-4" aria-labelledby="h-feed">' +
          '<div class="card__head pad"><div><h2 id="h-feed">Check-ins</h2><p>As they walk in</p></div><a class="btn btn--sm" href="#/checkins">Door log' + icon('chevronRight', 'icon--sm') + '</a></div>' +
          (MF.checkins.length
            ? '<ul class="flist" id="feed" aria-live="off">' + MF.checkins.slice(0, 7).map(feedRow).join('') + '</ul>'
            : '<ul class="flist" id="feed"></ul>') +
        '</section>' +

        /* Heatmap */
        '<section class="card span-8" aria-labelledby="h-heat">' +
          '<div class="card__head"><div><h2 id="h-heat">Busy hours</h2><p>Typical week, 05:00–22:00</p></div>' +
            '<div class="legend"><span>Quiet</span><i class="hm hm--1"></i><i class="hm hm--2"></i><i class="hm hm--3"></i><i class="hm hm--4"></i><span>Packed</span></div></div>' +
          '<div id="heat" class="chartbox"></div>' +
          '<p class="insight">' + icon('flame', 'icon--sm') + '<span>Peak is <strong>' + DAY_LONG[peak.d] + ' ' + peak.h + ':00</strong>. ' +
            'Mornings before the team is in are busier than you\'d think — <a class="link" href="#/checkins">see the unstaffed-hours view</a>.</span></p>' +
        '</section>' +

        /* Target ring */
        '<section class="card span-4" aria-labelledby="h-target">' +
          '<div class="card__head"><div><h2 id="h-target">Monthly target</h2><p>' + daysLeft + ' day' + (daysLeft === 1 ? '' : 's') + ' left this month</p></div>' +
            '<span class="chip ' + (ahead ? 'chip--success' : 'chip--warning') + '">' + (ahead ? 'On pace' : 'Behind pace') + '</span></div>' +
          '<div class="ringbox"><div id="ring"></div><div class="ringbox__val"><span class="figure"><span data-count="' + Math.round(rev.mtd / rev.target * 100) + '">' + Math.round(rev.mtd / rev.target * 100) + '</span>%</span><span class="faint">of ' + fmt.money(rev.target) + '</span></div></div>' +
          '<dl class="stats"><div><dt>Collected</dt><dd>' + fmt.money(rev.mtd) + '</dd></div><div><dt>To go</dt><dd>' + fmt.money(toGo) + '</dd></div>' +
            '<div><dt>Needed per day</dt><dd>' + (daysLeft ? fmt.money(Math.ceil(toGo / daysLeft)) : '—') + '</dd></div><div><dt>On pace for</dt><dd>' + fmt.money(pace) + '</dd></div></dl>' +
        '</section>' +

        /* Membership mix */
        '<section class="card span-4" aria-labelledby="h-mix">' +
          '<div class="card__head"><div><h2 id="h-mix">Membership mix</h2><p>Who\'s on what</p></div><a class="btn btn--sm" href="#/memberships">Plans' + icon('chevronRight', 'icon--sm') + '</a></div>' +
          '<div class="mix"><div class="ringbox ringbox--sm"><div id="donut"></div><div class="ringbox__val"><span class="figure" style="font-size:var(--fs-32)">' + totalActive + '</span><span class="faint">active</span></div></div>' +
          '<ul class="mix__legend">' + segs.map(function (g) {
            return '<li><i class="sw ' + g.cls + '"></i><span class="grow truncate">' + g.name + '</span><strong>' + g.value + '</strong><span class="faint">' + g.share + '%</span></li>';
          }).join('') + '</ul></div>' +
        '</section>' +

        /* Churn risk */
        '<section class="card card--flush span-4" aria-labelledby="h-churn">' +
          '<div class="card__head pad"><div><h2 id="h-churn">Churn risk</h2><p>Most likely to drift. Catch them early.</p></div></div>' +
          '<ul class="alist alist--tight" id="churn">' + watch.map(function (m) {
            return '<li class="arow" data-id="' + m.id + '"><a class="arow__main" href="#/members/' + m.id + '"><span class="avatar">' + esc(m.initials) + '</span>' +
              '<span class="grow"><strong class="truncate">' + esc(m.name) + '</strong><small class="truncate">' + esc(churnReason(m)) + '</small>' +
              '<span class="meter meter--danger" aria-hidden="true"><i style="transform:scaleX(' + m.churnRisk / 100 + ')"></i></span></span></a>' +
              '<span class="risk risk--high">' + m.churnRisk + '%<small>risk</small></span>' +
              '<button class="icon-btn" type="button" data-act="wa" aria-label="WhatsApp ' + esc(m.name) + '" data-tip="WhatsApp">' + icon('message') + '</button></li>';
          }).join('') + '</ul>' +
          '<a class="alist__more" href="#/members?sort=risk">Everyone by risk' + icon('chevronRight', 'icon--sm') + '</a>' +
        '</section>' +

        /* Birthdays & milestones */
        '<section class="card card--flush span-4" aria-labelledby="h-party">' +
          '<div class="card__head pad"><div><h2 id="h-party">Birthdays &amp; milestones</h2><p>Small things. Big loyalty.</p></div></div>' +
          '<ul class="alist alist--tight" id="party">' + party.map(function (c, i) {
            return '<li class="arow" data-ix="' + i + '"><a class="arow__main" href="#/members/' + c.m.id + '"><span class="avatar avatar--icon">' + icon(c.icon) + '</span>' +
              '<span class="grow"><strong class="truncate">' + esc(c.m.name) + '</strong><small class="truncate">' + esc(c.line) + '</small></span></a>' +
              '<button class="btn btn--sm" type="button" data-act="wa">' + c.cta + '</button></li>';
          }).join('') + '</ul>' +
        '</section>' +

        '</div>';

      /* ------------------------------------------------------- charts ---- */
      var revItems = rev.months.map(function (m) {
        return { label: m.label, value: m.revenue, target: m.target, now: !!m.partial,
          tip: m.label + ' ' + m.year + ' · ' + fmt.money(m.revenue) + (m.partial ? ' so far' : '') + ' · target ' + fmt.money(m.target) };
      });
      function el(id) { return view.querySelector('#' + id); }
      function drawCharts(animate) {
        var revBox = el('rev-chart'), heatBox = el('heat'), stripBox = el('strip'), gaugeBox = el('gauge');
        if (!revBox) return;
        revBox.innerHTML = charts.bars(revItems, Math.max(260, revBox.clientWidth), 304, { label: 'Revenue for the last 12 months against target. This month so far ' + fmt.money(rev.mtd) + ' of ' + fmt.money(rev.target) + '.' });
        heatBox.innerHTML = charts.heatmap(MF.heatmap, Math.max(260, heatBox.clientWidth), { days: DAYS, hours: MF.hours, todayIx: MF.todayDow, nowHour: MF.now.getHours(), capacity: MF.live.capacity,
          label: 'Busy hours by day and hour. Peak is ' + DAY_LONG[peak.d] + ' at ' + peak.h + ':00.' });
        stripBox.innerHTML = charts.strip(MF.heatmap[MF.todayDow], MF.hours, Math.max(200, stripBox.clientWidth), 64, { nowHour: MF.now.getHours(), bestHour: best, label: 'How busy today is, hour by hour.' });
        var gw = Math.min(260, Math.max(180, gaugeBox.parentNode.clientWidth));
        gaugeBox.innerHTML = charts.gauge(animate && !motion.reduced() ? 0 : floorPct() / 100, gw, 16, 'Occupancy: ' + MF.live.onFloor + ' of ' + MF.live.capacity);
        el('ring').innerHTML = charts.ring(rev.mtd / rev.target, 168, 14, 'Monthly target: ' + Math.round(rev.mtd / rev.target * 100) + '% collected');
        el('donut').innerHTML = charts.donut(segs, 132, 16, 'Membership mix by plan');
        if (animate) {
          motion.drawChart(view);
          setTimeout(function () { charts.setGauge(view, floorPct() / 100); }, 60);   /* swing up from empty */
        }
      }
      drawCharts(true);
      /* Redraw at the new width whenever the chart area changes size
         (window resize, sidebar collapsing, rotating a tablet). */
      var resizeTimer = null, lastW = el('rev-chart').clientWidth, observer = null;
      function onResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          var box = el('rev-chart');
          if (!box || box.clientWidth === lastW) return;
          lastW = box.clientWidth;
          drawCharts(false);
        }, 120);
      }
      if (window.ResizeObserver) { observer = new ResizeObserver(onResize); observer.observe(el('rev-chart')); }
      window.addEventListener('resize', onResize);

      /* -------------------------------------------- needs attention ------ */
      var tabsEl = el('att-tabs'), panel = el('attention-panel');
      function refreshAttention() {
        tabsEl.innerHTML = tabsHtml();
        panel.innerHTML = attentionPanel();
        panel.setAttribute('aria-labelledby', 'tab-' + activeTab);
        var btn = el('remind-all'), n = openRows('expiring').length;
        btn.disabled = !n;
        btn.innerHTML = icon('message', 'icon--sm') + 'Remind ' + n + ' expiring';
      }
      tabsEl.addEventListener('click', function (e) {
        var b = e.target.closest('[data-tab]');
        if (!b) return;
        activeTab = b.getAttribute('data-tab');
        refreshAttention();
        tabsEl.querySelector('[aria-selected="true"]').focus();
      });
      tabsEl.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var keys = Object.keys(TABS), ix = keys.indexOf(activeTab);
        activeTab = keys[(ix + (e.key === 'ArrowRight' ? 1 : -1) + keys.length) % keys.length];
        refreshAttention();
        tabsEl.querySelector('[aria-selected="true"]').focus();
        e.preventDefault();
      });
      function settle(rowEl, r) {
        handled[r.key] = true;
        motion.listRemove(rowEl, refreshAttention);
      }
      panel.addEventListener('click', function (e) {
        var act = e.target.closest('[data-act]');
        if (!act) return;
        var rowEl = act.closest('.arow'), key = rowEl.getAttribute('data-key');
        var r = openRows(activeTab).filter(function (x) { return x.key === key; })[0];
        if (!r) return;
        var p = r.person, kind = act.getAttribute('data-act');
        if (kind === 'call') { ui.toast('Calling ' + fmt.first(p.name) + ' on ' + p.phone + '…', 'info'); return; }
        if (kind === 'wa' || r.nudge) {
          ui.whatsapp({ name: p.name, phone: p.phone, message: r.msg || ui.fillTemplate(r.tpl, p), onSent: function () { settle(rowEl, r); } });
          return;
        }
        ui.toast(r.done, 'success');
        settle(rowEl, r);
      });
      el('remind-all').addEventListener('click', function () {
        var rows = openRows('expiring');
        rows.forEach(function (r) { handled[r.key] = true; });
        ui.toast('Renewal reminder sent to ' + rows.length + ' member' + (rows.length === 1 ? '' : 's') + ' on WhatsApp.', 'success');
        refreshAttention();
      });

      /* ----------------------------------- churn + celebrations + misc --- */
      el('churn').addEventListener('click', function (e) {
        var b = e.target.closest('[data-act="wa"]');
        if (!b) return;
        var m = MF.memberById[b.closest('.arow').getAttribute('data-id')];
        ui.whatsapp({ name: m.name, phone: m.phone, message: ui.fillTemplate('t3', m) });
      });
      el('party').addEventListener('click', function (e) {
        var b = e.target.closest('[data-act="wa"]');
        if (!b) return;
        var c = party[+b.closest('.arow').getAttribute('data-ix')];
        ui.whatsapp({ name: c.m.name, phone: c.m.phone, message: c.msg || ui.fillTemplate(c.tpl, c.m) });
      });
      el('tell-members').addEventListener('click', function () {
        ui.toast(best !== null ? 'Sent to ' + totalActive + ' members: “Quietest today is ' + (best < 10 ? '0' : '') + best + ':00.”' : 'Nothing to send. Last hour of the day.', best !== null ? 'success' : 'info');
      });

      /* ------------------------------------------------ live simulation -- */
      var feed = el('feed'), timer = null;
      var pool = MF.members.filter(function (m) { return m.status === 'active' || m.status === 'expiring' || m.status === 'overdue'; });
      function updateFloor() {
        var p = floorPct();
        el('floor-val').textContent = MF.live.onFloor;
        el('floor-pct').textContent = p;
        el('floor-label').textContent = level(p);
        el('kpi-floor').textContent = MF.live.onFloor;
        charts.setGauge(view, p / 100);
        var pill = document.getElementById('live-count');
        if (pill) pill.textContent = MF.live.onFloor;
      }
      function tick() {
        if (!document.hidden && MF.status(MF.now).open) {
          var c = MF.simulateCheckin();
          feed.insertAdjacentHTML('afterbegin', feedRow(c));
          motion.listInsert(feed.firstElementChild);
          while (feed.children.length > 7) feed.removeChild(feed.lastElementChild);
          updateFloor();
        }
        timer = setTimeout(tick, 5000 + Math.random() * 5000);
      }
      timer = setTimeout(tick, 3500);

      /* cleanup when leaving the screen */
      return function () {
        clearTimeout(timer);
        clearTimeout(resizeTimer);
        if (observer) observer.disconnect();
        window.removeEventListener('resize', onResize);
      };
    }
  });
})();
