// The animals of the world map and the water that moves: herds that graze and wander, a bear, squirrels
// and chipmunks that dart, marmots that sit up as he passes, birds that circle, a whale, jellyfish, the
// ferry, the mist, and the swells and the wash on the beach. The world scene draws them; so does the block-in page, at time 0.
import { TAU, clamp, smooth, frac, hash, vnoise, rng, R, DAY, DUSK, N, BLACK, INK, SHADE, KIND, BM, outline, thick, pick, veilTable } from './core.js';
import { makeElk, makeBird, makeOwl } from './sprites.js';
import { ell, goat, marmot } from './fauna.js';
import { NW, NH } from './land.js';

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
  const walker = (kind, f, x0, y0, o) => { const [x, y] = settle(o.ok, x0, y0); items.push({ critter: kind, walker: true, f, bm: f.graze, x, y, hx: x, hy: y, st: o.start || 'graze', until: 2 + rand() * 12, flip: rand() < 0.5, tx: x, ty: y, fx: x, fy: y, ...o }); };
  // The herd keeps together: each elk strays only a little from its own place in it.
  spots.elk.forEach(([x, y, d], n) => walker('elk', n === 0 ? elkBull : elkCow, x, y, { faces: -1, r: 22, v: 6, ok: meadow, start: d ? 'graze' : 'look' }));
  spots.goats.forEach(([x, y, kid], n) => walker('goat', goats[kid ? 1 : 0], x, y, { faces: 1, r: kid ? 16 : 30, v: kid ? 10 : 6, ok: clear, start: n & 1 ? 'look' : 'graze', mum: kid ? items[items.length - 1] : null }));
  spots.sheep.forEach(([x, y, d]) => walker('sheep', ram, x, y, { faces: 1, r: 34, v: 6, ok: clear, start: d ? 'graze' : 'look' }));
  // The bear is not always about: it is there on roughly one visit in three. For screenshots, bear=1 or
  // bear=0 in the address settles it.
  const asked = typeof location !== 'undefined' && /[?&]bear=([01])/.exec(location.search);
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
  for (const [x, y, chip] of spots.squirrels) items.push({ critter: 'squirrel', dart: true, f: sq[chip ? 1 : 0], bm: sq[chip ? 1 : 0].sit, x, y, fx: x, fy: y, hx: x, hy: y, tx: x, ty: y, st: 'sit', until: 3 + rand() * 12, flip: rand() < 0.5 });
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
  spots.marmots.forEach(([x, y], n) => items.push({ critter: 'marmot', bm: mar.sun, x, y, n, flip: !!(n & 1) }));

  // ---- the owl in the rainforest: it blinks now and then, and once in a while turns its head ----
  const owlB = { open: makeOwl('open'), blink: makeOwl('blink'), turn: makeOwl('turn') };
  if (spots.owl) items.push({ critter: 'owl', bm: owlB.open, x: spots.owl[0], y: spots.owl[1] });
  // Each pair of eyes in the fog, and how long it has been looked at.
  const eyeState = (spots.eyes || []).map(() => ({ look: 0, until: 0 }));

  // For screenshots, sea=90 in the address starts the ferry's and the whale's clocks that many seconds on.
  const ahead = typeof location !== 'undefined' ? +(/[?&]sea=([\d.]+)/.exec(location.search) || [])[1] || 0 : 0;

  // ---- the whale -------------------------------------------------------------------------------
  // Once in every 40 to 60 seconds it breaches: out, over and down in under three seconds, then the
  // spray comes down and its flukes lift and slide under after it. Twice in between it rolls at the
  // surface and blows. At time 0 it hangs at the top of a breach, for the block-in page.
  const whales = BREACH.map(p => W.make.whale(p)), flukes = [0, 0.33, 0.66, 1].map(f => W.make.whale({ fluke: f }));
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
  function drawWhale(scr, a, ox, oy, t) {
    const T = t + ahead + T0, n = Math.floor(T / SLOT), u = T - n * SLOT - starts(n), wx = a.x - ox, wy = a.y - oy;
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
    // The roll and the blow, at a different spot each time.
    for (const [at, dx, dy] of [[17, -24, 2], [31, 8, -8]]) {
      const v = u - at; if (v <= 0 || v >= 3) continue;
      const bx = wx + dx + 6 - Math.round(v * 4), by = wy + dy, up = Math.round(v < 0.6 ? 5 * (1 - ease(v / 0.6)) : v > 2.2 ? 5 * ease((v - 2.2) / 0.8) : 0);
      for (let j = 0; j < back.h - up; j++) for (let i = 0; i < back.w; i++) { const c = back.d[j * back.w + i]; if (c) scr.set(bx - back.ox + i, by - back.oy + up + j, c); }
      for (let i = -9; i <= 9; i += 2) scr.set(bx + i, by + 1, white);
      if (v > 0.5 && v < 1.6) { const hgt = Math.round(9 * Math.min(1, (v - 0.5) / 0.3)), fade = v > 1.2; for (let j = 0; j < hgt; j++) { if (fade && (j + Math.floor(t * 8)) % 2) continue; const sp = j > hgt - 4 ? Math.round((j - hgt + 4) * 0.8) : 0; scr.set(bx + 5 - sp, by - 5 - j, white); scr.set(bx + 5 + sp, by - 5 - j, white); } }
    }
  }

  // The sea stacks, found among the things that stand in the water, for the white water round their feet.
  const stacks = W.things.filter(th => !th.tree && th.bm && th.bm.h >= 14 && th.x < SEA.w && W.coast(th.x, th.y) > 14).map(th => ({ x: th.x, y: th.y, half: th.bm.w / 2, cs: W.coast(th.x, th.y) }));

  // ---- the ferry -----------------------------------------------------------------------------
  // It sails the length of the water outside the sea stacks, is gone past the edge of the map for the
  // better part of a minute, and comes back the other way. It is drawn with the water, under everything
  // that stands: its course keeps it clear of the stacks and the whale.
  const ferryBM = W.make.ferry(), [FA, FB] = spots.ferry, FLEN = Math.hypot(FB[0] - FA[0], FB[1] - FA[1]);
  const FERRY = { v: 7, away: [38, 50] }, CROSS = FLEN / FERRY.v, ROUND = 2 * CROSS + FERRY.away[0] + FERRY.away[1];
  // How far along its course it is, 0 at the west end and 1 at the south, and which way it is heading;
  // nothing while it is away. At time 0 it is part way across, so the block-in page has it.
  const ferryAt = t => { const u = (t + 0.6 * CROSS) % ROUND, back = u - CROSS - FERRY.away[0]; return u < CROSS ? [u / CROSS, 1] : back >= 0 && back < CROSS ? [1 - back / CROSS, -1] : null; };
  // The course bows out to sea a little in the middle.
  const coursePt = s => { const b = 14 * Math.sin(Math.PI * clamp(s, 0, 1)); return [FA[0] + (FB[0] - FA[0]) * s - 0.56 * b, FA[1] + (FB[1] - FA[1]) * s + 0.83 * b]; };
  function drawFerry(scr, ox, oy, t) {
    const at = ferryAt(t + ahead); if (!at) return;
    const [s, dir] = at, [fx, fy] = coursePt(s), { VW, VH } = scr;
    if (fx - ox < -140 || fx - ox > VW + 140 || fy - oy < -120 || fy - oy > VH + 120) return;
    // Nothing of it shows past the edge of the map, where a wide screen has only a plain fill.
    const dot = (wx, wy, c) => { if (wx >= 0 && wy < NH) scr.set(wx - ox, wy - oy, c); };
    // The wake. Each bit of foam stays where the boat left it and only fades: two lines open out from
    // the bow and break into dashes, and the water churned up astern trails off between them.
    const here = s * FLEN, white = R.white[1];
    for (let n = 0; n < 240; n++) {
      const k = n / 2, c = here + dir * (19 - k), [qx, qy] = coursePt(c / FLEN);   // k: how far astern of the bow's tip
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
    const x0 = Math.round(fx) - ferryBM.ox, y0 = Math.round(fy) - ferryBM.oy;
    for (let j = 0; j < ferryBM.h; j++) for (let i = 0; i < ferryBM.w; i++) { const c = ferryBM.d[j * ferryBM.w + i]; if (c) dot(x0 + i, y0 + j, c); }
  }

  // ---- mist -------------------------------------------------------------------------------------
  // Mist is not painted on. A pixel under it is swapped for the palette colour nearest to itself seen
  // through fog, so the trees still show, only paler, and there is no pattern of dots to see. There are
  // three strengths: light, middle, and a heavy one kept for the small heart of a bank. Where two bits
  // of mist overlap the stronger one counts, they do not add up, so the forest always shows through.
  const M = W.mist, FOG = R.fog, VEIL = veilTable(0.4), VEIL2 = veilTable(0.6), VEIL3 = veilTable(0.76), VEILS = [null, VEIL, VEIL2, VEIL3];
  // The fog bank out at sea is thicker stuff, and over water there is nothing to see through to.
  const SEAVEIL = [veilTable(0.3), veilTable(0.58), veilTable(0.84)];
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
        else if (a.critter === 'owl') a.bm = frac(t / 17) > 0.55 && frac(t / 17) < 0.66 ? owlB.turn : frac(t / 4.3) < 0.035 ? owlB.blink : owlB.open;
        else if (a.critter === 'marmot') a.bm = (here && Math.hypot(here.x - a.x, here.y - a.y) < 64) || frac(t / 11 + a.n * 0.37) < 0.2 ? mar.up : mar.sun;
      }
    },
    draw(scr, a, ox, oy, t) {
      if (a.critter === 'whale') return drawWhale(scr, a, ox, oy, t);
      if (a.walker || a.critter === 'marmot') scr.shadow(a.x - ox, a.y - oy, a.critter === 'marmot' ? 5 : 7, 1);
      scr.put(a.bm, a.x - ox, a.y - oy - (a.hop || 0), a.flip);
    },
    // The water: swells roll in toward the beach, the wash runs up the sand and back, jellyfish pulse.
    sea(scr, ox, oy, t) {
      const { VW, VH, fb } = scr, xa = Math.max(0, ox), xb = Math.min(ox + VW, SEA.w), ya = Math.max(oy, SEA.y0), yb = Math.min(oy + VH, SEA.y0 + SEA.h);
      if (xa >= xb || ya >= yb) return;
      const shift = Math.floor(t * 46) % 240, far = R.sea[4], nearC = R.sea[5], white = R.white[1], tw = t * 4.6;
      for (let wy = ya; wy < yb; wy++) {
        let j = (wy - SEA.y0) * SEA.w + xa, i = (wy - oy) * VW + (xa - ox);
        for (let wx = xa; wx < xb; wx++, j++, i++) {
          const gt = SEA.gate[j];
          if (gt) { let p = SEA.ph[j] + shift; if (p >= 240) p -= 240; if (p < 22) fb[i] = gt === 2 ? nearC : far; continue; }
          const s = SEA.shore[j]; if (!s) continue;
          // A swell that reaches the beach runs up it and drains back, so the wash keeps time with the waves.
          const cs = (s - 1) / 8 - 4, u = frac((7 * Math.sin(wx / 37 + wy / 61) + tw) / 24), surge = u < 0.2 ? u / 0.2 : 1 - (u - 0.2) / 0.8;
          const lace = 1.4 * Math.sin(wx / 7 + wy / 9), up = 0.4 + 3.2 * surge + lace * 0.5, out = 1.6 + 2.4 * surge + lace;
          if (cs > -up && cs < out && (cs < -up + 1.3 || cs > out - 1.2 || ((wx + wy) & 1))) fb[i] = white;
        }
      }
      // White water round the foot of each sea stack: it swells out as a wave passes the rock and draws back in.
      for (const s of stacks) {
        const x = s.x - ox, y = s.y + 1 - oy; if (x < -30 || x > VW + 30 || y < -8 || y > VH + 8) continue;
        const u = frac((s.cs + 7 * Math.sin(s.x / 37 + s.y / 61) + tw) / 24), surge = u < 0.2 ? u / 0.2 : 1 - (u - 0.2) / 0.8;
        const rx = s.half + 0.5 + 1.6 * surge, ry = 1.5 + 1.3 * surge, n = Math.round(rx * 5);
        for (let k = 0; k < n; k++) {
          const an = k / n * TAU, sy = Math.sin(an); if (sy < -0.3 || hash(k, s.x, 75) < 0.3 - 0.3 * surge) continue;   // the far side is behind the rock
          scr.set(Math.round(x + Math.cos(an) * rx), Math.round(y + sy * ry), surge > 0.3 || k % 3 ? white : nearC);
        }
      }
      drawFerry(scr, ox, oy, t);
      spots.jelly.forEach(([jx, jy, pale], k) => {
        const x = jx + Math.round(3 * Math.sin(t * 0.13 + k * 2)) - ox, y = jy + Math.round(1.5 * Math.sin(t * 0.5 + k)) - oy;
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
    },
    // The mist over the forest and the fog bank off the coast, laid over everything that stands. It parts
    // round him as it does round a sign.
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
          const far = M.shore[w.y], x = Math.round(far - 270 + (w.at + w.v * t) % 250), k = smooth(80, 150, far - x) * smooth(far - 270, far - 235, x);
          if (k < 0.03 || x - w.len > ox + VW || x + w.len < ox) continue;
          for (const r of w.rows) { const s = clamp((k - r.need) / 0.3, 0, 1), y = sy + r.dy; if (s > 0 && y >= 0 && y < VH) veilRow(scr, x + Math.round(r.a * s) - ox, x + Math.round(r.b * s) - ox, y, r.edge); }
          continue;
        }
        // The whole round trip starts inside the standing fog in the west, where it cannot be told from
        // the fog. It is thickest as it comes out and gone before the forest ends.
        const at = Math.round((w.at + w.v * t) % w.span) - 200, x = M.edge[w.y] + at + w.dx - ox;
        const k = (w.bank ? smooth(290, 60, at) : smooth(400, 10, at)) * smooth(-200, -150, at);
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
        const wy = y + oy, row = y * VW, xs = [], sh = M.shore[wy]; if (wy >= NH || sh < 200) continue;
        for (let j = 0; j < 4; j++) { const e = 9 * Math.sin(wy / 15 + t * 0.045 + j * 1.3) + 14 * (vnoise(wy / 1.6, j * 7 + Math.floor(t * 0.05), 134) - 0.5) + 12 * Math.abs(Math.sin(wy / 27 + t * 0.025 + j)); xs.push(Math.min(VW, Math.round(sh - [200, 235, 270, 310][j] - e * 1.2) - ox)); }
        for (let j = 2; j >= 0; j--) if (xs[j] < xs[j + 1]) xs[j] = xs[j + 1];
        const x0 = Math.max(0, -ox); if (xs[0] <= x0) continue;
        const lit = vnoise(wy / 2.6, Math.floor(t * 0.02), 133) > 0.56 ? FOG[2] : FOG[1];
        for (let x = x0; x < xs[0]; x++) { const i = row + x; fb[i] = x < xs[3] ? lit : SEAVEIL[x < xs[2] ? 2 : x < xs[1] ? 1 : 0][fb[i]]; }
      }
    },
    // Where each animal may wander and each flock circles, as ovals on the map, for the debug panel.
    areas: () => [...items.filter(a => a.walker).map(a => ({ x: a.mum ? a.mum.x : a.hx, y: a.mum ? a.mum.y + 5 : a.hy, rx: a.r, ry: a.r * 0.6 })), ...FLOCKS.map(F => ({ x: F.cx, y: F.cy, rx: F.rx, ry: F.ry }))],
    // What flies over everything else.
    over(scr, ox, oy, t, env = {}) {
      const { VW, VH, fb } = scr, dusk = (env.mix || 0) > 0.5;
      // The faint light deep in the fog: it wanders slowly round its spot, brightens and fades, and is
      // gone for a while before it comes back.
      if (spots.wisp) {
        const c = frac(t / 31 + 0.3), k = smooth(0, 0.15, c) * smooth(0.62, 0.48, c);
        const x = Math.round(spots.wisp[0] + 34 * Math.sin(t * 0.07) + 8 * Math.sin(t * 0.23) - ox), y = Math.round(spots.wisp[1] - 6 + 5 * Math.sin(t * 0.11) + 2 * Math.sin(t * 0.37) - oy);
        if (k > 0.05 && x > 1 && y > 1 && x < VW - 2 && y < VH - 2) {
          const core = dusk ? R.star[2] : R.glow[0], halo = dusk ? R.star[1] : R.fog[2];
          scr.set(x, y, k > 0.35 ? core : halo);
          if (k > 0.55) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if ((dx + dy + Math.floor(t * 3)) & 1 || k > 0.8) scr.set(x + dx, y + dy, halo);
        }
      }
      // At Dusk, pairs of eyes far back in the fog. They blink, and a pair that is looked at for long
      // (the pointer resting near it, or with no pointer, sitting in the middle of the screen) blinks out
      // and stays gone for a while.
      if (dusk) (spots.eyes || []).forEach(([ex, ey], k) => {
        const st = eyeState[k], x = ex - ox, y = ey - 4 - oy; if (x < 2 || y < 1 || x >= VW - 3 || y >= VH - 1) return;
        const p = env.ptr, near = p ? Math.hypot(p[0] - x, p[1] - y) < 40 : Math.abs(x - VW / 2) < VW * 0.18 && Math.abs(y - VH / 2) < VH * 0.18;
        st.look = near ? st.look + (env.dt || 0) : Math.max(0, st.look - (env.dt || 0));
        if (st.look > 1.6) { st.until = t + 25; st.look = 0; }
        if (t < st.until || frac(t / (4 + k * 1.3) + k * 0.31) < 0.05) return;
        scr.set(x, y, R.aurora[2]); scr.set(x + 2, y, R.aurora[2]);
      });
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
