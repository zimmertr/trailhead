// The animals of the world map and the water that moves: herds that graze and wander, a bear, squirrels
// and chipmunks that dart, marmots that sit up as he passes, birds that circle, a whale, jellyfish, the
// ferry, the mist, and the swells and the wash on the beach. The world scene draws them; so does the block-in page, at time 0.
import { TAU, clamp, smooth, frac, hash, vnoise, rng, R, DAY, DUSK, N, BLACK, INK, SHADE, KIND, BM, outline, thick, pick, veilTable, DEBUG } from './core.js';
import { makeElk, makeBird } from './sprites.js';
import { ell, goat, marmot, heron } from './fauna.js';
import { NW, NH } from './land.js';
import { makeCollide } from './collide.js';

// A black bear on all fours, facing right. pose: 'look', 'sniff' with its nose in the grass.
export function mapBear(pose, step = 0) {
  const b = new BM(28, 17); b.ox = 12; b.oy = 16;
  const fur = (nx, ny, x, y) => pick('fur', 0.42 - ny * 0.3 + 0.2 * (hash(x, y, 4) - 0.5), x, y, 0.6);
  for (const [lx, far] of [[6, 1], [8, 0], [16, 1], [18, 0]]) { const sw = step ? (far ? -1 : 1) * (step === 1 ? 1 : -1) : 0; thick(b, lx, 10, lx + sw, 15, 2, R.fur[far ? 0 : 1]); }
  ell(b, 12, 8, 8, 4.4, fur); ell(b, 7, 7.5, 4, 4, fur); ell(b, 16, 6.5, 3.6, 3.4, fur);
  const hx = pose === 'sniff' ? 22 : 22, hy = pose === 'sniff' ? 12 : 6;
  thick(b, 18, 7, hx - 1, hy, 4, R.fur[1]); ell(b, hx, hy, 2.8, 2.5, fur);
  b.set(hx + 3, hy + 1, R.dirt[2]); b.set(hx + 4, hy + 1, R.dirt[2]); b.set(hx + 3, hy + 2, R.dirt[1]);
  b.set(hx - 1, hy - 3, R.fur[1]); b.set(hx + 1, hy - 3, R.fur[1]); b.set(hx + 1, hy - 1, R.white[1]);
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
// opts.bear: true or false puts the bear there or not, whatever the dice say (the block-in page asks for it).
export function makeCritters(W, opts = {}) {
  const { spots, sea: SEA, g } = W, items = [];
  // The sea stacks, found among the things that stand in the water, for the white water round their feet.
  const stacks = W.things.filter(th => !th.tree && th.bm && th.bm.h >= 14 && th.x < SEA.w && W.coast(th.x, th.y) > 14).map(th => ({ x: th.x, y: th.y, half: th.bm.w / 2, cs: W.coast(th.x, th.y) }));
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
  // The map animals the debug menu can place (C4), and the homes each one's own rule chose for it (habitat in land.js).
  const SPAWN = ['elk', 'goat', 'sheep', 'bear', 'marmot', 'squirrel'];
  const homesOf = k => k === 'elk' ? [spots.elk[0].slice(0, 2)] : k === 'goat' ? spots.goats.filter(g => !g[2]).map(g => g.slice(0, 2)) : k === 'bear' ? [spots.bear.slice(0, 2)] : (k === 'squirrel' ? spots.squirrels : spots[k === 'sheep' ? 'sheep' : 'marmots']).map(g => g.slice(0, 2));
  // Where the trees stand, so a wandering animal goes round them, and the ground just behind anything
  // tall (a tree, a snag, a big rock), where it would stand hidden.
  const CELL = 8, GW = Math.ceil(NW / CELL), GH = Math.ceil(NH / CELL), wood = new Uint8Array(GW * GH), hid = new Uint8Array(GW * GH);
  for (const th of W.things) {
    if (th.tree) wood[Math.floor(th.y / CELL) * GW + Math.floor(th.x / CELL)] = 1;
    const w = th.tree ? th.tree.w : th.bm.w, h = th.tree ? th.tree.h : th.bm.h; if (h < 14) continue;
    for (let y = th.y - Math.min(h, 34) + 5; y <= th.y + 1; y += CELL / 2) for (let x = th.x - w / 2 - 3; x <= th.x + w / 2 + 3; x += CELL / 2) { const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL); if (cx >= 0 && cy >= 0 && cx < GW && cy < GH) hid[cy * GW + cx] = 1; }
  }
  const kindAt = (x, y) => KIND[g[Math.round(y) * NW + Math.round(x)]];
  const clear = (x, y) => x > 8 && y > 8 && x < NW - 8 && y < NH - 4 && W.open(x, y) && !wood[Math.floor(y / CELL) * GW + Math.floor(x / CELL)] && !wood[Math.floor((y - 5) / CELL) * GW + Math.floor(x / CELL)] && !hid[Math.floor(y / CELL) * GW + Math.floor(x / CELL)];
  const meadow = (x, y) => clear(x, y) && kindAt(x, y) >= 1 && kindAt(x, y) <= 3 && W.forestAmt(x, y) < 0.45 && !W.nearTrail(x, y, 5);
  const way = (ok, x0, y0, x1, y1) => { for (let k = 1; k <= 5; k++) if (!ok(x0 + (x1 - x0) * k / 5, y0 + (y1 - y0) * k / 5)) return false; return true; };

  // ---- the animals that graze and wander ----------------------------------------------------
  const elkBull = { look: makeElk(false), graze: makeElk(true), walk: [makeElk(false, 1), makeElk(false, 2)] };
  const elkCow = { look: makeElk(false, 0, false), graze: makeElk(true, 0, false), walk: [makeElk(false, 1, false), makeElk(false, 2, false)] };
  const goatF = kid => ({ look: goat('look', kid), stand: goat('stand', kid), graze: goat('graze', kid), walk: [goat('stand', kid, 1), goat('stand', kid, 2)] });
  const goats = [goatF(false), goatF(true)];
  const ram = { look: W.make.sheep(false), graze: W.make.sheep(true), walk: [W.make.sheep(false, 1), W.make.sheep(false, 2)] };
  const bearF = { look: mapBear('look'), graze: mapBear('sniff'), walk: [mapBear('look', 1), mapBear('look', 2)] };
  const rand = rng(77);
  // faces: the way the drawing looks, -1 left or 1 right. r: how far it strays from where it was put.
  // An animal is put where it was meant to stand, or on the nearest ground it may stand on if a tree has since been planted there.
  const settle = (ok, x, y) => { if (ok(x, y)) return [x, y]; for (let r = 4; r <= 48; r += 4) for (let k = 0; k < 12; k++) { const an = k / 12 * TAU, px = Math.round(x + Math.cos(an) * r), py = Math.round(y + Math.sin(an) * r * 0.6); if (ok(px, py)) return [px, py]; } return [x, y]; };
  // Each keeps to its own country (o.ok) and to the ground any land animal may stand on (collide.js: firm,
  // open, clear of the buildings).
  const walker = (kind, f, x0, y0, o) => { const own = o.ok; o = { ...o, ok: (x, y) => own(x, y) && col.canBe('land', x, y, 0) }; const [x, y] = settle(o.ok, x0, y0); items.push({ critter: kind, walker: true, f, bm: f.graze, x, y, hx: x, hy: y, h0: [x, y], st: o.start || 'graze', until: 2 + rand() * 12, flip: rand() < 0.5, tx: x, ty: y, fx: x, fy: y, ...o }); };
  // The herd keeps together: each elk strays only a little from its own place in it.
  spots.elk.forEach(([x, y, d], n) => walker('elk', n === 0 ? elkBull : elkCow, x, y, { faces: -1, r: 22, v: 6, ok: meadow, start: d ? 'graze' : 'look' }));
  spots.goats.forEach(([x, y, kid], n) => walker('goat', goats[kid ? 1 : 0], x, y, { faces: 1, r: kid ? 16 : 30, v: kid ? 10 : 6, ok: clear, start: n & 1 ? 'look' : 'graze', mum: kid ? items[items.length - 1] : null }));
  spots.sheep.forEach(([x, y, d]) => walker('sheep', ram, x, y, { faces: 1, r: 34, v: 6, ok: clear, start: d ? 'graze' : 'look' }));
  // The bear is not always about: it is there on roughly one visit in three. For screenshots, bear=1 or
  // bear=0 in the address settles it.
  const asked = typeof location !== 'undefined' && /[?&]bear=([01])/.exec(location.search);
  const addBear = () => walker('bear', bearF, spots.bear[0], spots.bear[1], { faces: 1, r: 90, v: 7, ok: meadow, roam: 0.4 });
  if (opts.bear != null ? opts.bear : asked ? asked[1] === '1' : Math.random() < 0.35) walker('bear', bearF, spots.bear[0], spots.bear[1], { faces: 1, r: 90, v: 7, ok: meadow, roam: 0.4 });

  function walk(a, dt, t) {
    if (a.st === 'walk') {
      const dx = a.tx - a.fx, dy = a.ty - a.fy, d = Math.hypot(dx, dy);
      if (d < 0.6) { a.st = 'graze'; a.until = t + 5 + rand() * 10; }
      else { const s = Math.min(d, a.v * dt); a.fx += dx / d * s; a.fy += dy / d * s * 0.7; if (Math.abs(dx) > 0.5) a.flip = (dx > 0 ? 1 : -1) !== a.faces; }
      a.x = Math.round(a.fx); a.y = Math.round(a.fy);
      a.bm = a.f.walk[Math.floor(t * 4.5 + a.hx) & 1];
      if (Math.abs(a.ty - a.fy) < 0.6 && Math.abs(dx) < 0.6) { a.st = 'graze'; a.until = t + 5 + rand() * 10; }
      return;
    }
    a.bm = a.st === 'graze' ? a.f.graze : a.f.stand && frac(t * 0.11 + a.hx * 0.37) < 0.5 ? a.f.stand : a.f.look;
    if (t < a.until) return;
    const roll = rand();
    if (roll < (a.roam || 0.25)) {
      // A kid keeps near its mother; everyone else keeps near home.
      const cx = a.mum ? a.mum.x : a.hx, cy = a.mum ? a.mum.y + 5 : a.hy;
      for (let k = 0; k < 6; k++) {
        const an = rand() * TAU, rr = a.r * (0.35 + 0.65 * rand()), tx = cx + Math.cos(an) * rr, ty = cy + Math.sin(an) * rr * 0.6;
        if (a.ok(tx, ty) && way(a.ok, a.fx, a.fy, tx, ty)) { a.tx = tx; a.ty = ty; a.st = 'walk'; return; }
      }
    }
    a.st = roll < 0.72 ? 'graze' : 'look'; a.until = t + (a.st === 'look' ? 2.5 + rand() * 4 : 5 + rand() * 11);
    if (a.st === 'look' && rand() < 0.3) a.flip = !a.flip;
  }

  // ---- squirrels and chipmunks: sit, then dart ----------------------------------------------
  const sq = [0, 1].map(chip => ({ sit: W.make.squirrel(!!chip), run: W.make.squirrel(!!chip, true) }));
  for (const [x, y, chip] of spots.squirrels) items.push({ h0: [x, y], critter: 'squirrel', dart: true, f: sq[chip ? 1 : 0], bm: sq[chip ? 1 : 0].sit, x, y, fx: x, fy: y, hx: x, hy: y, tx: x, ty: y, st: 'sit', until: 3 + rand() * 12, flip: rand() < 0.5 });
  function dart(a, dt, t, here) {
    if (a.st === 'run') {
      const dx = a.tx - a.fx, dy = a.ty - a.fy, d = Math.hypot(dx, dy);
      if (d < 1) { a.st = 'sit'; a.until = t + 5 + rand() * 11; a.bm = a.f.sit; return; }
      const s = Math.min(d, 46 * dt); a.fx += dx / d * s; a.fy += dy / d * s; a.x = Math.round(a.fx); a.y = Math.round(a.fy);
      if (Math.abs(dx) > 0.5) a.flip = dx < 0;
      a.bm = a.f.run; a.hop = Math.floor(t * 9) & 1;
      return;
    }
    a.hop = 0;
    // He scares them: they bolt the other way when he comes close.
    const near = here && Math.hypot(here.x - a.fx, here.y - a.fy) < 20;
    if (!near && t < a.until) return;
    for (let k = 0; k < 6; k++) {
      const an = near ? Math.atan2(a.fy - here.y, a.fx - here.x) + (rand() - 0.5) * 1.6 : rand() * TAU, rr = near ? 26 + rand() * 12 : 6 + rand() * 22;
      const tx = (near ? a.fx : a.hx) + Math.cos(an) * rr, ty = (near ? a.fy : a.hy) + Math.sin(an) * rr * 0.6;
      if (clear(tx, ty) && Math.hypot(tx - a.fx, ty - a.fy) > 4) { a.tx = tx; a.ty = ty; a.st = 'run'; return; }
    }
    a.until = t + 3;
  }

  // ---- marmots: sunning on a rock, up on their haunches when he is near or now and then ----
  const mar = { sun: marmot('sun'), up: marmot('up') };
  // Each has a few rocks' worth of ground round its own (E5i, TJ: no animal just stands still): now and then
  // it scurries a little way to sun somewhere else, and it still sits up when he comes by.
  spots.marmots.forEach(([x, y], n) => items.push({ critter: 'marmot', bm: mar.sun, x, y, n, flip: !!(n & 1), hx: x, hy: y, h0: [x, y], fx: x, fy: y, tx: x, ty: y, r: 16, st: 'sun', until: 4 + rand() * 10 }));
  function scurry(a, dt, t, here) {
    const up = (here && Math.hypot(here.x - a.x, here.y - a.y) < 64) || frac(t / 11 + a.n * 0.37) < 0.2;
    if (a.st === 'run') {
      const dx = a.tx - a.fx, dy = a.ty - a.fy, d = Math.hypot(dx, dy);
      if (d < 0.8) { a.st = 'sun'; a.until = t + 6 + rand() * 12; a.hop = 0; }
      else { const s = Math.min(d, 18 * dt); a.fx += dx / d * s; a.fy += dy / d * s; a.x = Math.round(a.fx); a.y = Math.round(a.fy); if (Math.abs(dx) > 0.5) a.flip = dx < 0; a.hop = Math.floor(t * 8) & 1; a.bm = mar.sun; return; }
    }
    a.bm = up ? mar.up : mar.sun;
    if (up || t < a.until) return;
    for (let k = 0; k < 6; k++) { const an = rand() * TAU, rr = a.r * (0.3 + 0.7 * rand()), tx = a.hx + Math.cos(an) * rr, ty = a.hy + Math.sin(an) * rr * 0.6; if (W.open(tx, ty) && way((x, y) => W.open(x, y), a.fx, a.fy, tx, ty)) { a.tx = tx; a.ty = ty; a.st = 'run'; return; } }
    a.until = t + 5;
  }

  // ---- the heron: still in the oxbow until he runs close by (E5j) ----------------------------------
  // It stands and now and then turns. When he comes within 60 on the move it lifts off slowly, away from
  // him, climbing low over the meadow on slow wingbeats, and is gone; 35 s later it glides back the
  // same way and stands again. The debug panel can send it off at any time.
  const her = { stand: heron('stand'), fly: [heron('fly0'), heron('fly1')] }, HER = { out: 9, back: 44, home: 53 };
  if (spots.heron) items.push({ critter: 'heron', bm: her.stand, x: spots.heron[0], y: spots.heron[1], hx: spots.heron[0], hy: spots.heron[1], st: 'stand', t0: 0, dir: -1, last: null });
  const herItem = items.find(a => a.critter === 'heron');
  const takeOff = (a, t, from) => { a.st = 'fly'; a.t0 = t; a.dir = from && from.x > a.hx ? -1 : from ? 1 : -1; };
  function wade(a, dt, t, here) {
    const moved = here && a.last && Math.hypot(here.x - a.last.x, here.y - a.last.y) > 0.05;
    a.last = here ? { x: here.x, y: here.y } : null;
    if (a.st === 'stand') {
      a.bm = her.stand; a.hop = 0; a.x = a.hx; a.y = a.hy; a.flip = frac(t / 23 + 0.3) < 0.35;
      if (moved && Math.hypot(here.x - a.hx, (here.y - a.hy) * 1.4) < 60) takeOff(a, t, here);
      return;
    }
    const s = t - a.t0; if (s >= HER.home) { a.st = 'stand'; return; }
    // Out along a slow climb, then back along the same line, gliding in on fewer beats.
    const out = s < HER.out, back = s >= HER.back, k = out ? s : back ? HER.home - s : 0;
    if (!out && !back) { a.x = -999; return; }
    a.x = Math.round(a.hx + a.dir * (9 * k + 2.2 * k * k)); a.y = a.hy; a.hop = Math.round(16 * smooth(0, 2.5, k) + 2.4 * k);
    a.flip = out ? a.dir < 0 : a.dir > 0; a.bm = back && k < 2.5 ? her.stand : her.fly[Math.floor(s * (back ? 1.2 : 2.2)) & 1];
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
  const back = (() => { const b = new BM(20, 6); b.ox = 10; b.oy = 5; ell(b, 10, 6, 8.5, 4.2, (nx, ny) => R.navy[ny < -0.55 ? 2 : 1]); b.set(13, 1, R.navy[0]); b.set(14, 1, R.navy[0]); outline(b, INK); return b; })();
  items.push({ critter: 'whale', bm: whales[0], x: spots.whale[0], y: spots.whale[1] });
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
    // The roll and the blow, each at a spot of its own, picked when it begins.
    for (const [b, at] of [[0, 17], [1, 31]]) {
      const v = u - at; if (v <= 0 || v >= 3) { if (v >= 3) a.blows[b] = null; continue; }
      const P = a.blows[b] || (a.blows[b] = pickOpen(n * 3 + b + 1, ox, oy, scr.VW, scr.VH));
      const bx = P[0] - ox + 6 - Math.round(v * 4), by = P[1] - oy, up = Math.round(v < 0.6 ? 5 * (1 - ease(v / 0.6)) : v > 2.2 ? 5 * ease((v - 2.2) / 0.8) : 0);
      for (let j = 0; j < back.h - up; j++) for (let i = 0; i < back.w; i++) { const c = back.d[j * back.w + i]; if (c) scr.set(bx - back.ox + i, by - back.oy + up + j, c); }
      for (let i = -9; i <= 9; i += 2) scr.set(bx + i, by + 1, white);
      if (v > 0.5 && v < 1.6) { const hgt = Math.round(9 * Math.min(1, (v - 0.5) / 0.3)), fade = v > 1.2; for (let j = 0; j < hgt; j++) { if (fade && (j + Math.floor(t * 8)) % 2) continue; const sp = j > hgt - 4 ? Math.round((j - hgt + 4) * 0.8) : 0; scr.set(bx + 5 - sp, by - 5 - j, white); scr.set(bx + 5 + sp, by - 5 - j, white); } }
    }
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
  // How far up the bared sand the last of each wave's wash runs, in the same units as the tide.
  const up0 = (wx, wy, tw) => { const u = frac((7 * Math.sin(wx / 37 + wy / 61) + tw) / 24), surge = u < 0.2 ? u / 0.2 : 1 - (u - 0.2) / 0.8; return 0.4 + 2.2 * surge + 0.7 * Math.sin(wx / 7 + wy / 9); };
  function tidePools(scr, ox, oy, t, ebb) {
    for (const P of pools) { const e = ebb - P.s.cs; if (e < 3) continue; const show = smooth(3, 9, e), sx = P.s.x - ox, sy = P.s.y - oy; if (sx < -40 || sx > scr.VW + 40 || sy < -20 || sy > scr.VH + 20) continue;
      // Mussels in a dark band round the foot of the rock, barnacles white on them.
      for (let dx = -Math.ceil(P.s.half) - 1; dx <= P.s.half + 1; dx++) for (let dy = -1; dy <= 1; dy++) { if (bayerish(dx, dy, P.s.x) > show) continue; scr.set(sx + dx, sy + dy, hash(dx, dy, P.s.x + 6105) < 0.25 ? R.white[0] : R.jay[0]); }
      for (const p of P.pools) { const px = p.x - ox, py = p.y - oy;
        for (let dy = -p.ry; dy <= p.ry; dy++) for (let dx = -p.rx; dx <= p.rx; dx++) { const q = (dx / (p.rx + 0.5)) ** 2 + (dy / (p.ry + 0.5)) ** 2; if (q > 1 || bayerish(dx, dy, p.x) > show) continue; scr.set(px + dx, py + dy, dy === -p.ry ? R.sea[1] : q < 0.4 && ((dx + dy) & 1) ? R.sea[3] : R.sea[2]); }
        if (show < 0.7) continue;
        if (p.life === 3) { for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) scr.set(px - 1 + dx, py + dy, R.red[1]); scr.set(px + 2, py, R.moss[5]); scr.set(px + 2, py - 1, R.moss[4]); scr.set(px + 1, py + 1, R.jay[1]); scr.set(px + 2, py + 1, R.jay[1]); }
        else if (p.life === 0) { const c = hash(p.x, p.y, 6106) < 0.5 ? R.red[1] : R.pink[0]; scr.set(px, py, c); scr.set(px - 1, py, c); scr.set(px + 1, py, c); scr.set(px, py - 1, c); scr.set(px, py + 1, c); }
        else if (p.life === 1) { scr.set(px, py, R.moss[5]); scr.set(px - 1, py, R.moss[4]); scr.set(px + 1, py, R.moss[4]); }
        else { scr.set(px, py, R.jay[1]); scr.set(px + 1, py, R.jay[1]); scr.set(px, py - 1, R.pink[0]); } }
      // A crab sidles over the sand from pool to pool, stopping now and then.
      if (show > 0.7) { const a = P.pools[0], b = P.pools[P.pools.length - 1], q = 0.5 + 0.5 * Math.sin(t * 0.35 + P.s.x), stop = frac(t * 0.5) < 0.3, x = Math.round(a.x + (b.x - a.x) * q) - ox, y = Math.round(a.y + (b.y - a.y) * q) - oy + 2;
        scr.set(x, y, R.red[0]); scr.set(x + 1, y, R.red[0]); scr.set(x - 1, y - (stop ? 0 : (Math.floor(t * 6) & 1)), R.red[1]); scr.set(x + 2, y - (stop ? 0 : (Math.floor(t * 6 + 1) & 1)), R.red[1]); }
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
  // Salmon at Reflection Lake's fall (E9): the one fall on a river that reaches the sea, and low enough to
  // leap. Every SAL.slot seconds a burst of one or two sockeye (red, green heads) leap from the plunge pool;
  // most fall back, now and then one clears the lip. An osprey comes by every OSP.slot seconds, circles
  // over the pool, folds and dives, and flies off with a fish.
  const SAL = { slot: 20, first: 5, gap: 1.3 }, OSP = { slot: 75, first: 22, len: 17 }; let salAhead = 0, ospAhead = 0;
  const sockeye = (scr, x, y, up) => { scr.set(x, y, up ? R.moss[3] : R.red[0]); scr.set(x, y + 1, R.red[1]); scr.set(x, y + 2, up ? R.red[0] : R.moss[3]); scr.set(x + (up ? -1 : 1), y + (up ? 2 : 0), R.red[2]); };
  function salmon(scr, ox, oy, t) {
    const F = (W.falls || [])[0]; if (!F) return; const x0 = F.x - ox, ya = F.y0 - oy, yb = F.y1 - oy; if (x0 < -40 || x0 > scr.VW + 40 || yb < -40 || ya > scr.VH + 40) return;
    const s = t + salAhead - SAL.first; if (s < 0) return; const n = Math.floor(s / SAL.slot), u = s - n * SAL.slot, leaps = hash(n, 1, 571) < 0.55 ? 1 : 2;
    for (let k = 0; k < leaps; k++) { const a = u - k * SAL.gap; if (a < 0 || a > 1.2) continue;
      const clear = hash(n, k, 572) < 0.3, side = Math.round((hash(n, k, 574) - 0.5) * 5), drop = yb - ya;
      if (clear) { const p = a / 1.1; if (p > 1) continue; const y = Math.round(yb - (drop + 3) * Math.sin(Math.min(1, p / 0.7) * Math.PI / 2)), x = x0 + side - Math.round(p * 2);
        if (p < 0.7) sockeye(scr, x, y, true); else if (hash(Math.floor(t * 12), k, 575) < 0.8) { scr.set(x - 1, ya, R.white[1]); scr.set(x + 1, ya, R.white[1]); }
        if (p < 0.12) { scr.set(x - 1, yb + 1, R.white[1]); scr.set(x + 1, yb + 1, R.white[1]); } continue; }
      const p = a / 0.9; if (p > 1) { if (a < 1.2) { scr.set(x0 + side - 1, yb + 1, R.white[1]); scr.set(x0 + side + 2, yb + 1, R.white[1]); scr.set(x0 + side, yb, R.white[1]); } continue; }
      const H = drop * (0.45 + 0.35 * hash(n, k, 573)), y = Math.round(yb - 4 * H * p * (1 - p)), x = x0 + side + Math.round((p - 0.5) * 3);
      sockeye(scr, x, y, p < 0.5); if (p < 0.12) { scr.set(x - 1, yb + 1, R.white[1]); scr.set(x + 1, yb + 1, R.white[1]); } }
  }
  // The osprey, seen from above as the map sees it: long bent brown wings with dark tips, a white head and
  // breast that show against the forest; gliding, beating, folded for the dive.
  const OSPREY = { glide: ['kb.........bk', '.bbbb.w.bbbb.', '....bwwwb....', '......b......'], beat: ['......w......', '..kbbbwbbbk..', '.bb..www..bb.', 'k.....b.....k'], fold: ['.w.', 'bwb', 'bwb', 'kbk'] };
  const bird = (scr, x, y, rows) => rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.') scr.set(x - (r.length >> 1) + i, y + j, r[i] === 'w' ? R.white[1] : r[i] === 'k' ? R.bark[0] : R.wood[2]); });
  function osprey(scr, ox, oy, t) {
    const F = (W.falls || [])[0]; if (!F) return; const o = t + ospAhead - OSP.first; if (o < 0) return; const w = o - Math.floor(o / OSP.slot) * OSP.slot; if (w > OSP.len) return;
    const px = F.x + 4 - ox, py = F.y1 - oy, cx = px, cy = py - 40, beat = Math.floor(t * 5) % 2 ? OSPREY.beat : OSPREY.glide, A = 9 * 1.3;
    if (w < 9) { const an = w * 1.3 + 2; bird(scr, Math.round(cx + Math.cos(an) * 34), Math.round(cy + Math.sin(an) * 10), hash(Math.floor(t * 2), 0, 576) < 0.25 ? beat : OSPREY.glide); return; }
    if (w < 10.2) { const p = ((w - 9) / 1.2) ** 2, sx = cx + Math.cos(A + 2) * 34, sy = cy + Math.sin(A + 2) * 10; bird(scr, Math.round(sx + (px - sx) * p), Math.round(sy + (py - 3 - sy) * p), OSPREY.fold); return; }
    if (w < 10.9) { for (let k = 0; k < 6; k++) { const an = k / 6 * Math.PI * 2, r = 2 + (w - 10.2) * 6; scr.set(Math.round(px + Math.cos(an) * r), Math.round(py + Math.sin(an) * r * 0.4), R.white[1]); } bird(scr, px, py - 3, OSPREY.fold); return; }
    const p = (w - 10.9) / (OSP.len - 10.9), x = Math.round(px + p * 150), y = Math.round(py - 4 - p * 110 - 20 * Math.sin(p * Math.PI));
    bird(scr, x, y, Math.floor(t * 6) % 2 ? OSPREY.beat : OSPREY.glide); sockeye(scr, x, y + 4, false);
  }
  const isoX = new Map(), isoAt = c => { let a = isoX.get(c); if (a) return a; a = new Int16Array(SEA.h).fill(-1);
    for (let r = 0; r < SEA.h; r++) for (let x = SEA.w - 1; x >= 0; x--) if (SEA.cs[r * SEA.w + x] >= c + 4) { a[r] = x; break; } isoX.set(c, a); return a; };
  function orcas(scr, ox, oy, t) {
    const T = t + orcaAhead - ORCA.first, n = Math.floor(T / ORCA.slot), s = T - n * ORCA.slot, dur = (SEA.h + 80) / ORCA.speed; if (T < 0 || s > dur) return;
    const spy = Math.floor(hash(n, 1, 6301) * POD.length), spyAt = 30 + 30 * hash(n, 2, 6301), sv = s - spyAt;
    // As the tide goes out the pod keeps the same depth under it, so its line moves out with the water (T15),
    // in steps of 2; then clear of the stacks by the shared rule.
    const lift = 2 * Math.round(ebbAt(t) / 2);
    POD.forEach((o, i) => {
      const row = Math.round(s * ORCA.speed - 20 - o.lag); if (row < 0 || row >= SEA.h) return; const x0 = isoAt(o.c + lift)[row]; if (x0 < 0) return;
      const at = col.clear('swimmer', x0, SEA.y0 + row, t, 4); if (!at) return;
      const x = Math.round(at[0]) - ox, y = Math.round(at[1]) - oy; if (x < -20 || x > scr.VW + 20 || y < -20 || y > scr.VH + 6) return;
      if (i === spy && sv > 0 && sv < 3.2) return spyhop(scr, x, y, sv / 3.2, t);
      const ph = frac(s / 4.2 + i * 0.31), q = ph / 0.55; if (q >= 1) return; const h = Math.sin(Math.PI * q);
      orcaBack(scr, x, y, h, o.bull, t, i);
      // A blow as it comes up, now and then.
      if (q < 0.45 && hash(Math.floor(s / 4.2), i, 6302) < 0.35) { const k = q / 0.45, hgt = Math.round(3 + 4 * k); for (let j = 0; j < hgt; j++) { if (k > 0.6 && (j + Math.floor(t * 8)) % 2) continue; const sp = j > hgt - 3 ? 1 : 0; scr.set(x + 3 - sp, y - 3 - j, R.white[1]); if (sp) scr.set(x + 3 + sp, y - 3 - j, R.white[1]); } }
    });
  }
  // The back above the water by h (0 to 1): a black arc with the grey saddle behind the fin, the fin on
  // top, and white water where it cuts the surface.
  function orcaBack(scr, x, y, h, bull, t, i) {
    for (let dx = -8; dx <= 8; dx++) { const top = Math.round(h * 3.6 * (1 - (dx / 8.6) ** 2)); for (let j = 1; j <= top; j++) scr.set(x + dx, y - j, j === top ? INK : (dx === -3 || dx === -4) && j >= top - 2 && j < top && h > 0.6 ? R.rock[4] : R.navy[0]); }
    const fh = Math.round((bull ? 11 : 6) * h), base = y - Math.round(h * 3.6);
    for (let j = 1; j <= fh; j++) { const lean = bull ? 0 : -Math.round(1.5 * (j / fh) ** 1.5), w = j < fh * 0.55 ? 2 : 1; for (let k = 0; k < w; k++) scr.set(x + 1 + lean - k, base - j, INK); }
    if (h > 0.5) for (let dx = 4; dx <= 5; dx++) scr.set(x + dx, y - 1, R.white[1]);
    const beat = Math.floor(t * 6);
    for (let dx = -11; dx <= 11; dx++) if (Math.abs(dx) > 7 - h * 3 && hash(dx, beat + i * 9, 6303) < 0.55) scr.set(x + dx, y, R.white[1]);
  }
  // A spyhop: the head rises straight up out of the water, holds and slides back down.
  function spyhop(scr, x, y, v, t) {
    const up = Math.round(13 * Math.sin(Math.PI * Math.min(1, v * 1.25)) ** 0.7);
    for (let j = 0; j < up; j++) { const fromTop = up - 1 - j, yy = y - 1 - j;
      for (let dx = -1; dx <= 1; dx++) { if (fromTop === 0 && dx) continue; let c = R.navy[0];
        if ((fromTop === 3 || fromTop === 4) && dx === 1) c = R.white[1]; else if (fromTop >= 6 && fromTop <= 9 && dx === 0) c = R.white[1]; else if (dx === -1 || fromTop === 0) c = INK; scr.set(x + dx, yy, c); } }
    const beat = Math.floor(t * 6); for (let dx = -4; dx <= 4; dx++) if (Math.abs(dx) > 1 && hash(dx, beat, 6304) < 0.7) scr.set(x + dx, y, R.white[1]);
  }
  // A fixed dither for the pools coming into view as the water leaves them.
  const bayerish = (x, y, k) => hash(x, y, k + 6107);
  // Tide pools round the two stacks: a few small pools on the flat about each foot, each with something
  // living in it (a starfish, an anemone, an urchin), a band of mussels and barnacles round the foot of
  // the rock, and a crab picking over the sand between. A pool goes only where the low water bares the
  // sand well and where the rock does not stand over it (beside it or in front, never behind).
  const pools = POOLED.map((s, n) => { const list = [];
    for (let k = 0; k < 40 && list.length < 5; k++) { const a = hash(k, n, 6101) * TAU, rr = s.half + 4 + 9 * hash(k, n, 6102), x = Math.round(s.x + Math.cos(a) * rr), y = Math.round(s.y + 1 + Math.sin(a) * rr * 0.4);
      if (csAt(x, y) - 4 > EBB - 8 || (Math.abs(x - s.x) <= s.half + 3 && y <= s.y) || list.some(p => Math.abs(p.x - x) < 7 && Math.abs(p.y - y) < 4)) continue;
      list.push({ x, y, rx: 3 + Math.round(2 * hash(k, n, 6103)), ry: 2, life: list.length % 3 }); }
    return { s, pools: list }; }).filter(P => P.pools.length >= 2);
  // The pool to find (E7): the biggest of them all, with an ochre star, a green anemone and a purple
  // urchin in it together; it can be tapped once the water has left it.
  const FIND = (() => { let best = null; for (const P of pools) for (const p of P.pools) if (!best || p.rx > best.p.rx) best = { P, p }; if (best) best.p.life = 3; return best; })();

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
  const shipPt = (s, t) => { const p = coursePt(s); return col.clear('boat', p[0], p[1], t, 3, PROBE) || p; };
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
  const ink = [makeBird(0), makeBird(1)], gull = ink.map(b => tint(b, R.white[1]));
  // Where each flock circles comes from the land (land.js, habitat).
  const FLOCKS = (W.flocks || []).map(F => ({ ...F, bm: F.gull ? gull : ink }));

  return {
    items,
    update(dt, t, here) {
      for (const a of items) {
        if (a.walker) walk(a, dt, t);
        else if (a.dart) dart(a, dt, t, here);
        else if (a.critter === 'marmot') scurry(a, dt, t, here);
        else if (a.critter === 'heron') wade(a, dt, t, here);
      }
    },
    draw(scr, a, ox, oy, t) {
      if (a.critter === 'whale') return drawWhale(scr, a, ox, oy, t);
      if (a.walker || a.critter === 'marmot') scr.shadow(a.x - ox, a.y - oy, a.critter === 'marmot' ? 5 : 7, 1);
      scr.put(a.bm, a.x - ox, a.y - oy - (a.hop || 0), a.flip);
    },
    tideAt: t => ebbAt(t) / EBB,
    findPool: t => FIND && ebbAt(t) - FIND.P.s.cs >= 9 ? FIND.p : null,
    // The water: swells roll in toward the beach, the wash runs up the sand and back, jellyfish pulse.
    ferryHull(t, ox, oy, VW, VH) { return hullAt(t, ox, oy, VW, VH); },
    // The shared rules of where each kind of mover may be, for the debug overlay and the timed events.
    collide: col,
    // The debug menu's spawn list (C4): each kind of map animal and the homes its own rule gave it, in world
    // pixels. spawn(kind, i) moves that kind there (a herd as one, a mother with her kid), adding it if it is
    // absent this visit; spawn(kind, 'all') puts every one of that kind back on its own home.
    homes: () => SPAWN.map(k => ({ kind: k, homes: homesOf(k) })),
    spawn(kind, i) {
      if (kind === 'bear' && !items.some(a => a.critter === 'bear')) addBear();
      const all = items.filter(a => a.critter === kind && !a.mum);
      const put = (a, x, y) => { const [sx, sy] = a.ok ? settle(a.ok, x, y) : [x, y], dx = sx - a.hx, dy = sy - a.hy; for (const b of [a, ...items.filter(k => k.mum === a)]) { b.hx += dx; b.hy += dy; b.fx = b.tx = b.x = b.hx; b.fy = b.ty = b.y = b.hy; if (b.walker) b.st = 'graze'; } };
      if (i === 'all') { for (const a of all) put(a, a.h0[0], a.h0[1]); return all.length > 0; }
      const h = homesOf(kind)[i]; if (!h || !all.length) return false;
      if (kind === 'elk') { const lead = all[0], dx = h[0] - lead.hx, dy = h[1] - lead.hy; for (const a of all) put(a, a.hx + dx, a.hy + dy); } else put(all[0], h[0], h[1]);
      return true;
    },
    drawHull,
    sea(scr, ox, oy, t) {
      moreWhales();
      const { VW, VH, fb } = scr, xa = Math.max(0, ox), xb = Math.min(ox + VW, SEA.w), ya = Math.max(oy, SEA.y0), yb = Math.min(oy + VH, SEA.y0 + SEA.h);
      if (xa >= xb || ya >= yb) return;
      const shift = Math.floor(t * 46) % 240, far = R.sea[4], nearC = R.sea[5], white = R.white[1], tw = t * 4.6, ebb = ebbAt(t), CS = SEA.cs, sea4 = R.sea[4], sand0 = R.sand[0], sand1 = R.sand[1];
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
          if (k >= 4 && cs < 0) { const f = FILM[j]; fb[i] = cs > -3 || (f & 15) > ((wx * 3 + wy * 5) & 7) ? ((wx + wy) & 1 ? sea4 : sand0) : f & 16 ? sand1 : sand0; if (cs > -4) { const w = up0(wx, wy, tw); if (cs > -w && (cs < -w + 1.3 || ((wx + wy) & 1))) fb[i] = white; } continue; }
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
      // Moon jellies drift slowly in open water beyond the surf (T26), each round its own spot, and are pushed
      // out ahead of a falling tide by the floater rule.
      spots.jelly.forEach(([jx, jy, pale], k) => {
        const at = col.clear('floater', jx + 5 * Math.sin(t * 0.05 + k * 2), jy + 2.5 * Math.sin(t * 0.07 + k), t, 2); if (!at) return;
        const x = Math.round(at[0]) - ox, y = Math.round(at[1] + 1.5 * Math.sin(t * 0.5 + k)) - oy;
        if (x < -4 || y < -6 || x > VW + 4 || y > VH) return;
        const c = pale ? R.white[1] : R.pink[2], d = R.pink[1], shut = frac(t * 0.3 + k * 0.37) < 0.3;
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
      salmon(scr, ox, oy, t);
    },
    // The mist over the forest and the fog bank off the coast, laid over everything that stands. It parts
    // round him as it does round a sign.
    weather(sea, at) { fogSea = sea; fogAt = at; },
    // The debug panel's start buttons (E5f): the humpback breaches now, or rolls and blows now (its first
    // blow after a breach), or the ferry sets out from the west end now.
    trigger(name, t) {
      if (name === 'breach' || name === 'blow') { const n = Math.floor((t + whaleAhead + T0) / SLOT) + (name === 'breach' ? 1 : 0); whaleAhead = n * SLOT + starts(n) + (name === 'blow' ? 16.6 : 0) - t - T0; return true; }
      if (name === 'heron') { if (!herItem || herItem.st !== 'stand') return false; takeOff(herItem, t, null); return true; }
      if (name === 'salmon') { salAhead = (((SAL.first - t) % SAL.slot) + SAL.slot) % SAL.slot; return true; }
      if (name === 'osprey') { ospAhead = (((OSP.first - t) % OSP.slot) + OSP.slot) % OSP.slot; return true; }
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
    areas: () => [...items.filter(a => a.walker || a.critter === 'marmot').map(a => ({ kind: a.critter, x: a.mum ? a.mum.x : a.hx, y: a.mum ? a.mum.y + 5 : a.hy, rx: a.r, ry: a.r * 0.6 })), ...items.filter(a => a.dart).map(a => ({ kind: 'squirrel', x: a.hx, y: a.hy, rx: 28, ry: 17 })), ...FLOCKS.map(F => ({ kind: F.gull ? 'gulls' : 'birds', x: F.cx, y: F.cy, rx: F.rx, ry: F.ry }))],
    // What flies over everything else.
    over(scr, ox, oy, t, env = {}) {
      const { VW, VH, fb } = scr;
      osprey(scr, ox, oy, t);
      for (const F of FLOCKS) for (let k = 0; k < F.n; k++) {
        const an = t * F.w + k * TAU / F.n + 0.5 * Math.sin(t * 0.3 + k * 2), wob = 1 + 0.14 * Math.sin(t * 0.21 + k * 3);
        const x = Math.round(F.cx + Math.cos(an) * F.rx * wob - ox), y = Math.round(F.cy + Math.sin(an) * F.ry * wob - oy);
        if (x < -8 || x > VW + 8 || y < -8 || y - F.lift > VH + 8) continue;
        for (let dx = -2; dx <= 2; dx++) { const sx = x + dx; if (sx >= 0 && sx < VW && y >= 0 && y < VH) fb[y * VW + sx] = SHADE[fb[y * VW + sx]]; }
        // They mostly hold their wings out, and beat them in short bursts.
        const f = F.glide ? (frac(t * 0.23 + k) < 0.12 ? Math.floor(t * 5) & 1 : 1) : frac(t * 0.17 + k * 0.37) < 0.4 ? (Math.floor(t * 3.5) + k) & 1 : 1;
        scr.blit(F.bm[f], x - 3, y - F.lift - 2);
      }
    }
  };
}
