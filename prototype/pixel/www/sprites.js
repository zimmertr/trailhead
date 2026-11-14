// Scenery and animal sprites that more than one scene uses.
import { TAU, clamp, lerp, sq, rng, hash, vnoise, bayer, R, INK, BM, outline, disc, thick, pick } from './core.js';

// ---------------------------------------------------------------------------------------------
// Trees. Each is a still trunk plus leaf clumps that move on their own, a pixel at a time, as in
// the usual 2D wind technique: a wave runs along the wind, gusts widen it, and still air stops it.

function clump(r, name, rand, hang) {
  const S = Math.ceil(r * 2.6) + 4, b = new BM(S, S + hang), c = S / 2;
  const blobs = [[0, 0, r]];
  for (let k = 0; k < 3; k++) { const a = rand() * TAU; blobs.push([Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.5, r * (0.5 + rand() * 0.2)]); }
  const ramp = R[name];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x - c, dy = y - c;
    if (!blobs.some(([bx, by, br]) => sq(dx - bx) + sq(dy - by) <= br * br)) continue;
    const nx = dx / (r * 1.3), ny = dy / (r * 1.2);
    let v = 0.52 + 0.46 * (-0.55 * nx - 0.78 * ny) + (hash(x, y, r * 13 | 0) - 0.5) * 0.36;
    if (hash(x + 3, y, 9) < 0.1) v += 0.25;
    b.set(x, y, ramp[clamp(Math.round(v * (ramp.length - 1) + (bayer(x, y) - 0.5) * 0.8), 1, ramp.length - 1)]);
  }
  outline(b, ramp[0]);
  // Moss hangs from the limbs of the rainforest maples.
  for (let k = 0; k < hang && k < 4; k++) {
    const x = Math.round(c + (rand() - 0.5) * r * 1.4); let y = S - 1; while (y > 0 && !b.get(x, y)) y--;
    const len = 2 + (rand() * hang) | 0;
    for (let j = 1; j <= len; j++) b.set(x, y + j, j === len ? R.moss[4] : R.moss[5]);
  }
  b.cx = c; b.cy = c;
  return b;
}
function makeMaple(seed) {
  const rand = rng(seed), H = 38 + (rand() * 10 | 0), W = 34;
  const trunk = new BM(W, H + 2);
  const bx = W / 2, top = [bx + (rand() - 0.5) * 6, H * 0.42];
  const mid = [bx + (rand() - 0.5) * 8, H * 0.72];
  const barkCol = (x, y) => (x < bx - 0.5 + (y < H * 0.6 ? 1 : 0)) || hash(x, y, 3) < 0.35 ? R.moss[hash(x, y, 4) < 0.5 ? 4 : 3] : R.bark[hash(x, y, 5) < 0.5 ? 1 : 2];
  for (let t = 0; t <= 1; t += 0.02) {
    const p = t < 0.5 ? [lerp(bx, mid[0], t * 2), lerp(H, mid[1], t * 2)] : [lerp(mid[0], top[0], t * 2 - 1), lerp(mid[1], top[1], t * 2 - 1)];
    const wdt = t < 0.08 ? 6 : t < 0.5 ? 4 : 3;
    for (let dx = 0; dx < wdt; dx++) trunk.set(p[0] - wdt / 2 + dx, p[1], barkCol(Math.round(p[0] - wdt / 2 + dx), Math.round(p[1])));
  }
  for (const s of [-1, 1]) thick(trunk, mid[0], mid[1] - 2, mid[0] + s * (6 + rand() * 4), H * 0.36, 2, R.moss[4]);
  outline(trunk, INK);
  const parts = [{ bm: trunk, x: -Math.round(bx), y: -H, sway: 0 }];
  const n = 6 + (rand() * 3 | 0), cs = [];
  for (let k = 0; k < n; k++) cs.push([top[0] + (rand() - 0.5) * 22, H * 0.3 + (rand() - 0.5) * 18, 5 + rand() * 2.5]);
  // A darker copy of the canopy sits behind the clumps, so a lifted clump shows shadowed leaves, not sky.
  const inside = new BM(W, H);
  for (const [x, y, r] of cs) disc(inside, x, y, r - 0.5, () => R.moss[1]);
  parts.push({ bm: inside, x: -Math.round(bx), y: -H, sway: 0 });
  cs.sort((a, c) => a[1] - c[1]);
  for (const [x, y, r] of cs) { const bm = clump(r, 'moss', rand, 6); parts.push({ bm, x: Math.round(x - bm.cx - bx), y: Math.round(y - bm.cy - H), sway: 1, lx: x - bx }); }
  return { parts, h: H, w: W };
}
function makeConifer(seed, H, W, name, tiers) {
  const rand = rng(seed), parts = [];
  const trunk = new BM(5, H + 1);
  for (let y = Math.round(H * 0.2); y <= H; y++) { trunk.set(1, y, R.bark[2]); trunk.set(2, y, R.bark[1]); if (y > H - 4) trunk.set(3, y, R.bark[1]); }
  outline(trunk, INK);
  parts.push({ bm: trunk, x: -2, y: -H, sway: 0 });
  const ramp = R[name];
  for (let i = 0; i < tiers; i++) {
    const f = (i + 1) / tiers, hw = Math.max(1.5, W / 2 * Math.pow(f, 0.9) + (rand() - 0.5) * 1.5), th = 4 + (f > 0.5 ? 1 : 0);
    const bm = new BM(Math.ceil(hw * 2) + 5, th + 5), cx = bm.w / 2;
    for (let dx = -Math.floor(hw); dx <= Math.ceil(hw); dx++) {
      const a = Math.abs(dx) / hw; if (a > 1) continue;
      const y0 = 1 + a * a * 2.5 + (i === 0 ? 0 : 0), t = th * (1 - a * 0.55);
      for (let j = 0; j < t; j++) {
        let v = 0.78 - j / th * 0.6 - dx / hw * 0.2 + (hash(dx, j + i * 7, seed) - 0.5) * 0.3;
        bm.set(cx + dx, y0 + j + 1, ramp[clamp(Math.round(v * (ramp.length - 1) + (bayer(dx & 3, j) - 0.5) * 0.7), 1, ramp.length - 1)]);
      }
    }
    if (i === 0) { bm.set(cx, 0, ramp[2]); bm.set(cx, 1, ramp[3]); }
    outline(bm, ramp[0]);
    const y = -H + 2 + i * (H * 0.82) / tiers;
    parts.push({ bm, x: Math.round(-cx + 0.5), y: Math.round(y - 1), sway: 1 - f * 0.6, lx: 0 });
  }
  return { parts, h: H, w: W };
}
const makeSpruce = seed => { const r = rng(seed); return makeConifer(seed, 52 + (r() * 16 | 0), 26 + (r() * 8 | 0), 'conifer', 9); };
const makeFir = seed => { const r = rng(seed); return makeConifer(seed, 22 + (r() * 12 | 0), 9 + (r() * 4 | 0), 'conifer', 6); };

function makeFern(seed) {
  const rand = rng(seed), b = new BM(11, 7); b.ox = 5; b.oy = 6;
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k - 2) * 0.55 + (rand() - 0.5) * 0.2;
    for (let j = 1; j <= 4 + (k === 2 ? 1 : 0); j++) {
      const x = 5 + Math.cos(a) * j * 1.2, y = 6 + Math.sin(a) * j * 0.9 + (Math.abs(k - 2) > 1 ? j * 0.25 : 0);
      b.set(x, y, j > 3 ? R.moss[5] : R.moss[4]);
    }
  }
  return b;
}
function makeBoulder(seed, r) {
  const rand = rng(seed), b = new BM(Math.ceil(r * 2.4) + 4, Math.ceil(r * 1.6) + 4); b.ox = b.w >> 1; b.oy = b.h - 2;
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    const nx = (x - b.ox) / (r * 1.15), ny = (y - (b.oy - r * 0.6)) / (r * 0.7);
    if (nx * nx + ny * ny > 1 + 0.25 * (vnoise(x / 2, y / 2, seed) - 0.5) || y > b.oy) continue;
    b.set(x, y, pick('rock', 0.6 - nx * 0.25 - ny * 0.3 + (rand() - 0.5) * 0.15, x, y));
  }
  outline(b, INK);
  return b;
}
function makeLog() {
  const b = new BM(22, 8); b.ox = 11; b.oy = 7;
  for (let x = 1; x < 20; x++) for (let y = 2; y < 7; y++) b.set(x, y, y < 3 ? R.moss[5] : y < 4 ? R.moss[4] : R.bark[y < 5 ? 2 : 1]);
  for (let y = 2; y < 7; y++) b.set(20, y, R.wood[3]);
  b.set(20, 4, R.wood[1]);
  outline(b, INK);
  return b;
}
function makeCloud(seed) {
  const rand = rng(seed), b = new BM(56, 20); b.ox = 0; b.oy = 0;
  const blobs = []; for (let k = 0; k < 6; k++) blobs.push([8 + k * 8 + rand() * 4, 12 - rand() * 6 - (k > 1 && k < 4 ? 4 : 0), 5 + rand() * 4]);
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    if (!blobs.some(([bx, by, r]) => sq(x - bx) + sq((y - by) * 1.3) <= r * r) || y > 16) continue;
    b.set(x, y, y > 12 ? R.sky[3] : (y > 10 && bayer(x, y) > 0.5) ? R.sky[4] : R.white[1]);
  }
  return b;
}

// Signs and small built things.
function makeSignpost() {
  const b = new BM(19, 22); b.ox = 9; b.oy = 21;
  for (let y = 5; y < 22; y++) { b.set(8, y, R.wood[2]); b.set(9, y, R.wood[1]); }
  const plank = (x0, x1, y, dir, dot) => {
    for (let x = x0; x <= x1; x++) { b.set(x, y, R.wood[4]); b.set(x, y + 1, R.wood[3]); b.set(x, y + 2, R.wood[2]); }
    const tip = dir < 0 ? x0 - 1 : x1 + 1; b.set(tip, y + 1, R.wood[3]);
    b.set(dir < 0 ? x1 - 1 : x0 + 1, y + 1, dot);
  };
  plank(1, 8, 6, -1, R.water[3]);
  plank(10, 17, 10, 1, R.snow[4]);
  for (let y = 1; y < 5; y++) { b.set(8, y, R.wood[4]); b.set(9, y, R.wood[3]); }
  b.set(8, 0, R.wood[4]); b.set(9, 2, R.gold[5]);
  outline(b, INK);
  return b;
}
function makeSmallSign() {
  const b = new BM(13, 16); b.ox = 6; b.oy = 15;
  for (let y = 6; y < 16; y++) { b.set(6, y, R.wood[2]); }
  for (let y = 2; y < 7; y++) for (let x = 1; x < 12; x++) b.set(x, y, y === 6 ? R.wood[2] : R.wood[4]);
  for (let x = 3; x < 10; x += 2) b.set(x, 4, R.wood[1]);
  outline(b, INK);
  return b;
}
function makeKiosk() {
  const b = new BM(26, 26); b.ox = 13; b.oy = 25;
  for (let y = 8; y < 26; y++) { b.set(4, y, R.wood[1]); b.set(21, y, R.wood[1]); }
  for (let y = 9; y < 20; y++) for (let x = 5; x < 21; x++) b.set(x, y, R.wood[2]);
  for (const [x0, y0, w, h] of [[6, 10, 5, 4], [12, 10, 7, 3], [7, 15, 4, 3], [13, 14, 6, 4]]) for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) b.set(x, y, x === x0 + w - 1 ? R.white[0] : R.white[1]);
  b.set(15, 15, R.red[1]); b.set(16, 15, R.red[1]);
  for (let j = 0; j < 7; j++) for (let x = 12 - j * 2; x <= 13 + j * 2; x++) b.set(x, j + 1, j > 4 ? R.wood[0] : R.red[j < 2 ? 2 : 1]);
  outline(b, INK);
  return b;
}
function makeTent(c) {
  const b = new BM(16, 11); b.ox = 8; b.oy = 10;
  for (let y = 0; y < 10; y++) for (let x = 8 - y * 0.75; x <= 8 + y * 0.75; x++) b.set(x, y + 1, x < 8 ? R[c][2] : R[c][1]);
  for (let y = 6; y < 10; y++) b.set(8, y + 1, R.ink[0]);
  outline(b, INK);
  return b;
}
function makeJournal() {
  const b = makeBoulder(81, 6);
  const x = b.ox - 2, y = b.oy - 8;
  for (let dx = 0; dx < 5; dx++) { b.set(x + dx, y, R.white[1]); b.set(x + dx, y + 1, R.red[1]); }
  b.set(x + 2, y, R.white[0]);
  return b;
}

// The runner, drawn from a pose each frame: a chibi with a big head, as SNES sprites are, then
// outlined in one pass.
function makeElk(headDown) {
  const b = new BM(24, 20); b.ox = 11; b.oy = 19;
  for (let y = 0; y < 20; y++) for (let x = 0; x < 24; x++) {
    const nx = (x - 10) / 7, ny = (y - 10) / 3.6;
    if (nx * nx + ny * ny <= 1) b.set(x, y, x > 13 ? R.dirt[3] : pick('bark', 0.75 - ny * 0.4, x, y, 0.5));
  }
  for (const [lx, d] of [[5, 1], [7, 0], [12, 1], [14, 0]]) for (let y = 12; y < 20; y++) b.set(lx, y, R.bark[d ? 1 : 2]);
  const hx = headDown ? 3 : 2, hy = headDown ? 15 : 3;
  thick(b, 5, 9, hx + 1, hy + 1, 2, R.bark[1]);
  disc(b, hx, hy, 2, () => R.bark[2]);
  b.set(hx - 2, hy + 1, R.bark[0]);
  if (!headDown) { thick(b, hx + 1, hy - 1, hx + 4, hy - 4, 1, R.white[0]); thick(b, hx, hy - 1, hx - 3, hy - 4, 1, R.white[0]); b.set(hx + 3, hy - 2, R.white[0]); b.set(hx - 2, hy - 2, R.white[0]); }
  b.set(17, 9, R.bark[1]);
  outline(b, INK);
  return b;
}
function makeSlug() {
  const b = new BM(8, 4); b.ox = 4; b.oy = 3;
  for (let x = 1; x < 7; x++) b.set(x, 2, R.yellow[1]);
  for (let x = 2; x < 6; x++) b.set(x, 1, R.yellow[1]);
  b.set(6, 1, R.yellow[0]); b.set(7, 0, R.yellow[0]);
  outline(b, INK);
  return b;
}
function makeBird(f) {
  const b = new BM(7, 4); b.ox = 3; b.oy = 2;
  const ys = f ? [0, 1, 2, 2, 2, 1, 0] : [2, 2, 1, 2, 1, 2, 2];
  ys.forEach((y, x) => b.set(x, y, INK));
  return b;
}
function makeCat(name, pose, seed) {
  const b = new BM(16, 12); b.ox = 8; b.oy = 11;
  const ramp = R[name], col = (x, y, v) => {
    if (name === 'tortie') { const n = vnoise(x / 2.2, y / 2.2, seed); return n > 0.62 ? ramp[3] : n > 0.5 ? ramp[2] : ramp[v > 0.6 ? 1 : 0]; }
    return ramp[clamp(Math.round(v * 3), 0, 3)];
  };
  const crouch = pose === 'crouch', leap = pose === 'leap';
  const bodyY = crouch ? 8.5 : leap ? 6 : 7.5, bodyR = leap ? 4.2 : 3.4;
  for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) {
    const nx = (x - 7) / (bodyR * (leap ? 1.4 : 1.15)), ny = (y - bodyY) / (bodyR * 0.85);
    if (nx * nx + ny * ny <= 1) b.set(x, y, col(x, y, 0.65 - ny * 0.3 - nx * 0.1));
  }
  const hx = leap ? 12 : crouch ? 11 : 10, hy = crouch ? 7 : leap ? 4.5 : 4;
  disc(b, hx, hy, 2.6, (nx, ny, x, y) => col(x, y, 0.75 - ny * 0.3));
  b.set(hx - 2, hy - 3, ramp[name === 'tortie' ? 0 : 1]); b.set(hx + 1, hy - 3, ramp[name === 'tortie' ? 2 : 1]);
  b.set(hx + 1, hy - 0.5, name === 'tortie' ? R.yellow[1] : R.yellow[1]);
  const tail = pose === 'sitB' ? [[3, 9], [1, 7], [1, 5]] : pose === 'sitA' ? [[3, 9], [1, 9], [0, 7]] : [[3, bodyY], [1, bodyY - 1], [0, bodyY - 3]];
  for (const [x, y] of tail) { b.set(x, y, col(x, y, 0.5)); b.set(x + 1, y, col(x + 1, y, 0.4)); }
  if (!leap) for (const x of [5, 9]) b.set(x, 11, col(x, 11, 0.3));
  outline(b, name === 'nebel' ? (x, y) => (hash(x, y, 2) < 0.3 ? R.nebel[1] : INK) : INK);
  return b;
}


// A silver snag: a dead tree bleached grey, a few broken limbs.
function makeSnag(seed) {
  const rand = rng(seed), H = 20 + (rand() * 12 | 0), b = new BM(13, H + 2); b.ox = 6; b.oy = H;
  for (let y = 1; y <= H; y++) { b.set(6, y, R.rock[y & 3 ? 3 : 2]); if (y > H * 0.5) b.set(5, y, R.rock[4]); }
  for (let k = 0; k < 4; k++) { const y = 3 + k * (H * 0.2) + rand() * 2, s = k & 1 ? 1 : -1, len = 2 + rand() * 3; thick(b, 6, y + 2, 6 + s * len, y, 1, R.rock[3]); }
  outline(b, INK);
  return b;
}
// A low shrub. Huckleberry going red, or heather in flower.
function makeBush(seed, kind) {
  const rand = rng(seed), r = 3 + rand() * 2, b = new BM(14, 10); b.ox = 7; b.oy = 9;
  const ramp = kind === 'huck' ? R.red : R.moss;
  for (let y = 0; y < 10; y++) for (let x = 0; x < 14; x++) {
    const nx = (x - 7) / (r * 1.25), ny = (y - (9 - r * 0.7)) / (r * 0.8);
    if (nx * nx + ny * ny > 1 + 0.4 * (vnoise(x / 2, y / 2, seed) - 0.5) || y > 9) continue;
    const v = 0.6 - nx * 0.3 - ny * 0.4 + (hash(x, y, seed) - 0.5) * 0.4;
    b.set(x, y, kind === 'huck' ? (hash(x, y, seed + 2) < 0.3 ? R.red[v > 0.55 ? 1 : 0] : R.moss[clamp(Math.round(1 + v * 3), 1, 4)]) : kind === 'heather' ? (hash(x, y, seed + 1) < 0.4 ? R.pink[v > 0.5 ? 2 : 1] : R.moss[v > 0.5 ? 4 : 3]) : R.moss[clamp(Math.round(2 + v * 3), 2, 5)]);
  }
  outline(b, R.moss[1]);
  return b;
}
// A summit flag on a pole, in two frames so it can flutter.
function makeFlag(f, ramp = R.red) {
  const b = new BM(12, 16); b.ox = 2; b.oy = 15;
  for (let y = 1; y < 16; y++) b.set(2, y, R.shoe[1]);
  for (let x = 0; x < 7; x++) { const dy = f ? (x > 3 ? 1 : 0) : (x > 1 && x < 5 ? 1 : 0); for (let y = 0; y < 4 - (x > 4 ? 1 : 0); y++) b.set(3 + x, 1 + y + dy, ramp[y === 0 ? 2 : y === 3 ? 0 : 1]); }
  outline(b, INK);
  return b;
}

export { makeSnag, makeBush, makeFlag, clump, makeMaple, makeConifer, makeSpruce, makeFir, makeFern, makeBoulder, makeLog, makeCloud, makeSignpost, makeSmallSign, makeKiosk, makeTent, makeJournal, makeElk, makeSlug, makeBird, makeCat };
