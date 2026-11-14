// The animals of the side-view scenes, each drawn in code at the same pixel size as everything else.
import { clamp, rng, hash, vnoise, R, INK, BM, outline, disc, thick, pick } from './core.js';

const ell = (b, cx, cy, rx, ry, fn) => { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const nx = (x - cx) / rx, ny = (y - cy) / ry; if (nx * nx + ny * ny <= 1) { const c = fn(nx, ny, x, y); if (c) b.set(x, y, c); } } };

// A bull elk, facing right. pose: 'up' looking about, 'graze' with his head in the grass.
function elk(pose, step = 0) {
  const b = new BM(46, 40); b.ox = 20; b.oy = 38;
  const tan = (nx, ny, x, y) => pick('dirt', 0.62 - ny * 0.3 - nx * 0.05, x, y, 0.5), dark = (nx, ny, x, y) => pick('bark', 0.55 - ny * 0.35, x, y, 0.5);
  for (const [lx, far] of [[11, 1], [15, 0], [26, 1], [29, 0]]) { const sw = step && !far ? 1 : 0; thick(b, lx, 26, lx + sw, 32, 2, R.bark[far ? 0 : 1]); thick(b, lx + sw, 32, lx + sw, 37, 1.5, R.bark[far ? 0 : 1]); b.set(lx + sw, 38, INK); }
  ell(b, 20, 22, 12, 6.2, tan);
  ell(b, 9, 20, 3.5, 4, (nx, ny) => nx < 0.2 ? R.dirt[4] : 0);
  if (pose === 'graze') {
    thick(b, 29, 21, 35, 30, 5, R.bark[1]); ell(b, 37, 33, 3.6, 2.4, dark); b.set(40, 34, R.bark[0]); b.set(36, 32, INK);
    for (const s of [0, 1]) { thick(b, 34, 30, 30 - s * 3, 24 - s, 1, R.dirt[4]); thick(b, 31 - s * 3, 26, 27 - s * 4, 22, 1, R.dirt[4]); }
  } else {
    thick(b, 28, 20, 33, 11, 5, R.bark[1]); ell(b, 36, 9, 3.8, 2.6, dark); b.set(39, 10, R.bark[0]); b.set(36, 8, INK); b.set(33, 7, R.bark[2]);
    for (const s of [0, 1]) { const ax = 33 - s * 2; thick(b, ax, 6, ax - 5, 1, 1, R.dirt[4]); thick(b, ax - 2, 4, ax - 1, 0, 1, R.dirt[4]); thick(b, ax - 4, 2, ax - 8, 3, 1, R.dirt[4]); b.set(ax + 1, 3, R.dirt[4]); }
  }
  ell(b, 27, 23, 4, 4.5, dark);
  outline(b, INK);
  return b;
}

// A black bear on its hind legs, peering round a trunk. Facing left.
function bear(blink) {
  const b = new BM(22, 38); b.ox = 11; b.oy = 37;
  const fur = (nx, ny, x, y) => pick('fur', 0.4 - nx * 0.25 - ny * 0.2 + 0.2 * (hash(x, y, 4) - 0.5), x, y, 0.6);
  ell(b, 12, 26, 7, 11, fur);
  thick(b, 9, 34, 9, 37, 3, R.fur[0]); thick(b, 15, 34, 15, 37, 3, R.fur[0]);
  thick(b, 8, 20, 4, 26, 3, R.fur[1]); b.set(3, 27, R.fur[2]);
  ell(b, 10, 10, 6, 5.5, fur);
  disc(b, 6, 4.5, 2, () => R.fur[1]); disc(b, 14, 4.5, 2, () => R.fur[1]); b.set(6, 5, R.fur[3]); b.set(14, 5, R.fur[3]);
  ell(b, 6, 12, 3.4, 2.4, () => R.dirt[2]); b.set(3, 11, INK); b.set(4, 13, R.dirt[1]);
  if (!blink) { b.set(8, 9, R.white[1]); b.set(12, 9, R.white[1]); }
  outline(b, INK);
  return b;
}

// Sasquatch in mid-stride, a silhouette in the far trees. Two frames.
function sasquatch(f, c = R.mist[1]) {
  const b = new BM(18, 34); b.ox = 9; b.oy = 33;
  disc(b, 9, 4, 3.2, () => c); b.set(9, 0, c);
  for (let y = 7; y < 20; y++) for (let x = 5 - (y < 12 ? 1 : 0); x <= 12 + (y < 12 ? 1 : 0); x++) b.set(x, y, c);
  const a = f ? 1 : -1;
  thick(b, 5, 9, 5 + a * 3, 21, 3, c); thick(b, 13, 9, 13 - a * 3, 21, 3, c);
  thick(b, 7, 19, 7 - a * 4, 27, 3, c); thick(b, 7 - a * 4, 27, 6 - a * 4, 33, 3, c);
  thick(b, 11, 19, 11 + a * 4, 27, 3, c); thick(b, 11 + a * 4, 27, 13 + a * 3, 33, 3, c);
  return b;
}

// Small birds. kind: 'steller' (black crest, deep blue) or 'gray' (the camp robber). pose: 'sit', 'up', 'down'.
function jay(kind, pose) {
  const b = new BM(13, 11); b.ox = 6; b.oy = 10;
  const body = kind === 'steller' ? R.jay : [R.rock[0], R.rock[2], R.rock[3], R.rock[4]], headC = kind === 'steller' ? R.jay[0] : R.white[1];
  if (pose === 'sit') {
    ell(b, 6, 7, 3.2, 2.4, (nx, ny) => body[ny < -0.2 ? 3 : 2]);
    thick(b, 3, 8, 0, 10, 1.5, body[1]);
    disc(b, 9, 4, 1.8, () => headC); if (kind === 'steller') { b.set(8, 1, headC); b.set(8, 2, headC); b.set(7, 0, headC); } else b.set(8, 3, R.rock[1]);
    b.set(11, 4, INK); b.set(9, 4, kind === 'steller' ? R.white[1] : INK);
    b.set(6, 10, INK); b.set(7, 10, INK);
  } else {
    ell(b, 6, 6, 3.4, 1.8, (nx, ny) => body[2]);
    disc(b, 10, 5, 1.6, () => headC); b.set(12, 5, INK); if (kind === 'steller') b.set(9, 3, headC);
    thick(b, 3, 6, 0, 7, 1.5, body[1]);
    if (pose === 'up') { thick(b, 6, 5, 4, 0, 2, body[3]); thick(b, 7, 5, 6, 1, 1, body[2]); } else { thick(b, 6, 7, 4, 10, 2, body[3]); }
  }
  outline(b, INK);
  return b;
}

// A banana slug, big enough to see: yellow, a few dark spots, two eye stalks.
function slug(f) {
  const b = new BM(12, 6); b.ox = 6; b.oy = 5;
  const len = f ? 9 : 8;
  for (let x = 1; x <= len; x++) { b.set(x, 4, R.yellow[0]); b.set(x, 3, R.yellow[1]); if (x > 2 && x < len - 1) b.set(x, 2, R.yellow[1]); }
  b.set(4, 3, R.mustard[0]); b.set(6, 2, R.mustard[0]);
  b.set(0, 2, R.yellow[1]); b.set(1, 1, R.yellow[0]); b.set(0, 0, R.mustard[0]); b.set(2, 0, R.mustard[0]);
  outline(b, INK);
  return b;
}

// A hoary marmot. pose: 'sun' stretched flat on a rock, 'up' sitting to whistle.
function marmot(pose) {
  const b = new BM(18, 14); b.ox = 9; b.oy = 13;
  const fur = (nx, ny, x, y) => pick('rock', 0.7 - ny * 0.3 + 0.2 * (hash(x, y, 2) - 0.5), x, y, 0.5);
  if (pose === 'sun') {
    ell(b, 8, 10.5, 6.5, 2.6, fur); ell(b, 14, 10, 2.6, 2.2, (nx, ny, x, y) => R.bark[ny < 0 ? 2 : 1]); b.set(16, 10, INK); b.set(15, 9, INK); b.set(13, 8, R.bark[1]);
    thick(b, 2, 11, 0, 12, 2, R.bark[1]); b.set(5, 13, R.bark[0]); b.set(11, 13, R.bark[0]);
  } else {
    ell(b, 8, 9, 3.6, 4.4, fur); ell(b, 9, 3.5, 2.6, 2.3, (nx, ny) => R.bark[ny < 0 ? 2 : 1]); b.set(11, 3, INK); b.set(11, 4, R.white[0]); b.set(8, 1, R.bark[1]);
    thick(b, 10, 8, 12, 9, 1, R.bark[1]); thick(b, 4, 12, 1, 13, 2, R.bark[1]);
  }
  outline(b, INK);
  return b;
}

// A pika with a mouthful of flowers for its haystack.
function pika(f) {
  const b = new BM(11, 8); b.ox = 5; b.oy = 7;
  ell(b, 5, 5, 3.6, 2.4, (nx, ny) => R.dirt[ny < -0.2 ? 3 : 2]);
  disc(b, 8, 3.5, 1.8, () => R.dirt[3]); b.set(7, 1, R.dirt[2]); b.set(8, 1, R.dirt[4]); b.set(9, 3, INK);
  if (f) { b.set(10, 4, R.moss[5]); b.set(10, 3, R.lupine[1]); b.set(10, 5, R.moss[4]); }
  b.set(3, 7, R.dirt[1]); b.set(7, 7, R.dirt[1]);
  outline(b, INK);
  return b;
}

// A mountain goat, white and shaggy, facing right. pose: 'stand', 'look' (head turned to watch).
function goat(pose, kid) {
  const s = kid ? 0.7 : 1, b = new BM(26, 22); b.ox = 12; b.oy = 21;
  const wool = (nx, ny, x, y) => R.snow[clamp(Math.round(3.4 - ny * 1.2 + (hash(x, y, 3) - 0.5)), 2, 4)];
  for (const [lx, far] of [[7, 1], [9, 0], [15, 1], [17, 0]]) thick(b, lx * s + (kid ? 4 : 0), 14, lx * s + (kid ? 4 : 0), 20, 2, R.snow[far ? 1 : 2]);
  for (const lx of [7, 9, 15, 17]) b.set(lx * s + (kid ? 4 : 0), 21, INK);
  ell(b, 12 * s + (kid ? 4 : 0), 12, 7 * s, 4.2 * s, wool);
  ell(b, 9 * s + (kid ? 4 : 0), 9, 3 * s, 2.5 * s, wool);
  const hx = (pose === 'look' ? 17 : 19) * s + (kid ? 4 : 0), hy = pose === 'look' ? 6 : 7;
  thick(b, 16 * s + (kid ? 4 : 0), 10, hx, hy + 1, 3, R.snow[3]);
  ell(b, hx + 1, hy, 2.6 * s, 2 * s, wool); b.set(hx + 3, hy + 1, INK); b.set(hx + 1, hy - 1, INK);
  if (!kid) { thick(b, hx, hy - 2, hx - 2, hy - 5, 1, INK); thick(b, hx + 1, hy + 2, hx + 1, hy + 4, 1, R.snow[2]); }
  outline(b, INK);
  return b;
}

// A bluebird, for the summit of Bluebird Forecast. Two wing frames.
function bluebird(f) {
  const b = new BM(9, 7); b.ox = 4; b.oy = 3;
  b.set(3, 3, R.jay[3]); b.set(4, 3, R.jay[3]); b.set(5, 3, R.jay[2]); b.set(6, 3, R.jay[3]); b.set(7, 3, INK); b.set(4, 4, R.blaze[2]); b.set(5, 4, R.blaze[2]); b.set(2, 3, R.jay[1]); b.set(1, 4, R.jay[1]);
  if (f) { b.set(4, 2, R.jay[2]); b.set(4, 1, R.jay[2]); b.set(3, 0, R.jay[3]); } else { b.set(4, 5, R.jay[2]); b.set(3, 6, R.jay[2]); }
  return b;
}

// A little bird far off: a pair of wing strokes.
function speck(f) { const b = new BM(7, 4); b.ox = 3; b.oy = 2; (f ? [0, 1, 2, 2, 2, 1, 0] : [2, 2, 1, 2, 1, 2, 2]).forEach((y, x) => b.set(x, y, INK)); return b; }

export { ell, elk, bear, sasquatch, jay, slug, marmot, pika, goat, bluebird, speck };
