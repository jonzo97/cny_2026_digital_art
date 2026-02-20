/* ============================================
   Card 7 — Reaction-Diffusion Morphogenesis
   ============================================ */

(function() {
  'use strict';

  // ---- Constants ----

  var GRID_W = 256;
  var GRID_H = 256;
  var DA = 0.2097;
  var DB = 0.105;
  var DEFAULT_F = 0.055;
  var DEFAULT_K = 0.062;
  var DT = 1.0;
  var STEPS_PER_FRAME = 10;
  var DROP_RADIUS = 10;
  var GLOW_PULSE_SPEED = 2.0;

  // ---- State ----

  var canvas, ctx, W, H;
  var running = false;
  var rafId = null;

  // Simulation grids (double-buffered)
  var gridA, gridB, nextA, nextB;

  // Horse mask at grid resolution
  var horseMask = null;

  // Rendering
  var imageData = null;
  var pixelBuf = null;

  // Interaction
  var mouseDown = false;
  var mouseGridX = -1;
  var mouseGridY = -1;
  var currentF = DEFAULT_F;
  var currentK = DEFAULT_K;
  var paramExplore = false;

  // Glow timer
  var glowTime = 0;

  // ---- Horse Mask Generation ----

  function buildHorseMask() {
    horseMask = new Uint8Array(GRID_W * GRID_H);

    var offCanvas = document.createElement('canvas');
    offCanvas.width = GRID_W;
    offCanvas.height = GRID_H;
    var offCtx = offCanvas.getContext('2d');

    // Parse and draw the SVG horse path
    var path = new Path2D(HORSE_SVG_PATH);

    // The horse path data spans roughly x:[160,372] y:[78,352]
    // Center: ~266, ~215   Range: ~212w, ~274h
    var srcCx = 266;
    var srcCy = 215;
    var srcW = 220;
    var srcH = 280;

    // We want the horse centered in the grid with some padding
    var padding = 0.15;
    var availW = GRID_W * (1 - 2 * padding);
    var availH = GRID_H * (1 - 2 * padding);
    var scale = Math.min(availW / srcW, availH / srcH);

    offCtx.translate(GRID_W / 2, GRID_H / 2);
    offCtx.scale(scale, scale);
    offCtx.translate(-srcCx, -srcCy);

    offCtx.fillStyle = '#000';
    offCtx.fill(path);

    var imgData = offCtx.getImageData(0, 0, GRID_W, GRID_H);
    for (var i = 0; i < GRID_W * GRID_H; i++) {
      // Check alpha channel — filled pixels are inside the horse
      horseMask[i] = imgData.data[i * 4 + 3] > 128 ? 1 : 0;
    }
  }

  // ---- Grid Initialization ----

  function initGrids() {
    var size = GRID_W * GRID_H;
    gridA = new Float32Array(size);
    gridB = new Float32Array(size);
    nextA = new Float32Array(size);
    nextB = new Float32Array(size);

    seedGrids();
  }

  function seedGrids() {
    var size = GRID_W * GRID_H;

    // A = 1.0 everywhere, B = 0.0 everywhere
    for (var i = 0; i < size; i++) {
      gridA[i] = 1.0;
      gridB[i] = 0.0;
    }

    if (!horseMask) buildHorseMask();

    // Seed B where horse mask is set, with noise
    for (var i = 0; i < size; i++) {
      if (horseMask[i]) {
        gridB[i] = 1.0 + (Math.random() - 0.5) * 0.1;
      }
    }

    // Random B seeds outside the horse for organic growth
    var seedCount = Math.floor(size * 0.002);
    for (var s = 0; s < seedCount; s++) {
      var sx = Math.floor(Math.random() * GRID_W);
      var sy = Math.floor(Math.random() * GRID_H);
      var idx = sy * GRID_W + sx;
      if (!horseMask[idx]) {
        // Small seed cluster
        for (var dy = -2; dy <= 2; dy++) {
          for (var dx = -2; dx <= 2; dx++) {
            var nx = sx + dx;
            var ny = sy + dy;
            if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) {
              var ni = ny * GRID_W + nx;
              gridB[ni] = 1.0 + (Math.random() - 0.5) * 0.1;
            }
          }
        }
      }
    }

    currentF = DEFAULT_F;
    currentK = DEFAULT_K;
    paramExplore = false;
  }

  // ---- Simulation Step ----

  function simulate() {
    var w = GRID_W;
    var h = GRID_H;
    var f = currentF;
    var k = currentK;

    for (var step = 0; step < STEPS_PER_FRAME; step++) {
      for (var y = 0; y < h; y++) {
        var ym = y === 0 ? h - 1 : y - 1;
        var yp = y === h - 1 ? 0 : y + 1;
        var yOff = y * w;
        var ymOff = ym * w;
        var ypOff = yp * w;

        for (var x = 0; x < w; x++) {
          var xm = x === 0 ? w - 1 : x - 1;
          var xp = x === w - 1 ? 0 : x + 1;
          var idx = yOff + x;

          var a = gridA[idx];
          var b = gridB[idx];

          // Laplacian with standard 5-point stencil
          var lapA = gridA[ymOff + x] + gridA[ypOff + x] +
                     gridA[yOff + xm] + gridA[yOff + xp] -
                     4.0 * a;
          var lapB = gridB[ymOff + x] + gridB[ypOff + x] +
                     gridB[yOff + xm] + gridB[yOff + xp] -
                     4.0 * b;

          var abb = a * b * b;
          var newA = a + (DA * lapA - abb + f * (1.0 - a)) * DT;
          var newB = b + (DB * lapB + abb - (k + f) * b) * DT;
          nextA[idx] = newA < 0 ? 0 : (newA > 1 ? 1 : newA);
          nextB[idx] = newB < 0 ? 0 : (newB > 1 ? 1 : newB);
        }
      }

      // Swap buffers
      var tmpA = gridA;
      var tmpB = gridB;
      gridA = nextA;
      gridB = nextB;
      nextA = tmpA;
      nextB = tmpB;
    }
  }

  // ---- Rendering ----

  function render() {
    if (!imageData) return;

    var data = pixelBuf;
    var glow = 0.5 + 0.5 * Math.sin(glowTime * GLOW_PULSE_SPEED);
    var size = GRID_W * GRID_H;

    for (var i = 0; i < size; i++) {
      var bVal = gridB[i];
      var clamp = bVal < 0 ? 0 : (bVal > 1 ? 1 : bVal);
      var r, g, b;

      if (clamp < 0.1) {
        var t = clamp * 10; // 0..1
        r = 26 + 154 * t;   // 26 -> 180
        g = 26 - 10 * t;    // 26 -> 16
        b = 26 + 20 * t;    // 26 -> 46
      } else if (clamp < 0.3) {
        var t = (clamp - 0.1) * 5; // 0..1
        r = 180 + 75 * t;   // 180 -> 255
        g = 16 + 199 * t;   // 16 -> 215
        b = 46 - 46 * t;    // 46 -> 0
      } else if (clamp < 0.5) {
        var t = (clamp - 0.3) * 5; // 0..1
        r = 255;             // 255 -> 255
        g = 215 + 40 * t;   // 215 -> 255
        b = 240 * t;         // 0 -> 240
      } else {
        r = 255;
        g = 255;
        b = 240;
        // Pulsing glow on high-B
        var boost = glow * 0.3 * (clamp - 0.5) * 2;
        r = Math.min(255, 255 + boost * 30) | 0;
        g = Math.min(255, 255 - boost * 10) | 0;
        b = Math.max(200, 240 - boost * 40) | 0;
      }

      var off = i << 2;
      data[off]     = r | 0;
      data[off + 1] = g | 0;
      data[off + 2] = b | 0;
      data[off + 3] = 255;
    }

    // Draw the ImageData scaled to canvas
    var tmpCanvas = imageData._tmpCanvas;
    var tmpCtx = imageData._tmpCtx;
    tmpCtx.putImageData(imageData, 0, 0);

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(tmpCanvas, 0, 0, W, H);
  }

  function drawOverlay() {
    // Corner text
    ctx.save();
    ctx.font = '12px "Source Code Pro", monospace';
    ctx.fillStyle = 'rgba(255, 255, 240, 0.6)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    var fStr = currentF.toFixed(3);
    var kStr = currentK.toFixed(3);
    ctx.fillText('Gray-Scott Reaction-Diffusion | f=' + fStr + ' k=' + kStr, 12, H - 12);

    // Interaction hints
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 240, 0.35)';
    ctx.fillText('Click: drop chemical | R: reset | Shift+Move: explore params', W - 12, H - 12);
    ctx.restore();
  }

  // ---- Interaction ----

  function dropBlob(gx, gy, radius) {
    var r2 = radius * radius;
    for (var dy = -radius; dy <= radius; dy++) {
      for (var dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        var nx = gx + dx;
        var ny = gy + dy;
        if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) {
          var idx = ny * GRID_W + nx;
          gridB[idx] = 1.0;
        }
      }
    }
  }

  function canvasToGrid(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var cx = (clientX - rect.left) / rect.width;
    var cy = (clientY - rect.top) / rect.height;
    return {
      x: Math.floor(cx * GRID_W),
      y: Math.floor(cy * GRID_H)
    };
  }

  function updateParamExplore(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var nx = (clientX - rect.left) / rect.width;
    var ny = (clientY - rect.top) / rect.height;
    // Map mouse position to feed/kill rate ranges
    // f: 0.01 to 0.10, k: 0.03 to 0.07
    currentF = 0.01 + nx * 0.09;
    currentK = 0.03 + ny * 0.04;
    paramExplore = true;
  }

  function onMouseDown(e) {
    if (!running) return;
    e.preventDefault();
    mouseDown = true;
    var g = canvasToGrid(e.clientX, e.clientY);
    mouseGridX = g.x;
    mouseGridY = g.y;
    dropBlob(g.x, g.y, DROP_RADIUS);
  }

  function onMouseMove(e) {
    if (!running) return;
    var g = canvasToGrid(e.clientX, e.clientY);
    mouseGridX = g.x;
    mouseGridY = g.y;

    if (mouseDown) {
      // Paint B trail while dragging
      dropBlob(g.x, g.y, Math.floor(DROP_RADIUS * 0.6));
    }

    // Parameter exploration only when shift is held
    if (e.shiftKey) {
      updateParamExplore(e.clientX, e.clientY);
    } else if (paramExplore) {
      // Reset to defaults when shift released
      currentF = DEFAULT_F;
      currentK = DEFAULT_K;
      paramExplore = false;
    }
  }

  function onMouseUp() {
    mouseDown = false;
  }

  function onTouchStart(e) {
    if (!running) return;
    var touch = e.touches[0];
    mouseDown = true;
    var g = canvasToGrid(touch.clientX, touch.clientY);
    mouseGridX = g.x;
    mouseGridY = g.y;
    dropBlob(g.x, g.y, DROP_RADIUS);
  }

  function onTouchMove(e) {
    if (!running) return;
    var touch = e.touches[0];
    var g = canvasToGrid(touch.clientX, touch.clientY);
    mouseGridX = g.x;
    mouseGridY = g.y;

    if (mouseDown) {
      dropBlob(g.x, g.y, Math.floor(DROP_RADIUS * 0.6));
    }
  }

  function onTouchEnd() {
    mouseDown = false;
  }

  function onKeyDown(e) {
    if (!running) return;
    if (e.key === 'r' || e.key === 'R') {
      seedGrids();
    }
  }

  // ---- Main Loop ----

  function frame(timestamp) {
    if (!running) return;

    glowTime = timestamp * 0.001;

    simulate();
    render();
    drawOverlay();

    rafId = requestAnimationFrame(frame);
  }

  // ---- Resize ----

  function resize() {
    if (!canvas) return;
    var section = canvas.parentElement;
    W = section.clientWidth;
    H = section.clientHeight;
    canvas.width = W;
    canvas.height = H;
  }

  // ---- Setup ImageData ----

  function setupImageData() {
    var tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = GRID_W;
    tmpCanvas.height = GRID_H;
    var tmpCtx = tmpCanvas.getContext('2d');
    imageData = tmpCtx.createImageData(GRID_W, GRID_H);
    pixelBuf = imageData.data;
    // Stash references for render
    imageData._tmpCanvas = tmpCanvas;
    imageData._tmpCtx = tmpCtx;
  }

  // ---- Card API ----

  function init(c) {
    canvas = c;
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', resize);
  }

  function start(c) {
    canvas = c;
    ctx = canvas.getContext('2d');
    resize();
    setupImageData();
    buildHorseMask();
    initGrids();

    running = true;

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    document.addEventListener('keydown', onKeyDown);

    rafId = requestAnimationFrame(frame);
  }

  function pause() {
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function resume() {
    if (running) return;
    running = true;
    rafId = requestAnimationFrame(frame);
  }

  function destroy() {
    pause();
    if (canvas) {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
    }
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('resize', resize);
    document.removeEventListener('keydown', onKeyDown);

    gridA = null;
    gridB = null;
    nextA = null;
    nextB = null;
    horseMask = null;
    imageData = null;
    pixelBuf = null;
  }

  registerCard(7, {
    init: init,
    start: start,
    pause: pause,
    resume: resume,
    destroy: destroy
  });

})();
