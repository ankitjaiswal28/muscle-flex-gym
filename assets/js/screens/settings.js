/* ==========================================================================
   Settings — gym profile, plans, roles & permissions, integrations and
   appearance (live accent picker + light / dark).   #/settings?tab=appearance
   ========================================================================== */
(function () {
  'use strict';
  var App = window.MFApp, MF = window.MF, ui = App.ui, fmt = App.fmt, icon = App.icon, charts = App.charts, motion = App.motion;
  var esc = fmt.esc, state = { tab: 'profile' };
  var TABS = [['profile', 'Gym profile', 'dumbbell'], ['plans', 'Plans', 'ticket'], ['roles', 'Roles & permissions', 'shield'], ['integrations', 'Integrations', 'refresh'], ['appearance', 'Appearance', 'sun']];

  var ROLES = ['Owner', 'Manager', 'Coach', 'Front desk'];
  var PERMS = [
    ['See revenue and reports', [1, 1, 0, 0]], ['Take payments', [1, 1, 0, 1]], ['Refund a payment', [1, 1, 0, 0]], ['Add and edit members', [1, 1, 1, 1]],
    ['Freeze or cancel memberships', [1, 1, 0, 1]], ['Open the door remotely', [1, 1, 0, 1]], ['Edit the rota', [1, 1, 0, 0]], ['Send broadcasts', [1, 1, 0, 0]], ['Change settings', [1, 0, 0, 0]]
  ];
  var INTEGRATIONS = [
    { name: 'WhatsApp Business', what: 'Reminders, renewals and replies from the gym number', on: true, icon: 'message' },
    { name: 'Direct Debit collections', what: 'Monthly memberships collected automatically', on: true, icon: 'card' },
    { name: 'Door controller', what: 'QR and fob entry, 05:00–22:00', on: true, icon: 'lock' },
    { name: 'Instagram leads', what: 'Enquiries from your profile land on the lead board', on: true, icon: 'target' },
    { name: 'Google reviews', what: 'Ask happy members for a review after 30 days', on: false, icon: 'checkCircle' },
    { name: 'Accounting export', what: 'Send the month\'s takings to your accountant', on: false, icon: 'chart' },
    { name: 'CCTV', what: 'Camera tiles in the unstaffed-hours view', on: true, icon: 'shield' }
  ];
  var SWATCHES = [['Lime', '#D2FF3F'], ['Iron red', '#E10600'], ['Orange', '#FF7A1A'], ['Gold', '#F5C518'], ['Sky', '#38BDF8'], ['Violet', '#8B5CF6'], ['Mint', '#2DD4BF'], ['Chalk', '#F4F4F5']];

  function field(id, label, value, type, hint) {
    return '<div class="field"><label for="' + id + '">' + label + '</label><input class="input" id="' + id + '" type="' + (type || 'text') + '" value="' + esc(value) + '" autocomplete="off">' + (hint ? '<small>' + hint + '</small>' : '') + '</div>';
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hourSelect(id, label, sel) {
    var o = '';
    for (var h = 5; h <= 22; h++) o += '<option value="' + h + '"' + (h === sel ? ' selected' : '') + '>' + pad(h) + ':00</option>';
    return '<div class="field"><label for="' + id + '">' + label + '</label><select class="select" id="' + id + '">' + o + '</select></div>';
  }

  var PANELS = {
    profile: function () {
      var g = MF.gym;
      return '<div class="card__head"><div><h2>Gym profile</h2><p>What members and the team see</p></div></div>' +
        '<form class="stack" id="set-profile" novalidate><div class="grid grid--2">' + field('sp-name', 'Gym name', g.name) + field('sp-phone', 'Phone', g.phone, 'tel') + '</div>' +
        field('sp-addr', 'Address', g.address) + '<div class="grid grid--2">' + field('sp-email', 'Email', g.email, 'email') + field('sp-cap', 'Floor capacity', g.capacity, 'number', 'Used by the busy-now meter.') + '</div>' +
        field('sp-target', 'Monthly revenue target (₹)', g.monthTarget, 'number', 'Drives the target ring on the overview.') +
        '<h3 style="margin-top:var(--s-2)">Staffed hours</h3><p class="muted" style="margin-top:-8px">Doors are open 05:00–22:00 every day. Outside staffed hours, entry is by QR and the security view is on.</p>' +
        '<div class="grid grid--4">' + hourSelect('sp-wd-from', 'Weekdays from', g.staffed.weekday.from) + hourSelect('sp-wd-to', 'Weekdays to', g.staffed.weekday.to) + hourSelect('sp-we-from', 'Weekends from', g.staffed.weekend.from) + hourSelect('sp-we-to', 'Weekends to', g.staffed.weekend.to) + '</div>' +
        '<div class="row"><button class="btn btn--primary" type="submit">Save profile</button><button class="btn btn--ghost" type="button" data-action="reload-view">Discard changes</button></div></form>';
    },
    plans: function () {
      return '<div class="card__head"><div><h2>Plans</h2><p>Prices members pay. No contracts, no hidden fees.</p></div><a class="btn btn--sm btn--primary" href="#/memberships">Manage plans' + icon('chevronRight', 'icon--sm') + '</a></div>' +
        '<ul class="alist setlist">' + MF.plans.map(function (p) {
          var n = MF.activeMembers().filter(function (m) { return m.plan === p.id; }).length;
          return '<li class="arow"><span class="avatar avatar--icon">' + icon('ticket') + '</span><span class="grow"><strong>' + esc(p.name) + '</strong><small>' + esc(p.blurb) + '</small></span>' +
            '<span class="chip chip--plain">' + n + ' member' + (n === 1 ? '' : 's') + '</span><strong class="nowrap">' + fmt.money(p.price) + ' <span class="faint" style="font-weight:400">/ ' + p.period + '</span></strong></li>';
        }).join('') + '</ul>';
    },
    roles: function () {
      return '<div class="card__head"><div><h2>Roles &amp; permissions</h2><p>Who can do what. The owner can do everything.</p></div></div>' +
        '<div class="table-wrap setbleed"><table class="table perms"><thead><tr><th>Permission</th>' + ROLES.map(function (r) { return '<th class="perms__h">' + r + '</th>'; }).join('') + '</tr></thead><tbody>' +
        PERMS.map(function (p, i) {
          return '<tr><td>' + p[0] + '</td>' + ROLES.map(function (r, j) {
            return '<td class="perms__c"><input class="check" type="checkbox" data-perm="' + i + ':' + j + '"' + (p[1][j] ? ' checked' : '') + (j === 0 ? ' disabled' : '') + ' aria-label="' + esc(r + ' can: ' + p[0]) + '"></td>';
          }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>';
    },
    integrations: function () {
      return '<div class="card__head"><div><h2>Integrations</h2><p>The tools Muscle Flex already uses, joined up</p></div></div>' +
        '<ul class="alist setlist">' + INTEGRATIONS.map(function (x, i) {
          return '<li class="arow"><span class="avatar avatar--icon">' + icon(x.icon) + '</span><span class="grow"><strong>' + esc(x.name) + '</strong><small>' + esc(x.what) + '</small></span>' +
            '<span class="chip ' + (x.on ? 'chip--success' : '') + '">' + (x.on ? 'Connected' : 'Not connected') + '</span>' +
            '<button class="btn btn--sm' + (x.on ? '' : ' btn--primary') + '" type="button" data-int="' + i + '">' + (x.on ? 'Disconnect' : 'Connect') + '</button></li>';
        }).join('') + '</ul>';
    },
    appearance: function () {
      var cur = ui.currentAccent(), light = document.documentElement.getAttribute('data-theme') === 'light';
      return '<div class="card__head"><div><h2>Appearance</h2><p>Make it yours. Changes show everywhere, straight away.</p></div></div>' +
        '<div class="stack stack--lg"><div><p class="label" id="l-accent" style="margin-bottom:var(--s-2)">Brand colour</p>' +
          '<div class="swatchrow" role="radiogroup" aria-labelledby="l-accent" id="set-swatches">' + SWATCHES.map(function (s) {
            return '<button class="swatchbtn" type="button" role="radio" aria-checked="' + (cur === s[1]) + '" data-accent="' + s[1] + '" style="--sw:' + s[1] + '" aria-label="' + s[0] + '" data-tip="' + s[0] + '"><span></span></button>';
          }).join('') + '<label class="swatchbtn swatchbtn--custom" data-tip="Pick any colour"><input type="color" id="set-color" value="' + (/^#[0-9A-F]{6}$/.test(cur) ? cur : '#D2FF3F') + '" aria-label="Custom brand colour">' + icon('plus', 'icon--sm') + '</label></div>' +
          '<p class="faint" style="margin-top:var(--s-2);font-size:var(--fs-13)">Now: <code class="code" id="set-hex">' + cur + '</code> · <button class="link" type="button" id="set-reset">Reset to lime</button></p></div>' +
        '<div><p class="label" id="l-theme" style="margin-bottom:var(--s-2)">Theme</p><div class="seg" role="radiogroup" aria-labelledby="l-theme" id="set-theme">' +
          '<button class="seg__btn" type="button" role="radio" aria-checked="' + !light + '" data-theme-pick="dark">' + icon('moon', 'icon--sm') + 'Dark</button>' +
          '<button class="seg__btn" type="button" role="radio" aria-checked="' + light + '" data-theme-pick="light">' + icon('sun', 'icon--sm') + 'Light</button></div></div>' +
        '<div><p class="label" style="margin-bottom:var(--s-2)">Preview</p><div class="preview"><div class="row row--wrap"><button class="btn btn--primary" type="button" data-toast="That\'s your brand colour.">Primary button</button>' +
          '<span class="chip chip--accent">Most popular</span><span class="chip chip--success">Paid</span><span class="chip chip--warning">Pending</span><span class="chip chip--danger">Failed</span>' + ui.switchHtml(true, 'Sample switch', 'data-sample') + '</div>' +
          '<div class="row" style="margin-top:var(--s-4)"><div class="ringbox ringbox--sm">' + charts.ring(.64, 132, 14, 'Sample progress ring') + '<div class="ringbox__val"><span class="figure" style="font-size:var(--fs-24)">64%</span></div></div>' +
          '<div class="grow"><p class="muted">Charts, rings, the live gauge, heatmaps and the sidebar marker all follow this one colour. Status colours stay green, amber and red so "failed" never looks like "good".</p>' +
          '<span class="meter meter--lg"><i style="transform:scaleX(.64)"></i></span></div></div></div></div></div>';
    }
  };

  App.screen('settings', {
    title: 'Settings',
    render: function (view, params, query) {
      if (query.tab && PANELS[query.tab]) state.tab = query.tab;
      view.innerHTML = ui.pageHead('Settings', 'Your gym, your rules.') +
        '<div class="settings"><nav class="settings__nav" aria-label="Settings sections" id="set-nav"></nav><section class="card settings__panel" id="set-panel"></section></div>';
      var $ = function (id) { return view.querySelector('#' + id); }, panel = $('set-panel');

      function paintNav() {
        $('set-nav').innerHTML = TABS.map(function (t) { return '<button class="settings__tab" type="button" data-tab="' + t[0] + '"' + (state.tab === t[0] ? ' aria-current="page"' : '') + '>' + icon(t[2]) + '<span>' + t[1] + '</span></button>'; }).join('');
      }
      function paintPanel(animate) { panel.innerHTML = PANELS[state.tab](); if (animate) motion.contentIn(panel); }

      $('set-nav').addEventListener('click', function (e) {
        var b = e.target.closest('[data-tab]');
        if (!b) return;
        state.tab = b.getAttribute('data-tab'); paintNav(); paintPanel(true);
        $('set-nav').querySelector('[aria-current]').focus();
      });
      panel.addEventListener('submit', function (e) {
        if (e.target.id !== 'set-profile') return;
        e.preventDefault();
        var v = function (id) { return panel.querySelector('#' + id).value.trim(); }, g = MF.gym, cap = parseInt(v('sp-cap'), 10), target = parseInt(v('sp-target'), 10);
        if (!v('sp-name') || !(cap > 0) || !(target > 0)) { ui.toast('Name, capacity and target all need a value.', 'warning'); return; }
        if (+v('sp-wd-to') <= +v('sp-wd-from') || +v('sp-we-to') <= +v('sp-we-from')) { ui.toast('Staffed hours need to finish after they start.', 'warning'); return; }
        g.name = v('sp-name'); g.phone = v('sp-phone'); g.address = v('sp-addr'); g.email = v('sp-email');
        g.capacity = cap; MF.live.capacity = cap; MF.live.onFloor = Math.min(MF.live.onFloor, cap);
        g.monthTarget = target; MF.revenue.target = target; MF.revenue.months[MF.revenue.months.length - 1].target = target;
        g.staffed.weekday = { from: +v('sp-wd-from'), to: +v('sp-wd-to') }; g.staffed.weekend = { from: +v('sp-we-from'), to: +v('sp-we-to') };
        ui.refreshStatus();
        ui.toast('Profile saved. The overview and rota now use these numbers.', 'success');
      });
      panel.addEventListener('change', function (e) {
        var t = e.target;
        if (t.getAttribute('data-perm')) {
          var bits = t.getAttribute('data-perm').split(':');
          PERMS[+bits[0]][1][+bits[1]] = t.checked ? 1 : 0;
          ui.toast(ROLES[+bits[1]] + ' ' + (t.checked ? 'can now' : 'can no longer') + ': ' + PERMS[+bits[0]][0].toLowerCase() + '.', t.checked ? 'success' : 'info');
        }
        if (t.id === 'set-color') pickAccent(t.value.toUpperCase());
      });
      panel.addEventListener('input', function (e) { if (e.target.id === 'set-color') pickAccent(e.target.value.toUpperCase(), true); });
      function pickAccent(hex, quiet) {
        ui.setAccent(hex);
        var hx = panel.querySelector('#set-hex');
        if (hx) hx.textContent = hex || ui.currentAccent();
        [].forEach.call(panel.querySelectorAll('[data-accent]'), function (b) { b.setAttribute('aria-checked', b.getAttribute('data-accent') === (hex || '#D2FF3F')); });
        if (!quiet) ui.toast(hex ? 'Brand colour set to ' + hex + '.' : 'Back to lime.', 'success');
      }
      panel.addEventListener('click', function (e) {
        var b;
        if ((b = e.target.closest('[data-accent]'))) { pickAccent(b.getAttribute('data-accent')); return; }
        if (e.target.closest('#set-reset')) { pickAccent(null); var c = panel.querySelector('#set-color'); if (c) c.value = '#D2FF3F'; return; }
        if ((b = e.target.closest('[data-theme-pick]'))) {
          var want = b.getAttribute('data-theme-pick'), light = document.documentElement.getAttribute('data-theme') === 'light';
          if ((want === 'light') !== light) ui.toggleTheme();
          paintPanel(false);
          return;
        }
        if ((b = e.target.closest('[data-sample]'))) { b.setAttribute('aria-checked', b.getAttribute('aria-checked') !== 'true'); return; }
        if ((b = e.target.closest('[data-int]'))) {
          var x = INTEGRATIONS[+b.getAttribute('data-int')];
          x.on = !x.on; paintPanel(false);
          ui.toast(x.name + (x.on ? ' connected.' : ' disconnected.') + ' Demo only.', x.on ? 'success' : 'info');
        }
      });

      paintNav(); paintPanel(false);
    }
  });
})();
