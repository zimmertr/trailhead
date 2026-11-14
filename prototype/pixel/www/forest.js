// About Lake, part one: the run through the rainforest, seen from the side. Giant mossy trunks
// stand on the bank behind the trail, a dark stream mirrors them in front of it, and the light
// comes down through the canopy in slanting shafts. He runs right to left, the way he left the map.
import { TAU, clamp, lerp, smooth, frac, sq, rng, hash, vnoise, fbm, bayer, R, DAY, INK, SHADE, LIGHT, pick, BM, outline, disc, thick, windAt } from './core.js';
import { Strip, drawStrip, blitTall, baseline } from './side.js';
import { makeMaple, makeSpruce, makeBoulder } from './sprites.js';
import { elk, bear, sasquatch, jay, slug } from './fauna.js';
import { makeRunner, sideFig } from './tj.js';

const SW = 1640, UP = 480, DOWN = 240;
const X0 = SW - 500, LEN = 640, DUR = 8.2;
const D_SIGN = 300, D_SLUG = 372, D_ELK = 452, D_BEAR = 524, D_JAY = 132;
let sasquatchSeen = false;

// The line he runs along rolls a little.
const g = x => Math.round(5 * Math.sin(x / 97) + 3 * Math.sin(x / 41 + 2));
const farBank = x => 17 + Math.round(2.5 * Math.sin(x / 23) + 2 * vnoise(x / 9, 1, 81));
const nearBank = x => 60 + Math.round(5 * Math.sin(x / 31 + 1) + 4 * vnoise(x / 13, 2, 82));
// Shafts of light slant down from the upper left and land on the ground in bands.
const beamAt = c => { const k = Math.floor(c / 118), o = hash(k, 3, 83) * 60, w = 12 + hash(k, 4, 83) * 22, d = Math.abs(c - k * 118 - 30 - o); return hash(k, 5, 83) < 0.2 ? 0 : d < w * 0.5 ? 2 : d < w ? 1 : 0; };

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
      const v = 0.58 - 0.4 * u - 0.2 * u * u + 0.36 * (ridge - 0.5);
      const m = fbm(x / 12 + seed, y / 22, 31, 3) + 0.34 * Math.exp(-up / 40) - 0.16 * u;
      if (m > 0.6) b.set(x, y, pick('moss', v * 0.75 + 0.14 + (m > 0.7 ? 0.12 : 0) + 0.12 * (hash(x, y, 9) - 0.5), x, y, 0.8));
      else b.set(x, y, pick(cedar ? 'wood' : 'bark', v * (cedar ? 0.8 : 1) + (m > 0.56 ? -0.22 : 0), x, y, 0.8));
    }
  }
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

export function makeForest() {
  const rand = rng(31);

  // Far and middle trees: paler and plainer the further off they stand.
  const far = new Strip(SW, UP, 24), mid = new Strip(SW, UP, 30);
  for (let x = 4; x < SW; x += 13 + rand() * 24) {
    const w = 3 + (rand() * 6 | 0), lean = (rand() - 0.5) * 0.03;
    for (let y = -UP; y < 4; y++) for (let dx = 0; dx < w; dx++) far.set(x + dx + lean * -y, y, dx === 0 ? R.mist[5] : dx === w - 1 ? R.mist[3] : R.mist[4]);
  }
  for (let x = 0; x < SW; x++) {
    const top = -9 - 7 * fbm(x / 21, 2, 84, 3) - (hash(x, 1, 85) < 0.3 ? 2 : 0);
    for (let y = Math.round(top); y < 24; y++) far.set(x, y, y - top < 2 ? R.mist[4] : R.mist[3]);
    for (let y = -UP; y < -250 - 70 * fbm(x / 40, 1, 86, 3); y++) if (fbm(x / 14, y / 12, 87, 3) > 0.42) far.set(x, y, R.mist[3]);
  }
  for (let x = 20; x < SW; x += 46 + rand() * 60) {
    const w = 9 + (rand() * 11 | 0), lean = (rand() - 0.5) * 0.04;
    for (let y = -UP; y < 6; y++) {
      const fl = w * 0.4 * Math.exp(-(6 - y) / (w * 0.6));
      for (let dx = -fl; dx < w + fl; dx++) { const u = dx / w; mid.set(x + dx + lean * -y, y, u < 0.14 ? R.mist[3] : u > 0.8 ? R.mist[0] : vnoise(dx / 2, y / 22, x) > 0.62 ? R.mist[2] : R.mist[1]); }
    }
    for (let k = 0; k < 3; k++) {
      const by = -70 - rand() * 300, dir = rand() < 0.5 ? -1 : 1, len = 14 + rand() * 30;
      for (let i = 0; i < len; i++) { const yy = by - Math.sin(i / len * 2) * 6 + i * i / len * 0.2; mid.set(x + (dir > 0 ? w : 0) + dir * i, yy, R.mist[2]); mid.set(x + (dir > 0 ? w : 0) + dir * i, yy + 1, R.mist[1]); if (hash(i, k, x) < 0.3) for (let j = 2; j < 4 + hash(i, x, 2) * 9; j++) mid.set(x + (dir > 0 ? w : 0) + dir * i, yy + j, R.mist[2]); }
    }
  }
  for (let x = 0; x < SW; x++) {
    const top = -15 - 12 * fbm(x / 17, 4, 88, 3) - 5 * Math.max(0, Math.sin(x / 6.5) * vnoise(x / 30, 3, 89));
    for (let y = Math.round(top); y < 30; y++) mid.set(x, y, y - top < 1.5 ? R.mist[3] : y - top < 5 ? R.mist[2] : R.mist[1]);
    for (let y = -UP; y < -200 - 110 * fbm(x / 50, 5, 90, 3); y++) if (fbm(x / 16, y / 13, 91, 3) > 0.46) mid.set(x, y, fbm(x / 16, (y - 3) / 13, 91, 3) > 0.46 ? R.mist[1] : R.mist[2]);
  }

  // The ground: back bank, trail, verge, the far bank of the stream, and the near bank in front.
  const main = new Strip(SW, 60, DOWN), water = new Strip(SW, 0, 90);
  for (let x = 0; x < SW; x++) {
    const gy = g(x), bt = gy - 34 - 9 * fbm(x / 26, 6, 92, 3), fb = gy + farBank(x), nb = gy + nearBank(x);
    for (let y = Math.round(bt); y < DOWN; y++) {
      const r = y - gy; let c;
      const lit = beamAt(x - 0.6 * r + 9 * (vnoise(x / 6, y / 3, 105) - 0.5)) * 0.09;
      if (r < -5) c = pick('moss', 0.1 + 0.3 * smooth(-40, -5, r) + lit * smooth(-30, -5, r) + 0.24 * (fbm(x / 9, y / 5, 93, 3) - 0.5) + (y - bt < 2 ? 0.25 : 0), x, y, 0.8);
      else if (r <= 4) {
        const e = Math.abs(r + 0.5) / 5;
        c = hash(x, y, 94) < 0.05 ? R.rock[2] : pick('dirt', 0.5 - e * 0.3 + lit * 1.6 + 0.22 * (vnoise(x / 5, y / 2, 95) - 0.5), x, y, 0.7);
        if (r === -5 || r === 4) c = hash(x, 7, 96) < 0.4 ? R.moss[3] : R.dirt[0];
      } else if (r < farBank(x) - 3) c = pick('moss', 0.42 + lit * 1.1 + 0.26 * (fbm(x / 7, y / 4, 97, 3) - 0.5) - (r - 5) * 0.012, x, y, 0.8);
      else if (y < fb) c = hash(x, y, 98) < 0.4 ? R.bark[0] : R.moss[1];
      else if (y < nb) continue;
      else c = y - nb < 2 ? R.moss[hash(x, 9, 99) < 0.5 ? 4 : 3] : pick('moss', 0.14 + 0.2 * (fbm(x / 11, y / 6, 100, 3) - 0.5) + 0.1 * smooth(30, 0, y - nb), x, y, 0.8);
      main.set(x, y, c);
    }
  }
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
  const reserve = [[X0 - D_SIGN - 34, X0 - D_SIGN + 10], [X0 - D_ELK - 34, X0 - D_ELK + 34]];
  let bearTrunk = null;
  for (let x = 40; x < SW - 30; x += 78 + rand() * 62) {
    let tx = x; if (!bearTrunk && Math.abs(x - (X0 - D_BEAR)) < 70) tx = X0 - D_BEAR;
    if (reserve.some(([a, b]) => tx > a - 22 && tx < b + 22)) continue;
    const w = 20 + (rand() * 22 | 0), by = -8 - (rand() * 20 | 0), bm = makeTrunk(1000 + (tx | 0), w, UP + by + 20);
    const t = { bm, x: Math.round(tx), y: g(tx) + by, tall: true, w };
    if (tx === X0 - D_BEAR) bearTrunk = t;
    trunks.push(t); things.push(t);
    for (let k = 0; k < 3; k++) { const dir = rand() < 0.5 ? -1 : 1, len = 30 + (rand() * 46 | 0), up = 96 + rand() * 300; things.push({ bm: makeLimb(2000 + tx + k, len, dir), x: t.x + dir * (w / 2 - 2), y: t.y - up, z: t.y + 0.1, sway: 0.5 }); }
  }
  const maples = Array.from({ length: 6 }, (_, i) => makeMaple(120 + i)), spruces = Array.from({ length: 4 }, (_, i) => makeSpruce(220 + i));
  const free = (x, r) => !trunks.some(t => Math.abs(t.x - x) < t.w * 0.8 + r) && !reserve.some(([a, b]) => x > a - r && x < b + r);
  for (let n = 0; n < 70; n++) { const x = rand() * SW, by = -9 - rand() * 22; if (!free(x, 14)) continue; things.push({ tree: rand() < 0.7 ? maples[(rand() * 6) | 0] : spruces[(rand() * 4) | 0], x: Math.round(x), y: g(x) + Math.round(by) }); }
  const ferns = [5, 6, 7, 8, 10, 12, 15, 19, 23].map((r, i) => swordFern(300 + i, r));
  for (let n = 0; n < 330; n++) {
    const x = rand() * SW, zone = rand(), gy = g(x);
    if (zone < 0.5) things.push({ bm: ferns[2 + (rand() * 5 | 0)], x: Math.round(x), y: gy - 6 - Math.round(rand() * 26), sway: 0.6 });
    else if (zone < 0.72) things.push({ bm: ferns[(rand() * 3) | 0], x: Math.round(x), y: gy + 7 + Math.round(rand() * 7), sway: 0.6 });
    else { const dy = sq(rand()) * 150; things.push({ bm: ferns[Math.min(8, 3 + Math.round(dy / 30) + (rand() * 3 | 0))], x: Math.round(x), y: gy + nearBank(x) + 6 + Math.round(dy), sway: 0.6 }); }
  }
  for (let n = 0; n < 150; n++) { const x = rand() * SW, dy = 30 + rand() * 170; things.push({ bm: ferns[5 + (rand() * 4 | 0)], x: Math.round(x), y: g(x) + nearBank(x) + Math.round(dy), sway: 0.6 }); }
  const logs = [makeNurseLog(41, 92), makeNurseLog(42, 64)];
  for (const [d, k, by] of [[590, 0, -12], [206, 1, -15], [-150, 0, -14], [840, 1, -11]]) { const x = X0 - d; things.push({ bm: logs[k], x, y: g(x) + by }); }
  for (let n = 0; n < 9; n++) { const x = n * 190 + rand() * 120; things.push({ bm: logs[n & 1], x: Math.round(x), y: g(x) + nearBank(x) + 26 + Math.round(rand() * 110), flip: n % 3 === 0 }); }
  const stump = makeStump(5), stumpX = X0 - D_JAY;
  things.push({ bm: stump, x: stumpX, y: g(stumpX) - 9 });
  const signX = X0 - D_SIGN - 15;
  things.push({ bm: makeTrailSign(), x: signX, y: g(signX) - 6 });
  const boulders = [0, 1, 2, 3].map(i => makeBoulder(50 + i, 4 + i * 1.6));
  const stones = [];
  for (let n = 0; n < 26; n++) { const x = Math.round(rand() * SW), y = g(x) + farBank(x) + 6 + Math.round(rand() * (nearBank(x) - farBank(x) - 10)), bm = boulders[(rand() * 4) | 0]; stones.push({ bm, x, y }); }

  // The stream mirrors what stands behind it: build the still picture once and reflect it.
  const still = new Strip(SW, UP, DOWN);
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
  for (const s of stones) { waterAbs.stamp(s.bm, s.x, s.y); for (let dx = -s.bm.ox - 1; dx <= s.bm.ox + 1; dx++) if (hash(dx, s.x, 5) < 0.6) waterAbs.set(s.x + dx, s.y + 1, R.pool[6]); for (let dx = -2; dx <= 2; dx++) waterAbs.set(s.x + dx, s.y - s.bm.oy + 1, R.moss[5]); }

  const run = makeRunner('trail');
  const sit = [0, 1].map(f => sideFig('trail', { feet: [[6, 3], [5, 4]], crouch: 5, lean: 0, hands: f ? [[4, -2], [2, 3]] : [[3, 3], [2, 3]] }));
  const elkBM = { up: elk('up'), graze: elk('graze') }, bearBM = [bear(false), bear(true)], sas = [sasquatch(0), sasquatch(1)];
  const jayBM = { sit: jay('steller', 'sit'), up: jay('steller', 'up'), down: jay('steller', 'down') }, gray = { sit: jay('gray', 'sit'), up: jay('gray', 'up'), down: jay('gray', 'down') };
  const slugBM = [slug(0), slug(1)], slugX = X0 - D_SLUG;
  const elkX = X0 - D_ELK, elkY = g(elkX) - 13;

  const st = {}, focus = { x: 0, y: 0 };
  let cam = 0, last = { camX: 0, base: 0 };
  const list = [];
  const xOf = q => X0 - q * LEN;

  return {
    name: 'forest',
    dur: () => DUR,
    stops: () => [{ id: 'who', at: D_SIGN / LEN }],
    elev: (arg, q) => -g(xOf(q)) * 1.5,
    cues: () => [{ at: (D_SLUG - 11) / LEN, name: 'hop' }, { at: (D_JAY - 20) / LEN, name: 'jay' }],
    enter(scr, arg, q) { cam = xOf(q); st.y = null; },
    focus: () => focus,
    pick(sx, sy) {
      const wx = sx + last.camX, wy = sy - last.base;
      if (Math.abs(wx - signX) < 12 && wy > g(signX) - 34 && wy < g(signX) - 4) return { label: 'Legacy Grove', x: signX - last.camX, y: last.base + g(signX) - 36 };
      if (wy > g(wx) + farBank(wx) && wy < g(wx) + nearBank(wx)) return { label: 'Cache Miss Creek', x: sx, y: sy - 8 };
      return null;
    },
    draw(scr, env, arg, q) {
      const { VW, VH, fb } = scr, { t, tq } = env;
      const mx = xOf(q), d = q * LEN, my = g(mx);
      const anchor = scr.narrow ? 0.5 : 0.6;
      cam += (mx - cam) * Math.min(1, env.dt * 8);
      const camX = Math.round(cam - VW * anchor + env.look.x * 0.5), base = baseline(scr, env.shown, st) - Math.round(my * 0.5);
      last = { camX, base };

      // The light between the trees: bright and misty at eye level, dark up in the canopy.
      const mist = R.mist;
      for (let y = 0; y < VH; y++) {
        const r = y - base, v = r > -30 ? 0.7 : r > -120 ? 0.82 : Math.max(0.1, 0.82 - (-120 - r) / 330), f = v * (mist.length - 1), b0 = Math.floor(f), e = f - b0, row = y * VW;
        if (e < 0.6 || b0 >= mist.length - 1) fb.fill(mist[Math.min(mist.length - 1, b0)], row, row + VW);
        else for (let x = 0; x < VW; x++) fb[row + x] = mist[b0 + (bayer(x, y) < (e - 0.6) / 0.4 ? 1 : 0)];
      }
      // Sasquatch crosses between the far trees, once a visit.
      if (!sasquatchSeen && q > 0.66 && q < 0.9) {
        const u = (q - 0.66) / 0.24;
        scr.put(sas[Math.floor(u * 14) & 1], Math.round(VW * (anchor - 0.16 - u * 0.2)), base - 7, true);
        if (q > 0.88 && env.running) sasquatchSeen = true;
      }
      drawStrip(scr, far, camX * 0.3 + 300, base - 3, true, R.mist[3]);
      drawStrip(scr, mid, camX * 0.6 + 200, base - 1, true, R.mist[1]);
      drawStrip(scr, waterAbs, camX, base, false, 0, r => Math.round(Math.sin(t * 1.6 + r * 0.7)));
      drawStrip(scr, main, camX, base, false, R.moss[1]);
      // Sparkles on the stream where the light falls on it.
      for (let k = 0; k < 60; k++) {
        const wx = Math.floor(camX / 40) * 40 + k * 17 + Math.round(8 * hash(k, 1, 103)), ry = farBank(wx) + 5 + hash(k, 2, 103) * 34;
        if (!beamAt(wx - 0.6 * ry) || frac(t * 0.9 + hash(k, 3, 103)) > 0.35) continue;
        const sx = wx - camX, sy = base + g(wx) + Math.round(ry); if (scr.get(sx, sy) && sy < base + g(wx) + nearBank(wx) - 1) { scr.set(sx, sy, R.white[1]); scr.set(sx + 1, sy, R.pool[6]); }
      }

      list.length = 0;
      for (const th of things) { const w = th.tree ? 30 : th.bm.w; if (th.x + w > camX && th.x - w < camX + VW) list.push(th); }
      // The elk lifts his head while he passes; the bear leans out from behind its trunk once he has gone by.
      list.push({ bm: Math.abs(d - D_ELK + 20) < 90 ? elkBM.up : elkBM[frac(t / 7) < 0.7 ? 'graze' : 'up'], x: elkX, y: elkY, flip: false });
      if (bearTrunk) { const lean = smooth(D_BEAR + 26, D_BEAR + 64, d); if (lean > 0) list.push({ bm: bearBM[frac(t / 3.1) > 0.94 ? 1 : 0], x: bearTrunk.x + Math.round(bearTrunk.w * 0.2 + lean * (bearTrunk.w * 0.5 + 5)), y: bearTrunk.y - 1, z: bearTrunk.y - 0.5, flip: true }); }
      // The jay sits on the stump until he comes close, then takes off ahead of him.
      const ju = (d - (D_JAY - 46)) / 150;
      if (ju < 0) list.push({ bm: jayBM.sit, x: stumpX + 2, y: g(stumpX) - 27, z: 999, flip: frac(t / 2.3) < 0.5 });
      else if (ju < 1.5) list.push({ bm: Math.floor(t * 9) & 1 ? jayBM.up : jayBM.down, x: stumpX + 2 - ju * 150, y: g(stumpX) - 27 - Math.sin(Math.min(1, ju) * 1.4) * 150, z: 999, flip: true });
      list.push({ bm: slugBM[Math.floor(t * 1.2) & 1], x: slugX, y: g(slugX) + 1, flip: true });
      // He hops the slug.
      const ds = d - D_SLUG, hop = Math.abs(ds) < 12 ? Math.round(9 * Math.cos(ds / 12 * Math.PI / 2)) : 0;
      const snack = !env.running && env.still > 60;
      const me = { me: true, x: mx, y: my + 0.5 };
      list.push(me);
      list.sort((a, b) => (a.z || a.y) - (b.z || b.y));
      for (const th of list) {
        const sx = th.x - camX, sy = base + th.y;
        if (th.me) {
          const bm = snack ? sit[Math.floor(t * 1.5) & 1] : env.moving ? (hop ? run.side[3] : run.side[Math.floor(d / 4.2) % 6]) : run.sideIdle[0];
          scr.shadow(Math.round(sx), Math.round(base + my), 5, 1);
          scr.put(bm, sx, base + my - hop + (snack ? 2 : 0), true);
          focus.x = Math.round(sx); focus.y = Math.round(base + my) - 14;
          if (snack) { const u = clamp((env.still - 63) / 1.2, 0, 1); scr.put(u < 1 ? (Math.floor(t * 9) & 1 ? gray.up : gray.down) : gray.sit, sx - 16 - (1 - u) * 60, base + my - (1 - u) * 50, false); }
        } else if (th.tree) {
          for (const part of th.tree.parts) { const [wx, wy] = windAt(th.x + (part.lx || 0), th.y + part.y, tq, part.sway); scr.blit(part.bm, sx + part.x + wx, sy + part.y + wy); }
        } else if (th.tall) blitTall(scr, th.bm, sx - th.bm.ox, sy - th.bm.oy);
        else if (th.sway) { const [wx] = windAt(th.x, th.y, tq, th.sway); scr.put(th.bm, sx + wx, sy, false); }
        else scr.put(th.bm, sx, sy, th.flip);
      }

      // Shafts of light: every other pixel a step lighter, the middle of each shaft two steps.
      for (let y = 0; y < VH; y++) {
        const r = y - base; if (r > 16) break;
        const row = y * VW;
        for (let x = (y + camX) & 1; x < VW; x += 2) { const m = beamAt(camX + x - 0.6 * r); if (m) fb[row + x] = m === 2 ? LIGHT[LIGHT[fb[row + x]]] : LIGHT[fb[row + x]]; }
      }
      // Motes drifting in the light, and fireflies once it goes.
      for (let k = 0; k < 46; k++) {
        const wx = Math.floor(camX / 300) * 300 + hash(k, 1, 104) * 600 + 10 * Math.sin(t * 0.3 + k), r = -20 - hash(k, 2, 104) * 190 + 8 * Math.sin(t * 0.21 + k * 2);
        if (env.mix < 0.5 ? !beamAt(wx - 0.6 * r) : frac(t * 0.4 + hash(k, 3, 104)) > 0.5) continue;
        scr.set(Math.round(wx - camX), Math.round(base + r), env.mix < 0.5 ? R.white[1] : R.yellow[1]);
      }
    }
  };
}
