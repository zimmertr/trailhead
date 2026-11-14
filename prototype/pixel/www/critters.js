// The animals of the world map and the water that moves: herds that graze and wander, a bear, squirrels
// and chipmunks that dart, marmots that sit up as he passes, birds that circle, a whale, jellyfish, and
// the swells and the wash on the beach. The world scene draws them; so does the block-in page, at time 0.
import { TAU, clamp, frac, hash, rng, R, INK, SHADE, KIND, BM, outline, thick, pick } from './core.js';
import { makeElk, makeBird } from './sprites.js';
import { ell, goat, marmot } from './fauna.js';
import { NW, NH } from './terrain.js';

// A black bear on all fours, facing right. pose: 'look', 'sniff' with its nose in the grass.
function mapBear(pose, step = 0) {
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

export function makeCritters(W) {
  const { spots, sea: SEA, g } = W, items = [];
  // Where the trees stand, so a wandering animal goes round them.
  const CELL = 8, GW = Math.ceil(NW / CELL), wood = new Uint8Array(GW * Math.ceil(NH / CELL));
  for (const th of W.things) if (th.tree) wood[Math.floor(th.y / CELL) * GW + Math.floor(th.x / CELL)] = 1;
  const kindAt = (x, y) => KIND[g[Math.round(y) * NW + Math.round(x)]];
  const clear = (x, y) => x > 8 && y > 8 && x < NW - 8 && y < NH - 4 && W.open(x, y) && !wood[Math.floor(y / CELL) * GW + Math.floor(x / CELL)] && !wood[Math.floor((y - 5) / CELL) * GW + Math.floor(x / CELL)];
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
  const walker = (kind, f, x, y, o) => items.push({ critter: kind, walker: true, f, bm: f.graze, x, y, hx: x, hy: y, st: o.start || 'graze', until: 1 + rand() * 9, flip: rand() < 0.5, tx: x, ty: y, fx: x, fy: y, ...o });
  spots.elk.forEach(([x, y, d], n) => walker('elk', n % 3 === 0 ? elkBull : elkCow, x, y, { faces: -1, r: 44, v: 7, ok: meadow, start: d ? 'graze' : 'look' }));
  spots.goats.forEach(([x, y, kid], n) => walker('goat', goats[kid ? 1 : 0], x, y, { faces: 1, r: kid ? 16 : 30, v: kid ? 10 : 6, ok: clear, start: n & 1 ? 'look' : 'graze', mum: kid ? items[items.length - 1] : null }));
  spots.sheep.forEach(([x, y, d]) => walker('sheep', ram, x, y, { faces: 1, r: 34, v: 6, ok: clear, start: d ? 'graze' : 'look' }));
  walker('bear', bearF, spots.bear[0], spots.bear[1], { faces: 1, r: 90, v: 8, ok: meadow, roam: 0.6 });

  function walk(a, dt, t) {
    if (a.st === 'walk') {
      const dx = a.tx - a.fx, dy = a.ty - a.fy, d = Math.hypot(dx, dy);
      if (d < 0.6) { a.st = 'graze'; a.until = t + 3 + rand() * 7; }
      else { const s = Math.min(d, a.v * dt); a.fx += dx / d * s; a.fy += dy / d * s * 0.7; if (Math.abs(dx) > 0.5) a.flip = (dx > 0 ? 1 : -1) !== a.faces; }
      a.x = Math.round(a.fx); a.y = Math.round(a.fy);
      a.bm = a.f.walk[Math.floor(t * 4.5 + a.hx) & 1];
      if (Math.abs(a.ty - a.fy) < 0.6 && Math.abs(dx) < 0.6) { a.st = 'graze'; a.until = t + 3 + rand() * 7; }
      return;
    }
    a.bm = a.st === 'graze' ? a.f.graze : a.f.stand && frac(t * 0.11 + a.hx * 0.37) < 0.5 ? a.f.stand : a.f.look;
    if (t < a.until) return;
    const roll = rand();
    if (roll < (a.roam || 0.34)) {
      // A kid keeps near its mother; everyone else keeps near home.
      const cx = a.mum ? a.mum.x : a.hx, cy = a.mum ? a.mum.y + 5 : a.hy;
      for (let k = 0; k < 6; k++) {
        const an = rand() * TAU, rr = a.r * (0.35 + 0.65 * rand()), tx = cx + Math.cos(an) * rr, ty = cy + Math.sin(an) * rr * 0.6;
        if (a.ok(tx, ty) && way(a.ok, a.fx, a.fy, tx, ty)) { a.tx = tx; a.ty = ty; a.st = 'walk'; return; }
      }
    }
    a.st = roll < 0.72 ? 'graze' : 'look'; a.until = t + (a.st === 'look' ? 1.5 + rand() * 3 : 3 + rand() * 8);
    if (a.st === 'look' && rand() < 0.3) a.flip = !a.flip;
  }

  // ---- squirrels and chipmunks: sit, then dart ----------------------------------------------
  const sq = [0, 1].map(chip => ({ sit: W.make.squirrel(!!chip), run: W.make.squirrel(!!chip, true) }));
  for (const [x, y, chip] of spots.squirrels) items.push({ critter: 'squirrel', dart: true, f: sq[chip ? 1 : 0], bm: sq[0].sit, x, y, fx: x, fy: y, hx: x, hy: y, tx: x, ty: y, st: 'sit', until: rand() * 5, flip: rand() < 0.5 });
  function dart(a, dt, t, here) {
    if (a.st === 'run') {
      const dx = a.tx - a.fx, dy = a.ty - a.fy, d = Math.hypot(dx, dy);
      if (d < 1) { a.st = 'sit'; a.until = t + 0.6 + rand() * 4.5; a.bm = a.f.sit; return; }
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
    a.until = t + 1;
  }

  // ---- marmots: sunning on a rock, up on their haunches when he is near or now and then ----
  const mar = { sun: marmot('sun'), up: marmot('up') };
  spots.marmots.forEach(([x, y], n) => items.push({ critter: 'marmot', bm: mar.sun, x, y, n, flip: !!(n & 1) }));

  // ---- the whale -------------------------------------------------------------------------------
  // Every sixteen seconds it comes two thirds out of the water, hangs, and falls back in a ring of
  // spray. Half way between it rolls at the surface and blows.
  const whaleBM = W.make.whale(false), WHALE = 16;
  const back = (() => { const b = new BM(20, 6); b.ox = 10; b.oy = 5; ell(b, 10, 6, 8.5, 4.2, (nx, ny) => R.navy[ny < -0.55 ? 2 : 1]); b.set(13, 1, R.navy[0]); b.set(14, 1, R.navy[0]); outline(b, INK); return b; })();
  items.push({ critter: 'whale', bm: whaleBM, x: spots.whale[0], y: spots.whale[1] });
  function drawWhale(scr, a, ox, oy, t) {
    const u = (t + 0.62) % WHALE, wx = a.x - ox, wy = a.y - oy;
    const ease = v => v * v * (3 - 2 * v);
    if (u < 1.5) {
      const sink = Math.round(u < 0.5 ? 44 * (1 - ease(u / 0.5)) : u < 0.85 ? 0 : 46 * ease((u - 0.85) / 0.65));
      const sx = wx - whaleBM.ox - Math.round(sink * 0.8), sy = wy - whaleBM.oy + sink;
      for (let j = 0; j < whaleBM.h && j + sink <= whaleBM.oy; j++) for (let i = 0; i < whaleBM.w; i++) { const c = whaleBM.d[j * whaleBM.w + i]; if (c) scr.set(sx + i, sy + j, c); }
    }
    // Spray: thrown up as it comes out, and a bigger sheet as it lands.
    for (let k = 0; k < 26; k++) {
      const late = k >= 10, age = u - (late ? 1.15 : 0.08) - hash(k, 1, 61) * 0.2; if (age < 0 || age > 1.3) continue;
      const vx = (hash(k, 2, 61) - 0.5) * (late ? 44 : 26), vy = (late ? 30 : 22) + hash(k, 3, 61) * 24;
      const px = Math.round(wx - 4 + vx * age), py = Math.round(wy - vy * age + 46 * age * age);
      if (py > wy + 2) continue;
      scr.set(px, py, R.white[1]); if (hash(k, 4, 61) < 0.5) scr.set(px + 1, py, R.white[1]); scr.set(px, py + 1, R.sea[5]);
    }
    // The ring of foam it leaves, spreading and breaking up.
    for (const [from, len, cx] of [[0.1, 1.6, -5], [1.2, 3.4, -3]]) {
      const age = u - from; if (age < 0 || age > len) continue;
      const rx = 7 + 9 * age, ry = 2.2 + 2.4 * age, thin = age / len;
      for (let k = 0; k < 64; k++) { if (hash(k, Math.floor(t * 3), 62) < thin) continue; const an = k / 64 * TAU; scr.set(Math.round(wx + cx + Math.cos(an) * rx), Math.round(wy + Math.sin(an) * ry), k % 5 ? R.white[1] : R.sea[5]); }
    }
    // The roll and the blow.
    const v = u - 8.5;
    if (v > 0 && v < 3) {
      const bx = wx + 8 - Math.round(v * 4), by = wy + 20, up = Math.round(v < 0.6 ? 5 * (1 - ease(v / 0.6)) : v > 2.2 ? 5 * ease((v - 2.2) / 0.8) : 0);
      for (let j = 0; j < back.h - up; j++) for (let i = 0; i < back.w; i++) { const c = back.d[j * back.w + i]; if (c) scr.set(bx - back.ox + i, by - back.oy + up + j, c); }
      for (let i = -9; i <= 9; i += 2) scr.set(bx + i, by + 1, R.white[1]);
      if (v > 0.5 && v < 1.6) { const hgt = Math.round(9 * Math.min(1, (v - 0.5) / 0.3)), fade = v > 1.2; for (let j = 0; j < hgt; j++) { if (fade && (j + Math.floor(t * 8)) % 2) continue; const sp = j > hgt - 4 ? Math.round((j - hgt + 4) * 0.8) : 0; scr.set(bx + 5 - sp, by - 5 - j, R.white[1]); scr.set(bx + 5 + sp, by - 5 - j, R.white[1]); } }
    }
  }

  // ---- birds that circle, each with its shadow on the ground --------------------------------
  const ink = [makeBird(0), makeBird(1)], gull = ink.map(b => tint(b, R.white[1]));
  const FLOCKS = [
    { cx: 800, cy: 900, rx: 130, ry: 44, n: 4, lift: 56, w: 0.2, bm: ink },
    { cx: 1490, cy: 770, rx: 90, ry: 36, n: 1, lift: 84, w: 0.11, bm: ink, glide: true },
    { cx: 1260, cy: 600, rx: 70, ry: 26, n: 1, lift: 70, w: -0.13, bm: ink, glide: true },
    { cx: 210, cy: 905, rx: 80, ry: 30, n: 3, lift: 34, w: -0.24, bm: gull },
    { cx: 70, cy: 930, rx: 34, ry: 14, n: 2, lift: 22, w: 0.4, bm: gull }
  ];

  return {
    items,
    update(dt, t, here) {
      for (const a of items) {
        if (a.walker) walk(a, dt, t);
        else if (a.dart) dart(a, dt, t, here);
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
      spots.jelly.forEach(([jx, jy, pale], k) => {
        const x = jx + Math.round(3 * Math.sin(t * 0.13 + k * 2)) - ox, y = jy + Math.round(1.5 * Math.sin(t * 0.5 + k)) - oy;
        if (x < -4 || y < -6 || x > VW + 4 || y > VH) return;
        const c = pale ? R.white[1] : R.pink[2], d = R.pink[1], shut = frac(t * 0.45 + k * 0.37) < 0.3;
        for (let dx = 0; dx < 3; dx++) scr.set(x + dx, y, c);
        if (shut) { for (let dx = 0; dx < 3; dx++) scr.set(x + dx, y + 1, dx === 1 ? c : d); for (const [dx, dy] of [[0, 2], [2, 2], [0, 3], [2, 3], [1, 4], [1, 5]]) scr.set(x + dx, y + dy, d); }
        else { for (let dx = -1; dx < 4; dx++) scr.set(x + dx, y + 1, dx === 0 ? c : d); for (const [dx, dy] of [[-1, 2], [1, 3], [3, 2], [0, 4], [2, 4]]) scr.set(x + dx, y + dy, d); }
      });
    },
    // What flies over everything else.
    over(scr, ox, oy, t) {
      const { VW, VH, fb } = scr;
      for (const F of FLOCKS) for (let k = 0; k < F.n; k++) {
        const an = t * F.w + k * TAU / F.n + 0.5 * Math.sin(t * 0.3 + k * 2), wob = 1 + 0.14 * Math.sin(t * 0.21 + k * 3);
        const x = Math.round(F.cx + Math.cos(an) * F.rx * wob - ox), y = Math.round(F.cy + Math.sin(an) * F.ry * wob - oy);
        if (x < -8 || x > VW + 8 || y < -8 || y - F.lift > VH + 8) continue;
        for (let dx = -2; dx <= 2; dx++) { const sx = x + dx; if (sx >= 0 && sx < VW && y >= 0 && y < VH) fb[y * VW + sx] = SHADE[fb[y * VW + sx]]; }
        const f = F.glide ? (frac(t * 0.23 + k) < 0.12 ? Math.floor(t * 5) & 1 : 1) : (Math.floor(t * 4.5) + k) & 1;
        scr.blit(F.bm[f], x - 3, y - F.lift - 2);
      }
    }
  };
}
