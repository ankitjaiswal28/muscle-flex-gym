/* ==========================================================================
   Payments — Direct Debit status (Paid / Pending / Failed / Retry), overdue
   with one-click retry + reminders, desk (POS) sales with a working basket,
   receipt drawer on every row.     Deep link: #/payments?tab=overdue|desk
   ========================================================================== */
(function () {
  'use strict';
  var App = window.MFApp, MF = window.MF, ui = App.ui, fmt = App.fmt, icon = App.icon, motion = App.motion;
  var esc = fmt.esc, PER = 10;
  var state = { tab: 'dd', q: '', status: 'all', page: 1, cat: 'All', basket: {}, payNo: 90001 };
  var DD_ORDER = ['Paid', 'Pending', 'Retry', 'Failed'];

  function isDD(p) { return p.type === 'Direct Debit'; }
  function isOwed(p) { return p.status === 'Failed' || p.status === 'Retry'; }
  function isDesk(p) { return p.type === 'POS' || p.type === 'Pass'; }
  function who(p) { var m = p.memberId && MF.memberById[p.memberId]; return m ? m.name : (p.guest || 'Guest'); }
  function sum(list) { return list.reduce(function (s, p) { return s + p.amount; }, 0); }
  function rowsFor(tab) {
    return MF.payments.filter(function (p) {
      if (tab === 'dd' && !isDD(p)) return false;
      if (tab === 'overdue' && !isOwed(p)) return false;
      if (tab === 'desk' && !isDesk(p)) return false;
      return true;
    });
  }
  function filtered() {
    return rowsFor(state.tab).filter(function (p) {
      if (state.status !== 'all' && p.status !== state.status) return false;
      if (state.q && (who(p) + ' ' + p.id + ' ' + p.item + ' ' + (p.memberId || '')).toLowerCase().indexOf(state.q.toLowerCase()) < 0) return false;
      return true;
    });
  }
  function payRow(p) {
    var m = p.memberId && MF.memberById[p.memberId], name = who(p), ix = MF.payments.indexOf(p);
    return '<tr class="is-click" data-pay="' + ix + '"><td class="c-date">' + fmt.dateShort(p.date) + '<small class="faint">' + p.time + '</small></td>' +
      '<td><span class="who"><span class="avatar avatar--sm">' + esc(m ? m.initials : name.split(' ').map(function (x) { return x[0]; }).join('').slice(0, 2)) + '</span><span><strong>' + esc(name) + '</strong><small>' + (m ? m.id : 'Guest') + '</small></span></span></td>' +
      '<td class="c-plan">' + esc(p.item) + '</td><td class="c-exp muted">' + p.type + '</td><td>' + ui.chip(p.status) + '</td>' +
      '<td class="t-right"><strong>' + fmt.money(p.amount) + '</strong></td>' +
      '<td class="t-acts">' + (isOwed(p)
        ? '<button class="icon-btn" type="button" data-wa="' + ix + '" aria-label="Send payment reminder to ' + esc(name) + '" data-tip="Remind on WhatsApp">' + icon('message') + '</button><button class="btn btn--sm" type="button" data-retry="' + ix + '">Retry</button>'
        : '<button class="icon-btn" type="button" aria-label="Open receipt ' + p.id + '">' + icon('chevronRight') + '</button>') + '</td></tr>';
  }

  App.screen('payments', {
    title: 'Payments',
    render: function (view, params, query) {
      if (query.tab && ['dd', 'overdue', 'desk', 'all'].indexOf(query.tab) >= 0) { state.tab = query.tab; state.page = 1; state.status = 'all'; }

      view.innerHTML =
        ui.pageHead('Payments', 'Direct Debits, desk sales and what\'s still owed.',
          '<button class="btn" type="button" id="py-export">' + icon('download', 'icon--sm') + 'Export</button>' +
          '<button class="btn btn--primary" type="button" id="py-take">' + icon('plus', 'icon--sm') + 'Take payment</button>') +
        '<div class="grid grid--4" id="py-kpis" style="margin-bottom:var(--s-4)"></div>' +
        '<section class="card" style="margin-bottom:var(--s-4)" aria-labelledby="h-dd"><div class="card__head"><div><h2 id="h-dd">Direct Debits this month</h2><p>Tap a status to filter the list below</p></div><span class="faint" id="py-ddsum"></span></div>' +
          '<div class="ddbar" id="py-ddbar" role="img"></div><div class="ddlegend" id="py-ddlegend"></div></section>' +
        '<section class="card card--flush"><div class="tabs" role="tablist" aria-label="Payments" id="py-tabs"></div><div id="py-panel" role="tabpanel"></div></section>';

      var $ = function (id) { return view.querySelector('#' + id); }, panel = $('py-panel');

      /* ------------------------------------------------------ painters --- */
      function paintTop(first) {
        var dd = rowsFor('dd'), paid = dd.filter(function (p) { return p.status === 'Paid'; }), owed = rowsFor('overdue');
        var desk = rowsFor('desk').filter(function (p) { return p.date === MF.todayIso; });
        var cards = [
          ['Collected this month', MF.revenue.mtd, 'money', 'of ' + fmt.money(MF.revenue.target) + ' target'],
          ['Direct Debits paid', Math.round(paid.length / (dd.length || 1) * 100), 'pct', paid.length + ' of ' + dd.length + ' collected'],
          ['Overdue', sum(owed), 'money', owed.length + ' payment' + (owed.length === 1 ? '' : 's') + ' to chase'],
          ['Desk sales today', sum(desk), 'money', desk.length + ' sale' + (desk.length === 1 ? '' : 's') + ' at the desk']
        ];
        $('py-kpis').innerHTML = cards.map(function (k) {
          var text = k[2] === 'money' ? fmt.money(k[1]) : k[1] + '%';
          return '<div class="card kpi"><p class="eyebrow">' + k[0] + '</p><p class="figure kpi__val">' +
            (k[2] === 'money' ? '<span' + (first ? ' data-count="' + k[1] + '" data-format="money"' : '') + '>' + text + '</span>' : '<span' + (first ? ' data-count="' + k[1] + '"' : '') + '>' + k[1] + '</span>%') +
            '</p><p class="kpi__note faint">' + k[3] + '</p></div>';
        }).join('');

        var total = dd.length || 1;
        $('py-ddbar').innerHTML = DD_ORDER.map(function (s) {
          var n = dd.filter(function (p) { return p.status === s; }).length;
          return n ? '<span class="ddbar__seg ddbar__seg--' + s.toLowerCase() + '" style="flex-grow:' + n + '" data-tip="' + s + ' · ' + n + ' · ' + Math.round(n / total * 100) + '%"></span>' : '';
        }).join('');
        $('py-ddbar').setAttribute('aria-label', DD_ORDER.map(function (s) { return dd.filter(function (p) { return p.status === s; }).length + ' ' + s; }).join(', '));
        $('py-ddlegend').innerHTML = DD_ORDER.map(function (s) {
          var list = dd.filter(function (p) { return p.status === s; });
          return '<button class="ddkey" type="button" data-dd="' + s + '" aria-pressed="' + (state.tab === 'dd' && state.status === s) + '"><i class="sw ddbar__seg--' + s.toLowerCase() + '"></i><span>' + s + '</span><strong>' + list.length + '</strong><small class="faint">' + fmt.moneyShort(sum(list)) + '</small></button>';
        }).join('');
        $('py-ddsum').textContent = fmt.money(sum(paid)) + ' collected';
      }
      function paintTabs() {
        var tabs = [['dd', 'Direct Debits'], ['overdue', 'Overdue'], ['desk', 'Desk sales'], ['all', 'All payments']];
        $('py-tabs').innerHTML = tabs.map(function (t) {
          return '<button class="tab" type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (state.tab === t[0]) + '"' + (state.tab === t[0] ? '' : ' tabindex="-1"') + '>' + t[1] + '<span class="tab__n">' + rowsFor(t[0]).length + '</span></button>';
        }).join('');
      }
      function tableHtml() {
        var list = filtered(), pages = Math.max(1, Math.ceil(list.length / PER));
        if (state.page > pages) state.page = pages;
        if (!list.length) {
          return ui.state(state.tab === 'overdue' && !state.q
            ? { icon: 'checkCircle', title: 'Nothing owed', text: 'Every payment is in. That\'s how a month should look.' }
            : { icon: 'card', title: 'No payments match', text: 'Try a different name, or clear the filter.', actions: '<button class="btn btn--primary" type="button" id="py-clear">Clear filters</button>' });
        }
        return '<div class="table-wrap"><table class="table"><thead><tr><th class="c-date">Date</th><th>Customer</th><th class="c-plan">Item</th><th class="c-exp">Type</th><th>Status</th><th class="t-right">Amount</th><th class="t-acts"><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
          list.slice((state.page - 1) * PER, state.page * PER).map(payRow).join('') + '</tbody></table></div>' +
          '<div class="pager" id="py-pager">' + ui.pager(list.length, state.page, PER, 'payments') + '</div>';
      }
      function toolbar() {
        var owed = rowsFor('overdue').length;
        return '<div class="toolbar"><label class="searchbox">' + icon('search', 'icon--sm') + '<span class="sr-only">Search payments</span><input type="search" id="py-q" placeholder="Name, member ID or reference" value="' + esc(state.q) + '" autocomplete="off"></label>' +
          (state.tab === 'overdue'
            ? '<button class="btn" type="button" id="py-remind"' + (owed ? '' : ' disabled') + '>' + icon('message', 'icon--sm') + 'Remind all ' + owed + '</button><button class="btn btn--primary" type="button" id="py-retryall"' + (owed ? '' : ' disabled') + '>' + icon('refresh', 'icon--sm') + 'Retry all</button>'
            : state.tab === 'desk' ? ''
            : '<label class="sr-only" for="py-status">Status</label><select class="select" id="py-status">' + [['all', 'Any status']].concat(DD_ORDER.map(function (s) { return [s, s]; })).map(function (o) { return '<option value="' + o[0] + '"' + (state.status === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>') +
          '</div>';
      }
      function deskHtml() {
        var cats = ['All'].concat(MF.products.map(function (p) { return p.cat; }).filter(function (c, i, a) { return a.indexOf(c) === i; }));
        var lines = Object.keys(state.basket).filter(function (k) { return state.basket[k] > 0; }).map(function (k) { return { p: MF.products.filter(function (x) { return x.id === k; })[0], n: state.basket[k] }; });
        var total = lines.reduce(function (s, l) { return s + l.p.price * l.n; }, 0), items = lines.reduce(function (s, l) { return s + l.n; }, 0);
        return '<div class="pos"><div class="pos__shop"><div class="fchips" style="padding:0 0 var(--s-3)" role="group" aria-label="Category">' + cats.map(function (c) {
            return '<button class="fchip" type="button" data-cat="' + c + '" aria-pressed="' + (state.cat === c) + '">' + c + '</button>';
          }).join('') + '</div><div class="pos__grid">' + MF.products.filter(function (p) { return state.cat === 'All' || p.cat === state.cat; }).map(function (p) {
            var n = state.basket[p.id] || 0;
            return '<button class="tile' + (n ? ' is-on' : '') + '" type="button" data-add="' + p.id + '"><span class="tile__cat">' + p.cat + '</span><strong>' + esc(p.name) + '</strong><span class="tile__price">' + fmt.money(p.price) + '</span>' + (n ? '<span class="tile__n">' + n + '</span>' : '') + '</button>';
          }).join('') + '</div></div>' +
          '<aside class="pos__basket" aria-label="Basket"><h2>Basket</h2>' +
            (lines.length ? '<ul class="basket">' + lines.map(function (l) {
              return '<li><span class="grow"><strong>' + esc(l.p.name) + '</strong><small class="faint">' + fmt.money(l.p.price) + ' each</small></span>' +
                '<span class="qty"><button class="icon-btn" type="button" data-dec="' + l.p.id + '" aria-label="One fewer ' + esc(l.p.name) + '">−</button><span>' + l.n + '</span><button class="icon-btn" type="button" data-add="' + l.p.id + '" aria-label="One more ' + esc(l.p.name) + '">+</button></span>' +
                '<strong class="basket__sum">' + fmt.money(l.p.price * l.n) + '</strong></li>';
            }).join('') + '</ul>' : '<p class="muted basket__empty">Tap a product to start a sale.</p>') +
            '<div class="field"><label for="pos-who">Customer</label><input class="input" id="pos-who" type="text" placeholder="Member name or ID (optional)" autocomplete="off"></div>' +
            '<div class="basket__total"><span>Total</span><strong class="figure">' + fmt.money(total) + '</strong></div>' +
            '<button class="btn btn--primary btn--block" type="button" id="pos-charge"' + (lines.length ? '' : ' disabled') + '>Charge ' + fmt.money(total) + '</button>' +
            (lines.length ? '<button class="btn btn--ghost btn--block" type="button" id="pos-clear">Clear basket</button>' : '') +
            '<p class="faint" style="font-size:var(--fs-12)">' + (items ? items + ' item' + (items === 1 ? '' : 's') + ' · card, contactless or cash' : 'Supplements, drinks and merch') + '</p></aside></div>' +
          '<div class="card__head pad" style="border-top:1px solid var(--border);padding-bottom:var(--s-2)"><div><h2>Desk sales</h2><p>Supplements, drinks, merch and passes</p></div></div>' + toolbar() + tableHtml();
      }
      function paintPanel(animate) {
        panel.innerHTML = state.tab === 'desk' ? deskHtml() : toolbar() + tableHtml();
        if (animate) motion.contentIn(panel);
      }
      function repaint(animate) { paintTop(false); paintTabs(); paintPanel(animate); }

      /* ------------------------------------------------------ actions ---- */
      function retry(p) { p.status = 'Pending'; p.attempts = (p.attempts || 1) + 1; var m = MF.memberById[p.memberId]; if (m) m.dd = 'Pending'; }
      function charge() {
        var ids = Object.keys(state.basket).filter(function (k) { return state.basket[k] > 0; });
        if (!ids.length) return;
        var lines = ids.map(function (k) { return { p: MF.products.filter(function (x) { return x.id === k; })[0], n: state.basket[k] }; });
        var total = lines.reduce(function (s, l) { return s + l.p.price * l.n; }, 0), items = lines.reduce(function (s, l) { return s + l.n; }, 0);
        var typed = ($('pos-who').value || '').trim().toLowerCase(), member = null;
        if (typed) member = MF.members.filter(function (m) { return m.id.toLowerCase() === typed || m.name.toLowerCase().indexOf(typed) >= 0; })[0] || null;
        var clock = MF.clock();
        var pay = { id: 'PAY-' + (state.payNo++), memberId: member ? member.id : null, guest: member ? null : ($('pos-who').value.trim() || 'Walk-in'), type: 'POS',
          item: items === 1 ? lines[0].p.name : lines[0].p.name + ' + ' + (items - 1) + ' more', cat: lines[0].p.cat, amount: total, status: 'Paid',
          date: MF.todayIso, time: fmt.time(clock), method: 'Card' };
        MF.payments.unshift(pay);
        MF.revenue.today += total; MF.revenue.mtd += total;
        state.basket = {};
        repaint(false);
        ui.toast('Charged ' + fmt.money(total) + '. Receipt ready.', 'success');
        ui.receipt(pay);
      }

      /* ------------------------------------------------------ events ----- */
      $('py-tabs').addEventListener('click', function (e) {
        var b = e.target.closest('[data-tab]');
        if (!b) return;
        state.tab = b.getAttribute('data-tab'); state.page = 1; state.status = 'all'; state.q = '';
        repaint(true);
        $('py-tabs').querySelector('[aria-selected="true"]').focus();
      });
      $('py-ddlegend').addEventListener('click', function (e) {
        var b = e.target.closest('[data-dd]');
        if (!b) return;
        var s = b.getAttribute('data-dd');
        state.status = state.tab === 'dd' && state.status === s ? 'all' : s;
        state.tab = 'dd'; state.page = 1; state.q = '';
        repaint(true);
      });
      panel.addEventListener('input', function (e) {
        if (e.target.id !== 'py-q') return;
        state.q = e.target.value.trim(); state.page = 1;
        var keep = panel.querySelector('.table-wrap, .state'), pg = panel.querySelector('#py-pager');
        if (pg) pg.remove();
        if (keep) keep.outerHTML = tableHtml(); else panel.insertAdjacentHTML('beforeend', tableHtml());
      });
      panel.addEventListener('change', function (e) {
        if (e.target.id === 'py-status') { state.status = e.target.value; state.page = 1; paintTop(false); paintPanel(true); }
      });
      panel.addEventListener('click', function (e) {
        var t = e.target, b;
        if ((b = t.closest('[data-page]'))) { if (!b.disabled) { state.page = +b.getAttribute('data-page'); paintPanel(true); } return; }
        if (t.closest('#py-clear')) { state.q = ''; state.status = 'all'; state.page = 1; repaint(true); return; }
        if ((b = t.closest('[data-cat]'))) { state.cat = b.getAttribute('data-cat'); paintPanel(false); return; }
        if ((b = t.closest('[data-add]'))) { var id = b.getAttribute('data-add'); state.basket[id] = (state.basket[id] || 0) + 1; paintPanel(false); return; }
        if ((b = t.closest('[data-dec]'))) { var id2 = b.getAttribute('data-dec'); state.basket[id2] = Math.max(0, (state.basket[id2] || 0) - 1); paintPanel(false); return; }
        if (t.closest('#pos-clear')) { state.basket = {}; paintPanel(false); return; }
        if (t.closest('#pos-charge')) { charge(); return; }
        if (t.closest('#py-remind')) { ui.toast('Payment reminder sent to ' + rowsFor('overdue').length + ' members on WhatsApp.', 'success'); return; }
        if (t.closest('#py-retryall')) {
          var owed = rowsFor('overdue'), n = owed.length;
          owed.forEach(retry); repaint(true);
          ui.toast('Retry queued for ' + n + ' payment' + (n === 1 ? '' : 's') + '. You\'ll hear how they land.', 'success');
          return;
        }
        if ((b = t.closest('[data-retry]'))) {
          var p = MF.payments[+b.getAttribute('data-retry')], row = b.closest('tr');
          retry(p);
          ui.toast('Retry queued for ' + fmt.first(who(p)) + '. Now pending.', 'success');
          if (state.tab === 'overdue') motion.listRemove(row, function () { repaint(false); }); else repaint(false);
          return;
        }
        if ((b = t.closest('[data-wa]'))) {
          var pw = MF.payments[+b.getAttribute('data-wa')], m = MF.memberById[pw.memberId];
          ui.whatsapp({ name: m.name, phone: m.phone, message: ui.fillTemplate('t4', m, { amount: fmt.money(pw.amount) }) });
          return;
        }
        var tr = t.closest('tr[data-pay]');
        if (tr) ui.receipt(MF.payments[+tr.getAttribute('data-pay')]);
      });
      $('py-export').addEventListener('click', function () { ui.toast('Exported ' + filtered().length + ' payments to muscle-flex-payments.csv.', 'success'); });
      $('py-take').addEventListener('click', function () {
        state.tab = 'desk'; state.page = 1; state.q = ''; state.status = 'all';
        repaint(true);
        panel.scrollIntoView({ block: 'start' });
      });

      paintTop(true); paintTabs(); paintPanel(false);
    }
  });
})();
