// The animals of the world map and the water that moves: herds that graze and wander, a moose and its calf, bears with cubs, squirrels
// and chipmunks that dart, marmots that sit up and whistle, birds that circle, a whale, jellyfish, the
// ferry, the mist, and the swells and the wash on the beach. The world scene draws them; so does the block-in page, at time 0.
import { TAU, clamp, lerp, smooth, frac, hash, vnoise, bayer, rng, R, INK, SHADE, KIND, RAMP_OF, BM, outline, litBack, thick, pick, veilTable, DEBUG, saw } from './core.js';
import { makeElk, makeMoose } from './sprites.js';
import { ell, goat, marmot, speck } from './fauna.js';
import { NW, NH } from './land.js';
import { makeCollide } from './collide.js';
import { inClear } from './events.js';
import { NAMES } from './content.js';

// A black bear on all fours, facing right. pose: 'look', 'sniff' with its nose in the grass. Its shoulders
// rise in a hump above its back, its ears are round and its muzzle tan, and its fur shines along the top
// (art pass D06, after a bear painted for the game).
// Round 8, D2, each after a picture: 'stand', up on her hind legs to look, her paws at her chest; 'rub', up
// against a trunk with her paws on it (step 1: reaching higher); 'dig', her head at the ground and her
// paws at it (step 0 and 1); 'nap', a low mound with her head on her paws (step 1: a breath in).
export function mapBear(pose, step = 0) {
  const up = pose === 'stand' || pose === 'rub', b = new BM(28, up ? 27 : 17); b.ox = 12; b.oy = b.h - 1;
  const fur = (nx, ny, x, y) => pick('fur', 0.42 - ny * 0.3 + 0.2 * (hash(x, y, 4) - 0.5), x, y, 0.6);
  const face = (hx, hy) => { b.set(hx + 2, hy, R.dirt[3]); b.set(hx + 3, hy, R.dirt[3]); b.set(hx + 3, hy + 1, R.dirt[2]); b.set(hx + 4, hy + 1, R.dirt[2]); b.set(hx + 5, hy + 1, INK); };
  if (up) {
    const lift = pose === 'rub' && step ? 1 : 0, hx = 14, hy = 6 - lift;
    thick(b, 9, 22, 9, 25, 3, R.fur[0]); thick(b, 13, 22, 14, 25, 3, R.fur[1]); b.set(15, 25, R.fur[1]);
    ell(b, 11.5, 15.5 - lift, 4.4, 7, fur); ell(b, 11, 20.5, 5, 3.6, fur); ell(b, hx, hy, 2.8, 2.6, fur);
    face(hx, hy - 1); b.set(hx - 2, hy - 3, R.fur[2]); b.set(hx - 1, hy - 4, R.fur[2]); b.set(hx + 1, hy - 3, R.fur[2]); b.set(hx + 1, hy - 1, R.white[1]);
    if (pose === 'rub') { thick(b, 13, 11 - lift, 19, 8 - 2 * lift, 2, R.fur[1]); thick(b, 13, 14 - lift, 19, 12 - lift, 2, R.fur[0]); }
    else { thick(b, 13, 12, 16, 15, 2, R.fur[1]); b.set(17, 15, R.fur[2]); }
    litBack(b); outline(b, INK); return b;
  }
  if (pose === 'nap') {
    ell(b, 11, 11.6 - (step ? 0.5 : 0), 9, 4.4 + (step ? 0.5 : 0), fur); ell(b, 6, 12.5, 4.6, 3.4, fur);
    ell(b, 20, 13, 2.9, 2.4, fur); face(20, 14); b.set(18, 10, R.fur[2]); b.set(19, 10, R.fur[2]); thick(b, 16, 15, 21, 16, 1, R.fur[1]);
    litBack(b); outline(b, INK); return b;
  }
  if (pose === 'dig') {
    for (const [lx, far] of [[6, 1], [8, 0]]) thick(b, lx, 9, lx, 15, 2, R.fur[far ? 0 : 1]);
    thick(b, 16, 10, 19 + step, 15, 2, R.fur[0]); thick(b, 18, 10, 21 - step, 15, 2, R.fur[1]);
    ell(b, 11, 7.6, 8, 4.4, fur); ell(b, 6.6, 6.6, 4, 4, fur); ell(b, 16, 7.4, 3.6, 3.6, fur);
    const hx = 21, hy = 12 + step; thick(b, 18, 8, hx - 1, hy, 4, R.fur[1]); ell(b, hx, hy, 2.6, 2.3, fur); face(hx - 1, hy + 1);
    b.set(hx - 2, hy - 3, R.fur[2]); b.set(hx - 1, hy - 3, R.fur[2]);
    litBack(b); outline(b, INK); return b;
  }
  for (const [lx, far] of [[6, 1], [8, 0], [16, 1], [18, 0]]) { const sw = step ? (far ? -1 : 1) * (step === 1 ? 1 : -1) : 0; thick(b, lx, 10, lx + sw, 15, 2, R.fur[far ? 0 : 1]); }
  ell(b, 12, 8, 8, 4.4, fur); ell(b, 7, 7.5, 4, 4, fur); ell(b, 15.5, 5.6, 3.9, 3.6, fur);
  const hx = pose === 'sniff' ? 22 : 22, hy = pose === 'sniff' ? 12 : 6;
  thick(b, 18, 7, hx - 1, hy, 4, R.fur[1]); ell(b, hx, hy, 2.8, 2.5, fur);
  b.set(hx + 2, hy, R.dirt[3]); b.set(hx + 3, hy, R.dirt[3]); b.set(hx + 3, hy + 1, R.dirt[2]); b.set(hx + 4, hy + 1, R.dirt[2]); b.set(hx + 3, hy + 2, R.dirt[1]); b.set(hx + 5, hy + 1, INK);
  for (const [x, y] of [[hx - 2, hy - 3], [hx - 1, hy - 3], [hx - 2, hy - 4], [hx + 1, hy - 3]]) b.set(x, y, R.fur[2]);
  b.set(hx + 1, hy - 1, R.white[1]);
  litBack(b);
  outline(b, INK);
  return b;
}
// A black bear cub, facing right: half its mother's length, with a cub's big head and round ears. pose: 'look';
// 'sniff', nose down; 'roll', on its back with its paws in the air; 'rear', up on its hind legs to bat at its
// twin; 'climb', seen from behind as it hugs a trunk; 'nap', curled up asleep (round 8, D2). step is the second drawing of each.
// Round 8, H2, each after a picture: 'dig', its head at the ground, its rump up and a paw raking forward;
// 'lean', up on its hind legs with both paws on a trunk in front of it (step 1: reaching higher).
export function mapCub(pose, step = 0) {
  const b = new BM(15, 12); b.ox = 7; b.oy = 11;
  const fur = (nx, ny, x, y) => pick('fur', 0.6 - ny * 0.3 + 0.2 * (hash(x, y, 9) - 0.5), x, y, 0.6), dark = R.fur[1];
  if (pose === 'nap') {
    ell(b, 6, 8.4, 4.2, 2.4, fur); ell(b, 10.4, 9, 2, 1.8, fur); b.set(9, 7, dark); b.set(12, 10, R.dirt[2]);
  } else if (pose === 'climb') {
    ell(b, 7, 7, 2.6, 3.2, fur); ell(b, 7, 3, 2.2, 1.8, fur); b.set(5, 1, dark); b.set(9, 1, dark);
    b.set(4, step ? 4 : 5, dark); b.set(10, step ? 5 : 4, dark); b.set(4, step ? 10 : 9, dark); b.set(10, step ? 9 : 10, dark);
  } else if (pose === 'rear') {
    ell(b, 6, 7, 2.5, 3.2, fur); ell(b, 7.5, 3, 2.1, 1.8, fur); b.set(6, 1, dark); b.set(8, 1, dark);
    b.set(10, 4, R.dirt[2]); thick(b, 8, 6, 10, step ? 5 : 7, 1, dark); b.set(5, 10, dark); b.set(7, 10, dark);
  } else if (pose === 'dig') {
    for (const [lx, far] of [[3, 1], [4, 0]]) thick(b, lx, 7, lx, 10, 1, R.fur[far ? 0 : 1]);
    ell(b, 6, 5.8, 3.6, 2.4, fur); ell(b, 4.2, 5, 2.2, 2.2, fur);
    thick(b, 8, 7, 10 + step, 10, 1, R.fur[0]); thick(b, 9, 7, 12 - step, 10, 1, dark);
    const hx = 11, hy = 8 + step; ell(b, hx, hy, 2, 1.7, fur); b.set(hx - 2, hy - 2, dark); b.set(hx, hy - 2, dark); b.set(hx + 2, hy + 1, R.dirt[3]);
  } else if (pose === 'lean') {
    ell(b, 6, 7.2, 2.4, 3.2, fur); ell(b, 7.6, 3 - step, 2.1, 1.8, fur); b.set(6, 1 - step, dark); b.set(8, 1 - step, dark);
    b.set(10, 3 - step, R.dirt[2]); thick(b, 8, 5, 12, 3 - step, 1, dark); thick(b, 8, 7, 12, 6 - step, 1, R.fur[0]); b.set(5, 10, dark); b.set(7, 10, dark);
  } else if (pose === 'roll') {
    ell(b, 6.5, 8, 3.6, 2.2, fur); ell(b, 11, 8, 2, 1.8, fur); b.set(13, 8, R.dirt[2]); b.set(11, 6, dark);
    b.set(4, step ? 5 : 4, dark); b.set(5, step ? 4 : 5, dark); b.set(8, step ? 4 : 5, dark); b.set(9, step ? 5 : 4, dark);
  } else {
    for (const [lx, far] of [[4, 1], [5, 0], [8, 1], [9, 0]]) { const sw = step ? (far ? -1 : 1) * (step === 1 ? 1 : -1) : 0; thick(b, lx, 8, lx + sw, 10, 1, R.fur[far ? 0 : 1]); }
    ell(b, 6.5, 6.5, 3.6, 2.3, fur);
    const hx = 11, hy = pose === 'sniff' ? 8 : 5;
    ell(b, hx, hy, 2.1, 1.8, fur); b.set(hx - 1, hy - 2, dark); b.set(hx + 1, hy - 2, dark); b.set(hx + 2, hy + 1, R.dirt[3]);
  }
  litBack(b);
  outline(b, INK);
  return b;
}
const tint = (bm, c) => { const o = new BM(bm.w, bm.h); o.ox = bm.ox; o.oy = bm.oy; for (let i = 0; i < bm.d.length; i++) if (bm.d[i]) o.d[i] = c; return o; };

// The humpback's breach, twelve drawings to the second up to the moment it lands. It comes out steep
// and fast and slows as it climbs, turns its belly up while it hangs, and tips over onto its back.
// whale() in mapfauna.js says what each number means.
const FPS = 12, IMPACT = 2.75;
export const BREACH = Array.from({ length: Math.ceil(IMPACT * FPS) + 1 }, (_, i) => {
  const u = i / FPS, rise = 1 - (1 - clamp(u / 1.3, 0, 1)) ** 2, hang = smooth(1.25, 1.8, u), fall = clamp((u - 1.75) / (IMPACT - 1.75), 0, 1) ** 2;
  return {
    out: 0.1 + 0.58 * rise + 0.02 * hang - 0.1 * fall, head: 66 - 6 * rise - 12 * hang - 44 * fall, tail: 66 - 6 * rise - 3 * hang - 41 * fall,
    roll: 90 - 28 * smooth(0.3, 1.3, u) - 38 * smooth(1.2, 1.9, u) - 14 * smooth(1.9, IMPACT, u), sweep: 1.1 - 0.9 * smooth(0.5, 1.5, u) - 0.3 * smooth(1.6, 2.6, u)
  };
});
// Where each river runs on across the tidal flat (T25): one byte a cell of the sea's corner, 2 for its water and
// 1 for the wet sand at its edge. Worked out once, from the ground's picture and the beach's slope, so it follows
// the rivers wherever a later change to the land puts their mouths.
function riverOnFlat(SEA, g, EBB, csAt) {
  const CHAN = new Uint8Array(SEA.cs.length), wet = new Set([R.water[3], R.water[4], ...R.glint]), seen = new Uint8Array(SEA.cs.length), mouths = [];
  // The mouths: each patch of river water lying within a few pixels of the high-water line.
  for (let j = 0; j < CHAN.length; j++) {
    const k = SEA.cs[j]; if (seen[j] || k < 1 || k > 6 || !wet.has(g[(SEA.y0 + ((j / SEA.w) | 0)) * NW + j % SEA.w])) continue;
    const q = [j]; seen[j] = 1; let sx = 0, sy = 0, n = 0;
    while (q.length) {
      const c = q.pop(), x = c % SEA.w, y = (c / SEA.w) | 0; sx += x; sy += y; n++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, m = ny * SEA.w + nx; if (nx < 0 || ny < 0 || nx >= SEA.w || ny >= SEA.h || seen[m]) continue; const km = SEA.cs[m]; if (km < 1 || km > 6 || !wet.has(g[(SEA.y0 + ny) * NW + nx])) continue; seen[m] = 1; q.push(m); }
    }
    if (n >= 4) mouths.push({ x: sx / n, y: SEA.y0 + sy / n, half: clamp(n / 11, 2.6, 3.4) });   // the patch is about 6 long, so this is half the river's width
  }
  const mark = (x, y, r) => { for (let dy = -Math.ceil(r + 2.2); dy <= Math.ceil(r + 2.2); dy++) for (let dx = -Math.ceil(r + 2.2); dx <= Math.ceil(r + 2.2); dx++) { const px = Math.round(x) + dx, py = Math.round(y) + dy - SEA.y0; if (px < 0 || py < 0 || px >= SEA.w || py >= SEA.h) continue; const d = Math.hypot(px - x, py + SEA.y0 - y), j = py * SEA.w + px; if (d <= r) CHAN[j] = 2; else if (d <= r + 2.2 && !CHAN[j]) CHAN[j] = 1; } };
  for (const [n, M] of mouths.entries()) {
    let x = M.x, y = M.y, dist = 0, gx0 = 0, gy0 = 0;
    for (let step = 0; step < 400; step++) {
      // Down the beach: toward where the low-water line lies, read over a wide enough reach that one ripple of the shore does not turn it.
      let gx = csAt(Math.round(x + 5), Math.round(y)) - csAt(Math.round(x - 5), Math.round(y)), gy = csAt(Math.round(x), Math.round(y + 5)) - csAt(Math.round(x), Math.round(y - 5)); const gl = Math.hypot(gx, gy);
      if (gl < 0.5) { gx = gx0; gy = gy0; } else { gx /= gl; gy /= gl; if (step) { gx = 0.7 * gx0 + 0.3 * gx; gy = 0.7 * gy0 + 0.3 * gy; const l = Math.hypot(gx, gy) || 1; gx /= l; gy /= l; } }
      if (!gx && !gy) break; gx0 = gx; gy0 = gy;
      const k = csAt(Math.round(x), Math.round(y)), f = clamp((k - 4) / EBB, 0, 1); if (k >= 4 + EBB + 3 || x < 2 || y > SEA.y0 + SEA.h - 2) break;
      const nx = -gy, ny = gx, swing = 3 * f * Math.sin(dist / 9 + n * 2.1);
      mark(x + nx * swing, y + ny * swing, M.half * (1 - 0.35 * f));
      // Two more threads leave the main one as the flat levels out, one to each side, and wander on their own.
      const b = smooth(0.22, 0.5, f), c = smooth(0.45, 0.75, f);
      if (b > 0) { const o = swing + b * (7.5 + 2 * Math.sin(dist / 6 + n)) + 1; mark(x + nx * o, y + ny * o, 1.7); }
      if (c > 0) { const o = swing - c * (7 + 1.8 * Math.sin(dist / 5 + 2 + n)) - 1; mark(x + nx * o, y + ny * o, 1.5); }
      x += gx; y += gy; dist++;
    }
  }
  return CHAN;
}
// opts.bear: true or false puts the bear there or not, whatever the dice say (the block-in page asks for it).
// opts.homes: 0 keeps every animal on its first home, a number above 0 seeds the draw of homes (see HOMES).
export function makeCritters(W, opts = {}) {
  const { sea: SEA, g } = W, items = [];
  // Homes (round 8, D1, TJ): habitat in land.js finds about five homes for each map animal, and on each load
  // they take theirs at random: the herd one, the bull moose one, each pair of goats its own, the band one,
  // each marmot and each squirrel its own, the family that visits the forest's edge one, the whale one for
  // its first breath, the osprey one place on the lake to fish, the eagle one sea stack. The family in the
  // clearing below the fall is always at home (T34). homes=0 in the address keeps every animal on the first
  // of its homes, the one it has had since it was added, for screenshots and the checks; homes=<n> draws the
  // same homes every time. spots, below, is the map's own list with this visit's homes in it.
  const HOMES = W.spots.homes || {}, homesAsked = typeof location !== 'undefined' && /[?&]homes=(\d+)/.exec(location.search), homesSeed = opts.homes != null ? opts.homes : homesAsked ? +homesAsked[1] : null;
  const draw = homesSeed === 0 ? null : homesSeed ? rng(9000 + homesSeed) : Math.random;
  // n of a list in an order the dice choose (all of it in its own order when nothing is drawn).
  const some = (list, n) => { const a = [...list]; if (draw) for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(draw() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
  const spots = (() => { const S = W.spots, has = k => HOMES[k] && HOMES[k].length; if (!draw) return S;
    const N = { ...S };
    if (has('elk') && S.elk.length) { const [x, y] = some(HOMES.elk, 1)[0], [x0, y0] = S.elk[0]; N.elk = S.elk.map(([a, b, d]) => [a + x - x0, b + y - y0, d]); }
    if (has('moose') && S.moose) N.moose = some(HOMES.moose, 1)[0];
    if (has('goat')) N.goats = some(HOMES.goat, S.goats.length / 2).flatMap(([x, y]) => [[x, y, 0], [x + 16, y + 6, 1]]);
    if (has('sheep')) N.sheep = some(HOMES.sheep, 1)[0];
    if (has('marmot')) N.marmots = some(HOMES.marmot, S.marmots.length);
    if (has('squirrel')) N.squirrels = some(HOMES.squirrel, S.squirrels.length).map(([x, y], n) => [x, y, S.squirrels[n][2]]);
    if (has('bear')) N.bear = some(HOMES.bear, 1)[0];
    if (has('whale')) N.whale = some(HOMES.whale, 1)[0];
    if (S.osprey && S.osprey.dives) N.osprey = { ...S.osprey, dive: some([S.osprey.dive, ...S.osprey.dives], 1)[0] };
    return N; })();
  // The sea stacks, found among the things that stand in the water, for the white water round their feet.
  const stacks = W.things.filter(th => !th.tree && th.bm && th.bm.h >= 14 && th.x < SEA.w && W.coast(th.x, th.y) > 14).map(th => ({ x: th.x, y: th.y, half: th.bm.w / 2, tall: th.bm.h, bm: th.bm, cs: W.coast(th.x, th.y) }));
  // The tide (E6). Every 100 s the sea draws back off the beach and comes in again: out over 36 s, low for
  // 16 s, in over 36 s, high for 12 s; the first low is 44 s after the page opens. At low water the line
  // stands far enough out that the two sea stacks nearest the beach stand on the bared flat with tide
  // pools round their feet (14 past the second of them). What it bares is wet sand: a shine of water just
  // above the line, ripple marks higher up. The jellyfish drift out ahead of it, so they stay afloat. The
  // sea left at low water is still most of the corner, so the whale, the ferry and the orcas keep to it.
  // tide=<seconds> in the address moves its clock on, for screenshots.
  const TIDE = 100, byCs = [...stacks].sort((a, b) => a.cs - b.cs), POOLED = byCs.slice(0, 2), EBB = POOLED.length > 1 ? POOLED[1].cs + 14 : 40;
  let tideAhead = typeof location !== 'undefined' ? +(/[?&]tide=([\d.]+)/.exec(location.search) || [])[1] || 0 : 0;
  const ebbAt = t => { const s = ((t + tideAhead) % TIDE + TIDE) % TIDE; return EBB * smooth(8, 44, s) * smooth(96, 60, s); };
  // Where each kind of mover may be (collide.js): the stacks and the tide above, the land's own rules.
  const col = makeCollide(W, { ebbAt, stacks });
  // A lane for something that sails or swims along the coast (round 5, T15): how far out it must keep at each
  // step along its way, smoothed so that it never comes nearer the shore than the rule asked anywhere: the
  // farthest out within k1 steps either side (sign 1: the greatest number, -1: the least), then the mean
  // within k2 (k2 no more than k1). A gap (null) stays a gap. Each mover has one lane for high water and one
  // for the lowest, and is somewhere between the two as the tide stands, so it moves out and back with the
  // water without a jump. (Until round 5 each was pushed clear afresh every frame, which at low water threw
  // the ferry 20 px from one frame to the next and now and then left it aground.)
  function onSeaAt(x, y) { x = Math.round(x); y = Math.round(y); return x >= 0 && x < SEA.w && y >= SEA.y0 && y < SEA.y0 + SEA.h; }
  const lane = (raw, sign, k1, k2) => { const n = raw.length, far = raw.map((v, i) => { if (v == null) return null; let m = v; for (let j = Math.max(0, i - k1); j <= Math.min(n - 1, i + k1); j++) if (raw[j] != null && sign * raw[j] > sign * m) m = raw[j]; return m; });
    return far.map((v, i) => { if (v == null) return null; let t = 0, c = 0; for (let j = Math.max(0, i - k2); j <= Math.min(n - 1, i + k2); j++) if (far[j] != null) { t += far[j]; c++; } return t / c; }); };
  // The jellyfish (round 5, T26) work the same way with two homes each: where it floats at high water (its
  // own spot, or the nearest water round it with 8 px to spare, since it drifts up to 6 from there) and where it floats at the
  // lowest (the nearest such water from there that it can reach in a straight line with room all the way as
  // the tide falls, so it never drifts through a stack or over the flats). The tide picks the point between.
  const JELLY = spots.jelly.map(([jx, jy]) => {
    // Nor may it float where a stack's drawing stands over the water behind its foot: there it showed as a
    // jelly stuck to the side of the rock.
    const hidden = (x, y) => stacks.some(s => Math.abs(x - s.x) < s.half + 4 && y < s.y + 2 && y > s.y - s.tall - 4);
    const room1 = (x, y, ebb) => onSeaAt(x, y) && !hidden(x, y) ? col.room('floater', x, y, { ebb }, 2) : -1, DRIFT = [[5, 0], [-5, 0], [0, 2.5], [0, -2.5], [5, 2.5], [-5, 2.5], [5, -2.5], [-5, -2.5]];
    // The room at a spot, or -1 if any point of the drift round it is short of water.
    const room = (x, y, ebb) => DRIFT.every(([a, b]) => room1(x + a, y + b, ebb) >= 1) ? room1(x, y, ebb) : -1, ring = (cx, cy, fits) => { for (let r = 0; r <= 150; r += 3) for (let a = 0; a < (r ? 16 : 1); a++) { const x = cx + r * Math.cos(a * TAU / 16), y = cy + r * Math.sin(a * TAU / 16); if (fits(x, y)) return [x, y]; } return null; };
    const lowFrom = hi => ring(hi[0], hi[1], (x, y) => { if (room(x, y, EBB) < 8) return false; const n = Math.ceil(Math.hypot(x - hi[0], y - hi[1])); for (let k = 1; k < n; k++) if (room(lerp(hi[0], x, k / n), lerp(hi[1], y, k / n), EBB * k / n) < 7) return false; return true; });
    // A high-water home with no clear way out (a pocket between two stacks) is passed over for the next nearest.
    // None is nearer the shore than 50 from the high-water line, the nearest their own spots may be (land.js).
    let lo = null; const hi = ring(jx, jy, (x, y) => W.coast(x, y) >= 50 && room(x, y, 0) >= 8 && !!(lo = lowFrom([x, y])));
    return hi && { hi, lo }; });
  const jellyAt = (k, t) => { const J = JELLY[k]; if (!J) return null; const e = ebbAt(t) / EBB, x = lerp(J.hi[0], J.lo[0], e) + 5 * Math.sin(t * 0.05 + k * 2), y = lerp(J.hi[1], J.lo[1], e) + 2.5 * Math.sin(t * 0.07 + k); return col.canBe('floater', x, y, t, 2) ? [x, y] : null; };
  const onSea = (x, y) => onSeaAt(x, y);
  // The map animals the debug menu can place (C4), and the homes each one's own rule chose for it (habitat in land.js).
  const SPAWN = ['elk', 'moose', 'goat', 'sheep', 'bear', 'marmot', 'squirrel', 'eagle', 'osprey'];
  // A band of sheep's home is where its first ram stands; the bears' first home is the clearing's family's.
  const homesOf = k => k === 'eagle' ? TOPS.map(p => [p.x, p.s.y]) : k === 'osprey' ? (OSPREY ? OSPREY.dives : []) : k === 'bear' ? [...(spots.bearHome ? [spots.bearHome.slice(0, 2)] : []), ...(HOMES.bear || [])] : k === 'sheep' ? (HOMES.sheep || []).map(b => b[0].slice(0, 2)) : (HOMES[k] || []).map(h => h.slice(0, 2));
  // Where the trees stand, so a wandering animal goes round them, and the ground just behind anything
  // tall (a tree, a snag, a big rock), where it would stand hidden.
  const CELL = 8, GW = Math.ceil(NW / CELL), GH = Math.ceil(NH / CELL), wood = new Uint8Array(GW * GH), bole = new Uint8Array(GW * GH), hid = new Uint8Array(GW * GH);
  for (const th of W.things) {
    if (th.tree) { wood[Math.floor(th.y / CELL) * GW + Math.floor(th.x / CELL)] = 1; if (!th.tree.low) bole[Math.floor(th.y / CELL) * GW + Math.floor(th.x / CELL)] = 1; }
    const w = th.tree ? th.tree.w : th.bm.w, h = th.tree ? th.tree.h : th.bm.h; if (h < 14) continue;
    for (let y = th.y - Math.min(h, 34) + 5; y <= th.y + 1; y += CELL / 2) for (let x = th.x - w / 2 - 3; x <= th.x + w / 2 + 3; x += CELL / 2) { const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL); if (cx >= 0 && cy >= 0 && cx < GW && cy < GH) hid[cy * GW + cx] = 1; }
  }
  const kindAt = (x, y) => KIND[g[Math.round(y) * NW + Math.round(x)]];
  const clear = (x, y) => x > 8 && y > 8 && x < NW - 8 && y < NH - 4 && W.open(x, y) && !wood[Math.floor(y / CELL) * GW + Math.floor(x / CELL)] && !wood[Math.floor((y - 5) / CELL) * GW + Math.floor(x / CELL)] && !hid[Math.floor(y / CELL) * GW + Math.floor(x / CELL)];
  const meadow = (x, y) => clear(x, y) && kindAt(x, y) >= 1 && kindAt(x, y) <= 3 && W.forestAmt(x, y) < 0.45 && !W.nearTrail(x, y, 5);
  // A straight line an animal may walk: every 3 px of it is ground it may stand on. (Until E9 it was tried at
  // five points however long it was, and a bear could step over a creek between two of them.)
  // A straight line is clear if every pixel an animal would be drawn on along it is (two looks to the pixel:
  // until round 8, D1, it looked every 3, and a creek or a ledge a pixel or two wide slipped between two looks).
  const way = (ok, x0, y0, x1, y1) => { const n = Math.max(5, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2)); for (let k = 1; k <= n; k++) if (!ok(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n)) return false; return true; };
  // One step of an animal that walks on land (round 8, D1): it never sets foot on a pixel no land animal may
  // stand on. The look along the line before it set off (way) samples the line, and a line can clip the corner
  // of a pixel between two samples, so now and then one was drawn for a frame on a cliff's edge or a bank.
  // False means it did not move, and the caller stops it where it is.
  const step = (a, nx, ny) => { const X = Math.round(nx), Y = Math.round(ny); if ((X !== a.x || Y !== a.y) && !col.canBe('land', X, Y, 0) && col.canBe('land', a.x, a.y, 0)) return false; a.fx = nx; a.fy = ny; a.x = X; a.y = Y; return true; };

  // ---- the animals that graze and wander ----------------------------------------------------
  // Round 8, D2: each also has the drawings of its acts (ACTS, below), a list to each act.
  const elkBull = { look: makeElk(false), graze: makeElk(true), walk: [makeElk(false, 1), makeElk(false, 2)], bugle: [makeElk(false, 0, true, 'bugle')], bed: [0, 1].map(k => makeElk(false, k, true, 'bed')), thrash: [0, 1].map(k => makeElk(false, k, true, 'thrash')) };
  const elkCow = { look: makeElk(false, 0, false), graze: makeElk(true, 0, false), walk: [makeElk(false, 1, false), makeElk(false, 2, false)], bed: [0, 1].map(k => makeElk(false, k, false, 'bed')) };
  const goatF = kid => ({ look: goat('look', kid), stand: goat('stand', kid), graze: goat('graze', kid), walk: [goat('stand', kid, 1), goat('stand', kid, 2)], bed: [goat('lie', kid)], butt: [goat('butt', kid)] });
  const goats = [goatF(false), goatF(true)];
  const ram = { look: W.make.sheep(false), graze: W.make.sheep(true), walk: [W.make.sheep(false, 1), W.make.sheep(false, 2)], bed: [W.make.sheep(false, 0, 'lie')], butt: [W.make.sheep(false, 0, 'butt')], rear: [W.make.sheep(false, 0, 'rear')] };
  const bearF = { look: mapBear('look'), graze: mapBear('sniff'), walk: [mapBear('look', 1), mapBear('look', 2)], upright: [mapBear('stand')], rub: [0, 1].map(k => mapBear('rub', k)), dig: [0, 1].map(k => mapBear('dig', k)), bed: [0, 1].map(k => mapBear('nap', k)) };
  const rand = rng(77);
  // faces: the way the drawing looks, -1 left or 1 right. r: how far it strays from where it was put.
  // An animal is put where it was meant to stand, or on the nearest ground it may stand on if a tree has since been planted there.
  const settle = (ok, x, y) => { if (ok(x, y)) return [x, y]; for (let r = 3; r <= 60; r += 3) for (let k = 0; k < 20; k++) { const an = k / 20 * TAU, px = Math.round(x + Math.cos(an) * r), py = Math.round(y + Math.sin(an) * r * 0.6); if (ok(px, py)) return [px, py]; } return [x, y]; };
  // Each keeps to its own country (o.ok) and to the ground any land animal may stand on (collide.js: firm,
  // open, clear of the buildings).
  // Where it may stop is its country (o.ok); what it may walk across on the way is any ground a land animal
  // may stand on that is not a tree's foot (pass), so it can go behind a tree, through the sage or over a trail to the next open patch.
  // The ground is asked about at the pixel the animal is drawn on (round 8, D1: asked at the exact spot, one
  // could be drawn a pixel past where it may be, which the engine rules count).
  const pass = (x, y) => col.canBe('land', Math.round(x), Math.round(y), 0) && !bole[Math.floor(y / CELL) * GW + Math.floor(x / CELL)];
  const walker = (kind, f, x0, y0, o) => { const own = o.ok; o = { ...o, ok: (x, y) => own(x, y) && col.canBe('land', Math.round(x), Math.round(y), 0) }; const [x, y] = settle(o.ok, x0, y0); items.push({ critter: kind, col: 'land', walker: true, f, bm: f.graze, x, y, hx: x, hy: y, h0: [x, y], st: o.start || 'graze', until: 2 + rand() * 12, flip: rand() < 0.5, tx: x, ty: y, fx: x, fy: y, ...o }); };
  // The herd keeps together: each elk strays only a little from its own place in it.
  spots.elk.forEach(([x, y, d], n) => walker('elk', n === 0 ? elkBull : elkCow, x, y, { faces: -1, r: 22, v: 6, ok: meadow, start: d ? 'graze' : 'look', does: n === 0 ? ['graze', 'bugle', 'bed', 'thrash', 'trot'] : ['graze', 'look', 'bed', 'bark', 'trot'] }));
  spots.goats.forEach(([x, y, kid], n) => walker('goat', goats[kid ? 1 : 0], x, y, { faces: 1, r: kid ? 16 : 30, v: kid ? 10 : 6, ok: clear, start: n & 1 ? 'look' : 'graze', mum: kid ? items[items.length - 1] : null, does: kid ? ['graze', 'hop', 'butt', 'bed', 'trot'] : ['look', 'graze', 'bed', 'hop', 'butt'] }));
  // A goat on the ledge (round 8, H3): a billy by himself on the grassy ledge halfway up the larch basin's
  // wall, where goats like to stand. The ledge's pixels are his country (spots: he walks from one of them to
  // another), and land.js makes them ground a land animal may stand on.
  if (spots.ledge && spots.ledge.length) { const run = spots.ledge, on = new Set(run.map(([x, y]) => y * NW + x)), [x, y] = run[run.length >> 1];
    walker('goat', goats[0], x, y, { faces: 1, r: 18, v: 4, ok: (px, py) => { const i = Math.round(py) * NW + Math.round(px); return on.has(i) || on.has(i - NW) || on.has(i + NW); }, start: 'look', spots: run, does: ['look', 'graze', 'bed', 'hop', 'trot'] }); }
  spots.sheep.forEach(([x, y, d]) => walker('sheep', ram, x, y, { faces: 1, r: 34, v: 6, ok: clear, roam: 0.6, start: d ? 'graze' : 'look', does: ['graze', 'butt', 'bed', 'trot', 'look'] }));
  // The moose (T35): a bull and a calf that wander the riverside woods together, the calf at his heels (it
  // follows him as a kid follows its nanny). They keep off the trail.
  const mooseF = calf => { const look = makeMoose(calf, false), graze = makeMoose(calf, true), f = { look, graze, walk: [makeMoose(calf, false, 1), makeMoose(calf, false, 2)], bed: [0, 1].map(k => makeMoose(calf, false, k, 'bed')) };
    // The bull's shake goes through the level head between the two swings; at the water his head goes under and comes up with weed.
    if (!calf) { f.shake = [look, makeMoose(false, false, 1, 'shake'), look, makeMoose(false, false, 2, 'shake')]; f.dip = [graze, makeMoose(false, false, 0, 'weeds'), graze, makeMoose(false, false, 1, 'weeds')]; }
    return f; };
  if (spots.moose) { const inWoods = (x, y) => clear(x, y) && !W.nearTrail(x, y, 10);
    walker('moose', mooseF(false), spots.moose[0], spots.moose[1], { faces: -1, r: 64, v: 5, ok: inWoods, roam: 0.7, start: 'look', does: ['graze', 'shake', 'dip', 'bed', 'trot'] });
    walker('moose', mooseF(true), spots.moose[0] + 16, spots.moose[1] + 5, { faces: -1, r: 15, v: 9, ok: inWoods, roam: 0.3, mum: items[items.length - 1], does: ['graze', 'hop', 'bed', 'look', 'trot'] }); }
  const asked = typeof location !== 'undefined' && /[?&]bear=([01])/.exec(location.search);
  // The bears (round 5, T34 and T44): each is a sow with two cubs. The cubs keep within a few pixels of her:
  // when she moves off they trail her, one at each side, and while she stays they sniff about, roll on their
  // backs, rear up and bat at each other, and now and then one climbs a step up the nearest trunk, clings
  // there and comes down. A cub is not a walker: cubStep moves it.
  const cubF = { look: mapCub('look'), sniff: mapCub('sniff'), walk: [mapCub('look', 1), mapCub('look', 2)], roll: [mapCub('roll'), mapCub('roll', 1)], rear: [mapCub('rear'), mapCub('rear', 1)], climb: [mapCub('climb'), mapCub('climb', 1)], nap: mapCub('nap'), dig: [mapCub('dig'), mapCub('dig', 1)], lean: [mapCub('lean'), mapCub('lean', 1)] };
  // v: a cub's speed. near, far: how far from her it may be while she walks, and while she stays. up: seconds to climb. high: how far up.
  const CUB = { v: 13, near: 28, far: 34, up: 1.3, high: 6 };
  const TRUNKS = W.things.filter(th => th.tree && !th.tree.low && th.tree.h >= 18).map(th => ({ x: th.x, y: th.y, w: th.tree.w, h: th.tree.h }));
  // The nearest trunk a cub may climb: close to it and to her (the start button reaches twice as far), with no other tree standing in front of its foot.
  const trunkFor = (a, reach = 22) => { let top = null, bd = reach; for (const T of TRUNKS) { const d = Math.hypot(T.x - a.fx, (T.y - a.fy) / 0.6); if (d >= bd || Math.hypot(T.x - a.mum.fx, (T.y - a.mum.fy) / 0.6) > reach + 8) continue; if (TRUNKS.some(Q => Q !== T && Q.y > T.y && Q.y - T.y < Math.min(Q.h, 30) && Math.abs(Q.x - T.x) < Q.w / 2 + 2)) continue; top = T; bd = d; } return top; };
  const cubOf = (sow, n, twin) => { const [ax, ay] = besideHer({ mum: sow, n, sib: twin }, 22, 3 + n), x = Math.round(sow.x + ax), y = Math.round(sow.y + ay); return { critter: 'bear', col: 'land', cub: true, mum: sow, n, f: cubF, bm: cubF.look, x, y, fx: x, fy: y, hx: x, hy: y, tx: x, ty: y, st: 'idle', pose: 'look', until: 1 + rand() * 4, flip: rand() < 0.5, hop: 0, lift: 0 }; };
  // A family needs room: she is put on the nearest ground to her spot, up to 90 away, that has a clear place for a cub on each side of her.
  const family = (x, y, o, roamer) => { const g = (px, py) => o.ok(px, py) && land(px, py), room = (px, py) => g(px, py) && way(g, px, py, px - 22, py + 3) && way(g, px, py, px + 22, py + 4) && land(px - 27, py + 3) && land(px + 27, py + 4);
    if (!room(x, y)) search: for (let r = 4; r <= 90; r += 4) for (let k = 0; k < 20; k++) { const px = Math.round(x + Math.cos(k / 20 * TAU) * r), py = Math.round(y + Math.sin(k / 20 * TAU) * r * 0.6); if (room(px, py)) { x = px; y = py; break search; } }
    walker('bear', bearF, x, y, { ...o, does: ['graze', 'upright', 'rub', 'dig', 'bed'] }); const sow = items[items.length - 1]; sow.sow = true; sow.roamer = roamer; const first = cubOf(sow, 0), cubs = [first, cubOf(sow, 1, first)]; cubs[0].sib = cubs[1]; cubs[1].sib = cubs[0]; items.push(...cubs); return sow; };
  const rest = (a, t, wait) => { a.st = 'idle'; a.hop = a.lift = 0; a.until = t + wait; };
  // Back to its own side of her, clear of her drawing: or, where she stands against trees or the trail, the
  // other side, or the grass just in front of her feet, and never its twin's place. The first of these she could walk to herself in a
  // straight line, with dry ground 5 either side of it, so no creek lies between it and her or under its paws. A cub crosses nothing a land animal may not (collide.js):
  // landWay is a straight line clear of all that.
  const land = (x, y) => col.canBe('land', Math.round(x), Math.round(y), 0), landWay = (x0, y0, x1, y1) => way(land, x0, y0, x1, y1);
  const besideHer = (a, d, dy) => { const M = a.mum, B = a.sib, sd = a.n ? 1 : -1, tw = !B ? null : B.st === 'walk' && B.goal === 'mum' ? [M.fx + B.off[0], M.fy + B.off[1]] : [B.fx, B.fy];
    for (const o of [[sd * d, dy], [-sd * d, dy + 1], [sd * d, -1], [-sd * d, -2], [sd * d, dy + 7], [-sd * d, dy + 8], [sd * 13, 7], [-sd * 13, 8]]) { const x = M.fx + o[0], y = M.fy + o[1]; if (tw && Math.hypot(x - tw[0], y - tw[1]) < 10) continue; if (M.ok(x, y) && land(x, y) && land(x - 5, y) && land(x + 5, y) && way(M.ok, M.fx, M.fy, x, y)) return o; }
    // Nothing at her side: the nearest ground a cub may stand on, so a cramped spot never puts one in the water or a rock.
    for (let r = 4; r <= 26; r += 2) for (let k = 0; k < 12; k++) { const o = [Math.round(Math.cos(k / 12 * TAU) * r), Math.round(Math.sin(k / 12 * TAU) * r * 0.6)]; if (land(M.fx + o[0], M.fy + o[1]) && way(land, M.fx, M.fy, M.fx + o[0], M.fy + o[1])) return o; }
    return [0, 1]; };
  const toSide = a => { a.st = 'walk'; a.goal = 'mum'; a.hop = a.lift = 0; a.off = besideHer(a, 21 + rand() * 5, 3 + rand() * 4); };
  function cubStep(a, dt, t) {
    const M = a.mum, B = a.sib, side = a.n ? 1 : -1, dM = Math.hypot(a.fx - M.fx, (a.fy - M.fy) / 0.6);
    if (a.st === 'climb') {
      const T = a.trunk, s = t - a.t0;
      if (dM > CUB.far + 8 && s < CUB.up + a.hold) a.hold = Math.max(0, s - CUB.up);   // she has moved off, so down it comes
      const h = CUB.high * smooth(0, CUB.up, s) * smooth(2 * CUB.up + a.hold, CUB.up + a.hold, s), cling = s > CUB.up && s < CUB.up + a.hold;
      // Drawn just in front of the tree it is on, lifted up the trunk.
      a.x = T.x; a.y = T.y + 1; a.hop = a.lift = 1 + Math.round(h); a.flip = false; a.bm = a.f.climb[cling ? 0 : Math.floor(t * 5) & 1];
      // Down at the trunk's foot, on the first ground beside it a cub may stand on (round 8, D2: it used to step off
      // to one fixed side, which at some trunks is a bank or a rock's foot).
      if (s >= 2 * CUB.up + a.hold) { const o = [[side * 3, 2], [-side * 3, 2], [0, 1], [side * 5, 3], [-side * 5, 3], [side * 3, 4], [-side * 3, 4], [0, 3]].find(([dx, dy]) => land(T.x + dx, T.y + dy)) || [0, 1];
        a.fx = T.x + o[0]; a.fy = T.y + o[1]; a.x = Math.round(a.fx); a.y = Math.round(a.fy); a.goal = null; a.pose = 'look'; rest(a, t, 1 + rand() * 2); }
      return;
    }
    // Asleep in a ball (round 8, D2): until it has slept enough, or she walks off, or wakes while it napped beside her.
    if (a.st === 'nap') { a.bm = a.f.nap; a.hop = 0; if (t < a.until && dM <= CUB.far + 6 && !(a.withHer && !(M.st === 'act' && M.act === 'bed'))) return; a.withHer = false; a.pose = 'look'; rest(a, t, 0.6 + rand() * 2); }
    if (a.st === 'roll') { a.bm = a.f.roll[Math.floor((t - a.t0) * 3.5) & 1]; if (t < a.until && dM <= CUB.far + 6) return; a.pose = 'look'; rest(a, t, 0.6 + rand() * 2); }
    // It copies her (round 8, H2). While she digs it digs beside her, a moment longer than she does.
    if (a.st === 'dig') { a.bm = a.f.dig[Math.floor(t * 4 + a.n) & 1]; if (t < a.until && dM <= CUB.far + 6 && M.st !== 'walk') return; a.pose = 'look'; rest(a, t, 0.5 + rand() * 1.5); }
    // And it tries the trunk she has just rubbed: up against it where she stood, reaching, then down.
    if (a.st === 'lean') { const s = t - a.t0; a.bm = a.f.lean[Math.floor(s * 2.2) & 1]; a.hop = Math.floor(s * 2.2) & 1; if (t < a.until && dM <= CUB.far + 40) return; a.hop = 0; toSide(a); return; }
    if (a.st === 'play') {
      a.bm = a.f.rear[Math.floor(t * 3.2 + a.n * 0.5) & 1]; a.flip = B.fx < a.fx; a.hop = (Math.floor(t * 3.2) + a.n) % 4 === 0 ? 1 : 0;
      if (t < a.until && dM <= CUB.far + 6 && B.st === 'play') return;
      if (B.st === 'play') toSide(B); toSide(a);
    }
    if (a.st === 'walk') {
      if (a.goal === 'mum') { if (!M.ok(M.fx + a.off[0], M.fy + a.off[1])) a.off = besideHer(a, 22, 4); a.tx = M.fx + a.off[0]; a.ty = M.fy + a.off[1]; }
      const dx = a.tx - a.fx, dy = a.ty - a.fy, d = Math.hypot(dx, dy);
      if (d >= 0.8) {
        const st = Math.min(d, CUB.v * dt), nx = a.fx + dx / d * st, ny = a.fy + dy / d * st;
        // Water or a cliff ahead: it makes straight for her instead, along the way she came, or waits.
        if (!land(nx, ny) && land(a.fx, a.fy)) { if (a.goal === 'mum' && Math.abs(a.off[0]) > 5) a.off = [side * 5, 6]; else { a.pose = 'look'; rest(a, t, 1.5); a.bm = a.f.look; } return; }
        a.fx = nx; a.fy = ny; a.x = Math.round(a.fx); a.y = Math.round(a.fy);
        if (Math.abs(dx) > 0.5) a.flip = dx < 0; a.bm = a.f.walk[Math.floor(t * 7 + a.n) & 1]; return;
      }
      if (a.goal === 'trunk') { a.st = 'climb'; a.t0 = t; a.hold = 1.5 + rand() * 2.5; return; }
      if (a.goal === 'dig' && M.st === 'act' && M.act === 'dig') { a.st = 'dig'; a.goal = null; a.flip = a.hole < a.fx; a.until = M.until + 0.5 + 0.7 * a.n; return; }
      if (a.goal === 'lean') { a.st = 'lean'; a.goal = null; a.t0 = t; a.flip = a.trunk.x < a.fx; a.until = t + 3 + rand() * 2.5; return; }
      if (a.goal === 'twin' && B.st === 'idle' && Math.hypot(B.fx - a.fx, B.fy - a.fy) < 11) { a.st = B.st = 'play'; a.until = B.until = t + 2.5 + rand() * 2.5; return; }
      if (a.goal === 'mum' && M.st === 'walk') { a.bm = a.f.look; return; }
      a.pose = 'look'; rest(a, t, 1 + rand() * 3);
    }
    a.bm = a.pose === 'sniff' ? a.f.sniff : a.f.look;
    if (M.st === 'walk' ? dM > CUB.near : dM > CUB.far) { toSide(a); return; }
    // She has begun to dig (H2): it comes round to the hole, across it from her, and digs too. Once for each time she digs.
    if (M.st === 'act' && M.act === 'dig' && a.dug !== M.t0) { a.dug = M.t0; const d = dirOf(M), x = M.fx + d * (24 + 2 * a.n), y = M.fy + (a.n ? 6 : -1);
      if (land(x, y) && landWay(a.fx, a.fy, x, y)) { a.tx = x; a.ty = y; a.hole = M.fx + d * 13; a.goal = 'dig'; a.st = 'walk'; return; } }
    // She has just rubbed a trunk (H2): one cub goes to try it, on the side she did not stand, and its twin after it.
    const Rb = M.rubbed;
    if (Rb && a.leant !== Rb.t && t - Rb.t < 20 && M.st !== 'walk' && !(B.st === 'lean' || (B.st === 'walk' && B.goal === 'lean'))) { a.leant = Rb.t;
      for (const s of [-Rb.s, Rb.s]) { const x = Rb.x + s * 7, y = Rb.y + 1; if (Math.hypot(x - M.fx, y - M.fy) > 10 && land(x, y) && landWay(a.fx, a.fy, x, y)) { a.trunk = Rb; a.tx = x; a.ty = y; a.goal = 'lean'; a.st = 'walk'; return; } } }
    if (t < a.until) return;
    const roll = rand();
    if (M.st === 'act' && M.act === 'bed' && roll < 0.6) { a.st = 'nap'; a.withHer = true; a.until = t + 30; return; }
    if (M.st !== 'walk') {
      if (roll > 0.93) { a.st = 'nap'; a.until = t + 6 + rand() * 8; return; }
      if (roll < 0.16) { a.st = 'roll'; a.t0 = t; a.until = t + 1.6 + rand() * 1.6; return; }
      if (roll < 0.34 && B.st === 'idle' && landWay(a.fx, a.fy, B.fx, B.fy)) { a.tx = B.fx + (a.fx < B.fx ? -8 : 8); a.ty = B.fy; a.goal = 'twin'; a.st = 'walk'; B.until = Math.max(B.until, t + 3); return; }
      if (roll < 0.46) { const T = trunkFor(a); if (T && landWay(a.fx, a.fy, T.x, T.y + 1)) { a.trunk = T; a.tx = T.x; a.ty = T.y + 1; a.goal = 'trunk'; a.st = 'walk'; return; } }
      if (roll < 0.62) { const tx = M.fx + side * (19 + rand() * 8), ty = M.fy + 2 + (rand() * 2 - 1) * 6; if (M.ok(tx, ty) && landWay(a.fx, a.fy, tx, ty)) { a.tx = tx; a.ty = ty; a.goal = 'spot'; a.st = 'walk'; return; } }
    }
    a.pose = roll < 0.8 ? 'sniff' : 'look'; a.until = t + 2 + rand() * 4; if (rand() < 0.3) a.flip = !a.flip;
  }
  // One family lives in its clearing in the firs below the Spires' waterfall and is always there (T34): it
  // keeps to the open patch (the room land.js measured) and off the trail beside it. The other is at the
  // forest's edge on roughly one visit in three (T44). For screenshots, bear=1 or bear=0 in the address settles that one.
  const addBear = () => family(spots.bear[0], spots.bear[1], { faces: 1, r: 90, v: 7, ok: meadow, roam: 0.4 }, true);
  if (opts.bear != null ? opts.bear : asked ? asked[1] === '1' : Math.random() < 0.35) addBear();
  if (spots.bearHome) family(spots.bearHome[0], spots.bearHome[1], { faces: 1, r: spots.bearHome[2] + 2, v: 5, ok: (x, y) => meadow(x, y) && !W.nearTrail(x, y, 9), roam: 0.3 }, false);

  // ---- five things to do (round 8, D2, TJ's notes 22 and 11) ----------------------------------
  // Every animal has five things it does, after how it lives. It starts on one at random, goes from one to
  // another on its own, and a click steps it to the next in its list (a.does), as a click steps the cats.
  // Grazing, looking about and walking off are the states a walker always had. The rest are acts: for each,
  // how fast its drawings turn over (fps), how long it lasts at least and at most (dur), what flies up
  // while it goes on (bits), and the sound it makes as it starts.
  const ACTS = {
    bugle: { fps: 0, dur: [2.4, 2.4], sound: 'bugle' }, bed: { fps: 0.45, dur: [10, 22] }, thrash: { fps: 5, dur: [3, 5], bits: [R.grass[3], R.grass[1], R.dirt[2]] },
    upright: { fps: 0, dur: [2.5, 4.5], sound: 'huff' }, rub: { fps: 2.5, dur: [4, 7] }, dig: { fps: 4, dur: [3, 6], bits: [R.dirt[1], R.dirt[2], R.bark[1]] },
    butt: { fps: 0, dur: [4.6, 7], pair: 2.3 }, shake: { fps: 7, dur: [1.7, 2.3], sound: 'snort' }, dip: { fps: 0.45, dur: [8.8, 8.8] },
  };
  // ---- life by the hour (round 8, H1, TJ) ---------------------------------------------------
  // What each kind does differently as the day goes by: one row for a kind, one entry for each part of the
  // day it lives differently in (morning, midday, evening, dusk; pixel.js says which it is). A kind with no
  // row, or no entry for a part, lives as it always does. A new animal joins by adding its row. Nothing else.
  //   more:  which of its acts (ACTS) come up more often then, each with how many times as often.
  //   often: how many times as often it does an act at all, in place of grazing on.
  //   at:    where it keeps then: a kind of place from PLACES, found for each animal the first time it is wanted.
  //   roam:  how far it strays, as a factor of its usual range.
  //   gone:  it has gone to ground and is not seen (for an animal with somewhere to go: a burrow).
  const HOURS = {
    elk: { midday: { more: { bed: 5 }, often: 1.6 }, evening: { more: { bugle: 5, thrash: 2 }, often: 1.5 }, dusk: { at: 'water', more: { bugle: 2 } } },
    goat: { midday: { more: { bed: 4 }, often: 1.4 } },
    sheep: { midday: { more: { bed: 4 }, often: 1.4 }, evening: { more: { butt: 3 } } },
    moose: { midday: { more: { bed: 4 }, often: 1.4 }, evening: { more: { dip: 3 } }, dusk: { more: { dip: 3 } } },
    bear: { midday: { more: { bed: 6 }, often: 1.8, roam: 0.6 }, evening: { more: { dig: 2, rub: 2 }, roam: 1.5 }, dusk: { more: { upright: 2 }, roam: 1.8 } },
    marmot: { dusk: { gone: true } }
  };
  let part = null; const NO_HOUR = {};
  const hourOf = a => { const H = HOURS[a.critter]; return (part && H && H[part]) || NO_HOUR; };
  const wetG = (x, y) => x > 1 && y > 1 && x < NW - 2 && y < NH - 2 && WET.includes(RAMP_OF[g[Math.round(y) * NW + Math.round(x)]]);
  // A way on foot from a spot to the nearest place that will do (goal), round whatever stands between: over
  // the animals' own grid of 8-pixel cells, from the middle of one to the middle of the next where a straight
  // step between them may be walked, never further than reach from the start. The middles, start to end, and
  // last the very spot the goal named in that cell. Or null.
  const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const routeFind = (x0, y0, goal, reach = 340) => {
    const mid = c => [(c % GW) * CELL + CELL / 2, Math.floor(c / GW) * CELL + CELL / 2], c0 = Math.floor(y0 / CELL) * GW + Math.floor(x0 / CELL), prev = new Map([[c0, -1]]), q = [c0];
    for (let h = 0; h < q.length; h++) { const c = q[h], [cx, cy] = mid(c);
      const at = goal(cx, cy); if (at) { const pts = []; for (let k = c; k !== -1; k = prev.get(k)) pts.push(mid(k)); pts.reverse(); pts.push(at); return pts; }
      for (const [dx, dy] of N8) { const nx = cx + dx * CELL, ny = cy + dy * CELL, n = c + dx + dy * GW; if (nx < 8 || ny < 8 || nx >= NW - 8 || ny >= NH - 8 || prev.has(n) || Math.hypot(nx - x0, (ny - y0) / 0.6) > reach || !pass(nx, ny) || !way(pass, cx, cy, nx, ny)) continue; prev.set(n, c); q.push(n); } }
    return null; };
  const nearWater = (x, y) => { for (let j = 0; j < 8; j++) if (wetG(x + Math.cos(j / 8 * TAU) * 13, y + Math.sin(j / 8 * TAU) * 8)) return true; return false; };
  // Ground of its own in a cell: its country is asked pixel by pixel (a flower in the turf is not grass), so
  // a few spots of the cell are tried. The spot, or null.
  const SPOTS = [[0, 0], [-3, 0], [3, 0], [0, -2], [0, 2], [-2, -3], [2, 3]];
  const okIn = (a, x, y) => { for (const [dx, dy] of SPOTS) if (a.ok(x + dx, y + dy)) return [x + dx, y + dy]; return null; };
  // What makes a cell each kind of place, for the animal that would stand there: the spot in it, or null.
  const PLACES = { water: (a, x, y) => nearWater(x, y) ? okIn(a, x, y) : null };
  // A herd keeps its shape: the place is found for the first of a kind that lives together (the nearest on
  // foot from where it lives), and each of the others takes ground of its own about it, as it has at home,
  // and finds its own way there. One that has no way there keeps to its home.
  // Where it lives by day, whether or not the hour has moved its home.
  const dayHome = a => a.away ? a.away.home : [a.hx, a.hy];
  const leadOf = a => { const [x, y] = dayHome(a); return items.find(b => b.critter === a.critter && !b.mum && b.ok && Math.hypot(dayHome(b)[0] - x, dayHome(b)[1] - y) < 90) || a; };
  const placeOf = (a, name) => { if (!a.places) a.places = {}; if (name in a.places) return a.places[name];
    const L = leadOf(a), [hx, hy] = dayHome(a), [lx, ly] = dayHome(L); let route = null;
    if (L === a) route = routeFind(hx, hy, (x, y) => Math.hypot(x - hx, y - hy) > 24 ? PLACES[name](a, x, y) : null);
    else { const P = placeOf(L, name); if (P) { const sx = P.to[0] + hx - lx, sy = P.to[1] + hy - ly, taken = items.filter(b => b !== a && b.places && b.places[name]).map(b => b.places[name].to);
      route = routeFind(hx, hy, (x, y) => Math.hypot(x - sx, y - sy) < 24 && taken.every(q => Math.hypot(q[0] - x, q[1] - y) > 9) ? okIn(a, x, y) : null); } }
    return (a.places[name] = route ? { to: route[route.length - 1], route } : null); };
  // The part of the day has changed (or the page has just opened, first): each animal takes up what its row says.
  const byHour = (a, t, first) => { const h = hourOf(a);
    if (h.roam) { if (a.r0 == null) a.r0 = a.r; a.r = a.r0 * h.roam; } else if (a.r0 != null) { a.r = a.r0; a.r0 = null; }
    const P = h.at && a.ok && a.walker && !a.mum ? placeOf(a, h.at) : null;
    // Its home moves there and it sets off along the way that was found, or back along it when the hour is over.
    if (P && !a.away) { a.away = { home: [a.hx, a.hy], route: P.route }; [a.hx, a.hy] = P.to; a.path = P.route.slice(1); a.homing = true; a.tries = 0; }
    else if (!P && a.away) { [a.hx, a.hy] = a.away.home; a.path = [...a.away.route].reverse().slice(1).concat([a.away.home]); a.away = null; a.homing = true; a.tries = 0; }
    // The page opened at this hour, so it is there already. After that it walks.
    if (first && P && a.walker) { a.fx = a.tx = a.hx; a.fy = a.ty = a.hy; a.x = Math.round(a.hx); a.y = Math.round(a.hy); a.homing = false; a.path = null; }
    // They do not all go down at once.
    a.abed = h.gone ? t + (first ? 0 : 2 + 9 * hash(a.hx, a.hy, 6601)) : null; };
  const act = (a, name, t) => { const A = ACTS[name]; a.st = 'act'; a.act = name; a.t0 = t; a.until = t + A.dur[0] + rand() * (A.dur[1] - A.dur[0]); a.goal = null; a.push = 0; a.bm = a.f[name][0]; if (A.sound) a.say = A.sound; };
  // The way the animal is turned: 1 to the right, -1 to the left.
  const dirOf = a => a.faces * (a.flip ? -1 : 1), turn = (a, dir) => { a.flip = dir !== a.faces; };
  // Off to another spot in its own country (or near its mother), by a straight way it may walk.
  // A spot to walk to, within its range of a middle: anywhere about it, or, for an animal whose country is a
  // list of spots (the ledge's goat), one of those.
  const spotNear = (a, cx, cy) => { if (a.spots) { const near = a.spots.filter(([x, y]) => Math.hypot(x - cx, y - cy) <= a.r && Math.hypot(x - a.fx, y - a.fy) > 4); return near.length ? near[Math.floor(rand() * near.length)] : [a.fx, a.fy]; } const an = rand() * TAU, rr = a.r * (0.35 + 0.65 * rand()); return [cx + Math.cos(an) * rr, cy + Math.sin(an) * rr * 0.6]; };
  const stroll = a => { const far = a.mum && a.mum.st === 'walk', cx = a.mum ? (far ? a.mum.tx : a.mum.x) : a.hx, cy = a.mum ? (far ? a.mum.ty : a.mum.y) + 5 : a.hy;
    for (let k = 0; k < 10; k++) { const [tx, ty] = spotNear(a, cx, cy); if (a.ok(tx, ty) && way(pass, a.fx, a.fy, tx, ty)) { a.tx = tx; a.ty = ty; a.st = 'walk'; return true; } }
    return false; };
  // To a spot it may stand on, to begin an act there (goal) once it arrives. The spot need not be in its own
  // country (a trunk stands in the trees, a ledge is narrow): any ground a land animal may stand on will do,
  // by a straight way it may walk, and it wanders home afterwards.
  const goTo = (a, x, y, goal) => { if (!land(x, y) || !landWay(a.fx, a.fy, x, y)) return false; a.tx = x; a.ty = y; a.st = 'walk'; a.goal = goal; return true; };
  // Two of a kind meet head to head (a nanny and her kid): the other comes to a spot in front of this one,
  // which waits, and both begin when it is there.
  const meet = (a, name, t) => {
    const b = items.filter(k => k !== a && k.walker && k.critter === a.critter && k.st !== 'act' && !k.goal && (k.mum === a || a.mum === k || (!k.mum && !a.mum)) && Math.hypot(k.fx - a.fx, k.fy - a.fy) < 70).sort((p, q) => Math.hypot(p.fx - a.fx, p.fy - a.fy) - Math.hypot(q.fx - a.fx, q.fy - a.fy))[0];
    if (!b) return false;
    const gap = a.f[name][0].w - a.f[name][0].ox + b.f[name][0].w - b.f[name][0].ox - 6;
    // The other comes to this one, or, where it cannot (a ledge between them), this one goes to the other.
    for (const [p, q] of [[a, b], [b, a]]) for (const s of [q.fx >= p.fx ? 1 : -1, q.fx >= p.fx ? -1 : 1]) for (const dy of [0, -2, 2, -4, 4]) if (goTo(q, p.fx + s * gap, p.fy + dy, name)) { b.with = a; a.with = b; turn(p, s); p.st = 'look'; p.until = t + 14; p.bm = p.f.look; p.goal = null; return true; }
    return false; };
  // A sow rubs against the nearest trunk she can walk up to: she stands beside its foot and leans in.
  const toTrunk = a => { let got = null, bd = 90;
    for (const T of TRUNKS) { const d = Math.hypot(T.x - a.fx, (T.y - a.fy) / 0.6); if (d >= bd) continue; for (const s of [-1, 1]) for (const gap of [8, 10, 12, 14]) { const x = T.x + s * gap, y = T.y + 1; if (land(x, y) && landWay(a.fx, a.fy, x, y)) { got = [x, y, -s, gap - 8]; bd = d; break; } } }
    if (!got) return false; a.lean = got; return goTo(a, got[0], got[1], 'rub'); };
  // The bull moose dips for water weed: he walks to the nearest bank he can stand on with the water under
  // his muzzle (16 in front of his feet and 5 above them, as he is drawn with his head down).
  const WET = ['water', 'tarn'];
  const toWater = a => { for (let r = 6; r <= 80; r += 4) for (let k = 0; k < 16; k++) { const wx = Math.round(a.fx + Math.cos(k / 16 * TAU) * r), wy = Math.round(a.fy + Math.sin(k / 16 * TAU) * r * 0.6);
    if (wx < 20 || wy < 20 || wx >= NW - 20 || wy >= NH - 20 || !WET.includes(RAMP_OF[g[wy * NW + wx]]) || !WET.includes(RAMP_OF[g[wy * NW + wx + 1]]) || !WET.includes(RAMP_OF[g[wy * NW + wx - 1]])) continue;
    for (const s of [1, -1]) if (goTo(a, wx + s * 16, wy + 5, 'dip')) { a.lean = [0, 0, -s, 0]; return true; } }
    return false; };
  // One of its five things begins. from: where a click came from, so an animal that walks off walks away from it.
  const begin = (a, name, t, from) => { const ok = begun(a, name, t, from); if (ok) a.turn = a.does.indexOf(name); return ok; };
  const begun = (a, name, t, from) => {
    a.goal = null; a.push = 0; if (a.with) { const b = a.with; a.with = b.with = null; if (b.st === 'act' && ACTS[b.act].pair) { b.st = 'look'; b.until = t + 1; b.push = 0; } }
    if (name === 'graze') { a.st = 'graze'; a.until = t + 5 + rand() * 6; return true; }
    if (name === 'look' || name === 'bark') { lookUp(a, t, 3.5); return true; }
    if (name === 'hop') { a.spring = t; lookUp(a, t, 2); return true; }
    if (name === 'trot') { a.fast = t + 3; a.bound = a.critter === 'goat' || a.critter === 'sheep'; return (from && flee(a, from[0], from[1], 14, 28)) || stroll(a); }
    if (name === 'rub') return toTrunk(a);
    if (name === 'dip') return toWater(a);
    if (ACTS[name].pair) return meet(a, name, t);
    if (name === 'bugle') { for (const b of items) if (b.critter === 'elk' && b !== a && b.st !== 'act') lookUp(b, t, 4); a.bugle = t;
      // A second bull answers from off the map, a moment after he has done (round 8, H4).
      a.answerAt = t + 3.2 + rand() * 1.4; }
    if (name === 'upright') for (const c of items.filter(c => c.mum === a && c.cub && c.st !== 'climb')) { const T = trunkFor(c, 44); if (T) { c.trunk = T; c.tx = T.x; c.ty = T.y + 1; c.goal = 'trunk'; c.st = 'walk'; c.hop = c.lift = 0; } }
    act(a, name, t); return true; };
  // It has come to where it was going: the act it came for begins, or it grazes.
  const arrive = (a, t) => { a.fx = a.tx; a.fy = a.ty; a.x = Math.round(a.fx); a.y = Math.round(a.fy); const g = a.goal; a.goal = null;
    if (!g) { a.st = 'graze'; a.until = t + 5 + rand() * 10; return; }
    act(a, g, t);
    if (g === 'rub' || g === 'dip') { turn(a, a.lean[2]); a.push = a.lean[3]; }
    const b = a.with; if (b) { turn(a, b.fx > a.fx ? 1 : -1); turn(b, -dirOf(a)); act(b, g, t); b.until = a.until; a.lead = true; b.lead = false; } };
  // What an act looks like s seconds in. Head to head, a pair draw back, drop their heads and come together
  // (push: how far each is drawn toward the other), with a knock as they meet.
  const acting = (a, t) => { const A = ACTS[a.act], s = t - a.t0, fr = a.f[a.act];
    a.bm = fr[Math.floor(s * A.fps) % fr.length];
    if (A.pair) { const u = s % A.pair; a.push = u < 0.9 ? -Math.round(3 * smooth(0, 0.9, u)) : u < 1.1 ? Math.round(-3 + 5 * (u - 0.9) / 0.2) : u < 1.5 ? 2 : Math.round(2 * (1 - smooth(1.5, 2.1, u)));
      a.bm = u >= 0.75 && u < 1.6 ? fr[0] : a.f.rear && u >= 0.3 && u < 0.75 ? a.f.rear[0] : a.f.look;
      const n = Math.floor(s / A.pair); if (a.lead && u >= 1.1 && a.knock !== a.t0 + n) { a.knock = a.t0 + n; a.say = 'clash'; } }
    if (a.act === 'rub') a.hop = Math.floor(s * A.fps) & 1; };
  const endAct = (a, t) => {
    // Where she rubbed, for her cubs to try after her (H2): the trunk, and which side of it she stood.
    if (a.sow && a.st === 'act' && a.act === 'rub' && a.lean) a.rubbed = { x: a.lean[0] + a.lean[2] * (a.lean[3] + 8), y: a.lean[1] - 1, s: -a.lean[2], t };
    const b = a.with; a.with = null; if (b) b.with = null; a.push = 0; a.hop = 0; a.st = 'look'; a.until = t + 1 + rand() * 2; a.bm = a.f.look; };
  function walk(a, dt, t) {
    // The answer to his bugle comes (H4): faint, from beyond the nearer edge of the map, and every elk that
    // is not busy lifts its head and turns that way. The bull listens too.
    if (a.answerAt != null && t >= a.answerAt) { a.answerAt = null; a.far = t; const side = a.x < NW / 2 ? -1 : 1;
      for (const b of items) if (b.critter === 'elk' && b.walker && b.st !== 'act' && b.st !== 'walk') { lookUp(b, t, 3.6); turn(b, side); } }
    // A kid springs straight up (round 6, note 10).
    a.hop = a.spring != null && t - a.spring < 1.4 ? Math.round(6 * Math.abs(Math.sin((t - a.spring) * Math.PI / 0.7))) : 0;
    if (a.st === 'walk') {
      const dx = a.tx - a.fx, dy = a.ty - a.fy, d = Math.hypot(dx, dy);
      if (d < 0.6) { arrive(a, t); return; }   // it stops on the spot it chose, which is ground it may stand on
      // It walks the straight line it looked along before it set off (way), slower up and down the
      // picture than across it. Until round 8 (D1) only its speed up and down was cut, which bent the line,
      // and a bent line could cross ground the straight one did not: a sheep stepped off its bench's edge.
      else { const fast = a.fast > t, s = Math.min(d, a.v * (fast ? (a.bound ? 4 : 2.6) : 1) * dt / Math.hypot(dx / d, dy / d / 0.7)); if (!step(a, a.fx + dx / d * s, a.fy + dy / d * s)) { endAct(a, t); a.goal = null; return; } if (Math.abs(dx) > 0.5) a.flip = (dx > 0 ? 1 : -1) !== a.faces; if (fast && a.bound) a.hop = Math.round(4 * Math.abs(Math.sin(t * 9))); }
      a.bm = a.f.walk[Math.floor(t * (a.fast > t ? 9 : 4.5) + a.hx) & 1];
      if (Math.abs(a.ty - a.fy) < 0.6 && Math.abs(dx) < 0.6) arrive(a, t);
      return;
    }
    if (a.st !== 'act') a.bm = a.st === 'graze' ? a.f.graze : a.f.stand && frac(t * 0.11 + a.hx * 0.37) < 0.5 ? a.f.stand : a.f.look;
    // A kid that has been left behind (its mother has walked off) goes after her at once.
    // So does one whose home has moved with the hour (H1): it makes for the new one until it is within its range of it.
    if (a.homing && !(a.path && a.path.length) && Math.hypot(a.fx - a.hx, (a.fy - a.hy) / 0.6) <= a.r + 8) a.homing = false;
    const lag = a.mum ? Math.hypot(a.fx - a.mum.fx, (a.fy - a.mum.fy) / 0.6) > a.r + 8 : !!a.homing && t >= (a.wait || 0);
    if (a.st === 'act') { if (t < a.until && !(lag && !a.with)) { acting(a, t); return; } endAct(a, t); if (!lag) return; }
    if (t < a.until && !lag) return;
    // Now and then one of its acts, in place of grazing on or wandering off.
    // Which one leans on the hour (H1): an act its row names for this part of the day comes up that many times as often.
    const hr = hourOf(a);
    if (!lag && a.does && rand() < 0.3 * (hr.often || 1)) { const own = a.does.filter(n => ACTS[n]), wt = own.map(n => (hr.more && hr.more[n]) || 1); let pick = rand() * wt.reduce((s, v) => s + v, 0), k = 0; while (k < own.length - 1 && pick >= wt[k]) pick -= wt[k++]; if (own.length && begin(a, own[k], t)) return; }
    const roll = lag ? 0 : rand();
    if (roll < (a.roam || 0.25)) {
      // A kid keeps near its mother, or near where she is walking to; everyone else keeps near home.
      const far = a.mum && a.mum.st === 'walk', cx = a.mum ? (far ? a.mum.tx : a.mum.x) : a.hx, cy = a.mum ? (far ? a.mum.ty : a.mum.y) + 5 : a.hy;
      // On its way to a home that moved with the hour (H1): the next point of the way it was given, or one
      // further along that it can walk straight to, so it does not turn at every cell.
      if (a.homing && a.path && a.path.length) { let k = 0; while (k + 1 < a.path.length && k < 8 && way(pass, a.fx, a.fy, a.path[k + 1][0], a.path[k + 1][1])) k++; [a.tx, a.ty] = a.path[k]; a.path.splice(0, k + 1); a.st = 'walk'; return; }
      for (let k = 0; k < 10; k++) {
        const [tx, ty] = spotNear(a, cx, cy);
        if (a.ok(tx, ty) && way(pass, a.fx, a.fy, tx, ty)) { a.tx = tx; a.ty = ty; a.st = 'walk'; return; }
      }
      // No straight way to her (a trunk or a bend of the creek between them): it works round, to any spot it can
      // reach that is 6 or more nearer her.
      if (lag) { const dNow = Math.hypot(a.fx - cx, a.fy - cy); for (let k = 0; k < 12; k++) { const an = rand() * TAU, rr = 10 + 22 * rand(), tx = a.fx + Math.cos(an) * rr, ty = a.fy + Math.sin(an) * rr * 0.6; if (Math.hypot(tx - cx, ty - cy) < dNow - 6 && a.ok(tx, ty) && way(pass, a.fx, a.fy, tx, ty)) { a.tx = tx; a.ty = ty; a.st = 'walk'; return; } }
        // One making for a home that moved with the hour looks again in a moment, and after a dozen looks stays where it is.
        if (a.homing) { a.wait = t + 2.5; a.tries = (a.tries || 0) + 1; if (a.tries > 12) a.homing = false; } }
    }
    a.st = roll < 0.72 ? 'graze' : 'look'; a.until = t + (a.st === 'look' ? 2.5 + rand() * 4 : 5 + rand() * 11);
    if (a.st === 'look' && rand() < 0.3) a.flip = !a.flip;
  }

  // ---- squirrels and chipmunks: sit, then dart ----------------------------------------------
  const sq = [0, 1].map(chip => { const f = { sit: W.make.squirrel(!!chip), run: W.make.squirrel(!!chip, true) }; for (const k of ['eat', 'scold', 'bury', 'climb']) f[k] = [0, 1].map(s => W.make.squirrelDoes(!!chip, k, s)); return f; });
  // Its five things (round 8, D2): it always sat and darted. Now it also eats a cone, scolds with its tail
  // flicking, buries a cone, and runs to the nearest trunk and climbs it a little way. For each act: how fast
  // its two drawings turn over, and how long it lasts at least and at most.
  const SQ_DOES = ['eat', 'scold', 'dash', 'climb', 'bury'], SQ_ACT = { eat: [3, 4, 7], scold: [6, 2.2, 3], bury: [5, 3, 4.5], climb: [6, 5.2, 5.2] }, CLIMB = { up: 1.2, high: 11 };
  const sqAct = (a, name, t) => { const [, lo, hi] = SQ_ACT[name]; a.st = 'act'; a.act = name; a.t0 = t; a.until = t + lo + rand() * (hi - lo); a.goal = null; a.hop = 0; if (name === 'scold') a.say = 'chatter'; };
  const sqBegin = (a, name, t, from) => {
    a.goal = null; a.ofx = 0; a.hop = 0;
    if (name === 'dash') { a.st = 'sit'; a.until = 0; dart(a, 0, t, from ? { x: from[0], y: from[1] } : { x: a.fx + 1, y: a.fy }); return a.st === 'run'; }
    if (name !== 'climb') { sqAct(a, name, t); return true; }
    // To the foot of the nearest trunk it can run to, on whichever side of it has ground it may stand on.
    let got = null, bd = 60; for (const T of TRUNKS) { const d = Math.hypot(T.x - a.fx, (T.y - a.fy) / 0.6); if (d >= bd) continue; for (const s of [-1, 1]) for (const gap of [3, 5, 7]) { const x = T.x + s * gap, y = T.y + 1; if (land(x, y) && way(pass, a.fx, a.fy, x, y)) { got = [x, y, -s * gap]; bd = d; break; } } }
    if (!got) return false; a.tx = got[0]; a.ty = got[1]; a.lean = got[2]; a.st = 'run'; a.goal = 'climb'; return true; };
  // Up the trunk, a while clinging there, and down again: drawn on the trunk (ofx), its feet still on the ground beside it.
  const sqActing = (a, t) => { const [fps] = SQ_ACT[a.act], s = t - a.t0, left = a.until - t, fr = a.f[a.act];
    if (t >= a.until) { a.st = 'sit'; a.bm = a.f.sit; a.hop = 0; a.ofx = 0; a.until = t + 4 + rand() * 9; return; }
    if (a.act !== 'climb') { a.bm = fr[Math.floor(s * fps) & 1]; return; }
    const moving = s < CLIMB.up || left < CLIMB.up; a.ofx = a.lean; a.hop = Math.round(CLIMB.high * Math.min(1, s / CLIMB.up, left / CLIMB.up)); a.bm = fr[moving ? Math.floor(s * fps) & 1 : 0]; };
  for (const [x, y, chip] of spots.squirrels) items.push({ h0: [x, y], critter: 'squirrel', col: 'land', dart: true, f: sq[chip ? 1 : 0], bm: sq[chip ? 1 : 0].sit, x, y, fx: x, fy: y, hx: x, hy: y, tx: x, ty: y, st: 'sit', until: 3 + rand() * 12, flip: rand() < 0.5 });
  function dart(a, dt, t, here) {
    if (a.st === 'act') { sqActing(a, t); return; }
    if (a.st === 'run') {
      const dx = a.tx - a.fx, dy = a.ty - a.fy, d = Math.hypot(dx, dy);
      if (d < 1) { if (a.goal) { sqAct(a, a.goal, t); return; } a.st = 'sit'; a.until = t + 5 + rand() * 11; a.bm = a.f.sit; return; }
      const s = Math.min(d, 46 * dt); if (!step(a, a.fx + dx / d * s, a.fy + dy / d * s)) { a.st = 'sit'; a.goal = null; a.until = t + 3 + rand() * 6; a.bm = a.f.sit; a.hop = 0; return; }
      if (Math.abs(dx) > 0.5) a.flip = dx < 0;
      a.bm = a.f.run; a.hop = Math.floor(t * 9) & 1;
      return;
    }
    a.hop = 0;
    // He scares them: they bolt the other way when he comes close.
    const near = here && Math.hypot(here.x - a.fx, here.y - a.fy) < 20;
    if (!near && t < a.until) return;
    if (!near && a.until && rand() < 0.4 && sqBegin(a, ['eat', 'scold', 'climb', 'bury'][Math.floor(rand() * 4)], t)) return;
    for (let k = 0; k < 6; k++) {
      const an = near ? Math.atan2(a.fy - here.y, a.fx - here.x) + (rand() - 0.5) * 1.6 : rand() * TAU, rr = near ? 26 + rand() * 12 : 6 + rand() * 22;
      const tx = (near ? a.fx : a.hx) + Math.cos(an) * rr, ty = (near ? a.fy : a.hy) + Math.sin(an) * rr * 0.6;
      // It darts only along ground a land animal may cross (collide.js), so never over a creek or into a rock.
      if (clear(tx, ty) && Math.hypot(tx - a.fx, ty - a.fy) > 4 && way(pass, a.fx, a.fy, tx, ty)) { a.tx = tx; a.ty = ty; a.st = 'run'; return; }
    }
    a.until = t + 3;
  }

  // ---- marmots: sunning on a rock, up on their haunches when he is near or now and then ----
  const mar = { sun: marmot('sun'), up: marmot('up'), dig: [marmot('dig'), marmot('dig', 1)], wrestle: [marmot('box'), marmot('box', 1)] };
  // Each has a few rocks' worth of ground round its own (E5i, TJ: no animal just stands still): now and then
  // it scurries a little way to sun somewhere else, and it still sits up when he comes by.
  // Round 5 (T43, T29): the two in the parkland below Mount Monolith lie on a boulder each (perch: how high its
  // top stands) and keep to it. Every 26 s, and when he comes near, a marmot sits up and whistles, then drops
  // down again; the whistle sounds if the marmot is on screen. None sets foot on ice or snow.
  const MAR = { cycle: 26, up: 2.6 }, sounds = [];
  spots.marmots.forEach(([x, y0, perch = 0], n) => { const y = y0 + (perch ? 1 : 0); items.push({ critter: 'marmot', col: 'land', f: mar, bm: mar.sun, x, y, n, flip: !!(n & 1), hx: x, hy: y, h0: [x, y], fx: x, fy: y, tx: x, ty: y, r: perch ? 0 : 16, perch, perch0: perch, lift: perch, st: 'sun', until: 4 + rand() * 10 }); });
  const offIce = (x, y) => { const k = RAMP_OF[g[Math.round(y) * NW + Math.round(x)]]; return k !== 'glac' && k !== 'snow' && k !== 'farsnow'; };
  // Its five things (round 8, D2): sunbathing and sitting up to whistle it always did, and a click sent it
  // down its burrow. Now it also digs, and wrestles another of its colony that comes up beside it for the
  // bout. One on a boulder hops down to the grass at the boulder's foot for either, and back up afterwards:
  // it is drawn there (a.drop) and stays the boulder's marmot, since the parkland is steeper than the
  // shared rule lets a walker stand on, which is why these live on boulders. The grass is asked of the ground itself.
  const MAR_DOES = ['sun', 'whistle', 'wrestle', 'dig', 'dash'], MAR_ACT = { wrestle: [4, 5, 8], dig: [6, 3, 6] }, HOP = 0.35;
  const grassAt = (x, y) => RAMP_OF[g[Math.round(y) * NW + Math.round(x)]] === 'grass';
  const marBegin = (a, name, t) => {
    if (a.st === 'act' || a.gone) return false;
    if (name === 'sun') { a.st = 'sun'; a.until = t + 6 + rand() * 6; return true; }
    if (name === 'whistle') { a.call = t; return true; }
    if (name === 'dash') { if (a.dive != null && t - a.dive < 4.6) return false; a.call = t; a.dive = t; return true; }
    let down = 0; if (a.perch) { for (let dy = 5; dy <= 9 && !down; dy++) if (grassAt(a.x, a.y + dy) && grassAt(a.x + (a.flip ? -11 : 11), a.y + dy)) down = dy; if (!down) return false; }
    const [, lo, hi] = MAR_ACT[name]; a.st = 'act'; a.act = name; a.t0 = t; a.len = lo + rand() * (hi - lo); a.down = down; a.drop = 0; a.hop = 0; return true; };
  // How far into its act it is: under 0 it is on its way down, over a.len on its way back up.
  const marAt = (a, t) => t - a.t0 - (a.down ? HOP : 0);
  const marActing = (a, t) => { const s = marAt(a, t), P = a.down ? a.perch + a.down : 0;
    if (s < 0) { const u = 1 + s / HOP; a.drop = Math.round(P * u); a.hop = Math.round(3 * Math.sin(Math.PI * u)); a.bm = mar.sun; return; }
    if (s < a.len) { a.drop = P; a.hop = 0; a.bm = mar[a.act][Math.floor(s * MAR_ACT[a.act][0]) & 1]; return; }
    if (a.down && s < a.len + HOP) { const u = (s - a.len) / HOP; a.drop = Math.round(P * (1 - u)); a.hop = Math.round(3 * Math.sin(Math.PI * u)); a.bm = mar.sun; return; }
    a.drop = 0; a.hop = 0; a.st = 'sun'; a.bm = mar.sun; a.until = t + 6 + rand() * 12; };
  function scurry(a, dt, t, here) {
    // Clicked, it whistles and dives into its burrow, and comes back up a few seconds later (note 10).
    a.gone = (a.dive != null && t > a.dive + 1.2 && t < a.dive + 4.6) || (a.abed != null && t >= a.abed);
    const up = (here && Math.hypot(here.x - a.x, here.y - a.y) < 64) || frac(t / MAR.cycle + a.n * 0.37) < MAR.up / MAR.cycle || (a.call != null && t - a.call < MAR.up);
    if (up && !a.wasUp) a.rose = t; else if (!up && a.wasUp && rand() < 0.5) a.flip = !a.flip;
    a.wasUp = up;
    if (a.st === 'act') { marActing(a, t); return; }
    if (a.perch) { a.bm = up ? mar.up : mar.sun; if (!up && t >= a.until) { a.until = t + 8 + rand() * 14; if (rand() < 0.4) marBegin(a, rand() < 0.5 ? 'wrestle' : 'dig', t); } return; }
    if (a.st === 'run') {
      const dx = a.tx - a.fx, dy = a.ty - a.fy, d = Math.hypot(dx, dy);
      if (d < 0.8) { a.st = 'sun'; a.until = t + 6 + rand() * 12; a.hop = 0; }
      else { const s = Math.min(d, 18 * dt); if (!step(a, a.fx + dx / d * s, a.fy + dy / d * s)) { a.st = 'sun'; a.until = t + 4 + rand() * 8; a.hop = 0; } else { if (Math.abs(dx) > 0.5) a.flip = dx < 0; a.hop = Math.floor(t * 8) & 1; a.bm = mar.sun; return; } }
    }
    a.bm = up ? mar.up : mar.sun;
    if (up || t < a.until) return;
    if (rand() < 0.3 && marBegin(a, rand() < 0.5 ? 'wrestle' : 'dig', t)) return;
    for (let k = 0; k < 6; k++) { const an = rand() * TAU, rr = a.r * (0.3 + 0.7 * rand()), tx = a.hx + Math.cos(an) * rr, ty = a.hy + Math.sin(an) * rr * 0.6; if (col.canBe('land', tx, ty, 0) && offIce(tx, ty) && way((x, y) => col.canBe('land', x, y, 0) && offIce(x, y), a.fx, a.fy, tx, ty)) { a.tx = tx; a.ty = ty; a.st = 'run'; return; } }
    a.until = t + 5;
  }

  // For screenshots, sea=90 in the address starts the ferry's and the whale's clocks that many seconds on.
  // Each has its own, so the debug panel can start one without moving the other (E5f).
  const ahead = typeof location !== 'undefined' ? +(/[?&]sea=([\d.]+)/.exec(location.search) || [])[1] || 0 : 0;
  let whaleAhead = ahead, ferryAhead = ahead;

  // ---- the whale -------------------------------------------------------------------------------
  // Once in every 40 to 60 seconds it breaches: out, over and down in under three seconds, then the
  // spray comes down and its flukes lift and slide under after it. Twice in between it rolls at the
  // surface and blows. At time 0 it hangs at the top of a breach, for the block-in page.
  // Drawing the breach took a sixth of the page's start (M3), so only its first drawing is made up front;
  // the rest are made one a frame once the map is running, and a breach that comes before they are all
  // made (one started from the debug menu) makes the rest then.
  const whales = [W.make.whale(BREACH[0])], moreWhales = () => { if (whales.length < BREACH.length) whales.push(W.make.whale(BREACH[whales.length])); };
  const flukes = [0, 0.33, 0.66, 1].map(f => W.make.whale({ fluke: f }));
  const SLOT = 50, starts = n => 10 * hash(n, 5, 63), T0 = starts(0) + 1.55;
  // Its five things, in the order a click steps through them, and how many seconds each of the lesser four lasts.
  const WHALE_DOES = { blow: 3, breach: 0, slap: 4.5, pec: 6, fluke: 3.4 }, WHALE_TURN = Object.keys(WHALE_DOES);
  const back = (() => { const b = new BM(20, 6); b.ox = 10; b.oy = 5; ell(b, 10, 6, 8.5, 4.2, (nx, ny) => R.navy[ny < -0.55 ? 2 : 1]); b.set(13, 1, R.navy[0]); b.set(14, 1, R.navy[0]); outline(b, INK); return b; })();
  items.push({ critter: 'whale', col: 'whale', f: { whales, flukes }, bm: whales[0], x: spots.whale[0], y: spots.whale[1] });
  // A drawing sunk some way into the water, with broken foam where it meets the surface.
  function sunk(scr, bm, x, y, sink, t) {
    for (let j = 0; j + sink <= bm.oy && j < bm.h; j++) for (let i = 0; i < bm.w; i++) { const c = bm.d[j * bm.w + i]; if (c) scr.set(x - bm.ox + i, y - bm.oy + sink + j, c); }
    const row = (bm.oy - sink) * bm.w; let lo = -1, hi = -1;
    if (sink <= bm.oy) for (let i = 0; i < bm.w; i++) if (bm.d[row + i]) { if (lo < 0) lo = i; hi = i; }
    if (lo < 0) return;
    const beat = Math.floor(t * 6);
    for (let i = lo - 3; i <= hi + 3; i++) {
      const px = x - bm.ox + i, edge = i < lo || i > hi;
      if (hash(i, beat, 64) < (edge ? 0.7 : 0.85)) scr.set(px, y, R.white[1]);
      if (hash(i, beat, 65) < 0.4) scr.set(px, y + 1, R.sea[5]);
      if (edge && hash(i, beat, 66) < 0.45) scr.set(px, y - 1, R.white[1]);
    }
  }
  // Where it comes up (E6a): a different spot for each breach and each blow, picked by rule from open
  // water in view (clear of the page's buttons along the top and the timeline along the bottom): well out
  // past the low-water line, clear of the stacks, with room for the spray.
  // LOW: the lowest tide, so a spot picked is deep enough whenever the whale comes up.
  let OPEN = null; const LOW = { ebb: EBB };
  const openWater = () => OPEN || (OPEN = (() => { const out = []; for (let y = SEA.y0 + 30; y < SEA.y0 + SEA.h - 12; y += 6) for (let x = 60; x < SEA.w - 16; x += 6) {
    if (!col.canBe('whale', x, y, LOW, 8) || [-56, -28, 12].some(d => !col.canBe('whale', x + d, y, LOW)) || stacks.some(s => Math.abs(s.x - x) < 70 && Math.abs(s.y - y) < 26)) continue; out.push([x, y]); } return out; })());
  const pickOpen = (key, ox, oy, VW, VH) => { const all = openWater(); if (!all.length) return spots.whale; const seen = all.filter(([x, y]) => x - 60 > ox && x + 16 < ox + VW && y - 46 > oy + 40 && y + 10 < oy + VH - 130), from = seen.length ? seen : all; return from[Math.floor(hash(key, 7, 6201) * from.length)]; };
  function drawWhale(scr, a, ox, oy, t) {
    const T = t + whaleAhead + T0, n = Math.floor(T / SLOT), u = T - n * SLOT - starts(n);
    if (a.slot !== n) { a.slot = n; [a.x, a.y] = n ? pickOpen(n, ox, oy, scr.VW, scr.VH) : spots.whale; a.blows = [null, null]; }
    const wx = a.x - ox, wy = a.y - oy;
    seen.whale = wx > -30 && wx < scr.VW + 30 && wy > -30 && wy < scr.VH + 10 ? [wx - 10, wy] : null;
    if (u >= 0.3 && u < IMPACT + 2.9 && inClear(scr, wx - 10, wy)) saw('whale');
    const white = R.white[1], pale = R.sea[5], ease = v => v * v * (3 - 2 * v);
    // The foam it leaves lies on the water, so it goes down first: a patch where it landed that thins
    // out, and a ring that spreads from it and breaks up. A small ring marks where it came out.
    const ring = (cx, age, len, rx, ry) => { if (age < 0 || age > len) return; const thin = age / len; for (let k = 0; k < 96; k++) { if (hash(k, Math.floor(t * 2.5), 62) < thin) continue; const an = k / 96 * TAU; scr.set(Math.round(wx + cx + Math.cos(an) * rx), Math.round(wy + Math.sin(an) * ry), k % 5 ? white : pale); } };
    ring(-3, u - 0.1, 1.8, 8 + 8 * (u - 0.1), 2.4 + 2 * (u - 0.1));
    const wet = u - IMPACT;
    if (wet > 0.1 && wet < 4.2) {
      const rx = 30 + 4 * wet, ry = 4 + 1.1 * wet;
      for (let dy = -Math.ceil(ry); dy <= ry; dy++) for (let dx = -Math.ceil(rx); dx <= rx; dx++) {
        const d = dx * dx / (rx * rx) + dy * dy / (ry * ry); if (d > 1) continue;
        if (hash(a.x + dx, a.y + dy, 67) < 0.3 + 0.17 * wet + 0.25 * d) continue;
        scr.set(wx - 22 + dx, wy + dy, wet < 1.4 && hash(a.x + dx, a.y + dy, 68) < 0.7 ? white : pale);
      }
    }
    ring(-22, wet, 4.6, 30 + 9 * wet, 4 + 2.4 * wet);
    if (u >= 0 && u < IMPACT + 0.5) while (whales.length < BREACH.length) moreWhales();
    if (u >= 0 && u < IMPACT + 0.5) sunk(scr, whales[Math.min(whales.length - 1, Math.floor(u * FPS))], wx, wy, Math.round(7 * smooth(2.05, IMPACT, u) + 16 * smooth(IMPACT, IMPACT + 0.5, u)), t);
    // The flukes: up, a moment standing, then tipping over and under.
    const uf = wet - 0.6;
    if (uf > 0 && uf < 1.75) {
      const sink = Math.round(uf < 0.6 ? 25 * (1 - ease(uf / 0.6)) : uf < 0.95 ? 0 : 25 * ease((uf - 0.95) / 0.8));
      sunk(scr, flukes[Math.round(3 * smooth(0.5, 1.5, uf))], wx - 9, wy, sink, t);
    }
    ring(-12, uf - 1.5, 1.6, 5 + 7 * (uf - 1.5), 1.8 + 1.6 * (uf - 1.5));
    // Spray: a little thrown up as it comes out, and a wall of it as it lands, which falls back as drops.
    const drop = (px, py, big) => { if (py > wy + 1) return; scr.set(px, py, white); if (big) scr.set(px + 1, py, white); scr.set(px, py + 1, pale); };
    for (let k = 0; k < 16; k++) {
      const age = u - 0.05 - hash(k, 1, 61) * 0.3; if (age < 0 || age > 1.6) continue;
      drop(Math.round(wx - 3 + (hash(k, 2, 61) - 0.5) * 28 * age), Math.round(wy - (22 + hash(k, 3, 61) * 22) * age + 46 * age * age), hash(k, 4, 61) < 0.5);
    }
    if (wet > -0.1 && wet < 0.8) {
      const up = Math.sin(Math.PI * clamp((wet + 0.1) / 0.9, 0, 1)) ** 0.6, beat = Math.floor(t * 10);
      for (let dx = -56; dx <= 12; dx++) {
        // Highest over the middle of the body, and ragged along the top.
        const h = Math.round((6 + 17 * vnoise(dx / 6, 3, 69)) * (1 + 0.5 * Math.exp(-(((dx + 24) / 15) ** 2))) * up * smooth(-56, -42, dx) * smooth(12, 0, dx));
        for (let j = 0; j < h; j++) { if (j > h * 0.5 && hash(dx, j + beat * 7, 70) < 0.25 + 0.5 * (j / h - 0.5)) continue; scr.set(wx + dx, wy - j, j > h * 0.78 ? pale : white); }
      }
    }
    for (let k = 0; k < 84; k++) {
      const age = wet - hash(k, 1, 74) * 0.35; if (age < 0 || age > 3) continue;
      const x0 = -50 + 56 * hash(k, 2, 74), vx = (hash(k, 3, 74) - 0.5) * 36 + (x0 + 22) * 0.6, vy = 26 + 44 * hash(k, 4, 74);
      drop(Math.round(wx + x0 + vx * age), Math.round(wy - vy * age + 46 * age * age), hash(k, 5, 74) < 0.5);
    }
    // Between breaches (round 8, D2, after pictures) it does one of four things at a spot of its own, picked
    // when it begins: it rolls and blows, as it always did; slaps its tail on the water three times; lies on
    // its side and waves one long white pectoral fin in the air; or lifts its flukes and goes down. v:
    // seconds in. The first of each slot is always a blow (the debug menu asks for one); the second is one of the other three.
    const minor = (kind, v, px, py, key) => {
      const bx = px - ox, by = py - oy, foam = (x0, x1) => { for (let i = x0; i <= x1; i += 2) scr.set(bx + i, by + 1, white); };
      const spray = (age, seed) => { for (let k = 0; k < 44; k++) { const s = age - hash(k, 1, seed) * 0.15; if (s < 0 || s > 1.1) continue; const y = Math.round(by - (16 + 22 * hash(k, 3, seed)) * s + 34 * s * s); if (y <= by + 1) { const x = Math.round(bx + (hash(k, 2, seed) - 0.5) * 46 * s); scr.set(x, y, white); if (k & 1) scr.set(x + 1, y, white); scr.set(x, y + 1, pale); } } };
      const roll = (dx, up) => { for (let j = 0; j < back.h - up; j++) for (let i = 0; i < back.w; i++) { const c = back.d[j * back.w + i]; if (c) scr.set(bx + dx - back.ox + i, by - back.oy + up + j, c); } foam(dx - 9, dx + 9); };
      if (kind === 'blow') {
        const dx = 6 - Math.round(v * 4); roll(dx, Math.round(v < 0.6 ? 5 * (1 - ease(v / 0.6)) : v > 2.2 ? 5 * ease((v - 2.2) / 0.8) : 0));
        if (v > 0.5 && v < 1.6) { const hgt = Math.round(9 * Math.min(1, (v - 0.5) / 0.3)), fade = v > 1.2; for (let j = 0; j < hgt; j++) { if (fade && (j + Math.floor(t * 8)) % 2) continue; const sp = j > hgt - 4 ? Math.round((j - hgt + 4) * 0.8) : 0; scr.set(bx + dx + 5 - sp, by - 5 - j, white); scr.set(bx + dx + 5 + sp, by - 5 - j, white); } }
      } else if (kind === 'slap') {
        // The flukes come up out of the water, stand a moment and come down flat: white water flies, and it sounds.
        const k = Math.floor(v / 1.5), w = v - k * 1.5;
        if (w < 0.95) sunk(scr, flukes[w < 0.8 ? 0 : 2], bx, by, Math.round(w < 0.55 ? 25 * (1 - ease(w / 0.55)) : w < 0.8 ? 0 : 25 * (w - 0.8) / 0.15), t);
        else { spray(w - 0.95, 6431 + k); if (w < 1.35) { foam(-16, 16); for (let i = -12; i <= 12; i++) if (hash(i, Math.floor(t * 8), 6435) < 0.6) scr.set(bx + i, by, white); } if (a.slapped !== key + k) { a.slapped = key + k; sounds.push('plop'); } }
      } else if (kind === 'pec') {
        // The fin stands a third of the whale's length out of the water and sways; knobs along its leading edge.
        roll(0, 1); const L = Math.round(15 * Math.min(1, v / 0.6, (WHALE_DOES.pec - v) / 0.5)), ang = 0.4 * Math.sin(v * 2.4) - 0.1;
        for (let q = 0; q < L; q++) { const x = Math.round(bx - 3 + Math.sin(ang) * q), y = by - 4 - Math.round(Math.cos(ang) * q), wide = q < L - 3 ? 2 : q < L - 1 ? 1 : 0;
          for (let i = 0; i <= wide + (q < 5 ? 1 : 0); i++) scr.set(x + i, y, i >= wide && wide ? R.white[0] : white); if (q % 3 === 1 && wide) scr.set(x - 1, y, white); }
        if (L > 2) { scr.set(bx - 4, by - 3, pale); scr.set(bx, by - 3, pale); }
      } else {
        // The back arches high, then the flukes lift, stand and slide under.
        if (v < 1.1) roll(4 - Math.round(v * 5), -Math.round(2 * Math.sin(Math.PI * v / 1.1)));
        const uf = v - 0.9; if (uf > 0 && uf < 1.75) sunk(scr, flukes[Math.round(3 * smooth(0.5, 1.5, uf))], bx - 6, by, Math.round(uf < 0.6 ? 25 * (1 - ease(uf / 0.6)) : uf < 0.95 ? 0 : 25 * ease((uf - 0.95) / 0.8)), t);
        if (uf >= 1.75 && uf < 2.4) foam(-12, 4);
      } };
    for (const [b, at] of [[0, 17], [1, 31]]) {
      const kind = b ? ['slap', 'pec', 'fluke'][Math.floor(hash(n, 7, 63) * 3)] : 'blow', v = u - at; if (v <= 0 || v >= WHALE_DOES[kind]) { if (v > 0) a.blows[b] = null; continue; }
      const P = a.blows[b] || (a.blows[b] = pickOpen(n * 3 + b + 1, ox, oy, scr.VW, scr.VH)); minor(kind, v, P[0], P[1], n * 10 + b * 4);
    }
    // One asked for by a click, where the whale was last seen.
    if (a.ask && t - a.ask[1] < WHALE_DOES[a.ask[0]]) minor(a.ask[0], t - a.ask[1], a.x - 10, a.y, 1e6 + a.ask[1]);
  }

  // Where water lies on in films on the bared flat, shining, 0 to 8 (most where the flat lies lowest).
// Each row of the sea (M3): the runs near the shore that the tide and the wash can reach, and the open
  // water's glints beyond them, found once, so the open sea's still pixels are not visited every frame.
  // Each row is found the first time it is drawn, so the page's start does not pay for rows out of sight.
  const ROWS = new Array(SEA.h);
  const seaRow = r => ROWS[r] || (ROWS[r] = (() => {
    const reach = 12 + EBB;
    {
      const runs = [], glints = []; let a = -1;
      for (let x = 0; x <= SEA.w; x++) {
        const j = r * SEA.w + x, k = x < SEA.w ? SEA.cs[j] : 0, near = k > 0 && k < reach;
        if (near && a < 0) a = x; else if (!near && a >= 0) { runs.push(a, x); a = -1; }
        if (x < SEA.w && !near && SEA.gate[j]) glints.push(x);
      }
      return { runs, glints: Int16Array.from(glints) };
    }
  })());
  // Only sand the lowest tide can bare is ever read (M3), so the open sea beyond it is skipped.
  const FILM = new Uint8Array(SEA.cs.length); for (let j = 0; j < FILM.length; j++) { const k = SEA.cs[j]; if (k < 8 || k >= 4 + EBB) continue; const x = j % SEA.w, y = SEA.y0 + ((j / SEA.w) | 0), n = vnoise(x / 13, y / 5, 6108) + 0.25 * smooth(8, 50, k); FILM[j] = Math.max(0, Math.min(8, Math.round((n - 0.6) * 30))); if (frac((k * 0.9 + 0.5 * Math.sin(x / 5)) / 3) < 0.22) FILM[j] |= 16; }
  const csAt = (x, y) => { if (x < 0 || x >= SEA.w || y < SEA.y0 || y >= SEA.y0 + SEA.h) return 0; return SEA.cs[(y - SEA.y0) * SEA.w + x]; };
  // Each river carries on across the sand the tide bares (T25). CHAN marks, over the same cells as the tide, where
  // its water runs (2) and the wet sand beside it (1). A mouth is found where river water in the ground's picture
  // meets the high-water line. From there the channel takes the beach's own fall line to the lowest water, swinging
  // a little, and splits into two and then three shallow threads as the flat levels out. The sea's loop draws a
  // cell of it only while the tide has that cell bared, so the tide coming in covers it again from the far end.
  const CHAN = riverOnFlat(SEA, g, EBB, csAt);
  // How far up the bared sand the last of each wave's wash runs, in the same units as the tide.
  const up0 = (wx, wy, tw) => { const u = frac((7 * Math.sin(wx / 37 + wy / 61) + tw) / 24), surge = u < 0.2 ? u / 0.2 : 1 - (u - 0.2) / 0.8; return 0.4 + 2.2 * surge + 0.7 * Math.sin(wx / 7 + wy / 9); };
  // The tide pools' animals (round 5, T33, TJ: "animate teh animals inside. Not just red blobs painted on
  // the map"). Each is drawn from a few pixels and moves on its own slow clock; k tells two of a kind apart.
  // A sea star, 5 px across: each arm's tip shifts a pixel now and then, so its shape slowly changes.
  const TIPS = [[[0, -2], [1, -2]], [[-2, 0], [-2, -1]], [[2, 0], [2, -1]], [[-2, 2], [-1, 2]], [[2, 2], [2, 1]]];
  const starAt = (scr, x, y, c, t, k) => { for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [-1, 1], [1, 1]]) scr.set(x + dx, y + dy, c[1]); scr.set(x, y, c[2]);
    TIPS.forEach(([p, q], n) => { const [dx, dy] = frac(t / (5 + n * 1.3) + k * 0.37 + n * 0.21) < 0.35 ? q : p; scr.set(x + dx, y + dy, c[0]); }); };
  // A small one for the small pools, 3 px across: a plus that turns to a cross and back.
  const smallStar = (scr, x, y, c, t, k) => { const turn = frac(t / 7 + k * 0.43) < 0.4; scr.set(x, y, c[2]); for (const [dx, dy] of turn ? [[-1, -1], [1, -1], [-1, 1], [1, 1]] : [[-1, 0], [1, 0], [0, -1], [0, 1]]) scr.set(x + dx, y + dy, c[1]); };
  // A green anemone: a short column with its mouth, and tentacles that lean one way and then the other.
  const anemoneAt = (scr, x, y, t, k) => { const s = Math.round(1.2 * Math.sin(t * 1.1 + k * 1.7)), M = R.moss;
    for (let dx = -1; dx <= 1; dx++) { scr.set(x + dx, y, dx ? M[4] : M[1]); scr.set(x + dx, y + 1, M[2]); }
    scr.set(x, y - 1, M[6]); for (const [dx, dy] of [[-2, -1], [-1, -2], [1, -2], [2, -1]]) scr.set(x + dx + (dy === -2 ? s : Math.sign(dx) === Math.sign(s) ? 0 : s), y + dy, M[5]); };
  // A purple urchin: its spines bristle.
  const urchinAt = (scr, x, y, t, k) => { const out = frac(t * 0.45 + k * 0.3) < 0.5; scr.set(x, y, R.lupine[1]); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) scr.set(x + dx, y + dy, R.lupine[0]); for (const [dx, dy] of out ? [[-1, -1], [1, 1]] : [[1, -1], [-1, 1]]) scr.set(x + dx, y + dy, R.mauve[0]); };
  // A crab, 5 px across: it goes sideways for a couple of seconds, legs working, and stops for a couple.
  // along(t): how far it has gone in all, so it stands still while it is stopped.
  const crabGone = (t, k) => { const T = t + k * 1.9, n = Math.floor(T / 4.2); return { d: (n * 2.4 + Math.min(T - n * 4.2, 2.4)) * 4, going: T - n * 4.2 < 2.4 }; };
  const crabAt = (scr, x, y, going, t) => { const leg = going ? Math.floor(t * 9) & 1 : 0;
    for (let dx = -1; dx <= 1; dx++) { scr.set(x + dx, y, R.red[1]); scr.set(x + dx, y + 1, R.red[0]); }
    scr.set(x - 2, y - 1, R.red[2]); scr.set(x + 2, y - 1, R.red[2]); scr.set(x - 2, y + 1 - leg, R.red[0]); scr.set(x + 2, y + leg, R.red[0]); };
  // A sculpin, 4 px long: it lies still on the bottom, then darts to another spot.
  const sculpinAt = (scr, px, py, spots, t) => { const u = frac(t / 5.5), n = Math.floor(t / 5.5), a = spots[n % spots.length], b = spots[(n + 1) % spots.length], f = smooth(0.92, 1, u), x = Math.round(lerp(a[0], b[0], f)) + px, y = Math.round(lerp(a[1], b[1], f)) + py, d = b[0] >= a[0] ? 1 : -1;
    scr.set(x + d, y, R.ochre[0]); scr.set(x, y, R.ochre[0]); scr.set(x - d, y, R.ochre[1]); scr.set(x - 2 * d, y, R.ochre[0]); scr.set(x, y + 1, R.ochre[1]); };
  const STAR_C = [R.lupine, R.blaze, [R.pink[0], R.pink[1], R.pink[2]]];
  function tidePools(scr, ox, oy, t, ebb) {
    for (const P of pools) { const e = ebb - P.s.cs; if (e < 3) continue; const show = smooth(3, 9, e), sx = P.s.x - ox, sy = P.s.y - oy; if (sx < -60 || sx > scr.VW + 60 || sy < -30 || sy > scr.VH + 30) continue;
      // Mussels in a dark band round the foot of the rock, barnacles white on them.
      for (let dx = -Math.ceil(P.s.half) - 1; dx <= P.s.half + 1; dx++) for (let dy = -1; dy <= 1; dy++) { if (bayerish(dx, dy, P.s.x) > show) continue; scr.set(sx + dx, sy + dy, hash(dx, dy, P.s.x + 6105) < 0.25 ? R.white[0] : R.jay[0]); }
      P.pools.forEach((p, k) => { const px = p.x - ox, py = p.y - oy;
        for (const [dx, dy, c] of p.px) if (bayerish(dx, dy, p.x) <= show) scr.set(px + dx, py + dy, c);
        if (show < 0.7) return;
        // Light on the water: a glint or two that wanders.
        { const n = Math.floor(t / 1.6), gx = Math.round((hash(n, k, 6111) - 0.5) * p.rx * 1.2), gy = Math.round((hash(n, k, 6112) - 0.5) * p.ry); if (frac(t / 1.6) < 0.5 && p.wet(gx, gy) && p.wet(gx + 1, gy)) { scr.set(px + gx, py + gy, R.sea[5]); scr.set(px + gx + 1, py + gy, R.sea[5]); } }
        if (p.life === 3) {
          // The pool to find: two sea stars, two anemones, an urchin, a sculpin, and a crab along its near rim.
          sculpinAt(scr, px, py, [[1, 1], [-4, -3], [8, -3], [2, 4], [-9, 3]], t);
          starAt(scr, px - 7, py, R.lupine, t, 0); starAt(scr, px + 5, py + 1, R.blaze, t, 1);
          anemoneAt(scr, px - 1, py - 1, t, 0); anemoneAt(scr, px + 10, py, t, 1); urchinAt(scr, px - 2, py + 3, t, 0);
          const g = crabGone(t, 0), L = 2 * p.rx - 6, q = g.d % (2 * L), cx = px - p.rx + 3 + (q < L ? q : 2 * L - q); crabAt(scr, Math.round(cx), py + p.ry + 5, g.going, t);
        } else if (p.life === 0) smallStar(scr, px, py, STAR_C[(k + (P.s.x & 1)) % 3], t, k + P.s.x);
        else if (p.life === 1) anemoneAt(scr, px, py + 1, t, k + P.s.x);
        else urchinAt(scr, px, py, t, k + P.s.x); });
      // Where there is no big pool, a crab sidles over the sand beside the pools, from the first to the last,
      // stopping now and then.
      if (show > 0.7 && !P.pools.some(p => p.life === 3)) { const a = P.pools[0], b = P.pools[P.pools.length - 1], side = Math.max(...P.pools.map(p => p.x + p.rx)) + 5, g = crabGone(t, 3), L = Math.max(6, Math.abs(b.y - a.y) + 6), q = g.d % (2 * L), f = (q < L ? q : 2 * L - q) / L;
        crabAt(scr, side - ox + Math.round(3 * f), Math.round(lerp(Math.min(a.y, b.y) - 3, Math.max(a.y, b.y) + 3, f)) - oy, g.going, t); }
    }
  }
  // ---- the orca pod (E6a) ----
  // Four orcas cruise down the coast together, out past the farthest stacks (100 to 110 from the
  // high-water line), where they read as orcas and not as rocks by the beach. Each surfaces every few seconds
  // in its own rhythm, the black back rolling up and the tall fin rising and sinking with it (the bull's
  // straight and tall, the cows' smaller and curved), a blow now and then as one comes up, and once a pass
  // one of them spyhops: head up out of the water, white eye patch and chin, to look about. A pass takes
  // about 100 s, every 160 s, the first 30 s after the page opens.
  const POD = [{ c: 66, lag: 0, bull: true }, { c: 71, lag: 18, bull: false }, { c: 62, lag: 31, bull: false }, { c: 68, lag: 45, bull: false }];
  const ORCA = { slot: 160, first: 30, speed: 6.5 }; let orcaAhead = ahead;
  // ---- the two fishing birds (round 5, T28 with T16 and T19) ----
  // A bald eagle keeps the top of the tallest sea stack. Every 40 to 70 s it lifts off, circles the stacks'
  // tops two or three times, glides out over open water, swoops low, takes a fish off the surface with a
  // splash and carries it back to its perch, where it eats. An osprey comes to Reflection Lake every 50 to
  // 80 s: in from the forest, twice round high over the water, a hover on fast wings, then it folds and
  // plunges feet first, comes up with a fish, shakes the water off and flies back the way it came. Both are
  // flyers under the shared rule (collide.js): free anywhere in the air, perching only on a perch. Each
  // flight is worked out from the clock alone, so it is the same however the clock is moved.
  const EAG = { slot: 55, first: 6, vary: 15, seed: 580 }, OSP = { slot: 65, first: 12, vary: 15, seed: 590, hover: 1.7, plunge: 0.45, under: 0.7, rise: 1.7, high: 22, hang: 18 };
  let eagAhead = 0, ospAhead = 0, eagleAt = 0;
  // Whether the ferry is passing a spot about then (set once the ferry is made, below): the eagle fishes elsewhere.
  let ferryNear = () => false;
  // The flight a clock is in (each slot has one, starting a little later or sooner), and how far into it.
  const slotOf = (S, t, ahead) => { const T = t + ahead, n = Math.floor(T / S.slot); return [n, T - n * S.slot - S.first - S.vary * hash(n, 1, S.seed)]; };
  const startNow = (S, t) => { const n = Math.floor(t / S.slot) + 1; return n * S.slot + S.first + S.vary * hash(n, 1, S.seed) - t; };
  // A flight course through way points [x, y, height above the ground, speed, name]: a smooth curve through
  // all of them (a long leg is first cut into short ones, so the curve never swings wide), flown at each
  // leg's speed. mark: when it reaches each named point.
  function course(way) {
    const P = [way[0]], T = [0], mark = {};
    for (let k = 1; k < way.length; k++) { const a = way[k - 1], b = way[k], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 26));
      for (let j = 1; j <= n; j++) { const q = [lerp(a[0], b[0], j / n), lerp(a[1], b[1], j / n), lerp(a[2], b[2], j / n)], z = P[P.length - 1]; T.push(T[T.length - 1] + Math.max(0.05, Math.hypot(q[0] - z[0], q[1] - z[1], q[2] - z[2]) / b[3])); P.push(q); }
      if (b[4]) mark[b[4]] = T[T.length - 1]; }
    const cr = (a, b, c, d, u) => 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u), N = P.length - 1;
    const at = s => { s = clamp(s, 0, T[N] - 1e-4); let k = 0; while (T[k + 1] <= s) k++;
      const u = (s - T[k]) / (T[k + 1] - T[k]), a = P[Math.max(0, k - 1)], b = P[k], c = P[k + 1], d = P[Math.min(N, k + 2)];
      return [cr(a[0], b[0], c[0], d[0], u), cr(a[1], b[1], c[1], d[1], u), Math.max(0, cr(a[2], b[2], c[2], d[2], u))]; };
    return { len: T[N], mark, at };
  }
  // A raptor on the wing, seen from behind and a little above, as the map sees everything: a short body,
  // head up, a wing out to each side. up: how far a wing's tip stands above the shoulder (below it, under
  // 0), so a wingbeat is up swinging from high to low and a glide is up held still. bank tips one wing up
  // and the other down. An eagle's wings are long straight planks; an osprey's rise to the wrist and droop
  // from there. sc under 1 draws it smaller, for a bird far off. carry: its feet down, or a fish in them.
  const BIRD = {
    eagle: { half: 11, wrist: 0, top: R.bark[1], under: R.bark[0], tip: R.fur[0], back: 3, tail: [R.white[1], R.white[1], R.white[0]], mask: 0 },
    osprey: { half: 9, wrist: 0.45, top: R.wood[2], under: R.wood[1], tip: R.bark[0], back: 3, tail: [R.wood[2], R.wood[1]], mask: R.bark[0] }
  };
  const fishAt = (scr, x, y, face) => { scr.set(x - 2 * face, y, R.shoe[0]); for (let i = -1; i <= 1; i++) { scr.set(x + i, y, R.shoe[1]); scr.set(x + i, y + 1, R.shoe[2]); } scr.set(x + 2 * face, y, R.shoe[2]); };
  function raptor(scr, x, y, K, up, face, bank = 0, sc = 1, carry = null) {
    seen[K === BIRD.eagle ? 'eagle' : 'osprey'] = [x, y]; if (inClear(scr, x, y)) saw(K === BIRD.eagle ? 'eagle' : 'osprey');
    const half = Math.max(2, Math.round(K.half * sc)), small = sc < 0.6;
    for (const s of [-1, 1]) { const lift = up + s * bank;
      for (let i = 2; i <= half + 1; i++) { const f = (i - 1) / half, dy = Math.round(K.wrist ? (f < K.wrist ? -(lift + 1.5) * f / K.wrist : -(lift + 1.5) + (f - K.wrist) / (1 - K.wrist) * (2.5 + 0.4 * lift)) : -lift * f);
        scr.set(x + s * i, y + dy, f > 0.8 ? K.tip : K.top); if (!small) { if (f < 0.86) scr.set(x + s * i, y + dy + 1, f > 0.8 ? K.tip : f < 0.45 ? K.top : K.under); if (f < 0.45) scr.set(x + s * i, y + dy + 2, K.under); } } }
    if (small) { scr.set(x, y - 1, R.white[1]); scr.set(x, y, K.top); scr.set(x, y + 1, K.under); return; }
    for (let i = -1; i <= 1; i++) { scr.set(x + i, y - 2, R.white[1]); scr.set(x + i, y - 1, R.white[i === -face ? 0 : 1]); for (let j = 0; j < K.back; j++) scr.set(x + i, y + j, i ? K.top : K.under); }
    if (K.mask) scr.set(x + face, y - 1, K.mask); else scr.set(x + 2 * face, y - 1, R.yellow[1]);
    // The tail: an eagle's is a white fan, widest in the middle.
    K.tail.forEach((c, j) => { const w = K.tail.length > 2 && j === 1 ? 2 : 1; for (let i = -w; i <= w; i++) scr.set(x + i, y + K.back + j, c); });
    if (carry) { const yf = y + K.back + K.tail.length - 1; scr.set(x - 1, yf, R.yellow[1]); scr.set(x + 1, yf, R.yellow[1]); if (carry === 'fish') fishAt(scr, x, yf + 1, face);
      // A stick for the nest, held across under it, longer than the bird is wide in the body (round 8, D2).
      if (carry === 'stick') for (let i = -5; i <= 5; i++) scr.set(x + i, yf + 1, i === 5 * face ? R.wood[2] : R.bark[1]); }
  }
  // Its shadow on the ground or the water under it, smaller the higher it flies.
  const shade = (scr, x, y, h) => { const { VW, VH, fb } = scr, w = h > 26 ? 2 : h > 10 ? 3 : 4; for (let dy = 0; dy < 2; dy++) for (let dx = -w + dy; dx <= w - dy; dx++) { const sx = x + dx, sy = y + dy; if (sx >= 0 && sy >= 0 && sx < VW && sy < VH) fb[sy * VW + sx] = SHADE[fb[sy * VW + sx]]; } };
  // Where it strikes the water (age 0 to 1): a ring that spreads to r and breaks up, a crown of drops thrown
  // up that fall back, white water in the middle.
  function splash(scr, x, y, age, r) {
    const rx = 2 + r * Math.sqrt(age), ry = rx * 0.42, n = Math.round(10 + r * 2.4), W1 = R.white[1];
    for (let k = 0; k < n; k++) { if (hash(k, 7, 583) < age * age) continue; const an = k / n * TAU; scr.set(Math.round(x + Math.cos(an) * rx), Math.round(y + Math.sin(an) * ry), W1); }
    if (age < 0.6) { const u = age / 0.6; for (let k = 0; k < r + 2; k++) scr.set(Math.round(x + (hash(k, 1, 584) - 0.5) * (4 + r * 1.4 * u)), Math.round(y - (3 + r * 0.9 * hash(k, 2, 584)) * 4 * u * (1 - u)), W1); }
    if (age < 0.45) for (let i = -2; i <= 2; i++) { scr.set(x + i, y, W1); if (Math.abs(i) < 2) scr.set(x + i, y - 1, age < 0.25 ? W1 : R.fog[2]); }
  }
  // A bird somewhere along a course: its shadow, then the bird, turned the way it is heading and banked
  // into its turn. Returns where it is.
  function aloft(scr, ox, oy, c, s, K, up, sc, carry) {
    const [x, y, h] = c.at(s), [x0, y0] = c.at(s - 0.2), [x1, y1] = c.at(s + 0.2), ax = x - x0, ay = y - y0, bx = x1 - x, by = y1 - y, m = Math.hypot(ax, ay) * Math.hypot(bx, by);
    const X = Math.round(x) - ox, Y = Math.round(y) - oy; if (X < -30 || X > scr.VW + 30 || Y - h > scr.VH + 20 || Y < -20) return [x, y, h];
    if (sc >= 0.6) shade(scr, X, Y, h);
    raptor(scr, X, Math.round(y - h) - oy, K, up, x1 >= x0 ? 1 : -1, m > 0.01 ? clamp(-9 * (ax * by - ay * bx) / m, -2, 2) : 0, sc, carry);
    return [x, y, h];
  }
  // The eagle on its perch, facing right: white head and tail, dark brown body, yellow beak and feet. Standing
  // up, and bowed over a fish it holds down on the rock.
  const perched = (rows, fish, dx = 0) => { const b = new BM(12 + 2 * dx, rows.length + 2); b.ox = 4 + dx; b.oy = rows.length;
    const C = { w: R.white[1], g: R.white[0], y: R.yellow[1], k: R.fur[0], K: R.bark[0], b: R.bark[1], e: INK, s: R.shoe[1], S: R.shoe[2], t: R.shoe[0] };
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (C[r[i]]) b.set(i + 1, j + 1, C[r[i]]); });
    if (fish) { const j = rows.length; 'tsssS'.split('').forEach((ch, i) => b.set(6 + dx + i, j, C[ch])); }
    outline(b, INK); return b; };
  const SIT = ['..www...', '.wwwwy..', '.gwewyy.', '..gww...', '.kKKKk..', 'kKKbKKk.', 'kKKKbKk.', 'kKKKKKk.', '.kKKKk..', '.wwKk...', '.gw.yy..'];
  const BOW = ['........', '........', '........', '........', '.kKKk...', 'kKKKKww.', 'kKKbKwwy', 'kKKKKgey', '.kKKKk..', '.wwKk...', '.gw.yy..'];
  // Round 8, D2, each after a picture: preening, its head down in its breast feathers (two drawings); calling,
  // its head thrown back and its bill open to the sky; mantling, its wings spread and drooped over what it holds.
  const PREEN = ['........', '........', '..www...', '.wwwww..', '.kKwey..', 'kKKbyKk.', 'kKKKbKk.', 'kKKKKKk.', '.kKKKk..', '.wwKk...', '.gw.yy..'];
  const PREEN2 = ['........', '........', '........', '..www...', '.kwwww..', 'kKKwyKk.', 'kKKKyKk.', 'kKKKKKk.', '.kKKKk..', '.wwKk...', '.gw.yy..'];
  const CALL = ['...y.y..', '..wwy...', '.wwew...', '.gwww...', '.kKKKk..', 'kKKbKKk.', 'kKKKbKk.', 'kKKKKKk.', '.kKKKk..', '.wwKk...', '.gw.yy..'];
  const MANTLE = ['k...........k.', 'kK.........Kk.', '.kKk.....kKk..', '.kKKk...kKKk..', '..kKKkKkKKk...', '...kKKKKKww...', '...kKKbKwwwy..', '....kKKKgey...', '....kKKKk.....', '....wwKk......', '....gw.yy.....'];
  const EAGLE_BM = { sit: perched(SIT), fed: perched(SIT, true), bow: perched(BOW, true), none: new BM(1, 1), preen: [perched(PREEN), perched(PREEN2)], call: perched(CALL), mantle: [perched(MANTLE, false, 3), perched(MANTLE, true, 3)] };
  // Its five things: it soars and stoops in each flight, as before; on its perch it preens and calls now and
  // then, and when it comes back with a fish it mantles over it before it eats. A click steps it through
  // preening, calling, mantling and flying. How many seconds each of the three on the perch lasts:
  const EAGLE_DOES = { preen: 3.6, call: 1.5, mantle: 2.4 }, EAGLE_TURN = ['preen', 'call', 'mantle', 'fly'];
  // No bird flies where a stack's drawing would hide the water it strikes.
  const hiddenBy = (x, y) => stacks.some(s => Math.abs(x - s.x) < s.half + 6 && y < s.y + 4 && y > s.y - s.tall - 6);
  // The eagle's perches: the top of each stack's drawing (its highest row, at that row's middle), the tallest
  // first. Its own is the tallest; the debug menu can move it to another.
  const TOPS = stacks.map(s => { const b = s.bm; for (let j = 0; j < b.h; j++) { let a = -1, z = -1; for (let i = 0; i < b.w; i++) if (b.d[j * b.w + i]) { if (a < 0) a = i; z = i; } if (a >= 0) return { s, x: s.x - b.ox + ((a + z) >> 1), y: s.y - b.oy + j, tall: b.oy - j }; } return null; })
    .filter(p => p && p.x > 44 && p.y > 20 && p.tall >= 28).sort((a, b) => b.tall - a.tall);
  const eagles = TOPS.map(() => null), eagleHome = draw && TOPS.length ? Math.floor(draw() * TOPS.length) : 0; eagleAt = eagleHome;
  const eagle = () => { const p = TOPS[eagleAt]; if (!p) return null; if (eagles[eagleAt]) return eagles[eagleAt];
    // It circles the tops of the stacks that stand round its own: a ring at the height of its own top, behind
    // it on the far side and across the stack's head on the near side.
    const near = TOPS.filter(q => Math.hypot(q.s.x - p.s.x, q.s.y - p.s.y) < 80), A = p.tall + 2, C = [near.reduce((a, q) => a + q.s.x, 0) / near.length, p.s.y + 6], RX = 30, RY = 12;
    // Where it fishes: open water 60 to 140 from its stack that is deep at the lowest tide, well clear of every
    // stack and not hidden behind one.
    const fish = []; for (let r = 60; r <= 140 && fish.length < 5; r += 10) for (let a = 0; a < 16; a++) { const x = Math.round(p.s.x + r * Math.cos(a * TAU / 16 + r)), y = Math.round(p.s.y + r * 0.6 * Math.sin(a * TAU / 16 + r));
      if (x > 60 && y < NH - 30 && onSeaAt(x, y) && col.canBe('swimmer', x, y, { ebb: EBB }, 6) && !hiddenBy(x, y) && fish.every(f => Math.hypot(f[0] - x, f[1] - y) > 34)) fish.push([x, y]); }
    const memo = {}, flight = n => { if (memo.n === n) return memo.c; memo.n = n; memo.c = null; if (!fish.length) return null;
      const laps = hash(n, 2, 581) < 0.5 ? 2 : 3, k0 = (hash(n, 3, 581) * fish.length) | 0, t0 = n * EAG.slot + EAG.first + EAG.vary * hash(n, 1, EAG.seed) - eagAhead, dir = hash(n, 4, 581) < 0.5 ? 1 : -1, a0 = hash(n, 5, 581) * TAU;
      const plan = F => {
      const pt = j => [C[0] + RX * Math.cos(a0 + dir * j * TAU / 8), C[1] + RY * Math.sin(a0 + dir * j * TAU / 8)];
      // It leaves the circle where the circle is heading for the fish.
      const aim = j => { const [x, y] = pt(j), [x2, y2] = pt(j + 0.2), tx = x2 - x, ty = y2 - y, fx = F[0] - x, fy = F[1] - y; return (tx * fx + ty * fy) / (Math.hypot(tx, ty) * Math.hypot(fx, fy) || 1); };
      let last = laps * 8; for (let j = last + 1; j < laps * 8 + 8; j++) if (aim(j) > aim(last)) last = j;
      const way = [[p.x, p.s.y, p.tall + 6, 20]]; for (let j = 0; j <= last; j++) way.push([...pt(j), A, j ? 34 : 22, j ? (j === last ? 'leave' : null) : 'round']);
      const [ex, ey] = pt(last), d = Math.hypot(F[0] - ex, F[1] - ey) || 1, ux = (F[0] - ex) / d, uy = (F[1] - ey) / d, run = Math.min(30, d * 0.6);
      way.push([F[0] - ux * run, F[1] - uy * run, 9, 46], [F[0], F[1], 1.5, 46, 'fish']);
      // On past the fish, climbing, and round to the perch.
      const bx = F[0] + ux * 26, by = F[1] + uy * 26, hd = Math.hypot(p.x - bx, p.s.y - by) || 1, hx = (p.x - bx) / hd, hy = (p.s.y - by) / hd;
      way.push([bx + hx * 8, by + hy * 8, 11, 34], [p.x - hx * 16, p.s.y - hy * 16, p.tall + 13, 36], [p.x, p.s.y, p.tall + 6, 18]);
      return Object.assign(course(way), { F }); };
      // The first of its fishing spots, starting from this flight's own, that the ferry is not passing as it strikes.
      for (let i = 0; i < fish.length; i++) { memo.c = plan(fish[(k0 + i) % fish.length]); if (!ferryNear(memo.c.F[0], memo.c.F[1], t0 + memo.c.mark.fish)) break; }
      return memo.c; };
    return eagles[eagleAt] = { p, C, RX, RY, A, fish, flight }; };
  // The eagle as a thing on the map, so it is drawn with its stack and the fog covers both: on its perch it
  // looks about, and for a while after a catch it eats. In the air this thing is empty and over() draws it.
  const eagleItem = TOPS.length ? { critter: 'eagle', col: 'flyer', f: EAGLE_BM, bm: EAGLE_BM.sit, x: 0, y: 0, hop: 0, lift: 0, flip: false } : null;
  if (eagleItem) items.push(eagleItem);
  let nowT = 0;
  function eagleSits(t) {
    const E = eagle(); if (!E) return; const a = eagleItem, [n, s] = slotOf(EAG, t, eagAhead), c = E.flight(n), fed = c ? s - c.len : -1;
    a.x = E.p.x; a.y = E.p.s.y + 1; a.hop = a.lift = E.p.s.y + 1 - E.p.y;
    if (c && s >= 0 && fed < 0) { a.bm = EAGLE_BM.none; return; }
    a.flip = fed >= 0 && fed < 10 ? hash(n, 6, 581) < 0.5 : hash(Math.floor(t / 4.3), 2, 582) < 0.5;
    a.bm = fed >= 0 && fed < 10 ? (fed < 1.8 ? EAGLE_BM.mantle[1] : frac(fed / 1.6) < 0.45 ? EAGLE_BM.bow : EAGLE_BM.fed) : EAGLE_BM.sit;
    if (fed >= 0 && fed < 10) return;
    // Idle on the perch: asked by a click, or on its own for a few seconds in every 17.
    const k = Math.floor(t / 17), own = hash(k, 3, 583) < 0.55 ? (hash(k, 4, 583) < 0.7 ? 'preen' : 'call') : null, A = a.ask && t - a.ask[1] < EAGLE_DOES[a.ask[0]] ? a.ask : own && t - k * 17 < EAGLE_DOES[own] ? [own, k * 17] : null;
    if (!A) return; const v = t - A[1];
    if (A[0] === 'call' && a.cried !== A[1]) { a.cried = A[1]; a.say = 'cry'; }
    a.bm = A[0] === 'preen' ? EAGLE_BM.preen[Math.floor(v * 3) & 1] : A[0] === 'call' ? EAGLE_BM.call : EAGLE_BM.mantle[0];
  }
  function eagleFlies(scr, ox, oy, t) {
    seen.eagle = null;
    const E = eagle(); if (!E) return; const [n, s] = slotOf(EAG, t, eagAhead), c = E.flight(n); if (!c || s < 0 || s >= c.len) return;
    const sf = s - c.mark.fish; if (sf >= 0 && sf < 1) splash(scr, Math.round(c.F[0]) - ox, Math.round(c.F[1]) - oy, sf, 5);
    const up = s < c.mark.round ? 4.5 * Math.sin(s * TAU * 3.2)                                   // lifting off
      : s < c.mark.leave ? (frac(s / 2.6 + 0.3) < 0.22 ? 3.5 * Math.sin(s * TAU * 3) : 1)          // circling, mostly on set wings
      : sf < -0.7 ? 1.2 : sf < 0.25 ? 5                                                            // the glide out, then wings high and feet down
      : sf < 2.4 ? 4.5 * Math.sin(s * TAU * 3.4)                                                   // hauling the fish up
      : s > c.len - 0.7 ? 5 * Math.abs(Math.sin(s * TAU * 3)) : frac(s / 2.2) < 0.5 ? 4 * Math.sin(s * TAU * 3) : 1;
    aloft(scr, ox, oy, c, s, BIRD.eagle, up, 1, sf >= 0 ? 'fish' : sf > -0.7 ? 'feet' : null);
  }
  if (eagleItem) eagleSits(0);
  // The osprey at Reflection Lake. It dives where the land says (the middle of the lake's open water), and
  // comes from and goes back to the thickest forest within reach of the lake. It flies low enough over the
  // lake (OSP.high) that it is drawn over the water: the lake is a shallow oval on the picture, and a bird
  // high above it would be drawn over the meadow behind.
  const ospreyAt = dive => { const L = spots.osprey; if (!L) return null; const [cx, cy, rx, ry] = L.lake, FAR = 250;
    let best = -1e9, home = [-1, 0]; for (let a = 0; a < 16; a++) { const ux = Math.cos(a * TAU / 16), uy = Math.sin(a * TAU / 16) * 0.6; let f = 0; for (const r of [110, 160, 210]) { const x = cx + ux * r, y = cy + uy * r; f += x > 30 && y > 30 && x < NW - 30 && y < NH - 30 ? W.forestAmt(x, y) : -1; } if (f > best) { best = f; home = [ux, uy]; } }
    const far = [cx + home[0] * FAR, cy + home[1] * FAR], mid = [cx + home[0] * 110, cy + home[1] * 110], a0 = Math.atan2(home[1] / (ry * 0.4), home[0] / (rx * 0.55)), HI = OSP.high, HV = OSP.hang;
    const pt = j => [cx + rx * 0.55 * Math.cos(a0 + j * TAU / 8), cy + ry * 0.3 + ry * 0.4 * Math.sin(a0 + j * TAU / 8)];
    // Twice round, then on round to the point of the circle nearest its dive.
    let last = 16; for (let j = 17; j < 24; j++) if (Math.hypot(pt(j)[0] - dive[0], pt(j)[1] - dive[1]) < Math.hypot(pt(last)[0] - dive[0], pt(last)[1] - dive[1])) last = j;
    const way = [[...far, 64, 58], [...mid, 40, 52]]; for (let j = 0; j <= last; j++) way.push([...pt(j), HI, 30]); way.push([dive[0], dive[1], HV, 20]);
    // Round 8, D2: the way home from the hover without a dive (a visit with a stick), and the nearest tall
    // tree's top within reach of the dive, where it sometimes takes its fish to eat.
    const T = TRUNKS.filter(q => q.h >= 24).map(q => [q, Math.hypot(q.x - dive[0], (q.y - dive[1]) / 0.6)]).filter(q => q[1] > 30 && q[1] < 150).sort((a, b) => a[1] - b[1])[0];
    const P = T && { x: T[0].x, y: T[0].y, tall: T[0].h - 1 }, top = P && [P.x, P.y, P.tall + 2];
    return { dive, dives: [W.spots.osprey.dive, ...(W.spots.osprey.dives || [])], lake: L.lake, home, inn: course(way), out: course([[dive[0], dive[1], 9, 30], [...mid, 36, 44], [...far, 64, 58]]),
      over: course([[dive[0], dive[1], HV, 30], [...mid, 36, 44], [...far, 64, 58]]), perch: P, toPerch: P && course([[dive[0], dive[1], 9, 26], [(dive[0] + P.x) / 2, (dive[1] + P.y) / 2, P.tall + 10, 30], [...top, 22]]), fromPerch: P && course([[...top, 24], [...mid, 40, 44], [...far, 64, 58]]), sc: (x, y) => smooth(FAR - 10, 130, Math.hypot(x - cx, (y - cy) / 0.6)) }; };
  // Where on the lake it fishes this visit (D1); the spawn menu can send it to another of its places.
  let OSPREY = ospreyAt(spots.osprey && spots.osprey.dive);
  // The osprey perched, facing right: white head with a dark stripe through the eye, brown back, white breast.
  const OSP_BM = [perched(['..www...', '.wwkey..', '..wwk...', '.KKwww..', 'KKbwww..', 'KKKwww..', 'KKKKww..', '.KKKw...', '.KKk....', '.Kk.yy..'], true), perched(['........', '........', '........', '.KKK....', 'KKbKww..', 'KKKKwkw.', 'KKKKwwey', '.KKKww..', '.KKk....', '.Kk.yy..'], true)];
  // Its five things (round 8, D2): it hovers, dives and rises with a fish, and shakes the water off, as
  // before. Now one visit in three it takes the fish to a treetop by the lake and eats it there, and one in
  // three it crosses the lake with a stick for its nest and does not fish. A click brings the next kind of
  // visit at once (ospWant: the slot it was asked for, and the kind).
  const OSP_KINDS = ['fish', 'eat', 'stick'], OSP_EATS = 9; let ospWant = [-1, 'fish'], ospTurn = -1;
  const ospKind = n => ospWant[0] === n ? ospWant[1] : OSP_KINDS[Math.floor(hash(n, 9, OSP.seed) * 3)];
  const ospNow = (kind, t) => { ospWant = [Math.floor((t + ospAhead) / OSP.slot) + 1, kind]; ospAhead += startNow(OSP, t + ospAhead); };
  function ospreyFlies(scr, ox, oy, t) {
    seen.osprey = null;
    const O = OSPREY; if (!O) return; const [n, s] = slotOf(OSP, t, ospAhead); if (s < 0) return;
    const K = BIRD.osprey, dx = Math.round(O.dive[0]) - ox, dy = Math.round(O.dive[1]) - oy, a = s - O.inn.len, kind = ospKind(n) === 'eat' && !O.perch ? 'fish' : ospKind(n), stick = kind === 'stick' ? 'stick' : null;
    // In from the forest and round over the lake, mostly on set wings.
    if (a < 0) { const [x, y] = O.inn.at(s); aloft(scr, ox, oy, O.inn, s, K, frac(s / 2.3) < 0.3 ? 4 * Math.sin(s * TAU * 3.4) : 0, O.sc(x, y), stick); return; }
    // With a stick it does not stop: on over the water and away to the trees.
    if (stick) { if (a < O.over.len) { const [x, y] = O.over.at(a); aloft(scr, ox, oy, O.over, a, K, frac(a / 2.1) < 0.6 ? 4 * Math.sin(a * TAU * 3.6) : 0, O.sc(x, y), stick); } return; }
    // The hover: fast wingbeats, hanging over one spot.
    if (a < OSP.hover) { shade(scr, dx, dy, OSP.hang); raptor(scr, dx + Math.round(Math.sin(t * 3)), dy - OSP.hang - Math.round(Math.sin(t * 5.3)), K, [5, 0.5, -4][Math.floor(t * 20) % 3], 1, 0, 1, a > OSP.hover - 0.5 ? 'feet' : null); return; }
    // It folds its wings and drops feet first, faster and faster.
    if (a < OSP.hover + OSP.plunge) { const p = (a - OSP.hover) / OSP.plunge, h = OSP.hang * (1 - p * p); shade(scr, dx, dy, h); raptor(scr, dx, dy - Math.round(h), K, 6, 1, 0, 0.6, 'feet'); return; }
    const w = a - OSP.hover - OSP.plunge; if (w < 2.2) splash(scr, dx, dy, w / 2.2, 12); if (w > 0.3 && w < 2) splash(scr, dx, dy, (w - 0.3) / 1.7, 6);
    if (w < OSP.under) return;
    // Up out of the water on heavy wings with the fish, drops falling from it, and a shake to throw them off.
    const r = w - OSP.under; if (r < OSP.rise) { const h = 1 + 8 * smooth(0, OSP.rise, r), shake = r > 0.9 && r < 1.4 ? (Math.floor(t * 14) & 1 ? 1 : -1) : 0;
      for (let k = 0; k < 5; k++) { const age = frac(t * 2.2 + k / 5); if (hash(k, Math.floor(t * 2.2 + k / 5), 592) < 0.75 - r / OSP.rise * 0.5) scr.set(dx + Math.round((hash(k, 3, 592) - 0.5) * 12), dy - Math.round(h) + 4 + Math.round(age * (h + 2)), R.white[1]); }
      shade(scr, dx, dy, h); raptor(scr, dx + shake, dy - Math.round(h), K, 4.5 * Math.sin(r * TAU * 4.5), 1, 0, 1, 'fish'); return; }
    const q = r - OSP.rise;
    // To the treetop with its fish, a while bent over it there, and home.
    if (kind === 'eat') { const e = q - O.toPerch.len, P = O.perch;
      if (e < 0) aloft(scr, ox, oy, O.toPerch, q, K, 4 * Math.sin(q * TAU * 3.6), 1, 'fish');
      else if (e < OSP_EATS) { const X = Math.round(P.x) - ox, Y = Math.round(P.y - P.tall) - oy; seen.osprey = [X, Y - 5]; if (inClear(scr, X, Y - 5)) saw('osprey'); scr.put(OSP_BM[e > 1 && frac(e / 1.7) < 0.5 ? 1 : 0], X, Y, hash(n, 6, OSP.seed) < 0.5); }
      else if (e - OSP_EATS < O.fromPerch.len) { const w = e - OSP_EATS, [x, y] = O.fromPerch.at(w); aloft(scr, ox, oy, O.fromPerch, w, K, frac(w / 2.1) < 0.6 ? 4 * Math.sin(w * TAU * 3.6) : 0, O.sc(x, y), null); }
      return; }
    if (q < O.out.len) { const [x, y] = O.out.at(q); aloft(scr, ox, oy, O.out, q, K, frac(q / 2.1) < 0.6 ? 4 * Math.sin(q * TAU * 3.6) : 0, O.sc(x, y), 'fish'); }
  }
  // Each orca's lane, row by row down the sea: the spot nearest the shore that is as far out as its own line
  // (c from the high-water line, and as much farther as the tide has dropped) and clear of the stacks.
  const orcaLine = (o, ebb) => lane(Array.from({ length: SEA.h }, (_, r) => { for (let x = SEA.w - 1; x >= 0; x--) if (SEA.cs[r * SEA.w + x] >= o.c + 4 + ebb && col.canBe('swimmer', x, SEA.y0 + r, { ebb }, 4)) return x; return null; }), -1, 44, 40);
  // len: how far along its high-water lane each row is, so the pod swims at one speed where the coast
  // turns as well as where it runs straight (it used to cross the map a row at a time, and raced round the corner).
  const LANES = POD.map(o => { const hi = orcaLine(o, 0), lo = orcaLine(o, EBB), r0 = Math.max(0, hi.findIndex(v => v != null)), len = new Float32Array(SEA.h);
    for (let r = r0 + 1; r < SEA.h; r++) len[r] = len[r - 1] + (hi[r] == null || hi[r - 1] == null ? 1 : Math.hypot(hi[r] - hi[r - 1], 1)); return { hi, lo, r0, len }; });
  ORCA.dur = Math.max(...POD.map((o, i) => (LANES[i].len[SEA.h - 1] + 20 + o.lag) / ORCA.speed)) + 2;
  // Where one of the pod is, s seconds into the pass: on its depth line, then clear of the stacks. Nothing
  // before it has come onto the map or after it has left, or where no clear water is near.
  // Where the low-water lane has not begun (the sea is narrow at the top of the map) it counts as just off the
  // west edge, so at low water the pod comes onto the map farther down. Never drawn where the rule says no.
  const orcaAt = (i, s, t) => { const { hi, lo, r0, len } = LANES[i], d = s * ORCA.speed - 20 - POD[i].lag; if (d < 0 || d >= len[SEA.h - 1]) return null;
    let a = r0, b = SEA.h - 1; while (b - a > 1) { const m = (a + b) >> 1; if (len[m] <= d) a = m; else b = m; }
    if (hi[a] == null || hi[b] == null) return null;
    const f = (d - len[a]) / Math.max(1e-6, len[b] - len[a]), e = ebbAt(t) / EBB, at = r => lerp(hi[r], lo[r] == null ? -12 : lo[r], e), x = lerp(at(a), at(b), f), y = SEA.y0 + a + f;
    return col.canBe('swimmer', x, y, t, 4) ? [x, y] : null; };
  const podNow = [];   // what each orca in the view is at, for the checks
  function orcas(scr, ox, oy, t) {
    seen.orca.length = 0; podNow.length = 0;
    const T = t + orcaAhead - ORCA.first, n = Math.floor(T / ORCA.slot), s = T - n * ORCA.slot; if (T < 0 || s > ORCA.dur) return;
    // As the tide goes out the pod keeps the same depth under it, so its lanes move out with the water (T15).
    POD.forEach((o, i) => {
      const at = orcaAt(i, s, t); if (!at) return;
      const x = Math.round(at[0]) - ox, y = Math.round(at[1]) - oy; if (x < -20 || x > scr.VW + 20 || y < -20 || y > scr.VH + 6) return;
      // A clicked orca spyhops at once (note 10): it is in sight, so it can be clicked, only while it is up.
      // What it is at besides travelling (round 8, D2): asked by a click, or in the pass's own order. Once a
      // pass one of them spyhops, one breaches and one slaps its tail, and for a few seconds the whole pod porpoises.
      const A = orcaAsk[i] && t - orcaAsk[i][1] < ORCA_DOES[orcaAsk[i][0]] ? orcaAsk[i] : null, own = k => { const who = Math.floor(hash(n, k, 6301) * POD.length), v = s - (22 + 60 * hash(n, k + 1, 6301)); return i === who && v > 0 ? v : -1; };
      let kind = A ? A[0] : null, v = A ? t - A[1] : 0;
      if (!A) for (const [k, name] of [[1, 'spyhop'], [11, 'breach'], [21, 'slap']]) { const w = own(k); if (w >= 0 && w < ORCA_DOES[name]) { kind = name; v = w; } }
      // The one behind follows a spyhop a second later (round 8, H4): the next of the pod after the one that
      // went up, whether by the pass's own order or after a click.
      if (!kind && i > 0) { const B = orcaAsk[i - 1], wB = B && B[0] === 'spyhop' ? t - B[1] - 1 : -1, wN = Math.floor(hash(n, 1, 6301) * POD.length) === i - 1 ? s - (22 + 60 * hash(n, 2, 6301)) - 1 : -1, w = wB >= 0 && wB < ORCA_DOES.spyhop ? wB : wN; if (w >= 0 && w < ORCA_DOES.spyhop) { kind = 'spyhop'; v = w; } }
      if (!kind && s > 48 && s < 55) { kind = 'porpoise'; v = s - 48; }
      podNow[i] = kind;
      if (kind && kind !== 'blow') { seen.orca[i] = [x, y]; if (inClear(scr, x, y)) saw('orca');
        if (kind === 'spyhop') return spyhop(scr, x, y, v / ORCA_DOES.spyhop, t);
        if (kind === 'breach') return leap(scr, x, y, v / ORCA_DOES.breach, 11, 22, o.bull, t);
        if (kind === 'slap') return tailSlap(scr, x, y, v, t, i);
        return leap(scr, x, y, frac(v / 1.1 + i * 0.37), 5, 16, o.bull, t); }
      const ph = kind ? v / ORCA_DOES.blow * 0.55 : frac(s / 4.2 + i * 0.31), q = ph / 0.55; if (q >= 1) return; const h = Math.sin(Math.PI * q);
      if (h > 0.3) seen.orca[i] = [x, y];
      orcaBack(scr, x, y, h, o.bull, t, i);
      if (h > 0.3 && inClear(scr, x, y)) saw('orca');
      // A blow as it comes up, now and then.
      if (q < 0.45 && (kind || hash(Math.floor(s / 4.2), i, 6302) < 0.35)) { const k = q / 0.45, hgt = Math.round(3 + 4 * k); for (let j = 0; j < hgt; j++) { if (k > 0.6 && (j + Math.floor(t * 8)) % 2) continue; const sp = j > hgt - 3 ? 1 : 0; scr.set(x + 3 - sp, y - 3 - j, R.white[1]); if (sp) scr.set(x + 3 + sp, y - 3 - j, R.white[1]); } }
    });
  }
  // Clear of the water (round 8, D2, after pictures of orcas breaching and porpoising): the whale comes out,
  // goes over in an arc and back in head first, drawn along the arc it travels. u: 0 as the head leaves the
  // water to 1 as the tail goes under. H: how high the arc stands. D: how far it reaches. Black above, the
  // white of the belly and chin on the inside of the arc, the white eye patch behind the head, the fin on its back.
  function leap(scr, x, y, u, H, D, bull, t) {
    const N = R.navy, LEN = 0.5, head = u * (1 + LEN), w0 = Math.max(0, head - LEN), w1 = Math.min(1, head), at = w => [x - D / 2 + D * w, y - 4 * H * w * (1 - w)];
    const beat = Math.floor(t * 8), burst = (cx, age) => { if (age < 0 || age > 0.5) return; for (let k = 0; k < 9; k++) { const a = age / 0.5, px = Math.round(cx + (hash(k, 1, 6311) - 0.5) * 12 * (0.4 + a)), py = Math.round(y - (3 + 6 * hash(k, 2, 6311)) * Math.sin(Math.PI * a)); scr.set(px, py, R.white[1]); } for (let dx = -5; dx <= 5; dx++) if (hash(dx, beat, 6312) < 0.6) scr.set(Math.round(cx) + dx, y, R.white[1]); };
    burst(x - D / 2, u * (1 + LEN) / 2.2); burst(x + D / 2, (head - 1) / 1.4);
    if (w1 <= w0) return;
    for (let k = 0; k <= 30; k++) { const w = w0 + (w1 - w0) * k / 30, [px, py] = at(w), f = (head - w) / LEN, sl = 4 * H * (1 - 2 * w) / D, nl = Math.hypot(1, sl), nx = -sl / nl, ny = -1 / nl;
      if (py > y - 0.5) continue;
      // f: 0 at the head to 1 at the tail. The body is thickest a third of the way back and tapers to the stock.
      const r = f < 0.07 ? 1.2 : f > 0.85 ? 0.9 : f > 0.65 ? 1.5 : 2.3;
      for (let b = -3; b <= 3; b++) for (let a = -3; a <= 3; a++) if (a * a + b * b <= r * r + 0.3) { const side = a * nx + b * ny; if (py + b < y) scr.set(Math.round(px + a), Math.round(py + b), side < -1 && f > 0.04 && f < 0.6 ? R.white[1] : side > 1.4 ? N[2] : N[0]); }
      if (f > 0.1 && f < 0.18) scr.set(Math.round(px + nx * 1.2), Math.round(py + ny * 1.2), R.white[1]);
      if (f > 0.4 && f < 0.5) for (let j = 3; j <= (bull ? 7 : 5); j++) if (py + ny * j < y) scr.set(Math.round(px + nx * j + (bull ? 0 : -0.3 * j)), Math.round(py + ny * j), j === 3 ? N[1] : INK); }
  }
  // A tail slap: the flukes come up on the stock, stand, and come down flat with a crack, three times over.
  function tailSlap(scr, x, y, v, t, i) {
    const N = R.navy, k = Math.floor(v / 1.1), w = v - k * 1.1, up = Math.round(w < 0.4 ? 6 * w / 0.4 : w < 0.62 ? 6 : w < 0.72 ? 6 * (0.72 - w) / 0.1 : 0), beat = Math.floor(t * 8);
    for (let j = 1; j <= up; j++) { scr.set(x, y - j, N[0]); scr.set(x + 1, y - j, j > up - 2 ? N[2] : N[0]); }
    if (up >= 3) for (let dx = -3; dx <= 4; dx++) { const lift = Math.abs(dx - 0.5) > 2 ? 1 : 0; scr.set(x + dx, y - up - lift, dx < 0 ? N[2] : N[0]); if (Math.abs(dx - 0.5) < 3) scr.set(x + dx, y - up + 1 - lift, Math.abs(dx - 0.5) > 1 ? R.white[0] : N[0]); }
    if (w >= 0.72) { const a = (w - 0.72) / 0.38; for (let q = 0; q < 10; q++) scr.set(Math.round(x + (hash(q, k + i * 7, 6321) - 0.5) * 16 * (0.3 + a)), Math.round(y - (2 + 6 * hash(q, k, 6322)) * Math.sin(Math.PI * a)), R.white[1]); if (orcaSlapped[i] !== k + Math.floor(t - v)) { orcaSlapped[i] = k + Math.floor(t - v); sounds.push('plop'); } }
    for (let dx = -6; dx <= 7; dx++) if (hash(dx, beat + i * 9, 6323) < (w >= 0.72 ? 0.8 : 0.4)) scr.set(x + dx, y, R.white[1]);
  }
  // The back above the water by h (0 to 1). A14, after a picture of four orcas surfacing: a glossy black arc
  // lit along its top on the sun's side (upper left) and dark on the other, the grey saddle just behind the
  // fin, the white eye patch at the head end as it comes up, the fin lit on its left edge (the bull's tall
  // and straight, the cows' smaller and curved back), white water at the bow and a thin wake behind.
  function orcaBack(scr, x, y, h, bull, t, i) {
    const N = R.navy, top = dx => Math.round(h * 3.6 * (1 - (dx / 8.6) ** 2));
    for (let dx = -8; dx <= 8; dx++) { const tp = top(dx); for (let j = 1; j <= tp; j++) {
      let c = N[0];
      if (j === tp) c = dx < 2 ? N[2] : INK;
      else if (j === tp - 1 && dx < -1 && dx > -7) c = N[1];
      if (h > 0.55 && dx >= -5 && dx <= -2 && j >= tp - 2 && j < tp && dx + (tp - j) > -6) c = j === tp - 1 ? R.rock[4] : R.rock[3];
      if (h > 0.6 && (dx === 5 || dx === 6) && j === 1) c = R.white[1];
      scr.set(x + dx, y - j, c); } }
    const fh = Math.round((bull ? 11 : 6) * h), base = y - top(1);
    for (let j = 1; j <= fh; j++) { const lean = bull ? 0 : -Math.round(1.6 * (j / fh) ** 1.5), w = j < fh * 0.55 ? 2 : 1;
      for (let k = 0; k < w; k++) scr.set(x + 1 + lean - k, base - j, w === 2 && k === 1 ? N[2] : w === 1 && j < fh ? N[1] : INK); }
    const beat = Math.floor(t * 6);
    if (h > 0.4) for (let dx = 7; dx <= 9; dx++) if (hash(dx, beat + i * 9, 6305) < 0.7) scr.set(x + dx, y - (dx === 7 ? 1 : 0), R.white[1]);
    for (let dx = -11; dx <= 11; dx++) if (Math.abs(dx) > 7 - h * 3 && hash(dx, beat + i * 9, 6303) < 0.55) scr.set(x + dx, y, R.white[1]);
    for (let dx = -16; dx < -9; dx++) if (hash(dx, beat + i * 5, 6306) < 0.35 * h) scr.set(x + dx, y + (dx & 1), R.white[0]);
  }
  // A spyhop (round 8, B6, after a picture; TJ: the old one, a post three pixels wide, looked off): the whale
  // stands in the water with its head and a third of its body out, leaning the way it swims. The blunt head
  // is black and glossy on the back, which is to the light, white on the chin and throat, with the white
  // patch behind the eye; a pectoral fin shows at the waterline on the belly side once it is well up. Water
  // runs off the chin as it rises, and it stands in a ring of white water. It rises, holds and slides back.
  const SPY_W = [2, 4, 5, 5, 6, 6, 6, 6, 6, 6, 6];
  function spyhop(scr, x, y, v, t) {
    const N = R.navy, k = Math.min(1, v * 1.25), up = Math.round(11 * Math.sin(Math.PI * k) ** 0.7), beat = Math.floor(t * 6);
    let edge = x + 3;
    for (let j = 1; j <= up; j++) { const ft = up - j, w = SPY_W[ft], x0 = x - 3 + Math.round(0.3 * j) + ((6 - w) >> 1);
      if (j <= 2) edge = x0 + w;
      for (let q = 0; q < w; q++) {
        let c = N[0];
        if (ft === 0) c = INK;
        else if (ft >= 2 && q >= w - 2) c = q === w - 1 && ft > 6 ? R.white[0] : R.white[1];
        else if (q === 0) c = N[2];
        else if ((ft === 3 || ft === 4) && q === 1) c = R.white[1];
        else if (q === w - 1 || q === w - 3 && ft >= 2) c = INK;
        scr.set(x0 + q, y - j, c); } }
    if (up >= 8) { scr.set(edge, y - 2, N[0]); scr.set(edge, y - 1, N[0]); scr.set(edge + 1, y - 1, N[1]); scr.set(edge + 2, y - 1, INK); }
    if (k < 0.5 && up > 3) for (let d = 0; d < 3; d++) { const j = 1 + Math.floor(hash(d, beat, 6307) * (up - 2)); scr.set(x + 4 + Math.round(0.3 * j) + (d & 1), y - j, R.white[0]); }
    for (let dx = -6; dx <= 8; dx++) { if (up > 0 && dx >= -3 && dx <= 3) continue; if (hash(dx, beat, 6304) < 0.7) scr.set(x + dx, y, R.white[1]); if (Math.abs(dx - 1) < 6 && hash(dx, beat, 6308) < 0.3) scr.set(x + dx, y + 1, R.white[0]); }
  }
  // A fixed dither for the pools coming into view as the water leaves them.
  const bayerish = (x, y, k) => hash(x, y, k + 6107);
  // Tide pools round the two stacks: a few small pools on the flat about each foot, each with something
  // living in it (a starfish, an anemone, an urchin), a band of mussels and barnacles round the foot of
  // the rock, and a crab picking over the sand between. A pool goes only where the low water bares the
  // sand well and where the rock does not stand over it (beside it or in front, never behind).
  // Round 5 (T33, TJ: "too small and hard to see. Make them larger"): each pool is a basin with a rim of
  // rock round clear water, drawn once into p.px as [dx, dy, colour]: the far rim in the light with
  // barnacles on it, the near rim in shade, a dark line of water under the far rim, pale shallows inside
  // the rim and deeper water in the middle. Its outline wobbles, so no two are the same oval.
  const basin = (x, y, rx, ry, life) => { const s1 = hash(x, y, 6113) * TAU, s2 = hash(x, y, 6114) * TAU, W2 = 2 * rx + 9, at = new Map(), key = (dx, dy) => (dy + ry + 4) * W2 + dx + rx + 4;
    const rr = (dx, dy) => { const a = Math.atan2(dy / ry, dx / rx); return Math.hypot(dx / (rx + 0.5), dy / (ry + 0.5)) / (1 + 0.06 * Math.sin(3 * a + s1) + 0.04 * Math.sin(5 * a + s2)); }, wet = (dx, dy) => rr(dx, dy) <= 1;
    const px = [];
    for (let dy = -ry - 4; dy <= ry + 4; dy++) for (let dx = -rx - 4; dx <= rx + 4; dx++) {
      if (wet(dx, dy)) { const r = rr(dx, dy), edge = !wet(dx - 1, dy) || !wet(dx + 1, dy) || !wet(dx, dy + 1), under = !wet(dx, dy - 1);
        px.push([dx, dy, under ? R.sea[1] : edge ? (hash(x + dx, y + dy, 6116) < 0.12 ? R.pink[1] : R.sea[4]) : r < 0.42 ? R.sea[2] : r < 0.62 && ((dx + dy) & 1) ? R.sea[2] : R.sea[3]]); at.set(key(dx, dy), 1); continue; }
      let near = false; for (let b = -2; b <= 2 && !near; b++) for (let a = -2; a <= 2; a++) if (Math.abs(a) + Math.abs(b) <= 3 && wet(dx + a, dy + b)) { near = true; break; }
      // A15, after a picture of tide pools on the Olympic coast: the rim is dark wet rock, its far side lit on top
      // and crusted with white barnacles and black mussels, its near side in shade with olive weed hanging over
      // the sand below it.
      if (!near) { const hang = wet(dx, dy - 3) || wet(dx - 1, dy - 3) || wet(dx + 1, dy - 3); if (hang) px.push([dx, dy, hash(x + dx, 7, 6117) < 0.45 ? R.moss[hash(x + dx, y + dy, 6118) < 0.5 ? 2 : 3] : R.sand[0]]); else if ((wet(dx, dy - 4) || wet(dx, dy - 5)) && hash(x + dx, 7, 6117) < 0.2) px.push([dx, dy, R.moss[2]]); continue; }
      const far = wet(dx, dy + 1) || wet(dx, dy + 2), front = wet(dx, dy - 1) || wet(dx, dy - 2), k = hash(x + dx, y + dy, 6115);
      px.push([dx, dy, far ? (k < 0.16 ? R.white[1] : k < 0.26 ? R.jay[0] : wet(dx, dy + 1) ? R.rock[2] : R.rock[3]) : front ? (k < 0.08 ? R.white[0] : k < 0.2 ? R.jay[0] : wet(dx, dy - 1) ? R.rock[1] : R.rock[0]) : k < 0.1 ? R.white[0] : R.rock[k < 0.5 ? 1 : 0]]); }
    return { x, y, rx, ry, life, px, wet }; };
  const bared = (x, y) => { const c = csAt(x, y); return c >= 6 && c - 4 <= EBB - 8; };
  // The pool to find (E7, and round 5's T33: "about twice the size"): one big basin, 27 by 13, beside the
  // first of the two stacks with room for it, on sand the low water bares from end to end, clear of the
  // rock's drawing. It can be tapped once the water has left it.
  const BIG = (() => { const RX = 13, RY = 6;
    for (const s of POOLED) for (const side of [1, -1]) for (const dy of [3, 6, 0, 9]) for (const gap of [4, 7, 10, 14]) { const x = Math.round(s.x + side * (s.half + RX + gap)), y = s.y + dy;
      if ([[-RX - 3, 0], [RX + 3, 0], [0, -RY - 3], [0, RY + 5], [-RX, -RY], [RX, -RY], [-RX, RY + 3], [RX, RY + 3]].every(([a, b]) => bared(x + a, y + b)) && !stacks.some(o => Math.abs(o.x - x) < o.half + RX + 4 && y - RY < o.y + 2 && y + RY > o.y - o.tall)) return { s, x, y, rx: RX, ry: RY, life: 3 }; }
    return null; })();
  // The small pools keep clear of it and of each other.
  const pools = POOLED.map((s, n) => { const list = BIG && BIG.s === s ? [BIG] : [];
    for (let k = 0; k < 80 && list.length < 4; k++) { const a = hash(k, n, 6101) * TAU, rr = s.half + 7 + 22 * hash(k, n, 6102), x = Math.round(s.x + Math.cos(a) * rr), y = Math.round(s.y + 2 + Math.sin(a) * rr * 0.5), rx = 4 + Math.round(2 * hash(k, n, 6103));
      if (!bared(x - rx - 2, y) || !bared(x + rx + 2, y) || stacks.some(o => Math.abs(x - o.x) < o.half + rx + 4 && y - 4 < o.y + 2 && y + 4 > o.y - o.tall) || list.some(p => Math.abs(p.x - x) < p.rx + rx + 5 && Math.abs(p.y - y) < p.ry + 3 + (p.life === 3 ? 2 : 4))) continue;
      list.push({ x, y, rx, ry: 3, life: list.filter(p => p.life !== 3).length % 3 }); }
    return { s, pools: list.map(p => basin(p.x, p.y, p.rx, p.ry, p.life)) }; }).filter(P => P.pools.length >= 2 || P.pools.some(p => p.life === 3));
  const FIND = (() => { for (const P of pools) { const p = P.pools.find(q => q.life === 3); if (p) return { P, p }; } return null; })();

  // ---- the ferry -----------------------------------------------------------------------------
  // It sails the length of the water outside the sea stacks, is gone past the edge of the map for half
  // a minute or less, and comes back the other way. Its wake is drawn with the water; the hull is
  // drawn with the things that stand, in order of their feet, so a stack in front hides it and it passes
  // in front of a stack behind (D11a). The stacks keep inshore of its lane.
  const ferryBM = W.make.ferry(), [FA, FB] = spots.ferry, FLEN = Math.hypot(FB[0] - FA[0], FB[1] - FA[1]);
  const FERRY = { v: 7, away: [20, 28] }, CROSS = FLEN / FERRY.v, ROUND = 2 * CROSS + FERRY.away[0] + FERRY.away[1];
  // How far along its course it is, 0 at the west end and 1 at the south, and which way it is heading;
  // nothing while it is away. At time 0 it is a little way in from the west end, where the opening view
  // shows it once the intro card is closed (E5b).
  const ferryAt = t => { const u = (t + 0.12 * CROSS) % ROUND, back = u - CROSS - FERRY.away[0]; return u < CROSS ? [u / CROSS, 1] : back >= 0 && back < CROSS ? [1 - back / CROSS, -1] : null; };
  // The course bows out to sea a little in the middle.
  const coursePt = s => { const b = 14 * Math.sin(Math.PI * clamp(s, 0, 1)); return [FA[0] + (FB[0] - FA[0]) * s - 0.56 * b, FA[1] + (FB[1] - FA[1]) * s + 0.83 * b]; };
  // Where it actually is (T7, T15): on its course, or pushed out to deeper water and away from the stacks
  // when the course would put any of the hull (bow, middle or stern) on a stack or the bared flat at the
  // tide of the moment. The wake follows the same way, so it bends with the boat.
  const HULL = ferryBM.w * 0.38, FDX = (FB[0] - FA[0]) / FLEN, FDY = (FB[1] - FA[1]) / FLEN, PROBE = [[FDX * HULL, FDY * HULL], [-FDX * HULL, -FDY * HULL]];
  // Its lane: at each 2 px of the course, how far out to sea (straight off the coast, the way the course
  // bows) the whole hull first has 2 px of room to spare, at high water and at the lowest. Off the map's edge
  // it keeps what it had at the edge.
  const NF = Math.ceil(FLEN / 2), OUT = [-0.56, 0.83];
  const ferryLane = ebb => { const raw = Array.from({ length: NF + 1 }, (_, k) => { const [px, py] = coursePt(k / NF); if (!onSea(px, py)) return null;
      for (let d = 0; d < 220; d++) { const x = px + OUT[0] * d, y = py + OUT[1] * d; if ([[0, 0], ...PROBE].every(([a, b]) => !onSea(x + a, y + b) || col.room('boat', x + a, y + b, { ebb }, 3) >= 2)) return d; } return 220; });
    const first = raw.findIndex(v => v != null), last = raw.length - 1 - [...raw].reverse().findIndex(v => v != null);
    return lane(raw.map((v, k) => v != null ? v : first < 0 ? 0 : raw[k < first ? first : last]), 1, 24, 16); };
  const FLANE = [ferryLane(0), ferryLane(EBB)];
  const shipPt = (s, t) => { const p = coursePt(s), k = clamp(s, 0, 1) * NF, k0 = Math.min(NF - 1, Math.floor(k)), f = k - k0, e = ebbAt(t) / EBB;
    const d = lerp(lerp(FLANE[0][k0], FLANE[0][k0 + 1], f), lerp(FLANE[1][k0], FLANE[1][k0 + 1], f), e); return [p[0] + OUT[0] * d, p[1] + OUT[1] * d]; };
  function drawWake(scr, ox, oy, t) {
    const at = ferryAt(t + ferryAhead); if (!at) return;
    const [s, dir] = at, [fx, fy] = shipPt(s, t), { VW, VH } = scr;
    if (fx - ox < -140 || fx - ox > VW + 140 || fy - oy < -120 || fy - oy > VH + 120) return;
    // Nothing of it shows past the edge of the map, where a wide screen has only a plain fill.
    const dot = (wx, wy, c) => { if (wx >= 0 && wy < NH) scr.set(wx - ox, wy - oy, c); };
    // The wake. Each bit of foam stays where the boat left it and only fades: two lines open out from
    // the bow and break into dashes, and the water churned up astern trails off between them.
    const here = s * FLEN, white = R.white[1];
    for (let n = 0; n < 240; n++) {
      const k = n / 2, c = here + dir * (19 - k), [qx, qy] = shipPt(c / FLEN, t);   // k: how far astern of the bow's tip
      if (k >= 5) {
        const age = (k - 5) / 115, wide = 5.6 + (k - 5) * 0.24, cell = Math.floor(c / 5);
        if (frac(c / 5) < 1 - age * 0.75) for (const side of [-1, 1]) {
          if (hash(cell, side, 71) < age * 1.15 - 0.2) continue;
          dot(Math.round(qx + side * 0.56 * wide), Math.round(qy - side * 0.83 * wide), age < 0.3 ? white : age < 0.65 ? R.sea[5] : R.sea[4]);
        }
      }
      if (k > 36 && k < 104) {
        const age = (k - 36) / 68, half = age < 0.18 ? 2.5 : 0.5 + 1.8 * (1 - age);
        for (let off = -half; off <= half; off += 0.5) {
          if (age > 0.18 && hash(Math.floor(c / 3), Math.round(off), 72) < age * 1.2 - 0.1) continue;
          const x = Math.round(qx + 0.56 * off), y = Math.round(qy - 0.83 * off);
          dot(x, y, age < 0.3 ? ((x + y) & 1 ? white : R.sea[5]) : age < 0.62 ? R.sea[5] : R.sea[4]);
        }
      }
    }
  }
  // Where the hull is and the row its keel sits on, for sorting; null while it is away or off screen.
  ferryNear = (x, y, t) => [-2, 0, 2].some(d => { const at = ferryAt(t + d + ferryAhead); if (!at) return false; const [fx, fy] = shipPt(at[0], t + d); return Math.hypot(fx - x, fy - y) < 44; });
  eagles.fill(null);
  const hullAt = (t, ox, oy, VW, VH) => { const at = ferryAt(t + ferryAhead); if (!at) return null; const [fx, fy] = shipPt(at[0], t); if (fx - ox < -60 || fx - ox > VW + 60 || fy - oy < -40 || fy - oy > VH + 40) return null; return { x0: Math.round(fx) - ferryBM.ox, y0: Math.round(fy) - ferryBM.oy, y: Math.round(fy) - ferryBM.oy + ferryBM.h - 1, cx: Math.round(fx) }; };
  // In the fog bank the whole boat pales by one step, read at its middle, so no edge of the bank cuts
  // across it; in the bank's solid part it is lost in the white. The bank then leaves its pixels alone.
  let hullMask = null, hullMarked = [];
  function drawHull(scr, ox, oy, t) {
    const { VW, VH, fb } = scr, h = hullAt(t, ox, oy, VW, VH); if (!h) return;
    let veil = null;
    if (DEBUG.mist) { const xs = bankXs(h.y, t, ox); if (xs) { const x = h.cx - ox; if (x < xs[3]) return; veil = x < xs[2] ? SEAVEIL[2] : x < xs[1] ? SEAVEIL[1] : x < xs[0] ? SEAVEIL[0] : null; } }
    if (!hullMask || hullMask.length !== VW * VH) hullMask = new Uint8Array(VW * VH);
    for (let j = 0; j < ferryBM.h; j++) for (let i = 0; i < ferryBM.w; i++) { const c = ferryBM.d[j * ferryBM.w + i]; if (!c) continue; const wx = h.x0 + i, wy = h.y0 + j, x = wx - ox, y = wy - oy; if (wx < 0 || wy >= NH || x < 0 || y < 0 || x >= VW || y >= VH) continue; const k = y * VW + x; fb[k] = veil ? veil[c] : c; hullMask[k] = 1; hullMarked.push(k); }
  }

  // ---- mist -------------------------------------------------------------------------------------
  // Mist is not painted on. A pixel under it is swapped for the palette colour nearest to itself seen
  // through fog, so the trees still show, only paler, and there is no pattern of dots to see. There are
  // three strengths: light, middle, and a heavy one kept for the small heart of a bank. Where two bits
  // of mist overlap the stronger one counts, they do not add up, so the forest always shows through.
  const M = W.mist, FOG = R.fog, VEIL = veilTable(0.4), VEIL2 = veilTable(0.6), VEIL3 = veilTable(0.76), VEILS = [null, VEIL, VEIL2, VEIL3];
  // The fog bank out at sea is thicker stuff, and over water there is nothing to see through to.
  const SEAVEIL = [veilTable(0.3), veilTable(0.58), veilTable(0.84)];
  // The weather (E5): how much of the fog is in over the sea (fogSea, 0 to 1), and over a spot of the land
  // (fogAt). The bank rolls in from the west as it comes and the mist only drifts while it is in. The
  // world scene sets both each frame; anything else that draws the critters sees the fog always in.
  let fogSea = 1, fogAt = () => 1;
  // The fog bank's four stepped edges on one row of the world, in view columns: solid west of xs[3],
  // then three veils thinning to clear at xs[0]. Null where the bank does not reach.
  function bankXs(wy, t, ox, VW = 1e6) { const sh = M.shore[wy]; if (wy >= NH || wy < M.y0 || !(sh >= 200)) return null; const xs = []; for (let j = 0; j < 4; j++) { const e = 9 * Math.sin(wy / 15 + t * 0.045 + j * 1.3) + 14 * (vnoise(wy / 1.6, j * 7 + Math.floor(t * 0.05), 134) - 0.5) + 12 * Math.abs(Math.sin(wy / 27 + t * 0.025 + j)); xs.push(Math.min(VW, Math.round(sh - [200, 235, 270, 310][j] - e * 1.2 - (1 - fogSea) * 420) - ox)); } for (let j = 2; j >= 0; j--) if (xs[j] < xs[j + 1]) xs[j] = xs[j + 1]; return xs; }
  // Mist pools low: the tops of the tallest trees stand clear of it. (Only the tallest: in thick forest
  // the tops of the crowns are nearly all that shows of a tree.) This marks those rows as the map shows
  // them, nearer trees laid over the ones behind.
  const TOPW = M ? M.x1 : 0, tops = new Uint8Array(M ? TOPW * (NH - M.y0) : 0);
  if (M) for (const th of W.things.filter(th => th.x < TOPW + 40 && th.y > M.y0).sort((a, b) => a.y - b.y)) {
    const parts = th.tree ? th.tree.parts.map(p => [p.bm, th.x + p.x, th.y + p.y]) : [[th.bm, th.x - th.bm.ox, th.y - th.bm.oy]];
    const clearTo = th.tree && th.tree.h >= 52 ? th.y - th.tree.h + 6 : -1;
    for (const [bm, x0, y0] of parts) for (let j = 0; j < bm.h; j++) {
      const wy = y0 + j; if (wy < M.y0 || wy >= NH) continue;
      for (let i = 0; i < bm.w; i++) { const wx = x0 + i; if (wx >= 0 && wx < TOPW && bm.d[j * bm.w + i]) tops[(wy - M.y0) * TOPW + wx] = wy < clearTo ? 1 : 0; }
    }
  }
  // It comes in off the sea and slides east, each bit at its own pace, thinning as it goes; it is gone
  // before the forest ends and comes round again. The banks that lie along the forest's western edge
  // are each a few rounded lobes run together, with thin tails trailing off either end: no two the same
  // length or height. Light wisps drift further in. Every row of a shape lists its stretches of light
  // mist, then of middle, then of heavy.
  const wisps = [];
  if (M) {
    const r = rng(131);
    const merge = segs => { segs.sort((p, q) => p[0] - q[0]); const out = []; for (const g of segs) { const l = out[out.length - 1]; if (l && g[0] <= l[1] + 1) l[1] = Math.max(l[1], g[1]); else out.push([g[0], g[1]]); } return out; };
    // The stretch of a row that an oval covers. Ovals are flatter underneath, as mist lies on what is below it.
    const chord = (o, dy, grow, squash) => { const ry = (dy > o.y ? o.ry * 0.7 : o.ry) * squash, q = (dy - o.y) / ry, rx = o.rx + grow; if (rx < 2 || ry < 0.6 || Math.abs(q) >= 1) return null; const half = rx * Math.sqrt(1 - q * q) + (r() - 0.5) * 2.4; return half > 1 ? [Math.round(o.x - half), Math.round(o.x + half)] : null; };
    const shape = (ovals, cores, tall) => {
      const rows = [];
      for (let dy = -Math.ceil(tall); dy <= Math.ceil(tall); dy++) {
        const l1 = [], l2 = [], l3 = [];
        for (const o of ovals) { const c = chord(o, dy, 0, 1); if (c) l1.push(c); const d = o.tail ? null : chord(o, dy, -Math.min(9, o.rx * 0.25), 0.7); if (d) l2.push(d); }
        for (const o of cores) { const c = chord(o, dy, 0, 1); if (c) l3.push(c); }
        if (l1.length) rows.push({ dy, need: Math.abs(dy) / tall * 0.4, l: [merge(l1), merge(l2), merge(l3)] });
      }
      return rows;
    };
    // Fewer than round 3 had: the forest it drifts over is narrower here.
    for (let k = 0; k < 15; k++) {
      const len = 90 + r() * 210, tall = 9 + r() * 15, n = 2 + Math.round(len / 55 + r() * 2), ovals = [];
      for (let i = 0; i < n; i++) { const u = n === 1 ? 0 : i / (n - 1) * 2 - 1; ovals.push({ x: u * len * 0.34 + (r() - 0.5) * len * 0.14, y: (r() - 0.5) * tall * 1.1, rx: len * (0.5 + 0.5 * r()) / n + 12, ry: tall * (0.4 + 0.45 * r()) * (1 - 0.3 * u * u) }); }
      for (const side of [-1, 1]) for (let j = 0; j < 2; j++) if (r() < 0.8) ovals.push({ x: side * len * (0.4 + 0.25 * r()), y: (r() - 0.5) * tall * 0.9, rx: len * (0.1 + 0.14 * r()), ry: 0.9 + r() * 1.3, tail: true });
      // The heavy heart: a small oval low inside the biggest lobe, and in a long bank a second one.
      const big = ovals.filter(o => !o.tail && o.ry >= 3.5).sort((p, q) => q.rx * q.ry - p.rx * p.ry).slice(0, len > 170 ? 2 : 1);
      const cores = big.map(o => ({ x: o.x + (r() - 0.5) * o.rx * 0.3, y: o.y + o.ry * 0.12, rx: o.rx * 0.42, ry: o.ry * 0.36 }));
      const y = Math.round(M.y0 + 14 + r() * (NH - M.y0 - 24));
      wisps.push({ y, len, rows: shape(ovals, cores, tall), bank: true, span: 600, at: r() * 560, v: 0.5 + 0.9 * vnoise(y / 40, 3, 132), dx: Math.round((r() - 0.5) * 110) });
    }
    for (let k = 0; k < 64; k++) {
      const y = Math.round(M.y0 + 4 + r() * (NH - M.y0 - 8)), len = 36 + r() * 80, tall = 1.5 + r() * 3.2;
      const ovals = [{ x: 0, y: 0, rx: len / 2, ry: tall }, { x: (r() - 0.5) * len * 0.7, y: (r() - 0.5) * tall, rx: len * (0.2 + 0.2 * r()), ry: tall * 0.7 }];
      wisps.push({ y, len, rows: shape(ovals, [], tall), bank: false, span: 760, at: r() * 760, v: 1.6 + 2.6 * vnoise(y / 40, 3, 132), dx: 0 });
    }
    // A few fingers of the fog bank, out over the water in front of it: plain lens shapes.
    // Only on rows where the sea is wide enough for one to cross.
    const seaRows = []; for (let y = M.y0; y < NH - 4; y++) if (M.shore[y] > 200) seaRows.push(y);
    for (let k = 0; k < (seaRows.length ? 9 : 0); k++) {
      const y = seaRows[Math.floor(r() * seaRows.length)], len = 50 + r() * 70, n = 4 + (r() * 5 | 0), rows = [];
      for (let i = 0; i < n; i++) { const f = i / (n - 1) * 2 - 1, half = len / 2 * Math.sqrt(1 - f * f * 0.86) * (0.9 + 0.1 * r()), off = (r() - 0.5) * len * 0.1; rows.push({ dy: i - (n >> 1), a: off - half, b: off + half, edge: i === 0 || i === n - 1, need: Math.abs(f) * 0.35 }); }
      wisps.push({ y, len, rows, sea: true, at: r() * 400, v: 0.8 + 1.2 * r() });
    }
  }
  // Mist over the land is first noted down, how strong at each pixel of the screen, and then laid on
  // in one pass. lo and hi are the ends of what was noted on each screen row.
  let lv = new Uint8Array(0), lo = new Int16Array(0), hi = new Int16Array(0);
  // One row of a finger of fog over the water: thin at both ends, its body in between.
  function veilRow(scr, a, b, y, edge) {
    const { VW, fb } = scr, row = y * VW;
    for (let x = Math.max(a, 0); x <= Math.min(b, VW - 1); x++) { const i = row + x; fb[i] = SEAVEIL[edge || Math.min(x - a, b - x) < 7 ? 0 : 1][fb[i]]; }
  }

  // ---- birds that circle, each with its shadow on the ground --------------------------------
  const ink = [speck(0), speck(1)], gull = ink.map(b => tint(b, R.white[1]));
  // Where each flock circles comes from the land (land.js, habitat).
  // The birds that circle over the elk's parkland go where the herd has gone this visit (D1).
  const herdMoved = spots.elk.length && W.spots.elk.length ? [spots.elk[0][0] - W.spots.elk[0][0], spots.elk[0][1] - W.spots.elk[0][1]] : [0, 0], overHerd = F => W.spots.elk.length && F.cx === W.spots.elk[0][0] && F.cy === W.spots.elk[0][1] + 40;
  const FLOCKS = (W.flocks || []).map(F => ({ ...F, ...(overHerd(F) ? { cx: F.cx + herdMoved[0], cy: F.cy + herdMoved[1] } : {}), bm: F.gull ? gull : ink }));

  // ---- a click on an animal (round 6, note 10) --------------------------------------------------
  // Every animal on the map answers a click with something true to how it lives. Not finds: just for fun,
  // as the cats are. Each reaction is a state the animal already has, started now or sped up, with a
  // sound, and for the bull elk his breath as he bugles.
  // Where each animal of the sea and the air was drawn this frame, in view pixels, for a click to find it.
  const seen = { orca: [], jelly: [], flock: [], whale: null, eagle: null, osprey: null }, orcaAsk = [], orcaTurn = [], orcaSlapped = [], jellyKick = [];
  // An orca's five things, in the order a click steps through them, and the seconds each lasts: it comes up and blows, spyhops, breaches, slaps its tail, porpoises.
  const ORCA_DOES = { blow: 2.3, spyhop: 3.2, breach: 1.7, slap: 3.3, porpoise: 4.4 }, ORCA_TURN = Object.keys(ORCA_DOES);
  // The name the conditions board knows an animal by (round 8, F2): the clearing's bears and the family that
  // visits the forest's edge are two lines there, as are the bull moose and the calf, the squirrels and the chipmunks.
  const sawAs = a => a.critter === 'bear' ? ((a.mum || a).roamer ? 'bear2' : 'bear') : a.critter === 'moose' && a.mum ? 'calf' : a.critter === 'squirrel' && a.f === sq[1] ? 'chipmunk' : a.critter;
  const nameOf = a => { const N = NAMES.map;
    if (a.critter === 'elk') return a.f === elkBull ? N.bull : N.elk;
    if (a.critter === 'goat') return a.mum ? N.kid : N.goat;
    if (a.critter === 'moose') return a.mum ? N.calf : N.moose;
    if (a.critter === 'bear') return a.cub ? N.cub : N.bear;
    if (a.critter === 'squirrel') return a.f === sq[1] ? N.chipmunk : N.squirrel;
    return N[a.critter] || a.critter; };
  // A walker heads off away from the click, on ground it may cross, to a spot in its own country.
  const flee = (a, px, py, d0, d1) => { for (let k = 0; k < 12; k++) { const an = Math.atan2(a.fy - py, a.fx - px) + (rand() - 0.5) * 1.6, rr = d0 + rand() * (d1 - d0), tx = a.fx + Math.cos(an) * rr, ty = a.fy + Math.sin(an) * rr * 0.6; if (a.ok(tx, ty) && way(pass, a.fx, a.fy, tx, ty)) { a.tx = tx; a.ty = ty; a.st = 'walk'; return true; } } return false; };
  const lookUp = (a, t, s) => { a.st = 'look'; a.until = t + s; a.bm = a.f.look; };
  // What each kind says when a click sets it to something that has no sound of its own: grown, and young.
  const VOICE = { elk: ['bark'], goat: ['snort', 'bleat'], sheep: ['snort'], moose: ['snort', 'bleat'], bear: ['huff'] };
  // The bull's breath as he bugles: puffs that leave his mouth, rise and fade.
  function breath(scr, a, ox, oy, age) {
    const dir = a.faces * (a.flip ? -1 : 1), hx = a.x - ox + dir * Math.round(a.bm.w * 0.45), hy = a.y - oy - Math.round(a.bm.oy * 0.55);
    for (let k = 0; k < 8; k++) { const s = age - k * 0.15; if (s < 0 || s > 1.6) continue; const x = Math.round(hx + dir * (2 + s * 8)), y = Math.round(hy - s * 9), r = s < 0.5 ? 1 : 2;
      for (let dy = -r; dy <= 0; dy++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dy) <= r && bayer(x + dx, y + dy) < 1.1 - s / 1.6) scr.set(x + dx, y + dy, s < 0.4 ? R.white[1] : R.white[0]); }
  }
  function poke(id, px, py, t) {
    const [kind, n] = id.split(':');
    if (kind === 'orca') { const k = orcaTurn[+n] = ((orcaTurn[+n] == null ? 0 : orcaTurn[+n]) + 1) % 5; orcaAsk[+n] = [ORCA_TURN[k], t]; return k === 3 ? null : 'blow'; }
    if (kind === 'jelly') { jellyKick[+n] = t; return 'plop'; }
    if (kind === 'flock') { FLOCKS[+n].scare = t; return FLOCKS[+n].gull ? 'mew' : 'croak'; }
    // The osprey in the air: the next kind of visit comes at once. The eagle in the air only cries.
    if (kind === 'air') { if (n === 'eagle') return 'cry'; ospTurn = (ospTurn + 1) % 3; const [n0, s0] = slotOf(OSP, t, ospAhead);
      // On its way in, it only changes what it has come to do; later than that, the next visit begins.
      if (OSPREY && s0 >= 0 && s0 < OSPREY.inn.len) ospWant = [n0, OSP_KINDS[ospTurn]]; else ospNow(OSP_KINDS[ospTurn], t); return 'kew'; }
    // The whale steps through its five (round 8, D2): a breach is the next one brought forward to now, as before; the rest it does where it was last seen.
    if (kind === 'whale') { const wh = items.find(a => a.critter === 'whale'); wh.turn = ((wh.turn == null ? -1 : wh.turn) + 1) % 5; const name = WHALE_TURN[wh.turn];
      if (name === 'breach') { const T = t + whaleAhead + T0, m = Math.floor(T / SLOT); whaleAhead = (m + 1) * SLOT + starts(m + 1) - t - T0; wh.ask = null; } else wh.ask = [name, t];
      return name === 'slap' ? null : 'blow'; }
    const a = items[+n]; if (!a) return null;
    if (a.critter === 'eagle') { if (a.bm === EAGLE_BM.none) return null; a.turn = ((a.turn == null ? -1 : a.turn) + 1) % 4; const name = EAGLE_TURN[a.turn];
      if (name === 'fly') { a.ask = null; eagAhead += startNow(EAG, t + eagAhead); return 'cry'; }
      a.ask = [name, t]; a.cried = name === 'call' ? t : a.cried; return name === 'call' ? 'cry' : null; }
    if (a.critter === 'squirrel') { for (let k = 1; k <= 5; k++) { const i = ((a.turn == null ? 4 : a.turn) + k) % 5; if (sqBegin(a, SQ_DOES[i], t, [px, py])) { a.turn = i; break; } } a.say = null; return 'chatter'; }
    // A marmot steps through its five; its own whistle sounds as it sits up, so the click itself is silent.
    if (a.critter === 'marmot') { for (let k = 1; k <= 5; k++) { const i = ((a.turn == null ? 0 : a.turn) + k) % 5; if (marBegin(a, MAR_DOES[i], t)) { a.turn = i; break; } } return null; }
    // A cub steps through its five (round 8, D2): it sniffs about, rolls on its back, wrestles its twin, climbs
    // the nearest trunk, and naps. One it cannot do here (no trunk, its twin busy or out of reach) is passed over.
    if (a.cub) { if (a.st === 'climb') return 'bawl'; const B = a.sib;
      for (let k = 1; k <= 5; k++) { const i = ((a.turn == null ? 4 : a.turn) + k) % 5, name = ['sniff', 'roll', 'play', 'climb', 'nap'][i]; let ok = true; a.hop = a.lift = 0; a.withHer = false;
        if (name === 'sniff') { a.pose = 'sniff'; rest(a, t, 3); }
        else if (name === 'roll') { a.st = 'roll'; a.t0 = t; a.until = t + 2.4; }
        else if (name === 'play') { ok = B && B.st !== 'climb' && landWay(a.fx, a.fy, B.fx, B.fy); if (ok) { B.st = 'idle'; B.until = t + 4; a.tx = B.fx + (a.fx < B.fx ? -8 : 8); a.ty = B.fy; a.goal = 'twin'; a.st = 'walk'; } }
        else if (name === 'climb') { const T = trunkFor(a, 44); ok = !!T; if (T) { a.trunk = T; a.tx = T.x; a.ty = T.y + 1; a.goal = 'trunk'; a.st = 'walk'; } }
        else { a.st = 'nap'; a.until = t + 7 + rand() * 5; }
        if (ok) { a.turn = i; break; } }
      return 'bawl'; }
    // A walker with five things to do (round 8, D2) steps to the next after the last one it began (a.turn). One it cannot
    // do here (no trunk within reach, no other of its kind) is passed over. When a sow stands up her cubs
    // make for the nearest trunks and climb, as black bear cubs do.
    if (a.does) { const n = a.does.length, i = a.turn == null ? Math.max(0, a.does.indexOf(a.st)) : a.turn;
      for (let k = 1; k <= n; k++) { const name = a.does[(i + k) % n]; if (!begin(a, name, t, [px, py])) continue; a.say = null;
        return (ACTS[name] && ACTS[name].sound) || VOICE[a.critter][a.mum ? 1 : 0]; }
      return null; }
    return null;
  }

  // Each starts on one of its five things, picked by the same dice as its home (so not at all with homes=0).
  if (draw) for (const a of items) if (a.does) { begin(a, a.does[Math.floor(draw() * a.does.length)], 0); a.say = null; }
  return {
    items,
    // Sounds the animals made while they were drawn this frame; the map plays them and empties the list.
    sounds,
    // hour: the part of the day (morning, midday, evening or dusk), for what each kind does by the hour (HOURS).
    update(dt, t, here, hour) {
      nowT = t; if (eagleItem) eagleSits(t);
      if (hour && hour !== part) { const first = part === null; part = hour; for (const a of items) byHour(a, t, first); }
      for (const a of items) {
        if (a.walker) walk(a, dt, t);
        else if (a.cub) cubStep(a, dt, t);
        else if (a.dart) dart(a, dt, t, here);
        else if (a.critter === 'marmot') scurry(a, dt, t, here);
      }
    },
    draw(scr, a, ox, oy, t) {
      if (a.critter === 'whale') return drawWhale(scr, a, ox, oy, t);
      if (a.gone) return;
      if (inClear(scr, a.x - ox, a.y - oy - (a.perch || 0))) saw(sawAs(a));
      if (a.walker || (a.critter === 'marmot' && !a.perch)) scr.shadow(a.x - ox, a.y - oy, a.critter === 'marmot' ? 5 : 7, 1);
      else if (a.cub && !a.lift) scr.shadow(a.x - ox, a.y - oy, 4, 1);
      // A marmot that has just sat up whistles, if it is being drawn (so only when it is on screen).
      if (a.critter === 'marmot' && a.st !== 'act' && a.rose != null && a.sung !== a.rose && t - a.rose < 0.5) { a.sung = a.rose; sounds.push('whistle'); }
      scr.put(a.bm, a.x - ox + (a.push ? dirOf(a) * a.push : 0) + (a.ofx || 0), a.y - oy - (a.hop || 0) - (a.perch || 0) + (a.drop || 0), a.flip);
      // What an act throws up (grass as a bull rakes it, earth as a sow digs): flecks before its head, low.
      if (a.walker && a.st === 'act' && ACTS[a.act].bits) { const C = ACTS[a.act].bits, dir = dirOf(a), beat = Math.floor(t * 9);
        for (let k = 0; k < 6; k++) if (hash(k, beat + a.hx, 6401) > 0.45) scr.set(a.x - ox + dir * (Math.round(a.bm.w * 0.36) + Math.floor(hash(k, beat, 6402) * 7) - 2), a.y - oy - Math.floor(hash(k, beat, 6403) * 7), C[k % C.length]); }
      if (a.critter === 'marmot' && a.st === 'act' && marAt(a, t) >= 0 && marAt(a, t) < a.len) { const dir = a.flip ? -1 : 1, k = Math.floor(marAt(a, t) * MAR_ACT[a.act][0]) & 1, gy = a.y - oy - (a.perch || 0) + (a.drop || 0);
        // The one it wrestles stands facing it, pushing as it gives; a digger throws earth up before its paws.
        if (a.act === 'wrestle') scr.put(mar.wrestle[k ^ 1], a.x - ox + dir * 11, gy, !a.flip);
        else for (let j = 0; j < 4; j++) if (hash(j, Math.floor(t * 9), 6411) > 0.4) scr.set(a.x - ox + dir * (7 + Math.floor(hash(j, Math.floor(t * 9), 6412) * 5)), gy - Math.floor(hash(j, Math.floor(t * 9), 6413) * 5), j & 1 ? R.dirt[1] : R.dirt[2]); }
      // A cub that digs beside its mother throws up a little earth of its own (H2).
      if (a.cub && a.st === 'dig') { const dir = a.flip ? -1 : 1, beat = Math.floor(t * 9); for (let j = 0; j < 3; j++) if (hash(j, beat + a.n, 6431) > 0.4) scr.set(a.x - ox + dir * (6 + Math.floor(hash(j, beat, 6432) * 4)), a.y - oy - 1 - Math.floor(hash(j, beat, 6433) * 4), j & 1 ? R.dirt[1] : R.dirt[2]); }
      if (a.dart && a.st === 'act' && a.act === 'bury') for (let j = 0; j < 3; j++) if (hash(j, Math.floor(t * 9), 6421) > 0.4) scr.set(a.x - ox + (a.flip ? -1 : 1) * (5 + Math.floor(hash(j, Math.floor(t * 9), 6422) * 3)), a.y - oy - 1 - Math.floor(hash(j, Math.floor(t * 9), 6423) * 3), R.dirt[1 + (j & 1)]);
      // Water runs from the weed in the moose's mouth while his head is up.
      if (a.st === 'act' && a.act === 'dip' && a.bm !== a.f.graze) { const dir = dirOf(a); for (let k = 0; k < 3; k++) { const u = frac(t * 1.7 + k / 3); scr.set(a.x - ox + dir * (17 + (k & 1)), a.y - oy - 16 + Math.round(u * u * 11), k === 1 ? R.water[5] : R.white[1]); } }
      // What it said as it began, or as two heads met: heard only when it is drawn, so only on screen.
      if (a.say) { sounds.push(a.say); a.say = null; }
      if (a.bugle != null && t - a.bugle < 2.4) breath(scr, a, ox, oy, t - a.bugle);
      // The far bull's answer is heard where the herd is seen (H4).
      if (a.far != null && a.farSung !== a.far && t - a.far < 0.6) { a.farSung = a.far; sounds.push('bugleFar'); }
    },
    // What is under a point of the map (world pixels; ox, oy: the view's corner, for what was drawn on screen
    // this frame): an animal's name and its act, or null. The nearest animal in front wins.
    pick(wx, wy, ox, oy) {
      let top = null;
      for (let i = 0; i < items.length; i++) { const a = items[i]; if (a.critter === 'whale' || a.gone || !a.bm || !a.bm.w) continue;
        const up = (a.hop || 0) + (a.perch || 0) - (a.drop || 0), y1 = a.y - up + 2, y0 = a.y - up - a.bm.oy - 2, half = Math.max(5, a.bm.w / 2);
        if (Math.abs(wx - a.x) <= half && wy >= y0 && wy <= y1 && (!top || a.y > top.a.y)) top = { a, i, y0 }; }
      if (top) return { label: nameOf(top.a), wx: top.a.x, wy: top.y0 - 1, act: 'animal:' + top.i };
      const sx = wx - ox, sy = wy - oy, near = (p, rx, up, dn) => p && Math.abs(sx - p[0]) <= rx && sy >= p[1] - up && sy <= p[1] + dn;
      for (const [i, p] of seen.orca.entries()) if (near(p, 9, 14, 3)) return { label: NAMES.map.orca, wx: p[0] + ox, wy: p[1] + oy - 15, act: 'orca:' + i };
      for (const [i, p] of seen.jelly.entries()) if (near(p, 4, 2, 7)) return { label: NAMES.map.jelly, wx: p[0] + ox, wy: p[1] + oy - 3, act: 'jelly:' + i };
      if (near(seen.whale, 22, 18, 4)) return { label: NAMES.map.whale, wx: seen.whale[0] + ox, wy: seen.whale[1] + oy - 18, act: 'whale' };
      for (const k of ['eagle', 'osprey']) if (near(seen[k], 12, 6, 6)) return { label: NAMES.map[k], wx: seen[k][0] + ox, wy: seen[k][1] + oy - 8, act: 'air:' + k };
      for (const [i, F] of seen.flock.entries()) if (F && F.some(p => near(p, 5, 4, 4))) { const p = F.find(q => near(q, 5, 4, 4)); return { label: NAMES.map[FLOCKS[i].gull ? 'gull' : 'raven'], wx: p[0] + ox, wy: p[1] + oy - 6, act: 'flock:' + i }; }
      return null;
    },
    // A click on one of them, by the act pick() gave: what it does, and the sound it makes (or null).
    click(id, px, py, t) { return poke(id, px, py, t); },
    podDoes: () => [...podNow],
    // The debug panel's list of acts (round 8, H13): every walker with the five things it does, under the name
    // a click shows for it and where it is now. An animal that has gone to ground for the hour is left out.
    actors: () => items.map((a, i) => a.walker && a.does && !a.gone ? { i, name: nameOf(a), x: a.x, y: a.y, does: a.does } : null).filter(Boolean),
    // One of a walker's own acts, by name, now: for the debug panel and the checks. Whether it began.
    doAct(i, name, t) { const a = items[i]; return !!a && !!a.walker && a.does.includes(name) && begin(a, name, t); },
    tideAt: t => ebbAt(t) / EBB,
    // For the checks: where the two fishing birds live and how far into its flight each is (under 0: not yet).
    birds: t => { const E = eagle(), c = E && E.flight(slotOf(EAG, t, eagAhead)[0]); return { eagle: E && { perch: [E.p.x, E.p.y, E.p.tall], over: E.C, fish: E.fish, tops: TOPS.map(p => [p.x, p.y, p.tall]), s: slotOf(EAG, t, eagAhead)[1], len: c && c.len, mark: c && c.mark },
      osprey: OSPREY && { dive: OSPREY.dive, lake: OSPREY.lake, home: OSPREY.home, s: slotOf(OSP, t, ospAhead)[1], inn: OSPREY.inn.len, out: OSPREY.out.len } }; },
    findPool: t => FIND && ebbAt(t) - FIND.P.s.cs >= 9 ? FIND.p : null,
    // For the checks: every tide pool, by the stack it lies beside.
    pools: () => pools.map(P => ({ stack: [P.s.x, P.s.y, P.s.half, P.s.cs], pools: P.pools.map(p => [p.x, p.y, p.rx, p.ry, p.life]) })),
    // The water: swells roll in toward the beach, the wash runs up the sand and back, jellyfish pulse.
    ferryHull(t, ox, oy, VW, VH) { return hullAt(t, ox, oy, VW, VH); },
    // For the checks (round 5, T15): the ferry and each orca at time t, with the least room the shared rule
    // gives it there (under 0 it is aground or on a stack). lost: an orca on the map with no clear water found.
    seaMovers(t) {
      const out = [], on = onSea, at = ferryAt(t + ferryAhead);
      if (at) { const [x, y] = shipPt(at[0], t), pts = [[x, y], ...PROBE.map(([px, py]) => [x + px, y + py])].filter(([a, b]) => on(a, b)); if (pts.length) out.push({ kind: 'ferry', x, y, room: Math.min(...pts.map(([a, b]) => col.room('boat', a, b, t, 3))) }); }
      const T = t + orcaAhead - ORCA.first, s = T - Math.floor(T / ORCA.slot) * ORCA.slot;
      if (T >= 0 && s <= ORCA.dur) POD.forEach((o, i) => { const d = s * ORCA.speed - 20 - o.lag, L = LANES[i]; if (d < 0 || d >= L.len[SEA.h - 1]) return; const p = orcaAt(i, s, t);
        if (p) { out.push({ kind: 'orca', i, x: p[0], y: p[1], room: col.room('swimmer', p[0], p[1], t, 4) }); return; }
        let row = L.r0; while (row < SEA.h - 1 && L.len[row + 1] <= d) row++; const a = L.hi[row], b = L.lo[row]; if (a != null && lerp(a, b == null ? -12 : b, ebbAt(t) / EBB) >= 1) out.push({ kind: 'orca', i, lost: true, row }); });
      spots.jelly.forEach((j, k) => { const p = jellyAt(k, t); out.push(p ? { kind: 'jelly', i: k, x: p[0], y: p[1], room: col.room('floater', p[0], p[1], t, 2), cs: W.coast(p[0], p[1]) } : { kind: 'jelly', i: k, lost: true }); });
      return out;
    },
    // The shared rules of where each kind of mover may be, for the debug overlay and the timed events.
    collide: col,
    // The debug menu's spawn list (C4): each kind of map animal and the homes its own rule gave it, in world
    // pixels. spawn(kind, i) moves that kind there (a herd as one, a mother with her kid), adding it if it is
    // absent this visit; spawn(kind, 'all') puts every one of that kind back on its own home.
    homes: () => SPAWN.map(k => ({ kind: k, homes: homesOf(k) })).filter(k => k.homes.length),
    spawn(kind, i) {
      // The eagle moves to that stack's top (every one of them, or "everywhere", is its own again); the osprey
      // is brought straight to its hover over the lake.
      if (kind === 'eagle') { if (!TOPS.length) return false; eagleAt = i === 'all' ? eagleHome : clamp(i, 0, TOPS.length - 1); eagleSits(nowT); return true; }
      if (kind === 'osprey') { if (!OSPREY) return false; if (i !== 'all' && OSPREY.dives[i]) OSPREY = ospreyAt(OSPREY.dives[i]); ospNow('fish', nowT); ospAhead += OSPREY.inn.len; return true; }
      // The bears' first home is the clearing's family's own, and that family goes back to it. The others are
      // the forest's edges the visiting family may take (D1): it is added if it is not about this visit, and
      // put there. A marmot takes the home's boulder, or the ground if it has none; a band of sheep moves as
      // one, each ram to his own place in it.
      const roamAt = spots.bearHome ? 1 : 0;
      if (kind === 'bear' && (i === 'all' || i >= roamAt) && !items.some(a => a.sow && a.roamer)) addBear();
      const all = items.filter(a => a.critter === kind && !a.mum);
      // Its young go with it, each to ground of its own beside her (the ground a kid had at the old home,
      // moved over, may be a cliff at the new one).
      const put = (a, x, y) => { const [sx, sy] = a.ok ? settle(a.ok, x, y) : [x, y], dx = sx - a.hx, dy = sy - a.hy; for (const b of [a, ...items.filter(k => k.mum === a)]) { b.away = null; b.path = null; b.homing = false; b.places = null; [b.hx, b.hy] = b !== a && (b.ok || a.ok) ? settle(b.ok || a.ok, sx + clamp(b.hx - a.hx, -18, 18), sy + clamp(b.hy - a.hy, -10, 10)) : [b.hx + dx, b.hy + dy]; b.fx = b.tx = b.x = b.hx; b.fy = b.ty = b.y = b.hy; if (b.walker) b.st = 'graze'; else if (b.cub) rest(b, nowT, 1); } };
      const perchOn = (a, lift) => { a.perch = a.lift = lift; a.r = lift ? 0 : 16; };
      if (i === 'all') { for (const a of all) { if (kind === 'marmot') perchOn(a, a.perch0); put(a, a.h0[0], a.h0[1]); } return all.length > 0; }
      const h = homesOf(kind)[i]; if (!h || !all.length) return false;
      if (kind === 'elk') { const lead = all[0], dx = h[0] - lead.hx, dy = h[1] - lead.hy; for (const a of all) put(a, a.hx + dx, a.hy + dy); }
      else if (kind === 'bear') { const sow = all.find(a => !!a.roamer === (i >= roamAt)); if (!sow) return false; if (i >= roamAt) put(sow, h[0], h[1]); else put(sow, sow.h0[0], sow.h0[1]); }
      else if (kind === 'marmot') { const lift = HOMES.marmot[i][2], y = h[1] + (lift ? 1 : 0); if (!all.some(a => a.hx === h[0] && a.hy === y)) { perchOn(all[0], lift); put(all[0], h[0], y); } }
      else if (kind === 'sheep') all.forEach((a, n) => { const p = HOMES.sheep[i][n]; if (p) put(a, p[0], p[1]); });
      // A goat, a squirrel or the moose: the first of its kind goes, unless one of them lives there already.
      else if (!all.some(a => Math.hypot(a.hx - h[0], a.hy - h[1]) < 40)) put(all[0], h[0], h[1]);
      return true;
    },
    drawHull,
    sea(scr, ox, oy, t) {
      moreWhales();
      const { VW, VH, fb } = scr, xa = Math.max(0, ox), xb = Math.min(ox + VW, SEA.w), ya = Math.max(oy, SEA.y0), yb = Math.min(oy + VH, SEA.y0 + SEA.h);
      if (xa >= xb || ya >= yb) return;
      const shift = Math.floor(t * 46) % 240, far = R.sea[4], nearC = R.sea[5], white = R.white[1], tw = t * 4.6, ebb = ebbAt(t), CS = SEA.cs, sea4 = R.sea[4], sand0 = R.sand[0], sand1 = R.sand[1], wat3 = R.water[3], wat4 = R.water[4];
      const PH = SEA.ph, GATE = SEA.gate;
      for (let wy = ya; wy < yb; wy++) {
        const r = wy - SEA.y0, row = r * SEA.w, irow = (wy - oy) * VW - ox, { runs, glints } = seaRow(r);
        // Out in the open water only the glints change.
        for (let g = 0; g < glints.length; g++) { const wx = glints[g]; if (wx < xa) continue; if (wx >= xb) break; let p = PH[row + wx] + shift; if (p >= 240) p -= 240; if (p < 22) fb[irow + wx] = GATE[row + wx] === 2 ? nearC : far; }
        for (let q = 0; q < runs.length; q += 2) {
        const x0 = Math.max(xa, runs[q]), x1 = Math.min(xb, runs[q + 1]); if (x0 >= x1) continue;
        let j = row + x0, i = irow + x0;
        for (let wx = x0; wx < x1; wx++, j++, i++) {
          const k = CS[j], cs = k ? k - 4 - ebb : 99;
          // Bared by the tide: wet sand, shining just above the water, ripple-marked higher up.
          if (k >= 4 && cs < 0) { const f = FILM[j], c = CHAN[j]; fb[i] = c === 2 ? ((wx + 2 * wy) % 5 < 2 ? wat4 : wat3) : c === 1 || cs > -3 || (f & 15) > ((wx * 3 + wy * 5) & 7) ? ((wx + wy) & 1 ? sea4 : sand0) : f & 16 ? sand1 : sand0; if (cs > -4) { const w = up0(wx, wy, tw); if (cs > -w && (cs < -w + 1.3 || ((wx + wy) & 1))) fb[i] = white; } continue; }
          const gt = SEA.gate[j];
          if (gt && cs >= 8) { let p = SEA.ph[j] + shift; if (p >= 240) p -= 240; if (p < 22) fb[i] = gt === 2 ? nearC : far; continue; }
          if (!k || cs >= 8) continue;
          // A swell that reaches the beach runs up it and drains back, so the wash keeps time with the waves.
          const u = frac((7 * Math.sin(wx / 37 + wy / 61) + tw) / 24), surge = u < 0.2 ? u / 0.2 : 1 - (u - 0.2) / 0.8;
          const lace = 1.4 * Math.sin(wx / 7 + wy / 9), up = 0.4 + 3.2 * surge + lace * 0.5, out = 1.6 + 2.4 * surge + lace;
          if (cs > -up && cs < out && (cs < -up + 1.3 || cs > out - 1.2 || ((wx + wy) & 1))) fb[i] = white;
        }
        }
      }
      // White water round the foot of each sea stack: it swells out as a wave passes the rock and draws back in.
      for (const s of stacks) {
        const x = s.x - ox, y = s.y + 1 - oy; if (x < -30 || x > VW + 30 || y < -8 || y > VH + 8 || s.cs < ebb + 2) continue;
        const u = frac((s.cs + 7 * Math.sin(s.x / 37 + s.y / 61) + tw) / 24), surge = u < 0.2 ? u / 0.2 : 1 - (u - 0.2) / 0.8;
        const rx = s.half + 0.5 + 1.6 * surge, ry = 1.5 + 1.3 * surge, n = Math.round(rx * 5);
        for (let k = 0; k < n; k++) {
          const an = k / n * TAU, sy = Math.sin(an); if (sy < -0.3 || hash(k, s.x, 75) < 0.3 - 0.3 * surge) continue;   // the far side is behind the rock
          scr.set(Math.round(x + Math.cos(an) * rx), Math.round(y + sy * ry), surge > 0.3 || k % 3 ? white : nearC);
        }
      }
      tidePools(scr, ox, oy, t, ebb);
      orcas(scr, ox, oy, t);
      drawWake(scr, ox, oy, t);
      // Moon jellies drift slowly in open water beyond the surf (T26), each round its own spot, and move out
      // ahead of a falling tide and back in with it (jellyAt, above).
      seen.jelly.length = 0;
      spots.jelly.forEach(([, , pale], k) => {
        const at = jellyAt(k, t); if (!at) return;
        // Clicked, it pulses hard three times and sinks out of sight, and drifts back up (note 10).
        const kick = jellyKick[k] != null ? t - jellyKick[k] : 9, sink = kick < 4 ? Math.round(5 * Math.sin(Math.PI * kick / 4)) : 0;
        const x = Math.round(at[0]) - ox, y = Math.round(at[1] + 1.5 * Math.sin(t * 0.5 + k)) - oy + sink;
        if (x < -4 || y < -6 || x > VW + 4 || y > VH) return;
        if (kick > 1 && kick < 3 && bayer(x, y) < 0.6) return;
        seen.jelly[k] = [x, y];
        const c = pale ? R.white[1] : R.pink[2], d = R.pink[1], shut = kick < 1.2 ? frac(kick * 2.5) < 0.5 : frac(t * 0.3 + k * 0.37) < 0.3;
        for (let dx = 0; dx < 3; dx++) scr.set(x + dx, y, c);
        if (shut) { for (let dx = 0; dx < 3; dx++) scr.set(x + dx, y + 1, dx === 1 ? c : d); for (const [dx, dy] of [[0, 2], [2, 2], [0, 3], [2, 3], [1, 4], [1, 5]]) scr.set(x + dx, y + dy, d); }
        else { for (let dx = -1; dx < 4; dx++) scr.set(x + dx, y + 1, dx === 0 ? c : d); for (const [dx, dy] of [[-1, 2], [1, 3], [3, 2], [0, 4], [2, 4]]) scr.set(x + dx, y + dy, d); }
      });
    },
    // The waterfall off Reflection Lake's lip: white water streaming down, churning where it lands, and
    // spray that rises from its foot and drifts off.
    falls(scr, ox, oy, t) {
      const { VW, VH } = scr;
      for (const F of W.falls || []) {
        const x0 = F.x - ox, ya = F.y0 - oy, yb = F.y1 - oy; if (x0 < -12 || x0 > VW + 12 || yb < -8 || ya > VH + 8) continue;
        for (let y = ya; y <= yb; y++) for (let dx = -1; dx <= 1; dx++) { const s = frac((y - t * 34) / 5 + dx * 0.37 + 0.2 * Math.sin(y + dx)); scr.set(x0 + dx, y, dx && s > 0.55 ? R.water[3] : s < 0.6 ? R.white[1] : R.water[4]); }
        for (let k = 0; k < 7; k++) { const a = hash(k, Math.floor(t * 6), 462), b = hash(k, Math.floor(t * 6), 463); scr.set(Math.round(x0 + (a - 0.5) * 9), yb + 1 + Math.round((b - 0.5) * 3), R.white[1]); }
        for (let k = 0; k < 6; k++) { const age = frac(t * 0.4 + k / 6), sx = Math.round(x0 + (k - 2.5) * 1.6 + age * 5 * Math.sin(k * 2.1)), sy = Math.round(yb - age * 9); if (hash(k, Math.floor(t * 4), 464) < 1 - age) scr.set(sx, sy, age < 0.4 ? R.white[1] : R.fog[2]); }
      }
    },
    // The mist over the forest and the fog bank off the coast, laid over everything that stands. It parts
    // round him as it does round a sign.
    weather(sea, at) { fogSea = sea; fogAt = at; },
    // Where a kind of animal is (round 8, H9), by the name the kiosk's board knows it by: the first of the
    // kind, where it stands now, or at its home when it has gone to ground; a flock, where it circles; and
    // the second bear family's edge of the forest on a day it is not out.
    lives(key) { const a = items.find(q => q.critter && sawAs(q) === key); if (a) return a.gone ? [a.hx, a.hy] : [Math.round(a.x), Math.round(a.y)];
      if (key === 'bear2' && spots.bear) return [spots.bear[0], spots.bear[1]];
      const F = FLOCKS.find(q => (q.gull ? 'gull' : 'raven') === key); return F ? [F.cx, F.cy] : null; },
    // Where each of its events happens, in map pixels, for the debug panel to look there first (round 6, note 26).
    where(name) {
      const sow = items.find(a => a.sow), mar = spots.marmots && spots.marmots[0];
      if (name === 'breach' || name === 'blow' || name === 'orcas') return spots.whale;
      if (name === 'tide') { const p = FIND && FIND.p; return p ? [p.x, p.y] : spots.whale; }
      // The middle of its crossing: its west end is against the map's edge, past where the view can centre.
      if (name === 'ferry') { const [A, B] = spots.ferry; return [(A[0] + B[0]) >> 1, (A[1] + B[1]) >> 1]; }
      if (name === 'eagle') return TOPS.length ? [TOPS[eagleAt].x, TOPS[eagleAt].y] : null;
      if (name === 'osprey') return OSPREY ? OSPREY.dive : null;
      if (name === 'cubplay' || name === 'cubclimb') return sow ? [sow.fx, sow.fy] : null;
      if (name === 'marmot') return mar ? [mar[0], mar[1]] : null;
      return null;
    },
    // The debug panel's start buttons (E5f): the humpback breaches now, or rolls and blows now (its first
    // blow after a breach), or the ferry sets out from the west end now.
    trigger(name, t) {
      if (name === 'breach' || name === 'blow') { const n = Math.floor((t + whaleAhead + T0) / SLOT) + (name === 'breach' ? 1 : 0); whaleAhead = n * SLOT + starts(n) + (name === 'blow' ? 16.6 : 0) - t - T0; return true; }
      if (name === 'eagle') { eagAhead += startNow(EAG, t + eagAhead); return true; }
      if (name === 'marmot') { let n = 0; for (const a of items) if (a.critter === 'marmot') { a.call = t; n++; } return n > 0; }
      // In each bear family: the cubs play now, or the first cub with a trunk near climbs it now.
      if (name === 'cubplay' || name === 'cubclimb') { let did = false;
        for (const sow of items.filter(a => a.sow)) { const cubs = items.filter(a => a.mum === sow && a.cub);
          if (name === 'cubplay') { const [a, b] = cubs; if (!a || !b || a.st === 'climb' || b.st === 'climb') continue; a.tx = b.fx + (a.fx < b.fx ? -8 : 8); a.ty = b.fy; a.goal = 'twin'; a.st = 'walk'; a.hop = a.lift = 0; rest(b, t, 6); did = true; }
          else for (const a of cubs) { const T = a.st !== 'climb' && trunkFor(a, 44); if (!T) continue; if (a.st === 'play' && a.sib.st === 'play') rest(a.sib, t, 1); a.trunk = T; a.tx = T.x; a.ty = T.y + 1; a.goal = 'trunk'; a.st = 'walk'; a.hop = a.lift = 0; did = true; break; } }
        return did; }
      if (name === 'osprey') { ospNow('fish', t); return true; }
      if (name === 'orcas') { orcaAhead = (((ORCA.first - t) % ORCA.slot) + ORCA.slot) % ORCA.slot; return true; }
      if (name === 'tide') { tideAhead = (((8 - t) % TIDE) + TIDE) % TIDE; return true; }
      if (name === 'ferry') { ferryAhead = (((-(t + 0.12 * CROSS)) % ROUND) + ROUND) % ROUND; return true; }
      return false;
    },
    mist(scr, ox, oy, t, here) {
      const { VW, VH, fb } = scr;
      if (!M) return;
      if (ox >= M.x1 + 120 || oy + VH <= M.y0) return;
      if (lv.length !== VW * VH) { lv = new Uint8Array(VW * VH); lo = new Int16Array(VH); hi = new Int16Array(VH); }
      lo.fill(32767); hi.fill(-1);
      for (const w of wisps) {
        const sy = w.y - oy; if (sy < -24 || sy > VH + 24) continue;
        if (w.sea) {
          // Out from the bank toward the land, thinning as it leaves the bank behind.
          const far = M.shore[w.y], x = Math.round(far - 270 + (w.at + w.v * t) % 250), k = smooth(80, 150, far - x) * smooth(far - 270, far - 235, x) * fogSea;
          if (k < 0.03 || x - w.len > ox + VW || x + w.len < ox) continue;
          for (const r of w.rows) { const s = clamp((k - r.need) / 0.3, 0, 1), y = sy + r.dy; if (s > 0 && y >= 0 && y < VH) veilRow(scr, x + Math.round(r.a * s) - ox, x + Math.round(r.b * s) - ox, y, r.edge); }
          continue;
        }
        // The whole round trip starts in the thick of the fog in the west, where it cannot be told from
        // the fog. It is thickest as it comes out and gone before the forest ends.
        const at = Math.round((w.at + w.v * t) % w.span) - 200, x = M.edge[w.y] + at + w.dx - ox;
        const k = (w.bank ? smooth(290, 60, at) : smooth(400, 10, at)) * smooth(-200, -150, at) * fogAt(x + ox, w.y);
        if (k < 0.03 || x - w.len > VW || x + w.len < 0) continue;
        // It gets shorter as well as thinner as it fades, so what is left of it is a small puff and not
        // a long hair; and it loses its heavier parts first.
        const shrink = 0.3 + 0.7 * k, most = k > 0.7 ? 3 : k > 0.3 ? 2 : 1;
        for (const r of w.rows) {
          const s = clamp((k - r.need) / 0.3, 0, 1) * shrink, y = sy + r.dy; if (s <= 0 || y < 0 || y >= VH) continue;
          const row = y * VW;
          for (let l = 1; l <= most; l++) for (const g of r.l[l - 1]) {
            const a = Math.max(0, x + Math.round(g[0] * s)), b = Math.min(VW - 1, x + Math.round(g[1] * s)); if (a > b) continue;
            for (let i = row + a; i <= row + b; i++) if (lv[i] < l) lv[i] = l;
            if (a < lo[y]) lo[y] = a; if (b > hi[y]) hi[y] = b;
          }
        }
      }
      // Laying it on. It stays light over the trail and just in from the beach, and there is none on a
      // sign, on him, past the beach, or on a crown that stands clear of it.
      for (let y = 0; y < VH; y++) {
        if (hi[y] < 0) continue;
        const wy = y + oy, row = y * VW, inside = wy >= M.y0 && wy < NH, gy = ((wy - M.y0) >> 1) * M.w, ty = (wy - M.y0) * TOPW - 0, his = here && wy > here.y - 23 && wy < here.y + 3;
        for (let x = lo[y]; x <= hi[y]; x++) {
          const i = row + x; let l = lv[i]; if (!l) continue; lv[i] = 0;
          const wx = x + ox; if (!inside || wx < 0 || wx >= M.x1) continue;
          const g = M.gate[gy + (wx >> 1)]; if (g === 2 || (his && wx > here.x - 9 && wx < here.x + 9)) continue;
          if (g === 1) l = 1;
          if (tops[ty + wx] && --l === 0) continue;
          fb[i] = VEILS[l][fb[i]];
        }
      }
      // The fog bank off the coast: solid far out and thinner in three steps toward the land. The edge
      // of each step rolls slowly at its own pace, so the bank has no hard face.
      for (let y = Math.max(0, M.y0 - oy); y < VH; y++) {
        const wy = y + oy, row = y * VW, xs = bankXs(wy, t, ox, VW); if (!xs) continue;
        const x0 = Math.max(0, -ox); if (xs[0] <= x0) continue;
        const lit = vnoise(wy / 2.6, Math.floor(t * 0.02), 133) > 0.56 ? FOG[2] : FOG[1];
        for (let x = x0; x < xs[0]; x++) { const i = row + x; if (hullMask && hullMask[i]) continue; fb[i] = x < xs[3] ? lit : SEAVEIL[x < xs[2] ? 2 : x < xs[1] ? 1 : 0][fb[i]]; }
      }
      if (hullMask) { for (const k of hullMarked) hullMask[k] = 0; hullMarked.length = 0; }
    },
    // Where each animal may wander and each flock circles, as ovals on the map, for the debug panel.
    // Every animal that moves, for the debug panel's Roam areas: walkers, squirrels (they dart up to 28
    // from home), marmots, and the flocks' circles.
    areas: () => [...items.filter(a => a.walker || a.critter === 'marmot').map(a => ({ kind: a.critter, x: a.mum ? a.mum.x : a.hx, y: a.mum ? a.mum.y + 5 : a.hy, rx: a.r, ry: a.r * 0.6 })), ...items.filter(a => a.dart).map(a => ({ kind: 'squirrel', x: a.hx, y: a.hy, rx: 28, ry: 17 })), ...FLOCKS.map(F => ({ kind: F.gull ? 'gulls' : 'birds', x: F.cx, y: F.cy, rx: F.rx, ry: F.ry })),
      ...(eagle() ? [{ kind: 'eagle', x: eagle().C[0], y: eagle().C[1], rx: eagle().RX, ry: eagle().RY }] : []), ...(OSPREY ? [{ kind: 'osprey', x: OSPREY.lake[0], y: OSPREY.lake[1], rx: OSPREY.lake[2] * 0.55, ry: OSPREY.lake[3] * 0.5 }] : [])],
    // What flies over everything else.
    over(scr, ox, oy, t) {
      const { VW, VH, fb } = scr;
      eagleFlies(scr, ox, oy, t); ospreyFlies(scr, ox, oy, t);
      FLOCKS.forEach((F, i) => { seen.flock[i] = []; }); let fi = -1;
      for (const F of FLOCKS) for (let k = 0; k < F.n; k++) {
        if (k === 0) fi++;
        // Clicked, the flock scatters: wider, faster round, beating hard, then settles to its circle again (note 10).
        const sc = F.scare != null ? t - F.scare : 9, burst = sc < 3 ? Math.sin(Math.PI * sc / 3) : 0;
        const an = t * F.w + k * TAU / F.n + 0.5 * Math.sin(t * 0.3 + k * 2) + 2.2 * smooth(0, 3, sc) * (sc < 9 ? 1 : 0) + k * 0.4 * burst, wob = (1 + 0.14 * Math.sin(t * 0.21 + k * 3)) * (1 + 0.6 * burst);
        const x = Math.round(F.cx + Math.cos(an) * F.rx * wob - ox), y = Math.round(F.cy + Math.sin(an) * F.ry * wob - oy);
        if (x < -8 || x > VW + 8 || y < -8 || y - F.lift > VH + 8) continue;
        seen.flock[fi].push([x, y - F.lift]); if (inClear(scr, x, y - F.lift)) saw(F.gull ? 'gull' : 'raven');
        for (let dx = -2; dx <= 2; dx++) { const sx = x + dx; if (sx >= 0 && sx < VW && y >= 0 && y < VH) fb[y * VW + sx] = SHADE[fb[y * VW + sx]]; }
        // They mostly hold their wings out, and beat them in short bursts.
        const f = burst > 0.1 ? (Math.floor(t * 9) + k) & 1 : F.glide ? (frac(t * 0.23 + k) < 0.12 ? Math.floor(t * 5) & 1 : 1) : frac(t * 0.17 + k * 0.37) < 0.4 ? (Math.floor(t * 3.5) + k) & 1 : 1;
        scr.blit(F.bm[f], x - 3, y - F.lift - 2);
      }
    }
  };
}
