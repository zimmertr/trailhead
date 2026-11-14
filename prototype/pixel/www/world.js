// The world map: the top-down view of the Trailhead and its three destinations.
import { TAU, clamp, lerp, smooth, frac, sq, rng, hash, vnoise, fbm, bayer, R, RAMP_OF, INK, SHADE, LIGHT, KIND, pick, BM, outline, disc, thick, makePath, windAt } from './core.js';
import { makeMaple, makeSpruce, makeFir, makeFern, makeBoulder, makeLog, makeCloud, makeSignpost, makeSmallSign, makeKiosk, makeTent, makeJournal, makeElk, makeSlug, makeBird, makeSnag, makeBush, makeFlag } from './sprites.js';
import { makeCats } from './cats.js';
import { makeRunner } from './tj.js';
// ---------------------------------------------------------------------------------------------
// The world. Pixel coordinates, x east, y south. North is up the screen, so the three
// destinations stand along the top of the meadow: the forest and About Lake on the left,
// The Stack in the middle, Sideproject Spires on the right.

const WW = 1000, WH = 720;
const T = { x: 560, y: 470 };
const LAKE = { x: 385, y: 372, rx: 46, ry: 15 };
const GL = { x0: 716, y0: 350, x1: 698, y1: 424 };
const STACK = { x: 545, y: 384, w: 160, h: 120 };
const SPIRES = { x: 715, y: 362, w: 184, h: 140 };
const PEAK = { x: 385, y: 354, w: 150, h: 112 };
const KM = 0.008; // kilometres per pixel along a trail, for the sign's distances

const ROUTES = {
  lake: {
    pts: [[560, 470], [528, 475], [494, 481], [462, 494], [428, 512], [390, 527], [350, 525], [318, 503], [302, 470], [310, 438], [334, 412], [362, 398], [384, 395], [410, 393], [432, 386], [446, 373], [454, 390], [476, 422], [503, 447], [532, 462], [560, 470]],
    stops: []
  },
  stack: { pts: [[560, 470], [558, 452], [553, 430], [549, 410], [546, 393]], stops: [] },
  spires: { pts: [[560, 470], [586, 463], [620, 452], [650, 440], [668, 426], [676, 410]], stops: [] }
};

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
const moraine = (x, y) => (y > 350 && y < 380 && Math.abs(x - SPIRES.x) < 100) ? smooth(378, 360, y + 5 * vnoise(x / 6, 1, 15)) * smooth(100, 84, Math.abs(x - SPIRES.x)) * 0.8 : 0;
const skirt = (x, y) => (y > PEAK.y - 6 && y < PEAK.y + 16) ? smooth(PEAK.y + 14, PEAK.y, y + 5 * vnoise(x / 7, 1, 16)) * smooth(82, 66, Math.abs(x - PEAK.x)) : 0;
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
    if (y < 304 + 7 * (fbm(x / 9, 3.3, 14, 2) - 0.5)) { g[i] = pick('hill', 0.25 + 0.6 * vnoise(x / 2.5, y / 2, 5), x, y); continue; }
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
        if (cre < 0.07 && gl.d < gl.w - 3 && vnoise(x / 5, y / 3, 3) > 0.35) { g[i] = cre < 0.04 ? R.glac[0] : R.glac[2]; continue; }
        const lit = 0.72 - 0.3 * gl.side / gl.w + 0.18 * (vnoise(x / 4, y / 4, 8) - 0.5) - gl.t * 0.15;
        g[i] = gl.t > 0.8 && hash(x >> 1, y >> 1, 9) < (gl.t - 0.8) * 2 ? R.rock[1] : pick('glac', lit + 0.08, x, y, 0.6);
        continue;
      }
      if (gl.d < gl.w + 5) { g[i] = pick('rock', 0.2 + 0.55 * hash(x >> 1, y >> 1, 11), x, y); continue; }
    }
    const tr = trail[i];
    if (tr === 2) { g[i] = hash(x, y, 5) < 0.1 ? R.dirt[2] : (hash(x, y, 6) < 0.15 ? R.dirt[4] : R.dirt[3]); continue; }
    if (tr === 1) { g[i] = R.dirt[1]; continue; }
    const tal = Math.max(talus(x, y), moraine(x, y));
    if (tal > 0 && hash(x >> 1, y >> 1, 12) < tal * 0.9) { g[i] = pick('rock', 0.15 + 0.75 * hash(x >> 1, y >> 1, 13), x, y); continue; }
    const fa = forestAmt(x, y);
    if (fa > 0.5) {
      // Light falls through the canopy in long diagonal patches.
      const shaft = fbm(x / 34 + y / 70, y / 26, 21, 3);
      g[i] = pick('moss', 0.16 + 0.3 * fbm(x / 18, y / 18, 22, 3) + smooth(0.56, 0.7, shaft) * 0.4, x, y);
      continue;
    }
    g[i] = pick('grass', 0.56 + 0.55 * (fbm(x / 26, y / 26, 31, 3) - 0.5) + 0.14 * (hash(x >> 1, y >> 1, 32) - 0.5) - fa * 0.45 - smooth(300, 345, y) * 0.1 - skirt(x, y) * 0.38 - smooth(312, 302, y) * 0.25, x, y, 0.3);
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

// Sideproject Spires: one jagged, glaciated massif with six summits, one per project. Each summit
// is its own pyramid of fanned ridges, the tallest at the back, with glacier ice hanging between
// them and pouring out of the middle onto the glacier on the ground.
const SUMMITS = [
  { id: 'yggdrasil', cx: 26, top: 78, sl: 2.3, sr: 1.9 },
  { id: 'hevy-garmin-sync', cx: 52, top: 47, sl: 2.5, sr: 2.2 },
  { id: 'bluebird', cx: 80, top: 5, sl: 2.3, sr: 2.0 },
  { id: 'tks', cx: 109, top: 29, sl: 2.2, sr: 2.6 },
  { id: 'trailhead', cx: 136, top: 55, sl: 2.4, sr: 2.0 },
  { id: 'kubernetes-manifests', cx: 159, top: 82, sl: 2.0, sr: 2.3 }
];
function makeMassif() {
  const { w, h } = SPIRES, b = new BM(w + 2, h + 2); b.ox = (w >> 1) + 1; b.oy = h;
  const sky = (s, i, x) => {
    const dx = Math.abs(x - s.cx);
    return s.top + dx * (x < s.cx ? s.sl : s.sr) + 6 * (1 - Math.exp(-dx / 2.5)) + 8 * (vnoise(x / 4.5, i * 3.1, 61) - 0.5) * Math.min(1, dx / 4) - 5 * Math.max(0, vnoise(x / 2.2, i, 62) - 0.64) / 0.36 * Math.min(1, dx / 5);
  };
  const order = SUMMITS.map((s, i) => i).sort((a, c) => SUMMITS[a].top - SUMMITS[c].top);
  const skyAll = x => Math.min(...SUMMITS.map((s, i) => sky(s, i, x)));
  // Under each summit a rock buttress runs to the foot; the cirques between them hold the ice.
  const rib = (x, y) => SUMMITS.some((s, j) => y > s.top && Math.abs(x - s.cx - 3 * Math.sin(y / 11 + j * 2)) < 1.5 + (y - s.top) * 0.085 + 2.5 * (vnoise(x / 3, y / 5, 64 + j) - 0.5));
  for (const i of order) {
    const s = SUMMITS[i];
    for (let x = 0; x < w; x++) {
      const t0 = Math.round(sky(s, i, x)); if (t0 >= h) continue;
      const all = skyAll(x), out = Math.abs(x - w / 2 - 2) < 30 + 6 * vnoise(x / 9, 2, 71);
      for (let y = Math.max(0, t0); y < h; y++) {
        const d = y - t0, face = x < s.cx ? 0.2 : -0.2;
        // The ice thins out into the glacier on the ground through a ragged edge.
        if (out && y > h - 13 + 9 * vnoise(x / 3, y / 3, 73)) continue;
        if (!out && y > h - 1 - 7 * vnoise(x / 3.3, 5, 74) - 3 * Math.abs(Math.sin(x / 4.1))) continue;
        const fr = frac((x - s.cx) / Math.max(3, y - s.top) * 2.4 + 0.3 * vnoise(x / 6, y / 6, 66 + i));
        let v = 0.44 + face + (fr < 0.5 ? 0.12 : -0.12) + 0.18 * (vnoise(x / 3, y / 5, 67) - 0.5);
        if (Math.abs(fr - 0.5) > 0.45) v += 0.18;
        const rock = rib(x, y) && !(out && y > h - 34);
        const toe = !out && y > h - 9 - 7 * vnoise(x / 4, 3, 72);
        const deep = y - all;
        let ice = (!rock && deep > 13 + 9 * vnoise(x / 7, 4, 63)) || (fr > 0.62 && fr < 0.76 && d > 6 && !rock) || (x < s.cx && d > 4 && vnoise(x / 6 + i * 9, y / 7, 65) > 0.66);
        if (toe) ice = false;
        let c;
        if (ice) {
          const cre = frac(deep / 9 + 0.3 * Math.sin(x / 9 + i) + 0.3 * vnoise(x / 9, y / 9, 68));
          if (deep > 16 && cre < 0.1 && vnoise(x / 8, y / 3, 69) > 0.45) c = R.glac[cre < 0.05 ? 0 : 2];
          else c = pick('glac', 0.84 + face * 0.75 + (fr < 0.5 ? 0.05 : -0.08) + 0.2 * (vnoise(x / 4, y / 4, 70) - 0.5), x, y, 0.6);
        } else c = d < 1 && i !== order[0] ? R.granite[0] : pick('granite', v * 0.78 + (toe ? 0.1 : 0), x, y, 0.8);
        b.set(x + 1, y + 1, c);
      }
    }
  }
  outline(b, INK);
  // Where ice meets the glacier on the ground it carries no outline.
  for (let y = b.h - 16; y < b.h; y++) for (let x = 1; x < b.w - 1; x++) { const i = y * b.w + x; if (b.d[i] === INK && [b.d[i - b.w], b.d[i - 1], b.d[i + 1]].some(c => c && RAMP_OF[c] === 'glac')) b.d[i] = 0; }
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
      // The trees at its foot end in a ragged line of crowns, not a ruled edge.
      if (y > h - 2 - 3.5 * Math.abs(Math.sin(x / 2.9 + 4 * vnoise(x / 9, 1, 58))) - 2 * vnoise(x / 4, 2, 59)) continue;
      let c;
      if (forest) c = pick('conifer', (y > h - 7 ? 0.05 : 0.25) + 0.5 * hash(x, y, 56), x, y);
      else if (y < snowLine || gully) c = pick('snow', v + 0.15, x, y);
      else c = pick('rock', v - 0.05, x, y);
      b.set(x + 1, y + 1, c);
    }
  }
  outline(b, INK);
  return b;
}


// ---------------------------------------------------------------------------------------------
// The scene. Built once; drawn for whichever stretch of trail (a leg) he is on.

const RUN = 78; // pixels a second
const SIGNS = [
  { x: 702, y: 437, label: 'Scope Creep Glacier' },
  { x: 596, y: 399, label: 'Segfault Scree' },
  { x: 636, y: 378, label: 'Merge Conflict Col' },
  { x: 506, y: 471, label: 'About Lake, 2.4 km' },
  { x: 498, y: 536, label: 'Yak Shave Meadow' }
];

export function makeWorld() {
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
  put(makeMassif(), SPIRES.x, SPIRES.y);

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
  const plant = (tree, x, y, force) => { if (!force && !clear(x, y, tree)) return false; const t = { tree, x: Math.round(x), y: Math.round(y) }; trees.push(t); things.push({ kind: 'tree', t, x: t.x, y: t.y }); return true; };
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
    if (Math.abs(x - SPIRES.x) < 96 && y < SPIRES.y + 4) continue;
    plant(firs[(rand() * 8) | 0], x, y);
  }
  // A ragged line of firs where the peak's forest meets the meadow, clear of the lake.
  const r2 = rng(77);
  for (let x = PEAK.x - 78; x < PEAK.x + 80; x += 5 + r2() * 5) {
    const y = PEAK.y + 1 + r2() * 5;
    if (Math.hypot((x - LAKE.x) / (LAKE.rx + 9), (y - LAKE.y) / (LAKE.ry + 5)) < 1 || distAt(x, y) < 7) continue;
    plant(firs[(r2() * 8) | 0], x, y, true);
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
  // A little more to look at in the meadow: huckleberry and heather, a few silver snags.
  const r3 = rng(4242), bushes = [0, 1, 2].map(i => makeBush(700 + i, 'huck')).concat([0, 1, 2].map(i => makeBush(710 + i, 'heather')), [0, 1].map(i => makeBush(720 + i, 'green')));
  const snags = [0, 1, 2].map(i => makeSnag(730 + i));
  const open = (x, y) => forestAmt(x, y) < 0.2 && distAt(x, y) > 7 && lakeD(x, y) > 1.3 && talus(x, y) < 0.05 && !(y > 340 && glacier(x, y).d < glacier(x, y).w + 8) && Math.hypot(x - T.x, y - T.y) > 26 && y > 316;
  for (let n = 0; n < 34; n++) {
    const cx = 470 + r3() * 500, cy = 330 + r3() * 370, kind = r3() < 0.45 ? 0 : r3() < 0.7 ? 3 : 6, count = 2 + (r3() * 4 | 0);
    for (let k = 0; k < count; k++) { const x = cx + (r3() - 0.5) * 30, y = cy + (r3() - 0.5) * 14; if (open(x, y)) put(bushes[Math.min(7, kind + (r3() * (kind === 6 ? 2 : 3) | 0))], x, y); }
  }
  for (let n = 0; n < 16; n++) { const x = 480 + r3() * 500, y = 330 + r3() * 370; if (open(x, y) && fbm(x / 60, y / 60, 71, 3) > 0.5) put(snags[n % 3], x, y); }
  put(makeSignpost(), T.x - 4, T.y - 8);
  for (const s of SIGNS) put(makeSmallSign(), s.x, s.y);
  put(makeJournal(), 452, 366);
  put(makeKiosk(), 612, 497);
  // Two climbers high on the wall, on a rope; they sort in front of it by standing on its foot line.
  things.push({ bm: makeClimber('red'), x: 566, y: STACK.y + 1, lift: 70, rope: true }, { bm: makeClimber('teal'), x: 569, y: STACK.y + 1, lift: 58 });
  put(makeTent('tent'), 664, 404); put(makeTent('red'), 688, 414);
  const elk = [makeElk(false), makeElk(true)];
  things.push({ critter: 'elk', bm: elk[0], x: 516, y: 446 });
  const birds = [makeBird(0), makeBird(1)];
  const clouds = [0, 1, 2, 3].map(i => ({ bm: makeCloud(600 + i), x: i * 260 + 40, y: 150 + (i & 1) * 40 + i * 6, v: 3 + i }));
  const runner = makeRunner('trail');
  const kit = makeCats(); window.__cats = kit;
  const flags = [makeFlag(0), makeFlag(1)];
  // A flag for each finished destination: at the lake shore, on the wall's rim, on the highest summit.
  const FLAGS = { lake: { x: 438, y: 384, lift: 0 }, stack: { x: STACK.x - 14, y: STACK.y + 1, lift: STACK.h - 9 }, spires: { x: SPIRES.x - (SPIRES.w >> 1) + SUMMITS[2].cx, y: SPIRES.y + 1, lift: SPIRES.h - SUMMITS[2].top - 2 } };
  for (const k in FLAGS) things.push({ flag: k, bm: flags[0], x: FLAGS[k].x, y: FLAGS[k].y, lift: FLAGS[k].lift });
  // His footprints stay on a finished trail: a pair of dark dots every few steps.
  const prints = {};
  for (const k in paths) {
    const P = paths[k], out = [];
    for (let d = 6, n = 0; d < P.len - 4; d += 5, n++) { const a = P.at(d / P.len), l = Math.hypot(a.dx, a.dy) || 1, s = n & 1 ? 1 : -1; out.push([Math.round(a.x - a.dy / l * s), Math.round(a.y + a.dx / l * s)]); }
    prints[k] = out;
  }

  // Where the lake loop goes into the trees and where it comes back out by the lake.
  const lakeIn = (() => { const P = paths.lake; for (let q = 0; q < 1; q += 0.002) { const a = P.at(q); if (forestAmt(a.x, a.y) > 0.75) return q; } return 0.2; })();
  const lakeOut = (() => { const P = paths.lake; let best = 0, bd = 1e9; for (let q = 0.5; q < 1; q += 0.002) { const a = P.at(q), d = Math.hypot(a.x - 456, a.y - 393); if (d < bd) { bd = d; best = q; } } return best; })();

  const cam = { x: T.x, y: 0 };
  let facing = 'down', flip = false, last = { ox: 0, oy: 0, VW: 1, VH: 1 }, focus = { x: 0, y: 0 };
  const list = [];
  // The view from the Trailhead. On an upright phone the junction sign covers the lower half, so
  // the view sits lower to keep him above it, past the bottom edge of the map if it has to.
  const vista = scr => scr.narrow ? { x: T.x, y: T.y + scr.VH * 0.06 } : { x: T.x, y: T.y + Math.min(46, scr.VH * 0.17) + 14 - scr.VH / 2 + Math.max(0, scr.VH - 300) * 0.25 };
  let past = 0;
  const where = (leg, q) => { const P = paths[leg.path], a = P.at(lerp(leg.from, leg.to, q)), s = leg.to < leg.from ? -1 : 1; return { x: a.x, y: a.y, dx: a.dx * s, dy: a.dy * s, P }; };
  const target = (scr, here) => {
    const v = vista(scr), k = smooth(0, 60, Math.hypot(here.x - T.x, here.y - T.y));
    return [lerp(v.x, here.x, k), lerp(v.y, here.y - 24, k)];
  };

  return {
    name: 'world', paths, lakeIn, lakeOut, T, WW, WH,
    lengths: () => ({ lake: 5.2, stack: Math.round(paths.stack.len * KM * 10) / 10, spires: Math.round(paths.spires.len * KM * 10) / 10 }),
    dur: leg => Math.abs(leg.to - leg.from) * paths[leg.path].len / RUN,
    stops: () => [],
    // North on the map is uphill, which is all the profile along the bottom needs.
    elev: (leg, q) => (T.y - where(leg, q).y) * 0.8,
    // One frame of the map from a fixed spot, without him: the picture on the trail map.
    still(scr, x, y, env) {
      const keep = [cam.x, cam.y, last, focus, facing, flip];
      this.draw(scr, { ...env, dt: 0, moving: false, home: false, idle: 0, look: { x: 0, y: 0 }, hideMe: true, fixed: { x, y } }, { path: 'lake', from: 0, to: 0 }, 0);
      [cam.x, cam.y, last, focus, facing, flip] = keep;
    },
    enter(scr, leg, q) { const [tx, ty] = target(scr, where(leg, q)); cam.x = tx; cam.y = ty; },
    focus: () => focus,
    // What is under a point of the screen: a sign with a name, the kiosk, a cat.
    pick(sx, sy) {
      const wx = sx + last.ox, wy = sy + last.oy;
      for (const s of SIGNS) if (Math.abs(wx - s.x) < 8 && wy > s.y - 17 && wy < s.y + 3) return { label: s.label, x: s.x - last.ox, y: s.y - 18 - last.oy };
      const c = kit.pick(wx, wy); if (c) return { label: c.label, x: c.wx - last.ox, y: c.wy - last.oy, act: c.act };
      if (Math.abs(wx - 612) < 14 && wy > 470 && wy < 500) return { label: 'Trail conditions', x: 612 - last.ox, y: 470 - last.oy, act: 'kiosk' };
      return null;
    },
    act(id, env) { return id.startsWith('cat:') ? kit.click(id.slice(4), env) : false; },
    draw(scr, env, leg, q) {
      const { VW, VH, fb } = scr, { t, tq, dt } = env;
      const here = where(leg, q);
      if (env.moving && Math.abs(here.dx) + Math.abs(here.dy) > 0.01) {
        if (Math.abs(here.dx) > Math.abs(here.dy) * 0.7) { facing = 'side'; flip = here.dx < 0; } else facing = here.dy < 0 ? 'up' : 'down';
      }
      if (env.home) facing = 'down';

      // Camera: the whole view from the Trailhead, then follow him.
      let [tx, ty] = target(scr, here);
      if (env.home && env.idle > 4) tx += Math.sin((env.idle - 4) * 0.16) * Math.max(0, (WW - VW) / 2 - Math.abs(tx - WW / 2)) * 0.9 * Math.min(1, (env.idle - 4) / 3);
      const damp = 1 - Math.exp(-dt * 3.2);
      cam.x += (tx - cam.x) * damp; cam.y += (ty - cam.y) * damp;
      let cx = cam.x + env.look.x, cy = cam.y + env.look.y;
      cx = VW >= WW ? WW / 2 : clamp(cx, VW / 2, WW - VW / 2);
      past += ((scr.narrow && env.home ? VH * 0.34 : 0) - past) * (env.fixed ? 0 : Math.min(1, dt * 4));
      cy = VH >= WH ? WH / 2 : clamp(cy, VH / 2, WH - VH / 2 + past);
      const ox = env.fixed ? env.fixed.x : Math.round(cx - VW / 2), oy = env.fixed ? env.fixed.y : Math.round(cy - VH / 2);
      last = { ox, oy, VW, VH };

      // Ground.
      for (let y = 0; y < VH; y++) {
        const wy = oy + y, row = y * VW;
        if (wy < 0) { fb.fill(R.skyband[0], row, row + VW); continue; }
        if (wy >= WH) { const my = 2 * WH - 1 - wy, a = Math.max(0, ox), b = Math.min(WW, ox + VW); fb.fill(R.grass[2], row, row + VW); if (my >= 300 && b > a) fb.set(ground.subarray(my * WW + a, my * WW + b), row + (a - ox)); continue; }
        const a = Math.max(0, ox), b = Math.min(WW, ox + VW);
        if (a > ox) fb.fill(wy < 300 ? R.sky[2] : R.grass[2], row, row + (a - ox));
        if (b < ox + VW) fb.fill(wy < 300 ? R.sky[2] : R.grass[2], row + (b - ox), row + VW);
        if (b > a) fb.set(ground.subarray(wy * WW + a, wy * WW + b), row + (a - ox));
      }
      for (const c of clouds) scr.blit(c.bm, ((c.x + t * c.v) % (WW + 120)) - 60 - ox, c.y - oy);
      for (const k in prints) if (env.done[k]) for (const [x, y] of prints[k]) { const sx = x - ox, sy = y - oy; if (sx >= 0 && sy >= 0 && sx < VW && sy < VH && KIND[fb[sy * VW + sx]] === 3) fb[sy * VW + sx] = R.dirt[0]; }

      // Everything that stands, back to front.
      list.length = 0;
      for (const th of things) {
        if (th.flag && !env.done[th.flag]) continue;
        const w = th.kind === 'tree' ? th.t.tree.w + 8 : th.bm.w, h = (th.kind === 'tree' ? th.t.tree.h + 10 : th.bm.h) + (th.lift || 0);
        if (th.x + w < ox || th.x - w > ox + VW || th.y - h > oy + VH || th.y + 4 < oy) continue;
        list.push(th);
      }
      if (!env.hideMe) list.push({ me: true, x: here.x, y: here.y });
      kit.update(env, here, scr.narrow && !env.fixed);
      for (const it of kit.items()) list.push(it);
      list.sort((a, b) => a.y - b.y);
      for (const th of list) {
        if (th.me) {
          const set = env.moving ? (facing === 'side' ? runner.side : facing === 'up' ? runner.up : runner.down) : (facing === 'side' ? runner.sideIdle : facing === 'up' ? runner.upIdle : runner.downIdle);
          const bm = set[Math.floor(Math.abs(leg.to - leg.from) * q * here.P.len / (facing === 'side' ? 4.2 : 5)) % set.length];
          scr.shadow(Math.round(th.x - ox), Math.round(th.y - oy), 5, 2);
          scr.put(bm, th.x - ox, th.y - oy, flip && facing === 'side');
          focus = { x: Math.round(th.x - ox), y: Math.round(th.y - oy) - 14 };
        } else if (th.cat) {
          kit.drawOne(scr, th.cat, ox, oy, t);
        } else if (th.kind === 'tree') {
          const { tree, x, y } = th.t;
          for (const part of tree.parts) {
            const [wx, wy] = windAt(x + (part.lx || 0), y + part.y, tq, part.sway);
            scr.blit(part.bm, x + part.x + wx - ox, y + part.y + wy - oy);
          }
        } else if (th.critter === 'elk') {
          scr.blit(elk[(t % 9) < 6 ? 1 : 0], th.x - 11 - ox, th.y - 19 - oy);
        } else if (th.fern) {
          const [wx] = windAt(th.x, th.y, tq, 0.6);
          scr.blit(th.bm, th.x - th.bm.ox + wx - ox, th.y - th.bm.oy - oy);
        } else if (th.flag) {
          scr.blit(flags[Math.floor(t * 5) & 1], th.x - 2 - ox, th.y - th.lift - 15 - oy);
        } else if (th.lift) {
          scr.blit(th.bm, th.x - th.bm.ox - ox, th.y - th.lift - th.bm.oy - oy);
          if (th.rope) for (let j = 1; j < 12; j++) scr.set(th.x + Math.round(j * 0.25) - ox, th.y - 70 + j - oy, R.yellow[0]);
        } else scr.blit(th.bm, th.x - th.bm.ox - ox, th.y - th.bm.oy - oy);
      }

      // Cloud shadows cross the meadow: everything under one goes a step darker, with a soft edge.
      for (let k = 0; k < 4; k++) {
        const cw = 78 + 30 * hash(k, 1, 91), chh = 24 + 10 * hash(k, 2, 91), cxw = ((k * 310 + t * (5 + k * 1.3)) % (WW + 300)) - 150, cyw = 392 + hash(k, 3, 91) * 250;
        const y0 = Math.max(0, Math.round(cyw - chh - oy)), y1 = Math.min(VH - 1, Math.round(cyw + chh - oy)), x0 = Math.max(0, Math.round(cxw - cw - ox)), x1 = Math.min(VW - 1, Math.round(cxw + cw - ox));
        for (let y = y0; y <= y1; y++) { const wy = y + oy; if (wy < 330) continue; for (let x = x0; x <= x1; x++) {
          const nx = (x + ox - cxw) / cw, ny = (wy - cyw) / chh, d = nx * nx + ny * ny + 0.22 * Math.sin(nx * 7 + k) * Math.sin(ny * 5 + k * 2);
          if (d < 0.82 || (d < 1 && ((x + ox + wy) & 1))) { const i = y * VW + x; fb[i] = SHADE[fb[i]]; }
        } }
      }
      kit.drawOver(scr, ox, oy, t);
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
        scr.blit(birds[(Math.floor(t * 4) + k) & 1], bx - [0, -9, 9, -17][k] - 3 - ox, by - 2 - oy);
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
      if (env.mix > 0.4) for (let k = 0; k < 70; k++) {
        const fx = Math.round(40 + hash(k, 1, 90) * 500 + 6 * Math.sin(t * 0.6 + k)), fy = Math.round(330 + hash(k, 2, 90) * 360 + 4 * Math.sin(t * 0.8 + k * 1.7));
        if (forestAmt(fx, fy) < 0.5 || frac(t * 0.4 + hash(k, 3, 90)) > 0.55) continue;
        scr.set(fx - ox, fy - oy, R.yellow[1]);
      }
      // Shafts of light slant down through the forest canopy: every other pixel one step lighter.
      for (let y = 0; y < VH; y++) {
        const wy = oy + y; if (wy < 300 || wy >= WH) continue;
        for (let x = (y + oy + ox) & 1; x < VW; x += 2) {
          const wx = ox + x; if (wx < 0 || wx >= WW || !shaftMask[wy * WW + wx]) continue;
          const i = y * VW + x; fb[i] = shaftMask[wy * WW + wx] === 2 ? LIGHT[LIGHT[fb[i]]] : LIGHT[fb[i]];
        }
      }
    }
  };
}
