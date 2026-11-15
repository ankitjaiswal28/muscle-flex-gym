/* ==========================================================================
   Memberships & passes — plan cards with ₹ prices, sales per plan,
   promo codes (on/off, copy, create) and freeze rules.
   ========================================================================== */
(function () {
  'use strict';
  var App = window.MFApp, MF = window.MF, ui = App.ui, fmt = App.fmt, icon = App.icon, charts = App.charts, motion = App.motion;
  var esc = fmt.esc;

  function stats() {
    var act = MF.activeMembers(), total = act.length || 1;
    return MF.plans.map(function (p) {
      var n = act.filter(function (m) { return m.plan === p.id; }).length;
      var monthly = p.period === 'year' ? Math.round(p.price / 12) : p.price;
      var sold = p.kind === 'pass' ? MF.payments.filter(function (x) { return x.type === 'Pass' && x.item === p.name; }).length : 0;
      return { plan: p, members: n, share: n / total, value: p.kind === 'pass' ? sold * p.price : n * monthly, sold: sold };
    });
  }
  function field(id, label, value, type, hint) {
    return '<div class="field"><label for="' + id + '">' + label + '</label><input class="input" id="' + id + '" type="' + (type || 'text') + '" value="' + esc(value == null ? '' : value) + '" autocomplete="off">' + (hint ? '<small>' + hint + '</small>' : '') + '</div>';
  }

  App.screen('memberships', {
    title: 'Memberships & passes',
    render: function (view) {
      var st = stats(), top = st.slice().sort(function (a, b) { return b.members - a.members; })[0];
      var mrr = st.reduce(function (s, x) { return s + x.value; }, 0);
      var frozen = MF.members.filter(function (m) { return m.status === 'frozen'; }).length;

      view.innerHTML =
        ui.pageHead('Memberships & passes', 'No contracts. No hidden fees. Clear prices.',
          '<button class="btn" type="button" id="ms-promo">' + icon('ticket', 'icon--sm') + 'New promo code</button>' +
          '<button class="btn btn--primary" type="button" id="ms-plan">' + icon('plus', 'icon--sm') + 'New plan</button>') +

        '<div class="grid plans">' + st.map(function (x) {
          var p = x.plan, isTop = x === top;
          return '<article class="card plan' + (isTop ? ' plan--top' : '') + '">' +
            '<div class="plan__head"><h2>' + esc(p.name) + '</h2>' + (isTop ? '<span class="chip chip--accent chip--plain">Most popular</span>' : '<span class="chip chip--plain">' + (p.kind === 'pass' ? 'Pass' : 'Membership') + '</span>') + '</div>' +
            '<p class="plan__price"><span class="figure" data-count="' + p.price + '" data-format="money">' + fmt.money(p.price) + '</span><span class="muted"> / ' + p.period + '</span></p>' +
            '<p class="muted plan__blurb">' + esc(p.blurb) + '</p>' +
            '<dl class="plan__stats"><div><dt>' + (p.kind === 'pass' ? 'Sold lately' : 'Members') + '</dt><dd>' + (p.kind === 'pass' ? x.sold : x.members) + '</dd></div>' +
              '<div><dt>' + (p.kind === 'pass' ? 'Taken' : 'Worth a month') + '</dt><dd>' + fmt.moneyShort(x.value) + '</dd></div></dl>' +
            '<span class="meter meter--lg' + (isTop ? '' : ' meter--quiet') + '" role="img" aria-label="' + Math.round(x.share * 100) + '% of members"><i style="transform:scaleX(' + Math.max(.02, x.share) + ')"></i></span>' +
            '<div class="plan__acts"><button class="btn btn--sm btn--primary" type="button" data-action="quick:member">Sell</button>' +
              '<button class="btn btn--sm" type="button" data-edit="' + p.id + '">Edit</button>' +
              '<a class="btn btn--sm btn--ghost" href="#/members">Members' + icon('chevronRight', 'icon--sm') + '</a></div></article>';
        }).join('') + '</div>' +

        '<div class="dash" style="margin-top:var(--s-4)">' +
          '<section class="card span-8" aria-labelledby="h-sales"><div class="card__head"><div><h2 id="h-sales">Sales per plan</h2><p>What each plan brings in a month · ' + fmt.money(mrr) + ' in total</p></div></div>' +
            '<div id="ms-chart" class="chartbox"></div></section>' +

          '<section class="card span-4" aria-labelledby="h-freeze"><div class="card__head"><div><h2 id="h-freeze">Freeze rules</h2><p>Fair, simple, written down</p></div>' +
            '<button class="btn btn--sm" type="button" data-toast="Rules editor opens here in the live system." data-toast-type="info">Edit</button></div>' +
            '<ul class="rules">' + MF.freezeRules.map(function (r) { return '<li>' + icon('check', 'icon--sm') + '<span>' + esc(r) + '</span></li>'; }).join('') + '</ul>' +
            '<a class="besttime besttime--plain" href="#/members?status=frozen">' + icon('clock') + '<span class="grow"><strong>' + frozen + ' member' + (frozen === 1 ? '' : 's') + '</strong> frozen right now</span>' + icon('chevronRight', 'icon--sm') + '</a>' +
          '</section>' +

          '<section class="card card--flush span-12" aria-labelledby="h-promo"><div class="card__head pad"><div><h2 id="h-promo">Promo codes</h2><p>Switch them on and off. See what they pull in.</p></div></div>' +
            '<div class="table-wrap" style="margin-top:var(--s-3)"><table class="table"><thead><tr><th>Code</th><th>What it does</th><th class="c-exp">Used</th><th class="c-plan">Ends</th><th>Live</th><th class="t-acts"><span class="sr-only">Copy</span></th></tr></thead><tbody id="ms-promos"></tbody></table></div>' +
          '</section>' +
        '</div>';

      var $ = function (id) { return view.querySelector('#' + id); };

      function drawChart(animate) {
        var box = $('ms-chart');
        box.innerHTML = charts.hbars(st.slice().sort(function (a, b) { return b.value - a.value; }).map(function (x) {
          var unit = x.plan.kind === 'pass' ? x.sold + ' sold' : x.members + ' member' + (x.members === 1 ? '' : 's');
          return { label: x.plan.name, value: x.value, text: fmt.moneyShort(x.value) + ' · ' + unit, cls: x === top ? 'hbar--accent' : '', tip: x.plan.name + ' · ' + fmt.money(x.value) + ' a month · ' + unit };
        }), Math.max(260, box.clientWidth), { label: 'Monthly value of each plan.', valueWidth: 150 });
        if (animate) motion.drawChart(box);
      }
      function paintPromos() {
        $('ms-promos').innerHTML = MF.promos.map(function (p, i) {
          var share = p.limit ? Math.min(1, p.uses / p.limit) : .35;
          return '<tr><td><code class="code">' + esc(p.code) + '</code></td><td class="c-wrap">' + esc(p.desc) + '</td>' +
            '<td class="c-exp"><span class="riskcell"><span class="meter meter--quiet" aria-hidden="true"><i style="transform:scaleX(' + share + ')"></i></span><strong>' + p.uses + '</strong><small class="faint">' + (p.limit ? 'of ' + p.limit : 'no limit') + '</small></span></td>' +
            '<td class="c-plan muted">' + (p.ends ? fmt.date(p.ends) : 'No end date') + '</td>' +
            '<td>' + ui.switchHtml(p.active, p.code + ' live', 'data-promo="' + i + '"') + '</td>' +
            '<td class="t-acts"><button class="btn btn--sm" type="button" data-copy="' + esc(p.code) + '">Copy</button></td></tr>';
        }).join('');
      }

      /* ------------------------------------------------------ events ---- */
      $('ms-promos').addEventListener('click', function (e) {
        var sw = e.target.closest('[data-promo]'), cp = e.target.closest('[data-copy]');
        if (sw) {
          var p = MF.promos[+sw.getAttribute('data-promo')];
          p.active = !p.active;
          sw.setAttribute('aria-checked', p.active);
          ui.toast(p.code + (p.active ? ' is live.' : ' is switched off.'), p.active ? 'success' : 'info');
        } else if (cp) {
          ui.toast(cp.getAttribute('data-copy') + ' copied. Paste it anywhere.', 'success');
        }
      });
      view.querySelector('.plans').addEventListener('click', function (e) {
        var b = e.target.closest('[data-edit]');
        if (!b) return;
        var p = MF.planById[b.getAttribute('data-edit')];
        ui.drawer({ title: 'Edit ' + p.name, subtitle: 'Changes apply to new sign-ups. Current members keep their price.',
          body: '<form class="stack" id="plan-form" novalidate>' + field('pf-name', 'Plan name', p.name) + field('pf-price', 'Price (₹)', p.price, 'number', 'Per ' + p.period + '.') + field('pf-blurb', 'One-line pitch', p.blurb) + '</form>',
          footer: '<button class="btn btn--ghost" type="button" data-close>Cancel</button><button class="btn btn--primary" type="submit" form="plan-form">Save plan</button>',
          onOpen: function (el, close) {
            el.querySelector('form').addEventListener('submit', function (ev) {
              ev.preventDefault();
              var price = parseFloat(el.querySelector('#pf-price').value), name = el.querySelector('#pf-name').value.trim();
              if (!name || !(price > 0)) { ui.toast('Give it a name and a price above zero.', 'warning'); return; }
              p.name = name; p.price = Math.round(price); p.blurb = el.querySelector('#pf-blurb').value.trim();
              close(); App.router.refresh(); ui.toast(p.name + ' saved at ' + fmt.money(p.price) + '.', 'success');
            });
          } });
      });
      $('ms-plan').addEventListener('click', function () {
        ui.drawer({ title: 'New plan', subtitle: 'Keep it simple. One price, no small print.',
          body: '<form class="stack" id="plan-form" novalidate>' + field('pf-name', 'Plan name', '', 'text') + field('pf-price', 'Price (₹)', '', 'number') +
            '<div class="field"><label for="pf-period">Billed</label><select class="select" id="pf-period"><option value="month">Every month</option><option value="year">Once a year</option><option value="7 days">7-day pass</option><option value="day">Day pass</option></select></div>' +
            field('pf-blurb', 'One-line pitch', '') + '</form>',
          footer: '<button class="btn btn--ghost" type="button" data-close>Cancel</button><button class="btn btn--primary" type="submit" form="plan-form">Create plan</button>',
          onOpen: function (el, close) {
            el.querySelector('form').addEventListener('submit', function (ev) {
              ev.preventDefault();
              var price = parseFloat(el.querySelector('#pf-price').value), name = el.querySelector('#pf-name').value.trim(), period = el.querySelector('#pf-period').value;
              if (!name || !(price > 0)) { ui.toast('Give it a name and a price above zero.', 'warning'); return; }
              var plan = { id: 'p' + Date.now(), name: name, price: Math.round(price), period: period, kind: period === 'month' || period === 'year' ? 'membership' : 'pass', blurb: el.querySelector('#pf-blurb').value.trim() || 'New plan.' };
              MF.plans.push(plan); MF.planById[plan.id] = plan;
              close(); App.router.refresh(); ui.toast(plan.name + ' is on sale.', 'success');
            });
          } });
      });
      $('ms-promo').addEventListener('click', function () {
        ui.drawer({ title: 'New promo code', subtitle: 'Short and easy to say out loud.',
          body: '<form class="stack" id="promo-form" novalidate>' + field('pr-code', 'Code', '', 'text', 'Letters and numbers. We\'ll make it capitals.') + field('pr-desc', 'What it does', '', 'text', 'e.g. 20% off the first month') + field('pr-limit', 'Limit (optional)', '', 'number', 'Leave empty for no limit.') + '</form>',
          footer: '<button class="btn btn--ghost" type="button" data-close>Cancel</button><button class="btn btn--primary" type="submit" form="promo-form">Create code</button>',
          onOpen: function (el, close) {
            el.querySelector('form').addEventListener('submit', function (ev) {
              ev.preventDefault();
              var code = el.querySelector('#pr-code').value.replace(/[^a-z0-9]/gi, '').toUpperCase(), desc = el.querySelector('#pr-desc').value.trim(), lim = parseInt(el.querySelector('#pr-limit').value, 10);
              if (!code || !desc) { ui.toast('Add a code and what it does.', 'warning'); return; }
              MF.promos.unshift({ code: code, desc: desc, uses: 0, limit: lim > 0 ? lim : null, ends: null, active: true });
              close(); paintPromos(); motion.listInsert($('ms-promos').querySelector('.code')); ui.toast(code + ' is live.', 'success');
            });
          } });
      });

      drawChart(true);
      paintPromos();

      var lastW = $('ms-chart').clientWidth, rt = null, ro = null;
      function onResize() { clearTimeout(rt); rt = setTimeout(function () { var b = $('ms-chart'); if (b && b.clientWidth !== lastW) { lastW = b.clientWidth; drawChart(false); } }, 140); }
      if (window.ResizeObserver) { ro = new ResizeObserver(onResize); ro.observe($('ms-chart')); }
      window.addEventListener('resize', onResize);
      return function () { clearTimeout(rt); if (ro) ro.disconnect(); window.removeEventListener('resize', onResize); };
    }
  });
})();
