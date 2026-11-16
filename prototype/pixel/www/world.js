// The world map: the top-down view of the Trailhead and its three destinations.
import { DEBUG, TAU, clamp, lerp, smooth, frac, sq, rng, hash, vnoise, fbm, bayer, R, RAMP_OF, STEP_OF, INK, SHADE, LIGHT, KIND, pick, BM, outline, makePath, windAt } from './core.js';
import { breeze, veilTable } from './core.js';
import { makeCloud, makeSignpost, makeSmallSign, makeKiosk, makeLookout, makeTent, makeJournal, makeBird, makeFlag } from './sprites.js';
import { SIGNS, NAMES, DEST_NAMES } from './content.js';
import { makeCats } from './cats.js';
import { makeCritters } from './critters.js';
import { makeEvents } from './events.js';
import { makeRunner } from './tj.js';
import { buildTerrain, loadBake, NW as WW, NH as WH, VD, T } from './land.js';
// The height of the timeline bar in page pixels (32 of its own pixels), read again only when the page is resized.
let barAt = -1, barH = 0;
const barCss = () => { if (barAt !== innerWidth * 1e4 + innerHeight) { barAt = innerWidth * 1e4 + innerHeight; barH = 32 * (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--px')) || 2); } return barH; };
// ---------------------------------------------------------------------------------------------
// The world. Pixel coordinates, x east, y south. North is up the screen, so the three
// destinations stand along the top of the meadow: the forest and About Lake on the left,
// The Stack in the middle, Sideproject Spires on the right. The ground itself, every biome and
// everything rooted in it, comes from land.js; this file adds what moves and what is clicked.

const KM = 0.008; // kilometres per pixel along a trail, for the sign's distances
const RUN = 78; // pixels a second

// ---------------------------------------------------------------------------------------------
// The scene. Built once; drawn for whichever stretch of trail (a leg) he is on.

// Everything on the map that stands still or only sways: trees, ferns, flags, signs, rocks. Kept out of
// draw(): that function is too big for the browser to optimise, and with E5b2's denser forest the
// sprite loops inside it cost about 19 ms a frame against under 4 when they run here.
// Trees have one function of their own, taking plain numbers, so it only ever sees tree parts.
function drawTree(scr, parts, x, y, clip, v, tq, ox, oy, dl, clipBlit) {
  for (let n = 0; n < parts.length; n++) {
    const part = parts[n], [wx, wy] = breeze(x + (part.lx || 0), y + part.y, tq, part.sway);
    if (clip) clipBlit(part.bm, x + part.x + wx, y + part.y + wy, v, dl); else scr.blit(part.bm, x + part.x + wx - ox, y + part.y + wy - oy);
  }
}
function drawStill(scr, th, tq, ox, oy, dl, clipBlit, flags, t) {
  if (th.fern) {
    const [wx] = breeze(th.x, th.y, tq, 0.6);
    scr.blit(th.bm, th.x - th.bm.ox + wx - ox, th.y - th.bm.oy - oy);
  } else if (th.flag) {
    scr.blit(flags[Math.floor(t * 5) & 1], th.x - 2 - ox, th.y - th.lift - 15 - oy);
  } else if (th.lift) {
    scr.blit(th.bm, th.x - th.bm.ox - ox, th.y - th.lift - th.bm.oy - oy);
    if (th.rope) for (let j = 1; j < 12; j++) scr.set(th.x + Math.round(j * 0.25) - ox, th.y - 70 + j - oy, R.yellow[0]);
  } else if (th.clip) clipBlit(th.bm, th.x - th.bm.ox, th.y - th.bm.oy, th.v, dl); else scr.blit(th.bm, th.x - th.bm.ox - ox, th.y - th.bm.oy - oy);
}
// The last light on the foothills at Dusk (E5j), laid over the finished picture: warm on the hills' upper
// west faces and on the tree tops along their crests, while the valleys round them go a step darker
// first (the valleys are in the Dusk copy of the ground, below). H holds the rest of land.js's hillLight
// as a list: for each row of the map, its marked pixels' columns and values, so a frame visits only those.
function duskHills(fb, VW, VH, ox, oy, H, ground, mix, WARM) {
  const y0 = Math.max(0, -oy), y1 = Math.min(VH, WH - oy), { rows, xs, vals } = H;
  for (let y = y0; y < y1; y++) { const wy = y + oy, row = y * VW, wrow = wy * WW;
    for (let k = rows[wy], e = rows[wy + 1]; k < e; k++) { const x = xs[k] - ox; if (x < 0) continue; if (x >= VW) break; const m = vals[k], wi = wrow + xs[k], b = bayer(xs[k], wy), i = row + x;
      if (m < 16) { if (b < mix * m * 0.08) fb[i] = WARM[fb[i]]; }
      else if (fb[i] !== ground[wi] && b < mix * (m - 32) * 0.1) fb[i] = WARM[fb[i]]; } }
}

export function makeWorld(bake) {
  const W = buildTerrain(), { g: ground, spots, forestAmt } = W;
  const paths = {}; for (const k of ['lake', 'stack', 'spires']) paths[k] = makePath({ pts: W.trails[k], stops: [] });
  // Shafts of light slant through the forest, and give out where the mist takes over in the west.
  const shaftMask = new Uint8Array(WW * WH);
  for (let y = 300; y < WH; y++) for (let x = 0; x < 760; x++) {
    if (forestAmt(x, y) < 0.7) continue;
    const band = frac((x * 0.55 + y) / 64);
    if (band < 0.15 && vnoise((x * 0.55 + y) / 64, (y - x * 0.4) / 40, 77) > 0.42 + smooth(430, 200, x) * 0.4) shaftMask[y * WW + x] = band < 0.05 || band > 0.1 ? 1 : 2;
  }

  // Everything that stands up, sorted by its feet each frame.
  // The last light at Dusk (D16): the tips of the Spires and of Proficiency Peak catch the sun after the
  // land below has lost it, as Mount Monolith's snow does. For each column, the top of each landmark; a
  // band below it is lit with the snow's dusk colours, one step lighter than the rock's own, thinning
  // downward through a dither. GLOW maps a colour to the snow step of the same lightness.
  const tipTop = [6, 7].map(k => { const top = new Int16Array(WW).fill(-1); for (let x = 0; x < WW; x++) for (let y = 0; y < WH; y++) if (W.dest[y * WW + x] === k) { top[x] = y; break; } return top; });
  // The warm light on the hills: only the lit half of each colour (the sunny side of a crown, the lit
  // tips of the canopy) turns to ochre, so by Dusk the faces glint rust while the shade between stays
  // blue and the trees keep their shapes. Ink, water, sky and lit glass keep theirs.
  const WARM = new Uint8Array(256).map((_, c) => { const r = c && R[RAMP_OF[c]], k = RAMP_OF[c]; if (!r || c === INK || KIND[c] === 4 || k === 'sky' || k === 'lamp' || k === 'water') return c; const f = STEP_OF[c] / Math.max(1, r.length - 1); return f < 0.5 ? c : R.ochre[f < 0.8 ? 2 : 3]; });
  // The valleys round the hills go a step darker at Dusk, through a dither. That never changes, so it is
  // done once, in a copy of the ground drawn instead of it once the light is half gone; done each frame
  // it cost 2 ms.
  const groundDusk = ground.slice(); for (let i = 0; i < ground.length; i++) { const m = W.hillLight[i]; if (m >= 16 && m < 32 && bayer(i % WW, (i / WW) | 0) < (m - 16) * 0.05) groundDusk[i] = SHADE[ground[i]]; }
  let gNow = ground;
  const keep = m => m && (m < 16 || m >= 32);
  const HLIT = (() => { const M = W.hillLight, rows = new Int32Array(WH + 1); let n = 0; for (let i = 0; i < M.length; i++) if (keep(M[i])) n++;
    const xs = new Int16Array(n), vals = new Uint8Array(n); n = 0;
    for (let y = 0; y < WH; y++) { rows[y] = n; for (let x = 0; x < WW; x++) { const m = M[y * WW + x]; if (keep(m)) { xs[n] = x; vals[n++] = m; } } } rows[WH] = n; return { rows, xs, vals }; })();
  const TIP_H = [26, 34], GLOW = new Uint8Array(256).map((_, c) => { const r = c && R[RAMP_OF[c]]; if (!r) return c; const k = Math.min(R.snow.length - 1, Math.round((STEP_OF[c] + 1) / r.length * (R.snow.length - 1)) + 1); return R.snow[k]; });
  // The lenticular cloud (E3): a stack of smooth lenses standing still over Mount Monolith's summit, the
  // sign of a strong wind up high. It forms over fifteen seconds, sits half a minute, thins and is gone,
  // and the sky stays clear for half a minute before the next (E5a: loops are quick). The first starts
  // forming five seconds after the page opens. Drawn with the drifting clouds' white and their blue underside.
  const LENS = { cycle: 90, form: 15, sit: 45, gone: 60 }, LAYERS = [[0, 1, 7], [-8, 0.8, 6], [-14, 0.56, 4]];
  // lens=<seconds> in the address starts the cloud that far into its cycle, for screenshots.
  let lensAhead = typeof location !== 'undefined' ? +(/[?&]lens=([\d.]+)/.exec(location.search) || [])[1] || 0 : 0;
  function lenticular(scr, ox, oy, t) {
    const ph = (t + lensAhead + LENS.cycle - 5) % LENS.cycle, a = ph < LENS.form ? smooth(0, LENS.form, ph) : ph < LENS.sit ? 1 : ph < LENS.gone ? smooth(LENS.gone, LENS.sit, ph) : 0; if (a <= 0) return;
    const [sx, sy] = spots.summit, W0 = 66 * (0.55 + 0.45 * Math.min(1, ph / LENS.form)) * (ph > LENS.sit ? 1 + 0.12 * (ph - LENS.sit) / (LENS.gone - LENS.sit) : 1), cy = sy - 9;
    for (const [dy, wk, T] of LAYERS) { const w = W0 * wk, y0 = cy + dy;
      for (let x = Math.round(sx - w); x <= sx + w; x++) { const q = (x - sx) / w, th = T * Math.pow(Math.max(0, 1 - q * q), 0.7), top = Math.round(th), bot = Math.round(th * 0.3);
        for (let y = y0 - top; y <= y0 + bot; y++) { const vx = x - ox, vy = y - oy; if (vx < 0 || vy < 0 || vx >= scr.VW || vy >= scr.VH) continue;
          const edge = Math.min(1, (1 - Math.abs(q)) * 4); if (bayer(x, y) >= a * edge) continue;
          // Lit from above: white on top, the lower half dithered toward the sky's pale blue, the underside blue.
          const f = (y - (y0 - top)) / Math.max(1, top + bot); scr.fb[vy * scr.VW + vx] = y === y0 + bot && bot > 0 ? R.sky[3] : f > 0.45 && bayer(x + 1, y) < (f - 0.45) * 1.6 ? R.sky[4] : R.white[1]; } } }
  }
  // The serac fall (E4): every 40 to 50 seconds, the first about 15 seconds after the page opens (E5a), a block of ice breaks off one of the icefalls (spots.seracs),
  // tumbles down the slope under it with a puff of powder following and spreading, and a low rumble comes
  // a moment later, as sound would from that far off. Never twice running from the same place.
  // serac=<seconds> in the address starts the clock that far on, for screenshots.
  const SER = spots.seracs; let serAhead = typeof location !== 'undefined' ? +(/[?&]serac=([\d.]+)/.exec(location.search) || [])[1] || 0 : 0; const SLOT = 40;
  const serAt = n => { let k = Math.floor(hash(0, 1, 4741) * SER.length); for (let m = 1; m <= n; m++) k = (k + 1 + Math.floor(hash(m, 2, 4741) * (SER.length - 1))) % SER.length; return k; };
  let rumbled = -1;
  function seracFall(scr, ox, oy, t, env) {
    if (SER.length < 2) return;
    const T = t + serAhead + SLOT - 15, n = Math.floor(T / SLOT), a = T - n * SLOT - 10 * hash(n, 3, 4741); if (a < 0 || a > 4.5) return;
    const [sx, sy] = SER[serAt(n)], fall = 40, path = q => [sx + Math.round(2 * Math.sin(q * 5 + n)), sy + Math.round(fall * Math.pow(q, 1.6))];
    const on = sx - ox > -20 && sx - ox < scr.VW + 20 && sy - oy > -40 && sy - oy < scr.VH + 10;
    if (on && a > 0.9 && rumbled !== n) { rumbled = n; env.sfx('rumble'); }
    const dot = (x, y, c) => { const vx = x - ox, vy = y - oy; if (vx >= 0 && vy >= 0 && vx < scr.VW && vy < scr.VH) scr.fb[vy * scr.VW + vx] = c; };
    // The puffs: one where each stretch of the fall was passed, growing and fading from when it was made.
    for (let k = 0; k < 5; k++) { const age = a - 0.3 - k * 0.25; if (age < 0) continue; const [px, py] = path(Math.min(1, k / 4)), r = 2 + 8 * Math.min(1, age / 3), al = smooth(4.2, 0.6, age);
      for (let dy = -Math.ceil(r); dy <= r * 0.6; dy++) for (let dx = -Math.ceil(r * 1.3); dx <= r * 1.3; dx++) { const d = Math.hypot(dx / 1.3, dy) / r; if (d > 1 || bayer(px + dx, py + dy - Math.round(age * 2)) >= al * (1.3 - d * d)) continue; dot(px + dx, py + dy - Math.round(age * 2), dy > r * 0.25 || d > 0.82 ? R.snow[1] : d < 0.5 ? R.white[1] : R.snow[3]); } }
    // The block itself, until it is lost in its own powder.
    if (a < 1.4) { const [bx, by] = path(a / 1.4); for (let i = -2; i <= 1; i++) { dot(bx + i, by - 1, R.white[1]); dot(bx + i, by, R.serac[i < 1 ? 2 : 1]); dot(bx + i, by + 1, R.serac[0]); } }
  }
  // ---- the weather in the west (E5) ----
  // A shower comes in off the sea ten seconds after the page opens, and again half a minute after the
  // last one's fog has gone (E5a: loops are quick). Fog builds on the water first; then dark rain clouds
  // and a front of rain and fog push east over the rainforest, wetting the ground, as far as a reach
  // rolled for that shower, so about half of them get to About Lake and ring its water. The rain stops
  // there, the clouds drift on and break up, a low rainbow arch stands in the rain as it goes, the fog
  // lingers, then burns off. rain=<seconds> moves the clock on, for screenshots.
  const RAIN = { sea: 8, land: 26, stop: 46, dry: 52, lift: 62, gone: 76, gap: 30 }; RAIN.cycle = RAIN.gone + RAIN.gap;
  let rainAhead = typeof location !== 'undefined' ? +(/[?&]rain=([\d.]+)/.exec(location.search) || [])[1] || 0 : 0;
  // About Lake's water (the core of its country), for the reach and the rings.
  let lx0 = WW, lx1 = 0, ly0 = WH, ly1 = 0;
  for (let i = 0; i < W.dest.length; i++) if (W.dest[i] === 5) { const x = i % WW, y = (i / WW) | 0; if (x < lx0) lx0 = x; if (x > lx1) lx1 = x; if (y < ly0) ly0 = y; if (y > ly1) ly1 = y; }
  const weather = t => {
    const T = t + rainAhead + RAIN.cycle - 10, n = Math.floor(T / RAIN.cycle), s = T - n * RAIN.cycle, reach = lerp(lx0 - 90, lx1 + 30, hash(n, 1, 5101));
    return { n, s, reach,
      front: s < RAIN.sea ? lerp(-80, 40, s / RAIN.sea) : lerp(40, reach, smooth(RAIN.sea, RAIN.land, s)),
      fog: smooth(0, RAIN.sea, s) * smooth(RAIN.gone, RAIN.lift, s),
      rain: smooth(RAIN.sea + 2, RAIN.sea + 8, s) * smooth(RAIN.dry, RAIN.stop, s),
      wet: smooth(RAIN.sea + 2, RAIN.land, s) * smooth(RAIN.gone + 20, RAIN.dry, s),
      cloud: smooth(2, RAIN.sea + 4, s) * smooth(RAIN.dry + 12, RAIN.stop + 2, s), drift: Math.max(0, s - RAIN.stop) * 5,
      bow: smooth(RAIN.stop, RAIN.stop + 4, s) * smooth(RAIN.lift + 4, RAIN.stop + 14, s) };
  };
  // The front is not a straight line: row by row it bulges ahead and lags behind.
  const frontAt = (wy, w) => w.front + 26 * Math.sin(wy / 37 + w.n) + 14 * Math.sin(wy / 11 + 2 * w.n);
  // How much of the fog that lies at a spot is in: all of it behind the front, none a little ahead of it.
  const fogIn = (wx, wy, w) => w.fog * clamp((frontAt(wy, w) + 70 - wx) / 90, 0, 1);
  // Wet ground under the rain: a step darker through a dither, drying after. Water stays as it is.
  const WATERY = KIND[R.water[3]];
  function wetGround(scr, ox, oy, w) {
    if (w.wet < 0.02) return;
    const { VW, VH, fb } = scr, D = W.depth;
    for (let y = Math.max(0, -oy); y < Math.min(VH, WH - oy); y++) {
      const wy = y + oy, row = y * VW, lim = Math.min(VW, Math.ceil(frontAt(wy, w) - ox), WW - ox), by = (wy & 3) * 4, wrow = wy * WW, cut = w.wet * 0.5;
      for (let x = Math.max(0, -ox); x < lim; x++) { const wx = x + ox; if (BAY[by + (wx & 3)] >= cut || D[wrow + wx] > 1e8 || KIND[fb[row + x]] === WATERY) continue; fb[row + x] = SHADE[fb[row + x]]; }
    }
  }
  // The fog, laid on the way the mist is (each pixel swapped for its own colour seen through fog), in
  // seven strengths and then plain white, by how thick it lies there (W.fog) and how much of it is in.
  // Whatever stands (a tree's crown, an animal) shows through it two steps clearer than the ground
  // under it, so the ranks stand out of the fog in the hollows, and the farther back the ground the
  // thicker the fog in front of it, so each rank is paler than the one before it. Only the sea goes
  // wholly white; over the land something always shows through. It parts round him as the mist does.
  const FOGV = [0.12, 0.26, 0.4, 0.53, 0.65, 0.76, 0.86].map(veilTable), BAY = Array.from({ length: 16 }, (_, i) => bayer(i & 3, i >> 2));
  function westFog(scr, ox, oy, w, here) {
    if (w.fog < 0.01) return;
    const { VW, VH, fb } = scr, F = W.fog, k8 = w.fog * 8 / 255;
    for (let y = Math.max(0, -oy); y < Math.min(VH, WH - oy); y++) {
      const wy = y + oy, row = y * VW, fr = frontAt(wy, w), lim = Math.min(VW, Math.ceil(fr + 70 - ox), WW - ox), his = here && wy > here.y - 23 && wy < here.y + 3, by = (wy & 3) * 4, wrow = wy * WW;
      for (let x = Math.max(0, -ox); x < lim; x++) {
        const wx = x + ox, f = F[wrow + wx]; if (!f || (his && wx > here.x - 9 && wx < here.x + 9)) continue;
        const i = row + x, gate = fr + 70 - wx;
        let l = Math.floor(f * k8 * (gate >= 90 ? 1 : gate / 90) + BAY[by + (wx & 3)] - 0.5) - (fb[i] !== gNow[wrow + wx] ? 2 : 0); if (l <= 0) continue; if (l >= 8 && f < 230) l = 7;
        fb[i] = l >= 8 ? (hash(wx >> 4, wy >> 2, 231) > 0.74 ? R.fog[1] : R.fog[2]) : FOGV[l - 1][fb[i]];
      }
    }
  }
  // A cloud drawn in pixels: rounded lobes along a flat base, tallest in the middle. Fair-weather ones
  // are white with the sky's blue underneath; rain clouds are the grey of a storm, darkest at the belly.
  const puff = (w, h, seed, dark) => {
    const r = rng(seed), b = new BM(w, h); b.ox = w >> 1; b.oy = h - 1;
    const n = Math.max(3, Math.round(w / 13)), base = h - 2, lobes = [];
    for (let k = 0; k < n; k++) { const f = (k + 0.5) / n; lobes.push([w * (0.1 + 0.8 * f) + (r() - 0.5) * 5, base - h * (0.2 + 0.42 * Math.sin(Math.PI * f) * (0.7 + 0.3 * r())), h * (0.22 + 0.14 * r()) + h * 0.16 * Math.sin(Math.PI * f)]); }
    for (let y = 0; y <= base; y++) for (let x = 0; x < w; x++) {
      if (!lobes.some(([lx, ly, lr]) => sq(x - lx) + sq((y - ly) * 1.25) <= lr * lr)) continue;
      const q = y / base, d = bayer(x, y);
      b.set(x, y, dark ? (y === base ? R.nebel[0] : q < 0.35 ? (d < 0.6 ? R.nebel[3] : R.nebel[2]) : q < 0.7 ? (d < 0.5 ? R.nebel[2] : R.nebel[1]) : R.nebel[1])
        : (q < 0.6 ? R.white[1] : q < 0.82 ? (d < 0.5 ? R.white[1] : R.sky[4]) : R.sky[3]));
    }
    return b;
  };
  // The rain clouds: ten of them scattered over the forest, at rows and distances behind the front rolled
  // once, so they bunch and overlap as real ones do. The
  // rain falls in streaks from under each, slanting east with the wind, down to its own shadow on the
  // ground. When the rain stops they drift on east and break up.
  const RAIN_ALT = 70, RCLOUDS = Array.from({ length: 10 }, (_, k) => { const w = Math.round(78 + 64 * hash(k, 4, 7101)); return { gy: 380 + 440 * hash(k, 2, 7101), lag: 10 + 270 * Math.pow(hash(k, 3, 7101), 0.8), w, bm: puff(w, Math.round(26 + w * 0.1), 7110 + k, true) }; }).sort((a, b) => a.gy - b.gy);
  const rcX = (c, w) => frontAt(Math.round(c.gy), w) - c.lag + w.drift;
  function rainShadows(scr, ox, oy, w) {
    if (w.cloud < 0.02) return;
    const { VW, VH, fb } = scr;
    for (const c of RCLOUDS) { const cx = rcX(c, w) + 10, rx = c.w * 0.45, ry = 9;
      for (let y = Math.max(0, Math.round(c.gy - ry - oy)); y <= Math.min(VH - 1, Math.round(c.gy + ry - oy)); y++) for (let x = Math.max(0, Math.round(cx - rx - ox)); x <= Math.min(VW - 1, Math.round(cx + rx - ox)); x++) {
        const nx = (x + ox - cx) / rx, ny = (y + oy - c.gy) / ry; if (nx * nx + ny * ny > 1 || bayer(x + ox, y + oy) >= w.cloud * 0.9) continue; const i = y * VW + x; fb[i] = SHADE[fb[i]]; } }
  }
  function rainClouds(scr, ox, oy, t, w) {
    if (w.cloud < 0.02) return;
    const { VW, VH, fb } = scr;
    RCLOUDS.forEach((c, k) => {
      const cx = rcX(c, w), base = c.gy - RAIN_ALT;
      // The rain under it first, from its base to the ground.
      for (let i = 0, n = Math.round(60 * w.rain); i < n; i++) {
        const life = t / 0.4 + frac(i * 0.618 + k * 0.31), cc = Math.floor(life), h = hash(k * 97 + i, cc, 5103);
        const wx = Math.round(cx - c.w * 0.4 + h * c.w * 0.8), wy = Math.round(base + frac(h * 7919) * (RAIN_ALT - 6) + (life - cc) * 10);
        for (let j = 0; j < 3; j++) { const x = wx + (j >> 1) - ox, y = wy + j - oy; if (x >= 0 && y >= 0 && x < VW && y < VH) fb[y * VW + x] = j < 2 ? R.fog[1] : R.fog[0]; }
      }
      // Then the cloud, thinning through a dither as it breaks up.
      const bm = c.bm, x0 = Math.round(cx) - bm.ox - ox, y0 = Math.round(base) - bm.oy - oy, keep = w.cloud * 1.25;
      for (let j = 0; j < bm.h; j++) { const y = y0 + j; if (y < 0 || y >= VH) continue; for (let i = 0; i < bm.w; i++) { const col = bm.d[j * bm.w + i], x = x0 + i; if (!col || x < 0 || x >= VW || bayer(x + ox, y + oy) >= keep) continue; fb[y * VW + x] = col; } }
    });
  }
  // Rings on About Lake where the rain reaches it: a white drop that opens into a ring two steps lighter
  // than the water, and is gone.
  function rings(scr, ox, oy, t, w) {
    if (w.rain < 0.1 || lx1 < lx0) return;
    const { VW, VH, fb } = scr;
    for (let k = 0; k < 22; k++) {
      const life = t / 0.9 + hash(k, 4, 5105), c = Math.floor(life), age = life - c; if (age > 0.7) continue;
      const x = Math.round(lx0 + hash(k, c, 5106) * (lx1 - lx0)), y = Math.round(ly0 + hash(k, c, 5107) * (ly1 - ly0));
      if (W.dest[y * WW + x] !== 5 || x >= frontAt(y, w) || hash(k, c, 5108) > w.rain) continue;
      for (const [dx, dy] of age < 0.25 ? [[0, 0]] : age < 0.45 ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : [[2, 0], [-2, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const X = x + dx - ox, Y = y + dy - oy; if (X < 0 || Y < 0 || X >= VW || Y >= VH || W.dest[(y + dy) * WW + x + dx] !== 5) continue; const i = Y * VW + X; fb[i] = age < 0.25 ? R.white[1] : LIGHT[LIGHT[fb[i]]]; }
    }
  }
  // The rainbow: a low arch standing in the rain and fog as the shower moves off, violet inside and red
  // outside, its feet fading into the forest. Not at night.
  const BOW = [R.lupine[1], R.sky[0], R.grass[3], R.sun[2], R.blaze[2], R.red[1]];
  function rainbow(scr, ox, oy, w, mix) {
    const a = w.bow * (1 - mix); if (a < 0.02) return;
    const cx = w.reach - 150, cy = ly0 - 10;
    for (let deg = 200; deg <= 340; deg += 0.25) { const th = deg * Math.PI / 180, along = smooth(200, 214, deg) * smooth(340, 326, deg);
      for (let b = 0; b < 6; b++) { const x = Math.round(cx + (70 + b) * Math.cos(th)), y = Math.round(cy + (70 + b) * Math.sin(th)); if (bayer(x, y) < a * along * 0.75) scr.set(x - ox, y - oy, BOW[b]); } }
  }
  // The small fair-weather clouds that cast the drifting shadows, each its shadow's size, FAIR_ALT above it.
  const FAIR_ALT = 64, FAIR = [0, 1, 2, 3].map(k => { const cw = 40 + 16 * hash(k, 1, 91), chh = 11 + 5 * hash(k, 2, 91); return { cw, chh, y: Math.round(620 + hash(k, 3, 91) * 380), bm: puff(Math.round(cw * 1.9), Math.round(chh * 2.4), 610 + k, false) }; });
  const fairX = (k, t) => ((k * 310 + t * (5 + k * 1.3)) % (WW + 300)) - 150;
  const things = [];
  for (const th of W.things) things.push(th.tree ? { kind: 'tree', t: th, x: th.x, y: th.y } : th);
  const put = (bm, x, y, extra = {}) => things.push({ bm, x: Math.round(x), y: Math.round(y), ...extra });
  put(makeSignpost(), spots.signpost[0], spots.signpost[1]);
  for (const s of spots.signs) put(makeSmallSign(), s[0], s[1]);
  put(makeJournal(), spots.journal[0], spots.journal[1]); put(makeKiosk(), spots.kiosk[0], spots.kiosk[1]);
  if (spots.lookout) put(makeLookout(), spots.lookout[0], spots.lookout[1]);
  for (const [x, y, c] of spots.tents) put(makeTent(c), x, y);
  // The animals look after themselves: see critters.js. Where each one lives comes from land.js.
  const crit = makeCritters(W);
  const ev = makeEvents(W);
  for (const it of crit.items) things.push(it);
  const birds = [makeBird(0), makeBird(1)];
  const clouds = [0, 1, 2, 3, 4, 5].map(i => ({ bm: makeCloud(600 + i), x: i * 330 + 40, y: 50 + (i & 1) * 70 + i * 18, v: 3 + (i % 4) }));
  const runner = makeRunner('trail');
  const kit = makeCats(); window.__cats = kit;
  const flags = [makeFlag(0), makeFlag(1)];
  const FLAGS = spots.flags;
  for (const k in FLAGS) things.push({ flag: k, bm: flags[0], x: FLAGS[k].x, y: FLAGS[k].y, lift: FLAGS[k].lift });
  // The top of the boot track lies behind the Spires on the map, so it is drawn again over them.
  const trackPix = W.trackPix;
  // His footprints stay on a finished trail: a pair of dark dots every few steps.
  const prints = {};
  for (const k in paths) {
    const P = paths[k], out = [];
    for (let d = 6, n = 0; d < P.len - 4; d += 5, n++) { const a = P.at(d / P.len), l = Math.hypot(a.dx, a.dy) || 1, s = n & 1 ? 1 : -1; out.push([Math.round(a.x - a.dy / l * s), Math.round(a.y + a.dx / l * s)]); }
    prints[k] = out;
  }

  // Where the lake loop goes into the trees and where it comes back out by the lake.
  const lakeIn = (() => { const P = paths.lake; for (let q = 0; q < 1; q += 0.002) { const a = P.at(q); if (forestAmt(a.x, a.y) > 0.75) return q; } return 0.2; })();
  const lakeOut = (() => { const P = paths.lake; let best = 0, bd = 1e9; for (let q = 0.5; q < 1; q += 0.002) { const a = P.at(q), d = Math.hypot(a.x - spots.lakeShore[0], a.y - spots.lakeShore[1]); if (d < bd) { bd = d; best = q; } } return best; })();

  // Where each place's name is pinned: over the signpost, on the lake's near shore, on the wall's rim, on the ice under the summits.
  const PLACES = [{ id: 'trailhead', x: T.x - 4, y: T.y - 31 }, ...['lake', 'stack', 'spires'].map(id => ({ id, x: spots.places[id][0], y: spots.places[id][1] }))];
  // How far from the camera he is on a trail, from the trail's own points.
  const vOn = (path, x, y) => { let best = 0, bd = 1e9; for (const p of W.lines[path]) { const d = Math.abs(p[0] - x) + Math.abs(p[1] - y); if (d < bd) { bd = d; best = p[2]; } } return best; };
  const saved = new Uint8Array(25 * 34);
  // The destinations rise a little, each with its whole country, when the pointer rests on one or it is
  // tapped (D12a, D12b). W.dest holds the destination's number (1 to 3) and 4 on the landmark itself.
  const lifted = [0, 0, 0, 0]; let tapped = 0, tapUntil = 0;
  const destUnder = (wx, wy) => { wx = Math.round(wx); wy = Math.round(wy); return wx < 0 || wy < 0 || wx >= WW || wy >= WH ? 0 : W.dest[wy * WW + wx] & 3; };
  // How far something standing at a spot is raised: as much as the ground under its feet.
  const liftAt = (x, y) => { if (x === undefined) return 0; const k = destUnder(x, y); return k ? Math.round(2 * lifted[k]) : 0; };
  // Redraws destination k d pixels higher, from what the ground pass put in the frame. Rows are read top
  // to bottom, so a row is always read before anything is written over it. Where it has left its foot
  // the ground goes dark, softer one row further down: a shadow under a place that has stepped up. While
  // it is up the country round the landmark is a step brighter; the landmark has its contrast already.
  // A step brighter, except the two lightest steps of a colour, which would go flat white (the ice did).
  const BRIGHT = new Uint8Array(256).map((_, c) => c && R[RAMP_OF[c]] && STEP_OF[c] < R[RAMP_OF[c]].length - 2 ? LIGHT[c] : c);
  function liftDest(scr, k, d, ox, oy) {
    const { VW, VH, fb } = scr, b = W.destBox[k], D = W.dest;
    const x0 = Math.max(b.x0, ox), x1 = Math.min(b.x1, ox + VW - 1), y0 = Math.max(b.y0, oy + d), y1 = Math.min(b.y1, oy + VH - 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const m = D[y * WW + x]; if ((m & 3) !== k) continue; const c = fb[(y - oy) * VW + (x - ox)]; fb[(y - oy - d) * VW + (x - ox)] = m & 4 ? c : BRIGHT[c]; }
    for (let y = Math.max(b.y0, oy); y <= Math.min(b.y1 + 1, oy + VH - 1); y++) for (let x = x0; x <= x1; x++) {
      const w = y * WW + x; if (y >= WH) continue; const here = (D[w] & 3) === k, under = y + d < WH && (D[w + d * WW] & 3) === k;
      if (here && !under) { const i = (y - oy) * VW + (x - ox); fb[i] = SHADE[SHADE[fb[i]]]; }
      else if (!here && y > 0 && (D[w - WW] & 3) === k && ((x + y) & 1)) { const i = (y - oy) * VW + (x - ox); fb[i] = SHADE[fb[i]]; }
    }
  }
  const cam = { x: T.x, y: 0 };
  let facing = 'down', flip = false, last = { ox: 0, oy: 0, VW: 1, VH: 1 }, focus = { x: 0, y: 0 };
  const list = [];
  // The view from the Trailhead. On an upright phone the junction sign covers the lower half, so
  // the view sits lower to keep him above it, past the bottom edge of the map if it has to.
  // A wide view taller than about 600 pixels (the opening view) rests lower, down to the near edge of the
  // map, so the meadow, the lake and all three destinations are in frame under the skyline.
  // Since E5h the Trailhead stands low in the meadow, so a wide view sets him just above the timeline bar
  // (about a fifth of the view up from its bottom), which leaves the skyline in frame above the destinations.
  const vista = scr => scr.narrow ? { x: T.x, y: T.y + scr.VH * 0.06 } : { x: T.x, y: T.y - scr.VH / 2 + Math.min(176, scr.VH * 0.24) };
  let past = 0;
  const where = (leg, q) => { const P = paths[leg.path], a = P.at(lerp(leg.from, leg.to, q)), s = leg.to < leg.from ? -1 : 1; return { x: a.x, y: a.y, dx: a.dx * s, dy: a.dy * s, P }; };
  const target = (scr, here) => {
    const v = vista(scr), k = smooth(0, 60, Math.hypot(here.x - T.x, here.y - T.y));
    return [lerp(v.x, here.x, k), lerp(v.y, here.y - 24, k)];
  };

  return {
    name: 'world', paths, lakeIn, lakeOut, T, WW, WH,
    lengths: () => ({ lake: 5.2, stack: Math.round(paths.stack.len * KM * 10) / 10, spires: Math.round(paths.spires.len * KM * 10) / 10 }),
    dur: leg => Math.abs(leg.to - leg.from) * paths[leg.path].len / RUN,
    stops: () => [],
    // North on the map is uphill, which is all the profile along the bottom needs.
    elev: (leg, q) => (T.y - where(leg, q).y) * 0.8,
    // One frame of the map from a fixed spot, without him: the picture on the trail map.
    still(scr, x, y, env) {
      const keep = [cam.x, cam.y, last, focus, facing, flip];
      this.draw(scr, { ...env, dt: 0, moving: false, home: false, idle: 0, look: { x: 0, y: 0 }, hideMe: true, fixed: { x, y } }, { path: 'lake', from: 0, to: 0 }, 0);
      [cam.x, cam.y, last, focus, facing, flip] = keep;
    },
    enter(scr, leg, q) { const [tx, ty] = target(scr, where(leg, q)); cam.x = tx; cam.y = ty; },
    focus: () => focus,
    // The spot of the map under a point of the screen.
    at: (sx, sy) => ({ x: sx + last.ox, y: sy + last.oy }),
    // The four places he can be sent to, for the page to pin a name on. The page keeps a name on screen
    // when its place is out of view.
    // A place's tag rises and brightens with it when it lifts (E5j): lift is how far up it is, 0 to 1.
    labels() { return PLACES.map(d => { const k = W.DEST.indexOf(d.id), l = k > 0 ? lifted[k] : 0; return { id: 'go:' + d.id, name: DEST_NAMES[d.id], x: d.x - last.ox, y: d.y - last.oy - 2 * l, lift: l }; }); },
    // What is under a point of the screen: a sign with a name, the kiosk, a cat.
    pick(sx, sy) {
      const wx = sx + last.ox, wy = sy + last.oy;
      for (const s of spots.signs) if (Math.abs(wx - s[0]) < 8 && wy > s[1] - 17 && wy < s[1] + 3) return { label: SIGNS[s[2]], x: s[0] - last.ox, y: s[1] - 18 - last.oy };
      const c = kit.pick(wx, wy); if (c) return { label: c.label, x: c.wx - last.ox, y: c.wy - last.oy, act: c.act };
      if (spots.lookout) { const [lx, ly] = spots.lookout; if (Math.abs(wx - lx) < 9 && wy > ly - 30 && wy < ly + 2) return { label: NAMES.lookout, x: lx - last.ox, y: ly - 31 - last.oy }; }
      { const [kx, ky] = spots.kiosk; if (Math.abs(wx - kx) < 14 && wy > ky - 27 && wy < ky + 3) return { label: NAMES.kiosk, x: kx - last.ox, y: ky - 27 - last.oy, act: 'kiosk' }; }
      { const k = destUnder(wx, wy); if (k) return { label: DEST_NAMES[W.DEST[k]], named: true, x: sx, y: sy, act: 'dest:' + W.DEST[k] }; }
      return null;
    },
    // The debug panel's start buttons (E5f): each moves its event's clock so the event begins now.
    trigger(name, t) {
      const mod = (a, m) => ((a % m) + m) % m;
      if (name === 'shower') { const n = Math.floor((t + rainAhead + RAIN.cycle - 10) / RAIN.cycle) + 1; rainAhead = n * RAIN.cycle - t - RAIN.cycle + 10; return true; }
      if (name === 'serac') { if (SER.length < 2) return false; const n = Math.floor((t + serAhead + SLOT - 15) / SLOT) + 1; serAhead = n * SLOT + 10 * hash(n, 3, 4741) - t - SLOT + 15; return true; }
      if (name === 'lens') { lensAhead = mod(-(t + LENS.cycle - 5), LENS.cycle); return true; }
      return ev.trigger(name, t) || crit.trigger(name, t);
    },
    act(id, env) { if (id.startsWith('dest:')) { const k = W.DEST.indexOf(id.slice(5)); if (lifted[k] > 0.5) return false; tapped = k; tapUntil = env.t + 3; return true; } return id.startsWith('cat:') ? kit.click(id.slice(4), env) : false; },
    draw(scr, env, leg, q) {
      const { VW, VH, fb } = scr, { t, tq, dt } = env;
      const here = where(leg, q);
      if (env.moving && Math.abs(here.dx) + Math.abs(here.dy) > 0.01) {
        if (Math.abs(here.dx) > Math.abs(here.dy) * 0.7) { facing = 'side'; flip = here.dx < 0; } else facing = here.dy < 0 ? 'up' : 'down';
      }
      if (env.home) facing = 'down';

      // Camera: the whole view from the Trailhead, then follow him.
      let [tx, ty] = target(scr, here);
      if (env.home && env.idle > 4 && Math.abs(env.look.x) + Math.abs(env.look.y) < 1) tx += Math.sin((env.idle - 4) * 0.16) * Math.min(130, Math.max(0, (WW - VW) / 2 - Math.abs(tx - WW / 2))) * 0.9 * Math.min(1, (env.idle - 4) / 3);
      const damp = 1 - Math.exp(-dt * 3.2);
      cam.x += (tx - cam.x) * damp; cam.y += (ty - cam.y) * damp;
      // A zoom step keeps one spot of the map under the pointer: the camera goes straight to its new rest and the dragged view makes up the difference.
      if (env.anchor && !env.fixed) { const a = env.anchor; cam.x = tx; cam.y = ty; env.look.x = a.wx - a.sx + VW / 2 - cam.x; env.look.y = a.wy - a.sy + VH / 2 - cam.y; env.anchor = null; }
      // How far a drag may take the view: the hard limits below keep the edge of the world out of sight,
      // and the last 26 pixels before them push back.
      // The timeline bar covers the bottom of the view, so the view may go that much further down and the
      // bottom of the map (the river's mouth, the dry corner) can be brought up above it (D11).
      const bar = barCss() / scr.S;
      if (!env.fixed) { const M = 26, b = { x0: Math.min(0, VW / 2 + M - cam.x), x1: Math.max(0, WW - VW / 2 - M - cam.x), y0: Math.min(0, VH / 2 + M - cam.y), y1: Math.max(0, WH - VH / 2 - M + bar - cam.y) }; if (VW >= WW) b.x0 = b.x1 = 0; if (VH >= WH) b.y0 = b.y1 = 0; env.lookBox = b; }
      let cx = cam.x + env.look.x, cy = cam.y + env.look.y;
      cx = VW >= WW ? WW / 2 : clamp(cx, VW / 2, WW - VW / 2);
      past += ((scr.narrow && env.home ? VH * 0.34 : 0) - past) * (env.fixed ? 0 : Math.min(1, dt * 4));
      cy = VH >= WH ? WH / 2 : clamp(cy, VH / 2, WH - VH / 2 + past + bar);
      const ox = env.fixed ? env.fixed.x : Math.round(cx - VW / 2), oy = env.fixed ? env.fixed.y : Math.round(cy - VH / 2);
      last = { ox, oy, VW, VH };
      // The night sky is pinned to the world's own sky, laid out over a height that keeps the aurora in its dark upper part.
      scr.sky = { ox, oy, w: WW, h: 330, moon: [1180, 60] };

      // Ground.
      gNow = env.mix > 0.5 ? groundDusk : ground;
      for (let y = 0; y < VH; y++) {
        const wy = oy + y, row = y * VW;
        if (wy < 0) { fb.fill(R.skyband[0], row, row + VW); continue; }
        if (wy >= WH) { const my = 2 * WH - 1 - wy, a = Math.max(0, ox), b = Math.min(WW, ox + VW); fb.fill(R.grass[2], row, row + VW); if (my >= 470 && b > a) fb.set(gNow.subarray(my * WW + a, my * WW + b), row + (a - ox)); continue; }
        const a = Math.max(0, ox), b = Math.min(WW, ox + VW);
        if (a > ox) fb.fill(wy < 330 ? R.sky[2] : R.grass[2], row, row + (a - ox));
        if (b < ox + VW) fb.fill(wy < 330 ? R.sky[2] : R.grass[2], row + (b - ox), row + VW);
        if (b > a) fb.set(gNow.subarray(wy * WW + a, wy * WW + b), row + (a - ox));
      }
      // With the Trees switch off, the snags and shadows painted into the ground give way to what lay under them.
      if (!DEBUG.trees) for (let y = Math.max(0, -oy); y < Math.min(VH, WH - oy); y++) { const wy = y + oy, row = y * VW; for (let x = Math.max(0, -ox); x < Math.min(VW, WW - ox); x++) { const c = W.bare[wy * WW + x + ox]; if (c) fb[row + x] = c; } }
      const sky = weather(t); crit.weather(sky.fog, (x, y) => fogIn(x, y, sky));
      if (DEBUG.clouds) wetGround(scr, ox, oy, sky);
      if (env.mix > 0.02) for (let n = 0; n < 2; n++) { const top = tipTop[n], H = TIP_H[n], k = 6 + n;
        for (let x = Math.max(0, ox); x < Math.min(WW, ox + VW); x++) { const y0 = top[x]; if (y0 < 0) continue;
          for (let y = Math.max(y0, oy); y < Math.min(y0 + H, oy + VH, WH); y++) { if (W.dest[y * WW + x] !== k) continue; const d = (y - y0) / H; if (bayer(x, y) < env.mix * Math.pow(1 - d, 0.8)) { const i = (y - oy) * VW + (x - ox); fb[i] = GLOW[fb[i]]; } } } }
      crit.sea(scr, ox, oy, t); crit.falls(scr, ox, oy, t);
      crit.update(dt, t, env.hideMe ? null : here);
      if (DEBUG.clouds) for (const c of clouds) scr.blit(c.bm, ((c.x + t * c.v) % (WW + 120)) - 60 - ox, c.y - oy);
      if (DEBUG.clouds) lenticular(scr, ox, oy, t);
      seracFall(scr, ox, oy, t, env);
      for (const k in prints) if (env.done[k]) for (const [x, y] of prints[k]) { const sx = x - ox, sy = y - oy; if (sx >= 0 && sy >= 0 && sx < VW && sy < VH && KIND[fb[sy * VW + sx]] >= 3 && KIND[fb[sy * VW + sx]] !== 4) { const i = sy * VW + sx; fb[i] = KIND[fb[i]] === 3 ? R.dirt[0] : SHADE[fb[i]]; } }
      { const over = env.ptr && !env.fixed ? destUnder(env.ptr[0] + ox, env.ptr[1] + oy) : 0, want = over || (t < tapUntil ? tapped : 0);
        for (let k = 1; k < 4; k++) { lifted[k] += ((k === want ? 1 : 0) - lifted[k]) * Math.min(1, dt * 9); const d = Math.round(2 * lifted[k]); if (d > 0) liftDest(scr, k, d, ox, oy); } }

      // Everything that stands, back to front.
      list.length = 0;
      for (const th of things) {
        if (th.flag && !env.done[th.flag]) continue;
        // The Trees switch hides trees, not the flowers, bushes and sage that sway like them (marked low).
        if (((th.kind === 'tree' && !th.t.tree.low) || th.isTree) && !DEBUG.trees || (th.critter && !DEBUG.animals)) continue;
        const w = th.kind === 'tree' ? th.t.tree.w + 8 : th.bm.w, h = (th.kind === 'tree' ? th.t.tree.h + 10 : th.bm.h) + (th.lift || 0);
        if (th.x + w < ox || th.x - w > ox + VW || th.y - h > oy + VH || th.y + 4 < oy) continue;
        list.push(th);
      }
      if (!env.hideMe) list.push({ me: true, x: here.x, y: here.y });
      { const fh = crit.ferryHull(t, ox, oy, VW, VH); if (fh) list.push({ ferryHull: true, y: fh.y }); }
      kit.update(env, here, scr.narrow && !env.fixed, env.home && !env.fixed ? oy + (scr.narrow ? VH * 0.56 : VH - 38) : 0);
      for (const it of kit.items()) list.push(it);
      list.sort((a, b) => a.y - b.y);
      // A tree that nearer ground partly hides is drawn only where the land under each pixel is no
      // nearer than the tree itself (D6a), so it can sway and still stand behind the slope in front.
      const OY = oy, DEP = W.depth, clipBlit = (bm, sx, sy, v, dy = 0) => { sx = Math.round(sx); sy = Math.round(sy); const lim = v - 3; for (let j = 0; j < bm.h; j++) { const y = sy + j, vy = y - oy - dy; if (vy < 0 || vy >= VH || y < 0 || y >= WH) continue; for (let i = 0; i < bm.w; i++) { const c = bm.d[j * bm.w + i]; if (!c) continue; const x = sx + i, vx = x - ox; if (vx < 0 || vx >= VW || x < 0 || x >= WW || DEP[y * WW + x] < lim) continue; fb[vy * VW + vx] = c; } } };
      for (const th of list) {
        const dl = liftAt(th.x, th.y), oy = OY + dl;
        if (th.me) {
          const set = env.moving ? (facing === 'side' ? runner.side : facing === 'up' ? runner.up : runner.down) : (facing === 'side' ? runner.sideIdle : facing === 'up' ? runner.upIdle : runner.downIdle);
          const bm = set[Math.floor(Math.abs(leg.to - leg.from) * q * here.P.len / (facing === 'side' ? 4.2 : 5)) % set.length];
          // Ground nearer the camera than he is stands in front of him: what was there is put back over him.
          const X = Math.round(th.x - ox), Y = Math.round(th.y - oy), vMe = vOn(leg.path, th.x, th.y), x0 = Math.max(0, X - 12), x1 = Math.min(VW - 1, X + 12), y0 = Math.max(0, Y - 30), y1 = Math.min(VH - 1, Y + 3);
          { let n = 0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) saved[n++] = fb[y * VW + x]; }
          scr.shadow(X, Y, 5, 2);
          scr.put(bm, th.x - ox, th.y - oy, flip && facing === 'side');
          { let n = 0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++, n++) if (W.vAt(x + ox, y + OY) < vMe - 3) fb[y * VW + x] = saved[n]; }
          focus = { x: Math.round(th.x - ox), y: Math.round(th.y - oy) - 14 };
        } else if (th.ferryHull) {
          crit.drawHull(scr, ox, oy, t);
        } else if (th.cat) {
          kit.drawOne(scr, th.cat, ox, oy, t);
        } else if (th.critter) {
          crit.draw(scr, th, ox, oy, t);
        } else if (th.kind === 'tree') { const T = th.t; drawTree(scr, T.tree.parts, T.x, T.y, !!T.clip, T.v || 0, tq, ox, oy, dl, clipBlit); }
        else drawStill(scr, th, tq, ox, oy, dl, clipBlit, flags, t);
      }

      ev.draw(scr, ox, oy, t, env.mix || 0);
      if (env.mix > 0.02) duskHills(fb, VW, VH, ox, oy, HLIT, gNow, env.mix, WARM);
      // Cloud shadows cross the meadow: everything under one goes a step darker, with a soft edge. Each is
      // cast by a small fair-weather cloud drifting above it (E5a), drawn after the mist.
      if (DEBUG.clouds) rainShadows(scr, ox, oy, sky);
      for (let k = 0; DEBUG.clouds && k < 4; k++) {
        const { cw, chh } = FAIR[k], cxw = fairX(k, t) + 8, cyw = FAIR[k].y;
        const y0 = Math.max(0, Math.round(cyw - chh - oy)), y1 = Math.min(VH - 1, Math.round(cyw + chh - oy)), x0 = Math.max(0, Math.round(cxw - cw - ox)), x1 = Math.min(VW - 1, Math.round(cxw + cw - ox));
        for (let y = y0; y <= y1; y++) { const wy = y + oy; if (wy < 560) continue; for (let x = x0; x <= x1; x++) {
          const nx = (x + ox - cxw) / cw, ny = (wy - cyw) / chh, d = nx * nx + ny * ny + 0.22 * Math.sin(nx * 7 + k) * Math.sin(ny * 5 + k * 2);
          if (d < 0.82 || (d < 1 && ((x + ox + wy) & 1))) { const i = y * VW + x; fb[i] = SHADE[fb[i]]; }
        } }
      }
      // The boot track on the glacier, then the mist over the forest and the fog bank off the coast.
      for (const [x, y, c] of trackPix) scr.set(x - ox, y - oy, c);
      if (DEBUG.clouds) rings(scr, ox, oy, t, sky);
      if (DEBUG.mist) westFog(scr, ox, oy, sky, env.hideMe ? null : here);
      if (DEBUG.mist) crit.mist(scr, ox, oy, t, env.hideMe ? null : here);
      if (DEBUG.clouds) { rainbow(scr, ox, oy, sky, env.mix || 0); rainClouds(scr, ox, oy, t, sky); for (let k = 0; k < 4; k++) scr.blit(FAIR[k].bm, Math.round(fairX(k, t)) - FAIR[k].bm.ox - ox, FAIR[k].y - FAIR_ALT - FAIR[k].bm.oy - oy); }
      kit.drawOver(scr, ox, oy, t);
      // Smoke from the stove at base camp, drifting off with the wind.
      for (let k = 0; k < 6; k++) {
        const age = frac(t * 0.35 + k / 6), x = Math.round(spots.tents[0][0] + 9 + age * 10 + Math.sin(age * 6 + k) * 1.5) - ox, y = Math.round(spots.tents[0][1] - age * 26) - oy;
        if (x < 1 || y < 1 || x >= VW - 1 || y >= VH - 1) continue;
        const c = age < 0.5 ? R.white[1] : R.white[0];
        fb[y * VW + x] = c; if (age > 0.3) fb[y * VW + x + 1] = c;
      }
      if (DEBUG.animals) crit.over(scr, ox, oy, t, env);
      // Birds cross the sky in a loose V, flapping a few times a second.
      for (let k = 0; DEBUG.animals && k < 4; k++) {
        const bx = ((t * 22 + k * 11) % (WW + 200)) - 100, by = 250 + 8 * Math.sin(t * 0.7) + [0, 5, 9, 4][k];
        scr.blit(birds[(Math.floor(t * 3) + k) & 1], bx - [0, -9, 9, -17][k] - 3 - ox, by - 2 - oy);
      }
      // Butterflies over the flowers by the Trailhead.
      for (let k = 0; DEBUG.animals && k < 3; k++) {
        const bx = Math.round(T.x - 96 + k * 88 + 14 * Math.sin(t * 0.6 + k * 2)), by = Math.round(T.y + 10 - (k % 3) * 22 + 6 * Math.sin(t * 1.1 + k));
        const sx = bx - ox, sy = by - oy, col = k % 3 ? R.white[1] : R.yellow[1];
        if (sx < 1 || sy < 1 || sx >= VW - 1 || sy >= VH - 1) continue;
        const open = (Math.floor(t * 5) + k) & 1;
        fb[sy * VW + sx] = INK; fb[sy * VW + sx - 1] = col; fb[sy * VW + sx + 1] = col;
        if (open) { fb[(sy - 1) * VW + sx - 1] = col; fb[(sy - 1) * VW + sx + 1] = col; }
      }
      // Fireflies blink in the forest once the light goes.
      if (env.mix > 0.4) for (let k = 0; k < 110; k++) {
        const fx = Math.round(20 + hash(k, 1, 90) * 640 + 6 * Math.sin(t * 0.6 + k)), fy = Math.round(420 + hash(k, 2, 90) * 640 + 4 * Math.sin(t * 0.8 + k * 1.7));
        if (forestAmt(fx, fy) < 0.5 || frac(t * 0.4 + hash(k, 3, 90)) > 0.55) continue;
        scr.set(fx - ox, fy - oy, R.yellow[1]);
      }
      // Shafts of light slant down through the forest canopy: every other pixel one step lighter.
      for (let y = 0; y < VH; y++) {
        const wy = oy + y; if (wy < 300 || wy >= WH) continue;
        for (let x = (y + oy + ox) & 1; x < VW; x += 2) {
          const wx = ox + x; if (wx < 0 || wx >= WW || !shaftMask[wy * WW + wx]) continue;
          const i = y * VW + x; fb[i] = shaftMask[wy * WW + wx] === 2 ? LIGHT[LIGHT[fb[i]]] : LIGHT[fb[i]];
        }
      }
      // The debug panel's outlines, over the finished map.
      if (!env.fixed && (DEBUG.roam || DEBUG.trails || DEBUG.camera)) {
        const dot = (x, y, c) => scr.set(Math.round(x) - ox, Math.round(y) - oy, c);
        const oval = (a, c) => { const n = Math.ceil((a.rx + a.ry) * 2); for (let k = 0; k < n; k += 2) dot(a.x + Math.cos(k / n * TAU) * a.rx, a.y + Math.sin(k / n * TAU) * a.ry, c); };
        const box = (b, c, step) => { for (let x = b.x0; x <= b.x1; x += step) { dot(x, b.y0, c); dot(x, b.y1, c); } for (let y = b.y0; y <= b.y1; y += step) { dot(b.x0, y, c); dot(b.x1, y, c); } };
        // Red ovals: where each animal wanders and each flock circles. Pink boxes: where the cats keep to.
        if (DEBUG.roam) { for (const a of crit.areas()) oval(a, R.red[1]); for (const b of kit.areas()) box(b, R.pink[1], 2); }
        // Each trail as the line he actually follows, with a knot every twenty pixels, and a white cross
        // where the lake loop goes into the forest and where it comes back out.
        if (DEBUG.trails) {
          for (const [k, c] of [['lake', R.red[1]], ['stack', R.yellow[1]], ['spires', R.pink[2]]]) { const P = paths[k]; for (let d = 0; d <= P.len; d++) { const a = P.at(d / P.len); dot(a.x, a.y, c); if (d % 20 === 0) { dot(a.x + 1, a.y, c); dot(a.x - 1, a.y, c); dot(a.x, a.y + 1, c); dot(a.x, a.y - 1, c); } } }
          for (const q of [lakeIn, lakeOut]) { const a = paths.lake.at(q); for (let k = -3; k <= 3; k++) { dot(a.x + k, a.y + k, R.white[1]); dot(a.x + k, a.y - k, R.white[1]); } }
        }
        // Yellow: where the middle of the view may go. Orange: where a drag starts to be pushed back.
        // White: the edge of the world. Yellow cross: where the camera rests. White cross: the middle of the view.
        if (DEBUG.camera) {
          box({ x0: VW / 2, x1: WW - VW / 2, y0: VH / 2, y1: WH - VH / 2 + past }, R.yellow[1], 2);
          box({ x0: VW / 2 + 26, x1: WW - VW / 2 - 26, y0: VH / 2 + 26, y1: WH - VH / 2 - 26 }, R.blaze[1], 3);
          box({ x0: 0, x1: WW - 1, y0: 0, y1: WH - 1 }, R.white[1], 1);
          for (let k = -4; k <= 4; k++) { dot(cam.x + k, cam.y, R.yellow[1]); dot(cam.x, cam.y + k, R.yellow[1]); dot(ox + VW / 2 + k, oy + VH / 2, R.white[1]); dot(ox + VW / 2, oy + VH / 2 + k, R.white[1]); }
        }
      }
    }
  };
}

export { loadBake };
