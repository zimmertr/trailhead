// Sideproject Spires, base camp: the whole massif as an isometric diorama, a slab of mountain
// lifted out of the range. Six summits stand on it, one per project, with the glacier running out
// between them to the tents. Click a summit and he sets off. The diorama is drawn to fit the
// screen it is on, at the same pixel size as everything else.
import { clamp, lerp, smooth, frac, sq, rng, hash, vnoise, fbm, bayer, R, RAMP_OF, INK, pick, BM, outline } from './core.js';
import { makeTent, makeCloud, makeFlag } from './sprites.js';
import { goat, speck } from './fauna.js';
import { makeRunner, frontFig } from './tj.js';

// Where each summit stands on the slab (i to the right-front, j to the left-front), how tall
// and how wide it is as a share of the slab, and what it is called.
export const SPIRES = [
  { id: 'bluebird', name: 'Bluebird Forecast', i: 0.2, j: 0.2, h: 1.0, w: 0.54 },
  { id: 'tks', name: 'TJs-Kubernetes-Service', i: 0.62, j: 0.07, h: 0.76, w: 0.42 },
  { id: 'hevy-garmin-sync', name: 'hevy-garmin-sync', i: 0.07, j: 0.62, h: 0.74, w: 0.42 },
  { id: 'trailhead', name: 'trailhead', i: 0.98, j: 0.52, h: 0.5, w: 0.32 },
  { id: 'yggdrasil', name: 'yggdrasil', i: 0.52, j: 0.98, h: 0.52, w: 0.32 },
  { id: 'kubernetes-manifests', name: 'Kubernetes-Manifests', i: 0.46, j: 0.4, h: 0.46, w: 0.3 }
];

function build(A) {
  const D = Math.round(A * 0.3), topH = Math.round(A * 1.02), Wd = A * 2 + 8, Hd = topH + A + D + 26;
  const b = new BM(Wd, Hd), cx = A + 4, cy = topH + (A >> 1);
  const pos = (i, j) => [cx + (i - j) * A, cy + (i + j - 1) * A / 2];
  // The top of the slab: ice down the middle, snow under the summits, rock and a little meadow at the front.
  for (let y = cy - (A >> 1) - 2; y <= cy + (A >> 1) + 2; y++) for (let x = 0; x < Wd; x++) {
    const u = (x - cx) / A, v = (y - cy) / (A / 2) + 1, i = (u + v) / 2, j = (v - u) / 2;
    const e = 0.012 * (vnoise(x / 5, y / 5, 200) - 0.5) * 6;
    if (i < e || j < e || i > 1 - e || j > 1 - e) continue;
    const flow = Math.abs(i - j - 0.2 + 0.16 * (i + j - 1) + 0.1 * Math.sin((i + j) * 5)), along = (i + j) / 2;
    const ice = flow < 0.17 + 0.06 * vnoise(i * 9, j * 9, 201) && along > 0.2 && along < 0.86;
    const front = smooth(0.74, 0.86, along + 0.05 * vnoise(x / 7, y / 7, 202));
    let c;
    if (ice) { const cre = frac(along * 13 + flow * 2 + 0.3 * vnoise(x / 8, y / 8, 203)); c = cre < 0.1 && vnoise(x / 6, y / 3, 204) > 0.4 ? R.glac[cre < 0.05 ? 0 : 2] : pick('glac', 0.9 - flow * 1.2 + 0.2 * (vnoise(x / 4, y / 4, 205) - 0.5), x, y, 0.6); }
    else if (front > 0.5) c = i > 0.72 && j < 0.86 && vnoise(x / 9, y / 6, 206) > 0.42 ? pick('grass', 0.5 + 0.4 * (vnoise(x / 5, y / 4, 207) - 0.5), x, y, 0.4) : pick('rock', 0.55 + 0.4 * (hash(x >> 1, y >> 1, 208) - 0.5), x, y);
    else c = hash(x >> 1, y >> 1, 209) < 0.012 ? R.rock[2] : pick('snow', 0.82 - (i - j) * 0.3 + 0.2 * (vnoise(x / 6, y / 4, 210) - 0.5), x, y, 0.5);
    b.set(x, y, c);
  }
  // The cut sides: a skin of ice and snow over bands of granite, ending raggedly underneath.
  for (let x = cx - A; x <= cx + A; x++) {
    const left = x < cx, ey = cy + (left ? (x - (cx - A)) : (cx + A - x)) * 0.5;
    const t = Math.abs(x - cx) / A, dep = D * (0.55 + 0.75 * (1 - t) * (0.6 + 0.4 * vnoise(x / 9, 1, 211))) + 7 * Math.max(0, vnoise(x / 3.4, 2, 212) - 0.5) * 2;
    const iceEdge = Math.abs(t - 0.06) < 0.2;
    for (let y = Math.round(ey) + 1; y < ey + dep; y++) {
      const d = y - ey, band = Math.floor(d / 5 + 0.8 * vnoise(x / 22, y / 30, 213) + (left ? 0 : 0.5));
      let c;
      if (d < (iceEdge ? 8 + 3 * vnoise(x / 2, 3, 214) : 3)) c = iceEdge ? pick('glac', (left ? 0.55 : 0.3) - d * 0.03, x, y) : R.snow[left ? 3 : 2];
      else c = pick('granite', (left ? 0.62 : 0.34) + (band & 1 ? 0.12 : -0.06) + 0.14 * (vnoise(x / 3, y / 3, 215) - 0.5) - d / dep * 0.2, x, y, 0.8);
      b.set(x, y, c);
    }
  }
  // The summits, the ones at the back first.
  const geo = [];
  for (const [n, sp] of SPIRES.map((s, k) => [k, s]).sort((a, c) => (a[1].i + a[1].j) - (c[1].i + c[1].j))) {
    const [bx, by] = pos(sp.i, sp.j), h = Math.round(sp.h * A), w = Math.round(sp.w * A), top = by - h, sl = h / (w / 2);
    const sky = x => { const dx = Math.abs(x - bx); return top + dx * sl * (x < bx ? 1.06 : 0.94) * (1 - 0.22 * smooth(0, w * 0.5, dx)) + 5 * (1 - Math.exp(-dx / 2.5)) + 7 * (vnoise(x / 4.5, n * 3.1, 216) - 0.5) * Math.min(1, dx / 4) - 4 * Math.max(0, vnoise(x / 2.2, n, 217) - 0.64) / 0.36 * Math.min(1, dx / 5); };
    for (let x = Math.round(bx - w * 0.62); x <= bx + w * 0.62; x++) {
      const t0 = Math.round(sky(x)), dxn = (x - bx) / (w * 0.6), foot = by + (w * 0.2) * Math.sqrt(Math.max(0, 1 - dxn * dxn)) * 0.9;
      for (let y = t0; y <= foot; y++) {
        const face = x < bx ? 0.2 : -0.2, d = y - t0;
        const fr = frac((x - bx) / Math.max(3, y - top) * 2.4 + 0.3 * vnoise(x / 6, y / 6, 218 + n));
        let v = 0.44 + face + (fr < 0.5 ? 0.12 : -0.12) + 0.18 * (vnoise(x / 3, y / 5, 219) - 0.5);
        if (Math.abs(fr - 0.5) > 0.45) v += 0.18;
        const rock = Math.abs(x - bx - 3 * Math.sin(y / 11 + n * 2)) < 1.5 + (y - top) * 0.085 + 2.5 * (vnoise(x / 3, y / 5, 220 + n) - 0.5);
        const ice = (!rock && d > 11 + 8 * vnoise(x / 7, 4, 221)) || (fr > 0.62 && fr < 0.76 && d > 6 && !rock) || (x < bx && d > 4 && vnoise(x / 6 + n * 9, y / 7, 222) > 0.66);
        let c;
        if (ice) { const cre = frac(d / 9 + 0.3 * Math.sin(x / 9 + n)); c = d > 16 && cre < 0.1 && vnoise(x / 8, y / 3, 223) > 0.45 ? R.glac[cre < 0.05 ? 0 : 2] : pick('glac', 0.84 + face * 0.75 + (fr < 0.5 ? 0.05 : -0.08) + 0.2 * (vnoise(x / 4, y / 4, 224) - 0.5), x, y, 0.6); }
        else c = d < 1 ? R.granite[0] : pick('granite', v * 0.78, x, y, 0.8);
        b.set(x, y, c);
      }
    }
    geo[n] = { id: sp.id, name: sp.name, x: Math.round(bx), top, by: Math.round(by), w, h };
  }
  outline(b, INK);
  const camp = pos(0.84, 0.86);
  return { b, cx, cy, A, D, geo, camp: [Math.round(camp[0]), Math.round(camp[1])], pos };
}

export function makeCamp() {
  let dio = null, forA = 0, org = { x: 0, y: 0 };
  const run = makeRunner('alpine'), idle = frontFig('alpine');
  const tents = [makeTent('tent'), makeTent('red')], flags = [makeFlag(0), makeFlag(1)];
  const goats = { stand: goat('stand'), look: goat('look'), kid: goat('stand', true) }, bird = [speck(0), speck(1)];
  const clouds = [0, 1, 2, 3, 4].map(i => ({ bm: makeCloud(630 + i), x: i * 150, y: 0.12 + (i % 3) * 0.24 + i * 0.03, v: 2 + i * 1.3 }));
  const focus = { x: 0, y: 0 };

  function fit(scr) {
    const room = scr.narrow ? scr.VH * 0.56 : scr.VH - 44;
    const A = Math.round(clamp(Math.min((scr.VW * (scr.narrow ? 1 : 0.62) - 14) / 2, (room - 30) / 1.8), 90, 230));
    if (A !== forA) { dio = build(A); forA = A; }
    org.x = Math.round((scr.narrow ? scr.VW / 2 : scr.VW * 0.64) - dio.cx);
    org.y = Math.round((scr.narrow ? scr.VH * 0.03 : 8) + (room - dio.b.h) / 2);
  }

  return {
    name: 'camp',
    dur: () => 1.4,
    stops: () => [{ id: 'base-camp', at: 1 }],
    elev: () => 0,
    enter(scr) { fit(scr); },
    focus: () => focus,
    // Where each summit's name goes, for the page to label them.
    labels() { return dio ? dio.geo.map(g => ({ id: g.id, name: g.name, x: org.x + g.x, y: Math.max(13, org.y + g.top - 4) })) : []; },
    pick(sx, sy) {
      if (!dio) return null;
      const x = sx - org.x, y = sy - org.y;
      for (const g of [...dio.geo].sort((a, c) => c.by - a.by)) if (y > g.top - 3 && y < g.by && Math.abs(x - g.x) < 4 + (y - g.top) / g.h * g.w * 0.55) return { label: g.name, x: org.x + g.x, y: org.y + g.top - 6, act: 'spire:' + g.id };
      return null;
    },
    draw(scr, env, arg, q) {
      fit(scr);
      const { VW, VH, fb } = scr, { t } = env, bob = Math.round(Math.sin(t * 0.5) * 1.5), oy = org.y + bob;
      const sb = R.skyband;
      for (let y = 0; y < VH; y++) {
        const f = clamp(y / VH * 1.05, 0, 1) * (sb.length - 1), b0 = Math.floor(f), e = f - b0, row = y * VW;
        if (e < 0.72 || b0 >= sb.length - 1) fb.fill(sb[b0], row, row + VW); else for (let x = 0; x < VW; x++) fb[row + x] = sb[b0 + (bayer(x, y) < (e - 0.72) / 0.28 ? 1 : 0)];
      }
      // A sea of cloud far below, and clouds drifting past at its own height.
      for (let y = Math.round(VH * 0.7); y < VH; y++) { const row = y * VW, d = (y - VH * 0.7) / (VH * 0.3); for (let x = 0; x < VW; x++) { const n = fbm((x + t * (3 + d * 5)) / (50 + d * 40), y / 14, 230, 3); if (n > 0.58 - d * 0.22) fb[row + x] = n > 0.66 - d * 0.2 ? R.white[1] : R.sky[4]; } }
      for (const c of clouds) scr.blit(c.bm, ((c.x + t * c.v) % (VW + 140)) - 70, c.y * VH * 0.6);
      for (let k = 0; k < 3; k++) { const bx = ((t * 14 + k * 17) % (VW + 120)) - 60; scr.put(bird[(Math.floor(t * 4) + k) & 1], bx + [0, 9, -7][k], VH * 0.16 + [0, 5, 9][k], false); }

      scr.blit(dio.b, org.x, oy);
      // Tents and their smoke, flags on the summits he has stood on, goats on a shoulder.
      const [cxp, cyp] = dio.camp;
      scr.put(tents[0], org.x + cxp - 14, oy + cyp - 3, false); scr.put(tents[1], org.x + cxp + 12, oy + cyp + 2, false);
      for (let k = 0; k < 5; k++) { const age = frac(t * 0.35 + k / 5); scr.set(Math.round(org.x + cxp - 4 + age * 8 + Math.sin(age * 6 + k)), Math.round(oy + cyp - 8 - age * 22), age < 0.5 ? R.white[1] : R.white[0]); }
      for (const g of dio.geo) if (env.done['spire:' + g.id]) scr.blit(flags[Math.floor(t * 5) & 1], org.x + g.x - 2, oy + g.top - 14);
      { const [gx, gy] = dio.pos(0.74, 0.62); scr.put(frac(t / 5) < 0.6 ? goats.stand : goats.look, org.x + gx, oy + gy, true); scr.put(goats.kid, org.x + gx + 15, oy + gy + 3, frac(t / 3.3) < 0.5); }

      // He walks in from the edge of the slab and waits by the tents.
      const mx = org.x + cxp + Math.round((1 - q) * 30), my = oy + cyp + 8 + Math.round((1 - q) * 6);
      scr.shadow(mx, my, 5, 1);
      scr.put(q < 1 && env.moving ? run.side[Math.floor(q * 30 / 4.2) % 6] : idle, mx, my, q < 1);
      focus.x = mx; focus.y = my - 14;
    }
  };
}
