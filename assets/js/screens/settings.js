/* Settings — STAGE 1 PLACEHOLDER. Real screen is built in stage 6. */
(function () {
  'use strict';
  var App = window.MFApp;

  App.screen("settings", {
    title: "Settings",
    render: function (view) {
      App.ui.placeholder(view, {
        title: "Settings",
        sub: "Your gym, your rules.",
        icon: "settings",
        stage: 6,
        items: [
          "Gym profile and opening hours",
          "Plans",
          "Roles and permissions",
          "Integrations",
          "Live accent colour picker"
        ]
      });
    }
  });
})();
