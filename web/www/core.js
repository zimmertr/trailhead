// The shared kernel of the pixel world: maths, the palette, index bitmaps and the screen.
// The whole frame is palette indices, like the SNES itself. Scenes draw indices into the frame,
// and only at the end does a lookup table turn indices into colours. That is what makes Dusk
// (a second palette), the glints on water (cycling four entries) and the 10-a-second wind cheap.

const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const frac = x => x - Math.floor(x);
const sq = x => x * x;

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function hash(x, y, s = 0) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s = 0, o = 4) {
  let t = 0, amp = 0.5, f = 1, n = 0;
  for (let i = 0; i < o; i++) { t += amp * vnoise(x * f, y * f, s + i * 17); n += amp; f *= 2; amp *= 0.5; }
  return t / n;
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

// ---------------------------------------------------------------------------------------------
// Palette. Every ramp runs dark to light. Dusk is a second colour for every entry.

const DAY = [[0, 0, 0]], DUSK = [[0, 0, 0]], R = {}, RAMP_OF = [null], STEP_OF = [0];
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function duskOf([r, g, b]) {
  const l = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
  return [clamp(r * 0.6 + 40 * l + 8, 0, 255), clamp(g * 0.46 + 14 * l, 0, 255), clamp(b * 0.66 + 44 * l + 30, 0, 255)];
}
function ramp(name, day, dusk) {
  R[name] = day.map((h, i) => {
    DAY.push(hex(h)); DUSK.push(dusk ? hex(dusk[i]) : duskOf(hex(h)));
    RAMP_OF.push(name); STEP_OF.push(i);
    return DAY.length - 1;
  });
}
ramp('ink', ['#1a1424'], ['#120e1c']);
ramp('sky', ['#4f7fd0', '#6a96dc', '#88aee6', '#a8c8f0', '#cce2f6'], ['#232457', '#43347a', '#83467e', '#d4706a', '#f6ac76']);
{
  const mixc = (a, b, t) => '#' + [0, 1, 2].map(k => Math.round(lerp(parseInt(a.slice(1 + k * 2, 3 + k * 2), 16), parseInt(b.slice(1 + k * 2, 3 + k * 2), 16), t)).toString(16).padStart(2, '0')).join('');
  const band = (stops, n) => Array.from({ length: n }, (_, i) => { const f = i / (n - 1) * (stops.length - 1), k = Math.min(stops.length - 2, Math.floor(f)); return mixc(stops[k], stops[k + 1], f - k); });
  ramp('skyband', band(['#3f70c8', '#5f8ed8', '#86ace6', '#b2d0f2', '#dcecf8'], 14), band(['#1c1c4c', '#3c2e70', '#7a427c', '#cc6a6a', '#f8b07a'], 14));
}
ramp('far', ['#5b78a8', '#7290bc', '#8ea8d0', '#afc4e2'], ['#35315e', '#4e4272', '#6c5486', '#8e6c98']);
ramp('farsnow', ['#d4e0f2', '#f4f8fe'], ['#d896a6', '#f6bcb0']);
ramp('hill', ['#294e58', '#365f62', '#47726a'], ['#262a4a', '#30345a', '#3e4466']);
ramp('grass', ['#2a5a2e', '#3d7a34', '#58993c', '#7cb848', '#a2d25c'], ['#1a2638', '#223446', '#2c4454', '#3a5662', '#4c6a6e']);
ramp('moss', ['#142c1c', '#1f4428', '#2c5c2c', '#467a30', '#6a9834', '#9cbc3e', '#ccd658'], ['#0c1222', '#131d32', '#1a293e', '#24364a', '#304452', '#40585c', '#566e66']);
ramp('conifer', ['#0d221e', '#15382c', '#1f4f3a', '#2c6848', '#428259'], ['#090f1e', '#0f182a', '#152238', '#1e3046', '#2a4054']);
ramp('dirt', ['#5a3e2e', '#82603e', '#a8804e', '#c8a266', '#e2c28a']);
ramp('water', ['#10325c', '#1a4e88', '#2770b0', '#4398d2', '#78c4ea', '#c4eefa'], ['#1c1840', '#2a2458', '#3f3474', '#6a4c8c', '#b87c96', '#f4b8a4']);
ramp('glint', ['#2770b0', '#2770b0', '#2770b0', '#2770b0']);
ramp('ice', ['#2a5486', '#467eb2', '#74aad4', '#a6d0ec', '#d8f0fa'], ['#3a3266', '#5c4c84', '#8a6c9e', '#b890ae', '#e6b8b8']);
ramp('snow', ['#7a8cb6', '#a2b4d8', '#cad8ee', '#eef4fc', '#ffffff'], ['#5e4a80', '#94688c', '#cc8e9c', '#f2b4a8', '#ffd4bc']);
ramp('gold', ['#3c3632', '#5c544c', '#7e7468', '#a09484', '#beb39e', '#d8cfba', '#f0eadb'], ['#2c2432', '#463844', '#644c58', '#86646a', '#a87e7c', '#c89a8e', '#e6bca6']);
ramp('ochre', ['#6a5a48', '#8e7a60', '#b29a78', '#d0b892'], ['#4a2c2e', '#6e3c38', '#945044', '#b86a52']);
ramp('granite', ['#36303a', '#514650', '#70645f', '#918378', '#b5a696', '#d8cbb8']);
ramp('rock', ['#3a3a44', '#585862', '#7a7a82', '#a0a0a4', '#c8c8c4']);
ramp('bark', ['#2c1c16', '#4c3022', '#6e462c', '#92623c'], ['#1a1222', '#2a1c2e', '#3e2a3a', '#58404a']);
ramp('wood', ['#38220f', '#5c3a20', '#845638', '#ac7a4e', '#d2a472'], ['#20141e', '#34202c', '#4c3038', '#6a464a', '#8e645c']);
ramp('lupine', ['#56399f', '#8566e0', '#c4b0f6']);
ramp('red', ['#962a22', '#de4e2c', '#f88254']);
ramp('white', ['#d6d2c2', '#fffcee']);
ramp('yellow', ['#c4961e', '#f4d048']);
ramp('skin', ['#a0644a', '#d8966c', '#f6c69e']);
ramp('hair', ['#2c1a12', '#4c301e']);
ramp('blaze', ['#a2361a', '#e05824', '#ff8a48']);
ramp('teal', ['#175868', '#288896', '#4ab6c2']);
ramp('navy', ['#1a1e36', '#2c3254', '#424a76']);
ramp('shoe', ['#76788c', '#c2c4d2', '#f2f2f8']);
ramp('tortie', ['#18121a', '#382824', '#ac5e28', '#de9850']);
ramp('nebel', ['#3c4454', '#5c687c', '#8692a6', '#b2bcce']);
ramp('tent', ['#a44c18', '#e4842a', '#f6b248']);
// Added for the scenes beyond the world map.
ramp('glac', ['#2f5f92', '#4f8cbc', '#84b8dc', '#b4d8ee', '#dcf0fa', '#f6fcff'], ['#3a3266', '#5c4c84', '#8a6c9e', '#b890ae', '#e6b8b8', '#ffdcc8']);
ramp('sun', ['#a87a14', '#e8b830', '#fbe070']);
ramp('mustard', ['#7a5a12', '#b88c1c', '#dcb43c']);
ramp('kit', ['#1c5c34', '#2c8a4a', '#5cbc68']);
ramp('pink', ['#a8487c', '#e07cac', '#f8bcd4']);
ramp('mist', ['#24483e', '#3a6654', '#56856c', '#7aa488', '#a4c4a4', '#cfe2c0'], ['#141c34', '#1e2a44', '#2c3c54', '#405264', '#586a74', '#788a86']);
ramp('fur', ['#1c1418', '#34262a', '#523c38', '#7a5c4c']);
ramp('jay', ['#141a30', '#1c3c8c', '#2c68cc', '#5c9ce8']);
ramp('pool', ['#0a1a20', '#10292c', '#183c3a', '#24544a', '#3c7662', '#6ea68a', '#a8d0b0'], ['#0c0c22', '#141632', '#1e2244', '#2e3456', '#4a4a6c', '#7a6884', '#b890a0']);
ramp('tarn', ['#0c3444', '#125266', '#1a7688', '#2c9ea8', '#5cc4c0', '#a4e6da'], ['#1a1840', '#2a2458', '#443a78', '#70508c', '#b47c98', '#f0b8a8']);
// Things that only show in the Dusk sky. Their Day colours are sky blue, so they fade in with the light.
ramp('star', ['#6a96dc', '#88aee6', '#a8c8f0'], ['#8c7cc0', '#e8d8f4', '#fffbe6']);
ramp('aurora', ['#5f8ed8', '#6a96dc', '#88aee6'], ['#235c6c', '#2e9c86', '#86ecb0']);
// Added for the larger world map: the larch basin, the dry side, the burn, the coast and the mist.
ramp('larch', ['#6a4610', '#a8701a', '#d89a24', '#f2c43c', '#fbe478']);
ramp('sage', ['#46564c', '#667866', '#8a9a80', '#aeb89a']);
ramp('dry', ['#8a7440', '#b09a54', '#cdb96c', '#e2d48c']);
ramp('basalt', ['#231f2a', '#37323c', '#4e4850', '#6a6266']);
ramp('sand', ['#a89a7c', '#c8bc9a', '#e2d8b8']);
ramp('sea', ['#143c50', '#1e586c', '#2c7888', '#4c9aa4', '#8cc4c4', '#d8f0ec']);
ramp('ash', ['#463c36', '#62564a', '#80725c', '#9c8e72']);
ramp('fog', ['#a8bcb8', '#c8d6d0', '#e6eeea'], ['#5a5a88', '#7e7aa8', '#a8a0cc']);
ramp('pine', ['#1c3a20', '#2c5a2c', '#48783a', '#6c9648', '#94b25c']);
ramp('pbark', ['#5a2c14', '#8c4a20', '#c0702c']);
// Round 3, scenes
// The light in the gaps between the far trees of the rainforest, a step paler than the palest mist.
ramp('glow', ['#e6f1d4'], ['#8fa29c']);
// Round 3, ground
ramp('aspen', ['#d4c22e', '#f4ea68']);
ramp('fireweed', ['#cc2e96', '#f068c0']);
// Round 4: Mount Monolith, painted. Seracs and the ice in crevasses shine a stronger blue than the
// glaciers' own ramp; the volcano's rock is a warm mauve grey, after TJ's reference.
ramp('serac', ['#1b4a8c', '#2d6fc0', '#4c98e2', '#82c4f2', '#c2e8fc']);
ramp('mauve', ['#3a2f40', '#55465a', '#75627a', '#957f96', '#b8a4b6']);
// Round 4, E5j: glass that shows the sky by day and a lit lamp at Dusk (the fire lookout's windows).
ramp('lamp', ['#3a4a66', '#7090b8'], ['#f0a040', '#ffe08a']);
// Round 4, E5d: foxfire, the fungus that glows on rotting wood, only seen once the light has gone.
ramp('foxfire', ['#4f7a52', '#8fd6a0'], ['#3fb58a', '#b4ffd8']);
const INK = R.ink[0];
const N = DAY.length;
// One step darker or lighter within an entry's own ramp, for shadows drawn onto finished pixels.
const SHADE = new Uint8Array(256), LIGHT = new Uint8Array(256);
for (let i = 1; i < N; i++) { const r = R[RAMP_OF[i]], s = STEP_OF[i]; SHADE[i] = r[Math.max(0, s - 1)]; LIGHT[i] = r[Math.min(r.length - 1, s + 1)]; }
for (const g of R.glint) SHADE[g] = R.water[1];
const KIND = new Uint8Array(256);
const KINDS = ['', 'grass', 'moss', 'dirt', 'water', 'ice', 'rock'];
for (let i = 1; i < N; i++) KIND[i] = Math.max(0, KINDS.indexOf(RAMP_OF[i] === 'glac' ? 'ice' : RAMP_OF[i] === 'sea' ? 'water' : RAMP_OF[i]));
// The dark upper part of a sky, where stars can show.
const SKY = new Uint8Array(256);
for (let i = 1; i < N; i++) SKY[i] = (RAMP_OF[i] === 'sky' && STEP_OF[i] <= 1) || (RAMP_OF[i] === 'skyband' && STEP_OF[i] <= 6) ? 1 : 0;

function pick(name, v, x, y, dith = 0.9) {
  const r = R[name], s = clamp(v, 0, 1) * (r.length - 1) + (bayer(x, y) - 0.5) * dith;
  return r[clamp(Math.round(s), 0, r.length - 1)];
}

// ---------------------------------------------------------------------------------------------
// Index bitmaps. 0 is transparent. ox, oy is the sprite's foot, the point it stands on.

class BM {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8Array(w * h); this.ox = 0; this.oy = 0; }
  set(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; }
  get(x, y) { x = Math.round(x); y = Math.round(y); return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.d[y * this.w + x] : 0; }
}
// Light from the upper left along an animal's back (art pass D06): the top pixel of each column a step
// lighter in its own ramp. Run it before the outline.
function litBack(b) {
  for (let x = 0; x < b.w; x++) for (let y = 0; y < b.h; y++) { const i = y * b.w + x, v = b.d[i]; if (!v) continue; if (v !== INK) b.d[i] = LIGHT[v]; break; }
}
function outline(b, c) {
  const o = b.d.slice(), w = b.w, h = b.h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (b.d[i]) continue;
    if ((x > 0 && b.d[i - 1]) || (x < w - 1 && b.d[i + 1]) || (y > 0 && b.d[i - w]) || (y < h - 1 && b.d[i + w])) o[i] = typeof c === 'function' ? c(x, y) : c;
  }
  b.d = o;
}
function disc(b, cx, cy, r, fn) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
    const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy <= r * r) { const c = fn(dx / r, dy / r, x, y); if (c) b.set(x, y, c); }
  }
}
function thick(b, x0, y0, x1, y1, w, c) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = lerp(x0, x1, t), y = lerp(y0, y1, t), col = typeof c === 'function' ? c(t) : c;
    if (w <= 1) b.set(x, y, col);
    else for (let dy = 0; dy < w; dy++) for (let dx = 0; dx < w; dx++) b.set(x - (w - 1) / 2 + dx, y - (w - 1) / 2 + dy, col);
  }
}

function catmull(pts) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 2);
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}
function makePath(def) {
  const pts = catmull(def.pts), cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = cum[cum.length - 1];
  const at = p => {
    const d = clamp(p, 0, 1) * len; let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < d) lo = m; else hi = m; }
    const t = (d - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]);
    return { x: lerp(pts[lo][0], pts[hi][0], t), y: lerp(pts[lo][1], pts[hi][1], t), dx: pts[hi][0] - pts[lo][0], dy: pts[hi][1] - pts[lo][1] };
  };
  const stops = def.stops.map(s => {
    let best = 0, bd = 1e9;
    pts.forEach((q, i) => { const d = Math.hypot(q[0] - s.near[0], q[1] - s.near[1]); if (d < bd) { bd = d; best = i; } });
    return { ...s, at: cum[best] / len };
  });
  return { pts, len, at, stops };
}


// ---------------------------------------------------------------------------------------------
// Wind. A wave runs along the wind a pixel at a time, gusts widen it, and still air stops it.

const GUSTS = [[0, 1.1], [4.1, 0.6], [7.3, 1.25], [11.2, 0.5], [14.6, 0.9], [17.8, 0.7]];
function gust(along, t) {
  let g = 0.25;
  for (const [t0, s] of GUSTS) {
    const front = ((t - t0) % 20 + 20) % 20 * 58 - 120;
    g = Math.max(g, s * Math.exp(-sq((along - front) / 70)));
  }
  return g;
}
const POSE = [[0, 0], [0, -1], [1, -1], [1, 0]];
function windAt(x, y, t, amt) {
  if (!amt) return [0, 0];
  const along = x + 0.25 * y, g = gust(along, t);
  if (g < 0.15) return [0, 0];
  const ph = frac(t / 1.54 - along / 69), q = POSE[Math.floor(ph * 4) & 3], a = Math.round((g > 0.85 ? 2 : 1) * amt);
  return [q[0] * a, q[1] * a];
}
// The map's own air. About every eleven seconds one light gust comes in off the sea and crosses to the
// east, and each tree leans once, and once more briefly, as its front goes by. In between, every leaf
// clump and flower head has a life of its own (TJ, 2026-11-15): each sways now and then, one way and
// back, on its own slow beat, so the map is never quite still and no two plants move together. The forest and lake scenes keep windAt: there the trees are close and never quite stop.
const STILL = [0, 0], LEAN = [1, 0], BACK = [-1, 0], GUST = { every: 11, speed: 180, wide: 230 };
let gustT = -1, gustNow = [];
function breeze(x, y, t, amt) {
  if (!amt) return STILL;
  if (t !== gustT) {
    // Two gusts can be on the map at once: the one that set off last and the one before it.
    gustT = t; gustNow = [];
    for (let k = 0; k < 2; k++) { const n = Math.floor(t / GUST.every) - k, t0 = n * GUST.every + 3 * hash(n, 7, 400); if (t >= t0) gustNow.push([(t - t0) * GUST.speed - 60, n, hash(n, 8, 400) < 0.45 ? 0.75 : 1]); }
  }
  const along = x + 0.25 * y;
  for (const [front, n, strength] of gustNow) {
    const d = front - along; if (d < -40 || d > GUST.wide + 40) continue;
    const u = (d + 50 * (vnoise(y / 120, n, 401) - 0.5)) / GUST.wide;
    // A weak gust only stirs the tops.
    if (u < 0.08 || u >= 0.9 || Math.round(amt * strength) < 1) continue;
    return u < 0.6 || u > 0.76 ? LEAN : STILL;
  }
  if (amt < 0.5) return STILL;
  const xr = Math.round(x), yr = Math.round(y), ph = frac(t / (3.6 + 3.9 * hash(xr, yr, 402)) + hash(xr, yr, 403));
  return ph < 0.13 ? LEAN : ph > 0.5 && ph < 0.6 ? BACK : STILL;
}

// ---------------------------------------------------------------------------------------------
// The screen: a frame of palette indices at whole-pixel scale, and the table that colours it.

class Screen {
  // With a size given it is a still picture of that many pixels, not the window.
  constructor(canvas, fixed = null) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false }); this.fixed = fixed;
    this.lut = new Uint32Array(256); this.lastLut = -1; this.resize();
  }
  resize() {
    const dpr = window.devicePixelRatio || 1, Wd = Math.round(innerWidth * dpr), Hd = Math.round(innerHeight * dpr);
    // S0 is the pixel size that suits the window. A scene may ask for bigger or smaller pixels (`want`): the map does, to zoom.
    const S0 = this.S0 = this.fixed ? 1 : Math.max(1, Math.min(Math.floor(Hd / 290), Math.floor(Wd / 280)));
    const S = this.S = this.fixed ? 1 : this.want || S0;
    const VW = this.VW = this.fixed ? this.fixed[0] : Math.ceil(Wd / S), VH = this.VH = this.fixed ? this.fixed[1] : Math.ceil(Hd / S);
    // The frame and the canvas are kept at the largest size asked for so far (capW by capH) and only their
    // top-left VW by VH is drawn and shown, so a zoom, which changes the size every frame, reallocates
    // nothing once it has been out that far (F2). Name tags and taps read S and the top-left corner, as before.
    const grow = this.fixed || !this.capW || VW > this.capW || VH > this.capH;
    if (grow) { this.capW = this.fixed ? VW : Math.max(this.capW || 0, VW); this.capH = this.fixed ? VH : Math.max(this.capH || 0, VH);
      this.canvas.width = this.capW; this.canvas.height = this.capH; this.buf = new Uint8Array(this.capW * this.capH); this.img = this.ctx.createImageData(this.capW, this.capH); this.u32 = new Uint32Array(this.img.data.buffer); }
    // What lies past the view in a canvas kept bigger than it is cleared, so a glide that shrinks the picture shows black there, not an old frame.
    else if (VW < this.lastVW || VH < this.lastVH) this.ctx.clearRect(0, 0, this.capW, this.capH);
    this.lastVW = VW; this.lastVH = VH;
    // The map may be shown at any size, not only whole pixels. Smaller than one screen pixel to a pixel,
    // the picture is smoothed rather than having pixels dropped.
    if (!this.fixed) { this.canvas.style.width = (this.capW * S / dpr) + 'px'; this.canvas.style.height = (this.capH * S / dpr) + 'px'; this.canvas.style.imageRendering = S < 1 ? 'auto' : ''; }
    this.fb = this.buf.subarray(0, VW * VH);
    this.lastLut = -1;
    // A tall, narrow view (a phone held upright) has its panels across the bottom, so scenes
    // keep the action in the upper part.
    this.narrow = VW < VH;
  }
  setScale(s) { const want = s === this.S0 ? 0 : s; if (want !== (this.want || 0) || s !== this.S) { this.want = want; this.resize(); } }
  set(x, y, c) { if (x >= 0 && y >= 0 && x < this.VW && y < this.VH) this.fb[y * this.VW + x] = c; }
  get(x, y) { return x >= 0 && y >= 0 && x < this.VW && y < this.VH ? this.fb[y * this.VW + x] : 0; }
  blit(bm, sx, sy) {
    sx = Math.round(sx); sy = Math.round(sy);
    const VW = this.VW, fb = this.fb;
    const x0 = Math.max(0, -sx), y0 = Math.max(0, -sy), x1 = Math.min(bm.w, VW - sx), y1 = Math.min(bm.h, this.VH - sy);
    const d = bm.d, w = bm.w;
    for (let j = y0; j < y1; j++) {
      let si = j * w + x0, di = (sy + j) * VW + sx + x0;
      for (let i = x0; i < x1; i++, si++, di++) { const c = d[si]; if (c) fb[di] = c; }
    }
  }
  blitFlip(bm, sx, sy) {
    sx = Math.round(sx); sy = Math.round(sy);
    const VW = this.VW, VH = this.VH, fb = this.fb;
    for (let j = 0; j < bm.h; j++) { const y = sy + j; if (y < 0 || y >= VH) continue; for (let i = 0; i < bm.w; i++) {
      const c = bm.d[j * bm.w + (bm.w - 1 - i)], x = sx + i;
      if (c && x >= 0 && x < VW) fb[y * VW + x] = c;
    } }
  }
  // Draws a sprite by its foot, facing left when asked.
  put(bm, x, y, flip) { if (flip) this.blitFlip(bm, x - (bm.w - 1 - bm.ox), y - bm.oy); else this.blit(bm, x - bm.ox, y - bm.oy); }
  shadow(cx, cy, rx, ry) {
    for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) {
      if (sq(dx / rx) + sq(dy / ry) > 1) continue;
      const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= this.VW || y >= this.VH) continue;
      this.fb[y * this.VW + x] = SHADE[this.fb[y * this.VW + x]];
    }
  }
  // Closes a round window on a point, black outside it with a dithered rim: the scene change.
  iris(cx, cy, r) {
    const { VW, VH, fb } = this;
    if (r <= 0) { fb.fill(BLACK); return; }
    const r2 = r * r, rim = sq(r + 5);
    for (let y = 0; y < VH; y++) {
      const dy2 = sq(y - cy), row = y * VW;
      if (dy2 > rim) { fb.fill(BLACK, row, row + VW); continue; }
      for (let x = 0; x < VW; x++) {
        const d2 = sq(x - cx) + dy2;
        if (d2 > rim || (d2 > r2 && ((x + y) & 1))) fb[row + x] = BLACK;
      }
    }
  }
  // The Dusk-only sky, drawn onto whatever sky the scene left showing: stars that twinkle, a thin
  // moon, a shooting star now and then, and a curtain of aurora that comes and goes.
  // A scene whose sky scrolls (the map) sets `sky` each frame: where its world's top left corner is,
  // and the size of the sky the stars are laid out over. Then all of it is pinned to that sky and
  // comes into view when the camera rises. With no `sky` it fills the screen, as in every other scene.
  night(t, mix) {
    const pin = this.sky; this.sky = null;
    if (mix < 0.3) return;
    const { VW, VH, fb } = this, W = pin ? pin.w : VW, H = pin ? pin.h : VH, ox = pin ? pin.ox : 0, oy = pin ? pin.oy : 0;
    if (!this.stars || this.starsFor !== W * 10000 + H) {
      this.starsFor = W * 10000 + H; this.stars = [];
      const n = Math.round(W * H / 520);
      for (let k = 0; k < n; k++) this.stars.push([Math.floor(hash(k, 1, 300) * W), Math.floor(sq(hash(k, 2, 300)) * H * 0.8), hash(k, 3, 300), hash(k, 4, 300) < 0.08]);
    }
    for (let k = 0; k < 2; k++) for (let x = 0; x < VW; x++) {
      const wx = x + ox, on = smooth(0.42, 0.72, vnoise(wx / 110 + t * 0.035, k * 7, 301)); if (on <= 0) continue;
      const base = Math.round(H * (0.2 + 0.11 * k) + 12 * Math.sin(wx / 57 + t * 0.09 + k * 2.4) + 9 * vnoise(wx / 31 + t * 0.06, k, 302)) - oy, len = 14 + 30 * vnoise(wx / 6 + t * 0.22, k + 5, 303);
      for (let y = Math.max(0, Math.round(base - len)); y <= base && y < VH; y++) {
        const i = y * VW + x; if (!SKY[fb[i]]) continue;
        const v = on * (1 - (base - y) / len) * (0.6 + 0.4 * vnoise(wx / 3, t * 0.8 + k, 304));
        if (bayer(wx, y + oy) < v * 1.25) fb[i] = R.aurora[v > 0.62 ? 2 : v > 0.3 ? 1 : 0];
      }
    }
    for (const [sx, sy, ph, big] of this.stars) {
      const x = sx - ox, y = sy - oy; if (x < 0 || y < 0 || x >= VW || y >= VH) continue;
      const i = y * VW + x; if (!SKY[fb[i]]) continue;
      const tw = Math.sin(t * (0.6 + ph * 1.8) + ph * 40);
      if (tw < -0.75) continue;
      fb[i] = R.star[big || tw > 0.5 ? 2 : ph > 0.5 ? 1 : 0];
      if (big && tw > 0.2) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (y + dy) * VW + x + dx; if (x + dx >= 0 && x + dx < VW && y + dy >= 0 && y + dy < VH && SKY[fb[j]]) fb[j] = R.star[0]; }
    }
    const mx = Math.round(pin && pin.moon ? pin.moon[0] : W * 0.8) - ox, my = Math.round(pin && pin.moon ? pin.moon[1] : Math.min(H * 0.16, 44)) - oy;
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) { if (dx * dx + dy * dy > 36 || sq(dx + 3.4) + sq(dy + 1.6) <= 33) continue; const x = mx + dx, y = my + dy; if (x >= 0 && y >= 0 && x < VW && y < VH && (SKY[fb[y * VW + x]] || RAMP_OF[fb[y * VW + x]] === 'aurora')) fb[y * VW + x] = R.star[dx > 3 ? 2 : 1]; }
    // A shooting star falls wherever the view happens to be, at the height of the dark sky.
    const n = Math.floor(t / 9), u = (t - n * 9) / 0.7;
    if (u < 1 && hash(n, 1, 305) < 0.7) {
      const x0 = VW * (0.2 + 0.7 * hash(n, 2, 305)), y0 = H * (0.04 + 0.2 * hash(n, 3, 305)) - oy;
      for (let k = 0; k < 12; k++) { const x = Math.round(x0 - (u * 60 - k) * 1.0), y = Math.round(y0 + (u * 60 - k) * 0.45); if (u * 60 - k < 0 || x < 0 || y < 0 || x >= VW || y >= VH || !SKY[fb[y * VW + x]]) continue; fb[y * VW + x] = R.star[k < 2 ? 2 : k < 6 ? 1 : 0]; }
    }
  }
  present(t, mix) {
    const g = Math.floor(t * 6) & 3, key = Math.round(mix * 64) * 8 + g, lut = this.lut;
    if (key !== this.lastLut) {
      this.lastLut = key;
      for (let i = 1; i < N; i++) {
        let a = DAY[i], b = DUSK[i];
        const k = R.glint.indexOf(i);
        if (k >= 0) { const src = k === g ? R.water[5] : k === ((g + 1) & 3) ? R.water[4] : R.water[2]; a = DAY[src]; b = DUSK[src]; }
        lut[i] = (255 << 24) | (Math.round(lerp(a[2], b[2], mix)) << 16) | (Math.round(lerp(a[1], b[1], mix)) << 8) | Math.round(lerp(a[0], b[0], mix));
      }
      lut[0] = lut[BLACK] = 0xff000000;
    }
    const { fb, u32, VW, VH, capW } = this;
    if (VW === capW) for (let i = 0; i < fb.length; i++) u32[i] = lut[fb[i]];
    else for (let y = 0; y < VH; y++) for (let s = y * VW, d = y * capW, e = s + VW; s < e; s++, d++) u32[d] = lut[fb[s]];
    this.ctx.putImageData(this.img, 0, 0, 0, 0, VW, VH);
  }
}
const BLACK = 255;

// What the hidden debug panel has switched: the first five are layers that can be turned off, the
// rest are outlines that can be turned on. The scenes read it as they draw.
const DEBUG = { snap: true, trees: true, clouds: true, mist: true, labels: true, animals: true, roam: false, taps: false, trails: false, camera: false, collide: '' };

export {
  DEBUG, TAU, clamp, lerp, smooth, frac, sq, rng, hash, vnoise, fbm, bayer,
  DAY, DUSK, R, RAMP_OF, STEP_OF, INK, N, SHADE, LIGHT, KIND, BLACK, pick, ramp,
  BM, outline, litBack, disc, thick, catmull, makePath, windAt, breeze, Screen
};

// What each colour looks like through mist: the palette entry nearest to it mixed toward fog by this
// much. Nearest is judged in Day and in Dusk together, so a veil holds in either light. The neutral
// greys are never picked (they turn a green forest dirty), nor the colours that cycle or only show at Dusk.
const NO_VEIL = ['glint', 'star', 'aurora', 'rock', 'gold', 'granite', 'basalt', 'nebel', 'shoe', 'navy', 'far', 'ochre', 'ink', 'fur', 'tortie', 'hair', 'jay', 'skin'];
// Each table is worked out once and kept (M3): fourteen were made at every start, several twice over. The
// sums are the same as before, in the same order, so every table is exactly what it was.
const VEILS = new Map(), WK = [3, 4, 2];
// A table of each colour mixed toward the colour `to` by `amount`, picked from the palette less NO_VEIL,
// or, when `only` names ramps, from those ramps alone (A10: the lake's reflection, toward deep water).
export function mixTable(to, amount, only = null) {
  const key = to + ':' + amount + ':' + (only ? only.join() : '');
  if (VEILS.has(key)) return VEILS.get(key);
  const out = new Uint8Array(256), skip = new Uint8Array(256);
  if (only) { skip.fill(1); for (const j of only.flatMap(k => R[k])) skip[j] = 0; } else for (const j of NO_VEIL.flatMap(k => R[k])) skip[j] = 1;
  const PS = [DAY, DUSK];
  for (let i = 1; i < N; i++) {
    let best = i, bd = Infinity;
    const want = []; for (const P of PS) for (let k = 0; k < 3; k++) want.push(P[i][k] + (P[to][k] - P[i][k]) * amount);
    for (let j = 1; j < N; j++) {
      if (skip[j]) continue;
      let d = 0, m = 0;
      for (const P of PS) { const c = P[j]; for (let k = 0; k < 3; k++, m++) { const e = want[m] - c[k]; d += e * e * WK[k]; } }
      if (d < bd) { bd = d; best = j; }
    }
    out[i] = best;
  }
  out[BLACK] = BLACK;
  VEILS.set(key, out);
  return out;
}
export const veilTable = amount => mixTable(R.fog[2], amount);
