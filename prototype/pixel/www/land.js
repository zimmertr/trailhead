// Round 4's map (ROUND4.md, section 4a), for the scene and for relief.html, which shows it whole.
// The world is a height for every spot (u east, v away from the camera). A spot is drawn at screen
// (u, SY - v - height), nearest first, so ground and mountains are one surface and near slopes hide
// far ones.
import { R, INK, KIND, SHADE, RAMP_OF, veilTable, TAU, clamp, lerp, smooth, frac, sq, rng, hash, vnoise, fbm, bayer, pick, catmull } from './core.js';
import { blobTree, seaStack, sageBush, charred } from './scenery.js';
import { ferry, whale, sheep, squirrel } from './mapfauna.js';
import { makeMaple, makeAspen, makePonderosa, makeSpruce, makeFir, makeConifer, makeSnag, makeBoulder, makeBush, makeFern, makeLog } from './sprites.js';

const NW = 1920, SH = 1080, VD = 740, SY = SH + 52;
const rdg = n => 1 - Math.abs(2 * n - 1);
const prof = pts => x => { if (x <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [xa, ha] = pts[i - 1], [xb, hb] = pts[i]; return lerp(ha, hb, (x - xa) / (xb - xa)); } return pts[pts.length - 1][1]; };

export { NW, SH as NH, VD, SY };
export function buildLand() {
// ---- the pieces a layout is made of ---------------------------------------------------------------
const F = [], C = { lakes: [], trails: [] };
// While lift is set, a piece's heights are measured from that ground and not from sea level.
let lift = null;
const add = (mat, u0, u1, v0, v1, fn) => { const l = lift; F.push({ mat, u0, u1, v0, v1, fn: l ? (u, v) => { const h = fn(u, v); return h > 0 ? h + l(u, v) : 0; } : fn }); };
// A single mountain: a cone with a rough foot, jagged if asked.
const horn = (mat, cu, cv, ru, rv, H, o = {}) => add(mat, cu - ru * 1.1, cu + ru * 1.1, cv - rv * 1.1, cv + rv * 1.1, (u, v) => {
  const d = Math.hypot((u - cu) / ru, (v - cv) / rv) + 0.12 * (vnoise(u / 14, v / 14, cu) - 0.5); if (d >= 1) return 0;
  return H * Math.pow(1 - d, o.pow || 0.9) * (1 + (o.jag || 0) * (rdg(vnoise(u / 9, v / 11, cu + 7)) - 0.5));
});
// A range: a ridge running east and west at one depth, whose skyline is a row of blunt pyramids of
// uneven height. env gives the height wanted at each u.
function range(mat, u0, u1, cv, env, seed, o = {}) {
  const r = rng(seed), peaks = [], D = o.front || 56, B = o.back || 40;
  for (let cx = u0; cx <= u1;) { const h = env(cx) * (0.8 + 0.4 * r()), w = h * ((o.wide || 0.55) + 0.3 * r()); peaks.push([cx, h, w * (0.8 + 0.4 * r()), w * (0.8 + 0.4 * r()), 3 + 6 * r()]); cx += w * (0.7 + 0.5 * r()); }
  const high = u => { let best = 0; for (const [cx, h, wl, wr, cap] of peaks) { const t = Math.max(0, Math.abs(u - cx) - cap / 2) / (u < cx ? wl : wr); if (t < 1) best = Math.max(best, h * (1 - Math.pow(t, o.pow || 1.1))); } return best <= 0 ? 0 : Math.max(0, best + (o.jag || 4) * (sq(rdg(vnoise(u / 4, seed, 811))) - 0.5)); };
  add(mat, u0 - 110, u1 + 110, cv - D - 14, cv + B + 8, (u, v) => { const hi = high(u); if (hi <= 0) return 0; const vv = v + 10 * (vnoise(u / 11, seed, 830) - 0.5), f = vv < cv ? (vv - (cv - D)) / D : (cv + B - vv) / B; return f <= 0 ? 0 : hi * Math.pow(f, 0.75); });
}
// A level with a steep edge: a bench, a basin floor, a mesa, a field of ice. tilt lifts its far side.
const plateau = (mat, cu, cv, ru, rv, H, edge = 0.1, tilt = 0) => add(mat, cu - ru * 1.4, cu + ru * 1.4, cv - rv * 1.4, cv + rv * 1.4, (u, v) => (H + tilt * (v - cv)) * smooth(1 + edge, 1, Math.hypot((u - cu) / ru, (v - cv) / rv) + 0.16 * (vnoise(u / 30, v / 20, cu + 3) - 0.5)));
// A ridge along a line of points [u, v, height, half-width]: a moraine, an arm of a mountain.
function spur(mat, pts, pow = 1.2) {
  const us = pts.map(p => p[0]), vs = pts.map(p => p[1]), W = Math.max(...pts.map(p => p[3])) + 6;
  add(mat, Math.min(...us) - W, Math.max(...us) + W, Math.min(...vs) - W, Math.max(...vs) + W, (u, v) => {
    let best = 0; const n = 5 * (vnoise(u / 7, v / 7, us[0]) - 0.5);
    for (let i = 1; i < pts.length; i++) { const [u0, v0, h0, w0] = pts[i - 1], [u1, v1, h1, w1] = pts[i], du = u1 - u0, dv = v1 - v0, t = clamp(((u - u0) * du + (v - v0) * dv) / (du * du + dv * dv), 0, 1), d = Math.hypot(u - u0 - du * t, v - v0 - dv * t) + n, w = lerp(w0, w1, t); if (d < w) best = Math.max(best, lerp(h0, h1, t) * Math.pow(1 - Math.max(0, d) / w, pow)); }
    return best;
  });
}
// Mount Monolith, after Rainier: a dome with a nearly flat top, a shoulder to the west and a small
// dark tooth low on the east flank. Its lower slopes run out into the land round it.
let VOLC = null;
const VP = prof([[0, 1], [0.07, 0.985], [0.14, 0.94], [0.25, 0.8], [0.4, 0.58], [0.55, 0.4], [0.7, 0.25], [0.85, 0.11], [1, 0]]);
// Its skyline from the south, as drawn for the first block-in: [offset from the summit, height].
const VS = prof([[-236, 0], [-208, 0.09], [-176, 0.22], [-146, 0.38], [-118, 0.54], [-96, 0.67], [-80, 0.76], [-70, 0.815], [-62, 0.845], [-54, 0.85], [-48, 0.875], [-40, 0.93], [-32, 0.96], [-24, 0.975], [-16, 0.965], [-8, 0.985], [0, 1], [8, 0.995], [16, 0.98], [24, 0.985], [32, 0.96], [42, 0.92], [54, 0.87], [64, 0.85], [72, 0.78], [90, 0.67], [108, 0.585], [118, 0.56], [124, 0.585], [128, 0.6], [133, 0.545], [146, 0.47], [170, 0.33], [200, 0.18], [228, 0.07], [252, 0]]);
// The ribs of rock (cleavers) that fan down from below the summit dome, with a glacier between each
// pair. t is 1 on a rib's crest and 0 in the middle of a glacier; each rib has its own strength (amp)
// and they wander a little as they come down, so no two are alike.
function vrelief(u, v) {
  const { cu, cv, ru, rv } = VOLC, du = (u - cu) / ru, dv = (v - cv) / rv, d = Math.hypot(du, dv), a = Math.atan2(dv, du);
  const fan = a * 13 / TAU + 0.5 * (vnoise(du * 3 + 5, dv * 3 + 5, 571) - 0.5) + 0.35 * d * Math.sin(2 * a), k = Math.floor(fan);
  return { d, k, t: 1 - Math.abs(frac(fan) - 0.5) * 2, amp: 0.55 + 0.9 * hash(k & 15, 3, 572), face: Math.abs(Math.sin(a)) };
}
function volcano(cu, cv, ru, rv, H) {
  VOLC = { cu, cv, ru, rv, H };
  add('volc', cu - ru, cu + ru, cv - rv, cv + rv, (u, v) => {
    const du = (u - cu) / ru, dv = (v - cv) / rv, d = Math.hypot(du, dv) + 0.04 * (vnoise(u / 40, v / 40, 559) - 0.5); if (d >= 1) return 0;
    // A round dome, stretched column by column so that what shows against the sky is the drawn outline.
    const round = VP(Math.abs(du)), want = VS((u - cu) * 250 / ru), fit = round > 0.06 ? clamp(want / round, 0.55, 1.5) : 1;
    const Q = vrelief(u, v), rib = 0.07 * smooth(0.12, 0.3, Q.d) * smooth(0.98, 0.72, Q.d) * Q.amp * (Math.pow(Q.t, 3) - 0.25);
    return H * VP(Math.max(0, d)) * lerp(1, fit, smooth(0.9, 0.3, Math.abs(dv))) * (1 + rib + 0.03 * (vnoise(u / 18, v / 18, 560) - 0.5));
  });
}
// Sideproject Spires, after the Southern Pickets: one wall with six blunt summits, in the order of
// the projects from west to east. It rises from the cirque at its foot; buttresses stand forward.
let SP = null;
// Snow gullies up the wall to the notches between the summits: [offset, how high it reaches, a number to tell them apart].
const GULLY = [[-80, 0.46, 1], [-40, 0.7, 0], [-9, 0.6, 2], [60, 0.56, 1]];
const SUMMITS = [[-94, 0.66, 26, 30, 8], [-60, 0.84, 24, 20, 5], [-24, 1, 26, 22, 9], [10, 0.86, 18, 20, 5], [42, 0.95, 22, 26, 8], [82, 0.7, 24, 34, 10]];
function spires(cu, cv, base, H, thin = 1, wide = 1) {
  SP = { cu, cv, base, H, wide, top: cu + SUMMITS[2][0] * wide, west: SUMMITS[0][0] };
  const high = dx => {
    let best = H * (0.28 + 0.2 * smooth(160, 90, Math.abs(dx)));
    SUMMITS.forEach(([o, hh, wl, wr, cap], k) => { const u = Math.max(0, Math.abs(dx - o) - cap / 2) / (dx < o ? wl : wr), v = H * hh * (1 - 0.3 * Math.pow(u, 1.05)) - (dx - o) * (k & 1 ? 0.12 : -0.1) * (u === 0 ? 1 : 0); if (u < 2 && v > best) best = v; });
    return (best + (5 * sq(rdg(vnoise(dx / 4, 6, 811))) - 2.5 - 9 * smooth(0.74, 0.92, vnoise(dx / 6, 7, 812))) * smooth(0.3, 0.5, best / H)) * smooth(165, 120, Math.abs(dx));
  };
  add('wall', cu - 170 * wide, cu + 170 * wide, cv - 70, cv + 50, (u, v) => {
    const dx = (u - cu) / wide, vv = v + 9 * (vnoise(u / 10, 3, 830) - 0.5) + 7 * Math.max(...SUMMITS.map(([o]) => Math.max(0, 1 - Math.abs(dx - o) / 14)));
    const f = vv < cv ? smooth(cv - 36 * thin, cv - 4, vv) : smooth(cv + 44 * thin, cv, vv);
    return f <= 0 ? 0 : base * smooth(0, 0.3, f) * smooth(165, 120, Math.abs(dx)) + high(dx) * Math.pow(f, 0.7);
  });
}
// Proficiency Peak, after Prusik Peak's south face: a thin fin of granite that shows the camera its
// wall. A lower flat-topped tower on the left, a prow to a small summit block, a serrated ridge right.
let PF = null;
const PP = prof([[-75, 0], [-70, 0.14], [-63, 0.2], [-58, 0.34], [-51, 0.4], [-46, 0.58], [-41, 0.63], [-31, 0.62], [-27, 0.53], [-22, 0.62], [-16, 0.8], [-9, 0.9], [-5, 0.97], [-3, 1], [3, 1], [5, 0.94], [10, 0.9], [15, 0.8], [21, 0.76], [24, 0.68], [29, 0.71], [33, 0.6], [39, 0.62], [44, 0.5], [50, 0.53], [55, 0.4], [61, 0.36], [66, 0.2], [75, 0]]);
function proficiency(cu, cv, base, w, hgt) {
  PF = { cu, cv, base, w, hgt };
  add('fin', cu - w / 2 - 2, cu + w / 2 + 2, cv - 12, cv + 62, (u, v) => { const p = PP((u - cu) * 150 / w), f = v < cv ? smooth(cv - 8, cv, v) : smooth(cv + 58, cv + 10, v); return p <= 0 || f <= 0 ? 0 : base * smooth(0, 0.4, f) + (hgt * p + 2 * (vnoise(u / 3, 4, 900) - 0.5)) * f; });
}

// ---- the layout (ROUND4.md, section 4a) -----------------------------------------------------------
// Above 0 is sea: the shore cuts the bottom-left corner.
const coast = (u, v) => (440 - v) - u * 0.936 + 26 * Math.sin(u / 95) + 44 * (fbm(u / 80, v / 80, 80, 3) - 0.5);
// The dry country fills the bottom-right corner behind one slanted, uneven edge, the way the sea
// fills the bottom-left. Above 0 is dry; it grows drier toward the corner.
const dryS = (u, v) => (u - 1380) / 540 - v / 430 + 0.4 * (fbm(u / 150, v / 120, 207, 3) - 0.5);
const dryAmt = (u, v) => smooth(-0.04, 0.2, dryS(u, v)), sageAmt = (u, v) => smooth(0.28, 0.55, dryS(u, v)), eastAmt = (u, v) => smooth(-0.5, -0.05, dryS(u, v));
// Low ridges through the rainforest, one behind another, with hollows between them for the fog to
// lie in. They run mostly east and west, so each one carries a rank of trees across the picture.
const RA = 32, ridges = (u, v) => RA * rdg(fbm((v + 0.25 * u) / 85, u / 260, 31, 2)) * smooth(-24, -110, coast(u, v)) * (1 - 0.45 * smooth(600, 730, v) * smooth(420, 300, u));
const wet = (u, v, e) => smooth(e + 130, e - 110, u);
const edgeE = 590, crestH = (c, a, b) => u => a + b * Math.exp(-sq((u - c) / 150));
Object.assign(C, { T: [1075, 310], PK: [660, 440, 210, 110], PK2: [985, 482, 78, 52], LB: [1610, 566, 330, 110], camp: [1022, 526] });
// The Trailhead stands on a low, broad rise: the divide between the water that runs west to the sea
// and the water that runs east into the dry country. The whole land tilts gently toward the camera.
const divU = v => 1075 + (310 - v) * 0.22;
const regional = (u, v) => (8 + 0.02 * v + 10 * Math.exp(-sq((u - divU(v)) / 250))) * smooth(-8, -150, coast(u, v));
// The dry country is a basalt tableland that rises out of the meadow.
const plate = (u, v) => 34 * smooth(0.02, 0.4, dryS(u, v)) + 10 * fbm(u / 80, v / 60, 33, 2) * dryAmt(u, v);
// The glacier: where its middle runs, how wide it is and how high its surface stands, by depth. It
// starts under the Spires' wall, breaks over a rock step (the icefall) and runs out as a tongue.
const GL = { top: 616, toe: 503, fall: [556, 578], cu: v => 1072 + 7 * Math.sin((v - 500) / 24), w: v => lerp(30, 112, smooth(522, 592, v)) * smooth(501, 516, v), h: v => 28 + 0.3 * (v - 500) + 10 * smooth(556, 576, v) };
const glD = (u, v) => Math.abs(u - GL.cu(v)) + 6 * (vnoise(u / 9, v / 9, 9) - 0.5);
// Between the volcano and the granite the whole ground climbs to the foot of the Spires, so the crest
// is one mass with its neighbours. The glacier's bed is cut into it.
const zone = u => smooth(830, 930, u) * smooth(1330, 1250, u);
const apron = (u, v) => {
  const a = 0.34 * Math.max(0, Math.min(v, 624) - 432 - 16 * (fbm(u / 70, 3, 301, 2) - 0.5)) * zone(u) * smooth(712, 660, v); if (a <= 0) return 0;
  const cut = v > GL.toe - 6 && v < GL.top + 8 ? smooth(GL.w(v) + 22, GL.w(v) - 8, glD(u, v)) : 0;
  return Math.max(1, a + 9 * (fbm(u / 44, v / 40, 302, 3) - 0.5) * smooth(440, 500, v) - 12 * cut);
};
const under = (u, v) => regional(u, v) + 0.11 * Math.max(0, v - 400) * smooth(480, 640, u) * (1 - zone(u)) + ridges(u, v) * wet(u, v, 590) + plate(u, v);
const base = (u, v) => under(u, v) + apron(u, v);
// Forested foothills in front of the Legacy Range. The rainforest's valley runs up between them and
// the volcano.
for (const [cu, cv, ru, rv, H] of [[150, 600, 170, 80, 58], [40, 690, 150, 60, 30], [296, 704, 110, 50, 30], [250, 520, 120, 60, 38]]) horn('land', cu, cv, ru, rv, H, { pow: 1.2 });
volcano(640, 600, 300, 150, 262);
// Foothills round the volcano's foot, so it rises out of forest and not off a lawn.
for (const [cu, cv, ru, rv, H] of [[500, 478, 96, 44, 42], [770, 474, 84, 40, 38], [858, 530, 70, 52, 46], [420, 540, 80, 52, 44]]) horn('land', cu, cv, ru, rv, H, { pow: 1.15 });
plateau('land', 640, 436, 112, 34, 30, 0.1);
C.lakes.push([640, 440, 46, 14, 'lake']);
range('crest', 770, NW + 60, 716, u => 112 + 20 * vnoise(u / 70, 1, 64), 64, { front: 40, back: 18 });
range('crest', 800, 930, 660, crestH(1070, 120, 60), 61);
lift = under; spires(1070, 648, 70, 115, 1, 1.2); lift = null;
range('crest', 1232, 1300, 664, crestH(1070, 120, 60), 62);
range('crest', 1336, NW + 40, 676, u => (112 + 24 * vnoise(u / 90, 2, 65)) * (1 - 0.42 * Math.exp(-sq((u - 1430) / 90))), 63, { pow: 1.25, jag: 6, front: 50 });
lift = under;
add('ice', 940, 1204, GL.toe - 2, GL.top + 6, (u, v) => { const w = GL.w(v), d = glD(u, v); return v < GL.toe || v > GL.top + 4 || d >= w ? 0 : GL.h(v) - 6 * sq(d / w) - 8 * smooth(GL.toe + 8, GL.toe, v); });
// What holds the ice in: rock arms of the Spires high up, a moraine on each side lower down. Each
// stands above the ice at its edge and runs out into the slope beyond.
const rim = hi => (u, v) => {
  if (v < GL.toe - 4 || v > GL.top + 10 || (v >= 548) !== hi) return 0;
  const out = glD(u, v) - GL.w(v), wide = lerp(30, 84, smooth(540, 600, v)); if (out < -5 || out > wide) return 0;
  return lerp(GL.h(v) + lerp(7, 30, smooth(520, 610, v)), apron(u, v), Math.pow(clamp(out / wide, 0, 1), 0.8));
};
add('moraine', 930, 1214, GL.toe - 4, 548, rim(false)); add('land', 880, 1264, 548, GL.top + 10, rim(true));
// The moraine across the glacier's toe, with the milky tarn behind it, and the shelf base camp is on.
spur('moraine', [[1036, 506, 33, 13], [1052, 490, 29, 13], [1080, 483, 27, 13], [1106, 489, 29, 13], [1120, 505, 33, 13]]);
plateau('moraine', 1020, 526, 22, 8, 44, 0.35);
lift = null;
C.lakes.push([1080, 496, 13, 4, 'silt']);
// The granite country: three steps. Larches from the second step up, Proficiency Peak on the second.
plateau('gran', 1745, 598, 150, 42, 110, 0.08); plateau('gran', 1471, 574, 205, 50, 84, 0.08);
plateau('land', 1446, 480, 215, 50, 46, 0.1); plateau('land', 1712, 492, 150, 38, 54, 0.1);
proficiency(1430, 594, 84, 164, 132);
// Tarns: milky on the top step, turquoise on the second, clear on the first.
C.lakes.push([1790, 592, 16, 5, 'milk'], [1702, 600, 20, 6, 'milk'], [1752, 620, 12, 4, 'milk'], [1558, 582, 14, 5, 'tarn'], [1498, 550, 18, 6, 'tarn'], [1346, 572, 22, 7, 'tarn'], [1438, 480, 13, 4, 'pond'], [1562, 488, 15, 5, 'pond']);
// Where water starts. Each has a first stretch drawn by hand (off a lake, over a lip, tarn to tarn),
// after which it finds its own way downhill. w is how much water it carries.
C.src = [
  { w: 3, lead: [[678, 434], [690, 420], [697, 406], [701, 392]] },
  { w: 2, lead: [[1082, 493], [1083, 484]] },
  { w: 0.6, lead: [[952, 536], [950, 520]] },
  { w: 0.8, lead: [[806, 512], [812, 498]] },
  { w: 1, lead: [[392, 668], [398, 650]] },
  { w: 1.6, lead: [[1790, 590], [1745, 588], [1702, 598], [1668, 588], [1632, 578], [1596, 582], [1558, 580], [1528, 566], [1498, 552], [1480, 544], [1466, 524], [1458, 506], [1438, 482], [1424, 462], [1420, 442]] },
  { w: 0.6, lead: [[1562, 486], [1540, 470], [1524, 452], [1516, 436]] },
  { w: 0.5, lead: [[1346, 568], [1336, 548], [1326, 530]] }
];
// Shallow valleys for it to find, either side of the Trailhead's rise, and the coulee that takes the
// east creek out through the dry country.
C.dig = [
  { d: 6, w: 46, pts: [[1086, 474], [1062, 442], [1014, 406], [988, 366], [934, 338], [906, 292], [852, 262], [800, 268], [748, 232], [692, 216], [642, 176], [586, 166], [522, 130], [472, 96], [412, 86], [352, 60]], end: 0.5 },
  { d: 5, w: 40, pts: [[701, 388], [714, 360], [746, 326], [772, 292], [800, 268]] },
  { d: 6, w: 46, pts: [[1420, 440], [1386, 400], [1332, 372], [1302, 330], [1322, 286], [1376, 262], [1440, 250], [1500, 232]], end: 11 }
];
C.coulee = [[1500, 232], [1556, 204], [1612, 176], [1662, 130], [1726, 106], [1782, 64], [1852, 40], [1926, 8]];
C.trails = [
  [[1075, 310], [1030, 326], [985, 346], [940, 366], [905, 384], [880, 392], [830, 388], [770, 386], [725, 384], [700, 384], [668, 380], [630, 376], [590, 378], [540, 390], [490, 384], [440, 360], [390, 354], [340, 370], [300, 410], [270, 450], [262, 490], [290, 520], [330, 530], [380, 515], [420, 500], [460, 492], [496, 470], [530, 448], [560, 436], [590, 434], [640, 424], [676, 420], [712, 424], [748, 426], [772, 414], [800, 402], [840, 394], [880, 392]],
  [[1075, 310], [1062, 344], [1038, 378], [1004, 410], [978, 438], [962, 462], [984, 482], [1004, 498], [1018, 512], [1022, 526], [1040, 534], [1056, 546], [1066, 560], [1070, 578], [1068, 600]],
  [[1075, 310], [1132, 318], [1192, 332], [1250, 352], [1300, 378], [1340, 410], [1372, 436], [1392, 450], [1378, 462], [1402, 474], [1422, 500], [1436, 518], [1420, 528], [1440, 538], [1424, 548], [1436, 578]]
];
const [TU, TV] = C.T;

// ---- heights --------------------------------------------------------------------------------------
const MATS = ['land', 'volc', 'crest', 'wall', 'ice', 'moraine', 'gran', 'fin'], hg = new Float32Array(NW * VD), mg = new Uint8Array(NW * VD), at = (u, v) => v * NW + u;
for (let v = 0; v < VD; v++) for (let u = 0; u < NW; u++) hg[at(u, v)] = coast(u, v) > 0 ? 0 : Math.max(0, base(u, v));
for (const f of F) { const m = MATS.indexOf(f.mat); for (let v = Math.max(0, Math.floor(f.v0)); v < Math.min(VD, f.v1); v++) for (let u = Math.max(0, Math.floor(f.u0)); u < Math.min(NW, f.u1); u++) { const h = f.fn(u, v), i = at(u, v); if (h > hg[i]) { hg[i] = h; mg[i] = m; } } }
const hAt = (u, v) => hg[at(clamp(Math.round(u), 0, NW - 1), clamp(Math.round(v), 0, VD - 1))];
// A valley's line is bent as it goes, so no reach of it is ruled. Its two ends stay where they are.
const wander = (all, amp, seed) => { let len = 0; const total = all.reduce((t, p, n) => t + (n ? Math.hypot(p[0] - all[n - 1][0], p[1] - all[n - 1][1]) : 0), 0); return all.map(([u, v], n) => { if (n) len += Math.hypot(u - all[n - 1][0], v - all[n - 1][1]); const a = all[Math.max(0, n - 4)], b = all[Math.min(all.length - 1, n + 4)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, k = amp * (2 * vnoise(len / 70, seed, 77) - 1 + 0.5 * Math.sin(len / 26 + seed)) * smooth(0, 50, len) * smooth(total, total - 50, len); return [u - (b[1] - a[1]) / l * k, v + (b[0] - a[0]) / l * k * 0.6]; }); };
for (const g of C.dig) g.line = wander(catmull(g.pts), 16, g.pts.length);
// Valleys: the ground is lowered along a line, most in the middle.
for (const { d, w, line } of C.dig) {
  const k = new Float32Array(NW * VD);
  for (const [pu, pv] of line) for (let dv = -w; dv <= w; dv++) for (let du = -w; du <= w; du++) { const u = Math.round(pu + du), v = Math.round(pv + dv), dd = Math.hypot(du, dv); if (dd < w && u >= 0 && v >= 0 && u < NW && v < VD) k[at(u, v)] = Math.max(k[at(u, v)], sq(1 - dd / w)); }
  for (let i = 0; i < k.length; i++) if (k[i] && MATS[mg[i]] === 'land' && hg[i] > 0) hg[i] = Math.max(0.5, hg[i] - d * k[i]);
}
// Then each is cut to an even grade from its start to its end, so the way out never climbs: this is
// what takes the west river through the forest's ridges.
for (const { line, end } of C.dig) {
  const all = line, h0 = hAt(all[0][0], all[0][1]), last = all[all.length - 1], h1 = end ?? hAt(last[0], last[1]);
  all.forEach(([pu, pv], n) => { if (n % 2) return; const bed = lerp(h0, h1, n / (all.length - 1)); for (let dv = -56; dv <= 56; dv++) for (let du = -56; du <= 56; du++) { const u = Math.round(pu + du), v = Math.round(pv + dv); if (u < 0 || v < 0 || u >= NW || v >= VD) continue; const i = at(u, v); if (MATS[mg[i]] !== 'land' || hg[i] <= 0) continue; const t = Math.max(0.5, bed + Math.max(0, Math.hypot(du, dv) - 12) * 0.2); if (hg[i] > t) hg[i] = t; } });
}
// The coulee: a flat floor, a cliff, a bench, a second cliff. It deepens as the tableland rises.
{ const all = catmull(C.coulee); all.forEach(([pu, pv], n) => { const floor = lerp(11, 2.5, n / (all.length - 1)); for (let dv = -44; dv <= 44; dv++) for (let du = -44; du <= 44; du++) { const u = Math.round(pu + du), v = Math.round(pv + dv); if (u < 0 || v < 0 || u >= NW || v >= VD) continue; const d = Math.hypot(du, dv) + 9 * (fbm(u / 23, v / 23, 440, 2) - 0.5), rise = d < 13 ? 0 : d < 18 ? 14 * (d - 13) / 5 : d < 33 ? 14 + (d - 18) * 0.07 : d < 39 ? 15 + 15 * (d - 33) / 6 : 1e9; if (hg[at(u, v)] > floor + rise) hg[at(u, v)] = floor + rise; } }); }
// Still water is level, so a lake flattens the ground under it to the height of its shore.
const ISLE = [C.lakes[0][0] - 14, C.lakes[0][1] + 3], isle = (u, v) => Math.hypot((u - ISLE[0]) / 7, (v - ISLE[1]) / 3.2);
const lakeRim = (u, v) => { for (const [cu, cv, ru, rv, kind] of C.lakes) { const d = Math.hypot((u - cu) / ru, (v - cv) / rv) + 0.16 * (vnoise(u / 9, v / 5, 4) - 0.5); if (d >= 1 && d < 1 + 2.2 / Math.min(ru, 8 * rv)) return kind; } return null; };
const lakeAt = (u, v) => { for (const [cu, cv, ru, rv, kind] of C.lakes) if (Math.hypot((u - cu) / ru, (v - cv) / rv) + 0.16 * (vnoise(u / 9, v / 5, 4) - 0.5) < 1) return kind; return null; };
for (const [cu, cv, ru, rv] of C.lakes) { const lv = hAt(cu, cv - rv); for (let v = Math.floor(cv - rv - 2); v <= cv + rv + 2; v++) for (let u = Math.floor(cu - ru - 2); u <= cu + ru + 2; u++) if (lakeAt(u, v)) hg[at(u, v)] = lv; }
// ---- water finds its own way ----------------------------------------------------------------------
// Every spot drains to a lower neighbour. Hollows are filled first, by flooding inward from the sea
// and from the dry corner's edge, lowest ground first, so no stream dead-ends. Worked at half size.
// A little noise on the heights makes a stream wander where the ground is flat.
const trail = new Uint8Array(NW * VD), water = new Uint8Array(NW * VD), routes = [];
{
  const RW = NW >> 1, RH = VD >> 1, N = RW * RH, fill = new Float32Array(N), down = new Int32Array(N).fill(-2), flow = new Float32Array(N), hk = [], hi = [];
  const push = (k, i) => { let n = hk.length; hk.push(k); hi.push(i); while (n > 0) { const p = (n - 1) >> 1; if (hk[p] <= k) break; hk[n] = hk[p]; hi[n] = hi[p]; n = p; } hk[n] = k; hi[n] = i; };
  const pop = () => { const top = hi[0], k = hk.pop(), i = hi.pop(), len = hk.length; if (len) { let n = 0; for (;;) { let c = 2 * n + 1; if (c >= len) break; if (c + 1 < len && hk[c + 1] < hk[c]) c++; if (hk[c] >= k) break; hk[n] = hk[c]; hi[n] = hi[c]; n = c; } hk[n] = k; hi[n] = i; } return top; };
  const rh = i => { const u = (i % RW) * 2, v = ((i / RW) | 0) * 2; return hg[at(u, v)] + 3 * (fbm(u / 40, v / 30, 410, 3) - 0.5); };
  for (let i = 0; i < N; i++) { const ru = i % RW, rv = (i / RW) | 0, u = ru * 2, v = rv * 2; if (coast(u, v) > 0) { down[i] = -1; fill[i] = 0; push(0, i); } else if ((rv === 0 || ru === RW - 1) && dryAmt(u, v) > 0.2) { down[i] = -1; fill[i] = rh(i); push(fill[i], i); } }
  while (hk.length) { const c = pop(), cu = c % RW, cv = (c / RW) | 0; for (let dv = -1; dv <= 1; dv++) for (let du = -1; du <= 1; du++) { const nu = cu + du, nv = cv + dv; if ((!du && !dv) || nu < 0 || nv < 0 || nu >= RW || nv >= RH) continue; const n = nv * RW + nu; if (down[n] !== -2) continue; fill[n] = Math.max(rh(n), fill[c] + (du && dv ? 0.0028 : 0.002)); down[n] = c; push(fill[n], n); } }
  // Follow each source down to an outlet, adding its water to every spot it passes.
  for (const s of C.src) { const lead = catmull(s.lead), [lu, lv] = lead[lead.length - 1], cells = []; let i = (Math.round(lv) >> 1) * RW + (Math.round(lu) >> 1), guard = 0; while (i >= 0 && guard++ < 8000) { cells.push(i); flow[i] += s.w; if (down[i] < 0) break; i = down[i]; } routes.push({ s, lead, cells }); }
  const wide = f => 0.5 + 0.8 * Math.sqrt(f), flowAt = (u, v) => { let f = 0; const ru = Math.round(u) >> 1, rv = Math.round(v) >> 1; for (let dv = -1; dv <= 1; dv++) for (let du = -1; du <= 1; du++) { const nu = ru + du, nv = rv + dv; if (nu >= 0 && nv >= 0 && nu < RW && nv < RH) f = Math.max(f, flow[nv * RW + nu]); } return f; };
  for (const r of routes) {
    const sparse = r.cells.filter((_, n) => n % 4 === 0 || n === r.cells.length - 1).map(i => [(i % RW) * 2, ((i / RW) | 0) * 2]);
    const run = sparse.length > 2 ? catmull([r.lead[r.lead.length - 1], ...sparse.slice(1)]) : [];
    r.pts = [...r.lead.map(([u, v]) => [u, v, wide(r.s.w)]), ...run.map(([u, v]) => [u, v, wide(Math.max(r.s.w, flowAt(u, v)))])];
    // Its bed never climbs: where the way out of a hollow crosses higher ground the stream cuts a
    // notch through it, with banks that open out.
    let bed = 1e9;
    for (const [pu, pv, pr] of r.pts) {
      bed = Math.min(bed, hAt(pu, pv)); const W = Math.ceil(pr + 9);
      for (let dv = -W; dv <= W; dv++) for (let du = -W; du <= W; du++) { const u = Math.round(pu + du), v = Math.round(pv + dv); if (u < 0 || v < 0 || u >= NW || v >= VD) continue; const i = at(u, v), m = MATS[mg[i]], d = Math.hypot(du, dv); if (d > W || (m !== 'land' && m !== 'moraine' && m !== 'gran')) continue; const t = Math.max(0.4, bed + Math.max(0, d - pr) * 0.9); if (hg[i] > t) hg[i] = t; if (d <= pr + 1 && hg[i] > 0) water[i] = Math.max(water[i], d <= pr ? 2 : 1); }
    }
  }
  // An oxbow: a bend the west river left behind, in the flat of the meadow.
  { const p = routes[1].pts, k = p.findIndex(([u, v]) => u < 900 && v < 300), q = p[k], q2 = p[Math.min(p.length - 1, k + 12)]; if (k > 0) { const a = Math.atan2(q2[1] - q[1], q2[0] - q[0]), cx = q[0] + Math.cos(a + 1.4) * 22, cy = q[1] + Math.sin(a + 1.4) * 22 * 0.6; for (let t = 0; t < 60; t++) { const b = a + 1.4 + 1.0 + t / 60 * 4.3, u = Math.round(cx + Math.cos(b) * 15), v = Math.round(cy + Math.sin(b) * 9); for (let dv = -1; dv <= 1; dv++) for (let du = -2; du <= 2; du++) if (hg[at(u + du, v + dv)] > 0 && !water[at(u + du, v + dv)]) water[at(u + du, v + dv)] = Math.abs(du) < 2 ? 2 : 1; } } }
}
function stamp(mask, pts, r0, r1) { pts.forEach(([pu, pv], n) => { const rr = lerp(r0, r1, n / (pts.length - 1)), R2 = Math.ceil(rr + 1); for (let dv = -R2; dv <= R2; dv++) for (let du = -R2; du <= R2; du++) { const d = Math.hypot(du, dv), u = Math.round(pu + du), v = Math.round(pv + dv), k = d <= rr ? 2 : d <= rr + 1 ? 1 : 0; if (k && u >= 0 && v >= 0 && u < NW && v < VD && mask[at(u, v)] < k) mask[at(u, v)] = k; } }); }
const trailPts = []; for (const t of C.trails) { const all = catmull(t); stamp(trail, all, 1.9, 1.9); trailPts.push(...all); }
const nearTrail = (u, v, r) => { for (let i = 0; i < trailPts.length; i += 3) { const p = trailPts[i]; if (Math.abs(p[0] - u) < r && Math.abs(p[1] - v) < r) return true; } return false; };

// ---- what the ground is made of -------------------------------------------------------------------
const wob = (u, v, s, a) => a * (fbm(u / 70, v / 60, s, 3) - 0.5);
const forestEdge = v => edgeE - 96 * (fbm(v / 110, 2.3, 3, 3) - 0.5) + 30 * (fbm(v / 24, 7.1, 5, 2) - 0.5) + 44 * smooth(440, 260, v);
const ell = ([cu, cv, ru, rv], u, v) => Math.hypot((u - cu) / ru, (v - cv) / rv);
const parkAmt = (u, v) => Math.max(smooth(1.25, 0.8, ell(C.PK, u, v) + wob(u, v, 202, 0.4)), smooth(1.2, 0.8, ell(C.PK2, u, v) + wob(u, v, 203, 0.4)));
const forestAmt = (u, v) => smooth(forestEdge(v) + 40, forestEdge(v) - 24, u + 30 * (fbm(u / 30, v / 30, 8, 2) - 0.5)) * smooth(-6, -30, coast(u, v)) * (1 - 0.9 * smooth(1.1, 0.7, ell(C.PK, u, v)));
// Larches are trees of the high country: none below the second granite step.
const larchAmt = (u, v) => smooth(1.2, 0.85, ell(C.LB, u, v) + wob(u, v, 204, 0.35)) * smooth(62, 74, hAt(u, v));
// The old burn lies across the east end of the first granite step and runs off the edge of the map.
const burnAmt = (u, v) => { const a = u - 1850, b = v - 470; return smooth(1.1, 0.72, Math.hypot((a * 0.9 + b * 0.43) / 130, (a * -0.43 + b * 0.9) / 58) + wob(u, v, 210, 0.5)); };
// The fog of the rainforest: nothing in the east, building westward until only white is left. It
// lies in the hollows, so this is the height it fills the forest to.
const fogAmt = (u, v) => smooth(edgeE + 20, 90, u + wob(u, v, 201, 60) + 170 * (fbm(u / 150, v / 110, 236, 2) - 0.5)) * (lakeAt(u, v) ? 0 : 1);
const fogTop = (u, v) => { const f = fogAmt(u, v); return f <= 0.02 ? -1 : hAt(u, v) - ridges(u, v) + 27 * f - 3 + 5 * f * (fbm(u / 50, v / 30, 220, 2) - 0.5); };
const fogInk = (x, y, k) => k < 2.5 || vnoise(x / 26, y / 5, 221) > 0.64 ? R.fog[2] : R.fog[1];
const seaFog = (u, v) => smooth(300, 30, u + wob(u, v, 201, 110)) * (0.75 + 0.5 * fbm(u / 90, v / 40, 226, 2));
// The colour of one spot of ground. hh is the height of the bit being drawn, which on a cliff runs
// from the cliff's foot to its lip.
function colour(u, v, hh, x, y) {
  const i = at(u, v), mat = MATS[mg[i]], n1 = hash(u, v, 31) - 0.5, uu = clamp(u, 1, NW - 2), vv = clamp(v, 1, VD - 2);
  const du = hg[at(uu + 1, vv)] - hg[at(uu - 1, vv)], dv = hg[at(uu, vv + 1)] - hg[at(uu, vv - 1)], steep = Math.hypot(du, dv) / 2;
  // The sun is in the west: slopes that face west or the camera are lit.
  const L = clamp(0.5 + 0.17 * clamp(du, -2.5, 2.5) + 0.06 * clamp(dv, -2.5, 2.5), 0, 1);
  const cs = coast(u, v);
  if (cs > -15 && bayer(x, y) < seaFog(u, v) * 1.2 - 0.14) return fogInk(x, y, 9);
  if (cs > 0) return cs < 3 + 2 * vnoise(u / 9, v / 9, 85) ? R.sea[5] : pick('sea', 0.75 - smooth(0, 150, cs) * 0.6 + 0.12 * (vnoise(u / 14, v / 3, 86) - 0.5), x, y);
  if (cs > -15 - 6 * vnoise(u / 20, v / 20, 87)) return water[i] ? R.water[3] : R.sand[cs > -4 ? 0 : hash(u, v, 88) < 0.25 ? 1 : 2];
  const lk = lakeAt(u, v);
  if (lk === 'lake' && isle(u, v) < 1) return pick('grass', 0.55 + 0.3 * n1, x, y);
  if (lk) return lk === 'tarn' ? pick('tarn', 0.3 + 0.4 * vnoise(u / 6, v / 3, 8), x, y) : lk === 'silt' ? pick('glac', 0.5 + 0.2 * vnoise(u / 5, v / 3, 8), x, y, 0.5) : lk === 'milk' ? (bayer(x, y) < 0.4 ? R.glac[3] : pick('tarn', 0.7 + 0.25 * vnoise(u / 6, v / 3, 8), x, y)) : pick('water', 0.3 + 0.3 * vnoise(u / 6, v / 2, 8), x, y);
  // Where a trail crosses water there is a footbridge: a deck of planks with a dark edge.
  if (water[i] && trail[i] && mat !== 'ice') return trail[i] === 2 ? ((u + 2 * v) % 3 === 0 ? R.dirt[1] : R.dirt[2]) : R.dirt[0];
  if (water[i]) return steep > 0.55 ? (hash(x, y >> 1, 5) < 0.72 ? R.white[1] : R.water[4]) : water[i] === 2 ? (hash(x, y, 9) < 0.08 ? R.glint[(x + y) & 3] : R.water[y & 1 ? 3 : 4]) : R.water[1];
  const rim = lakeRim(u, v); if (rim) return rim === 'lake' ? R.dirt[hash(x, y, 3) < 0.3 ? 3 : 4] : R.rock[hash(x >> 1, y >> 1, 3) < 0.5 ? 2 : 3];
  if (trail[i] === 2) return mat === 'ice' ? R.glac[1] : mat !== 'land' || steep > 0.8 ? R.rock[hash(u, v, 6) < 0.3 ? 4 : 3] : hash(u, v, 5) < 0.1 ? R.dirt[2] : R.dirt[3];
  if (trail[i] === 1) return mat === 'ice' ? R.glac[3] : mat !== 'land' || steep > 0.8 ? R.rock[1] : R.dirt[1];
  if (mat === 'ice') {
    // Under the wall the ice gapes away from the rock. Above the icefall it is snow with a few long
    // crevasses, the icefall is broken blocks, and the tongue below is bare blue ice crevassed across.
    if (MATS[mg[at(u, Math.min(VD - 1, v + 3))]] === 'wall' && hash(u >> 3, 1, 852) < 0.85) return R.glac[0];
    if (v > GL.fall[1]) return frac((v + 0.2 * u) / 11 + 0.5 * vnoise(u / 12, v / 12, 853)) < 0.08 && vnoise(u / 30, v / 8, 854) > 0.5 ? R.glac[3] : R.snow[L > 0.45 ? 4 : 3];
    if (v >= GL.fall[0]) { const row = Math.floor((v * 2 + hh) / 4), k = hash((u + row * 5) >> 2, row, 855); return k < 0.24 ? R.glac[1] : k < 0.5 ? R.glac[3] : k < 0.8 ? R.glac[4] : R.snow[4]; }
  }
  if (mat === 'ice') return frac((v * 0.9 + 0.3 * u) / 7 + 0.4 * vnoise(u / 8, v / 8, 817)) < 0.14 ? R.glac[2] : pick('glac', 0.45 + 0.4 * L + 0.2 * vnoise(u / 6, v / 4, 818), x, y, 0.6);
  if (mat === 'moraine') return steep > 0.7 ? pick('rock', 0.12 + 0.4 * vnoise(x / 3, hh / 10, 97), x, y, 0.7) : hash(u >> 1, v >> 1, 12) < 0.25 ? pick('grass', 0.4, x, y) : pick('rock', 0.2 + 0.7 * hash(u >> 1, v >> 1, 13), x, y);
  if (mat === 'wall' || mat === 'crest') {
    // Dark rock; snow lies where the slope lets it, and on the ledges of the walls. Toward the dry
    // east the same rock is a step paler and cleaner and holds less snow.
    const east = smooth(1240, 1600, u + 80 * (vnoise(u / 60, hh / 40, 840) - 0.5)), pale = bayer(x, y) < east * 0.9 ? 1 : 0;
    const flute = vnoise(x / 2.5, hh / 16, 813), rock = R.rock[clamp(Math.round(L * 2.6) + (flute > 0.64 ? 1 : flute < 0.34 ? -1 : 0), 0, 3) + pale], band = (x + (y >> 3) * 3) >> 2, row = hh / 7 + hash(band, 0, 814) * 7;
    if (mat === 'crest') return hh > 62 + 34 * vnoise(x / 14, 3, 816) + 46 * east && vnoise(x / 5, hh / 11, 815) > 0.34 + 0.25 * smooth(110, 60, hh) + 0.2 * east ? R.snow[L > 0.55 ? 4 : L > 0.35 ? 3 : 2] : hh < 44 + 20 * vnoise(u / 20, v / 20, 827) ? pick('conifer', 0.2 + 0.5 * L, x, y) : rock;
    // Snow gullies run up the wall from the ice to the notches between its summits.
    { const dx = (u - SP.cu) / SP.wide, up = hh - SP.base - under(SP.cu, SP.cv - 34) - 4; for (const [o, top, k] of GULLY) { const t = up / (top * SP.H); if (t > 0 && t < 1 && Math.abs(dx - o - 3 * Math.sin(hh / 9 + k)) < 1 + k * 0.5 + (3 + 2 * k) * sq(1 - t)) return R.snow[L > 0.4 ? 4 : 3]; } }
    if (steep < 0.9) return R.snow[L > 0.5 ? 4 : 3];
    return frac(row) < 0.15 && hash(band, Math.floor(row), 815) < 0.26 ? R.snow[L > 0.4 ? 4 : 3] : rock;
  }
  if (mat === 'volc') {
    // Lit from the west; the east flank turns away into blue shadow.
    const { cu, ru, H } = VOLC, e = hh / H, b = bayer(x, y), Q = vrelief(u, v), ew = (u - cu) / ru;
    const lit = clamp(L - 0.3 * smooth(0, 0.8, ew) + 0.12 * smooth(0, -0.8, ew), 0, 1), n2 = vnoise(x / 9, hh / 7, 574);
    const rock = (dk = 0) => R.rock[clamp(Math.round(lit * 3.2 + (b - 0.5) * 0.9) - dk, 0, 3)];
    const snow = () => R.snow[clamp(Math.round(lit * 4.2 + 0.3 + (b - 0.5) * 0.9), 1, 4)];
    // The tooth low on the east flank, after Little Tahoma: dark rock standing out of the ice.
    // It breaks the skyline as the bump on the mountain's right-hand outline.
    const tu = cu + 128 * ru / 250, tq = Math.hypot((u - tu) / 22, (v - VOLC.cv - 0.05 * VOLC.rv) / 46);
    if (e > 0.42 && tq < 1 - 0.25 * n2) return vnoise(x / 3, hh / 5, 581) > 0.72 && lit > 0.4 ? R.snow[3] : rock(1);
    // Ribs of rock between the glaciers: thin near the top, wider low down, gone below the dome.
    // A rib on the east or west flank is seen edge-on, so it is drawn thinner there.
    const ribW = (Q.amp * 0.3 * smooth(0.82, 0.3, e) + 0.1 * (n2 - 0.5)) * (0.35 + 0.65 * Q.face);
    // The snow comes down lowest in the middle of each glacier, as a tongue, and stops higher on the ribs.
    // How far up the mountain's own slope a spot is, from its foot (0) to the summit (1): the height
    // drawn also counts the raised ground it stands on, which would bring the ice down too far in front.
    const el = VP(Math.min(1, Q.d));
    // Each glacier reaches its own distance down, so the ice does not end along one line.
    const snowE = 0.44 - (0.05 + 0.13 * hash(Q.k & 15, 7, 587)) * smooth(0.15, 0.85, 1 - Q.t) + 0.07 * (vnoise(u / 14, v / 14, 575) - 0.5);
    if (el > snowE) {
      if (e > 0.2 && Q.t > 1 - ribW) return vnoise(x / 2.5, hh / 4, 582) > 0.76 && lit > 0.35 ? R.snow[3] : rock(vnoise(x / 4, hh / 12, 583) > 0.62 ? 1 : 0);
      // A crack round the dome where the summit snow pulls away (the bergschrund).
      if (e > 0.812 && e < 0.826 && vnoise(x / 9, hh / 3, 563) > 0.6) return R.glac[lit > 0.45 ? 2 : 1];
      // Two or three glaciers break over a step into an icefall of blue blocks.
      const fall = hash(Q.k & 15, 5, 578), f0 = 0.4 + 0.14 * hash(Q.k & 15, 6, 578);
      if (fall > 0.45 && Q.t < 0.62 && e > f0 && e < f0 + 0.09) { const row = Math.floor(hh / 3), k = hash((u + row * 5) >> 1, row, 579); return k < 0.2 ? R.glac[1] : k < 0.45 ? R.glac[lit > 0.4 ? 3 : 2] : k < 0.75 ? R.snow[3] : R.snow[4]; }
      // Crevasses across the flow, short pale-blue dashes.
      if (e > 0.24 && e < 0.78 && frac(hh / 4.5 + 3 * Q.t + 0.6 * vnoise(u / 10, v / 10, 576)) < 0.1 && vnoise(x / 4, hh / 3, 577) > 0.55) return R.glac[lit > 0.45 ? 3 : 2];
      return snow();
    }
    // The snout of each glacier: a band of dirty ice and rubble.
    if (el > snowE - 0.025) return b < 0.5 ? R.glac[2] : rock();
    // Below the ice, moraine and scree with dark streaks, then heather and meadow, then the forest.
    if (el > Math.max(0.12, snowE - 0.07 - 0.04 * n2)) return vnoise(x / 4, hh / 9, 584) > 0.74 ? R.rock[0] : hash(u >> 1, v >> 1, 585) < smooth(snowE - 0.03, snowE - 0.08, el) * 0.8 ? pick('grass', 0.3 + 0.3 * lit, x, y) : pick('rock', 0.2 + 0.5 * lit + 0.15 * vnoise(x / 3, hh / 6, 580), x, y, 0.7);
    if (forestAmt(u, v) > 0.4) return pick('moss', 0.2 + 0.35 * lit, x, y);
    return hash(u, v, 586) < 0.05 ? R.red[1] : pick('grass', 0.4 + 0.35 * lit + 0.15 * n1, x, y, 0.4);
  }
  if (mat === 'gran' || mat === 'fin') {
    if (steep > 0.75 || mat === 'fin') { const crack = vnoise(x / 2.2, hh / 26, 902), streak = vnoise(x / 5, hh / 40, 903); const k = clamp(Math.round(1.5 + 2.9 * L + (streak > 0.62 ? -1.1 : 0) + (crack > 0.74 ? -1.4 : crack < 0.2 ? 0.5 : 0) + (b2(x, y) - 0.5) * 0.9), 0, 5); return k === 5 ? R.gold[6] : R.rock[k]; }
    const slab = fbm(u / 22, v / 11, 96, 3);
    return slab > 0.4 ? pick('rock', 0.82 + 0.4 * (slab - 0.5) + 0.2 * n1, x, y, 0.7) : hash(u, v, 98) < 0.06 ? R.red[1] : pick('grass', 0.42 + 0.2 * n1, x, y, 0.4);
  }
  // Land. A step in it shows the rock of its own country.
  if (steep > 1.05) return dryAmt(u, v) > 0.3 ? ((x >> 1) % 4 === 0 ? R.basalt[0] : R.basalt[1 + (hash(x >> 1, 0, 91) * 2.9 | 0)]) : u > 1190 ? pick('rock', 0.36 + 0.42 * vnoise(x / 3, hh / 10, 97) + 0.15 * L, x, y, 0.7) : pick('rock', 0.12 + 0.42 * vnoise(x / 3, hh / 10, 97) + 0.2 * L, x, y, 0.7);
  const sh = (L - 0.5) * 0.5, blot = s => 0.5 + 0.85 * (fbm(u / 32, v / 21, s, 3) - 0.5) + 0.2 * n1;
  const fa = forestAmt(u, v);
  if (fa > 0.5 + 0.2 * n1) { const shaft = fbm(u / 34 + v / 70, v / 26, 21, 3); return pick('moss', 0.16 + 0.3 * fbm(u / 18, v / 18, 22, 3) + smooth(0.56, 0.7, shaft) * 0.4 + sh * 0.4, x, y); }
  const bu = burnAmt(u, v), da = dryAmt(u, v);
  if (larchAmt(u, v) > blot(181) && bu < 0.5) { const slab = fbm(u / 22, v / 11, 96, 3); return slab > 0.58 ? pick('rock', 0.85 + 0.2 * n1, x, y, 0.7) : hash(u, v, 98) < 0.06 ? R.red[1] : hash(u, v, 99) < 0.05 ? R.larch[3] : pick('grass', 0.42 + sh + 0.2 * n1, x, y, 0.4); }
  if (bu > blot(182)) { for (let k = 0; k < 9; k++) { const tall = 6 + Math.floor(hash(u, v - k, 132) * 3.99); if (k < tall && hash(u, v - k, 101) < 0.008 + 0.09 * smooth(0.5, 0.66, fbm(u / 30, (v - k) / 15, 131, 3))) return k < 2 ? R.grass[1] : k === tall - 1 ? R.fireweed[1] : R.fireweed[0]; } return fbm(u / 24, v / 16, 100, 3) > 0.56 ? pick('grass', 0.3, x, y, 0.5) : pick('ash', 0.4 + 0.5 * fbm(u / 14, v / 9, 102, 3), x, y); }
  if (da > blot(183)) { const sg = sageAmt(u, v); return hash(u >> 1, v >> 1, 103) < 0.04 + sg * 0.3 ? R.sage[1 + (hash(u, v, 104) < 0.5 ? 0 : 1)] : pick('dry', 0.5 + 0.5 * (fbm(u / 24, v / 14, 105, 3) - 0.5) + sh + sg * 0.1, x, y); }
  // High ground with no forest on it goes from meadow to bare rock and then snow.
  if (hh > 96 + 30 * vnoise(u / 30, v / 30, 828)) return hh > 150 ? R.snow[L > 0.5 ? 4 : 3] : pick('rock', 0.3 + 0.5 * L, x, y);
  return pick('grass', 0.56 + 0.55 * (fbm(u / 26, v / 26, 31, 3) - 0.5) + 0.14 * (hash(x >> 1, y >> 1, 32) - 0.5) + sh - fa * 0.45 + da * 0.2, x, y, 0.3);
}
function b2(x, y) { return bayer(x, y); }

// ---- the picture ----------------------------------------------------------------------------------
const g = new Uint8Array(NW * SH), mb = new Uint8Array(NW * SH).fill(255), zb = new Float32Array(NW * SH).fill(1e9), px = (x, y) => y * NW + x;
const skyAt = (x, y) => { const sb = R.skyband, f = clamp(y / 340, 0, 1) * (sb.length - 1), b0 = Math.floor(f), e = f - b0; return sb[Math.min(sb.length - 1, b0 + (e > 0.72 && bayer(x, y) < (e - 0.72) / 0.28 ? 1 : 0))]; };
for (let y = 0; y < SH; y++) for (let x = 0; x < NW; x++) g[px(x, y)] = skyAt(x, y);
// The far ranges, which really are a backdrop: pale, beyond the last of the ground.
function farRow(u0, u1, baseY, env, seed, snowy, list) {
  const r = rng(seed), peaks = list || []; if (!list) for (let cx = u0; cx < u1;) { const h = env(cx) * (0.75 + 0.5 * r()), w = h * (1.2 + 0.7 * r()); peaks.push([cx, h, w]); cx += w * (0.5 + 0.4 * r()); }
  for (let x = Math.max(0, u0 - 80); x < Math.min(NW, u1 + 80); x++) {
    let best = 0, bc = 0, bh = 1; for (const [cx, h, w] of peaks) { const t = h * Math.pow(Math.max(0, 1 - Math.abs(x - cx) / w), 0.85) + 1.5 * (vnoise(x / 4, cx, 700) - 0.5); if (t > best) { best = t; bc = cx; bh = h; } }
    for (let y = Math.round(baseY - best); y <= baseY + 30 && y < SH; y++) { const d = y - (baseY - best), west = x < bc + (y - baseY + bh) * 0.12; g[px(x, y)] = d === 0 ? R.far[2] : snowy && d < bh * 0.55 ? (west ? R.farsnow[1] : R.farsnow[0]) : west ? R.far[3] : R.far[2]; }
  }
}
const HZ = SY - VD - 26;
// The Legacy Range: a broad massif of several summits, with lower peaks in front of it and round it.
farRow(0, 480, HZ - 22, null, 41, true, [[200, 86, 120], [128, 64, 90], [268, 70, 84], [330, 50, 80], [64, 48, 84], [4, 36, 80], [400, 34, 76]]);
farRow(0, 600, HZ - 6, null, 45, false, [[40, 26, 60], [150, 22, 50], [245, 18, 40], [300, 28, 64], [430, 24, 60], [520, 30, 70]]);
farRow(520, 1700, HZ + 20, x => 46 + 20 * vnoise(x / 90, 2, 43), 43, true);
farRow(1640, NW + 40, HZ + 24, x => 26, 44, false);
// The ground and the mountains, one column at a time from the near edge to the far one. A spot is
// drawn only where nothing nearer already stands in front of it.
for (let u = 0; u < NW; u++) {
  let minY = SH;
  for (let v = 0; v < VD; v++) {
    const h = hg[at(u, v)], sy = Math.round(SY - v - h); if (sy >= minY) continue;
    const ft = fogTop(u, v), fa = ft > -1 ? forestAmt(u, v) : 0;
    for (let y = Math.max(0, sy); y < minY; y++) {
      const hh = SY - v - y;
      // Fog lies on the forest floor up to its level: thick in the hollows, thin over the ridges.
      mb[px(u, y)] = mg[at(u, v)]; g[px(u, y)] = fa > 0.4 && hh < ft && bayer(u, y) < 0.2 + (ft - hh) / 4 ? fogInk(u, y, ft - hh) : colour(u, v, hh, u, y);
      zb[px(u, y)] = v;
    }
    minY = sy;
  }
}

// ---- detail on the ground, as round 3 had it ------------------------------------------------------
// These work on the finished picture. A pixel belongs to the ground at one spot (zb, its depth), so
// each touch keeps to one stretch of ground and never reaches across the edge of a nearer slope.
const sameGround = (i, j) => Math.abs(zb[i] - zb[j]) < 4;
// Reflection Lake mirrors what stands behind it, squashed and broken by ripples: snow as pale water,
// forest as dark water, rock in between. The shore keeps its own colour.
{
  const lake = C.lakes[0], top = new Int16Array(NW).fill(-1);
  for (let y = 0; y < SH; y++) for (let x = Math.floor(lake[0] - lake[2] - 4); x <= lake[0] + lake[2] + 4; x++) { const v = zb[px(x, y)]; if (v < VD && top[x] < 0 && lakeAt(x, v) === 'lake') top[x] = y; }
  for (let x = 0; x < NW; x++) if (top[x] >= 0) for (let y = top[x] + 1; y < SH; y++) {
    const i = px(x, y), v = zb[i]; if (v >= VD || lakeAt(x, v) !== 'lake' || isle(x, v) < 1.2) { if (y > top[x] + 30) break; continue; }
    if (lakeAt(x, v - 2) !== 'lake' || lakeAt(x + 2, v) !== 'lake' || lakeAt(x - 2, v) !== 'lake') continue;
    const sy = Math.round(top[x] - (y - top[x]) * 3.2 - 2), sx = Math.round(x + 1.5 * Math.sin(y * 1.7)); if (sy < 0 || sx < 0 || sx >= NW || !(y & 1 || hash(x, y, 8) < 0.6)) continue;
    const c = g[px(sx, sy)], k = RAMP_OF[c]; if (!k || k === 'skyband' || k === 'sky') continue;
    g[i] = k === 'snow' || k === 'farsnow' || k === 'glac' ? R.water[4] : k === 'conifer' || k === 'moss' || k === 'grass' || k === 'mist' ? R.water[1] : R.water[2];
  }
}
// Tufts of grass: a small arch with a dark root.
{
  const r0 = rng(5);
  for (let n = 0; n < 30000; n++) {
    const x = 2 + (r0() * (NW - 4)) | 0, y = 300 + (r0() * (SH - 302)) | 0, i = px(x, y), k = KIND[g[i]]; if ((k !== 1 && k !== 2) || mb[i] !== 0) continue;
    if (KIND[g[i - NW]] !== k || KIND[g[i - 2 * NW]] !== k || !sameGround(i, i - 2 * NW)) continue;
    const r = R[k === 1 ? 'grass' : 'moss']; g[i - 2 * NW] = r[r.length - 1]; g[i - NW - 1] = r[r.length - 2]; g[i - NW + 1] = r[r.length - 2]; g[i] = r[1];
  }
}
// Wildflowers in clumps, each flower a bloom on a stem: thick in the parkland, scattered through the meadow.
{
  const rand = rng(11), isGrass = i => g[i] >= R.grass[0] && g[i] <= R.grass[4];
  for (let n = 0; n < 9000; n++) {
    const cx = (rand() * NW) | 0, cy = 300 + ((rand() * (SH - 302)) | 0), v = zb[px(cx, cy)], type = rand(), count = 6 + (rand() * 12 | 0);
    if (v >= VD || !isGrass(px(cx, cy))) continue;
    const want = 0.9 * parkAmt(cx, v) + (forestAmt(cx, v) < 0.2 && dryAmt(cx, v) < 0.2 && larchAmt(cx, v) < 0.2 && burnAmt(cx, v) < 0.2 ? 0.07 : 0);
    if (rand() > want) continue;
    for (let k = 0; k < count; k++) {
      const x = Math.round(cx + (rand() - 0.5) * 18), y = Math.round(cy + (rand() - 0.5) * 10); if (x < 2 || y < 2 || x >= NW - 2 || y >= SH - 2) continue;
      const i = px(x, y); if (!isGrass(i) || !isGrass(i - NW) || !sameGround(i, i - NW)) continue;
      if (type < 0.5) { g[i - NW] = R.lupine[2]; g[i] = R.lupine[1]; } else if (type < 0.75) { g[i - NW] = R.red[2]; g[i] = R.red[1]; } else if (type < 0.9) g[i] = R.white[1]; else g[i] = R.yellow[1];
    }
  }
}
// Driftwood along the beach: pale logs, each with its shadow under it.
{
  const rand = rng(44390);
  for (let n = 0; n < 700; n++) {
    const x = (rand() * 700) | 0, y = 500 + ((rand() * (SH - 500)) | 0), v = zb[px(x, y)]; if (v >= VD) continue;
    const cs = coast(x, v); if (cs > -3 || cs < -13) continue;
    const len = 6 + rand() * 12, a = (rand() - 0.5) * 0.9 + 0.6;
    for (let k = 0; k < len; k++) { const qx = Math.round(x + Math.cos(a) * k), qy = Math.round(y + Math.sin(a) * k * 0.5); if (qx > 0 && qy > 0 && qx < NW && qy < SH - 1 && !water[at(qx, Math.round(zb[px(qx, qy)]))] && sameGround(px(x, y), px(qx, qy))) { g[px(qx, qy)] = R.rock[4]; g[px(qx, qy + 1)] = R.rock[2]; } }
  }
}
// A dark line where a wall or the granite fin stands against something farther off, so the Spires
// and Proficiency Peak read as shapes of their own.
for (let y = 1; y < SH - 1; y++) for (let x = 1; x < NW - 1; x++) {
  const i = px(x, y), m = MATS[mb[i]]; if (m !== 'fin' && m !== 'wall') continue;
  if (zb[i - NW] > zb[i] + 14 || zb[i - 1] > zb[i] + 14 || zb[i + 1] > zb[i] + 14) g[i] = INK;
}
// ---- the fog in the rainforest --------------------------------------------------------------------
// Drawn ridge by ridge, after TJ's photograph: ranks of conifers stand one behind another along the
// forest's ridges, white fog lies in the hollows between them, and each rank is paler than the one in
// front of it. It builds from nothing on the forest's east side to almost only white at the west edge,
// where the ranks break up and bare snags stand against the fog.
{
  const RANK = [R.conifer[0], R.mist[0], R.nebel[0], R.nebel[1], R.nebel[2], R.nebel[3], R.fog[0], R.fog[1]];
  const foggy = (u, v) => coast(u, v) < -18 ? smooth(0.16, 0.6, fogAmt(u, v) + 0.12 * (fbm(u / 40, v / 30, 235, 2) - 0.5)) * smooth(0.3, 0.5, forestAmt(u, v)) : 0;
  const white = (x, y) => vnoise(x / 34, y / 5, 231) > 0.74 ? R.fog[1] : R.fog[2];
  // The white first: the forest floor under the fog.
  for (let y = 0; y < SH; y++) for (let x = 0; x < 660; x++) {
    const i = px(x, y), v = zb[i]; if (v >= VD || mb[i] !== 0) continue;
    const w = foggy(x, v); if (w > 0 && bayer(x, y) < w) g[i] = white(x, y);
  }
  const rr = rng(2311);
  const ink = (x, y, v, k) => { if (x < 0 || y < 0 || x >= NW || y >= SH) return; const i = px(x, y); if (zb[i] < v - 2) return; g[i] = RANK[clamp(Math.floor(k + 0.9 * (bayer(x + 3, y) - 0.5)), 0, 7)]; zb[i] = v; mb[i] = 0; };
  // A bare snag: a trunk that thickens low down, a broken top, and a few stubs that stick out unevenly.
  const snagAt = (x0, base, v, hgt, k) => {
    const top = base - Math.round(hgt), lean = (rr() - 0.5) * 0.22, at = d => Math.round(x0 + lean * d);
    for (let d = 0; top + d <= base + 2; d++) { ink(at(d), top + d, v, k); if (d > hgt * 0.45) ink(at(d) + 1, top + d, v, k); }
    for (let d = 3 + rr() * 3; d < hgt * 0.7; d += 3 + rr() * 6) { const side = rr() < 0.5 ? -1 : 1, len = 1 + Math.round(rr() * 2), y = top + Math.round(d); for (let j = 1; j <= len; j++) ink(at(d) + (side > 0 ? 1 : 0) + side * j, y - (j === len && rr() < 0.5 ? 1 : 0), v, k); }
  };
  // One tree of a rank: one of the forest's own conifers, paled through the fog by how deep in it
  // stands, the way round 3's mist paled the trees under it. It keeps its texture.
  const VEILS = [0.1, 0.24, 0.38, 0.51, 0.63, 0.74, 0.84].map(veilTable);
  const kinds = [...Array.from({ length: 6 }, (_, i) => makeSpruce(260 + i)), ...Array.from({ length: 4 }, (_, i) => makeFir(360 + i))];
  const tree = (x0, base, v, hgt, half, k, snag) => {
    if (snag) return snagAt(x0, base, v, hgt * 1.25, k - 0.6);
    const t = kinds[(rr() * kinds.length) | 0];
    for (const p of t.parts) for (let j = 0; j < p.bm.h; j++) for (let i = 0; i < p.bm.w; i++) {
      const c = p.bm.d[j * p.bm.w + i]; if (!c) continue;
      const x = x0 + p.x + i, y = base + p.y + j; if (x < 0 || y < 0 || x >= NW || y >= SH) continue;
      const q = px(x, y); if (zb[q] < v - 2) continue;
      g[q] = VEILS[clamp(Math.floor(k + 0.9 * (bayer(x + 3, y) - 0.5)), 0, 6)][c]; zb[q] = v; mb[q] = 0;
    }
  };
  const flatTree = (x0, base, v, hgt, half, k) => {
    const top = base - Math.round(hgt), lean = (rr() - 0.5) * 0.14;
    for (let y = Math.max(0, top); y <= Math.min(SH - 1, base + 2); y++) {
      const d = y - top, hw = Math.min(half, 0.3 + (d % 4) * 0.42 + Math.floor(d / 4) * half * 3.4 / hgt);
      const cx = x0 + lean * d;
      for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
        if (x < 0 || x >= NW) continue;
        const i = px(x, y); if (zb[i] < v - 2) continue;
        g[i] = RANK[clamp(Math.floor(k + 0.9 * (bayer(x + 3, y) - 0.5)), 0, 7)]; zb[i] = v; mb[i] = 0;
      }
    }
  };
  // The ranks, far to near. Each is a line across the forest at one distance from the camera. Its trees
  // stand on the land, and below them the fog fills the hollow in front, hiding their feet.
  for (let c = VD + 170; c > -60; c -= 26 + rr() * 12) {
    const seed = Math.round(c), vOf = u => c - 0.25 * u + 10 * (vnoise(u / 60, seed, 232) - 0.5);
    for (let u = 2 + rr() * 5; u < 660; u += 6 + rr() * 5) {
      const v = vOf(u); if (v < 2 || v >= VD - 1) continue;
      const w = foggy(u, v); if (w < 0.05) continue;
      const f = fogAmt(u, v);
      // Gaps open in the ranks toward the west, where the fog thins the forest out.
      if (fbm(u / 26, seed / 7, 233, 2) < 0.17 + 0.2 * f || rr() > 0.25 + 0.75 * w) continue;
      const k = 0.3 + 3.6 * smooth(0.3, 1, f) + 2.6 * v / VD + 0.6 * (rr() - 0.5), snag = f > 0.72 && rr() < 0.35 * (f - 0.72) / 0.28;
      tree(Math.round(u), Math.round(SY - v - hAt(u, v)), v, (12 + 15 * rr()) * (0.65 + 0.35 * vnoise(u / 40, seed, 234)), 3.5 + 2.5 * rr(), k, snag);
    }
    for (let x = 0; x < 660; x++) {
      const v = vOf(x); if (v < 2 || v >= VD - 1) continue;
      const w = foggy(x, v); if (w < 0.05) continue;
      const base = Math.round(SY - v - hAt(x, v));
      for (let y = Math.max(0, base - 7); y <= Math.min(SH - 1, base + 12); y++) {
        const i = px(x, y); if (zb[i] < v - 2) continue;
        if (bayer(x, y) < smooth(base - 7, base + 1, y) * w) { g[i] = white(x, y); zb[i] = v; mb[i] = 0; }
      }
    }
  }
}
// ---- things that stand up -------------------------------------------------------------------------
const things = [], put = (bm, u, v, f, tree) => things.push({ bm, u: Math.round(u), v: Math.round(v), fog: f, isTree: tree }), plant = (tree, u, v, f) => things.push({ tree, u: Math.round(u), v: Math.round(v), fog: f });
const wet8 = (u, v) => { for (let dv = -3; dv <= 6; dv += 3) for (let du = -9; du <= 9; du += 3) if (water[at(clamp(u + du, 0, NW - 1), clamp(v + dv, 0, VD - 1))]) return true; return false; };
const slope = (u, v) => Math.hypot(hAt(u + 2, v) - hAt(u - 2, v), hAt(u, v + 2) - hAt(u, v - 2)) / 4;
const open = (u, v, max = 0.8) => u > 2 && u < NW - 2 && v > 1 && v < VD - 2 && coast(u, v) < -32 && !lakeAt(u, v) && !water[at(Math.round(u), Math.round(v))] && !wet8(Math.round(u), Math.round(v)) && slope(u, v) < max && !nearTrail(u, v, 9) && Math.hypot(u - TU, (v - TV) * 1.4) > 46;
{
  const rand = rng(2026), any = a => a[(rand() * a.length) | 0], land = (u, v) => MATS[mg[at(Math.round(u), Math.round(v))]] === 'land';
  const wooded = (u, v) => { const i = at(Math.round(u), Math.round(v)), m = MATS[mg[i]], h = hg[i]; return m === 'land' ? h < 100 : m === 'volc' ? VP(Math.min(1, vrelief(u, v).d)) < 0.17 + 0.05 * vnoise(u / 30, v / 30, 588) : m === 'crest' ? h < 48 : false; };
  const maples = Array.from({ length: 6 }, (_, i) => makeMaple(100 + i)), spruces = Array.from({ length: 6 }, (_, i) => makeSpruce(200 + i)), firs = Array.from({ length: 8 }, (_, i) => makeFir(300 + i));
  const bigleaf = Array.from({ length: 4 }, (_, i) => blobTree(800 + i, i & 1 ? 'larch' : 'sun', 36 + i * 2, 'bark', 5, 5.5));
  const larches = Array.from({ length: 6 }, (_, i) => { const r = rng(900 + i); return makeConifer(900 + i, 24 + (r() * 14 | 0), 10 + (r() * 4 | 0), 'larch', 6); });
  const pines = Array.from({ length: 5 }, (_, i) => makePonderosa(820 + i)), aspens = Array.from({ length: 7 }, (_, i) => makeAspen(600 + i)), snags = Array.from({ length: 5 }, (_, i) => makeSnag(730 + i));
  // The rainforest climbs the ridges and the volcano's foot. Where the fog is thickest only snags stand.
  for (let gv = -30; gv < VD; gv += 9) for (let gu = -10; gu < edgeE + 180; gu += 9) {
    const u = clamp(gu + rand() * 9, 3, NW - 4), v = clamp(gv + rand() * 9, 2, VD - 3), fa = forestAmt(u, v), r = rand(), f = fogAmt(u, v);
    if (rand() > fa * 0.78 || !open(u, v, 1.3) || !wooded(u, v)) continue;
    // Deeper in, the fog's own ranks take over (drawn above), so the planted forest thins out.
    if (f > 0.12 && rand() < smooth(0.12, 0.55, f)) continue;
    if (f < 0.2 && (nearTrail(u, v, 46) && rand() < 0.3 || rand() < 0.04)) { put(any(bigleaf), u, v, f, true); continue; }
    if (rand() < f * f * 0.5) put(any(snags), u, v, f, true); else plant(r < 0.45 ? any(maples) : r < 0.88 ? any(spruces) : any(firs), u, v, f);
  }
  // Firs in clumps over the parkland, the meadows and the lower slopes of the crest.
  for (let n = 0; n < 5200; n++) {
    const u = edgeE - 60 + rand() * 1000, v = rand() * VD, pa = parkAmt(u, v), h = hAt(u, v);
    if (fbm(u / 46, v / 40, 71, 3) < (pa > 0.4 || h > 20 ? 0.55 : 0.61) || forestAmt(u, v) > 0.2 || !open(u, v, 1.1) || h > 80) continue;
    if (!wooded(u, v)) continue;
    if (rand() < Math.max(larchAmt(u, v), dryAmt(u, v) * 1.2, burnAmt(u, v), eastAmt(u, v) * 0.8)) continue;
    plant(any(firs), u, v);
  }
  // Mount Monolith's lower flanks: firs in clumps up to the meadows under the ice, spruce where the
  // rainforest reaches round its west side.
  for (let n = 0; n < 2600; n++) {
    const u = VOLC.cu + (rand() * 2 - 1) * VOLC.ru, v = VOLC.cv + (rand() * 2 - 1) * VOLC.rv;
    if (MATS[mg[at(Math.round(u), Math.round(v))]] !== 'volc' || !wooded(u, v) || fbm(u / 34, v / 26, 589, 3) < 0.5 || !open(u, v, 1.6)) continue;
    plant(forestAmt(u, v) > 0.3 && rand() < 0.6 ? any(spruces) : any(firs), u, v, fogAmt(u, v));
  }
  for (let n = 0; n < 5200; n++) {
    const u = C.LB[0] - C.LB[2] - 50 + rand() * (C.LB[2] * 2 + 100), v = C.LB[1] - C.LB[3] - 40 + rand() * (C.LB[3] * 2 + 80), m = MATS[mg[at(clamp(Math.round(u), 0, NW - 1), clamp(Math.round(v), 0, VD - 1))]], hi = m === 'gran';
    if (m === 'fin' || rand() > larchAmt(u, v) * (hi ? (hAt(u, v) > 98 ? 0.16 : 0.5) : 0.8) || fbm(u / 40, v / 30, 120, 3) < (hi ? 0.5 : 0.52) || !open(u, v, 0.7)) continue;
    if (rand() < burnAmt(u, v) * 1.2) { if (rand() < 0.4) put(any(snags), u, v); continue; }
    plant(any(larches), u, v);
  }
  const step1 = (u, v) => { const h = hAt(u, v); return u > 1215 && v > 424 && v < 540 ? smooth(36, 42, h) * smooth(66, 58, h) : 0; };
  const band = (u, v) => Math.max(eastAmt(u, v), step1(u, v)) * (1 - larchAmt(u, v)) * (1 - burnAmt(u, v)) * (1 - 0.85 * sageAmt(u, v));
  for (let n = 0; n < 160; n++) {
    const cu = 1160 + rand() * 700, cv = rand() * 540, size = 8 + (rand() * 6 | 0), here = rand() < 0.5 * band(cu, cv) * (1 - 0.6 * dryAmt(cu, cv));
    for (let k = 0; k < size; k++) { const a = rand() * 6.283, d = Math.sqrt(rand()) * 9, u = cu + Math.cos(a) * d * 1.5, v = cv + Math.sin(a) * d * 0.8; if (here && open(u, v) && land(u, v)) plant(any(aspens), u, v); }
  }
  const stood = [];
  for (let n = 0; n < 1100; n++) {
    const u = 1240 + rand() * 680, v = rand() * 540;
    if (rand() > band(u, v) * (0.05 + 0.3 * Math.max(dryAmt(u, v), 0.5 * step1(u, v))) || !open(u, v) || !land(u, v) || stood.some(([a, b]) => Math.abs(a - u) < 24 && Math.abs(b - v) < 20)) continue;
    stood.push([u, v]); plant(any(pines), u, v);
  }
  for (let n = 0; n < 520; n++) { const u = 1690 + rand() * 230, v = 380 + rand() * 190; if (rand() < burnAmt(u, v) && open(u, v) && land(u, v)) put(any(snags), u, v, 0, true); }
  // Round 3's furniture of the ground: boulders and bushes in the open, granite slabs among the larches,
  // sage in the dry corner, ferns and logs on the forest floor, sea stacks off the beach, a fir on the island.
  const boulders = Array.from({ length: 6 }, (_, i) => makeBoulder(500 + i, 3 + i * 0.8));
  const slabs = Array.from({ length: 4 }, (_, i) => { const b = makeBoulder(520 + i, 5 + i * 1.5); for (let k = 0; k < b.d.length; k++) if (b.d[k] && b.d[k] !== INK) b.d[k] = R.granite[clamp(R.rock.indexOf(b.d[k]) + 1, 1, 5)]; return b; });
  const bushes = [0, 1, 2].map(i => makeBush(700 + i, 'huck')).concat([0, 1, 2].map(i => makeBush(710 + i, 'heather')), [0, 1].map(i => makeBush(720 + i, 'green')));
  const sages = [0, 1, 2].map(i => sageBush(850 + i)), burnt = Array.from({ length: 4 }, (_, i) => charred(740 + i)), young = Array.from({ length: 4 }, (_, i) => makeConifer(940 + i, 9 + i * 2, 6, 'kit', 3));
  const ferns = Array.from({ length: 6 }, (_, i) => makeFern(400 + i)), logs = Array.from({ length: 6 }, (_, i) => makeLog(i));
  const meadowy = (u, v) => forestAmt(u, v) < 0.3 && burnAmt(u, v) < 0.3 && dryAmt(u, v) < 0.3 && Math.hypot(u - TU, (v - TV) * 1.4) > 40;
  for (let n = 0; n < 700; n++) { const u = 420 + rand() * 1200, v = rand() * 640; if (!open(u, v) || !meadowy(u, v)) continue; const m = MATS[mg[at(Math.round(u), Math.round(v))]]; if (m !== 'land' && m !== 'moraine') continue; const rock = m === 'moraine' || rand() < 0.3; put(rock ? any(boulders) : any(bushes), u, v); }
  for (let n = 0; n < 300; n++) { const u = 1240 + rand() * 680, v = 380 + rand() * 320; if (MATS[mg[at(Math.round(u), Math.round(v))]] === 'gran' && open(u, v, 0.7) && rand() < 0.5) put(any(slabs), u, v); }
  for (let n = 0; n < 900; n++) { const u = 1300 + rand() * 620, v = rand() * 480; if (rand() < sageAmt(u, v) * 0.5 && open(u, v) && land(u, v)) put(any(sages), u, v); }
  for (let n = 0; n < 400; n++) { const u = 1690 + rand() * 230, v = 380 + rand() * 190; if (rand() < burnAmt(u, v) && open(u, v) && land(u, v)) { if (rand() < 0.5) put(any(burnt), u, v, 0, true); else plant(any(young), u, v); } }
  for (let n = 0; n < 4000; n++) { const u = rand() * 720, v = rand() * VD; if (forestAmt(u, v) > 0.6 && fogAmt(u, v) < 0.25 && open(u, v, 1.1) && wooded(u, v)) things.push({ bm: any(ferns), u: Math.round(u), v: Math.round(v), fern: true }); }
  for (let n = 0; n < 120; n++) { const u = rand() * 720, v = rand() * VD; if (forestAmt(u, v) > 0.7 && fogAmt(u, v) < 0.25 && open(u, v, 0.8) && wooded(u, v)) put(any(logs), u, v); }
  { const seen = []; for (let n = 0; n < 4000 && seen.length < 6; n++) { const u = rand() * 520, v = rand() * 420, c = coast(u, v); if (c < 22 || c > 110 || seen.some(([a, b]) => Math.hypot(a - u, b - v) < 70)) continue; seen.push([u, v]); const H = 16 + (rand() * 34 | 0); put(seaStack(seen.length, H, Math.round(H * 0.45)), u, v); } }
  plant(any(firs), ISLE[0], ISLE[1]);
}
// Far first. A thing the fog touches, or that nearer ground partly hides, is painted into the ground
// picture for good: clipped where it is hidden, its foot lost in the fog and the rest of it paled, the
// more so the deeper into the fog it stands. Every other thing is handed to the scene whole, to be
// drawn each frame.
things.sort((a, b) => b.v - a.v);
const live = [];
for (const th of things) {
  const h = hAt(th.u, th.v), fy = Math.round(SY - th.v - h), ft = th.fog ? fogTop(th.u, th.v) : -1;
  const blit = (bm, sx, sy) => { for (let j = 0; j < bm.h; j++) for (let i = 0; i < bm.w; i++) { const c = bm.d[j * bm.w + i], x = sx + i, y = sy + j; if (!c || x < 0 || y < 0 || x >= NW || y >= SH || zb[px(x, y)] < th.v - 3) continue; const up = h + fy - y; g[px(x, y)] = th.fog > 0.02 && bayer(x, y) < (ft - up) / 5 + 0.15 ? fogInk(x, y, ft - up) : c; } };
  const each = fn => { if (th.tree) for (const p of th.tree.parts) fn(p.bm, th.u + p.x, fy + p.y); else fn(th.bm, th.u - (th.bm.ox || 0), fy - (th.bm.oy || 0)); };
  let n = 0, seen = 0;
  each((bm, sx, sy) => { for (let j = 0; j < bm.h; j++) for (let i = 0; i < bm.w; i++) { if (!bm.d[j * bm.w + i]) continue; n++; const x = sx + i, y = sy + j; if (x >= 0 && y >= 0 && x < NW && y < SH && zb[px(x, y)] >= th.v - 3) seen++; } });
  if (!(th.fog > 0.22) && seen >= n * 0.97) { live.push(th.tree ? { tree: th.tree, x: th.u, y: fy, v: th.v } : { bm: th.bm, x: th.u, y: fy, v: th.v, fern: th.fern, isTree: th.isTree }); continue; }
  if (seen >= n * 0.12) each(blit);
}

for (const th of live) {
  if (!th.tree && !th.isTree) continue;
  const rx = (th.tree ? th.tree.w : th.bm.w) * 0.42;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -Math.ceil(rx); dx <= rx; dx++) { if (sq(dx / rx) + sq(dy / 3.2) > 1) continue; const x = th.x + dx + 2, y = th.y + dy - 1; if (x < 0 || y < 0 || x >= NW || y >= SH) continue; const i = px(x, y); if (Math.abs(zb[i] - th.v) < 5 && g[i] !== INK) g[i] = SHADE[g[i]]; }
}
const toY = (u, v) => Math.round(SY - v - hAt(u, v));
return { g, depth: zb, mat: mb, MATS, hAt, toY, things: live, C, volc: VOLC, spires: SP, peak: PF, routes, water, trail, coast, forestAmt, fogAmt, dryAmt, sageAmt, parkAmt, larchAmt, burnAmt, lakeAt, slope, matAt: (u, v) => MATS[mg[at(clamp(Math.round(u), 0, NW - 1), clamp(Math.round(v), 0, VD - 1))]] };
}

// ---- for the scene --------------------------------------------------------------------------------
// The scene works in positions on the map picture: x across, y down. Below is the land in those terms,
// under the names the scene took from round 3's terrain.js. Every position is worked out from the
// layout above, so moving a place there moves everything that belongs to it.
export const LAND = buildLand();
const C = LAND.C, sxy = (u, v) => [Math.round(u), LAND.toY(u, v)];
// How far from the camera the ground drawn at a spot of the picture is. Sky is past everything.
const vAt = (x, y) => { x = Math.round(x); y = Math.round(y); return x < 0 || y < 0 || x >= NW || y >= SH ? 1e9 : LAND.depth[y * NW + x]; };
// The highest row of the picture where a column shows one kind of ground: a summit's top.
const topOf = (x, kind) => { const k = LAND.MATS.indexOf(kind); x = Math.round(x); for (let y = 0; y < SH; y++) if (LAND.mat[y * NW + x] === k) return y; return 0; };
export const OX = 0, OY = 0;
export const T = { x: C.T[0], y: LAND.toY(C.T[0], C.T[1]) };
// The trail conditions board stands just north-east of the junction. The cats keep to it (cats.js).
export const KIOSK = { x: C.T[0] + 28, y: LAND.toY(C.T[0] + 28, C.T[1] + 22) };
export async function loadBake() { return null; }
// ---- where things live ----------------------------------------------------------------------------
// Every sign and every animal on the map is placed by a rule read from the land: the kind of ground,
// its height, how far it is from a trail, whether it can be seen. No position is written down, so a
// change to the land takes them all with it. Positions here are in the world (u east, v away from the
// camera) until the end, where they become spots on the picture.
function habitat() {
  const S = LAND, at = (u, v) => clamp(Math.round(v), 0, VD - 1) * NW + clamp(Math.round(u), 0, NW - 1), rnd = rng(4040);
  // How far each spot is from the nearest trail, in pixels up to 255, worked out once.
  const tdist = new Uint8Array(NW * VD).fill(255);
  for (let i = 0; i < tdist.length; i++) if (S.trail[i]) tdist[i] = 0;
  for (let v = 0; v < VD; v++) for (let u = 0; u < NW; u++) { const i = v * NW + u; let d = tdist[i]; if (u) d = Math.min(d, tdist[i - 1] + 1); if (v) d = Math.min(d, tdist[i - NW] + 1, u ? tdist[i - NW - 1] + 1 : 255, u < NW - 1 ? tdist[i - NW + 1] + 1 : 255); tdist[i] = d; }
  for (let v = VD - 1; v >= 0; v--) for (let u = NW - 1; u >= 0; u--) { const i = v * NW + u; let d = tdist[i]; if (u < NW - 1) d = Math.min(d, tdist[i + 1] + 1); if (v < VD - 1) d = Math.min(d, tdist[i + NW] + 1, u < NW - 1 ? tdist[i + NW + 1] + 1 : 255, u ? tdist[i + NW - 1] + 1 : 255); tdist[i] = d; }
  const trailFar = (u, v) => tdist[at(u, v)];
  const fromT = (u, v) => Math.hypot(u - C.T[0], (v - C.T[1]) * 1.4);
  // Ground an animal or a sign can stand on: dry land, off the water and the trail, not too steep.
  const firm = (u, v, steep = 0.8) => u > 3 && u < NW - 3 && v > 2 && v < VD - 2 && !S.water[at(u, v)] && S.coast(u, v) < -32 && !S.lakeAt(u, v) && S.slope(u, v) < steep;
  // A spot shows on the picture if the ground drawn there is that spot and nothing nearer stands in front
  // of the few pixels above it (a sign's board, an animal's back).
  const shows = (u, v, up = 18) => { const x = Math.round(u), y = S.toY(u, v); if (x < 16 || x >= NW - 40 || y < up + 2 || y >= SH - 3) return false; if (Math.abs(S.depth[y * NW + x] - v) > 4) return false; for (let k = 5; k <= up; k += 6) if (S.depth[(y - k) * NW + x] < v - 3) return false; return true; };
  // Points over the whole world in an order the dice choose, so what is found first is never one corner.
  const GRID = []; for (let v = 3; v < VD - 3; v += 5) for (let u = 3; u < NW - 3; u += 5) GRID.push([u + rnd() * 5, v + rnd() * 5]);
  for (let i = GRID.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0, t = GRID[i]; GRID[i] = GRID[j]; GRID[j] = t; }
  const taken = [], apartFrom = (list, u, v, d) => list.every(([a, b]) => Math.hypot(a - u, (b - v) * 1.4) >= d);
  // The first n spots that keep a rule, apart from each other and from whatever was placed before.
  const find = (n, rule, apart = 40, from = GRID) => { const out = []; for (const [u, v] of from) { if (out.length >= n) break; if (apartFrom(out, u, v, apart) && apartFrom(taken, u, v, 34) && rule(u, v)) out.push([u, v]); } taken.push(...out); return out; };
  // The spot that scores best among those that keep a rule.
  const best = (rule, score, from = GRID) => { let top = null, s0 = -Infinity; for (const [u, v] of from) { if (!rule(u, v)) continue; const s = score(u, v); if (s > s0) { s0 = s; top = [u, v]; } } if (top) taken.push(top); return top; };
  // Spots just beside a trail, between two fractions of its length, on either side of it.
  const beside = (k, a, b, off = 12) => { const P = catmull(C.trails[k]), out = []; for (let n = Math.floor(P.length * a); n < P.length * b - 1; n += 4) { const [u0, v0] = P[n], [u1, v1] = P[n + 1], l = Math.hypot(u1 - u0, v1 - v0) || 1; for (const s of [1, -1]) out.push([u0 - (v1 - v0) / l * off * s, v0 + (u1 - u0) / l * off * s]); } return out; };
  const coulee = (u, v) => { let d = 1e9; for (const [a, b] of catmull(C.coulee)) d = Math.min(d, Math.hypot(a - u, b - v)); return d; };
  const signable = (u, v) => apartFrom(taken, u, v, 70) && firm(u, v, 0.9) && trailFar(u, v) >= 4 && shows(u, v, 20) && S.g[S.toY(u, v) * NW + Math.round(u)] !== R.fog[2];
  const near = (p, d) => (u, v) => Math.hypot(u - p[0], v - p[1]) < d;
  const ring = (p, r0, r1) => GRID.filter(([u, v]) => { const d = Math.hypot(u - p[0], (v - p[1]) * 1.4); return d >= r0 && d <= r1; });
  const sp = S.spires, vo = S.volc, tarn = S.C.lakes.find(l => l[4] === 'tarn'), wsum = [sp.cu + sp.west * sp.wide, sp.cv];
  // The col: the lowest point on the line from Mount Monolith's summit to the west end of the Spires.
  let col = null; for (let t = 0.25, lo = 1e9; t < 0.95; t += 0.01) { const u = lerp(vo.cu, wsum[0], t), v = lerp(vo.cv, wsum[1], t) - 60, h = S.hAt(u, v); if (h < lo) { lo = h; col = [u, v]; } }
  const SIGNS = {
    'about-lake': find(1, signable, 0, beside(0, 0.03, 0.12)),
    'yak-shave': find(1, (u, v) => signable(u, v) && S.forestAmt(u, v) < 0.1 && S.parkAmt(u, v) < 0.3, 0, beside(0, 0.12, 0.35)),
    'stack-trace': find(1, (u, v) => signable(u, v) && S.forestAmt(u, v) > 0.45 && S.forestAmt(u, v) < 0.8, 0, beside(0, 0.2, 0.8)),
    monorepo: find(1, (u, v) => signable(u, v) && S.forestAmt(u, v) > 0.85 && S.fogAmt(u, v) < 0.3, 60, beside(0, 0.2, 0.9)),
    'scope-creep': find(1, (u, v) => signable(u, v) && S.matAt(u, v) === 'moraine', 0, beside(1, 0.7, 1)),
    segfault: find(1, (u, v) => signable(u, v) && S.slope(u, v) > 0.35, 0, beside(1, 0.45, 0.75)),
    'merge-conflict': col ? find(1, signable, 0, ring(col, 0, 50)) : [],
    rollback: find(1, (u, v) => signable(u, v) && S.matAt(u, v) === 'land' && S.hAt(u, v) > 40 && S.hAt(u, v) < 66, 0, beside(2, 0.4, 0.8)),
    'feature-flag': tarn ? find(1, signable, 0, ring(tarn, tarn[2] + 6, tarn[2] + 24)) : [],
    hotfix: find(1, (u, v) => S.burnAmt(u, v) > 0.6 && signable(u, v)),
    postmortem: find(1, (u, v) => S.burnAmt(u, v) > 0.55 && signable(u, v), 70),
    'cron-job': find(1, (u, v) => S.dryAmt(u, v) > 0.3 && signable(u, v) && coulee(u, v) > 40 && coulee(u, v) < 56),
    'tech-debt': find(1, (u, v) => S.sageAmt(u, v) > 0.7 && signable(u, v) && coulee(u, v) > 90),
    // Off By One Peak: the top of the highest of the forested foothills round Mount Monolith's foot.
    'off-by-one': [best((u, v) => Math.hypot((u - vo.cu) / vo.ru, (v - vo.cv) / vo.rv) < 1.4 && S.matAt(u, v) === 'land' && S.hAt(u, v) < vo.H * 0.3 && signable(u, v), (u, v) => S.hAt(u, v))].filter(Boolean),
    dependency: find(1, (u, v) => signable(u, v) && S.hAt(u, v) > 80, 0, beside(2, 0.85, 1)),
    'cache-miss': find(1, (u, v) => { const c = S.coast(u, v); return c > -14 && c < -7 && shows(u, v, 20) && S.g[S.toY(u, v) * NW + Math.round(u)] !== R.fog[2]; }),
    latency: find(1, (u, v) => { const c = S.coast(u, v); return c > -14 && c < -7 && shows(u, v, 20) && S.g[S.toY(u, v) * NW + Math.round(u)] !== R.fog[2]; }, 160)
  };
  // The elk herd keeps to a roomy flat in the parkland well away from the Trailhead.
  const roomy = (u, v) => [[-26, 0], [26, 0], [0, -18], [0, 18]].every(([a, b]) => firm(u + a, v + b, 0.5));
  const herd = best((u, v) => S.parkAmt(u, v) > 0.5 && S.forestAmt(u, v) < 0.15 && fromT(u, v) > 120 && trailFar(u, v) > 16 && firm(u, v, 0.5) && shows(u, v, 12) && roomy(u, v), (u, v) => S.parkAmt(u, v) + 0.3 * rnd());
  // Marmots sun on rocks: parkland or moraine with a steep bit of ground right beside them.
  const rocky = (u, v) => [[-6, 0], [6, 0], [0, 5], [0, -5]].some(([a, b]) => S.slope(u + a, v + b) > 0.9);
  const marmots = find(3, (u, v) => (S.parkAmt(u, v) > 0.3 || S.matAt(u, v) === 'moraine') && firm(u, v, 1.2) && shows(u, v, 8) && rocky(u, v), 140);
  // Goats on the granite: one nanny and kid on the step under Proficiency Peak, one pair higher up.
  const slab = (lo, hi) => (u, v) => S.matAt(u, v) === 'gran' && S.hAt(u, v) > lo && S.hAt(u, v) < hi && firm(u, v, 0.7) && shows(u, v, 12);
  const goats = [...find(1, slab(74, 100)), ...find(1, slab(100, 160))];
  // Bighorn sheep on the rim of the coulee, in one band.
  const rim = (u, v) => S.dryAmt(u, v) > 0.5 && coulee(u, v) > 16 && coulee(u, v) < 52 && firm(u, v, 0.8) && shows(u, v, 12);
  const band = find(1, rim), sheep = band.length ? [band[0], ...find(3, rim, 20, ring(band[0], 14, 70))] : [];
  // Squirrels and chipmunks in the open meadow near trees, a bear at the edge of the forest.
  const squirrels = find(7, (u, v) => S.forestAmt(u, v) < 0.3 && S.dryAmt(u, v) < 0.3 && S.larchAmt(u, v) < 0.2 && S.hAt(u, v) < 45 && trailFar(u, v) > 6 && fromT(u, v) > 50 && firm(u, v) && shows(u, v, 6), 70);
  const bear = find(1, (u, v) => S.forestAmt(u, v) > 0.12 && S.forestAmt(u, v) < 0.35 && S.hAt(u, v) < 35 && S.dryAmt(u, v) < 0.2 && fromT(u, v) > 160 && firm(u, v, 0.6) && shows(u, v, 12))[0];
  // In the sea: jellyfish not far out, the whale farther out, the ferry's course past both.
  const clearSea = new Set(R.sea), sea = (lo, hi) => (u, v) => { const c = S.coast(u, v); return c > lo && c < hi && S.toY(u, v) < SH - 50 && shows(u, v, 4) && clearSea.has(S.g[S.toY(u, v) * NW + Math.round(u)]) && clearSea.has(S.g[(S.toY(u, v) - 6) * NW + Math.round(u)]); };
  const jelly = find(8, sea(14, 80), 26), whale = best(sea(90, 150), (u, v) => -Math.abs(S.coast(u, v) - 115) + 6 * rnd());
  const out = (u, v) => [Math.round(u), S.toY(u, v)];
  // The ferry's course runs where the sea is 60 out from the shore, from past the west edge of the map to past its foot.
  const seaV = u => { for (let v = 0; v < VD; v++) if (S.coast(u, v) < 60) return v; return VD; }, seaU = v => { for (let u = 0; u < NW; u++) if (S.coast(u, v) < 60) return u; return 0; };
  const footV = S.toY(0, 0) - SH - 28, ferry = [[-30, S.toY(-30, seaV(-30))], [seaU(footV), SH + 28]];
  const herdAt = herd ? out(...herd) : null;
  return {
    tdist, firm,
    signs: Object.entries(SIGNS).filter(([, p]) => p && p.length).map(([k, p]) => [...out(...p[0]), k]),
    elk: herdAt ? [[herdAt[0], herdAt[1], 0], [herdAt[0] + 34, herdAt[1] + 14, 1], [herdAt[0] - 20, herdAt[1] + 26, 1], [herdAt[0] + 16, herdAt[1] + 40, 0]] : [],
    marmots: marmots.map(p => out(...p)),
    goats: goats.flatMap(p => { const [x, y] = out(...p); return [[x, y, 0], [x + 16, y + 6, 1]]; }),
    sheep: sheep.map((p, n) => [...out(...p), n & 1]),
    squirrels: squirrels.map((p, n) => [...out(...p), n % 3 === 0 ? 1 : 0]),
    bear: bear ? out(...bear) : out(...C.T),
    jelly: jelly.map((p, n) => [...out(...p), n % 3 ? 0 : 1]),
    whale: whale ? out(...whale) : [0, 0],
    ferry,
    // Birds circle over the elk's parkland, the dry corner and the granite; gulls over the sea by the beach.
    flocks: [
      herdAt && { cx: herdAt[0], cy: herdAt[1] + 40, rx: 130, ry: 44, n: 3, lift: 56, w: 0.14 },
      ...find(1, (u, v) => S.sageAmt(u, v) > 0.6 && shows(u, v, 4), 0).map(p => ({ cx: out(...p)[0], cy: out(...p)[1], rx: 90, ry: 36, n: 1, lift: 84, w: 0.11, glide: true })),
      goats.length && { cx: out(...goats[0])[0], cy: out(...goats[0])[1], rx: 70, ry: 26, n: 1, lift: 70, w: -0.13, glide: true },
      ...find(1, sea(24, 50), 0).map(p => ({ cx: out(...p)[0], cy: out(...p)[1], rx: 80, ry: 30, n: 2, lift: 34, w: -0.16, gull: true })),
      ...find(1, sea(4, 20), 120).map(p => ({ cx: out(...p)[0], cy: out(...p)[1], rx: 34, ry: 14, n: 1, lift: 22, w: 0.25, gull: true }))
    ].filter(Boolean)
  };
}
export function buildTerrain() {
  // Each trail as points on the picture, close together, each with its depth.
  const line = pts => catmull(pts).filter((_, n, a) => n % 6 === 0 || n === a.length - 1).map(([u, v]) => [u, LAND.toY(u, v), v]);
  // The lake loop ends where it began: back along its first stretch to the junction. The Spires trail
  // ends at base camp; what lies beyond is the boot track on the ice.
  const home = C.trails[0].slice(0, 6).reverse().slice(1), camp = C.trails[1].findIndex(p => p[0] === C.camp[0] && p[1] === C.camp[1]) + 1;
  const lines = { lake: line([...C.trails[0], ...home]), stack: line(C.trails[2]), spires: line(C.trails[1].slice(0, camp)) };
  const H = habitat(), lake = C.lakes[0], peak = LAND.peak, sp = LAND.spires, shore = sxy(lake[0] + lake[2] + 8, lake[1] + 2);
  const flagOn = (x, v, kind) => { const y = LAND.toY(x, v); return { x: Math.round(x), y, lift: y - topOf(x, kind) }; };
  const spots = {
    signpost: sxy(C.T[0] - 4, C.T[1] + 8), kiosk: [KIOSK.x, KIOSK.y],
    tents: [[...sxy(C.camp[0], C.camp[1]), 'tent'], [...sxy(C.camp[0] + 18, C.camp[1] - 6), 'red']],
    journal: sxy(lake[0] + lake[2] + 16, lake[1] - 6), lakeShore: shore,
    // Where each destination's name is pinned: on the lake, on Proficiency Peak's wall, on the ice under the Spires.
    places: { lake: [lake[0], LAND.toY(lake[0], lake[1]) - 8], stack: [peak.cu, topOf(peak.cu, 'fin') + 44], spires: [sp.cu + 10, LAND.toY(sp.cu, 598)] },
    // A flag for each finished destination: at the lake shore, on Proficiency Peak, on the Spires' highest summit.
    flags: { lake: { x: shore[0], y: shore[1], lift: 0 }, stack: flagOn(peak.cu, peak.cv - 9, 'fin'), spires: flagOn(sp.top, sp.cv - 34, 'wall') },
    // Signs and animals, each placed by its rule (habitat, above).
    signs: H.signs, elk: H.elk, goats: H.goats, sheep: H.sheep, marmots: H.marmots, squirrels: H.squirrels, bear: H.bear, jelly: H.jelly, whale: H.whale, ferry: H.ferry
  };
  const forestAmt = (x, y) => { const v = vAt(x, y); return v > VD ? 0 : LAND.forestAmt(x, v); };
  const coast = (x, y) => { const v = vAt(x, y); return v > VD ? -999 : LAND.coast(x, v); };
  // Nothing nearer stands in front of a sign's board or the trail conditions board.
  for (const [sx, sy, , half = 7] of [...spots.signs, [KIOSK.x, KIOSK.y, 'kiosk', 15]]) for (let i = LAND.things.length - 1; i >= 0; i--) {
    const th = LAND.things[i], w = th.tree ? th.tree.w : th.bm.w, h = th.tree ? th.tree.h : th.bm.h;
    if (th.y > sy - 3 && th.y - h < sy + 1 && Math.abs(th.x - sx) < w / 2 + half) LAND.things.splice(i, 1);
  }
  // The sea's corner, for the swells and the wash on the beach (critters.js): how wide and how tall the
  // corner is, found from the shore; then for each spot of it, whether a swell shows there and when, or
  // how far it is from the water's edge.
  const seaW = (() => { for (let u = 0; u < NW; u++) { let wet = false; for (let v = 0; v < 70 && !wet; v += 2) wet = LAND.coast(u, v) > -8; if (!wet) return u + 8; } return NW; })();
  const seaTop = (() => { let top = 0; for (let u = 0; u < seaW; u += 2) for (let v = top; v < VD; v++) if (LAND.coast(u, v) > -8) top = v; return Math.max(0, LAND.toY(0, top) - 8); })();
  const SEA = { y0: seaTop, w: seaW, h: SH - seaTop }; for (const k of ['ph', 'gate', 'shore']) SEA[k] = new Uint8Array(SEA.w * SEA.h);
  const wet = new Set(R.sea), fog = new Set(R.fog);
  for (let y = SEA.y0; y < SH; y++) for (let x = 0; x < SEA.w; x++) {
    const i = y * NW + x, v = LAND.depth[i]; if (v >= VD || fog.has(LAND.g[i])) continue;
    const cs = LAND.coast(x, v), j = (y - SEA.y0) * SEA.w + x;
    if (cs > -4 && cs < 8) SEA.shore[j] = 1 + Math.round((cs + 4) * 8);
    else if (cs >= 8 && wet.has(LAND.g[i]) && vnoise(x / 22, y / 9, 85) > (cs < 60 ? 0.4 : 0.54)) { SEA.gate[j] = cs < 40 ? 2 : 1; SEA.ph[j] = Math.floor(frac((cs + 7 * Math.sin(x / 37 + y / 61)) / 24) * 240); }
  }
  const open = (x, y) => { const v = vAt(x, y); return v < VD && H.firm(x, v, 1.0); };
  const nearTrail = (x, y, r) => { const v = vAt(x, y); return v < VD && H.tdist[Math.round(v) * NW + Math.round(x)] < r; };
  const flat = l => l.map(p => [p[0], p[1]]);
  return { g: LAND.g, vAt, things: LAND.things, spots, lines, trails: { lake: flat(lines.lake), stack: flat(lines.stack), spires: flat(lines.spires) }, trackPix: [], forestAmt, coast, open, nearTrail, sea: SEA, mist: mistBox(H), flocks: H.flocks, make: { ferry, whale, sheep, squirrel } };
}

// Where the drifting mist may go (critters.js draws it). The mist comes out of the standing fog in the
// west, drifts east over the forest and thins away before the forest ends, so what it needs from the
// land is, for each screen row, where the standing fog gives out (edge) and where the sea meets the
// beach (shore, -1 on rows with no sea), and a coarse picture, two pixels to a cell, of where it may
// lie: 0 anywhere in the forest, 1 only thinly (over the trail, just in from the beach, over open
// ground), 2 not at all (the sea and the beach, the sky, the mountains).
function mistBox(H) {
  const at = (x, y) => y * NW + x, landMat = LAND.MATS.indexOf('land');
  const isFoggy = (x, y) => { const v = LAND.depth[at(x, y)]; return v < VD && LAND.fogAmt(x, v) > 0.35 && LAND.coast(x, v) < -10; };
  const woods = (x, y) => { const v = LAND.depth[at(x, y)]; return v < VD && LAND.forestAmt(x, v) > 0.3; };
  // The rows the forest covers, and how far east the mist can reach on any of them.
  let y0 = SH; for (let y = 0; y < SH && y0 === SH; y += 2) for (let x = 0; x < 700; x += 3) if (woods(x, y)) { y0 = Math.max(0, y - 16); break; }
  const raw = new Float32Array(SH).fill(-1), edge = new Int16Array(SH), shore = new Int16Array(SH).fill(-1);
  // Every other row and every other column is plenty for an edge that is smoothed anyway.
  for (let y = y0; y < SH; y++) {
    if ((y - y0) & 1) { shore[y] = shore[y - 1]; continue; }
    for (let x = 0; x < 760; x += 2) if (woods(x, y) && !isFoggy(x, y)) { raw[y] = x; break; }
    const v0 = LAND.depth[at(0, y)];
    if (v0 < VD && LAND.coast(0, v0) > 0) for (let x = 1; x < 760; x += 2) { const v = LAND.depth[at(x, y)]; if (v < VD && LAND.coast(x, v) < 0) { shore[y] = x; break; } }
  }
  // The fog's edge is smoothed over 41 rows so a bank keeps its shape as it leaves the fog.
  for (let y = y0; y < SH; y++) { let s = 0, n = 0; for (let d = -20; d <= 20; d++) { const r = raw[y + d]; if (y + d >= y0 && y + d < SH && r >= 0) { s += r; n++; } } edge[y] = n ? Math.round(s / n) : 0; }
  let x1 = 0; for (let y = y0; y < SH; y++) x1 = Math.max(x1, edge[y] + 340); x1 = Math.min(NW, x1 + (x1 & 1));
  const M = { x1, y0, w: x1 >> 1, h: Math.ceil((SH - y0) / 2), edge, shore };
  M.gate = new Uint8Array(M.w * M.h);
  for (let cy = 0; cy < M.h; cy++) for (let cx = 0; cx < M.w; cx++) {
    const x = cx * 2 + 1, y = Math.min(SH - 1, y0 + cy * 2 + 1), i = at(x, y), v = LAND.depth[i];
    let g = 0;
    if (v >= VD || LAND.mat[i] !== landMat) g = 2;
    else {
      const cs = LAND.coast(x, v) + 16 * vnoise(y / 6, 5, 135);
      // Over the standing fog it adds nothing but grey, so it lies there thinly or not at all.
      const f = LAND.fogAmt(x, v);
      if (cs > -10 || f > 0.62) g = 2; else if (cs > -42 || f > 0.4 || LAND.forestAmt(x, v) < 0.25 || LAND.lakeAt(x, v) || H.tdist[Math.round(v) * NW + x] < 7) g = 1;
    }
    M.gate[cy * M.w + cx] = g;
  }
  return M;
}
