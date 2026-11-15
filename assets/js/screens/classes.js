/* ==========================================================================
   Classes & PT — weekly calendar (agenda list on small screens), trainer and
   type filters, capacity + waitlists, booking drawer.
   ========================================================================== */
(function () {
  'use strict';
  var App = window.MFApp, MF = window.MF, ui = App.ui, fmt = App.fmt, icon = App.icon, motion = App.motion;
  var esc = fmt.esc, state = { trainer: 'all', type: 'all' }, classNo = 100;
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], DAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var H0 = 6, H1 = 22, HOUR = 46;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function mins(t) { var p = t.split(':'); return +p[0] * 60 + +p[1]; }
  function endTime(t, m) { var e = mins(t) + m; return pad(Math.floor(e / 60)) + ':' + pad(e % 60); }
  function weekDate(day) { var d = new Date(MF.now); d.setDate(d.getDate() - MF.todayDow + day); return d; }
  function events() {
    var out = [];
    if (state.type !== 'pt') MF.classes.forEach(function (c) { if (state.trainer === 'all' || c.trainerId === state.trainer) out.push({ kind: 'class', ref: c, day: c.day, start: c.start, mins: c.mins, id: c.id }); });
    if (state.type !== 'class') MF.ptSessions.forEach(function (p) { if (state.trainer === 'all' || p.trainerId === state.trainer) out.push({ kind: 'pt', ref: p, day: p.day, start: p.start, mins: p.mins, id: p.id }); });
    return out.sort(function (a, b) { return a.day - b.day || mins(a.start) - mins(b.start); });
  }
  /* side-by-side lanes for anything that overlaps in the same day */
  function layout(dayEvents) {
    var cluster = [], lanes = [], clusterEnd = -1;
    function close() { cluster.forEach(function (ev) { ev.lanes = lanes.length; }); cluster = []; lanes = []; }
    dayEvents.forEach(function (ev) {
      var s = mins(ev.start), placed = false;
      if (s >= clusterEnd) close();                       /* nothing overlaps: start a fresh group at full width */
      for (var i = 0; i < lanes.length; i++) { if (lanes[i] <= s) { ev.lane = i; lanes[i] = s + ev.mins; placed = true; break; } }
      if (!placed) { ev.lane = lanes.length; lanes.push(s + ev.mins); }
      cluster.push(ev);
      clusterEnd = Math.max(clusterEnd, s + ev.mins);
    });
    close();
  }
  function label(ev) {
    var tr = MF.staffById[ev.ref.trainerId];
    if (ev.kind === 'class') {
      var c = ev.ref, full = c.booked >= c.capacity;
      return { title: c.name, sub: fmt.first(tr.name) + ' · ' + c.booked + '/' + c.capacity + (full ? ' · full' : ''), full: full, share: c.booked / c.capacity };
    }
    var m = MF.memberById[ev.ref.memberId];
    return { title: 'PT · ' + fmt.first(m.name), sub: fmt.first(tr.name) + ' · ' + ev.ref.status, done: ev.ref.status === 'Completed' };
  }
  function blockHtml(ev) {
    var l = label(ev), top = (mins(ev.start) - H0 * 60) / 60 * HOUR, h = Math.max(22, ev.mins / 60 * HOUR - 3);
    return '<button class="ev ev--' + ev.kind + (l.full ? ' ev--full' : '') + (l.done ? ' ev--done' : '') + (h < 40 ? ' ev--short' : '') + '" type="button" data-ev="' + ev.kind + ':' + ev.id + '" ' +
      'style="top:' + top.toFixed(1) + 'px;height:' + h.toFixed(1) + 'px;left:calc(' + (ev.lane / ev.lanes * 100) + '% + 2px);width:calc(' + (100 / ev.lanes) + '% - 4px)" ' +
      'aria-label="' + esc(l.title + ', ' + DAY_LONG[ev.day] + ' ' + ev.start + ', ' + l.sub) + '">' +
      '<strong>' + esc(l.title) + '</strong><span>' + ev.start + ' · ' + esc(l.sub) + '</span>' +
      (ev.kind === 'class' ? '<i class="ev__fill" style="transform:scaleX(' + Math.min(1, l.share) + ')"></i>' : '') + '</button>';
  }

  App.screen('classes', {
    title: 'Classes & PT',
    render: function (view) {
      var mon = weekDate(0), sun = weekDate(6);
      view.innerHTML =
        ui.pageHead('Classes & PT', 'The week on the floor, at a glance.',
          '<button class="btn" type="button" data-action="quick:booking">' + icon('calendar', 'icon--sm') + 'Book a member</button>' +
          '<button class="btn btn--primary" type="button" id="cl-add">' + icon('plus', 'icon--sm') + 'Add class</button>') +
        '<div class="grid grid--4" id="cl-kpis" style="margin-bottom:var(--s-4)"></div>' +
        '<section class="card card--flush">' +
          '<div class="toolbar"><strong class="cal__week">' + fmt.dateShort(mon) + ' – ' + fmt.date(sun) + '</strong><span class="grow"></span>' +
            '<div class="fchips" id="cl-trainers" style="padding:0" role="group" aria-label="Trainer"></div>' +
            '<label class="sr-only" for="cl-type">Show</label><select class="select" id="cl-type"><option value="all">Classes and PT</option><option value="class">Classes only</option><option value="pt">PT only</option></select></div>' +
          '<div id="cl-cal"></div>' +
        '</section>';

      var $ = function (id) { return view.querySelector('#' + id); }, cal = $('cl-cal');
      $('cl-type').value = state.type;

      function paintKpis(first) {
        var cap = MF.classes.reduce(function (s, c) { return s + c.capacity; }, 0), booked = MF.classes.reduce(function (s, c) { return s + c.booked; }, 0);
        var ptRev = MF.ptSessions.reduce(function (s, p) { return s + p.price; }, 0), wait = MF.classes.reduce(function (s, c) { return s + c.waitlist; }, 0);
        var cards = [['Classes this week', MF.classes.length, '', MF.classes.filter(function (c) { return c.booked >= c.capacity; }).length + ' already full'],
          ['Spots filled', Math.round(booked / cap * 100), '%', booked + ' of ' + cap + ' spots'],
          ['PT sessions', MF.ptSessions.length, '', 'across ' + MF.trainers.length + ' trainers'],
          ['PT this week', ptRev, 'money', wait + ' on class waitlists']];
        $('cl-kpis').innerHTML = cards.map(function (k) {
          var inner = k[2] === 'money' ? '<span' + (first ? ' data-count="' + k[1] + '" data-format="money"' : '') + '>' + fmt.money(k[1]) + '</span>'
            : '<span' + (first ? ' data-count="' + k[1] + '"' : '') + '>' + k[1] + '</span>' + k[2];
          return '<div class="card kpi"><p class="eyebrow">' + k[0] + '</p><p class="figure kpi__val">' + inner + '</p><p class="kpi__note faint">' + k[3] + '</p></div>';
        }).join('');
      }
      function paintFilters() {
        $('cl-trainers').innerHTML = [{ id: 'all', name: 'Everyone' }].concat(MF.trainers).map(function (t) {
          return '<button class="fchip" type="button" data-trainer="' + t.id + '" aria-pressed="' + (state.trainer === t.id) + '">' + esc(t.id === 'all' ? t.name : fmt.first(t.name)) + '</button>';
        }).join('');
      }
      function paintCal(animate) {
        var evs = events(), nowM = MF.now.getHours() * 60 + MF.now.getMinutes();
        if (!evs.length) {
          cal.innerHTML = ui.state({ icon: 'calendar', title: 'Nothing on', text: 'No sessions match that filter this week.', actions: '<button class="btn btn--primary" type="button" id="cl-reset">Show everything</button>' });
          return;
        }
        var hours = '';
        for (var h = H0; h < H1; h++) hours += '<span style="top:' + ((h - H0) * HOUR) + 'px">' + pad(h) + ':00</span>';
        var grid = '<div class="wk" aria-hidden="false"><div class="wk__head"><span></span>' + DAYS.map(function (d, i) {
            return '<span class="wk__day' + (i === MF.todayDow ? ' is-today' : '') + '">' + d + '<strong>' + weekDate(i).getDate() + '</strong></span>';
          }).join('') + '</div><div class="wk__body" style="height:' + ((H1 - H0) * HOUR) + 'px"><div class="wk__hours">' + hours + '</div>' +
          DAYS.map(function (d, i) {
            var day = evs.filter(function (e) { return e.day === i; });
            layout(day);
            return '<div class="wk__col' + (i === MF.todayDow ? ' is-today' : '') + '">' + day.map(blockHtml).join('') +
              (i === MF.todayDow && nowM > H0 * 60 && nowM < H1 * 60 ? '<i class="wk__now" style="top:' + ((nowM - H0 * 60) / 60 * HOUR).toFixed(1) + 'px"></i>' : '') + '</div>';
          }).join('') + '</div></div>';
        var agenda = '<div class="agenda">' + DAYS.map(function (d, i) {
          var day = evs.filter(function (e) { return e.day === i; });
          if (!day.length) return '';
          return '<h3 class="agenda__day' + (i === MF.todayDow ? ' is-today' : '') + '">' + DAY_LONG[i] + ' ' + fmt.dateShort(weekDate(i)) + '</h3><ul class="alist">' + day.map(function (ev) {
            var l = label(ev);
            return '<li class="arow"><button class="arow__main agenda__btn" type="button" data-ev="' + ev.kind + ':' + ev.id + '"><span class="fu__when">' + ev.start + '</span><span class="grow"><strong class="truncate">' + esc(l.title) + '</strong><small class="truncate">' + esc(l.sub) + '</small></span>' +
              (l.full ? '<span class="chip chip--accent">Full</span>' : '') + icon('chevronRight', 'icon--sm') + '</button></li>';
          }).join('') + '</ul>';
        }).join('') + '</div>';
        cal.innerHTML = grid + agenda;
        if (animate) motion.contentIn(cal);
      }

      /* ------------------------------------------------------ drawers ---- */
      function openClass(c) {
        var tr = MF.staffById[c.trainerId], roster = MF.classAttendees(c);
        function body() {
          var full = c.booked >= c.capacity;
          return '<div class="stack"><dl class="kv"><div><dt>When</dt><dd>' + DAY_LONG[c.day] + ' · ' + c.start + '–' + endTime(c.start, c.mins) + '</dd></div><div><dt>Coach</dt><dd>' + esc(tr.name) + '</dd></div>' +
            '<div><dt>Booked</dt><dd>' + c.booked + ' of ' + c.capacity + (c.waitlist ? ' · ' + c.waitlist + ' waiting' : '') + '</dd></div></dl>' +
            '<span class="meter meter--lg' + (full ? '' : ' meter--quiet') + '" role="img" aria-label="' + Math.round(c.booked / c.capacity * 100) + '% full"><i style="transform:scaleX(' + Math.min(1, c.booked / c.capacity) + ')"></i></span>' +
            '<form class="noteform" id="bk-form"><div class="field grow"><label for="bk-name">Book a member</label><input class="input" id="bk-name" type="text" placeholder="Name or member ID" autocomplete="off"></div>' +
            '<button class="btn btn--primary" type="submit">' + (full ? 'Add to waitlist' : 'Book') + '</button></form>' +
            '<div><p class="eyebrow" style="margin-bottom:var(--s-2)">On the list</p><ul class="roster">' + (roster.length ? roster.map(function (id) {
              var m = MF.memberById[id];
              return '<li><span class="avatar avatar--sm">' + esc(m.initials) + '</span><a class="grow truncate" href="#/members/' + m.id + '">' + esc(m.name) + '</a><button class="icon-btn" type="button" data-unbook="' + id + '" aria-label="Remove ' + esc(m.name) + '">' + icon('x', 'icon--sm') + '</button></li>';
            }).join('') : '<li class="muted">Nobody booked yet.</li>') + '</ul></div></div>';
        }
        ui.drawer({ title: c.name, subtitle: (c.booked >= c.capacity ? 'Full' : (c.capacity - c.booked) + ' spots left') + ' · ' + c.mins + ' min',
          body: '<div id="bk-body">' + body() + '</div>',
          footer: '<button class="btn btn--ghost" type="button" data-close>Close</button><button class="btn" type="button" data-toast="Reminder sent to ' + c.booked + ' people on WhatsApp.">' + icon('message', 'icon--sm') + 'Message all</button>',
          onOpen: function (el) {
            var box = el.querySelector('#bk-body');
            function refresh() { box.innerHTML = body(); paintCal(false); paintKpis(false); }
            box.addEventListener('submit', function (e) {
              e.preventDefault();
              var q = box.querySelector('#bk-name').value.trim().toLowerCase();
              if (!q) { ui.toast('Type a name or member ID.', 'warning'); return; }
              var hits = MF.members.filter(function (x) { return x.id.toLowerCase() === q || x.name.toLowerCase().indexOf(q) >= 0; });
              if (!hits.length) { ui.toast('No member matches “' + q + '”.', 'warning'); return; }
              var m = hits.filter(function (x) { return roster.indexOf(x.id) < 0; })[0];   /* prefer someone not on the list yet */
              if (!m) { ui.toast(fmt.first(hits[0].name) + ' is already booked.', 'info'); return; }
              if (c.booked >= c.capacity) { c.waitlist += 1; ui.toast(fmt.first(m.name) + ' is on the waitlist. They\'ll get a ping if a spot opens.', 'info'); }
              else { roster.unshift(m.id); c.booked += 1; ui.toast(fmt.first(m.name) + ' is booked on ' + c.name + '.', 'success'); }
              refresh();
            });
            box.addEventListener('click', function (e) {
              var b = e.target.closest('[data-unbook]');
              if (!b) return;
              var id = b.getAttribute('data-unbook'), m = MF.memberById[id];
              roster.splice(roster.indexOf(id), 1); c.booked -= 1;
              if (c.waitlist > 0) { c.waitlist -= 1; ui.toast(fmt.first(m.name) + ' removed. First on the waitlist has been offered the spot.', 'info'); }
              else ui.toast(fmt.first(m.name) + ' removed from ' + c.name + '.', 'info');
              refresh();
            });
          } });
      }
      function openPt(p) {
        var m = MF.memberById[p.memberId], tr = MF.staffById[p.trainerId];
        ui.drawer({ title: 'PT · ' + m.name, subtitle: DAY_LONG[p.day] + ' · ' + p.start + '–' + endTime(p.start, p.mins),
          body: '<div class="stack"><dl class="kv"><div><dt>Member</dt><dd><a class="link" href="#/members/' + m.id + '">' + esc(m.name) + '</a></dd></div><div><dt>Trainer</dt><dd>' + esc(tr.name) + '</dd></div>' +
            '<div><dt>Goal</dt><dd>' + esc(m.goal) + '</dd></div><div><dt>Price</dt><dd>' + fmt.money(p.price) + '</dd></div><div><dt>Status</dt><dd>' + ui.chip(p.status) + '</dd></div></dl>' +
            '<div class="row row--wrap"><button class="btn" type="button" id="pt-wa">' + icon('message', 'icon--sm') + 'Remind ' + esc(fmt.first(m.name)) + '</button>' +
            '<button class="btn" type="button" data-toast="Pick a new slot in the live system. Nothing moved." data-toast-type="info">Reschedule</button></div></div>',
          footer: '<button class="btn btn--ghost" type="button" data-close>Close</button>' + (p.status === 'Completed' ? '' : '<button class="btn btn--primary" type="button" id="pt-done">Mark completed</button>'),
          onOpen: function (el, close) {
            el.querySelector('#pt-wa').addEventListener('click', function () {
              ui.whatsapp({ name: m.name, phone: m.phone, message: 'Hi ' + fmt.first(m.name) + ', reminder: PT with ' + fmt.first(tr.name) + ' on ' + DAY_LONG[p.day] + ' at ' + p.start + '. Bring water. See you there.' });
            });
            var done = el.querySelector('#pt-done');
            if (done) done.addEventListener('click', function () { p.status = 'Completed'; close(); paintCal(false); ui.toast('Session completed. ' + fmt.money(p.price) + ' logged for ' + fmt.first(tr.name) + '.', 'success'); });
          } });
      }

      /* ------------------------------------------------------ events ----- */
      cal.addEventListener('click', function (e) {
        if (e.target.closest('#cl-reset')) { state.trainer = 'all'; state.type = 'all'; $('cl-type').value = 'all'; paintFilters(); paintCal(true); return; }
        var b = e.target.closest('[data-ev]');
        if (!b) return;
        var bits = b.getAttribute('data-ev').split(':');
        if (bits[0] === 'class') openClass(MF.classes.filter(function (c) { return c.id === bits[1]; })[0]);
        else openPt(MF.ptSessions.filter(function (p) { return p.id === bits[1]; })[0]);
      });
      $('cl-trainers').addEventListener('click', function (e) {
        var b = e.target.closest('[data-trainer]');
        if (!b) return;
        state.trainer = b.getAttribute('data-trainer'); paintFilters(); paintCal(true);
        $('cl-trainers').querySelector('[aria-pressed="true"]').focus();
      });
      $('cl-type').addEventListener('change', function (e) { state.type = e.target.value; paintCal(true); });
      $('cl-add').addEventListener('click', function () {
        var times = [];
        for (var h = H0; h < H1 - 1; h++) { times.push(pad(h) + ':00'); times.push(pad(h) + ':30'); }
        ui.drawer({ title: 'Add class', subtitle: 'It goes on the timetable straight away.',
          body: '<form class="stack" id="cl-form" novalidate><div class="field"><label for="cf-name">Class name</label><input class="input" id="cf-name" type="text" placeholder="e.g. Deadlift Clinic" autocomplete="off" data-autofocus></div>' +
            '<div class="field"><label for="cf-day">Day</label><select class="select" id="cf-day">' + DAY_LONG.map(function (d, i) { return '<option value="' + i + '"' + (i === MF.todayDow ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select></div>' +
            '<div class="field"><label for="cf-time">Starts</label><select class="select" id="cf-time">' + times.map(function (t) { return '<option' + (t === '18:00' ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div>' +
            '<div class="field"><label for="cf-tr">Coach</label><select class="select" id="cf-tr">' + MF.trainers.map(function (t) { return '<option value="' + t.id + '">' + esc(t.name) + '</option>'; }).join('') + '</select></div>' +
            '<div class="field"><label for="cf-cap">Spots</label><input class="input" id="cf-cap" type="number" value="12" min="1" max="40"></div></form>',
          footer: '<button class="btn btn--ghost" type="button" data-close>Cancel</button><button class="btn btn--primary" type="submit" form="cl-form">Add to timetable</button>',
          onOpen: function (el, close) {
            el.querySelector('form').addEventListener('submit', function (ev) {
              ev.preventDefault();
              var name = el.querySelector('#cf-name').value.trim(), cap = parseInt(el.querySelector('#cf-cap').value, 10);
              if (!name || !(cap > 0)) { ui.toast('Give it a name and at least one spot.', 'warning'); return; }
              MF.classes.push({ id: 'c' + (classNo++), day: +el.querySelector('#cf-day').value, start: el.querySelector('#cf-time').value, mins: 60, name: name, capacity: cap, booked: 0, trainerId: el.querySelector('#cf-tr').value, waitlist: 0 });
              close(); state.trainer = 'all'; if (state.type === 'pt') { state.type = 'all'; $('cl-type').value = 'all'; }
              paintFilters(); paintKpis(false); paintCal(true);
              ui.toast(name + ' is on the timetable.', 'success');
            });
          } });
      });

      paintKpis(true); paintFilters(); paintCal(false);
    }
  });
})();
