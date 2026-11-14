// Trailhead as SNES-style pixel art: a vibe check, not production code.
// The whole frame is palette indices, like the SNES itself. The ground is drawn once into a big
// index bitmap, sprites are copied over it each frame in order of their feet, and only at the end
// does a lookup table turn indices into colours. That is what makes Dusk (a second palette), the
// glints on the lake (cycling four entries) and the 10-a-second wind cheap.

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
ramp('bark', ['#2c1c16', '#4c3022', '#6e462c', '#92623c']);
ramp('wood', ['#38220f', '#5c3a20', '#845638', '#ac7a4e', '#d2a472']);
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
const INK = R.ink[0];
const N = DAY.length;
// One step darker or lighter within an entry's own ramp, for shadows drawn onto finished pixels.
const SHADE = new Uint8Array(256), LIGHT = new Uint8Array(256);
for (let i = 1; i < N; i++) { const r = R[RAMP_OF[i]], s = STEP_OF[i]; SHADE[i] = r[Math.max(0, s - 1)]; LIGHT[i] = r[Math.min(r.length - 1, s + 1)]; }
for (const g of R.glint) SHADE[g] = R.water[1];
const KIND = new Uint8Array(256);
const KINDS = ['', 'grass', 'moss', 'dirt', 'water', 'ice', 'rock'];
for (let i = 1; i < N; i++) KIND[i] = Math.max(0, KINDS.indexOf(RAMP_OF[i]));

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
function outline(b, c, onlyEmpty = true) {
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

// ---------------------------------------------------------------------------------------------
// The world. Pixel coordinates, x east, y south. North is up the screen, so the three
// destinations stand along the top of the meadow: the forest and About Lake on the left,
// The Stack in the middle, Sideproject Spires on the right.

const WW = 1000, WH = 720;
const T = { x: 560, y: 470 };
const LAKE = { x: 385, y: 372, rx: 46, ry: 15 };
const GL = { x0: 716, y0: 350, x1: 698, y1: 424 };
const STACK = { x: 545, y: 384, w: 160, h: 120 };
const SPIRES = { x: 715, y: 362, w: 170, h: 132 };
const PEAK = { x: 385, y: 354, w: 150, h: 112 };
const KM = 0.008; // kilometres per pixel along a trail, for the sign's distances

const ROUTES = {
  lake: {
    pts: [[560, 470], [528, 475], [494, 481], [462, 494], [428, 512], [390, 527], [350, 525], [318, 503], [302, 470], [310, 438], [334, 412], [362, 398], [384, 395], [410, 393], [432, 386], [446, 373], [454, 390], [476, 422], [503, 447], [532, 462], [560, 470]],
    stops: [
      { id: 'who', near: [494, 481], face: 'up' },
      { id: 'mountains', near: [384, 395], cam: [385, 340], face: 'up' },
      { id: 'note', near: [446, 373], cam: [404, 360], face: 'left' }
    ]
  },
  stack: { pts: [[560, 470], [558, 452], [553, 430], [549, 410], [546, 393]], stops: [{ id: 'stack-base', near: [546, 393], cam: [545, 330], face: 'up' }] },
  spires: { pts: [[560, 470], [586, 463], [620, 452], [650, 440], [668, 426], [676, 410]], stops: [{ id: 'base-camp', near: [676, 410], cam: [712, 320], face: 'up' }] }
};

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

const lakeD = (x, y) => Math.hypot((x - LAKE.x) / LAKE.rx, (y - LAKE.y) / LAKE.ry) + 0.1 * (vnoise(x / 7, y / 5, 4) - 0.5);
function glacier(x, y) {
  const dx = GL.x1 - GL.x0, dy = GL.y1 - GL.y0;
  const t = clamp(((x - GL.x0) * dx + (y - GL.y0) * dy) / (dx * dx + dy * dy), 0, 1);
  const px = GL.x0 + dx * t, py = GL.y0 + dy * t;
  return { t, d: Math.hypot(x - px, y - py), w: lerp(64, 11, Math.pow(t, 0.8)) + 5 * (vnoise(x / 8, y / 8, 9) - 0.5), side: x - px };
}
function forestAmt(x, y) {
  const edge = 480 + 36 * (fbm(y / 50, 2.3, 3, 3) - 0.5) - smooth(560, 700, y) * 70;
  const ld = Math.hypot((x - LAKE.x) / LAKE.rx, (y - LAKE.y) / LAKE.ry);
  return smooth(edge + 12, edge - 12, x) * smooth(316, 338, y) * smooth(1.2, 1.7, ld);
}
const farRidge = x => 254 + 46 * (fbm(x / 80, 1.7, 1, 4) - 0.5) + 8 * Math.sin(x / 47);
const talus = (x, y) => (y > 370 && y < 404) ? smooth(96, 62, Math.abs(x - STACK.x) + (y - 376) * 2.2) : 0;

function buildGround(trail, peak) {
  const g = new Uint8Array(WW * WH);
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
    const i = y * WW + x, fr = farRidge(x);
    if (y < fr) {
      const sb = R.skyband, f = clamp(y / 270, 0, 1) * (sb.length - 1), b0 = Math.floor(f), e = f - b0;
      g[i] = sb[Math.min(sb.length - 1, b0 + (e > 0.72 && bayer(x, y) < (e - 0.72) / 0.28 ? 1 : 0))];
      continue;
    }
    const hill = 290 + 18 * (fbm(x / 36, 6.1, 2, 3) - 0.5);
    if (y < hill) {
      const slope = farRidge(x + 2) - farRidge(x - 2);
      if (y - fr < 3 + 4 * vnoise(x / 5, 0, 3) && fr < 256) { g[i] = R.farsnow[slope < 0 ? 1 : 0]; continue; }
      g[i] = pick('far', 0.45 - slope * 0.12 - (y - fr) * 0.006 + 0.15 * (vnoise(x / 3, y / 6, 6) - 0.5), x, y);
      continue;
    }
    if (y < 304) { g[i] = pick('hill', 0.25 + 0.6 * vnoise(x / 2.5, y / 2, 5), x, y); continue; }
    const ld = lakeD(x, y);
    if (ld < 1) {
      // The peak mirrored in the still water, squashed and broken by ripples.
      const rx = Math.round(x - PEAK.x + peak.ox + 1.5 * Math.sin(y * 1.7)), ry = Math.round(peak.oy - (y - (LAKE.y - LAKE.ry)) * 3.2);
      const rc = ld < 0.86 && (y & 1 || hash(x, y, 8) < 0.6) ? peak.get(rx, ry) : 0;
      if (ld > 0.88) g[i] = R.water[4];
      else if (rc && rc !== INK) { const k = RAMP_OF[rc]; g[i] = k === 'snow' ? R.water[4] : k === 'conifer' ? R.water[1] : R.water[2]; }
      else if (hash(x, y, 7) < 0.045 && ld < 0.8) g[i] = R.glint[(Math.floor(x / 3) + y) & 3];
      else g[i] = pick('water', 0.18 + 0.42 * smooth(0.1, 0.88, ld) + 0.08 * (vnoise(x / 6, y / 2, 8) - 0.5), x, y);
      continue;
    }
    if (ld < 1.12) { g[i] = R.dirt[hash(x, y, 3) < 0.3 ? 3 : 4]; continue; }
    if (y > 340) {
      const gl = glacier(x, y);
      if (gl.d < gl.w) {
        const cre = frac(gl.t * 7 - sq(gl.side / gl.w) * 0.35 + 0.35 * vnoise(x / 6, y / 6, 2));
        if (cre < 0.07 && gl.d < gl.w - 3 && vnoise(x / 5, y / 3, 3) > 0.35) { g[i] = cre < 0.04 ? R.ice[0] : R.ice[2]; continue; }
        const lit = 0.72 - 0.3 * gl.side / gl.w + 0.18 * (vnoise(x / 4, y / 4, 8) - 0.5) - gl.t * 0.15;
        g[i] = gl.t > 0.8 && hash(x >> 1, y >> 1, 9) < (gl.t - 0.8) * 2 ? R.rock[1] : pick('snow', lit, x, y, 0.6);
        continue;
      }
      if (gl.d < gl.w + 5) { g[i] = pick('rock', 0.2 + 0.55 * hash(x >> 1, y >> 1, 11), x, y); continue; }
    }
    const tr = trail[i];
    if (tr === 2) { g[i] = hash(x, y, 5) < 0.1 ? R.dirt[2] : (hash(x, y, 6) < 0.15 ? R.dirt[4] : R.dirt[3]); continue; }
    if (tr === 1) { g[i] = R.dirt[1]; continue; }
    const tal = talus(x, y);
    if (tal > 0 && hash(x >> 1, y >> 1, 12) < tal * 0.9) { g[i] = pick('rock', 0.15 + 0.75 * hash(x >> 1, y >> 1, 13), x, y); continue; }
    const fa = forestAmt(x, y);
    if (fa > 0.5) {
      // Light falls through the canopy in long diagonal patches.
      const shaft = fbm(x / 34 + y / 70, y / 26, 21, 3);
      g[i] = pick('moss', 0.16 + 0.3 * fbm(x / 18, y / 18, 22, 3) + smooth(0.56, 0.7, shaft) * 0.4, x, y);
      continue;
    }
    g[i] = pick('grass', 0.56 + 0.55 * (fbm(x / 26, y / 26, 31, 3) - 0.5) + 0.14 * (hash(x >> 1, y >> 1, 32) - 0.5) - fa * 0.45 - smooth(300, 345, y) * 0.1, x, y, 0.3);
  }
  return g;
}

function decorate(g, rand) {
  const kind = i => KIND[g[i]];
  // Tufts of grass, a small arch with a dark root.
  for (let n = 0; n < 9000; n++) {
    const x = 2 + (rand() * (WW - 4)) | 0, y = 306 + (rand() * (WH - 308)) | 0, i = y * WW + x;
    const k = kind(i); if (k !== 1 && k !== 2) continue;
    const r = R[k === 1 ? 'grass' : 'moss'], top = r[r.length - 1], mid = r[r.length - 2];
    if (kind(i - WW) !== k || kind(i - 2 * WW) !== k) continue;
    g[i - 2 * WW] = top; g[i - WW - 1] = mid; g[i - WW + 1] = mid; g[i] = r[1];
  }
  // Wildflowers in clusters, thickest around the Trailhead.
  for (let n = 0; n < 260; n++) {
    const near = n < 120;
    const cx = near ? T.x + (rand() - 0.5) * 380 : 470 + rand() * 520, cy = near ? T.y + (rand() - 0.5) * 220 : 330 + rand() * 380;
    const type = rand(), count = 6 + (rand() * 12) | 0;
    for (let k = 0; k < count; k++) {
      const x = Math.round(cx + (rand() - 0.5) * 18), y = Math.round(cy + (rand() - 0.5) * 10);
      if (x < 2 || y < 308 || x >= WW - 2 || y >= WH - 2) continue;
      const i = y * WW + x; if (kind(i) !== 1 || kind(i - WW) !== 1) continue;
      if (type < 0.5) { g[i - WW] = R.lupine[2]; g[i] = R.lupine[1]; g[i + WW] = R.grass[1]; }
      else if (type < 0.75) { g[i - WW] = R.red[2]; g[i] = R.red[1]; }
      else if (type < 0.9) g[i] = R.white[1];
      else g[i] = R.yellow[1];
    }
  }
}

// ---------------------------------------------------------------------------------------------
// The three destinations, each one big sprite.

function makeClimber(c) {
  const b = new BM(3, 5); b.ox = 1; b.oy = 4;
  b.set(1, 0, R.skin[2]); b.set(1, 1, R[c][1]); b.set(0, 1, R.skin[1]); b.set(2, 0, R.skin[1]); b.set(1, 2, R[c][1]); b.set(0, 3, R.navy[1]); b.set(2, 4, R.navy[1]);
  return b;
}
function makeStack() {
  const { w, h } = STACK, b = new BM(w + 2, h + 2); b.ox = (w >> 1) + 1; b.oy = h;
  const top = x => {
    const u = x / w;
    return 8 + 7 * vnoise(x / 9, 1, 41) + 30 * Math.pow(Math.max(0, 0.13 - u) / 0.13, 1.3) + 38 * Math.pow(Math.max(0, u - 0.85) / 0.15, 1.15) - 5 * Math.exp(-sq((u - 0.4) / 0.12));
  };
  const prow = 0.44 * w;
  for (let x = 0; x < w; x++) {
    const t0 = Math.round(top(x)), foot = h - 3 - Math.round(5 * vnoise(x / 6, 2, 47));
    for (let y = t0; y < foot; y++) {
      const u = x / w;
      // Lit on the left of the prow, in shade on the right, as the sun stands to the south-west.
      let v = x < prow ? 0.74 - 0.2 * (prow - x) / prow : 0.46 - 0.22 * (x - prow) / (w - prow);
      v += 0.22 * (fbm(x / 14, y / 18, 42, 3) - 0.5) + 0.1 * (vnoise(x / 4, y / 22, 48) - 0.5);
      // Black water streaks hang from the rim; pale stripes where flakes have peeled off.
      if (vnoise(x / 3, 3, 43) > 0.74 && y < t0 + 20 + 60 * vnoise(x / 6, 5, 44)) v -= 0.3;
      if (vnoise(x / 5, 7, 49) > 0.8 && y > h * 0.45) v += 0.22;
      // The big roof: a dark overhang with a lit lip.
      const roof = Math.round(h * 0.36 + 2 * vnoise(x / 6, 0, 50));
      if (u > 0.54 && u < 0.78) { if (y >= roof && y < roof + 3) v = 0.05; else if (y === roof - 1) v = 0.9; else if (y >= roof + 3 && y < roof + 6) v -= 0.18; }
      // A few long dihedrals.
      for (const cx0 of [0.24, 0.47, 0.66, 0.86]) if (Math.abs(x - (cx0 * w + 3 * Math.sin(y / 17))) < 0.6 && y > t0 + 6) v = x < prow ? 0.2 : 0.12;
      if (Math.abs(y - (h * 0.66 + 3 * Math.sin(x / 13))) < 0.6 && vnoise(x / 6, 9, 45) > 0.45) v = 0.96;
      if (y < t0 + 2) v += 0.18;
      const warm = fbm(x / 9, y / 26, 47, 3) > 0.66 && v > 0.4 && v < 0.85 && hash(x, y, 1) < 0.8;
      if (warm) { b.set(x + 1, y + 1, pick('ochre', v, x, y)); continue; }
      b.set(x + 1, y + 1, pick('gold', v, x, y));
    }
  }
  const rand = rng(7);
  for (let k = 0; k < 34; k++) {
    const x = 2 + rand() * (w - 4), t0 = Math.round(top(x)) + 1, hh = 2 + rand() * 4;
    for (let j = 0; j < hh; j++) for (let dx = -Math.floor(j / 2); dx <= Math.floor(j / 2); dx++) b.set(x + 1 + dx, t0 - hh + j + 1, R.conifer[dx < 0 ? 3 : 1]);
  }
  outline(b, INK);
  return b;
}

function makeSpires() {
  // Six needles clustered like the Torre group, one per project, each with its rime mushroom.
  const { w, h } = SPIRES, b = new BM(w + 4, h + 4); b.ox = (w >> 1) + 2; b.oy = h + 1;
  for (let x = 0; x < w; x++) {
    const u = Math.abs(x / w - 0.5) * 2, rt = Math.round(46 + 78 * Math.pow(u, 1.3) + 10 * (vnoise(x / 7, 1, 61) - 0.5));
    for (let y = rt; y < h; y++) {
      const snow = vnoise(x / 3 + y / 9, y / 5, 62) > 0.6 || (y - rt < 2 && x < w / 2);
      b.set(x + 2, y + 2, snow ? pick('snow', 0.62 - (x / w - 0.5) * 0.7, x, y, 0.5) : pick('granite', 0.22 + 0.3 * vnoise(x / 3, y / 5, 64), x, y));
    }
  }
  const towers = [{ cx: 33, top: 52, bw: 18, k: 0.9, cap: 0 }, { cx: 53, top: 22, bw: 20, k: 0.6, cap: 1 }, { cx: 77, top: 2, bw: 24, k: 0.7, cap: 1.25 }, { cx: 100, top: 18, bw: 18, k: 0.5, cap: 0.8 }, { cx: 121, top: 38, bw: 22, k: 1.1, cap: 0 }, { cx: 142, top: 60, bw: 16, k: 0.75, cap: 0.9 }];
  const base = h - 16;
  for (const tw of [...towers].sort((a, c) => a.top - c.top)) {
    for (let y = tw.top + 3; y < base; y++) {
      const f = (y - tw.top) / (base - tw.top);
      const hw = tw.bw / 2 * ((tw.cap ? 0.24 : 0.06) + (tw.cap ? 0.76 : 0.94) * Math.pow(f, tw.k)) + 1.4 * (vnoise(tw.cx, y / 3, 65) - 0.5);
      for (let x = Math.floor(tw.cx - hw); x <= Math.ceil(tw.cx + hw); x++) {
        const nx = (x - tw.cx) / hw; if (Math.abs(nx) > 1) continue;
        const v = 0.5 - 0.42 * nx + 0.13 * Math.sin(nx * 3.5 * Math.PI) + 0.16 * (vnoise(x / 2, y / 8, 66) - 0.5);
        const ledge = vnoise(x / 3, y / 1.6, 67) > 0.84 && nx < 0.1;
        const rime = nx < -0.2 && y < tw.top + 14 + 6 * vnoise(x, 2, 69) && vnoise(x / 1.5, y / 3, 70) > 0.4;
        b.set(x + 2, y + 2, ledge || rime ? R.snow[ledge ? 3 : 4] : pick('granite', v, x, y, 0.7));
      }
    }
    if (!tw.cap) continue;
    const capR = (tw.bw * 0.24 + 2.5) * tw.cap;
    for (let y = -5; y <= 4; y++) for (let x = -Math.ceil(capR); x <= Math.ceil(capR); x++) {
      const e = sq(x / capR) + sq(y / (y < 0 ? 5 : 3.5)); if (e > 1 + 0.4 * (vnoise(x / 1.5 + tw.cx, y / 1.5, 68) - 0.5)) continue;
      b.set(tw.cx + x + 2, tw.top + 3 + y + 2, pick('snow', 0.95 - 0.45 * (x / capR) - (y > 1 ? 0.35 : 0), x, y, 0.5));
    }
  }
  // The snow apron the needles rise from, cut by the bergschrund.
  for (let y = h - 22; y < h; y++) {
    const f = (y - (h - 22)) / 22;
    for (let x = 0; x < w; x++) {
      // Mounds of snow under each needle, joined lower down.
      const m = Math.max(0, ...towers.map(tw => 1 - Math.abs(x - tw.cx) / (tw.bw * 0.8 + 5)));
      if (f < 0.95 - m * 0.85 - 0.15 * (vnoise(x / 4, y / 4, 72) - 0.5) || Math.abs(x - w / 2 + 6) > lerp(34, 54, f) + 3 * (vnoise(y / 2, 1, 73) - 0.5)) continue;
      const berg = Math.abs(y - (h - 13 + 2.5 * Math.sin(x / 14))) < 0.8 && Math.abs(x - w / 2) < 48;
      b.set(x + 2, y + 2, berg ? R.ice[0] : pick('snow', 0.8 - (x / w - 0.5) * 0.8 - f * 0.15, x, y, 0.5));
    }
  }
  outline(b, INK);
  // The foot runs on into the glacier on the ground, so it carries no outline.
  for (let y = b.h - 6; y < b.h; y++) for (let x = 0; x < b.w; x++) { const i = y * b.w + x; if (b.d[i] === INK) b.d[i] = b.d[i - b.w] && b.d[i - b.w] !== INK ? b.d[i - b.w] : 0; }
  return b;
}

function makePeak() {
  const { w, h } = PEAK, b = new BM(w + 2, h + 2); b.ox = (w >> 1) + 1; b.oy = h;
  const sx = w * 0.48;
  const top = x => 2 + Math.abs(x - sx) * (x < sx ? 1.42 : 1.2) + 8 * (vnoise(x / 6, 1, 51) - 0.5) - 16 * Math.exp(-sq((x - w * 0.8) / 10));
  for (let x = 0; x < w; x++) {
    const t0 = Math.round(top(x)); if (t0 >= h) continue;
    for (let y = Math.max(0, t0); y < h; y++) {
      const face = x < sx ? 0.2 : -0.18;
      // Ridges fan out from the summit; each facet is lit on one side and shaded on the other.
      const fr = frac((x - sx) / Math.max(2, y) * 2.6 + 0.35 * vnoise(x / 7, y / 7, 57));
      let v = 0.5 + face + (fr < 0.5 ? 0.13 : -0.13) + 0.14 * (vnoise(x / 4, y / 5, 52) - 0.5);
      if (Math.abs(fr - 0.5) > 0.45) v += 0.2;
      const snowLine = 50 + 16 * vnoise(x / 10, 3, 53) - Math.abs(x - sx) * 0.22 + (fr < 0.5 ? 6 : -4);
      const gully = fr > 0.6 && fr < 0.75 && y < 84;
      const forest = y > h - 18 - 7 * vnoise(x / 5, 7, 54);
      let c;
      if (forest) c = pick('conifer', 0.25 + 0.5 * hash(x, y, 56), x, y);
      else if (y < snowLine || gully) c = pick('snow', v + 0.15, x, y);
      else c = pick('rock', v - 0.05, x, y);
      b.set(x + 1, y + 1, c);
    }
  }
  outline(b, INK);
  return b;
}

// ---------------------------------------------------------------------------------------------
// Trees. Each is a still trunk plus leaf clumps that move on their own, a pixel at a time, as in
// the usual 2D wind technique: a wave runs along the wind, gusts widen it, and still air stops it.

function clump(r, name, rand, hang) {
  const S = Math.ceil(r * 2.6) + 4, b = new BM(S, S + hang), c = S / 2;
  const blobs = [[0, 0, r]];
  for (let k = 0; k < 3; k++) { const a = rand() * TAU; blobs.push([Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.5, r * (0.5 + rand() * 0.2)]); }
  const ramp = R[name];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x - c, dy = y - c;
    if (!blobs.some(([bx, by, br]) => sq(dx - bx) + sq(dy - by) <= br * br)) continue;
    const nx = dx / (r * 1.3), ny = dy / (r * 1.2);
    let v = 0.52 + 0.46 * (-0.55 * nx - 0.78 * ny) + (hash(x, y, r * 13 | 0) - 0.5) * 0.36;
    if (hash(x + 3, y, 9) < 0.1) v += 0.25;
    b.set(x, y, ramp[clamp(Math.round(v * (ramp.length - 1) + (bayer(x, y) - 0.5) * 0.8), 1, ramp.length - 1)]);
  }
  outline(b, ramp[0]);
  // Moss hangs from the limbs of the rainforest maples.
  for (let k = 0; k < hang && k < 4; k++) {
    const x = Math.round(c + (rand() - 0.5) * r * 1.4); let y = S - 1; while (y > 0 && !b.get(x, y)) y--;
    const len = 2 + (rand() * hang) | 0;
    for (let j = 1; j <= len; j++) b.set(x, y + j, j === len ? R.moss[4] : R.moss[5]);
  }
  b.cx = c; b.cy = c;
  return b;
}
function makeMaple(seed) {
  const rand = rng(seed), H = 38 + (rand() * 10 | 0), W = 34;
  const trunk = new BM(W, H + 2);
  const bx = W / 2, top = [bx + (rand() - 0.5) * 6, H * 0.42];
  const mid = [bx + (rand() - 0.5) * 8, H * 0.72];
  const barkCol = (x, y) => (x < bx - 0.5 + (y < H * 0.6 ? 1 : 0)) || hash(x, y, 3) < 0.35 ? R.moss[hash(x, y, 4) < 0.5 ? 4 : 3] : R.bark[hash(x, y, 5) < 0.5 ? 1 : 2];
  for (let t = 0; t <= 1; t += 0.02) {
    const p = t < 0.5 ? [lerp(bx, mid[0], t * 2), lerp(H, mid[1], t * 2)] : [lerp(mid[0], top[0], t * 2 - 1), lerp(mid[1], top[1], t * 2 - 1)];
    const wdt = t < 0.08 ? 6 : t < 0.5 ? 4 : 3;
    for (let dx = 0; dx < wdt; dx++) trunk.set(p[0] - wdt / 2 + dx, p[1], barkCol(Math.round(p[0] - wdt / 2 + dx), Math.round(p[1])));
  }
  for (const s of [-1, 1]) thick(trunk, mid[0], mid[1] - 2, mid[0] + s * (6 + rand() * 4), H * 0.36, 2, R.moss[4]);
  outline(trunk, INK);
  const parts = [{ bm: trunk, x: -Math.round(bx), y: -H, sway: 0 }];
  const n = 6 + (rand() * 3 | 0), cs = [];
  for (let k = 0; k < n; k++) cs.push([top[0] + (rand() - 0.5) * 22, H * 0.3 + (rand() - 0.5) * 18, 5 + rand() * 2.5]);
  // A darker copy of the canopy sits behind the clumps, so a lifted clump shows shadowed leaves, not sky.
  const inside = new BM(W, H);
  for (const [x, y, r] of cs) disc(inside, x, y, r - 0.5, () => R.moss[1]);
  parts.push({ bm: inside, x: -Math.round(bx), y: -H, sway: 0 });
  cs.sort((a, c) => a[1] - c[1]);
  for (const [x, y, r] of cs) { const bm = clump(r, 'moss', rand, 6); parts.push({ bm, x: Math.round(x - bm.cx - bx), y: Math.round(y - bm.cy - H), sway: 1, lx: x - bx }); }
  return { parts, h: H, w: W };
}
function makeConifer(seed, H, W, name, tiers) {
  const rand = rng(seed), parts = [];
  const trunk = new BM(5, H + 1);
  for (let y = Math.round(H * 0.2); y <= H; y++) { trunk.set(1, y, R.bark[2]); trunk.set(2, y, R.bark[1]); if (y > H - 4) trunk.set(3, y, R.bark[1]); }
  outline(trunk, INK);
  parts.push({ bm: trunk, x: -2, y: -H, sway: 0 });
  const ramp = R[name];
  for (let i = 0; i < tiers; i++) {
    const f = (i + 1) / tiers, hw = Math.max(1.5, W / 2 * Math.pow(f, 0.9) + (rand() - 0.5) * 1.5), th = 4 + (f > 0.5 ? 1 : 0);
    const bm = new BM(Math.ceil(hw * 2) + 5, th + 5), cx = bm.w / 2;
    for (let dx = -Math.floor(hw); dx <= Math.ceil(hw); dx++) {
      const a = Math.abs(dx) / hw; if (a > 1) continue;
      const y0 = 1 + a * a * 2.5 + (i === 0 ? 0 : 0), t = th * (1 - a * 0.55);
      for (let j = 0; j < t; j++) {
        let v = 0.78 - j / th * 0.6 - dx / hw * 0.2 + (hash(dx, j + i * 7, seed) - 0.5) * 0.3;
        bm.set(cx + dx, y0 + j + 1, ramp[clamp(Math.round(v * (ramp.length - 1) + (bayer(dx & 3, j) - 0.5) * 0.7), 1, ramp.length - 1)]);
      }
    }
    if (i === 0) { bm.set(cx, 0, ramp[2]); bm.set(cx, 1, ramp[3]); }
    outline(bm, ramp[0]);
    const y = -H + 2 + i * (H * 0.82) / tiers;
    parts.push({ bm, x: Math.round(-cx + 0.5), y: Math.round(y - 1), sway: 1 - f * 0.6, lx: 0 });
  }
  return { parts, h: H, w: W };
}
const makeSpruce = seed => { const r = rng(seed); return makeConifer(seed, 52 + (r() * 16 | 0), 26 + (r() * 8 | 0), 'conifer', 9); };
const makeFir = seed => { const r = rng(seed); return makeConifer(seed, 22 + (r() * 12 | 0), 9 + (r() * 4 | 0), 'conifer', 6); };

function makeFern(seed) {
  const rand = rng(seed), b = new BM(11, 7); b.ox = 5; b.oy = 6;
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k - 2) * 0.55 + (rand() - 0.5) * 0.2;
    for (let j = 1; j <= 4 + (k === 2 ? 1 : 0); j++) {
      const x = 5 + Math.cos(a) * j * 1.2, y = 6 + Math.sin(a) * j * 0.9 + (Math.abs(k - 2) > 1 ? j * 0.25 : 0);
      b.set(x, y, j > 3 ? R.moss[5] : R.moss[4]);
    }
  }
  return b;
}
function makeBoulder(seed, r) {
  const rand = rng(seed), b = new BM(Math.ceil(r * 2.4) + 4, Math.ceil(r * 1.6) + 4); b.ox = b.w >> 1; b.oy = b.h - 2;
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    const nx = (x - b.ox) / (r * 1.15), ny = (y - (b.oy - r * 0.6)) / (r * 0.7);
    if (nx * nx + ny * ny > 1 + 0.25 * (vnoise(x / 2, y / 2, seed) - 0.5) || y > b.oy) continue;
    b.set(x, y, pick('rock', 0.6 - nx * 0.25 - ny * 0.3 + (rand() - 0.5) * 0.15, x, y));
  }
  outline(b, INK);
  return b;
}
function makeLog() {
  const b = new BM(22, 8); b.ox = 11; b.oy = 7;
  for (let x = 1; x < 20; x++) for (let y = 2; y < 7; y++) b.set(x, y, y < 3 ? R.moss[5] : y < 4 ? R.moss[4] : R.bark[y < 5 ? 2 : 1]);
  for (let y = 2; y < 7; y++) b.set(20, y, R.wood[3]);
  b.set(20, 4, R.wood[1]);
  outline(b, INK);
  return b;
}
function makeCloud(seed) {
  const rand = rng(seed), b = new BM(56, 20); b.ox = 0; b.oy = 0;
  const blobs = []; for (let k = 0; k < 6; k++) blobs.push([8 + k * 8 + rand() * 4, 12 - rand() * 6 - (k > 1 && k < 4 ? 4 : 0), 5 + rand() * 4]);
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    if (!blobs.some(([bx, by, r]) => sq(x - bx) + sq((y - by) * 1.3) <= r * r) || y > 16) continue;
    b.set(x, y, y > 12 ? R.sky[3] : (y > 10 && bayer(x, y) > 0.5) ? R.sky[4] : R.white[1]);
  }
  return b;
}

// Signs and small built things.
function makeSignpost() {
  const b = new BM(19, 22); b.ox = 9; b.oy = 21;
  for (let y = 5; y < 22; y++) { b.set(8, y, R.wood[2]); b.set(9, y, R.wood[1]); }
  const plank = (x0, x1, y, dir, dot) => {
    for (let x = x0; x <= x1; x++) { b.set(x, y, R.wood[4]); b.set(x, y + 1, R.wood[3]); b.set(x, y + 2, R.wood[2]); }
    const tip = dir < 0 ? x0 - 1 : x1 + 1; b.set(tip, y + 1, R.wood[3]);
    b.set(dir < 0 ? x1 - 1 : x0 + 1, y + 1, dot);
  };
  plank(1, 8, 6, -1, R.water[3]);
  plank(10, 17, 10, 1, R.snow[4]);
  for (let y = 1; y < 5; y++) { b.set(8, y, R.wood[4]); b.set(9, y, R.wood[3]); }
  b.set(8, 0, R.wood[4]); b.set(9, 2, R.gold[5]);
  outline(b, INK);
  return b;
}
function makeSmallSign() {
  const b = new BM(13, 16); b.ox = 6; b.oy = 15;
  for (let y = 6; y < 16; y++) { b.set(6, y, R.wood[2]); }
  for (let y = 2; y < 7; y++) for (let x = 1; x < 12; x++) b.set(x, y, y === 6 ? R.wood[2] : R.wood[4]);
  for (let x = 3; x < 10; x += 2) b.set(x, 4, R.wood[1]);
  outline(b, INK);
  return b;
}
function makeKiosk() {
  const b = new BM(26, 26); b.ox = 13; b.oy = 25;
  for (let y = 8; y < 26; y++) { b.set(4, y, R.wood[1]); b.set(21, y, R.wood[1]); }
  for (let y = 9; y < 20; y++) for (let x = 5; x < 21; x++) b.set(x, y, R.wood[2]);
  for (const [x0, y0, w, h] of [[6, 10, 5, 4], [12, 10, 7, 3], [7, 15, 4, 3], [13, 14, 6, 4]]) for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) b.set(x, y, x === x0 + w - 1 ? R.white[0] : R.white[1]);
  b.set(15, 15, R.red[1]); b.set(16, 15, R.red[1]);
  for (let j = 0; j < 7; j++) for (let x = 12 - j * 2; x <= 13 + j * 2; x++) b.set(x, j + 1, j > 4 ? R.wood[0] : R.red[j < 2 ? 2 : 1]);
  outline(b, INK);
  return b;
}
function makeTent(c) {
  const b = new BM(16, 11); b.ox = 8; b.oy = 10;
  for (let y = 0; y < 10; y++) for (let x = 8 - y * 0.75; x <= 8 + y * 0.75; x++) b.set(x, y + 1, x < 8 ? R[c][2] : R[c][1]);
  for (let y = 6; y < 10; y++) b.set(8, y + 1, R.ink[0]);
  outline(b, INK);
  return b;
}
function makeJournal() {
  const b = makeBoulder(81, 6);
  const x = b.ox - 2, y = b.oy - 8;
  for (let dx = 0; dx < 5; dx++) { b.set(x + dx, y, R.white[1]); b.set(x + dx, y + 1, R.red[1]); }
  b.set(x + 2, y, R.white[0]);
  return b;
}

// The runner, drawn from a pose each frame: a chibi with a big head, as SNES sprites are, then
// outlined in one pass.
function ik(hx, hy, fx, fy, a, b, forward) {
  const dx = fx - hx, dy = fy - hy, d = Math.min(a + b - 0.01, Math.hypot(dx, dy)), base = Math.atan2(dy, dx);
  const al = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
  const k1 = [hx + a * Math.cos(base - al), hy + a * Math.sin(base - al)], k2 = [hx + a * Math.cos(base + al), hy + a * Math.sin(base + al)];
  return (k1[0] > k2[0]) === forward ? k1 : k2;
}
function makeRunner() {
  const W = 22, H = 30;
  const side = (f, moving) => {
    const b = new BM(W, H); b.ox = 11; b.oy = 28;
    const bob = moving ? [0, -1, -1, 0, -1, -1][f] : (f & 1 ? 0 : 0);
    const hip = [11, 20 + bob], sh = [12, 14 + bob];
    const FEET = [[4, 8], [1, 8.5], [-2, 8], [-5, 5], [-2, 3], [3, 5.5]];
    const HANDS = [[-3, 5], [-2, 6], [1, 6], [3, 4], [2, 5], [-1, 6]];
    const leg = (ph, dark) => {
      const [fx, fy] = moving ? FEET[ph] : [ph === 0 ? 1 : -1, 8.5];
      const k = ik(hip[0], hip[1], hip[0] + fx, hip[1] + fy, 4.6, 4.6, true);
      thick(b, hip[0], hip[1], k[0], k[1], 2, t => t < 0.5 ? R.navy[dark ? 0 : 1] : R.skin[dark ? 1 : 2]);
      thick(b, k[0], k[1], hip[0] + fx, hip[1] + fy, 2, R.skin[dark ? 1 : 2]);
      const sx = Math.round(hip[0] + fx), sy = Math.round(hip[1] + fy);
      for (let dx = -1; dx <= 2; dx++) b.set(sx + dx, sy + 1, dx === 2 ? R.shoe[0] : R.shoe[dark ? 0 : 1]);
      b.set(sx, sy, R.shoe[2]);
    };
    const arm = (ph, dark) => {
      const [hx, hy] = moving ? HANDS[ph] : [ph === 0 ? 1 : -1, 6.5];
      const e = ik(sh[0], sh[1], sh[0] + hx, sh[1] + hy, 3.2, 3.2, false);
      thick(b, sh[0], sh[1], e[0], e[1], 2, t => t < 0.45 ? R.teal[dark ? 0 : 1] : R.skin[dark ? 1 : 2]);
      thick(b, e[0], e[1], sh[0] + hx, sh[1] + hy, 2, R.skin[dark ? 1 : 2]);
    };
    arm((f + 3) % 6, true); leg((f + 3) % 6, true);
    for (let y = sh[1] - 1; y <= hip[1]; y++) for (let x = -2; x <= 2; x++) {
      const lean = Math.round((hip[1] - y) / 6);
      b.set(hip[0] + x + lean, y, y >= hip[1] - 1 ? R.navy[1] : x === -2 ? R.teal[0] : x === 2 ? R.teal[2] : R.teal[1]);
    }
    leg(f, false); arm(f, false);
    const cx = 13, cy = 8 + bob;
    disc(b, cx, cy, 5, (nx, ny) => {
      if (ny < -0.25) return ny < -0.45 ? R.blaze[nx < 0 ? 2 : 1] : R.blaze[0];
      if (nx < -0.35) return R.hair[1];
      return R.skin[nx > 0.4 ? 1 : 2];
    });
    for (let x = cx + 3; x <= cx + 6; x++) b.set(x, cy - 2, R.blaze[0]);
    b.set(cx + 2, cy, INK); b.set(cx, cy + 1, R.skin[0]);
    outline(b, INK);
    return b;
  };
  const front = (f, moving, back) => {
    const b = new BM(W, H); b.ox = 11; b.oy = 28;
    const bob = moving ? [0, -1, 0, -1][f] : 0;
    const lift = moving ? [[0, 2], [1, 1], [2, 0], [1, 1]][f] : [0, 0];
    for (let s = 0; s < 2; s++) {
      const x = s ? 13 : 9, up = lift[s];
      for (let y = 20 + bob; y <= 27 - up; y++) { b.set(x, y, y < 22 + bob ? R.navy[1] : R.skin[s ? 1 : 2]); b.set(x + 1, y, y < 22 + bob ? R.navy[1] : R.skin[1]); }
      b.set(x, 28 - up, R.shoe[1]); b.set(x + 1, 28 - up, R.shoe[1]); b.set(x - (s ? 0 : 1), 28 - up, R.shoe[0]);
    }
    for (let y = 13 + bob; y <= 21 + bob; y++) for (let x = 8; x <= 14; x++) b.set(x, y, y >= 20 + bob ? R.navy[1] : x < 10 ? R.teal[2] : x > 12 ? R.teal[0] : R.teal[1]);
    // Arms swing beside the body, a sleeve and then a bare forearm, each a column apart from the shirt.
    const swing = moving ? [1, 0, -1, 0][f] : 0;
    for (let s = 0; s < 2; s++) {
      const x = s ? 16 : 6, dy = s ? -swing : swing;
      for (let y = 13 + bob; y <= 19 + bob + dy; y++) { b.set(x, y, y < 15 + bob ? R.teal[s ? 0 : 1] : R.skin[s ? 1 : 2]); b.set(s ? 15 : 7, y, y < 15 + bob ? R.teal[s ? 0 : 2] : 0); }
    }
    const cx = 11, cy = 8 + bob;
    disc(b, cx, cy, 5.2, (nx, ny) => {
      if (ny < -0.2) return ny < -0.45 ? R.blaze[nx < 0 ? 2 : 1] : R.blaze[0];
      if (back) return R.hair[ny > 0.6 ? 0 : 1];
      if (Math.abs(nx) > 0.72) return R.hair[1];
      return R.skin[nx > 0.3 ? 1 : 2];
    });
    if (!back) { b.set(cx - 2, cy + 1, INK); b.set(cx + 2, cy + 1, INK); b.set(cx, cy + 3, R.skin[0]); }
    outline(b, INK);
    return b;
  };
  return {
    side: [0, 1, 2, 3, 4, 5].map(f => side(f, true)), sideIdle: [side(0, false)],
    down: [0, 1, 2, 3].map(f => front(f, true, false)), downIdle: [front(0, false, false)],
    up: [0, 1, 2, 3].map(f => front(f, true, true)), upIdle: [front(0, false, true)]
  };
}

// TJ's two cats: a tortie and a Nebelung, both long-haired.
function makeElk(headDown) {
  const b = new BM(24, 20); b.ox = 11; b.oy = 19;
  for (let y = 0; y < 20; y++) for (let x = 0; x < 24; x++) {
    const nx = (x - 10) / 7, ny = (y - 10) / 3.6;
    if (nx * nx + ny * ny <= 1) b.set(x, y, x > 13 ? R.dirt[3] : pick('bark', 0.75 - ny * 0.4, x, y, 0.5));
  }
  for (const [lx, d] of [[5, 1], [7, 0], [12, 1], [14, 0]]) for (let y = 12; y < 20; y++) b.set(lx, y, R.bark[d ? 1 : 2]);
  const hx = headDown ? 3 : 2, hy = headDown ? 15 : 3;
  thick(b, 5, 9, hx + 1, hy + 1, 2, R.bark[1]);
  disc(b, hx, hy, 2, () => R.bark[2]);
  b.set(hx - 2, hy + 1, R.bark[0]);
  if (!headDown) { thick(b, hx + 1, hy - 1, hx + 4, hy - 4, 1, R.white[0]); thick(b, hx, hy - 1, hx - 3, hy - 4, 1, R.white[0]); b.set(hx + 3, hy - 2, R.white[0]); b.set(hx - 2, hy - 2, R.white[0]); }
  b.set(17, 9, R.bark[1]);
  outline(b, INK);
  return b;
}
function makeSlug() {
  const b = new BM(8, 4); b.ox = 4; b.oy = 3;
  for (let x = 1; x < 7; x++) b.set(x, 2, R.yellow[1]);
  for (let x = 2; x < 6; x++) b.set(x, 1, R.yellow[1]);
  b.set(6, 1, R.yellow[0]); b.set(7, 0, R.yellow[0]);
  outline(b, INK);
  return b;
}
function makeBird(f) {
  const b = new BM(7, 4); b.ox = 3; b.oy = 2;
  const ys = f ? [0, 1, 2, 2, 2, 1, 0] : [2, 2, 1, 2, 1, 2, 2];
  ys.forEach((y, x) => b.set(x, y, INK));
  return b;
}
function makeCat(name, pose, seed) {
  const b = new BM(16, 12); b.ox = 8; b.oy = 11;
  const ramp = R[name], col = (x, y, v) => {
    if (name === 'tortie') { const n = vnoise(x / 2.2, y / 2.2, seed); return n > 0.62 ? ramp[3] : n > 0.5 ? ramp[2] : ramp[v > 0.6 ? 1 : 0]; }
    return ramp[clamp(Math.round(v * 3), 0, 3)];
  };
  const crouch = pose === 'crouch', leap = pose === 'leap';
  const bodyY = crouch ? 8.5 : leap ? 6 : 7.5, bodyR = leap ? 4.2 : 3.4;
  for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) {
    const nx = (x - 7) / (bodyR * (leap ? 1.4 : 1.15)), ny = (y - bodyY) / (bodyR * 0.85);
    if (nx * nx + ny * ny <= 1) b.set(x, y, col(x, y, 0.65 - ny * 0.3 - nx * 0.1));
  }
  const hx = leap ? 12 : crouch ? 11 : 10, hy = crouch ? 7 : leap ? 4.5 : 4;
  disc(b, hx, hy, 2.6, (nx, ny, x, y) => col(x, y, 0.75 - ny * 0.3));
  b.set(hx - 2, hy - 3, ramp[name === 'tortie' ? 0 : 1]); b.set(hx + 1, hy - 3, ramp[name === 'tortie' ? 2 : 1]);
  b.set(hx + 1, hy - 0.5, name === 'tortie' ? R.yellow[1] : R.yellow[1]);
  const tail = pose === 'sitB' ? [[3, 9], [1, 7], [1, 5]] : pose === 'sitA' ? [[3, 9], [1, 9], [0, 7]] : [[3, bodyY], [1, bodyY - 1], [0, bodyY - 3]];
  for (const [x, y] of tail) { b.set(x, y, col(x, y, 0.5)); b.set(x + 1, y, col(x + 1, y, 0.4)); }
  if (!leap) for (const x of [5, 9]) b.set(x, 11, col(x, 11, 0.3));
  outline(b, name === 'nebel' ? (x, y) => (hash(x, y, 2) < 0.3 ? R.nebel[1] : INK) : INK);
  return b;
}

// ---------------------------------------------------------------------------------------------

export async function mount(canvas, { onEvent = () => {}, theme = 'light' } = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const rand = rng(2026);
  const paths = {}; for (const k in ROUTES) paths[k] = makePath(ROUTES[k]);

  // The trail mask: 2 on the tread, 1 on its dark edge. Then a distance to the nearest tread,
  // used to keep trees off the trail and from hiding the runner.
  const trail = new Uint8Array(WW * WH);
  for (const k in paths) for (const [px, py] of paths[k].pts) {
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const d = Math.hypot(dx, dy), x = Math.round(px + dx), y = Math.round(py + dy), v = d <= 1.9 ? 2 : d <= 2.9 ? 1 : 0;
      if (v && x >= 0 && y >= 0 && x < WW && y < WH && trail[y * WW + x] < v) trail[y * WW + x] = v;
    }
  }
  const dist = new Uint8Array(WW * WH).fill(255);
  for (let i = 0; i < dist.length; i++) if (trail[i] === 2) dist[i] = 0;
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) { const i = y * WW + x; if (x > 0) dist[i] = Math.min(dist[i], dist[i - 1] + 1); if (y > 0) dist[i] = Math.min(dist[i], dist[i - WW] + 1); }
  for (let y = WH - 1; y >= 0; y--) for (let x = WW - 1; x >= 0; x--) { const i = y * WW + x; if (x < WW - 1) dist[i] = Math.min(dist[i], dist[i + 1] + 1); if (y < WH - 1) dist[i] = Math.min(dist[i], dist[i + WW] + 1); }
  const distAt = (x, y) => { x = Math.round(x); y = Math.round(y); return x < 0 || y < 0 || x >= WW || y >= WH ? 255 : dist[y * WW + x]; };

  const peakBM = makePeak();
  const ground = buildGround(trail, peakBM);
  const shaftMask = new Uint8Array(WW * WH);
  for (let y = 300; y < WH; y++) for (let x = 0; x < 560; x++) {
    if (forestAmt(x, y) < 0.7) continue;
    const band = frac((x * 0.55 + y) / 64);
    if (band < 0.15 && vnoise((x * 0.55 + y) / 64, (y - x * 0.4) / 40, 77) > 0.42) shaftMask[y * WW + x] = band < 0.05 || band > 0.1 ? 1 : 2;
  }
  decorate(ground, rand);

  // Everything that stands up, sorted by its feet each frame.
  const things = [];
  const put = (bm, x, y, extra = {}) => things.push({ bm, x: Math.round(x), y: Math.round(y), ...extra });
  put(peakBM, PEAK.x, PEAK.y);
  put(makeStack(), STACK.x, STACK.y);
  put(makeSpires(), SPIRES.x, SPIRES.y);

  const maples = Array.from({ length: 8 }, (_, i) => makeMaple(100 + i));
  const spruces = Array.from({ length: 8 }, (_, i) => makeSpruce(200 + i));
  const firs = Array.from({ length: 8 }, (_, i) => makeFir(300 + i));
  // Keep a tree only where its canopy covers neither the trail nor the lake.
  const clear = (x, y, tree) => {
    if (distAt(x, y) < 6) return false;
    for (let dy = 2; dy < tree.h; dy += 4) for (let dx = -tree.w / 2; dx <= tree.w / 2; dx += 4) {
      if (distAt(x + dx, y - dy) < 3) return false;
      if (Math.hypot((x + dx - LAKE.x) / LAKE.rx, (y - dy - LAKE.y) / LAKE.ry) < 1.25) return false;
    }
    return true;
  };
  const trees = [];
  const plant = (tree, x, y) => { if (!clear(x, y, tree)) return false; const t = { tree, x: Math.round(x), y: Math.round(y) }; trees.push(t); things.push({ kind: 'tree', t, x: t.x, y: t.y }); return true; };
  for (let gy = 318; gy < WH + 40; gy += 9) for (let gx = -10; gx < 560; gx += 9) {
    const x = gx + rand() * 9, y = gy + rand() * 9, fa = forestAmt(x, Math.min(y, WH - 1));
    if (rand() > fa * 0.8) continue;
    const r = rand();
    plant(r < 0.45 ? maples[(rand() * 8) | 0] : r < 0.88 ? spruces[(rand() * 8) | 0] : firs[(rand() * 8) | 0], x, y);
  }
  // Subalpine firs in clumps across the meadow and up against the mountains.
  for (let n = 0; n < 900; n++) {
    const x = 470 + rand() * 540, y = 318 + rand() * 420;
    if (fbm(x / 60, y / 60, 71, 3) < 0.56 && !(y < 420 && rand() < 0.35)) continue;
    if (Math.hypot(x - T.x, (y - T.y) * 1.4) < 70 || talus(x, y) > 0.05) continue;
    const gl = glacier(x, y); if (y > 340 && gl.d < gl.w + 8) continue;
    if (Math.abs(x - 612) < 40 && Math.abs(y - 500) < 30) continue;
    plant(firs[(rand() * 8) | 0], x, y);
  }
  // Shadows fall to the north-east of each trunk, onto the ground itself.
  for (const { tree, x, y } of trees) {
    const rx = tree.w * 0.42, ry = 3.2;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
      if (sq(dx / rx) + sq(dy / ry) > 1) continue;
      const gx = x + dx + 2, gy = y + dy - 1; if (gx < 0 || gy < 0 || gx >= WW || gy >= WH) continue;
      const i = gy * WW + gx; if (KIND[ground[i]] && KIND[ground[i]] !== 4) ground[i] = SHADE[ground[i]];
    }
  }
  const ferns = Array.from({ length: 6 }, (_, i) => makeFern(400 + i));
  for (let n = 0; n < 2600; n++) {
    const x = rand() * 560, y = 320 + rand() * 400;
    if (forestAmt(x, y) < 0.6 || distAt(x, y) < 4) continue;
    if (Math.hypot((x - LAKE.x) / LAKE.rx, (y - LAKE.y) / LAKE.ry) < 1.15) continue;
    things.push({ bm: ferns[(rand() * 6) | 0], x: Math.round(x), y: Math.round(y), fern: true });
  }
  const log = makeLog();
  for (let n = 0; n < 40; n++) { const x = rand() * 520, y = 340 + rand() * 360; if (forestAmt(x, y) > 0.7 && distAt(x, y) > 8) put(log, x, y); }
  const boulders = Array.from({ length: 6 }, (_, i) => makeBoulder(500 + i, 3 + i * 0.8));
  for (let n = 0; n < 70; n++) {
    const x = 300 + rand() * 650, y = 340 + rand() * 360;
    if (distAt(x, y) < 6 || lakeD(x, y) < 1.2 || Math.hypot(x - T.x, y - T.y) < 40) continue;
    if (talus(x, y) > 0.1 || forestAmt(x, y) < 0.3 ? rand() < 0.5 : rand() < 0.85) put(boulders[(rand() * 6) | 0], x, y);
  }
  put(makeSignpost(), T.x - 4, T.y - 8);
  put(makeSmallSign(), 506, 471);
  put(makeJournal(), 452, 366);
  put(makeKiosk(), 612, 497);
  // Two climbers high on the wall, on a rope; they sort in front of it by standing on its foot line.
  things.push({ bm: makeClimber('red'), x: 566, y: STACK.y + 1, lift: 70 }, { bm: makeClimber('teal'), x: 569, y: STACK.y + 1, lift: 58 });
  put(makeTent('tent'), 664, 404); put(makeTent('red'), 688, 414);
  const elk = [makeElk(false), makeElk(true)];
  things.push({ critter: 'elk', bm: elk[0], x: 516, y: 446 });
  // A banana slug crosses the trail in the forest, and he hops it.
  const slugAt = (() => { const P = paths.lake; let best = 0, bd = 1e9; P.pts.forEach((q, i) => { const d = Math.hypot(q[0] - 372, q[1] - 529); if (d < bd) { bd = d; best = i; } }); return best; })();
  const slugP = paths.lake.pts[slugAt];
  let slugD = 0; for (let i = 1; i <= slugAt; i++) slugD += Math.hypot(paths.lake.pts[i][0] - paths.lake.pts[i - 1][0], paths.lake.pts[i][1] - paths.lake.pts[i - 1][1]);
  put(makeSlug(), slugP[0], slugP[1] + 1);
  const birds = [makeBird(0), makeBird(1)];
  const clouds = [0, 1, 2, 3].map(i => ({ bm: makeCloud(600 + i), x: i * 260 + 40, y: 150 + (i & 1) * 40 + i * 6, v: 3 + i }));
  const runner = makeRunner();
  const cats = { tortie: ['sitA', 'sitB', 'crouch', 'leap'].reduce((o, p) => (o[p] = makeCat('tortie', p, 3), o), {}), nebel: ['sitA', 'sitB', 'crouch', 'leap'].reduce((o, p) => (o[p] = makeCat('nebel', p, 5), o), {}) };

  // ------------------------------------------------------------------ state

  let route = 'lake', p = 0, running = false, shown = null, mode = theme === 'dark' ? 1 : 0, mix = mode;
  let travelled = 0, facing = 'down', flip = false;
  const cam = { x: T.x, y: 0 }, look = { x: 0, y: 0 };
  let S = 3, VW = 480, VH = 300, fb, img, u32;
  const lut = new Uint32Array(256);
  let lastLut = -1;
  const RUN = 78; // pixels a second

  function resize() {
    const dpr = window.devicePixelRatio || 1, Wd = Math.round(innerWidth * dpr), Hd = Math.round(innerHeight * dpr);
    S = Math.max(1, Math.min(Math.floor(Hd / 290), Math.floor(Wd / 280)));
    VW = Math.ceil(Wd / S); VH = Math.ceil(Hd / S);
    canvas.width = VW; canvas.height = VH;
    canvas.style.width = (VW * S / dpr) + 'px'; canvas.style.height = (VH * S / dpr) + 'px';
    fb = new Uint8Array(VW * VH); img = ctx.createImageData(VW, VH); u32 = new Uint32Array(img.data.buffer);
    lastLut = -1;
  }
  resize();
  addEventListener('resize', resize);

  function vista() { return { x: T.x, y: T.y + Math.min(46, VH * 0.17) + 14 - VH / 2 + Math.max(0, VH - 300) * 0.25 }; }
  cam.y = vista().y;

  const path = () => paths[route];
  const stopsNow = () => path().stops;
  function emit(e) { try { onEvent(e); } catch (err) { console.error(err); } }
  function showStop(s) { shown = s; emit({ type: 'stop', id: s.id }); }
  function leave() { if (shown) { shown = null; emit({ type: 'leave' }); } }

  function step(dt) {
    if (!running) return;
    const P = path(), before = p, d = RUN * dt / P.len;
    let next = Math.min(1, p + d);
    const hit = P.stops.find(s => s.at > before + 1e-6 && s.at <= next + 1e-6);
    if (hit) next = hit.at;
    travelled += (next - p) * P.len; p = next;
    if (hit) { running = false; showStop(hit); return; }
    if (p >= 1) { running = false; emit({ type: 'end' }); }
  }

  // ------------------------------------------------------------------ wind

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

  // ------------------------------------------------------------------ drawing

  function blit(bm, sx, sy) {
    sx = Math.round(sx); sy = Math.round(sy);
    const x0 = Math.max(0, -sx), y0 = Math.max(0, -sy), x1 = Math.min(bm.w, VW - sx), y1 = Math.min(bm.h, VH - sy);
    const d = bm.d, w = bm.w;
    for (let j = y0; j < y1; j++) {
      let si = j * w + x0, di = (sy + j) * VW + sx + x0;
      for (let i = x0; i < x1; i++, si++, di++) { const c = d[si]; if (c) fb[di] = c; }
    }
  }
  function shadow(cx, cy, rx, ry) {
    for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) {
      if (sq(dx / rx) + sq(dy / ry) > 1) continue;
      const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= VW || y >= VH) continue;
      fb[y * VW + x] = SHADE[fb[y * VW + x]];
    }
  }
  function updateLut(t) {
    const g = Math.floor(t * 6) & 3, key = Math.round(mix * 64) * 8 + g;
    if (key === lastLut) return; lastLut = key;
    for (let i = 1; i < N; i++) {
      const a = DAY[i], b = DUSK[i];
      let r = lerp(a[0], b[0], mix), gg = lerp(a[1], b[1], mix), bb = lerp(a[2], b[2], mix);
      const k = R.glint.indexOf(i);
      if (k >= 0) {
        const src = k === g ? R.water[5] : k === ((g + 1) & 3) ? R.water[4] : R.water[2];
        r = lerp(DAY[src][0], DUSK[src][0], mix); gg = lerp(DAY[src][1], DUSK[src][1], mix); bb = lerp(DAY[src][2], DUSK[src][2], mix);
      }
      lut[i] = (255 << 24) | (Math.round(bb) << 16) | (Math.round(gg) << 8) | Math.round(r);
    }
  }

  function runnerFrame() {
    if (running || dragging === 'scrub') {
      const set = facing === 'side' ? runner.side : facing === 'up' ? runner.up : runner.down;
      return set[Math.floor(travelled / (facing === 'side' ? 4.2 : 5)) % set.length];
    }
    return facing === 'side' ? runner.sideIdle[0] : facing === 'up' ? runner.upIdle[0] : runner.downIdle[0];
  }

  let last = performance.now(), dragging = null, alive = true, lastAct = performance.now() / 1000;
  const acted = () => { lastAct = performance.now() / 1000; };
  addEventListener('pointerdown', acted); addEventListener('keydown', acted);
  const list = [];
  function draw(now) {
    if (!alive) return;
    requestAnimationFrame(draw);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = now / 1000, tq = Math.floor(t * 10) / 10;
    step(dt);
    mix = lerp(mix, mode, 1 - Math.exp(-dt * 3)); if (Math.abs(mix - mode) < 0.002) mix = mode;

    const P = path(), here = P.at(p);
    if (Math.abs(here.dx) + Math.abs(here.dy) > 0.01 && (running || dragging === 'scrub')) {
      if (Math.abs(here.dx) > Math.abs(here.dy) * 0.7) { facing = 'side'; flip = here.dx < 0; } else facing = here.dy < 0 ? 'up' : 'down';
    }
    if (shown && shown.face && !running) { facing = shown.face === 'left' ? 'side' : shown.face; if (shown.face === 'left') flip = true; }
    if (!running && p === 0 && !shown && dragging !== 'scrub') facing = 'down';

    // Camera: the whole view from the Trailhead, then follow him, then whatever a stop frames.
    const v = vista(), away = Math.min(p * P.len, (1 - p) * P.len + (route === 'lake' ? 0 : 999));
    const k = smooth(0, 60, away);
    const idle = !running && p === 0 && !shown && dragging == null ? now / 1000 - lastAct : 0;
    const drift = idle > 4 ? Math.sin((idle - 4) * 0.16) * Math.max(0, (WW - VW) / 2 - Math.abs(v.x - WW / 2)) * 0.9 * Math.min(1, (idle - 4) / 3) : 0;
    let tx = lerp(v.x + drift, here.x, k), ty = lerp(v.y, here.y - 24, k);
    if (shown && shown.cam && !running) { tx = shown.cam[0]; ty = shown.cam[1]; }
    if (dragging !== 'look') { look.x *= Math.exp(-dt * 2.5); look.y *= Math.exp(-dt * 2.5); }
    const damp = 1 - Math.exp(-dt * 3.2);
    cam.x += (tx - cam.x) * damp; cam.y += (ty - cam.y) * damp;
    let cx = cam.x + look.x, cy = cam.y + look.y;
    cx = VW >= WW ? WW / 2 : clamp(cx, VW / 2, WW - VW / 2);
    cy = VH >= WH ? WH / 2 : clamp(cy, VH / 2, WH - VH / 2);
    const ox = Math.round(cx - VW / 2), oy = Math.round(cy - VH / 2);

    // Ground.
    for (let y = 0; y < VH; y++) {
      const wy = oy + y, row = y * VW;
      if (wy < 0) { fb.fill(R.sky[0], row, row + VW); continue; }
      if (wy >= WH) { fb.fill(R.grass[2], row, row + VW); continue; }
      const a = Math.max(0, ox), b = Math.min(WW, ox + VW);
      if (a > ox) fb.fill(wy < 300 ? R.sky[2] : R.grass[2], row, row + (a - ox));
      if (b < ox + VW) fb.fill(wy < 300 ? R.sky[2] : R.grass[2], row + (b - ox), row + VW);
      if (b > a) fb.set(ground.subarray(wy * WW + a, wy * WW + b), row + (a - ox));
    }
    for (const c of clouds) {
      const x = ((c.x + t * c.v) % (WW + 120)) - 60;
      blit(c.bm, x - ox, c.y - oy);
    }

    // Everything that stands, back to front.
    list.length = 0;
    for (const th of things) {
      const w = th.kind === 'tree' ? th.t.tree.w + 8 : th.bm.w, h = th.kind === 'tree' ? th.t.tree.h + 10 : th.bm.h;
      if (th.x + w < ox || th.x - w > ox + VW || th.y - h > oy + VH || th.y + 4 < oy) continue;
      list.push(th);
    }
    const dSlug = route === 'lake' ? p * P.len - slugD : 99;
    const hop = Math.abs(dSlug) < 9 ? Math.round(5 * Math.cos(dSlug / 9 * Math.PI / 2)) : 0;
    const me = { me: true, x: here.x, y: here.y, hop };
    list.push(me);
    const catT = t % 7;
    list.push({ cat: 'tortie', x: 590, y: 506, pose: catT < 3 ? (Math.floor(t * 1.2) & 1 ? 'sitA' : 'sitB') : catT < 4.2 ? 'crouch' : catT < 4.7 ? 'leap' : 'sitA', dx: catT >= 4.2 && catT < 4.7 ? Math.round((catT - 4.2) * 16) : catT >= 4.7 ? 8 - Math.round(Math.min(1, (catT - 4.7) / 1.5) * 8) : 0 });
    list.push({ cat: 'nebel', x: 604, y: 509, pose: Math.floor(t * 0.9) & 1 ? 'sitB' : 'sitA', dx: 0 });
    list.sort((a, b) => a.y - b.y);
    for (const th of list) {
      if (th.me) {
        const bm = runnerFrame();
        shadow(Math.round(th.x - ox), Math.round(th.y - oy), 5, 2);
        if (flip && facing === 'side') blitFlip(bm, th.x - bm.ox - ox, th.y - th.hop - bm.oy - oy); else blit(bm, th.x - bm.ox - ox, th.y - th.hop - bm.oy - oy);
      } else if (th.cat) {
        const bm = cats[th.cat][th.pose];
        shadow(Math.round(th.x + th.dx - ox), Math.round(th.y - oy), 4, 1);
        blit(bm, th.x + th.dx - bm.ox - ox, th.y - bm.oy - oy - (th.pose === 'leap' ? 3 : 0));
      } else if (th.kind === 'tree') {
        const { tree, x, y } = th.t;
        for (const part of tree.parts) {
          const [wx, wy] = windAt(x + (part.lx || 0), y + part.y, tq, part.sway);
          blit(part.bm, x + part.x + wx - ox, y + part.y + wy - oy);
        }
      } else if (th.critter === 'elk') {
        const down = (t % 9) < 6;
        blit(elk[down ? 1 : 0], th.x - 11 - ox, th.y - 19 - oy);
      } else if (th.fern) {
        const [wx] = windAt(th.x, th.y, tq, 0.6);
        blit(th.bm, th.x - th.bm.ox + wx - ox, th.y - th.bm.oy - oy);
      } else if (th.lift) {
        blit(th.bm, th.x - th.bm.ox - ox, th.y - th.lift - th.bm.oy - oy);
        if (th.lift === 70) for (let j = 1; j < 12; j++) { const x = th.x + Math.round(j * 0.25) - ox, y = th.y - 70 + j - oy; if (x >= 0 && y >= 0 && x < VW && y < VH) fb[y * VW + x] = R.yellow[0]; }
      } else blit(th.bm, th.x - th.bm.ox - ox, th.y - th.bm.oy - oy);
    }

    // Smoke from the stove at base camp, drifting off with the wind.
    for (let k = 0; k < 6; k++) {
      const age = frac(t * 0.35 + k / 6), x = Math.round(673 + age * 10 + Math.sin(age * 6 + k) * 1.5) - ox, y = Math.round(404 - age * 26) - oy;
      if (x < 1 || y < 1 || x >= VW - 1 || y >= VH - 1) continue;
      const c = age < 0.5 ? R.white[1] : R.white[0];
      fb[y * VW + x] = c; if (age > 0.3) fb[y * VW + x + 1] = c;
    }
    // Birds cross the sky in a loose V, flapping a few times a second.
    for (let k = 0; k < 4; k++) {
      const bx = ((t * 22 + k * 11) % (WW + 200)) - 100, by = 150 + 8 * Math.sin(t * 0.7) + [0, 5, 9, 4][k];
      blit(birds[(Math.floor(t * 4) + k) & 1], bx - [0, -9, 9, -17][k] - ox, by - oy);
    }
    // Butterflies over the flowers by the Trailhead.
    for (let k = 0; k < 6; k++) {
      const bx = Math.round(T.x - 120 + k * 52 + 14 * Math.sin(t * 0.9 + k * 2)), by = Math.round(T.y + 10 - (k % 3) * 22 + 6 * Math.sin(t * 1.7 + k));
      const sx = bx - ox, sy = by - oy, col = k % 3 ? R.white[1] : R.yellow[1];
      if (sx < 1 || sy < 1 || sx >= VW - 1 || sy >= VH - 1) continue;
      const open = (Math.floor(t * 8) + k) & 1;
      fb[sy * VW + sx] = INK; fb[sy * VW + sx - 1] = col; fb[sy * VW + sx + 1] = col;
      if (open) { fb[(sy - 1) * VW + sx - 1] = col; fb[(sy - 1) * VW + sx + 1] = col; }
    }
    // Fireflies blink in the forest once the light goes.
    if (mix > 0.4) for (let k = 0; k < 70; k++) {
      const fx = Math.round(40 + hash(k, 1, 90) * 500 + 6 * Math.sin(t * 0.6 + k)), fy = Math.round(330 + hash(k, 2, 90) * 360 + 4 * Math.sin(t * 0.8 + k * 1.7));
      if (forestAmt(fx, fy) < 0.5 || frac(t * 0.4 + hash(k, 3, 90)) > 0.55) continue;
      const sx = fx - ox, sy = fy - oy; if (sx >= 0 && sy >= 0 && sx < VW && sy < VH) fb[sy * VW + sx] = R.yellow[1];
    }
    // Shafts of light slant down through the forest canopy: every other pixel one step lighter.
    for (let y = 0; y < VH; y++) {
      const wy = oy + y; if (wy < 300 || wy >= WH) continue;
      for (let x = (y + oy + ox) & 1; x < VW; x += 2) {
        const wx = ox + x; if (wx < 0 || wx >= WW || !shaftMask[wy * WW + wx]) continue;
        const i = y * VW + x; fb[i] = shaftMask[wy * WW + wx] === 2 ? LIGHT[LIGHT[fb[i]]] : LIGHT[fb[i]];
      }
    }
    updateLut(t);
    for (let i = 0; i < fb.length; i++) u32[i] = lut[fb[i]];
    ctx.putImageData(img, 0, 0);
    window.__info = { p, route, running, VW, VH, S, ox, oy, mx: Math.round(here.x), my: Math.round(here.y) };
  }
  function blitFlip(bm, sx, sy) {
    sx = Math.round(sx); sy = Math.round(sy);
    for (let j = 0; j < bm.h; j++) for (let i = 0; i < bm.w; i++) {
      const c = bm.d[j * bm.w + (bm.w - 1 - i)], x = sx + i, y = sy + j;
      if (c && x >= 0 && y >= 0 && x < VW && y < VH) fb[y * VW + x] = c;
    }
  }
  requestAnimationFrame(draw);

  // Drag to look around; it drifts back when let go.
  let lastPt = null;
  canvas.addEventListener('pointerdown', e => { dragging = 'look'; lastPt = [e.clientX, e.clientY]; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (dragging !== 'look' || !lastPt) return;
    const k = (window.devicePixelRatio || 1) / S;
    look.x = clamp(look.x - (e.clientX - lastPt[0]) * k, -WW, WW); look.y = clamp(look.y - (e.clientY - lastPt[1]) * k, -WH, WH);
    lastPt = [e.clientX, e.clientY];
  });
  const endLook = () => { if (dragging === 'look') dragging = null; lastPt = null; };
  canvas.addEventListener('pointerup', endLook); canvas.addEventListener('pointercancel', endLook);

  const stopNear = q => stopsNow().find(s => Math.abs(s.at - q) < 0.006);
  const api = {
    stops: () => stopsNow().map(s => ({ id: s.id, at: s.at })),
    route: () => route,
    setRoute(r) { if (!paths[r]) return; route = r; p = 0; running = false; leave(); },
    theme: () => mode ? 'dark' : 'light',
    setTheme(th) { mode = th === 'dark' ? 1 : 0; },
    start() { if (p >= 1) p = 0; leave(); running = true; },
    stop() { running = false; },
    toggle() { if (running) running = false; else api.start(); },
    running: () => running,
    progress: () => p,
    scrub(f) {
      const before = p; p = clamp(f, 0, 1); running = false; travelled += Math.abs(p - before) * path().len;
      dragging = 'scrub'; clearTimeout(api._t); api._t = setTimeout(() => { if (dragging === 'scrub') dragging = null; }, 160);
      const s = stopNear(p); if (s) { if (shown !== s) { shown = null; showStop(s); } } else leave();
    },
    key(code) {
      if (code === 'Space') { api.toggle(); return true; }
      if (code === 'ArrowRight' || code === 'ArrowLeft') {
        const st = stopsNow(), fwd = code === 'ArrowRight';
        const s = fwd ? st.find(q => q.at > p + 1e-4) : [...st].reverse().find(q => q.at < p - 1e-4);
        running = false;
        if (s) { p = s.at; shown = null; showStop(s); } else { p = fwd ? 1 : 0; leave(); if (fwd && route === 'lake') emit({ type: 'end' }); }
        return true;
      }
      return false;
    },
    info: () => ({ lengths: Object.fromEntries(Object.entries(paths).map(([k, v]) => [k, Math.round(v.len * KM * 10) / 10])) }),
    dispose() { alive = false; }
  };
  return api;
}
