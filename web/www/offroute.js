// Off route: what an address with no trail behind it looks like. A whiteout, one wand, and a sign
// pointing back the way you came.
import { clamp, frac, hash, fbm, bayer, R, INK, BM, outline } from './core.js';
import { baseline } from './side.js';
import { makeRunner, frontFig } from './tj.js';
import { makeSmallSign } from './sprites.js';
import { NAMES } from './content.js';

// A 404 in the cloud (round 5, T78; round 6, note 28 asked for it to read at a glance): the three digits
// from a 3 by 5 font, blurred between cells, so they read as big patches of clearly thicker, greyer cloud
// (greyer, not whiter: the cloud is often already as white as the palette goes). GLYPH
// is the font padded by one empty cell all round; fog404 says how far inside a digit a point is (0 to 1),
// in cells of the font.
const GLYPH = (() => {
  const rows = ['101 111 101', '101 101 101', '111 101 111', '001 101 001', '001 111 001'].map(r => r.replace(/ /g, '0'));
  const g = []; for (let y = -1; y <= 5; y++) { const row = []; for (let x = -1; x <= 11; x++) row.push(y >= 0 && y < 5 && x >= 0 && x < 11 && rows[y][x] === '1' ? 1 : 0); g.push(row); }
  return g;
})();
function fog404(u, w) {
  // u, w: position in font cells, (0, 0) at the top left of the first digit; the digits are three cells
  // wide with one empty cell between them.
  const fx = u + 0.5, fy = w + 0.5, ix = Math.floor(fx), iy = Math.floor(fy), ax = fx - ix, ay = fy - iy;
  const at = (x, y) => (GLYPH[y + 1] && GLYPH[y + 1][x + 1]) || 0;
  const v = (at(ix - 1, iy - 1) * (1 - ax) + at(ix, iy - 1) * ax) * (1 - ay) + (at(ix - 1, iy) * (1 - ax) + at(ix, iy) * ax) * ay;
  return v <= 0.3 ? 0 : v >= 0.7 ? 1 : (v - 0.3) / 0.4;
}
// fog404 for every pixel of the digits' box, worked out once for a size of cell (gc pixels), with the
// box starting one cell above and left of the first digit (K3: asked per pixel, it doubled the frame).
let MASK = null;
function maskFor(gc) {
  if (MASK && MASK.gc === gc) return MASK;
  const w = 13 * gc, h = 7 * gc, d = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d[y * w + x] = fog404((x - gc) / gc, (y - gc) / gc);
  return (MASK = { gc, w, h, d });
}
// The cloud and the snow, every pixel: the cloud above with the ghost of a ridge that comes and goes and
// the 404 in it, wind-packed snow below, the horizon somewhere between.
function paintFog(scr, t, base, M, gx0, gy0) {
  const { VW, VH, fb } = scr, snow = R.snow;
  for (let y = 0; y < VH; y++) {
    const my = y - gy0 + M.gc, inRows = y < base - 40 && my >= 0 && my < M.h;
    for (let x = 0; x < VW; x++) {
      const d = (y - base) / 60, n = fbm((x + t * 14) / 70, y / 26 + t * 0.05, 400, 3);
      let v = y < base ? 0.62 + 0.3 * n : 0.9 - 0.3 * clamp(d, 0, 1) + 0.14 * (n - 0.5);
      if (y < base) { const ridge = base - 60 - 50 * fbm(x / 90, 3, 403, 3), show = fbm(x / 140 + t * 0.03, 7, 404, 2); if (y > ridge && show > 0.5) v -= 0.16 * Math.min(1, (show - 0.5) * 6) * (1 - (y - ridge) / (base - ridge)); }
      // Wind-carved ridges (art pass, E04): bands that widen toward you, each a lit crest over a blue lee,
      // broken into lengths so they read as sastrugi, not stripes.
      if (y >= base) { const d = y - base, s = 6 * Math.log(1 + d / 12) + d / 40 + 1.1 * fbm(x / 50, 1, 405, 2), r = frac(s); if (fbm(x / (12 + d / 3), Math.floor(s) * 1.7, 401, 2) > 0.48) v += r < 0.3 ? 0.07 : r < 0.6 ? -0.22 : 0; }
      if (inRows) { const mx = x - gx0 + M.gc; if (mx >= 0 && mx < M.w) { const g = M.d[my * M.w + mx]; if (g > 0) v -= 0.26 * g * (0.85 + 0.3 * n); } }
      const f = clamp(v, 0, 0.999) * 4, i = Math.floor(f);
      fb[y * VW + x] = snow[Math.min(4, i + (bayer(x, y) < f - i ? 1 : 0))];
    }
  }
}

export function makeOffroute() {
  const run = makeRunner('alpine'), idle = frontFig('alpine'), st = {}, focus = { x: 0, y: 0 }, at = { cx: -999, my: -999 };
  const sign = makeSmallSign();
  // A bamboo wand, darker at each joint; its flag is drawn each frame so it can stream.
  const wand = (() => { const b = new BM(3, 24); b.ox = 1; b.oy = 23; for (let y = 0; y < 24; y++) b.set(1, y, R.dirt[y % 5 === 2 ? 1 : 3]); outline(b, INK); return b; })();
  return {
    name: 'offroute',
    dur: () => 1.6,
    stops: () => [{ id: 'off-route', at: 1 }],
    elev: () => 0,
    cues: () => [{ at: 0.05, name: 'wind' }],
    enter() { st.y = null; },
    focus: () => focus,
    // The wand and the sign answer where they stand (round 6: the wand's answer used to follow him, so it missed
    // while he walked in, and the sign answered nothing). A click on the sign takes him back to the Trailhead,
    // as the card's button does.
    pick(sx, sy) {
      const { cx, my } = at;
      if (Math.abs(sx - cx - 26) < 8 && Math.abs(sy - my + 14) < 22) return { label: NAMES.offroute.wand, x: cx + 26, y: my - 30 };
      if (sx >= cx - 42 && sx <= cx - 26 && sy >= my - 20 && sy <= my + 2) return { label: NAMES.offroute.sign, x: cx - 34, y: my - 20, act: 'home' };
      return null;
    },
    draw(scr, env, arg, q) {
      const { VW, VH } = scr, { t } = env, base = baseline(scr, env.shown, st), cx = Math.round(scr.narrow ? VW * 0.5 : VW * 0.62);
      // Where the 404 sits: in the cloud left of him, as big as fits between the top bar and the ghost ridge
      // and never wider than four fifths of the picture, drifting a few pixels.
      const top = 18, low = base - 70, gc = Math.max(6, Math.min(30, Math.floor((low - top) / 5.6), Math.floor(VW * 0.8 / 11)));
      const gx0 = Math.round((scr.narrow ? VW * 0.5 : VW * 0.36) - 5.5 * gc + 6 * Math.sin(t * 0.09)), gy0 = Math.round(Math.max(top + 4, (top + low) / 2 - 2.5 * gc) + 3 * Math.sin(t * 0.07 + 1));
      paintFog(scr, t, base, maskFor(gc), gx0, gy0);
      const mx = cx - Math.round((1 - q) * 70), my = base + 6;
      // His own tracks, coming in from the left and stopping: pairs of prints, the older ones drifting in.
      for (let x = cx - 150, k = 0; x < mx - 3; x += 6, k++) { const y = my + (k & 1) * 2 - 1, o = mx - x > 70 ? 1 : 0; scr.set(x, y, R.snow[o]); scr.set(x + 1, y, R.snow[o]); scr.set(x + 2, y, R.snow[o + 1]); scr.set(x + 1, y + 1, R.snow[2]); }
      // Drifts heaped by the wind, gentle to windward, steep and blue in the lee.
      for (const [x0, w] of [[-48, 9], [-14, 6], [17, 7], [38, 11]]) for (let i = 0; i <= w; i++) {
        const u = i / w * 2 - 1, h = Math.round(4.2 * (1 - u * u) * (1 + 0.5 * u)), x = cx + x0 + i;
        for (let j = 0; j < h; j++) scr.set(x, my + 1 - j, R.snow[j === h - 1 ? (u > 0.2 ? 3 : 4) : u > 0.2 ? (j ? 2 : 1) : 4]);
        if (u > 0.2) scr.set(x + 2, my + 2, R.snow[2]);
      }
      // The wand and the sign throw short blue shadows down the wind.
      for (let i = 0; i < 6; i++) { scr.set(cx + 27 + i, my - 1 + (i >> 2), R.snow[i < 3 ? 1 : 2]); scr.set(cx - 33 + i, my, R.snow[i < 3 ? 1 : 2]); }
      scr.put(wand, cx + 26, my - 2, false);
      // The flag: a pennant tapering away from the pole, the wave running down it.
      for (let i = 0; i < 11; i++) { const h = 4 - (i >> 2) - (i > 8 ? 1 : 0), w = Math.round(Math.sin(t * 9 - i * 0.7) * i / 8); for (let j = 0; j < h; j++) scr.set(cx + 28 + i, my - 25 + j + w + (i >> 2), R.blaze[j ? (j === h - 1 ? 0 : 1) : 2]); }
      scr.put(sign, cx - 34, my - 1, false);
      scr.shadow(mx, my, 5, 1);
      scr.put(q < 1 && env.moving ? run.side[Math.floor(q * 70 / 4.2) % 6] : idle, mx, my, false);
      // Spindrift blowing through, in front of everything.
      for (let k = 0; k < 150; k++) {
        const sp = 40 + hash(k, 1, 402) * 70, x = Math.floor(frac(hash(k, 2, 402) + t * sp / (VW + 40)) * (VW + 40)) - 20, y = Math.floor(frac(hash(k, 3, 402) + t * 0.05 * (1 + hash(k, 4, 402))) * VH);
        scr.set(x, y, R.snow[4]); if (k % 3 === 0) scr.set(x + 1, y, R.snow[4]);
      }
      focus.x = mx; focus.y = my - 14; at.cx = cx; at.my = my;
    }
  };
}
