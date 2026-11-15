/* Staff & trainers — STAGE 1 PLACEHOLDER. Real screen is built in stage 5. */
(function () {
  'use strict';
  var App = window.MFApp;

  App.screen("staff", {
    title: "Staff & trainers",
    render: function (view) {
      App.ui.placeholder(view, {
        title: "Staff & trainers",
        sub: "Who's on, when, and what they bring in.",
        icon: "badge",
        stage: 5,
        items: [
          "Staff cards",
          "Rota for staffed hours",
          "PT revenue and commission"
        ]
      });
    }
  });
})();
