/* ==========================================================================
   Messages — WhatsApp / SMS / Email composer with a live phone preview,
   member segments, automations and what has already gone out.
   ========================================================================== */
(function () {
  'use strict';
  var App = window.MFApp, MF = window.MF, ui = App.ui, fmt = App.fmt, icon = App.icon, motion = App.motion;
  var esc = fmt.esc;
  var state = { channel: 'WhatsApp', segment: 'expiring', subject: 'A quick one from Muscle Flex', body: null };
  var CHANNELS = ['WhatsApp', 'SMS', 'Email'];

  var SEGMENTS = [
    ['expiring', 'Expiring in 7 days', function (m) { return m.status === 'expiring'; }],
    ['active', 'All active members', function (m) { return m.status === 'active' || m.status === 'expiring'; }],
    ['notseen', 'Not seen for 14+ days', function (m) { return m.status === 'active' && m.daysSinceVisit >= 14; }],
    ['failed', 'Failed payments', function (m) { return m.dd === 'Failed' || m.dd === 'Retry'; }],
    ['new', 'New joiners (30 days)', function (m) { return fmt.daysUntil(m.joined) > -30; }],
    ['pt', 'PT clients', function (m) { return m.pt && m.status !== 'expired'; }],
    ['highrisk', 'High churn risk', function (m) { return m.churnRisk >= 60 && m.status !== 'expired'; }]
  ];
  function people(key) { var s = SEGMENTS.filter(function (x) { return x[0] === key; })[0]; return MF.members.filter(s[2]); }
  function segName(key) { return SEGMENTS.filter(function (x) { return x[0] === key; })[0][1]; }
  function fill(text, m) {
    var plan = MF.planById[m.plan], map = { first: fmt.first(m.name), plan: plan.name, expiry: fmt.date(m.expires), besttime: ui.bestTimeToday(), amount: fmt.money(plan.price), link: 'mflex.example/pay' };
    return text.replace(/\{(\w+)\}/g, function (all, k) { return map[k] != null ? map[k] : all; });
  }

  App.screen('messages', {
    title: 'Messages',
    render: function (view) {
      if (state.body === null) state.body = MF.templates[1].body;

      view.innerHTML =
        ui.pageHead('Messages', 'WhatsApp, SMS and email from one place.') +
        '<div class="msg">' +
          '<section class="card" aria-labelledby="h-compose"><div class="card__head"><div><h2 id="h-compose">New message</h2><p>Write once. We fill in each person\'s details.</p></div></div>' +
            '<div class="stack">' +
              '<div class="field"><span class="label" id="l-chan">Send by</span><div class="seg" role="radiogroup" aria-labelledby="l-chan" id="ms-chan"></div></div>' +
              '<div class="field"><label for="ms-seg">To</label><select class="select" id="ms-seg">' + SEGMENTS.map(function (s) { return '<option value="' + s[0] + '"' + (state.segment === s[0] ? ' selected' : '') + '>' + s[1] + ' · ' + people(s[0]).length + '</option>'; }).join('') + '</select></div>' +
              '<div class="field"><span class="label">Start from a template</span><div class="row row--wrap" id="ms-tpl" style="gap:var(--s-2)">' + MF.templates.map(function (t) { return '<button class="fchip" type="button" data-tpl="' + t.id + '">' + esc(t.name) + '</button>'; }).join('') + '</div></div>' +
              '<div class="field" id="ms-subject-wrap"><label for="ms-subject">Subject</label><input class="input" id="ms-subject" type="text" value="' + esc(state.subject) + '" autocomplete="off"></div>' +
              '<div class="field"><label for="ms-body">Message</label><textarea class="textarea" id="ms-body" rows="6">' + esc(state.body) + '</textarea>' +
                '<div class="row row--wrap" id="ms-tokens" style="gap:var(--s-1)">' + ['first', 'plan', 'expiry', 'besttime', 'amount'].map(function (k) { return '<button class="btn btn--sm btn--ghost token" type="button" data-token="{' + k + '}">{' + k + '}</button>'; }).join('') + '<span class="grow"></span><small class="faint" id="ms-count"></small></div></div>' +
              '<div class="row row--wrap"><button class="btn btn--primary" type="button" id="ms-send"></button>' +
                '<button class="btn" type="button" data-toast="Scheduled for tomorrow at 09:00." data-toast-type="info">' + icon('clock', 'icon--sm') + 'Schedule</button>' +
                '<button class="btn btn--ghost" type="button" data-toast="Test sent to your phone, Adam.">Send me a test</button></div>' +
            '</div></section>' +

          '<section class="msg__preview" aria-label="Preview"><div class="phone"><div class="phone__notch"></div><div class="phone__screen" id="ms-phone"></div></div><p class="faint msg__who" id="ms-who"></p></section>' +

          '<div class="stack">' +
            '<section class="card card--flush" aria-labelledby="h-auto"><div class="card__head pad"><div><h2 id="h-auto">Automations</h2><p>Set once. They run themselves.</p></div></div><ul class="alist alist--tight" id="ms-auto" style="margin-top:var(--s-3)"></ul></section>' +
            '<section class="card card--flush" aria-labelledby="h-sent"><div class="card__head pad"><div><h2 id="h-sent">Sent</h2><p>What went out, and who read it</p></div></div><ul class="alist alist--tight" id="ms-sent" style="margin-top:var(--s-3)"></ul></section>' +
          '</div>' +
        '</div>';

      var $ = function (id) { return view.querySelector('#' + id); }, body = $('ms-body');

      function paintChannel() {
        $('ms-chan').innerHTML = CHANNELS.map(function (c) { return '<button class="seg__btn" type="button" role="radio" aria-checked="' + (state.channel === c) + '" data-chan="' + c + '">' + c + '</button>'; }).join('');
        $('ms-subject-wrap').hidden = state.channel !== 'Email';
      }
      function paintPreview() {
        var list = people(state.segment), m = list[0] || MF.members[0], text = fill(state.body || '', m), clock = fmt.time(MF.clock());
        var n = (state.body || '').length, parts = Math.max(1, Math.ceil(text.length / 160));
        $('ms-count').textContent = n + ' characters' + (state.channel === 'SMS' ? ' · ' + parts + ' SMS each' : '');
        $('ms-send').innerHTML = icon('message', 'icon--sm') + 'Send to ' + list.length + (list.length === 1 ? ' person' : ' people');
        $('ms-send').disabled = !list.length || !n;
        $('ms-who').textContent = list.length ? 'Preview for ' + m.name + ', first of ' + list.length + ' in “' + segName(state.segment) + '”.' : 'Nobody is in this group right now.';
        var head = '<div class="chat__head"><span class="brand__mark" aria-hidden="true">MF</span><div><strong>Muscle Flex Gym</strong><span>' + (state.channel === 'WhatsApp' ? 'Business account' : state.channel === 'SMS' ? 'Text message' : 'hello@muscleflex.example') + '</span></div></div>';
        var html = state.channel === 'Email'
          ? head + '<div class="mail"><p class="mail__subject">' + esc(fill(state.subject, m)) + '</p><p class="mail__to">To ' + esc(m.email) + '</p><div class="mail__body">' + esc(text).replace(/\n/g, '<br>') + '</div><p class="mail__foot">Muscle Flex Gym · ' + esc(MF.gym.address) + '<br>No contracts. No hidden fees.</p></div>'
          : head + '<div class="chat chat--' + state.channel.toLowerCase() + '"><p class="chat__day">Today</p><div class="bubble">' + (esc(text).replace(/\n/g, '<br>') || '<span class="faint">Your message shows here…</span>') + '<time>' + clock + (state.channel === 'WhatsApp' ? ' ✓✓' : '') + '</time></div></div>';
        $('ms-phone').innerHTML = html;
      }
      function paintAuto() {
        $('ms-auto').innerHTML = MF.automations.map(function (a, i) {
          return '<li class="arow"><span class="grow"><strong>' + esc(a.name) + '</strong><small>' + esc(a.trigger) + ' · ' + (a.on ? a.sent30 + ' sent in 30 days' : 'switched off') + '</small></span>' + ui.switchHtml(a.on, a.name + ' automation', 'data-auto="' + i + '"') + '</li>';
        }).join('');
      }
      function paintSent() {
        $('ms-sent').innerHTML = MF.broadcasts.map(function (b) {
          return '<li class="arow"><span class="avatar avatar--icon">' + icon(b.channel === 'Email' ? 'info' : 'message') + '</span><span class="grow"><strong class="truncate">' + esc(b.title) + '</strong>' +
            '<small class="truncate">' + b.channel + ' · ' + esc(b.segment) + ' · ' + fmt.dateShort(b.date) + ' ' + b.time + '</small></span><span class="risk">' + b.sent + '<small>' + b.read + '% read</small></span></li>';
        }).join('');
      }

      /* ------------------------------------------------------ events ----- */
      $('ms-chan').addEventListener('click', function (e) {
        var b = e.target.closest('[data-chan]');
        if (!b) return;
        state.channel = b.getAttribute('data-chan'); paintChannel(); paintPreview(); motion.contentIn($('ms-phone'));
        $('ms-chan').querySelector('[aria-checked="true"]').focus();
      });
      $('ms-seg').addEventListener('change', function (e) { state.segment = e.target.value; paintPreview(); });
      body.addEventListener('input', function () { state.body = body.value; paintPreview(); });
      $('ms-subject').addEventListener('input', function (e) { state.subject = e.target.value; paintPreview(); });
      $('ms-tpl').addEventListener('click', function (e) {
        var b = e.target.closest('[data-tpl]');
        if (!b) return;
        var t = MF.templates.filter(function (x) { return x.id === b.getAttribute('data-tpl'); })[0];
        state.body = t.body; body.value = t.body; state.subject = t.name + ' — Muscle Flex'; $('ms-subject').value = state.subject;
        if (CHANNELS.indexOf(t.channel) >= 0 && state.channel !== 'Email') { state.channel = t.channel; paintChannel(); }
        paintPreview(); motion.contentIn($('ms-phone'));
        ui.toast('“' + t.name + '” loaded. Edit it or send as is.', 'info');
      });
      $('ms-tokens').addEventListener('click', function (e) {
        var b = e.target.closest('[data-token]');
        if (!b) return;
        var tok = b.getAttribute('data-token'), at = body.selectionStart == null ? body.value.length : body.selectionStart;
        body.value = body.value.slice(0, at) + tok + body.value.slice(body.selectionEnd == null ? at : body.selectionEnd);
        state.body = body.value; body.focus(); body.setSelectionRange(at + tok.length, at + tok.length);
        paintPreview();
      });
      $('ms-send').addEventListener('click', function () {
        var list = people(state.segment);
        ui.modal({ title: 'Send to ' + list.length + (list.length === 1 ? ' person' : ' people') + '?', subtitle: state.channel + ' · ' + segName(state.segment),
          body: '<p class="muted">Each message uses that person\'s own name, plan and dates. Demo only — nothing actually leaves this laptop.</p>',
          footer: '<button class="btn btn--ghost" type="button" data-close>Not yet</button><button class="btn btn--primary" type="button" id="ms-go">Send now</button>',
          onOpen: function (el, close) {
            el.querySelector('#ms-go').addEventListener('click', function () {
              MF.broadcasts.unshift({ id: 'b' + Date.now(), channel: state.channel, segment: segName(state.segment), title: state.channel === 'Email' ? state.subject : (state.body.split(/[.!?\n]/)[0] || 'Message').slice(0, 40),
                sent: list.length, read: 0, date: MF.todayIso, time: fmt.time(MF.clock()) });
              close(); paintSent(); motion.listInsert($('ms-sent').firstElementChild);
              ui.toast('Sent to ' + list.length + (list.length === 1 ? ' person' : ' people') + ' on ' + state.channel + '.', 'success');
            });
          } });
      });
      $('ms-auto').addEventListener('click', function (e) {
        var sw = e.target.closest('[data-auto]');
        if (!sw) return;
        var a = MF.automations[+sw.getAttribute('data-auto')];
        a.on = !a.on; paintAuto();
        ui.toast(a.name + (a.on ? ' is on. It runs ' + a.trigger.toLowerCase() + '.' : ' is off.'), a.on ? 'success' : 'info');
        var again = $('ms-auto').querySelector('[data-auto="' + MF.automations.indexOf(a) + '"]');
        if (again) again.focus();
      });

      paintChannel(); paintPreview(); paintAuto(); paintSent();
    }
  });
})();
