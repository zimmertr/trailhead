// Sideproject Spires, base camp: one tent on a rock island in the middle of a great glacier, under the
// granite wall of the Spires and its six summits, one per project, with the ice sheet running off to
// far ranges behind. Click a summit and he sets off. The picture is painted to fit the screen it is on, at the same pixel size
// as everything else, and keeps the towers and the camp clear of the card.
import { clamp, smooth, frac, sq, rng, hash, vnoise, fbm, bayer, R, INK, pick, BM, outline, thick } from './core.js';
import { makeCloud, makeFlag, makeBoulder } from './sprites.js';
import { ell, speck } from './fauna.js';
import { makeRunner, sideFig } from './tj.js';
import { makeKayti } from './people.js';
import { NAMES } from './content.js';
import { veil, flurry, spindrift, shadow } from './weather.js';

// The six projects, west to east along the wall (where each summit stands is in paintSpires).
export const SPIRES = [
  { id: 'bluebird', name: 'Bluebird Forecast' },
  { id: 'tks', name: 'TJs-Kubernetes-Service' },
  { id: 'hevy-garmin-sync', name: 'hevy-garmin-sync' },
  { id: 'trailhead', name: 'trailhead' },
  { id: 'yggdrasil', name: 'yggdrasil' },
  { id: 'kubernetes-manifests', name: 'Kubernetes-Manifests' }
];

const tri = u => 1 - Math.abs(2 * frac(u) - 1);
// A row of drawn peaks: three sizes of triangle laid over each other, each peak its own height.
const peaks = (x, s, seed) => { let m = 0; for (const [k, o] of [[1, 0.13], [0.62, 0.57], [0.41, 0.31]]) { const u = x / (s * k) + o + seed * 0.37; m = Math.max(m, tri(u) * (0.35 + 0.65 * hash(Math.floor(u), seed, 240)) * (0.55 + 0.45 * k)); } return m; };

// A dome tent, bigger than the one on the map: this is the camp seen from close by.
export function dome(c) {
  const b = new BM(28, 16); b.ox = 14; b.oy = 15;
  for (let y = 0; y < 14; y++) { const half = Math.sqrt(1 - sq((13 - y) / 14)) * 13; for (let x = Math.ceil(14 - half); x <= 14 + half; x++) b.set(x, y + 1, x < 10 ? R[c][2] : x < 19 ? R[c][1] : R[c][0]); }
  for (let y = 6; y < 14; y++) for (let x = Math.ceil(13 - (y - 6) * 0.45); x <= 15 + (y - 6) * 0.45; x++) b.set(x, y + 1, y === 6 ? R[c][0] : R.navy[0]);
  for (let y = 1; y < 14; y++) b.set(Math.round(6 + sq((13 - y) / 13) * 7), y + 1, R[c][0]);
  outline(b, INK);
  return b;
}

// The camp stove with a pot on it, where the smoke comes from.
export function stove() {
  const b = new BM(7, 8); b.ox = 3; b.oy = 7;
  for (let x = 1; x < 6; x++) { b.set(x, 1, R.rock[4]); b.set(x, 2, R.rock[x < 3 ? 4 : 3]); b.set(x, 3, R.rock[2]); }
  b.set(3, 4, R.yellow[1]); b.set(2, 4, R.tent[1]); b.set(4, 4, R.tent[1]);
  for (let x = 2; x < 5; x++) b.set(x, 5, R.rock[0]);
  b.set(1, 6, R.rock[1]); b.set(3, 6, R.rock[0]); b.set(5, 6, R.rock[1]);
  outline(b, INK);
  return b;
}

// A goat out in the middle distance: the same cream animal as the big one in fauna.js, drawn to a few
// pixels. pose: 'stand', 'look' with the head up, 'graze' with it down.
function farGoat(pose, kid) {
  const s = kid ? 0.7 : 1, b = new BM(18, 14); b.ox = 7; b.oy = 13;
  const wool = (nx, ny) => ny < -0.35 ? R.white[1] : ny < 0.5 ? R.white[0] : R.gold[4];
  const bx = 7, by = 12 - 5.4 * s;
  for (const [lx, far] of [[-2.8, 1], [-1.8, 0], [2, 1], [3, 0]]) thick(b, bx + lx * s, by + 1, bx + lx * s, 12, 1, far ? R.gold[4] : R.white[0]);
  ell(b, bx, by, 4.3 * s, 2.5 * s, wool); ell(b, bx + 2.2 * s, by - 1.1 * s, 2.1 * s, 1.7 * s, wool);
  const hx = Math.round(bx + (pose === 'graze' ? 5.4 : 5) * s), hy = Math.round(pose === 'look' ? by - 3.6 * s : pose === 'graze' ? by + 3 * s : by - 2.4 * s);
  thick(b, bx + 3.2 * s, by - 0.6 * s, hx, hy, 2, R.white[1]);
  ell(b, hx + 0.5, hy, 1.8 * s, 1.4 * s, wool); b.set(hx + 2, hy + 1, R.white[0]);
  if (!kid) b.set(hx + 1, hy + 2, R.white[0]);
  outline(b, INK);
  // Eye and horns go on after the outline, so they stay single pixels.
  b.set(hx + 1, hy, INK); b.set(hx - 1, hy - 2, INK); if (!kid) b.set(hx - 2, hy - 3, INK);
  return b;
}

// The Spires as the map draws them (section 4a, the six climbs): one granite wall of six summits, west
// to east in the order of SPIRES. Bluebird Forecast is the west end summit, standing clear; TJs-Kubernetes-
// Service the second; hevy-garmin-sync the third, a long snow gully running down from the notch beside
// it; trailhead the fourth and the highest of the six (round 5, T57), the knife-edge running up to it
// from the third; yggdrasil the fifth, on the dry rock of the east arm, where no snow lies;
// Kubernetes-Manifests the east end summit.
// Art pass C01, after a generated picture of the wall from camp (design/art/C01/) and the map's own towers
// (A01): each summit is a broad, blunt tower, its rough rounded top breaking over into sheer sides, with a
// deep notch to its neighbour and a snow couloir running down from the notch, fanning out at the foot.
// The rock is grey, lit on the west faces and in blue-grey shade on the east, its shoulders darkest, cut
// by long broken vertical cracks; snow caps the tops and lies on a few ledges near them, and nowhere else.
// Painted into b between x0 and x1, its foot at yb, the highest summit H above it. Returns where each
// project's summit is (geo, in SPIRES order) and the wall's foot in each column (feet).
// Each summit: where it stands across the wall (u), its height, and its half width at the two ends.
const SUMMITS = [[0.08, 0.68, 0.13], [0.26, 0.82, 0.14], [0.45, 0.9, 0.15], [0.63, 1, 0.14], [0.79, 0.7, 0.13], [0.94, 0.53, 0.12]];
const AT = SUMMITS.map(s => s[0]);
// The couloirs, from the notches between summits: where, and how far down the wall they run.
const GULLIES = [[0.17, 0.95], [0.355, 1], [0.54, 0.75], [0.71, 0.5]];
// What makes each tower its own (C01): how much of the gap to each neighbour it takes, a lower shoulder
// stepped down on one side (-1 west, 1 east, 0 none) and how high, and how soon its top breaks over.
const SHAPE = [[0.9, 1, 0.84, 0.8], [1.05, -1, 0.86, 0.88], [0.95, 1, 0.9, 0.84], [1.0, -1, 0.82, 0.9], [0.88, 1, 0.8, 0.78], [1.0, 0, 0, 0.82]];
// Smaller pinnacles standing in some of the notches, beside the couloir: where, how high, how wide.
const MINOR = [[0.195, 0.62, 0.022], [0.515, 0.7, 0.018], [0.69, 0.56, 0.02], [0.885, 0.5, 0.024]];
// One pixel of rock face. p runs from -1 at a tower's west shoulder to 1 at its east one; d is how far
// below the skyline the pixel is, hgt how tall the face is there; dry is the east arm, where no snow lies.
function face(x, y, p, d, hgt, n, dry, sc) {
  const z = Math.max(0.7, sc), up = d / Math.max(1, hgt);
  // Snow: a cap on the top, its lower edge ragged, and a few ledges in the top quarter.
  const cap = (2.5 + 2.5 * vnoise(x / (3 * z), n, 330)) * z * (1 - smooth(0.7, 1, Math.abs(p)));
  if (dry < 0.5 && d < cap) return d < 1 ? R.snow[2] : R.snow[p < 0.2 ? 4 : 3];
  // A ledge is a short stroke of snow, a pixel deep, a few wide.
  const row = Math.floor(y / (4 * z)), seg = Math.floor((x + 3 * hash(row, 0, 335)) / (5 * z));
  if (dry < 0.5 && up < 0.18 && y === Math.floor(row * 4 * z) && hash(seg, row, 332) < 0.07) return R.snow[p < 0.2 ? 4 : 3];
  if (d < 1) return R.rock[0];
  // Broad planes of rock, each a little lighter or darker, the edge on its east side in shade.
  const pl = (x - 0.04 * y) / (16 * z) + 0.6 * vnoise(x / (30 * z), n, 336), pk = Math.floor(pl), pf = pl - pk;
  let v = 0.62 - 0.42 * p - 0.25 * smooth(0.72, 1, Math.abs(p)) + 0.16 * (hash(pk, n, 337) - 0.5) - (pf > 0.88 ? 0.18 : 0) + 0.08 * (vnoise(x / 3, y / 9, 333 + n) - 0.5) + 0.05 * dry - 0.12 * smooth(0.6, 1, up);
  // Long vertical cracks, wavering a little, broken here and there; each has a lit lip on its west side.
  const c = (x + 1.2 * Math.sin(y / 13 + x / 9)) / (5 * z), f = frac(c), on = vnoise(c * 1.7, y / (12 * z), 334 + n) > 0.34;
  if (on && Math.abs(f - 0.5) < 0.07) v -= 0.3; else if (on && f > 0.57 && f < 0.64) v += 0.1;
  return pick('rock', clamp(v, 0, 1), x, y, 0.7);
}
export function paintSpires(b, x0, x1, yb, H, feet) {
  const span = x1 - x0, U = x => (x - x0) / span, sc = Math.min(1, span / 220);
  // Which summit's tower a column belongs to and where across it (p), and how high the wall stands there
  // (0 to 1 of H): the towers' rounded profiles, as on the map, over a low wall between them.
  const mass = u => {
    let e = 0.42 + 0.05 * vnoise(u * 9, 1, 300), k = -1, p = 0;
    SUMMITS.forEach(([su, sh, hw0], i) => {
      const [wk, side, shh, brk] = SHAPE[i], nb = SUMMITS[i + (u < su ? -1 : 1)], hw = (nb ? Math.abs(nb[0] - su) / 2 : hw0 * 0.7) * wk, q = (u - su) / hw, s = Math.abs(q);
      // The top, with its shoulder: past halfway out on that side it drops to a lower step before breaking over.
      const step = side && Math.sign(q) === side ? smooth(0.42, 0.5, s) * (1 - shh) : 0;
      const v = sh * (1 - 0.2 * s * s - step - 3.5 * Math.pow(Math.max(0, s - brk - 0.05 * (vnoise(u * 60, i, 338) - 0.5)), 1.4) + q * (i & 1 ? -0.05 : 0.05));
      if (v > e) { e = v; k = i; p = clamp(q, -1, 1); }
    });
    for (const [mu, mh, mw] of MINOR) { const q = (u - mu) / mw, s = Math.abs(q), v = mh * (1 - 0.25 * s * s - 3 * Math.pow(Math.max(0, s - 0.7), 1.3)); if (v > e) { e = v; k = 6; p = clamp(q, -1, 1); } }
    const kn = 0.78 * smooth(0.47, 0.5, u) * smooth(0.6, 0.57, u); if (kn > e) { e = kn; k = 3.5; p = (u - 0.535) / 0.07; }
    return [e, k, p];
  };
  const knife = u => smooth(0.48, 0.51, u) * smooth(0.59, 0.56, u);
  // The skyline: the masses, roughened a little along the tops, and small teeth along the knife-edge.
  const top = x => { const u = U(x), [e] = mass(u), w = x / (5 * sc), tooth = knife(u) * 4 * sc * tri(w) * (0.3 + 0.7 * hash(Math.floor(w), 3, 302)); return yb - H * e * smooth(-0.04, 0.03, u) * smooth(1.04, 0.97, u) - tooth - 2.2 * sc * (vnoise(x / 3, 2, 301) - 0.5) - 3 * sc * Math.max(0, vnoise(x / 7, 5, 339) - 0.55) / 0.45; };
  const dryAt = u => smooth(0.69, 0.74, u) * smooth(0.89, 0.85, u);
  for (let x = Math.max(0, Math.round(x0 - span * 0.04)); x <= Math.min(b.w - 1, x1 + span * 0.04); x++) {
    const u = U(x), t0 = Math.round(top(x)), dry = dryAt(u), foot = Math.round(yb + 3 * (vnoise(x / 9, 7, 303) - 0.5));
    if (t0 >= foot) continue;
    const [, k, p] = mass(u), hgt = foot - t0, apron = hgt * (0.7 + 0.12 * vnoise(x / 11, 8, 304) + 0.15 * dry);
    for (let y = Math.max(0, t0); y <= Math.min(b.h - 1, foot); y++) {
      const d = y - t0;
      let gully = 0;
      for (const [gu, len] of GULLIES) { const gx = x0 + gu * span, gt = top(gx) + 1, kk = (y - gt) / (foot - gt); if (kk < -0.02 || kk > len + 0.3) continue; const o = x - gx - 2 * Math.sin(y / 8) * sc, w = (1.2 + 2.5 * sc * Math.max(0, kk) + 12 * sc * smooth(len - 0.25, len + 0.25, kk)) * (kk > len ? Math.max(0, 1 - (kk - len) / 0.3) : 1); if (Math.abs(o) < w) gully = o > w - 1.2 ? 2 : 1; }
      let c;
      if (gully && dry < 0.5) c = gully === 2 ? R.glac[3] : pick('snow', 0.86 - 0.1 * vnoise(x / 2, y / 3, 310), x, y, 0.5);
      else if (d > apron) c = pick('glac', 0.74 + 0.1 * (p < 0 ? 1 : -1) * smooth(0, 0.4, Math.abs(p)) + 0.15 * (vnoise(x / 4, y / 4, 306) - 0.5) - (frac((d - apron) / 9 + 0.6 * vnoise(x / 20, 4, 311)) < 0.1 ? 0.28 : 0), x, y, 0.6);
      else c = face(x, y, k < 0 ? 0.3 : p, d, hgt, Math.floor(k) + 1, dry, sc);
      b.set(x, y, c);
    }
    if (feet) feet.push([x, foot]);
  }
  return SPIRES.map((sp, k) => { const x = Math.round(x0 + AT[k] * span); let t = top(x); for (let i = -4; i <= 4; i++) t = Math.min(t, top(x + i)); return { id: sp.id, name: sp.name, x, top: Math.round(t), by: yb, w: Math.round(span * 0.2), h: Math.round(yb - t) }; });
}

// One granite tower close by, painted a column at a time with the wall's own rock (face): a rough rounded
// top breaking over into sheer sides, lit on the left, and snow and ice banked against its foot.
export function tower(b, n, bx, by, h, w, feet) {
  const top = by - h, hw = w / 2, sc = Math.min(1.6, Math.max(0.7, w / 60));
  const sky = x => { const s = Math.abs(x - bx) / hw; return top + h * (0.12 * s * s + 2.2 * Math.pow(Math.max(0, s - 0.75), 1.3)) + 3 * sc * (vnoise(x / 4, n * 3.1, 216) - 0.5) + ((x - bx) / hw) * h * (n & 1 ? 0.04 : -0.04); };
  for (let x = Math.max(0, Math.round(bx - w * 0.7)); x <= Math.min(b.w - 1, bx + w * 0.7); x++) {
    const t0 = Math.round(sky(x)), foot = Math.round(by + 3 * (vnoise(x / 7, n, 243) - 0.5) - sq((x - bx) / (w * 0.7)) * 6);
    if (t0 >= foot) continue;
    const p = clamp((x - bx) / hw, -1, 1);
    for (let y = Math.max(0, t0); y <= Math.min(b.h - 1, foot); y++) {
      const d = y - t0, low = foot - y < 4 + 7 * vnoise(x / 5, n, 244);
      // Two runnels of old snow and ice down its face, wavering and broken, one on each side of its middle.
      let run = false;
      for (const [rp, k] of [[-0.42, 0], [0.3, 1]]) { const o = x - bx - rp * hw - 4 * sc * Math.sin(y / (17 * sc) + k * 2 + n), w = (1 + 1.4 * sc) * (0.6 + 0.6 * vnoise(y / (9 * sc), k + n, 225)); if (Math.abs(o) < w && d > h * 0.12 && vnoise(x / 6, y / (14 * sc), 226 + k) > 0.3) run = o > w - 1 ? 'edge' : true; }
      b.set(x, y, low ? pick('glac', 0.84 - p * 0.15 + 0.2 * (vnoise(x / 4, y / 4, 224) - 0.5), x, y, 0.6) : run ? (run === 'edge' ? R.glac[2] : pick('snow', p < 0 ? 0.82 : 0.62, x, y, 0.5)) : face(x, y, p, d, foot - t0, n + 7, 0, sc));
    }
    if (feet) feet.push([x, foot]);
  }
  return top;
}

// How tall the Spires' wall stands in camp's picture on a screen VH high. The walk to camp grows its
// own towers to this height, so the two pictures agree.
export const wallTall = (VH, narrow) => { const Y0 = narrow ? Math.round(VH * 0.045) + 12 : 16, Y1 = narrow ? Math.round(VH * 0.47) : VH - 40; return Math.round((Y1 - Y0) * 0.58) - 22; };
function build(VW, VH, narrow) {
  const back = new BM(VW, VH), front = new BM(VW, VH);
  // The part of the screen the card and the bars leave clear.
  const X0 = narrow ? 4 : Math.round(VW * 0.345), X1 = VW - 4, Y0 = narrow ? Math.round(VH * 0.045) + 12 : 16, Y1 = narrow ? Math.round(VH * 0.47) : VH - 40;
  const bw = X1 - X0, bh = Y1 - Y0, yb = Y0 + Math.round(bh * 0.58), yh = yb - Math.round(bh * 0.08), H = wallTall(VH, narrow) + 10;

  // ---- the sky and the far ranges across the ice sheet --------------------------------------
  const sb = R.skyband;
  for (let y = 0; y < VH; y++) {
    const f = clamp(y / (yh + 12), 0, 1) * (sb.length - 1), b0 = Math.floor(f), e = f - b0;
    for (let x = 0; x < VW; x++) back.d[y * VW + x] = e < 0.72 || b0 >= sb.length - 1 ? sb[b0] : sb[b0 + (bayer(x, y) < (e - 0.72) / 0.28 ? 1 : 0)];
  }
  for (const [n, s, lift, tall, lit, shade, rock] of [[1, 52, 0.05, 0.17, R.farsnow[0], R.far[3], R.far[2]], [2, 33, 0.012, 0.12, R.farsnow[1], R.far[2], R.far[1]]]) {
    for (let x = 0; x < VW; x++) {
      const p = peaks(x, s, n), top = Math.round(yh - bh * (lift + tall * p) + 1.5 * (vnoise(x / 3, n, 241) - 0.5)), up = peaks(x + 1, s, n) > p;
      for (let y = top; y <= yh + 3; y++) {
        const d = y - top, bare = d > 3 && vnoise(x / 4 + n * 9, y / 6, 242) > (up ? 0.74 : 0.58);
        back.d[y * VW + x] = d === 0 && n === 2 ? R.far[0] : bare ? rock : up ? lit : (bayer(x, y) < 0.3 ? lit : shade);
      }
    }
  }

  // ---- the wall of the Spires, as on the map ----------------------------------------------------
  const tw = new BM(VW, VH), feet = [];
  // A little under the full height, so the highest summit's flag and name tag clear the buttons at the top.
  // The east end stops short of the picture's edge, so the last summit stands whole (round 5, T61).
  const geo = paintSpires(tw, X0 + bw * (narrow ? 0.1 : 0.02), X1 - bw * 0.1, yb, H - 10, feet);
  outline(tw, INK);
  // Two walls too big for the picture close it at the sides (a wide screen only: a phone has no room).
  const side = new BM(VW, VH), sides = [];
  if (!narrow) {
    // The east one stands far enough off the picture's edge to leave Kubernetes-Manifests clear (T61).
    sides.push({ x: Math.round(X0 * 0.2), by: Math.round(yb + bh * 0.3), h: Math.round(H * 2.5), w: Math.round(H * 1.5) }, { x: VW + Math.round(bw * 0.15), by: Math.round(yb + bh * 0.26), h: Math.round(H * 2.1), w: Math.round(H * 0.95) });
    sides.forEach((s, k) => tower(side, 7 + k, s.x, s.by, s.h, s.w, feet));
    outline(side, INK);
  }

  // ---- the glacier ----------------------------------------------------------------------------
  // Depth runs from the horizon to just past the camp, so the glacier is laid out the same on a tall screen as on a wide one.
  const Vx = X0 + bw * 0.5, Vy = yh - 8, Fx = geo[1].x, span = Y1 + 40 - yh, casts = geo.concat(sides);
  const shadowed = (x, y) => { for (const g of casts) { const ty = y - g.by, L = Math.min(g.h * 0.5, bh * 0.4); if (ty > -4 && ty < L && Math.abs(x - ty * 1.9 - g.x) < g.w * 0.5 * (1 - ty / L)) return true; } return false; };
  const pool = { x: Math.round(X0 + bw * 0.2), y: Y1 - 26, rx: Math.max(9, bw * 0.05), ry: 3 };
  // The upper glacier breaks off in a line of ice cliffs before it reaches the camp.
  const cliff = x => { const top = yh + span * (0.4 + 0.035 * Math.sin(x / 47) + 0.05 * (vnoise(x / 30, 2, 277) - 0.5)); return [top, vnoise(x / 34, 5, 278) > 0.34 ? 4 + 7 * vnoise(x / 13, 3, 279) : 0]; };
  for (let y = yh; y < VH; y++) for (let x = 0; x < VW; x++) {
    const d = (y - yh) / span, Z = 1 / (d + 0.1), a = (x - Vx) / (y - Vy + 6), an = (x - Vx) / (VW * 0.5), af = (x - Fx) / (VW * 0.5);
    let v = 0.76 - 0.06 * d + 0.34 * (fbm(x / (22 + 60 * d), y / (4 + 9 * d), 250, 3) - 0.5), c = 0;
    // Wind-cut snow in the foreground.
    if (d > 0.45) { const sn = vnoise(x / 13, y / 1.6, 280); v += sn > 0.7 ? 0.1 : sn < 0.22 ? -0.09 : 0; }
    const dark = shadowed(x, y); if (dark) v -= 0.24;
    // The icefall under the towers: a jumble of blocks, spilling widest in the middle.
    const fall = smooth(0.015, 0.06, d) * smooth(0.4, 0.26, d) * smooth(0.36 + d, 0.12 + d, Math.abs(af)) * (0.45 + 0.9 * vnoise(x / 24, y / 9, 256));
    if (fall > 0.4) {
      // Lumps of ice in three brightnesses, each with a lit top and a shadow underneath.
      const sc = 1 + d * 1.6, k = vnoise(x / (4.5 * sc), y / (2.4 * sc), 257), up = vnoise(x / (4.5 * sc), (y - 1.4) / (2.4 * sc), 257), dn = vnoise(x / (4.5 * sc), (y + 1.4) / (2.4 * sc), 257);
      v = 0.56 + 0.36 * Math.round(k * 3) / 3 - (dark ? 0.2 : 0);
      if (dn < k - 0.1) v -= 0.34; else if (up < k - 0.1) v += 0.16;
    }
    // Crevasses lie across the flow in broken arcs, wider apart and heavier the nearer they are.
    const turns = Z * 2.6 + 0.5 * an * an + 0.3 * vnoise(x / 40, y / 40, 251), ph = frac(turns), px = 2.6 / (sq(d + 0.1) * span), thick = (1 + 1.5 * d) * px;
    const open = d > 0.08 && fall <= 0.4 && vnoise(x / (36 + 50 * d), y / (10 + 22 * d), 252) > 0.44 && vnoise(x / (9 + 12 * d), Math.floor(turns) * 3.1, 253) > 0.3;
    if (open && ph < thick) c = R.glac[ph < thick * 0.6 && d > 0.3 ? 0 : 1];
    else if (open && ph < thick + px * 1.1) c = R.glac[5];
    // Two bands of dirty ice and rubble ride the glacier down from the walls.
    for (const [a0, wd] of [[-0.8, 0.075], [0.84, 0.06]]) { const off = Math.abs(a - a0 - 0.04 * Math.sin(y / 11) - 0.05 * (vnoise(y / 16, a0 * 7, 254) - 0.5)); if (!c && d > 0.05 && off < wd) { v -= 0.12 * (1 - off / wd); if (hash(x, y, 255) < 0.22 * (1 - off / wd) + 0.03) c = pick('rock', 0.2 + 0.6 * hash(x >> 1, y, 258), x, y); } }
    { const [ct, ch] = cliff(x); if (ch && y >= ct && y < ct + ch) { const k = (y - ct) / ch; c = y - ct < 1 ? R.glac[5] : k > 0.85 ? R.glac[0] : pick('glac', 0.14 + 0.42 * hash(Math.floor(x / 2), 3, 281) + 0.12 * k - (dark ? 0.1 : 0), x, y, 0.5); } else if (ch && y >= ct + ch && y < ct + ch + 3) v -= 0.2; }
    // A pool of meltwater.
    { const pd = sq((x - pool.x) / pool.rx) + sq((y - pool.y) / pool.ry) + 0.3 * (vnoise(x / 4, y / 2, 259) - 0.5); if (pd < 1) c = pd > 0.72 ? R.glac[1] : R.tarn[pd < 0.3 ? 3 : 2]; else if (pd < 1.4 && y > pool.y) c = R.glac[5]; }
    front.d[y * VW + x] = c || (d < 0.04 ? pick('snow', 0.7 + 0.4 * (v - 0.7), x, y, 0.5) : pick('glac', v, x, y, 0.6));
  }
  // The walls go on over the ice, and the snow banked against their feet hides the hard line there.
  for (let i = 0; i < tw.d.length; i++) if (tw.d[i]) front.d[i] = tw.d[i];
  for (let i = 0; i < side.d.length; i++) if (side.d[i]) front.d[i] = side.d[i];
  for (const [x, foot] of feet) {
    if (foot + 4 >= VH || front.d[(foot + 4) * VW + x] === INK || tw.d[(foot + 4) * VW + x] || side.d[(foot + 4) * VW + x]) continue;
    const dp = 2 + Math.round(2 * vnoise(x / 6, 9, 245));
    for (let k = -1; k <= dp; k++) front.set(x, foot + k, k === dp && hash(x >> 2, 5, 246) < 0.5 ? R.glac[1] : shadowed(x, foot + k + 3) ? R.glac[3] : R.snow[4]);
  }

  // ---- the moraine the camp stands on ----------------------------------------------------------
  const camp = [Math.round(X0 + bw * (narrow ? 0.52 : 0.52)), Y1 - (narrow ? 13 : 14)], rx = Math.min(92, bw * 0.3), ry = 8;
  for (let y = camp[1] - ry - 3; y <= camp[1] + ry + 4; y++) for (let x = Math.round(camp[0] - rx - 4); x <= camp[0] + rx + 4; x++) {
    const nx = (x - camp[0]) / rx, ny = (y - camp[1]) / ry, e = nx * nx + ny * ny + 0.35 * (vnoise(x / 5, y / 3, 270) - 0.5);
    if (e < 1) front.set(x, y, vnoise(x / 7, y / 3, 271) > 0.64 ? R.snow[ny < 0 ? 4 : 3] : pick('rock', 0.55 - ny * 0.22 + 0.4 * (hash(x >> 1, y >> 1, 272) - 0.5), x, y));
    else if (e < 1.3 && ny > 0.2) front.set(x, y, R.glac[e < 1.14 ? 1 : 2]);
  }
  const r0 = rng(77);
  for (let k = 0; k < (narrow ? 6 : 9); k++) { const b = makeBoulder(520 + k, 2.4 + r0() * 3.4), x = Math.round(camp[0] + (r0() - 0.5) * rx * 1.9), y = Math.round(camp[1] + (r0() - 0.5) * ry * 1.5 + 3); for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) { const c = b.d[j * b.w + i]; if (c) front.set(x - b.ox + i, y - b.oy + j, c); } }
  // A knoll of rock breaks the ice half way to the towers. The goats keep to it, well away from the tent.
  const knoll = [Math.round(X0 + bw * 0.3), Math.round(yh + span * 0.47)], kx = Math.max(19, Math.round(bw * 0.075));
  for (let x = knoll[0] - kx - 3; x <= knoll[0] + kx + 3; x++) {
    const u = (x - knoll[0]) / kx, top = knoll[1] - Math.round(9 * Math.max(0, 1 - u * u) * (0.55 + 0.45 * vnoise(x / 4, 3, 290)) + (Math.abs(u) < 1 ? 2 : 0)), foot = knoll[1] + Math.round(2 * (1 - u * u) + vnoise(x / 3, 4, 291));
    if (Math.abs(u) >= 1) continue;
    for (let y = top; y <= foot; y++) front.set(x, y, y === top ? (vnoise(x / 5, 5, 292) > 0.45 ? R.snow[4] : R.granite[5]) : y - top < 2 && vnoise(x / 5, 5, 292) > 0.45 ? R.snow[3] : pick('granite', 0.62 - (y - top) * 0.045 - u * 0.16 + 0.2 * (hash(x >> 1, y >> 1, 293) - 0.5), x, y, 0.7));
    front.set(x, foot + 1, R.glac[1]); if (u > -0.6) front.set(x + 3, foot + 2, R.glac[2]);
  }
  return { back, front, geo, camp, rx, yh, knoll };
}

export function makeCamp() {
  let pic = null, key = '';
  const run = makeRunner('alpine');
  // He sits down beside her on the moraine: first half way, then knees up with his hands on them.
  const sitting = [sideFig('alpine', { crouch: 3, lean: 1 }), sideFig('alpine', { feet: [[6, 3], [5, 4]], crouch: 5, lean: 0, hands: [[3, 3], [2, 3]] })];
  const heart = new BM(9, 8);
  ['.XX.XX.', 'XoXXXXX', 'XXXXXXx', '.XXXXx.', '..XXx..', '...x...'].forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') heart.set(x + 1, y + 1, ch === 'o' ? R.red[2] : ch === 'x' ? R.red[0] : R.red[1]); }));
  outline(heart, INK);
  const tent = dome('tent'), pot = stove(), flags = [makeFlag(0), makeFlag(1)];
  // At Dusk the tent glows from inside, as the map's does (round 8, E1): the fabric warm, brightest low down
  // and at the door.
  const tentLit = dome('tent'); for (let j = 0; j < tentLit.h; j++) for (let i = 0; i < tentLit.w; i++) { const k = j * tentLit.w + i, v = tentLit.d[k]; if (v && v !== INK) tentLit.d[k] = v === R.navy[0] || (j > tentLit.h * 0.55 && bayer(i, j) < (j / tentLit.h - 0.4) * 1.6) ? R.lamp[1] : R.lamp[0]; }
  const goats = { stand: farGoat('stand'), look: farGoat('look'), graze: farGoat('graze'), kid: farGoat('stand', true) }, bird = [speck(0), speck(1)];
  const clouds = [0, 1, 2, 3].map(i => ({ bm: makeCloud(630 + i), x: i * 170, y: 0.1 + (i % 3) * 0.22 + i * 0.04, v: 3 + i * 1.6 }));
  const focus = { x: 0, y: 0 };
  // Kayti sits toward the east end of the moraine and paints the towers. waved: when she was last clicked.
  // sat: when he sat down beside her, which is when the heart goes up.
  const kayti = makeKayti(); let waved = -9, goatsGo = -9, now = 0, flown = {}, sat = null;
  const seat = () => [pic.camp[0] + Math.round(pic.rx * 0.56), pic.camp[1]];

  function fit(scr) { const k = scr.VW + 'x' + scr.VH; if (k !== key) { key = k; pic = build(scr.VW, scr.VH, scr.narrow); } }

  return {
    name: 'camp',
    dur: () => 1.4,
    stops: () => [{ id: 'base-camp', at: 1 }],
    elev: () => 0,
    enter(scr) { fit(scr); sat = null; },
    focus: () => focus,
    // Where each tower's name goes, for the page to label them.
    // A tower he has climbed carries a flag, and its name sits above the flag.
    labels() { return pic ? pic.geo.map(g => ({ id: g.id, name: g.name, x: g.x, y: Math.max(13, g.top - (flown['spire:' + g.id] ? 16 : 4)) })) : []; },
    pick(x, y) {
      if (!pic) return null;
      { const [kx, ky] = seat(); if (Math.abs(x - kx) < 9 && y > ky - 25 && y < ky + 3) return { label: NAMES.kayti, x: kx, y: ky - 27, act: 'kayti' }; }
      // The goats on their knoll, in front of the towers behind them.
      { const [gx, gy] = pic.knoll; if (Math.abs(x - gx) < 20 && y > gy - 18 && y < gy + 1) return { label: NAMES.camp.goats, x: gx, y: gy - 20, act: 'goats' }; }
      for (const g of [...pic.geo].sort((a, c) => c.by - a.by)) if (y > g.top - 3 && y < g.by && Math.abs(x - g.x) < 4 + (y - g.top) / g.h * g.w * 0.55) return { label: g.name, named: true, x: g.x, y: g.top - 6, act: 'spire:' + g.id };
      return null;
    },
    // A click on her and she looks up from the page and waves.
    // A click on the goats (round 6, note 10): all three bound up on the spot twice, the kid bleating, and the
    // two grown ones turn to look.
    act(id, env) { if (id === 'goats') { if (now - goatsGo > 1.6) { goatsGo = now; if (env) env.sfx('bleat'); } return true; } if (id !== 'kayti') return false; waved = now; return true; },
    draw(scr, env, arg, q) {
      fit(scr); now = env.t; flown = env.done;
      const { VW, fb } = scr, { t } = env, { geo, camp, rx, yh } = pic;
      fb.set(pic.back.d);
      // Cloud drifts behind the towers, and birds cross high up.
      for (const c of clouds) scr.blit(c.bm, ((c.x + t * c.v) % (VW + 140)) - 70, c.y * yh * 0.8);
      for (let k = 0; k < 3; k++) { const bx = ((t * 14 + k * 17) % (VW + 120)) - 60; scr.put(bird[(Math.floor(t * 4) + k) & 1], bx + [0, 9, -7][k], yh * 0.3 + [0, 5, 9][k], false); }
      scr.blit(pic.front, 0, 0);
      // The world's weather over the Spires (round 8, E1): the volcano's squall greys the towers and the ice
      // and sends its snow across camp, the shadow of one of the map's clouds crosses the ice, and each of
      // the map's gusts takes more snow off the tops, bends the stove's smoke and snaps the flags.
      const sky = env.sky, gu = sky ? sky.gust('spires') : null, ge = gu ? Math.sin(Math.PI * gu[0] / 3) * gu[2] : 0, snowK = sky ? sky.snow : 0, blow = Math.max(0.8 * ge, sky ? sky.banner : 0);
      veil(scr, 0.5 * snowK, 0, scr.VH, true);
      { const cs = sky ? sky.shade('spires') : null; if (cs !== null) shadow(scr, cs, yh + 6, scr.VH); }
      // The wind takes snow off the three highest tops.
      const hi = Math.max(...geo.map(g => g.h));
      spindrift(scr, t, blow, geo.filter(g => g.h > hi * 0.78).map(g => [g.x + 2, g.top + 1]), 46, 1);
      for (const g of geo) if (g.h > hi * 0.78) for (let k = 0; k < 14; k++) {
        const age = frac(t * 0.42 + k / 14 + g.x * 0.01), x = Math.round(g.x + 2 + age * (20 + (k % 4) * 5)), y = Math.round(g.top + 1 - Math.sin(age * 2.6) * 3 + (k % 3) - age * 2);
        if (age < 0.55 || bayer(x, y) > (age - 0.55) / 0.45) scr.set(x, y, age < 0.3 ? R.snow[4] : R.snow[3]);
      }
      // The tent, the stove and its smoke, flags on the tops he has stood on.
      const [cx, cy] = camp;
      scr.put(env.mix > 0.5 ? tentLit : tent, cx - 12, cy, false); scr.put(pot, cx + 9, cy + 3, false);
      for (let k = 0; k < 5; k++) { const age = frac(t * 0.35 + k / 5); scr.set(Math.round(cx + 9 + age * (9 + 16 * ge) + Math.sin(age * 6 + k)), Math.round(cy - 4 - age * (24 - 8 * ge)), age < 0.5 ? R.white[1] : R.white[0]); }
      for (const g of geo) if (env.done['spire:' + g.id]) scr.blit(flags[Math.floor(t * (5 + 7 * ge)) & 1], g.x - 2, g.top - 14);
      // The goats on their knoll out on the ice: the nanny looks about, the billy grazes at the lichen, and
      // every few seconds the kid bounces twice on the spot.
      { const [gx, gy] = pic.knoll, g = t - goatsGo, up = g < 1.6 ? Math.round(4 * Math.abs(Math.sin(g * Math.PI / 0.8))) : 0;
        scr.put(g < 1.6 || frac(t / 5) >= 0.6 ? goats.look : goats.stand, gx - 9, gy - 7 - up, g < 1.6 ? false : true); scr.put(g < 1.6 ? goats.look : frac(t / 7.3) < 0.7 ? goats.graze : goats.stand, gx + 9, gy - 5 - up, g < 1.6); const u = frac(t / 5.9) / 0.14, hop = g < 1.6 ? up + 1 : u < 1 ? Math.round(2 * Math.abs(Math.sin(u * 2 * Math.PI))) : 0; scr.put(goats.kid, gx, gy - 2 - hop, frac(t / 3.3) < 0.5); }

      { const [kx, ky] = seat(); kayti.draw(scr, kx, ky, t, t - waved < 1.6); }

      // He walks in along the island from the west, the way the trail brought him, past the tent and past
      // her, and sits down at her side, out of her view of the towers.
      const [kx, ky] = seat(), WALK = Math.round(rx * 0.56) + 45, sx = kx + 23;
      const mx = sx - Math.round((1 - q) * WALK), my = ky + 1 + Math.round(5 * smooth(1, 0.86, q));
      if (q < 1) sat = null; else if (sat == null) sat = t;
      const u = sat == null ? -1 : t - sat;
      scr.shadow(mx, my, 5, 1);
      if (q < 1) scr.put(env.moving ? run.side[Math.floor(q * WALK / 4.2) % 6] : run.sideIdle[0], mx, my, false);
      else scr.put(sitting[u < 0.16 ? 0 : 1], mx, my + (u < 0.16 ? 0 : 2), true);
      // A heart goes up between the two of them, once, and thins out as it rises.
      if (u > 0.5 && u < 3.2) {
        const k = (u - 0.5) / 2.7, hx = Math.round((kx + sx) / 2 + Math.sin(k * 7) * 1.6) - 4, hy = ky - 26 - Math.round(k * 22);
        for (let j = 0; j < heart.h; j++) for (let i = 0; i < heart.w; i++) { const c = heart.d[j * heart.w + i]; if (c && (k < 0.7 || bayer(hx + i, hy + j) > (k - 0.7) / 0.3)) scr.set(hx + i, hy + j, c); }
      }
      flurry(scr, t, snowK, 1);
      focus.x = mx; focus.y = my - 14;
    }
  };
}
