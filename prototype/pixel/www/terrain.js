// The ground of the world map and everything rooted in it: every biome, the lake, the river, the
// coast, the layers of peaks along the north, and each tree, rock and bush. The world scene draws
// from it and so does the plan page, so the two cannot drift apart.
import { TAU, clamp, lerp, smooth, frac, sq, rng, hash, vnoise, fbm, bayer, R, RAMP_OF, KIND, pick, BM, outline, thick, catmull, INK } from './core.js';
import { clump, makeMaple, makeSpruce, makeFir, makeConifer, makeBoulder, makeLog, makeSnag, makeBush, makeFern } from './sprites.js';
import { ell } from './fauna.js';

// The map as it was until round 2 sits inside this one, moved right and down by OX, OY.
const OX = 260, OY = 160, NW = 1560, NH = 1080;
const T = { x: 820, y: 630 }, PEAK = { x: 645, y: 514 }, STACK = { x: 805, y: 544 }, SPIRES = { x: 975, y: 522 };
const GL = { x0: 976, y0: 510, x1: 958, y1: 584 };
export function buildTerrain(peak) {
const g = new Uint8Array(NW * NH);
const SEA = { y0: 630, w: 680, h: NH - 630 }; for (const k of ['ph', 'gate', 'shore']) SEA[k] = new Uint8Array(SEA.w * SEA.h);
const at = (x, y) => y * NW + x;

// ---- shapes -------------------------------------------------------------------------------
const LAKE = [[640, 535, 44, 15], [598, 541, 27, 10], [683, 530, 25, 9], [656, 547, 23, 8], [612, 528, 20, 7]];
const lakeD = (x, y) => { let d = 9; for (const [cx, cy, rx, ry] of LAKE) d = Math.min(d, Math.hypot((x - cx) / rx, (y - cy) / ry)); return d + 0.16 * (vnoise(x / 9, y / 5, 4) - 0.5) + 0.3 * Math.exp(-(sq((x - 662) / 9) + sq((y - 523) / 5))); };
const ISLE = { x: 626, y: 537 };
const isleD = (x, y) => Math.hypot((x - ISLE.x) / 7, (y - ISLE.y) / 3.2);
const TARNS = [[1150, 540, 20, 7], [1232, 578, 15, 5], [1318, 528, 25, 8], [1412, 566, 16, 6], [1262, 520, 9, 3]];
const tarnD = (x, y) => { let d = 9; for (const [cx, cy, rx, ry] of TARNS) d = Math.min(d, Math.hypot((x - cx) / rx, (y - cy) / ry)); return d + 0.2 * (vnoise(x / 6, y / 4, 44) - 0.5); };
const coast = (x, y) => (y - 700) - x * 0.68 + 30 * Math.sin(x / 95) + 44 * (fbm(x / 80, y / 80, 80, 3) - 0.5);
const groundLine = x => 462 + 8 * (fbm(x / 9, 3.3, 14, 2) - 0.5);
const forestEdge = y => 740 + 36 * (fbm(y / 50, 2.3, 3, 3) - 0.5) - smooth(700, 800, y) * 60;
const forestSouth = x => lerp(1200, 792 + 40 * (fbm(x / 70, 5, 6, 3) - 0.5), smooth(360, 640, x));
const forestAmt = (x, y) => smooth(forestEdge(y) + 12, forestEdge(y) - 12, x) * smooth(forestSouth(x) + 14, forestSouth(x) - 14, y) * smooth(1.15, 1.6, lakeD(x, y)) * smooth(-6, -26, coast(x, y));
// How much of each biome a spot has. The edges are wide and wander, so one biome thins into the next.
const basinAmt = (x, y) => smooth(1020, 1210, x + 60 * (fbm(y / 60, 1, 7, 3) - 0.5)) * smooth(700, 580, y + 60 * (fbm(x / 70, 2, 8, 3) - 0.5));
const dryAmt = (x, y) => smooth(1120, 1400, x + 110 * (fbm(y / 90, 3, 9, 3) - 0.5)) * smooth(560, 700, y + 60 * (fbm(x / 70, 2, 8, 3) - 0.5));
const sageAmt = (x, y) => smooth(1330, 1490, x + 60 * (fbm(y / 60, 4, 10, 3) - 0.5));
const burnAmt = (x, y) => smooth(1000, 1300, x + 120 * (fbm(y / 90, 5, 11, 3) - 0.5)) * smooth(780, 950, y + 80 * (fbm(x / 90, 6, 12, 3) - 0.5));
const MESAS = [[1496, 700, 52, 17], [1462, 772, 40, 14], [1526, 836, 44, 15], [1420, 708, 16, 7]];
const mesa = (x, y) => MESAS.some(([cx, cy, rx, ry]) => Math.hypot((x - cx) / rx, (y - cy) / ry) < 1 + 0.25 * (vnoise(x / 9, y / 7, 141) - 0.5));
const couleeAmt = (x, y) => mesa(x, y) || mesa(x, y - 15) || mesa(x, y - 22) ? 1 : 0;
const talus = (x, y) => (y > 528 && y < 580) ? smooth(118, 64, Math.abs(x - STACK.x) + (y - 536) * 2.4) : 0;
const moraine = (x, y) => (y > 510 && y < 540 && Math.abs(x - SPIRES.x) < 100) ? smooth(538, 520, y + 5 * vnoise(x / 6, 1, 15)) * smooth(100, 84, Math.abs(x - SPIRES.x)) * 0.8 : 0;
// The glacier out of the Spires, and two more that come down between the low peaks behind them.
const TONGUES = [{ ...GL, w0: 64, w1: 11 }, { x0: 891, y0: 450, x1: 888, y1: 524, w0: 4, mid: [0.4, 11], w1: 6 }, { x0: 1060, y0: 386, x1: 1096, y1: 514, w0: 5, mid: [0.55, 22], w1: 8 }];
function glacier(x, y, from = 0) {
  let best = null;
  for (let i = from; i < TONGUES.length; i++) {
    const q = TONGUES[i], dx = q.x1 - q.x0, dy = q.y1 - q.y0, t = clamp(((x - q.x0) * dx + (y - q.y0) * dy) / (dx * dx + dy * dy), 0, 1), px = q.x0 + dx * t + (i ? 5 * Math.sin(t * 5.5 + i * 2) * Math.sin(t * Math.PI) : 0), py = q.y0 + dy * t;
    const wd = q.mid ? (t < q.mid[0] ? lerp(q.w0, q.mid[1], t / q.mid[0]) : lerp(q.mid[1], q.w1, (t - q.mid[0]) / (1 - q.mid[0]))) : lerp(q.w0, q.w1, Math.pow(t, 0.8));
    const o = { t, d: Math.hypot(x - px, y - py), w: wd + (i ? 2.5 : 5) * (vnoise(x / 8, y / 8, 9 + i) - 0.5), side: x - px, i };
    if (!best || o.d - o.w < best.d - best.w) best = o;
  }
  return best;
}
function iceAt(gl, x, y) {
  const cre = frac(gl.t * 7 - sq(gl.side / gl.w) * 0.35 + 0.35 * vnoise(x / 6, y / 6, 2));
  if (cre < 0.07 && gl.d < gl.w - 3 && vnoise(x / 5, y / 3, 3) > 0.35) return cre < 0.04 ? R.glac[0] : R.glac[2];
  return gl.t > 0.8 && hash(x >> 1, y >> 1, 9) < (gl.t - 0.8) * 2 ? R.rock[1] : pick('glac', 0.8 - 0.3 * gl.side / gl.w + 0.18 * (vnoise(x / 4, y / 4, 8) - 0.5) - gl.t * 0.15, x, y, 0.6);
}

// ---- trails and the river ---------------------------------------------------------------------
const TRAILS = {
  lake: [[820, 630], [790, 636], [755, 642], [722, 652], [694, 660], [660, 676], [622, 694], [580, 700], [540, 688], [505, 668], [470, 676], [440, 700], [405, 706], [372, 688], [352, 655], [325, 632], [300, 600], [296, 565], [318, 540], [350, 548], [378, 574], [410, 580], [436, 560], [450, 530], [480, 512], [516, 520], [540, 546], [572, 566], [610, 568], [650, 564], [690, 552], [716, 541], [730, 556], [748, 585], [772, 606], [798, 622], [820, 630]],
  stack: [[820, 630], [818, 612], [813, 590], [809, 570], [806, 553]],
  spires: [[820, 630], [846, 623], [880, 612], [910, 600], [928, 586], [936, 572]],
  // Past the tents the trail is a boot track in the snow, winding up the glacier until it fades.
  track: [[936, 572], [947, 562], [958, 553], [953, 541], [962, 531], [972, 524], [966, 514], [975, 505], [982, 497]]
};
const RIVER = [[630, 556], [640, 590], [668, 625], [694, 660], [712, 700], [708, 750], [682, 800], [634, 842], [588, 880], [524, 906], [458, 932], [404, 978], [372, 1010]];
const INLET = [[742, 514], [728, 522], [712, 527], [702, 530]];
const trail = new Uint8Array(NW * NH), tkind = new Uint8Array(NW * NH), river = new Uint8Array(NW * NH);
const trailPts = [];
function stamp(mask, pts, r0, r1, kindOf) {
  const all = catmull(pts);
  all.forEach(([px, py], n) => {
    const f = n / (all.length - 1), rr = lerp(r0, r1, f), R2 = Math.ceil(rr + 1);
    for (let dy = -R2; dy <= R2; dy++) for (let dx = -R2; dx <= R2; dx++) {
      const d = Math.hypot(dx, dy), x = Math.round(px + dx), y = Math.round(py + dy), v = d <= rr ? 2 : d <= rr + 1 ? 1 : 0;
      if (v && x >= 0 && y >= 0 && x < NW && y < NH && mask[at(x, y)] < v) { mask[at(x, y)] = v; if (kindOf) tkind[at(x, y)] = kindOf(f); }
    }
  });
  return all;
}
trailPts.push(...stamp(trail, TRAILS.lake, 1.9, 1.9, () => 0));
trailPts.push(...stamp(trail, TRAILS.stack, 1.9, 1.9, f => f > 0.55 ? 1 : 0));
trailPts.push(...stamp(trail, TRAILS.spires, 1.9, 1.9, f => f > 0.8 ? 1 : 0));
const trackPts = catmull(TRAILS.track);
stamp(river, RIVER, 2.2, 6, null); stamp(river, INLET, 1.2, 1.6, null);
const nearTrail = (x, y, r) => { for (let i = 0; i < trailPts.length; i += 3) { const p = trailPts[i]; if (Math.abs(p[0] - x) < r && Math.abs(p[1] - y) < r) return true; } return false; };

// ---- the north: layer on layer of peaks -------------------------------------------------------
// Each layer is a row of drawn peaks, the farthest first and palest. The ranges stand tall in the
// west, sink to low ridges behind the three destinations so those keep the sky behind them, rise
// again as granite needles over the larch basin, and flatten into dry hills in the far east.
// envS is the taller group that stands right behind the Spires, the source of their glaciers.
const envS = x => smooth(930, 1010, x) * smooth(1160, 1085, x) * 0.52, pk = new Uint8Array(NW * NH);
const envW = x => smooth(660, 230, x), envNE = x => smooth(1090, 1230, x) * smooth(1500, 1380, x), envDry = x => smooth(1340, 1520, x);
const skyAt = (x, y) => { const sb = R.skyband, f = clamp(y / 400, 0, 1) * (sb.length - 1), b0 = Math.floor(f), e = f - b0; return sb[Math.min(sb.length - 1, b0 + (e > 0.72 && bayer(x, y) < (e - 0.72) / 0.28 ? 1 : 0))]; };
// Shaded, plain and lit snow and rock for each layer, nearest first; every layer back is paler and bluer.
const LP = [
  { snow: [R.snow[1], R.snow[3], R.snow[4]], rock: [R.rock[0], R.rock[1], R.rock[3]], crest: INK },
  { snow: [R.snow[2], R.snow[3], R.snow[4]], rock: [R.rock[1], R.rock[2], R.rock[3]], crest: R.rock[0] },
  { snow: [R.snow[2], R.snow[3], R.snow[3]], rock: [R.far[0], R.far[1], R.far[2]], crest: R.far[0] },
  { snow: [R.far[3], R.farsnow[0], R.farsnow[1]], rock: [R.far[1], R.far[2], R.far[3]], crest: R.far[1] },
  { snow: [R.far[3], R.farsnow[0], R.farsnow[0]], rock: [R.far[2], R.far[3], R.far[3]], crest: R.far[2] }
];
const GRAN = [[R.granite[1], R.granite[3], R.granite[5]], [R.granite[2], R.granite[3], R.granite[4]], [R.granite[3], R.granite[4], R.granite[5]], [R.far[2], R.far[3], R.farsnow[0]], [R.far[3], R.far[3], R.farsnow[0]]];
const rdg = n => 1 - Math.abs(2 * n - 1);
function paintPeak({ cx, base, h, w, L, seed, kind, fill, pal }) {
  const A = h < 30 && kind === 'peak' ? Math.min(L, 2) : pal == null ? L : pal, r = rng(seed), P = LP[A], x0 = Math.floor(cx - w / 2), x1 = Math.ceil(cx + w / 2), needle = kind === 'needle', hill = kind === 'hill';
  const sx = cx + (r() - 0.5) * w * 0.24, ty = base - h;
  // A second, lower summit on one shoulder, and a flank that is hollow (a horn) or full (a dome).
  const sh = { x: sx + (r() < 0.5 ? -1 : 1) * w * (0.17 + 0.12 * r()), d: h * (0.1 + 0.2 * r()), s: w * 0.07 }, curve = needle ? 0.55 + 0.15 * r() : 0.74 + 0.4 * r();
  // Below its base a peak is only filler behind the row in front. Its flanks carry on down at the slope
  // they reach the base with, so where the filler does show it is the foot of a mountain and not a box.
  const top = x => {
    const half = x < sx ? sx - x0 : x1 - sx, u0 = Math.abs(x - sx) / Math.max(1, half), u = Math.min(1, u0);
    if (u0 > 1) return base + (u0 - 1) * h * (hill ? 1.3 : curve);
    if (hill) return ty + h * (0.5 - 0.5 * Math.cos(Math.PI * u)) + 1.5 * (vnoise(x / 9, seed, 700) - 0.5);
    return ty + h * Math.pow(u, curve) - sh.d * Math.exp(-sq((x - sh.x) / sh.s)) * (1 - u * 0.3) + (L < 2 ? 3 : 1.5) * (vnoise(x / 4, seed, 700) - 0.5) - (needle ? h * 0.16 * sq(rdg(vnoise(x / 6, seed, 704))) * u : 0);
  };
  const rocks = needle ? GRAN[A] : P.rock;
  const foot = half => Math.min(half * 1.5, Math.ceil(fill * half / Math.max(1, h * (hill ? 1.3 : curve))));
  for (let x = Math.max(0, Math.floor(x0 - foot(sx - x0))); x <= Math.min(NW - 1, Math.ceil(x1 + foot(x1 - sx))); x++) {
    const t0 = Math.round(top(x)), yEnd = Math.min(NH - 1, Math.round(base + fill));
    for (let y = Math.max(0, t0); y <= yEnd; y++) {
      const d = y - t0, yr = y - ty;
      // Ridges fan out from the summit; each facet is lit on one side and shaded on the other.
      const fr = frac((x - sx) / Math.max(3, yr) * 2.4 + 0.3 * vnoise(x / 7, y / 7, seed + 1)), left = x < sx + (fr - 0.5) * 3;
      const v = 0.5 + (left ? 0.2 : -0.18) + (fr < 0.5 ? 0.14 : -0.14) + 0.12 * (vnoise(x / 4, y / 5, seed + 2) - 0.5), s = v > 0.6 ? 2 : v > 0.38 ? 1 : 0;
      let c;
      if (hill) c = A >= 3 ? (bayer(x, y) < 0.3 + 0.5 * d / (h + 8) ? R.far[3] : R.dry[3]) : d === 0 ? R.dry[3] : hash(x >> 1, y >> 1, seed) < 0.05 ? R.sage[1] : pick(A ? 'ochre' : 'dry', 0.9 - 0.75 * d / (h + 10) + 0.15 * (vnoise(x / 8, y / 4, seed) - 0.5), x, y);
      // The foot: larch wood under the needles, conifers under the near peaks, hazy bands further off.
      else if (y > base + 1) c = A <= 1 ? (needle ? pick('larch', 0.08 + 0.5 * vnoise(x / 2.5, y / 2, 706) - smooth(base, base + 14, y) * 0.12, x, y) : pick(A ? 'hill' : 'conifer', 0.2 + 0.5 * hash(x, y, 703), x, y)) : vnoise(x / 16, y / 2.2, seed + 9) > 0.56 ? P.rock[1] : P.rock[0];
      else if (d === 0) c = P.crest;
      else {
        const snowLine = needle ? h * 0.14 : (h * ((A <= 1 ? 0.36 : 0.5) + 0.22 * vnoise(x / 12, seed, 701)) + (fr < 0.5 ? 5 : -4) + A * h * 0.07) * smooth(18, 58, h);
        const gully = fr > 0.6 && fr < 0.76 && yr < h * (needle ? 0.5 : 0.86);
        // On the big near peaks a glacier hangs in one of the cirques and spills toward the valley.
        const ice = !needle && A <= 1 && h > 56 && Math.abs(fr - 0.3) < 0.1 && yr > h * 0.3;
        if (ice) c = frac(yr / 7 + 0.4 * vnoise(x / 9, y / 9, seed + 3)) < 0.12 ? R.glac[2] : pick('glac', 0.55 + v * 0.5, x, y, 0.6);
        else c = yr < snowLine || gully ? P.snow[s] : rocks[s];
        // Trees climb the foot of the nearer peaks: conifers in the west, larch under the needles.
        if (A <= 1 && y > base - (6 + 8 * vnoise(x / 5, seed, 702)) && !ice) c = needle ? pick('larch', 0.3 + 0.6 * hash(x >> 1, y, 705), x, y) : pick(A ? 'hill' : 'conifer', 0.25 + 0.5 * hash(x, y, 703), x, y);
      }
      g[at(x, y)] = c; pk[at(x, y)] = 1;
    }
  }
}
// One white volcano stands alone on the horizon, right of centre, with the low ridges at its feet.
const VOLC = { x: 1088, top: 244, h: 176, half: 218 };
function paintVolcano() {
  const { x: vx, top: ty, h, half } = VOLC;
  for (let x = Math.max(0, vx - half); x <= Math.min(NW - 1, vx + half); x++) {
    const dx = Math.abs(x - vx), u = dx / half;
    let t0 = ty + 3 + h * Math.pow(Math.max(0, dx - 10) / (half - 10), 0.7) + 2 * (vnoise(x / 9, 2, 560) - 0.5) * Math.min(1, dx / 30);
    if (dx < 6) t0 = ty + 5;
    t0 = Math.round(t0);
    for (let y = t0; y < ty + h + 6 && y < NH; y++) {
      const yr = y - ty, fr = frac((x - vx) / Math.max(5, yr) * 3 + 0.25 * vnoise(x / 11, y / 11, 561)), left = x < vx + (fr - 0.5) * 8;
      const rib = fr > 0.4 && fr < 0.5 && yr > 26 && vnoise(x / 7, y / 10, 562) > 0.42;
      g[at(x, y)] = y === t0 ? R.far[2] : rib ? R.far[2] : left ? (fr < 0.5 ? R.farsnow[1] : R.farsnow[0]) : (fr < 0.5 ? R.farsnow[0] : R.far[3]);
    }
  }
}
function paintNorth() {
  for (let y = 0; y < 480; y++) for (let x = 0; x < NW; x++) if (y < groundLine(x)) g[at(x, y)] = skyAt(x, y);
  paintVolcano();
  const r = rng(77);
  for (let L = 4; L >= 0; L--) {
    const row = [];
    for (let cx = -50; cx < NW + 70;) {
      const eW = envW(cx) + envS(cx), eN = envNE(cx), kind = r() < envDry(cx) ? 'hill' : r() < eN * 1.15 - envS(cx) * 2 ? 'needle' : 'peak', step = 6.5 + 33 * eW + 16 * eN;
      let h = (22 + 90 * eW + 44 * eN) * (1 - L * 0.11) * (0.72 + 0.5 * r()), w;
      if (kind === 'needle') { h *= 1.3; w = h * (0.75 + 0.35 * r()); } else if (kind === 'hill') { h = (13 + 11 * r()) * (1 - L * 0.1); w = h * (4 + 2 * r()); } else w = Math.max(44, h * (1.5 + 0.7 * r()));
      row.push({ cx, base: groundLine(clamp(Math.round(cx), 0, NW - 1)) + 2 - L * step, h, w, L, seed: 1000 + L * 100 + row.length, kind, fill: L ? step + 12 : 3, pal: envS(cx) > 0.15 ? Math.min(4, L + 2) : undefined });
      cx += w * (0.4 + 0.3 * r());
    }
    // The glaciers come down between the peaks of the second row, so the front row stands across them.
    if (L === 0) for (let y = 380; y < 480; y++) for (let x = 840; x < 1140; x++) { if (y >= groundLine(x) || !pk[at(x, y)]) continue; const gl = glacier(x, y, 1); if (gl.t < 0.14 && bayer(x, y) >= gl.t / 0.14) continue; if (gl.d < gl.w) g[at(x, y)] = iceAt(gl, x, y); else if (gl.d < gl.w + 2 && gl.t > 0.14) g[at(x, y)] = R.rock[1]; }
    for (const p of row.sort((a, b) => a.h - b.h)) paintPeak(p);
  }
}

// ---- the ground -------------------------------------------------------------------------------
function ground(x, y) {
  if (y < groundLine(x)) return skyAt(x, y);
  const i = at(x, y), n1 = hash(x, y, 31) - 0.5;
  const cs = coast(x, y);
  if (cs > 0) {
    // The water that moves is kept apart from the ground, for the scene to draw each frame: where a
    // swell can show and how far along its 24 pixel wavelength this spot is, and how close the shore is.
    if (x < SEA.w && y >= SEA.y0) {
      const j = (y - SEA.y0) * SEA.w + x;
      if (cs < 8) SEA.shore[j] = 1 + Math.round((cs + 4) * 8);
      else if (vnoise(x / 22, y / 9, 85) > (cs < 60 ? 0.4 : 0.54)) { SEA.gate[j] = cs < 40 ? 2 : 1; SEA.ph[j] = Math.floor(frac((cs + 7 * Math.sin(x / 37 + y / 61)) / 24) * 240); }
    }
    return pick('sea', 0.75 - smooth(0, 150, cs) * 0.6 + 0.12 * (vnoise(x / 14, y / 3, 86) - 0.5), x, y);
  }
  if (cs > -4 && x < SEA.w && y >= SEA.y0) SEA.shore[(y - SEA.y0) * SEA.w + x] = 1 + Math.round((cs + 4) * 8);
  if (cs > -15 - 6 * vnoise(x / 20, y / 20, 87)) return R.sand[cs > -4 ? 0 : hash(x, y, 88) < 0.25 ? 1 : 2];
  if (isleD(x, y) < 1) return pick('grass', 0.55 + 0.3 * n1, x, y);
  const ld = lakeD(x, y);
  if (ld < 1) {
    // The peak mirrored in the still water, squashed and broken by ripples.
    const rx = peak ? Math.round(x - PEAK.x + peak.ox + 1.5 * Math.sin(y * 1.7)) : 0, ry = peak ? Math.round(peak.oy - (y - 519) * 3.2) : 0;
    const rc = peak && ld < 0.86 && (y & 1 || hash(x, y, 8) < 0.6) ? peak.get(rx, ry) : 0;
    if (ld > 0.9) return R.water[4];
    if (rc && rc !== INK) { const k = RAMP_OF[rc]; return k === 'snow' ? R.water[4] : k === 'conifer' ? R.water[1] : R.water[2]; }
    if (hash(x, y, 7) < 0.045 && ld < 0.8) return R.glint[(Math.floor(x / 3) + y) & 3];
    return pick('water', 0.18 + 0.42 * smooth(0.1, 0.9, ld) + 0.08 * (vnoise(x / 6, y / 2, 8) - 0.5), x, y);
  }
  if (ld < 1.1) return x > 600 && y < 536 ? R.rock[hash(x >> 1, y >> 1, 3) < 0.5 ? 2 : 3] : R.dirt[hash(x, y, 3) < 0.3 ? 3 : 4];
  const td = tarnD(x, y);
  if (td < 1) return td > 0.86 ? R.tarn[5] : pick('tarn', 0.25 + 0.5 * smooth(0, 0.9, td), x, y);
  if (river[i] && trail[i] === 2) return (x + y) % 4 === 0 ? R.wood[1] : R.wood[3];
  if (river[i] === 2) return hash(x, y, 9) < 0.08 ? R.glint[(x + y) & 3] : R.water[y & 1 ? 3 : 4];
  if (river[i] === 1) return trail[i] ? R.wood[1] : R.water[1];
  const gl = glacier(x, y);
  if (gl.d < gl.w) return iceAt(gl, x, y);
  if (gl.d < gl.w + (gl.i ? 3 : 5)) return pick('rock', 0.2 + 0.55 * hash(x >> 1, y >> 1, 11), x, y);
  const tal = Math.max(talus(x, y), moraine(x, y));
  if (trail[i] === 2) { const grey = tkind[i] === 1 && hash(x, y, 14) < 0.85; return grey ? R.rock[hash(x, y, 5) < 0.2 ? 2 : hash(x, y, 6) < 0.3 ? 4 : 3] : hash(x, y, 5) < 0.1 ? R.dirt[2] : hash(x, y, 6) < 0.15 ? R.dirt[4] : R.dirt[3]; }
  if (trail[i] === 1) return tkind[i] === 1 ? R.rock[1] : R.dirt[1];
  if (tal > 0 && hash(x >> 1, y >> 1, 12) < tal * 0.9) return pick('rock', 0.15 + 0.75 * hash(x >> 1, y >> 1, 13), x, y);
  const fa = forestAmt(x, y);
  if (fa > 0.5 + 0.2 * n1) {
    // The forest floor darkens and greys toward the west, where the mist sits.
    const deep = smooth(520, 200, x), shaft = fbm(x / 34 + y / 70, y / 26, 21, 3);
    const v = 0.16 + 0.3 * fbm(x / 18, y / 18, 22, 3) + smooth(0.56, 0.7, shaft) * 0.4 * (1 - deep);
    return deep > 0.35 + 0.5 * hash(x, y, 23) ? pick('mist', v * 0.8, x, y) : pick('moss', v, x, y);
  }
  const ca = couleeAmt(x, y);
  if (ca > 0.5 + 0.2 * n1) {
    // Scabland: flat-topped benches of dry grass, each ending in a wall of columnar basalt over a dry wash.
    if (mesa(x, y)) return mesa(x, y + 1) ? (hash(x >> 1, y >> 1, 94) < 0.1 ? R.sage[1] : pick('dry', 0.6 + 0.3 * vnoise(x / 9, y / 5, 95), x, y)) : R.dry[3];
    if (mesa(x, y - 15)) { const col = hash(x >> 1, 0, 91); return (x >> 1) % 4 === 0 ? R.basalt[0] : R.basalt[col < 0.3 ? 1 : col < 0.75 ? 2 : 3]; }
    if (mesa(x, y - 22)) return hash(x, y, 92) < 0.5 ? R.basalt[2] : R.ash[1];
    return R.sand[0];
  }
  const ba = basinAmt(x, y), bu = burnAmt(x, y), da = dryAmt(x, y);
  // Each biome wins where its share beats a blotchy threshold, so its edge is a scatter of patches, not a line.
  const blot = s => 0.5 + 0.85 * (fbm(x / 32, y / 21, s, 3) - 0.5) + 0.2 * n1;
  if (ba > blot(181)) {
    // The larch basin: pale granite slabs with seams of grass and heather between them.
    const slab = fbm(x / 22, y / 11, 96, 3);
    if (slab > 0.5 + (1 - ba) * 0.12) return vnoise(x / 3, y / 9, 97) > 0.78 ? R.granite[2] : pick('granite', 0.62 + 0.5 * (slab - 0.5) + 0.2 * n1, x, y, 0.7);
    return hash(x, y, 98) < 0.06 ? R.pink[1] : pick('grass', 0.42 + 0.5 * (fbm(x / 20, y / 20, 99, 3) - 0.5) + 0.2 * n1, x, y, 0.4);
  }
  if (bu > blot(182)) {
    // The old burn: ash-grey ground, green coming back in patches, fireweed everywhere.
    const green = fbm(x / 24, y / 16, 100, 3);
    if (hash(x, y, 101) < 0.05 && hash(x, y - 1, 101) >= 0.05) return R.pink[1];
    if (hash(x, y + 1, 101) < 0.05) return R.pink[2];
    return green > 0.56 - (1 - bu) * 0.2 ? pick('grass', 0.3 + 0.5 * (green - 0.5) + 0.2 * n1, x, y, 0.5) : pick('ash', 0.4 + 0.5 * fbm(x / 14, y / 9, 102, 3) + 0.2 * n1, x, y);
  }
  if (da > blot(183)) {
    const sg = sageAmt(x, y);
    if (hash(x >> 1, y >> 1, 103) < 0.04 + sg * 0.3) return R.sage[1 + (hash(x, y, 104) < 0.5 ? 0 : 1)];
    if (hash(x >> 1, y >> 1, 106) < (1 - da) * 0.45) return pick('grass', 0.72 + 0.2 * n1, x, y, 0.4);
    return pick('dry', 0.5 + 0.5 * (fbm(x / 24, y / 14, 105, 3) - 0.5) + 0.15 * n1 + sg * 0.1, x, y);
  }
  // The fringes: each biome scatters a little of itself into the meadow around it.
  const h2 = hash(x >> 1, y >> 1, 107);
  if (da > 0.1 && h2 < da * 0.6) return pick('dry', 0.55 + 0.3 * n1, x, y);
  if (bu > 0.1 && h2 > 1 - bu * 0.5) return pick('ash', 0.55 + 0.3 * n1, x, y);
  if (ba > 0.1 && hash(x >> 1, y >> 1, 108) < ba * 0.3) return R.granite[3 + (hash(x, y, 109) < 0.5 ? 0 : 1)];
  return pick('grass', 0.56 + 0.55 * (fbm(x / 26, y / 26, 31, 3) - 0.5) + 0.14 * (hash(x >> 1, y >> 1, 32) - 0.5) - fa * 0.45 - smooth(462, 505, y) * 0.1 + da * 0.2, x, y, 0.3);
}
for (let y = 0; y < NH; y++) for (let x = 0; x < NW; x++) g[at(x, y)] = ground(x, y);
paintNorth();

// Tufts of grass, a small arch with a dark root.
{
  const r0 = rng(5);
  for (let n = 0; n < 17000; n++) {
    const x = 2 + (r0() * (NW - 4)) | 0, y = 470 + (r0() * (NH - 472)) | 0, i = at(x, y), k = KIND[g[i]]; if (k !== 1 && k !== 2) continue;
    const r = R[k === 1 ? 'grass' : 'moss']; if (KIND[g[i - NW]] !== k || KIND[g[i - 2 * NW]] !== k) continue;
    g[i - 2 * NW] = r[r.length - 1]; g[i - NW - 1] = r[r.length - 2]; g[i - NW + 1] = r[r.length - 2]; g[i] = r[1];
  }
}
// Wildflowers across the meadows, thickest in the south.
{
  const rand = rng(11), isGrass = i => g[i] >= R.grass[0] && g[i] <= R.grass[4];
  for (let n = 0; n < 520; n++) {
    const cx = 700 + rand() * 560, cy = n < 300 ? 720 + rand() * 340 : 500 + rand() * 300, type = rand(), count = 6 + (rand() * 12 | 0);
    for (let k = 0; k < count; k++) {
      const x = Math.round(cx + (rand() - 0.5) * 18), y = Math.round(cy + (rand() - 0.5) * 10); if (x < 2 || y < 470 || x >= NW - 2 || y >= NH - 2) continue;
      const i = at(x, y); if (!isGrass(i) || !isGrass(i - NW)) continue;
      if (type < 0.5) { g[i - NW] = R.lupine[2]; g[i] = R.lupine[1]; } else if (type < 0.75) { g[i - NW] = R.red[2]; g[i] = R.red[1]; } else if (type < 0.9) g[i] = R.white[1]; else g[i] = R.yellow[1];
    }
  }
}

// ---- things that stand up ---------------------------------------------------------------------
const things = [];
const blit = (bm, sx, sy) => { sx = Math.round(sx); sy = Math.round(sy); for (let j = 0; j < bm.h; j++) for (let i = 0; i < bm.w; i++) { const c = bm.d[j * bm.w + i], x = sx + i, y = sy + j; if (c && x >= 0 && y >= 0 && x < NW && y < NH) g[at(x, y)] = c; } };
const put = (bm, x, y) => things.push({ bm, x: Math.round(x), y: Math.round(y) });
const plant = (tree, x, y) => things.push({ tree, x: Math.round(x), y: Math.round(y) });
function blobTree(seed, name, H, trunk, n, r0) {
  const rand = rng(seed), W = 30, b = new BM(W, H + 2); b.ox = W >> 1; b.oy = H;
  for (let y = Math.round(H * 0.3); y <= H; y++) { b.set(b.ox - 1, y, R[trunk][2]); b.set(b.ox, y, R[trunk][1]); if (trunk === 'pbark' && y & 3) b.set(b.ox + 1, y, R[trunk][0]); }
  const cs = []; for (let k = 0; k < n; k++) cs.push([b.ox + (rand() - 0.5) * (W - 16), H * 0.3 + (rand() - 0.5) * H * 0.3, r0 + rand() * 2]);
  cs.sort((a, c) => a[1] - c[1]);
  for (const [x, y, r] of cs) { const c = clump(r, name, rand, 0); for (let j = 0; j < c.h; j++) for (let i = 0; i < c.w; i++) { const v = c.d[j * c.w + i]; if (v) b.set(Math.round(x - c.cx) + i, Math.round(y - c.cy) + j, v); } }
  outline(b, INK);
  return b;
}
function seaStack(seed, H, W) {
  const b = new BM(W + 4, H + 4); b.ox = (W >> 1) + 2; b.oy = H + 1;
  for (let y = 0; y < H; y++) { const hw = W / 2 * (0.45 + 0.55 * Math.pow(y / H, 0.6)) + 1.5 * (vnoise(y / 4, seed, 110) - 0.5); for (let x = -Math.ceil(hw); x <= hw; x++) b.set(b.ox + x, y + 2, y < 3 ? R.conifer[x < 0 ? 3 : 1] : pick('basalt', 0.62 - x / hw * 0.4 + 0.3 * (vnoise(x / 2, y / 5, seed) - 0.5), x, y)); }
  b.set(b.ox - 1, 1, R.conifer[2]); b.set(b.ox - 1, 0, R.conifer[3]); b.set(b.ox + 2, 1, R.conifer[1]);
  outline(b, INK);
  return b;
}
function ferry() {
  const b = new BM(30, 13); b.ox = 15; b.oy = 12;
  for (let x = 1; x < 29; x++) { b.set(x, 10, R.kit[0]); b.set(x, 9, R.white[1]); b.set(x, 8, R.white[1]); }
  for (let x = 4; x < 26; x++) { b.set(x, 7, R.kit[1]); b.set(x, 6, R.white[1]); b.set(x, 5, x % 3 ? R.navy[1] : R.white[1]); b.set(x, 4, R.white[1]); }
  for (let x = 9; x < 21; x++) b.set(x, 3, R.white[0]);
  b.set(13, 2, R.kit[1]); b.set(14, 2, R.kit[1]); b.set(13, 1, R.kit[1]); b.set(14, 1, R.kit[1]);
  outline(b, INK);
  return b;
}
function sageBush(seed) {
  const b = new BM(11, 7); b.ox = 5; b.oy = 6;
  for (let y = 0; y < 6; y++) for (let x = 0; x < 11; x++) { const nx = (x - 5) / 5, ny = (y - 4) / 3.4; if (nx * nx + ny * ny > 1 + 0.4 * (hash(x, y, seed) - 0.5)) continue; b.set(x, y, R.sage[clamp(Math.round(2.2 - nx * 1.2 - ny * 1.4 + (hash(x, y, seed + 1) - 0.5)), 1, 3)]); }
  outline(b, R.sage[0]);
  return b;
}
const charred = seed => { const s = makeSnag(seed); for (let i = 0; i < s.d.length; i++) if (s.d[i] && s.d[i] !== INK) s.d[i] = hash(i, seed, 5) < 0.55 ? R.basalt[1] : R.rock[3]; return s; };

const maples = Array.from({ length: 6 }, (_, i) => makeMaple(100 + i)), spruces = Array.from({ length: 6 }, (_, i) => makeSpruce(200 + i)), firs = Array.from({ length: 8 }, (_, i) => makeFir(300 + i));
const bigleaf = Array.from({ length: 4 }, (_, i) => blobTree(800 + i, i & 1 ? 'larch' : 'sun', 36 + i * 2, 'bark', 5, 5.5));
const larches = Array.from({ length: 6 }, (_, i) => { const r = rng(900 + i); return makeConifer(900 + i, 24 + (r() * 14 | 0), 10 + (r() * 4 | 0), 'larch', 6); });
const pines = Array.from({ length: 5 }, (_, i) => blobTree(820 + i, 'pine', 40 + i * 3, 'pbark', 6, 5.5));
const young = Array.from({ length: 4 }, (_, i) => makeConifer(940 + i, 9 + i * 2, 6, 'kit', 3));
const snags = Array.from({ length: 5 }, (_, i) => makeSnag(730 + i)), burnt = Array.from({ length: 4 }, (_, i) => charred(740 + i));
const sages = [0, 1, 2].map(i => sageBush(850 + i)), boulders = Array.from({ length: 6 }, (_, i) => makeBoulder(500 + i, 3 + i * 0.8));
const slabs = Array.from({ length: 4 }, (_, i) => { const b = makeBoulder(520 + i, 5 + i * 1.5); for (let k = 0; k < b.d.length; k++) if (b.d[k] && b.d[k] !== INK) b.d[k] = R.granite[clamp(R.rock.indexOf(b.d[k]) + 1, 1, 5)]; return b; });
const rand = rng(2026);
const open = (x, y) => y > groundLine(x) + 6 && coast(x, y) < -18 && lakeD(x, y) > 1.3 && tarnD(x, y) > 1.4 && !river[at(Math.round(x), Math.round(y))];
const clearOf = (x, y, w, h) => { for (let i = 0; i < trailPts.length; i += 2) { const p = trailPts[i]; if (Math.abs(p[0] - x) < w / 2 + 5 && p[1] > y - h - 3 && p[1] < y + 5) return false; } for (const [cx, cy, rx, ry] of LAKE) if (Math.abs(x - cx) < rx + w / 2 && y > cy - ry && y - h * 0.8 < cy + ry * 0.4) return false; return true; };
// The rainforest, with big-leaf maples turning gold along its trail.
for (let gy = 474; gy < NH + 30; gy += 9) for (let gx = -10; gx < 800; gx += 9) {
  const x = gx + rand() * 9, y = gy + rand() * 9, yy = Math.min(NH - 1, y), fa = forestAmt(clamp(x, 0, NW - 1), yy);
  if (rand() > fa * 0.78 || !open(clamp(x, 0, NW - 1), yy)) continue;
  const r = rand(), gold = nearTrail(x, y, 46) && rand() < 0.3 || rand() < 0.04;
  const tree = gold ? null : r < 0.45 ? maples[(rand() * 6) | 0] : r < 0.88 ? spruces[(rand() * 6) | 0] : firs[(rand() * 8) | 0];
  if (!clearOf(x, y, gold ? 26 : tree.w, gold ? 40 : tree.h)) continue;
  if (gold) put(bigleaf[(rand() * 4) | 0], x, y); else plant(tree, x, y);
}
// Firs in clumps across the meadows, thinning out where the next biome begins.
for (let n = 0; n < 1700; n++) {
  const x = 700 + rand() * 700, y = 478 + rand() * 590;
  if (fbm((x - OX) / 60, (y - OY) / 60, 71, 3) < 0.56 || !open(x, y) || forestAmt(x, y) > 0.2 || Math.hypot(x - T.x, (y - T.y) * 1.4) < 70 || talus(x, y) > 0.05) continue;
  if (rand() < Math.max(basinAmt(x, y), dryAmt(x, y) * 1.2, burnAmt(x, y) * 1.1)) continue;
  const gl = glacier(x, y); if (gl.d < gl.w + 8 || (Math.abs(x - SPIRES.x) < 96 && y < SPIRES.y + 4) || !clearOf(x, y, 12, 30)) continue;
  plant(firs[(rand() * 8) | 0], x, y);
}
// Larches: thick in the basin, thinning into the meadow and the pines, a few down by the Spires camp.
for (let n = 0; n < 1500; n++) {
  const x = 860 + rand() * 690, y = 470 + rand() * 270, ba = basinAmt(x, y), nearCamp = Math.hypot(x - 930, (y - 585) * 1.5) < 70;
  if (!open(x, y) || !(rand() < ba * 0.8 && fbm(x / 40, y / 30, 120, 3) > 0.52 - (1 - ba) * 0.12 && rand() < 0.5 || nearCamp && rand() < 0.07)) continue;
  const gl = glacier(x, y); if (gl.d < gl.w + 8 || !clearOf(x, y, 14, 34) || (Math.abs(x - SPIRES.x) < 96 && y < SPIRES.y + 4)) continue;
  plant(larches[(rand() * 6) | 0], x, y);
}
for (let n = 0; n < 90; n++) { const x = 1030 + rand() * 500, y = 480 + rand() * 210; if (rand() < basinAmt(x, y) && open(x, y) && glacier(x, y).d > glacier(x, y).w + 6) put(slabs[(rand() * 4) | 0], x, y); }
// The dry side: open ponderosa, then sagebrush, then nothing but rock and grass. Where the burn
// reached the pines it left them standing black.
for (let n = 0; n < 760; n++) {
  const x = 1090 + rand() * 470, y = 560 + rand() * 380, da = dryAmt(x, y), sg = sageAmt(x, y);
  if (rand() > da || couleeAmt(x, y) || !open(x, y)) continue;
  if (rand() < burnAmt(x, y)) { if (rand() < 0.45) put(burnt[(rand() * 4) | 0], x, y); continue; }
  if (rand() < (1 - sg) * 0.3 && fbm(x / 50, y / 40, 121, 3) > 0.42) put(pines[(rand() * 5) | 0], x, y); else if (rand() < 0.2 + sg * 0.6) put(sages[(rand() * 3) | 0], x, y);
}
// The old burn: silver and charred snags standing over young trees, thinning out at its edges.
for (let n = 0; n < 760; n++) {
  const x = 980 + rand() * 580, y = 770 + rand() * 310; if (rand() > burnAmt(x, y) * 1.1 || !open(x, y)) continue;
  const r = rand(); if (r < 0.34) put(snags[(rand() * 5) | 0], x, y); else if (r < 0.52) put(burnt[(rand() * 4) | 0], x, y); else if (r < 0.7) plant(young[(rand() * 4) | 0], x, y); else if (r < 0.74) put(makeLog(), x, y);
}
// Boulders, bushes and the odd snag in the open ground.
const bushes = [0, 1, 2].map(i => makeBush(700 + i, 'huck')).concat([0, 1, 2].map(i => makeBush(710 + i, 'heather')), [0, 1].map(i => makeBush(720 + i, 'green')));
for (let n = 0; n < 300; n++) {
  const x = 560 + rand() * 760, y = 480 + rand() * 590; if (!open(x, y) || nearTrail(x, y, 7) || Math.hypot(x - T.x, y - T.y) < 34 || forestAmt(x, y) > 0.3 || rand() < Math.max(burnAmt(x, y), dryAmt(x, y))) continue;
  if (rand() < 0.3) put(boulders[(rand() * 6) | 0], x, y); else put(bushes[(rand() * 8) | 0], x, y);
}
// The coast: sea stacks, driftwood along the beach, a ferry out by the fog, a humpback breaching,
// and jellyfish drifting in the shallows.
put(seaStack(1, 44, 20), 112, 852); put(seaStack(2, 30, 15), 192, 908); put(seaStack(3, 22, 11), 58, 802); put(seaStack(4, 50, 22), 332, 990); put(seaStack(5, 16, 9), 252, 958); put(seaStack(6, 26, 12), 420, 1050);
for (let n = 0; n < 500; n++) {
  const x = rand() * 600, y = 690 + rand() * 390, cs = coast(x, y); if (cs > -3 || cs < -13) continue;
  const len = 6 + rand() * 12, a = (rand() - 0.5) * 0.9 + 0.6;
  for (let k = 0; k < len; k++) { const px = Math.round(x + Math.cos(a) * k), py = Math.round(y + Math.sin(a) * k * 0.5); if (px > 0 && py > 0 && px < NW && py < NH - 1) { g[at(px, py)] = R.rock[4]; g[at(px, py + 1)] = R.rock[2]; } }
}
// Eight jellyfish. Eighteen spots are still drawn from the dice, so that everything placed after them
// stands where it always did, and eight of those are kept.
const jelly = [];
for (let n = 0, found = 0; n < 4000 && found < 18; n++) {
  const x = Math.round(rand() * 560), y = Math.round(700 + rand() * 370), cs = coast(x, y); if (cs < 14 || cs > 80 || x < 6 || y > NH - 10) continue;
  if (found++ * 4 % 9 < 4) jelly.push([x, y, jelly.length % 3 ? 0 : 1]);
}
function whale(splash = true) {
  // A humpback two thirds out of the water: dark back, pale grooved belly, one long flipper flung out.
  const b = new BM(56, 50); b.ox = 20; b.oy = 44;
  for (let s = 0; s <= 1; s += 0.01) {
    const cx = 14 + 26 * s + 5 * s * s, cy = 42 - 36 * s, rr = 2 + 8.5 * Math.sin(Math.PI * (0.12 + 0.8 * s));
    for (let dy = -Math.ceil(rr); dy <= rr; dy++) for (let dx = -Math.ceil(rr); dx <= rr; dx++) {
      if (dx * dx + dy * dy > rr * rr) continue;
      const belly = dx * 0.75 - dy * 0.65 < -rr * 0.5 && s < 0.8, x = Math.round(cx + dx), y = Math.round(cy + dy);
      b.set(x, y, belly ? ((x + y * 2) % 4 === 0 ? R.rock[3] : R.white[1]) : R.navy[dx + dy > rr * 0.5 ? 0 : dx + dy < -rr * 0.2 ? 2 : 1]);
    }
  }
  thick(b, 24, 24, 7, 15, 3, R.navy[1]); thick(b, 22, 24, 8, 17, 1, R.white[0]); b.set(42, 10, R.white[1]);
  outline(b, INK);
  if (splash) for (const [x, y] of [[4, 44], [8, 41], [12, 45], [26, 44], [30, 41], [34, 45], [2, 40], [36, 40], [16, 47], [22, 47], [9, 36], [31, 36], [6, 47], [30, 47]]) { b.set(x, y, R.white[1]); b.set(x + 1, y, R.white[1]); b.set(x, y + 1, R.sea[5]); }
  return b;
}
plant(firs[2], ISLE.x, ISLE.y + 1);
// Where the things stand that the scene draws itself, because they move or can be clicked.
const spots = {
  tents: [[924, 564, 'tent'], [948, 574, 'red']], signpost: [T.x - 4, T.y - 8],
  kiosk: [872, 657],
  // The ferry and the whale, out on the water.
  ferry: [44, 916], whale: [222, 934],
  // Each sign stands on the ground it names; content.js has the words. Whatever would stand in front of one is cleared below.
  signs: [[972, 592, 'scope-creep'], [858, 557, 'segfault'], [886, 532, 'merge-conflict'], [800, 742, 'yak-shave'], [766, 631, 'about-lake'], [1160, 600, 'rollback'], [1300, 552, 'feature-flag'], [1226, 884, 'hotfix'], [1420, 966, 'postmortem'], [1474, 724, 'cron-job'], [1506, 806, 'tech-debt'], [258, 864, 'cache-miss'], [334, 612, 'stack-trace'], [262, 480, 'off-by-one'], [470, 480, 'dependency'], [668, 586, 'monorepo'], [404, 996, 'latency']],
  // One small herd of elk, in a clearing of the south meadow well away from the junction. The first is the bull.
  elk: [[748, 814, 0], [782, 828, 1], [728, 840, 1], [764, 854, 0]],
  bear: [1010, 930], marmots: [[846, 574], [1340, 590], [700, 900]],
  goats: [[1196, 556, 0], [1212, 562, 1], [1290, 598, 0], [1384, 548, 0]],
  sheep: [[1484, 694, 0], [1512, 702, 1], [1470, 764, 0], [1530, 830, 1]],
  squirrels: [], jelly, birds: [[860, 700], [872, 694], [884, 702], [980, 840], [600, 880], [1100, 700], [420, 300], [436, 292], [1240, 330]]
};
// Seven squirrels and chipmunks: every other one of the fourteen spots the dice give.
for (let n = 0; n < 14; n++) { const x = 720 + rand() * 420, y = 760 + rand() * 300; if (open(x, y) && n % 2) spots.squirrels.push([Math.round(x), Math.round(y), n % 3 === 0 ? 1 : 0]); }
// Nothing stands in front of a sign: a tree, bush or boulder that would cover one is taken out.
const clearSigns = () => { for (const [sx, sy] of spots.signs) for (let i = things.length - 1; i >= 0; i--) {
  const th = things[i], w = th.tree ? th.tree.w : th.bm.w, h = th.tree ? th.tree.h : th.bm.h;
  if (th.y > sy - 3 && th.y - h < sy + 1 && Math.abs(th.x - sx) < w / 2 + 7) things.splice(i, 1);
} };
clearSigns();
function sheep(grazing, step = 0) {
  // A bighorn ram: sandy brown, white rump and muzzle, and a heavy horn curling round the ear.
  const b = new BM(24, 19); b.ox = 11; b.oy = 18;
  const coat = (nx, ny, x, y) => pick('dirt', 0.5 - ny * 0.3 - nx * 0.05, x, y, 0.5);
  for (const lx of [6, 8, 15, 17]) { const sw = step ? (lx % 2 ? -1 : 1) * (step === 1 ? 1 : -1) : 0; thick(b, lx, 12, lx + sw, 17, 1, R.dirt[lx % 2 ? 1 : 0]); b.set(lx + sw, 18, INK); }
  ell(b, 11, 10, 7, 4, coat); ell(b, 4.5, 9.5, 1.6, 2.2, () => R.white[1]);
  const hx = grazing ? 19 : 18, hy = grazing ? 12 : 6;
  thick(b, 16, 9, hx, hy + 1, 3, R.dirt[2]); ell(b, hx + 1, hy, 2.4, 2, coat); b.set(hx + 3, hy + 1, R.white[1]); b.set(hx + 4, hy + 1, R.white[0]); b.set(hx + 2, hy - 1, INK);
  outline(b, INK);
  for (const [dx, dy] of [[-1, -2], [0, -3], [1, -3], [2, -2], [2, -1], [1, 0], [0, 0], [-2, -1], [-2, 0], [-1, 1]]) b.set(hx + dx, hy + dy, dx + dy < -2 ? R.dry[3] : R.dry[1]);
  return b;
}
function squirrel(chip, run) {
  const b = new BM(10, 8), c = chip ? R.dirt : R.wood; b.ox = 5; b.oy = 7;
  if (run) { ell(b, 5, 5.6, 2.6, 1.3, () => c[3]); ell(b, 8, 4.8, 1.2, 1.1, () => c[3]); ell(b, 1.6, 4.4, 1.8, 1.1, () => c[2]); if (chip) { b.set(4, 5, R.white[1]); b.set(5, 5, R.white[1]); } b.set(8, 4, INK); }
  else {
    ell(b, 5.5, 5, 2.2, 1.8, () => c[3]); ell(b, 7.5, 3.5, 1.3, 1.2, () => c[3]); ell(b, 2.5, 3, 1.6, 2.6, () => c[2]);
    if (chip) { b.set(4, 4, R.white[1]); b.set(5, 4, R.white[1]); b.set(6, 4, R.white[1]); }
    b.set(8, 3, INK);
  }
  outline(b, INK);
  return b;
}

things.sort((a, b) => a.y - b.y);
for (const th of things) {
  if (th.tree) { const rx = th.tree.w * 0.42; for (let dy = -3; dy <= 3; dy++) for (let dx = -Math.ceil(rx); dx <= rx; dx++) { if (sq(dx / rx) + sq(dy / 3.2) > 1) continue; const x = th.x + dx + 2, y = th.y + dy - 1; if (x >= 0 && y >= 0 && x < NW && y < NH && g[at(x, y)] !== INK) g[at(x, y)] = R.ink[0] === g[at(x, y)] ? g[at(x, y)] : shade(g[at(x, y)]); } }
}
function shade(c) { for (const k in R) { const r = R[k], s = r.indexOf(c); if (s >= 0) return r[Math.max(0, s - 1)]; } return c; }
// Ferns and fallen logs on the forest floor.
const ferns = Array.from({ length: 6 }, (_, i) => makeFern(400 + i));
for (let n = 0; n < 3400; n++) { const x = rand() * 790, y = 478 + rand() * 600; if (y >= NH || forestAmt(x, y) < 0.6 || !open(x, y) || nearTrail(x, y, 4)) continue; things.push({ bm: ferns[(rand() * 6) | 0], x: Math.round(x), y: Math.round(y), fern: true }); }
for (let n = 0; n < 60; n++) { const x = rand() * 760, y = 490 + rand() * 560; if (forestAmt(x, y) > 0.7 && open(x, y) && !nearTrail(x, y, 9)) put(makeLog(), x, y); }
clearSigns();
// Mist drifts through the deep forest, thickest in the west, and a fog bank stands off the coast. It
// moves, so the scene draws it each frame (critters.js). Kept here is only where it may not lie, on a
// grid of two pixels: 1 where it stays thin, along the trail and just in from the beach, and 2 where
// there is none at all, over a sign's board (so the board can be read) and out past the beach.
const mist = { x1: 640, y0: 440, w: 320, h: Math.ceil((NH - 440) / 2) };
mist.gate = new Uint8Array(mist.w * mist.h);
{
  const mark = (x0, y0, x1, y1, v, round) => { const mx = (x0 + x1) / 2, my = (y0 + y1) / 2; for (let cy = Math.max(0, (y0 - mist.y0) >> 1); cy <= Math.min(mist.h - 1, (y1 - mist.y0) >> 1); cy++) for (let cx = Math.max(0, x0 >> 1); cx <= Math.min(mist.w - 1, x1 >> 1); cx++) if (mist.gate[cy * mist.w + cx] < v && (!round || sq((cx * 2 + 1 - mx) / (x1 - mx)) + sq((mist.y0 + cy * 2 + 1 - my) / (y1 - my)) <= 1)) mist.gate[cy * mist.w + cx] = v; };
  // The shoreline is found on a coarser grid, which is all the mist needs of it.
  for (let cy = 0; cy < mist.h; cy += 2) for (let cx = 0; cx < mist.w; cx += 2) { const cs = coast(cx * 2 + 2, Math.min(NH - 1, mist.y0 + cy * 2 + 2)), v = cs > -12 ? 2 : cs > -44 ? 1 : 0; if (v) for (const j of [0, 1]) for (const i of [0, 1]) if (cy + j < mist.h) mist.gate[(cy + j) * mist.w + cx + i] = v; }
  for (let i = 0; i < trailPts.length; i += 2) { const p = trailPts[i]; if (p[0] < mist.x1 + 12) mark(Math.round(p[0]) - 7, Math.round(p[1]) - 8, Math.round(p[0]) + 7, Math.round(p[1]) + 6, 1, true); }
  for (const [sx, sy] of spots.signs) mark(sx - 11, sy - 20, sx + 11, sy + 3, 2, false);
}
return { g, things, spots, mist, sea: SEA, trackPts, trails: TRAILS, forestAmt, lakeD, coast, groundLine, glacier, talus, open, nearTrail, make: { ferry, whale, sheep, squirrel } };
}
export { OX, OY, NW, NH, T, PEAK, STACK, SPIRES };
