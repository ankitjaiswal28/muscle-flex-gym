/* ==========================================================================
   Follow-ups — Today / Overdue / Upcoming / Done, call-outcome logging,
   snooze, one-click WhatsApp from templates, editable templates, scorecard.
   ========================================================================== */
(function () {
  'use strict';
  var App = window.MFApp, MF = window.MF, ui = App.ui, fmt = App.fmt, icon = App.icon, motion = App.motion;
  var esc = fmt.esc, state = { tab: null }, fuNo = 600;
  var TPL_FOR = { 'Renewal due': 't2', 'Payment failed': 't4', 'Missed you — 14 days': 't3', 'Freeze ending': 't2' };
  var OUTCOMES = [['sorted', 'Answered — sorted', 'checkCircle'], ['noanswer', 'No answer', 'phone'], ['callback', 'Call back later', 'clock'], ['no', 'Not interested', 'x']];

  function bucket(f) { return f.done ? 'done' : f.dueIn < 0 ? 'overdue' : f.dueIn === 0 ? 'today' : 'upcoming'; }
  function list(tab) {
    return MF.followups.filter(function (f) { return bucket(f) === tab; })
      .sort(function (a, b) { return a.dueIn - b.dueIn || a.time.localeCompare(b.time); });
  }
  function person(f) { return f.kind === 'member' ? MF.memberById[f.refId] : MF.leads.filter(function (l) { return l.id === f.refId; })[0]; }
  function href(f) { return f.kind === 'member' ? '#/members/' + f.refId : '#/leads'; }
  function message(f) {
    var p = person(f) || { name: f.name };
    if (f.kind === 'member' && TPL_FOR[f.reason]) return ui.fillTemplate(TPL_FOR[f.reason], p);
    return 'Hi ' + fmt.first(f.name) + ', it\'s Muscle Flex. ' + (f.reason === 'Trial feedback' ? 'How did the trial go? Anything we can sort for you?' : 'Thanks for getting in touch. When\'s good for a quick call?');
  }
  function whenText(f) {
    if (f.done) return f.outcome || 'Done';
    if (f.dueIn === 0) return f.time;
    if (f.dueIn < 0) return (-f.dueIn) + ' day' + (f.dueIn === -1 ? '' : 's') + ' late';
    return f.dueIn === 1 ? 'Tomorrow ' + f.time : fmt.dateShort(f.due) + ' ' + f.time;
  }
  function row(f) {
    var owner = MF.staffById[f.owner], b = bucket(f);
    return '<li class="arow' + (f.done ? ' is-done' : '') + '" data-id="' + f.id + '">' +
      '<span class="fu__when' + (b === 'overdue' ? ' danger-text' : '') + '">' + esc(whenText(f)) + '</span>' +
      '<a class="arow__main" href="' + href(f) + '"><span class="grow"><strong class="truncate">' + esc(f.name) + '</strong>' +
        '<small class="truncate">' + esc(f.reason) + ' · ' + (f.kind === 'lead' ? 'Lead' : f.refId) + ' · ' + esc(owner ? fmt.first(owner.name) : '') + '</small></span></a>' +
      (f.done ? '<button class="btn btn--sm btn--ghost" type="button" data-act="reopen">Reopen</button>'
        : '<span class="arow__acts"><button class="icon-btn" type="button" data-act="wa" aria-label="WhatsApp ' + esc(f.name) + '" data-tip="WhatsApp">' + icon('message') + '</button>' +
          '<button class="icon-btn" type="button" data-act="snooze" aria-label="Snooze ' + esc(f.name) + ' to tomorrow" data-tip="Snooze to tomorrow">' + icon('clock') + '</button>' +
          '<button class="btn btn--sm" type="button" data-act="call">' + icon('phone', 'icon--sm') + 'Call</button></span>') + '</li>';
  }

  App.screen('followups', {
    title: 'Follow-ups',
    render: function (view) {
      if (!state.tab) state.tab = list('overdue').length ? 'overdue' : 'today';

      view.innerHTML =
        ui.pageHead('Follow-ups', 'Calls to make today. Nobody slips through.',
          '<button class="btn btn--primary" type="button" id="fu-add">' + icon('plus', 'icon--sm') + 'New follow-up</button>') +
        '<div class="dash">' +
          '<section class="card card--flush span-8"><div class="tabs" role="tablist" aria-label="Follow-ups" id="fu-tabs"></div><div id="fu-panel" role="tabpanel"></div></section>' +
          '<div class="span-4 stack">' +
            '<section class="card" aria-labelledby="h-score"><div class="card__head"><div><h2 id="h-score">Today</h2><p>Clear the list. Go home.</p></div></div><div id="fu-score"></div></section>' +
            '<section class="card card--flush" aria-labelledby="h-tpl"><div class="card__head pad"><div><h2 id="h-tpl">Templates</h2><p>One tap fills in the name, plan and dates</p></div></div><ul class="alist alist--tight" id="fu-tpl" style="margin-top:var(--s-3)"></ul></section>' +
          '</div>' +
        '</div>';

      var $ = function (id) { return view.querySelector('#' + id); }, panel = $('fu-panel');

      function paintTabs() {
        $('fu-tabs').innerHTML = [['overdue', 'Overdue'], ['today', 'Today'], ['upcoming', 'Upcoming'], ['done', 'Done']].map(function (t) {
          return '<button class="tab" type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (state.tab === t[0]) + '"' + (state.tab === t[0] ? '' : ' tabindex="-1"') + '>' + t[1] + '<span class="tab__n">' + list(t[0]).length + '</span></button>';
        }).join('');
      }
      function paintPanel(animate) {
        var items = list(state.tab);
        var EMPTY = {
          overdue: ['checkCircle', 'Nothing overdue', 'You\'re on top of it. Keep it that way.'],
          today: ['checkCircle', 'Today\'s clear', 'Every call made. Go lift something.'],
          upcoming: ['calendar', 'Nothing lined up', 'New follow-ups land here as renewals and enquiries come in.'],
          done: ['phoneCall', 'No calls logged yet', 'Log an outcome and it shows up here.']
        }[state.tab];
        panel.innerHTML = items.length ? '<ul class="alist">' + items.map(row).join('') + '</ul>' : ui.state({ icon: EMPTY[0], title: EMPTY[1], text: EMPTY[2] });
        if (animate) motion.contentIn(panel);
      }
      function paintScore() {
        var open = list('today').length + list('overdue').length, done = list('done').length, total = open + done || 1;
        $('fu-score').innerHTML = '<p class="pstat__big"><span class="figure">' + done + '</span> of ' + (open + done) + ' done</p>' +
          '<span class="meter meter--lg" role="img" aria-label="' + Math.round(done / total * 100) + '% done"><i style="transform:scaleX(' + done / total + ')"></i></span>' +
          '<dl class="minis minis--3" style="margin-top:var(--s-4)"><div class="mini"><dt>Overdue</dt><dd>' + list('overdue').length + '</dd></div><div class="mini"><dt>Today</dt><dd>' + list('today').length + '</dd></div><div class="mini"><dt>Upcoming</dt><dd>' + list('upcoming').length + '</dd></div></dl>';
      }
      function paintTemplates() {
        $('fu-tpl').innerHTML = MF.templates.map(function (t) {
          return '<li class="arow tplrow" data-tpl="' + t.id + '"><span class="grow"><strong>' + esc(t.name) + ' <span class="chip chip--plain">' + t.channel + '</span></strong><small class="tplrow__body">' + esc(t.body) + '</small></span>' +
            '<button class="btn btn--sm" type="button" data-act="edit">Edit</button></li>';
        }).join('');
      }
      function repaint(animate) { paintTabs(); paintPanel(animate); paintScore(); }
      function byId(id) { return MF.followups.filter(function (f) { return f.id === id; })[0]; }
      function settle(rowEl) { if (rowEl && view.contains(rowEl)) motion.listRemove(rowEl, function () { repaint(false); }); else repaint(false); }
      function reschedule(f, days) { f.dueIn = days; f.due = MF.isoIn(days); }

      /* ------------------------------------------------ outcome logging -- */
      function logCall(f, rowEl) {
        ui.modal({ title: 'How did it go?', subtitle: f.name + ' · ' + f.phone + ' · ' + f.reason,
          body: '<div class="outcomes" role="radiogroup" aria-label="Call outcome">' + OUTCOMES.map(function (o, i) {
              return '<button class="outcome" type="button" role="radio" aria-checked="' + (i === 0) + '" data-out="' + o[0] + '">' + icon(o[2]) + '<span>' + o[1] + '</span></button>';
            }).join('') + '</div><div class="field" style="margin-top:var(--s-4)"><label for="fu-note">Note (optional)</label><textarea class="textarea" id="fu-note" placeholder="Anything the team should know…"></textarea></div>',
          footer: '<button class="btn btn--ghost" type="button" data-close>Cancel</button><button class="btn btn--primary" type="button" id="fu-save">Save outcome</button>',
          onOpen: function (el, close) {
            var pick = 'sorted';
            el.querySelector('.outcomes').addEventListener('click', function (e) {
              var b = e.target.closest('[data-out]');
              if (!b) return;
              pick = b.getAttribute('data-out');
              [].forEach.call(el.querySelectorAll('.outcome'), function (x) { x.setAttribute('aria-checked', x === b); });
            });
            el.querySelector('#fu-save').addEventListener('click', function () {
              var label = OUTCOMES.filter(function (o) { return o[0] === pick; })[0][1];
              f.note = el.querySelector('#fu-note').value.trim();
              close();
              if (pick === 'callback' || pick === 'noanswer') {
                reschedule(f, 1);
                ui.toast(label + '. ' + fmt.first(f.name) + ' is back on tomorrow\'s list.', 'info');
              } else {
                f.done = true; f.outcome = label;
                ui.toast('Logged: ' + label.toLowerCase() + '.', 'success');
              }
              settle(rowEl);
            });
          } });
      }

      /* ------------------------------------------------------ events ----- */
      $('fu-tabs').addEventListener('click', function (e) {
        var b = e.target.closest('[data-tab]');
        if (!b) return;
        state.tab = b.getAttribute('data-tab');
        paintTabs(); paintPanel(true);
        $('fu-tabs').querySelector('[aria-selected="true"]').focus();
      });
      panel.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]');
        if (!b) return;
        var rowEl = b.closest('.arow'), f = byId(rowEl.getAttribute('data-id')), act = b.getAttribute('data-act');
        if (act === 'call') { ui.toast('Calling ' + fmt.first(f.name) + ' on ' + f.phone + '…', 'info'); logCall(f, rowEl); }
        else if (act === 'wa') ui.whatsapp({ name: f.name, phone: f.phone, message: message(f), onSent: function () { f.done = true; f.outcome = 'Messaged on WhatsApp'; settle(rowEl); } });
        else if (act === 'snooze') { reschedule(f, 1); ui.toast(fmt.first(f.name) + ' snoozed to tomorrow.', 'info'); settle(rowEl); }
        else if (act === 'reopen') { f.done = false; f.outcome = null; reschedule(f, 0); ui.toast(fmt.first(f.name) + ' is back on today\'s list.', 'info'); settle(rowEl); }
      });
      $('fu-tpl').addEventListener('click', function (e) {
        var li = e.target.closest('[data-tpl]');
        if (!li || !e.target.closest('[data-act="edit"]')) return;
        var t = MF.templates.filter(function (x) { return x.id === li.getAttribute('data-tpl'); })[0];
        ui.drawer({ title: 'Edit “' + t.name + '”', subtitle: t.channel + ' template',
          body: '<div class="stack"><div class="field"><label for="tp-body">Message</label><textarea class="textarea" id="tp-body" rows="6" data-autofocus>' + esc(t.body) + '</textarea>' +
            '<small>Use {first}, {plan}, {expiry}, {besttime}, {amount} — we fill them in for each person.</small></div>' +
            '<div class="field"><span class="label">Preview</span><p class="tplprev" id="tp-prev"></p></div></div>',
          footer: '<button class="btn btn--ghost" type="button" data-close>Cancel</button><button class="btn btn--primary" type="button" id="tp-save">Save template</button>',
          onOpen: function (el, close) {
            var ta = el.querySelector('#tp-body'), sample = MF.members[0], keep = t.body;
            function prev() { t.body = ta.value; el.querySelector('#tp-prev').textContent = ui.fillTemplate(t.id, sample); t.body = keep; }
            ta.addEventListener('input', prev); prev();
            el.querySelector('#tp-save').addEventListener('click', function () {
              if (!ta.value.trim()) { ui.toast('A template needs some words.', 'warning'); return; }
              t.body = ta.value.trim(); close(); paintTemplates(); ui.toast(t.name + ' template saved.', 'success');
            });
          } });
      });
      $('fu-add').addEventListener('click', function () {
        ui.drawer({ title: 'New follow-up', subtitle: 'Set it now so it doesn\'t get forgotten.',
          body: '<form class="stack" id="fu-form" novalidate><div class="field"><label for="ff-name">Who</label><input class="input" id="ff-name" type="text" placeholder="Member or lead name" autocomplete="off" data-autofocus></div>' +
            '<div class="field"><label for="ff-reason">Why</label><select class="select" id="ff-reason">' + ['Renewal due', 'Payment failed', 'Missed you — 14 days', 'Trial feedback', 'New enquiry call-back', 'Freeze ending'].map(function (r) { return '<option>' + r + '</option>'; }).join('') + '</select></div>' +
            '<div class="field"><label for="ff-when">When</label><select class="select" id="ff-when"><option value="0">Today</option><option value="1">Tomorrow</option><option value="3">In 3 days</option><option value="7">Next week</option></select></div></form>',
          footer: '<button class="btn btn--ghost" type="button" data-close>Cancel</button><button class="btn btn--primary" type="submit" form="fu-form">Add follow-up</button>',
          onOpen: function (el, close) {
            el.querySelector('form').addEventListener('submit', function (ev) {
              ev.preventDefault();
              var name = el.querySelector('#ff-name').value.trim();
              if (!name) { ui.toast('Who is it for?', 'warning'); el.querySelector('#ff-name').focus(); return; }
              var m = MF.members.filter(function (x) { return x.name.toLowerCase().indexOf(name.toLowerCase()) >= 0 || x.id.toLowerCase() === name.toLowerCase(); })[0];
              var days = +el.querySelector('#ff-when').value;
              MF.followups.push({ id: 'F' + (fuNo++), kind: 'member', refId: m ? m.id : MF.members[0].id, name: m ? m.name : name, phone: m ? m.phone : '07700 900000',
                reason: el.querySelector('#ff-reason').value, due: MF.isoIn(days), dueIn: days, time: '16:00', owner: 's1', done: false, outcome: null });
              state.tab = days === 0 ? 'today' : 'upcoming';
              close(); repaint(true); ui.toast('Follow-up added for ' + fmt.first(m ? m.name : name) + '.', 'success');
            });
          } });
      });

      repaint(false);
      paintTemplates();
    }
  });
})();
