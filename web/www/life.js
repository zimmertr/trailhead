// Life at every place (round 8, E2, TJ's note 19): timed events on the map at Sideproject Spires, Proficiency
// Peak, Reflection Lake and the rainforest, as Mount Monolith has its avalanches and its cap cloud. Each runs
// on the scenes' clock (so the speed buttons work on it), has a start button in the debug panel and a line on
// the conditions board. Where each happens is read off the land (spots.life in land.js, the lakes' own water).
import { covered, TAU, smooth, hash, bayer, frac, lerp, rng, gustOver, R, INK, BM, saw } from './core.js';
import { makeClock, inView, inClear, blitA } from './events.js';
import { goat } from './fauna.js';
import { NH, LAND } from './land.js';

// A soaring raven seen from the side and a little below: a black bar of wing with the tips fingered and
// lifted, the body a pixel deeper in the middle. f 0: wings flat. f 1: wings in a shallow V.
function raven(f) {
  const b = new BM(9, 4); b.ox = 4; b.oy = 2;
  for (let x = 0; x < 9; x++) { const d = Math.abs(x - 4), y = f ? (d > 2 ? 0 : d > 0 ? 1 : 2) : (d > 3 ? 1 : 2); b.set(x, y, INK); }
  b.set(4, 2, INK); b.set(4, 3, INK); b.set(3, 2, INK); b.set(5, 2, INK);
  return b;
}

export function makeLife(W, STILL) {
  const { spots } = W, L = spots.life;
  const SILT = STILL.find(l => l.kind === 'silt'), wetAt = (l, x, y) => x >= l.x0 && x <= l.x1 && y >= l.y0 && y <= l.y1 && l.m[(y - l.y0) * l.w + x - l.x0] === 1;
  // Where the glacier calves: columns in the middle half of its lake whose top water pixel has ice above it.
  const CALVE = SILT ? (() => { const out = []; for (let x = Math.round(lerp(SILT.x0, SILT.x1, 0.3)); x <= lerp(SILT.x0, SILT.x1, 0.7); x += 6) { let y = SILT.y0; while (y <= SILT.y1 && !wetAt(SILT, x, y)) y++; if (y <= SILT.y1) out.push([x, y]); } return out; })() : [];
  // The towers the ravens ride beside: the two highest of the six summits.
  const TOWERS = [...(spots.spireTops || [])].sort((a, b) => a[1] - b[1]).slice(0, 2);
  // A line of picture points as a path: how long it is, and the point a distance along it.
  const pathOf = pts => { const at = [0]; for (let k = 1; k < pts.length; k++) at.push(at[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1])); return { len: at[at.length - 1] || 0, at(d) { d = Math.max(0, Math.min(this.len, d)); let k = 1; while (k < at.length - 1 && at[k] < d) k++; const f = (d - at[k - 1]) / Math.max(1e-6, at[k] - at[k - 1]); return [lerp(pts[k - 1][0], pts[k][0], f), lerp(pts[k - 1][1], pts[k][1], f)]; } }; };
  const SCREE = L.talus.map(pathOf), CROSS = L.cross.length > 8 ? pathOf(L.cross) : null;
  // The band that crosses the talus: three grown goats and two kids in single file, 15 apart, at a goat's walk.
  const BAND = [false, false, true, false, true], GAP = 15, PACE = 7;
  const GOAT = [false, true].map(kid => [goat('stand', kid, 1), goat('stand', kid, 2)]);
  // Reflection Lake: the widest still water of its kind. Where the ducks come down on it: three quarters of
  // the way east along its longest row of open water, so they have the row to paddle and to run west along.
  const LAKE = STILL.filter(l => l.kind === 'lake').sort((a, b) => b.x1 - b.x0 - (a.x1 - a.x0))[0] || null;
  const POND = LAKE ? (() => { let best = null; for (let y = LAKE.y0 + 3; y <= LAKE.y1 - 3; y++) { let run = 0; for (let x = LAKE.x0; x <= LAKE.x1 + 1; x++) { if (x <= LAKE.x1 && wetAt(LAKE, x, y) && wetAt(LAKE, x, y - 3) && wetAt(LAKE, x, y + 3)) run++; else { if (!best || run > best[2]) best = [x - run, y, run]; run = 0; } } } return best && best[2] > 84 ? [Math.round(best[0] + best[2] * 0.76), best[1]] : null; })() : null;
  // The deep rainforest, east of the mist: spots with unbroken canopy all round, for the tree that falls, the
  // owl's two perches and the sunbreak. The rainbow stands over the middle of them.
  const FOREST = (() => { const out = [], f = W.forestAmt; for (let y = 340; y < NH - 70; y += 22) for (let x = 230; x < 720; x += 26) if (f(x, y) > 0.95 && f(x - 22, y) > 0.9 && f(x + 22, y) > 0.9 && f(x, y - 16) > 0.9 && f(x, y + 16) > 0.9) out.push([x, y]); return out; })();
  const spot = (n, key) => n < 0 ? FOREST[FOREST.length >> 1] : FOREST[Math.floor(hash(n, 1, key) * FOREST.length) % FOREST.length];
  // An owl flies from a perch to the one nearest 90 away.
  const perchFrom = A => FOREST.reduce((b, P) => P === A ? b : !b || Math.abs(Math.hypot(P[0] - A[0], P[1] - A[1]) - 90) < Math.abs(Math.hypot(b[0] - A[0], b[1] - A[1]) - 90) ? P : b, null);
  const ARC = FOREST.length ? [Math.round(FOREST.reduce((s, P) => s + P[0], 0) / FOREST.length), Math.round(FOREST.reduce((s, P) => s + P[1], 0) / FOREST.length) + 70, 150] : null;
  // A fir that stands out of the canopy, as [across, up, colour]: a trunk's foot, then tiers that narrow to the tip, lit from the west.
  const FIR = (() => { const out = [], C = R.conifer; for (let j = 0; j < 38; j++) { const hw = j < 3 ? 0 : Math.max(0, Math.round(6.4 * (1 - (j - 3) / 35) + (j % 5 === 3 ? 1 : j % 5 === 2 ? -0.6 : 0))); for (let i = -hw; i <= hw; i++) out.push([i, j, j < 3 ? R.bark[1] : j % 5 === 2 ? C[i < 0 ? 1 : 0] : i === -hw && hw ? C[4] : i < 0 ? C[3] : i === hw && hw ? C[0] : i > 0 ? C[1] : C[2]]); } return out; })();
  const BOW = [R.red[1], R.blaze[2], R.yellow[1], R.kit[2], R.jay[3], R.lupine[1]], MOTE = [R.mist[5], R.mist[4], R.mist[3]];
  // ---- ice that moves (round 8, H5) ----------------------------------------------------------
  // The bergs in the glacier's lake, as land.js painted them until now: each a white top over a blue side
  // with its shadow on the water, three to seven wide, thick against the ice at the lake's far side and few
  // farther out. And a few small floes on the upper tarns (the higher half of them). Each is a thing with a
  // home on the water: a gust pushes it east a little way and it eases back, and it turns slowly, so its lit
  // side and its cap change.
  const roomAt = (l, x, y, w) => { for (let dx = -1; dx <= w; dx++) for (let dy = -2; dy <= 3; dy++) if (!wetAt(l, x + dx, y + dy)) return false; return true; };
  const BERGS = (() => { const out = [], rnd = rng(4872), put = (l, n, wide, thick) => { let got = 0; for (let k = 0; k < 900 && got < n; k++) { const x = l.x0 + Math.floor(rnd() * l.w), y = l.y0 + Math.floor(rnd() * (l.y1 - l.y0 + 1)), f = 1 - (y - l.y0) / Math.max(1, l.y1 - l.y0), w = wide(rnd());
        if (rnd() > (thick ? 0.05 + 0.9 * f * f : 1) || !roomAt(l, x, y, w) || out.some(b => Math.abs(y - b.y) < 5 && x < b.x + b.w + 6 && b.x < x + w + 6)) continue;
        out.push({ l, x, y, w, hx: x, off: 0, v: 0, ph: rnd() * TAU, slow: 34 + 26 * rnd(), floe: !thick }); got++; } };
    if (SILT) put(SILT, 9, r => r < 0.35 ? 5 + Math.floor(r / 0.35 * 3) : 3 + Math.floor((r - 0.35) / 0.65 * 2), true);
    const tarns = STILL.filter(l => l.kind === 'tarn').map(l => ({ l, h: LAND.hAt((l.x0 + l.x1) >> 1, W.vAt((l.x0 + l.x1) >> 1, (l.y0 + l.y1) >> 1)) })).sort((a, b) => b.h - a.h);
    for (const { l } of tarns.slice(0, Math.ceil(tarns.length / 2))) put(l, 3, r => 2 + Math.floor(r * 2), false);
    return out; })();
  let iceT = null;
  function ice(scr, ox, oy, t) {
    const dt = iceT == null ? 0 : Math.max(0, Math.min(0.1, t - iceT)); iceT = t;
    for (const b of BERGS) {
      // The push of a gust for a second and a half after its front goes by, a pull back toward home, and the water's drag.
      const G = gustOver(b.hx, b.y, t, 1.5), push = G ? G[2] * (1 - G[0] / 1.5) : 0;
      b.v += (push * (b.floe ? 9 : 6) - b.off * 0.22 - b.v * 0.9) * dt; const off = Math.max(-4, Math.min(8, b.off + b.v * dt)), nx = Math.round(b.hx + off);
      if (nx === b.x || roomAt(b.l, nx, b.y, b.w)) { b.off = off; b.x = nx; } else b.v = 0;
      const x = b.x - ox, y = b.y - oy; if (x < -10 || y < -4 || x > scr.VW + 2 || y > scr.VH + 4) continue;
      const turn = Math.sin(t / b.slow + b.ph), lit = b.w * (0.5 + 0.38 * turn);
      for (let dx = 0; dx < b.w; dx++) { scr.set(x + dx, y, R.white[1]);
        if (b.floe) { if (bayer(b.hx + dx, b.y) < 0.6) scr.set(x + dx, y + 1, R.tarn[2]); continue; }
        scr.set(x + dx, y + 1, dx < lit ? R.serac[4] : R.serac[2]); scr.set(x + dx + 1, y + 2, bayer(b.hx + dx, b.y) < 0.7 ? R.tarn[2] : R.tarn[3]); }
      if (!b.floe && b.w >= 5) for (let dx = turn > 0.5 ? 2 : 1; dx < b.w - (turn < -0.5 ? 3 : 2); dx++) scr.set(x + dx, y - 1, R.white[1]);
    }
  }
  let mix = 0;
  // slot: one in each so many seconds. first: when the first slot ends. dur: how long it lasts. ok: whether it can happen now.
  const EV = {
    rockfall: { slot: 75, first: 26, dur: 6.5, ok: () => L.rock.length > 0 },
    calve: { slot: 95, first: 48, dur: 12, ok: () => CALVE.length > 0 },
    pair: { slot: 85, first: 34, dur: 17, ok: () => TOWERS.length > 0 },
    alpenglow: { slot: 110, first: 18, dur: 42, ok: () => mix > 0.5 },
    talus: { slot: 65, first: 40, dur: 5.5, ok: () => SCREE.length > 0 },
    band: { slot: 150, first: 70, dur: CROSS ? (CROSS.len + (BAND.length - 1) * GAP) / PACE + 0.5 : 1, ok: () => !!CROSS },
    calm: { slot: 160, first: 62, dur: 28, ok: () => !!LAKE },
    ducks: { slot: 130, first: 96, dur: 25, ok: () => !!POND },
    treefall: { slot: 180, first: 110, dur: 9, ok: () => FOREST.length > 0 },
    // The rainbow has no slots of its own: it follows the shower by the weather's clock, and its button.
    rainbow: { slot: 1e9, first: 2e9, dur: 26, ok: () => !!ARC && mix < 0.5 },
    hoot: { slot: 70, first: 30, dur: 8, ok: () => FOREST.length > 1 && mix > 0.5 },
    sunbreak: { slot: 100, first: 44, dur: 24, ok: () => FOREST.length > 0 && mix < 0.5 }
  };
  const { now, start } = makeClock(EV), heard = {};
  // One started by its button happens where the debug panel looks (where() below): its count is -1 then.
  const on = (k, t) => { const e = EV[k].ok() ? now(k, t) : null; if (e && e[2]) e[0] = -1; return e; }, nth = (n, len) => n < 0 ? 0 : n % len;
  // A sound once for each happening of an event, and only when it is in the view.
  const sound = (env, key, n, name, inSight) => { if (inSight && heard[key] !== n) { heard[key] = n; env.sfx(name); } };
  const RAVEN = [raven(0), raven(1)], G = R.granite, ROCKDUST = [R.white[0], R.sand[2], R.sand[1]];

  // A puff of rock dust: pale specks in a round patch that spreads and thins. a: how much is left of it.
  const puff = (scr, x, y, r, a, key, DUST = ROCKDUST) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const d = Math.hypot(dx, dy * 1.3) / r; if (d > 1 || bayer(x + dx, y + dy) >= a * (1.25 - d * d) || hash(x + dx, y + dy, key) < 0.08) continue; scr.set(x + dx, y + dy, DUST[d < 0.4 ? 0 : d < 0.75 ? 1 : 2]); } };

  // Rockfall off a tower: a block lets go under a summit, drops down the face glancing off it, and leaves a
  // trail of dust that hangs and drifts east. Small stones follow. A cloud where it lands, and a rumble.
  function rockfall(scr, ox, oy, n, s, env) {
    const [x0, y0, len] = L.rock[nth(n, L.rock.length)], fall = Math.min(3.2, 1.6 + len / 50), q = Math.min(1, s / fall), d = len * q * q;
    const wob = k => Math.round(2.5 * Math.sin(d / 9 + k * 2.1) + k * 2 - 2), sx = x0 - ox, sy = y0 - oy, seen = inView(scr, sx, sy + len / 2, 4);
    if (seen && s > 0.3 && !covered(sx, sy + len / 2)) saw('rockfall');
    sound(env, 'rockfall', n, 'clack', seen); if (q >= 1) sound(env, 'rockfall2', n, 'rumble', seen);
    // The trail: a puff every 5 down the face behind the block, each older than the one below it.
    for (let k = 0; k * 5 < d; k++) { const at = Math.sqrt(k * 5 / len) * fall, age = s - at, a = smooth(3.3, 0.6, age); if (a > 0.02) puff(scr, sx + wob(1) + Math.round(age * 5 + 2 * Math.sin(k)), sy + k * 5 - Math.round(age * 2), 2 + Math.min(4, Math.round(age * 2.5)), a, 7301 + k); }
    if (q < 1) {
      for (let k = 0; k < 3; k++) { const lag = [0, 0.18, 0.31][k], dk = len * Math.pow(Math.max(0, s - lag) / fall, 2); if (dk <= 0 || dk > len) continue; const x = sx + wob(k), y = sy + Math.round(dk);
        if (k === 0) { for (let j = -2; j <= 2; j++) for (let i = -1; i <= 3; i++) { const edge = j === -2 || j === 2 || i === -1 || i === 3; if (edge && (j === -2 || j === 2) && (i === -1 || i === 3)) continue; scr.set(x + i, y + j, edge ? INK : j < 0 ? G[i < 1 ? 5 : 4] : G[i < 1 ? 3 : 2]); } } else { scr.set(x, y, G[4]); scr.set(x, y + 1, INK); } }
    } else { const a = smooth(fall + 2.8, fall + 0.3, s), up = s - fall; puff(scr, sx + Math.round(up * 3), sy + len - 3 - Math.round(up * 2), 5 + Math.min(5, Math.round(up * 4)), a, 7310); }
  }

  // The glacier calves: a crack opens in the ice above the lake, a slab tips out and drops, a column of
  // spray, a ring that spreads over the water, and a new berg that rocks where it fell and drifts out.
  function calve(scr, ox, oy, n, s, env) {
    const [x0, y0] = CALVE[nth(n, CALVE.length)], sx = x0 - ox, sy = y0 - oy, seen = inView(scr, sx, sy, 6), ICE = [R.white[1], R.serac[4], R.serac[3], R.serac[2]];
    if (seen && s > 0.6 && !covered(sx, sy)) saw('calve');
    sound(env, 'calve', n, 'crack', seen); if (s > 1.5) sound(env, 'calve2', n, 'splash', seen);
    const slab = (x, y, lean) => { for (let j = 0; j < 8; j++) for (let i = 0; i < 6; i++) scr.set(x + i + Math.round(lean * (7 - j) / 3), y - 7 + j, j === 0 ? ICE[0] : i < 2 ? ICE[1] : i < 4 ? ICE[2] : ICE[3]); };
    if (s < 0.9) { for (let j = 0; j < 9; j++) if (j < s * 14) scr.set(sx - 4, sy - 2 - j, R.serac[0]); slab(sx - 3, sy - 2, 0); }
    else if (s < 1.5) { const q = (s - 0.9) / 0.6; slab(sx - 3, sy - 2 + Math.round(9 * q * q), 2 * q); for (let j = 0; j < 9; j++) scr.set(sx - 4 + (j & 1), sy - 2 - j, R.serac[0]); }
    // The hollow it left stays darker for a while.
    if (s >= 1.5) for (let j = 0; j < 8; j++) for (let i = 0; i < 6; i++) if (!((i === 0 || i === 5) && (j === 0 || j === 7)) && hash(x0 + i, y0 + j, 7320) > 0.18 && bayer(x0 + i, y0 + j) < smooth(12, 6, s) * 0.85) scr.set(sx - 3 + i, sy - 9 + j, j < 2 || i === 0 ? R.serac[1] : R.serac[0]);
    const w = s - 1.5; if (w < 0) return;
    // Spray: up fast, falling back.
    if (w < 1.2) for (let k = 0; k < 14; k++) { const a = w - hash(k, n, 7321) * 0.2; if (a < 0) continue; const vx = (hash(k, 1, 7322) - 0.5) * 16, up = (9 + 9 * hash(k, 2, 7322)) * a - 16 * a * a; if (up < 0) continue; scr.set(sx + Math.round(vx * a), sy + 2 - Math.round(up), k & 3 ? R.white[1] : R.glac[4]); }
    // The wave: a ring on the water only, broken more as it spreads.
    if (w < 6) { const rx = 5 + 13 * w, ry = 1.5 + 2.6 * w, thin = w / 6; for (let k = 0; k < 120; k++) { if (hash(k, Math.floor(w * 5), 7323) < thin) continue; const an = k / 120 * TAU, x = Math.round(x0 + Math.cos(an) * rx), y = Math.round(y0 + 3 + Math.sin(an) * ry); if (wetAt(SILT, x, y)) scr.set(x - ox, y - oy, w < 2 ? R.white[1] : R.glac[5]); } }
    // The berg: up through the spray, then low in the water, rocking, drifting out, and gone by the end.
    const bob = Math.round(1.5 * Math.exp(-w / 2) * Math.sin(w * 5)), bx = sx - 2 + Math.round(w * 0.6), by = sy + 3 + Math.round(w * 0.35) + bob, left = smooth(10.5, 8.5, w);
    if (wetAt(SILT, bx + ox + 2, by + oy + 1)) for (let i = 0; i < 5; i++) { if (bayer(bx + i, by) >= left) continue; scr.set(bx + i, by, R.white[1]); scr.set(bx + i, by + 1, i < 3 ? R.serac[4] : R.serac[2]); if (i > 0 && i < 4) scr.set(bx + i, by - 1, R.white[1]); }
  }

  // A pair of ravens rides the updraft beside a tower: round and round, climbing, one a half turn behind the
  // other, wings set. Now and then one tips its wings. Near the top they croak, peel off east and are gone.
  function pair(scr, ox, oy, n, s, env) {
    const [tx, ty] = TOWERS[nth(n, TOWERS.length)], cx = tx + 24, base = ty + 26;
    for (let k = 0; k < 2; k++) {
      const u = s - k * 1.1; if (u < 0) continue;
      const ride = Math.min(u, 12.5), an = ride * 1.25 + k * Math.PI, r = 15 - 0.5 * ride, away = Math.max(0, u - 12.5);
      const x = Math.round(cx + Math.cos(an) * r + away * away * 9), y = Math.round(base - ride * 4.6 + Math.sin(an) * r * 0.35 - away * 3);
      const a = smooth(0, 0.8, u) * smooth(4.2, 3.2, away); if (bayer(x, y) >= a) continue;
      const seen = inView(scr, x - ox, y - oy, 4); if (seen && u > 1 && !covered(x - ox, y - oy)) saw('pair');
      if (away > 0) sound(env, 'pair', n, 'croak', seen);
      scr.put(RAVEN[frac(u / 2.3 + k * 0.4) < 0.18 || away > 0 ? 1 : 0], x - ox, y - oy, Math.sin(an) > 0);
    }
  }

  // Rocks down the talus: one lets go at the top of the fan and bounds down it, smaller stones after it, a
  // puff of dust and a clack where each lands, slower and lower as the fan flattens.
  function talus(scr, ox, oy, n, s, env) {
    const P = SCREE[nth(n, SCREE.length)], HOPS = 5, FALL = 3;
    for (let k = 0; k < 3; k++) {
      const u = (s - k * 0.35) / (FALL + 0.4 * k); if (u <= 0) continue;
      const q = Math.min(1, u), d = P.len * (0.15 * q + 0.85 * q * q * (k ? 0.8 + 0.1 * k : 1)), [px, py] = P.at(d), ph = q * HOPS, hop = q < 1 ? Math.abs(Math.sin(ph * Math.PI)) * (k ? 3 : 5) * (1 - 0.6 * q) : 0;
      const x = Math.round(px) - ox, y = Math.round(py - hop) - oy, seen = inView(scr, x, y, 4);
      if (!k && seen && s > 0.4 && !covered(x, y)) saw('talus');
      if (!k && q < 1) sound(env, 'talus' + Math.floor(ph), n, Math.floor(ph) % 2 ? 'tink' : 'clack', seen && Math.floor(ph) > 0);
      // The dust of the last landing, left behind where it hit.
      if (!k) for (let h = Math.max(1, Math.floor(ph) - 1); h <= Math.floor(ph) && h < HOPS; h++) { const qh = h / HOPS, [hx, hy] = P.at(P.len * (0.15 * qh + 0.85 * qh * qh)), age = (ph - h) / HOPS * FALL; if (age < 1.7) puff(scr, Math.round(hx) - ox + Math.round(age * 2), Math.round(hy) - 2 - Math.round(age * 3) - oy, 3 + Math.round(age * 2.5), smooth(1.7, 0.2, age), 7330 + h); }
      const left = smooth(1.55, 1.2, u); if (bayer(x, y) >= left) continue;
      if (k) { scr.set(x, y - 1, R.white[0]); scr.set(x, y, G[4]); scr.set(x + 1, y, INK); scr.set(x, y + 1, INK); }
      // The block: pale on top where the light is, so it shows against the talus, and inked round.
      else for (let j = -3; j <= 1; j++) for (let i = -2; i <= 3; i++) { const edge = j === -3 || j === 1 || i === -2 || i === 3; if (edge && (j === -3 || j === 1) && (i === -2 || i === 3)) continue; scr.set(x + i, y + j, edge ? INK : j === -2 ? R.white[0] : i < 1 ? G[5] : G[3]); }
    }
  }

  // A band of goats crosses the talus: out from one edge of the fan in single file, the kids keeping up, over
  // the blocks to the other edge, and gone. One of them bleats half way.
  function band(scr, ox, oy, n, s, env) {
    const east = n < 0 || n % 2 === 0;
    BAND.forEach((kid, k) => {
      const d = s * PACE - k * GAP; if (d < 0 || d > CROSS.len) return;
      const [px, py] = CROSS.at(east ? d : CROSS.len - d), x = Math.round(px) - ox, y = Math.round(py) - oy, a = smooth(0, 8, d) * smooth(CROSS.len, CROSS.len - 8, d), bm = GOAT[kid ? 1 : 0][Math.floor(d / 3 + k) & 1];
      const seen = inView(scr, x, y, 4); if (seen && a > 0.9 && !covered(x, y)) saw('band');
      if (k === 1 && d > CROSS.len / 2) sound(env, 'band', n, 'bleat', seen);
      if (a > 0.9) scr.shadow(x, y, kid ? 3 : 5, 1);
      blitA(scr, bm, east ? x - bm.ox : x - (bm.w - 1 - bm.ox), y - bm.oy, a, !east);
    });
  }

  // A mallard in a few pixels: the drake grey with a green head, the hen brown, both with a yellow bill. On the
  // wing the wings beat above and below the body. On the water it rides with its head up, or tips up to feed.
  const duck = (scr, x, y, dir, drake, pose, f) => {
    const body = drake ? R.rock[3] : R.wood[3], back = drake ? R.rock[2] : R.wood[2], head = drake ? R.kit[1] : R.wood[1], dark = drake ? R.rock[0] : R.wood[0], breast = drake ? R.wood[1] : R.wood[3];
    const p = (i, j, c) => scr.set(x + i * dir, y + j, c);
    // Tipped up: the body under water, the pale rump and the tail straight up.
    if (pose === 'tip') { p(-1, 0, back); p(0, 0, body); p(1, 0, back); p(0, -1, R.white[1]); p(1, -1, body); p(0, -2, dark); return; }
    if (pose === 'fly') {
      for (let i = -3; i <= 2; i++) p(i, 0, i === -3 ? dark : i === 2 ? breast : body); p(3, 0, drake ? R.white[1] : head); p(4, 0, head); p(5, 0, R.yellow[1]);
      // The wing, up or down, with the blue patch at its root.
      const s = f ? -1 : 1; p(-1, s, dark); p(0, s, R.jay[2]); p(1, s, dark); p(-1, 2 * s, dark); p(0, 2 * s, dark); if (f) p(-1, -3, dark);
      return;
    }
    for (let i = -2; i <= 2; i++) { p(i, 0, i === 2 ? breast : body); if (i < 2) p(i, -1, i === -2 ? dark : back); }
    p(-3, -1, drake ? R.white[1] : dark); p(2, -1, drake ? R.white[1] : head); p(2, -2, head); p(3, -2, head); p(4, -2, R.yellow[1]);
  };

  // Ducks on Reflection Lake: a pair of mallards comes in low from the east, wings beating, and lands feet
  // first with a skid of spray. They paddle west and tip up to feed, then run along the water and are away.
  function ducks(scr, ox, oy, n, s, env) {
    const [lx, ly] = POND, Wc = R.white[1], wet = (X, Y, c) => { if (wetAt(LAKE, X, Y)) scr.set(X - ox, Y - oy, c); };
    for (let k = 0; k < 2; k++) {
      const u = s - k * 0.8, hx = lx + k * 13, hy = ly + k * 5 - 2; if (u < 0) continue;
      let x, h = 0, pose, f = 0, a = 1;
      if (u < 4) { const q = u / 4; x = hx + 120 * (1 - q) * (1 - 0.35 * q); h = 50 * Math.pow(1 - q, 1.7); pose = 'fly'; f = Math.floor(u * 9) & 1; a = smooth(0, 0.8, u); }
      else if (u < 5.2) { const q = (u - 4) / 1.2; x = hx - 10 * (1 - (1 - q) * (1 - q)); pose = q < 0.4 ? 'fly' : 'swim';
        // The skid: spray thrown up behind and to both sides, less as it slows.
        for (let j = 0; j < 14; j++) if (hash(j, Math.floor(u * 12), 7340 + k) > q) wet(Math.round(x) + 3 + j, hy + ((j & 1) ? 1 : -1) * (1 + (j >> 2)) - (j < 4 ? 1 : 0), Wc); }
      else if (u < 18) { const w = u - 5.2; x = hx - 10 - w * 1.3; pose = frac((w + k * 2.3) / 4.6) > 0.78 ? 'tip' : 'swim'; }
      else if (u < 19.6) { const q = (u - 18) / 1.6; x = hx - 26.64 - 26 * q * q; h = 3 * q * q; pose = 'fly'; f = Math.floor(u * 10) & 1;
        // The run: a splash at each footfall, left behind on the water.
        for (let j = 1; j <= 5; j++) { const qj = q - j * 0.07; if (qj > 0) wet(Math.round(hx - 26.64 - 26 * qj * qj), hy + (j & 1), j < 3 ? Wc : R.water[4]); } }
      else { const w = u - 19.6; x = hx - 52.64 - w * 34; h = 3 + 8 * w + 3 * w * w; pose = 'fly'; f = Math.floor(u * 9) & 1; a = smooth(4.2, 2.4, w); }
      const X = Math.round(x), Y = Math.round(hy - h), seen = inView(scr, X - ox, Y - oy, 4);
      if (seen && u > 4 && u < 18 && !covered(X - ox, Y - oy)) saw('ducks');
      if (!k && u >= 4) sound(env, 'ducks', n, 'splash', seen); if (!k && u >= 18) sound(env, 'ducks2', n, 'slap', seen);
      if (bayer(X, Y) >= a) continue;
      // On the water: a wake that opens behind, and a ring round a duck that has tipped up.
      if (!h && u >= 5.2) { if (pose === 'tip') { for (const [i, j] of [[-3, 0], [3, 0], [-2, 1], [2, 1], [-1, 2], [0, 2], [1, 2], [-2, -1], [2, -1]]) wet(X + i, hy + j, i & 1 ? Wc : R.water[4]); } else if (Math.floor(u * 3) & 1) { wet(X + 4, hy + 1, Wc); wet(X + 6, hy + 2, R.water[4]); wet(X + 8, hy + 3, R.water[4]); wet(X + 5, hy - 2, R.water[4]); wet(X + 7, hy - 3, R.water[4]); } else { wet(X + 5, hy + 1, R.water[4]); wet(X + 7, hy + 2, Wc); wet(X + 4, hy - 2, Wc); wet(X + 6, hy - 3, R.water[4]); } }
      // Low over the water its shadow runs under it.
      if (h > 0.5 && h < 14) for (let i = -2; i <= 2; i++) wet(X + i, hy + 1, R.water[1]);
      duck(scr, X - ox, Y - oy, -1, k === 0, pose, f);
    }
  }

  // A tree falls far off in the rainforest: a fir that stands out of the canopy shivers, leans and goes over,
  // slowly and then all at once. Needles and dust rise where it came down, and the birds of that wood go up.
  function treefall(scr, ox, oy, n, s, env) {
    const [fx, fy] = spot(n, 7350), dir = hash(n, 2, 7350) < 0.5 ? -1 : 1, seen = inView(scr, fx - ox, fy - oy - 10, 8), DOWN = 3.5;
    if (seen && s > 1.7 && s < 5 && !covered(fx - ox, fy - oy - 10)) saw('treefall');
    if (s > 0.4) sound(env, 'tree', n, 'creak', seen); if (s > 1.7) sound(env, 'tree2', n, 'crack', seen); if (s > DOWN) sound(env, 'tree3', n, 'bang', seen);
    if (s < DOWN) {
      const q = Math.max(0, (s - 1.7) / (DOWN - 1.7)), an = 1.54 * q * q, sn = Math.sin(an), cs = Math.cos(an), shake = s > 0.6 && s < 1.7 ? Math.round(Math.sin(s * 34) * 0.8) : 0, a = smooth(0, 0.5, s) * smooth(1.5, 1.05, an), sink = 12 * smooth(0.7, 1.5, an);
      for (const [i, j, c] of FIR) for (let h = 0; h < 2; h++) { const jj = j + h * 0.5, X = Math.round(fx + dir * jj * sn + i * cs + (j > 12 ? shake : 0)), up = jj * cs - dir * i * sn; if (up < sink || bayer(X, Math.round(fy - up)) >= a) continue; scr.set(X - ox, Math.round(fy - up) - oy, c); }
      return;
    }
    const age = s - DOWN, lx = fx + dir * 22 - ox, ly = fy - 6 - oy;
    puff(scr, lx + Math.round(age * 1.5), ly - Math.round(age * 3.2), 6 + Math.min(9, Math.round(age * 3)), smooth(5.2, 0.6, age), 7351, MOTE);
    puff(scr, lx - dir * 13, ly + 1 - Math.round(age * 2), 5 + Math.min(5, Math.round(age * 2)), smooth(3.6, 0.3, age), 7352, MOTE);
    // The birds: up out of the canopy round it, and away east in a loose flock.
    for (let k = 0; k < 9; k++) { const u = age - 0.08 * k; if (u < 0) continue; const x = Math.round(fx + (hash(k, 4, 7353) - 0.5) * 44 + u * (7 + 9 * hash(k, 1, 7354))), y = Math.round(fy - 6 - hash(k, 2, 7354) * 8 - u * (5 + 5 * hash(k, 3, 7354)) + 1.5 * Math.sin(u * 3 + k));
      if (bayer(x, y) >= smooth(5.4, 3.4, u)) continue; const up = Math.floor(u * 7 + k) & 1; scr.set(x - ox, y - oy, INK); scr.set(x - 1 - ox, y - up - oy, INK); scr.set(x + 1 - ox, y - up - oy, INK); }
  }

  // A rainbow over the rainforest when a shower has passed: six bands on a bow, strongest at its top and
  // thinning to nothing before its feet reach the trees. a: how much of it shows.
  function rainbow(scr, ox, oy, a) {
    const [cx, cy, r] = ARC, W = BOW.length * 2, x0 = Math.max(0, cx - r - W - ox), x1 = Math.min(scr.VW - 1, cx + r + W - ox), y0 = Math.max(0, cy - r - W - oy), y1 = Math.min(scr.VH - 1, cy - oy);
    if (a > 0.6 && inClear(scr, cx - ox, cy - r - oy, 0)) saw('rainbow');
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const wx = x + ox, wy = y + oy, d = Math.hypot(wx - cx, wy - cy) - r; if (d < 0 || d >= W) continue; if (bayer(wx, wy) < a * 0.62 * smooth(0.08, 0.5, (cy - wy) / r)) scr.set(x, y, BOW[BOW.length - 1 - (d >> 1)]); }
  }

  // An owl calls at Dusk: two eyes in a crown and a hoot, then it lets go and glides low over the canopy on
  // pale wings to another tree, and calls again from there.
  function hoot(scr, ox, oy, n, s, env) {
    const A = spot(n, 7360), B = perchFrom(A), EYE = R.lamp[1], P = [R.snow[4], R.snow[3], R.snow[2]];
    const eyes = (x, y) => { if (frac(s * 0.45) < 0.9) { scr.set(x - 1 - ox, y - oy, EYE); scr.set(x + 1 - ox, y - oy, EYE); } scr.set(x - ox, y - oy, INK); };
    if (s > 0.3) sound(env, 'hoot', n, 'hoot', inView(scr, A[0] - ox, A[1] - oy, 8)); if (s > 5.8) sound(env, 'hoot2', n, 'hoot', inView(scr, B[0] - ox, B[1] - oy, 8));
    if (s < 1.4) return eyes(A[0], A[1] - 6);
    if (s > 4.8) return eyes(B[0], B[1] - 6);
    const q = smooth(1.4, 4.8, s), x = Math.round(lerp(A[0], B[0], q)), y = Math.round(lerp(A[1], B[1], q) - 6 + 7 * Math.sin(q * Math.PI)), flap = q < 0.2 || q > 0.85 ? Math.floor(s * 6) & 1 : 0, sx = x - ox, sy = y - oy;
    if (inClear(scr, sx, sy, 4)) saw('hoot');
    // From above and behind: a broad pale back, the wings a little raised at the tips or drawn down on a beat.
    for (let i = -5; i <= 5; i++) { const d = Math.abs(i), wy = sy + (flap ? (d > 2 ? 1 : 0) : d > 3 ? -1 : 0); scr.set(sx + i, wy, P[d < 2 ? 0 : d < 4 ? 1 : 2]); if (d > 0 && d < 5) scr.set(sx + i, wy + 1, P[2]); }
    scr.set(sx, sy + 1, P[1]); scr.set(sx - 1, sy + 1, P[2]); scr.set(sx + 1, sy + 1, P[2]);
  }

  return {
    draw(scr, ox, oy, t, env, sky) {
      mix = env.mix || 0;
      let e;
      if ((e = on('rockfall', t))) rockfall(scr, ox, oy, e[0], e[1], env);
      if ((e = on('calve', t))) calve(scr, ox, oy, e[0], e[1], env);
      if ((e = on('pair', t))) pair(scr, ox, oy, e[0], e[1], env);
      if ((e = on('talus', t))) talus(scr, ox, oy, e[0], e[1], env);
      if ((e = on('band', t))) band(scr, ox, oy, e[0], e[1], env);
      if ((e = on('ducks', t))) ducks(scr, ox, oy, e[0], e[1], env);
      if ((e = on('treefall', t))) treefall(scr, ox, oy, e[0], e[1], env);
      if ((e = on('hoot', t))) hoot(scr, ox, oy, e[0], e[1], env);
      // The rainbow: by its button, or as the shower clears off (the rain stops at 74 on the weather's clock).
      if (ARC && mix < 0.5) { e = on('rainbow', t); const bow = Math.max(e ? smooth(0, 4, e[1]) * smooth(EV.rainbow.dur, EV.rainbow.dur - 6, e[1]) : 0, sky ? smooth(66, 75, sky.s) * smooth(99, 88, sky.s) : 0); if (bow > 0.02) rainbow(scr, ox, oy, bow); }
    },
    // How strong the alpenglow on the Spires is now, 0 to 1: it comes up over a few seconds at Dusk, holds and fades.
    alpenglow(t) { const e = on('alpenglow', t); return e ? smooth(0, 7, e[1]) * smooth(EV.alpenglow.dur, EV.alpenglow.dur - 12, e[1]) : 0; },
    // How still Reflection Lake lies, 0 to 1: the wind drops over a few seconds, the water is glass, and it picks up again.
    calm(t) { const e = on('calm', t); return e ? smooth(0, 5, e[1]) * smooth(EV.calm.dur, EV.calm.dur - 5, e[1]) : 0; },
    lake: LAKE,
    // The drifting ice, drawn on the water before anything that stands in front of it. bergs: for the checks.
    ice, bergs: () => BERGS.map(b => ({ x: b.x, y: b.y, w: b.w, home: b.hx, floe: b.floe, wet: roomAt(b.l, b.x, b.y, b.w) })),
    // The sunbreak: where the gap in the cloud lets the sun onto the canopy now, drifting east, and how bright.
    sunbreak(t) { const e = on('sunbreak', t); if (!e) return null; const S = spot(e[0], 7370); return { x: S[0] - 54 + 4.5 * e[1], y: S[1] + 0.7 * e[1], a: smooth(0, 4, e[1]) * smooth(EV.sunbreak.dur, EV.sunbreak.dur - 5, e[1]) }; },
    // Where each happens, for the debug panel to look there first.
    where(name) {
      if (name === 'rockfall') return L.rock.length ? [L.rock[0][0], L.rock[0][1] + 20] : null;
      if (name === 'calve') return CALVE.length ? CALVE[0] : null;
      if (name === 'pair' || name === 'alpenglow') return TOWERS.length ? [TOWERS[0][0], TOWERS[0][1] + 30] : null;
      if (name === 'talus') return SCREE.length ? SCREE[0].at(SCREE[0].len / 2) : null;
      if (name === 'band') return CROSS ? CROSS.at(CROSS.len / 2) : null;
      if (name === 'calm') return LAKE ? [(LAKE.x0 + LAKE.x1) / 2, (LAKE.y0 + LAKE.y1) / 2] : null;
      if (name === 'ducks') return POND ? [POND[0] - 10, POND[1]] : null;
      if (name === 'rainbow') return ARC ? [ARC[0], ARC[1] - ARC[2] * 0.6] : null;
      if (name === 'treefall' || name === 'hoot' || name === 'sunbreak') return FOREST.length ? FOREST[FOREST.length >> 1] : null;
      return null;
    },
    // The debug panel's start buttons. One that cannot happen now (the alpenglow by Day) says no.
    trigger(name, t) { if (!EV[name] || !EV[name].ok()) return false; start(name, t); return true; },
    names: Object.keys(EV)
  };
}
