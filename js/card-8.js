/* ============================================
   CNY 2026 — Card 8: Strange Attractor Calligraphy
   ============================================ */

(function() {
  'use strict';

  // ---- Constants ----
  var SIGMA = 10;
  var RHO = 28;
  var BETA = 8 / 3;
  var DT = 0.005;
  var TOTAL_POINTS = 60000;
  var POINTS_PER_FRAME = 400;
  var STAR_COUNT = 200;
  var FOCAL_LENGTH = 400;
  var CAMERA_Z = 80;
  var ROTATION_SPEED = 0.08;
  var HOLD_FRAMES = 180;
  var FADE_FRAMES = 60;

  // Attractor types
  var ATTRACTOR_LORENZ = 0;
  var ATTRACTOR_ROSSLER = 1;
  var ATTRACTOR_CHEN = 2;
  var ATTRACTOR_NAMES = ['Lorenz', 'Rössler', 'Chen'];
  var ATTRACTOR_LABELS = [
    'Lorenz Attractor | \u03C3=10 \u03C1=28 \u03B2=2.667',
    'Rössler Attractor | a=0.2 b=0.2 c=5.7',
    'Chen Attractor | a=35 b=3 c=28'
  ];

  // ---- State ----
  var canvas, ctx;
  var width = 0, height = 0;
  var dpr = 1;
  var animId = null;
  var running = false;

  // Attractor data
  var pointsX, pointsY, pointsZ;
  var currentAttractor = ATTRACTOR_LORENZ;
  var drawnIndex = 0;

  // Camera
  var rotY = 0;
  var rotX = 0.3;
  var zoom = 1;
  var autoRotate = true;

  // Mouse drag
  var dragging = false;
  var dragStartX = 0, dragStartY = 0;
  var dragStartRotX = 0, dragStartRotY = 0;

  // Stars
  var stars = [];

  // Phase: 'drawing', 'holding', 'fading', 'restarting'
  var phase = 'drawing';
  var holdCounter = 0;
  var fadeAlpha = 1;

  // Off-screen buffer for trail accumulation
  var trailCanvas, trailCtx;

  // ---- Attractor Systems ----

  function lorenz(x, y, z) {
    return {
      dx: SIGMA * (y - x),
      dy: x * (RHO - z) - y,
      dz: x * y - BETA * z
    };
  }

  function rossler(x, y, z) {
    var a = 0.2, b = 0.2, c = 5.7;
    return {
      dx: -y - z,
      dy: x + a * y,
      dz: b + z * (x - c)
    };
  }

  function chen(x, y, z) {
    var a = 35, b = 3, c = 28;
    return {
      dx: a * (y - x),
      dy: (c - a) * x - x * z + c * y,
      dz: x * y - b * z
    };
  }

  function getSystem(type) {
    if (type === ATTRACTOR_ROSSLER) return rossler;
    if (type === ATTRACTOR_CHEN) return chen;
    return lorenz;
  }

  // ---- RK4 Integration ----

  function rk4Step(system, x, y, z, dt) {
    var k1 = system(x, y, z);
    var k2 = system(x + k1.dx * dt * 0.5, y + k1.dy * dt * 0.5, z + k1.dz * dt * 0.5);
    var k3 = system(x + k2.dx * dt * 0.5, y + k2.dy * dt * 0.5, z + k2.dz * dt * 0.5);
    var k4 = system(x + k3.dx * dt, y + k3.dy * dt, z + k3.dz * dt);

    return {
      x: x + (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx) * dt / 6,
      y: y + (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy) * dt / 6,
      z: z + (k1.dz + 2 * k2.dz + 2 * k3.dz + k4.dz) * dt / 6
    };
  }

  // ---- Compute Attractor Points ----

  function computePoints(type) {
    pointsX = new Float32Array(TOTAL_POINTS);
    pointsY = new Float32Array(TOTAL_POINTS);
    pointsZ = new Float32Array(TOTAL_POINTS);

    var system = getSystem(type);

    // Initial conditions with slight randomness
    var x, y, z;
    if (type === ATTRACTOR_ROSSLER) {
      x = 1 + Math.random() * 0.5;
      y = 1 + Math.random() * 0.5;
      z = 1 + Math.random() * 0.5;
    } else if (type === ATTRACTOR_CHEN) {
      x = -0.1 + Math.random() * 0.2;
      y = 0.5 + Math.random() * 0.2;
      z = -0.6 + Math.random() * 0.2;
    } else {
      x = 0.1 + Math.random() * 0.5;
      y = 0 + Math.random() * 0.5;
      z = 0 + Math.random() * 0.5;
    }

    // Skip transient
    for (var t = 0; t < 500; t++) {
      var next = rk4Step(system, x, y, z, DT);
      x = next.x; y = next.y; z = next.z;
    }

    for (var i = 0; i < TOTAL_POINTS; i++) {
      var step = rk4Step(system, x, y, z, DT);
      x = step.x; y = step.y; z = step.z;
      pointsX[i] = x;
      pointsY[i] = y;
      pointsZ[i] = z;
    }
  }

  // ---- Star Field ----

  function generateStars() {
    stars = [];
    for (var i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 1.5 + 0.5,
        brightness: Math.random() * 0.5 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
  }

  // ---- Color from Z-depth ----

  function getColor(z, zMin, zMax) {
    var t = (z - zMin) / (zMax - zMin);
    t = Math.max(0, Math.min(1, t));

    var r, g, b;
    if (t < 0.5) {
      // Deep blue -> gold
      var s = t * 2;
      r = Math.round(lerp(30, 255, s));
      g = Math.round(lerp(60, 215, s));
      b = Math.round(lerp(180, 0, s));
    } else {
      // Gold -> white
      var s = (t - 0.5) * 2;
      r = Math.round(lerp(255, 255, s));
      g = Math.round(lerp(215, 255, s));
      b = Math.round(lerp(0, 220, s));
    }
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function getGlowColor(z, zMin, zMax) {
    var t = (z - zMin) / (zMax - zMin);
    t = Math.max(0, Math.min(1, t));

    if (t < 0.5) {
      return 'rgba(100, 150, 255, 0.6)';
    } else if (t < 0.8) {
      return 'rgba(255, 215, 0, 0.6)';
    } else {
      return 'rgba(255, 255, 220, 0.8)';
    }
  }

  // ---- 3D Rotation ----

  function rotatePoint(x, y, z, rx, ry) {
    // Rotate around Y axis
    var cosY = Math.cos(ry);
    var sinY = Math.sin(ry);
    var x1 = x * cosY + z * sinY;
    var z1 = -x * sinY + z * cosY;

    // Rotate around X axis
    var cosX = Math.cos(rx);
    var sinX = Math.sin(rx);
    var y1 = y * cosX - z1 * sinX;
    var z2 = y * sinX + z1 * cosX;

    return { x: x1, y: y1, z: z2 };
  }

  // ---- Get attractor bounds and center ----

  function getAttractorBounds(count) {
    var n = Math.min(count, TOTAL_POINTS);
    if (n === 0) return { cx: 0, cy: 0, cz: 0, zMin: 0, zMax: 1 };

    var minX = Infinity, maxX = -Infinity;
    var minY = Infinity, maxY = -Infinity;
    var minZ = Infinity, maxZ = -Infinity;

    for (var i = 0; i < n; i++) {
      if (pointsX[i] < minX) minX = pointsX[i];
      if (pointsX[i] > maxX) maxX = pointsX[i];
      if (pointsY[i] < minY) minY = pointsY[i];
      if (pointsY[i] > maxY) maxY = pointsY[i];
      if (pointsZ[i] < minZ) minZ = pointsZ[i];
      if (pointsZ[i] > maxZ) maxZ = pointsZ[i];
    }

    return {
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      cz: (minZ + maxZ) / 2,
      zMin: minZ,
      zMax: maxZ
    };
  }

  // ---- Resize ----

  function resize() {
    var rect = canvas.parentElement.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Resize trail buffer
    if (trailCanvas) {
      trailCanvas.width = width * dpr;
      trailCanvas.height = height * dpr;
      trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  // ---- Draw Stars ----

  function drawStars(time) {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var twinkle = Math.sin(time * s.twinkleSpeed + s.twinklePhase) * 0.3 + 0.7;
      var alpha = s.brightness * twinkle;
      ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(s.x * width, s.y * height, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- Draw Label ----

  function drawLabel() {
    ctx.save();
    ctx.font = '12px "Source Code Pro", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(ATTRACTOR_LABELS[currentAttractor], 16, height - 16);
    ctx.restore();
  }

  // ---- Draw Attractor ----

  function drawAttractor(time) {
    var bounds = getAttractorBounds(TOTAL_POINTS);
    var cx = bounds.cx;
    var cy = bounds.cy;
    var cz = bounds.cz;
    var zMin = bounds.zMin;
    var zMax = bounds.zMax;

    var currentRotY = rotY;
    if (autoRotate) {
      currentRotY += time * ROTATION_SPEED * 0.001;
    }

    var endIdx = Math.min(drawnIndex, TOTAL_POINTS);
    var scale = zoom * width / 50;

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw segments in larger batches for performance (no shadow blur)
    var batchSize = 500;
    for (var batch = 0; batch < endIdx; batch += batchSize) {
      var bEnd = Math.min(batch + batchSize, endIdx);
      if (bEnd - batch < 2) continue;

      var ageFrac = batch / endIdx;
      var baseAlpha;
      if (phase === 'fading') {
        baseAlpha = fadeAlpha * (0.3 + 0.7 * ageFrac);
      } else {
        baseAlpha = 0.3 + 0.7 * ageFrac;
      }

      ctx.beginPath();
      var first = true;

      for (var i = batch; i < bEnd; i++) {
        var px = pointsX[i] - cx;
        var py = pointsY[i] - cy;
        var pz = pointsZ[i] - cz;

        var rot = rotatePoint(px, py, pz, rotX, currentRotY);
        var proj = project3D(rot.x * scale / FOCAL_LENGTH * 50, rot.y * scale / FOCAL_LENGTH * 50, rot.z, CAMERA_Z, FOCAL_LENGTH);

        if (first) {
          ctx.moveTo(proj.x, -proj.y);
          first = false;
        } else {
          ctx.lineTo(proj.x, -proj.y);
        }
      }

      var midIdx = Math.floor((batch + bEnd) / 2);
      var midZ = pointsZ[midIdx];
      var color = getColor(midZ, zMin, zMax);

      ctx.strokeStyle = color;
      ctx.globalAlpha = Math.max(0, Math.min(1, baseAlpha));
      ctx.stroke();
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // ---- Draw parameter controls overlay ----

  function drawControls() {
    ctx.save();
    ctx.font = '11px "Source Code Pro", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    var y = 14;
    ctx.fillText('Scroll: zoom | Drag: rotate | Click: randomize', width - 14, y);
    y += 16;
    ctx.fillText('L: switch attractor | Zoom: ' + zoom.toFixed(2) + 'x', width - 14, y);
    y += 16;
    ctx.fillText('Speed: ' + (ROTATION_SPEED * 1000).toFixed(0) + ' | dt=' + DT.toFixed(4), width - 14, y);
    ctx.restore();
  }

  // ---- Animation Frame ----

  var frameTime = 0;

  function animate(timestamp) {
    if (!running) return;
    animId = requestAnimationFrame(animate);
    frameTime = timestamp || 0;

    // Clear to black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Draw stars
    drawStars(frameTime);

    // Update phase
    if (phase === 'drawing') {
      drawnIndex += POINTS_PER_FRAME;
      if (drawnIndex >= TOTAL_POINTS) {
        drawnIndex = TOTAL_POINTS;
        phase = 'holding';
        holdCounter = 0;
      }
    } else if (phase === 'holding') {
      holdCounter++;
      if (holdCounter >= HOLD_FRAMES) {
        phase = 'fading';
        fadeAlpha = 1;
      }
    } else if (phase === 'fading') {
      fadeAlpha -= 1 / FADE_FRAMES;
      if (fadeAlpha <= 0) {
        fadeAlpha = 0;
        phase = 'restarting';
      }
    } else if (phase === 'restarting') {
      computePoints(currentAttractor);
      drawnIndex = 0;
      phase = 'drawing';
      fadeAlpha = 1;
    }

    // Draw attractor
    drawAttractor(frameTime);

    // Draw label and controls
    drawLabel();
    drawControls();
  }

  // ---- Event Handlers ----

  function onMouseDown(e) {
    dragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartRotX = rotX;
    dragStartRotY = rotY;
    autoRotate = false;
    e.preventDefault();
  }

  function onMouseMove(e) {
    if (!dragging) return;
    var dx = e.clientX - dragStartX;
    var dy = e.clientY - dragStartY;
    rotY = dragStartRotY + dx * 0.005;
    rotX = dragStartRotX + dy * 0.005;
    // Clamp X rotation
    rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotX));
    e.preventDefault();
  }

  function onMouseUp(e) {
    if (dragging) {
      var dx = Math.abs(e.clientX - dragStartX);
      var dy = Math.abs(e.clientY - dragStartY);
      // If it was a click (not a drag), randomize
      if (dx < 3 && dy < 3) {
        randomize();
      }
    }
    dragging = false;
    autoRotate = true;
  }

  function onWheel(e) {
    e.preventDefault();
    zoom *= e.deltaY > 0 ? 0.95 : 1.05;
    zoom = Math.max(0.3, Math.min(3, zoom));
  }

  function onKeyDown(e) {
    if (e.key === 'l' || e.key === 'L') {
      switchAttractor();
    }
  }

  function onTouchStart(e) {
    if (e.touches.length === 1) {
      dragging = true;
      dragStartX = e.touches[0].clientX;
      dragStartY = e.touches[0].clientY;
      dragStartRotX = rotX;
      dragStartRotY = rotY;
      autoRotate = false;
    }
  }

  function onTouchMove(e) {
    if (!dragging || e.touches.length !== 1) return;
    var dx = e.touches[0].clientX - dragStartX;
    var dy = e.touches[0].clientY - dragStartY;
    rotY = dragStartRotY + dx * 0.005;
    rotX = dragStartRotX + dy * 0.005;
    rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotX));
    e.preventDefault();
  }

  function onTouchEnd(e) {
    if (dragging && e.changedTouches.length === 1) {
      var dx = Math.abs(e.changedTouches[0].clientX - dragStartX);
      var dy = Math.abs(e.changedTouches[0].clientY - dragStartY);
      if (dx < 10 && dy < 10) {
        randomize();
      }
    }
    dragging = false;
    autoRotate = true;
  }

  function randomize() {
    computePoints(currentAttractor);
    drawnIndex = 0;
    phase = 'drawing';
    fadeAlpha = 1;
  }

  function switchAttractor() {
    currentAttractor = (currentAttractor + 1) % 3;
    computePoints(currentAttractor);
    drawnIndex = 0;
    phase = 'drawing';
    fadeAlpha = 1;
  }

  // ---- Lifecycle ----

  function init(cvs) {
    canvas = cvs;
    ctx = canvas.getContext('2d');
    trailCanvas = document.createElement('canvas');
    trailCtx = trailCanvas.getContext('2d');
    generateStars();
  }

  function start(cvs) {
    canvas = cvs;
    ctx = canvas.getContext('2d');
    resize();

    computePoints(currentAttractor);
    drawnIndex = 0;
    phase = 'drawing';
    fadeAlpha = 1;
    rotY = 0;
    rotX = 0.3;
    zoom = 1;
    autoRotate = true;

    running = true;

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('resize', resize);

    animId = requestAnimationFrame(animate);
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
      animId = requestAnimationFrame(animate);
    }
  }

  function destroy() {
    pause();
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    canvas.removeEventListener('wheel', onWheel);
    document.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('resize', resize);
  }

  // ---- Register ----

  registerCard(8, {
    init: init,
    start: start,
    pause: pause,
    resume: resume,
    destroy: destroy
  });

})();
