/* ==========================================================================
   MUSCLE FLEX — inline SVG line icons (24px grid, 1.75 stroke, currentColor)
   Usage: MFApp.icon('users')  /  <i data-icon="users"></i> + MFApp.hydrateIcons()
   ========================================================================== */
(function () {
  'use strict';
  var App = window.MFApp = window.MFApp || {};

  var P = {
    dashboard: '<rect x="3" y="3" width="8" height="10" rx="1.5"/><rect x="13" y="3" width="8" height="6" rx="1.5"/><rect x="13" y="12" width="8" height="9" rx="1.5"/><rect x="3" y="16" width="8" height="5" rx="1.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.900 1.900 6.500 5.500"/><path d="M16 4.800a3.500 3.500 0 0 1 0 6.400"/><path d="M18.500 14.900c1.700.800 2.700 2.500 3 5.100"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 3.900-6 8-6s7.200 2 8 6"/>',
    userPlus: '<circle cx="10" cy="8" r="4"/><path d="M2.500 21c.700-4 3.600-6 7.500-6 1.600 0 3 .300 4.200 1"/><path d="M19 14v6M16 17h6"/>',
    scan: '<path d="M4 8V5.500A1.500 1.500 0 0 1 5.500 4H8M16 4h2.500A1.500 1.500 0 0 1 20 5.500V8M20 16v2.500a1.500 1.500 0 0 1-1.500 1.500H16M8 20H5.500A1.500 1.500 0 0 1 4 18.500V16"/><rect x="8" y="8" width="3" height="3" rx=".5"/><rect x="13" y="8" width="3" height="3" rx=".5"/><rect x="8" y="13" width="3" height="3" rx=".5"/><path d="M13.500 13.500h2.500v2.500"/>',
    ticket: '<path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6Z"/><path d="M14 5v3M14 11v2M14 16v3"/>',
    card: '<rect x="2.500" y="5" width="19" height="14" rx="2.500"/><path d="M2.500 10h19M6.500 15h4"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.200"/>',
    phoneCall: '<path d="M5 3.500h3.200l1.600 4.200-2 1.400a12 12 0 0 0 5.100 5.100l1.400-2 4.200 1.600V17a2.500 2.500 0 0 1-2.700 2.500A15.500 15.500 0 0 1 2.500 6.200 2.500 2.500 0 0 1 5 3.500Z"/><path d="M15 4.500a5 5 0 0 1 4.500 4.500"/>',
    phone: '<path d="M5 3.500h3.200l1.600 4.200-2 1.400a12 12 0 0 0 5.100 5.100l1.400-2 4.200 1.600V17a2.500 2.500 0 0 1-2.700 2.500A15.500 15.500 0 0 1 2.500 6.200 2.500 2.500 0 0 1 5 3.500Z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2.500"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    badge: '<rect x="4" y="4" width="16" height="17" rx="2.500"/><path d="M9 4V2.500h6V4"/><circle cx="12" cy="11" r="2.500"/><path d="M8 17.500c.600-1.700 2-2.500 4-2.500s3.400.800 4 2.500"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    message: '<path d="M21 11.500a8.500 8.500 0 0 1-12.600 7.400L3 20.500l1.600-5A8.500 8.500 0 1 1 21 11.500Z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.400 13.500a7.600 7.600 0 0 0 0-3l2-1.500-2-3.500-2.400 1a7.600 7.600 0 0 0-2.600-1.500L14 2.500h-4l-.400 2.500A7.600 7.600 0 0 0 7 6.500l-2.400-1-2 3.500 2 1.500a7.600 7.600 0 0 0 0 3l-2 1.500 2 3.500 2.400-1a7.600 7.600 0 0 0 2.600 1.500l.400 2.500h4l.400-2.500a7.600 7.600 0 0 0 2.600-1.500l2.400 1 2-3.500-2-1.500Z"/>',
    smartphone: '<rect x="6.500" y="2.500" width="11" height="19" rx="2.500"/><path d="M10.500 18.500h3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20.500 20.500-4.500-4.500"/>',
    bell: '<path d="M6 16.500V11a6 6 0 1 1 12 0v5.500l1.500 2h-15l1.500-2Z"/><path d="M10 21h4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.500v2M12 19.500v2M2.500 12h2M19.500 12h2M5.300 5.300l1.400 1.400M17.300 17.300l1.400 1.400M5.300 18.700l1.400-1.400M17.300 6.700l1.400-1.400"/>',
    moon: '<path d="M20.500 14A8.500 8.500 0 0 1 10 3.500a8.500 8.500 0 1 0 10.500 10.500Z"/>',
    chevronRight: '<path d="m9 5 7 7-7 7"/>',
    chevronDown: '<path d="m5 9 7 7 7-7"/>',
    arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    arrowUpRight: '<path d="M7 17 17 7M8 7h9v9"/>',
    arrowDownRight: '<path d="M7 7l10 10M17 8v9H8"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m4.500 12.500 5 5 10-11"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12.500 3 3 5-6"/>',
    alert: '<path d="M12 3.500 2.500 20h19L12 3.500Z"/><path d="M12 10v4.500M12 17.300v.200"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.500M12 7.500v.200"/>',
    logout: '<path d="M14 4h4.500A1.500 1.500 0 0 1 20 5.500v13a1.500 1.500 0 0 1-1.500 1.500H14"/><path d="M10 8l-4 4 4 4M6 12h9"/>',
    more: '<circle cx="5" cy="12" r="1.300"/><circle cx="12" cy="12" r="1.300"/><circle cx="19" cy="12" r="1.300"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    refresh: '<path d="M20 12a8 8 0 0 1-14.300 4.900M4 12a8 8 0 0 1 14.300-4.900"/><path d="M18.500 3v4.500H14M5.500 21v-4.500H10"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M4.500 20h15"/>',
    filter: '<path d="M3.500 5h17l-6.500 8v5.500l-4 1.500v-7L3.500 5Z"/>',
    dumbbell: '<path d="M6.500 6.500v11M3.500 9v6M17.500 6.500v11M20.500 9v6M6.500 12h11"/>',
    shield: '<path d="M12 3 4.500 6v5.500c0 4.500 3 7.900 7.500 9.500 4.500-1.600 7.500-5 7.500-9.500V6L12 3Z"/><path d="m9 12 2.200 2.200L15.200 10"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.300l3.300 2"/>',
    pound: '<path d="M17 7.500A4 4 0 0 0 9.500 9c0 2 .800 3 .800 5 0 2.200-1.300 3.700-3.300 5h10.500M6.500 13h7.500"/>',
    flame: '<path d="M12 3c.500 3.500 5 5.500 5 10.500a5 5 0 0 1-10 0c0-2 1-3.400 2-4.500.300 1.600 1 2.500 2 3 .300-3-.500-6 1-9Z"/>',
    lock: '<rect x="5" y="10.500" width="14" height="10" rx="2.500"/><path d="M8 10.500V8a4 4 0 0 1 8 0v2.500"/>',
    cake: '<path d="M4 20.500v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7H4Z"/><path d="M4 16c1.500 1.200 2.500 1.200 4 0s2.500-1.200 4 0 2.500 1.200 4 0 2.500-1.200 4 0M12 11.500V8M12 5v.200"/>',
    command: '<path d="M9 9h6v6H9zM9 9V6.500A2.500 2.500 0 1 0 6.500 9H9ZM15 9h2.500A2.500 2.500 0 1 0 15 6.500V9ZM15 15v2.500a2.500 2.500 0 1 0 2.500-2.500H15ZM9 15H6.500A2.500 2.500 0 1 0 9 17.500V15Z"/>'
  };

  App.icon = function (name, cls) {
    var body = P[name] || P.info;
    return '<svg class="icon' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + body + '</svg>';
  };

  /* Replace <i data-icon="name"> placeholders inside root */
  App.hydrateIcons = function (root) {
    var nodes = (root || document).querySelectorAll('i[data-icon]');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      n.outerHTML = App.icon(n.getAttribute('data-icon'), n.className || '');
    }
  };
})();
