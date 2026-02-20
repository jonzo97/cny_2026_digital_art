/* ============================================
   CNY 2026 — Card 4: Ink Wash Generative Horse
   ============================================ */

(function() {
  'use strict';

  // ---- Constants ----
  var INK_BLACK_R = 26, INK_BLACK_G = 26, INK_BLACK_B = 26;
  var IVORY_R = 255, IVORY_G = 255, IVORY_B = 240;
  var VERMILLION = '#CC3333';
  var STROKE_ANIM_MS = 1500;
  var PAUSE_BETWEEN_STROKES_MS = 200;
  var STAMPS_PER_PIXEL = 0.8;
  var SEAL_DELAY_MS = 800;
  var AMBIENT_BLEED_INTERVAL = 120;

  // ---- State ----
  var canvas, ctx;
  var width = 0, height = 0;
  var dpr = 1;
  var animId = null;
  var running = false;
  var startTime = 0;

  // Offscreen canvases
  var paintCanvas, paintCtx;   // accumulated completed strokes
  var activeCanvas, activeCtx; // current animating stroke
  var paperCanvas, paperCtx;   // rice paper texture

  // Stroke data
  var strokes = [];
  var currentStrokeIndex = 0;
  var lastRenderedIndex = -1;  // tracks which strokes are baked into paintCanvas
  var strokeStartTime = 0;
  var paintingDone = false;
  var sealShown = false;
  var sealAlpha = 0;

  // Ink splatters from clicks
  var splatters = [];

  // Ambient bleed
  var lastBleedTime = 0;
  var bleedPoints = [];

  // Replay button
  var replayBtn = null;

  // Click handler reference
  var clickHandler = null;

  // ---- Horse Stroke Paths (Bezier control points) ----
  // Each stroke: { points: [[x,y],...], width, opacity, group }
  // Coordinates in normalized 0-1 space, mapped to canvas at render time
  function defineStrokes() {
    strokes = [
      // GROUP 1: Body outline
      // Back line
      { points: [[0.35,0.38],[0.40,0.32],[0.50,0.30],[0.60,0.33]], width: 18, opacity: 0.75, group: 0 },
      // Upper body contour
      { points: [[0.60,0.33],[0.65,0.35],[0.68,0.40],[0.66,0.48]], width: 16, opacity: 0.7, group: 0 },
      // Belly curve
      { points: [[0.38,0.55],[0.45,0.60],[0.55,0.62],[0.63,0.55]], width: 14, opacity: 0.5, group: 0 },
      // Chest
      { points: [[0.35,0.38],[0.33,0.42],[0.34,0.48],[0.38,0.55]], width: 15, opacity: 0.65, group: 0 },
      // Rump
      { points: [[0.66,0.48],[0.68,0.52],[0.67,0.56],[0.63,0.55]], width: 14, opacity: 0.6, group: 0 },

      // GROUP 2: Head and neck
      // Neck
      { points: [[0.35,0.38],[0.30,0.34],[0.26,0.28],[0.24,0.22]], width: 14, opacity: 0.7, group: 1 },
      // Head
      { points: [[0.24,0.22],[0.22,0.19],[0.19,0.17],[0.17,0.18]], width: 10, opacity: 0.8, group: 1 },
      // Jaw line
      { points: [[0.17,0.18],[0.18,0.21],[0.21,0.24],[0.25,0.25]], width: 8, opacity: 0.6, group: 1 },
      // Ear
      { points: [[0.22,0.17],[0.21,0.13],[0.23,0.11],[0.24,0.14]], width: 5, opacity: 0.8, group: 1 },
      // Second ear
      { points: [[0.24,0.17],[0.24,0.13],[0.26,0.12],[0.26,0.15]], width: 4, opacity: 0.7, group: 1 },

      // GROUP 3: Mane and tail
      // Mane strands (flowing, expressive)
      { points: [[0.28,0.24],[0.26,0.28],[0.24,0.33],[0.27,0.36]], width: 8, opacity: 0.55, group: 2 },
      { points: [[0.30,0.22],[0.27,0.26],[0.25,0.31],[0.28,0.34]], width: 6, opacity: 0.45, group: 2 },
      { points: [[0.32,0.26],[0.29,0.30],[0.27,0.35],[0.30,0.38]], width: 7, opacity: 0.4, group: 2 },
      // Tail (dramatic swoosh)
      { points: [[0.66,0.45],[0.72,0.40],[0.78,0.36],[0.82,0.30]], width: 10, opacity: 0.65, group: 2 },
      { points: [[0.66,0.46],[0.73,0.42],[0.80,0.38],[0.84,0.33]], width: 7, opacity: 0.45, group: 2 },
      { points: [[0.66,0.44],[0.71,0.38],[0.76,0.34],[0.80,0.28]], width: 5, opacity: 0.35, group: 2 },

      // GROUP 4: Legs
      // Front left leg
      { points: [[0.38,0.55],[0.37,0.62],[0.36,0.70],[0.35,0.78]], width: 8, opacity: 0.7, group: 3 },
      // Front right leg (slightly forward)
      { points: [[0.42,0.56],[0.40,0.63],[0.38,0.71],[0.39,0.78]], width: 7, opacity: 0.6, group: 3 },
      // Hind left leg
      { points: [[0.60,0.55],[0.59,0.63],[0.57,0.71],[0.56,0.78]], width: 8, opacity: 0.7, group: 3 },
      // Hind right leg
      { points: [[0.64,0.54],[0.63,0.62],[0.62,0.70],[0.63,0.78]], width: 7, opacity: 0.55, group: 3 },
      // Hooves (small thick marks)
      { points: [[0.34,0.78],[0.35,0.80],[0.36,0.80],[0.36,0.78]], width: 6, opacity: 0.85, group: 3 },
      { points: [[0.38,0.78],[0.39,0.80],[0.40,0.80],[0.40,0.78]], width: 6, opacity: 0.8, group: 3 },
      { points: [[0.55,0.78],[0.56,0.80],[0.57,0.80],[0.57,0.78]], width: 6, opacity: 0.85, group: 3 },
      { points: [[0.62,0.78],[0.63,0.80],[0.64,0.80],[0.64,0.78]], width: 6, opacity: 0.8, group: 3 },

      // GROUP 5: Details (eye, nostril, wash accents)
      // Eye
      { points: [[0.20,0.18],[0.205,0.178],[0.21,0.18],[0.205,0.183]], width: 3, opacity: 0.9, group: 4 },
      // Nostril
      { points: [[0.17,0.19],[0.172,0.192],[0.175,0.19]], width: 2, opacity: 0.85, group: 4 },
      // Body wash (light, broad strokes for volume)
      { points: [[0.40,0.40],[0.48,0.42],[0.56,0.44],[0.62,0.46]], width: 25, opacity: 0.15, group: 4 },
      { points: [[0.42,0.46],[0.50,0.50],[0.58,0.52],[0.60,0.50]], width: 22, opacity: 0.12, group: 4 },
    ];
  }

  // ---- Bezier Math ----
  function bezierPoint(pts, t) {
    // De Casteljau's algorithm for arbitrary number of control points
    var p = pts.map(function(pt) { return [pt[0], pt[1]]; });
    var n = p.length;
    for (var r = 1; r < n; r++) {
      for (var i = 0; i < n - r; i++) {
        p[i][0] = (1 - t) * p[i][0] + t * p[i + 1][0];
        p[i][1] = (1 - t) * p[i][1] + t * p[i + 1][1];
      }
    }
    return p[0];
  }

  function bezierLength(pts, segments) {
    segments = segments || 20;
    var len = 0;
    var prev = bezierPoint(pts, 0);
    for (var i = 1; i <= segments; i++) {
      var curr = bezierPoint(pts, i / segments);
      var dx = curr[0] - prev[0];
      var dy = curr[1] - prev[1];
      len += Math.sqrt(dx * dx + dy * dy);
      prev = curr;
    }
    return len;
  }

  // ---- Rice Paper Texture ----
  function generatePaperTexture() {
    paperCanvas = document.createElement('canvas');
    paperCanvas.width = width;
    paperCanvas.height = height;
    paperCtx = paperCanvas.getContext('2d');

    // Fill with ivory
    paperCtx.fillStyle = COLORS.IVORY;
    paperCtx.fillRect(0, 0, width, height);

    // Low-frequency noise for large tonal variation
    var imgData = paperCtx.getImageData(0, 0, width, height);
    var data = imgData.data;
    var step = 2; // sample every 2px for performance
    for (var y = 0; y < height; y += step) {
      for (var x = 0; x < width; x += step) {
        var n1 = noise2D(x * 0.005, y * 0.005) * 0.5 + 0.5; // 0-1
        var n2 = noise2D(x * 0.02 + 100, y * 0.02 + 100) * 0.5 + 0.5;
        var grain = (Math.random() - 0.5) * 8;

        var variation = (n1 * 12 - 6) + (n2 * 6 - 3) + grain;

        // Apply to step x step block
        for (var dy = 0; dy < step && y + dy < height; dy++) {
          for (var dx = 0; dx < step && x + dx < width; dx++) {
            var idx = ((y + dy) * width + (x + dx)) * 4;
            data[idx]     = Math.max(0, Math.min(255, IVORY_R + variation));
            data[idx + 1] = Math.max(0, Math.min(255, IVORY_G + variation));
            data[idx + 2] = Math.max(0, Math.min(255, IVORY_B + variation - 2));
            data[idx + 3] = 255;
          }
        }
      }
    }
    paperCtx.putImageData(imgData, 0, 0);

    // Add some fiber lines
    paperCtx.strokeStyle = 'rgba(200, 190, 170, 0.15)';
    paperCtx.lineWidth = 0.5;
    for (var i = 0; i < 40; i++) {
      var sx = Math.random() * width;
      var sy = Math.random() * height;
      var angle = Math.random() * Math.PI;
      var len = 30 + Math.random() * 80;
      paperCtx.beginPath();
      paperCtx.moveTo(sx, sy);
      paperCtx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len);
      paperCtx.stroke();
    }
  }

  // ---- Brush Stamp (single ink dot) ----
  function stampBrush(cx, cy, radius, opacity, targetCtx) {
    var drawCtx = targetCtx || paintCtx;
    var r = Math.max(1, radius);
    drawCtx.save();

    var grad = drawCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
    var centerOpacity = Math.min(1, opacity * 1.2);
    var edgeOpacity = opacity * 0.2;
    grad.addColorStop(0, 'rgba(' + INK_BLACK_R + ',' + INK_BLACK_G + ',' + INK_BLACK_B + ',' + centerOpacity + ')');
    grad.addColorStop(0.5, 'rgba(' + INK_BLACK_R + ',' + INK_BLACK_G + ',' + INK_BLACK_B + ',' + opacity * 0.8 + ')');
    grad.addColorStop(1, 'rgba(' + INK_BLACK_R + ',' + INK_BLACK_G + ',' + INK_BLACK_B + ',' + edgeOpacity + ')');

    drawCtx.fillStyle = grad;
    drawCtx.beginPath();
    drawCtx.arc(cx, cy, r, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.restore();
  }

  // ---- Render a Full Stroke (at progress t: 0-1) ----
  // targetCtx allows rendering to either paintCtx (cache) or activeCtx (animation)
  function renderStroke(stroke, progress, targetCtx) {
    var drawCtx = targetCtx || paintCtx;
    var pts = stroke.points.map(function(p) {
      return [p[0] * width, p[1] * height];
    });

    var baseWidth = stroke.width * (width / 900);
    var baseOpacity = stroke.opacity;
    var totalLen = bezierLength(pts, 30);
    var numStamps = Math.max(8, Math.floor(totalLen * STAMPS_PER_PIXEL));
    var stepsToRender = Math.floor(numStamps * progress);

    for (var i = 0; i < stepsToRender; i++) {
      var t = i / numStamps;
      var pt = bezierPoint(pts, t);
      var px = pt[0];
      var py = pt[1];

      // Pressure simulation: stronger in center, lighter at edges
      var pressureCurve = Math.sin(t * Math.PI); // 0 at start/end, 1 at middle
      var pressure = 0.3 + pressureCurve * 0.7;

      // Perlin noise modulates radius and position
      var noiseVal = noise2D(px * 0.01 + i * 0.3, py * 0.01);
      var noiseVal2 = noise2D(px * 0.02 + 50, py * 0.02 + 50);

      var r = baseWidth * pressure * (0.7 + noiseVal * 0.3);
      var op = baseOpacity * pressure * (0.6 + noiseVal2 * 0.4);

      // Slight random offset for organic feel
      var offX = noiseVal * r * 0.3;
      var offY = noiseVal2 * r * 0.3;

      stampBrush(px + offX, py + offY, r, op, drawCtx);
    }
  }

  // ---- Ink Diffusion (bleed tendrils at edges) ----
  function addBleedTendril(cx, cy, maxLen, targetCtx) {
    var drawCtx = targetCtx || paintCtx;
    var angle = Math.random() * Math.PI * 2;
    var len = 5 + Math.random() * maxLen;
    var steps = Math.floor(len / 2);
    var x = cx;
    var y = cy;
    for (var i = 0; i < steps; i++) {
      var t = i / steps;
      var op = 0.08 * (1 - t);
      var r = 1 + Math.random() * 2;
      angle += (Math.random() - 0.5) * 0.8;
      x += Math.cos(angle) * 2;
      y += Math.sin(angle) * 2;
      stampBrush(x, y, r, op, drawCtx);
    }
  }

  // ---- Seal Stamp (vermillion) ----
  function drawSeal(alpha) {
    var sealSize = Math.min(width, height) * 0.08;
    var sealX = width * 0.78;
    var sealY = height * 0.72;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Red square with slightly rough edges
    ctx.fillStyle = VERMILLION;
    ctx.beginPath();
    var half = sealSize / 2;
    // Slightly irregular rectangle
    ctx.moveTo(sealX - half + 1, sealY - half);
    ctx.lineTo(sealX + half, sealY - half + 1);
    ctx.lineTo(sealX + half - 1, sealY + half);
    ctx.lineTo(sealX - half, sealY + half - 1);
    ctx.closePath();
    ctx.fill();

    // 福 character inside
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold ' + Math.floor(sealSize * 0.65) + 'px "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u798F', sealX, sealY + 1);

    // Thin border
    ctx.strokeStyle = 'rgba(100,20,20,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  // ---- Ink Splatter (on click) ----
  function addSplatter(x, y) {
    var count = 5 + Math.floor(Math.random() * 10);
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var dist = 5 + Math.random() * 40;
      var sx = x + Math.cos(angle) * dist;
      var sy = y + Math.sin(angle) * dist;
      var r = 1 + Math.random() * 6;
      var op = 0.2 + Math.random() * 0.5;
      stampBrush(sx, sy, r, op);
    }
    // A few tendrils from splatter center
    for (var j = 0; j < 3; j++) {
      addBleedTendril(x, y, 20);
    }
    splatters.push({ x: x, y: y, time: Date.now() });
  }

  // ---- Replay ----
  function resetPainting() {
    currentStrokeIndex = 0;
    lastRenderedIndex = -1;
    strokeStartTime = 0;
    paintingDone = false;
    sealShown = false;
    sealAlpha = 0;
    splatters = [];
    bleedPoints = [];
    lastBleedTime = 0;

    if (paintCtx) {
      paintCtx.clearRect(0, 0, width, height);
    }
    if (activeCtx) {
      activeCtx.clearRect(0, 0, width, height);
    }

    if (replayBtn) {
      replayBtn.style.display = 'none';
    }

    startTime = performance.now();
  }

  // ---- Create Replay Button ----
  function createReplayButton() {
    if (replayBtn) return;
    replayBtn = document.createElement('button');
    replayBtn.textContent = '\u91CD\u64AD'; // 重播
    replayBtn.style.cssText = 'position:absolute;bottom:20px;right:20px;z-index:10;' +
      'background:rgba(26,26,26,0.6);color:#FFFFF0;border:1px solid rgba(255,255,240,0.3);' +
      'padding:6px 16px;font-family:"Noto Serif SC",serif;font-size:14px;cursor:pointer;' +
      'border-radius:4px;opacity:0;transition:opacity 0.5s;pointer-events:none;';
    canvas.parentElement.style.position = 'relative';
    canvas.parentElement.appendChild(replayBtn);
    replayBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      resetPainting();
    });
  }

  function showReplayButton() {
    if (replayBtn) {
      replayBtn.style.opacity = '1';
      replayBtn.style.pointerEvents = 'auto';
      replayBtn.style.display = '';
    }
  }

  // ---- Resize ----
  function resize() {
    dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    width = Math.floor(rect.width * dpr);
    height = Math.floor(rect.height * dpr);
    canvas.width = width;
    canvas.height = height;

    // Recreate offscreen canvases
    paintCanvas = document.createElement('canvas');
    paintCanvas.width = width;
    paintCanvas.height = height;
    paintCtx = paintCanvas.getContext('2d');

    activeCanvas = document.createElement('canvas');
    activeCanvas.width = width;
    activeCanvas.height = height;
    activeCtx = activeCanvas.getContext('2d');

    generatePaperTexture();
  }

  // ---- Bake completed strokes into paintCanvas cache ----
  function bakeCompletedStrokes(upToIndex) {
    // Render any newly completed strokes into the persistent paintCanvas
    for (var i = lastRenderedIndex + 1; i < upToIndex; i++) {
      renderStroke(strokes[i], 1, paintCtx);
    }
    lastRenderedIndex = upToIndex - 1;
  }

  // ---- Main Animation Loop ----
  function tick(now) {
    if (!running) return;
    animId = requestAnimationFrame(tick);

    // Draw paper background
    ctx.drawImage(paperCanvas, 0, 0);

    // Animate strokes
    if (!paintingDone && strokes.length > 0) {
      if (strokeStartTime === 0) {
        strokeStartTime = now;
      }

      var elapsed = now - strokeStartTime;
      var strokeTime = STROKE_ANIM_MS;
      var totalStrokeTime = strokeTime + PAUSE_BETWEEN_STROKES_MS;

      // Determine which stroke we're on and its progress
      var timeInSequence = elapsed;
      var idx = 0;
      while (idx < strokes.length && timeInSequence >= totalStrokeTime) {
        timeInSequence -= totalStrokeTime;
        idx++;
      }

      if (idx >= strokes.length) {
        // All strokes done — bake remaining into cache
        bakeCompletedStrokes(strokes.length);
        currentStrokeIndex = strokes.length;
        paintingDone = true;
      } else {
        // Bake any newly completed strokes into paintCanvas
        if (idx > lastRenderedIndex + 1) {
          bakeCompletedStrokes(idx);
        }

        currentStrokeIndex = idx;
        var strokeProgress = Math.min(1, timeInSequence / strokeTime);

        // Render current animating stroke onto temporary activeCanvas
        activeCtx.clearRect(0, 0, width, height);
        renderStroke(strokes[currentStrokeIndex], strokeProgress, activeCtx);
      }
    } else if (paintingDone && !sealShown) {
      // Add bleed tendrils at stroke edges (once)
      for (var k = 0; k < strokes.length; k++) {
        var s = strokes[k];
        var numTendrils = 2 + Math.floor(Math.random() * 3);
        for (var m = 0; m < numTendrils; m++) {
          var t = Math.random();
          var pt = bezierPoint(s.points.map(function(p) { return [p[0] * width, p[1] * height]; }), t);
          addBleedTendril(pt[0], pt[1], 15, paintCtx);
        }
      }
      sealShown = true;
      sealAlpha = 0;
    }

    // Composite: cached strokes + active stroke onto main canvas
    ctx.drawImage(paintCanvas, 0, 0);
    if (!paintingDone && activeCanvas) {
      ctx.drawImage(activeCanvas, 0, 0);
    }

    // Seal stamp fade-in
    if (paintingDone) {
      if (sealAlpha < 1) {
        sealAlpha = Math.min(1, sealAlpha + 0.02);
      }
      drawSeal(sealAlpha);

      // Show replay button
      if (sealAlpha >= 0.8) {
        showReplayButton();
      }

      // Ambient bleed at edges
      if (now - lastBleedTime > AMBIENT_BLEED_INTERVAL) {
        lastBleedTime = now;
        var rs = strokes[Math.floor(Math.random() * strokes.length)];
        var rt = Math.random() < 0.15 ? 0 : (Math.random() > 0.85 ? 1 : Math.random());
        var rp = bezierPoint(rs.points.map(function(p) { return [p[0] * width, p[1] * height]; }), rt);
        addBleedTendril(rp[0], rp[1], 8, paintCtx);
      }
    }
  }

  // ---- Init ----
  function init(cvs) {
    canvas = cvs;
    ctx = canvas.getContext('2d');
    defineStrokes();
    createReplayButton();
  }

  // ---- Start ----
  function start(cvs) {
    canvas = cvs || canvas;
    ctx = canvas.getContext('2d');
    running = true;

    resize();
    resetPainting();

    // Click handler for splatters
    clickHandler = function(e) {
      if (!paintingDone) return;
      var rect = canvas.getBoundingClientRect();
      var x = (e.clientX - rect.left) * dpr;
      var y = (e.clientY - rect.top) * dpr;
      addSplatter(x, y);
    };
    canvas.addEventListener('click', clickHandler);

    animId = requestAnimationFrame(tick);
  }

  // ---- Pause ----
  function pause() {
    running = false;
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  // ---- Resume ----
  function resume() {
    if (running) return;
    running = true;
    animId = requestAnimationFrame(tick);
  }

  // ---- Destroy ----
  function destroy() {
    pause();
    if (canvas && clickHandler) {
      canvas.removeEventListener('click', clickHandler);
      clickHandler = null;
    }
    if (replayBtn && replayBtn.parentElement) {
      replayBtn.parentElement.removeChild(replayBtn);
      replayBtn = null;
    }
    paintCanvas = null;
    paintCtx = null;
    activeCanvas = null;
    activeCtx = null;
    paperCanvas = null;
    paperCtx = null;
  }

  // ---- Register ----
  registerCard(4, {
    init: init,
    start: start,
    pause: pause,
    resume: resume,
    destroy: destroy
  });

})();
