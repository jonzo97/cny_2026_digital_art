/* ============================================
   Card 6 — Generative Fireworks
   ============================================ */

(function() {
  'use strict';

  // ---- Constants ----

  var MAX_PARTICLES = 4000;
  var MAX_FIREWORKS = 20;
  var MAX_SMOKE = 200;
  var GRAVITY = 0.06;
  var DRAG = 0.985;
  var SMOKE_DRAG = 0.96;
  var SKYLINE_RATIO = 0.18;
  var AUTO_LAUNCH_IDLE = 3000;
  var AUTO_LAUNCH_INTERVAL_MIN = 2000;
  var AUTO_LAUNCH_INTERVAL_MAX = 4000;
  var ROMAN_CANDLE_HOLD_MS = 500;
  var ROMAN_CANDLE_INTERVAL = 120;
  var FINALE_DURATION = 4000;
  var FINALE_COOLDOWN = 30000;
  var STAR_COUNT = 120;
  var BUILDING_COUNT = 14;
  var LANTERN_COUNT = 18;
  var SHAKE_DECAY = 0.9;

  var COLOR_SCHEMES = [
    { primary: '#DC143C', secondary: '#FFD700' },
    { primary: '#FFD700', secondary: '#FFFFFF' },
    { primary: '#DC143C', secondary: '#00A86B' },
    { primary: '#FF6B35', secondary: '#FFD700' },
    { primary: '#CC0000', secondary: '#FFFFF0' }
  ];

  var BURST_SHAPES = ['sphere', 'ring', 'heart', 'star', 'horse'];

  // ---- State ----

  var canvas, ctx, W, H;
  var running = false;
  var rafId = null;
  var lastTime = 0;

  // Object pools
  var particlePool = [];
  var activeParticles = [];
  var fireworkPool = [];
  var activeFireworks = [];
  var smokePool = [];
  var activeSmoke = [];

  // Skyline
  var buildings = [];
  var windows = [];
  var lanterns = [];
  var stars = [];

  // Interaction
  var lastInteraction = 0;
  var autoTimer = null;
  var mouseDown = false;
  var mouseX = 0;
  var mouseY = 0;
  var holdStart = 0;
  var romanCandleTimer = null;

  // Screen shake
  var shakeX = 0;
  var shakeY = 0;
  var shakeIntensity = 0;

  // Flash
  var flashAlpha = 0;

  // Grand finale
  var finaleActive = false;
  var finaleStart = 0;
  var lastFinaleTime = 0;

  // Sparkler text
  var sparklerParticles = [];

  // ---- Pre-computed horse shape points ----

  var horseShapePoints = null;

  function computeHorsePoints() {
    var points = [];
    var segments = [
      [180,300],[175,280],[170,260],[172,240],[174,220],[180,210],[185,195],
      [190,180],[188,165],[182,150],[178,140],[170,132],[168,120],[166,108],
      [170,96],[178,88],[186,80],[196,78],[206,80],[216,82],[224,88],[228,96],
      [232,104],[232,112],[236,118],[240,124],[248,128],[258,128],[268,128],
      [278,124],[288,118],[298,112],[306,104],[316,100],[326,96],[338,96],
      [348,100],[358,104],[364,112],[368,122],[372,132],[372,142],[370,152],
      [368,162],[364,170],[358,180],[352,190],[344,198],[340,210],[336,222],
      [336,234],[338,248],[340,262],[344,274],[346,288],[348,302],[348,316],
      [344,328],[340,340],[332,348],[322,350],[312,352],[302,348],[296,342],
      [290,336],[288,328],[288,318],[288,308],[290,298],[288,290],[286,282],
      [280,278],[274,276],[268,274],[260,274],[252,278],[244,282],[238,288],
      [232,296],[226,304],[222,314],[218,322],[214,330],[210,338],[204,344],
      [198,350],[190,352],[180,350],[170,348],[164,340],[162,330],[160,320],
      [162,310],[168,302],[174,294],[180,292],[180,300]
    ];
    // Normalize to -1..1 range
    var cx = 270, cy = 215, scale = 140;
    for (var i = 0; i < segments.length; i++) {
      points.push({
        x: (segments[i][0] - cx) / scale,
        y: (segments[i][1] - cy) / scale
      });
    }
    return points;
  }

  // ---- Pool Management ----

  function getParticle() {
    if (particlePool.length > 0) return particlePool.pop();
    return {};
  }

  function releaseParticle(p) {
    if (particlePool.length < MAX_PARTICLES) particlePool.push(p);
  }

  function getFirework() {
    if (fireworkPool.length > 0) return fireworkPool.pop();
    return {};
  }

  function releaseFirework(f) {
    if (fireworkPool.length < MAX_FIREWORKS) fireworkPool.push(f);
  }

  function getSmoke() {
    if (smokePool.length > 0) return smokePool.pop();
    return {};
  }

  function releaseSmoke(s) {
    if (smokePool.length < MAX_SMOKE) smokePool.push(s);
  }

  // ---- Skyline Generation ----

  function generateSkyline() {
    buildings.length = 0;
    windows.length = 0;
    lanterns.length = 0;
    stars.length = 0;

    var skylineY = H * (1 - SKYLINE_RATIO);

    // Generate buildings
    var x = -20;
    for (var i = 0; i < BUILDING_COUNT; i++) {
      var w = 30 + Math.random() * 70;
      var h = 30 + Math.random() * (H * SKYLINE_RATIO - 30);
      var top = skylineY + (H * SKYLINE_RATIO - h);
      buildings.push({ x: x, y: top, w: w, h: h });

      // Lit windows for this building
      var winCols = Math.floor(w / 16);
      var winRows = Math.floor(h / 20);
      for (var r = 0; r < winRows; r++) {
        for (var c = 0; c < winCols; c++) {
          if (Math.random() < 0.4) {
            var wx = x + 6 + c * 16;
            var wy = top + 10 + r * 20;
            var warm = Math.random();
            windows.push({
              x: wx, y: wy, w: 8, h: 10,
              on: true,
              flicker: Math.random() * 6.28,
              hue: warm < 0.5 ? 45 : 30,
              brightness: 0.5 + Math.random() * 0.5
            });
          }
        }
      }

      x += w + 5 + Math.random() * 20;
      if (x > W + 40) break;
    }

    // Paper lantern strings
    for (var li = 0; li < LANTERN_COUNT; li++) {
      lanterns.push({
        x: Math.random() * W,
        y: skylineY - 10 - Math.random() * 40,
        size: 4 + Math.random() * 6,
        phase: Math.random() * 6.28,
        speed: 0.3 + Math.random() * 0.5,
        hue: Math.random() < 0.7 ? 0 : 45
      });
    }

    // Star field
    for (var si = 0; si < STAR_COUNT; si++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * skylineY * 0.8,
        size: 0.5 + Math.random() * 1.5,
        twinkle: Math.random() * 6.28,
        speed: 0.5 + Math.random() * 2
      });
    }
  }

  // ---- Burst Shape Generators ----

  function burstSphere(cx, cy, count, power, scheme) {
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = (0.5 + Math.random() * 0.5) * power;
      emitParticle(cx, cy, Math.cos(angle) * speed, Math.sin(angle) * speed, scheme);
    }
  }

  function burstRing(cx, cy, count, power, scheme) {
    for (var i = 0; i < count; i++) {
      var angle = (i / count) * Math.PI * 2;
      var speed = power * (0.85 + Math.random() * 0.3);
      emitParticle(cx, cy, Math.cos(angle) * speed, Math.sin(angle) * speed, scheme);
    }
  }

  function burstHeart(cx, cy, count, power, scheme) {
    for (var i = 0; i < count; i++) {
      var t = (i / count) * Math.PI * 2;
      var hx = 16 * Math.pow(Math.sin(t), 3);
      var hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      var scale = power / 16;
      var jitter = 0.3;
      emitParticle(cx, cy,
        hx * scale + (Math.random() - 0.5) * jitter,
        hy * scale + (Math.random() - 0.5) * jitter,
        scheme);
    }
  }

  function burstStar(cx, cy, count, power, scheme) {
    var points = 5;
    for (var i = 0; i < count; i++) {
      var angle = (i / count) * Math.PI * 2;
      var armIndex = Math.floor((angle / (Math.PI * 2)) * points * 2);
      var isOuter = armIndex % 2 === 0;
      var radius = isOuter ? power : power * 0.4;
      var speed = radius * (0.8 + Math.random() * 0.4);
      emitParticle(cx, cy, Math.cos(angle) * speed, Math.sin(angle) * speed, scheme);
    }
  }

  function burstHorse(cx, cy, count, power, scheme) {
    if (!horseShapePoints) horseShapePoints = computeHorsePoints();
    var pts = horseShapePoints;
    var perPoint = Math.max(1, Math.floor(count / pts.length));
    for (var i = 0; i < pts.length; i++) {
      for (var j = 0; j < perPoint; j++) {
        var jitter = 0.15;
        emitParticle(cx, cy,
          pts[i].x * power + (Math.random() - 0.5) * jitter,
          pts[i].y * power + (Math.random() - 0.5) * jitter,
          scheme);
      }
    }
  }

  function emitParticle(x, y, vx, vy, scheme) {
    if (activeParticles.length >= MAX_PARTICLES) return;
    var p = getParticle();
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = 1.0;
    p.decay = 0.008 + Math.random() * 0.012;
    p.size = 1.5 + Math.random() * 2;
    p.color = Math.random() < 0.6 ? scheme.primary : scheme.secondary;
    p.trail = [];
    p.trailLen = 3 + Math.floor(Math.random() * 3);
    activeParticles.push(p);
  }

  // ---- Launch Firework ----

  function launchFirework(targetX, targetY) {
    if (activeFireworks.length >= MAX_FIREWORKS) return;

    var f = getFirework();
    f.x = targetX + (Math.random() - 0.5) * 60;
    f.y = H;
    f.vx = (targetX - f.x) * 0.015 + (Math.random() - 0.5) * 0.5;
    f.vy = -(3 + Math.random() * 2);
    f.targetY = targetY;
    f.exploded = false;
    f.trail = [];
    f.trailLen = 8;
    f.shape = BURST_SHAPES[Math.floor(Math.random() * BURST_SHAPES.length)];
    f.scheme = COLOR_SCHEMES[Math.floor(Math.random() * COLOR_SCHEMES.length)];
    f.particleCount = 100 + Math.floor(Math.random() * 100);
    f.power = 2.5 + Math.random() * 2;
    activeFireworks.push(f);

    lastInteraction = performance.now();
  }

  function explodeFirework(f) {
    f.exploded = true;

    switch (f.shape) {
      case 'sphere': burstSphere(f.x, f.y, f.particleCount, f.power, f.scheme); break;
      case 'ring':   burstRing(f.x, f.y, f.particleCount, f.power, f.scheme); break;
      case 'heart':  burstHeart(f.x, f.y, f.particleCount, f.power, f.scheme); break;
      case 'star':   burstStar(f.x, f.y, f.particleCount, f.power, f.scheme); break;
      case 'horse':  burstHorse(f.x, f.y, f.particleCount, f.power, f.scheme); break;
    }

    // Screen shake
    shakeIntensity = 4 + Math.random() * 4;

    // Flash
    flashAlpha = 0.15;

    // Smoke puff
    for (var i = 0; i < 5; i++) {
      if (activeSmoke.length >= MAX_SMOKE) break;
      var s = getSmoke();
      s.x = f.x + (Math.random() - 0.5) * 20;
      s.y = f.y + (Math.random() - 0.5) * 20;
      s.vx = (Math.random() - 0.5) * 0.3;
      s.vy = -0.2 - Math.random() * 0.3;
      s.size = 8 + Math.random() * 12;
      s.life = 1.0;
      s.decay = 0.005 + Math.random() * 0.005;
      activeSmoke.push(s);
    }
  }

  // ---- Auto Launch ----

  function scheduleAutoLaunch() {
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = setTimeout(function autoLaunchTick() {
      if (!running) return;
      var now = performance.now();
      if (now - lastInteraction > AUTO_LAUNCH_IDLE) {
        var x = W * 0.15 + Math.random() * W * 0.7;
        var y = H * 0.15 + Math.random() * H * 0.35;
        launchFirework(x, y);

        // Occasional grand finale
        if (!finaleActive && now - lastFinaleTime > FINALE_COOLDOWN && Math.random() < 0.08) {
          startFinale();
        }
      }
      var next = AUTO_LAUNCH_INTERVAL_MIN + Math.random() * (AUTO_LAUNCH_INTERVAL_MAX - AUTO_LAUNCH_INTERVAL_MIN);
      autoTimer = setTimeout(autoLaunchTick, next);
    }, AUTO_LAUNCH_INTERVAL_MIN);
  }

  // ---- Grand Finale ----

  function startFinale() {
    finaleActive = true;
    finaleStart = performance.now();
    lastFinaleTime = finaleStart;

    // Rapid burst of fireworks
    var count = 8 + Math.floor(Math.random() * 6);
    for (var i = 0; i < count; i++) {
      setTimeout(function() {
        if (!running) return;
        var x = W * 0.1 + Math.random() * W * 0.8;
        var y = H * 0.1 + Math.random() * H * 0.3;
        launchFirework(x, y);
      }, i * 200 + Math.random() * 150);
    }

    // Generate "2026" sparkler text particles
    generateSparklerText();
  }

  function generateSparklerText() {
    sparklerParticles.length = 0;
    var text = '2026';
    var fontSize = Math.min(W * 0.12, 80);
    var textW = fontSize * 2.4;
    var startX = (W - textW) / 2;
    var startY = H * 0.55;

    // Simple bitmap font for "2026"
    var glyphs = {
      '2': [
        [0,0,1,1,0],
        [1,0,0,0,1],
        [0,0,0,0,1],
        [0,0,0,1,0],
        [0,0,1,0,0],
        [0,1,0,0,0],
        [1,1,1,1,1]
      ],
      '0': [
        [0,1,1,1,0],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [0,1,1,1,0]
      ],
      '6': [
        [0,1,1,1,0],
        [1,0,0,0,0],
        [1,0,0,0,0],
        [1,1,1,1,0],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [0,1,1,1,0]
      ]
    };

    var cellW = fontSize * 0.12;
    var cellH = fontSize * 0.14;
    var charSpacing = fontSize * 0.6;

    for (var ci = 0; ci < text.length; ci++) {
      var glyph = glyphs[text[ci]];
      if (!glyph) continue;
      var ox = startX + ci * charSpacing;
      for (var row = 0; row < glyph.length; row++) {
        for (var col = 0; col < glyph[row].length; col++) {
          if (glyph[row][col]) {
            sparklerParticles.push({
              x: ox + col * cellW,
              y: startY + row * cellH,
              life: 1.0,
              flicker: Math.random() * 6.28,
              size: 1.5 + Math.random() * 1.5
            });
          }
        }
      }
    }
  }

  // ---- Event Handlers ----

  function onMouseDown(e) {
    if (!running) return;
    e.preventDefault();
    var rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (W / rect.width);
    mouseY = (e.clientY - rect.top) * (H / rect.height);
    mouseDown = true;
    holdStart = performance.now();
    lastInteraction = performance.now();

    launchFirework(mouseX, mouseY);

    romanCandleTimer = setInterval(function() {
      if (!mouseDown || !running) {
        clearInterval(romanCandleTimer);
        romanCandleTimer = null;
        return;
      }
      if (performance.now() - holdStart > ROMAN_CANDLE_HOLD_MS) {
        launchFirework(
          mouseX + (Math.random() - 0.5) * 30,
          mouseY + (Math.random() - 0.5) * 20
        );
      }
    }, ROMAN_CANDLE_INTERVAL);
  }

  function onMouseMove(e) {
    if (!running) return;
    var rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (W / rect.width);
    mouseY = (e.clientY - rect.top) * (H / rect.height);
  }

  function onMouseUp() {
    mouseDown = false;
    if (romanCandleTimer) {
      clearInterval(romanCandleTimer);
      romanCandleTimer = null;
    }
  }

  function onTouchStart(e) {
    if (!running) return;
    var rect = canvas.getBoundingClientRect();
    var touch = e.touches[0];
    mouseX = (touch.clientX - rect.left) * (W / rect.width);
    mouseY = (touch.clientY - rect.top) * (H / rect.height);
    mouseDown = true;
    holdStart = performance.now();
    lastInteraction = performance.now();

    launchFirework(mouseX, mouseY);

    romanCandleTimer = setInterval(function() {
      if (!mouseDown || !running) {
        clearInterval(romanCandleTimer);
        romanCandleTimer = null;
        return;
      }
      if (performance.now() - holdStart > ROMAN_CANDLE_HOLD_MS) {
        launchFirework(
          mouseX + (Math.random() - 0.5) * 30,
          mouseY + (Math.random() - 0.5) * 20
        );
      }
    }, ROMAN_CANDLE_INTERVAL);
  }

  function onTouchMove(e) {
    if (!running) return;
    var rect = canvas.getBoundingClientRect();
    var touch = e.touches[0];
    mouseX = (touch.clientX - rect.left) * (W / rect.width);
    mouseY = (touch.clientY - rect.top) * (H / rect.height);
  }

  function onTouchEnd() {
    mouseDown = false;
    if (romanCandleTimer) {
      clearInterval(romanCandleTimer);
      romanCandleTimer = null;
    }
  }

  // ---- Rendering ----

  function drawSky(t) {
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a0a2e');
    grad.addColorStop(0.5, '#0f1040');
    grad.addColorStop(0.85, '#151555');
    grad.addColorStop(1, '#1a1a60');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function drawStars(t) {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(s.twinkle + t * s.speed));
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = '#FFFFF0';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawSkyline(t) {
    var skylineY = H * (1 - SKYLINE_RATIO);

    // Buildings as dark silhouettes
    ctx.fillStyle = '#0a0a12';
    for (var i = 0; i < buildings.length; i++) {
      var b = buildings[i];
      ctx.fillRect(b.x, b.y, b.w, b.h + (H - b.y));
    }

    // Ground
    ctx.fillStyle = '#080810';
    ctx.fillRect(0, skylineY + H * SKYLINE_RATIO * 0.7, W, H);

    // Lit windows
    for (var wi = 0; wi < windows.length; wi++) {
      var win = windows[wi];
      if (!win.on) continue;
      var flicker = 0.6 + 0.4 * Math.sin(win.flicker + t * 1.5);
      var alpha = win.brightness * flicker;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'hsl(' + win.hue + ', 80%, 70%)';
      ctx.fillRect(win.x, win.y, win.w, win.h);
    }
    ctx.globalAlpha = 1;

    // Paper lanterns
    for (var li = 0; li < lanterns.length; li++) {
      var la = lanterns[li];
      var sway = Math.sin(la.phase + t * la.speed) * 3;
      var glow = 0.5 + 0.5 * Math.sin(la.phase + t * 0.8);
      var lx = la.x + sway;
      var ly = la.y;

      // Lantern glow
      ctx.globalAlpha = 0.3 * glow;
      var lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, la.size * 3);
      lg.addColorStop(0, la.hue === 0 ? '#CC0000' : '#FFD700');
      lg.addColorStop(1, 'transparent');
      ctx.fillStyle = lg;
      ctx.fillRect(lx - la.size * 3, ly - la.size * 3, la.size * 6, la.size * 6);

      // Lantern body
      ctx.globalAlpha = 0.8 + 0.2 * glow;
      ctx.fillStyle = la.hue === 0 ? '#CC0000' : '#FFD700';
      ctx.beginPath();
      ctx.ellipse(lx, ly, la.size * 0.6, la.size, 0, 0, Math.PI * 2);
      ctx.fill();

      // String
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(lx, ly - la.size);
      ctx.lineTo(lx - sway * 0.5, ly - la.size - 15);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawFireworkTrails() {
    for (var i = 0; i < activeFireworks.length; i++) {
      var f = activeFireworks[i];
      if (f.exploded) continue;

      // Trail
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (f.trail.length > 0) {
        ctx.moveTo(f.trail[0].x, f.trail[0].y);
        for (var ti = 1; ti < f.trail.length; ti++) {
          ctx.globalAlpha = ti / f.trail.length * 0.6;
          ctx.lineTo(f.trail[ti].x, f.trail[ti].y);
        }
        ctx.lineTo(f.x, f.y);
        ctx.stroke();
      }

      // Head glow
      ctx.globalAlpha = 1;
      var headGrad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 6);
      headGrad.addColorStop(0, '#FFFFFF');
      headGrad.addColorStop(0.5, '#FFD700');
      headGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = headGrad;
      ctx.fillRect(f.x - 6, f.y - 6, 12, 12);
    }
    ctx.globalAlpha = 1;
  }

  function drawParticles() {
    for (var i = 0; i < activeParticles.length; i++) {
      var p = activeParticles[i];
      var alpha = p.life * p.life;

      // Trail
      if (p.trail.length > 1) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 0.5;
        ctx.beginPath();
        ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (var ti = 1; ti < p.trail.length; ti++) {
          ctx.globalAlpha = alpha * (ti / p.trail.length) * 0.4;
          ctx.lineTo(p.trail[ti].x, p.trail[ti].y);
        }
        ctx.stroke();
      }

      // Particle dot
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawSmoke() {
    for (var i = 0; i < activeSmoke.length; i++) {
      var s = activeSmoke[i];
      ctx.globalAlpha = s.life * 0.15;
      ctx.fillStyle = '#888888';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFlash() {
    if (flashAlpha > 0.01) {
      ctx.globalAlpha = flashAlpha;
      ctx.fillStyle = '#FFFFF0';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  function drawSparklerText(t) {
    if (!finaleActive || sparklerParticles.length === 0) return;
    var elapsed = performance.now() - finaleStart;
    if (elapsed > FINALE_DURATION) {
      finaleActive = false;
      sparklerParticles.length = 0;
      return;
    }

    var fadeIn = Math.min(1, elapsed / 800);
    var fadeOut = elapsed > FINALE_DURATION - 1000 ? (FINALE_DURATION - elapsed) / 1000 : 1;
    var alpha = fadeIn * fadeOut;

    for (var i = 0; i < sparklerParticles.length; i++) {
      var sp = sparklerParticles[i];
      var flicker = 0.5 + 0.5 * Math.sin(sp.flicker + t * 8);
      ctx.globalAlpha = alpha * flicker;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size * (0.8 + flicker * 0.4), 0, Math.PI * 2);
      ctx.fill();

      // Spark glow
      ctx.globalAlpha = alpha * flicker * 0.3;
      var sg = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.size * 4);
      sg.addColorStop(0, '#FFD700');
      sg.addColorStop(1, 'transparent');
      ctx.fillStyle = sg;
      ctx.fillRect(sp.x - sp.size * 4, sp.y - sp.size * 4, sp.size * 8, sp.size * 8);
    }
    ctx.globalAlpha = 1;
  }

  // ---- Update ----

  function update(dt) {
    var t = performance.now() * 0.001;

    // Update fireworks
    for (var i = activeFireworks.length - 1; i >= 0; i--) {
      var f = activeFireworks[i];
      if (f.exploded) {
        activeFireworks.splice(i, 1);
        releaseFirework(f);
        continue;
      }

      // Store trail
      f.trail.push({ x: f.x, y: f.y });
      if (f.trail.length > f.trailLen) f.trail.shift();

      f.x += f.vx;
      f.y += f.vy;
      f.vy += GRAVITY * 0.3;

      // Smoke trail from ascending firework
      if (Math.random() < 0.3 && activeSmoke.length < MAX_SMOKE) {
        var s = getSmoke();
        s.x = f.x + (Math.random() - 0.5) * 4;
        s.y = f.y;
        s.vx = (Math.random() - 0.5) * 0.1;
        s.vy = 0.1;
        s.size = 3 + Math.random() * 3;
        s.life = 0.6;
        s.decay = 0.01;
        activeSmoke.push(s);
      }

      // Explode at target height or when slowing
      if (f.y <= f.targetY || f.vy >= 0) {
        explodeFirework(f);
      }
    }

    // Update particles
    for (var pi = activeParticles.length - 1; pi >= 0; pi--) {
      var p = activeParticles[pi];

      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > p.trailLen) p.trail.shift();

      p.x += p.vx;
      p.y += p.vy;
      p.vx *= DRAG;
      p.vy *= DRAG;
      p.vy += GRAVITY;
      p.life -= p.decay;

      if (p.life <= 0) {
        activeParticles.splice(pi, 1);
        releaseParticle(p);
      }
    }

    // Update smoke
    for (var si = activeSmoke.length - 1; si >= 0; si--) {
      var sm = activeSmoke[si];
      sm.x += sm.vx;
      sm.y += sm.vy;
      sm.vx *= SMOKE_DRAG;
      sm.vy *= SMOKE_DRAG;
      sm.size += 0.05;
      sm.life -= sm.decay;

      if (sm.life <= 0) {
        activeSmoke.splice(si, 1);
        releaseSmoke(sm);
      }
    }

    // Shake decay
    shakeIntensity *= SHAKE_DECAY;
    if (shakeIntensity < 0.1) shakeIntensity = 0;
    shakeX = (Math.random() - 0.5) * shakeIntensity * 2;
    shakeY = (Math.random() - 0.5) * shakeIntensity * 2;

    // Flash decay
    flashAlpha *= 0.92;

    // Window flickering
    if (Math.random() < 0.02) {
      var idx = Math.floor(Math.random() * windows.length);
      if (idx < windows.length) {
        windows[idx].on = !windows[idx].on;
      }
    }
  }

  // ---- Main Loop ----

  function frame(timestamp) {
    if (!running) return;

    var dt = Math.min(timestamp - lastTime, 33);
    lastTime = timestamp;

    update(dt);

    ctx.save();
    ctx.translate(shakeX, shakeY);

    var t = timestamp * 0.001;

    drawSky(t);
    drawStars(t);
    drawSkyline(t);
    drawSmoke();
    drawFireworkTrails();
    drawParticles();
    drawFlash();
    drawSparklerText(t);

    ctx.restore();

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
    generateSkyline();
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
    running = true;
    lastTime = performance.now();
    lastInteraction = performance.now();

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    scheduleAutoLaunch();
    rafId = requestAnimationFrame(frame);
  }

  function pause() {
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (autoTimer) {
      clearTimeout(autoTimer);
      autoTimer = null;
    }
    if (romanCandleTimer) {
      clearInterval(romanCandleTimer);
      romanCandleTimer = null;
    }
  }

  function resume() {
    if (running) return;
    running = true;
    lastTime = performance.now();
    lastInteraction = performance.now();
    scheduleAutoLaunch();
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

    activeParticles.length = 0;
    activeFireworks.length = 0;
    activeSmoke.length = 0;
    sparklerParticles.length = 0;
    particlePool.length = 0;
    fireworkPool.length = 0;
    smokePool.length = 0;
  }

  registerCard(6, {
    init: init,
    start: start,
    pause: pause,
    resume: resume,
    destroy: destroy
  });

})();
