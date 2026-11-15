/* Classes & PT — STAGE 1 PLACEHOLDER. Real screen is built in stage 5. */
(function () {
  'use strict';
  var App = window.MFApp;

  App.screen("classes", {
    title: "Classes & PT",
    render: function (view) {
      App.ui.placeholder(view, {
        title: "Classes & PT",
        sub: "The week on the floor, at a glance.",
        icon: "calendar",
        stage: 5,
        items: [
          "Weekly calendar",
          "Trainer filter",
          "Capacity and waitlists",
          "Booking drawer"
        ]
      });
    }
  });
})();
