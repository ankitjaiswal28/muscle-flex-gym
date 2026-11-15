/* ==========================================================================
   Members — search, status chips, filters, sortable columns, churn-risk on
   every row, bulk select with a floating action bar, pagination, fake export.
   Deep links: #/members?status=expiring · ?sort=risk · ?sort=lastVisit
   ========================================================================== */
(function () {
  'use strict';
  var App = window.MFApp, MF = window.MF, ui = App.ui, fmt = App.fmt, icon = App.icon, motion = App.motion;
  var esc = fmt.esc, PER_PAGE = 12;

  /* View state lives for the session, so Back returns to the same list */
  var state = { q: '', status: 'all', plan: 'all', risk: 'all', sort: 'name', dir: 1, page: 1, selected: {} };

  var STATUSES = [['all', 'All'], ['active', 'Active'], ['expiring', 'Expiring'], ['overdue', 'Overdue'], ['frozen', 'Frozen'], ['expired', 'Expired']];
  var SORTS = {
    name: function (a, b) { return a.name.localeCompare(b.name); },
    plan: function (a, b) { return MF.planById[a.plan].name.localeCompare(MF.planById[b.plan].name); },
    status: function (a, b) { return a.status.localeCompare(b.status); },
    expires: function (a, b) { return a.expires.localeCompare(b.expires); },
    lastVisit: function (a, b) { return b.daysSinceVisit - a.daysSinceVisit; },
    visits: function (a, b) { return b.visits30 - a.visits30; },
    risk: function (a, b) { return b.churnRisk - a.churnRisk; },
    joined: function (a, b) { return b.joined.localeCompare(a.joined); }
  };
  var HIGH_FIRST = { lastVisit: 1, visits: 1, risk: 1, joined: 1 };   /* these sort biggest-first by default */
  var COLS = [['name', 'Member'], ['plan', 'Plan'], ['status', 'Status'], ['expires', 'Expires'], ['lastVisit', 'Last visit'], ['visits', '30 days'], ['risk', 'Churn risk']];

  function matches(m, skipStatus) {
    if (!skipStatus && state.status !== 'all' && m.status !== state.status) return false;
    if (state.plan !== 'all' && m.plan !== state.plan) return false;
    if (state.risk !== 'all' && ui.riskLevel(m.churnRisk).toLowerCase() !== state.risk) return false;
    if (state.q) {
      var q = state.q.toLowerCase();
      if ((m.name + ' ' + m.id + ' ' + m.phone + ' ' + m.email).toLowerCase().indexOf(q) < 0) return false;
    }
    return true;
  }
  function rows() {
    return MF.members.filter(function (m) { return matches(m); }).sort(function (a, b) { return SORTS[state.sort](a, b) * state.dir || a.name.localeCompare(b.name); });
  }
  function selectedIds() { return Object.keys(state.selected).filter(function (k) { return state.selected[k]; }); }

  function rowHtml(m) {
    var lvl = ui.riskLevel(m.churnRisk), d = fmt.daysUntil(m.expires), on = !!state.selected[m.id];
    return '<tr data-id="' + m.id + '"' + (on ? ' class="is-selected"' : '') + '>' +
      '<td class="t-check"><input class="check" type="checkbox" data-sel="' + m.id + '"' + (on ? ' checked' : '') + ' aria-label="Select ' + esc(m.name) + '"></td>' +
      '<td><a class="who" href="#/members/' + m.id + '"><span class="avatar avatar--sm">' + esc(m.initials) + '</span><span><strong>' + esc(m.name) + '</strong><small>' + m.id + '</small></span></a></td>' +
      '<td class="c-plan">' + esc(MF.planById[m.plan].name) + '</td>' +
      '<td>' + ui.chip(m.status) + '</td>' +
      '<td class="c-exp">' + fmt.dateShort(m.expires) + '<small class="' + (d < 0 ? 'danger-text' : d <= 7 ? 'warning-text' : 'faint') + '">' + ui.inText(d) + '</small></td>' +
      '<td class="c-last">' + ui.agoText(m.daysSinceVisit) + '</td>' +
      '<td class="c-vis t-right">' + m.visits30 + '</td>' +
      '<td class="c-risk"><span class="riskcell"><span class="meter' + (lvl === 'High' ? ' meter--danger' : ' meter--quiet') + '" aria-hidden="true"><i style="transform:scaleX(' + m.churnRisk / 100 + ')"></i></span>' +
        '<strong class="' + (lvl === 'High' ? 'danger-text' : '') + '">' + m.churnRisk + '%</strong><small class="faint">' + lvl + '</small></span></td>' +
      '<td class="t-acts"><button class="icon-btn" type="button" data-wa="' + m.id + '" aria-label="WhatsApp ' + esc(m.name) + '" data-tip="WhatsApp">' + icon('message') + '</button>' +
        '<a class="icon-btn" href="#/members/' + m.id + '" aria-label="Open ' + esc(m.name) + '">' + icon('chevronRight') + '</a></td></tr>';
  }

  App.screen('members', {
    title: 'Members',
    render: function (view, params, query) {
      if (query.status && STATUSES.some(function (s) { return s[0] === query.status; })) { state.status = query.status; state.page = 1; }
      if (query.sort && SORTS[query.sort]) { state.sort = query.sort; state.dir = 1; state.page = 1; }

      view.innerHTML =
        ui.pageHead('Members', 'Everyone who trains here. Find anyone in two keystrokes.',
          '<button class="btn" type="button" id="m-export">' + icon('download', 'icon--sm') + 'Export</button>' +
          '<button class="btn btn--primary" type="button" data-action="quick:member">' + icon('plus', 'icon--sm') + 'New member</button>') +
        '<section class="card card--flush">' +
          '<div class="fchips" id="m-status" role="group" aria-label="Filter by status"></div>' +
          '<div class="toolbar">' +
            '<label class="searchbox">' + icon('search', 'icon--sm') + '<span class="sr-only">Search members</span>' +
              '<input type="search" id="m-q" placeholder="Name, ID or phone" value="' + esc(state.q) + '" autocomplete="off"></label>' +
            '<label class="sr-only" for="m-plan">Plan</label><select class="select" id="m-plan"><option value="all">All plans</option>' +
              MF.plans.map(function (p) { return '<option value="' + p.id + '"' + (state.plan === p.id ? ' selected' : '') + '>' + p.name + '</option>'; }).join('') + '</select>' +
            '<label class="sr-only" for="m-risk">Churn risk</label><select class="select" id="m-risk">' +
              [['all', 'Any risk'], ['high', 'High risk'], ['medium', 'Medium risk'], ['low', 'Low risk']].map(function (o) { return '<option value="' + o[0] + '"' + (state.risk === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
            '<label class="sr-only" for="m-sort">Sort by</label><select class="select" id="m-sort">' +
              [['name', 'Sort: Name'], ['risk', 'Sort: Churn risk'], ['expires', 'Sort: Expiry'], ['lastVisit', 'Sort: Longest away'], ['visits', 'Sort: Most visits'], ['joined', 'Sort: Newest']].map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('') + '</select>' +
            '<button class="btn btn--ghost" type="button" id="m-clear" hidden>Clear filters</button>' +
          '</div>' +
          '<div class="table-wrap"><table class="table members">' +
            '<thead><tr><th class="t-check"><input class="check" type="checkbox" id="m-all" aria-label="Select everyone on this page"></th>' +
            COLS.map(function (c) { return '<th class="c-' + ({ name: 'name', plan: 'plan', status: 'status', expires: 'exp', lastVisit: 'last', visits: 'vis', risk: 'risk' })[c[0]] + (c[0] === 'visits' ? ' t-right' : '') + '"><button class="th-sort" type="button" data-sort="' + c[0] + '">' + c[1] + '<span class="th-sort__arrow" aria-hidden="true"></span></button></th>'; }).join('') +
            '<th class="t-acts"><span class="sr-only">Actions</span></th></tr></thead><tbody id="m-body"></tbody></table></div>' +
          '<div id="m-empty" hidden></div>' +
          '<div class="pager" id="m-pager"></div>' +
        '</section>' +
        '<div class="bulkbar" id="m-bulk" hidden role="region" aria-label="Bulk actions"></div>';

      var $ = function (id) { return view.querySelector('#' + id); };
      var body = $('m-body'), pager = $('m-pager'), bulk = $('m-bulk'), empty = $('m-empty'), table = view.querySelector('.table-wrap');
      var pageRows = [];

      function update(animate) {
        var all = rows(), pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
        if (state.page > pages) state.page = pages;
        pageRows = all.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);

        /* status chips with live counts (counts respect the other filters) */
        $('m-status').innerHTML = STATUSES.map(function (s) {
          var n = MF.members.filter(function (m) { return matches(m, true) && (s[0] === 'all' || m.status === s[0]); }).length;
          return '<button class="fchip" type="button" data-status="' + s[0] + '" aria-pressed="' + (state.status === s[0]) + '">' + s[1] + '<span>' + n + '</span></button>';
        }).join('');

        body.innerHTML = pageRows.map(rowHtml).join('');
        table.hidden = !all.length;
        empty.hidden = !!all.length;
        if (!all.length) {
          empty.innerHTML = ui.state({ icon: 'users', title: 'No one matches', text: 'Nobody fits those filters. Loosen them up.',
            actions: '<button class="btn btn--primary" type="button" id="m-clear2">Clear filters</button>' });
          empty.querySelector('#m-clear2').addEventListener('click', clearFilters);
        }

        /* sort arrows */
        var ths = view.querySelectorAll('.th-sort');
        for (var i = 0; i < ths.length; i++) {
          var on = ths[i].getAttribute('data-sort') === state.sort;
          var desc = (state.dir === 1) === !!HIGH_FIRST[state.sort];
          ths[i].parentNode.setAttribute('aria-sort', on ? (desc ? 'descending' : 'ascending') : 'none');
          ths[i].classList.toggle('is-on', on);
          ths[i].classList.toggle('is-desc', on && desc);
        }
        $('m-sort').value = SORTS[state.sort] && $('m-sort').querySelector('option[value="' + state.sort + '"]') ? state.sort : 'name';

        /* pager */
        var from = all.length ? (state.page - 1) * PER_PAGE + 1 : 0, to = Math.min(all.length, state.page * PER_PAGE), nums = '', gap = false;
        for (var p = 1; p <= pages; p++) {
          if (pages > 7 && p > 2 && p < pages - 1 && Math.abs(p - state.page) > 1) { if (!gap) { nums += '<span class="pager__gap">…</span>'; gap = true; } continue; }
          gap = false;
          nums += '<button class="pager__n" type="button" data-page="' + p + '"' + (p === state.page ? ' aria-current="page"' : '') + '>' + p + '</button>';
        }
        pager.innerHTML = '<span class="faint">' + (all.length ? from + '–' + to + ' of ' + all.length : '0 members') + '</span>' +
          '<div class="pager__ctl"><button class="btn btn--sm" type="button" data-page="' + (state.page - 1) + '"' + (state.page <= 1 ? ' disabled' : '') + '>Previous</button>' +
          '<span class="pager__nums">' + nums + '</span>' +
          '<button class="btn btn--sm" type="button" data-page="' + (state.page + 1) + '"' + (state.page >= pages ? ' disabled' : '') + '>Next</button></div>';
        pager.hidden = !all.length;

        var filtered = state.q || state.status !== 'all' || state.plan !== 'all' || state.risk !== 'all';
        $('m-clear').hidden = !filtered;
        updateBulk();
        if (animate) motion.contentIn(body);
      }

      function updateBulk() {
        var ids = selectedIds(), was = bulk.hidden;
        var allOn = pageRows.length && pageRows.every(function (m) { return state.selected[m.id]; });
        var some = pageRows.some(function (m) { return state.selected[m.id]; });
        $('m-all').checked = !!allOn;
        $('m-all').indeterminate = !allOn && some;
        bulk.hidden = !ids.length;
        if (!ids.length) return;
        bulk.innerHTML = '<strong>' + ids.length + ' selected</strong>' +
          '<button class="btn btn--sm btn--primary" type="button" data-bulk="wa">' + icon('message', 'icon--sm') + 'WhatsApp</button>' +
          '<button class="btn btn--sm" type="button" data-bulk="renew">Renewal reminder</button>' +
          '<button class="btn btn--sm" type="button" data-bulk="freeze">Freeze</button>' +
          '<button class="btn btn--sm" type="button" data-bulk="export">' + icon('download', 'icon--sm') + 'Export</button>' +
          '<button class="icon-btn" type="button" data-bulk="clear" aria-label="Clear selection">' + icon('x') + '</button>';
        if (was) motion.play(bulk, [{ opacity: 0, transform: 'translate(-50%, 16px)' }, { opacity: 1, transform: 'translate(-50%, 0)' }], { duration: 220, easing: motion.ease.out });
      }
      function clearFilters() {
        state.q = ''; state.status = 'all'; state.plan = 'all'; state.risk = 'all'; state.page = 1;
        $('m-q').value = ''; $('m-plan').value = 'all'; $('m-risk').value = 'all';
        update(true);
      }
      function people(n) { return n + ' member' + (n === 1 ? '' : 's'); }

      /* ---- events ---- */
      $('m-q').addEventListener('input', function (e) { state.q = e.target.value.trim(); state.page = 1; update(); });
      $('m-plan').addEventListener('change', function (e) { state.plan = e.target.value; state.page = 1; update(true); });
      $('m-risk').addEventListener('change', function (e) { state.risk = e.target.value; state.page = 1; update(true); });
      $('m-sort').addEventListener('change', function (e) { state.sort = e.target.value; state.dir = 1; state.page = 1; update(true); });
      $('m-clear').addEventListener('click', clearFilters);
      $('m-status').addEventListener('click', function (e) {
        var b = e.target.closest('[data-status]');
        if (!b) return;
        state.status = b.getAttribute('data-status'); state.page = 1; update(true);
        view.querySelector('.fchip[aria-pressed="true"]').focus();
      });
      view.querySelector('thead').addEventListener('click', function (e) {
        var b = e.target.closest('[data-sort]');
        if (!b) return;
        var k = b.getAttribute('data-sort');
        if (state.sort === k) state.dir = -state.dir; else { state.sort = k; state.dir = 1; }
        state.page = 1; update(true);
      });
      $('m-all').addEventListener('change', function (e) {
        pageRows.forEach(function (m) { state.selected[m.id] = e.target.checked; });
        update();
      });
      body.addEventListener('change', function (e) {
        var id = e.target.getAttribute('data-sel');
        if (!id) return;
        state.selected[id] = e.target.checked;
        e.target.closest('tr').classList.toggle('is-selected', e.target.checked);
        updateBulk();
      });
      body.addEventListener('click', function (e) {
        var wa = e.target.closest('[data-wa]');
        if (wa) {
          var m = MF.memberById[wa.getAttribute('data-wa')];
          ui.whatsapp({ name: m.name, phone: m.phone, message: ui.fillTemplate(m.status === 'expiring' ? 't2' : m.dd === 'Failed' || m.dd === 'Retry' ? 't4' : 't3', m) });
          return;
        }
        if (e.target.closest('a, button, input, .t-check')) return;
        var tr = e.target.closest('tr');
        if (tr) location.hash = '#/members/' + tr.getAttribute('data-id');     /* whole row opens the profile */
      });
      pager.addEventListener('click', function (e) {
        var b = e.target.closest('[data-page]');
        if (!b || b.disabled) return;
        state.page = +b.getAttribute('data-page'); update(true);
        view.querySelector('.card').scrollIntoView({ block: 'start' });
      });
      $('m-export').addEventListener('click', function () { ui.toast('Exported ' + people(rows().length) + ' to muscle-flex-members.csv.', 'success'); });
      bulk.addEventListener('click', function (e) {
        var b = e.target.closest('[data-bulk]');
        if (!b) return;
        var ids = selectedIds(), kind = b.getAttribute('data-bulk');
        function done(msg, type) { state.selected = {}; update(); ui.toast(msg, type || 'success'); }
        if (kind === 'clear') { state.selected = {}; update(); }
        else if (kind === 'wa') done('WhatsApp sent to ' + people(ids.length) + '.');
        else if (kind === 'renew') done('Renewal reminder sent to ' + people(ids.length) + '.');
        else if (kind === 'export') done('Exported ' + people(ids.length) + ' to muscle-flex-members.csv.');
        else if (kind === 'freeze') {
          ui.modal({
            title: 'Freeze ' + people(ids.length) + '?', subtitle: 'Access pauses today. ₹300 a month holding fee. Unfreeze any time.',
            body: '<p class="muted">They each get a WhatsApp confirming the freeze and how to come back.</p>',
            footer: '<button class="btn btn--ghost" type="button" data-close>Not now</button><button class="btn btn--primary" type="button" id="freeze-go">Freeze</button>',
            onOpen: function (el, close) {
              el.querySelector('#freeze-go').addEventListener('click', function () {
                ids.forEach(function (id) { var m = MF.memberById[id]; if (m.status !== 'expired') { m.status = 'frozen'; m.dd = m.dd === 'n/a' ? 'n/a' : 'Paused'; } });
                close();
                done(people(ids.length) + ' frozen.', 'info');
              });
            }
          });
        }
      });

      update();
    }
  });
})();
