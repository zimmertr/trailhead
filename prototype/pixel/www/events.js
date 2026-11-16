// Timed events on the map that are not animals (E5k): tumbleweeds rolling across the sage on a gust, dust
// devils spinning up on the dry flats, a shooting star on the Dusk sky, and the float plane that comes in
// over the map and lands on About Lake (on the sea it came down under the page's menus, out of sight). Where each happens comes from land.js (habitat); each runs on the
// scenes' clock, so the speed buttons work on it, and each can be started now from the debug panel.
import { TAU, clamp, smooth, hash, bayer, R, INK, BM, outline, thick } from './core.js';
import { NW } from './land.js';

// A tumbleweed, four turns of it: a tangle of dry stems round a hollow middle, in browns darker than the
// dry ground and the sage it rolls over, with a few sunlit stems.
function weed(f) {
  const b = new BM(9, 9); b.ox = 4; b.oy = 8;
  for (let k = 0; k < 9; k++) { const a = k / 9 * TAU + f * TAU / 16, r = 2.6 + 1.4 * hash(k, 1, 7101); thick(b, 4 + Math.cos(a) * 1.2, 4 + Math.sin(a) * 1.2, 4 + Math.cos(a + 0.9) * r, 4 + Math.sin(a + 0.9) * r, 1, k % 3 ? R.wood[2] : R.wood[1]); }
  for (let k = 0; k < 18; k++) { const a = k / 18 * TAU - f * TAU / 16; if (hash(k, 2, 7102) < 0.7) b.set(4 + Math.cos(a) * 3.6, 4 + Math.sin(a) * 3.4, k & 1 ? R.wood[3] : R.dry[3]); }
  return b;
}
// The float plane, facing west: a white high-wing with a red stripe, two floats under it, the propeller
// a blur that flickers between two frames.
function plane(f) {
  const b = new BM(18, 10); b.ox = 9; b.oy = 9;
  for (let x = 3; x <= 13; x++) { b.set(x, 3, R.white[1]); b.set(x, 4, x > 4 && x < 13 ? R.red[1] : R.white[0]); }
  for (let x = 5; x <= 11; x++) b.set(x, 2, R.white[x < 8 ? 1 : 0]);
  b.set(5, 3, R.lamp[1]); b.set(6, 3, R.lamp[0]); b.set(2, 3, R.rock[2]); b.set(2, 4, R.rock[1]);
  for (const [x, y] of [[13, 2], [14, 2], [14, 1], [15, 1], [15, 0], [14, 3], [15, 3], [16, 3]]) b.set(x, y, y === 0 ? R.red[1] : R.white[1]);
  outline(b, INK);
  for (const x of [5, 10]) b.set(x, 6, R.rock[1]);
  for (let x = 3; x <= 12; x++) b.set(x, 7, x === 3 ? R.rock[2] : R.rock[3]);
  for (let x = 2; x <= 12; x++) b.set(x, 8, INK);
  for (let y = 1; y <= 6; y++) if ((y + f) & 1) b.set(0, y, R.rock[3]);
  return b;
}
// A sprite seen only in part: each pixel shows where the dither is under a, so it can fade in and out.
function blitA(scr, bm, x, y, a, flip) {
  for (let j = 0; j < bm.h; j++) for (let i = 0; i < bm.w; i++) { const c = bm.d[j * bm.w + (flip ? bm.w - 1 - i : i)]; if (!c) continue; const X = x + i, Y = y + j; if (a < 1 && bayer(X, Y) >= a) continue; scr.set(X, Y, c); }
}

export function makeEvents(W) {
  const { spots } = W, D = W.depth;
  const weeds = [0, 1, 2, 3].map(weed), planes = [plane(0), plane(1)];
  // About Lake's open water (W.dest 5): the widest row in its nearer half is the plane's runway, clear of
  // the lake's name tag, which hangs over its far half.
  const LAKE = (() => { const rows = new Map(); for (let i = 0; i < W.dest.length; i++) if (W.dest[i] === 5) { const y = (i / NW) | 0, x = i % NW, r = rows.get(y) || [x, x]; rows.set(y, [Math.min(r[0], x), Math.max(r[1], x)]); }
    const ys = [...rows.keys()], mid = (Math.min(...ys) + Math.max(...ys)) / 2 + 2;
    let best = null; for (const [y, [a, b]] of rows) if (y > mid && (!best || b - a > best.x1 - best.x0)) best = { y, x0: a, x1: b }; return best; })();
  // Each event's natural clock: one in every slot, starting at a point of it the dice pick. A start
  // button sets a start time of its own instead, which runs once and then gives way to the clock again.
  const EV = {
    tumble: { slot: 32, first: 12, dur: 8, ok: () => spots.tumbles.length > 0 },
    devil: { slot: 55, first: 30, dur: 12, ok: () => spots.devils.length > 0 },
    star: { slot: 50, first: 20, dur: 1.1, ok: () => lastMix > 0.5 },
    plane: { slot: 110, first: 25, dur: 64, ok: () => !!LAKE }
  };
  const manual = {};
  let lastMix = 0;
  // Which one of the event is on at t, and how far into it: [number, seconds in], or null.
  const now = (k, t) => {
    const e = EV[k];
    if (manual[k] !== undefined) { const s = t - manual[k]; if (s >= 0 && s < e.dur) return [manual[k] * 7 | 0, s]; if (s >= e.dur) delete manual[k]; }
    const T = t - e.first + e.slot, n = Math.floor(T / e.slot), s = T - n * e.slot - (e.slot - e.dur) * 0.6 * hash(n, 1, 7110);
    return n > 0 && s >= 0 && s < e.dur ? [n, s] : null;
  };

  // A tumbleweed rolls east about 140 pixels on a gust, bouncing, turning as it goes, and fades out.
  function tumble(scr, ox, oy, n, s) {
    const T = spots.tumbles[n % spots.tumbles.length], d = Math.min(140, 19 * s + 3 * Math.sin(s * 1.7)), y = T.ys[Math.round(d)];
    const hop = Math.abs(Math.sin(s * 2.7)) * 4 * (1 - s / 9), a = smooth(0, 0.6, s) * smooth(8, 6.8, s), bm = weeds[Math.floor(d / 2.2) & 3];
    blitA(scr, bm, Math.round(T.x + d - bm.ox - ox), Math.round(y - hop - bm.oy - oy), a);
    // Its shadow on the ground, and a puff of dust where it lands.
    for (let i = -2; i <= 2; i++) if (bayer(i, y) < a * 0.8) scr.set(Math.round(T.x + d + i - ox), y - oy, R.ochre[0]);
    if (hop < 0.6) { scr.set(Math.round(T.x + d - 4 - ox), y - 1 - oy, R.sand[2]); scr.set(Math.round(T.x + d - 5 - ox), y - oy, R.sand[1]); }
  }
  // A dust devil spins up, wanders a little with the wind and leans with it, and falls apart. Its dust is
  // paler than the dry ground on the side toward the light and shaded on the other, so it reads as a column.
  function devil(scr, ox, oy, n, s, t) {
    const [x0, y0] = spots.devils[n % spots.devils.length], a = smooth(0, 2.2, s) * smooth(12, 9, s), cx = x0 + 18 * Math.sin(s * 0.45) + 3 * s, cy = y0 + 5 * Math.sin(s * 0.6), H = 8 + 34 * a;
    // Row by row up the column: as wide as the funnel there, dust through a dither that thins with
    // height, and bands that wind round it as it spins, pale on the lit west side, shaded on the east.
    for (let j = 0; j <= H; j++) {
      const hk = j / H, r = 1.5 + 9 * Math.pow(hk, 1.2) * (0.5 + 0.5 * a), lean = hk * H * 0.22 + 1.2 * Math.sin(t * 3 + j * 0.3), y = Math.round(cy - j - oy), dens = a * (0.75 - 0.45 * hk), F = Math.floor(t * 12);
      for (let dx = -Math.ceil(r); dx <= r; dx++) {
        const q = dx / r; if (Math.abs(q) > 1 || hash(dx + 40, j, F + 7123) > dens * (1 - 0.5 * q * q)) continue;
        const band = (q * 1.6 + t * 3.2 + j * 0.18) % 1, x = Math.round(cx + dx + lean - ox);
        scr.set(x, y, band < 0.35 ? (q < 0.3 ? R.white[0] : R.sand[2]) : q > 0.4 ? R.ochre[1] : R.sand[1]);
      }
    }
    // Dust kicked up round its foot.
    for (let k = 0; k < 16; k++) { const ang = t * 4 + k * 0.4, r = 3 + 3 * hash(k, 3, 7121); if (hash(k, Math.floor(t * 10), 7122) < a * 0.7) scr.set(Math.round(cx + Math.cos(ang) * r * 1.6 - ox), Math.round(cy + Math.sin(ang) * r * 0.4 - oy), k & 1 ? R.sand[2] : R.sand[1]); }
  }
  // A shooting star: a bright head and a long fading trail, about a second, drawn only over the sky. It
  // starts in the top band of whatever view is on screen, since the sky shows in a different band of
  // the map at every zoom and a star that falls out of sight is wasted.
  function star(scr, ox, oy, n, s) {
    const x0 = ox + 60 + hash(n, 2, 7130) * (scr.VW - 120), y0 = Math.max(4, oy + 6 + hash(n, 3, 7130) * 40), dir = hash(n, 4, 7130) < 0.5 ? -1 : 1, q = s / 1.1, hx = x0 + dir * 150 * q, hy = y0 + 60 * q, fade = smooth(1.1, 0.75, s);
    for (let k = 0; k < 34; k++) { const x = Math.round(hx - dir * k * 0.92), y = Math.round(hy - k * 0.37); if (y < 0 || x < 0 || x >= NW || D[y * NW + x] < 1e8) continue; if (k > 8 && bayer(x, y) >= fade * (1 - (k - 8) / 26) * 1.3) continue;
      scr.set(x - ox, y - oy, k < 3 && fade > 0.5 ? R.white[1] : k < 12 ? R.star[2] : R.star[1]); if (k < 2) scr.set(x - ox, y - oy - 1, R.star[2]); }
  }
  // The float plane comes in high from the east, glides down and touches down at the lake's east end,
  // taxis to the middle with a wake behind it, rocks a while, then runs west, lifts off over the far
  // shore and climbs away over the forest and off the map.
  function flight(scr, ox, oy, s, t) {
    const ly = LAKE.y + 1, xe = LAKE.x1 - 8, xc = (LAKE.x0 + LAKE.x1) / 2 + 4; let x, alt = 0, wake = 0;
    if (s < 22) { const q = s / 22; x = xe + (NW + 40 - xe) * (1 - q); alt = 170 * Math.pow(1 - q, 0.8); }
    else if (s < 29) { const q = (s - 22) / 7; x = xe - (xe - xc) * (1 - (1 - q) * (1 - q)); wake = 1 - q; }
    else if (s < 42) x = xc;
    else { const lift = xc - (LAKE.x0 + 6); x = xc - 3 * Math.pow(s - 42, 2); const over = xc - x - lift; alt = over > 0 ? 0.9 * Math.pow(over, 0.85) : 0; wake = alt < 2 ? clamp((s - 42) / 2, 0, 1) : 0; }
    const bob = alt < 1 && wake < 0.2 ? Math.round(Math.sin(t * 2.2) * 0.6) : 0, bm = planes[Math.floor(t * 14) & 1], X = Math.round(x - ox), Y = Math.round(ly - alt - oy + bob);
    if (X < -30 || X > scr.VW + 30) return;
    for (let k = 0; k < 14 * wake; k++) { const wx = X + 4 + k * 2, wy = Y + (k & 1); if (bayer(wx + ox, wy + oy) < wake * (1 - k / 16)) scr.set(wx, wy, k < 3 ? R.white[1] : R.sea[5]); }
    scr.blit(bm, X - bm.ox, Y - bm.oy);
  }

  return {
    draw(scr, ox, oy, t, mix) {
      lastMix = mix;
      let e;
      if ((e = now('tumble', t)) && EV.tumble.ok()) tumble(scr, ox, oy, e[0], e[1]);
      if ((e = now('devil', t)) && EV.devil.ok()) devil(scr, ox, oy, e[0], e[1], t);
      if ((e = now('star', t)) && EV.star.ok()) star(scr, ox, oy, e[0], e[1]);
      if ((e = now('plane', t)) && EV.plane.ok()) flight(scr, ox, oy, e[1], t);
    },
    // The debug panel's start buttons. The shooting star only shows at Dusk, so its button says no by Day.
    trigger(name, t) {
      if (!EV[name] || !EV[name].ok()) return false;
      manual[name] = t; return true;
    }
  };
}
