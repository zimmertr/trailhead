// The larch basin (section G): off the map on the way to Proficiency Peak, side-on. He walks in to the
// climb up granite benches in their autumn gold, the Enchantments' spires and a blue glacier far
// behind, and the peak itself growing ahead of him. He goes the way the map's trail was going when
// it handed him over (arg.dir), so the whole picture is drawn left to right and mirrored when needed.
import { clamp, lerp, smooth, frac, hash, vnoise, fbm, bayer, rng, R, DAY, INK, pick, BM, outline, windAt } from './core.js';
import { Strip, drawStrip, baseline, shell, blitScaled, paintPeaks } from './side.js';
import { makeConifer, makeBoulder, makeCloud, makeHuckleberry, huckClumps } from './sprites.js';
import { makeRunner, sideFig } from './tj.js';
import { goat, pika, shyPika } from './fauna.js';
import { NAMES } from './content.js';
import { PROFICIENCY } from './land.js';

// SW: the near strip's width; he walks LEN of it, from X0, in WALK seconds.
const SW = 1500, X0 = 320, LEN = 700, WALK = 9;
// The iron rungs (round 5, T64, after the rungs above Snow Lake on the way into the Enchantments): the scene
// opens with him on a granite slab that stands `rise` high over `run`, its top where the walk begins. He
// climbs it in `secs`, a rung every `step` of height.
const RUNG = { top: X0, run: 24, rise: 52, secs: 3, step: 5 };
const DUR = RUNG.secs + WALK;
// The trail climbs the slabs in steps: a short rise every 110 or so, flat between. `bench` is that ground
// alone, and `g` is the ground with the slab below its first bench.
const bench = x => { const u = (x - X0) / 112 + 0.3 * vnoise(x / 60, 1, 600); return -Math.round(4 * (Math.floor(u) + smooth(0.72, 1, frac(u))) + 1.5 * Math.sin(x / 23)); };
const g = x => bench(x) + Math.round(RUNG.rise * clamp((RUNG.top - x) / RUNG.run, 0, 1));
const onSlab = x => x >= RUNG.top - RUNG.run && x < RUNG.top;
// Where he is at each moment: up the rungs first (`rung` is how far up them, 0 to 1), then along the trail.
const at = q => { const tau = q * DUR; if (tau < RUNG.secs) { const u = tau / RUNG.secs; return { x: RUNG.top - RUNG.run * (1 - u), y: bench(RUNG.top) + RUNG.rise * (1 - u), rung: u }; } const x = X0 + (tau - RUNG.secs) / WALK * LEN; return { x, y: g(x), rung: 1 }; };
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
      let c = pick('glac', 0.95 - 0.35 * d + 0.1 * (vnoise(x / 4, y / 3, 615) - 0.5), x, y);
      if (frac((y - surf) / 6 + 0.3 * Math.sin(x / 9)) < 0.14 && d > 0.2) c = R.glac[2];
      if (toe - y < 3) c = R.glac[toe - y < 1 ? 0 : 1];
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
      const crack = vnoise(i / 2.2, y / 26, 902), streak = vnoise(i / 5, y / 40, 903);
      let v = 0.56 + (lit ? 0.2 : -0.16) + (streak > 0.62 ? -0.2 : 0) + (crack > 0.74 ? -0.3 : 0) + 0.1 * (hash(i, y, 904) - 0.5) - 0.12 * smooth(PKH - 30, PKH, y);
      if (y - (PKH - h) < 2 && lit) v = 1;
      b.set(i, y, v > 0.9 ? R.gold[6] : pick('rock', v / 0.9, i, y));
    }
  }
  outline(b, INK);
  return b;
}

// The basin's middle distance: rounded granite benches stepping up, crowded with larches, a tarn on one of
// them with the bench behind upside down in it, its outlet falling down the face below, scree at the feet.
const level = x => Math.floor(x / 210 + 0.6 * vnoise(x / 120, 4, 620)) % 3;
const benchTop = x => { let t = 0; for (let k = -6; k <= 6; k++) t += level(x + k * 3); return Math.round(-8 - 11 * t / 13 - 2 * vnoise(x / 18, 5, 621)); };
const TX0 = 430, TX1 = 530;
function miniLarch(S, x, y, h) {
  for (let j = 0; j < h; j++) { const w = Math.round((j / h) * h * 0.3 + (j % 3 === 2 ? 1 : 0)); for (let i = -w; i <= w; i++) S.set(x + i, y - h + j, R.larch[clamp(Math.round(2.4 + (i < 0 ? 0.9 : -0.6) + (hash(x + i, j, 622) - 0.5) * 1.6 - (j % 3 === 0 ? 0.8 : 0)), 0, 4)]); }
  S.set(x, y, R.bark[1]); S.set(x, y - 1, R.bark[1]);
}
function paintMid(S, rand) {
  for (let x = 0; x < S.w; x++) {
    const top = benchTop(x), sl = benchTop(x + 2) - benchTop(x - 2);
    for (let y = top; y < 30; y++) {
      const dy = y - top, joint = vnoise(x / 3, y / 30, 623) > 0.78, sheet = frac(dy / 11 + 0.6 * vnoise(x / 40, y / 40, 628)) < 0.07;
      // A slab's top catches the sun, its face below is in shade, joints run down it.
      const face = smooth(3, 9, dy), lip = dy >= 3 && dy < 5;
      let c = lip ? R.rock[1] : pick('rock', 0.88 - 0.42 * face + (sl < -1 ? 0.08 : sl > 1 ? -0.1 : 0) + 0.16 * (fbm(x / 14, y / 22, 625, 3) - 0.5) - (joint && face > 0.5 ? 0.22 : 0) - (sheet ? 0.1 : 0), x, y, 0.6);
      if (dy < 3) c = fbm(x / 7, y / 3, 626, 2) > 0.45 ? pick(hash(x, y, 629) < 0.6 ? 'grass' : 'larch', 0.4 + 0.3 * hash(x, y, 627), x, y) : R.rock[4];
      if (dy > 22 && fbm(x / 9, y / 4, 630, 2) > 0.45) c = pick('rock', 0.5 + 0.3 * hash(x, y, 631), x, y);
      S.set(x, y, c);
    }
  }
  for (let n = 0; n < 420; n++) { const x = Math.round(rand() * S.w); if ((x > TX0 - 8 && x < TX1 + 8) || fbm(x / 60, 1, 632, 2) < 0.4) continue; miniLarch(S, x, benchTop(x) + 2, 6 + Math.round(rand() * rand() * 14)); }
  // The tarn: still water reflecting the bench behind it.
  const surf = benchTop(TX0) + 2;
  for (let x = TX0; x <= TX1; x++) {
    const edge = Math.min(x - TX0, TX1 - x);
    for (let j = 0; j < 8; j++) {
      if (j > edge * 0.7 + 1) continue;
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
function paintMain(S, near) {
  for (let x = 0; x < S.w; x++) {
    const gy = g(x), step = g(x + 1) < gy && !onSlab(x);
    // Left of the rungs the lower ground has the cliff they climb standing behind it, as high as the first
    // bench: jointed granite, darker than the slab, in shade at its foot, with turf along its top.
    if (x < RUNG.top) for (let y = bench(x) - 14; y < gy - 14; y++) {
      const dy = y - (bench(x) - 14), foot = gy - 14 - y, joint = vnoise(x / 3, y / 40, 642) > 0.78, sheet = frac(y / 13 + 0.5 * vnoise(x / 40, y / 40, 643)) < 0.08;
      let c = joint || sheet ? R.rock[1] : pick('rock', 0.8 - 0.2 * smooth(4, 40, dy) + 0.14 * (fbm(x / 16, y / 26, 644, 3) - 0.5) - (foot < 3 ? 0.2 : 0), x, y, 0.25);
      // Turf on its top, hanging over the edge in places.
      if (dy < 3 + 2 * vnoise(x / 5, 9, 645)) c = pick('grass', 0.45 + 0.3 * hash(x, y, 646), x, y, 0.4);
      S.set(x, y, c);
    }
    for (let y = gy - 14; y < S.h - S.up; y++) {
      const r = y - gy, slab = slabAt(x, r) || (x >= RUNG.top - RUNG.run - 14 && x <= RUNG.top + 10 + 12 * vnoise(y / 5, 5, 602) && r < 30 + 16 * vnoise(x / 9, 3, 601)), n = hash(x, y, 638);
      let c;
      if (slab) c = frac(x / 41 + y / 13 + vnoise(x / 30, y / 30, 634)) < 0.03 ? R.rock[1] : pick('rock', 0.74 + 0.16 * (fbm(x / 20, y / 9, 635, 3) - 0.5) + (n < 0.04 ? -0.25 : 0), x, y, 0.6);
      else if (r >= -2 && r <= 3) c = n < 0.08 ? R.rock[2] : pick('dirt', 0.6 - Math.abs(r - 0.5) * 0.06 + 0.25 * (vnoise(x / 5, y / 2, 633) - 0.5), x, y, 0.7);
      else {
        c = pick(fbm(x / 24, y / 9, 637, 2) > 0.52 ? 'moss' : 'grass', 0.52 + 0.3 * (fbm(x / 22, y / 12, 648, 3) - 0.5) + 0.12 * (hash(x >> 1, y >> 1, 649) - 0.5) - smooth(40, 200, r) * 0.25, x, y, 0.35);
        if (n < 0.1 * near(x, r)) c = R.larch[n < 0.04 * near(x, r) ? 3 : 2];
      }
      if (slab && r >= -2 && r <= 3) c = pick('rock', 0.86, x, y, 0.5);
      if (r < -2 && y - (gy - 14) < 1 && x >= RUNG.top) c = R.moss[1];
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
    things.push({ tree: makeConifer(650 + things.length, H, Math.round(a[1] * s), 'larch', Math.max(4, Math.round(H / 3.2)), { ragged: a[0] > 40 && rand() < 0.5 ? 0.5 : 0.15, droop: 0.6 }), x: Math.round(x), y: g(x) + y });
  }
  // Nothing stands on the slab with the rungs, or in front of it.
  const offSlab = th => !(th.x > RUNG.top - RUNG.run - 22 && th.x < RUNG.top + 18 && th.y - g(th.x) < 76);
  for (let i = things.length - 1; i >= 0; i--) if (!offSlab(things[i])) things.splice(i, 1);
  const trees = things.map(th => [th.x, th.y - g(th.x), th.tree.w]);
  // The near ground's strip reaches as high as the ground does. It used to stop 20 rows above the start's
  // level, and the benches climb twice that by the end, so the last of the trail, with its cairns, rocks and
  // larches, stood in the air above a ground that had been cut off (round 5, T67).
  let high = 0; for (let x = 0; x < SW; x++) high = Math.max(high, 16 - Math.min(g(x), bench(x)));
  const main = new Strip(SW, high, 600); paintMain(main, (x, r) => { let a = 0; for (const [tx, ty, tw] of trees) { const d = Math.abs(x - tx) / (tw + 6) + Math.abs(r - ty) / 14; if (d < 1) a = Math.max(a, 1 - d); } return a; });
  for (let n = 0; n < 26; n++) { const x = Math.round(rand() * SW), y = (rand() < 0.5 ? -6 : 10 + rand() * 90) | 0; things.push({ bm: makeBoulder(660 + n, 3 + rand() * 6), x, y: g(x) + y }); }
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
  // Red huckleberry (round 5, T65): shrubs in clumps on the heather, where the ground used to be painted
  // red, off the slabs and the trail. Those lower on the screen are nearer and bigger.
  const hucks = [0, 1, 2, 3, 4, 5].map(i => [0.8, 1.05, 1.35, 1.7].map(s => makeHuckleberry(680 + i, s)));
  // The ones far down the slope, which only a tall screen shows, are painted into the ground: nothing they
  // could stand in front of is that low.
  for (const p of huckClumps(0, SW, -12, 590, (x, r) => huckAt(x, g(x) + r), (x, r) => !(r >= -5 && r <= 7) && !(x < RUNG.top + 4 && r < 0) && !slabAt(x, r) && !slabAt(x - 5, r) && !slabAt(x + 5, r), 681)) {
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
  // A gust now and then (G6): one in each 14 seconds, at a random point in its first 6, lasting 2.6. Needles
  // stream off the larches across the whole view and the trees bend harder. gustGo: a start button's gust.
  const GUST = { slot: 14, len: 2.6 };
  let gustGo = -1e9, gustHeard = -1;
  const gustAt = t => { const n = Math.floor(t / GUST.slot), u = t - n * GUST.slot - 6 * hash(n, 1, 690); return u >= 0 && u < GUST.len ? [u, n] : t - gustGo < GUST.len ? [t - gustGo, -2 - Math.floor(gustGo)] : null; };
  let cam = 0, last = { camX: 0, base: 0, dir: 1, VW: 0 };
  const list = [];
  const xOf = q => at(q).x;
  // On the rungs, side-on and facing the rock: hands and feet move up them in turn.
  const rungFig = [0, 1].map(f => sideFig('wall', { feet: f ? [[4, 3], [3, 8]] : [[3, 8], [4, 3]], hands: f ? [[5, -10], [5, -4]] : [[5, -4], [5, -10]], lean: 3, look: 'up' }));

  return {
    ...META,
    enter(scr, arg, q) { cam = xOf(q); st.y = null; st.rung = -1; shy.reset(); pk0.easy = true; },
    focus: () => focus,
    act(id, env) { if (id === 'pika') { if (shy.startle(env.t)) env.sfx('eep'); env.found('pika'); return true; } return false; },
    trigger(name, t) { if (name === 'gust') { gustGo = t; return true; } return false; },
    pick(sx, sy) {
      if (last.dir < 0) sx = last.VW - 1 - sx;
      const wx = sx + last.camX, wy = sy - last.base, near = (p, w, h) => Math.abs(wx - p.x) < w && wy > p.y - h && wy < p.y + 2;
      const mx = v => last.dir < 0 ? last.VW - 1 - (v - last.camX) : v - last.camX;
      if (near(nanny, 14, 20) || near(kidAt, 10, 15)) return { label: NAMES.larches.goats, x: mx(nanny.x - 10), y: last.base + nanny.y - 24 };
      if (near(billy, 13, 22)) return { label: NAMES.larches.billy, x: mx(billy.x), y: last.base + billy.y - 26 };
      if (wx > px - 12 && wx < px + 32 && wy > py - 18 && wy < py + 2) return { label: NAMES.larches.pika, x: mx(px + 11), y: last.base + py - 20, act: 'pika' };
      return null;
    },
    draw(scr, env, arg, q) {
      const { VW, VH, fb } = scr, { t, tq } = env, dir = arg.dir < 0 ? -1 : 1;
      const me = at(q), mx = me.x, d = Math.max(0, mx - X0), my = me.y, up = RUNG.rise * me.rung;
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
      drawStrip(scr, main, camX, base, false, R.moss[1]);

      list.length = 0;
      for (const th of things) if (th.x > camX - 40 && th.x < camX + VW + 40) list.push(th);
      // The nanny grazes and lifts her head as he comes by; the kid hops now and then; the billy watches.
      const near = Math.abs(mx - nanny.x) < 70, hop = frac(t / 2.7) < 0.12;
      list.push({ bm: near ? G.look : G.graze, x: nanny.x, y: nanny.y, flip: near && mx < nanny.x });
      list.push({ bm: hop ? G.hop : G.kid, x: kidAt.x, y: kidAt.y - (hop ? 2 : 0), z: kidAt.y, flip: false });
      list.push({ bm: Math.abs(mx - billy.x) < 160 ? G.look : G.stand, x: billy.x, y: billy.y, flip: mx < billy.x });
      // The pika. At ease it goes about its haystack: a hop over, a pause with a mouthful of flowers, a hop back.
      // As he comes up it calls and bolts, from wherever it is, and comes back to its rock when he is well away.
      { const a = shy.step(t, Math.abs(mx - px - 11));
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
      const gu = gustAt(t), ge = gu ? Math.sin(Math.PI * gu[0] / GUST.len) : 0;
      if (gu && gu[1] !== gustHeard) { gustHeard = gu[1]; env.sfx('wind'); }
      for (const th of list) {
        const sx = th.x - camX, sy = base + th.y;
        if (th.me) {
          focus.x = Math.round(sx); focus.y = Math.round(base + my) - 14;
          if (me.rung >= 0.94) scr.shadow(Math.round(sx), Math.round(base + my), 5, 1);
          if (me.rung < 0.94) { scr.put(rungFig[Math.floor(up / RUNG.step) & 1], Math.round(sx) - 4, Math.round(base + my) + 1, false); const k = Math.floor(up / (2 * RUNG.step)); if (env.moving && k > st.rung) env.sfx('tink'); st.rung = k; }
          else scr.put(env.moving ? run.side[Math.floor(d / 4.2) % 6] : run.sideIdle[0], sx, base + my, false);
        } else if (th.tree) {
          for (const part of th.tree.parts) { const [wx, wy] = windAt(th.x + (part.lx || 0), th.y + part.y, tq, part.sway * (1 + 2.5 * ge)); scr.blit(part.bm, sx + part.x + wx, sy + part.y + wy); }
        } else scr.put(th.bm, sx, sy, !!th.flip);
      }
      if (gu) needles(scr, gu[0], gu[1], base);
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

// Going the other way, the whole picture flips (he then faces left, and the light comes from the east).
function mirror(fb, VW, VH) {
  for (let y = 0; y < VH; y++) { let a = y * VW, b = a + VW - 1; while (a < b) { const c = fb[a]; fb[a++] = fb[b]; fb[b--] = c; } }
}
