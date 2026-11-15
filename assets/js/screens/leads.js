/* Leads & enquiries — STAGE 1 PLACEHOLDER. Real screen is built in stage 5. */
(function () {
  'use strict';
  var App = window.MFApp;

  App.screen("leads", {
    title: "Leads & enquiries",
    render: function (view) {
      App.ui.placeholder(view, {
        title: "Leads & enquiries",
        sub: "Every enquiry, from first message to first session.",
        icon: "target",
        stage: 5,
        items: [
          "Drag-and-drop kanban: New → Contacted → Trial → Visited → Joined / Lost",
          "Lead sources: Instagram, Walk-in, Google, Referral, Website",
          "Conversion funnel"
        ]
      });
    }
  });
})();
