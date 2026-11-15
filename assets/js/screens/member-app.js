/* ==========================================================================
   Member app preview — a phone-frame mockup of what members carry:
   Home (streak, busy-now, best time, next booking) · QR check-in ·
   Classes (book / cancel) · Progress.   Pick any member to preview as.
   ========================================================================== */
(function () {
  'use strict';
  var App = window.MFApp, MF = window.MF, ui = App.ui, fmt = App.fmt, icon = App.icon, charts = App.charts, motion = App.motion;
  var esc = fmt.esc, state = { tab: 'home', memberId: null, booked: {}, scanned: false };
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var TABS = [['home', 'Home', 'dashboard'], ['checkin', 'Check in', 'scan'], ['classes', 'Classes', 'calendar'], ['progress', 'Progress', 'chart']];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function level(p) { return p < 25 ? 'Quiet' : p < 55 ? 'Steady' : p < 80 ? 'Busy' : 'Packed'; }
  function upcoming() {
    var nowM = MF.now.getHours() * 60 + MF.now.getMinutes();
    return MF.classes.map(function (c) {
      var p = c.start.split(':'), ahead = (c.day - MF.todayDow + 7) % 7;
      if (ahead === 0 && +p[0] * 60 + +p[1] <= nowM) ahead = 7;
      return { c: c, ahead: ahead, mins: +p[0] * 60 + +p[1] };
    }).sort(function (a, b) { return a.ahead - b.ahead || a.mins - b.mins; });
  }
  function dayLabel(ahead, c) { return ahead === 0 ? 'Today' : ahead === 1 ? 'Tomorrow' : DAYS[c.day]; }

  App.screen('member-app', {
    title: 'Member app preview',
    render: function (view) {
      var choices = MF.members.filter(function (m) { return m.status === 'active' || m.status === 'expiring'; }).sort(function (a, b) { return b.streak - a.streak; }).slice(0, 10);
      if (!state.memberId) state.memberId = choices[0].id;

      view.innerHTML =
        ui.pageHead('Member app preview', 'What your members carry in their pocket.',
          '<button class="btn btn--primary" type="button" data-toast="App link sent to ' + MF.activeMembers().length + ' members on WhatsApp.">' + icon('message', 'icon--sm') + 'Send app link to members</button>') +
        '<div class="appdemo">' +
          '<div class="appdemo__phone"><div class="phone phone--app"><div class="phone__notch"></div><div class="phone__screen mapp" id="app-screen"></div>' +
            '<nav class="app__tabs" id="app-tabs" aria-label="App sections"></nav></div></div>' +
          '<div class="stack">' +
            '<section class="card"><div class="field"><label for="app-who">Preview as</label><select class="select" id="app-who">' + choices.map(function (m) { return '<option value="' + m.id + '"' + (m.id === state.memberId ? ' selected' : '') + '>' + esc(m.name) + ' · ' + esc(MF.planById[m.plan].name) + '</option>'; }).join('') + '</select>' +
              '<small>It\'s their real data: their streak, their plan, their bookings.</small></div></section>' +
            '<section class="card"><div class="card__head"><div><h2>Why members open it</h2><p>Four things. No clutter.</p></div></div><ul class="sell">' +
              [['scan', 'QR check-in', 'Phone to the scanner, door opens. Works at 05:00 with nobody on the desk.'],
                ['flame', 'Streaks', 'A reason to come back tomorrow. The longest streak goes on the wall.'],
                ['clock', 'Busy-now meter', 'They see how full it is and the quietest hour left today — before they leave home.'],
                ['calendar', 'Bookings and progress', 'Book a class in two taps. Watch the numbers go up.']].map(function (s) {
                return '<li><span class="avatar avatar--icon">' + icon(s[0]) + '</span><span><strong>' + s[1] + '</strong><small>' + s[2] + '</small></span></li>';
              }).join('') + '</ul></section>' +
            '<section class="card"><div class="card__head"><div><h2>Your brand, not ours</h2><p>The app follows your colour and logo.</p></div><a class="btn btn--sm" href="#/settings?tab=appearance">Change colour' + icon('chevronRight', 'icon--sm') + '</a></div>' +
              '<p class="muted">Members see “Muscle Flex”, not a software company. Pick a colour in Settings and this phone changes with it.</p></section>' +
          '</div>' +
        '</div>';

      var $ = function (id) { return view.querySelector('#' + id); }, screen = $('app-screen');
      function me() { return MF.memberById[state.memberId]; }

      var SCREENS = {
        home: function (m) {
          var d = MF.memberDetail(m.id), pct = Math.round(MF.live.onFloor / MF.live.capacity * 100), next = upcoming()[0], left = fmt.daysUntil(m.expires);
          var week = d.attendance.slice(-7), names = week.map(function (a) { return 'SMTWTFS'.charAt(new Date(a.date + 'T00:00:00').getDay()); });
          return '<header class="app__hello"><span class="avatar">' + esc(m.initials) + '</span><div><strong>Hello ' + esc(fmt.first(m.name)) + '!</strong><span>Let\'s get it done.</span></div></header>' +
            '<section class="acard acard--accent"><div class="row row--between"><span class="acard__label">Streak</span>' + icon('flame') + '</div>' +
              '<p class="acard__big">' + Math.max(m.streak, 1) + ' day' + (Math.max(m.streak, 1) === 1 ? '' : 's') + '</p>' +
              '<div class="weekdots">' + week.map(function (a, i) { return '<span class="' + (a.visited ? 'is-on' : '') + '"><i></i>' + names[i] + '</span>'; }).join('') + '</div></section>' +
            '<section class="acard"><div class="row row--between"><span class="acard__label">Gym right now</span><span class="chip chip--plain"><span class="live-dot"></span>Live</span></div>' +
              '<p class="acard__big">' + level(pct) + ' <small>' + pct + '% full</small></p><span class="meter meter--lg"><i style="transform:scaleX(' + pct / 100 + ')"></i></span>' +
              '<p class="acard__note">' + icon('clock', 'icon--sm') + 'Quietest today: <strong>' + ui.bestTimeToday() + '</strong></p></section>' +
            '<section class="acard"><span class="acard__label">Next class</span><p class="acard__title">' + esc(next.c.name) + '</p>' +
              '<p class="acard__note">' + dayLabel(next.ahead, next.c) + ' · ' + next.c.start + ' · ' + esc(fmt.first(MF.staffById[next.c.trainerId].name)) + '</p>' +
              '<button class="abtn" type="button" data-go="classes">See classes</button></section>' +
            '<section class="acard"><span class="acard__label">Membership</span><p class="acard__title">' + esc(MF.planById[m.plan].name) + '</p>' +
              '<p class="acard__note">' + (left < 0 ? 'Expired' : left + ' day' + (left === 1 ? '' : 's') + ' left') + ' · ' + fmt.date(m.expires) + '</p>' +
              (left <= 7 ? '<button class="abtn abtn--solid" type="button" data-renew>Renew now</button>' : '') + '</section>';
        },
        checkin: function (m) {
          return '<header class="app__title">Check in</header>' + (state.scanned
            ? '<section class="acard acard--accent app__done">' + icon('checkCircle', 'icon--lg') + '<p class="acard__big">You\'re in.</p><p>Visit ' + fmt.num(m.totalVisits) + '. Go get it.</p></section><button class="abtn" type="button" data-rescan>Show my pass again</button>'
            : '<section class="acard app__qr"><div class="app__qrbox">' + charts.qr(m.id, 176) + '</div><p class="acard__title">' + esc(m.name) + '</p><p class="acard__note">' + m.id + ' · ' + esc(MF.planById[m.plan].name) + '</p></section>' +
              '<p class="app__hint">Hold this to the scanner at the door. Brightness goes up for you.</p><button class="abtn abtn--solid" type="button" data-scan>Simulate the scan</button>');
        },
        classes: function () {
          return '<header class="app__title">Classes</header>' + upcoming().slice(0, 6).map(function (u) {
            var c = u.c, on = !!state.booked[c.id], full = c.booked >= c.capacity && !on;
            return '<section class="acard acard--row"><div class="grow"><p class="acard__title truncate">' + esc(c.name) + '</p><p class="acard__note">' + dayLabel(u.ahead, c) + ' · ' + c.start + ' · ' + (full ? 'full' : (c.capacity - c.booked) + ' left') + '</p></div>' +
              '<button class="abtn' + (on ? ' abtn--on' : full ? '' : ' abtn--solid') + '" type="button" data-book="' + c.id + '">' + (on ? 'Booked ✓' : full ? 'Waitlist' : 'Book') + '</button></section>';
          }).join('');
        },
        progress: function (m) {
          var b = MF.memberDetail(m.id).body, last = b.weight.length - 1;
          return '<header class="app__title">Progress</header>' +
            '<section class="acard"><div class="row row--between"><span class="acard__label">Body weight</span><strong>' + b.weight[last] + ' kg</strong></div><div id="app-chart" class="chartbox" style="margin-top:var(--s-2)"></div></section>' +
            '<div class="app__prs">' + [['Squat', b.squat], ['Bench', b.bench], ['Deadlift', b.dead]].map(function (p) {
              return '<section class="acard"><span class="acard__label">' + p[0] + '</span><p class="acard__big">' + p[1][last] + '<small> kg</small></p><p class="acard__note success-text">+' + (p[1][last] - p[1][0]) + ' kg</p></section>';
            }).join('') + '</div>' +
            '<section class="acard acard--row"><div class="grow"><span class="acard__label">This month</span><p class="acard__title">' + m.visits30 + ' sessions</p></div><div class="grow"><span class="acard__label">All time</span><p class="acard__title">' + fmt.num(m.totalVisits) + '</p></div></section>';
        }
      };

      function paintTabs() {
        $('app-tabs').innerHTML = TABS.map(function (t) { return '<button type="button" data-tab="' + t[0] + '"' + (state.tab === t[0] ? ' aria-current="page"' : '') + '>' + icon(t[2]) + '<span>' + t[1] + '</span></button>'; }).join('');
      }
      function paint(animate) {
        var m = me();
        screen.innerHTML = SCREENS[state.tab](m);
        screen.scrollTop = 0;
        if (state.tab === 'progress') {
          var box = screen.querySelector('#app-chart'), b = MF.memberDetail(m.id).body;
          box.innerHTML = charts.line([{ name: 'Weight', values: b.weight, cls: 'ln-accent', unit: ' kg' }], b.labels, Math.max(200, box.clientWidth), 130, { label: 'Body weight over 8 months.' });
          if (animate) motion.drawChart(box);
        }
        if (animate) motion.contentIn(screen);
      }

      $('app-tabs').addEventListener('click', function (e) {
        var b = e.target.closest('[data-tab]');
        if (!b) return;
        state.tab = b.getAttribute('data-tab'); paintTabs(); paint(true);
      });
      $('app-who').addEventListener('change', function (e) { state.memberId = e.target.value; state.scanned = false; state.booked = {}; paint(true); });
      screen.addEventListener('click', function (e) {
        var t = e.target, b, m = me();
        if ((b = t.closest('[data-go]'))) { state.tab = b.getAttribute('data-go'); paintTabs(); paint(true); return; }
        if (t.closest('[data-renew]')) { ui.toast(fmt.first(m.name) + ' renews in two taps. No forms, no desk.', 'success'); return; }
        if (t.closest('[data-scan]')) { state.scanned = true; MF.simulateCheckin(m); ui.refreshLiveCount(); paint(true); ui.toast('Door opened for ' + fmt.first(m.name) + '. It shows on Check-ins too.', 'success'); return; }
        if (t.closest('[data-rescan]')) { state.scanned = false; paint(true); return; }
        if ((b = t.closest('[data-book]'))) {
          var id = b.getAttribute('data-book'), c = MF.classes.filter(function (x) { return x.id === id; })[0], roster = MF.classAttendees(c);
          if (state.booked[id]) { delete state.booked[id]; var ix = roster.indexOf(m.id); if (ix >= 0) { roster.splice(ix, 1); c.booked -= 1; } ui.toast('Booking cancelled. Spot released.', 'info'); }
          else if (c.booked >= c.capacity) { c.waitlist += 1; ui.toast('On the waitlist. We\'ll ping ' + fmt.first(m.name) + ' if a spot opens.', 'info'); }
          else { state.booked[id] = true; if (roster.indexOf(m.id) < 0) { roster.unshift(m.id); c.booked += 1; } ui.toast('Booked on ' + c.name + '. It shows on the timetable.', 'success'); }
          paint(false);
        }
      });

      paintTabs(); paint(false);
    }
  });
})();
