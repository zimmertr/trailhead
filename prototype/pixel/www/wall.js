// The Stack: a granite big wall climbed face-on, the camera rising with him. One route, three
// pitches with a ledge after each, the summit, then the rappel. Everything he does is worked out
// from how far along the route he is, so the timeline can be dragged either way.
import { clamp, lerp, smooth, frac, sq, rng, hash, vnoise, fbm, bayer, R, INK, SHADE, LIGHT, pick, BM, outline, thick } from './core.js';
import { Strip, drawStrip, baseline } from './side.js';
import { makeFir, makeSpruce, makeBoulder, makeCloud, makeFlag, makeBush } from './sprites.js';
import { pika, speck } from './fauna.js';
import { makeRunner, frontFig, backFig } from './tj.js';

const W = 1340, RX = 760, UP = 500, DOWN = 250;
const H1 = 110, H2 = 220, ROOF = 292, H3 = 326, HS = 360, C = 12;
const DUR = 20.1;
// Seconds into the scene, and how high his hips are by then.
const KEYS = [[0, 0, 'walk'], [0.9, 0, 'climb'], [4.9, H1, 'climb'], [6.9, 170, 'fall'], [7.2, 148, 'hang'], [7.9, 148, 'climb'], [10.3, H2, 'climb'], [12.5, 286, 'roof'], [13.7, 308, 'climb'], [14.3, H3, 'climb'], [15.5, HS, 'rappel'], [19.3, 0, 'out'], [20.1, 0, 'out']];
const STOPS = [['platform-engineering', 4.9], ['site-reliability-engineering', 10.3], ['software-engineering', 14.3], ['summit', 15.5]];
const PRO = [16, 36, 56, 76, 96, H1, 128, 146, 164, 186, 206, H2, 238, 256, 274, 300, 314, H3];
const FLAKE = 176, DECOY = { x: -30, s: 262 };

const route = s => RX + (s < H1 ? 0 : 6 * Math.sin((s - H1) / 28) * smooth(H1, H1 + 20, s));
const edge = s => RX + 124 + 9 * vnoise(s / 34, 1, 160) + 5 * Math.sin(s / 61) - 30 * smooth(HS - 60, HS + 4, s);
const rim = x => HS + 4 + Math.round((9 * (vnoise(x / 19, 2, 161) - 0.5) + 4 * (vnoise(x / 5, 3, 161) - 0.5)) * smooth(14, 44, Math.abs(x - RX)) - 14 * smooth(RX - 140, RX - 420, x) - 7 * smooth(RX + 40, RX + 110, x));

function paintWall(S) {
  const cracks = [RX - 392, RX - 300, RX - 214, RX - 131, RX - 62, RX + 44, RX + 88];
  for (let x = 0; x < W; x++) {
    const top = rim(x);
    for (let s = top; s >= -3; s--) {
      if (x > edge(s)) continue;
      const y = -s;
      // Big pale panels, long vertical grain, darker where water runs off the rim.
      let v = 0.64 + 0.26 * (fbm(x / 70, y / 90, 162, 3) - 0.5) + 0.12 * (vnoise(x / 4, y / 46, 163) - 0.5) + 0.08 * (vnoise(x / 17, y / 9, 164) - 0.5);
      if (vnoise(x / 3.2, 3, 165) > 0.74 && top - s < 40 + 190 * vnoise(x / 7, 5, 166)) v -= 0.26;
      if (vnoise(x / 6, 7, 167) > 0.8 && s < 150) v += 0.16;
      // Overlaps: a lit lip with shade under it, here and there across the face.
      const lap = frac(s / 37 + 0.6 * vnoise(x / 40, 2, 168)), lapOn = vnoise(x / 30, Math.floor(s / 37 + 0.6 * vnoise(x / 40, 2, 168)), 169) > 0.55;
      if (lapOn) { if (lap < 0.03) v = 0.97; else if (lap > 0.9) v -= 0.16 * (lap - 0.9) / 0.1 + 0.06; }
      for (const cx of cracks) { const d = x - (cx + 5 * Math.sin(y / 31 + cx)); if (d > -0.8 && d < 0.6 && s < top - 8 && vnoise(cx, y / 60, 170) > 0.25) v = 0.12; else if (d >= 0.6 && d < 1.8 && s < top - 8) v += 0.14; }
      // The line of the route: the crack of the first pitch, and the roof on the third.
      if (s < H1 - 2 && s > 2) { const d = x - RX; if (Math.abs(d) < 1.1) v = 0.08; else if (d >= 1.1 && d < 2.6) v = 0.93; else if (d < -1.1 && d > -3.5) v -= 0.12; }
      const rd = Math.abs(x - RX - 10), rb = ROOF + 2 * vnoise(x / 9, 1, 171);
      if (rd < 78) { if (s <= rb && s > rb - 11) v = 0.05 + 0.2 * (rb - s) / 11 * (rd > 66 ? 2 : 1); else if (s > rb && s < rb + 2) v = 0.98; else if (s <= rb - 11 && s > rb - 26) v -= 0.17 * (1 - (rb - 11 - s) / 15); }
      for (const [h, hw] of [[H1, 30], [H2, 34], [H3, 26]]) { const d = Math.abs(x - route(h)); if (d < hw + 3 * vnoise(x / 5, h, 172)) { if (s <= h && s > h - 2) v = 1; else if (s <= h - 2 && s > h - 7) v = 0.16 + (h - 2 - s) * 0.04; } }
      if (x > edge(s) - 9) v += 0.16 - (edge(s) - x) * 0.012;
      if (top - s < 2) v += 0.2;
      const warm = fbm(x / 13, y / 34, 173, 3) > 0.64 && v > 0.42 && v < 0.86 && hash(x, s, 1) < 0.8;
      // Small edges to climb on, near the line.
      if (Math.abs(x - route(s)) < 13 && s > H1 && hash(x >> 1, s >> 1, 174) < 0.035) v = hash(x, s, 2) < 0.5 ? 0.25 : 0.95;
      S.set(x, y, pick(warm ? 'ochre' : 'gold', v, x, y));
    }
    if (x <= edge(top)) S.set(x, -top - 1, INK);
  }
  for (let s = HS + 6; s > -3; s--) { const e = Math.round(edge(s)); S.set(e + 1, -s, INK); }
  // Bushes on the ledges, trees along the rim.
  const rand = rng(8);
  for (let x = 6; x < RX + 60; x += 7 + rand() * 16) { if (Math.abs(x - RX) < 26) continue; const h = 5 + rand() * 9, t = rim(x); for (let j = 0; j < h; j++) for (let dx = -Math.floor(j / 2.4); dx <= Math.floor(j / 2.4); dx++) S.set(x + dx, -t - h + j, R.conifer[dx < 0 ? 3 : 1]); }
  for (const [h, dx] of [[H1, -18], [H2, 22], [H2, -24], [H3, 15]]) { const b = makeBush(60 + h + dx, 'green'); S.stamp(b, route(h) + dx, -h); }
}

function paintGround(S, things) {
  const rand = rng(81);
  for (let x = 0; x < W; x++) for (let y = 0; y < DOWN; y++) {
    const tal = smooth(70, 0, y + 14 * (vnoise(x / 26, 3, 175) - 0.5)) * smooth(RX + 300, RX + 150, x);
    const trail = Math.abs(y - 7 - 2 * Math.sin(x / 40)) < 3.2 && x < RX + 8;
    let c;
    if (trail) c = hash(x, y, 176) < 0.08 ? R.rock[2] : pick('dirt', 0.56 + 0.25 * (vnoise(x / 5, y / 2, 177) - 0.5), x, y, 0.7);
    else if (hash(x >> 1, y >> 1, 178) < tal * 0.92) c = pick('rock', 0.2 + 0.7 * hash(x >> 1, y >> 1, 179) - y * 0.002, x, y);
    else c = pick('grass', 0.55 + 0.5 * (fbm(x / 24, y / 13, 180, 3) - 0.5) + 0.12 * (hash(x >> 1, y >> 1, 181) - 0.5) - y * 0.001, x, y, 0.3);
    if (y < 2 && !trail) c = SHADE[c];
    S.set(x, y, c);
  }
  const boulders = [3, 4, 6, 8, 11].map((r, i) => makeBoulder(170 + i, r)), firs = Array.from({ length: 5 }, (_, i) => makeFir(320 + i)), spruces = [makeSpruce(240), makeSpruce(241)];
  for (let n = 0; n < 150; n++) { const x = rand() * W, y = 3 + sq(rand()) * 230; if (Math.abs(y - 8) < 9 && x < RX + 20) continue; things.push({ bm: boulders[Math.min(4, (rand() * 3 + y / 70) | 0)], x: Math.round(x), s: -Math.round(y) }); }
  for (let n = 0; n < 46; n++) { const x = rand() * W, y = 16 + rand() * 220; if (Math.abs(x - RX) < 50 && y < 60) continue; things.push({ tree: y > 80 && rand() < 0.5 ? spruces[n & 1] : firs[(rand() * 5) | 0], x: Math.round(x), s: -Math.round(y) }); }
}

// The valley beyond the edge of the wall: far walls with a waterfall, forest, a river.
function paintValley() {
  const S = new Strip(640, 330, 90);
  for (let x = 0; x < 640; x++) {
    const ridge = -150 - 60 * fbm(x / 90, 1, 182, 4) - 30 * Math.exp(-sq((x - 420) / 60));
    const wallTop = -70 - 90 * smooth(140, 330, x) * (0.75 + 0.25 * vnoise(x / 26, 2, 183)) - 26 * vnoise(x / 13, 3, 184);
    for (let y = Math.round(Math.min(ridge, wallTop)); y < 90; y++) {
      let c;
      if (y < wallTop && y >= ridge) c = y - ridge < 4 && ridge < -180 ? R.farsnow[1] : pick('far', 0.45 + 0.3 * (vnoise(x / 6, y / 14, 185) - 0.5), x, y);
      else if (y < wallTop) continue;
      else if (y < 14 + 10 * vnoise(x / 30, 4, 186)) c = Math.abs(x - 452 - 3 * Math.sin(y / 9)) < 1.3 && y > wallTop + 6 ? R.farsnow[1] : pick('far', 0.72 + 0.3 * (vnoise(x / 5, y / 24, 187) - 0.5) - (vnoise(x / 3, 5, 188) > 0.7 ? 0.2 : 0), x, y);
      else if (Math.abs(y - 58 - 9 * Math.sin(x / 50)) < 2.2) c = R.water[4];
      else c = pick('hill', 0.3 + 0.7 * vnoise(x / 3, y / 2.4, 189), x, y);
      S.set(x, y, c);
    }
  }
  return S;
}

export function makeWall() {
  const main = new Strip(W, UP, DOWN), things = [];
  paintWall(main); paintGround(main, things);
  const valley = paintValley();
  const clouds = [0, 1, 2].map(i => ({ bm: makeCloud(620 + i), x: i * 190, y: 20 + i * 46, v: 3 + i }));
  const run = makeRunner('wall'), flag = [makeFlag(0), makeFlag(1)], pikaBM = [pika(0), pika(1)], swift = [speck(0), speck(1)];
  const pikaRock = makeBoulder(190, 8), pikaX = RX - 86;
  things.push({ bm: pikaRock, x: pikaX, s: -12 }, { bm: makeBoulder(191, 5), x: pikaX + 22, s: -15 });
  const prop = {
    'platform-engineering': (b, cx, y) => { for (const [dx, c] of [[-7, R.rock[3]], [-6, R.red[1]], [-8, R.rock[2]]]) b.set(cx + dx, y + 1 + (dx & 1), c); b.set(cx - 7, y - 1, R.rock[4]); b.set(cx - 7, y, R.teal[2]); },
    'site-reliability-engineering': (b, cx, y) => { b.set(cx + 5, y + 2, INK); b.set(cx + 6, y + 2, R.kit[2]); b.set(cx + 5, y + 3, INK); },
    'software-engineering': (b, cx, y) => { for (let i = -3; i <= 3; i++) for (let j = 3; j < 7; j++) b.set(cx + i, y + j, i === 0 ? R.white[0] : j === 6 ? R.red[1] : R.white[1]); b.set(cx - 2, y + 4, R.red[1]); b.set(cx + 2, y + 5, R.navy[1]); },
    summit: null
  };
  const stand = {};
  for (const id in prop) stand[id] = frontFig('wall', id === 'summit' ? { swing: -9 } : { swing: id === 'site-reliability-engineering' ? -3 : 0, held: prop[id] });
  stand.idle = frontFig('wall');

  const st = {}, focus = { x: 0, y: 0 };
  let camS = 0, last = { camX: 0, base: 0 };
  const list = [];

  // Where he is and what he is doing at a moment of the scene.
  function at(tau) {
    let i = 0; while (i < KEYS.length - 2 && tau >= KEYS[i + 1][0]) i++;
    const [t0, s0, mode] = KEYS[i], [t1, s1] = KEYS[i + 1], u = clamp((tau - t0) / (t1 - t0), 0, 1);
    return { mode, u, s: mode === 'fall' ? lerp(s0, s1, u * u) : lerp(s0, s1, u), tau };
  }
  // The four limbs take turns: each stays on its hold while the body rises past, then reaches for the next.
  function limbs(s, crack) {
    const out = [];
    for (const [off, side, lead] of [[0, -1, 9], [0.5, 1, 10], [0.25, 1, -14], [0.75, -1, -13]]) {
      const ph = s / C - off, n = Math.floor(ph), m = ph - n;
      const hold = k => { const hs = (k + 1) * C + lead; return [route(hs) - route(s) + side * (crack ? 1.4 + (lead < 0 ? 1.5 : 0) : 4.5 + 3 * hash(k, side + 2, 191)), hs]; };
      const a = hold(n), b = hold(n + 1), u = m > 0.7 ? (m - 0.7) / 0.3 : 0;
      out.push([Math.round(lerp(a[0], b[0], u) + side * Math.sin(u * Math.PI) * 2), -Math.round(lerp(a[1], b[1], u) - s)]);
    }
    return { hands: [out[0], out[1]], feet: [out[3], out[2]] };
  }

  return {
    name: 'wall',
    dur: () => DUR,
    stops: () => STOPS.map(([id, t]) => ({ id, at: t / DUR })),
    elev: (arg, q) => at(q * DUR).s,
    // Gear goes in on the way up, the hold breaks, the rope catches, and the rappel hums.
    cues() {
      const out = [{ at: 6.9 / DUR, name: 'crack' }, { at: 6.95 / DUR, name: 'fall' }, { at: 7.2 / DUR, name: 'catch' }, { at: 11.6 / DUR, name: 'glow' }, { at: 15.7 / DUR, name: 'glissade' }];
      let k = 0; for (let tau = 0.9; tau < 15.5 && k < PRO.length; tau += 0.02) { const a = at(tau); if (a.mode !== 'fall' && a.s >= PRO[k]) { out.push({ at: tau / DUR, name: 'place' }); k++; } }
      return out;
    },
    enter(scr, arg, q) { camS = at(q * DUR).s; st.y = null; },
    focus: () => focus,
    pick(sx, sy) {
      const wx = sx + last.camX, s = last.base + camS - sy;
      if (Math.abs(wx - pikaX) < 12 && s > 8 && s < 34) return { label: 'Pika', x: pikaX - last.camX, y: last.base + camS - 36, act: 'pika' };
      if (Math.abs(wx - route(H2)) < 34 && Math.abs(s - H2) < 8) return { label: 'Deadlock Ledge', x: sx, y: sy - 10 };
      if (Math.abs(wx - RX - 10) < 78 && s > ROOF - 12 && s < ROOF + 3) return { label: 'Rollback Roof', x: sx, y: sy - 10 };
      if (wx < RX + 150 && s < 0 && s > -70 && Math.abs(wx - RX) > 20) return { label: 'Segfault Scree', x: sx, y: sy - 10 };
      return null;
    },
    act(id, env) { if (id === 'pika') { env.sfx('eep'); st.eep = env.t; return true; } return false; },
    draw(scr, env, arg, q) {
      const { VW, VH, fb } = scr, { t } = env;
      const tau = q * DUR, me = at(tau), s = me.s;
      camS += (s - camS) * Math.min(1, env.dt * 7);
      const anchor = scr.narrow ? 0.5 : 0.58, camX = Math.round(RX - VW * anchor + env.look.x * 0.4);
      const base = baseline(scr, env.shown, st) + (scr.narrow ? 0 : -16), rowOf = h => Math.round(base + camS - h);
      last = { camX, base };

      // Sky, deeper the higher he gets, then the valley, then the wall itself.
      const sb = R.skyband;
      for (let y = 0; y < VH; y++) {
        const f = clamp((y + 120 - camS * 0.25) / 330, 0, 1) * (sb.length - 1), b0 = Math.floor(f), e = f - b0, row = y * VW;
        if (e < 0.72 || b0 >= sb.length - 1) fb.fill(sb[b0], row, row + VW); else for (let x = 0; x < VW; x++) fb[row + x] = sb[b0 + (bayer(x, y) < (e - 0.72) / 0.28 ? 1 : 0)];
      }
      for (const c of clouds) scr.blit(c.bm, ((c.x + t * c.v) % (VW + 140)) - 70, c.y + camS * 0.12 - 20);
      drawStrip(scr, valley, 150 + camX * 0.3, base + camS * 0.42 - 26, false, R.hill[0]);
      // A falcon turns over the valley.
      { const a = t * 0.5; scr.put(swift[Math.floor(t * 2) & 1], RX + 220 - camX + Math.cos(a) * 46, base + camS * 0.5 - 150 + Math.sin(a) * 14, Math.sin(a) > 0); }
      drawStrip(scr, main, camX, base + camS, false, R.grass[1]);

      // Protection he has placed or clipped stays behind, and the rope runs up through it to him.
      const high = tau >= 15.5 ? HS : tau >= 7.9 && tau < 10.3 ? Math.max(s, 170) : s, rope = [[RX - 2, 0]];
      for (const h of PRO) {
        if (h > high - 4 && !(tau >= 15.5)) break;
        const x = Math.round(route(h)) + (h < H1 ? 0 : 4), y = rowOf(h);
        if (h !== H1 && h !== H2 && h !== H3) { scr.set(x - camX, y, R.rock[4]); scr.set(x - camX, y + 1, h < H1 ? R.red[1] : R.rock[2]); scr.set(x - camX - 1, y, INK); scr.set(x - camX, y + 2, R.teal[2]); }
        rope.push([x, h]);
      }
      const cut = me.mode === 'rappel' || me.mode === 'out';
      if (!cut) rope.push([route(s), s - 1]); else { rope.length = 0; rope.push([route(HS) + 1, HS + 2], [route(HS) + 1, me.mode === 'rappel' ? -2 : -2]); }
      for (let i = 1; i < rope.length; i++) { const [x0, h0] = rope[i - 1], [x1, h1] = rope[i], n = Math.max(1, Math.abs(h1 - h0)); for (let k = 0; k <= n; k++) { const u = k / n, x = Math.round(lerp(x0, x1, u) + Math.sin(u * Math.PI) * (cut ? 0 : 1.5)) - camX, y = rowOf(lerp(h0, h1, u)); scr.set(x, y, (k + i) % 3 ? R.teal[2] : R.teal[0]); } }
      // The hold that breaks on the second pitch: there before, a pale scar after, falling in between.
      { const fx = Math.round(route(FLAKE)) + 6 - camX, fy = rowOf(FLAKE); if (tau < 6.9) { scr.set(fx, fy, R.gold[6]); scr.set(fx + 1, fy, R.gold[6]); scr.set(fx, fy + 1, R.gold[1]); scr.set(fx + 1, fy + 1, R.gold[1]); } else { scr.set(fx, fy, R.gold[6]); scr.set(fx + 1, fy + 1, R.gold[5]); const u = tau - 6.9; if (u < 1.2) { const yy = fy + Math.round(240 * u * u), xx = fx + Math.round(u * 14); scr.set(xx, yy, R.gold[3]); scr.set(xx + ((Math.floor(u * 20) & 1) ? 1 : 0), yy + ((Math.floor(u * 20) & 1) ? 0 : 1), R.gold[1]); } } }
      // On the third pitch the next holds glow as suggestions; one off to the left goes nowhere.
      if (tau > 10.3 && tau < 13.4) {
        const glow = (x, y, on) => { const c = on ? R.yellow[1] : R.yellow[0]; scr.set(x, y, R.white[1]); scr.set(x - 1, y, c); scr.set(x + 1, y, c); scr.set(x, y - 1, c); scr.set(x, y + 1, c); if (on) { scr.set(x - 2, y, R.yellow[0]); scr.set(x + 2, y, R.yellow[0]); } };
        for (let k = 1; k <= 3; k++) { const n = Math.floor(s / C) + k, hs = (n + 1) * C + 7; if (hs > ROOF + 10) continue; glow(Math.round(route(hs) + (n & 1 ? 5 : -5)) - camX, rowOf(hs), (Math.floor(t * 5) + k) & 1); }
        if (s < DECOY.s + 4) { const x = Math.round(route(DECOY.s)) + DECOY.x - camX, y = rowOf(DECOY.s); glow(x, y, Math.floor(t * 5) & 1); for (let k = 1; k < 5; k++) scr.set(x + k * 5 + 2, y + k * 2, R.yellow[0]); }
        else if (s < DECOY.s + 30) { const x = Math.round(route(DECOY.s)) + DECOY.x - camX, y = rowOf(DECOY.s); scr.set(x - 1, y - 1, R.red[1]); scr.set(x + 1, y + 1, R.red[1]); scr.set(x + 1, y - 1, R.red[1]); scr.set(x - 1, y + 1, R.red[1]); scr.set(x, y, R.red[1]); }
      }

      list.length = 0;
      for (const th of things) if (th.x + 40 > camX && th.x - 40 < camX + VW) list.push(th);
      list.sort((a, b) => b.s - a.s);
      for (const th of list) {
        const sx = th.x - camX, sy = rowOf(th.s);
        if (th.tree) for (const part of th.tree.parts) scr.blit(part.bm, sx + part.x, sy + part.y); else scr.put(th.bm, sx, sy, false);
      }
      // The pika shuttles between its two rocks with flowers for its haystack.
      { const u = frac(t / 6), hopT = u < 0.1 ? u / 0.1 : u < 0.5 ? 1 : u < 0.6 ? 1 - (u - 0.5) / 0.1 : 0, eep = st.eep && t - st.eep < 0.5; scr.put(pikaBM[u >= 0.5 ? 1 : 0], pikaX + hopT * 22 - camX, rowOf(-12) - pikaRock.h + 4 - Math.round(Math.sin(hopT * Math.PI) * 6) + lerp(0, 6, hopT) - (eep ? 2 : 0), u > 0.5 && u < 0.62); }
      // Swifts work the face.
      for (let k = 0; k < 4; k++) { const a = t * (0.7 + k * 0.13) + k * 2; scr.put(swift[(Math.floor(t * 7) + k) & 1], RX - 120 + k * 60 + Math.sin(a) * 90 - camX, rowOf(110 + k * 70 + Math.sin(a * 1.7) * 30), Math.cos(a) < 0); }

      // Himself.
      const mx = route(s) - camX, my = rowOf(s);
      let bm, by = my, bx = mx, flip = false;
      const stopId = env.shown && !env.moving ? env.shown : null;
      if (me.mode === 'walk' || me.mode === 'out') {
        const u = me.mode === 'walk' ? me.u : 1 - me.u; bx = mx - 62 * (1 - u); by = rowOf(-6 - 2 * (1 - u));
        bm = env.moving ? run.side[Math.floor(u * 62 / 4.2) % 6] : run.sideIdle[0]; flip = me.mode === 'out';
      } else if (stopId && stand[stopId]) {
        bm = stand[stopId]; by = rowOf(stopId === 'summit' ? HS + 4 : s) + 0;
      } else if (me.mode === 'fall') bm = backFig('wall', { hands: [[-8, -13 - (Math.floor(t * 20) & 1)], [8, -14]], feet: [[-7, 9], [7, 8 + (Math.floor(t * 20) & 1)]], tilt: 1 });
      else if (me.mode === 'hang') { const sw = Math.round(Math.sin(me.u * 9) * 3 * (1 - me.u)); bx += sw; bm = backFig('wall', { hands: [[-1, -13], [1, -10]], feet: [[-4, 12], [4, 11]] }); by += Math.round(Math.sin(me.u * 12) * 2 * (1 - me.u)); }
      else if (me.mode === 'rappel') { const hop = frac(tau * 2.2); bm = backFig('wall', { hands: [[-1, -5], [2, 1]], feet: [[-7, hop < 0.5 ? 4 : 7], [7, hop < 0.5 ? 4 : 7]], headY: 1 }); bx += 1; }
      else {
        const l = limbs(s, s < H1 - 4);
        if (me.mode === 'roof') { const sw = Math.round(Math.sin(tau * 9) * 3); l.feet = [[-3 + sw, 12], [3 + sw, 11]]; }
        if (s >= HS - 8) { bm = stand.idle; by = rowOf(HS + 4); } else bm = backFig('wall', l);
      }
      if ((me.mode === 'climb' || me.mode === 'roof') && !stopId && s < HS - 8) { /* drawn above */ }
      scr.put(bm, bx, by + (bm === stand.idle || (stopId && stand[stopId]) ? 0 : 0), flip);
      focus.x = Math.round(bx); focus.y = Math.round(by) - 10;
      // The flag goes in on the summit and stays.
      if (tau >= 15.5 || env.done.stack) scr.blit(flag[Math.floor(t * 5) & 1], Math.round(route(HS)) + 9 - camX, rowOf(HS + 4) - 15);
    }
  };
}
