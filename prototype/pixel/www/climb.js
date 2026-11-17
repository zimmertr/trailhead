// Sideproject Spires, the climbs: six short routes seen from the side, one per project, each
// with its own crux on the way up and its own thing on the summit to click. All six end the same
// way: he sits down and glissades back to camp.
import { clamp, lerp, smooth, frac, sq, rng, hash, vnoise, fbm, bayer, R, INK, pick, BM, outline, disc, thick } from './core.js';
import { Strip, drawStrip, baseline } from './side.js';
import { makeTent, makeFlag, clump, makeCloud } from './sprites.js';
import { bluebird, speck } from './fauna.js';
import { sideFig, frontFig, backFig, makeRunner } from './tj.js';
import { T as JUNCTION } from './land.js';
import { NAMES, FINDS, UI } from './content.js';

const W = 1000, OFF = 320, UP = 340, DOWN = 240, SX = 262;
// A longer route says where its summit flat starts (sx) and how wide its strip is (w).
const sxOf = cfg => cfg.sx || SX, wOf = cfg => cfg.w || W;
// Every climb shares the walk in from camp, the pause on top, the glissade and the walk out. What lies
// between is each route's own, so a route with ice on it or a storm over it takes as long as it needs.
const T_UP = 0.5, T_STAND = 0.5, T_SLIDE = 2.4, T_OUT = 0.7;

// Each route: the line of the slope from camp (0, 0) to the summit flat and off the far side,
// what kind of ground it is, and how many seconds of walking it holds. `ice` lists the walls of ice
// by the x of their foot and their top; `slip` names the wall and the move on which a foot will not stick.
const ROUTES = {
  // Bluebird Forecast, the weather window (K2, redone in round 5 for T50): drizzle and low cloud at the
  // foot. He sits it out under a boulder (`wait`: where he sits, and for how many seconds) with the
  // forecast open on his phone. The rain stops and the cloud lifts as it said, and he scrambles up dry
  // rock on hands and feet, slab after slab with a ledge between, to a clear and sunny summit.
  bluebird: { kind: 'ridge', secs: 13, sx: 600, w: 1300, dry: true, wait: [54, 7.5], pts: [[0, 0], [40, -4], [76, -10], [98, -30], [116, -32], [142, -54], [154, -57], [176, -78], [196, -80], [218, -102], [232, -104], [258, -124], [278, -127], [300, -150], [314, -152], [338, -170], [356, -173], [378, -196], [394, -198], [420, -218], [434, -221], [456, -244], [474, -246], [498, -266], [514, -269], [540, -288], [566, -294], [600, -300], [642, -300], [670, -262], [740, -160], [840, -20], [940, 120]] },
  // TJs-Kubernetes-Service, the icefall (K3): among leaning seracs, over a snow bridge, across a ladder laid
  // over a crevasse, up one tall wall of ice with tools (two shorter steps until round 5, T53), and over two
  // ladders lashed end to end. `xings` lists
  // the crevasses by the x of their two lips and what crosses each.
  tks: { kind: 'icefall', secs: 17, sx: 600, w: 1300, ice: [[336, 340]], slip: [0, 5], xings: [[96, 116, 'snow'], [196, 226, 'ladder'], [468, 532, 'lashed']], pts: [[0, 0], [40, -6], [96, -14], [116, -16], [160, -24], [196, -34], [226, -36], [270, -46], [336, -55], [340, -131], [376, -137], [420, -146], [468, -156], [532, -160], [566, -170], [600, -176], [642, -176], [668, -138], [738, -38], [838, 82]] },
  // hevy-garmin-sync, a trail run (K4, redone in round 5 for T55): in his running kit he runs the
  // switchbacks up the spire's grassy flank, his watch counting laps and heart rate, and at the bench on
  // top the watch shows the workout coming over from Hevy. `zig` is the trail, corner by corner: it lies on
  // the face under the skyline (`pts`), and he turns round at each corner. `beep` is how long he looks at
  // his watch on top.
  'hevy-garmin-sync': { kind: 'run', secs: 15, sx: 520, w: 1200, beep: 2.6, zig: [[0, 0], [560, -50], [264, -78], [560, -112], [374, -136], [540, -166], [462, -187], [520, -220]], pts: [[0, 0], [60, -10], [130, -30], [200, -52], [260, -80], [320, -112], [380, -140], [430, -172], [480, -204], [520, -220], [562, -220], [588, -182], [658, -82], [758, 38]] },
  // trailhead, the knife-edge (K5, redrawn in round 5 for T58): over the notch (round 3's jump), up onto a
  // crest that is a thin fin of rock with hazy air under it (`knife`), astride it where it is thinnest
  // (`astride`), and on to the binoculars.
  trailhead: { kind: 'bridge', secs: 26, sx: 560, w: 1200, gap: [70, 96], knife: [150, 530], astride: [300, 420], pts: [[0, 0], [40, -14], [70, -30], [96, -34], [150, -80], [220, -96], [300, -104], [420, -116], [480, -128], [530, -140], [560, -150], [602, -150], [628, -112], [698, -12], [798, 108]] },
  // yggdrasil, the via ferrata (K6): dry rock all the way (`dry`), a steel cable from the start to `cable`,
  // anchored every `anchor` of the way; iron rungs up the first wall and a fixed ladder up the second
  // (`walls`), then unclipped over bare rock to the world tree.
  yggdrasil: { kind: 'ladder', secs: 15, sx: 470, w: 1200, dry: true, cable: 430, anchor: 116, walls: [[200, 206, 'rungs'], [320, 326, 'ladder']], pts: [[0, 0], [50, -10], [120, -24], [200, -40], [206, -150], [260, -160], [320, -170], [326, -232], [380, -246], [430, -262], [470, -270], [512, -270], [538, -232], [608, -132], [708, -12]] },
  // Kubernetes-Manifests, the crevasse maze (K7): the storm comes in by stages over a broken glacier; in the
  // whiteout he follows the wands to a crevasse with no way over (`dead`: where he stops, the wand he goes
  // back to, and where the line picks up beyond it), jumps a narrow one, crosses a sagging snow bridge, and
  // comes out as the storm lets go near the cairn.
  'kubernetes-manifests': { kind: 'wands', secs: 23, sx: 520, w: 1200, dead: [196, 172, 240], sea: [-110, 340, 420], xings: [[200, 232, 'open'], [288, 300, 'jump'], [350, 380, 'sag']], pts: [[0, 0], [60, -14], [120, -34], [200, -58], [232, -62], [290, -80], [298, -82], [350, -100], [380, -104], [440, -124], [520, -140], [562, -140], [588, -104], [658, -4], [758, 116]] }
};
// How slowly each kind of crossing is taken, as a multiple of the walking pace.
const SLOW = { snow: 2.2, ladder: 3, lashed: 3.4, sag: 3.2, jump: 1, open: 1 };
const xingAt = (cfg, x, pad = 0) => (cfg.xings || []).find(g => x > g[0] - pad && x < g[1] + pad);
// How far a crossing sags at x when he stands on it at mx: a little under its own weight, and more under
// him, most where he stands (a beam with one load on it). Snow bridges arch up a little instead.
const SAG = { snow: [-1.5, 2], ladder: [0, 2], lashed: [1, 4.5], sag: [0.5, 4.5], jump: [0, 0], open: [0, 0] };
function sagAt(g, x, mx) {
  const [g0, g1, k] = g, u = clamp((x - g0) / (g1 - g0), 0, 1), [own, load] = SAG[k];
  let s = own * Math.sin(u * Math.PI);
  if (mx > g0 - 3 && mx < g1 + 3) { const m = clamp((mx - g0) / (g1 - g0), 0.02, 0.98); s += load * Math.sin(m * Math.PI) * (u < m ? u / m : (1 - u) / (1 - m)); }
  return s;
}
// How much of the knife-edge there is at x: none off it, all of it along it.
const knifeK = (cfg, x) => cfg.knife ? smooth(cfg.knife[0] - 30, cfg.knife[0] + 20, x) * (1 - smooth(cfg.knife[1] - 20, cfg.knife[1] + 30, x)) : 0;
const wallAt = (cfg, x) => (cfg.walls || []).find(w => x > w[0] - 0.5 && x < w[1] + 0.5);
const hOf = (pts, x) => { if (x <= 0) return 0; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return lerp(y0, y1, (x - x0) / (x1 - x0)); } return pts[pts.length - 1][1]; };

// One column of a crevasse seen from the side, cut into the ground already painted there: a slot whose
// walls close in quickly at first and then slowly, each wall ragged in its own way, and inside it the far wall of ice going from pale blue at the
// top to black where the slot closes. A lip of snow overhangs the top.
function crevasse(S, sx, x, y0, [g0, g1], seed) {
  const e = Math.min(x - g0, g1 - x), half = (g1 - g0) / 2;
  for (let y = y0; y < DOWN; y++) {
    const d = y - y0, side = x > (g0 + g1) / 2 ? 1 : 0, edge = 1 + 0.75 * half * (1 - Math.exp(-d / 60)) + 4 * (vnoise(y / 9, side * 5, seed + 1) - 0.5) + 2 * (vnoise(y / 2.5, side * 5 + 2, seed + 3) - 0.5) + (d < 3 ? 2 - d / 1.5 : 0);
    if (e < edge - 1) continue;
    if (e < edge) { S.set(sx, y, d < 2 ? R.snow[2] : R.glac[1]); continue; }
    const v = 0.22 + d / 60 + 0.2 * (vnoise(sx / 3, y / 9, seed + 2) - 0.5) + (x - g0 > g1 - x ? 0.08 : 0);
    S.set(sx, y, v > 0.95 + 0.3 * bayer(sx, y) ? INK : pick('glac', 0.66 - v * 0.7, sx, y, 0.7));
  }
}

// Rock, broken by slanting cracks and by ledges that hold a little snow unless it is `dry`.
function crag(x, y, sx, seed, base, dry) {
  const crack = Math.abs(frac((x + y * 0.55) / 27 + 0.9 * vnoise(x / 23, y / 17, seed + 47)) - 0.5) < 0.03 && vnoise(x / 8, y / 8, seed + 50) > 0.35;
  const ledge = frac(y / 15 + 0.9 * vnoise(x / 21, y / 30, seed + 48)), on = vnoise(x / 10, y / 14, seed + 51) > 0.5;
  if (crack) return R.granite[0];
  if (!on) return pick('granite', base + 0.28 * (fbm(x / 10, y / 7, seed + 42, 2) - 0.5), sx, y, 0.8);
  if (ledge < 0.07) return !dry && vnoise(x / 5, y, seed + 49) > 0.45 ? R.snow[3] : R.granite[3];
  if (ledge < 0.14) return R.granite[1];
  return pick('granite', base + 0.28 * (fbm(x / 10, y / 7, seed + 42, 2) - 0.5) - ledge * 0.12, sx, y, 0.8);
}
// The boulder he sits the rain out under (round 5, T50): a block the size of a small hut that leans out
// over the slope on its uphill side, so the ground under its prow stays dry. `roofAt` is the underside
// of the prow at x (the rain stops there), or null where there is none.
const roofAt = (cfg, x) => { const at = cfg.wait[0]; return x < at - 10 || x > at + 18 ? null : hOf(cfg.pts, at - 10) - 11 - (x - at + 10) * 1.3; };
function shelter(S, cfg, seed) {
  const at = cfg.wait[0], pts = cfg.pts, x0 = at - 82, x1 = at + 18, g0 = hOf(pts, x0);
  for (let x = x0; x <= x1; x++) {
    const u = (x - x0) / (x1 - x0), roof = roofAt(cfg, x);
    // A round shoulder on its downhill side, a top that tilts up toward the prow, and a blunt nose.
    const top = Math.round(g0 - (44 + 20 * u) * Math.sqrt(1 - sq(1 - Math.min(1, u / 0.24))) + 6 * sq(smooth(0.9, 1, u)) + 2.5 * vnoise(x / 7, 3, seed + 95));
    const under = roof == null ? Math.round(hOf(pts, x)) + 3 : Math.round(roof + 1.5 * vnoise(x / 4, 5, seed + 97));
    for (let y = top; y <= under; y++) {
      const d = y - top, e = under - y;
      S.set(x + OFF, y, d === 0 || x === x1 || x === x0 || (roof != null && e === 0) ? INK : roof != null && e < 6 ? R.granite[e < 3 ? 0 : 1] : d < 2 ? R.granite[4] : crag(x, y, x + OFF, seed + 131, 0.78 - 0.5 * d / (under - top + 1), true));
    }
  }
}

// The spire's sunny flank, where the trail run goes (round 5, T55): a high fellfield. Dull turf, paler on
// the swells and deeper in the hollows, broken by slabs of granite that take over toward the top, with
// old snow lying in the hollows up there and a few flowers lower down.
function turf(x, y, sx, d, seed) {
  if (d < 1) return R.grass[3]; if (d < 3) return R.grass[2];
  const rib = fbm((x + y * 0.9) / 64, (y - x * 0.22) / 15, seed + 86, 3) - 0.0017 * y;
  if (y < -120 && rib > 0.8 && fbm(x / 30, y / 9, seed + 93, 2) > 0.56) return pick('snow', 0.8 + 0.3 * (vnoise(x / 9, y / 4, seed + 94) - 0.5), sx, y, 0.5);
  if (rib > 0.64) return crag(x, y, sx, seed + 87, 0.42 + (rib - 0.64) * 1.2, true);
  if (rib > 0.615) return R.grass[0];
  if (y > -150 && hash(x, y, seed + 90) > 0.9965) return [R.white[1], R.yellow[1], R.white[1], R.blaze[2]][(x + y) & 3];
  const v = 0.3 + 0.3 * (fbm(x / 44, y / 13, seed + 88, 2) - 0.5) + 0.14 * (vnoise(sx / 5, y / 3, seed + 89) - 0.5) - d * 0.0005;
  // Dry, straw-coloured grass on the swells.
  return v > 0.4 && vnoise(x / 26, y / 7, seed + 95) > 0.6 ? pick('dirt', 0.62 + (v - 0.4), sx, y, 0.6) : pick('grass', v, sx, y, 0.6);
}
// The trail: a tread of beaten dirt four pixels deep, cut into the slope, with the bank's shadow along its
// uphill side, a worn patch at each corner and a stone here and there on its edge.
function switchbacks(S, cfg, seed) {
  const z = cfg.zig;
  for (let i = 1; i < z.length; i++) {
    const [x0, y0] = z[i - 1], [x1, y1] = z[i], n = Math.abs(x1 - x0);
    for (let k = 0; k <= n; k++) {
      const x = Math.round(lerp(x0, x1, k / n)), y = Math.round(lerp(y0, y1, k / n)), sx = x + OFF;
      S.set(sx, y - 2, R.grass[0]); S.set(sx, y - 1, R.dirt[1]);
      for (let j = 0; j < 3; j++) S.set(sx, y + j, vnoise(x / 3, j + i * 7, seed + 91) > 0.62 ? R.dirt[2] : R.dirt[3]);
      S.set(sx, y + 3, R.dirt[1]);
      if (hash(x, i, seed + 92) > 0.94) { S.set(sx, y + 3, R.rock[3]); S.set(sx + 1, y + 3, R.rock[2]); }
    }
    if (i < z.length - 1) for (let dy = -3; dy <= 4; dy++) for (let dx = -5; dx <= 5; dx++) if (sq(dx / 5.5) + sq((dy - 0.5) / 3.8) <= 1) S.set(x1 + dx + OFF, y1 + dy, dy === -3 ? R.dirt[1] : R.dirt[dy > 2 ? 2 : 3]);
  }
}

// The air under the knife-edge: pale haze, and far down in it the fainter shapes of two other ridges.
function hazeAt(x, y, sx, seed) {
  const r1 = -34 + 44 * fbm(x / 120, 3, seed + 64, 3), r2 = 22 + 50 * fbm(x / 90, 5, seed + 65, 3);
  return pick('sky', 0.86 - (y > r2 ? 0.26 : y > r1 ? 0.12 : 0) - 0.0006 * Math.max(0, y - r2), sx, y, 0.5);
}
// How far a block of the knife-edge's crest stands above the line he goes along: nothing, or a pixel or two.
const toothAt = (cfg, x, seed) => knifeK(cfg, x) > 0.6 && hash(Math.floor(x / 5), 3, seed + 66) > 0.66 ? 1 + Math.round(hash(Math.floor(x / 5), 4, seed + 66)) : 0;

function paint(cfg, seed) {
  const SW = wOf(cfg), S = new Strip(SW, UP, DOWN), { pts, kind, gap } = cfg, tops = new Int16Array(SW);
  for (let sx = 0; sx < SW; sx++) {
    const x = sx - OFF, inGap = gap && x > gap[0] && x < gap[1], xg = xingAt(cfg, x);
    const y0 = Math.round(hOf(pts, x) + (x > 0 && x < sxOf(cfg) ? 1.5 * (vnoise(x / 7, 1, seed) - 0.5) : 0)), slope = hOf(pts, x + 3) - hOf(pts, x - 3);
    const far = slope > 2;
    tops[sx] = y0;
    // Snow darkens with depth under the surface. Beside a wall of ice the surface steps up by the wall's
    // height at once, which left a straight seam down the snow below it, so there the depth is measured
    // from the surface averaged over 48 px to either side.
    let soft = y0; if (cfg.ice) { soft = 0; for (let k = -48; k <= 48; k += 4) soft += hOf(pts, x + k) / 25; }
    // How deep the rock goes under the knife-edge. At each end it sweeps down over 120 px, as a buttress
    // does, to the full depth of the mountain beside it.
    const kn = knifeK(cfg, x), kw = cfg.knife ? smooth(cfg.knife[0] - 30, cfg.knife[0] + 90, x) * (1 - smooth(cfg.knife[1] - 90, cfg.knife[1] + 30, x)) : 0;
    const kd = kw > 0 ? Math.round(lerp(DOWN, 34 + 22 * vnoise(x / 18, 7, seed + 61) + 10 * vnoise(x / 3, 8, seed + 62), 1 - sq(1 - kw))) : 1e9;
    for (let y = inGap ? y0 + 6 : y0; y < DOWN; y++) {
      const d = y - y0; let c;
      // The knife-edge is a thin fin: its face fades into the haze of the air under it.
      if (d > kd || (kw > 0 && d > kd - 30 && bayer(sx, y) > (kd - d) / 30)) { S.set(sx, y, hazeAt(x, y, sx, seed)); continue; }
      if (inGap && d < 80) { const e = Math.min(x - gap[0], gap[1] - x); if (e > 3 + d * 0.06 + 2 * vnoise(y / 5, x, seed + 1)) continue; c = pick('glac', 0.42 - d * 0.006 + (x - gap[0] < 6 ? 0.2 : -0.1), sx, y); }
      else if (far && d > 3 + 5 * vnoise(sx / 5, y / 9, seed + 5) && vnoise(sx / 7, y / 26, seed + 10) > 0.3) c = Math.abs(frac(sx / 9 + vnoise(sx / 30, y / 30, seed + 11)) - 0.5) < 0.05 ? R.granite[0] : pick('granite', 0.34 + 0.3 * (vnoise(sx / 2.4, y / 14, seed + 6) - 0.5) - d * 0.0015, sx, y, 0.8);
      else if (!far && d > 9 && kind !== 'wands' && fbm((sx + y * 1.6) / 46, (y - sx * 0.25) / 9, seed + 5, 3) > 0.63) c = pick('granite', 0.62 - 0.5 * frac((y - sx * 0.25) / 9) + 0.2 * (vnoise(sx / 3, y / 3, seed + 6) - 0.5), sx, y, 0.8);
      else c = d < 1 ? R.snow[far ? 3 : 4] : far ? pick('glac', 0.72 - d * 0.004 + 0.12 * (vnoise(sx / 9, y / 4, seed + 7) - 0.5), sx, y, 0.6) : (Math.abs(frac((y + sx * 0.3) / 13 + 0.4 * vnoise(sx / 20, y / 20, seed + 8)) - 0.5) < 0.03 && d > 4 ? R.snow[2] : pick('snow', 0.86 + Math.max(-3, slope) * 0.02 - Math.max(0, y - soft) * 0.002 + 0.14 * (vnoise(sx / 8, y / 5, seed + 9) - 0.5), sx, y, 0.5));
      // Dry rock: big slabs paler and darker by turns, lit along the top, with lichen here and there.
      if (cfg.dry) c = d < 1 ? R.granite[3] : d < 2 ? R.granite[2] : vnoise(x / 2.2, y / 2.2, seed + 82) > 0.86 && vnoise(x / 20, y / 20, seed + 83) > 0.55 ? R.ochre[1] : crag(x, y, sx, seed + 80, 0.32 + 0.4 * fbm(x / 46, y / 30, seed + 81, 2) + (d < 10 ? 0.12 : 0), true);
      if (cfg.zig) c = turf(x, y, sx, d, seed);
      // Its face is fluted: ribs that catch the light and dark runnels between them, straight down.
      if (kn > 0.3 && d >= 2) { const fl = vnoise(x / 3.2 + 0.6 * vnoise(y / 24, x / 9, seed + 71), y / 70, seed + 72); c = d < 3 && vnoise(x / 4, 9, seed + 63) > 0.5 ? R.snow[3] : fl > 0.74 ? R.granite[4] : fl < 0.24 ? R.granite[0] : pick('granite', 0.56 + 0.4 * (fl - 0.5) - 0.2 * d / kd, sx, y, 0.8); }
      S.set(sx, y, c);
    }
    if (!inGap) S.set(sx, y0 - 1, INK);
    // Along the knife-edge the crest is broken into small blocks.
    if (kn > 0.6) { const t = toothAt(cfg, x, seed), side = Math.min(toothAt(cfg, x - 1, seed), toothAt(cfg, x + 1, seed)); for (let j = 1; j <= t; j++) S.set(sx, y0 - j, j > side ? INK : R.granite[j === t ? 3 : 2]); if (t) S.set(sx, y0 - 1 - t, INK); }
    if (xg) crevasse(S, sx, x, y0, xg, seed);
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
  // On the long ridge, rocks stand out of the snow crest, and rime has grown on their windward side (the
  // wind comes from the right): white feathers pointing into it. Their tips are kept to glitter later.
  if (kind === 'ridge' && cfg.brk) {
    S.rime = [];
    const rr = rng(seed + 30);
    for (let x = 50; x < cfg.sx - 30; x += 40 + rr() * 60) {
      const hw = 4 + rr() * 6, h = 7 + rr() * 9, y0 = Math.round(hOf(pts, x));
      for (let dx = -hw; dx <= hw; dx++) {
        const top = Math.round(y0 - h * Math.sqrt(1 - sq(dx / (hw + 0.5))) - rr()), sx = Math.round(x + dx + OFF);
        for (let y = top; y <= y0 + 1; y++) S.set(sx, y, y === top ? R.granite[0] : pick('granite', 0.55 - dx / hw * 0.2 - (y - top) * 0.03, sx, y, 0.8));
      }
      for (let y = Math.round(y0 - h); y <= y0; y++) {
        const edge = Math.round(x + hw * Math.sqrt(Math.max(0, 1 - sq((y0 - y - h / 2) / (h / 2 + 0.5)))) + OFF), len = 2 + Math.round(hash(x, y, seed + 31) * 5);
        for (let k = 0; k < len; k++) { const fy = y - (k > 2 ? 1 : 0); S.set(edge + k, fy, k === len - 1 ? R.white[1] : k ? R.snow[3] : R.snow[2]); if (k < len - 1 && (y + k) % 2) S.set(edge + k, fy + 1, R.snow[1]); }
        S.rime.push([edge + len - 1 - OFF, y - (len > 3 ? 1 : 0)]);
      }
    }
  }
  if (cfg.wait) shelter(S, cfg, seed);
  if (cfg.zig) switchbacks(S, cfg, seed);
  // Tufts of grass in the cracks along the top of the dry rock, never on the walls.
  if (cfg.dry || cfg.zig) for (let x = 4; x < sxOf(cfg) + 40; x++) if (!wallAt(cfg, x) && !wallAt(cfg, x + 2) && hash(x, 1, seed + 84) > 0.88) { const y0 = Math.round(hOf(pts, x)) - 1; for (let k = 0; k < 3; k++) { const hgt = 1 + Math.round(hash(x, k + 2, seed + 84) * 2); for (let j = 0; j < hgt; j++) S.set(x + OFF + k - 1, y0 - j, j === hgt - 1 ? R.grass[3] : R.grass[1]); } }
  if (kind === 'ridge' && !cfg.sx) for (let x = 236; x < 300; x++) { const y0 = Math.round(hOf(pts, x)); for (let k = 0; k < 4 - Math.abs(x - 300) * 0.02; k++) S.set(x + OFF + k + 6, y0 + k + (x > 292 ? x - 292 : 0), R.snow[4]); }
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
  // The weight bench, with two uprights. `racked` puts the barbell on them, a pair of plates on each end
  // (round 5, T56): without it the bench was hard to tell for one. He lifts the bar off when he lies down.
  run(racked) {
    const b = new BM(34, 27); b.ox = 17; b.oy = 26;
    for (let x = 6; x < 26; x++) { b.set(x, 20, R.navy[2]); b.set(x, 21, R.navy[1]); }
    for (const x of [8, 23]) for (let y = 22; y < 27; y++) b.set(x, y, R.rock[2]);
    for (const x of [6, 25]) { for (let y = 5; y < 27; y++) b.set(x, y, R.rock[3]); b.set(x - 1, 5, R.rock[3]); b.set(x + 1, 5, R.rock[3]); b.set(x - 1, 4, R.rock[3]); }
    if (racked) barbell(b, 4);
    outline(b, INK); return b;
  },
  // A pair of coin-operated binoculars on a post, the kind bolted to a viewpoint: the eyepieces face him
  // and the lenses look out and down over the far side.
  bridge() {
    const b = new BM(24, 32); b.ox = 11; b.oy = 31;
    ell(b, 11, 29.5, 6, 1.6, (nx, ny) => R.rock[ny < 0 ? 2 : 1]);
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
// A barbell seen along the bench, at height y: the bar, and on each end a big plate with a small one outside it.
function barbell(b, y) {
  for (let x = 1; x < 33; x++) b.set(x, y, R.rock[4]);
  for (const [x, h, c] of [[3, 4, R.navy[0]], [4, 4, R.navy[1]], [2, 2, R.red[1]], [29, 4, R.navy[0]], [28, 4, R.navy[1]], [30, 2, R.red[1]]]) for (let j = -h; j <= h; j++) b.set(x, y + j, c);
}

// A serac: a tower of glacier ice broken into blocks that lean on one another. Each block is a slab
// with a tilted top, lit on its left face and blue in shadow on its right, split from the next by a dark
// fracture, and wherever a block is wider than the one above it snow has settled on the step.
function makeSerac(seed, w, h, tip) {
  const rand = rng(seed), b = new BM(w + 44 + Math.round(Math.abs(tip || 0) * h), h + 6), cx = (b.w) >> 1; b.ox = cx; b.oy = h + 5;
  const lean = tip != null ? tip : (rand() - 0.5) * 0.5, n = 2 + Math.floor(h / 28), blocks = [];
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
// What crosses a crevasse, drawn each frame because it sags under him. A snow bridge is a thick arch of
// snow, blue ice underneath with drips hanging off it, throwing the slot below it into shadow. A ladder seen side-on is its two rails as one, light aluminium, with the rung ends
// showing between, resting on both lips, with a hand line on stakes either side. Two ladders lashed end to
// end overlap in the middle, bound with orange cord, and sag more.
function crossing(scr, X, Y, g, y0, y1, mx) {
  if (g[2] === 'jump' || g[2] === 'open') return;
  const [g0, g1, k] = g, at = x => lerp(y0, y1, clamp((x - g0) / (g1 - g0), 0, 1)) + sagAt(g, x, mx);
  if (k === 'snow' || k === 'sag') {
    for (let x = g0 - 2; x <= g1 + 2; x++) {
      const y = at(x), u = clamp((x - g0) / (g1 - g0), 0, 1), th = 4 + Math.round(6 * sq(2 * u - 1)), drip = hash(x, 1, 296) > 0.7 ? 1 + Math.floor(hash(x, 2, 296) * 3) : 0;
      for (let j = 0; j < th; j++) scr.set(X(x), Y(y + j), j === 0 ? R.snow[4] : j >= th - 2 ? R.glac[j === th - 1 ? 1 : 2] : j > th - 4 ? R.glac[4] : R.snow[3]);
      for (let j = 0; j < drip; j++) scr.set(X(x), Y(y + th + j), R.glac[j === drip - 1 ? 4 : 2]);
      if (x > g0 && x < g1) for (let j = drip; j < 14; j++) if (j < 3 || bayer(X(x), Y(y + th + j)) < 1 - j * 0.06) scr.set(X(x), Y(y + th + j), j < 6 ? R.glac[0] : R.glac[1]);
    }
    return;
  }
  const mid = (g0 + g1) / 2;
  for (let x = g0 - 5; x <= g1 + 5; x++) {
    const y = Math.round(at(x)), r = (x - g0 + 5) % 4 === 0, lap = k === 'lashed' && Math.abs(x - mid) < 4;
    scr.set(X(x), Y(y), R.white[1]); scr.set(X(x), Y(y + 1), r ? R.rock[2] : lap ? R.rock[3] : R.snow[1]); scr.set(X(x), Y(y + 2), R.rock[2]); if (r) scr.set(X(x), Y(y + 3), R.rock[1]);
    if (lap) { scr.set(X(x), Y(y - 1), R.rock[4]); if ((x & 1) === 0) { scr.set(X(x), Y(y), R.blaze[1]); scr.set(X(x), Y(y + 2), R.blaze[0]); scr.set(X(x), Y(y + 3), R.blaze[1]); } }
  }
  // The hand lines, from a stake at each end, slack, pulled down a little where he holds them.
  const a = g0 - 8, b = g1 + 8, ya = y0, yb = y1;
  for (const [sx, sy] of [[a, ya], [b, yb]]) { for (let j = 1; j < 11; j++) scr.set(X(sx), Y(sy - j), j > 8 ? R.blaze[1] : R.rock[2]); scr.set(X(sx) + 1, Y(sy - 1), R.rock[3]); }
  for (let x = a + 1; x < b; x++) { const u = (x - a) / (b - a), y = lerp(ya, yb, u) - 9 + 3 * Math.sin(u * Math.PI) + sagAt(g, x, mx) * 0.7; scr.set(X(x), Y(y), R.blaze[0]); }
}
// The via ferrata. The cable's line at arc s: a hand's height above the ledges, and up the walls on the
// face beside the rungs and the ladder.
function cableAt(cfg, pts, a, xAt, s) {
  const x = xAt(a, s), w = wallAt(cfg, x);
  return w ? [w[0] - 1, hOf(pts, x) - 6] : [x, hOf(pts, x) - 11];
}
// The iron on the rock: rungs (staples sticking out of the first wall), a fixed ladder against the second,
// the steel cable sagging a little between its anchors, and the anchors themselves.
function ferrata(scr, X, Y, cfg, pts, pl, a, xAt, arcAt) {
  for (const [w0, w1, k] of cfg.walls) {
    const top = hOf(pts, w1), bot = hOf(pts, w0 - 1);
    if (k === 'rungs') for (let y = bot - 5; y > top + 2; y -= 6) { for (let i = 1; i <= 4; i++) { scr.set(X(w0 - i), Y(y), R.rock[4]); scr.set(X(w0 - i), Y(y) + 1, R.rock[1]); } scr.set(X(w0 - 4), Y(y) - 1, R.rock[4]); }
    else { for (let y = bot; y > top - 6; y--) { const lean = Math.round((bot - y) / (bot - top + 6) * 2); scr.set(X(w0 - 6 + lean), Y(y), R.rock[3]); scr.set(X(w0 - 2 + lean), Y(y), R.rock[2]); if (Math.round(bot - y) % 4 === 2) for (let i = -5; i <= -3; i++) scr.set(X(w0 + i + lean), Y(y), R.rock[4]); } }
  }
  const end = arcAt(a, cfg.cable);
  for (let s = 6; s < end; s += 0.5) {
    const [x, y] = cableAt(cfg, pts, a, xAt, s), prev = pl.anchors.filter(v => v <= s).pop() || 6, next = pl.anchors.find(v => v > s) || end, sag = wallAt(cfg, xAt(a, s)) ? 0 : 2.5 * Math.sin(Math.PI * (s - prev) / Math.max(1, next - prev));
    scr.set(X(x), Y(y + sag), R.rock[3]);
  }
  for (const s of [6, ...pl.anchors]) { const [x, y] = cableAt(cfg, pts, a, xAt, s); scr.set(X(x), Y(y), R.rock[1]); scr.set(X(x), Y(y) + 1, R.rock[1]); scr.set(X(x) + 1, Y(y), R.rock[4]); }
}
// His two lanyards, orange and teal, from his harness to where each is clipped to the cable. At each
// anchor the orange one comes off first, goes past in his hand and clips on beyond it, then the teal one,
// so he is never off the cable. Past its end he is unclipped and they hang at his harness.
function lanyards(scr, X, Y, cfg, pts, pl, a, xAt, arcAt, tau, hx, hy, me) {
  const sMe = arcAt(a, me.x), hip = [hx, hy - 8], hand = [hx + 6, hy - 22], n = pl.clips.length;
  [['a', R.blaze[1]], ['b', R.teal[2]]].forEach(([k, col], j) => {
    const passed = pl.clips.filter(c => c[k] <= tau).length, moving = pl.clips.find(c => tau > (k === 'a' ? c.t0 : c.mid) && tau < c[k]);
    let p;
    if (passed >= n) p = [hip[0] + 1 + j, hip[1] + 5];
    else if (moving) p = hand;
    else { const lo = passed ? pl.clips[passed - 1].s + 2 + j : 6, hi = pl.clips[passed].s - 1 - j, [x, y] = cableAt(cfg, pts, a, xAt, clamp(sMe - 9 - j * 5, lo, Math.max(lo, hi))); p = [X(x), Y(y)]; }
    const d = Math.hypot(p[0] - hip[0], p[1] - hip[1]), sl = Math.max(0, 8 - d * 0.3);
    for (let i = 0; i <= 12; i++) { const u = i / 12; scr.set(Math.round(lerp(hip[0], p[0], u)), Math.round(lerp(hip[1], p[1], u) + sl * Math.sin(u * Math.PI)), col); }
    scr.set(Math.round(p[0]), Math.round(p[1]) - 1, R.yellow[1]); scr.set(Math.round(p[0]) + 1, Math.round(p[1]) - 1, R.yellow[1]);
  });
}
// The whiteout closing over everything, dithered in by a.
function whiteOut(scr, a) {
  const { VW, VH, fb } = scr;
  if (a <= 0) return;
  for (let y = 0; y < VH; y++) { const row = y * VW; for (let x = 0; x < VW; x++) if (bayer(x, y) < a * 1.15) fb[row + x] = (x + y) & 1 ? R.snow[4] : R.snow[3]; }
}
// His breath in the cold: puffs from his mouth drifting up and forward and thinning out, faster and
// bigger the harder he is breathing.
function breath(scr, x, y, t, hard) {
  for (let i = 0; i < 3; i++) {
    const a = frac(t * 0.9 * hard + i / 3), px = x + a * 11, py = y - a * 6, r = 0.8 + a * 1.4 * hard;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const q = dx * dx + dy * dy; if (q <= r * r && bayer(Math.round(px + dx), Math.round(py + dy)) > a * 0.85) scr.set(Math.round(px + dx), Math.round(py + dy), q > (r - 1) * (r - 1) && r > 1.5 ? R.snow[2] : R.white[1]); }
  }
}
// Rime on a figure: on most rows the pixel just inside its right edge (the windward side when he walks
// right) turns white, and now and then one more beside it; the top of his hat goes white too.
function rimeOn(bm) {
  const b = new BM(bm.w, bm.h); b.ox = bm.ox; b.oy = bm.oy; b.d.set(bm.d);
  let top = 0; while (top < b.h && !b.d.subarray(top * b.w, top * b.w + b.w).some(v => v && v !== INK)) top++;
  for (let x = 0; x < b.w; x++) { const i = (top + 1) * b.w + x; if (top + 1 < b.h && b.d[i] && b.d[i] !== INK && hash(x, 3, 294) < 0.7) b.d[i] = R.white[1]; }
  for (let y = 0; y < b.h; y++) { if (hash(y, 1, 294) > 0.75) continue; let x = b.w - 1; while (x > 0 && !b.d[y * b.w + x]) x--; if (x > 1) { b.d[y * b.w + x - 1] = R.white[1]; if (hash(y, 2, 294) < 0.3 && b.d[y * b.w + x - 2] !== INK) b.d[y * b.w + x - 2] = R.snow[4]; } }
  return b;
}
// The sun seen through thin cloud: a pale disc, dithered in by a.
function paleSun(scr, cx, cy, r, a) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = Math.hypot(x, y) / r; if (d <= 1 && bayer(cx + x, cy + y) < a * (1.2 - d * 0.4)) scr.set(cx + x, cy + y, d < 0.75 ? R.white[1] : R.snow[4]); }
}
// The top of a sea of cloud seen from just above it (round 5, T62): billows along its edge, soft shading in
// its body, laid over everything below y0 and dithered in by a. While he is still inside it (in < 1), its
// top dips to the snow around him at sx, so the ground he stands on shows; `surf` gives the slope's height
// on screen. With `band` it is the same sea farther off, toward the horizon: flatter, paler, and only
// that many pixels deep, because the near sea covers the rest.
function inversion(scr, y0, camX, t, a, band, sx, bowl, surf) {
  const { VW, VH, fb } = scr, tone = band ? [R.sky[4], R.snow[3], R.snow[4]] : [R.snow[2], R.snow[3], R.snow[4]];
  for (let x = 0; x < VW; x++) {
    const wx = x + camX * (band ? 0.2 : 0.5);
    let top = y0 - 3 - (band ? 2 : 4) * fbm(wx / (band ? 52 : 34), t * 0.02, 290, 2) - (band ? 1 : 2) * Math.sin(wx / (band ? 19 : 11) + t * 0.3);
    if (bowl > 0) { const w = bowl * (1 - smooth(46, 130, Math.abs(x - sx))); if (w > 0) { const g = surf(x) + 5; if (g > top) top += (g - top) * w; } }
    top = Math.round(top);
    for (let y = Math.max(0, top), end = band ? Math.min(VH, top + band) : VH; y < end; y++) {
      if (a < 1 && bayer(x, y) >= a) continue;
      const d = y - top, v = vnoise((wx + t * 3) / 24, d / 5, 291);
      fb[y * VW + x] = d < 1 ? tone[2] : d < 3 ? (v > 0.45 ? tone[2] : tone[1]) : v > 0.6 ? tone[2] : v > 0.32 ? tone[1] : tone[0];
    }
  }
}

// The word in the burst over the rack, five pixels wide and seven tall, a row of bits per line.
const GLYPH = { A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30], E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [15, 16, 16, 23, 17, 17, 14], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31], M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 25, 21, 19, 19, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4], U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 27, 17], X: [17, 17, 10, 4, 10, 17, 17], Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [30, 1, 1, 14, 1, 1, 30], 4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14], 6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8], 8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12], '!': [4, 4, 4, 4, 4, 0, 4], ':': [0, 4, 4, 0, 4, 4, 0], '.': [0, 0, 0, 0, 0, 12, 12], '-': [0, 0, 0, 31, 0, 0, 0] };
// A word drawn in pixels, capitals only: each letter 5 wide and 7 high, a pixel between them.
// k is the size of a dot: 2 writes it twice as large.
function letters(scr, word, x, y, c, k = 1) { [...word].forEach((ch, i) => (GLYPH[ch] || []).forEach((bits, j) => { for (let b = 0; b < 5; b++) if (bits & (16 >> b)) for (let v = 0; v < k * k; v++) scr.set(x + (i * 6 + b) * k + v % k, y + j * k + Math.floor(v / k), c); })); }

// His phone, held up large enough to read (round 5, T50): the Bluebird Forecast app in its own dark
// slate and sky blue. Its mark and name, the weather drawn large, the time slider with its play button,
// and one word under it. u runs from 0 to 1 over the time he looks at it: rain at first, then (at
// `turn`) the slider runs forward, the cloud moves off the sun, and the word changes.
const PHONE = { w: 72, h: 100, turn: 0.6 };
// His watch, shown large in the corner of the picture while he runs hevy-garmin-sync (round 5, T55): a
// round sports watch with a dark face. Running, it shows the lap, the time and his heart rate, with a
// ring round the face filling as he climbs. At the bench it shows two arrows turning, then a tick and
// the words that say what the project does. w: { lap, secs, bpm, prog, sync } (sync below 0 while he runs).
const WATCH = { r: 42, strap: 9 };
function watchFace(scr, x, y, w, t) {
  const { r, strap } = WATCH, cx = x + r, cy = y + strap + r;
  for (let j = 0; j < strap + 8; j++) for (let i = -15; i <= 15; i++) { const c = Math.abs(i) === 15 || j === 0 ? INK : j % 5 === 3 ? R.rock[0] : R.rock[1]; scr.set(cx + i, y + j, c); scr.set(cx + i, y + 2 * (strap + r) - j, c); }
  for (const a of [-0.5, 0.45, 2.6, 3.14, 3.7]) for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) scr.set(Math.round(cx + Math.cos(a) * (r + 1)) + i, Math.round(cy + Math.sin(a) * (r + 1)) + j, Math.abs(i) === 2 || Math.abs(j) === 2 ? INK : R.rock[3]);
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const d = Math.hypot(i, j); if (d <= r + 0.5) scr.set(cx + i, cy + j, d > r - 1.2 ? INK : d > r - 6 ? R.rock[d > r - 3 ? 1 : 2] : d > r - 7.2 ? INK : R.navy[0]); }
  for (let k = 0; k < 260 * w.prog; k++) { const a = -Math.PI / 2 + k / 260 * Math.PI * 2; for (const q of [r - 3, r - 4]) scr.set(Math.round(cx + Math.cos(a) * q), Math.round(cy + Math.sin(a) * q), R.kit[2]); }
  const mid = (word, yy, c, k = 1) => letters(scr, word, cx - Math.round((word.length * 6 - 1) * k / 2), yy, c, k);
  if (w.sync < 0) {
    mid(UI.watch.lap + ' ' + w.lap, cy - 27, R.rock[4]);
    mid(String(Math.floor(w.secs / 60)).padStart(2, '0') + ':' + String(Math.floor(w.secs % 60)).padStart(2, '0'), cy - 12, R.white[1], 2);
    // His heart, beating at its rate, and the rate.
    const big = frac(t * w.bpm / 60) < 0.3, hx = cx - 19, hy = cy + 12;
    for (const [i, j] of [[1, 0], [2, 0], [4, 0], [5, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [2, 4], [3, 4], [4, 4], [3, 5]]) if (big || (i > 0 && i < 6 && j > 0 && j < 5)) scr.set(hx + i, hy + j, R.red[1]);
    letters(scr, String(w.bpm), cx - 8, cy + 11, R.white[1]);
    return;
  }
  const iy = cy - 23;
  if (w.sync < 0.45) {
    // Two arrows chasing each other round, large in the middle of the face.
    const rot = Math.floor(t * 9) * 0.5;
    for (const h of [0, Math.PI]) {
      for (let a = 0; a <= 2.3; a += 0.05) for (const q of [12, 13]) scr.set(Math.round(cx + Math.cos(rot + h + a) * q), Math.round(cy + Math.sin(rot + h + a) * q), R.jay[3]);
      for (let q = 8; q <= 17; q++) for (let v = 0; v <= 17 - q && v <= q - 8; v++) scr.set(Math.round(cx + Math.cos(rot + h + 2.3 + v * 0.07) * q), Math.round(cy + Math.sin(rot + h + 2.3 + v * 0.07) * q), R.jay[3]);
    }
    return;
  }
  for (let j = -8; j <= 8; j++) for (let i = -8; i <= 8; i++) if (Math.hypot(i, j) <= 8.3) scr.set(cx + i, iy + j, R.kit[1]);
  for (const [i, j] of [[-4, 0], [-3, 1], [-2, 2], [-1, 3], [0, 2], [1, 1], [2, 0], [3, -1], [4, -2]]) { scr.set(cx + i, iy + j, R.white[1]); scr.set(cx + i, iy + j + 1, R.white[1]); }
  UI.watch.synced.forEach((line, n) => mid(line, cy - 8 + n * 10, n === 2 ? R.jay[3] : R.white[1]));
}

// Under the binoculars' round view: a BACK button, and under that a line on how to look about and leave
// (the keys where there is a keyboard, a drag where there is not). k is the size of a dot. Gives the
// button's box on the screen, for taps.
function viewerUI(scr, cx, y, k) {
  const word = UI.viewer.back, w = (word.length * 6 - 1 + 12) * k, h = 13 * k, x = cx - (w >> 1);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const e = i < k || j < k || i >= w - k || j >= h - k; scr.set(x + i, y + j, e ? INK : j < 2 * k ? R.wood[3] : j >= h - 2 * k ? R.wood[1] : R.wood[2]); }
  letters(scr, word, x + 6 * k + k, y + 3 * k + k, R.wood[0], k); letters(scr, word, x + 6 * k, y + 3 * k, R.white[1], k);
  const hint = UI.viewer.hint[window.matchMedia && window.matchMedia('(hover: none)').matches ? 1 : 0];
  letters(scr, hint, cx - Math.round((hint.length * 6 - 1) * k / 2), y + h + 5 * k, R.rock[4], k);
  return [x, y, x + w, y + h];
}

// The bluebird's visit, in seconds after the station is clicked: when its circling ends, when it has
// landed, when it sings, when it takes off, and when it is surely off the picture.
const BIRD = { loop: 3.7, land: 4.6, calls: [5.1, 5.8, 6.6], off: 7.7, gone: 11 };
function phoneApp(scr, x, y, u, t) {
  const { w, h, turn } = PHONE, k = smooth(turn - 0.1, turn + 0.08, u), box = (x0, y0, x1, y1, c) => { for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) scr.set(x + i, y + j, c); };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const cx = Math.min(i, w - 1 - i), cy = Math.min(j, h - 1 - j); if (cx + cy < 3) continue; scr.set(x + i, y + j, cx === 0 || cy === 0 || cx + cy === 3 ? INK : cx < 3 || cy < 3 ? R.rock[0] : R.navy[0]); }
  // The mark: a white bird on a blue tile. Then the name, in two lines beside it.
  box(6, 6, 15, 15, R.jay[2]); box(6, 6, 15, 6, R.jay[3]);
  for (const [i, j] of [[8, 13], [9, 12], [10, 11], [11, 10], [12, 9], [13, 8], [9, 10], [10, 9], [11, 8], [12, 11], [13, 11]]) scr.set(x + i, y + j, R.white[1]);
  letters(scr, UI.forecast.app[0], x + 19, y + 5, R.white[1]); letters(scr, UI.forecast.app[1], x + 19, y + 14, R.rock[3]);
  // The weather, on its card: the sun comes out from behind the cloud as the cloud moves off and thins.
  const X0 = 6, Y0 = 26, X1 = w - 7, Y1 = 62, cx = w >> 1, cy = 45, put = (i, j, c) => { if (i >= X0 && i <= X1 && j >= Y0 && j <= Y1) scr.set(x + Math.round(i), y + Math.round(j), c); };
  box(X0, Y0, X1, Y1, R.navy[1]);
  if (k > 0.05) {
    const r = 8 * smooth(0.05, 0.7, k);
    for (let a = 0; a < 8; a++) { const ang = a * Math.PI / 4 + (Math.floor(t * 3) & 1) * 0.39; for (let d = r + 2; d < r + 5.5 * k; d++) put(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, R.yellow[1]); }
    for (let j = -8; j <= 8; j++) for (let i = -8; i <= 8; i++) { const d = Math.hypot(i, j); if (d <= r) put(cx + i, cy + j, d > r - 1.2 ? R.yellow[0] : R.yellow[1]); }
  }
  if (k < 0.97) {
    const ox = cx - 1 + 34 * k, oy = cy - 2 + 3 * k, thin = k * 1.1;
    for (const [dx, dy, rx, ry] of [[-7, 1, 6, 4.4], [0, -3, 7.5, 6], [8, 1, 6, 4.6], [0, 3, 13, 3.2]]) for (let j = -7; j <= 7; j++) for (let i = -14; i <= 14; i++) { const q = sq(i / rx) + sq(j / ry); if (q <= 1 && bayer(i + dx, j + dy) >= thin) put(ox + dx + i, oy + dy + j, q > 0.72 && j > 0 ? R.rock[3] : dy < 0 && j < -2 ? R.white[1] : R.rock[4]); }
    // Rain under it, until it turns.
    if (k < 0.5) for (let n = 0; n < 6; n++) { const fall = frac(t * 1.7 + n * 0.37) * 9; if (bayer(n, Math.floor(t * 4)) < 1 - k * 2) for (let d = 0; d < 3; d++) put(ox - 10 + n * 4 - d * 0.5 - fall * 0.3, oy + 7 + fall + d, R.jay[3]); }
  }
  // The slider: the app's play button, its track, and the knob running forward to the hour it clears.
  box(6, 68, 14, 76, R.jay[2]); for (let j = 0; j < 5; j++) for (let i = 0; i <= 2 - Math.abs(j - 2); i++) scr.set(x + 9 + i, y + 70 + j, R.white[1]);
  box(18, 72, w - 8, 72, R.navy[2]);
  { const kx = Math.round(lerp(19, w - 11, 0.08 + 0.84 * smooth(turn - 0.26, turn + 0.08, u))); box(18, 72, kx, 72, R.jay[3]); box(kx, 70, kx + 2, 74, R.white[1]); }
  // The word. It blinks once as it changes.
  const word = k < 0.5 ? UI.forecast.wet : UI.forecast.clear, flash = k > 0.5 && k < 0.999 && (Math.floor(t * 8) & 1);
  if (!flash) letters(scr, word, x + Math.round((w - word.length * 6 + 1) / 2), y + 82, k < 0.5 ? R.jay[3] : R.yellow[1]);
  box((w >> 1) - 9, h - 6, (w >> 1) + 9, h - 6, R.navy[2]);
}

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
  // Spaced at random along the way to the summit, every third one leaning hard toward the line.
  const seracs = []; { const rs = rng(699); for (let x = -26, k = 0; x < ROUTES.tks.sx - 20; x += 16 + rs() * 24, k++) { const tall = Math.round(26 + rs() * 56), lean = k % 3 === 1 ? (rs() < 0.5 ? -1 : 1) * (0.2 + rs() * 0.12) : null; seracs.push({ x, bm: makeSerac(700 + k * 7, Math.round(12 + rs() * 14), tall, lean) }); } }
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
    sit: [0, 1].map(f => sideFig('alpine', { feet: [[8, 3], [7, 4 + f]], crouch: 6, lean: -2, hands: [[2, 4], [-4, 2 - f]], held: (b, sh) => { for (let k = 0; k < 7; k++) b.set(sh[0] - 4 - k, sh[1] + 2 - f + k, R.rock[3]); } })),
    stand: frontFig('alpine'), cheer: frontFig('alpine', { swing: -9 }),
    // Rime on him too, on the side the wind comes from (his front, walking right into it).
    walkR: null, windR: null,
    hit: [sideFig('alpine', { hands: [[-3, -2], [-1, 6]], lean: 0 }), sideFig('alpine', { hands: [[7, 1], [-1, 6]], lean: 2 })],
    watch: sideFig('alpine', { lean: 0 }),
    // Upright along the knife-edge, arms out to either side for balance.
    edge: [0, 1, 2, 3, 4, 5].map(f => sideFig('alpine', { feet: [WALK[f], WALK[(f + 3) % 6]], hands: [[7, 1 + (f % 3 === 0 ? 1 : 0)], [-6, 2 - (f % 3 === 1 ? 1 : 0)]], bob: f % 3 === 1 ? -1 : 0, lean: 0, look: 'down' })),
    // Astride the crest: sat on top of it with his hips on the rock, the near leg hanging down the face in
    // front of it and the far leg out of sight behind, both hands on the crest ahead, shuffling forward.
    astride: [0, 1].map(f => sideFig('alpine', { feet: [[1 - f, 9], [1 - f, 9]], lean: 3 + f, hands: [[6 + 2 * f, 6], [4 + f, 6]], look: 'down' })),
    // Up rungs or a ladder, side-on, facing the rock: hands and feet on the rungs, moving in turn.
    climb: [0, 1].map(f => sideFig('alpine', { feet: f ? [[4, 3], [3, 8]] : [[3, 8], [4, 3]], hands: f ? [[4, -12], [4, -6]] : [[4, -6], [4, -12]], lean: 1, look: 'up' })),
    // Reaching up to the cable with one hand to move a lanyard past an anchor.
    reach: sideFig('alpine', { hands: [[5, -9], [2, 5]], lean: 1, look: 'up' }),
    // Stopped at the edge of a crevasse, looking down into it.
    peer2: sideFig('alpine', { hands: [[3, 5], [-2, 6]], lean: 3, look: 'down', held: axe }),
    // At the binoculars: both hands up on the viewer, leaning in to the eyepieces.
    peer: sideFig('alpine', { hands: [[5, -4], [4, -2]], lean: 2, head: [1, 1], elbowFwd: true }),
  };
  fig.walkR = fig.walk.map(rimeOn); fig.windR = fig.wind.map(rimeOn);
  // hevy-garmin-sync (round 5, T55), in the running kit he wears on the map: running, stood still, on top,
  // looking at his watch, sliding down, and on the bench with the bar in his hands.
  const runner = makeRunner('trail'), press = (top, hat) => [0, 1].map(f => { const b = new BM(34, 22); b.ox = 17; b.oy = 21; for (let x = 8; x < 22; x++) { b.set(x, 13, top[1]); b.set(x, 12, top[2]); b.set(x, 14, top[0]); } for (let x = 22; x < 28; x++) b.set(x, 13, R.rock[1]); thick(b, 26, 13, 29, 19, 2, R.rock[0]); b.set(30, 20, R.bark[1]); disc(b, 6, 11, 3, (nx, ny) => ny < -0.2 ? hat[1] : R.skin[2]); const by = f ? 4 : 9; thick(b, 12, 11, 12, by + 1, 2, top[1]); thick(b, 16, 11, 16, by + 1, 2, top[0]); barbell(b, by); outline(b, INK); return b; });
  const figT = { run: runner.side, idle: runner.sideIdle[0], stand: frontFig('trail'), wrist: sideFig('trail', { hands: [[4, 0], [3, 1]], lean: 1, look: 'down', elbowFwd: true }),
    sit: [0, 1].map(f => sideFig('trail', { feet: [[8, 3], [7, 4 + f]], crouch: 6, lean: -2, hands: [[2, 4], [-4, 2 - f]] })), press: press(R.sun, R.blaze) };
  // Bluebird Forecast (round 5, T50), with nothing in his hands. Walking a ledge; up a slab on hands and
  // feet, a hand and the other foot moving in turn; sat under the boulder with his knees up; and the
  // same with his phone out, its screen lit.
  const phone = (b, sh, hands) => { const hx = sh[0] + hands[0][0], hy = sh[1] + hands[0][1]; b.set(hx + 1, hy - 3, R.navy[0]); b.set(hx + 2, hy - 3, R.navy[0]); b.set(hx + 1, hy - 2, R.jay[3]); b.set(hx + 2, hy - 2, R.white[1]); b.set(hx + 1, hy - 1, R.jay[3]); b.set(hx + 2, hy - 1, R.jay[2]); };
  fig.hike = [0, 1, 2, 3, 4, 5].map(f => sideFig('alpine', { feet: [WALK[f], WALK[(f + 3) % 6]], hands: [[3 - (f % 3), 5], [-2 + (f % 3), 6]], bob: f % 3 === 1 ? -1 : 0, lean: 2 }));
  fig.scramble = [[[5, 4], [-1, 8.5], [5, -1], [3, 1]], [[4, 5.5], [1, 8], [3, 1], [5, -1]], [[6, 3.5], [-2, 8.5], [5, 0], [4, -1]], [[3, 6.5], [0, 8.5], [4, 0], [5, 0]]].map(([f0, f1, h0, h1]) => sideFig('alpine', { feet: [f0, f1], hands: [h0, h1], lean: 7, crouch: 3, look: 'up' }));
  // Crossing a ledge between two slabs: half upright, a hand already out for the next hold.
  fig.ledge = [[[3, 8.5], [-2, 8.5], [5, 1], [2, 4]], [[1, 8.5], [-3, 7.5], [5, 2], [3, 3]], [[-1, 8.5], [2, 7.5], [4, 1], [2, 4]], [[2, 8.5], [-1, 8.5], [5, 2], [3, 3]]].map(([f0, f1, h0, h1]) => sideFig('alpine', { feet: [f0, f1], hands: [h0, h1], lean: 4, crouch: 2, look: 'up' }));
  fig.shelter = sideFig('alpine', { feet: [[6, 3], [5, 4]], crouch: 5, lean: 0, hands: [[3, 3], [2, 3]] });
  fig.phone = sideFig('alpine', { feet: [[6, 3], [5, 4]], crouch: 5, lean: 0, hands: [[4, 1], [2, 3]], look: 'down', elbowFwd: true, held: phone });
  const tent = makeTent('tent'), flag = [makeFlag(0), makeFlag(1)], bb = [0, 1, 2, 3].map(bluebird), bbSit = [bluebird('sit'), bluebird('call')];
  const squirrel = (() => { const b = new BM(7, 5); b.ox = 3; b.oy = 4; b.set(1, 2, R.blaze[0]); b.set(2, 2, R.blaze[1]); b.set(3, 2, R.blaze[1]); b.set(4, 1, R.blaze[1]); b.set(5, 1, INK); b.set(0, 0, R.blaze[2]); b.set(0, 1, R.blaze[1]); b.set(1, 1, R.blaze[1]); b.set(2, 3, R.blaze[0]); b.set(4, 3, R.blaze[0]); return b; })();
  // Colours pale enough that a white flake or a white gust line would vanish on them.
  const pale = new Uint8Array(256); for (const c of [R.snow[3], R.snow[4], R.white[0], R.white[1], R.glac[4], R.glac[5], R.farsnow[0], R.farsnow[1]]) pale[c] = 1;

  const st = {}, focus = { x: 0, y: 0 };
  const clouds = [0, 1, 2, 3].map(i => ({ bm: makeCloud(640 + i), x: i * 170 + 40, y: 0.1 + (i % 3) * 0.13 + i * 0.02, v: 2.5 + i * 1.2 }));
  let cam = { x: 0, y: 0 }, last = { camX: 0, base: 0, id: '' }, egg = -99;
  const get = id => { if (!strips[id]) strips[id] = paint(ROUTES[id], 250 + Object.keys(ROUTES).indexOf(id) * 13); return strips[id]; };

  // Distance along the slope, so steep ground takes longer than easy ground.
  const arcs = {}, plans = {};
  const arc = id => { if (!arcs[id]) { const pts = ROUTES[id].pts, a = [0]; for (let x = 1; x <= sxOf(ROUTES[id]); x++) { const g = xingAt(ROUTES[id], x - 0.5, 3); const ast = ROUTES[id].astride, sat = ast && x > ast[0] && x <= ast[1]; a.push(a[x - 1] + Math.hypot(1, (hOf(pts, x) - hOf(pts, x - 1)) * 1.5) * (g ? SLOW[g[2]] : 1) * (sat ? 2.4 : 1)); } arcs[id] = a; } return arcs[id]; };
  const arcAt = (a, x) => { const i = clamp(Math.floor(x), 0, a.length - 2); return a[i] + (a[i + 1] - a[i]) * clamp(x - i, 0, 1); };
  function xAt(a, want) {
    let lo = 0, hi = a.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m] < want) lo = m; else hi = m; }
    return lo + (want - a[lo]) / Math.max(1e-6, a[hi] - a[lo]);
  }
  // The ascent of a route as a list of legs: he walks to the foot of each wall of ice, climbs it, and walks
  // on. Walking is paced so the route's walking seconds are spent evenly along the slope.
  function plan(id) {
    if (plans[id]) return plans[id];
    const cfg = ROUTES[id], pts = cfg.pts, a = arc(id), legs = [];
    // A run up switchbacks: one leg for each straight of the trail, all at the same pace, then the watch on top.
    if (cfg.zig) {
      const z = cfg.zig, len = z.slice(1).map((q, i) => Math.hypot(q[0] - z[i][0], q[1] - z[i][1])), all = len.reduce((u, v) => u + v, 0); let t = T_UP, d0 = 0;
      len.forEach((l, i) => { legs.push({ t0: t, t1: t + cfg.secs * l / all, zig: i, d0, len: l }); t += cfg.secs * l / all; d0 += l; });
      legs.push({ t0: t, t1: t + cfg.beep, x0: sxOf(cfg), x1: sxOf(cfg), beep: true }); t += cfg.beep;
      return plans[id] = { legs, walls: [], anchors: [], clips: [], tRun: t - cfg.beep, tSum: t, tPush: t + T_STAND, tBot: t + T_STAND + T_SLIDE, dur: t + T_STAND + T_SLIDE + T_OUT };
    }
    const walls = (cfg.ice || []).map(([xa, xb]) => ({ xa, xb, ya: hOf(pts, xa), x0: xa - 3, xc: xa + MID, top: hOf(pts, xa + MID) }));
    let dist = 0, x = 0; for (const w of walls) { dist += arcAt(a, w.x0) - arcAt(a, x); x = w.xc; } dist += a[a.length - 1] - arcAt(a, x);
    const speed = dist / cfg.secs; let t = T_UP; x = 0;
    const walk = x1 => { const d = arcAt(a, x1) - arcAt(a, x); legs.push({ t0: t, t1: t + d / speed, x0: x, x1 }); t += d / speed; x = x1; };
    walls.forEach((w, i) => { walk(w.x0); const leg = iceLeg(w, t, cfg.slip && cfg.slip[0] === i ? cfg.slip[1] : -1); legs.push(leg); t = leg.t1; x = w.xc; });
    // Stops on the way.
    const stops = [];
    const anchors = []; if (cfg.cable) { const end = arcAt(a, cfg.cable); for (let s = 14; s < end - 20; s += cfg.anchor) anchors.push(s); anchors.push(end); anchors.forEach((s, i) => stops.push({ sx: xAt(a, s - 2), d: 0.8, k: 'clip', i })); }
    if (cfg.dead) stops.push({ sx: cfg.dead[0], k: 'dead' });
    if (cfg.wait) stops.push({ sx: cfg.wait[0], d: cfg.wait[1], k: 'wait' });
    for (const p of stops.sort((a, b) => a.sx - b.sx)) {
      // The dead end: he stops at the edge and looks, walks back to the last wand, and the whiteout closes
      // over him; when it opens he is on the line again beyond the crevasse.
      if (p.k === 'dead') { const [at, back, to] = cfg.dead; walk(at); const tb = (arcAt(a, at) - arcAt(a, back)) / speed;
        legs.push({ t0: t, t1: t + 1.1, x0: at, x1: at, look: true }); t += 1.1;
        legs.push({ t0: t, t1: t + tb, x0: at, x1: back, back: true }); t += tb;
        legs.push({ t0: t, t1: t + 0.6, x0: back, x1: back, look: true, away: true }); t += 0.6;
        legs.push({ t0: t, t1: t + 1.4, x0: back, x1: to, cut: true }); t += 1.4; x = to; continue; }
      walk(p.sx); legs.push({ t0: t, t1: t + p.d, x0: p.sx, x1: p.sx, [p.k]: true, i: p.i }); t += p.d; }
    walk(sxOf(cfg));
    if (cfg.beep) { legs.push({ t0: t, t1: t + 1.4, x0: x, x1: x, beep: true }); t += 1.4; }
    // When each lanyard goes past each anchor: the first one in the first half of the stop, the second in the
    // second half, so one of them is always on the cable.
    const clips = legs.filter(l => l.clip).map(l => ({ s: anchors[l.i], t0: l.t0, a: l.t0 + 0.4 * (l.t1 - l.t0), b: l.t1 - 0.05, mid: l.t0 + 0.5 * (l.t1 - l.t0) }));
    return plans[id] = { legs, walls, anchors, clips, tSum: t, tPush: t + T_STAND, tBot: t + T_STAND + T_SLIDE, dur: t + T_STAND + T_SLIDE + T_OUT };
  }
  function where(id, tau) {
    const cfg = ROUTES[id], pts = cfg.pts, pl = plan(id);
    if (tau < T_UP) { const x = -34 + 34 * tau / T_UP; return { ph: 'up', x, y: 0, mode: 'walk' }; }
    if (tau <= pl.tSum) {
      const leg = pl.legs.find(l => tau <= l.t1) || pl.legs[pl.legs.length - 1];
      if (leg.zig != null) { const A = cfg.zig[leg.zig], B = cfg.zig[leg.zig + 1], k = clamp((tau - leg.t0) / (leg.t1 - leg.t0), 0, 1); return { ph: 'up', x: lerp(A[0], B[0], k), y: lerp(A[1], B[1], k), mode: 'run', back: B[0] < A[0], lap: leg.zig + 1, d: leg.d0 + k * leg.len }; }
      if (leg.look) return { ph: 'up', x: leg.x0, y: hOf(pts, leg.x0), mode: 'look', back: leg.away };
      if (leg.back) { const x = lerp(leg.x0, leg.x1, (tau - leg.t0) / (leg.t1 - leg.t0)); return { ph: 'up', x, y: hOf(pts, x), mode: 'walk', back: true }; }
      if (leg.cut) { const v = (tau - leg.t0) / (leg.t1 - leg.t0), x = v < 0.5 ? leg.x0 : leg.x1; return { ph: 'up', x, y: hOf(pts, x), mode: 'look', cut: v, back: v < 0.5 }; }
      if (leg.clip) return { ph: 'up', x: leg.x0, y: hOf(pts, leg.x0), mode: 'clip', u: (tau - leg.t0) / (leg.t1 - leg.t0) };
      if (leg.beep || leg.wait) return { ph: 'up', x: leg.x0, y: hOf(pts, leg.x0), mode: leg.wait ? 'wait' : 'beep', u: (tau - leg.t0) / (leg.t1 - leg.t0) };
      if (leg.ice) { const pose = icePose(leg, tau - leg.t0); return pose.walk ? { ph: 'up', x: pose.x, y: pose.y, mode: 'walk' } : { ph: 'up', x: pose.hx, y: leg.w.ya - pose.hh + STAND, mode: 'ice', pose, leg }; }
      const a = arc(id), x = xAt(a, lerp(arcAt(a, leg.x0), arcAt(a, leg.x1), clamp((tau - leg.t0) / Math.max(1e-6, leg.t1 - leg.t0), 0, 1))); let y = hOf(pts, x), mode = 'walk';
      // On Bluebird Forecast's dry rock he walks the ledges and goes up the slabs on hands and feet.
      if (cfg.kind === 'ridge') mode = !cfg.wait ? 'wind' : x < cfg.wait[0] + 20 || x > cfg.sx - 36 ? 'hike' : hOf(pts, x + 3) - hOf(pts, x - 3) < -3 ? 'scramble' : 'ledge';
      if (wallAt(cfg, x)) mode = 'climb';
      if (cfg.knife && knifeK(cfg, x) > 0.5) mode = cfg.astride && x > cfg.astride[0] && x < cfg.astride[1] ? 'astride' : 'edge';
      const xg = xingAt(cfg, x, 3);
      if (xg && xg[2] === 'jump') { const v = clamp((x - xg[0] + 3) / (xg[1] - xg[0] + 6), 0, 1); y = lerp(hOf(pts, xg[0] - 3), hOf(pts, xg[1] + 3), v) - Math.sin(v * Math.PI) * 12; mode = 'jump'; }
      else if (xg) { y = lerp(hOf(pts, xg[0]), hOf(pts, xg[1]), clamp((x - xg[0]) / (xg[1] - xg[0]), 0, 1)) + sagAt(xg, x, x) - (xg[2] === 'snow' || xg[2] === 'sag' ? 0 : 1); if (xg[2] !== 'snow') mode = 'wind'; }
      if (cfg.gap && x > cfg.gap[0] - 4 && x < cfg.gap[1] + 2) {
        const u = (x - cfg.gap[0] + 4) / (cfg.gap[1] - cfg.gap[0] + 6);
        if (cfg.kind === 'bridge') { mode = 'jump'; y = lerp(hOf(pts, cfg.gap[0] - 4), hOf(pts, cfg.gap[1] + 2), u) - Math.sin(u * Math.PI) * 16; }
        else { mode = 'crawl'; y = lerp(hOf(pts, cfg.gap[0]), hOf(pts, cfg.gap[1]), clamp((x - cfg.gap[0]) / (cfg.gap[1] - cfg.gap[0]), 0, 1)) - 2; }
      }
      return { ph: 'up', x, y, mode };
    }
    if (tau < pl.tPush) return { ph: 'up', x: sxOf(cfg), y: hOf(pts, sxOf(cfg)), mode: 'stand' };
    if (tau < pl.tBot) { const u = (tau - pl.tPush) / T_SLIDE, x = 400 * (1 - (u * 0.75 + 0.25 * (1 - sq(1 - u)))); return { ph: 'down', x, y: hOf(slope.cfg.pts, x), mode: 'sit' }; }
    const u = (tau - pl.tBot) / T_OUT; return { ph: 'down', x: -u * 34, y: 0, mode: 'walk', back: true };
  }
  // How long each summit's thing keeps him busy once it is clicked. He stays put until it is over.
  const BUSY = { icefall: 1.5 };
  // The binoculars on trailhead (round 5, T59): once he is at them the view stays open, and can be moved
  // about, until it is closed with space or its BACK button. `close` is when that was asked for, `keys`
  // the direction keys held down.
  let bino = null;
  const VIEW = { x0: -110, x1: 110, y0: -80, y1: 46, speed: 80, open: 1.35, shut: 1.2 };
  const shutView = t => { if (bino && bino.close == null && t - egg > VIEW.open) bino.close = t; };
  const busy = t => last.ph === 'up' && ROUTES[last.id] && (!!bino || t - egg < (BUSY[ROUTES[last.id].kind] || 0));

  return {
    name: 'climb',
    dur: arg => plan(arg.id).dur,
    stops: arg => { const pl = plan(arg.id); return [{ id: arg.id, at: pl.tSum / pl.dur }]; },
    elev: (arg, q) => -where(arg.id, q * plan(arg.id).dur).y,
    cues(arg) {
      const cfg = ROUTES[arg.id], pl = plan(arg.id), D = pl.dur, out = [{ at: pl.tPush / D, name: 'glissade' }, { at: (pl.tBot - 0.05) / D, name: 'step' }];
      if (cfg.gap) for (let tau = T_UP; tau < pl.tSum; tau += 0.02) if (where(arg.id, tau).x > cfg.gap[0] - 4) { out.push({ at: tau / D, name: cfg.kind === 'bridge' ? 'crack' : 'step' }); if (cfg.kind === 'bridge') out.push({ at: (tau + 0.05) / D, name: 'jump' }); break; }
      if (cfg.kind === 'ridge' && !cfg.wait) out.push({ at: 0.6 / D, name: 'wind' });
      // The drizzle is heard from the start, and the phone chimes when its forecast turns.
      if (cfg.wait) { const wl = pl.legs.find(l => l.wait); out.push({ at: 0.15 / D, name: 'drizzle' }, { at: 3.3 / D, name: 'drizzle' }, { at: (wl.t0 + PHONE.turn * (wl.t1 - wl.t0)) / D, name: 'chime' }); }
      for (const g of cfg.xings || []) if (g[2] !== 'open') for (let tau = T_UP; tau < pl.tSum; tau += 0.02) if (where(arg.id, tau).x > g[0] - 3) { out.push({ at: tau / D, name: g[2] === 'lashed' || g[2] === 'sag' ? 'creak' : g[2] === 'jump' ? 'jump' : 'step' }); break; }
      // The storm on the wanded route is heard as it arrives, and again as it closes in.
      if (cfg.kind === 'wands') for (const u of [0.09, 0.3, 0.5, 0.66]) out.push({ at: (T_UP + u * (pl.tSum - T_UP)) / D, name: 'wind' });
      // The run: a footfall three times a second, and the watch's blip at the start and at each corner.
      if (cfg.zig) { out.push({ at: T_UP / D, name: 'beep' }); for (const leg of pl.legs) if (leg.zig != null) { if (leg.zig) out.push({ at: leg.t0 / D, name: 'lap' }); for (let a = leg.t0 + 0.15; a < leg.t1; a += 0.3) out.push({ at: a / D, name: 'step' }); } const bl = pl.legs.find(l => l.beep); out.push({ at: (bl.t0 + 0.5 * cfg.beep) / D, name: 'chime' }); }
      for (const leg of pl.legs) {
        if (leg.beep) out.push({ at: (leg.t0 + 0.3) / D, name: 'beep' });
        if (leg.clip) for (const a of [0.4, 0.95]) out.push({ at: (leg.t0 + a * (leg.t1 - leg.t0)) / D, name: 'tink' });
      }
      for (const leg of pl.legs) if (leg.ice) for (const h of leg.hit) out.push({ at: h.t / D, name: h.tool ? 'tink' : 'step' });
      return out;
    },
    enter(scr, arg, q) { const w = where(arg.id, q * plan(arg.id).dur); cam.x = w.x; cam.y = w.y; st.y = null; st.lift = null; egg = -99; bino = null; st.fixed = false; st.banged = -99; },
    focus: () => focus,
    hold: env => busy(env.t),
    // While the binoculars are open the keys are theirs: the arrows and WASD move the view, space closes it.
    key(code, down) {
      if (!bino) return false;
      const dir = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd' }[code];
      if (dir) { bino.keys[dir] = down; return true; }
      if (code === 'Space') { if (down) shutView(last.t); return true; }
      return false;
    },
    pick(sx, sy) {
      // Through the binoculars only the BACK button can be pressed, and a tap elsewhere does nothing.
      if (bino) { const b = last.back; return b && sx >= b[0] && sx <= b[2] && sy >= b[1] && sy <= b[3] ? { named: true, x: sx, y: sy, act: 'back' } : { named: true, x: sx, y: sy }; }
      if (last.ph !== 'up' || last.away) return null;
      const cfg = ROUTES[last.id], SXr = sxOf(cfg), x = sx + last.camX - OFF, y = sy - last.base, ty = hOf(cfg.pts, SXr + 24), tall = TALL[cfg.kind] || 34;
      if (Math.abs(x - SXr - 24) < 20 && y < ty + 3 && y > ty - tall) return { label: FINDS['egg:' + last.id][0], x: SXr + 24 + OFF - last.camX, y: last.base + ty - tall - 2, act: 'egg' };
      if (cfg.kind === 'bridge' && Math.abs(x - 163) < 14 && Math.abs(y + 60) < 30) return { label: NAMES.climb.crevasse, x: sx, y: sy - 8 };
      if (cfg.kind === 'ridge' && x > 100 && x < sxOf(cfg) - 12 && Math.abs(y - hOf(cfg.pts, x)) < 8) return { label: NAMES.climb.ridge, x: sx, y: sy - 8 };
      return null;
    },
    act(id, env) {
      if (id === 'back') { shutView(env.t); return true; }
      if (id === 'egg' && env.shown && ROUTES[last.id].kind === 'bridge' && !bino && env.t - egg > 6) { egg = env.t; bino = { close: null, keys: {} }; env.look.x = env.look.y = 0; env.sfx('egg'); env.found('egg:' + last.id); return true; }
      if (id === 'egg' && env.shown && env.t - egg > (ROUTES[last.id].kind === 'ridge' ? BIRD.gone : 6)) { egg = env.t; env.sfx('egg'); env.found('egg:' + last.id); return true; } return false; },
    draw(scr, env, arg, q) {
      const { VW, VH, fb } = scr, { t } = env, id = arg.id, cfg = ROUTES[id], kind = cfg.kind, pl = plan(id), SXr = sxOf(cfg);
      const tau = q * pl.dur, me = where(id, tau), S = me.ph === 'up' ? get(id) : slope.S, pts = me.ph === 'up' ? cfg.pts : slope.cfg.pts;
      cam.x += (me.x - cam.x) * (env.calm || me.cut != null ? 1 : Math.min(1, env.dt * 8)); cam.y += (me.y - cam.y) * (env.calm ? 1 : Math.min(1, env.dt * 6));
      const anchor = scr.narrow ? 0.5 : me.ph === 'up' ? 0.52 : 0.6, u = t - egg;
      // The rack is hit hard enough to shake the picture for a moment.
      const jolt = kind === 'icefall' && me.ph === 'up' && u > 0.36 && u < 0.86 ? 1 - (u - 0.36) / 0.5 : 0;
      const camX = Math.round(cam.x + OFF - VW * anchor + env.look.x * 0.4 + 3 * jolt * Math.sin(u * 95)), base0 = baseline(scr, env.shown, st) - Math.round(cam.y) - (scr.narrow ? 0 : 20) + Math.round(2 * jolt * Math.cos(u * 70));
      // A tall, narrow screen sees further down than the rock is painted, at the foot of the climb and
      // where the way down ends. The picture sits lower by what is missing, unless a card covers it.
      const short = scr.narrow && !env.shown ? Math.max(0, VH - DOWN - base0) : 0; st.lift = st.lift == null ? short : st.lift + (short - st.lift) * 0.12;
      const base = base0 + Math.round(st.lift);
      // The binoculars close by themselves only if he is taken off the summit (the timeline is dragged).
      if (bino && (me.ph !== 'up' || tau < pl.tSum - 0.05 || tau > pl.tPush || (bino.close != null && t - bino.close > VIEW.shut))) { bino = null; env.look.x = env.look.y = 0; }
      // How long ago the view was asked to close, or -1 while it is open.
      const shut = bino && bino.close != null ? t - bino.close : -1;
      last = { camX, base, id, ph: me.ph, t, away: !!bino && u > 0.7 && shut < 0.3, back: null };
      const up = clamp((tau - T_UP) / (pl.tSum - T_UP), 0, 1);
      // On the long ridge the cloud thins through the deck and is gone when he breaks out; the wind drops
      // by steps (gale, strong, breeze, still) rather than smoothly.
      // On Bluebird Forecast it rains until the forecast on his phone turns, and the cloud that sat on
      // everything lifts behind the rain.
      const wl = cfg.wait && me.ph === 'up' ? pl.legs.find(l => l.wait) : null, tTurn = wl ? wl.t0 + PHONE.turn * (wl.t1 - wl.t0) : 0, rain = wl ? 1 - smooth(tTurn + 0.3, tTurn + 2.4, tau) : 0;
      const storm = kind === 'ridge' && me.ph === 'up' ? (wl ? 1 - smooth(tTurn + 1.2, wl.t1 + 3.4, tau) : cfg.brk ? 1 - smooth(cfg.brk * 0.53, cfg.brk, up) : 1 - smooth(0.5, 0.86, up)) : 0;
      const windK = cfg.wait ? 0 : !cfg.brk ? storm : storm > 0.7 ? 1 : storm > 0.4 ? 0.6 : storm > 0.08 ? 0.3 : 0;
      // The storm on the wanded route blows in by stages as he gains height: gusts in clear air, a bank of
      // cloud sliding over from the right, the first flakes, heavy snow, then white. It lets go slowly near the top.
      // On Kubernetes-Manifests he climbs out of the top of it instead (round 5, T62): `out` goes from 0 to 1 as he
      // comes up through the cloud's top, `roof` is the cloud still overhead, and `sea` brings in the sea of
      // cloud that is left below him. The other peaks sink a little behind the whiteout, so that only their tops
      // stand out of the sea.
      let gust = 0, bank = 0, flakes = 0, heavy = 0, white = 0, out = 0, roof = 0, sea = 0, sunk = 0;
      if (kind === 'wands' && me.ph === 'up') {
        const S7 = cfg.dead ? [0.04, 0.1, 0.06, 0.2, 0.12, 0.2, 0.18, 0.26, 0.24, 0.32, 0.72, 1] : [0.07, 0.14, 0.1, 0.34, 0.2, 0.3, 0.34, 0.5, 0.5, 0.63, 0.74, 0.98];
        if (cfg.sea) { out = smooth(cfg.sea[1], cfg.sea[2], me.x); sea = smooth(cfg.sea[1] - 40, cfg.sea[1] + 10, me.x); sunk = smooth(cfg.sea[1] - 100, cfg.sea[1], me.x); }
        const clear = cfg.sea ? 1 - out : 1 - smooth(S7[10], S7[11], up);
        roof = smooth(S7[2], S7[3], up); bank = roof * clear; if (out >= 1) roof = 0;
        gust = smooth(S7[0], S7[1], up) * (cfg.sea ? 1 - smooth(0.3, 1, out) : 1 - smooth(0.84, 0.99, up));
        flakes = smooth(S7[4], S7[5], up) * (cfg.sea ? clear : 1 - smooth(0.82, 0.99, up)); heavy = smooth(S7[6], S7[7], up) * clear; white = smooth(S7[8], S7[9], up) * clear;
        // On the long maze the whiteout eases a little once he is past the dead end, enough to see the crevasses.
        if (cfg.dead) white *= 1 - 0.4 * smooth(0.5, 0.58, up);
        // At the dead end and at the jump the cloud parts just enough for him (and us) to see the crevasse.
        if (cfg.dead && me.cut == null) for (const g of cfg.xings) if (g[2] === 'open' || g[2] === 'jump') white *= 1 - 0.5 * (1 - smooth(6, 34, Math.abs(me.x - g[0])));
      }

      // Sky: blue, or the grey of the storm it clears from.
      const sb = R.skyband, over = cfg.sea ? roof : bank, front = VW * (1.2 - 1.6 * over), stormy = storm > 0 || over > 0;
      if (stormy) blow(scr, t, storm > 0);
      for (let y = 0; y < VH; y++) {
        const f = clamp((y + 60 + cam.y * 0.3) / 320, 0, 1) * (sb.length - 1), b0 = Math.floor(f), e = f - b0, row = y * VW, at = y * drift.w;
        const rag = over > 0 ? front + 90 * (vnoise(y / 34 + t * 0.1, 7, 262) - 0.5) - 30 : 0, lid = storm * 1.5 - 0.2, thin = out > 0 ? out * 1.3 - 0.3 * y / VH : -1;
        for (let x = 0; x < VW; x++) {
          let c = sb[Math.min(sb.length - 1, b0 + (e > 0.72 && bayer(x, y) < (e - 0.72) / 0.28 ? 1 : 0))];
          if (stormy) {
            const n = drift.n[at + (x >> 1)] / 255, m = drift.m[at + (x >> 1)] / 255;
            // On the ridge the storm is long banks of cloud driven sideways, dark above and paler toward the
            // horizon, tearing open in patches as he gains height. On the wanded route it is a grey bank
            // that slides in from the right with a ragged front.
            if (storm > 0) { if (n < lid) c = R.rock[clamp(Math.floor((0.1 + 0.7 * m + 0.3 * y / VH) * 5), 0, 4)]; }
            else if (x > rag + 60 * n && m > thin) c = R.snow[m < 0.4 ? 0 : m < 0.6 ? 1 : 2];
          }
          fb[row + x] = c;
        }
      }
      // Through the thinning deck the sun shows as a pale disc, before the cloud lets go entirely.
      if ((cfg.brk || cfg.wait) && storm > 0.03 && storm < 0.97) paleSun(scr, Math.round(VW * 0.7), Math.round(VH * 0.18), 9, smooth(0.03, 0.5, 1 - storm) * (1 - (cfg.wait ? smooth(0.4, 0.62, 1 - storm) : smooth(0.75, 0.97, 1 - storm))));
      if (out > 0.03 && out < 0.97) paleSun(scr, Math.round(VW * 0.7), Math.round(VH * 0.18), 9, smooth(0.03, 0.5, out) * (1 - smooth(0.75, 0.97, out)));
      // Fair-weather cloud drifting high over the range, when there is sky to see. None above the sea of cloud.
      if (storm < 0.3 && bank < 0.3 && !sea) for (const c of clouds) scr.blit(c.bm, ((c.x + t * c.v - camX * 0.06) % (VW + 140) + VW + 140) % (VW + 140) - 70, c.y * VH * 0.5 + 12 + cam.y * 0.12);
      drawStrip(scr, far, 200 + camX * 0.15, base + 40 + cam.y * 0.8 + 30 + Math.round(8 * sunk));
      if (sea > 0) inversion(scr, Math.round(base + cfg.sea[0]) - 9, camX, t, sea, 60);
      drawStrip(scr, mid, 120 + camX * 0.42, base + cam.y * 0.55 + 46 - Math.round(8 * sunk), false, 0);
      // A sea of cloud below the summits.
      if (!cfg.brk && !cfg.wait) for (let y = Math.max(0, Math.round(base + cam.y * 0.8 + 60)); y < VH; y++) { const row = y * VW, d = clamp((y - (base + cam.y * 0.8 + 60)) / 80, 0, 1); for (let x = 0; x < VW; x++) { const n = fbm((x + camX * 0.3 + t * 4) / 60, y / 14, 243, 3); if (n > 0.6 - d * 0.3) fb[row + x] = n > 0.68 - d * 0.3 ? R.white[1] : R.sky[4]; } }
      // The far peaks go first: the cloud takes them before any snow reaches him.
      veil(scr, smooth(0.25, 0.9, bank), [R.snow[1], R.snow[2]]);
      // Low cloud lies on the other peaks while it rains.
      if (cfg.wait) veil(scr, 0.9 * storm, [R.rock[3], R.rock[4]]);
      const X = x => Math.round(x + OFF - camX), Y = y => Math.round(base + y);
      // The icefall's seracs stand behind the route.
      if (kind === 'icefall' && me.ph === 'up') for (const s of seracs) scr.put(s.bm, X(s.x), Y(hOf(pts, s.x) + 7), false);
      drawStrip(scr, S, camX, base, false, R.snow[1]);
      // As the snow thickens, everything dark goes behind it (rock, the far wands, the edge of the slope) while the snow at his feet stays.
      if (heavy > 0.02) veil(scr, heavy * 0.85, [R.snow[1], R.snow[2]], X(me.x), Y(me.y) - 12, pale);
      // His tracks stay in the snow behind him: boot prints on the way up, one long groove on the way down.
      // None on dry rock or on the trail.
      if (me.ph === 'up' && !cfg.wait && !cfg.zig) { for (let x = -30; x < me.x - 3; x += 4) { if (cfg.gap && x > cfg.gap[0] - 6 && x < cfg.gap[1] + 6) continue; if (xingAt(cfg, x, 6)) continue; if (pl.walls.some(w => x > w.x0 + 2 && x < w.xc + 2)) continue; const y = hOf(pts, x); scr.set(X(x), Y(y) + 2, R.snow[1]); scr.set(X(x) + 1, Y(y) + 2, R.snow[2]); } }
      else if (me.mode === 'sit') for (let x = Math.ceil(me.x) + 4; x < 400; x++) { const y = hOf(pts, x); scr.set(X(x), Y(y) + 2, R.snow[2]); if (x & 1) scr.set(X(x), Y(y) + 3, R.snow[3]); }
      // Spindrift blows off the top.
      if (me.ph === 'up' && white < 0.3 && !cfg.wait && !cfg.zig) for (let k = 0; k < 34; k++) { const a = frac(t * (0.5 + storm) + k / 34), x0 = SXr + 38 + (k % 5) * 3, y0 = hOf(pts, x0) - 1; const x = X(x0 + a * (46 + 30 * storm) + 4 * Math.sin(a * 9 + k)), y = Y(y0 - a * 13 - 3 * Math.sin(a * 5 + k * 2)); if (bayer(x, y) > a * 0.9) scr.set(x, y, a < 0.4 ? R.white[1] : R.snow[3]); }
      // Snow driven flat across everything while the storm lasts.
      // Drizzle: fine slanting streaks, none of them under the boulder's prow, and a sparkle of splashes
      // where they land on the rock.
      if (rain > 0.02) {
        for (let k = 0; k < 260 * rain; k++) {
          const x = Math.round(((hash(k, 1, 295) * (VW + 60) - t * (38 + 20 * hash(k, 4, 295))) % (VW + 60) + VW + 60) % (VW + 60)) - 20, y = Math.round((hash(k, 2, 295) * (VH + 20) + t * (190 + 90 * hash(k, 3, 295))) % (VH + 20)) - 10;
          const roof = roofAt(cfg, x + camX - OFF); if (roof != null && y > base + roof) continue;
          scr.set(x + 1, y - 2, R.rock[4]); scr.set(x + 1, y - 1, R.rock[4]); scr.set(x, y, R.white[1]); scr.set(x, y + 1, R.white[1]);
        }
        for (let k = 0; k < 26 * rain; k++) {
          const n = Math.floor(t * 9 + k * 0.37), x = Math.floor(hash(k, n, 296) * VW), wx = x + camX - OFF;
          if (roofAt(cfg, wx) == null) scr.set(x, Math.round(base + hOf(cfg.pts, wx)) - 1 - (n & 1), R.white[1]);
        }
      }
      if (storm > 0.05 && !cfg.wait) for (let k = 0; k < 150 * storm; k++) { const sp = 220 + hash(k, 1, 255) * 160, x = Math.round(VW + 20 - frac(hash(k, 2, 255) + t * sp / (VW + 40)) * (VW + 40)), y = Math.round(frac(hash(k, 3, 255) + t * 0.11) * VH), len = 2 + (k % 4); for (let j = 0; j < len; j++) scr.set(x + j, y - (j >> 2), j ? R.snow[3] : R.white[1]); }

      const tx = SXr + 24, ty = hOf(pts, tx);
      let bird = null;
      if (me.ph === 'up') {
        // The crux of each route.
        if (kind === 'bridge') {
          const [g0, g1] = cfg.gap, y0 = hOf(pts, g0), y1 = hOf(pts, g1);
          for (let x = g0; x <= g1; x++) { const u = (x - g0) / (g1 - g0), by = lerp(y0, y1, u) + Math.sin(u * Math.PI) * 3; const drop = me.x > g0 - 2 ? Math.max(0, (me.x - g0 + 2) / (g1 - g0 + 4) - u * 0.5) * 120 * (0.5 + hash(x, 2, 248)) : 0; for (let j = 0; j < 5; j++) scr.set(X(x), Y(by + j + drop), j === 0 ? R.snow[4] : R.snow[2 + (j < 3 ? 1 : 0)]); }
        }
        if (cfg.cable) ferrata(scr, X, Y, cfg, pts, pl, arc(id), xAt, arcAt);
        if (kind === 'ladder' && cfg.gap) { const [g0, g1] = cfg.gap, y0 = hOf(pts, g0), y1 = hOf(pts, g1); for (let x = g0 - 4; x <= g1 + 4; x++) { const u = (x - g0) / (g1 - g0), y = lerp(y0, y1, u); scr.set(X(x), Y(y), R.rock[4]); scr.set(X(x), Y(y + 2), R.rock[2]); if ((x - g0) % 4 === 0) scr.set(X(x), Y(y + 1), R.rock[3]); } for (const [x, y] of [[g0 - 5, y0], [g1 + 5, y1]]) { scr.set(X(x), Y(y - 3), R.blaze[1]); scr.set(X(x), Y(y - 2), R.rock[3]); scr.set(X(x), Y(y - 1), R.rock[3]); } }
        for (const g of cfg.xings || []) crossing(scr, X, Y, g, hOf(pts, g[0]), hOf(pts, g[1]), me.x);
        // The thing on the summit, and whatever it does when clicked.
        if (kind === 'icefall') {
          // He hits it, it bangs, and its lights stutter from red to green and stay there for the visit.
          if (u > 0.36 && u < 1.5 && st.banged < egg) { st.banged = t; st.fixed = true; env.sfx('bang'); }
          scr.put(TOPS.icefall(u > 0.36 && u < 1.05 ? 'flicker' : st.fixed ? 'green' : 'red', Math.floor(t * (u < 1.05 ? 16 : 3)), !st.fixed), X(tx), Y(ty), false);
          // The snow comes off its roof.
          const a = t - st.banged; if (a < 0.9) for (let k = 0; k < 18; k++) { const px = tx - 11 + (k * 23 % 24) + (hash(k, 1, 249) - 0.5) * 30 * a, py = ty - 36 - 30 * hash(k, 2, 249) * a + 110 * a * a; if (py < ty + 1) { scr.set(X(px), Y(py), R.snow[4]); scr.set(X(px) + 1, Y(py), R.snow[k & 1 ? 4 : 3]); if (k % 3 === 0) scr.set(X(px), Y(py) + 1, R.snow[3]); } }
        }
        else if (kind === 'ridge') scr.put(TOPS.ridge(Math.floor(t * (storm > 0.3 ? 14 : 5)) & 3), X(tx), Y(ty), false);
        else if (kind === 'run') { const racked = !(u > 0.4 && u < 4.2), key = racked ? 'run' : 'bare'; scr.put((tops[key] = tops[key] || TOPS.run(racked)), X(tx), Y(ty), false); }
        else if (kind !== 'wands') scr.put((tops[kind] = tops[kind] || TOPS[kind]()), X(tx), Y(ty), false);
        if (kind === 'wands') { tops.wands = tops.wands || TOPS.wands(); scr.put(tops.wands, X(tx), Y(ty), false); const off = u < 3.4; if (off && u > 0.5) { const a = clamp((u - 0.5) / 0.6, 0, 1), back = clamp((u - 2.4) / 0.7, 0, 1), px = lerp(tx + 2, tx + 16, a - back), py = ty - 14 + (a - back) * 13 - Math.sin((a < 1 ? a : back) * Math.PI) * (a < 1 ? 5 : 12); scr.put(stone, X(px), Y(py), false); } else scr.put(stone, X(tx + 2), Y(ty - 14), false); }
        if (kind === 'ladder') { scr.put(speck(u < 4.5 && u > 3 ? Math.floor(t * 8) & 1 : 0), X(tx), Y(ty - 64), false); if (u < 6) { const lit = Math.floor(clamp(u / 3, 0, 1) * 9), sq2 = clamp(u / 3, 0, 1); for (let k = 0; k < 9; k++) { const a = k / 9, lx = tx + Math.sin(k * 2.1) * (3 + a * 13), ly = ty - 6 - a * 52; if (k < lit && (u < 4.6 || (Math.floor(t * 6) & 1))) { scr.set(X(lx), Y(ly), R.white[1]); scr.set(X(lx) - 1, Y(ly), R.yellow[1]); scr.set(X(lx) + 1, Y(ly), R.yellow[1]); scr.set(X(lx), Y(ly) - 1, R.yellow[1]); scr.set(X(lx), Y(ly) + 1, R.yellow[1]); } } if (u < 3) scr.put(squirrel, X(tx + Math.sin(sq2 * 9 * 2.1 / 1) * (3 + sq2 * 10)), Y(ty - 4 - sq2 * 54), Math.cos(sq2 * 19) < 0); } }
        // The bluebird is the weather station's find, and comes only when the station is clicked (round 5,
        // T51). It flies in from beyond the right edge, circles his head, lands on the station's white
        // box, sings three times, and leaves the way it came, climbing, until it is off the picture.
        if (kind === 'ridge' && u >= 0 && u < BIRD.gone) {
          const hx = X(me.x), hy = Y(me.y) - 40, ring = a => [hx + Math.cos(a * 2.6) * 24, hy + Math.sin(a * 2.6) * 7], perch = [X(tx) - 5, Y(ty) - 19], { loop, land, off } = BIRD;
          let p, left, bm = bb[Math.floor(t * 12) & 3];
          if (u < 1.3) { const k = smooth(0, 1.3, u), to = ring(1.3); p = [lerp(VW + 20, to[0], k), lerp(hy - 60, to[1], k) - 12 * Math.sin(k * Math.PI)]; left = true; }
          else if (u < loop) { p = ring(u); left = Math.sin(u * 2.6) > 0; }
          else if (u < land) { const k = smooth(loop, land, u), from = ring(loop); p = [lerp(from[0], perch[0], k), lerp(from[1], perch[1] - 8, k) - 9 * Math.sin(k * Math.PI) + 8 * k * k]; left = perch[0] < from[0]; if (k > 0.6) bm = bb[k > 0.85 ? 0 : 1]; }
          else if (u < off) { const n = BIRD.calls.filter(c => u > c).length, call = BIRD.calls.some(c => u > c && u < c + 0.32); if (n > (st.sang || 0)) env.sfx('warble'); st.sang = n; p = perch; left = u < off - 0.7; bm = bbSit[call ? 1 : 0]; }
          else { const a = u - off; p = [perch[0] + 55 * a + 70 * a * a, perch[1] - 8 - 34 * a - 6 * Math.sin(a * 5)]; left = false; }
          if (u < BIRD.calls[0]) st.sang = 0;
          if (p[0] < VW + 20) bird = { bm, x: Math.round(p[0]), y: Math.round(p[1]), left };
        }
      } else {
        // Camp at the bottom of the glissade.
        scr.put(tent, X(-52), Y(-1), false);
      }
      const sx = X(me.x), sy = Y(me.y);
      // The sea of cloud he climbed through, lying on the lower slope and round the feet of the other peaks.
      if (sea > 0) inversion(scr, Y(cfg.sea[0]), camX, t, sea, 0, sx, 1 - out, x => base + hOf(pts, x + camX - OFF));
      // The blown snow closes over the slope, thinnest around him, and the wands lead through it: the
      // nearest in full colour, the next only as shapes.
      if (kind === 'wands' && me.ph === 'up') {
        veil(scr, white, [R.snow[3], R.snow[4]], sx, sy - 12);
        for (let wx = 20; wx < SXr; wx += 38) {
          if (xingAt(cfg, wx, 8)) continue;
          const away = Math.abs(wx - me.x), ghost = white > 0.35 && away > 60; if (white > 0.35 && away > 132) continue;
          const wy = hOf(pts, wx); if (sea > 0.5 && wy > cfg.sea[0] + 6 && away > 60) continue; for (let j = 1; j < 15; j++) scr.set(X(wx), Y(wy - j), ghost ? R.snow[2] : R.wood[3]);
          const fl = Math.floor(t * (6 + 6 * gust) + wx) & 1; for (let i = 1; i < 5; i++) for (let j = 0; j < 3; j++) scr.set(X(wx) - i, Y(wy - 15 + j + (fl && i > 2 ? 1 : 0)), ghost ? R.snow[2] : R.blaze[j === 0 ? 2 : 1]);
          scr.set(X(wx), Y(wy - 15), ghost ? R.snow[2] : R.wood[4]);
        }
      }

      // Himself.
      const T = cfg.zig ? figT : null;
      const d = me.x, stopId = env.shown && !env.moving ? env.shown : null, acting = me.ph === 'up' && (kind === 'bridge' ? !!bino : u < (BUSY[kind] || 0));
      let bm, flip = false, dy = 0, dx = 0;
      if (acting && kind === 'bridge') {
        // He walks over to the binoculars, leans in, and afterwards walks back.
        dx = 10 * (shut < 0 ? smooth(0, 0.5, u) : 1 - smooth(0.65, 1.15, shut));
        if (u < 0.5 || shut > 0.65) { bm = fig.walk[Math.floor(dx / 2.4) % 6]; flip = shut > 0.65; } else bm = u < 0.62 || shut > 0.55 ? fig.watch : fig.peer;
      } else if (acting && kind === 'icefall') {
        dx = 6 * (smooth(0, 0.12, u) - smooth(1.3, 1.5, u));
        bm = u < 0.12 ? fig.walk[1] : u < 0.36 ? fig.hit[0] : u < 0.62 ? fig.hit[1] : fig.watch;
      } else if (stopId || me.mode === 'stand') {
        bm = (T || fig).stand;
        if (u < 5) { if (kind === 'run' && u > 0.4 && u < 4.2) { bm = null; scr.put(figT.press[Math.floor((u - 0.4) * 1.6) & 1], X(SXr + 24), Y(hOf(pts, SXr + 24) - 4), false); } else if (kind === 'wands' && u < 1.2) bm = fig.hit[u > 0.35 && u < 0.7 ? 1 : 0]; else if (kind === 'ridge' || kind === 'ladder') bm = u > 3 ? fig.cheer : fig.stand; }
      } else if (me.mode === 'sit') { bm = (T || fig).sit[Math.floor(t * 8) & 1]; flip = true; dy = 2; for (let k = 0; k < 14; k++) { const a = frac(t * 2.4 + k / 14); scr.set(Math.round(sx + 6 + a * 30 + hash(k, 1, 251) * 6), Math.round(sy - 2 - a * (8 + hash(k, 2, 251) * 16) + a * a * 10), a < 0.6 ? R.white[1] : R.snow[3]); } }
      else if (me.mode === 'look') { bm = fig.peer2; flip = !!me.back; }
      else if (me.mode === 'climb' || (me.mode === 'clip' && wallAt(cfg, me.x))) { const w = wallAt(cfg, me.x); bm = fig.climb[me.mode === 'clip' ? 0 : Math.floor(-me.y / 5) & 1]; dx = X(w[0] - 5) - sx; }
      else if (me.mode === 'clip') bm = fig.reach;
      else if (me.mode === 'edge') bm = fig.edge[env.moving ? Math.floor(Math.abs(d) / 3.6) % 6 : 1];
      else if (me.mode === 'astride') { bm = fig.astride[env.moving ? Math.floor(Math.abs(d) / 2.5) & 1 : 0]; dy = 7; }
      else if (me.mode === 'beep') { bm = figT.wrist; if (me.u > 0.2 && me.u < 0.75 && (Math.floor(t * 8) & 1)) { scr.set(sx + 5, sy - 13, R.teal[2]); scr.set(sx + 6, sy - 13, R.white[1]); } breath(scr, sx + 6, sy - 16, t, 0.8); }
      else if (me.mode === 'ice') {
        const p = me.pose, w = me.leg.w;
        scr.put(iceFig(p), X(p.rx), Y(p.ry), false);
        // Chips of ice fly from every placement, a bigger piece when a foot skates off.
        for (const h of me.leg.hit) { const a = tau - h.t; if (a < 0 || a > 0.5) continue; for (let k = 0; k < (h.big ? 9 : 5); k++) { const r1 = hash(k, Math.round(h.t * 40), 271), r2 = hash(k, Math.round(h.t * 40), 272), px = w.xc + h.side * (h.tool ? 6 : 5) + (r1 - 0.5 + 0.25 * h.side) * 44 * a, py = w.ya - h.h - (4 + 26 * r2) * a + 120 * a * a, c = k % 3 === 0 ? R.glac[1] : k & 1 ? R.white[1] : R.glac[5]; scr.set(X(px), Y(py), c); if (h.big && k < 4) { scr.set(X(px) + 1, Y(py), R.glac[5]); scr.set(X(px), Y(py) + 1, R.glac[1]); } } }
      }
      else if (me.mode === 'wait') bm = me.u < 0.06 || me.u > 0.95 ? fig.shelter : fig.phone;
      else if (me.mode === 'scramble' || me.mode === 'ledge') bm = fig[me.mode][env.moving ? Math.floor(Math.abs(d) / 3) & 3 : 0];
      else if (me.mode === 'jump') bm = fig.jump;
      else if (me.mode === 'crawl') bm = fig.crawl[Math.floor(d / 4) & 1];
      else if (T) {
        // Running, in his running kit: a puff of dust behind his heel at each stride.
        const run = me.d != null ? me.d : Math.abs(d); bm = env.moving ? T.run[Math.floor(run / 4.5) % 6] : T.idle; flip = !!me.back;
        if (env.moving && me.mode === 'run') { const a = frac(run / 13.5), s = flip ? 1 : -1; if (a < 0.5) for (let k = 0; k < 3; k++) scr.set(sx + s * Math.round(5 + a * 10 + k * 2), sy - Math.round(a * 6 + hash(k, Math.floor(run / 13.5), 297) * 3), R.dirt[a < 0.25 ? 3 : 4]); }
      }
      else if (cfg.wait && me.ph === 'up') bm = fig.hike[env.moving ? Math.floor(Math.abs(d) / 3.6) % 6 : 1];
      else { const rimed = cfg.brk && me.ph === 'up'; bm = ((me.mode === 'wind' && windK > 0.25) || (gust > 0.3 && up < 0.9) ? (rimed ? fig.windR : fig.wind) : (rimed ? fig.walkR : fig.walk))[env.moving ? Math.floor(Math.abs(d) / 3.6) % 6 : 1]; flip = !!me.back; }
      if (bm) { scr.put(bm, sx + Math.round(dx), sy + dy, flip); }
      if (me.cut != null) whiteOut(scr, smooth(0, 0.35, me.cut) * (1 - smooth(0.65, 1, me.cut)));
      if (cfg.cable && me.ph === 'up') lanyards(scr, X, Y, cfg, pts, pl, arc(id), xAt, arcAt, tau, sx + Math.round(dx), sy + dy, me);
      focus.x = sx; focus.y = sy - 14;
      // His watch, in the corner of the picture for the whole run and for as long as he is on top.
      if (cfg.zig && me.ph === 'up' && tau > T_UP * 0.6) {
        const k = scr.narrow ? 2 : 1, wx = 12, wy = scr.narrow ? 54 : 30, prog = clamp((tau - T_UP) / (pl.tRun - T_UP), 0, 1);
        const w = { lap: me.lap || (prog < 0.5 ? 1 : cfg.zig.length - 1), secs: prog * 1640, bpm: Math.round(94 + 82 * Math.pow(prog, 0.7) + 2 * Math.sin(t * 1.7)), prog, sync: tau < pl.tRun ? -1 : (tau - pl.tRun) / cfg.beep };
        watchFace(k === 1 ? scr : { set: (i, j, c) => { const x = wx + (i - wx) * 2, y = wy + (j - wy) * 2; scr.set(x, y, c); scr.set(x + 1, y, c); scr.set(x, y + 1, c); scr.set(x + 1, y + 1, c); } }, wx, wy, w, t);
      }
      // His phone's screen, shown large beside him while he reads it, with a line down to the phone itself.
      if (me.mode === 'wait' && me.u > 0.1 && me.u < 0.93) {
        // On a narrow screen a scene pixel is too small to read letters by, so it is drawn at twice the size.
        const k = scr.narrow ? 2 : 1, px = clamp(sx + 24, 3, VW - PHONE.w * k - 3), py = clamp(sy - PHONE.h * k - 26, 22, VH - PHONE.h * k - 4);
        for (let n = 1; n < 9; n++) scr.set(Math.round(lerp(sx + 8, px + 4, n / 9)), Math.round(lerp(sy - 15, py + PHONE.h * k, n / 9)), n & 1 ? INK : R.white[1]);
        phoneApp(k === 1 ? scr : { set: (i, j, c) => { const x = px + (i - px) * 2, y = py + (j - py) * 2; scr.set(x, y, c); scr.set(x + 1, y, c); scr.set(x, y + 1, c); scr.set(x + 1, y + 1, c); } }, px, py, (me.u - 0.1) / 0.83, t);
      }
      if (bird) scr.put(bird.bm, bird.x, bird.y, bird.left);
      if (env.done['spire:' + id] && me.ph === 'up') scr.blit(flag[Math.floor(t * 5) & 1], X(SXr + 4), Y(hOf(pts, SXr + 4)) - 15);

      // Spindrift tearing across the ridge until the weather breaks.
      if (windK > 0) for (let k = 0; k < 90 * windK; k++) { const x = Math.round(((hash(k, 1, 252) * (VW + 80) - t * (180 + hash(k, 3, 252) * 140)) % (VW + 80) + VW + 80) % (VW + 80)) - 40, y = Math.round(hash(k, 2, 252) * VH + 6 * Math.sin(t * 3 + k)); for (let i = 0; i < 3 + (k & 3); i++) scr.set(x + i, y, R.white[1]); }
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
      // Through the binoculars: the picture closes on the eyepiece and opens on the Trailhead far below as a
      // round view centred on the cats. It stays until he is done looking: the arrows, WASD or a drag move
      // it within a box round the cats, and space or the BACK button under it closes it again.
      if (bino && u > 0.7 && shut < 0.65) {
        const ex = X(tx - 8), ey = Y(ty - 23), all = Math.hypot(VW, VH);
        if (u < 1.05) scr.iris(ex, ey, all * (1 - smooth(0.7, 1.05, u)) - 4);
        else if (shut < 0.3) {
          const vx = Math.round(scr.narrow ? VW * 0.5 : VW * 0.64), vy = Math.round(scr.narrow ? VH * 0.24 : VH * 0.42), r = scr.narrow ? Math.min(VW * 0.42, VH * 0.2) : Math.min(VH * 0.34, VW * 0.2);
          const K = bino.keys, L = env.look; L.x = clamp(L.x + ((K.r ? 1 : 0) - (K.l ? 1 : 0)) * VIEW.speed * env.dt, VIEW.x0, VIEW.x1); L.y = clamp(L.y + ((K.d ? 1 : 0) - (K.u ? 1 : 0)) * VIEW.speed * env.dt, VIEW.y0, VIEW.y1);
          env.lookBox = VIEW;
          if (env.mapStill) env.mapStill(Math.round(JUNCTION.x + 12 - vx + clamp(L.x, VIEW.x0, VIEW.x1) + 2 * Math.sin(u * 0.9)), Math.round(JUNCTION.y - 10 - vy + clamp(L.y, VIEW.y0, VIEW.y1) + Math.cos(u * 0.7))); else fb.fill(R.navy[0]);
          scr.iris(vx, vy, r * Math.min(smooth(1.05, VIEW.open, u), shut < 0 ? 1 : 1 - smooth(0, 0.3, shut)) - 2);
          if (u > VIEW.open && shut < 0) last.back = viewerUI(scr, vx, Math.round(vy + r) + 7, scr.narrow ? 2 : 1);
        } else scr.iris(ex, ey, all * smooth(0.3, 0.65, shut) - 4);
      }
    }
  };
}
