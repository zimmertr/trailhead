// The walk to Sideproject Spires base camp (section J), side-on. Part one is a high traverse: a narrow
// trail cut across a steep flower slope, the slope falling away behind it to the valley, where the
// river winds past the Trailhead far below, and rising in front of it toward the camera. He hops a
// stream, crosses a snow patch that has lasted into summer, and the marmots whistle at him from their
// rocks. He goes the way the map's trail was going when it handed him over (arg.dir), so the whole
// picture is drawn left to right and mirrored when needed, as in the larch basin.
import { clamp, lerp, smooth, frac, sq, hash, vnoise, fbm, bayer, rng, R, INK, pick, BM, outline, windAt, veilTable } from './core.js';
import { Strip, drawStrip, baseline, shell, blitScaled } from './side.js';
import { SPIRES, tower, dome } from './camp.js';
import { makeKayti } from './people.js';
import { makeConifer, makeBoulder, makeCloud, makeBush } from './sprites.js';
import { makeRunner } from './tj.js';
import { marmot } from './fauna.js';
import { NAMES } from './content.js';

// SW: the near strip's width; he walks LEN of it, from X0, in DUR seconds: LEN1 of flower slope (part
// one), then LEN2 along the moraine's crest beside the glacier (part two), which starts at XM.
const LEN1 = 800, LEN2 = 560, SW = 2100, X0 = 320, LEN = LEN1 + LEN2, DUR = 16, XM = X0 + LEN1;
// How much of the ground is moraine: 0 on the flower slope, 1 on the crest, changing over a few paces.
const mor = x => smooth(XM - 50, XM + 40, x);
// The trail climbs gently across the slope, with small ups and downs where it rounds a rib; on the
// moraine it climbs a little faster over the crest's humps.
// At the end the crest broadens into the shelf where camp is, and levels off (XS: where the shelf starts).
const XS = X0 + LEN - 70, shelf = x => smooth(XS - 40, XS + 30, x);
const g = x => { const m = mor(x), sh = shelf(x), xc = Math.min(x, XS) + Math.max(0, x - XS) * 0.1; return -Math.round((xc - X0) * 0.028 + (1 - m) * (2.2 * Math.sin(x / 47) + 1.5 * vnoise(x / 30, 1, 700)) + m * (1 - sh) * 3 * Math.sin(x / 29) + m * 0.016 * Math.max(0, xc - XM)); };
// Camp on the shelf, a little past where he stops: the two tents, and Kayti further on, painting.
const TENTS = [X0 + LEN + 44, X0 + LEN + 70], KAYTI = X0 + LEN + 100;
// Behind the crest the glacier: its far edge rises as the walk goes on, so it fills more of the view.
// It begins at its snout, a little before the moraine, where it rises from behind the lip.
const ICE0 = XM - 70;
const iceTop = x => -lerp(8, 40, smooth(ICE0, ICE0 + 90, x)) - 20 * smooth(XM, XM + LEN2, x) - 4 * vnoise(x / 40, 7, 760);
const ICE_UP = 70;
// How far back each layer sits: the share of his movement it follows.
const P_FAR = 0.04, P_WALL = 0.09, P_FLOOR = 0.14;
// The stream comes down the slope where a gully is deepest in the first half of the walk; the snow
// patch lies where the slope is coldest in the second half. Both are found once, by rule.
const gully = x => vnoise(x / 90, 2, 701);
const STREAM = (() => { let b = X0 + 120, bv = 1; for (let x = X0 + 100; x < X0 + LEN1 * 0.45; x += 2) { const v = gully(x); if (v < bv) { bv = v; b = x; } } return b; })();
const cold = x => vnoise(x / 110, 3, 702);
const SNOW = (() => { let b = X0 + LEN1 * 0.7, bv = -1; for (let x = X0 + LEN1 * 0.55; x < X0 + LEN1 * 0.82; x += 2) { const v = cold(x); if (v > bv) { bv = v; b = x; } } return b; })();
const SNOW_W = 46;
// How far inside the snow patch a spot is: above 0 inside, near 0 at its ragged edge.
const snowIn = (x, r) => { const ex = (x - SNOW) / SNOW_W, ey = (r - 3) / (r < 3 ? 9 : 24); return 1 - (ex * ex + ey * ey) - 0.5 * (vnoise(x / 7, r / 4, 703) - 0.5); };
const inSnow = (x, r) => snowIn(x, r) > 0;
// Old snow: grey and dirty at its melting edge, sun cups dimpling it, whitest in the middle.
const snowC = (x, r) => { const k = snowIn(x, r), b = bayer(x, r); return k < 0.08 ? R.snow[b < 0.5 ? 1 : 2] : k < 0.22 ? R.snow[b < 0.4 ? 2 : 3] : vnoise(x / 3, r / 2, 734) > 0.72 ? R.snow[2] : R.snow[k > 0.5 && b < 0.3 ? 4 : 3]; };

const META = {
  name: 'approach',
  dur: () => DUR,
  stops: () => [],
  elev: (arg, q) => -g(X0 + q * LEN) * 1.5
};
export const makeApproach = () => shell(META, buildApproach, ['enter', 'focus', 'pick', 'act', 'draw']);

// Far ranges across the valley: pale, with snow on the higher tops.
const range = x => -58 - 36 * fbm(x / 80, 2.2, 704, 4) - 7 * Math.sin(x / 37);
function paintFar(S) {
  for (let x = 0; x < S.w; x++) {
    const top = Math.round(range(x)), sl = range(x + 1) - range(x - 1);
    for (let y = top; y < S.h - S.up; y++) S.set(x, y, y - top < 3 + 3 * vnoise(x / 6, 1, 705) && top < -80 ? R.farsnow[sl < 0 ? 1 : 0] : pick('far', 0.78 + clamp(sl * 3, -0.15, 0.15) + 0.08 * (vnoise(x / 9, y / 9, 706) - 0.5) - (y - top) * 0.003, x, y));
  }
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
    const gy = g(x);
    const lip = lipAt(x);
    if (x >= ICE0) paintIce(S, x, gy, lip);
    for (let y = gy - DROP; y < S.h - S.up; y++) {
      const r = y - gy;
      let c;
      const m = r > 2 ? mor(x - r * 0.9 - 30 * (vnoise(r / 25, 8, 780) - 0.5)) : mor(x);
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
  for (let x = SNOW - SNOW_W; x < SNOW + SNOW_W; x += 3) if (inSnow(x, 0)) S.set(x, g(x) + 1, R.snow[1]);
}

// The glacier beside the moraine, seen from its crest and a little above, so it recedes upward from
// the lip to its far edge (d from 0 to 1). Along its near edge, under the moraine, a meltwater runnel;
// across it, crevasses lean back as they recede, blue in their depths with a white lip, broken here
// and there; down its middle the dark stripe of a medial moraine; at its far edge the grey crest of
// the other moraine. At the snout end the ice is dirty with the gravel it carries.
function paintIce(S, x, gy, lip) {
  const top = Math.round(iceTop(x)), dirt = 1 - smooth(ICE0, ICE0 + 110, x), wet = smooth(XM - 30, XM + 20, x);
  if (top >= lip - 1) return;
  const far = 2 + Math.round(2 * vnoise(x / 14, 2, 769)), med = 0.55 + 0.05 * (vnoise(x / 50, 3, 770) - 0.5);
  for (let r = top; r < lip; r++) {
    const d = (r - lip) / (top - lip), y = gy + r;
    let c;
    if (r < top + far) c = pick('rock', 0.42 + 0.25 * hash(x, y, 771) + (r === top ? -0.2 : 0), x, y, 0.7);
    else if (r === lip - 1 && wet > 0.5) c = (x + Math.round(r)) % 5 === 0 ? R.water[4] : R.water[2];
    else if (r === lip - 2 && wet > 0.5) c = R.rock[1];
    else {
      c = pick('glac', 0.66 + 0.18 * d + 0.12 * (vnoise(x / 6, d * 8, 772) - 0.5), x, y, 0.6);
      const u = x - (r - lip) * (0.6 + 0.6 * vnoise(x / 80, 5, 784)), sp = u / 30 + 1.2 * vnoise(u / 45, d * 2, 767), k = Math.floor(sp), cr = frac(sp), gape = hash(k, 1, 785);
      const w = (gape > 0.8 ? 0.22 : 0.08) * (1 - 0.6 * d) * smooth(0, 0.3, vnoise(u / 12, d * 5 + k, 768) - 0.25);
      if (cr < w) c = R.glac[cr < w * 0.55 ? 0 : 1]; else if (w > 0 && cr < w + 0.04) c = R.glac[5];
      if (Math.abs(d - med) < 0.035 + 0.02 * vnoise(x / 9, 4, 773)) c = pick('rock', 0.3 + 0.3 * hash(x, y, 774), x, y);
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
  for (let x = 38; x < 266; x++) {
    const inX = smooth(38, 70, x) * smooth(266, 236, x), top = Math.round(SPY - 34 * inX * (0.5 + 0.5 * vnoise(x / 9, 5, 741)) - 4 * (vnoise(x / 2.5, 6, 742) - 0.5));
    for (let y = top; y <= SPY + 4; y++) { const d = y - top, ice = d > (SPY - top) * 0.45 || vnoise(x / 8, y / 6, 743) > 0.62; b.set(x, y, d < 1 ? R.granite[0] : ice ? pick('glac', 0.8 + 0.2 * (vnoise(x / 4, y / 4, 744) - 0.5), x, y, 0.6) : pick('granite', 0.38 + 0.15 * (vnoise(x / 3, y / 5, 745) - 0.5), x, y, 0.8)); }
  }
  for (const [n, sp] of SPIRES.map((s, k) => [k, s]).sort((a, c) => a[1].z - c[1].z)) {
    const h = Math.round(sp.h * 140), w = Math.round(Math.min(sp.w * h, 90));
    tower(b, n, Math.round(40 + sp.x * 240), Math.round(SPY + (sp.z - 0.4) * 14), h, w, null);
  }
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
  const spiresPic = makeSpires();
  const clouds = Array.from({ length: 3 }, (_, k) => ({ bm: makeCloud(740 + k), x: k * 270 + 30, y: 6 + k * 11, v: 2.5 + k }));

  // Subalpine firs: a few small ones on the drop behind (far, so small), bigger ones on the near slope,
  // never on the snow or the stream; rocks and heather between. A marmot on a rock behind the trail
  // where a rib stands proud a little past the stream, and another below the trail near the snow.
  const things = [];
  const spire = (seed, H) => makeConifer(seed, H, Math.max(5, Math.round(H * 0.28)), 'conifer', Math.max(5, Math.round(H / 4.5)), { ragged: seed & 1 });
  for (let x = 20; x < SW - 20; x += 12 + rand() * 36) {
    const back = rand() < 0.3, r = back ? -2 - Math.round(rand() * 3) : 12 + Math.round(rand() * 150);
    if (fbm(x / 80, back ? 2 : 3, 727, 2) < 0.45 || inSnow(x, r) || Math.abs(x - STREAM) < 14 || mor(x) > 0.1 || (back && x > ICE0 - 20)) continue;
    const H = back ? Math.round(16 + rand() * 18) : Math.round(22 + rand() * 26 + r * 0.08);
    things.push({ tree: spire(750 + things.length, H), x: Math.round(x), y: g(x) + r });
  }
  for (let n = 0; n < 34; n++) { const x = Math.round(rand() * SW), r = rand() < 0.35 ? -2 - Math.round(rand() * 3) : 8 + Math.round(rand() * 120); if (inSnow(x, r) || Math.abs(x - STREAM) < 8 || mor(x) > 0.1 || (r < 0 && x > ICE0 - 20)) continue; things.push(rand() < 0.5 ? { bm: makeBoulder(760 + n, r < 0 ? 2 + rand() * 3 : 3 + rand() * 6), x, y: g(x) + r } : { bm: makeBush(770 + (n % 3), 'heather'), x, y: g(x) + r }); }
  // The moraine's stones: big blocks the glacier dropped, sitting on the crest beside the trail and
  // standing out of the flank below it, more of them the further he goes.
  const rs = rng(777);
  for (let x = XM - 20; x < SW - 20; x += 24 + rs() * 50) {
    const front = rs() < 0.7, r = front ? 6 + Math.round(sq(rs()) * 200) : -2 - Math.round(rs() * 2);
    if (rs() > mor(x - (front ? r * 0.9 : 0)) || (r < 12 && x > XS - 10 && x < KAYTI + 30)) continue;
    things.push({ bm: makeBoulder(790 + (things.length % 40), front ? 4 + rs() * (5 + r * 0.05) : 3 + rs() * 3), x: Math.round(x), y: g(x) + r });
  }
  const rib = x => -fbm(x / 50, 4, 728, 2);
  let m1 = STREAM + 80, bv = 1; for (let x = STREAM + 50; x < STREAM + 200; x += 4) { const v = rib(x); if (v < bv) { bv = v; m1 = x; } }
  const m2 = SNOW - SNOW_W - 40;
  const M = [{ x: m1, y: g(m1) - 7, rock: makeBoulder(780, 8), seen: -9 }, { x: m2, y: g(m2) + 22, rock: makeBoulder(781, 10), seen: -9 }];
  for (let i = things.length - 1; i >= 0; i--) if (M.some(m => Math.abs(things[i].x - m.x) < 24 && Math.abs(things[i].y - m.y) < 18)) things.splice(i, 1);
  for (const m of M) { things.push({ bm: m.rock, x: m.x, y: m.y }); let top = 0; while (top < m.rock.h && !m.rock.d[top * m.rock.w + m.rock.ox]) top++; m.top = m.rock.oy - top; }
  const marm = { sun: marmot('sun'), up: marmot('up') };
  const tents = [dome('tent'), dome('red')], kayti = makeKayti(); let waved = -9, now = 0;

  let cam = 0, last = { camX: 0, base: 0, dir: 1, VW: 0 };
  const list = [];
  const xOf = q => X0 + q * LEN;

  return {
    ...META,
    enter(scr, arg, q) { cam = xOf(q); st.y = null; },
    focus: () => focus,
    act(id, env) { if (id === 'kayti') { waved = now; return true; } const m = M[+id.slice(6)]; if (id.startsWith('marmot') && m) { m.seen = env.t; env.sfx('whistle'); return true; } return false; },
    pick(sx, sy) {
      if (last.dir < 0) sx = last.VW - 1 - sx;
      const wx = sx + last.camX, wy = sy - last.base, mx = v => last.dir < 0 ? last.VW - 1 - (v - last.camX) : v - last.camX;
      if (Math.abs(wx - KAYTI) < 9 && wy > g(KAYTI) - 25 && wy < g(KAYTI) + 3) return { label: NAMES.kayti, x: mx(KAYTI), y: last.base + g(KAYTI) - 27, act: 'kayti' };
      for (let k = 0; k < M.length; k++) { const m = M[k]; if (Math.abs(wx - m.x) < 13 && wy > m.y - m.top - 14 && wy < m.y + 2) return { label: NAMES.approach.marmot, x: mx(m.x), y: last.base + m.y - m.top - 16, act: 'marmot' + k }; }
      return null;
    },
    draw(scr, env, arg, q) {
      const { VW, VH, fb } = scr, { t, tq } = env, dir = arg.dir < 0 ? -1 : 1; now = t;
      const mx = xOf(q), d = q * LEN;
      // He hops the stream: a small jump as he crosses it.
      const sj = (mx - STREAM) / 9, hop = Math.abs(sj) < 1 ? Math.round(5 * (1 - sj * sj)) : 0, my = g(mx) - hop;
      cam += (mx - cam) * (env.calm ? 1 : Math.min(1, env.dt * 8));
      const camX = Math.round(cam - VW * (scr.narrow ? 0.5 : 0.4) + env.look.x * 0.5 * dir), base = baseline(scr, env.shown, st) - Math.round(0.7 * g(Math.round(cam)));
      // The valley floor shows just above the top of the drop; the far wall rises from it.
      const fl = base + g(Math.round(cam)) - 6, hor = fl - FLOOR_H - 30;
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
      { const foot = fl - FLOOR_H - 26, k = Math.min(VW * 0.92 / SPW, lerp(0.4, 1, smooth(0, 1, q)) * (foot - 8) / SPH);
        blitScaled(fb, VW, VH, spiresPic, Math.round(VW * (scr.narrow ? 0.6 : 0.76) - (camX - X0) * 0.06 + LEN * 0.03), foot, k); }
      drawStrip(scr, wall, camX * P_WALL + 200, fl - FLOOR_H + 1, false, 0);
      drawStrip(scr, floor, camX * P_FLOOR, fl, false, floorFill);
      // The river glints far below.
      for (let n = 0; n < 8; n++) { const fx = Math.round(hash(n, 1, 730) * 1300), x = fx - Math.round(camX * P_FLOOR); if (x < 0 || x >= VW || frac(t * 0.6 + hash(n, 2, 730)) > 0.3) continue; scr.set(x, fl + Math.round(riverY(fx)), R.white[1]); }
      drawStrip(scr, main, camX, base, false, R.moss[1]);
      // The stream runs: bright flecks travel down it, behind the trail and in front.
      for (let k = 0; k < 14; k++) { const u = frac(t * 0.9 + k / 14), r = Math.round(lerp(150, lipAt(STREAM) + 1, u)), x = Math.round(STREAM + 2 * Math.sin((g(STREAM) + r) / 7) * (r > 2 ? 1 : 0)) - camX; if (x >= 0 && x < VW) scr.set(x, base + g(STREAM) + r, R.white[1]); }

      // Meltwater runs along the ice's edge under the moraine: glints travel down it (the way he came,
      // as the glacier flows), and once he is on the crest it gurgles, and now and then the ice cracks.
      for (let k = 0; k < 24; k++) {
        const x = Math.round(camX + frac(hash(k, 3, 778) - t * 0.05) * (VW + 40) - 20);
        if (x < XM - 30 || frac(t * 0.8 + hash(k, 4, 778)) > 0.5) continue;
        scr.set(x - camX, base + g(x) + lipAt(x) - 1, R.white[1]);
      }
      if (env.running && mor(mx) > 0.5) {
        if (t > (st.gurgle || 0)) { st.gurgle = t + 1.2 + 2 * hash(Math.floor(t), 5, 779); env.sfx('gurgle'); }
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
      // Camp comes into view on the shelf ahead in the last seconds: the tents just behind the trail, smoke
      // from the stove between them, and Kayti beyond them painting the towers.
      if (TENTS[0] - camX < VW + 30) {
        list.push({ bm: tents[0], x: TENTS[0], y: g(TENTS[0]) - 2 }, { bm: tents[1], x: TENTS[1], y: g(TENTS[1]) - 1 });
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
      if (TENTS[0] - camX < VW + 30) { const cx = (TENTS[0] + TENTS[1]) / 2 - camX, cy = base + g(TENTS[0]) - 12; for (let k = 0; k < 5; k++) { const age = frac(t * 0.35 + k / 5); scr.set(Math.round(cx + age * 9 + Math.sin(age * 6 + k)), Math.round(cy - age * 24), age < 0.5 ? R.granite[4] : R.granite[3]); } }
      last = { camX, base, dir, VW };
      if (dir < 0) { mirror(fb, VW, VH); focus.x = VW - 1 - focus.x; }
    }
  };
}

// Going the other way, the whole picture flips (he then faces left, and the light comes from the east).
function mirror(fb, VW, VH) {
  for (let y = 0; y < VH; y++) { let a = y * VW, b = a + VW - 1; while (a < b) { const c = fb[a]; fb[a++] = fb[b]; fb[b--] = c; } }
}
