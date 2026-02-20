/* ============================================
   CNY 2026 — Shared Utilities
   ============================================ */

// ---- Color Palette ----

const COLORS = {
  CRIMSON: '#DC143C',
  GOLD: '#FFD700',
  LANTERN_RED: '#CC0000',
  IVORY: '#FFFFF0',
  INK_BLACK: '#1a1a1a',
  JADE: '#00A86B',
  WARM_GLOW: '#FF6B35',
  PAPER_RED: '#C41E3A'
};

// ---- Linear Interpolation ----

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// ---- Map Range ----

function mapRange(value, inMin, inMax, outMin, outMax) {
  return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
}

// ---- Simplex Noise ----
// Based on Stefan Gustavson's simplex noise implementation

const _noiseP = new Uint8Array(512);
const _noiseGrad3 = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
];

(function _initNoise() {
  const perm = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,
    140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,
    0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,
    174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,
    158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,
    244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,
    169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,
    217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,
    227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,
    163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,
    113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,
    144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,
    181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,
    205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
  for (let i = 0; i < 256; i++) {
    _noiseP[i] = perm[i];
    _noiseP[i + 256] = perm[i];
  }
})();

function _dot3(g, x, y, z) {
  return g[0] * x + g[1] * y + g[2] * z;
}

function _dot2(g, x, y) {
  return g[0] * x + g[1] * y;
}

function noise2D(xin, yin) {
  const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
  const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

  const s = (xin + yin) * F2;
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);
  const t = (i + j) * G2;

  const X0 = i - t;
  const Y0 = j - t;
  const x0 = xin - X0;
  const y0 = yin - Y0;

  let i1, j1;
  if (x0 > y0) { i1 = 1; j1 = 0; }
  else { i1 = 0; j1 = 1; }

  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1.0 + 2.0 * G2;
  const y2 = y0 - 1.0 + 2.0 * G2;

  const ii = i & 255;
  const jj = j & 255;
  const gi0 = _noiseP[ii + _noiseP[jj]] % 12;
  const gi1 = _noiseP[ii + i1 + _noiseP[jj + j1]] % 12;
  const gi2 = _noiseP[ii + 1 + _noiseP[jj + 1]] % 12;

  let n0 = 0, n1 = 0, n2 = 0;

  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * _dot2(_noiseGrad3[gi0], x0, y0); }

  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * _dot2(_noiseGrad3[gi1], x1, y1); }

  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * _dot2(_noiseGrad3[gi2], x2, y2); }

  return 70.0 * (n0 + n1 + n2);
}

function noise3D(xin, yin, zin) {
  const F3 = 1.0 / 3.0;
  const G3 = 1.0 / 6.0;

  const s = (xin + yin + zin) * F3;
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);
  const k = Math.floor(zin + s);
  const t = (i + j + k) * G3;

  const X0 = i - t;
  const Y0 = j - t;
  const Z0 = k - t;
  const x0 = xin - X0;
  const y0 = yin - Y0;
  const z0 = zin - Z0;

  let i1, j1, k1, i2, j2, k2;
  if (x0 >= y0) {
    if (y0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; }
    else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; }
    else { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; }
  } else {
    if (y0 < z0) { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; }
    else if (x0 < z0) { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; }
    else { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; }
  }

  const x1 = x0 - i1 + G3;
  const y1 = y0 - j1 + G3;
  const z1 = z0 - k1 + G3;
  const x2 = x0 - i2 + 2.0 * G3;
  const y2 = y0 - j2 + 2.0 * G3;
  const z2 = z0 - k2 + 2.0 * G3;
  const x3 = x0 - 1.0 + 3.0 * G3;
  const y3 = y0 - 1.0 + 3.0 * G3;
  const z3 = z0 - 1.0 + 3.0 * G3;

  const ii = i & 255;
  const jj = j & 255;
  const kk = k & 255;
  const gi0 = _noiseP[ii + _noiseP[jj + _noiseP[kk]]] % 12;
  const gi1 = _noiseP[ii + i1 + _noiseP[jj + j1 + _noiseP[kk + k1]]] % 12;
  const gi2 = _noiseP[ii + i2 + _noiseP[jj + j2 + _noiseP[kk + k2]]] % 12;
  const gi3 = _noiseP[ii + 1 + _noiseP[jj + 1 + _noiseP[kk + 1]]] % 12;

  let n0 = 0, n1 = 0, n2 = 0, n3 = 0;

  let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
  if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * _dot3(_noiseGrad3[gi0], x0, y0, z0); }

  let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
  if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * _dot3(_noiseGrad3[gi1], x1, y1, z1); }

  let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
  if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * _dot3(_noiseGrad3[gi2], x2, y2, z2); }

  let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
  if (t3 >= 0) { t3 *= t3; n3 = t3 * t3 * _dot3(_noiseGrad3[gi3], x3, y3, z3); }

  return 32.0 * (n0 + n1 + n2 + n3);
}

// ---- Discrete Fourier Transform ----

function computeDFT(points) {
  const N = points.length;
  const result = [];

  for (let k = 0; k < N; k++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      re += points[n].x * Math.cos(angle) + points[n].y * Math.sin(angle);
      im += points[n].y * Math.cos(angle) - points[n].x * Math.sin(angle);
    }
    re /= N;
    im /= N;

    result.push({
      freq: k,
      amp: Math.sqrt(re * re + im * im),
      phase: Math.atan2(im, re)
    });
  }

  result.sort((a, b) => b.amp - a.amp);
  return result;
}

// ---- 3D Perspective Projection ----

function project3D(x, y, z, cameraZ, focalLength) {
  const scale = focalLength / (cameraZ + z);
  return {
    x: x * scale,
    y: y * scale,
    scale: scale
  };
}

// ---- Load Shape Mask ----

async function loadShapeMask(imageSrc, width, height) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const mask = new Uint8Array(width * height);
      for (let i = 0; i < mask.length; i++) {
        const r = imageData.data[i * 4];
        const g = imageData.data[i * 4 + 1];
        const b = imageData.data[i * 4 + 2];
        const a = imageData.data[i * 4 + 3];
        mask[i] = (a > 128 && (r + g + b) / 3 < 200) ? 1 : 0;
      }
      resolve(mask);
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
}

// ---- HSL to RGB ----

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r, g, b;
  if (h < 60)       { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

// ---- Smooth Mouse Tracker ----

class SmoothMouse {
  constructor(smoothing = 0.05) {
    this._x = 0;
    this._y = 0;
    this._targetX = 0;
    this._targetY = 0;
    this._smoothing = smoothing;
  }

  update(rawX, rawY) {
    this._targetX = rawX;
    this._targetY = rawY;
    this._x = lerp(this._x, this._targetX, this._smoothing);
    this._y = lerp(this._y, this._targetY, this._smoothing);
  }

  get x() { return this._x; }
  get y() { return this._y; }
}

// ---- 福 (Fú / Fortune) Glyph SVG Path ----
// Extracted from Noto Serif SC Bold at size 400

var FU_SVG_PATH = 'M206.4,-128.4L206.4,21.2Q206.4,23.2,201.2,26.6Q196.0,30.0,187.8,32.6Q179.6,35.2,170.4,35.2L170.4,35.2L164.0,35.2L164.0,-140.0L164.0,-158.0L164.0,-158.0L208.8,-140.0L343.6,-140.0L343.6,-128.4L206.4,-128.4ZM226.4,-247.2L226.4,-174.4Q226.4,-172.8,220.8,-169.6Q215.2,-166.4,206.8,-164.0Q198.4,-161.6,189.6,-161.6L189.6,-161.6L183.6,-161.6L183.6,-258.4L183.6,-276.0L183.6,-276.0L228.0,-258.4L326.8,-258.4L326.8,-247.2L226.4,-247.2ZM248.4,-139.2L286.4,-139.2L286.4,2.8L248.4,2.8L248.4,-139.2ZM318.8,-306.8L343.2,-338.4Q343.2,-338.4,347.6,-335.0Q352.0,-331.6,359.0,-326.0Q366.0,-320.4,373.6,-314.0Q381.2,-307.6,387.6,-302.0L387.6,-302.0Q386.0,-295.6,376.4,-295.6L376.4,-295.6L161.6,-295.6L158.4,-306.8L318.8,-306.8ZM309.6,-258.4L305.6,-258.4L326.4,-281.2L370.8,-248.0Q369.2,-245.6,364.8,-243.2Q360.4,-240.8,354.4,-239.6L354.4,-239.6L354.4,-177.2Q354.4,-176.0,348.0,-173.6Q341.6,-171.2,333.0,-169.2Q324.4,-167.2,317.2,-167.2L317.2,-167.2L309.6,-167.2L309.6,-258.4ZM210.8,-193.2L328.8,-193.2L328.8,-181.6L210.8,-181.6L210.8,-193.2ZM326.8,-140.0L322.4,-140.0L343.6,-162.8L387.2,-129.2Q385.6,-126.8,381.2,-124.6Q376.8,-122.4,370.8,-121.2L370.8,-121.2L370.8,21.2Q370.8,22.4,364.4,25.2Q358.0,28.0,349.6,30.2Q341.2,32.4,334.0,32.4L334.0,32.4L326.8,32.4L326.8,-140.0ZM196.0,-3.6L352.4,-3.6L352.4,7.6L196.0,7.6L196.0,-3.6ZM196.0,-74.0L352.4,-74.0L352.4,-62.4L196.0,-62.4L196.0,-74.0ZM52.4,-337.6L55.6,-339.6Q82.0,-334.8,96.4,-326.2Q110.8,-317.6,116.2,-307.8Q121.6,-298.0,119.8,-289.2Q118.0,-280.4,111.2,-275.0Q104.4,-269.6,95.0,-269.6Q85.6,-269.6,76.0,-278.0L76.0,-278.0Q74.8,-288.4,71.2,-299.2Q67.6,-310.0,62.8,-320.0Q58.0,-330.0,52.4,-337.6L52.4,-337.6ZM109.6,-178.8L109.6,20.0Q109.6,21.6,105.0,25.0Q100.4,28.4,92.4,31.4Q84.4,34.4,73.2,34.4L73.2,34.4L65.6,34.4L65.6,-142.0L109.6,-178.8ZM101.6,-165.6L106.0,-167.6Q131.6,-158.0,144.2,-146.0Q156.8,-134.0,159.2,-122.8Q161.6,-111.6,157.2,-104.0Q152.8,-96.4,144.4,-95.0Q136.0,-93.6,127.2,-101.6L127.2,-101.6Q126.0,-112.4,122.0,-123.8Q118.0,-135.2,112.4,-146.2Q106.8,-157.2,101.6,-165.6L101.6,-165.6ZM110.0,-253.6L105.2,-253.6L130.4,-277.6L171.6,-238.0Q168.8,-235.2,164.8,-234.2Q160.8,-233.2,153.6,-232.4L153.6,-232.4Q140.4,-204.8,118.4,-176.8Q96.4,-148.8,68.6,-124.2Q40.8,-99.6,9.6,-82.4L9.6,-82.4L6.0,-86.0Q24.0,-102.8,40.4,-123.6Q56.8,-144.4,70.6,-166.6Q84.4,-188.8,94.6,-211.0Q104.8,-233.2,110.0,-253.6L110.0,-253.6ZM15.2,-253.6L136.0,-253.6L136.0,-242.0L18.8,-242.0L15.2,-253.6Z';

// ---- Horse Silhouette SVG Path ----

const HORSE_SVG_PATH ='M 180 300 C 175 280 170 260 172 240 C 174 220 180 210 185 195 C 190 180 188 165 182 150 C 178 140 170 132 168 120 C 166 108 170 96 178 88 C 186 80 196 78 206 80 C 216 82 224 88 228 96 C 232 104 232 112 236 118 C 240 124 248 128 258 128 C 268 128 278 124 288 118 C 298 112 306 104 316 100 C 326 96 338 96 348 100 C 358 104 364 112 368 122 C 372 132 372 142 370 152 C 368 162 364 170 358 180 C 352 190 344 198 340 210 C 336 222 336 234 338 248 C 340 262 344 274 346 288 C 348 302 348 316 344 328 C 340 340 332 348 322 350 C 312 352 302 348 296 342 C 290 336 288 328 288 318 C 288 308 290 298 288 290 C 286 282 280 278 274 276 C 268 274 260 274 252 278 C 244 282 238 288 232 296 C 226 304 222 314 218 322 C 214 330 210 338 204 344 C 198 350 190 352 180 350 C 170 348 164 340 162 330 C 160 320 162 310 168 302 C 174 294 180 292 180 300 Z';
