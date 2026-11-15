/* Memberships & passes — STAGE 1 PLACEHOLDER. Real screen is built in stage 4. */
(function () {
  'use strict';
  var App = window.MFApp;

  App.screen("memberships", {
    title: "Memberships & passes",
    render: function (view) {
      App.ui.placeholder(view, {
        title: "Memberships & passes",
        sub: "No contracts. No hidden fees. Clear prices.",
        icon: "ticket",
        stage: 4,
        items: [
          "Plan cards with £ prices",
          "Sales per plan",
          "Promo codes",
          "Freeze rules"
        ]
      });
    }
  });
})();
