// Round 3 block-in: three versions of the top right of the map (the skyline, the larch basin and
// Sideproject Spires) for TJ to pick from. `?v=a`, `b` or `c` in the address picks one; with no
// `v` nothing in this file is used and the map is exactly as it was. Whatever he picks moves into
// terrain.js and world.js, and this file goes.
import { clamp, lerp, smooth, frac, sq, hash, vnoise, fbm, bayer, R, RAMP_OF, pick, BM, outline, INK } from './core.js';

const VARIANT = typeof location === 'undefined' ? '' : (new URLSearchParams(location.search).get('v') || '').toLowerCase();

// ---- what sets the three apart ------------------------------------------------------------------
// range: the far peaks that carry the west range on toward the Spires, as [x, height, width, tone,
// lean, teeth]. volcano: where it stands and how big. massif: the Spires' size and its six summits,
// in the order world.js has always listed them. peak: the granite peak in the basin. slab: how much
// of the basin is bare rock.
const VERSIONS = {
  // A. The far peaks stay low behind the lake peak and The Stack and rise in a short run just west
  // of the Spires. A mid-sized volcano over the middle of the basin. The Spires as a broad massif
  // with one tower well above the rest.
  a: {
    keepWest: 640,
    range: [[668, 30, 78, 3, 0.1], [726, 24, 84, 4, -0.1], [790, 22, 90, 4, 0.05], [848, 30, 70, 3, 0.1], [884, 50, 54, 2, -0.08, [[13, 16, 2.6]]], [914, 74, 50, 2, 0.06, [[-12, 20, 3.2], [10, 26, 3]]]],
    volcano: { x: 1302, top: 262, halfL: 250, halfR: 258, far: 0 },
    hills: { far: 46, mid: 32, near: 20, gold: [1330, 1500] },
    glacier: { x1: 964, y1: 550, w0: 54, w1: 15 },
    massif: { kind: 'tower', w: 200, h: 140, label: [8, -64], summits: [
      { id: 'yggdrasil', cx: 24, top: 98, hw: 15 }, { id: 'hevy-garmin-sync', cx: 60, top: 60, hw: 11 }, { id: 'bluebird', cx: 94, top: 4, hw: 12 },
      { id: 'tks', cx: 120, top: 36, hw: 9 }, { id: 'trailhead', cx: 143, top: 57, hw: 9 }, { id: 'kubernetes-manifests', cx: 176, top: 92, hw: 14 }] },
    peak: { kind: 'fin', x: 1256, y: 497, w: 150, h: 90 },
    slab: 0.66
  },
  // B. One pale far range runs on behind the lake peak and The Stack, climbing all the way to the
  // Spires. The volcano is farther off, smaller and further right, with more sky round it. The
  // Spires are taller and narrower: a tight cluster of needles.
  b: {
    keepWest: 640,
    range: [[662, 38, 76, 4, 0.1], [712, 46, 70, 4, -0.08, [[14, 12, 2.4]]], [764, 50, 72, 4, 0.1], [816, 58, 70, 3, -0.06, [[-14, 14, 2.6]]], [866, 70, 66, 3, 0.08, [[13, 18, 2.8]]], [912, 88, 60, 3, -0.05, [[-13, 22, 3], [12, 30, 3]]], [962, 104, 64, 3, 0.04, [[-15, 26, 3.2], [14, 20, 3.4]]], [1016, 82, 58, 3, 0.08, [[12, 20, 3]]], [1064, 54, 60, 4, -0.1, [[-12, 14, 2.6]]]],
    volcano: { x: 1392, top: 312, halfL: 190, halfR: 196, far: 1 },
    hills: { far: 34, mid: 26, near: 17, gold: [1400, 1510] },
    glacier: { x1: 965, y1: 548, w0: 44, w1: 13 },
    massif: { kind: 'needles', w: 168, h: 146, label: [6, -66], summits: [
      { id: 'yggdrasil', cx: 22, top: 94, hw: 11 }, { id: 'hevy-garmin-sync', cx: 48, top: 46, hw: 8 }, { id: 'bluebird', cx: 74, top: 4, hw: 9 },
      { id: 'tks', cx: 97, top: 22, hw: 8 }, { id: 'trailhead', cx: 120, top: 48, hw: 8 }, { id: 'kubernetes-manifests', cx: 146, top: 86, hw: 11 }] },
    peak: { kind: 'ridge', x: 1196, y: 495, w: 182, h: 80 },
    slab: 0.52
  },
  // C. The far peaks come in three steps, one in each gap between the landmarks, each taller than
  // the last. The volcano is near and large. The Spires are one long wall with six teeth along its
  // crest.
  c: {
    keepWest: 640,
    range: [[664, 24, 80, 4, 0.1], [722, 58, 66, 3, -0.06, [[12, 14, 2.8]]], [786, 22, 96, 4, 0], [852, 40, 60, 3, 0.1], [884, 86, 62, 2, 0.05, [[-14, 22, 3], [13, 30, 3.2]]], [1086, 34, 64, 3, -0.1, [[-10, 10, 2.4]]]],
    volcano: { x: 1326, top: 236, halfL: 262, halfR: 268, far: -1 },
    hills: { far: 52, mid: 36, near: 22, gold: [1370, 1490] },
    glacier: { x1: 966, y1: 551, w0: 66, w1: 16 },
    massif: { kind: 'wall', w: 232, h: 132, label: [8, -60], summits: [
      { id: 'yggdrasil', cx: 30, top: 86, hw: 15 }, { id: 'hevy-garmin-sync', cx: 70, top: 52, hw: 13 }, { id: 'bluebird', cx: 108, top: 4, hw: 13 },
      { id: 'tks', cx: 140, top: 24, hw: 12 }, { id: 'trailhead', cx: 174, top: 46, hw: 12 }, { id: 'kubernetes-manifests', cx: 206, top: 80, hw: 14 }] },
    peak: { kind: 'tooth', x: 1332, y: 498, w: 112, h: 66 },
    slab: 0.8
  }
};
const BK = VERSIONS[VARIANT] || null;

// A curve through [u, v] points, eased between them so it has no corners.
function through(pts) {
  return u => {
    if (u <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (u <= pts[i][0]) {
      const p0 = pts[Math.max(0, i - 2)], p1 = pts[i - 1], p2 = pts[i], p3 = pts[Math.min(pts.length - 1, i + 1)], t = (u - p1[0]) / (p2[0] - p1[0]), t2 = t * t, t3 = t2 * t;
      const v = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      return clamp(v, Math.min(p1[1], p2[1]), Math.max(p1[1], p2[1]));
    }
    return pts[pts.length - 1][1];
  };
}

// ---- the skyline --------------------------------------------------------------------------------
// Shaded, plain and lit snow and rock, nearest first: every step back is paler and bluer.
const TONES = [
  { snow: [R.snow[1], R.snow[3], R.snow[4]], rock: [R.rock[0], R.rock[1], R.rock[3]], crest: INK },
  { snow: [R.snow[2], R.snow[3], R.snow[4]], rock: [R.rock[1], R.rock[2], R.rock[3]], crest: R.rock[0] },
  { snow: [R.snow[2], R.snow[3], R.snow[4]], rock: [R.granite[2], R.granite[3], R.granite[4]], crest: R.granite[1] },
  { snow: [R.snow[2], R.snow[3], R.snow[3]], rock: [R.far[0], R.far[1], R.far[2]], crest: R.far[0] },
  { snow: [R.far[3], R.farsnow[0], R.farsnow[1]], rock: [R.far[1], R.far[2], R.far[3]], crest: R.far[1] }
];
// One drawn peak: a summit with its own lean, a flank curve either side, and teeth along its ridges.
// Each tooth is [how far from the summit, how far below it, how steep].
function farPeak(T, [cx, h, w, tone, lean = 0, teeth = []], seed) {
  const { g, at, NW, NH, groundLine } = T, P = TONES[tone], base = groundLine(clamp(Math.round(cx), 0, NW - 1)) + 2;
  const sx = cx + lean * w, ty = base - h, x0 = cx - w / 2, x1 = cx + w / 2, cl = 0.8 + 0.3 * hash(seed, 1, 801), cr = 0.8 + 0.3 * hash(seed, 2, 801);
  const tops = [[sx, ty, 0]].concat(teeth.map(([dx, drop, steep]) => [sx + dx, ty + drop, steep]));
  // The skyline at x, and which of its tops stands over this column.
  const sky = x => {
    const half = x < sx ? sx - x0 : x1 - sx, u0 = Math.abs(x - sx) / Math.max(1, half), c = x < sx ? cl : cr;
    let y = u0 > 1 ? base + (u0 - 1) * h * c : ty + h * Math.pow(u0, c), own = 0;
    for (let k = 1; k < tops.length; k++) { const yy = tops[k][1] + Math.abs(x - tops[k][0]) * tops[k][2]; if (yy < y) { y = yy; own = k; } }
    return [y + (tone < 3 ? 2.4 : 1.4) * (vnoise(x / 3.5, seed, 802) - 0.5) * Math.min(1, Math.abs(x - tops[own][0]) / 3), own];
  };
  for (let x = Math.max(0, Math.floor(x0 - w * 0.4)); x <= Math.min(NW - 1, Math.ceil(x1 + w * 0.4)); x++) {
    // The edge line runs down a steep side as far as the next column's top, so it stays one unbroken line.
    const [ys, own] = sky(x), t0 = Math.round(ys), [ax, ay] = tops[own], yEnd = Math.min(NH - 1, base + 6), edge = Math.max(Math.round(sky(x - 1)[0]), Math.round(sky(x + 1)[0]));
    for (let y = Math.max(0, t0); y <= yEnd; y++) {
      const yr = y - ay, fr = frac((x - ax) / Math.max(3, yr) * 2.4 + 0.3 * vnoise(x / 7, y / 7, seed + 1)), left = x < ax + (fr - 0.5) * 3;
      const v = 0.5 + (left ? 0.2 : -0.18) + (fr < 0.5 ? 0.14 : -0.14) + 0.12 * (vnoise(x / 4, y / 5, seed + 2) - 0.5), s = v > 0.6 ? 2 : v > 0.38 ? 1 : 0;
      // Snow lies on the upper part and in the gullies; lower down the rock shows, more of it on the steeper tops.
      const line = h * (0.5 + 0.24 * vnoise(x / 12, seed, 803)) + (fr < 0.5 ? 5 : -4) - (own ? 8 : 0), gully = fr > 0.6 && fr < 0.76 && y - ty < h * 0.9;
      let c = y === t0 || y < edge ? P.crest : y - ty < line || gully ? P.snow[s] : P.rock[s];
      // The foot of a far peak sinks into the haze.
      if (tone >= 3 && y > base - 20 && bayer(x, y) < 0.75 * (y - (base - 20)) / 20) c = R.far[3];
      g[at(x, y)] = c;
    }
  }
}

// The volcano: one broad glaciated cone standing alone, after Rainier. A rounded top with a lower
// cap on its left shoulder and a dark tooth on its right flank. Ribs of rock fan down from the top
// between the glaciers: each starts as a thin line and widens toward the foot, where they join
// into bare slopes that fade into the haze behind the foothills.
const CONE = through([[0, 0], [0.05, 0.012], [0.1, 0.04], [0.18, 0.11], [0.28, 0.22], [0.42, 0.42], [0.58, 0.64], [0.75, 0.84], [0.9, 0.95], [1, 1]]);
function volcano(T, V) {
  const { g, at, NW, groundLine } = T, { x: vx, top: ty, halfL, halfR, far } = V, base = 470, H = base - ty, tx = vx + halfR * 0.37;
  // far: -1 is near and crisp, 0 is in between, 1 is far and pale.
  const snow = far > 0 ? [R.far[3], R.farsnow[0], R.farsnow[0], R.farsnow[1]] : [R.snow[1], R.snow[2], R.snow[3], R.snow[4]];
  const rock = far > 0 ? [R.far[1], R.far[2]] : far < 0 ? [R.rock[1], R.far[0]] : [R.far[0], R.far[1]];
  const spike = x => Math.max(0, H * 0.1 - Math.abs(x - tx) * 2.3);
  const sky = x => {
    const half = x < vx ? halfL : halfR, u = Math.abs(x - vx) / half;
    // Three rounded tops: the main dome, a lower cap on the left shoulder and a smaller one on the right.
    return ty + H * CONE(u) - H * 0.085 * Math.exp(-sq((x - (vx - halfL * 0.24)) / (halfL * 0.05))) - H * 0.05 * Math.exp(-sq((x - (vx + halfR * 0.18)) / (halfR * 0.04))) - spike(x) + 2 * (vnoise(x / 8, 3, 810) - 0.5) * Math.min(1, Math.abs(x - vx) / 14);
  };
  // Three icefalls where the glaciers steepen: [fan from, fan to, height from, height to].
  const FALLS = [[-0.34, -0.16, 0.44, 0.58], [-0.08, 0.04, 0.3, 0.4]];
  for (let x = Math.max(0, Math.floor(vx - halfL)); x <= Math.min(NW - 1, Math.ceil(vx + halfR)); x++) {
    const t0 = Math.round(sky(x));
    for (let y = Math.max(0, t0), yEnd = Math.min(base, groundLine(x) + 3); y < yEnd; y++) {
      const yr = y - ty, hgt = 1 - yr / H, d = y - t0;
      // Lines fan out from a point above the top, so ribs and glaciers run down the fall line.
      const fan = (x - vx) / (yr + H * 0.16), fn = fan * 5.4 + 0.2 * vnoise(x / 15, y / 15, 811) + 0.25, idx = Math.floor(fn), fr = fn - idx;
      // One rib in three climbs most of the way up as a thin cleaver; the rest stay low.
      const reach = hash(idx, 7, 814) < 0.36 ? 0.7 + 0.24 * hash(idx, 8, 814) : 0.3 + 0.2 * hash(idx, 9, 814), k = clamp((reach - hgt) / reach, 0, 1);
      const rib = k > 0 && Math.abs(fr - 0.5) < (0.022 + 0.5 * k * k * k) * (0.7 + 0.6 * vnoise(x / 6, y / 9, 820));
      // The cliff band under the top on the right, the tooth's dark faces, and the bare lower slopes.
      const cu = (fan - 0.06) / 0.26, cliff = cu > 0 && cu < 1 && hgt < 0.875 - 0.05 * cu && hgt > 0.875 - 0.05 * cu - (0.03 + 0.1 * Math.sin(Math.PI * cu)) * (0.7 + 0.6 * vnoise(x / 4, 1, 815));
      const tooth = spike(x) > 0 && d < spike(x) + 3;
      const bare = hgt < 0.17 + 0.07 * (vnoise(x / 24, 2, 816) - 0.5) && vnoise(x / 9, y / 3, 817) > 0.22;
      const side = fan < 0.05 + 0.08 * (vnoise(y / 22, 5, 812) - 0.5);
      let c;
      if (d === 0 && !tooth) c = far > 0 ? R.far[2] : R.far[1];
      else if (rib || cliff || tooth || bare) c = rock[(side ? fr < 0.5 : fr < 0.36) ? 1 : 0];
      else {
        // Each glacier is lit, with a strip of shade down the right of the rib beside it; the whole right side is dimmer.
        let v = side ? 3 : 2;
        if (fr > 0.5 && fr < 0.5 + 0.3 * k + 0.07) v -= 1;
        if (!side && fr > 0.86) v -= 1;
        if (hgt > 0.9 && fan > 0.02) v = Math.min(v, 2);
        if (FALLS.some(f => fan > f[0] && fan < f[1] && hgt > f[2] && hgt < f[3]) && y % 4 === 0 && hash(x >> 2, y, 818) < 0.34) v = 1;
        c = snow[clamp(v, 0, 3)];
      }
      // The skirts fade into the haze that lies over the foothills.
      if (hgt < 0.13 && bayer(x, y) < (0.13 - hgt) / 0.13 * 0.9) c = R.far[far > 0 ? 3 : 2];
      g[at(x, y)] = c;
    }
  }
}

// The foothills: three rows of rounded ridges under the volcano, the farthest blue with distance.
// Going east the forest on them thins to patches and gives out, and the last of them are bare
// rolling hills of yellow grass. `gold` is where that change starts and where it is complete.
function foothills(T, V, H) {
  const { g, at, NW, NH, groundLine } = T, [g0, g1] = H.gold;
  const rows = [
    { h: H.far, step: 62, seed: 830, x0: 1040, tree: [R.far[0], R.far[0], R.far[1]], grass: [R.dry[2], R.dry[3], R.dry[3]], haze: 0.34 },
    { h: H.mid, step: 48, seed: 840, x0: 1052, tree: [R.hill[0], R.hill[1], R.hill[2]], grass: [R.dry[1], R.dry[2], R.dry[3]], haze: 0 },
    { h: H.near, step: 36, seed: 850, x0: 1064, tree: [R.conifer[1], R.conifer[2], R.hill[1]], grass: [R.dry[1], R.dry[2], R.dry[3]], haze: 0 }
  ];
  for (const row of rows) {
    const hills = [];
    for (let cx = row.x0 + 20, k = 0; cx < NW + 80; k++) { const east = smooth(g0 - 60, g1, cx), w = row.step * (1.5 + 1.1 * hash(k, 1, row.seed)) * (1 + 0.5 * east); hills.push({ cx, w, h: row.h * (0.62 + 0.5 * hash(k, 2, row.seed)) * (1 + 0.12 * east) }); cx += w * (0.34 + 0.3 * hash(k, 3, row.seed)); }
    for (let x = row.x0; x < NW; x++) {
      let hh = 0, own = null;
      for (const hl of hills) { const u = Math.abs(x - hl.cx) / (hl.w / 2); if (u >= 1) continue; const v = hl.h * (0.5 + 0.5 * Math.cos(Math.PI * u)); if (v > hh) { hh = v; own = hl; } }
      // The row rises out of the ground behind the Spires rather than starting as a wall.
      hh = Math.max(hh, row.h * 0.3) * smooth(row.x0, row.x0 + 46, x);
      const gold = smooth(g0, g1, x + 40 * (vnoise(x / 60, row.seed, 831) - 0.5)), base = groundLine(x) + 2;
      // A forested ridge has a ragged top of tree crowns; a grass hill is smooth.
      const rag = (1 - gold) * (row.haze ? 0.8 : 1.2 + 1.8 * vnoise(x / 1.7, row.seed, 832));
      const t0 = Math.round(base - hh - rag);
      for (let y = Math.max(0, t0); y <= Math.min(NH - 1, base + 4); y++) {
        const d = y - t0, lit = own && x < own.cx - own.w * 0.06 ? 1 : 0;
        // Forest gives way to grass in patches: where the grass share beats a blotchy threshold it wins.
        const grassy = gold > 0.1 + 0.8 * vnoise(x / 20, y / 46, row.seed + 3);
        let c;
        if (grassy) {
          // Rolling yellow hills: lit on the west slopes, with the contour lines of fields across them.
          // Flat tones with a thin darker line every few rows, so a hill reads as smooth and striped, not as sand.
          const field = frac((d + 2.5 * Math.sin(x / 19 + row.seed)) / 7) < 0.16 ? 1 : 0, v = (lit ? 2 : 1) - field - (d > hh * 0.8 ? 1 : 0);
          c = d === 0 ? row.grass[2] : row.grass[clamp(v, 0, 2)];
          if (!row.haze && lit && !field && d > 1 && d < 4) c = R.larch[4];
        } else {
          const v = (lit ? 1.25 : 0.55) + 0.9 * (hash(x, y >> 1, row.seed + 4) - 0.5) - d / (hh + 10) * 0.5;
          c = d === 0 && row.haze ? row.tree[2] : row.tree[clamp(Math.round(v), 0, 2)];
        }
        if (row.haze && !grassy && d > 2 && bayer(x, y) < row.haze * d / (hh + 6)) c = R.far[2];
        g[at(x, y)] = c;
      }
    }
  }
}

// Called by terrain.js once the sky is in and before the west range goes on, which is drawn over it.
function paintSkyline(T) {
  const far = BK.range.filter(p => p[3] >= 3), near = BK.range.filter(p => p[3] < 3);
  far.sort((a, b) => b[3] - a[3] || a[1] - b[1]).forEach(p => farPeak(T, p, 860 + BK.range.indexOf(p)));
  volcano(T, BK.volcano);
  foothills(T, BK.volcano, BK.hills);
  near.sort((a, b) => a[1] - b[1]).forEach(p => farPeak(T, p, 860 + BK.range.indexOf(p)));
}

export { VARIANT, VERSIONS, BK, paintSkyline, through };

// ---- Sideproject Spires as one mountain ---------------------------------------------------------
// After the Cerro Torre group: one wall of granite with the six summits standing out of it as
// towers. The rock is continuous from end to end; ice is the caps on the tops, snow on ledges,
// thin couloirs under the gaps between towers, and an apron along the foot that runs out onto the
// glacier on the ground. kind: 'tower' has one summit far above the rest, 'needles' is a tight
// cluster of sharp ones, 'wall' is a long crest with six teeth.
const KINDS = {
  tower: { tip: [2, 1.5, 3.4, 1.5, 1.5, 2], share: [0.42, 0.5, 0.46, 0.58, 0.58, 0.42], flare: 1.3, apron: 24, end: 2.6 },
  needles: { tip: [1.5, 1.2, 2.4, 1.2, 1.2, 1.5], share: [0.44, 0.54, 0.56, 0.6, 0.58, 0.44], flare: 1.9, apron: 22, end: 3.2 },
  wall: { tip: [2.4, 2, 3, 2, 2, 2.4], share: [0.56, 0.7, 0.74, 0.74, 0.7, 0.56], flare: 0.8, apron: 28, end: 2.4 }
};
function makeMassifBK(M) {
  const { w, h, summits: S } = M, K = KINDS[M.kind], b = new BM(w + 2, h + 2); b.ox = (w >> 1) + 1; b.oy = h;
  // Each tower is cut in steps, not curves: how far its side stands out from its middle at every depth
  // below the tip. Near-vertical runs, a ledge now and then, and a faster spread once it has met the wall.
  const sides = S.map((s, i) => [-1, 1].map(sg => {
    const Ht = h - s.top, D = Ht * (1 - K.share[i]), steps = [0, 1, 2, 3].map(k => [Math.round(D * (0.1 + 0.22 * k + 0.16 * hash(i, k, 870 + sg))), 1 + Math.round(hash(i, k, 872 + sg) * 1.7)]);
    const taper = Math.max(0.035, (s.hw - K.tip[i] - steps.reduce((t, st) => t + st[1], 0)) / D), arr = new Float32Array(Ht + 2);
    let wd = K.tip[i] * (sg < 0 ? 1 : 0.75);
    for (let dep = 0; dep <= Ht + 1; dep++) { wd += dep <= D ? taper : 1 / K.flare; for (const st of steps) if (st[0] === dep) wd += st[1]; arr[dep] = wd; }
    return arr;
  }));
  const line = (s, i, x) => { const dx = Math.abs(x - s.cx), arr = sides[i][x < s.cx ? 0 : 1]; if (dx > arr[arr.length - 1]) return h + 9; let lo = 0, hi = arr.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] >= dx) hi = m; else lo = m + 1; } return s.top + lo; };
  const sky = x => {
    let y = 1e9, own = 0;
    S.forEach((s, i) => { const v = line(s, i, x); if (v < y) { y = v; own = i; } });
    // Gendarmes in the gaps between towers, and both ends come down to the foot as steep buttresses.
    const off = Math.abs(x - S[own].cx) / S[own].hw;
    if (off > 1) y -= 6 * Math.max(0, vnoise(x / 2.4, 3, 880) - 0.58) / 0.42;
    return [Math.max(y, h - (x + 1) * K.end, h - (w - x) * K.end), own];
  };
  const mid = w / 2 + 1, out = x => Math.abs(x - mid) < M.w * 0.15 + 5 * vnoise(x / 9, 2, 882);
  for (let x = 0; x < w; x++) {
    const [ys, own] = sky(x), t0 = Math.round(ys), s = S[own]; if (t0 >= h) continue;
    // Where the apron of ice along the foot begins, and the buttress that runs down through it under each tower.
    const apron = h - K.apron * (0.75 + 0.5 * vnoise(x / 17, 9, 883)) * smooth(0, 18, Math.min(x, w - x));
    for (let y = Math.max(0, t0); y < h; y++) {
      const d = y - t0;
      // The foot: the ice runs out onto the glacier through a ragged edge; the rock ends in a ragged line of blocks.
      if (out(x) ? y > h - 11 + 8 * vnoise(x / 3, y / 3, 884) : y > h - 1 - 6 * vnoise(x / 3.3, 5, 885) - 2 * Math.abs(Math.sin(x / 4.1))) continue;
      const lit = x < s.cx + 1.5 * Math.sin(y / 13 + own * 2) + (y - s.top) * 0.03;
      // Long vertical grain: the rock is split into ribs and grooves from top to bottom.
      const grain = vnoise(x / 2.1, y / 34, 886), crack = vnoise(x / 1.25, y / 52, 887) > 0.79;
      let v = (lit ? 0.78 : 0.3) + 0.26 * (grain - 0.5) + 0.1 * (vnoise(x / 5, y / 6, 888) - 0.5);
      if (crack) v -= lit ? 0.32 : 0.14;
      if (d < 2 && lit) v += 0.1;
      const butt = S.some((q, j) => Math.abs(x - q.cx - 3 * Math.sin(y / 10 + j * 2)) < 2.5 + (y - q.top) * 0.05 + 2 * (vnoise(x / 3, y / 5, 890 + j) - 0.5));
      // Ice: the cap on each top, snow on ledges, a couloir under each gap, the apron along the foot.
      const cap = y < s.top + 3 + K.tip[own] && Math.abs(x - s.cx) <= K.tip[own] + 1.5 && d < 3 + K.tip[own];
      const ledge = frac(y / 10 + 0.5 * vnoise(x / 12, 3, 891)) < 0.1 && vnoise(x / 4, y / 3, 892) > (lit ? 0.52 : 0.68) && d > 3;
      const couloir = Math.abs(x - s.cx) > s.hw * 1.1 && d > 4 && Math.abs(vnoise(x / 6, 7, 893) - 0.5) < 0.07 + d * 0.0014 && !butt;
      const ice = cap || (y > apron && !(butt && y < h - 9)) || couloir;
      let c;
      if (ice) {
        const deep = y - apron, cre = frac((y + 0.012 * sq(x - mid)) / 7 + 0.3 * vnoise(x / 9, y / 9, 894));
        if (!cap && deep > 6 && cre < 0.12 && vnoise(x / 8, y / 3, 895) > 0.45) c = R.glac[cre < 0.06 ? 1 : 2];
        else c = pick('glac', (cap ? 0.94 : 0.82) + (lit ? 0.12 : -0.2) + 0.18 * (vnoise(x / 4, y / 4, 896) - 0.5) - (couloir && !lit ? 0.12 : 0), x, y, 0.6);
      } else if (ledge) c = lit ? R.glac[5] : R.glac[3];
      else c = pick('granite', v, x, y, 0.7);
      b.set(x + 1, y + 1, c);
    }
  }
  outline(b, INK);
  // Where ice meets the glacier on the ground it carries no outline.
  for (let y = b.h - 14; y < b.h; y++) for (let x = 1; x < b.w - 1; x++) { const i = y * b.w + x; if (b.d[i] === INK && [b.d[i - b.w], b.d[i - 1], b.d[i + 1]].some(c => c && RAMP_OF[c] === 'glac')) b.d[i] = 0; }
  return b;
}

// ---- the granite peak in the basin ---------------------------------------------------------------
// After Prusik Peak. Each kind is a skyline of straight runs between points [across, down], both
// as shares of the sprite: 'fin' is the pointed west face with a sawtooth ridge falling away east,
// 'ridge' is a longer comb with one main tooth, 'tooth' is small and sharp.
const SKYLINES = {
  fin: [[0, 1], [0.07, 0.82], [0.14, 0.62], [0.24, 0.3], [0.31, 0.08], [0.34, 0], [0.38, 0.14], [0.43, 0.3], [0.47, 0.25], [0.52, 0.42], [0.57, 0.38], [0.63, 0.55], [0.68, 0.5], [0.75, 0.67], [0.8, 0.64], [0.88, 0.84], [0.93, 0.82], [1, 1]],
  ridge: [[0, 1], [0.05, 0.8], [0.1, 0.72], [0.15, 0.52], [0.19, 0.55], [0.25, 0.26], [0.29, 0.32], [0.345, 0], [0.39, 0.22], [0.43, 0.15], [0.48, 0.4], [0.54, 0.33], [0.6, 0.5], [0.66, 0.44], [0.72, 0.62], [0.78, 0.58], [0.85, 0.78], [0.92, 0.75], [1, 1]],
  tooth: [[0, 1], [0.1, 0.78], [0.2, 0.62], [0.33, 0.24], [0.42, 0], [0.49, 0.3], [0.55, 0.25], [0.66, 0.56], [0.73, 0.52], [0.86, 0.8], [1, 1]]
};
function makeBasinPeak(P) {
  const { w, h } = P, pts = SKYLINES[P.kind], b = new BM(w + 2, h + 2); b.ox = (w >> 1) + 1; b.oy = h;
  const top = x => { const u = x / (w - 1); for (let i = 1; i < pts.length; i++) if (u <= pts[i][0]) return h * lerp(pts[i - 1][1], pts[i][1], (u - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0])) + 1.6 * (vnoise(x / 2.4, 1, 900) - 0.5); return h; };
  // The tops along the skyline: each has a lit west side and a shaded east side.
  const tops = pts.filter((p, i) => i > 0 && i < pts.length - 1 && p[1] < pts[i - 1][1] && p[1] < pts[i + 1][1]).map(p => [p[0] * (w - 1), p[1] * h]);
  for (let x = 0; x < w; x++) {
    const t0 = Math.round(top(x)); if (t0 >= h) continue;
    let own = tops[0]; for (const t of tops) if (Math.abs(x - t[0]) + (t[1] - own[1]) * 0.25 < Math.abs(x - own[0])) own = t;
    for (let y = Math.max(0, t0); y < h; y++) {
      if (y > h - 1 - 4 * vnoise(x / 3, 4, 901) - 2 * Math.abs(Math.sin(x / 3.7))) continue;
      const d = y - t0, lit = x < own[0] + (y - own[1]) * 0.22 + 2 * Math.sin(y / 9);
      // Slabs split by long cracks that run down the face, and by ledges that slant across it.
      let v = (lit ? 0.86 : 0.3) + 0.2 * (vnoise(x / 2.6, y / 28, 902) - 0.5) + 0.1 * (vnoise(x / 6, y / 5, 903) - 0.5);
      if (vnoise(x / 1.4, y / 44, 904) > 0.8) v -= lit ? 0.3 : 0.14;
      if (frac((y + x * (lit ? 0.45 : -0.3)) / 13 + 0.3 * vnoise(x / 20, y / 20, 905)) < 0.09) v -= 0.16;
      if (d < 2 && lit) v += 0.12;
      // Talus at the foot.
      let c = y > h - 9 - 5 * vnoise(x / 5, 2, 906) && hash(x >> 1, y >> 1, 907) < 0.5 ? pick('rock', 0.3 + 0.6 * hash(x >> 1, y >> 1, 908), x, y) : pick('granite', v, x, y, 0.7);
      b.set(x + 1, y + 1, c);
    }
  }
  outline(b, INK);
  return b;
}

// ---- the larch basin ------------------------------------------------------------------------------
// Slab plates: a jittered grid of cells, wider than they are tall because the ground is seen at a slant.
function plates(x, y) {
  const gx = (x + 9 * vnoise(x / 34, y / 30, 910)) / 38, gy = (y + 5 * vnoise(x / 30, y / 26, 911)) / 16, ix = Math.floor(gx), iy = Math.floor(gy);
  let d1 = 9, d2 = 9, id = 0, lx = 0, ly = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = ix + i, cy = iy + j, px = cx + 0.16 + 0.68 * hash(cx, cy, 912), py = cy + 0.16 + 0.68 * hash(cx, cy, 913), dd = Math.hypot(gx - px, gy - py);
    if (dd < d1) { d2 = d1; d1 = dd; id = hash(cx, cy, 914); lx = gx - px; ly = gy - py; } else if (dd < d2) d2 = dd;
  }
  return { edge: d2 - d1, id, lx, ly };
}
// The basin's ground, after the Enchantments: pale granite slabs split by cracks, with dry grass
// and heather only in the seams and hollows between them, greener close to a tarn.
function basinGround(x, y, ba, n1, td) {
  const p = plates(x, y), hollow = fbm(x / 38, y / 20, 96, 3), wet = smooth(2.6, 1.2, td);
  // How wide the seam round a slab is: a hairline crack on open rock, a strip of turf in a hollow.
  const turf = smooth(BK.slab - 0.12, BK.slab + 0.1, hollow + 0.25 * wet + (1 - ba) * 0.16), seam = 0.022 + 0.5 * turf;
  if (p.edge < seam) {
    // On open rock most joins between slabs do not show at all, so the rock reads as broad sweeps with a crack here and there.
    if (turf < 0.12) return p.id < 0.3 ? R.granite[3] : pick('granite', 0.86 + 0.26 * (fbm(x / 70, y / 30, 920, 2) - 0.5) + 0.1 * n1, x, y, 0.5);
    if (hash(x >> 1, y, 98) < 0.05) return R.red[hash(x, y, 919) < 0.5 ? 0 : 1];
    if (hash(x, y, 915) < 0.04) return R.larch[3];
    return wet > 0.3 && hash(x >> 1, y >> 1, 916) < wet ? pick('grass', 0.4 + 0.3 * n1, x, y, 0.5) : pick('dry', 0.42 + 0.5 * (fbm(x / 16, y / 10, 917, 2) - 0.5) + 0.2 * n1, x, y, 0.6);
  }
  // A slab: its own tone, lighter along the edge that faces the light and darker along the other.
  const rim = smooth(seam + 0.16, seam, p.edge), v = 0.86 + 0.06 * (p.id - 0.5) + 0.26 * (fbm(x / 70, y / 30, 920, 2) - 0.5) + rim * turf * (p.lx + p.ly < 0 ? 0.1 : -0.18) + 0.1 * n1;
  return hash(x >> 1, y, 918) < 0.1 ? R.rock[4] : pick('granite', v, x, y, 0.5);
}
// Larches stand in groups on the turf, not spread evenly: a group round each of a scatter of spots,
// thick along the back of the basin, and the odd one alone on the slabs.
function plantBasin({ rand, ok, larch, slab, basinAmt }) {
  for (let k = 0; k < 24; k++) {
    const cx = 1050 + rand() * 480, cy = 474 + rand() * 200, ba = basinAmt(cx, cy), n = Math.round((3 + rand() * 6) * (cy < 500 ? 1.5 : 1)); if (rand() > ba + 0.1) continue;
    for (let j = 0; j < n; j++) { const a = rand() * 6.283, r = Math.sqrt(rand()), x = cx + Math.cos(a) * r * (16 + n), y = cy + Math.sin(a) * r * (7 + n * 0.4); if (ok(x, y, 14, 34)) larch(x, y); }
  }
  for (let k = 0; k < 34; k++) { const x = 1030 + rand() * 520, y = 472 + rand() * 230; if (rand() < basinAmt(x, y) * 0.55 && ok(x, y, 14, 34)) larch(x, y); }
  for (let k = 0; k < 40; k++) { const x = 1030 + rand() * 500, y = 480 + rand() * 210; if (rand() < basinAmt(x, y) && ok(x, y, 0, 0)) slab(x, y); }
}

export { makeMassifBK, makeBasinPeak, basinGround, plantBasin };
