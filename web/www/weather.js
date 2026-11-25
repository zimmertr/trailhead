// How the side scenes show the world's weather (round 8, E1; TJ: the forest's weather and light in every
// scene). The map and the forest draw their own. What is here is laid over a part of the frame that is already
// drawn, in screen pixels, and costs nothing while its strength k is 0. What the weather is comes from
// world.js (sky): the marine layer, the squall, the map's gusts and its fair-weather clouds.
import { clamp, lerp, frac, hash, bayer, R, DAY, SHADE, LIGHT, veilTable, mixTable } from './core.js';

const pale = c => { const p = DAY[c] || [0, 0, 0]; return 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2] > 150; };
// Made when first wanted: each table takes a millisecond or two, and a clear day needs none of them.
// rain and flake: a falling thing's colour over what it crosses (rain pale over dark ground and grey over
// pale; a flake white, or the snow's own shade over snow and bright sky). veil: toward fog. grey: toward the
// blue-grey of falling snow, picked from the rock's, the snow's and the sky's colours alone (the fog's own
// table never picks a neutral grey, and turned granite green). white: toward snow.
let T = null;
const tables = () => T || (T = {
  rain: new Uint8Array(256).map((_, c) => pale(c) ? R.nebel[1] : R.fog[1]),
  flake: new Uint8Array(256).map((_, c) => pale(c) ? R.snow[1] : R.snow[4]),
  veil: [0.2, 0.38, 0.55, 0.72].map(veilTable),
  // The sky's own bands each go a few steps paler instead, so its gradient stays smooth (mixed like the rest,
  // two of them landed on one much paler colour and left a stripe across the sky).
  grey: [0.22, 0.4, 0.56, 0.7].map((a, l) => { const g = mixTable(R.snow[2], a, ['snow', 'far', 'farsnow', 'ice', 'rock', 'granite', 'nebel', 'white']).slice(), sb = R.skyband; sb.forEach((c, i) => { g[c] = sb[Math.min(sb.length - 1, i + 2 * (l + 1))]; }); return g; }),
  white: [0.3, 0.55, 0.8].map(a => mixTable(R.snow[4], a)) });

// Rain: steep streaks leaning a little east, as the forest's.
export function rain(scr, t, k) {
  if (k <= 0.02) return;
  const { VW, VH, fb } = scr, S = tables().rain, n = Math.round(VW * VH / 520 * k), H = VH + 30, W = VW + 30;
  for (let i = 0; i < n; i++) {
    const sp = 300 + 120 * hash(i, 1, 4070), len = 4 + (hash(i, 2, 4070) * 5 | 0), fall = t * sp / H + hash(i, 3, 4070), y0 = frac(fall) * H - 15;
    const x0 = hash(i, Math.floor(fall), 4074) * W - 15 + y0 * 0.16;
    for (let j = 0; j < len; j++) { const X = Math.round(x0 + j * 0.16), Y = Math.round(y0 + j); if (X >= 0 && Y >= 0 && X < VW && Y < VH) { const q = Y * VW + X; fb[q] = S[fb[q]]; } }
  }
}

// Rings where drops land on still water: each opens to three pixels wide and is gone. wet(x, y) says where
// the water is, and y0 to y1 are the rows it may lie in.
export function rings(scr, t, k, y0, y1, wet) {
  if (k <= 0.02 || y1 <= y0) return;
  const { VW, VH, fb } = scr, m = Math.round(VW / 5 * k), beat = Math.floor(t * 3);
  for (let i = 0; i < m; i++) {
    const age = frac(t * 3 + hash(i, 5, 4075)), c = beat - (age > frac(t * 3) ? 1 : 0), x = Math.floor(hash(i, c, 4076) * VW), y = Math.round(lerp(y0, y1, hash(i, c, 4077))), r = Math.round(age * 3);
    if (y < 0 || y >= VH || !wet(x, y)) continue;
    for (const dx of r ? [-r, r] : [0]) { const X = x + dx; if (X >= 0 && X < VW) fb[y * VW + X] = LIGHT[fb[y * VW + X]]; }
  }
}

// A veil of fog over rows y0 to y1, k from 0 to 1, dithered between its four steps; snowy: of falling snow,
// over rock, ice and sky.
export function veil(scr, k, y0 = 0, y1 = scr.VH, snowy = false) {
  if (k <= 0.01) return;
  const { VW, VH, fb } = scr, V = tables()[snowy ? 'grey' : 'veil'], L = Math.min(1, k) * V.length;
  for (let y = Math.max(0, y0); y < Math.min(VH, y1); y++) { const row = y * VW; for (let x = 0; x < VW; x++) { const l = Math.min(V.length, Math.floor(L + bayer(x, y))); if (l > 0) fb[row + x] = V[l - 1][fb[row + x]]; } }
}

// Mist lying in a band along row y, h rows deep either way: thickest along its middle, in long drifting
// wisps with clear air between them.
export function mist(scr, t, k, y, h) {
  if (k <= 0.02) return;
  const { VW, VH, fb } = scr, V = tables().veil;
  for (let r = Math.max(0, y - h); r < Math.min(VH, y + h); r++) {
    const row = r * VW, lie = 1 - Math.abs(r - y) / h, ph = r * 0.9 + t * 0.6;
    for (let x = 0; x < VW; x++) {
      const wisp = 0.55 + 0.3 * Math.sin((x + t * 4) / 37 + r * 0.21) + 0.25 * Math.sin((x - t * 2.5) / 13 + ph * 0.3), l = Math.min(V.length, Math.floor(k * lie * wisp * (V.length + 1) + bayer(x, r) - 0.5));
      if (l > 0) fb[row + x] = V[l - 1][fb[row + x]];
    }
  }
}

// The marine layer seen from above it: a sea of cloud filling the valley, its lumpy top at row `top` when it
// is all in (k = 1) and sunk to `bot` when it is gone. Drawn behind whatever stands nearer than the valley.
export function cloudSea(scr, t, k, top, bot) {
  if (k <= 0.03) return;
  const { VW, VH, fb } = scr, W = tables().white, lvl = lerp(bot, top, clamp(k * 1.3, 0, 1));
  for (let x = 0; x < VW; x++) {
    const h = Math.round(lvl + 4 * Math.sin((x + t * 1.7) / 29) + 2.5 * Math.sin((x - t * 1.1) / 11 + 2) + 1.5 * Math.sin(x / 5 + t * 0.4));
    for (let y = Math.max(0, h); y < Math.min(VH, bot); y++) {
      const d = y - h, q = y * VW + x;
      // Lit along its top, then thick and white, with the blue of its own shade in the hollows lower down.
      fb[q] = d < 1 ? R.snow[4] : d < 3 + (bayer(x, y) < 0.5 ? 1 : 0) ? R.snow[3] : W[2][(d + (x >> 2)) % 9 < 2 ? R.snow[1] : fb[q]];
    }
  }
}

// Snow in the air: flakes that fall slowly and drift with the wind (lean: 1 to the right, -1 to the left).
export function flurry(scr, t, k, lean = 1) {
  if (k <= 0.02) return;
  const { VW, VH, fb } = scr, F = tables().flake, n = Math.round(VW * VH / 380 * k), W = VW + 20, H = VH + 20;
  for (let i = 0; i < n; i++) {
    const x = Math.round(((hash(i, 1, 4078) * W + lean * t * (45 + 60 * hash(i, 2, 4078)) + 5 * Math.sin(t * 2.1 + i)) % W + W) % W) - 10;
    const y = Math.round((hash(i, 3, 4078) * H + t * (20 + 30 * hash(i, 4, 4078)) + 3 * Math.sin(t * 1.3 + i * 2)) % H) - 10;
    if (x < 0 || y < 0 || x >= VW || y >= VH) continue;
    // One in four is two pixels wide, and one in seven of those a clump of four.
    const q = y * VW + x; fb[q] = F[fb[q]]; if (i % 4 === 0 && x + 1 < VW) { fb[q + 1] = F[fb[q + 1]]; if (i % 28 === 0 && y + 1 < VH) { fb[q + VW] = F[fb[q + VW]]; fb[q + VW + 1] = F[fb[q + VW + 1]]; } }
  }
}

// Spindrift: snow the wind lifts off a crest and carries away in a plume of thin streaks that lengthen, spread
// and thin as they go. src: the spots it leaves from, as [x, y] on the screen; len: how far it carries; dir: 1
// to the right, -1 to the left.
export function spindrift(scr, t, k, src, len, dir = 1) {
  if (k <= 0.03 || !src.length) return;
  const { VW, VH, fb } = scr, F = tables().flake, n = Math.round(44 * src.length * Math.min(1, k));
  for (let i = 0; i < n; i++) {
    const [sx, sy] = src[i % src.length], a = frac(t * (0.5 + 0.4 * hash(i, 1, 4079)) + hash(i, 2, 4079)), far = a * len * (0.55 + 0.45 * hash(i, 3, 4079));
    const x = Math.round(sx + dir * far), y = Math.round(sy - 1 - far * (0.34 * hash(i, 4, 4079) - 0.08) + 2 * a * Math.sin(t * 5 + i));
    if (y < 0 || y >= VH || bayer(x & 3, y & 3) < a * 1.15 - 0.25 * k) continue;
    for (let j = 0, L = 2 + Math.round(3 * a) + (i % 3); j < L; j++) { const X = x + dir * j; if (X >= 0 && X < VW) fb[y * VW + X] = F[fb[y * VW + X]]; }
  }
}

// A cloud's shadow crossing the ground between rows y0 and y1: one step darker with a ragged, dithered edge,
// leaning as the ground comes nearer. u runs from 1 (coming in at the left) to -1 (gone off the right).
export function shadow(scr, u, y0, y1) {
  const { VW, VH, fb } = scr, half = VW * 0.3, cx = VW * (0.5 - u * 0.95);
  for (let y = Math.max(0, y0); y < Math.min(VH, y1); y++) {
    const mid = cx + (y - y0) * 0.7, w = half * (0.8 + 0.2 * Math.sin(y / 17 + 1)), row = y * VW;
    for (let x = Math.max(0, Math.round(mid - w)); x < Math.min(VW, Math.round(mid + w)); x++) { const d = Math.abs(x - mid) / w; if (d < 0.86 || ((x + y) & 1)) fb[row + x] = SHADE[fb[row + x]]; }
  }
}
