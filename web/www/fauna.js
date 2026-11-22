// The animals of the side-view scenes, each drawn in code at the same pixel size as everything else.
import { hash, frac, R, INK, BM, outline, litBack, disc, thick, pick } from './core.js';

const ell = (b, cx, cy, rx, ry, fn) => { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const nx = (x - cx) / rx, ny = (y - cy) / ry; if (nx * nx + ny * ny <= 1) { const c = fn(nx, ny, x, y); if (c) b.set(x, y, c); } } };

// A bull elk, facing right. pose: 'up' looking about, 'graze' with his head in the grass. alt is the
// second frame of each: an ear flicked back, or the head a pixel lower as he tears at the grass.
function elk(pose, step = 0, alt = 0) {
  const b = new BM(46, 40); b.ox = 20; b.oy = 38;
  const tan = (nx, ny, x, y) => pick('dirt', 0.62 - ny * 0.3 - nx * 0.05, x, y, 0.5), dark = (nx, ny, x, y) => pick('bark', 0.55 - ny * 0.35, x, y, 0.5);
  for (const [lx, far] of [[11, 1], [15, 0], [26, 1], [29, 0]]) { const sw = step && !far ? 1 : 0; thick(b, lx, 26, lx + sw, 32, 2, R.bark[far ? 0 : 1]); thick(b, lx + sw, 32, lx + sw, 37, 1.5, R.bark[far ? 0 : 1]); b.set(lx + sw, 38, INK); }
  ell(b, 20, 22, 12, 6.2, tan);
  ell(b, 9, 20, 3.5, 4, nx => nx < 0.2 ? R.dirt[4] : 0);
  if (pose === 'graze') {
    thick(b, 29, 21, 35, 30 + alt, 5, R.bark[1]); ell(b, 37, 33 + alt, 3.6, 2.4, dark); b.set(40, 34 + alt, R.bark[0]); b.set(36, 32 + alt, INK);
    for (const s of [0, 1]) { thick(b, 34, 30, 30 - s * 3, 24 - s, 1, R.dirt[4]); thick(b, 31 - s * 3, 26, 27 - s * 4, 22, 1, R.dirt[4]); }
  } else {
    thick(b, 28, 20, 33, 11, 5, R.bark[1]); ell(b, 36, 9, 3.8, 2.6, dark); b.set(39, 10, R.bark[0]); b.set(36, 8, INK); if (alt) { b.set(32, 7, R.bark[2]); b.set(31, 8, R.bark[2]); } else b.set(33, 7, R.bark[2]);
    for (const s of [0, 1]) { const ax = 33 - s * 2; thick(b, ax, 6, ax - 5, 1, 1, R.dirt[4]); thick(b, ax - 2, 4, ax - 1, 0, 1, R.dirt[4]); thick(b, ax - 4, 2, ax - 8, 3, 1, R.dirt[4]); b.set(ax + 1, 3, R.dirt[4]); }
  }
  ell(b, 27, 23, 4, 4.5, dark);
  outline(b, INK);
  return b;
}

// Sasquatch in mid-stride, a silhouette in the far trees. Two frames.
function sasquatch(f, c = R.fur[1]) {
  const b = new BM(18, 34); b.ox = 9; b.oy = 33;
  disc(b, 9, 4, 3.2, () => c); b.set(9, 0, c);
  for (let y = 7; y < 20; y++) for (let x = 5 - (y < 12 ? 1 : 0); x <= 12 + (y < 12 ? 1 : 0); x++) b.set(x, y, c);
  const a = f ? 1 : -1;
  thick(b, 5, 9, 5 + a * 3, 21, 3, c); thick(b, 13, 9, 13 - a * 3, 21, 3, c);
  thick(b, 7, 19, 7 - a * 4, 27, 3, c); thick(b, 7 - a * 4, 27, 6 - a * 4, 33, 3, c);
  thick(b, 11, 19, 11 + a * 4, 27, 3, c); thick(b, 11 + a * 4, 27, 13 + a * 3, 33, 3, c);
  // Light catches the fur along his leading edge; the rest stays a dark shape, as in every photo of him.
  const d = b.d.slice(); for (let y = 0; y < b.h; y++) for (let x = 1; x < b.w; x++) if (d[y * b.w + x] && !d[y * b.w + x - 1]) b.set(x, y, R.fur[3]); else if (d[y * b.w + x] && x > 1 && !d[y * b.w + x - 2]) b.set(x, y, R.fur[2]);
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
    ell(b, 6, 6, 3.4, 1.8, () => body[2]);
    disc(b, 10, 5, 1.6, () => headC); b.set(12, 5, INK); if (kind === 'steller') b.set(9, 3, headC);
    thick(b, 3, 6, 0, 7, 1.5, body[1]);
    if (pose === 'up') { thick(b, 6, 5, 4, 0, 2, body[3]); thick(b, 7, 5, 6, 1, 1, body[2]); } else { thick(b, 6, 7, 4, 10, 2, body[3]); }
  }
  outline(b, INK);
  return b;
}

// A barred owl (E5d), the rainforest's own: a round head with no ear tufts, a pale face in rings, dark
// eyes, bars across the breast and streaks below, yellow talons on its perch. face: 'r' (looking right),
// 'f' (at you) or 'l'; blink shuts the eyes.
const OWL_HEAD = {
  f: ['...kkkkk...', '.kkmnmnmkk.', 'kmnppmppnmk', 'kmpeepeepmk', 'knpeepeepnk', 'kmnpnynpnmk', '.kmnpppnmk.'],
  r: ['...kkkkk...', '.kkmmnmnkk.', 'kmmnppmppnk', 'kmmpeepeepk', 'kmnpeepeepk', 'kmmnpnpynpk', '.kmmnpppnk.']
};
// The breast barred across at the neck and streaked down the belly; the folded wings dark with pale spots.
const OWL_BODY = ['kdmnpnpnmdk', 'kdmpppppmdk', 'kpdpnpnpdpk', 'kdmpnpnpmdk', 'kpdppnppdpk', '.kdpnpnpdk.', '.kkdpppdkk.', '...kmmmk...', '...yk.ky...'];
function owl(face, blink) {
  const b = new BM(11, 16); b.ox = 5; b.oy = 15;
  const head = face === 'l' ? OWL_HEAD.r.map(s => [...s].reverse().join('')) : OWL_HEAD[face];
  const C = { k: INK, d: R.bark[1], m: R.wood[2], n: R.wood[1], p: R.fog[2], y: R.yellow[1], e: blink ? R.wood[1] : INK };
  [...head, ...OWL_BODY].forEach((row, y) => [...row].forEach((ch, x) => { if (C[ch]) b.set(x, y, C[ch]); }));
  return b;
}

// The banana slug (round 6, note 11): banana yellow with dark spots, the mantle humped over its front third
// with the breathing pore low on it, a keel down its back to the pointed tail, a frilled foot, the two short
// feelers at its mouth, and two long eyestalks with a dark eye at each tip that wave as it goes (f, 0 to 3, is
// how far each leans). shy: touched, it has drawn its stalks in and bunched up shorter (note 10).
function slug(f, shy = false) {
  const b = new BM(26, 16); b.ox = 12; b.oy = 15;
  const F = 15, x0 = shy ? 5 : 4, x1 = shy ? 18 : 22;
  const h = x => shy ? (x < 7 ? 4 + (x - 5) : x < 12 ? 7 : Math.max(2, Math.round(7 - (x - 12) * 5 / 6))) : x < 7 ? x - 1 : x < 13 ? (x > 7 && x < 12 ? 7 : 6) : Math.max(1, Math.round(6 - (x - 13) * 5 / 9));
  const mantleEnd = shy ? 12 : 13;
  for (let x = x0; x <= x1; x++) { const top = F - h(x);
    for (let y = top; y <= F; y++) {
      let c = y === F ? ((x & 1) ? R.mustard[1] : R.yellow[0]) : y === F - 1 ? R.yellow[0] : y === top ? R.sun[2] : R.yellow[1];
      if (y > top && y < F - 1 && hash(x, y, 7101) < 0.13) c = R.bark[hash(x, y, 7102) < 0.5 ? 0 : 1];
      if (x === mantleEnd && y > top && y < F - 1) c = R.yellow[0];
      b.set(x, y, c);
    }
    if (hash(x, 1, 7103) < 0.25 && x > x0 + 1) b.set(x, top, R.white[1]);
  }
  b.set(mantleEnd - 2, F - 3, R.bark[0]);
  if (shy) b.set(x0 - 1, F - 2, R.mustard[2]);
  else {
    b.set(x0 - 1, F - 1, R.mustard[2]); b.set(x0 - 2, F - 1, R.mustard[2]); b.set(x0 - 1, F - 2, R.mustard[2]);
  }
  outline(b, INK);
  // The eyestalks, drawn over the outline so each stays one pixel thin: the far one darker, each leaning
  // forward by its own amount for the frame, with a dark eye at its tip.
  if (!shy) for (const [k, lean, col] of [[2, -0.1 + 0.3 * Math.cos(f * Math.PI / 2), R.mustard[1]], [0, -0.6 + 0.3 * Math.sin(f * Math.PI / 2), R.yellow[1]]]) {
    const bx = x0 + 1 + k, by = F - h(x0 + 1 + k) - 1;
    let ex = bx, ey = by;
    for (let j = 0; j <= 7; j++) { ex = Math.round(bx + Math.sin(lean) * j); ey = Math.round(by - Math.cos(lean) * j); b.set(ex, ey, col); }
    b.set(ex, ey, INK); b.set(ex, ey - 1, R.bark[1]);
  }
  return b;
}

// A hoary marmot. pose: 'sun' stretched flat on a rock, 'up' sitting to whistle.
function marmot(pose) {
  const b = new BM(18, 14); b.ox = 9; b.oy = 13;
  // A17, after a picture of hoary marmots on granite: a warm brown rump and dark tail, and over the
  // shoulders and back the pale grizzled cape it is named for, lit from the upper left; a white muzzle
  // with a black band across the face behind it, dark ears and black feet. The brown rump, the black band
  // and the outline keep it from reading as part of the grey rock it lies on.
  const grizzle = (x, y, lit) => { const h = hash(x, y, 2); return h < 0.28 ? R.dirt[lit ? 4 : 3] : h < 0.6 ? (lit ? R.white[0] : R.rock[4]) : lit ? R.rock[4] : R.rock[3]; };
  const rump = (ny, x, y) => pick('dirt', 0.42 - ny * 0.3 + 0.18 * (hash(x, y, 3) - 0.5), x, y, 0.5);
  if (pose === 'sun') {
    // Lying flat along the rock, head to the right.
    ell(b, 8, 10.5, 6.5, 2.6, (nx, ny, x, y) => nx > -0.25 && ny < 0.15 ? grizzle(x, y, ny < -0.45) : rump(ny, x, y));
    ell(b, 14, 10, 2.6, 2.2, (nx, ny, x, y) => nx > 0.62 ? R.white[1] : nx > -0.05 && ny > -0.55 ? INK : grizzle(x, y, ny < -0.3));
    b.set(13, 8, INK); b.set(17, 10, INK);
    thick(b, 2, 11, 0, 12, 2, R.bark[0]); b.set(1, 11, R.bark[1]); b.set(5, 13, INK); b.set(11, 13, INK); b.set(12, 13, INK);
  } else {
    // Up on its haunches, paws at its chest, head up to whistle.
    ell(b, 8, 9, 3.6, 4.4, (nx, ny, x, y) => ny < -0.05 - 0.2 * nx ? grizzle(x, y, nx < 0.1 && ny < -0.45) : rump(ny, x, y));
    ell(b, 9, 3.5, 2.6, 2.3, (nx, ny, x, y) => nx > 0.62 ? R.white[1] : nx > -0.05 && ny > -0.55 ? INK : grizzle(x, y, ny < -0.3));
    b.set(8, 1, INK); b.set(12, 3, INK);
    thick(b, 10, 8, 12, 9, 1, INK); thick(b, 4, 12, 1, 13, 2, R.bark[0]); b.set(7, 13, INK); b.set(10, 13, INK);
  }
  outline(b, INK);
  return b;
}

// A pika with a mouthful of flowers for its haystack. pose 'up': sitting bolt upright to call;
// 'peek': only its head, looking out of a gap in the rocks.
function pika(f, pose) {
  if (pose === 'up') {
    const u = new BM(9, 11); u.ox = 4; u.oy = 10;
    ell(u, 4, 7, 2.5, 3.1, nx => R.dirt[nx > 0.15 ? 4 : nx > -0.5 ? 3 : 2]);
    disc(u, 5, 3, 1.8, () => R.dirt[3]); u.set(4, 1, R.dirt[2]); u.set(5, 1, R.dirt[4]); u.set(6, 3, INK); u.set(7, 4, R.dirt[1]);
    u.set(3, 10, R.dirt[1]); u.set(6, 10, R.dirt[1]);
    outline(u, INK);
    return u;
  }
  if (pose === 'peek') {
    const h = new BM(7, 6); h.ox = 3; h.oy = 5;
    disc(h, 3, 3, 1.8, () => R.dirt[3]); h.set(2, 1, R.dirt[2]); h.set(3, 1, R.dirt[4]); h.set(4, 3, INK);
    outline(h, INK);
    return h;
  }
  const b = new BM(11, 8); b.ox = 5; b.oy = 7;
  ell(b, 5, 5, 3.6, 2.4, (nx, ny) => R.dirt[ny < -0.2 ? 3 : 2]);
  disc(b, 8, 3.5, 1.8, () => R.dirt[3]); b.set(7, 1, R.dirt[2]); b.set(8, 1, R.dirt[4]); b.set(9, 3, INK);
  if (f) { b.set(10, 4, R.moss[5]); b.set(10, 3, R.lupine[1]); b.set(10, 5, R.moss[4]); }
  b.set(3, 7, R.dirt[1]); b.set(7, 7, R.dirt[1]);
  outline(b, INK);
  return b;
}

// A pika that will not be walked up to (round 5, T47 and T66). It sits on its rock. When he comes
// within a few steps it sits bolt upright and calls, then bolts for a gap in the rocks. When he has
// gone on by it looks out, and when he is well away it comes back to its rock.
// step(t, away): away is how far he is from the rock, in pixels. It answers with what to draw: which
// picture (bm), how far along the way from the rock to the gap (go, 0 to 1), whether it hops (hop, 0
// to 1), or null while it is out of sight. `sit` is set while it is on its rock and at ease, so a scene
// can have it doing something there. called is true on the one step where it calls.
function shyPika() {
  const bm = { sit: pika(0), up: pika(0, 'up'), peek: pika(0, 'peek') }, NEAR = 70, DUCK = 44, CLEAR = 60, FAR = 130;
  let state = 'sit', since = 0;
  const to = (s, t) => { state = s; since = t; };
  return {
    called: false,
    reset() { state = 'sit'; since = 0; this.called = false; },
    // Clicked: it calls and bolts, wherever he is.
    startle(t) { if (state === 'sit') { to('up', t); return true; } return false; },
    step(t, away) {
      const u = t - since; this.called = false;
      if (state === 'sit' && away < NEAR) { to('up', t); this.called = true; }
      else if (state === 'up' && u > 0.35) to('run', t);
      else if (state === 'run' && u > 0.3) to('hid', t);
      else if (state === 'hid' && u > 1.2 && away > CLEAR) to('peek', t);
      else if (state === 'peek' && away < DUCK) to('hid', t);
      else if (state === 'peek' && u > 1.5 && away > FAR) to('back', t);
      else if (state === 'back' && u > 0.4) to('sit', t);
      const v = t - since;
      if (state === 'sit') return { bm: bm.sit, go: 0, hop: 0, sit: true };
      if (state === 'up') return { bm: bm.up, go: 0, hop: 0 };
      if (state === 'run') return { bm: bm.sit, go: Math.min(1, v / 0.3), hop: Math.abs(Math.sin(v / 0.3 * Math.PI * 2)) };
      if (state === 'back') return { bm: bm.sit, go: 1 - Math.min(1, v / 0.4), hop: Math.abs(Math.sin(v / 0.4 * Math.PI * 2)), back: true };
      // Looking out: the head comes up, and now and then ducks for a moment.
      if (state === 'peek') return frac(v / 2.6) > 0.86 ? null : { bm: bm.peek, go: 1, hop: 0, peek: true };
      return null;
    }
  };
}

// A mountain goat, white and shaggy, facing right. pose: 'stand', 'look' (head turned to watch), 'graze'.
function goat(pose, kid, step = 0) {
  const s = kid ? 0.7 : 1, b = new BM(26, 22); b.ox = 12; b.oy = 21;
  // Cream, not snow white, so a goat shows up standing on a snowfield.
  const wool = (nx, ny, x, y) => { const v = 3.4 - ny * 1.2 + (hash(x, y, 3) - 0.5); return v >= 3.1 ? R.white[1] : v >= 2.3 ? R.white[0] : R.gold[4]; };
  for (const [lx, far] of [[7, 1], [9, 0], [15, 1], [17, 0]]) { const X = lx * s + (kid ? 4 : 0), sw = step ? (far ? -1 : 1) * (step === 1 ? 1 : -1) : 0; thick(b, X, 14, X + sw, 20, 2, far ? R.gold[4] : R.white[0]); b.set(X + sw, 21, INK); }
  ell(b, 12 * s + (kid ? 4 : 0), 12, 7 * s, 4.2 * s, wool);
  ell(b, 9 * s + (kid ? 4 : 0), 9, 3 * s, 2.5 * s, wool);
  // A hump of long hair over the shoulders and a fringe hanging under the belly (art pass D06).
  ell(b, 15 * s + (kid ? 4 : 0), 10, 3 * s, 2.4 * s, wool);
  { const cx = 12 * s + (kid ? 4 : 0), rx = 7 * s; for (let x = Math.ceil(cx - rx + 1); x < cx + rx - 1; x++) { const yb = Math.round(12 + 4.2 * s * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2))); if (hash(x, 1, kid ? 7 : 5) < 0.7) b.set(x, yb + 1, R.white[0]); if (hash(x, 2, kid ? 7 : 5) < 0.3) b.set(x, yb + 2, R.gold[4]); } }
  const hx = (pose === 'look' ? 17 : pose === 'graze' ? 20 : 19) * s + (kid ? 4 : 0), hy = pose === 'look' ? 6 : pose === 'graze' ? (kid ? 12 : 14) : 7;
  thick(b, 16 * s + (kid ? 4 : 0), 10, hx, hy + 1, 3, R.white[1]);
  // The head is a long face in profile: a muzzle with a dark nose, an ear, and the shadow of the jaw
  // to set it off from the white of the neck.
  ell(b, hx + 1, hy, 2.6 * s, 2.2 * s, wool);
  b.set(hx + 3, hy + 1, R.white[1]); b.set(hx + 4, hy + 1, R.white[0]); b.set(hx + 4, hy, R.white[1]); b.set(hx + 5, hy + 1, INK);
  b.set(hx + 2, hy - 1, INK); b.set(hx - 1, hy - 2, R.white[0]); b.set(hx, hy + 2, R.gold[4]); b.set(hx + 1, hy + 2, R.gold[4]);
  if (!kid) {
    // A beard.
    thick(b, hx + 3, hy + 2, hx + 3, hy + 4, 1, R.white[0]);
  } else { b.set(hx + 1, hy - 3, INK); }
  litBack(b);
  outline(b, INK);
  // The horns go on after the outline, so they stay two thin spikes.
  if (!kid) for (const [dx, dy] of [[0, -3], [0, -4], [-1, -5], [-1, -6], [2, -3], [2, -4], [1, -5], [1, -6]]) b.set(hx + dx, hy + dy, INK);
  return b;
}

// A mountain bluebird, for the summit of Bluebird Forecast (redrawn larger in round 5, T51): sky blue
// above, paler on the breast and white under the tail, with dark wing tips, a thin dark bill and a dark
// eye. Flying, it has four wing frames (0 to 3: up, level, down, level). 'sit' is perched and 'call' is
// perched with its bill open and its tail flicked. All face right.
const BIRD = {
  body: ['...............MMMM', '..............MLLLLL', '.........MMMMMLLLLKLGG', '.DD....MMLLLLLLLLLLLL', 'DMMMMMMLLLLLLLLLLLPP', '.DMMMMLLLLLLLLPPPPPP', 'DD...LLLLPPPPPPPPPP', '.......WWPPPPPPPP', '.........WWWPP'],
  up: ['...DD', '...DLLM', '....DLLM', '....LLLLM', '.....LLLLM', '.....LLLLLM', '......LLLLLM', '......LLLLLLM', '.......LLLLLL'],
  down: ['.......LLLLLL', '......LLLLLLM', '......LLLLLM', '.....LLLLLM', '.....LLLLM', '....LLLLM', '....DLLM', '...DLLM', '...DD'],
  level: ['...DDMMMMMMMMM', '......LLLLLLLL'],
  sit: ['.....MMMM', '....MLLLLL', '....LLLLKLGG', '....LLLLLPP', '...MLLLPPPP', '..MMLLPPPPPP', '..MMLLPPPPPP', '..MMMLPPPPPP', '..DMMLLPPPWW', '..DMMMLPPWWW', '..DDMMLLWWW', '..DDMM.LWW', '.DDM...G.G', '.DD....G.G', 'DD.....GG.GG'],
};
function bluebird(f) {
  const ink = { K: INK, D: R.jay[1], M: R.jay[2], L: R.jay[3], P: R.ice[3], W: R.white[1], G: R.rock[0] };
  const put = (b, rows, x, y) => rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') b.set(x + i, y + j, ink[ch]); }));
  if (f === 'sit' || f === 'call') {
    const b = new BM(16, 18); b.ox = 8; b.oy = 16; put(b, BIRD.sit, 1, 1);
    // Calling: its bill opens and its head goes up a little.
    if (f === 'call') { b.set(11, 3, 0); b.set(12, 3, 0); b.set(11, 2, ink.G); b.set(12, 1, ink.G); b.set(11, 4, ink.G); }
    outline(b, INK);
    return b;
  }
  const b = new BM(26, 22); b.ox = 13; b.oy = 12; put(b, BIRD.body, 1, 8);
  if (f === 0) put(b, BIRD.up, 1, 2); else if (f === 2) put(b, BIRD.down, 1, 12); else put(b, BIRD.level, 1, f === 1 ? 10 : 11);
  outline(b, INK);
  return b;
}

// A little bird far off: a pair of wing strokes.
function speck(f) { const b = new BM(7, 4); b.ox = 3; b.oy = 2; (f ? [0, 1, 2, 2, 2, 1, 0] : [2, 2, 1, 2, 1, 2, 2]).forEach((y, x) => b.set(x, y, INK)); return b; }

export { ell, elk, sasquatch, jay, slug, owl, marmot, pika, shyPika, goat, bluebird, speck };
