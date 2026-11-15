/* Login — STAGE 1 PLACEHOLDER (proves chrome-less "bare" routes).
   Real split-screen login with staff PIN is built in stage 6. */
(function () {
  'use strict';
  var App = window.MFApp, MF = window.MF, icon = App.icon;

  App.screen('login', {
    title: 'Sign in',
    render: function (view) {
      view.innerHTML =
        '<div class="bare"><div class="bare__card stack stack--lg">' +
          '<div class="row"><span class="brand__mark" aria-hidden="true">MF</span>' +
          '<span class="brand__word">Muscle <span>Flex</span><small class="brand__sub">SHREWSBURY</small></span></div>' +
          '<h1 class="bare__tag">' + MF.gym.tagline.map(function (t) { return '<span>' + t + '</span>'; }).join('') + '</h1>' +
          '<p class="muted">Split-screen sign-in with staff PIN lands in stage 6. For now, walk straight in.</p>' +
          '<a class="btn btn--primary btn--block" href="#/dashboard" data-autofocus>' + icon('arrowUpRight', 'icon--sm') + 'Enter dashboard</a>' +
          '<p class="faint" style="font-size:var(--fs-12)">' + MF.gym.address + '</p>' +
        '</div></div>';
    }
  });
})();
