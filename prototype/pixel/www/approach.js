// The walk to Sideproject Spires base camp (section J), side-on. Part one is a high traverse: a narrow
// trail cut across a steep flower slope, the slope falling away behind it to the valley, where the
// river winds past the Trailhead far below, and rising in front of it toward the camera. He hops a
// stream, crosses a snow patch that has lasted into summer, and the marmots whistle at him from their
// rocks. He goes the way the map's trail was going when it handed him over (arg.dir), so the whole
// picture is drawn left to right and mirrored when needed, as in the larch basin. Part two follows the
// moraine's crest beside the glacier. In part three he steps off the moraine onto the ice and walks up
// the glacier to camp on its rock island, the Spires and the walls beside them growing as he nears.
import { clamp, lerp, smooth, frac, sq, hash, vnoise, fbm, bayer, rng, R, INK, pick, BM, outline, windAt, veilTable } from './core.js';
import { Strip, drawStrip, baseline, shell, blitScaled, paintPeaks } from './side.js';
import { paintSpires, dome, stove, tower, wallTall } from './camp.js';
import { makeKayti } from './people.js';
import { makeConifer, makeBoulder, makeCloud, makeBush } from './sprites.js';
import { makeRunner } from './tj.js';
import { marmot, shyPika } from './fauna.js';
import { NAMES } from './content.js';

// SW: the near strip's width; he walks LEN of it, from X0, in DUR seconds: LEN1 of flower slope (part
// one), then LEN2 along the moraine's crest beside the glacier (part two), which starts at XM, then
// LEN3 up the glacier itself (part three), which he steps onto at XG. SW0: the strip's width before
// part three was added. What was scattered over the first two parts is still scattered over SW0, so
// nothing there has moved.
const LEN1 = 800, LEN2 = 560, LEN3 = 440, SW0 = 2100, SW = 2560, X0 = 320, LEN = LEN1 + LEN2 + LEN3, DUR = 21, XM = X0 + LEN1, XG = XM + LEN2;
// How much of the ground is past the flower slope: 0 on it, 1 from the moraine on, changing over a few paces.
const mor = x => smooth(XM - 50, XM + 40, x);
// How much of the ground under the trail is the glacier's ice: 0 on the moraine, 1 a few paces past XG.
const ice = x => smooth(XG - 30, XG + 30, x);
// The moraine does not stop where he leaves it: it bends away toward the camera along the glacier's
// edge. edge(r): the column where the ice begins, r rows in front of the trail.
const edge = r => XG + Math.min(r * 1.5, 170 + r * 0.35) + 30 * (vnoise(r / 25, 8, 787) - 0.5);
// The trail climbs gently across the slope, with small ups and downs where it rounds a rib; on the
// moraine it climbs a little faster over the crest's humps.
// Where he steps off the crest he comes down a few steps onto the ice, which rises more gently in long
// swells. At the end the ice levels where camp's rock island lies in it (XS: where it levels).
const XS = X0 + LEN - 70, shelf = x => smooth(XS - 40, XS + 30, x);
const g = x => { const f = mor(x), ic = ice(x), m = f * (1 - ic), sh = shelf(x), xc = Math.min(x, XS) + Math.max(0, x - XS) * 0.1; return -Math.round((xc - X0) * 0.028 + (1 - f) * (2.2 * Math.sin(x / 47) + 1.5 * vnoise(x / 30, 1, 700)) + m * 3 * Math.sin(x / 29) + m * 0.016 * Math.max(0, xc - XM) + ic * (1 - sh) * 1.5 * Math.sin(x / 61)); };
// Camp on its rock island, a little past where he stops: the tent he and Kayti share, the stove beside
// it, and Kayti further on, painting.
const TENT = X0 + LEN + 48, STOVE = TENT + 21, KAYTI = X0 + LEN + 100;
// The island: a low patch of rock and gravel the ice flows round, long and narrow as seen from the
// side. Above 0 inside it, near 0 at its ragged edge.
const IX = X0 + LEN + 64, IA = 112;
// The meltwater that runs under the moraine crosses the trail where he steps onto the ice.
const RUNNEL = XG + 4;
const island = (x, r) => 1 - sq((x - IX) / IA) - sq((r - 2) / (r < 2 ? 7 : 9)) - 0.3 * (vnoise(x / 6, r / 3, 792) - 0.5);
// Behind the crest the glacier: its far edge rises as the walk goes on, so it fills more of the view.
// It begins at its snout, a little before the moraine, where it rises from behind the lip.
const ICE0 = XM - 70;
// Where he steps down onto the ice the far edge stays where it was, and above that the glacier widens.
const iceTop = x => -lerp(8, 40, smooth(ICE0, ICE0 + 90, x)) - 20 * smooth(XM, XM + LEN2, x) - 8 * ice(x) - 6 * smooth(XG + 30, XG + 230, x) - 4 * vnoise(x / 40, 7, 760);
const ICE_UP = 70;
// How far back each layer sits: the share of his movement it follows.
const P_FAR = 0.04, P_WALL = 0.09, P_FLOOR = 0.14;
// The stream comes down the slope where a gully is deepest in the first half of the walk; the snow
// patch lies where the slope is coldest in the second half. Both are found once, by rule.
const gully = x => vnoise(x / 90, 2, 701);
const STREAM = (() => { let b = X0 + 120, bv = 1; for (let x = X0 + 100; x < X0 + LEN1 * 0.45; x += 2) { const v = gully(x); if (v < bv) { bv = v; b = x; } } return b; })();
const cold = x => vnoise(x / 110, 3, 702);
// The coldest column between two shares of the flower slope, keeping clear of the stream.
const coldest = (a, b) => { let at = X0 + LEN1 * (a + b) / 2, bv = -1; for (let x = X0 + LEN1 * a; x < X0 + LEN1 * b; x += 2) { const v = cold(x); if (v > bv && Math.abs(x - STREAM) > 50) { bv = v; at = x; } } return at; };
const SNOW = coldest(0.55, 0.82), SNOW_W = 46;
// Two more, smaller (round 5, T46): one across the trail early in the walk, and one lying in a hollow of
// the meadow below it. Each patch: its middle column x, its half width w, the row its middle lies on
// (0 is the trail), and how far it reaches behind that row and in front of it.
const PATCHES = [{ x: SNOW, w: SNOW_W, r: 3, back: 9, front: 24 }, { x: coldest(0.04, 0.3), w: 23, r: 2, back: 7, front: 12 }, { x: coldest(0.3, 0.52), w: 33, r: 50, back: 11, front: 17 }];
// How far inside a snow patch a spot is: above 0 inside, near 0 at its ragged edge. n: only the first n patches.
const snowIn = (x, r, n = PATCHES.length) => { let m = -9; for (let i = 0; i < n; i++) { const p = PATCHES[i], ex = (x - p.x) / p.w, ey = (r - p.r) / (r < p.r ? p.back : p.front); m = Math.max(m, 1 - (ex * ex + ey * ey) - 0.5 * (vnoise(x / 7, r / 4, 703) - 0.5)); } return m; };
const inSnow = (x, r) => snowIn(x, r) > 0;
// On the first patch, which the trees and rocks were scattered round. Whatever falls on a newer patch
// is made all the same and then left out, so the dice the rest are thrown with do not change.
const inSnow0 = (x, r) => snowIn(x, r, 1) > 0;
// Old snow: grey and dirty at its melting edge, sun cups dimpling it, whitest in the middle.
const snowC = (x, r) => { const k = snowIn(x, r), b = bayer(x, r); return k < 0.08 ? R.snow[b < 0.5 ? 1 : 2] : k < 0.22 ? R.snow[b < 0.4 ? 2 : 3] : vnoise(x / 3, r / 2, 734) > 0.72 ? R.snow[2] : R.snow[k > 0.5 && b < 0.3 ? 4 : 3]; };

const META = {
  name: 'approach',
  dur: () => DUR,
  stops: () => [],
  elev: (arg, q) => -g(X0 + q * LEN) * 1.5
};
export const makeApproach = () => shell(META, buildApproach, ['enter', 'focus', 'pick', 'act', 'draw']);

// Far ranges across the valley: a pale back range with snow on its higher tops, and in front of it the
// Cascades' peaks, broad and lit from the west, gullied, as the larch basin paints its far mountains.
const range = x => -58 - 36 * fbm(x / 80, 2.2, 704, 4) - 7 * Math.sin(x / 37);
function paintFar(S) {
  for (let x = 0; x < S.w; x++) {
    const top = Math.round(range(x)), sl = (range(x + 8) - range(x - 8)) / 8;
    for (let y = top; y < S.h - S.up; y++) S.set(x, y, y - top < 3 + 3 * vnoise(x / 6, 1, 705) && top < -80 ? R.farsnow[sl < 0 ? 1 : 0] : pick('far', 0.8 + 0.1 * (fbm(x / 14, y / 10, 706, 2) - 0.5) - (y - top) * 0.003, x, y));
  }
  const rp = rng(708), SP = [];
  for (let x = -30; x < S.w + 30; x += 60 + rp() * 80) SP.push({ cx: x, h: 44 + rp() * 70, hw: 44 + rp() * 40, p: 0.85 + rp() * 0.4 });
  paintPeaks(S, SP);
}
// The far wall of the valley: forest up its lower slopes, rock and meadow above, all a little hazy.
const wallTop = x => -38 - 24 * fbm(x / 60, 3.1, 707, 3) - 5 * Math.sin(x / 23);
function paintWall(S, haze) {
  for (let x = 0; x < S.w; x++) {
    const top = Math.round(wallTop(x)), sl = wallTop(x + 2) - wallTop(x - 2);
    for (let y = top; y < 0; y++) {
      const tree = y > -30 + 12 * vnoise(x / 13, 1, 708) && fbm(x / 5, y / 3, 709, 2) > 0.3;
      const cliff = frac(y / 9 + 0.5 * vnoise(x / 20, 2, 731)) < 0.18 && vnoise(x / 15, y / 12, 732) > 0.55;
      let c = tree ? pick('conifer', 0.15 + 0.3 * hash(x, y, 710) + (sl < 0 ? 0.15 : -0.05), x, y)
        : pick(y - top < 8 || cliff ? 'rock' : 'moss', (cliff ? 0.3 : 0.32) + (sl < 0 ? 0.15 : -0.12) + 0.12 * (vnoise(x / 5, y / 4, 711) - 0.5), x, y);
      if (y - top < 3 && top < -52) c = R.snow[sl < 0 ? 3 : 2];
      if (Math.abs(x - 410 - 2 * Math.sin(y / 4)) < 0.7 && y > top + 4) c = R.white[1];
      S.set(x, y, haze[c]);
    }
  }
}
// The valley floor, far below: meadow, the river winding through it, the trail along it and the
// Trailhead where the trail meets the road, small at this distance. Seen from above, so it is a band.
const FLOOR_H = 20;
const riverY = x => -FLOOR_H * 0.55 + 3.5 * Math.sin(x / 41) + 1.5 * Math.sin(x / 13 + 1);
function paintFloor(S, haze, th, foot) {
  for (let x = 0; x < S.w; x++) {
    const ry = riverY(x), ty = -FLOOR_H * 0.78 + 2 * Math.sin(x / 61);
    for (let y = -FLOOR_H; y < 0; y++) {
      let c = pick(fbm(x / 5, y / 1.6, 712, 2) > 0.58 ? 'conifer' : 'grass', 0.42 + 0.25 * (vnoise(x / 4, y / 1.5, 713) - 0.5), x, y);
      const dr = Math.abs(y - ry);
      if (dr < 0.9) c = (x & 3) === 0 ? R.water[4] : R.water[2];
      else if (dr < 1.6 && hash(x, y, 733) < 0.5) c = R.rock[3];
      else if (Math.abs(y - ty) < 0.6) c = R.dirt[2];
      S.set(x, y, haze[c]);
    }
  }
  // Under the floor's near edge, the foot of this slope: forest falling away into shadow, so wherever
  // the lip above the trail runs low, what shows between it and the floor is slope, never a gap.
  for (let x = 0; x < S.w; x++) for (let y = 0; y < 30; y++) S.set(x, y, foot[pick(fbm(x / 5, y / 3, 737, 2) > 0.45 ? 'conifer' : 'moss', 0.35 - y * 0.008 + 0.2 * (hash(x, y, 738) - 0.5), x, y)]);
  // The Trailhead: the kiosk's roof, its post, a car or two at the road end and the sign.
  const x = th, y = Math.round(-FLOOR_H * 0.78 + 2 * Math.sin(x / 61));
  for (let i = -4; i <= 4; i++) { S.set(x + i, y - 5, INK); S.set(x + i, y - 4, R.wood[i < 0 ? 2 : 1]); }
  for (let i = -3; i <= 3; i++) S.set(x + i, y - 6, R.wood[2]);
  for (let j = -3; j <= 0; j++) { S.set(x - 3, y + j, R.wood[0]); S.set(x + 3, y + j, R.wood[0]); for (let i = -2; i <= 2; i++) if (j > -3) S.set(x + i, y + j, R.white[0]); }
  for (let i = 6; i < 22; i++) S.set(x + i, y + 1, R.rock[2]);
  for (let i = 0; i < 3; i++) { S.set(x + 7 + i, y, R.red[1]); S.set(x + 12 + i, y, R.navy[1]); S.set(x + 17 + i, y, R.white[1]); }
}

// The slope behind the trail falls away to the valley: seen from above it shortens with distance, so
// its texture shrinks toward the top of it, where it meets the valley floor. In front of the trail the
// slope rises toward the camera, a steep meadow in full flower with heather, rocks and scree runnels.
// Behind the trail only a narrow verge shows before the slope rolls over and drops out of sight, the
// valley floor appearing straight beyond its lip: that is what makes the drop read as a drop.
const DROP = 12;
const lipAt = x => -7 - Math.round(3 * vnoise(x / 9, 5, 735) + 1.5 * Math.sin(x / 17));
const drift = (x, y) => { const k = vnoise(x / 60, y / 22, 714); return k < 0.33 ? 'lupine' : k < 0.4 ? 'heather' : k > 0.76 ? 'red' : k > 0.66 ? 'white' : null; };
function paintMain(S) {
  for (let x = 0; x < S.w; x++) {
    const gy = g(x), ic = ice(x);
    // On the ice there is no flank behind the trail: the lip closes up to the trail as he steps off.
    const lip = Math.min(-1, Math.round(lipAt(x) * (1 - ic)));
    if (x >= ICE0) paintIce(S, x, gy, lip);
    for (let y = gy - DROP; y < S.h - S.up; y++) {
      const r = y - gy;
      let c;
      if (Math.abs(x - IX) < IA + 8 && r < 14) { const rock = islandC(x, r, y); if (rock) { S.set(x, y, rock); continue; } }
      const m = r > 2 ? mor(x - r * 0.9 - 30 * (vnoise(r / 25, 8, 780) - 0.5)) * smooth(edge(r) + 8, edge(r) - 8, x) : mor(x) * (1 - ic);
      if (m > 0 && bayer(x, y) < m) {
        // The moraine: loose grey gravel and stones. Behind the trail its inner flank is short and drops
        // to the ice; the crest is a pale worn line; in front its outer flank runs steeply down toward
        // the camera, scored by runnels where the gravel slides, a few tufts holding on at its foot.
        if (r < lip - 2) continue;
        if (r < 0) c = r === lip ? R.rock[0] : pick('rock', 0.5 + 0.15 * (r - lip) / -lip + 0.25 * (hash(x, y, 761) - 0.5), x, y, 0.7);
        else if (r <= 2) c = hash(x, y, 762) < 0.12 ? R.rock[1] : pick('rock', 0.72 - Math.abs(r - 1) * 0.06 + 0.15 * (vnoise(x / 4, y / 2, 763) - 0.5), x, y, 0.6);
        else {
          const rib = frac((x - r * 0.2) / (20 + 10 * vnoise(x / 70, 2, 764)) + 0.22 * vnoise(x / 40, r / 90, 781)), stone = hash(x >> 1, y >> 1, 765);
          c = pick('rock', 0.66 - 0.28 * rib - 0.1 * smooth(20, 200, r) + 0.12 * (fbm(x / 9, y / 7, 782, 2) - 0.5) + 0.12 * (stone - 0.5), x, y, 0.6);
          if (stone > 0.95) c = R.granite[rib < 0.5 ? 4 : 1];
          // Moss and a little grass where the gravel has settled, in the gullies and more toward the foot.
          const green = fbm(x / 12, y / 7, 783, 2) - 0.72 + 0.2 * smooth(60, 260, r) + 0.08 * rib;
          if (green > 0 && hash(x, y, 786) < 0.35 + green * 3) c = pick('moss', 0.12 + 0.18 * (0.6 - rib) + 0.1 * (hash(x, y, 766) - 0.5), x, y, 0.5);
        }
        S.set(x, y, c);
        continue;
      }
      // Past the moraine's end, whatever is not gravel is ice (behind the lip paintIce has painted it).
      if (x > XG - 60) { if (r >= lip) S.set(x, y, nearIce(x, r, y, lip)); continue; }
      if (r < 0) {
        // The verge rolls over away from the sun, darker toward its lip, which is drawn dark against
        // the valley; grass tufts and a flower or two stand up over it.
        if (r < lip - 2) continue;
        if (r < lip) { const h = hash(x, 1, 736); if (h < 0.35 && r === lip - 1) S.set(x, y, h < 0.06 ? R.lupine[2] : h < 0.1 ? R.red[1] : R.grass[1]); else if (h < 0.12 && r === lip - 2 && hash(x, 2, 736) < 0.5) S.set(x, y, R.grass[0]); continue; }
        c = r === lip ? R.moss[0] : pick('grass', 0.32 + 0.35 * (r - lip) / -lip + 0.15 * (fbm(x / 9, y / 3, 716, 2) - 0.5), x, y, 0.4);
        const fl = drift(x, y * 2), h = hash(x, y, 718);
        if (r > lip && fl && h < 0.12) c = fl === 'lupine' ? R.lupine[2] : fl === 'red' ? R.red[1] : fl === 'white' ? R.white[1] : R.pink[1];
        if (inSnow(x, r)) c = r === lip ? R.snow[1] : snowC(x, r);
        if (Math.abs(x - STREAM) < 1.2) c = R.water[frac(r / 3) < 0.4 ? 4 : 2];
      } else if (r <= 2) {
        // The trail: a narrow cut in the slope, packed dirt with a stone here and there.
        c = hash(x, y, 719) < 0.07 ? R.rock[2] : pick('dirt', 0.6 - Math.abs(r - 1) * 0.08 + 0.25 * (vnoise(x / 5, y / 2, 720) - 0.5), x, y, 0.7);
        if (inSnow(x, r)) c = (x + r) % 4 === 0 ? R.snow[1] : snowC(x, r);
      } else {
        // In front: the cut bank under the trail, then the meadow.
        const bank = r < 5, fl = drift(x, y), h = hash(x, y, 721), scree = fbm(x / 16, y / 30, 722, 2) > 0.76;
        c = bank ? pick('dirt', 0.35, x, y, 0.5) : pick(fbm(x / 26, y / 10, 723, 2) > 0.55 ? 'moss' : 'grass', 0.56 + 0.3 * (fbm(x / 22, y / 12, 724, 3) - 0.5) - smooth(40, 220, r) * 0.2, x, y, 0.35);
        if (scree && !bank) c = pick('rock', 0.55 + 0.35 * hash(x >> 1, y >> 1, 725), x, y);
        else if (!bank && fl && h < 0.16) c = fl === 'lupine' ? R.lupine[h < 0.12 ? 2 : 1] : fl === 'red' ? R.red[h < 0.12 ? 2 : 1] : fl === 'white' ? R.white[h < 0.15 ? 1 : 0] : R.pink[h < 0.12 ? 2 : 1];
        if (inSnow(x, r)) c = snowC(x, r);
      }
      S.set(x, y, c);
    }
  }
  // The stream: it comes down the near slope, runs over stones across the trail, and drops away behind.
  for (let y = 3; y < S.h - S.up; y++) for (let i = -1; i <= 1; i++) { const x = Math.round(STREAM + i + 2 * Math.sin(y / 7)); S.set(x, g(STREAM) + y, i === 0 ? R.white[1] : R.water[3]); }
  for (const dx of [-3, 0, 3]) { S.set(STREAM + dx, g(STREAM) + 1, R.rock[3]); S.set(STREAM + dx + 1, g(STREAM) + 1, R.rock[2]); }
  // A boot track across the snow: dimples where people have stepped.
  for (const p of PATCHES) for (let x = p.x - p.w; x < p.x + p.w; x += 3) if (inSnow(x, 0)) S.set(x, g(x) + 1, R.snow[1]);
  // Where the meltwater crosses the trail at the ice's edge, stones to step on.
  for (const dx of [-2, 2]) { S.set(RUNNEL + dx, g(RUNNEL) + 1, R.rock[3]); S.set(RUNNEL + dx + 1, g(RUNNEL) + 1, R.rock[2]); }
}

// A crevasse at this spot of the ice, or 0: its blue depth, or the white lip beside it. rl: rows in
// front of the ice's near edge (behind it is less than 0); d: how far back toward the far edge, 0 to 1,
// and below 0 in front of the trail, where the same cracks run on toward the camera and gape wider.
function crevasse(x, rl, d) {
  const u = x - rl * (0.6 + 0.6 * vnoise(x / 80, 5, 784)), sp = u / 30 + 1.2 * vnoise(u / 45, d * 2, 767), k = Math.floor(sp), cr = frac(sp), gape = hash(k, 1, 785);
  // In front of the trail they are fewer, and stop short of the boot track.
  const w = (gape > 0.8 ? 0.22 : 0.08) * Math.min(1.6, 1 - 0.6 * d) * smooth(0, 0.3, vnoise(u / 12, d * 5 + k, 768) - 0.25 - (d < 0 ? 0.16 + 0.2 * smooth(0.3, 0, -d) : 0));
  return cr < w ? R.glac[cr < w * 0.55 ? 0 : 1] : w > 0 && cr < w + 0.04 ? R.glac[5] : 0;
}
// The ice he walks on in part three, from the trail toward the camera: wind-cut and sun-cupped, the
// glacier's crevasses running on across it, grit from the moraine along its edge, and the meltwater
// channel between the two. The trail on it is a boot track, trodden a little darker.
function nearIce(x, r, y, lip) {
  const e = x - edge(Math.max(3, r));
  if (r > 2 && Math.abs(e - 4) < 1.3) return (x + r) % 5 === 0 ? R.water[4] : R.water[2];
  if (r >= 0 && r <= 2 && Math.abs(x - RUNNEL) < 1.3) return R.water[r === 1 ? 4 : 2];
  if (e < 46 && hash(x, y, 796) < 0.55 * sq(1 - Math.max(0, e) / 46)) return pick('rock', 0.3 + 0.4 * hash(x >> 1, y, 797), x, y);
  if (r >= 0 && r <= 2) return (r === 1 && x % 4 === 0) || (r === 2 && x % 4 === 2) ? R.glac[1] : R.glac[r === 0 ? 4 : 3];
  const cut = vnoise(x / 13, y / 1.6, 789);
  const v = 0.84 - 0.12 * smooth(0, 240, r) + 0.2 * (fbm(x / 26, y / 6, 788, 2) - 0.5) + (cut > 0.7 ? 0.08 : cut < 0.22 ? -0.08 : 0);
  return (r > 4 && crevasse(x, r - lip, (r - lip) / (iceTop(x) - lip))) || pick('glac', v, x, y, 0.6);
}
// The rock island: gravel and stones with old snow lying in its hollows, lit on the side toward the
// trail, the ice in shadow under its near edge. 0 outside it.
function islandC(x, r, y) {
  const k = island(x, r);
  if (k > 0) return r >= 0 && r <= 2 ? pick('rock', 0.74 - Math.abs(r - 1) * 0.05 + 0.14 * (vnoise(x / 4, y / 2, 763) - 0.5), x, y, 0.6) : vnoise(x / 7, y / 3, 794) > 0.68 ? R.snow[r < 2 ? 4 : 3] : pick('rock', 0.56 - (r - 2) * 0.022 + 0.4 * (hash(x >> 1, y >> 1, 793) - 0.5), x, y);
  return k > -0.28 && r > 4 ? R.glac[k > -0.14 ? 1 : 2] : 0;
}

// The glacier beside the moraine, seen from its crest and a little above, so it recedes upward from
// the lip to its far edge (d from 0 to 1). Along its near edge, under the moraine, a meltwater runnel;
// across it, crevasses lean back as they recede, blue in their depths with a white lip, broken here
// and there; down its middle the dark stripe of a medial moraine; at its far edge the grey crest of
// the other moraine. At the snout end the ice is dirty with the gravel it carries.
function paintIce(S, x, gy, lip) {
  const top = Math.round(iceTop(x)), dirt = 1 - smooth(ICE0, ICE0 + 110, x), wet = smooth(XM - 30, XM + 20, x) * (1 - ice(x));
  // Up the glacier the far moraine peters out, and the ice ends in a snow crest against the sky.
  const rim = smooth(XG + 170, XG + 50, x);
  if (top >= lip - 1) return;
  const far = 2 + Math.round(2 * vnoise(x / 14, 2, 769)), med = 0.55 + 0.05 * (vnoise(x / 50, 3, 770) - 0.5);
  for (let r = top; r < lip; r++) {
    const d = (r - lip) / (top - lip), y = gy + r;
    let c;
    if (r < top + far && bayer(x, y) < rim) c = pick('rock', 0.42 + 0.25 * hash(x, y, 771) + (r === top ? -0.2 : 0), x, y, 0.7);
    else if (r < top + far) c = R.snow[r === top ? 4 : 3];
    else if (r === lip - 1 && wet > 0.5) c = (x + Math.round(r)) % 5 === 0 ? R.water[4] : R.water[2];
    else if (r === lip - 2 && wet > 0.5) c = R.rock[1];
    else {
      c = pick('glac', 0.66 + 0.18 * d + 0.12 * (vnoise(x / 6, d * 8, 772) - 0.5), x, y, 0.6);
      c = crevasse(x, r - lip, d) || c;
      // The medial moraine thins out up the glacier.
      if (Math.abs(d - med) < (0.035 + 0.02 * vnoise(x / 9, 4, 773)) * smooth(XG + 170, XG + 20, x)) c = pick('rock', 0.3 + 0.3 * hash(x, y, 774), x, y);
      if (hash(x, y, 775) < dirt * 0.7) c = pick('rock', 0.35 + 0.3 * hash(x, y, 776), x, y);
    }
    S.set(x, y, c);
  }
}

// The Spires as they will look from camp, seen from far off: the six towers (camp.js's own, painted the
// same way and in the same order) on their jagged ridge, and the glacier spilling from under them in a
// broad tongue, crevassed, with a grey snout at its foot. He walks toward them, so they grow (J2).
const SPW = 320, SPH = 210, SPY = 150;
function makeSpires() {
  const b = new BM(SPW, SPH); b.ox = SPW >> 1; b.oy = SPH - 1;
  paintSpires(b, 44, 262, SPY + 4, 120, null);
  // The massif's shoulders spread down from the ridge's ends to the picture's foot, so the ice lies in
  // a valley head between rock walls instead of hanging in the sky. Lit from the west, snow in streaks.
  for (let y = SPY - 2; y < SPH; y++) {
    const u = (y - SPY) / (SPH - SPY), w = 114 + 40 * Math.sqrt(Math.max(0, u)) + 4 * (vnoise(y / 6, 3, 751) - 0.5);
    for (let x = Math.max(0, Math.round(152 - w)); x <= Math.min(SPW - 1, 152 + w); x++) {
      const a = (x - (152 - w)) / (2 * w), snow = vnoise(x / 5, y / 9, 752) > 0.7 - 0.2 * (1 - u);
      b.set(x, y, snow ? pick('glac', 0.85, x, y, 0.6) : pick('granite', 0.48 - 0.25 * a + 0.12 * (vnoise(x / 3, y / 4, 753) - 0.5), x, y, 0.8));
    }
  }
  // The glacier: it fills the whole cirque under the towers and narrows into a tongue toward him,
  // lit from the west, long crevasses bowing downhill across it, ending in a grey snout.
  for (let y = SPY; y < SPH; y++) {
    const u = (y - SPY) / (SPH - SPY), half = 116 - 36 * u + 3 * Math.sin(y / 5), cx = 152 - 16 * u;
    for (let x = Math.round(cx - half); x <= cx + half; x++) {
      const a = (x - (cx - half)) / (2 * half), cre = frac((y - SPY) / 10 - 1.3 * Math.sin(Math.PI * a) + 0.25 * vnoise(x / 14, y / 5, 746));
      let c = pick('glac', 0.92 - 0.35 * a - 0.2 * u + 0.1 * (vnoise(x / 4, y / 3, 747) - 0.5), x, y, 0.6);
      if (cre < 0.09 && a > 0.1 && a < 0.9 && vnoise(x / 16, y / 4, 748) > 0.45) c = R.glac[cre < 0.045 ? 0 : 1];
      // The icefall (TJs-Kubernetes-Service on the map): where the ice breaks over a rock step under
      // the towers it shatters into seracs, blocks lit on their west faces with blue shadow between.
      const fall = smooth(0.08, 0.16, u) * smooth(0.46, 0.36, u) * smooth(0.12, 0.28, a) * smooth(0.82, 0.66, a);
      if (fall > 0.3) {
        // Columns of blocks, each column's joints at its own heights, so they stagger like a jumble.
        const bx = (x + 3 * vnoise(y / 5, 2, 757)) / 8, col = Math.floor(bx), yy = (y - SPY + 7 * hash(col, 0, 755) + 2 * vnoise(x / 4, 1, 756)) / (6 + 3 * hash(col, 1, 755)), row = Math.floor(yy), i = frac(bx), j = frac(yy), h = hash(col, row, 754);
        c = j > 0.78 || i > 0.84 ? R.glac[h < 0.5 ? 0 : 1] : R.glac[i < 0.25 || j < 0.18 ? 5 : h < 0.3 ? 2 : h < 0.65 ? 3 : 4];
      }
      if (SPH - y < 6 + 3 * vnoise(x / 5, 9, 749)) c = pick('rock', 0.5 + 0.3 * hash(x, y, 750), x, y);
      b.set(x, y, c);
    }
  }
  outline(b, INK);
  return b;
}

// The two rock walls that stand either side of camp (camp.js paints its own the same way), each a
// main tower with lower shoulders [how far to the side, how tall, how wide, as shares of the main one].
// The west one grows as he nears it, faster than the Spires, being nearer: dx is how far it stands to
// the side of the Spires at the end, in screen widths, and near how far it is from camp, the Spires
// being 1 away. The east one is ahead of him to the last, and slides in at the picture's edge.
const WEST = { n: 7, h: 240, w: 170, dx: -0.75, near: 0.26, sh: [[0.6, 0.6, 0.7], [-0.62, 0.45, 0.6]] }, EAST = { n: 8, h: 210, w: 140, sh: [[-0.6, 0.5, 0.6]] };
function makeWall({ n, h, w, sh }) {
  const b = new BM(Math.ceil(w * 2.4) + 6, h + 14); b.ox = b.w >> 1; b.oy = h + 8;
  sh.forEach(([dx, kh, kw], i) => tower(b, n + 3 + i, Math.round(b.ox + dx * w), b.oy, Math.round(h * kh), Math.round(w * kw), null));
  tower(b, n, b.ox, b.oy, h, w, null);
  outline(b, INK);
  return b;
}

function buildApproach() {
  const rand = rng(71), run = makeRunner('alpine'), st = {}, focus = { x: 0, y: 0 };
  const haze = veilTable(0.36), haze2 = veilTable(0.3);
  const far = new Strip(1200, 170, 6); paintFar(far);
  const wall = new Strip(1300, 100, 1); paintWall(wall, haze);
  // The Trailhead sits where the floor is widest and flattest in view at the start, by rule: the floor
  // column, from those he can see while he starts, where the river runs furthest from the trail.
  let th = 300, best = -1; for (let x = 260; x < 520; x += 2) { const d = Math.abs(riverY(x) - (-FLOOR_H * 0.78 + 2 * Math.sin(x / 61))); if (d > best) { best = d; th = x; } }
  const floor = new Strip(1300, FLOOR_H + 2, 30); paintFloor(floor, haze2, th, haze);
  const floorFill = haze[R.conifer[0]];
  // Tall enough above its zero for the trail's whole climb plus the glacier's far edge behind it.
  const main = new Strip(SW, ICE_UP + 70, 600); paintMain(main);
  const spiresPic = makeSpires(), west = makeWall(WEST), east = makeWall(EAST);
  const clouds = Array.from({ length: 3 }, (_, k) => ({ bm: makeCloud(740 + k), x: k * 270 + 30, y: 6 + k * 11, v: 2.5 + k }));

  // Subalpine firs: a few small ones on the drop behind (far, so small), bigger ones on the near slope,
  // never on the snow or the stream; rocks and heather between. A marmot on a rock behind the trail
  // where a rib stands proud a little past the stream, and another below the trail near the snow.
  const things = [];
  const spire = (seed, H) => makeConifer(seed, H, Math.max(5, Math.round(H * 0.28)), 'conifer', Math.max(5, Math.round(H / 4.5)), { ragged: seed & 1 });
  for (let x = 20; x < SW0 - 20; x += 12 + rand() * 36) {
    const back = rand() < 0.3, r = back ? -2 - Math.round(rand() * 3) : 12 + Math.round(rand() * 150);
    if (fbm(x / 80, back ? 2 : 3, 727, 2) < 0.45 || inSnow0(x, r) || Math.abs(x - STREAM) < 14 || mor(x) > 0.1 || (back && x > ICE0 - 20)) continue;
    const H = back ? Math.round(16 + rand() * 18) : Math.round(22 + rand() * 26 + r * 0.08);
    things.push({ tree: spire(750 + things.length, H), x: Math.round(x), y: g(x) + r, gone: inSnow(x, r) });
  }
  for (let n = 0; n < 34; n++) { const x = Math.round(rand() * SW0), r = rand() < 0.35 ? -2 - Math.round(rand() * 3) : 8 + Math.round(rand() * 120); if (inSnow0(x, r) || Math.abs(x - STREAM) < 8 || mor(x) > 0.1 || (r < 0 && x > ICE0 - 20)) continue; things.push({ ...(rand() < 0.5 ? { bm: makeBoulder(760 + n, r < 0 ? 2 + rand() * 3 : 3 + rand() * 6) } : { bm: makeBush(770 + (n % 3), 'heather') }), x, y: g(x) + r, gone: inSnow(x, r) }); }
  // The moraine's stones: big blocks the glacier dropped, sitting on the crest beside the trail and
  // standing out of the flank below it, more of them the further he goes.
  const rs = rng(777);
  for (let x = XM - 20; x < SW - 20; x += 24 + rs() * 50) {
    const front = rs() < 0.7, r = front ? 6 + Math.round(sq(rs()) * 200) : -2 - Math.round(rs() * 2);
    // None on the ice past the moraine's edge, where only what the glacier carries lies.
    if (rs() > mor(x - (front ? r * 0.9 : 0)) || x > edge(front ? r : 0) - 6) continue;
    things.push({ bm: makeBoulder(790 + (things.length % 40), front ? 4 + rs() * (5 + r * 0.05) : 3 + rs() * 3), x: Math.round(x), y: g(x) + r });
  }
  // On the ice: a few stones the glacier is carrying down, and the island's bigger blocks round its rim.
  const ri = rng(795);
  for (let x = XG + 60; x < SW - 20; x += 50 + ri() * 110) {
    const r = 8 + Math.round(sq(ri()) * 170), big = 2 + ri() * 3;
    if (x < edge(r) + 14 || island(x, r) > -0.6) continue;
    things.push({ bm: makeBoulder(830 + (things.length % 20), big), x: Math.round(x), y: g(x) + r });
  }
  for (let k = 0; k < 11; k++) {
    const a = ri() * 2 * Math.PI, x = Math.round(IX + Math.cos(a) * IA * (0.78 + 0.2 * ri())), r = Math.round(2 + Math.sin(a) * (Math.sin(a) < 0 ? 5 : 8)), big = 2.4 + ri() * 3.4;
    if (Math.abs(r - 1) < 4 || (r < 4 && x > TENT - 18 && x < KAYTI + 46)) continue;
    things.push({ bm: makeBoulder(850 + k, big), x, y: g(x) + r });
  }
  const rib = x => -fbm(x / 50, 4, 728, 2);
  let m1 = STREAM + 80, bv = 1; for (let x = STREAM + 50; x < STREAM + 200; x += 4) { const v = rib(x); if (v < bv) { bv = v; m1 = x; } }
  const m2 = SNOW - SNOW_W - 40;
  const M = [{ x: m1, y: g(m1) - 7, rock: makeBoulder(780, 8), seen: -9 }, { x: m2, y: g(m2) + 22, rock: makeBoulder(781, 10), seen: -9 }];
  for (let i = things.length - 1; i >= 0; i--) if (M.some(m => Math.abs(things[i].x - m.x) < 24 && Math.abs(things[i].y - m.y) < 18)) things.splice(i, 1);
  for (let i = things.length - 1; i >= 0; i--) if (things[i].gone) things.splice(i, 1);
  for (const m of M) { things.push({ bm: m.rock, x: m.x, y: m.y }); let top = 0; while (top < m.rock.h && !m.rock.d[top * m.rock.w + m.rock.ox]) top++; m.top = m.rock.oy - top; }
  // Pika on the moraine (round 5, T47): three along the crest, at a fifth, a half and four fifths of
  // it, the middle one on the crest's far side and the others just below the trail. Each has a rock
  // to sit on and a smaller one beside it, and the gap between the two is where it bolts to.
  const P = [0.2, 0.5, 0.8].map((u, k) => {
    const x = Math.round(XM + 50 + (LEN2 - 130) * u), y = g(x) + (k === 1 ? -3 : 12 + 3 * k), rock = makeBoulder(860 + k, 6.5), side = makeBoulder(864 + k, 4);
    let top = 0; while (top < rock.h && !rock.d[top * rock.w + rock.ox]) top++;
    const hx = x + rock.w - rock.ox + 1;
    return { x, y, rock, side, sx: hx + 1 + side.ox, hx, top: rock.oy - top, shy: shyPika() };
  });
  for (let i = things.length - 1; i >= 0; i--) if (P.some(p => things[i].x > p.x - 18 && things[i].x < p.sx + 16 && Math.abs(things[i].y - p.y) < 12)) things.splice(i, 1);
  for (const p of P) { things.push({ bm: p.rock, x: p.x, y: p.y }, { bm: p.side, x: p.sx, y: p.y + 1 }); for (const [dx, dy] of [[0, -1], [0, -2], [1, -1]]) main.set(p.hx + dx, p.y + dy, INK); }
  const marm = { sun: marmot('sun'), up: marmot('up') };
  const tent = dome('tent'), pot = stove(), kayti = makeKayti(); let waved = -9, now = 0;

  let cam = 0, last = { camX: 0, base: 0, dir: 1, VW: 0 };
  const list = [];
  const xOf = q => X0 + q * LEN;

  return {
    ...META,
    enter(scr, arg, q) { cam = xOf(q); st.y = null; for (const p of P) p.shy.reset(); },
    focus: () => focus,
    act(id, env) { if (id === 'kayti') { waved = now; return true; } if (id.startsWith('pika')) { if (P[+id.slice(4)].shy.startle(env.t)) env.sfx('eep'); return true; } const m = M[+id.slice(6)]; if (id.startsWith('marmot') && m) { m.seen = env.t; env.sfx('whistle'); return true; } return false; },
    pick(sx, sy) {
      if (last.dir < 0) sx = last.VW - 1 - sx;
      const wx = sx + last.camX, wy = sy - last.base, mx = v => last.dir < 0 ? last.VW - 1 - (v - last.camX) : v - last.camX;
      if (Math.abs(wx - KAYTI) < 9 && wy > g(KAYTI) - 25 && wy < g(KAYTI) + 3) return { label: NAMES.kayti, x: mx(KAYTI), y: last.base + g(KAYTI) - 27, act: 'kayti' };
      for (let k = 0; k < M.length; k++) { const m = M[k]; if (Math.abs(wx - m.x) < 13 && wy > m.y - m.top - 14 && wy < m.y + 2) return { label: NAMES.approach.marmot, x: mx(m.x), y: last.base + m.y - m.top - 16, act: 'marmot' + k }; }
      for (let k = 0; k < P.length; k++) { const p = P[k]; if (wx > p.x - 10 && wx < p.sx + 8 && wy > p.y - p.top - 12 && wy < p.y + 3) return { label: NAMES.approach.pika, x: mx(p.x), y: last.base + p.y - p.top - 14, act: 'pika' + k }; }
      return null;
    },
    draw(scr, env, arg, q) {
      const { VW, VH, fb } = scr, { t, tq } = env, dir = arg.dir < 0 ? -1 : 1; now = t;
      const mx = xOf(q), d = q * LEN;
      // He hops the stream: a small jump as he crosses it.
      // And the meltwater at the ice's edge: a smaller one.
      const sj = (mx - STREAM) / 9, sr = (mx - RUNNEL) / 7, hop = Math.abs(sj) < 1 ? Math.round(5 * (1 - sj * sj)) : Math.abs(sr) < 1 ? Math.round(3 * (1 - sr * sr)) : 0, my = g(mx) - hop;
      cam += (mx - cam) * (env.calm ? 1 : Math.min(1, env.dt * 8));
      const camX = Math.round(cam - VW * (scr.narrow ? 0.5 : 0.4) + env.look.x * 0.5 * dir), base = baseline(scr, env.shown, st) - Math.round(0.7 * g(Math.round(cam)));
      // The valley floor shows just above the top of the drop; the far wall rises from it.
      // up: how far up the glacier he is. The valley drops out of sight behind the ice as he goes.
      const fl = base + g(Math.round(cam)) - 6, hor = fl - FLOOR_H - 30, up = smooth(XG - 150, XG + 230, cam), sink = Math.round(46 * up);
      const sb = R.skyband;
      for (let y = 0; y < Math.min(VH, hor + 2); y++) {
        const f = clamp(1 - (hor - y) / 260, 0, 1) * (sb.length - 1), b0 = Math.floor(f), e = f - b0, row = y * VW;
        if (e < 0.72 || b0 >= sb.length - 1) fb.fill(sb[b0], row, row + VW); else for (let x = 0; x < VW; x++) fb[row + x] = sb[b0 + (bayer(x, y) < (e - 0.72) / 0.28 ? 1 : 0)];
      }
      for (const c of clouds) scr.blit(c.bm, ((c.x + t * c.v) % (VW + 140)) - 70, Math.max(4, hor - 160) + c.y);
      drawStrip(scr, far, camX * P_FAR + 300, hor + 4, false, R.far[1]);
      // The Spires stand at the head of the valley, ahead of him, growing as he walks toward them: from
      // two fifths of the sky's height at the start to over four fifths at the end, their glacier's snout
      // sinking behind the valley's far wall. They drift past slowly, being far.
      // The foot sits well down behind the wall's lowest notch, so the snout never shows a hard edge.
      // On the glacier they grow on, faster as he closes, to the size camp shows them at, and their
      // foot comes down to the ice's far edge, so their own ice and the ice he is walking on are one.
      { const L12 = LEN1 + LEN2, u = Math.min(1, d / L12), u3 = clamp((d - L12) / LEN3, 0, 1), spx = Math.round(VW * (scr.narrow ? 0.6 : 0.76) - (camX - X0) * 0.06 + LEN * 0.03);
        const foot0 = fl - FLOOR_H - 26, kf = (foot0 - 8) / SPH, kA = Math.min(VW * 0.92 / SPW, lerp(0.4, 1, u < 0.5 ? smooth(0, 1, u) : 1.5 * u - 0.25) * kf);
        const hz = base + g(camX + spx) + Math.round(iceTop(camX + spx)), kB = Math.max(kA, Math.min(VW * 0.98 / 240, (hz - 6) / 120, wallTall(VH, scr.narrow) / 120));
        const k = lerp(kA, kB, u3 * (0.45 + 0.55 * u3)), foot = Math.round(lerp(foot0, hz - 4 + (SPH - SPY - 5) * k, up)), far0 = kB / k - 1;
        blitScaled(fb, VW, VH, spiresPic, spx, foot, k);
        // The walls stand nearer than the Spires, so they go on over them (a phone has no room for them,
        // as at camp). The west one's foot is level with the foot of the Spires' picture, down behind the
        // valley's wall and then the ice, so small and far off it is out of sight, and it comes up as it grows.
        if (!scr.narrow) {
          const sc = WEST.near / (far0 + WEST.near);
          blitScaled(fb, VW, VH, west, Math.round(spx + WEST.dx * VW * sc), foot + Math.round(8 * sc), sc * kB);
          blitScaled(fb, VW, VH, east, Math.round(VW * 1.08 + (X0 + LEN - VW * 0.4 - camX) * 0.6), hz + 10, kB);
        } }
      drawStrip(scr, wall, camX * P_WALL + 200, fl - FLOOR_H + 1 + sink, false, 0);
      drawStrip(scr, floor, camX * P_FLOOR, fl + sink, false, floorFill);
      // The river glints far below.
      if (!sink) for (let n = 0; n < 8; n++) { const fx = Math.round(hash(n, 1, 730) * 1300), x = fx - Math.round(camX * P_FLOOR); if (x < 0 || x >= VW || frac(t * 0.6 + hash(n, 2, 730)) > 0.3) continue; scr.set(x, fl + Math.round(riverY(fx)), R.white[1]); }
      drawStrip(scr, main, camX, base, false, R.moss[1]);
      // The stream runs: bright flecks travel down it, behind the trail and in front.
      for (let k = 0; k < 14; k++) { const u = frac(t * 0.9 + k / 14), r = Math.round(lerp(150, lipAt(STREAM) + 1, u)), x = Math.round(STREAM + 2 * Math.sin((g(STREAM) + r) / 7) * (r > 2 ? 1 : 0)) - camX; if (x >= 0 && x < VW) scr.set(x, base + g(STREAM) + r, R.white[1]); }

      // Meltwater runs along the ice's edge under the moraine: glints travel down it (the way he came,
      // as the glacier flows), and once he is on the crest it gurgles, and now and then the ice cracks.
      for (let k = 0; k < 24; k++) {
        const x = Math.round(camX + frac(hash(k, 3, 778) - t * 0.05) * (VW + 40) - 20);
        if (x < XM - 30 || x > XG - 24 || frac(t * 0.8 + hash(k, 4, 778)) > 0.5) continue;
        scr.set(x - camX, base + g(x) + lipAt(x) - 1, R.white[1]);
      }
      if (env.running && mor(mx) > 0.5) {
        if (ice(mx) < 0.9 && t > (st.gurgle || 0)) { st.gurgle = t + 1.2 + 2 * hash(Math.floor(t), 5, 779); env.sfx('gurgle'); }
        if (t > (st.crack || t + 1)) { st.crack = t + 9 + 8 * hash(Math.floor(t), 6, 779); env.sfx('creak'); }
        if (!st.crack) st.crack = t + 4;
      }
      list.length = 0;
      for (const th of things) if (th.x > camX - 40 && th.x < camX + VW + 40) list.push(th);
      // The marmots sun themselves and sit up to whistle as he comes near (or when clicked).
      for (let k = 0; k < M.length; k++) {
        const m = M[k], near = Math.abs(mx - m.x) < 60;
        if (near && env.running && t - m.seen > 6) { m.seen = t; env.sfx('whistle'); }
        list.push({ bm: near || t - m.seen < 1.6 ? marm.up : marm.sun, x: m.x + 1, y: m.y - m.top + 3, z: m.y + 0.5, flip: mx > m.x });
      }
      // The pika: each calls and bolts for its gap as he comes up, and looks out once he has gone by.
      for (const p of P) {
        if (p.x < camX - 60 || p.x > camX + VW + 60) continue;
        const a = p.shy.step(t, Math.abs(mx - p.x));
        if (p.shy.called) env.sfx('eep');
        if (a) list.push({ bm: a.bm, x: Math.round(lerp(p.x, p.hx, a.go)), y: Math.round(lerp(p.y - p.top + 2, p.y, a.go) - 2 * a.hop) - (a.peek ? 1 : 0), z: p.y + (a.peek ? 1.5 : 0.6), flip: !!a.back });
      }
      // Camp comes into view on its island ahead in the last seconds: the tent just behind the trail, smoke
      // from the stove beside it, and Kayti beyond them painting the towers.
      if (TENT - camX < VW + 30) {
        list.push({ bm: tent, x: TENT, y: g(TENT) - 2 }, { bm: pot, x: STOVE, y: g(STOVE) - 1 });
        list.push({ kayti: true, x: KAYTI, y: g(KAYTI) });
      }
      list.push({ me: true, x: mx, y: g(mx) + 0.5 });
      list.sort((a, b) => (a.z || a.y) - (b.z || b.y));
      for (const th of list) {
        const sx = th.x - camX, sy = base + th.y;
        if (th.me) {
          focus.x = Math.round(sx); focus.y = Math.round(base + my) - 14;
          scr.shadow(Math.round(sx), Math.round(base + g(mx)), 5 - Math.min(2, hop), 1);
          scr.put(env.moving ? run.side[hop ? 1 : Math.floor(d / 4.2) % 6] : run.sideIdle[0], sx, base + my, false);
        } else if (th.kayti) kayti.draw(scr, Math.round(sx), Math.round(sy), t, t - waved < 1.6);
        else if (th.tree) {
          for (const part of th.tree.parts) { const [wx, wy] = windAt(th.x + (part.lx || 0), th.y + part.y, tq, part.sway); scr.blit(part.bm, sx + part.x + wx, sy + part.y + wy); }
        } else scr.put(th.bm, sx, sy, !!th.flip);
      }
      if (TENT - camX < VW + 30) { const cx = STOVE - camX, cy = base + g(STOVE) - 7; for (let k = 0; k < 5; k++) { const age = frac(t * 0.35 + k / 5); scr.set(Math.round(cx + age * 9 + Math.sin(age * 6 + k)), Math.round(cy - age * 24), age < 0.5 ? R.granite[4] : R.granite[3]); } }
      last = { camX, base, dir, VW };
      if (dir < 0) { mirror(fb, VW, VH); focus.x = VW - 1 - focus.x; }
    }
  };
}

// Going the other way, the whole picture flips (he then faces left, and the light comes from the east).
function mirror(fb, VW, VH) {
  for (let y = 0; y < VH; y++) { let a = y * VW, b = a + VW - 1; while (a < b) { const c = fb[a]; fb[a++] = fb[b]; fb[b--] = c; } }
}
