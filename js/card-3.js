/* ============================================
   CNY 2026 — Card 3: Particle Text — Glitch Edition
   ============================================ */

(function() {
  'use strict';

  // ---- Constants ----
  var MAX_PARTICLES = 12000;
  var MOUSE_RADIUS = 120;
  var SPRING_K = 0.02;
  var DAMPING = 0.85;
  var JITTER = 2;
  var GLITCH_MIN_INTERVAL = 3000;
  var GLITCH_MAX_INTERVAL = 8000;
  var GLITCH_MIN_DURATION = 100;
  var GLITCH_MAX_DURATION = 300;
  var PARTICLE_SIZE = 2;
  var SCAN_LINE_GAP = 3;

  // Parsed colors
  var COLOR_CRIMSON = { r: 220, g: 20, b: 60 };
  var COLOR_GOLD = { r: 255, g: 215, b: 0 };
  var COLOR_WHITE = { r: 255, g: 255, b: 255 };

  // ---- State ----
  var canvas, ctx;
  var width = 0, height = 0;
  var dpr = 1;
  var animId = null;
  var running = false;
  var particleCount = 0;

  // Typed arrays for particle pool
  var homeX, homeY;
  var posX, posY;
  var velX, velY;
  var colorR, colorG, colorB;
  var sparkle; // 1 = sparkle particle

  // Mouse state
  var mouseX = -9999, mouseY = -9999;
  var prevMouseX = -9999, prevMouseY = -9999;
  var mouseVel = 0;
  var mouseInCanvas = false;

  // Glitch state
  var glitchActive = false;
  var glitchStart = 0;
  var glitchDuration = 0;
  var glitchIntense = false;
  var nextGlitchTime = 0;
  var glitchSlices = [];

  // Bottom text flicker
  var textFlickerPhase = 0;

  // Offscreen canvas for text sampling
  var offCanvas, offCtx;

  // ---- Allocate Typed Arrays ----
  function allocateArrays() {
    homeX = new Float32Array(MAX_PARTICLES);
    homeY = new Float32Array(MAX_PARTICLES);
    posX = new Float32Array(MAX_PARTICLES);
    posY = new Float32Array(MAX_PARTICLES);
    velX = new Float32Array(MAX_PARTICLES);
    velY = new Float32Array(MAX_PARTICLES);
    colorR = new Uint8Array(MAX_PARTICLES);
    colorG = new Uint8Array(MAX_PARTICLES);
    colorB = new Uint8Array(MAX_PARTICLES);
    sparkle = new Uint8Array(MAX_PARTICLES);
  }

  // ---- Sample Text Pixels ----
  function sampleTextParticles() {
    var textStr = '新年快乐';
    var fontSize = Math.min(300, width * 0.22);
    var offW = Math.ceil(width * 0.9);
    var offH = Math.ceil(fontSize * 1.4);

    if (!offCanvas) {
      offCanvas = document.createElement('canvas');
      offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
    }
    offCanvas.width = offW;
    offCanvas.height = offH;

    offCtx.clearRect(0, 0, offW, offH);
    offCtx.fillStyle = '#ffffff';
    offCtx.font = 'bold ' + fontSize + 'px "Noto Serif SC", serif';
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.fillText(textStr, offW / 2, offH / 2);

    var imageData = offCtx.getImageData(0, 0, offW, offH);
    var data = imageData.data;

    // Collect all filled pixel positions
    var filled = [];
    var step = 3; // sample every 3rd pixel for density
    for (var y = 0; y < offH; y += step) {
      for (var x = 0; x < offW; x += step) {
        var idx = (y * offW + x) * 4;
        if (data[idx + 3] > 128) {
          filled.push(x, y);
        }
      }
    }

    // Target 8000-12000 particles; adjust by sampling from filled positions
    var totalFilled = filled.length / 2;
    var targetCount = Math.min(MAX_PARTICLES, Math.max(8000, totalFilled));
    if (targetCount > totalFilled) targetCount = totalFilled;

    particleCount = targetCount;

    // Center offset to place text in middle of canvas, shifted up to leave room for bottom text
    var offsetX = (width - offW) / 2;
    var offsetY = (height - offH) / 2 - height * 0.06;

    // Shuffle filled to sample randomly if we have more than we need
    if (totalFilled > targetCount) {
      for (var i = totalFilled - 1; i > 0; i--) {
        var j = (Math.random() * (i + 1)) | 0;
        var tmp0 = filled[i * 2];
        var tmp1 = filled[i * 2 + 1];
        filled[i * 2] = filled[j * 2];
        filled[i * 2 + 1] = filled[j * 2 + 1];
        filled[j * 2] = tmp0;
        filled[j * 2 + 1] = tmp1;
      }
    }

    for (var i = 0; i < particleCount; i++) {
      var px = filled[i * 2] + offsetX;
      var py = filled[i * 2 + 1] + offsetY;
      homeX[i] = px;
      homeY[i] = py;

      // Scatter initial positions randomly, they'll spring into place
      posX[i] = px + (Math.random() - 0.5) * width * 0.5;
      posY[i] = py + (Math.random() - 0.5) * height * 0.5;
      velX[i] = 0;
      velY[i] = 0;

      // Assign color: ~50% crimson, ~35% gold, ~15% white sparkle
      var rnd = Math.random();
      if (rnd < 0.15) {
        colorR[i] = COLOR_WHITE.r;
        colorG[i] = COLOR_WHITE.g;
        colorB[i] = COLOR_WHITE.b;
        sparkle[i] = 1;
      } else if (rnd < 0.50) {
        colorR[i] = COLOR_GOLD.r;
        colorG[i] = COLOR_GOLD.g;
        colorB[i] = COLOR_GOLD.b;
        sparkle[i] = 0;
      } else {
        colorR[i] = COLOR_CRIMSON.r;
        colorG[i] = COLOR_CRIMSON.g;
        colorB[i] = COLOR_CRIMSON.b;
        sparkle[i] = 0;
      }
    }
  }

  // ---- Glitch Scheduling ----
  function scheduleNextGlitch(now) {
    nextGlitchTime = now + GLITCH_MIN_INTERVAL + Math.random() * (GLITCH_MAX_INTERVAL - GLITCH_MIN_INTERVAL);
  }

  function triggerGlitch(now, intense) {
    glitchActive = true;
    glitchIntense = !!intense;
    glitchStart = now;
    glitchDuration = GLITCH_MIN_DURATION + Math.random() * (GLITCH_MAX_DURATION - GLITCH_MIN_DURATION);
    if (intense) glitchDuration *= 2;

    // Generate random slice data
    glitchSlices = [];
    var sliceCount = intense ? 12 : 6;
    for (var i = 0; i < sliceCount; i++) {
      glitchSlices.push({
        y: Math.random() * height,
        h: 2 + Math.random() * (intense ? 30 : 15),
        dx: (Math.random() - 0.5) * (intense ? 60 : 25)
      });
    }
  }

  // ---- Mouse Handlers ----
  function onMouseMove(e) {
    var rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * dpr;
    mouseY = (e.clientY - rect.top) * dpr;
    mouseInCanvas = true;
  }

  function onMouseLeave() {
    mouseInCanvas = false;
    mouseX = -9999;
    mouseY = -9999;
  }

  function onClick(e) {
    var rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * dpr;
    mouseY = (e.clientY - rect.top) * dpr;
    triggerGlitch(performance.now(), true);
  }

  function onTouchMove(e) {
    if (e.touches.length > 0) {
      var rect = canvas.getBoundingClientRect();
      mouseX = (e.touches[0].clientX - rect.left) * dpr;
      mouseY = (e.touches[0].clientY - rect.top) * dpr;
      mouseInCanvas = true;
    }
  }

  function onTouchEnd() {
    mouseInCanvas = false;
    mouseX = -9999;
    mouseY = -9999;
  }

  // ---- Resize ----
  function resize() {
    var section = canvas.parentElement;
    dpr = window.devicePixelRatio || 1;
    width = section.clientWidth * dpr;
    height = section.clientHeight * dpr;
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = section.clientWidth + 'px';
    canvas.style.height = section.clientHeight + 'px';
    sampleTextParticles();
  }

  // ---- Physics Update ----
  function updateParticles() {
    var mouseRadSq = MOUSE_RADIUS * MOUSE_RADIUS * dpr * dpr;
    var mouseActive = mouseInCanvas;

    for (var i = 0; i < particleCount; i++) {
      var dx, dy, distSq, dist, force, angle;

      // Spring force toward home
      var springX = (homeX[i] - posX[i]) * SPRING_K;
      var springY = (homeY[i] - posY[i]) * SPRING_K;

      velX[i] += springX;
      velY[i] += springY;

      // Mouse repulsion
      if (mouseActive) {
        dx = posX[i] - mouseX;
        dy = posY[i] - mouseY;
        distSq = dx * dx + dy * dy;
        if (distSq < mouseRadSq && distSq > 1) {
          dist = Math.sqrt(distSq);
          force = (MOUSE_RADIUS * dpr - dist) / (MOUSE_RADIUS * dpr);
          force = force * force * 8;
          velX[i] += (dx / dist) * force;
          velY[i] += (dy / dist) * force;
        }
      }

      // Damping
      velX[i] *= DAMPING;
      velY[i] *= DAMPING;

      // Brownian jitter when near home
      dx = posX[i] - homeX[i];
      dy = posY[i] - homeY[i];
      if (dx * dx + dy * dy < 25) {
        velX[i] += (Math.random() - 0.5) * JITTER;
        velY[i] += (Math.random() - 0.5) * JITTER;
      }

      posX[i] += velX[i];
      posY[i] += velY[i];
    }
  }

  // ---- Render ----
  function renderParticles(now) {
    var glitchT = 0;
    if (glitchActive) {
      glitchT = (now - glitchStart) / glitchDuration;
      if (glitchT > 1) {
        glitchActive = false;
        glitchT = 0;
      }
    }

    // RGB channel separation offsets during glitch
    var rgbOffX = 0;
    if (glitchActive) {
      var intensity = glitchIntense ? 3 : 1;
      rgbOffX = Math.sin(glitchT * Math.PI) * (3 + mouseVel * 0.05) * intensity;
    }

    var imgData = ctx.createImageData(width, height);
    var pixels = imgData.data;
    var w = width | 0;
    var h = height | 0;
    var sz = PARTICLE_SIZE;

    for (var i = 0; i < particleCount; i++) {
      var px = posX[i] | 0;
      var py = posY[i] | 0;
      var r = colorR[i];
      var g = colorG[i];
      var b = colorB[i];

      // Sparkle: vary alpha with time
      var alpha = 255;
      if (sparkle[i]) {
        alpha = (Math.sin(now * 0.01 + i * 0.7) * 0.5 + 0.5) * 255 | 0;
      }

      // Draw particle as a small block
      for (var dy = 0; dy < sz; dy++) {
        for (var dx = 0; dx < sz; dx++) {
          var drawX = px + dx;
          var drawY = py + dy;
          if (drawX >= 0 && drawX < w && drawY >= 0 && drawY < h) {
            var idx = (drawY * w + drawX) * 4;

            if (glitchActive && rgbOffX !== 0) {
              // RGB separation: red channel shifted left, blue channel shifted right
              var rxOff = (drawX - (rgbOffX | 0));
              var bxOff = (drawX + (rgbOffX | 0));
              if (rxOff >= 0 && rxOff < w) {
                var rIdx = (drawY * w + rxOff) * 4;
                pixels[rIdx] = Math.min(255, pixels[rIdx] + r);
                pixels[rIdx + 3] = Math.max(pixels[rIdx + 3], alpha);
              }
              if (bxOff >= 0 && bxOff < w) {
                var bIdx = (drawY * w + bxOff) * 4;
                pixels[bIdx + 2] = Math.min(255, pixels[bIdx + 2] + b);
                pixels[bIdx + 3] = Math.max(pixels[bIdx + 3], alpha);
              }
              // Green in place
              pixels[idx + 1] = Math.min(255, pixels[idx + 1] + g);
              pixels[idx + 3] = Math.max(pixels[idx + 3], alpha);
            } else {
              pixels[idx] = Math.min(255, pixels[idx] + r);
              pixels[idx + 1] = Math.min(255, pixels[idx + 1] + g);
              pixels[idx + 2] = Math.min(255, pixels[idx + 2] + b);
              pixels[idx + 3] = Math.max(pixels[idx + 3], alpha);
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  // ---- Glitch Overlay Effects ----
  function renderGlitchOverlay(now) {
    if (!glitchActive) return;

    var t = (now - glitchStart) / glitchDuration;
    var intensity = Math.sin(t * Math.PI);
    var scale = glitchIntense ? 1.5 : 1;

    // Horizontal slice displacement
    for (var s = 0; s < glitchSlices.length; s++) {
      var slice = glitchSlices[s];
      var sy = slice.y | 0;
      var sh = slice.h | 0;
      var sdx = (slice.dx * intensity * scale) | 0;
      if (sy + sh > height) sh = height - sy;
      if (sy >= 0 && sh > 0) {
        try {
          var sliceData = ctx.getImageData(0, sy, width, sh);
          ctx.putImageData(sliceData, sdx, sy);
        } catch (e) {
          // ignore
        }
      }
    }

    // Static noise overlay
    var noiseAmount = intensity * 0.15 * scale;
    if (noiseAmount > 0.02) {
      ctx.save();
      ctx.globalAlpha = noiseAmount;
      var noiseImg = ctx.createImageData(width, height);
      var nd = noiseImg.data;
      // Sparse noise - only every 4th pixel for performance
      for (var i = 0; i < nd.length; i += 16) {
        if (Math.random() < 0.3) {
          var v = Math.random() * 255 | 0;
          nd[i] = v;
          nd[i + 1] = v;
          nd[i + 2] = v;
          nd[i + 3] = 255;
        }
      }
      ctx.putImageData(noiseImg, 0, 0);
      ctx.restore();
    }

    // VHS tracking artifact
    if (glitchIntense && Math.random() < 0.5) {
      var trackY = (Math.random() * height) | 0;
      var trackH = (3 + Math.random() * 8) | 0;
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(0, trackY, width, trackH);
      ctx.restore();
    }
  }

  // ---- Scan Lines ----
  function renderScanLines() {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (var y = 0; y < height; y += SCAN_LINE_GAP) {
      ctx.fillRect(0, y, width, 1);
    }
    ctx.restore();
  }

  // ---- CRT Barrel Distortion (vignette approximation) ----
  function renderCRTEffect() {
    ctx.save();
    var grad = ctx.createRadialGradient(
      width / 2, height / 2, height * 0.35,
      width / 2, height / 2, height * 0.75
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // ---- Bottom Text ----
  function renderBottomText(now) {
    textFlickerPhase += 0.05;
    var flicker = Math.sin(textFlickerPhase) * 0.3 + 0.7;
    // Occasional hard flicker
    if (Math.random() < 0.03) flicker *= 0.3;

    ctx.save();
    var fSize = Math.max(14, width * 0.018) | 0;
    ctx.font = fSize + 'px "Source Code Pro", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(255,255,255,' + (flicker * 0.9).toFixed(2) + ')';
    ctx.shadowColor = 'rgba(255,255,255,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText('\u65B0\u5E74\u5FEB\u4E50 // HAPPY NEW YEAR 2026', width / 2, height - 30 * dpr);
    ctx.restore();
  }

  // ---- Main Loop ----
  function frame(now) {
    if (!running) return;

    // Mouse velocity tracking
    if (mouseInCanvas) {
      var mdx = mouseX - prevMouseX;
      var mdy = mouseY - prevMouseY;
      mouseVel = Math.sqrt(mdx * mdx + mdy * mdy);
    } else {
      mouseVel *= 0.9;
    }
    prevMouseX = mouseX;
    prevMouseY = mouseY;

    // Auto-glitch scheduling
    if (!glitchActive && now >= nextGlitchTime) {
      triggerGlitch(now, false);
      scheduleNextGlitch(now);
    }

    // Update physics
    updateParticles();

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Render particles
    renderParticles(now);

    // Glitch overlay
    renderGlitchOverlay(now);

    // Scan lines
    renderScanLines();

    // CRT vignette
    renderCRTEffect();

    // Bottom text
    renderBottomText(now);

    animId = requestAnimationFrame(frame);
  }

  // ---- Lifecycle ----
  function init(c) {
    canvas = c;
    ctx = canvas.getContext('2d');
    allocateArrays();
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

    sampleTextParticles();
    scheduleNextGlitch(performance.now());

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('resize', resize);

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
      scheduleNextGlitch(performance.now());
      animId = requestAnimationFrame(frame);
    }
  }

  function destroy() {
    pause();
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mouseleave', onMouseLeave);
    canvas.removeEventListener('click', onClick);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('resize', resize);
    particleCount = 0;
  }

  // ---- Register ----
  registerCard(3, {
    init: init,
    start: start,
    pause: pause,
    resume: resume,
    destroy: destroy
  });

})();
