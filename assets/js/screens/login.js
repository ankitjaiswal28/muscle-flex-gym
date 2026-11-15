/* ==========================================================================
   Login — split screen: brand + tagline on the left, sign-in on the right.
   Owner sign-in or staff PIN pad. This is a prototype: there is no real
   authentication — any details let you in.
   ========================================================================== */
(function () {
  'use strict';
  var App = window.MFApp, MF = window.MF, ui = App.ui, fmt = App.fmt, icon = App.icon, motion = App.motion;
  var mode = 'owner';

  App.screen('login', {
    title: 'Sign in',
    render: function (view) {
      var pin = '';
      view.innerHTML =
        '<div class="login">' +
          '<section class="login__brand" aria-label="Muscle Flex Gym">' +
            '<div class="row"><span class="brand__mark" aria-hidden="true">MF</span><span class="brand__word">Muscle <span>Flex</span><small class="brand__sub">SHREWSBURY</small></span></div>' +
            '<h1 class="login__tag">' + MF.gym.tagline.map(function (t) { return '<span>' + t + '</span>'; }).join('') + '</h1>' +
            '<ul class="login__facts"><li><strong>05:00–22:00</strong><span>Every day</span></li><li><strong>No contracts</strong><span>No hidden fees</span></li><li><strong>' + MF.activeMembers().length + '</strong><span>Members training</span></li></ul>' +
            '<p class="login__addr">' + MF.gym.address + '</p>' +
          '</section>' +
          '<section class="login__panel"><div class="login__card">' +
            '<h2>Sign in</h2><p class="muted">Run the gym from one screen.</p>' +
            '<div class="seg" role="radiogroup" aria-label="How to sign in" id="lg-mode"></div>' +
            '<div id="lg-body"></div>' +
            '<p class="faint login__note">' + icon('info', 'icon--sm') + 'Demo: any details work. Nothing is checked or stored.</p>' +
          '</div></section>' +
        '</div>';

      var $ = function (id) { return view.querySelector('#' + id); }, body = $('lg-body');

      function enter(name) {
        location.hash = '#/dashboard';
        ui.toast('Welcome back, ' + name + '.', 'success');
      }
      function paintMode() {
        $('lg-mode').innerHTML = [['owner', 'Owner'], ['staff', 'Staff PIN']].map(function (m) { return '<button class="seg__btn" type="button" role="radio" aria-checked="' + (mode === m[0]) + '" data-mode="' + m[0] + '">' + m[1] + '</button>'; }).join('');
      }
      function paintBody(animate) {
        pin = '';
        if (mode === 'owner') {
          body.innerHTML = '<form class="stack" id="lg-form" novalidate>' +
            '<div class="field"><label for="lg-email">Email</label><input class="input" id="lg-email" type="email" value="adam@muscleflex.example" autocomplete="off"></div>' +
            '<div class="field"><label for="lg-pass">Password</label><input class="input" id="lg-pass" type="password" placeholder="Anything — this is a demo" autocomplete="off"></div>' +
            '<button class="btn btn--primary btn--block" type="submit" data-autofocus>Sign in' + icon('chevronRight', 'icon--sm') + '</button>' +
            '<button class="btn btn--ghost btn--block" type="button" data-toast="A reset link would go to the owner\'s email." data-toast-type="info">Forgot password?</button></form>';
        } else {
          body.innerHTML = '<p class="muted" style="text-align:center">Enter your 4-digit PIN</p>' +
            '<div class="pin" id="lg-pin" role="status" aria-live="polite" aria-label="0 of 4 digits entered"><i></i><i></i><i></i><i></i></div>' +
            '<div class="keypad" id="lg-keys">' + ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'].map(function (k) {
              return k === 'clear' ? '<button class="key key--fn" type="button" data-key="clear">Clear</button>'
                : k === 'back' ? '<button class="key key--fn" type="button" data-key="back" aria-label="Delete last digit">' + icon('arrowLeft') + '</button>'
                : '<button class="key" type="button" data-key="' + k + '">' + k + '</button>';
            }).join('') + '</div>';
        }
        if (animate) motion.contentIn(body);
      }
      function paintPin() {
        var dots = body.querySelectorAll('.pin i');
        for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('is-on', i < pin.length);
        $('lg-pin').setAttribute('aria-label', pin.length + ' of 4 digits entered');
      }
      function press(k) {
        if (mode !== 'staff') return;
        if (k === 'clear') pin = ''; else if (k === 'back') pin = pin.slice(0, -1); else if (pin.length < 4) pin += k;
        paintPin();
        if (pin.length === 4) {
          var staff = MF.staff.filter(function (s) { return s.role !== 'Owner'; }), who = staff[+pin % staff.length];
          setTimeout(function () { enter(fmt.first(who.name)); }, 220);
        }
      }

      $('lg-mode').addEventListener('click', function (e) {
        var b = e.target.closest('[data-mode]');
        if (!b) return;
        mode = b.getAttribute('data-mode'); paintMode(); paintBody(true);
        $('lg-mode').querySelector('[aria-checked="true"]').focus();
      });
      body.addEventListener('submit', function (e) { e.preventDefault(); enter(MF.gym.owner.name); });
      body.addEventListener('click', function (e) {
        var b = e.target.closest('[data-key]');
        if (b) press(b.getAttribute('data-key'));
      });
      function onKey(e) {
        if (mode !== 'staff' || e.ctrlKey || e.metaKey || e.altKey) return;
        if (/^[0-9]$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('back');
      }
      document.addEventListener('keydown', onKey);

      paintMode(); paintBody(false);
      return function () { document.removeEventListener('keydown', onKey); };
    }
  });
})();
