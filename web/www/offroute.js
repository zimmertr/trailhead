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
      if (y >= base && fbm(x / 14, y / 2.5, 401, 2) > 0.62) v -= 0.12;
      if (inRows) { const mx = x - gx0 + M.gc; if (mx >= 0 && mx < M.w) { const g = M.d[my * M.w + mx]; if (g > 0) v -= 0.26 * g * (0.85 + 0.3 * n); } }
      const f = clamp(v, 0, 0.999) * 4, i = Math.floor(f);
      fb[y * VW + x] = snow[Math.min(4, i + (bayer(x, y) < f - i ? 1 : 0))];
    }
  }
}

export function makeOffroute() {
  const run = makeRunner('alpine'), idle = frontFig('alpine'), st = {}, focus = { x: 0, y: 0 };
  const sign = makeSmallSign();
  const wand = (() => { const b = new BM(7, 26); b.ox = 1; b.oy = 25; for (let y = 4; y < 26; y++) b.set(1, y, R.wood[2]); for (let y = 0; y < 5; y++) for (let x = 2; x < 6 - (y & 1); x++) b.set(x, y + 1, R.blaze[y < 2 ? 2 : 1]); outline(b, INK); return b; })();
  return {
    name: 'offroute',
    dur: () => 1.6,
    stops: () => [{ id: 'off-route', at: 1 }],
    elev: () => 0,
    cues: () => [{ at: 0.05, name: 'wind' }],
    enter() { st.y = null; },
    focus: () => focus,
    pick(sx, sy) { return Math.abs(sx - focus.x - 26) < 8 && Math.abs(sy - focus.y) < 22 ? { label: NAMES.offroute.wand, x: focus.x + 26, y: focus.y - 16 } : null; },
    draw(scr, env, arg, q) {
      const { VW, VH } = scr, { t } = env, base = baseline(scr, env.shown, st), cx = Math.round(scr.narrow ? VW * 0.5 : VW * 0.62);
      // Where the 404 sits: in the cloud left of him, as big as fits between the top bar and the ghost ridge
      // and never wider than four fifths of the picture, drifting a few pixels.
      const top = 18, low = base - 70, gc = Math.max(6, Math.min(30, Math.floor((low - top) / 5.6), Math.floor(VW * 0.8 / 11)));
      const gx0 = Math.round((scr.narrow ? VW * 0.5 : VW * 0.36) - 5.5 * gc + 6 * Math.sin(t * 0.09)), gy0 = Math.round(Math.max(top + 4, (top + low) / 2 - 2.5 * gc) + 3 * Math.sin(t * 0.07 + 1));
      paintFog(scr, t, base, maskFor(gc), gx0, gy0);
      // His own tracks, coming in from the left and stopping.
      const mx = cx - Math.round((1 - q) * 70), my = base + 6;
      for (let x = cx - 150; x < mx - 3; x += 5) scr.set(x, my + ((x / 5) & 1), R.snow[0]);
      scr.put(wand, cx + 26, my - 2, false);
      for (let k = 0; k < 3; k++) scr.set(cx + 29 + k + (Math.floor(t * 6) & 1), my - 23 + k, R.blaze[2]);
      scr.put(sign, cx - 34, my - 1, false);
      scr.shadow(mx, my, 5, 1);
      scr.put(q < 1 && env.moving ? run.side[Math.floor(q * 70 / 4.2) % 6] : idle, mx, my, false);
      // Spindrift blowing through, in front of everything.
      for (let k = 0; k < 150; k++) {
        const sp = 40 + hash(k, 1, 402) * 70, x = Math.floor(frac(hash(k, 2, 402) + t * sp / (VW + 40)) * (VW + 40)) - 20, y = Math.floor(frac(hash(k, 3, 402) + t * 0.05 * (1 + hash(k, 4, 402))) * VH);
        scr.set(x, y, R.snow[4]); if (k % 3 === 0) scr.set(x + 1, y, R.snow[4]);
      }
      focus.x = mx; focus.y = my - 14;
    }
  };
}
