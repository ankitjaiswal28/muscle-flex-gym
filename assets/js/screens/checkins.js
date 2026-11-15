/* Check-ins — STAGE 1 PLACEHOLDER. Real screen is built in stage 4. */
(function () {
  'use strict';
  var App = window.MFApp;

  App.screen("checkins", {
    title: "Check-ins",
    render: function (view) {
      App.ui.placeholder(view, {
        title: "Check-ins",
        sub: "Who's in, who's been, who shouldn't be.",
        icon: "scan",
        stage: 4,
        items: [
          "Today's list with hourly chart",
          "Simulated QR / kiosk scan",
          "Door log",
          "Unstaffed-hours security view"
        ]
      });
    }
  });
})();
