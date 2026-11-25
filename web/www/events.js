// Timed events on the map that are not animals (E5k): tumbleweeds rolling across the sage on a gust, dust
// devils spinning up on the dry flats and a shooting star on the Dusk sky. (The float plane left in round 5,
// T12.) Where each happens comes from land.js (habitat); each runs on the
// scenes' clock, so the speed buttons work on it, and each can be started now from the debug panel.
import { TAU, smooth, hash, bayer, R, BM, outline, saw, covered } from './core.js';
import { NW } from './land.js';

// A tumbleweed, 15 across (note 5: the 9 of round 5 was lost on the hills): a see-through ball of stems
// (art pass D11), its rim outlined in the darkest wood so it reads on the gold grass. f turns it a sixteenth.
function weed(f) {
  const b = new BM(15, 15); b.ox = 7; b.oy = 14;
  const rot = f * TAU / 16, put = (x, y, c) => { const X = Math.round(x), Y = Math.round(y); if (X >= 0 && Y >= 0 && X < 15 && Y < 15) b.set(X, Y, c); };
  // The dark hollow inside, seen through the gaps, deepest on the side away from the light.
  for (let j = 3; j <= 12; j++) for (let i = 3; i <= 12; i++) { const r = Math.hypot(i - 8, j - 8.2); if (r <= 3.4 && hash(i, j, 7103 + f) < 0.75 - r * 0.1) b.set(i, j, R.wood[r < 1.6 ? 0 : 1]); }
  // Stems: great circles round the ball at a few tilts. Two behind, broken, in shade; four in front over
  // them, lit by how they face the light. What lies between is see-through.
  const ring = (az, tl, front, k) => { for (let s = 0; s < 72; s++) {
    const t = s / 72 * TAU, x0 = Math.cos(t), y0 = Math.sin(t) * Math.cos(tl), z = Math.sin(t) * Math.sin(tl);
    if ((z > 0) !== front || (!front && hash(s >> 2, k, 7104) < 0.4)) continue;
    const a = az + rot, x = x0 * Math.cos(a) - y0 * Math.sin(a), y = x0 * Math.sin(a) + y0 * Math.cos(a), r = 5.9;
    const lit = -0.6 * x - 0.6 * y + 0.5 * z;
    put(7 + x * r, 7.2 + y * r * 0.97, !front ? R.wood[1] : lit > 0.78 ? R.wood[4] : lit > 0.2 ? R.wood[3] : R.wood[2]);
  } };
  for (let k = 0; k < 2; k++) ring(k * 1.7 + 0.9, 1.1, false, k);
  for (let k = 0; k < 4; k++) ring(k / 4 * Math.PI + 0.5 * hash(k, 1, 7101), 0.75 + 0.7 * hash(k, 2, 7101), true, k);
  outline(b, (x, y) => Math.hypot(x - 7, y - 7.2) > 5.4 ? R.wood[0] : 0);
  // Stray twigs sticking out past the rim, thin and dark, so its edge is spiky rather than round.
  for (let k = 0; k < 9; k++) { const a = (k + 0.6 * hash(k, 3, 7102)) / 9 * TAU + rot, x = Math.cos(a), y = Math.sin(a), n = 1 + (hash(k, 4, 7102) < 0.5 ? 1 : 0); for (let d = 0; d < n; d++) put(7 + x * (7 + d), 7.2 + y * (7 + d), R.wood[d ? 1 : 0]); }
  return b;
}
// A sprite seen only in part: each pixel shows where the dither is under a, so it can fade in and out.
export function blitA(scr, bm, x, y, a, flip) {
  for (let j = 0; j < bm.h; j++) for (let i = 0; i < bm.w; i++) { const c = bm.d[j * bm.w + (flip ? bm.w - 1 - i : i)]; if (!c) continue; const X = x + i, Y = y + j; if (a < 1 && bayer(X, Y) >= a) continue; scr.set(X, Y, c); }
}

// Whether a spot of the screen is well inside it, m from every edge: what counts as seen (round 8, F2).
export const inView = (scr, x, y, m = 8) => x >= m && y >= m && x < scr.VW - m && y < scr.VH - m;
// Inside the view and clear of the page's own panels (round 8, H10): what counts as seen for the kiosk's board.
export const inClear = (scr, x, y, m = 8) => inView(scr, x, y, m) && !covered(x, y);

// The lenticular cloud (E3): a stack of smooth lenses standing still over Mount Monolith's summit, the
// sign of a strong wind up high. It forms over fifteen seconds, sits half a minute, thins and is gone,
// and the sky stays clear for half a minute before the next (E5a: loops are quick). The first starts
// forming five seconds after the page opens. Its clock lives here, not in a scene, so that the map and
// the lake scene show the same cloud at the same moment, and a start from the debug menu in either
// starts both. lens=<seconds> in the address starts it that far into its cycle, for screenshots.
export const LENS = { cycle: 90, form: 15, sit: 45, gone: 60, ahead: typeof location !== 'undefined' ? +(/[?&]lens=([\d.]+)/.exec(location.search) || [])[1] || 0 : 0 };
const lensPhase = t => (((t + LENS.ahead + LENS.cycle - 5) % LENS.cycle) + LENS.cycle) % LENS.cycle;
export const startLens = t => { LENS.ahead = (((-(t + LENS.cycle - 5)) % LENS.cycle) + LENS.cycle) % LENS.cycle; return true; };
// Draws it with the summit at sx, sy, k times the map's size, in a picture whose top left is ox, oy.
// Drawn with the drifting clouds' white and their blue underside, lit from above.
const LAYERS = [[0, 1, 7], [-8, 0.8, 6], [-14, 0.56, 4]];
export function drawLens(scr, sx, sy, t, k = 1, ox = 0, oy = 0) {
  const ph = lensPhase(t), a = ph < LENS.form ? smooth(0, LENS.form, ph) : ph < LENS.sit ? 1 : ph < LENS.gone ? smooth(LENS.gone, LENS.sit, ph) : 0; if (a <= 0) return;
  if (a > 0.6 && inClear(scr, sx - ox, sy - oy - 9 * k, 20)) saw('lens');
  const W0 = k * 66 * (0.55 + 0.45 * Math.min(1, ph / LENS.form)) * (ph > LENS.sit ? 1 + 0.12 * (ph - LENS.sit) / (LENS.gone - LENS.sit) : 1), cy = sy - Math.round(9 * k);
  for (const [dy, wk, T0] of LAYERS) { const w = W0 * wk, y0 = cy + Math.round(dy * k), T = T0 * k;
    for (let x = Math.round(sx - w); x <= sx + w; x++) { const q = (x - sx) / w, th = T * Math.pow(Math.max(0, 1 - q * q), 0.7), top = Math.round(th), bot = Math.round(th * 0.3);
      for (let y = y0 - top; y <= y0 + bot; y++) { const vx = x - ox, vy = y - oy; if (vx < 0 || vy < 0 || vx >= scr.VW || vy >= scr.VH) continue;
        const edge = Math.min(1, (1 - Math.abs(q)) * 4); if (bayer(x, y) >= a * edge) continue;
        const f = (y - (y0 - top)) / Math.max(1, top + bot); scr.fb[vy * scr.VW + vx] = y === y0 + bot && bot > 0 ? R.sky[3] : f > 0.45 && bayer(x + 1, y) < (f - 0.45) * 1.6 ? R.sky[4] : R.white[1]; } } }
}

// The clock of a table of timed events (shared with life.js since round 8, E2). Each entry says how long a
// slot is, when the first falls, and how long the event lasts: one happens in every slot, starting at a
// point of it the dice pick. start(k, t) is a start button: a start time of its own, which runs once and
// then gives way to the clock again. now(k, t) says which one of event k is on at t and how far into it:
// [number, seconds in], or null.
export function makeClock(EV) {
  const manual = {};
  return {
    start(k, t) { manual[k] = t; },
    now(k, t) {
      const e = EV[k];
      if (manual[k] !== undefined) { const s = t - manual[k]; if (s >= 0 && s < e.dur) return [manual[k] * 7 | 0, s, true]; if (s >= e.dur) delete manual[k]; }
      const T = t - e.first + e.slot, n = Math.floor(T / e.slot), s = T - n * e.slot - (e.slot - e.dur) * 0.6 * hash(n, 1, 7110);
      return n > 0 && s >= 0 && s < e.dur ? [n, s] : null;
    }
  };
}

export function makeEvents(W, col) {
  const { spots } = W, D = W.depth;
  const weeds = [0, 1, 2, 3].map(weed);
  // Each event's natural clock: one in every slot, starting at a point of it the dice pick. A start
  // button sets a start time of its own instead, which runs once and then gives way to the clock again.
  const EV = {
    tumble: { slot: 32, first: 12, dur: 8, ok: () => spots.tumbles.length > 0 },
    devil: { slot: 55, first: 30, dur: 12, ok: () => spots.devils.length > 0 },
    star: { slot: 50, first: 20, dur: 1.1, ok: () => lastMix > 0.5 }
  };
  const { now, start } = makeClock(EV);
  let lastMix = 0;

  // A tumbleweed rolls east about 170 pixels on a gust, bouncing, turning as it goes, and fades out.
  // How far each tumbleweed may roll before ground a land thing may not cross (collide.js) stops it.
  const rollTo = spots.tumbles.map(T => { for (let d = 0; d <= 170; d++) if (T.ys[d] == null || !col.canBe('land', T.x + d, T.ys[d], 0)) return Math.max(0, d - 2); return 170; });
  function tumble(scr, ox, oy, n, s) {
    const T = spots.tumbles[n % spots.tumbles.length], d = Math.min(rollTo[n % spots.tumbles.length], 19 * s + 3 * Math.sin(s * 1.7)), y = T.ys[Math.round(d)];
    const hop = Math.abs(Math.sin(s * 2.7)) * 7 * (1 - s / 9), a = smooth(0, 0.6, s) * smooth(8, 6.8, s), bm = weeds[Math.floor(d / 3) & 3];
    // Its shadow on the ground, shrinking as it bounces up, then the weed over it.
    const sw = Math.round(5 - hop * 0.3); for (let i = -sw; i <= sw; i++) if (bayer(i, y) < a * 0.9) { scr.set(Math.round(T.x + d + i - ox), y - oy, R.wood[0]); if (Math.abs(i) < sw - 1) scr.set(Math.round(T.x + d + i - ox), y + 1 - oy, R.wood[1]); }
    blitA(scr, bm, Math.round(T.x + d - bm.ox - ox), Math.round(y - hop - bm.oy - oy), a); if (a > 0.6 && inClear(scr, T.x + d - ox, y - oy)) saw('tumble');
    // A puff of dust behind it each time it lands, spreading and thinning over a third of a second.
    const land = (s * 2.7 / Math.PI) % 1, puff = land < 0.3 ? 1 - land / 0.3 : 0;
    if (puff > 0) for (let k = 0; k < 7; k++) { const px = Math.round(T.x + d - 6 - k * (1.2 + 1.6 * (1 - puff)) - ox), py = y - (k & 1) - Math.round((1 - puff) * 2) - oy; if (hash(k, Math.floor(s * 10), 7104) < puff * a) scr.set(px, py, k & 2 ? R.sand[2] : R.sand[1]); }
  }
  // A dust devil spins up, wanders a little with the wind and leans with it, and falls apart. Its dust is
  // paler than the dry ground on the side toward the light and shaded on the other, so it reads as a column.
  function devil(scr, ox, oy, n, s, t) {
    const [x0, y0] = spots.devils[n % spots.devils.length], a = smooth(0, 2.2, s) * smooth(12, 9, s), cx = x0 + 18 * Math.sin(s * 0.45) + 3 * s, cy = y0 + 5 * Math.sin(s * 0.6), H = 8 + 34 * a;
    // Row by row up the column: as wide as the funnel there, dust through a dither that thins with
    // height, and bands that wind round it as it spins, pale on the lit west side, shaded on the east.
    if (a > 0.6 && inClear(scr, cx - ox, cy - oy)) saw('devil');
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
      if (!k && inClear(scr, x - ox, y - oy, 2)) saw('star');
      scr.set(x - ox, y - oy, k < 3 && fade > 0.5 ? R.white[1] : k < 12 ? R.star[2] : R.star[1]); if (k < 2) scr.set(x - ox, y - oy - 1, R.star[2]); }
  }
  return {
    draw(scr, ox, oy, t, mix) {
      lastMix = mix;
      let e;
      if ((e = now('tumble', t)) && EV.tumble.ok()) tumble(scr, ox, oy, e[0], e[1]);
      if ((e = now('devil', t)) && EV.devil.ok()) devil(scr, ox, oy, e[0], e[1], t);
      if ((e = now('star', t)) && EV.star.ok()) star(scr, ox, oy, e[0], e[1]);
    },
    // Where a tumbleweed or a dust devil starts, for the debug panel to look there first. A shooting star
    // crosses whatever sky is in view, so it has no place.
    // A tumbleweed's start is its roll (x and the ground's height along it), so the place is the middle of the roll.
    where(name) { if (name === 'tumble') { const T = spots.tumbles[0]; return T ? [T.x + 60, T.ys[60]] : null; } return name === 'devil' && spots.devils.length ? spots.devils[0] : null; },
    // The debug panel's start buttons. The shooting star only shows at Dusk, so its button says no by Day.
    trigger(name, t) {
      if (!EV[name] || !EV[name].ok()) return false;
      start(name, t); return true;
    },
    can: name => !EV[name] || EV[name].ok()
  };
}
