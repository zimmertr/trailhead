// A workbench page: a block-in of the larger world map, for agreeing the layout before it is drawn
// properly. Nothing here is used by the site. plan.html?crop=x,y,w,h&scale=3 magnifies one part.
import { TAU, clamp, lerp, smooth, frac, sq, rng, hash, vnoise, fbm, bayer, R, DAY, ramp, pick, BM, outline, thick, catmull, INK } from './core.js';
import { clump, makeMaple, makeSpruce, makeFir, makeConifer, makeBoulder, makeLog, makeSignpost, makeSmallSign, makeKiosk, makeTent, makeSnag, makeBush, makeElk } from './sprites.js';
import { bear, goat, marmot } from './fauna.js';
import { makeStack, makeMassif, makePeak } from './world.js';

ramp('larch', ['#6a4610', '#a8701a', '#d89a24', '#f2c43c', '#fbe478']);
ramp('sage', ['#46564c', '#667866', '#8a9a80', '#aeb89a']);
ramp('dry', ['#8a7440', '#b09a54', '#cdb96c', '#e2d48c']);
ramp('basalt', ['#231f2a', '#37323c', '#4e4850', '#6a6266']);
ramp('sand', ['#a89a7c', '#c8bc9a', '#e2d8b8']);
ramp('sea', ['#143c50', '#1e586c', '#2c7888', '#4c9aa4', '#8cc4c4', '#d8f0ec']);
ramp('ash', ['#463c36', '#62564a', '#80725c', '#9c8e72']);
ramp('fog', ['#a8bcb8', '#c8d6d0', '#e6eeea']);
ramp('pine', ['#1c3a20', '#2c5a2c', '#48783a', '#6c9648', '#94b25c']);
ramp('pbark', ['#5a2c14', '#8c4a20', '#c0702c']);

// The plan's own coordinates: today's map sits inside it, moved right and down by OX, OY.
const OX = 260, OY = 160, NW = 1560, NH = 1080;
const T = { x: 820, y: 630 }, PEAK = { x: 645, y: 514 }, STACK = { x: 805, y: 544 }, SPIRES = { x: 975, y: 522 };
const GL = { x0: 976, y0: 510, x1: 958, y1: 584 };
const g = new Uint8Array(NW * NH);
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
const basinAmt = (x, y) => smooth(1060, 1140, x + 30 * (vnoise(y / 40, 1, 7) - 0.5)) * smooth(650, 596, y + 34 * (fbm(x / 60, 2, 8, 3) - 0.5));
const dryAmt = (x, y) => smooth(1190, 1330, x + 60 * (fbm(y / 70, 3, 9, 3) - 0.5)) * smooth(600, 660, y + 34 * (fbm(x / 60, 2, 8, 3) - 0.5));
const sageAmt = (x, y) => smooth(1350, 1470, x + 50 * (fbm(y / 60, 4, 10, 3) - 0.5));
const burnAmt = (x, y) => smooth(1090, 1230, x + 70 * (fbm(y / 80, 5, 11, 3) - 0.5)) * smooth(830, 900, y + 50 * (fbm(x / 80, 6, 12, 3) - 0.5));
const MESAS = [[1496, 700, 52, 17], [1462, 772, 40, 14], [1526, 836, 44, 15], [1420, 708, 16, 7]];
const mesa = (x, y) => MESAS.some(([cx, cy, rx, ry]) => Math.hypot((x - cx) / rx, (y - cy) / ry) < 1 + 0.25 * (vnoise(x / 9, y / 7, 141) - 0.5));
const couleeAmt = (x, y) => mesa(x, y) || mesa(x, y - 15) || mesa(x, y - 22) ? 1 : 0;
const talus = (x, y) => (y > 528 && y < 580) ? smooth(118, 64, Math.abs(x - STACK.x) + (y - 536) * 2.4) : 0;
const moraine = (x, y) => (y > 510 && y < 540 && Math.abs(x - SPIRES.x) < 100) ? smooth(538, 520, y + 5 * vnoise(x / 6, 1, 15)) * smooth(100, 84, Math.abs(x - SPIRES.x)) * 0.8 : 0;
function glacier(x, y) {
  const dx = GL.x1 - GL.x0, dy = GL.y1 - GL.y0, t = clamp(((x - GL.x0) * dx + (y - GL.y0) * dy) / (dx * dx + dy * dy), 0, 1), px = GL.x0 + dx * t, py = GL.y0 + dy * t;
  return { t, d: Math.hypot(x - px, y - py), w: lerp(64, 11, Math.pow(t, 0.8)) + 5 * (vnoise(x / 8, y / 8, 9) - 0.5), side: x - px };
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

// ---- the north: ridge on ridge to the horizon ---------------------------------------------------
const BASE = [460, 424, 388, 352, 318, 288], AMP = [50, 52, 46, 38, 28, 18], SC = [150, 128, 108, 90, 74, 60];
const rdg = n => 1 - Math.abs(2 * n - 1);
const zIce = x => smooth(770, 840, x) * smooth(1070, 1000, x);
const zNE = (x, k) => smooth(1050 + k * 16, 1150 + k * 16, x) * smooth(1470 - k * 22, 1390 - k * 22, x);
const zDry = (x, k) => smooth(1310 - k * 14, 1530 - k * 14, x);
const ridge = [], lean = [];
BASE.forEach((base, k) => {
  const a = new Float32Array(NW + 8), s = SC[k];
  for (let x = 0; x < NW + 8; x++) {
    let h = 0.62 * rdg(vnoise(x / s, k * 7.7, 500 + k)) + 0.26 * rdg(vnoise(x / (s / 3.1), k * 3.3, 510 + k)) + 0.12 * rdg(vnoise(x / (s / 9), k, 520 + k));
    h = Math.pow(h, 1.25);
    let amp = AMP[k]; if (k <= 1) amp *= 1 - 0.7 * zIce(x);
    // The dry side has no crags, only long rolling hills.
    const roll = 0.5 + 0.5 * Math.sin(x / (40 + k * 6) + k * 2) * vnoise(x / 90, k, 530);
    let y = base - amp * lerp(h, roll * 0.45, zDry(x, k));
    if (k <= 2) y -= zNE(x, k) * (15 - k * 3) * Math.pow(rdg(vnoise(x / 7, k * 3.1, 540)), 2);
    // The col between The Stack and the Spires.
    if (k === 0) y += 22 * Math.exp(-sq((x - 884) / 16));
    a[x] = y;
  }
  ridge.push(a);
  // Which way each slope faces, read off a smoothed skyline: faces that look left take the light.
  const l = new Uint8Array(NW);
  const sm = 4 + k * 2; for (let x = 0; x < NW; x++) l[x] = a[Math.min(NW + 7, x + sm)] - a[Math.max(0, x - sm)] < 0 ? 1 : 0;
  lean.push(l);
});
// The icefield: one broad cap of ice behind the Stack and the Spires, with rock points standing out of it.
const iceTop = x => 304 + 150 * Math.pow(Math.abs(x - 915) / 300, 4) + 14 * (fbm(x / 60, 2, 550, 3) - 0.5);
const NUN = [[742, 372, 9], [806, 348, 6], [866, 384, 11], [930, 336, 5], [972, 366, 8], [1034, 346, 6], [1090, 380, 10], [690, 392, 7], [1140, 396, 8]];
function iceAt(x, y, top) {
  for (const [nx, by, h] of NUN) { const dx = x - nx; if (y <= by && y > by - h && dx > -(y - (by - h)) * 1.5 - 0.5 - 2 * vnoise(y / 2, nx, 554) && dx < (y - (by - h)) * 0.8 + 0.5) return dx < -1 ? (hash(x, y, 555) < 0.3 ? R.snow[3] : R.rock[2]) : R.rock[0]; }
  for (const [nx, by, h] of NUN) if (y > by && y < by + 4 && x > nx - 2 && x < nx + h + (y - by) * 2) return R.glac[3];
  const d = y - top;
  if (d < 2) return R.glac[5];
  if (vnoise(x / 50, y / 26, 552) > 0.6 && y % 4 === 0 && vnoise(x / 7, y / 4, 553) > 0.45) return R.glac[d > 60 ? 1 : 2];
  const flow = fbm(x / 70, y / 16, 551, 3);
  return pick('glac', 0.94 - smooth(0.5, 0.36, flow) * 0.34 - smooth(70, 130, d) * 0.12, x, y, 0.6);
}
const VOLC = { x: 800, top: 186 };
const volc = x => { const dx = Math.abs(x - VOLC.x); return VOLC.top + Math.max(0, dx - 5) * 0.56 + Math.pow(Math.max(0, dx - 5), 1.35) * 0.012 + 3 * (vnoise(x / 9, 2, 560) - 0.5) + (dx < 7 ? 2 * Math.sin(x / 2.2) : 0); };
// Lit snow, shaded snow, lit rock, shaded rock for each rank: every rank back is paler and bluer.
const PAL = [[R.snow[4], R.snow[2], R.rock[2], R.rock[0]], [R.snow[4], R.snow[2], R.rock[1], R.far[0]], [R.snow[3], R.snow[1], R.far[0], R.far[0]], [R.snow[3], R.snow[2], R.far[1], R.far[0]], [R.farsnow[1], R.farsnow[0], R.far[3], R.far[2]], [R.farsnow[0], R.far[3], R.far[3], R.far[3]]];
const ROCKT = [0.47, 0.5, 0.54, 0.58, 0.66, 0.85];
const rankOf = (x, y, k0, k1) => { for (let j = k0; j <= k1; j++) if (y >= ridge[j][x]) return j; return -1; };
function north(x, y) {
  let k = rankOf(x, y, 0, 1);
  if (k < 0) { const it = iceTop(x); if (y >= it && it < ridge[1][x]) return iceAt(x, y, it); k = rankOf(x, y, 2, 5); }
  if (k < 0) {
    const vy = volc(x);
    if (y >= vy && vy < 290) { const lit = x < VOLC.x + 3 * Math.sin(y / 6), rib = vnoise((x - VOLC.x) / (y - VOLC.top + 8) * 7, y / 30, 561); return rib > 0.72 && y > vy + 6 ? R.far[2] : lit ? R.farsnow[1] : (bayer(x, y) < 0.5 ? R.farsnow[0] : R.far[3]); }
    const sb = R.skyband, f = clamp(y / 262, 0, 1) * (sb.length - 1), b0 = Math.floor(f), e = f - b0;
    return sb[Math.min(sb.length - 1, b0 + (e > 0.72 && bayer(x, y) < (e - 0.72) / 0.28 ? 1 : 0))];
  }
  const r = ridge[k], d = y - r[x], lit = lean[k][x], room = (k ? ridge[k - 1][x] : groundLine(x)) - r[x];
  const th = 0.5 + 0.6 * (vnoise(x / 14, y / 10, 70 + k) - 0.5), thd = 0.5 + 0.9 * (fbm(x / 46, y / 16, 170 + k, 2) - 0.5);
  const rib = vnoise((x + (lit ? 1 : -1) * d * 0.9) / 4, d / 22, 600 + k) + 0.3 * (fbm(x / 44, y / 30, 610 + k, 2) - 0.5);
  if (zDry(x, k) > thd) {
    if (k >= 3) return d < 2 ? R.dry[3] : bayer(x, y) < 0.35 + 0.4 * d / Math.max(8, room) ? R.far[3] : R.dry[k === 3 ? 2 : 3];
    if (k === 0 && hash(x >> 1, y >> 1, 71) < 0.08) return R.sage[1];
    return pick(k === 0 ? 'dry' : 'ochre', 0.95 - 0.7 * d / Math.max(10, room) + 0.2 * (vnoise(x / 9, y / 5, 72) - 0.5), x, y);
  }
  if (k <= 1 && zIce(x) > th) { const sv = frac(d / 7 + 0.5 * vnoise(x / 9, y / 9, 74)); return sv < 0.16 && d > 3 ? R.glac[sv < 0.07 ? 1 : 2] : pick('glac', 0.9 - 0.3 * vnoise(x / 8, y / 5, 76) - (d < 2 ? -0.1 : 0), x, y, 0.6); }
  if (k <= 2 && zNE(x, k) > th) {
    // Pale granite needles, larch running up their lower slopes.
    if (d > room * (0.35 + 0.6 * fbm(x / 22, k * 5, 78, 3)) && hash(x >> 1, y >> 1, 79) < 0.5 + 0.4 * vnoise(x / 9, y / 6, 80)) return k === 2 ? R.mustard[hash(x, y, 81) < 0.5 ? 1 : 2] : pick('larch', 0.35 + 0.6 * hash(x >> 1, y, 81), x, y);
    if (rib < 0.3 && d < 16) return lit ? R.snow[4] : R.snow[2];
    return pick('granite', (lit ? 0.82 : 0.46) + 0.24 * (rib - 0.5) + (k === 2 ? 0.1 : 0), x, y, 0.7);
  }
  // Snowy ridges with dark rock ribs, forest in the valley floors.
  if (k <= 1 && d > room * (0.7 + 0.2 * vnoise(x / 15, k, 82))) return pick(k ? 'hill' : 'conifer', 0.2 + 0.5 * hash(x, y, 83), x, y);
  const p = PAL[k];
  if (d >= 2 && rib > ROCKT[k] + (lit ? 0.07 : 0)) return k === 2 && !lit && bayer(x, y) < 0.5 ? R.rock[1] : p[lit ? 2 : 3];
  return p[lit ? 0 : 1];
}

// ---- the ground -------------------------------------------------------------------------------
function ground(x, y) {
  if (y < groundLine(x)) return north(x, y);
  const i = at(x, y), n1 = hash(x, y, 31) - 0.5;
  const cs = coast(x, y);
  if (cs > 0) {
    if (cs < 2.5 + 2 * Math.sin(x / 7 + y / 9)) return R.white[1];
    if (cs > 14 && cs < 17 && vnoise(x / 10, y / 3, 85) > 0.55) return R.sea[5];
    return pick('sea', 0.75 - smooth(0, 150, cs) * 0.6 + 0.12 * (vnoise(x / 14, y / 3, 86) - 0.5), x, y);
  }
  if (cs > -15 - 6 * vnoise(x / 20, y / 20, 87)) return R.sand[cs > -4 ? 0 : hash(x, y, 88) < 0.25 ? 1 : 2];
  if (isleD(x, y) < 1) return pick('grass', 0.55 + 0.3 * n1, x, y);
  const ld = lakeD(x, y);
  if (ld < 1) { if (ld > 0.9) return R.water[4]; if (hash(x, y, 7) < 0.04 && ld < 0.8) return R.water[5]; return pick('water', 0.18 + 0.42 * smooth(0.1, 0.9, ld) + 0.08 * (vnoise(x / 6, y / 2, 8) - 0.5), x, y); }
  if (ld < 1.1) return x > 600 && y < 536 ? R.rock[hash(x >> 1, y >> 1, 3) < 0.5 ? 2 : 3] : R.dirt[hash(x, y, 3) < 0.3 ? 3 : 4];
  const td = tarnD(x, y);
  if (td < 1) return td > 0.86 ? R.tarn[5] : pick('tarn', 0.25 + 0.5 * smooth(0, 0.9, td), x, y);
  if (river[i] && trail[i] === 2) return (x + y) % 4 === 0 ? R.wood[1] : R.wood[3];
  if (river[i] === 2) return hash(x, y, 9) < 0.08 ? R.water[5] : R.water[y & 1 ? 3 : 4];
  if (river[i] === 1) return trail[i] ? R.wood[1] : R.water[1];
  const gl = glacier(x, y);
  if (y > 500 && gl.d < gl.w) {
    const cre = frac(gl.t * 7 - sq(gl.side / gl.w) * 0.35 + 0.35 * vnoise(x / 6, y / 6, 2));
    if (cre < 0.07 && gl.d < gl.w - 3 && vnoise(x / 5, y / 3, 3) > 0.35) return cre < 0.04 ? R.glac[0] : R.glac[2];
    return gl.t > 0.8 && hash(x >> 1, y >> 1, 9) < (gl.t - 0.8) * 2 ? R.rock[1] : pick('glac', 0.8 - 0.3 * gl.side / gl.w + 0.18 * (vnoise(x / 4, y / 4, 8) - 0.5) - gl.t * 0.15, x, y, 0.6);
  }
  if (y > 500 && gl.d < gl.w + 5) return pick('rock', 0.2 + 0.55 * hash(x >> 1, y >> 1, 11), x, y);
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
  const ba = basinAmt(x, y);
  if (ba > 0.5 + 0.2 * n1) {
    // The larch basin: pale granite slabs with seams of grass and heather between them.
    const slab = fbm(x / 22, y / 11, 96, 3);
    if (slab > 0.5) return vnoise(x / 3, y / 9, 97) > 0.78 ? R.granite[2] : pick('granite', 0.62 + 0.5 * (slab - 0.5) + 0.2 * n1, x, y, 0.7);
    return hash(x, y, 98) < 0.06 ? R.pink[1] : pick('grass', 0.4 + 0.5 * (fbm(x / 20, y / 20, 99, 3) - 0.5) + 0.2 * n1, x, y, 0.4);
  }
  const bu = burnAmt(x, y);
  if (bu > 0.5 + 0.2 * n1) {
    // The old burn: ash-grey ground, green coming back in patches, fireweed everywhere.
    const green = fbm(x / 24, y / 16, 100, 3);
    if (hash(x, y, 101) < 0.05 && hash(x, y - 1, 101) >= 0.05) return R.pink[1];
    if (hash(x, y + 1, 101) < 0.05) return R.pink[2];
    return green > 0.56 ? pick('grass', 0.3 + 0.5 * (green - 0.5) + 0.2 * n1, x, y, 0.5) : pick('ash', 0.4 + 0.5 * fbm(x / 14, y / 9, 102, 3) + 0.2 * n1, x, y);
  }
  const da = dryAmt(x, y);
  if (da > 0.5 + 0.25 * n1) {
    const sg = sageAmt(x, y);
    if (hash(x >> 1, y >> 1, 103) < 0.04 + sg * 0.3) return R.sage[1 + (hash(x, y, 104) < 0.5 ? 0 : 1)];
    return pick('dry', 0.5 + 0.5 * (fbm(x / 24, y / 14, 105, 3) - 0.5) + 0.15 * n1 + sg * 0.1, x, y);
  }
  return pick('grass', 0.56 + 0.55 * (fbm(x / 26, y / 26, 31, 3) - 0.5) + 0.14 * (hash(x >> 1, y >> 1, 32) - 0.5) - fa * 0.45 - smooth(462, 505, y) * 0.1 - da * 0.5, x, y, 0.3);
}
for (let y = 0; y < NH; y++) for (let x = 0; x < NW; x++) g[at(x, y)] = ground(x, y);

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

put(makePeak(), PEAK.x, PEAK.y); put(makeStack(), STACK.x, STACK.y); put(makeMassif(), SPIRES.x, SPIRES.y);
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
// Firs in clumps across the meadows.
for (let n = 0; n < 1500; n++) {
  const x = 700 + rand() * 600, y = 478 + rand() * 590;
  if (fbm(x / 60, y / 60, 71, 3) < 0.57 || !open(x, y) || forestAmt(x, y) > 0.2 || Math.hypot(x - T.x, (y - T.y) * 1.4) < 70 || talus(x, y) > 0.05 || basinAmt(x, y) > 0.3 || dryAmt(x, y) > 0.3 || burnAmt(x, y) > 0.3) continue;
  const gl = glacier(x, y); if (gl.d < gl.w + 8 || (Math.abs(x - SPIRES.x) < 96 && y < SPIRES.y + 4) || !clearOf(x, y, 12, 30)) continue;
  plant(firs[(rand() * 8) | 0], x, y);
}
// Larches: thick in the basin, a few down by the Spires camp.
for (let n = 0; n < 900; n++) {
  const x = 880 + rand() * 640, y = 470 + rand() * 200, ba = basinAmt(x, y), nearCamp = Math.hypot(x - 930, (y - 585) * 1.5) < 70;
  if (!open(x, y) || !(ba > 0.4 && fbm(x / 40, y / 30, 120, 3) > 0.54 && rand() < 0.5 || nearCamp && rand() < 0.07)) continue;
  const gl = glacier(x, y); if (gl.d < gl.w + 8 || !clearOf(x, y, 14, 34) || (Math.abs(x - SPIRES.x) < 96 && y < SPIRES.y + 4)) continue;
  plant(larches[(rand() * 6) | 0], x, y);
}
for (let n = 0; n < 60; n++) { const x = 1080 + rand() * 440, y = 480 + rand() * 150; if (basinAmt(x, y) > 0.5 && open(x, y)) put(slabs[(rand() * 4) | 0], x, y); }
// The dry side: open ponderosa, then sagebrush, then nothing but rock and grass.
for (let n = 0; n < 420; n++) {
  const x = 1180 + rand() * 380, y = 610 + rand() * 280, da = dryAmt(x, y), sg = sageAmt(x, y);
  if (da < 0.5 || burnAmt(x, y) > 0.4 || couleeAmt(x, y) > 0.5) continue;
  if (rand() < (1 - sg) * 0.3 && fbm(x / 50, y / 40, 121, 3) > 0.45) put(pines[(rand() * 5) | 0], x, y); else if (rand() < 0.25 + sg * 0.6) put(sages[(rand() * 3) | 0], x, y);
}
// The old burn: silver and charred snags standing over young trees.
for (let n = 0; n < 520; n++) {
  const x = 1080 + rand() * 480, y = 830 + rand() * 250; if (burnAmt(x, y) < 0.5) continue;
  const r = rand(); if (r < 0.34) put(snags[(rand() * 5) | 0], x, y); else if (r < 0.52) put(burnt[(rand() * 4) | 0], x, y); else if (r < 0.7) plant(young[(rand() * 4) | 0], x, y); else if (r < 0.74) put(makeLog(), x, y);
}
// Boulders, bushes and the odd snag in the open ground.
const bushes = [0, 1, 2].map(i => makeBush(700 + i, 'huck')).concat([0, 1, 2].map(i => makeBush(710 + i, 'heather')), [0, 1].map(i => makeBush(720 + i, 'green')));
for (let n = 0; n < 240; n++) {
  const x = 560 + rand() * 700, y = 480 + rand() * 590; if (!open(x, y) || nearTrail(x, y, 7) || Math.hypot(x - T.x, y - T.y) < 34 || forestAmt(x, y) > 0.3 || burnAmt(x, y) > 0.4 || dryAmt(x, y) > 0.4) continue;
  if (rand() < 0.3) put(boulders[(rand() * 6) | 0], x, y); else put(bushes[(rand() * 8) | 0], x, y);
}
// The coast: sea stacks, driftwood along the beach, a ferry out by the fog.
put(seaStack(1, 44, 20), 112, 852); put(seaStack(2, 30, 15), 192, 908); put(seaStack(3, 22, 11), 58, 802); put(seaStack(4, 50, 22), 332, 990); put(seaStack(5, 16, 9), 252, 958); put(seaStack(6, 26, 12), 420, 1050);
put(ferry(), 150, 985);
for (let n = 0; n < 500; n++) {
  const x = rand() * 600, y = 690 + rand() * 390, cs = coast(x, y); if (cs > -3 || cs < -13) continue;
  const len = 6 + rand() * 12, a = (rand() - 0.5) * 0.9 + 0.6;
  for (let k = 0; k < len; k++) { const px = Math.round(x + Math.cos(a) * k), py = Math.round(y + Math.sin(a) * k * 0.5); if (px > 0 && py > 0 && px < NW && py < NH - 1) { g[at(px, py)] = R.rock[4]; g[at(px, py + 1)] = R.rock[2]; } }
}
// The lake's island and its one tree; the camp; the furniture at the Trailhead.
plant(firs[2], ISLE.x, ISLE.y + 1);
put(makeTent('tent'), 924, 564); put(makeTent('red'), 948, 574);
put(makeSignpost(), T.x - 4, T.y - 8); put(makeKiosk(), 872, 657);
const SIGNS = [[972, 592], [856, 566], [886, 532], [800, 742], [766, 631], [1160, 600], [1300, 552], [1226, 884], [1420, 966], [1474, 724], [1506, 806], [278, 864], [334, 612]];
for (const [x, y] of SIGNS) put(makeSmallSign(), x, y);
// Animals across the south meadow and beyond.
for (const [x, y, d] of [[760, 820, 0], [792, 836, 1], [738, 846, 1], [900, 900, 0], [640, 960, 1], [840, 1000, 1], [872, 1012, 0], [1060, 800, 1], [960, 760, 0]]) put(makeElk(!!d), x, y);
put(bear(false), 1010, 930); put(goat(0, false), 1196, 556); put(goat(0, true), 1212, 562); put(marmot(0), 846, 574); put(marmot(0), 1340, 590); put(marmot(0), 700, 900);

things.sort((a, b) => a.y - b.y);
for (const th of things) {
  if (th.tree) { const rx = th.tree.w * 0.42; for (let dy = -3; dy <= 3; dy++) for (let dx = -Math.ceil(rx); dx <= rx; dx++) { if (sq(dx / rx) + sq(dy / 3.2) > 1) continue; const x = th.x + dx + 2, y = th.y + dy - 1; if (x >= 0 && y >= 0 && x < NW && y < NH && g[at(x, y)] !== INK) g[at(x, y)] = R.ink[0] === g[at(x, y)] ? g[at(x, y)] : shade(g[at(x, y)]); } }
}
function shade(c) { for (const k in R) { const r = R[k], s = r.indexOf(c); if (s >= 0) return r[Math.max(0, s - 1)]; } return c; }
for (const th of things) {
  if (th.tree) for (const p of th.tree.parts) blit(p.bm, th.x + p.x, th.y + p.y);
  else blit(th.bm, th.x - th.bm.ox, th.y - th.bm.oy);
}
// The boot track, drawn over the ice: it thins to single prints and stops.
trackPts.forEach(([px, py], n) => {
  const f = n / (trackPts.length - 1), x = Math.round(px), y = Math.round(py);
  if (f > 0.55 && n % (f > 0.8 ? 7 : 4) > 1) return;
  g[at(x, y)] = R.glac[1]; if (f < 0.4) { g[at(x + 1, y)] = R.glac[1]; g[at(x, y + 1)] = R.glac[2]; g[at(x - 1, y)] = R.glac[3]; } else if (f < 0.7) g[at(x + 1, y)] = R.glac[2];
});
// Mist: thin bands of it lie in the deep forest and thicken to the west; a fog bank stands off the coast.
for (let y = 440; y < NH; y++) for (let x = 0; x < 620; x++) {
  const cs = coast(x, y), sea = cs > 0;
  let a = sea ? smooth(150, 330, cs) * 1.1 : smooth(520, 20, x) * smooth(groundLine(x) - 10, groundLine(x) + 40, y) * (0.12 + 0.95 * smooth(0.47, 0.6, fbm(x / 110, y / 13, 130, 3))) * (smooth(-4, -40, cs) * 0.9 + 0.1);
  if (!sea && a > 0.1 && nearTrail(x, y, 9)) a *= 0.3;
  if (a > 0 && bayer(x, y) < a * 0.85) g[at(x, y)] = R.fog[a > 0.8 ? 2 : a > 0.45 ? 1 : (bayer(x + 2, y + 1) < 0.5 ? 1 : 0)];
}

// ---- show it ----------------------------------------------------------------------------------
const c = document.getElementById('c'), q = new URLSearchParams(location.search), sc = +(q.get('scale') || 1);
c.width = NW; c.height = NH; c.style.width = NW * sc + 'px'; c.style.height = NH * sc + 'px';
if (q.get('crop')) { const [x, y] = q.get('crop').split(',').map(Number); c.style.marginLeft = -x * sc + 'px'; c.style.marginTop = -y * sc + 'px'; }
const ctx = c.getContext('2d'), img = ctx.createImageData(NW, NH);
for (let i = 0; i < g.length; i++) { const p = DAY[g[i]] || [255, 0, 255]; img.data[i * 4] = p[0]; img.data[i * 4 + 1] = p[1]; img.data[i * 4 + 2] = p[2]; img.data[i * 4 + 3] = 255; }
ctx.putImageData(img, 0, 0);
window.__info = { NW, NH }; window.__ready = true;
