/* ==========================================================================
   MUSCLE FLEX — hash router + navigation map
   #/dashboard · #/members · #/members/MF1042 …  Back/forward just work
   because every navigation is a real hash change.
   ========================================================================== */
(function () {
  'use strict';
  var App = window.MFApp = window.MFApp || {};
  var MF = window.MF;

  /* Sidebar groups. `badge` returns a count (0 hides it). */
  App.nav = [
    { title: 'Today', items: [
      { path: 'dashboard', label: 'Overview', icon: 'dashboard', keywords: 'home dashboard kpi' },
      { path: 'checkins', label: 'Check-ins', icon: 'scan', keywords: 'door qr kiosk security' },
      { path: 'followups', label: 'Follow-ups', icon: 'phoneCall', keywords: 'calls tasks', badge: function () { return MF.followups.filter(function (f) { return !f.done && f.dueIn < 0; }).length; } }
    ] },
    { title: 'People', items: [
      { path: 'members', label: 'Members', icon: 'users', keywords: 'customers clients' },
      { path: 'leads', label: 'Leads', icon: 'target', keywords: 'enquiries kanban pipeline', badge: function () { return MF.leads.filter(function (l) { return l.stage === 'New'; }).length; } },
      { path: 'classes', label: 'Classes & PT', icon: 'calendar', keywords: 'timetable bookings trainer' }
    ] },
    { title: 'Money', items: [
      { path: 'memberships', label: 'Memberships', icon: 'ticket', keywords: 'plans passes promo' },
      { path: 'payments', label: 'Payments', icon: 'card', keywords: 'direct debit pos overdue', badge: function () { return MF.payments.filter(function (p) { return p.status === 'Failed' || p.status === 'Retry'; }).length; } },
      { path: 'reports', label: 'Reports', icon: 'chart', keywords: 'revenue churn retention' }
    ] },
    { title: 'Engage', items: [
      { path: 'messages', label: 'Messages', icon: 'message', keywords: 'whatsapp sms email automation' },
      { path: 'member-app', label: 'Member app', icon: 'smartphone', keywords: 'phone preview' }
    ] },
    { title: 'Team', items: [
      { path: 'staff', label: 'Staff & trainers', icon: 'badge', keywords: 'rota commission' },
      { path: 'settings', label: 'Settings', icon: 'settings', keywords: 'profile roles integrations accent' }
    ] }
  ];

  /* pattern → screen. `nav` = which sidebar item lights up. */
  var ROUTES = [
    { path: 'dashboard', screen: 'dashboard' },
    { path: 'checkins', screen: 'checkins' },
    { path: 'followups', screen: 'followups' },
    { path: 'members', screen: 'members' },
    { path: 'members/:id', screen: 'member', nav: 'members' },
    { path: 'leads', screen: 'leads' },
    { path: 'classes', screen: 'classes' },
    { path: 'memberships', screen: 'memberships' },
    { path: 'payments', screen: 'payments' },
    { path: 'reports', screen: 'reports' },
    { path: 'messages', screen: 'messages' },
    { path: 'member-app', screen: 'member-app' },
    { path: 'staff', screen: 'staff' },
    { path: 'settings', screen: 'settings' },
    { path: 'login', screen: 'login', bare: true }
  ];
  var DEFAULT = 'dashboard';

  /* Screen registry: MFApp.screen('members', { title, render(view, params) }) */
  var screens = {};
  var seen = {};        /* screens already visited → no skeleton second time */
  var cleanup = null;   /* returned by a screen's render(); run before the next screen */
  var renderToken = 0;  /* ignore a skeleton that finishes after the user moved on */
  App.screen = function (name, def) { screens[name] = def; };

  function match(path) {
    var parts = path.split('/').filter(Boolean);
    for (var i = 0; i < ROUTES.length; i++) {
      var r = ROUTES[i], rp = r.path.split('/'), params = {}, ok = rp.length === parts.length;
      for (var j = 0; ok && j < rp.length; j++) {
        if (rp[j].charAt(0) === ':') params[rp[j].slice(1)] = decodeURIComponent(parts[j]);
        else if (rp[j] !== parts[j]) ok = false;
      }
      if (ok) return { route: r, params: params };
    }
    return null;
  }

  function render() {
    var hash = location.hash.replace(/^#\/?/, '');
    if (!hash) { location.replace('#/' + DEFAULT); return; }
    var path = hash.split('?')[0], query = {};
    (hash.split('?')[1] || '').split('&').forEach(function (pair) {
      if (!pair) return;
      var kv = pair.split('=');
      query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    var view = document.getElementById('view');
    var ui = App.ui, m = match(path);

    ui.closeAll();
    ui.refreshBadges();
    renderToken++;               /* cancels any skeleton still waiting to paint */
    if (cleanup) { try { cleanup(); } catch (e) { /* ignore */ } cleanup = null; }
    view.innerHTML = '';
    window.scrollTo(0, 0);

    if (!m || !screens[m.route.screen]) {
      document.body.classList.remove('is-bare');
      ui.setActiveNav(null);
      document.title = 'Not found · Muscle Flex';
      view.innerHTML = '<section class="card">' + ui.state({
        icon: 'dumbbell', title: 'Nothing racked here',
        text: 'That page doesn\'t exist. Head back to the floor.',
        actions: '<a class="btn btn--primary" href="#/dashboard">Back to overview</a>'
      }) + '</section>';
      return;
    }

    var def = screens[m.route.screen];
    document.body.classList.toggle('is-bare', !!m.route.bare);
    ui.setActiveNav(m.route.bare ? null : (m.route.nav || m.route.path));
    document.title = (def.title || 'Muscle Flex') + ' · Muscle Flex';

    var token = ++renderToken;
    function paint() {
      if (token !== renderToken) return;
      paintScreen(def, view, m.params, query);
    }
    if (!seen[m.route.screen] && !m.route.bare) {
      seen[m.route.screen] = true;
      App.motion.skeleton(view, paint);
    } else {
      seen[m.route.screen] = true;
      paint();
    }
    view.focus({ preventScroll: true });
  }

  function paintScreen(def, view, params, query) {
    var ui = App.ui;
    try {
      var off = def.render(view, params, query || {});
      if (typeof off === 'function') cleanup = off;
      App.motion.pageIn(view);
      App.motion.countAll(view);
      App.motion.fills(view);
    } catch (err) {
      if (window.console) console.error(err);
      view.innerHTML = '<section class="card">' + ui.state({
        error: true, icon: 'alert', title: 'That didn\'t load',
        text: 'Something tripped on this screen. Nothing is lost — try again.',
        actions: '<button class="btn btn--primary" type="button" data-action="reload-view">Try again</button>' +
          '<a class="btn" href="#/dashboard">Back to overview</a>'
      }) + '</section>';
    }
  }

  App.router = {
    go: function (path) { location.hash = '#/' + String(path).replace(/^#?\/?/, ''); },
    refresh: render,
    current: function () { return location.hash.replace(/^#\/?/, ''); }
  };

  document.addEventListener('click', function (e) {
    if (e.target instanceof Element && e.target.closest('[data-action="reload-view"]')) render();
  });
  window.addEventListener('hashchange', render);
  document.addEventListener('DOMContentLoaded', render);
})();
