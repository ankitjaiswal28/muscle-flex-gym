/* ==========================================================================
   MUSCLE FLEX — all demo data, one object: window.MF
   100% FAKE. Names are random first/last combinations, phones use the Ofcom
   drama-reserved range (07700 900xxx), emails use example.com.
   Seeded generator → identical data on every load, dated relative to today.
   ========================================================================== */
(function () {
  'use strict';

  /* ---- seeded random ---------------------------------------------------- */
  var seed = 20260410;
  function rnd() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function int(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
  function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
  function chance(p) { return rnd() < p; }
  function weighted(pairs) {
    var total = 0, i, r;
    for (i = 0; i < pairs.length; i++) total += pairs[i][1];
    r = rnd() * total;
    for (i = 0; i < pairs.length; i++) { r -= pairs[i][1]; if (r <= 0) return pairs[i][0]; }
    return pairs[pairs.length - 1][0];
  }

  /* ---- demo clock ------------------------------------------------------- */
  /* Real time, but if the laptop is opened outside lively hours the demo
     clamps to 18:10 so the pitch never shows an empty gym. */
  function now() {
    var d = new Date();
    var mins = d.getHours() * 60 + d.getMinutes();
    if (mins < 6 * 60 || mins > 21 * 60 + 30) d.setHours(18, 10, 0, 0);
    return d;
  }
  var NOW = now();
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function daysFromNow(n) { var d = new Date(NOW); d.setDate(d.getDate() + n); return d; }
  function isoIn(n) { return iso(daysFromNow(n)); }
  function hhmm(mins) { return pad(Math.floor(mins / 60)) + ':' + pad(mins % 60); }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ---- gym -------------------------------------------------------------- */
  var gym = {
    name: 'MUSCLE FLEX GYM',
    short: 'Muscle Flex',
    tagline: ['REAL GYM.', 'REAL PEOPLE.', 'REAL PROGRESS.'],
    address: 'Unit 10D, Nine Bridges, Shrewsbury SY1 3AS',
    phone: '01743 000 100',
    email: 'hello@muscleflex.example',
    owner: { name: 'Adam', role: 'Owner', initials: 'AD' },
    capacity: 90,
    open: { from: 5, to: 22 },
    staffed: { weekday: { from: 10, to: 22 }, weekend: { from: 8, to: 14 } },
    hoursText: {
      weekday: 'Mon–Fri 05:00–22:00 (staffed 10:00–22:00)',
      weekend: 'Sat–Sun 05:00–22:00 (staffed 08:00–14:00)'
    },
    monthTarget: 580000
  };

  function status(d) {
    d = d || NOW;
    var h = d.getHours() + d.getMinutes() / 60;
    var weekend = d.getDay() === 0 || d.getDay() === 6;
    var st = weekend ? gym.staffed.weekend : gym.staffed.weekday;
    var open = h >= gym.open.from && h < gym.open.to;
    var staffed = open && h >= st.from && h < st.to;
    var label, detail;
    if (!open) { label = 'Closed'; detail = 'Doors open 05:00'; }
    else if (staffed) { label = 'Staffed'; detail = 'Team on until ' + pad(st.to) + ':00'; }
    else if (h < st.from) { label = 'Unstaffed'; detail = 'Team in from ' + pad(st.from) + ':00'; }
    else { label = 'Unstaffed'; detail = 'Door access until 22:00'; }
    return { open: open, staffed: staffed, label: label, detail: detail };
  }

  /* ---- plans ------------------------------------------------------------ */
  var plans = [
    { id: 'monthly',  name: 'Monthly Rolling', price: 2499, period: 'month', kind: 'membership', blurb: 'No contract. Cancel any time.' },
    { id: 'offpeak',  name: 'Off-Peak',        price: 1799, period: 'month', kind: 'membership', blurb: 'Train 10:00–16:00 and weekends.' },
    { id: 'student',  name: 'Student',         price: 1999, period: 'month', kind: 'membership', blurb: 'Valid student ID. Same full access.' },
    { id: 'couples',  name: 'Couples',         price: 4499, period: 'month', kind: 'membership', blurb: 'Two people, one Direct Debit.' },
    { id: 'annual',   name: 'Annual',          price: 24999, period: 'year',  kind: 'membership', blurb: 'Pay once. Two months free.' },
    { id: 'week',     name: 'Week Pass',       price: 999, period: '7 days', kind: 'pass', blurb: 'Seven days, full access.' },
    { id: 'day',      name: 'Day Pass',        price: 399, period: 'day',   kind: 'pass', blurb: 'Walk in. Train. Done.' }
  ];
  var planById = {};
  plans.forEach(function (p) { planById[p.id] = p; });

  /* ---- people ----------------------------------------------------------- */
  var FIRST = ['Oliver', 'Jack', 'Harry', 'George', 'Callum', 'Liam', 'Rhys', 'Owen', 'Dylan', 'Ethan', 'Kieran', 'Connor',
    'Tom', 'Ben', 'Sam', 'Luke', 'Josh', 'Ryan', 'Aaron', 'Nathan', 'Marcus', 'Jamal', 'Imran', 'Ravi', 'Kofi', 'Piotr',
    'Amelia', 'Olivia', 'Isla', 'Freya', 'Megan', 'Chloe', 'Ellie', 'Hannah', 'Lucy', 'Katie', 'Sophie', 'Jess',
    'Priya', 'Aisha', 'Zara', 'Niamh', 'Bethan', 'Carys', 'Leah', 'Grace', 'Holly', 'Abi', 'Tanya', 'Magda'];
  var LAST = ['Hughes', 'Jones', 'Davies', 'Evans', 'Price', 'Morris', 'Lloyd', 'Griffiths', 'Powell', 'Bevan', 'Cartwright',
    'Fletcher', 'Whitfield', 'Ashdown', 'Marlow', 'Holloway', 'Pemberton', 'Brooks', 'Bailey', 'Foster', 'Hayes',
    'Barker', 'Dawson', 'Kemp', 'Lawson', 'Okafor', 'Mensah', 'Patel', 'Khan', 'Sharma', 'Kowalski', 'Novak',
    'Thornley', 'Radcliffe', 'Sutton', 'Tindall', 'Vaughan', 'Wyatt', 'Yardley', 'Blythe'];

  var usedNames = {};
  function person() {
    var n, tries = 0;
    do { n = pick(FIRST) + ' ' + pick(LAST); tries++; } while (usedNames[n] && tries < 40);
    usedNames[n] = true;
    return n;
  }
  var phoneSeq = 100;
  function phone() { phoneSeq += int(1, 6); return '07700 900' + (phoneSeq % 1000 < 100 ? '0' : '') + (phoneSeq % 1000 < 10 ? '0' : '') + (phoneSeq % 1000); }
  function email(name) { return name.toLowerCase().replace(/[^a-z]+/g, '.') + '@example.com'; }

  /* ---- members ---------------------------------------------------------- */
  var members = [];
  var GOALS = ['Build muscle', 'Lose fat', 'Powerlifting', 'General fitness', 'Bodybuilding prep', 'Strength for sport'];
  for (var i = 0; i < 128; i++) {
    var name = person();
    var planId = weighted([['monthly', 52], ['offpeak', 12], ['student', 14], ['couples', 8], ['annual', 9], ['week', 3], ['day', 2]]);
    var plan = planById[planId];
    var st = weighted([['active', 76], ['frozen', 5], ['overdue', 7], ['expired', 6], ['expiring', 6]]);
    if (plan.kind === 'pass') st = chance(.6) ? 'active' : 'expired';

    var joinedAgo = int(6, 900);
    var lastSeen, visits30, expires;
    if (st === 'expired') { lastSeen = int(20, 90); visits30 = 0; expires = isoIn(-int(3, 40)); }
    else if (st === 'frozen') { lastSeen = int(15, 60); visits30 = int(0, 2); expires = isoIn(int(20, 60)); }
    else if (st === 'expiring') { lastSeen = int(0, 9); visits30 = int(4, 16); expires = isoIn(int(1, 7)); }
    else if (st === 'overdue') { lastSeen = int(1, 25); visits30 = int(1, 12); expires = isoIn(-int(1, 12)); }
    else { lastSeen = weighted([[0, 18], [1, 22], [2, 16], [4, 14], [8, 10], [15, 9], [22, 6], [31, 5]]) + int(0, 2); visits30 = Math.max(0, int(2, 22) - Math.floor(lastSeen / 3)); expires = isoIn(int(8, 30)); }
    if (planId === 'annual' && st === 'active') expires = isoIn(int(30, 330));
    if (lastSeen > joinedAgo) lastSeen = joinedAgo;

    var dd = plan.kind === 'pass' || planId === 'annual' ? 'n/a'
      : st === 'overdue' ? pick(['Failed', 'Failed', 'Retry'])
      : st === 'frozen' ? 'Paused'
      : st === 'expired' ? 'Cancelled'
      : weighted([['Paid', 90], ['Pending', 10]]);

    var risk = Math.round(Math.min(98, Math.max(3,
      lastSeen * 2.6 + (12 - Math.min(12, visits30)) * 2.4 + (dd === 'Failed' ? 22 : dd === 'Retry' ? 14 : 0) +
      (joinedAgo < 60 ? 8 : 0) + int(-6, 6))));
    if (st === 'expired') risk = Math.max(risk, 85);

    var dob = new Date(NOW.getFullYear() - int(18, 54), int(0, 11), int(1, 28));
    members.push({
      id: 'MF' + (1001 + i),
      name: name,
      initials: name.split(' ').map(function (p) { return p[0]; }).join(''),
      phone: phone(),
      email: email(name),
      plan: planId,
      status: st,
      joined: isoIn(-joinedAgo),
      expires: expires,
      lastVisit: isoIn(-lastSeen),
      daysSinceVisit: lastSeen,
      visits30: visits30,
      streak: lastSeen <= 1 ? int(1, 9) : 0,
      totalVisits: Math.round(joinedAgo / 7 * (1.5 + rnd() * 2.5)),
      dd: dd,
      churnRisk: risk,
      goal: pick(GOALS),
      dob: iso(dob),
      pt: chance(.16),
      waiver: chance(.94),
      parq: chance(.9)
    });
  }
  /* a few birthdays this week + milestones so the dashboard has something to show */
  [3, 17, 42, 77].forEach(function (ix, n) {
    var d = daysFromNow(n * 2);
    members[ix].dob = (NOW.getFullYear() - int(22, 45)) + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  });
  var memberById = {};
  members.forEach(function (m) { memberById[m.id] = m; });
  function activeMembers() { return members.filter(function (m) { return m.status !== 'expired'; }); }

  /* ---- busy-hours heatmap: 7 days (Mon first) × 05–21h, values 0–100 ----- */
  var HOURS = []; for (var h = 5; h <= 21; h++) HOURS.push(h);
  function bump(x, mu, sigma, amp) { return amp * Math.exp(-Math.pow(x - mu, 2) / (2 * sigma * sigma)); }
  var heatmap = [];
  for (var dow = 0; dow < 7; dow++) {
    var weekend = dow >= 5, row = [];
    for (var k = 0; k < HOURS.length; k++) {
      var hr = HOURS[k];
      var v = weekend
        ? bump(hr, 10, 2.1, 78) + bump(hr, 16, 2.4, 34)
        : bump(hr, 6.5, 1.1, 58) + bump(hr, 12.5, 1.3, 30) + bump(hr, 18, 1.7, dow === 0 ? 100 : dow === 4 ? 68 : 90);
      row.push(Math.round(Math.min(100, Math.max(4, v + int(-5, 5)))));
    }
    heatmap.push(row);
  }
  var todayDow = (NOW.getDay() + 6) % 7;
  function busyAt(dowIx, hour) {
    var ix = HOURS.indexOf(hour);
    return ix < 0 ? 0 : heatmap[dowIx][ix];
  }

  /* ---- today's check-ins ------------------------------------------------ */
  var nowMins = NOW.getHours() * 60 + NOW.getMinutes();
  var pool = members.filter(function (m) { return m.status === 'active' || m.status === 'expiring' || m.status === 'overdue'; });
  var checkins = [];
  var usedToday = {};
  /* Check-ins depend on the time of day, so they draw from their own random
     stream — otherwise the clock would shift every dataset generated after this. */
  var mainSeed = seed; seed = 5150;
  HOURS.forEach(function (hr) {
    var n = Math.round(busyAt(todayDow, hr) / 100 * 26);
    for (var c = 0; c < n; c++) {
      var mins = hr * 60 + int(0, 59);
      if (mins > nowMins) continue;
      var m = pick(pool), guard = 0;
      while (usedToday[m.id] && guard++ < 20) m = pick(pool);
      usedToday[m.id] = true;
      var s = status(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), hr, mins % 60));
      checkins.push({
        time: hhmm(mins), mins: mins, memberId: m.id,
        method: weighted([['QR', 62], ['Fob', 28], ['Kiosk', 10]]),
        staffed: s.staffed,
        flag: m.status === 'overdue' ? 'Payment overdue' : null,
        result: m.status === 'overdue' ? 'Flagged' : 'Granted'
      });
    }
  });
  /* a few door events that were NOT a clean entry — for the door log and security view */
  var lapsed = members.filter(function (m) { return m.status === 'expired'; });
  [[6 * 60 + 12, 'Flagged', 'Tailgating: two people, one scan'], [7 * 60 + 41, 'Denied', 'Membership expired'],
    [17 * 60 + 26, 'Denied', 'Membership expired'], [20 * 60 + 8, 'Flagged', 'Door held open 40 seconds']].forEach(function (ev, n) {
    if (ev[0] > nowMins) return;
    var who = ev[1] === 'Denied' ? lapsed[n % lapsed.length] : pick(pool);
    var sd = status(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), Math.floor(ev[0] / 60), ev[0] % 60));
    checkins.push({ time: hhmm(ev[0]), mins: ev[0], memberId: who.id, method: 'QR', staffed: sd.staffed, flag: ev[2], result: ev[1] });
  });
  checkins.sort(function (a, b) { return b.mins - a.mins; });
  seed = mainSeed;
  var st0 = status(NOW);
  var onFloor = st0.open ? Math.max(6, Math.round(busyAt(todayDow, NOW.getHours()) / 100 * gym.capacity * .82)) : 0;

  /* ---- revenue ---------------------------------------------------------- */
  var revenue12 = [];
  var base = 376000;
  for (var mth = 11; mth >= 0; mth--) {
    var d = new Date(NOW.getFullYear(), NOW.getMonth() - mth, 1);
    var seasonal = d.getMonth() === 0 ? 60000 : d.getMonth() === 1 ? 36000 : d.getMonth() === 8 ? 24000 : d.getMonth() === 11 ? -28000 : 0;
    var value = Math.round((base + (11 - mth) * 15600 + seasonal + int(-14000, 14000)) / 100) * 100;
    revenue12.push({ label: MONTHS[d.getMonth()], year: d.getFullYear(), revenue: value, target: Math.round((base + (11 - mth) * 16800 + 12000) / 1000) * 1000 });
  }
  var dim = new Date(NOW.getFullYear(), NOW.getMonth() + 1, 0).getDate();
  var monthProgress = NOW.getDate() / dim;
  var mtd = Math.round(gym.monthTarget * Math.min(1, monthProgress * 1.06 + .03) / 100) * 100;
  var cur = revenue12[11];
  cur.revenue = mtd; cur.target = gym.monthTarget; cur.partial = true;
  var lastMonthSameDay = Math.round(revenue12[10].revenue * monthProgress / 100) * 100;

  function spark(n, start, end, noise) {
    var out = [];
    for (var s = 0; s < n; s++) out.push(Math.round(start + (end - start) * (s / (n - 1)) + (rnd() - .5) * noise));
    return out;
  }

  /* ---- payments --------------------------------------------------------- */
  var products = [
    { id: 'p1', name: 'Whey Protein 1kg', cat: 'Supplements', price: 2799 },
    { id: 'p2', name: 'Creatine 250g', cat: 'Supplements', price: 1199 },
    { id: 'p3', name: 'Pre-Workout Tub', cat: 'Supplements', price: 1899 },
    { id: 'p4', name: 'Protein Shake', cat: 'Drinks', price: 249 },
    { id: 'p5', name: 'Energy Drink', cat: 'Drinks', price: 120 },
    { id: 'p6', name: 'Water 750ml', cat: 'Drinks', price: 40 },
    { id: 'p7', name: 'MF Stringer Vest', cat: 'Merch', price: 899 },
    { id: 'p8', name: 'MF Hoodie', cat: 'Merch', price: 1999 },
    { id: 'p9', name: 'Lifting Straps', cat: 'Merch', price: 499 }
  ];
  var payments = [];
  var payNo = 48210;
  members.forEach(function (m) {
    var p = planById[m.plan];
    if (m.dd === 'n/a' || m.dd === 'Cancelled' || m.dd === 'Paused') return;
    payments.push({
      id: 'PAY-' + (payNo++), memberId: m.id, type: 'Direct Debit', item: p.name,
      amount: p.price, status: m.dd, date: isoIn(-int(0, Math.max(0, NOW.getDate() - 1))), time: hhmm(int(6 * 60, 9 * 60)),
      attempts: m.dd === 'Failed' ? int(1, 2) : m.dd === 'Retry' ? 2 : 1
    });
  });
  for (var q = 0; q < 34; q++) {
    var prod = pick(products), buyer = pick(pool), ago = q < 12 ? 0 : int(1, 9);
    var tmin = ago === 0 ? int(6 * 60, Math.max(6 * 60 + 5, nowMins)) : int(6 * 60, 21 * 60);
    payments.push({
      id: 'PAY-' + (payNo++), memberId: buyer.id, type: 'POS', item: prod.name, cat: prod.cat,
      amount: prod.price * (chance(.2) ? 2 : 1), status: 'Paid', date: isoIn(-ago), time: hhmm(tmin), method: pick(['Card', 'Card', 'Contactless', 'Cash'])
    });
  }
  for (var w = 0; w < 9; w++) {
    var pass = chance(.6) ? planById.day : planById.week, ago2 = w < 4 ? 0 : int(1, 6);
    payments.push({
      id: 'PAY-' + (payNo++), memberId: null, guest: person(), type: 'Pass', item: pass.name,
      amount: pass.price, status: 'Paid', date: isoIn(-ago2), time: hhmm(int(6 * 60, ago2 === 0 ? Math.max(6 * 60 + 5, nowMins) : 20 * 60)), method: 'Card'
    });
  }
  payments.sort(function (a, b) { return (b.date + b.time).localeCompare(a.date + a.time); });
  var todayIso = iso(NOW);
  var revenueToday = payments.filter(function (p) { return p.date === todayIso && p.status === 'Paid'; })
    .reduce(function (s, p) { return s + p.amount; }, 0);
  revenueToday = Math.round((revenueToday + 7500 + nowMins * 7) / 10) * 10;   /* plus memberships collected today */
  var overdueTotal = payments.filter(function (p) { return p.status === 'Failed' || p.status === 'Retry'; })
    .reduce(function (s, p) { return s + p.amount; }, 0);

  /* ---- staff & trainers ------------------------------------------------- */
  var staff = [
    { id: 's1', name: 'Adam', role: 'Owner', initials: 'AD', pt: false, phone: '07700 900001', shift: 'Flexible', ptRevenue: 0, commission: 0 },
    { id: 's2', name: 'Dan Whitlock', role: 'Head Coach', initials: 'DW', pt: true, phone: '07700 900002', shift: 'Mon–Fri 10:00–18:00', ptRevenue: 95200, commission: 60, speciality: 'Powerlifting' },
    { id: 's3', name: 'Carys Bowen', role: 'PT / Front Desk', initials: 'CB', pt: true, phone: '07700 900003', shift: 'Mon–Thu 14:00–22:00', ptRevenue: 73600, commission: 55, speciality: 'Fat loss, beginners' },
    { id: 's4', name: 'Marcus Ofori', role: 'Personal Trainer', initials: 'MO', pt: true, phone: '07700 900004', shift: 'Tue–Sat 12:00–20:00', ptRevenue: 84800, commission: 55, speciality: 'Bodybuilding prep' },
    { id: 's5', name: 'Leah Stanton', role: 'Front Desk', initials: 'LS', pt: false, phone: '07700 900005', shift: 'Sat–Sun 08:00–14:00', ptRevenue: 0, commission: 0 },
    { id: 's6', name: 'Rhys Maddock', role: 'Front Desk / Sales', initials: 'RM', pt: false, phone: '07700 900006', shift: 'Fri 14:00–22:00, Mon 10:00–14:00', ptRevenue: 0, commission: 0 }
  ];
  var trainers = staff.filter(function (s) { return s.pt; });

  /* ---- classes (weekly timetable, day 0 = Mon) --------------------------- */
  var CLASS_DEFS = [
    ['Strength Foundations', 60, 12, 's2'], ['Barbell Club', 75, 10, 's2'], ['Conditioning Circuit', 45, 16, 's3'],
    ['Glutes & Legs', 60, 14, 's3'], ['Physique Posing', 45, 8, 's4'], ['Push / Pull Clinic', 60, 10, 's4'],
    ['Beginner Induction', 45, 6, 's3'], ['Saturday Strongman', 90, 12, 's2']
  ];
  var classes = [];
  var SLOTS = [[0, 18], [0, 19.25], [1, 12], [1, 18.5], [2, 6.5], [2, 18], [3, 12], [3, 19], [4, 17.5], [5, 9], [5, 10.75], [6, 10]];
  SLOTS.forEach(function (sl, n) {
    var def = n === 9 ? CLASS_DEFS[7] : CLASS_DEFS[n % 7];
    var booked = Math.min(def[2], int(Math.floor(def[2] * .45), def[2] + 1));
    classes.push({ id: 'c' + (n + 1), day: sl[0], start: hhmm(Math.round(sl[1] * 60)), mins: def[1], name: def[0], capacity: def[2], booked: booked, trainerId: def[3], waitlist: booked >= def[2] ? int(1, 3) : 0 });
  });
  var ptSessions = [];
  for (var ps = 0; ps < 14; ps++) {
    var tr = pick(trainers), cl = pick(pool);
    ptSessions.push({ id: 'pt' + (ps + 1), day: int(0, 6), start: hhmm(pick([7, 8, 11, 13, 15, 16, 17, 20]) * 60), mins: 60, trainerId: tr.id, memberId: cl.id, price: 1200, status: pick(['Booked', 'Booked', 'Booked', 'Completed']) });
  }

  /* ---- leads ------------------------------------------------------------ */
  var SOURCES = ['Instagram', 'Walk-in', 'Google', 'Referral', 'Website'];
  var STAGES = ['New', 'Contacted', 'Trial', 'Visited', 'Joined', 'Lost'];
  var INTEREST = ['Monthly Rolling', 'Student', 'Couples', 'Annual', 'PT package', 'Day pass first'];
  var leads = [];
  for (var l = 0; l < 30; l++) {
    var stage = weighted([['New', 8], ['Contacted', 7], ['Trial', 5], ['Visited', 4], ['Joined', 4], ['Lost', 2]]);
    var created = int(0, 21);
    leads.push({
      id: 'L' + (301 + l), name: person(), phone: phone(), stage: stage,
      source: weighted([['Instagram', 34], ['Walk-in', 22], ['Google', 18], ['Referral', 16], ['Website', 10]]),
      interest: pick(INTEREST), created: isoIn(-created),
      lastContact: stage === 'New' ? null : isoIn(-int(0, Math.max(0, created - 1))),
      owner: pick(['s3', 's5', 's6']), value: pick([1799, 1999, 2499, 2499, 4499, 24999]),
      note: pick(['Wants to try before joining.', 'Training for a first comp.', 'Moving from a chain gym.', 'Asked about 05:00 access.', 'Friend already trains here.', 'Needs a beginner plan.'])
    });
  }

  /* ---- follow-ups ------------------------------------------------------- */
  var FU_REASON = ['Renewal due', 'Payment failed', 'Missed you — 14 days', 'Trial feedback', 'New enquiry call-back', 'Freeze ending'];
  var followups = [];
  for (var f = 0; f < 22; f++) {
    var due = weighted([[-3, 3], [-2, 3], [-1, 4], [0, 9], [1, 5], [2, 4], [4, 3]]);
    var isLead = chance(.35), who = isLead ? pick(leads) : pick(members);
    followups.push({
      id: 'F' + (501 + f), kind: isLead ? 'lead' : 'member', refId: who.id, name: who.name, phone: who.phone,
      reason: isLead ? pick(['Trial feedback', 'New enquiry call-back']) : pick(FU_REASON),
      due: isoIn(due), dueIn: due, time: hhmm(pick([10, 11, 12, 14, 15, 16, 17]) * 60 + pick([0, 30])),
      owner: pick(['s3', 's5', 's6', 's1']), done: false, outcome: null
    });
  }
  followups.sort(function (a, b) { return a.dueIn - b.dueIn || a.time.localeCompare(b.time); });

  /* ---- promos, freeze rules, messaging ---------------------------------- */
  var promos = [
    { code: 'NEWYEAR25', desc: '25% off first month', uses: 41, limit: 100, ends: isoIn(18), active: true },
    { code: 'BRINGAMATE', desc: 'Free week pass for a friend', uses: 23, limit: null, ends: null, active: true },
    { code: 'STUDENT5', desc: '₹300 off Student plan, first 3 months', uses: 17, limit: 50, ends: isoIn(46), active: true },
    { code: 'SUMMERSHRED', desc: 'No joining fee', uses: 64, limit: 64, ends: isoIn(-30), active: false }
  ];
  var freezeRules = [
    'Freeze for 1–3 months, once every 12 months.',
    '₹300 per month holding fee while frozen.',
    'Medical freezes are free with a note.',
    'Unfreeze any time — access is back the same day.'
  ];
  var templates = [
    { id: 't1', name: 'Welcome', channel: 'WhatsApp', body: 'Welcome to Muscle Flex, {first}! Your QR pass is live. Doors open 05:00. See you on the floor.' },
    { id: 't2', name: 'Renewal reminder', channel: 'WhatsApp', body: 'Hi {first}, your {plan} runs out on {expiry}. Reply YES and we\'ll renew it — no forms.' },
    { id: 't3', name: 'Missed you', channel: 'WhatsApp', body: 'Not seen you in a while, {first}. Quietest time this week is {besttime}. Come get it done.' },
    { id: 't4', name: 'Payment failed', channel: 'SMS', body: 'Hi {first}, your Muscle Flex payment of {amount} didn\'t go through. Tap to sort it: {link}' },
    { id: 't5', name: 'Birthday', channel: 'WhatsApp', body: 'Happy birthday, {first}! Protein shake is on us today. Just ask at the desk.' }
  ];
  var automations = [
    { id: 'a1', name: 'Welcome', trigger: 'On join', on: true, sent30: 31 },
    { id: 'a2', name: 'Birthday', trigger: 'On the day, 09:00', on: true, sent30: 9 },
    { id: 'a3', name: 'Missed you 14 days', trigger: '14 days since last visit', on: true, sent30: 22 },
    { id: 'a4', name: 'Renewal reminder', trigger: '7 days before expiry', on: true, sent30: 38 },
    { id: 'a5', name: 'Payment failed', trigger: 'On failed Direct Debit', on: false, sent30: 0 }
  ];

  /* ---- notifications ---------------------------------------------------- */
  var failed = members.filter(function (m) { return m.dd === 'Failed' || m.dd === 'Retry'; });
  var expiring = members.filter(function (m) { return m.status === 'expiring'; });
  var newLeads = leads.filter(function (x) { return x.stage === 'New'; });
  var overdueFU = followups.filter(function (x) { return x.dueIn < 0; });
  var notifications = [
    { id: 'n1', icon: 'alert', tone: 'danger', title: failed.length + ' Direct Debits failed', body: 'Retry or send a payment link.', time: '07:12', href: '#/payments', unread: true },
    { id: 'n2', icon: 'clock', tone: 'warning', title: expiring.length + ' memberships expire this week', body: 'One tap to send renewal reminders.', time: '08:00', href: '#/members', unread: true },
    { id: 'n3', icon: 'target', tone: 'neutral', title: newLeads.length + ' new enquiries waiting', body: 'Oldest has waited 2 days.', time: '09:41', href: '#/leads', unread: true },
    { id: 'n4', icon: 'shield', tone: 'neutral', title: 'Unstaffed hours: all clear', body: '05:00–10:00 · no tailgating flagged.', time: '10:02', href: '#/checkins', unread: false },
    { id: 'n5', icon: 'calendar', tone: 'neutral', title: 'Barbell Club is full tonight', body: 'Waitlist open.', time: '11:30', href: '#/classes', unread: false }
  ];

  /* ---- per-member history (profile screen) ------------------------------- */
  /* Built on demand from the member's own ID, so each profile is always the
     same and the main random stream above is untouched. */
  var detailCache = {};
  var NOTE_BANK = [
    'Wants to add a second leg day. Pointed towards Barbell Club.',
    'Lower back niggle — avoid heavy deadlifts until cleared.',
    'Asked about bringing a friend on a day pass.',
    'Prefers WhatsApp, not calls.',
    'Training for a first powerlifting meet in the spring.',
    'Works shifts — mostly trains before 07:00.',
    'Interested in a PT block after payday.',
    'Great with new members. Possible ambassador.'
  ];
  function memberDetail(id) {
    if (detailCache[id]) return detailCache[id];
    var m = memberById[id];
    if (!m) return null;
    var s = (parseInt(id.slice(2), 10) * 7919) | 0;
    function r() {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    function ri(a, b) { return a + Math.floor(r() * (b - a + 1)); }
    function rp(arr) { return arr[Math.floor(r() * arr.length)]; }
    var plan = planById[m.plan];
    var joinedAgo = Math.round((new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate()) - new Date(m.joined + 'T00:00:00')) / 864e5);

    /* attendance: last 84 days, oldest first */
    var favHour = rp([6, 6, 7, 12, 17, 18, 18, 19]);
    var rate = Math.min(.85, Math.max(.08, m.visits30 / 30 + .08));
    var attendance = [];
    for (var d = 83; d >= 0; d--) {
      var date = daysFromNow(-d), wk = date.getDay() === 0 || date.getDay() === 6;
      var visited = d <= joinedAgo && d > m.daysSinceVisit && r() < rate * (wk ? .7 : 1.1);
      if (d === m.daysSinceVisit && d <= joinedAgo) visited = true;
      attendance.push({ date: iso(date), visited: visited, time: visited ? hhmm(favHour * 60 + ri(-20, 50)) : null });
    }

    /* payments */
    var pays = [], n = 71000 + parseInt(id.slice(2), 10) * 10;
    if (plan.kind === 'pass') {
      pays.push({ id: 'PAY-' + (n++), memberId: id, type: 'Pass', item: plan.name, amount: plan.price, status: 'Paid', date: m.joined, time: '10:12', method: 'Card' });
    } else if (m.plan === 'annual') {
      pays.push({ id: 'PAY-' + (n++), memberId: id, type: 'Card', item: 'Annual membership', amount: plan.price, status: 'Paid', date: m.joined, time: '11:40', method: 'Card' });
    } else {
      var months = Math.min(8, Math.floor(joinedAgo / 30) + 1), dom = Math.min(28, new Date(m.joined + 'T00:00:00').getDate());
      for (var k = 0; k < months; k++) {
        var pd = new Date(NOW.getFullYear(), NOW.getMonth() - k, dom);
        if (pd > NOW) continue;
        var st = 'Paid';
        if (pays.length === 0) st = m.dd === 'Failed' || m.dd === 'Retry' || m.dd === 'Pending' ? m.dd : m.dd === 'Paused' ? 'Paused' : 'Paid';
        pays.push({ id: 'PAY-' + (n++), memberId: id, type: 'Direct Debit', item: plan.name, amount: st === 'Paused' ? 300 : plan.price, status: st === 'Paused' ? 'Paid' : st, date: iso(pd), time: '06:' + pad(ri(0, 59)), method: 'Direct Debit', note: st === 'Paused' ? 'Freeze holding fee' : null });
      }
    }
    for (var q2 = ri(0, 3); q2 > 0; q2--) {
      var pr = rp(products), ago = ri(1, Math.max(2, Math.min(80, joinedAgo)));
      pays.push({ id: 'PAY-' + (n++), memberId: id, type: 'POS', item: pr.name, cat: pr.cat, amount: pr.price, status: 'Paid', date: isoIn(-ago), time: hhmm(ri(7 * 60, 20 * 60)), method: rp(['Card', 'Contactless', 'Cash']) });
    }
    pays.sort(function (a, b) { return (b.date + b.time).localeCompare(a.date + a.time); });

    /* body progress: 8 monthly check-ins, oldest first */
    var cutting = m.goal === 'Lose fat' || m.goal === 'Bodybuilding prep';
    var w0 = ri(62, 104), bf0 = ri(14, 30), sq0 = ri(60, 140), bn0 = Math.round(sq0 * .68), dl0 = Math.round(sq0 * 1.18);
    var labels = [], weight = [], fat = [], squat = [], bench = [], dead = [];
    for (var b = 7; b >= 0; b--) {
      var step = 7 - b, md = new Date(NOW.getFullYear(), NOW.getMonth() - b, 1);
      labels.push(MONTHS[md.getMonth()]);
      weight.push(Math.round((w0 + step * (cutting ? -.75 : .45) + (r() - .5) * .8) * 10) / 10);
      fat.push(Math.round((bf0 + step * (cutting ? -.6 : -.15) + (r() - .5) * .5) * 10) / 10);
      squat.push(Math.round((sq0 + step * 3.2 + (r() - .5) * 3) / 2.5) * 2.5);
      bench.push(Math.round((bn0 + step * 1.9 + (r() - .5) * 2) / 2.5) * 2.5);
      dead.push(Math.round((dl0 + step * 3.8 + (r() - .5) * 3) / 2.5) * 2.5);
    }

    /* PT sessions */
    var pt = [];
    if (m.pt) {
      var tr = rp(trainers), focus = ['Squat technique', 'Upper push', 'Deadlift + accessories', 'Conditioning', 'Programme review', 'Posing practice'];
      [-21, -14, -7, 3, 10, 17].forEach(function (off, ix) {
        pt.push({ id: id + '-pt' + ix, date: isoIn(off), time: hhmm(favHour * 60), trainerId: tr.id, focus: focus[ix], price: 1200, status: off < 0 ? 'Completed' : 'Booked' });
      });
    }

    /* notes */
    var notes = [], bank = NOTE_BANK.slice();
    for (var nn = ri(2, 3); nn > 0; nn--) {
      var text = bank.splice(Math.floor(r() * bank.length), 1)[0];
      notes.push({ text: text, by: rp(['Carys Bowen', 'Dan Whitlock', 'Leah Stanton', 'Adam']), date: isoIn(-ri(2, Math.max(3, Math.min(120, joinedAgo)))) });
    }
    notes.sort(function (a, b) { return b.date.localeCompare(a.date); });

    /* documents */
    var docs = [
      { name: 'Liability waiver', signed: m.waiver, date: m.joined },
      { name: 'PAR-Q health questionnaire', signed: m.parq, date: m.joined },
      { name: 'Direct Debit mandate', signed: m.dd !== 'n/a', date: m.joined, na: m.dd === 'n/a' },
      { name: 'Photo ID check', signed: r() < .82, date: m.joined }
    ];

    var visits = attendance.filter(function (a) { return a.visited; });
    detailCache[id] = {
      attendance: attendance, favTime: pad(favHour) + ':00', visits84: visits.length,
      recent: visits.slice(-5).reverse(), payments: pays,
      paidTotal: pays.filter(function (p) { return p.status === 'Paid'; }).reduce(function (a, p) { return a + p.amount; }, 0),
      body: { labels: labels, weight: weight, fat: fat, squat: squat, bench: bench, dead: dead },
      pt: pt, notes: notes, docs: docs
    };
    return detailCache[id];
  }

  /* ---- staff rota: one [from, to] per day, Mon first; null = day off ----- */
  var ROTA = {
    s1: [null, [10, 16], null, [10, 16], null, null, null],
    s2: [[10, 18], [10, 18], [10, 18], [10, 18], [10, 18], null, null],
    s3: [[14, 22], [14, 22], [14, 22], null, null, null, null],
    s4: [null, [12, 20], [12, 20], [12, 20], [12, 20], [12, 20], null],
    s5: [null, null, null, null, null, [8, 14], [8, 14]],
    s6: [[10, 14], null, null, null, [14, 22], null, null]
  };
  staff.forEach(function (st) { st.rota = ROTA[st.id] || [null, null, null, null, null, null, null]; });

  /* who is booked on a class — always the same people for the same class */
  var classRoster = {};
  function classAttendees(c) {
    if (!classRoster[c.id]) {
      var off = (parseInt(c.id.slice(1), 10) * 7) % Math.max(1, pool.length - 24);
      classRoster[c.id] = pool.slice(off, off + c.booked).map(function (m) { return m.id; });
    }
    return classRoster[c.id];
  }

  /* ---- reports: churn, cohorts, attendance (nothing after this uses rnd) -- */
  var churn12 = revenue12.map(function (m, ix) {
    return { label: m.label, value: Math.round((5.4 - ix * .17 + (rnd() - .5) * .7) * 10) / 10 };
  });
  var visits12 = revenue12.map(function (m, ix) {
    return { label: m.label, value: Math.round((2.3 + ix * .07 + (rnd() - .5) * .25) * 10) / 10 };
  });
  var cohorts = [];
  for (var co = 5; co >= 0; co--) {
    var cd = new Date(NOW.getFullYear(), NOW.getMonth() - co, 1), kept = [100], left = 100;
    for (var mo = 1; mo <= co; mo++) { left = Math.round(left * (.9 + rnd() * .07)); kept.push(left); }
    cohorts.push({ label: MONTHS[cd.getMonth()] + ' ' + String(cd.getFullYear()).slice(2), size: int(8, 17), kept: kept });
  }
  var reports = {
    churn: churn12, visits: visits12, cohorts: cohorts,
    churnReasons: [['Not using it', 14], ['Moved away', 9], ['Price', 6], ['Switched gym', 5], ['Injury or illness', 4]]
  };

  /* ---- messages already sent -------------------------------------------- */
  var broadcasts = [
    { id: 'b1', channel: 'WhatsApp', segment: 'Expiring in 7 days', title: 'Renewal reminder', sent: 11, read: 91, date: isoIn(-1), time: '09:00' },
    { id: 'b2', channel: 'WhatsApp', segment: 'All active members', title: 'Quietest hours this week', sent: 118, read: 84, date: isoIn(-3), time: '17:30' },
    { id: 'b3', channel: 'SMS', segment: 'Failed payments', title: 'Payment didn\'t go through', sent: 5, read: 100, date: isoIn(-4), time: '10:15' },
    { id: 'b4', channel: 'Email', segment: 'New joiners (30 days)', title: 'Your first month at Muscle Flex', sent: 9, read: 67, date: isoIn(-8), time: '08:00' }
  ];

  /* ---- live door: someone scans in right now ----------------------------- */
  /* Shared by the dashboard feed and the check-ins screen. Pass a member to
     force who it is (the kiosk demo does), otherwise a random regular. */
  var live = { onFloor: onFloor, capacity: gym.capacity };
  function simulateCheckin(who) {
    var clock = new Date(NOW.getTime() + (Date.now() - loadedAt));
    var recent = {};
    checkins.slice(0, 12).forEach(function (c) { recent[c.memberId] = true; });
    var cands = pool.filter(function (m) { return !recent[m.id] && m.status !== 'frozen' && m.status !== 'expired'; });
    var m = who || cands[Math.floor(Math.random() * cands.length)] || pool[0];
    var denied = m.status === 'expired' || m.status === 'frozen', owing = m.status === 'overdue';
    var c = {
      time: pad(clock.getHours()) + ':' + pad(clock.getMinutes()), mins: clock.getHours() * 60 + clock.getMinutes(), memberId: m.id,
      method: who ? 'Kiosk' : Math.random() < .65 ? 'QR' : Math.random() < .8 ? 'Fob' : 'Kiosk', staffed: status(clock).staffed,
      flag: m.status === 'expired' ? 'Membership expired' : m.status === 'frozen' ? 'Membership frozen' : owing ? 'Payment overdue' : null,
      result: denied ? 'Denied' : owing ? 'Flagged' : 'Granted', fresh: true
    };
    checkins.unshift(c);
    if (!denied) {
      m.daysSinceVisit = 0; m.lastVisit = todayIso; m.totalVisits += 1;
      live.onFloor = Math.min(live.capacity, live.onFloor + 1);
      if (!who && Math.random() < .45 && live.onFloor > 8) live.onFloor -= Math.random() < .3 ? 2 : 1;   /* people leave too */
    }
    return c;
  }

  /* ---- export ----------------------------------------------------------- */
  var loadedAt = Date.now();
  window.MF = {
    now: NOW,
    /* demo clock that keeps ticking from NOW (used by the live check-in feed) */
    clock: function () { return new Date(NOW.getTime() + (Date.now() - loadedAt)); },
    todayIso: todayIso,
    gym: gym,
    status: status,
    plans: plans,
    planById: planById,
    members: members,
    memberById: memberById,
    activeMembers: activeMembers,
    memberDetail: memberDetail,
    hours: HOURS,
    heatmap: heatmap,
    todayDow: todayDow,
    checkins: checkins,
    live: live,
    simulateCheckin: simulateCheckin,
    classAttendees: classAttendees,
    reports: reports,
    broadcasts: broadcasts,
    isoIn: isoIn,
    revenue: {
      months: revenue12,
      today: revenueToday,
      mtd: mtd,
      lastMonthSameDay: lastMonthSameDay,
      target: gym.monthTarget,
      overdue: overdueTotal,
      spark: {
        today: spark(12, revenueToday * .55, revenueToday, revenueToday * .18),
        month: spark(12, lastMonthSameDay * .9, mtd, mtd * .04),
        members: spark(12, activeMembers().length - 11, activeMembers().length, 3),
        floor: spark(12, onFloor * .5, onFloor, onFloor * .3),
        joins: spark(12, 3, 9, 4),
        overdue: spark(12, overdueTotal * 1.5, overdueTotal, overdueTotal * .2)
      }
    },
    newJoins30: members.filter(function (m) { return (NOW - new Date(m.joined)) / 864e5 <= 30; }).length,
    products: products,
    payments: payments,
    staff: staff,
    staffById: staff.reduce(function (o, s) { o[s.id] = s; return o; }, {}),
    trainers: trainers,
    classes: classes,
    ptSessions: ptSessions,
    leads: leads,
    leadStages: STAGES,
    leadSources: SOURCES,
    followups: followups,
    promos: promos,
    freezeRules: freezeRules,
    templates: templates,
    automations: automations,
    notifications: notifications,
    counts: {
      failedPayments: failed.length,
      expiring7: expiring.length,
      newLeads: newLeads.length,
      overdueFollowups: overdueFU.length,
      todayFollowups: followups.filter(function (x) { return x.dueIn === 0; }).length,
      notSeen14: members.filter(function (m) { return m.status === 'active' && m.daysSinceVisit >= 14; }).length
    }
  };
})();
