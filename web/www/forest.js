// Reflection Lake, part one: the run through the rainforest, seen from the side. Giant mossy trunks
// stand on the bank behind the trail, a dark stream mirrors them in front of it, and the light
// comes down through the canopy in slanting shafts. He runs right to left, the way the map sends him
// in: west, away from the Trailhead.
import { covered, TAU, clamp, lerp, smooth, frac, sq, rng, hash, vnoise, fbm, bayer, R, DAY, INK, LIGHT, SHADE, pick, BM, outline, disc, windAt, veilTable, saw } from './core.js';
import { Strip, drawStrip, blitTall, baseline, shell, puffs } from './side.js';
import { makeMaple, makeSpruce, makeFir, makeConifer, makeBoulder } from './sprites.js';
import { elk, sasquatch, jay, slug, owl } from './fauna.js';
import { makeRunner, sideFig } from './tj.js';
import { NAMES } from './content.js';

const SW = 1640, UP = 480, DOWN = 240;
const X0 = SW - 500, LEN = 640;
const D_SIGN = 300, D_SLUG = 372, D_ELK = 452, D_GIANT = 524, D_STUMP = 132;
let sasquatchSeen = false;

// How far the forest has thinned out: 0 in the thick of it, 1 where it ends at the lake, and 1 again
// behind where he comes in from the meadow, so he is seen entering it.
const thinAt = x => Math.max(smooth(660, 380, x), smooth(1040, 1330, x));
// The far layers thin out over the last third of the way to the lake (I1), sooner than the giants do.
const farThin = x => Math.max(smooth(X0 - LEN * 2 / 3, X0 - LEN - 30, x), smooth(1040, 1330, x));
// The line he runs along rolls a little.
const g = x => Math.round(5 * Math.sin(x / 97) + 3 * Math.sin(x / 41 + 2));
const farBank = x => 17 + Math.round(2.5 * Math.sin(x / 23) + 2 * vnoise(x / 9, 1, 81));
const nearBank = x => 60 + Math.round(5 * Math.sin(x / 31 + 1) + 4 * vnoise(x / 13, 2, 82));
// Shafts of light slant down from the upper left and land on the ground in bands.
const beamAt = c => { const k = Math.floor(c / 118), o = hash(k, 3, 83) * 60, w = 12 + hash(k, 4, 83) * 22, d = Math.abs(c - k * 118 - 30 - o); return hash(k, 5, 83) < 0.2 ? 0 : d < w * 0.5 ? 2 : d < w ? 1 : 0; };
// The same shafts in the air (issue #36): 3 at the core, 2 at the edge, 1 in the soft glow round each, and 0
// outside. Each one brightens and dims on its own slow clock as the crowns move in the wind far overhead.
const shaftAt = (c, t) => { const k = Math.floor(c / 118); if (hash(k, 5, 83) < 0.2) return 0;
  const o = hash(k, 3, 83) * 60, w = 12 + hash(k, 4, 83) * 22, d = Math.abs(c - k * 118 - 30 - o), dim = Math.sin(t * 0.35 + k * 2.3) < -0.55 ? 1 : 0;
  return Math.max(0, (d < w * 0.5 ? 3 : d < w ? 2 : d < w * 1.8 ? 1 : 0) - dim); };

// The climb at the forest's end (round 6, note 12). The trail runs on along the foot of the lake's bench,
// crosses the channel of the lake's outflow fall on a log footbridge, and stops at FOOT, just west of the fall.
// From there it climbs the forested slope beside the fall in three legs of stone and root steps, tops out on the
// bench heading west, and walks the rim east through the trees and over the outflow's lip on a second footbridge
// (the one the map shows at the lake's outlet), which is the way the lakeshore is walked. Rock shows only in the
// gorge the fall has cut and in a few outcrops; the bench's east end falls away into the forest.
// FALL: the fall's column. RIM: the top of the bench at x. ZIG: the corners. STEP: how long each step is.
// along(d): where he is d pixels into the scene, as
// [x, y, facing (-1 left, 1 right), leg (0 the forest run, 1 to 3 the legs, 4 the rim)].
const FOOT = X0 - 678, FALL = FOOT + 24, RUN = X0 - FOOT, CW = 700, LEDGE = -56, TOP_X = 560, STEP = 6;
const RIM = x => -114 - Math.round(2 * Math.sin(x / 23) + 1.5 * Math.sin(x / 9)) + Math.round(86 * smooth(572, 690, x));
const ZIG = [[FOOT, g(FOOT)], [FOOT - 72, -40], [FOOT - 12, -78], [FOOT - 90, RIM(FOOT - 90)]], RIM0 = ZIG[3][0];
const ZLEN = ZIG.slice(1).map((b, i) => Math.hypot(b[0] - ZIG[i][0], b[1] - ZIG[i][1]));
const TOTAL = RUN + ZLEN.reduce((a, b) => a + b, 0) + TOP_X - RIM0, DUR = 8.2 * TOTAL / LEN;
// The tread of leg i at x: flat for each step, rising a step at a time, so his feet land on the stones.
const stepY = (i, x) => { const a = ZIG[i], b = ZIG[i + 1], run = Math.abs(b[0] - a[0]), k = Math.min(Math.floor(Math.abs(x - a[0]) / STEP), Math.ceil(run / STEP) - 1); return Math.round(a[1] + (b[1] - a[1]) * Math.min(1, (k + 0.5) * STEP / run)); };
function along(d) {
  if (d <= RUN) { const x = X0 - d; return [x, g(x), -1, 0]; }
  let r = d - RUN;
  for (let i = 0; i < ZLEN.length; i++) { if (r <= ZLEN[i]) { const u = r / ZLEN[i], a = ZIG[i], b = ZIG[i + 1], x = a[0] + (b[0] - a[0]) * u; return [x, stepY(i, Math.round(x)), b[0] > a[0] ? 1 : -1, i + 1]; } r -= ZLEN[i]; }
  const x = Math.min(TOP_X, RIM0 + r); return [x, RIM(Math.round(x)), 1, ZLEN.length + 1];
}
// The trail's tread seen from the side: three rows of dirt, lit on top, and the shadow of its cut edge under it.
function paintTread(S, x, y) {
  S.set(x, y, pick('dirt', 0.72 + 0.24 * (hash(x, 3, 4010) - 0.5), x, y, 0.7)); S.set(x, y + 1, pick('dirt', 0.4, x, y + 1, 0.7));
  S.set(x, y + 2, hash(x, 5, 4010) < 0.2 ? R.moss[3] : R.dirt[0]); S.set(x, y + 3, R.rock[0]); if (hash(x >> 1, 6, 4010) < 0.5) S.set(x, y + 4, R.rock[0]);
  if (hash(x, 7, 4010) < 0.07) S.set(x, y, R.rock[3]);
}
// One leg of the climb: a step every STEP pixels, each a flat stone set in the slope (lit on top, its face in
// shade) or a root across the path holding back the dirt behind it, with the earth of the slope under each.
// A landing at the leg's end: a few pixels of flat dirt past the corner, kept by a stone on its outer edge.
function paintLeg(S, i, only = () => true) {
  const a = ZIG[i], b = ZIG[i + 1], dir = b[0] > a[0] ? 1 : -1, run = Math.abs(b[0] - a[0]);
  for (let s = 0; s <= run; s++) { const x = a[0] + dir * s; if (!only(x)) continue;
    const y = stepY(i, x), k = Math.floor(s / STEP), e = s - k * STEP, stone = hash(k, i, 4016) < 0.6, prev = s >= STEP ? stepY(i, x - dir * STEP) : y;
    for (let j = 0; j < 6; j++) S.set(x, y + j, j < 3 ? R.dirt[j === 0 ? 2 : 1] : pick('moss', 0.2, x, y + j, 0.8));
    if (stone) { const face = e === 0 || e === STEP - 1; S.set(x, y, face ? R.rock[2] : R.rock[3]); S.set(x, y + 1, R.rock[face ? 1 : 2]); S.set(x, y + 2, R.rock[1]); S.set(x, y + 3, R.rock[0]); }
    else if (e < 2) { S.set(x, y - 1, R.bark[2]); S.set(x, y, R.bark[e ? 1 : 2]); S.set(x, y + 1, R.bark[0]); }
    // The riser down to the step before: the stone's or the root's shaded face.
    if (e === 0 && prev > y) for (let j = y; j <= prev; j++) S.set(x - dir, j, stone ? R.rock[1] : R.bark[1]);
  }
  if (i < ZIG.length - 2) for (let s = 1; s <= 7; s++) { const x = b[0] + dir * s, y = stepY(i, b[0]); if (!only(x)) continue;
    paintTread(S, x, y); if (s >= 6) { S.set(x, y - 1, R.rock[3]); S.set(x, y - 2, R.rock[2]); S.set(x, y, R.rock[2]); } }
}
// Whether x, y on the bench's face is the gorge the fall has cut (rock), a little wider at the top.
const gorgeAt = (x, y) => Math.abs(x - FALL - 3 - 2 * Math.sin(y / 17)) - (20 + 7 * vnoise(y / 11, 1, 4050) + 6 * smooth(-30, -100, y) + (x > FALL ? 3 : 0));
// Whether a spot is near the climb's tread (above it by up to above pixels, or just under it).
const nearTread = (x, y, above = 30) => ZIG.slice(1).some((b, i) => { const a = ZIG[i], lo = Math.min(a[0], b[0]) - 12, hi = Math.max(a[0], b[0]) + 12; if (x < lo || x > hi) return false; const ty = stepY(i, clamp(x, lo + 12, hi - 12)); return y > ty - above && y < ty + 9; });
// The bench's face, painted once. In the gorge: bedded, jointed rock with moss on its ledges and wet moss by the
// fall, darker where the slope's edge shades it. Elsewhere: the forest floor on a steep slope (moss, needle duff,
// bare dirt where it has slipped, roots across it and the odd stone), turf on the rim with moss hanging over, and a
// few outcrops of the same rock. Then the three legs, the rim's tread and the fall, which lands on a ledge half
// way and falls again. Returns the strip, the fall's pixels (each column streams at its own length p and phase o;
// e marks its edges), where the spray rises (foam), and spots on the slope for ferns (perches).
function buildCrag() {
  const S = new Strip(CW, 200, 24), bedOf = (x, y) => (y + 13 * vnoise(x / 64, 2, 4002) + 5 * vnoise(x / 17, y / 34, 4008)) / 15;
  const fallX = y => (y < LEDGE ? FALL : FALL + 5) + Math.round(2 * Math.sin(y / 13));
  const rockAt = (x, y) => gorgeAt(x, y) < 0 || (fbm(x / 26, y / 16, 4051, 3) > 0.71 && y < -16 && !nearTread(x, y, 40));
  for (let x = 0; x < CW; x++) {
    const rim = RIM(x) + (Math.abs(x - FALL) < 9 ? 3 : 0), hang = 3 + Math.round(hash(x, 1, 4006) * hash(x >> 1, 2, 4006) * 14);
    for (let y = rim; y < 24; y++) {
      const d = y - rim; let c;
      if (d < 2) c = R.moss[5 - d];
      else if (rockAt(x, y)) {
        // Beds of uneven thickness (one ledge line in three is missing, so some beds are twice as thick), each
        // lit along its top and dark under the ledge above; joints at uneven gaps, leaning a little, one bed tall.
        const bo = bedOf(x, y), bi = Math.floor(bo), ledge = hash(bi, 1, 4009) > 0.34, bed = bo - bi, jx = x + (y * 0.3) * (hash(bi, 2, 4009) - 0.5);
        const joint = hash(Math.floor(jx / 3), bi, 4003) < 0.085 && frac(jx / 3) < 0.34, wet = smooth(16, 5, Math.abs(x - fallX(y)));
        const edge = smooth(-4, 0, gorgeAt(x, y)) * (gorgeAt(x, y) < 0.5 ? 1 : 0), mossy = fbm(x / 16, y / 9, 4005, 3) + (ledge && bed < 0.2 ? 0.2 : 0) + wet * 0.22 + 0.14 * smooth(-34, 6, y) + 0.1 * smooth(14, 0, d);
        if (d < hang && hash(x, 3, 4006) < 0.45) c = R.moss[d < 4 ? 4 : 3];
        else if (mossy > 0.62) c = pick('moss', 0.22 + (mossy - 0.62) * 1.5 + (ledge && bed < 0.12 ? 0.16 : 0) - edge * 0.2, x, y, 0.8);
        else c = pick('rock', 0.31 + 0.3 * (fbm(x / 22, y / 11, 4004, 3) - 0.5) + 0.14 * (vnoise(x / 80, y / 44, 4015) - 0.5) + (ledge ? (bed < 0.08 ? 0.24 : bed > 0.8 ? -0.9 * (bed - 0.8) : 0) : 0) - (joint ? 0.2 : 0) - wet * 0.12 - 0.1 * smooth(-30, 14, y) - edge * 0.25, x, y, 0.8);
      } else {
        // The slope: moss in drifts with needle duff between, a slip of bare dirt here and there, a root
        // snaking across, a stone. Darker low down, where the canopy closes over it.
        const m = fbm(x / 11, y / 6, 4052, 3), slip = vnoise(x / 9, y / 5, 4053), ry = y + 4 * Math.sin(x / 13 + hash(x >> 6, 1, 4054) * 6), band = Math.round(ry / 11), root = Math.abs(ry - band * 11);
        const shade = 0.12 * smooth(-60, 20, y) + 0.1 * smooth(3, -1, gorgeAt(x, y));
        if (d < hang && hash(x, 3, 4006) < 0.3) c = R.moss[d < 4 ? 4 : 3];
        else if (root < 0.6 && hash(Math.floor(x / 9), band, 4055) < 0.3) c = R.bark[hash(x, y, 4056) < 0.5 ? 1 : 2];
        else if (slip > 0.77) c = pick('dirt', 0.2 + 0.2 * (m - 0.5) - shade, x, y, 0.7);
        else if (hash(x, y, 4057) < 0.012) c = R.rock[2];
        else if (m < 0.33) c = hash(x, y, 4058) < 0.25 ? R.bark[0] : R.moss[1];
        else c = pick('moss', 0.34 + 0.5 * (m - 0.5) - shade, x, y, 0.8);
      }
      S.set(x, y, c);
    }
  }
  for (let i = 0; i < ZIG.length - 1; i++) paintLeg(S, i);
  for (let x = RIM0 - 6; x < CW; x++) if (S.get(x, RIM(x) + 8)) paintTread(S, x, RIM(x));
  // The footbridge over the outflow's lip: planks on two logs, a post at each end and a handrail.
  for (let x = FALL - 13; x <= FALL + 13; x++) { const y = RIM(x), end = Math.abs(x - FALL) === 13;
    for (let j = 3; j < 8; j++) S.set(x, y + j, 0);
    S.set(x, y - 1, 0); S.set(x, y, (x - FALL + 40) % 3 === 0 ? R.wood[2] : R.wood[3]); S.set(x, y + 1, R.wood[1]); S.set(x, y + 2, R.wood[0]);
    if (end) for (let j = 1; j < 8; j++) S.set(x, y - j, R.wood[1]); else S.set(x, y - 7, R.wood[2]); }
  const F = { x: [], y: [], o: [], p: [], e: [], foam: [[FALL + 2, LEDGE, 6], [FALL + 5, -7, 12]] };
  for (let y = RIM(FALL) + 3; y <= -6; y++) { const hw = (y < LEDGE ? 4 : 6) + (Math.abs(y - LEDGE) < 3 ? 3 : 0) - (y < RIM(FALL) + 7 ? 1 : 0), cx = fallX(y);
    for (let dx = -hw; dx <= hw; dx++) { const x = cx + dx; S.set(x, y, R.white[1]); F.x.push(x); F.y.push(y); F.o.push(hash(x, 0, 4012)); F.p.push(7 + hash(x, 1, 4013) * 6); F.e.push(Math.abs(dx) >= hw ? 1 : 0); } }
  // Ferns on the slope wherever the ground is earth, clear of the tread and the gorge.
  const perches = [];
  for (let n = 0; n < 160 && perches.length < 34; n++) { const x = 8 + Math.round(hash(n, 1, 4014) * (CW - 20)), y = Math.round(lerp(RIM(x) + 10, -10, hash(n, 2, 4014)));
    if (y >= -8 || rockAt(x, y) || rockAt(x, y + 3) || gorgeAt(x, y) < 6 || nearTread(x, y) || perches.some(q => Math.abs(q[0] - x) < 18 && Math.abs(q[1] - y) < 10)) continue; perches.push([x, y, n % 3]); }
  return { S, F, perches, rockAt };
}
// The rock band on the screen. It does not wrap: it stands at the forest's west end only.
function drawCrag(scr, S, camX, base) {
  const { VW, VH, fb } = scr, x0 = Math.max(0, -camX), x1 = Math.min(VW, S.w - camX);
  for (let y = Math.max(0, base - S.up), y1 = Math.min(VH, base - S.up + S.h); y < y1; y++) { const row = y * VW, si = (y - base + S.up) * S.w + camX;
    for (let x = x0; x < x1; x++) { const c = S.d[si + x]; if (c) fb[row + x] = c; } }
}
// The fall moves as the map's falls do: white water in streaks that slide down, bluer at its edges, and spray
// that jumps where it lands (on the ledge, and in the pool at its foot).
function fallWater(scr, camX, base, t, F) {
  const { VW, VH, fb } = scr, W1 = R.white[1], W4 = R.water[4], W3 = R.water[3], sh = t * 30;
  for (let k = 0; k < F.x.length; k++) { const sx = F.x[k] - camX, sy = F.y[k] + base; if (sx < 0 || sy < 0 || sx >= VW || sy >= VH) continue;
    const u = frac((F.y[k] - sh) / F.p[k] + F.o[k]); fb[sy * VW + sx] = u < (F.e[k] ? 0.45 : 0.7) ? W1 : u < 0.9 ? W4 : W3; }
  const beat = Math.floor(t * 8);
  for (const [x, y, r] of F.foam) for (let n = 0; n < r * 5; n++) { const a = hash(n, beat, 4031) * Math.PI, d = Math.sqrt(hash(n, beat, 4032)) * r, px = Math.round(x + Math.cos(a) * d * 1.3) - camX, py = Math.round(y - Math.sin(a) * d * 0.8) + base;
    if (px >= 0 && px < VW && py >= 0 && py < VH) fb[py * VW + px] = hash(n, 3, 4033) < 0.6 ? W1 : R.pool[6]; }
}
// The outflow's last few yards: how far (x, r rows below the trail's line) lies outside the channel that runs
// from the pool at the fall's foot across to the creek. Negative inside it.
const chanD = (x, r) => x < FALL - 31 || x > FALL + 39 || r >= farBank(x) ? 9 : Math.abs(x - FALL - 3 - (r + 6) * 0.2) - (13 - 4 * smooth(-8, 6, r) + 5 * smooth(9, 17, r) + 1.5 * (vnoise(r / 5, 3, 4040) - 0.5));

// A sword fern: fronds arching out of one crown, each a spine with leaflets either side.
function swordFern(seed, r) {
  const rand = rng(seed), W = Math.ceil(r * 2.5) + 6, H = Math.ceil(r * 1.2) + 5, b = new BM(W, H); b.ox = W >> 1; b.oy = H - 2;
  const n = r > 12 ? 11 : r > 7 ? 9 : 7, fr = [];
  for (let k = 0; k < n; k++) fr.push(-1.3 + 2.6 * (k + (rand() - 0.5) * 0.5) / (n - 1));
  fr.sort((a, c) => Math.abs(c) - Math.abs(a));
  for (const a of fr) {
    const len = r * (0.85 + rand() * 0.3);
    for (let s = 1; s <= len; s++) {
      const t = s / len, ang = a * (0.5 + 0.95 * t);
      const x = b.ox + Math.sin(ang) * s, y = b.oy - Math.cos(ang) * s * (1 - 0.3 * t * Math.abs(a));
      const nx = Math.cos(ang), ny = Math.sin(ang), pl = Math.max(0.6, (1 - Math.abs(t - 0.4) * 1.5) * r * 0.2);
      if (s > 1) for (let j = 1; j <= pl; j++) {
        if ((s + j) & 1) b.set(x + nx * j, y + ny * j, R.moss[t > 0.55 ? 6 : 5]);
        else b.set(x - nx * j, y - ny * j, R.moss[a < 0 ? 4 : 3]);
      }
      b.set(x, y, R.moss[a < 0.2 ? 4 : 3]);
    }
  }
  outline(b, R.moss[1]);
  return b;
}

// One giant: a buttressed trunk that runs off the top of the screen, bark in long ridges, moss
// thick at the base and in patches up the lit side, roots spreading over the ground.
function makeTrunk(seed, w, H) {
  const rand = rng(seed), pad = Math.round(w * 1.1) + 20, W = w + pad * 2, b = new BM(W, H + 7); b.ox = W >> 1; b.oy = H;
  const cx = b.ox, lean = (rand() - 0.5) * 0.04, cedar = rand() < 0.4;
  for (let y = 0; y <= H + 2; y++) {
    const up = H - y;
    const hw = w / 2 + w * 0.5 * Math.exp(-up / (w * 0.45)) + w * 0.16 * Math.exp(-up / (w * 1.8)) + 0.9 * (vnoise(y / 11, seed, 3) - 0.5);
    const x0 = cx + lean * up;
    for (let dx = -Math.ceil(hw); dx <= Math.ceil(hw); dx++) {
      const u = dx / hw; if (Math.abs(u) > 1) continue;
      const x = Math.round(x0 + dx);
      const ridge = vnoise((dx + 5 * vnoise(y / 44, seed, 5)) / (cedar ? 1.5 : 2.3), y / (cedar ? 70 : 28), seed + 7);
      const v = 0.58 - 0.4 * u - 0.2 * u * u + 0.48 * (ridge - 0.5);
      // Moss (art pass E01) climbs in strips along the bark's furrows; it is shaded below, once all is laid.
      const m = fbm(x / 5 + seed, y / 46, 31, 3) + 0.14 * (vnoise(x / 3, y / 4, seed + 11) - 0.5) + 0.24 * (0.5 - ridge) + 0.5 * Math.exp(-up / 48) - 0.12 * u;
      if (m > 0.6) b.set(x, y, R.moss[3]);
      else b.set(x, y, pick(cedar ? 'wood' : 'bark', v * (cedar ? 0.8 : 1) + (m > 0.55 ? -0.22 : 0), x, y, 0.8));
    }
  }
  // Each moss cushion lit along its upper left edge, dark along its foot and right side, mid between,
  // and the trunk's own light across it, so the strips stand off the bark.
  { const o = b.d.slice(), M = new Set([R.moss[3]]), isM = (x, y) => M.has(o[y * W + x]);
    for (let y = 1; y < H + 2; y++) for (let x = 1; x < W - 1; x++) { if (!isM(x, y)) continue;
      const u = (x - cx - lean * (H - y)) / (w / 2), top = !isM(x, y - 1) || (u < -0.2 && !isM(x - 1, y)), foot = !isM(x, y + 1) || !isM(x + 1, y);
      const v = 0.48 - 0.3 * u + (top ? 0.26 : 0) - (foot && !top ? 0.24 : 0) + 0.12 * (hash(x, y, 9) - 0.5);
      b.set(x, y, R.moss[clamp(Math.round(v * 6.4), 1, 6)]); } }
  for (const s of [-1, 1]) for (let k = 0; k < 2; k++) {
    const len = w * (0.45 + rand() * 0.6) + 8, y0 = H - 5 - k * 6 - rand() * 3;
    for (let i = 0; i <= len; i++) {
      const t = i / len, x = cx + s * (w * 0.5 + i), y = y0 + (H + 3 - y0) * Math.pow(t, 0.65), th = Math.max(1.5, 5.5 * (1 - t));
      for (let j = 0; j < th; j++) b.set(x, y + j, j < 1.3 ? R.moss[s < 0 ? 5 : 4] : j < 2.6 ? R.moss[3] : R.bark[1]);
    }
  }
  // Licorice ferns and bracket fungus on the bark.
  for (let k = 0; k < 5; k++) {
    const y = H - 30 - rand() * (H - 60), s = rand() < 0.5 ? -1 : 1, x = cx + lean * (H - y) + s * (w / 2 - 1);
    if (rand() < 0.6) for (let j = 0; j < 4; j++) { b.set(x + s * j, y - j * 0.4 + (j > 2 ? 1 : 0), R.moss[5]); if (j & 1) b.set(x + s * j, y - j * 0.4 - 1, R.moss[6]); }
    else for (let n = 0; n < 3; n++) { const len = 5 - n, yy = y + n * 4; for (let j = 0; j < len; j++) { b.set(x + s * j, yy, R.white[1]); b.set(x + s * j, yy + 1, R.ochre[j < len - 1 ? 2 : 1]); } for (let j = 0; j < len - 2; j++) b.set(x + s * j, yy + 2, R.bark[0]); }
  }
  outline(b, INK);
  return b;
}

// A limb reaching out from a trunk, moss piled along its top and hanging from it in curtains.
function makeLimb(seed, len, dir) {
  const rand = rng(seed), b = new BM(len + 6, 46); b.ox = dir > 0 ? 2 : len + 3; b.oy = 16;
  const rise = 4 + rand() * 9;
  for (let i = 0; i <= len; i++) {
    const t = i / len, x = b.ox + dir * i, y = 16 - Math.sin(t * 2.2) * rise + t * t * 7, th = Math.max(1.2, 5 * (1 - t * 0.85));
    for (let j = 0; j < th; j++) b.set(x, y + j, j < 1.4 ? R.moss[5] : j < 2.6 ? R.moss[3] : R.bark[1]);
    if (i > 5 && hash(i, seed, 1) < 0.36) { const dl = 3 + hash(i, seed, 2) * (16 - t * 8); for (let j = 0; j < dl; j++) b.set(x, y + th + j, j > dl - 2 ? R.moss[6] : hash(i, j, 3) < 0.5 ? R.moss[4] : R.moss[5]); }
    if (i > 8 && hash(i, seed, 4) < 0.1) { b.set(x, y - 1, R.moss[6]); b.set(x + 1, y - 2, R.moss[5]); b.set(x - 1, y - 2, R.moss[5]); }
  }
  outline(b, R.moss[0]);
  return b;
}

// A nurse log: a fallen giant, soft with moss, raising a row of seedlings and ferns.
function makeNurseLog(seed, len) {
  const rand = rng(seed), b = new BM(len + 8, 40); b.ox = (len + 8) >> 1; b.oy = 38;
  for (let x = 3; x < len + 3; x++) {
    const top = 22 + 2 * vnoise(x / 9, seed, 1), bot = 37;
    for (let y = Math.round(top); y <= bot; y++) {
      const t = (y - top) / (bot - top);
      b.set(x, y, t < 0.3 + 0.2 * vnoise(x / 5, y / 3, seed) ? pick('moss', 0.85 - t * 1.2 + 0.2 * (hash(x, y, 2) - 0.5), x, y) : pick('bark', 0.7 - t * 0.7 + 0.25 * (vnoise(x / 7, y / 1.5, 4) - 0.5), x, y));
    }
  }
  disc(b, len + 2, 30, 7.5, (nx, ny) => { const r = Math.hypot(nx, ny); return r > 0.82 ? R.bark[1] : (Math.floor(r * 5) & 1) ? R.wood[3] : R.wood[2]; });
  for (let k = 0; k < len / 9; k++) {
    const x = 6 + rand() * (len - 14), y = 22 + 2 * vnoise(x / 9, seed, 1), kind = rand();
    if (kind < 0.4) { const h = 5 + rand() * 9; for (let j = 0; j < h; j++) { b.set(x, y - j, R.bark[2]); if (j > 1 && j & 1) { const hw = Math.max(1, (h - j) * 0.45); for (let i = -hw; i <= hw; i++) b.set(x + i, y - j, R.conifer[i < 0 ? 4 : 2]); } } b.set(x, y - h, R.conifer[4]); }
    else if (kind < 0.8) b.set(x, y - 1, R.moss[6]), b.set(x - 1, y - 2, R.moss[5]), b.set(x + 1, y - 2, R.moss[5]), b.set(x - 2, y - 2, R.moss[4]), b.set(x + 2, y - 3, R.moss[5]);
    else { b.set(x, y - 1, R.white[0]); b.set(x, y - 2, R.red[1]); b.set(x - 1, y - 2, R.red[1]); b.set(x + 1, y - 2, R.red[0]); b.set(x, y - 3, R.red[2]); }
  }
  outline(b, INK);
  return b;
}

// Foxfire (E5d): its glowing spots on the log, pale mint at the heart of each cluster, and a dithered
// green light on the log's own pixels round them. fox: [x, y, the log's colour there, cluster].
function foxfireGlow(scr, fox, x0, y0, t, a) {
  for (const [x, y, v, c] of fox) { const sx = x0 + x, sy = y0 + y; if (scr.get(sx, sy) !== v) continue;
    const pulse = 0.5 + 0.5 * Math.sin(t * (0.6 + 0.3 * hash(c, 4, 3304)) + c * 2.1);
    scr.set(sx, sy, pulse * a > 0.45 ? R.foxfire[1] : R.foxfire[0]);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-2, 0], [2, 0]]) { const px = sx + dx, py = sy + dy; const w = scr.get(px, py); if (w && w !== R.foxfire[1] && w !== R.foxfire[0] && bayer(px, py) < 0.35 * a * pulse) scr.set(px, py, R.foxfire[0]); } }
}

function makeStump(seed) {
  const b = new BM(30, 30); b.ox = 15; b.oy = 28;
  for (let y = 10; y <= 28; y++) { const hw = 8 + (y > 22 ? (y - 22) * 0.9 : 0) + vnoise(y / 3, seed, 1); for (let dx = -hw; dx <= hw; dx++) { const u = dx / hw; b.set(15 + dx, y, vnoise((15 + dx) / 4, y / 6, seed) > 0.5 || y < 13 ? pick('moss', 0.6 - u * 0.4, 15 + dx, y) : pick('bark', 0.6 - u * 0.45, 15 + dx, y)); } }
  for (let x = 9; x <= 21; x++) b.set(x, 10 - (hash(x, seed, 2) < 0.4 ? 1 : 0), R.moss[5]);
  b.set(8, 17, INK); b.set(9, 17, INK); b.set(10, 17, R.bark[0]);
  outline(b, INK);
  return b;
}

function makeTrailSign() {
  const b = new BM(26, 30); b.ox = 13; b.oy = 29;
  for (let y = 4; y < 30; y++) { b.set(12, y, R.wood[2]); b.set(13, y, R.wood[1]); }
  const plank = (x0, x1, y, dir) => { for (let x = x0; x <= x1; x++) for (let j = 0; j < 5; j++) b.set(x, y + j, j === 0 ? R.wood[4] : j === 4 ? R.wood[2] : R.wood[3]); const tip = dir < 0 ? x0 - 1 : x1 + 1; for (let j = 1; j < 4; j++) b.set(tip, y + j, R.wood[3]); b.set(tip + dir, y + 2, R.wood[3]); for (let x = x0 + 2; x < x1 - 1; x += 2) b.set(x, y + 2, R.wood[0]); };
  plank(3, 15, 6, -1); plank(10, 22, 13, 1);
  b.set(12, 3, R.wood[4]); b.set(13, 3, R.wood[3]); b.set(12, 29, R.moss[4]); b.set(14, 29, R.moss[5]);
  outline(b, INK);
  return b;
}

export { makeTrunk, makeLimb, swordFern };

// Noise along a strip that joins up where the strip wraps round.
const loopN = (x, W, s, seed) => { const a = x / W * TAU, r = W / (TAU * s); return fbm(Math.cos(a) * r + 40, Math.sin(a) * r + 40, seed, 3); };

// Old man's beard (round 5, T39): a tuft of pale lichen hanging from a limb, widest where it is fastened and
// tapering to a wisp, a little wavy. put(x, y, colour); c is its body and tip is its last two pixels.
function beard(put, x, y, len, half, c, tip, id) {
  for (let dx = -half; dx <= half; dx++) {
    const l = Math.round(len * (1 - Math.abs(dx) / (half + 1)) * (0.65 + 0.35 * hash(dx + 9, id, 771))), ph = hash(id, dx, 772) * 6;
    for (let j = 0; j < l; j++) put(x + dx + Math.round(0.7 * Math.sin(j / 4 + ph)), y + j, j >= l - 2 ? tip : c);
  }
}
// A limb of the middle ground, alive: thick where it leaves the trunk, moss heaped along its top, old man's
// beard hanging from it in tufts. C: { wood, moss, top, beard, tip }.
function mossLimb(put, x0, y0, dir, len, id, C) {
  const yAt = i => y0 - Math.sin(i / len * 2) * 6 + i * i / len * 0.2;
  for (let i = 0; i < len; i++) {
    const yy = Math.round(yAt(i)), th = i < len * 0.35 ? 3 : i < len * 0.75 ? 2 : 1, m = (i < len * 0.5 ? 2 : 1) + (vnoise(i / 3.5, id, 773) > 0.55 ? 1 : 0) - (i > len - 3 ? 1 : 0);
    for (let j = 0; j < th; j++) put(x0 + dir * i, yy + j, C.wood);
    for (let j = 1; j <= m; j++) put(x0 + dir * i, yy - j, j === m ? C.top : C.moss);
  }
  for (let n = 0, nt = 3 + Math.floor(len / 6); n < nt; n++) {
    const i = Math.round(1 + hash(n, id, 774) * (len - 3)), near = 1 - i / len;
    beard(put, x0 + dir * i, Math.round(yAt(i)) + (i < len * 0.35 ? 3 : 2), 6 + hash(n, id, 775) * (10 + 13 * near), hash(n, id, 776) < 0.6 ? 2 : 1, C.beard, C.tip, id * 13 + n);
  }
}
// The rainforest's understory along the middle ground's edge (T39): a sword fern, a clump of salal, or a
// young hemlock with its top nodding over. Each is drawn in the mist's colours, so it stays in the fog.
function midPlant(put, kind, x, gy, rand, C) {
  if (kind === 'fern') {
    const n = 6 + (rand() * 3 | 0), L = 8 + rand() * 6;
    for (let f = 0; f < n; f++) { const a = (-1.25 + 2.5 * (f + 0.5) / n) + (rand() - 0.5) * 0.2, l = L * (0.7 + 0.3 * rand());
      for (let q = 0; q <= l; q++) { const u = q / l, px = x + Math.sin(a) * q, py = gy - Math.cos(a) * q + u * u * l * 0.55; put(px, py, C.moss); if (q > 1 && q % 2 === 0) { put(px, py - 1, C.top); if (q < l - 2) put(px + (a < 0 ? -1 : 1), py + 1, C.moss); } } }
  } else if (kind === 'salal') {
    const rx = 6 + rand() * 6, ry = 4 + rand() * 3;
    for (let dy = -ry * 2; dy <= 0; dy++) for (let dx = -rx; dx <= rx; dx++) { const e = sq(dx / rx) + sq((dy + ry * 0.8) / (ry * 1.25)); if (e > 1) continue; const leaf = ((Math.round(x) + dx) + 2 * (Math.round(gy) + dy)) % 4; put(x + dx, gy + dy, e > 0.75 && hash(dx, dy, 777) < 0.4 ? 0 : leaf === 0 ? C.top : leaf === 1 ? C.moss : C.wood); }
  } else {
    const h = 16 + rand() * 20, nod = rand() < 0.5 ? -1 : 1;
    for (let j = 0; j < h; j++) { const y = gy - h + j, hw = j < 3 ? 0 : 1 + (j - 2) * 0.3 * (j % 5 === 4 ? 0.55 : 1), cx = x + (j < 4 ? nod * (4 - j) * 0.7 : 0);
      for (let i = -Math.round(hw); i <= Math.round(hw); i++) put(cx + i, y + (Math.abs(i) > hw * 0.6 && hw > 1.5 ? 1 : 0), i < -hw * 0.3 ? C.moss : C.wood); }
    put(x, gy, C.wood); put(x, gy + 1, C.wood);
  }
}
// One far layer of the forest. Trunks stand in uneven groups with gaps of light between the groups,
// some of them broken off short. Each layer has its own ground, higher up the view the further off
// it is, with undergrowth and young firs along it; limbs trail moss, boughs hang higher up, and the
// canopy closes over the top with a ragged edge. o.c is [lit side, body] for its distance.
function farLayer(S, seed, o) {
  const rand = rng(seed), W = S.w, [lit, body] = o.c;
  const put = (x, y, c) => S.set(((Math.round(x) % W) + W) % W, y, c);
  const ground = x => o.ground - o.rise * loopN(x, W, 26, seed + 1);
  for (let x = rand() * 20; x < W - o.w[1];) {
    const w = o.w[0] + rand() * (o.w[1] - o.w[0]), lean = (rand() - 0.5) * 0.06, foot = Math.round(ground(x)) + 4, snag = rand() < 0.12, top = snag ? foot - 70 - rand() * 150 : -S.up;
    const at = up => x + lean * up + 1.4 * Math.sin(up / 55 + x);
    for (let y = Math.round(top); y <= foot; y++) {
      // Wider at the foot, a little narrower high up, and never quite straight.
      const up = foot - y, ww = w * (1 - 0.18 * Math.min(1, up / 380)) + w * 0.6 * Math.exp(-up / (w * 1.2)), cx = at(up);
      const x0 = Math.round(cx - ww / 2), x1 = Math.round(cx + ww / 2);
      if (snag && y - top < 5 && hash(x0, y, seed) < 0.6 - (y - top) * 0.1) continue;
      for (let i = x0; i <= x1; i++) put(i, y, i === x0 && ww >= 4 ? lit : body);
    }
    // Limbs droop away from the trunk and trail moss.
    for (let k = 0, n = snag ? 1 : Math.round(o.limbs * (0.4 + 1.2 * rand())); k < n; k++) {
      const up = Math.min(foot - top - 8, 50 + rand() * 300), dir = rand() < 0.5 ? -1 : 1, len = 6 + w * (1.5 + rand() * 2.5);
      // Round 5 (T39): the limb is thick where it leaves the trunk and mossed along its top, and what hangs from it
      // hangs in tufts of old man's beard, not as a comb of single threads. A snag's one limb stays bare.
      const yAt = i => foot - up - Math.sin(i / len * 2) * len * 0.2 + i * i / len * 0.24;
      for (let i = 0; i < len; i++) {
        const yy = yAt(i), lx = at(up) + dir * (w / 2 + i);
        put(lx, yy, body); if (i < len * 0.6 && w > 3) put(lx, yy + 1, body); if (i < len * 0.3 && w > 6) put(lx, yy + 2, body);
        if (!snag && w > 3 && vnoise(i / 3, k, Math.round(x)) > 0.3) put(lx, yy - 1, lit);
      }
      if (!snag) for (let n = 0, nt = Math.round((2 + len / 7) * (0.5 + o.moss * 1.7)); n < nt; n++) {
        const i = Math.round(1 + hash(n, k, Math.round(x) + 5) * (len - 2));
        beard(put, at(up) + dir * (w / 2 + i), Math.round(yAt(i)) + 1, 3 + hash(n, k + 2, Math.round(x)) * (3 + w * 1.3), w > 6 && hash(n, 7, Math.round(x)) < 0.5 ? 2 : w > 3 ? 1 : 0, body, body, Math.round(x) * 7 + k * 3 + n);
      }
    }
    // Boughs: flat sprays of needles, fringed underneath, more of them the higher up.
    if (!snag) for (let k = 0; k < o.boughs; k++) {
      const up = 120 + sq(rand()) * 320, dir = rand() < 0.5 ? -1 : 1, len = 8 + w * (2 + rand() * 3), th = 1.5 + w * 0.22;
      for (let i = -1; i < len; i++) {
        const u = i / len, yy = foot - up + u * u * len * 0.4, lx = at(up) + dir * (w / 2 + i);
        for (let j = 0; j < th * (1 - u * 0.6) + (hash(i, k + 9, Math.round(x)) < 0.45 ? 1 + hash(i, k, 7) * 3 : 0); j++) put(lx, yy + j, body);
      }
    }
    x += rand() < o.open ? o.gap[0] + rand() * (o.gap[1] - o.gap[0]) : o.step[0] + rand() * (o.step[1] - o.step[0]);
  }
  // The ground of this layer, catching the light along its top, with clumps of undergrowth on it.
  for (let x = 0; x < W; x++) {
    const top = Math.round(ground(x) - (hash(x, 1, seed) < 0.3 ? 1 + hash(x, 2, seed) * 2 : 0));
    for (let y = top; y < S.h - S.up; y++) S.set(x, y, y === top ? lit : body);
  }
  for (let n = 0; n < W / 22; n++) {
    const x = rand() * W, r = 2.5 + rand() * (2 + o.w[1] * 0.5), gy = ground(x);
    for (let dy = -r; dy <= 1; dy++) for (let dx = -r * 1.5; dx <= r * 1.5; dx++) if (sq(dx / (r * 1.5)) + sq(dy / r) <= 1) put(x + dx, gy + dy, dy < -r * 0.55 && dx < r * 0.4 ? lit : body);
  }
  // Young firs here and there, each a stack of tiers.
  for (let n = 0; n < W / o.firs; n++) {
    const x = rand() * W, h = (9 + rand() * 16) * (0.6 + o.w[1] / 14), gy = ground(x) + 2;
    for (let j = 0; j < h; j++) { const hw = (j + 1) * 0.3 * (j % 4 === 3 ? 0.6 : 1); for (let i = -Math.round(hw); i <= Math.round(hw); i++) put(x + i, gy - h + j, i === -Math.round(hw) && hw >= 2 ? lit : body); }
  }
  // The canopy: solid at the very top, full of holes towards its lower edge, with strands hanging from it.
  for (let x = 0; x < W; x++) {
    const edge = o.canopy - o.cvar * loopN(x, W, 44, seed + 3);
    for (let y = -S.up; y < edge; y++) {
      const f = xx => fbm(xx / 15, y / 12, seed + 4, 3), v = x > W - 64 ? lerp(f(x), f(x - W), (x - (W - 64)) / 64) : f(x);
      if (v > 0.36 + 0.3 * smooth(edge - 60, edge, y)) S.set(x, y, body);
    }
    if (hash(x, 5, seed) < 0.07) for (let j = 0; j < 4 + hash(x, 6, seed) * 12; j++) S.set(x, edge - 8 + j, body);
  }
}

// Near the lake the far trees give way to open light, in clumps, paler and bluer the nearer the edge;
// low down in the gaps the lake's turquoise shows (I1), its far shore a dark line, glints on it that
// grow thicker toward the end, and the band of water taller as the trees fall away. The lakeward
// side only: behind him at the meadow end there is no lake.
// The marine layer in the forest (round 6, note 13). A veil of fog over the whole view, k from 0 (none) to 1
// (the thickest of the veils V), dithered between its steps.
function fogVeil(scr, k, V) {
  if (k <= 0.01) return;
  const { VW, VH, fb } = scr, L = k * V.length;
  for (let y = 0; y < VH; y++) { const row = y * VW; for (let x = 0; x < VW; x++) { const l = Math.min(V.length, Math.floor(L + bayer(x, y))); if (l > 0) fb[row + x] = V[l - 1][fb[row + x]]; } }
}
// The rain under the canopy: streaks falling steep and fast, leaning a little east, each one a colour of its
// own over what it crosses (pale over dark, grey over pale: S), and rings opening where drops hit the stream.
function rainfall(scr, camX, base, t, k, S) {
  const { VW, VH, fb } = scr, n = Math.round(VW * VH / 520 * k), H = VH + 30, W = VW + 30;
  for (let i = 0; i < n; i++) {
    const sp = 300 + 120 * hash(i, 1, 4070), len = 4 + (hash(i, 2, 4070) * 5 | 0), y0 = frac(t * sp / H + hash(i, 3, 4070)) * H - 15;
    const x0 = ((hash(i, 4, 4070) * W - camX * 1.25 + y0 * 0.16) % W + W) % W - 15;
    for (let j = 0; j < len; j++) { const X = Math.round(x0 + j * 0.16), Y = Math.round(y0 + j); if (X >= 0 && Y >= 0 && X < VW && Y < VH) { const q = Y * VW + X; fb[q] = S[fb[q]]; } }
  }
  const m = Math.round(VW / 9 * k), beat = Math.floor(t * 3);
  for (let i = 0; i < m; i++) {
    const age = frac(t * 3 + hash(i, 5, 4071)), c = beat - (age > frac(t * 3) ? 1 : 0), wx = Math.floor(camX + hash(i, c, 4072) * VW), r = Math.round(age * 3);
    const sy = base + g(wx) + Math.round(lerp(farBank(wx) + 3, nearBank(wx) - 3, hash(i, c, 4073))), sx = wx - camX;
    for (const dx of r ? [-r, r] : [0]) { const X = sx + dx; if (X >= 0 && X < VW && sy >= 0 && sy < VH) fb[sy * VW + X] = LIGHT[fb[sy * VW + X]]; }
  }
}
// The shafts of light over everything (issue #36): each colour under a shaft turned toward the light (T, three
// tables from faint to strong; at sunset W, toward the low sun's gold): the core strongest on every other pixel
// and strong between, the edge on every other pixel, the glow round it faintly on one pixel in four. They fade
// out through a dither as the light goes at Dusk or the marine layer closes over (gone). The shafts' strength at
// each slanted column is worked out once a frame (lut), not at every pixel.
const lut = { a: new Uint8Array(0) };
function shafts(scr, camX, base, t, T, W, warm, gone) {
  const { VW, VH, fb } = scr, off = Math.floor(camX - 0.6 * 16) - 2, n = VW + Math.ceil(0.6 * VH) + 24;
  if (lut.a.length < n) lut.a = new Uint8Array(n);
  const L = lut.a; for (let i = 0; i < n; i++) L[i] = shaftAt(off + i, t);
  for (let y = 0; y < VH; y++) {
    const r = y - base; if (r > 16) break;
    const row = y * VW, sh = camX - 0.6 * r - off;
    for (let x = 0; x < VW; x++) { const m = L[Math.floor(sh + x)]; if (!m) continue;
      const by = bayer(x, y); if (gone > 0 && by < gone) continue;
      const odd = ((x + y) & 1) === 1, k = m === 3 ? (odd ? 2 : 1) : m === 2 ? (odd ? 1 : -1) : by < 0.25 ? 0 : -1; if (k < 0) continue;
      fb[row + x] = (warm > by ? W : T)[k][fb[row + x]];
    }
  }
}
// A table that turns each colour by amount toward one colour of the palette, matched in the Day palette only:
// the shafts are gone by Dusk, and matched in both they came out lavender at sunset instead of gold.
function tintTable(to, amount) {
  const out = new Uint8Array(256), PS = [DAY];
  for (let i = 1; i < DAY.length; i++) { let best = i, bd = Infinity; const want = [];
    for (const P of PS) for (let k = 0; k < 3; k++) want.push(P[i][k] + (P[to][k] - P[i][k]) * amount);
    for (let j = 1; j < DAY.length; j++) { let dd = 0, m = 0; for (const P of PS) for (let k = 0; k < 3; k++, m++) { const e = want[m] - P[j][k]; dd += e * e; } if (dd < bd) { bd = dd; best = j; } }
    out[i] = best; }
  return out;
}
// What drifts in the light (issue #36): dust that wanders and twinkles, spores that sink slowly on a slant,
// both seen only inside a shaft; drops falling from the moss on the limbs, with a splash where they land;
// and at Dusk a few moths fluttering in loops. light: how much daylight is left (0 at Dusk).
function airborne(scr, camX, base, t, light, drips, dusk) {
  const { VW, VH, fb } = scr, set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < VW && y < VH) fb[y * VW + x] = c; };
  if (light > 0.05) {
    for (let k = 0; k < 150; k++) {
      const wx = Math.floor(camX / 300) * 300 + hash(k, 1, 4090) * 900 - 150 + 7 * Math.sin(t * 0.37 + k) + 3 * Math.sin(t * 1.3 + k * 3), r = -10 - hash(k, 2, 4090) * 230 + 6 * Math.sin(t * 0.23 + k * 2);
      if (hash(k, 6, 4090) > light || !shaftAt(wx - 0.6 * r, t)) continue;
      set(wx - camX, base + r, frac(t * 0.7 + hash(k, 3, 4090)) < 0.15 ? R.white[0] : R.white[1]);
    }
    for (let k = 0; k < 40; k++) {
      const fall = frac(t * (0.03 + 0.02 * hash(k, 4, 4091)) + hash(k, 1, 4091)), r = -240 + fall * 250, wx = Math.floor(camX / 300) * 300 + hash(k, 2, 4091) * 900 - 150 + fall * 40 + 4 * Math.sin(t * 0.9 + k);
      if (hash(k, 6, 4091) > light || !shaftAt(wx - 0.6 * r, t)) continue;
      const sx = wx - camX, sy = base + r; set(sx, sy, R.glow[0]); set(sx + 1, sy, R.moss[6]);
    }
  }
  for (const [x, y0, gy, ph] of drips) { const sx = x - camX; if (sx < -2 || sx > VW + 2) continue;
    const cyc = 3.2 + ph * 3, u = frac(t / cyc + ph), fallT = Math.sqrt(2 * (gy - y0) / 260), age = u * cyc;
    if (age < fallT) { const y = y0 + 130 * age * age; set(sx, base + y, R.white[1]); set(sx, base + y - 1, R.water[4]); }
    else if (age < fallT + 0.18) { set(sx - 1, base + gy - 1, R.white[1]); set(sx + 1, base + gy - 1, R.white[1]); set(sx, base + gy - 2, R.water[4]); }
  }
  if (dusk > 0.5) for (let k = 0; k < 6; k++) {
    const cx = Math.floor(camX / 400) * 400 + hash(k, 1, 4092) * 800, cy = -40 - hash(k, 2, 4092) * 120, a = t * (1.1 + hash(k, 3, 4092)) + k;
    const sx = cx - camX + 22 * Math.sin(a) + 9 * Math.sin(a * 2.7), sy = base + cy + 12 * Math.sin(a * 1.6), up = Math.floor(t * 14 + k) & 1;
    set(sx, sy, R.white[0]); set(sx - 1, sy - up, R.white[1]); set(sx + 1, sy - up, R.white[1]);
  }
}
// One thing that stands in the scene: a tree part by part in the wind, a tall trunk, a swaying fern, or a still drawing.
function drawThing(scr, th, camX, base, tq) {
  const sx = th.x - camX, sy = base + th.y;
  if (th.tree) for (const part of th.tree.parts) { const [wx, wy] = windAt(th.x + (part.lx || 0), th.y + part.y, tq, part.sway); scr.blit(part.bm, sx + part.x + wx, sy + part.y + wy); }
  else if (th.tall) blitTall(scr, th.bm, sx - th.bm.ox, sy - th.bm.oy);
  else if (th.sway) { const [wx] = windAt(th.x, th.y, tq, th.sway); scr.put(th.bm, sx + wx, sy, false); }
  else scr.put(th.bm, sx, sy, th.flip);
}
// The slug's slime trail (note 11): a wet line along the trail behind it (west, as it crawls east), darker
// than the dry dirt with a silver sheen down its middle and glints that come and go as the light catches it,
// drying patchy the older it is. sx: the slug on the screen.
function slime(scr, sx, base, camX, t) {
  const { VW, VH, fb } = scr;
  for (let k = 9; k < 64; k++) { const X = sx - k, wx = X + camX, Y = base + g(wx); if (X < 0 || X >= VW || Y < 0 || Y + 1 >= VH) continue;
    if (hash(wx, 1, 4080) < (k - 9) / 64) continue;
    const q = Y * VW + X, glint = hash(wx, Math.floor(t * 2.5), 4081) < 0.12;
    fb[q] = SHADE[fb[q]];
    fb[q + VW] = glint ? R.white[1] : (wx % 3 ? LIGHT[LIGHT[fb[q + VW]]] : R.white[0]); }
}
function lakeLight(scr, camX, base, t) {
  const { VW, VH, fb } = scr, T = R.tarn;
  for (let x = 0; x < VW; x++) {
    const wx = camX + x, k = farThin(wx); if (k <= 0) continue;
    const lake = wx < 580, top = base - 131 - Math.round(4 * k), bot = base - 110;
    for (let y = 0, y1 = Math.min(VH, base + 14); y < y1; y++) {
      const b = 0.3 * bayer(x, y) + 0.7 * vnoise((camX * 0.6 + x) / 12, y / 90, 320);
      if (b >= k * 0.9) continue;
      let c = b < (k - 0.45) * 1.2 ? R.sky[4] : R.mist[5];
      if (lake && y >= top && y < bot) {
        const r = y - top;
        // The far shore: a line of trees, ragged on top (T40: the lake lies up on its bench, over the rock band's rim).
        if (r < 5) { if (r < 3 - Math.round(3 * hash(wx >> 1, 1, 322) * hash(wx >> 2, 2, 322))) continue; c = r < 4 ? R.mist[2] : R.mist[1]; }
        else if (r === 5) c = T[3];
        else {
          const glint = hash(Math.floor((wx * 0.6 + t * 4) / 5), y, 321) < 0.12 + 0.35 * k && (x + y) % 3 !== 0;
          c = glint ? T[5] : r < 9 ? T[3] : T[4];
        }
      }
      fb[y * VW + x] = c;
    }
  }
}
// What the timeline needs to know of the forest, which takes no pictures to answer.
const META = {
  name: 'forest',
  dur: () => DUR,
  stops: () => [{ id: 'who', at: D_SIGN / TOTAL }],
  elev: (arg, q) => -along(q * TOTAL)[1] * 1.5,
  cues: () => [{ at: (D_SLUG - 11) / TOTAL, name: 'hop' }]
};
export const makeForest = () => shell(META, buildForest, ['enter', 'focus', 'pick', 'act', 'draw', 'trigger']);
function buildForest() {
  const rand = rng(31);

  // Behind the giants the forest goes back in three layers, each paler, plainer and slower across
  // the view than the one in front of it, with the light of the open sky behind them all.
  const farA = new Strip(900, UP, 24), farB = new Strip(1180, UP, 24), mid = new Strip(SW, UP, 30);
  farLayer(farA, 61, { c: [R.mist[4], R.mist[4]], w: [2, 5], step: [5, 15], gap: [34, 80], open: 0.24, ground: -66, rise: 8, limbs: 0.6, moss: 0.1, boughs: 2, firs: 54, canopy: -188, cvar: 70 });
  farLayer(farB, 62, { c: [R.mist[4], R.mist[3]], w: [5, 11], step: [16, 38], gap: [70, 150], open: 0.3, ground: -54, rise: 9, limbs: 2, moss: 0.3, boughs: 3, firs: 100, canopy: -226, cvar: 80 });
  // The far trees used to take their numbers from the same run of dice as everything below. The
  // run is still wound on by as much as they took, so every trunk, fern and log stands where it did.
  for (let x = 4; x < SW; x += 13 + rand() * 24) { rand(); rand(); }
  const midPut = (x, y, c) => { if (c) mid.set(Math.round(x), Math.round(y), c); }, MIDC = { wood: R.mist[1], moss: R.moss[3], top: R.moss[4], beard: R.mist[3], tip: R.mist[4] }, MIDP = { wood: R.moss[2], moss: R.moss[3], top: R.moss[4] };
  for (let x = 20; x < SW; x += 46 + rand() * 60) {
    const w = 9 + (rand() * 11 | 0), lean = (rand() - 0.5) * 0.04;
    for (let y = -UP; y < 6; y++) {
      const fl = w * 0.4 * Math.exp(-(6 - y) / (w * 0.6));
      for (let dx = -fl; dx < w + fl; dx++) { const u = dx / w; mid.set(x + dx + lean * -y, y, u < 0.14 ? R.mist[3] : u > 0.8 ? R.mist[0] : vnoise(dx / 2, y / 22, x) > 0.62 ? R.mist[2] : R.mist[1]); }
    }
    for (let k = 0; k < 3; k++) {
      const by = -70 - rand() * 300, dir = rand() < 0.5 ? -1 : 1, len = 14 + rand() * 30;
      mossLimb(midPut, x + (dir > 0 ? w : 0) + lean * -by, by, dir, len, Math.round(x) * 5 + k, MIDC);
    }
    // Two more limbs lower down, where the eye rests, and moss in patches up the trunk's lit side (T39). Their
    // own dice (hash), so nothing else in the forest moves.
    for (let k = 3; k < 5; k++) { const hx = Math.round(x) * 5 + k, by = -52 - hash(hx, 1, 778) * 150, dir = hash(hx, 2, 778) < 0.5 ? -1 : 1, len = 12 + hash(hx, 3, 778) * 26; mossLimb(midPut, x + (dir > 0 ? w : 0) + lean * -by, by, dir, len, hx, MIDC); }
    for (let y = -UP; y < 0; y++) for (let dx = 0; dx < w * 0.55; dx++) if (fbm((x + dx) / 5, y / 14, 779, 3) > 0.6 - 0.12 * smooth(-160, 0, y)) mid.set(x + dx + lean * -y, y, dx < 2 ? R.moss[3] : R.moss[2]);
  }
  for (let x = 0; x < SW; x++) {
    // High enough to show over the bank behind the trail, as the nearest of the three far ground lines.
    const top = -41 - 12 * fbm(x / 17, 4, 88, 3) - 5 * Math.max(0, Math.sin(x / 6.5) * vnoise(x / 30, 3, 89));
    // Moss lies on this floor in patches (T39): the pale, fog-lit edge stays where the moss is thin.
    const mossy = vnoise(x / 26, 7, 780) + 0.3 * vnoise(x / 5, 8, 780);
    for (let y = Math.round(top); y < 30; y++) { const d = y - top;
      mid.set(x, y, mossy > 0.52 ? (d < 1.5 ? R.moss[4] : d < 4 ? R.moss[3] : d < 7 + 3 * mossy && ((x + y) & 1 || d < 5.5) ? R.moss[2] : R.mist[1]) : d < 1.5 ? R.mist[3] : d < 5 ? R.mist[2] : R.mist[1]); }
    for (let y = -UP; y < -200 - 110 * fbm(x / 50, 5, 90, 3); y++) if (fbm(x / 16, y / 13, 91, 3) > 0.46) mid.set(x, y, fbm(x / 16, (y - 3) / 13, 91, 3) > 0.46 ? R.mist[1] : R.mist[2]);
  }
  // The middle ground's understory (T39): sword ferns, salal and young hemlocks along its edge, with dice of their own.
  { const pr = rng(3902), midTop = x => -41 - 12 * fbm(x / 17, 4, 88, 3) - 5 * Math.max(0, Math.sin(x / 6.5) * vnoise(x / 30, 3, 89));
    for (let x = 8; x < SW - 8; x += 14 + pr() * 30) { const k = pr(); midPlant(midPut, k < 0.45 ? 'fern' : k < 0.75 ? 'salal' : 'hemlock', x, Math.round(midTop(x)) + 2, pr, MIDP); } }

  // The ground: back bank, trail, verge, the far bank of the stream, and the near bank in front.
  const main = new Strip(SW, 60, DOWN), water = new Strip(SW, 0, 90);
  for (let x = 0; x < SW; x++) {
    // At the rock band the bank behind the trail drops to a low mossy foot (T40), and the trail stops where the
    // first leg leaves it. The fall's channel crosses the bank and the trail to the creek, under a footbridge.
    const gy = g(x), bt = gy - (34 + 9 * fbm(x / 26, 6, 92, 3)) * (1 - 0.7 * smooth(600, 530, x)), fb = gy + farBank(x), nb = gy + nearBank(x);
    for (let y = Math.round(bt); y < DOWN; y++) {
      const r = y - gy, cd = chanD(x, r), deck = cd < 3 && r >= -6 && r <= 5; let c;
      if (cd < 0 && !deck) continue;
      const lit = beamAt(x - 0.6 * r + 9 * (vnoise(x / 6, y / 3, 105) - 0.5)) * 0.09 + thinAt(x) * 0.05;
      if (r < -5) c = pick('moss', 0.1 + 0.3 * smooth(-40, -5, r) + lit * smooth(-30, -5, r) + 0.24 * (fbm(x / 9, y / 5, 93, 3) - 0.5) + (y - bt < 2 ? 0.25 : 0), x, y, 0.8);
      else if (r <= 4 && x >= FOOT - 12 + Math.abs(r + 0.5) * 1.5) {
        const e = Math.abs(r + 0.5) / 5;
        c = hash(x, y, 94) < 0.05 ? R.rock[2] : pick('dirt', 0.5 - e * 0.3 + lit * 1.6 + 0.22 * (vnoise(x / 5, y / 2, 95) - 0.5), x, y, 0.7);
        if (r === -5 || r === 4) c = hash(x, 7, 96) < 0.4 ? R.moss[3] : R.dirt[0];
      } else if (r < farBank(x) - 3) c = pick('moss', 0.42 + lit * 1.1 + 0.26 * (fbm(x / 7, y / 4, 97, 3) - 0.5) - (r - 5) * 0.012, x, y, 0.8);
      else if (y < fb) c = hash(x, y, 98) < 0.4 ? R.bark[0] : R.moss[1];
      else if (y < nb) continue;
      else c = y - nb < 2 ? R.moss[hash(x, 9, 99) < 0.5 ? 4 : 3] : pick('moss', 0.14 + 0.2 * (fbm(x / 11, y / 6, 100, 3) - 0.5) + 0.1 * smooth(30, 0, y - nb), x, y, 0.8);
      // The footbridge: planks across the trail's width on two logs, their ends resting on the banks.
      if (deck) c = r === -6 || r === 5 ? R.wood[0] : (x - FALL + 40) % 4 === 0 ? R.wood[1] : R.wood[r < -1 ? 3 : 2];
      else if (cd < 2) c = hash(x, y, 98) < 0.4 ? R.bark[0] : R.moss[1];
      main.set(x, y, c);
    }
  }
  // The first leg leaves the trail across the bank's low foot.
  paintLeg(main, 0, x => main.get(x, stepY(0, x) + 1));
  // Roots across the trail, wood sorrel, trillium and mushrooms on the banks.
  for (let n = 0; n < 60; n++) { const x = rand() * SW, gy = g(x); for (let i = 0; i < 9; i++) main.set(x + i * 0.5 + (rand() - 0.5), gy - 5 + i, i === 4 ? R.bark[3] : R.bark[2]); }
  for (let n = 0; n < 900; n++) {
    const x = (rand() * SW) | 0, gy = g(x), back = rand() < 0.6, y = back ? gy - 7 - rand() * 24 : rand() < 0.5 ? gy + 6 + rand() * 7 : gy + nearBank(x) + 5 + rand() * 150, k = rand();
    if (!main.get(x, y) || !main.get(x - 2, y) || !main.get(x + 2, y)) continue;
    if (k < 0.62) { main.set(x, y, R.moss[5]); main.set(x - 1, y - 1, R.moss[6]); main.set(x + 1, y - 1, R.moss[5]); }
    else if (k < 0.78) { main.set(x, y, R.moss[3]); main.set(x, y - 1, R.white[1]); main.set(x - 1, y - 2, R.white[1]); main.set(x + 1, y - 2, R.white[0]); main.set(x, y - 2, R.yellow[1]); }
    else if (k < 0.92) { main.set(x, y, R.white[0]); main.set(x, y - 1, R.red[1]); main.set(x - 1, y - 1, R.red[0]); main.set(x + 1, y - 1, R.red[2]); }
    else { main.set(x, y, R.bark[2]); main.set(x - 1, y, R.ochre[2]); main.set(x + 1, y, R.ochre[1]); }
  }

  // Everything that stands on the ground, sorted by its foot each frame.
  const things = [];
  const trunks = [];
  // Where drops fall from the moss hanging off each limb (issue #36): x, the drop's start and the ground, a phase.
  const drips = [];
  const reserve = [[X0 - D_SIGN - 34, X0 - D_SIGN + 10], [X0 - D_ELK - 34, X0 - D_ELK + 34]];
  // One giant always stands at D_GIANT. The bear leaned out from behind it until round 5 (T41); it stays so the
  // rest of the forest, the owl's tree among it, stands where it always did.
  let giant = null;
  for (let x = 40; x < SW - 30; x += 78 + rand() * 62) {
    let tx = x; if (!giant && Math.abs(x - (X0 - D_GIANT)) < 70) tx = X0 - D_GIANT;
    if (reserve.some(([a, b]) => tx > a - 22 && tx < b + 22)) continue;
    // Toward the lake more and more of the giants are missing. A missing one still takes its turns
    // of the dice and keeps its place clear, so the rest of the forest stands where it always did.
    const w = 20 + (rand() * 22 | 0), by = -8 - (rand() * 20 | 0), gone = tx !== X0 - D_GIANT && (hash(Math.round(tx), 7, 310) < thinAt(tx) * 0.9 || (tx > 300 && tx < 600));   // none in front of the fall and the legs (T40)
    const t = { bm: gone ? null : makeTrunk(1000 + (tx | 0), w, UP + by + 20), x: Math.round(tx), y: g(tx) + by, tall: true, w };
    if (tx === X0 - D_GIANT) giant = t;
    trunks.push(t); if (!gone) things.push(t);
    for (let k = 0; k < 3; k++) { const dir = rand() < 0.5 ? -1 : 1, len = 30 + (rand() * 46 | 0), up = 96 + rand() * 300; if (!gone) { things.push({ bm: makeLimb(2000 + tx + k, len, dir), x: t.x + dir * (w / 2 - 2), y: t.y - up, z: t.y + 0.1, sway: 0.5 }); const dx = Math.round(t.x + dir * (w / 2 + len * 0.6)); drips.push([dx, t.y - up + 10, g(dx) - 4, hash(tx, k, 4093)]); } }
  }
  const maples = Array.from({ length: 6 }, (_, i) => makeMaple(120 + i)), spruces = Array.from({ length: 4 }, (_, i) => makeSpruce(220 + i, true));
  const free = (x, r) => !trunks.some(t => Math.abs(t.x - x) < t.w * 0.8 + r) && !reserve.some(([a, b]) => x > a - r && x < b + r);
  for (let n = 0; n < 70; n++) { const x = rand() * SW, by = -9 - rand() * 22; if (!free(x, 14)) continue; const th = { tree: rand() < 0.7 ? maples[(rand() * 6) | 0] : spruces[(rand() * 4) | 0], x: Math.round(x), y: g(x) + Math.round(by) }; if (x <= 300 || x >= FALL + 44) things.push(th); }
  const ferns = [5, 6, 7, 8, 10, 12, 15, 19, 23].map((r, i) => swordFern(300 + i, r));
  for (let n = 0; n < 330; n++) {
    const x = rand() * SW, zone = rand(), gy = g(x);
    // None on the bank where the legs and the fall's channel are, nor on the channel in front of it (T40).
    if (zone < 0.5) { const th = { bm: ferns[2 + (rand() * 5 | 0)], x: Math.round(x), y: gy - 6 - Math.round(rand() * 26), sway: 0.6 }; if (x <= FOOT - 110 || x >= FALL + 40) things.push(th); }
    else if (zone < 0.72) { const th = { bm: ferns[(rand() * 3) | 0], x: Math.round(x), y: gy + 7 + Math.round(rand() * 7), sway: 0.6 }; if (x <= FALL - 28 || x >= FALL + 34) things.push(th); }
    else { const dy = sq(rand()) * 150; things.push({ bm: ferns[Math.min(8, 3 + Math.round(dy / 30) + (rand() * 3 | 0))], x: Math.round(x), y: gy + nearBank(x) + 6 + Math.round(dy), sway: 0.6 }); }
  }
  for (let n = 0; n < 150; n++) { const x = rand() * SW, dy = 30 + rand() * 170; things.push({ bm: ferns[5 + (rand() * 4 | 0)], x: Math.round(x), y: g(x) + nearBank(x) + Math.round(dy), sway: 0.6 }); }
  const logs = [makeNurseLog(41, 92), makeNurseLog(42, 64)];
  const TRAIL_LOGS = [[590, 0, -12], [206, 1, -15], [-150, 0, -14], [840, 1, -11]];
  for (const [d, k, by] of TRAIL_LOGS) { const x = X0 - d; things.push({ bm: logs[k], x, y: g(x) + by }); }
  for (let n = 0; n < 9; n++) { const x = n * 190 + rand() * 120; things.push({ bm: logs[n & 1], x: Math.round(x), y: g(x) + nearBank(x) + 26 + Math.round(rand() * 110), flip: n % 3 === 0 }); }
  const stump = makeStump(5), stumpX = X0 - D_STUMP;
  things.push({ bm: stump, x: stumpX, y: g(stumpX) - 9 });
  const signX = X0 - D_SIGN - 15;
  things.push({ bm: makeTrailSign(), x: signX, y: g(signX) - 6 });
  // The eerie corner of the rainforest (E5d), by rule, with no turns of the dice so nothing else moves.
  // The owl: on a mossy limb of the giant right behind the stump (TJ, round 5 T38). The Steller's jay that sat
  // on the stump is gone, so the owl has the middle of the run to itself. The limb is high enough to clear
  // the young trees in front of the giant.
  const busy = [D_SIGN, D_SLUG, D_ELK, D_GIANT, D_STUMP];
  const owlT = trunks.filter(t => t.bm).reduce((a, t) => !a || Math.abs(t.x - stumpX) < Math.abs(a.x - stumpX) ? t : a, null);
  const perch = owlT && (() => { const bm = makeLimb(2900, 28, 1), x = owlT.x + Math.round(owlT.w / 2 - 2), y = owlT.y - 84, col = bm.ox + 14; let top = 0; while (top < bm.h && !bm.d[top * bm.w + col]) top++;
    things.push({ bm, x, y, z: owlT.y + 0.1 }); return { x: x + 14, y: y - bm.oy + top, z: owlT.y + 0.2 }; })();
  const owlBM = { r: owl('r'), f: owl('f'), l: owl('l'), rb: owl('r', 1), fb: owl('f', 1), lb: owl('l', 1) };
  // Foxfire: on the nurse log by the trail that lies deepest in the forest, glowing in clusters along
  // the rotten underside of the trunk where the bark has gone.
  const [fd, fk, fby] = TRAIL_LOGS.filter(([d]) => d > 0 && d < LEN).sort((a, b) => thinAt(X0 - a[0]) - thinAt(X0 - b[0]))[0], foxX = X0 - fd, foxY = g(foxX) + fby, foxBM = logs[fk];
  const fox = [];
  for (let c = 0; c < 7; c++) { const cx = 8 + Math.round(hash(c, 1, 3301) * (foxBM.w - 22)), cy = 29 + Math.round(hash(c, 2, 3301) * 6);
    for (let k = 0; k < 7; k++) { const x = cx + Math.round((hash(c, k, 3302) - 0.5) * 6), y = cy + Math.round((hash(c, k, 3303) - 0.5) * 3); const v = foxBM.d[y * foxBM.w + x]; if (v && v !== INK) fox.push([x - foxBM.ox, y - foxBM.oy, v, c]); } }
  // The deer: its eyes shine out of the dark from the spot along the run in the thick of the forest that
  // lies farthest from any giant's trunk, clear of the other animals, the sign, the foxfire's log and the
  // small trees, up on the bank behind, so nothing stands in front of it.
  let eyeX = null, gap = 0;
  { const stand = trunks.filter(t => t.bm);
    for (let d = 40; d <= LEN - 40; d += 2) { const x = X0 - d; if (thinAt(x) > 0.1 || busy.some(b => Math.abs(d - b) < 36) || (owlT && Math.abs(x - owlT.x) < 50) || Math.abs(x - foxX) < foxBM.w / 2 + 24 || things.some(th => th.tree && Math.abs(th.x - x) < 26)) continue;
      const room = Math.min(...stand.map(t => Math.abs(t.x - x) - t.w / 2)); if (room > gap) { gap = room; eyeX = x; } } }
  const boulders = [0, 1, 2, 3].map(i => makeBoulder(50 + i, 4 + i * 1.6));
  const stones = [];
  for (let n = 0; n < 26; n++) { const x = Math.round(rand() * SW), y = g(x) + farBank(x) + 6 + Math.round(rand() * (nearBank(x) - farBank(x) - 10)), bm = boulders[(rand() * 4) | 0]; stones.push({ bm, x, y }); }

  // The lake's bench at the forest's end (note 12), and what stands on it: ferns and trees on its slope,
  // boulders fallen at its foot, firs along its rim behind where he walks it. All by rule, with no turns of the dice.
  const crag = buildCrag();
  // Ferns on the slope, each in front of what stands higher up it.
  for (const [x, y, k] of crag.perches) things.push({ bm: ferns[k], x, y, sway: 0.6, bench: true });
  // Trees on the slope (note 12), by rule: wherever the ground under the trunk is earth, out of the gorge, and
  // never where a leg passes through the tree (so none hides him), from foot to crown. Smaller the higher up the
  // slope they stand, as they are farther off, and each in front of everything that stands higher.
  { const pines = Array.from({ length: 6 }, (_, i) => makeConifer(4060 + i, 30 + i * 6, 12 + i * 3, 'conifer', 6 + (i >> 1), { tufts: true }));
    for (let x = 4, n = 0; x < CW - 8; x += 19 + hash(n, 1, 4061) * 24, n++) { const xx = Math.round(x), top = RIM(xx);
      if (top > -40) continue;
      const y = Math.round(lerp(top + 18, -12, Math.sqrt(hash(n, 2, 4061)))), k = clamp(Math.round(5 * (y - top) / (-12 - top) - hash(n, 3, 4061)), 0, 5), h = 30 + k * 6, hw = 7 + k * 1.5;
      if (crag.rockAt(xx, y + 1) || gorgeAt(xx, y) < hw || [-hw, 0, hw].some(dx => nearTread(xx + dx, y + 8, h + 8)) || (xx > RIM0 - hw - 4 && xx < TOP_X + hw && y - h - 4 < RIM(xx))) continue;
      things.push({ tree: hash(n, 4, 4061) < 0.28 ? maples[n % 6] : pines[k], x: xx, y: y + 1, bench: true }); } }
  for (let n = 0; n < 9; n++) { const x = 16 + Math.round(hash(n, 1, 4020) * 570); if (x > FOOT - 56 && x < FALL + 44) continue; things.push({ bm: boulders[n & 3], x, y: g(x) - 7 - Math.round(hash(n, 2, 4020) * 4), z: -60 }); }
  const firs = Array.from({ length: 5 }, (_, i) => makeFir(330 + i, true));
  for (let x = 6, n = 0; x < 600; x += hash(n, 1, 4021) < 0.45 ? 9 + hash(n, 2, 4021) * 8 : 30 + hash(n, 2, 4021) * 44, n++) { const xx = Math.round(x); if (Math.abs(xx - FALL) < 18 || RIM(xx) > -100) continue; things.push({ tree: hash(n, 3, 4021) < 0.2 ? spruces[n & 3] : firs[n % 5], x: xx, y: RIM(xx) + 1, z: -310 - hash(n, 4, 4021), bench: true }); }

  // The stream mirrors what stands behind it: build the still picture once and reflect it.
  const still = new Strip(SW, UP, DOWN);
  for (let y = -200; y < 24; y++) for (let x = 0; x < CW; x++) { const c = crag.S.get(x, y); if (c) still.set(x, y, c); }
  for (let y = -60; y < DOWN; y++) for (let x = 0; x < SW; x++) { const c = main.get(x, y); if (c) still.set(x, y, c); }
  for (const th of [...things].sort((a, b) => (a.z || a.y) - (b.z || b.y))) {
    if (th.tree) for (const p of th.tree.parts) { const pb = p.bm; for (let j = 0; j < pb.h; j++) for (let i = 0; i < pb.w; i++) { const c = pb.d[j * pb.w + i]; if (c) still.set(th.x + p.x + i, th.y + p.y + j, c); } }
    else still.stamp(th.bm, th.x, th.y);
  }
  for (let x = 0; x < SW; x++) {
    const gy = g(x), fb = gy + farBank(x), nb = gy + nearBank(x);
    for (let y = fb; y < nb; y++) {
      const dpt = y - fb, rip = Math.round(1.4 * Math.sin(y * 1.1 + x * 0.07) * Math.min(1, dpt / 6));
      const src = still.get(x + rip, fb - dpt * 1.5 - 3);
      // Whatever stands behind the stream shows in it as a dark teal mirror; the gaps show the light.
      const lum = src ? (0.3 * DAY[src][0] + 0.59 * DAY[src][1] + 0.11 * DAY[src][2]) / 255 : 0.78 + 0.2 * (vnoise(x / 30, y / 4, 101) - 0.5);
      let c = pick('pool', lum * 0.82 - dpt * 0.003 + 0.02, x, y, 0.9);
      if (dpt < 2) c = R.pool[0];
      else if (hash(x >> 3, y, 102) < 0.09 && dpt > 3 && (y & 1)) c = LIGHT[c];
      water.set(x, y - gy + 0, c);
    }
  }
  // water is stored relative to the trail line of each column, so redraw it into absolute rows
  const waterAbs = new Strip(SW, 20, 120);
  for (let x = 0; x < SW; x++) { const gy = g(x); for (let y = 0; y < 90; y++) { const c = water.get(x, y); if (c) waterAbs.set(x, y + gy, c); } }
  // The pool at the fall's foot and its channel to the creek, two pixels wider than the gap in the bank so the
  // water's wobble never opens a seam. White where the fall lands.
  for (let x = FALL - 33; x <= FALL + 41; x++) for (let r = -6; r < farBank(x) + 2; r++) if (chanD(x, r) < 2) { const near = Math.hypot(x - FALL - 5, (r + 6) * 1.6);
    waterAbs.set(x, g(x) + r, near < 9 && hash(x, r, 4041) < 0.75 - near * 0.06 ? R.white[1] : pick('pool', 0.62 - (r + 6) * 0.012 + 0.2 * (vnoise(x / 4, r / 2, 4042) - 0.5) + (near < 16 ? 0.2 : 0), x, r, 0.9)); }
  for (const s of stones) { waterAbs.stamp(s.bm, s.x, s.y); for (let dx = -s.bm.ox - 1; dx <= s.bm.ox + 1; dx++) if (hash(dx, s.x, 5) < 0.6) waterAbs.set(s.x + dx, s.y + 1, R.pool[6]); for (let dx = -2; dx <= 2; dx++) waterAbs.set(s.x + dx, s.y - s.bm.oy + 1, R.moss[5]); }

  const run = makeRunner('trail');
  const sit = [0, 1].map(f => sideFig('trail', { feet: [[6, 3], [5, 4]], crouch: 5, lean: 0, hands: f ? [[4, -2], [2, 3]] : [[3, 3], [2, 3]] }));
  const elkBM = { up: elk('up'), ear: elk('up', 0, 1), graze: elk('graze'), bite: elk('graze', 0, 1) }, sas = [sasquatch(0), sasquatch(1)];
  const gray = { sit: jay('gray', 'sit'), up: jay('gray', 'up'), down: jay('gray', 'down') };
  const slugBM = [0, 1, 2, 3].map(f => slug(f)).concat([slug(0, true)]), slugX = X0 - D_SLUG;
  const elkX = X0 - D_ELK, elkY = g(elkX) - 13;

  const st = {}, focus = { x: 0, y: 0 };
  let cam = 0, last = { camX: 0, base: 0 }, wells = new Float32Array(0);
  const list = [];
  // What stands on the lake's bench (drawn with it), and everything else; sorted out on the first frame.
  let bench = null, front = null;
  // The animals act on their own clock once he crosses their point, so they carry on when he stops and
  // do not play backwards when the timeline is scrubbed. sasGo: when he began (null if not yet).
  const SAS_AT = 0.66;
  let sasGo = null, sasX = 0, sasOn = 0;
  // The deer's eyes at Dusk: 8 s in every 26, or when the debug button says.
  const EYES = { slot: 26, dur: 8 }; let eyeGo = null;
  // When each animal was last clicked (round 6, note 10): the elk bugles, the owl turns to face you and hoots,
  // the slug draws its eyestalks in, the deer's eyes blink out as it bounds off, the gray jay flutters up.
  const poked = { elk: -99, owl: -99, slug: -99, deer: -99, jay: -99 };
  let eyesAt = null, jayAt = null;   // where the deer's eyes and the jay were drawn this frame, for a click
  // The marine layer (note 13): while its deck is in over the rainforest (world.js, weather), rain falls through
  // the forest and fog closes in, in three veils (thickest on the far trees, thinner on the bench and the
  // bank, faint on what stands nearest), and the light beams and motes go with the sun.
  const FOGV = [0.22, 0.42, 0.6, 0.75, 0.87].map(veilTable);
  const BEAM = [0.12, 0.26, 0.4].map(a => tintTable(R.white[1], a)), WARM = [0.18, 0.32, 0.46].map(a => tintTable(R.sun[2], a));
  const STREAK = new Uint8Array(256).map((_, c) => { const p = DAY[c] || [0, 0, 0]; return 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2] > 150 ? R.nebel[1] : R.fog[1]; });

  return {
    ...META,
    enter(scr, arg, q) { cam = along(q * TOTAL)[0]; st.y = null; sasGo = null; },
    focus: () => focus,
    // The debug panel's start button (E5f): Sasquatch steps out at the far edge of the view, even if he has been seen this visit.
    trigger(name, t) {
      if (name === 'eyeshine') { eyeGo = t; return true; }
      if (name === 'sasquatch') { sasquatchSeen = false; sasGo = t; sasX = Math.max(last.camX - 12, giant ? giant.x : 0); sasOn = 0; return true; }
      return false;
    },
    pick(sx, sy) {
      const wx = sx + last.camX, wy = sy - last.base;
      if (Math.abs(wx - signX) < 12 && wy > g(signX) - 34 && wy < g(signX) - 4) return { label: NAMES.forest.sign, x: signX - last.camX, y: last.base + g(signX) - 36 };
      const box = (bm, x, y, pad = 2) => Math.abs(wx - x) <= bm.w / 2 + pad && wy >= y - bm.oy - pad && wy <= y - bm.oy + bm.h + 1;
      if (eyesAt && Math.abs(sx - eyesAt[0] - 2) < 7 && Math.abs(sy - eyesAt[1]) < 5) return { label: NAMES.forest.deer, x: eyesAt[0] + 2, y: eyesAt[1] - 6, act: 'deer' };
      if (jayAt && Math.abs(sx - jayAt[0]) < 7 && sy > jayAt[1] - 10 && sy < jayAt[1] + 2) return { label: NAMES.forest.jay, x: jayAt[0], y: jayAt[1] - 12, act: 'jay' };
      if (perch && box(owlBM.f, perch.x, perch.y)) return { label: NAMES.forest.owl, x: perch.x - last.camX, y: last.base + perch.y - owlBM.f.oy - 4, act: 'owl' };
      if (box(elkBM.up, elkX, elkY)) return { label: NAMES.forest.elk, x: elkX - last.camX, y: last.base + elkY - elkBM.up.oy - 4, act: 'elk' };
      if (box(slugBM[0], slugX, g(slugX) + 1, 4)) return { label: NAMES.forest.slug, x: slugX - last.camX, y: last.base + g(slugX) - 17, act: 'slug' };
      if (wy > g(wx) + farBank(wx) && wy < g(wx) + nearBank(wx)) return { label: NAMES.forest.creek, x: sx, y: sy - 8 };
      return null;
    },
    act(id, env) {
      if (!(id in poked)) return false;
      if (env.t - poked[id] < 1.5) return true;
      poked[id] = env.t; env.sfx({ elk: 'bugle', owl: 'hoot', slug: null, deer: 'snort', jay: 'chirp' }[id] || 'step');
      return true;
    },
    draw(scr, env, arg, q) {
      const { VW, VH, fb } = scr, { t, tq } = env;
      if (!bench) { bench = things.filter(th => th.bench).sort((a, b) => (a.z || a.y) - (b.z || b.y)); front = things.filter(th => !th.bench); }
      const d = q * TOTAL, [mx, my, face, leg] = along(d);
      // He stands right of the middle: clear of the card, and with more of the way ahead in view.
      const anchor = scr.narrow ? 0.5 : 0.6;
      cam += (mx - cam) * (env.calm ? 1 : Math.min(1, env.dt * 8));
      // The view stops at the strip's west edge, so the rock band never wraps round.
      const camX = Math.max(0, Math.round(cam - VW * anchor + env.look.x * 0.5)), base = baseline(scr, env.shown, st) - Math.round(my * 0.5);
      last = { camX, base };

      // The light behind the trees: pale mist, dimmer up under the canopy, and brightest in the wide
      // gaps where the sky comes through. The gaps drift across slower than any tree.
      const mist = R.mist, glow = R.glow[0];
      if (wells.length !== VW) wells = new Float32Array(VW);
      for (let x = 0; x < VW; x++) wells[x] = smooth(0.5, 0.68, fbm((camX * 0.07 + x) / 52, 3, 106, 2));
      for (let y = 0; y < VH; y++) {
        const r = y - base, row = y * VW, dim = clamp((-140 - r) / 170, 0, 1.999), b0 = Math.floor(dim), e = dim - b0, wy = smooth(-340, -200, r);
        for (let x = 0; x < VW; x++) { const by = bayer(x, y); fb[row + x] = wells[x] * wy > 0.12 + 0.88 * by ? glow : mist[5 - b0 - (by < e ? 1 : 0)]; }
      }
      drawStrip(scr, farA, camX * 0.14 + 120, base - 2, true, R.mist[4]);
      drawStrip(scr, farB, camX * 0.34 + 300, base - 2, true, R.mist[3]);
      drawStrip(scr, mid, camX * 0.6 + 200, base - 1, true, R.mist[1]);
      // Near the lake the far trees give way to open light, in clumps, and the lake shows low down.
      lakeLight(scr, camX, base, t);
      const sky = env.sky, fogK = sky ? Math.max(sky.deck, sky.fog * 0.8) : 0, rainK = sky ? sky.rain : 0;
      if (sky && sky.deck > 0.5) saw('marine'); if (sky && sky.rain > 0.5) saw('rain');
      fogVeil(scr, fogK, FOGV);
      drawCrag(scr, crag.S, camX, base);
      fallWater(scr, camX, base, t, crag.F);
      // What stands on the bench is drawn with it, before the bank, so the fog veils them alike.
      for (const th of bench) { const w = th.tree ? 30 : th.bm.w; if (th.x + w > camX && th.x - w < camX + VW) drawThing(scr, th, camX, base, tq); }
      fogVeil(scr, fogK * 0.5, FOGV);
      drawStrip(scr, waterAbs, camX, base, false, 0, r => Math.round(Math.sin(t * 1.6 + r * 0.7)));
      drawStrip(scr, main, camX, base, false, R.moss[1]);
      // Sasquatch strides through the undergrowth behind the trail, in front of the far trees and
      // behind every trunk, log and fern that stands nearer. Once a visit.
      // He steps out at the far edge of the view ahead and walks the other way at his own pace, so the
      // two pass each other, and if the runner stops Sasquatch still crosses the whole view and is gone.
      if (!sasquatchSeen && sasGo === null && d >= SAS_AT * LEN && d < 0.9 * LEN) { sasGo = t; sasX = Math.max(camX - 12, giant ? giant.x : 0); sasOn = 0; }
      if (!sasquatchSeen && sasGo !== null) {
        const wx = sasX + (t - sasGo) * 26, bm = sas[Math.floor((t - sasGo) * 2.6) & 1];
        // He stands a little up the bank, shin-deep in the ferns, so the low growth by the trail cannot hide him.
        { const sx = Math.round(wx - camX) - bm.ox, sy = base - 24 - bm.oy; for (let j = 0; j < bm.h - 5; j++) for (let i = 0; i < bm.w; i++) { const c = bm.d[j * bm.w + bm.w - 1 - i]; if (c) scr.set(sx + i, sy + j, c); } }
        const seen = wx - camX > 0 && wx - camX < VW; if (seen) sasOn += env.dt;
        if (sasOn > 1.2) env.found('sasquatch');
        if (wx - camX > VW + 20 || t - sasGo > 40) sasquatchSeen = true;
      }
      // Sparkles on the stream where the light falls on it.
      for (let k = 0; k < 60; k++) {
        const wx = Math.floor(camX / 40) * 40 + k * 17 + Math.round(8 * hash(k, 1, 103)), ry = farBank(wx) + 5 + hash(k, 2, 103) * 34;
        if (!beamAt(wx - 0.6 * ry) || frac(t * 0.9 + hash(k, 3, 103)) > 0.35) continue;
        const sx = wx - camX, sy = base + g(wx) + Math.round(ry); if (scr.get(sx, sy) && sy < base + g(wx) + nearBank(wx) - 1) { scr.set(sx, sy, R.white[1]); scr.set(sx + 1, sy, R.pool[6]); }
      }

      list.length = 0;
      for (const th of front) { const w = th.tree ? 30 : th.bm.w; if (th.x + w > camX && th.x - w < camX + VW) list.push(th); }
      // The elk lifts his head while he passes.
      const bugle = t - poked.elk < 2.6;
      { const up = bugle || Math.abs(d - D_ELK + 20) < 90 || frac(t / 7) >= 0.7; list.push({ bm: up ? elkBM[!bugle && frac(t / 2.9) < 0.07 ? 'ear' : 'up'] : elkBM[Math.floor(t * 2.2) & 1 ? 'bite' : 'graze'], x: elkX, y: elkY, flip: false }); }
      list.push({ bm: slugBM[t - poked.slug < 3.5 ? 4 : Math.floor(t * 2.2) & 3], x: slugX, y: g(slugX) + 1, flip: true });
      slime(scr, slugX - camX, base, camX, t);
      // The owl turns its head to follow him: looking right as he comes, at you as he passes under, then left.
      // Clicked, it turns its head to face you, blinks twice slowly and hoots.
      if (perch) { const rel = mx - perch.x, o = t - poked.owl, f = o < 2.6 ? 'f' : rel > 26 ? 'r' : rel < -26 ? 'l' : 'f', blink = o < 2.6 ? (o > 0.5 && o < 0.75) || (o > 1.3 && o < 1.55) : frac(t / 4.3) < 0.04; list.push({ bm: owlBM[blink ? f + 'b' : f], x: perch.x, y: perch.y, z: perch.z }); if (perch.x - camX > 8 && perch.x - camX < VW - 8 && !covered(perch.x - camX, base + perch.y)) saw('owl'); }
      // He hops the slug.
      const ds = d - D_SLUG, hop = Math.abs(ds) < 16 ? Math.round(15 * Math.cos(ds / 16 * Math.PI / 2)) : 0;
      const snack = !env.running && env.still > 60;
      if (snack) env.found('snack');
      // On the climb he is behind everything that stands lower on the slope and in front of all that stands higher.
      const me = { me: true, x: mx, y: my + 0.5, z: leg ? my - 0.5 : 0 };
      list.push(me);
      list.sort((a, b) => (a.z || a.y) - (b.z || b.y));
      for (const th of list) {
        const sx = th.x - camX;
        if (th.me) {
          const bm = snack ? sit[Math.floor(t * 1.5) & 1] : env.moving ? (hop ? run.side[3] : run.side[Math.floor(d / 4.2) % 6]) : run.sideIdle[0];
          focus.x = Math.round(sx); focus.y = Math.round(base + my) - 14;
          scr.shadow(Math.round(sx), Math.round(base + my), 5, 1);
          scr.put(bm, sx, base + my - hop + (snack ? 2 : 0), face < 0);
          jayAt = null;
          if (snack) { const u = clamp((env.still - 63) / 1.2, 0, 1), fl = t - poked.jay < 1.2 ? Math.sin(Math.PI * (t - poked.jay) / 1.2) : 0, jx = Math.round(sx - 16 - (1 - u) * 60), jy = Math.round(base + my - (1 - u) * 50 - 8 * fl);
            scr.put(u < 1 || fl > 0 ? (Math.floor(t * 9) & 1 ? gray.up : gray.down) : gray.sit, jx, jy, false); if (u >= 1) jayAt = [jx, jy]; }
        } else drawThing(scr, th, camX, base, tq);
      }

      if (bugle) puffs(scr, elkX - camX + 14, base + elkY - Math.round(elkBM.up.oy * 0.76), 1, t - poked.elk);
      // At Dusk the foxfire glows on its log, each cluster swelling and fading at its own pace, with a faint
      // green light on the wood round it; only where the log still shows, not over a fern in front of it.
      if (env.mix > 0.3) { foxfireGlow(scr, fox, foxX - camX, base + foxY, t, smooth(0.3, 0.8, env.mix)); if (env.mix > 0.6 && foxX - camX > 8 && foxX - camX < VW - 8 && !covered(foxX - camX, base + foxY)) saw('foxfire'); }
      // And a deer's eyes shine between the trunks, now and then blinking or turning away.
      // Clicked, they blink out: the deer has bounded off, and comes back with the next slot.
      eyesAt = null;
      if (eyeX !== null && env.mix > 0.5 && t - poked.deer > EYES.dur) { const s = eyeGo !== null && t - eyeGo < EYES.dur ? t - eyeGo : frac(t / EYES.slot) * EYES.slot;
        if (s < EYES.dur && frac(s / 2.7) > 0.05) { const turn = Math.round(1.5 * Math.sin(s * 0.9)), ex = eyeX - camX + turn, ey = base + g(eyeX) - 42; eyesAt = [ex, ey];
          for (const dx of [0, 4]) { scr.set(ex + dx, ey, R.lamp[1]); scr.set(ex + dx - 1, ey, R.lamp[0]); scr.set(ex + dx + 1, ey, R.lamp[0]); } } }
      fogVeil(scr, fogK * 0.35, FOGV);
      // Shafts of light (issue #36), warm at sunset and gone at Dusk or under the marine layer; then what drifts
      // in them, the drops off the moss, and the fireflies and moths once the light has gone.
      const light = 1 - smooth(0.55, 0.9, env.mix), warm = smooth(0.15, 0.55, env.mix) * light;
      shafts(scr, camX, base, t, BEAM, WARM, warm, Math.max(fogK, 1 - light));
      airborne(scr, camX, base, t, light * (1 - Math.max(fogK, rainK)), drips, env.mix);
      for (let k = 0; k < 46; k++) {
        const wx = Math.floor(camX / 300) * 300 + hash(k, 1, 104) * 600 + 10 * Math.sin(t * 0.3 + k), r = -20 - hash(k, 2, 104) * 190 + 8 * Math.sin(t * 0.21 + k * 2);
        if (env.mix < 0.5 || hash(k, 9, 104) < rainK || frac(t * 0.4 + hash(k, 3, 104)) > 0.5) continue;
        scr.set(Math.round(wx - camX), Math.round(base + r), R.yellow[1]);
      }
      if (rainK > 0.02) rainfall(scr, camX, base, t, rainK, STREAK);
    }
  };
}
