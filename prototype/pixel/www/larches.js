// The larch basin (section G): off the map on the way to Proficiency Peak, side-on. He walks in to the
// climb up granite benches in their autumn gold, the Enchantments' spires and a blue glacier far
// behind, and the peak itself growing ahead of him. He goes the way the map's trail was going when
// it handed him over (arg.dir), so the whole picture is drawn left to right and mirrored when needed.
import { clamp, lerp, smooth, frac, hash, vnoise, fbm, bayer, rng, R, DAY, INK, LIGHT, pick, BM, outline, windAt } from './core.js';
import { Strip, drawStrip, baseline, shell, blitScaled } from './side.js';
import { makeConifer, makeBoulder, makeCloud } from './sprites.js';
import { makeRunner } from './tj.js';
import { goat, pika } from './fauna.js';
import { NAMES } from './content.js';
import { PROFICIENCY } from './land.js';

// SW: the near strip's width; he walks LEN of it, from X0, in DUR seconds.
const SW = 1500, X0 = 320, LEN = 700, DUR = 9;
// The trail climbs the slabs in steps: a short rise every 110 or so, flat between.
const g = x => { const u = (x - X0) / 112 + 0.3 * vnoise(x / 60, 1, 600); return -Math.round(4 * (Math.floor(u) + smooth(0.72, 1, frac(u))) + 1.5 * Math.sin(x / 23)); };
// How far back each layer sits: the share of his movement it follows.
const P_FAR = 0.05, P_PEAK = 0.12, P_MID = 0.42;

const META = {
  name: 'larches',
  dur: () => DUR,
  stops: () => [],
  elev: (arg, q) => -g(X0 + q * LEN) * 1.5
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
  let own = null;
  const SP = spires(S.w, rand), topAt = x => { let t = 4; own = null; for (const p of SP) { const a = 1 - Math.abs(x - p.cx) / p.hw; if (a > 0) { const h = -18 - p.h * Math.pow(a, p.p) - 5 * (vnoise(x / 4, p.cx, 618) - 0.5) * a; if (h < t) { t = h; own = p; } } } return t; };
  for (let x = 0; x < S.w; x++) {
    const top = Math.round(topAt(x)), p = own; if (!p) continue;
    for (let y = top; y < S.h - S.up; y++) {
      // The ridge wanders down from the summit; gullies run down both faces.
      const ridge = p.cx + 6 * (vnoise(y / 14, p.cx, 620) - 0.5) * (y - top) / 20, lit = x < ridge, gully = frac((x - ridge) / (lit ? 9 : 7) + 0.4 * vnoise(x / 6, y / 18, 621)) < 0.18 && y - top > 4;
      const crack = vnoise(x / 2.5, y / 20, 619) > 0.74;
      let c = pick('far', (lit ? 0.7 : 0.3) + 0.1 * (fbm(x / 7, y / 14, 612, 3) - 0.5) - (gully ? 0.16 : 0) - (crack ? 0.1 : 0) - smooth(-30, 4, y) * 0.12, x, y);
      if (gully && y < -46 && y - top > 3 && hash(x, y, 622) < 0.85) c = R.farsnow[lit ? 1 : 0];
      if (y - top < 2 && top < -100) c = R.farsnow[lit ? 1 : 0];
      S.set(x, y, c);
    }
  }
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
// where it crosses bare slab), red huckleberry in autumn, and larch needles sprinkled gold under the trees.
// Where bare granite breaks through the near ground (r: rows below the trail).
const slabAt = (x, r) => fbm(x / 34, (g(x) + r) / 12, 630, 3) > 0.66 - 0.08 * smooth(10, -4, r);
function paintMain(S, near) {
  for (let x = 0; x < S.w; x++) {
    const gy = g(x), step = g(x + 1) < gy;
    for (let y = gy - 14; y < S.h - S.up; y++) {
      const r = y - gy, slab = slabAt(x, r), n = hash(x, y, 638);
      let c;
      if (slab) c = frac(x / 41 + y / 13 + vnoise(x / 30, y / 30, 634)) < 0.03 ? R.rock[1] : pick('rock', 0.74 + 0.16 * (fbm(x / 20, y / 9, 635, 3) - 0.5) + (n < 0.04 ? -0.25 : 0), x, y, 0.6);
      else if (r >= -2 && r <= 3) c = n < 0.08 ? R.rock[2] : pick('dirt', 0.6 - Math.abs(r - 0.5) * 0.06 + 0.25 * (vnoise(x / 5, y / 2, 633) - 0.5), x, y, 0.7);
      else {
        const bf = fbm(x / 9, y / 4, 639, 3), berry = bf > 0.72;
        c = berry ? R.red[bf > 0.8 && n < 0.5 ? 1 : 0] : pick(fbm(x / 24, y / 9, 637, 2) > 0.52 ? 'moss' : 'grass', 0.52 + 0.3 * (fbm(x / 22, y / 12, 648, 3) - 0.5) + 0.12 * (hash(x >> 1, y >> 1, 649) - 0.5) - smooth(40, 200, r) * 0.25, x, y, 0.35);
        if (n < 0.1 * near(x, r)) c = R.larch[n < 0.04 * near(x, r) ? 3 : 2];
      }
      if (slab && r >= -2 && r <= 3) c = pick('rock', 0.86, x, y, 0.5);
      if (r < -2 && y - (gy - 14) < 1) c = R.moss[1];
      if (step && r >= 0 && r < 3) c = R.rock[1];
      S.set(x, y, c);
    }
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
  const trees = things.map(th => [th.x, th.y - g(th.x), th.tree.w]);
  const main = new Strip(SW, 20, 600); paintMain(main, (x, r) => { let a = 0; for (const [tx, ty, tw] of trees) { const d = Math.abs(x - tx) / (tw + 6) + Math.abs(r - ty) / 14; if (d < 1) a = Math.max(a, 1 - d); } return a; });
  for (let n = 0; n < 26; n++) { const x = Math.round(rand() * SW), y = (rand() < 0.5 ? -6 : 10 + rand() * 90) | 0; things.push({ bm: makeBoulder(660 + n, 3 + rand() * 6), x, y: g(x) + y }); }
  for (let x = X0 - 60; x < SW; x += 1) if (g(x + 1) < g(x) && g(x) >= g(x - 3)) { things.push({ bm: makeCairn(670 + x), x: x + 6, y: g(x) - 3 }); x += 60; }
  // Goats (G5). A nanny and her kid (behind her, facing her) on the first broad slab below the trail past the scene's first third;
  // a billy on the verge above it past two thirds, who turns to watch him go by.
  const G = { stand: goat('stand'), look: goat('look'), graze: goat('graze'), kid: goat('stand', true), hop: goat('stand', true, 1) };
  let nanny = null;
  for (let x = X0 + LEN * 0.33; x < X0 + LEN * 0.8 && !nanny; x += 4) for (let r = 16; r < 44 && !nanny; r += 2) { let ok = true; for (let k = -24; k <= 18 && ok; k += 4) for (const d of [-3, 0, 4, 8]) ok = ok && slabAt(x + k, r + d); if (ok) nanny = { x: Math.round(x), y: g(x) + r }; }
  if (!nanny) nanny = { x: X0 + LEN * 0.45, y: g(X0 + LEN * 0.45) + 24 };
  const kidAt = { x: nanny.x - 21, y: nanny.y + 3 }, billy = { x: Math.round(X0 + LEN * 0.7), y: g(X0 + LEN * 0.7) - 7 };
  // The pika (G7, moved here from The Stack's talus): two rocks on the verge above the trail, on the first stretch
  // past halfway with no larch within 30, and the pika shuttling between them with flowers for its haystack.
  let px = X0 + LEN * 0.55;
  for (let x = X0 + LEN * 0.5; x < X0 + LEN * 0.9; x += 6) if (!things.some(th => th.tree && Math.abs(th.x - x - 11) < 30 && th.y < g(th.x) + 4) && Math.abs(x - billy.x) > 40) { px = Math.round(x); break; }
  const rockA = makeBoulder(190, 7), rockB = makeBoulder(191, 5), pk = [pika(0), pika(1)], py = g(px) - 6;
  // Larches and boulders keep clear of the goats and the pika's rocks.
  for (let i = things.length - 1; i >= 0; i--) { const th = things[i]; if ([nanny, kidAt, billy, { x: px + 11, y: py }].some(p => Math.abs(th.x - p.x) < 22 && Math.abs(th.y - p.y) < 14)) things.splice(i, 1); }
  things.push({ bm: rockA, x: px, y: py }, { bm: rockB, x: px + 22, y: py - 2 });
  let eep = -9;
  // A gust now and then (G6): one in each 14 seconds, at a random point in its first 6, lasting 2.6. Needles
  // stream off the larches across the whole view and the trees bend harder. gustGo: a start button's gust.
  const GUST = { slot: 14, len: 2.6 };
  let gustGo = -1e9, gustHeard = -1;
  const gustAt = t => { const n = Math.floor(t / GUST.slot), u = t - n * GUST.slot - 6 * hash(n, 1, 690); return u >= 0 && u < GUST.len ? [u, n] : t - gustGo < GUST.len ? [t - gustGo, -2 - Math.floor(gustGo)] : null; };
  let cam = 0, last = { camX: 0, base: 0, dir: 1, VW: 0 };
  const list = [];
  const xOf = q => X0 + q * LEN;

  return {
    ...META,
    enter(scr, arg, q) { cam = xOf(q); st.y = null; },
    focus: () => focus,
    act(id, env) { if (id === 'pika') { env.sfx('eep'); eep = env.t; env.found('pika'); return true; } return false; },
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
      const mx = xOf(q), d = q * LEN, my = g(mx);
      cam += (mx - cam) * (env.calm ? 1 : Math.min(1, env.dt * 8));
      const camX = Math.round(cam - VW * (scr.narrow ? 0.5 : 0.4) + env.look.x * 0.5 * dir), base = baseline(scr, env.shown, st), hor = base - 64;

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
      // The pika, as on the wall: a hop over, a pause with a mouthful of flowers, a hop back; it sits up when clicked.
      { const u = frac(t / 6), h = u < 0.1 ? u / 0.1 : u < 0.5 ? 1 : u < 0.6 ? 1 - (u - 0.5) / 0.1 : 0, up = t - eep < 0.5;
        list.push({ bm: pk[u >= 0.5 ? 1 : 0], x: Math.round(px + h * 22), y: py - rockA.h + 4 - Math.round(Math.sin(h * Math.PI) * 6) + Math.round(lerp(0, 2, h)) - (up ? 2 : 0), z: py + 0.5, flip: u > 0.5 && u < 0.62 }); }
      list.push({ me: true, x: mx, y: my + 0.5 });
      list.sort((a, b) => (a.z || a.y) - (b.z || b.y));
      const gu = gustAt(t), ge = gu ? Math.sin(Math.PI * gu[0] / GUST.len) : 0;
      if (gu && gu[1] !== gustHeard) { gustHeard = gu[1]; env.sfx('wind'); }
      for (const th of list) {
        const sx = th.x - camX, sy = base + th.y;
        if (th.me) {
          focus.x = Math.round(sx); focus.y = Math.round(base + my) - 14;
          scr.shadow(Math.round(sx), Math.round(base + my), 5, 1);
          scr.put(env.moving ? run.side[Math.floor(d / 4.2) % 6] : run.sideIdle[0], sx, base + my, false);
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
