// Sideproject Spires, the climbs: six short routes seen from the side, one per project, each
// with its own crux on the way up and its own thing on the summit to click. All six end the same
// way: he sits down and glissades back to camp.
import { clamp, lerp, smooth, frac, sq, rng, hash, vnoise, fbm, bayer, R, INK, pick, BM, outline, disc, thick } from './core.js';
import { Strip, drawStrip, baseline } from './side.js';
import { makeTent, makeFlag, clump, makeCloud } from './sprites.js';
import { bluebird, speck } from './fauna.js';
import { sideFig, frontFig, backFig } from './tj.js';
import { T as JUNCTION } from './land.js';
import { NAMES, FINDS, UI } from './content.js';

const W = 1000, OFF = 320, UP = 340, DOWN = 240, SX = 262;
// Every climb shares the walk in from camp, the pause on top, the glissade and the walk out. What lies
// between is each route's own, so a route with ice on it or a storm over it takes as long as it needs.
const T_UP = 0.5, T_STAND = 0.5, T_SLIDE = 2.4, T_OUT = 0.7;

// Each route: the line of the slope from camp (0, 0) to the summit flat and off the far side,
// what kind of ground it is, and how many seconds of walking it holds. `ice` lists the walls of ice
// by the x of their foot and their top; `slip` names the wall and the move on which a foot will not stick.
const ROUTES = {
  bluebird: { kind: 'ridge', secs: 5.5, pts: [[0, 0], [50, -10], [110, -52], [170, -100], [230, -140], [262, -150], [304, -150], [330, -112], [400, -10], [500, 120]] },
  tks: { kind: 'icefall', secs: 3.4, ice: [[52, 56], [112, 116]], pts: [[0, 0], [30, -5], [44, -9], [52, -9], [56, -42], [92, -54], [104, -58], [112, -58], [116, -112], [170, -124], [224, -134], [262, -138], [304, -138], [330, -100], [400, 0], [500, 120]] },
  'hevy-garmin-sync': { kind: 'ice', secs: 3.2, ice: [[124, 130]], slip: [0, 2], pts: [[0, 0], [70, -14], [116, -28], [124, -28], [130, -88], [160, -104], [230, -140], [262, -150], [304, -150], [330, -112], [400, -10], [500, 120]] },
  trailhead: { kind: 'bridge', secs: 4.5, gap: [150, 176], pts: [[0, 0], [80, -30], [140, -64], [150, -66], [176, -72], [230, -128], [262, -146], [304, -146], [330, -110], [400, -10], [500, 120]] },
  yggdrasil: { kind: 'ladder', secs: 4.5, gap: [130, 160], pts: [[0, 0], [70, -20], [130, -56], [160, -76], [220, -124], [262, -146], [304, -146], [330, -110], [400, -10], [500, 120]] },
  'kubernetes-manifests': { kind: 'wands', secs: 10.5, pts: [[0, 0], [90, -26], [170, -74], [230, -120], [262, -140], [304, -140], [330, -104], [400, 0], [500, 120]] }
};
const hOf = (pts, x) => { if (x <= 0) return 0; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return lerp(y0, y1, (x - x0) / (x1 - x0)); } return pts[pts.length - 1][1]; };

function paint(cfg, seed) {
  const S = new Strip(W, UP, DOWN), { pts, kind, gap } = cfg, tops = new Int16Array(W);
  for (let sx = 0; sx < W; sx++) {
    const x = sx - OFF, inGap = gap && x > gap[0] && x < gap[1];
    const y0 = Math.round(hOf(pts, x) + (x > 0 && x < SX ? 1.5 * (vnoise(x / 7, 1, seed) - 0.5) : 0)), slope = hOf(pts, x + 3) - hOf(pts, x - 3);
    const far = slope > 2;
    tops[sx] = y0;
    for (let y = inGap ? y0 + 6 : y0; y < DOWN; y++) {
      const d = y - y0; let c;
      if (inGap && d < 80) { const e = Math.min(x - gap[0], gap[1] - x); if (e > 3 + d * 0.06 + 2 * vnoise(y / 5, x, seed + 1)) continue; c = pick('glac', 0.42 - d * 0.006 + (x - gap[0] < 6 ? 0.2 : -0.1), sx, y); }
      else if (far && d > 3 + 5 * vnoise(sx / 5, y / 9, seed + 5) && vnoise(sx / 7, y / 26, seed + 10) > 0.3) c = Math.abs(frac(sx / 9 + vnoise(sx / 30, y / 30, seed + 11)) - 0.5) < 0.05 ? R.granite[0] : pick('granite', 0.34 + 0.3 * (vnoise(sx / 2.4, y / 14, seed + 6) - 0.5) - d * 0.0015, sx, y, 0.8);
      else if (!far && d > 9 && kind !== 'wands' && fbm((sx + y * 1.6) / 46, (y - sx * 0.25) / 9, seed + 5, 3) > 0.63) c = pick('granite', 0.62 - 0.5 * frac((y - sx * 0.25) / 9) + 0.2 * (vnoise(sx / 3, y / 3, seed + 6) - 0.5), sx, y, 0.8);
      else c = d < 1 ? R.snow[far ? 3 : 4] : far ? pick('glac', 0.72 - d * 0.004 + 0.12 * (vnoise(sx / 9, y / 4, seed + 7) - 0.5), sx, y, 0.6) : (Math.abs(frac((y + sx * 0.3) / 13 + 0.4 * vnoise(sx / 20, y / 20, seed + 8)) - 0.5) < 0.03 && d > 4 ? R.snow[2] : pick('snow', 0.86 + Math.max(-3, slope) * 0.02 - d * 0.002 + 0.14 * (vnoise(sx / 8, y / 5, seed + 9) - 0.5), sx, y, 0.5));
      S.set(sx, y, c);
    }
    if (!inGap) S.set(sx, y0 - 1, INK);
  }
  // A fall of ice hangs down the face of each step, WIDE pixels across, and he climbs it with his back to
  // us. Flutes run down it, pale where they catch the light and dark in the seams between; it bulges in
  // bands; snow lies on its top and a shelf of snow along its foot.
  (cfg.ice || []).forEach(([xa, xb], i) => {
    const ya = Math.round(hOf(pts, xa));
    for (let x = xa - 3; x <= xa + WIDE; x++) {
      const sx = x + OFF, e = x - xa;
      for (let y = tops[sx]; y <= ya + 4; y++) {
        const d = y - tops[sx], right = WIDE - e - 5 * vnoise(y / 6, i, seed + 20) - Math.max(0, 5 - (ya - y)) * 0.0;
        if (y > ya) { if (right > 2) S.set(sx, y, y === ya + 4 ? R.snow[2] : y === ya + 1 && (x + i) % 5 === 0 ? R.snow[3] : R.snow[4]); continue; }
        if (e < 0 || right < 0 || (x > xb && d < 2)) continue;
        const flute = vnoise(x / 2.6 + 0.8 * vnoise(y / 21, x / 11, seed + 21), y / 38, seed + 22), bulge = vnoise(x / 14, y / 6.5, seed + 23);
        let c = flute > 0.76 && bulge > 0.45 ? R.glac[5] : flute < 0.22 ? R.glac[1] : pick('glac', 0.52 + 0.6 * (flute - 0.5) + 0.3 * (bulge - 0.5) + (ya - y < 4 ? 0.2 : 0), sx, y, 0.5);
        if (right < 1.5) c = R.glac[1];
        if (!S.get(sx - 1, y)) c = INK;
        S.set(sx, y, c);
      }
    }
  });
  if (kind === 'ridge') for (let x = 236; x < 300; x++) { const y0 = Math.round(hOf(pts, x)); for (let k = 0; k < 4 - Math.abs(x - 300) * 0.02; k++) S.set(x + OFF + k + 6, y0 + k + (x > 292 ? x - 292 : 0), R.snow[4]); }
  return S;
}

// Ice climbing, as numbers. The ice is a frozen fall WIDE pixels across on the face of a step, and he
// climbs up the middle of it with his back to us, so both tools and both feet can be seen. Heights are
// measured up from the foot of the fall, and a tool or a foot that is placed stays put while the rest of
// him moves. STAND is how far his hips are above his feet when he stands.
const WIDE = 38, MID = 18, STAND = 12, BEAT = 0.8, QUICK = 0.45, LEAD = 0.75, SLIP = 1.0, OVER = 0.8, COCK = 1.0;
// When each point moves within one round of the four, as fractions of the round: left tool, right foot,
// hips up half a step, right tool, left foot, hips again. Once both tools are hooked over the lip only
// the feet are left to move, and the round is a quick one.
const FULL = { t0: [0.02, 0.24], k1: [0.26, 0.4], r1: [0.4, 0.5], t1: [0.52, 0.74], k0: [0.76, 0.9], r0: [0.9, 1] };
const FEET = { t0: [0, 0], k1: [0.04, 0.34], r1: [0.34, 0.5], t1: [0, 0], k0: [0.54, 0.84], r0: [0.84, 1] };
const win = (w, c) => w[1] > w[0] ? (c - w[0]) / (w[1] - w[0]) : 1;
// A tool leaving one placement for the next, u from 0 to 1: worked loose, carried up tipped out to the
// side with the arm cocked, then swung in. Gives how far out from his middle it is, its height and its tilt.
function swing(u, h0, h1) {
  if (u <= 0 || h1 - h0 < 0.5) return [0, u <= 0 ? h0 : h1, 0]; if (u >= 1) return [0, h1, 0];
  if (u < 0.22) { const k = u / 0.22; return [2 * k, h0 + k, COCK * k]; }
  if (u < 0.72) return [2, lerp(h0 + 1, h1 + 2, smooth(0.22, 0.72, u)), COCK];
  const k = sq((u - 0.72) / 0.28); return [2 - 2 * k, h1 + 2 - 2 * k, COCK * (1 - k)];
}
// A foot does the same: pulled out of the ice and away, lifted, and kicked back in on its front points.
function kick(u, h0, h1) {
  if (u <= 0) return [0, h0]; if (u >= 1) return [0, h1];
  if (u < 0.3) { const k = u / 0.3; return [3 * k, h0 - 0.5 * k]; }
  if (u < 0.7) return [3, lerp(h0 - 0.5, h1 + 1, smooth(0.3, 0.7, u))];
  const k = sq((u - 0.7) / 0.3); return [3 - 3 * k, h1 + 1 - k];
}
const mix2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

// One fall of ice on a route, from the moment he reaches its foot: how many rounds it takes, where every
// placement goes, when each tool and foot bites (for the chips of ice and the sound), and when he is on top.
function iceLeg(w, t0, slipAt) {
  const H = w.ya - w.top, M = Math.ceil((H - 14) / 7.6), rise = (H - 2 - STAND) / M, lip = H - 3;
  // A tool is not moved for less than a couple of pixels: near the top it stays hooked where it is.
  const tools = raw => { const out = [Math.min(lip, raw(-1))]; for (let n = 0; n < M; n++) { const want = Math.min(lip, raw(n)), cur = out[out.length - 1]; out.push(want - cur >= 2.5 ? want : cur); } return n => out[n + 1]; };
  const T0 = tools(n => STAND + rise * n + 20), T1 = tools(n => STAND + rise * (n + 0.5) + 20), F1 = n => Math.max(0, STAND + rise * n - 5), F0 = n => Math.max(0, STAND + rise * (n + 0.5) - 5);
  const rounds = [], hit = []; let s = LEAD;
  const add = (at, h, side, tool, big) => hit.push({ t: t0 + at, h, side, tool, big });
  add(LEAD * 0.66, T0(-1) + 7, -1, true); add(LEAD * 0.82, T1(-1) + 7, 1, true); add(LEAD, F0(-1), -1, false);
  for (let n = 0; n < M; n++) {
    const quick = T0(n) === T0(n - 1) && T1(n) === T1(n - 1), B = quick ? FEET : FULL, len = quick ? QUICK : BEAT, slip = n === slipAt && !quick, late = slip ? SLIP : 0;
    rounds.push({ at: s, len, B, slip });
    if (T0(n) !== T0(n - 1)) add(s + B.t0[1] * len, T0(n) + 7, -1, true);
    add(s + B.k1[1] * len, F1(n), 1, false);
    if (slip) { const a = s + B.k1[1] * len; add(a + 0.03 * SLIP, F1(n) - 1, 1, false, true); add(a + 0.42 * SLIP, F1(n), 1, false, true); add(a + 0.8 * SLIP, F1(n), 1, false); }
    if (T1(n) !== T1(n - 1)) add(s + late + B.t1[1] * len, T1(n) + 7, 1, true);
    add(s + late + B.k0[1] * len, F0(n), -1, false);
    s += len + late;
  }
  return { ice: true, w, H, M, rise, T0, T1, F0, F1, rounds, hit, t0, tOver: s, t1: t0 + s + OVER };
}
// Where every part of him is, s seconds after he reached the foot of the fall. Hands and feet come back
// measured from hips that sit on a whole pixel, so nothing placed on the ice shimmers as he moves.
function icePose(leg, s) {
  const { w, H, M, rise, T0, T1, F0, F1 } = leg;
  let hh = STAND, tools = true, tilt = 0, headY = 0, loose = 0, L, Rt, fl, fr;
  if (s < LEAD) {
    // He walks across the foot of the ice, turns to it, plants the left tool and the right, and kicks a foot in.
    const u = s / LEAD;
    if (u < 0.35) return { walk: true, x: lerp(w.x0, w.xc, u / 0.35), y: w.ya };
    L = swing((u - 0.38) / 0.28, STAND + 3, T0(-1)); Rt = swing((u - 0.54) / 0.28, STAND + 3, T1(-1));
    fl = kick((u - 0.84) / 0.16, 0, F0(-1)); fr = [0, 0];
  } else if (s < leg.tOver) {
    let n = 0; while (n < M - 1 && s >= leg.rounds[n + 1].at) n++;
    const round = leg.rounds[n], B = round.B; let c = (s - round.at) / round.len, e = -1;
    if (round.slip) { const at = B.k1[1], sl = SLIP / round.len; if (c > at + sl) c -= sl; else if (c > at) { e = (c - at) / sl; c = at; } }
    hh = STAND + rise * (n + 0.5 * smooth(B.r1[0], B.r1[1], c) + 0.5 * smooth(B.r0[0], B.r0[1], c));
    L = swing(win(B.t0, c), T0(n - 1), T0(n)); Rt = swing(win(B.t1, c), T1(n - 1), T1(n));
    fr = kick(win(B.k1, c), F1(n - 1), F1(n)); fl = kick(win(B.k0, c), F0(n - 1), F0(n));
    if (e >= 0) {
      // The right foot skates off: he looks down, kicks it in again, and once more, before it will hold.
      const at = F1(n);
      fr = e < 0.1 ? [0, at - 3 * e / 0.1] : e < 0.42 ? kick((e - 0.1) / 0.32, at - 3, at) : e < 0.5 ? [0, at - 2 * (e - 0.42) / 0.08] : e < 0.8 ? kick((e - 0.5) / 0.3, at - 2, at) : [0, at];
      headY = 1;
    }
    tilt = L[2] > 0.05 ? -1 : Rt[2] > 0.05 ? 1 : 0;
  } else {
    // Over the top: hips up past the lip, one foot onto it and then the other, hands off the tools.
    const v = clamp((s - leg.tOver) / OVER, 0, 1);
    hh = H - 2 + 5 * smooth(0, 0.25, v) + 4 * smooth(0.35, 0.6, v) + 5 * smooth(0.6, 1, v);
    L = [0, T0(M - 1), 0]; Rt = [0, T1(M - 1), 0];
    fr = kick((v - 0.2) / 0.2, F1(M - 1), H); fl = kick((v - 0.4) / 0.2, F0(M - 1), H);
    tools = v < 0.3; loose = smooth(0.15, 0.6, v);
  }
  const rx = Math.round(w.xc), ry = Math.round(w.ya - hh);
  let hands = [[-6 - L[0], w.ya - L[1] - ry], [6 + Rt[0], w.ya - Rt[1] - ry]];
  if (loose) hands = hands.map((h, i) => mix2(h, [i ? 6 : -6, -3], loose));
  return { hx: w.xc, hh, rx, ry, hands, feet: [[-5 - fl[0], w.ya - fl[1] - ry], [5 + fr[0], w.ya - fr[1] - ry]], ang: [L[2], Rt[2]], tools, tilt, headY };
}

// What stands on each summit. Small sprites, drawn where he stops.
function ell(b, cx, cy, rx, ry, fn) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const nx = (x - cx) / rx, ny = (y - cy) / ry; if (nx * nx + ny * ny <= 1) b.set(x, y, fn(nx, ny, x, y)); } }
const TOPS = {
  ridge(f) { const b = new BM(20, 34); b.ox = 10; b.oy = 33; for (let y = 6; y < 34; y++) b.set(10, y, R.rock[y & 7 ? 3 : 2]); for (let x = 6; x < 15; x++) { b.set(x, 33, R.rock[1]); b.set(x, 20, R.rock[2]); } for (let y = 21; y < 27; y++) for (let x = 12; x < 18; x++) b.set(x, y, y === 21 ? R.white[1] : R.navy[2]); for (let y = 15; y < 20; y++) for (let x = 3; x < 9; x++) b.set(x, y, R.white[x === 3 ? 0 : 1]); const a = [[-5, 0], [-3, -1], [0, -1], [3, -1]][f & 3]; for (const s of [-1, 1]) { thick(b, 10, 6, 10 + s * a[0] + (s > 0 ? a[1] * -3 : 0), 6 + (s > 0 ? 0 : 0), 1, R.rock[3]); b.set(10 + s * (4 + (f & 1)), 5, R.red[1]); b.set(10 + s * (4 + (f & 1)), 6, R.red[0]); } b.set(10, 3, R.rock[4]); b.set(11, 2, R.red[1]); b.set(12, 2, R.red[1]); outline(b, INK); return b; },
  // A server rack, out in the weather: a dark cabinet seen a little from its right, seven units behind
  // a frame, each with a pair of lights. `lights` is 'red', 'green' or 'flicker'; snow sits on top until it is hit.
  icefall(lights, f, snow) {
    const b = new BM(30, 44); b.ox = 14; b.oy = 43;
    for (let y = 8; y < 42; y++) { for (let x = 3; x < 22; x++) b.set(x, y, x === 3 ? R.navy[2] : y === 8 || y > 39 ? R.navy[1] : R.navy[0]); for (let x = 22; x < 26; x++) if (y > 8 + (x - 22) && y < 42 - (x - 21)) b.set(x, y, (y & 3) === 1 && x > 22 ? R.rock[0] : R.navy[1]); }
    for (const x of [4, 5, 19, 20]) { b.set(x, 42, R.rock[1]); b.set(x, 43, R.rock[1]); }
    for (let r = 0; r < 7; r++) {
      const y = 10 + r * 4;
      for (let x = 5; x < 21; x++) { b.set(x, y, R.rock[2]); b.set(x, y + 1, R.rock[1]); b.set(x, y + 2, R.rock[1]); }
      for (const x of [6, 8, 10]) b.set(x, y + 1, R.rock[0]);
      const mode = lights === 'flicker' ? ['red', 'green', 'off'][Math.floor(hash(f, r, 280) * 3)] : lights;
      const on = mode === 'green' ? [R.kit[2], R.kit[1]] : mode === 'red' ? ((f + r) & 1 ? [R.red[2], R.red[0]] : [R.red[1], R.red[2]]) : [R.rock[0], R.rock[0]];
      b.set(17, y + 1, on[0]); b.set(19, y + 1, on[1]);
    }
    // A patch cable that came loose, and the snow on the roof.
    for (const [x, y] of [[26, 34], [27, 35], [27, 36], [27, 37], [26, 38], [25, 39], [25, 40], [26, 41], [27, 42], [28, 42]]) b.set(x, y, R.yellow[1]);
    if (snow) for (let x = 2; x < 26; x++) for (let y = 5 + (x < 4 || x > 23 ? 1 : 0) - (x > 8 && x < 17 ? 1 : 0); y < 8 + (x > 21 ? x - 21 : 0); y++) b.set(x, y, y < 6 || x < 12 ? R.snow[4] : R.snow[3]);
    outline(b, INK); return b;
  },
  ice() { const b = new BM(34, 20); b.ox = 17; b.oy = 19; for (let x = 6; x < 26; x++) { b.set(x, 13, R.navy[2]); b.set(x, 14, R.navy[1]); } for (const x of [8, 23]) for (let y = 15; y < 20; y++) b.set(x, y, R.rock[2]); for (const x of [5, 6]) for (let y = 3; y < 20; y++) b.set(x, y, R.rock[3]); b.set(7, 4, R.rock[3]); b.set(4, 4, R.rock[3]); outline(b, INK); return b; },
  // A pair of coin-operated binoculars on a post, the kind bolted to a viewpoint: the eyepieces face him
  // and the lenses look out and down over the far side.
  bridge() {
    const b = new BM(24, 32); b.ox = 11; b.oy = 31;
    ell(b, 11, 29.5, 6, 1.6, (nx, ny, x, y) => R.rock[ny < 0 ? 2 : 1]);
    for (let y = 13; y < 30; y++) for (let x = 10; x <= 12; x++) b.set(x, y, R.rock[x === 10 ? 4 : x === 11 ? 3 : 2]);
    for (let y = 18; y < 24; y++) for (let x = 8; x <= 14; x++) b.set(x, y, y === 18 ? R.rock[4] : x === 8 ? R.rock[3] : R.rock[2]);
    b.set(11, 20, INK); b.set(11, 21, INK); b.set(13, 22, R.yellow[1]);
    // The head tips down toward the valley on the right.
    for (let x = 3; x <= 20; x++) { const mid = 8.5 + (x - 11) * 0.22, hw = x < 6 ? 2.2 : x > 17 ? 3.2 : 3.8; for (let y = Math.ceil(mid - hw); y <= Math.floor(mid + hw); y++) b.set(x, y, x < 6 ? R.rock[y < mid ? 4 : 2] : y < mid - 1.6 ? R.teal[2] : y > mid + 1.8 ? R.teal[0] : R.teal[1]); }
    for (let y = 9; y <= 12; y++) b.set(21, y, y === 9 ? R.white[1] : R.navy[1]);
    for (let y = 3; y <= 11; y++) { b.set(15, y + 1, R.rock[4]); b.set(9, y, R.rock[4]); }
    b.set(2, 6, R.navy[0]); b.set(2, 7, R.navy[0]); b.set(11, 12, R.rock[1]); b.set(12, 13, R.rock[1]);
    outline(b, INK); return b;
  },
  ladder() { const rand = rng(77), b = new BM(64, 66); b.ox = 32; b.oy = 65; for (let y = 22; y < 66; y++) { const hw = 3 + (y > 56 ? (y - 56) * 0.8 : 0) + Math.sin(y / 5); for (let dx = -hw; dx <= hw; dx++) b.set(32 + dx + Math.round(2 * Math.sin(y / 9)), y, dx < -0.5 ? R.moss[3] : pick('bark', 0.6 - dx / hw * 0.4, dx | 0, y)); } for (const [dx, dy, len] of [[-1, 30, 16], [1, 34, 14], [-1, 40, 10], [1, 26, 18]]) thick(b, 32, dy, 32 + dx * len, dy - len * 0.6, 2, R.bark[1]); outline(b, INK); for (let k = 0; k < 11; k++) { const a = k / 11 * 6.283, r = k < 3 ? 6 : 17, c = clump(5.5 + rand() * 3, 'moss', rand, 0); const px = Math.round(32 + Math.cos(a) * r * 1.25 - c.cx), py = Math.round(17 + Math.sin(a) * r * 0.62 - c.cy); for (let j = 0; j < c.h; j++) for (let i = 0; i < c.w; i++) { const v = c.d[j * c.w + i]; if (v) b.set(px + i, py + j, v); } } return b; },
  wands() { const b = new BM(20, 20); b.ox = 10; b.oy = 19; for (const [x, y, r, s] of [[10, 16, 5, 1], [6, 16, 3.4, 2], [14, 16, 3, 3], [9, 11, 3.6, 4], [12, 7, 2.8, 5]]) ell(b, x, y, r, r * 0.62, (nx, ny, px, py) => pick('rock', 0.62 - ny * 0.4 - nx * 0.2 + s * 0.02, px, py)); outline(b, INK); return b; }
};
const stone = (() => { const b = new BM(7, 6); b.ox = 3; b.oy = 5; ell(b, 3, 3, 2.6, 1.8, (nx, ny, x, y) => pick('rock', 0.7 - ny * 0.4, x, y)); outline(b, INK); return b; })();
// How tall each summit's thing is, for the label over it and the place to click.
const TALL = { ladder: 66, icefall: 40 };

// A serac: a tower of glacier ice broken into blocks that lean on one another. Each block is a slab
// with a tilted top, lit on its left face and blue in shadow on its right, split from the next by a dark
// fracture, and wherever a block is wider than the one above it snow has settled on the step.
function makeSerac(seed, w, h) {
  const rand = rng(seed), b = new BM(w + 44, h + 6), cx = (w + 44) >> 1; b.ox = cx; b.oy = h + 5;
  const lean = (rand() - 0.5) * 0.5, n = 2 + Math.floor(h / 28), blocks = [];
  let y = 3;
  for (let k = 0; k < n; k++) {
    const u = (k + 1) / n, hw = w * (0.15 + 0.35 * u) + (rand() - 0.5) * 2, off = lean * (h - y) + (rand() - 0.5) * 3;
    blocks.push({ top: y, l: cx + off - hw * (0.8 + rand() * 0.4), r: cx + off + hw * (0.8 + rand() * 0.4), tilt: (rand() - 0.5) * 1.1, crack: rand() < 0.7 ? 0.3 + rand() * 0.4 : -1, lit: 0.22 + rand() * 0.14 });
    y += Math.max(7, Math.round((h - 3) / n * (0.5 + rand())));
  }
  const topOf = (k, x) => k >= n ? h + 6 : blocks[k].top + blocks[k].tilt * (x - cx);
  for (let k = n - 1; k >= 0; k--) {
    const B = blocks[k], l = Math.round(B.l), r = Math.round(B.r);
    for (let x = l; x <= r; x++) {
      const y0 = Math.round(topOf(k, x)), y1 = k === n - 1 ? h + 5 : Math.round(topOf(k + 1, x)), u = (x - l) / Math.max(1, r - l);
      const above = k > 0 && x >= Math.round(blocks[k - 1].l) && x <= Math.round(blocks[k - 1].r);
      for (let yy = y0; yy <= y1; yy++) {
        const d = yy - y0;
        let c = u < B.lit ? R.glac[d < 2 ? 5 : 4 + (vnoise(x / 2, yy / 5, seed) > 0.62 ? 1 : 0)] : u > 0.72 ? R.glac[vnoise(x / 2, yy / 6, seed + 1) > 0.6 ? 3 : 2] : R.glac[vnoise(x / 3, yy / 7, seed + 2) > 0.55 ? 4 : 3];
        if (x === r) c = R.glac[1];
        if (yy >= y1 - 1 && k < n - 1) c = R.glac[1];
        if (B.crack > 0 && Math.abs(x - (l + (r - l) * B.crack + (yy - y0) * 0.35)) < 0.6 && d > 2 && yy < y1 - 3) c = R.glac[u > 0.72 ? 0 : 1];
        // Snow on anything that faces the sky.
        if (!above && d < (k === 0 ? 3 : 2)) c = d === 0 || u < 0.6 ? R.snow[4] : R.snow[3];
        b.set(x, yy, c);
      }
    }
  }
  outline(b, R.glac[0]);
  return b;
}

// Two fields of drifting noise for the storms, worked out once a frame and only at every second column
// (the shapes are long and low, so the missing columns cannot be seen): `n` says where cloud or blown snow
// is, `m` how bright it is there. Streaks are the blown snow of the wanded route; banks are the cloud on the ridge.
const drift = { n: new Uint8Array(0), m: new Uint8Array(0), w: 0 };
function blow(scr, t, banks) {
  const w = (scr.VW >> 1) + 1, h = scr.VH; if (drift.n.length !== w * h) { drift.n = new Uint8Array(w * h); drift.m = new Uint8Array(w * h); } drift.w = w;
  for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) {
    const x = i * 2;
    drift.n[y * w + i] = 255 * (banks ? 0.6 * vnoise((x + t * 25) / 46, y / 13, 256) + 0.4 * vnoise((x + t * 40) / 23, y / 7, 253) : 0.62 * vnoise((x + t * 96) / 64, y / 7, 257) + 0.38 * vnoise((x + t * 170) / 30, y / 4, 258));
    drift.m[y * w + i] = 255 * vnoise((x + t * 60) / (banks ? 110 : 120), y / (banks ? 17 : 13), 259);
  }
}
// The storm's cloud and blown snow, laid over what has been drawn so far as long streaks that travel with
// the wind. k is how much of the frame it hides; around (cx, cy) it thins so he can see his own feet. `keep` marks colours it leaves alone.
function veil(scr, k, tones, cx, cy, keep) {
  if (k <= 0.01) return;
  const { VW, VH, fb } = scr, near = cx != null, w = drift.w;
  for (let y = 0; y < VH; y++) {
    const row = y * VW, at = y * w;
    for (let x = 0; x < VW; x++) {
      let th = k * 1.2 - 0.12;
      if (near) { const d = Math.hypot((x - cx) / 84, (y - cy) / 46); if (d < 1) th -= (1 - d) * 0.8; }
      if (th * 255 > drift.n[at + (x >> 1)] && !(keep && keep[fb[row + x]])) fb[row + x] = tones[drift.m[at + (x >> 1)] > 127 ? 1 : 0];
    }
  }
}
// The word in the burst over the rack, five pixels wide and seven tall, a row of bits per line.
const GLYPH = { B: [30, 17, 17, 30, 17, 17, 30], A: [14, 17, 17, 31, 17, 17, 17], N: [17, 25, 25, 21, 19, 19, 17], G: [15, 16, 16, 23, 17, 17, 14], '!': [4, 4, 4, 4, 4, 0, 4] };

export function makeClimb() {
  const strips = {}, tops = {};
  const slope = (() => { const cfg = { kind: 'slope', pts: [[0, 0], [60, -12], [160, -62], [300, -150], [420, -236], [640, -400]] }; return { cfg, S: paint(cfg, 300) }; })();
  const far = new Strip(900, 200, 60);
  for (let x = 0; x < 900; x++) { const top = -70 - 110 * fbm(x / 60, 1.3, 240, 4) * (0.5 + 0.5 * Math.abs(Math.sin(x / 70))); for (let y = Math.round(top); y < 60; y++) far.set(x, y, y - top < 5 + 4 * vnoise(x / 5, 1, 241) ? R.farsnow[fbm((x + 2) / 60, 1.3, 240, 4) > fbm((x - 2) / 60, 1.3, 240, 4) ? 0 : 1] : pick('far', 0.5 + 0.4 * (vnoise(x / 5, y / 12, 242) - 0.5), x, y)); }
  // The rest of the massif stands behind whichever summit he is on.
  const mid = new Strip(900, 260, 80);
  { const tops = []; for (let k = 0; k < 9; k++) tops.push({ cx: 30 + k * 104 + hash(k, 1, 260) * 40, top: -230 + hash(k, 2, 260) * 150, sl: 1.5 + hash(k, 3, 260) * 1.1 });
    const sky = (s, i, x) => { const dx = Math.abs(x - s.cx); return s.top + dx * s.sl * (x < s.cx ? 1.1 : 0.92) + 6 * (1 - Math.exp(-dx / 2.5)) + 9 * (vnoise(x / 5, i * 3.1, 261) - 0.5) * Math.min(1, dx / 4) - 6 * Math.max(0, vnoise(x / 2.4, i, 262) - 0.62) / 0.38 * Math.min(1, dx / 5); };
    const order = tops.map((s, i) => i).sort((a, c) => tops[a].top - tops[c].top);
    for (const i of order) { const s = tops[i]; for (let x = 0; x < 900; x++) { const t0 = Math.round(sky(s, i, x)); if (t0 >= 80) continue; for (let y = t0; y < 80; y++) {
      const d = y - t0, face = x < s.cx ? 0.16 : -0.18, fr = frac((x - s.cx) / Math.max(3, y - s.top) * 2.6 + 0.3 * vnoise(x / 6, y / 6, 263 + i));
      const rock = Math.abs(x - s.cx - 3 * Math.sin(y / 11 + i * 2)) < 2 + (y - s.top) * 0.09 + 3 * (vnoise(x / 3, y / 5, 264 + i) - 0.5);
      const ice = (!rock && d > 12 + 9 * vnoise(x / 7, 4, 265)) || (fr > 0.62 && fr < 0.76 && d > 6 && !rock);
      mid.set(x, y, ice ? pick('glac', 0.62 + face * 0.8 + 0.2 * (vnoise(x / 4, y / 4, 266) - 0.5), x, y, 0.6) : d < 1 ? R.granite[1] : pick('granite', 0.5 + face + (fr < 0.5 ? 0.1 : -0.1) + 0.16 * (vnoise(x / 3, y / 5, 267) - 0.5), x, y, 0.8)); } } }
  }
  // The seracs of the icefall, standing behind the route on its benches: where along it, how wide, how tall.
  const seracs = [[-22, 15, 34], [8, 22, 52], [30, 12, 24], [70, 24, 66], [90, 14, 38], [128, 18, 46], [150, 26, 78], [176, 13, 36], [200, 20, 58], [232, 14, 40], [286, 18, 44]].map(([x, w, h], k) => ({ x, bm: makeSerac(700 + k * 7, w, h) }));
  const WALK = [[3, 8.5], [1, 8.5], [-2, 8.5], [-3, 7], [-1, 6.5], [2, 7]];
  const axe = (b, sh, hands, hip) => { const hx = sh[0] + hands[0][0], hy = sh[1] + hands[0][1]; for (let y = hy; y < hip[1] + 9; y++) b.set(hx + 1, y, R.rock[3]); b.set(hx, hy - 1, R.rock[4]); b.set(hx + 2, hy - 1, R.rock[4]); b.set(hx + 3, hy, R.rock[4]); b.set(hx - 1, hy - 1, R.blaze[1]); };
  // Him on the ice, drawn fresh each frame from where his hands and feet are. An ice tool seen from behind
  // is an orange grip, a shaft and a short head; it tips out to the side as he winds up. Crampons are the
  // grey teeth under each boot.
  const iceFig = p => backFig('alpine', { hands: p.hands, feet: p.feet, tilt: p.tilt, headY: p.headY, rack: false, tool: (b, x, y) => {
    const s = x < 22 ? -1 : 1, a = p.ang[s < 0 ? 0 : 1];
    if (p.tools) {
      const hx = x + s * 7 * Math.sin(a), hy = y - 1 - 7 * Math.cos(a);
      for (let k = 1; k <= 7; k++) b.set(lerp(x, hx, k / 7), lerp(y - 1, hy, k / 7), k < 3 ? R.blaze[1] : R.rock[3]);
      for (const d of [-1, 1, 2]) b.set(hx + s * d * Math.cos(a), hy + d * Math.sin(a), d === 2 ? R.rock[2] : R.rock[4]);
    }
    if (s < 0) for (const f of p.feet) { const fx = Math.round(22 + f[0]), fy = Math.round(28 + f[1]); b.set(fx, fy + 2, R.rock[4]); b.set(fx + 1, fy + 2, R.rock[3]); }
  } });
  const fig = {
    walk: [0, 1, 2, 3, 4, 5].map(f => sideFig('alpine', { feet: [WALK[f], WALK[(f + 3) % 6]], hands: [[4, 4 - (f % 3 === 0 ? 1 : 0)], [-2, 6]], bob: f % 3 === 1 ? -1 : 0, lean: 2, held: axe })),
    wind: [0, 1, 2, 3, 4, 5].map(f => sideFig('alpine', { feet: [WALK[f], WALK[(f + 3) % 6]], hands: [[4, 4], [3, 0]], bob: f % 3 === 1 ? -1 : 0, lean: 4, look: 'down', held: axe })),
    jump: sideFig('alpine', { feet: [[5, 5], [-4, 6]], hands: [[5, -5], [-4, -3]], lean: 3 }),
    crawl: [0, 1].map(f => sideFig('alpine', { feet: f ? [[1, 6], [-4, 6]] : [[-1, 6], [-2, 6]], crouch: 3, hands: f ? [[7, 5], [4, 6]] : [[5, 6], [6, 5]], lean: 6, look: 'down' })),
    sit: [0, 1].map(f => sideFig('alpine', { feet: [[8, 3], [7, 4 + f]], crouch: 6, lean: -2, hands: [[2, 4], [-4, 2 - f]], held: (b, sh, hands, hip) => { for (let k = 0; k < 7; k++) b.set(sh[0] - 4 - k, sh[1] + 2 - f + k, R.rock[3]); } })),
    stand: frontFig('alpine'), cheer: frontFig('alpine', { swing: -9 }),
    hit: [sideFig('alpine', { hands: [[-3, -2], [-1, 6]], lean: 0 }), sideFig('alpine', { hands: [[7, 1], [-1, 6]], lean: 2 })],
    watch: sideFig('alpine', { lean: 0 }),
    // At the binoculars: both hands up on the viewer, leaning in to the eyepieces.
    peer: sideFig('alpine', { hands: [[5, -4], [4, -2]], lean: 2, head: [1, 1], elbowFwd: true }),
    press: [0, 1].map(f => { const b = new BM(34, 22); b.ox = 17; b.oy = 21; for (let x = 8; x < 22; x++) { b.set(x, 13, R.kit[1]); b.set(x, 12, R.kit[2]); b.set(x, 14, R.kit[0]); } for (let x = 22; x < 28; x++) b.set(x, 13, R.rock[1]); thick(b, 26, 13, 29, 19, 2, R.rock[0]); b.set(30, 20, R.bark[1]); disc(b, 6, 11, 3, (nx, ny) => ny < -0.2 ? R.kit[2] : R.skin[2]); const by = f ? 3 : 8; thick(b, 12, 11, 12, by + 1, 2, R.kit[1]); thick(b, 16, 11, 16, by + 1, 2, R.kit[0]); for (let x = 3; x < 26; x++) b.set(x, by, R.rock[4]); for (const x of [3, 4, 24, 25]) for (let y = by - 3; y <= by + 3; y++) b.set(x, y, R.navy[0]); outline(b, INK); return b; })
  };
  const tents = [makeTent('tent'), makeTent('red')], flag = [makeFlag(0), makeFlag(1)], bb = [bluebird(0), bluebird(1)];
  const squirrel = (() => { const b = new BM(7, 5); b.ox = 3; b.oy = 4; b.set(1, 2, R.blaze[0]); b.set(2, 2, R.blaze[1]); b.set(3, 2, R.blaze[1]); b.set(4, 1, R.blaze[1]); b.set(5, 1, INK); b.set(0, 0, R.blaze[2]); b.set(0, 1, R.blaze[1]); b.set(1, 1, R.blaze[1]); b.set(2, 3, R.blaze[0]); b.set(4, 3, R.blaze[0]); return b; })();
  // Colours pale enough that a white flake or a white gust line would vanish on them.
  const pale = new Uint8Array(256); for (const c of [R.snow[3], R.snow[4], R.white[0], R.white[1], R.glac[4], R.glac[5], R.farsnow[0], R.farsnow[1]]) pale[c] = 1;

  const st = {}, focus = { x: 0, y: 0 };
  const clouds = [0, 1, 2, 3].map(i => ({ bm: makeCloud(640 + i), x: i * 170 + 40, y: 0.1 + (i % 3) * 0.13 + i * 0.02, v: 2.5 + i * 1.2 }));
  let cam = { x: 0, y: 0 }, last = { camX: 0, base: 0, id: '' }, egg = -99;
  const get = id => { if (!strips[id]) strips[id] = paint(ROUTES[id], 250 + Object.keys(ROUTES).indexOf(id) * 13); return strips[id]; };

  // Distance along the slope, so steep ground takes longer than easy ground.
  const arcs = {}, plans = {};
  const arc = id => { if (!arcs[id]) { const pts = ROUTES[id].pts, a = [0]; for (let x = 1; x <= SX; x++) a.push(a[x - 1] + Math.hypot(1, (hOf(pts, x) - hOf(pts, x - 1)) * 1.5)); arcs[id] = a; } return arcs[id]; };
  const arcAt = (a, x) => { const i = clamp(Math.floor(x), 0, SX - 1); return a[i] + (a[i + 1] - a[i]) * clamp(x - i, 0, 1); };
  function xAt(a, want) {
    let lo = 0, hi = SX;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m] < want) lo = m; else hi = m; }
    return lo + (want - a[lo]) / Math.max(1e-6, a[hi] - a[lo]);
  }
  // The ascent of a route as a list of legs: he walks to the foot of each wall of ice, climbs it, and walks
  // on. Walking is paced so the route's walking seconds are spent evenly along the slope.
  function plan(id) {
    if (plans[id]) return plans[id];
    const cfg = ROUTES[id], pts = cfg.pts, a = arc(id), legs = [];
    const walls = (cfg.ice || []).map(([xa, xb]) => ({ xa, xb, ya: hOf(pts, xa), x0: xa - 3, xc: xa + MID, top: hOf(pts, xa + MID) }));
    let dist = 0, x = 0; for (const w of walls) { dist += arcAt(a, w.x0) - arcAt(a, x); x = w.xc; } dist += a[SX] - arcAt(a, x);
    const speed = dist / cfg.secs; let t = T_UP; x = 0;
    const walk = x1 => { const d = arcAt(a, x1) - arcAt(a, x); legs.push({ t0: t, t1: t + d / speed, x0: x, x1 }); t += d / speed; x = x1; };
    walls.forEach((w, i) => { walk(w.x0); const leg = iceLeg(w, t, cfg.slip && cfg.slip[0] === i ? cfg.slip[1] : -1); legs.push(leg); t = leg.t1; x = w.xc; });
    walk(SX);
    return plans[id] = { legs, walls, tSum: t, tPush: t + T_STAND, tBot: t + T_STAND + T_SLIDE, dur: t + T_STAND + T_SLIDE + T_OUT };
  }
  function where(id, tau) {
    const cfg = ROUTES[id], pts = cfg.pts, pl = plan(id);
    if (tau < T_UP) { const x = -34 + 34 * tau / T_UP; return { ph: 'up', x, y: 0, mode: 'walk' }; }
    if (tau <= pl.tSum) {
      const leg = pl.legs.find(l => tau <= l.t1) || pl.legs[pl.legs.length - 1];
      if (leg.ice) { const pose = icePose(leg, tau - leg.t0); return pose.walk ? { ph: 'up', x: pose.x, y: pose.y, mode: 'walk' } : { ph: 'up', x: pose.hx, y: leg.w.ya - pose.hh + STAND, mode: 'ice', pose, leg }; }
      const a = arc(id), x = xAt(a, lerp(arcAt(a, leg.x0), arcAt(a, leg.x1), clamp((tau - leg.t0) / Math.max(1e-6, leg.t1 - leg.t0), 0, 1))); let y = hOf(pts, x), mode = 'walk';
      if (cfg.kind === 'ridge') mode = 'wind';
      if (cfg.gap && x > cfg.gap[0] - 4 && x < cfg.gap[1] + 2) {
        const u = (x - cfg.gap[0] + 4) / (cfg.gap[1] - cfg.gap[0] + 6);
        if (cfg.kind === 'bridge') { mode = 'jump'; y = lerp(hOf(pts, cfg.gap[0] - 4), hOf(pts, cfg.gap[1] + 2), u) - Math.sin(u * Math.PI) * 16; }
        else { mode = 'crawl'; y = lerp(hOf(pts, cfg.gap[0]), hOf(pts, cfg.gap[1]), clamp((x - cfg.gap[0]) / (cfg.gap[1] - cfg.gap[0]), 0, 1)) - 2; }
      }
      return { ph: 'up', x, y, mode };
    }
    if (tau < pl.tPush) return { ph: 'up', x: SX, y: hOf(pts, SX), mode: 'stand' };
    if (tau < pl.tBot) { const u = (tau - pl.tPush) / T_SLIDE, x = 400 * (1 - (u * 0.75 + 0.25 * (1 - sq(1 - u)))); return { ph: 'down', x, y: hOf(slope.cfg.pts, x), mode: 'sit' }; }
    const u = (tau - pl.tBot) / T_OUT; return { ph: 'down', x: -u * 34, y: 0, mode: 'walk', back: true };
  }
  // How long each summit's thing keeps him busy once it is clicked. He stays put until it is over.
  const BUSY = { bridge: 5.6, icefall: 1.5 };
  const busy = t => last.ph === 'up' && ROUTES[last.id] && t - egg < (BUSY[ROUTES[last.id].kind] || 0);

  return {
    name: 'climb',
    dur: arg => plan(arg.id).dur,
    stops: arg => { const pl = plan(arg.id); return [{ id: arg.id, at: pl.tSum / pl.dur }]; },
    elev: (arg, q) => -where(arg.id, q * plan(arg.id).dur).y,
    cues(arg) {
      const cfg = ROUTES[arg.id], pl = plan(arg.id), D = pl.dur, out = [{ at: pl.tPush / D, name: 'glissade' }, { at: (pl.tBot - 0.05) / D, name: 'step' }];
      if (cfg.gap) for (let tau = T_UP; tau < pl.tSum; tau += 0.02) if (where(arg.id, tau).x > cfg.gap[0] - 4) { out.push({ at: tau / D, name: cfg.kind === 'bridge' ? 'crack' : 'step' }); if (cfg.kind === 'bridge') out.push({ at: (tau + 0.05) / D, name: 'jump' }); break; }
      if (cfg.kind === 'ridge') out.push({ at: 0.6 / D, name: 'wind' });
      // The storm on the wanded route is heard as it arrives, and again as it closes in.
      if (cfg.kind === 'wands') for (const u of [0.09, 0.3, 0.5, 0.66]) out.push({ at: (T_UP + u * (pl.tSum - T_UP)) / D, name: 'wind' });
      for (const leg of pl.legs) if (leg.ice) for (const h of leg.hit) out.push({ at: h.t / D, name: h.tool ? 'tink' : 'step' });
      return out;
    },
    enter(scr, arg, q) { const w = where(arg.id, q * plan(arg.id).dur); cam.x = w.x; cam.y = w.y; st.y = null; egg = -99; st.fixed = false; st.banged = -99; },
    focus: () => focus,
    hold: env => busy(env.t),
    pick(sx, sy) {
      if (last.ph !== 'up' || last.away) return null;
      const cfg = ROUTES[last.id], x = sx + last.camX - OFF, y = sy - last.base, ty = hOf(cfg.pts, SX + 24), tall = TALL[cfg.kind] || 34;
      if (Math.abs(x - SX - 24) < 20 && y < ty + 3 && y > ty - tall) return { label: FINDS['egg:' + last.id][0], x: SX + 24 + OFF - last.camX, y: last.base + ty - tall - 2, act: 'egg' };
      if (cfg.kind === 'bridge' && Math.abs(x - 163) < 14 && Math.abs(y + 60) < 30) return { label: NAMES.climb.crevasse, x: sx, y: sy - 8 };
      if (cfg.kind === 'ridge' && x > 100 && x < 250 && Math.abs(y - hOf(cfg.pts, x)) < 8) return { label: NAMES.climb.ridge, x: sx, y: sy - 8 };
      return null;
    },
    act(id, env) { if (id === 'egg' && env.shown && env.t - egg > 6) { egg = env.t; env.sfx('egg'); env.found('egg:' + last.id); return true; } return false; },
    draw(scr, env, arg, q) {
      const { VW, VH, fb } = scr, { t } = env, id = arg.id, cfg = ROUTES[id], kind = cfg.kind, pl = plan(id);
      const tau = q * pl.dur, me = where(id, tau), S = me.ph === 'up' ? get(id) : slope.S, pts = me.ph === 'up' ? cfg.pts : slope.cfg.pts;
      cam.x += (me.x - cam.x) * Math.min(1, env.dt * 8); cam.y += (me.y - cam.y) * Math.min(1, env.dt * 6);
      const anchor = scr.narrow ? 0.5 : me.ph === 'up' ? 0.52 : 0.6, u = t - egg;
      // The rack is hit hard enough to shake the picture for a moment.
      const jolt = kind === 'icefall' && me.ph === 'up' && u > 0.36 && u < 0.86 ? 1 - (u - 0.36) / 0.5 : 0;
      const camX = Math.round(cam.x + OFF - VW * anchor + env.look.x * 0.4 + 3 * jolt * Math.sin(u * 95)), base = baseline(scr, env.shown, st) - Math.round(cam.y) - (scr.narrow ? 0 : 20) + Math.round(2 * jolt * Math.cos(u * 70));
      last = { camX, base, id, ph: me.ph, away: kind === 'bridge' && u > 0.7 && u < 5.05 };
      const up = clamp((tau - T_UP) / (pl.tSum - T_UP), 0, 1);
      const storm = kind === 'ridge' && me.ph === 'up' ? 1 - smooth(0.5, 0.86, up) : 0;
      // The storm on the wanded route blows in by stages as he gains height: gusts in clear air, a bank of
      // cloud sliding over from the right, the first flakes, heavy snow, then white. It lets go slowly near the top.
      let gust = 0, bank = 0, flakes = 0, heavy = 0, white = 0;
      if (kind === 'wands' && me.ph === 'up') {
        const clear = 1 - smooth(0.74, 0.98, up);
        gust = smooth(0.07, 0.14, up) * (1 - smooth(0.84, 0.99, up)); bank = smooth(0.1, 0.34, up) * clear;
        flakes = smooth(0.2, 0.3, up) * (1 - smooth(0.82, 0.99, up)); heavy = smooth(0.34, 0.5, up) * clear; white = smooth(0.5, 0.63, up) * clear;
      }

      // Sky: blue, or the grey of the storm it clears from.
      const sb = R.skyband, front = VW * (1.2 - 1.6 * bank), stormy = storm > 0 || bank > 0;
      if (stormy) blow(scr, t, storm > 0);
      for (let y = 0; y < VH; y++) {
        const f = clamp((y + 60 + cam.y * 0.3) / 320, 0, 1) * (sb.length - 1), b0 = Math.floor(f), e = f - b0, row = y * VW, at = y * drift.w;
        const rag = bank > 0 ? front + 90 * (vnoise(y / 34 + t * 0.1, 7, 262) - 0.5) - 30 : 0, lid = storm * 1.5 - 0.2;
        for (let x = 0; x < VW; x++) {
          let c = sb[Math.min(sb.length - 1, b0 + (e > 0.72 && bayer(x, y) < (e - 0.72) / 0.28 ? 1 : 0))];
          if (stormy) {
            const n = drift.n[at + (x >> 1)] / 255, m = drift.m[at + (x >> 1)] / 255;
            // On the ridge the storm is long banks of cloud driven sideways, dark above and paler toward the
            // horizon, tearing open in patches as he gains height. On the wanded route it is a grey bank
            // that slides in from the right with a ragged front.
            if (storm > 0) { if (n < lid) c = R.rock[clamp(Math.floor((0.1 + 0.7 * m + 0.3 * y / VH) * 5), 0, 4)]; }
            else if (x > rag + 60 * n) c = R.snow[m < 0.4 ? 0 : m < 0.6 ? 1 : 2];
          }
          fb[row + x] = c;
        }
      }
      // Fair-weather cloud drifting high over the range, when there is sky to see.
      if (storm < 0.3 && bank < 0.3) for (const c of clouds) scr.blit(c.bm, ((c.x + t * c.v - camX * 0.06) % (VW + 140) + VW + 140) % (VW + 140) - 70, c.y * VH * 0.5 + 12 + cam.y * 0.12);
      drawStrip(scr, far, 200 + camX * 0.15, base + 40 + cam.y * 0.8 + 30);
      drawStrip(scr, mid, 120 + camX * 0.42, base + cam.y * 0.55 + 46, false, 0);
      // A sea of cloud below the summits.
      for (let y = Math.max(0, Math.round(base + cam.y * 0.8 + 60)); y < VH; y++) { const row = y * VW, d = clamp((y - (base + cam.y * 0.8 + 60)) / 80, 0, 1); for (let x = 0; x < VW; x++) { const n = fbm((x + camX * 0.3 + t * 4) / 60, y / 14, 243, 3); if (n > 0.6 - d * 0.3) fb[row + x] = n > 0.68 - d * 0.3 ? R.white[1] : R.sky[4]; } }
      // The far peaks go first: the cloud takes them before any snow reaches him.
      veil(scr, smooth(0.25, 0.9, bank), [R.snow[1], R.snow[2]]);
      const X = x => Math.round(x + OFF - camX), Y = y => Math.round(base + y);
      // The icefall's seracs stand behind the route.
      if (kind === 'icefall' && me.ph === 'up') for (const s of seracs) scr.put(s.bm, X(s.x), Y(hOf(pts, s.x) + 7), false);
      drawStrip(scr, S, camX, base, false, R.snow[1]);
      // As the snow thickens, everything dark goes behind it (rock, the far wands, the edge of the slope) while the snow at his feet stays.
      if (heavy > 0.02) veil(scr, heavy * 0.85, [R.snow[1], R.snow[2]], X(me.x), Y(me.y) - 12, pale);
      // His tracks stay in the snow behind him: boot prints on the way up, one long groove on the way down.
      if (me.ph === 'up') { for (let x = -30; x < me.x - 3; x += 4) { if (cfg.gap && x > cfg.gap[0] - 6 && x < cfg.gap[1] + 6) continue; if (pl.walls.some(w => x > w.x0 + 2 && x < w.xc + 2)) continue; const y = hOf(pts, x); scr.set(X(x), Y(y) + 2, R.snow[1]); scr.set(X(x) + 1, Y(y) + 2, R.snow[2]); } }
      else if (me.mode === 'sit') for (let x = Math.ceil(me.x) + 4; x < 400; x++) { const y = hOf(pts, x); scr.set(X(x), Y(y) + 2, R.snow[2]); if (x & 1) scr.set(X(x), Y(y) + 3, R.snow[3]); }
      // Spindrift blows off the top.
      if (me.ph === 'up' && white < 0.3) for (let k = 0; k < 34; k++) { const a = frac(t * (0.5 + storm) + k / 34), x0 = SX + 38 + (k % 5) * 3, y0 = hOf(pts, x0) - 1; const x = X(x0 + a * (46 + 30 * storm) + 4 * Math.sin(a * 9 + k)), y = Y(y0 - a * 13 - 3 * Math.sin(a * 5 + k * 2)); if (bayer(x, y) > a * 0.9) scr.set(x, y, a < 0.4 ? R.white[1] : R.snow[3]); }
      // Snow driven flat across everything while the storm lasts.
      if (storm > 0.05) for (let k = 0; k < 150 * storm; k++) { const sp = 220 + hash(k, 1, 255) * 160, x = Math.round(VW + 20 - frac(hash(k, 2, 255) + t * sp / (VW + 40)) * (VW + 40)), y = Math.round(frac(hash(k, 3, 255) + t * 0.11) * VH), len = 2 + (k % 4); for (let j = 0; j < len; j++) scr.set(x + j, y - (j >> 2), j ? R.snow[3] : R.white[1]); }

      const tx = SX + 24, ty = hOf(pts, tx);
      let bird = null;
      if (me.ph === 'up') {
        // The crux of each route.
        if (kind === 'bridge') {
          const [g0, g1] = cfg.gap, y0 = hOf(pts, g0), y1 = hOf(pts, g1);
          for (let x = g0; x <= g1; x++) { const u = (x - g0) / (g1 - g0), by = lerp(y0, y1, u) + Math.sin(u * Math.PI) * 3; const drop = me.x > g0 - 2 ? Math.max(0, (me.x - g0 + 2) / (g1 - g0 + 4) - u * 0.5) * 120 * (0.5 + hash(x, 2, 248)) : 0; for (let j = 0; j < 5; j++) scr.set(X(x), Y(by + j + drop), j === 0 ? R.snow[4] : R.snow[2 + (j < 3 ? 1 : 0)]); }
        }
        if (kind === 'ladder') { const [g0, g1] = cfg.gap, y0 = hOf(pts, g0), y1 = hOf(pts, g1); for (let x = g0 - 4; x <= g1 + 4; x++) { const u = (x - g0) / (g1 - g0), y = lerp(y0, y1, u); scr.set(X(x), Y(y), R.rock[4]); scr.set(X(x), Y(y + 2), R.rock[2]); if ((x - g0) % 4 === 0) scr.set(X(x), Y(y + 1), R.rock[3]); } for (const [x, y] of [[g0 - 5, y0], [g1 + 5, y1]]) { scr.set(X(x), Y(y - 3), R.blaze[1]); scr.set(X(x), Y(y - 2), R.rock[3]); scr.set(X(x), Y(y - 1), R.rock[3]); } }
        // The thing on the summit, and whatever it does when clicked.
        if (kind === 'icefall') {
          // He hits it, it bangs, and its lights stutter from red to green and stay there for the visit.
          if (u > 0.36 && u < 1.5 && st.banged < egg) { st.banged = t; st.fixed = true; env.sfx('bang'); }
          scr.put(TOPS.icefall(u > 0.36 && u < 1.05 ? 'flicker' : st.fixed ? 'green' : 'red', Math.floor(t * (u < 1.05 ? 16 : 3)), !st.fixed), X(tx), Y(ty), false);
          // The snow comes off its roof.
          const a = t - st.banged; if (a < 0.9) for (let k = 0; k < 18; k++) { const px = tx - 11 + (k * 23 % 24) + (hash(k, 1, 249) - 0.5) * 30 * a, py = ty - 36 - 30 * hash(k, 2, 249) * a + 110 * a * a; if (py < ty + 1) { scr.set(X(px), Y(py), R.snow[4]); scr.set(X(px) + 1, Y(py), R.snow[k & 1 ? 4 : 3]); if (k % 3 === 0) scr.set(X(px), Y(py) + 1, R.snow[3]); } }
        }
        else if (kind === 'ridge') scr.put(TOPS.ridge(Math.floor(t * (storm > 0.3 ? 14 : 5)) & 3), X(tx), Y(ty), false);
        else if (kind !== 'wands') scr.put((tops[kind] = tops[kind] || TOPS[kind]()), X(tx), Y(ty), false);
        if (kind === 'wands') { tops.wands = tops.wands || TOPS.wands(); scr.put(tops.wands, X(tx), Y(ty), false); const off = u < 3.4; if (off && u > 0.5) { const a = clamp((u - 0.5) / 0.6, 0, 1), back = clamp((u - 2.4) / 0.7, 0, 1), px = lerp(tx + 2, tx + 16, a - back), py = ty - 14 + (a - back) * 13 - Math.sin((a < 1 ? a : back) * Math.PI) * (a < 1 ? 5 : 12); scr.put(stone, X(px), Y(py), false); } else scr.put(stone, X(tx + 2), Y(ty - 14), false); }
        if (kind === 'ladder') { scr.put(speck(u < 4.5 && u > 3 ? Math.floor(t * 8) & 1 : 0), X(tx), Y(ty - 64), false); if (u < 6) { const lit = Math.floor(clamp(u / 3, 0, 1) * 9), sq2 = clamp(u / 3, 0, 1); for (let k = 0; k < 9; k++) { const a = k / 9, lx = tx + Math.sin(k * 2.1) * (3 + a * 13), ly = ty - 6 - a * 52; if (k < lit && (u < 4.6 || (Math.floor(t * 6) & 1))) { scr.set(X(lx), Y(ly), R.white[1]); scr.set(X(lx) - 1, Y(ly), R.yellow[1]); scr.set(X(lx) + 1, Y(ly), R.yellow[1]); scr.set(X(lx), Y(ly) - 1, R.yellow[1]); scr.set(X(lx), Y(ly) + 1, R.yellow[1]); } } if (u < 3) scr.put(squirrel, X(tx + Math.sin(sq2 * 9 * 2.1 / 1) * (3 + sq2 * 10)), Y(ty - 4 - sq2 * 54), Math.cos(sq2 * 19) < 0); } }
        // The bluebird comes in from beyond the right edge, circles his head, and leaves the way it came,
        // climbing, until it is off the picture.
        if (kind === 'ridge' && u < 20) {
          const hx = X(me.x), hy = Y(me.y) - 26, ring = a => [hx + Math.cos(a * 3.2) * 14, hy + Math.sin(a * 3.2) * 6];
          let p, left;
          if (u < 1.1) { const k = smooth(0, 1.1, u), to = ring(1.1); p = [lerp(VW + 14, to[0], k), lerp(hy - 52, to[1], k) - 10 * Math.sin(k * Math.PI)]; left = true; }
          else if (u < 3.6) { p = ring(u); left = Math.sin(u * 3.2) > 0; }
          else { const a = u - 3.6, from = ring(3.6); p = [from[0] + 50 * a + 70 * a * a, from[1] - 26 * a - 6 * Math.sin(a * 5)]; left = false; }
          if (p[0] < VW + 14) bird = { x: Math.round(p[0]), y: Math.round(p[1]), left };
        }
      } else {
        // Camp at the bottom of the glissade.
        scr.put(tents[0], X(-46), Y(-1), false); scr.put(tents[1], X(-66), Y(1), false);
      }
      const sx = X(me.x), sy = Y(me.y);
      // The blown snow closes over the slope, thinnest around him, and the wands lead through it: the
      // nearest in full colour, the next only as shapes.
      if (kind === 'wands' && me.ph === 'up') {
        veil(scr, white, [R.snow[3], R.snow[4]], sx, sy - 12);
        for (let wx = 20; wx < SX; wx += 38) {
          const away = Math.abs(wx - me.x), ghost = white > 0.35 && away > 60; if (white > 0.35 && away > 132) continue;
          const wy = hOf(pts, wx); for (let j = 1; j < 15; j++) scr.set(X(wx), Y(wy - j), ghost ? R.snow[2] : R.wood[3]);
          const fl = Math.floor(t * (6 + 6 * gust) + wx) & 1; for (let i = 1; i < 5; i++) for (let j = 0; j < 3; j++) scr.set(X(wx) - i, Y(wy - 15 + j + (fl && i > 2 ? 1 : 0)), ghost ? R.snow[2] : R.blaze[j === 0 ? 2 : 1]);
          scr.set(X(wx), Y(wy - 15), ghost ? R.snow[2] : R.wood[4]);
        }
      }

      // Himself.
      const d = me.x, stopId = env.shown && !env.moving ? env.shown : null, acting = me.ph === 'up' && u < (BUSY[kind] || 0);
      let bm, flip = false, dy = 0, dx = 0;
      if (acting && kind === 'bridge') {
        // He walks over to the binoculars, leans in, and afterwards walks back.
        dx = 10 * (u < 2 ? smooth(0, 0.5, u) : 1 - smooth(5.05, 5.55, u));
        if (u < 0.5 || u > 5.05) { bm = fig.walk[Math.floor(dx / 2.4) % 6]; flip = u > 5.05; } else bm = u < 0.62 || u > 4.95 ? fig.watch : fig.peer;
      } else if (acting && kind === 'icefall') {
        dx = 6 * (smooth(0, 0.12, u) - smooth(1.3, 1.5, u));
        bm = u < 0.12 ? fig.walk[1] : u < 0.36 ? fig.hit[0] : u < 0.62 ? fig.hit[1] : fig.watch;
      } else if (stopId || me.mode === 'stand') {
        bm = fig.stand;
        if (u < 5) { if (kind === 'ice' && u > 0.4 && u < 4.2) { bm = null; scr.put(fig.press[Math.floor((u - 0.4) * 1.6) & 1], X(SX + 24), Y(hOf(pts, SX + 24) - 4), false); } else if (kind === 'wands' && u < 1.2) bm = fig.hit[u > 0.35 && u < 0.7 ? 1 : 0]; else if (kind === 'ridge' || kind === 'ladder') bm = u > 3 ? fig.cheer : fig.stand; }
      } else if (me.mode === 'sit') { bm = fig.sit[Math.floor(t * 8) & 1]; flip = true; dy = 2; for (let k = 0; k < 14; k++) { const a = frac(t * 2.4 + k / 14); scr.set(Math.round(sx + 6 + a * 30 + hash(k, 1, 251) * 6), Math.round(sy - 2 - a * (8 + hash(k, 2, 251) * 16) + a * a * 10), a < 0.6 ? R.white[1] : R.snow[3]); } }
      else if (me.mode === 'ice') {
        const p = me.pose, w = me.leg.w;
        scr.put(iceFig(p), X(p.rx), Y(p.ry), false);
        // Chips of ice fly from every placement, a bigger piece when a foot skates off.
        for (const h of me.leg.hit) { const a = tau - h.t; if (a < 0 || a > 0.5) continue; for (let k = 0; k < (h.big ? 9 : 5); k++) { const r1 = hash(k, Math.round(h.t * 40), 271), r2 = hash(k, Math.round(h.t * 40), 272), px = w.xc + h.side * (h.tool ? 6 : 5) + (r1 - 0.5 + 0.25 * h.side) * 44 * a, py = w.ya - h.h - (4 + 26 * r2) * a + 120 * a * a, c = k % 3 === 0 ? R.glac[1] : k & 1 ? R.white[1] : R.glac[5]; scr.set(X(px), Y(py), c); if (h.big && k < 4) { scr.set(X(px) + 1, Y(py), R.glac[5]); scr.set(X(px), Y(py) + 1, R.glac[1]); } } }
      }
      else if (me.mode === 'jump') bm = fig.jump;
      else if (me.mode === 'crawl') bm = fig.crawl[Math.floor(d / 4) & 1];
      else { bm = ((me.mode === 'wind' && storm > 0.25) || (gust > 0.3 && up < 0.9) ? fig.wind : fig.walk)[env.moving ? Math.floor(Math.abs(d) / 3.6) % 6 : 1]; flip = !!me.back; }
      if (bm) { scr.put(bm, sx + Math.round(dx), sy + dy, flip); }
      focus.x = sx; focus.y = sy - 14;
      if (bird) scr.put(bb[Math.floor(t * 10) & 1], bird.x, bird.y, bird.left);
      if (env.done['spire:' + id] && me.ph === 'up') scr.blit(flag[Math.floor(t * 5) & 1], X(SX + 4), Y(hOf(pts, SX + 4)) - 15);

      // Spindrift tearing across the ridge until the weather breaks.
      if (storm > 0) for (let k = 0; k < 90 * storm; k++) { const x = Math.round(((hash(k, 1, 252) * (VW + 80) - t * (180 + hash(k, 3, 252) * 140)) % (VW + 80) + VW + 80) % (VW + 80)) - 40, y = Math.round(hash(k, 2, 252) * VH + 6 * Math.sin(t * 3 + k)); for (let i = 0; i < 3 + (k & 3); i++) scr.set(x + i, y, R.white[1]); }
      // Snow falling across the wanded route: a few flakes at first, then thick, in three sizes, the big
      // ones nearest and fastest. A flake over white ground is drawn grey so it can still be seen.
      if (flakes > 0.02) {
        const n = Math.round(flakes * 30 + heavy * 300), dot = (x, y, c) => { if (x >= 0 && y >= 0 && x < VW && y < VH) fb[y * VW + x] = c === 1 ? (pale[fb[y * VW + x]] ? R.snow[1] : R.white[1]) : c; };
        for (let k = 0; k < n; k++) {
          const big = k % 9 === 4, med = k % 3 === 1, vy = 30 + 46 * hash(k, 1, 270) + (big ? 34 : 0), vx = (60 + 100 * hash(k, 2, 270)) * (0.5 + 0.7 * heavy + 0.3 * gust) * (big ? 1.4 : 1);
          const x = Math.round(((hash(k, 3, 270) * (VW + 40) - t * vx) % (VW + 40) + VW + 40) % (VW + 40)) - 20 + Math.round(2 * Math.sin(t * 2.2 + k)), y = Math.round((hash(k, 4, 270) * (VH + 20) + t * vy) % (VH + 20)) - 10;
          dot(x, y, 1); if (med || big) dot(x + 1, y, 1); if (big) { dot(x, y + 1, 1); dot(x + 1, y + 1, 1); dot(x + 2, y - 1, R.white[1]); }
        }
      }
      // Wind, the way a cartoon draws it: a stroke that runs out ahead of itself and curls over at its
      // leading end, sometimes with a shorter one under it. Each lives under a second and the next starts somewhere else.
      if (gust > 0.02) {
        const ink = (x, y) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < VW && y < VH) fb[y * VW + x] = pale[fb[y * VW + x]] ? R.snow[1] : R.white[1]; };
        for (let k = 0; k < Math.round(gust * 9); k++) {
          const life = 0.7 + 0.4 * hash(k, 1, 273), turn = t / life + hash(k, 2, 273), a = frac(turn), go = Math.floor(turn);
          const x0 = hash(k, go, 274) * (VW + 60) - a * 150, y0 = 14 + hash(go, k, 275) * (VH * 0.8), len = Math.round(8 + 30 * Math.sin(a * Math.PI));
          for (let i = 0; i < len; i++) ink(x0 + i, y0 + 1.4 * Math.sin(i / 8 + k));
          if (a > 0.2 && a < 0.85) for (const [cx, cy] of [[-1, 0], [-2, -1], [-3, -2], [-3, -3], [-2, -4], [-1, -4], [0, -3], [0, -2], [-1, -2]]) ink(x0 + cx, y0 + cy + 1.4 * Math.sin(k));
          if (k % 2 === 0) for (let i = 6; i < len * 0.6; i++) ink(x0 + i + 8, y0 + 4 + 1.4 * Math.sin(i / 8 + k));
        }
      }
      // The burst over the rack when he hits it: a spiked star with the word in it.
      if (kind === 'icefall' && me.ph === 'up' && t - st.banged < 0.8) {
        const a = t - st.banged, grow = Math.min(1, a / 0.07) * (a > 0.68 ? 1 - (a - 0.68) / 0.12 : 1), bx = X(tx - 24) + Math.round(Math.sin(a * 60)), by = Y(ty - 70), rx = 25 * grow, ry = 14 * grow, word = UI.bang;
        for (let y = -18; y <= 18; y++) for (let x = -30; x <= 30; x++) { const ang = Math.atan2(y / 14, x / 25), spike = 0.74 + 0.26 * Math.abs(frac(ang * 11 / 6.2832 + 0.25) * 2 - 1), dd = Math.hypot(x / Math.max(1, rx), y / Math.max(1, ry)) / spike; if (dd < 1) scr.set(bx + x, by + y, dd > 0.86 ? INK : dd > 0.7 ? R.blaze[1] : dd > 0.5 ? R.yellow[1] : R.white[1]); }
        if (grow > 0.9) { const x0 = bx - Math.floor(word.length * 3) + 1; [...word].forEach((ch, i) => (GLYPH[ch] || []).forEach((bits, j) => { for (let b = 0; b < 5; b++) if (bits & (16 >> b)) scr.set(x0 + i * 6 + b, by - 3 + j, INK); })); }
      }
      // He pushes off in a burst of snow, and the glissade is under way.
      const puff = 1 - Math.abs(tau - (pl.tPush + 0.02)) / 0.28;
      if (puff > 0) for (let y = 0; y < VH; y++) { const row = y * VW; for (let x = 0; x < VW; x++) if (bayer(x, y) < puff * 1.3) fb[row + x] = R.snow[4]; }
      // Through the binoculars: the picture closes on the eyepiece, opens on the Trailhead far below as a
      // round view that drifts a little, holds, and closes and opens again on the summit.
      if (kind === 'bridge' && acting && u > 0.7 && u < 5.05) {
        const ex = X(tx - 8), ey = Y(ty - 23), all = Math.hypot(VW, VH);
        if (u < 1.05) scr.iris(ex, ey, all * (1 - smooth(0.7, 1.05, u)) - 4);
        else if (u < 4.7) {
          const vx = Math.round(scr.narrow ? VW * 0.5 : VW * 0.64), vy = Math.round(scr.narrow ? VH * 0.26 : VH * 0.44), r = scr.narrow ? Math.min(VW * 0.42, VH * 0.22) : Math.min(VH * 0.36, VW * 0.2);
          if (env.mapStill) env.mapStill(Math.round(JUNCTION.x + 12 - vx + 5 * Math.sin(u * 0.9)), Math.round(JUNCTION.y - 10 - vy + 3 * Math.cos(u * 0.7))); else fb.fill(R.navy[0]);
          scr.iris(vx, vy, r * Math.min(smooth(1.05, 1.35, u), 1 - smooth(4.4, 4.7, u)) - 2);
        } else scr.iris(ex, ey, all * smooth(4.7, 5.05, u) - 4);
      }
    }
  };
}
