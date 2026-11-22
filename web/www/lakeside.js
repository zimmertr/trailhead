// Reflection Lake, part two: out of the trees at the lake itself, turquoise under a huge sweeping
// peak. He runs left to right along the near shore, stops for the view with the map out, and
// again at the boulder where his journal lies open.
import { DEBUG, clamp, lerp, smooth, frac, sq, rng, hash, vnoise, fbm, bayer, R, DAY, INK, LIGHT, pick, BM, outline, windAt, veilTable, SHADE } from './core.js';
import { Strip, drawStrip, blitTall, baseline, shell } from './side.js';
import { makeTrunk, makeLimb, swordFern } from './forest.js';
import { makeConifer, makeFir, makeSpruce, makeBoulder, makeCloud, makeSmallSign, makeBush, makeMaple } from './sprites.js';
import { marmot, speck } from './fauna.js';
import { makeRunner, sideFig, cheerFig, swimFig } from './tj.js';
import { NAMES } from './content.js';
import { drawLens, startLens } from './events.js';
import { paintMonolith, moraineLakes, faceSnow, MW as PMW, MH as PMH, TOPY as PTOPY } from './monolith.js';

// Round 5 (T30): the lake on the map is about 1.6 times as wide, so the shore he runs along is longer
// than round 4's (624 over 8 s), at the same pace.
const SW = 1640, X0 = 500, LEN = 760, DUR = 9.75;
const D_MAP = 125, D_NOTE = 437, D_MARMOT = 276;
const FAR = -62; // the far shore, measured up from the trail (round 5, T30: the lake is deeper, -50 until then)
// The island out in the lake, the one the map shows a little left of the lake's middle: where it is
// seen dead ahead, where its waterline is, and how fast it crosses the view. It lies between the
// shores, so it moves slower than the near one and faster than the far one.
const ISLE_X = 790, ISLE_Y = -28, ISLE_K = 0.66, FIR_DX = -8;
// The swim out to it, in seconds from standing dressed on the trail: clothes off by T_OFF, up the
// bank by T_BANK, waded in by T_WADE. The swim itself takes as long as it is far, and the climb
// out T_CLIMB. Asked back, he goes through the same seconds backwards.
const T_OFF = 0.45, T_BANK = 1.05, T_WADE = 1.85, T_CLIMB = 0.7;

const shore = x => -9 + Math.round(2.5 * Math.sin(x / 37) + 3 * vnoise(x / 15, 3, 120));
const g = x => Math.round(2 * Math.sin(x / 120 + 1));
// How much forest there still is: 1 where he walks out of the trees, 0 once the shore is open
// parkland, a couple of seconds on.
const woodAt = x => smooth(X0 + 150, X0 - 30, x);
// Mist lies on the water off the wooded shore, and drifts a little way past where the trees stop.
const mistAt = x => smooth(X0 + 320, X0 - 10, x);
// Out where the woods end the parkland's flowers grow in drifts, as on the map: a wide patch of
// lupine, then heather, then paintbrush and white bistort, with plain turf between.
const driftAt = (x, y) => {
  if (woodAt(x) > 0.3) return null;
  const k = vnoise(x / 70, y / 26, 590) + 0.08 * (vnoise(x / 9, y / 5, 591) - 0.5);
  return k < 0.36 ? 'lupine' : k < 0.47 ? 'heather' : k < 0.53 ? null : k < 0.63 ? 'red' : k < 0.71 ? 'white' : null;
};
const WX = X0 - 470, WW = 420, WUP = 760;

// Mount Monolith behind the lake: the very picture the map lays over the volcano (monolith.js), so
// it is the same mountain with the same glaciers, cleavers, icefalls and Little Tahoma, seen from its
// south side across the water. It is shown at MS of the map's size, small enough that the summit and
// the upper icefalls stand clear in the sky while the far forest hides its foot, as Rainier's does
// from Reflection Lakes. The meadow and fir clumps the picture paints at its foot come along too.
const MS = 0.75, PH = Math.round((PMH - PTOPY) * MS), PW = Math.round(PMW * MS);
// The streams out of the moraine lakes (T30): each comes down the far shore into the lake below its glacier.
// They belong to the far shore (its strip's columns), where a gap is left in the trees for each and its bed
// is painted, so they cross the view with the shore. Seen from the map stop they lie straight under their
// glaciers (the crater, picture column 330, is the strip's column 600 there).
const INFLOW = moraineLakes().map(e => Math.round(600 + (e.mid - 330) * MS));
// One inflow on the screen: its white water sliding down the bed (x0: the screen column of the bed's own
// column 0), foam where it meets the lake, and the pale plume of glacier silt it carries out into the water,
// drifting toward the outflow.
function inflowWater(scr, x0, hor, t, bed) {
  const { VW, VH, fb } = scr, T = R.tarn;
  for (const [dx, y, e, o, p] of bed) { const sx = x0 + dx, sy = hor + y; if (sx < 0 || sx >= VW || sy < 0 || sy >= VH) continue;
    const u = frac((y - t * 16) / p + o); fb[sy * VW + sx] = u < (e ? 0.4 : 0.7) ? R.white[1] : u < 0.9 ? R.water[4] : R.water[3]; }
  for (let dy = 2; dy < 15; dy++) { const sy = hor + dy; if (sy < 0 || sy >= VH) continue; const half = 3 + dy * 0.9, cx = x0 - dy * 0.5 + 1.2 * Math.sin(dy * 0.8 + t * 0.9);
    for (let i = -Math.ceil(half); i <= Math.ceil(half); i++) { const sx = Math.round(cx + i); if (sx < 0 || sx >= VW) continue;
      const a = (1 - dy / 15) * (1 - Math.abs(i) / (half + 1)); if (bayer(sx, sy) < a * 1.5 - 0.12) fb[sy * VW + sx] = a > 0.45 ? T[5] : T[4]; } }
  for (let i = -4; i <= 5; i++) if (hash(i, Math.floor(t * 5), x0 & 63) < 0.6) scr.set(x0 + i, hor + 1 + (Math.abs(i) > 2 ? 1 : 0), R.white[1]);
}
// The painting, and for each pixel of an icefall the plain snow that covers it until its avalanche and
// which icefall it is (one more than its place, 0: none). An icefall the map has under snow now
// (faceSnow, round 5) is painted as snow here too.
let PEAK = null;
function paintPeak(S) {
  if (!PEAK) { const P = paintMonolith(), plain = new Uint8Array(PMW * PMH), face = new Uint8Array(PMW * PMH); for (let j = 0; j < P.cover.length; j += 3) { plain[P.cover[j]] = P.cover[j + 1]; face[P.cover[j]] = (P.cover[j + 2] >> 6) + 1; } PEAK = { P, plain, face }; }
  // The crater (x 330 in the picture) lands on column 600 of the strip.
  const { P, plain, face } = PEAK, sx = 600 - Math.round(330 * MS);
  for (let x = 0; x < PW; x++) {
    const u = Math.min(PMW - 1, Math.floor((x + 0.5) / MS));
    let first = -1;
    for (let y = 0; y < PH; y++) {
      const v = PTOPY + Math.floor((y + 0.5) / MS), i = v * PMW + u, c = v < PMH ? (face[i] && faceSnow.on[face[i] - 1] ? plain[i] : P.d[i]) : 0;
      if (!c) continue;
      if (first < 0) first = y;
      S.set(sx + x, y - PH, c);
    }
    if (first > 0) S.set(sx + x, first - 1 - PH, INK);
  }
}

function miniFir(S, x, y, h, c0) {
  for (let j = 0; j < h; j++) { const hw = Math.max(0, (j + 1) * 0.42 * (j % 3 === 2 ? 0.7 : 1)); for (let i = -Math.round(hw); i <= Math.round(hw); i++) S.set(x + i, y - h + j, R.conifer[clamp(c0 + (i < 0 ? 1 : 0) - (j % 3 === 2 ? 1 : 0), 0, 4)]); }
}

// Mist on the water off the wooded shore: slow banks drifting along the surface, thickest low over
// the water and lapping up into the far trees, thinning out where the shore opens. Its own small
// function, since a per-pixel loop inside draw() is too big for the browser to optimise.
function lakeMist(scr, camX, hor, bot, t, veils) {
  const { VW, VH, fb } = scr;
  let x1 = VW; while (x1 > 0 && mistAt(camX + x1 - 1) <= 0) x1--;
  for (let y = Math.max(0, hor - 7); y < Math.min(VH, bot); y++) {
    const dy = y - hor, row = y * VW, lay = smooth(-7, 3, dy) * (0.5 + 0.5 * smooth(34, 8, dy));
    for (let x = 0; x < x1; x++) {
      const wx = camX + x, m = mistAt(wx) * lay; if (m <= 0.02) continue;
      const n = 0.6 * vnoise((wx - t * 5) / 64, dy / 3.4, 580) + 0.4 * vnoise((wx + t * 3) / 21, dy / 1.8, 581);
      const v = n * m * 2.1 - 0.45 + (bayer(x, y) - 0.5) * 0.22;
      if (v > 0.42) fb[row + x] = veils[1][fb[row + x]]; else if (v > 0.12) fb[row + x] = veils[0][fb[row + x]];
    }
  }
}

// The water. Off the far shore it is a mirror: the far trees and Monolith upside down in their own
// colours a shade darker, squashed as a reflection seen this low is. Nearer, more of the lake's own
// turquoise shows through, and everywhere the mirror is broken: each row sways a little with the
// swell, cat's paws of wind drift across and scuff it to plain water, and where he swims the rings
// and wake break it up round him. Its own small function, outside draw(), being a per-pixel loop.
function lakeWater(scr, hor, base, t, farS, farX, peak, peakX, sink, sw) {
  const { VW, VH, fb } = scr, tarn = R.tarn, pw = peak.w, fw = farS.w;
  // Far shore and mountain squashed by the same amount, chosen so the summit's reflection lands just
  // short of this shore: first the far trees upside down, then the snow above them.
  const squash = Math.max(2, (peak.up - 4 - sink) / Math.max(8, base - hor - 6));
  for (let y = Math.max(0, hor + 1); y < Math.min(VH, base + 2); y++) {
    const dy = y - hor, row = y * VW, depth = dy / -FAR;
    const swell = 1.5 * Math.sin(dy * 1.9 + t * 1.4) * Math.min(1, dy / 8);
    const fy = -Math.round(dy * squash) - 1, py0 = fy - sink;
    // How much of the mirror shows: nearly all of it off the far shore, about half near this one.
    const k0 = 0.97 - 0.4 * smooth(0.3, 1.1, depth);
    for (let x = 0; x < VW; x++) {
      let rip = swell, k = k0;
      const paw = vnoise((x - t * 14) / 38, dy / 1.7 + t * 0.15, 597);
      if (paw > 0.7) { k *= 0.2; rip += 1.5 * Math.sin(x * 0.9 + t * 6); }
      if (sw) {
        const ex = (x - sw[0]) / 34, ey = (y - sw[1]) / 7, e = ex * ex + ey * ey;
        if (e < 1) { rip += 3.5 * (1 - e) * Math.sin(Math.hypot(ex * 34, ey * 20) * 0.7 - t * 9); k *= 0.35 + 0.65 * e; }
      }
      const r = Math.round(rip), f = farS.get(((farX + x + r) % fw + fw) % fw, fy);
      const src = f || peak.get(((peakX + x + r) % pw + pw) % pw, py0);
      let v = 0.62 - 0.3 * smooth(0.55, 0, depth) + 0.07 * Math.sin(x / 19 + dy);
      if (src) {
        // The mirror breaks in long horizontal slivers of the lake's own water, more of them nearer, as
        // the picture shows, rather than in a checker of mirror and water.
        if (dy >= 2 && vnoise((x + r * 3) / 44 - t * 0.4, dy / 1.15, 598) < k * (0.55 + 0.45 * (1 - depth))) { fb[row + x] = SHADE[src]; continue; }
        const lum = (0.3 * DAY[src][0] + 0.59 * DAY[src][1] + 0.11 * DAY[src][2]) / 255; v = lerp(v, 0.15 + lum * 0.75, f ? 0.6 : 0.45);
      }
      if (dy < 2) v = 0.05;
      fb[row + x] = tarn[clamp(Math.round(v * 5 + (bayer(x, y) - 0.5) * 0.8), 0, 5)];
    }
    if ((dy & 3) === 1) for (let x = (Math.floor(t * 3) + dy * 7) % 23; x < VW; x += 23 + (dy % 5)) { const i = row + x; for (let k = 0; k < 3 + (dy % 4); k++) if (x + k < VW) fb[i + k] = LIGHT[fb[i + k]]; }
  }
}

// What the timeline needs to know of the lake, which takes no pictures to answer.
const META = {
  name: 'lakeside',
  dur: () => DUR,
  stops: () => [{ id: 'mountains', at: D_MAP / LEN }, { id: 'note', at: D_NOTE / LEN }],
  elev: (arg, q) => -g(X0 + q * LEN) * 1.5
};
export const makeLakeside = () => shell(META, buildLakeside, ['enter', 'focus', 'pick', 'act', 'hold', 'draw', 'trigger']);
function buildLakeside() {
  const rand = rng(57);

  // Far ranges, the peak, and the far shore with its talus and trees.
  const range = new Strip(900, 110, 4);
  for (let x = 0; x < 900; x++) {
    const top = -52 - 46 * fbm(x / 70, 1.3, 134, 4) - 10 * Math.sin(x / 41);
    for (let y = Math.round(top); y < 4; y++) { const sl = fbm((x + 2) / 70, 1.3, 134, 4) - fbm((x - 2) / 70, 1.3, 134, 4); range.set(x, y, y - top < 4 + 3 * vnoise(x / 5, 1, 135) && top < -74 ? R.farsnow[sl > 0 ? 1 : 0] : pick('far', 0.5 + sl * 9 + (y - top) * -0.004, x, y)); }
  }
  const peak = new Strip(1240, PH + 4, 2); paintPeak(peak); let peakRev = faceSnow.rev;
  const farS = new Strip(1400, 60, 4);
  for (let x = 0; x < 1400; x++) {
    const top = -9 - 9 * fbm(x / 36, 2, 136, 3) - 6 * Math.max(0, Math.sin(x / 57 + 1));
    for (let y = Math.round(top); y < 2; y++) farS.set(x, y, y > -2 ? (vnoise(x / 9, 1, 141) > 0.76 ? R.gold[3] : R.conifer[0]) : fbm(x / 14, y / 5, 137, 3) > 0.52 ? pick('rock', 0.62 + 0.3 * (hash(x >> 1, y >> 1, 138) - 0.5), x, y, 0.5) : pick('conifer', 0.3 + 0.3 * hash(x, y, 139), x, y));
  }
  for (let n = 0; n < 900; n++) { const x = rand() * 1400, cl = fbm(x / 80, 7, 140, 3); if (cl < 0.36) continue; const fx = Math.round(x), fy = Math.round(-3 - rand() * 12), fh = 8 + (rand() * 12 * cl | 0), fc = rand() < 0.5 ? 1 : 2; if (!INFLOW.some(c => Math.abs(fx - c) < 7)) miniFir(farS, fx, fy, fh, fc); }
  // Each inflow's bed (T30): a gap in the far trees, grey rock either side, the water widening as it comes
  // down, and a small fan of pale gravel where it runs into the lake. bed: its water, for the screen to move.
  const farTop = x => -9 - 9 * fbm(x / 36, 2, 136, 3) - 6 * Math.max(0, Math.sin(x / 57 + 1));
  const beds = INFLOW.map(c => { const bed = [], y0 = Math.round(farTop(c)) - 2;
    for (let y = y0; y <= 0; y++) { const u = (y - y0) / -y0, cx = Math.round(3.5 * Math.sin(y / 4.5 + c) * (1 - u)), hw = u > 0.75 ? 2 : u > 0.35 ? 1 : 0;
      for (let i = -hw - 3; i <= hw + 3; i++) { const a = Math.abs(i) - hw;
        if (a <= 0) { farS.set(c + cx + i, y, R.white[1]); bed.push([cx + i, y, a === 0 && hw > 0 ? 1 : 0, hash(i, c, 141), 5 + hash(i, c, 142) * 4]); }
        else if (a <= 2 ? hash(i, y >> 1, 143 + c) < 0.75 : hash(i, y >> 1, 143 + c) < 0.3) farS.set(c + cx + i, y, pick('rock', 0.4 + 0.4 * hash(i >> 1, y >> 1, 144 + c), c + i, y, 0.5)); } }
    for (let i = -9; i <= 9; i++) for (let y = -3; y < 2; y++) if (Math.abs(i) > 2 && y > -4 + Math.abs(i) * 0.35 - hash(i, 3, 145 + c)) farS.set(c + i, y, hash(i, y, 146 + c) < 0.3 ? R.rock[3] : R.gold[5]);
    return bed; });
  // The near shore: slabs and gravel at the water, the trail, then meadow down to the bottom.
  const main = new Strip(SW, 24, 240);
  for (let x = 0; x < SW; x++) {
    const sy = shore(x), gy = g(x);
    for (let y = sy; y < 240; y++) {
      const r = y - gy; let c;
      const sT = 0.62 - smooth(6, -8, r) * 0.22 + 0.09 * smooth(8, 30, r) * (1 - woodAt(x));
      const slab = fbm(x / 34, y / 15, 141, 3) > sT, gravel = fbm(x / 13, y / 7, 142, 3);
      if (y - sy < 2) c = y === sy ? R.tarn[5] : R.rock[1];
      else if (r >= -3 && r <= 4) c = hash(x, y, 143) < 0.07 ? R.rock[2] : pick('dirt', 0.62 - Math.abs(r - 0.5) * 0.06 + 0.25 * (vnoise(x / 5, y / 2, 144) - 0.5), x, y, 0.7);
      else if (slab) c = Math.abs(frac(x / 31 + y / 11 + vnoise(x / 30, y / 30, 145)) - 0.5) < 0.016 ? R.rock[1] : fbm(x / 34, (y + 2) / 15, 141, 3) <= sT - 0.02 ? R.rock[1] : pick('rock', 0.86 - (y - sy) * 0.0012 + 0.16 * (vnoise(x / 7, y / 4, 146) - 0.5), x, y, 0.5);
      else if (r < -3 && gravel > 0.5 + 0.12 * smooth(X0 + 120, X0 + 260, x)) c = pick('rock', 0.7 + 0.3 * (hash(x, y, 147) - 0.5), x, y);
      else c = pick('grass', 0.58 + 0.5 * (fbm(x / 22, y / 12, 148, 3) - 0.5) + 0.12 * (hash(x >> 1, y >> 1, 149) - 0.5) - smooth(60, 230, r) * 0.25, x, y, 0.3);
      // Under the trees the ground is still the forest's: moss, no slabs, no gravel.
      const wd = woodAt(x);
      if (wd > 0 && y - sy >= 2 && !(r >= -3 && r <= 4) && hash(x, y, 331) < wd * 1.2 - 0.1) c = pick('moss', 0.36 + 0.3 * (fbm(x / 8, y / 5, 332, 3) - 0.5) + 0.08 * (1 - wd), x, y, 0.8);
      main.set(x, y, c);
    }
  }
  // Tufts, heather and flowers in the meadow.
  const isGrass = (x, y) => { const c = main.get(x, y); return c >= R.grass[0] && c <= R.grass[4]; };
  for (let n = 0; n < 5000; n++) { const x = (rand() * SW) | 0, y = (-4 + rand() * 240) | 0; if (!isGrass(x, y) || !isGrass(x, y - 2)) continue; main.set(x, y - 2, R.grass[4]); main.set(x - 1, y - 1, R.grass[3]); main.set(x + 1, y - 1, R.grass[3]); main.set(x, y, R.grass[1]); }
  for (let n = 0; n < 260; n++) {
    const cx = rand() * SW, cy = 8 + rand() * 220, dk = driftAt(cx, cy), type = dk === 'lupine' ? 0 : dk === 'red' ? 0.5 : dk === 'white' ? 0.9 : dk === 'heather' ? 0.7 : rand(), count = 5 + (rand() * 12 | 0);
    for (let k = 0; k < count; k++) {
      const x = Math.round(cx + (rand() - 0.5) * 20), y = Math.round(cy + (rand() - 0.5) * 10); if (!isGrass(x, y) || !isGrass(x, y - 1)) continue;
      if (type < 0.4) { main.set(x, y - 1, R.lupine[2]); main.set(x, y, R.lupine[1]); }
      else if (type < 0.65) { main.set(x, y - 1, R.red[2]); main.set(x, y, R.red[1]); }
      else if (type < 0.85) { main.set(x, y, R.pink[1]); main.set(x + 1, y, R.pink[2]); }
      else main.set(x, y, R.white[1]);
    }
  }

  {
    const fr = rng(592);
    for (let n = 0; n < 2600; n++) {
      const cx = X0 + 100 + fr() * (SW - X0 - 100), cy = 4 + fr() * 232, dk = driftAt(cx, cy); if (!dk) continue;
      for (let k = 0, m = 4 + (fr() * 7 | 0); k < m; k++) {
        const x = Math.round(cx + (fr() - 0.5) * 14), y = Math.round(cy + (fr() - 0.5) * 6); if (!isGrass(x, y) || !isGrass(x, y - 1)) continue;
        if (dk === 'lupine') { main.set(x, y - 2, R.lupine[2]); main.set(x, y - 1, R.lupine[1]); main.set(x, y, R.grass[1]); }
        else if (dk === 'red') { main.set(x, y - 1, R.red[2]); main.set(x, y, R.red[1]); }
        else if (dk === 'white') { main.set(x, y - 1, R.white[1]); main.set(x + (k & 1), y, R.white[0]); }
        // Heather: low dark mounds dotted pink.
        else { main.set(x, y, R.moss[1]); main.set(x + 1, y, R.moss[1]); main.set(x, y - 1, R.pink[1]); main.set(x + 1, y - 1, (k & 1) ? R.pink[2] : R.moss[2]); }
      }
    }
  }
  const things = [];
  const boulders = [3, 4, 5, 6, 8, 10, 12].map((r, i) => makeBoulder(150 + i, r));
  const firs = Array.from({ length: 6 }, (_, i) => makeFir(310 + i)), spruces = Array.from({ length: 4 }, (_, i) => makeSpruce(230 + i));
  const bushes = [0, 1, 2].map(i => makeBush(740 + i, 'heather')).concat([0, 1].map(i => makeBush(750 + i, 'huck')));
  const xMap = X0 + D_MAP, xNote = X0 + D_NOTE, xMarmot = X0 + D_MARMOT;
  const keep = x => Math.abs(x - xMap) > 46 && Math.abs(x - xNote) > 40 && Math.abs(x - xMarmot) > 30;
  // Behind the trail only low things, so the lake and the peak stay in view.
  for (let n = 0; n < 60; n++) { const x = rand() * SW; if (!keep(x)) continue; things.push({ bm: boulders[(rand() * 4) | 0], x: Math.round(x), y: shore(x) + 3 + Math.round(rand() * 3) }); }
  for (let n = 0; n < 12; n++) { const x = rand() * SW; if (Math.abs(x - (X0 + LEN / 2)) < 250 || !keep(x)) continue; const k = 1 + (rand() * 3 | 0); for (let j = 0; j < k; j++) things.push({ tree: firs[(rand() * 6) | 0], x: Math.round(x + j * 11 + rand() * 5), y: g(x) - 5 + Math.round(rand() * 2) }); }
  for (let n = 0; n < 150; n++) { const x = rand() * SW, y = 8 + sq(rand()) * 220, k = rand(); things.push(k < 0.45 ? { bm: boulders[Math.min(6, (rand() * 4 + y / 60) | 0)], x: Math.round(x), y: Math.round(y) } : { bm: bushes[(rand() * 5) | 0], x: Math.round(x), y: Math.round(y) }); }
  // Subalpine firs: narrow spires, the tree of the high parkland.
  const spires = Array.from({ length: 8 }, (_, i) => { const r = rng(600 + i), H = i < 5 ? 30 + (r() * 24 | 0) : 13 + (r() * 9 | 0); return makeConifer(600 + i, H, Math.max(5, Math.round(H * 0.27)), 'conifer', Math.max(5, Math.round(H / 4.5)), { ragged: i & 1 }); });
  for (let n = 0; n < 34; n++) { const x = rand() * SW, y = 84 + rand() * 150, tr = rand() < 0.6 ? spruces[(rand() * 4) | 0] : firs[(rand() * 6) | 0]; things.push({ tree: woodAt(x) > 0.3 ? tr : spires[(hash(n, 1, 596) * 5) | 0], x: Math.round(x), y: Math.round(y) }); }
  {
    const cr = rng(593), stopsX = [X0, X0 + 40, xMap, xNote, xMarmot, X0 + LEN];
    // One big boulder in the meadow below the trail, the kind the glacier left, with white flowers at
    // its foot: on the open shore, clear of where he stops, where a slow field is highest.
    let bx = 0, best = -1;
    for (let x = X0 + 200; x < X0 + LEN - 60; x += 3) { if (stopsX.some(sx => Math.abs(x - sx) < 44)) continue; const v = vnoise(x / 80, 4, 595); if (v > best) { best = v; bx = x; } }
    // Low enough in the meadow that its top stays under the trail, so it never hides his feet.
    const by = g(bx) + 37; things.push({ bm: makeBoulder(163, 15), x: bx, y: by });
    for (let n = 0; n < 70; n++) { const x = Math.round(bx + (cr() - 0.5) * 60), y = Math.round(by + (cr() - 0.2) * 10); if (isGrass(x, y) && isGrass(x, y - 1)) { main.set(x, y - 1, R.white[1]); main.set(x, y, n & 1 ? R.white[0] : R.grass[1]); } }
    // Clumps of them where a slow field says so: the tallest in the middle, smaller ones round it.
    // None in front of the trail where he stops, and none on the boulder.
    const centres = [[bx, by]];
    for (let n = 0; n < 90 && centres.length < 14; n++) {
      const x = X0 + 170 + cr() * (SW - X0 - 190), y = 14 + sq(cr()) * 216, fld = vnoise(x / 120, y / 70, 594);
      if (fld < 0.55 || woodAt(x) > 0.1 || (y < 56 && stopsX.some(sx => Math.abs(x - sx) < 44)) || centres.some(([a, b]) => Math.hypot(a - x, (b - y) * 2) < 70)) continue;
      centres.push([x, y]);
      for (let k = 0, m = 2 + Math.round((fld - 0.55) * 14 + cr() * 2); k <= m; k++) {
        const a = k ? (cr() - 0.5) * 30 : 0, b = k ? (cr() - 0.3) * 8 : 0;
        things.push({ tree: spires[k === 0 ? (cr() * 5) | 0 : k < 3 ? (cr() * 8) | 0 : 5 + ((cr() * 3) | 0)], x: Math.round(x + a), y: Math.round(y + b) });
      }
    }
    for (let n = 0; n < 160; n++) { const x = X0 + 120 + cr() * (SW - X0 - 120), y = 8 + cr() * 228; if (driftAt(x, y) === 'heather') things.push({ bm: bushes[(cr() * 3) | 0], x: Math.round(x), y: Math.round(y) }); }
  }
  const marmotRock = makeBoulder(161, 11); things.push({ bm: marmotRock, x: xMarmot, y: shore(xMarmot) + 5 });
  // How far above its foot the rock's top is, so the marmot can lie on the rock itself: the picture of a rock has empty rows above it.
  let rockTop = 0; while (rockTop < marmotRock.h && !marmotRock.d[rockTop * marmotRock.w + marmotRock.ox]) rockTop++;
  rockTop = marmotRock.oy - rockTop;
  const noteRock = makeBoulder(162, 9);
  { const b = noteRock, x = b.ox - 1, y = b.oy - 13; for (let dx = 0; dx < 7; dx++) { b.set(x + dx, y, dx === 3 ? R.white[0] : R.white[1]); b.set(x + dx, y + 1, dx === 3 ? R.red[0] : R.white[0]); } b.set(x - 1, y + 1, R.red[1]); b.set(x + 7, y + 1, R.red[1]); b.set(x + 5, y - 1, R.navy[1]); }
  things.push({ bm: noteRock, x: xNote + 15, y: g(xNote) - 4 });
  const clouds = [0, 1, 2, 3].map(i => ({ bm: makeCloud(610 + i), x: i * 210, y: 30 + (i & 1) * 34 + i * 9, v: 2.5 + i }));

  // The island: a low grassy hump with stones at the water and one fir, as on the map.
  const isle = new BM(64, 14); isle.ox = 32; isle.oy = 12;
  for (let x = -28; x <= 28; x++) {
    const top = Math.round(7.4 * Math.sqrt(1 - sq(x / 28.5)) * (0.75 + 0.4 * vnoise(x / 9, 5, 340)));
    for (let h = 0; h <= top; h++) {
      const y = isle.oy - h, stone = h < 1 + (hash(x >> 1, 3, 341) < 0.45 ? 1 : 0) + (Math.abs(x) > 22 ? 1 : 0);
      isle.set(isle.ox + x, y, h === 0 ? R.rock[1] : stone ? pick('rock', 0.72 + 0.3 * (hash(x, h, 342) - 0.5), x, y) : pick('grass', 0.42 + 0.09 * h + 0.25 * (hash(x >> 1, h, 343) - 0.5), x, y, 0.3));
    }
  }
  for (const [x, c] of [[-20, R.lupine[2]], [-15, R.white[1]], [4, R.red[2]], [17, R.pink[2]], [21, R.lupine[2]]]) isle.set(isle.ox + x, isle.oy - 4, c);
  outline(isle, INK);
  for (let x = 0; x < isle.w; x++) isle.d[(isle.oy + 1) * isle.w + x] = 0;
  const isleFir = firs[2];
  // The island and its fir in one picture, for their reflection.
  const isleAll = new BM(64, 64); isleAll.ox = 32; isleAll.oy = 62;
  for (let j = 0; j <= isle.oy; j++) for (let i = 0; i < isle.w; i++) { const c = isle.d[j * isle.w + i]; if (c) isleAll.set(i, isleAll.oy - isle.oy + j, c); }
  for (const part of isleFir.parts) for (let j = 0; j < part.bm.h; j++) for (let i = 0; i < part.bm.w; i++) { const c = part.bm.d[j * part.bm.w + i]; if (c) isleAll.set(isleAll.ox + FIR_DX + part.x + i, isleAll.oy - 5 + part.y + j, c); }

  // The forest he has just come out of stands at the left: a wall of leaves closing off the lake
  // there, three of the giants with their limbs reaching out over the shore, maples and ferns under them.
  const woods = new Strip(WW, WUP, 10);
  for (let col = 0; col < WW; col++) for (let y = -WUP; y < 10; y++) {
    // The wall's edge is ragged, and leans out over the shore higher up.
    const e = (col - 322) / 110 - 0.75 * smooth(-110, -250, y), n = fbm(col / 15, y / 19, 333, 3), m = (n - 0.5) * 0.9 - e;
    if (m <= 0) continue;
    // Boughs in clumps, each lit along its top and dark underneath.
    const leaf = fbm(col / 5, y / 4, 334, 3), deep = smooth(0, 0.5, m), cl = fbm(col / 17, y / 11, 335, 3), up = fbm(col / 17, (y - 5) / 11, 335, 3);
    woods.set(col, y, pick('moss', 0.4 - 0.2 * deep + 0.3 * (leaf - 0.5) + clamp((cl - up) * 1.6, -0.08, 0.1) + 0.16 * (cl - 0.5) + (m < 0.05 ? 0.16 : 0) - smooth(-60, 6, y) * 0.12, col, y, 0.8));
  }
  // Round 5 (T79b): where he stops to read the map, no trunk stands in the view (on a 1440-wide window it
  // reaches 269 px west of him), so the lake and Mount Monolith show clean across it. The third giant stood
  // 54 px further east and cut into that view's edge.
  const re = rng(571), edge = [], CLEAR = X0 + D_MAP - 285;
  for (const [dx, w, by, limbs] of [[-262, 30, -8, [[1, 210, 52], [1, 128, 40]]], [-186, 24, -7, [[1, 168, 58], [-1, 250, 36]]], [-172, 18, -6, [[1, 142, 44]]]]) {
    const x = X0 + dx, t = { bm: makeTrunk(1500 + dx, w, 300), x, y: g(x) + by, tall: true };
    edge.push(t);
    for (const [dir, up, len] of limbs) edge.push({ bm: makeLimb(2500 + dx + up, len, dir), x: x + dir * (w / 2 - 2), y: t.y - up, z: t.y + 0.1 });
  }
  // The forest runs on along the shore for the first couple of seconds: spruces between the trail
  // and the water with the lake showing between them, a few more giants, and trees in front of the
  // trail, all thinning out as the woods give way to the parkland. Where he starts and where he stops
  // to read the map stay clear in front of him.
  const signX = X0 + 40; things.push({ bm: makeSmallSign(), x: signX, y: g(signX) - 5 });
  const rw = rng(572);
  // Behind the trail they stand in clumps with water between, so the lake and its mist show through.
  for (let x = X0 - 150; x < X0 + 210; x += 6 + rw() * 8) {
    const wd = woodAt(x), xr = Math.round(x), clump = vnoise(x / 34, 2, 573);
    // Beside the map stop only the small firs stand between him and the water, never a tall spruce (T79b).
    if (rw() < wd * (clump > 0.5 ? 1.1 : 0.12) && Math.abs(x - signX) > 14) things.push({ tree: (rw() < 0.25 + 0.5 * wd) && Math.abs(x - xMap) > 40 ? spruces[(rw() * 4) | 0] : firs[(rw() * 6) | 0], x: xr, y: Math.min(g(x) - 4, Math.round(lerp(shore(x) + 5, g(x) - 6, rw()))) });
    if (rw() < wd * 0.32 && Math.abs(x - X0) > 22 && Math.abs(x - xMap) > 22 && Math.abs(x - signX) > 18) things.push({ tree: rw() < 0.6 ? spruces[(rw() * 4) | 0] : firs[(rw() * 6) | 0], x: xr + Math.round(rw() * 6), y: g(x) + 34 + Math.round(sq(rw()) * 46) });
  }
  for (let x = X0 - 100, n = 0; x < X0 + 50; x += 40 + rw() * 30) {
    // These few giants stood on the stretch the map stop looks across; every one that would is left out (T79b).
    // Each still takes its turns of the dice, so the trees and stones after them stand where they did.
    const wd = woodAt(x); if (rw() > wd) continue;
    const y = g(x) - 4 - Math.round(rw() * 2), k = n++;
    if (x < CLEAR) things.push({ bm: makeTrunk(1600 + k, Math.round(11 + 9 * wd), 300), x: Math.round(x), y, tall: true });
  }
  const maples = [0, 1, 2].map(i => makeMaple(126 + i)), ferns = [7, 9, 12, 15].map((r, i) => swordFern(340 + i, r));
  for (const [dx, k] of [[-226, 0], [-150, 1], [-136, 2]]) edge.push({ tree: maples[k], x: X0 + dx, y: g(X0 + dx) - 5 });
  for (let n = 0; n < 64; n++) {
    const x = Math.round(X0 - 330 + re() * 480), wd = woodAt(x), front = re() < 0.6, dy = front ? 7 + sq(re()) * 70 : -5 - re() * 2, k = re();
    if (k > wd + 0.15) continue;
    edge.push({ bm: ferns[Math.min(3, (front ? 1 + dy / 30 : 0) + re() * 1.5 | 0)], x, y: g(x) + Math.round(dy) });
  }
  things.push(...edge);

  const run = makeRunner('trail'), dip = makeRunner('plunge');
  const crawl = [0, 1, 2, 3].map(f => swimFig('plunge', f)), cheer = [cheerFig('plunge'), cheerFig('plunge', { spread: 8 }), cheerFig('plunge', { bob: -2, lift: [2, 2] })];
  // What he leaves on the trail while he swims: the vest, the shirt folded on top of it, the shoes beside them.
  const pile = {};
  { const v = pile.vest = new BM(10, 5); v.ox = 4; v.oy = 4; for (let y = 1; y < 4; y++) for (let x = 1; x < 9; x++) v.set(x, y, y === 1 ? R.navy[2] : R.navy[1]); v.set(2, 2, R.shoe[2]); v.set(7, 2, R.shoe[2]); v.set(4, 3, R.navy[0]); v.set(5, 3, R.navy[0]); outline(v, INK); }
  { const h = pile.shirt = new BM(9, 5); h.ox = 4; h.oy = 4; for (let y = 1; y < 4; y++) for (let x = 1; x < 8; x++) h.set(x, y, y === 1 ? R.sun[2] : y === 3 ? R.sun[0] : R.sun[1]); outline(h, INK); }
  { const o = pile.shoes = new BM(11, 5); o.ox = 4; o.oy = 4; for (const x0 of [1, 6]) { o.set(x0, 2, R.shoe[1]); o.set(x0 + 1, 2, R.shoe[1]); o.set(x0, 3, R.shoe[1]); o.set(x0 + 1, 3, R.shoe[2]); o.set(x0 + 2, 3, R.shoe[2]); o.set(x0 + 3, 3, R.shoe[0]); o.set(x0 + 1, 1, R.blaze[1]); } outline(o, INK); }
  const mapFig = sideFig('trail', { lean: 0, look: 'down', hands: [[5, 1], [4, 2]], elbowFwd: false, held: (b, sh) => { for (let y = 0; y < 5; y++) for (let x = 0; x < 6; x++) b.set(sh[0] + 4 + x, sh[1] - 1 + y, (x + y) % 4 === 1 ? R.moss[5] : x === 3 ? R.white[0] : R.white[1]); b.set(sh[0] + 6, sh[1] + 1, R.tarn[3]); b.set(sh[0] + 8, sh[1] + 2, R.red[1]); } });
  const writeFig = [0, 1].map(f => sideFig('trail', { lean: 2, look: 'down', hands: [[6, 3 + f], [4, 4]], held: (b, sh) => { b.set(sh[0] + 7, sh[1] + 2 + f, R.navy[0]); } }));
  const sit = [0, 1].map(f => sideFig('trail', { feet: [[6, 3], [5, 4]], crouch: 5, lean: 0, hands: f ? [[4, -2], [2, 3]] : [[3, 3], [2, 3]] }));
  const marm = { sun: marmot('sun'), up: marmot('up') }, bird = [speck(0), speck(1)];

  const st = {}, focus = { x: 0, y: 0 }, mistV = [veilTable(0.45), veilTable(0.75)];
  // swim is how far into the swim he is, in seconds (0 on the trail); dir is +1 on the way out and
  // while he stays on the island, -1 on the way back; swimT is how long the swimming part takes.
  let cam = 0, last = { camX: 0, base: 0, isle: [0, 0], me: [0, 0] }, swim = 0, dir = 0, swimT = 3, arrived = 0, whistled = false;
  // Clicks on the animals (round 6, note 10): the marmot whistles and dives behind its rock; the loon dives and
  // comes up farther along with a wail; her chick paddles hard to catch her up. loonAt: where each was drawn.
  let dived = -99, loonDive = -99, loonOff = 0, loonUp = true, chickGo = -99; const loonAt = [null, null];
  const list = [];
  const xOf = q => X0 + q * LEN;

  return {
    ...META,
    enter(scr, arg, q) { cam = xOf(q); st.y = null; swim = 0; dir = 0; },
    focus: () => focus,
    pick(sx, sy) {
      const wx = sx + last.camX, wy = sy - last.base;
      if (Math.abs(wx - signX) < 8 && wy > g(signX) - 22 && wy < g(signX) - 2) return { label: NAMES.lakeside.sign, x: signX - last.camX, y: last.base + g(signX) - 24 };
      const ax = Math.abs(sx - last.isle[0]), ay = sy - last.isle[1], onIsle = ay < 2 && (ay > -9 ? ax < 30 : ay > -42 && ax < 13);
      // While he is out there, he and the island call him back. Asked first, since from some spots on the
      // shore the island stands right above the marmot's rock and a tap on it would wake the marmot instead.
      if (swim > 0 && dir > 0 && (onIsle || (Math.abs(sx - last.me[0]) < 10 && sy > last.me[1] - 30 && sy < last.me[1] + 4))) return { label: NAMES.lakeside.back, x: sx, y: sy - 6, act: 'back' };
      for (const k of [0, 1]) { const L = loonAt[k]; if (L && sx >= L[0] - 2 && sx <= L[0] + 9 && sy >= L[1] - 5 && sy <= L[1] + 2) return { label: k ? NAMES.lakeside.chick : NAMES.lakeside.loon, x: L[0] + 3, y: L[1] - 7, act: k ? 'chick' : 'loon' }; }
      if (Math.abs(wx - xMarmot) < 13 && wy > shore(xMarmot) - 32 && wy < shore(xMarmot) + 6) return { label: NAMES.lakeside.marmot, x: xMarmot - last.camX, y: last.base + shore(xMarmot) - 30, act: 'marmot' };
      // Otherwise the island and the water send him out.
      if (swim > 0) return null;
      if (last.reach && (onIsle || (wy > FAR + 2 && wy < shore(wx) - 1))) return { label: NAMES.lakeside.swim, x: sx, y: sy - 6, act: 'swim' };
      return null;
    },
    act(id, env) {
      if (id === 'swim' && !env.running && swim === 0 && last.reach) { swim = 1e-3; dir = 1; env.found('swim'); return true; }
      if (id === 'back' && swim > 0) { dir = -1; return true; }
      if (id === 'marmot') { whistled = env.t; if (env.t - dived > 4.6) dived = env.t; env.sfx('whistle'); env.found('marmot'); return true; }
      if (id === 'loon') { if (env.t - loonDive > 4) { loonDive = env.t; loonUp = false; env.sfx('plop'); } return true; }
      if (id === 'chick') { chickGo = env.t; env.sfx('eep'); return true; }
      return false;
    },
    // Asked to run on while he is in the water or on the island, he swims back and dresses first.
    hold: () => swim > 0,
    // The debug menu's start for the lenticular cloud works here too, and starts it on the map as well.
    trigger: (name, t) => name === 'lens' && startLens(t),
    draw(scr, env, arg, q) {
      const { VW, VH, fb } = scr, { t, tq } = env;
      const mx = xOf(q), d = q * LEN, my = g(mx);
      const anchor = scr.narrow ? 0.5 : 0.56;
      cam += (mx - cam) * (env.calm ? 1 : Math.min(1, env.dt * 8));
      const camX = Math.round(cam - VW * anchor + env.look.x * 0.5), base = baseline(scr, env.shown, st);
      const ix = Math.round(VW / 2 + (ISLE_X - camX - VW / 2) * ISLE_K), reach = ix > 30 && ix < VW - 30;
      // Start or Space while he is away turns him round (hold() keeps him here until he is back).
      // Dragged along the trail instead, he is simply back on it.
      if (env.moving && !env.running) { swim = 0; dir = 0; }
      if (env.running && swim > 0) dir = -1;
      // Where he meets the water once he has waded in, and where he lands in front of the island.
      const X = Math.round(mx - camX), bank = shore(mx), IN = [X, bank - 20], LAND = [ix + 9, ISLE_Y + 2];
      if (dir > 0 && swim < T_WADE) swimT = clamp(Math.hypot(LAND[0] - IN[0], LAND[1] - IN[1]) / 36, 0.5, 5.5);
      const END = T_WADE + swimT + T_CLIMB;
      if (dir) {
        const was = swim; swim = clamp(swim + dir * env.dt, 0, END);
        const wet = dir > 0 ? T_BANK + 0.1 : END - T_CLIMB * 0.5;
        if ((was < wet) !== (swim < wet)) env.sfx('splash');
        if (swim >= END && was < END) arrived = t;
        if (swim <= 0) dir = 0;
      }
      // at: his feet (or, swimming, where he meets the water), how deep he stands, and what he is doing.
      let at = null;
      if (swim > 0) {
        if (swim < T_OFF) at = { x: X, y: my, k: 'strip' };
        else if (swim < T_BANK) at = { x: X, y: lerp(my, bank + 1, (swim - T_OFF) / (T_BANK - T_OFF)), k: 'walk' };
        else if (swim < T_WADE) { const k = (swim - T_BANK) / (T_WADE - T_BANK); at = { x: X, y: lerp(bank + 1, bank - 11, k), depth: k * 9, k: 'wade' }; }
        else if (swim < T_WADE + swimT) { const k = (swim - T_WADE) / swimT; at = { x: lerp(IN[0], LAND[0], k), y: lerp(IN[1], LAND[1], k), k: 'swim' }; }
        else if (swim < END) { const k = (swim - T_WADE - swimT) / T_CLIMB; at = { x: LAND[0], y: lerp(ISLE_Y + 9, ISLE_Y - 2, k), depth: (1 - k) * 7, k: 'wade' }; }
        else at = { x: LAND[0], y: ISLE_Y - 2, k: 'cheer' };
      }
      last = { camX, base, reach, isle: [ix, base + ISLE_Y], me: at ? [Math.round(at.x), Math.round(base + at.y)] : [X, base + my] };

      // Sky, lightest at the horizon.
      const sb = R.skyband, hor = base + FAR;
      for (let y = 0; y < Math.min(VH, hor + 2); y++) {
        const f = clamp(1 - (hor - y) / 250, 0, 1) * (sb.length - 1), b0 = Math.floor(f), e = f - b0, row = y * VW;
        if (e < 0.72 || b0 >= sb.length - 1) fb.fill(sb[b0], row, row + VW); else for (let x = 0; x < VW; x++) fb[row + x] = sb[b0 + (bayer(x, y) < (e - 0.72) / 0.28 ? 1 : 0)];
      }
      for (const c of clouds) scr.blit(c.bm, ((c.x + t * c.v) % (VW + 140)) - 70, Math.max(4, hor - PH - 70) + c.y * (scr.narrow ? 1 : 0.5));
      drawStrip(scr, range, camX * 0.06 + 100, hor);
      // The summit stands straight across the water from where he stops to read the map, and drifts by
      // slowly as he runs, being so far off.
      const peakX = 0.2 * (camX - (X0 + D_MAP - VW * anchor)) + 600 - VW * 0.5;
      // The summit stays clear of the buttons along the top; the foot sinks behind the far shore as far as it has to.
      const sink = clamp(PH + 26 - hor, 0, 140);
      if (peakRev !== faceSnow.rev) { peakRev = faceSnow.rev; paintPeak(peak); }
      drawStrip(scr, peak, peakX, hor + sink);
      // The lenticular cloud, when it stands over the summit on the map, stands over it here at the same moment.
      if (DEBUG.clouds) drawLens(scr, 600 - Math.round(peakX), hor + sink - PH + 2, t, MS);
      const farX = camX * 0.45 + 200;
      drawStrip(scr, farS, farX, hor);

      // The lake, with the far shore and Monolith upside down in it.
      const sw = at && (at.k === 'swim' || (at.k === 'wade' && at.depth >= 1)) ? [at.x, base + at.y] : null;
      lakeWater(scr, hor, base, t, farS, Math.round(farX), peak, Math.round(peakX), sink, sw);
      // The two inflows: a thread of white water down the far shore's trees and rocks, and a little foam
      // where it meets the lake.
      INFLOW.forEach((c, i) => { const x = ((c - Math.round(farX)) % farS.w + farS.w) % farS.w; if (x > -12 && x < VW + 12) inflowWater(scr, x, hor, t, beds[i]); });
      const tarn = R.tarn;
      // Sun on the water, and now and then a trout rises.
      for (let k = 0; k < 40; k++) {
        const sx = Math.round((hash(k, 1, 150) * 600 - camX * 0.7) % VW + VW) % VW, sy = hor + 8 + Math.round(hash(k, 2, 150) * (-FAR - 20));
        if (frac(t * 0.8 + hash(k, 3, 150)) < 0.25 && sy < base + shore(camX + sx) - 2) { scr.set(sx, sy, R.white[1]); scr.set(sx + 1, sy, tarn[5]); }
      }
      { const k = Math.floor(t / 5.3), u = frac(t / 5.3) * 5.3, rx = Math.round(hash(k, 1, 151) * VW), ry = hor + 14 + Math.round(hash(k, 2, 151) * 18); if (u < 1.6) { const r = 1 + u * 5; for (let a = 0; a < 24; a++) { const x = rx + Math.round(Math.cos(a / 24 * 6.283) * r), y = ry + Math.round(Math.sin(a / 24 * 6.283) * r * 0.35); if (y < base + shore(camX + x) - 1 && y > hor + 2) scr.set(x, y, tarn[5]); } } }
      // A loon and her chick paddle along the far side, leaving a wake.
      const ld = t - loonDive; if (ld > 3.4 && !loonUp) { loonUp = true; loonOff += 22; env.sfx('wail'); }
      for (let k = 0; k < 2; k++) {
        // The chick keeps 13 behind her, closes up when clicked, and swims up to her new place after a dive.
        const gap = k ? 13 - 9 * Math.sin(Math.PI * clamp((t - chickGo) / 4, 0, 1)) : 0, off = k && loonUp ? loonOff - 22 * (1 - smooth(0, 6, ld - 3.4)) : loonOff;
        const lx = Math.round(((260 - gap + off + t * 3.2 - camX * 0.7) % (VW + 80) + VW + 80) % (VW + 80)) - 40, ly = hor + 20 + (Math.floor(t * (k && t - chickGo < 4 ? 5 : 1.5) + k) & 1), sm = k ? 1 : 0;
        loonAt[k] = null;
        if (ly > base + shore(camX + lx) - 6) continue;
        // Under the water: a ring where it went down, spreading.
        if (!k && ld > 0.3 && ld < 3.4) { if (ld < 1.4) { const r = 1 + ld * 4; for (let a = 0; a < 16; a++) scr.set(lx + 3 + Math.round(Math.cos(a / 16 * 6.283) * r), ly + Math.round(Math.sin(a / 16 * 6.283) * r * 0.35), R.white[1]); } continue; }
        loonAt[k] = [lx, ly];
        for (let j = 0; j < 6 - sm * 2; j++) scr.set(lx + j, ly, INK);
        for (let j = 1; j < 5 - sm * 2; j++) scr.set(lx + j, ly - 1, (j + k) & 1 ? R.navy[1] : R.white[0]);
        scr.set(lx + 5 - sm * 2, ly - 1, R.white[1]); scr.set(lx + 5 - sm * 2, ly - 2, INK); scr.set(lx + 6 - sm * 2, ly - 2, INK); scr.set(lx + 7 - sm * 2, ly - 2, R.rock[2]);
        for (let j = 0; j < 4; j++) { scr.set(lx - 2 - j * 2, ly + (j & 1), tarn[5]); scr.set(lx - 2 - j * 2, ly - 1 - (j >> 1), tarn[4]); }
      }
      for (let k = 0; k < 3; k++) { const bx = ((t * 16 + k * 13) % (VW + 160)) - 80; scr.put(bird[(Math.floor(t * 4) + k) & 1], bx + [0, 9, -8][k], hor - 120 + [0, 5, 8][k] + 6 * Math.sin(t * 0.6), false); }

      // The island, with itself and its fir upside down in the water under it.
      {
        const iy = base + ISLE_Y, w = isleAll.w;
        for (let j = 1; j <= 16; j++) {
          const y = iy + j, src = isleAll.oy - Math.round(j * 1.7); if (y < 0 || y >= VH || src < 0) continue;
          const rip = Math.round(1.5 * Math.sin((y - hor) * 1.9 + t * 1.4));
          for (let i = 0; i < w; i++) { const c = isleAll.d[src * w + i], x = ix - isleAll.ox + i + rip; if (!c || x < 0 || x >= VW) continue; if (bayer(x, y) < 0.8 - j * 0.03) { fb[y * VW + x] = SHADE[c]; continue; } const lum = (0.3 * DAY[c][0] + 0.59 * DAY[c][1] + 0.11 * DAY[c][2]) / 255; fb[y * VW + x] = tarn[clamp(Math.round((0.1 + lum * 0.8) * 5 + (bayer(x, y) - 0.5) * 0.8), 0, 5)]; }
        }
        scr.put(isle, ix, iy, false);
        for (const part of isleFir.parts) { const [wx, wy] = windAt(ISLE_X + (part.lx || 0), ISLE_Y - 5 + part.y, tq, part.sway); scr.blit(part.bm, ix + FIR_DX + part.x + wx, iy - 5 + part.y + wy); }
      }
      if (DEBUG.mist) lakeMist(scr, camX, hor, base + 2, t, mistV);
      // The wall of the forest, over the water and the far shore.
      for (let x = Math.max(0, WX - camX), x1 = Math.min(VW, WX + WW - camX); x < x1; x++) {
        const col = camX + x - WX;
        for (let y = 0, y1 = Math.min(VH, base + 10); y < y1; y++) { const c = woods.d[Math.max(0, y - base + WUP) * WW + col]; if (c) fb[y * VW + x] = c; }
      }
      drawStrip(scr, main, camX, base, false, R.grass[1]);

      list.length = 0;
      for (const th of things) { const w = th.tree ? 30 : th.bm.w; if (th.x + w > camX && th.x - w < camX + VW) list.push(th); }
      // The marmot suns itself on its rock and sits up to whistle when he comes by.
      const alert = Math.abs(d - D_MARMOT) < 46 || t - whistled < 1.6;
      if (Math.abs(d - D_MARMOT) < 46 && !whistled && env.running) { whistled = t; env.sfx('whistle'); }
      if (Math.abs(d - D_MARMOT) > 120 && t - whistled > 2) whistled = false;
      if (!(t - dived > 1.2 && t - dived < 4.6)) list.push({ bm: alert ? marm.up : marm.sun, x: xMarmot + 1, y: shore(xMarmot) + 5 - rockTop + 3, z: shore(xMarmot) + 5.5, flip: d > D_MARMOT });
      list.push({ me: true, x: mx, y: (at ? at.y : my) + 0.5 });
      list.sort((a, b) => (a.z || a.y) - (b.z || b.y));
      const snack = !env.running && env.still > 60 && swim === 0;
      if (snack) env.found('snack');
      for (const th of list) {
        const sx = th.x - camX, sy = base + th.y;
        if (th.me) {
          if (at) {
            // The swim. Vest, shirt and shoes come off in a pile on the trail, he walks up the bank and
            // wades in wearing his tights, swims front crawl to the island, climbs out and cheers.
            const ax = Math.round(at.x), ay = Math.round(base + at.y), land = Math.round(base + my), out = dir > 0;
            focus.x = ax; focus.y = ay - 14;
            const items = swim < 0.12 ? 0 : swim < 0.28 ? 1 : swim < 0.42 ? 2 : 3;
            if (items > 0) scr.put(pile.vest, X + 11, land + 1, false);
            if (items > 1) scr.put(pile.shirt, X + 11, land - 1, false);
            if (items > 2) scr.put(pile.shoes, X + 19, land + 1, false);
            // A figure standing in the water shows only down to where the water reaches on him.
            const wade = (bm, depth) => {
              const x0 = ax - bm.ox, y0 = ay - bm.oy, wl = Math.round(ay - depth);
              for (let j = 0; j < bm.h && (depth < 1 || y0 + j < wl); j++) for (let i = 0; i < bm.w; i++) { const c = bm.d[j * bm.w + i]; if (c) scr.set(x0 + i, y0 + j, c); }
              if (depth >= 1) for (let r = 0; r < 3; r++) { const rr = (t * 9 + r * 6) % 18; for (let k = 0; k < 20; k++) scr.set(Math.round(ax + Math.cos(k / 20 * 6.283) * (5 + rr)), Math.round(wl + Math.sin(k / 20 * 6.283) * (1.5 + rr * 0.3)), tarn[5]); }
            };
            const drip = () => { for (let k = 0; k < 4; k++) scr.set(ax - 6 + k * 4, Math.round(ay - 6 + ((t * 20 + k * 5) % 8)), tarn[5]); };
            // Water thrown up where he drops into the swim and where he finds his feet again.
            const spray = (x, y, e) => { for (let n = 0; n < 9; n++) scr.set(Math.round(x + (hash(n, 1, 152) - 0.5) * 26 * e), Math.round(y - 1 - Math.sin(e * Math.PI) * (3 + hash(n, 2, 152) * 9)), R.white[1]); };
            for (const [at0, p] of [[T_WADE, IN], [T_WADE + swimT, LAND]]) { const e = (swim - at0) * dir / 0.45; if (e > 0 && e < 1) spray(p[0], base + p[1], e); }
            // He walks away from the camera on the way out and towards it on the way back.
            const walk = out ? dip.up : dip.down;
            if (at.k === 'strip') { scr.shadow(ax, ay, 5, 1); scr.put((swim < 0.25 ? run : dip).down[Math.floor(t * 12) % 4], ax, ay, false); if (!out) drip(); }
            else if (at.k === 'walk') { scr.shadow(ax, ay, 5, 1); scr.put(walk[Math.floor(t * 10) % 4], ax, ay, false); if (!out) drip(); }
            else if (at.k === 'wade') { if (at.depth < 1) scr.shadow(ax, ay, 5, 1); wade(walk[Math.floor(t * 8) % 4], at.depth); }
            else if (at.k === 'swim') {
              // Facing the way he is going, with a wake spreading behind him and his kick throwing up water.
              const sg = (LAND[0] >= IN[0]) === out ? 1 : -1;
              for (let k = 0; k < 13; k++) { const bx = ax - sg * (14 + k * 3), sp = 1 + k * 0.55, a = (Math.floor(t * 8) + k) & 1, c = k < 3 ? R.white[1] : tarn[5]; for (let i = 0; i < 2; i++) { if (a || k < 6) scr.set(bx - sg * i, Math.round(ay - sp), c); if (!a || k < 6) scr.set(bx - sg * i, Math.round(ay + 1 + sp * 0.7), c); } }
              for (let i = -13; i < 19; i++) if ((i + Math.floor(t * 6)) % 4) scr.set(ax + sg * i, ay + 1, tarn[5]);
              for (let n = 0; n < 3; n++) { const e = frac(t * 4 + n / 3); scr.set(Math.round(ax - sg * (15 + n * 2 + e * 4)), Math.round(ay - 1 - Math.sin(e * Math.PI) * (2 + n)), R.white[1]); }
              scr.set(ax + sg * 20, ay, tarn[5]); scr.set(ax + sg * 21, ay + 1, tarn[5]);
              scr.put(crawl[Math.floor(t * 6) % 4], ax, ay + (Math.floor(t * 3) & 1), sg < 0);
            } else {
              // Both arms up, facing the camera. A few jumps when he gets there, then one now and again for as long as he is left out there.
              const c = t - arrived, hop = c < 1.7 ? Math.floor(c * 5) & 1 : frac(c / 3.1) < 0.06;
              scr.shadow(ax, ay, 5, 1); scr.put(cheer[hop ? 2 : Math.floor(c * 2.2) & 1], ax, ay, false);
            }
            continue;
          }
          focus.x = Math.round(sx); focus.y = Math.round(base + my) - 14;
          const bm = snack ? sit[Math.floor(t * 1.5) & 1] : env.moving ? run.side[Math.floor(d / 4.2) % 6] : env.shown === 'mountains' ? mapFig : env.shown === 'note' ? writeFig[Math.floor(t * 3) & 1] : run.sideIdle[0];
          scr.shadow(Math.round(sx), Math.round(base + my), 5, 1);
          scr.put(bm, sx, base + my + (snack ? 2 : 0), false);
        } else if (th.tree) {
          for (const part of th.tree.parts) { const [wx, wy] = windAt(th.x + (part.lx || 0), th.y + part.y, tq, part.sway); scr.blit(part.bm, sx + part.x + wx, sy + part.y + wy); }
        } else if (th.tall) blitTall(scr, th.bm, sx - th.bm.ox, sy - th.bm.oy);
        else scr.put(th.bm, sx, sy, th.flip);
      }
    }
  };
}
