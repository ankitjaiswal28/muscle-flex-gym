/* Messages — STAGE 1 PLACEHOLDER. Real screen is built in stage 6. */
(function () {
  'use strict';
  var App = window.MFApp;

  App.screen("messages", {
    title: "Messages",
    render: function (view) {
      App.ui.placeholder(view, {
        title: "Messages",
        sub: "WhatsApp, SMS and email from one place.",
        icon: "message",
        stage: 6,
        items: [
          "Composer with live phone preview",
          "Member segments",
          "Automations: Welcome, Birthday, Missed you, Renewal, Payment failed"
        ]
      });
    }
  });
})();
