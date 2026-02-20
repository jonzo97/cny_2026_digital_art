/* ============================================
   Card 5 — Paper Cut Parallax (剪纸)
   ============================================ */

(function() {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var PAPER_RED = COLORS.PAPER_RED;
  var PAPER_RED_DARK = '#A01830';
  var PAPER_RED_LIGHT = '#D42A4A';

  var BACKLIGHT_MODES = [
    { name: 'gold', colors: ['#FFD700', '#FF8C00', '#FFD700'] },
    { name: 'moonlight', colors: ['#E8E8FF', '#B0B0D0', '#E8E8FF'] },
    { name: 'red', colors: ['#FF4444', '#CC0000', '#FF4444'] }
  ];

  var PARALLAX_DEPTHS = [0, 5, 12, 20, 30, 40];
  var ROTATION_DEPTHS = [0, 0.3, 0.6, 1.0, 1.5, 2.0];

  var section, svgEl, canvas, ctx;
  var mouse;
  var animId = null;
  var running = false;
  var backlightIndex = 0;
  var time = 0;
  var W = 0, H = 0;
  var layers = [];
  var sparkles = [];
  var currentParallax = [];
  var currentRotation = [];
  var boundClick = null;

  for (var i = 0; i < 6; i++) {
    currentParallax.push({ x: 0, y: 0 });
    currentRotation.push(0);
  }

  // ---- SVG Path Data ----

  function horsePath(cx, cy, s) {
    // Galloping horse with flowing mane and decorative tail
    var paths = [];
    // Body
    paths.push(
      'M ' + (cx - 30*s) + ' ' + (cy + 10*s) +
      ' C ' + (cx - 45*s) + ' ' + (cy - 15*s) + ' ' + (cx - 35*s) + ' ' + (cy - 50*s) + ' ' + (cx - 20*s) + ' ' + (cy - 55*s) +
      ' C ' + (cx - 5*s) + ' ' + (cy - 60*s) + ' ' + (cx + 15*s) + ' ' + (cy - 55*s) + ' ' + (cx + 30*s) + ' ' + (cy - 45*s) +
      ' C ' + (cx + 45*s) + ' ' + (cy - 35*s) + ' ' + (cx + 55*s) + ' ' + (cy - 15*s) + ' ' + (cx + 50*s) + ' ' + (cy + 5*s) +
      ' C ' + (cx + 45*s) + ' ' + (cy + 25*s) + ' ' + (cx + 30*s) + ' ' + (cy + 30*s) + ' ' + (cx + 10*s) + ' ' + (cy + 25*s) +
      ' C ' + (cx - 10*s) + ' ' + (cy + 20*s) + ' ' + (cx - 25*s) + ' ' + (cy + 25*s) + ' ' + (cx - 30*s) + ' ' + (cy + 10*s) + ' Z'
    );
    // Head & neck
    paths.push(
      'M ' + (cx - 20*s) + ' ' + (cy - 55*s) +
      ' C ' + (cx - 30*s) + ' ' + (cy - 65*s) + ' ' + (cx - 45*s) + ' ' + (cy - 80*s) + ' ' + (cx - 55*s) + ' ' + (cy - 95*s) +
      ' C ' + (cx - 60*s) + ' ' + (cy - 103*s) + ' ' + (cx - 58*s) + ' ' + (cy - 112*s) + ' ' + (cx - 50*s) + ' ' + (cy - 115*s) +
      ' C ' + (cx - 42*s) + ' ' + (cy - 118*s) + ' ' + (cx - 32*s) + ' ' + (cy - 115*s) + ' ' + (cx - 28*s) + ' ' + (cy - 108*s) +
      ' C ' + (cx - 24*s) + ' ' + (cy - 101*s) + ' ' + (cx - 22*s) + ' ' + (cy - 90*s) + ' ' + (cx - 18*s) + ' ' + (cy - 78*s) +
      ' C ' + (cx - 14*s) + ' ' + (cy - 66*s) + ' ' + (cx - 10*s) + ' ' + (cy - 58*s) + ' ' + (cx - 5*s) + ' ' + (cy - 55*s) + ' Z'
    );
    // Ear
    paths.push(
      'M ' + (cx - 50*s) + ' ' + (cy - 115*s) +
      ' L ' + (cx - 55*s) + ' ' + (cy - 130*s) +
      ' L ' + (cx - 43*s) + ' ' + (cy - 118*s) + ' Z'
    );
    // Mane (flowing curves)
    paths.push(
      'M ' + (cx - 25*s) + ' ' + (cy - 100*s) +
      ' C ' + (cx - 15*s) + ' ' + (cy - 105*s) + ' ' + (cx - 5*s) + ' ' + (cy - 95*s) + ' ' + (cx - 10*s) + ' ' + (cy - 85*s) +
      ' C ' + (cx - 2*s) + ' ' + (cy - 90*s) + ' ' + (cx + 5*s) + ' ' + (cy - 82*s) + ' ' + (cx) + ' ' + (cy - 72*s) +
      ' C ' + (cx + 8*s) + ' ' + (cy - 78*s) + ' ' + (cx + 12*s) + ' ' + (cy - 70*s) + ' ' + (cx + 5*s) + ' ' + (cy - 60*s) +
      ' C ' + (cx - 2*s) + ' ' + (cy - 65*s) + ' ' + (cx - 12*s) + ' ' + (cy - 60*s) + ' ' + (cx - 15*s) + ' ' + (cy - 70*s) +
      ' C ' + (cx - 18*s) + ' ' + (cy - 80*s) + ' ' + (cx - 22*s) + ' ' + (cy - 92*s) + ' ' + (cx - 25*s) + ' ' + (cy - 100*s) + ' Z'
    );
    // Front legs (galloping)
    paths.push(
      'M ' + (cx - 15*s) + ' ' + (cy + 15*s) +
      ' L ' + (cx - 25*s) + ' ' + (cy + 50*s) +
      ' L ' + (cx - 35*s) + ' ' + (cy + 75*s) +
      ' L ' + (cx - 30*s) + ' ' + (cy + 78*s) +
      ' L ' + (cx - 20*s) + ' ' + (cy + 55*s) +
      ' L ' + (cx - 8*s) + ' ' + (cy + 18*s) + ' Z'
    );
    paths.push(
      'M ' + (cx - 5*s) + ' ' + (cy + 18*s) +
      ' L ' + (cx - 45*s) + ' ' + (cy + 60*s) +
      ' L ' + (cx - 55*s) + ' ' + (cy + 72*s) +
      ' L ' + (cx - 50*s) + ' ' + (cy + 76*s) +
      ' L ' + (cx - 38*s) + ' ' + (cy + 63*s) +
      ' L ' + (cx + 3*s) + ' ' + (cy + 22*s) + ' Z'
    );
    // Hind legs (galloping)
    paths.push(
      'M ' + (cx + 25*s) + ' ' + (cy + 20*s) +
      ' L ' + (cx + 40*s) + ' ' + (cy + 55*s) +
      ' L ' + (cx + 50*s) + ' ' + (cy + 75*s) +
      ' L ' + (cx + 45*s) + ' ' + (cy + 78*s) +
      ' L ' + (cx + 35*s) + ' ' + (cy + 58*s) +
      ' L ' + (cx + 18*s) + ' ' + (cy + 24*s) + ' Z'
    );
    paths.push(
      'M ' + (cx + 35*s) + ' ' + (cy + 15*s) +
      ' L ' + (cx + 60*s) + ' ' + (cy + 45*s) +
      ' L ' + (cx + 68*s) + ' ' + (cy + 70*s) +
      ' L ' + (cx + 63*s) + ' ' + (cy + 73*s) +
      ' L ' + (cx + 53*s) + ' ' + (cy + 48*s) +
      ' L ' + (cx + 30*s) + ' ' + (cy + 20*s) + ' Z'
    );
    // Tail (flowing)
    paths.push(
      'M ' + (cx + 50*s) + ' ' + (cy - 5*s) +
      ' C ' + (cx + 65*s) + ' ' + (cy - 20*s) + ' ' + (cx + 80*s) + ' ' + (cy - 35*s) + ' ' + (cx + 90*s) + ' ' + (cy - 25*s) +
      ' C ' + (cx + 95*s) + ' ' + (cy - 18*s) + ' ' + (cx + 85*s) + ' ' + (cy - 8*s) + ' ' + (cx + 78*s) + ' ' + (cy - 15*s) +
      ' C ' + (cx + 72*s) + ' ' + (cy - 22*s) + ' ' + (cx + 65*s) + ' ' + (cy - 12*s) + ' ' + (cx + 55*s) + ' ' + (cy + 5*s) + ' Z'
    );
    // Decorative swirls on body
    paths.push(
      'M ' + (cx - 10*s) + ' ' + (cy - 30*s) +
      ' C ' + (cx - 5*s) + ' ' + (cy - 40*s) + ' ' + (cx + 5*s) + ' ' + (cy - 40*s) + ' ' + (cx + 10*s) + ' ' + (cy - 30*s) +
      ' C ' + (cx + 5*s) + ' ' + (cy - 25*s) + ' ' + (cx - 5*s) + ' ' + (cy - 25*s) + ' ' + (cx - 10*s) + ' ' + (cy - 30*s) + ' Z'
    );
    paths.push(
      'M ' + (cx + 15*s) + ' ' + (cy - 15*s) +
      ' C ' + (cx + 20*s) + ' ' + (cy - 25*s) + ' ' + (cx + 30*s) + ' ' + (cy - 25*s) + ' ' + (cx + 28*s) + ' ' + (cy - 15*s) +
      ' C ' + (cx + 25*s) + ' ' + (cy - 10*s) + ' ' + (cx + 18*s) + ' ' + (cy - 10*s) + ' ' + (cx + 15*s) + ' ' + (cy - 15*s) + ' Z'
    );
    return paths.join(' ');
  }

  function cherryBlossomPath(cx, cy, r) {
    var d = '';
    for (var i = 0; i < 5; i++) {
      var a1 = (i * 72 - 90) * Math.PI / 180;
      var a2 = ((i + 1) * 72 - 90) * Math.PI / 180;
      var amid = ((i * 72 + 36) - 90) * Math.PI / 180;
      var px1 = cx + r * Math.cos(a1);
      var py1 = cy + r * Math.sin(a1);
      var px2 = cx + r * Math.cos(a2);
      var py2 = cy + r * Math.sin(a2);
      var cpx = cx + r * 1.5 * Math.cos(amid);
      var cpy = cy + r * 1.5 * Math.sin(amid);
      if (i === 0) d += 'M ' + px1 + ' ' + py1;
      d += ' Q ' + cpx + ' ' + cpy + ' ' + px2 + ' ' + py2;
    }
    d += ' Z';
    return d;
  }

  function lanternPath(cx, cy, w, h) {
    var hw = w / 2;
    var hh = h / 2;
    return 'M ' + (cx - hw*0.3) + ' ' + (cy - hh - 8) +
      ' L ' + (cx + hw*0.3) + ' ' + (cy - hh - 8) +
      ' L ' + (cx + hw*0.3) + ' ' + (cy - hh) +
      ' L ' + (cx - hw*0.3) + ' ' + (cy - hh) + ' Z' +
      ' M ' + (cx - hw*0.5) + ' ' + (cy - hh) +
      ' C ' + (cx - hw) + ' ' + (cy - hh*0.3) + ' ' + (cx - hw) + ' ' + (cy + hh*0.3) + ' ' + (cx - hw*0.5) + ' ' + (cy + hh*0.6) +
      ' L ' + (cx + hw*0.5) + ' ' + (cy + hh*0.6) +
      ' C ' + (cx + hw) + ' ' + (cy + hh*0.3) + ' ' + (cx + hw) + ' ' + (cy - hh*0.3) + ' ' + (cx + hw*0.5) + ' ' + (cy - hh) + ' Z' +
      ' M ' + (cx - hw*0.3) + ' ' + (cy + hh*0.6) +
      ' L ' + (cx + hw*0.3) + ' ' + (cy + hh*0.6) +
      ' L ' + (cx + hw*0.2) + ' ' + (cy + hh) +
      ' L ' + (cx - hw*0.2) + ' ' + (cy + hh) + ' Z' +
      // Tassel
      ' M ' + cx + ' ' + (cy + hh) +
      ' L ' + cx + ' ' + (cy + hh + 15) +
      ' M ' + (cx - 3) + ' ' + (cy + hh + 12) +
      ' L ' + (cx + 3) + ' ' + (cy + hh + 12);
  }

  function firecrackerPath(cx, cy, count) {
    var d = '';
    // String
    d += 'M ' + cx + ' ' + (cy - 10) + ' L ' + cx + ' ' + (cy + count * 14);
    for (var i = 0; i < count; i++) {
      var y = cy + i * 14;
      var side = (i % 2 === 0) ? -1 : 1;
      d += ' M ' + (cx + side * 2) + ' ' + y +
        ' L ' + (cx + side * 10) + ' ' + (y - 2) +
        ' L ' + (cx + side * 10) + ' ' + (y + 8) +
        ' L ' + (cx + side * 2) + ' ' + (y + 6) + ' Z';
    }
    return d;
  }

  function pagodaPath(cx, cy, w, h) {
    var d = '';
    var tiers = 3;
    var tierH = h / (tiers + 1);
    // Base
    d += 'M ' + (cx - w*0.4) + ' ' + cy +
      ' L ' + (cx + w*0.4) + ' ' + cy +
      ' L ' + (cx + w*0.35) + ' ' + (cy - tierH*0.8) +
      ' L ' + (cx - w*0.35) + ' ' + (cy - tierH*0.8) + ' Z';
    for (var t = 0; t < tiers; t++) {
      var baseY = cy - tierH * (t + 0.8);
      var topY = baseY - tierH * 0.7;
      var bw = w * (0.45 - t * 0.08);
      var tw = w * (0.3 - t * 0.06);
      // Roof eave
      d += ' M ' + (cx - bw) + ' ' + baseY +
        ' L ' + (cx + bw) + ' ' + baseY +
        ' L ' + (cx + tw) + ' ' + topY +
        ' L ' + (cx - tw) + ' ' + topY + ' Z';
      // Roof tip
      d += ' M ' + (cx - bw*1.1) + ' ' + baseY +
        ' Q ' + (cx - bw*0.6) + ' ' + (baseY - 5) + ' ' + (cx - tw) + ' ' + topY;
      d += ' M ' + (cx + bw*1.1) + ' ' + baseY +
        ' Q ' + (cx + bw*0.6) + ' ' + (baseY - 5) + ' ' + (cx + tw) + ' ' + topY;
    }
    // Spire
    d += ' M ' + cx + ' ' + (cy - h + 10) + ' L ' + cx + ' ' + (cy - h - 15);
    return d;
  }

  function mountainPath(x1, peak, x2, baseY) {
    return 'M ' + x1 + ' ' + baseY +
      ' L ' + ((x1 + peak) / 2 - 20) + ' ' + (baseY - (baseY - peak) * 0.6) +
      ' L ' + peak + ' ' + (baseY - (baseY - baseY) - (baseY - 200)) +
      ' Q ' + (peak + 15) + ' ' + (baseY - (baseY - 200) - 15) + ' ' + ((peak + x2) / 2 + 20) + ' ' + (baseY - (baseY - 200) * 0.5) +
      ' L ' + x2 + ' ' + baseY + ' Z';
  }

  function cloudPath(cx, cy, w) {
    var r = w * 0.18;
    return 'M ' + (cx - w*0.4) + ' ' + cy +
      ' A ' + r + ' ' + r + ' 0 0 1 ' + (cx - w*0.15) + ' ' + (cy - r*0.8) +
      ' A ' + (r*1.2) + ' ' + (r*1.2) + ' 0 0 1 ' + (cx + w*0.15) + ' ' + (cy - r) +
      ' A ' + r + ' ' + r + ' 0 0 1 ' + (cx + w*0.4) + ' ' + cy +
      ' Z';
  }

  // ---- Build SVG Layers ----

  function buildSVG(w, h) {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';

    // Defs: filters and gradients
    var defs = document.createElementNS(NS, 'defs');

    // Backlight gradient
    var grad = document.createElementNS(NS, 'radialGradient');
    grad.id = 'pc-backlight';
    grad.setAttribute('cx', '50%');
    grad.setAttribute('cy', '50%');
    grad.setAttribute('r', '60%');
    var stop1 = document.createElementNS(NS, 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', BACKLIGHT_MODES[0].colors[0]);
    stop1.id = 'pc-bl-stop1';
    var stop2 = document.createElementNS(NS, 'stop');
    stop2.setAttribute('offset', '60%');
    stop2.setAttribute('stop-color', BACKLIGHT_MODES[0].colors[1]);
    stop2.id = 'pc-bl-stop2';
    var stop3 = document.createElementNS(NS, 'stop');
    stop3.setAttribute('offset', '100%');
    stop3.setAttribute('stop-color', BACKLIGHT_MODES[0].colors[2]);
    stop3.setAttribute('stop-opacity', '0.3');
    stop3.id = 'pc-bl-stop3';
    grad.appendChild(stop1);
    grad.appendChild(stop2);
    grad.appendChild(stop3);
    defs.appendChild(grad);

    // Drop shadow filter
    var shadow = document.createElementNS(NS, 'filter');
    shadow.id = 'pc-shadow';
    shadow.setAttribute('x', '-20%');
    shadow.setAttribute('y', '-20%');
    shadow.setAttribute('width', '140%');
    shadow.setAttribute('height', '140%');
    var feOffset = document.createElementNS(NS, 'feOffset');
    feOffset.setAttribute('in', 'SourceAlpha');
    feOffset.setAttribute('dx', '2');
    feOffset.setAttribute('dy', '3');
    feOffset.setAttribute('result', 'offset');
    shadow.appendChild(feOffset);
    var feBlur = document.createElementNS(NS, 'feGaussianBlur');
    feBlur.setAttribute('in', 'offset');
    feBlur.setAttribute('stdDeviation', '4');
    feBlur.setAttribute('result', 'blur');
    shadow.appendChild(feBlur);
    var feMerge = document.createElementNS(NS, 'feMerge');
    var mergeNode1 = document.createElementNS(NS, 'feMergeNode');
    mergeNode1.setAttribute('in', 'blur');
    var mergeNode2 = document.createElementNS(NS, 'feMergeNode');
    mergeNode2.setAttribute('in', 'SourceGraphic');
    feMerge.appendChild(mergeNode1);
    feMerge.appendChild(mergeNode2);
    shadow.appendChild(feMerge);
    defs.appendChild(shadow);

    // Paper texture filter
    var paperTex = document.createElementNS(NS, 'filter');
    paperTex.id = 'pc-paper-texture';
    paperTex.setAttribute('x', '0%');
    paperTex.setAttribute('y', '0%');
    paperTex.setAttribute('width', '100%');
    paperTex.setAttribute('height', '100%');
    var feTurb = document.createElementNS(NS, 'feTurbulence');
    feTurb.setAttribute('type', 'fractalNoise');
    feTurb.setAttribute('baseFrequency', '0.04');
    feTurb.setAttribute('numOctaves', '4');
    feTurb.setAttribute('result', 'noise');
    paperTex.appendChild(feTurb);
    var feDisp = document.createElementNS(NS, 'feDisplacementMap');
    feDisp.setAttribute('in', 'SourceGraphic');
    feDisp.setAttribute('in2', 'noise');
    feDisp.setAttribute('scale', '2');
    feDisp.setAttribute('xChannelSelector', 'R');
    feDisp.setAttribute('yChannelSelector', 'G');
    paperTex.appendChild(feDisp);
    defs.appendChild(paperTex);

    svg.appendChild(defs);

    layers = [];
    var cx = w / 2;
    var cy = h / 2;
    var minDim = Math.min(w, h);
    var scale = minDim / 600;

    // --- Layer 0: Golden backlight background ---
    var g0 = document.createElementNS(NS, 'g');
    g0.setAttribute('data-layer', '0');
    var bgRect = document.createElementNS(NS, 'rect');
    bgRect.setAttribute('x', '0');
    bgRect.setAttribute('y', '0');
    bgRect.setAttribute('width', w);
    bgRect.setAttribute('height', h);
    bgRect.setAttribute('fill', 'url(#pc-backlight)');
    g0.appendChild(bgRect);
    svg.appendChild(g0);
    layers.push(g0);

    // --- Layer 1: Circular frame with lattice border ---
    var g1 = document.createElementNS(NS, 'g');
    g1.setAttribute('data-layer', '1');
    g1.setAttribute('filter', 'url(#pc-shadow)');
    var frameR = minDim * 0.42;
    // Outer circle
    var outerCircle = document.createElementNS(NS, 'circle');
    outerCircle.setAttribute('cx', cx);
    outerCircle.setAttribute('cy', cy);
    outerCircle.setAttribute('r', frameR);
    outerCircle.setAttribute('fill', 'none');
    outerCircle.setAttribute('stroke', PAPER_RED);
    outerCircle.setAttribute('stroke-width', minDim * 0.03);
    outerCircle.setAttribute('filter', 'url(#pc-paper-texture)');
    g1.appendChild(outerCircle);
    // Inner circle
    var innerCircle = document.createElementNS(NS, 'circle');
    innerCircle.setAttribute('cx', cx);
    innerCircle.setAttribute('cy', cy);
    innerCircle.setAttribute('r', frameR - minDim * 0.035);
    innerCircle.setAttribute('fill', 'none');
    innerCircle.setAttribute('stroke', PAPER_RED);
    innerCircle.setAttribute('stroke-width', minDim * 0.008);
    g1.appendChild(innerCircle);
    // Lattice/cloud border pattern around circle
    var borderCount = 24;
    for (var b = 0; b < borderCount; b++) {
      var bAngle = (b / borderCount) * Math.PI * 2;
      var bx = cx + (frameR - minDim * 0.015) * Math.cos(bAngle);
      var by = cy + (frameR - minDim * 0.015) * Math.sin(bAngle);
      var cloudEl = document.createElementNS(NS, 'path');
      cloudEl.setAttribute('d', cloudPath(bx, by, minDim * 0.05));
      cloudEl.setAttribute('fill', PAPER_RED);
      cloudEl.setAttribute('opacity', '0.6');
      g1.appendChild(cloudEl);
    }
    svg.appendChild(g1);
    layers.push(g1);

    // --- Layer 2: Background — mountains, clouds, pagoda silhouettes ---
    var g2 = document.createElementNS(NS, 'g');
    g2.setAttribute('data-layer', '2');
    g2.setAttribute('filter', 'url(#pc-shadow)');
    // Mountains
    var mt1 = document.createElementNS(NS, 'path');
    mt1.setAttribute('d',
      'M ' + (cx - frameR*0.85) + ' ' + (cy + frameR*0.3) +
      ' L ' + (cx - frameR*0.5) + ' ' + (cy - frameR*0.15) +
      ' L ' + (cx - frameR*0.3) + ' ' + (cy - frameR*0.05) +
      ' L ' + (cx - frameR*0.1) + ' ' + (cy - frameR*0.25) +
      ' L ' + (cx + frameR*0.15) + ' ' + (cy - frameR*0.1) +
      ' L ' + (cx + frameR*0.4) + ' ' + (cy - frameR*0.2) +
      ' L ' + (cx + frameR*0.7) + ' ' + (cy + frameR*0.05) +
      ' L ' + (cx + frameR*0.85) + ' ' + (cy + frameR*0.3) + ' Z'
    );
    mt1.setAttribute('fill', PAPER_RED_DARK);
    mt1.setAttribute('filter', 'url(#pc-paper-texture)');
    g2.appendChild(mt1);
    // Clouds (drifting, assigned class for animation)
    var cloudData = [
      { x: cx - frameR*0.5, y: cy - frameR*0.35, w: minDim*0.12 },
      { x: cx + frameR*0.3, y: cy - frameR*0.4, w: minDim*0.1 },
      { x: cx - frameR*0.1, y: cy - frameR*0.5, w: minDim*0.14 }
    ];
    for (var ci = 0; ci < cloudData.length; ci++) {
      var cd = cloudData[ci];
      var cEl = document.createElementNS(NS, 'path');
      cEl.setAttribute('d', cloudPath(cd.x, cd.y, cd.w));
      cEl.setAttribute('fill', PAPER_RED);
      cEl.setAttribute('class', 'pc-cloud');
      cEl.setAttribute('data-base-x', cd.x);
      cEl.setAttribute('data-speed', (0.3 + ci * 0.15).toString());
      g2.appendChild(cEl);
    }
    // Pagoda
    var pagoda = document.createElementNS(NS, 'path');
    pagoda.setAttribute('d', pagodaPath(cx + frameR*0.5, cy + frameR*0.25, minDim*0.08, minDim*0.18));
    pagoda.setAttribute('fill', PAPER_RED);
    pagoda.setAttribute('stroke', PAPER_RED_DARK);
    pagoda.setAttribute('stroke-width', '1');
    pagoda.setAttribute('filter', 'url(#pc-paper-texture)');
    g2.appendChild(pagoda);
    svg.appendChild(g2);
    layers.push(g2);

    // --- Layer 3: Horse centerpiece ---
    var g3 = document.createElementNS(NS, 'g');
    g3.setAttribute('data-layer', '3');
    g3.setAttribute('filter', 'url(#pc-shadow)');
    var horseSvg = document.createElementNS(NS, 'path');
    horseSvg.setAttribute('d', horsePath(cx, cy + minDim*0.03, scale * 2.2));
    horseSvg.setAttribute('fill', PAPER_RED);
    horseSvg.setAttribute('filter', 'url(#pc-paper-texture)');
    g3.appendChild(horseSvg);
    // Decorative circle behind horse
    var decorCircle = document.createElementNS(NS, 'circle');
    decorCircle.setAttribute('cx', cx);
    decorCircle.setAttribute('cy', cy);
    decorCircle.setAttribute('r', minDim * 0.18);
    decorCircle.setAttribute('fill', 'none');
    decorCircle.setAttribute('stroke', PAPER_RED_LIGHT);
    decorCircle.setAttribute('stroke-width', '2');
    decorCircle.setAttribute('stroke-dasharray', '8 4');
    g3.appendChild(decorCircle);
    svg.appendChild(g3);
    layers.push(g3);

    // --- Layer 4: Foreground — cherry blossoms, lanterns, firecrackers ---
    var g4 = document.createElementNS(NS, 'g');
    g4.setAttribute('data-layer', '4');
    g4.setAttribute('filter', 'url(#pc-shadow)');
    // Cherry blossoms
    var blossomPositions = [
      { x: cx - frameR*0.6, y: cy - frameR*0.3, r: minDim*0.025 },
      { x: cx - frameR*0.7, y: cy - frameR*0.1, r: minDim*0.02 },
      { x: cx - frameR*0.55, y: cy + frameR*0.1, r: minDim*0.03 },
      { x: cx + frameR*0.65, y: cy - frameR*0.25, r: minDim*0.022 },
      { x: cx + frameR*0.55, y: cy + frameR*0.15, r: minDim*0.028 },
      { x: cx - frameR*0.3, y: cy + frameR*0.35, r: minDim*0.018 },
      { x: cx + frameR*0.35, y: cy + frameR*0.35, r: minDim*0.02 },
      { x: cx + frameR*0.7, y: cy + frameR*0.05, r: minDim*0.024 }
    ];
    // Blossom branch (decorative line)
    var branchPath = document.createElementNS(NS, 'path');
    branchPath.setAttribute('d',
      'M ' + (cx - frameR*0.75) + ' ' + (cy - frameR*0.15) +
      ' Q ' + (cx - frameR*0.55) + ' ' + (cy - frameR*0.35) + ' ' + (cx - frameR*0.45) + ' ' + (cy - frameR*0.45) +
      ' M ' + (cx - frameR*0.6) + ' ' + (cy - frameR*0.28) +
      ' Q ' + (cx - frameR*0.5) + ' ' + (cy - frameR*0.1) + ' ' + (cx - frameR*0.45) + ' ' + (cy + frameR*0.15)
    );
    branchPath.setAttribute('fill', 'none');
    branchPath.setAttribute('stroke', PAPER_RED_DARK);
    branchPath.setAttribute('stroke-width', '2');
    g4.appendChild(branchPath);

    for (var bi = 0; bi < blossomPositions.length; bi++) {
      var bp = blossomPositions[bi];
      var bPath = document.createElementNS(NS, 'path');
      bPath.setAttribute('d', cherryBlossomPath(bp.x, bp.y, bp.r));
      bPath.setAttribute('fill', PAPER_RED_LIGHT);
      bPath.setAttribute('filter', 'url(#pc-paper-texture)');
      g4.appendChild(bPath);
      // Blossom center
      var bCenter = document.createElementNS(NS, 'circle');
      bCenter.setAttribute('cx', bp.x);
      bCenter.setAttribute('cy', bp.y);
      bCenter.setAttribute('r', bp.r * 0.25);
      bCenter.setAttribute('fill', PAPER_RED_DARK);
      g4.appendChild(bCenter);
    }
    // Lanterns
    var lanternEls = [];
    var lanternPositions = [
      { x: cx - frameR*0.35, y: cy - frameR*0.55, w: minDim*0.04, h: minDim*0.06 },
      { x: cx + frameR*0.4, y: cy - frameR*0.5, w: minDim*0.035, h: minDim*0.05 }
    ];
    for (var li = 0; li < lanternPositions.length; li++) {
      var lp = lanternPositions[li];
      var lEl = document.createElementNS(NS, 'path');
      lEl.setAttribute('d', lanternPath(lp.x, lp.y, lp.w, lp.h));
      lEl.setAttribute('fill', PAPER_RED);
      lEl.setAttribute('stroke', PAPER_RED_DARK);
      lEl.setAttribute('stroke-width', '1');
      lEl.setAttribute('class', 'pc-lantern');
      lEl.setAttribute('data-base-x', lp.x);
      lEl.setAttribute('data-base-y', lp.y);
      lEl.setAttribute('data-idx', li.toString());
      g4.appendChild(lEl);
      lanternEls.push(lEl);
    }
    // Lantern strings
    for (var si = 0; si < lanternPositions.length; si++) {
      var sp = lanternPositions[si];
      var stringEl = document.createElementNS(NS, 'line');
      stringEl.setAttribute('x1', sp.x);
      stringEl.setAttribute('y1', sp.y - sp.h / 2 - 8);
      stringEl.setAttribute('x2', sp.x);
      stringEl.setAttribute('y2', sp.y - sp.h / 2 - 40);
      stringEl.setAttribute('stroke', PAPER_RED_DARK);
      stringEl.setAttribute('stroke-width', '1');
      g4.appendChild(stringEl);
    }
    // Firecrackers
    var fc1 = document.createElementNS(NS, 'path');
    fc1.setAttribute('d', firecrackerPath(cx + frameR*0.6, cy + frameR*0.1, 5));
    fc1.setAttribute('fill', PAPER_RED);
    fc1.setAttribute('stroke', PAPER_RED_DARK);
    fc1.setAttribute('stroke-width', '1');
    fc1.setAttribute('filter', 'url(#pc-paper-texture)');
    g4.appendChild(fc1);
    svg.appendChild(g4);
    layers.push(g4);

    // --- Layer 5: Border frame with "2026 新年快乐" text cutouts ---
    var g5 = document.createElementNS(NS, 'g');
    g5.setAttribute('data-layer', '5');
    g5.setAttribute('filter', 'url(#pc-shadow)');
    // Outer decorative border rectangle
    var borderMargin = minDim * 0.04;
    var borderRect = document.createElementNS(NS, 'rect');
    borderRect.setAttribute('x', cx - w/2 + borderMargin);
    borderRect.setAttribute('y', cy - h/2 + borderMargin);
    borderRect.setAttribute('width', w - borderMargin * 2);
    borderRect.setAttribute('height', h - borderMargin * 2);
    borderRect.setAttribute('rx', minDim * 0.02);
    borderRect.setAttribute('fill', 'none');
    borderRect.setAttribute('stroke', PAPER_RED);
    borderRect.setAttribute('stroke-width', minDim * 0.015);
    borderRect.setAttribute('filter', 'url(#pc-paper-texture)');
    g5.appendChild(borderRect);
    // Inner decorative border
    var innerMargin = minDim * 0.06;
    var innerRect = document.createElementNS(NS, 'rect');
    innerRect.setAttribute('x', cx - w/2 + innerMargin);
    innerRect.setAttribute('y', cy - h/2 + innerMargin);
    innerRect.setAttribute('width', w - innerMargin * 2);
    innerRect.setAttribute('height', h - innerMargin * 2);
    innerRect.setAttribute('rx', minDim * 0.01);
    innerRect.setAttribute('fill', 'none');
    innerRect.setAttribute('stroke', PAPER_RED);
    innerRect.setAttribute('stroke-width', minDim * 0.005);
    innerRect.setAttribute('stroke-dasharray', '12 6 4 6');
    g5.appendChild(innerRect);
    // Corner decorations (traditional knot motifs)
    var corners = [
      { x: cx - w/2 + innerMargin + 10, y: cy - h/2 + innerMargin + 10 },
      { x: cx + w/2 - innerMargin - 10, y: cy - h/2 + innerMargin + 10 },
      { x: cx - w/2 + innerMargin + 10, y: cy + h/2 - innerMargin - 10 },
      { x: cx + w/2 - innerMargin - 10, y: cy + h/2 - innerMargin - 10 }
    ];
    for (var ci2 = 0; ci2 < corners.length; ci2++) {
      var cp = corners[ci2];
      var knotSize = minDim * 0.03;
      var knot = document.createElementNS(NS, 'path');
      knot.setAttribute('d',
        'M ' + (cp.x - knotSize) + ' ' + cp.y +
        ' C ' + (cp.x - knotSize) + ' ' + (cp.y - knotSize) + ' ' + (cp.x + knotSize) + ' ' + (cp.y - knotSize) + ' ' + (cp.x + knotSize) + ' ' + cp.y +
        ' C ' + (cp.x + knotSize) + ' ' + (cp.y + knotSize) + ' ' + (cp.x - knotSize) + ' ' + (cp.y + knotSize) + ' ' + (cp.x - knotSize) + ' ' + cp.y + ' Z'
      );
      knot.setAttribute('fill', PAPER_RED);
      knot.setAttribute('opacity', '0.8');
      g5.appendChild(knot);
    }
    // Text: "2026" at bottom
    var txt2026 = document.createElementNS(NS, 'text');
    txt2026.setAttribute('x', cx);
    txt2026.setAttribute('y', cy + h/2 - innerMargin - minDim*0.01);
    txt2026.setAttribute('text-anchor', 'middle');
    txt2026.setAttribute('font-size', minDim * 0.05);
    txt2026.setAttribute('font-family', 'Noto Serif SC, serif');
    txt2026.setAttribute('font-weight', '700');
    txt2026.setAttribute('fill', PAPER_RED);
    txt2026.setAttribute('filter', 'url(#pc-paper-texture)');
    txt2026.textContent = '2026';
    g5.appendChild(txt2026);
    // Text: "新年快乐" at top
    var txtCNY = document.createElementNS(NS, 'text');
    txtCNY.setAttribute('x', cx);
    txtCNY.setAttribute('y', cy - h/2 + innerMargin + minDim*0.06);
    txtCNY.setAttribute('text-anchor', 'middle');
    txtCNY.setAttribute('font-size', minDim * 0.06);
    txtCNY.setAttribute('font-family', 'Noto Serif SC, serif');
    txtCNY.setAttribute('font-weight', '700');
    txtCNY.setAttribute('fill', PAPER_RED);
    txtCNY.setAttribute('filter', 'url(#pc-paper-texture)');
    txtCNY.textContent = '\u65B0\u5E74\u5FEB\u4E50';
    g5.appendChild(txtCNY);
    // Side decorative text
    var txtLeft = document.createElementNS(NS, 'text');
    txtLeft.setAttribute('x', cx - w/2 + innerMargin + minDim*0.02);
    txtLeft.setAttribute('y', cy);
    txtLeft.setAttribute('text-anchor', 'middle');
    txtLeft.setAttribute('font-size', minDim * 0.035);
    txtLeft.setAttribute('font-family', 'Noto Serif SC, serif');
    txtLeft.setAttribute('fill', PAPER_RED);
    txtLeft.setAttribute('writing-mode', 'vertical-rl');
    txtLeft.textContent = '\u9A6C\u5230\u6210\u529F';
    g5.appendChild(txtLeft);
    var txtRight = document.createElementNS(NS, 'text');
    txtRight.setAttribute('x', cx + w/2 - innerMargin - minDim*0.02);
    txtRight.setAttribute('y', cy);
    txtRight.setAttribute('text-anchor', 'middle');
    txtRight.setAttribute('font-size', minDim * 0.035);
    txtRight.setAttribute('font-family', 'Noto Serif SC, serif');
    txtRight.setAttribute('fill', PAPER_RED);
    txtRight.setAttribute('writing-mode', 'vertical-rl');
    txtRight.textContent = '\u9F99\u9A6C\u7CBE\u795E';
    g5.appendChild(txtRight);
    svg.appendChild(g5);
    layers.push(g5);

    return svg;
  }

  // (horsePath is the canonical name, used directly)

  // ---- Sparkle Particles ----

  function initSparkles(w, h, count) {
    sparkles = [];
    for (var i = 0; i < count; i++) {
      sparkles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.5 - 0.1,
        size: Math.random() * 2.5 + 0.5,
        alpha: Math.random() * 0.6 + 0.2,
        layer: Math.floor(Math.random() * 4) + 1, // between layers 1-4
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function updateSparkles(w, h) {
    for (var i = 0; i < sparkles.length; i++) {
      var sp = sparkles[i];
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.alpha = 0.3 + 0.3 * Math.sin(time * 2 + sp.phase);
      if (sp.y < -10) {
        sp.y = h + 10;
        sp.x = Math.random() * w;
      }
      if (sp.x < -10) sp.x = w + 10;
      if (sp.x > w + 10) sp.x = -10;
    }
  }

  function drawSparkles(context, w, h) {
    for (var i = 0; i < sparkles.length; i++) {
      var sp = sparkles[i];
      context.save();
      context.globalAlpha = sp.alpha;
      context.fillStyle = COLORS.GOLD;
      context.shadowColor = COLORS.GOLD;
      context.shadowBlur = 6;
      context.beginPath();
      // Diamond shape for sparkle
      context.moveTo(sp.x, sp.y - sp.size);
      context.lineTo(sp.x + sp.size * 0.6, sp.y);
      context.lineTo(sp.x, sp.y + sp.size);
      context.lineTo(sp.x - sp.size * 0.6, sp.y);
      context.closePath();
      context.fill();
      context.restore();
    }
  }

  // ---- Idle Animations ----

  function updateIdleAnimations() {
    if (!svgEl) return;
    // Cloud drift
    var clouds = svgEl.querySelectorAll('.pc-cloud');
    for (var i = 0; i < clouds.length; i++) {
      var cl = clouds[i];
      var baseX = parseFloat(cl.getAttribute('data-base-x'));
      var speed = parseFloat(cl.getAttribute('data-speed'));
      var dx = Math.sin(time * speed) * 8;
      cl.setAttribute('transform', 'translate(' + dx + ', 0)');
    }
    // Lantern sway
    var lanterns = svgEl.querySelectorAll('.pc-lantern');
    for (var j = 0; j < lanterns.length; j++) {
      var lt = lanterns[j];
      var lbx = parseFloat(lt.getAttribute('data-base-x'));
      var lby = parseFloat(lt.getAttribute('data-base-y'));
      var idx = parseInt(lt.getAttribute('data-idx'), 10);
      var angle = Math.sin(time * 1.2 + idx * 1.5) * 3;
      lt.setAttribute('transform',
        'rotate(' + angle + ' ' + lbx + ' ' + (lby - 40) + ')'
      );
    }
  }

  // ---- Parallax Update ----

  function updateParallax() {
    if (!svgEl || !mouse) return;

    var normX = (mouse.x / W - 0.5) * 2; // -1 to 1
    var normY = (mouse.y / H - 0.5) * 2;

    for (var i = 0; i < layers.length; i++) {
      var targetX = normX * PARALLAX_DEPTHS[i];
      var targetY = normY * PARALLAX_DEPTHS[i];
      var targetRot = normX * ROTATION_DEPTHS[i];

      currentParallax[i].x = lerp(currentParallax[i].x, targetX, 0.05);
      currentParallax[i].y = lerp(currentParallax[i].y, targetY, 0.05);
      currentRotation[i] = lerp(currentRotation[i], targetRot, 0.05);

      var px = currentParallax[i].x;
      var py = currentParallax[i].y;
      var rot = currentRotation[i];

      layers[i].setAttribute('transform',
        'translate(' + px + ',' + py + ') rotate(' + rot + ' ' + (W/2) + ' ' + (H/2) + ')'
      );
    }
  }

  // ---- Backlight Toggle ----

  function cycleBacklight() {
    backlightIndex = (backlightIndex + 1) % BACKLIGHT_MODES.length;
    var mode = BACKLIGHT_MODES[backlightIndex];
    var s1 = document.getElementById('pc-bl-stop1');
    var s2 = document.getElementById('pc-bl-stop2');
    var s3 = document.getElementById('pc-bl-stop3');
    if (s1) s1.setAttribute('stop-color', mode.colors[0]);
    if (s2) s2.setAttribute('stop-color', mode.colors[1]);
    if (s3) s3.setAttribute('stop-color', mode.colors[2]);
  }

  // ---- Animation Loop ----

  function animate() {
    if (!running) return;
    time += 0.016;

    mouse.update(mouse._targetX, mouse._targetY);
    updateParallax();
    updateIdleAnimations();

    // Draw sparkles on canvas
    if (ctx) {
      ctx.clearRect(0, 0, W, H);
      updateSparkles(W, H);
      drawSparkles(ctx, W, H);
    }

    animId = requestAnimationFrame(animate);
  }

  // ---- Mouse Handling ----

  function onMouseMove(e) {
    if (!section) return;
    var rect = section.getBoundingClientRect();
    mouse.update(e.clientX - rect.left, e.clientY - rect.top);
  }

  function onTouchMove(e) {
    if (!section || !e.touches.length) return;
    var rect = section.getBoundingClientRect();
    mouse.update(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
  }

  // ---- Card API ----

  function init(canvasEl) {
    canvas = canvasEl;
    section = canvasEl.closest('.card-section');
  }

  function start(canvasEl) {
    canvas = canvasEl;
    section = canvasEl.closest('.card-section');
    W = section.clientWidth;
    H = section.clientHeight;

    canvas.width = W;
    canvas.height = H;
    ctx = canvas.getContext('2d');

    mouse = new SmoothMouse(0.05);
    mouse.update(W / 2, H / 2);

    // Build and insert SVG
    svgEl = buildSVG(W, H);
    section.style.position = 'relative';
    section.appendChild(svgEl);

    // Sparkles
    initSparkles(W, H, 40);

    // Events
    section.addEventListener('mousemove', onMouseMove);
    section.addEventListener('touchmove', onTouchMove, { passive: true });
    boundClick = cycleBacklight;
    section.addEventListener('click', boundClick);

    running = true;
    animate();
  }

  function pause() {
    running = false;
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  function resume() {
    if (!running) {
      running = true;
      animate();
    }
  }

  function destroy() {
    pause();
    if (section) {
      section.removeEventListener('mousemove', onMouseMove);
      section.removeEventListener('touchmove', onTouchMove);
      if (boundClick) section.removeEventListener('click', boundClick);
      if (svgEl && svgEl.parentNode) {
        svgEl.parentNode.removeChild(svgEl);
      }
    }
    svgEl = null;
    layers = [];
    sparkles = [];
    ctx = null;
  }

  registerCard(5, {
    init: init,
    start: start,
    pause: pause,
    resume: resume,
    destroy: destroy
  });

})();
