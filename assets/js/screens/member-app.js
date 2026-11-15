/* Member app preview — STAGE 1 PLACEHOLDER. Real screen is built in stage 6. */
(function () {
  'use strict';
  var App = window.MFApp;

  App.screen("member-app", {
    title: "Member app preview",
    render: function (view) {
      App.ui.placeholder(view, {
        title: "Member app preview",
        sub: "What your members carry in their pocket.",
        icon: "smartphone",
        stage: 6,
        items: [
          "Phone-frame mockup",
          "QR check-in and streak",
          "Bookings and progress",
          "Busy-now meter and best time to train"
        ]
      });
    }
  });
})();
