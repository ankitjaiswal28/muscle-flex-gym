/* Reports — STAGE 1 PLACEHOLDER. Real screen is built in stage 6. */
(function () {
  'use strict';
  var App = window.MFApp;

  App.screen("reports", {
    title: "Reports",
    render: function (view) {
      App.ui.placeholder(view, {
        title: "Reports",
        sub: "The numbers that matter. Nothing else.",
        icon: "chart",
        stage: 6,
        items: [
          "Date range picker",
          "Revenue and LTV",
          "Retention and churn cohorts",
          "Attendance and peak hours"
        ]
      });
    }
  });
})();
