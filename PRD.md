# Chinese New Year 2026 — Interactive Visual Art Gallery

## Product Requirements Document v1.0

**Date:** 2026-02-17 (Chinese New Year — Year of the Horse 🐴)
**Author:** Jon + Claude
**Target Runtime:** Claude Code → single deployable HTML/JS project
**Audience:** Personal project / shareable greeting

---

## 1. Overview

A single-page web application presenting 8 interactive visual art pieces celebrating Chinese New Year 2026 (Year of the Horse). Each piece explores a different generative art technique, ranging from mathematical to organic to traditional. The app uses horizontal scrolling to navigate between pieces, with each card filling the viewport.

---

## 2. Application Shell

### 2.1 Layout

- **Full viewport** per card (100vw × 100vh)
- **Horizontal scroll** navigation between cards
- Smooth snap scrolling (`scroll-snap-type: x mandatory`)
- Each card is a self-contained `<section>` with its own canvas or SVG root
- Bottom-center: minimal dot indicator showing current position (8 dots)
- Top-left: small card title + card number (e.g., "1/8 — Fourier Epicycles"), semi-transparent, fades after 3 seconds of inactivity
- Top-right: small info icon (ⓘ) — on hover/click shows a tooltip with a 1-2 sentence description of the technique

### 2.2 Navigation

- Scroll wheel (horizontal) or trackpad swipe
- Left/right arrow keys
- Click dot indicators to jump
- Touch swipe on mobile
- Each card's animation should **pause when off-screen** and **resume when scrolled into view** (IntersectionObserver)

### 2.3 Global Styling

- Background: `#0a0a0a` (near-black) — universal across all cards unless a card specifies otherwise
- Font: system sans-serif stack for UI, `Noto Serif SC` (Google Fonts) for any Chinese characters in UI
- UI chrome color: `rgba(255, 255, 255, 0.4)` — unobtrusive
- No visible scrollbar (hide with CSS)
- Responsive: cards should adapt to viewport but optimize for 1920×1080 desktop

### 2.4 Color Palette (shared constants)

```
CRIMSON:      #DC143C   — primary red
GOLD:         #FFD700   — primary gold
LANTERN_RED:  #CC0000   — deeper red
IVORY:        #FFFFF0   — off-white
INK_BLACK:    #1a1a1a   — rich black
JADE:         #00A86B   — accent green
WARM_GLOW:    #FF6B35   — warm accent
PAPER_RED:    #C41E3A   — traditional paper red
```

### 2.5 Technology Constraints

- **Single HTML file** with embedded CSS and JS (or a small bundled project — developer's choice)
- No build tools required (vanilla JS preferred, but lightweight libs acceptable)
- **Allowed libraries:**
  - `opentype.js` (CDN) — for font/glyph path extraction (Fourier card)
  - `three.js` (CDN) — ONLY if needed for the Strange Attractor card's 3D rendering
  - No other external dependencies — everything else is Canvas 2D, SVG, or raw WebGL
- Must include a Chinese font file OR use Google Fonts `Noto Sans SC` / `Noto Serif SC` for glyph extraction
- Target 60fps on mid-range hardware (be mindful of particle counts, use spatial hashing or quadtrees if needed)

---

## 3. Card Specifications

---

### Card 1: Fourier Epicycle Drawing

**Concept:** Rotating circles (epicycles) whose summed motion traces the outline of a horse silhouette, then the character 福. The mathematical beauty of Fourier decomposition made visible.

**Visual Reference:** 3Blue1Brown's Fourier series visualizations.

**Technical Approach:**

1. **Path Extraction:**
   - Load a Chinese font (Noto Sans SC or similar) via `opentype.js`
   - Extract glyph outline for 福 (U+798F) and 馬 (U+99AC, traditional horse character) — or use a clean horse silhouette SVG path
   - For the horse: use a single-contour silhouette (find or create one continuous outline)
   - For 福: extract individual contours (there will be ~10-15 separate sub-paths)

2. **Fourier Decomposition:**
   - Sample each contour at uniform intervals (500-1000 points per contour)
   - Treat sampled (x, y) as complex numbers: z = x + iy
   - Compute DFT to get frequency components (cn coefficients)
   - Sort by magnitude (largest first) for progressive detail rendering

3. **Rendering:**
   - Draw epicycles as translucent circles with thin stroke (`rgba(255, 215, 0, 0.3)`)
   - Each circle's center is the tip of the previous circle's radius arm
   - Radius arms drawn as thin gold lines
   - The final tip traces the output path in CRIMSON with a subtle glow (`shadowBlur`)
   - Trail persists with slow fade (store last ~2000 points, draw with decreasing opacity)

4. **Sequence:**
   - Start with horse silhouette (single continuous path, ~200 epicycles)
   - After completion, pause 2 seconds, fade out
   - Then draw 福 stroke-by-stroke (sequential contours, each with ~80-100 epicycles)
   - After 福 completes, pause 3 seconds, loop back to horse

5. **Interaction:**
   - Bottom slider or keyboard [1-9] to control number of visible epicycles (show progressive approximation)
   - Space bar: pause/resume
   - Speed control: subtle, maybe mouse Y-axis maps to speed (top = fast, bottom = slow)

6. **Visual Polish:**
   - Dark background with faint grid lines (like graph paper, very subtle)
   - Small frequency spectrum visualization in corner showing which harmonics are active
   - Current epicycle count displayed: "N = 247 circles"

---

### Card 2: Flow Field Particle Reveal

**Concept:** Thousands of particles drift through a Perlin noise flow field in beautiful, seemingly random streams. Over time, the flow field warps so particle density coalesces into a horse silhouette. Mouse disrupts the field; the image reforms when the cursor rests.

**Technical Approach:**

1. **Flow Field:**
   - 2D Perlin/Simplex noise field (compute on grid, interpolate for particles)
   - Grid resolution: ~50×50 cells covering viewport
   - Each cell stores a vector (angle derived from noise value)
   - Noise evolves over time (z-offset increments) for constant motion

2. **Target Shape:**
   - Horse silhouette stored as a binary mask (canvas offscreen render of the shape, then read pixel data)
   - Flow field has two modes blended by a lerp factor `t`:
     - `t = 0`: pure noise field (random beautiful flow)
     - `t = 1`: convergence field — vectors point toward nearest "inside" pixel of the horse mask, with some noise perturbation to avoid perfectly static convergence
   - `t` ramps from 0 → 1 over ~8 seconds, holds for 5 seconds, then ramps back to 0, creating a breathing cycle

3. **Particles:**
   - Count: 15,000 – 25,000 (tune for performance)
   - Each particle: position (x, y), velocity, hue offset, lifetime
   - Drawn as 1-2px points with motion blur (draw line from prev position to current)
   - Color: particles inside the horse mask region → CRIMSON/GOLD gradient; outside → dim cool blue/white
   - Opacity: 0.3 – 0.7, slight variation per particle

4. **Mouse Interaction:**
   - Mouse position creates a radial repulsion force (radius ~150px)
   - Particles within radius are pushed away from cursor
   - This overrides the convergence field locally, creating a "parting" effect
   - On mouse exit or stillness (>1 second), repulsion fades and particles reconverge

5. **Visual Polish:**
   - Subtle vignette around edges
   - Particle color transitions smoothly as they cross the mask boundary
   - When converged, the horse shape should shimmer/breathe slightly (never fully static)
   - Faint text "2026" or "新年快乐" watermarked in the background in very dim opacity

---

### Card 3: Particle Text — Glitch Edition

**Concept:** The characters 新年快乐 (Happy New Year) rendered as particle systems that respond to mouse with explosive scatter, glitch effects, and chromatic aberration.

**Technical Approach:**

1. **Text Rasterization:**
   - Render 新年快乐 to an offscreen canvas in large font (Noto Sans SC, ~300px)
   - Sample pixel positions where text exists → particle target positions
   - ~8,000-12,000 particles total across all four characters

2. **Particle System:**
   - Each particle has: home position (on text), current position, velocity, color
   - At rest: particles sit at home positions with subtle jitter (Brownian motion, ±2px)
   - Colors: primarily CRIMSON and GOLD, with some white sparkle particles

3. **Mouse Interaction:**
   - Mouse proximity (radius ~120px) creates explosion force — particles blast away from cursor
   - Farther particles get pulled back to home positions via spring force (k = 0.02, damping = 0.85)
   - Fast mouse movement leaves a "wake" of scattered particles

4. **Glitch Effects (global, not per-particle):**
   - Periodic random glitch bursts (every 3-8 seconds, duration 100-300ms):
     - Horizontal slice displacement (random horizontal bands shift left/right)
     - RGB channel separation (draw scene 3x with offset: R shifted left, B shifted right)
     - Brief static noise overlay (random white pixels at low opacity)
     - Scan line flicker
   - Mouse click triggers an intense glitch burst
   - Chromatic aberration intensity scales with mouse velocity

5. **Visual Polish:**
   - CRT monitor curvature effect (subtle barrel distortion via CSS or shader)
   - Faint horizontal scan lines (repeating 2px transparent/1px dark overlay)
   - VHS tracking artifacts on glitch bursts
   - Bottom of screen: "新年快乐 // HAPPY NEW YEAR 2026" in monospace, flickering

---

### Card 4: Ink Wash (水墨) Generative Horse

**Concept:** A horse materializes stroke by stroke in traditional Chinese ink wash painting style, procedurally generated on canvas. Organic, meditative, and visually distinct from the technical pieces.

**Technical Approach:**

1. **Brush Stroke Simulation:**
   - Each stroke is a sequence of stamp points along a Bezier curve
   - Each stamp: circular with Perlin noise-modulated radius and opacity
   - Opacity decreases toward stroke edges (pressure simulation)
   - Multiple overlapping semi-transparent stamps create ink pooling effect
   - Slight randomized offset perpendicular to stroke direction (hand tremor)

2. **Ink Diffusion:**
   - After each stroke is laid down, simulate wet ink spreading:
     - Gaussian blur pass on the stroke area (radius 2-4px)
     - Random "bleed" tendrils at stroke edges (random walk particles that deposit fading pigment)
   - Creates the characteristic watercolor/ink boundary effect

3. **Horse Composition:**
   - Pre-define 15-25 stroke paths (Bezier curves) that together form a horse in brushwork style
   - NOT photorealistic — loose, expressive, suggestive (like Xu Beihong's horse paintings)
   - Strokes ordered by traditional painting convention: body outline first, then mane/tail, then legs, then details
   - Each stroke takes 1-2 seconds to animate (stamp points appear sequentially)

4. **Color Palette:**
   - Primary: ink black with varying opacity (0.1 for wash, 0.8 for concentrated strokes)
   - Background: warm rice paper texture (IVORY with subtle noise)
   - Accent: a single vermillion (CRIMSON) seal/chop stamp that appears after painting completes
   - Minimal gold accents on mane highlights

5. **Interaction:**
   - Replay button (subtle) to watch the painting process again
   - Optional: mouse click adds a random ink splatter at click position (playful)

6. **Visual Polish:**
   - Rice paper texture as background (procedural: low-frequency noise + fine grain)
   - Seal stamp (印章) appears bottom-right after completion: red square with 福 inside
   - Painting fades in from blank over ~30 seconds total
   - After completion, very subtle ambient motion: ink bleed continues slowly at edges

---

### Card 5: 剪纸 Paper Cut Parallax

**Concept:** Traditional Chinese paper cutting art (剪纸) with layered red paper silhouettes creating a 3D parallax effect on mouse movement. A horse centerpiece surrounded by traditional motifs.

**Technical Approach:**

1. **Layer Structure (back to front):**
   - Layer 0 (deepest): Warm golden gradient background (backlight glow)
   - Layer 1: Large circular frame with intricate border pattern (traditional lattice/cloud motifs)
   - Layer 2: Background elements — mountains, clouds, simplified pagoda silhouettes
   - Layer 3: Horse centerpiece — galloping horse with flowing mane, decorative swirls
   - Layer 4: Foreground elements — cherry blossoms, floating lanterns, firecrackers
   - Layer 5 (nearest): Border frame with "2026 新年快乐" text cutouts

2. **SVG Construction:**
   - Each layer is an SVG group (`<g>`) with intricate path definitions
   - All silhouettes in PAPER_RED (#C41E3A) or darker red variants
   - Negative space (cutouts) reveal the golden backlight
   - Use `<filter>` for subtle drop shadows between layers to enhance depth

3. **Parallax Effect:**
   - Mouse position mapped to layer offsets:
     - Layer 1: ±5px shift
     - Layer 2: ±12px shift
     - Layer 3: ±20px shift
     - Layer 4: ±30px shift
     - Layer 5: ±40px shift
   - Smooth interpolation (lerp with 0.05 factor per frame) to avoid jitter
   - Also slight rotation (±1-2 degrees per layer) for enhanced depth perception

4. **Visual Polish:**
   - Golden light source "behind" the paper: radial gradient, warm glow pulses slowly
   - Paper texture overlay on red layers (subtle fiber pattern via SVG `<feTurbulence>`)
   - Occasional sparkle particles floating between layers (gold dust in the backlight)
   - Borders have traditional symmetrical patterns — reference real 剪纸 motifs

5. **Interaction:**
   - Mouse controls parallax
   - Click toggles backlight color between warm gold, cool moonlight white, and festive red
   - Subtle idle animation: clouds drift slowly, lanterns sway

---

### Card 6: Generative Fireworks

**Concept:** Interactive firework display over a city skyline silhouette. Click to launch, fireworks burst into festive shapes. The most purely "greeting card" piece.

**Technical Approach:**

1. **Skyline:**
   - Bottom 15-20% of viewport: city skyline silhouette (procedurally generated or pre-defined path)
   - Silhouette in INK_BLACK, with scattered lit windows (small yellow/warm rectangles, some blink)
   - Paper lantern strings between buildings (small red/gold dots connected by catenary curves)

2. **Firework Physics:**
   - **Launch phase:** single bright particle rises from click position (or random point on skyline for auto-launch)
   - Trail: 3-5 fading afterimage points
   - Ascent speed: fast, slight deceleration
   - **Burst phase** (at apex):
     - 100-200 particles per burst
     - Burst shapes: sphere (random uniform), ring, heart, horse silhouette (special rare burst), star
     - Each particle: position, velocity (directed outward from center), gravity pull, color, lifetime
     - Velocity varies slightly per particle for organic look
     - Colors: each burst is 1-2 colors (CRIMSON + GOLD, GOLD + white, CRIMSON + JADE, etc.)
   - **Decay phase:**
     - Particles decelerate via drag, pulled down by gravity
     - Opacity fades with lifetime
     - Optional: secondary "crackle" micro-bursts from some particles near end of life

3. **Auto-Launch:**
   - When idle (no clicks for 3 seconds), auto-launch 1-2 fireworks every 2-4 seconds from random skyline positions
   - Occasional grand finale: rapid burst of 5-8 simultaneous fireworks

4. **Interaction:**
   - Click anywhere above skyline to launch firework from the bottom at that X, targeting click Y for burst altitude
   - Rapid clicking = rapid launching (satisfying)
   - Mouse held down = Roman candle effect (continuous stream of small bursts)

5. **Visual Polish:**
   - Sky: deep navy gradient, subtle star field (tiny white dots, some twinkle)
   - Firework light illuminates skyline briefly (additive blending glow on burst)
   - Smoke trails: faint gray particles that linger and drift
   - Ambient: distant soft "boom" implied by screen shake (subtle, 1-2px canvas transform for 100ms on burst)
   - Text "2026" appears briefly in sparkler-style writing in the sky during grand finale

---

### Card 7: Reaction-Diffusion Morphogenesis

**Concept:** A Gray-Scott reaction-diffusion simulation produces mesmerizing organic Turing patterns that evolve over time. The initial chemical seed is shaped like a horse, so the pattern boundaries form the horse silhouette as the simulation stabilizes.

**Technical Approach:**

1. **Gray-Scott Model:**
   - Two chemicals, A and B, on a 2D grid
   - Update equations (per timestep):
     ```
     A' = A + (dA * ∇²A - A*B² + f*(1-A)) * dt
     B' = B + (dB * ∇²B + A*B² - (k+f)*B) * dt
     ```
   - Parameters (tuned for interesting patterns):
     - `dA = 1.0`, `dB = 0.5` (diffusion rates)
     - `f = 0.055`, `k = 0.062` (feed/kill rates — coral/maze patterns)
     - `dt = 1.0`
   - Grid resolution: 256×256 or 512×512 (performance-dependent)
   - Laplacian (∇²) computed via convolution with standard kernel

2. **Horse Seeding:**
   - Initialize grid: A = 1.0 everywhere, B = 0.0 everywhere
   - Render horse silhouette to offscreen canvas at grid resolution
   - Where horse mask is present: set B = 1.0 (with slight noise perturbation ±0.05)
   - Also scatter a few random B seeds outside the horse for ambient pattern growth

3. **Rendering:**
   - Map chemical B concentration to color:
     - B ≈ 0: INK_BLACK
     - B ≈ 0.1-0.3: deep CRIMSON
     - B ≈ 0.3-0.5: GOLD
     - B ≈ 0.5+: bright IVORY
   - Render grid to canvas via `ImageData` pixel manipulation
   - Run multiple simulation steps per frame (10-20) for visible evolution speed

4. **Performance:**
   - Consider WebGL fragment shader for the simulation (massively parallel per-pixel)
   - If CPU-only: use typed arrays (Float32Array), avoid GC pressure
   - 512×512 grid at 10 steps/frame should be feasible on modern hardware

5. **Interaction:**
   - Mouse click drops a blob of chemical B at cursor position (radius ~10 grid cells)
   - Mouse drag paints a trail of B chemical
   - Keyboard 'R' to reset simulation with fresh horse seed
   - Subtle parameter controls: mouse X maps to feed rate `f`, mouse Y maps to kill rate `k` — allows exploring different pattern regimes live

6. **Visual Polish:**
   - Simulation runs continuously — patterns keep evolving, never truly static
   - Horse shape is recognizable early but dissolves into organic patterns over minutes
   - Subtle pulsing glow on high-B regions
   - Corner text: "Gray-Scott Reaction-Diffusion | f=0.055 k=0.062"

---

### Card 8: Strange Attractor Calligraphy

**Concept:** A 3D strange attractor (Lorenz system) traced as a continuous golden thread in space. Camera angle is chosen so the orbit density shadows form calligraphic shapes. Slowly rotating. Mesmerizing mathematical screensaver.

**Technical Approach:**

1. **Attractor Computation:**
   - Lorenz system:
     ```
     dx/dt = σ(y - x)        [σ = 10]
     dy/dt = x(ρ - z) - y    [ρ = 28]
     dz/dt = xy - βz          [β = 8/3]
     ```
   - Integrate via RK4 (4th-order Runge-Kutta) for accuracy
   - Pre-compute a long trajectory: 100,000+ points with small dt (0.005)
   - Store as Float32Array of [x, y, z] triples

2. **Rendering Option A — Canvas 2D (simpler):**
   - Project 3D points to 2D via simple perspective projection
   - Apply slow rotation (rotate point cloud around Y axis over time)
   - Draw as connected line segments with:
     - Color mapped to Z-depth (deep blue → gold → white)
     - Opacity mapped to age (newer points more opaque)
     - Line width: 1px with glow
   - Render incrementally: draw ~500 new points per frame, fade old points slowly

3. **Rendering Option B — Three.js (richer, preferred if budget allows):**
   - `THREE.BufferGeometry` with `THREE.Line` or `THREE.Points`
   - Custom shader: color by position, glow by proximity to camera
   - Orbit controls for user camera manipulation (or auto-rotate)
   - Depth fog for atmospheric perspective

4. **Visual Design:**
   - Background: pure black (#000000)
   - Attractor trace: thin line, color gradient along trajectory:
     - Start: dim CRIMSON
     - Middle: bright GOLD
     - End (most recent): white with bloom
   - Draw speed: moderate — watching it trace is part of the appeal
   - After full trace completes: hold, slowly rotate, then fade and re-trace

5. **Interaction:**
   - Mouse drag: rotate camera/viewpoint
   - Scroll: zoom in/out
   - Click: randomize initial conditions (different starting point → same attractor shape but different path)
   - Key 'L': switch between Lorenz, Rössler (`a=0.2, b=0.2, c=5.7`), and Chen attractors

6. **Visual Polish:**
   - Subtle star field background (tiny static dots)
   - Bloom/glow effect on the bright sections (can fake with `shadowBlur` in Canvas 2D)
   - Parameter values displayed in corner: "Lorenz Attractor | σ=10 ρ=28 β=2.667"
   - Trail maintains last ~50,000 points visible at any time, oldest fade out

---

## 4. Architecture Guidance

### 4.1 Project Structure (suggestion for Claude Code)

```
cny2026/
├── index.html              — shell, navigation, scroll snap container
├── style.css               — global styles, card layout, UI chrome
├── js/
│   ├── main.js             — scroll management, IntersectionObserver, nav
│   ├── utils.js            — shared math (noise, lerp, DFT, projection)
│   ├── card-fourier.js     — Card 1
│   ├── card-flowfield.js   — Card 2
│   ├── card-particles.js   — Card 3
│   ├── card-inkwash.js     — Card 4
│   ├── card-papercut.js    — Card 5
│   ├── card-fireworks.js   — Card 6
│   ├── card-reaction.js    — Card 7
│   └── card-attractor.js   — Card 8
├── assets/
│   ├── horse-silhouette.svg    — clean single-contour horse outline
│   └── NotoSansSC-Regular.otf  — font for glyph extraction (or use CDN)
└── README.md
```

Alternatively, a single HTML file is acceptable if the developer prefers — just keep code organized with clear section comments.

### 4.2 Shared Utilities (`utils.js`)

Functions that multiple cards will need:

```javascript
// Perlin/Simplex noise (2D/3D)
noise2D(x, y)
noise3D(x, y, z)

// Linear interpolation
lerp(a, b, t)

// Map value from one range to another
mapRange(value, inMin, inMax, outMin, outMax)

// Discrete Fourier Transform
// Input: array of {x, y} points
// Output: array of {freq, amp, phase} sorted by amplitude
computeDFT(points)

// 3D → 2D perspective projection
project3D(x, y, z, cameraZ, focalLength)

// Load image as binary mask at given resolution
async loadShapeMask(imageSrc, width, height) → Uint8Array

// Font glyph path extraction (wraps opentype.js)
async extractGlyphContours(fontUrl, character, samplePoints) → Array<Array<{x, y}>>

// HSL to RGB conversion
hslToRgb(h, s, l) → {r, g, b}

// Smooth mouse tracker (lerped)
class SmoothMouse { update(rawX, rawY); get x(); get y(); }
```

### 4.3 Performance Patterns

- **Use `requestAnimationFrame`** for all animation loops
- **IntersectionObserver** to pause/resume cards not in view
- **Object pooling** for particles (pre-allocate typed arrays, never create/destroy particle objects)
- **Double buffering** where needed (offscreen canvas for compositing)
- **Spatial hashing** if any card needs neighbor queries (flow field, reaction-diffusion)
- Avoid `getImageData`/`putImageData` per frame if possible — prefer drawing primitives
- For reaction-diffusion: strongly consider WebGL compute (ping-pong framebuffers)

### 4.4 Responsive Behavior

- Cards should fill viewport at any reasonable desktop resolution (1280×720 minimum, optimize for 1920×1080)
- Canvas elements resize on window resize (debounced, re-initialize if needed)
- Mobile: touch events mapped to mouse events; reduce particle counts by 50%
- No hard breakpoints — fluid scaling

---

## 5. Content & Copy

### 5.1 Card Titles (displayed in top-left)

1. "Fourier Epicycles"
2. "Flow Field"
3. "Particle Glitch"
4. "水墨 Ink Wash"
5. "剪纸 Paper Cut"
6. "Fireworks"
7. "Morphogenesis"
8. "Strange Attractor"

### 5.2 Card Descriptions (info tooltip)

1. "Rotating circles trace a horse and 福 character through Fourier decomposition — every curve is a sum of circles."
2. "Particles follow a noise field that slowly warps to reveal a hidden horse. Move your mouse to disrupt the flow."
3. "新年快乐 built from thousands of particles. Move to scatter, click to glitch."
4. "A horse painted stroke by stroke in procedural ink wash. Click to splatter."
5. "Traditional paper cutting art with layered parallax depth. Move to explore."
6. "Click to launch fireworks over the city. Hold for a roman candle."
7. "Gray-Scott reaction-diffusion simulation seeded in the shape of a horse. Click to add chemical."
8. "The Lorenz attractor traced as a golden thread in space. Drag to rotate."

### 5.3 Landing / Intro

When the page first loads, before the first card, display a brief title card (0.5 seconds auto-fade or click to dismiss):

```
新年快乐
Happy New Year 2026
Year of the Horse

← scroll →
```

Styled minimally: centered, GOLD text on black, elegant serif font, fades to reveal Card 1.

---

## 6. Polish Checklist

Before considering the project complete, verify:

- [ ] All 8 cards render and animate correctly
- [ ] Scroll snapping works smoothly between all cards
- [ ] Cards pause when not visible (no wasted CPU)
- [ ] Mouse interactions feel responsive (<16ms input latency)
- [ ] No console errors
- [ ] Dot navigation works
- [ ] Arrow key navigation works
- [ ] Info tooltips display correctly
- [ ] Page loads in under 3 seconds on broadband
- [ ] No memory leaks over 10+ minutes of idle animation (check growing array/object allocations)
- [ ] At least 30fps sustained on each card (target 60fps)
- [ ] Chinese characters render correctly (font loaded)
- [ ] Works in Chrome and Firefox (Safari nice-to-have)

---

## 7. Implementation Priority

If time/complexity forces cuts, prioritize in this order:

1. **Card 6: Fireworks** — easiest win, most universally appealing, most "greeting card"
2. **Card 3: Particle Glitch** — strong visual impact, moderate complexity
3. **Card 2: Flow Field** — the "wow" piece, worth the effort
4. **Card 5: Paper Cut** — unique aesthetic, SVG work is deterministic
5. **Card 1: Fourier** — impressive but font extraction adds complexity
6. **Card 4: Ink Wash** — beautiful but brush sim tuning takes iteration
7. **Card 8: Strange Attractor** — straightforward math, mainly needs visual polish
8. **Card 7: Reaction-Diffusion** — computationally intensive, may need WebGL

---

## 8. Open Questions / Decisions for Implementation

1. **Single HTML file vs. multi-file project?** — PRD supports both; developer's choice based on maintainability preference.
2. **Horse silhouette source** — should we provide an SVG path, or have Claude Code generate/find one? A clean single-contour silhouette is critical for Cards 1, 2, 4, and 7.
3. **Font hosting** — CDN (Google Fonts) vs. bundled OTF? CDN is simpler but requires network. Bundled is offline-capable.
4. **Three.js for Card 8?** — Canvas 2D with manual projection is lighter weight but less interactive. Three.js adds ~500KB but gives orbit controls and proper 3D.
5. **WebGL for Card 7?** — CPU simulation at 256×256 should be fine; 512×512 may need WebGL. Start with CPU, escalate if needed.

---

*End of PRD v1.0*
