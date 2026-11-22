// Drawings of the animals and the boat on the world map that came out of round 3's terrain.js: the
// ferry, the humpback, the bighorn ram and the squirrel or chipmunk. critters.js moves them.
import { clamp, smooth, frac, R, pick, BM, outline, litBack, thick, INK } from './core.js';
import { ell } from './fauna.js';

// The ferry, seen from the shore and a little above, lying along its course: bow down to the right.
// Both ends are alike, as on the boats that cross the Sound, so it sails back without turning round.
function ferry() {
  const b = new BM(50, 48); b.ox = 25; b.oy = 30;
  // u runs along the hull, v across it and z up. A deck is a slab with rounded ends: its far wall, its
  // near wall, then its top over both, which hides whatever of the far wall could not be seen.
  const dot = (u, v, z, c) => b.set(Math.round(b.ox + u * 0.83 + v * 0.56), Math.round(b.oy + u * 0.56 - v * 0.83 - z), c);
  const deck = (u0, U, V, r, z0, z1, wall, top) => {
    const half = u => { const e = Math.abs(u) - (U - r); return e <= 0 ? V : V * Math.sqrt(Math.max(0, 1 - e * e / (r * r))); };
    for (const side of [1, -1]) for (let u = -U; u <= U; u += 0.25) for (let z = z0; z < z1; z++) dot(u0 + u, side * half(u), z, wall(u, z - z0));
    for (let u = -U; u <= U; u += 0.25) { const h = half(u); for (let v = -h; v <= h; v += 0.25) dot(u0 + u, v, z1, top(u, v)); }
  };
  // Lit from above (art pass D07, after a ferry painted for the game): every flat top a step lighter than
  // the walls under it, the windows a dark band round each deck with thin white posts, and the open car
  // deck showing at both ends with a car or two on it.
  const W1 = R.white[1], W0 = R.white[0], WALL = R.gold[5], LOW = R.gold[4];
  // The hull: green at the waterline and along the car deck's rail, white between.
  const CARS = [[-17, 1.6, R.red[1]], [-16.5, -1.4, R.water[3]], [16.2, 1.4, R.yellow[1]], [17, -1.6, R.rock[1]]];
  deck(0, 19, 5, 3.5, 0, 3, (u, z) => z < 1 || z === 2 ? R.kit[0] : W0, (u, v) => {
    if (Math.abs(u) <= 14.5) return v < -4.2 + 0.6 ? LOW : W1;
    for (const [cu, cv, c] of CARS) if (Math.abs(u - cu) < 1.1 && Math.abs(v - cv) < 0.8) return c;
    return R.rock[3];
  });
  // Two tiers of passenger decks, each wall a band of windows two rows deep over a shaded foot (one row
  // breaks into dashes on the slant, where the rows above and below land on the same pixels), the upper
  // tier set back with a strip of shade on the deck in front of it.
  deck(0, 15, 4.2, 1.6, 3, 6, (u, z) => z === 0 ? LOW : R.navy[1], (u, v) => v < -2.8 && Math.abs(u) < 12.5 ? LOW : W1);
  deck(0, 12.5, 3.4, 1.4, 6, 9, (u, z) => z === 0 ? LOW : R.navy[1], () => W1);
  // A pilothouse at each end, dark glass all round, and the funnel between them banded green.
  for (const u0 of [-11, 11]) deck(u0, 1.8, 1.8, 0.8, 9, 11, (u, z) => z === 1 ? R.navy[1] : WALL, () => W1);
  deck(0, 1.6, 1.2, 0.8, 9, 13, (u, z) => z === 2 ? R.kit[0] : z === 3 ? R.kit[1] : WALL, () => R.kit[0]);
  outline(b, INK);
  return b;
}

// One drawing of the humpback's breach, or of its flukes going under. The body is a tapered tube along
// a spine that leaves the water at the bitmap's foot and leans to the left, the way it will fall.
// p.out: how much of its length is out, from the snout. p.head, p.tail: how steeply the two ends of
// that stand, in degrees. p.roll: where its belly is turned, 90 for away to the right, 0 for square to
// us. p.sweep: how far back its flippers trail. p.fluke: the tail instead, 0 upright to 1 tipping under.
// Nothing is drawn below the waterline and nothing outlines it there: the scene puts foam along it.
function whale(p) {
  p = p || { out: 0.68, head: 54, tail: 59, roll: 40, sweep: 0.2 };
  const b = new BM(120, 72); b.ox = 84; b.oy = 68;
  const D = Math.PI / 180, navy = R.navy, W1 = R.white[1], W0 = R.white[0], groove = R.rock[3];
  const layer = () => { const l = new BM(b.w, b.h); l.put = (x, y, c) => { if (y <= 0) l.set(b.ox + x, b.oy + y, c); }; return l; };
  // A part goes on over what is there. Its own outline is kept only where it crosses something already
  // drawn, so a white flipper shows against a white belly; the outer edge is inked once at the end.
  const lay = l => { const o = l.d.slice(); outline(l, INK); for (let i = 0; i < o.length; i++) { if (o[i]) b.d[i] = o[i]; else if (l.d[i] && b.d[i]) b.d[i] = INK; } };
  const key = (K, q) => { for (let i = 1; i < K.length; i++) if (q <= K[i][0]) return K[i - 1][1] + (K[i][1] - K[i - 1][1]) * (q - K[i - 1][0]) / (K[i][0] - K[i - 1][0]); return K[K.length - 1][1]; };
  if (p.fluke != null) {
    // The tail from behind as it dives: the stock, and the two flukes with their white undersides.
    const l = layer(), f = p.fluke, H = 15, squash = 1 - 0.7 * f, lean = -0.22;
    for (let y = 0; y <= H; y += 0.5) { const hw = 3.3 - 1.7 * y / H; for (let x = -hw; x <= hw; x += 0.5) l.put(x + lean * y, -y, x < -hw * 0.3 ? navy[2] : x > hw * 0.5 ? navy[0] : navy[1]); }
    const LEAD = [[0, -2], [0.3, -0.6], [0.6, 1.2], [0.85, 3], [1, 4.4]], TRAIL = [[0, 1.6], [0.15, 3.6], [0.4, 5.6], [0.7, 6], [0.9, 5.4], [1, 4.7]];
    for (const side of [-1, 1]) for (let q = 0; q <= 1; q += 0.02) {
      const lo = key(LEAD, q), hi = key(TRAIL, q), x = side * q * 14 + lean * H;
      for (let v = lo; v <= hi; v += 0.25) {
        const y = -H - v * squash + 3.2 * f * q, pale = q > 0.16 && q < 0.86 && v > lo + 1.3 && v < hi - 1.2 && (side < 0 || q < 0.7);
        l.put(x, y, pale ? W1 : v > hi - 1.2 || side > 0 ? navy[1] : navy[2]);
      }
    }
    lay(l); outline(b, INK);
    for (let i = (b.oy + 1) * b.w; i < b.d.length; i++) b.d[i] = 0;
    return b;
  }
  const L = 66, GIRTH = [[0, 0.44], [0.04, 0.62], [0.12, 0.83], [0.25, 0.98], [0.33, 1], [0.5, 0.86], [0.7, 0.52], [0.85, 0.26], [0.93, 0.16], [1, 0.12]];
  // The spine, every half pixel: a stretch of it under the water, so the body is cut level at the
  // waterline however far it leans, then from the waterline up to the snout.
  const n = Math.max(2, Math.ceil(p.out * L * 2)), sp = [];
  for (let i = 44; i > 0; i--) sp.push([Math.cos(p.tail * D) * 0.5 * i, Math.sin(p.tail * D) * 0.5 * i, p.tail * D, Math.min(1, p.out + i * 0.5 / L)]);
  for (let i = 0, x = 0, y = 0; i <= n; i++) { const w = i / n, th = (p.tail + (p.head - p.tail) * w) * D; sp.push([x, y, th, p.out * (1 - w)]); x -= Math.cos(th) * 0.5; y -= Math.sin(th) * 0.5; }
  const tip = sp.length - 1;
  const body = layer();
  // Only the box round the part of the spine that is out of the water, or just under it, needs looking at.
  let x0 = 0, x1 = 0, y0 = 0; for (const q of sp) if (q[1] <= 10) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); }
  for (let y = Math.max(-70, Math.floor(y0) - 10); y <= 0; y++) for (let x = Math.max(-84, Math.floor(x0) - 10); x <= Math.min(35, Math.ceil(x1) + 10); x++) {
    let bi = 0, bd = 1e9; for (let i = 0; i <= tip; i++) { const dx = x - sp[i][0], dy = y - sp[i][1], d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = i; } }
    const [px, py, th, s] = sp[bi], r = 8.5 * key(GIRTH, s), nx = Math.sin(th), ny = -Math.cos(th);
    // Past the snout the tube ends in a round nose.
    if (bd > (bi === tip ? r * 0.8 : r) * (bi === tip ? r * 0.8 : r) + 0.3) continue;
    const d = bi === tip ? Math.sign((x - px) * nx + (y - py) * ny) * Math.sqrt(bd) : (x - px) * nx + (y - py) * ny, rr = Math.max(r, Math.abs(d));
    // Where round the body this bit of skin is: 0 at the middle of the belly, 180 on the back.
    const a = Math.asin(d / rr) / D, off = Math.abs(((a - p.roll + 540) % 360) - 180);
    const lit = Math.sin(a * D) * (nx * -0.6 + ny * -0.75) + Math.cos(a * D) * 0.42;
    if (off < (s < 0.6 ? 60 : s < 0.82 ? 60 - (s - 0.6) * 140 : 29)) {
      // The belly: white, with the throat grooves running back from the chin as far as the navel.
      let line = false; if (s > 0.02 && s < 0.56) for (let k = -3; k <= 3 && !line; k++) { const g = (p.roll + k * 20) * D; if (Math.cos(g) > 0.1 && Math.abs(d - r * Math.sin(g)) < 0.5) line = true; }
      body.put(x, y, line ? groove : lit < -0.3 ? W0 : W1);
    } else body.put(x, y, navy[lit > 0.5 ? 2 : lit > -0.05 ? 1 : 0]);
  }
  // The eye, low on the dark of the head just above the corner of the mouth.
  for (const k of [-1, 1]) { const g = (p.roll + k * 86) * D; if (p.out > 0.2 && Math.cos(g) > 0.2) { const e = sp.find(q => q[3] <= 0.15), r = 8.5 * key(GIRTH, 0.15) * Math.sin(g); body.put(e[0] + Math.sin(e[2]) * r, e[1] - Math.cos(e[2]) * r, W1); } }
  // The flippers, a third of its length each: flung wide where they stand out to the side, short where they point at us.
  const flippers = [-1, 1].map(k => {
    if (p.out < 0.36) return null;
    const g = (p.roll + k * 62) * D, e = sp.find(q => q[3] <= 0.3), th = e[2], r = 8.5 * key(GIRTH, 0.3) * Math.sin(g);
    let vx = Math.sin(g) * Math.sin(th) + p.sweep * Math.cos(th), vy = -Math.sin(g) * Math.cos(th) + Math.cos(g) * 0.3 + p.sweep * Math.sin(th);
    const len = Math.hypot(vx, vy), reach = 22 * clamp(len, 0.5, 1) * smooth(0.36, 0.5, p.out); vx /= len; vy /= len;
    const l = layer();
    for (let q = 0; q <= 1; q += 0.5 / reach) {
      const bow = 2.2 * Math.sin(Math.PI * q) * k, cx = e[0] + Math.sin(th) * r + vx * reach * q - vy * bow, cy = e[1] - Math.cos(th) * r + vy * reach * q + vx * bow;
      const hw = (q < 0.12 ? 1.3 + 9 * q : 2.4 - 1.3 * q) + (Math.abs(frac(q * 4.2) - 0.5) < 0.14 ? 0.5 : 0);
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (dx * dx + dy * dy <= hw * hw) l.put(Math.round(cx) + dx, Math.round(cy) + dy, (dx * vy - dy * vx) * k > hw * 0.45 ? W0 : W1);
    }
    return { l, front: Math.cos(g) > 0 };
  });
  for (const f of flippers) if (f && !f.front) lay(f.l);
  lay(body);
  for (const f of flippers) if (f && f.front) lay(f.l);
  outline(b, INK);
  for (let i = (b.oy + 1) * b.w; i < b.d.length; i++) b.d[i] = 0;
  return b;
}

function sheep(grazing, step = 0) {
  // A bighorn ram: sandy brown, white rump and muzzle, and a heavy horn curling round the ear. The horn is
  // a thick ridged C, back over the ear and round under it toward the eye, outlined with the rest so it
  // reads at a glance (art pass D06, after a ram painted for the game).
  const b = new BM(24, 19); b.ox = 11; b.oy = 18;
  const coat = (nx, ny, x, y) => pick('dirt', 0.5 - ny * 0.3 - nx * 0.05, x, y, 0.5);
  for (const lx of [6, 8, 15, 17]) { const sw = step ? (lx % 2 ? -1 : 1) * (step === 1 ? 1 : -1) : 0; thick(b, lx, 12, lx + sw, 17, 1, R.dirt[lx % 2 ? 1 : 0]); b.set(lx + sw, 18, INK); }
  ell(b, 11, 10, 7, 4, coat); ell(b, 4.6, 9.6, 2.2, 2.8, nx => nx < 0.4 ? R.white[1] : R.white[0]);
  const hx = grazing ? 19 : 18, hy = grazing ? 12 : 6;
  thick(b, 16, 9, hx, hy + 1, 3, R.dirt[1]); ell(b, hx + 1, hy, 2.4, 2, coat); b.set(hx + 3, hy + 1, R.white[1]); b.set(hx + 4, hy + 1, R.white[0]);
  const ex = hx - 0.6, ey = hy - 0.3;
  for (let y = Math.floor(ey - 4); y <= Math.ceil(ey + 4); y++) for (let x = Math.floor(ex - 4); x <= Math.ceil(ex + 4); x++) {
    const dx = x - ex, dy = y - ey, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    if (a > -0.95 && a < 0.55) continue;
    if (d >= 1.5 && d <= 3.5) b.set(x, y, Math.floor((a + 4) * 2.2) % 2 ? R.dry[1] : dy < 0 || d < 2.5 ? R.dry[3] : R.dry[2]);
    // A dark edge where the horn lies over the coat, and the ear dark inside the curl.
    else if ((d > 3.5 && d < 4.2 || d < 1.5) && b.get(x, y)) b.set(x, y, R.dirt[0]);
  }
  b.set(hx + 2, hy - 1, INK);
  litBack(b);
  outline(b, INK);
  return b;
}
function squirrel(chip, run) {
  const b = new BM(10, 8), c = chip ? R.dirt : R.wood; b.ox = 5; b.oy = 7;
  if (run) { ell(b, 5, 5.6, 2.6, 1.3, () => c[3]); ell(b, 8, 4.8, 1.2, 1.1, () => c[3]); ell(b, 1.6, 4.4, 1.8, 1.1, () => c[2]); if (chip) { b.set(4, 5, R.white[1]); b.set(5, 5, R.white[1]); } b.set(8, 4, INK); }
  else {
    ell(b, 5.5, 5, 2.2, 1.8, () => c[3]); ell(b, 7.5, 3.5, 1.3, 1.2, () => c[3]); ell(b, 2.5, 3, 1.6, 2.6, () => c[2]);
    if (chip) { b.set(4, 4, R.white[1]); b.set(5, 4, R.white[1]); b.set(6, 4, R.white[1]); }
    b.set(8, 3, INK);
  }
  outline(b, INK);
  return b;
}

export { ferry, whale, sheep, squirrel };
