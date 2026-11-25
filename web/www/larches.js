// The larch basin (section G): off the map on the way to Proficiency Peak, side-on. He comes in through
// Postmortem Burn with the dry country behind him (round 8, C2), climbs the rungs onto the granite benches
// in their autumn gold, the Enchantments' spires and a blue glacier far behind, and the peak itself
// growing ahead of him. He goes the way the map's trail was going when
// it handed him over (arg.dir), so the whole picture is drawn left to right and mirrored when needed.
import { covered, clamp, lerp, smooth, frac, hash, vnoise, fbm, bayer, rng, R, DAY, INK, pick, BM, outline, windAt, saw } from './core.js';
import { Strip, drawStrip, baseline, shell, blitScaled, paintPeaks } from './side.js';
import { makeConifer, makeBoulder, makeCloud, makeHuckleberry, huckClumps, swaying } from './sprites.js';
import { makeRunner, sideFig } from './tj.js';
import { goat, pika, shyPika } from './fauna.js';
import { NAMES } from './content.js';
import { PROFICIENCY } from './land.js';
import { shadow } from './weather.js';

// SW: the near strip's width; he walks LEN of it, from X0, in WALK seconds.
const SW = 1500, X0 = 320, LEN = 700, WALK = 9;
// The iron rungs (round 5, T64, after the rungs above Snow Lake on the way into the Enchantments): the scene
// opens with him on a granite slab that stands `rise` high over `run`, its top where the walk begins. He
// climbs it in `secs`, a rung every `step` of height.
const RUNG = { top: X0, run: 24, rise: 52, secs: 3, step: 5 };
// The burn (round 8, C2, TJ: start the scene in the burn, with the golden hills, the coulee and the badlands
// behind): before the rungs he walks `len` of the lower ground in `secs`, through dead trees and fireweed.
// The strip of near ground begins OFF left of the old scene's x = 0, so nothing that was drawn has moved.
// The granite wall the rungs climb stands behind the lower ground from WALL0 on; left of it the dry country
// shows, in a strip of its own (DRY: its width, how much of his movement it follows, and where it sits).
const BURN = { len: 520, secs: 6.5 }, OFF = 1100, WALL0 = 40, XB = RUNG.top - RUNG.run - BURN.len;
const DRY = { w: 2100, end: 1000, p: 0.7, k: 520, y: 60 };
const DUR = BURN.secs + RUNG.secs + WALK;
// The trail climbs the slabs in steps: a short rise every 110 or so, flat between. `bench` is that ground
// alone, and `g` is the ground with the slab below its first bench.
const bench = x => { const u = (x - X0) / 112 + 0.3 * vnoise(x / 60, 1, 600); return -Math.round(4 * (Math.floor(u) + smooth(0.72, 1, frac(u))) + 1.5 * Math.sin(x / 23)); };
const g = x => bench(x) + Math.round(RUNG.rise * clamp((RUNG.top - x) / RUNG.run, 0, 1));
const onSlab = x => x >= RUNG.top - RUNG.run && x < RUNG.top;
// Where he is at each moment: up the rungs first (`rung` is how far up them, 0 to 1), then along the trail.
// `low`: still in the burn, below the rungs. `d`: how far he has walked on this stretch, for his stride.
const at = q => {
  const tau = q * DUR, foot = RUNG.top - RUNG.run, y0 = bench(RUNG.top) + RUNG.rise;
  if (tau < BURN.secs) { const x = XB + tau / BURN.secs * BURN.len; return { x, y: lerp(g(x), y0, smooth(foot - 30, foot, x)), rung: 0, low: true, d: x - XB }; }
  if (tau < BURN.secs + RUNG.secs) { const u = (tau - BURN.secs) / RUNG.secs; return { x: foot + RUNG.run * u, y: y0 - RUNG.rise * u, rung: u, d: 0 }; }
  const x = X0 + (tau - BURN.secs - RUNG.secs) / WALK * LEN; return { x, y: g(x), rung: 1, d: x - X0 };
};
// How far back each layer sits: the share of his movement it follows.
const P_FAR = 0.05, P_PEAK = 0.12, P_MID = 0.42;

const META = {
  name: 'larches',
  dur: () => DUR,
  stops: () => [],
  elev: (arg, q) => -at(q).y * 1.5
};
export const makeLarches = () => shell(META, buildLarches, ['enter', 'focus', 'pick', 'act', 'draw', 'trigger']);

// The Enchantments. Far back, a pale range with snow on its tops; in front, granite spires of every size
// standing where they please (Dragontail, Little Annapurna and friends), each lit on its west face, with snow
// in the gullies near the tops and a glacier hanging under the biggest one, ending in a blue ice front.
const backRange = x => -70 - 44 * fbm(x / 90, 1.3, 616, 4) - 8 * Math.sin(x / 47);
function spires(w, rand) {
  const out = []; for (let x = -40; x < w + 40; x += 34 + rand() * 70) out.push({ cx: x, h: 50 + rand() * rand() * 120, hw: 26 + rand() * 40, p: 0.75 + rand() * 0.6 });
  return out;
}
function paintFar(S, rand) {
  for (let x = 0; x < S.w; x++) {
    const top = Math.round(backRange(x)), sl = backRange(x + 1) - backRange(x - 1);
    for (let y = top; y < S.h - S.up; y++) S.set(x, y, y - top < 3 + 3 * vnoise(x / 6, 1, 617) && top < -88 ? R.farsnow[sl < 0 ? 1 : 0] : pick('far', 0.8 + clamp(sl * 3, -0.15, 0.15) + 0.08 * (vnoise(x / 9, y / 9, 623) - 0.5) - (y - top) * 0.003, x, y));
  }
  const SP = spires(S.w, rand), topAt = paintPeaks(S, SP);
  // The glacier, under the tallest spire, about a third of the way down it.
  const big = SP.filter(p => p.cx > 200 && p.cx < S.w - 200).reduce((a, b) => (b.h > a.h ? b : a));
  for (let x = Math.round(big.cx - big.hw * 0.9); x <= big.cx + big.hw * 0.9; x++) {
    const a = 1 - Math.abs(x - big.cx) / (big.hw * 0.9), surf = Math.round(-18 - big.h * 0.62 + 10 * (1 - a)), toe = Math.round(-18 - big.h * 0.22 - 10 * a - 4 * vnoise(x / 5, 3, 614));
    for (let y = Math.max(surf, Math.round(topAt(x)) + 2); y <= toe; y++) {
      const d = (y - surf) / Math.max(1, toe - surf);
      // Snow on top, lit from the west; two or three crevasses bowed down the slope, broken; at its foot
      // the blue ice front, streaked where it calves.
      let c = pick('glac', 0.95 - 0.3 * d - 0.15 * (x > big.cx ? (x - big.cx) / big.hw : 0) + 0.06 * (vnoise(x / 4, y / 3, 615) - 0.5), x, y, 0.5);
      if (d > 0.25 && d < 0.8 && frac((y - surf) / 9 - 1.2 * a * a) < 0.12 && vnoise(x / 6, y / 5, 618) > 0.45) c = R.glac[frac((y - surf) / 9 - 1.2 * a * a) < 0.05 ? 5 : 1];
      if (toe - y < 4) c = toe - y < 1 ? R.glac[0] : R.glac[hash(x, 0, 619) < 0.3 ? 1 : 2];
      S.set(x, y, c);
    }
  }
}

// Proficiency Peak, from the outline the map draws it with: cool grey granite lit from the west,
// cracks and water streaks running down it, the lit edges near white.
const PKW = 240, PKH = 200;
function makePeak() {
  const b = new BM(PKW, PKH); b.ox = PKW >> 1; b.oy = PKH - 1;
  const at = i => PROFICIENCY((i / PKW - 0.5) * 150);
  for (let i = 0; i < PKW; i++) {
    const p = at(i); if (p <= 0) continue;
    const h = Math.round(p * PKH), lit = at(i + 1) - at(i - 1) > 0;
    for (let y = PKH - h; y < PKH; y++) {
      // Broad planes a few columns wide, each a shade lighter or darker, split by long vertical cracks
      // with a lit lip; water streaks darken it in places. Clean planes, not speckle, as in the picture.
      const crack = vnoise(i / 2.2, y / 26, 902), streak = vnoise(i / 5, y / 40, 903), plane = Math.floor(i / 11 + 0.6 * vnoise(y / 50, 1, 905));
      let v = 0.56 + (lit ? 0.2 : -0.16) + 0.12 * (hash(plane, 0, 904) - 0.5) + (streak > 0.64 ? -0.14 : 0) - 0.14 * smooth(PKH - 30, PKH, y);
      if (crack > 0.76) v = 0.18; else if (crack > 0.72 && lit) v += 0.16;
      if (y - (PKH - h) < 2 && lit) v = 1;
      b.set(i, y, v > 0.9 ? R.gold[6] : pick('rock', v / 0.9, i, y, 0.4));
    }
  }
  outline(b, INK);
  return b;
}

// The basin's middle distance: rounded granite benches stepping up, crowded with larches, a tarn on one of
// them with the bench behind upside down in it, its outlet falling down the face below, scree at the feet.
// After the picture the scene was redrawn from (design/art/C04): each bench is a crowd of whaleback slabs
// of pale granite overlapping one another, each bulging to a rounded top, lit on its west shoulder,
// shaded underneath, with crack lines curving along the bulge where its sheets peel. Two tiers: the
// back one stepping up in levels, the front one lower. The tarn lies in a hollow on the back tier.
const level = x => Math.floor(x / 210 + 0.6 * vnoise(x / 120, 4, 620)) % 3;
const TX0 = 430, TX1 = 530, MIDW = 1300;
const HUMPS = (() => {
  const rr = rng(661), out = [];
  // Back tier: tops step up with the levels; none over the tarn, two flanking it.
  for (let x = -30; x < MIDW + 40; x += 22 + rr() * 46) {
    const hw = 24 + rr() * 34, ht = 6 + rr() * 10;
    if (x > TX0 - 12 && x < TX1 + 12) continue;
    out.push({ cx: x, hw, top: -6 - ht - 5 * level(x), base: 14, k: 3.4 + rr() * 1.8, s: rr() });
  }
  out.push({ cx: TX0 - 14, hw: 30, top: -14, base: 14, k: 4, s: 0.3 }, { cx: TX1 + 16, hw: 34, top: -16, base: 14, k: 4.4, s: 0.7 });
  // Front tier, lower and nearer.
  for (let x = -20; x < MIDW + 40; x += 26 + rr() * 52) { const hw = 20 + rr() * 30; out.push({ cx: x, hw, top: 9 - 4 - rr() * 7, base: 31, k: 3 + rr() * 1.6, s: rr(), front: true }); }
  // Back to front: the back tier first, then the front; within a tier the lower tops last, so they overlap.
  return out.sort((p, q) => (p.front ? 1 : 0) - (q.front ? 1 : 0) || p.top - q.top);
})();
const humpTop = (o, x) => { const u = (x - o.cx) / o.hw; return Math.abs(u) >= 1 ? null : o.top + (o.base - o.top) * (1 - Math.sqrt(1 - u * u)) * 0.85 + 1.2 * vnoise(x / 9, o.s * 40, 621); };
// The flat slab the tarn lies on, between its two flanking humps.
const surfY = -9;
const SKY = (() => { const a = new Float32Array(MIDW); for (let x = 0; x < MIDW; x++) { let t = 99; for (const o of HUMPS) if (!o.front) { const y = humpTop(o, x); if (y != null && y < t) t = y; } if (x >= TX0 - 6 && x <= TX1 + 6) t = Math.min(t, surfY - 2); a[x] = t === 99 ? 0 : t; } return a; })();
const benchTop = x => Math.round(SKY[clamp(Math.round(x), 0, MIDW - 1)]);
function miniLarch(S, x, y, h) {
  for (let j = 0; j < h; j++) { const w = Math.round((j / h) * h * 0.3 + (j % 3 === 2 ? 1 : 0)); for (let i = -w; i <= w; i++) S.set(x + i, y - h + j, R.larch[clamp(Math.round(2.4 + (i < 0 ? 0.9 : -0.6) + (hash(x + i, j, 622) - 0.5) * 1.6 - (j % 3 === 0 ? 0.8 : 0)), 0, 4)]); }
  S.set(x, y, R.bark[1]); S.set(x, y - 1, R.bark[1]);
}
function paintMid(S, rand) {
  // Scree and turf at the feet first, under everything.
  for (let x = 0; x < S.w; x++) for (let y = 14; y < 30; y++) S.set(x, y, fbm(x / 9, y / 4, 630, 2) > 0.5 ? pick('rock', 0.5 + 0.3 * hash(x, y, 631), x, y) : pick('grass', 0.4 + 0.25 * hash(x, y, 627), x, y, 0.4));
  // The flat slab under the tarn.
  for (let x = TX0 - 20; x <= TX1 + 20; x++) for (let y = surfY - 2; y < 14; y++) S.set(x, y, pick('granite', 0.78 - 0.4 * smooth(surfY, 14, y) + 0.06 * (vnoise(x / 6, y / 4, 664) - 0.5), x, y, 0.5));
  for (const o of HUMPS) {
    for (let x = Math.max(0, Math.floor(o.cx - o.hw)); x <= Math.min(S.w - 1, Math.ceil(o.cx + o.hw)); x++) {
      const tp = humpTop(o, x); if (tp == null) continue;
      const top = Math.round(tp), u = (x - o.cx) / o.hw;
      for (let y = top; y < o.base; y++) {
        const d = y - top, depth = d / Math.max(1, o.base - o.top);
        // The rounded top faces the sun on its west shoulder; underneath the bulge turns away into shade.
        let v = 0.82 - 0.3 * u - 0.75 * smooth(0.25, 0.95, depth) + 0.06 * (vnoise(x / 7, y / 4, 662 + o.s * 9) - 0.5);
        // Sheets peeling along the bulge: crack lines that follow the top's curve, broken here and there.
        if (d > 2 && frac(d / o.k + 0.3 * vnoise(x / 30, o.s * 20, 663)) < 0.16 && vnoise(x / 11, y / 3, 665 + o.s * 5) > 0.38) v -= 0.22;
        let c = d === 0 ? (S.get(x, y - 1) ? R.granite[1] : R.granite[u < 0.2 ? 5 : 4]) : d === 1 && u < 0.5 ? R.granite[5] : pick('granite', clamp(v, 0.05, 1), x, y, 0.5);
        if (o.base - y <= 1) c = R.granite[0];
        S.set(x, y, c);
      }
      // Turf and heather in the crease where a slab meets the one behind it.
      if (top > 0 && hash(x, 2, 666) < 0.5) S.set(x, top - 1, pick('grass', 0.45 + 0.3 * hash(x, 3, 667), x, top - 1));
    }
  }
  for (let n = 0; n < 420; n++) { const x = Math.round(rand() * S.w); if ((x > TX0 - 8 && x < TX1 + 8) || fbm(x / 60, 1, 632, 2) < 0.4) continue; miniLarch(S, x, benchTop(x) + 2, 6 + Math.round(rand() * rand() * 14)); }
  // The tarn: still water reflecting the bench behind it, in a pale rim on its flat slab.
  const surf = benchTop(TX0) + 2;
  for (let x = TX0; x <= TX1; x++) {
    const edge = Math.min(x - TX0, TX1 - x);
    for (let j = 0; j < 8; j++) {
      if (j > edge * 0.7 + 1) { if (j <= edge * 0.7 + 2) S.set(x, surf + j, R.granite[5]); continue; }
      const src = S.get(x, surf - 2 - Math.round(j * 1.6)), lum = src ? (0.3 * DAY[src][0] + 0.59 * DAY[src][1] + 0.11 * DAY[src][2]) / 255 : 0.7;
      S.set(x, surf + j, R.tarn[clamp(Math.round((0.25 + lum * 0.6) * 5 + (bayer(x, j) - 0.5) * 0.8), 1, 5)]);
    }
  }
  // The outlet spills over the bench's lip below the tarn.
  for (let y = surf + 5; y < 30; y++) for (let i = 0; i < 3; i++) S.set(TX1 + 3 + i + Math.round(Math.sin(y / 5)), y, i === 1 ? R.white[1] : R.glac[4]);
}

// Near: heather and grass with granite slabs breaking through, the trail worn to dirt across it (pale
// where it crosses bare slab), and larch needles sprinkled gold under the trees. The red huckleberry that
// grows on it is drawn as shrubs (buildLarches), where `huckAt` says it grows.
// Where bare granite breaks through the near ground (r: rows below the trail).
const slabAt = (x, r) => fbm(x / 34, (g(x) + r) / 12, 630, 3) > 0.66 - 0.08 * smooth(10, -4, r);
const huckAt = (x, y) => fbm(x / 9, y / 4, 639, 3);
// The slab the rungs climb, which carries on below the trail.
const onRungs = (x, r) => x >= RUNG.top - RUNG.run - 14 && x <= RUNG.top + 10 + 12 * vnoise((g(x) + r) / 5, 5, 602) && r < 30 + 16 * vnoise(x / 9, 3, 601);
// How burnt the near ground is: all of it well left of the rungs, none of it by their foot.
const burnt = x => smooth(RUNG.top - RUNG.run - 16, RUNG.top - RUNG.run - 150, x);
function paintMain(S, near) {
  for (let x = -OFF; x < SW; x++) {
    const gy = g(x), step = g(x + 1) < gy && !onSlab(x), bu = burnt(x);
    // Left of the rungs the lower ground has the cliff they climb standing behind it, as high as the first
    // bench: jointed granite, darker than the slab, in shade at its foot, with turf along its top.
    // The wall ends at WALL0 in a corner: its last few columns are the side that turns away, in shade.
    if (x < RUNG.top && x >= WALL0) for (let y = bench(x) - 14; y < gy - 14; y++) {
      const dy = y - (bench(x) - 14), foot = gy - 14 - y, joint = vnoise(x / 3, y / 40, 642) > 0.78, sheet = frac(y / 13 + 0.5 * vnoise(x / 40, y / 40, 643)) < 0.08, side = x - WALL0 < 7 + 3 * vnoise(y / 9, 2, 647);
      let c = x === WALL0 ? R.rock[0] : joint || sheet ? R.rock[1] : pick('rock', (side ? 0.42 : 0.8) - 0.2 * smooth(4, 40, dy) + 0.14 * (fbm(x / 16, y / 26, 644, 3) - 0.5) - (foot < 3 ? 0.2 : 0), x, y, 0.25);
      // Turf on its top, hanging over the edge in places.
      if (dy < 3 + 2 * vnoise(x / 5, 9, 645)) c = pick('grass', 0.45 + 0.3 * hash(x, y, 646), x, y, 0.4);
      S.set(x, y, c);
    }
    for (let y = gy - 14; y < S.h - S.up; y++) {
      // A sliver one row deep reads as a dash, not a slab, so it stays turf.
      const r = y - gy, slab = (bu < 0.5 && slabAt(x, r) && (slabAt(x, r - 1) || slabAt(x, r + 1))) || onRungs(x, r), n = hash(x, y, 638);
      let c;
      if (slab) {
        // A slab bulges out of the turf like the benches behind: its top edge catches the sun, its foot is
        // in shade, it is palest where it bulges most, and its sheets show as cracks along the bulge.
        const inner = Math.max(0.02, fbm(x / 34, (gy + r) / 12, 630, 3) - (0.66 - 0.08 * smooth(10, -4, r)));
        c = !slabAt(x, r - 1) && !onRungs(x, r - 1) ? R.granite[x % 3 ? 5 : 4] : !slabAt(x, r + 1) && !onRungs(x, r + 1) ? R.granite[1] : !slabAt(x, r + 2) && !onRungs(x, r + 2) ? R.granite[2]
          : frac(inner * 55 + 0.4 * vnoise(x / 20, y / 6, 634)) < 0.12 && inner > 0.03 ? R.granite[2] : pick('granite', 0.58 + 2.2 * Math.min(inner, 0.12) + 0.08 * (vnoise(x / 9, y / 4, 635) - 0.5) + (n < 0.03 ? -0.2 : 0), x, y, 0.5);
      }
      else if (r >= -2 && r <= 3) c = n < 0.08 ? R.rock[2] : pick('dirt', 0.6 - Math.abs(r - 0.5) * 0.06 + 0.25 * (vnoise(x / 5, y / 2, 633) - 0.5), x, y, 0.7);
      else if (hash(x >> 1, y >> 1, 650) < bu) {
        // Burnt ground: grey ash and black duff in patches, green coming back through it in drifts, bits of
        // charcoal lying about, and now and then a bleached stick.
        const green = fbm(x / 30, y / 10, 651, 3), ashy = fbm(x / 17, y / 7, 652, 2);
        c = green > 0.56 ? pick('grass', 0.42 + 0.5 * (green - 0.56) * 4 + 0.14 * (hash(x >> 1, y >> 1, 653) - 0.5) - smooth(40, 200, r) * 0.2, x, y, 0.4) : ashy > 0.5 ? pick('ash', 0.45 + 0.9 * (ashy - 0.5) + 0.2 * (n - 0.5), x, y, 0.5) : fbm(x / 11, y / 5, 654, 2) > 0.6 ? R.basalt[n < 0.5 ? 0 : 1] : R.ash[n < 0.6 ? 0 : 1];
        if (n < 0.025) c = R.ink[0]; else if (n > 0.99 && green < 0.56) c = R.rock[3];
      }
      else {
        c = pick(fbm(x / 24, y / 9, 637, 2) > 0.52 ? 'moss' : 'grass', 0.52 + 0.3 * (fbm(x / 22, y / 12, 648, 3) - 0.5) + 0.12 * (hash(x >> 1, y >> 1, 649) - 0.5) - smooth(40, 200, r) * 0.25, x, y, 0.35);
        if (n < 0.1 * near(x, r)) c = R.larch[n < 0.04 * near(x, r) ? 3 : 2];
      }
      if (slab && r >= -2 && r <= 3) c = pick('granite', 0.86, x, y, 0.5);
      if (r < -2 && y - (gy - 14) < 1 && (x >= RUNG.top || x < WALL0)) c = x < WALL0 ? R.basalt[0] : R.moss[1];
      if (step && r >= 0 && r < 3) c = R.rock[1];
      S.set(x, y, c);
    }
  }
  // The rungs: dark iron staples up the worn line of the slab, with their shadow under each.
  for (let h = 3; h < RUNG.rise - 1; h += RUNG.step) {
    const x = Math.round(RUNG.top - RUNG.run * h / RUNG.rise), y = bench(RUNG.top) + h;
    for (let i = -3; i <= 3; i++) { S.set(x + i, y, R.rock[0]); S.set(x + i, y + 1, R.rock[2]); }
    S.set(x - 3, y + 1, R.rock[0]); S.set(x + 3, y + 1, R.rock[0]);
  }
}

// The dry country behind the burn (round 8, C2, after a picture): far back, mesas with a dark rim of basalt
// over banded slopes of ochre and mauve, the badlands; in front of them the coulee's wall, a row of basalt
// columns over its talus, broken by gaps; nearer, two rows of golden swells, lit on the side turned to the sun
// and striped as the wheat is; and sage on the flat at their feet. It all runs down to nothing at its east
// end (`DRY.end`), where the granite takes over.
function paintDry(S) {
  // It stands tall at its west end, drops below the top of the granite wall further east (`low`), and runs
  // out to nothing over its last stretch (`out`).
  const low = x => lerp(1, 0.46, smooth(520, 700, x)), out = x => smooth(DRY.end, DRY.end - 180, x), sc = x => low(x) * out(x);
  const hA = x => sc(x) * Math.min(136, 122 + 44 * (fbm(x / 150, 2.1, 700, 2) - 0.5));
  const hB = x => sc(x) * (92 + 22 * (vnoise(x / 90, 5, 703) - 0.5)) * lerp(0.5, 1, smooth(0.3, 0.44, vnoise(x / 140, 7, 704)));
  const HILLS = [[50, 20, 75], [36, 15, 55], [22, 11, 38]];
  const hC = (x, k) => sc(x) * (HILLS[k][0] + HILLS[k][1] * Math.sin(x / HILLS[k][2] + 2.3 * k + 1.4 * vnoise(x / 100, k, 705)));
  const BANDS = [R.ochre[2], R.mauve[3], R.ochre[3], R.mauve[2], R.ochre[1], R.ochre[2]];
  for (let x = 0; x < DRY.end; x++) {
    // The rim caps the mesa only where its top is level; where the top falls away it is an eroded slope.
    const a = Math.round(hA(x)), flat = Math.abs(hA(x + 3) - hA(x - 3)) < 1.6;
    for (let y = -a; y < 0; y++) { const d = y + a, gully = vnoise(x / 3.5, y / 70, 702) > 0.7, talus = -y < a * 0.3 + 6 * vnoise(x / 14, 1, 712);
      S.set(x, y, d < 5 && a > 30 && flat ? (d < 1 ? R.basalt[3] : x % 4 === 3 ? R.basalt[0] : R.basalt[1 + (hash(x >> 2, 0, 707) < 0.5 ? 1 : 0)])
        : talus || (!flat && d < 9) ? R.ochre[bayer(x, y) < 0.35 ? 3 : 2] : gully ? R.mauve[1] : BANDS[Math.floor((y + 400 + 2.5 * vnoise(x / 30, 3, 701)) / 6) % 6]); }
    const b = Math.round(hB(x));
    for (let y = -b; y < 0; y++) { const d = y + b, cell = Math.floor(x / 3);
      S.set(x, y, d < 1 ? R.ash[3] : d < b * 0.5 ? (x % 3 === 2 ? R.basalt[0] : R.basalt[(x % 3 === 0 ? 3 : 2) - (hash(cell, 0, 708) < 0.3 ? 1 : 0)]) : hash(x, y, 709) < 0.3 ? R.basalt[1] : R.ash[hash(x >> 1, y >> 1, 710) < 0.5 ? 1 : 2]); }
    for (const k of [0, 1, 2]) { const c = Math.round(hC(x, k)), slope = clamp((hC(x + 3, k) - hC(x - 3, k)) / 6, -0.5, 0.5);
      for (let y = -c; y < 0; y++) { const d = y + c, v = clamp(Math.round(1.5 + 2.4 * slope + 0.8 * (0.5 - d / Math.max(1, c)) + (bayer(x, y) - 0.5) * 0.9), 0, 3), strip = d > 2 && (Math.floor(d / 3 + 0.6 * vnoise(x / 40, k, 706)) & 1) === 1;
        S.set(x, y, d < 1 ? R.dry[3] : v === 2 && strip ? R.mustard[2] : R.dry[v]); } }
    if (out(x) > 0.02) for (let y = -2; y < S.h - S.up; y++) { const n = hash(x >> 1, y >> 1, 711); S.set(x, y, n < 0.26 ? R.sage[1] : n < 0.36 ? R.sage[2] : n > 0.93 ? R.dry[0] : R.dry[1]); }
  }
}

// A dead tree of the burn, at the scene's size (round 8, C2, after a picture): a straight, tapering trunk
// with a small lean, black with flecks of silver where the char has flaked and a little bronze bark left, or
// all weathered silver; lit on its left, dark on its right; a snapped or a spiked top; and stub limbs
// angled up, alternately left and right.
function makeBurnSnag(seed, H, silver) {
  const rand = rng(seed), cx = 14, b = new BM(29, H + 3); b.ox = cx; b.oy = H + 1;
  const C = silver ? [R.rock[1], R.rock[2], R.rock[3], R.rock[4]] : [R.ink[0], R.basalt[0], R.basalt[1], R.basalt[2]];
  const w0 = H > 70 ? 6 : H > 48 ? 5 : 4, lean = (rand() - 0.5) * 3, snapped = rand() < 0.6, cut = snapped ? 2 + Math.round(H * 0.08 * rand()) : 1;
  const wAt = y => Math.max(1, Math.round(w0 * (0.35 + 0.65 * y / H))), xAt = y => cx + Math.round(lean * (1 - y / H)) - (wAt(y) >> 1);
  for (let y = cut; y <= H; y++) { const w = wAt(y), x0 = xAt(y);
    for (let i = 0; i < w; i++) { const f = hash(seed + i, y, 23); let c = i === 0 ? C[3] : i === w - 1 ? C[0] : C[1 + (hash(seed, y >> 2, 21) < 0.4 ? 1 : 0)];
      if (!silver && f < 0.07) c = R.rock[3]; else if (!silver && f > 0.97) c = R.bark[2];
      b.set(x0 + i, y, c); } }
  if (snapped) { b.set(xAt(cut), cut - 1, C[3]); b.set(xAt(cut), cut - 2, C[2]); }
  for (let k = 0, n = 4 + (rand() * 5 | 0); k < n; k++) { const y = Math.round(cut + 3 + rand() * H * 0.7), sd = k & 1 ? 1 : -1, len = 3 + (rand() * H / 8 | 0), x0 = sd > 0 ? xAt(y) + wAt(y) - 1 : xAt(y);
    for (let d = 1; d <= len; d++) b.set(x0 + sd * d, y - Math.floor(d * (d > len * 0.6 ? 0.9 : 0.5)), sd < 0 ? C[3] : C[1]); }
  return b;
}
// Fireweed at the scene's size: a few tall stalks, leaves in pairs up the lower half, the upper half a spike
// of magenta flowers set to either side in turn, the buds at the tip palest. The spike sways.
function makeBurnFireweed(seed) {
  const rand = rng(seed), b = new BM(13, 20), n = 2 + (rand() * 3 | 0); b.ox = 6; b.oy = 19;
  for (let k = 0; k < n; k++) { const x = clamp(Math.round(1 + k * 10 / Math.max(1, n - 1) + (rand() - 0.5) * 2), 1, 11), tall = 10 + (rand() * 9 | 0), bloom = Math.round(tall * 0.55);
    for (let j = 0; j < tall; j++) { const y = 19 - j, f = j - (tall - bloom);
      if (f < 0) { b.set(x, y, R.grass[1]); if (j & 1) b.set(x + (j % 4 === 1 ? -1 : 1), y, R.grass[j % 4 === 1 ? 3 : 2]); }
      else { b.set(x, y, j === tall - 1 ? R.pink[2] : R.fireweed[0]); if (j < tall - 1) b.set(x + (f & 1 ? 1 : -1), y, R.fireweed[f > bloom - 4 || hash(seed + k, j, 24) < 0.4 ? 1 : 0]); } } }
  return b;
}
// A burnt log on the ground: black, a line of silver along its top, a stub or two standing off it.
function makeBurnLog(seed) {
  const rand = rng(seed), len = 26 + (rand() * 20 | 0), tilt = (rand() - 0.5) * 3, b = new BM(len + 6, 11); b.ox = b.w >> 1; b.oy = 9;
  for (let t = 0; t < len; t++) { const y = Math.round(6 + tilt * (t / len - 0.5));
    b.set(3 + t, y - 1, hash(t, seed, 25) < 0.3 ? R.rock[3] : R.basalt[2]); b.set(3 + t, y, R.basalt[t === len - 1 ? 3 : 1]); b.set(3 + t, y + 1, R.basalt[0]); b.set(3 + t, y + 2, R.ink[0]); }
  for (let k = 0; k < 2; k++) { const t = Math.round(len * (0.2 + 0.5 * rand())), y = Math.round(6 + tilt * (t / len - 0.5)); for (let d = 1; d <= 2 + (rand() * 2 | 0); d++) b.set(3 + t + (k ? d >> 1 : -(d >> 1)), y - 1 - d, R.basalt[1]); }
  return b;
}

// A cairn: flat stones stacked smaller toward the top.
function makeCairn(seed) {
  const r = rng(seed), b = new BM(11, 14); b.ox = 5; b.oy = 13;
  let y = 13;
  for (let k = 0; k < 5; k++) { const w = 4 - k * 0.7 + r() * 0.8, h = 2 + (r() < 0.4 ? 1 : 0), cx = 5 + Math.round((r() - 0.5) * 1.5); for (let j = 0; j < h; j++) for (let i = -Math.round(w); i <= Math.round(w); i++) b.set(cx + i, y - j, R.rock[j === h - 1 ? 4 : i < 0 ? 3 : 2]); y -= h; }
  outline(b, INK);
  return b;
}

function buildLarches() {
  const rand = rng(61), run = makeRunner('wall'), st = {}, focus = { x: 0, y: 0 };
  const far = new Strip(1200, 200, 6); paintFar(far, rand);
  const peak = makePeak();
  const mid = new Strip(1300, 80, 30); paintMid(mid, rand);
  const clouds = Array.from({ length: 3 }, (_, k) => ({ bm: makeCloud(640 + k), x: k * 260 + 40, y: 8 + k * 9, v: 3 + k }));
  // Larches of every age (seedlings, young, mature, and old ones with ragged crowns), behind the trail
  // on the verge and in front of it down the slope, nearer ones bigger; boulders; a cairn at each rise.
  const things = [];
  const AGES = [[12, 7, 4], [22, 10, 6], [36, 14, 8], [52, 18, 10]];
  for (let x = 20; x < SW - 20; x += 16 + rand() * 40) {
    const front = rand() < 0.55, y = front ? 8 + Math.round(rand() * 110) : -4 - Math.round(rand() * 8);
    if (fbm(x / 70, front ? 2 : 3, 640, 2) < 0.42) continue;
    const a = AGES[Math.min(3, Math.floor(rand() * 4 * (front ? 1 : 0.7) + (y > 60 ? 1 : 0)))], s = front ? 1 + y / 220 : 0.8;
    const H = Math.round(a[0] * s);
    things.push({ tree: makeConifer(650 + things.length, H, Math.round(a[1] * s), 'larch', Math.max(4, Math.round(H / 3.2)), { ragged: a[0] > 40 && rand() < 0.5 ? 0.5 : 0.15, droop: 0.6, tufts: true, open: true }), x: Math.round(x), y: g(x) + y });
  }
  // Nothing stands on the slab with the rungs, or in front of it.
  const offSlab = th => !(th.x > RUNG.top - RUNG.run - 22 && th.x < RUNG.top + 18 && th.y - g(th.x) < 76);
  // No larch stands in the burn either.
  for (let i = things.length - 1; i >= 0; i--) if (!offSlab(things[i]) || things[i].x < RUNG.top - RUNG.run - 16) things.splice(i, 1);
  const trees = things.map(th => [th.x, th.y - g(th.x), th.tree.w]);
  // The near ground's strip reaches as high as the ground does. It used to stop 20 rows above the start's
  // level, and the benches climb twice that by the end, so the last of the trail, with its cairns, rocks and
  // larches, stood in the air above a ground that had been cut off (round 5, T67).
  let high = 0; for (let x = 0; x < SW; x++) high = Math.max(high, 16 - Math.min(g(x), bench(x)));
  const strip = new Strip(SW + OFF, high, 600), main = { h: strip.h, up: strip.up, set: (x, y, c) => strip.set(x + OFF, y, c), stamp: (bm, x, y, flip) => strip.stamp(bm, x + OFF, y, flip) };
  paintMain(main, (x, r) => { let a = 0; for (const [tx, ty, tw] of trees) { const d = Math.abs(x - tx) / (tw + 6) + Math.abs(r - ty) / 14; if (d < 1) a = Math.max(a, 1 - d); } return a; });
  for (let n = 0; n < 26; n++) { const x = Math.round(rand() * SW), y = (rand() < 0.5 ? -6 : 10 + rand() * 90) | 0; things.push({ bm: makeBoulder(660 + n, 3 + rand() * 6), x, y: g(x) + y }); }
  // The burn (round 8, C2), on dice of its own so the basin's things stay where they were: dead trees behind
  // the trail on the verge and in front of it down the slope, nearer ones bigger, thinning out toward the
  // rungs; fireweed in drifts between them; and a few burnt logs.
  const dry = new Strip(DRY.w, 150, 24); paintDry(dry);
  { const br = rng(62), FWB = Array.from({ length: 8 }, (_, i) => makeBurnFireweed(720 + i)), FW = FWB.map(b => swaying(b, 10)), edge = RUNG.top - RUNG.run;
    for (let x = -OFF + 30, n = 0; x < edge - 14; x += 9 + br() * 26) { const front = br() < 0.55, y = front ? 10 + Math.round(br() * br() * 150) : -5 - Math.round(br() * 7), roll = br(), silver = br() < 0.15, tall = br(), flip = br() < 0.5;
      if (roll > burnt(x) || fbm(x / 90, front ? 4 : 5, 655, 2) < 0.36) continue;
      things.push({ bm: makeBurnSnag(700 + n++, Math.round((44 + tall * 48) * (front ? 1 + y / 220 : 0.85)), silver), x: Math.round(x), y: g(x) + y, flip }); }
    for (let x = -OFF + 10; x < edge + 6; x += 3 + br() * 9) { const front = br() < 0.6, y = front ? 5 + Math.round(br() * br() * 130) : -3 - Math.round(br() * 8), roll = br(), v = (br() * FW.length) | 0;
      if ((y >= -4 && y <= 8) || fbm(x / 26, y / 12, 656, 2) < 0.46 || roll > 0.25 + burnt(x)) continue;
      things.push({ tree: FW[v], x: Math.round(x), y: g(x) + y }); }
    for (let n = 0; n < 7; n++) { const x = Math.round(XB - 300 + br() * (BURN.len + 300)), y = br() < 0.5 ? -6 : 14 + Math.round(br() * 70); things.push({ bm: makeBurnLog(740 + n), x, y: g(x) + y, flip: br() < 0.5 }); }
    // Far down the slope, which only a tall screen shows: fireweed painted into the ground, as the far
    // huckleberry is, and a few big dead trees.
    for (let n = 0; n < 150; n++) { const x = Math.round(-OFF + br() * (edge + OFF)), y = 135 + Math.round(br() * 420), v = (br() * FWB.length) | 0; if (fbm(x / 26, y / 12, 656, 2) > 0.46 && br() < burnt(x)) main.stamp(FWB[v], x, g(x) + y, false); }
    for (let n = 0; n < 16; n++) { const x = Math.round(-OFF + 30 + br() * (edge - 60 + OFF)), y = 170 + Math.round(br() * 330), tall = br(), flip = br() < 0.5; things.push({ bm: makeBurnSnag(760 + n, Math.round(110 + tall * 60), n % 6 === 0), x, y: g(x) + y, flip }); } }
  for (let x = X0 - 60; x < SW; x += 1) if (bench(x + 1) < bench(x) && bench(x) >= bench(x - 3)) { things.push({ bm: makeCairn(670 + x), x: x + 6, y: g(x + 6) - 3 + bench(x) - bench(x + 6) }); x += 60; }
  // Goats (G5). A nanny and her kid (behind her, facing her) on the first broad slab below the trail past the scene's first third;
  // a billy on the verge above it past two thirds, who turns to watch him go by.
  const G = { stand: goat('stand'), look: goat('look'), graze: goat('graze'), kid: goat('stand', true), hop: goat('stand', true, 1) };
  let nanny = null;
  for (let x = X0 + LEN * 0.33; x < X0 + LEN * 0.8 && !nanny; x += 4) for (let r = 16; r < 44 && !nanny; r += 2) { let ok = true; for (let k = -24; k <= 18 && ok; k += 4) for (const d of [-3, 0, 4, 8]) ok = ok && slabAt(x + k, r + d); if (ok) nanny = { x: Math.round(x), y: g(x) + r }; }
  if (!nanny) nanny = { x: X0 + LEN * 0.45, y: g(X0 + LEN * 0.45) + 24 };
  const kidAt = { x: nanny.x - 21, y: nanny.y + 3 }, billy = { x: Math.round(X0 + LEN * 0.7), y: g(X0 + LEN * 0.7) - 7 };
  // The pika (G7, moved here from Proficiency Peak's talus): two rocks on the verge above the trail, on the first stretch
  // past halfway with no larch within 30, and the pika shuttling between them with flowers for its haystack.
  let px = X0 + LEN * 0.55;
  for (let x = X0 + LEN * 0.5; x < X0 + LEN * 0.9; x += 6) if (!things.some(th => th.tree && Math.abs(th.x - x - 11) < 30 && th.y < g(th.x) + 4) && Math.abs(x - billy.x) > 40) { px = Math.round(x); break; }
  const rockA = makeBoulder(190, 7), rockB = makeBoulder(191, 5), pk = [pika(0), pika(1)], py = g(px) - 6;
  // Huckleberry (round 5, T65): shrubs in clumps on the heather, where the ground used to be painted
  // red, off the slabs and the trail. Those lower on the screen are nearer and bigger. Fewer since round 8
  // (B3, TJ): they are an accent on the green, not a field of red.
  const hucks = [0, 1, 2, 3, 4, 5].map(i => [0.8, 1.05, 1.35, 1.7].map(s => makeHuckleberry(680 + i, s)));
  // The ones far down the slope, which only a tall screen shows, are painted into the ground: nothing they
  // could stand in front of is that low.
  for (const p of huckClumps(0, SW, -12, 590, (x, r) => huckAt(x, g(x) + r), (x, r) => x > RUNG.top - RUNG.run - 30 && !(r >= -5 && r <= 7) && !(x < RUNG.top + 4 && r < 0) && !slabAt(x, r) && !slabAt(x - 5, r) && !slabAt(x + 5, r), 681, 0.6)) {
    const bm = hucks[p.v][p.s + (p.y > 90 ? 1 : 0)];
    if (p.y > 200) main.stamp(bm, p.x, g(p.x) + p.y, p.flip); else things.push({ bm, x: p.x, y: g(p.x) + p.y, flip: p.flip, huck: true });
  }
  // Larches and boulders keep clear of the goats and the pika's rocks, and of the slab.
  for (let i = things.length - 1; i >= 0; i--) { const th = things[i]; if ([nanny, kidAt, billy, { x: px + 11, y: py }].some(p => Math.abs(th.x - p.x) < 22 && Math.abs(th.y - p.y) < 14) || !offSlab(th)) things.splice(i, 1); }
  things.push({ bm: rockA, x: px, y: py }, { bm: rockB, x: px + 22, y: py - 2 });
  // The pika will not be walked up to (round 5, T66, as on the moraine): when he comes near it sits up, calls
  // and bolts for the gap between its two rocks, and it looks out once he has gone by. `hx` is the gap, `sat`
  // where it last was while at ease, and `t0` when it last settled, so its trips for flowers start from rest.
  const shy = shyPika(), hx = px + rockA.w - rockA.ox + 1, home = { x: px, y: py - rockA.h + 4 }, pk0 = { sat: { ...home }, t0: 0, easy: true };
  for (const [dx, dy] of [[0, -1], [0, -2], [1, -1]]) main.set(hx + dx, py + dy, INK);
  // A gust now and then (G6), lasting 2.6 s. Needles stream off the larches across the whole view and the trees
  // bend harder; down in the burn it lifts a trail of ash and dust along the ground instead. The gusts are the
  // map's own as they reach the peak (round 8, E1: sky.gust in world.js), about one in eleven seconds; with
  // the weather switched off it keeps its old clock, one in each 14 seconds. gustGo: a start button's gust.
  const GUST = { slot: 14, len: 2.6 };
  let gustGo = -1e9, gustHeard = -1;
  const gustAt = (t, sky) => { if (t - gustGo < GUST.len) return [t - gustGo, -2 - Math.floor(gustGo)];
    if (sky) { const g = sky.gust('peak'); return g && g[0] < GUST.len ? g : null; }
    const n = Math.floor(t / GUST.slot), u = t - n * GUST.slot - 6 * hash(n, 1, 690); return u >= 0 && u < GUST.len ? [u, n] : null; };
  let cam = 0, last = { camX: 0, base: 0, dir: 1, VW: 0 };
  const poked = { nanny: -99, kid: -99, billy: -99 }; let billyOff = 0;   // when each goat was clicked, and how far along the verge the billy is
  const list = [];
  const xOf = q => at(q).x;
  // On the rungs, side-on and facing the rock: hands and feet move up them in turn.
  const rungFig = [0, 1].map(f => sideFig('wall', { feet: f ? [[4, 3], [3, 8]] : [[3, 8], [4, 3]], hands: f ? [[5, -10], [5, -4]] : [[5, -4], [5, -10]], lean: 3, look: 'up' }));

  return {
    ...META,
    enter(scr, arg, q) { cam = xOf(q); st.y = null; st.rung = -1; shy.reset(); pk0.easy = true; },
    focus: () => focus,
    act(id, env) {
      // The goats answer a click (round 6, note 10): the nanny looks up and snorts, the kid springs about and
      // bleats, and the billy on call bounds off along the verge and comes back.
      if (id === 'nanny' || id === 'kid' || id === 'billy') { if (env.t - poked[id] > 1.5) { poked[id] = env.t; env.sfx(id === 'kid' ? 'bleat' : 'snort'); } return true; }
      if (id === 'pika') { if (shy.startle(env.t)) env.sfx('eep'); env.found('pika'); return true; } return false; },
    trigger(name, t) { if (name === 'gust') { gustGo = t; return true; } return false; },
    pick(sx, sy) {
      if (last.dir < 0) sx = last.VW - 1 - sx;
      const wx = sx + last.camX, wy = sy - last.base, near = (p, w, h) => Math.abs(wx - p.x) < w && wy > p.y - h && wy < p.y + 2;
      const mx = v => last.dir < 0 ? last.VW - 1 - (v - last.camX) : v - last.camX;
      if (near(kidAt, 10, 15)) return { label: NAMES.larches.goats, x: mx(nanny.x - 10), y: last.base + nanny.y - 24, act: 'kid' };
      if (near(nanny, 14, 20)) return { label: NAMES.larches.goats, x: mx(nanny.x - 10), y: last.base + nanny.y - 24, act: 'nanny' };
      if (near({ x: billy.x + billyOff, y: billy.y }, 13, 22)) return { label: NAMES.larches.billy, x: mx(billy.x + billyOff), y: last.base + billy.y - 26, act: 'billy' };
      if (wx > px - 12 && wx < px + 32 && wy > py - 18 && wy < py + 2) return { label: NAMES.larches.pika, x: mx(px + 11), y: last.base + py - 20, act: 'pika' };
      return null;
    },
    draw(scr, env, arg, q) {
      const { VW, VH, fb } = scr, { t, tq } = env, dir = arg.dir < 0 ? -1 : 1;
      const me = at(q), mx = me.x, d = me.d, my = me.y, up = RUNG.rise * me.rung;
      cam += (mx - cam) * (env.calm ? 1 : Math.min(1, env.dt * 8));
      const camX = Math.round(cam - VW * (scr.narrow ? 0.5 : 0.4) + env.look.x * 0.5 * dir), base = baseline(scr, env.shown, st) - Math.round(0.8 * (my - bench(RUNG.top)) * (me.rung < 1 ? 1 : 0)), hor = base - 64;

      // Sky, lightest at the horizon, and a few clouds.
      const sb = R.skyband;
      for (let y = 0; y < Math.min(VH, hor + 2); y++) {
        const f = clamp(1 - (hor - y) / 260, 0, 1) * (sb.length - 1), b0 = Math.floor(f), e = f - b0, row = y * VW;
        if (e < 0.72 || b0 >= sb.length - 1) fb.fill(sb[b0], row, row + VW); else for (let x = 0; x < VW; x++) fb[row + x] = sb[b0 + (bayer(x, y) < (e - 0.72) / 0.28 ? 1 : 0)];
      }
      for (const c of clouds) scr.blit(c.bm, ((c.x + t * c.v) % (VW + 140)) - 70, Math.max(4, hor - 170) + c.y);
      drawStrip(scr, far, camX * P_FAR + 300, hor + 6, false, R.far[1]);
      // Proficiency Peak grows as he nears it: its foot is behind the benches, and it stands from 45% of the
      // height above them at the start to 90% at the end.
      const foot = base - 20, k = lerp(0.45, 0.9, smooth(0, 1, q)) * (foot - 4) / PKH;
      blitScaled(fb, VW, VH, peak, Math.round(VW * (scr.narrow ? 0.62 : 0.74) - (camX - X0) * P_PEAK + LEN * P_PEAK * 0.5), foot, k);
      const midX = camX * P_MID + 120;
      drawStrip(scr, mid, midX, base - 30, false, R.rock[2]);
      // The tarn glints, and the cascade below it runs.
      const tx = TX0 - Math.round(midX), surf = base - 30 + benchTop(TX0) + 2;
      for (let n = 0; n < 6; n++) { const x = tx + Math.round(hash(n, 1, 680) * (TX1 - TX0)); if (frac(t * 0.7 + hash(n, 2, 680)) < 0.3 && x >= 0 && x < VW) scr.set(x, surf + 1 + (n & 1), R.white[1]); }
      for (let y = surf + 6; y < base; y++) if (frac((y - t * 30) / 6) < 0.3) scr.set(TX1 + 4 + Math.round(Math.sin((y - base + 30) / 5)) - Math.round(midX), y, R.white[1]);
      drawStrip(scr, dry, camX * DRY.p + DRY.k, base + DRY.y);
      drawStrip(scr, strip, camX + OFF, base, false, R.moss[1]);

      list.length = 0;
      for (const th of things) if (th.x > camX - 40 && th.x < camX + VW + 40) list.push(th);
      // The nanny grazes and lifts her head as he comes by; the kid hops now and then; the billy watches.
      const pn = t - poked.nanny, pkid = t - poked.kid, pb = t - poked.billy;
      const near = Math.abs(mx - nanny.x) < 70 || pn < 2.4, spring = pkid < 2.1 ? Math.abs(Math.sin(pkid * Math.PI / 0.7)) : 0, hop = spring > 0.2 || frac(t / 2.7) < 0.12;
      // The conditions board counts a goat or the pika as seen once one is in the view (round 8, F2).
      if ([nanny, kidAt, billy].some(g => g.x - camX > 8 && g.x - camX < VW - 8 && !covered(g.x - camX, base + g.y))) saw('goat');
      list.push({ bm: near ? G.look : G.graze, x: nanny.x, y: nanny.y, flip: pn < 2.4 ? false : near && mx < nanny.x });
      list.push({ bm: hop ? G.hop : G.kid, x: kidAt.x, y: kidAt.y - (spring > 0 ? Math.round(7 * spring) : hop ? 2 : 0), z: kidAt.y, flip: pkid < 2.1 ? (Math.floor(pkid / 0.7) & 1) === 1 : false });
      // The billy bounds 18 along the verge and back over three seconds, hopping as he goes.
      billyOff = pb < 3 ? Math.round(18 * Math.sin(Math.PI * pb / 3)) : 0;
      list.push({ bm: pb < 3 ? G.hop : Math.abs(mx - billy.x) < 160 ? G.look : G.stand, x: billy.x + billyOff, y: billy.y - (pb < 3 ? Math.round(3 * Math.abs(Math.sin(pb * 7))) : 0), z: billy.y, flip: pb < 3 ? pb > 1.5 : mx < billy.x });
      // The pika. At ease it goes about its haystack: a hop over, a pause with a mouthful of flowers, a hop back.
      // As he comes up it calls and bolts, from wherever it is, and comes back to its rock when he is well away.
      { const a = shy.step(t, Math.abs(mx - px - 11)); if (a && px - camX > 8 && px - camX < VW - 8 && !covered(px - camX, base + py)) saw('pika');
        if (shy.called) env.sfx('eep');
        if (a && a.sit) {
          if (!pk0.easy) pk0.t0 = t;
          const u = frac((t - pk0.t0) / 6 + 0.6), h = u < 0.1 ? u / 0.1 : u < 0.5 ? 1 : u < 0.6 ? 1 - (u - 0.5) / 0.1 : 0;
          pk0.sat.x = Math.round(px + h * 22); pk0.sat.y = home.y - Math.round(Math.sin(h * Math.PI) * 6) + Math.round(lerp(0, 2, h));
          list.push({ bm: pk[u >= 0.5 ? 1 : 0], x: pk0.sat.x, y: pk0.sat.y, z: py + 0.5, flip: u > 0.5 && u < 0.62 });
        } else if (a) {
          if (a.back || a.peek) { pk0.sat.x = home.x; pk0.sat.y = home.y; }
          list.push({ bm: a.bm, x: Math.round(lerp(pk0.sat.x, hx, a.go)), y: Math.round(lerp(pk0.sat.y, py, a.go) - 2 * a.hop) - (a.peek ? 1 : 0), z: py + (a.peek ? 1.5 : 0.6), flip: !!a.back });
        }
        pk0.easy = !!(a && a.sit); }
      list.push({ me: true, x: mx, y: my + 0.5 });
      list.sort((a, b) => (a.z || a.y) - (b.z || b.y));
      const gu = gustAt(t, env.sky), ge = gu ? Math.sin(Math.PI * gu[0] / GUST.len) : 0;
      if (gu && gu[1] !== gustHeard) { gustHeard = gu[1]; env.sfx('wind'); }
      for (const th of list) {
        const sx = th.x - camX, sy = base + th.y;
        if (th.me) {
          focus.x = Math.round(sx); focus.y = Math.round(base + my) - 14;
          if (me.low || me.rung >= 0.94) scr.shadow(Math.round(sx), Math.round(base + my), 5, 1);
          if (!me.low && me.rung < 0.94) { scr.put(rungFig[Math.floor(up / RUNG.step) & 1], Math.round(sx) - 4, Math.round(base + my) + 1, false); const k = Math.floor(up / (2 * RUNG.step)); if (env.moving && k > st.rung) env.sfx('tink'); st.rung = k; }
          else scr.put(env.moving ? run.side[Math.floor(d / 4.2) % 6] : run.sideIdle[0], sx, base + my, false);
        } else if (th.tree) {
          for (const part of th.tree.parts) { const [wx, wy] = windAt(th.x + (part.lx || 0), th.y + part.y, tq, part.sway * (1 + 2.5 * ge)); scr.blit(part.bm, sx + part.x + wx, sy + part.y + wy); }
        } else scr.put(th.bm, sx, sy, !!th.flip);
      }
      // The shadow of one of the map's fair-weather clouds, when it crosses the peak there, crosses the benches
      // and the ground here; the peak and the far range stay in the sun.
      { const cs = env.sky ? env.sky.shade('peak') : null; if (cs !== null) shadow(scr, cs, base - 34, VH); }
      if (gu) { if (me.low) dust(scr, gu[0], gu[1], Math.round(base + my)); else needles(scr, gu[0], gu[1], base); }
      last = { camX, base, dir, VW };
      if (dir < 0) { mirror(fb, VW, VH); focus.x = VW - 1 - focus.x; }
    }
  };
}

// The needles of a gust: each leaves from a crown height, streams across with the wind, flutters, and settles
// a little as it goes. u: seconds into the gust; n: which gust, so each one is different.
function needles(scr, u, n, base) {
  const { VW } = scr;
  for (let k = 0; k < 150; k++) {
    const a = u - 1.1 * hash(k, n, 691), sp = 140 + 140 * hash(k, n, 692); if (a < 0) continue;
    const x = Math.round(-8 + a * sp + hash(k, n, 693) * VW * 0.35), y = Math.round(base - 95 + 165 * hash(k, n, 694) + 8 * Math.sin(a * 7 + k) + 16 * a);
    if (x >= VW + 3) continue;
    // A needle is a short streak along the wind, bright at its head; every other one flips as it flutters.
    const tilt = Math.floor(a * 9 + k) & 1 ? 1 : 0;
    scr.set(x, y, R.larch[4]); scr.set(x - 1, y - tilt, R.larch[3]); if (k % 3 === 0) scr.set(x - 2, y - tilt, R.larch[2]);
  }
}

// The burn's gust: ash and dry dust lifted off the ground in a low, pale billow that rolls across with the
// wind, lobed along its top, thick at its head and thinning out behind (after the pictures of R8-E1).
function dust(scr, u, n, base) {
  const { VW, VH, fb } = scr, tail = 170, head = -30 + (VW + tail + 60) * u / 2.6;
  for (let x = Math.max(0, Math.round(head - tail)); x < Math.min(VW, Math.round(head)); x++) {
    // Rounded at its head, a row of puffs along its top, each smaller than the one before it.
    const back = (head - x) / tail, lobe = Math.sqrt(Math.abs(Math.sin((head - x) / 11 + n))), nose = Math.min(1, (head - x) / 10), mid = base + 2 + Math.round(2 * Math.sin(x / 47 + n));
    const up = Math.round((2 + 13 * lobe) * (1 - 0.7 * back) * Math.sqrt(nose));
    for (let y = Math.max(0, mid - up); y < Math.min(VH, mid + 3); y++) {
      // Whole inside each puff near the head, breaking up through a dither towards the tail; lit along the top.
      const r = y - mid + up, thick = (y < mid ? 1.5 : 1 - (y - mid) / 3) * (1.25 - 1.5 * back);
      if (bayer(x, y) < thick) fb[y * VW + x] = r < 2 ? R.white[0] : r < 5 || hash(x >> 1, y, 700) > 0.22 ? R.dry[3] : R.ash[3];
    }
  }
}

// Going the other way, the whole picture flips (he then faces left, and the light comes from the east).
function mirror(fb, VW, VH) {
  for (let y = 0; y < VH; y++) { let a = y * VW, b = a + VW - 1; while (a < b) { const c = fb[a]; fb[a++] = fb[b]; fb[b--] = c; } }
}
