/* ============================================
   CNY 2026 — Card 2: Flow Field Particle Reveal
   ============================================ */

(function() {
  'use strict';

  // ---- Constants ----
  var GRID_COLS = 50;
  var GRID_ROWS = 50;
  var PARTICLE_COUNT = 18000;
  var MOUSE_RADIUS = 150;
  var MOUSE_FORCE = 4;
  var RAMP_UP_MS = 8000;
  var HOLD_MS = 5000;
  var RAMP_DOWN_MS = 8000;
  var CYCLE_MS = RAMP_UP_MS + HOLD_MS + RAMP_DOWN_MS;
  var NOISE_SCALE = 0.12;
  var NOISE_TIME_SCALE = 0.0003;
  var PARTICLE_SPEED = 1.8;
  var MAX_LIFE = 200;
  var TRAIL_ALPHA = 0.04;
  var CONVERGE_STRENGTH = 0.15;
  var VIGNETTE_INNER = 0.4;
  var SHIMMER_AMP = 0.15;
  var MOUSE_FADE_MS = 1000;
  var BORDER_BLEND_PX = 20;

  // Colors (r,g,b)
  var CR = 220, CG = 20, CB = 60;   // Crimson
  var GR = 255, GG = 215, GB = 0;   // Gold
  var BR = 60,  BG2 = 80, BB = 160; // Cool blue
  var WR = 200, WG = 210, WB = 240; // Dim white

  // ---- State ----
  var canvas, ctx;
  var W, H;
  var running = false;
  var animId = null;
  var elapsedAccum = 0;   // total elapsed ms when paused
  var resumeStamp = 0;    // timestamp when last resumed

  // Particle typed arrays
  var px, py, pvx, pvy, ppx, ppy, phue, plife, pmaxlife;
  var ptx, pty; // persistent convergence target per particle

  // Flow field grid
  var fieldAngles;
  var cellW, cellH;

  // Horse mask
  var maskData = null;
  var maskW = 0, maskH = 0;
  var maskOX = 0, maskOY = 0;
  var maskPixels = [];
  var borderDist = null; // precomputed distance-to-edge field

  // Mouse
  var smoothMouse;
  var rawMX = -9999, rawMY = -9999;
  var lastMoveTime = 0;
  var mouseActive = false;

  // Cached vignette
  var vignetteCanvas = null;

  // ---- Horse Mask ----

  function buildHorseMask() {
    var maskCvs = document.createElement('canvas');
    var size = Math.min(W, H) * 0.65;
    maskW = Math.floor(size);
    maskH = Math.floor(size);
    maskCvs.width = maskW;
    maskCvs.height = maskH;
    var mctx = maskCvs.getContext('2d');

    var path2d = new Path2D(HORSE_SVG_PATH);

    // SVG bounding box (from the path data)
    var sxMin = 160, syMin = 78, sW = 220, sH = 280;
    var sc = Math.min(maskW / sW, maskH / sH) * 0.85;

    mctx.save();
    mctx.translate(maskW / 2 - (sxMin + sW / 2) * sc, maskH / 2 - (syMin + sH / 2) * sc);
    mctx.scale(sc, sc);
    mctx.fillStyle = '#000';
    mctx.fill(path2d);
    mctx.restore();

    var imgData = mctx.getImageData(0, 0, maskW, maskH);
    maskData = new Uint8Array(maskW * maskH);
    maskPixels = [];

    for (var i = 0; i < maskData.length; i++) {
      maskData[i] = imgData.data[i * 4 + 3] > 128 ? 1 : 0;
      if (maskData[i]) maskPixels.push(i);
    }

    maskOX = Math.floor((W - maskW) / 2);
    maskOY = Math.floor((H - maskH) / 2);

    // Precompute border distance field for mask pixels
    buildBorderDistField();
  }

  function buildBorderDistField() {
    // For each mask pixel, compute approximate distance to nearest non-mask pixel
    // Use a simple two-pass distance transform (Manhattan-ish, sufficient for blending)
    borderDist = new Uint8Array(maskW * maskH);
    var MAX_D = BORDER_BLEND_PX;
    var w = maskW, h = maskH;

    // Initialize: mask=MAX_D, non-mask=0
    for (var i = 0; i < maskData.length; i++) {
      borderDist[i] = maskData[i] ? MAX_D : 0;
    }

    // Forward pass (top-left to bottom-right)
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var idx = y * w + x;
        if (borderDist[idx] === 0) continue;
        var d = MAX_D;
        if (x > 0) d = Math.min(d, borderDist[idx - 1] + 1);
        if (y > 0) d = Math.min(d, borderDist[idx - w] + 1);
        borderDist[idx] = d;
      }
    }

    // Backward pass (bottom-right to top-left)
    for (var y2 = h - 1; y2 >= 0; y2--) {
      for (var x2 = w - 1; x2 >= 0; x2--) {
        var idx2 = y2 * w + x2;
        if (borderDist[idx2] === 0) continue;
        var d2 = borderDist[idx2];
        if (x2 < w - 1) d2 = Math.min(d2, borderDist[idx2 + 1] + 1);
        if (y2 < h - 1) d2 = Math.min(d2, borderDist[idx2 + w] + 1);
        borderDist[idx2] = d2;
      }
    }
  }

  function isInMask(x, y) {
    var mx = (x - maskOX) | 0;
    var my = (y - maskOY) | 0;
    if (mx < 0 || mx >= maskW || my < 0 || my >= maskH) return false;
    return maskData[my * maskW + mx] === 1;
  }

  function getBorderDist(x, y) {
    var mx = (x - maskOX) | 0;
    var my = (y - maskOY) | 0;
    if (mx < 0 || mx >= maskW || my < 0 || my >= maskH) return -1;
    return borderDist[my * maskW + mx];
  }

  function randomMaskXY() {
    if (maskPixels.length === 0) return;
    var idx = maskPixels[(Math.random() * maskPixels.length) | 0];
    return { x: (idx % maskW) + maskOX, y: ((idx / maskW) | 0) + maskOY };
  }

  // ---- Particles ----

  function initParticles() {
    px = new Float32Array(PARTICLE_COUNT);
    py = new Float32Array(PARTICLE_COUNT);
    pvx = new Float32Array(PARTICLE_COUNT);
    pvy = new Float32Array(PARTICLE_COUNT);
    ppx = new Float32Array(PARTICLE_COUNT);
    ppy = new Float32Array(PARTICLE_COUNT);
    phue = new Float32Array(PARTICLE_COUNT);
    plife = new Float32Array(PARTICLE_COUNT);
    pmaxlife = new Float32Array(PARTICLE_COUNT);
    ptx = new Float32Array(PARTICLE_COUNT);
    pty = new Float32Array(PARTICLE_COUNT);

    for (var i = 0; i < PARTICLE_COUNT; i++) resetParticle(i);
  }

  function resetParticle(i) {
    px[i] = Math.random() * W;
    py[i] = Math.random() * H;
    ppx[i] = px[i];
    ppy[i] = py[i];
    pvx[i] = 0;
    pvy[i] = 0;
    phue[i] = Math.random() * 360;
    pmaxlife[i] = MAX_LIFE * (0.5 + Math.random() * 0.5);
    plife[i] = Math.random() * pmaxlife[i];

    // Assign persistent convergence target
    var tgt = randomMaskXY();
    if (tgt) {
      ptx[i] = tgt.x;
      pty[i] = tgt.y;
    } else {
      ptx[i] = W / 2;
      pty[i] = H / 2;
    }
  }

  // ---- Flow Field ----

  function updateField(time) {
    var zt = time * NOISE_TIME_SCALE;
    for (var row = 0; row < GRID_ROWS; row++) {
      for (var col = 0; col < GRID_COLS; col++) {
        var angle = noise3D(col * NOISE_SCALE, row * NOISE_SCALE, zt) * Math.PI * 2;
        fieldAngles[row * GRID_COLS + col] = angle;
      }
    }
  }

  function fieldAngle(x, y) {
    var col = (x / cellW) | 0;
    var row = (y / cellH) | 0;
    col = col < 0 ? 0 : col >= GRID_COLS ? GRID_COLS - 1 : col;
    row = row < 0 ? 0 : row >= GRID_ROWS ? GRID_ROWS - 1 : row;
    return fieldAngles[row * GRID_COLS + col];
  }

  // ---- Breathing ----

  function convergeFactor(elapsed) {
    var ct = elapsed % CYCLE_MS;
    var p;
    if (ct < RAMP_UP_MS) {
      p = ct / RAMP_UP_MS;
      return p * p * (3 - 2 * p);
    }
    if (ct < RAMP_UP_MS + HOLD_MS) return 1;
    p = (ct - RAMP_UP_MS - HOLD_MS) / RAMP_DOWN_MS;
    var s = 1 - p;
    return s * s * (3 - 2 * s);
  }

  // ---- Mouse Handlers ----

  function onMouseMove(e) {
    var rect = canvas.getBoundingClientRect();
    rawMX = e.clientX - rect.left;
    rawMY = e.clientY - rect.top;
    lastMoveTime = performance.now();
    mouseActive = true;
  }

  function onTouchMove(e) {
    if (e.touches.length > 0) {
      var rect = canvas.getBoundingClientRect();
      rawMX = e.touches[0].clientX - rect.left;
      rawMY = e.touches[0].clientY - rect.top;
      lastMoveTime = performance.now();
      mouseActive = true;
    }
  }

  function onTouchEnd() {
    mouseActive = false;
  }

  // ---- Vignette (cached) ----

  function buildVignette() {
    vignetteCanvas = document.createElement('canvas');
    vignetteCanvas.width = W;
    vignetteCanvas.height = H;
    var vctx = vignetteCanvas.getContext('2d');
    var g = vctx.createRadialGradient(
      W / 2, H / 2, Math.min(W, H) * VIGNETTE_INNER,
      W / 2, H / 2, Math.max(W, H) * 0.75
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.6)');
    vctx.fillStyle = g;
    vctx.fillRect(0, 0, W, H);
  }

  // ---- Watermark ----

  function drawWatermark() {
    ctx.save();
    ctx.font = 'bold ' + Math.floor(H * 0.35) + 'px "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    ctx.fillText('2026', W / 2, H / 2);
    ctx.restore();
  }

  // ---- Main Loop ----

  function animate(timestamp) {
    if (!running) return;

    var elapsed = elapsedAccum + (timestamp - resumeStamp);
    var t = convergeFactor(elapsed);

    smoothMouse.update(rawMX, rawMY);
    var smx = smoothMouse.x;
    var smy = smoothMouse.y;

    var now = performance.now();
    var mouseFade = mouseActive ? Math.max(0, 1 - (now - lastMoveTime) / MOUSE_FADE_MS) : 0;

    updateField(elapsed);

    // Fade trail
    ctx.fillStyle = 'rgba(10,10,20,' + TRAIL_ALPHA + ')';
    ctx.fillRect(0, 0, W, H);

    // Watermark refresh (infrequent)
    if ((elapsed | 0) % 3000 < 17) drawWatermark();

    // Update and draw particles
    var PI = Math.PI;
    var sin = Math.sin;
    var cos = Math.cos;
    var sqrt = Math.sqrt;

    for (var i = 0; i < PARTICLE_COUNT; i++) {
      plife[i]++;

      if (plife[i] > pmaxlife[i] || px[i] < -10 || px[i] > W + 10 || py[i] < -10 || py[i] > H + 10) {
        resetParticle(i);
        continue;
      }

      ppx[i] = px[i];
      ppy[i] = py[i];

      // Flow field direction
      var a = fieldAngle(px[i], py[i]);
      var fvx = cos(a) * PARTICLE_SPEED;
      var fvy = sin(a) * PARTICLE_SPEED;

      // Convergence toward persistent target
      if (t > 0.01) {
        var dx = ptx[i] - px[i];
        var dy = pty[i] - py[i];
        var dist = sqrt(dx * dx + dy * dy);
        if (dist > 1) {
          var pull = CONVERGE_STRENGTH * t;
          var invD = 1 / dist;
          fvx = lerp(fvx, dx * invD * PARTICLE_SPEED * 1.2, pull);
          fvy = lerp(fvy, dy * invD * PARTICLE_SPEED * 1.2, pull);
        }
      }

      // Shimmer when converged
      if (t > 0.8) {
        var shim = noise2D(px[i] * 0.02, elapsed * 0.001) * SHIMMER_AMP * t;
        fvx += shim;
        fvy += noise2D(py[i] * 0.02, elapsed * 0.001 + 100) * SHIMMER_AMP * t;
      }

      // Mouse repulsion
      if (mouseFade > 0.01) {
        var mdx = px[i] - smx;
        var mdy = py[i] - smy;
        var mD = sqrt(mdx * mdx + mdy * mdy);
        if (mD < MOUSE_RADIUS && mD > 0.1) {
          var mf = (1 - mD / MOUSE_RADIUS) * MOUSE_FORCE * mouseFade;
          var invMD = 1 / mD;
          fvx += mdx * invMD * mf;
          fvy += mdy * invMD * mf;
        }
      }

      // Damped velocity
      pvx[i] = pvx[i] * 0.85 + fvx * 0.15;
      pvy[i] = pvy[i] * 0.85 + fvy * 0.15;
      px[i] += pvx[i];
      py[i] += pvy[i];

      // ---- Color ----
      var inside = isInMask(px[i], py[i]);
      var lifeRatio = plife[i] / pmaxlife[i];
      var alpha = sin(lifeRatio * PI) * 0.6;

      var r, g, b;
      if (inside) {
        var hb = (sin(phue[i] + elapsed * 0.001) + 1) * 0.5;
        r = lerp(CR, GR, hb) | 0;
        g = lerp(CG, GG, hb) | 0;
        b = lerp(CB, GB, hb) | 0;
        alpha *= (0.6 + t * 0.4);

        // Smooth border blend
        var bd = getBorderDist(px[i], py[i]);
        if (bd >= 0 && bd < BORDER_BLEND_PX) {
          var bf = bd / BORDER_BLEND_PX;
          var midR = (BR + WR) >> 1;
          var midG = (BG2 + WG) >> 1;
          var midB = (BB + WB) >> 1;
          r = lerp(midR, r, bf) | 0;
          g = lerp(midG, g, bf) | 0;
          b = lerp(midB, b, bf) | 0;
        }
      } else {
        var cb = (sin(phue[i] * 0.5 + elapsed * 0.0005) + 1) * 0.5;
        r = lerp(BR, WR, cb) | 0;
        g = lerp(BG2, WG, cb) | 0;
        b = lerp(BB, WB, cb) | 0;
        alpha *= 0.35;
      }

      // Draw motion-blur line
      ctx.beginPath();
      ctx.moveTo(ppx[i], ppy[i]);
      ctx.lineTo(px[i], py[i]);
      ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
      ctx.lineWidth = inside ? 1.5 : 1;
      ctx.stroke();
    }

    // Vignette overlay
    if (vignetteCanvas) ctx.drawImage(vignetteCanvas, 0, 0);

    animId = requestAnimationFrame(animate);
  }

  // ---- Resize ----

  function resize() {
    var section = canvas.parentElement;
    W = section.clientWidth || window.innerWidth;
    H = section.clientHeight || window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    cellW = W / GRID_COLS;
    cellH = H / GRID_ROWS;

    buildHorseMask();
    buildVignette();
  }

  // ---- Card API ----

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    smoothMouse = new SmoothMouse(0.08);
    fieldAngles = new Float32Array(GRID_COLS * GRID_ROWS);
  }

  function start(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');

    resize();
    initParticles();

    ctx.fillStyle = 'rgb(10,10,20)';
    ctx.fillRect(0, 0, W, H);
    drawWatermark();

    elapsedAccum = 0;
    resumeStamp = performance.now();
    running = true;

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd);
    window.addEventListener('resize', resize);

    animId = requestAnimationFrame(animate);
  }

  function pause() {
    if (running) {
      elapsedAccum += performance.now() - resumeStamp;
    }
    running = false;
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  function resume() {
    if (!running) {
      running = true;
      resumeStamp = performance.now();
      animId = requestAnimationFrame(animate);
    }
  }

  function destroy() {
    pause();
    if (canvas) {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    }
    window.removeEventListener('resize', resize);
    px = py = pvx = pvy = ppx = ppy = phue = plife = pmaxlife = ptx = pty = null;
    fieldAngles = null;
    maskData = null;
    borderDist = null;
    maskPixels = [];
    vignetteCanvas = null;
  }

  registerCard(2, { init: init, start: start, pause: pause, resume: resume, destroy: destroy });

})();
