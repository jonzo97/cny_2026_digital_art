/* ============================================
   CNY 2026 — Card 1: Fourier Epicycle Drawing
   ============================================ */

(function() {
  'use strict';

  // ---- Constants ----
  var MAX_TRAIL = 4000;
  var HORSE_EPICYCLES = 80;
  var FU_EPICYCLES = 200;
  var PAUSE_AFTER_HORSE = 2000;
  var PAUSE_AFTER_FU = 3000;
  var FADE_DURATION = 800;
  var DEFAULT_SPEED = 1;
  var BG_COLOR = '#0a0a0a';
  var GRID_COLOR = 'rgba(255,215,0,0.05)';
  var EPICYCLE_COLOR = 'rgba(255,215,0,0.25)';
  var ARM_COLOR = 'rgba(255,215,0,0.5)';
  var TRACE_COLOR = COLORS.CRIMSON;
  var TRACE_GLOW = '#ff2050';

  // ---- State ----
  var canvas, ctx;
  var width = 0, height = 0;
  var dpr = 1;
  var animId = null;
  var running = false;

  // DFT data
  var horseDFT = null;
  var fuDFT = null;
  var currentDFT = null;
  var visibleCount = 0;
  var maxCount = 0;

  // Animation
  var time = 0;
  var speed = DEFAULT_SPEED;
  var trail = [];
  var phase = 'draw-horse'; // draw-horse, pause-horse, fade-to-fu, draw-fu, pause-fu, fade-to-horse
  var phaseStart = 0;
  var paused = false;

  // Spectrum
  var spectrumVisible = true;

  // Mouse
  var mouseY = 0;
  var mouseInCanvas = false;

  // ---- Parse SVG Path to Points ----
  function parseSVGPath(pathStr, numPoints) {
    // Simple parser for M, C, Z commands in the horse path
    var commands = [];
    var regex = /([MCLZ])\s*([-\d.,\s]*)/gi;
    var match;
    while ((match = regex.exec(pathStr)) !== null) {
      var cmd = match[1].toUpperCase();
      var nums = match[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
      commands.push({ cmd: cmd, nums: nums });
    }

    // Convert to line segments via cubic bezier evaluation
    var segments = [];
    var cx = 0, cy = 0;
    var startX = 0, startY = 0;

    for (var i = 0; i < commands.length; i++) {
      var c = commands[i];
      if (c.cmd === 'M') {
        cx = c.nums[0]; cy = c.nums[1];
        startX = cx; startY = cy;
      } else if (c.cmd === 'C') {
        for (var j = 0; j < c.nums.length; j += 6) {
          segments.push({
            type: 'cubic',
            x0: cx, y0: cy,
            x1: c.nums[j], y1: c.nums[j+1],
            x2: c.nums[j+2], y2: c.nums[j+3],
            x3: c.nums[j+4], y3: c.nums[j+5]
          });
          cx = c.nums[j+4]; cy = c.nums[j+5];
        }
      } else if (c.cmd === 'L') {
        for (var j = 0; j < c.nums.length; j += 2) {
          segments.push({
            type: 'line',
            x0: cx, y0: cy,
            x1: c.nums[j], y1: c.nums[j+1]
          });
          cx = c.nums[j]; cy = c.nums[j+1];
        }
      } else if (c.cmd === 'Q') {
        for (var j = 0; j < c.nums.length; j += 4) {
          segments.push({
            type: 'quad',
            x0: cx, y0: cy,
            x1: c.nums[j], y1: c.nums[j+1],
            x2: c.nums[j+2], y2: c.nums[j+3]
          });
          cx = c.nums[j+2]; cy = c.nums[j+3];
        }
      } else if (c.cmd === 'Z') {
        segments.push({
          type: 'line',
          x0: cx, y0: cy,
          x1: startX, y1: startY
        });
        cx = startX; cy = startY;
      }
    }

    // Compute total arc length approximation
    var lengths = [];
    var totalLen = 0;
    for (var i = 0; i < segments.length; i++) {
      var seg = segments[i];
      var len = 0;
      if (seg.type === 'line') {
        var dx = seg.x1 - seg.x0;
        var dy = seg.y1 - seg.y0;
        len = Math.sqrt(dx * dx + dy * dy);
      } else if (seg.type === 'quad') {
        // Approximate quadratic bezier length
        var prevX = seg.x0, prevY = seg.y0;
        for (var s = 1; s <= 20; s++) {
          var t = s / 20;
          var mt = 1 - t;
          var px = mt*mt*seg.x0 + 2*mt*t*seg.x1 + t*t*seg.x2;
          var py = mt*mt*seg.y0 + 2*mt*t*seg.y1 + t*t*seg.y2;
          var dx = px - prevX;
          var dy = py - prevY;
          len += Math.sqrt(dx * dx + dy * dy);
          prevX = px; prevY = py;
        }
      } else {
        // Approximate cubic bezier length with 20 subdivisions
        var prevX = seg.x0, prevY = seg.y0;
        for (var s = 1; s <= 20; s++) {
          var t = s / 20;
          var mt = 1 - t;
          var px = mt*mt*mt*seg.x0 + 3*mt*mt*t*seg.x1 + 3*mt*t*t*seg.x2 + t*t*t*seg.x3;
          var py = mt*mt*mt*seg.y0 + 3*mt*mt*t*seg.y1 + 3*mt*t*t*seg.y2 + t*t*t*seg.y3;
          var dx = px - prevX;
          var dy = py - prevY;
          len += Math.sqrt(dx * dx + dy * dy);
          prevX = px; prevY = py;
        }
      }
      lengths.push(len);
      totalLen += len;
    }

    // Sample uniform points along path
    var points = [];
    var targetSpacing = totalLen / numPoints;
    var accumulated = 0;
    var nextDist = 0;

    for (var i = 0; i < segments.length && points.length < numPoints; i++) {
      var seg = segments[i];
      var segLen = lengths[i];
      var steps = Math.max(1, Math.ceil(segLen / (targetSpacing * 0.25)));

      for (var s = 0; s <= steps && points.length < numPoints; s++) {
        var t = s / steps;
        var px, py;
        if (seg.type === 'line') {
          px = seg.x0 + (seg.x1 - seg.x0) * t;
          py = seg.y0 + (seg.y1 - seg.y0) * t;
        } else if (seg.type === 'quad') {
          var mt = 1 - t;
          px = mt*mt*seg.x0 + 2*mt*t*seg.x1 + t*t*seg.x2;
          py = mt*mt*seg.y0 + 2*mt*t*seg.y1 + t*t*seg.y2;
        } else {
          var mt = 1 - t;
          px = mt*mt*mt*seg.x0 + 3*mt*mt*t*seg.x1 + 3*mt*t*t*seg.x2 + t*t*t*seg.x3;
          py = mt*mt*mt*seg.y0 + 3*mt*mt*t*seg.y1 + 3*mt*t*t*seg.y2 + t*t*t*seg.y3;
        }

        var dist = 0;
        if (points.length > 0) {
          var last = points[points.length - 1];
          var dx = px - last.x;
          var dy = py - last.y;
          dist = Math.sqrt(dx * dx + dy * dy);
        }

        accumulated += dist;
        if (accumulated >= nextDist || points.length === 0) {
          points.push({ x: px, y: py });
          nextDist += targetSpacing;
        }
      }
    }

    return points;
  }

  // ---- Scale Points Centered at Origin ----
  // Points are scaled to fit targetW x targetH but centered at (0, 0).
  // The canvas is translated to screen center when drawing.
  function normalizePoints(points, targetW, targetH) {
    if (points.length === 0) return points;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < points.length; i++) {
      if (points[i].x < minX) minX = points[i].x;
      if (points[i].y < minY) minY = points[i].y;
      if (points[i].x > maxX) maxX = points[i].x;
      if (points[i].y > maxY) maxY = points[i].y;
    }
    var pw = maxX - minX;
    var ph = maxY - minY;
    if (pw === 0) pw = 1;
    if (ph === 0) ph = 1;
    var scale = Math.min(targetW / pw, targetH / ph);
    var srcCx = (minX + maxX) / 2;
    var srcCy = (minY + maxY) / 2;

    var result = [];
    for (var i = 0; i < points.length; i++) {
      result.push({
        x: (points[i].x - srcCx) * scale,
        y: (points[i].y - srcCy) * scale
      });
    }
    return result;
  }

  // ---- Compute DFT (complex) ----
  // Remaps frequencies > N/2 to negative values for smooth interpolation.
  // Without this, freq k=N-1 would spin N-1 times instead of -1 times,
  // making the epicycle visualization a chaotic blur instead of a shape trace.
  function computeComplexDFT(points) {
    var N = points.length;
    var result = [];
    for (var k = 0; k < N; k++) {
      var re = 0, im = 0;
      for (var n = 0; n < N; n++) {
        var angle = (2 * Math.PI * k * n) / N;
        var cos = Math.cos(angle);
        var sin = Math.sin(angle);
        re += points[n].x * cos + points[n].y * sin;
        im += points[n].y * cos - points[n].x * sin;
      }
      re /= N;
      im /= N;
      // Remap: k > N/2 becomes k - N (negative frequency)
      var freq = k;
      if (freq > N / 2) freq = freq - N;
      result.push({
        freq: freq,
        amp: Math.sqrt(re * re + im * im),
        phase: Math.atan2(im, re),
        re: re,
        im: im
      });
    }
    result.sort(function(a, b) { return b.amp - a.amp; });
    return result;
  }

  // ---- Prepare DFT Data ----
  function prepareData() {
    // Horse from SVG path
    var horsePoints = parseSVGPath(HORSE_SVG_PATH, 600);
    var scaledHorse = normalizePoints(horsePoints, width * 0.55, height * 0.65);
    horseDFT = computeComplexDFT(scaledHorse);

    // 福 from pre-extracted SVG path (Noto Serif SC Bold)
    var fuPoints = parseSVGPath(FU_SVG_PATH, 800);
    var scaledFu = normalizePoints(fuPoints, width * 0.5, height * 0.6);
    fuDFT = computeComplexDFT(scaledFu);

    // Start with horse
    currentDFT = horseDFT;
    maxCount = Math.min(HORSE_EPICYCLES, horseDFT.length);
    visibleCount = maxCount;
    phase = 'draw-horse';
  }

  // ---- Epicycle Evaluation ----
  function evaluateEpicycles(dft, count, t) {
    var x = 0, y = 0;
    var circles = [];
    var N = dft.length;
    var n = Math.min(count, N);

    for (var i = 0; i < n; i++) {
      var prevX = x, prevY = y;
      var freq = dft[i].freq;
      var amp = dft[i].amp;
      var phase = dft[i].phase;
      var angle = 2 * Math.PI * freq * t + phase;

      x += amp * Math.cos(angle);
      y += amp * Math.sin(angle);

      circles.push({
        cx: prevX,
        cy: prevY,
        radius: amp,
        tipX: x,
        tipY: y
      });
    }

    return { x: x, y: y, circles: circles };
  }

  // ---- Draw Grid ----
  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    var spacing = 60 * dpr;
    for (var x = spacing; x < width; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (var y = spacing; y < height; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---- Draw Epicycles ----
  function drawEpicycles(circles) {
    ctx.save();
    for (var i = 0; i < circles.length; i++) {
      var c = circles[i];
      if (c.radius < 0.5) continue;

      // Circle
      ctx.beginPath();
      ctx.arc(c.cx, c.cy, c.radius, 0, Math.PI * 2);
      ctx.strokeStyle = EPICYCLE_COLOR;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Arm
      ctx.beginPath();
      ctx.moveTo(c.cx, c.cy);
      ctx.lineTo(c.tipX, c.tipY);
      ctx.strokeStyle = ARM_COLOR;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---- Draw Trail ----
  function drawTrail(fadeAlpha) {
    if (trail.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = TRACE_GLOW;
    ctx.shadowBlur = 8 * dpr;

    var len = trail.length;
    for (var i = 1; i < len; i++) {
      var alpha = (i / len) * 0.9 * fadeAlpha;
      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      ctx.strokeStyle = 'rgba(220,20,60,' + alpha.toFixed(3) + ')';
      ctx.lineWidth = 2 * dpr;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---- Draw Frequency Spectrum ----
  function drawSpectrum() {
    if (!currentDFT || !spectrumVisible) return;
    ctx.save();
    var barW = 2 * dpr;
    var maxH = 60 * dpr;
    var startX = 15 * dpr;
    var startY = height - 15 * dpr;
    var count = Math.min(visibleCount, 80);

    // Find max amplitude for normalization
    var maxAmp = 0;
    for (var i = 0; i < count; i++) {
      if (currentDFT[i].amp > maxAmp) maxAmp = currentDFT[i].amp;
    }
    if (maxAmp === 0) maxAmp = 1;

    for (var i = 0; i < count; i++) {
      var h = (currentDFT[i].amp / maxAmp) * maxH;
      var alpha = i < visibleCount ? 0.6 : 0.15;
      ctx.fillStyle = 'rgba(255,215,0,' + alpha + ')';
      ctx.fillRect(startX + i * (barW + 1), startY - h, barW, h);
    }
    ctx.restore();
  }

  // ---- Draw Info Text ----
  function drawInfo() {
    ctx.save();
    var fSize = Math.max(12, 14 * dpr) | 0;
    ctx.font = fSize + 'px "Source Code Pro", monospace';
    ctx.fillStyle = 'rgba(255,215,0,0.6)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('N = ' + visibleCount + ' circles', width - 15 * dpr, 15 * dpr);

    var label = '';
    if (phase === 'draw-horse' || phase === 'pause-horse' || phase === 'fade-to-fu') {
      label = 'HORSE';
    } else {
      label = '\u798F';
    }
    ctx.fillText(label, width - 15 * dpr, 15 * dpr + fSize + 4);
    ctx.restore();
  }

  // ---- Phase Management ----
  function updatePhase(now) {
    var elapsed = now - phaseStart;

    if (phase === 'draw-horse') {
      // Drawing until full loop (time >= 1)
      if (time >= 1.0) {
        phase = 'pause-horse';
        phaseStart = now;
      }
    } else if (phase === 'pause-horse') {
      if (elapsed >= PAUSE_AFTER_HORSE) {
        phase = 'fade-to-fu';
        phaseStart = now;
      }
    } else if (phase === 'fade-to-fu') {
      if (elapsed >= FADE_DURATION) {
        // Switch to fu
        if (fuDFT) {
          currentDFT = fuDFT;
          maxCount = Math.min(FU_EPICYCLES, fuDFT.length);
          visibleCount = maxCount;
        }
        trail = [];
        time = 0;
        phase = 'draw-fu';
        phaseStart = now;
      }
    } else if (phase === 'draw-fu') {
      if (time >= 1.0) {
        phase = 'pause-fu';
        phaseStart = now;
      }
    } else if (phase === 'pause-fu') {
      if (elapsed >= PAUSE_AFTER_FU) {
        phase = 'fade-to-horse';
        phaseStart = now;
      }
    } else if (phase === 'fade-to-horse') {
      if (elapsed >= FADE_DURATION) {
        currentDFT = horseDFT;
        maxCount = Math.min(HORSE_EPICYCLES, horseDFT.length);
        visibleCount = maxCount;
        trail = [];
        time = 0;
        phase = 'draw-horse';
        phaseStart = now;
      }
    }
  }

  // ---- Main Loop ----
  function frame(now) {
    if (!running) return;

    if (!currentDFT) {
      animId = requestAnimationFrame(frame);
      return;
    }

    // Speed from mouse Y
    if (mouseInCanvas) {
      speed = 0.3 + (1 - mouseY / height) * 2.5;
    } else {
      speed = DEFAULT_SPEED;
    }

    // Phase management
    if (!paused) {
      updatePhase(now);
    }

    // Clear
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, width, height);

    // Grid
    drawGrid();

    // Compute fade alpha for transitions
    var fadeAlpha = 1;
    if (phase === 'fade-to-fu' || phase === 'fade-to-horse') {
      fadeAlpha = 1 - (now - phaseStart) / FADE_DURATION;
      if (fadeAlpha < 0) fadeAlpha = 0;
    }

    // Advance time during draw phases
    // time goes 0→1 for a full trace; ~15 seconds at default speed
    var isDrawing = (phase === 'draw-horse' || phase === 'draw-fu');
    var traceSeconds = 15;
    var frameDt = speed / (60 * traceSeconds);
    // Sub-step: add multiple trail points per frame for smooth curves
    var subSteps = 2;
    var subDt = frameDt / subSteps;
    var result;

    if (isDrawing && !paused) {
      for (var sub = 0; sub < subSteps; sub++) {
        time += subDt;
        result = evaluateEpicycles(currentDFT, visibleCount, time);
        trail.push({ x: result.x, y: result.y });
        if (trail.length > MAX_TRAIL) {
          trail.shift();
        }
      }
    } else {
      result = evaluateEpicycles(currentDFT, visibleCount, time);
    }

    // Translate to screen center — DFT data is origin-centered
    ctx.save();
    ctx.translate(width / 2, height / 2);

    // Draw trail
    drawTrail(fadeAlpha);

    // Draw epicycles (semi-transparent during fade)
    if (fadeAlpha > 0.1) {
      ctx.save();
      ctx.globalAlpha = fadeAlpha;
      drawEpicycles(result.circles);
      ctx.restore();
    }

    // Draw tip dot
    if (fadeAlpha > 0.1) {
      ctx.save();
      ctx.globalAlpha = fadeAlpha;
      ctx.beginPath();
      ctx.arc(result.x, result.y, 3 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();
    }

    ctx.restore(); // undo translate

    // Spectrum
    drawSpectrum();

    // Info
    drawInfo();

    animId = requestAnimationFrame(frame);
  }

  // ---- Event Handlers ----
  function onMouseMove(e) {
    var rect = canvas.getBoundingClientRect();
    mouseY = (e.clientY - rect.top) * dpr;
    mouseInCanvas = true;
  }

  function onMouseLeave() {
    mouseInCanvas = false;
  }

  function onKeyDown(e) {
    if (e.key === ' ') {
      e.preventDefault();
      paused = !paused;
      return;
    }
    // Number keys 1-9 to control epicycle count
    var num = parseInt(e.key, 10);
    if (num >= 1 && num <= 9 && currentDFT) {
      var maxN = currentDFT.length;
      visibleCount = Math.max(1, Math.round((num / 9) * Math.min(maxN, phase.indexOf('horse') !== -1 ? HORSE_EPICYCLES : FU_EPICYCLES)));
    }
  }

  function onResize() {
    var section = canvas.parentElement;
    dpr = window.devicePixelRatio || 1;
    width = section.clientWidth * dpr;
    height = section.clientHeight * dpr;
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = section.clientWidth + 'px';
    canvas.style.height = section.clientHeight + 'px';

    // Recompute DFT with new dimensions
    trail = [];
    time = 0;
    prepareData();
  }

  // ---- Lifecycle ----
  function init(c) {
    canvas = c;
    ctx = canvas.getContext('2d');
  }

  function start() {
    var section = canvas.parentElement;
    dpr = window.devicePixelRatio || 1;
    width = section.clientWidth * dpr;
    height = section.clientHeight * dpr;
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = section.clientWidth + 'px';
    canvas.style.height = section.clientHeight + 'px';

    prepareData();
    phaseStart = performance.now();

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);

    running = true;
    animId = requestAnimationFrame(frame);
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
      phaseStart = performance.now();
      animId = requestAnimationFrame(frame);
    }
  }

  function destroy() {
    pause();
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mouseleave', onMouseLeave);
    document.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('resize', onResize);
    trail = [];
    horseDFT = null;
    fuDFT = null;
    currentDFT = null;
  }

  // ---- Register ----
  registerCard(1, {
    init: init,
    start: start,
    pause: pause,
    resume: resume,
    destroy: destroy
  });

})();
