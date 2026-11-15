/* Payments — STAGE 1 PLACEHOLDER. Real screen is built in stage 4. */
(function () {
  'use strict';
  var App = window.MFApp;

  App.screen("payments", {
    title: "Payments",
    render: function (view) {
      App.ui.placeholder(view, {
        title: "Payments",
        sub: "Direct Debits, desk sales and what's still owed.",
        icon: "card",
        stage: 4,
        items: [
          "Direct Debit status: Paid / Pending / Failed / Retry",
          "Overdue list with one-click reminders",
          "POS sales: supplements, drinks, merch",
          "Receipt drawer"
        ]
      });
    }
  });
})();
