// About Lake, part two: out of the trees at the lake itself, turquoise under a huge sweeping
// peak. He runs left to right along the near shore, stops for the view with the map out, and
// again at the boulder where his journal lies open.
import { clamp, lerp, smooth, frac, sq, rng, hash, vnoise, fbm, bayer, R, DAY, INK, LIGHT, pick, BM, outline, thick, windAt } from './core.js';
import { Strip, drawStrip, baseline } from './side.js';
import { makeFir, makeSpruce, makeBoulder, makeCloud, makeSmallSign, makeBush } from './sprites.js';
import { marmot, speck } from './fauna.js';
import { makeRunner, sideFig } from './tj.js';

const SW = 1640, X0 = 500, LEN = 624, DUR = 8;
const D_MAP = 125, D_NOTE = 437, D_MARMOT = 276;
const FAR = -50; // the far shore, measured up from the trail

const shore = x => -9 + Math.round(2.5 * Math.sin(x / 37) + 3 * vnoise(x / 15, 3, 120));
const g = x => Math.round(2 * Math.sin(x / 120 + 1));

// The peak: the same snowy pyramid that stands behind the lake on the map, now filling the sky.
// One summit, long sweeping ridges with lesser tops on its shoulders, ridges fanning from the top,
// snow above a ragged line and down the gullies, rock below, forest at its foot.
const PH = 236;
function paintPeak(S) {
  const W = S.w, H = PH, sx = 600;
  const top = x => {
    const dx = Math.abs(x - sx);
    return 3 + 206 * (1 - Math.exp(-Math.pow(dx / (x < sx ? 170 : 150), 0.85))) - 40 * Math.exp(-sq((x - 392) / 30)) - 30 * Math.exp(-sq((x - 800) / 24)) - 22 * Math.exp(-sq((x - 955) / 34)) - 26 * Math.exp(-sq((x - 215) / 38)) - 16 * Math.exp(-sq((x - 1100) / 40))
      + 12 * (vnoise(x / 8, 1, 121) - 0.5) * Math.min(1, dx / 8) + 5 * (vnoise(x / 2.6, 2, 122) - 0.5) * Math.min(1, dx / 5);
  };
  for (let x = 0; x < W; x++) {
    const t0 = Math.round(top(x)); if (t0 >= H) continue;
    for (let y = Math.max(0, t0); y < H; y++) {
      const face = x < sx ? 0.2 : -0.18;
      const fr = frac((x - sx) / Math.max(3, y) * 5.2 + 0.4 * vnoise(x / 13, y / 13, 123));
      let v = 0.5 + face + (fr < 0.5 ? 0.13 : -0.13) + 0.16 * (vnoise(x / 5, y / 7, 124) - 0.5);
      if (Math.abs(fr - 0.5) > 0.45) v += 0.2;
      const snowLine = 112 + 34 * vnoise(x / 22, 3, 125) - Math.abs(x - sx) * 0.1 + (fr < 0.5 ? 14 : -9);
      const gully = fr > 0.6 && fr < 0.74 && y < 186 && vnoise(x / 30, y / 40, 126) > 0.3;
      const ledge = y > snowLine && y < 190 && vnoise(x / 7, y / 1.8, 127) > 0.85 && x < sx + 40;
      const forest = y > H - 30 - 16 * vnoise(x / 9, 7, 128) - 8 * vnoise(x / 3, 8, 129);
      let c;
      if (forest) c = pick('conifer', 0.2 + 0.55 * hash(x, y, 130) - (y > H - 12 ? 0.15 : 0), x, y);
      else if (y < snowLine || gully || ledge) c = v < 0.36 ? pick('glac', v + 0.42, x, y, 0.6) : pick('snow', v + 0.15, x, y);
      else c = pick('rock', v - 0.05 + 0.1 * (vnoise(x / 2.2, y / 9, 131) - 0.5), x, y);
      S.set(x, y - H, c);
    }
    S.set(x, Math.max(0, t0) - H - 1, INK);
  }
}

function miniFir(S, x, y, h, c0) {
  for (let j = 0; j < h; j++) { const hw = Math.max(0, (j + 1) * 0.42 * (j % 3 === 2 ? 0.7 : 1)); for (let i = -Math.round(hw); i <= Math.round(hw); i++) S.set(x + i, y - h + j, R.conifer[clamp(c0 + (i < 0 ? 1 : 0) - (j % 3 === 2 ? 1 : 0), 0, 4)]); }
}

export function makeLakeside() {
  const rand = rng(57);

  // Far ranges, the peak, and the far shore with its talus and trees.
  const range = new Strip(900, 110, 4);
  for (let x = 0; x < 900; x++) {
    const top = -52 - 46 * fbm(x / 70, 1.3, 134, 4) - 10 * Math.sin(x / 41);
    for (let y = Math.round(top); y < 4; y++) { const sl = fbm((x + 2) / 70, 1.3, 134, 4) - fbm((x - 2) / 70, 1.3, 134, 4); range.set(x, y, y - top < 4 + 3 * vnoise(x / 5, 1, 135) && top < -74 ? R.farsnow[sl > 0 ? 1 : 0] : pick('far', 0.5 + sl * 9 + (y - top) * -0.004, x, y)); }
  }
  const peak = new Strip(1240, PH + 4, 2); paintPeak(peak);
  const farS = new Strip(1400, 60, 4);
  for (let x = 0; x < 1400; x++) {
    const top = -9 - 9 * fbm(x / 36, 2, 136, 3) - 6 * Math.max(0, Math.sin(x / 57 + 1));
    for (let y = Math.round(top); y < 2; y++) farS.set(x, y, y > -2 ? R.gold[5] : fbm(x / 14, y / 5, 137, 3) > 0.52 ? pick('rock', 0.62 + 0.3 * (hash(x >> 1, y >> 1, 138) - 0.5), x, y, 0.5) : pick('conifer', 0.3 + 0.3 * hash(x, y, 139), x, y));
  }
  for (let n = 0; n < 900; n++) { const x = rand() * 1400, cl = fbm(x / 80, 7, 140, 3); if (cl < 0.36) continue; miniFir(farS, Math.round(x), Math.round(-3 - rand() * 12), 8 + (rand() * 12 * cl | 0), rand() < 0.5 ? 1 : 2); }
  // The near shore: slabs and gravel at the water, the trail, then meadow down to the bottom.
  const main = new Strip(SW, 24, 240);
  for (let x = 0; x < SW; x++) {
    const sy = shore(x), gy = g(x);
    for (let y = sy; y < 240; y++) {
      const r = y - gy; let c;
      const slab = fbm(x / 34, y / 15, 141, 3) > 0.62 - smooth(6, -8, r) * 0.22, gravel = fbm(x / 13, y / 7, 142, 3);
      if (y - sy < 2) c = y === sy ? R.tarn[5] : R.rock[1];
      else if (r >= -3 && r <= 4) c = hash(x, y, 143) < 0.07 ? R.rock[2] : pick('dirt', 0.62 - Math.abs(r - 0.5) * 0.06 + 0.25 * (vnoise(x / 5, y / 2, 144) - 0.5), x, y, 0.7);
      else if (slab) c = Math.abs(frac(x / 31 + y / 11 + vnoise(x / 30, y / 30, 145)) - 0.5) < 0.016 ? R.rock[1] : fbm(x / 34, (y + 2) / 15, 141, 3) <= 0.6 - smooth(6, -8, r) * 0.25 ? R.rock[1] : pick('rock', 0.86 - (y - sy) * 0.0012 + 0.16 * (vnoise(x / 7, y / 4, 146) - 0.5), x, y, 0.5);
      else if (r < -3 && gravel > 0.5) c = pick('rock', 0.7 + 0.3 * (hash(x, y, 147) - 0.5), x, y);
      else c = pick('grass', 0.58 + 0.5 * (fbm(x / 22, y / 12, 148, 3) - 0.5) + 0.12 * (hash(x >> 1, y >> 1, 149) - 0.5) - smooth(60, 230, r) * 0.25, x, y, 0.3);
      main.set(x, y, c);
    }
  }
  // Tufts, heather and flowers in the meadow.
  const isGrass = (x, y) => { const c = main.get(x, y); return c >= R.grass[0] && c <= R.grass[4]; };
  for (let n = 0; n < 5000; n++) { const x = (rand() * SW) | 0, y = (-4 + rand() * 240) | 0; if (!isGrass(x, y) || !isGrass(x, y - 2)) continue; main.set(x, y - 2, R.grass[4]); main.set(x - 1, y - 1, R.grass[3]); main.set(x + 1, y - 1, R.grass[3]); main.set(x, y, R.grass[1]); }
  for (let n = 0; n < 260; n++) {
    const cx = rand() * SW, cy = 8 + rand() * 220, type = rand(), count = 5 + (rand() * 12 | 0);
    for (let k = 0; k < count; k++) {
      const x = Math.round(cx + (rand() - 0.5) * 20), y = Math.round(cy + (rand() - 0.5) * 10); if (!isGrass(x, y) || !isGrass(x, y - 1)) continue;
      if (type < 0.4) { main.set(x, y - 1, R.lupine[2]); main.set(x, y, R.lupine[1]); }
      else if (type < 0.65) { main.set(x, y - 1, R.red[2]); main.set(x, y, R.red[1]); }
      else if (type < 0.85) { main.set(x, y, R.pink[1]); main.set(x + 1, y, R.pink[2]); }
      else main.set(x, y, R.white[1]);
    }
  }

  const things = [];
  const boulders = [3, 4, 5, 6, 8, 10, 12].map((r, i) => makeBoulder(150 + i, r));
  const firs = Array.from({ length: 6 }, (_, i) => makeFir(310 + i)), spruces = Array.from({ length: 4 }, (_, i) => makeSpruce(230 + i));
  const bushes = [0, 1, 2].map(i => makeBush(740 + i, 'heather')).concat([0, 1].map(i => makeBush(750 + i, 'huck')));
  const xMap = X0 + D_MAP, xNote = X0 + D_NOTE, xMarmot = X0 + D_MARMOT;
  const keep = x => Math.abs(x - xMap) > 46 && Math.abs(x - xNote) > 40 && Math.abs(x - xMarmot) > 30;
  // Behind the trail only low things, so the lake and the peak stay in view.
  for (let n = 0; n < 60; n++) { const x = rand() * SW; if (!keep(x)) continue; things.push({ bm: boulders[(rand() * 4) | 0], x: Math.round(x), y: shore(x) + 3 + Math.round(rand() * 3) }); }
  for (let n = 0; n < 12; n++) { const x = rand() * SW; if (Math.abs(x - (X0 + LEN / 2)) < 250 || !keep(x)) continue; const k = 1 + (rand() * 3 | 0); for (let j = 0; j < k; j++) things.push({ tree: firs[(rand() * 6) | 0], x: Math.round(x + j * 11 + rand() * 5), y: g(x) - 5 + Math.round(rand() * 2) }); }
  for (let n = 0; n < 150; n++) { const x = rand() * SW, y = 8 + sq(rand()) * 220, k = rand(); things.push(k < 0.45 ? { bm: boulders[Math.min(6, (rand() * 4 + y / 60) | 0)], x: Math.round(x), y: Math.round(y) } : { bm: bushes[(rand() * 5) | 0], x: Math.round(x), y: Math.round(y) }); }
  for (let n = 0; n < 34; n++) { const x = rand() * SW, y = 84 + rand() * 150; things.push({ tree: rand() < 0.6 ? spruces[(rand() * 4) | 0] : firs[(rand() * 6) | 0], x: Math.round(x), y: Math.round(y) }); }
  const marmotRock = makeBoulder(161, 11); things.push({ bm: marmotRock, x: xMarmot, y: shore(xMarmot) + 5 });
  const noteRock = makeBoulder(162, 9);
  { const b = noteRock, x = b.ox - 1, y = b.oy - 13; for (let dx = 0; dx < 7; dx++) { b.set(x + dx, y, dx === 3 ? R.white[0] : R.white[1]); b.set(x + dx, y + 1, dx === 3 ? R.red[0] : R.white[0]); } b.set(x - 1, y + 1, R.red[1]); b.set(x + 7, y + 1, R.red[1]); b.set(x + 5, y - 1, R.navy[1]); }
  things.push({ bm: noteRock, x: xNote + 15, y: g(xNote) - 4 });
  const signX = X0 + 40; things.push({ bm: makeSmallSign(), x: signX, y: g(signX) - 5 });
  const clouds = [0, 1, 2, 3].map(i => ({ bm: makeCloud(610 + i), x: i * 210, y: 30 + (i & 1) * 34 + i * 9, v: 2.5 + i }));

  const run = makeRunner('trail');
  const mapFig = sideFig('trail', { lean: 0, look: 'down', hands: [[5, 1], [4, 2]], elbowFwd: false, held: (b, sh) => { for (let y = 0; y < 5; y++) for (let x = 0; x < 6; x++) b.set(sh[0] + 4 + x, sh[1] - 1 + y, (x + y) % 4 === 1 ? R.moss[5] : x === 3 ? R.white[0] : R.white[1]); b.set(sh[0] + 6, sh[1] + 1, R.tarn[3]); b.set(sh[0] + 8, sh[1] + 2, R.red[1]); } });
  const writeFig = [0, 1].map(f => sideFig('trail', { lean: 2, look: 'down', hands: [[6, 3 + f], [4, 4]], held: (b, sh, hands) => { b.set(sh[0] + 7, sh[1] + 2 + f, R.navy[0]); } }));
  const sit = [0, 1].map(f => sideFig('trail', { feet: [[6, 3], [5, 4]], crouch: 5, lean: 0, hands: f ? [[4, -2], [2, 3]] : [[3, 3], [2, 3]] }));
  const marm = { sun: marmot('sun'), up: marmot('up') }, bird = [speck(0), speck(1)];

  const st = {}, focus = { x: 0, y: 0 };
  let cam = 0, last = { camX: 0, base: 0 }, plunge = -99, whistled = false;
  const list = [];
  const xOf = q => X0 + q * LEN;

  return {
    name: 'lakeside',
    dur: () => DUR,
    stops: () => [{ id: 'mountains', at: D_MAP / LEN }, { id: 'note', at: D_NOTE / LEN }],
    elev: (arg, q) => -g(xOf(q)) * 1.5,
    enter(scr, arg, q) { cam = xOf(q); st.y = null; plunge = -99; },
    focus: () => focus,
    pick(sx, sy) {
      const wx = sx + last.camX, wy = sy - last.base;
      if (Math.abs(wx - signX) < 8 && wy > g(signX) - 22 && wy < g(signX) - 2) return { label: 'Cold Start Cove', x: signX - last.camX, y: last.base + g(signX) - 24 };
      if (wy > FAR + 2 && wy < shore(wx) - 1) return { label: 'Cold plunge', x: sx, y: sy - 6, act: 'plunge' };
      if (Math.abs(wx - xMarmot) < 12 && wy > shore(xMarmot) - 22 && wy < shore(xMarmot) + 4) return { label: 'Hoary marmot', x: xMarmot - last.camX, y: last.base + shore(xMarmot) - 24, act: 'marmot' };
      return null;
    },
    act(id, env) {
      if (id === 'plunge' && !env.running && env.t - plunge > 6.5) { plunge = env.t; env.sfx('run'); return true; }
      if (id === 'marmot') { whistled = env.t; env.sfx('whistle'); return true; }
      return false;
    },
    draw(scr, env, arg, q) {
      const { VW, VH, fb } = scr, { t, tq } = env;
      const mx = xOf(q), d = q * LEN, my = g(mx);
      const anchor = scr.narrow ? 0.5 : 0.56;
      cam += (mx - cam) * Math.min(1, env.dt * 8);
      const camX = Math.round(cam - VW * anchor + env.look.x * 0.5), base = baseline(scr, env.shown, st);
      last = { camX, base };
      if (env.running) plunge = -99;

      // Sky, lightest at the horizon.
      const sb = R.skyband, hor = base + FAR;
      for (let y = 0; y < Math.min(VH, hor + 2); y++) {
        const f = clamp(1 - (hor - y) / 250, 0, 1) * (sb.length - 1), b0 = Math.floor(f), e = f - b0, row = y * VW;
        if (e < 0.72 || b0 >= sb.length - 1) fb.fill(sb[b0], row, row + VW); else for (let x = 0; x < VW; x++) fb[row + x] = sb[b0 + (bayer(x, y) < (e - 0.72) / 0.28 ? 1 : 0)];
      }
      for (const c of clouds) scr.blit(c.bm, ((c.x + t * c.v) % (VW + 140)) - 70, Math.max(4, hor - PH - 70) + c.y * (scr.narrow ? 1 : 0.5));
      drawStrip(scr, range, camX * 0.06 + 100, hor);
      const peakX = camX * 0.2 + 420 - VW * 0.5;
      drawStrip(scr, peak, peakX, hor + clamp(PH + 12 - hor, 0, 84));
      const farX = camX * 0.45 + 200;
      drawStrip(scr, farS, farX, hor);

      // The lake: turquoise, darker under the far shore, with the peak upside down in it.
      const tarn = R.tarn, pw = peak.w, fw = farS.w;
      for (let y = Math.max(0, hor + 1); y < Math.min(VH, base + 2); y++) {
        const dy = y - hor, row = y * VW, depth = dy / -FAR;
        const rip = Math.round(1.5 * Math.sin(dy * 1.9 + t * 1.4) * Math.min(1, dy / 8));
        const py = -Math.round(dy * 4.6) - 1 - clamp(PH + 12 - hor, 0, 84), fy = -Math.round(dy * 1.4) - 1;
        for (let x = 0; x < VW; x++) {
          const f = farS.get(((Math.round(farX) + x + rip) % fw + fw) % fw, fy);
          const src = f || peak.get(((Math.round(peakX) + x + rip) % pw + pw) % pw, py);
          let v = 0.62 - 0.3 * smooth(0.55, 0, depth) + 0.07 * Math.sin(x / 19 + dy);
          if (src) { const lum = (0.3 * DAY[src][0] + 0.59 * DAY[src][1] + 0.11 * DAY[src][2]) / 255; v = lerp(v, 0.15 + lum * 0.75, f ? 0.8 : 0.62); }
          if (dy < 2) v = 0.05;
          fb[row + x] = tarn[clamp(Math.round(v * 5 + (bayer(x, y) - 0.5) * 0.8), 0, 5)];
        }
        if ((dy & 3) === 1) for (let x = (Math.floor(t * 3) + dy * 7) % 23; x < VW; x += 23 + (dy % 5)) { const i = row + x; for (let k = 0; k < 3 + (dy % 4); k++) if (x + k < VW) fb[i + k] = LIGHT[fb[i + k]]; }
      }
      // Sun on the water, and now and then a trout rises.
      for (let k = 0; k < 40; k++) {
        const sx = Math.round((hash(k, 1, 150) * 600 - camX * 0.7) % VW + VW) % VW, sy = hor + 8 + Math.round(hash(k, 2, 150) * (-FAR - 20));
        if (frac(t * 0.8 + hash(k, 3, 150)) < 0.25 && sy < base + shore(camX + sx) - 2) { scr.set(sx, sy, R.white[1]); scr.set(sx + 1, sy, tarn[5]); }
      }
      { const k = Math.floor(t / 5.3), u = frac(t / 5.3) * 5.3, rx = Math.round(hash(k, 1, 151) * VW), ry = hor + 14 + Math.round(hash(k, 2, 151) * 18); if (u < 1.6) { const r = 1 + u * 5; for (let a = 0; a < 24; a++) { const x = rx + Math.round(Math.cos(a / 24 * 6.283) * r), y = ry + Math.round(Math.sin(a / 24 * 6.283) * r * 0.35); if (y < base + shore(camX + x) - 1 && y > hor + 2) scr.set(x, y, tarn[5]); } } }
      // A loon and her chick paddle along the far side, leaving a wake.
      for (let k = 0; k < 2; k++) {
        const lx = Math.round(((260 - k * 13 + t * 3.2 - camX * 0.7) % (VW + 80) + VW + 80) % (VW + 80)) - 40, ly = hor + 20 + (Math.floor(t * 1.5 + k) & 1), sm = k ? 1 : 0;
        if (ly > base + shore(camX + lx) - 6) continue;
        for (let j = 0; j < 6 - sm * 2; j++) scr.set(lx + j, ly, INK);
        for (let j = 1; j < 5 - sm * 2; j++) scr.set(lx + j, ly - 1, (j + k) & 1 ? R.navy[1] : R.white[0]);
        scr.set(lx + 5 - sm * 2, ly - 1, R.white[1]); scr.set(lx + 5 - sm * 2, ly - 2, INK); scr.set(lx + 6 - sm * 2, ly - 2, INK); scr.set(lx + 7 - sm * 2, ly - 2, R.rock[2]);
        for (let j = 0; j < 4; j++) { scr.set(lx - 2 - j * 2, ly + (j & 1), tarn[5]); scr.set(lx - 2 - j * 2, ly - 1 - (j >> 1), tarn[4]); }
      }
      for (let k = 0; k < 3; k++) { const bx = ((t * 16 + k * 13) % (VW + 160)) - 80; scr.put(bird[(Math.floor(t * 4) + k) & 1], bx + [0, 9, -8][k], hor - 120 + [0, 5, 8][k] + 6 * Math.sin(t * 0.6), false); }

      drawStrip(scr, main, camX, base, false, R.grass[1]);

      list.length = 0;
      for (const th of things) { const w = th.tree ? 30 : th.bm.w; if (th.x + w > camX && th.x - w < camX + VW) list.push(th); }
      // The marmot suns itself on its rock and sits up to whistle when he comes by.
      const alert = Math.abs(d - D_MARMOT) < 46 || t - whistled < 1.6;
      if (Math.abs(d - D_MARMOT) < 46 && !whistled && env.running) { whistled = t; env.sfx('whistle'); }
      if (Math.abs(d - D_MARMOT) > 120 && t - whistled > 2) whistled = false;
      list.push({ bm: alert ? marm.up : marm.sun, x: xMarmot + 1, y: shore(xMarmot) + 5 - marmotRock.h + 5, z: shore(xMarmot) + 5.5, flip: d > D_MARMOT });
      list.push({ me: true, x: mx, y: my + 0.5 });
      list.sort((a, b) => (a.z || a.y) - (b.z || b.y));
      const snack = !env.running && env.still > 60 && t - plunge > 8;
      for (const th of list) {
        const sx = th.x - camX, sy = base + th.y;
        if (th.me) {
          const u = t - plunge;
          focus.x = Math.round(sx); focus.y = Math.round(base + my) - 14;
          if (u < 6.4) {
            // The cold plunge: up the bank, in with a splash, a few seconds of regret, and out again.
            const wy = base + shore(mx) - 7, inY = wy - 12;
            if (u < 0.7) scr.put(run.up[Math.floor(u * 12) % 4], sx, lerp(base + my, wy, u / 0.7), false);
            else if (u < 1.0) { const a = (u - 0.7) / 0.3; scr.put(run.up[1], sx, lerp(wy, inY, a) - Math.sin(a * Math.PI) * 9, false); }
            else if (u < 4.6) {
              const bob = Math.round(Math.sin(u * 5) * 1), bm = run.downIdle[0], top = Math.round(inY - 22 + bob);
              for (let j = 0; j < 26; j++) for (let i = 0; i < bm.w; i++) { const c = bm.d[j * bm.w + i]; if (c) scr.set(Math.round(sx) - bm.ox + i + (u > 2 && (Math.floor(u * 14) & 1) ? 1 : 0), top + j, c); }
              for (let r = 0; r < 3; r++) { const rr = ((u - 1) * 9 + r * 6) % 18; for (let a = 0; a < 20; a++) scr.set(Math.round(sx + Math.cos(a / 20 * 6.283) * (5 + rr)), Math.round(top + 26 + Math.sin(a / 20 * 6.283) * (1.5 + rr * 0.3)), tarn[5]); }
              if (u < 1.5) for (let k = 0; k < 10; k++) { const a = (u - 1) / 0.5; scr.set(Math.round(sx + (hash(k, 1, 152) - 0.5) * 26 * a), Math.round(top + 25 - Math.sin(a * Math.PI) * (6 + hash(k, 2, 152) * 12)), R.white[1]); }
            } else if (u < 5.4) scr.put(run.down[Math.floor(u * 12) % 4], sx, lerp(inY, base + my, (u - 4.6) / 0.8), false);
            else { scr.put(run.downIdle[0], sx + (Math.floor(u * 16) & 1), base + my, false); for (let k = 0; k < 4; k++) scr.set(Math.round(sx - 6 + k * 4), Math.round(base + my - 6 + ((u * 20 + k * 5) % 8)), tarn[5]); }
            continue;
          }
          const bm = snack ? sit[Math.floor(t * 1.5) & 1] : env.moving ? run.side[Math.floor(d / 4.2) % 6] : env.shown === 'mountains' ? mapFig : env.shown === 'note' ? writeFig[Math.floor(t * 3) & 1] : run.sideIdle[0];
          scr.shadow(Math.round(sx), Math.round(base + my), 5, 1);
          scr.put(bm, sx, base + my + (snack ? 2 : 0), false);
        } else if (th.tree) {
          for (const part of th.tree.parts) { const [wx, wy] = windAt(th.x + (part.lx || 0), th.y + part.y, tq, part.sway); scr.blit(part.bm, sx + part.x + wx, sy + part.y + wy); }
        } else scr.put(th.bm, sx, sy, th.flip);
      }
    }
  };
}
