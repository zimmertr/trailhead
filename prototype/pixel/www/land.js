// Round 4's map (ROUND4.md, section 4a), for the scene and for relief.html, which shows it whole.
// The world is a height for every spot (u east, v away from the camera). A spot is drawn at screen
// (u, SY - v - height), nearest first, so ground and mountains are one surface and near slopes hide
// far ones.
import { R, INK, BM, outline, KIND, SHADE, LIGHT, RAMP_OF, STEP_OF, veilTable, TAU, clamp, lerp, smooth, frac, sq, rng, hash, vnoise, fbm, bayer, pick, catmull } from './core.js';
import { paintMonolith, monolithSky, MW as PMW, MH as PMH, MCX as PMCX, TOPY as PTOPY } from './monolith.js';
import { blobTree, seaStack, sageBush, charred } from './scenery.js';
import { ferry, whale, sheep, squirrel } from './mapfauna.js';
import { makeFlowers, swaying, makeMaple, makeTwisted, makeAspen, makePonderosa, makeSpruce, makeFir, makeConifer, makeSnag, makeBoulder, makeBush, makeFern, makeLog } from './sprites.js';

const NW = 1920, SH = 1080, VD = 740, SY = SH + 52;
const rdg = n => 1 - Math.abs(2 * n - 1);
const prof = pts => x => { if (x <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [xa, ha] = pts[i - 1], [xb, hb] = pts[i]; return lerp(ha, hb, (x - xa) / (xb - xa)); } return pts[pts.length - 1][1]; };

export { NW, SH as NH, VD, SY };
// B is the bake (readBake, below): with it, the heights, the water and the picture are read, not worked out.
export function buildLand(B = null) {
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
    // A round dome, stretched column by column so that what shows against the sky is the outline of the
    // painted mountain (monolith.js).
    const round = VP(Math.abs(du)), want = monolithSky((u - cu) * 300 / ru), fit = round > 0.06 ? clamp(want / round, 0.55, 1.5) : 1;
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

// Its foot (D9): a fan of talus spilled from the wall onto the step in front, widest at its toe, and a
// patch of old snow lying in the shade where the lower tower meets the prow. d is how far in front of
// the wall's foot a spot lies.
const talusAt = (u, v) => { if (!PF) return 0; const d = PF.cv - 7 - v + 4 * (vnoise(u / 9, 2, 905) - 0.5); if (d < -2 || d > 50) return 0; const dx = u - PF.cu + 8, hw = PF.w * 0.38 + d * 0.6 + 8 * (vnoise(v / 7, 5, 906) - 0.5); return smooth(48, 20, d) * smooth(hw, hw - 22, Math.abs(dx)) * smooth(-2, 2, d); };
const snowPatch = (u, v) => { if (!PF) return false; const d = PF.cv - 7 - v, dx = u - PF.cu; return Math.hypot((dx + 30) / 20, (d - 5) / 8) + 0.35 * (vnoise(u / 4, v / 3, 907) - 0.5) < 1; };
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
// The dry country is a basalt tableland that rises out of the meadow. On it stand the scabland's benches
// (D10): flat-topped mesas of basalt in one or two steps, whose cliffs face the camera, since a rise that
// climbs toward the camera hides its own riser. In the far corner they give way to low, rolling Palouse hills.
const palAmt = (u, v) => smooth(0.5, 0.68, dryS(u, v));
const mesa = (u, v) => { const k = fbm(u / 64, v / 34, 36, 3) + 0.04 * (vnoise(u / 6, v / 4, 37) - 0.5); return 12 * (smooth(0.52, 0.545, k) + smooth(0.63, 0.655, k)) * smooth(0.12, 0.3, dryS(u, v)) * (1 - palAmt(u, v)); };
const plate = (u, v) => { const raw = 34 * smooth(0.02, 0.4, dryS(u, v)) + 10 * fbm(u / 80, v / 60, 33, 2) * dryAmt(u, v), b = raw + mesa(u, v); return b + palAmt(u, v) * 22 * (fbm(u / 46, v / 30, 34, 2) - 0.3); };
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
volcano(640, 600, 300, 150, 290);
// Foothills round the volcano's foot, so it rises out of forest and not off a lawn.
for (const [cu, cv, ru, rv, H] of [[500, 478, 96, 44, 42], [770, 474, 84, 40, 38], [858, 530, 70, 52, 46], [420, 540, 80, 52, 44]]) horn('land', cu, cv, ru, rv, H, { pow: 1.15 });
plateau('land', 640, 436, 112, 34, 30, 0.1); C.bench = F[F.length - 1];
C.lakes.push([640, 440, 46, 14, 'lake']);
// Its west end rises gently from behind Little Tahoma, so no peak of it stands alone beside the tooth.
range('crest', 800, NW + 60, 716, u => (112 + 20 * vnoise(u / 70, 1, 64)) * lerp(0.35, 1, smooth(820, 930, u)), 64, { front: 40, back: 18 });
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
plateau('gran', 1745, 598, 150, 42, 110, 0.08); plateau('gran', 1471, 574, 205, 50, 84, 0.08); C.step2 = F[F.length - 1];
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
if (B) { hg.set(B.hg); mg.set(B.mg); } else {
for (let v = 0; v < VD; v++) for (let u = 0; u < NW; u++) hg[at(u, v)] = coast(u, v) > 0 ? 0 : Math.max(0, base(u, v));
for (const f of F) { const m = MATS.indexOf(f.mat); for (let v = Math.max(0, Math.floor(f.v0)); v < Math.min(VD, f.v1); v++) for (let u = Math.max(0, Math.floor(f.u0)); u < Math.min(NW, f.u1); u++) { const h = f.fn(u, v), i = at(u, v); if (h > hg[i]) { hg[i] = h; mg[i] = m; } } }
}
const hAt = (u, v) => hg[at(clamp(Math.round(u), 0, NW - 1), clamp(Math.round(v), 0, VD - 1))];
// A valley's line is bent as it goes, so no reach of it is ruled. Its two ends stay where they are.
const wander = (all, amp, seed) => { let len = 0; const total = all.reduce((t, p, n) => t + (n ? Math.hypot(p[0] - all[n - 1][0], p[1] - all[n - 1][1]) : 0), 0); return all.map(([u, v], n) => { if (n) len += Math.hypot(u - all[n - 1][0], v - all[n - 1][1]); const a = all[Math.max(0, n - 4)], b = all[Math.min(all.length - 1, n + 4)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, k = amp * (2 * vnoise(len / 70, seed, 77) - 1 + 0.5 * Math.sin(len / 26 + seed)) * smooth(0, 50, len) * smooth(total, total - 50, len); return [u - (b[1] - a[1]) / l * k, v + (b[0] - a[0]) / l * k * 0.6]; }); };
for (const g of C.dig) g.line = wander(catmull(g.pts), 16, g.pts.length);
// Valleys: the ground is lowered along a line, most in the middle.
if (!B) for (const { d, w, line } of C.dig) {
  const k = new Float32Array(NW * VD);
  for (const [pu, pv] of line) for (let dv = -w; dv <= w; dv++) for (let du = -w; du <= w; du++) { const u = Math.round(pu + du), v = Math.round(pv + dv), dd = Math.hypot(du, dv); if (dd < w && u >= 0 && v >= 0 && u < NW && v < VD) k[at(u, v)] = Math.max(k[at(u, v)], sq(1 - dd / w)); }
  for (let i = 0; i < k.length; i++) if (k[i] && MATS[mg[i]] === 'land' && hg[i] > 0) hg[i] = Math.max(0.5, hg[i] - d * k[i]);
}
// Then each is cut to an even grade from its start to its end, so the way out never climbs: this is
// what takes the west river through the forest's ridges.
if (!B) for (const { line, end } of C.dig) {
  const all = line, h0 = hAt(all[0][0], all[0][1]), last = all[all.length - 1], h1 = end ?? hAt(last[0], last[1]);
  all.forEach(([pu, pv], n) => { if (n % 2) return; const bed = lerp(h0, h1, n / (all.length - 1)); for (let dv = -56; dv <= 56; dv++) for (let du = -56; du <= 56; du++) { const u = Math.round(pu + du), v = Math.round(pv + dv); if (u < 0 || v < 0 || u >= NW || v >= VD) continue; const i = at(u, v); if (MATS[mg[i]] !== 'land' || hg[i] <= 0) continue; const t = Math.max(0.5, bed + Math.max(0, Math.hypot(du, dv) - 12) * 0.2); if (hg[i] > t) hg[i] = t; } });
}
// The coulee: a flat floor, a cliff, a bench, a second cliff. It deepens as the tableland rises.
if (!B) { const all = catmull(C.coulee); all.forEach(([pu, pv], n) => { const floor = lerp(11, 2.5, n / (all.length - 1)); for (let dv = -44; dv <= 44; dv++) for (let du = -44; du <= 44; du++) { const u = Math.round(pu + du), v = Math.round(pv + dv); if (u < 0 || v < 0 || u >= NW || v >= VD) continue; const d = Math.hypot(du, dv) + 9 * (fbm(u / 23, v / 23, 440, 2) - 0.5), rise = d < 13 ? 0 : d < 18 ? 14 * (d - 13) / 5 : d < 33 ? 14 + (d - 18) * 0.07 : d < 39 ? 15 + 15 * (d - 33) / 6 : 1e9; if (hg[at(u, v)] > floor + rise) hg[at(u, v)] = floor + rise; } }); }
// Still water is level, so a lake flattens the ground under it to the height of its shore.
const ISLE = [C.lakes[0][0] - 14, C.lakes[0][1] + 3], isle = (u, v) => Math.hypot((u - ISLE[0]) / 7, (v - ISLE[1]) / 3.2);
const lakeRim = (u, v) => { for (const [cu, cv, ru, rv, kind] of C.lakes) { const d = Math.hypot((u - cu) / ru, (v - cv) / rv) + 0.16 * (vnoise(u / 9, v / 5, 4) - 0.5); if (d >= 1 && d < 1 + 2.2 / Math.min(ru, 8 * rv)) return kind; } return null; };
const lakeAt = (u, v) => { for (const [cu, cv, ru, rv, kind] of C.lakes) if (Math.hypot((u - cu) / ru, (v - cv) / rv) + 0.16 * (vnoise(u / 9, v / 5, 4) - 0.5) < 1) return kind; return null; };
// The talus fan stands a little proud of the step, highest against the wall.
if (!B && PF) for (let v = PF.cv - 45; v <= PF.cv; v++) for (let u = PF.cu - 110; u <= PF.cu + 110; u++) { const t = talusAt(u, v); if (t > 0 && MATS[mg[at(u, v)]] === 'gran') hg[at(u, v)] += 6 * t * t; }
if (!B) for (const [cu, cv, ru, rv] of C.lakes) { const lv = hAt(cu, cv - rv); for (let v = Math.floor(cv - rv - 2); v <= cv + rv + 2; v++) for (let u = Math.floor(cu - ru - 2); u <= cu + ru + 2; u++) if (lakeAt(u, v)) hg[at(u, v)] = lv; }
// Reflection Lake spills over a step (D4): the ground in front of its outlet's lip is dropped, so the
// stream falls instead of running down a slope. The drop fades out sideways and far ahead, where the
// land falls away on its own. lipKeep stops the stream wearing the lip back into a notch.
const FALL = 10, LIP = (() => { const P = catmull(C.src[0].lead); let k = 0; while (k < P.length - 1 && lakeAt(P[k][0], P[k][1])) k++; return P[Math.min(P.length - 1, k + 5)].map(Math.round); })();
const lipKeep = new Uint8Array(NW * VD);
if (!B) { const [lu, lv] = LIP; for (let v = Math.max(0, lv - 80); v <= lv + 12; v++) for (let u = lu - 44; u <= lu + 44; u++) {
  const i = at(u, v), side = Math.abs(u - lu), ahead = lv - v + 1.5 * (vnoise(u / 5, 1, 444) - 0.5); if (MATS[mg[i]] !== 'land' || lakeAt(u, v)) continue;
  if (ahead > 0) hg[i] = Math.max(0.5, hg[i] - FALL * smooth(40, 20, side) * smooth(0, 1.5, ahead) * smooth(76, 26, ahead)); else if (side < 16 && ahead > -10) lipKeep[i] = 1;
} }
// ---- water finds its own way ----------------------------------------------------------------------
// Every spot drains to a lower neighbour. Hollows are filled first, by flooding inward from the sea
// and from the dry corner's edge, lowest ground first, so no stream dead-ends. Worked at half size.
// A little noise on the heights makes a stream wander where the ground is flat.
const trail = new Uint8Array(NW * VD), water = new Uint8Array(NW * VD), routes = [];
if (B) water.set(B.water); else {
  const RW = NW >> 1, RH = VD >> 1, N = RW * RH, fill = new Float32Array(N), down = new Int32Array(N).fill(-2), flow = new Float32Array(N), hk = [], hi = [];
  const push = (k, i) => { let n = hk.length; hk.push(k); hi.push(i); while (n > 0) { const p = (n - 1) >> 1; if (hk[p] <= k) break; hk[n] = hk[p]; hi[n] = hi[p]; n = p; } hk[n] = k; hi[n] = i; };
  const pop = () => { const top = hi[0], k = hk.pop(), i = hi.pop(), len = hk.length; if (len) { let n = 0; for (;;) { let c = 2 * n + 1; if (c >= len) break; if (c + 1 < len && hk[c + 1] < hk[c]) c++; if (hk[c] >= k) break; hk[n] = hk[c]; hi[n] = hi[c]; n = c; } hk[n] = k; hi[n] = i; } return top; };
  let dig = () => 0;
  const rh = i => { const u = (i % RW) * 2, v = ((i / RW) | 0) * 2; return hg[at(u, v)] + 3 * (fbm(u / 40, v / 30, 410, 3) - 0.5) - dig(u, v); };
  const flood = () => { fill.fill(0); down.fill(-2); flow.fill(0); hk.length = 0; hi.length = 0; routes.length = 0;
  for (let i = 0; i < N; i++) { const ru = i % RW, rv = (i / RW) | 0, u = ru * 2, v = rv * 2; if (coast(u, v) > 0) { down[i] = -1; fill[i] = 0; push(0, i); } else if ((rv === 0 || ru === RW - 1) && dryAmt(u, v) > 0.2) { down[i] = -1; fill[i] = rh(i); push(fill[i], i); } }
  while (hk.length) { const c = pop(), cu = c % RW, cv = (c / RW) | 0; for (let dv = -1; dv <= 1; dv++) for (let du = -1; du <= 1; du++) { const nu = cu + du, nv = cv + dv; if ((!du && !dv) || nu < 0 || nv < 0 || nu >= RW || nv >= RH) continue; const n = nv * RW + nu; if (down[n] !== -2) continue; fill[n] = Math.max(rh(n), fill[c] + (du && dv ? 0.0028 : 0.002)); down[n] = c; push(fill[n], n); } }
  // Follow each source down to an outlet, adding its water to every spot it passes.
  for (const s of C.src) { const lead = catmull(s.lead), [lu, lv] = lead[lead.length - 1], cells = []; let i = (Math.round(lv) >> 1) * RW + (Math.round(lu) >> 1), guard = 0; while (i >= 0 && guard++ < 8000) { cells.push(i); flow[i] += s.w; if (down[i] < 0) break; i = down[i]; } routes.push({ s, lead, cells }); }
  };
  flood();
  // The lower west river reaches the sea at the bottom edge of the map, out of sight, so the land gives it
  // a shallow valley of its own (D11): from where its trunk first comes within 150 of the near edge, it
  // runs west, falling a little, to the beach. The water is routed again over that valley.
  { const A = routes[1].cells.map(i => [(i % RW) * 2, ((i / RW) | 0) * 2]).find(([, v]) => v < 150); if (A) { const hA = hAt(A[0], A[1]), floor = u => hA * clamp((u - A[0] + 300) / 300, 0, 1) - 6; dig = (u, v) => u > A[0] + 8 ? 0 : Math.max(0, hAt(u, v) - floor(u)) * smooth(14, 4, Math.abs(v - A[1] + 0.06 * (A[0] - u))) * smooth(A[0] + 8, A[0] - 12, u); flood();
    for (let u = Math.max(0, A[0] - 340); u <= A[0] + 30; u++) for (let v = Math.max(0, A[1] - 70); v <= Math.min(VD - 1, A[1] + 50); v++) { const d = Math.abs(v - A[1] + 0.06 * (A[0] - u)), i = at(u, v); if (d > 44 || coast(u, v) > 0 || MATS[mg[i]] !== 'land') continue; const t = Math.max(0.6, floor(u) + 6) + 0.3 * d, k = smooth(A[0] + 30, A[0] - 10, u); if (hg[i] > t) hg[i] = lerp(hg[i], t, k); } } }
  // Read from the land as it was before any stream cut its bed, so every stream sees the same ground.
  const hg0 = hg.slice(), h0 = (u, v) => hg0[at(clamp(Math.round(u), 0, NW - 1), clamp(Math.round(v), 0, VD - 1))];
  const flatFor = (u, v) => { let m = 0; for (const [du, dv] of [[0, 0], [12, 0], [-12, 0], [0, 10], [0, -10]]) m = Math.max(m, Math.hypot(h0(u + du + 3, v + dv) - h0(u + du - 3, v + dv), h0(u + du, v + dv + 3) - h0(u + du, v + dv - 3)) / 6); return m; };
  const wander = (u, v) => { const i = at(clamp(Math.round(u), 0, NW - 1), clamp(Math.round(v), 0, VD - 1)); if (MATS[mg[i]] !== 'land' || hg0[i] > 40 || coast(u, v) > -24) return 0; const k = smooth(0.5, 0.18, flatFor(u, v)); return k && 13 * k * (2 * fbm(u / 34, v / 26, 455, 2) - 1); };
  const wide = f => 0.5 + 0.8 * Math.sqrt(f), flowAt = (u, v) => { let f = 0; const ru = Math.round(u) >> 1, rv = Math.round(v) >> 1; for (let dv = -1; dv <= 1; dv++) for (let du = -1; du <= 1; du++) { const nu = ru + du, nv = rv + dv; if (nu >= 0 && nv >= 0 && nu < RW && nv < RH) f = Math.max(f, flow[nv * RW + nu]); } return f; };
  for (const r of routes) {
    const sparse = r.cells.filter((_, n) => n % 4 === 0 || n === r.cells.length - 1).map(i => [(i % RW) * 2, ((i / RW) | 0) * 2]);
    const run = sparse.length > 2 ? catmull([r.lead[r.lead.length - 1], ...sparse.slice(1)]) : [];
    r.pts = [...r.lead.map(([u, v]) => [u, v, wide(r.s.w)]), ...run.map(([u, v]) => [u, v, wide(Math.max(r.s.w, flowAt(u, v)))])];
    // On ground that stays flat for some way round, a river wanders from side to side (D6). The swing
    // is read from where the water is, not how far it has run, so two streams sharing a bed swing as one.
    r.pts = r.pts.map((p, n) => { if (n < r.lead.length || n < 4 || n > r.pts.length - 5) return p; const [u, v] = p, a = r.pts[n - 4], b = r.pts[n + 4], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, s = wander(u, v); return s ? [u - dy / L * s, v + dx / L * s * 0.7, p[2]] : p; });
    // Its bed never climbs: where the way out of a hollow crosses higher ground the stream cuts a
    // notch through it, with banks that open out.
    let bed = 1e9;
    for (let [pu, pv, pr] of r.pts) {
      bed = Math.min(bed, hAt(pu, pv)); pr += 5 * smooth(-36, 0, coast(pu, pv)); const W = Math.ceil(pr + 9);
      for (let dv = -W; dv <= W; dv++) for (let du = -W; du <= W; du++) { const u = Math.round(pu + du), v = Math.round(pv + dv); if (u < 0 || v < 0 || u >= NW || v >= VD) continue; const i = at(u, v), m = MATS[mg[i]], d = Math.hypot(du, dv); if (d > W || lipKeep[i] || (m !== 'land' && m !== 'moraine' && m !== 'gran')) continue; const t = Math.max(0.4, bed + Math.max(0, d - pr) * 0.9); if (hg[i] > t) hg[i] = t; if (d <= pr + 1 && hg[i] > 0) water[i] = Math.max(water[i], d <= pr ? 2 : 1); }
    }
  }
  // An oxbow: a loop the river left behind, a crescent of still water just outside its widest swing in
  // the flat of the meadow, the swing nearest the Trailhead (D6).
  { let best = null, bs = 0; for (const r of routes) r.pts.forEach(([u, v], n) => { if (n < r.lead.length) return; const s = Math.abs(wander(u, v)) * smooth(330, 130, Math.hypot(u - TU, (v - TV) * 1.4)) * smooth(TV - 120, TV - 40, v); if (s > bs) { bs = s; best = [r, n]; } });
    if (best && bs > 4) { const [r, n] = best, P = r.pts, [u0, v0] = P[n], a = P[Math.max(0, n - 6)], b = P[Math.min(P.length - 1, n + 6)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, sg = Math.sign(wander(u0, v0)), nu = -(b[1] - a[1]) / L * sg, nv = (b[0] - a[0]) / L * sg, out = Math.atan2(nv, nu), cu = u0 + nu * 32, cv = v0 + nv * 32 * 0.7;
      // Still water: it keeps clear of the running river, and its surface is one level, so it reads calm.
      const near = (u, v) => { for (let dv = -4; dv <= 4; dv++) for (let du = -6; du <= 6; du++) if (water[at(clamp(u + du, 0, NW - 1), clamp(v + dv, 0, VD - 1))]) return true; return false; }, ox = new Map();
      for (let t = 0; t <= 80; t++) { const e = (t / 80) * 2 - 1, ang = out + e * 2.0, w = 2.4 * (1 - e * e) + 0.6, u = cu + Math.cos(ang) * 16, v = cv + Math.sin(ang) * 10; for (let dv = -3; dv <= 3; dv++) for (let du = -4; du <= 4; du++) { const d = Math.hypot(du, dv * 1.4), uu = Math.round(u + du), vv = Math.round(v + dv), i = at(clamp(uu, 0, NW - 1), clamp(vv, 0, VD - 1)); if (d > w + 1 || hg[i] <= 0 || near(uu, vv)) continue; ox.set(i, Math.max(ox.get(i) || 0, d <= w ? 2 : 1)); } }
      const hs = [...ox.keys()].map(i => hg[i]).sort((a, b) => a - b), lvl = hs[hs.length >> 1]; for (const [i, k] of ox) { water[i] = k === 2 ? 3 : 1; hg[i] = Math.min(hg[i], lvl); } } }
}
// The heights are kept to 32nds of a pixel, baked or not, so the map read from a bake is the same map.
if (!B) for (let i = 0; i < hg.length; i++) hg[i] = Math.round(hg[i] * 32) / 32;
// The waterfall off the lake's lip, in picture terms: its column, where it leaves the lip and where it lands.
const FALLS = (() => { const [lu, lv] = LIP, top = hAt(lu, lv + 1); let v = lv; while (v > lv - 14 && hAt(lu, v - 1) < hAt(lu, v) - 0.4) v--; const bot = hAt(lu, v);
  return top - bot < 3 ? [] : [{ x: lu, y0: Math.round(SY - lv - top), y1: Math.round(SY - v - bot), v }]; })();
function stamp(mask, pts, r0, r1) { pts.forEach(([pu, pv], n) => { const rr = lerp(r0, r1, n / (pts.length - 1)), R2 = Math.ceil(rr + 1); for (let dv = -R2; dv <= R2; dv++) for (let du = -R2; du <= R2; du++) { const d = Math.hypot(du, dv), u = Math.round(pu + du), v = Math.round(pv + dv), k = d <= rr ? 2 : d <= rr + 1 ? 1 : 0; if (k && u >= 0 && v >= 0 && u < NW && v < VD && mask[at(u, v)] < k) mask[at(u, v)] = k; } }); }
// The Spires trail ends at base camp. Beyond it the way goes on as a boot track up the ice (D13), as in
// round 3: it switches back and forth up the fall line, a trench as wide as the trail that narrows toward
// the wall, and over its last fifth breaks up into single prints. track: 2 on its floor, 1 on its edge.
// trackF: how far up it a spot is, 1 at camp to 201 at its end.
const trailPts = [], track = new Uint8Array(NW * VD), trackF = new Uint8Array(NW * VD);
C.trails.forEach((t, k) => {
  const ci = k === 1 ? t.findIndex(p => p[0] === C.camp[0] && p[1] === C.camp[1]) : -1;
  const all = catmull(ci > 0 ? t.slice(0, ci + 1) : t); stamp(trail, all, 1.9, 1.9); trailPts.push(...all);
  if (ci <= 0) return;
  const up = catmull(t.slice(ci)), L = up.reduce((s, p, n) => n ? s + Math.hypot(p[0] - up[n - 1][0], p[1] - up[n - 1][1]) : 0, 0); let len = 0;
  up.forEach(([pu, pv], n) => {
    if (n) len += Math.hypot(pu - up[n - 1][0], pv - up[n - 1][1]);
    const f = len / L, zz = 6 * (4 * Math.abs(frac(len / 26 + 0.25) - 0.5) - 1) * smooth(0, 0.15, f), rr = lerp(1.9, 0.8, f), R2 = Math.ceil(rr + 1);
    for (let dv = -R2; dv <= R2; dv++) for (let du = -R2; du <= R2; du++) { const d = Math.hypot(du, dv), u = Math.round(pu + zz + du), v = Math.round(pv + dv), kk = d <= rr ? 2 : d <= rr + 1 ? 1 : 0; if (kk && u >= 0 && v >= 0 && u < NW && v < VD && track[at(u, v)] < kk) { track[at(u, v)] = kk; trackF[at(u, v)] = 1 + Math.round(f * 200); } }
  });
});
// Near its end the boot track breaks up into single prints: true in the gaps between them.
const printGap = i => { const tf = (trackF[i] - 1) / 200; return tf > 0.8 && Math.floor(tf * 70) % 3 === 0; };
// Where a trail crosses running water there is a footbridge: the stretch of trail over the water and a
// few steps of bank at either end, as round 3 had them (D4).
const BRIDGES = [];
for (const t of C.trails) {
  const P = catmull(t); let run = null;
  const end = () => { if (run) { const pts = P.slice(Math.max(0, run[0] - 9), run[1] + 10).map(([u, v]) => [u, Math.round(SY - v - hAt(u, v)), v]); const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); BRIDGES.push({ pts, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), v0: Math.min(...pts.map(p => p[2])), v1: Math.max(...pts.map(p => p[2])) }); } run = null; };
  P.forEach(([u, v], n) => { const i = at(Math.round(u), Math.round(v)); if (water[i] && !lakeAt(u, v)) { if (!run) run = [n, n]; run[1] = n; } else if (run && n - run[1] > 30) end(); });
  end();
}
const nearTrail = (u, v, r) => { for (let i = 0; i < trailPts.length; i += 3) { const p = trailPts[i]; if (Math.abs(p[0] - u) < r && Math.abs(p[1] - v) < r) return true; } return false; };

// ---- what the ground is made of -------------------------------------------------------------------
const wob = (u, v, s, a) => a * (fbm(u / 70, v / 60, s, 3) - 0.5);
const forestEdge = v => edgeE - 96 * (fbm(v / 110, 2.3, 3, 3) - 0.5) + 30 * (fbm(v / 24, 7.1, 5, 2) - 0.5) + 44 * smooth(440, 260, v);
const ell = ([cu, cv, ru, rv], u, v) => Math.hypot((u - cu) / ru, (v - cv) / rv);
const parkAmt = (u, v) => Math.max(smooth(1.25, 0.8, ell(C.PK, u, v) + wob(u, v, 202, 0.4)), smooth(1.2, 0.8, ell(C.PK2, u, v) + wob(u, v, 203, 0.4)));
// The parkland's drifts: a slow field over it picks lupine, paintbrush, white, or heather and plain turf.
// null outside the parkland, where the flowers are scattered by the dice as before.
const DRIFT = (u, v) => { if (parkAmt(u, v) < 0.45) return null; const k = vnoise(u / 58, v / 34, 470) + 0.08 * (vnoise(u / 9, v / 6, 471) - 0.5); return k < 0.36 ? 'lupine' : k < 0.5 ? 'heather' : k < 0.68 ? 'red' : 'white'; };
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
  // The sea fog on the beach veils the river crossing it only half as much, so the water still reads (D11).
  if (cs > -15 && bayer(x, y) < (seaFog(u, v) * 1.2 - 0.14) * (water[i] ? 0.45 : 1)) return fogInk(x, y, 9);
  if (cs > 0) return cs < 3 + 2 * vnoise(u / 9, v / 9, 85) ? R.sea[5] : pick('sea', 0.75 - smooth(0, 150, cs) * 0.6 + 0.12 * (vnoise(u / 14, v / 3, 86) - 0.5), x, y);
  if (cs > -24 - 8 * vnoise(u / 20, v / 20, 87)) return water[i] ? (water[i] === 1 ? R.sand[0] : hash(x, y, 4733) < 0.07 ? R.glint[(x + y) & 3] : R.water[(x + 2 * y) % 5 < 2 ? 4 : 3]) : R.sand[cs > -4 ? 0 : hash(u, v, 88) < 0.25 ? 1 : 2];
  const lk = lakeAt(u, v);
  if (lk === 'lake' && isle(u, v) < 1) return pick('grass', 0.55 + 0.3 * n1, x, y);
  if (lk) return lk === 'tarn' ? pick('tarn', 0.3 + 0.4 * vnoise(u / 6, v / 3, 8), x, y) : lk === 'silt' ? pick('glac', 0.5 + 0.2 * vnoise(u / 5, v / 3, 8), x, y, 0.5) : lk === 'milk' ? (bayer(x, y) < 0.4 ? R.glac[3] : pick('tarn', 0.7 + 0.25 * vnoise(u / 6, v / 3, 8), x, y)) : pick('water', 0.3 + 0.3 * vnoise(u / 6, v / 2, 8), x, y);
  // Where a trail crosses water there is a footbridge: a deck of planks with a dark edge.
  if (water[i] && trail[i] && mat !== 'ice') return trail[i] === 2 ? ((u + 2 * v) % 3 === 0 ? R.dirt[1] : R.dirt[2]) : R.dirt[0];
  // 3 is still water (the oxbow): never white, whatever the bank does round it.
  if (water[i] === 3) return hash(x, y, 9) < 0.05 ? R.glint[(x + y) & 3] : R.water[y & 1 ? 2 : 3];
  // White water where the stream itself falls, read from the water's own surface, not from its banks,
  // so a low river between high banks near the sea stays blue (D11).
  const wh = (a, b) => water[at(a, b)] ? hg[at(a, b)] : hg[at(uu, vv)], fall = water[i] ? Math.hypot(wh(uu + 1, vv) - wh(uu - 1, vv), wh(uu, vv + 1) - wh(uu, vv - 1)) / 2 : 0;
  if (water[i]) return fall > 0.55 ? (hash(x, y >> 1, 5) < 0.72 ? R.white[1] : R.water[4]) : water[i] === 2 ? (hash(x, y, 9) < 0.08 ? R.glint[(x + y) & 3] : R.water[y & 1 ? 3 : 4]) : R.water[1];
  const rim = lakeRim(u, v); if (rim) return rim === 'lake' ? R.dirt[hash(x, y, 3) < 0.3 ? 3 : 4] : R.rock[hash(x >> 1, y >> 1, 3) < 0.5 ? 2 : 3];
  // The boot track up the ice: a trench with its floor in shade; where it crosses rock, a worn line.
  if (track[i] && !trail[i] && !printGap(i)) return mat === 'ice' ? (track[i] === 1 ? R.glac[3] : hash(x, y, 16) < 0.3 ? R.glac[2] : R.glac[1]) : track[i] === 1 ? R.rock[1] : R.rock[hash(x, y, 6) < 0.3 ? 4 : 3];
  // A trail goes from dirt to rock over a few paces, not at a line (D13): how much of its tread is rock
  // comes from how much of the ground round it is not soil, how steep it is and how high, and each pixel
  // picks dirt or rock by that share with a dither.
  if (trail[i] && mat !== 'ice') {
    let hard = 0; for (const [a, b] of [[-5, 0], [5, 0], [0, -5], [0, 5], [-4, -4], [4, 4], [-4, 4], [4, -4]]) { const m = MATS[mg[at(clamp(u + a, 0, NW - 1), clamp(v + b, 0, VD - 1))]]; if (m !== 'land' && m !== 'ice') hard++; }
    const share = clamp((mat !== 'land' ? 0.5 : 0) + hard / 16 + smooth(0.5, 0.95, steep) + 0.5 * smooth(60, 100, hh), 0, 1), rock = bayer(x, y) < share * 1.1 - 0.05;
    if (trail[i] === 2) return rock ? R.rock[hash(u, v, 6) < 0.3 ? 4 : 3] : hash(u, v, 5) < 0.1 ? R.dirt[2] : R.dirt[3];
    return rock ? R.rock[1] : R.dirt[1];
  }
  if (trail[i] === 2) return R.glac[1];
  if (trail[i] === 1) return R.glac[3];
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
    // Snow lies in streaks down the gullies and on the ledges, more of it on the faces the light reaches.
    const streak = 0.62 * vnoise(x / 2.6, hh / 18, 815) + 0.38 * vnoise(x / 8, hh / 8, 819), lie = 0.5 + 0.2 * smooth(120, 60, hh) + 0.18 * east - 0.16 * (L - 0.5) - 0.12 * smooth(1.2, 0.6, steep);
    if (mat === 'crest') return hh > 62 + 34 * vnoise(x / 14, 3, 816) + 46 * east && streak > lie ? R.snow[L > 0.55 ? 4 : L > 0.35 ? 3 : 2] : hh < 44 + 20 * vnoise(u / 20, v / 20, 827) ? pick('conifer', 0.2 + 0.5 * L, x, y) : rock;
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
    // The ice, the ribs, Little Tahoma and the crater are painted (monolith.js) and laid over this ground
    // afterwards. What shows below the painting is the mountain's lower slopes: scree here and there
    // in the meadow, then the forest.
    if (vnoise(u / 7, v / 5, 584) > 0.86 - 0.08 * smooth(0.2, 0.4, VP(Math.min(1, Q.d)))) return rock(vnoise(x / 3, hh / 3, 583) > 0.6 ? 1 : 0);
    if (forestAmt(u, v) > 0.4) return pick('moss', 0.2 + 0.35 * lit, x, y);
    // Its meadow keeps the parkland's drifts: blooms of the drift's own kind, thick, and a few red elsewhere.
    const dk = DRIFT(u, v), bloom = dk === 'lupine' ? R.lupine[1] : dk === 'red' ? R.red[1] : dk === 'white' ? R.white[1] : dk === 'heather' ? R.pink[0] : R.red[1];
    return hash(u, v, 586) < (dk ? 0.035 : 0.015) ? bloom : pick('grass', 0.4 + 0.35 * lit + 0.15 * n1, x, y, 0.4);
  }
  if (mat === 'gran' || mat === 'fin') {
    // Talus: blocks of the wall's own granite, lit on top and dark in the gaps, thinning out at the fan's
    // edge; the old snow lies on it in the shade.
    const ta = mat === 'gran' ? talusAt(u, v) : 0;
    if (ta > 0 && steep < 1.4) {
      if (ta > 0.3 && snowPatch(u, v)) return hash(x, y, 908) < 0.1 ? R.snow[2] : R.snow[L > 0.4 ? 4 : 3];
      if (bayer(x, y) < ta * 1.6) { const yy = y + Math.floor(3 * hash(x >> 2, 0, 911)), by = (yy / 3) | 0, bx = ((x + 2.6 * hash(by, 1, 912)) / (3 + ((hash(by, 2, 913) * 3) | 0))) | 0, q = hash(bx, by, 909), row = yy - by * 3; if (q < 0.14) return R.rock[0]; return row === 2 ? R.rock[q < 0.5 ? 0 : 1] : R.rock[clamp(Math.round(1.4 + 2.2 * L + 1.2 * (q - 0.5) + (row === 0 ? 1 : 0)), 1, 4)]; }
    }
    if (steep > 0.75 || mat === 'fin') { const crack = vnoise(x / 2.2, hh / 26, 902), streak = vnoise(x / 5, hh / 40, 903); const k = clamp(Math.round(1.5 + 2.9 * L + (streak > 0.62 ? -1.1 : 0) + (crack > 0.74 ? -1.4 : crack < 0.2 ? 0.5 : 0) + (b2(x, y) - 0.5) * 0.9), 0, 5); return k === 5 ? R.gold[6] : R.rock[k]; }
    const slab = fbm(u / 22, v / 11, 96, 3);
    return slab > 0.4 ? pick('rock', 0.82 + 0.4 * (slab - 0.5) + 0.2 * n1, x, y, 0.7) : hash(u, v, 98) < 0.06 ? R.red[1] : pick('grass', 0.42 + 0.2 * n1, x, y, 0.4);
  }
  // The ground behind the crest, glimpsed between its peaks against the sky, is more mountain, not meadow.
  if (u > 760 && v > 684) return hh > 128 && vnoise(x / 3, hh / 12, 829) > 0.45 + 0.3 * smooth(1240, 1700, u) ? R.snow[L > 0.5 ? 4 : 3] : pick('rock', 0.3 + 0.45 * L + 0.15 * vnoise(x / 3, hh / 10, 97), x, y, 0.7);
  // Land. A step in it shows the rock of its own country.
  if (steep > 1.05) return dryAmt(u, v) > 0.3 ? ((x >> 1) % 4 === 0 ? R.basalt[0] : R.basalt[1 + (hash(x >> 1, 0, 91) * 2.9 | 0)]) : u > 1190 ? pick('rock', 0.36 + 0.42 * vnoise(x / 3, hh / 10, 97) + 0.15 * L, x, y, 0.7) : ((ld, ck) => ld < 0.22 && hash(x, y, 100) < 0.75 ? pick('moss', 0.3 + 0.35 * L, x, y) : ck > 0.74 ? R.rock[0] : pick('rock', 0.14 + 0.5 * vnoise(x / 3, hh / 5, 97) + 0.25 * L, x, y, 0.7))(frac(hh / 4.5 + 0.7 * vnoise(x / 9, 3, 98)), vnoise(x / 2.2, hh / 9, 99));
  const sh = (L - 0.5) * 0.5, blot = s => 0.5 + 0.85 * (fbm(u / 32, v / 21, s, 3) - 0.5) + 0.2 * n1;
  const fa = forestAmt(u, v);
  if (fa > 0.5 + 0.2 * n1) { const shaft = fbm(u / 34 + v / 70, v / 26, 21, 3); return pick('moss', 0.16 + 0.3 * fbm(u / 18, v / 18, 22, 3) + smooth(0.56, 0.7, shaft) * 0.4 + sh * 0.4, x, y); }
  const bu = burnAmt(u, v), da = dryAmt(u, v);
  if (larchAmt(u, v) > blot(181) && bu < 0.5) { const slab = fbm(u / 22, v / 11, 96, 3); return slab > 0.58 ? pick('rock', 0.85 + 0.2 * n1, x, y, 0.7) : hash(u, v, 98) < 0.06 ? R.red[1] : hash(u, v, 99) < 0.05 ? R.larch[3] : pick('grass', 0.42 + sh + 0.2 * n1, x, y, 0.4); }
  if (bu > blot(182)) { for (let k = 0; k < 9; k++) { const tall = 6 + Math.floor(hash(u, v - k, 132) * 3.99); if (k < tall && hash(u, v - k, 101) < 0.008 + 0.09 * smooth(0.5, 0.66, fbm(u / 30, (v - k) / 15, 131, 3))) return k < 2 ? R.grass[1] : k === tall - 1 ? R.fireweed[1] : R.fireweed[0]; } return fbm(u / 24, v / 16, 100, 3) > 0.56 ? pick('grass', 0.3, x, y, 0.5) : pick('ash', 0.4 + 0.5 * fbm(u / 14, v / 9, 102, 3), x, y); }
  if (da > blot(183) && palAmt(u, v) > blot(184)) return pick('dry', 0.22 + 0.95 * L + 0.18 * (fbm(u / 60, v / 40, 185, 2) - 0.5), x, y, 0.5);
  if (da > blot(183)) { const sg = sageAmt(u, v); return hash(u >> 1, v >> 1, 103) < 0.04 + sg * 0.3 ? R.sage[1 + (hash(u, v, 104) < 0.5 ? 0 : 1)] : pick('dry', 0.5 + 0.5 * (fbm(u / 24, v / 14, 105, 3) - 0.5) + sh + sg * 0.1, x, y); }
  // High ground with no forest on it goes from meadow to bare rock and then snow.
  if (hh > 96 + 30 * vnoise(u / 30, v / 30, 828)) return hh > 150 ? R.snow[L > 0.5 ? 4 : 3] : pick('rock', 0.3 + 0.5 * L, x, y);
  return pick('grass', 0.56 + 0.55 * (fbm(u / 26, v / 26, 31, 3) - 0.5) + 0.14 * (hash(x >> 1, y >> 1, 32) - 0.5) + sh - fa * 0.45 + da * 0.2, x, y, 0.3);
}
function b2(x, y) { return bayer(x, y); }

// ---- the picture ----------------------------------------------------------------------------------
const g = new Uint8Array(NW * SH), mb = new Uint8Array(NW * SH).fill(255), zb = new Float32Array(NW * SH).fill(1e9), px = (x, y) => y * NW + x;
const skyAt = (x, y) => { const sb = R.skyband, f = clamp(y / 340, 0, 1) * (sb.length - 1), b0 = Math.floor(f), e = f - b0; return sb[Math.min(sb.length - 1, b0 + (e > 0.72 && bayer(x, y) < (e - 0.72) / 0.28 ? 1 : 0))]; };
const painted = new Uint8Array(NW * SH);
if (B) { g.set(B.g); mb.set(B.mb); zb.set(B.zb); painted.set(B.painted); } else {
for (let y = 0; y < SH; y++) for (let x = 0; x < NW; x++) g[px(x, y)] = skyAt(x, y);
// The far ranges, which really are a backdrop: pale, beyond the last of the ground.
function farRow(u0, u1, baseY, env, seed, snowy, list) {
  const r = rng(seed), peaks = list || []; if (!list) for (let cx = u0; cx < u1;) { const h = env(cx) * (0.75 + 0.5 * r()), w = h * (1.2 + 0.7 * r()); peaks.push([cx, h, w]); cx += w * (0.5 + 0.4 * r()); }
  const F = R.far, FS = R.farsnow;
  for (let x = Math.max(0, u0 - 80); x < Math.min(NW, u1 + 80); x++) {
    let best = 0, bc = 0, bh = 1; for (const [cx, h, w] of peaks) { const t = h * Math.pow(Math.max(0, 1 - Math.abs(x - cx) / w), 0.85) + 1.5 * (vnoise(x / 4, cx, 700) - 0.5); if (t > best) { best = t; bc = cx; bh = h; } }
    // A row without snow is forested foothills: its skyline is a saw of tree tops.
    if (!snowy) best += 2.2 * (1 - Math.abs(frac(x / 4 + 0.5 * hash(x >> 2, seed, 707)) - 0.5) * 2) - 1;
    const top = Math.round(baseY - best);
    for (let y = Math.max(0, top); y <= baseY + 30 && y < SH; y++) {
      const d = y - top, dd = y - (baseY - bh), rel = dd / bh, b = bayer(x, y), side = x < bc ? -1 : 1;
      // The main ridge runs down from each summit and wanders; spurs branch off it down both faces.
      const rx = bc + dd * (0.1 + 0.18 * (hash(Math.round(bc), seed, 701) - 0.5)) + 6 * (vnoise(dd / 14, bc, 702) - 0.5), west = x < rx;
      const spur = frac((x - rx) * 0.075 - side * dd * 0.055 + 0.35 * vnoise(x / 18, dd / 18, 703)), edge = spur < 0.1;
      let c;
      if (!snowy) c = d === 0 ? F[1] : (west ? (b < 0.7 ? F[2] : F[3]) : (b < 0.75 ? F[1] : F[2]));
      else {
        // Snow above a line that wanders, coming down lower in the gullies as glaciers; rock below,
        // streaked with snow in its own gullies. Faces turned from the western light are blue.
        const gully = vnoise(x / 10, dd / 16, 704), snowR = 0.46 + 0.12 * (vnoise(x / 30, seed, 705) - 0.5) + 0.22 * (0.5 - gully);
        if (rel < snowR) c = west ? (edge ? F[3] : FS[1]) : (edge ? FS[1] : spur < 0.5 ? FS[0] : b < 0.5 ? FS[0] : F[3]);
        else c = vnoise(x / 3, dd / 10, 706) > 0.66 ? FS[0] : west ? (edge ? F[3] : F[2]) : (edge ? F[2] : F[1]);
        if (d === 0) c = F[1];
      }
      g[px(x, y)] = c;
    }
  }
}
const HZ = SY - VD - 26;
// The Legacy Range: a broad massif of several summits, with lower peaks in front of it and round it.
farRow(0, 480, HZ - 22, null, 41, true, [[200, 86, 120], [128, 64, 90], [268, 70, 84], [330, 50, 80], [64, 48, 84], [4, 36, 80], [400, 34, 76]]);
farRow(0, 600, HZ - 6, null, 45, false, [[40, 26, 60], [150, 22, 50], [245, 18, 40], [300, 28, 64], [430, 24, 60], [520, 30, 70]]);
// A nearer rank of forested foothills, lower, so the range rises out of ridges of trees.
farRow(0, 560, HZ + 6, null, 46, false, [[90, 16, 60], [210, 12, 50], [330, 17, 70], [470, 14, 60]]);
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
      mb[px(u, y)] = mg[at(u, v)]; g[px(u, y)] = fa > 0.4 && hh < ft && bayer(u, y) < (water[at(u, v)] ? Math.min(0.3, 0.2 + (ft - hh) / 4) : 0.2 + (ft - hh) / 4) ? fogInk(u, y, ft - hh) : colour(u, v, hh, u, y);
      zb[px(u, y)] = v;
    }
    minY = sy;
  }
}

// Mount Monolith is painted (monolith.js) and laid over its own ground, one map pixel to one picture
// pixel. Where the painted outline stands a little above the ground it is drawn over the sky behind,
// at the mountain's depth, so anything nearer still stands in front. Its stand-in meadow is left out:
// the land's own meadow, trees and flowers are drawn there. The whole painting stands at the mountain's
// depth, so nothing behind the mountain can be drawn over it, and nothing is planted on it (painted).
{
  const P = paintMonolith(), { cu, cv, H } = VOLC, VI = MATS.indexOf('volc'), ox = cu - PMCX;
  // Line the picture up with the ground: the row of the picture's summit goes where the ground's top is.
  const tops = [];
  for (let x = cu - 40; x <= cu + 40; x += 4) { let y = 0; while (y < SH && mb[px(x, y)] !== VI) y++; const pxl = x - ox, sk = Math.ceil(monolithSky(pxl - PMCX) ? PMH - monolithSky(pxl - PMCX) * (PMH - PTOPY) : PMH); if (y < SH) tops.push(y - sk); }
  tops.sort((a, b) => a - b); const oy = tops.length ? tops[tops.length >> 1] : SY - cv - H - PTOPY;
  for (let py = 0; py < PMH; py++) for (let qx = 0; qx < PMW; qx++) {
    const k = py * PMW + qx, c = P.d[k], x = ox + qx, y = oy + py; if (x < 0 || y < 0 || x >= NW || y >= SH) continue;
    const i = px(x, y);
    // Above the painted outline the mountain's own ground would poke out: the sky goes back there.
    if (!c) { if (mb[i] === VI && py < PMH - 40) { g[i] = skyAt(x, y); mb[i] = 255; zb[i] = 1e9; } continue; }
    if (!P.own[k]) continue;
    if (mb[i] === VI) { g[i] = c; zb[i] = Math.min(zb[i], cv); painted[i] = 1; }
    else if (zb[i] > cv) { g[i] = c; zb[i] = cv; mb[i] = VI; painted[i] = 1; }
  }
}

// ---- detail on the ground, as round 3 had it ------------------------------------------------------
// These work on the finished picture. A pixel belongs to the ground at one spot (zb, its depth), so
// each touch keeps to one stretch of ground and never reaches across the edge of a nearer slope.
const sameGround = (i, j) => Math.abs(zb[i] - zb[j]) < 4;
// The plunge pool at the foot of the waterfall, white where the water lands.
for (const F of FALLS) for (let dy = -2; dy <= 2; dy++) for (let dx = -6; dx <= 6; dx++) { const e = (dx / 6) ** 2 + (dy / 2.2) ** 2; if (e > 1) continue; const x = F.x + dx, y = F.y1 + dy + 1; if (x < 0 || y < 0 || x >= NW || y >= SH) continue; g[px(x, y)] = e < 0.35 && hash(x, y, 461) < 0.6 ? R.white[1] : e > 0.75 ? R.water[1] : R.water[2]; }
// The footbridges' decks: planks across with a dark seam, a beam along each edge.
for (const br of BRIDGES) {
  const [ax, ay] = br.pts[0], [bx, by] = br.pts[br.pts.length - 1], len = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / len, uy = (by - ay) / len;
  let nx = -uy, ny = ux; if (ny < 0) { nx = -nx; ny = -ny; }
  for (let y = Math.floor(br.y0) - 6; y <= br.y1 + 6; y++) for (let x = Math.floor(br.x0) - 6; x <= br.x1 + 6; x++) {
    const t = (x - ax) * ux + (y - ay) * uy, d = (x - ax) * nx + (y - ay) * ny; if (t < -0.5 || t > len + 0.5 || Math.abs(d) > 3 || x < 0 || y < 0 || x >= NW || y >= SH) continue;
    g[px(x, y)] = d > 2 ? R.wood[1] : d < -2 ? R.wood[2] : Math.floor(t + 0.5) % 3 === 0 ? R.wood[2] : R.wood[hash(Math.floor((t + 0.5) / 3), Math.floor(br.x0), 60) < 0.4 ? 4 : 3];
  }
}
// Reflection Lake mirrors what stands behind it, squashed and broken by ripples: snow as pale water,
// forest as dark water, rock in between. The shore keeps its own colour.
{
  const lake = C.lakes[0], top = new Int16Array(NW).fill(-1), SUMY = SY - VOLC.cv - VOLC.H;
  for (let y = 0; y < SH; y++) for (let x = Math.floor(lake[0] - lake[2] - 4); x <= lake[0] + lake[2] + 4; x++) { const v = zb[px(x, y)]; if (v < VD && top[x] < 0 && lakeAt(x, v) === 'lake') top[x] = y; }
  for (let x = 0; x < NW; x++) if (top[x] >= 0) for (let y = top[x] + 1; y < SH; y++) {
    const i = px(x, y), v = zb[i]; if (v >= VD || lakeAt(x, v) !== 'lake' || isle(x, v) < 1.2) { if (y > top[x] + 30) break; continue; }
    if (lakeAt(x, v - 2) !== 'lake' || lakeAt(x + 2, v) !== 'lake' || lakeAt(x - 2, v) !== 'lake') continue;
    // The first rows mirror the near shore; further out, Mount Monolith, upside down and squashed into the
    // rest of the lake, faint: only its snow shows, as pale water every other pixel.
    const r = y - top[x], sx = Math.round(x + 1.5 * Math.sin(y * 1.7));
    if (r > 3) { const sy2 = Math.round(top[x] - 12 - (r - 3) * (top[x] - 12 - SUMY) / 9); if (sy2 >= 0 && sx >= 0 && sx < NW && ((x + y) & 1) && (y & 1)) { const k2 = RAMP_OF[g[px(sx, sy2)]]; if (k2 === 'snow' || k2 === 'serac') { g[i] = R.water[4]; continue; } } }
    const sy = Math.round(top[x] - r * 3.2 - 2); if (sy < 0 || sx < 0 || sx >= NW || !(y & 1 || hash(x, y, 8) < 0.6)) continue;
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
// Wildflowers are not painted into the ground any more: they are things that stand up and sway (D5a,
// below, with the trees).
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
}
// Each destination and its country (D12a, D12b), worked out from the heights, materials and depth the
// bake already holds, so it costs nothing to keep. First on the map, by rules from the land:
// 1 About Lake: the lake, the bench it lies on (where the bench is the ground), and the lake loop's last
//   300 or so through the trees on its way in and out, with the ground between its two stretches.
// 2 Proficiency Peak: the fin and the second granite step it stands on (where the step is the ground; the
//   higher step behind is not). Its cliff is added on the picture, below.
// 3 The Spires: the wall, and the glacier's watershed: every spot from which water runs down past the
//   tarn at the glacier's toe and out of the bowl, so the edge follows the arms' crests. Water is routed
//   downhill the standard way (a priority flood from the edge of a box round the bowl: lowest first, each
//   spot draining to the spot it was reached from), which needs no hollow filled by hand.
const reg = new Uint8Array(NW * VD);
{ const box = (P, fn) => { for (let v = Math.max(0, Math.floor(P.v0)); v <= Math.min(VD - 1, Math.ceil(P.v1)); v++) for (let u = Math.max(0, Math.floor(P.u0)); u <= Math.min(NW - 1, Math.ceil(P.u1)); u++) fn(u, v, at(u, v)); };
  const [lu, , lru] = C.lakes[0], FIN = MATS.indexOf('fin'), WALL = MATS.indexOf('wall');
  box(C.bench, (u, v, i) => { const f = C.bench.fn(u, v); if ((f > 3 && hg[i] >= f - 3 && hg[i] < f + 10) || lakeAt(u, v) === 'lake') reg[i] = 1; });
  // The loop's band narrows to nothing over its last 60 to the west, so the country ends in a round end,
  // and every column of it is filled between its highest and lowest spot: the ground between the stretches.
  { const W0 = lu - 300, top = new Int16Array(NW).fill(VD), bot = new Int16Array(NW).fill(-1);
    for (const [pu, pv] of catmull(C.trails[0])) { if (pu >= lu + lru || pu < W0) continue; const r = 22 * Math.sqrt(smooth(W0, W0 + 60, pu)), r2 = r * r; for (let dv = -22; dv <= 22; dv++) for (let du = -22; du <= 22; du++) { if (du * du + dv * dv > r2) continue; const u = Math.round(pu + du), v = Math.round(pv + dv); if (u >= 0 && v >= 0 && u < NW && v < VD) { reg[at(u, v)] = 1; top[u] = Math.min(top[u], v); bot[u] = Math.max(bot[u], v); } } }
    for (let u = 0; u < NW; u++) for (let v = top[u] + 1; v < bot[u]; v++) if (!reg[at(u, v)]) reg[at(u, v)] = 1; }
  box(C.step2, (u, v, i) => { const f = C.step2.fn(u, v); if ((f > 3 && hg[i] >= f - 3 && hg[i] < f + 16) || mg[i] === FIN) reg[i] = 2; });
  { const tarn = C.lakes.find(l => l[4] === 'silt'), X0 = Math.max(0, Math.round(SP.cu - 330)), X1 = Math.min(NW - 1, Math.round(SP.cu + 330)), Y0 = Math.max(0, tarn[1] - 80), w = X1 - X0 + 1, h = VD - Y0;
    const key = new Float32Array(w * h), from = new Int32Array(w * h).fill(-1), done = new Uint8Array(w * h), order = [], heap = [];
    const push = k => { heap.push(k); let n = heap.length - 1; while (n > 0) { const p = (n - 1) >> 1; if (key[heap[p]] <= key[k]) break; heap[n] = heap[p]; n = p; } heap[n] = k; };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { let n = 0; const kl = key[last]; for (;;) { const l = 2 * n + 1, r = l + 1; let m = -1, km = kl; if (l < heap.length && key[heap[l]] < km) { m = l; km = key[heap[l]]; } if (r < heap.length && key[heap[r]] < km) m = r; if (m < 0) break; heap[n] = heap[m]; n = m; } heap[n] = last; } return top; };
    for (let b = 0; b < h; b++) for (let a = 0; a < w; a++) if (a === 0 || b === 0 || a === w - 1 || b === h - 1) { const k = b * w + a; key[k] = hg[at(X0 + a, Y0 + b)]; done[k] = 1; push(k); }
    while (heap.length) { const k = pop(), a = k % w, b = (k - a) / w; order.push(k); for (let db = -1; db <= 1; db++) for (let da = -1; da <= 1; da++) { const aa = a + da, bb = b + db; if (aa < 0 || bb < 0 || aa >= w || bb >= h) continue; const n = bb * w + aa; if (done[n]) continue; done[n] = 1; from[n] = k; key[n] = Math.max(hg[at(X0 + aa, Y0 + bb)], key[k] + 1e-4); push(n); } }
    // The bowl's mouth: from the tarn's lowest spot, follow the water down until it is 60 nearer the camera
    // than the tarn. A spot belongs if it drains, sooner or later, to the mouth: walked in the order the
    // flood reached them, each spot after the one it drains to.
    let mouth = -1; for (const k of order) { const a = k % w, b = (k - a) / w; if (lakeAt(X0 + a, Y0 + b) === 'silt') { mouth = k; break; } }
    while (mouth >= 0 && from[mouth] >= 0 && Y0 + Math.floor(mouth / w) > tarn[1] - 60) mouth = from[mouth];
    const inn = new Uint8Array(w * h);
    for (const k of order) { const a = k % w, b = (k - a) / w; inn[k] = k === mouth || (from[k] >= 0 && inn[from[k]]) ? 1 : 0; if (inn[k] && !reg[at(X0 + a, Y0 + b)]) reg[at(X0 + a, Y0 + b)] = 3; }
    for (let i = 0; i < reg.length; i++) if (mg[i] === WALL) reg[i] = 3;
    // The bowl's bare ground goes with it too (ice, moraine and the arms' rock between the wall's two ends,
    // above the mouth), so a face of an arm that sheds its water the other way does not stay behind.
    const rock = new Set(['ice', 'moraine', 'crest'].map(m => MATS.indexOf(m))), A0 = Math.round(SP.cu - 170 * SP.wide), A1 = Math.round(SP.cu + 170 * SP.wide), mv = Y0 + Math.floor(mouth / w), q = [];
    for (let v = mv; v < VD; v++) for (let u = A0; u <= A1; u++) if (reg[at(u, v)] === 3) q.push(at(u, v));
    while (q.length) { const i = q.pop(), u = i % NW, v = (i - u) / NW; for (const [du, dv] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const uu = u + du, vv = v + dv; if (uu < A0 || uu > A1 || vv < mv || vv >= VD) continue; const j = at(uu, vv); if (reg[j] || !rock.has(mg[j])) continue; reg[j] = 3; q.push(j); } } } }
// Then on the picture: each pixel takes the number of the spot of the map drawn there, plus 4 where it is
// the landmark itself (the lake's water and island, the fin, the wall).
const dest = new Uint8Array(NW * SH), DEST = ['', 'lake', 'stack', 'spires'], destBox = DEST.map(() => ({ x0: NW, x1: -1, y0: SH, y1: -1 }));
{ const WALL = MATS.indexOf('wall'), FIN = MATS.indexOf('fin'), LANDM = MATS.indexOf('land');
  for (let y = 0; y < SH; y++) for (let x = 0; x < NW; x++) {
    const i = px(x, y), m = mb[i], v = zb[i]; if (m === 255 || !(v < VD)) continue;
    const core = m === FIN ? 2 : m === WALL ? 3 : m === LANDM && lakeAt(x, v) === 'lake' ? 1 : 0, k = core ? core | 4 : reg[at(x, Math.min(VD - 1, Math.round(v)))];
    if (k) dest[i] = k;
  }
  // A face that drops from a country (the step's cliff, the bench's bank) belongs to it down to its foot:
  // down each column from the country's lowest pixel, for as long as the ground there is near upright
  // (the depth changes by less than a third of a pixel from one row to the next).
  for (let x = 0; x < NW; x++) for (let y = 0; y < SH - 1; y++) {
    const i = px(x, y), k = dest[i] & 3; if (!k || dest[i + NW]) continue;
    for (let j = i + NW, n = 0; j < NW * SH && n < 160 && !dest[j] && zb[j] < VD && Math.abs(zb[j] - zb[j - NW]) < 0.34; j += NW, n++) dest[j] = k;
  }
  for (let y = 0; y < SH; y++) for (let x = 0; x < NW; x++) { const k = dest[px(x, y)] & 3; if (!k) continue; const b = destBox[k]; if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y; } }
// The landmarks keep a step of contrast and the dark edge of D12a: all round the lake and the fin; for the
// Spires only the skyline and the foot of the wall, with no seam where it runs into the crest (TJ's
// choice). A country gets a dark edge only where it already has a real one: against something farther
// behind it (a skyline, a ridge crest) or at the foot of a face (a cliff, a bank). Across meadow and
// forest it has none; the lift and the shadow under it show where it ends.
if (!B) {
  const out = new Uint8Array(NW * SH), CREST = MATS.indexOf('crest');
  for (let y = 1; y < SH - 1; y++) for (let x = 1; x < NW - 1; x++) {
    const i = px(x, y), d = dest[i]; if (!d) continue; const k = d & 3, same = j => (dest[j] & 3) === k;
    if (d === 5) { if (dest[i - 1] !== 5 || dest[i + 1] !== 5 || dest[i - NW] !== 5 || dest[i + NW] !== 5) out[i] = 1; continue; }
    const below = i + NW;
    if (d & 4 && dest[below] !== d && zb[below] < zb[i] - 1 && !(k === 3 && mb[below] === CREST)) out[i] = 1;
    if ((!same(i - NW) && zb[i - NW] > zb[i] + 14) || (!same(i - 1) && zb[i - 1] > zb[i] + 14) || (!same(i + 1) && zb[i + 1] > zb[i] + 14)) out[i] = 1;
    if (!same(below) && zb[below] < zb[i] - 1 && Math.abs(zb[i] - zb[i - NW]) < 0.5) out[i] = 1;
  }
  // The lake is only brightened: deepening its dark steps as well turned the water navy, and round 3's
  // lake read as a bright sheet. The rock of the fin and the wall gets both, lit faces up and gullies down.
  const bolder = c => { const n = R[RAMP_OF[c]].length, s = STEP_OF[c]; return s >= n * 0.45 ? LIGHT[c] : s <= n * 0.25 ? SHADE[c] : c; };
  for (let i = 0; i < dest.length; i++) { const d = dest[i]; if (!d) continue; g[i] = out[i] || g[i] === INK ? INK : d === 5 ? LIGHT[g[i]] : d & 4 ? bolder(g[i]) : g[i]; }
}
const FOGTREES = [];
const riverFront = (u, v) => { if (coast(u, v) < -170) return false; for (let dv = 1; dv <= 34; dv += 3) for (let du = -8; du <= 8; du += 4) { const uu = Math.round(u + du), vv = Math.round(v + dv); if (uu >= 0 && vv >= 0 && uu < NW && vv < VD && water[at(uu, vv)] && coast(uu, vv) < 0) return true; } return false; };
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
  if (!B) for (let y = 0; y < SH; y++) for (let x = 0; x < 660; x++) {
    const i = px(x, y), v = zb[i]; if (v >= VD || mb[i] !== 0) continue;
    const w = foggy(x, v); if (w > 0 && bayer(x, y) < w && !water[at(x, Math.round(v))]) g[i] = white(x, y);
  }
  const rr = rng(2311);
  const ink = (x, y, v, k) => { if (B || x < 0 || y < 0 || x >= NW || y >= SH) return; const i = px(x, y); if (zb[i] < v - 2) return; g[i] = RANK[clamp(Math.floor(k + 0.9 * (bayer(x + 3, y) - 0.5)), 0, 7)]; zb[i] = v; mb[i] = 0; };
  // A bare snag: a trunk that thickens low down, a broken top, and a few stubs that stick out unevenly.
  const snagAt = (x0, base, v, hgt, k) => {
    const top = base - Math.round(hgt), lean = (rr() - 0.5) * 0.22, at = d => Math.round(x0 + lean * d);
    for (let d = 0; top + d <= base + 2; d++) { ink(at(d), top + d, v, k); if (d > hgt * 0.45) ink(at(d) + 1, top + d, v, k); }
    for (let d = 3 + rr() * 3; d < hgt * 0.7; d += 3 + rr() * 6) { const side = rr() < 0.5 ? -1 : 1, len = 1 + Math.round(rr() * 2), y = top + Math.round(d); for (let j = 1; j <= len; j++) ink(at(d) + (side > 0 ? 1 : 0) + side * j, y - (j === len && rr() < 0.5 ? 1 : 0), v, k); }
  };
  // One tree of a rank: one of the forest's own conifers, paled through the fog by how deep in it
  // stands, the way round 3's mist paled the trees under it. It keeps its texture.
  const VEILS = [0.1, 0.24, 0.38, 0.51, 0.63, 0.74, 0.84].map(veilTable);
  // Its trees are the forest's own conifers, drawn live so they sway (D6a): tall in the nearest ranks,
  // smaller and with fewer tiers of branches the farther back they stand, and paled through the fog.
  const SIZES = [24, 28, 33, 38, 44, 50, 57, 64], kinds = SIZES.map((H, n) => Array.from({ length: 3 }, (_, i) => makeConifer(360 + n * 7 + i, H, Math.round(H * 0.5), 'conifer', Math.max(5, Math.round(H / 7)))));
  const tree = (x0, base, v, hgt, half, k, snag) => {
    if (snag) return snagAt(x0, base, v, hgt * 1.25, k - 0.6);
    const want = (64 - 34 * smooth(0, VD, v)) * (0.8 + 0.4 * vnoise(x0 / 23, v / 17, 237)), n = SIZES.reduce((b, H, j) => Math.abs(H - want) < Math.abs(SIZES[b] - want) ? j : b, 0), set = kinds[n];
    const t = set[(rr() * set.length) | 0]; if (!riverFront(x0, v)) FOGTREES.push({ t, x: x0, y: base, v, k });
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
    if (!B) for (let x = 0; x < 660; x++) {
      const v = vOf(x); if (v < 2 || v >= VD - 1) continue;
      const w = foggy(x, v); if (w < 0.05) continue;
      const base = Math.round(SY - v - hAt(x, v));
      for (let y = Math.max(0, base - 7); y <= Math.min(SH - 1, base + 12); y++) {
        const i = px(x, y); if (zb[i] < v - 2) continue;
        if (bayer(x, y) < smooth(base - 7, base + 1, y) * w && !(zb[i] < VD && water[at(x, Math.round(zb[i]))])) { g[i] = white(x, y); zb[i] = v - 4; mb[i] = 0; }
      }
    }
  }
}
// ---- things that stand up -------------------------------------------------------------------------
const STACKS = [], things = [], put = (bm, u, v, f, tree) => things.push({ bm, u: Math.round(u), v: Math.round(v), fog: f, isTree: tree }), plant = (tree, u, v, f) => things.push({ tree, u: Math.round(u), v: Math.round(v), fog: f });
const wet8 = (u, v) => { for (let dv = -3; dv <= 6; dv += 3) for (let du = -9; du <= 9; du += 3) if (water[at(clamp(u + du, 0, NW - 1), clamp(v + dv, 0, VD - 1))]) return true; return false; };
const slope = (u, v) => Math.hypot(hAt(u + 2, v) - hAt(u - 2, v), hAt(u, v + 2) - hAt(u, v - 2)) / 4;
const open = (u, v, max = 0.8) => u > 2 && u < NW - 2 && v > 1 && v < VD - 2 && coast(u, v) < -32 && !lakeAt(u, v) && !water[at(Math.round(u), Math.round(v))] && !wet8(Math.round(u), Math.round(v)) && slope(u, v) < max && !nearTrail(u, v, 9) && Math.hypot(u - TU, (v - TV) * 1.4) > 46;
{
  const rand = rng(2026), any = a => a[(rand() * a.length) | 0], land = (u, v) => MATS[mg[at(Math.round(u), Math.round(v))]] === 'land';
  const wooded = (u, v) => { const i = at(Math.round(u), Math.round(v)), m = MATS[mg[i]], h = hg[i]; return m === 'land' ? h < 100 && !(u > 760 && v > 684) : m === 'volc' ? VP(Math.min(1, vrelief(u, v).d)) < 0.17 + 0.05 * vnoise(u / 30, v / 30, 588) : m === 'crest' ? h < 48 : false; };
  const twisted = Array.from({ length: 5 }, (_, i) => makeTwisted(1200 + i));
  // Distance and height (D6a). The map has no perspective, so a tree far back or high up is drawn as a
  // smaller, plainer conifer, paled a little by the haze: at the back of the map about half size, and
  // shrinking further toward the treeline. Picked by where it stands, never by the dice, so nothing else moves.
  const shrinkAt = (u, v) => clamp(0.62 * smooth(520, 735, v) + 0.35 * smooth(70, 115, hAt(u, v)), 0, 0.72);
  const SMALL = [10, 13, 16, 20, 24, 29, 35, 42], smallOf = {};
  const sized = (t, u, v, ramp = 'conifer') => { const k = shrinkAt(u, v); if (k < 0.12) return t; const lib = smallOf[ramp] || (smallOf[ramp] = SMALL.map((H, n) => Array.from({ length: 3 }, (_, i) => makeConifer(1400 + n * 5 + i + ramp.length * 100, H, Math.round(H * 0.48) + 1, ramp, Math.max(3, Math.round(H / 7)))))); const want = (t.h || 40) * (1 - k), n = SMALL.reduce((b, H, j) => Math.abs(H - want) < Math.abs(SMALL[b] - want) ? j : b, 0), set = lib[n]; return { ...set[(hash(u | 0, v | 0, 5931) * set.length) | 0], haze: k }; };
  // Glades: the near rainforest opens into clearings here and there, so it reads as stands of trees.
  const glade = (u, v) => fogAmt(u, v) < 0.3 && fbm(u / 40, v / 30, 78, 3) < 0.34;
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
    if (f < 0.2 && (nearTrail(u, v, 46) && rand() < 0.3 || rand() < 0.04)) { const b = any(bigleaf); if (glade(u, v)) continue; if (shrinkAt(u, v) >= 0.12) plant(sized({ h: 40 }, u, v), u, v, f); else put(b, u, v, f, true); continue; }
    if (rand() < f * f * 0.5) { const sn = any(snags); if (shrinkAt(u, v) < 0.3) put(sn, u, v, f, true); } else { const t = r < 0.45 ? ((m) => f > 0.2 && hash(u | 0, v | 0, 5911) < 0.65 ? twisted[(hash(u | 0, v | 0, 5912) * twisted.length) | 0] : m)(any(maples)) : r < 0.88 ? any(spruces) : any(firs); if (glade(u, v) || riverFront(u, v)) continue; plant(sized(t, u, v), u, v, f); }
  }
  // Firs in clumps over the parkland, the meadows and the lower slopes of the crest.
  for (let n = 0; n < 5200; n++) {
    const u = edgeE - 60 + rand() * 1000, v = rand() * VD, pa = parkAmt(u, v), h = hAt(u, v);
    if (fbm(u / 46, v / 40, 71, 3) < (pa > 0.4 || h > 20 ? 0.55 : 0.61) || forestAmt(u, v) > 0.2 || !open(u, v, 1.1) || h > 80) continue;
    if (!wooded(u, v)) continue;
    if (rand() < Math.max(larchAmt(u, v), dryAmt(u, v) * 1.2, burnAmt(u, v), eastAmt(u, v) * 0.8)) continue;
    // Round the Trailhead the meadow opens out (D6): clear grass near it, and further off only the
    // thickest clumps, with open ground between them. Checked after the dice so nothing else moves.
    const fir = any(firs), dT = Math.hypot(u - TU, (v - TV) * 1.4);
    if (dT < 70 || fbm(u / 46, v / 40, 71, 3) < (pa > 0.4 || h > 20 ? 0.55 : 0.61) + 0.09 * smooth(300, 110, dT)) continue;
    plant(sized(fir, u, v), u, v);
  }
  // Mount Monolith's lower flanks: firs in clumps up to the meadows under the ice, spruce where the
  // rainforest reaches round its west side.
  for (let n = 0; n < 2600; n++) {
    const u = VOLC.cu + (rand() * 2 - 1) * VOLC.ru, v = VOLC.cv + (rand() * 2 - 1) * VOLC.rv;
    if (MATS[mg[at(Math.round(u), Math.round(v))]] !== 'volc' || !wooded(u, v) || fbm(u / 34, v / 26, 589, 3) < 0.5 || !open(u, v, 1.6)) continue;
    plant(sized(forestAmt(u, v) > 0.3 && rand() < 0.6 ? any(spruces) : any(firs), u, v), u, v, fogAmt(u, v));
  }
  for (let n = 0; n < 5200; n++) {
    const u = C.LB[0] - C.LB[2] - 50 + rand() * (C.LB[2] * 2 + 100), v = C.LB[1] - C.LB[3] - 40 + rand() * (C.LB[3] * 2 + 80), m = MATS[mg[at(clamp(Math.round(u), 0, NW - 1), clamp(Math.round(v), 0, VD - 1))]], hi = m === 'gran';
    if (m === 'fin' || m === 'crest' || rand() > larchAmt(u, v) * (hi ? (hAt(u, v) > 98 ? 0.16 : 0.5) : 0.8) || fbm(u / 40, v / 30, 120, 3) < (hi ? 0.5 : 0.52) || !open(u, v, 0.7)) continue;
    if (rand() < burnAmt(u, v) * 1.2) { if (rand() < 0.4) put(any(snags), u, v); continue; }
    { const lt = sized(any(larches), u, v, 'larch'); if (talusAt(u, v) < 0.08) plant(lt, u, v); }
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
    stood.push([u, v]); { const pn = any(pines); if (hash(u | 0, v | 0, 5941) > palAmt(u, v)) plant(pn, u, v); }
  }
  for (let n = 0; n < 520; n++) { const u = 1690 + rand() * 230, v = 380 + rand() * 190; if (rand() < burnAmt(u, v) && open(u, v) && land(u, v)) put(any(snags), u, v, 0, true); }
  // Round 3's furniture of the ground: boulders and bushes in the open, granite slabs among the larches,
  // sage in the dry corner, ferns and logs on the forest floor, sea stacks off the beach, a fir on the island.
  const boulders = Array.from({ length: 6 }, (_, i) => makeBoulder(500 + i, 3 + i * 0.8));
  const slabs = Array.from({ length: 4 }, (_, i) => { const b = makeBoulder(520 + i, 5 + i * 1.5); for (let k = 0; k < b.d.length; k++) if (b.d[k] && b.d[k] !== INK) b.d[k] = R.granite[clamp(R.rock.indexOf(b.d[k]) + 1, 1, 5)]; return b; });
  const bushes = [0, 1, 2].map(i => makeBush(700 + i, 'huck')).concat([0, 1, 2].map(i => makeBush(710 + i, 'heather')), [0, 1].map(i => makeBush(720 + i, 'green')));
  // Each bush's top sways in the wind (D5a); SWAY gives its swaying version.
  const SWAY = new Map(bushes.map(b => [b, swaying(b)]));
  const sages = [0, 1, 2].map(i => sageBush(850 + i)), burnt = Array.from({ length: 4 }, (_, i) => charred(740 + i)), young = Array.from({ length: 4 }, (_, i) => makeConifer(940 + i, 9 + i * 2, 6, 'kit', 3));
  const ferns = Array.from({ length: 6 }, (_, i) => makeFern(400 + i)), logs = Array.from({ length: 6 }, (_, i) => makeLog(i));
  const meadowy = (u, v) => forestAmt(u, v) < 0.3 && burnAmt(u, v) < 0.3 && dryAmt(u, v) < 0.3 && Math.hypot(u - TU, (v - TV) * 1.4) > 40;
  for (let n = 0; n < 700; n++) { const u = 420 + rand() * 1200, v = rand() * 640; if (!open(u, v) || !meadowy(u, v)) continue; const m = MATS[mg[at(Math.round(u), Math.round(v))]]; if (m !== 'land' && m !== 'moraine') continue; const rock = m === 'moraine' || rand() < 0.3; if (rock) put(any(boulders), u, v); else plant(SWAY.get(any(bushes)), u, v); }
  // The parkland's heather grows in clumps where the drifts leave room for it, and a few boulders lie
  // about (D5). Their own dice, so nothing planted before them moves.
  { const hr = rng(4711), heath = bushes.slice(3, 6), anyH = a => a[(hr() * a.length) | 0];
    for (let n = 0; n < 2400; n++) { const u = C.PK[0] + (hr() * 2 - 1) * C.PK[2] * 1.3, v = C.PK[1] + (hr() * 2 - 1) * C.PK[3] * 1.3; if (DRIFT(u, v) !== 'heather' || hr() > 0.55 || !open(u, v) || !meadowy(u, v)) continue; plant(SWAY.get(anyH(heath)), u, v); }
    // Wildflowers in clumps (D5a): thick in the parkland's drifts, scattered through the other meadows,
    // each clump a little drawing of stems whose blooms sway on their own.
    // Flowers grow on slopes a tree could not stand on, so they keep to their own rule.
    const bloomy = (u, v) => u > 2 && u < NW - 2 && v > 1 && v < VD - 2 && coast(u, v) < -32 && !lakeAt(u, v) && !water[at(Math.round(u), Math.round(v))] && slope(u, v) < 2.4 && !nearTrail(u, v, 5);
    const fr = rng(11), FL = {}; for (const k of ['lupine', 'red', 'white', 'yellow']) FL[k] = Array.from({ length: 4 }, (_, i) => makeFlowers(k, 1300 + i * 7 + k.length));
    for (let n = 0; n < 9000; n++) {
      const cu = fr() * NW, cv = fr() * VD, type = fr(), dw = DRIFT(cu, cv), count = (dw ? 3 : 2) + (fr() * (dw ? 6 : 4) | 0), m = MATS[mg[at(Math.round(cu), Math.round(cv))]];
      if ((m !== 'land' && m !== 'volc') || !bloomy(cu, cv) || forestAmt(cu, cv) > 0.25) continue;
      // Thicker in the open meadow round the Trailhead, as round 3's was (D6).
      const want = (dw === 'heather' ? 0.25 : dw ? 1.2 : 0.9) * parkAmt(cu, cv) + (forestAmt(cu, cv) < 0.2 && dryAmt(cu, cv) < 0.2 && larchAmt(cu, cv) < 0.2 && burnAmt(cu, cv) < 0.2 ? 0.07 + 0.4 * smooth(260, 90, Math.hypot(cu - TU, (cv - TV) * 1.4)) : 0);
      if (fr() > want) continue;
      for (let k = 0; k < count; k++) {
        const u = cu + (fr() - 0.5) * 18, v = cv + (fr() - 0.5) * 10; if (!bloomy(u, v)) continue;
        const kind = DRIFT(u, v) || (type < 0.5 ? 'lupine' : type < 0.75 ? 'red' : type < 0.9 ? 'white' : 'yellow'); if (kind === 'heather') continue;
        plant(FL[kind][(fr() * 4) | 0], u, v);
      }
    }
    for (let n = 0; n < 400; n++) { const u = C.PK[0] + (hr() * 2 - 1) * C.PK[2], v = C.PK[1] + (hr() * 2 - 1) * C.PK[3]; if (parkAmt(u, v) < 0.6 || hr() > 0.12 || !open(u, v, 1) || !meadowy(u, v)) continue; put(anyH(boulders), u, v); } }
  for (let n = 0; n < 300; n++) { const u = 1240 + rand() * 680, v = 380 + rand() * 320; if (MATS[mg[at(Math.round(u), Math.round(v))]] === 'gran' && open(u, v, 0.7) && rand() < 0.5) put(any(slabs), u, v); }
  // Big blocks lie about the talus fan, on dice of their own (D9).
  if (PF) { const tr = rng(910); for (let n = 0; n < 260; n++) { const u = PF.cu - 100 + tr() * 200, v = PF.cv - 42 + tr() * 38, k = (tr() * 3) | 0; if (talusAt(u, v) > 0.35 && tr() < 0.22 && !snowPatch(u, v) && MATS[mg[at(Math.round(u), Math.round(v))]] === 'gran') put(boulders[k], u, v); } }
  const SAGE = new Map(sages.map(b => [b, swaying(b)]));
  for (let n = 0; n < 900; n++) { const u = 1300 + rand() * 620, v = rand() * 480; if (rand() < sageAmt(u, v) * 0.5 && open(u, v) && land(u, v)) plant(SAGE.get(any(sages)), u, v); }
  // The sage flats (D10): bushes thick where the pines have given out, thinning onto the Palouse.
  { const sr = rng(4720); for (let n = 0; n < 5200; n++) { const u = 1300 + sr() * 620, v = sr() * 480, k = (sr() * sages.length) | 0; if (sr() < sageAmt(u, v) * 0.55 * (1 - 0.8 * palAmt(u, v)) && open(u, v) && land(u, v)) plant(SAGE.get(sages[k]), u, v); } }
  for (let n = 0; n < 400; n++) { const u = 1690 + rand() * 230, v = 380 + rand() * 190; if (rand() < burnAmt(u, v) && open(u, v) && land(u, v)) { if (rand() < 0.5) put(any(burnt), u, v, 0, true); else plant(any(young), u, v); } }
  for (let n = 0; n < 4000; n++) { const u = rand() * 720, v = rand() * VD; if (forestAmt(u, v) > 0.6 && fogAmt(u, v) < 0.25 && open(u, v, 1.1) && wooded(u, v)) things.push({ bm: any(ferns), u: Math.round(u), v: Math.round(v), fern: true }); }
  for (let n = 0; n < 120; n++) { const u = rand() * 720, v = rand() * VD; if (forestAmt(u, v) > 0.7 && fogAmt(u, v) < 0.25 && open(u, v, 0.8) && wooded(u, v)) put(any(logs), u, v); }
  { const dr = rng(4730), drift = Array.from({ length: 4 }, (_, i) => { const b = makeLog(30 + i, true), o = new BM(b.w, b.h); o.ox = b.ox; o.oy = b.oy; for (let k = 0; k < b.d.length; k++) { const c = b.d[k]; o.d[k] = !c || c === INK ? c : R.gold[clamp(3 + Math.round((hash(k, i, 4732) - 0.3) * 2.4), 3, 5)]; } return o; }); // bleached by the sea
    for (let n = 0; n < 1400; n++) { const u = dr() * 560, v = dr() * 460, k = (dr() * drift.length) | 0, c = coast(u, v); if (c > -20 && c < -9 && dr() < 0.2 && !water[at(Math.round(u), Math.round(v))]) put(drift[k], u, v); } }
  { const seen = []; for (let n = 0; n < 4000 && seen.length < 6; n++) { const u = rand() * 520, v = rand() * 420, c = coast(u, v); if (c < 18 || c > 44 || seen.some(([a, b]) => Math.hypot(a - u, b - v) < 70)) continue; seen.push([u, v]); STACKS.push([u, v]); const H = 16 + (rand() * 34 | 0); put(seaStack(seen.length, H, Math.round(H * 0.45)), u, v); } }
  plant(any(firs), ISLE[0], ISLE[1]);
}
// Surf breaks white round the foot of each sea stack, broken into dashes (D11).
if (!B) for (const [su, sv] of STACKS) { const fy = Math.round(SY - sv - hAt(su, sv)); for (let a = 0; a < 6.283; a += 0.05) { const x = Math.round(su + Math.cos(a) * 9), y = Math.round(fy + 1 + Math.sin(a) * 3); if (x < 0 || y < 0 || x >= NW || y >= SH || hash(Math.round(a * 9), 0, 4731) < 0.25) continue; const i = px(x, y); if (coast(x, zb[i]) > 0) g[i] = Math.sin(a) > 0 ? R.white[1] : R.white[0]; } }
// Far first. A thing the fog touches, or that nearer ground partly hides, is painted into the ground
// picture for good: clipped where it is hidden, its foot lost in the fog and the rest of it paled, the
// more so the deeper into the fog it stands. Every other thing is handed to the scene whole, to be
// drawn each frame.
things.sort((a, b) => b.v - a.v);
const live = [], HAZE = [0.1, 0.18, 0.27, 0.36].map(veilTable);
for (const th of things) {
  const h = hAt(th.u, th.v), fy = Math.round(SY - th.v - h), ft = th.fog ? fogTop(th.u, th.v) : -1;
  if (fy >= 0 && fy < SH && painted[px(Math.round(th.u), fy)]) continue;
  const blit = (bm, sx, sy) => { for (let j = 0; j < bm.h; j++) for (let i = 0; i < bm.w; i++) { const c = bm.d[j * bm.w + i], x = sx + i, y = sy + j; if (!c || x < 0 || y < 0 || x >= NW || y >= SH || zb[px(x, y)] < th.v - 3) continue; const up = h + fy - y; g[px(x, y)] = th.fog > 0.02 && bayer(x, y) < (ft - up) / 5 + 0.15 ? fogInk(x, y, ft - up) : c; } };
  const each = fn => { if (th.tree) for (const p of th.tree.parts) fn(p.bm, th.u + p.x, fy + p.y); else fn(th.bm, th.u - (th.bm.ox || 0), fy - (th.bm.oy || 0)); };
  let n = 0, seen = 0;
  each((bm, sx, sy) => { for (let j = 0; j < bm.h; j++) for (let i = 0; i < bm.w; i++) { if (!bm.d[j * bm.w + i]) continue; n++; const x = sx + i, y = sy + j; if (x >= 0 && y >= 0 && x < NW && y < SH && zb[px(x, y)] >= th.v - 3) seen++; } });
  if (th.tree || th.isTree) {
    if (seen < n * 0.12) continue;
    const fogged = th.fog > 0.02 && ft > -1, hz = th.tree && th.tree.haze ? HAZE[clamp(Math.floor(th.tree.haze * 5.5) - 1, 0, 3)] : null, veil = (bm, sx, sy) => { if (!fogged && !hz) return bm; const o = new BM(bm.w, bm.h); o.ox = bm.ox; o.oy = bm.oy; for (let j = 0; j < bm.h; j++) for (let i = 0; i < bm.w; i++) { let c = bm.d[j * bm.w + i]; if (!c) continue; if (hz) c = hz[c]; if (!fogged) { o.d[j * bm.w + i] = c; continue; } const x = sx + i, y = sy + j, up = h + fy - y; o.d[j * bm.w + i] = bayer(x, y) < (ft - up) / 5 + 0.15 ? fogInk(x, y, ft - up) : c; } return o; };
    const clip = seen < n;
    if (th.tree) live.push({ tree: fogged || hz ? { ...th.tree, parts: th.tree.parts.map(p => ({ ...p, bm: veil(p.bm, th.u + p.x, fy + p.y) })) } : th.tree, x: th.u, y: fy, v: th.v, clip });
    else live.push({ bm: veil(th.bm, th.u - (th.bm.ox || 0), fy - (th.bm.oy || 0)), x: th.u, y: fy, v: th.v, isTree: true, clip });
    continue;
  }
  if (!(th.fog > 0.22) && seen >= n * 0.97) { live.push(th.tree ? { tree: th.tree, x: th.u, y: fy, v: th.v } : { bm: th.bm, x: th.u, y: fy, v: th.v, fern: th.fern, isTree: th.isTree }); continue; }
  if (!B && seen >= n * 0.12) each(blit);
}
{ const VEILS = [0.1, 0.24, 0.38, 0.51, 0.63, 0.74, 0.84].map(veilTable);
  for (const F of FOGTREES) { let n = 0, seen = 0; const parts = F.t.parts.map(p => { const o = new BM(p.bm.w, p.bm.h); for (let j = 0; j < p.bm.h; j++) for (let i = 0; i < p.bm.w; i++) { const c = p.bm.d[j * p.bm.w + i]; if (!c) continue; const x = F.x + p.x + i, y = F.y + p.y + j; n++; if (x >= 0 && y >= 0 && x < NW && y < SH && zb[px(x, y)] >= F.v - 3) seen++; o.d[j * p.bm.w + i] = VEILS[clamp(Math.floor(F.k + 0.9 * (bayer(x + 3, y) - 0.5)), 0, 6)][c]; } return { ...p, bm: o }; });
    if (seen >= n * 0.12) live.push({ tree: { ...F.t, parts }, x: F.x, y: F.y, v: F.v, clip: true }); } }

if (!B) for (const th of live) {
  if (!th.tree && !th.isTree) continue;
  const rx = (th.tree ? th.tree.w : th.bm.w) * 0.42;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -Math.ceil(rx); dx <= rx; dx++) { if (sq(dx / rx) + sq(dy / 3.2) > 1) continue; const x = th.x + dx + 2, y = th.y + dy - 1; if (x < 0 || y < 0 || x >= NW || y >= SH) continue; const i = px(x, y); if (Math.abs(zb[i] - th.v) < 5 && g[i] !== INK) g[i] = SHADE[g[i]]; }
}
// Each footbridge's rails are things of their own: the far rail sorts behind him as he crosses and the
// near rail in front, so he is seen to run between them.
for (const br of BRIDGES) {
  const [ax, ay] = br.pts[0], [bx, by] = br.pts[br.pts.length - 1], len = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / len, uy = (by - ay) / len;
  let nx = -uy, ny = ux; if (ny < 0) { nx = -nx; ny = -ny; }
  const X0 = Math.floor(br.x0) - 7, Y0 = Math.floor(br.y0) - 13, bw = Math.ceil(br.x1) - X0 + 8, bh = Math.ceil(br.y1) - Y0 + 9;
  const rail = (side, sortY, v) => {
    const b = new BM(bw, bh), qx = t => ax + ux * t + nx * side * 3 - X0, qy = t => ay + uy * t + ny * side * 3 - Y0; b.ox = 0; b.oy = sortY - Y0;
    for (const t of [1, len / 2, len - 1]) for (let h = 0; h < 4; h++) b.set(qx(t), Math.round(qy(t)) - h, R.wood[2]);
    for (let t = 0; t <= len; t += 0.5) b.set(qx(t), Math.round(qy(t)) - 4, R.wood[4]);
    outline(b, INK); live.push({ bm: b, x: X0, y: sortY, v });
  };
  rail(-1, Math.floor(Math.min(ay, by)) - 3, br.v1); rail(1, Math.ceil(Math.max(ay, by)) + 4, br.v0);
}
const toY = (u, v) => Math.round(SY - v - hAt(u, v));
return { g, depth: zb, mat: mb, dest, destBox, DEST, hg, mg, painted, falls: FALLS, MATS, hAt, toY, things: live, C, volc: VOLC, spires: SP, peak: PF, routes, water, trail, coast, forestAmt, fogAmt, dryAmt, sageAmt, parkAmt, larchAmt, burnAmt, lakeAt, slope, matAt: (u, v) => MATS[mg[at(clamp(Math.round(u), 0, NW - 1), clamp(Math.round(v), 0, VD - 1))]] };
}

// ---- for the scene --------------------------------------------------------------------------------
// The scene works in positions on the map picture: x across, y down. Below is the land in those terms,
// under the names the scene took from round 3's terrain.js. Every position is worked out from the
// layout above, so moving a place there moves everything that belongs to it.
// The ground takes seconds to work out, so bake.sh works it out ahead of time into ground.png: the
// picture, the depth and what each pixel is made of, which pixels are painted mountain, then the heights,
// the materials and the water of the map. A bake is used only if it was made from the same source as
// this page (sourceSig); otherwise the land is worked out here, which is slow, not wrong.
export async function sourceSig() {
  const seen = new Set(), queue = ['./land.js']; let h = 2166136261;
  while (queue.length) {
    const f = queue.shift(); if (seen.has(f)) continue; seen.add(f);
    const t = await (await fetch(new URL(f, import.meta.url))).text();
    for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0;
    for (const m of t.matchAll(/from '(\.\/[\w.]+\.js)'/g)) queue.push(m[1]);
  }
  return h.toString(16);
}
export const BAKE_ROWS = 5 * SH + 4 * VD;
async function readBake() {
  if (globalThis.__noBake) return null;
  try {
    const res = await fetch(new URL('./ground.png', import.meta.url)); if (!res.ok) return null;
    const b = new Uint8Array(await res.arrayBuffer()), dv = new DataView(b.buffer), parts = []; let w = 0, h = 0, sig = '';
    for (let p = 8; p + 12 <= b.length;) {
      const n = dv.getUint32(p), type = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]);
      if (type === 'IHDR') { w = dv.getUint32(p + 8); h = dv.getUint32(p + 12); }
      else if (type === 'IDAT') parts.push(b.subarray(p + 8, p + 8 + n));
      else if (type === 'tEXt') { const t = String.fromCharCode(...b.subarray(p + 8, p + 8 + n)); if (t.startsWith('sig\0')) sig = t.slice(4); }
      p += 12 + n;
    }
    const want = await sourceSig();
    if (w !== NW || h !== BAKE_ROWS || sig !== want) { if (location.hostname === 'localhost') console.warn('ground.png no longer matches the map: run ./bake.sh'); return null; }
    const px = new Uint8Array(await new Response(new Blob(parts).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
    if (px.length !== (w + 1) * h) return null;
    // One plane after another, each as wide as the map; every row starts with a 0 (stored as it is).
    let y0 = 0; const plane = rows => { const a = new Uint8Array(NW * rows); for (let y = 0; y < rows; y++) a.set(px.subarray((y0 + y) * (w + 1) + 1, (y0 + y + 1) * (w + 1)), y * NW); y0 += rows; return a; };
    const g = plane(SH), zh = plane(SH), zl = plane(SH), mb = plane(SH), painted = plane(SH), hh = plane(VD), hl = plane(VD), mg = plane(VD), water = plane(VD);
    const zb = new Float32Array(NW * SH), hg = new Float32Array(NW * VD);
    for (let i = 0; i < zb.length; i++) { const q = zh[i] << 8 | zl[i]; zb[i] = q === 65535 ? 1e9 : q / 64; }
    for (let i = 0; i < hg.length; i++) hg[i] = (hh[i] << 8 | hl[i]) / 32;
    return { g, zb, mb, painted, hg, mg, water };
  } catch (e) { console.warn('ground.png could not be read', e); return null; }
}
export const LAND = buildLand(await readBake());
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
  // The rainforest's eerie corner (D3). An owl on a stub where the fog begins; one faint light that
  // drifts deeper in; three pairs of eyes far back in the thickest fog, seen only at Dusk; crows over
  // the forest's sunny edge.
  const owl = find(1, (u, v) => firm(u, v, 0.9) && S.forestAmt(u, v) > 0.8 && S.fogAmt(u, v) > 0.22 && S.fogAmt(u, v) < 0.45 && trailFar(u, v) > 8 && shows(u, v, 16), 0)[0];
  const wisp = find(1, (u, v) => S.forestAmt(u, v) > 0.6 && S.fogAmt(u, v) > 0.45 && S.fogAmt(u, v) < 0.7 && shows(u, v, 4), 0)[0];
  const eyes = find(3, (u, v) => S.forestAmt(u, v) > 0.5 && S.fogAmt(u, v) > 0.55 && S.coast(u, v) < -40 && shows(u, v, 6), 60);
  // The crows keep to low forest on plain ground, so they circle against trees and not the mountain's ice.
  const crows = find(1, (u, v) => S.forestAmt(u, v) > 0.6 && S.forestAmt(u, v) < 0.9 && S.fogAmt(u, v) < 0.15 && S.matAt(u, v) === 'land' && S.hAt(u, v) < 30 && shows(u, v, 4), 0)[0];
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
    owl: owl ? out(...owl) : null, wisp: wisp ? out(...wisp) : null, eyes: eyes.map(p => out(...p)),
    flocks: [
      crows && { cx: out(...crows)[0], cy: out(...crows)[1], rx: 40, ry: 14, n: 4, lift: 26, w: 0.33 },
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
    signs: H.signs, elk: H.elk, goats: H.goats, sheep: H.sheep, marmots: H.marmots, squirrels: H.squirrels, bear: H.bear, jelly: H.jelly, whale: H.whale, ferry: H.ferry, owl: H.owl, wisp: H.wisp, eyes: H.eyes
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
  return { g: LAND.g, vAt, depth: LAND.depth, dest: LAND.dest, destBox: LAND.destBox, DEST: LAND.DEST, things: LAND.things, falls: LAND.falls, spots, lines, trails: { lake: flat(lines.lake), stack: flat(lines.stack), spires: flat(lines.spires) }, trackPix: [], forestAmt, coast, open, nearTrail, sea: SEA, mist: mistBox(H), flocks: H.flocks, make: { ferry, whale, sheep, squirrel } };
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
