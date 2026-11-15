/* ==========================================================================
   Leads & enquiries — funnel, lead sources, and a drag-and-drop kanban:
   New → Contacted → Trial → Visited → Joined / Lost.
   Mouse: drag a card anywhere. Touch: drag by the grip. Keyboard: focus a
   card, ← / → moves it a stage, Enter opens it.
   ========================================================================== */
(function () {
  'use strict';
  var App = window.MFApp, MF = window.MF, ui = App.ui, fmt = App.fmt, icon = App.icon, charts = App.charts, motion = App.motion;
  var esc = fmt.esc, STAGES = MF.leadStages, leadNo = 400;
  var HINT = { New: 'Not contacted yet', Contacted: 'Waiting on a reply', Trial: 'Trial booked', Visited: 'Came in. Close it.', Joined: 'Signed up', Lost: 'Didn\'t join' };

  function initials(name) { return name.split(' ').map(function (x) { return x[0]; }).join('').slice(0, 2); }
  function waiting(l) { var d = -fmt.daysUntil(l.created); return d <= 0 ? 'Today' : d + 'd'; }
  function inStage(s) { return MF.leads.filter(function (l) { return l.stage === s; }); }
  function welcome(l) { return 'Hi ' + fmt.first(l.name) + ', thanks for getting in touch with Muscle Flex. Fancy a free look round this week? No contracts, no hidden fees.'; }

  function cardHtml(l) {
    var owner = MF.staffById[l.owner], stale = l.stage === 'New' && -fmt.daysUntil(l.created) >= 2;
    return '<article class="lcard" tabindex="0" data-id="' + l.id + '" aria-label="' + esc(l.name + ', ' + l.stage + ', ' + l.source + '. Arrow keys move stage, Enter opens.') + '">' +
      '<div class="lcard__top"><strong class="truncate">' + esc(l.name) + '</strong><span class="lcard__grip" aria-hidden="true">' + icon('more', 'icon--sm') + '</span></div>' +
      '<p class="lcard__meta truncate">' + esc(l.source) + ' · ' + esc(l.interest) + '</p>' +
      '<div class="lcard__foot"><span class="chip chip--plain' + (stale ? ' chip--warning' : '') + '">' + (l.stage === 'Joined' ? fmt.moneyShort(l.value) : waiting(l)) + '</span><span class="grow"></span>' +
        '<button class="icon-btn" type="button" data-wa aria-label="WhatsApp ' + esc(l.name) + '" data-tip="WhatsApp">' + icon('message', 'icon--sm') + '</button>' +
        '<button class="icon-btn" type="button" data-call aria-label="Call ' + esc(l.name) + '" data-tip="Call ' + l.phone + '">' + icon('phone', 'icon--sm') + '</button>' +
        '<span class="avatar avatar--sm" data-tip="' + esc(owner ? owner.name : 'Unassigned') + '">' + esc(owner ? owner.initials : '—') + '</span></div></article>';
  }
  function colHtml(s) {
    var list = inStage(s);
    return '<section class="kcol' + (s === 'Lost' ? ' kcol--lost' : s === 'Joined' ? ' kcol--won' : '') + '" data-stage="' + s + '" aria-label="' + s + ', ' + list.length + ' leads">' +
      '<header class="kcol__head"><h3>' + s + '</h3><span class="tab__n">' + list.length + '</span><span class="faint kcol__hint">' + HINT[s] + '</span></header>' +
      '<div class="kcol__list">' + list.map(cardHtml).join('') + '</div></section>';
  }

  App.screen('leads', {
    title: 'Leads & enquiries',
    render: function (view) {
      view.innerHTML =
        ui.pageHead('Leads & enquiries', 'Every enquiry, from first message to first session.',
          '<button class="btn" type="button" data-toast="Exported ' + MF.leads.length + ' leads to muscle-flex-leads.csv.">' + icon('download', 'icon--sm') + 'Export</button>' +
          '<button class="btn btn--primary" type="button" id="ld-add">' + icon('plus', 'icon--sm') + 'Add lead</button>') +
        '<div class="dash" style="margin-bottom:var(--s-4)">' +
          '<section class="card span-8" aria-labelledby="h-funnel"><div class="card__head"><div><h2 id="h-funnel">Funnel</h2><p id="ld-funnel-sub"></p></div></div><div id="ld-funnel" class="chartbox"></div></section>' +
          '<section class="card span-4" aria-labelledby="h-src"><div class="card__head"><div><h2 id="h-src">Where they come from</h2><p>Leads by source</p></div></div><div id="ld-src" class="chartbox"></div></section>' +
        '</div>' +
        '<div class="board" id="ld-board" role="group" aria-label="Lead board"></div>' +
        '<p class="faint board__help">' + icon('info', 'icon--sm') + 'Drag a card to move it. On a keyboard: focus a card, then ← or → to move, Enter to open.</p>';

      var $ = function (id) { return view.querySelector('#' + id); }, board = $('ld-board');

      /* ------------------------------------------------------ painters --- */
      function paintBoard() { board.innerHTML = STAGES.map(colHtml).join(''); }
      function paintCounts() {
        STAGES.forEach(function (s) {
          var col = board.querySelector('.kcol[data-stage="' + s + '"]'), n = col.querySelectorAll('.lcard:not(.is-ghost)').length;
          col.querySelector('.tab__n').textContent = n;
          col.setAttribute('aria-label', s + ', ' + n + ' leads');
        });
      }
      function paintCharts(animate) {
        var live = MF.leads.filter(function (l) { return l.stage !== 'Lost'; }), path = STAGES.slice(0, 5), prev = null;
        var fb = $('ld-funnel'), sb = $('ld-src');
        var items = path.map(function (s, i) {
          var n = live.filter(function (l) { return path.indexOf(l.stage) >= i; }).length;
          var text = n + (prev ? ' · ' + Math.round(n / prev * 100) + '% carried on' : ' enquiries');
          var it = { label: s, value: n, text: text, cls: i === 4 ? 'hbar--accent' : '', tip: s + ' or further · ' + n + ' leads' };
          prev = n || 1;
          return it;
        });
        fb.innerHTML = charts.hbars(items, Math.max(260, fb.clientWidth), { label: 'Lead funnel from enquiry to joined.', valueWidth: 150 });
        var joined = inStage('Joined').length, lost = inStage('Lost').length, total = MF.leads.length;
        $('ld-funnel-sub').textContent = total + ' enquiries · ' + joined + ' joined (' + Math.round(joined / total * 100) + '%) · ' + lost + ' lost';
        var src = MF.leadSources.map(function (name) {
          var all = MF.leads.filter(function (l) { return l.source === name; }), won = all.filter(function (l) { return l.stage === 'Joined'; }).length;
          return { label: name, value: all.length, text: all.length + ' · ' + won + ' joined', tip: name + ' · ' + all.length + ' leads · ' + won + ' joined' };
        }).sort(function (a, b) { return b.value - a.value; });
        src[0].cls = 'hbar--accent';
        sb.innerHTML = charts.hbars(src, Math.max(220, sb.clientWidth), { label: 'Leads by source.', valueWidth: 96 });
        if (animate) motion.drawChart(view);
      }
      function leadById(id) { return MF.leads.filter(function (l) { return l.id === id; })[0]; }
      function syncOrder() {      /* keep MF.leads in the order shown on the board */
        var ids = [].map.call(board.querySelectorAll('.lcard:not(.is-ghost)'), function (c) { return c.getAttribute('data-id'); });
        MF.leads.sort(function (a, b) { return ids.indexOf(a.id) - ids.indexOf(b.id); });
      }
      function moveTo(l, stage, quiet) {
        if (l.stage === stage) return;
        l.stage = stage;
        l.lastContact = MF.todayIso;
        if (!quiet) ui.toast(fmt.first(l.name) + ' moved to ' + stage + (stage === 'Joined' ? '. Nice one.' : '.'), stage === 'Lost' ? 'info' : 'success');
      }

      /* ---------------------------------------------------- lead drawer -- */
      function openLead(l) {
        var owner = MF.staffById[l.owner], ix = STAGES.indexOf(l.stage), next = ix < 4 ? STAGES[ix + 1] : null;
        ui.drawer({ title: l.name, subtitle: l.source + ' enquiry · ' + fmt.date(l.created),
          body: '<div class="stack"><dl class="kv"><div><dt>Mobile</dt><dd>' + l.phone + '</dd></div><div><dt>Interested in</dt><dd>' + esc(l.interest) + '</dd></div>' +
            '<div><dt>Worth</dt><dd>' + fmt.money(l.value) + '</dd></div><div><dt>Owner</dt><dd>' + esc(owner ? owner.name : 'Unassigned') + '</dd></div>' +
            '<div><dt>Last contact</dt><dd>' + (l.lastContact ? fmt.date(l.lastContact) : 'Not yet') + '</dd></div></dl>' +
            '<div class="field"><label for="ld-stage">Stage</label><select class="select" id="ld-stage">' + STAGES.map(function (s) { return '<option' + (s === l.stage ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>' +
            '<div class="field"><label for="ld-note">Note</label><textarea class="textarea" id="ld-note">' + esc(l.note || '') + '</textarea></div>' +
            '<div class="row row--wrap"><button class="btn" type="button" id="ld-wa">' + icon('message', 'icon--sm') + 'WhatsApp</button>' +
            '<button class="btn" type="button" data-toast="Calling ' + esc(fmt.first(l.name)) + ' on ' + l.phone + '…" data-toast-type="info">' + icon('phone', 'icon--sm') + 'Call</button>' +
            (l.stage === 'Joined' ? '<button class="btn" type="button" data-close data-action="quick:member">Create member</button>' : '') + '</div></div>',
          footer: (l.stage !== 'Lost' && l.stage !== 'Joined' ? '<button class="btn btn--ghost" type="button" id="ld-lost">Mark lost</button>' : '') +
            '<button class="btn" type="button" id="ld-save">Save</button>' +
            (next ? '<button class="btn btn--primary" type="button" id="ld-next">Move to ' + next + '</button>' : ''),
          onOpen: function (el, close) {
            function finish(stage) {
              l.note = el.querySelector('#ld-note').value.trim();
              var before = l.stage;
              moveTo(l, stage, true);
              close(); paintBoard(); paintCharts(false);
              ui.toast(before === l.stage ? 'Saved.' : fmt.first(l.name) + ' moved to ' + l.stage + '.', 'success');
            }
            el.querySelector('#ld-save').addEventListener('click', function () { finish(el.querySelector('#ld-stage').value); });
            if (next) el.querySelector('#ld-next').addEventListener('click', function () { finish(next); });
            var lost = el.querySelector('#ld-lost');
            if (lost) lost.addEventListener('click', function () { finish('Lost'); });
            el.querySelector('#ld-wa').addEventListener('click', function () { ui.whatsapp({ name: l.name, phone: l.phone, message: welcome(l) }); });
          } });
      }

      /* -------------------------------------------------- drag and drop -- */
      var drag = null, suppressClick = false;
      function startDrag(e) {
        var r = drag.card.getBoundingClientRect(), ghost = drag.card.cloneNode(true);
        ghost.classList.add('is-ghost');
        ghost.removeAttribute('tabindex');
        ghost.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
        document.body.appendChild(ghost);
        drag.ghost = ghost; drag.rect = r; drag.active = true;
        drag.card.classList.add('is-placeholder');          /* the real card becomes the drop placeholder */
        document.body.classList.add('is-dragging');
        motion.dragMove(ghost, 0, 0);                        /* tilt applies from the first frame */
        App.charts.hideTip();
      }
      function onMove(e) {
        if (!drag || e.pointerId !== drag.pid) return;
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.active) { if (Math.abs(dx) + Math.abs(dy) < 6) return; startDrag(e); }
        e.preventDefault();
        motion.dragMove(drag.ghost, dx, dy);
        var under = document.elementFromPoint(e.clientX, e.clientY), col = under && under.closest ? under.closest('.kcol') : null;
        var cols = board.querySelectorAll('.kcol');
        for (var i = 0; i < cols.length; i++) cols[i].classList.toggle('is-over', cols[i] === col);
        if (col) {
          var list = col.querySelector('.kcol__list'), cards = list.querySelectorAll('.lcard:not(.is-placeholder)'), before = null;
          for (var c = 0; c < cards.length; c++) { var cr = cards[c].getBoundingClientRect(); if (e.clientY < cr.top + cr.height / 2) { before = cards[c]; break; } }
          if (before !== drag.card.nextSibling || drag.card.parentNode !== list) list.insertBefore(drag.card, before);
        }
        var br = board.getBoundingClientRect();              /* edge auto-scroll */
        if (e.clientX > br.right - 56) board.scrollLeft += 14; else if (e.clientX < br.left + 56) board.scrollLeft -= 14;
      }
      function endDrag(e, cancelled) {
        if (!drag || (e && e.pointerId !== drag.pid)) return;
        var d = drag; drag = null;
        if (!d.active) return;
        suppressClick = true; setTimeout(function () { suppressClick = false; }, 0);
        document.body.classList.remove('is-dragging');
        [].forEach.call(board.querySelectorAll('.is-over'), function (c) { c.classList.remove('is-over'); });
        if (cancelled && d.home.parent) d.home.parent.insertBefore(d.card, d.home.next);
        var to = d.card.getBoundingClientRect();
        motion.dragDrop(d.ghost, to.left - d.rect.left, to.top - d.rect.top, function () {
          if (d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
          d.card.classList.remove('is-placeholder');
          var stage = d.card.closest('.kcol').getAttribute('data-stage'), l = leadById(d.card.getAttribute('data-id'));
          var moved = l.stage !== stage;
          moveTo(l, stage);
          syncOrder();
          if (moved) { d.card.outerHTML = cardHtml(l); paintCharts(false); }
          paintCounts();
        });
      }
      function onDown(e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        var card = e.target.closest('.lcard');
        if (!card || e.target.closest('button, a')) return;
        if (e.pointerType !== 'mouse' && !e.target.closest('.lcard__grip')) return;   /* touch drags by the grip, so the list still scrolls */
        drag = { card: card, x: e.clientX, y: e.clientY, pid: e.pointerId, active: false, home: { parent: card.parentNode, next: card.nextSibling } };
      }
      function onUp(e) { endDrag(e, false); }
      function onCancel(e) { endDrag(e, true); }
      board.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);

      /* ------------------------------------------------------ events ----- */
      board.addEventListener('click', function (e) {
        if (suppressClick) return;
        var card = e.target.closest('.lcard');
        if (!card) return;
        var l = leadById(card.getAttribute('data-id'));
        if (e.target.closest('[data-wa]')) { ui.whatsapp({ name: l.name, phone: l.phone, message: welcome(l), onSent: function () { if (l.stage === 'New') { moveTo(l, 'Contacted'); paintBoard(); paintCharts(false); } } }); return; }
        if (e.target.closest('[data-call]')) { ui.toast('Calling ' + fmt.first(l.name) + ' on ' + l.phone + '…', 'info'); return; }
        openLead(l);
      });
      board.addEventListener('keydown', function (e) {
        var card = e.target.closest && e.target.closest('.lcard');
        if (!card || e.target !== card) return;
        var l = leadById(card.getAttribute('data-id')), ix = STAGES.indexOf(l.stage);
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLead(l); return; }
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var to = STAGES[ix + (e.key === 'ArrowRight' ? 1 : -1)];
        if (!to) return;
        e.preventDefault();
        moveTo(l, to); paintBoard(); paintCharts(false);
        var again = board.querySelector('.lcard[data-id="' + l.id + '"]');
        if (again) { again.focus(); again.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
      });
      $('ld-add').addEventListener('click', function () {
        ui.drawer({ title: 'Add lead', subtitle: 'Capture it now. Chase it later.',
          body: '<form class="stack" id="ld-form" novalidate><div class="field"><label for="lf-name">Full name</label><input class="input" id="lf-name" type="text" placeholder="e.g. Megan Price" autocomplete="off" data-autofocus></div>' +
            '<div class="field"><label for="lf-phone">Mobile</label><input class="input" id="lf-phone" type="tel" placeholder="07700 900123" autocomplete="off"></div>' +
            '<div class="field"><label for="lf-src">Source</label><select class="select" id="lf-src">' + MF.leadSources.map(function (s) { return '<option>' + s + '</option>'; }).join('') + '</select></div>' +
            '<div class="field"><label for="lf-int">Interested in</label><select class="select" id="lf-int">' + MF.plans.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + ' — ' + fmt.money(p.price) + '</option>'; }).join('') + '</select></div>' +
            '<div class="field"><label for="lf-note">Note</label><textarea class="textarea" id="lf-note" placeholder="What are they after?"></textarea></div></form>',
          footer: '<button class="btn btn--ghost" type="button" data-close>Cancel</button><button class="btn btn--primary" type="submit" form="ld-form">Add lead</button>',
          onOpen: function (el, close) {
            el.querySelector('form').addEventListener('submit', function (ev) {
              ev.preventDefault();
              var name = el.querySelector('#lf-name').value.trim();
              if (!name) { ui.toast('Add a name first.', 'warning'); el.querySelector('#lf-name').focus(); return; }
              var plan = MF.planById[el.querySelector('#lf-int').value];
              var l = { id: 'L' + (leadNo++), name: name, phone: el.querySelector('#lf-phone').value.trim() || '07700 900000', stage: 'New', source: el.querySelector('#lf-src').value,
                interest: plan.name, created: MF.todayIso, lastContact: null, owner: 's6', value: plan.price, note: el.querySelector('#lf-note').value.trim() };
              MF.leads.unshift(l);
              close(); paintBoard(); paintCharts(false);
              var card = board.querySelector('.lcard[data-id="' + l.id + '"]');
              if (card) motion.listInsert(card);
              ui.toast(fmt.first(name) + ' added to New. Follow-up set for tomorrow.', 'success');
            });
          } });
      });

      paintBoard();
      paintCharts(true);

      var lastW = $('ld-funnel').clientWidth, rt = null, ro = null;
      function onResize() { clearTimeout(rt); rt = setTimeout(function () { var b = $('ld-funnel'); if (b && b.clientWidth !== lastW) { lastW = b.clientWidth; paintCharts(false); } }, 140); }
      if (window.ResizeObserver) { ro = new ResizeObserver(onResize); ro.observe($('ld-funnel')); }
      window.addEventListener('resize', onResize);
      return function () {
        clearTimeout(rt); if (ro) ro.disconnect();
        window.removeEventListener('resize', onResize);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        document.body.classList.remove('is-dragging');
        var g = document.querySelector('.lcard.is-ghost');
        if (g && g.parentNode) g.parentNode.removeChild(g);
      };
    }
  });
})();
