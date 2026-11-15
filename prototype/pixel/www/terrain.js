// The ground of the world map and everything rooted in it: every biome, the lake, the river, the
// coast, the layers of peaks along the north, and each tree, rock and bush. The world scene draws
// from it and so does the plan page, so the two cannot drift apart.
import { TAU, clamp, lerp, smooth, frac, sq, rng, hash, vnoise, fbm, bayer, R, RAMP_OF, KIND, pick, BM, outline, thick, catmull, INK } from './core.js';
import { clump, makeMaple, makeAspen, makePonderosa, makeSpruce, makeFir, makeConifer, makeBoulder, makeLog, makeSnag, makeBush, makeFern } from './sprites.js';
import { ell } from './fauna.js';

// The map as it was until round 2 sits inside this one, moved right and down by OX, OY.
const OX = 260, OY = 160, NW = 1560, NH = 1080;
const T = { x: 820, y: 630 }, PEAK = { x: 645, y: 514 }, STACK = { x: 805, y: 544 }, SPIRES = { x: 975, y: 522 };
const GL = { x0: 976, y0: 510, x1: 969, y1: 541 };
// The trail conditions board stands just north-east of the junction. The cats keep to it (cats.js).
const KIOSK = { x: 846, y: 608 };
// The sea's corner of the map, where the swells and the wash line are kept.
const SEA_W = 680, SEA_H = NH - 630;
// Reads ground.png: a grey picture as wide as the map whose first NH rows are the ground, one palette
// entry to a pixel, followed by three strips the size of the sea's corner (wash line, which swells
// show, the swell's phase). It is unpacked here by hand, not through a canvas, so every byte comes
// back exactly as it was baked. Anything amiss gives null and the ground is worked out as before.
export async function loadBake() {
  try {
    const res = await fetch(new URL('./ground.png', import.meta.url)); if (!res.ok) return null;
    const b = new Uint8Array(await res.arrayBuffer()), dv = new DataView(b.buffer), parts = []; let w = 0, h = 0;
    for (let p = 8; p + 12 <= b.length;) {
      const n = dv.getUint32(p), type = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]);
      if (type === 'IHDR') { w = dv.getUint32(p + 8); h = dv.getUint32(p + 12); } else if (type === 'IDAT') parts.push(b.subarray(p + 8, p + 8 + n));
      p += 12 + n;
    }
    if (w !== NW || h !== NH + 3 * SEA_H) return null;
    const px = new Uint8Array(await new Response(new Blob(parts).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
    if (px.length !== (w + 1) * h) return null;
    // Each row starts with one byte that says how it is packed; the bake packs none of them.
    const row = y => px.subarray(y * (w + 1) + 1, (y + 1) * (w + 1));
    const g = new Uint8Array(NW * NH); for (let y = 0; y < NH; y++) g.set(row(y), y * NW);
    const strip = k => { const a = new Uint8Array(SEA_W * SEA_H); for (let y = 0; y < SEA_H; y++) a.set(row(NH + k * SEA_H + y).subarray(0, SEA_W), y * SEA_W); return a; };
    return { g, shore: strip(0), gate: strip(1), ph: strip(2) };
  } catch { return null; }
}
export function buildTerrain(peak, opt = {}) {
const g = new Uint8Array(NW * NH);
const SEA = { y0: NH - SEA_H, w: SEA_W, h: SEA_H }; for (const k of ['ph', 'gate', 'shore']) SEA[k] = new Uint8Array(SEA.w * SEA.h);
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
// East of here the firs of the meadow give way to aspen and ponderosa. The line wanders.
const eastAmt = (x, y) => smooth(985, 1070, x + 60 * (fbm(y / 70, 7.7, 13, 3) - 0.5));
const burnAmt = (x, y) => smooth(1000, 1300, x + 120 * (fbm(y / 90, 5, 11, 3) - 0.5)) * smooth(780, 950, y + 80 * (fbm(x / 90, 6, 12, 3) - 0.5));
const MESAS = [[1496, 700, 52, 17], [1462, 772, 40, 14], [1526, 836, 44, 15], [1420, 708, 16, 7]];
const mesa = (x, y) => MESAS.some(([cx, cy, rx, ry]) => Math.hypot((x - cx) / rx, (y - cy) / ry) < 1 + 0.25 * (vnoise(x / 9, y / 7, 141) - 0.5));
const couleeAmt = (x, y) => mesa(x, y) || mesa(x, y - 15) || mesa(x, y - 22) ? 1 : 0;
const talus = (x, y) => (y > 528 && y < 580) ? smooth(118, 64, Math.abs(x - STACK.x) + (y - 536) * 2.4) : 0;
const moraine = (x, y) => (y > 510 && y < 540 && Math.abs(x - SPIRES.x) < 100) ? smooth(538, 520, y + 5 * vnoise(x / 6, 1, 15)) * smooth(100, 84, Math.abs(x - SPIRES.x)) * 0.8 : 0;
// The glacier out of the Spires. It ends in a blunt toe on the moraine at the mountain's foot, and
// the gravel it has left lies in a flat below, round the tents.
const TONGUES = [{ ...GL, w0: 54, w1: 13 }];
const outwash = (x, y) => smooth(1, 0.35, Math.hypot((x - 946) / 38, (y - 562) / 22) + 0.3 * (vnoise(x / 11, y / 7, 16) - 0.5)) * 0.75;
// The glaciers as they lay when the map was first laid out: the long tongue down past the tents and
// two small ones between the peaks. Nothing is drawn from them; the placement loops ask them when to
// roll the dice (see the dice, below).
const TONGUES_WAS = [{ x0: 976, y0: 510, x1: 958, y1: 584, w0: 64, w1: 11 }, { x0: 891, y0: 450, x1: 888, y1: 524, w0: 4, mid: [0.4, 11], w1: 6 }, { x0: 1060, y0: 386, x1: 1096, y1: 514, w0: 5, mid: [0.55, 22], w1: 8 }];
function glacier(x, y, list = TONGUES) {
  let best = null;
  for (let i = 0; i < list.length; i++) {
    const q = list[i], dx = q.x1 - q.x0, dy = q.y1 - q.y0, t = clamp(((x - q.x0) * dx + (y - q.y0) * dy) / (dx * dx + dy * dy), 0, 1), px = q.x0 + dx * t + (i ? 5 * Math.sin(t * 5.5 + i * 2) * Math.sin(t * Math.PI) : 0), py = q.y0 + dy * t;
    const wd = q.mid ? (t < q.mid[0] ? lerp(q.w0, q.mid[1], t / q.mid[0]) : lerp(q.mid[1], q.w1, (t - q.mid[0]) / (1 - q.mid[0]))) : lerp(q.w0, q.w1, Math.pow(t, 0.8));
    const o = { t, d: Math.hypot(x - px, y - py), w: wd + (i ? 2.5 : 5) * (vnoise(x / 8, y / 8, 9 + i) - 0.5), side: x - px, i, len: Math.hypot(dx, dy) };
    if (!best || o.d - o.w < best.d - best.w) best = o;
  }
  return best;
}
function iceAt(gl, x, y) {
  const cre = frac(gl.t * gl.len / 10.5 - sq(gl.side / gl.w) * 0.35 + 0.35 * vnoise(x / 6, y / 6, 2));
  if (cre < 0.07 && gl.d < gl.w - 3 && vnoise(x / 5, y / 3, 3) > 0.35) return cre < 0.04 ? R.glac[0] : R.glac[2];
  return gl.t > 0.8 && hash(x >> 1, y >> 1, 9) < (gl.t - 0.8) * 2 ? R.rock[1] : pick('glac', 0.8 - 0.3 * gl.side / gl.w + 0.18 * (vnoise(x / 4, y / 4, 8) - 0.5) - gl.t * 0.15, x, y, 0.6);
}

// ---- trails and the river ---------------------------------------------------------------------
const TRAILS = {
  lake: [[820, 630], [790, 636], [755, 642], [722, 652], [694, 660], [660, 676], [622, 694], [580, 700], [540, 688], [505, 668], [470, 676], [440, 700], [405, 706], [372, 688], [352, 655], [325, 632], [300, 600], [296, 565], [318, 540], [350, 548], [378, 574], [410, 580], [436, 560], [450, 530], [480, 512], [516, 520], [540, 546], [572, 566], [610, 568], [650, 564], [690, 552], [716, 541], [730, 556], [748, 585], [772, 606], [798, 622], [820, 630]],
  stack: [[820, 630], [818, 612], [813, 590], [809, 570], [806, 553]],
  spires: [[820, 630], [846, 623], [880, 612], [910, 600], [928, 586], [936, 572]],
  // Past the tents the way crosses the moraine to the glacier's toe and goes on as a boot track in
  // the snow, winding up the ice until it fades.
  track: [[936, 572], [939, 563], [948, 556], [958, 552], [965, 545], [960, 535], [969, 526], [965, 516], [974, 507], [981, 499]]
};
// The river runs straight out of the lake: its first point lies in the water. At the coast it bends
// along the back of the beach before it turns out to sea.
const RIVER = [[628, 543], [630, 556], [640, 590], [668, 625], [694, 660], [712, 700], [708, 750], [682, 800], [634, 842], [588, 880], [524, 906], [458, 932], [419, 962], [412, 975], [404, 981], [396, 986], [391, 994], [386, 1003]];
const INLET = [[742, 514], [728, 522], [712, 527], [702, 530]];
// trail and track: 2 on the tread, 1 on its edge. tkind: how much of a trail's tread is rock there, 0 to
// 255. trackF: how far along the way from the tents up the ice a spot is, 1 at the tents to 201 where it
// gives out. riverWas: the river as it ran when the map was first laid out, which only the placement
// loops read (see the dice, below).
const trail = new Uint8Array(NW * NH), tkind = new Uint8Array(NW * NH), track = new Uint8Array(NW * NH), trackF = new Uint8Array(NW * NH), river = new Uint8Array(NW * NH), riverWas = new Uint8Array(NW * NH);
const trailPts = [];
function stamp(mask, pts, r0, r1, kindOf, kinds = tkind) {
  const all = catmull(pts);
  all.forEach(([px, py], n) => {
    const f = n / (all.length - 1), rr = typeof r0 === 'function' ? r0(f, px, py) : lerp(r0, r1, f), R2 = Math.ceil(rr + 1);
    for (let dy = -R2; dy <= R2; dy++) for (let dx = -R2; dx <= R2; dx++) {
      const d = Math.hypot(dx, dy), x = Math.round(px + dx), y = Math.round(py + dy), v = d <= rr ? 2 : d <= rr + 1 ? 1 : 0;
      if (v && x >= 0 && y >= 0 && x < NW && y < NH && mask[at(x, y)] < v) { mask[at(x, y)] = v; if (kindOf) kinds[at(x, y)] = kindOf(f); }
    }
  });
  return all;
}
const lakePts = stamp(trail, TRAILS.lake, 1.9, 1.9, () => 0);
trailPts.push(...lakePts);
// Dirt gives way to rock over a stretch of each trail, not at a line: toward the talus under The
// Stack, and toward the moraine at the Spires camp.
trailPts.push(...stamp(trail, TRAILS.stack, 1.9, 1.9, f => Math.round(255 * smooth(0.46, 0.78, f))));
trailPts.push(...stamp(trail, TRAILS.spires, 1.9, 1.9, f => Math.round(255 * smooth(0.72, 0.95, f))));
// The track is as wide as the trail until it thins toward its end. It is kept out of trailPts so
// that nothing which was placed by asking how near a trail is has to move.
const trackPts = stamp(track, TRAILS.track, 1.9, 0.8, f => 1 + Math.round(f * 200), trackF);
// The river widens all the way down from the lake, then draws in through the last of the forest to
// a narrow channel on the beach, and opens a little where it meets the surf.
const riverR = (f, x, y) => { const cs = coast(x, y); return lerp(2.2, 6, f) * lerp(1, 0.47, smooth(-110, -22, cs)) * (1 + 0.3 * smooth(-5, 3, cs)); };
stamp(river, RIVER, riverR, 0, null); stamp(river, INLET, 1.2, 1.6, null);
stamp(riverWas, [[630, 556], [640, 590], [668, 625], [694, 660], [712, 700], [708, 750], [682, 800], [634, 842], [588, 880], [524, 906], [458, 932], [404, 978], [372, 1010]], 2.2, 6, null); stamp(riverWas, INLET, 1.2, 1.6, null);
// The lake trail crosses the river twice, and a footbridge carries it over each time. A bridge is
// the stretch of trail over the water and a few steps of bank at either end.
const BRIDGES = [];
{
  let run = null;
  lakePts.forEach(([px, py], n) => {
    if (river[at(Math.round(px), Math.round(py))]) { if (!run) run = [n, n]; run[1] = n; }
    else if (run && n - run[1] > 30) { BRIDGES.push(run); run = null; }
  });
  if (run) BRIDGES.push(run);
  BRIDGES.forEach((r, k) => {
    const pts = lakePts.slice(r[0] - 9, r[1] + 10), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    BRIDGES[k] = { pts, x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, x0, x1, y0, y1 };
  });
}
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
    for (const p of row.sort((a, b) => a.h - b.h)) paintPeak(p);
  }
}

// ---- the ground -------------------------------------------------------------------------------
// Where the river meets the sea, and which way it is running there. mouthD is under 1 inside the
// fan of river water that spreads from that spot, longer along the flow than across it.
const riverPts = catmull(RIVER), MOUTH = (() => { for (let k = 1; k < riverPts.length; k++) { const [px, py] = riverPts[k]; if (coast(px, py) > 0) { const [qx, qy] = riverPts[Math.max(0, k - 12)], l = Math.hypot(px - qx, py - qy) || 1; return { x: px, y: py, dx: (px - qx) / l, dy: (py - qy) / l }; } } return null; })();
// The river's last stretch with its width at each point, and how far outside the channel's bank a
// spot on the beach is. The bank wobbles so it is not a ruled line.
const mouthChan = riverPts.map(([px, py], n) => [px, py, riverR(n / (riverPts.length - 1), px, py)]).filter(([px, py], n) => n % 2 === 0 && coast(px, py) > -40);
const bankD = (x, y) => { if (!MOUTH || Math.abs(x - MOUTH.x) > 60 || Math.abs(y - MOUTH.y) > 60) return 99; let best = 99; for (const [px, py, r] of mouthChan) { const d = Math.hypot(px - x, py - y) - r; if (d < best) best = d; } return best + 1.1 * (vnoise(x / 3.5, y / 3.5, 89) - 0.5); };
// The river has spread a small flat of sand behind the beach where it comes out of the forest.
const mouthFlat = (x, y) => MOUTH ? 9 * smooth(30, 10, Math.hypot(x - MOUTH.x - 9, y - MOUTH.y + 6)) : 0;
const mouthD = (x, y) => { if (!MOUTH || Math.abs(x - MOUTH.x) > 34 || Math.abs(y - MOUTH.y) > 34) return 9; const ex = x - MOUTH.x, ey = y - MOUTH.y, u = ex * MOUTH.dx + ey * MOUTH.dy, v = ex * MOUTH.dy - ey * MOUTH.dx; return Math.hypot((u - 4) / 13, v / (7 + Math.max(0, u) * 0.35)) + 0.25 * (vnoise(x / 5, y / 5, 91) - 0.5); };
// Near its end the boot track breaks up into single prints: this is true in the gaps between them.
const printGap = i => { const tf = (trackF[i] - 1) / 200; return tf > 0.8 && Math.floor(tf * 70) % 3 === 0; };
function ground(x, y) {
  if (y < groundLine(x)) return skyAt(x, y);
  const i = at(x, y), n1 = hash(x, y, 31) - 0.5;
  const cs = coast(x, y);
  // Where the river runs out, the surf line has a gap and the water fans out pale into the sea.
  const md = mouthD(x, y);
  if (cs > 0) {
    // The water that moves is kept apart from the ground, for the scene to draw each frame: where a
    // swell can show and how far along its 24 pixel wavelength this spot is, and how close the shore is.
    if (x < SEA.w && y >= SEA.y0 && md >= 1) {
      const j = (y - SEA.y0) * SEA.w + x;
      if (cs < 8) SEA.shore[j] = 1 + Math.round((cs + 4) * 8);
      else if (vnoise(x / 22, y / 9, 85) > (cs < 60 ? 0.4 : 0.54)) { SEA.gate[j] = cs < 40 ? 2 : 1; SEA.ph[j] = Math.floor(frac((cs + 7 * Math.sin(x / 37 + y / 61)) / 24) * 240); }
    }
    const v = 0.75 - smooth(0, 150, cs) * 0.6 + 0.12 * (vnoise(x / 14, y / 3, 86) - 0.5);
    if (md < 1) return hash(x, y, 90) < 0.12 * (1 - md) ? R.sea[5] : pick('sea', v + 0.28 * smooth(1, 0.25, md), x, y, 0.8);
    return pick('sea', v, x, y);
  }
  // On the beach the river is a shallow channel with soft banks. bd is how far outside its bank this
  // spot is (under 0 is in the water), and the surf line is left open where the channel meets it.
  const bd = cs > -34 ? bankD(x, y) : 99;
  if (cs > -4 && x < SEA.w && y >= SEA.y0 && bd > 1) SEA.shore[(y - SEA.y0) * SEA.w + x] = 1 + Math.round((cs + 4) * 8);
  if (cs > -15 - 6 * vnoise(x / 20, y / 20, 87) - mouthFlat(x, y)) {
    if (bd < 0) {
      // A few grains of the bank break the water's edge, and the water pales as it shallows toward the surf.
      if (bd > -1.1 && hash(x, y, 93) < 0.22) return R.sand[1];
      return hash(x, y, 9) < 0.04 ? R.glint[(x + y) & 3] : pick('water', 0.6 + 0.36 * smooth(-18, 1, cs) + 0.12 * (hash(x, y, 94) - 0.5), x, y, 0.9);
    }
    // Wet sand lies dark along both banks.
    if (bd < 2.2) return R.sand[hash(x, y, 95) < 0.2 ? 1 : 0];
    return R.sand[cs > -4 ? 0 : hash(x, y, 88) < 0.25 ? 1 : 2];
  }
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
  // The river is drawn before the lake's bank, so the outlet runs straight out of the lake with no
  // strip of shore across it. Where a stream meets the lake its dark edge is left off.
  if (river[i] === 2) return hash(x, y, 9) < 0.08 ? R.glint[(x + y) & 3] : R.water[y & 1 ? 3 : 4];
  if (river[i] === 1) return ld < 1.16 ? R.water[4] : R.water[1];
  if (ld < 1.1) return x > 600 && y < 536 ? R.rock[hash(x >> 1, y >> 1, 3) < 0.5 ? 2 : 3] : R.dirt[hash(x, y, 3) < 0.3 ? 3 : 4];
  const td = tarnD(x, y);
  if (td < 1) return td > 0.86 ? R.tarn[5] : pick('tarn', 0.25 + 0.5 * smooth(0, 0.9, td), x, y);
  const gl = glacier(x, y);
  if (gl.d < gl.w) {
    // The boot track up the ice: a trench as wide as the trail with its floor in shade, down to
    // single prints where it gives out.
    if (track[i] && !printGap(i)) return track[i] === 1 ? R.glac[3] : hash(x, y, 16) < 0.3 ? R.glac[2] : R.glac[1];
    return iceAt(gl, x, y);
  }
  // From the tents to the toe of the ice the way is a path trodden through the moraine.
  if (track[i] === 2) return R.rock[hash(x, y, 5) < 0.2 ? 2 : hash(x, y, 6) < 0.3 ? 4 : 3];
  if (track[i] === 1 && !trail[i]) return R.rock[1];
  if (gl.d < gl.w + 5) return pick('rock', 0.2 + 0.55 * hash(x >> 1, y >> 1, 11), x, y);
  const tal = Math.max(talus(x, y), moraine(x, y), outwash(x, y));
  // Rock takes over a trail's tread in a scatter, part in small patches and part pixel by pixel.
  const grey = trail[i] && 0.55 * hash(x >> 1, y >> 1, 14) + 0.45 * hash(x, y, 15) < tkind[i] / 255;
  if (trail[i] === 2) return grey ? R.rock[hash(x, y, 5) < 0.2 ? 2 : hash(x, y, 6) < 0.3 ? 4 : 3] : hash(x, y, 5) < 0.1 ? R.dirt[2] : hash(x, y, 6) < 0.15 ? R.dirt[4] : R.dirt[3];
  if (trail[i] === 1) return grey ? R.rock[1] : R.dirt[1];
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
    // The old burn: ash-grey ground, green coming back in patches, and fireweed.
    const green = fbm(x / 24, y / 16, 100, 3);
    // Fireweed stands in drifts: spikes three to five pixels tall on a green stem, thick in some
    // patches and thin between them. A spike is rooted k pixels below this one.
    for (let k = 0; k < 5; k++) {
      const tall = 3 + Math.floor(hash(x, y + k, 132) * 2.99);
      if (k < tall && hash(x, y + k, 101) < 0.012 + 0.15 * smooth(0.5, 0.66, fbm(x / 30, (y + k) / 15, 131, 3))) return k === 0 ? R.grass[1] : k === tall - 1 ? R.fireweed[1] : hash(x, y, 133) < 0.18 ? R.pink[1] : R.fireweed[0];
    }
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
// Working the ground out pixel by pixel takes about a second, most of the wait before the map shows.
// So it is worked out ahead of time and kept in ground.png (bake.sh), with the three things ground()
// leaves behind for the sea. A bake is trusted only if ground() still gives the same answer at one
// spot in every ten by ten pixels; if the map has changed since, the ground is worked out here.
let baked = opt.bake && opt.bake.g.length === g.length ? opt.bake : null;
if (baked) check: for (let by = 0; by < NH; by += 10) for (let bx = 0; bx < NW; bx += 10) {
  const x = Math.min(NW - 1, bx + Math.floor(hash(bx, by, 911) * 10)), y = Math.min(NH - 1, by + Math.floor(hash(bx, by, 912) * 10));
  if (ground(x, y) !== baked.g[at(x, y)]) { baked = null; break check; }
}
if (baked) { g.set(baked.g); for (const k of ['ph', 'gate', 'shore']) SEA[k].set(baked[k]); }
else for (let y = 0; y < NH; y++) for (let x = 0; x < NW; x++) g[at(x, y)] = ground(x, y);
// Said only while working on the map, where it means the bake wants running again.
if (opt.bake !== undefined && !baked && location.hostname === 'localhost') console.warn('ground.png is missing or no longer matches the map: run ./bake.sh');
const raw = opt.raw ? { g: g.slice(), shore: SEA.shore.slice(), gate: SEA.gate.slice(), ph: SEA.ph.slice() } : null;
paintNorth();
// The top of the boot track lies behind the Spires, which stand in front of the ground. The scene
// draws these pixels again over the mountain so the track is seen to climb onto it.
const trackPix = [];
for (let y = 470; y < SPIRES.y + 2; y++) for (let x = SPIRES.x - 60; x < SPIRES.x + 60; x++) { const i = at(x, y); if (track[i] && !printGap(i)) trackPix.push([x, y, g[i]]); }

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
// A tree that is one still picture (a gold maple, a ponderosa, an aspen, a snag). It is marked so the
// debug panel's Trees switch hides it along with the trees that sway.
const putTree = (bm, x, y) => things.push({ bm, x: Math.round(x), y: Math.round(y), isTree: true });
// The two footbridges of the lake trail. The deck is painted into the ground. Each rail is a thing
// of its own: the far rail sorts behind him as he crosses and the near rail in front of him, so he
// is seen to run between them.
for (const br of BRIDGES) {
  const [ax, ay] = br.pts[0], [bx, by] = br.pts[br.pts.length - 1], len = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / len, uy = (by - ay) / len;
  // (nx, ny) points across the deck, toward its near side.
  let nx = -uy, ny = ux; if (ny < 0) { nx = -nx; ny = -ny; }
  const HALF = 4, RAIL = 4, X0 = Math.floor(br.x0) - 7, Y0 = Math.floor(br.y0) - 13, bw = Math.ceil(br.x1) - X0 + 8, bh = Math.ceil(br.y1) - Y0 + 9;
  for (let y = Y0; y < Y0 + bh; y++) for (let x = X0; x < X0 + bw; x++) {
    const t = (x - ax) * ux + (y - ay) * uy, d = (x - ax) * nx + (y - ay) * ny; if (t < -0.5 || t > len + 0.5) continue;
    // Planks across the deck with a dark seam between them, a beam along each edge, and the deck's shadow on the water.
    if (Math.abs(d) <= HALF) g[at(x, y)] = d > HALF - 1 ? R.wood[1] : d < 1 - HALF ? R.wood[2] : Math.floor(t + 0.5) % 3 === 0 ? R.wood[2] : R.wood[hash(Math.floor((t + 0.5) / 3), Math.floor(br.x0), 60) < 0.4 ? 4 : 3];
    else if (d > HALF && d <= HALF + 2 && river[at(x, y)]) g[at(x, y)] = R.water[d <= HALF + 1 ? 0 : 1];
  }
  const rail = (side, sortY) => {
    const b = new BM(bw, bh), px = t => ax + ux * t + nx * side * HALF - X0, py = t => ay + uy * t + ny * side * HALF - Y0; b.oy = sortY - Y0;
    for (const t of [1, len / 2, len - 1]) for (let h = 0; h < RAIL; h++) b.set(px(t), Math.round(py(t)) - h, R.wood[2]);
    for (let t = 0; t <= len; t += 0.5) b.set(px(t), Math.round(py(t)) - RAIL, R.wood[4]);
    outline(b, INK);
    things.push({ bm: b, x: X0, y: sortY, keep: true });
  };
  rail(-1, Math.floor(Math.min(ay, by)) - HALF); rail(1, Math.ceil(Math.max(ay, by)) + HALF + 1);
}
function blobTree(seed, name, H, trunk, n, r0) {
  const rand = rng(seed), W = 30, b = new BM(W, H + 2); b.ox = W >> 1; b.oy = H;
  for (let y = Math.round(H * 0.3); y <= H; y++) { b.set(b.ox - 1, y, R[trunk][2]); b.set(b.ox, y, R[trunk][1]); }
  const cs = []; for (let k = 0; k < n; k++) cs.push([b.ox + (rand() - 0.5) * (W - 16), H * 0.3 + (rand() - 0.5) * H * 0.3, r0 + rand() * 2]);
  cs.sort((a, c) => a[1] - c[1]);
  for (const [x, y, r] of cs) { const c = clump(r, name, rand, 0); for (let j = 0; j < c.h; j++) for (let i = 0; i < c.w; i++) { const v = c.d[j * c.w + i]; if (v) b.set(Math.round(x - c.cx) + i, Math.round(y - c.cy) + j, v); } }
  outline(b, INK);
  return b;
}
// A sea stack is drawn from its top down to the water. Its waterline curves, lowest in the middle,
// the rock is dark and wet for the last rows above it, and the outline stops there: an outline
// under the rock is what made a stack look set down on top of the sea.
function seaStack(seed, H, W) {
  const b = new BM(W + 4, H + 4); b.ox = (W >> 1) + 2; b.oy = H + 1;
  const foot = x => H - 3 + Math.round(3 * (1 - sq(x / (W / 2 + 1))));
  for (let y = 0; y < H; y++) {
    const hw = W / 2 * (0.45 + 0.55 * Math.pow(y / H, 0.6)) + 1.5 * (vnoise(y / 4, seed, 110) - 0.5);
    for (let x = -Math.ceil(hw); x <= hw; x++) {
      const wet = foot(x) - y; if (wet <= 0) continue;
      const v = 0.62 - x / hw * 0.4 + 0.3 * (vnoise(x / 2, y / 5, seed) - 0.5);
      b.set(b.ox + x, y + 2, y < 3 ? R.conifer[x < 0 ? 3 : 1] : wet <= 2 ? R.basalt[0] : pick('basalt', wet <= 4 ? v - 0.3 : v, x, y));
    }
  }
  b.set(b.ox - 1, 1, R.conifer[2]); b.set(b.ox - 1, 0, R.conifer[3]); b.set(b.ox + 2, 1, R.conifer[1]);
  outline(b, INK);
  for (let x = -(W >> 1) - 2; x <= (W >> 1) + 2; x++) for (let y = foot(x); y < H + 2; y++) if (b.get(b.ox + x, y + 2) === INK) b.set(b.ox + x, y + 2, 0);
  return b;
}
// The ferry, seen from the shore and a little above, lying along its course: bow down to the right.
// Both ends are alike, as on the boats that cross the Sound, so it sails back without turning round.
function ferry() {
  const b = new BM(50, 48); b.ox = 25; b.oy = 30;
  // u runs along the hull, v across it and z up. A deck is a slab with rounded ends: its far wall, its
  // near wall, then its top over both, which hides whatever of the far wall could not be seen.
  const dot = (u, v, z, c) => b.set(Math.round(b.ox + u * 0.83 + v * 0.56), Math.round(b.oy + u * 0.56 - v * 0.83 - z), c);
  const deck = (u0, U, V, r, z0, z1, wall, top) => {
    const half = u => { const e = Math.abs(u) - (U - r); return e <= 0 ? V : V * Math.sqrt(Math.max(0, 1 - e * e / (r * r))); };
    for (const side of [1, -1]) for (let u = -U; u <= U; u += 0.25) for (let z = z0; z < z1; z++) dot(u0 + u, side * half(u), z, wall(u, z - z0));
    for (let u = -U; u <= U; u += 0.25) { const h = half(u); for (let v = -h; v <= h; v += 0.25) dot(u0 + u, v, z1, top(u, v)); }
  };
  const W1 = R.white[1], W0 = R.white[0];
  // The hull: green at the waterline, the car deck open and grey at both ends.
  deck(0, 19, 5, 6, 0, 3, (u, z) => z < 1 ? R.kit[0] : W1, u => Math.abs(u) > 14.5 ? R.rock[3] : W0);
  // The cabin: a green band, a row of windows, a pale roof.
  deck(0, 14, 4, 3, 3, 8, (u, z) => z < 1 ? R.kit[1] : z === 2 && Math.round(u * 0.83 + 40) % 3 ? R.navy[1] : W1, () => W0);
  // A wheelhouse toward each end and the funnel between them.
  for (const u0 of [-10, 10]) deck(u0, 2, 2, 1, 8, 10, (u, z) => z === 1 ? R.navy[1] : W1, () => W1);
  deck(0, 1.6, 1.2, 0.8, 8, 12, (u, z) => z > 2 ? R.kit[0] : R.kit[1], () => R.kit[0]);
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
const pines = Array.from({ length: 5 }, (_, i) => makePonderosa(820 + i)), aspens = Array.from({ length: 7 }, (_, i) => makeAspen(600 + i));
const young = Array.from({ length: 4 }, (_, i) => makeConifer(940 + i, 9 + i * 2, 6, 'kit', 3));
const snags = Array.from({ length: 5 }, (_, i) => makeSnag(730 + i)), burnt = Array.from({ length: 4 }, (_, i) => charred(740 + i));
const logs = Array.from({ length: 6 }, (_, i) => makeLog(i)), silverLogs = Array.from({ length: 4 }, (_, i) => makeLog(10 + i, true));
// Lays a log down, if the dice of its number allow and the spot is free, with its shadow on the ground under it.
function layLog(bm, x, y, n, share) {
  x = Math.round(x); y = Math.round(y); if (hash(n, 7, 77) >= share || !free(x, y, bm.w, bm.h)) return;
  put(bm, x, y);
  for (let i = 1; i < bm.w - 1; i++) { let low = -1; for (let j = 0; j < bm.h; j++) if (bm.d[j * bm.w + i]) low = j; if (low < 0) continue; for (let k = 1; k <= 2; k++) { const gx = x - bm.ox + i + k, gy = y - bm.oy + low + k; if (gx >= 0 && gy >= 0 && gx < NW && gy < NH && (k === 1 || (gx + gy) & 1)) g[at(gx, gy)] = shade(g[at(gx, gy)]); } }
}
const sages = [0, 1, 2].map(i => sageBush(850 + i)), boulders = Array.from({ length: 6 }, (_, i) => makeBoulder(500 + i, 3 + i * 0.8));
const slabs = Array.from({ length: 4 }, (_, i) => { const b = makeBoulder(520 + i, 5 + i * 1.5); for (let k = 0; k < b.d.length; k++) if (b.d[k] && b.d[k] !== INK) b.d[k] = R.granite[clamp(R.rock.indexOf(b.d[k]) + 1, 1, 5)]; return b; });
// The dice for everything placed below. Each loop starts from its own place in the sequence (the
// number of rolls that came before it when the map was first laid out), so changing what one loop
// plants does not move what every later loop plants.
const dice = k => rng((2026 + Math.imul(k, 0x6D2B79F5)) >>> 0);
let rand = dice(0);
const open = (x, y) => y > groundLine(x) + 6 && coast(x, y) < -18 && lakeD(x, y) > 1.3 && tarnD(x, y) > 1.4 && !river[at(Math.round(x), Math.round(y))];
// The same question asked of the map as it was first laid out. The loops below ask this one before
// they roll the dice again, and then ask free() whether the spot still suits the map as it is now.
const openWas = (x, y) => y > groundLine(x) + 6 && coast(x, y) < -18 && lakeD(x, y) > 1.3 && tarnD(x, y) > 1.4 && !riverWas[at(Math.round(x), Math.round(y))];
// The river's last stretch to the sea, which nothing may stand in front of.
const mouthPts = riverPts.filter(([px, py]) => coast(px, py) > -44);
// A thing w wide and h tall suits a spot if it is clear of the river, of both footbridges, of the
// board at the junction, and does not hide the river where it reaches the beach.
const free = (x, y, w, h) => open(x, y) && !BRIDGES.some(b => Math.abs(x - b.x) < b.w / 2 + w / 2 + 3 && y > b.y - 9 && y - h < b.y + 9)
  && !(Math.abs(x - KIOSK.x) < 15 + w / 2 && y > KIOSK.y - 30 && y - h < KIOSK.y + 3)
  && !mouthPts.some(([px, py]) => Math.abs(px - x) < w / 2 + 2 && py < y + 2 && py > y - h) && !(mouthFlat(x, y) > 0 && coast(x, y) > -32);
const onIce = (x, y, by) => { const q = glacier(x, y); return q.d < q.w + by; };
const clearOf = (x, y, w, h) => { for (let i = 0; i < trailPts.length; i += 2) { const p = trailPts[i]; if (Math.abs(p[0] - x) < w / 2 + 5 && p[1] > y - h - 3 && p[1] < y + 5) return false; } for (const [cx, cy, rx, ry] of LAKE) if (Math.abs(x - cx) < rx + w / 2 && y > cy - ry && y - h * 0.8 < cy + ry * 0.4) return false; return true; };
// The rainforest, with big-leaf maples turning gold along its trail.
for (let gy = 474; gy < NH + 30; gy += 9) for (let gx = -10; gx < 800; gx += 9) {
  const x = gx + rand() * 9, y = gy + rand() * 9, yy = Math.min(NH - 1, y), fa = forestAmt(clamp(x, 0, NW - 1), yy);
  if (rand() > fa * 0.78 || !openWas(clamp(x, 0, NW - 1), yy)) continue;
  const r = rand(), gold = nearTrail(x, y, 46) && rand() < 0.3 || rand() < 0.04;
  const tree = gold ? null : r < 0.45 ? maples[(rand() * 6) | 0] : r < 0.88 ? spruces[(rand() * 6) | 0] : firs[(rand() * 8) | 0];
  if (!clearOf(x, y, gold ? 26 : tree.w, gold ? 40 : tree.h)) continue;
  const big = gold ? bigleaf[(rand() * 4) | 0] : null;
  if (!free(clamp(x, 0, NW - 1), yy, gold ? 26 : tree.w, gold ? 40 : tree.h)) continue;
  if (gold) putTree(big, x, y); else plant(tree, x, y);
}
// Firs in clumps across the meadows, thinning out where the next biome begins.
rand = dice(27355);
for (let n = 0; n < 1700; n++) {
  const x = 700 + rand() * 700, y = 478 + rand() * 590;
  if (fbm((x - OX) / 60, (y - OY) / 60, 71, 3) < 0.56 || !openWas(x, y) || forestAmt(x, y) > 0.2 || Math.hypot(x - T.x, (y - T.y) * 1.4) < 70 || talus(x, y) > 0.05) continue;
  if (rand() < Math.max(basinAmt(x, y), dryAmt(x, y) * 1.2, burnAmt(x, y) * 1.1)) continue;
  const gl = glacier(x, y, TONGUES_WAS); if (gl.d < gl.w + 8 || (Math.abs(x - SPIRES.x) < 96 && y < SPIRES.y + 4) || !clearOf(x, y, 12, 30)) continue;
  const fir = firs[(rand() * 8) | 0];
  // The Spires may be drawn wider than they are, so their foot is kept clear to either side.
  if (!free(x, y, 12, 30) || onIce(x, y, 8) || (Math.abs(x - SPIRES.x) < 122 && y < 528) || hash(n, 3, 78) < eastAmt(x, y)) continue;
  plant(fir, x, y);
}
// Larches: thick in the basin, thinning into the meadow and the pines, a few down by the Spires camp.
for (let n = 0; n < 1500; n++) {
  const x = 860 + rand() * 690, y = 470 + rand() * 270, ba = basinAmt(x, y), nearCamp = Math.hypot(x - 930, (y - 585) * 1.5) < 70;
  if (!open(x, y) || !(rand() < ba * 0.8 && fbm(x / 40, y / 30, 120, 3) > 0.52 - (1 - ba) * 0.12 && rand() < 0.5 || nearCamp && rand() < 0.07)) continue;
  const gl = glacier(x, y, TONGUES_WAS); if (gl.d < gl.w + 8 || !clearOf(x, y, 14, 34) || (Math.abs(x - SPIRES.x) < 96 && y < SPIRES.y + 4)) continue;
  plant(larches[(rand() * 6) | 0], x, y);
}
for (let n = 0; n < 90; n++) { const x = 1030 + rand() * 500, y = 480 + rand() * 210; if (rand() < basinAmt(x, y) && open(x, y) && glacier(x, y, TONGUES_WAS).d > glacier(x, y, TONGUES_WAS).w + 6) put(slabs[(rand() * 4) | 0], x, y); }
// The dry side: open ponderosa, then sagebrush, then nothing but rock and grass. Where the burn
// reached the pines it left them standing black.
rand = dice(36819);
const pineAt = [], apart = (x, y) => !pineAt.some(([px, py]) => Math.abs(px - x) < 24 && Math.abs(py - y) < 20);
for (let n = 0; n < 760; n++) {
  const x = 1090 + rand() * 470, y = 560 + rand() * 380, da = dryAmt(x, y), sg = sageAmt(x, y);
  if (rand() > da || couleeAmt(x, y) || !openWas(x, y)) continue;
  if (rand() < burnAmt(x, y)) { if (rand() < 0.45) putTree(burnt[(rand() * 4) | 0], x, y); continue; }
  // A ponderosa is planted only where its crown stays clear of the next one's, so they stand as singles and pairs.
  if (rand() < (1 - sg) * 0.3 && fbm(x / 50, y / 40, 121, 3) > 0.42) { const t = pines[(rand() * 5) | 0]; if (apart(x, y)) { pineAt.push([x, y]); plant(t, x, y); } } else if (rand() < 0.2 + sg * 0.6) put(sages[(rand() * 3) | 0], x, y);
}
// The old burn: silver and charred snags standing over young trees, thinning out at its edges.
rand = dice(40145);
for (let n = 0; n < 760; n++) {
  const x = 980 + rand() * 580, y = 770 + rand() * 310; if (rand() > burnAmt(x, y) * 1.1 || !openWas(x, y)) continue;
  const r = rand(); if (r < 0.34) putTree(snags[(rand() * 5) | 0], x, y); else if (r < 0.52) putTree(burnt[(rand() * 4) | 0], x, y); else if (r < 0.7) plant(young[(rand() * 4) | 0], x, y); else if (r < 0.74) layLog(silverLogs[n % 4], x, y, n, 0.5);
}
// The east side between the larches and the burn: aspen in separate groves with open ground between
// them, and ponderosa standing apart on the dry grass. Each kind has dice of its own, so nothing else
// on the map moves when one changes. Each strays into its neighbours, the larches a little way south
// and the snags a little way north, so the three bands run into one another.
{
  const r2 = rng(2703), r3 = rng(2704), r4 = rng(2705), stood = [], groves = [];
  const band = (x, y) => eastAmt(x, y) * smooth(0.6, 0.15, basinAmt(x, y)) * smooth(0.85, 0.2, burnAmt(x, y)) * (1 - 0.8 * sageAmt(x, y));
  const fits = (x, y, w, h, gapX, gapY) => x > 4 && x < NW - 4 && y < NH - 2 && free(x, y, w, h) && clearOf(x, y, w, h) && !couleeAmt(x, y) && !couleeAmt(x, y + 6) && !stood.some(([px, py]) => Math.abs(px - x) < gapX && Math.abs(py - y) < gapY);
  for (let n = 0; n < 600; n++) {
    const cx = 1000 + r2() * 470, cy = 600 + r2() * 330, size = 9 + (r2() * 7 | 0), spread = 6 + r2() * 5, luck = r2();
    // Groves stand closest together under the larches and thin out toward the dry side and the burn.
    const share = band(cx, cy) * (0.1 + 0.9 * smooth(830, 660, cy)) * (1 - 0.75 * smooth(0.15, 0.7, dryAmt(cx, cy))) * smooth(0.6, 0.1, burnAmt(cx, cy));
    const here = luck < share && !groves.some(([gx, gy]) => Math.abs(gx - cx) < 48 && Math.abs(gy - cy) < 32);
    if (here) groves.push([cx, cy]);
    for (let k = 0; k < size; k++) {
      const a = r2() * TAU, d = Math.sqrt(r2()) * spread, x = cx + Math.cos(a) * d * 1.5, y = cy + Math.sin(a) * d * 0.8, t = aspens[(r2() * 7) | 0];
      if (here && fits(x, y, 8, t.h, 5, 3)) { stood.push([x, y]); plant(t, x, y); }
    }
  }
  for (let n = 0; n < 460; n++) {
    const x = 1010 + r3() * 430, y = 600 + r3() * 310, luck = r3(), t = pines[(r3() * 5) | 0];
    if (luck < band(x, y) * (0.02 + 0.2 * dryAmt(x, y)) && apart(x, y) && fits(x, y, 10, t.h, 9, 6)) { stood.push([x, y]); pineAt.push([x, y]); plant(t, x, y); }
  }
  for (let n = 0; n < 320; n++) {
    const x = 1010 + r4() * 500, y = 640 + r4() * 250, luck = r4(), k = r4(), ba = basinAmt(x, y), bu = burnAmt(x, y);
    if (!fits(x, y, 12, 30, 7, 4)) continue;
    if (ba > 0.03 && ba < 0.5 && luck < ba * 0.4) { stood.push([x, y]); plant(larches[(k * 6) | 0], x, y); }
    else if (bu > 0.04 && bu < 0.55 && luck < bu * 0.45) { stood.push([x, y]); putTree(k < 0.6 ? snags[(k * 8) | 0] : burnt[((k - 0.6) * 10) | 0], x, y); }
  }
}
// Boulders, bushes and the odd snag in the open ground.
rand = dice(43068);
const bushes = [0, 1, 2].map(i => makeBush(700 + i, 'huck')).concat([0, 1, 2].map(i => makeBush(710 + i, 'heather')), [0, 1].map(i => makeBush(720 + i, 'green')));
for (let n = 0; n < 300; n++) {
  const x = 560 + rand() * 760, y = 480 + rand() * 590; if (!openWas(x, y) || nearTrail(x, y, 7) || Math.hypot(x - T.x, y - T.y) < 34 || forestAmt(x, y) > 0.3 || rand() < Math.max(burnAmt(x, y), dryAmt(x, y))) continue;
  // A boulder may ride the ice. A bush may not, and neither stands on the way to it.
  const rock = rand() < 0.3, bm = rock ? boulders[(rand() * 6) | 0] : bushes[(rand() * 8) | 0];
  if (!free(x, y, bm.w, bm.h) || track[at(Math.round(x), Math.round(y))] || (!rock && onIce(x, y, 4)) || (Math.abs(x - SPIRES.x) < 122 && y < 528)) continue;
  put(bm, x, y);
}
// The coast: sea stacks, driftwood along the beach, a ferry that crosses outside them, a humpback breaching,
// and jellyfish drifting in the shallows.
rand = dice(44390);
// The sea round the foot of each stack is given a wash line of its own, which the scene moves in
// time with the surf on the beach, and the stack darkens the water in front of it.
for (const [seed, H, Wd, sx, sy] of [[1, 44, 20, 112, 852], [2, 30, 15, 192, 908], [3, 22, 11, 58, 802], [4, 50, 22, 332, 990], [5, 16, 9, 252, 958], [6, 26, 12, 420, 1050]]) {
  things.push({ bm: seaStack(seed, H, Wd), x: sx, y: sy, keep: true });
  const rx = Wd / 2 + 1, ry = 3, cy = sy - ry, reach = H * 0.3 + 4;
  for (let y = cy - 1; y <= sy + reach; y++) for (let x = Math.floor(sx - rx - 8); x <= sx + rx + 8; x++) {
    if (x < 0 || y < SEA.y0 || x >= SEA.w || y >= NH || coast(x, y) < 9) continue;
    // How far outside the rock's foot this spot is, in pixels: under 0 is beneath the rock.
    const e = Math.hypot((x - sx) / rx, (y - cy) / ry), cs = (e - 1) * lerp(ry, rx, Math.abs(x - sx) / rx / Math.max(e, 0.01)), j = (y - SEA.y0) * SEA.w + x;
    if (cs > -4 && cs < 6) { SEA.shore[j] = 1 + Math.round((cs + 4) * 8); SEA.gate[j] = 0; }
    const k = 1 - (y - sy) / reach;
    if (cs >= 0 && y >= sy - 1 && Math.abs(x - sx) < rx * (0.45 + 0.55 * k) && bayer(x, y) < 0.8 * k) g[at(x, y)] = shade(g[at(x, y)]);
  }
}
for (let n = 0; n < 500; n++) {
  const x = rand() * 600, y = 690 + rand() * 390, cs = coast(x, y); if (cs > -3 || cs < -13) continue;
  const len = 6 + rand() * 12, a = (rand() - 0.5) * 0.9 + 0.6;
  for (let k = 0; k < len; k++) { const px = Math.round(x + Math.cos(a) * k), py = Math.round(y + Math.sin(a) * k * 0.5); if (px > 0 && py > 0 && px < NW && py < NH - 1 && !river[at(px, py)] && !river[at(px, py + 1)]) { g[at(px, py)] = R.rock[4]; g[at(px, py + 1)] = R.rock[2]; } }
}
// Eight jellyfish. Eighteen spots are still drawn from the dice, so that everything placed after them
// stands where it always did, and eight of those are kept.
const jelly = [];
for (let n = 0, found = 0; n < 4000 && found < 18; n++) {
  const x = Math.round(rand() * 560), y = Math.round(700 + rand() * 370), cs = coast(x, y); if (cs < 14 || cs > 80 || x < 6 || y > NH - 10) continue;
  if (found++ * 4 % 9 < 4) jelly.push([x, y, jelly.length % 3 ? 0 : 1]);
}
// One drawing of the humpback's breach, or of its flukes going under. The body is a tapered tube along
// a spine that leaves the water at the bitmap's foot and leans to the left, the way it will fall.
// p.out: how much of its length is out, from the snout. p.head, p.tail: how steeply the two ends of
// that stand, in degrees. p.roll: where its belly is turned, 90 for away to the right, 0 for square to
// us. p.sweep: how far back its flippers trail. p.fluke: the tail instead, 0 upright to 1 tipping under.
// Nothing is drawn below the waterline and nothing outlines it there: the scene puts foam along it.
function whale(p) {
  p = p || { out: 0.68, head: 54, tail: 59, roll: 40, sweep: 0.2 };
  const b = new BM(120, 72); b.ox = 84; b.oy = 68;
  const D = Math.PI / 180, navy = R.navy, W1 = R.white[1], W0 = R.white[0], groove = R.rock[3];
  const layer = () => { const l = new BM(b.w, b.h); l.put = (x, y, c) => { if (y <= 0) l.set(b.ox + x, b.oy + y, c); }; return l; };
  // A part goes on over what is there. Its own outline is kept only where it crosses something already
  // drawn, so a white flipper shows against a white belly; the outer edge is inked once at the end.
  const lay = l => { const o = l.d.slice(); outline(l, INK); for (let i = 0; i < o.length; i++) { if (o[i]) b.d[i] = o[i]; else if (l.d[i] && b.d[i]) b.d[i] = INK; } };
  const key = (K, q) => { for (let i = 1; i < K.length; i++) if (q <= K[i][0]) return K[i - 1][1] + (K[i][1] - K[i - 1][1]) * (q - K[i - 1][0]) / (K[i][0] - K[i - 1][0]); return K[K.length - 1][1]; };
  if (p.fluke != null) {
    // The tail from behind as it dives: the stock, and the two flukes with their white undersides.
    const l = layer(), f = p.fluke, H = 15, squash = 1 - 0.7 * f, lean = -0.22;
    for (let y = 0; y <= H; y += 0.5) { const hw = 3.3 - 1.7 * y / H; for (let x = -hw; x <= hw; x += 0.5) l.put(x + lean * y, -y, x < -hw * 0.3 ? navy[2] : x > hw * 0.5 ? navy[0] : navy[1]); }
    const LEAD = [[0, -2], [0.3, -0.6], [0.6, 1.2], [0.85, 3], [1, 4.4]], TRAIL = [[0, 1.6], [0.15, 3.6], [0.4, 5.6], [0.7, 6], [0.9, 5.4], [1, 4.7]];
    for (const side of [-1, 1]) for (let q = 0; q <= 1; q += 0.02) {
      const lo = key(LEAD, q), hi = key(TRAIL, q), x = side * q * 14 + lean * H;
      for (let v = lo; v <= hi; v += 0.25) {
        const y = -H - v * squash + 3.2 * f * q, pale = q > 0.16 && q < 0.86 && v > lo + 1.3 && v < hi - 1.2 && (side < 0 || q < 0.7);
        l.put(x, y, pale ? W1 : v > hi - 1.2 || side > 0 ? navy[1] : navy[2]);
      }
    }
    lay(l); outline(b, INK);
    for (let i = (b.oy + 1) * b.w; i < b.d.length; i++) b.d[i] = 0;
    return b;
  }
  const L = 66, GIRTH = [[0, 0.44], [0.04, 0.62], [0.12, 0.83], [0.25, 0.98], [0.33, 1], [0.5, 0.86], [0.7, 0.52], [0.85, 0.26], [0.93, 0.16], [1, 0.12]];
  // The spine, every half pixel: a stretch of it under the water, so the body is cut level at the
  // waterline however far it leans, then from the waterline up to the snout.
  const n = Math.max(2, Math.ceil(p.out * L * 2)), sp = [];
  for (let i = 44; i > 0; i--) sp.push([Math.cos(p.tail * D) * 0.5 * i, Math.sin(p.tail * D) * 0.5 * i, p.tail * D, Math.min(1, p.out + i * 0.5 / L)]);
  for (let i = 0, x = 0, y = 0; i <= n; i++) { const w = i / n, th = (p.tail + (p.head - p.tail) * w) * D; sp.push([x, y, th, p.out * (1 - w)]); x -= Math.cos(th) * 0.5; y -= Math.sin(th) * 0.5; }
  const tip = sp.length - 1;
  const body = layer();
  for (let y = -70; y <= 0; y++) for (let x = -84; x < 36; x++) {
    let bi = 0, bd = 1e9; for (let i = 0; i <= tip; i++) { const dx = x - sp[i][0], dy = y - sp[i][1], d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = i; } }
    const [px, py, th, s] = sp[bi], r = 8.5 * key(GIRTH, s), nx = Math.sin(th), ny = -Math.cos(th);
    // Past the snout the tube ends in a round nose.
    if (bd > (bi === tip ? r * 0.8 : r) * (bi === tip ? r * 0.8 : r) + 0.3) continue;
    const d = bi === tip ? Math.sign((x - px) * nx + (y - py) * ny) * Math.sqrt(bd) : (x - px) * nx + (y - py) * ny, rr = Math.max(r, Math.abs(d));
    // Where round the body this bit of skin is: 0 at the middle of the belly, 180 on the back.
    const a = Math.asin(d / rr) / D, off = Math.abs(((a - p.roll + 540) % 360) - 180);
    const lit = Math.sin(a * D) * (nx * -0.6 + ny * -0.75) + Math.cos(a * D) * 0.42;
    if (off < (s < 0.6 ? 60 : s < 0.82 ? 60 - (s - 0.6) * 140 : 29)) {
      // The belly: white, with the throat grooves running back from the chin as far as the navel.
      let line = false; if (s > 0.02 && s < 0.56) for (let k = -3; k <= 3 && !line; k++) { const g = (p.roll + k * 20) * D; if (Math.cos(g) > 0.1 && Math.abs(d - r * Math.sin(g)) < 0.5) line = true; }
      body.put(x, y, line ? groove : lit < -0.3 ? W0 : W1);
    } else body.put(x, y, navy[lit > 0.5 ? 2 : lit > -0.05 ? 1 : 0]);
  }
  // The eye, low on the dark of the head just above the corner of the mouth.
  for (const k of [-1, 1]) { const g = (p.roll + k * 86) * D; if (p.out > 0.2 && Math.cos(g) > 0.2) { const e = sp.find(q => q[3] <= 0.15), r = 8.5 * key(GIRTH, 0.15) * Math.sin(g); body.put(e[0] + Math.sin(e[2]) * r, e[1] - Math.cos(e[2]) * r, W1); } }
  // The flippers, a third of its length each: flung wide where they stand out to the side, short where they point at us.
  const flippers = [-1, 1].map(k => {
    if (p.out < 0.36) return null;
    const g = (p.roll + k * 62) * D, e = sp.find(q => q[3] <= 0.3), th = e[2], r = 8.5 * key(GIRTH, 0.3) * Math.sin(g);
    let vx = Math.sin(g) * Math.sin(th) + p.sweep * Math.cos(th), vy = -Math.sin(g) * Math.cos(th) + Math.cos(g) * 0.3 + p.sweep * Math.sin(th);
    const len = Math.hypot(vx, vy), reach = 22 * clamp(len, 0.5, 1) * smooth(0.36, 0.5, p.out); vx /= len; vy /= len;
    const l = layer();
    for (let q = 0; q <= 1; q += 0.5 / reach) {
      const bow = 2.2 * Math.sin(Math.PI * q) * k, cx = e[0] + Math.sin(th) * r + vx * reach * q - vy * bow, cy = e[1] - Math.cos(th) * r + vy * reach * q + vx * bow;
      const hw = (q < 0.12 ? 1.3 + 9 * q : 2.4 - 1.3 * q) + (Math.abs(frac(q * 4.2) - 0.5) < 0.14 ? 0.5 : 0);
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (dx * dx + dy * dy <= hw * hw) l.put(Math.round(cx) + dx, Math.round(cy) + dy, (dx * vy - dy * vx) * k > hw * 0.45 ? W0 : W1);
    }
    return { l, front: Math.cos(g) > 0 };
  });
  for (const f of flippers) if (f && !f.front) lay(f.l);
  lay(body);
  for (const f of flippers) if (f && f.front) lay(f.l);
  outline(b, INK);
  for (let i = (b.oy + 1) * b.w; i < b.d.length; i++) b.d[i] = 0;
  return b;
}
plant(firs[2], ISLE.x, ISLE.y + 1);
// Where the things stand that the scene draws itself, because they move or can be clicked.
const spots = {
  tents: [[924, 564, 'tent'], [948, 574, 'red']], signpost: [T.x - 4, T.y - 8],
  kiosk: [KIOSK.x, KIOSK.y],
  // The two ends of the ferry's course, both past the edge of the map, and the whale's spot.
  ferry: [[-30, 820], [394, 1108]], whale: [150, 912],
  // Each sign stands on the ground it names; content.js has the words. Whatever would stand in front of one is cleared below.
  signs: [[990, 561, 'scope-creep'], [858, 557, 'segfault'], [898, 540, 'merge-conflict'], [800, 742, 'yak-shave'], [766, 631, 'about-lake'], [1160, 600, 'rollback'], [1300, 552, 'feature-flag'], [1226, 884, 'hotfix'], [1420, 966, 'postmortem'], [1474, 724, 'cron-job'], [1506, 806, 'tech-debt'], [264, 857, 'cache-miss'], [334, 612, 'stack-trace'], [262, 480, 'off-by-one'], [470, 480, 'dependency'], [668, 586, 'monorepo'], [452, 1036, 'latency']],
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
// The board at the junction is cleared the same way, and it is wider.
const clearSigns = () => { for (const [sx, sy, , half = 7] of spots.signs.concat([[KIOSK.x, KIOSK.y, 'kiosk', 15]])) for (let i = things.length - 1; i >= 0; i--) {
  const th = things[i], w = th.tree ? th.tree.w : th.bm.w, h = th.tree ? th.tree.h : th.bm.h;
  if (!th.keep && th.y > sy - 3 && th.y - h < sy + 1 && Math.abs(th.x - sx) < w / 2 + half) things.splice(i, 1);
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
rand = dice(45696);
const ferns = Array.from({ length: 6 }, (_, i) => makeFern(400 + i));
for (let n = 0; n < 3400; n++) { const x = rand() * 790, y = 478 + rand() * 600; if (y >= NH || forestAmt(x, y) < 0.6 || !openWas(x, y) || nearTrail(x, y, 4)) continue; const fern = ferns[(rand() * 6) | 0]; if (free(x, y, 11, 7)) things.push({ bm: fern, x: Math.round(x), y: Math.round(y), fern: true }); }
rand = dice(54247);
for (let n = 0; n < 60; n++) {
  const x = rand() * 760, y = 490 + rand() * 560; if (forestAmt(x, y) <= 0.7 || !open(x, y) || nearTrail(x, y, 9)) continue;
  // A log lies under the trees. Out in a clearing only one in three is kept, and none by the river.
  const cover = things.filter(th => th.tree && Math.abs(th.x - x) < 26 && Math.abs(th.y - y) < 18).length;
  if (!riverPts.some(([px, py]) => Math.hypot(px - x, py - y) < 46)) layLog(logs[n % 6], x, y, n, cover < 2 ? 0.34 : 1);
}
clearSigns();
// Mist drifts through the deep forest, thickest in the west, and a fog bank stands off the coast. It
// moves, so the scene draws it each frame (critters.js). Kept here is only where it may not lie, on a
// grid of two pixels: 1 where it stays thin, along the trail and just in from the beach, and 2 where
// there is none at all, over a sign's board (so the board can be read) and out past the beach.
const mist = { x1: 640, y0: 440, w: 320, h: Math.ceil((NH - 440) / 2) };
mist.gate = new Uint8Array(mist.w * mist.h);
{
  const mark = (x0, y0, x1, y1, v, round) => { const mx = (x0 + x1) / 2, my = (y0 + y1) / 2; for (let cy = Math.max(0, (y0 - mist.y0) >> 1); cy <= Math.min(mist.h - 1, (y1 - mist.y0) >> 1); cy++) for (let cx = Math.max(0, x0 >> 1); cx <= Math.min(mist.w - 1, x1 >> 1); cx++) if (mist.gate[cy * mist.w + cx] < v && (!round || sq((cx * 2 + 1 - mx) / (x1 - mx)) + sq((mist.y0 + cy * 2 + 1 - my) / (y1 - my)) <= 1)) mist.gate[cy * mist.w + cx] = v; };
  // The mist stops short of the beach, a little further in on some rows than on others so that its
  // seaward edge is not a straight cut. The shoreline is found on a coarser grid across, which is all it needs.
  for (let cy = 0; cy < mist.h; cy++) for (let cx = 0; cx < mist.w; cx += 2) { const y = Math.min(NH - 1, mist.y0 + cy * 2 + 1), cs = coast(cx * 2 + 2, y) + 16 * vnoise(y / 6, 5, 135), v = cs > -10 ? 2 : cs > -42 ? 1 : 0; if (v) { mist.gate[cy * mist.w + cx] = v; mist.gate[cy * mist.w + cx + 1] = v; } }
  for (let i = 0; i < trailPts.length; i += 2) { const p = trailPts[i]; if (p[0] < mist.x1 + 12) mark(Math.round(p[0]) - 7, Math.round(p[1]) - 8, Math.round(p[0]) + 7, Math.round(p[1]) + 6, 1, true); }
  for (const [sx, sy] of spots.signs) mark(sx - 14, sy - 24, sx + 14, sy + 6, 2, true);
}
return { raw, baked: !!baked, g, things, spots, mist, sea: SEA, trackPts, trackPix, trails: TRAILS, forestAmt, lakeD, coast, groundLine, glacier, talus, open, nearTrail, make: { ferry, whale, sheep, squirrel } };
}
export { OX, OY, NW, NH, T, PEAK, STACK, SPIRES, KIOSK };
