/* ==========================================================================
   MUSCLE FLEX — inline SVG charts, drawn by our own JS. No library.
   Every function returns an SVG string sized to the width it is given, so
   text stays crisp at any breakpoint (the screen re-renders on resize).
   Colours come from CSS classes → charts follow --accent and light mode.
   Hover values: any element with data-tip="…" gets the shared tooltip.
   ========================================================================== */
(function () {
  'use strict';
  var App = window.MFApp = window.MFApp || {};
  var uid = 0;

  function r1(n) { return Math.round(n * 10) / 10; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function svgOpen(w, h, label, cls) {
    return '<svg class="chart ' + (cls || '') + '" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(label || 'Chart') + '">';
  }

  /* ---- sparkline --------------------------------------------------------- */
  function sparkline(values, w, h) {
    w = w || 96; h = h || 28;
    var min = Math.min.apply(null, values), max = Math.max.apply(null, values), span = max - min || 1, pad = 4;
    var pts = values.map(function (v, i) {
      return [r1(pad + i * (w - pad * 2) / (values.length - 1)), r1(h - pad - (v - min) / span * (h - pad * 2))];
    });
    var d = 'M' + pts.map(function (p) { return p[0] + ' ' + p[1]; }).join(' L');
    var last = pts[pts.length - 1];
    return '<svg class="chart spark" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true" focusable="false">' +
      '<path class="spark__area" d="' + d + ' L' + last[0] + ' ' + h + ' L' + pts[0][0] + ' ' + h + ' Z"/>' +
      '<path class="spark__line" d="' + d + '"/>' +
      '<circle class="spark__dot" cx="' + last[0] + '" cy="' + last[1] + '" r="2.5"/></svg>';
  }

  /* ---- bars + target line ------------------------------------------------ */
  /* items: [{label, value, target, tip, now}] */
  function bars(items, w, h, o) {
    o = o || {};
    var ml = 40, mr = 8, mt = 14, mb = 26, iw = w - ml - mr, ih = h - mt - mb;
    var top = Math.max.apply(null, items.map(function (d) { return Math.max(d.value, d.target || 0); }));
    var step = top > 12000 ? 4000 : top > 6000 ? 3000 : 2000;
    var max = Math.ceil(top * 1.06 / step) * step;
    var band = iw / items.length, bw = Math.max(6, Math.min(34, band * .56));
    function y(v) { return r1(mt + ih - v / max * ih); }
    var out = svgOpen(w, h, o.label, 'bars');
    for (var t = 0; t <= max; t += step) {
      out += '<line class="grid-line" x1="' + ml + '" x2="' + (w - mr) + '" y1="' + y(t) + '" y2="' + y(t) + '"/>' +
        '<text class="axis" x="' + (ml - 8) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + (t === 0 ? '0' : '£' + t / 1000 + 'k') + '</text>';
    }
    var skip = band < 30 ? 2 : 1, line = [];
    items.forEach(function (d, i) {
      var cx = ml + band * i + band / 2, by = y(d.value);
      out += '<rect class="bar' + (d.now ? ' bar--now' : '') + '" x="' + r1(cx - bw / 2) + '" y="' + by + '" width="' + r1(bw) + '" height="' + r1(mt + ih - by) + '" rx="3"/>';
      if (i % skip === (items.length - 1) % skip) out += '<text class="axis' + (d.now ? ' axis--now' : '') + '" x="' + r1(cx) + '" y="' + (h - 8) + '" text-anchor="middle">' + d.label + '</text>';
      if (d.target) line.push([r1(cx), y(d.target)]);
    });
    if (line.length) {
      var id = 'clip-' + (++uid);
      out += '<clipPath id="' + id + '"><rect class="reveal" x="0" y="0" width="' + w + '" height="' + h + '"/></clipPath>' +
        '<g clip-path="url(#' + id + ')"><path class="target-line" d="M' + line.map(function (p) { return p[0] + ' ' + p[1]; }).join(' L') + '"/>' +
        line.map(function (p) { return '<circle class="target-dot" cx="' + p[0] + '" cy="' + p[1] + '" r="2"/>'; }).join('') + '</g>';
    }
    /* full-height hover bands on top, so the whole column is the target */
    items.forEach(function (d, i) {
      out += '<rect class="hit" x="' + r1(ml + band * i) + '" y="' + mt + '" width="' + r1(band) + '" height="' + ih + '" data-tip="' + esc(d.tip || '') + '"/>';
    });
    return out + '</svg>';
  }

  /* ---- donut ------------------------------------------------------------- */
  /* segs: [{value, cls, tip}] */
  function donut(segs, size, stroke, label) {
    var r = (size - stroke) / 2, c = 2 * Math.PI * r, total = segs.reduce(function (s, d) { return s + d.value; }, 0) || 1;
    var gap = 2, acc = 0, cx = size / 2;
    var out = svgOpen(size, size, label, 'donut') + '<g transform="rotate(-90 ' + cx + ' ' + cx + ')">';
    segs.forEach(function (d) {
      var len = Math.max(0, d.value / total * c - gap);
      out += '<circle class="donut__seg ' + (d.cls || '') + '" cx="' + cx + '" cy="' + cx + '" r="' + r1(r) + '" stroke-width="' + stroke + '" ' +
        'stroke-dasharray="' + r1(len) + ' ' + r1(c - len) + '" stroke-dashoffset="' + r1(-acc) + '" data-tip="' + esc(d.tip || '') + '"/>';
      acc += d.value / total * c;
    });
    return out + '</g></svg>';
  }

  /* ---- progress ring ----------------------------------------------------- */
  function ring(pct, size, stroke, label) {
    var r = (size - stroke) / 2, c = 2 * Math.PI * r, cx = size / 2, p = Math.max(0, Math.min(1, pct));
    return svgOpen(size, size, label, 'ring') +
      '<circle class="ring__track" cx="' + cx + '" cy="' + cx + '" r="' + r1(r) + '" stroke-width="' + stroke + '"/>' +
      '<circle class="ring__bar" cx="' + cx + '" cy="' + cx + '" r="' + r1(r) + '" stroke-width="' + stroke + '" stroke-linecap="round" ' +
      'stroke-dasharray="' + r1(c * p) + ' ' + r1(c) + '" transform="rotate(-90 ' + cx + ' ' + cx + ')"/></svg>';
  }

  /* ---- half-circle gauge -------------------------------------------------
     The filled arc is a full half-circle that ROTATES into view behind a clip
     (transform only), so changing the value animates on the compositor.     */
  function gauge(pct, w, stroke, label) {
    stroke = stroke || 16;
    var r = (w - stroke) / 2, cx = w / 2, cy = r + stroke / 2, h = Math.ceil(cy + 2), id = 'gclip-' + (++uid);
    var arc = 'M' + r1(cx - r) + ' ' + r1(cy) + ' A' + r1(r) + ' ' + r1(r) + ' 0 0 1 ' + r1(cx + r) + ' ' + r1(cy);
    return svgOpen(w, h, label, 'gauge') +
      '<clipPath id="' + id + '"><rect x="0" y="0" width="' + w + '" height="' + r1(cy) + '"/></clipPath>' +
      '<path class="gauge__track" d="' + arc + '" stroke-width="' + stroke + '"/>' +
      '<g clip-path="url(#' + id + ')"><path class="gauge__bar" d="' + arc + '" stroke-width="' + stroke + '" ' +
      'style="transform-origin:' + r1(cx) + 'px ' + r1(cy) + 'px;transform:rotate(' + gaugeDeg(pct) + 'deg)"/></g></svg>';
  }
  function gaugeDeg(pct) { return r1((Math.max(0, Math.min(1, pct)) - 1) * 180); }
  function setGauge(root, pct) {
    var bar = root.querySelector('.gauge__bar');
    if (bar) bar.style.transform = 'rotate(' + gaugeDeg(pct) + 'deg)';
  }

  /* ---- busy-hours heatmap ------------------------------------------------ */
  /* rows: 7 arrays of 0–100; o: {days, hours, todayIx, nowHour, capacity} */
  function heatmap(rows, w, o) {
    var ml = 34, mt = 20, gap = 3, cols = o.hours.length;
    var cw = (w - ml - gap * (cols - 1)) / cols, ch = Math.max(18, Math.min(36, cw * .95));
    var h = Math.ceil(mt + rows.length * (ch + gap));
    var every = cw < 18 ? 4 : cw < 30 ? 2 : 1;
    var out = svgOpen(w, h, o.label, 'heat');
    o.hours.forEach(function (hr, c) {
      if (c % every === 0) out += '<text class="axis" x="' + r1(ml + c * (cw + gap) + cw / 2) + '" y="12" text-anchor="middle">' + (hr < 10 ? '0' : '') + hr + '</text>';
    });
    rows.forEach(function (row, rIx) {
      out += '<text class="axis' + (rIx === o.todayIx ? ' axis--now' : '') + '" x="0" y="' + r1(mt + rIx * (ch + gap) + ch / 2 + 4) + '">' + o.days[rIx] + '</text>';
    });
    for (var c = 0; c < cols; c++) {
      out += '<g class="heat__col">';
      for (var rIx = 0; rIx < rows.length; rIx++) {
        var v = rows[rIx][c], now = rIx === o.todayIx && o.hours[c] === o.nowHour;
        var hr = o.hours[c], tip = o.days[rIx] + ' ' + (hr < 10 ? '0' : '') + hr + ':00 · ' + v + '% busy · about ' + Math.round(v / 100 * o.capacity * .82) + ' on the floor';
        out += '<rect class="heat__cell' + (now ? ' heat__cell--now' : '') + '" x="' + r1(ml + c * (cw + gap)) + '" y="' + r1(mt + rIx * (ch + gap)) + '" width="' + r1(cw) + '" height="' + r1(ch) + '" rx="3" ' +
          'style="fill-opacity:' + r1(.06 + v / 100 * .94) + '" data-tip="' + esc(tip) + '"/>';
      }
      out += '</g>';
    }
    return out + '</svg>';
  }

  /* ---- today strip: one small bar per hour ------------------------------ */
  function strip(values, hours, w, h, o) {
    var gap = 3, bw = (w - gap * (values.length - 1)) / values.length, base = h - 16;
    var out = svgOpen(w, h, o.label, 'strip');
    values.forEach(function (v, i) {
      var bh = Math.max(3, v / 100 * base), hr = hours[i];
      var cls = hr === o.nowHour ? ' bar--now' : hr === o.bestHour ? ' bar--best' : '';
      out += '<rect class="bar' + cls + '" x="' + r1(i * (bw + gap)) + '" y="' + r1(base - bh) + '" width="' + r1(bw) + '" height="' + r1(bh) + '" rx="2" ' +
        'data-tip="' + (hr < 10 ? '0' : '') + hr + ':00 · ' + v + '% busy"/>';
      if (i % 4 === 0 || i === values.length - 1) out += '<text class="axis" x="' + r1(i * (bw + gap) + bw / 2) + '" y="' + (h - 2) + '" text-anchor="' + (i === 0 ? 'start' : i === values.length - 1 ? 'end' : 'middle') + '">' + (hr < 10 ? '0' : '') + hr + '</text>';
    });
    return out + '</svg>';
  }

  /* ---- line chart --------------------------------------------------------- */
  /* series: [{name, values, cls, unit}] — all series share one axis */
  function line(series, labels, w, h, o) {
    o = o || {};
    var ml = 40, mr = 12, mt = 12, mb = 26, iw = w - ml - mr, ih = h - mt - mb;
    var all = [].concat.apply([], series.map(function (s) { return s.values; }));
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all), padv = (hi - lo || 1) * .18;
    lo = Math.floor(lo - padv); hi = Math.ceil(hi + padv);
    function x(i) { return r1(ml + i * iw / (labels.length - 1)); }
    function y(v) { return r1(mt + ih - (v - lo) / (hi - lo) * ih); }
    var id = 'lclip-' + (++uid), out = svgOpen(w, h, o.label, 'line');
    for (var t = 0; t <= 3; t++) {
      var v = lo + (hi - lo) * t / 3;
      out += '<line class="grid-line" x1="' + ml + '" x2="' + (w - mr) + '" y1="' + y(v) + '" y2="' + y(v) + '"/>' +
        '<text class="axis" x="' + (ml - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + Math.round(v) + '</text>';
    }
    labels.forEach(function (l, i) { out += '<text class="axis" x="' + x(i) + '" y="' + (h - 8) + '" text-anchor="middle">' + l + '</text>'; });
    out += '<clipPath id="' + id + '"><rect class="reveal" x="0" y="0" width="' + w + '" height="' + h + '"/></clipPath><g clip-path="url(#' + id + ')">';
    series.forEach(function (s) {
      out += '<path class="line__path ' + (s.cls || '') + '" d="M' + s.values.map(function (v, i) { return x(i) + ' ' + y(v); }).join(' L') + '"/>';
      s.values.forEach(function (v, i) {
        out += '<circle class="line__dot ' + (s.cls || '') + '" cx="' + x(i) + '" cy="' + y(v) + '" r="3.5" data-tip="' + esc(s.name + ' · ' + labels[i] + ' · ' + v + (s.unit || '')) + '"/>';
      });
    });
    return out + '</g></svg>';
  }

  /* ---- attendance calendar: weeks as columns, Mon–Sun rows --------------- */
  /* days: [{date:'YYYY-MM-DD', visited, time}] oldest first */
  function calendar(days, w, o) {
    o = o || {};
    var first = new Date(days[0].date + 'T00:00:00'), offset = (first.getDay() + 6) % 7;
    var cols = Math.ceil((days.length + offset) / 7), ml = 30, gap = 4;
    var cell = Math.max(10, Math.min(22, (w - ml - gap * (cols - 1)) / cols)), h = Math.ceil(7 * (cell + gap) + 2);
    var names = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'], out = svgOpen(w, h, o.label, 'cal');
    names.forEach(function (n, i) { if (n) out += '<text class="axis" x="0" y="' + r1(i * (cell + gap) + cell / 2 + 4) + '">' + n + '</text>'; });
    days.forEach(function (d, i) {
      var p = i + offset, c = Math.floor(p / 7), rw = p % 7, bits = d.date.split('-');
      var tip = bits[2] + '/' + bits[1] + ' · ' + (d.visited ? 'trained at ' + d.time : 'no visit');
      out += '<rect class="cal__cell' + (d.visited ? ' cal__cell--on' : '') + '" x="' + r1(ml + c * (cell + gap)) + '" y="' + r1(rw * (cell + gap)) + '" width="' + r1(cell) + '" height="' + r1(cell) + '" rx="3" data-tip="' + esc(tip) + '"/>';
    });
    return out + '</svg>';
  }

  /* ---- demo QR: looks the part, same every time per member, not scannable - */
  function qr(text, size) {
    var n = 25, cell = size / n, seed = 0, i, out;
    for (i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) | 0;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    function finder(cx, cy) { return function (x, y) { return x >= cx && x < cx + 7 && y >= cy && y < cy + 7; }; }
    var zones = [finder(0, 0), finder(n - 7, 0), finder(0, n - 7)];
    out = svgOpen(size, size, 'Check-in QR code for ' + text, 'qr') + '<rect class="qr__bg" width="' + size + '" height="' + size + '" rx="6"/>';
    for (var yy = 0; yy < n; yy++) for (var xx = 0; xx < n; xx++) {
      var inZone = zones.some(function (z) { return z(xx, yy); }), on;
      if (inZone) {
        var lx = xx < 7 ? xx : xx - (n - 7), ly = yy < 7 ? yy : yy - (n - 7);
        on = lx === 0 || lx === 6 || ly === 0 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4);
      } else {
        var quiet = (xx === 7 && yy < 8) || (yy === 7 && xx < 8) || (xx === n - 8 && yy < 8) || (yy === 7 && xx >= n - 8) || (xx === 7 && yy >= n - 8) || (yy === n - 8 && xx < 8);
        on = !quiet && rnd() < .48;
      }
      if (on) out += '<rect class="qr__dot" x="' + r1(xx * cell) + '" y="' + r1(yy * cell) + '" width="' + r1(cell + .3) + '" height="' + r1(cell + .3) + '"/>';
    }
    return out + '</svg>';
  }

  /* ---- shared tooltip ----------------------------------------------------- */
  var tip = null;
  function showTip(target) {
    var text = target.getAttribute('data-tip');
    if (!text) return;
    if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
    tip.textContent = text;
    tip.hidden = false;
    var r = target.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    var x = Math.min(Math.max(8, r.left + r.width / 2 - tw / 2), window.innerWidth - tw - 8);
    var y = r.top - th - 8;
    if (y < 8) y = r.bottom + 8;
    tip.style.left = Math.round(x) + 'px';
    tip.style.top = Math.round(y) + 'px';
  }
  function hideTip() { if (tip) tip.hidden = true; }
  document.addEventListener('pointerover', function (e) {
    var t = e.target instanceof Element ? e.target.closest('[data-tip]') : null;
    if (t) showTip(t); else hideTip();
  });
  document.addEventListener('pointerdown', function (e) {       /* touch: tap to read */
    var t = e.target instanceof Element ? e.target.closest('[data-tip]') : null;
    if (t) showTip(t); else hideTip();
  });
  window.addEventListener('scroll', hideTip, true);
  window.addEventListener('hashchange', hideTip);

  App.charts = {
    sparkline: sparkline,
    bars: bars,
    donut: donut,
    ring: ring,
    gauge: gauge,
    setGauge: setGauge,
    heatmap: heatmap,
    strip: strip,
    line: line,
    calendar: calendar,
    qr: qr,
    hideTip: hideTip
  };
})();
