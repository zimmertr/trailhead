// Doot Doot (a long-haired tortie) and Peevers (a long-haired Nebelung) live at the Trailhead.
// Each has a small mind of her own: she picks something to do, does it for a while, and picks
// again, so no two visits look the same. Clicking a cat gets an answer that depends on the cat
// and on what she was doing.
import { clamp, lerp, rng, hash, vnoise, R, INK, BM, outline, thick } from './core.js';

const ell = (b, cx, cy, rx, ry, fn) => { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const nx = (x - cx) / rx, ny = (y - cy) / ry; if (nx * nx + ny * ny <= 1) { const c = fn(nx, ny, x, y); if (c) b.set(x, y, c); } } };

// One cat in one pose, facing right. Tail first, then far legs, body, near legs, ruff and head.
// The poses are laid out on a 28 by 21 grid and drawn a little smaller than that (K), with the
// head left nearly full size, which is what makes a small sprite read as a cat.
const K = 0.84, kx = x => 14 + (x - 14) * K, ky = y => 18 + (y - 18) * K;
function build(name, src) {
  const b = new BM(28, 21); b.ox = 14; b.oy = 18;
  const pt = q => q.map((v, i) => i < 2 ? (i ? ky(v) : kx(v)) : i < 4 ? v * K : v), line = q => [kx(q[0]), ky(q[1]), kx(q[2]), ky(q[3])];
  const o = { ...src, body: src.body.map(pt), tail: src.tail && src.tail.map(q => [kx(q[0]), ky(q[1])]), far: (src.far || []).map(line), near: (src.near || []).map(line), head: src.head && [kx(src.head[0]), ky(src.head[1]) + 0.4] };
  const r = R[name], [bx, by] = o.body[0];
  const col = (v, x, y) => {
    x -= bx; y -= by;
    if (name === 'tortie') { const n = vnoise(x / 2.1 + 20, y / 2.1 + 20, 3); return n > 0.7 ? r[3] : n > 0.57 ? r[2] : r[v > 0.62 ? 1 : 0]; }
    return r[clamp(Math.round(v * 3 + (hash(x + 40, y + 40, 12) - 0.5) * 0.9), 0, 3)];
  };
  const E = (cx, cy, rx, ry, lit = 0.6) => ell(b, cx, cy, rx, ry, (nx, ny, x, y) => col(lit - ny * 0.3 - nx * 0.08, x, y));
  // A plumed tail: thin at the root, full toward the tip.
  const tail = () => { const p = o.tail; if (!p) return; for (let i = 0; i < p.length - 1; i++) for (let k = 0; k <= 6; k++) { const u = (i + k / 6) / (p.length - 1), x = lerp(p[i][0], p[i + 1][0], k / 6), y = lerp(p[i][1], p[i + 1][1], k / 6), rad = 0.7 + 1.0 * Math.sin(Math.min(1, u * 1.1) * Math.PI * 0.78); E(x, y, rad, rad, 0.5); } };
  if (!o.tailFront) tail();
  for (const [x0, y0, x1, y1] of o.far || []) thick(b, x0, y0, x1, y1, 1, col(0.2, x0, y0));
  for (const [cx, cy, rx, ry, lit] of o.body) E(cx, cy, rx, ry, lit);
  for (const [x0, y0, x1, y1] of o.near || []) thick(b, x0, y0, x1, y1, 1.4, t => col(0.62 - t * 0.2, Math.round(lerp(x0, x1, t)), Math.round(lerp(y0, y1, t))));
  if (o.tailFront) tail();
  if (o.head) {
    const [hx, hy] = o.head, front = o.face === 'front';
    if (o.ruff !== false) E(hx - (front ? 0 : 1.2), hy + 2.5, 2.3, 1.7, 0.9);
    E(hx, hy, 2.9, 2.4, 0.72);
    const ear = o.ears === 'back' ? 0 : 1, dark = name === 'tortie' ? r[0] : r[1], lite = name === 'tortie' ? r[2] : r[2];
    b.set(hx - 2, hy - 3, dark); b.set(hx - 3, hy - 3 + (1 - ear), dark); b.set(hx + 2, hy - 3, lite); b.set(hx + 1, hy - 3, lite);
    if (ear) { b.set(hx - 2.6, hy - 4, dark); b.set(hx + 2, hy - 4, lite); }
    const eye = name === 'tortie' ? R.yellow[1] : R.kit[2];
    if (front) { for (const dx of [-1.4, 1.4]) b.set(hx + dx, hy - 0.4, o.eyes === 'shut' ? r[0] : eye); b.set(hx, hy + 0.9, o.mouth ? R.pink[1] : R.pink[0]); if (o.mouth) b.set(hx, hy + 1.8, R.red[0]); }
    else { b.set(hx + 1.2, hy - 0.5, o.eyes === 'shut' ? r[0] : eye); b.set(hx + 2.8, hy + 0.5, R.pink[1]); if (name === 'tortie') b.set(hx + 2, hy + 1.3, r[3]); else b.set(hx + 2, hy + 1.3, r[3]); }
  }
  outline(b, name === 'nebel' ? (x, y) => (hash(x, y, 13) < 0.22 ? R.nebel[0] : INK) : INK);
  return b;
}

const SIT = { body: [[11.5, 14.4, 3.7, 3.7], [13.6, 12.2, 2.7, 3.3]], near: [[15.4, 13.5, 15.4, 17.6]], head: [14.6, 7.6] };
const WALK = f => ({
  body: [[13, 12.4, 6.2, 3]], head: [20.2, 9.4], tail: [[7.5, 12], [5.4, 9], [4.8, 6], [6 + (f & 1), 3.6]],
  far: [[16 + [-1, 0, 1, 0][f], 14, 16 + [-2, 0, 2, 0][f], 17.6], [10 + [1, 0, -1, 0][f], 14, 10 + [2, 0, -2, 0][f], 17.6]],
  near: [[17.4 + [1, 0, -1, 0][f], 14, 17.4 + [2, 0, -2, 0][f], f === 1 ? 16.8 : 17.6], [8.6 + [-1, 0, 1, 0][f], 14, 8.6 + [-2, 0, 2, 0][f], f === 3 ? 16.8 : 17.6]]
});
const POSES = {
  sit0: { ...SIT, tail: [[9, 17], [6, 17.6], [4, 16.2], [4.4, 14]] },
  sit1: { ...SIT, tail: [[9, 17], [6, 17.6], [3.4, 16.8], [2.6, 14.8]] },
  blink: { ...SIT, tail: [[9, 17], [6, 17.6], [4, 16.2], [4.4, 14]], eyes: 'shut' },
  look: { ...SIT, head: [14.2, 7.2], face: 'front', tail: [[9, 17], [6, 17.6], [4, 16.2], [4.4, 14]] },
  meow: { ...SIT, head: [14.2, 6.8], face: 'front', mouth: true, tail: [[9, 17], [6, 17.6], [3.4, 16.8], [2.6, 14.4]] },
  groom0: { ...SIT, head: [14.4, 9.6], eyes: 'shut', near: [[15.4, 14, 16.6, 10.6]], tail: [[9, 17], [6, 17.6], [4, 16.2], [4.4, 14]] },
  groom1: { ...SIT, head: [14.8, 10.4], eyes: 'shut', near: [[15.4, 14, 17, 11.6]], tail: [[9, 17], [6, 17.6], [4, 16.2], [4.4, 14]] },
  bat0: { ...SIT, near: [[15.4, 13, 19, 9.4]], tail: [[9, 17], [6, 17.6], [3.4, 16.8], [2.6, 14.8]] },
  bat1: { ...SIT, near: [[15.4, 13, 20, 12]], tail: [[9, 17], [6, 17.6], [4, 16.2], [4.4, 14]] },
  loaf: { body: [[12.6, 15, 6.2, 3.2]], head: [18.4, 12.2], tail: [[7.6, 17], [5.6, 17.6], [4.6, 16.6]] },
  loafBlink: { body: [[12.6, 15, 6.2, 3.2]], head: [18.4, 12.2], eyes: 'shut', tail: [[7.6, 17], [5.6, 17.6], [4.6, 16.6]] },
  sleep0: { body: [[12.6, 15.2, 5.8, 3]], head: [17.4, 14.6], eyes: 'shut', ruff: false, tail: [[7.6, 16], [9.6, 18], [14.6, 18.2], [18.4, 17.4]], tailFront: true },
  sleep1: { body: [[12.6, 14.8, 5.8, 3.4]], head: [17.4, 14.6], eyes: 'shut', ruff: false, tail: [[7.6, 16], [9.6, 18], [14.6, 18.2], [18.4, 17.4]], tailFront: true },
  walk0: WALK(0), walk1: WALK(1), walk2: WALK(2), walk3: WALK(3),
  run0: { body: [[13, 12.4, 7, 2.6]], head: [21.6, 10], ruff: false, ears: 'back', tail: [[7, 12], [3.4, 11], [1.4, 11.6]], far: [[17, 13, 20, 15.4], [9, 13, 6, 15.4]], near: [[18, 13, 22.4, 16], [8, 13, 3.8, 16]] },
  run1: { body: [[13, 11.8, 5.4, 3.2]], head: [19.6, 9.6], ruff: false, ears: 'back', tail: [[8, 11], [5, 9], [3, 7.6]], far: [[15, 14, 13.4, 17], [11, 14, 12.6, 17]], near: [[16, 14, 14, 17.6], [10, 14, 13, 17.6]] },
  crouch0: { body: [[12, 15.2, 6.2, 2.6]], head: [19.2, 14], ruff: false, tail: [[6, 16], [3, 17], [1, 16.6]], near: [[16.4, 16, 17.6, 17.8], [8.4, 16, 8.4, 17.8]] },
  crouch1: { body: [[12.6, 15.2, 5.8, 2.6], [8.6, 13.8, 3, 2.6]], head: [19.2, 14.2], ruff: false, tail: [[6, 15], [3, 15.6], [1, 14]], near: [[16.4, 16, 17.6, 17.8], [8.4, 16, 8.4, 17.8]] },
  pounce: { body: [[13, 12.6, 6.6, 2.6]], head: [21, 11], ruff: false, ears: 'back', tail: [[7, 12], [4, 10.4], [2, 10.2]], near: [[18.6, 13, 23, 16.4], [8, 13, 4, 15.4]] },
  roll0: { body: [[13, 15.4, 5.8, 2.8, 0.85]], head: [19.2, 15.2], ruff: false, eyes: 'shut', tail: [[8, 17], [4, 17.6], [2, 16.4]], near: [[15, 13.6, 16, 10.4], [11, 13.6, 10, 10.4]] },
  roll1: { body: [[13, 15.4, 5.8, 2.8, 0.85]], head: [19.2, 15.2], ruff: false, tail: [[8, 17], [4, 17.6], [2.4, 15.4]], near: [[15, 13.6, 17.4, 10.8], [11, 13.6, 11.6, 10.2]] },
  stretch: { body: [[10, 12.2, 3.6, 3.2], [15, 14.4, 4.6, 2.4]], head: [20.6, 15], ruff: false, eyes: 'shut', tail: [[7, 10], [5, 7], [6, 4.6]], near: [[17, 16.4, 23, 17.6], [9, 14, 9, 17.6]] }
};

const NAMES = { tortie: 'Doot Doot', nebel: 'Peevers' };
export const sheet = () => ['tortie', 'nebel'].flatMap(n => Object.keys(POSES).map(p => build(n, POSES[p])));

// How long each thing takes (shortest, longest), and how likely each cat is to pick it.
const DO = {
  sit: [3, 7, 3, 3], groom: [3, 5.5, 2, 2], loaf: [6, 12, 2, 3], sleep: [10, 20, 1.2, 2], wander: [0, 0, 3, 3], stalk: [0, 0, 2.2, 1.4],
  roll: [2.4, 3.4, 1.4, 0.6], bat: [2, 3.2, 1.6, 1], chase: [0, 0, 1.2, 0.8], visit: [0, 0, 1, 1.6], perch: [8, 14, 1.2, 0]
};
// Where they roam: the meadow east of the junction, clear of the trees. On an upright phone the
// panels cover the lower half, so they keep to the part above the junction.
const HOME = { x0: 576, x1: 642, y0: 438, y1: 520 }, ROOF = { x: 612, y: 498, h: 25 };

export function makeCats() {
  const S = {}; for (const n of ['tortie', 'nebel']) { S[n] = {}; for (const p in POSES) S[n][p] = build(n, POSES[p]); }
  const rand = rng((Date.now() >>> 0) % 100000 + 7);
  const cats = [
    { id: 'tortie', x: 598, y: 480, flip: false, st: 'sit', t0: 0, dur: 3, k: 0 },
    { id: 'nebel', x: 628, y: 486, flip: true, st: 'loaf', t0: 0, dur: 5, k: 1 }
  ];
  const fx = [];   // hearts, notes and Zs that float up from a cat
  let fly = null, wasHome = true, greeted = -99, lastT = 0, narrow = false;
  const other = c => cats[1 - c.k];
  const spot = () => { for (let n = 0; n < 8; n++) { const x = lerp(HOME.x0, HOME.x1, rand()), y = lerp(HOME.y0, narrow ? 462 : HOME.y1, rand()); if (!(Math.abs(x - ROOF.x) < 24 && y > 474 && y < 502)) return { x, y }; } return { x: 590, y: 450 }; };
  const go = (c, st, t, extra = {}) => { Object.assign(c, { st, t0: t, dur: DO[st] ? lerp(DO[st][0], DO[st][1], rand()) : 1, then: null, after: null, fast: false, busy: false }, extra); };
  const moveTo = (c, tx, ty, speed, dt) => { const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy), s = speed * dt; if (Math.abs(dx) > 0.5) c.flip = dx < 0; if (d <= s) { c.x = tx; c.y = ty; return true; } c.x += dx / d * s; c.y += dy / d * s; c.dist = (c.dist || 0) + s; return false; };
  function choose(c, t) {
    const o = other(c), opts = Object.keys(DO).filter(k => !(k === 'perch' && (c.id !== 'tortie' || narrow)) && !(k === 'chase' && (o.busy || o.st === 'sleep' || o.st === 'perch')) && k !== c.last);
    let sum = 0; for (const k of opts) sum += DO[k][2 + c.k];
    let pick = rand() * sum, st = opts[0]; for (const k of opts) { pick -= DO[k][2 + c.k]; if (pick <= 0) { st = k; break; } }
    c.last = st;
    if (st === 'wander') go(c, 'wander', t, { to: spot() });
    else if (st === 'visit') go(c, 'wander', t, { to: { x: clamp(o.x + (o.x > c.x ? -13 : 13), HOME.x0, HOME.x1), y: o.y + 1 }, then: 'boop' });
    else if (st === 'stalk') { const to = spot(); fly = { x: to.x, y: to.y - 5, by: c.id, t0: t, gone: 0 }; go(c, 'stalk', t, { to, ph: 'creep' }); }
    else if (st === 'chase') { const to = spot(); go(c, 'dash', t, { to }); if (!o.busy) go(o, 'dash', t + 0.35, { to: { x: clamp(to.x + (rand() < 0.5 ? -14 : 14), HOME.x0, HOME.x1), y: to.y + 2 }, after: 'roll' }); }
    else if (st === 'perch') go(c, 'wander', t, { to: { x: ROOF.x - 16, y: ROOF.y + 3 }, then: 'jumpUp' });
    else go(c, st, t);
  }
  const say = (c, kind, t) => fx.push({ kind, x: c.x + (c.flip ? -4 : 4), y: c.y - 14 - (c.lift || 0), t0: t });

  return {
    // The scene calls this once a frame; me is where he is on the map.
    update(env, me, upright) {
      if (upright && !narrow) for (const c of cats) if (c.y > 462 && c.st !== 'jump') { c.y = 446 + c.k * 8; c.lift = 0; if (c.st === 'perch') go(c, 'sit', env.t); }
      narrow = !!upright;
      const t = env.t, dt = Math.min(0.05, Math.max(0, t - lastT)); lastT = t;
      const near = Math.hypot(me.x - 560, me.y - 470) < 6;
      // He is back at the junction: whoever is free trots over to say hello.
      if (near && !wasHome && env.home && t - greeted > 20) { greeted = t; const c = cats.find(q => q.st !== 'perch' && q.st !== 'sleep') || cats[1]; go(c, 'wander', t, { to: { x: me.x + 12, y: me.y + (narrow ? -3 : 2) }, then: 'rub', fast: true, busy: true }); }
      if (env.home) wasHome = true; else if (!near) wasHome = false;
      for (const c of cats) {
        const a = t - c.t0; if (a < 0) continue;
        c.lift = 0;
        if (c.st === 'wander') { if (moveTo(c, c.to.x, c.to.y, c.fast ? 34 : 15, dt)) { const th = c.then; c.then = null; c.fast = false; if (th === 'boop') { c.flip = other(c).x < c.x; go(c, 'sit', t, { dur: 2.5 }); say(c, 'heart', t); if (!other(c).busy && other(c).st !== 'sleep' && other(c).st !== 'perch') { other(c).flip = c.x < other(c).x; go(other(c), 'sit', t, { dur: 2.5 }); } } else if (th === 'rub') go(c, 'rub', t, { dur: 3.2, ax: c.x, busy: true }); else if (th === 'jumpUp') go(c, 'jump', t, { dur: 0.55, from: { x: c.x, y: c.y }, to: { x: ROOF.x, y: ROOF.y + 1 }, up: true }); else go(c, 'sit', t, { dur: 1.5 + rand() * 2 }); } }
        else if (c.st === 'dash') { if (moveTo(c, c.to.x, c.to.y, 62, dt)) go(c, c.after || 'sit', t, c.after ? {} : { dur: 2 }); }
        else if (c.st === 'stalk') {
          if (c.ph === 'creep') { const tx = c.to.x + (c.to.x > c.x ? -18 : 18); if (moveTo(c, tx, c.to.y, 7, dt) || a > 5) { c.ph = 'wiggle'; c.t1 = t; c.flip = c.to.x < c.x; } }
          else if (c.ph === 'wiggle') { if (t - c.t1 > 1.3) { c.ph = 'air'; c.t1 = t; c.from = { x: c.x, y: c.y }; env.sfx('hop'); } }
          else { const u = (t - c.t1) / 0.42; c.x = lerp(c.from.x, c.to.x, Math.min(1, u)); c.lift = Math.sin(Math.min(1, u) * Math.PI) * 9; if (fly && u > 0.6 && !fly.gone) fly.gone = t; if (u >= 1) { c.lift = 0; go(c, rand() < 0.5 ? 'sit' : 'groom', t); } }
        }
        else if (c.st === 'jump') { const u = Math.min(1, a / c.dur); c.x = lerp(c.from.x, c.to.x, u); c.y = lerp(c.from.y, c.to.y, u); c.lift = (c.up ? u * ROOF.h : (1 - u) * ROOF.h) + Math.sin(u * Math.PI) * 7; c.flip = c.to.x < c.from.x; if (u >= 1) { if (c.up) go(c, 'perch', t); else { c.lift = 0; go(c, 'sit', t, { dur: 2 }); } } }
        else if (c.st === 'perch') { c.lift = ROOF.h; if (a > c.dur) go(c, 'jump', t, { dur: 0.5, from: { x: c.x, y: c.y }, to: { x: ROOF.x + 18, y: ROOF.y + 4 }, up: false }); }
        else if (c.st === 'rub') { c.x = c.ax - 12 + 12 * Math.cos(a * 2.1); c.flip = Math.sin(a * 2.1) > 0; c.dist = (c.dist || 0) + dt * 22; if (a > c.dur) { c.busy = false; say(c, 'heart', t); go(c, 'sit', t, { dur: 3 }); } }
        else if (a > c.dur) { c.busy = false; if (c.st === 'sleep') go(c, 'stretch', t, { dur: 1.6 }); else choose(c, t); }
        if (c.st === 'sleep' && Math.floor(a / 1.6) !== Math.floor((a - dt) / 1.6)) say(c, 'z', t);
      }
      for (let i = fx.length - 1; i >= 0; i--) if (t - fx[i].t0 > 1.6) fx.splice(i, 1);
      if (fly && fly.gone && t - fly.gone > 2) fly = null;
    },
    // The things to draw this frame, for the scene to sort in with everything else by y.
    items() { return cats.map(c => ({ cat: c, x: c.x, y: c.st === 'perch' || c.st === 'jump' ? ROOF.y + 2 : c.y })); },
    drawOne(scr, c, ox, oy, t) {
      const a = t - c.t0, s = S[c.id], f2 = Math.floor(t * 2.2 + c.k) & 1, step = Math.floor((c.dist || 0) / 2.4) & 3;
      let bm = s.sit0;
      if (c.st === 'sit' || c.st === 'perch') bm = c.said && t - c.said < 1.1 ? s.meow : c.looking && t - c.looking < 2.2 ? s.look : hash(Math.floor(t / 0.22), c.k, 14) < 0.06 ? s.blink : hash(Math.floor(t / 0.6), c.k, 15) < 0.3 ? s.sit1 : s.sit0;
      else if (c.st === 'groom') bm = f2 ? s.groom0 : s.groom1;
      else if (c.st === 'loaf') bm = (c.purr && t - c.purr < 3) || hash(Math.floor(t / 0.3), c.k, 16) < 0.08 ? s.loafBlink : s.loaf;
      else if (c.st === 'sleep') bm = Math.floor(a / 1.6) & 1 ? s.sleep1 : s.sleep0;
      else if (c.st === 'wander' || c.st === 'rub') bm = s['walk' + step];
      else if (c.st === 'dash') bm = Math.floor((c.dist || 0) / 7) & 1 ? s.run1 : s.run0;
      else if (c.st === 'stalk') bm = c.ph === 'air' ? s.pounce : c.ph === 'wiggle' ? (Math.floor(t * 9) & 1 ? s.crouch1 : s.crouch0) : s.crouch0;
      else if (c.st === 'jump') bm = s.pounce;
      else if (c.st === 'roll') bm = Math.floor(t * 3) & 1 ? s.roll1 : s.roll0;
      else if (c.st === 'bat') bm = Math.floor(t * 4) & 1 ? s.bat1 : s.bat0;
      else if (c.st === 'stretch') bm = s.stretch;
      const sx = Math.round(c.x - ox), sy = Math.round(c.y - oy);
      if (!c.lift || c.st === 'stalk') scr.shadow(sx, sy, 5, 1);
      scr.put(bm, sx, sy - Math.round(c.lift || 0), c.flip);
    },
    // Hearts, notes, Zs and the butterfly, drawn over everything.
    drawOver(scr, ox, oy, t) {
      for (const f of fx) {
        const a = t - f.t0, x = Math.round(f.x - ox + Math.sin(a * 5) * 1.5), y = Math.round(f.y - oy - a * 9);
        if (f.kind === 'heart') { const c = R.pink[1]; for (const [dx, dy] of [[-1, 0], [1, 0], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [-1, 2], [0, 2], [1, 2], [0, 3]]) scr.set(x + dx, y + dy, c); scr.set(x - 1, y, R.pink[2]); }
        else if (f.kind === 'z') { for (const [dx, dy] of [[0, 0], [1, 0], [2, 0], [1, 1], [0, 2], [1, 2], [2, 2]]) scr.set(x + dx, y + dy, R.white[1]); }
        else if (f.kind === 'note') { for (const [dx, dy] of [[1, 0], [2, 0], [1, 1], [1, 2], [0, 3], [1, 3]]) scr.set(x + dx, y + dy, INK); }
        else { for (const [dx, dy] of [[0, 0], [0, 1], [0, 3]]) scr.set(x + dx, y + dy, R.white[1]); }
      }
      if (fly) { const up = fly.gone ? (t - fly.gone) * 22 : 0, x = Math.round(fly.x - ox + 3 * Math.sin(t * 2.3) + up * 0.6), y = Math.round(fly.y - oy + 2 * Math.sin(t * 3.1) - up), open = Math.floor(t * 9) & 1; scr.set(x, y, INK); scr.set(x - 1, y, R.blaze[2]); scr.set(x + 1, y, R.blaze[2]); if (open) { scr.set(x - 1, y - 1, R.blaze[1]); scr.set(x + 1, y - 1, R.blaze[1]); } }
    },
    // For the workbench: put a cat into a state by name.
    force(id, st, t, extra) { go(cats.find(q => q.id === id), st, t, extra); },
    pick(wx, wy) {
      for (const c of cats) { const y = c.y - (c.lift || 0); if (Math.abs(wx - c.x) < 9 && wy > y - 15 && wy < y + 3) return { label: NAMES[c.id], wx: c.x, wy: y - 17, act: 'cat:' + c.id }; }
      return null;
    },
    // A click on a cat. Doot Doot talks back and flops over; Peevers is shy first and sweet second.
    click(id, env) {
      const c = cats.find(q => q.id === id), t = env.t; if (!c || c.st === 'jump' || c.st === 'stalk' || c.st === 'dash') return false;
      c.clicks = t - (c.clicked || -99) < 6 ? (c.clicks || 0) + 1 : 1; c.clicked = t; env.found(c.id === 'tortie' ? 'doot' : 'peevers');
      if (c.st === 'sleep') { env.sfx('meow'); say(c, 'bang', t); go(c, 'stretch', t, { dur: 1.6 }); return true; }
      if (c.st === 'perch') { c.said = t; env.sfx('meow'); say(c, 'note', t); return true; }
      if (c.id === 'nebel' && c.clicks === 1 && c.st !== 'loaf') { env.sfx('chirp'); say(c, 'bang', t); go(c, 'dash', t, { to: { x: clamp(c.x + (c.x > 640 ? -30 : 30), HOME.x0, HOME.x1), y: clamp(c.y + 8, HOME.y0, HOME.y1) }, after: null }); c.looking = t + 0.6; return true; }
      if (c.clicks >= 2) { env.sfx('purr'); say(c, 'heart', t); go(c, 'roll', t, { dur: 3.4 }); return true; }
      if (c.st === 'loaf') { c.purr = t; env.sfx('purr'); say(c, 'heart', t); c.dur += 3; return true; }
      env.sfx('meow'); say(c, 'note', t); go(c, 'sit', t, { dur: 3.5 }); c.said = t; return true;
    }
  };
}
