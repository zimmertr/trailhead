// A workbench page: round 4's map blocked in with real height, to choose how the mountains should
// belong to the world. relief.html?v=1|2|3&labels=1&crop=x,y&scale=k
//   v=1 the land climbs into the mountains   v=2 flat ground, massifs at different depths
//   v=3 the crest runs toward the camera
// The world is a height for every spot (u east, v away from the camera). A spot is drawn at screen
// (u, SH - v - height), nearest first, so ground and mountains are one surface and near slopes hide
// far ones. Nothing here is used by the site.
import { DAY, R, INK, TAU, clamp, lerp, smooth, frac, sq, rng, hash, vnoise, fbm, bayer, pick, catmull } from './core.js';
import { makeMaple, makeAspen, makePonderosa, makeSpruce, makeFir, makeConifer, makeSnag, makeSignpost, makeKiosk, makeTent } from './sprites.js';

const q = new URLSearchParams(location.search), VAR = +(q.get('v') || 1), NW = 1920, SH = 1080, VD = 740;
const rdg = n => 1 - Math.abs(2 * n - 1);
const prof = pts => x => { if (x <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [xa, ha] = pts[i - 1], [xb, hb] = pts[i]; return lerp(ha, hb, (x - xa) / (xb - xa)); } return pts[pts.length - 1][1]; };

// ---- the pieces a layout is made of ---------------------------------------------------------------
const F = [], C = { lakes: [], water: [], trails: [], tags: [] };
const add = (mat, u0, u1, v0, v1, fn) => F.push({ mat, u0, u1, v0, v1, fn });
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
// A tongue of ice from one spot down to another.
const tongue = (u0, v0, u1, v1, w0, w1, h0, h1) => add('ice', Math.min(u0, u1) - w0 - 4, Math.max(u0, u1) + w0 + 4, Math.min(v0, v1) - w0, Math.max(v0, v1) + w0, (u, v) => {
  const du = u1 - u0, dv = v1 - v0, t = clamp(((u - u0) * du + (v - v0) * dv) / (du * du + dv * dv), 0, 1), d = Math.hypot(u - u0 - du * t - 5 * Math.sin(t * 3.4), v - v0 - dv * t);
  return lerp(h0, h1, t) * smooth(lerp(w0, w1, t) + 3 * (vnoise(u / 8, v / 8, 9) - 0.5), lerp(w0, w1, t) - 4, d);
});
// Mount Monolith, after Rainier: a dome with a nearly flat top, a shoulder to the west and a small
// dark tooth low on the east flank. Its lower slopes run out into the land round it.
let VOLC = null;
const VP = prof([[0, 1], [0.07, 0.985], [0.14, 0.94], [0.25, 0.8], [0.4, 0.58], [0.55, 0.4], [0.7, 0.25], [0.85, 0.11], [1, 0]]);
function volcano(cu, cv, ru, rv, H) {
  VOLC = { cu, cv, ru, rv, H };
  add('volc', cu - ru, cu + ru, cv - rv, cv + rv, (u, v) => {
    const du = (u - cu) / ru, dv = (v - cv) / rv, d = Math.hypot(du, dv) + 0.05 * (vnoise(u / 40, v / 40, 559) - 0.5); if (d >= 1) return 0;
    const h = VP(Math.max(0, d)) + 0.06 * Math.exp(-sq((du + 0.21) / 0.06) - sq(dv / 0.22)) + 0.1 * Math.exp(-sq((du - 0.45) / 0.03) - sq((dv + 0.02) / 0.1)) + (d < 0.09 ? 0.012 * Math.cos(du * 70) : 0);
    return H * h * (1 + 0.05 * (vnoise(u / 18, v / 18, 560) - 0.5));
  });
}
// Sideproject Spires, after the Southern Pickets: one wall with six blunt summits, in the order of
// the projects from west to east. It rises from the cirque at its foot; buttresses stand forward.
let SP = null;
const SUMMITS = [[-94, 0.66, 26, 30, 8], [-60, 0.84, 24, 20, 5], [-24, 1, 26, 22, 9], [10, 0.86, 18, 20, 5], [42, 0.95, 22, 26, 8], [82, 0.7, 24, 34, 10]];
function spires(cu, cv, base, H, thin = 1) {
  SP = { cu, cv, base, H };
  const high = dx => {
    let best = H * (0.28 + 0.2 * smooth(160, 90, Math.abs(dx)));
    SUMMITS.forEach(([o, hh, wl, wr, cap], k) => { const u = Math.max(0, Math.abs(dx - o) - cap / 2) / (dx < o ? wl : wr), v = H * hh * (1 - 0.3 * Math.pow(u, 1.05)) - (dx - o) * (k & 1 ? 0.12 : -0.1) * (u === 0 ? 1 : 0); if (u < 2 && v > best) best = v; });
    return (best + (5 * sq(rdg(vnoise(dx / 4, 6, 811))) - 2.5 - 9 * smooth(0.74, 0.92, vnoise(dx / 6, 7, 812))) * smooth(0.3, 0.5, best / H)) * smooth(165, 120, Math.abs(dx));
  };
  add('wall', cu - 170, cu + 170, cv - 70, cv + 50, (u, v) => {
    const dx = u - cu, vv = v + 9 * (vnoise(u / 10, 3, 830) - 0.5) + 7 * Math.max(...SUMMITS.map(([o]) => Math.max(0, 1 - Math.abs(dx - o) / 14)));
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

// ---- the three layouts ----------------------------------------------------------------------------
// Above 0 is sea: the shore cuts the bottom-left corner.
const coast = (u, v) => (440 - v) - u * 0.936 + 26 * Math.sin(u / 95) + 44 * (fbm(u / 80, v / 80, 80, 3) - 0.5);
// Low ridges through the rainforest, one behind another, with hollows between them for the fog to
// lie in. They run mostly east and west, so each one carries a rank of trees across the picture.
const RA = 32, ridges = (u, v) => RA * rdg(fbm((v + 0.25 * u) / 85, u / 260, 31, 2)) * smooth(-24, -110, coast(u, v));
const wet = (u, v, e) => smooth(e + 130, e - 110, u);
let base = () => 0, edgeE = 590;
const mesas = () => { for (const [cu, cv, ru, rv] of [[1856, 330, 50, 16], [1822, 252, 40, 14], [1880, 182, 44, 15]]) plateau('land', cu, cv, ru, rv, 15, 0.05); };
const dryHills = (u, v) => 12 * fbm(u / 80, v / 60, 33, 2) * smooth(1540, 1700, u) * smooth(380, 470, v) + 46 * sq(fbm(u / 110, v / 80, 34, 2)) * smooth(1700, 1820, u) * smooth(400, 720, v);
const crestH = (c, a, b) => u => a + b * Math.exp(-sq((u - c) / 150));
if (VAR === 1) {
  // The land climbs. The valley floor is the near half; behind it the ground rises into the mountains,
  // and each destination sits on a mountain's own lower slopes.
  Object.assign(C, { T: [980, 400], PK: [660, 440, 210, 110], LB: [1400, 500, 235, 105], camp: [1098, 496] });
  base = (u, v) => 0.11 * Math.max(0, v - 400) + (ridges(u, v) + 0.16 * Math.max(0, v - 260) * smooth(220, 470, u)) * wet(u, v, 590) + dryHills(u, v) + 4 * smooth(960, 1200, u) * smooth(430, 470, v);
  volcano(640, 600, 300, 150, 262);
  plateau('land', 640, 436, 112, 34, 30, 0.1);
  C.lakes.push([640, 440, 46, 14, 'lake']);
  range('crest', 770, 1720, 716, u => 112 + 20 * vnoise(u / 70, 1, 64), 64, { front: 40, back: 18 });
  range('crest', 800, 950, 660, crestH(1070, 120, 60), 61);
  spires(1070, 648, 60, 150);
  plateau('ice', 1070, 598, 94, 34, 62, 0.12, 0.25); tongue(1068, 570, 1076, 514, 24, 15, 56, 41);
  plateau('moraine', 1078, 494, 88, 21, 38, 0.1);
  horn('crest', 962, 598, 46, 112, 92, { pow: 1.1 }); horn('crest', 1178, 596, 46, 108, 88, { pow: 1.1 });
  range('crest', 1200, 1270, 664, crestH(1070, 120, 60), 62);
  range('gran', 1290, 1660, 676, u => (128 - 0.2 * Math.max(0, u - 1450)) * (1 - 0.42 * Math.exp(-sq((u - 1384) / 90))), 63, { pow: 1.4, jag: 7, front: 50 });
  plateau('gran', 1425, 574, 205, 50, 58, 0.08); plateau('land', 1400, 480, 215, 50, 26, 0.1);
  proficiency(1384, 594, 58, 164, 150);
  C.lakes.push([1300, 572, 22, 7, 'tarn'], [1452, 550, 18, 6, 'tarn'], [1512, 582, 14, 5, 'tarn'], [1392, 480, 13, 4, 'tarn'], [1102, 490, 11, 4, 'milk']);
  mesas();
  C.water = [
    { r: [2.2, 3.2], pts: [[664, 428], [678, 414], [688, 402], [692, 392], [700, 384], [707, 350], [700, 322], [690, 300]] },
    { r: [4.6, 6], pts: [[690, 300], [672, 268], [640, 240], [592, 200], [522, 160], [452, 125], [402, 98], [368, 76], [338, 56]] },
    { r: [1.2, 1.8], pts: [[1078, 508], [1094, 494], [1108, 474], [1122, 440], [1118, 400], [1106, 360], [1070, 320]] },
    { r: [1.1, 1.8], pts: [[1512, 578], [1470, 556], [1440, 544], [1420, 524], [1412, 506], [1392, 482], [1356, 446], [1300, 400], [1240, 352], [1140, 318], [1070, 320]] },
    { r: [2.6, 3.4], pts: [[1070, 320], [980, 270], [880, 250], [790, 264], [690, 300]] }
  ];
  C.trails = [
    [[980, 400], [930, 396], [880, 392], [830, 388], [770, 386], [725, 384], [700, 384], [668, 380], [630, 376], [590, 378], [540, 390], [490, 384], [440, 360], [390, 354], [340, 370], [300, 410], [270, 450], [262, 490], [290, 520], [330, 530], [380, 515], [420, 500], [460, 492], [496, 470], [530, 448], [560, 436], [590, 434], [640, 424], [676, 420], [712, 424], [748, 426], [772, 414], [800, 402], [840, 394], [880, 392]],
    [[980, 400], [1000, 428], [1020, 452], [1040, 466], [1030, 474], [1052, 480], [1036, 486], [1060, 494], [1094, 496], [1084, 506], [1078, 516], [1074, 532], [1078, 550], [1070, 568], [1072, 586], [1068, 602]],
    [[980, 400], [1050, 404], [1118, 400], [1180, 412], [1240, 436], [1290, 462], [1330, 492], [1344, 512], [1364, 520], [1350, 530], [1362, 550], [1380, 580]]
  ];
} else if (VAR === 2) {
  // Flat ground as before, but each massif stands on it at its own distance, with a body and a foot.
  Object.assign(C, { T: [980, 430], PK: [690, 520, 230, 120], LB: [1400, 500, 235, 120], camp: [1098, 574] });
  base = (u, v) => ridges(u, v) * wet(u, v, 590) * 0.7 + dryHills(u, v);
  volcano(620, 690, 270, 56, 262);
  for (const [cu, cv, ru, H] of [[410, 670, 100, 40], [520, 660, 90, 34], [760, 660, 90, 38], [860, 668, 70, 44]]) horn('land', cu, cv, ru, 44, H, { pow: 1.1 });
  C.lakes.push([640, 540, 46, 15, 'lake']);
  range('crest', 800, 950, 690, crestH(1070, 100, 50), 61, { front: 34, back: 24 });
  spires(1070, 640, 26, 176, 0.75);
  plateau('ice', 1070, 602, 86, 16, 26, 0.14); tongue(1068, 592, 1076, 574, 22, 15, 22, 14);
  plateau('moraine', 1078, 560, 88, 20, 16, 0.1);
  range('crest', 1200, 1270, 690, crestH(1070, 100, 50), 62, { front: 34, back: 24 });
  range('gran', 1290, 1660, 700, u => (150 - 0.22 * Math.max(0, u - 1450)) * (1 - 0.3 * Math.exp(-sq((u - 1384) / 80))), 63, { pow: 1.4, jag: 7, front: 34, back: 24 });
  plateau('gran', 1420, 552, 200, 44, 19, 0.08);
  proficiency(1384, 566, 19, 164, 142);
  C.lakes.push([1300, 552, 22, 7, 'tarn'], [1452, 534, 18, 6, 'tarn'], [1512, 562, 14, 5, 'tarn']);
  mesas();
  C.water = [
    { r: [2.2, 3.2], pts: [[664, 526], [690, 480], [700, 440], [707, 390], [700, 340], [690, 300]] },
    { r: [4.6, 6], pts: [[690, 300], [672, 268], [640, 240], [592, 200], [522, 160], [452, 125], [402, 98], [368, 76], [338, 56]] },
    { r: [1.2, 1.8], pts: [[1078, 572], [1100, 550], [1124, 500], [1118, 430], [1106, 370], [1070, 320]] },
    { r: [1.1, 1.8], pts: [[1512, 558], [1470, 540], [1420, 512], [1356, 460], [1300, 400], [1240, 352], [1140, 318], [1070, 320]] },
    { r: [2.6, 3.4], pts: [[1070, 320], [980, 270], [880, 250], [790, 264], [690, 300]] }
  ];
  C.trails = [
    [[980, 430], [900, 432], [830, 436], [770, 440], [700, 440], [640, 430], [590, 420], [520, 428], [450, 400], [380, 384], [320, 410], [280, 470], [300, 530], [380, 545], [460, 530], [530, 520], [590, 524], [640, 520], [712, 524], [790, 500], [850, 460], [900, 432]],
    [[980, 430], [1000, 470], [1024, 510], [1040, 530], [1030, 540], [1052, 548], [1060, 558], [1094, 562], [1080, 576], [1072, 592], [1068, 610]],
    [[980, 430], [1050, 434], [1118, 430], [1190, 450], [1250, 480], [1300, 508], [1322, 522], [1346, 532], [1362, 546], [1380, 560]]
  ];
} else {
  // The crest runs toward the camera through the middle of the map. West of it is wet and east of it
  // dry. The Trailhead stands at the pass, where the trails cross from one side to the other.
  edgeE = 560;
  Object.assign(C, { T: [1000, 392], PK: [560, 440, 210, 110], LB: [1400, 470, 215, 110], camp: [1082, 560] });
  const passH = (u, v) => 30 * Math.exp(-sq((u - 1000) / 70) - sq((v - 392) / 60));
  base = (u, v) => 0.09 * Math.max(0, v - 420) + (ridges(u, v) + 0.16 * Math.max(0, v - 260) * smooth(220, 430, u)) * wet(u, v, 560) + dryHills(u, v) + passH(u, v);
  volcano(520, 600, 300, 150, 262);
  plateau('land', 540, 436, 112, 34, 30, 0.1);
  C.lakes.push([540, 440, 46, 14, 'lake']);
  // The crest, far to near: high and icy behind the Spires, a saddle at the pass, forested toward us.
  range('crest', 900, 1200, 706, crestH(1050, 130, 40), 61, { front: 44, back: 30 });
  spires(1050, 664, 62, 150);
  plateau('ice', 1052, 612, 90, 34, 62, 0.12, 0.25); tongue(1052, 584, 1064, 574, 22, 16, 56, 50);
  plateau('moraine', 1068, 558, 70, 18, 46, 0.1);
  horn('crest', 942, 586, 46, 116, 118, { pow: 1.1 }); horn('crest', 1154, 598, 44, 96, 108, { pow: 1.1 });
  horn('crest', 1006, 480, 64, 70, 80, { pow: 1.1 });
  for (const [cu, cv, ru, rv, H] of [[1004, 300, 104, 80, 62], [992, 196, 108, 86, 78], [968, 86, 112, 90, 74], [950, -20, 112, 80, 70]]) horn('land', cu, cv, ru, rv, H, { pow: 1.2 });
  // The granite runs east from the crest as a spur of its own, with the basins under it.
  range('gran', 1230, 1640, 650, u => (176 - 0.24 * Math.max(0, u - 1440)) * (1 - 0.3 * Math.exp(-sq((u - 1372) / 80))), 63, { pow: 1.4, jag: 7, front: 50 });
  plateau('gran', 1410, 546, 200, 46, 56, 0.08); plateau('land', 1390, 456, 205, 46, 24, 0.1);
  proficiency(1372, 566, 56, 164, 150);
  C.lakes.push([1290, 546, 22, 7, 'tarn'], [1440, 526, 18, 6, 'tarn'], [1500, 556, 14, 5, 'tarn'], [1380, 456, 13, 4, 'tarn'], [1090, 556, 11, 4, 'milk']);
  mesas();
  C.water = [
    { r: [2.2, 3.4], pts: [[564, 428], [578, 414], [588, 402], [594, 390], [602, 372], [610, 340], [600, 290], [560, 240]] },
    { r: [4.6, 6], pts: [[560, 240], [522, 190], [470, 150], [420, 112], [380, 84], [338, 56]] },
    { r: [1.2, 2], pts: [[1070, 568], [1094, 554], [1112, 536], [1128, 480], [1150, 420], [1170, 350], [1180, 280], [1170, 200], [1150, 100], [1140, -10]] },
    { r: [1.1, 1.8], pts: [[1500, 552], [1460, 530], [1420, 508], [1404, 490], [1382, 458], [1340, 420], [1280, 370], [1220, 310], [1180, 280]] },
    { r: [1.2, 2.2], pts: [[900, 560], [870, 500], [840, 440], [790, 380], [720, 320], [640, 270], [560, 240]] }
  ];
  C.trails = [
    [[1000, 392], [950, 388], [900, 396], [850, 410], [790, 380], [730, 384], [680, 396], [640, 400], [610, 400], [570, 396], [520, 390], [460, 370], [400, 356], [340, 372], [300, 410], [280, 460], [300, 510], [360, 520], [420, 500], [450, 476], [480, 452], [510, 436], [540, 424], [576, 420], [610, 424], [650, 426], [676, 412], [704, 396], [730, 384]],
    [[1000, 392], [1010, 430], [1030, 470], [1050, 510], [1040, 528], [1060, 540], [1046, 548], [1082, 560], [1066, 572], [1058, 590], [1054, 610], [1050, 624]],
    [[1000, 392], [1060, 388], [1128, 400], [1170, 408], [1230, 420], [1280, 440], [1320, 470], [1336, 490], [1354, 498], [1340, 510], [1352, 530], [1370, 554]]
  ];
}
const [TU, TV] = C.T;

// ---- heights --------------------------------------------------------------------------------------
const MATS = ['land', 'volc', 'crest', 'wall', 'ice', 'moraine', 'gran', 'fin'], hg = new Float32Array(NW * VD), mg = new Uint8Array(NW * VD), at = (u, v) => v * NW + u;
for (let v = 0; v < VD; v++) for (let u = 0; u < NW; u++) hg[at(u, v)] = coast(u, v) > 0 ? 0 : Math.max(0, base(u, v));
for (const f of F) { const m = MATS.indexOf(f.mat); for (let v = Math.max(0, Math.floor(f.v0)); v < Math.min(VD, f.v1); v++) for (let u = Math.max(0, Math.floor(f.u0)); u < Math.min(NW, f.u1); u++) { const h = f.fn(u, v), i = at(u, v); if (h > hg[i]) { hg[i] = h; mg[i] = m; } } }
const hAt = (u, v) => hg[at(clamp(Math.round(u), 0, NW - 1), clamp(Math.round(v), 0, VD - 1))];
// Still water is level, so a lake flattens the ground under it to the height of its shore.
const lakeAt = (u, v) => { for (const [cu, cv, ru, rv, kind] of C.lakes) if (Math.hypot((u - cu) / ru, (v - cv) / rv) + 0.16 * (vnoise(u / 9, v / 5, 4) - 0.5) < 1) return kind; return null; };
for (const [cu, cv, ru, rv] of C.lakes) { const lv = hAt(cu, cv - rv); for (let v = Math.floor(cv - rv - 2); v <= cv + rv + 2; v++) for (let u = Math.floor(cu - ru - 2); u <= cu + ru + 2; u++) if (lakeAt(u, v)) hg[at(u, v)] = lv; }
const trail = new Uint8Array(NW * VD), water = new Uint8Array(NW * VD);
function stamp(mask, pts, r0, r1) { pts.forEach(([pu, pv], n) => { const rr = lerp(r0, r1, n / (pts.length - 1)), R2 = Math.ceil(rr + 1); for (let dv = -R2; dv <= R2; dv++) for (let du = -R2; du <= R2; du++) { const d = Math.hypot(du, dv), u = Math.round(pu + du), v = Math.round(pv + dv), k = d <= rr ? 2 : d <= rr + 1 ? 1 : 0; if (k && u >= 0 && v >= 0 && u < NW && v < VD && mask[at(u, v)] < k) mask[at(u, v)] = k; } }); }
const trailPts = []; for (const t of C.trails) { const all = catmull(t); stamp(trail, all, 1.9, 1.9); trailPts.push(...all); }
for (const w of C.water) stamp(water, catmull(w.pts), w.r[0], w.r[1]);
const nearTrail = (u, v, r) => { for (let i = 0; i < trailPts.length; i += 3) { const p = trailPts[i]; if (Math.abs(p[0] - u) < r && Math.abs(p[1] - v) < r) return true; } return false; };

// ---- what the ground is made of -------------------------------------------------------------------
const wob = (u, v, s, a) => a * (fbm(u / 70, v / 60, s, 3) - 0.5);
const forestEdge = v => edgeE - 96 * (fbm(v / 110, 2.3, 3, 3) - 0.5) + 30 * (fbm(v / 24, 7.1, 5, 2) - 0.5) + 44 * smooth(440, 260, v);
const ell = ([cu, cv, ru, rv], u, v) => Math.hypot((u - cu) / ru, (v - cv) / rv);
const parkAmt = (u, v) => smooth(1.25, 0.8, ell(C.PK, u, v) + wob(u, v, 202, 0.4));
const forestAmt = (u, v) => smooth(forestEdge(v) + 40, forestEdge(v) - 24, u + 30 * (fbm(u / 30, v / 30, 8, 2) - 0.5)) * smooth(-6, -30, coast(u, v)) * (1 - 0.9 * smooth(1.1, 0.7, ell(C.PK, u, v)));
const larchAmt = (u, v) => smooth(1.2, 0.85, ell(C.LB, u, v) + wob(u, v, 204, 0.35));
const dryAmt = (u, v) => smooth(1520, 1650, u + wob(u, v, 207, 90)), sageAmt = (u, v) => smooth(1725, 1815, u + wob(u, v, 209, 60)), eastAmt = (u, v) => smooth(VAR === 3 ? 1060 : 1130, 1290, u + wob(u, v, 208, 70));
const burnAmt = (u, v) => smooth(1450, 1580, u + wob(u, v, 210, 100)) * smooth(1890, 1790, u) * smooth(200, 115, v + wob(u, v, 211, 70));
// The fog of the rainforest: nothing in the east, building westward until only white is left. It
// lies in the hollows, so this is the height it fills the forest to.
const fogAmt = (u, v) => smooth(edgeE + 20, 90, u + wob(u, v, 201, 70)) * (lakeAt(u, v) ? 0 : 1);
const fogTop = (u, v) => { const f = fogAmt(u, v); return f <= 0.02 ? -1 : hAt(u, v) - ridges(u, v) + 30 * f - 3 + 5 * f * (fbm(u / 50, v / 30, 220, 2) - 0.5); };
const fogInk = (x, y, deep) => R.fog[deep > 0.2 + 0.25 * vnoise(x / 40, y / 7, 221) ? 2 : 1];
// The colour of one spot of ground. hh is the height of the bit being drawn, which on a cliff runs
// from the cliff's foot to its lip.
function colour(u, v, hh, x, y) {
  const i = at(u, v), mat = MATS[mg[i]], n1 = hash(u, v, 31) - 0.5, uu = clamp(u, 1, NW - 2), vv = clamp(v, 1, VD - 2);
  const du = hg[at(uu + 1, vv)] - hg[at(uu - 1, vv)], dv = hg[at(uu, vv + 1)] - hg[at(uu, vv - 1)], steep = Math.hypot(du, dv) / 2;
  // The sun is in the west: slopes that face west or the camera are lit.
  const L = clamp(0.5 + 0.17 * clamp(du, -2.5, 2.5) + 0.06 * clamp(dv, -2.5, 2.5), 0, 1);
  const cs = coast(u, v);
  if (cs > 0) return cs < 3 + 2 * vnoise(u / 9, v / 9, 85) ? R.sea[5] : pick('sea', 0.75 - smooth(0, 150, cs) * 0.6 + 0.12 * (vnoise(u / 14, v / 3, 86) - 0.5), x, y);
  if (cs > -15 - 6 * vnoise(u / 20, v / 20, 87)) return water[i] ? R.water[3] : R.sand[cs > -4 ? 0 : hash(u, v, 88) < 0.25 ? 1 : 2];
  const lk = lakeAt(u, v);
  if (lk) return lk === 'tarn' ? pick('tarn', 0.3 + 0.4 * vnoise(u / 6, v / 3, 8), x, y) : lk === 'milk' ? pick('glac', 0.5 + 0.2 * vnoise(u / 5, v / 3, 8), x, y, 0.5) : pick('water', 0.3 + 0.3 * vnoise(u / 6, v / 2, 8), x, y);
  if (water[i]) return steep > 0.55 ? (hash(x, y >> 1, 5) < 0.72 ? R.white[1] : R.water[4]) : water[i] === 2 ? R.water[y & 1 ? 3 : 4] : R.water[1];
  if (trail[i] === 2) return mat === 'ice' ? R.glac[1] : mat !== 'land' || steep > 0.8 ? R.rock[hash(u, v, 6) < 0.3 ? 4 : 3] : hash(u, v, 5) < 0.1 ? R.dirt[2] : R.dirt[3];
  if (trail[i] === 1) return mat === 'ice' ? R.glac[3] : mat !== 'land' || steep > 0.8 ? R.rock[1] : R.dirt[1];
  if (mat === 'ice') return frac((v * 0.9 + 0.3 * u) / 7 + 0.4 * vnoise(u / 8, v / 8, 817)) < 0.14 ? R.glac[2] : pick('glac', 0.45 + 0.4 * L + 0.2 * vnoise(u / 6, v / 4, 818), x, y, 0.6);
  if (mat === 'moraine') return steep > 0.7 ? pick('rock', 0.12 + 0.4 * vnoise(x / 3, hh / 10, 97), x, y, 0.7) : hash(u >> 1, v >> 1, 12) < 0.25 ? pick('grass', 0.4, x, y) : pick('rock', 0.2 + 0.7 * hash(u >> 1, v >> 1, 13), x, y);
  if (mat === 'wall' || mat === 'crest') {
    // Dark rock; snow lies where the slope lets it, and on the ledges of the walls.
    const flute = vnoise(x / 2.5, hh / 16, 813), rock = R.rock[clamp(Math.round(L * 2.6) + (flute > 0.64 ? 1 : flute < 0.34 ? -1 : 0), 0, 3)], band = (x + (y >> 3) * 3) >> 2, row = hh / 7 + hash(band, 0, 814) * 7;
    if (mat === 'crest') return hh > 62 + 34 * vnoise(x / 14, 3, 816) && vnoise(x / 5, hh / 11, 815) > 0.34 + 0.25 * smooth(110, 60, hh) ? R.snow[L > 0.55 ? 4 : L > 0.35 ? 3 : 2] : hh < 44 + 20 * vnoise(u / 20, v / 20, 827) ? pick('conifer', 0.2 + 0.5 * L, x, y) : rock;
    if (steep < 0.9) return R.snow[L > 0.5 ? 4 : 3];
    return frac(row) < 0.15 && hash(band, Math.floor(row), 815) < 0.26 ? R.snow[L > 0.4 ? 4 : 3] : rock;
  }
  if (mat === 'volc') {
    const { cu, cv, ru, rv, H } = VOLC, e = hh / H, a = Math.atan2((v - cv) / rv, (u - cu) / ru), b = bayer(x, y);
    if (e > 0.17 + 0.05 * vnoise(u / 20, v / 20, 568)) {
      // Lit on the west and in blue shadow on the east, with a soft line between. Dark ribs of rock
      // fan out below the summit dome and split the ice into glaciers.
      const sh = (x - cu) / ru * 1.5 + 0.22 * (vnoise(x / 17, hh / 17, 561) - 0.5);
      const fr = frac(a * 9 / TAU + 0.1 * vnoise(u / 30, v / 30, 561)), rib = e < 0.72 && e > 0.2 && Math.abs(fr - 0.5) < 0.04 + 0.13 * smooth(0.72, 0.2, e) && vnoise(x / 5, hh / 8, 562) > 0.2;
      if (rib || (e > 0.78 && e < 0.9 && vnoise(x / 6, hh / 4, 563) > 0.62)) return sh < 0.15 ? R.far[1] : R.far[0];
      if (e < 0.62 && frac(hh / 6 + 2 * a + 0.5 * vnoise(u / 9, v / 9, 566)) < 0.1 && vnoise(x / 5, hh / 4, 567) > 0.45) return R.glac[sh < 0.2 ? 3 : 2];
      return sh < 0.02 ? R.farsnow[1] : sh < 0.3 ? (b < (sh - 0.02) / 0.28 ? R.farsnow[0] : R.farsnow[1]) : sh < 0.7 ? (b < (sh - 0.3) / 0.4 ? R.far[3] : R.farsnow[0]) : R.far[3];
    }
  }
  if (mat === 'gran' || mat === 'fin') {
    if (steep > 0.75 || mat === 'fin') { const crack = vnoise(x / 2.2, hh / 26, 902), streak = vnoise(x / 5, hh / 40, 903); return R.gold[clamp(Math.round(2.4 + 3.4 * L + (mat === 'gran' && v > 630 ? 0.9 : 0) + (streak > 0.62 ? -1.5 : 0) + (crack > 0.74 ? -1.8 : crack < 0.2 ? 0.7 : 0) + (b2(x, y) - 0.5) * 0.9), 1, 6)]; }
    const slab = fbm(u / 22, v / 11, 96, 3);
    return slab > 0.4 ? pick('gold', 0.7 + 0.5 * (slab - 0.5) + 0.2 * n1, x, y, 0.7) : hash(u, v, 98) < 0.06 ? R.red[1] : pick('grass', 0.42 + 0.2 * n1, x, y, 0.4);
  }
  // Land. A step in it shows the rock of its own country.
  if (steep > 1.05) return u > 1740 ? ((x >> 1) % 4 === 0 ? R.basalt[0] : R.basalt[1 + (hash(x >> 1, 0, 91) * 2.9 | 0)]) : u > 1190 ? pick('gold', 0.3 + 0.42 * vnoise(x / 3, hh / 10, 97), x, y, 0.7) : pick('rock', 0.12 + 0.42 * vnoise(x / 3, hh / 10, 97) + 0.2 * L, x, y, 0.7);
  const sh = (L - 0.5) * 0.5, blot = s => 0.5 + 0.85 * (fbm(u / 32, v / 21, s, 3) - 0.5) + 0.2 * n1;
  const fa = forestAmt(u, v);
  if (fa > 0.5 + 0.2 * n1) return pick('moss', 0.2 + 0.3 * fbm(u / 18, v / 18, 22, 3) + sh, x, y);
  if (larchAmt(u, v) > blot(181)) { const slab = fbm(u / 22, v / 11, 96, 3); return slab > 0.58 ? pick('gold', 0.7 + 0.2 * n1, x, y, 0.7) : hash(u, v, 98) < 0.06 ? R.red[1] : hash(u, v, 99) < 0.05 ? R.larch[3] : pick('grass', 0.42 + sh + 0.2 * n1, x, y, 0.4); }
  const bu = burnAmt(u, v), da = dryAmt(u, v);
  if (bu > blot(182)) { for (let k = 0; k < 9; k++) { const tall = 6 + Math.floor(hash(u, v - k, 132) * 3.99); if (k < tall && hash(u, v - k, 101) < 0.008 + 0.09 * smooth(0.5, 0.66, fbm(u / 30, (v - k) / 15, 131, 3))) return k < 2 ? R.grass[1] : k === tall - 1 ? R.fireweed[1] : R.fireweed[0]; } return fbm(u / 24, v / 16, 100, 3) > 0.56 ? pick('grass', 0.3, x, y, 0.5) : pick('ash', 0.4 + 0.5 * fbm(u / 14, v / 9, 102, 3), x, y); }
  if (da > blot(183)) { const sg = sageAmt(u, v); return hash(u >> 1, v >> 1, 103) < 0.04 + sg * 0.3 ? R.sage[1 + (hash(u, v, 104) < 0.5 ? 0 : 1)] : pick('dry', 0.5 + 0.5 * (fbm(u / 24, v / 14, 105, 3) - 0.5) + sh + sg * 0.1, x, y); }
  const pa = parkAmt(u, v), drift = fbm(u / 16, v / 9, 110, 3);
  if (pa > 0.3 && drift > 0.62 - pa * 0.12 && hash(u, v, 111) < 0.3) { const k = hash(u >> 3, v >> 2, 112); return k < 0.45 ? R.lupine[1] : k < 0.75 ? R.red[1] : k < 0.9 ? R.white[1] : R.pink[1]; }
  // High ground with no forest on it goes from meadow to bare rock and then snow.
  if (hh > 96 + 30 * vnoise(u / 30, v / 30, 828)) return hh > 150 ? R.snow[L > 0.5 ? 4 : 3] : pick('rock', 0.3 + 0.5 * L, x, y);
  return pick('grass', 0.56 + 0.55 * (fbm(u / 26, v / 26, 31, 3) - 0.5) + sh - fa * 0.45 + da * 0.2, x, y, 0.3);
}
function b2(x, y) { return bayer(x, y); }

// ---- the picture ----------------------------------------------------------------------------------
const g = new Uint8Array(NW * SH), mb = new Uint8Array(NW * SH).fill(255), zb = new Float32Array(NW * SH).fill(1e9), px = (x, y) => y * NW + x;
const skyAt = (x, y) => { const sb = R.skyband, f = clamp(y / 340, 0, 1) * (sb.length - 1), b0 = Math.floor(f), e = f - b0; return sb[Math.min(sb.length - 1, b0 + (e > 0.72 && bayer(x, y) < (e - 0.72) / 0.28 ? 1 : 0))]; };
for (let y = 0; y < SH; y++) for (let x = 0; x < NW; x++) g[px(x, y)] = skyAt(x, y);
// The far ranges, which really are a backdrop: pale, beyond the last of the ground.
function farRow(u0, u1, baseY, env, seed, snowy) {
  const r = rng(seed), peaks = []; for (let cx = u0; cx < u1;) { const h = env(cx) * (0.75 + 0.5 * r()), w = h * (1.2 + 0.7 * r()); peaks.push([cx, h, w]); cx += w * (0.5 + 0.4 * r()); }
  for (let x = Math.max(0, u0 - 80); x < Math.min(NW, u1 + 80); x++) {
    let best = 0, bc = 0, bh = 1; for (const [cx, h, w] of peaks) { const t = h * Math.pow(Math.max(0, 1 - Math.abs(x - cx) / w), 0.85) + 1.5 * (vnoise(x / 4, cx, 700) - 0.5); if (t > best) { best = t; bc = cx; bh = h; } }
    for (let y = Math.round(baseY - best); y <= baseY + 30 && y < SH; y++) { const d = y - (baseY - best), west = x < bc + (y - baseY + bh) * 0.12; g[px(x, y)] = d === 0 ? R.far[2] : snowy && d < bh * 0.55 ? (west ? R.farsnow[1] : R.farsnow[0]) : west ? R.far[3] : R.far[2]; }
  }
}
const HZ = SH - VD - 26;
farRow(10, 520, HZ + 20, x => 96 + 70 * Math.exp(-sq((x - 240) / 70)), 41, true);
farRow(520, 1700, HZ + 20, x => 46 + 20 * vnoise(x / 90, 2, 43), 43, true);
farRow(1640, NW + 40, HZ + 24, x => 26, 44, false);
// The ground and the mountains, one column at a time from the near edge to the far one. A spot is
// drawn only where nothing nearer already stands in front of it.
for (let u = 0; u < NW; u++) {
  let minY = SH;
  for (let v = 0; v < VD; v++) {
    const h = hg[at(u, v)], sy = Math.round(SH - v - h); if (sy >= minY) continue;
    const ft = fogTop(u, v), fa = ft > -1 ? forestAmt(u, v) : 0;
    for (let y = Math.max(0, sy); y < minY; y++) {
      const hh = SH - v - y;
      // Fog lies on the forest floor up to its level: thick in the hollows, thin over the ridges.
      mb[px(u, y)] = mg[at(u, v)]; g[px(u, y)] = fa > 0.4 && hh < ft && bayer(u, y) < 0.2 + (ft - hh) / 4 ? fogInk(u, y, fogAmt(u, v)) : colour(u, v, hh, u, y);
      zb[px(u, y)] = v;
    }
    minY = sy;
  }
}

// A dark line where a wall or the granite fin stands against something farther off, so the Spires
// and Proficiency Peak read as shapes of their own.
for (let y = 1; y < SH - 1; y++) for (let x = 1; x < NW - 1; x++) {
  const i = px(x, y), m = MATS[mb[i]]; if (m !== 'fin' && m !== 'wall') continue;
  if (zb[i - NW] > zb[i] + 14 || zb[i - 1] > zb[i] + 14 || zb[i + 1] > zb[i] + 14) g[i] = INK;
}
// ---- things that stand up -------------------------------------------------------------------------
const things = [], put = (bm, u, v, f) => things.push({ bm, u: Math.round(u), v: Math.round(v), fog: f }), plant = (tree, u, v, f) => things.push({ tree, u: Math.round(u), v: Math.round(v), fog: f });
const slope = (u, v) => Math.hypot(hAt(u + 2, v) - hAt(u - 2, v), hAt(u, v + 2) - hAt(u, v - 2)) / 4;
const open = (u, v, max = 0.8) => u > 2 && u < NW - 2 && v > 1 && v < VD - 2 && coast(u, v) < -32 && !lakeAt(u, v) && !water[at(Math.round(u), Math.round(v))] && !water[at(Math.round(u) + 4, Math.round(v))] && !water[at(Math.round(u) - 4, Math.round(v))] && slope(u, v) < max && !nearTrail(u, v, 9) && Math.hypot(u - TU, (v - TV) * 1.4) > 46;
{
  const rand = rng(2026), any = a => a[(rand() * a.length) | 0], land = (u, v) => MATS[mg[at(Math.round(u), Math.round(v))]] === 'land';
  const wooded = (u, v) => { const i = at(Math.round(u), Math.round(v)), m = MATS[mg[i]], h = hg[i]; return m === 'land' ? h < 100 : m === 'volc' ? h < VOLC.H * 0.16 : m === 'crest' ? h < 48 : false; };
  const maples = Array.from({ length: 6 }, (_, i) => makeMaple(100 + i)), spruces = Array.from({ length: 6 }, (_, i) => makeSpruce(200 + i)), firs = Array.from({ length: 8 }, (_, i) => makeFir(300 + i));
  const larches = Array.from({ length: 6 }, (_, i) => { const r = rng(900 + i); return makeConifer(900 + i, 24 + (r() * 14 | 0), 10 + (r() * 4 | 0), 'larch', 6); });
  const pines = Array.from({ length: 5 }, (_, i) => makePonderosa(820 + i)), aspens = Array.from({ length: 7 }, (_, i) => makeAspen(600 + i)), snags = Array.from({ length: 5 }, (_, i) => makeSnag(730 + i));
  // The rainforest climbs the ridges and the volcano's foot. Where the fog is thickest only snags stand.
  for (let gv = -30; gv < VD; gv += 9) for (let gu = -10; gu < edgeE + 180; gu += 9) {
    const u = clamp(gu + rand() * 9, 3, NW - 4), v = clamp(gv + rand() * 9, 2, VD - 3), fa = forestAmt(u, v), r = rand(), f = fogAmt(u, v);
    if (rand() > fa * 0.78 || !open(u, v, 1.3) || !wooded(u, v)) continue;
    // As the fog builds, trees keep to the crests of the ridges, so each ridge is one rank of crowns.
    if (f > 0.15 && ridges(u, v) / RA < 0.36 + 0.5 * f) continue;
    if (rand() < f * f * 0.5) put(any(snags), u, v, f); else plant(r < 0.45 ? any(maples) : r < 0.88 ? any(spruces) : any(firs), u, v, f);
  }
  // Firs in clumps over the parkland, the meadows and the lower slopes of the crest.
  for (let n = 0; n < 5200; n++) {
    const u = edgeE - 60 + rand() * 1000, v = rand() * VD, pa = parkAmt(u, v), h = hAt(u, v);
    if (fbm(u / 46, v / 40, 71, 3) < (pa > 0.4 || h > 20 ? 0.55 : 0.61) || forestAmt(u, v) > 0.2 || !open(u, v, 1.1) || h > 105) continue;
    if (!wooded(u, v)) continue;
    if (rand() < Math.max(larchAmt(u, v), dryAmt(u, v) * 1.2, burnAmt(u, v), eastAmt(u, v) * 0.8)) continue;
    plant(any(firs), u, v);
  }
  for (let n = 0; n < 3200; n++) {
    const u = C.LB[0] - 280 + rand() * 560, v = C.LB[1] - 150 + rand() * 300, m = MATS[mg[at(clamp(Math.round(u), 0, NW - 1), clamp(Math.round(v), 0, VD - 1))]], hi = m === 'gran';
    if (m === 'fin' || rand() > larchAmt(u, v) * (hi ? 0.14 : 0.8) || fbm(u / 40, v / 30, 120, 3) < (hi ? 0.5 : 0.52) || !open(u, v, 0.7)) continue;
    plant(any(larches), u, v);
  }
  const band = (u, v) => eastAmt(u, v) * (1 - larchAmt(u, v)) * (1 - burnAmt(u, v)) * (1 - 0.85 * sageAmt(u, v));
  for (let n = 0; n < 130; n++) {
    const cu = 1160 + rand() * 620, cv = rand() * 440, size = 8 + (rand() * 6 | 0), here = rand() < 0.5 * band(cu, cv) * (1 - 0.6 * dryAmt(cu, cv));
    for (let k = 0; k < size; k++) { const a = rand() * 6.283, d = Math.sqrt(rand()) * 9, u = cu + Math.cos(a) * d * 1.5, v = cv + Math.sin(a) * d * 0.8; if (here && open(u, v) && land(u, v)) plant(any(aspens), u, v); }
  }
  const stood = [];
  for (let n = 0; n < 1100; n++) {
    const u = 1300 + rand() * 520, v = rand() * 620;
    if (rand() > band(u, v) * (0.05 + 0.3 * dryAmt(u, v)) || !open(u, v) || !land(u, v) || stood.some(([a, b]) => Math.abs(a - u) < 24 && Math.abs(b - v) < 20)) continue;
    stood.push([u, v]); plant(any(pines), u, v);
  }
  for (let n = 0; n < 420; n++) { const u = 1420 + rand() * 480, v = rand() * 220; if (rand() < burnAmt(u, v) && open(u, v)) put(any(snags), u, v); }
}
put(makeSignpost(), TU - 4, TV + 8); put(makeKiosk(), TU + 28, TV + 20); put(makeTent('tent'), C.camp[0], C.camp[1]); put(makeTent('red'), C.camp[0] + 20, C.camp[1] - 7);
// Farthest first. A thing is hidden wherever nearer ground stands in front of it. In the fog its
// foot is lost and the rest of it pales, the more so the deeper into the fog it stands.
things.sort((a, b) => b.v - a.v);
for (const th of things) {
  const h = hAt(th.u, th.v), fy = Math.round(SH - th.v - h), ft = th.fog ? fogTop(th.u, th.v) : -1;
  const blit = (bm, sx, sy) => { for (let j = 0; j < bm.h; j++) for (let i = 0; i < bm.w; i++) { const c = bm.d[j * bm.w + i], x = sx + i, y = sy + j; if (!c || x < 0 || y < 0 || x >= NW || y >= SH || zb[px(x, y)] < th.v - 3) continue; const up = h + fy - y; g[px(x, y)] = th.fog > 0.02 && bayer(x, y) < (ft - up) / 5 + 0.15 ? fogInk(x, y, th.fog) : th.fog > 0.3 ? R.mist[clamp(Math.floor((th.fog - 0.3) / 0.2 + 1.4 * smooth(150, 600, th.v) + 0.3 * (bayer(x, y) - 0.5) + (c === INK ? 0 : 0.4)), 0, 4)] : c; } };
  if (th.tree) for (const p of th.tree.parts) blit(p.bm, th.u + p.x, fy + p.y); else blit(th.bm, th.u - (th.bm.ox || 0), fy - (th.bm.oy || 0));
}

// ---- onto the page --------------------------------------------------------------------------------
const c = document.getElementById('c'), sc = +(q.get('scale') || 1);
c.width = NW; c.height = SH; c.style.width = NW * sc + 'px'; c.style.height = SH * sc + 'px';
if (q.get('crop')) { const [x, y] = q.get('crop').split(',').map(Number); c.style.marginLeft = -x * sc + 'px'; c.style.marginTop = -y * sc + 'px'; }
const ctx = c.getContext('2d'), img = ctx.createImageData(NW, SH);
for (let i = 0; i < g.length; i++) { const p = DAY[g[i]] || [255, 0, 255]; img.data[i * 4] = p[0]; img.data[i * 4 + 1] = p[1]; img.data[i * 4 + 2] = p[2]; img.data[i * 4 + 3] = 255; }
ctx.putImageData(img, 0, 0);
if (q.get('labels')) {
  ctx.font = '10px monospace'; ctx.textBaseline = 'middle';
  const tag = (t, u, v, lift = 0) => { const y = Math.round(SH - v - hAt(u, v) - lift), w = ctx.measureText(t).width + 8; ctx.fillStyle = '#1a1424'; ctx.fillRect(Math.round(u - w / 2), y - 7, w, 14); ctx.fillStyle = '#fff3d0'; ctx.fillText(t, Math.round(u - w / 2) + 4, y + 1); };
  tag('Trailhead', TU, TV - 16); tag('Reflection Lake', C.lakes[0][0], C.lakes[0][1], 16); tag('base camp', C.camp[0] + 50, C.camp[1], 4);
  tag('Mount Monolith', VOLC.cu, VOLC.cv, 14); tag('Sideproject Spires', SP.cu, SP.cv, 14); tag('Proficiency Peak', PF.cu, PF.cv + 4, 14); tag('Legacy Range', 240, VD - 1, 150);
}
window.__dbg = (x, y) => { const v = zb[px(x, y)]; return JSON.stringify([MATS[mb[px(x, y)]], v, hAt(x, v), hAt(x + 1, v) - hAt(x - 1, v), hAt(x, v + 1) - hAt(x, v - 1)]); };
window.__info = { NW, NH: SH }; window.__ready = true;
