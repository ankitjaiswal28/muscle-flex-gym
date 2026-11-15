/* Follow-ups — STAGE 1 PLACEHOLDER. Real screen is built in stage 5. */
(function () {
  'use strict';
  var App = window.MFApp;

  App.screen("followups", {
    title: "Follow-ups",
    render: function (view) {
      App.ui.placeholder(view, {
        title: "Follow-ups",
        sub: "Calls to make today. Nobody slips through.",
        icon: "phoneCall",
        stage: 5,
        items: [
          "Today / overdue / upcoming",
          "Call outcome logging",
          "Message templates"
        ]
      });
    }
  });
})();
