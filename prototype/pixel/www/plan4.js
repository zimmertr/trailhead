// A workbench page: round 4's map blocked in as one still picture, for judging shapes, sizes and
// places before anything is drawn for real. plan4.html?crop=x,y,w,h&scale=3&labels=1&trees=0
// Nothing here is used by the site. The numbers come from layout4.js, which the real map will share.
import { DAY, R, INK, clamp, lerp, smooth, frac, sq, rng, hash, vnoise, fbm, bayer, pick, catmull, BM, outline } from './core.js';
import { makeMaple, makeAspen, makePonderosa, makeSpruce, makeFir, makeConifer, makeSnag, makeSignpost, makeSmallSign, makeKiosk, makeTent, makeBoulder } from './sprites.js';
import * as L from './layout4.js';

const { NW, NH } = L, g = new Uint8Array(NW * NH), at = (x, y) => y * NW + x, q = new URLSearchParams(location.search);
const BASE = 462, rdg = n => 1 - Math.abs(2 * n - 1);
const skyAt = (x, y) => { const sb = R.skyband, f = clamp(y / 400, 0, 1) * (sb.length - 1), b0 = Math.floor(f), e = f - b0; return sb[Math.min(sb.length - 1, b0 + (e > 0.72 && bayer(x, y) < (e - 0.72) / 0.28 ? 1 : 0))]; };
for (let y = 0; y < 480; y++) for (let x = 0; x < NW; x++) g[at(x, y)] = skyAt(x, y);

// ---- the skyline --------------------------------------------------------------------------------
// Shaded, plain and lit snow and rock, nearest first; every step back is paler and bluer.
const LP = [
  { snow: [R.snow[1], R.snow[3], R.snow[4]], rock: [R.rock[0], R.rock[1], R.rock[3]], crest: INK },
  { snow: [R.snow[2], R.snow[3], R.snow[4]], rock: [R.rock[1], R.rock[2], R.rock[3]], crest: R.rock[0] },
  { snow: [R.snow[2], R.snow[3], R.snow[3]], rock: [R.far[0], R.far[1], R.far[2]], crest: R.far[0] },
  { snow: [R.far[3], R.farsnow[0], R.farsnow[1]], rock: [R.far[1], R.far[2], R.far[3]], crest: R.far[1] },
  { snow: [R.far[3], R.farsnow[0], R.farsnow[0]], rock: [R.far[2], R.far[3], R.far[3]], crest: R.far[2] }
];
const GRAN = [[R.gold[2], R.gold[4], R.gold[6]], [R.gold[3], R.gold[4], R.gold[5]], [R.gold[3], R.gold[4], R.gold[5]], [R.far[2], R.far[3], R.farsnow[0]], [R.far[3], R.far[3], R.farsnow[0]]];
// One ordinary mountain. kind: 'peak' the snowy crest, 'granite' the Enchantments, 'wood' a forested
// ridge, 'hill' a dry Palouse hill. A: how far back it stands, 0 nearest. snow: how low the snow comes.
function peak({ cx, h, w, A = 0, seed, kind = 'peak', snow = 1 }) {
  const r = rng(seed), P = LP[A], x0 = cx - w / 2, x1 = cx + w / 2, sx = cx + (r() - 0.5) * w * 0.24, ty = BASE - h, gran = kind === 'granite', soft = kind === 'hill' || kind === 'wood';
  const sh = { x: sx + (r() < 0.5 ? -1 : 1) * w * (0.17 + 0.12 * r()), d: h * (0.1 + 0.2 * r()), s: w * 0.07 }, curve = gran ? 0.66 + 0.5 * r() : 0.74 + 0.4 * r();
  const top = x => {
    const half = x < sx ? sx - x0 : x1 - sx, u0 = Math.abs(x - sx) / Math.max(1, half), u = Math.min(1, u0);
    if (u0 > 1) return BASE + (u0 - 1) * h * (soft ? 1.3 : curve);
    if (soft) return ty + h * (0.5 - 0.5 * Math.cos(Math.PI * u)) + 1.5 * (vnoise(x / 9, seed, 700) - 0.5);
    return ty + h * Math.pow(u, curve) - sh.d * Math.exp(-sq((x - sh.x) / sh.s)) * (1 - u * 0.3) + (A < 2 ? 3 : 1.5) * (vnoise(x / 4, seed, 700) - 0.5) - (gran ? h * 0.22 * sq(rdg(vnoise(x / 7, seed, 704))) * u : 0);
  };
  for (let x = Math.max(0, Math.floor(x0 - w * 0.5)); x <= Math.min(NW - 1, Math.ceil(x1 + w * 0.5)); x++) {
    const t0 = Math.round(top(x)), yEnd = Math.ceil(L.groundLine(x)) + 1;
    for (let y = Math.max(0, t0); y <= yEnd; y++) {
      const d = y - t0, yr = y - ty, fr = frac((x - sx) / Math.max(3, yr) * 2.4 + 0.3 * vnoise(x / 7, y / 7, seed + 1)), left = x < sx + (fr - 0.5) * 3;
      const v = 0.5 + (left ? 0.2 : -0.18) + (fr < 0.5 ? 0.14 : -0.14) + 0.12 * (vnoise(x / 4, y / 5, seed + 2) - 0.5), s = v > 0.6 ? 2 : v > 0.38 ? 1 : 0;
      let c;
      if (kind === 'hill') c = d === 0 ? R.dry[3] : hash(x >> 1, y >> 1, seed) < 0.05 ? R.sage[1] : pick(A ? 'ochre' : 'dry', 0.9 - 0.75 * d / (h + 10) + 0.15 * (vnoise(x / 8, y / 4, seed) - 0.5), x, y);
      else if (kind === 'wood') c = A >= 2 ? (d === 0 ? R.far[0] : bayer(x, y) < 0.35 + 0.3 * vnoise(x / 5, y / 3, seed) ? R.hill[1] : R.far[0]) : d === 0 ? R.conifer[0] : pick(A ? 'hill' : 'conifer', 0.25 + 0.55 * hash(x, y, 703) - (left ? 0 : 0.15), x, y);
      else if (d === 0) c = P.crest;
      else {
        const snowLine = (gran ? h * 0.1 : (h * ((A <= 1 ? 0.36 : 0.5) + 0.22 * vnoise(x / 12, seed, 701)) + (fr < 0.5 ? 5 : -4) + A * h * 0.07) * smooth(18, 58, h)) * snow;
        const gully = fr > 0.6 && fr < (gran ? 0.68 : 0.76) && yr < h * (gran ? 0.45 : 0.86);
        // On the big near peaks of the crest a glacier hangs in one of the cirques.
        const ice = !gran && A <= 1 && h > 56 && Math.abs(fr - 0.3) < 0.1 && yr > h * 0.3;
        if (ice) c = frac(yr / 7 + 0.4 * vnoise(x / 9, y / 9, seed + 3)) < 0.12 ? R.glac[2] : pick('glac', 0.55 + v * 0.5, x, y, 0.6);
        else c = yr < snowLine || gully ? P.snow[s] : gran ? GRAN[A][vnoise(x / 2.5, y / 24, seed + 4) > 0.7 ? 0 : s] : P.rock[s];
        if (A <= 1 && y > BASE - (6 + 8 * vnoise(x / 5, seed, 702)) && !ice) c = gran ? pick('larch', 0.3 + 0.6 * hash(x >> 1, y, 705), x, y) : pick(A ? 'hill' : 'conifer', 0.25 + 0.5 * hash(x, y, 703), x, y);
      }
      g[at(x, y)] = c;
    }
  }
}
// A row of ordinary mountains between two x, whose height follows env(x). They are painted lowest
// first so the tall ones stand in front.
function row(xa, xb, env, o) {
  const r = rng(o.seed), list = [];
  for (let cx = xa; cx < xb;) { const h = env(cx) * (0.8 + 0.4 * r()), w = o.kind === 'hill' || o.kind === 'wood' ? h * (3.4 + 2 * r()) : Math.max(40, h * ((o.kind === 'granite' ? 1.1 : 1.45) + 0.6 * r())); list.push({ ...o, cx, h, w, seed: o.seed * 100 + list.length }); cx += w * (0.36 + 0.3 * r()); }
  for (const p of list.sort((a, b) => a.h - b.h)) peak(p);
}
// A skyline drawn from a list of [x, height] corners, joined by straight runs with a little wobble.
const profile = pts => x => { if (x <= pts[0][0]) return 0; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [xa, ha] = pts[i - 1], [xb, hb] = pts[i]; return lerp(ha, hb, (x - xa) / (xb - xa)); } return 0; };

// Mount Monolith, after Rainier seen from the south. A broad lopsided dome: a nearly flat top with
// three bumps, a lower shoulder to the left, a step and a dark rock tooth on the right flank.
function monolith() {
  const { x: cx, top: ty, west, east } = L.MONO, H = BASE - ty;
  const P = profile([[-west, 0], [-208, 0.09], [-176, 0.22], [-146, 0.38], [-118, 0.54], [-96, 0.67], [-80, 0.76], [-70, 0.815], [-62, 0.845], [-54, 0.85], [-48, 0.875], [-40, 0.93], [-32, 0.96], [-24, 0.975], [-16, 0.965], [-8, 0.985], [0, 1], [8, 0.995], [16, 0.98], [24, 0.985], [32, 0.96], [42, 0.92], [54, 0.87], [64, 0.85], [72, 0.78], [90, 0.67], [108, 0.585], [118, 0.56], [124, 0.585], [128, 0.6], [133, 0.545], [146, 0.47], [170, 0.33], [200, 0.18], [228, 0.07], [east, 0]]);
  const top = x => ty + H * (1 - P(x - cx)) + 1.6 * (vnoise(x / 5, 3, 560) - 0.5) * smooth(0, 30, Math.abs(x - cx));
  // Cleavers: dark rock ribs that fan out below the summit dome and split the ice into glaciers.
  const CLEAVERS = [-0.78, -0.42, -0.1, 0.24, 0.62];
  for (let x = cx - west; x <= cx + east; x++) {
    const t0 = Math.round(top(x)), dx = x - cx;
    for (let y = t0; y <= BASE + 6; y++) {
      const yr = y - ty, up = 1 - yr / H, fan = dx / Math.max(20, yr + 14), b = bayer(x, y);
      // The sun is in the west: the left of the dome is lit and the right falls into blue shadow.
      const sh = fan + 0.2 * (vnoise(x / 17, y / 17, 561) - 0.5);
      let c = sh < 0.02 ? R.farsnow[1] : sh < 0.3 ? (b < (sh - 0.02) / 0.28 ? R.farsnow[0] : R.farsnow[1]) : sh < 0.75 ? (b < (sh - 0.3) / 0.45 ? R.far[3] : R.farsnow[0]) : R.far[3];
      let rock = false;
      for (const f of CLEAVERS) if (up < 0.72 && up > 0.08 && Math.abs(fan - f - 0.05 * Math.sin(yr / 22 + f * 9)) < 0.012 + 0.07 * smooth(0.72, 0.2, up) && vnoise(x / 5, y / 8, 562) > 0.17) rock = true;
      // The tooth on the right flank, the step under the summit, and thin rock bands round the top.
      if (dx > 116 && dx < 138 && y < t0 + 12 + (dx - 116) * 0.3) rock = true;
      if (dx > 34 && dx < 68 && up > 0.7 && y > t0 + 3 && y < t0 + 16 && vnoise(x / 4, y / 3, 563) > 0.3) rock = true;
      if (up > 0.82 && y > t0 + 5 && y < t0 + 8 && Math.abs(dx) > 10 && hash(x >> 1, y, 564) < 0.45) rock = true;
      if (rock) c = sh < 0.2 ? R.far[1] : R.far[0];
      else if (up < 0.6) {
        // Glaciers between the cleavers: crevasses as short arcs, and two icefalls of broken blocks.
        const fall = (Math.abs(fan + 0.26) < 0.1 || Math.abs(fan - 0.42) < 0.09) && up > 0.36 && up < 0.5;
        if (fall && (y >> 1 & 1) && hash(x >> 1, y >> 1, 565) < 0.6) c = R.glac[2];
        else if (frac(yr / 6 + 2 * fan + 0.5 * vnoise(x / 9, y / 9, 566)) < 0.1 && vnoise(x / 5, y / 4, 567) > 0.45) c = R.glac[sh < 0.3 ? 3 : 2];
      }
      // Its foot goes dark with rock and forest; the foothills are painted over it.
      if (up < 0.14 && b < smooth(0.16, 0.02, up) + 0.2 * (vnoise(x / 7, y / 5, 568) - 0.5)) c = R.far[0];
      if (y === t0) c = R.far[2];
      g[at(x, y)] = c;
    }
  }
}
// Sideproject Spires, after the Southern Pickets: one broken ridge with six summits, in the order of
// the projects from west to east. [offset, height, reach west, reach east, width of its top].
const SUMMITS = [[-94, 0.66, 26, 30, 8], [-60, 0.84, 24, 20, 5], [-24, 1, 26, 22, 9], [10, 0.86, 18, 20, 5], [42, 0.95, 22, 26, 8], [82, 0.7, 24, 34, 10]];
function spires() {
  const { x: cx, top: ty } = L.SPIRES, H = BASE - ty;
  // The summits are blunt pyramids whose flanks run into each other, so the gaps between them are
  // notches in one high wall, not valleys. Gendarmes and bitten-out gaps break the ridge between.
  const high = dx => {
    let best = H * (0.28 + 0.2 * smooth(160, 90, Math.abs(dx))), who = -1;
    SUMMITS.forEach(([o, hh, wl, wr, cap], k) => { const u = Math.max(0, Math.abs(dx - o) - cap / 2) / (dx < o ? wl : wr), v = H * hh * (1 - 0.3 * Math.pow(u, 1.05) + 0.05 * smooth(0.5, 0.72, vnoise(dx / 9, 9, 824)) * Math.min(1, u)) - (dx - o) * (k & 1 ? 0.12 : -0.1) * (u === 0 ? 1 : 0); if (u < 2 && v > best) { best = v; who = k; } });
    return [best + (5 * sq(rdg(vnoise(dx / 4, 6, 811))) - 2.5 - 9 * smooth(0.74, 0.92, vnoise(dx / 6, 7, 812))) * smooth(0.3, 0.5, best / H), who];
  };
  for (let x = cx - 160; x <= cx + 160; x++) {
    const dx = x - cx, [hi, who] = high(dx), t0 = Math.round(BASE - hi);
    // Where the wall gives way to snow: lower under each summit, where a buttress of rock runs down.
    const floor = 0.3 + 0.06 * (vnoise(x / 11, 8, 816) - 0.5) - 0.1 * Math.max(...SUMMITS.map(([o]) => Math.max(0, 1 - Math.abs(dx - o) / 22)));
    for (let y = t0; y <= BASE + 4; y++) {
      const up = (BASE - y) / H, d = y - t0, flute = vnoise(x / 2.5, y / 16, 813);
      // Each pyramid is lit on its west face and shaded on its east; the edge between them wanders.
      const west = who < 0 ? vnoise(x / 9, y / 9, 821) > 0.5 : dx < SUMMITS[who][0] + 3 * Math.sin(y / 11 + who * 2);
      let c = R.rock[clamp((west ? 2 : 0) + (flute > 0.64 ? 1 : flute < 0.34 ? -1 : 0), 0, 3)];
      if (up > floor) {
        // Snow lies on ledges in short broken lines, and fills a narrow gully under each notch.
        const band = (x + (y >> 3) * 3) >> (2 + (hash(y >> 3, 1, 823) < 0.5 ? 1 : 0)), row = y / 7 + hash(band, 0, 814) * 7;
        if (d > 2 && frac(row) < 0.15 && hash(band, Math.floor(row), 815) < 0.2 + up * 0.16) c = R.snow[west ? 4 : 3];
        for (let k = 0; k < SUMMITS.length - 1; k++) { const gx = (SUMMITS[k][0] + SUMMITS[k + 1][0]) / 2 + 2 * Math.sin(y / 9 + k); if (d > 3 && d < 46 + 30 * hash(k, 2, 825) && Math.abs(dx - gx) < 1 + Math.min(d, 40) * 0.035 && vnoise(x / 3, y / 6, 826) > 0.22) c = R.snow[west ? 4 : 2]; }
      } else if (up < 0.13) c = frac((y + 0.3 * dx) / 6 + 0.4 * vnoise(x / 8, y / 8, 817)) < 0.16 ? R.glac[2] : pick('glac', 0.66 + 0.3 * vnoise(x / 6, y / 4, 818), x, y, 0.6);
      else c = frac(y / 9 + 0.9 * vnoise(x / 9, y / 9, 819)) < 0.1 && vnoise(x / 5, y / 3, 820) > 0.5 ? R.glac[2] : R.snow[vnoise(x / 14, y / 10, 822) > 0.5 ? 4 : 3];
      if (d === 0) c = INK;
      g[at(x, y)] = c;
    }
  }
}
// Farthest first. The Legacy Range, pale and low over the rainforest, one highest peak in its middle.
row(20, 330, x => 58 + 34 * Math.exp(-sq((x - 185) / 60)), { seed: 41, A: 4 });
row(40, 320, x => 40 + 30 * Math.exp(-sq((x - 180) / 50)), { seed: 42, A: 3 });
monolith();
// The crest: pale ranks behind, then the near peaks, building from the west toward the Spires and
// falling away east into the granite, where the snow line climbs.
const crestH = x => 86 + 44 * Math.exp(-sq((x - 1070) / 150));
row(850, 1330, x => crestH(x) * 0.95, { seed: 43, A: 3 });
const dip = x => 1 - 0.42 * Math.exp(-sq((x - L.PROF.x) / 100));
row(1250, 1700, x => (100 * smooth(1720, 1560, x) + 10) * dip(x), { seed: 44, A: 3, kind: 'granite' });
row(872, 1300, x => crestH(x) * 0.9, { seed: 45, A: 1, snow: 1 });
row(1270, 1650, x => (92 + 30 * vnoise(x / 60, 1, 46)) * dip(x), { seed: 46, A: 2, kind: 'granite' });
spires();
row(880, 930, x => 76, { seed: 47, A: 0 });
row(1222, 1290, x => 92, { seed: 48, A: 0, snow: 0.8 });
// Forested ridges: three rows under the volcano, the gap between it and the Legacy Range, and the
// pine foothills east of the granite. Then the Palouse hills at the far edge.
row(300, 900, x => 46 - 10 * Math.exp(-sq((x - 620) / 120)), { seed: 49, A: 2, kind: 'wood' });
row(250, 890, x => 32, { seed: 50, A: 1, kind: 'wood' });
row(210, 880, x => 20, { seed: 51, A: 0, kind: 'wood' });
row(1630, 1800, x => 34, { seed: 52, A: 1, kind: 'wood' });
row(1640, 1790, x => 22, { seed: 53, A: 0, kind: 'wood' });
row(1770, NW + 40, x => 24, { seed: 54, A: 1, kind: 'hill' });
row(1790, NW + 40, x => 15, { seed: 55, A: 0, kind: 'hill' });

// ---- the ground ---------------------------------------------------------------------------------
const trail = new Uint8Array(NW * NH), scene = new Uint8Array(NW * NH), water = new Uint8Array(NW * NH);
function stamp(mask, pts, r0, r1, v2 = 2) {
  pts.forEach(([px, py], n) => {
    const rr = lerp(r0, r1, n / (pts.length - 1)), R2 = Math.ceil(rr + 1);
    for (let dy = -R2; dy <= R2; dy++) for (let dx = -R2; dx <= R2; dx++) { const d = Math.hypot(dx, dy), x = Math.round(px + dx), y = Math.round(py + dy), v = d <= rr ? v2 : d <= rr + 1 ? 1 : 0; if (v && x >= 0 && y >= 0 && x < NW && y < NH && mask[at(x, y)] < v) mask[at(x, y)] = v; }
  });
}
const trailPts = [];
for (const k in L.TRAILS) {
  const t = L.TRAILS[k], all = catmull(t.pts); stamp(trail, all, k === 'track' ? 1.6 : 1.9, k === 'track' ? 0.8 : 1.9); if (k !== 'track') trailPts.push(...all);
  // The stretch a side-on scene covers, found again on the smooth line by its end points.
  for (const [a, b] of t.scene || []) { const near = p => { let bi = 0, bd = 1e9; all.forEach((s, i) => { const d = Math.hypot(s[0] - p[0], s[1] - p[1]); if (d < bd) { bd = d; bi = i; } }); return bi; }; stamp(scene, all.slice(near(t.pts[a]), near(t.pts[b]) + 1), 1.9, 1.9); }
}
for (const k in L.WATER) { const w = L.WATER[k]; stamp(water, catmull(w.pts), w.r[0], w.r[1]); }
const nearTrail = (x, y, r) => { for (let i = 0; i < trailPts.length; i += 3) { const p = trailPts[i]; if (Math.abs(p[0] - x) < r && Math.abs(p[1] - y) < r) return true; } return false; };
const bluff = (x, y) => vnoise(x / 60, 9, 88) > 0.42 && !water[at(x, y)];
function ground(x, y) {
  const i = at(x, y), n1 = hash(x, y, 31) - 0.5, cs = L.coast(x, y);
  if (cs > 0) return cs < 3 + 2 * vnoise(x / 9, y / 9, 85) ? R.sea[5] : pick('sea', 0.75 - smooth(0, 150, cs) * 0.6 + 0.12 * (vnoise(x / 14, y / 3, 86) - 0.5), x, y);
  if (cs > -15 - 6 * vnoise(x / 20, y / 20, 87)) return water[i] ? R.water[3] : R.sand[cs > -4 ? 0 : hash(x, y, 88) < 0.25 ? 1 : 2];
  // Low bluffs stand behind parts of the beach; the river comes out through a gap in them.
  if (cs > -30 && bluff(x, y)) return cs > -27 ? pick('ochre', 0.3 + 0.5 * vnoise(x / 3, y / 8, 89), x, y) : R.grass[4];
  if (L.isleD(x, y) < 1) return pick('grass', 0.55 + 0.3 * n1, x, y);
  const ld = L.lakeD(x, y);
  if (ld < 1) return ld > 0.9 ? R.water[4] : pick('water', 0.18 + 0.42 * smooth(0.1, 0.9, ld) + 0.08 * (vnoise(x / 6, y / 2, 8) - 0.5), x, y);
  const tr = L.tier(x, y), face = tr && tr.hh > 1.5 && tr.d >= 0 && tr.d < tr.hh;
  // Water over a step is white: the waterfall and the two cascades.
  if (water[i]) return face ? (hash(x, y >> 1, 5) < 0.72 ? R.white[1] : R.water[4]) : water[i] === 2 ? R.water[y & 1 ? 3 : 4] : R.water[1];
  const td = L.tarnD(x, y);
  if (td < 1) return td > 0.86 ? R.tarn[5] : pick('tarn', 0.25 + 0.5 * smooth(0, 0.9, td), x, y);
  const gl = L.glacier(x, y), onShelf = tr && tr.t.name === 'headwall' && tr.d < 0;
  if (gl.d < gl.w && y < 512) {
    if (trail[i]) return trail[i] === 1 ? R.glac[3] : R.glac[1];
    return frac(gl.t * gl.len / 9 - sq(gl.side / gl.w) * 0.35 + 0.35 * vnoise(x / 6, y / 6, 2)) < 0.1 && gl.d < gl.w - 3 ? R.glac[1] : pick('glac', 0.7 - 0.3 * gl.side / gl.w - gl.t * 0.2 + 0.18 * (vnoise(x / 4, y / 4, 8) - 0.5), x, y, 0.6);
  }
  if (trail[i] === 2) return q.get('labels') && scene[i] ? R.blaze[2] : onShelf || face ? R.rock[hash(x, y, 6) < 0.3 ? 4 : 3] : hash(x, y, 5) < 0.1 ? R.dirt[2] : R.dirt[3];
  if (trail[i] === 1) return onShelf || face ? R.rock[1] : R.dirt[1];
  if (face) return tr.d < 1 ? R[tr.t.ramp][tr.t.ramp === 'gold' ? 6 : 4] : pick(tr.t.ramp, (tr.t.ramp === 'gold' ? 0.3 : 0.12) + 0.42 * vnoise(x / 3, y / 10, 97) + 0.2 * (1 - tr.d / tr.hh), x, y, 0.7);
  if (tr && tr.hh > 1.5 && tr.d >= tr.hh && tr.d < tr.hh + 2.5) return R.grass[0];
  // The shelf above the headwall: moraine and gravel round the glacier's toe, turf at its edges.
  if (gl.d < gl.w + 6 && y < 520) return pick('rock', 0.2 + 0.55 * hash(x >> 1, y >> 1, 11), x, y);
  if (onShelf && hash(x >> 1, y >> 1, 12) < 0.75 * smooth(110, 40, Math.abs(x - 1080))) return pick('rock', 0.2 + 0.7 * hash(x >> 1, y >> 1, 13), x, y);
  const fa = L.forestAmt(x, y);
  if (fa > 0.5 + 0.2 * n1) { const deep = smooth(520, 200, x), v = 0.16 + 0.3 * fbm(x / 18, y / 18, 22, 3); return deep > 0.35 + 0.5 * hash(x, y, 23) ? pick('mist', v * 0.8, x, y) : pick('moss', v, x, y); }
  if (L.mesa(x, y)) return L.mesa(x, y + 1) ? (hash(x >> 1, y >> 1, 94) < 0.1 ? R.sage[1] : pick('dry', 0.6 + 0.3 * vnoise(x / 9, y / 5, 95), x, y)) : R.dry[3];
  if (L.mesa(x, y - 15)) { const col = hash(x >> 1, 0, 91); return (x >> 1) % 4 === 0 ? R.basalt[0] : R.basalt[col < 0.3 ? 1 : col < 0.75 ? 2 : 3]; }
  if (L.mesa(x, y - 22)) return hash(x, y, 92) < 0.5 ? R.basalt[2] : R.ash[1];
  const blot = s => 0.5 + 0.85 * (fbm(x / 32, y / 21, s, 3) - 0.5) + 0.2 * n1;
  const la = L.larchAmt(x, y), upper = tr && tr.t.name === 'granite' && tr.d < 0 && tr.hh / tr.t.h > clamp(blot(184), 0.08, 0.92);
  if (upper || la > blot(181)) {
    // The upper basin is mostly bare slab with turf in the seams; the lower basin is turf with slabs in it.
    const slab = fbm(x / 22, y / 11, 96, 3);
    if (slab > (upper ? 0.4 : 0.56)) return vnoise(x / 3, y / 9, 97) > 0.8 ? R.gold[3] : pick('gold', 0.7 + 0.5 * (slab - 0.5) + 0.2 * n1, x, y, 0.7);
    return hash(x, y, 98) < 0.06 ? R.red[1] : hash(x, y, 99) < 0.05 ? R.larch[3] : pick('grass', 0.42 + 0.5 * (fbm(x / 20, y / 20, 99, 3) - 0.5) + 0.2 * n1, x, y, 0.4);
  }
  const bu = L.burnAmt(x, y), da = L.dryAmt(x, y);
  if (bu > blot(182)) {
    // The old burn: ash, green coming back, and fireweed standing far taller than meadow flowers.
    for (let k = 0; k < 9; k++) { const tall = 6 + Math.floor(hash(x, y + k, 132) * 3.99); if (k < tall && hash(x, y + k, 101) < 0.008 + 0.09 * smooth(0.5, 0.66, fbm(x / 30, (y + k) / 15, 131, 3))) return k < 2 ? R.grass[1] : k === tall - 1 ? R.fireweed[1] : R.fireweed[0]; }
    return fbm(x / 24, y / 16, 100, 3) > 0.56 ? pick('grass', 0.3 + 0.2 * n1, x, y, 0.5) : pick('ash', 0.4 + 0.5 * fbm(x / 14, y / 9, 102, 3) + 0.2 * n1, x, y);
  }
  if (da > blot(183)) {
    const sg = L.sageAmt(x, y);
    if (hash(x >> 1, y >> 1, 103) < 0.04 + sg * 0.3) return R.sage[1 + (hash(x, y, 104) < 0.5 ? 0 : 1)];
    return pick('dry', 0.5 + 0.5 * (fbm(x / 24, y / 14, 105, 3) - 0.5) + 0.15 * n1 + sg * 0.1, x, y);
  }
  // Parkland and meadow are both grass; the parkland is the one thick with flowers.
  const pa = L.parkAmt(x, y), drift = fbm(x / 16, y / 9, 110, 3);
  if (pa > 0.3 && drift > 0.62 - pa * 0.12 && hash(x, y, 111) < 0.3) { const k = hash(x >> 3, y >> 2, 112); return k < 0.45 ? R.lupine[1] : k < 0.75 ? R.red[1] : k < 0.9 ? R.white[1] : R.pink[1]; }
  if (pa <= 0.3 && hash(x, y, 113) < 0.004) return hash(x, y, 114) < 0.5 ? R.lupine[1] : R.yellow[1];
  return pick('grass', 0.56 + 0.55 * (fbm(x / 26, y / 26, 31, 3) - 0.5) + 0.14 * (hash(x >> 1, y >> 1, 32) - 0.5) - fa * 0.45 + da * 0.2 + pa * 0.06, x, y, 0.3);
}
for (let y = 440; y < NH; y++) for (let x = 0; x < NW; x++) if (y >= L.groundLine(x)) g[at(x, y)] = ground(x, y);

// ---- things that stand up -----------------------------------------------------------------------
const things = [], put = (bm, x, y) => things.push({ bm, x: Math.round(x), y: Math.round(y) }), plant = (tree, x, y) => things.push({ tree, x: Math.round(x), y: Math.round(y) });
// Proficiency Peak, after Prusik Peak's south face: a lower flat-topped tower on the left (the West
// Ridge is the left skyline), a prow rising to a small summit block, a serrated ridge falling right.
function proficiency() {
  const { w, h } = L.PROF, b = new BM(w + 4, h + 8); b.ox = (w >> 1) + 2; b.oy = h + 2;
  const P = profile([[-75, 0], [-70, 0.14], [-63, 0.2], [-58, 0.34], [-51, 0.4], [-46, 0.58], [-41, 0.63], [-31, 0.62], [-27, 0.53], [-22, 0.62], [-16, 0.8], [-9, 0.9], [-5, 0.97], [-3, 1], [3, 1], [5, 0.94], [10, 0.9], [15, 0.8], [21, 0.76], [24, 0.68], [29, 0.71], [33, 0.6], [39, 0.62], [44, 0.5], [50, 0.53], [55, 0.4], [61, 0.36], [66, 0.2], [75, 0]]);
  for (let dx = -(w >> 1); dx <= w >> 1; dx++) {
    const hh = h * P(dx * 150 / w) + 2.2 * (vnoise(dx / 3, 4, 900) - 0.5), t0 = Math.round(h - hh);
    for (let y = t0; y <= h + 2 + 3 * vnoise(dx / 6, 5, 901); y++) {
      // A pale wall, lit on the left of the prow, with dark water streaks and long vertical cracks.
      const crack = vnoise(dx / 2.2, y / 26, 902), streak = vnoise(dx / 5, y / 40, 903), shade = dx > 6 + (y - t0) * 0.1 ? -1.2 : 0;
      let v = 4.6 + shade + (streak > 0.62 ? -1.6 : 0) + (crack > 0.74 ? -2 : crack < 0.2 ? 0.8 : 0) + 0.8 * (vnoise(dx / 6, y / 6, 904) - 0.5) - smooth(h - 16, h, y) * 1.2;
      if (frac(y / 13 + vnoise(dx / 20, 6, 905)) < 0.07 && vnoise(dx / 7, y / 4, 906) > 0.5) v -= 1.5;
      b.set(b.ox + dx, y, R.gold[clamp(Math.round(v + (bayer(dx + 80, y) - 0.5) * 0.9), 1, 6)]);
    }
  }
  outline(b, INK);
  return b;
}
put(proficiency(), L.PROF.x, L.PROF.y);
const footprint = (x, y) => Math.abs(x - L.PROF.x) < L.PROF.w / 2 + 8 && y > L.PROF.y - L.PROF.h && y < L.PROF.y + 6;
const open = (x, y, r = 5) => {
  if (x < 2 || x >= NW - 2 || y >= NH || y < L.groundLine(x) + 6 || L.coast(x, y) > -32 || L.lakeD(x, y) < 1.3 || L.tarnD(x, y) < 1.5 || footprint(x, y)) return false;
  const xi = Math.round(x), yi = Math.round(y); for (let k = -r; k <= r; k += r) if (water[at(clamp(xi + k, 0, NW - 1), yi)]) return false;
  const tr = L.tier(x, y); if (tr && tr.hh > 1.5 && tr.d > -3 && tr.d < tr.hh + 3) return false;
  const gl = L.glacier(x, y); if (gl.d < gl.w + 10 && y < 524) return false;
  return !nearTrail(x, y, 9) && Math.hypot(x - L.T.x, (y - L.T.y) * 1.4) > 46 && !L.mesa(x, y) && !L.mesa(x, y - 15) && !L.mesa(x, y - 22);
};
if (q.get('trees') !== '0') {
  const rand = rng(2026);
  const maples = Array.from({ length: 6 }, (_, i) => makeMaple(100 + i)), spruces = Array.from({ length: 6 }, (_, i) => makeSpruce(200 + i)), firs = Array.from({ length: 8 }, (_, i) => makeFir(300 + i));
  const larches = Array.from({ length: 6 }, (_, i) => { const r = rng(900 + i); return makeConifer(900 + i, 24 + (r() * 14 | 0), 10 + (r() * 4 | 0), 'larch', 6); });
  const pines = Array.from({ length: 5 }, (_, i) => makePonderosa(820 + i)), aspens = Array.from({ length: 7 }, (_, i) => makeAspen(600 + i)), snags = Array.from({ length: 5 }, (_, i) => makeSnag(730 + i));
  const any = a => a[(rand() * a.length) | 0];
  // The rainforest. Toward the fog at the west edge the trees thin to bare snags.
  for (let gy = 474; gy < NH + 30; gy += 9) for (let gx = -10; gx < 760; gx += 9) {
    const x = gx + rand() * 9, y = gy + rand() * 9, xx = clamp(x, 2, NW - 3), yy = Math.min(NH - 1, y), fa = L.forestAmt(xx, yy), r = rand();
    if (rand() > fa * 0.78 || !open(xx, yy)) continue;
    if (rand() < L.fogAmt(xx, yy) * 0.45) put(any(snags), x, y); else plant(r < 0.45 ? any(maples) : r < 0.88 ? any(spruces) : any(firs), x, y);
  }
  // Firs in clumps: close together in the parkland, fewer across the meadows south and east of it.
  for (let n = 0; n < 2600; n++) {
    const x = 560 + rand() * 960, y = 474 + rand() * 600, pa = L.parkAmt(x, y), clumpy = fbm(x / 46, y / 40, 71, 3);
    if (clumpy < (pa > 0.4 ? 0.57 : 0.61) || L.forestAmt(x, y) > 0.2 || !open(x, y)) continue;
    if (rand() < Math.max(L.larchAmt(x, y), L.dryAmt(x, y) * 1.2, L.burnAmt(x, y), L.eastAmt(x, y) * 0.8)) continue;
    const tr = L.tier(x, y); if (tr && tr.t.name === 'headwall' && tr.d < 0) continue;
    plant(any(firs), x, y);
  }
  // Larches: in groups through the lower basin, a few at the edges of the upper one.
  for (let n = 0; n < 2400; n++) {
    const x = 1150 + rand() * 500, y = 472 + rand() * 290, tr = L.tier(x, y), upper = tr && tr.t.name === 'granite' && tr.d < 0;
    if (rand() > L.larchAmt(x, y) * (upper ? 0.16 : 0.8) || fbm(x / 40, y / 30, 120, 3) < (upper ? 0.5 : 0.53) || !open(x, y)) continue;
    // The foot of the granite headwall is kept mostly clear, so the step can be seen.
    if (tr && tr.d >= tr.hh && tr.d < tr.hh + 30 && rand() < 0.8) continue;
    plant(any(larches), x, y);
  }
  // Aspen in groves and ponderosa standing apart, between the larches and the sage.
  const band = (x, y) => L.eastAmt(x, y) * (1 - L.larchAmt(x, y)) * (1 - L.burnAmt(x, y)) * (1 - 0.85 * L.sageAmt(x, y));
  for (let n = 0; n < 120; n++) {
    const cx = 1240 + rand() * 540, cy = 640 + rand() * 430, size = 8 + (rand() * 6 | 0), here = rand() < 0.5 * band(cx, cy) * (1 - 0.6 * L.dryAmt(cx, cy));
    for (let k = 0; k < size; k++) { const a = rand() * 6.283, d = Math.sqrt(rand()) * 9, x = cx + Math.cos(a) * d * 1.5, y = cy + Math.sin(a) * d * 0.8; if (here && open(x, y)) plant(any(aspens), x, y); }
  }
  const stood = [];
  for (let n = 0; n < 900; n++) {
    const x = 1300 + rand() * 520, y = 480 + rand() * 590;
    if (rand() > band(x, y) * (0.05 + 0.3 * L.dryAmt(x, y)) || !open(x, y) || stood.some(([px, py]) => Math.abs(px - x) < 24 && Math.abs(py - y) < 20)) continue;
    stood.push([x, y]); plant(any(pines), x, y);
  }
  for (let n = 0; n < 420; n++) { const x = 1420 + rand() * 480, y = 860 + rand() * 220; if (rand() < L.burnAmt(x, y) && open(x, y)) put(any(snags), x, y); }
  for (let n = 0; n < 60; n++) { const x = 1200 + rand() * 400, y = 474 + rand() * 80; if (open(x, y)) put(makeBoulder(500 + n % 6, 3 + (n % 6) * 0.8), x, y); }
}
// Sea stacks stand in for the coast's rock; the real ones come with the real map.
for (const [sx, sy, H, W] of [[92, 812, 40, 18], [172, 884, 28, 14], [40, 748, 20, 10], [296, 1010, 46, 20], [224, 944, 16, 9], [384, 1062, 24, 12]]) {
  const b = new BM(W + 2, H + 2); b.ox = (W >> 1) + 1; b.oy = H;
  for (let y = 0; y < H; y++) { const hw = W / 2 * (0.45 + 0.55 * Math.pow(y / H, 0.6)); for (let x = -Math.ceil(hw); x <= hw; x++) b.set(b.ox + x, y + 1, y < 3 ? R.conifer[2] : pick('basalt', 0.62 - x / hw * 0.4, x + 40, y)); }
  outline(b, INK); put(b, sx, sy);
}
put(makeSignpost(), L.T.x - 4, L.T.y - 8); put(makeKiosk(), L.KIOSK.x, L.KIOSK.y); put(makeSmallSign(), L.REGISTER.x, L.REGISTER.y);
put(makeTent('tent'), L.CAMP.x, L.CAMP.y); put(makeTent('red'), L.CAMP.x + 20, L.CAMP.y + 7);
const blit = (bm, sx, sy) => { for (let j = 0; j < bm.h; j++) for (let i = 0; i < bm.w; i++) { const c = bm.d[j * bm.w + i], x = sx + i, y = sy + j; if (c && x >= 0 && y >= 0 && x < NW && y < NH) g[at(x, y)] = c; } };
things.sort((a, b) => a.y - b.y);
for (const th of things) { if (th.tree) for (const p of th.tree.parts) blit(p.bm, th.x + p.x, th.y + p.y); else blit(th.bm, th.x - (th.bm.ox || 0), th.y - (th.bm.oy || 0)); }
// Fog swallows the west edge: thin at first, then nothing shows. It lies over sky and sea as well.
for (let y = 300; y < NH; y++) for (let x = 0; x < 240; x++) {
  const f = L.fogAmt(x, y) * (0.55 + 0.6 * fbm(x / 60, y / 22, 220, 3)) * smooth(300, 420, y);
  if (bayer(x, y) < f * 1.25 - 0.12) g[at(x, y)] = R.fog[f > 0.75 ? 2 : 1];
}

// ---- onto the page ------------------------------------------------------------------------------
const c = document.getElementById('c'), sc = +(q.get('scale') || 1);
c.width = NW; c.height = NH; c.style.width = NW * sc + 'px'; c.style.height = NH * sc + 'px';
if (q.get('crop')) { const [x, y] = q.get('crop').split(',').map(Number); c.style.marginLeft = -x * sc + 'px'; c.style.marginTop = -y * sc + 'px'; }
const ctx = c.getContext('2d'), img = ctx.createImageData(NW, NH);
for (let i = 0; i < g.length; i++) { const p = DAY[g[i]] || [255, 0, 255]; img.data[i * 4] = p[0]; img.data[i * 4 + 1] = p[1]; img.data[i * 4 + 2] = p[2]; img.data[i * 4 + 3] = 255; }
ctx.putImageData(img, 0, 0);
if (q.get('labels')) {
  ctx.font = '10px monospace'; ctx.textBaseline = 'middle';
  const tag = (t, x, y) => { const w = ctx.measureText(t).width + 8; ctx.fillStyle = '#1a1424'; ctx.fillRect(Math.round(x - w / 2), y - 7, w, 14); ctx.fillStyle = '#fff3d0'; ctx.fillText(t, Math.round(x - w / 2) + 4, y + 1); };
  tag('Trailhead', L.T.x, L.T.y + 14); tag('register', L.REGISTER.x - 26, L.REGISTER.y - 14); tag('Reflection Lake', 640, 520); tag('waterfall', L.FALL.x + 40, L.FALL.y + 8);
  tag('Proficiency Peak', L.PROF.x, L.PROF.y - L.PROF.h - 10); tag('Sideproject Spires', L.SPIRES.x, L.SPIRES.top - 12); tag('base camp', L.CAMP.x + 48, L.CAMP.y - 6);
  tag('Mount Monolith', L.MONO.x, L.MONO.top - 12); tag('Legacy Range', 180, 360); tag('rainforest', 360, 620); tag('parkland', 770, 520); tag('lower larch basin', 1400, 650); tag('upper basin', 1500, 520);
  tag('pines and aspen', 1640, 720); tag('the burn', 1640, 1000); tag('sage and scabland', 1840, 620); tag('fog', 60, 560); tag('meadow', 900, 860);
  tag('orange: covered by a side-on scene', 1100, 1060);
}
// Where the page's own furniture sits on a 1440 by 900 screen, to see what an opening view would hide.
if (q.get('sign')) for (const [css, t] of [['left:14px;bottom:88px;width:424px;height:340px', 'sign, card and planks'], ['left:14px;right:14px;bottom:10px;height:64px', 'timeline'], ['right:14px;top:0;width:650px;height:28px', 'buttons']]) { const d = document.createElement('div'); d.style.cssText = 'position:fixed;background:rgba(56,34,15,.6);outline:2px solid #38220f;color:#fff3d0;font:12px monospace;padding:4px;box-sizing:border-box;' + css; d.textContent = t; document.body.appendChild(d); }
window.__info = { NW, NH }; window.__ready = true;
